import {test} from 'node:test';
import assert from 'node:assert/strict';
import {galaxyLifecycle, galaxyStateAt, resolveMergeTarget} from '../src/galaxy-history.ts';
import {CATALOGUE_EPOCH_NS, UNIVERSE_END_NS, YEAR_NS} from '../src/world-time.ts';
import {scaleFactorAt} from '../src/cosmology.ts';
import {galaxies} from '../src/catalog.ts';
import {canonicalJSON} from './canonical-json.mjs';

const SEED = 'LETHRA-001';
function legacyAddress(ordinal) {
  return {clusterCell:[0n,0n,0n], groupCell:[0n,0n,0n], galaxyOrdinal: ordinal};
}
const ADDRESSES = Array.from({length: 32}, (_, i) => legacyAddress(i));

test('galaxiesInGroup legacy root stays byte-identical: 32 lifecycle comoving positions match galaxies(seed)', () => {
  const legacy = galaxies(SEED);
  for (let i = 0; i < 32; i++) {
    const lifecycle = galaxyLifecycle(SEED, legacyAddress(i));
    assert.deepEqual(lifecycle.comovingPosition, legacy[i].position);
  }
});

test('determinism: same (seed, address) -> same lifecycle digest across repeated runs and shuffled order', () => {
  const digestOf = (addr) => canonicalJSON(galaxyLifecycle(SEED, addr));
  const forward = ADDRESSES.map(digestOf);
  const again = ADDRESSES.map(digestOf);
  assert.deepEqual(forward, again, 'repeated runs must match');
  const shuffled = ADDRESSES.slice().sort((a,b) => (a.galaxyOrdinal*2654435761)%97 - (b.galaxyOrdinal*2654435761)%97);
  const byOrdinal = new Map(ADDRESSES.map((a,i) => [a.galaxyOrdinal, forward[i]]));
  for (const addr of shuffled) assert.equal(digestOf(addr), byOrdinal.get(addr.galaxyOrdinal), 'visit order must not affect a given address');
});

test('at least 32 galaxies exercise birth, some merge, and merge pairing is symmetric', () => {
  let merging = 0;
  for (const addr of ADDRESSES) {
    const lifecycle = galaxyLifecycle(SEED, addr);
    assert.ok(lifecycle.birthNs > 0n && lifecycle.birthNs < UNIVERSE_END_NS);
    if (lifecycle.mergeNs !== null) {
      merging++;
      assert.ok(lifecycle.mergeNs > lifecycle.birthNs);
      assert.ok(lifecycle.mergedIntoAddress !== null);
      // Querying the survivor's own address must not claim IT merged away.
      const survivor = galaxyLifecycle(SEED, lifecycle.mergedIntoAddress);
      assert.equal(survivor.mergeNs, null, 'the surviving galaxy of a merger must not itself be marked merged');
    }
  }
  assert.ok(merging > 0, 'corpus must exercise at least one merger');
});

test('t-seek independence: galaxyStateAt(t) does not depend on how t was reached', () => {
  for (const addr of ADDRESSES.slice(0, 8)) {
    const lifecycle = galaxyLifecycle(SEED, addr);
    const checkpoints = [0n, lifecycle.birthNs/2n, lifecycle.birthNs, lifecycle.birthNs+1n,
      CATALOGUE_EPOCH_NS, lifecycle.mergeNs ?? CATALOGUE_EPOCH_NS*2n, UNIVERSE_END_NS-1n];
    for (const t of checkpoints) {
      const direct = galaxyStateAt(lifecycle, t);
      const again = galaxyStateAt(lifecycle, t);
      assert.deepEqual(direct, again, `${addr.galaxyOrdinal}@${t} must be stable across repeated evaluation`);
    }
  }
});

test('existence gating: unformed before birth, merged forever after mergeNs, active in between', () => {
  const merged = ADDRESSES.map(a => galaxyLifecycle(SEED, a)).find(l => l.mergeNs !== null);
  assert.ok(merged, 'need at least one merging galaxy to test the gate');
  assert.equal(galaxyStateAt(merged, merged.birthNs - 1n).stage, 'unformed');
  assert.equal(galaxyStateAt(merged, merged.birthNs).stage, 'active');
  assert.equal(galaxyStateAt(merged, merged.mergeNs - 1n).stage, 'active');
  assert.equal(galaxyStateAt(merged, merged.mergeNs).stage, 'merged');
  assert.equal(galaxyStateAt(merged, UNIVERSE_END_NS - 1n).stage, 'merged');
});

