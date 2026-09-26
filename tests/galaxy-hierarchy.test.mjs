// Acceptance tests for the unbounded cluster -> group -> galaxy hierarchy
// (docs/time-and-coordinates-contract.md §5.1, §6.4) added to src/catalog.ts
// and src/galaxy-field.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  galaxies,
  galaxiesInGroup,
  groupsInCluster,
  VERSION,
} from "../src/catalog.ts";
import { fieldOverview } from "../src/galaxy-field.ts";
import { GROUP_MPC, floorDivBig, globalGroupCellToAddress, addressToGlobalGroupCell } from "../src/address.ts";

const SEED = "LETHRA-001";
const HIER_SEED = "HIER-DET-001";

function fmt(x) {
  return Number.isFinite(x) ? x.toExponential(12) : String(x);
}
function galaxyLine(g) {
  return [g.id, g.name, g.type, g.position.map(fmt).join(","), g.rotation.map(fmt).join(","), fmt(g.radiusLy), g.arms, fmt(g.pitch), fmt(g.phase), fmt(g.tint)].join("|");
}
function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}
function cellStr(c) {
  return c.join(",");
}

// ---------------------------------------------------------------------------
// Hard requirement 1 / contract compatibility requirement 1: byte-identical
// legacy output at the zero cluster/group cell, checked against a fixture
// captured from the untouched baseline BEFORE this package's refactor.
// ---------------------------------------------------------------------------
test("galaxiesInGroup(seed, [0,0,0], [0,0,0]) is byte-identical to the pre-refactor legacy fixture", async () => {
  const fixture = JSON.parse(await readFile(new URL("./fixtures/legacy-galaxies.json", import.meta.url)));
  const current = galaxiesInGroup(fixture.seed, [0n, 0n, 0n], [0n, 0n, 0n]);
  assert.deepEqual(current, fixture.galaxies);
  assert.equal(JSON.stringify(current), JSON.stringify(fixture.galaxies));
});

test("galaxiesInGroup(seed, [0,0,0], [0,0,0]) equals galaxies(seed) exactly, same order, for arbitrary seeds", () => {
  for (const seed of [SEED, "ANOTHER-UNIVERSE", "boundary"]) {
    const legacy = galaxies(seed);
    const viaGroup = galaxiesInGroup(seed, [0n, 0n, 0n], [0n, 0n, 0n]);
    assert.deepEqual(viaGroup, legacy);
    assert.equal(viaGroup.length, 32);
    assert.deepEqual(viaGroup.map((g) => g.id), legacy.map((g) => g.id));
  }
});

test("catalog VERSION bumped for the address-space schema change (§6.2)", () => {
  assert.equal(VERSION, "atlas-2.0.0");
});

// ---------------------------------------------------------------------------
// Hard requirement 3: unbounded lazy hierarchy - any cell is generatable
// directly, huge/negative BigInt coordinates included, no neighbour
// generation, non-visit-order-dependent, non-overlapping cell-local placement.
// ---------------------------------------------------------------------------
// groupCell is a LOCAL offset in [0, CELLS_PER_GROUP_AXIS)^3 within
// clusterCell (address scheme a, spatial-correctness fix) - every sample
// below keeps groupCell in that range while pushing clusterCell itself to
// huge/negative BigInt magnitudes, exercising the same "far coordinates"
// intent without constructing a non-canonical (rejected) address.
const FAR_SAMPLES = [
  [[0n, 0n, 0n], [1n, 0n, 0n]],
  [[1n, 0n, 0n], [0n, 0n, 0n]],
  [[-3n, 5n, -9n], [2n, 17n, 1n]],
  [[10n ** 9n, -(10n ** 9n), 3n], [7n, 18n, 0n]],
  [[123456789012345678901234567890n, -1n, 0n], [0n, 0n, 0n]],
  [[-1n, -1n, -1n], [19n, 19n, 19n]],
];

