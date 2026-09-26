/**
 * Deterministic impact-crater population, designed to be ADDED to terrain
 * height later (this module never edits `terrain.ts`; a future integrator
 * sums `craterHeightDeltaAt` into `terrain.ts`'s `elevationM`).
 *
 * STANDALONE MODULE: `f(seed, bodyAddress, radiusM, params)` /
 * `f(field, dir)` only, no `world-time.ts`/`stellar-evolution.ts` import.
 * `params.surfaceAgeMyr` is a plain number (planet age in Myr, from
 * `PlanetLifecycle`/`biosphereAt`-style plumbing once wired in); every
 * `Crater.formationNs` and `craterAgeGate`'s `t` are **elapsed ns since the
 * surface's own zero epoch** (i.e. since `surfaceAgeMyr === 0`, not an
 * absolute Big-Bang-relative `Ns`) - the same "caller supplies a consistent
 * zero point" convention `planet-clouds.ts` documents.
 *
 * Design:
 *  - a fixed size-frequency power law (`SIZE_BANDS`, an engineering
 *    approximation, not literal lunar/Mars crater statistics) split into a
 *    handful of size bands, each on its own uniform 3D voxel grid sized to
 *    that band's crater radius;
 *  - `craterHeightDeltaAt`/`craterCandidatesAt` look up only the 27
 *    neighbouring voxels (3x3x3) around the query direction per band - O(1)
 *    voxels, so cost is O(craters actually found nearby), never O(all
 *    craters on the body);
 *  - craters are generated lazily per voxel (cached on `CraterField`) from a
 *    pure hash of `(seed, bodyAddress, band, voxel)` - identical regardless
 *    of visit order;
 *  - using a uniform 3D voxel hash (rather than a literal cube-face (u,v)
 *    grid) makes the lookup trivially seam-free: there is no cube-face
 *    boundary anywhere in voxel space for a crater profile to break across,
 *    satisfying the "seam-free across cube faces" requirement more strongly
 *    than face-local grid bookkeeping would.
 *
 * Radius sampling and Poisson counts route through `det-math.ts`
 * (`detPow`/`expNeg`), never raw `Math.pow`/`Math.exp`, so the discrete
 * crater population (which craters exist, their radii/ids) is immune to the
 * cross-engine libm drift that module documents.
 */
import { rng, type V3 } from './catalog.ts';
import { expNeg, detPow, detHypot } from './det-math.ts';

export const PLANET_CRATERS_VERSION = 'planet-craters-1';

const NS = 1_000_000_000n;
const YEAR_NS = 31_557_600n * NS;

export type CraterParams = {
  /** Current age of the surface in Myr - the upper bound on crater formation
   * time and the main driver of accumulated crater count. */
  surfaceAgeMyr: number;
  /** Erosion/resurfacing sources that reduce the surviving crater count. */
  hasAtmosphere: boolean;
  hasOcean: boolean;
  hasActiveBiosphere: boolean;
};

export type Crater = {
  id: string;
  /** Unit direction of the crater centre. */
  center: V3;
  radiusM: number;
  depthM: number;
  rimHeightM: number;
  centralPeak: boolean;
  /** Elapsed ns since the surface's own zero epoch (see module doc). */
  formationNs: bigint;
};

type Band = { minRadiusM: number; maxRadiusM: number; cellSizeM: number; lambdaPerCell: number };

export type CraterField = {
  seed: string;
  bodyAddress: string;
  radiusM: number;
  params: CraterParams;
  bands: Band[];
  surfaceAgeNs: bigint;
  /** Craters with `formationNs > ageCutoffNs` are absent. Defaults to
   * `surfaceAgeNs` (every crater that has ever formed, i.e. "today"). */
  ageCutoffNs: bigint;
  cellCache: Map<string, Crater[]>;
};

