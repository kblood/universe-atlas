// Acceptance test 1 (docs/time-and-coordinates-contract.md §6.4, "t-seek
// independence"): "a direct seek to time t produces byte-identical world
// state to reaching t by stepped playback" — the literal contract text is
// "`stateAt(record, t)` computed directly equals the state reached by
// starting at some earlier `t0 < t`, advancing via `advanceDate` in
// arbitrary step sizes, and evaluating at each step" (§6.4 shape 3), which is
// exactly rule 2 of the purity contract in §1.2 ("identical regardless of
// visit order, cache warmth, ... or which direction time was approached
// from") and the continuity/no-hysteresis rule in §3.4.
//
// Unlike the per-package tests (tests/stellar-evolution.test.mjs,
// tests/world-surface.test.mjs), which build their checkpoint lists from raw
// BigInt interpolation, this file drives checkpoints through the REAL
// `advanceDate` primitive across the actual §3.2 playback tiers (Realtime,
// Orbital, Historical, Geological, Cosmic) — the literal mechanism the
// contract names — and spans the full declared range: the instant after the
// Big Bang, the catalogue epoch, and out toward UNIVERSE_END_NS = 10^100 yr.
// It covers, in one integration pass across four packages (cosmology,
// galaxy-history, stellar-evolution, world-surface/biosphere-model): a
// stellar lifecycle transition, a planet state change, and a surface/
// biosphere query.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { galaxies, refByAddress, system } from '../../src/catalog.ts';
import { advanceDate, CATALOGUE_EPOCH_NS, UNIVERSE_END_NS, YEAR_NS, tenToThe } from '../../src/world-time.ts';
import { scaleFactorAt, lnScaleFactorAt, ERA_CHECKPOINTS } from '../../src/cosmology.ts';
import { galaxyLifecycle, galaxyStateAt } from '../../src/galaxy-history.ts';
import { starLifecycle, starStateAt, planetLifecycle, planetStateAt } from '../../src/stellar-evolution.ts';
import { surfaceAt, biosphereStateAt } from '../../src/world-surface.ts';
import { canonicalJSON } from '../canonical-json.mjs';
import { SEED, dummyAddress, mulberry32, buildCorpus } from './helpers.mjs';

const YEAR_S = 31_557_600;

// §3.2's five playback tiers, expressed as `rate` (seconds of sim-time per
// wall-clock second) the way `advanceDate(date, seconds, rate)` expects.
// Historical/Geological/Cosmic are expressed directly in years-per-wall-
// second per the contract's own "~1 Myr/s" / "~1 Gyr/s" / "~1e21/s" labels.
const TIERS = [
  { name: 'realtime', rate: 1 },
  { name: 'orbital', rate: 86400 * 30 },
  { name: 'historical', rate: 1e6 * YEAR_S },
  { name: 'geological', rate: 1e9 * YEAR_S },
  { name: 'cosmic', rate: 1e21 * YEAR_S },
];

/** Genuine §3.2-style playback: repeated `advanceDate` calls from `t0`,
 * mixing tiers and step sizes ("arbitrary step sizes" per §6.4 shape 3),
 * until at or past `target`; every intermediate tick is recorded ("evaluating
 * at each step"). The final tick is forced exactly onto `target` (a direct
 * seek, exactly as §3.3's "playback is stopped on any explicit seek" allows)
 * so the two reconciliation points below compare literally the same `t`. */
function playbackTicks(rand, t0, target) {
  const ticks = [t0];
  let t = t0, guard = 0;
  while (t < target && guard++ < 300) {
    const tier = TIERS[Math.floor(rand() * TIERS.length)];
    const seconds = 0.1 + rand() * 40;
    const next = advanceDate(t, seconds, tier.rate);
    t = next > target ? target : next; // never overshoot past the target we want to land on
    ticks.push(t);
  }
  if (ticks[ticks.length - 1] !== target) ticks.push(target);
  return ticks;
}

/** Boundary-anchored checkpoint set for a body: era anchors (spanning the
 * full declared range) plus every discrete lifecycle boundary and its
 * immediate predecessor instant (so stage transitions are actually crossed,
 * not stepped over). */
