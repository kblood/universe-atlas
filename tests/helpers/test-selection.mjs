import {readFileSync, readdirSync, existsSync, statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve, relative, dirname} from 'node:path';

export const slash = p => p.replaceAll('\\', '/');
const TEST_PATH = /(?:^|\s|["'])(tests\/[^\s"']+\.test\.mjs)(?=$|\s|["'])/g;
export const testPaths = script => [...script.matchAll(TEST_PATH)].map(m => m[1]);
export function registeredTests(root = process.cwd()) {
  return testPaths(JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).scripts.test);
}
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
/** Semantic package.json diff for test:affected (plan I5). `full: false` only when nothing but `scripts.test` changed, its
 * test-path token set is a superset of the base set, and the text around the paths (the wrapper prefix before the first
 * path, anything between or after them) is identical; anything else, including unparsable JSON or a missing side, selects
 * the full suite. `added` = newly registered paths. */
export function packageJsonChange(baseText, headText) {
  let base, head;
  if (typeof baseText !== 'string' || typeof headText !== 'string') return {full: true, reason: 'package.json missing on one side'};
  try { base = JSON.parse(baseText); head = JSON.parse(headText); } catch { return {full: true, reason: 'package.json missing or unparsable on one side'}; }
  const strip = p => { const c = structuredClone(p); if (c?.scripts && typeof c.scripts === 'object') delete c.scripts.test; return JSON.stringify(canonical(c)); };
  if (strip(base) !== strip(head)) return {full: true, reason: 'package.json changed outside scripts.test'};
  const bt = base?.scripts?.test, ht = head?.scripts?.test;
  if (typeof bt !== 'string' || typeof ht !== 'string') return {full: true, reason: 'scripts.test missing on one side'};
  if (bt === ht) return {full: false, added: [], reason: 'scripts.test unchanged'};
  const bp = testPaths(bt), hp = testPaths(ht);
  if (!bp.length || !hp.length) return {full: true, reason: 'scripts.test has no test paths on one side'};
  const prefix = t => t.slice(0, t.search(/(?:^|\s|["'])tests\/[^\s"']+\.test\.mjs(?=$|\s|["'])/));
  if (prefix(bt) !== prefix(ht)) return {full: true, reason: 'scripts.test wrapper prefix changed'};
  const skeleton = t => t.replace(TEST_PATH, (m, path) => m.slice(0, m.length - path.length)).replace(/\s+/g, ' ').trim();
  if (skeleton(bt) !== skeleton(ht)) return {full: true, reason: 'scripts.test changed outside its test paths'};
  const have = new Set(hp), removed = [...new Set(bp)].filter(p => !have.has(p));
  if (removed.length) return {full: true, reason: `scripts.test removed ${removed.join(', ')}`};
  const had = new Set(bp), added = [...new Set(hp)].filter(p => !had.has(p));
  return {full: false, added, reason: added.length ? `scripts.test appended ${added.length} path(s)` : 'scripts.test reordered only'};
}
/** package.json text at `ref` (null when absent there). */
export function packageJsonAt(ref, root = process.cwd()) {
  try { return execFileSync('git', ['show', `${ref}:package.json`], {cwd: root, encoding: 'utf8', maxBuffer: 32 << 20, stdio: ['ignore', 'pipe', 'ignore']}); } catch { return null; }
}
/** packageJsonChange of the merge base of `base` and HEAD (the side `changedFiles` diffs against) vs the working tree. */
export function packageJsonChangeSince(base, root = process.cwd()) {
  const head = existsSync(resolve(root, 'package.json')) ? readFileSync(resolve(root, 'package.json'), 'utf8') : null;
  return packageJsonChange(packageJsonAt(git(['merge-base', base, 'HEAD'], root), root), head);
}
export function git(args, root = process.cwd()) {
  return execFileSync('git', args, {cwd: root, encoding: 'utf8', maxBuffer: 32 << 20}).trim();
}
export function baseRef(requested, root = process.cwd()) {
  if (requested) { git(['rev-parse', '--verify', `${requested}^{commit}`], root); return requested; }
  try { git(['rev-parse', '--verify', 'main^{commit}'], root); return 'main'; }
  catch { return git(['merge-base', 'HEAD', 'origin/main'], root); }
}
export function changedFiles(base, root = process.cwd()) {
  return [...new Set([
    ...git(['diff', '--name-only', '-z', `${base}...HEAD`], root).split('\0'),
    ...git(['diff', '--name-only', '-z', '--cached'], root).split('\0'),
    ...git(['diff', '--name-only', '-z'], root).split('\0'),
    ...git(['ls-files', '--others', '--exclude-standard', '-z'], root).split('\0'),
  ].filter(Boolean))];
}
function walk(dir, root) {
  if (!existsSync(resolve(root, dir))) return [];
  return readdirSync(resolve(root, dir), {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(`${dir}/${e.name}`, root) : [`${dir}/${e.name}`]);
}
export function importGraph(root = process.cwd()) {
  const graph = new Map();
  const files = [...walk('src', root), ...walk('tests', root)].filter(f => /\.(ts|mjs|js)$/.test(f));
  function resolveSpec(file, spec) {
    const base = slash(relative(root, resolve(root, dirname(file), spec)));
    for (const p of [base, ...['.ts', '.mjs', '.js'].map(e => base + e), ...['ts', 'mjs', 'js'].map(e => `${base}/index.${e}`), base.replace(/\.js$/, '.ts')]) {
      if (existsSync(resolve(root, p)) && statSync(resolve(root, p)).isFile()) return p;
    }
    return spec.endsWith('/') ? `${base}/` : base; // Keep directory reads and deleted edges.
  }
  for (const file of files) {
    const source = readFileSync(resolve(root, file), 'utf8'), edges = [];
    // Conservative static scan also covers literal imports embedded in bundler stdin.
    const patterns = [/(?:import|export)\s+[\s\S]*?\bfrom\s*['"]([^'"]+)['"]/g, /\bimport\s*['"]([^'"]+)['"]/g, /\bimport\s*\(\s*['"]([^'"]+)['"]/g, /new\s+URL\s*\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url/g];
    for (const regex of patterns) for (const m of source.matchAll(regex)) if (m[1].startsWith('.')) edges.push({path: resolveSpec(file, m[1]), kind: 'import'});
    for (const m of source.matchAll(/['"`](\/?src\/[^'"`\s]+|tests\/[^'"`\s]+)['"`]/g)) edges.push({path: m[1].replace(/^\//, ''), kind: 'references path'});
    for (const m of source.matchAll(/['"]((?:\.\.\/|\.\/)[^'"\s]+\.(?:ts|mjs|js))['"]/g)) edges.push({path: resolveSpec(file, m[1]), kind: 'references path'});
    graph.set(file, edges);
  }
  return graph;
}
// `pkg` = packageJsonChange(...) for a changed package.json; without it a package.json change selects the full suite (fail closed).
export function selectTests(changed, registered, graph, {pkg} = {}) {
  const candidates = [...new Set([...registered, ...changed.filter(f => /\.test\.mjs$/.test(f) && !f.startsWith('tests/perf/'))])];
  const pkgFull = changed.includes('package.json') && (!pkg || pkg.full);
  const tsconfig = changed.find(f => /(^|\/)tsconfig[^/]*\.json$/.test(f));
  const full = pkgFull ? `package.json changed${pkg ? ` (${pkg.reason})` : ''}` : tsconfig ? `${tsconfig} changed` : null;
  const pkgAccepted = changed.includes('package.json') && !pkgFull, added = pkgAccepted ? pkg.added : [];
  const selected = [];
  for (const file of candidates) {
    let reason = full ? `full suite: ${full}` : added.includes(file) ? 'newly registered in package.json scripts.test' : null;
    const queue = [[file, [file], false]], seen = new Set();
    while (!reason && queue.length) {
      const [path, chain, reference] = queue.shift();
      if (seen.has(path)) continue; seen.add(path);
      if (changed.includes(path)) { reason = `${reference ? 'references path: ' : ''}${chain.join(' -> ')}`; break; }
      // Directory URL reads (for example season's src isolation audit).
      for (const target of changed) if (path.endsWith('/') && target.startsWith(path)) { reason = `references path: ${chain.join(' -> ')} -> ${target}`; break; }
      for (const edge of graph.get(path) || []) queue.push([edge.path, [...chain, edge.path], reference || edge.kind === 'references path']);
    }
    if (reason) selected.push({file, reason, unregistered: !registered.includes(file)});
  }
  const reachable = new Set(), pending = [...candidates];
  while (pending.length) { const p = pending.pop(); if (reachable.has(p)) continue; reachable.add(p); pending.push(...(graph.get(p) || []).map(e => e.path)); }
  return {selected, outside: changed.filter(f => !(pkgAccepted && f === 'package.json') && !reachable.has(f) &&![...reachable].some(p => p.endsWith('/') && f.startsWith(p)))};
}
