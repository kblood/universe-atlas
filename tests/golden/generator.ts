/**
 * Cross-engine golden-hash generator.
 *
 * Pure module, no DOM/Node-specific APIs beyond the standard Web Crypto
 * `crypto.subtle.digest`, which is available unprefixed in Node (>=19) and
 * in every evergreen browser. Runs identically as:
 *   - a Node ES module (native TypeScript stripping, see node-run.mjs)
 *   - a Vite-bundled browser entry (see golden-entry.ts / golden.html)
 *
 * It samples the deterministic catalogue/terrain/world-history surface this
 * agent owns (src/catalog.ts, the terrain.ts ridge/hill fields, and
 * src/world-history.ts) and hashes a canonical serialization of each
 * category with SHA-256. SHA-256 itself is a fixed-bit-manipulation
 * algorithm (no floating-point transcendentals), so any digest mismatch
 * between engines means the *catalogue values themselves* differed, not the
 * hashing.
 */
import { galaxies, sector, system, galaxiesInGroup, groupsInCluster, type Galaxy, type StarSystem, type GroupAnchor } from "../../src/catalog.ts";
import { terrainSampler } from "../../src/terrain.ts";
import { stellarHistory } from "../../src/world-history.ts";
import type { CellV3 } from "../../src/address.ts";

export const GOLDEN_SEED = "LETHRA-GOLDEN-001";

/** 12 significant digits, exponential form: ECMA-262 Number::toExponential
 * is exactly specified (not implementation-defined like Math.sin/pow/etc.),
 * so this is a portable canonical float representation at any magnitude. */
function fmt(x: number): string {
  if (!Number.isFinite(x)) return String(x);
  return x.toExponential(12);
}
function fmtV3(v: readonly number[]): string {
  return v.map(fmt).join(",");
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Fixed sample directions on the unit sphere (poles, axes, an oblique mix -
 * deliberately includes the longitude-wrap seam at +-x with z near 0). */
const SAMPLE_DIRECTIONS: [number, number, number][] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
  [0.57735, 0.57735, 0.57735],
  [-0.57735, 0.57735, -0.57735],
  [0.99995, 0, 0.01],
  [0.99995, 0, -0.01],
];

const SECTOR_COORDS: [number, number, number][] = [
  [266, 0, 0],
  [0, 0, 0],
  [-2, -1, -2],
  [12, -4, 7],
];

/** Sample (clusterCell, groupCell) pairs for the NEW address-hierarchy
 * digest section (docs/time-and-coordinates-contract.md §6.4 shape 4: cross-
 * engine digest, extended to cover the new hierarchy). Deliberately includes
 * the legacy cell, ordinary non-legacy cells, and huge/negative BigInt
 * coordinates - none of this touches `galaxies()`/`sector()`/`system()`, so
 * it cannot perturb the pre-existing `galaxies`/`sectors`/`systems`/
 * `terrain`/`history`/`combined` digests above. */
// groupCell is a LOCAL offset in [0, CELLS_PER_GROUP_AXIS)^3 within
// clusterCell (address scheme a, spatial-correctness fix) - clusterCell
// alone carries the huge/negative-BigInt "far coordinates" intent.
const HIERARCHY_SAMPLES: [CellV3, CellV3][] = [
  [[0n, 0n, 0n], [0n, 0n, 0n]],
  [[0n, 0n, 0n], [1n, 0n, 0n]],
  [[3n, -1n, 2n], [7n, 0n, 16n]],
  [[-6n, 4n, -2n], [0n, 0n, 0n]],
  [[1000000000n, -1000000000n, 3n], [15n, 19n, 0n]],
  [[123456789012345678901234567890n, 0n, -1n], [0n, 0n, 0n]],
];
const HIERARCHY_CLUSTER_SAMPLES: CellV3[] = [
  [0n, 0n, 0n],
  [2n, -5n, 9n],
];

export interface GoldenResult {
  seed: string;
  counts: {
    galaxies: number;
    sectorsChecked: number;
    sectorRefsChecked: number;
    systemsChecked: number;
    bodiesChecked: number;
    terrainSamples: number;
    historyRecords: number;
    /** NEW section (Package B, src/catalog.ts's galaxiesInGroup/groupsInCluster). */
    hierarchyGalaxies: number;
    hierarchyGroupAnchors: number;
  };
  digests: {
    galaxies: string;
    sectors: string;
    systems: string;
    terrain: string;
    history: string;
    combined: string;
    /** NEW section (Package B): a sample of non-legacy groups/clusters,
     * including huge/negative BigInt coordinates. Deliberately NOT folded
     * into `combined` above, so `combined` (and every other existing key)
     * stays byte-identical to the pre-existing committed golden.json. */
    hierarchy: string;
  };
}

function galaxyLine(g: Galaxy): string {
  return [
    g.id,
    g.name,
    g.type,
    fmtV3(g.position),
    fmtV3(g.rotation),
    fmt(g.radiusLy),
    g.arms,
    fmt(g.pitch),
    fmt(g.phase),
    fmt(g.tint),
  ].join("|");
}

function bodyLine(b: StarSystem["stars"][number]): string {
  const o = b.orbit;
  const orbitStr = o
    ? [fmt(o.a), fmt(o.e), fmt(o.inclination), fmt(o.node), fmt(o.periapsis), fmt(o.anomaly), fmt(o.mu)].join(",")
    : "none";
  return [
    b.id,
    b.name,
    b.kind,
    b.type,
    b.parentId,
    fmt(b.massKg),
    fmt(b.radiusM),
    b.temperatureK,
    b.color,
    orbitStr,
    fmt(b.water),
    b.rings ? "1" : "0",
  ].join("|");
}

