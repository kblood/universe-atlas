/** place-query-1: the documented query surface for games built on the
 * universe platform (docs/place-query-v1.md).
 *
 * `placeAt(ctx, direction, level?)` answers "what is here, at this date" as
 * plain DERIVED DATA: ground and seabed height, the dated sea level and water
 * depth, hydrostatic pressure, gravity, air, biome and annual climate,
 * tectonic relief and the version keys of every model that produced them.
 * It never answers a game question (is this survivable, does it hurt, how
 * deep can a diver go): those are game-layer rules built ON this data.
 *
 * Nothing is void. The seabed is the same deterministic ground function as dry
 * land: under any depth of water `seabedHeightM` is a real, solid height and
 * `depthAndPressureAt` answers at every depth down to it (no cut-off).
 *
 * Determinism and streaming: every answer is a pure function of (body seed,
 * date, direction, level) and the model versions. Caches only memoise pure
 * results (keyed so no answer can depend on visit order).
 *
 * Ladder: `level` selects the detail ladder rung (S0 orbit .. S4 fine, or a
 * numeric tile level). place-query-1 answers every level at FULL resolution
 * and echoes the requested level; once lod-ladder.ts (P3-LOD-CONTRACT) lands,
 * S0/S1 answer from the same coarse reduction the renderer draws.
 *
 * Warm-up and residency transfer (additive, place-query-1; docs/place-query-v1.md): a cold massif first touch
 * solves one M3 carving block (~150 ms, at most ~0.3 s). `exportPlaceBlocks` runs `placeAt` under a block
 * trace and returns the answer plus copies of every carving block it touched; post them from a worker with
 * `placeBlockTransferables` as the transfer list, and `importPlaceBlocks` them on the main thread, after which
 * the same `placeAt` is a memo hit with a bit-identical answer. In-session only (version-checked, never
 * persisted). Adding these functions changes no field or answer, so `PLACE_QUERY_VERSION` is unchanged. */
import {AU, type Body, type StarSystem, type V3} from './catalog.ts';
import type {Ns} from './world-time.ts';
import {TERRAIN_VERSION, terrainFloorSampler} from './terrain.ts';
import {
  starLifecycle, planetLifecycle, waterKeysFor, planetStateAt,
  type PlanetLifecycle, type StarLifecycle, type ParentPlanetContext,
} from './stellar-evolution.ts';
import type {BodyAddress} from './address.ts';
import {datedOceanState, datedSurfaceSampler, waterLossAt, SURFACE_VERSION} from './world-surface.ts';
import {OCEAN_VOLUME_VERSION} from './ocean-volume.ts';
import {planetGeophysics, pressureAtDepthPa, GEOPHYSICS_VERSION, type PlanetGeophysics, type AirClass} from './planet-geophysics.ts';
import {biomeClassifier, BIOME_VERSION} from './surface-biomes.ts';
import {CLIMATE_VERSION} from './surface-climate.ts';
import {
  enterCarvingPointQuery, exitCarvingPointQuery, traceCarvingBlocks, exportCarvingBlock, importCarvingBlock,
  type CarvingBlockExport,
} from './mountain-carving.ts';

export const PLACE_QUERY_VERSION = 'place-query-1';

/** Detail-ladder rung: S0 space/orbit, S1 atmosphere/horizon, S2 far ground,
 * S3 near ground, S4 fine; or an explicit quadtree tile level (0..22). */
export type PlaceLevel = 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | number;
export type PlaceContext = {sys: StarSystem; body: Body; t: Ns};
export type PlaceOptions = {
  /** Up-vector dot of the local ground normal for the slope-dependent biome
   * fields; default 1 (flat ground, the forest-habitat convention). */
  upDot?: number;
  /** Measure the slope from the ground itself (+-5 m central differences,
   * four extra ground samples) instead of `upDot`. */
  measureSlope?: boolean;
};

export type PlaceVersions = Readonly<{
  placeQuery: string; surface: string; terrain: string; oceanVolume: string;
  geophysics: string; biome: string; climate: string; lodLadder: string | null;
}>;
export const PLACE_VERSIONS: PlaceVersions = Object.freeze({
  placeQuery: PLACE_QUERY_VERSION, surface: SURFACE_VERSION, terrain: TERRAIN_VERSION,
  oceanVolume: OCEAN_VOLUME_VERSION, geophysics: GEOPHYSICS_VERSION, biome: BIOME_VERSION,
  climate: CLIMATE_VERSION, lodLadder: null,
});

