import * as THREE from 'three';
import { type ComposerGraph, type ComposerPose } from './fauna-composer-rig.ts';
import { type FaunaComposerArenaStorage } from './fauna-composer-storage.ts';
import { type FaunaComposerSource, type FaunaComposerSourceProvider, type FaunaComposerRenderSkin } from './fauna-composer-render-source.ts';
export interface FaunaComposerCandidate<D> {
    id: string;
    definition: D;
    sourceKey: string;
    /** Optional shared immutable identity text from the actual source provider.
     * Validated before reuse; its bytes remain included in resident accounting. */
    canonicalDefinition?: string;
    /** Metre-space body to radius-normalized origin-relative world. +X is forward. */
    matrix: THREE.Matrix4;
    distanceM: number;
    cameraVisible: boolean;
    shadowVisible?: boolean;
    rigSeconds: number;
    /** Include date, ground revision, activity and every pose option, or omit to evaluate each frame. */
    poseKey?: string;
}
export interface FaunaComposerRendererOptions<D, C extends FaunaComposerCandidate<D>> {
    provider: FaunaComposerSourceProvider<D>;
    /** Shared Kit Composer solver, including its terrain/flight options. Never a quadruped retarget. */
    pose: (graph: ComposerGraph, candidate: C) => ComposerPose;
    /** Attach the planet's lighting/aerial/shadow hooks to this owned mesh once. */
    onMeshAdopted?: (mesh: THREE.Mesh) => void;
    /** Optional WebGL2-owned packed arenas. Full CPU attribute mirrors are absent;
     * only explicit snapshotOf inspection performs readback. */
    mergedGpuContext?: WebGL2RenderingContext;
    /** Explicitly sized arenas: unique reduced animals share one draw per tier.
     * Arena CPU+GPU allocations count against maxBytes before accepting sources. */
    mergedTiers?: Partial<Record<'middle' | 'far', {
        maxVertices: number;
        maxIndices: number;
        maxBytes: number;
        storage?: FaunaComposerArenaStorage;
        activeIndexPasses?: boolean;
    }>>;
    capacity?: number;
    maxSources?: number;
    maxBones?: number;
    maxBytes?: number;
    maxResultBytes?: number;
    workerReserveBytes?: number;
    maxDistanceM?: number;
    nearM?: number;
    middleM?: number;
    fullSourceCache?: number;
    adoptionBudgetMs?: number;
    now?: () => number;
    onReady?: () => void;
    /** Bounded unique middle sources, prioritized by the caller's stable order.
     * Other members retain their source-derived far tier, with no unfulfillable upgrade. */
    middleSourceCache?: number;
    /** Interleave one retained-original near upgrade after this many cold jobs.
     * Omitted preserves strict coarse-first scheduling for component consumers. */
    coldJobsBeforeNearUpgrade?: number;
    /** Dirty RGBA row uploads; false retains the full-upload reference path. */
    partialPaletteUploads?: boolean;
}
/** Normal-runtime Composer draw owner. All tiers come from one immutable source;
 * a pending or failed upgrade continues to draw a resident tier. Cold animals
 * remain explicitly pending until their actual source arrives. No proxy body,
 * secondary generator, fixed rig or altitude-dependent representation exists.
 *
 * Call with camera-first, distance/id-stable candidates. One asynchronous build
 * and one bounded result adoption may be active. Object and buffer lifetimes
 * follow source eviction/context reset; CPU and GPU copies are counted separately. */
