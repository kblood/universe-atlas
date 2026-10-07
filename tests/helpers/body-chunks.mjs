// Truth-scan chunking (O3, docs/fable-test-review-2026-10-07.md; docs/truth-scan-chunks-2026-10-07.md).
// The per-body scans of tests/terrain-relief-hypsometry.test.mjs, tests/terrain-climate-colour.test.mjs,
// tests/acceptance/climate-agreement.test.mjs and tests/terrain-floor-window.test.mjs live here, so the same code runs
// in-process (the level-0 tests of `npm test`) or split across worker threads (the carved-truth copies of test:full,
// pattern of tests/helpers/lod-coarse-frame.mjs). A scan is a pure function of (body, mode) that returns plain numbers
// and asserts exactly what the serial loop asserted for that body; the test combines the per-body results in body order
// (sums, maxima, first failure) exactly as the serial loop did. Bodies are rebuilt in each worker from a named body set
// and checked by id: the union of the chunks' body ids must equal the set's ids, each exactly once (scanBodies).
//
// Every scan also reports a sha256 digest (first 16 hex digits) of the per-direction values it reads, so a run can be
// compared value-for-value with another (the before/after identity proof in the doc above).
import {isMainThread, parentPort, workerData, Worker} from 'node:worker_threads';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {galaxies, hash64, noise, sector, system} from '../../src/catalog.ts';
import {
  baseTerrainSampler, terrainSampler, terrainFloorSampler, terrainWindowMaxM, terrainUnitWindowMaxM, tectonicReliefOf,
  bodyHeightBoundM, reliefTextureRange, waterWorldLandColour,
} from '../../src/terrain.ts';
import {biomeClassifier} from '../../src/surface-biomes.ts';
import {climateForcingFor, createClimateSample, surfaceClimate} from '../../src/surface-climate.ts';
import {fib, maithea, goldenTerrainBodies, waterWorlds} from '../terrain-climate-fixtures.mjs';
import {statisticSampler} from './statistic-level.mjs';

/** The two samplers every pointwise scan runs on: level 0 (default `npm test`) and the carved truth (test:full). */
const SAMPLER = {level0: body => statisticSampler(body), truth: body => terrainSampler(body)};
const FLOOR = {level0: body => statisticSampler(body, {exposeFloor: true}), truth: body => terrainFloorSampler(body)};

/** sha256 over the Float64 values of every add() call (booleans as 0/1), first 16 hex digits. */
export function valueDigest() {
  const h = createHash('sha256');
  return {add: (...v) => h.update(new Uint8Array(Float64Array.from(v).buffer)), hex: () => h.digest('hex').slice(0, 16)};
}

// ---- body sets (moved unchanged from the four test files) ----

/** Golden-generator catalogue bodies (all kinds and types), deterministic order. */
export function goldenAll() {
  const refs = [];
  for (const g of galaxies('LETHRA-GOLDEN-001').slice(0, 3))
    for (const c of [[266, 0, 0], [0, 0, 0], [-2, -1, -2], [12, -4, 7]]) refs.push(...sector(g, c).refs);
  return refs.slice(0, 220).map(system).flatMap(s => [...s.planets, ...s.moons]);
}
const identityBodies = () => [maithea(), ...goldenTerrainBodies().slice(0, 5)];
export const BODY_SETS = Object.freeze({
  /** terrain-relief-hypsometry: Maithea + 5 golden terrain bodies. */
  identity: identityBodies,
  /** terrain-relief-hypsometry window invariant: the identity bodies and the other three water worlds. */
  hypsometryWindow: () => [...identityBodies(), ...waterWorlds().slice(1)],
  /** terrain-relief-hypsometry height bound: 4 water worlds + 10 per type (Volcanic, Rocky, Oceanic, Ice, Gas giant,
   * Airless moon), first 60. */
  heightBound: () => {
    const all = goldenAll(), pick = [];
    for (const type of [...new Set(all.map(b => b.type))]) pick.push(...all.filter(b => b.type === type).slice(0, 10));
    return [...waterWorlds(), ...pick.filter(b => !waterWorlds().some(w => w.id === b.id))].slice(0, 60);
  },
  /** Maithea, Selawyn, Raiva, Lethuris. */
  waterWorlds: () => waterWorlds(),
  /** terrain-floor-window: the four water worlds, one dry Rocky world, and one small Airless moon (R < 2000 km, where
   * the hill layer is not radius-scaled). */
  floorWindow: () => {
    const all = goldenAll();
    const dry = all.find(b => b.kind === 'planet' && b.type === 'Rocky world' && !(b.water > 0));
    const moon = all.find(b => b.type === 'Airless moon' && b.radiusM < 1e6);
    return [...waterWorlds(), dry, moon];
  },
  /** terrain-floor-window floorIsBase: the four water worlds and 5 golden terrain bodies. */
  floorBase: () => [...waterWorlds(), ...goldenTerrainBodies().slice(0, 5)],
});

