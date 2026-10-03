import {test} from 'node:test';
import assert from 'node:assert/strict';
import {galaxies, sector, system, refByAddress} from '../src/catalog.ts';
import {CATALOGUE_EPOCH_NS, UNIVERSE_END_NS, YEAR_NS} from '../src/world-time.ts';
import {starLifecycle, starStateAt, planetLifecycle, waterKeysFor} from '../src/stellar-evolution.ts';
import {surfaceAt, planetAgeMyr, waterLossAt, biosphereStateAt, SURFACE_VERSION, BIOSPHERE_QUERY_VERSION} from '../src/world-surface.ts';
import {generateBiosphere, biosphereAt, profileFromPhysicalProperties, MIN_DATE_MYR, MAX_DATE_MYR} from '../src/biosphere-model.ts';
import {canonicalJSON} from './canonical-json.mjs';

const SEED = 'LETHRA-001';
const g = galaxies(SEED)[0];
const dummyAddress = {clusterCell:[0n,0n,0n], groupCell:[0n,0n,0n], galaxyOrdinal:0,
  sectorCell:[0n,0n,0n], genCell:[0n,0n,0n], systemOrdinal:0, slot:'star/0'};

// Same real-catalogue-corpus pattern as tests/stellar-evolution.test.mjs:
// gather planets/moons paired with their true host star (falling back to the
// system primary for a binary, matching how starLifecycle/planetLifecycle
// are meant to be composed), so the acceptance tests below exercise real
// generated bodies rather than synthetic fixtures.
function buildCorpus(minPlanets) {
  const planets = [], moons = [];
  let cx = 500;
  while (planets.length < minPlanets) {
    const refs = sector(g, [cx, 0, 0]).refs;
    for (const ref of refs) {
      const sys = system(ref);
      const primary = sys.stars[0];
      for (const planet of sys.planets) {
        const star = sys.stars.find(s => s.id === planet.parentId) || primary;
        planets.push({planet, star, bodyAddress: planet.id});
      }
      for (const moon of sys.moons) {
        const planet = sys.planets.find(p => p.id === moon.parentId);
        if (!planet) continue;
        const star = sys.stars.find(s => s.id === planet.parentId) || primary;
        moons.push({moon, planet, star, bodyAddress: moon.id});
      }
      if (planets.length >= minPlanets) break;
    }
    cx++;
    if (cx > 700) throw new Error('could not gather enough planets from the catalogue corpus');
  }
  return {planets, moons};
}
const {planets: PLANET_CORPUS, moons: MOON_CORPUS} = buildCorpus(220);
const DIRECTIONS = [[1,0,0],[0,1,0],[0,0,1],[-1,0,0],[0,-1,0],[0,0,-1]];
function hashIndex(seed) { let h=0; for (const c of seed) h=(h*131+c.charCodeAt(0))>>>0; return h; }

test('corpus size meets the acceptance-test floor', () => {
  assert.ok(PLANET_CORPUS.length >= 200, `only gathered ${PLANET_CORPUS.length} planets`);
  assert.ok(MOON_CORPUS.length > 0, 'corpus must include moons (for the engulfment-orbit-AU fix)');
});

// Eight dates spanning before star birth, planet accretion, ocean epoch,
// biosphere complex stage, star giant/engulfment, and after death (contract
// §6.4 acceptance test 1), derived per-body from its own real lifecycle
// boundaries rather than fixed absolute t values (a fixed t would land in a
// different stage for every star mass).
function eightDates({planet, star}) {
  const starLc = starLifecycle(SEED, dummyAddress, star);
  const planetLc = planetLifecycle(SEED, dummyAddress, planet, starLc);
  const complexMyr = Math.min(MAX_DATE_MYR - 10, 900); // safely inside "biosphere complex stage" for any wet profile (speciesBase ~ surfaceMyr+~950)
  return [
    starLc.formationNs - 1n,                                               // before star birth
    starLc.formationNs + (planetLc.formationNs - starLc.formationNs) / 2n, // planet accretion
    planetLc.oceanNs ?? planetLc.coolingNs + 1n,                            // ocean epoch (or just after cooling if dry)
    planetLc.formationNs + BigInt(complexMyr) * 1_000_000n * YEAR_NS,       // biosphere complex stage (planet-age anchored)
    starLc.giantNs,                                                        // star giant/engulfment
    starLc.remnantNs + 1n,                                                 // after death
    0n,                                                                    // universe origin
    UNIVERSE_END_NS - 1n,                                                  // universe ceiling
  ];
}

