// Acceptance (W1-A-CLASSIFIER, docs/biome-climate-increment-1-plan-2026-10-02.json):
// classifier v2 adds a climate field but no new t-dependence. Its only dated
// input is the bucketed water level from planetEnvironmentAt (via
// datedOceanState / surfaceAt), so classifier bytes at a date must be equal
// for a direct seek and after stepped playback through all five §3.2 tiers,
// and independent of body visit order and of climate-forcing cache warmth
// (contract §1.2 rule 2).
//
// Run this file explicitly (never the tests/acceptance/ directory; see helpers.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { galaxies, refByAddress, system } from '../../src/catalog.ts';
import { advanceDate, CATALOGUE_EPOCH_NS, YEAR_NS } from '../../src/world-time.ts';
import { starLifecycle, planetLifecycle } from '../../src/stellar-evolution.ts';
import { datedOceanState, planetEnvironmentAt, surfaceAt } from '../../src/world-surface.ts';
import { biomeClassifier } from '../../src/surface-biomes.ts';
import { clearClimateForcingCache, climateForcingCacheSize } from '../../src/surface-climate.ts';
import { canonicalJSON } from '../canonical-json.mjs';
import { SEED, dummyAddress, mulberry32, pseudoShuffle } from './helpers.mjs';

const YEAR_S = 31_557_600;
const TIERS = [
  { name: 'realtime', rate: 1 },
  { name: 'orbital', rate: 86400 * 30 },
  { name: 'historical', rate: 1e6 * YEAR_S },
  { name: 'geological', rate: 1e9 * YEAR_S },
  { name: 'cosmic', rate: 1e21 * YEAR_S },
];
const TARGET = CATALOGUE_EPOCH_NS + 32_000_000_000n; // catalogue epoch + 32 s

const g0 = galaxies(SEED)[0];
function planetEntry(sysId, index) {
  const sys = system(refByAddress(g0, sysId)), planet = sys.planets[index];
  const star = sys.stars.find(s => s.id === planet.parentId) || sys.stars[0];
  const starLc = starLifecycle(SEED, dummyAddress, star);
  return { planet, starLc, planetLc: planetLifecycle(SEED, dummyAddress, planet, starLc) };
}
// Maithea, Selawyn (89.8 deg tilt), Raes (ordinary), Raiva (low gravity), Lethuris (high gravity).
const BODIES = [
  planetEntry('G001/C2128,0,1/0', 1),
  planetEntry('G001/C2142,3,4/0', 0),
  planetEntry('G001/C2129,3,0/0', 1),
  planetEntry('G001/C2143,4,3/0', 1),
  planetEntry('G001/C2142,6,1/1', 1),
];
const fib = (i, n) => { const y = 1 - 2 * (i + .5) / n, p = i * 2.399963229728653, r = Math.sqrt(1 - y * y); return [Math.cos(p) * r, y, Math.sin(p) * r]; };

/** Classifier bytes for one body at date t: the dated water level comes from
 * planetEnvironmentAt (datedOceanState), and surfaceAt supplies real ground
 * heights at that date. */
function classifierBytesAt(entry, t) {
  const { planet, starLc, planetLc } = entry;
  const ocean = datedOceanState(planet, planetLc, starLc, t);
  assert.equal(planetEnvironmentAt(planet, planetLc, starLc, t).oceanAvailable, ocean.globalOceanAvailable);
  const classify = biomeClassifier(planet, ocean.waterLevelM);
  const rows = [];
  for (let i = 0; i < 48; i++) {
    const d = fib(i, 48);
    const at = surfaceAt(SEED, planet.id, planet, d, t, 'baseline', {}, starLc);
    const h = at.sample ? at.sample.groundHeightM : 0;
    for (const extra of [0, 1500, 6000]) for (const up of [1, .85]) rows.push(classify(d, h + extra, up));
  }
  return createHash('sha256').update(canonicalJSON({ waterLevelM: ocean.waterLevelM, rows })).digest('hex');
}

function playbackTicks(rand, t0, target, order) {
  const ticks = [t0];
  let t = t0, guard = 0, k = 0;
  const used = new Set();
  while (t < target && guard++ < 400) {
    // Visit every tier at least once (in `order`), then pick at random.
    const tier = k < order.length ? TIERS[order[k++]] : TIERS[Math.floor(rand() * TIERS.length)];
    used.add(tier.name);
    const next = advanceDate(t, 0.01 + rand() * 0.5, tier.rate); // geological steps stay below 0.51 Gyr
    t = next > target ? target : next;
    ticks.push(t);
  }
  if (ticks[ticks.length - 1] !== target) ticks.push(target);
  return { ticks, used };
}

test('classifier bytes at catalogue epoch +32 s: direct seek equals stepped playback over all five tiers', () => {
  const direct = BODIES.map(e => classifierBytesAt(e, TARGET));
  const rand = mulberry32(0x5eed1a);
  // Start 3 Gyr earlier so the slow tiers do real work before the cosmic tier lands on the target.
  const t0 = TARGET - 3_000_000_000n * YEAR_NS;
  // The cosmic tier always lands on (is clamped to) the target, so it comes last.
  for (const order of [[0, 1, 2, 3, 4], [3, 2, 1, 0, 4], [2, 0, 3, 1, 4]]) {
    const { ticks, used } = playbackTicks(rand, t0, TARGET, order);
    assert.equal(used.size, 5, `tiers used: ${[...used].join(',')}`);
    for (let b = 0; b < BODIES.length; b++) {
      // Evaluate along the way (the playback actually exercises intermediate dates).
      for (const t of ticks.slice(0, -1).filter((_, i) => i % 3 === 0)) classifierBytesAt(BODIES[b], t);
      assert.equal(classifierBytesAt(BODIES[b], ticks[ticks.length - 1]), direct[b], `body ${b} order ${order}`);
    }
  }
});

test('classifier bytes are independent of body visit order and of cold vs warm climate-forcing cache', () => {
  clearClimateForcingCache();
  assert.equal(climateForcingCacheSize(), 0);
  const cold = BODIES.map(e => classifierBytesAt(e, TARGET));
  assert.ok(climateForcingCacheSize() >= BODIES.length);
  const warm = BODIES.map(e => classifierBytesAt(e, TARGET));
  assert.deepEqual(warm, cold);
  const order = pseudoShuffle(BODIES.map((_, i) => i));
  assert.notDeepEqual(order, BODIES.map((_, i) => i));
  clearClimateForcingCache();
  const shuffled = new Array(BODIES.length);
  for (const i of order) shuffled[i] = classifierBytesAt(BODIES[i], TARGET);
  assert.deepEqual(shuffled, cold);
  // Reverse order on a warm cache.
  const reversed = new Array(BODIES.length);
  for (let i = BODIES.length - 1; i >= 0; i--) reversed[i] = classifierBytesAt(BODIES[i], TARGET);
  assert.deepEqual(reversed, cold);
});
