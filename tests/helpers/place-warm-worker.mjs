// Warm-up worker for placeAt residency transfer (docs/placeat-first-touch-decision-2026-10-07.md, docs/place-query-v1.md
// "Warm-up and residency transfer"). Used by tests/place-query.test.mjs and tests/perf/place-query.perf.test.mjs.
//
// In a worker thread (workerData = {jobs: [{world, d, opts?}]}) it runs exportPlaceBlocks for every job, in order, and
// posts {results, blocks, builds, ms} with every block's r.buffer in the transfer list (placeBlockTransferables). On the
// main thread, warmInWorker(jobs) spawns it and resolves to that message. `world` indexes PLACE_WORLDS (the four water
// worlds of tests/place-query.test.mjs, named as in tests/tier-sets.json).
import {Worker, isMainThread, parentPort, workerData} from 'node:worker_threads';
import {galaxies, refByAddress, system} from '../../src/catalog.ts';
import {CATALOGUE_EPOCH_NS} from '../../src/world-time.ts';
import {exportPlaceBlocks, placeBlockTransferables} from '../../src/place-query.ts';
import {carvingBuildStats} from '../../src/mountain-carving.ts';

const ADDRS = [['G001/C2128,0,1/0', 1], ['G001/C2142,3,4/0', 0], ['G001/C2143,4,3/0', 1], ['G001/C2142,6,1/1', 1]];
let worlds;
/** [{name, sys, body}] in tests/place-query.test.mjs WORLDS order (Maithea, Selawyn, Raiva, Lethuris). */
export function placeWorlds() {
  return worlds ??= ADDRS.map(([a, i]) => {const sys = system(refByAddress(galaxies('LETHRA-001')[0], a));return {name: sys.planets[i].name, sys, body: sys.planets[i]};});
}
export const placeCtx = world => {const {sys, body} = placeWorlds()[world];return {sys, body, t: CATALOGUE_EPOCH_NS};};
/** Frozen massif directions (kinds axis/flank) of tests/tier-sets.json smoke, as warm-up jobs in world order. */
export function frozenMassifJobs(tierSets, kinds = ['axis', 'flank']) {
  const jobs = [];
  placeWorlds().forEach(({name}, world) => {
    const rows = tierSets.smoke[name];
    if (!rows) throw new Error(`tier-sets.json: no smoke set for ${name}`);
    for (const r of rows) if (kinds.includes(r.kind)) jobs.push({world, kind: r.kind, d: r.d});
  });
  return jobs;
}

/** Main thread: run exportPlaceBlocks for the jobs in a worker; resolves to {results, blocks: [[...per job]], builds, ms}. */
export function warmInWorker(jobs) {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL(import.meta.url), {workerData: {jobs: jobs.map(({world, d, opts}) => ({world, d, opts}))}});
    w.once('message', m => {resolve(m);w.terminate();});
    w.once('error', reject);
    w.once('exit', code => {if (code !== 0 && code !== 1) reject(new Error(`place-warm-worker exited ${code}`));});
  });
}

if (!isMainThread && workerData?.jobs) {
  const t0 = performance.now(), b0 = carvingBuildStats.count, results = [], blocks = [];
  for (const {world, d, opts} of workerData.jobs) {
    const out = exportPlaceBlocks(placeCtx(world), d, 'S4', opts ?? {});
    results.push(out.result);blocks.push(out.blocks);
  }
  parentPort.postMessage({results, blocks, builds: carvingBuildStats.count - b0, ms: performance.now() - t0},
    placeBlockTransferables(blocks.flat()));
}