function digestOf({planet, star, bodyAddress}, t) {
  const starLc = starLifecycle(SEED, dummyAddress, star);
  const results = DIRECTIONS.map(d => surfaceAt(SEED, bodyAddress, planet, d, t, 'baseline', {}, starLc));
  return canonicalJSON(results);
}

test('determinism: same (seed, bodyAddress, t) -> same canonical digest across repeated runs and shuffled order, for >=200 bodies across >=8 dates', () => {
  const sample = PLANET_CORPUS.slice(0, 200);
  const cases = sample.flatMap(p => eightDates(p).map(t => ({p, t})));
  assert.ok(cases.length >= 200 * 8, `only built ${cases.length} (body,date) cases`);
  const forward = cases.map(({p, t}) => digestOf(p, t));
  const again = cases.map(({p, t}) => digestOf(p, t));
  assert.deepEqual(forward, again, 'repeated runs must match');
  const shuffled = cases
    .map((c, i) => ({c, i, key: hashIndex(c.p.bodyAddress + '/' + c.t.toString())}))
    .sort((a, b) => a.key - b.key);
  for (const {c, i} of shuffled) assert.equal(digestOf(c.p, c.t), forward[i], 'shuffled evaluation order must not change any individual result');
});

test('t-seek independence: surfaceAt(t) agrees regardless of visit order or which other checkpoints were evaluated first', () => {
  for (const p of PLANET_CORPUS.slice(0, 30)) {
    const dates = eightDates(p);
    const forward = dates.map(t => digestOf(p, t));
    const reversed = dates.slice().reverse().map(t => digestOf(p, t));
    for (let i = 0; i < dates.length; i++) assert.equal(reversed[dates.length-1-i], forward[i]);
    // Direct seek to a middle checkpoint must reproduce after visiting every other checkpoint first.
    const mid = dates[Math.floor(dates.length/2)];
    const direct = digestOf(p, mid);
    for (const t of dates) digestOf(p, t);
    assert.equal(digestOf(p, mid), direct);
  }
});

test('existence gating: no ground/water before formation, nothing after engulfment, documented not-exists state', () => {
  for (const {planet, star, bodyAddress} of PLANET_CORPUS.slice(0, 300)) {
    const starLc = starLifecycle(SEED, dummyAddress, star);
    const planetLc = planetLifecycle(SEED, dummyAddress, planet, starLc);
    const at = t => surfaceAt(SEED, bodyAddress, planet, [1,0,0], t, 'baseline', {}, starLc);

    // Before the star itself has formed: unformed, not-exists, documented shape.
    if (starLc.formationNs > 0n) {
      const before = at(starLc.formationNs - 1n);
      assert.equal(before.exists, false); assert.equal(before.stage, 'unformed'); assert.equal(before.sample, null);
      assert.equal(before.version, SURFACE_VERSION);
    }
    // Between star formation and planet formation: still accreting, not-exists.
    const accreting = at(planetLc.formationNs - 1n);
    assert.equal(accreting.exists, false); assert.equal(accreting.stage, 'accreting'); assert.equal(accreting.sample, null);

    // Once formed: molten, exists but not yet walkable/wet.
    const molten = at(planetLc.formationNs);
    assert.equal(molten.exists, true); assert.equal(molten.stage, 'molten');
    assert.equal(molten.sample.solid, false); assert.equal(molten.sample.walkable, false);
    if (planet.water > 0) assert.equal(molten.sample.ocean, false, 'no ocean before cooling+condensation, however wet the planet eventually becomes');

    // Once cooled: solid ground exists; ocean only from oceanNs onward.
    const solid = at(planetLc.coolingNs);
    assert.equal(solid.exists, true); assert.equal(solid.stage, 'solid');
    if (planetLc.oceanNs !== null) {
      // solid-but-pre-ocean window: must never show a global sea, even
      // though surfaceQuery's own waterLevelAt([],date) fallback is 0 (see
      // world-surface.ts's NO_GLOBAL_SEA_YET sentinel and its long comment).
      const justBeforeOcean = at(planetLc.oceanNs - 1n);
      assert.equal(justBeforeOcean.sample.ocean, false, 'no global sea before the planet has actually condensed one');
      const atOcean = at(planetLc.oceanNs);
      const keyCount = waterKeysFor(planetLc, starLc).length;
      assert.ok(keyCount >= 1 && keyCount <= 16, `1..16 ocean-volume loss keys (got ${keyCount})`);
      void atOcean;
    }

    // Engulfment (if applicable): permanently not-exists through star death.
    if (planetLc.engulfedNs !== null) {
      const engulfed = at(planetLc.engulfedNs);
      assert.equal(engulfed.exists, false); assert.equal(engulfed.stage, 'engulfed'); assert.equal(engulfed.sample, null);
      const afterDeath = at(starLc.remnantNs);
      assert.equal(afterDeath.exists, false); assert.equal(afterDeath.stage, 'engulfed', 'engulfment is permanent through star death');
    } else {
      // Not engulfed: still rendered after star death, per contract §2.6 ("otherwise still rendered, in solid/frozen-ocean state").
      const afterDeath = at(starLc.remnantNs);
      assert.equal(afterDeath.exists, true); assert.equal(afterDeath.stage, 'solid');
    }
  }
});

