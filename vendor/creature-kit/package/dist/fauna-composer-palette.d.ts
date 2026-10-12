import type { ComposerGraph, ComposerPose } from './fauna-composer-rig.ts';
/** Composer poses are absolute model-space frames, NOT parent-local frames.
 * Inverse bind includes the original quaternion. The same writer serves every
 * layout and tier; radial/chord scaling is part of the canonical pose. */
export declare class FaunaComposerPaletteWriter {
    readonly boneCount: number;
    private readonly inverses;
    private readonly matrix;
    private readonly position;
    private readonly quaternion;
    private readonly scale;
    constructor(graph: ComposerGraph);
    write(pose: ComposerPose, out: Float32Array, offset?: number): void;
    get ownedBytes(): number;
}
