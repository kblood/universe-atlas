// place-query-1 (relief round 2026-10, P2-OCEAN-QUERY) and place-query-2 (backlog task 16, docs/place-query-v2.md):
// the documented query surface for games built on the platform. Plain derived data, never game rules.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {galaxies, refByAddress, system} from '../src/catalog.ts';
import {CATALOGUE_EPOCH_NS, YEAR_NS} from '../src/world-time.ts';
import {starLifecycle, planetLifecycle} from '../src/stellar-evolution.ts';
import {surfaceAt, surfaceQuery, datedOceanState} from '../src/world-surface.ts';
import {fibonacciDirection} from '../src/ocean-volume.ts';
import {geophysicsFromParams, pressureAtDepthPa, planetGeophysics} from '../src/planet-geophysics.ts';
import {terrainSampler, terrainFloorSampler} from '../src/terrain.ts';
import {
  placeAt, depthAndPressureAt, importPlaceBlocks, coastAt, airPressureAtHeightPa, airScaleHeightM,
  PLACE_QUERY_VERSION, PLACE_VERSIONS,
} from '../src/place-query.ts';
import {LOD_LADDER_VERSION, ladderFor, carvingFromLevel, rockDetailFromLevel, riserSharpFromLevel, contactLevelFor} from '../src/lod-ladder.ts';
import {detExp} from '../src/det-math.ts';
import {carvingBuildStats} from '../src/mountain-carving.ts';
import {frozenMassifJobs, placeWorlds, warmInWorker} from './helpers/place-warm-worker.mjs';

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
  assert.equal(PLACE_QUERY_VERSION, 'place-query-2');
  assert.equal(PLACE_VERSIONS.placeQuery, PLACE_QUERY_VERSION);
  assert.equal(PLACE_VERSIONS.surface, 'atlas-surface-8-ocean-volume');
  assert.equal(PLACE_VERSIONS.oceanVolume, 'ocean-volume-1');
  assert.equal(PLACE_VERSIONS.geophysics, 'planet-geophysics-1');
  // place-query-2: the imported ladder version, never a pinned string (the ladder contract moves it on its own).
  assert.equal(PLACE_VERSIONS.lodLadder, LOD_LADDER_VERSION);
  assert.equal(typeof LOD_LADDER_VERSION, 'string');
  assert.ok(Object.isFrozen(PLACE_VERSIONS));
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

