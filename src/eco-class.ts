/**
 * ECO-CLASS-1: one ABSOLUTE eco-class table (Köppen-Geiger / Whittaker) for
 * every planet with air and water. It is the shared vocabulary that macro
 * colour, ground look, tree species, understory and fauna roles key on
 * (biome increment 2, P3; docs/eco-class-v1.md).
 *
 * Absolute means the thresholds are physical temperatures (K) and effective
 * moisture, never planet-relative (the surface-climate `climateCode` is
 * anchor-relative and must never be used as a class key), and never tuned per
 * planet.
 *
 * Pure and unwired: nothing in the renderer, the life files or the digests
 * reads this module yet. Consumers arrive in later packages (P4 visual, P5
 * forest, P6 life).
 *
 * Determinism: arithmetic only (+ - * / min max floor and comparisons). No
 * Math transcendental, no hash, no string compare, no allocation per call.
 */

export const ECO_CLASS_VERSION = 'eco-class-1';

/** Class ids. Ocean is not a class: callers skip ocean samples. */
export const ECO_CLASS = Object.freeze({
  NIVAL: 0, ARCTIC_TUNDRA: 1, ALPINE_MEADOW: 2, BOREAL: 3, TEMPERATE_FOREST: 4,
  TEMPERATE_GRASS: 5, HUMID_SUBTROPICAL: 6, TROPICAL_WET: 7, SAVANNA: 8,
  HOT_DESERT: 9, COLD_DESERT: 10, COAST: 11, STERILE_HOT: 12, NON_VEGETATED: 13,
} as const);
export type EcoClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export const ECO_CLASS_COUNT = 14;

export const ECO_CLASS_LABELS: readonly string[] = Object.freeze([
  'Nival / ice margin', 'Arctic tundra', 'Alpine meadow', 'Boreal taiga',
  'Temperate forest', 'Temperate grassland / steppe', 'Humid subtropical forest',
  'Tropical wet forest', 'Savanna', 'Hot desert', 'Cold desert / steppe', 'Coast',
  'Sterile hot ground', 'Non-vegetated',
]);

/**
 * Every threshold. A test pins sha256(JSON.stringify(ECO_CLASS_CALIBRATION));
 * changing any value forces an ECO_CLASS_VERSION bump. Sources per value are
 * in docs/eco-class-v1.md (each flagged 'verified (source)' or 'from memory').
 */
export const ECO_CLASS_CALIBRATION = Object.freeze({
  // Class 12: no vascular canopy survives (heat cap; GEOPHYSICS follow-up).
  STERILE_ANNUAL_K: 320, STERILE_WARMEST_K: 335,
  // Class 0: permanent snow, or no month above freezing (Köppen EF).
  NIVAL_SNOW: 0.6, FREEZE_K: 273.15,
  // Classes 1/2: warmest month below 10 C (Köppen ET; Körner & Paulsen 2004 treeline).
  TUNDRA_WARMEST_K: 283.15,
  // Class 11: low, sandy shore strip (the classifier's own 'Coastal sand' gate is 120 m).
  COAST_HEIGHT_M: 120, COAST_SAND: 0.5,
  // Arid split (Köppen B): effective moisture below this is desert; hot/cold at Ta 18 C.
  DESERT_MOISTURE: 0.30, HOT_DESERT_ANNUAL_K: 291.15,
  // Class 7/8: coldest month at or above 18 C (Köppen A); wet vs seasonal moisture.
  TROPICAL_COLDEST_K: 291.15, TROPICAL_WET_MOISTURE: 0.62,
  // Class 3: coldest month below -3 C (Köppen D) and a short summer (warmest < 22 C, not Dfa).
  BOREAL_COLDEST_K: 270.15, BOREAL_WARMEST_K: 295.15, BOREAL_MOISTURE: 0.44,
  // Class 6: warm annual mean, mild winter (Köppen Cfa-like).
  SUBTROPICAL_ANNUAL_K: 290, SUBTROPICAL_COLDEST_K: 283,
  // Class 4 vs 5: forest needs this effective moisture.
  FOREST_MOISTURE: 0.5,
  // life01: heat fade (TwP) and cold-margin fade for class 0 (Ta).
  LIFE_HEAT_LO_K: 313, LIFE_HEAT_HI_K: 325, NIVAL_LIFE_LO_K: 243, NIVAL_LIFE_HI_K: 263,
  // groundLookOf ramps: half-widths chosen so a 0.01 K or 0.001 moisture step moves a channel by <= 0.02.
  PEAT_WARMEST_LO_K: 280, PEAT_WARMEST_HI_K: 286,
  LITTER_COLDEST_LO_K: 264, LITTER_COLDEST_HI_K: 272, LITTER_MOIST_LO: 0.40, LITTER_MOIST_HI: 0.50, LITTER_GAIN: 0.6,
  ARID_MOIST_LO: 0.24, ARID_MOIST_HI: 0.44,
  RED_COLDEST_LO_K: 289.65, RED_COLDEST_HI_K: 293.65, RED_MOIST_LO: 0.40, RED_MOIST_HI: 0.55,
  SCREE_SLOPE_LO_DEG: 22, SCREE_SLOPE_HI_DEG: 38, ALPINE_SCREE_SLOPE_LO_DEG: 6, ALPINE_SCREE_SLOPE_HI_DEG: 22, ALPINE_SCREE_GAIN: 0.6,
});
const K = ECO_CLASS_CALIBRATION;