test("galaxiesInGroup works directly on huge and negative BigInt cells, deterministically", () => {
  for (const [clusterCell, groupCell] of FAR_SAMPLES) {
    const a = galaxiesInGroup(SEED, clusterCell, groupCell);
    const b = galaxiesInGroup(SEED, clusterCell, groupCell);
    assert.deepEqual(a, b, `${cellStr(clusterCell)} / ${cellStr(groupCell)} must be deterministic`);
    for (const g of a) {
      for (const v of g.position) {
        assert.ok(Number.isFinite(v));
        assert.ok(Math.abs(v) < GROUP_MPC / 2, `${g.id} position ${v} must stay inside its own group cell (no cross-cell overlap)`);
      }
    }
  }
});

// ---------------------------------------------------------------------------
// Spatial-correctness fix (Issue 1): groupCell is a LOCAL offset within
// clusterCell (scheme a) - galaxiesInGroup must reject (not silently accept)
// an out-of-range groupCell, since that would otherwise be a second, non-
// canonical address for an already-addressable region of space.
// ---------------------------------------------------------------------------
test("galaxiesInGroup throws RangeError for an out-of-range (non-local) groupCell", () => {
  for (const groupCell of [
    [20n, 0n, 0n],
    [-1n, 0n, 0n],
    [0n, 20n, 0n],
    [0n, -1n, 0n],
    [0n, 0n, 20n],
    [7n, -4n, 0n], // the pre-fix FAR_SAMPLES entry, now invalid
  ]) {
    assert.throws(() => galaxiesInGroup(SEED, [0n, 0n, 0n], groupCell), RangeError, cellStr(groupCell));
  }
});

test("groupCell must be interpreted the same way regardless of clusterCell - two clusterCells claiming the same global group cell disagree, proving groupCell alone was never a safe hash key", () => {
  // Global group cell 7 (on x) decomposes uniquely to clusterCell=(0,0,0),
  // groupCell=(7,0,0). A caller who (incorrectly, pre-fix) treated groupCell
  // as globally meaningful and paired it with a WRONG clusterCell must be
  // rejected outright - not silently resolved to some other galaxy set.
  const global = [27n, 0n, 0n]; // = clusterCell 1 * 20 + local 7
  const canonical = globalGroupCellToAddress(global);
  assert.deepEqual(canonical, { clusterCell: [1n, 0n, 0n], groupCell: [7n, 0n, 0n] });
  // The wrong pairing (clusterCell=(0,0,0), groupCell=(27,0,0)) is out of
  // local range and must throw.
  assert.throws(() => galaxiesInGroup(SEED, [0n, 0n, 0n], [27n, 0n, 0n]), RangeError);
  // Only the canonical pairing succeeds.
  const resolved = galaxiesInGroup(SEED, canonical.clusterCell, canonical.groupCell);
  assert.ok(Array.isArray(resolved));
});

test("different (cluster,group) cells are independent - no shared generation state leaks between them", () => {
  // Generating cell B before vs after cell A must not change either result
  // (the "no neighbour generation" / no-visit-order-dependence requirement).
  const [c1, g1] = FAR_SAMPLES[2];
  const [c2, g2] = FAR_SAMPLES[3];
  const forwardA = galaxiesInGroup(SEED, c1, g1);
  const forwardB = galaxiesInGroup(SEED, c2, g2);
  // Fresh order: B then A.
  const reverseB = galaxiesInGroup(SEED, c2, g2);
  const reverseA = galaxiesInGroup(SEED, c1, g1);
  assert.deepEqual(forwardA, reverseA);
  assert.deepEqual(forwardB, reverseB);
});

test("groupsInCluster's per-cell galaxyCount matches galaxiesInGroup's length exactly, including the legacy anchor", () => {
  const anchors = groupsInCluster(SEED, [0n, 0n, 0n]);
  const legacyAnchor = anchors.find((a) => a.groupCell.every((c) => c === 0n));
  assert.ok(legacyAnchor, "the legacy group (0,0,0) must appear in its cluster's enumeration");
  assert.equal(legacyAnchor.galaxyCount, 32);
  assert.deepEqual(galaxiesInGroup(SEED, [0n, 0n, 0n], [0n, 0n, 0n]).length, legacyAnchor.galaxyCount);

  const other = groupsInCluster(SEED, [4n, -2n, 9n]);
  assert.ok(other.length > 0, "sanity: at least one non-empty group in a sampled cluster");
  for (const anchor of other.slice(0, 15)) {
    assert.equal(galaxiesInGroup(SEED, [4n, -2n, 9n], anchor.groupCell).length, anchor.galaxyCount);
    for (const v of anchor.centerMpc) assert.ok(Number.isFinite(v) && Math.abs(v) <= 50);
  }
});

