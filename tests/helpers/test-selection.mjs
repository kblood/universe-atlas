import {readFileSync, readdirSync, existsSync, statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve, relative, dirname} from 'node:path';

export const slash = p => p.replaceAll('\\', '/');
export function registeredTests(root = process.cwd()) {
  const script = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).scripts.test;
  return [...script.matchAll(/(?:^|\s|["'])(tests\/[^\s"']+\.test\.mjs)(?=$|\s|["'])/g)].map(m => m[1]);
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
export function selectTests(changed, registered, graph) {
  const candidates = [...new Set([...registered, ...changed.filter(f => /\.test\.mjs$/.test(f) && !f.startsWith('tests/perf/'))])];
  const full = changed.find(f => f === 'package.json' || /(^|\/)tsconfig[^/]*\.json$/.test(f));
  const selected = [];
  for (const file of candidates) {
    let reason = full ? `full suite: ${full} changed` : null;
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
  return {selected, outside: changed.filter(f => !reachable.has(f) && ![...reachable].some(p => p.endsWith('/') && f.startsWith(p)))};
}
