import { type ComposerLayout, type ComposerNumberKey, type ComposerRecipe } from './fauna-composer-recipe.ts';
import { type ComposerGraph } from './fauna-composer-rig.ts';
import { type CoatPaletteId, type CoatPattern, type CoatMarkName } from './fauna-coat-vocab.ts';
import { type ComposerEyeType } from './fauna-composer-face.ts';
export declare const COMPOSER_SPECIES_GENERATOR_VERSION = "composer-species-v1";
export declare const COMPOSER_ARCHETYPES: readonly ["ungulate-grazer", "giraffid", "pachyderm", "cursorial-carnivore", "theropod", "ratite", "bird", "sprawler-lizard", "tortoise", "primate", "myriapod", "worm"];
export type ComposerArchetype = typeof COMPOSER_ARCHETYPES[number];
/** Resampling attempts after the first draw. */
export declare const COMPOSER_SPECIES_MAX_RESAMPLES = 8;
type R = ComposerRecipe;
type Weighted<T> = readonly (readonly [T, number])[];
/** Numeric prior: [lo, hi] mapped from a unit-variance latent g as lo + (hi - lo) * clamp(0.5 + g / 4). */
type Span = readonly [number, number];
interface Prior {
    weight: number;
    layout: ComposerLayout;
    legPairs?: Span;
    num: Partial<Record<ComposerNumberKey, Span>>;
    choice: {
        [K in 'torso' | 'head' | 'horns' | 'legs' | 'feet' | 'arms' | 'hands' | 'tail' | 'armor' | 'wings' | 'trunk']?: Weighted<R[K]>;
    };
    palette: Weighted<CoatPaletteId>;
    pattern: Weighted<CoatPattern>;
    /** Independent probability of each mark. */
    marks: Partial<Record<CoatMarkName, number>>;
    coat: {
        scale: Span;
        contrast: Span;
        countershade: Span;
    };
    dimorphism: Span;
}
export declare const COMPOSER_ARCHETYPE_PRIORS: Readonly<Record<ComposerArchetype, Prior>>;
/** Eye flavour per archetype (eye catalogue v2): weighted explicit kinds, 'auto' = the anatomy rules. Archetypes not
 * listed always take 'auto'. The sprawler-lizard table applies to a jaws face only; its frog weight is 1 only with a
 * short snout (snoutLength < .6). */
export declare const COMPOSER_SPECIES_EYE_FLAVOUR: Readonly<Partial<Record<ComposerArchetype, Weighted<ComposerEyeType>>>>;
/** The coherent eye flavour of one attempt's draw: a pure hash of the attempt's stream name over the archetype's
 * weighted table. No rand() draw, so the 'composer-species-v1/' stream is untouched. */
export declare function composerSpeciesEyeFlavour(stream: string, archetype: ComposerArchetype, r: Pick<ComposerRecipe, 'head' | 'snoutLength'>): ComposerEyeType;
export interface ComposerBalance {
    /** Section-volume-weighted centre of mass (creature space, metres). */
    com: [number, number, number];
    /** Horizontal distance from the centre of mass to the rest-foot support polygon (0 inside). */
    distance: number;
    /** Allowed distance: 0.1 x bodyLength. */
    tolerance: number;
    pass: boolean;
    feet: number;
}
/** Static balance at rest: the centre of mass must lie over the rest-foot support polygon (convex hull of every
 * sole: rest contact, heel and toe of each foot bone, each widened by the sole half-width) expanded by 0.1 L.
 * Limbless bodies rest on their belly and always pass. */
export declare function composerStaticBalance(graph: ComposerGraph): ComposerBalance;
export interface CoherentComposerSpecies {
    recipe: ComposerRecipe;
    archetype: ComposerArchetype;
    /** 0 = first draw; 1..8 = resample suffix used. */
    attempt: number;
    balance: ComposerBalance;
}
/** Plausible random species with its archetype and balance report. If no draw within the resample
 * budget balances, the draw with the smallest balance violation is returned (balance.pass false). */
export declare function coherentComposerSpecies(seed: string, options?: {
    archetype?: ComposerArchetype;
}): CoherentComposerSpecies;
/** A coherent random species recipe (variability 1, allometry 1, individualSeed 0). */
export declare function randomCoherentComposerRecipe(seed: string): ComposerRecipe;
export {};