export declare class FaunaComposerRenderer<D, C extends FaunaComposerCandidate<D> = FaunaComposerCandidate<D>> {
    readonly group: THREE.Group<THREE.Object3DEventMap>;
    readonly capacity: number;
    readonly maxBones: number;
    readonly workerReserveBytes: number;
    private readonly options;
    private readonly entries;
    private readonly actors;
    private readonly failed;
    private readonly desired;
    private readonly members;
    private readonly frameSourceKeys;
    private readonly priorSourceKeys;
    private actorRows;
    private readonly identities;
    private readonly ready;
    private readonly blocked;
    private readonly fullSourceKeys;
    private readonly middleSourceKeys;
    private readonly merged;
    /** Far remains resident while a nearer tier draws. Each arena independently
     * hides all rows at beginFrame; only the selected tier is submitted. */
    private readonly mergedBindings;
    private readonly levelOwners;
    private readonly arenaBuffers;
    private paletteData;
    private scratch;
    private readonly paletteUniform;
    private readonly paletteUploads;
    private paletteBones;
    private readonly drawn;
    private running;
    private revision;
    private frame;
    private epoch;
    private context;
    private disposed;
    private coldJobs;
    private readonly maxSources;
    private readonly maxBytes;
    private readonly maxResultBytes;
    private readonly now;
    private stats;
    private lastError;
    private contextLost;
    private readonly onContextLost;
    private readonly onContextRestored;
    constructor(options: FaunaComposerRendererOptions<D, C>);
    private makePalette;
    setViewCameras(cameras: readonly THREE.Camera[]): void;
    private resizePalette;
    /** Fail before rendering on unsupported devices; 15 slots include full crisp coat and matrix instancing. */
    assertCapabilities(renderer: THREE.WebGLRenderer): void;
    setContext(context: string, forceReset?: boolean): void;
    update(candidates: readonly C[], origin?: THREE.Vector3): ReadonlySet<string>;
    private tier;
    private candidateTier;
    private entryBytes;
    private recount;
    get ownedBytes(): number;
    private get stagedBytes();
    get reservedBytes(): number;
    /** Allocation-free counters for a live benchmark; diagnostics() remains a snapshot. */
    get pendingPresentationWork(): number;
    get uploadedPaletteBytes(): number;
    get paletteUploadCalls(): number;
    private room;
    private batch;
    private identity;
    /** Runs in the completion task, outside update(). The production provider has
     * verified strict worker checks against digests of the actual received arrays.
     * Custom providers retain the full local validation path. */
    private prepare;
    private retain;
    private adoptPending;
    private startNext;
    private trimFullSources;
    private trimFarOnly;
    private fail;
    private evict;
    private releaseMerged;
    sourceOf(id: string): FaunaComposerSource | null;
    /** Explicit QA/inspection only; callers must copy before mutating borrowed arrays. */
    snapshotOf(id: string): {
        id: string;
        key: string;
        tier: "near" | "middle" | "far";
        graph: ComposerGraph;
        skin: FaunaComposerRenderSkin | import("./fauna-composer-storage.ts").FaunaComposerPackedSkin | null;
        source: FaunaComposerSource | null;
        pose: ComposerPose | null;
        palette: Float32Array<ArrayBufferLike>;
    } | null;
    poseOf(id: string): ComposerPose | null;
    diagnostics(): {
        contextLost: boolean;
        capacity: number;
        sources: number;
        middleSourceLimit: number;
        middleSourcesEligible: number;
        farTierBudgetFallbacks: number;
        actors: {
            id: string;
            key: string;
            tier: "near" | "middle" | "far" | undefined;
            bones: number;
            skin: "fauna-composer-skin-5" | "fauna-composer-skin-6";
        }[];
        ownedBytes: number;
        maxBytes: number;
        reservedBytes: number;
        workerReserveBytes: number;
        paletteUploadTrackingBytes: number;
        actualPaletteUploadedBytes: number;
        paletteUploadCount: number;
        pendingPaletteUploadBytes: number;
        paletteBones: number;
        paletteCpuBytes: number;
        paletteGpuBytes: number;
        graphJsonEquivalentBytes: number;
        sourceCpuBytes: number;
        geometryGpuBytes: number;
        instanceCpuGpuBytes: number;
        pendingResultBytes: number;
        stagedSources: number;
        blockedSources: number;
        receivingReserveBytes: number;
        poseCpuBytes: number;
        mergedTiers: {
            [k: string]: {
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
        };
        running: string | null;
        lastError: string | null;
        workerDiagnosticBytes: number;
        workerDiagnostics: {} | null;
        builds: number;
        failures: number;
        evictions: number;
        stale: number;
        budgetDrops: number;
        pending: number;
        poseFailures: number;
        buildMs: number;
        adoptionMs: number;
        adoptionOverruns: number;
        preparationMs: number;
        geometryCopyMs: number;
        copySliceMaxMs: number;
        verificationOnMain: number;
        completedOutOfView: number;
        stagedEvictions: number;
        blockedAdmissions: number;
        upgradesPending: number;
        active: number;
        draws: number;
        triangles: number;
        poseBuilds: number;
        uploadBytes: number;
        version: string;
    };
    dispose(): void;
}