test('proper position at birth (zero elapsed time, zero peculiar drift) is exactly comoving * a(birthNs)', () => {
  // Isolates the a(t)-scaling term from the peculiar-motion term: at t=birthNs,
  // elapsed-since-birth is 0, so peculiarOffsetAt is exactly [0,0,0] and
  // properPosition must equal comovingPosition * a(birthNs) with no drift term.
  // (Peculiar drift is NOT expected to be small at CATALOGUE_EPOCH_NS — a few
  // hundred km/s sustained for Gyr-scale time genuinely displaces a galaxy by
  // an order-Mpc distance, which is the astrophysically correct magnitude.)
  for (const addr of ADDRESSES.slice(0, 8)) {
    const lifecycle = galaxyLifecycle(SEED, addr);
    const state = galaxyStateAt(lifecycle, lifecycle.birthNs);
    assert.equal(state.stage, 'active');
    const a = scaleFactorAt(lifecycle.birthNs);
    for (let k = 0; k < 3; k++)
      assert.ok(Math.abs(state.properPosition[k] - lifecycle.comovingPosition[k]*a) < 1e-9);
  }
});

test('peculiar motion freezes: offset stops growing past peculiarFreezeNs', () => {
  const lifecycle = galaxyLifecycle(SEED, legacyAddress(2));
  const tAtFreeze = lifecycle.birthNs + lifecycle.peculiarFreezeNs;
  const tPastFreeze = tAtFreeze + 50_000_000_000n*YEAR_NS; // 50 Gyr further, still tiny next to UNIVERSE_END_NS
  const cap = tPastFreeze < UNIVERSE_END_NS ? tPastFreeze : UNIVERSE_END_NS - 1n;
  if (lifecycle.mergeNs === null || lifecycle.mergeNs > cap) {
    const atFreeze = galaxyStateAt(lifecycle, tAtFreeze);
    const pastFreeze = galaxyStateAt(lifecycle, cap);
    for (let k = 0; k < 3; k++)
      assert.ok(Math.abs(atFreeze.properPosition[k] - pastFreeze.properPosition[k]) < 1e-6 + Math.abs(atFreeze.properPosition[k]*1e-6),
        'peculiar drift must be frozen (only a(t) may still move the proper position)');
  }
});

// ---------------------------------------------------------------------------
// Merge redirect (bug fix): galaxyStateAt now consults mergedIntoAddress.
// See tests/acceptance/existence-gating.test.mjs for the real-corpus
// 1-hop demonstration; these exercise resolveMergeTarget's CHAIN and CYCLE
// handling directly with synthetic lifecycles, since the real deterministic
// pairwise generator (MERGE_GROUP_SIZE=8, pairs of exactly 2) can only ever
// produce a 1-hop merge and can't exercise a 2+-hop chain or a cycle.
// ---------------------------------------------------------------------------
function syntheticAddress(ordinal) {
  return { clusterCell: [0n, 0n, 0n], groupCell: [0n, 0n, 0n], galaxyOrdinal: ordinal };
}

test('resolveMergeTarget: real 1-hop redirect matches galaxyStateAt\'s own merged-galaxy output', () => {
  const merged = ADDRESSES.map(a => galaxyLifecycle(SEED, a)).find(l => l.mergeNs !== null);
  assert.ok(merged, 'need at least one merging galaxy to test the redirect');
  const t = merged.mergeNs + 12_345n;
  const lookup = (addr) => galaxyLifecycle(SEED, addr);
  const target = resolveMergeTarget(lookup, merged.mergedIntoAddress, t);
  const mergedState = galaxyStateAt(merged, t);
  const targetState = galaxyStateAt(target, t);
  assert.equal(mergedState.stage, 'merged', 'sanity: the redirect must not change the do-not-render stage signal');
  if (targetState.stage === 'active') {
    assert.deepEqual(mergedState.properPosition, targetState.properPosition,
      'galaxyStateAt\'s internal merge resolution must agree with calling resolveMergeTarget directly and evaluating the resolved target');
  }
});

