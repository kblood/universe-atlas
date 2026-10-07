// place-query-1 (relief round 2026-10, P2-OCEAN-QUERY): the documented query
// surface for games built on the platform. Plain derived data, never game rules.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {galaxies, refByAddress, system} from '../../src/catalog.ts';
import {CATALOGUE_EPOCH_NS, YEAR_NS} from '../../src/world-time.ts';
import {starLifecycle, planetLifecycle} from '../../src/stellar-evolution.ts';
import {surfaceAt, surfaceQuery, datedOceanState} from '../../src/world-surface.ts';
import {fibonacciDirection} from '../../src/ocean-volume.ts';
import {geophysicsFromParams, pressureAtDepthPa, planetGeophysics} from '../../src/planet-geophysics.ts';
import {terrainSampler, terrainFloorSampler} from '../../src/terrain.ts';
import {placeAt, depthAndPressureAt, importPlaceBlocks, PLACE_QUERY_VERSION, PLACE_VERSIONS} from '../../src/place-query.ts';
import {carvingBuildStats, traceCarvingBlocks} from '../../src/mountain-carving.ts';
import {orogenLayout} from '../../src/mountain-layout.ts';
import {MASSIF_ENVELOPE} from '../../src/mountain-envelope.ts';
import {frozenMassifJobs, placeWorlds, warmInWorker} from '../helpers/place-warm-worker.mjs';

const SEED = 'LETHRA-001';
const ADDR = {clusterCell:[0n,0n,0n], groupCell:[0n,0n,0n], galaxyOrdinal:0,
  sectorCell:[0n,0n,0n], genCell:[0n,0n,0n], systemOrdinal:0, slot:'x'};
const g0 = galaxies(SEED)[0];
const WORLDS = [['G001/C2128,0,1/0',1],['G001/C2142,3,4/0',0],['G001/C2143,4,3/0',1],['G001/C2142,6,1/1',1]].map(([a,i]) => {
  const sys = system(refByAddress(g0, a)), body = sys.planets[i];
  const starLc = starLifecycle(SEED, ADDR, sys.stars[0]);
  return {sys, body, starLc, planetLc: planetLifecycle(SEED, ADDR, body, starLc)};
});
const DIRS = Array.from({length: 600}, (_, i) => fibonacciDirection(i, 600));

const STRICT = process.env.OCEAN_PERF_STRICT === '1';
const TIER_SETS = JSON.parse(readFileSync(new URL('../tier-sets.json', import.meta.url), 'utf8'));
const ctxOf = w => ({sys: WORLDS[w].sys, body: WORLDS[w].body, t: CATALOGUE_EPOCH_NS});
const pct = (a, q) => {const s = [...a].sort((x, y) => x - y);return s[Math.min(s.length - 1, Math.floor(q * s.length))];};

// Rows W and F: docs/placeat-first-touch-decision-2026-10-07.md section 2.D.3.
const PRIME_JITTER = 60;
const rng = s => () => {s = (s + 0x6d2b79f5) | 0;let t = Math.imul(s ^ (s >>> 15), 1 | s);t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;return ((t ^ (t >>> 14)) >>> 0) / 4294967296;};
/** Seeded random massif directions (M1 belt query only, no heights): `perWorld` per world. */
function massifDirections(seed, perWorld) {
  const dirs = [];
  WORLDS.forEach(({body}, w) => {
    const r = rng(seed + w), lay = orogenLayout(body);let found = 0;
    for (let tries = 0; found < perWorld && tries < 2e6; tries++) {
      const z = 2 * r() - 1, p = 2 * Math.PI * r(), q = Math.sqrt(1 - z * z), d = [q * Math.cos(p), z, q * Math.sin(p)], o = lay.sample(d);
      if (o.belt !== 0 && o.halfWidthM >= MASSIF_ENVELOPE.MIN_HALF_WIDTH_M && Math.abs(o.axisDistanceM) < MASSIF_ENVELOPE.MAX_HALF_WIDTH_M) {dirs.push({world: w, d});found++;}
    }
  });
  return dirs;
}

