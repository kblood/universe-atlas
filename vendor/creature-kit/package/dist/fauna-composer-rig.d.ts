import * as THREE from 'three';
import { type ComposerConstraint, type ComposerRecipe } from './fauna-composer-recipe.ts';
import { type ComposerIndividualTraits } from './fauna-composer-individual.ts';
/** Variable articulated body-plan graph for the modular composer. It is
 * deliberately separate from the fixed 22-bone quadruped rig: limbless,
 * biped, quadruped, sprawled and many-legged plans each get their own bones.
 * Every bone has an explicit parent, rest length and bind frame (local +X
 * along the bone, +Y dorsal). Creature space: metres, +X forward, +Y up,
 * +Z to the animal's right, ground at y = 0. */
export declare const COMPOSER_GRAPH_VERSION = "fauna-composer-graph-4";
/** Desktop preview budget. Not a Quest qualification. */
export declare const COMPOSER_BUDGET: Readonly<{
    maxBones: 160;
    maxVertices: 48000;
    maxTriangles: 80000;
    drawCallsPerCreature: 2;
}>;
export declare const COMPOSER_MOTIONS: readonly ["neutral", "idle", "walk", "display"];
export type ComposerMotion = typeof COMPOSER_MOTIONS[number];
export type ComposerPart = 'torso' | 'tail' | 'neck' | 'head' | 'trunk' | 'leg' | 'foot' | 'arm' | 'hand' | 'finger' | 'wing';
export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];
/** Elliptical cross-section (half width along local Z, half height along local Y, centre offset along Y). */
export interface ComposerSection {
    w: number;
    h: number;
    yc: number;
}
export interface ComposerBone {
    index: number;
    name: string;
    parent: number;
    part: ComposerPart;
    side: -1 | 0 | 1;
    limb: number;
    length: number;
    driver: 'fk' | 'ik';
    /** Origin in the parent frame (creature space for the root). */
    offset: Vec3;
    /** Rotation relative to the parent at bind. */
    restLocal: Quat;
    restPosition: Vec3;
    restQuaternion: Quat;
    /** Cross-sections at the bone start and end, used for skin and ground clearance. */
    start: ComposerSection;
    end: ComposerSection;
}
export type ComposerLimbKind = 'leg' | 'arm' | 'wing';
export interface ComposerLimb {
    index: number;
    kind: ComposerLimbKind;
    side: -1 | 1;
    pair: number;
    front: boolean;
    /** Body bone carrying the socket, and the socket in that bone's frame. */
    socketBone: number;
    socket: Vec3;
    /** Bone indices root to tip. Legs: upper, lower, [meta], foot. Arms: upper, fore, hand, finger. Wings: humerus, forearm, hand. */
    bones: number[];
    segments: number[];
    /** Knee/elbow pole in the body heading frame. */
    pole: Vec3;
    /** Metapodial tilt for three-segment legs (radians, top behind the foot). */
    metaTilt: number;
    footHeight: number;
    footLength: number;
    /** Legs: foot geometry contract in the foot bone frame (metres behind and ahead of the ankle). The skin keeps every
     * foot vertex inside x in [-back, front] and y >= -footHeight, and swing pitch is limited by the current lift so the
     * rotated sole cannot pass below the floor. Zero for arms and wings. */
    footExtent: [number, number];
    /** Rest ground contact in creature space (legs) or rest hand target (arms). */
    rest: Vec3;
    phase: number;
}
export interface ComposerLocomotion {
    gait: 'biped-walk' | 'quadruped-walk' | 'sprawling-walk' | 'metachronal-wave' | 'serpentine-crawl' | 'peristaltic-crawl';
    period: number;
    duty: number;
    stride: number;
    speed: number;
    lift: number;
    /** Vertical body bob amplitude (m) while walking. */
    bob: number;
    /** Lateral spine undulation amplitude per torso joint (radians) while walking. */
    sway: number;
}
export interface ComposerGraph {
    version: typeof COMPOSER_GRAPH_VERSION;
    recipe: ComposerRecipe;
    constraints: ComposerConstraint[];
    bones: ComposerBone[];
    limbs: ComposerLimb[];
    chains: {
        torso: number[];
        tail: number[];
        neck: number[];
        head: number;
        trunk: number[];
    };
    dims: {
        bodyLength: number;
        torsoWidth: number;
        torsoHeight: number;
        legReach: number;
        frontLegReach: number;
        socketHeight: number;
        headLength: number;
        craniumWidth: number;
        craniumHeight: number;
        snoutLength: number;
        neckLength: number;
        tailLength: number;
        trunkLength: number;
        wingSemiSpan: number;
        armLength: number;
        legRadius: number;
        armRadius: number;
        torsoPitch: number;
    };
    locomotion: ComposerLocomotion;
    /** The individual this graph was built for (composerIndividualTraits of the effective recipe). poseComposer reads its
     * motion desync (phase, period, duty, lift, breathing and look phases); the build reads limb robustness, leg segment
     * jitter, torso profile terms and carriage. Neutral traits build the version-1 rest skeleton bit for bit. */
    traits: ComposerIndividualTraits;
}
/** A leg's ground support. `contact` is the sole point under the foot in the centred display frame;
 * `world` adds the walk's travel along +X. `extension` is socket-to-hock distance / (upper + lower). */
