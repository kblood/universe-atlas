// Acceptance test 2 (docs/time-and-coordinates-contract.md §6.4,
// "visit-order independence"): "enumerating/visiting objects in different
// orders yields identical results; no query mutates state that a later query
// reads." This is §1.2 rule 1 ("no ... worker completion order, no
// object-map iteration order as an input") and rule 2 ("identical regardless
// of visit order, cache warmth, worker count") made concrete across packages:
// galaxiesInGroup/galaxyLifecycle (Package A/B), starLifecycle/planetLifecycle
// (Package A), surfaceAt/biosphereStateAt (Package C), and address round-
// trips (Package B).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { galaxies, galaxiesInGroup } from '../../src/catalog.ts';
import { CATALOGUE_EPOCH_NS, UNIVERSE_END_NS, tenToThe, YEAR_NS } from '../../src/world-time.ts';
import { galaxyLifecycle, galaxyStateAt } from '../../src/galaxy-history.ts';
import { starLifecycle, starStateAt, planetLifecycle, planetStateAt } from '../../src/stellar-evolution.ts';
import { surfaceAt, biosphereStateAt } from '../../src/world-surface.ts';
import { parseAddress, formatAddress, resolveGalaxy } from '../../src/address.ts';
import { canonicalJSON } from '../canonical-json.mjs';
import { SEED, dummyAddress, hashIndex, pseudoShuffle, buildCorpus } from './helpers.mjs';

const { stars: STAR_CORPUS, planets: PLANET_CORPUS } = buildCorpus(60, 1400);

function byKeyForward(items, keyOf, valueOf) {
  const map = new Map();
  for (const item of items) map.set(keyOf(item), valueOf(item));
  return map;
}
function assertOrderIndependent(items, keyOf, valueOf, label) {
  const canonical = byKeyForward(items, keyOf, valueOf);
  const reversed = byKeyForward(items.slice().reverse(), keyOf, valueOf);
  const shuffled = byKeyForward(pseudoShuffle(items), keyOf, valueOf);
  const sortedByHash = byKeyForward(items.slice().sort((a, b) => hashIndex(keyOf(a)) - hashIndex(keyOf(b))), keyOf, valueOf);
  for (const [key, value] of canonical) {
    assert.equal(reversed.get(key), value, `${label}: reversed-order mismatch at ${key}`);
    assert.equal(shuffled.get(key), value, `${label}: shuffled-order mismatch at ${key}`);
    assert.equal(sortedByHash.get(key), value, `${label}: hash-sorted-order mismatch at ${key}`);
  }
}

test('sanity: corpus is non-trivial', () => {
  assert.ok(STAR_CORPUS.length >= 60);
  assert.ok(PLANET_CORPUS.length > 0);
});

// ---------------------------------------------------------------------------
// Galaxy hierarchy (Package B): visiting a mixed set of (clusterCell,
// groupCell) addresses — including the legacy root and huge/negative BigInt
// cells — in different orders must not change any individual cell's result.
// (tests/galaxy-hierarchy.test.mjs already covers this deeply for
// galaxiesInGroup alone; this exercises it as part of the cross-package
// acceptance shape, alongside the time-aware galaxyLifecycle/galaxyStateAt
// layered on top of it.)
// ---------------------------------------------------------------------------
const CELL_SAMPLES = [
  [[0n, 0n, 0n], [0n, 0n, 0n]], // legacy root
  [[0n, 0n, 0n], [3n, 7n, 11n]],
  [[1n, 0n, 0n], [0n, 0n, 0n]],
  [[-5n, 2n, -9n], [4n, 15n, 1n]],
  [[10n ** 9n, -(10n ** 9n), 3n], [7n, 18n, 0n]],
  [[123456789012345678901234567890n, 0n, -1n], [12n, 3n, 19n]],
];
function cellKey([c, g]) { return `${c.join(',')}|${g.join(',')}`; }

test('visit-order independence: galaxiesInGroup across mixed near/far cells', () => {
  assertOrderIndependent(
    CELL_SAMPLES,
    cellKey,
    ([c, g]) => canonicalJSON(galaxiesInGroup(SEED, c, g)),
    'galaxiesInGroup',
  );
});

