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
import { galaxies, sector, system, galaxiesInGroup, groupsInCluster, refByAddress, type Body, type Galaxy, type StarSystem, type GroupAnchor, type V3 } from "../../src/catalog.ts";
import { terrainSampler } from "../../src/terrain.ts";
import { stellarHistory } from "../../src/world-history.ts";
import type { CellV3 } from "../../src/address.ts";
// Platform sections (GOLDEN-EXT, 2026-10-04): the derived-data modules a game
// built on Atlas queries. Each feeds its own digest key, outside `combined`.
import { CATALOGUE_EPOCH_NS, YEAR_NS } from "../../src/world-time.ts";
import { planetGeophysics, pressureAtDepthPa, GEOPHYSICS_VERSION } from "../../src/planet-geophysics.ts";
import { climateForcingFor, surfaceClimate, createClimateSample, isothermHeightM, CLIMATE_VERSION } from "../../src/surface-climate.ts";
import { biomeClassifier, materialBytes, BIOME_VERSION } from "../../src/surface-biomes.ts";
import { oceanHypsometry, levelForLoss, lossForLevel, fibonacciDirection, OCEAN_VOLUME_VERSION } from "../../src/ocean-volume.ts";
import { placeAt, depthAndPressureAt, PLACE_QUERY_VERSION } from "../../src/place-query.ts";
import { createForestCensus, FOREST_CENSUS_VERSION, type ForestCensus } from "../../src/forest-census.ts";
import { rocksForCell, canonicalCellsWithin, rockCensusDigest, ROCK_TIERS, ROCK_FIELD_VERSION } from "../../src/rock-field.ts";
import { generateBiosphere, profileFromPhysicalProperties } from "../../src/biosphere-model.ts";
import { COMPOSER_PRESET_IDS, composerPreset, randomComposerRecipe, encodeComposerRecipe, normalizeComposerRecipe, composerConstraints, COMPOSER_RECIPE_VERSION, type ComposerRecipe } from "../../src/fauna-composer-recipe.ts";
import { deriveComposerIndividual } from "../../src/fauna-composer-individual.ts";
import { buildComposerGraph, composerStructure, poseComposer, COMPOSER_GRAPH_VERSION } from "../../src/fauna-composer-rig.ts";
import { buildComposerSkin, COMPOSER_SKIN_VERSION } from "../../src/fauna-composer-mesh.ts";

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
  } & PlatformCounts;
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
  } & PlatformDigests;
  /** Seed of the platform sections (the shipped LETHRA-001 universe). */
  platformSeed: string;
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

  // Platform sections (GOLDEN-EXT): computed from their own fixed universe
  // (PLATFORM_SEED), so they read nothing above and cannot move any existing
  // key; each is its own digest, never folded into `combined`.
  const platform = await platformSectionLines("golden");
  const platformDigests = {} as PlatformDigests;
  const platformCounts = {} as PlatformCounts;
  for (const name of PLATFORM_SECTIONS) {
    platformDigests[name] = await sha256Hex(platform[name].join("\n"));
    platformCounts[`${name}Records`] = platform[name].length;
  }

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
      ...platformCounts,
    },
    digests: {
      galaxies: galaxyDigest,
      sectors: sectorsDigest,
      systems: systemsDigest,
      terrain: terrainDigest,
      history: historyDigest,
      combined,
      hierarchy: hierarchyDigest,
      ...platformDigests,
    },
    platformSeed: PLATFORM_SEED,
  };
}

// ---------------------------------------------------------------------------
// Platform sections (GOLDEN-EXT, backlog task 8, 2026-10-04)
//
// "Same query, same answer" for the derived data a game reads: geophysics,
// climate, biomes, ocean volume, place-query, forest census, rocks and the
// fauna composer. Every section is a list of canonical text records; the
// digest is SHA-256 of the records joined by "\n".
//
// Two serialisations share one code path:
//  - "golden": the pinned form. Discrete data (ids, names, enums, flags,
//    counts, integer arrays) is exact. Doubles are either toExponential(12)
//    (13 significant digits, the portable form of the sections above), or, for
//    the sections listed in PLATFORM_QUANTUM_M, rounded to an ABSOLUTE grid
//    (round(x / q), q in metres / unit-vector units). Those sections derive
//    positions from directions on a planet-radius sphere or from long chains
//    of three.js trigonometry: a 1-ULP direction change moves a 6000 km
//    radius point by ~1e-9 m and a finite-difference normal by ~1e-10, and a
//    value that is physically zero comes out as +-1e-16. A relative
//    (significant-digit) form pins that noise; the absolute grid pins the
//    geometry to the stated tolerance instead. Typed arrays are folded through
//    a 64-bit integer hash so megabyte meshes stay cheap.
//  - "exact": every double as its shortest round-trip String(x) (with -0
//    kept distinct) and every Float32Array as its bit pattern. Used only by perturbation.test.mjs to
//    see whether a raw platform transcendental reaches the output at all.
// ---------------------------------------------------------------------------

