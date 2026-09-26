import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CURRENT_VERSIONS, PLAYBACK_TIERS, tierRate, advancePlayback,
  eraIndexAt, eraCheckpoint, nextEraCheckpoint, prevEraCheckpoint, eraTrackFraction,
  fineRangeForEra, fineFractionToT, tToFineFraction,
  encodeVersions, decodeVersions, resolveTimeFromUrl, writeTimeToUrl,
  groundedSeekFallback, safeScaleFactorAt, galaxyVisibility, canonicalDigest,
} from '../src/time-nav.ts';
import { CATALOGUE_EPOCH_NS, UNIVERSE_END_NS, YEAR_NS, tenToThe } from '../src/world-time.ts';
import { ERA_CHECKPOINTS } from '../src/cosmology.ts';

// --- era checkpoint ordering/monotonicity (also exercised directly by
// cosmology.test.mjs; repeated here against THIS module's own navigation
// helpers, which are what main.ts actually calls). ---
test('era checkpoints: eraIndexAt is monotonic non-decreasing and matches the checkpoint table', () => {
  let previous = -1;
  const probes = ERA_CHECKPOINTS.flatMap((c, i) => [c.tNs, c.tNs + 1n, i > 0 ? c.tNs - 1n : c.tNs]);
  for (const t of probes.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
    const idx = eraIndexAt(t);
    assert.ok(idx >= previous, `eraIndexAt(${t})=${idx} must not regress below ${previous}`);
    assert.ok(ERA_CHECKPOINTS[idx].tNs <= t, 'selected checkpoint must not be in the future of t');
    previous = idx;
  }
  assert.equal(eraIndexAt(0n), 0);
  assert.equal(eraIndexAt(UNIVERSE_END_NS), ERA_CHECKPOINTS.length - 1);
});
test('era navigation: next/prev bracket the current checkpoint and never go out of range', () => {
  assert.equal(prevEraCheckpoint(0n).id, 'big-bang');
  assert.equal(nextEraCheckpoint(UNIVERSE_END_NS).id, 'heat-death');
  const mid = CATALOGUE_EPOCH_NS + 1_000_000n * YEAR_NS;
  assert.equal(nextEraCheckpoint(mid).id, 'stelliferous-ends');
  assert.equal(prevEraCheckpoint(mid).id, 'catalogue-epoch');
  // Exactly on a checkpoint: "back" goes to the PREVIOUS checkpoint (not itself).
  assert.equal(prevEraCheckpoint(CATALOGUE_EPOCH_NS).id, 'galaxy-assembly');
});
test('eraTrackFraction is monotonically non-decreasing across the full range', () => {
  let previous = -1;
  for (const c of ERA_CHECKPOINTS) {
    const f = eraTrackFraction(c.tNs);
    assert.ok(f >= previous, `track fraction must not regress at ${c.id}`);
    assert.ok(f >= 0 && f <= 1, `track fraction out of [0,1] at ${c.id}: ${f}`);
    previous = f;
  }
});

// --- tier stepping ---
test('playback tiers: rates strictly increase from Realtime to Cosmic', () => {
  const order = PLAYBACK_TIERS.map((t) => t.rate);
  for (let i = 1; i < order.length; i++) assert.ok(order[i] > order[i - 1], `${PLAYBACK_TIERS[i].id} rate must exceed ${PLAYBACK_TIERS[i - 1].id}`);
  assert.equal(tierRate('orbital'), 86400 * 30, 'Orbital tier keeps the existing default 30-days/s rate');
});
test('advancePlayback: monotonic forward stepping at every tier, never throws, always in range', () => {
  for (const tier of PLAYBACK_TIERS.map((t) => t.id)) {
    let t = CATALOGUE_EPOCH_NS;
    for (let i = 0; i < 20; i++) {
      const next = advancePlayback(t, 0.1, tier);
      assert.ok(next >= t, `${tier}: time must not go backward`);
      assert.ok(next >= 0n && next <= UNIVERSE_END_NS, `${tier}: out of declared range`);
      t = next;
    }
  }
});
test('advancePlayback: a pathologically huge dt at the Cosmic tier saturates instead of throwing', () => {
  const next = advancePlayback(CATALOGUE_EPOCH_NS, 1e10, 'cosmic');
  assert.ok(next <= UNIVERSE_END_NS);
  assert.doesNotThrow(() => advancePlayback(0n, Number.MAX_VALUE, 'cosmic'));
});