const REF_RADIUS_M = 1_700_000; // Moon-ish reference body for SIZE_BANDS calibration
type SizeBandSpec = { minRadiusM: number; maxRadiusM: number; refCountPerGyr: number };
/** Engineering-approximation size-frequency distribution, calibrated so a
 * `REF_RADIUS_M` airless body accumulates a plausible, order-of-magnitude
 * lunar-like crater population over a few Gyr - not a literal astrophysical
 * fit (see this file's own header comment). */
const SIZE_BANDS: SizeBandSpec[] = [
  { minRadiusM: 80_000, maxRadiusM: 240_000, refCountPerGyr: 3 },
  { minRadiusM: 24_000, maxRadiusM: 80_000, refCountPerGyr: 22 },
  { minRadiusM: 7_000, maxRadiusM: 24_000, refCountPerGyr: 190 },
  { minRadiusM: 2_000, maxRadiusM: 7_000, refCountPerGyr: 1_600 },
  { minRadiusM: 600, maxRadiusM: 2_000, refCountPerGyr: 12_000 },
];
/** Cell size relative to a band's largest crater: comfortably larger than
 * one crater diameter so the +-1-voxel neighbour search (worst-case jitter
 * of `cellSizeM/2`) never misses a crater generated in an adjacent voxel. */
const CELL_FACTOR = 2.6;
/** Simple/complex-crater transition radius - an engineering placeholder
 * (real thresholds depend on surface gravity/material), not gravity-scaled. */
const CENTRAL_PEAK_RADIUS_M = 9_000;
/** Radius span over which the simple->complex depth/diameter relaxation
 * (see `generateVoxelCraters`) completes, starting at `CENTRAL_PEAK_RADIUS_M`. */
const TRANSITION_WIDTH_M = 12_000;
/** Power-law exponent for `powerLawSample` below (differential
 * size-frequency slope) - a moderate crater-population placeholder. */
const SFD_EXPONENT = 2.4;

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function erosionSurvival(params: CraterParams): number {
  let s = 1;
  if (params.hasAtmosphere) s *= 0.55;
  if (params.hasOcean) s *= 0.4;
  if (params.hasActiveBiosphere) s *= 0.5;
  return Math.max(0.02, s);
}

/** Local port of `catalog.ts`'s (unexported) `poisson` - identical
 * chunked-mean pattern, built on the portable `expNeg` instead of
 * `Math.exp`, so the discrete crater COUNT per voxel is engine-portable. */
function poissonLocal(lambda: number, r: () => number): number {
  if (lambda <= 0) return 0;
  let count = 0,
    remaining = lambda;
  while (remaining > 0) {
    const part = Math.min(remaining, 12);
    const limit = expNeg(part);
    let p = 1,
      n = 0;
    do {
      p *= Math.max(r(), 1e-12);
      n++;
    } while (p > limit);
    count += n - 1;
    remaining -= part;
  }
  return count;
}

/** Inverse-CDF sample of a power-law-distributed radius in `[rmin, rmax]`
 * with differential exponent `b` (`f(r) ~ r^-b`), via the portable `detPow`
 * (never `Math.pow`/`**`) since the sampled radius feeds the crater's
 * existence/overlap footprint - a discrete, branch-affecting decision. */
function powerLawSample(rmin: number, rmax: number, u: number, b: number): number {
  if (b === 1) return rmin * detPow(rmax / rmin, u);
  const p = 1 - b;
  const rminP = detPow(rmin, p),
    rmaxP = detPow(rmax, p);
  const val = rminP + u * (rmaxP - rminP);
  return detPow(val, 1 / p);
}

