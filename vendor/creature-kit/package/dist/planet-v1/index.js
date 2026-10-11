/** Versioned canonical planetary animal entry. Existing algorithms and model
 * versions are preserved; extraction is not a ComposerRecipe substitution. */
export const PLANET_ANIMAL_CORE_VERSION = 'planet-animal-core-1';
export * from "./creature-model.js";
export * from "./fauna-appearance.js";
export * from "./fauna-body-plan.js";
export * from "./fauna-face.js";
export * from "./fauna-structural-appendages.js";
export * from "./fauna-locomotion.js";
export * from "./inspector.js";
export * from "./definition.js";
/** Current Composer migration entry; the historical planetary APIs above remain explicit compatibility exports. */
export * from "../planet-composer.js";
export * from "../planet-composer-pose.js";
export { COAT_PATTERN_CRISP_GLSL, COAT_PATTERN_CRISP_GLSL_VERSION } from "../fauna-coat-crisp-glsl.js";