test('existence gating: a star before formation is not-exists; a remnant after death is still exists', () => {
  for (const {star} of PLANET_CORPUS.slice(0, 100)) {
    const starLc = starLifecycle(SEED, dummyAddress, star);
    const at = t => surfaceAt(SEED, star.id, star, [0,1,0], t, 'baseline', {});
    if (starLc.formationNs > 0n) {
      const before = at(starLc.formationNs - 1n);
      assert.equal(before.exists, false); assert.equal(before.stage, 'unformed'); assert.equal(before.sample, null);
    }
    const mainSeq = at(starLc.formationNs);
    assert.equal(mainSeq.exists, true); assert.equal(mainSeq.stage, 'main-sequence');
    const remnant = at(starLc.remnantNs);
    assert.equal(remnant.exists, true); assert.equal(remnant.stage, 'remnant');
    const end = at(UNIVERSE_END_NS - 1n);
    assert.equal(end.exists, true); assert.equal(end.stage, 'remnant');
  }
});

// Surface 8 (ocean-volume-1) deliberately REMOVES the old metre-ramp
// assertions (keys.length 2, levelM 0 at oceanNs, -8000 m at giantNs, a
// linear mid-ramp level): the lifecycle now authors a lost VOLUME fraction
// and the level comes from the body's own seabed (tests/ocean-volume.test.mjs).
test('water loss keys (ocean-volume-1): 0 up to the catalogue epoch, monotone, 1 no later than giantNs, holds after', () => {
  let checked = 0;
  for (const {planet, star} of PLANET_CORPUS.filter(p => p.planet.water > 0).slice(0, 60)) {
    const starLc = starLifecycle(SEED, dummyAddress, star);
    const planetLc = planetLifecycle(SEED, dummyAddress, planet, starLc);
    if (planetLc.engulfedNs !== null && planetLc.engulfedNs <= planetLc.oceanNs) continue; // engulfed before ever forming an ocean
    const keys = waterKeysFor(planetLc, starLc);
    assert.ok(keys.length >= 1 && keys.length <= 16, `1..16 keys, got ${keys.length}`);
    assert.equal(keys[0].dateNs, planetLc.oceanNs, 'first key at ocean condensation');
    for (let i = 1; i < keys.length; i++) {
      assert.ok(keys[i].dateNs > keys[i - 1].dateNs, 'keys strictly ordered');
      assert.ok(keys[i].lossFraction >= keys[i - 1].lossFraction, 'loss never decreases (no refilling)');
    }
    for (const k of keys) assert.ok(k.lossFraction >= 0 && k.lossFraction <= 1);
    if (planetLc.oceanNs >= starLc.giantNs) continue; // never available: host already left the main sequence
    assert.ok(keys[keys.length - 1].dateNs <= starLc.giantNs, 'no key past giantNs');
    assert.equal(waterLossAt(keys, starLc.giantNs), 1, 'all ocean volume lost by giantNs');
    assert.equal(waterLossAt(keys, starLc.giantNs + 1_000_000_000n), 1, 'holds at the last key, no extrapolation');
    if (planetLc.oceanNs <= CATALOGUE_EPOCH_NS) {
      assert.equal(waterLossAt(keys, planetLc.oceanNs), 0);
      assert.equal(waterLossAt(keys, CATALOGUE_EPOCH_NS), 0, 'catalogue epoch shows the full ocean');
      const before = planetLc.oceanNs + (CATALOGUE_EPOCH_NS - planetLc.oceanNs) / 2n;
      assert.equal(waterLossAt(keys, before), 0, 'no loss before the catalogue epoch');
    }
    checked++;
  }
  assert.ok(checked > 20, `exercised ${checked} wet planets`);
});