export const PLATFORM_SEED = "LETHRA-001";
/** The four relief-harness worlds (tests/place-query.test.mjs WORLDS): galaxy
 * 0 of LETHRA-001, system address, planet index. */
export const PLATFORM_WORLDS: readonly (readonly [string, number])[] = [
  ["G001/C2128,0,1/0", 1],
  ["G001/C2142,3,4/0", 0],
  ["G001/C2143,4,3/0", 1],
  ["G001/C2142,6,1/1", 1],
];
export const PLATFORM_SECTIONS = ["geophysics", "climate", "biomes", "oceanVolume", "placeQuery", "census", "rocks", "fauna", "faunaKnownUnstable"] as const;
export type PlatformSection = typeof PLATFORM_SECTIONS[number];
export type PlatformDigests = Record<PlatformSection, string>;
export type PlatformCounts = Record<`${PlatformSection}Records`, number>;
export type SerialMode = "golden" | "exact";
/** Absolute pin tolerance per section (see the header). Sections not listed
 * use toExponential(12) (13 significant digits). 1e-6: a micrometre for
 * lengths in metres; for unit directions it is an ANGULAR tolerance (1e-6 rad,
 * about 6 m on a 6000 km planet), and 1e-6 of a colour channel or radian. */
export const PLATFORM_QUANTUM_M: Readonly<Partial<Record<PlatformSection, number>>> = Object.freeze({
  census: 1e-6,
  rocks: 1e-6,
  fauna: 1e-6,
  faunaKnownUnstable: 1e-6,
});
/** How one section serialises doubles: exact, absolute grid q, or 12 digits (q = 0). */
export type Fmt = { readonly exact: boolean; readonly q: number };
export function fmtFor(mode: SerialMode, section: PlatformSection): Fmt {
  return { exact: mode === "exact", q: mode === "exact" ? 0 : PLATFORM_QUANTUM_M[section] ?? 0 };
}


/** Two-lane 32-bit FNV-1a over 32-bit words: pure integer arithmetic
 * (Math.imul, xor, >>>), identical on every engine. */
