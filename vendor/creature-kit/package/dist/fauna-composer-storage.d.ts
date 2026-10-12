import type { FaunaComposerRenderSkin } from './fauna-composer-render-source.ts';
export declare const COMPOSER_PACKED_STORAGE_VERSION = "composer-arena-packed-1";
export declare const COMPOSER_GPU_STORAGE_VERSION = "composer-gpu-arena-1";
export type FaunaComposerArenaStorage = 'float-1' | 'packed-1';
export type ComposerStoredArray = Float32Array | Int16Array | Uint16Array | Uint8Array;
export interface ComposerQuantizationProof {
    version: 'composer-quantization-proof-1';
    vertices: number;
    checkedVertices: number;
    maxNormalError: number;
    maxColourError: number;
    maxWeightError: number;
    maxGlossError: number;
    maxWeightSumError: number;
    /** Position, noise sample coordinates, joints, local indices and sourceVertex
     * are exact. Only the explicitly listed normalized attributes are quantized. */
    exact: readonly ['positions', 'coatSample', 'skinIndex', 'index', 'sourceVertex'];
}
export type FaunaComposerPackedSkin = Omit<FaunaComposerRenderSkin, 'normals' | 'colors' | 'skinIndex' | 'skinWeight' | 'gloss' | 'coatLayers' | 'index' | 'sourceVertex'> & {
    storage: {
        version: typeof COMPOSER_PACKED_STORAGE_VERSION;
        proof: ComposerQuantizationProof;
        localIndexType: 'uint16' | 'uint32';
        sourceVertexType: 'uint16' | 'uint32' | null;
        readback?: 'webgl2-getBufferSubData';
        sourceOwnership?: typeof COMPOSER_GPU_STORAGE_VERSION;
    };
    normals: Int16Array;
    colors: Uint16Array;
    skinIndex: Uint8Array;
    skinWeight: Uint16Array;
    gloss: Uint8Array;
    coatLayers: null | {
        c0: Uint16Array;
        c1: Uint16Array;
        c2: Uint16Array;
        sample: Float32Array;
    };
    index: Uint16Array | Uint32Array;
    sourceVertex: Uint16Array | Uint32Array | null;
};
/** An explicit GPU allocation receipt, never a pretend array of raw floats.
 * Original LOD lookup metadata remains exact and source reconstruction is pure. */
export type FaunaComposerGpuSkin = Pick<FaunaComposerPackedSkin, 'version' | 'index' | 'sourceVertex' | 'coatCrisp'> & {
    vertexCount: number;
    hasCoatLayers: boolean;
    storage: {
        version: typeof COMPOSER_GPU_STORAGE_VERSION;
        format: typeof COMPOSER_PACKED_STORAGE_VERSION;
        proof: ComposerQuantizationProof;
        localIndexType: 'uint16' | 'uint32';
        sourceVertexType: 'uint16' | 'uint32' | null;
    };
};
export type FaunaComposerStoredSkin = FaunaComposerRenderSkin | FaunaComposerPackedSkin | FaunaComposerGpuSkin;
export declare function isGpuComposerSkin(skin: FaunaComposerStoredSkin): skin is FaunaComposerGpuSkin;
export declare function composerStoredVertices(skin: FaunaComposerStoredSkin): number;
export declare function isPackedComposerSkin(skin: FaunaComposerStoredSkin): skin is FaunaComposerPackedSkin;
/** Exact retained lookup metadata, not geometry quantization. The original
 * source/reducer arrays and the arena's global Uint32 GPU index stay untouched. */
export declare function compactComposerIndices(source: Uint16Array | Uint32Array): Uint16Array | Uint32Array;
export declare function composerQuantizationProof(vertices: number): ComposerQuantizationProof;
export declare function composerStorageCodec(name: string): {
    scale: number;
    signed: boolean;
    range: number;
} | null;
/** Decode matches normalized WebGL attributes; packed weights are subsequently
 * divided by their per-vertex sum in every skinning shader. */
export declare function decodedComposerAttribute(array: ComposerStoredArray, index: number, name: string, packed: boolean): number;
/** Independent full proof for tests/offline review. Runtime admission collects
 * the same error bounds while copying bounded vertex slices. */
export declare function validatePackedComposerSkin(source: FaunaComposerRenderSkin, packed: FaunaComposerPackedSkin): ComposerQuantizationProof;
export declare function assertComposerQuantizationProof(proof: ComposerQuantizationProof): void;
