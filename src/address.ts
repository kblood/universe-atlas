/**
 * Absolute address & world-position types (docs/time-and-coordinates-contract.md §5).
 *
 * Public API for Package D (`main.ts`, `star-map.ts`, `galaxy-space.ts`,
 * `travel.ts`) to switch to once it lands:
 *
 *   - `GalaxyAddress` / `SystemAddress` / `BodyAddress`: the three address
 *     shapes, each extending the previous one level down (cluster -> group ->
 *     galaxy -> sector -> generation cell -> system -> body slot).
 *   - `parseAddress(s)` / `formatAddress(a)`: canonical string <-> address,
 *     round-tripping and back-compatible with every address string that
 *     exists in the codebase today (`G001/C2128,0,1/0`-style, no prefix).
 *   - `resolveGalaxy(seed, address)`: the `GalaxyAddress` analogue of
 *     `catalog.ts`'s `refByAddress` (which resolves a `SystemAddress`).
 *   - `WorldPosition` / `resolveWorldPosition(...)`: one persistable "where"
 *     type composing galaxy proper position + system/orbit position +
 *     local offset into a single absolute position, in **meters**,
 *     regardless of which frame/address level was given. Intended to
 *     replace the ad hoc `childAnchor`/`crossScale` position math in
 *     `main.ts` (Package D's job, not done here).
 *
 * Cell sizes (§5.1): `clusterCell` = 100 Mpc/cell, unbounded signed-BigInt
 * (`CellV3`). `groupCell` = 5 Mpc/cell, but is a LOCAL offset in
 * `[0, CELLS_PER_GROUP_AXIS)^3` *within* `clusterCell` (address scheme a),
 * not an independent/global cell index - `clusterCell*CELLS_PER_GROUP_AXIS +
 * groupCell` is the unbounded GLOBAL group index, and that decomposition is
 * a bijection (Euclidean floor-div/mod, `globalGroupCellToAddress`/
 * `addressToGlobalGroupCell` below), so every universe position has exactly
 * one valid `(clusterCell, groupCell)` address. `parseAddress` rejects (and
 * `catalog.ts`'s `galaxiesInGroup`/`groupGalaxyCount` throw for) an
 * out-of-range `groupCell` rather than silently accepting a second, non-
 * canonical spelling of the same or an overlapping region - this is the fix
 * for the "groupCell as an independent hash key" ambiguity flagged before
 * merge; `catalog.ts`'s `groupsInCluster` already produced exactly this
 * local-offset shape, so legacy `galaxiesInGroup(seed, [0,0,0], [0,0,0])`
 * stays byte-identical (the zero cell is trivially in range).
 *
 * `sectorCell`/`genCell` (system level) stay in today's representation
 * (plain safe-integer JS numbers under the hood, unchanged algorithm) -
 * only the *type* is promoted to `CellV3` for a consistent address shape;
 * this package does not extend true BigInt-unbounded range to the system
 * level, only to the cluster/group levels it owns. `sectorCell` is always
 * derivable from `genCell` (`floorDiv(genCell, 8)`, matching the existing
 * `coords*8+offset` relationship) so the canonical string keeps a single
 * `C...` segment, exactly as today's system-address strings already do.
 */
import {
  galaxiesInGroup,
  refByAddress,
  type Galaxy,
  type V3,
} from "./catalog.ts";

/** Reserved single-valued type for future multiverse branching (§7.1 non-goal, threaded everywhere the mechanism will need it). */
export type BranchId = "baseline";

export const ADDRESS_VERSION = "atlas-address-1";

/** Unbounded signed-integer grid coordinate. */
export type CellV3 = [bigint, bigint, bigint];

export const CLUSTER_MPC = 100;
export const GROUP_MPC = 5;
/** 100 Mpc / 5 Mpc = 20 group sub-cells per cluster axis. */
export const CELLS_PER_GROUP_AXIS = Math.round(CLUSTER_MPC / GROUP_MPC);
const CELLS_PER_GROUP_AXIS_BIG = BigInt(CELLS_PER_GROUP_AXIS);

/** True iff `c` is a valid `groupCell`: a local offset in
 * `[0, CELLS_PER_GROUP_AXIS)^3` within its `clusterCell` (address scheme a).
 * Used by `parseAddress` to reject a non-canonical address string, mirrored
 * by `catalog.ts`'s own `isLocalGroupCell`/`requireLocalGroupCell` (kept in
 * sync by comment, not import, for the same circular-module reason
 * `CLUSTER_MPC`/`GROUP_MPC` are duplicated there as literals). */
