import type {RiverRegion} from './river-types.ts';
import { densityOverview } from "./galaxy-field.ts";
import {phaseAt, type OrbitTime} from './world-time.ts';
import { expNeg, sine, logPos, detAtan2, detTan, detCbrt, detPow } from './det-math.ts';
// Type-only: erased at compile time, so this does NOT create a runtime
// circular dependency even though address.ts value-imports from this file
// (galaxiesInGroup/refByAddress) - see address.ts's module-doc for the
// deliberate one-directional-at-runtime import shape.
import type { CellV3 } from './address.ts';
/** Re-export for any existing caller of these pre-existing helper names. */
export { expNeg, sine, logPos };
/** Pure catalogue. No renderer state, wall clock, or exploration-order inputs. */
export const VERSION = "atlas-2.0.0";
export const LY = 9.4607304725808e15;
export const AU = 149597870700;
export const G = 6.6743e-11;
const MASK = (1n << 64n) - 1n;
export type V3 = [number, number, number];
export type Morphology =
  | "Spiral"
  | "Barred spiral"
  | "Elliptical"
  | "Irregular";
export interface Galaxy {
  id: string;
  name: string;
  type: Morphology;
  position: V3;
  rotation: V3;
  radiusLy: number;
  seed: string;
  arms: number;
  pitch: number;
  phase: number;
  tint: number;
}
export interface SystemRef {
  id: string;
  name: string;
  galaxyId: string;
  cell: V3;
  ordinal: number;
  position: V3;
  seed: string;
  color: string;
}
export interface Orbit {
  a: number;
  e: number;
  inclination: number;
  node: number;
  periapsis: number;
  anomaly: number;
  mu: number;
}
export interface Body {
  hydrology?: RiverRegion;
  id: string;
  name: string;
  kind: "star" | "planet" | "moon";
  type: string;
  parentId: string;
  massKg: number;
  radiusM: number;
  temperatureK: number;
  color: string;
  orbit: Orbit | null;
  seed: string;
  water: number;
  rings: boolean;
}
export interface StarSystem {
  id: string;
  name: string;
  ref: SystemRef;
  stars: Body[];
  planets: Body[];
  moons: Body[];
  belts: { id: string; name: string; innerM: number; outerM: number }[];
  version: string;
}
export function hash64(s: string): bigint {
  let h = 14695981039346656037n;
  for (const c of new TextEncoder().encode(s)) {
    h ^= BigInt(c);
    h = (h * 1099511628211n) & MASK;
  }
  return h;
}
export function pcg(initstate: bigint, initseq: bigint) {
  let state = 0n;
  const inc = ((initseq << 1n) | 1n) & MASK;
  const next = () => {
    const old = state;
    state = (old * 6364136223846793005n + inc) & MASK;
    const x = Number((((old >> 18n) ^ old) >> 27n) & 0xffffffffn) >>> 0;
    const rot = Number(old >> 59n);
    return ((x >>> rot) | (x << (-rot & 31))) >>> 0;
  };
  next();
  state = (state + initstate) & MASK;
  next();
  return next;
}
export function rng(key: string) {
  const next = pcg(hash64(key), hash64(key + "/stream"));
  return () => next() / 4294967296;
}
const start = [
  "Al",
  "An",
  "As",
  "Aur",
  "Bel",
  "Ca",
  "Cer",
  "Da",
  "El",
  "Er",
  "Es",
  "Hal",
  "Il",
  "Is",
  "Ka",
  "Kel",
  "La",
  "Leth",
  "Ly",
  "Ma",
  "Mer",
  "Na",
  "Ne",
  "Or",
  "Ra",
  "Sa",
  "Sel",
  "Ta",
  "Va",
  "Ve",
  "Yl",
  "Ze",
];
const middle = [
  "a",
  "ae",
  "ar",
  "e",
  "el",
  "en",
  "i",
  "il",
  "in",
  "o",
  "or",
  "u",
  "un",
  "y",
];
const end = [
  "ra",
  "ria",
  "ron",
  "ris",
  "th",
  "thea",
  "ven",
  "va",
  "lia",
  "lis",
  "nor",
  "nus",
  "s",
  "sara",
  "se",
  "tar",
  "tis",
  "une",
  "us",
  "wyn",
];
export function name(key: string) {
  const r = rng(key + "/name-v1");
  return (
    start[Math.floor(r() * start.length)] +
    middle[Math.floor(r() * middle.length)] +
    end[Math.floor(r() * end.length)]
  );
}
export function galaxies(seed: string): Galaxy[] {
  return Array.from({ length: 32 }, (_, i) => {
    const id = `G${String(i + 1).padStart(3, "0")}`;
    const key = JSON.stringify([seed, id]);
    const r = rng(key);
    const group = Math.floor(i / 8);
    const a = r() * Math.PI * 2,
      d = 0.35 + r() * 1.25;
    return {
      id,
      name: name(key),
      seed: key,
      type: (
        ["Spiral", "Barred spiral", "Elliptical", "Irregular"] as Morphology[]
      )[i % 4],
      position: [
        (group % 2) * 5 - 2.5 + Math.cos(a) * d,
        (r() - 0.5) * 2.8,
        Math.floor(group / 2) * 5 - 2.5 + Math.sin(a) * d,
      ],
      rotation: [(r() - 0.5) * 1.7, r() * 6.28, (r() - 0.5) * 0.6],
      radiusLy: 18000 + r() * 38000,
      arms: 2 + Math.floor(r() * 3),
      pitch: 0.22 + r() * 0.22,
      phase: r() * 6.28,
      tint: r(),
    };
  });
}