// ---- per-body scans (each the body of the serial loop it replaces, asserts verbatim) ----

/** Independent copy of the water-land colour grain (seed derivation and constants written out on purpose, so a drifted
 * src helper is caught rather than reused; moved from tests/terrain-climate-colour.test.mjs and
 * tests/acceptance/climate-agreement.test.mjs, which carried byte-identical copies). terrain-1.8.1-grain (mountains
 * step G, owner decision (b)): the 800 m local grain of water-world LAND colour is .952 + n x .096 (was .88 + n x .24,
 * which every other palette still uses); the 115 grain is unchanged. */
function grainOf(body) {
  const code = Number(hash64(body.seed + '/macro-v1') & 0xffffffffn);
  const n = (d, f, seed) => noise(d[0] * f + 13, d[1] * f + 37, d[2] * f + 19, code + seed);
  return d => [0.91 + n(d, 115, 35) * 0.18, .952 + n(d, body.radiusM / 800, 74) * .096];
}
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const COLOUR_N = 20000, SCAN_N = 20000;

export const SCANS = Object.freeze({
  /** hypsometry coastline: relief ocean flag vs the unchanged base field, 20000 directions. */
  coastline(body, mode) {
    const N = SCAN_N, base = baseTerrainSampler(body), relief = SAMPLER[mode](body), g = valueDigest();
    let flips = 0, ocean = 0;
    for (let i = 0; i < N; i++) {const d = fib(i, N), o = relief(d).ocean, bo = base(d).ocean;g.add(o, bo);flips += o !== bo;ocean += o;}
    return {flips, ocean, digest: g.hex()};
  },
  /** hypsometry window invariant 0 <= h - floorM <= terrainWindowMaxM(body), 20000 directions. */
  hypsometryWindow(body, mode) {
    const N = SCAN_N, s = FLOOR[mode](body), bound = terrainWindowMaxM(body);
    assert.ok(Math.abs(bound - tectonicReliefOf(body) * terrainUnitWindowMaxM(body)) < 1e-9);
    let bad = 0, max = 0;const g = valueDigest();
    for (let i = 0; i < N; i++) {const x = s(fib(i, N)), w = x.groundHeightM - x.floorM;g.add(x.groundHeightM, x.floorM, x.windowM);if (x.windowM !== w || !(w >= 0 && w <= bound)) bad++;if (w > max) max = w;}
    assert.equal(bad, 0, `${body.name}: window max ${max} of ${bound}`);
    return {bad, max, bound, digest: g.hex()};
  },
  /** hypsometry bodyHeightBoundM containment, 20000 directions; the orbit texture range is that bound. */
  heightBound(body, mode) {
    const N = SCAN_N, ts = SAMPLER[mode](body), {minM, maxM} = bodyHeightBoundM(body), range = reliefTextureRange(body);
    assert.ok(minM <= maxM);
    if (maxM > minM) assert.deepEqual(range, {minM, maxM});
    let outside = 0, hMin = Infinity, hMax = -Infinity;const g = valueDigest();
    for (let i = 0; i < N; i++) {const h = ts(fib(i, N)).groundHeightM;g.add(h);hMin = Math.min(hMin, h);hMax = Math.max(hMax, h);if (!(h >= minM && h <= maxM)) outside++;}
    return {minM, maxM, outside, hMin, hMax, digest: g.hex()};
  },
  /** climate-colour: land colour === waterWorldLandColour(climate at post-landform height) x grain, 60000 directions. */
  colour(body, mode) {
    const N = COLOUR_N, sample = SAMPLER[mode](body), climate = surfaceClimate(climateForcingFor(body)), o = createClimateSample(), grain = grainOf(body);
    let land = 0, snowy = 0, forested = 0;const dg = valueDigest();
    for (let i = 0; i < N * 3; i++) {
      const d = fib(i, N * 3), s = sample(d);
      if (s.ocean) continue;
      land++;
      // includeCraters defaults to false, so groundHeightM IS the post-landform,
      // pre-crater height the colour is evaluated at.
      climate(d, s.groundHeightM, o);
      const [g, l] = grain(d);
      const expected = waterWorldLandColour(o, s.groundHeightM).map(v => clamp(v * g * l, 0, 255));
      dg.add(i, s.groundHeightM, s.color[0], s.color[1], s.color[2]);
      if (s.color[0] !== expected[0] || s.color[1] !== expected[1] || s.color[2] !== expected[2])
        assert.fail(`${body.name} ${d}: ${s.color} !== ${expected}`);
      snowy += o.snowFraction > .6;forested += o.forestSuitability01 > .5;
    }
    assert.ok(land >= N, `${body.name} land samples ${land} over the whole sphere`);
    assert.ok(snowy > 0 || forested > 0, `${body.name} exercises the climate colour`);
    return {land, snowy, forested, digest: dg.hex()};
  },
  /** climate-agreement: colour, classifier snow/moisture/temperature/label/forest agree, 60000 directions. The
   * non-vacuity log and assert stay in the test (main thread, body order). */
  agreement(body, mode) {
    const N = COLOUR_N;
    assert.ok(body.water > 0 && body.type !== 'Ice world', `${body.name} is a liquid-water world`);
    const sample = SAMPLER[mode](body), classify = biomeClassifier(body);
    const climate = surfaceClimate(climateForcingFor(body)), o = createClimateSample(), grain = grainOf(body);
    let land = 0, snowLabel = 0, forest = 0, partialSnow = 0;const dg = valueDigest();
    // The WHOLE sphere (uniform Fibonacci set), never a prefix: a prefix of the
    // Fibonacci order is one polar cap. M is sized so every world has >= N land.
    const M = 3 * N;
    for (let i = 0; i < M; i++) {
      const d = fib(i, M), s = sample(d);
      if (s.ocean) continue;
      land++;
      const h = s.groundHeightM; // includeCraters=false: post-landform, pre-crater
      climate(d, h, o);
      const [g, l] = grain(d);
      const expected = waterWorldLandColour(o, h).map(v => clamp(v * g * l, 0, 255));
      if (s.color[0] !== expected[0] || s.color[1] !== expected[1] || s.color[2] !== expected[2])
        assert.fail(`${body.name} colour ${d}: ${s.color} !== ${expected}`);
      const b = classify(d, h);
      if (b.weights[3] !== o.snowFraction || b.snowFraction !== o.snowFraction)
        assert.fail(`${body.name} snow ${d}: classifier ${b.weights[3]}/${b.snowFraction} !== climate ${o.snowFraction}`);
      if (b.effectiveMoisture !== o.effectiveMoisture)
        assert.fail(`${body.name} moisture ${d}: classifier ${b.effectiveMoisture} !== climate ${o.effectiveMoisture}`);
      if (b.annualMeanTempK !== o.annualMeanTempK || b.climateCode !== o.climateCode)
        assert.fail(`${body.name} temperature/code ${d}: classifier disagrees with climate`);
      if ((b.name === 'Alpine / polar snow') !== (o.snowFraction > .6 && !b.ocean))
        assert.fail(`${body.name} label ${d}: '${b.name}' vs snowFraction ${o.snowFraction}`);
      if (b.forestPotential && !(o.forestSuitability01 > 0 && b.forestSuitability01 === o.forestSuitability01))
        assert.fail(`${body.name} forest ${d}: forestPotential without the colour's forest suitability`);
      dg.add(i, h, s.color[0], s.color[1], s.color[2], b.weights[3], o.snowFraction, b.effectiveMoisture, o.forestSuitability01);
      snowLabel += b.name === 'Alpine / polar snow';forest += b.forestPotential;partialSnow += o.snowFraction > 0 && o.snowFraction < 1;
    }
    assert.ok(land >= N, `${body.name}: ${land} land directions, need ${N}`);
    return {land, snowLabel, forest, partialSnow, digest: dg.hex()};
  },
  /** floor-window windowScan: violations and the report row of one body, 20000 directions. */
  floorWindow(body, mode) {
    const N = SCAN_N, s = FLOOR[mode](body), bound = terrainWindowMaxM(body);
    let max = 0, min = Infinity, bad = 0;const g = valueDigest();
    for (let i = 0; i < N; i++) {
      const x = s(fib(i, N));
      const w = x.groundHeightM - x.floorM;g.add(x.groundHeightM, x.floorM, x.windowM);
      // windowM is that same difference, carried on the sample.
      if (x.windowM !== w) bad++;
      if (!(w >= 0 && w <= bound)) bad++;
      if (w > max) max = w;if (w < min) min = w;
    }
    return {bad, min, max, bound, type: body.type, radiusM: Math.round(body.radiusM), digest: g.hex()};
  },
  /** floor-window continentalSign: continentalM >= 0 exactly where the sampler reports land, 20000 directions. */
  continental(body, mode) {
    const N = SCAN_N, s = FLOOR[mode](body);let mismatch = 0, land = 0;const g = valueDigest();
    for (let i = 0; i < N; i++) {
      const x = s(fib(i, N));g.add(x.continentalM, x.ocean);
      if ((x.continentalM >= 0) !== !x.ocean) mismatch++;
      if (!x.ocean) land++;
    }
    assert.equal(mismatch, 0, body.name);
    assert.ok(land > 0.2 * N && land < 0.9 * N, body.name + ' land ' + land);
    return {mismatch, land, digest: g.hex()};
  },
  /** floor-window floorIsBase: floor never exceeds ground; water-world seabed floor = ground; |floor| <= 18 km. */
  floorBase(body, mode) {
    const s = FLOOR[mode](body), n = 4096;const g = valueDigest();
    for (let i = 0; i < n; i++) {
      const x = s(fib(i, n));g.add(x.floorM, x.groundHeightM, x.ocean);
      assert.ok(x.floorM <= x.groundHeightM);
      // Below sea level on a water world there is no hill/landform layer.
      if (body.water > 0 && x.ocean) assert.equal(x.floorM, x.groundHeightM);
      assert.ok(Math.abs(x.floorM) <= 18000);
    }
    return {n, digest: g.hex()};
  },
});