test("groupsInCluster never returns duplicate cells and never an empty-count anchor", () => {
  const anchors = groupsInCluster(SEED, [1n, 1n, 1n]);
  const seen = new Set();
  for (const a of anchors) {
    const key = cellStr(a.groupCell);
    assert.ok(!seen.has(key), `duplicate group cell ${key}`);
    seen.add(key);
    assert.ok(a.galaxyCount > 0);
  }
});

test("fieldOverview aggregates groupsInCluster across a cell window and tags each anchor with its own clusterCell", () => {
  const field = fieldOverview(SEED, [0n, 0n, 0n], [1n, 0n, 0n]);
  const cluster0 = groupsInCluster(SEED, [0n, 0n, 0n]);
  const cluster1 = groupsInCluster(SEED, [1n, 0n, 0n]);
  assert.equal(field.length, cluster0.length + cluster1.length);
  assert.ok(field.every((a) => a.clusterCell.join(",") === "0,0,0" || a.clusterCell.join(",") === "1,0,0"));
  const legacyInField = field.find((a) => a.clusterCell.every((c) => c === 0n) && a.groupCell.every((c) => c === 0n));
  assert.equal(legacyInField.galaxyCount, 32);
});

// ---------------------------------------------------------------------------
// §6.4 acceptance shape 1+2: a determinism digest over 64 groups across 8
// clusters (negative and huge BigInt coords included), stable across
// repeats and invariant to shuffled visit order.
// ---------------------------------------------------------------------------
const DIGEST_CLUSTERS = [
  [0n, 0n, 0n],
  [1n, 0n, 0n],
  [-1n, 0n, 0n],
  [5n, -3n, 2n],
  [1000000000n, -1000000000n, 3n],
  [-999999999999n, 42n, 7n],
  [123456789012345678901234567890n, 0n, -1n],
  [7n, 7n, 7n],
];
// groupCell must be a LOCAL offset in [0,20)^3 within `cluster` (address
// scheme a) - spread a set of 8 distinct local offsets across the valid
// range instead of the pre-fix formula, which produced huge/negative values
// that are no longer valid (independent-of-`cluster`) groupCells.
function groupsForCluster(_cluster) {
  return Array.from({ length: 8 }, (_, i) => [
    BigInt((i * 7) % 20),
    BigInt((i * 11 + 3) % 20),
    BigInt((i * 13 + 9) % 20),
  ]);
}
const DIGEST_SAMPLES = DIGEST_CLUSTERS.flatMap((c) => groupsForCluster(c).map((g) => [c, g]));

function resultsByKey(seed, samples) {
  const m = new Map();
  for (const [clusterCell, groupCell] of samples) {
    m.set(`${cellStr(clusterCell)}|${cellStr(groupCell)}`, galaxiesInGroup(seed, clusterCell, groupCell));
  }
  return m;
}
function canonicalDigest(seed, samples) {
  // Sort by key so concatenation order never affects the digest, regardless
  // of the order `samples` itself is iterated in.
  const keys = [...new Set(samples.map(([c, g]) => `${cellStr(c)}|${cellStr(g)}`))].sort();
  const m = resultsByKey(seed, samples);
  const lines = [];
  for (const key of keys) {
    lines.push(key + "#" + m.get(key).length);
    for (const g of m.get(key)) lines.push(galaxyLine(g));
  }
  return sha256(lines.join("\n"));
}

