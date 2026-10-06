// place-query-1 (relief round 2026-10, P2-OCEAN-QUERY): the documented query
// surface for games built on the platform. Plain derived data, never game rules.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {galaxies, refByAddress, system} from '../src/catalog.ts';
import {CATALOGUE_EPOCH_NS, YEAR_NS} from '../src/world-time.ts';
import {starLifecycle, planetLifecycle} from '../src/stellar-evolution.ts';
import {surfaceAt, surfaceQuery, datedOceanState} from '../src/world-surface.ts';
import {fibonacciDirection} from '../src/ocean-volume.ts';
import {geophysicsFromParams, pressureAtDepthPa, planetGeophysics} from '../src/planet-geophysics.ts';
import {terrainSampler, terrainFloorSampler} from '../src/terrain.ts';
import {placeAt, depthAndPressureAt, PLACE_QUERY_VERSION, PLACE_VERSIONS} from '../src/place-query.ts';

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

test('floorM/windowM come from the R0 floor sampler on the same rock field (window = ground - floor)', () => {
  for (const {sys, body} of WORLDS) {
    const floor = terrainFloorSampler(body);
    for (const d of DIRS.slice(0, 200)) {
      const p = placeAt({sys, body, t: CATALOGUE_EPOCH_NS}, d), f = floor(d);
      assert.ok(Object.is(f.groundHeightM, p.groundHeightM), `${body.name}: floor sampler ground equals placeAt ground`);
      assert.ok(Object.is(p.floorM, f.floorM) && Number.isFinite(p.floorM));
      assert.ok(Object.is(p.windowM, p.groundHeightM - p.floorM));
    }
  }
});

test('version and version block', () => {
  assert.equal(PLACE_QUERY_VERSION, 'place-query-1');
  assert.equal(PLACE_VERSIONS.surface, 'atlas-surface-8-ocean-volume');
  assert.equal(PLACE_VERSIONS.oceanVolume, 'ocean-volume-1');
  assert.equal(PLACE_VERSIONS.geophysics, 'planet-geophysics-1');
  assert.equal(PLACE_VERSIONS.lodLadder, null, 'no ladder module yet: every level answers at full resolution');
});

test('placeAt matches the surface query bit for bit at full level (ground height, ocean, water depth)', () => {
  for (const {sys, body, starLc, planetLc} of WORLDS) {
    for (const t of [CATALOGUE_EPOCH_NS, CATALOGUE_EPOCH_NS + 300_000_000n * YEAR_NS]) {
      const ocean = datedOceanState(body, planetLc, starLc, t);
      const legacy = surfaceQuery(body, [{dateNs: 0n, levelM: ocean.waterLevelM}], {globalOceanAvailable: ocean.globalOceanAvailable});
      let wet = 0;
      for (const d of DIRS) {
        const p = placeAt({sys, body, t}, d);
        const s = surfaceAt(SEED, body.id, body, d, t, 'baseline', {}, starLc).sample;
        const q = legacy(d, t);
        assert.equal(p.exists, true);
        assert.ok(Object.is(p.groundHeightM, s.groundHeightM) && Object.is(p.groundHeightM, q.groundHeightM));
        assert.equal(p.ocean, s.ocean); assert.equal(p.ocean, q.ocean);
        assert.ok(Object.is(p.waterDepthM, s.waterDepthM), `${body.name} water depth`);
        assert.equal(p.seaLevelM, ocean.waterLevelM);
        if (p.ocean) {
          wet++;
          assert.ok(Object.is(p.seabedHeightM, p.groundHeightM), 'the seabed is the solid ground under the water');
          assert.equal(p.solid, true, 'seabed is solid at its true depth');
          assert.ok(p.pressureAtSeabedPa > p.surfacePressurePa);
        } else assert.equal(p.seabedHeightM, null);
      }
      assert.ok(wet > 100, `${body.name} has ocean places (${wet})`);
    }
  }
});

