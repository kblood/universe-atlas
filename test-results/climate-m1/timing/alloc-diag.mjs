// Allocation diagnostic: the stock bench's exact `run` loop, with the GCs during 15 timed passes (3M calls) counted
// by v8.GCProfiler. Control: the same loop shape over a trivial non-allocating sampler writing the same out object.
// node --expose-gc alloc-diag.mjs <dir> [control]
import {pathToFileURL} from 'node:url';
import v8 from 'node:v8';
const [dir, which = 'real'] = process.argv.slice(2);
const u = f => pathToFileURL(`${dir}/src/${f}`).href;
const {galaxies, refByAddress, system} = await import(u('catalog.ts'));
const {climateForcingFor, surfaceClimate, createClimateSample} = await import(u('surface-climate.ts'));
const g = galaxies('LETHRA-001')[0];
const maithea = system(refByAddress(g, 'G001/C2128,0,1/0')).planets[1];
const N = 200000;
const dirs = new Float64Array(N * 3), heights = new Float64Array(N);
for (let i = 0; i < N; i++) { const y = 1 - 2 * (i + .5) / N, p = i * 2.399963229728653, r = Math.sqrt(1 - y * y); dirs[i * 3] = Math.cos(p) * r; dirs[i * 3 + 1] = y; dirs[i * 3 + 2] = Math.sin(p) * r; heights[i] = ((i * 7919) % 9000) - 500; }
const real = surfaceClimate(climateForcingFor(maithea)), out = createClimateSample(), d = [0, 0, 0];
const trivial = (dd, h, o) => { o.annualMeanTempK = dd[0] * h + 1.5; o.effectiveMoisture = dd[1] * 0.5 + 0.25; return o; };
const sample = which === 'control' ? trivial : real;
const acc = new Float64Array(1);
const run = () => { for (let i = 0; i < N; i++) { d[0] = dirs[i * 3]; d[1] = dirs[i * 3 + 1]; d[2] = dirs[i * 3 + 2]; acc[0] += sample(d, heights[i], out).annualMeanTempK; } };
for (let w = 0; w < 5; w++) run();
globalThis.gc(); globalThis.gc();
const heap0 = process.memoryUsage().heapUsed;
const prof = new v8.GCProfiler(); prof.start();
for (let r = 0; r < 15; r++) run();
const st = prof.stop().statistics;
const heap1 = process.memoryUsage().heapUsed;
let freed = 0; for (const s of st) freed += Math.max(0, s.beforeGC.heapStatistics.usedHeapSize - s.afterGC.heapStatistics.usedHeapSize);
const calls = 15 * N;
console.log(JSON.stringify({dir, which, calls, gcEvents: st.length, heapGrowthBytesDuringLoop: heap1 - heap0, freedByGcBytes: freed, bytesPerCallUpperBound: (Math.max(0, heap1 - heap0) + freed) / calls, sink: Number.isFinite(acc[0])}));