test("64-group / 8-cluster determinism digest is stable across repeats and shuffled visit order", () => {
  assert.equal(DIGEST_SAMPLES.length, 64);
  const canonical = canonicalDigest(HIER_SEED, DIGEST_SAMPLES);
  const repeated = canonicalDigest(HIER_SEED, DIGEST_SAMPLES);
  assert.equal(canonical, repeated);

  const reversed = canonicalDigest(HIER_SEED, [...DIGEST_SAMPLES].reverse());
  assert.equal(canonical, reversed);

  // A fixed pseudo-shuffle (deterministic, not Math.random - this is a test,
  // not catalogue content, so plain Math.random would only hurt
  // reproducibility of *test* failures, not catalogue determinism itself;
  // still avoid it for a stable CI diff).
  const shuffled = DIGEST_SAMPLES.map((s, i) => DIGEST_SAMPLES[(i * 17 + 5) % DIGEST_SAMPLES.length]);
  assert.equal(canonicalDigest(HIER_SEED, shuffled), canonical);
});

test("per-address results from a 64-sample sweep are identical whether generated in one pass or split into differently-sized chunks (simulated worker partitioning)", () => {
  const wholePass = resultsByKey(HIER_SEED, DIGEST_SAMPLES);
  for (const chunkSize of [5, 11, 64]) {
    const chunked = new Map();
    for (let i = 0; i < DIGEST_SAMPLES.length; i += chunkSize) {
      const chunk = DIGEST_SAMPLES.slice(i, i + chunkSize);
      for (const [k, v] of resultsByKey(HIER_SEED, chunk)) chunked.set(k, v);
    }
    for (const [key, value] of wholePass) assert.deepEqual(chunked.get(key), value, `chunkSize=${chunkSize} key=${key}`);
  }
});

// ---------------------------------------------------------------------------
// Spatial-correctness fix (Issue 2): the legacy 32-galaxy catalogue's
// bounding box (analytic max [+-4.1, +-1.4, +-4.1] Mpc from galaxies()'s own
// position formula) exceeds a single group cell's placement radius
// (2.35 Mpc) and so spills into neighbouring group cells around the origin.
// No two galaxies may be closer than a documented minimum separation
// (0.3 Mpc - exactly GROUP_MPC - 2*GROUP_PLACEMENT_HALF_MPC, the pre-
// existing cross-cell margin) in the 5x5x5 group window around the origin,
// UNLESS both galaxies are members of the legacy cell's own fixed 32-galaxy
// set: legacy output is frozen byte-for-byte (hard requirement 1) and its
// *internal* pairwise spacing is uncontrolled per-seed randomness this fix
// must not (and cannot, without touching galaxies() itself) alter - Issue 2
// is specifically about preventing NEW galaxies from encroaching on the
// legacy region, not about the legacy set's own internal spacing quality.
// ---------------------------------------------------------------------------
const MIN_SEPARATION_MPC = 0.3;

test("no two galaxies in the 5x5x5 group window around the origin are closer than the documented minimum separation (excluding legacy-internal pairs, which are frozen, unrelated per-seed randomness)", () => {
  // Collect every galaxy in the 5x5x5 window of GLOBAL group cells
  // [-2,2]^3 around the origin, converted to an absolute-from-origin Mpc
  // position (valid only this close to the origin, exactly like
  // catalog.ts's own internal exclusion-volume check), tagged with whether
  // it came from the legacy cell.
  const points = [];
  for (let gx = -2; gx <= 2; gx++)
    for (let gy = -2; gy <= 2; gy++)
      for (let gz = -2; gz <= 2; gz++) {
        const isLegacyCell = gx === 0 && gy === 0 && gz === 0;
        const global = [BigInt(gx), BigInt(gy), BigInt(gz)];
        const { clusterCell, groupCell } = globalGroupCellToAddress(global);
        const galaxies = galaxiesInGroup(HIER_SEED, clusterCell, groupCell);
        const cellCenterMpc = [gx * GROUP_MPC, gy * GROUP_MPC, gz * GROUP_MPC];
        for (const g of galaxies) {
          points.push({
            isLegacyCell,
            pos: [cellCenterMpc[0] + g.position[0], cellCenterMpc[1] + g.position[1], cellCenterMpc[2] + g.position[2]],
          });
        }
      }
  assert.ok(points.length > 30, `sanity: expected a substantial galaxy count in the 5x5x5 window, got ${points.length}`);
  assert.ok(points.some((p) => p.isLegacyCell), "sanity: the legacy cell's galaxies must be part of the checked set");

  let minDist = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (points[i].isLegacyCell && points[j].isLegacyCell) continue; // both-legacy: frozen, unrelated spacing
      const [a, b] = [points[i].pos, points[j].pos];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      if (d < minDist) minDist = d;
    }
  }
  assert.ok(
    minDist >= MIN_SEPARATION_MPC,
    `minimum pairwise separation (excluding both-legacy pairs) in the 5x5x5 origin window was ${minDist} Mpc, below the documented ${MIN_SEPARATION_MPC} Mpc minimum`,
  );
});