test('resolveMergeTarget: transitive chain (A -> B -> C) resolves fully through both hops once B has itself merged by t; stops at B when B has not yet merged', () => {
  const addrA = syntheticAddress(900), addrB = syntheticAddress(901), addrC = syntheticAddress(902);
  const lcA = { address: addrA, mergeNs: 100n, mergedIntoAddress: addrB };
  const lcB = { address: addrB, mergeNs: 200n, mergedIntoAddress: addrC };
  const lcC = { address: addrC, mergeNs: null, mergedIntoAddress: null };
  const byOrdinal = new Map([[addrA.galaxyOrdinal, lcA], [addrB.galaxyOrdinal, lcB], [addrC.galaxyOrdinal, lcC]]);
  const lookup = (addr) => byOrdinal.get(addr.galaxyOrdinal);

  // t=250: both A's hop (mergeNs=100) and B's own hop (mergeNs=200) are in
  // the past — chasing from A's mergedIntoAddress (B) must walk through B,
  // which is itself already merged, all the way to the terminal C.
  const resolvedFar = resolveMergeTarget(lookup, addrB, 250n);
  assert.equal(resolvedFar.address.galaxyOrdinal, addrC.galaxyOrdinal, 'must walk through B (itself merged by t=250) all the way to terminal C');

  // t=150: B has not yet merged (mergeNs=200 > 150) — the chain must stop at B, not overshoot to C.
  const resolvedNear = resolveMergeTarget(lookup, addrB, 150n);
  assert.equal(resolvedNear.address.galaxyOrdinal, addrB.galaxyOrdinal, 'must stop at B when B has not itself merged yet at this t');
});

test('resolveMergeTarget: a cycle in the merge-address graph throws loudly — a data-model invariant violation, never a silent truncation or fabricated position', () => {
  const addrA = syntheticAddress(910), addrB = syntheticAddress(911);
  const lcA = { address: addrA, mergeNs: 100n, mergedIntoAddress: addrB };
  const lcB = { address: addrB, mergeNs: 150n, mergedIntoAddress: addrA }; // cycle: B merges back "into" A
  const lookup = (addr) => (addr.galaxyOrdinal === addrA.galaxyOrdinal ? lcA : lcB);
  assert.throws(() => resolveMergeTarget(lookup, addrA, 200n), /merge cycle detected/,
    'a cyclic merge graph must fail loudly, not silently return a placeholder or the first-visited address');
});

test('resolveMergeTarget: a chain longer than MAX_MERGE_CHAIN_HOPS throws a distinct "exceeded hops" error, not a false cycle report', () => {
  const N = 80; // deliberately > 64 (MAX_MERGE_CHAIN_HOPS), every address distinct (this is a long chain, not a cycle)
  const addrOf = (i) => syntheticAddress(2000 + i);
  const lookup = (addr) => {
    const i = addr.galaxyOrdinal - 2000;
    const isTerminal = i >= N - 1;
    return { address: addr, mergeNs: isTerminal ? null : BigInt(i) * 10n, mergedIntoAddress: isTerminal ? null : addrOf(i + 1) };
  };
  assert.throws(() => resolveMergeTarget(lookup, addrOf(0), 1_000_000n), /exceeded \d+ hops/,
    'a long-but-acyclic chain must report hop-count exhaustion distinctly from a cycle');
});

test('ulp-perturbation: discrete stage/merge decisions are unchanged when Math transcendentals are perturbed', () => {
  const before = ADDRESSES.map(addr => {
    const l = galaxyLifecycle(SEED, addr);
    return canonicalJSON({birthNs:l.birthNs, quenchNs:l.quenchNs, mergeNs:l.mergeNs, mergedIntoAddress:l.mergedIntoAddress});
  });
  const originals = {sin: Math.sin, cos: Math.cos, exp: Math.exp, log: Math.log, pow: Math.pow, atan2: Math.atan2, tan: Math.tan, cbrt: Math.cbrt, acos: Math.acos, sinh: Math.sinh};
  const ulp = (f) => (...args) => { const v = f(...args); return v + (v === 0 ? Number.EPSILON : v * Number.EPSILON); };
  try {
    for (const k of Object.keys(originals)) Math[k] = ulp(originals[k]);
    const after = ADDRESSES.map(addr => {
      const l = galaxyLifecycle(SEED, addr);
      return canonicalJSON({birthNs:l.birthNs, quenchNs:l.quenchNs, mergeNs:l.mergeNs, mergedIntoAddress:l.mergedIntoAddress});
    });
    assert.deepEqual(after, before, 'birth/quench/merge decisions must be bit-identical under ulp-level Math perturbation');
  } finally {
    Object.assign(Math, originals);
  }
});