export function isLocalGroupCell(c: CellV3): boolean {
  return (
    c[0] >= 0n && c[0] < CELLS_PER_GROUP_AXIS_BIG &&
    c[1] >= 0n && c[1] < CELLS_PER_GROUP_AXIS_BIG &&
    c[2] >= 0n && c[2] < CELLS_PER_GROUP_AXIS_BIG
  );
}
/** Decomposes a GLOBAL group-cell index (5 Mpc/cell, unbounded) into the
 * unique canonical `(clusterCell, groupCell)` address scheme (a) requires:
 * `clusterCell = floor(global / 20)`, `groupCell = global mod 20`
 * (Euclidean, always in `[0,20)`). This is the *only* valid address for
 * that global cell. */
export function globalGroupCellToAddress(global: CellV3): { clusterCell: CellV3; groupCell: CellV3 } {
  const clusterCell = floorDivCell(global, CELLS_PER_GROUP_AXIS_BIG);
  const groupCell: CellV3 = [
    global[0] - clusterCell[0] * CELLS_PER_GROUP_AXIS_BIG,
    global[1] - clusterCell[1] * CELLS_PER_GROUP_AXIS_BIG,
    global[2] - clusterCell[2] * CELLS_PER_GROUP_AXIS_BIG,
  ];
  return { clusterCell, groupCell };
}
/** Inverse of `globalGroupCellToAddress` - recomposes the GLOBAL group-cell
 * index (unbounded, 5 Mpc/cell) from a canonical `(clusterCell, groupCell)`
 * address pair. Does not itself validate range - use `isLocalGroupCell` (or
 * go through `parseAddress`) to check an address is canonical first. */
export function addressToGlobalGroupCell(clusterCell: CellV3, groupCell: CellV3): CellV3 {
  return [
    clusterCell[0] * CELLS_PER_GROUP_AXIS_BIG + groupCell[0],
    clusterCell[1] * CELLS_PER_GROUP_AXIS_BIG + groupCell[1],
    clusterCell[2] * CELLS_PER_GROUP_AXIS_BIG + groupCell[2],
  ];
}

export type GalaxyAddress = {
  clusterCell: CellV3; // 100 Mpc / cell
  groupCell: CellV3; // 5 Mpc / cell
  galaxyOrdinal: number; // uint32 within the group
};
export type SystemAddress = GalaxyAddress & {
  sectorCell: CellV3; // 32 ly / cell - unchanged from today's sector
  genCell: CellV3; // 4 ly / cell - unchanged from today's generation cell
  systemOrdinal: number;
};
export type BodyAddress = SystemAddress & { slot: string }; // "star/0", "planet/3", "planet/3/moon/1"

export type AnyAddress = GalaxyAddress | SystemAddress | BodyAddress;

/** Version bundle threaded through every save/bookmark/URL (contract §1.3). */
export interface WorldVersions {
  time: string; // world-time.ts, TIME_VERSION
  space: string; // address.ts, ADDRESS_VERSION
  cosmology: string; // cosmology.ts, COSMOLOGY_VERSION
  catalog: string; // catalog.ts, VERSION
  history: string; // world-history.ts, HISTORY_VERSION (stellar/planetary lifecycle)
  surface: string; // world-surface.ts, SURFACE_VERSION
  terrain: string; // terrain.ts, TERRAIN_VERSION
  biosphere: string; // biosphere-model.ts, BIOSPHERE_VERSION
  galaxyHistory: string; // galaxy-history.ts, GALAXY_HISTORY_VERSION
}

export type WorldPosition = {
  address: AnyAddress;
  frame: "system-barycentric" | "body-fixed" | "galaxy-comoving";
  localOffset: V3; // meaning depends on `frame`: ly for galaxy-comoving, AU/m for system-barycentric, m for body-fixed
};

function isZeroCell(c: CellV3): boolean {
  return c[0] === 0n && c[1] === 0n && c[2] === 0n;
}
/** Euclidean floor division for BigInt (JS's `/` truncates toward zero). */
export function floorDivBig(a: bigint, b: bigint): bigint {
  const q = a / b,
    r = a % b;
  return r !== 0n && (r < 0n) !== (b < 0n) ? q - 1n : q;
}
function floorDivCell(c: CellV3, n: bigint): CellV3 {
  return [floorDivBig(c[0], n), floorDivBig(c[1], n), floorDivBig(c[2], n)];
}
function hasSystemLevel(a: AnyAddress): a is SystemAddress | BodyAddress {
  return "systemOrdinal" in a;
}
function hasBodyLevel(a: AnyAddress): a is BodyAddress {
  return "slot" in a;
}