test("legacy galaxy positions are unchanged by the exclusion-volume fix (Issue 2 must not alter legacy output)", async () => {
  const fixture = JSON.parse(await readFile(new URL("./fixtures/legacy-galaxies.json", import.meta.url)));
  const current = galaxiesInGroup(fixture.seed, [0n, 0n, 0n], [0n, 0n, 0n]);
  assert.deepEqual(current, fixture.galaxies);
});

test("every galaxy generated in a group cell immediately adjacent to the origin stays clear of the legacy exclusion box", () => {
  // Global group cells at offset +-1 on a single axis from the origin are
  // immediately adjacent to the legacy cell; their placement volumes
  // (e.g. x in [2.65, 7.35] Mpc for global cell (1,0,0)) overlap the legacy
  // box's measured [~-3.86,~3.86]/[~-1.40,~1.40]/[~-3.95,~3.95] Mpc extent,
  // so every candidate placed there must be checked against it.
  const neighbourGlobalCells = [
    [1n, 0n, 0n], [-1n, 0n, 0n], [0n, 1n, 0n], [0n, -1n, 0n], [0n, 0n, 1n], [0n, 0n, -1n],
    [1n, 1n, 0n], [1n, 0n, 1n], [1n, 1n, 1n], [-1n, -1n, -1n],
  ];
  let sawAnyGalaxy = false;
  for (const seed of ["HIER-DET-001", "HIER-DET-002", "HIER-DET-003", "EXCLUDE-A", "EXCLUDE-B"]) {
    for (const global of neighbourGlobalCells) {
      const { clusterCell, groupCell } = globalGroupCellToAddress(global);
      const gs = galaxiesInGroup(seed, clusterCell, groupCell);
      const cellCenterMpc = global.map((v) => Number(v) * GROUP_MPC);
      for (const g of gs) {
        sawAnyGalaxy = true;
        const abs = [
          cellCenterMpc[0] + g.position[0],
          cellCenterMpc[1] + g.position[1],
          cellCenterMpc[2] + g.position[2],
        ];
        const insideLegacyBox = Math.abs(abs[0]) < 3.864 && Math.abs(abs[1]) < 1.396 && Math.abs(abs[2]) < 3.950;
        assert.ok(!insideLegacyBox, `${seed} ${cellStr(global)} galaxy ${g.id} at abs=${abs} sits inside the measured legacy bounding box`);
      }
    }
  }
  assert.ok(sawAnyGalaxy, "sanity: expected at least one galaxy across the sampled neighbour cells/seeds");
});

// ---------------------------------------------------------------------------
// Spatial-correctness fix (this package): the same-cell minimum-separation
// pass used to be scoped to the 5x5x5 group window around the origin
// (`isNearOrigin`) only. Everywhere else in the unbounded universe, galaxies
// placed independently within one group cell could overlap. The fix applies
// `withMinSeparation` to EVERY non-legacy cell; cross-cell separation was
// already guaranteed everywhere by `GROUP_PLACEMENT_HALF_MPC`'s margin
// design (`GROUP_MPC - 2*GROUP_PLACEMENT_HALF_MPC === MIN_SEPARATION_MPC`).
// These tests sample >=200 group cells across >=8 clusters, including huge
// and negative BigInt cluster coordinates, and check BOTH same-cell and
// (already-guaranteed, but verified here directly) adjacent-cell pairs using
// only small, precision-safe BigInt deltas converted to Mpc - never a huge
// absolute cell index converted to a double (matching address.ts's own
// precision-budget guidance).
// ---------------------------------------------------------------------------