test('level ladder argument is echoed; place-query-1 answers every rung at full resolution', () => {
  const {sys, body} = WORLDS[0], ctx = {sys, body, t: CATALOGUE_EPOCH_NS};
  const full = placeAt(ctx, DIRS[7]);
  for (const level of ['S0', 'S1', 'S2', 'S3', 'S4', 6, 14, 22]) {
    const p = placeAt(ctx, DIRS[7], level);
    assert.equal(p.level, level); assert.equal(p.resolution, 'full');
    assert.deepEqual({...p, level: null}, {...full, level: null});
  }
});

test('no field depends on visit order (forward vs shuffled, interleaved bodies and dates)', async () => {
  const pick = DIRS.filter((_, i) => i % 7 === 0);
  const run = (order) => {
    const out = new Map();
    for (const [w, i, t] of order) out.set(`${w}|${i}|${t}`, JSON.stringify(placeAt({...WORLDS[w], t}, pick[i], 'S4', {measureSlope: i % 3 === 0})));
    return out;
  };
  const dates = [CATALOGUE_EPOCH_NS, CATALOGUE_EPOCH_NS + 500_000_000n * YEAR_NS];
  const forward = [];
  for (let w = 0; w < WORLDS.length; w++) for (const t of dates) for (let i = 0; i < pick.length; i++) forward.push([w, i, t]);
  const shuffled = [...forward];
  let s = 12345;
  for (let i = shuffled.length - 1; i > 0; i--) { s = (s * 1103515245 + 12345) >>> 0; const j = s % (i + 1); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  const a = run(forward), b = run(shuffled);
  for (const [k, v] of a) assert.equal(b.get(k), v, k);
});

test('depthAndPressureAt: Earth analogue 10 m and 10.9 km (Challenger Deep), monotone, every depth to the seabed, clamped below it', () => {
  // Earth analogue: real radius, core fraction 0.32 (planet-geophysics docs), ocean.
  const earth = geophysicsFromParams({kind: 'planet', type: 'Ocean world', radiusM: 6.371e6, temperatureK: 288, water: .7, coreFraction: .32, vigourDraw01: .5});
  assert.ok(Math.abs(earth.surfaceGravityMS2 - 9.81) < .3, `g ${earth.surfaceGravityMS2}`);
  const p10 = pressureAtDepthPa(earth, 10) - earth.surfacePressurePa;
  assert.ok(Math.abs(p10 - 1.005e5) / 1.005e5 <= .01, `10 m adds ${p10} Pa`);
  const deep = pressureAtDepthPa(earth, 10900);
  assert.ok(Math.abs(deep - 1.10e8) / 1.10e8 <= .02, `10.9 km ${deep} Pa (~${(deep / 101325).toFixed(0)} atm)`);

  // A real world: Maithea's deepest sampled place (~13.6 km on the shipped seabed).
  // T6 decision 3: the 4096-direction search for the deepest place reads the level-0 field (the seabed is outside every
  // massif, so the pick is the truth's; placeAt below reads the truth).
  const {sys, body} = WORLDS[0], ctx = {sys, body, t: CATALOGUE_EPOCH_NS}, sample = terrainSampler(body, undefined, undefined, undefined, 0, undefined, false, {lodLevel: 0});
  let deepest = DIRS[0], low = Infinity;
  for (let i = 0; i < 4096; i++) { const d = fibonacciDirection(i, 4096), h = sample(d).groundHeightM; if (h < low) { low = h; deepest = d; } }
  const place = placeAt(ctx, deepest), geo = planetGeophysics(body);
  assert.ok(place.ocean && place.waterDepthM > 8000, `deep place ${place.waterDepthM} m`);
  let prev = -Infinity;
  for (let z = 0; z <= place.waterDepthM; z += place.waterDepthM / 64) {
    const r = depthAndPressureAt(ctx, deepest, z);
    assert.equal(r.clamped, false); assert.ok(r.pressurePa > prev, 'pressure rises with depth'); prev = r.pressurePa;
    assert.ok(Math.abs(r.pressurePa - (geo.surfacePressurePa + 1025 * geo.surfaceGravityMS2 * z)) <= 1e-6 * r.pressurePa);
  }
  const bottom = depthAndPressureAt(ctx, deepest, place.waterDepthM);
  assert.equal(bottom.pressurePa, place.pressureAtSeabedPa, 'seabed pressure agrees with placeAt');
  const below = depthAndPressureAt(ctx, deepest, place.waterDepthM + 5000);
  assert.equal(below.clamped, true); assert.equal(below.depthM, place.waterDepthM); assert.equal(below.seabedDepthM, place.waterDepthM);
  const above = depthAndPressureAt(ctx, deepest, -50);
  assert.equal(above.depthM, 0); assert.equal(above.pressurePa, geo.surfacePressurePa);
  const land = DIRS.find(d => !placeAt(ctx, d).ocean);
  const dry = depthAndPressureAt(ctx, land, 100);
  assert.equal(dry.seabedDepthM, 0); assert.equal(dry.depthM, 0); assert.equal(dry.clamped, true);
});

test('gravity, air, biome and climate are exposed as data with sane values', () => {
  for (const {sys, body} of WORLDS) {
    const geo = planetGeophysics(body);
    for (const d of DIRS.slice(0, 50)) {
      const p = placeAt({sys, body, t: CATALOGUE_EPOCH_NS}, d);
      const R = body.radiusM, want = geo.surfaceGravityMS2 * (R / (R + p.groundHeightM)) ** 2;
      assert.ok(Math.abs(p.gravityMS2 - want) < 1e-9 * want);
      assert.equal(p.hasAir, geo.hasAir); assert.equal(p.airClass, geo.airClass);
      assert.equal(p.tectonicRelief, geo.tectonicRelief);
      assert.equal(typeof p.biome.name, 'string'); assert.equal(p.biome.weights.length, 4);
      if (p.ocean) assert.equal(p.biome.name, 'Ocean', 'classifier sees the same dated sea level');
      for (const k of ['annualMeanTempK', 'warmestMonthK', 'snowFraction', 'treeline01', 'effectiveMoisture'])
        assert.ok(Number.isFinite(p.climate[k]), k);
    }
  }
});

test('absent places are explicit: stars, and planets before they form or after engulfment', () => {
  const {sys, body, planetLc} = WORLDS[0];
  assert.deepEqual([placeAt({sys, body: sys.stars[0], t: CATALOGUE_EPOCH_NS}, DIRS[0]).exists, placeAt({sys, body: sys.stars[0], t: CATALOGUE_EPOCH_NS}, DIRS[0]).stage], [false, 'star']);
  const early = placeAt({sys, body, t: planetLc.formationNs - 1n}, DIRS[0]);
  assert.equal(early.exists, false); assert.equal(early.stage, 'accreting');
  if (planetLc.engulfedNs !== null) assert.equal(placeAt({sys, body, t: planetLc.engulfedNs}, DIRS[0]).stage, 'engulfed');
});

test('docs/place-query-v1.md documents every field with unit and provenance, and the game-layer rule', () => {
  const doc = readFileSync(new URL('../docs/place-query-v1.md', import.meta.url), 'utf8');
  const {sys, body} = WORLDS[0];
  const p = placeAt({sys, body, t: CATALOGUE_EPOCH_NS}, DIRS[3]);
  const keys = [...Object.keys(p), ...Object.keys(p.biome).map(k => 'biome.' + k), ...Object.keys(p.climate).map(k => 'climate.' + k),
    ...Object.keys(p.versions).map(k => 'versions.' + k),
    ...Object.keys(depthAndPressureAt({sys, body, t: CATALOGUE_EPOCH_NS}, DIRS[3], 1))];
  for (const k of keys) assert.ok(doc.includes('`' + k + '`'), `doc lists \`${k}\``);
  assert.match(doc, /## Game layer/);
  for (const word of ['physical', 'heuristic', 'Pa', 'm/s']) assert.ok(doc.includes(word), word);
});

// Timing gate moved to perf/place-query.perf.test.mjs.
