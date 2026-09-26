// Acceptance test 3 (docs/time-and-coordinates-contract.md §6.4 /
// §2.6): "nothing is observable outside its [birthNs, deathNs); state(t) is
// consistent with the interval at both edges." §2.6's table is the spec:
//
//   Galaxy    | before birth: not rendered            | after death (merged): redirect to mergedIntoAddress; nothing renders at the old address
//   Star      | before birth: protostellar placeholder (data gate: not-exists) | after death: remnant render using outcome (exists)
//   Planet    | before birth: not rendered             | after death (engulfed): not rendered; otherwise still rendered, solid/frozen-ocean
//   Ocean     | n/a, gated by planet existence         | WaterKey ramp handles evaporation/freezing without deleting the body
//   Biosphere | not rendered before birthMyr            | not rendered after deathMyr
//
// The half-open interval means: state(birthNs) exists (birth is INCLUDED),
// state(birthNs - 1n) does not (excluded); state(deathNs) does NOT exist
// (death is EXCLUDED), state(deathNs - 1n) does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { galaxies, refByAddress, system } from '../../src/catalog.ts';
import { CATALOGUE_EPOCH_NS, UNIVERSE_END_NS, tenToThe, YEAR_NS } from '../../src/world-time.ts';
import { galaxyLifecycle, galaxyStateAt } from '../../src/galaxy-history.ts';
import { starLifecycle, starStateAt, planetLifecycle, planetStateAt, waterKeysFor } from '../../src/stellar-evolution.ts';
import { surfaceAt, biosphereStateAt, waterLevelAt } from '../../src/world-surface.ts';
import { SEED, dummyAddress, buildCorpus } from './helpers.mjs';

const { stars: STAR_CORPUS, planets: PLANET_CORPUS } = buildCorpus(60, 300);

test('sanity: corpus is non-trivial', () => {
  assert.ok(STAR_CORPUS.length >= 60);
  assert.ok(PLANET_CORPUS.length > 0);
});

// ---------------------------------------------------------------------------
// Star: half-open [formationNs, remnantNs-never-dies) — a star has no
// deathNs in this model (remnants persist forever, §7.1), so only the birth
// edge is a real existence boundary; giantNs/remnantNs are stage transitions
// within an always-"exists" star.
// ---------------------------------------------------------------------------
test('star existence gate: state(formationNs - 1) is unformed (not-exists, zeroed fields), state(formationNs) is main-sequence (exists), across the full corpus', () => {
  for (const star of STAR_CORPUS) {
    const lifecycle = starLifecycle(SEED, dummyAddress, star);
    assert.ok(lifecycle.formationNs > 0n, 'sanity: every star in this model forms strictly after the Big Bang');
    const before = starStateAt(lifecycle, lifecycle.formationNs - 1n);
    assert.equal(before.stage, 'unformed');
    assert.equal(before.radiusM, 0); assert.equal(before.temperatureK, 0); assert.equal(before.luminosityRel, 0);
    const at = starStateAt(lifecycle, lifecycle.formationNs);
    assert.equal(at.stage, 'main-sequence');
    assert.ok(at.radiusM > 0 && at.temperatureK > 0);
  }
});

test('star existence gate: a remnant persists (exists) through UNIVERSE_END_NS, no scripted extinction (§7.1)', () => {
  for (const star of STAR_CORPUS.slice(0, 200)) {
    const lifecycle = starLifecycle(SEED, dummyAddress, star);
    assert.equal(starStateAt(lifecycle, lifecycle.remnantNs).stage, 'remnant');
    assert.equal(starStateAt(lifecycle, UNIVERSE_END_NS - 1n).stage, 'remnant');
  }
});

