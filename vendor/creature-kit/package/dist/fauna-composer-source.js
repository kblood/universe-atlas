import { normalizeComposerRecipe } from "./fauna-composer-recipe.js";
import { deriveComposerIndividual } from "./fauna-composer-individual.js";
import { buildComposerGraph, COMPOSER_BUDGET } from "./fauna-composer-rig.js";
import { buildComposerSkin } from "./fauna-composer-mesh.js";
import { assertComposerResolvedRecipe } from "./fauna-composer-phenotype.js";
/** Shared deterministic source path for the Lab actor, planet worker and export.
 * No renderer, material, scene object or GPU resource is created here. */
export function buildComposerSource(input, options = {}) {
    const recipe = normalizeComposerRecipe(input).recipe;
    if (options.phenotype)
        assertComposerResolvedRecipe(recipe);
    const individual = deriveComposerIndividual(recipe);
    const graph = buildComposerGraph(individual.recipe, { phenotype: options.phenotype });
    const skin = buildComposerSkin(graph, options);
    if (skin.vertexCount > COMPOSER_BUDGET.maxVertices || skin.triangleCount > COMPOSER_BUDGET.maxTriangles)
        throw new Error(`Composer skin exceeds the desktop preview budget (${skin.vertexCount} vertices, ${skin.triangleCount} triangles).`);
    return { recipe, individual, graph, skin };
}
