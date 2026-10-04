#!/usr/bin/env node
// Turns docs/github/ISSUES/*.md drafts into `gh issue create` commands.
//
// SAFE BY DEFAULT: without flags it only prints the commands (dry run) and
// never spawns anything. It posts ONLY when BOTH `--confirm` is passed AND the
// env var GITHUB_REPO=<owner>/<name> is set. Posting needs explicit owner
// authorisation (docs/github/MIGRATION-CHECKLIST.md); agents never pass --confirm.
// Unknown flags, a flag missing its value, or an unknown --only id abort
// before anything is printed or posted.
//
//   node scripts/github/post-issues.mjs                 # dry run, all drafts
//   node scripts/github/post-issues.mjs --check         # validate drafts only
//   node scripts/github/post-issues.mjs --only T01,T02  # subset
//   node scripts/github/post-issues.mjs --labels        # also label create commands
//   node scripts/github/post-issues.mjs --include-parked
//   node scripts/github/post-issues.mjs --out <dir>     # keep rendered bodies for review
//   PowerShell (owner only):
//   $env:GITHUB_REPO='<owner>/universe-atlas'; node scripts/github/post-issues.mjs --labels --confirm
//
// Only drafts whose `repo:` equals the name part of GITHUB_REPO are posted
// (a dry run without GITHUB_REPO prints all). Before creating, --confirm mode
// lists ALL existing issues and PRs (paginated `gh api`) and skips any whose
// title starts with "[ID] ", so a re-run is idempotent. Posting is sequential.
// Printed commands are PowerShell-quoted (single quotes, '' for ').
import {readFileSync, readdirSync, writeFileSync, mkdtempSync, mkdirSync, rmSync} from 'node:fs';
import {join, dirname, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = join(ROOT, 'docs/github/ISSUES');
const REQUIRED = ['id', 'key', 'title', 'repo', 'labels', 'owner_agent', 'reviewer', 'round', 'size', 'resource', 'depends_on', 'owned_files', 'acceptance', 'base_commit', 'source'];
const LABEL_COLOURS = {type: '1d76db', area: '0e8a16', agent: '5319e7', visual: 'fbca04', resource: 'b60205', size: 'c5def5', round: 'bfdadc', needs: 'd93f0b', status: 'ededed'};
/** Labels the issue forms in .github/ISSUE_TEMPLATE apply; GitHub only applies labels that exist. */
const FORM_LABELS = ['type:task', 'type:bug', 'type:owner-decision', 'needs:owner'];
const BOOL_FLAGS = new Set(['--check', '--labels', '--include-parked', '--confirm']);
const VALUE_FLAGS = new Set(['--only', '--out']);

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
    if (k in meta) throw new Error(`${file}: duplicate key ${k}`);
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
    row('Merge after', meta.merge_after), row('Merge note', meta.merge_note), row('External', meta.external_depends),
    row('Base commit', meta.base_commit), row('Branch', meta.branch), row('Status at draft', meta.status_at_draft), '',
    '### Owned files (nobody else writes these this round)', ...meta.owned_files.map(f => `- \`${f}\``), '',
    '### Acceptance', ...meta.acceptance.map(a => `- [ ] ${a}`), '',
    '### Verification', 'Lean tiers per `docs/github/WORKFLOW.md`: minimal test while working, hand-off tier once, merge tier by the merger. Package.json registration, golden re-pins, version bumps and README entries belong to the merger.', '',
    `Source: ${meta.source}`,
  ].join('\n');
}

/** Strict argv parse: unknown flags and missing values are errors. */
export function parseArgs(argv) {
  const flags = new Set(), opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (BOOL_FLAGS.has(a)) flags.add(a);
    else if (VALUE_FLAGS.has(a)) { const v = argv[++i]; if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`); opts[a] = v; }
    else throw new Error(`unknown argument ${a}`);
  }
  return {flags, opts};
}

/** PowerShell-safe display of a gh command line. */
const psQuote = x => (/^[\w.:/@=-]+$/.test(x) ? x : `'${x.replace(/'/g, "''")}'`);
const show = a => 'gh ' + a.map(psQuote).join(' ');