// ---------------------------------------------------------------------------
// Planet: existence is exists=true only for molten/solid; the engulfment
// death boundary is a genuine half-open [birth, death) — dead at engulfedNs
// itself (excluded), alive at engulfedNs - 1n (included), and PERMANENTLY
// dead through and past the star's own remnantNs and UNIVERSE_END_NS.
// ---------------------------------------------------------------------------
test('planet existence gate: exists=false + sample=null strictly outside [formation, cooling-onward), exists=true inside, across a real corpus', () => {
  let engulfedChecked = 0, neverEngulfedChecked = 0;
  for (const { planet, star, bodyAddress } of PLANET_CORPUS) {
    const starLc = starLifecycle(SEED, dummyAddress, star);
    const planetLc = planetLifecycle(SEED, dummyAddress, planet, starLc);
    const at = (t) => surfaceAt(SEED, bodyAddress, planet, [1, 0, 0], t, 'baseline', {}, starLc);

    if (starLc.formationNs > 0n) {
      const beforeStar = at(starLc.formationNs - 1n);
      assert.equal(beforeStar.exists, false); assert.equal(beforeStar.sample, null);
    }
    const accreting = at(planetLc.formationNs - 1n);
    assert.equal(accreting.exists, false, `${bodyAddress}: t=formationNs-1 (accreting) must be not-exists`);
    assert.equal(accreting.sample, null, 'not-exists must never fabricate a sample');

    const justFormed = at(planetLc.formationNs);
    assert.equal(justFormed.exists, true, `${bodyAddress}: t=formationNs (birth, INCLUDED) must exist`);
    assert.equal(justFormed.stage, 'molten');

    if (planetLc.engulfedNs !== null) {
      engulfedChecked++;
      const justBefore = at(planetLc.engulfedNs - 1n);
      const atDeath = at(planetLc.engulfedNs);
      assert.notEqual(justBefore.exists, false, `${bodyAddress}: t=engulfedNs-1 (death - 1, INCLUDED) must still exist`);
      assert.equal(atDeath.exists, false, `${bodyAddress}: t=engulfedNs (death, EXCLUDED) must not exist`);
      assert.equal(atDeath.sample, null);
      assert.equal(atDeath.stage, 'engulfed');
      // Permanent: still dead arbitrarily far past death, through and beyond the star's own remnantNs.
      const afterRemnant = at(starLc.remnantNs);
      const atUniverseEnd = at(UNIVERSE_END_NS - 1n);
      assert.equal(afterRemnant.exists, false, 'engulfment is permanent through star death (§2.6)');
      assert.equal(atUniverseEnd.exists, false, 'engulfment is permanent through UNIVERSE_END_NS');
      assert.equal(atUniverseEnd.sample, null);
    } else {
      neverEngulfedChecked++;
      // §2.6: "otherwise still rendered, in solid/frozen-ocean state" — a
      // never-engulfed planet must still exist arbitrarily far in the future.
      const atUniverseEnd = at(UNIVERSE_END_NS - 1n);
      assert.equal(atUniverseEnd.exists, true, `${bodyAddress}: a never-engulfed planet must still exist at UNIVERSE_END_NS`);
      assert.equal(atUniverseEnd.stage, 'solid');
      assert.notEqual(atUniverseEnd.sample, null);
    }
  }
  assert.ok(engulfedChecked > 0, 'corpus must include at least one engulfed planet to exercise the death boundary');
  assert.ok(neverEngulfedChecked > 0, 'corpus must include at least one never-engulfed planet to exercise permanence');
});

