// Shared inputs: the stock surface-climate bench's 200k Fibonacci directions and heights on Maithea.
import {src} from './alloc-lib.mjs';
export const {galaxies, refByAddress, system, sector} = await import(src('catalog.ts'));
export const g = galaxies('LETHRA-001')[0];
export const maitheaSys = system(refByAddress(g, 'G001/C2128,0,1/0'));
export const maithea = maitheaSys.planets[1];
export function fibInputs(N) {
  const dirs = new Float64Array(N * 3), heights = new Float64Array(N);
  for (let i = 0; i < N; i++) { const y = 1 - 2 * (i + .5) / N, p = i * 2.399963229728653, r = Math.sqrt(1 - y * y); dirs[i * 3] = Math.cos(p) * r; dirs[i * 3 + 1] = y; dirs[i * 3 + 2] = Math.sin(p) * r; heights[i] = ((i * 7919) % 9000) - 500; }
  return {dirs, heights};
}