test('cost: row W warm-up: worker-exported massif blocks imported, first-pass placeAt mean <= 30 us (strict 10 us with OCEAN_PERF_STRICT=1), 0 solves', async () => {
  assert.deepEqual(placeWorlds().map(w => w.body.id), WORLDS.map(w => w.body.id));
  const jobs = frozenMassifJobs(TIER_SETS);
  assert.ok(jobs.length >= 12, `${jobs.length} frozen massif directions`);
  // The row times a query whose block was imported, in a process that has been running placeAt (as a game does): the
  // per-(body, t) dated setup is resolved on carving-free tier-set points (ocean; land outside every belt), and the
  // massif code path is JIT-warmed on a disjoint PRIMING set (seeded massif centres, PRIME_JITTER points within 2 km of each, queried twice) whose
  // blocks the same worker exports and the main thread imports first. Measured without the priming set: the first 12
  // massif queries of a process cost ~214 us mean (interpreter/JIT), with 0 solves.
  const p0 = carvingBuildStats.count;
  placeWorlds().forEach(({name}, w) => {for (const r of TIER_SETS.smoke[name]) if (r.kind === 'ocean' || r.kind === 'outside') placeAt(ctxOf(w), r.d);});
  assert.equal(carvingBuildStats.count - p0, 0, 'priming points are carving-free');
  const jr = rng(0x9a1e0000), prime = [];
  for (const c of massifDirections(0x9a1e1000, 2)) {
    const s = 2000 / WORLDS[c.world].body.radiusM;
    prime.push(c);
    for (let k = 0; k < PRIME_JITTER; k++) {
      const q = c.d.map(v => v + (2 * jr() - 1) * s), n = Math.hypot(...q);prime.push({world: c.world, d: q.map(v => v / n)});
    }
  }
  const warm = await warmInWorker([...prime, ...jobs]);
  const primeBlocks = warm.blocks.slice(0, prime.length), rowBlocks = warm.blocks.slice(prime.length), rowResults = warm.results.slice(prime.length);
  const b0 = carvingBuildStats.count;
  let primeImported = 0, imported = 0;
  for (const b of primeBlocks) primeImported += importPlaceBlocks(b);
  for (let pass = 0; pass < 2; pass++) for (const {world, d} of prime) placeAt(ctxOf(world), d);
  for (const b of rowBlocks) imported += importPlaceBlocks(b);
  assert.ok(primeImported + imported <= 32, `${primeImported} + ${imported} imported blocks fit the 32-block LRU`);
  let x = 0;const t1 = performance.now();
  for (const j of jobs) x += placeAt(ctxOf(j.world), j.d).groundHeightM;
  const first = (performance.now() - t1) / jobs.length * 1000, t2 = performance.now();
  for (const j of jobs) x += placeAt(ctxOf(j.world), j.d).groundHeightM;
  const second = (performance.now() - t2) / jobs.length * 1000, solves = carvingBuildStats.count - b0;
  jobs.forEach((j, k) => assert.deepStrictEqual(placeAt(ctxOf(j.world), j.d), rowResults[k], `job ${k} answer`));
  console.log(`ROW W ${JSON.stringify({directions: jobs.length, imported, priming: {queries: prime.length, imported: primeImported}, workerSolves: warm.builds,
    workerMs: Math.round(warm.ms), mainSolves: solves, firstPassMeanUs: +first.toFixed(2), secondPassMeanUs_INFO: +second.toFixed(2)})}`, x !== 0);
  assert.equal(solves, 0, 'no main-thread solve after the import');
  assert.ok(first <= (STRICT ? 10 : 30), `row W first pass ${first} us`);
});

test('cost: row F first touch: placeAt on cold massif blocks, ms per solve <= 250 (strict 200 with OCEAN_PERF_STRICT=1), regression guard', () => {
  // A seeded set disjoint from row W: random massif directions (M1 belt query only), 4 per world. Only calls that solved
  // (builds delta >= 1) count; the metric is total ms / total solves over those calls.
  const dirs = massifDirections(0x0f17f000, 4).map(({world, d}) => ({w: world, d}));
  const calls = [];
  for (const {w, d} of dirs) {
    const b0 = carvingBuildStats.count, t0 = performance.now();
    const {blocks} = traceCarvingBlocks(() => placeAt(ctxOf(w), d));
    const ms = performance.now() - t0, solves = carvingBuildStats.count - b0;
    if (solves >= 1) calls.push({ms, solves, blocks: blocks.length});
  }
  const msPerSolve = calls.reduce((a, c) => a + c.ms, 0) / calls.reduce((a, c) => a + c.solves, 0), per = calls.map(c => c.ms / c.solves);
  console.log(`ROW F ${JSON.stringify({directions: dirs.length, counted: calls.length, msPerSolve: +msPerSolve.toFixed(1),
    INFO: {p50MsPerSolve: +pct(per, .5).toFixed(1), maxMsPerSolve: +Math.max(...per).toFixed(1), maxCallMs: +Math.max(...calls.map(c => c.ms)).toFixed(1),
      solvesPerCall: calls.map(c => c.solves), blocksPerCall: calls.map(c => c.blocks)}})}`);
  assert.ok(calls.length >= 10, `${calls.length} cold calls counted`);
  assert.ok(msPerSolve <= (STRICT ? 200 : 250), `row F ${msPerSolve} ms per solve`);
});

test('cost: placeAt at full level (strict budget 3 us with OCEAN_PERF_STRICT=1)', () => {
  const {sys, body} = WORLDS[0], ctx = {sys, body, t: CATALOGUE_EPOCH_NS};
  const N = 40000, dirs = Array.from({length: N}, (_, i) => fibonacciDirection(i, N));
  let x = 0, us = Infinity;
  for (let round = 0; round < 3; round++) {
    const t0 = performance.now();
    for (let i = 0; i < N; i++) x += placeAt(ctx, dirs[i]).groundHeightM;
    us = Math.min(us, (performance.now() - t0) / N * 1000);
  }
  console.log(`placeAt ${us.toFixed(2)} us (best of 3 x ${N})`, x !== 0);
  assert.ok(us <= (process.env.OCEAN_PERF_STRICT === '1' ? 3 : 30), `placeAt ${us} us`);
});