// ---------------------------------------------------------------------------
// Ocean/water: "n/a, gated by planet existence" — no waterHeightM/ocean is
// ever fabricated while !exists (sample is null outright, covered above);
// once it exists, the global sea only appears from oceanNs onward, per the
// WaterKey ramp (§2.5), never before.
// ---------------------------------------------------------------------------
test('ocean existence gate: no global sea before oceanNs, even though the planet itself already exists (molten/solid but pre-condensation)', () => {
  let checked = 0;
  for (const { planet, star, bodyAddress } of PLANET_CORPUS.filter((p) => p.planet.water > 0)) {
    const starLc = starLifecycle(SEED, dummyAddress, star);
    const planetLc = planetLifecycle(SEED, dummyAddress, planet, starLc);
    if (planetLc.oceanNs === null) continue;
    if (planetLc.engulfedNs !== null && planetLc.engulfedNs <= planetLc.oceanNs) continue; // engulfed before ever forming an ocean
    const justBefore = surfaceAt(SEED, bodyAddress, planet, [1, 0, 0], planetLc.oceanNs - 1n, 'baseline', {}, starLc);
    assert.ok(justBefore.exists, 'sanity: the planet itself already exists at oceanNs-1');
    assert.equal(justBefore.sample.ocean, false, 'no global sea one instant before the ocean has condensed (§2.5/§2.6)');
    const keys = waterKeysFor(planetLc, starLc);
    assert.equal(waterLevelAt(keys, planetLc.oceanNs - 1n), keys[0].levelM, 'waterLevelAt clamps to the first key before it, per its documented contract');
    checked++;
  }
  assert.ok(checked > 5, 'corpus must include several wet, non-pre-engulfed planets to exercise this gate');
});

// ---------------------------------------------------------------------------
// Biosphere: existence gated by the composed surface+stellar-remnant rule
// (contract §2.4/§2.6 wired together in biosphereStateAt) — engulfment
// forces 'extinct' at exactly the death boundary, and it holds permanently.
// Uses the same real Maithea fixture (giant star, engulfed planet 1) that
// tests/world-surface.test.mjs establishes.
// ---------------------------------------------------------------------------
const MAITHEA_SYSTEM = system(refByAddress(galaxies(SEED)[0], 'G001/C2128,0,1/0'));
const MAITHEA_PLANET = MAITHEA_SYSTEM.planets[1];
const MAITHEA_STAR = MAITHEA_SYSTEM.stars.find((s) => s.id === MAITHEA_PLANET.parentId) || MAITHEA_SYSTEM.stars[0];
const MAITHEA_STAR_LC = starLifecycle(SEED, dummyAddress, MAITHEA_STAR);

test('biosphere existence gate: extinct is false one instant before engulfment (INCLUDED), true exactly at engulfment (death, EXCLUDED) and forever after', () => {
  const planetLc = planetLifecycle(SEED, dummyAddress, MAITHEA_PLANET, MAITHEA_STAR_LC);
  assert.ok(planetLc.engulfedNs !== null, 'fixture assumption: Maithea planet 1 is within the giant-phase envelope');
  const justBefore = biosphereStateAt(SEED, MAITHEA_PLANET.id, MAITHEA_PLANET, planetLc.engulfedNs - 1n, 'baseline', {}, MAITHEA_STAR_LC);
  const atDeath = biosphereStateAt(SEED, MAITHEA_PLANET.id, MAITHEA_PLANET, planetLc.engulfedNs, 'baseline', {}, MAITHEA_STAR_LC);
  assert.notEqual(justBefore.stage, 'extinct');
  assert.equal(atDeath.stage, 'extinct');
  assert.equal(atDeath.species.length, 0);
  assert.equal(atDeath.surfaceAvailable, false);
  const farFuture = biosphereStateAt(SEED, MAITHEA_PLANET.id, MAITHEA_PLANET, UNIVERSE_END_NS - 1n, 'baseline', {}, MAITHEA_STAR_LC);
  assert.equal(farFuture.stage, 'extinct', 'extinction is permanent, all the way to UNIVERSE_END_NS');
});

