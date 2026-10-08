// climate-m1 pre-merge timing harness (coordinator dispatch 2026-10-08).
// Modes:
//   ab   <mainDir> <branchDir> [rounds]  in-process interleaved A/B of the per-sample cost (+ allocation check)
//   cold <dir> <catalogDir> [reps]       fresh-process cold build of climateForcingFor
// Run with: node --expose-gc ab-harness.mjs ...
// Bodies and directions are the stock tests/surface-climate.bench.mjs set (Maithea + 40 temperate bodies from LETHRA-001).
import {pathToFileURL} from 'node:url';
import v8 from 'node:v8';

const [mode, dirA, dirB, extra] = process.argv.slice(2);
const url = (dir, f) => pathToFileURL(`${dir}/src/${f}`).href;
const gc = globalThis.gc ?? (() => { throw new Error('run with --expose-gc'); });
const median = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n & 1 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const min = a => Math.min(...a);

async function bodySet(catalogDir) {
  const {galaxies, refByAddress, sector, system} = await import(url(catalogDir, 'catalog.ts'));
  return {galaxies, refByAddress, sector, system};
}
function pickBodies(cat, temperateHabitat) {
  const {galaxies, refByAddress, sector, system} = cat;
  const g = galaxies('LETHRA-001')[0];
  const maithea = system(refByAddress(g, 'G001/C2128,0,1/0')).planets[1];
  const bodies = [];
  for (let sx = 266; bodies.length < 40; sx++) for (const ref of sector(g, [sx, 0, 0]).refs) { for (const b of system(ref).planets) if (temperateHabitat(b)) bodies.push(b); if (bodies.length >= 40) break; }
  return {maithea, bodies};
}

const N = 200000;
const dirs = new Float64Array(N * 3), heights = new Float64Array(N);
for (let i = 0; i < N; i++) { const y = 1 - 2 * (i + .5) / N, p = i * 2.399963229728653, r = Math.sqrt(1 - y * y); dirs[i * 3] = Math.cos(p) * r; dirs[i * 3 + 1] = y; dirs[i * 3 + 2] = Math.sin(p) * r; heights[i] = ((i * 7919) % 9000) - 500; }

// One separately compiled loop per version (new Function = its own SharedFunctionInfo and feedback), so the
// sample(d,h,out) call site stays monomorphic for each version, as in the stock bench.
const LOOP = `return (sample,out)=>{const d=[0,0,0];for(let i=0;i<N;i++){d[0]=dirs[i*3];d[1]=dirs[i*3+1];d[2]=dirs[i*3+2];acc[0]+=sample(d,heights[i],out).annualMeanTempK;}};`;
// Negative control: the same loop plus one escaping allocation per sample (must be caught by the GC counter).
const LOOP_ALLOC = `return (sample,out)=>{const d=[0,0,0];for(let i=0;i<N;i++){d[0]=dirs[i*3];d[1]=dirs[i*3+1];d[2]=dirs[i*3+2];sink[i&1023]={v:sample(d,heights[i],out).annualMeanTempK};}};`;
const acc = new Float64Array(1), sink = new Array(1024).fill(null);
const makeLoop = src => new Function('N', 'dirs', 'heights', 'acc', 'sink', src)(N, dirs, heights, acc, sink);

function allocCheck(run, sample, out, passes) {
  gc(); gc();
  const heap0 = process.memoryUsage().heapUsed;
  const prof = new v8.GCProfiler(); prof.start();
  for (let p = 0; p < passes; p++) run(sample, out);
  const r = prof.stop();
  const heap1 = process.memoryUsage().heapUsed;
  const stats = r?.statistics ?? [];
  const gcs = stats.length, scavenges = stats.filter(s => /scavenge/i.test(s.gcType)).length;
  // Bytes freed by the GCs that ran inside the loop + net growth = an upper estimate of what the loop allocated.
  let freed = 0; for (const s of stats) freed += Math.max(0, (s.beforeGC?.heapStatistics?.usedHeapSize ?? 0) - (s.afterGC?.heapStatistics?.usedHeapSize ?? 0));
  const calls = passes * N;
  return {calls, gcEvents: gcs, scavenges, heapGrowthBytes: heap1 - heap0, freedByGcBytes: freed, bytesPerCallUpperBound: (Math.max(0, heap1 - heap0) + freed) / calls, gcTypes: [...new Set(stats.map(s => s.gcType))]};
}