test('visit-order independence: galaxyLifecycle/galaxyStateAt at several t across all 32 legacy-root addresses', () => {
  const addresses = Array.from({ length: 32 }, (_, i) => ({ clusterCell: [0n, 0n, 0n], groupCell: [0n, 0n, 0n], galaxyOrdinal: i }));
  const ts = [1n, CATALOGUE_EPOCH_NS, tenToThe(12) * YEAR_NS, UNIVERSE_END_NS - 1n];
  const cases = addresses.flatMap((a) => ts.map((t) => ({ a, t })));
  assertOrderIndependent(
    cases,
    (c) => `${c.a.galaxyOrdinal}|${c.t}`,
    (c) => canonicalJSON(galaxyStateAt(galaxyLifecycle(SEED, c.a), c.t)),
    'galaxyStateAt',
  );
});

// ---------------------------------------------------------------------------
// Stellar/planetary lifecycle (Package A).
// ---------------------------------------------------------------------------
test('visit-order independence: starLifecycle/starStateAt across a >=60-star corpus', () => {
  const ts = [1n, CATALOGUE_EPOCH_NS, UNIVERSE_END_NS - 1n];
  const cases = STAR_CORPUS.flatMap((star) => ts.map((t) => ({ star, t })));
  assertOrderIndependent(
    cases,
    (c) => `${c.star.id}|${c.t}`,
    (c) => canonicalJSON(starStateAt(starLifecycle(SEED, dummyAddress, c.star), c.t)),
    'starStateAt',
  );
});

test('visit-order independence: planetLifecycle/planetStateAt across a real planet corpus', () => {
  const sample = PLANET_CORPUS.slice(0, 150);
  const ts = [1n, CATALOGUE_EPOCH_NS, UNIVERSE_END_NS - 1n];
  const cases = sample.flatMap(({ planet, star }) => ts.map((t) => ({ planet, star, t })));
  assertOrderIndependent(
    cases,
    (c) => `${c.planet.id}|${c.t}`,
    (c) => {
      const starLc = starLifecycle(SEED, dummyAddress, c.star);
      return canonicalJSON(planetStateAt(planetLifecycle(SEED, dummyAddress, c.planet, starLc), starLc, c.t));
    },
    'planetStateAt',
  );
});

// ---------------------------------------------------------------------------
// Surface/biosphere (Package C).
// ---------------------------------------------------------------------------
test('visit-order independence: surfaceAt across a real planet corpus and several checkpoints', () => {
  const sample = PLANET_CORPUS.slice(0, 100);
  const ts = [1n, CATALOGUE_EPOCH_NS, UNIVERSE_END_NS - 1n];
  const cases = sample.flatMap(({ planet, star, bodyAddress }) => ts.map((t) => ({ planet, star, bodyAddress, t })));
  assertOrderIndependent(
    cases,
    (c) => `${c.bodyAddress}|${c.t}`,
    (c) => {
      const starLc = starLifecycle(SEED, dummyAddress, c.star);
      return canonicalJSON(surfaceAt(SEED, c.bodyAddress, c.planet, [1, 0, 0], c.t, 'baseline', {}, starLc));
    },
    'surfaceAt',
  );
});

test('visit-order independence: biosphereStateAt across a real planet corpus', () => {
  const sample = PLANET_CORPUS.slice(0, 60);
  const ts = [CATALOGUE_EPOCH_NS, UNIVERSE_END_NS - 1n];
  const cases = sample.flatMap(({ planet, star, bodyAddress }) => ts.map((t) => ({ planet, star, bodyAddress, t })));
  assertOrderIndependent(
    cases,
    (c) => `${c.bodyAddress}|${c.t}`,
    (c) => {
      const starLc = starLifecycle(SEED, dummyAddress, c.star);
      return canonicalJSON(biosphereStateAt(SEED, c.bodyAddress, c.planet, c.t, 'baseline', {}, starLc));
    },
    'biosphereStateAt',
  );
});