test('biosphere existence gate: a never-engulfed planet becomes extinct once its star is a permanent remnant, even without engulfment (§7.1 no remnant cooling stages)', () => {
  let checked = 0;
  for (const { planet, star, bodyAddress } of PLANET_CORPUS) {
    const starLc = starLifecycle(SEED, dummyAddress, star);
    const planetLc = planetLifecycle(SEED, dummyAddress, planet, starLc);
    if (planetLc.engulfedNs !== null) continue;
    const justBeforeRemnant = biosphereStateAt(SEED, bodyAddress, planet, starLc.remnantNs - 1n, 'baseline', {}, starLc);
    const atRemnant = biosphereStateAt(SEED, bodyAddress, planet, starLc.remnantNs, 'baseline', {}, starLc);
    void justBeforeRemnant; // giant-phase state just before remnant is not asserted here (covered elsewhere); the gate under test is the remnant boundary itself
    assert.equal(atRemnant.stage, 'extinct', `${bodyAddress} must be extinct once its star is a permanent remnant`);
    checked++;
    if (checked >= 30) break;
  }
  assert.ok(checked >= 20);
});

// ---------------------------------------------------------------------------
// Galaxy: birth boundary (unformed -> active, half-open, INCLUDED at
// birthNs) and the merge/death boundary ("nothing renders at the old
// address" — stage:'merged' from mergeNs onward, half-open, EXCLUDED before,
// permanent after), PLUS the §4.2 redirect itself: a merged galaxy's own
// address must resolve its properPosition within the survivor's frame via
// `mergedIntoAddress`, not a frozen/fabricated placeholder. (Previously,
// `galaxyStateAt` carried `mergedIntoAddress` in the record but never
// consulted it, returning a hardcoded [0,0,0] for every merged galaxy — see
// the final test below, which now asserts the FIXED behaviour.)
// ---------------------------------------------------------------------------
test('galaxy existence gate: unformed strictly before birthNs, active at birthNs, across all 32 legacy addresses', () => {
  for (let ordinal = 0; ordinal < 32; ordinal++) {
    const lifecycle = galaxyLifecycle(SEED, { clusterCell: [0n, 0n, 0n], groupCell: [0n, 0n, 0n], galaxyOrdinal: ordinal });
    const before = galaxyStateAt(lifecycle, lifecycle.birthNs - 1n);
    assert.equal(before.stage, 'unformed');
    assert.deepEqual(before.properPosition, [0, 0, 0]);
    const at = galaxyStateAt(lifecycle, lifecycle.birthNs);
    assert.equal(at.stage, 'active');
  }
});

test('galaxy existence gate: merge boundary is a genuine half-open death — active at mergeNs-1 (included), merged at mergeNs (excluded) and forever after', () => {
  let mergingChecked = 0;
  for (let ordinal = 0; ordinal < 32; ordinal++) {
    const lifecycle = galaxyLifecycle(SEED, { clusterCell: [0n, 0n, 0n], groupCell: [0n, 0n, 0n], galaxyOrdinal: ordinal });
    if (lifecycle.mergeNs === null) continue;
    mergingChecked++;
    const justBefore = galaxyStateAt(lifecycle, lifecycle.mergeNs - 1n);
    const atMerge = galaxyStateAt(lifecycle, lifecycle.mergeNs);
    const farFuture = galaxyStateAt(lifecycle, UNIVERSE_END_NS - 1n);
    assert.equal(justBefore.stage, 'active', `galaxy ${ordinal}: t=mergeNs-1 must still be active`);
    assert.equal(atMerge.stage, 'merged', `galaxy ${ordinal}: t=mergeNs must be merged`);
    assert.equal(farFuture.stage, 'merged', 'merged is permanent through UNIVERSE_END_NS');
  }
  assert.ok(mergingChecked > 0, 'sanity: at least one of the 32 legacy galaxies must merge');
});