const SEP_CLUSTERS = DIGEST_CLUSTERS; // 8 clusters, huge/negative BigInt included (module-level, reused below)
const SEP_SEED = "SEP-CHECK-001";

/** `count` distinct local group-cell offsets in [0,20)^3, deterministically
 * spread across the range (residues cycle through 0 and 19, exercising
 * cluster-boundary-crossing adjacency below). */
function sampleGroupCells(count) {
  return Array.from({ length: count }, (_, i) => [
    BigInt((i * 3) % 20),
    BigInt((i * 7 + 5) % 20),
    BigInt((i * 11 + 13) % 20),
  ]);
}

/** The 26 face/edge/corner neighbour offsets (every component in {-1,0,1},
 * excluding the zero vector). */
const NEIGHBOUR_DELTAS = [];
for (let dx = -1; dx <= 1; dx++)
  for (let dy = -1; dy <= 1; dy++)
    for (let dz = -1; dz <= 1; dz++) {
      if (dx === 0 && dy === 0 && dz === 0) continue;
      NEIGHBOUR_DELTAS.push([BigInt(dx), BigInt(dy), BigInt(dz)]);
    }

function isLegacyGlobal(globalIdx) {
  return globalIdx.every((c) => c === 0n);
}

test("random sample of >=200 group cells across >=8 clusters (huge/negative BigInt included): no two galaxies in the same cell or an adjacent cell are closer than the documented minimum separation", () => {
  const SAMPLES_PER_CLUSTER = 26; // 8 * 26 = 208 >= 200
  const groupCellsPerCluster = sampleGroupCells(SAMPLES_PER_CLUSTER);
  let cellsChecked = 0;
  let pairsChecked = 0;
  // Cache galaxiesInGroup results within this test so the 26-neighbour sweep
  // doesn't redundantly regenerate the same cell many times.
  const cache = new Map();
  function galaxiesFor(clusterCell, groupCell) {
    const key = `${cellStr(clusterCell)}|${cellStr(groupCell)}`;
    let v = cache.get(key);
    if (!v) {
      v = galaxiesInGroup(SEP_SEED, clusterCell, groupCell);
      cache.set(key, v);
    }
    return v;
  }

  for (const clusterCell of SEP_CLUSTERS) {
    for (const groupCell of groupCellsPerCluster) {
      cellsChecked++;
      const globalA = addressToGlobalGroupCell(clusterCell, groupCell);
      const gsA = galaxiesFor(clusterCell, groupCell);

      // Same-cell pairs (skip the legacy cell itself - its internal spacing
      // is frozen, unrelated per-seed randomness, exactly as the existing
      // near-origin test already excludes "both-legacy" pairs).
      if (!isLegacyGlobal(globalA)) {
        for (let i = 0; i < gsA.length; i++) {
          for (let j = i + 1; j < gsA.length; j++) {
            const d = Math.hypot(
              gsA[i].position[0] - gsA[j].position[0],
              gsA[i].position[1] - gsA[j].position[1],
              gsA[i].position[2] - gsA[j].position[2],
            );
            pairsChecked++;
            assert.ok(
              d >= MIN_SEPARATION_MPC,
              `same-cell pair too close: cluster=${cellStr(clusterCell)} group=${cellStr(groupCell)} ${gsA[i].id}/${gsA[j].id} d=${d}`,
            );
          }
        }
      }

      // Adjacent-cell pairs: only a small BigInt delta (each component in
      // {-1,0,1}) is ever converted to a double, never an absolute cell
      // index - safe at any magnitude of clusterCell.
      for (const delta of NEIGHBOUR_DELTAS) {
        const globalB = [globalA[0] + delta[0], globalA[1] + delta[1], globalA[2] + delta[2]];
        const { clusterCell: cB, groupCell: gB } = globalGroupCellToAddress(globalB);
        const gsB = galaxiesFor(cB, gB);
        if (gsA.length === 0 || gsB.length === 0) continue;
        const offsetMpc = [Number(delta[0]) * GROUP_MPC, Number(delta[1]) * GROUP_MPC, Number(delta[2]) * GROUP_MPC];
        for (const a of gsA) {
          for (const b of gsB) {
            const bInAFrame = [b.position[0] + offsetMpc[0], b.position[1] + offsetMpc[1], b.position[2] + offsetMpc[2]];
            const d = Math.hypot(a.position[0] - bInAFrame[0], a.position[1] - bInAFrame[1], a.position[2] - bInAFrame[2]);
            pairsChecked++;
            assert.ok(
              d >= MIN_SEPARATION_MPC,
              `adjacent-cell pair too close: A=${cellStr(clusterCell)}/${cellStr(groupCell)} B=${cellStr(cB)}/${cellStr(gB)} (delta ${cellStr(delta)}) ${a.id}/${b.id} d=${d}`,
            );
          }
        }
      }
    }
  }
  assert.ok(cellsChecked >= 200, `sanity: expected >=200 sampled cells, checked ${cellsChecked}`);
  assert.ok(pairsChecked > 0, "sanity: expected at least one pair to be checked");
});