export type PlaceBiome = {name: string; weights: number[]; forestPotential: boolean; slopeDeg: number};
export type PlaceClimate = {
  annualMeanTempK: number; warmestMonthK: number; snowFraction: number;
  treeline01: number; effectiveMoisture: number;
};
export type PlaceSample = {
  version: string;
  exists: true;
  stage: 'molten' | 'solid';
  level: PlaceLevel;
  resolution: 'full';
  /** Solid ground (rock/regolith/seabed) height above the 0 m datum. */
  groundHeightM: number;
  /** Regional floor and local window (terrain R0 split, terrainFloorSampler); windowM = groundHeightM - floorM. */
  floorM: number;
  windowM: number;
  /** Dated global sea level (m); null when no global ocean exists at t. */
  seaLevelM: number | null;
  /** Fraction of the catalogue-epoch ocean volume lost by t (0 = full ocean). */
  oceanLossFraction: number;
  ocean: boolean;
  waterDepthM: number;
  /** The seabed under a global ocean: always a real solid height (== groundHeightM), null on land. */
  seabedHeightM: number | null;
  pressureAtSeabedPa: number | null;
  surfacePressurePa: number;
  gravityMS2: number;
  solid: boolean;
  hasAir: boolean;
  airClass: AirClass;
  biome: PlaceBiome;
  climate: PlaceClimate;
  tectonicRelief: number;
  versions: PlaceVersions;
};
export type PlaceAbsent = {
  version: string;
  exists: false;
  stage: 'unformed' | 'accreting' | 'engulfed' | 'star';
  level: PlaceLevel;
  versions: PlaceVersions;
};
export type PlaceResult = PlaceSample | PlaceAbsent;

export type DepthPressure = {
  /** Requested depth below the water surface, clamped to [0, seabedDepthM]. */
  depthM: number;
  /** surfacePressurePa + fluidDensity * g * depthM (Pa). */
  pressurePa: number;
  /** Water column at this place (m); 0 on land or with no ocean. */
  seabedDepthM: number;
  /** True when the request lay below the seabed (or above the surface) and was clamped. */
  clamped: boolean;
  fluidDensityKgM3: number;
  gravityMS2: number;
};

const ADDRESS_PLACEHOLDER = (body: Body): BodyAddress => ({
  clusterCell: [0n, 0n, 0n], groupCell: [0n, 0n, 0n], galaxyOrdinal: 0,
  sectorCell: [0n, 0n, 0n], genCell: [0n, 0n, 0n], systemOrdinal: 0, slot: body.id,
});

/** Lifecycles resolved exactly like main.ts's lifecycleFor: the system primary
 * hosts every planet; a moon inherits its parent planet's star distance. */
function lifecyclesFor(sys: StarSystem, body: Body): {star: StarLifecycle; planet: PlanetLifecycle} {
  const host = sys.stars[0];
  const star = starLifecycle(host.seed, ADDRESS_PLACEHOLDER(host), host);
  let parent: ParentPlanetContext | undefined;
  if (body.kind === 'moon') {
    const p = sys.planets.find(x => x.id === body.parentId);
    if (!p) throw new Error(`placeAt: moon ${body.id} has no parent planet in its system`);
    parent = {starOrbitAu: p.orbit ? p.orbit.a / AU : 0, lifecycle: planetLifecycle(p.seed, ADDRESS_PLACEHOLDER(p), p, star)};
  }
  return {star, planet: planetLifecycle(body.seed, ADDRESS_PLACEHOLDER(body), body, star, parent)};
}