test('moon engulfment gates on the parent planet\'s stellar distance, not the moon\'s own tiny local orbit (a Package A gap this package corrects, now fixed inside stellar-evolution.ts\'s planetLifecycle itself rather than patched around here)', () => {
  let demonstratedBug = 0, neverEngulfed = 0, engulfedWithPlanet = 0;
  const AU_M = 149597870700;
  for (const {moon, planet, star, bodyAddress} of MOON_CORPUS.slice(0, 300)) {
    const starLc = starLifecycle(SEED, dummyAddress, star);
    const planetLc = planetLifecycle(SEED, dummyAddress, planet, starLc);
    const corrected = surfaceAt(SEED, bodyAddress, moon, [1,0,0], starLc.giantNs, 'baseline', {}, starLc, planet);
    if (planetLc.engulfedNs === null) {
      // Far-out, never-engulfed planet: its moon must survive too.
      assert.equal(corrected.exists, true, 'a moon around a planet that is never engulfed must not be reported engulfed once corrected');
      assert.notEqual(corrected.stage, 'engulfed');
      neverEngulfed++;
      // Reproduce the exact pre-fix bug inline (the moon's own tiny
      // moon-around-planet orbit.a, misread as if it were the star-orbit
      // distance) to prove it would have differed from the corrected result
      // for at least one real corpus member — demonstrating the gap this
      // fix closes, without reintroducing the removed override parameter.
      const buggyOrbitAu = moon.orbit.a / AU_M;
      const solarMass = Math.max(0.08, starLc.massKg / 1.98847e30);
      const giantRadiusAu = 0.7 * Math.pow(solarMass, 0.3);
      if (buggyOrbitAu < giantRadiusAu * 1.3) demonstratedBug++;
    } else {
      // Engulfed planet: its moon must be engulfed at exactly the same instant.
      assert.equal(corrected.exists, false);
      assert.equal(corrected.stage, 'engulfed');
      engulfedWithPlanet++;
    }
  }
  assert.ok(demonstratedBug > 0, 'corpus must include at least one never-engulfed-planet moon where the pre-fix (moon-orbit-as-star-distance) formula would have wrongly fired');
  assert.ok(neverEngulfed > 0 && engulfedWithPlanet > 0, 'corpus must exercise both outcomes');
});

test('moon formation/engulfment bounds are inherited from the parent planet: no moon birth precedes its planet\'s birth, and an engulfed planet\'s moon engulfs at exactly the same instant', () => {
  let checked = 0;
  for (const {moon, planet, star} of MOON_CORPUS.slice(0, 300)) {
    const starLc = starLifecycle(SEED, dummyAddress, star);
    const planetLc = planetLifecycle(SEED, dummyAddress, planet, starLc);
    const moonLc = planetLifecycle(SEED, dummyAddress, moon, starLc, {starOrbitAu: planet.orbit.a / 149597870700, lifecycle: planetLc});
    assert.ok(moonLc.formationNs >= planetLc.formationNs, 'a moon cannot exist before its own planet has formed');
    if (planetLc.engulfedNs !== null) assert.equal(moonLc.engulfedNs, planetLc.engulfedNs, 'a moon cannot survive (or precede) its own planet\'s engulfment');
    checked++;
  }
  assert.ok(checked >= 200);
});

test('planetLifecycle/surfaceAt reject a moon body without its resolved parentPlanet', () => {
  const {moon, star} = MOON_CORPUS[0];
  const starLc = starLifecycle(SEED, dummyAddress, star);
  assert.throws(() => planetLifecycle(SEED, dummyAddress, moon, starLc), /parentPlanet/);
  assert.throws(() => surfaceAt(SEED, moon.id, moon, [1,0,0], 0n, 'baseline', {}, starLc), /parentPlanet/);
});