export function craterField(seed: string, bodyAddress: string, radiusM: number, params: CraterParams): CraterField {
  const areaScale = (radiusM / REF_RADIUS_M) * (radiusM / REF_RADIUS_M);
  const survival = erosionSurvival(params);
  const ageMyr = Math.max(0, params.surfaceAgeMyr);
  const surfaceAgeNs = BigInt(Math.round(ageMyr * 1e6)) * YEAR_NS;
  const gyrFraction = ageMyr / 1000;
  const bands: Band[] = SIZE_BANDS.map((spec) => {
    const cellSizeM = spec.maxRadiusM * CELL_FACTOR;
    const shellCells = Math.max(1, (4 * Math.PI * radiusM * radiusM) / (cellSizeM * cellSizeM));
    const expectedTotal = spec.refCountPerGyr * areaScale * gyrFraction * survival;
    return { minRadiusM: spec.minRadiusM, maxRadiusM: spec.maxRadiusM, cellSizeM, lambdaPerCell: expectedTotal / shellCells };
  });
  return { seed, bodyAddress, radiusM, params, bands, surfaceAgeNs, ageCutoffNs: surfaceAgeNs, cellCache: new Map() };
}

/** Returns a field where craters with `formationNs > t` are absent from
 * `craterHeightDeltaAt`. `t` is elapsed ns since the surface's own zero
 * epoch (see module doc), clamped to `[0, surfaceAgeNs]`. Shares the raw
 * per-voxel crater cache with `field` (crater existence/attributes never
 * depend on the gate, only which of them are currently visible do). */
export function craterAgeGate(field: CraterField, t: bigint): CraterField {
  const cutoff = t < 0n ? 0n : t > field.surfaceAgeNs ? field.surfaceAgeNs : t;
  return { ...field, ageCutoffNs: cutoff };
}

function voxelKey(seed: string, bodyAddress: string, band: number, vx: number, vy: number, vz: number): string {
  return JSON.stringify([seed, bodyAddress, 'crater-voxel', band, vx, vy, vz]);
}

function generateVoxelCraters(field: CraterField, band: number, vx: number, vy: number, vz: number): Crater[] {
  const spec = field.bands[band];
  const key = voxelKey(field.seed, field.bodyAddress, band, vx, vy, vz);
  const countR = rng(key + '/count');
  const count = poissonLocal(spec.lambdaPerCell, countR);
  const craters: Crater[] = [];
  const cell = spec.cellSizeM;
  const centerM: V3 = [(vx + 0.5) * cell, (vy + 0.5) * cell, (vz + 0.5) * cell];
  const surfaceAgeNsNumber = Number(field.surfaceAgeNs);
  for (let idx = 0; idx < count; idx++) {
    const cr = rng(key + '/' + idx);
    const jitter: V3 = [(cr() - 0.5) * cell, (cr() - 0.5) * cell, (cr() - 0.5) * cell];
    const pointM: V3 = [centerM[0] + jitter[0], centerM[1] + jitter[1], centerM[2] + jitter[2]];
    const mag = detHypot(pointM[0], pointM[1], pointM[2]);
    if (mag < 1) continue; // degenerate near-zero direction (astronomically unlikely), skip
    const center: V3 = [pointM[0] / mag, pointM[1] / mag, pointM[2] / mag];
    const radiusM = powerLawSample(spec.minRadiusM, spec.maxRadiusM, cr(), SFD_EXPONENT);
    // depth/diameter ratio: ~0.12-0.22 for small simple bowls, relaxing
    // toward ~0.014 for the largest basins (viscous relaxation/isostatic
    // flattening - real craters do NOT keep a constant d/D ratio as they
    // grow; an engineering approximation, not a literal relaxation model).
    const simpleRatio = 0.12 + cr() * 0.1;
    // The simple->complex morphology transition completes within a
    // relatively narrow band above CENTRAL_PEAK_RADIUS_M (real transition
    // diameters cluster in a comparatively tight range) - use a much
    // narrower relaxation width than the full band span, or large basins
    // keep an unrealistically steep (near-simple-crater) depth/diameter
    // ratio out to hundreds of km.
    const relaxation = clamp01((radiusM - CENTRAL_PEAK_RADIUS_M) / TRANSITION_WIDTH_M);
    const depthRatio = simpleRatio * (1 - relaxation) + 0.014 * relaxation;
    const depthM = radiusM * 2 * depthRatio;
    const rimHeightM = depthM * 0.18;
    const centralPeak = radiusM > CENTRAL_PEAK_RADIUS_M;
    const ageFrac = cr();
    const formationNs = BigInt(Math.round(ageFrac * surfaceAgeNsNumber));
    craters.push({ id: key + '/' + idx, center, radiusM, depthM, rimHeightM, centralPeak, formationNs });
  }
  field.cellCache.set(key, craters);
  return craters;
}

