/**
 * LOD ladder and consistency contract (docs/lod-ladder-contract-v1.md).
 *
 * One deterministic function f(seed, direction, t) is the truth at every level.
 * Every place on a body is served by a LADDER of five detail rungs
 * (S0 space/orbit, S1 atmosphere/horizon, S2 far ground, S3 near ground,
 * S4 fine). A coarser rung is a declared REDUCTION of the next finer one, never
 * a different drawing:
 *  - height: the point sample plus a bounded, non-negative max-preserving
 *    correction (coarse levels only, see `peakCorrectionMaxLevel`);
 *  - colour and class shares: coverage-weighted mean;
 *  - ocean flag: the exact sign of (height - sea level), identical on every
 *    vertex two levels share.
 * Nothing is stored: a tile and its metadata are a pure function of
 * (seed, address, tile key, t-bucket) and can be regenerated anywhere.
 *
 * Pure data and arithmetic: no THREE, no terrain imports, no Math.*
 * transcendental in anything that decides a tile height, an ocean flag or a
 * class. `Math.PI` is a constant, not a call.
 */
// lod-ladder-2 (mountains cost plan T3, docs/mountains-opus-decisions-2026-10-05.md Q2): adds the declared
// M3 carving reduction (`carvingFromLevel`); every section-5 tolerance is unchanged. Was lod-ladder-1 (P3).
export const LOD_LADDER_VERSION = 'lod-ladder-2';

export type LadderId = 'S0' | 'S1' | 'S2' | 'S3' | 'S4';
export const LADDER_IDS: readonly LadderId[] = Object.freeze(['S0', 'S1', 'S2', 'S3', 'S4'] as LadderId[]);

/** Tile edge (metres) on the cube-sphere at `level`: a face spans a quarter
 * great circle, so the edge is (pi/2) R / 2^L. Maithea (R 5195 km): L6 ~127 km,
 * L9 ~16 km, L10 ~8 km, L14 ~0.5 km, L18 ~31 m. */
export function tileEdgeM(radiusM: number, level: number): number {
  return Math.PI * .5 * radiusM / 2 ** level;
}

/** Physical rung boundaries as tile edges (metres), independent of radius. A
 * rung starts at the first level whose tile edge is at or below its bound. */
export const LADDER_EDGE_BOUNDS_M = Object.freeze({
  /** S1 starts at the first level with an edge <= 400 km (Maithea L5). */
  s1: 400_000,
  /** S2 starts at the first level with an edge <= 10 km (Maithea L10). */
  s2: 10_000,
  /** S3 starts at the first level with an edge <= 300 m (Maithea L15). */
  s3: 300,
});

/** First level whose tile edge is <= `edgeM` (integer loop, no log2). */
export function firstLevelAtOrBelowEdge(radiusM: number, edgeM: number, maxLevel = 30): number {
  let level = 0;
  while (level < maxLevel && tileEdgeM(radiusM, level) > edgeM) level++;
  return level;
}

/** Renderer contact levels (planet-renderer.ts:553 and :561, read-only here):
 * contactLevel = clamp(ceil(log2(2R / (32 * 1.4))), 14, 20) and, when the body
 * has hydrology, fineContactLevel = max(contactLevel, min(24, ceil(log2(2R / (32 * .09))))).
 * Written as integer loops so the same value comes out without log2. */
export function contactLevelFor(radiusM: number): number {
  let level = 0;
  while (2 ** level < 2 * radiusM / (32 * 1.4)) level++;
  return Math.max(14, Math.min(20, level));
}
export function fineContactLevelFor(radiusM: number, hasHydrology = true): number {
  const contact = contactLevelFor(radiusM);
  if (!hasHydrology) return contact;
  let level = 0;
  while (2 ** level < 2 * radiusM / (32 * .09)) level++;
  return Math.max(contact, Math.min(24, level));
}

export type LadderRung = {
  id: LadderId;
  name: string;
  /** Inclusive tile-level range for this body. S0 also uses the orbit texture. */
  levels: [number, number];
  views: string;
  representation: string;
  keeps: string;
};

/** Tile-level ranges of every rung for a body of radius `radiusM`. Maithea:
 * S0 L0-L4, S1 L5-L9, S2 L10-L14, S3 L15-L18 (contactLevel), S4 L19-L22. */