function wordHash(words: ArrayLike<number>): string {
  let a = 0x811c9dc5, b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < words.length; i++) {
    const w = words[i]! >>> 0;
    a = Math.imul(a ^ (w & 0xffff), 0x01000193) >>> 0;
    a = Math.imul(a ^ (w >>> 16), 0x01000193) >>> 0;
    b = Math.imul(b ^ w, 0x5bd1e995) >>> 0;
    b = (b ^ (b >>> 15)) >>> 0;
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

/** round(x / q) is exact IEEE division plus exact rounding: engine-independent. */
const quantize = (x: number, q: number) => Math.round(x / q);

function numText(x: number, f: Fmt): string {
  if (!Number.isFinite(x)) return String(x);
  if (f.exact) return Object.is(x, -0) ? "-0" : String(x);
  return f.q ? String(quantize(x, f.q)) : x.toExponential(12);
}

/** Canonical text of plain data: object keys sorted, typed arrays tagged by
 * type and length. Functions and unknown objects throw rather than hash as {}. */
export function canon(value: unknown, f: Fmt): string {
  if (value === null) return "null";
  if (value === undefined) return "undef";
  switch (typeof value) {
    case "number": return numText(value, f);
    case "string": return JSON.stringify(value);
    case "boolean": return value ? "T" : "F";
    case "bigint": return value.toString() + "n";
    case "object": break;
    default: throw new Error(`golden canon: unsupported ${typeof value}`);
  }
  if (ArrayBuffer.isView(value)) {
    if (value instanceof Float32Array) {
      if (f.q) {
        // Quantised words: the integer split into two exact 32-bit halves.
        const words = new Uint32Array(value.length * 2);
        for (let i = 0; i < value.length; i++) {
          const v = value[i]!;
          if (!Number.isFinite(v)) {
            // NaN / +Inf / -Inf: a marker pair no finite quantised value can produce
            // (hi word 0x7ff00000 would need |x / q| >= 2^62).
            words[2 * i] = Number.isNaN(v) ? 1 : v > 0 ? 2 : 3; words[2 * i + 1] = 0x7ff00000;
            continue;
          }
          const n = quantize(v, f.q), hi = Math.floor(n / 4294967296);
          words[2 * i] = n - hi * 4294967296; words[2 * i + 1] = hi;
        }
        return `f32q[${value.length}]:${wordHash(words)}`;
      }
      return `f32[${value.length}]:${wordHash(new Uint32Array(value.buffer, value.byteOffset, value.length))}`;
    }
    if (value instanceof Float64Array) return `f64[${value.length}]:${Array.from(value, (x) => numText(x, f)).join(",")}`;
    if (value instanceof Uint8Array || value instanceof Uint16Array || value instanceof Uint32Array ||
      value instanceof Int8Array || value instanceof Int16Array || value instanceof Int32Array) {
      return `${value.constructor.name}[${value.length}]:${wordHash(value)}`;
    }
    throw new Error(`golden canon: unsupported typed array ${value.constructor.name}`);
  }
  if (Array.isArray(value)) return "[" + value.map((v) => canon(v, f)).join(",") + "]";
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) throw new Error(`golden canon: unsupported object ${proto?.constructor?.name}`);
  return "{" + Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canon((value as Record<string, unknown>)[k], f)}`).join(",") + "}";
}

type PlatformWorld = { sys: StarSystem; body: Body };

function platformWorlds(): PlatformWorld[] {
  const g0 = galaxies(PLATFORM_SEED)[0]!;
  return PLATFORM_WORLDS.map(([address, index]) => {
    const ref = refByAddress(g0, address);
    if (!ref) throw new Error(`golden: platform system ${address} not found`);
    const sys = system(ref), body = sys.planets[index];
    if (!body) throw new Error(`golden: platform planet ${address}#${index} not found`);
    return { sys, body };
  });
}

/** Equal-area directions (det-math trig, so the sample points themselves are
 * engine-independent) plus the two longitude-seam directions. */
function directions(n: number): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < n; i++) out.push(fibonacciDirection(i, n));
  out.push([0.99995, 0, 0.01], [0.99995, 0, -0.01]);
  return out;
}

const solidBody = (b: Body) => b.kind !== "star" && b.type !== "Gas giant";

function geophysicsLines(systems: StarSystem[], f: Fmt): string[] {
  const lines = [`version|${GEOPHYSICS_VERSION}|q=${f.q}`];
  for (const sys of systems) {
    for (const b of [...sys.stars, ...sys.planets, ...sys.moons]) {
      const geo = planetGeophysics(b);
      const depths = [0, 250, 4000, 11000].map((d) => numText(pressureAtDepthPa(geo, d), f)).join(",");
      lines.push([b.id, canon(geo, f), depths].join("|"));
    }
  }
  return lines;
}

function climateLines(bodies: Body[], f: Fmt): string[] {
  const lines = [`version|${CLIMATE_VERSION}|q=${f.q}`];
  const dirs = directions(46);
  for (const b of bodies) {
    const forcing = climateForcingFor(b);
    lines.push([b.id, "forcing", canon(forcing, f)].join("|"));
    const climate = surfaceClimate(forcing), s = createClimateSample();
    for (const d of dirs) {
      for (const h of [-500, 0, 1200, 3500, 7000]) {
        climate(d, h, s);
        lines.push([b.id, canon(d, f), h, canon(s, f)].join("|"));
      }
    }
    for (const x of [-0.9, -0.3, 0, 0.4, 0.95]) {
      lines.push([b.id, "isotherm", x, numText(isothermHeightM(forcing, x, 273.15), f), numText(isothermHeightM(forcing, x, 250), f)].join("|"));
    }
  }
  return lines;
}

