/** Galaxy birth/merger/quench/peculiar motion as analytic, deterministic
 * functions of (seed, galaxy address, t) — contract §2.2, §4.2.
 *
 * `galaxyLifecycle` is `t`-independent (computed once per address);
 * `galaxyStateAt` is the cheap per-frame query. No N-body dynamics: peculiar
 * motion and mergers are seeded, scheduled, and analytic, never simulated
 * (contract §7.1).
 *
 * `galaxies(seed)` (Package B's legacy 32-galaxy array, kept as a back-compat
 * alias per contract §6.1) is read here only for its already-tested,
 * byte-identical positions at `clusterCell=groupCell=(0,0,0)` — the exact
 * legacy compatibility requirement in contract §6.2 #1. Addresses outside
 * that legacy root use a structurally-identical deterministic fallback until
 * Package B's `galaxiesInGroup`/`resolveGalaxy` land; that fallback is a
 * scaffold, not a claim about the eventual unbounded generator's output. */
import { galaxies, rng, type V3 } from './catalog.ts';
import { YEAR_NS, type Ns } from './world-time.ts';
import type { CellV3, GalaxyAddress } from './address.ts';
import { scaleFactorAt } from './cosmology.ts';

/** Galaxy history has its own `WorldVersions.galaxyHistory` slot (contract
 * §1.3, which now lists nine keys). Callers building a cache key for
 * `GalaxyLifecycle`/`galaxyStateAt` use that slot directly — do NOT fold this
 * version into `versions.cosmology`, which was the interim workaround while
 * §1.3 still listed eight fixed keys. The slot exists because `galaxyStateAt`
 * honours `mergedIntoAddress`: a merged galaxy's position depends on this
 * algorithm, so a bookmark must record which version produced it. */
// atlas-galaxy-history-2 (was -1): galaxyStateAt now actually consults
// mergedIntoAddress (contract §4.2's redirect) instead of returning a
// hardcoded [0,0,0] for every merged galaxy — a merged galaxy's
// properPosition output changes, so per §1.2 rule 4 ("a query's result must
// change if and only if its own version ... changes") this module's own
// version must bump alongside the fix.
export const GALAXY_HISTORY_VERSION = 'atlas-galaxy-history-2';

const KM_PER_MPC = 3.0856775814913673e19;
const MERGE_GROUP_SIZE = 8; // matches catalog.ts's `group = floor(i / 8)` clustering

export type GalaxyLifecycle = {
  // `address` and `seed` are implementation extensions beyond the contract's
  // §2.2 literal type (which lists neither) — `address` was already present
  // before this fix; `seed` is added here so `galaxyStateAt` can resolve a
  // merge-chain redirect (§4.2) by re-deriving the successor's own
  // GalaxyLifecycle without changing galaxyStateAt's public two-argument
  // (lifecycle, t) shape that the contract and every existing call site rely
  // on. Both are plain, already-known-at-construction-time data, not a
  // violation of purity: `galaxyLifecycle(seed, address)` is what produced
  // them in the first place.
  address: GalaxyAddress;
  seed: string;
  birthNs: Ns;
  quenchNs: Ns | null;
  mergeNs: Ns | null;
  mergedIntoAddress: GalaxyAddress | null;
  comovingPosition: V3;
  peculiarVelocityKmS: V3;
  peculiarFreezeNs: Ns;
};

function cellKey(c: CellV3): string {
  return c[0].toString() + ',' + c[1].toString() + ',' + c[2].toString();
}
/** Identifies a GalaxyAddress for merge-chain cycle/visited-set tracking —
 * deliberately seed-independent (unlike galaxyKey/groupKey/pairKey, which are
 * seeded RNG cache keys): two different seeds never appear in the same
 * resolution chain, so the address alone is a sufficient, simpler identity. */