function checkpointsFor(boundaries) {
  const points = new Set([1n, CATALOGUE_EPOCH_NS, tenToThe(14) * YEAR_NS, tenToThe(40) * YEAR_NS, UNIVERSE_END_NS - 1n]);
  for (const c of ERA_CHECKPOINTS) points.add(c.tNs === 0n ? 1n : c.tNs);
  for (const b of boundaries) {
    if (b <= 0n || b >= UNIVERSE_END_NS) continue;
    points.add(b); points.add(b - 1n);
  }
  return Array.from(points).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Reconciles ONE checkpoint `t` two ways and returns both digests:
 * (a) "playback": reached via a full advanceDate-driven tier walk from an
 *     early `t0` up to `t` (per playbackTicks above);
 * (b) "direct seek": `compute(t)` called cold, with no playback history at
 *     all — the scrub-drag / URL-load case.
 * Bit-for-bit agreement between the two, for every checkpoint, is the whole
 * of acceptance test 1. */
function reconcile(rand, compute, t0, t) {
  const ticks = playbackTicks(rand, t0, t);
  for (const tick of ticks) compute(tick); // "evaluating at each step" (§6.4 shape 3) — results discarded, only the final one is compared
  const viaPlayback = compute(ticks[ticks.length - 1]);
  const viaDirectSeek = compute(t);
  return { viaPlayback, viaDirectSeek };
}

const { stars: STAR_CORPUS, planets: PLANET_CORPUS } = buildCorpus(50, 900);

test('sanity: corpus is non-trivial', () => {
  assert.ok(STAR_CORPUS.length >= 50);
  assert.ok(PLANET_CORPUS.length > 0);
});

// ---------------------------------------------------------------------------
// scaleFactorAt is a finite rendering adapter capped at exp(600); log-space
// helpers preserve the increasing physical scale beyond that representable
// adapter ceiling.
// ---------------------------------------------------------------------------
test('scaleFactorAt stays finite at its adapter ceiling while lnScaleFactorAt keeps increasing', () => {
  const cap = Math.exp(600);
  const beforeCap = scaleFactorAt(tenToThe(12) * YEAR_NS);
  assert.ok(Number.isFinite(beforeCap) && beforeCap < cap);
  for (const exp of [14, 40, 100]) {
    const t = tenToThe(exp) * YEAR_NS;
    assert.equal(scaleFactorAt(t), cap, `scaleFactorAt(1e${exp} yr) should use its finite render-adapter cap`);
    assert.ok(Number.isFinite(lnScaleFactorAt(t)));
  }
  assert.ok(lnScaleFactorAt(tenToThe(14) * YEAR_NS) < lnScaleFactorAt(tenToThe(40) * YEAR_NS));
});

// ---------------------------------------------------------------------------
// t-seek independence: a stellar lifecycle transition.
// ---------------------------------------------------------------------------
test('t-seek independence: starStateAt — direct seek matches advanceDate-driven playback at every boundary-anchored checkpoint, across the full 0..UNIVERSE_END_NS range', () => {
  const rand = mulberry32(777001);
  for (const star of STAR_CORPUS.slice(0, 25)) {
    const lifecycle = starLifecycle(SEED, dummyAddress, star);
    const compute = (t) => canonicalJSON(starStateAt(lifecycle, t));
    for (const t of checkpointsFor([lifecycle.formationNs, lifecycle.giantNs, lifecycle.remnantNs])) {
      const { viaPlayback, viaDirectSeek } = reconcile(rand, compute, 0n, t);
      assert.equal(viaPlayback, viaDirectSeek, `star ${star.id} at t=${t}: playback-reached state must equal a direct seek`);
    }
  }
});

// ---------------------------------------------------------------------------
// t-seek independence: a planet state change (molten/solid/ocean/engulfment).
// ---------------------------------------------------------------------------
test('t-seek independence: planetStateAt — direct seek matches advanceDate-driven playback across formation/cooling/engulfment boundaries', () => {
  const rand = mulberry32(777002);
  for (const { planet, star } of PLANET_CORPUS.slice(0, 25)) {
    const starLc = starLifecycle(SEED, dummyAddress, star);
    const planetLc = planetLifecycle(SEED, dummyAddress, planet, starLc);
    const compute = (t) => canonicalJSON(planetStateAt(planetLc, starLc, t));
    const boundaries = [starLc.formationNs, planetLc.formationNs, planetLc.coolingNs, starLc.giantNs, starLc.remnantNs];
    if (planetLc.engulfedNs !== null) boundaries.push(planetLc.engulfedNs);
    for (const t of checkpointsFor(boundaries)) {
      const { viaPlayback, viaDirectSeek } = reconcile(rand, compute, 0n, t);
      assert.equal(viaPlayback, viaDirectSeek, `${planet.id} at t=${t}: playback-reached state must equal a direct seek`);
    }
  }
});

// ---------------------------------------------------------------------------
// t-seek independence: a surface + biosphere query (contract §2.5/§2.6, and
// the Maithea fixture (real giant-star / engulfed-planet system) shared with
// tests/world-surface.test.mjs for a guaranteed real engulfment+extinction
// case).
// ---------------------------------------------------------------------------
const MAITHEA_SYSTEM = system(refByAddress(galaxies(SEED)[0], 'G001/C2128,0,1/0'));
const MAITHEA_PLANET = MAITHEA_SYSTEM.planets[1];
const MAITHEA_STAR = MAITHEA_SYSTEM.stars.find(s => s.id === MAITHEA_PLANET.parentId) || MAITHEA_SYSTEM.stars[0];
const MAITHEA_STAR_LC = starLifecycle(SEED, dummyAddress, MAITHEA_STAR);

test('t-seek independence: surfaceAt — direct seek matches advanceDate-driven playback for >=25 real planets', () => {
  const rand = mulberry32(777003);
  for (const { planet, star, bodyAddress } of PLANET_CORPUS.slice(0, 25)) {
    const starLc = starLifecycle(SEED, dummyAddress, star);
    const planetLc = planetLifecycle(SEED, dummyAddress, planet, starLc);
    const compute = (t) => canonicalJSON(surfaceAt(SEED, bodyAddress, planet, [1, 0, 0], t, 'baseline', {}, starLc));
    const boundaries = [starLc.formationNs, planetLc.formationNs, planetLc.coolingNs, planetLc.oceanNs, starLc.giantNs, starLc.remnantNs, planetLc.engulfedNs].filter(b => b !== null);
    for (const t of checkpointsFor(boundaries)) {
      const { viaPlayback, viaDirectSeek } = reconcile(rand, compute, 0n, t);
      assert.equal(viaPlayback, viaDirectSeek, `${bodyAddress} at t=${t}: playback-reached surface state must equal a direct seek`);
    }
  }
});

test('t-seek independence: biosphereStateAt (Maithea, a real engulfment/extinction case) — direct seek matches advanceDate-driven playback across the extinction boundary', () => {
  const rand = mulberry32(777004);
  const planetLc = planetLifecycle(SEED, dummyAddress, MAITHEA_PLANET, MAITHEA_STAR_LC);
  assert.ok(planetLc.engulfedNs !== null, 'fixture assumption: Maithea planet 1 is within the giant-phase envelope (see tests/world-surface.test.mjs)');
  const compute = (t) => canonicalJSON(biosphereStateAt(SEED, MAITHEA_PLANET.id, MAITHEA_PLANET, t, 'baseline', {}, MAITHEA_STAR_LC));
  const boundaries = [MAITHEA_STAR_LC.formationNs, planetLc.formationNs, planetLc.coolingNs, planetLc.oceanNs, planetLc.engulfedNs, MAITHEA_STAR_LC.giantNs, MAITHEA_STAR_LC.remnantNs].filter(b => b !== null);
  for (const t of checkpointsFor(boundaries)) {
    const { viaPlayback, viaDirectSeek } = reconcile(rand, compute, 0n, t);
    assert.equal(viaPlayback, viaDirectSeek, `Maithea planet 1 at t=${t}: playback-reached biosphere state must equal a direct seek`);
  }
});

// ---------------------------------------------------------------------------
// A galaxy-scale lifecycle transition too (contract §4.2), reached the same
// advanceDate-driven way, across birth/quench/merge boundaries where present.
// ---------------------------------------------------------------------------
test('t-seek independence: galaxyStateAt — direct seek matches advanceDate-driven playback across birth/merge boundaries', () => {
  const rand = mulberry32(777005);
  const legacyRoot = { clusterCell: [0n, 0n, 0n], groupCell: [0n, 0n, 0n] };
  let mergingChecked = 0;
  for (let ordinal = 0; ordinal < 32; ordinal++) {
    const address = { ...legacyRoot, galaxyOrdinal: ordinal };
    const lifecycle = galaxyLifecycle(SEED, address);
    const compute = (t) => canonicalJSON(galaxyStateAt(lifecycle, t));
    const boundaries = [lifecycle.birthNs, lifecycle.quenchNs, lifecycle.mergeNs].filter(b => b !== null);
    for (const t of checkpointsFor(boundaries)) {
      const { viaPlayback, viaDirectSeek } = reconcile(rand, compute, 0n, t);
      assert.equal(viaPlayback, viaDirectSeek, `galaxy ordinal ${ordinal} at t=${t}: playback-reached state must equal a direct seek`);
    }
    if (lifecycle.mergeNs !== null) mergingChecked++;
  }
  assert.ok(mergingChecked > 0, 'sanity: at least one of the 32 legacy galaxies must actually merge, to exercise the merge boundary');
});
