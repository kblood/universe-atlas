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
 * Math transcendental, no hash, no string compare.
 *
 * Allocation (PERF-ALLOC-AUDIT phase 2, docs/alloc-audit-2-2026-10-08.md):
 * non-inlined numeric helpers can force V8 to box doubles. The old combined
 * ecoClassOf/life01Of/groundLookOf path allocated 68-83 B/sample even though
 * its heap-growth test passed. life01Of now expands its hot helpers in place,
 * and groundLookOf evaluates eight ramps in one loop over typed tables.
 * Module-level constant copies also reduce hot-path property lookups. The
 * arithmetic operations and their order are preserved; exported helpers stay.
 * GC-counted tests measure the warmed combined path against a no-op control.
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
  // groundLookOf ramps. Red soil starts AT the Köppen A threshold (no red soil outside the tropics).
  // Widths chosen so a 0.01 K or 0.001 moisture step moves a channel by <= 0.02.
  PEAT_WARMEST_LO_K: 280, PEAT_WARMEST_HI_K: 286,
  LITTER_COLDEST_LO_K: 264, LITTER_COLDEST_HI_K: 272, LITTER_MOIST_LO: 0.40, LITTER_MOIST_HI: 0.50, LITTER_GAIN: 0.6,
  ARID_MOIST_LO: 0.24, ARID_MOIST_HI: 0.44,
  RED_COLDEST_LO_K: 291.15, RED_COLDEST_HI_K: 295.15, RED_MOIST_LO: 0.40, RED_MOIST_HI: 0.55,
  SCREE_SLOPE_LO_DEG: 22, SCREE_SLOPE_HI_DEG: 38, ALPINE_SCREE_SLOPE_LO_DEG: 6, ALPINE_SCREE_SLOPE_HI_DEG: 22, ALPINE_SCREE_GAIN: 0.6,
});
const K = ECO_CLASS_CALIBRATION;
// Module-level copies of the thresholds ecoClassOf reads: the same doubles, less bytecode than `K.*` loads
// (module header "Allocation").
const STERILE_ANNUAL_K = K.STERILE_ANNUAL_K, STERILE_WARMEST_K = K.STERILE_WARMEST_K, NIVAL_SNOW = K.NIVAL_SNOW,
  FREEZE_K = K.FREEZE_K, TUNDRA_WARMEST_K = K.TUNDRA_WARMEST_K, COAST_HEIGHT_M = K.COAST_HEIGHT_M, COAST_SAND = K.COAST_SAND,
  DESERT_MOISTURE = K.DESERT_MOISTURE, HOT_DESERT_ANNUAL_K = K.HOT_DESERT_ANNUAL_K, TROPICAL_COLDEST_K = K.TROPICAL_COLDEST_K,
  TROPICAL_WET_MOISTURE = K.TROPICAL_WET_MOISTURE, BOREAL_COLDEST_K = K.BOREAL_COLDEST_K, BOREAL_WARMEST_K = K.BOREAL_WARMEST_K,
  BOREAL_MOISTURE = K.BOREAL_MOISTURE, SUBTROPICAL_ANNUAL_K = K.SUBTROPICAL_ANNUAL_K, SUBTROPICAL_COLDEST_K = K.SUBTROPICAL_COLDEST_K,
  FOREST_MOISTURE = K.FOREST_MOISTURE;

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
  if (annualK >= STERILE_ANNUAL_K || warmestK >= STERILE_WARMEST_K) return 12;
  if (snow > NIVAL_SNOW || warmestK < FREEZE_K) return 0;
  if (warmestK < TUNDRA_WARMEST_K) return datumWarmestK < TUNDRA_WARMEST_K ? 1 : 2;
  if (heightAboveSeaM < COAST_HEIGHT_M && sandW > COAST_SAND) return 11;
  if (effMoisture < DESERT_MOISTURE) return annualK >= HOT_DESERT_ANNUAL_K ? 9 : 10;
  if (coldestK >= TROPICAL_COLDEST_K) return effMoisture >= TROPICAL_WET_MOISTURE ? 7 : 8;
  if (coldestK < BOREAL_COLDEST_K && warmestK < BOREAL_WARMEST_K && effMoisture >= BOREAL_MOISTURE) return 3;
  if (effMoisture >= FOREST_MOISTURE) {
    // No upper annual bound (unlike a Köppen Cfa box): a warmer sample can
    // only move to the tropical classes above, which keeps the thermal rank
    // monotone (docs/eco-class-v1.md §3).
    return annualK >= SUBTROPICAL_ANNUAL_K && coldestK >= SUBTROPICAL_COLDEST_K ? 6 : 4;
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
  // npp01Of and both ecoRamp calls written out: the same operations in the same order (module header "Allocation").
  let life = ecoClass >= 0 && ecoClass < CLASS_COUNT ? NPP_REL[ecoClass]! : 0;
  if (life === 0) return 0;
  let t = 0;
  if (warmestK > LIFE_HEAT_LO_K) {
    t = (warmestK - LIFE_HEAT_LO_K) / LIFE_HEAT_SPAN;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    life *= 1 - t * t * (3 - 2 * t);
  }
  if (ecoClass === 0) {
    t = (annualK - NIVAL_LIFE_LO_K) / NIVAL_LIFE_SPAN;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    life *= t * t * (3 - 2 * t);
  }
  return life;
}
// life01Of's tables: ECO_NPP_REL copied into a typed array (the same doubles), and ecoRamp's (hi - lo) computed once
// (the same double ecoRamp computes per call).
const CLASS_COUNT = ECO_CLASS_COUNT, NPP_REL = Float64Array.from(ECO_NPP_REL);
const LIFE_HEAT_LO_K = K.LIFE_HEAT_LO_K, LIFE_HEAT_SPAN = K.LIFE_HEAT_HI_K - K.LIFE_HEAT_LO_K;
const NIVAL_LIFE_LO_K = K.NIVAL_LIFE_LO_K, NIVAL_LIFE_SPAN = K.NIVAL_LIFE_HI_K - K.NIVAL_LIFE_LO_K;

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
 * flat sample (the harness site). Returns `out`. Writes into module scratch
 * (typed arrays) and allocates nothing from an optimised caller (module header
 * "Allocation"). Scratch is private to this module.
 */