function addressId(a: GalaxyAddress): string {
  return cellKey(a.clusterCell) + '/' + cellKey(a.groupCell) + '/' + a.galaxyOrdinal;
}
function isLegacyRoot(address: GalaxyAddress): boolean {
  return cellKey(address.clusterCell) === '0,0,0' && cellKey(address.groupCell) === '0,0,0';
}
function galaxyKey(seed: string, address: GalaxyAddress, tag: string): string {
  return JSON.stringify([seed, 'galaxy', cellKey(address.clusterCell), cellKey(address.groupCell), address.galaxyOrdinal, tag]);
}
function groupKey(seed: string, address: GalaxyAddress, tag: string): string {
  return JSON.stringify([seed, 'galaxy-group', cellKey(address.clusterCell), cellKey(address.groupCell), tag]);
}
function pairKey(seed: string, address: GalaxyAddress, lowOrdinal: number, highOrdinal: number): string {
  return JSON.stringify([seed, 'galaxy-pair', cellKey(address.clusterCell), cellKey(address.groupCell), lowOrdinal, highOrdinal]);
}
function between(key: string, min: number, max: number): number {
  return min + rng(key)() * (max - min);
}

function fallbackComovingPosition(seed: string, address: GalaxyAddress): V3 {
  const r = rng(galaxyKey(seed, address, 'fallback-position'));
  const a = r() * Math.PI * 2, d = 0.35 + r() * 1.25;
  const gx = Number(address.groupCell[0]), gz = Number(address.groupCell[2]);
  return [gx * 5 + Math.cos(a) * d, (r() - 0.5) * 2.8, gz * 5 + Math.sin(a) * d];
}

function galaxyBirthNs(seed: string, address: GalaxyAddress): Ns {
  // Galaxy assembly era, contract §3.1: ~0.4-3 Gyr (extended slightly below the
  // table's "~0.5" so the earliest catalogue galaxies can predate it, matching
  // the "first stars ~100-400 Myr" era immediately before).
  const years = Math.round(between(galaxyKey(seed, address, 'birth'), 4e8, 3e9));
  return BigInt(years) * YEAR_NS;
}

/** ordinal of this galaxy's deterministic merge partner within its
 * MERGE_GROUP_SIZE-wide subgroup (pairs (0,1) (2,3) (4,5) (6,7) ...). */
function pairPartnerOrdinal(ordinal: number): number {
  const subgroupStart = Math.floor(ordinal / MERGE_GROUP_SIZE) * MERGE_GROUP_SIZE;
  const local = ordinal - subgroupStart;
  const partnerLocal = local % 2 === 0 ? local + 1 : local - 1;
  return subgroupStart + partnerLocal;
}

function galaxyMerge(seed: string, address: GalaxyAddress): { mergeNs: Ns | null; mergedIntoAddress: GalaxyAddress | null } {
  const partnerOrdinal = pairPartnerOrdinal(address.galaxyOrdinal);
  if (partnerOrdinal === address.galaxyOrdinal) return { mergeNs: null, mergedIntoAddress: null };
  const lowOrdinal = Math.min(address.galaxyOrdinal, partnerOrdinal);
  const highOrdinal = Math.max(address.galaxyOrdinal, partnerOrdinal);
  const key = pairKey(seed, address, lowOrdinal, highOrdinal);
  const mergeGate = rng(key + '/gate')();
  if (mergeGate >= 0.4) return { mergeNs: null, mergedIntoAddress: null }; // ~40% of pairs merge before UNIVERSE_END_NS
  const survivorIsLow = rng(key + '/survivor')() < 0.5;
  const survivorOrdinal = survivorIsLow ? lowOrdinal : highOrdinal;
  if (address.galaxyOrdinal === survivorOrdinal) return { mergeNs: null, mergedIntoAddress: null };
  const birthLow = galaxyBirthNs(seed, { ...address, galaxyOrdinal: lowOrdinal });
  const birthHigh = galaxyBirthNs(seed, { ...address, galaxyOrdinal: highOrdinal });
  const laterBirth = birthLow > birthHigh ? birthLow : birthHigh;
  const offsetYears = Math.round(between(key + '/offset', 1e9, 6e9)); // 1-6 Gyr after the later birth
  const mergeNs = laterBirth + BigInt(offsetYears) * YEAR_NS;
  return { mergeNs, mergedIntoAddress: { ...address, galaxyOrdinal: survivorOrdinal } };
}

