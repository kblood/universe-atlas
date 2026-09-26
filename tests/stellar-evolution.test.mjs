import {test} from 'node:test';
import assert from 'node:assert/strict';
import {galaxies, sector, system} from '../src/catalog.ts';
import {CATALOGUE_EPOCH_NS, UNIVERSE_END_NS, YEAR_NS} from '../src/world-time.ts';
import {
  starLifecycle, starStateAt, planetLifecycle, planetStateAt, waterKeysFor,
} from '../src/stellar-evolution.ts';
import {canonicalJSON} from './canonical-json.mjs';

const SEED = 'LETHRA-001';
const g = galaxies(SEED)[0];

// A ~500+ star, several-thousand-planet corpus, gathered from real generated
// systems (same pattern tests/world.test.mjs and tests/catalog.test.mjs use).
function buildCorpus(minStars) {
  const stars = [], planets = []; // planets carry their owning star's Body alongside
  let cx = 266;
  while (stars.length < minStars) {
    const refs = sector(g, [cx, 0, 0]).refs;
    for (const ref of refs) {
      const sys = system(ref);
      for (const star of sys.stars) stars.push(star);
      const primary = sys.stars[0];
      for (const planet of sys.planets) planets.push({planet, star: sys.stars.find(s => s.id === planet.parentId) || primary});
      if (stars.length >= minStars) break;
    }
    cx++;
    if (cx > 400) throw new Error('could not gather enough stars from the catalogue corpus');
  }
  return {stars, planets};
}
const {stars: STAR_CORPUS, planets: PLANET_CORPUS} = buildCorpus(500);
const dummyAddress = {clusterCell:[0n,0n,0n], groupCell:[0n,0n,0n], galaxyOrdinal:0,
  sectorCell:[0n,0n,0n], genCell:[0n,0n,0n], systemOrdinal:0, slot:'star/0'};

test('corpus size meets the acceptance-test floor', () => {
  assert.ok(STAR_CORPUS.length >= 500, `only gathered ${STAR_CORPUS.length} stars`);
  assert.ok(PLANET_CORPUS.length > 0, 'corpus must include planets');
});

test('determinism: same (seed, address, t) star lifecycles match across repeated runs and shuffled/reversed order', () => {
  const digestOf = (star) => canonicalJSON(starLifecycle(SEED, dummyAddress, star));
  const forward = STAR_CORPUS.map(digestOf);
  const again = STAR_CORPUS.map(digestOf);
  assert.deepEqual(forward, again, 'repeated runs must match');
  const reversedDigests = STAR_CORPUS.slice().reverse().map(digestOf);
  assert.deepEqual(reversedDigests, forward.slice().reverse(), 'reversed generation order must not change any individual result');
  const shuffled = STAR_CORPUS.slice().sort((a,b) => (hashIndex(a.seed) - hashIndex(b.seed)));
  const byId = new Map(STAR_CORPUS.map((s,i) => [s.id, forward[i]]));
  for (const s of shuffled) assert.equal(digestOf(s), byId.get(s.id));
});
function hashIndex(seed) { let h=0; for (const c of seed) h=(h*131+c.charCodeAt(0))>>>0; return h; }

test('determinism: planet lifecycles (population depends on stellar lifecycle) match across repeated/shuffled order', () => {
  const digestOf = ({planet, star}) => canonicalJSON(planetLifecycle(SEED, dummyAddress, planet, starLifecycle(SEED, dummyAddress, star)));
  const sample = PLANET_CORPUS.slice(0, 800);
  const forward = sample.map(digestOf);
  const again = sample.map(digestOf);
  assert.deepEqual(forward, again);
  const shuffled = sample.slice().sort((a,b) => hashIndex(a.planet.seed) - hashIndex(b.planet.seed));
  const byId = new Map(sample.map((p,i) => [p.planet.id, forward[i]]));
  for (const p of shuffled) assert.equal(digestOf(p), byId.get(p.planet.id));
});

test('t-seek independence: starStateAt(t) is identical whether reached by direct seek or by stepping through arbitrary checkpoints', () => {
  const rand = mulberry32(12345);
  for (const star of STAR_CORPUS.slice(0, 40)) {
    const lifecycle = starLifecycle(SEED, dummyAddress, star);
    const checkpoints = stepPath(0n, UNIVERSE_END_NS - 1n, [lifecycle.formationNs, lifecycle.giantNs, lifecycle.remnantNs], rand);
    const forward = checkpoints.map(t => canonicalJSON(starStateAt(lifecycle, t)));
    const reverseOrderResults = checkpoints.slice().reverse().map(t => canonicalJSON(starStateAt(lifecycle, t)));
    for (let i = 0; i < checkpoints.length; i++)
      assert.equal(reverseOrderResults[checkpoints.length-1-i], forward[i], `t=${checkpoints[i]} must agree regardless of visit order (direct seek vs. stepping)`);
    // Re-evaluating the exact same t after visiting every other checkpoint (a stand-in for
    // "played forward from an earlier t0 via many steps") must reproduce the direct value.
    const mid = checkpoints[Math.floor(checkpoints.length/2)];
    const direct = canonicalJSON(starStateAt(lifecycle, mid));
    for (const t of checkpoints) starStateAt(lifecycle, t); // step through everything else first
    assert.equal(canonicalJSON(starStateAt(lifecycle, mid)), direct);
  }
});

