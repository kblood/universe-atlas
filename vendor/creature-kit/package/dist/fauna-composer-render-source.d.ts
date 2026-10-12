import type { ComposerGraph } from './fauna-composer-rig.ts';
import type { ComposerSkin } from './fauna-composer-mesh.ts';
import { type ComposerLodLevel } from './fauna-composer-lod.ts';
import { type FaunaComposerBuildReceipt } from './fauna-composer-build-receipt.ts';
export declare const FAUNA_COMPOSER_RENDER_VERSION = "fauna-composer-render-1";
export declare const FAUNA_COMPOSER_TIERS: readonly ["near", "middle", "far"];
export type FaunaComposerTier = typeof FAUNA_COMPOSER_TIERS[number];
export type FaunaComposerRenderSkin = Pick<ComposerSkin, 'positions' | 'normals' | 'colors' | 'skinIndex' | 'skinWeight' | 'index' | 'gloss' | 'coatCrisp' | 'coatLayers'> & {
    /** Immutable original skin revision, shared by every tier. */
    version: ComposerSkin['version'];
    /** Exact original vertex for every reduced vertex; null for the original mesh. */
    sourceVertex: Uint32Array | null;
};
export interface FaunaComposerSource {
    graph: ComposerGraph;
    skin: ComposerSkin;
    sourceVersion?: string;
}
export interface FaunaComposerBuildJob<D> {
    key: string;
    definition: D;
    tiers: readonly FaunaComposerTier[];
    /** Operational metadata only; does not change source construction or identity. */
    diagnosticRetry?: {
        failedFrame: number;
        currentFrame: number;
    };
    /** Borrowed: a worker provider must COPY these arrays, never detach resident buffers. */
    loadedSource?: FaunaComposerSource;
}
export interface FaunaComposerBuildResult {
    key: string;
    source: FaunaComposerSource;
    levels: Partial<Record<FaunaComposerTier, FaunaComposerRenderSkin>>;
    buildMs: number;
    receipt?: FaunaComposerBuildReceipt;
}
export interface FaunaComposerSourceProvider<D> {
    /** Must return asynchronously (normally a single worker). One request is active at a time. */
    build(job: FaunaComposerBuildJob<D>, signal: AbortSignal): Promise<FaunaComposerBuildResult>;
    /** Fixed conservative reserve for bounded provider diagnostic records. */
    readonly diagnosticBytes?: number;
    diagnostics?(): unknown;
    dispose?(): void;
}
/** Full definition includes phenotype, IDs and provenance, not merely recipe text. */
export declare function faunaComposerSourceKey(definition: unknown, sourceVersion: string, presentation?: string): string;
export declare function composerRenderSkin(skin: ComposerSkin): FaunaComposerRenderSkin;
export declare function composerRenderLod(skin: ComposerSkin, level: ComposerLodLevel): FaunaComposerRenderSkin;
/** Run off the render thread. Reduction may stop above target to preserve anatomy. */
export declare function buildFaunaComposerLevels(source: FaunaComposerSource, targets?: readonly [number, number]): Record<FaunaComposerTier, FaunaComposerRenderSkin>;
/** A first coarse job need not allocate/copy an unused middle snapshot. The
 * reducer still starts from the same original skin and anatomic constraints. */
export declare function buildFaunaComposerRequestedLevels(source: FaunaComposerSource, tiers: readonly FaunaComposerTier[], targets?: readonly [number, number]): Partial<Record<FaunaComposerTier, FaunaComposerRenderSkin>>;
/** Unique backing buffers, including source attributes that geometry does not upload. */
export declare function composerTypedBytes(value: unknown, externallyOwned?: ReadonlySet<ArrayBufferLike>): number;
export declare function validateComposerRenderSkin(skin: FaunaComposerRenderSkin, bones: number): void;
/** Proof of identity through reduction: every rendered attribute is an exact
 * surviving original vertex. Positions, joints and appearance cannot come from another animal. */
export declare function validateComposerRenderLod(source: ComposerSkin, level: FaunaComposerRenderSkin): void;