test('surfaceAt rejects a non-baseline branch and requires hostStar for a planet/moon', () => {
  const {planet, star} = PLANET_CORPUS[0];
  const starLc = starLifecycle(SEED, dummyAddress, star);
  assert.throws(() => surfaceAt(SEED, planet.id, planet, [1,0,0], 0n, 'other', {}, starLc));
  assert.throws(() => surfaceAt(SEED, planet.id, planet, [1,0,0], 0n, 'baseline', {}));
});

test('ulp-perturbation: exists/stage discrete gating is unchanged under ulp-level Math perturbation', () => {
  const sample = PLANET_CORPUS.slice(0, 150);
  const discreteDigest = ({planet, star, bodyAddress}) => {
    const starLc = starLifecycle(SEED, dummyAddress, star);
    return eightDates({planet, star}).map(t => {
      const r = surfaceAt(SEED, bodyAddress, planet, [1,0,0], t, 'baseline', {}, starLc);
      return canonicalJSON({exists: r.exists, stage: r.stage});
    });
  };
  const before = sample.map(discreteDigest);
  const originals = {sin: Math.sin, cos: Math.cos, exp: Math.exp, log: Math.log, pow: Math.pow, atan2: Math.atan2, tan: Math.tan, cbrt: Math.cbrt};
  const ulp = (f) => (...args) => { const v = f(...args); return v + (v === 0 ? Number.EPSILON : v * Number.EPSILON); };
  try {
    for (const k of Object.keys(originals)) Math[k] = ulp(originals[k]);
    const after = sample.map(discreteDigest);
    assert.deepEqual(after, before, 'exists/stage must be bit-identical under ulp-level Math perturbation');
  } finally {
    Object.assign(Math, originals);
  }
});

// --- planetAgeMyr + biosphere integration (contract §2.4) ---

test('planetAgeMyr: zero at formation, clamped into biosphere-model.ts\'s own MIN/MAX_DATE_MYR range', () => {
  for (const {planet, star} of PLANET_CORPUS.slice(0, 50)) {
    const starLc = starLifecycle(SEED, dummyAddress, star);
    const planetLc = planetLifecycle(SEED, dummyAddress, planet, starLc);
    assert.equal(planetAgeMyr(planetLc, planetLc.formationNs), 0);
    assert.ok(planetAgeMyr(planetLc, planetLc.formationNs - 1n) <= 0);
    assert.equal(planetAgeMyr(planetLc, UNIVERSE_END_NS - 1n), MAX_DATE_MYR, 'huge red-dwarf-scale ages clamp instead of throwing downstream');
    const rawAtOrigin = Number((0n - planetLc.formationNs) / (1_000_000n * YEAR_NS));
    const expectedAtOrigin = Math.max(MIN_DATE_MYR, Math.min(MAX_DATE_MYR, rawAtOrigin));
    assert.equal(planetAgeMyr(planetLc, 0n), expectedAtOrigin, 'matches the documented clamp formula exactly, at the universe origin');
  }
});

test('integration: biosphere existence is gated by the real PlanetLifecycle clock via planetAgeMyr, and rekeyed per real body', () => {
  const wet = PLANET_CORPUS.find(({planet}) => planet.water > 0.3);
  assert.ok(wet, 'corpus must include a sufficiently wet planet');
  const {planet, star, bodyAddress} = wet;
  const starLc = starLifecycle(SEED, dummyAddress, star);
  const planetLc = planetLifecycle(SEED, dummyAddress, planet, starLc);
  const surfaceMyr = Math.max(1, Math.round(Number(planetLc.coolingNs - planetLc.formationNs) / Number(1_000_000n*YEAR_NS)));
  const profile = profileFromPhysicalProperties(planet, 'main-sequence');
  const world = generateBiosphere(SEED, profile, bodyAddress, {surfaceMyr});
  assert.equal(world.formationMyr, 0);
  assert.equal(world.surfaceMyr, surfaceMyr);

  // Before the planet has even formed (negative planet age): no biosphere.
  // planetAgeMyr truncates via BigInt division, so the offset must itself be
  // several whole Myr (in ns) for the result to read as a nonzero negative
  // integer rather than truncating to 0.
  const beforeAge = planetAgeMyr(planetLc, planetLc.formationNs - 2_000_000n * 1_000_000n * YEAR_NS);
  assert.ok(beforeAge < 0, `expected a strictly negative planet age, got ${beforeAge}`);
  assert.equal(biosphereAt(world, Math.max(MIN_DATE_MYR, Math.floor(beforeAge))).stage, 'unformed');

  // At the real solid-surface epoch, life is not yet complex (still sterile/microbial/forming), but never throws.
  const atSurface = biosphereAt(world, surfaceMyr);
  assert.notEqual(atSurface.stage, 'unformed');

  // Two different real bodies with the same profile get different species (rekey correctness).
  const otherWet = PLANET_CORPUS.filter(({planet: p}) => p.water > 0.3 && p.id !== planet.id)[0];
  if (otherWet) {
    const otherProfile = profileFromPhysicalProperties(otherWet.planet, 'main-sequence');
    if (otherProfile === profile) {
      const otherWorld = generateBiosphere(SEED, otherProfile, otherWet.bodyAddress, {surfaceMyr});
      assert.notEqual(otherWorld.digest, world.digest);
    }
  }
});

