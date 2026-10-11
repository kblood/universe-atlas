/**
 * Deterministic LOD chain for the composer skin (fauna-composer-lod-1; creature export v2).
 *
 * buildComposerLodChain(source, targets) reduces one composer skin to a chain of triangle targets in a single pass of
 * quadric-error HALF-EDGE collapses (Garland-Heckbert quadrics, the surviving vertex keeps its own position). Every
 * output vertex is therefore an original skin vertex, unchanged: its position, runtime normal, colour, gloss and skin
 * weights are copied bit for bit. A removed vertex is re-bound to the surviving vertex it collapsed into (its
 * "representative", reported per source vertex). The skin has no UVs; if one ever does, the same copy applies.
 *
 * Rules that keep it deterministic and safe:
 * - Positions are welded by exact float value before collapsing, so a seam (two skin vertices at one position with
 *   different attributes) can never open a crack: the seam moves as one position.
 * - Cost = quadric error at the surviving position + an attribute term (colour, gloss and skin-weight L1 distance,
 *   scaled by the collapsed area and the body size), so eyes, colour borders and joints between bone regions are
 *   collapsed last; a vertex never moves onto one weighted to very different bones while a cheaper choice exists.
 * - Validity: the link condition (the mesh stays manifold), no triangle may turn by more than ~72 degrees or become
 *   degenerate, open borders only collapse along themselves, non-manifold input edges are locked, and a tetrahedron
 *   is never flattened.
 * - Sagittal symmetry: the composer mirror plane is z = 0. A vertex on the plane only collapses onto the plane; an
 *   off-plane vertex with an exact mirror partner collapses together with its partner onto the mirrored target, or
 *   not at all. Pairs that cannot be mirrored after the first half are counted (`asymmetricCollapses`).
 * - Order: a binary heap ordered by (cost, vertex id); a vertex's best target is the cheapest valid neighbour, ties
 *   to the lowest id. No Math.random, no clock, no transcendental function (only +, -, *, / and sqrt, which IEEE
 *   rounds exactly), so the chain is the same in every engine that runs this code.
 *
 * Pure: no three, no Node API, no Atlas module.
 */
export declare const COMPOSER_LOD_VERSION = "fauna-composer-lod-1";
/** Additive opt-in constraints; absent options preserve the original reducer. */
export declare const COMPOSER_LOD_CONSTRAINTS_VERSION = "fauna-composer-lod-constraints-4";
export declare const COMPOSER_FOOT_LOD_VERSION = "fauna-composer-foot-lod-1";
export declare const COMPOSER_ANATOMY_LOD_VERSION = "fauna-composer-anatomy-lod-3";
/** Default attribute weights (dimensionless; multiplied by the body diagonal) and the largest allowed face turn. */
export declare const COMPOSER_LOD_DEFAULTS: Readonly<{
    colour: 0.02;
    gloss: 0.05;
    skin: 0.08;
    boundary: 10;
    minFaceCosine: 0.3;
}>;
export interface ComposerLodPart {
    part: string;
    label: string;
    firstTriangle: number;
    triangles: number;
}
/** The arrays the reducer reads (the composer skin's layout: 3 floats per position/normal/colour, 4 joints/weights). */
export interface ComposerLodSource {
    positions: Float32Array;
    colors: Float32Array;
    skinIndex: Uint16Array;
    skinWeight: Float32Array;
    index: Uint32Array | Uint16Array;
    normals?: Float32Array;
    gloss?: Float32Array;
    parts?: readonly ComposerLodPart[];
}
/** Structural subset of ComposerGraph; keeps this reducer module independent
 * of the rig/three module at both its runtime and declaration boundaries. */
export interface ComposerLodAnatomyGraph {
    bones: readonly {
        restPosition: readonly [number, number, number];
        restQuaternion: readonly [number, number, number, number];
        length: number;
        start: {
            h: number;
            w: number;
            yc?: number;
        };
        end: {
            h: number;
            w: number;
            yc?: number;
        };
    }[];
    chains: {
        head: number;
        trunk: readonly number[];
        torso?: readonly number[];
        neck?: readonly number[];
        tail?: readonly number[];
    };
    limbs?: readonly {
        kind: string;
        pair: number;
        side: number;
        bones: readonly number[];
    }[];
}
export interface ComposerLodOptions {
    /** Keep the z = 0 mirror symmetry (default true). */
    symmetry?: boolean;
    /** Hard position anchors, source-vertex indexed0/1. Welded positions inherit
     * any protected member. Anchors may receive collapses but never move. */
    protectedVertices?: Uint8Array;
    /** Source-vertex importance>=1; welded positions take the maximum. */
    vertexImportance?: Float32Array;
    /** Optional source-vertex local diameter in metres for the skin-weight
     * error term. Without it the historical whole-mesh diagonal is used.
     * This changes collapse priority only, never source weights or positions. */
    deformationScale?: Float32Array;
    colour?: number;
    gloss?: number;
    skin?: number;
    boundary?: number;
    minFaceCosine?: number;
}
/** Skin-6's joined ankles no longer have separate closed foot components to
 * resist collapse. Preserve sole/ankle extrema and the supporting leg's joint
 * regions, and spend more of the remaining error budget on these contours.
 * Explicit opt-in: historical skin-5 reductions remain byte-identical. */
