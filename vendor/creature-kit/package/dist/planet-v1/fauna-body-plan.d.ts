import type { CreatureGenome } from './creature-model.ts';
import { type FaunaFaceFeature } from './fauna-face.ts';
import type { CoatRegion } from '../fauna-coat-vocab.ts';
import { type CoatSample, type CoatGenome } from '../fauna-coat-fields.ts';
import { type QuadrupedBodyOptions } from './fauna-sculpted-plan.ts';
export { QUADRUPED_SCULPTED_BODY_VERSION, type QuadrupedBodyOptions, type QuadrupedBodyPresentation } from './fauna-sculpted-plan.ts';
/**
 * One continuous, skinned quadruped body plan derived from an existing
 * creature genome. The anatomy is a smooth union of genome-sized volumes
 * (hindquarters, chest, neck, head, tail and three-segment legs), polygonised
 * once in the bind pose with surface nets, so legs, neck and tail grow out of
 * the torso as one connected surface instead of touching primitives. Every
 * vertex is weighted to the 22-bone skeleton that the locomotion solver poses.
 *
 * Body space is metres: +X forward, +Y up, +Z = X x Y (the frame
 * `faunaGroundedTransform` gives each animal). Every bone has an identity bind
 * rotation, so a bone's inverse bind matrix is just its negated rest position.
 *
 * Building is exposed as a generator so a caller can time-slice it across
 * frames; `buildQuadrupedBody` runs it to completion. The output depends only
 * on the genome.
 */
export type Vec3 = [number, number, number];
export declare const QUADRUPED_BODY_VERSION = "quadruped-body-4";
export declare const QUADRUPED_BONE_NAMES: readonly ["root", "pelvis", "spine", "chest", "neck1", "neck2", "head", "tail1", "tail2", "tail3", "rear-left-upper", "rear-left-lower", "rear-left-foot", "rear-right-upper", "rear-right-lower", "rear-right-foot", "front-left-upper", "front-left-lower", "front-left-foot", "front-right-upper", "front-right-lower", "front-right-foot"];
export declare const QUADRUPED_BONE_PARENTS: readonly number[];
export declare const BONE: {
    readonly root: 0;
    readonly pelvis: 1;
    readonly spine: 2;
    readonly chest: 3;
    readonly neck1: 4;
    readonly neck2: 5;
    readonly head: 6;
    readonly tail1: 7;
    readonly tail2: 8;
    readonly tail3: 9;
};
/** Upper-limb bone index of each leg, in `QuadrupedPlan.legs` order. */
export declare const LEG_UPPER_BONES: readonly [10, 13, 16, 19];
/** Grid-point ceiling for one body: bounds build memory/time on any genome. */
export declare const QUADRUPED_GRID_POINT_BUDGET = 200000;
export interface QuadrupedLegPlan {
    id: string;
    rear: boolean;
    side: -1 | 1;
    parentBone: number;
    upperBone: number;
    lowerBone: number;
    footBone: number;
    /** Bind-pose joints in body space. `toe` is the hoof/pad sphere centre. */
    hip: Vec3;
    knee: Vec3;
    ankle: Vec3;
    toe: Vec3;
    upperLength: number;
    lowerLength: number;
    footLength: number;
    /** Rest pitch of the foot segment above the ground plane, radians. */
    footAngle: number;
    hipRadius: number;
    kneeRadius: number;
    ankleRadius: number;
    toeRadius: number;
    /** +1: the knee flexes toward +X (fore carpus); -1: toward -X (hind hock). */
    pole: 1 | -1;
}
export interface QuadrupedPrimitive {
    shape: 'cone' | 'ellipsoid';
    bone: number;
    region: Region;
    /** Cone: segment ends and end radii. Ellipsoid: `a` centre, `b` radii. */
    a: Vec3;
    b: Vec3;
    ra: number;
    rb: number;
    /** Smooth-union radius joining this volume to everything before it. */
    blend: number;
}
export interface QuadrupedAppendage {
    kind: 'ear' | 'horn';
    bone: number;
    base: Vec3;
    tip: Vec3;
    radius: number;
}
type Region = 'torso' | 'neck' | 'head' | 'tail' | 'upper' | 'lower' | 'foot' | 'armor';
export interface QuadrupedPlan {
    version: string;
    genome: CreatureGenome;
    bones: {
        name: string;
        parent: number;
        rest: Vec3;
    }[];
    legs: QuadrupedLegPlan[];
    torsoY: number;
    neckBase: Vec3;
    neckTip: Vec3;
    headCentre: Vec3;
    muzzleTip: Vec3;
    eyes: Vec3[];
    tailBase: Vec3;
    tailTip: Vec3;
    primitives: QuadrupedPrimitive[];
    appendages: QuadrupedAppendage[];
    /** Gait anatomy: stance duty factor, swing lift and preferred stride (m per cycle). */
    gait: {
        duty: number;
        liftM: number;
        strideM: number;
    };
    /** Head reach used for grazing: lowest safe head-centre height above ground. */
    grazeClearanceM: number;
}
export interface QuadrupedBodyData {
    plan: QuadrupedPlan;
    positions: Float32Array;
    normals: Float32Array;
    /** Linear-light RGB, normalized Uint8. */
    colors: Uint8Array;
    skinIndex: Uint8Array;
    /** Normalized Uint8 weights; each vertex sums to exactly 255. */
    skinWeight: Uint8Array;
    index: Uint16Array | Uint32Array;
    /** Vertices/triangles of the single connected skin; appendages follow. */
    bodyVertexCount: number;
    bodyTriangleCount: number;
    vertexCount: number;
    triangleCount: number;
    cellM: number;
    grid: [number, number, number];
    faceFeatures: FaunaFaceFeature[];
    structuralVertexCount: number;
    structuralTriangleCount: number;
    /** Sculpted presentation only: explicit bounded removal of sub-cell tail dust. */
    surfaceCleanup?: {
        removedTailIslands: number;
        removedVertices: number;
        removedTriangles: number;
    };
}
/** Two-bone analytic IK. `pole` is the direction the middle joint bends toward.
 * `reachError` is the distance the target was clamped by to stay reachable. */
