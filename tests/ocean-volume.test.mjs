// ocean-volume-1 (relief round 2026-10, P2-OCEAN-QUERY): the dated sea level
// is a VOLUME model. The lifecycle authors a lost-volume fraction
// (stellar-evolution.ts waterKeysFor) and ocean-volume.ts solves the level on
// the body's own seabed. Replaces the old linear 0 -> -8000 m metre ramp,
// which rendered Maithea at about -4500 m (67.8% of the ocean volume lost)
// at the catalogue epoch.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {galaxies, refByAddress, system} from '../src/catalog.ts';
import {CATALOGUE_EPOCH_NS, YEAR_NS} from '../src/world-time.ts';
import {TERRAIN_VERSION} from '../src/terrain.ts';
import {starLifecycle, planetLifecycle, waterKeysFor, WATER_LOSS_KEY_LIMIT} from '../src/stellar-evolution.ts';
import {datedOceanState, waterLossAt, SURFACE_VERSION} from '../src/world-surface.ts';
import {
  OCEAN_VOLUME_VERSION, HYPSOMETRY_SAMPLES, oceanHypsometry, levelForLoss, levelForLossOn,
  oceanVolumeAt, lossForLevel, hypsometryFromHeights, clearOceanHypsometryCache,
} from '../src/ocean-volume.ts';

const SEED = 'LETHRA-001';
const ADDR = {clusterCell:[0n,0n,0n], groupCell:[0n,0n,0n], galaxyOrdinal:0,
  sectorCell:[0n,0n,0n], genCell:[0n,0n,0n], systemOrdinal:0, slot:'x'};
const g0 = galaxies(SEED)[0];
/** The four water worlds the relief round is judged on (terrain-climate-fixtures.mjs picks). */
const WORLDS = [['G001/C2128,0,1/0',1],['G001/C2142,3,4/0',0],['G001/C2143,4,3/0',1],['G001/C2142,6,1/1',1]].map(([a,i]) => {
  const sys = system(refByAddress(g0, a)), body = sys.planets[i];
  const star = sys.stars.find(s => s.id === body.parentId) || sys.stars[0];
  const starLc = starLifecycle(SEED, ADDR, star), planetLc = planetLifecycle(SEED, ADDR, body, starLc);
  return {body, starLc, planetLc};
});
const LOSSES = [0, .05, .25, .5, .9, 1];

test('versions: ocean-volume-1 and surface 8', () => {
  assert.equal(OCEAN_VOLUME_VERSION, 'ocean-volume-1');
  assert.equal(SURFACE_VERSION, 'atlas-surface-8-ocean-volume');
  assert.equal(HYPSOMETRY_SAMPLES, 4096);
  assert.equal(WATER_LOSS_KEY_LIMIT, 16);
});

test('catalogue epoch: datedOceanState waterLevelM is exactly 0 (full ocean) on Maithea, Selawyn, Raiva, Lethuris', () => {
  assert.deepEqual(WORLDS.map(w => w.body.name), ['Maithea', 'Selawyn', 'Raiva', 'Lethuris']);
  for (const {body, starLc, planetLc} of WORLDS) {
    const o = datedOceanState(body, planetLc, starLc, CATALOGUE_EPOCH_NS);
    assert.equal(o.globalOceanAvailable, true, body.name);
    assert.ok(Object.is(o.waterLevelM, 0), `${body.name} level ${o.waterLevelM} must be exactly +0 (old metre ramp: about -4500)`);
    assert.ok(Object.is(o.renderWaterLevelM, 0));
  }
});

