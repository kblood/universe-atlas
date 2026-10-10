/**
 * Pure deterministic coat-field library (fauna-coat-1).
 *
 * Evaluates a creature coat colour (linear RGB) at a bind-space sample point.
 * Used as vertex colour by the composer and the planet body; there is no GPU
 * dependency, no texture and no shader, so CPU results are exact.
 *
 * Contract:
 * - Erasable TypeScript only (Node type-strips src/*.ts): no enum, namespace or
 *   parameter properties. No `three` import, no global random source, no clock.
 * - All randomness is integer lattice hashing (pcg3d-style, Math.imul, >>>0) or
 *   the composerHash-compatible string stream for per-species and per-individual
 *   draws. The hash and noise functions below are FROZEN once merged: composer
 *   determinism and planet appearance both depend on them. Any change must be
 *   released as 'fauna-coat-2'.
 * - evaluateCoat allocates nothing; it reuses module-level scratch and writes into
 *   a caller array. No state survives between calls, so evaluation order never
 *   changes a result.
 *
 * Sample space: x, y, z are bind-space metres divided by body length, +X toward
 * the head, +Y up, z SIGNED (left and right flanks differ). dorsal is the
 * surface's up-facing measure, 1 on the spine and -1 on the belly midline.
 * along runs 0..1 within the region, from the proximal end (the end nearer the
 * torso) to the distal end (snout, hoof, tail tip, ear tip).
 */
import { type CoatPaletteId, type CoatPattern, type CoatRegion, type CoatRole, type ResolvedCoatPattern } from './fauna-coat-vocab.ts';
export declare const FAUNA_COAT_FIELD_VERSION = "fauna-coat-1";
export type CoatRGB = [number, number, number];
export type CoatColours = Record<CoatRole, CoatRGB>;
/** Which palette role a pattern's marks take: dark ('accent') or light ('belly'). */
export type CoatMarkRole = 'accent' | 'belly';
export interface CoatGenome {
    version: 'fauna-coat-1';
    /** Resolved pattern; never 'auto'. */
    pattern: ResolvedCoatPattern;
    /** OR of COAT_MARK_BITS, 0..255. */
    marks: number;
    /** Pattern frequency multiplier, 0.5..2 (higher = smaller, denser marks). */
    scale: number;
    /** Mark strength, 0..1.5 (values above 1 push past the mark colour). */
    contrast: number;
    /** Pale-belly strength, 0..1. */
    countershade: number;
    /** Dorsal value where the countershading transition is centred; default -0.45. */
    bellyLine: number;
    /** Linear RGB per role. */
    colours: CoatColours;
    markRole: CoatMarkRole;
    /** Pattern placement seed (uint32). */
    seed: number;
    /** Domain-warp amount, 0..1. */
    warp: number;
    /** Mark-coverage offset, -0.3..0.3 (positive = more marked area). */
    threshold: number;
    /** Juvenile spot strength, 0..1; only drawn when the 'juvenile-spots' mark bit is set. */
    juvenileSpots: number;
    /** Muzzle greying, 0..1. */
    greying: number;
}
export interface CoatSample {
    x: number;
    y: number;
    z: number;
    /** -1 (belly midline) .. 1 (spine). */
    dorsal: number;
    region: CoatRegion;
    /** 0..1 within the region, proximal to distal. */
    along: number;
    /**
     * Optional sampling spacing in body lengths (for example the local vertex
     * spacing). Widens edges so marks thinner than the spacing blend toward their
     * average instead of aliasing into triangle-shaped blots. Default 0.
     */
    footprint?: number;
}
/** Inclusive numeric ranges for genome fields. */
export declare const COAT_GENOME_RANGES: {
    readonly marks: readonly [0, 255];
    readonly scale: readonly [0.5, 2];
    readonly contrast: readonly [0, 1.5];
    readonly countershade: readonly [0, 1];
    readonly bellyLine: readonly [-1, 1];
    readonly warp: readonly [0, 1];
    readonly threshold: readonly [-0.3, 0.3];
    readonly juvenileSpots: readonly [0, 1];
    readonly greying: readonly [0, 1];
};
/** Pattern cells (or stripe periods) per body length at scale 1. */
export declare const COAT_CELLS_PER_BODY: Readonly<Record<ResolvedCoatPattern, number>>;
/** Integer lattice hash: uint32 for an integer point and a seed. */
export declare function hash3u(x: number, y: number, z: number, seed: number): number;
/** Smooth (quintic-interpolated) value noise in [0, 1). */
export declare function valueNoise3(x: number, y: number, z: number, seed: number): number;
/** Two-octave value-noise fBm in 3D ("2" is the octave count); result in [0, 1). */
export declare function fbm2(x: number, y: number, z: number, seed: number): number;
/** Worley noise: writes F1, F2 and the nearest cell hash (plus the offset
 * vector to the nearest feature point when out.length >= 6). Allocates nothing. */