// ---------------------------------------------------------------------------
// Unbounded cluster -> group -> galaxy hierarchy (docs/time-and-coordinates-
// contract.md §5.1), replacing the fixed 32-array above with a lazily
// generated one. `galaxies(seed)` (above) is kept byte-for-byte unchanged
// and becomes the back-compat alias for the single legacy cell:
// `galaxiesInGroup(seed, [0n,0n,0n], [0n,0n,0n])` delegates to it directly,
// so every existing bookmark/screenshot/golden-digest keeps regenerating
// identically (hard requirement 1 of the contract).
//
// Mirrors address.ts's CLUSTER_MPC/GROUP_MPC as plain literals (not
// imported) to avoid a circular *runtime* value dependency between the two
// modules: address.ts already value-imports `galaxiesInGroup`/`refByAddress`
// from this file, so this file only ever type-imports from address.ts
// (`import type { CellV3 }`, erased at compile time) - see address.ts's
// module doc for the full explanation. If either literal changes, update
// both files.
const CLUSTER_MPC = 100;
const GROUP_MPC = 5;
const CELLS_PER_GROUP_AXIS = Math.round(CLUSTER_MPC / GROUP_MPC); // 20
const CELLS_PER_GROUP_AXIS_BIG = BigInt(CELLS_PER_GROUP_AXIS);

/** A non-legacy group's richness is a per-cell (not spatially-correlated)
 * Poisson draw, cubed to skew toward sparse/empty groups with an occasional
 * rich one - an engineering approximation in the same register as this
 * file's other density heuristics (spacing, moon-count, belt placement),
 * not a literal cosmic-web filament model. `GROUP_LAMBDA_MAX` is chosen so
 * a "rich" group's expected galaxy count is in the same ballpark as the
 * legacy group's fixed 32. */
const GROUP_LAMBDA_MAX = 40;
/** Placement radius for a galaxy within its group cell, in Mpc, kept
 * strictly under GROUP_MPC/2 so neighbouring group cells' galaxies never
 * overlap in the group-local frame each `Galaxy.position` is expressed in
 * (hard requirement 3: cell-local placement with margins). */
const GROUP_PLACEMENT_HALF_MPC = GROUP_MPC / 2 - 0.15;

/**
 * Canonical-address scheme (a) (coordinator directive, spatial-correctness
 * fix): `groupCell` is a LOCAL offset in `[0, CELLS_PER_GROUP_AXIS)^3`
 * *within* `clusterCell`, never an independent/global hash key. The GLOBAL
 * group index (5 Mpc/cell, unbounded) is `clusterCell*20 + groupCell`, and
 * that decomposition is a bijection (Euclidean floor-div/mod), so every
 * universe position has exactly one valid `(clusterCell, groupCell)`
 * address - there is no longer a second, differently-spelled pair that
 * hashes to the same or an overlapping region. `groupGalaxyCount` and
 * `galaxiesInGroup` both validate this and throw for an out-of-range
 * `groupCell` rather than silently accepting an ambiguous pair (mirrored in
 * `address.ts`'s `parseAddress`, which rejects the same condition when
 * parsing a `U/K(...)/H(...)/` string). `groupsInCluster`'s own local (x,y,z)
 * loop already produced exactly this shape before the fix; only
 * `groupGalaxyCount`/`galaxiesInGroup` were missing the validation.
 */
function isLocalGroupCell(c: CellV3): boolean {
  return (
    c[0] >= 0n && c[0] < CELLS_PER_GROUP_AXIS_BIG &&
    c[1] >= 0n && c[1] < CELLS_PER_GROUP_AXIS_BIG &&
    c[2] >= 0n && c[2] < CELLS_PER_GROUP_AXIS_BIG
  );
}
function requireLocalGroupCell(groupCell: CellV3): void {
  if (!isLocalGroupCell(groupCell)) {
    throw new RangeError(
      `groupCell (${cellKey(groupCell)}) must be a local offset in [0, ${CELLS_PER_GROUP_AXIS})^3 ` +
        `within its clusterCell (address scheme a, §5.1) - it is not a global/independent cell index.`,
    );
  }
}

/**
 * Legacy-overlap exclusion volume (coordinator directive, spatial-
 * correctness fix): the legacy 32-galaxy catalogue (group (0,0,0) of cluster
 * (0,0,0), `galaxies()` above, untouched) places each galaxy at
 * `[(group%2)*5-2.5 + cos(a)*d, (r-0.5)*2.8, floor(group/2)*5-2.5 + sin(a)*d]`
 * with `d` in `[0.35, 1.6)` - an ANALYTIC (seed-independent) worst case of
 * `[±4.1, ±1.4, ±4.1]` Mpc (a specific fixture seed measures somewhat
 * tighter, e.g. `[±3.864, ±1.396, ±3.950]` for `tests/fixtures/legacy-
 * galaxies.json`, but the exclusion volume must hold for *every* seed, not
 * just the one that happened to be measured). This exceeds
 * `GROUP_PLACEMENT_HALF_MPC` (2.35 Mpc) and so spills into the eight group
 * cells immediately adjacent to the origin. `LEGACY_EXCLUSION_HALF_MPC` is
 * sized so that, even in the worst case (a legacy galaxy sitting exactly at
 * the analytic bound on one axis, and an accepted neighbour candidate
 * sitting exactly on the rejection boundary on that same axis, with
 * coincident values on the other two axes), the resulting gap is still
 * >= `MIN_SEPARATION_MPC`: `LEGACY_EXCLUSION_HALF_MPC[i] >= analyticMax[i] +
 * MIN_SEPARATION_MPC/2 + MIN_SEPARATION_MPC` per axis (`isNearOrigin`'s own
 * exclusion-box gate already only fires this close to the origin).
 * `MIN_SEPARATION_MPC` is the documented minimum inter-galaxy separation -
 * `withMinSeparation` (below) enforces it between any two galaxies placed in
 * the SAME group cell, UNIVERSALLY (every non-legacy cell in the universe,
 * not just near the origin - the spatial-correctness gap this pass exists to
 * close). It does NOT apply between two legacy galaxies (their mutual
 * spacing is frozen, per-seed randomness this fix cannot and must not touch;
 * see the "no two galaxies..." acceptance test in
 * tests/galaxy-hierarchy.test.mjs for the precise scoping). The LEGACY
 * EXCLUSION BOX, unlike `withMinSeparation`, stays scoped by `isNearOrigin`:
 * it only geometrically reaches cells whose GLOBAL group index is within one
 * cell of the origin on every axis (cell pitch 5 Mpc vs. box half-extent
 * <=4.7 Mpc + placement radius 2.35 Mpc); `isNearOrigin` additionally covers
 * the full +-2 window to match the documented 5x5x5 guarantee. The exclusion
 * check is skipped (zero cost) for every other cell in the universe; the
 * min-separation pass runs everywhere but is O(n^2) in a cell's own (small,
 * Poisson-bounded) galaxy count, so its added cost is small - see the timing
 * note on `groupsInCluster` below.
 */