// ---- chunked execution ----

const cloneable = v => {try {return structuredClone(v);} catch {return String(v);}};
/** An error as plain data for postMessage (AssertionError fields kept). */
function errorData(e) {
  return {name: e?.name, message: String(e?.message ?? e), stack: e?.stack, code: e?.code, operator: e?.operator,
    actual: cloneable(e?.actual), expected: cloneable(e?.expected), assertion: e instanceof assert.AssertionError};
}
/** The error a worker reported, rebuilt on the main thread (same message; the worker stack is kept). */
function rebuild(e) {
  if (!e || e instanceof Error) return e;
  const err = e.assertion ? new assert.AssertionError({message: e.message, actual: e.actual, expected: e.expected, operator: e.operator}) : new Error(e.message);
  if (!e.assertion && e.name) err.name = e.name;
  if (e.code) err.code = e.code;
  if (e.stack) err.stack = `${e.stack}\n    (in a body-chunks worker thread)`;
  return err;
}

function checkScan(scan, mode) {
  if (!SCANS[scan]) throw new Error(`unknown scan ${scan}`);
  if (!(mode in SAMPLER)) throw new Error(`unknown mode ${mode}`);
}
/** Runs `scan` on body `index` of `bodies`; an error is caught per body (as data when `serialize`, for postMessage). */
function runOne(scan, mode, bodies, index, serialize) {
  const body = bodies[index], t0 = performance.now(), rec = {index, id: body.id};
  try {rec.value = SCANS[scan](body, mode);} catch (e) {rec.error = serialize ? errorData(e) : e;}
  rec.ms = Math.round(performance.now() - t0);
  return rec;
}

