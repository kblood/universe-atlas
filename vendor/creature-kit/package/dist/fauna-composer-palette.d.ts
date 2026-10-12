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
    private readonly reuse;
    constructor(graph: ComposerGraph, reuseWorkingBuffers?: boolean);
    write(pose: ComposerPose, out: Float32Array, offset?: number, activeBones?: Uint16Array, fast?: boolean): void;
    /** Same TRS arithmetic as Matrix4.compose, followed by affine multiplication.
     * Rest transforms are rigid affine matrices. The homogeneous row is constant;
     * avoid its generic multiplication and the temporary composed Matrix4. */
    private writeAffine;
    get ownedBytes(): number;
}