const UP_DOTS = [0.999, 0.93, 0.7, 0.45];
function biomeLines(bodies: Body[], f: Fmt): string[] {
  const lines = [`version|${BIOME_VERSION}|q=${f.q}`];
  const dirs = directions(46);
  for (const b of bodies) {
    for (const water of [0, -350]) {
      const ground = terrainSampler(b, undefined, undefined, undefined, water), classify = biomeClassifier(b, water);
      dirs.forEach((d, i) => {
        const h = ground(d).groundHeightM, upDot = UP_DOTS[i % UP_DOTS.length]!;
        const r = classify(d, h, upDot);
        lines.push([b.id, water, i, numText(h, f), upDot, canon(r, f), materialBytes(r.weights).join(",")].join("|"));
      });
    }
  }
  return lines;
}

function oceanLines(bodies: Body[], f: Fmt): string[] {
  const lines = [`version|${OCEAN_VOLUME_VERSION}|q=${f.q}`];
  for (const b of bodies) {
    const hyp = oceanHypsometry(b);
    lines.push([b.id, canon(hyp, f)].join("|"));
    lines.push([b.id, "levelForLoss", ...[0, 0.05, 0.25, 0.5, 0.75, 0.99, 1].map((loss) => numText(levelForLoss(b, loss), f))].join("|"));
    lines.push([b.id, "lossForLevel", ...[0, -100, -1000, -4000].map((l) => numText(lossForLevel(b, l), f))].join("|"));
  }
  return lines;
}

const PLACE_DATES: readonly bigint[] = [
  CATALOGUE_EPOCH_NS,
  CATALOGUE_EPOCH_NS + 300_000_000n * YEAR_NS,
  CATALOGUE_EPOCH_NS - 9_000_000_000n * YEAR_NS,
];
function placeLines(worlds: PlatformWorld[], f: Fmt): string[] {
  // The first moon of the harness systems joins the four planets: a moon's
  // dated place reads its parent planet's lifecycle.
  const moonSys = worlds.find((w) => w.sys.moons.length)?.sys;
  if (moonSys) worlds = [...worlds, { sys: moonSys, body: moonSys.moons[0]! }];
  const lines = [`version|${PLACE_QUERY_VERSION}|q=${f.q}`];
  const dirs = directions(22);
  for (const { sys, body } of worlds) {
    PLACE_DATES.forEach((t, ti) => {
      const ctx = { sys, body, t };
      dirs.forEach((d, i) => {
        const level = i % 3 === 0 ? 2 : "S4";
        lines.push([body.id, t.toString(), i, canon(placeAt(ctx, d, level), f)].join("|"));
        if (ti === 0 && i % 4 === 0) lines.push([body.id, t.toString(), i, "slope", canon(placeAt(ctx, d, "S4", { measureSlope: true }), f)].join("|"));
        if (ti === 0 && i % 5 === 0) {
          for (const depth of [0, 30, 1e6]) lines.push([body.id, t.toString(), i, "depth", depth, canon(depthAndPressureAt(ctx, d, depth), f)].join("|"));
        }
      });
    });
    // A star is an explicit "no surface" answer, never void data.
    lines.push([sys.stars[0]!.id, canon(placeAt({ sys, body: sys.stars[0]!, t: CATALOGUE_EPOCH_NS }, [0, 1, 0]), f)].join("|"));
  }
  return lines;
}

/** Census patch addresses: the first forest-potential direction (as in
 * tests/forest-census.test.mjs, but on det-math Fibonacci directions) plus
 * fixed fractions on every cube face. */