// --- biosphereStateAt: the unified query's missing 'extinct' terminal state (contract §2.4 task 3) ---

// Maithea, the same real fixture system tests/world.test.mjs and
// tests/river-terrain.test.mjs use (G001/C2128,0,1/0), planet 1: a real
// giant-phase star (measured giantNs ~15.579 Gyr for this fixture) whose
// planet 1 is within the giant-phase envelope (engulfedNs === giantNs).
const MAITHEA_SYSTEM = system(refByAddress(galaxies(SEED)[0], 'G001/C2128,0,1/0'));
const MAITHEA_PLANET = MAITHEA_SYSTEM.planets[1];
const MAITHEA_STAR = MAITHEA_SYSTEM.stars.find(s => s.id === MAITHEA_PLANET.parentId) || MAITHEA_SYSTEM.stars[0];
const MAITHEA_STAR_LC = starLifecycle(SEED, dummyAddress, MAITHEA_STAR);

test('Maithea planet 1: biosphereStateAt is complex at CATALOGUE_EPOCH_NS, extinct at 15.6 Gyr (just past the measured ~15.579 Gyr giant/engulfment boundary) and extinct at 1e14 yr', () => {
  // Sanity-check the fixture still has the shape this test assumes (a giant
  // star with an engulfed planet 1) before asserting the derived biosphere.
  const planetLc = planetLifecycle(SEED, dummyAddress, MAITHEA_PLANET, MAITHEA_STAR_LC);
  assert.ok(planetLc.engulfedNs !== null, 'fixture assumption: Maithea planet 1 is within the giant-phase envelope');
  assert.ok(Math.abs(Number(MAITHEA_STAR_LC.giantNs) / Number(YEAR_NS) / 1e9 - 15.582) < 0.05, 'fixture assumption: star goes giant at ~15.582 Gyr');

  const atCatalogue = biosphereStateAt(SEED, MAITHEA_PLANET.id, MAITHEA_PLANET, CATALOGUE_EPOCH_NS, 'baseline', {}, MAITHEA_STAR_LC);
  assert.equal(atCatalogue.stage, 'complex');
  assert.ok(atCatalogue.species.length > 0);
  assert.equal(atCatalogue.version, BIOSPHERE_QUERY_VERSION);

  const t156 = 15_600_000_000n * YEAR_NS;
  const at156 = biosphereStateAt(SEED, MAITHEA_PLANET.id, MAITHEA_PLANET, t156, 'baseline', {}, MAITHEA_STAR_LC);
  assert.equal(at156.stage, 'extinct');
  assert.equal(at156.species.length, 0);
  assert.equal(at156.surfaceAvailable, false);

  const t1e14 = 100_000_000_000_000n * YEAR_NS;
  const at1e14 = biosphereStateAt(SEED, MAITHEA_PLANET.id, MAITHEA_PLANET, t1e14, 'baseline', {}, MAITHEA_STAR_LC);
  assert.equal(at1e14.stage, 'extinct');
  assert.equal(at1e14.species.length, 0);

  // Also confirm the underlying, unmodified biosphereAt() would (wrongly, in
  // isolation) still call this 'complex' -- proving biosphereStateAt is
  // doing real work here, not just forwarding.
  const surfaceMyr = Math.max(1, Math.round(Number(planetLc.coolingNs - planetLc.formationNs) / Number(1_000_000n*YEAR_NS)));
  const profile = profileFromPhysicalProperties(MAITHEA_PLANET, 'main-sequence');
  const world = generateBiosphere(SEED, profile, MAITHEA_PLANET.id, {surfaceMyr});
  const naiveAt1e14 = biosphereAt(world, planetAgeMyr(planetLc, t1e14));
  assert.equal(naiveAt1e14.stage, 'complex', 'biosphereAt alone has no engulfment/remnant notion and would clamp to "still alive forever"');
});