export function ladderFor(radiusM: number, hasHydrology = true): LadderRung[] {
  const s1 = firstLevelAtOrBelowEdge(radiusM, LADDER_EDGE_BOUNDS_M.s1);
  const s2 = Math.max(s1 + 1, firstLevelAtOrBelowEdge(radiusM, LADDER_EDGE_BOUNDS_M.s2));
  const s3 = Math.max(s2 + 1, firstLevelAtOrBelowEdge(radiusM, LADDER_EDGE_BOUNDS_M.s3));
  const contact = Math.max(s3, contactLevelFor(radiusM));
  const fine = Math.max(contact, fineContactLevelFor(radiusM, hasHydrology));
  return [
    {id: 'S0', name: 'space/orbit', levels: [0, s1 - 1], views: 'galaxy, system and orbit views; slant distance >= 2 R',
      representation: 'planetSurface equirect 1024x192 (refine 2048x256) plus quadtree tiles up to the level before S1; system thumbnails 256x40 / 64x16',
      keeps: 'continents, coastlines, ice caps, biome belts, the largest ranges as shading'},
    {id: 'S1', name: 'atmosphere/horizon', levels: [s1, s2 - 1], views: 'flight 6-100 km; distant mountains seen from the ground',
      representation: 'tiles with peak-preserving heights (lattice point + bounded max correction); tile metadata maxH/peakDir for silhouettes and bounds; coarse class shares from tile metadata',
      keeps: 'mountain ranges with true summits, snowline, treeline, coastline, biome belts'},
    {id: 'S2', name: 'far ground', levels: [s2, s3 - 1], views: '0.5-6 km altitude; ground view beyond ~2 km',
      representation: 'point-sampled tiles; forest canopy/impostor up to 4500 m (planet-canopy.ts:300); fauna far form in the 100-280 m bands (fauna-runtime.ts:549-551)',
      keeps: 'valleys, ridges, forest edges, beaches'},
    {id: 'S3', name: 'near ground', levels: [s3, contact], views: 'walking, slant distance < 500 m',
      representation: 'contact tiles (contactLevel); fauna near rig enter 80 m / exit 95 m, 6 slots (fauna-near-rig.ts:20-25); flora field; rocks (unculled within 8 m); census range is a caller argument (1600 m digest, 4500 m benchmark)',
      keeps: 'hills, gullies, collision geometry'},
    {id: 'S4', name: 'fine', levels: [Math.min(contact + 1, fine), fine], views: 'contact (< 3 m) and water edges; any seabed approached by a viewer or a body',
      representation: 'fine contact tiles up to fineContactLevel; metre-scale rocks; seabed detail on demand',
      keeps: 'everything; collision truth'},
  ];
}

/** The rung that serves a tile of `level` on a body of radius `radiusM`. */
export function ladderIdForLevel(radiusM: number, level: number, hasHydrology = true): LadderId {
  const rungs = ladderFor(radiusM, hasHydrology);
  for (let i = rungs.length - 1; i >= 0; i--) if (level >= rungs[i].levels[0]) return rungs[i].id;
  return 'S0';
}

/** Slant-distance boundaries of the viewing situations (metres). S4 matches the
 * renderer's fine-contact band (contactNear < 3 m); S3 the walking band; S2
 * the far-ground band; S0 begins at two body radii. */
export const POSE_DISTANCE_BOUNDS_M = Object.freeze({s4: 3, s3: 500, s2: 6_000});

/**
 * Maps a viewing situation to the rung that serves it. `altitudeM` is the eye's
 * height above the point looked at (negative when the point is above the eye),
 * `distanceM` the horizontal (along-surface) distance to it. Uses the slant
 * distance, the same quantity the renderer's split rule divides by.
 * Used by place queries and reports; never by terrain generation.
 */
export function levelForPose(radiusM: number, altitudeM: number, distanceM: number): LadderId {
  const slant = Math.sqrt(altitudeM * altitudeM + distanceM * distanceM);
  if (slant >= 2 * radiusM) return 'S0';
  if (slant >= POSE_DISTANCE_BOUNDS_M.s2) return 'S1';
  if (slant >= POSE_DISTANCE_BOUNDS_M.s3) return 'S2';
  if (slant >= POSE_DISTANCE_BOUNDS_M.s4) return 'S3';
  return 'S4';
}

/** Peak-preserving coarse heights apply to every level up to the last S1 level
 * (Maithea: L9, as the plan names it). Finer levels store the point sample. */
export function peakCorrectionMaxLevel(radiusM: number): number {
  return firstLevelAtOrBelowEdge(radiusM, LADDER_EDGE_BOUNDS_M.s2) - 1;
}

/**
 * M3 carving reduction (lod-ladder-2; contract section 3, "Mountain carving"). The M3 ridge-valley carving
 * (mountain-carving.ts) has its longest declared wavelength at 16 km (CARVING_BANDS[0]). A tile lattice of
 * LATTICE_SEGMENTS cells per edge samples it at 2 x edge / LATTICE_SEGMENTS (the lattice Nyquist), so a level
 * can hold the carving only if that is at most half the 16 km band, i.e. edge <= 16 km / 2 x 32 / 2 = 128 km.
 * Coarser levels sample the UNCARVED composition: carving is <= 0, so the reduction is an upper envelope
 * (heights only raised), as section 3 requires of every coarse height. The truth (no level) keeps the carving.
 * Maithea: carving from L6 (127.5 km); Selawyn L7 (104.9 km); Raiva L5 (98.3 km); Lethuris L7 (110.4 km).
 */