function censusAddresses(body: Body, n: number) {
  const sample = terrainSampler(body), classify = biomeClassifier(body);
  const out: { face: number; n: number; x: number; y: number }[] = [];
  for (let i = 0; i < 1024; i++) {
    const d = fibonacciDirection(i, 1024);
    if (!classify(d, sample(d).groundHeightM).forestPotential) continue;
    const [cx, cy, cz] = d, components = [cx, -cx, cy, -cy, cz, -cz], axis = Math.max(...components), face = components.indexOf(axis);
    const uv = [[-cz / axis, cy / axis], [cz / axis, cy / axis], [cx / axis, -cz / axis], [cx / axis, cz / axis], [cx / axis, cy / axis], [-cx / axis, cy / axis]][face]!;
    out.push({ face, n, x: Math.floor(Math.min(n - 1, Math.floor((uv[0]! + 1) * n / 2)) / 8), y: Math.floor(Math.min(n - 1, Math.floor((uv[1]! + 1) * n / 2)) / 8) });
    break;
  }
  for (let face = 0; face < 6; face++) for (const fraction of [0.38, 0.5]) out.push({ face, n, x: Math.floor(n * fraction / 8), y: Math.floor(n * 0.49 / 8) });
  return out;
}
function completePatch(census: ForestCensus, address: { face: number; n: number; x: number; y: number }) {
  let result = census.start(address);
  while (!result) result = census.step(16);
  return result;
}
async function censusLines(body: Body, f: Fmt): Promise<string[]> {
  const lines = [`version|${FOREST_CENSUS_VERSION}|q=${f.q}`];
  for (const water of [0, -50]) {
    const census = await createForestCensus(body, water);
    lines.push([body.id, water, "context", census.context, census.n].join("|"));
    let present = 0;
    for (const a of censusAddresses(body, census.n)) {
      const p = completePatch(census, a);
      present += p.present;
      lines.push([body.id, water, canon(p, f)].join("|"));
    }
    // Coverage guard: a sample of empty patches would pin nothing about trees.
    if (present <= 0) throw new Error(`golden census sample on ${body.id} (water ${water}) holds no trees`);
  }
  return lines;
}

function rockLines(worlds: PlatformWorld[], f: Fmt): string[] {
  const lines = [`version|${ROCK_FIELD_VERSION}|q=${f.q}`];
  for (const { body } of worlds) {
    const families = generateBiosphere(PLATFORM_SEED, profileFromPhysicalProperties(body, "main-sequence"), body.id).rocks;
    const water = 0, sample = terrainSampler(body, undefined, undefined, undefined, water);
    const ctx = { body, radiusM: body.radiusM, families, sample, classify: biomeClassifier(body, water), waterLevelM: water };
    lines.push([body.id, "families", canon(families, f)].join("|"));
    // The first two land directions: rocks only exist on dry ground.
    const foci = directions(64).filter((d) => sample(d).groundHeightM > 1).slice(0, 2);
    const all = [];
    for (const focus of foci) {
      for (const tier of ROCK_TIERS) {
        for (const cell of canonicalCellsWithin(focus, body.radiusM, tier.cellSizeM * 2.5, tier.cellSizeM)) {
          const { rocks, samples } = rocksForCell(ctx, tier, cell.id);
          lines.push([body.id, tier.id, cell.id, samples, canon(rocks, f)].join("|"));
          all.push(...rocks);
        }
      }
    }
    // Coverage guard: an empty rock sample would pin nothing about rocks.
    if (!all.length) throw new Error(`golden rock sample on ${body.id} holds no rocks`);
    lines.push([body.id, "census", canon(rockCensusDigest(all), f)].join("|"));
  }
  return lines;
}

const FAUNA_RANDOM_SEEDS = ["GOLDEN-FAUNA-1", "GOLDEN-FAUNA-2", "GOLDEN-FAUNA-3", "GOLDEN-FAUNA-4"];
/** Specimens with a MEASURED cross-engine mismatch, pinned in their own key
 * (faunaKnownUnstable) so the `fauna` key keeps protecting every other
 * specimen on every engine. Each entry is an OPEN determinism finding; the
 * cross-engine runner lists the same key in KNOWN_ENGINE_MISMATCHES. */