test('docs/place-query-v1.md + v2.md document every field with unit and provenance, and the game-layer rule', () => {
  const v1 = readFileSync(new URL('../docs/place-query-v1.md', import.meta.url), 'utf8');
  const v2 = readFileSync(new URL('../docs/place-query-v2.md', import.meta.url), 'utf8');
  const {sys, body} = WORLDS[0], ctx = {sys, body, t: CATALOGUE_EPOCH_NS};
  const p = placeAt(ctx, DIRS[3], 6, {rung: true});
  const keys = [...Object.keys(p), ...Object.keys(p.biome).map(k => 'biome.' + k), ...Object.keys(p.climate).map(k => 'climate.' + k),
    ...Object.keys(p.versions).map(k => 'versions.' + k), ...Object.keys(p.rung).map(k => 'rung.' + k),
    ...Object.keys(depthAndPressureAt(ctx, DIRS[3], 1)), ...Object.keys(coastAt(ctx, DIRS[3]))];
  for (const k of keys) assert.ok((v1 + v2).includes('`' + k + '`'), `doc lists \`${k}\``);
  // Every place-query-2 addition is documented in the v2 file, with the stated formula.
  for (const k of ['airPressurePa', 'airScaleHeightM', 'rung', 'rung.lodLevel', 'rung.ladder', 'rung.groundHeightM', 'rung.ocean',
    'heightAboveSeaM', 'seaSign', 'coastAt', 'airPressureAtHeightPa'])
    assert.ok(v2.includes('`' + k + '`') || v2.includes(k + '('), `v2 doc lists ${k}`);
  assert.match(v2, /H\s+= k_B \* T \/ \(m_N2 \* g0\)/); assert.match(v2, /P\(h\) = P0 \* exp\(-h \/ H\)/);
  assert.ok(v1.includes('place-query-v2.md'), 'v1 doc points to v2');
  assert.match(v1, /## Game layer/);
  for (const word of ['physical', 'heuristic', 'Pa', 'm/s']) assert.ok(v1.includes(word), word);
});

test('HARD: warm-up transfer: blocks a worker exported make placeAt a 0-build hit with the identical answer (8 frozen massif directions)', async () => {
  // docs/placeat-first-touch-decision-2026-10-07.md 2.D.2. Frozen tier-set massif sites: per world the first axis and the
  // flank entry. The worker solves (cold); the main thread imports each job's blocks just before its query.
  const sets = JSON.parse(readFileSync(new URL('./tier-sets.json', import.meta.url), 'utf8'));
  const jobs = frozenMassifJobs(sets).filter((j, i, a) => j.kind === 'flank' || a.findIndex(x => x.world === j.world && x.kind === 'axis') === i);
  assert.equal(jobs.length, 8);
  assert.deepEqual(placeWorlds().map(w => w.body.id), WORLDS.map(w => w.body.id), "helper worlds are this file's WORLDS");
  const warm = await warmInWorker(jobs);
  assert.ok(warm.builds >= 1, `the worker solved the massif blocks (${warm.builds})`);
  const b0 = carvingBuildStats.count;
  let imported = 0;
  jobs.forEach((j, k) => {
    assert.ok(warm.blocks[k].length >= 1, `job ${k} touches a carving block`);
    imported += importPlaceBlocks(warm.blocks[k]);
    const {sys, body} = WORLDS[j.world];
    assert.deepStrictEqual(placeAt({sys, body, t: CATALOGUE_EPOCH_NS}, j.d), warm.results[k], `job ${k} (${j.kind}) answer`);
  });
  assert.equal(carvingBuildStats.count - b0, 0, 'no main-thread solve after the import');
  console.log('WARM ' + JSON.stringify({jobs: jobs.length, workerBuilds: warm.builds, workerMs: Math.round(warm.ms), imported, blocks: warm.blocks.map(b => b.length)}));
});

// Timing gate moved to perf/place-query.perf.test.mjs.

// ---------------------------------------------------------------------------
// place-query-2 (backlog task 16, docs/place-query-v2.md)
// ---------------------------------------------------------------------------

/** The two dated seas of the coast test (500 and 1000 Myr after the epoch): below the catalogue-epoch level on three
 * harness worlds (Maithea -1225 / -4725 m, Selawyn -150 / -600 m, Raiva -525 / -2100 m; Lethuris keeps 0 m), so the
 * sign is taken against a DATED level. */
const COAST_DATES = [CATALOGUE_EPOCH_NS + 500_000_000n * YEAR_NS, CATALOGUE_EPOCH_NS + 1_000_000_000n * YEAR_NS];

test('coastAt agrees with the sign of the dated sea level at 1000 points x 4 worlds x 2 dates, and with placeAt', () => {
  const dirs = Array.from({length: 1000}, (_, i) => fibonacciDirection(i, 1000));
  let below = 0;
  for (const {sys, body, starLc, planetLc} of WORLDS) {
    for (const t of COAST_DATES) {
      const ctx = {sys, body, t}, dated = datedOceanState(body, planetLc, starLc, t);
      assert.equal(dated.globalOceanAvailable, true, `${body.name}: a global ocean exists at ${t}`);
      let sea = 0, land = 0;
      dirs.forEach((d, i) => {
        const c = coastAt(ctx, d);
        assert.equal(c.exists, true);
        assert.equal(c.seaLevelM, dated.waterLevelM, 'the dated (snapped) sea level');
        assert.ok(Object.is(c.heightAboveSeaM, c.groundHeightM - c.seaLevelM));
        assert.equal(c.ocean, c.heightAboveSeaM < 0, `${body.name} sign of height above the dated sea`);
        assert.equal(c.seaSign, c.ocean ? -1 : 1);
        assert.equal(c.version, PLACE_QUERY_VERSION);
        c.ocean ? sea++ : land++;
        // placeAt agreement on every 4th point and on every point within 200 m of the dated shoreline.
        if (i % 4 && Math.abs(c.heightAboveSeaM) >= 200) return;
        const p = placeAt(ctx, d);
        assert.equal(c.ocean, p.ocean, 'coastAt agrees with placeAt');
        assert.ok(Object.is(c.groundHeightM, p.groundHeightM) && c.seaLevelM === p.seaLevelM);
        assert.deepEqual(c.versions, p.versions);
      });
      assert.ok(sea >= 20 && land >= 20, `${body.name} @${t}: both sides present (sea ${sea}, land ${land})`);
      if (dated.waterLevelM < 0) below++;
    }
  }
  // Lethuris (dim host star) keeps its full ocean through both dates (dated level 0 m); the other three worlds are
  // tested against a dated level below the datum, so the sign is not just the sign of the ground height.
  assert.ok(below >= (WORLDS.length - 1) * COAST_DATES.length, `cases against a sea level below the datum: ${below}`);
});

test('rung: Object.is-equal to the renderer tile sampler (terrainSampler with lodLevel) at the same direction', async () => {
  const sets = JSON.parse(readFileSync(new URL('./tier-sets.json', import.meta.url), 'utf8'));
  const massif = frozenMassifJobs(sets).filter((j, i, a) => a.findIndex(x => x.world === j.world && x.kind === j.kind) === i);
  let differs = 0, compared = 0;
  for (const [w, {sys, body, starLc, planetLc}] of WORLDS.entries()) {
    const t = CATALOGUE_EPOCH_NS, ctx = {sys, body, t}, R = body.radiusM;
    const water = datedOceanState(body, planetLc, starLc, t).renderWaterLevelM;
    const dirs = [...massif.filter(j => j.world === w).map(j => j.d), ...DIRS.filter((_, i) => i % 75 === 0)];
    const levels = [...new Set([0, 2, carvingFromLevel(R) - 1, carvingFromLevel(R), 9, 12, rockDetailFromLevel(R) - 1,
      rockDetailFromLevel(R), riserSharpFromLevel(R) - 1, riserSharpFromLevel(R), contactLevelFor(R), 22])].filter(l => l >= 0);
    // lod-ladder-4: from the rock level up to riserSharpFromLevel - 1 the rock term widens the riser (a declared
    // reduction); from the sharp level on the tile sampler is the truth bit for bit (lod-ladder contract, M5 riser amendment).
    const truthFrom = Math.max(rockDetailFromLevel(R), riserSharpFromLevel(R));
    for (const level of levels) {
      // Built at runtime with the renderer's arguments (planet-tiles.ts buildTile): numbers are never pinned here.
      const renderer = terrainSampler(body, undefined, undefined, undefined, water, undefined, false, {lodLevel: level});
      for (const d of dirs) {
        const p = placeAt(ctx, d, level, {rung: true}), s = renderer(d);
        assert.equal(p.rung.lodLevel, level);
        assert.ok(Object.is(p.rung.groundHeightM, s.groundHeightM), `${body.name} L${level}: rung height is the renderer sampler's`);
        assert.equal(p.rung.ocean, s.ocean, `${body.name} L${level}: rung ocean flag`);
        compared++;
        if (!Object.is(p.rung.groundHeightM, p.groundHeightM)) differs++;
        // The truth fields do not depend on the rung option.
        const plain = placeAt(ctx, d, level);
        assert.equal('rung' in plain, false, 'no rung key without the option');
        assert.deepStrictEqual({...p, rung: undefined}, {...plain, rung: undefined});
        if (level >= truthFrom) assert.ok(Object.is(p.rung.groundHeightM, p.groundHeightM), `${body.name} L${level} equals the truth`);
      }
    }
    // Ladder ids resolve to the finest tile level of the rung (ladderFor), and echo that rung.
    for (const rung of ladderFor(R)) {
      const p = placeAt(ctx, dirs[0], rung.id, {rung: true});
      assert.equal(p.rung.lodLevel, rung.levels[1]); assert.equal(p.rung.ladder, rung.id); assert.equal(p.level, rung.id);
      const s = terrainSampler(body, undefined, undefined, undefined, water, undefined, false, {lodLevel: rung.levels[1]})(dirs[0]);
      assert.ok(Object.is(p.rung.groundHeightM, s.groundHeightM));
    }
  }
  assert.ok(differs > 0, `some coarse rung answers differ from the truth on the massif sites (${differs}/${compared}): the check is not vacuous`);
});

test('rung on a dated sea: the ocean flag uses the dated render water level', () => {
  const {sys, body, starLc, planetLc} = WORLDS[0], t = COAST_DATES[1], ctx = {sys, body, t};
  const water = datedOceanState(body, planetLc, starLc, t).renderWaterLevelM;
  assert.ok(water < 0);
  let agree = 0;
  for (const d of DIRS.filter((_, i) => i % 5 === 0)) {
    const p = placeAt(ctx, d, 22, {rung: true});
    assert.equal(p.rung.ocean, p.rung.groundHeightM < water);
    if (p.rung.ocean === p.ocean) agree++;
  }
  assert.ok(agree > 0);
});

test('air pressure: hypsometric formula, Earth analogue, monotone in height, det-math exp, placeAt agreement', () => {
  const earth = geophysicsFromParams({kind: 'planet', type: 'Ocean world', radiusM: 6.371e6, temperatureK: 278, water: .7, coreFraction: .32, vigourDraw01: .5});
  const H = airScaleHeightM(earth, 278);
  assert.ok(Object.is(H, 1.380649e-23 * 278 / (4.65e-26 * earth.surfaceGravityMS2)), 'H = k_B T / (m_N2 g0)');
  assert.ok(H > 8000 && H < 8900, `Earth-analogue scale height ${H} m`);
  assert.ok(Object.is(airPressureAtHeightPa(earth, 278, 0), earth.surfacePressurePa), 'P(0) = P0 exactly');
  for (const h of [-11000, -400, 1, 1500, 5500, 8848, 30000, 80000])
    assert.ok(Object.is(airPressureAtHeightPa(earth, 278, h), earth.surfacePressurePa * detExp(-h / H)), `P(${h}) = P0 exp(-h/H)`);
  // Isothermal heuristic vs measured air (5.5 km: 0.50 P0; Everest 8.85 km: 0.33 P0), within 10%.
  const ratio = h => airPressureAtHeightPa(earth, 278, h) / earth.surfacePressurePa;
  assert.ok(Math.abs(ratio(5500) / .50 - 1) < .10, `5.5 km ratio ${ratio(5500)}`);
  assert.ok(Math.abs(ratio(8848) / .333 - 1) < .10, `8.85 km ratio ${ratio(8848)}`);
  // det-math exp tracks Math.exp closely (the value itself is engine-independent).
  for (const x of [-12, -3.3, -1, -.25, 0, .5, 1.3]) assert.ok(Math.abs(detExp(x) / Math.exp(x) - 1) < 1e-12, `detExp(${x})`);
  let prev = Infinity;
  for (let h = -12000; h <= 60000; h += 250) {
    const p = airPressureAtHeightPa(earth, 278, h);
    assert.ok(p < prev && p > 0, `strictly decreasing at ${h} m`); prev = p;
  }
  assert.ok(airPressureAtHeightPa(earth, 278, -500) > earth.surfacePressurePa, 'a dry basin below the datum is above P0');
  // placeAt: ground height on land, the dated sea surface on the ocean.
  for (const {sys, body} of WORLDS) for (const t of [CATALOGUE_EPOCH_NS, COAST_DATES[1]]) {
    const geo = planetGeophysics(body);
    let sea = 0;
    for (const d of DIRS.filter((_, i) => i % 6 === 0)) {
      const p = placeAt({sys, body, t}, d);
      const h = p.ocean ? p.seaLevelM : p.groundHeightM;
      assert.ok(Object.is(p.airPressurePa, airPressureAtHeightPa(geo, body.temperatureK, h)));
      assert.ok(Object.is(p.airScaleHeightM, airScaleHeightM(geo, body.temperatureK)));
      if (p.ocean) { sea++; if (p.seaLevelM === 0) assert.ok(Object.is(p.airPressurePa, p.surfacePressurePa)); else assert.ok(p.airPressurePa > p.surfacePressurePa); }
      else if (p.groundHeightM > 0) assert.ok(p.airPressurePa < p.surfacePressurePa, 'land above the datum has less air pressure');
    }
    assert.ok(sea > 0);
  }
});

test('negative cases: airless and dry bodies, absent places, invalid rung levels', () => {
  const {sys, body, planetLc} = WORLDS[0], t = CATALOGUE_EPOCH_NS;
  // A dry, airless body (Veortar, volcanic, no water, airClass none): no pressure, no scale height, no sea.
  const dry = sys.planets.find(b => !b.water && planetGeophysics(b).airClass === 'none' && b.type !== 'Gas giant');
  assert.ok(dry, 'the harness system has a dry airless rocky planet');
  const pd = placeAt({sys, body: dry, t}, DIRS[1]), cd = coastAt({sys, body: dry, t}, DIRS[1]);
  assert.equal(pd.exists, true); assert.equal(pd.airPressurePa, 0); assert.equal(pd.airScaleHeightM, null);
  assert.equal(cd.seaLevelM, null); assert.equal(cd.heightAboveSeaM, null); assert.equal(cd.seaSign, 1); assert.equal(cd.ocean, false);
  assert.ok(Object.is(cd.groundHeightM, pd.groundHeightM));
  const vacuum = geophysicsFromParams({kind: 'planet', type: 'Rocky world', radiusM: 2e6, temperatureK: 400, water: 0, coreFraction: .3, vigourDraw01: .5});
  assert.equal(vacuum.surfacePressurePa, 0);
  for (const h of [-1000, 0, 1000]) assert.equal(airPressureAtHeightPa(vacuum, 400, h), 0);
  const cold = geophysicsFromParams({kind: 'planet', type: 'Ocean world', radiusM: 6.371e6, temperatureK: 278, water: .7, coreFraction: .32, vigourDraw01: .5});
  assert.equal(airScaleHeightM(cold, 0), null, 'no scale height without a positive temperature');
  assert.equal(airPressureAtHeightPa(cold, 0, -10), cold.surfacePressurePa); assert.equal(airPressureAtHeightPa(cold, 0, 10), 0);
  // Absent places: stars and planets before they form; no rung key, no fabricated coast.
  const star = coastAt({sys, body: sys.stars[0], t}, DIRS[0]);
  assert.deepEqual([star.exists, star.stage, 'groundHeightM' in star], [false, 'star', false]);
  const early = coastAt({sys, body, t: planetLc.formationNs - 1n}, DIRS[0]);
  assert.deepEqual([early.exists, early.stage], [false, 'accreting']);
  const earlyPlace = placeAt({sys, body, t: planetLc.formationNs - 1n}, DIRS[0], 3, {rung: true});
  assert.equal(earlyPlace.exists, false); assert.equal('rung' in earlyPlace, false);
  // Invalid rung levels throw; the same levels without the option are only echoed (place-query-1 behaviour).
  const ctx = {sys, body, t};
  for (const level of [-1, 2.5, 31, NaN, Infinity, 'S9', 'S'])
    assert.throws(() => placeAt(ctx, DIRS[0], level, {rung: true}), RangeError, `rung level ${String(level)}`);
  for (const level of [2.5, 31]) assert.equal(placeAt(ctx, DIRS[0], level).level, level);
});

// v1-field identity: the place-query-1 source of main 7419733, run against this tree's modules (so only place-query.ts
// differs), must give Object.is-equal values on every place-query-1 field. The intended exceptions are the version keys.
const V1_COMMIT = '7419733';
const V1_VERSION_KEYS = new Set(['version', 'versions.placeQuery', 'versions.lodLadder']);
// The reference needs commit 7419733 in this clone (absent in a shallow clone or an exported tree): skip, saying why.
const V1_SKIP = (() => {
  try {
    execFileSync('git', ['cat-file', '-e', `${V1_COMMIT}^{commit}`], {cwd: fileURLToPath(new URL('..', import.meta.url)), stdio: 'ignore'});
    return false;
  } catch { return `reference commit ${V1_COMMIT} (place-query-1 source) is not reachable in this checkout (shallow clone or exported tree); v1-field identity not checked`; }
})();
async function placeQueryV1() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const source = execFileSync('git', ['show', `${V1_COMMIT}:src/place-query.ts`], {cwd: root, encoding: 'utf8'});
  assert.ok(source.includes("PLACE_QUERY_VERSION = 'place-query-1'"), 'the reference is place-query-1');
  const srcUrl = pathToFileURL(join(root, 'src')).href + '/';
  const text = source.replace(/from '\.\/([^']+)'/g, (_, f) => `from '${srcUrl}${f}'`);
  const dir = mkdtempSync(join(tmpdir(), 'place-query-v1-ref-'));
  try {
    const file = join(dir, 'place-query-v1.ts');
    writeFileSync(join(dir, 'package.json'), '{"type": "module"}');
    writeFileSync(file, text);
    return await import(pathToFileURL(file).href);
  } finally { rmSync(dir, {recursive: true, force: true}); }
}
function assertV1Fields(v1, v2, where, path = '') {
  if (v1 === null || typeof v1 !== 'object') {
    if (!V1_VERSION_KEYS.has(path)) assert.ok(Object.is(v1, v2), `${where} ${path}: ${v1} vs ${v2}`);
    return;
  }
  assert.equal(typeof v2, 'object', `${where} ${path}`);
  for (const k of Object.keys(v1)) {
    const key = path ? `${path}.${k}` : k;
    assert.ok(v2 !== null && k in v2, `${where}: place-query-2 keeps ${key}`);
    assertV1Fields(v1[k], v2[k], where, key);
  }
}