export declare function worley3(x: number, y: number, z: number, seed: number, out: ArrayLike<number> & {
    [i: number]: number;
}): void;
/** Same algorithm as composerHash in fauna-composer-recipe.ts (kept local so this
 * module has no composer dependency; a test pins the equality). */
export declare function coatStringHash(text: string): number;
/** Same PRNG as composerRandom (mulberry32 over coatStringHash). */
export declare function coatRandom(seed: string): () => number;
export declare function srgbToLinear(c: number): number;
export declare function linearToSrgb(c: number): number;
/** Rec. 709 relative luminance of a linear colour. */
export declare function coatLuminance(c: readonly number[]): number;
export declare function hexToLinear(hex: string): CoatRGB;
/** Species colours (linear RGB per role) for a palette and colour seed, from
 * stream `coat-species-v1/<palette>/<colorSeed>`: hue +-0.04, saturation
 * x(1+-0.12), value x(1+-0.10) in HSV, then a per-role albedo clamp. */
export declare function coatSpeciesColours(paletteId: CoatPaletteId, colorSeed: number | string): CoatColours;
export declare const COAT_MORPHS: readonly ["none", "melanistic", "leucistic", "erythristic"];
export type CoatMorph = typeof COAT_MORPHS[number];
/** Morph probability per individual at variability 1 (scaled linearly by v). */
export declare const COAT_MORPH_RATES: {
    readonly melanistic: 0.012;
    readonly leucistic: 0.004;
    readonly erythristic: 0.008;
};
export interface CoatDrift {
    /** Hue shift (fraction of the colour wheel). */
    hue: number;
    /** Relative saturation change (0.1 = x1.1). */
    saturation: number;
    /** Relative value change. */
    value: number;
    /** XOR applied to the pattern seed; 0 keeps the species seed. */
    reseed: number;
    /** Relative pattern-scale change. */
    scale: number;
    /** Added to the threshold offset. */
    threshold: number;
    /** Added to the warp amount. */
    warp: number;
    /** Added to greying. */
    greying: number;
    morph: CoatMorph;
}
/** Per-individual drift from stream `coat-individual-v1/<key>`. All draws are
 * always taken in a fixed order, so the stream is stable for any variability;
 * variability 0 returns the identity drift. */
export declare function coatIndividualDrift(key: string | number, variability: number): CoatDrift;
/** Apply an individual drift; returns a new genome (the input is not modified). */
export declare function applyCoatDrift(genome: CoatGenome, drift: CoatDrift): CoatGenome;
export type CoatGenomeOverrides = Partial<Omit<CoatGenome, 'version' | 'pattern' | 'colours'>> & {
    pattern?: CoatPattern;
    colours?: Partial<CoatColours>;
};
/** Default genome for a palette and colour seed. 'auto' (the default pattern)
 * resolves through AUTO_PATTERN, so legacy palettes keep their character
 * (savanna -> reticulated, reptile -> bands, earth -> saddle). */