type DatedPlace = {
  stage: ReturnType<typeof planetStateAt>['stage'];
  sample: ReturnType<typeof datedSurfaceSampler>['sample'];
  seaLevelM: number | null;
  lossFraction: number;
  geo: PlanetGeophysics;
  classify: ReturnType<typeof biomeClassifier>;
  floor: ReturnType<typeof terrainFloorSampler>;
};
/** One dated resolution per (body, t); a pure function of both, so reuse never changes an answer. */
const datedCache = new WeakMap<Body, {t: Ns; sys: StarSystem; seed: string; dated: DatedPlace}>();
function datedPlace(ctx: PlaceContext): DatedPlace {
  const {sys, body, t} = ctx;
  const hit = datedCache.get(body);
  if (hit && hit.t === t && hit.sys === sys && hit.seed === body.seed) return hit.dated;
  const {star, planet} = lifecyclesFor(sys, body);
  const stage = planetStateAt(planet, star, t).stage;
  const sampler = datedSurfaceSampler(body, planet, star, t);
  const ocean = datedOceanState(body, planet, star, t);
  const lossFraction = ocean.globalOceanAvailable ? waterLossAt(waterKeysFor(planet, star), t) : 0;
  const dated: DatedPlace = {
    stage, sample: sampler.sample,
    seaLevelM: ocean.globalOceanAvailable ? ocean.waterLevelM : null,
    lossFraction, geo: planetGeophysics(body),
    // The classifier's ocean flag must use the same dated sea level as the surface.
    classify: biomeClassifier(body, ocean.globalOceanAvailable ? ocean.waterLevelM : -1_000_000),
    // R0 (P1) floor/window split: the same default-argument rock field as
    // surfaceQuery's terrainSampler(body), so its groundHeightM is identical.
    floor: terrainFloorSampler(body),
  };
  datedCache.set(body, {t, sys, seed: body.seed, dated});
  return dated;
}

/** g at radius R + h from the geophysics surface gravity (inverse square). */
function gravityAt(geo: PlanetGeophysics, radiusM: number, heightM: number): number {
  const q = radiusM / (radiusM + heightM);
  return geo.surfaceGravityMS2 * q * q;
}

const tangentA: V3 = [0, 0, 0], tangentB: V3 = [0, 0, 0], probe: V3 = [0, 0, 0];
function measuredUpDot(sample: DatedPlace['sample'], d: V3, radiusM: number): number {
  // Orthonormal tangents (pole-safe), +-5 m central differences.
  const ax = Math.abs(d[1]) > .9 ? 1 : 0, ay = ax ? 0 : 1;
  let tx = ay * d[2] - 0 * d[1], ty = 0 * d[0] - ax * d[2], tz = ax * d[1] - ay * d[0];
  let n = Math.sqrt(tx * tx + ty * ty + tz * tz); tx /= n; ty /= n; tz /= n;
  tangentA[0] = tx; tangentA[1] = ty; tangentA[2] = tz;
  tangentB[0] = d[1] * tz - d[2] * ty; tangentB[1] = d[2] * tx - d[0] * tz; tangentB[2] = d[0] * ty - d[1] * tx;
  const step = 5 / radiusM, h = (t: V3, s: number) => {
    probe[0] = d[0] + t[0] * s; probe[1] = d[1] + t[1] * s; probe[2] = d[2] + t[2] * s;
    n = Math.sqrt(probe[0] * probe[0] + probe[1] * probe[1] + probe[2] * probe[2]);
    const g = sample([probe[0] / n, probe[1] / n, probe[2] / n]);
    return g ? g.groundHeightM : 0;
  };
  const gx = (h(tangentA, step) - h(tangentA, -step)) / 10, gy = (h(tangentB, step) - h(tangentB, -step)) / 10;
  return 1 / Math.sqrt(1 + gx * gx + gy * gy);
}

/** Everything the platform knows about one place at one date. Plain data.
 *
 * A point query: it opens an M3 carving point query (mountain-carving.ts cell memo), so a repeat query on a
 * massif reads its lattice cell from the bounded memo instead of re-solving the evicted block. Values are
 * bit-identical either way (docs/placeat-regression-2026-10-07.md); a first touch still solves one block. */
