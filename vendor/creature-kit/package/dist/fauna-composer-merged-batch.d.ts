import * as THREE from 'three';
import type { FaunaComposerRenderSkin } from './fauna-composer-render-source.ts';
import { type FaunaComposerStoredSkin, type FaunaComposerPackedSkin, type FaunaComposerArenaStorage } from './fauna-composer-storage.ts';
/** One dynamic branch per animal, with the original pattern arithmetic. Flat
 * varyings keep the pattern/seed constant over every triangle. This removes the
 * per-source draw requirement without quantizing coat layers or seeds. */
export declare function composerMergedCoatGlsl(): string;
export declare function patchComposerMergedShader(shader: {
    vertexShader: string;
    fragmentShader: string;
}, lit: boolean, storage?: FaunaComposerArenaStorage): void;
export interface FaunaComposerMergedOptions {
    storage?: FaunaComposerArenaStorage;
    gpuContext?: WebGL2RenderingContext;
    maxVertices: number;
    maxIndices: number;
    maxActors: number;
    maxBytes: number;
    bones: {
        value: THREE.DataTexture;
    };
    /** Pack actual variable-length topology into camera/active-union prefixes.
     * Anatomy-preserving target misses use their actual aggregate index cost. */
    activeIndexPasses?: boolean;
}
/** Bounded unique-geometry arena: one draw for any mix of Composer anatomy and
 * coats. CPU source arrays are copied once on admission, never regenerated.
 * Released index blocks become degenerate until reused; reserved triangles are
 * reported separately from active triangles. No per-frame geometry rebuilding. */
export declare class FaunaComposerMergedBatch {
    readonly mesh: THREE.Mesh;
    readonly ownedBytes: number;
    private readonly cpuBytes;
    private readonly gpuBytes;
    private readonly gpu?;
    private readonly geometry;
    private readonly records;
    private readonly copying;
    readonly backingBuffers: Set<ArrayBufferLike>;
    private readonly freeVertices;
    private readonly freeIndices;
    private readonly roots;
    private readonly rootTexture;
    private readonly options;
    private highIndex;
    private disposed;
    private active;
    private triangles;
    private compactionMoves;
    private compactionMaxMoveMs;
    private compactionMaxOverrunMs;
    private readonly indexOrder?;
    private viewCameras;
    private cameraActors;
    private unionActors;
    private cameraIndices;
    private unionIndices;
    private indexTransactions;
    private indexRecordsMoved;
    private indexRewriteIndices;
    private indexRewriteMs;
    private indexRewriteMaxMs;
    private readonly indexMetadataBytes;
    private restorePassCallbacks?;
    constructor(options: FaunaComposerMergedOptions);
    /** Only the actual registered view cameras use the camera prefix. Auxiliary
     * cameras (including reflection) and shadow cameras retain the active union. */
    setViewCameras(cameras: readonly THREE.Camera[]): void;
    private setIndexDrawRange;
    private installIndexPasses;
    register(id: string, skin: FaunaComposerStoredSkin, row: number, roughness?: number): boolean;
    canAdmit(skin: FaunaComposerStoredSkin): boolean;
    /** A pending record owns the whole span, but only its uploaded prefix is
     * nonzero. Reconstruct that exact state without reading GPU memory. */
    private writeStoredIndices;
    /** One synchronous frame-end transaction, bounded by the existing aggregate
     * index capacity. Overlapping spans cannot yield while partially rewritten.
     * Admission still uses its original per-record deadline checks. Timing below
     * includes failed attempts/rollback; rewritten-index counts are committed work. */
    private partitionIndices;
    private writeIndices;
    private clearIndices;
    private refreshViews;
    private rebuildFree;
    /** Compact only when summed free space fits but a contiguous span does not.
     * Each record move is atomic; deadlines are checked between complete moves.
     * No plan survives a frame, release or context generation. */
    private compact;
    /** Copies at most 128 vertices or 768 indices between deadline checks. A
     * partial admission is invisible and retains its previous tier until complete. */
    registerSlice(id: string, skin: FaunaComposerStoredSkin, row: number, roughness: number, deadline: number, now?: () => number): 'ready' | 'pending' | 'full';
    /** The arena owns these exact attribute views. Only the compact local index
     * and source-vertex map remain outside its already-accounted backing buffers.
     * Keep the skin object, not extracted array references: compaction refreshes
     * every live receipt's fields. Borrowed receipts expire when released. */
    residentSkin(id: string, source: FaunaComposerStoredSkin): FaunaComposerStoredSkin;
    /** Actual GPU bytes, only for an explicit inspection. The returned CPU copy is
     * owned by that caller and never retained in the resident cache. */
    static snapshotSkin(source: FaunaComposerStoredSkin): FaunaComposerRenderSkin | FaunaComposerPackedSkin;
    /** Called after context loss cleared all source owners. No stale allocation
     * receipt survives; canonical jobs repopulate the empty new buffers. */
    loseContext(): void;
    restoreContext(): void;
    reset(): void;
    private shadowAllowed;
    private shadowActors;
    beginFrame(): void;
    submit(id: string, matrix: THREE.Matrix4, cameraVisible?: boolean, shadowStrength?: number): boolean;
    endFrame(): void;
    release(id: string): void;
    diagnostics(): {
        activeIndexPasses?: boolean | undefined;
        indexMetadataBytes?: number | undefined;
        indexTransactions?: number | undefined;
        indexRecordsMoved?: number | undefined;
        indexRewriteIndices?: number | undefined;
        indexRewriteMs?: number | undefined;
        indexRewriteMaxMs?: number | undefined;
        cameraActors?: number | undefined;
        unionActors?: number | undefined;
        cameraSubmittedTriangles?: number | undefined;
        unionSubmittedTriangles?: number | undefined;
        storage: FaunaComposerArenaStorage;
        ownership: string;
        vertexStride: number;
        actors: number;
        records: number;
        copying: number;
        draws: number;
        activeTriangles: number;
        reservedTriangles: number;
        ownedBytes: number;
        cpuBytes: number;
        gpuBytes: number;
        compactionMoves: number;
        compactionMaxMoveMs: number;
        compactionMaxOverrunMs: number;
    };
    dispose(): void;
}
