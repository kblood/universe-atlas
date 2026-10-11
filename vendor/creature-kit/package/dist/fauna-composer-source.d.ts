import { type ComposerRecipe } from './fauna-composer-recipe.ts';
import { type ComposerSkinOptions } from './fauna-composer-mesh.ts';
import { type ComposerBuildPhenotype } from './fauna-composer-phenotype.ts';
export interface ComposerSourceOptions extends ComposerSkinOptions {
    phenotype?: ComposerBuildPhenotype;
}
/** Shared deterministic source path for the Lab actor, planet worker and export.
 * No renderer, material, scene object or GPU resource is created here. */
export declare function buildComposerSource(input: ComposerRecipe, options?: ComposerSourceOptions): {
    recipe: ComposerRecipe;
    individual: import("./fauna-composer-individual.ts").ComposerIndividual;
    graph: import("./fauna-composer-rig.ts").ComposerGraph;
    skin: import("./fauna-composer-mesh.ts").ComposerSkin;
};
export type ComposerSource = ReturnType<typeof buildComposerSource>;
