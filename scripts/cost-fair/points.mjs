// C1 point sets cached by the REF commit sha (O5, docs/cost-fair-harness-2026-10-07.md). The point sets depend only on
// the REF tree (c1-points.mjs imports REF's src/ and tests/), so one computation per REF sha serves every gate.
//   node scripts/cost-fair/points.mjs <REF> <REF_SHA or ''> <cacheRoot> <OUT>   -> prints the cache dir (prefix dir)
// - REF_SHA: a full 40-hex sha. If REF is a git checkout, its HEAD must equal REF_SHA (or gives it when '') and its
//   src/ and tests/ must be clean. A `git archive` export has no .git: REF_SHA must then be given.
// - Cache dir <cacheRoot>/<sha>/ holds points-<world>{.json,-region.f64,-outside.f64} and manifest.json with a content
//   fingerprint of REF's src/ + tests/ (sha256 over paths and LF-normalised contents) and the sha256 of every file.
//   On reuse both are re-checked: a fingerprint mismatch (REF is not that sha) or a changed file is a hard error.
// - A missing cache is built in a temp dir by c1-points.mjs (one process per world, the same command as before) and
//   renamed into place, so an interrupted build never leaves a half cache.
// - OUT gets the evidence: points-<world>.json, points-f64.sha256, and one line in points-source.jsonl.
import {spawnSync, execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync, mkdirSync, renameSync, rmSync, copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

export const WORLDS = ['Maithea', 'Selawyn', 'Raiva', 'Lethuris'];
const H = fileURLToPath(new URL('.', import.meta.url));
const sha256 = buf => createHash('sha256').update(buf).digest('hex');
/** Content fingerprint of root's src/ and tests/: sorted relative paths with the sha256 of their LF-normalised bytes. */
export function fingerprint(root) {
  const files = [];
  const walk = rel => {
    for (const e of readdirSync(`${root}/${rel}`, {withFileTypes: true})) {
      const p = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) files.push(p);
    }
  };
  for (const d of ['src', 'tests']) if (existsSync(`${root}/${d}`)) walk(d); else throw new Error(`${root} has no ${d}/`);
  files.sort();
  const h = createHash('sha256');
  for (const f of files) h.update(`${f}\0${sha256(readFileSync(`${root}/${f}`, 'latin1').replace(/\r\n/g, '\n'))}\n`);
  return {files: files.length, sha256: h.digest('hex')};
}
const fileNames = w => [`points-${w}.json`, `points-${w}-region.f64`, `points-${w}-outside.f64`];
const hashes = dir => Object.fromEntries(WORLDS.flatMap(fileNames).map(n => [n, sha256(readFileSync(`${dir}/${n}`))]));
function refSha(ref, given) {
  if (given && !/^[0-9a-f]{40}$/.test(given)) throw new Error(`REF_SHA must be a full 40-hex sha, got ${given}`);
  if (!existsSync(`${ref}/.git`)) { if (!given) throw new Error(`REF ${ref} is not a git checkout (an export?): set REF_SHA`); return given; }
  const head = execFileSync('git', ['-C', ref, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
  if (given && given !== head) throw new Error(`REF_SHA ${given} but ${ref} is at ${head}`);
  if (execFileSync('git', ['-C', ref, 'status', '--porcelain', '--', 'src', 'tests'], {encoding: 'utf8'}).trim()) throw new Error(`${ref} has local changes in src/ or tests/`);
  return head;
}

const [ref, givenSha, cacheRoot, out] = process.argv.slice(2);
if (!ref || !cacheRoot || !out) throw new Error('usage: node scripts/cost-fair/points.mjs <REF> <REF_SHA or \'\'> <cacheRoot> <OUT>');
const sha = refSha(ref, givenSha), dir = `${cacheRoot}/${sha}`, fp = fingerprint(ref);
let reused = existsSync(`${dir}/manifest.json`);
if (reused) {
  const m = JSON.parse(readFileSync(`${dir}/manifest.json`, 'utf8'));
  if (m.sha !== sha || m.fingerprint.sha256 !== fp.sha256) throw new Error(`points cache ${dir}: fingerprint ${m.fingerprint.sha256} (${m.sha}) but REF ${ref} gives ${fp.sha256}; REF is not ${sha}, or the cache is wrong`);
  const now = hashes(dir), bad = Object.keys(m.files).filter(n => now[n] !== m.files[n]);
  if (bad.length) throw new Error(`points cache ${dir}: changed files ${bad.join(', ')}`);
  console.error(`cost-fair points: reusing ${dir} (REF ${sha}, fingerprint ok, ${Object.keys(m.files).length} files ok)`);
} else {
  mkdirSync(cacheRoot, {recursive: true});
  const tmp = `${dir}.tmp-${process.pid}`;
  rmSync(tmp, {recursive: true, force: true});mkdirSync(tmp);
  for (const w of WORLDS) {
    const r = spawnSync(process.execPath, [`${H}c1-points.mjs`, w, ref, `${tmp}/points-${w}`], {stdio: ['ignore', 2, 'inherit']}); // child stdout -> our stderr: stdout carries only the cache dir
    if (r.status !== 0) { rmSync(tmp, {recursive: true, force: true}); throw new Error(`c1-points.mjs ${w} exit ${r.status ?? r.signal}`); }
  }
  writeFileSync(`${tmp}/manifest.json`, JSON.stringify({sha, fingerprint: fp, ref, node: process.version, at: new Date().toISOString(), files: hashes(tmp)}, null, 1) + '\n');
  try { renameSync(tmp, dir); } catch (e) {
    rmSync(tmp, {recursive: true, force: true});
    if (!existsSync(`${dir}/manifest.json`)) throw e; // a concurrent builder won the rename; reuse is checked on the next call
    reused = true;
  }
  console.error(`cost-fair points: built ${dir}`);
}
const m = JSON.parse(readFileSync(`${dir}/manifest.json`, 'utf8'));
mkdirSync(out, {recursive: true});
for (const w of WORLDS) copyFileSync(`${dir}/points-${w}.json`, `${out}/points-${w}.json`);
writeFileSync(`${out}/points-f64.sha256`, Object.entries(m.files).filter(([n]) => n.endsWith('.f64')).sort().map(([n, h]) => `${h} *${n}\n`).join(''));
appendFileSync(`${out}/points-source.jsonl`, JSON.stringify({at: new Date().toISOString(), sha, cacheDir: dir, fingerprint: fp, reused, ref}) + '\n');
console.log(dir);
