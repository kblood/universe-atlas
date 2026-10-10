import * as THREE from 'three';
import { composerConstraints, type ComposerConstraint, type ComposerRecipe } from './fauna-composer-recipe.ts';
import { composerStructure, COMPOSER_BUDGET, type ComposerGraph, type ComposerMotion, type ComposerPose, type ComposerPoseOptions } from './fauna-composer-rig.ts';
import { type ComposerCoatCrisp, type ComposerSkin, type ComposerSkinPresentation } from './fauna-composer-mesh.ts';
export { COAT_PATTERN_CRISP_GLSL as COMPOSER_COAT_CRISP_GLSL } from './fauna-coat-crisp-glsl.ts';
import { type ComposerIndividualTraits } from './fauna-composer-individual.ts';
/** Experimental modular creature: one skinned mesh (one draw call) driven by
 * the composer's own variable skeleton, plus an optional skeleton overlay.
 * Procedural geometry only; nothing here is a finished authored asset. */
export interface ComposerCreatureDetails {
    version: 'fauna-composer-creature-1';
    structure: ReturnType<typeof composerStructure>;
    constraints: ComposerConstraint[];
    vertices: number;
    triangles: number;
    bones: number;
    drawCalls: number;
    parts: {
        part: string;
        label: string;
        triangles: number;
        bones: number;
    }[];
    budget: typeof COMPOSER_BUDGET;
    withinBudget: boolean;
    buildMs: number;
    individual: ComposerCreatureIndividual;
}
/** The individual this creature is: its traits, the changes applied to the species recipe, and the recipe actually built. */
export interface ComposerCreatureIndividual {
    traits: ComposerIndividualTraits;
    deltas: string[];
    effectiveRecipe: ComposerRecipe;
}
export interface ComposerCreature {
    group: THREE.Group;
    mesh: THREE.SkinnedMesh;
    graph: ComposerGraph;
    skin: ComposerSkin;
    readonly individual: ComposerCreatureIndividual;
    readonly lastPose: ComposerPose | undefined;
    update(motion: ComposerMotion, time: number): ComposerPose;
    setSkeletonVisible(value: boolean): void;
    setNeutral(value: boolean): void;
    /** World-space bounds of the currently posed skin. */
    bounds(): THREE.Box3;
    /** Rest-pose bounds (creature space, metres) of the face: skin parts head, eyes, mouth, horn and trunk.
     * Computed once at build; a fresh copy per call. Empty when the skin has none of those parts. */
    headBounds(): THREE.Box3;
    details(): ComposerCreatureDetails;
    dispose(): void;
}
/** Per-vertex gloss (the skin's `gloss`, attribute `composerGloss`): roughness falls toward this value with it, which
 * gives the cornea a real specular highlight. Gloss 0 leaves the material's roughness untouched. */
export declare const COMPOSER_GLOSS_ROUGHNESS = 0.06;
export declare const COMPOSER_GLOSS_CACHE_KEY = "composer-gloss-1";
/** The shader edits behind the gloss channel: [chunk anchor, replacement]. Each anchor must occur exactly once. */
export declare const COMPOSER_GLOSS_PATCH: Readonly<{
    vertex: readonly (readonly [string, string])[];
    fragment: readonly (readonly [string, string])[];
}>;
/** Applies COMPOSER_GLOSS_PATCH to a MeshStandardMaterial program; throws when an anchor is not present exactly once
 * (a three.js upgrade that renames a chunk must fail loudly, not silently drop the highlight). */
export declare function patchComposerGlossShader(shader: {
    vertexShader: string;
    fragmentShader: string;
}): void;
/** The creature's coloured material: vertex colours, roughness 0.82, and the gloss channel. */
export declare function createComposerColouredMaterial(): THREE.MeshStandardMaterial;
/** The crisp-coat shader edits, applied after COMPOSER_GLOSS_PATCH: [chunk anchor, replacement], each anchor exactly once. */
export declare const COMPOSER_COAT_CRISP_PATCH: Readonly<{
    vertex: readonly (readonly [string, string])[];
    fragment: readonly (readonly [string, string])[];
}>;
/** Applies COMPOSER_COAT_CRISP_PATCH for one crisp pattern; throws when an anchor is not present exactly once. */
export declare function patchComposerCoatCrispShader(shader: {
    vertexShader: string;
    fragmentShader: string;
    defines?: Record<string, unknown>;
}, crisp: Pick<ComposerCoatCrisp, 'code'>): void;
/** The coloured material with the crisp coat (skin-5): the gloss channel plus the per-fragment coat pattern of `crisp`
 * between the geometry's coatL0..coatL2 layers. One program per crisp pattern; the pattern parameters are uniforms. */
export declare function createComposerCrispCoatMaterial(crisp: ComposerCoatCrisp): THREE.MeshStandardMaterial;
export declare function createComposerCreature(input: ComposerRecipe, options?: {
    presentation?: ComposerSkinPresentation;
} & ComposerPoseOptions): ComposerCreature;
export { composerConstraints };
/** Rest-pose bounds of every vertex referenced by a triangle of the face parts. */
export declare function composerHeadBounds(skin: ComposerSkin): THREE.Box3;