test('t-seek independence across the Maithea extinction boundary: biosphereStateAt(t) agrees regardless of visit order', () => {
  const checkpoints = [
    CATALOGUE_EPOCH_NS,
    MAITHEA_STAR_LC.giantNs - 1n,
    MAITHEA_STAR_LC.giantNs,
    MAITHEA_STAR_LC.giantNs + 1n,
    15_600_000_000n * YEAR_NS,
    MAITHEA_STAR_LC.remnantNs,
    100_000_000_000_000n * YEAR_NS,
    UNIVERSE_END_NS - 1n,
  ];
  const at = t => canonicalJSON(biosphereStateAt(SEED, MAITHEA_PLANET.id, MAITHEA_PLANET, t, 'baseline', {}, MAITHEA_STAR_LC));
  const forward = checkpoints.map(at);
  const reversed = checkpoints.slice().reverse().map(at);
  for (let i = 0; i < checkpoints.length; i++) assert.equal(reversed[checkpoints.length-1-i], forward[i]);
  const mid = checkpoints[Math.floor(checkpoints.length/2)];
  const direct = at(mid);
  for (const t of checkpoints) at(t);
  assert.equal(at(mid), direct);
});

test('biosphereStateAt: engulfment (condition 1/2) forces extinct even for a planet that would otherwise still be in its complex-biosphere window', () => {
  const planetLc = planetLifecycle(SEED, dummyAddress, MAITHEA_PLANET, MAITHEA_STAR_LC);
  const justBeforeEngulfment = biosphereStateAt(SEED, MAITHEA_PLANET.id, MAITHEA_PLANET, planetLc.engulfedNs - 1n, 'baseline', {}, MAITHEA_STAR_LC);
  const atEngulfment = biosphereStateAt(SEED, MAITHEA_PLANET.id, MAITHEA_PLANET, planetLc.engulfedNs, 'baseline', {}, MAITHEA_STAR_LC);
  assert.notEqual(justBeforeEngulfment.stage, 'extinct');
  assert.equal(atEngulfment.stage, 'extinct');
  assert.equal(atEngulfment.species.length, 0);
});

test('biosphereStateAt: a remnant star with the planet outside every habitable condition (condition 3) forces extinct even without engulfment', () => {
  let checked = 0;
  for (const {planet, star, bodyAddress} of PLANET_CORPUS) {
    const starLc = starLifecycle(SEED, dummyAddress, star);
    const planetLc = planetLifecycle(SEED, dummyAddress, planet, starLc);
    if (planetLc.engulfedNs !== null) continue; // isolate condition 3 from conditions 1/2
    const afterRemnant = starLc.remnantNs + 1_000n * YEAR_NS;
    assert.equal(starStateAt(starLc, afterRemnant).stage, 'remnant');
    const state = biosphereStateAt(SEED, bodyAddress, planet, afterRemnant, 'baseline', {}, starLc);
    assert.equal(state.stage, 'extinct', `${planet.id} must read extinct once its (never-engulfed) star is a remnant`);
    assert.equal(state.species.length, 0);
    checked++;
    if (checked >= 40) break;
  }
  assert.ok(checked >= 20, 'corpus must include enough never-engulfed planets whose star eventually becomes a remnant');
});

test('biosphereStateAt requires a resolved parentPlanet for a moon body', () => {
  const {moon, star} = MOON_CORPUS[0];
  const starLc = starLifecycle(SEED, dummyAddress, star);
  assert.throws(() => biosphereStateAt(SEED, moon.id, moon, 0n, 'baseline', {}, starLc), /parentPlanet/);
});