/** Classes whose LIFE behaviour stays byte-identical to increment 1 (the
 * harness site SITE_A lies in them). Frozen. */
export const LEGACY_BEHAVIOUR_CLASSES: ReadonlySet<number> = Object.freeze(new Set([4, 5, 6])) as ReadonlySet<number>;

/**
 * Thermal rank (cold -> hot) and moisture rank (dry -> wet) per class, the
 * order the monotonicity test checks. -1 = the class is not on that axis
 * (decided by a different input: coast by height/sand, 13 by the world).
 */
export const ECO_THERMAL_RANK: readonly number[] = Object.freeze([0, 1, 1, 2, 3, 3, 4, 5, 5, 5, 3, -1, 6, -1]);
export const ECO_MOISTURE_RANK: readonly number[] = Object.freeze([-1, -1, -1, 2, 2, 1, 2, 2, 1, 0, 0, -1, -1, -1]);

/**
 * The eco class of one land sample.
 *
 * @param annualK   annual-mean temperature Ta (K)
 * @param warmestK  warmest-month temperature TwP (K). Climate v1 passes
 *                  warmestMonthK; climate v2 passes its saturated warmest month.
 * @param coldestK  coldest-month temperature Tc (K); from a classifier sample
 *                  Tc = 2*Ta - TwP (v1: warmest = Ta + h, coldest = Ta - h).
 * @param effMoisture effective moisture (0 dry .. 1 wet)
 * @param snow      snow fraction 0..1
 * @param heightAboveSeaM ground height above the CURRENT sea (m)
 * @param sandW     sand weight 0..1 (classifier weights[0])
 * @param datumWarmestK warmest month at the climate datum (TwP + lapse*max(0,h)):
 *                  tundra if trees would not grow even at the datum, alpine if they would.
 * @param living    false: no air or no water, or a volcanic world -> class 13.
 */
export function ecoClassOf(annualK: number, warmestK: number, coldestK: number, effMoisture: number,
  snow: number, heightAboveSeaM: number, sandW: number, datumWarmestK: number, living: boolean): EcoClass {
  if (!living) return 13;
  if (annualK >= K.STERILE_ANNUAL_K || warmestK >= K.STERILE_WARMEST_K) return 12;
  if (snow > K.NIVAL_SNOW || warmestK < K.FREEZE_K) return 0;
  if (warmestK < K.TUNDRA_WARMEST_K) return datumWarmestK < K.TUNDRA_WARMEST_K ? 1 : 2;
  if (heightAboveSeaM < K.COAST_HEIGHT_M && sandW > K.COAST_SAND) return 11;
  if (effMoisture < K.DESERT_MOISTURE) return annualK >= K.HOT_DESERT_ANNUAL_K ? 9 : 10;
  if (coldestK >= K.TROPICAL_COLDEST_K) return effMoisture >= K.TROPICAL_WET_MOISTURE ? 7 : 8;
  if (coldestK < K.BOREAL_COLDEST_K && warmestK < K.BOREAL_WARMEST_K && effMoisture >= K.BOREAL_MOISTURE) return 3;
  if (effMoisture >= K.FOREST_MOISTURE) {
    // No upper annual bound (unlike a Köppen Cfa box): a warmer sample can
    // only move to the tropical classes above, which keeps the thermal rank
    // monotone (docs/eco-class-v1.md §3).
    return annualK >= K.SUBTROPICAL_ANNUAL_K && coldestK >= K.SUBTROPICAL_COLDEST_K ? 6 : 4;
  }
  return 5;
}

