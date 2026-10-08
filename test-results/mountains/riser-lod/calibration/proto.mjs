// Prototype of the riser-LOD rock variant (scratch only): v1 source + a riserSpacingM parameter.
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const B='C:/LLM/IWSDK/universe-atlas-wt/riser-lod'; // drafting prototype: main's v1 source + the registered riser bench (section 1)
const SRC=readFileSync(B+'/src/mountain-rock-detail.ts','utf8');
const edit=s=>s
  .replace('carvedYM: number, seed: number): number {','carvedYM: number, seed: number, riserSpacingM: number = 0): number {')
  .replace('const strata = bench(t);','const strata = riserSpacingM > 0 ? riserBench(t, 2 * riserSpacingM * slopeTan / C.STRATA_PERIOD_M) : bench(t);')
  + `
function riserBench(t, w) {
  if (!(w > C.BENCH_FALL)) return bench(t);
  const end = C.BENCH_RISE + C.BENCH_FALL;
  if (!(w < end)) return 0;
  const tp = end - w;
  const v = t < tp ? t / C.BENCH_RISE : t < end ? tp / C.BENCH_RISE * (end - t) / w : 0;
  return Math.min(bench(t), v);
}`;
const s=edit(SRC);if(!s.includes('riserBench(t, 2'))throw new Error('edit failed');
export const R=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(s)).toString('base64'));