/**
 * Runs scan `scan` over body set `set` with sampler `mode`. workers = 0: in-process, in body order (the level-0 path).
 * workers > 0: a pool of min(workers, n) worker threads PULLING body indices in body order from one queue (the truth
 * cost per body is very uneven: on the height-bound set 14 of the 60 bodies take 50-200 s, the rest < 0.1 s, so a
 * fixed deal leaves one worker with most of the work). Either way the result has one record per body in body order
 * ({index, id, ms, value} or {index, id, ms, error}), and the cover is asserted: the union of the chunks' (per-worker)
 * body ids is exactly the set's ids, each exactly once, and each record's id is the id the main thread expects at that
 * index (the worker rebuilt the same body). `chunks` = the indices each worker ran.
 */
export async function scanBodies(scan, set, mode, {workers = 0} = {}) {
  checkScan(scan, mode);
  const bodies = BODY_SETS[set](), ids = bodies.map(b => b.id);
  assert.equal(new Set(ids).size, ids.length, `${set}: body ids are unique`);
  let records, chunks = null;
  if (!workers) records = ids.map((_, i) => runOne(scan, mode, bodies, i, false));
  else {
    const W = Math.min(workers, ids.length);let next = 0;
    chunks = Array.from({length: W}, () => []);
    const parts = await Promise.all(chunks.map((mine, k) => new Promise((resolve, reject) => {
      const got = [], w = new Worker(new URL(import.meta.url), {workerData: {bodyChunk: {scan, set, mode}}});
      const feed = () => {if (next < ids.length) {mine.push(next);w.postMessage({index: next++});} else w.postMessage({done: true});};
      w.on('message', m => {if (m.ready) return feed();got.push(m.record);feed();});
      w.once('error', reject);
      w.once('exit', code => code === 0 && got.length === mine.length ? resolve(got) : reject(new Error(`${scan}:${mode} worker ${k} exit ${code} after ${got.length}/${mine.length} bodies`)));
    })));
    parts.forEach((part, k) => assert.deepEqual(part.map(r => r.index), chunks[k], `${scan}:${mode} worker ${k} returned exactly the bodies it was given`));
    const union = chunks.flat();
    assert.deepEqual([...union].sort((a, b) => a - b), ids.map((_, i) => i), `${scan}:${mode}: the chunks cover every body index exactly once`);
    records = parts.flat().sort((a, b) => a.index - b.index);
  }
  assert.deepEqual(records.map(r => r.index), ids.map((_, i) => i), `${scan}:${mode}: every body index exactly once`);
  assert.deepEqual(records.map(r => r.id), ids, `${scan}:${mode}: the chunks' body ids are exactly the ${ids.length} ids of ${set}, each once`);
  return {bodies, records, chunks};
}