/** Arithmetic smoothstep(lo, hi, x) in [0,1]. Exported so P4's macro colour
 * blends on exactly these thresholds. */
export function ecoRamp(x: number, lo: number, hi: number): number {
  let t = (x - lo) / (hi - lo);
  if (t < 0) t = 0; else if (t > 1) t = 1;
  return t * t * (3 - 2 * t);
}

/**
 * Relative net primary productivity per class (0..1), ordered after
 * Whittaker & Likens (1975) mean NPP by ecosystem type, normalised by tropical
 * rain forest (2200 g/m^2/yr). Values are 'from memory' (docs/eco-class-v1.md §4).
 */
export const ECO_NPP_REL: readonly number[] = Object.freeze([
  3 / 2200,    // 0 nival: extreme desert, rock, sand and ice (3)
  140 / 2200,  // 1 tundra and alpine (140)
  140 / 2200,  // 2 alpine meadow: tundra and alpine (140)
  800 / 2200,  // 3 boreal forest (800)
  1200 / 2200, // 4 temperate deciduous forest (1200)
  600 / 2200,  // 5 temperate grassland (600)
  1300 / 2200, // 6 temperate evergreen forest (1300)
  1,           // 7 tropical rain forest (2200)
  900 / 2200,  // 8 savanna (900)
  90 / 2200,   // 9 desert and semidesert scrub (90)
  90 / 2200,   // 10 desert and semidesert scrub (90)
  600 / 2200,  // 11 coast: no W&L row; grassland value (art direction)
  0,           // 12 sterile hot
  0,           // 13 non-vegetated
]);

export function npp01Of(ecoClass: number): number {
  return ecoClass >= 0 && ecoClass < ECO_CLASS_COUNT ? ECO_NPP_REL[ecoClass]! : 0;
}

/**
 * Animal vitality 0..1: relative NPP, faded out by heat (TwP 313 -> 325 K).
 * Class 0 is additionally faded by cold (Ta 243 -> 263 K) so herds persist on
 * the ice margin and thin out up the plateau. > 0 for classes 1-11 whenever
 * TwP < 325 K; 0 for classes 12-13.
 */
export function life01Of(ecoClass: number, warmestK: number, annualK: number): number {
  let life = npp01Of(ecoClass);
  if (life === 0) return 0;
  if (warmestK > K.LIFE_HEAT_LO_K) life *= 1 - ecoRamp(warmestK, K.LIFE_HEAT_LO_K, K.LIFE_HEAT_HI_K);
  if (ecoClass === 0) life *= ecoRamp(annualK, K.NIVAL_LIFE_LO_K, K.NIVAL_LIFE_HI_K);
  return life;
}

/** Ecotype per class: 0 neutral, 1 cold, 2 arid, 3 humid-warm, 4 alpine, 5 coast. */
export const ECO_ECOTYPE: readonly number[] = Object.freeze([1, 1, 4, 1, 0, 0, 0, 3, 3, 2, 2, 5, 0, 0]);
export const ECOTYPE_LABELS: readonly string[] = Object.freeze(['neutral', 'cold', 'arid', 'humid-warm', 'alpine', 'coast']);
export function ecotypeOf(ecoClass: number): number {
  return ecoClass >= 0 && ecoClass < ECO_CLASS_COUNT ? ECO_ECOTYPE[ecoClass]! : 0;
}

/** groundLookOf output channels, in order. */
export const GROUND_LOOK_CHANNELS: readonly string[] = Object.freeze(['cold-peat-litter', 'arid-straw-sand', 'tropical-red-soil', 'scree']);

/**
 * Four CONTINUOUS ground-look weights in [0,1], written into `out[0..3]`:
 * cold peat/litter, arid straw/sand, tropical red soil, scree. Every channel is
 * a smooth ramp on distance to a threshold, never a class switch, because P4
 * interpolates it as a vertex attribute. All zeros for a temperate, moist,
 * flat sample (the harness site). Returns `out`; no allocation.
 */
