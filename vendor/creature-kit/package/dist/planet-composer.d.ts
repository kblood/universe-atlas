import { type CreatureGenome } from './planet-v1/creature-model.ts';
import { type ComposerRecipe } from './fauna-composer-recipe.ts';
import { type ComposerBuildPhenotype } from './fauna-composer-phenotype.ts';
import { type ComposerSourceOptions } from './fauna-composer-source.ts';
import type { ComposerPoseOptions } from './fauna-composer-rig.ts';
export { COMPOSER_BUILD_PHENOTYPE_VERSION, type ComposerBuildPhenotype } from './fauna-composer-phenotype.ts';
export { measurePlanetComposerSource } from './planet-composer-measure.ts';
export { PLANET_COMPOSER_IDENTITY_VERSION, planetComposerSourceIdentity, assertPlanetComposerSourceIdentity, type PlanetComposerSourceIdentity, type PlanetComposerSourceIdentityOptions } from './planet-composer-identity.ts';
export declare const PLANET_COMPOSER_DEFINITION_VERSION = "planet-composer-definition-1";
export declare const PLANET_COMPOSER_SOURCE_VERSION = "planet-composer-source-2";
export interface PlanetComposerIdentity {
    individualId?: string;
    speciesId?: string;
}
export interface PlanetComposerDefinition {
    schema: typeof PLANET_COMPOSER_DEFINITION_VERSION;
    kind: 'planet-composer';
    /** Provenance snapshot: this is never rewritten when the Composer recipe is edited. */
    genome: CreatureGenome;
    recipe: ComposerRecipe;
    phenotype: ComposerBuildPhenotype;
    ledger: {
        units: 'metres; radians for neckElevation; linear RGB for coat';
        sourceGenomeVersion: string;
        sourceAppearanceVersion: string | null;
        sourceMorphologyVersion: string | null;
        family: string;
        growth: 'already-resolved-no-additional-growth';
        coat: 'resolved-coat-exact' | 'legacy-colours-mapped';
        mappings: string[];
        recipeControlAdjustments: string[];
    };
}
export type PlanetComposerBuildOptions = Pick<ComposerSourceOptions, 'presentation' | 'debug'>;
/** Pure, deterministic migration of the already resolved planet phenotype.
 * No preset, seed draw, species generator or second maturity derivation occurs. */
export declare function planetComposerDefinition(input: CreatureGenome, identity?: PlanetComposerIdentity): PlanetComposerDefinition;
/** Validate imported/edited definitions without losing source provenance or
 * rounding their phenotype to the authoring recipe's slider increments. */
export declare function parsePlanetComposerDefinition(input: unknown): PlanetComposerDefinition;
export declare function serializePlanetComposerDefinition(input: PlanetComposerDefinition): string;
/** Normal world members must bring their actual identity and resolved appearance.
 * Debug inputs can use planetComposerDefinition, but are never relabelled as a
 * real member by this wrapper. No source payload fields are rewritten. */
export declare function planetComposerWorldDefinition(input: CreatureGenome, identity: Required<PlanetComposerIdentity>): PlanetComposerDefinition;
/** Worker-safe shared source: no actor/material is allocated. */
export declare function buildPlanetComposerSource(input: CreatureGenome | PlanetComposerDefinition, options?: PlanetComposerBuildOptions): {
    definition: PlanetComposerDefinition;
    sourceVersion: string;
    recipe: ComposerRecipe;
    individual: import("./fauna-composer-individual.ts").ComposerIndividual;
    graph: import("./fauna-composer-rig.ts").ComposerGraph;
    skin: import("./fauna-composer-mesh.ts").ComposerSkin;
};
export type PlanetComposerSource = ReturnType<typeof buildPlanetComposerSource>;
export declare function createPlanetComposerAnimal(input: CreatureGenome | PlanetComposerDefinition, options?: PlanetComposerBuildOptions & ComposerPoseOptions): import("./fauna-composer.ts").ComposerCreature & {
    definition: PlanetComposerDefinition;
    sourceVersion: string;
};