test('t-seek independence: planetStateAt(t) across boundary-crossing and huge steps', () => {
  const rand = mulberry32(54321);
  for (const {planet, star} of PLANET_CORPUS.slice(0, 40)) {
    const starLc = starLifecycle(SEED, dummyAddress, star);
    const planetLc = planetLifecycle(SEED, dummyAddress, planet, starLc);
    const boundaries = [starLc.formationNs, planetLc.formationNs, planetLc.coolingNs, starLc.giantNs, starLc.remnantNs];
    if (planetLc.engulfedNs !== null) boundaries.push(planetLc.engulfedNs);
    const checkpoints = stepPath(0n, UNIVERSE_END_NS - 1n, boundaries, rand);
    const forward = checkpoints.map(t => canonicalJSON(planetStateAt(planetLc, starLc, t)));
    const reverseOrderResults = checkpoints.slice().reverse().map(t => canonicalJSON(planetStateAt(planetLc, starLc, t)));
    for (let i = 0; i < checkpoints.length; i++)
      assert.equal(reverseOrderResults[checkpoints.length-1-i], forward[i]);
  }
});

test('existence gating: no planet is born before its star, and stage transitions land on the documented not-exists states', () => {
  for (const {planet, star} of PLANET_CORPUS.slice(0, 300)) {
    const starLc = starLifecycle(SEED, dummyAddress, star);
    const planetLc = planetLifecycle(SEED, dummyAddress, planet, starLc);
    assert.ok(planetLc.formationNs > starLc.formationNs, `${planet.id} must form after its star`);
    if (planetLc.engulfedNs !== null) {
      assert.ok(planetLc.engulfedNs <= starLc.remnantNs, `${planet.id} engulfment must not exceed star death`);
      assert.equal(planetStateAt(planetLc, starLc, planetLc.engulfedNs).stage, 'engulfed');
      assert.equal(planetStateAt(planetLc, starLc, starLc.remnantNs).stage, 'engulfed', 'engulfment is permanent through star death');
    }
    if (starLc.formationNs > 0n) assert.equal(planetStateAt(planetLc, starLc, starLc.formationNs - 1n).stage, 'unformed');
    assert.equal(planetStateAt(planetLc, starLc, planetLc.formationNs - 1n).stage, 'accreting');
    assert.equal(planetStateAt(planetLc, starLc, planetLc.formationNs).stage, 'molten');
    assert.equal(planetStateAt(planetLc, starLc, planetLc.coolingNs).stage, planetLc.engulfedNs !== null && planetLc.coolingNs >= planetLc.engulfedNs ? 'engulfed' : 'solid');
  }
});

test('existence gating: querying a star before formation/after remnant returns the documented stage', () => {
  for (const star of STAR_CORPUS.slice(0, 300)) {
    const lifecycle = starLifecycle(SEED, dummyAddress, star);
    assert.equal(starStateAt(lifecycle, lifecycle.formationNs - 1n).stage, 'unformed');
    assert.equal(starStateAt(lifecycle, lifecycle.formationNs).stage, 'main-sequence');
    assert.equal(starStateAt(lifecycle, lifecycle.giantNs).stage, 'giant');
    assert.equal(starStateAt(lifecycle, lifecycle.remnantNs).stage, 'remnant');
    assert.equal(starStateAt(lifecycle, UNIVERSE_END_NS - 1n).stage, 'remnant');
  }
});

test('sanity physics: mass-lifetime scaling matches the textbook approximation within the acceptance bounds', () => {
  const sun = {...STAR_CORPUS[0], massKg: 1.98847e30, seed: 'sanity/sun'};
  const redDwarf = {...STAR_CORPUS[0], massKg: 0.1*1.98847e30, seed: 'sanity/red-dwarf'};
  const blueGiant = {...STAR_CORPUS[0], massKg: 20*1.98847e30, seed: 'sanity/blue-giant'};
  const yearsOfMainSequence = (body) => {
    const l = starLifecycle(SEED, dummyAddress, body);
    return Number(l.giantNs - l.formationNs) / Number(YEAR_NS);
  };
  const sunYears = yearsOfMainSequence(sun);
  const redDwarfYears = yearsOfMainSequence(redDwarf);
  const blueGiantYears = yearsOfMainSequence(blueGiant);
  assert.ok(Math.abs(sunYears - 1e10) / 1e10 < 0.15, `Sun-like main-sequence lifetime = ${sunYears.toExponential(3)} yr, want ~1e10 +/-15%`);
  assert.ok(redDwarfYears > 1e12, `0.1 Msun main-sequence lifetime = ${redDwarfYears.toExponential(3)} yr, want > 1e12`);
  assert.ok(blueGiantYears < 2e7, `20 Msun main-sequence lifetime = ${blueGiantYears.toExponential(3)} yr, want < 2e7`);
  assert.equal(starLifecycle(SEED, dummyAddress, sun).outcome, 'white-dwarf');
  // outcome thresholds are unchanged from the pre-contract heuristic: 8 and 25
  // Msun (contract §2.3) — 20 Msun falls below the black-hole threshold.
  assert.equal(starLifecycle(SEED, dummyAddress, blueGiant).outcome, 'neutron-star');
});