export function groundLookOf(warmestK: number, annualK: number, coldestK: number, effMoisture: number,
  treeline01: number, slopeDeg: number, out: Float32Array | number[]): Float32Array | number[] {
  void annualK; // reserved for climate v2 (heat-cap bleaching); kept in the signature now so P4 never changes call sites.
  const peat = 1 - rampInv(warmestK, K.PEAT_WARMEST_LO_K, INV_PEAT);
  const litter = K.LITTER_GAIN * (1 - rampInv(coldestK, K.LITTER_COLDEST_LO_K, INV_LITTER_T))
    * rampInv(effMoisture, K.LITTER_MOIST_LO, INV_LITTER_M);
  out[0] = peat > litter ? peat : litter;
  out[1] = 1 - rampInv(effMoisture, K.ARID_MOIST_LO, INV_ARID);
  out[2] = rampInv(coldestK, K.RED_COLDEST_LO_K, INV_RED_T) * rampInv(effMoisture, K.RED_MOIST_LO, INV_RED_M);
  const steep = rampInv(slopeDeg, K.SCREE_SLOPE_LO_DEG, INV_SCREE);
  let tl = treeline01; if (tl < 0) tl = 0; else if (tl > 1) tl = 1;
  out[3] = steep + (1 - steep) * (1 - tl) * K.ALPINE_SCREE_GAIN * rampInv(slopeDeg, K.ALPINE_SCREE_SLOPE_LO_DEG, INV_ALPINE_SCREE);
  return out;
}
/** ecoRamp with a precomputed 1/(hi-lo) (same value up to the last ulp of the
 * reciprocal; continuity and the zero/one plateaus are exact). */
function rampInv(x: number, lo: number, inv: number): number {
  let t = (x - lo) * inv;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  return t * t * (3 - 2 * t);
}
const INV_PEAT = 1 / (K.PEAT_WARMEST_HI_K - K.PEAT_WARMEST_LO_K);
const INV_LITTER_T = 1 / (K.LITTER_COLDEST_HI_K - K.LITTER_COLDEST_LO_K);
const INV_LITTER_M = 1 / (K.LITTER_MOIST_HI - K.LITTER_MOIST_LO);
const INV_ARID = 1 / (K.ARID_MOIST_HI - K.ARID_MOIST_LO);
const INV_RED_T = 1 / (K.RED_COLDEST_HI_K - K.RED_COLDEST_LO_K);
const INV_RED_M = 1 / (K.RED_MOIST_HI - K.RED_MOIST_LO);
const INV_SCREE = 1 / (K.SCREE_SLOPE_HI_DEG - K.SCREE_SLOPE_LO_DEG);
const INV_ALPINE_SCREE = 1 / (K.ALPINE_SCREE_SLOPE_HI_DEG - K.ALPINE_SCREE_SLOPE_LO_DEG);

/** Structural view of a surface-biomes classifier result (no import, so this
 * module stays pure and dependency-free). */
export type EcoBiomeSampleLike = {
  readonly annualMeanTempK: number; readonly warmestMonthK: number; readonly effectiveMoisture: number;
  readonly snowFraction: number; readonly weights: ArrayLike<number>; readonly ocean: boolean;
};

/**
 * The class of a live classifier sample (surface-biomes biomeClassifier).
 * Tc = 2*Ta - TwP (climate v1: warmest/coldest = Ta +/- seasonal half-range).
 * `lapseKPerM` is the forcing's lapse rate; `heightAboveSeaM` the ground
 * height above the current sea. Returns -1 for an ocean sample.
 */
export function ecoClassOfBiomeSample(sample: EcoBiomeSampleLike, heightAboveSeaM: number, lapseKPerM: number, living: boolean): EcoClass | -1 {
  if (sample.ocean) return -1;
  const ta = sample.annualMeanTempK, tw = sample.warmestMonthK;
  return ecoClassOf(ta, tw, 2 * ta - tw, sample.effectiveMoisture, sample.snowFraction,
    heightAboveSeaM, sample.weights[0] ?? 0, tw + lapseKPerM * (heightAboveSeaM > 0 ? heightAboveSeaM : 0), living);
}