// ---------------------------------------------------------------------------
// Canonical string encoding (§5.1).
//
//   U/K(cx,cy,cz)/H(gx,gy,gz)/G<ordinal+1>/C<gx,gy,gz>/<systemOrdinal>/<slot>
//
// The `U/K(...)/H(...)/` prefix is OMITTED whenever clusterCell and groupCell
// are both the zero cell - this is exactly the legacy case (compatibility
// requirement 2: an address without the prefix resolves to
// clusterCell=groupCell=(0,0,0)), so every existing bookmark/URL/test
// fixture (`G001/C2128,0,1/0`) keeps parsing unchanged, and
// `format(parse(s)) === s` holds for legacy strings too, not only prefixed
// ones - a stronger, still-consistent guarantee than the contract's minimum.
// ---------------------------------------------------------------------------

const ADDRESS_RE =
  /^(?:U\/K\((-?\d+),(-?\d+),(-?\d+)\)\/H\((-?\d+),(-?\d+),(-?\d+)\)\/)?G(\d+)(?:\/C(-?\d+),(-?\d+),(-?\d+)\/(\d+)(?:\/(.+))?)?$/;

export function parseAddress(s: string): AnyAddress | null {
  const m = ADDRESS_RE.exec(s.trim());
  if (!m) return null;
  const clusterCell: CellV3 = m[1] !== undefined
    ? [BigInt(m[1]), BigInt(m[2]), BigInt(m[3])]
    : [0n, 0n, 0n];
  const groupCell: CellV3 = m[4] !== undefined
    ? [BigInt(m[4]), BigInt(m[5]), BigInt(m[6])]
    : [0n, 0n, 0n];
  // Canonical-address enforcement (scheme a): groupCell must be a local
  // offset within clusterCell, in [0, CELLS_PER_GROUP_AXIS)^3, or this
  // string is not the (unique) canonical address of any universe position -
  // reject it, exactly as catalog.ts's galaxiesInGroup would throw for the
  // same out-of-range groupCell.
  if (!isLocalGroupCell(groupCell)) return null;
  const galaxyNumber = Number(m[7]);
  if (!Number.isSafeInteger(galaxyNumber) || galaxyNumber < 1) return null;
  const galaxyOrdinal = galaxyNumber - 1;
  const galaxyAddress: GalaxyAddress = { clusterCell, groupCell, galaxyOrdinal };
  if (m[8] === undefined) return galaxyAddress;
  const genCell: CellV3 = [BigInt(m[8]), BigInt(m[9]), BigInt(m[10])];
  const systemOrdinal = Number(m[11]);
  if (!Number.isSafeInteger(systemOrdinal)) return null;
  const sectorCell = floorDivCell(genCell, 8n);
  const systemAddress: SystemAddress = {
    ...galaxyAddress,
    sectorCell,
    genCell,
    systemOrdinal,
  };
  if (m[12] === undefined) return systemAddress;
  return { ...systemAddress, slot: m[12] };
}

function cellDigits(c: CellV3): string {
  return c.join(",");
}

export function formatAddress(a: AnyAddress): string {
  const prefix = isZeroCell(a.clusterCell) && isZeroCell(a.groupCell)
    ? ""
    : `U/K(${cellDigits(a.clusterCell)})/H(${cellDigits(a.groupCell)})/`;
  const galaxyPart = `G${String(a.galaxyOrdinal + 1).padStart(3, "0")}`;
  if (!hasSystemLevel(a)) return prefix + galaxyPart;
  const systemPart = `${galaxyPart}/C${cellDigits(a.genCell)}/${a.systemOrdinal}`;
  if (!hasBodyLevel(a)) return prefix + systemPart;
  return `${prefix}${systemPart}/${a.slot}`;
}

// ---------------------------------------------------------------------------
// Resolution.
// ---------------------------------------------------------------------------

/** `GalaxyAddress` analogue of `catalog.ts`'s `refByAddress` (which resolves
 * a `SystemAddress`). Returns `null` for an out-of-range ordinal, exactly
 * like `refByAddress` does for an out-of-range system ordinal. */
export function resolveGalaxy(seed: string, address: GalaxyAddress): Galaxy | null {
  if (!Number.isInteger(address.galaxyOrdinal) || address.galaxyOrdinal < 0) return null;
  const gs = galaxiesInGroup(seed, address.clusterCell, address.groupCell);
  return gs[address.galaxyOrdinal] ?? null;
}

function systemAddressToLegacyString(a: SystemAddress): string {
  const galaxyPart = `G${String(a.galaxyOrdinal + 1).padStart(3, "0")}`;
  return `${galaxyPart}/C${cellDigits(a.genCell)}/${a.systemOrdinal}`;
}