export const FAUNA_KNOWN_UNSTABLE: Readonly<Record<string, string>> = Object.freeze({
  "GOLDEN-FAUNA-2": "WebKit 26.5 vs Node/Chromium/Firefox: skin positions differ only in the 8 vertices of the midline insect " +
    "ocellus (z = 0, vertices 3270-3277, up to 0.42 mm; colours, weights and gloss identical). That ocellus is seated by " +
    "nearestExit() on a ray lying in the head's mirror plane (fauna-composer-mesh.ts insect-ocelli block). Traced " +
    "2026-10-04: raycastLine returns two exit hits with the SAME t on the seam triangles 993/994 (normal z -0.073 / " +
    "+0.078); Chromium lists 993 first, WebKit 994 (the site differs by 1 ULP upstream), so the tie-break flips the " +
    "lens normal. Fix belongs to the composer owner; a trialled patch (evidence golden-ext/composer-patch-trial) " +
    "makes all four engines equal. Measured 2026-10-04.",
});
function faunaLines(f: Fmt, which: "stable" | "unstable"): string[] {
  const lines = [`version|${COMPOSER_RECIPE_VERSION}|${COMPOSER_GRAPH_VERSION}|${COMPOSER_SKIN_VERSION}|q=${f.q}`];
  const recipes: [string, ComposerRecipe][] = [
    ...COMPOSER_PRESET_IDS.map((id) => [id, composerPreset(id)] as [string, ComposerRecipe]),
    ...FAUNA_RANDOM_SEEDS.map((s) => [s, randomComposerRecipe(s)] as [string, ComposerRecipe]),
  ].filter(([name]) => (name in FAUNA_KNOWN_UNSTABLE) === (which === "unstable"));
  for (const [name, input] of recipes) {
    const { recipe, issues } = normalizeComposerRecipe(input);
    lines.push([name, "recipe", encodeComposerRecipe(recipe), canon(issues, f), canon(composerConstraints(recipe), f)].join("|"));
    const derived = deriveComposerIndividual(recipe);
    lines.push([name, "individual", canon(derived.traits, f), canon(derived.deltas, f)].join("|"));
    const graph = buildComposerGraph(derived.recipe);
    lines.push([name, "structure", canon(composerStructure(graph), f)].join("|"));
    for (const b of graph.bones) {
      lines.push([name, "bone", b.index, b.name, b.parent, b.part, b.side, b.limb, numText(b.length, f), b.driver,
        canon(b.restPosition, f), canon(b.restQuaternion, f)].join("|"));
    }
    const skin = buildComposerSkin(graph);
    lines.push([name, "skin", skin.version, skin.vertexCount, skin.triangleCount, skin.eyeFallbacks, canon(skin.coatScale, f), canon(skin.parts, f)].join("|"));
    lines.push([name, "skin-arrays", canon(skin.positions, f), canon(skin.colors, f), canon(skin.skinIndex, f), canon(skin.skinWeight, f),
      canon(skin.index, f), canon(skin.gloss, f), canon(skin.regions, f)].join("|"));
    for (const [motion, time] of [["walk", 0.37], ["idle", 1.1]] as const) {
      const pose = poseComposer(graph, motion, time);
      lines.push([name, "pose", motion, time, canon(pose.positions, f), canon(pose.quaternions, f), canon(pose.radialScale, f),
        canon(pose.chordScale, f), numText(pose.travel, f), canon(pose.contacts, f), canon(pose.diagnostics, f)].join("|"));
    }
  }
  return lines;
}

/** Every platform section's canonical records. Pure apart from module caches
 * (ocean hypsometry, climate forcing, dated place): a fresh module instance
 * gives the same records, which is how perturbation.test.mjs isolates runs. */
export async function platformSectionLines(mode: SerialMode = "golden"): Promise<Record<PlatformSection, string[]>> {
  const worlds = platformWorlds();
  const systems = worlds.map((w) => w.sys);
  // Every solid planet and moon of the four harness systems: wet, dry, frozen,
  // light and heavy bodies, plus moons (no air, no ocean).
  const solids = [...new Map(systems.flatMap((s) => [...s.planets, ...s.moons]).filter(solidBody).map((b) => [b.id, b])).values()];
  // Wet bodies plus two dry ones (the no-basin branch: fullVolume 0, level 0).
  const oceanBodies = [...solids.filter((b) => b.water > 0), ...solids.filter((b) => !(b.water > 0)).slice(0, 2)];
  const f = (section: PlatformSection) => fmtFor(mode, section);
  return {
    geophysics: geophysicsLines(systems, f("geophysics")),
    climate: climateLines(solids, f("climate")),
    biomes: biomeLines(solids, f("biomes")),
    oceanVolume: oceanLines(oceanBodies, f("oceanVolume")),
    placeQuery: placeLines(worlds, f("placeQuery")),
    census: await censusLines(worlds[0]!.body, f("census")),
    rocks: rockLines(worlds, f("rocks")),
    fauna: faunaLines(f("fauna"), "stable"),
    faunaKnownUnstable: faunaLines(f("faunaKnownUnstable"), "unstable"),
  };
}