// --- fine control ---
test('fine control: fineFractionToT/tToFineFraction round-trip and stay within era bounds', () => {
  for (let idx = 0; idx < ERA_CHECKPOINTS.length; idx++) {
    const { lo, hi } = fineRangeForEra(idx);
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      const t = fineFractionToT(idx, f);
      assert.ok(t >= lo && t <= hi, `era ${idx} f=${f}: t=${t} out of [${lo},${hi}]`);
      const back = tToFineFraction(idx, t);
      assert.ok(Math.abs(back - f) < 1e-6 || hi === lo, `era ${idx} f=${f}: round-trip got ${back}`);
    }
  }
});
test('fine control: catalogue-epoch era is a linear +-14 Gyr band around now, clamped to neighbours', () => {
  const idx = ERA_CHECKPOINTS.findIndex((c) => c.id === 'catalogue-epoch');
  const { lo, hi, unit } = fineRangeForEra(idx);
  assert.equal(unit, 'year');
  assert.ok(lo < CATALOGUE_EPOCH_NS && hi > CATALOGUE_EPOCH_NS);
  assert.ok(lo >= ERA_CHECKPOINTS[idx - 1].tNs, 'must not cross into the previous era');
  assert.ok(hi <= ERA_CHECKPOINTS[idx + 1].tNs, 'must not cross into the next era');
});

// --- URL migration round-trip (contract §6.2 compatibility requirement 3) ---
test('URL migration: absent date resolves to the default landing point (CATALOGUE_EPOCH_NS)', () => {
  assert.equal(resolveTimeFromUrl(new URLSearchParams('')), CATALOGUE_EPOCH_NS);
  assert.equal(resolveTimeFromUrl(new URLSearchParams('seed=X')), CATALOGUE_EPOCH_NS);
});
test('URL migration: an old date=<n> URL (no wv, or wv with atlas-time-1) is offset from CATALOGUE_EPOCH_NS', () => {
  const offsetNs = 86400_000_000_000n * 30n; // 30 days
  const legacy = new URLSearchParams(`date=${offsetNs}`);
  assert.equal(resolveTimeFromUrl(legacy), CATALOGUE_EPOCH_NS + offsetNs);
  const negativeOffset = new URLSearchParams(`date=-${offsetNs}`);
  assert.equal(resolveTimeFromUrl(negativeOffset), CATALOGUE_EPOCH_NS - offsetNs);
  const explicitOld = new URLSearchParams(`date=${offsetNs}&wv=atlas-time-1,x,x,x,x,x,x,x`);
  assert.equal(resolveTimeFromUrl(explicitOld), CATALOGUE_EPOCH_NS + offsetNs);
});
test('URL migration: a new URL (wv with atlas-time-2) carries an absolute t, no offset applied', () => {
  const absoluteT = tenToThe(12) * YEAR_NS;
  const params = new URLSearchParams();
  writeTimeToUrl(params, absoluteT);
  assert.equal(resolveTimeFromUrl(params), absoluteT);
});
test('URL round-trip: writeTimeToUrl -> resolveTimeFromUrl reproduces the exact same instant for arbitrary t, including the default', () => {
  for (const t of [0n, CATALOGUE_EPOCH_NS, CATALOGUE_EPOCH_NS + 12345n, tenToThe(50) * YEAR_NS, UNIVERSE_END_NS]) {
    const params = new URLSearchParams();
    writeTimeToUrl(params, t);
    assert.equal(resolveTimeFromUrl(params), t, `round-trip failed for t=${t}`);
  }
});

