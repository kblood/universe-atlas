import type { ComposerPose } from './fauna-composer-rig.ts';
export declare const COMPOSER_ANIMATION_VERSION = "composer-temporal-presentation-1";
/** Delayed interpolation between actually evaluated canonical poses. No future
 * ground/path prediction, reseeding or alternate rig. Output is a borrowed view. */
export declare class ComposerTemporalPose {
    readonly output: ComposerPose;
    private a;
    private b;
    private aTime;
    private bTime;
    private context;
    private interval;
    private readonly qa;
    private readonly qb;
    samples: number;
    resets: number;
    alpha: number;
    constructor(pose: ComposerPose, clock: number, context: string, interval: number);
    private copy;
    /** Caller evaluates the current authoritative pose only when this is true. */
    needsSample(clock: number, context: string, interval: number): boolean;
    accept(pose: ComposerPose, clock: number, context: string, interval: number): void;
    interpolate(clock: number): ComposerPose;
    metadata(): {
        version: string;
        clock: number;
        sourceClockA: number;
        sourceClockB: number;
        interval: number;
        alpha: number;
        samples: number;
        resets: number;
        contactsAndDiagnostics: string;
    };
    get ownedBytes(): number;
}
/** Stable list of original joints actually weighted by surviving vertices.
 * Compact codecs may round tiny weights to zero; including those is conservative. */
export declare function composerActiveBones(skin: {
    skinIndex: ArrayLike<number>;
    skinWeight: ArrayLike<number>;
}, bones: number): Uint16Array;