function neighbourVoxels(field: CraterField, dir: V3): Crater[][] {
  const p: V3 = [dir[0] * field.radiusM, dir[1] * field.radiusM, dir[2] * field.radiusM];
  const out: Crater[][] = [];
  for (let b = 0; b < field.bands.length; b++) {
    const cell = field.bands[b].cellSizeM;
    const bx = Math.floor(p[0] / cell),
      by = Math.floor(p[1] / cell),
      bz = Math.floor(p[2] / cell);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++) {
          const vx = bx + dx,
            vy = by + dy,
            vz = bz + dz;
          const key = voxelKey(field.seed, field.bodyAddress, b, vx, vy, vz);
          let craters = field.cellCache.get(key);
          if (!craters) craters = generateVoxelCraters(field, b, vx, vy, vz);
          if (craters.length) out.push(craters);
        }
  }
  return out;
}

/** Raw crater candidates near `dir` (all bands, ignoring the age gate) -
 * useful for decal placement/inspection and for tests that need the actual
 * generated population rather than only the summed height. */
export function craterCandidatesAt(field: CraterField, dir: V3): Crater[] {
  const out: Crater[] = [];
  for (const list of neighbourVoxels(field, dir)) out.push(...list);
  return out;
}

/** Smooth bowl/rim/(optional central peak) profile, in metres, continuous
 * at both the bowl/rim and rim/undisturbed-ground boundaries (0 at
 * `dist===0.85*radiusM` from both sides, 0 at `dist===1.15*radiusM`). Uses
 * `Math.sin` for the rim taper - a continuous shading value, not a
 * discrete/existence decision, so raw `Math` is fine here per this
 * package's purity rules. */
function craterProfile(c: Crater, dist: number): number {
  const R = c.radiusM;
  if (dist >= R * 1.15) return 0;
  if (dist <= R * 0.85) {
    const t = dist / (R * 0.85);
    let depth = -c.depthM * (1 - t * t);
    if (c.centralPeak) {
      const peakT = clamp01(1 - dist / (R * 0.25));
      depth += c.depthM * 0.4 * peakT * peakT;
    }
    return depth;
  }
  const u = (dist - R * 0.85) / (R * 0.3);
  const bump = Math.sin(Math.PI * u);
  return c.rimHeightM * bump;
}

/** Crater height delta (metres) at unit direction `dir`, gated by
 * `field.ageCutoffNs`. Add directly to `terrain.ts`'s `elevationM` at the
 * integration point (see this file's header comment).
 *
 * Combines overlapping craters by taking the contribution with the LARGEST
 * MAGNITUDE, not a sum: real overlapping impacts overprint/obliterate each
 * other rather than stacking depth, and naive summation of many overlapping
 * bowls produces unbounded, unphysical pits wherever several craters'
 * footprints coincide (measured during development: >2x any single
 * crater's own depth). Dominance-by-magnitude is a cheap proxy for
 * "the biggest/most-recent impact here wins" without needing to track
 * formation order. */
export function craterHeightDeltaAt(field: CraterField, dir: V3): number {
  const p: V3 = [dir[0] * field.radiusM, dir[1] * field.radiusM, dir[2] * field.radiusM];
  let dominant = 0;
  for (const list of neighbourVoxels(field, dir))
    for (const c of list) {
      if (c.formationNs > field.ageCutoffNs) continue;
      const q: V3 = [c.center[0] * field.radiusM, c.center[1] * field.radiusM, c.center[2] * field.radiusM];
      const dist = detHypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      if (dist >= c.radiusM * 1.15) continue;
      const value = craterProfile(c, dist);
      if (Math.abs(value) > Math.abs(dominant)) dominant = value;
    }
  return dominant;
}