function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e) { console.error(`Refusing: ${e.message}`); return 2; }
  const {flags, opts} = args;
  const drafts = readdirSync(DIR).filter(f => f.endsWith('.md')).sort().map(f => ({file: f, ...parseDraft(readFileSync(join(DIR, f), 'utf8'), f)}));
  const errs = drafts.flatMap(d => validate(d, d.file));
  const seen = new Map();
  for (const d of drafts) { if (seen.has(d.meta.id)) errs.push(`${d.file}: duplicate id ${d.meta.id} (also ${seen.get(d.meta.id)})`); seen.set(d.meta.id, d.file); }
  for (const d of drafts) for (const dep of [...(d.meta.depends_on || []), ...(d.meta.soft_depends_on || []), ...(d.meta.merge_after || [])]) if (!seen.has(dep)) errs.push(`${d.file}: unknown dependency ${dep}`);
  const only = opts['--only']?.split(',').map(s => s.trim()).filter(Boolean);
  for (const id of only || []) if (!seen.has(id)) errs.push(`--only: unknown id ${id}`);
  if (errs.length) { console.error(errs.join('\n')); return 1; }
  if (flags.has('--check')) { console.log(`OK: ${drafts.length} drafts valid`); return 0; }

  const repoEnv = process.env.GITHUB_REPO;
  const confirm = flags.has('--confirm');
  if (confirm && !/^[\w.-]+\/[\w.-]+$/.test(repoEnv || '')) { console.error('Refusing: --confirm needs GITHUB_REPO=<owner>/<name>.'); return 2; }
  const repoName = repoEnv?.split('/')[1];
  let selected = drafts.filter(d => (!only || only.includes(d.meta.id)) && (flags.has('--include-parked') || only?.includes(d.meta.id) || d.meta.round !== 'parked'));
  if (repoName) {
    const skipped = selected.filter(d => d.meta.repo !== repoName);
    if (skipped.length) console.log(`# skipped (repo is not ${repoName}): ${skipped.map(d => `${d.meta.id}->${d.meta.repo}`).join(', ')}`);
    selected = selected.filter(d => d.meta.repo === repoName);
  }
  const target = repoEnv || '<owner>/<repo>';
  console.log(`# ${confirm ? 'POSTING' : 'DRY RUN (nothing executed)'}: ${selected.length} issues -> ${target}; commands shown PowerShell-quoted`);

  const out = opts['--out'];
  const tmp = out ? resolve(out) : mkdtempSync(join(tmpdir(), 'atlas-issues-'));
  if (out) mkdirSync(tmp, {recursive: true});
  const cmds = [];
  try {
    if (flags.has('--labels')) {
      const labels = [...new Set([...FORM_LABELS, ...selected.flatMap(d => d.meta.labels)])].sort();
      for (const l of labels) cmds.push({args: ['label', 'create', l, '--repo', target, '--force', '--color', LABEL_COLOURS[l.split(':')[0]] || 'ededed']});
    }
    for (const d of selected) {
      const bodyFile = join(tmp, `${d.meta.id}.md`);
      writeFileSync(bodyFile, renderBody(d));
      cmds.push({id: d.meta.id, args: ['issue', 'create', '--repo', target, '--title', d.meta.title, '--body-file', bodyFile, ...d.meta.labels.flatMap(l => ['--label', l])]});
    }
    if (!confirm) {
      for (const c of cmds) console.log(show(c.args));
      console.log(out ? `# body files kept in ${tmp}` : `# body files rendered to ${tmp} and deleted on exit (use --out <dir> to keep them); post only with --confirm and GITHUB_REPO set.`);
      return 0;
    }
    // Exhaustive duplicate check: every issue and PR title in the repo, all pages.
    const q = spawnSync('gh', ['api', '--paginate', `repos/${target}/issues?state=all&per_page=100`, '--jq', '.[].title'], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
    if (q.status !== 0) { console.error(`Refusing: could not list existing issues (exit ${q.status}): ${(q.stderr || '').trim()}`); return 1; }
    const existing = q.stdout.split(/\r?\n/).filter(Boolean);
    let failed = 0;
    for (const c of cmds) {
      if (c.id && existing.some(t => t.startsWith(`[${c.id}] `))) { console.log(`# ${c.id}: already exists, skipped`); continue; }
      console.log(show(c.args));
      const r = spawnSync('gh', c.args, {stdio: 'inherit'});
      if (r.status !== 0) { console.error(`# exit ${r.status}; stopping`); failed++; break; }
    }
    return failed ? 1 : 0;
  } finally { if (!out) rmSync(tmp, {recursive: true, force: true}); }
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) process.exitCode = main();