const LEGACY_EXCLUSION_HALF_MPC: V3 = [4.7, 2.0, 4.7];
const MIN_SEPARATION_MPC = 0.3;

function isZeroCell(c: CellV3): boolean {
  return c[0] === 0n && c[1] === 0n && c[2] === 0n;
}
function cellKey(c: CellV3): string {
  return c.map(String).join(",");
}
function groupStreamKey(seed: string, clusterCell: CellV3, groupCell: CellV3): string {
  return JSON.stringify([seed, "group", cellKey(clusterCell), cellKey(groupCell)]);
}
function galaxyStreamKey(seed: string, clusterCell: CellV3, groupCell: CellV3, ordinal: number): string {
  return JSON.stringify([seed, "galaxy", cellKey(clusterCell), cellKey(groupCell), ordinal]);
}

/** Raw (pre-legacy-exclusion) Poisson galaxy count for a non-legacy cell. */
function rawGroupGalaxyCount(seed: string, clusterCell: CellV3, groupCell: CellV3): number {
  const key = groupStreamKey(seed, clusterCell, groupCell);
  const lambda = GROUP_LAMBDA_MAX * detPow(rng(key + "/richness")(), 3);
  return poisson(lambda, rng(key + "/count"));
}

/** Global (unbounded, 5-Mpc-per-cell) group index for `(clusterCell,
 * groupCell)` under scheme (a): `clusterCell*20 + groupCell`. */
function globalGroupIndex(clusterCell: CellV3, groupCell: CellV3): CellV3 {
  return [
    clusterCell[0] * CELLS_PER_GROUP_AXIS_BIG + groupCell[0],
    clusterCell[1] * CELLS_PER_GROUP_AXIS_BIG + groupCell[1],
    clusterCell[2] * CELLS_PER_GROUP_AXIS_BIG + groupCell[2],
  ];
}
/** True for the legacy cell itself and every cell in the 5x5x5 group window
 * around it (global index in [-2,2] on every axis). Gates ONLY the legacy-
 * exclusion-box check now (`inLegacyExclusion`) - the legacy exclusion box
 * only geometrically reaches the immediate (+-1) neighbours (cell pitch
 * 5 Mpc vs. box half-extent <=4.7 Mpc + placement radius 2.35 Mpc), and the
 * full +-2 window matches the coordinator's documented minimum-separation
 * acceptance test window. The same-cell minimum-separation pass
 * (`withMinSeparation`) is UNIVERSAL - applied to every non-legacy group
 * cell in the universe, not just this window - so `isNearOrigin` no longer
 * gates it (still cheap here: 125 cells for the exclusion check, zero cost
 * everywhere else). */
function isNearOrigin(globalIdx: CellV3): boolean {
  return (
    globalIdx[0] >= -2n && globalIdx[0] <= 2n &&
    globalIdx[1] >= -2n && globalIdx[1] <= 2n &&
    globalIdx[2] >= -2n && globalIdx[2] <= 2n
  );
}
function inLegacyExclusion(abs: V3): boolean {
  const margin = MIN_SEPARATION_MPC / 2;
  return (
    Math.abs(abs[0]) < LEGACY_EXCLUSION_HALF_MPC[0] + margin &&
    Math.abs(abs[1]) < LEGACY_EXCLUSION_HALF_MPC[1] + margin &&
    Math.abs(abs[2]) < LEGACY_EXCLUSION_HALF_MPC[2] + margin
  );
}

