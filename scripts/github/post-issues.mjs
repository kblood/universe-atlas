#!/usr/bin/env node
// Turns docs/github/ISSUES/*.md drafts into `gh issue create` commands.
//
// SAFE BY DEFAULT: without flags it only prints the commands (dry run) and
// never spawns anything. It posts ONLY when BOTH `--confirm` is passed AND the
// env var GITHUB_REPO=<owner>/<name> is set. Posting needs explicit owner
// authorisation (docs/github/MIGRATION-CHECKLIST.md); agents never pass --confirm.
//
//   node scripts/github/post-issues.mjs                 # dry run, all drafts
//   node scripts/github/post-issues.mjs --check         # validate drafts only
//   node scripts/github/post-issues.mjs --only T01,T02  # subset
//   node scripts/github/post-issues.mjs --labels        # also print `gh label create`
//   node scripts/github/post-issues.mjs --include-parked
//   node scripts/github/post-issues.mjs --out <dir>     # keep rendered bodies for review
//   GITHUB_REPO=me/universe-atlas node scripts/github/post-issues.mjs --confirm
//
// Only drafts whose `repo:` equals the name part of GITHUB_REPO are posted
// (dry run without GITHUB_REPO prints all, grouped by repo). Before creating,
// --confirm mode searches existing issues for the "[ID]" title prefix and skips
// duplicates, so a re-run is idempotent.
import {readFileSync, readdirSync, writeFileSync, mkdtempSync, mkdirSync, rmSync} from 'node:fs';
import {join, dirname, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = join(ROOT, 'docs/github/ISSUES');
const REQUIRED = ['id', 'key', 'title', 'repo', 'labels', 'owner_agent', 'reviewer', 'round', 'size', 'resource', 'depends_on', 'owned_files', 'acceptance', 'base_commit', 'source'];
const LABEL_COLOURS = {type: '1d76db', area: '0e8a16', agent: '5319e7', visual: 'fbca04', resource: 'b60205', size: 'c5def5', round: 'bfdadc', needs: 'd93f0b', status: 'ededed'};

/** Minimal front-matter parser for the subset the drafts use (no dependency). */
export function parseDraft(text, file = '?') {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) throw new Error(`${file}: missing front matter`);
  const meta = {}; let listKey = null;
  for (const raw of m[1].split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const item = /^\s+-\s+(.*)$/.exec(raw);
    if (item) { if (!listKey) throw new Error(`${file}: list item outside a list: ${raw}`); meta[listKey].push(scalar(item[1], file)); continue; }
    const kv = /^([a-z_]+):\s*(.*)$/.exec(raw);
    if (!kv) throw new Error(`${file}: cannot parse line: ${raw}`);
    const [, k, v] = kv;
    if (v === '') { meta[k] = []; listKey = k; continue; }
    listKey = null; meta[k] = scalar(v, file);
  }
  return {meta, body: m[2].trim()};
}
function scalar(v, file) {
  v = v.trim();
  if (v.startsWith('"') || v.startsWith('[')) { try { return JSON.parse(v); } catch { throw new Error(`${file}: bad JSON value ${v}`); } }
  return v.replace(/\s+#\s.*$/, '').trim();
}

export function validate(d, file) {
  const errs = REQUIRED.filter(k => !(k in d.meta)).map(k => `${file}: missing ${k}`);
  for (const k of ['labels', 'depends_on', 'owned_files', 'acceptance']) if (k in d.meta && !Array.isArray(d.meta[k])) errs.push(`${file}: ${k} must be a list`);
  if (d.meta.title && d.meta.id && !d.meta.title.startsWith(`[${d.meta.id}] `)) errs.push(`${file}: title must start with "[${d.meta.id}] "`);
  return errs;
}

export function renderBody({meta, body}) {
  const row = (k, v) => `| ${k} | ${v === undefined || (Array.isArray(v) && !v.length) ? '-' : Array.isArray(v) ? v.join(', ') : v} |`;
  return [
    body, '',
    '| Field | Value |', '| --- | --- |',
    row('Repo', meta.repo), row('Owner agent', meta.owner_agent + (meta.co_owner ? ` (+ ${meta.co_owner})` : '')),
    row('Reviewer', meta.reviewer), row('Visual judge', meta.visual_judge), row('Priority', meta.priority),
    row('Round', meta.round), row('Size', meta.size), row('Resource', meta.resource + (meta.resource_note ? ` (${meta.resource_note})` : '')),
    row('Depends on', meta.depends_on), row('Soft depends on', meta.soft_depends_on), row('Staged depends', meta.staged_depends),
    row('Merge after', meta.merge_after), row('External', meta.external_depends), row('Base commit', meta.base_commit), row('Branch', meta.branch),
    row('Status at draft', meta.status_at_draft), '',
    '### Owned files (nobody else writes these this round)', ...meta.owned_files.map(f => `- \`${f}\``), '',
    '### Acceptance', ...meta.acceptance.map(a => `- [ ] ${a}`), '',
    '### Verification', 'Lean tiers per `docs/github/WORKFLOW.md`: minimal test while working, hand-off tier once, merge tier by the merger. Package.json registration, golden re-pins, version bumps and README entries belong to the merger.', '',
    `Source: ${meta.source}`,
  ].join('\n');
}

const argv = process.argv.slice(2);
const flag = f => argv.includes(f);
const opt = f => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };

function main() {
  const only = opt('--only')?.split(',').map(s => s.trim());
  const drafts = readdirSync(DIR).filter(f => f.endsWith('.md')).sort().map(f => ({file: f, ...parseDraft(readFileSync(join(DIR, f), 'utf8'), f)}));
  const errs = drafts.flatMap(d => validate(d, d.file));
  const ids = new Set(drafts.map(d => d.meta.id));
  for (const d of drafts) for (const dep of [...(d.meta.depends_on || []), ...(d.meta.soft_depends_on || [])]) if (!ids.has(dep)) errs.push(`${d.file}: unknown dependency ${dep}`);
  if (errs.length) { console.error(errs.join('\n')); return 1; }
  if (flag('--check')) { console.log(`OK: ${drafts.length} drafts valid`); return 0; }

  const repoEnv = process.env.GITHUB_REPO;
  const confirm = flag('--confirm');
  if (confirm && !/^[\w.-]+\/[\w.-]+$/.test(repoEnv || '')) { console.error('Refusing: --confirm needs GITHUB_REPO=<owner>/<name>.'); return 2; }
  const repoName = repoEnv?.split('/')[1];
  let selected = drafts.filter(d => (!only || only.includes(d.meta.id)) && (flag('--include-parked') || d.meta.round !== 'parked'));
  if (repoName) {
    const skipped = selected.filter(d => d.meta.repo !== repoName);
    if (skipped.length) console.log(`# skipped (repo is not ${repoName}): ${skipped.map(d => `${d.meta.id}->${d.meta.repo}`).join(', ')}`);
    selected = selected.filter(d => d.meta.repo === repoName);
  }
  const target = repoEnv || '<owner>/<repo>';
  console.log(`# ${confirm ? 'POSTING' : 'DRY RUN (nothing executed)'}: ${selected.length} issues -> ${target}`);

  const out = opt('--out');
  const tmp = out ? resolve(out) : mkdtempSync(join(tmpdir(), 'atlas-issues-'));
  if (out) mkdirSync(tmp, {recursive: true});
  const cmds = [];
  try {
    if (flag('--labels')) {
      const labels = [...new Set(selected.flatMap(d => d.meta.labels))].sort();
      for (const l of labels) cmds.push({args: ['label', 'create', l, '--repo', target, '--force', '--color', LABEL_COLOURS[l.split(':')[0]] || 'ededed']});
    }
    for (const d of selected) {
      const bodyFile = join(tmp, `${d.meta.id}.md`);
      writeFileSync(bodyFile, renderBody(d));
      cmds.push({id: d.meta.id, title: d.meta.title, args: ['issue', 'create', '--repo', target, '--title', d.meta.title, '--body-file', bodyFile, ...d.meta.labels.flatMap(l => ['--label', l])]});
    }
    const show = a => 'gh ' + a.map(x => (/[\s"'[\]#;&|<>()$`]/.test(x) ? JSON.stringify(x) : x)).join(' ');
    if (!confirm) {
      for (const c of cmds) console.log(show(c.args));
      console.log(out ? `# body files kept in ${tmp}` : `# body files rendered to ${tmp} and deleted on exit (use --out <dir> to keep them); post only with --confirm and GITHUB_REPO set.`);
      return 0;
    }
    let failed = 0;
    for (const c of cmds) {
      if (c.id) {
        const q = spawnSync('gh', ['issue', 'list', '--repo', target, '--state', 'all', '--search', `"[${c.id}]" in:title`, '--json', 'title,number', '--limit', '100'], {encoding: 'utf8'});
        if (q.status !== 0) { console.error(`# ${c.id}: duplicate check failed, not posting: ${q.stderr.trim()}`); failed++; continue; }
        const hit = JSON.parse(q.stdout || '[]').find(i => i.title.startsWith(`[${c.id}] `));
        if (hit) { console.log(`# ${c.id}: already exists as #${hit.number}, skipped`); continue; }
      }
      console.log(show(c.args));
      const r = spawnSync('gh', c.args, {stdio: 'inherit'});
      if (r.status !== 0) { console.error(`# exit ${r.status}`); failed++; }
    }
    return failed ? 1 : 0;
  } finally { if (!out) rmSync(tmp, {recursive: true, force: true}); }
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) process.exitCode = main();
