import * as THREE from 'three';
import type { ComposerSkin } from './fauna-composer-mesh.ts';
/** Structural skin contract shared by Atlas's render tiers and Kit previews. */
export type FaunaComposerRenderSkin = Pick<ComposerSkin, 'positions' | 'normals' | 'colors' | 'skinIndex' | 'skinWeight' | 'index' | 'gloss' | 'coatCrisp' | 'coatLayers' | 'version'>;
export declare const FAUNA_COMPOSER_REQUIRED_ATTRIBUTES = 15;
/** Shared by colour, directional/spot depth, and point-light shadow programs. */
export declare function patchFaunaComposerInstancing(shader: {
    vertexShader: string;
}): void;
export declare function faunaComposerGeometry(skin: FaunaComposerRenderSkin): THREE.BufferGeometry;
/** One geometry/coat source per draw. Identical definitions share this batch;
 * different anatomy or coat parameters are never substituted to increase batching. */
export declare class FaunaComposerInstanceBatch {
    readonly mesh: THREE.InstancedMesh;
    readonly uploadedGeometryBytes: number;
    readonly instanceBytes: number;
    private readonly actors;
    private disposed;
    private shadowAllowed;
    private shadowActors;
    readonly skin: FaunaComposerRenderSkin;
    readonly capacity: number;
    constructor(skin: FaunaComposerRenderSkin, palette: {
        value: THREE.DataTexture;
    }, capacity: number, roughness?: number);
    beginFrame(): void;
    submit(matrix: THREE.Matrix4, paletteRow: number, shadowStrength?: number): void;
    endFrame(): void;
    dispose(): void;
}
