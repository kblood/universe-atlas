import { type CoatGenome } from './fauna-coat-fields.ts';
import type { ComposerRecipe } from './fauna-composer-recipe.ts';
import { type FaunaJuvenileCoatStage } from './fauna-coat-juvenile.ts';
/** An already resolved individual. This is additive to recipe v4, not a new
 * individual random stream. Dimensions are never quantized to recipe controls. */
export declare const COMPOSER_BUILD_PHENOTYPE_VERSION = "fauna-composer-phenotype-1";
export interface ComposerBuildPhenotype {
    version: typeof COMPOSER_BUILD_PHENOTYPE_VERSION;
    units: 'm';
    identity: {
        individualId?: string;
        speciesId?: string;
        appearanceKey?: string;
        maturity: number;
        sex: 'none' | 'female' | 'male';
    };
    dimensions: {
        bodyLength: number;
        torsoWidth: number;
        torsoHeight: number;
        legReach: number;
        upperLegFraction: number;
        stanceWidth: number;
        neckLength: number;
        neckElevation: number;
        headLength: number;
        headWidth: number;
        tailLength: number;
        footLength: number;
        footWidth: number;
        hornLength: number;
        earLength: number;
        trunkLength: number;
        wingSpan: number;
    };
    coat: CoatGenome;
    /** Optional sampled stage layers. Absent definitions retain library-only spots/socks. */
    coatStage?: FaunaJuvenileCoatStage;
    /** Pattern-frame offsets in torso-length units; colours remain linear RGB. */
    coatFrame: {
        phase: number;
        lateral: number;
    };
    roughness: number;
    /** walkSpeed: metres/second; strideLength: metres travelled in ONE FULL GAIT
     * CYCLE, not the Composer locomotion.stride stance sweep (duty × cycle). */
    motion: {
        walkSpeed: number;
        strideLength: number;
    };
}
/** Fail closed on malformed resolved data; never repair or silently clamp it. */
export declare function cloneComposerBuildPhenotype(input: ComposerBuildPhenotype): ComposerBuildPhenotype;
/** Resolved dimensions already include sex, age and individual variation. */
export declare function assertComposerResolvedRecipe(recipe: ComposerRecipe): void;