/** The per-body values in body order; throws the first body's error at its position (as the serial loop did). */
export function* inOrder({bodies, records}) {
  for (const r of records) {
    if (r.error) throw rebuild(r.error);
    yield {body: bodies[r.index], value: r.value};
  }
}

/** One diagnostic line per scan: per-body values (digest included) and per-body ms, comparable across runs. */
export function logScan(scan, mode, {records, chunks}) {
  const rows = records.map(r => ({id: r.id, ...(r.value ?? {error: String(r.error?.message ?? r.error)}), ms: r.ms}));
  const pool = chunks ? ` workers ${chunks.length} chunks ${JSON.stringify(chunks)} worker-ms [${chunks.map(c => c.reduce((t, i) => t + records[i].ms, 0))}]` : '';
  console.log(`# scan ${scan}:${mode}${pool} ${JSON.stringify(rows)}`);
}

// Worker: rebuild the body set once, then run one body per {index} message until {done}.
if (!isMainThread && workerData?.bodyChunk) {
  const {scan, set, mode} = workerData.bodyChunk;
  checkScan(scan, mode);
  const bodies = BODY_SETS[set]();
  parentPort.on('message', m => {
    if (m.done) {parentPort.close();return;}
    parentPort.postMessage({record: runOne(scan, mode, bodies, m.index, true)});
  });
  parentPort.postMessage({ready: true});
}
