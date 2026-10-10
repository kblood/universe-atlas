import { type QuadrupedPlan, type Vec3 } from './fauna-body-plan.ts';
import type { PlanetFaunaPathMember, PlanetFaunaActivity as FaunaMemberActivity } from './caller-contract.ts';
/**
 * Closed-form planetary locomotion for a `QuadrupedPlan`.
 *
 * Every footfall is derived from the member's existing exact-date orbit
 * (`faunaMemberActivityAtWorldNs`), never from previous frames: gait phase is
 * the distance already walked round the orbit divided by an integral number of
 * strides per revolution. A stance foot's ground point is the body frame *at
 * its touchdown phase* applied to the touchdown foothold, so it stays fixed in
 * the herd's tangent frame even on the curved path, through idle windows and
 * at any seek. Heights and normals come from the herd's immutable ground
 * stencil, the same one that already places the animal's root.
 *
 * Tangent frame: x = anchor right, z = anchor forward, h = up (metres), as used
 * by `faunaGroundedTransform`. Body frame: +X facing, +Y up, +Z = X x Y.
 */
export type FaunaGround = (x: number, z: number) => number;
export type FaunaPathMember = PlanetFaunaPathMember;
/** Footfall order LH, LF, RH, RF (lateral-sequence walk); legs are ordered RL, RR, FL, FR. */
export declare const WALK_PHASE_OFFSETS: readonly [0, 0.5, 0.75, 0.25];
/** Largest total head-lowering flexion of the neck, radians. */
export declare const NECK_FLEX_LIMIT = 1.35;
export interface FaunaGaitSchedule {
    /** Whole gait cycles per orbit, so phase is exactly periodic with position. */
    cyclesPerRevolution: number;
    /** Distance walked per gait cycle, metres. */
    cycleM: number;
    /** Gait cycles per second while walking. */
    frequencyHz: number;
    duty: number;
    liftM: number;
}
export interface QuadrupedFootState {
    id: string;
    stance: boolean;
    /** Ground contact under the toe, tangent frame [x, h, z]. */
    contact: [number, number, number];
    /** Solved toe sphere centre, body frame. */
    toe: Vec3;
}
export interface QuadrupedPose {
    /** Local bone translations/rotations in QUADRUPED_BONE_NAMES order. */
    positions: Float64Array;
    quaternions: Float64Array;
    /** Body-frame joint positions after forward kinematics. */
    joints: Float64Array;
    feet: QuadrupedFootState[];
    root: {
        x: number;
        z: number;
        h: number;
        yaw: number;
    };
    state: 'idle' | 'walk';
    phase: number;
    /** Largest sole/knee/ankle depth below the stencil surface, metres. */
    maxPenetration: number;
    /** Largest distance a foot target was clamped by to stay within leg reach. */
    maxReachError: number;
    /** Lowest clearance of the head's muzzle/cranium above ground, metres. */
    headClearance: number;
}
export declare function faunaGaitSchedule(plan: QuadrupedPlan, member: FaunaPathMember, revolutionS: number): FaunaGaitSchedule;
/** Authored motion envelopes, not a biological simulation. Identity affects
 * small idle motions without changing the canonical path or activity clock. */
export declare function faunaMotionTraits(plan: QuadrupedPlan, memberId: string): {
    breathPeriodS: number;
    breathPhase: number;
    breathM: number;
    tailPhase: number;
    tailAmplitude: number;
    headAmplitude: number;
};
export interface FaunaPoseOptions {
    behaviour?: 'auto' | 'feed' | 'alert';
}
/**
 * Pose at one exact date. Pure: identical inputs give identical output
 * regardless of which dates were evaluated before.
 */
export declare function quadrupedPoseAt(plan: QuadrupedPlan, member: FaunaPathMember, activity: FaunaMemberActivity, ground: FaunaGround, rigSeconds: number, options?: FaunaPoseOptions): QuadrupedPose;