if (mode === 'ab') {
  const rounds = Number(extra ?? 25);
  const cat = await bodySet(dirB);
  const A = await import(url(dirA, 'surface-climate.ts')), B = await import(url(dirB, 'surface-climate.ts'));
  const {maithea} = pickBodies(cat, B.temperateHabitat);
  const ver = {
    main: {mod: A, sample: A.surfaceClimate(A.climateForcingFor(maithea)), out: A.createClimateSample(), run: makeLoop(LOOP)},
    branch: {mod: B, sample: B.surfaceClimate(B.climateForcingFor(maithea)), out: B.createClimateSample(), run: makeLoop(LOOP)},
  };
  // Warm both (JIT tier-up), interleaved.
  for (let w = 0; w < 8; w++) for (const k of ['main', 'branch']) ver[k].run(ver[k].sample, ver[k].out);
  const ns = {main: [], branch: []}, paired = [];
  for (let r = 0; r < rounds; r++) {
    const order = r & 1 ? ['branch', 'main'] : ['main', 'branch'];
    const t = {};
    for (const k of order) { const t0 = performance.now(); ver[k].run(ver[k].sample, ver[k].out); t[k] = (performance.now() - t0) * 1e6 / N; ns[k].push(t[k]); }
    paired.push(t.branch / t.main);
  }
  const res = {mode: 'ab', node: process.version, rounds, samplesPerPass: N, nsPerSample: {}, ratio: {}};
  for (const k of ['main', 'branch']) res.nsPerSample[k] = {best: min(ns[k]), median: median(ns[k]), passes: ns[k].map(x => +x.toFixed(2))};
  res.ratio = {medianOverMedian: res.nsPerSample.branch.median / res.nsPerSample.main.median, bestOverBest: res.nsPerSample.branch.best / res.nsPerSample.main.best, medianOfPaired: median(paired)};
  // Allocation: 15 passes x 200k = 3M warm calls per version, GCs counted with v8.GCProfiler.
  res.alloc = {};
  for (const k of ['main', 'branch']) res.alloc[k] = allocCheck(ver[k].run, ver[k].sample, ver[k].out, 15);
  const neg = makeLoop(LOOP_ALLOC); for (let w = 0; w < 3; w++) neg(ver.branch.sample, ver.branch.out);
  res.alloc.negativeControlBranchPlusOneObjectPerCall = allocCheck(neg, ver.branch.sample, ver.branch.out, 15);
  res.sink = Number.isFinite(acc[0]);
  console.log(JSON.stringify(res));
} else if (mode === 'cold') {
  const reps = Number(extra ?? 9);
  const cat = await bodySet(dirB);
  let t0 = performance.now();
  const M = await import(url(dirA, 'surface-climate.ts'));
  const importMs = performance.now() - t0;
  const {maithea, bodies} = pickBodies(cat, M.temperateHabitat);
  M.clearClimateForcingCache();
  t0 = performance.now(); M.climateForcingFor(maithea); const firstCallColdJitMs = performance.now() - t0;
  // Second distinct body, still early JIT.
  t0 = performance.now(); M.climateForcingFor(bodies[0]); const secondCallMs = performance.now() - t0;
  // Stock-bench method: cold cache, warmed JIT, 40 bodies; repeated.
  M.clearClimateForcingCache(); for (const b of bodies.slice(0, 5)) M.climateForcingFor(b);
  const perBody = [];
  for (let r = 0; r < reps; r++) { M.clearClimateForcingCache(); const t = performance.now(); for (const b of bodies) M.climateForcingFor(b); perBody.push((performance.now() - t) / bodies.length); }
  const res = {mode: 'cold', dir: dirA, node: process.version, importMs, firstCallColdJitMs, secondCallMs, warmJitColdCacheMsPerBody: {best: min(perBody), median: median(perBody), reps: perBody.map(x => +x.toFixed(4))}};
  if (M.zonalTables) {
    const z = []; for (let r = 0; r < 200; r++) { const t = performance.now(); M.zonalTables(r % 2 ? 0 : 23.5); z.push(performance.now() - t); }
    res.zonalTablesMsWarm = {best: min(z), median: median(z)};
  }
  console.log(JSON.stringify(res));
} else throw new Error('mode ab|cold');