test('sanity physics: t handles the full 0n..UNIVERSE_END_NS range and BigInt round-trips at 10^100 yr without precision loss', () => {
  assert.equal(BigInt(UNIVERSE_END_NS.toString()), UNIVERSE_END_NS);
  const lifecycle = starLifecycle(SEED, dummyAddress, STAR_CORPUS[0]);
  const stateAtEnd = starStateAt(lifecycle, UNIVERSE_END_NS - 1n);
  assert.equal(stateAtEnd.stage, 'remnant');
  assert.ok(Number.isFinite(stateAtEnd.radiusM) && Number.isFinite(stateAtEnd.temperatureK));
});

test('ulp-perturbation: discrete lifecycle digests (formation/giant/remnant/outcome, planet formation/cooling/ocean/engulfment) are unchanged under ulp-level Math perturbation', () => {
  const starDigest = (star) => canonicalJSON(starLifecycle(SEED, dummyAddress, star));
  const planetDigest = ({planet, star}) => canonicalJSON(planetLifecycle(SEED, dummyAddress, planet, starLifecycle(SEED, dummyAddress, star)));
  const starsBefore = STAR_CORPUS.map(starDigest);
  const planetsBefore = PLANET_CORPUS.slice(0, 500).map(planetDigest);
  const originals = {sin: Math.sin, cos: Math.cos, exp: Math.exp, log: Math.log, pow: Math.pow, atan2: Math.atan2, tan: Math.tan, cbrt: Math.cbrt};
  const ulp = (f) => (...args) => { const v = f(...args); return v + (v === 0 ? Number.EPSILON : v * Number.EPSILON); };
  try {
    for (const k of Object.keys(originals)) Math[k] = ulp(originals[k]);
    const starsAfter = STAR_CORPUS.map(starDigest);
    const planetsAfter = PLANET_CORPUS.slice(0, 500).map(planetDigest);
    assert.deepEqual(starsAfter, starsBefore, 'star lifecycle digests must be bit-identical under ulp-level Math perturbation');
    assert.deepEqual(planetsAfter, planetsBefore, 'planet lifecycle digests must be bit-identical under ulp-level Math perturbation');
  } finally {
    Object.assign(Math, originals);
  }
});

test('waterKeysFor: empty for dry planets, strictly ordered and gated by planet lifecycle for wet ones', () => {
  const wet = PLANET_CORPUS.find(({planet}) => planet.water > 0);
  const dry = PLANET_CORPUS.find(({planet}) => !planet.water);
  assert.ok(wet && dry, 'corpus must include both a wet and a dry planet');
  const dryStarLc = starLifecycle(SEED, dummyAddress, dry.star);
  assert.deepEqual(waterKeysFor(planetLifecycle(SEED, dummyAddress, dry.planet, dryStarLc), dryStarLc), []);
  const wetStarLc = starLifecycle(SEED, dummyAddress, wet.star);
  const wetPlanetLc = planetLifecycle(SEED, dummyAddress, wet.planet, wetStarLc);
  const keys = waterKeysFor(wetPlanetLc, wetStarLc);
  assert.equal(keys.length, 2);
  assert.ok(keys[0].dateNs < keys[1].dateNs, 'water keys must be strictly ordered (world-surface.ts requires this)');
  assert.equal(keys[0].dateNs, wetPlanetLc.oceanNs);
});

// --- helpers ---
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Deterministic (seeded) checkpoint path from t0 to target: includes both
 * endpoints, the instant before/at every given boundary (so stage transitions
 * are exercised), and several huge Gyr-scale intermediate jumps — the
 * "arbitrary step sizes... including steps crossing stage boundaries and huge
 * Gyr steps" the acceptance test calls for (contract §6.4 test 3). */
function stepPath(t0, target, boundaries, rand) {
  const points = new Set([t0, target]);
  for (const b of boundaries) {
    if (b > t0 && b < target) { points.add(b); points.add(b - 1n); }
  }
  const span = target - t0;
  for (let i = 1; i <= 6; i++) {
    const numerator = BigInt(Math.floor(rand() * 1_000_000));
    points.add(t0 + (span * numerator) / 1_000_000n);
  }
  return Array.from(points).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
