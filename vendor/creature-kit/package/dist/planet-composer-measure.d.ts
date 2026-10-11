import type { ComposerGraph, ComposerPose } from './fauna-composer-rig.ts';
import type { ComposerSkin } from './fauna-composer-mesh.ts';
/** Actual generated/skinned vertex bounds, kept distinct from nominal genome
 * dimensions. This audit helper never modifies source buffers or animation. */
export declare function measurePlanetComposerSource(source: {
    graph: ComposerGraph;
    skin: ComposerSkin;
}, pose?: ComposerPose): {
    units: "m";
    frame: "Composer model space; +X forward, +Y up";
    motion: string;
    time: number;
    bounds: {
        min: [number, number, number];
        max: [number, number, number];
    };
    requested: {
        bodyLength: number;
        torsoWidth: number;
        torsoHeight: number;
        legReach: number;
        upperLegFraction: number;
        stanceWidth: number;
        neckLength: number;
        neckElevation: number;
        headLength: number;
        headWidth: number;
        tailLength: number;
        footLength: number;
        footWidth: number;
        hornLength: number;
        earLength: number;
        trunkLength: number;
        wingSpan: number;
    } | null;
    resolved: {
        bodyLength: number;
        torsoWidth: number;
        torsoHeight: number;
        neckLength: number;
        headLength: number;
        headWidth: number;
        legs: {
            limb: number;
            reach: number;
            footLength: number;
            footHeight: number;
            rest: number[];
        }[];
        stride: number;
        cycleLength: number;
        speed: number;
        period: number;
    };
    fit: import("./fauna-composer-rig.ts").ComposerPhenotypeFit | null;
    constraints: {
        part: string;
        chosen: string;
        effect: string;
    }[];
};
