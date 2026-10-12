import { type ComposerGraph, type ComposerPose, type ComposerPoseOptions, type Vec3 } from './fauna-composer-rig.ts';
import type { PlanetFaunaActivity, PlanetFaunaPathMember } from './planet-v1/caller-contract.ts';
export declare const PLANET_COMPOSER_POSE_VERSION = "planet-composer-pose-5";
export type PlanetComposerGround = (x: number, z: number) => number;
export interface PlanetComposerPose extends ComposerPose {
    planet: {
        version: typeof PLANET_COMPOSER_POSE_VERSION;
        memberId: string;
        cyclesPerRevolution: number;
        cycle: number;
        strideM: number;
        speedMps: number;
        root: Vec3;
        yaw: number;
    };
}
/** Composer movement on a caller-owned dated orbit and ground stencil.
 * Membership, population and dates stay with the world. All bones and IK come
 * from Composer, including its variable leg chains and shaped skin6 feet.
 * No previous frame is read and no quadruped body/pose factory is called. */
export declare function posePlanetComposer(graph: ComposerGraph, member: PlanetFaunaPathMember, activity: PlanetFaunaActivity, ground: PlanetComposerGround, rigSeconds: number, options?: Pick<ComposerPoseOptions, 'trunkMotion' | 'reuseWorkingBuffers'>): PlanetComposerPose;