export interface ComposerContact {
    limb: number;
    side: -1 | 1;
    pair: number;
    stance: boolean;
    contact: Vec3;
    world: Vec3;
    reachError: number;
    extension: number;
}
export interface ComposerPose {
    motion: ComposerMotion;
    time: number;
    positions: Float64Array;
    quaternions: Float64Array;
    /** Radial (Y/Z) bone scale for breathing and peristalsis; bone lengths are never scaled. */
    radialScale: Float64Array;
    /** Extra local-Z scale on top of `radialScale`; folded wings furl their membrane chord toward the leading-edge spar. */
    chordScale: Float64Array;
    travel: number;
    contacts: ComposerContact[];
    diagnostics: {
        maxBoneLengthError: number;
        maxReachError: number;
        maxStancePenetration: number;
        minSwingClearance: number;
        minBodyClearance: number;
        jointCount: number;
    };
}
/** Stance legs never exceed this fraction of upper+lower length, so planted feet are always reachable. */
export declare const COMPOSER_MAX_STANCE_EXTENSION = 0.985;
/** Frame with +X along `dir` and +Y as close as possible to `upRef`. */
export declare function composerFrame(dir: THREE.Vector3, upRef: THREE.Vector3): THREE.Quaternion;
/** Two-bone IK: joint position for segments a,b from root to target bending toward pole. */
export declare function composerTwoBone(root: THREE.Vector3, target: THREE.Vector3, a: number, b: number, pole: THREE.Vector3): {
    joint: THREE.Vector3;
    end: THREE.Vector3;
    reachError: number;
};
/** Builds the bind-pose graph. Pure and deterministic. */
export declare function buildComposerGraph(input: ComposerRecipe): ComposerGraph;
/** Bone-local bounding ellipsoids [x past the tip bone's end, z, rx, ry, rz] of the tail-tip ornament. The skin builds
 * the ornament inside them and the rest and posed tail keep them above the ground. */
export declare function composerTailTipBounds(recipe: ComposerRecipe, L: number, tip: {
    length: number;
    end: {
        h: number;
    };
}): [number, number, number, number, number][];
export declare const composerFeatherFanSpan: (recipe: ComposerRecipe, L: number) => number;
/** Proximal muscle mass: the upper segment's start radius relative to the limb's base radius. The skin's root collar
 * scales down by the same factor so the root still blends into the body. */
export declare function composerLimbMass(recipe: ComposerRecipe, kind: 'leg' | 'arm'): number;
/** The trunk's rounded tip reaches this many end radii below (and past) the last trunk bone's end. */
export declare const COMPOSER_TRUNK_TIP_CLEARANCE = 1.2;
/** Membrane chord (perpendicular to the spar, toward the bone's local +Z x side) at span fraction `u`. */
export declare function composerWingChord(feathered: boolean, total: number, u: number): number;
/** Membrane thickness for a wing of `total` spar length. */
export declare const composerWingThickness: (feathered: boolean, total: number) => number;
/** Rest hand target of an axial body's arms, in arm reaches from the shoulder: [forward, up, outward] (graph-4). */
export declare const AXIAL_ARM_REST: readonly number[];
/** Display arm raise from the rest target, in arm reaches: [forward, up, outward] (graph-3: [0.35, 0.55, 0]). */
export declare const DISPLAY_ARM_RAISE: readonly number[];
/** Deterministic pose for a motion at `time` seconds (bounded 0..120). */
export declare function poseComposer(graph: ComposerGraph, motion: ComposerMotion, time: number): ComposerPose;
/** Parent-child joint list (bone origin pairs) for skeleton display and tests. */
export declare function composerSkeletonSegments(graph: ComposerGraph): [number, number][];
/** Plain summary of a graph's structure, useful in reports and UI. */
export declare function composerStructure(graph: ComposerGraph): {
    layout: "sprawled" | "limbless" | "many-legged" | "biped" | "quadruped";
    gait: "biped-walk" | "quadruped-walk" | "sprawling-walk" | "metachronal-wave" | "serpentine-crawl" | "peristaltic-crawl";
    bones: number;
    legs: number;
    arms: number;
    wings: number;
    torsoSegments: number;
    neckBones: number;
    tailBones: number;
    trunkBones: number;
    bodyLength: number;
    height: number;
};
