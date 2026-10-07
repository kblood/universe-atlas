// Test-side REFERENCE ONLY: the mountain-carving-2 triangle interpolant on the mountain-carving-3 block data
// (docs/fable-decision-carving-lattice-2026-10-07.md item 5). Production src/mountain-carving.ts interpolates the cut
// fraction with a 4x4 Catmull-Rom (C1); this helper rewrites only the query of a copy of that source so it
// triangle-interpolates the same stored cut values on the hashed diagonal (the old query: C0, a gradient kink on every
// lattice line). The solve, the build, the stored columns, the memo and the exclusions are the shipped code, so the
// two differ only by the interpolant. Used as the NEGATIVE CONTROL of the C1 continuity straddle
// (tests/mountain-carving.test.mjs) and of the 200 m lattice spectrum pin (tests/terrain-structural-spectrum.test.mjs).
//   triangleSource(source)       the rewritten module source (throws if a needle is missing: no silent no-op)
//   loadTriangleCarving()        a fresh module instance of the rewritten source (own memo)
//   load(url, context, nextLoad) a module load hook (module.registerHooks) that serves the rewritten source for
//                                src/mountain-carving.ts, so a worker's whole terrain stack uses the triangle query
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';

const SOURCE_URL = new URL('../../src/mountain-carving.ts', import.meta.url);
// The block-path query and the point-query dispatch of src/mountain-carving.ts (mountain-carving-3).
// Both kernels (the Catmull-Rom height and the smoothed M5 rock driver, mountain-assembly-4) become the triangle, so
// rock reads a triangle field too: main's mountain-carving-2 / mountain-assembly-3 semantics on the new block data.
const BLOCK_QUERY = 'return smooth?bspline(v,o0,o1,o2,o3,u,t):catmullRom(v,o0,o1,o2,o3,u,t);';
const POINT_DISPATCH = 'if(pointDepth)return cutAtPoint(alongM,acrossM,halfWidthM,seed,smooth);';
// mountain-carving-2's triangle expressions (src at 32f5de3, retainedAt), read on the cut storage: the cell's
// lower-left vertex is stored at index row*S + (col - id*CORE) + 1 = row*S + a + 1.
const TRIANGLE_QUERY = 'const r=v,b=row*S+a+1;' +
  'const tv=diagonal(col,row,seed)' +
  '?(u>=t?(1-u)*r[b]+(u-t)*r[b+1]+t*r[b+S+1]:(1-t)*r[b]+(t-u)*r[b+S]+u*r[b+S+1])' +
  ':(u+t<=1?(1-u-t)*r[b]+u*r[b+1]+t*r[b+S]:(u+t-1)*r[b+S+1]+(1-t)*r[b+1]+(1-u)*r[b+S]);' +
  'return Math.max(0,Math.min(1,tv));';

export function triangleSource(source = readFileSync(SOURCE_URL, 'utf8')) {
  for (const needle of [BLOCK_QUERY, POINT_DISPATCH])
    if (source.split(needle).length !== 2) throw new Error('mountain-carving-triangle: needle not found exactly once: ' + needle);
  // Point queries take the (triangle) block path too, so placeAt and every caller see the same reference field.
  return source.replace(POINT_DISPATCH, '').replace(BLOCK_QUERY, TRIANGLE_QUERY) +
    "\n// triangle reference (test-side)\nexport const TEST_REFERENCE_INTERPOLANT='triangle';\n";
}
let instances = 0;
export function loadTriangleCarving() {
  const js = stripTypeScriptTypes(triangleSource()) + '\n// instance ' + (instances++);
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
}
export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  if (!/\/src\/mountain-carving\.ts$/.test(url)) return result;
  return {...result, source: triangleSource(String(result.source))};
}
/** Synchronous variant for module.registerHooks (in-thread hooks; Node >= 22.15). */
export function loadSync(url, context, nextLoad) {
  const result = nextLoad(url, context);
  if (!/\/src\/mountain-carving\.ts$/.test(url)) return result;
  return {...result, source: triangleSource(String(result.source))};
}
