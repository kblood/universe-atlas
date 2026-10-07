// Worker-imported bit-identity capture for placeAt (docs/placeat-first-touch-decision-2026-10-07.md section 2.E).
// node capture-warm.mjs <checkoutRoot> <out.tsv> [workers=3] [sets=perf,fresh] [limit] (limit: first N jobs, smoke runs only)
// Same 56,000 jobs, line format and order as docs/placeat-regression-2026-10-07/capture.mjs (fwd, one pass), but every
// query's carving blocks are first solved in a worker (exportPlaceBlocks), posted with transfer
// (placeBlockTransferables) and imported on the main thread (importPlaceBlocks) right before the main-thread placeAt,
// whose result is the line written. The worker's own result line must equal the main line. The sha256 of the output
// must equal the plain capture's (45dbde37...dc8d47 for the full set). Runs at below-normal priority.
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import os from 'node:os';
import {Worker, isMainThread, parentPort, workerData} from 'node:worker_threads';

const args = isMainThread ? process.argv.slice(2) : workerData.args;
const [root, out, workersArg = '3', setsArg = 'perf,fresh', limitArg = ''] = args;
const imp = p => import(pathToFileURL(`${root}/${p}`).href);
const {galaxies, refByAddress, system} = await imp('src/catalog.ts');
const {CATALOGUE_EPOCH_NS} = await imp('src/world-time.ts');
const {placeAt, exportPlaceBlocks, importPlaceBlocks, placeBlockTransferables} = await imp('src/place-query.ts');
const C = await imp('src/mountain-carving.ts');

const g0 = galaxies('LETHRA-001')[0];
const WORLDS = [['G001/C2128,0,1/0', 1], ['G001/C2142,3,4/0', 0], ['G001/C2143,4,3/0', 1], ['G001/C2142,6,1/1', 1]]
  .map(([a, i]) => { const sys = system(refByAddress(g0, a)); return {sys, body: sys.planets[i]}; });
const f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
const hex = x => { f64[0] = x; return u32[1].toString(16).padStart(8, '0') + u32[0].toString(16).padStart(8, '0'); };
const canon = v => JSON.stringify(v, (_k, x) => typeof x === 'number' ? 'f' + hex(x) : x);
const line = (j, res) => `${j.set}\t${j.w}\t${j.i}\t${canon(j.d)}\t${j.opts ? 1 : 0}\t${canon(res)}`;

if (!isMainThread) {
  for (const j of workerData.jobs) {
    const {result, blocks} = exportPlaceBlocks({sys: WORLDS[j.w].sys, body: WORLDS[j.w].body, t: CATALOGUE_EPOCH_NS}, j.d, 'S4', j.opts);
    parentPort.postMessage({k: j.k, line: line(j, result), blocks}, placeBlockTransferables(blocks));
  }
  parentPort.postMessage({done: true, builds: C.carvingBuildStats.count});
} else {
  try { os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL); } catch {}
  const {fibonacciDirection} = await imp('src/ocean-volume.ts');
  const {orogenLayout} = await imp('src/mountain-layout.ts');
  const {MASSIF_ENVELOPE} = await imp('src/mountain-envelope.ts');
  // Job generation copied verbatim from docs/placeat-regression-2026-10-07/capture.mjs.
  const rng = s => () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const randDir = r => { const z = 2 * r() - 1, p = 2 * Math.PI * r(), s = Math.sqrt(1 - z * z); return [s * Math.cos(p), z, s * Math.sin(p)]; };
  const inMassif = (layout, d) => { const o = layout.sample(d); return o.belt !== 0 && o.halfWidthM >= MASSIF_ENVELOPE.MIN_HALF_WIDTH_M && Math.abs(o.axisDistanceM) < MASSIF_ENVELOPE.MAX_HALF_WIDTH_M; };
  const jobs = [];
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
      for (let k = 0; k < 500; k++) {
        const c = scattered[k % 50], s = 6000 / body.radiusM;
        const q = [c[0] + (2 * r() - 1) * s, c[1] + (2 * r() - 1) * s, c[2] + (2 * r() - 1) * s], n = Math.hypot(...q);
        jobs.push({set: 'cluster', w, i: i++, d: [q[0] / n, q[1] / n, q[2] / n], opts: k & 1 ? {measureSlope: true} : undefined});
      }
      console.error(JSON.stringify({world: w, massifFound: scattered.length}));
    });
  }
  if (limitArg) jobs.length = Math.min(jobs.length, +limitArg);
  // Round-robin chunks of CHUNK jobs per worker; the main thread consumes strictly in job order.
  const W = Math.max(1, +workersArg), CHUNK = 250, parts = Array.from({length: W}, () => []);
  jobs.forEach((j, k) => parts[Math.floor(k / CHUNK) % W].push({...j, k}));
  const t0 = performance.now(), b0 = C.carvingBuildStats.count, h0 = C.carvingPointMemoStats.hits;
  const lines = new Array(jobs.length), buffer = new Map();
  let next = 0, mismatches = 0, importedBlocks = 0, postedBlocks = 0, massifJobs = 0, workerBuilds = 0, done = 0, peakBuffer = 0;
  const drain = () => {
    while (buffer.has(next)) {
      const m = buffer.get(next), j = jobs[next]; buffer.delete(next);
      postedBlocks += m.blocks.length; if (m.blocks.length) massifJobs++;
      importedBlocks += importPlaceBlocks(m.blocks);
      const res = placeAt({sys: WORLDS[j.w].sys, body: WORLDS[j.w].body, t: CATALOGUE_EPOCH_NS}, j.d, 'S4', j.opts);
      lines[next] = line(j, res);
      if (lines[next] !== m.line) mismatches++;
      next++;
      if (next % 5000 === 0) console.error(JSON.stringify({progress: next, ms: Math.round(performance.now() - t0), mainBuilds: C.carvingBuildStats.count - b0}));
    }
  };
  await new Promise((resolve, reject) => {
    parts.forEach(part => {
      const w = new Worker(new URL(import.meta.url), {workerData: {args, jobs: part}});
      w.on('message', m => {
        if (m.done) { workerBuilds += m.builds; if (++done === W) resolve(); return; }
        buffer.set(m.k, m); peakBuffer = Math.max(peakBuffer, buffer.size); drain();
      });
      w.on('error', reject);
    });
  });
  drain();
  if (next !== jobs.length) throw new Error(`consumed ${next} of ${jobs.length}`);
  const text = lines.join('\n') + '\n';
  writeFileSync(out, text);
  const sha = createHash('sha256').update(text).digest('hex');
  console.error(JSON.stringify({root, mode: 'worker-imported', workers: W, n: jobs.length, ms: Math.round(performance.now() - t0),
    workerBuilds, mainBuilds: C.carvingBuildStats.count - b0, massifJobs, postedBlocks, importedBlocks,
    duplicateImports: C.carvingTransferStats.duplicate, mainMemoHits: C.carvingPointMemoStats.hits - h0, workerMainLineMismatches: mismatches, peakBuffer, sha256: sha}));
  process.exit(0);
}