export declare function solveTwoBone(root: Vec3, target: Vec3, upper: number, lower: number, pole: Vec3): {
    knee: Vec3;
    end: Vec3;
    reachError: number;
};
/** Ankle position for a toe resting on a plane with normal `up`, the foot
 * segment pitched `angle` above the plane along the plane-projected `forward`. */
export declare function ankleFromToe(toe: Vec3, forward: Vec3, up: Vec3, length: number, angle: number): Vec3;
export declare function createQuadrupedPlan(genome: CreatureGenome, options?: QuadrupedBodyOptions): QuadrupedPlan;
export declare function primitiveDistance(p: QuadrupedPrimitive, x: number, y: number, z: number): number;
/** The complete body field, evaluated exactly as the grid accumulates it. */
export declare function quadrupedBodyDistance(plan: QuadrupedPlan, x: number, y: number, z: number): number;
export declare const QUADRUPED_BODY_COLOUR_SAMPLER_VERSION = "quadruped-body-colour-sampler-1";
export interface QuadrupedBodyColourSampler {
    readonly version: typeof QUADRUPED_BODY_COLOUR_SAMPLER_VERSION;
    /** Borrowed immutable source; no regenerated specimen or copied genome. */
    readonly source: Readonly<QuadrupedBodyData>;
    /** Original connected-body colour field in linear RGB before quantization.
     * Supplemental ears/horns/structural/face colours are outside this API. */
    sampleInto(x: number, y: number, z: number, normalY: number, out: Float64Array): Float64Array;
}
/** Exact same colour/context as the connected-body builder. Uses source.cellM
 * as the canonical sampling footprint; callers do not silently change pattern
 * filtering. Scratch context is per sampler, and sampling must be sequential. */
export declare function createQuadrupedBodyColourSampler(source: Readonly<QuadrupedBodyData>): QuadrupedBodyColourSampler;
export declare const QUADRUPED_BODY_PATTERN_SAMPLER_VERSION = "quadruped-body-pattern-sampler-1";
export interface QuadrupedBodyPatternSample {
    coat: Readonly<CoatGenome> | undefined;
    region: CoatRegion;
    affineError: number;
    mask: number;
    patch: number;
    rawLayers?: boolean;
}
/** Exact planetary context + forced-mask layers for a shared library mask.
 * The returned error compares layer reconstruction against the original colour
 * oracle and intermediate mask probes; nonlinear juvenile overlays are explicit.
 * Source seed, scale clamp, signed flank coords and anatomical rules are kept. */
export declare function createQuadrupedBodyPatternSampler(source: Readonly<QuadrupedBodyData>, options?: {
    rawLayers?: boolean;
}): {
    version: string;
    source: Readonly<QuadrupedBodyData>;
    oracle: QuadrupedBodyColourSampler;
    sampleInto(x: number, y: number, z: number, normalY: number, layers: Float64Array, context: CoatSample): QuadrupedBodyPatternSample;
};
/** Resumable build. Each `yield` is a bounded unit of work (one volume, a few
 * grid slices, or a vertex batch), so callers can respect a frame budget. */
export declare function quadrupedBodyBuildSteps(genome: CreatureGenome, options?: QuadrupedBodyOptions): Generator<void, QuadrupedBodyData, void>;
export declare function buildQuadrupedBody(genome: CreatureGenome, options?: QuadrupedBodyOptions): QuadrupedBodyData;
/** Resident bytes for one CPU copy of a body's attributes and index. */
export declare function quadrupedBodyBytes(data: QuadrupedBodyData): number;