export declare function composerFootLodConstraints(source: ComposerLodSource): Pick<ComposerLodOptions, 'protectedVertices' | 'vertexImportance'>;
/** Skin-6's shared runtime/export constraints. A fixed number of original
 * surface samples keeps a curved proboscis tubular, including its head join,
 * rolled tip and nostrils. Facial extrema retain the head/eye/mouth silhouette.
 * This does not retain every trunk vertex or synthesize replacement geometry:
 * an unattainable triangle target remains explicitly unreached. Foot-1 anchors
 * are a strict subset. Historical skin-5 callers continue to omit this option. */
export declare function composerAnatomyLodConstraints(source: ComposerLodSource, graph: ComposerLodAnatomyGraph): Pick<ComposerLodOptions, 'protectedVertices' | 'vertexImportance' | 'deformationScale'>;
export interface ComposerLodLevel {
    /** Requested triangle target; null for the unreduced source. */
    target: number | null;
    triangles: number;
    vertices: number;
    /** triangles <= target. */
    reached: boolean;
    positions: Float32Array;
    colors: Float32Array;
    skinIndex: Uint16Array;
    skinWeight: Float32Array;
    index: Uint32Array;
    normals?: Float32Array;
    gloss?: Float32Array;
    parts: ComposerLodPart[];
    /** Output vertex -> source vertex. */
    sourceVertex: Uint32Array;
    /** Source vertex -> output vertex that stands for it (itself when it survived). */
    representative: Uint32Array;
    stats: ComposerLodStats;
}
export interface ComposerLodStats {
    collapses: number;
    mirroredPairs: number;
    asymmetricCollapses: number;
    /** 0 strict; 1 face turns up to 90 degrees allowed; 2 also unpaired collapses across the mirror (see the stage note). */
    relaxation: number;
    /** Largest RMS plane distance (m) of an accepted collapse: sqrt(quadric error / collapsed area). */
    maxPlaneError: number;
    /** Largest skin-weight L1 distance (0..2) between a source vertex and its representative. */
    maxWeightChange: number;
    /** Largest distance (m) between a source vertex and its representative at rest. */
    maxRestDisplacement: number;
    /** Surviving off-plane vertices whose exact mirror partner also survives, over those that have a partner. */
    mirrorKept: number;
}
export interface ComposerLodChain {
    version: typeof COMPOSER_LOD_VERSION;
    sourceTriangles: number;
    sourceVertices: number;
    /** Positions after the exact-value weld, vertices locked on non-manifold edges, open-border vertices. */
    welded: number;
    locked: number;
    boundary: number;
    mirrorPartners: number;
    levels: ComposerLodLevel[];
}
/** Checks a target list: positive integers, strictly decreasing. */
export declare function assertComposerLodTargets(targets: readonly number[]): void;
/** Reduces `source` to each target in turn (one collapse sequence, so the levels are nested). A level whose target is
 * at least the source's triangle count is the source itself. */
export declare function buildComposerLodChain(source: ComposerLodSource, targets: readonly number[], options?: ComposerLodOptions): ComposerLodChain;
/** Surface deviation of a level from its source: for every `stride`-th source vertex, the distance (m) to the nearest
 * triangle of the level. `posed` (optional, source-vertex indexed xyz, e.g. the runtime's skinned positions at one
 * pose) measures the same thing after skinning: a level's vertices are source vertices with their own weights, so the
 * posed level is the posed source restricted to `sourceVertex`. Growth from rest to posed is the skinning cost of the
 * reduction. Brute force with a box early-out; meant for tests and evidence, not for the runtime. */
export declare function composerLodDeviation(sourcePositions: Float32Array, level: Pick<ComposerLodLevel, 'index' | 'sourceVertex'>, options?: {
    posed?: ArrayLike<number>;
    stride?: number;
}): {
    max: number;
    mean: number;
    p95: number;
    samples: number;
};