test('FIXED (was a FINDING): a merged galaxy\'s properPosition redirects through mergedIntoAddress into the survivor\'s frame, per contract §4.2', () => {
  // Contract §4.2, verbatim: "querying the merged galaxy's own address for
  // its position at t >= mergeNs resolves within the successor's frame via
  // mergedIntoAddress, not its own now-frozen comoving position." Root
  // cause of the bug: `GalaxyLifecycle.mergedIntoAddress` was already
  // populated by `galaxyMerge`, but `galaxyStateAt` never read it, returning
  // a hardcoded [0,0,0] for every merged galaxy instead. Fixed in
  // src/galaxy-history.ts by resolving the (possibly transitive)
  // mergedIntoAddress chain via `resolveMergeTarget` and evaluating the
  // survivor's own active-position formula at the same `t`.
  let demonstrated = 0;
  for (let ordinal = 0; ordinal < 32; ordinal++) {
    const address = { clusterCell: [0n, 0n, 0n], groupCell: [0n, 0n, 0n], galaxyOrdinal: ordinal };
    const lifecycle = galaxyLifecycle(SEED, address);
    if (lifecycle.mergeNs === null || !lifecycle.mergedIntoAddress) continue;
    const t = lifecycle.mergeNs + 1_000_000n * YEAR_NS;
    const mergedState = galaxyStateAt(lifecycle, t);
    const survivorLifecycle = galaxyLifecycle(SEED, lifecycle.mergedIntoAddress);
    const survivorState = galaxyStateAt(survivorLifecycle, t);
    assert.equal(mergedState.stage, 'merged', 'the "nothing renders at the old address" half of §2.6 must still hold — stage stays merged');
    if (survivorState.stage === 'active') {
      // The redirect must be exact: the merged galaxy's properPosition at t
      // equals the survivor's own real proper position at that same t —
      // not a placeholder, and not independently recomputed by some other
      // path (both come from the identical activeProperPosition formula).
      assert.deepEqual(mergedState.properPosition, survivorState.properPosition,
        `galaxy ${ordinal}: merged properPosition must equal the survivor's real position ${JSON.stringify(survivorState.properPosition)}, got ${JSON.stringify(mergedState.properPosition)}`);
      assert.notDeepEqual(mergedState.properPosition, [0, 0, 0],
        'sanity: a real survivor position should not itself coincidentally be the origin (would make this test vacuous)');
      demonstrated++;
    }
  }
  assert.ok(demonstrated > 0, 'corpus must include at least one merge where the successor is independently active, to exercise the redirect');
});

test('merge redirect: exact boundary instant — properPosition redirects starting exactly at mergeNs, and equals a(t)/peculiar-consistent tracking of the survivor thereafter', () => {
  let checked = 0;
  for (let ordinal = 0; ordinal < 32; ordinal++) {
    const address = { clusterCell: [0n, 0n, 0n], groupCell: [0n, 0n, 0n], galaxyOrdinal: ordinal };
    const lifecycle = galaxyLifecycle(SEED, address);
    if (lifecycle.mergeNs === null || !lifecycle.mergedIntoAddress) continue;
    const survivorLifecycle = galaxyLifecycle(SEED, lifecycle.mergedIntoAddress);
    for (const t of [lifecycle.mergeNs, lifecycle.mergeNs + 1n, CATALOGUE_EPOCH_NS > lifecycle.mergeNs ? CATALOGUE_EPOCH_NS : lifecycle.mergeNs * 2n, UNIVERSE_END_NS - 1n]) {
      const mergedState = galaxyStateAt(lifecycle, t);
      const survivorState = galaxyStateAt(survivorLifecycle, t);
      assert.equal(mergedState.stage, 'merged');
      if (survivorState.stage === 'active') {
        assert.deepEqual(mergedState.properPosition, survivorState.properPosition, `galaxy ${ordinal} at t=${t}: redirect must track the survivor's live (a(t)-scaled, peculiar-drift) position exactly, not a value frozen at mergeNs`);
      } else {
        // Survivor itself unformed (shouldn't happen for the real pairwise
        // model, since mergeNs > survivor's own birth by construction) or
        // merged-again (a further chain hop) — either way the merged
        // galaxy's own state must stay a well-defined 'merged' with a
        // finite, non-NaN position (never fabricate stage:'active').
        assert.equal(mergedState.stage, 'merged');
        assert.ok(mergedState.properPosition.every(v => Number.isFinite(v)));
      }
      checked++;
    }
  }
  assert.ok(checked > 0, 'corpus must include at least one merge to exercise the boundary');
});