test('v1-field identity vs main 7419733: Object.is on every place-query-1 field (fixed corpus)', {skip: V1_SKIP}, async () => {
  const v1 = await placeQueryV1();
  assert.equal(v1.PLACE_QUERY_VERSION, 'place-query-1');
  const sets = JSON.parse(readFileSync(new URL('./tier-sets.json', import.meta.url), 'utf8'));
  const massif = frozenMassifJobs(sets);
  const moonSys = WORLDS.find(w => w.sys.moons.length).sys;
  const cases = [...WORLDS.map(({sys, body}, w) => ({sys, body, extra: massif.filter(j => j.world === w).slice(0, 2).map(j => j.d)})),
    {sys: moonSys, body: moonSys.moons[0], extra: []},
    {sys: WORLDS[0].sys, body: WORLDS[0].sys.planets.find(b => !b.water && b.type !== 'Gas giant'), extra: []},
    {sys: WORLDS[0].sys, body: WORLDS[0].sys.planets.find(b => b.type === 'Gas giant'), extra: []},
    {sys: WORLDS[0].sys, body: WORLDS[0].sys.stars[0], extra: []}];
  const dates = [CATALOGUE_EPOCH_NS, CATALOGUE_EPOCH_NS + 300_000_000n * YEAR_NS, COAST_DATES[1], CATALOGUE_EPOCH_NS - 9_000_000_000n * YEAR_NS];
  const dirs = Array.from({length: 24}, (_, i) => fibonacciDirection(i, 24));
  let n = 0;
  for (const {sys, body, extra} of cases) for (const t of dates) {
    const ctx = {sys, body, t};
    [...dirs, ...extra].forEach((d, i) => {
      const level = ['S4', 2, 'S0', 22, 'S2'][i % 5];
      const options = i % 4 === 0 ? {measureSlope: true} : i % 4 === 1 ? {upDot: .8} : {};
      const where = `${body.name} t=${t} #${i} ${level}`;
      const a = v1.placeAt(ctx, d, level, options);
      assertV1Fields(a, placeAt(ctx, d, level, options), where);
      if (a.exists) assertV1Fields(a, placeAt(ctx, d, level, {...options, rung: true}), where + ' +rung');
      if (i % 3 === 0) for (const depth of [0, 30, 1e6, -5]) assertV1Fields(v1.depthAndPressureAt(ctx, d, depth), depthAndPressureAt(ctx, d, depth), where + ` depth ${depth}`);
      n++;
    });
  }
  assert.ok(n >= 300, `corpus size ${n}`);
  // The intended exceptions really are the version keys (and only those differ).
  const a = v1.placeAt({sys: WORLDS[0].sys, body: WORLDS[0].body, t: CATALOGUE_EPOCH_NS}, dirs[0]), b = placeAt({sys: WORLDS[0].sys, body: WORLDS[0].body, t: CATALOGUE_EPOCH_NS}, dirs[0]);
  assert.deepEqual([a.version, a.versions.placeQuery, a.versions.lodLadder], ['place-query-1', 'place-query-1', null]);
  assert.deepEqual([b.version, b.versions.placeQuery, b.versions.lodLadder], [PLACE_QUERY_VERSION, PLACE_QUERY_VERSION, LOD_LADDER_VERSION]);
  assert.deepEqual({...a.versions, placeQuery: 0, lodLadder: 0}, {...b.versions, placeQuery: 0, lodLadder: 0});
  // Negative controls: the comparison catches a 1-ulp field change, a nested change and a dropped field.
  const ulp = x => x + Math.abs(x) * Number.EPSILON || Number.MIN_VALUE;
  assert.throws(() => assertV1Fields(a, {...b, groundHeightM: ulp(b.groundHeightM)}, 'control'), /groundHeightM/);
  assert.throws(() => assertV1Fields(a, {...b, climate: {...b.climate, snowFraction: ulp(b.climate.snowFraction)}}, 'control'), /climate\.snowFraction/);
  const {floorM, ...dropped} = b; void floorM;
  assert.throws(() => assertV1Fields(a, dropped, 'control'), /keeps floorM/);
});