test('levelForLoss: f=0 -> exactly 0, strictly monotone, volume conserved to 1e-6', () => {
  for (const {body} of WORLDS) {
    const hyp = oceanHypsometry(body);
    assert.ok(hyp.fullVolume > 0 && hyp.belowZero > 0, `${body.name} has a basin`);
    const levels = LOSSES.map(f => levelForLoss(body, f));
    assert.ok(Object.is(levels[0], 0), 'f = 0 is exactly 0 m');
    for (let i = 1; i < levels.length; i++) assert.ok(levels[i] < levels[i - 1], `${body.name} strictly falling: ${levels.join(', ')}`);
    assert.equal(levels[levels.length - 1], hyp.minHeightM, 'f = 1 drains to the deepest sampled point');
    for (const f of LOSSES) {
      const v = oceanVolumeAt(hyp, levelForLoss(body, f));
      assert.ok(Math.abs(v - (1 - f) * hyp.fullVolume) / hyp.fullVolume <= 1e-6, `${body.name} f=${f} conservation`);
    }
    // Monotone non-increasing on a fine grid too (no bisection wobble).
    let prev = 0;
    for (let k = 0; k <= 200; k++) { const l = levelForLoss(body, k / 200); assert.ok(l <= prev); prev = l; }
  }
});

test('solver reproduces the shipped dated level: Maithea 67.8% loss -> -4503 +- 25 m (version-gated on the terrain it was measured on)', () => {
  const maithea = WORLDS[0].body;
  if (TERRAIN_VERSION === 'terrain-1.7.0-climate-colour') {
    const level = levelForLoss(maithea, .678);
    assert.ok(Math.abs(level - -4503) <= 25, `level ${level}`);
    assert.ok(Math.abs(lossForLevel(maithea, -4503) - .678) < .005, 'and the inverse');
  } else {
    // terrain-1.8.0-relief (P4, R-CAL-1): planning figures 5/25/50/90% ->
    // -171/-945/-1989/-3837 m (+-10%), measured with this same solver on the
    // scratch prototype seabed (relief-scripts/p2-rcal.mjs, exact match).
    const want = [-171, -945, -1989, -3837];
    [.05, .25, .5, .9].forEach((f, i) => {
      const level = levelForLoss(maithea, f);
      assert.ok(Math.abs(level - want[i]) <= Math.abs(want[i]) * .1, `${TERRAIN_VERSION}: f=${f} level ${level} vs ${want[i]}`);
    });
  }
});

test('solver on caller heights: tiny hand-checked basin', () => {
  // heights -300, -100, 50: V(0) = 400. Half loss -> V(L) = 200: L in (-100, 0): (L+300)+(L+100) = 200 -> L = -100.
  const hyp = hypsometryFromHeights([50, -100, -300]);
  assert.equal(hyp.fullVolume, 400);
  assert.ok(Math.abs(levelForLossOn(hyp, .5) - -100) < 1e-9);
  assert.ok(Math.abs(levelForLossOn(hyp, .75) - -200) < 1e-9); // (L+300) = 100
  assert.equal(levelForLossOn(hypsometryFromHeights([10, 20]), .5), 0, 'no basin: level stays 0');
});

test('loss keys: 0 before the epoch, 1 no later than giantNs, strictly ordered, at most 16', () => {
  for (const {body, starLc, planetLc} of WORLDS) {
    const keys = waterKeysFor(planetLc, starLc);
    assert.ok(keys.length >= 2 && keys.length <= 16, `${body.name} ${keys.length} keys`);
    for (let i = 1; i < keys.length; i++) {
      assert.ok(keys[i].dateNs > keys[i - 1].dateNs);
      assert.ok(keys[i].lossFraction >= keys[i - 1].lossFraction);
    }
    assert.equal(keys[0].dateNs, planetLc.oceanNs);
    assert.ok(planetLc.oceanNs < CATALOGUE_EPOCH_NS, 'reference worlds condensed long before the epoch');
    for (const back of [0n, 1n, 1_000_000n * YEAR_NS, (CATALOGUE_EPOCH_NS - planetLc.oceanNs) / 2n])
      assert.equal(waterLossAt(keys, CATALOGUE_EPOCH_NS - back), 0, `${body.name} no loss before the epoch`);
    assert.ok(waterLossAt(keys, CATALOGUE_EPOCH_NS + 1_000_000n * YEAR_NS) > 0, 'loss starts after the epoch');
    assert.equal(waterLossAt(keys, starLc.giantNs), 1);
    const full = keys.find(k => k.lossFraction === 1);
    assert.ok(full && full.dateNs <= starLc.giantNs);
  }
});