export const CARVING_REDUCTION = Object.freeze({
  /** CARVING_BANDS[0].wavelengthM of mountain-carving.ts (pinned equal by tests/lod-carving-reduction). */
  longestWavelengthM: 16_000,
  /** PATCH_SEGMENTS of planet-tiles.ts (pinned equal by the same test; no import, see the header). */
  latticeSegments: 32,
});
/** Largest tile edge (m) that can hold the carving: 2 x edge / segments <= wavelength / 2. */
export const CARVING_MAX_EDGE_M = CARVING_REDUCTION.longestWavelengthM / 2 * CARVING_REDUCTION.latticeSegments / 2;
/** First tile level that evaluates the M3 carving on a body of radius `radiusM` (integer loop, no log2). */
export function carvingFromLevel(radiusM: number): number {
  return firstLevelAtOrBelowEdge(radiusM, CARVING_MAX_EDGE_M);
}
/** Whether a sampler for `lodLevel` evaluates the carving: always for the truth (no level). */
export function carvingAtLevel(radiusM: number, lodLevel?: number): boolean {
  return lodLevel === undefined || lodLevel >= carvingFromLevel(radiusM);
}

/**
 * Seabed detail policy (owner decision 2026-10-03, replaces the planned
 * "no refinement below L14 under more than 400 m of water" rule).
 *
 * The seabed ALWAYS exists: solid, collidable, at its true depth (up to
 * `maxSeabedDepthM`), produced by the same deterministic terrain function as
 * land. Seabed detail is chosen by DISTANCE TO THE SEABED, exactly like dry
 * ground, never by water thickness and never by distance to the water
 * surface. From the surface a viewer sees water, air and sparse sea life; the
 * seabed under kilometres of water is kilometres away and therefore coarse.
 * Fine seabed tiles are generated on demand when a viewer, a camera or any
 * physical body approaches the bottom. Collision, physics and place queries
 * never use this policy: they always sample full detail on demand.
 */
export const SEABED_DETAIL_POLICY = Object.freeze({
  id: 'seabed-by-distance-1',
  rule: 'distance-to-seabed',
  /** No refinement cap derived from water thickness (null by decision). */
  waterThicknessCapM: null as number | null,
  /** Deepest seabed the contract supports (Earth record 10.9 km). */
  maxSeabedDepthM: 16_000,
  collision: 'full detail on demand at every depth',
  queries: 'full detail on demand at every depth',
});

/**
 * Distance (metres) the renderer's split rule should use for a seabed point:
 * the true 3-D distance from the eye to the seabed, NOT to the ocean surface.
 * `eyeHeightM` and `seabedHeightM` are heights relative to the same datum
 * (e.g. both relative to the dated sea level, so a seabed 4 km down is -4000);
 * `horizontalM` is the along-surface distance. Valid above and below water.
 */
export function seabedDistanceM(eyeHeightM: number, seabedHeightM: number, horizontalM: number): number {
  const vertical = Math.abs(eyeHeightM - seabedHeightM);
  return Math.sqrt(vertical * vertical + horizontalM * horizontalM);
}

/** The rung that renders a seabed point under the distance-to-seabed policy. */
export function seabedLadderId(radiusM: number, eyeHeightM: number, seabedHeightM: number, horizontalM: number): LadderId {
  return levelForPose(radiusM, eyeHeightM - seabedHeightM, horizontalM);
}

/** Tolerances after relief (plan.lodLadder.tolerances_after_relief), as data.
 * `edgeM` is the tile edge at the COARSE level of the pair. */
export const LOD_TOLERANCES = Object.freeze({
  heightP99M: (edgeM: number) => Math.max(5, .03 * edgeM),
  heightMaxM: (edgeM: number) => .08 * edgeM,
  summitLossP50M: (edgeM: number) => .01 * edgeM,
  summitLossMaxM: (edgeM: number) => .04 * edgeM,
  /** RGB Euclidean p99 by coarse level of the pair. */
  colourP99: (coarseLevel: number) => coarseLevel <= 6 ? 12 : coarseLevel <= 9 ? 4 : 1,
  /** Snow label, biome name, forestPotential and ocean-flag disagreement per adjacent pair. */
  classDisagreement: .005,
  /** Ocean flag on vertices two levels share: exact. */
  sharedVertexOceanDisagreement: 0,
  coarseKeeps: Object.freeze({snowL6: .98, forestL6: .97, peakAreaL6: .85, peakAreaL8: .95}),
});

/** Budgets (plan.lodLadder.budgets): per-tile build mean <= shipped +10% at
 * every level; metadata <= 64 B per tile; streamed bytes per frame unchanged at
 * an equal pose; orbit bake <= +5%; no new texture bytes. */
export const LOD_BUDGETS = Object.freeze({buildTimeGrowth: .10, metadataBytes: 64, orbitBakeGrowth: .05});

/** Biome labels a tile's metadata histogram can name (surface-biomes.ts's ten
 * classifier labels), in a fixed order: the index is the stored class id. */
export const TILE_CLASS_LABELS: readonly string[] = Object.freeze([
  'Ocean', 'Ice field', 'Volcanic rock', 'Rock escarpment', 'Regolith plain',
  'Alpine / polar snow', 'Coastal sand', 'Dry upland', 'Mountain meadow', 'Temperate ground',
]);
/** Labels counted as snow in tile metadata (snowShare, snowlineM). */
export const SNOW_LABELS: readonly string[] = Object.freeze(['Alpine / polar snow', 'Ice field']);