function dist3(a: V3, b: V3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Greedy in-ordinal-order accept/reject pass enforcing `MIN_SEPARATION_MPC`
 * between any two galaxies placed in the SAME group cell. Applied to EVERY
 * non-legacy group cell in the universe (the spatial-correctness fix this
 * function exists for) - cross-cell separation is already guaranteed
 * everywhere by `GROUP_PLACEMENT_HALF_MPC`'s margin design
 * (`GROUP_MPC - 2*GROUP_PLACEMENT_HALF_MPC === MIN_SEPARATION_MPC` exactly),
 * but nothing previously stopped two galaxies independently placed *within
 * the same cell* from landing arbitrarily close together, anywhere outside
 * the old near-origin-only window.
 *
 * Determinism: each candidate is generated independently from its own
 * `(clusterCell, groupCell, ordinal)` PCG stream (`generatedGalaxy`, no
 * shared mutable state) and gets exactly one placement attempt - a rejected
 * candidate is dropped, never re-drawn from that or any other stream, so the
 * result cannot depend on visit order (this cell's own output never changes
 * based on which other cells were generated before/after it) or on how many
 * attempts a candidate "used" elsewhere. The sweep itself is a pure,
 * fixed-ordinal-order pass (candidate `i` is compared only against already-
 * accepted candidates `< i`) over this cell's own data only.
 *
 * Distances are compared in the cell-LOCAL frame (`g.position`, not an
 * absolute/global coordinate): every candidate compared here was placed
 * within this same group cell, so their local positions are already
 * directly comparable and no cell-center offset needs to be added first -
 * that offset only matters for the separate, near-origin-only legacy-
 * exclusion check below, which compares against a fixed box in *absolute*
 * coordinates. Only basic +,-,*,/,Math.hypot go into the comparison - no
 * platform transcendental, so this needs no det-math routing (unlike the
 * discrete Poisson-count decision above). */
function withMinSeparation(raw: Galaxy[]): Galaxy[] {
  const accepted: Galaxy[] = [];
  for (const g of raw) {
    if (accepted.some((other) => dist3(g.position, other.position) < MIN_SEPARATION_MPC)) continue;
    accepted.push(g);
  }
  return accepted;
}

/** Full (legacy-exclusion + min-separation filtered) galaxy list for a
 * non-legacy cell - shared by `groupGalaxyCount` (`.length`) and
 * `galaxiesInGroup` (the array itself) so there is exactly one source of
 * truth for "how many"/"which". Each raw candidate is generated
 * independently from its own `(clusterCell, groupCell, ordinal)` key (no
 * shared state, no visit-order dependence); filtering is a pure sweep over
 * that same per-cell data, so it stays deterministic and independent of any
 * *external* visit order (generating this cell before/after any other cell
 * never changes its own result).
 *
 * Two independent problems are fixed here, with two different scopes:
 *  1. legacy overlap: a candidate whose position falls inside the legacy
 *     catalogue's (padded) bounding box is rejected outright - only
 *     possible near the origin (`isNearOrigin`), since that is the only
 *     place the legacy box geometrically reaches;
 *  2. same-cell crowding (`withMinSeparation` above): applied UNIVERSALLY,
 *     to every non-legacy cell, not just the near-origin window - this is
 *     the fix for the gap where far-away cells had no same-cell separation
 *     guarantee at all. */
function filteredGalaxies(seed: string, clusterCell: CellV3, groupCell: CellV3): Galaxy[] {
  const count = rawGroupGalaxyCount(seed, clusterCell, groupCell);
  const raw = Array.from({ length: count }, (_, i) => generatedGalaxy(seed, clusterCell, groupCell, i));
  const globalIdx = globalGroupIndex(clusterCell, groupCell);
  if (!isNearOrigin(globalIdx)) return withMinSeparation(raw);
  const cellCenterMpc: V3 = [
    Number(globalIdx[0]) * GROUP_MPC,
    Number(globalIdx[1]) * GROUP_MPC,
    Number(globalIdx[2]) * GROUP_MPC,
  ];
  const clearOfLegacy = raw.filter((g) => {
    const abs: V3 = [
      cellCenterMpc[0] + g.position[0],
      cellCenterMpc[1] + g.position[1],
      cellCenterMpc[2] + g.position[2],
    ];
    return !inLegacyExclusion(abs);
  });
  return withMinSeparation(clearOfLegacy);
}

/** How many galaxies a (cluster,group) cell holds - a pure function of the
 * three keys, independent of any neighbouring cell, so any cell is
 * generatable directly (hard requirement 3). Shared by `galaxiesInGroup`
 * (loop bound) and `groupsInCluster` (count-only enumeration) so there is
 * exactly one source of truth for "how many". Validates `groupCell` is a
 * local offset (scheme a) and applies the legacy exclusion volume near the
 * origin (spatial-correctness fixes). */
function groupGalaxyCount(seed: string, clusterCell: CellV3, groupCell: CellV3): number {
  requireLocalGroupCell(groupCell);
  if (isZeroCell(clusterCell) && isZeroCell(groupCell)) return 32; // legacy: exactly today's static catalogue
  return filteredGalaxies(seed, clusterCell, groupCell).length;
}

function generatedGalaxy(seed: string, clusterCell: CellV3, groupCell: CellV3, ordinal: number): Galaxy {
  const id = `G${String(ordinal + 1).padStart(3, "0")}`;
  const key = galaxyStreamKey(seed, clusterCell, groupCell, ordinal);
  const r = rng(key);
  return {
    id,
    name: name(key),
    seed: key,
    type: (
      ["Spiral", "Barred spiral", "Elliptical", "Irregular"] as Morphology[]
    )[ordinal % 4],
    position: [
      (r() * 2 - 1) * GROUP_PLACEMENT_HALF_MPC,
      (r() - 0.5) * GROUP_PLACEMENT_HALF_MPC * 0.56,
      (r() * 2 - 1) * GROUP_PLACEMENT_HALF_MPC,
    ],
    rotation: [(r() - 0.5) * 1.7, r() * 6.28, (r() - 0.5) * 0.6],
    radiusLy: 18000 + r() * 38000,
    arms: 2 + Math.floor(r() * 3),
    pitch: 0.22 + r() * 0.22,
    phase: r() * 6.28,
    tint: r(),
  };
}

/** Today's `galaxies()` body, parameterized over the cluster/group hierarchy
 * (§5.1). `galaxiesInGroup(seed, [0n,0n,0n], [0n,0n,0n])` returns exactly
 * `galaxies(seed)`'s 32 records, in the same order (hard requirement 1).
 * `groupCell` must be a local offset in `[0, CELLS_PER_GROUP_AXIS)^3` within
 * `clusterCell` (address scheme a) - throws `RangeError` otherwise, so a
 * given universe position can never be reached through more than one
 * `(clusterCell, groupCell)` spelling. */
export function galaxiesInGroup(seed: string, clusterCell: CellV3, groupCell: CellV3): Galaxy[] {
  requireLocalGroupCell(groupCell);
  if (isZeroCell(clusterCell) && isZeroCell(groupCell)) return galaxies(seed);
  return filteredGalaxies(seed, clusterCell, groupCell);
}

export interface GroupAnchor {
  /** Local offset in `[0, CELLS_PER_GROUP_AXIS)^3` within the enumerated
   * `clusterCell` (address scheme a) - pass straight back into
   * `galaxiesInGroup(seed, clusterCell, groupCell)` unchanged. */
  groupCell: CellV3;
  /** POST-rejection count: always exactly
   * `galaxiesInGroup(seed, clusterCell, groupCell).length` (both route
   * through the same `groupGalaxyCount` -> `filteredGalaxies` source of
   * truth), never the pre-`withMinSeparation` raw Poisson draw. A caller
   * that used this count to size an array before calling `galaxiesInGroup`
   * would otherwise silently over-allocate for a cell where separation
   * rejected candidates. */
  galaxyCount: number;
  /** Cluster-local double offset (Mpc) of this group cell's center - always
   * a small, safe-magnitude number (bounded by one cluster's 100 Mpc span)
   * regardless of how far out `clusterCell` itself is, matching the
   * precision-budget design (§5.3): unbounded position lives in the BigInt
   * cell index, never in a large double. */
  centerMpc: V3;
}

/** Poisson-per-5-Mpc-subcell enumeration of one cluster cell's non-empty
 * groups - the `groupsInCluster` analogue of `sector()`'s per-4-ly-subcell
 * enumeration, one level up. Only returns groups with at least one galaxy,
 * so a cluster with some genuinely empty cells returns a shorter list
 * rather than a run of `galaxyCount: 0` entries (measured: with the current
 * `GROUP_LAMBDA_MAX`, roughly a quarter of a sampled cluster's 8000 group
 * cells are empty and omitted this way). Returned `groupCell`s are already
 * local offsets (scheme a) - the exact same value `galaxiesInGroup` expects
 * back, no extra decomposition step needed at the call site.
 *
 * COST (measured, full 20^3 = 8000-cell cluster enumeration, this machine):
 * ~1.2-1.8s before the universal `withMinSeparation` fix (raw Poisson
 * generation only, ~77k-80k galaxies/cluster), ~1.3-2.0s after (same
 * generation cost plus an O(n^2) same-cell separation pass per cell, n
 * itself Poisson-bounded by `GROUP_LAMBDA_MAX`/cubed-skew so almost always
 * small) - i.e. the added same-cell separation pass is a small fraction of
 * the pre-existing per-galaxy generation cost (hash64/PCG draws), not a new
 * dominant term. `groupGalaxyCount` already had to fully generate and
 * filter each cell's raw candidates to answer "how many" even before this
 * fix (see `filteredGalaxies`), so this function's asymptotic cost class is
 * unchanged - only the constant factor grows slightly. */
export function groupsInCluster(seed: string, clusterCell: CellV3): GroupAnchor[] {
  const anchors: GroupAnchor[] = [];
  for (let x = 0; x < CELLS_PER_GROUP_AXIS; x++)
    for (let y = 0; y < CELLS_PER_GROUP_AXIS; y++)
      for (let z = 0; z < CELLS_PER_GROUP_AXIS; z++) {
        const groupCell: CellV3 = [BigInt(x), BigInt(y), BigInt(z)];
        const galaxyCount = groupGalaxyCount(seed, clusterCell, groupCell);
        if (galaxyCount <= 0) continue;
        anchors.push({
          groupCell,
          galaxyCount,
          centerMpc: [
            (x - (CELLS_PER_GROUP_AXIS - 1) / 2) * GROUP_MPC,
            (y - (CELLS_PER_GROUP_AXIS - 1) / 2) * GROUP_MPC,
            (z - (CELLS_PER_GROUP_AXIS - 1) / 2) * GROUP_MPC,
          ],
        });
      }
  return anchors;
}

const sq = (x: number) => x * x;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
/** Fixed arithmetic approximations (det-math.ts) keep density branch decisions independent of platform libm. */
export function spiralArmStrength(
  g: Galaxy,
  x: number,
  z: number,
  r = Math.sqrt(x * x + z * z),
) {
  const R = g.radiusLy;
  const armAngle =
    g.phase + logPos(Math.max(r, R * 0.04) / (R * 0.2)) / detTan(g.pitch);
  const t = g.arms * (detAtan2(z, x) - armAngle);
  const v = (1 + sine(t + Math.PI / 2)) * 0.5;
  // Integer 6th power via explicit multiplication: exact and portable,
  // unlike Math.pow(v, 6) which the audit found differs bitwise ~50% of the
  // time between engines for this kind of exponent.
  const v3 = v * v * v;
  return v3 * v3;
}
export function density(g: Galaxy, p: V3) {
  const [x, y, z] = p;
  const R = g.radiusLy,
    r = Math.sqrt(x * x + z * z),
    r3 = Math.sqrt(x * x + y * y + z * z);
  if (r3 > R * 1.4) return 0;
  if (g.type === "Elliptical") {
    const q = Math.sqrt(sq(x / R) + sq(y / (R * 0.58)) + sq(z / (R * 0.78)));
    return 0.035 * expNeg(q * 7) * clamp((1.3 - q) * 5, 0, 1);
  }
  if (g.type === "Irregular") {
    let d = 0.0002 * expNeg((r3 / R) * 4);
    for (let i = 0; i < 4; i++) {
      const a = g.phase + i * 2.3;
      const cx = sine(a) * R * 0.43,
        cz = sine(a + Math.PI / 2) * R * 0.38;
      d +=
        0.011 *
        expNeg(
          (sq((x - cx) / (R * 0.22)) +
            sq(y / (R * 0.17)) +
            sq((z - cz) / (R * 0.22))) *
            2,
        );
    }
    return d;
  }
  const disk =
    0.022 * expNeg(r / (R * 0.27)) * expNeg(Math.abs(y) / (R * 0.015));
  const bulge = 0.16 * expNeg(r3 / (R * 0.06));
  // atan2 only shapes a quantized density; supported-browser fixtures guard the sampler contract.
  const arm = spiralArmStrength(g, x, z, r);
  const bar =
    g.type === "Barred spiral"
      ? 0.04 *
        expNeg(sq(x / (R * 0.24)) + sq(z / (R * 0.045)) + sq(y / (R * 0.025)))
      : 0;
  return (
    Math.round(
      (disk * (0.4 + 2 * arm) + bulge + bar) *
        clamp((1 - r / R) * 10, 0, 1) *
        1e9,
    ) / 1e9
  );
}
export function overview(g: Galaxy, count: number) {
  return densityOverview(g, count);
}

function poisson(lambda: number, r: () => number) {
  if (lambda <= 0) return 0; // Chunking the mean bounds work and avoids underflow without changing the distribution.
  let count = 0;
  while (lambda > 0) {
    const part = Math.min(lambda, 12);
    const limit = expNeg(part);
    let p = 1,
      n = 0;
    do {
      p *= Math.max(r(), 1e-12);
      n++;
    } while (p > limit);
    count += n - 1;
    lambda -= part;
  }
  return count;
}
export function sector(g: Galaxy, coords: V3, maxRefs = 10000) {
  const refs: SystemRef[] = [];
  let total = 0;
  const cells: { cell: V3; count: number }[] = [];
  for (let x = 0; x < 8; x++)
    for (let y = 0; y < 8; y++)
      for (let z = 0; z < 8; z++) {
        const cell: V3 = [
          coords[0] * 8 + x,
          coords[1] * 8 + y,
          coords[2] * 8 + z,
        ];
        const key = JSON.stringify([g.seed, cell]);
        const center: V3 = cell.map((v) => v * 4 + 2) as V3;
        const count = poisson(density(g, center) * 64, rng(key + "/count"));
        cells.push({ cell, count });
        total += count;
      }
  const stride = Math.max(1, Math.ceil(total / maxRefs));
  let global = 0;
  for (const { cell, count } of cells)
    for (let i = 0; i < count; i++, global++) {
      if (global % stride) continue;
      const key = JSON.stringify([g.seed, cell, i]);
      const r = rng(key + "/position");
      const position = cell.map(
        (v) => Math.round((v * 4 + r() * 4) * 1e9) / 1e9,
      ) as V3;
      const id = `${g.id}/C${cell.join(",")}/${i}`;
      const rr = rng(key + "/star-color")();
      refs.push({
        id,
        name: name(key),
        galaxyId: g.id,
        cell,
        ordinal: i,
        position,
        seed: key,
        color: rr < 0.55 ? "#ffae7d" : rr < 0.85 ? "#ffe6b6" : "#b3d7ff",
      });
    }
  return { refs, total, coords, aggregated: stride > 1 };
}
export function refByAddress(g: Galaxy, address: string): SystemRef | null {
  const m = address.match(/^G\d+\/C(-?\d+),(-?\d+),(-?\d+)\/(\d+)$/);
  if (!m || !address.startsWith(g.id + "/")) return null;
  const cell = m.slice(1, 4).map(Number) as V3;
  const ordinal = Number(m[4]);
  if (
    cell.some(
      (n) => !Number.isSafeInteger(n) || Math.abs(n) * 4 > g.radiusLy * 1.5,
    ) ||
    ordinal > 100000
  )
    return null;
  const key = JSON.stringify([g.seed, cell]);
  const count = poisson(
    density(g, cell.map((v) => v * 4 + 2) as V3) * 64,
    rng(key + "/count"),
  );
  if (ordinal >= count) return null;
  const sk = JSON.stringify([g.seed, cell, ordinal]),
    r = rng(sk + "/position"),
    rr = rng(sk + "/star-color")();
  return {
    id: address,
    name: name(sk),
    galaxyId: g.id,
    cell,
    ordinal,
    position: cell.map((v) => Math.round((v * 4 + r() * 4) * 1e9) / 1e9) as V3,
    seed: sk,
    color: rr < 0.55 ? "#ffae7d" : rr < 0.85 ? "#ffe6b6" : "#b3d7ff",
  };
}
function orbit(r: () => number, a: number, mu: number): Orbit {
  return {
    a,
    e: r() * 0.12,
    inclination: (r() - 0.5) * 0.12,
    node: r() * 6.283,
    periapsis: r() * 6.283,
    anomaly: r() * 6.283,
    mu,
  };
}
export function system(ref: SystemRef): StarSystem {
  const sr = rng(ref.seed + "/architecture");
  const binary = sr() < 0.24;
  const count = binary ? 2 : 1;
  const stars: Body[] = [];
  const planets: Body[] = [];
  const moons: Body[] = [];
  for (let i = 0; i < count; i++) {
    const sk = ref.seed + "/star/" + i,
      r = rng(sk),
      solarMass = 0.18 + r() * 1.45,
      massKg = solarMass * 1.98847e30;
    stars.push({
      id: ref.id + "/star/" + i,
      name: name(sk),
      kind: "star",
      type:
        solarMass < 0.5
          ? "M · red dwarf"
          : solarMass < 0.8
            ? "K · orange dwarf"
            : solarMass < 1.1
              ? "G · yellow dwarf"
              : solarMass < 1.4
                ? "F · yellow-white star"
                : "A · white star",
      parentId: ref.id,
      massKg,
      radiusM: 6.957e8 * detPow(solarMass, 0.8),
      // pow(x, 0.5) is exactly sqrt(x): Math.sqrt is IEEE-correctly-rounded
      // (portable), so use it directly instead of the general detPow path.
      temperatureK: Math.round(5772 * Math.sqrt(solarMass)),
      color:
        solarMass < 0.5
          ? "#ff9870"
          : solarMass < 0.8
            ? "#ffc28a"
            : solarMass < 1.1
              ? "#ffe2b1"
              : "#d7e7ff",
      orbit: null,
      seed: sk,
      water: 0,
      rings: false,
    });
  }
  const totalMass = stars.reduce((s, b) => s + b.massKg, 0);
  const binaryA = AU * 0.065;
  if (binary) {
    const mu = G * totalMass;
    const base = orbit(rng(ref.seed + "/binary"), binaryA, mu);
    base.e = 0.03;
    for (let i = 0; i < 2; i++) {
      const fraction = stars[1 - i].massKg / totalMass;
      stars[i].orbit = {
        ...base,
        a: binaryA * fraction,
        // Integer cube via explicit multiplication: mu is a stored Body.orbit
        // field (catalogue identity), so avoid `**`'s cross-engine drift.
        mu: mu * (fraction * fraction * fraction),
        periapsis: base.periapsis + (i ? Math.PI : 0),
      };
    }
  }
  const np = Math.floor(sr() * 11) + 1;
  let nextA = (binary ? 0.65 : 0.18) + sr() * 0.25;
  for (let i = 0; i < np; i++) {
    const sk = ref.seed + "/planet/" + i,
      r = rng(sk);
    nextA *= 1.65 + r() * 0.65;
    const giant = nextA > 2 && r() < 0.55;
    const water =
      !giant && nextA > 0.5 && nextA < 3.8 && r() < 0.62
        ? 0.38 + r() * 0.35
        : 0;
    const radiusM = giant ? 2e7 + r() * 5.4e7 : 2e6 + r() * 7e6;
    const type = giant
      ? "Gas giant"
      : water
        ? "Oceanic world"
        : nextA > 4
          ? "Ice world"
          : nextA < 0.65
            ? "Volcanic world"
            : "Rocky world";
    const p: Body = {
      id: ref.id + "/planet/" + i,
      name: name(sk),
      kind: "planet",
      type,
      parentId: binary ? ref.id : stars[0].id,
      // Integer cube via explicit multiplication, not `**`: `**` is
      // Math.pow, whose result for an integer exponent like this is not
      // guaranteed identical across engines (measured 23.7% of x**3 differ
      // bitwise), and massKg is part of the catalogue identity digest.
      massKg: ((4 * Math.PI) / 3) * (radiusM * radiusM * radiusM) * (giant ? 1200 : 4800),
      radiusM,
      temperatureK: Math.round(278 / Math.sqrt(nextA)),
      color: giant
        ? "#cfae85"
        : water
          ? "#3985ae"
          : type === "Ice world"
            ? "#b4d9df"
            : type === "Volcanic world"
              ? "#bb6651"
              : "#a5917f",
      orbit: orbit(r, nextA * AU, G * totalMass),
      seed: sk,
      water,
      rings: giant && r() < 0.55,
    };
    planets.push(p);
    const moonCount = Math.floor(r() * (giant ? 9 : 4));
    let ma = radiusM * 4;
    // Hill-sphere cutoff: Math.cbrt is a platform libm call (not guaranteed
    // portable); detCbrt is built only from +,-,*,/,Math.sqrt and directly
    // gates the moon-count loop below (a discrete per-engine decision).
    const hill =
      p.orbit!.a * (1 - p.orbit!.e) * detCbrt(p.massKg / (3 * totalMass));
    for (let j = 0; j < moonCount; j++) {
      const mk = sk + "/moon/" + j,
        mr = rng(mk);
      ma *= 1.5 + mr() * 0.45;
      if (ma > hill * 0.25) break;
      const rad = Math.min(radiusM * 0.2, 3e5 + mr() * 1.8e6);
      moons.push({
        id: p.id + "/moon/" + j,
        name: name(mk),
        kind: "moon",
        type: "Airless moon",
        parentId: p.id,
        massKg: ((4 * Math.PI) / 3) * (rad * rad * rad) * 3000,
        radiusM: rad,
        temperatureK: p.temperatureK,
        color: "#b4b2ab",
        orbit: orbit(mr, ma, G * p.massKg),
        seed: mk,
        water: 0,
        rings: false,
      });
    }
  }
  const belts =
    planets.length > 3 && sr() < 0.65
      ? [
          {
            id: ref.id + "/belt/0",
            name: name(ref.seed + "/belt") + " Belt",
            innerM: planets[1].orbit!.a * 1.25,
            outerM: planets[2].orbit!.a * 0.8,
          },
        ].filter((b) => b.outerM > b.innerM)
      : [];
  return {
    id: ref.id,
    name: ref.name,
    ref,
    stars,
    planets,
    moons,
    belts,
    version: VERSION,
  };
}
export function orbitPosition(o: Orbit | null, time: OrbitTime = 0): V3 {
  if (!o) return [0, 0, 0];
  const M = (o.anomaly + phaseAt(time, Math.sqrt(o.mu / o.a ** 3))) % (Math.PI * 2);
  let E = M;
  for (let i = 0; i < 12; i++) {
    const d = (E - o.e * Math.sin(E) - M) / (1 - o.e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  const x = o.a * (Math.cos(E) - o.e),
    z = o.a * Math.sqrt(1 - o.e * o.e) * Math.sin(E);
  const a = o.periapsis,
    n = o.node,
    c = Math.cos(o.inclination),
    s = Math.sin(o.inclination);
  const u = x * Math.cos(a) - z * Math.sin(a),
    v = x * Math.sin(a) + z * Math.cos(a);
  return [
    u * Math.cos(n) - v * c * Math.sin(n),
    v * s,
    u * Math.sin(n) + v * c * Math.cos(n),
  ];
}
export function bodyPosition(b: Body, sys: StarSystem, time: OrbitTime = 0): V3 {
  const p = orbitPosition(b.orbit, time);
  const parent = [...sys.stars, ...sys.planets].find(
    (x) => x.id === b.parentId,
  );
  if (parent) {
    const v = orbitPosition(parent.orbit, time);
    return p.map((x, i) => x + v[i]) as V3;
  }
  return p;
}
/**
 * 32-bit position hash with a murmur3-style finalizer (fmix32). The previous
 * z multiplier, 2147483647 (2^31-1), is nearly degenerate under Math.imul:
 * z*(2^31-1) mod 2^32 = (z mod 2)*2^31 - z mod 2^32, i.e. essentially -z with
 * only z's low bit folded in - almost linear, with very poor avalanche. `s`
 * was also XORed in raw, unmixed. Every input is now combined with an odd,
 * high-entropy multiplier (standard murmur/xxhash primes) and the combined
 * value goes through a full avalanche finalizer before use.
 */
function ihash(x: number, y: number, z: number, s: number) {
  let h =
    Math.imul(x, 0x9e3779b1) ^
    Math.imul(y, 0x85ebca77) ^
    Math.imul(z, 0xc2b2ae3d) ^
    Math.imul(s, 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
export function noise(x: number, y: number, z: number, s: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    iz = Math.floor(z);
  let a = x - ix,
    b = y - iy,
    c = z - iz;
  a = a * a * (3 - 2 * a);
  b = b * b * (3 - 2 * b);
  c = c * c * (3 - 2 * c);
  let value = 0;
  for (let dx = 0; dx < 2; dx++)
    for (let dy = 0; dy < 2; dy++)
      for (let dz = 0; dz < 2; dz++)
        value +=
          ihash(ix + dx, iy + dy, iz + dz, s) *
          (dx ? a : 1 - a) *
          (dy ? b : 1 - b) *
          (dz ? c : 1 - c);
  return value;
}
export function macroHeight(seed: string, d: V3) {
  return macroHeightCode(Number(hash64(seed + "/macro-v1") & 0xffffffffn), d);
}
export function macroHeightCode(s: number, d: V3) {
  return (
    0.68 * noise(d[0] * 2.6 + 11, d[1] * 2.6 + 31, d[2] * 2.6 + 17, s) +
    0.23 * noise(d[0] * 5.2, d[1] * 5.2, d[2] * 5.2, s + 1) +
    0.09 * noise(d[0] * 10.4, d[1] * 10.4, d[2] * 10.4, s + 2)
  );
}
export function surfaceSample(
  b: Body,
  d: V3,
  code = Number(hash64(b.seed + "/macro-v1") & 0xffffffffn),
): [number, number, number] {
  const h = macroHeightCode(code, d);
  if (b.type === "Gas giant") {
    const band = 0.5 + 0.5 * Math.sin(d[1] * 60 + h * 8);
    return [145 + band * 72, 113 + band * 67, 83 + band * 52];
  }
  if (b.water) {
    const sea = 0.37 + b.water * 0.22;
    if (Math.abs(d[1]) > 0.9 + h * 0.045) return [211, 225, 223];
    if (h < sea) {
      const t = clamp((sea - h) * 7, 0, 1);
      return [19 - 9 * t, 89 - 57 * t, 118 - 58 * t];
    }
    const t = clamp((h - sea) * 7, 0, 1);
    return [125 - 55 * t, 137 - 44 * t, 89 - 34 * t];
  }
  if (b.type === "Ice world") return [148 + h * 74, 169 + h * 66, 183 + h * 60];
  if (b.type === "Volcanic world")
    return [99 + h * 83, 46 + h * 61, 33 + h * 52];
  return [73 + h * 115, 69 + h * 109, 66 + h * 101];
}
export function surfaceTexture(b: Body, width = 512) {
  const code = Number(hash64(b.seed + "/macro-v1") & 0xffffffffn);
  const height = width / 2,
    data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const theta = ((x + 0.5) / width) * Math.PI * 2,
        phi = ((y + 0.5) / height) * Math.PI;
      const d: V3 = [
        -Math.cos(theta) * Math.sin(phi),
        Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
      ];
      const rgb = surfaceSample(b, d, code),
        j = (y * width + x) * 4;
      data[j] = rgb[0];
      data[j + 1] = rgb[1];
      data[j + 2] = rgb[2];
      data[j + 3] = 255;
    }
  return { data, width, height };
}