// --- Regression: tests/walking.mjs's moon-navigation double-offset report
// (observed: restored === sought + CATALOGUE_EPOCH_NS for a moon-navigation
// URL). Root-caused by reading resolveTimeFromUrl/writeTimeToUrl and every
// `date`/`wv` producer in src/ (main.ts's `persist()` is the only one and it
// always calls writeTimeToUrl, which unconditionally sets `wv` — see
// main.ts:889-902): the double-offset is NOT reachable through any in-app
// navigation path, and resolveTimeFromUrl's classification already matches
// contract §6.2 requirement 3 verbatim ("migrated ... only when the URL's
// WorldVersions.time is absent or atlas-time-1"). The two tests below pin
// that this IS the correct, contractual behaviour for both directions, using
// the exact reproduction shape from tests/walking.mjs line 72: a hand-built
// URLSearchParams carrying an already-absolute `date` (an atlas-time-2-style
// t, not a catalogue-relative offset) with NO `wv` field at all — which is
// exactly how that test's moon-navigation URL is assembled (it bypasses
// main.ts's persist()/writeTimeToUrl entirely and appends `date:
// sought.date.offsetNs` directly to a fresh URLSearchParams object).
//
// Per §6.2 requirement 3, a URL with no `wv` MUST be treated as legacy —
// there is no way for the consumer to distinguish "an absolute value that
// happens to be carried on a versionless URL" from a genuine pre-4D-contract
// bookmark (whose `date=<n>` is, by definition, a catalogue-relative offset).
// So resolveTimeFromUrl re-offsetting an absolute value here is not a
// consumer defect: it is the producer's obligation — as main.ts's own
// persist() already honours unconditionally — to always pair an absolute
// `date` with `wv`. tests/walking.mjs's line-72 URL violates that obligation
// (owned by another agent; not fixed here — see report).
test('regression (tests/walking.mjs moon-nav bug): a date-without-wv URL is ALWAYS legacy-interpreted, even when the value looks absolute — this is contractual, not a bug to "fix" by relaxing the condition', () => {
  // Reproduces the exact observed numbers from the walking.mjs failure.
  const sought = 435_494_880_003_155_760_000_000_000n; // an already-absolute t (atlas-time-2 style)
  const observedDoubled = 870_579_511_203_155_760_000_000_000n;
  assert.equal(sought + CATALOGUE_EPOCH_NS, observedDoubled, 'sanity: pins the exact reported arithmetic');
  const params = new URLSearchParams({ date: sought.toString() }); // no `wv` — exactly what walking.mjs:72 sends
  assert.equal(resolveTimeFromUrl(params), observedDoubled,
    'no-wv date is legacy-interpreted by design (contract §6.2 req. 3) — the fix belongs in the URL PRODUCER (always attach wv to an absolute date), not here');
});
test('regression companion: the SAME absolute t, produced the correct way (via writeTimeToUrl, which always attaches wv), restores unchanged', () => {
  const sought = 435_494_880_003_155_760_000_000_000n;
  const params = new URLSearchParams();
  writeTimeToUrl(params, sought); // what main.ts's persist() actually does for every in-app navigation, including to a moon
  assert.ok(params.has('wv'), 'sanity: writeTimeToUrl always attaches wv');
  assert.equal(resolveTimeFromUrl(params), sought, 'an absolute t written the contractual way must never be re-offset');
});
test('WorldVersions bundle: encode/decode round-trips exactly, and CURRENT_VERSIONS has all nine fields', () => {
  const fields = Object.keys(CURRENT_VERSIONS).sort();
  // Nine since galaxy-history.ts gained its own slot (contract §1.3): a
  // bookmark must record which galaxy-history algorithm produced it, because
  // galaxyStateAt's merge redirect changes merged-galaxy positions.
  assert.deepEqual(fields, ['biosphere', 'catalog', 'cosmology', 'galaxyHistory', 'history', 'space', 'surface', 'terrain', 'time']);
  const encoded = encodeVersions(CURRENT_VERSIONS);
  const decoded = decodeVersions(encoded);
  assert.deepEqual(decoded, CURRENT_VERSIONS);
  assert.equal(decodeVersions('too,few'), null);
});

// --- grounded-seek fallback (contract §3.3) ---
test('grounded seek: falls back to the nearest still-existing ancestor scope, never hovers over nothing', () => {
  assert.deepEqual(groundedSeekFallback({ galaxyExists: false, starExists: false, planetExists: false, planetWalkable: false, engulfed: false }).scope, 'universe');
  assert.equal(groundedSeekFallback({ galaxyExists: true, starExists: false, planetExists: false, planetWalkable: false, engulfed: false }).scope, 'galaxy');
  assert.equal(groundedSeekFallback({ galaxyExists: true, starExists: true, planetExists: false, planetWalkable: false, engulfed: false }).scope, 'system');
  assert.equal(groundedSeekFallback({ galaxyExists: true, starExists: true, planetExists: false, planetWalkable: false, engulfed: true }).scope, 'system');
  assert.equal(groundedSeekFallback({ galaxyExists: true, starExists: true, planetExists: true, planetWalkable: false, engulfed: false }).scope, 'body');
  const ok = groundedSeekFallback({ galaxyExists: true, starExists: true, planetExists: true, planetWalkable: true, engulfed: false });
  assert.equal(ok.scope, 'body');
  assert.equal(ok.hover, true);
});
test('grounded seek: hover is only offered when the target scope is body-level', () => {
  for (const ctx of [
    { galaxyExists: false, starExists: false, planetExists: false, planetWalkable: false, engulfed: false },
    { galaxyExists: true, starExists: false, planetExists: false, planetWalkable: false, engulfed: false },
    { galaxyExists: true, starExists: true, planetExists: false, planetWalkable: false, engulfed: false },
  ]) {
    assert.equal(groundedSeekFallback(ctx).hover, false);
  }
});