// ---------------------------------------------------------------------------
// Address parsing/resolution (Package B) — also order-independent.
// ---------------------------------------------------------------------------
test('visit-order independence: parseAddress/formatAddress/resolveGalaxy across a mixed address set', () => {
  const strings = [
    'G001', 'G001/C2128,0,1/0', 'G001/C-12,-4,7/3/star/0', 'G032',
    'U/K(12,-4,7)/H(3,1,18)/G007', 'U/K(1000000000,-1000000000,3)/H(7,18,0)/G012/C0,0,0/0/planet/0',
  ];
  assertOrderIndependent(strings, (s) => s, (s) => {
    const parsed = parseAddress(s);
    return canonicalJSON({ parsed, roundTrip: formatAddress(parsed), resolved: resolveGalaxy(SEED, { clusterCell: parsed.clusterCell, groupCell: parsed.groupCell, galaxyOrdinal: parsed.galaxyOrdinal }) });
  }, 'parseAddress/resolveGalaxy');
});

// ---------------------------------------------------------------------------
// "No query mutates state that a later query reads" (§6.4 shape 2's second
// clause): interleave calls for one planet with calls for many OTHER,
// unrelated planets/galaxies in between, and confirm the original planet's
// result — and the Body/StarLifecycle objects passed in — are unaffected.
// ---------------------------------------------------------------------------
test('no cross-contamination: interleaving queries for other bodies between two calls for the same body does not change the result or mutate inputs', () => {
  const target = PLANET_CORPUS[0];
  const others = PLANET_CORPUS.slice(1, 40);
  const starLc = starLifecycle(SEED, dummyAddress, target.star);
  const targetBodySnapshotBefore = canonicalJSON(target.planet);
  const starLcSnapshotBefore = canonicalJSON(starLc);

  const before = canonicalJSON(surfaceAt(SEED, target.bodyAddress, target.planet, [1, 0, 0], CATALOGUE_EPOCH_NS, 'baseline', {}, starLc));
  const beforeBio = canonicalJSON(biosphereStateAt(SEED, target.bodyAddress, target.planet, CATALOGUE_EPOCH_NS, 'baseline', {}, starLc));

  // Fire a substantial number of unrelated queries — other planets, other
  // times, other galaxies — in between.
  for (const { planet, star, bodyAddress } of others) {
    const otherStarLc = starLifecycle(SEED, dummyAddress, star);
    surfaceAt(SEED, bodyAddress, planet, [0, 1, 0], UNIVERSE_END_NS - 1n, 'baseline', {}, otherStarLc);
    biosphereStateAt(SEED, bodyAddress, planet, tenToThe(20) * YEAR_NS, 'baseline', {}, otherStarLc);
  }
  for (let ordinal = 0; ordinal < 32; ordinal++) {
    galaxyStateAt(galaxyLifecycle(SEED, { clusterCell: [0n, 0n, 0n], groupCell: [0n, 0n, 0n], galaxyOrdinal: ordinal }), tenToThe(12) * YEAR_NS);
  }

  const after = canonicalJSON(surfaceAt(SEED, target.bodyAddress, target.planet, [1, 0, 0], CATALOGUE_EPOCH_NS, 'baseline', {}, starLc));
  const afterBio = canonicalJSON(biosphereStateAt(SEED, target.bodyAddress, target.planet, CATALOGUE_EPOCH_NS, 'baseline', {}, starLc));
  assert.equal(after, before, 'surfaceAt for the original body must be unaffected by interleaved unrelated queries');
  assert.equal(afterBio, beforeBio, 'biosphereStateAt for the original body must be unaffected by interleaved unrelated queries');

  // The Body/StarLifecycle objects themselves must not have been mutated by
  // any of these calls (a query is a read, never a write, per §1.2).
  assert.equal(canonicalJSON(target.planet), targetBodySnapshotBefore, 'surfaceAt/biosphereStateAt must not mutate the Body it is given');
  assert.equal(canonicalJSON(starLc), starLcSnapshotBefore, 'surfaceAt/biosphereStateAt must not mutate the StarLifecycle it is given');
});