test('seek independence: the same t reached by two seek paths gives a bit-identical level', () => {
  for (const {body, starLc, planetLc} of WORLDS) {
    const span = starLc.giantNs - CATALOGUE_EPOCH_NS;
    const targets = [CATALOGUE_EPOCH_NS, CATALOGUE_EPOCH_NS + span / 7n, CATALOGUE_EPOCH_NS + span / 3n, CATALOGUE_EPOCH_NS + (span * 5n) / 9n];
    const forward = targets.map(t => datedOceanState(body, planetLc, starLc, t).waterLevelM);
    clearOceanHypsometryCache();
    // Backward path through unrelated dates, cold cache.
    const backward = [];
    for (const t of [...targets].reverse()) {
      datedOceanState(body, planetLc, starLc, starLc.giantNs - 1n);
      datedOceanState(body, planetLc, starLc, planetLc.oceanNs);
      backward.unshift(datedOceanState(body, planetLc, starLc, t).waterLevelM);
    }
    assert.deepEqual(backward, forward, body.name);
    assert.ok(forward[3] < forward[1] || forward[3] === forward[1], 'level falls with time');
  }
});

test('determinism: Math.* nudged by 1 ulp leaves hypsometry and levels bit-identical', () => {
  const names = ['sin', 'cos', 'atan2', 'atan', 'tan', 'pow', 'exp', 'log', 'cbrt', 'acos'];
  const snapshot = () => {
    clearOceanHypsometryCache();
    return WORLDS.map(({body, starLc, planetLc}) => {
      const hyp = oceanHypsometry(body);
      const keys = waterKeysFor(planetLc, starLc);
      return [createHash('sha256').update(Buffer.from(hyp.heights.buffer)).digest('hex'), hyp.fullVolume, hyp.minHeightM,
        ...LOSSES.map(f => levelForLoss(body, f)), ...keys.map(k => `${k.dateNs}:${k.lossFraction}`)].join('|');
    });
  };
  const base = snapshot(), originals = {};
  let parity = 0;
  for (const n of names) {
    originals[n] = Math[n];
    Math[n] = (...a) => { const v = originals[n](...a); parity++; return Number.isFinite(v) && v !== 0 ? v + (parity % 2 ? 1 : -1) * Math.abs(v) * Number.EPSILON : v; };
  }
  let nudged;
  try { nudged = snapshot(); } finally { Object.assign(Math, originals); clearOceanHypsometryCache(); }
  assert.deepEqual(nudged, base);
});

test('cost: hypsometry build and levelForLoss (strict budgets with OCEAN_PERF_STRICT=1)', () => {
  const strict = process.env.OCEAN_PERF_STRICT === '1';
  const builds = [];
  for (let round = 0; round < 3; round++) for (const {body} of WORLDS) {
    clearOceanHypsometryCache();
    const t0 = performance.now(); oceanHypsometry(body); builds.push(performance.now() - t0);
  }
  const warm = builds.slice(WORLDS.length).sort((a, b) => a - b), median = warm[warm.length >> 1];
  const body = WORLDS[0].body; oceanHypsometry(body);
  const N = 20000, t0 = performance.now(); let s = 0;
  for (let i = 0; i < N; i++) s += levelForLoss(body, (i % 997) / 997);
  const perLevelUs = (performance.now() - t0) / N * 1000;
  console.log(`ocean-volume cost: build median ${median.toFixed(2)} ms (first call in this test ${builds[0].toFixed(2)} ms), levelForLoss ${perLevelUs.toFixed(2)} us`, s < 0);
  assert.ok(median <= (strict ? 5 : 50), `build ${median} ms`);
  assert.ok(perLevelUs <= (strict ? 20 : 200), `levelForLoss ${perLevelUs} us`);
});