export async function computeGolden(seed = GOLDEN_SEED): Promise<GoldenResult> {
  const gs = galaxies(seed);
  const galaxyDigest = await sha256Hex(gs.map(galaxyLine).join("\n"));

  const sectorLines: string[] = [];
  const allRefs: ReturnType<typeof sector>["refs"] = [];
  let sectorRefsChecked = 0;
  for (const g of gs.slice(0, 3)) {
    for (const coords of SECTOR_COORDS) {
      const s = sector(g, coords);
      sectorLines.push(
        [g.id, coords.join(","), s.total, s.refs.length, s.aggregated ? "1" : "0"].join("|"),
      );
      for (const ref of s.refs) {
        sectorLines.push([ref.id, ref.name, fmtV3(ref.position), ref.color].join("|"));
        sectorRefsChecked++;
      }
      allRefs.push(...s.refs);
    }
  }
  const sectorsDigest = await sha256Hex(sectorLines.join("\n"));

  const systemLines: string[] = [];
  let bodiesChecked = 0;
  const sampled = allRefs.slice(0, 220);
  const systems: StarSystem[] = [];
  for (const ref of sampled) {
    const sys = system(ref);
    systems.push(sys);
    systemLines.push([sys.id, sys.name, sys.version, sys.belts.length].join("|"));
    for (const b of [...sys.stars, ...sys.planets, ...sys.moons]) {
      systemLines.push(bodyLine(b));
      bodiesChecked++;
    }
    for (const belt of sys.belts) {
      systemLines.push([belt.id, belt.name, fmt(belt.innerM), fmt(belt.outerM)].join("|"));
    }
  }
  const systemsDigest = await sha256Hex(systemLines.join("\n"));

  const terrainLines: string[] = [];
  let terrainSamples = 0;
  const terrainBodies = systems
    .flatMap((s) => s.planets)
    .filter((p) => p.type !== "Gas giant")
    .slice(0, 6);
  for (const body of terrainBodies) {
    const sample = terrainSampler(body);
    for (const d of SAMPLE_DIRECTIONS) {
      const s = sample(d);
      terrainLines.push(
        [body.id, fmtV3(d), fmt(s.elevationM), s.ocean ? "1" : "0", s.color.map(Math.round).join(","), fmt(s.roughness)].join("|"),
      );
      terrainSamples++;
    }
  }
  const terrainDigest = await sha256Hex(terrainLines.join("\n"));

  const historyLines: string[] = [];
  const stars = systems.flatMap((s) => s.stars).slice(0, 60);
  for (const star of stars) {
    const h = stellarHistory(star);
    historyLines.push(
      [h.id, h.outcome, h.formationNs, h.giantNs, h.remnantNs, h.remnantId, h.version].join("|"),
    );
  }
  const historyDigest = await sha256Hex(historyLines.join("\n"));

  const combined = await sha256Hex(
    [galaxyDigest, sectorsDigest, systemsDigest, terrainDigest, historyDigest].join("|"),
  );

  // NEW section (Package B): address hierarchy - galaxiesInGroup over a
  // sample of non-legacy (cluster,group) cells (huge/negative BigInt
  // coordinates included) plus groupsInCluster's anchor enumeration for a
  // couple of sample clusters. Independent of everything above: it reads
  // none of galaxies()/sector()/system()'s own output, so it cannot change
  // any of the five digests already hashed into `combined`.
  const hierarchyLines: string[] = [];
  let hierarchyGalaxies = 0;
  for (const [clusterCell, groupCell] of HIERARCHY_SAMPLES) {
    const hgs = galaxiesInGroup(seed, clusterCell, groupCell);
    hierarchyLines.push([clusterCell.join(","), groupCell.join(","), hgs.length].join("|"));
    for (const g of hgs) {
      hierarchyLines.push([clusterCell.join(","), groupCell.join(","), galaxyLine(g)].join("|"));
      hierarchyGalaxies++;
    }
  }
  let hierarchyGroupAnchors = 0;
  const anchorLines: string[] = [];
  for (const clusterCell of HIERARCHY_CLUSTER_SAMPLES) {
    const anchors: GroupAnchor[] = groupsInCluster(seed, clusterCell);
    anchorLines.push([clusterCell.join(","), anchors.length].join("|"));
    for (const a of anchors) {
      anchorLines.push([clusterCell.join(","), a.groupCell.join(","), a.galaxyCount, fmtV3(a.centerMpc)].join("|"));
      hierarchyGroupAnchors++;
    }
  }
  const hierarchyDigest = await sha256Hex([...hierarchyLines, ...anchorLines].join("\n"));

  return {
    seed,
    counts: {
      galaxies: gs.length,
      sectorsChecked: gs.slice(0, 3).length * SECTOR_COORDS.length,
      sectorRefsChecked,
      systemsChecked: sampled.length,
      hierarchyGalaxies,
      hierarchyGroupAnchors,
      bodiesChecked,
      terrainSamples,
      historyRecords: stars.length,
    },
    digests: {
      galaxies: galaxyDigest,
      sectors: sectorsDigest,
      systems: systemsDigest,
      terrain: terrainDigest,
      history: historyDigest,
      combined,
      hierarchy: hierarchyDigest,
    },
  };
}
