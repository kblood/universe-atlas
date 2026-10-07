// Bit-identity capture for placeAt: node capture.mjs <checkoutRoot> <out.tsv> [sets=perf,fresh] [order=fwd|rev]
// Every numeric field is written as its float64 bit pattern (hex), so equality of lines == bit equality (incl. -0/NaN).
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const [root, out, setsArg = 'perf,fresh', order = 'fwd', passesArg = '1'] = process.argv.slice(2);
const passes = +passesArg;
const imp = p => import(pathToFileURL(`${root}/${p}`).href);
const {galaxies, refByAddress, system} = await imp('src/catalog.ts');
const {CATALOGUE_EPOCH_NS} = await imp('src/world-time.ts');
const {fibonacciDirection} = await imp('src/ocean-volume.ts');
const {placeAt} = await imp('src/place-query.ts');
const {TERRAIN_VERSION} = await imp('src/terrain.ts');
const C = await imp('src/mountain-carving.ts');
const {orogenLayout} = await imp('src/mountain-layout.ts');
const {MASSIF_ENVELOPE} = await imp('src/mountain-envelope.ts');

const g0 = galaxies('LETHRA-001')[0];
const WORLDS = [['G001/C2128,0,1/0', 1], ['G001/C2142,3,4/0', 0], ['G001/C2143,4,3/0', 1], ['G001/C2142,6,1/1', 1]]
  .map(([a, i]) => { const sys = system(refByAddress(g0, a)); return {sys, body: sys.planets[i]}; });
const f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
const hex = x => { f64[0] = x; return u32[1].toString(16).padStart(8, '0') + u32[0].toString(16).padStart(8, '0'); };
const canon = v => JSON.stringify(v, (_k, x) => typeof x === 'number' ? 'f' + hex(x) : x);
// mulberry32
const rng = s => () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const randDir = r => { const z = 2 * r() - 1, p = 2 * Math.PI * r(), s = Math.sqrt(1 - z * z); return [s * Math.cos(p), z, s * Math.sin(p)]; };
const inMassif = (layout, d) => { const o = layout.sample(d); return o.belt !== 0 && o.halfWidthM >= MASSIF_ENVELOPE.MIN_HALF_WIDTH_M && Math.abs(o.axisDistanceM) < MASSIF_ENVELOPE.MAX_HALF_WIDTH_M; };

const jobs = []; // {set, w, i, d, opts}
const sets = setsArg.split(',');
if (sets.includes('perf')) {
  const N = 40000;
  for (let i = 0; i < N; i++) jobs.push({set: 'perf', w: 0, i, d: fibonacciDirection(i, N), opts: undefined});
}
if (sets.includes('fresh')) {
  WORLDS.forEach(({body}, w) => {
    const r = rng(0x5eed0000 + w), layout = orogenLayout(body); let i = 0;
    for (let k = 0; k < 3000; k++) jobs.push({set: 'uniform', w, i: i++, d: randDir(r), opts: undefined});
    const scattered = [];
    for (let tries = 0; scattered.length < 500 && tries < 2e6; tries++) { const d = randDir(r); if (inMassif(layout, d)) scattered.push(d); }
    for (const d of scattered) jobs.push({set: 'massif', w, i: i++, d, opts: undefined});
    // Clustered: jitter <= ~6 km around the first 50 scattered massif points, half with measured slope.
    for (let k = 0; k < 500; k++) {
      const c = scattered[k % 50], s = 6000 / body.radiusM;
      const q = [c[0] + (2 * r() - 1) * s, c[1] + (2 * r() - 1) * s, c[2] + (2 * r() - 1) * s], n = Math.hypot(...q);
      jobs.push({set: 'cluster', w, i: i++, d: [q[0] / n, q[1] / n, q[2] / n], opts: k & 1 ? {measureSlope: true} : undefined});
    }
    console.error(JSON.stringify({world: w, massifFound: scattered.length}));
  });
}
const idx = jobs.map((_, k) => k); if (order === 'rev') idx.reverse();
const lines = new Array(jobs.length);
let b0 = C.carvingBuildStats.count, t0 = performance.now(), h0 = C.carvingPointMemoStats?.hits ?? 0;
for (let pass = 0; pass < passes; pass++) {
if (pass) { console.error(JSON.stringify({pass: pass - 1, ms: Math.round(performance.now() - t0), builds: C.carvingBuildStats.count - b0, memoHits: (C.carvingPointMemoStats?.hits ?? 0) - h0}));
  b0 = C.carvingBuildStats.count; t0 = performance.now(); h0 = C.carvingPointMemoStats?.hits ?? 0; }
for (const k of idx) {
  const j = jobs[k], {sys, body} = WORLDS[j.w];
  const res = placeAt({sys, body, t: CATALOGUE_EPOCH_NS}, j.d, 'S4', j.opts);
  lines[k] = `${j.set}\t${j.w}\t${j.i}\t${canon(j.d)}\t${j.opts ? 1 : 0}\t${canon(res)}`;
}
}
const ms = performance.now() - t0;
writeFileSync(out, lines.join('\n') + '\n');
console.error(JSON.stringify({root, TERRAIN_VERSION, order, n: jobs.length, passes, ms: Math.round(ms), builds: C.carvingBuildStats.count - b0, memoHits: (C.carvingPointMemoStats?.hits ?? 0) - h0}));