// ---------------------------------------------------------------------------
// GroupAnchor.galaxyCount must be the POST-rejection count, consistent with
// galaxiesInGroup(...).length, for every anchor in a whole cluster - not
// just a sampled slice.
// ---------------------------------------------------------------------------
test("groupsInCluster's galaxyCount matches galaxiesInGroup(...).length exactly for EVERY anchor in a whole cluster", () => {
  const clusterCell = [4n, -2n, 9n];
  const anchors = groupsInCluster(SEP_SEED, clusterCell);
  assert.ok(anchors.length > 0, "sanity: expected a non-empty cluster");
  for (const anchor of anchors) {
    const actual = galaxiesInGroup(SEP_SEED, clusterCell, anchor.groupCell).length;
    assert.equal(
      actual,
      anchor.galaxyCount,
      `anchor ${cellStr(anchor.groupCell)}: galaxiesInGroup length ${actual} !== GroupAnchor.galaxyCount ${anchor.galaxyCount}`,
    );
  }
});

// ---------------------------------------------------------------------------
// Visit-order independence (§6.4 shape 2), specifically exercising the new
// universal same-cell separation pass: evaluating a set of cells (mixing
// near-origin and far, several clusters) in shuffled order must produce
// byte-identical per-cell records to evaluating them in original order -
// compared as full records, not just a digest.
// ---------------------------------------------------------------------------
test("shuffled cell evaluation order produces identical per-cell galaxy records to original order", () => {
  const cells = [];
  for (const clusterCell of SEP_CLUSTERS) {
    for (const groupCell of sampleGroupCells(10)) cells.push([clusterCell, groupCell]);
  }
  assert.ok(cells.length >= 60, "sanity: expected a substantial mixed sample");

  function recordsInOrder(order) {
    const out = new Map();
    for (const [clusterCell, groupCell] of order) {
      out.set(`${cellStr(clusterCell)}|${cellStr(groupCell)}`, galaxiesInGroup(SEP_SEED, clusterCell, groupCell));
    }
    return out;
  }

  const original = recordsInOrder(cells);
  // Deterministic pseudo-shuffle (not Math.random, for a stable CI diff).
  const shuffled = cells.map((_, i) => cells[(i * 29 + 13) % cells.length]);
  const shuffledResult = recordsInOrder(shuffled);
  // Reversed order too.
  const reversedResult = recordsInOrder([...cells].reverse());

  for (const [key, value] of original) {
    assert.deepEqual(shuffledResult.get(key), value, `shuffled-order mismatch at ${key}`);
    assert.deepEqual(reversedResult.get(key), value, `reversed-order mismatch at ${key}`);
  }
});
