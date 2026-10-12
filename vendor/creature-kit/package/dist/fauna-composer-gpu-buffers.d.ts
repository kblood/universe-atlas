import * as THREE from 'three';
import { type ComposerStoredArray } from './fauna-composer-storage.ts';
export declare const COMPOSER_ARENA_ATTRIBUTES: readonly [readonly ["position", 3], readonly ["normal", 3], readonly ["color", 3], readonly ["skinWeight", 4], readonly ["composerGloss", 1], readonly ["coatL0", 3], readonly ["coatL1", 3], readonly ["coatL2", 3], readonly ["coatSample", 4], readonly ["composerActor", 1], readonly ["skinIndex", 4]];
export declare const COMPOSER_COMPACTION_SCRATCH_BYTES = 2048;
type ArrayType = typeof Float32Array | typeof Int16Array | typeof Uint16Array | typeof Uint8Array;
export declare function composerArenaArrayType(name: string, packed: boolean): ArrayType;
type Attribute = {
    buffer: WebGLBuffer;
    attribute: THREE.GLBufferAttribute;
    ArrayType: ArrayType;
    width: number;
    scratch: ComposerStoredArray;
    bytes: number;
};
/** WebGL2 owns the full arena. Only bounded upload scratch stays on the CPU.
 * COPY_* bindings deliberately avoid Three's vertex-array binding state. */
export declare class FaunaComposerGpuBuffers {
    readonly attributes: Map<string, Attribute>;
    readonly indexScratch: Uint32Array<ArrayBuffer>;
    readonly cpuBytes: number;
    readonly gpuBytes: number;
    private indexBuffer;
    private moveBuffer;
    private indexAttribute;
    private disposed;
    readonly gl: WebGL2RenderingContext;
    private readonly indices;
    private readonly packed;
    constructor(gl: WebGL2RenderingContext, geometry: THREE.BufferGeometry, vertices: number, indices: number, packed: boolean);
    private allocate;
    scratch(name: string): ComposerStoredArray;
    upload(name: string, vertex: number, count: number): void;
    uploadIndices(index: number, count: number): void;
    clearIndices(index: number, count: number): void;
    copyVertices(source: FaunaComposerGpuBuffers, from: number, to: number, count: number): void;
    /** Overlapping VBO copies are illegal in WebGL2. Two bounded copies through
     * independent scratch implement memmove, including palette-row ownership. */
    moveVertices(from: number, to: number, count: number): void;
    /** Explicit inspection only. No draw/admission/pose path performs readback. */
    read(name: string, vertex: number, count: number): ComposerStoredArray;
    readIndices(index: number, count: number): Uint32Array;
    restore(): void;
    dispose(): void;
}
export {};