export function groundLookOf(warmestK: number, annualK: number, coldestK: number, effMoisture: number,
  treeline01: number, slopeDeg: number, out: Float32Array | number[]): Float32Array | number[] {
  void annualK; // reserved for climate v2 (heat-cap bleaching); kept in the signature now so P4 never changes call sites.
  // The eight ramps, one loop (formerly eight rampInv calls): LOOK_R[i] = smoothstep(clamp((LOOK_X[i] - lo) * inv)),
  // ecoRamp with a precomputed 1/(hi-lo) (the same value up to the last ulp of the reciprocal; continuity and the
  // zero/one plateaus are exact). Rows: peat, litter cold, litter moist, arid, red warm, red moist, scree, alpine scree.
  const x = LOOK_X, r = LOOK_R;
  x[0] = warmestK; x[1] = coldestK; x[2] = effMoisture; x[3] = effMoisture;
  x[4] = coldestK; x[5] = effMoisture; x[6] = slopeDeg; x[7] = slopeDeg;
  for (let i = 0; i < 8; i++) {
    let t = (x[i]! - LOOK_LO[i]!) * LOOK_INV[i]!;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    r[i] = t * t * (3 - 2 * t);
  }
  const peat = 1 - r[0]!;
  const litter = LITTER_GAIN * (1 - r[1]!) * r[2]!;
  out[0] = peat > litter ? peat : litter;
  out[1] = 1 - r[3]!;
  out[2] = r[4]! * r[5]!;
  const steep = r[6]!;
  let tl = treeline01; if (tl < 0) tl = 0; else if (tl > 1) tl = 1;
  out[3] = steep + (1 - steep) * (1 - tl) * ALPINE_SCREE_GAIN * r[7]!;
  return out;
}
const INV_PEAT = 1 / (K.PEAT_WARMEST_HI_K - K.PEAT_WARMEST_LO_K);
const INV_LITTER_T = 1 / (K.LITTER_COLDEST_HI_K - K.LITTER_COLDEST_LO_K);
const INV_LITTER_M = 1 / (K.LITTER_MOIST_HI - K.LITTER_MOIST_LO);
const INV_ARID = 1 / (K.ARID_MOIST_HI - K.ARID_MOIST_LO);
const INV_RED_T = 1 / (K.RED_COLDEST_HI_K - K.RED_COLDEST_LO_K);
const INV_RED_M = 1 / (K.RED_MOIST_HI - K.RED_MOIST_LO);
const INV_SCREE = 1 / (K.SCREE_SLOPE_HI_DEG - K.SCREE_SLOPE_LO_DEG);
const INV_ALPINE_SCREE = 1 / (K.ALPINE_SCREE_SLOPE_HI_DEG - K.ALPINE_SCREE_SLOPE_LO_DEG);
const LOOK_LO = Float64Array.of(K.PEAT_WARMEST_LO_K, K.LITTER_COLDEST_LO_K, K.LITTER_MOIST_LO, K.ARID_MOIST_LO,
  K.RED_COLDEST_LO_K, K.RED_MOIST_LO, K.SCREE_SLOPE_LO_DEG, K.ALPINE_SCREE_SLOPE_LO_DEG);
const LOOK_INV = Float64Array.of(INV_PEAT, INV_LITTER_T, INV_LITTER_M, INV_ARID, INV_RED_T, INV_RED_M, INV_SCREE, INV_ALPINE_SCREE);
/** groundLookOf's per-call scratch (inputs, ramp values): typed, so storing a double never allocates. */
const LOOK_X = new Float64Array(8), LOOK_R = new Float64Array(8);
const LITTER_GAIN = K.LITTER_GAIN, ALPINE_SCREE_GAIN = K.ALPINE_SCREE_GAIN;

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