export function galaxyLifecycle(seed: string, address: GalaxyAddress): GalaxyLifecycle {
  const birthNs = galaxyBirthNs(seed, address);
  const quenchGate = rng(galaxyKey(seed, address, 'quench-gate'))();
  const quenchNs = quenchGate < 0.35
    ? birthNs + BigInt(Math.round(between(galaxyKey(seed, address, 'quench-offset'), 2e9, 11e9))) * YEAR_NS
    : null;
  const { mergeNs, mergedIntoAddress } = galaxyMerge(seed, address);
  const comovingPosition = isLegacyRoot(address) && address.galaxyOrdinal >= 0 && address.galaxyOrdinal < 32
    ? galaxies(seed)[address.galaxyOrdinal].position
    : fallbackComovingPosition(seed, address);
  const speed = between(galaxyKey(seed, address, 'peculiar-speed'), 50, 500); // km/s, typical peculiar-velocity magnitude
  const vr = rng(galaxyKey(seed, address, 'peculiar-direction'));
  const theta = vr() * Math.PI * 2, phi = Math.acos(2 * vr() - 1); // continuous direction draw, not existence-gating
  const peculiarVelocityKmS: V3 = [
    speed * Math.sin(phi) * Math.cos(theta),
    speed * Math.sin(phi) * Math.sin(theta),
    speed * Math.cos(phi),
  ];
  const peculiarFreezeNs = BigInt(Math.round(between(groupKey(seed, address, 'peculiar-freeze'), 2e9, 6e9))) * YEAR_NS; // shared per group ("turnaround time")
  return { address, seed, birthNs, quenchNs, mergeNs, mergedIntoAddress, comovingPosition, peculiarVelocityKmS, peculiarFreezeNs };
}

function peculiarOffsetAt(lifecycle: GalaxyLifecycle, t: Ns): V3 {
  const elapsed = t > lifecycle.birthNs ? t - lifecycle.birthNs : 0n;
  const clamped = elapsed < lifecycle.peculiarFreezeNs ? elapsed : lifecycle.peculiarFreezeNs;
  const seconds = Number(clamped) / 1e9;
  return lifecycle.peculiarVelocityKmS.map(v => v * seconds / KM_PER_MPC) as V3;
}

/** Proper position of a galaxy that is itself NOT merged at `t` (either
 * 'active', or 'unformed' if `t` is before its own birth — the latter is
 * defensive: the real pairwise `galaxyMerge` model always merges a galaxy
 * into an already-born survivor (`mergeNs > laterBirth`), so a merge target
 * that hasn't formed yet at `t >= mergeNs` should not occur, but a future,
 * more general merge generator is not contractually barred from producing
 * one, and this must still return a well-defined, non-fabricated value). */
function activeProperPosition(lifecycle: GalaxyLifecycle, t: Ns): V3 {
  if (t < lifecycle.birthNs) return [0, 0, 0];
  const a = scaleFactorAt(t);
  const peculiar = peculiarOffsetAt(lifecycle, t);
  return [
    lifecycle.comovingPosition[0] * a + peculiar[0],
    lifecycle.comovingPosition[1] * a + peculiar[1],
    lifecycle.comovingPosition[2] * a + peculiar[2],
  ];
}

/** Maximum merge-chain hops `resolveMergeTarget` will follow before treating
 * the chain as pathological. The real deterministic pairwise generator
 * (`galaxyMerge`, `MERGE_GROUP_SIZE`-wide subgroups paired 2-at-a-time) can
 * only ever produce 1-hop merges — a survivor's own `mergeNs` is always
 * `null` under that scheme (see `galaxyMerge`'s early-return when
 * `address.galaxyOrdinal === survivorOrdinal`) — so this bound is generous
 * headroom for a future, more general merge generator that DOES chain
 * (A -> B -> C -> ...), not a value tuned to today's data. */
const MAX_MERGE_CHAIN_HOPS = 64;