export function placeAt(ctx: PlaceContext, direction: V3, level: PlaceLevel = 'S4', options: PlaceOptions = {}): PlaceResult {
  enterCarvingPointQuery();
  try { return placeAtTruth(ctx, direction, level, options); } finally { exitCarvingPointQuery(); }
}
function placeAtTruth(ctx: PlaceContext, direction: V3, level: PlaceLevel, options: PlaceOptions): PlaceResult {
  const {body} = ctx;
  if (body.kind === 'star') return {version: PLACE_QUERY_VERSION, exists: false, stage: 'star', level, versions: PLACE_VERSIONS};
  const dated = datedPlace(ctx);
  // The same lifecycle gate as world-surface.ts surfaceAt: no surface before
  // the planet forms or after engulfment; a molten surface is not solid.
  if (dated.stage !== 'molten' && dated.stage !== 'solid') return {version: PLACE_QUERY_VERSION, exists: false,
    stage: dated.stage, level, versions: PLACE_VERSIONS};
  const s = dated.sample(direction);
  const geo = dated.geo, ground = s.groundHeightM;
  const ocean = s.ocean;
  const waterDepthM = ocean && dated.seaLevelM !== null ? Math.max(0, dated.seaLevelM - ground) : 0;
  const floor = dated.floor(direction).floorM;
  const upDot = options.measureSlope ? measuredUpDot(dated.sample, direction, body.radiusM) : options.upDot ?? 1;
  const b = dated.classify(direction, ground, upDot);
  return {
    version: PLACE_QUERY_VERSION, exists: true, stage: dated.stage === 'molten' ? 'molten' : 'solid',
    level, resolution: 'full',
    groundHeightM: ground,
    floorM: floor,
    windowM: ground - floor,
    seaLevelM: dated.seaLevelM,
    oceanLossFraction: dated.lossFraction,
    ocean, waterDepthM,
    seabedHeightM: ocean ? ground : null,
    pressureAtSeabedPa: ocean ? pressureAtDepthPa(geo, waterDepthM) : null,
    surfacePressurePa: geo.surfacePressurePa,
    gravityMS2: gravityAt(geo, body.radiusM, ground),
    solid: dated.stage === 'solid' && s.solid,
    hasAir: geo.hasAir, airClass: geo.airClass,
    biome: {name: b.name, weights: b.weights, forestPotential: b.forestPotential, slopeDeg: b.slopeDeg},
    climate: {annualMeanTempK: b.annualMeanTempK, warmestMonthK: b.warmestMonthK, snowFraction: b.snowFraction,
      treeline01: b.treeline01, effectiveMoisture: b.effectiveMoisture},
    tectonicRelief: geo.tectonicRelief,
    versions: PLACE_VERSIONS,
  };
}

/** Hydrostatic pressure in the water column at this place:
 * P = P_surface + rho_fluid * g * depth, at any depth down to the seabed. A
 * request below the seabed returns the seabed itself (depth clamped to the
 * water column) with `clamped: true`; above the surface clamps to 0. */
export function depthAndPressureAt(ctx: PlaceContext, direction: V3, depthBelowSurfaceM: number): DepthPressure {
  const place = placeAt(ctx, direction);
  const geo = planetGeophysics(ctx.body);
  const seabedDepthM = place.exists ? place.waterDepthM : 0;
  const want = Number.isFinite(depthBelowSurfaceM) ? depthBelowSurfaceM : 0;
  const depthM = want < 0 ? 0 : want > seabedDepthM ? seabedDepthM : want;
  return {depthM, pressurePa: pressureAtDepthPa(geo, depthM), seabedDepthM,
    clamped: depthM !== want, fluidDensityKgM3: geo.fluidDensityKgM3, gravityMS2: geo.surfaceGravityMS2};
}

/** Warm-up (worker side): `placeAt` plus copies of every M3 carving block the query touched (solved here when
 * not resident). `result` is exactly `placeAt(ctx, direction, level, options)`. Post `blocks` with
 * `placeBlockTransferables(blocks)` as the transfer list; the main thread imports them with `importPlaceBlocks`. */
export function exportPlaceBlocks(ctx: PlaceContext, direction: V3, level: PlaceLevel = 'S4',
  options: PlaceOptions = {}): {result: PlaceResult; blocks: CarvingBlockExport[]} {
  const {result, blocks} = traceCarvingBlocks(() => placeAt(ctx, direction, level, options));
  return {result, blocks: blocks.map(exportCarvingBlock)};
}
/** Warm-up (main side): import exported blocks into this thread's carving memo. Returns how many were inserted
 * (already-resident blocks are kept as they are). Throws on an invalid block. In-session data only. */
export function importPlaceBlocks(blocks: readonly CarvingBlockExport[]): number {
  let n = 0;
  for (const b of blocks) if (importCarvingBlock(b)) n++;
  return n;
}
/** The transfer list for `postMessage(blocks, placeBlockTransferables(blocks))` (each block's r.buffer). */
export function placeBlockTransferables(blocks: readonly CarvingBlockExport[]): ArrayBuffer[] {
  return blocks.map(b => b.r.buffer as ArrayBuffer);
}
