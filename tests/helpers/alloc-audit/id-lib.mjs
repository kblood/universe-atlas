// Identity-gate helpers: load pinned baseline source from git and current worktree source,
// record source sha256 of both, count comparisons, write a JSON report and exit 1 on any difference.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {baselineSource, baselineUrl, root} from './baseline.mjs';
export const wtUrl = f => new URL(f, root).href;
export async function pair(f) {
  const wtU = wtUrl(`src/${f}`);
  const sha = s => createHash('sha256').update(s).digest('hex');
  const shas = {base: sha(baselineSource(f)), wt: sha(readFileSync(fileURLToPath(wtU)))};
  return {base: await import(baselineUrl(f)), wt: await import(wtU), shas};
}
export function gate(name) {
  const st = {name, calls: 0, comparisons: 0, differences: 0, firstDiffs: []};
  st.cmp = (a, b, ctx) => { st.comparisons++; if (!Object.is(a, b)) { st.differences++; if (st.firstDiffs.length < 10) st.firstDiffs.push({ctx, base: String(a), wt: String(b)}); } };
  st.cmpArr = (a, b, n, ctx) => { for (let i = 0; i < n; i++) st.cmp(a[i], b[i], ctx); };
  st.finish = (extra = {}) => {
    const out = {name, node: process.version, calls: st.calls, comparisons: st.comparisons, differences: st.differences, firstDiffs: st.firstDiffs, ...extra};
    console.log('IDENTITY ' + JSON.stringify(out));
    console.log(JSON.stringify({name, calls: st.calls, comparisons: st.comparisons, differences: st.differences, ...extra.summary}));
    if (st.differences || !st.calls) process.exitCode = 1;
  };
  return st;
}
// Deterministic PRNG.
export function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
