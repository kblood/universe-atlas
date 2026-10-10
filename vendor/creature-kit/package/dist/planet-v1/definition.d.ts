import { type CreatureGenome } from './creature-model.ts';
export declare const PLANET_ANIMAL_DEFINITION_VERSION = "planet-animal-definition-1";
/** One source definition for planetary inspection/rendering. Experimental
 * ComposerRecipe remains a different, explicitly labelled input format. */
export interface PlanetAnimalDefinition {
    schema: typeof PLANET_ANIMAL_DEFINITION_VERSION;
    kind: 'planet-genome';
    individualId: string;
    speciesId?: string;
    genome: CreatureGenome;
}
export declare function planetAnimalDefinition(input: unknown): PlanetAnimalDefinition;