export declare function defaultCoatGenome(paletteId: CoatPaletteId, colorSeed: number | string, overrides?: CoatGenomeOverrides): CoatGenome;
/** Evaluate the coat at one sample, writing linear RGB to out[offset..offset+2].
 * Allocation-free (tests/fauna-coat-fields.test.mjs counts it with v8.GCProfiler against a no-op control). */
export declare function evaluateCoat(genome: CoatGenome, sample: CoatSample, out: number[] | Float32Array | Float64Array, offset?: number): void;
/** Debug/test probe of the raw pattern mask. Writes out[0]=m (0..1, before
 * region strength, belly fade and contrast), out[1]=F1, out[2]=F2 (cellular
 * patterns), out[3]=spot radius r0 (spots) or the rosette ring's inner edge as
 * an F1/F2 ratio (rosettes), out[4]=reticulated patch shade or the rosette ring's
 * outer edge as an F1/F2 ratio. Unused slots are 0. */
export declare function coatPatternProbe(genome: CoatGenome, sample: CoatSample, out: number[] | Float64Array): void;
export interface CoatWeightedSample extends CoatSample {
    weight: number;
}
export declare const COAT_CANONICAL_SAMPLE_COUNT = 512;
/** Fixed 512-point canonical body (a capsule torso, neck, head, ears, tail and
 * four limbs, in body-length units) with area weights. Built deterministically
 * from a golden-ratio lattice; no hashing involved. */
export declare function coatCanonicalSamples(): readonly CoatWeightedSample[];
/** Area-weighted mean linear colour over the canonical body (for far LODs). */
export declare function coatMeanColor(genome: CoatGenome): CoatRGB;
/** Smallest mark feature (body lengths) the genome draws, so consumers can
 * keep it above their vertex spacing (or pass footprint). 1 when nothing. */
export declare function coatMinFeature(genome: CoatGenome): number;
/** Clamp and validate an untrusted genome-like object (decoded recipes). */
export declare function normalizeCoatGenome(input: CoatGenome): CoatGenome;
/** evaluateCoat with the raw pattern mask (and the reticulated patch shade) given instead of computed: a copy of
 * evaluateCoat's body in which the pattern mask (patternMaskQ) is replaced by `mask` and the module's patch shade (PV[3]) by
 * `patch`. With mask and patch from coatPatternProbe it returns exactly what evaluateCoat returns
 * (tests/fauna-composer-coat-crisp.test.mjs). The coat colour is affine in the mask amount (both branches of the
 * pattern mix; the marks, greying and grain that follow are affine too), so the colours at mask 0 and at mask 1 (patch 0
 * and 1) are exact layers between which a fragment shader can mix with its own per-fragment mask (the crisp coat of
 * the composer skin, docs/fauna-coat-crisp-v1.md). evaluateCoat itself is unchanged (fauna-coat-1 is frozen). */
export declare function evaluateCoatWithMask(genome: CoatGenome, sample: CoatSample, out: number[] | Float32Array | Float64Array, offset: number, mask: number, patch: number): void;
/** The coat library's seed pre-mix (seedMix, unchanged) as an export, for the crisp-coat shader, which hashes with the
 * pre-mixed seed exactly as patternMaskQ does. Returns a signed 32-bit integer (>>> 0 for the unsigned bits). */
export declare function coatSeedMix(seed: number): number;
/** The pattern salts and the Worley jitter patternMaskQ uses (the module's own constants, unchanged), as exports for the
 * crisp-coat shader, which re-implements the crisp patterns' masks in GLSL with exactly these values. */
export declare const COAT_PATTERN_SALTS: Readonly<{
    warp: 739982445;
    detail: 695872825;
    mark: 1759714724;
    band: 1013904242;
}>;
export declare const COAT_WORLEY_JITTER = 0.9;
