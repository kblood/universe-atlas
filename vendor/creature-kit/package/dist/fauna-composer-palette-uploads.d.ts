import type { DataTexture } from 'three';
/** Tracks pending RGBA component ranges until Three actually uploads the texture.
 * One pooled range per palette row: repeated updates without a render cannot
 * grow the queue or lose changes from an earlier simulation frame. */
export declare class ComposerPaletteUploads {
    private texture;
    private priorUpdate;
    private readonly ranges;
    private pending;
    private rowStride;
    private fullPending;
    private partial;
    private queued;
    private changedSinceFlush;
    uploadedBytes: number;
    uploadCount: number;
    readonly capacity: number;
    constructor(capacity: number, partial?: boolean);
    private readonly onUploaded;
    attach(texture: DataTexture): void;
    setPartial(value: boolean): void;
    mark(start: number, count: number): void;
    /** Queued byte count, not an assertion that the GPU has already consumed it. */
    flush(): number;
    get pendingBytes(): number;
    /** Typed flags plus a conservative 64-byte allowance per pooled range. */
    get ownedBytes(): number;
    detach(): void;
    dispose(): void;
}