// --- horizon gating: finite at extreme far-future t (never Infinity/NaN into a transform) ---
test('horizon gating: safeScaleFactorAt and galaxyVisibility are always finite, never NaN, across 1e12/1e50/1e100 yr', () => {
  for (const exp of [9, 12, 14, 20, 50, 100]) {
    const t = tenToThe(exp) * YEAR_NS;
    const a = safeScaleFactorAt(t);
    assert.ok(Number.isFinite(a), `safeScaleFactorAt(1e${exp}yr) must be finite, got ${a}`);
    assert.ok(!Number.isNaN(a));
    for (const comovingMpc of [0, 1, 10, 4448]) {
      const vis = galaxyVisibility(comovingMpc, t);
      assert.ok(Number.isFinite(vis.aFactor));
      // properDistanceMpc is only guaranteed finite when the galaxy is
      // actually visible (an invisible one may report Infinity — a
      // diagnostic value never meant to reach a transform).
      if (vis.visible) assert.ok(Number.isFinite(vis.properDistanceMpc));
      assert.ok(!Number.isNaN(vis.properDistanceMpc));
      assert.equal(typeof vis.visible, 'boolean');
    }
  }
});
test('horizon gating: a galaxy far outside the shrinking late-time horizon is not visible', () => {
  const t = tenToThe(14) * YEAR_NS; // well past the horizon's collapse
  const vis = galaxyVisibility(10, t); // 10 Mpc comoving, larger than the ~1e-a Mpc horizon there
  assert.equal(vis.visible, false);
});
test('horizon gating: the observer\'s own galaxy (comoving distance 0) is always visible', () => {
  for (const exp of [12, 50, 100]) {
    const t = tenToThe(exp) * YEAR_NS;
    assert.equal(galaxyVisibility(0, t).visible, true);
  }
});
test('horizon gating: rejects a negative/non-finite comoving distance rather than propagating it', () => {
  assert.equal(galaxyVisibility(-5, CATALOGUE_EPOCH_NS).visible, false);
  assert.equal(galaxyVisibility(NaN, CATALOGUE_EPOCH_NS).visible, false);
  assert.equal(galaxyVisibility(Infinity, CATALOGUE_EPOCH_NS).visible, false);
});

// --- t-seek independence at the pure-helper level (contract §6.4 test 3) ---
test('t-seek independence: advancePlayback stepping to t agrees with a direct computation at t, for every pure query in this module', () => {
  const start = CATALOGUE_EPOCH_NS;
  const target = CATALOGUE_EPOCH_NS + 5_000_000_000n; // 5 s of sim-time at Realtime tier
  // Reach `target` by many small steps, in an arbitrary (non-uniform) step pattern.
  let stepped = start;
  const steps = [0.37, 1.1, 0.02, 2.5, 1.01]; // sums to 5.0 seconds at rate=1 (Realtime)
  for (const dt of steps) stepped = advancePlayback(stepped, dt, 'realtime');
  assert.equal(stepped, target, 'stepping must land exactly on target for this tier/step combination');
  const digestAt = (t) => canonicalDigest({
    era: eraIndexAt(t),
    fine: fineRangeForEra(eraIndexAt(t)),
    a: safeScaleFactorAt(t),
    horizon: galaxyVisibility(5, t),
  });
  assert.equal(digestAt(stepped), digestAt(target), 'direct t and stepped t must produce an identical digest');
  // And reaching the same t via a totally different step pattern still agrees.
  let steppedOther = start;
  for (const dt of [5.0]) steppedOther = advancePlayback(steppedOther, dt, 'realtime');
  assert.equal(digestAt(steppedOther), digestAt(target));
});