/** Meters per megaparsec (IAU 2015 parsec definition: 1 pc = 3.0856775814913673e16 m). */
export const MPC_M = 3.0856775814913673e22;
export const LY_M = 9.4607304725808e15; // matches catalog.ts's `LY`

function add3(a: V3, b: V3): V3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export type ScaleFactorFn = (t: bigint) => number;
/**
 * STUB for cosmology.ts's `scaleFactorAt` (§4.1, Package A, not landed in
 * this worktree). Always returns 1, i.e. today's frozen-snapshot behaviour -
 * exact at `t = CATALOGUE_EPOCH_NS` by the real function's own construction
 * (`a(CATALOGUE_EPOCH_NS) === 1`), and a documented placeholder everywhere
 * else. Replace the default with the real `scaleFactorAt` once Package A
 * lands; `resolveWorldPosition`'s signature already accepts an override so
 * no call site needs to change shape when that happens.
 */
export const scaleFactorStub: ScaleFactorFn = () => 1;

/**
 * Composes a galaxy's proper position (§4: comoving * a(t), peculiar motion
 * not yet wired - see `scaleFactorStub`) with its system/orbit position
 * (unchanged `orbitPosition`/`refByAddress` math) and `pos.localOffset` into
 * one position, always in **meters**, regardless of which frame/address
 * level was given. This is the single composition point Package D should
 * switch `main.ts`'s ad hoc `childAnchor`/`crossScale` math to.
 *
 * IMPORTANT - this is a *cell-local*, not a universe-absolute, position: per
 * §4.2, `Galaxy.position` is already "a frozen, seeded vector in the
 * galaxy's cluster/group frame", i.e. local to its own `groupCell`, bounded
 * to a few Mpc regardless of how huge `clusterCell`/`groupCell` themselves
 * are. `resolveWorldPosition` deliberately does NOT fold the BigInt cell
 * index into the returned double - doing so (`Number(groupCell[i]) *
 * GROUP_MPC + ...`) would silently reintroduce exactly the precision loss
 * §5.3's bigint-cell-plus-small-offset design exists to prevent (a cell
 * index of ~1e9 already exceeds Number.MAX_SAFE_INTEGER's precision
 * headroom once multiplied out to meters). The returned `V3` is only
 * meaningful *within* the address's own cell; composing positions from two
 * different cells (a floating-origin renderer, which Package D will need
 * for cluster/group-crossing travel) is the caller's job, done by
 * subtracting the small BigInt *delta* between the two cells directly and
 * only converting that (small, precision-safe) delta to a double - never by
 * converting either cell's absolute index to a double first.
 */
export function resolveWorldPosition(
  seed: string,
  pos: WorldPosition,
  t: bigint,
  _branchId: BranchId,
  scaleFactorAt: ScaleFactorFn = scaleFactorStub,
): V3 {
  const addr = pos.address;
  const galaxyAddress: GalaxyAddress = {
    clusterCell: addr.clusterCell,
    groupCell: addr.groupCell,
    galaxyOrdinal: addr.galaxyOrdinal,
  };
  const galaxy = resolveGalaxy(seed, galaxyAddress);
  if (!galaxy) {
    throw new Error(`resolveWorldPosition: unresolvable galaxy address ${formatAddress(galaxyAddress)}`);
  }
  const a = scaleFactorAt(t);
  // Comoving group-local Mpc position -> proper meters.
  const galaxyM: V3 = [galaxy.position[0] * MPC_M * a, galaxy.position[1] * MPC_M * a, galaxy.position[2] * MPC_M * a];

  if (pos.frame === "galaxy-comoving") {
    const offsetM: V3 = [pos.localOffset[0] * LY_M * a, pos.localOffset[1] * LY_M * a, pos.localOffset[2] * LY_M * a];
    return add3(galaxyM, offsetM);
  }

  if (!hasSystemLevel(addr)) {
    throw new Error(`resolveWorldPosition: frame '${pos.frame}' needs a SystemAddress or BodyAddress`);
  }
  const legacyId = systemAddressToLegacyString(addr);
  const ref = refByAddress(galaxy, legacyId);
  if (!ref) {
    throw new Error(`resolveWorldPosition: unresolvable system address ${legacyId}`);
  }
  // A star system's coordinates are inside a gravitationally bound galaxy.
  // Only the intergalactic comoving centre expands with the scale factor.
  const systemM = add3(galaxyM, [ref.position[0] * LY_M, ref.position[1] * LY_M, ref.position[2] * LY_M]);
  // system-barycentric / body-fixed: localOffset is already meters (matches orbitPosition's units).
  return add3(systemM, pos.localOffset);
}
