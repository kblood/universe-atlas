/** Individual variation for the modular creature composer (pure, three-free).
 *
 * A composer recipe names a species (COMPOSER_SPECIES_KEYS) and one animal of it
 * (COMPOSER_INDIVIDUAL_KEYS: individualSeed, sex, maturity, condition).
 * composerIndividualTraits() turns the individual keys into a deterministic set of
 * small, correlated deviations; deriveComposerIndividual() applies the recipe-level
 * part of them (proportions, sex, growth, condition, allometry) and returns the
 * effective recipe that the rig and skin build. Trait-level parts (horn, ear and eye
 * scale, limb robustness, torso lobes, carriage, gait desync, coat drift, count
 * offsets) are read by the rig and skin from the same traits.
 *
 * Determinism: the stream is composerRandom(`composer-individual-v2/<speciesKey>/<individualSeed>`)
 * with a fixed, append-only draw order (see drawIndividual). speciesKey hashes only the
 * anatomical choice keys, which derivation never changes, so the latents of an
 * individual are identical whether they are computed from the species recipe or from
 * its effective recipe, and colour controls (palette, colorSeed, pattern, marks ...)
 * can never change geometry.
 *
 * individualSeed 0 is the species type specimen: every latent is 0 and 'auto' sex
 * resolves to 'none'. With maturity 1, condition 0 and allometry 0 the derivation
 * is the identity, so v1 recipes build exactly as before.
 *
 * Only buildComposerSource may call deriveComposerIndividual: derivation is not
 * idempotent (deriving an effective recipe again would apply the deltas twice).
 * Code that holds an effective recipe (rig, skin) calls composerIndividualTraits. */
import { type ComposerRecipe } from './fauna-composer-recipe.ts';
export declare const COMPOSER_INDIVIDUAL_VERSION = "fauna-composer-individual-2";
/** Anatomical choice keys: the only species keys the individual stream depends on. Frozen: eyes and iris are
 * deliberately NOT here (an eye or iris choice never re-rolls a herd). */
export declare const COMPOSER_ANATOMY_CHOICE_KEYS: readonly ["layout", "torso", "head", "horns", "legs", "feet", "arms", "hands", "tail", "armor", "wings", "trunk"];
export type ComposerSex = 'none' | 'female' | 'male';
export interface ComposerIndividualTraits {
    version: typeof COMPOSER_INDIVIDUAL_VERSION;
    individualSeed: number;
    /** 8-hex hash of the anatomical choice keys. */
    speciesKey: string;
    /** Resolved sex: 'none' for the type specimen or a species without dimorphism (unless set explicitly). */
    sex: ComposerSex;
    maturity: number;
    condition: number;
    /** Correlated latents, each in [-2, 2] (unscaled by variability; 0 for the type specimen). */
    size: number;
    limb: number;
    neck: number;
    head: number;
    tail: number;
    mass: number;
    /** Body pitch latent in [-2, 2] (applied to the recipe's posture, additively). */
    posture: number;
    /** Horn length multiplier (variation x sex x maturity^2). */
    hornScale: number;
    /** Additive horn curvature change. */
    hornCurl: number;
    /** Signed left/right horn length asymmetry (fraction). */
    hornAsym: number;
    earScale: number;
    eyeScale: number;
    /** Limb radius multiplier (variation + condition). */
    limbRadius: number;
    /** Per-segment leg length jitter (fractions, renormalised by the rig). */
    segmentJitter: {
        fore: [number, number, number];
        hind: [number, number, number];
    };
    /** Torso lobe offsets, each z x variability in [-2, 2]. */
    torso: {
        chest: number;
        belly: number;
        rump: number;
        waist: number;
        withers: number;
    };
    /** Rest carriage offsets in radians. */
    carriage: {
        neck: number;
        headPitch: number;
        tail: number;
    };
    motion: {
        phase: number;
        periodScale: number;
        dutyDelta: number;
        liftScale: number;
        breathPhase: number;
        lookPhase: number;
    };
    coat: {
        driftKey: string;
        juvenileSpots: number;
    };
    /** Integer count offsets for repeated parts. */
    countScale: {
        osteoderm: number;
        plate: number;
        feather: number;
    };
    /** Allometric factors from the recipe's body length (metres, rounded to 1 mm) and allometry strength. */
    allometry: {
        limbRobust: number;
        headRel: number;
        eyeRel: number;
    };
    /** True iff individualSeed 0, maturity 1, condition 0, sex 'none' and allometry 0. */
    neutral: boolean;
}
export interface ComposerIndividual {
    /** The effective recipe the rig and skin build. */
    recipe: ComposerRecipe;
    traits: ComposerIndividualTraits;
    /** Human-readable list of every applied change and every range clamp. Empty when nothing changed. */
    deltas: string[];
}
/** Hash of the anatomical choice keys (derivation never changes them). It hashes composerAnatomyProjection(recipe):
 * the proboscis face projects to the legacy muzzle (its derived trunk is kept), so a migrated muzzle+trunk link keeps
 * its species key, individuals and coat drift. */
export declare function composerSpeciesKey(recipe: ComposerRecipe): string;
/** Deterministic traits of one individual. Reads only the individual keys, the anatomical choice keys,
 * variability, dimorphism, allometry, marks (juvenile-spot bit) and bodyLength rounded to 1 mm (allometry). */
export declare function composerIndividualTraits(input: ComposerRecipe): ComposerIndividualTraits;
/** Applies one individual to its species recipe. Pure; see the module note on idempotence. */
export declare function deriveComposerIndividual(input: ComposerRecipe): ComposerIndividual;