/** Chases `GalaxyLifecycle.mergedIntoAddress` transitively until it reaches
 * an address that is NOT itself merged at `t` (contract §4.2's "resolves
 * within the successor's frame", applied recursively for merge CHAINS: A
 * merges into B, and B has *itself* already merged into C by time `t` — then
 * A's position at `t` must resolve through C, not stop at B's now-also-stale
 * frame). `lookup` is injected — rather than hardwiring `galaxyLifecycle` +
 * a closed-over seed — purely so tests can exercise chain/cycle behaviour
 * with synthetic lifecycles; the real seeded pairwise model cannot produce a
 * chain longer than one hop (see MAX_MERGE_CHAIN_HOPS), so a genuine 2+-hop
 * chain can currently only be exercised with fabricated `lookup` data.
 *
 * Determinism / purity: this is a pure function of `(lookup, address, t)` —
 * the visited-set is local to one call and never memoized across calls, so
 * result stability under visit-order/cache-warmth/call-history variation
 * (contract §1.2 rule 2) holds trivially: nothing here depends on anything
 * outside its own arguments.
 *
 * Cycle semantics (the contract does not define this; decided here): a
 * cycle in the merge-address graph is a data-model invariant violation, not
 * a normal runtime condition — physically, a galaxy that has already merged
 * away cannot later be the survivor a still-earlier merger redirects into
 * (mergeNs strictly increases along any real chain, since each `mergeNs` is
 * bounded below by its pair's own birth times). The real generator cannot
 * produce one (see above), but nothing stops a future generator from doing
 * so by construction error. We fail LOUDLY here (throw) rather than
 * returning a placeholder position or silently truncating the chain,
 * because a fabricated-looking-valid position for a cyclic, physically
 * contradictory merge graph would be a much worse failure mode than a crash
 * pointing at the exact bad data — the same "loud, explicit rejection over
 * a silent clamp" bar this task applies to the UNIVERSE_END_NS range check. */
export function resolveMergeTarget(
  lookup: (address: GalaxyAddress) => GalaxyLifecycle,
  address: GalaxyAddress,
  t: Ns,
): GalaxyLifecycle {
  const visited = new Set<string>();
  let current = address;
  for (let hop = 0; hop <= MAX_MERGE_CHAIN_HOPS; hop++) {
    const id = addressId(current);
    if (visited.has(id)) {
      throw new Error(`galaxyStateAt: merge cycle detected in mergedIntoAddress chain at ${id} (t=${t.toString()}) — a galaxy's merge graph must be acyclic`);
    }
    visited.add(id);
    const lc = lookup(current);
    if (lc.mergeNs === null || t < lc.mergeNs) return lc; // not (yet, or ever) merged at t: chain ends here
    if (!lc.mergedIntoAddress) return lc; // defensive: mergeNs set without a target should not happen, but don't fabricate a further hop
    current = lc.mergedIntoAddress;
  }
  throw new Error(`galaxyStateAt: merge chain exceeded ${MAX_MERGE_CHAIN_HOPS} hops resolving from ${addressId(address)} (t=${t.toString()})`);
}

export function galaxyStateAt(lifecycle: GalaxyLifecycle, t: Ns): {
  stage: 'unformed' | 'active' | 'merged';
  properPosition: V3;
} {
  if (t < lifecycle.birthNs) return { stage: 'unformed', properPosition: [0, 0, 0] };
  if (lifecycle.mergeNs !== null && t >= lifecycle.mergeNs) {
    // Contract §4.2: "querying the merged galaxy's own address for its
    // position at t >= mergeNs resolves within the successor's frame via
    // mergedIntoAddress, not its own now-frozen comoving position" — chased
    // transitively (chain) with a cycle guard, both via resolveMergeTarget.
    const target = lifecycle.mergedIntoAddress
      ? resolveMergeTarget(addr => galaxyLifecycle(lifecycle.seed, addr), lifecycle.mergedIntoAddress, t)
      : null;
    return { stage: 'merged', properPosition: target ? activeProperPosition(target, t) : [0, 0, 0] };
  }
  return { stage: 'active', properPosition: activeProperPosition(lifecycle, t) };
}
