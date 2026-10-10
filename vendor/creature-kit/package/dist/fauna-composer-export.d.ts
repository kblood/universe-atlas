import { type ComposerRecipe } from './fauna-composer-recipe.ts';
import { type ComposerGraph, type ComposerMotion, type ComposerPose } from './fauna-composer-rig.ts';
/** Historical: written by plain exports up to export v2 (kept exported for compatibility; no longer written). */
export declare const COMPOSER_EXPORT_VERSION = "fauna-composer-export-1";
/** Historical: written by profiled exports (an LOD chain or a crossfaded loop) in export v2 (kept for compatibility). */
export declare const COMPOSER_EXPORT_V2_VERSION = "fauna-composer-export-2";
/** Written by every export since v3 (docs/creature-export-v3.md): creature-kit generator string, plain or profiled.
 * A plain export's BIN chunk is byte-identical to export-1's, a profiled in-budget export's to export-2's. */
export declare const COMPOSER_EXPORT_V3_VERSION = "fauna-composer-export-3";
/** The generator named in asset.generator (`<generator> <export version>`). */
export declare const COMPOSER_EXPORT_GENERATOR = "creature-kit";
export type ComposerExportTarget = 'desktop-web' | 'quest-3';
/** A hard export budget. Triangles apply to level 0 (what the scene draws up close); every level must also meet its
 * own target. Textures: the composer creature has none (vertex colour), so its texture bytes are 0. */
export interface ComposerExportBudget {
    maxTriangles: number;
    maxBones: number;
    maxMaterials: number;
    maxTextureBytes: number;
    maxDrawCallsPerLevel: number;
}
/** Target profiles. desktop-web: no LOD by default and no hard gate beyond the composer's own budget.
 * quest-3: the Quest 3 standalone tier (docs/creature-export-v2.md, "Budget"): <= 150k triangles and <= 150 draw calls
 * per frame for a whole scene, so one creature gets 8000 / 3000 / 1000 triangles at its three levels, one draw call
 * per level and at most one 1024x1024 RGBA8 texture's worth of texture memory.
 * Bones: 80 is a CPU budget we set (D4, 2026-10-07), not a Quest 3 hardware limit. three r181 skins through a float
 * bone texture (no uniform-array path, so MAX_VERTEX_UNIFORM_VECTORS does not apply) and JOINTS_0 is unsigned 16-bit.
 * The cost is CPU: mixer (2 tracks per bone) + world matrices + skeleton update measured 0.17 us per bone per frame on
 * the desktop, flat over 40/80/160 bones; ~1 us on Quest 3 is an ESTIMATE (assumed ~5x slower CPU, not measured).
 * The 8000-triangle level 0 implies ~18 creatures per 150k-triangle scene; at 80 bones they cost ~1.4 ms of an 11.1 ms
 * frame (160 bones: ~2.9 ms). Raise it only after a headset measurement of <= 0.5 us per bone, or answer a sweep that
 * often fails with a bone-reducing LOD skeleton, not a higher cap. */
export declare const COMPOSER_EXPORT_TARGETS: Readonly<Record<ComposerExportTarget, {
    lods: readonly number[] | null;
    budget: Readonly<ComposerExportBudget> | null;
}>>;
/** Default crossfade length (s) of a seamless idle/display loop; capped at half the clip window. */
export declare const COMPOSER_EXPORT_SEAMLESS_BLEND = 1;
/** One machine-readable reason an export broke its budget. */
/** `skin-error` (export v3): a reduced skeleton moved a level-0 vertex by more than COMPOSER_SKELETON_SKIN_ERROR_BOUND of the
 * body diagonal (limit and actual are fractions of the diagonal). */
export interface ComposerBudgetReason {
    code: 'triangles' | 'bones' | 'materials' | 'texture-bytes' | 'draw-calls' | 'lod-target' | 'skin-error';
    level?: number;
    limit: number;
    actual: number;
}
/** Thrown when an export breaks its target's budget; nothing is written. */
export declare class ComposerExportBudgetError extends Error {
    readonly code = "composer-export-budget";
    readonly target: ComposerExportTarget;
    readonly budget: Readonly<ComposerExportBudget>;
    readonly reasons: readonly ComposerBudgetReason[];
    constructor(target: ComposerExportTarget, budget: Readonly<ComposerExportBudget>, reasons: readonly ComposerBudgetReason[]);
    toJSON(): {
        error: string;
        target: ComposerExportTarget;
        budget: Readonly<ComposerExportBudget>;
        reasons: readonly ComposerBudgetReason[];
    };
}
/** Checks measured export numbers against a budget; `levels[i].target` is that level's requested triangle target. */
export declare function checkComposerExportBudget(budget: Readonly<ComposerExportBudget>, actual: {
    bones: number;
    materials: number;
    textureBytes: number;
    drawCallsPerLevel: number;
    levels: readonly {
        triangles: number;
        target: number | null;
    }[];
}): {
    pass: boolean;
    reasons: ComposerBudgetReason[];
};
export declare const COMPOSER_EXPORT_DEFAULT_FPS = 30;
/** glTF application-specific attribute (leading underscore) carrying the runtime gloss channel. */
export declare const COMPOSER_GLOSS_ATTRIBUTE = "_COMPOSER_GLOSS";
export type ComposerGlossMode = 'attribute' | 'drop';
export type ComposerExportForward = '+Z' | '+X';
/** Default clip windows (seconds). Walk first tries whole gait periods up to `maxSeconds`; when none closes (a crawl's
 * travelling wave) it searches the seam from `walkMinSeconds`. Idle and display search between `minSeconds` and
 * `maxSeconds` (their sinusoids are incommensurate, so the seam is usually small but not zero; the report says so).
 * The shortest seamless window wins, else the smallest seam. A static motion bakes two identical keys one second apart. */
export declare const COMPOSER_EXPORT_CLIP_WINDOW: Readonly<{
    minSeconds: 4;
    maxSeconds: 12;
    walkMinSeconds: 0.5;
}>;
/** A clip loops seamlessly when the pose at its end equals the pose at t=0 within these (metres, radians). */
export declare const COMPOSER_EXPORT_SEAM_TOLERANCE: Readonly<{
    position: 0.0005;
    angle: number;
    scale: 0.001;
}>;
export interface ComposerClipRequest {
    motion: ComposerMotion;
    fps?: number;
    duration?: number;
}
export interface ComposerExportOptions {
    /** Motions (or explicit clip windows) to bake; default every COMPOSER_MOTIONS entry. */
    clips?: readonly (ComposerMotion | ComposerClipRequest)[];
    fps?: number;
    gloss?: ComposerGlossMode;
    forward?: ComposerExportForward;
    /** Name of the skeleton root node (default 'composer-creature'). */
    name?: string;
    /** v2: target profile. Sets the default LOD chain and, for quest-3, the hard budget. */
    target?: ComposerExportTarget;
    /** v2: LOD chain, level 0 first: 'full' (the unreduced skin; first entry only) or strictly decreasing triangle
     * targets. `false` exports a single mesh even for a profile with a default chain. */
    lods?: readonly (number | 'full')[] | false;
    /** v2: may only tighten the target's budget (each field becomes the smaller of the two). */
    budget?: Partial<ComposerExportBudget>;
    /** v2: bake idle and display as crossfaded loops whose last key equals the first bit for bit. */
    seamless?: boolean;
    /** v2: crossfade length in seconds (default COMPOSER_EXPORT_SEAMLESS_BLEND, at most half the window). */
    seamlessBlend?: number;
    /** v3: with a profile whose bone budget is below the graph's joint count, reduce the skeleton by the pre-registered
     * rule (COMPOSER_SKELETON_VERSION; default true). false keeps every joint, so such an export fails on `bones`. */
    reduceSkeleton?: boolean;
}
export interface ComposerClipWindow {
    duration: number;
    keys: number;
    /** Largest bone position (m), rotation (rad) and scale difference between the poses at 0 and `duration`. */
    seamPosition: number;
    seamAngle: number;
    seamScale: number;
    seamless: boolean;
    /** How the window was chosen. */
    method: 'static' | 'gait-periods' | 'seam-search' | 'requested' | 'crossfade';
}
export interface ComposerBakedClipReport extends ComposerClipWindow {
    motion: ComposerMotion;
    fps: number;
    /** Treadmill speed (m/s) along the exported forward axis; 0 for motions that stay in place. */
    travelSpeed: number;
    channels: {
        translation: number;
        rotation: number;
        scale: number;
    };
    /** v2 seamless loop: the crossfade length, the source window start and the seam of the uncrossfaded window. */
    crossfade?: {
        blendSeconds: number;
        sourceStart: number;
        rawSeamPosition: number;
        rawSeamAngle: number;
        rawSeamScale: number;
    };
}
export interface ComposerExportLodReport {
    level: number;
    target: number | null;
    triangles: number;
    vertices: number;
    reached: boolean;
    /** glTF node and mesh of this level; level 0 is the scene's skinned mesh. */
    node: number;
    mesh: number;
    screenCoverage: number;
    relaxation: number;
    mirrorKept: number;
    maxWeightChange: number;
    maxPlaneError: number;
    parts: {
        part: string;
        label: string;
        firstTriangle: number;
        triangles: number;
    }[];
    /** Output vertex -> composer skin vertex (not written to the GLB; for checks and tools). */
    sourceVertex: Uint32Array;
}
export interface ComposerExportReport {
    version: typeof COMPOSER_EXPORT_V3_VERSION;
    recipeText: string;
    speciesKey: string;
    versions: Record<string, string | number>;
    individual: {
        deltas: string[];
        effectiveRecipeText: string;
    };
    axes: {
        units: 'metres';
        up: '+Y';
        handedness: 'right';
        forward: ComposerExportForward;
    };
    mesh: {
        vertices: number;
        triangles: number;
        bones: number;
        parts: {
            part: string;
            label: string;
            firstTriangle: number;
            triangles: number;
        }[];
        restBounds: {
            min: [number, number, number];
            max: [number, number, number];
        };
    };
    gloss: ComposerGlossMode;
    /** Vertex rows changed to satisfy glTF: duplicate joints merged, zero-weight joints reset to 0, sums renormalised. */
    repairs: {
        weightRows: number;
        maxWeightChange: number;
        zeroNormals: number;
    };
    clips: ComposerBakedClipReport[];
    glbBytes: number;
    /** v2 only (absent when no v2 option is given). */
    target?: ComposerExportTarget;
    lods?: ComposerExportLodReport[];
    budget?: {
        target: ComposerExportTarget;
        limits: ComposerExportBudget | null;
        actual: {
            level0Triangles: number;
            bones: number;
            materials: number;
            textureBytes: number;
            drawCallsPerLevel: number;
        };
        pass: boolean;
    };
    /** v3, profiled exports only: the skeleton as written. `reduced: false` means every graph joint is a GLB joint. */
    skeleton?: ComposerExportSkeletonReport;
}
export interface ComposerExportSkeletonReport {
    version: typeof COMPOSER_SKELETON_VERSION;
    fullJoints: number;
    joints: number;
    reduced: boolean;
    stage: ComposerSkeletonStage | null;
    collapsed: {
        joint: string;
        into: string;
        stage: ComposerSkeletonStage;
    }[];
    /** [graph joint name, written joint it is skinned by], every graph joint in graph order (sidecar: mappingSha256). */
    mapping: [string, string][];
    /** Graph bone index of every written joint, in joint order. */
    survivors: number[];
    /** The pre-registered metric (null when nothing was reduced). */
    skinError: {
        max: number;
        diagonal: number;
        fraction: number;
        bound: number;
        vertex: number;
        motion: string | null;
        key: number;
        verticesChecked: number;
        keys: number;
        pass: boolean;
    } | null;
}
export interface ComposerExportResult {
    glb: Uint8Array;
    report: ComposerExportReport;
}
/** The versions a GLB depends on, in a fixed order. */
export declare function composerExportVersions(): Record<string, string | number>;
/** Largest bone position difference (m), rotation difference (rad) and bone scale difference between two poses. */
export declare function composerPoseDistance(a: ComposerPose, b: ComposerPose): {
    position: number;
    angle: number;
    scale: number;
};
/** The clip window for a motion: deterministic, chosen by measuring poseComposer (only the legged gait period is read
 * from the graph, and even that candidate is accepted only when its measured seam closes). */
export declare function composerClipWindow(graph: ComposerGraph, motion: ComposerMotion, fps?: number, duration?: number): ComposerClipWindow;
/** Samples poseComposer at `window.keys` evenly spaced times over [0, duration] (both ends included). Per bone:
 * keys x 3 translations, keys x 4 rotations, keys x 3 scales (null when the scale never leaves 1). Quaternions are
 * kept in one hemisphere from key to key so slerp playback never takes the long way round. */
export declare function bakeComposerClip(graph: ComposerGraph, motion: ComposerMotion, window: Pick<ComposerClipWindow, 'duration' | 'keys'>): {
    times: Float32Array;
    translation: Float32Array[];
    rotation: Float32Array[];
    scale: (Float32Array | null)[];
    travelSpeed: number;
};
/** v2 seamless loop (idle, display): the same key times as bakeComposerClip over [0, D], but key k shows the source
 * pose at b + t_k, and over the last b seconds it blends (smoothstep weight; lerp for translation and scale, normalised
 * lerp for rotation) toward the source pose at u = t - (D - b), the pre-roll that leads into b. At t = D the weight is
 * 1 and the pose is the source pose at b, which is key 0, so the last key is written as a copy of key 0: the loop
 * closes bit for bit. Inside the blend the clip is no longer poseComposer; everywhere else it is poseComposer(b + t).
 * Uses only + - * / and sqrt. Throws for a travelling motion (walk) and when the rotation path would close in the
 * opposite quaternion hemisphere (it never does for an idle sway; a throw beats a silent long-way slerp). */
export declare function bakeComposerLoopClip(graph: ComposerGraph, motion: ComposerMotion, window: Pick<ComposerClipWindow, 'duration' | 'keys'>, blend: number): {
    times: Float32Array;
    translation: Float32Array[];
    rotation: Float32Array[];
    scale: (Float32Array | null)[];
    travelSpeed: number;
};
/** The reduction rule (docs/creature-export-v3.md "The reduction rule", pre-registered before any measurement). */
export declare const COMPOSER_SKELETON_VERSION = "fauna-composer-skeleton-1";
/** Pre-registered bound: a reduced skeleton may move no level-0 vertex, at any key of any baked clip, by more than this
 * fraction of the body diagonal (the unreduced skin's rest bounding box) against the full skeleton. Never loosened. */
export declare const COMPOSER_SKELETON_SKIN_ERROR_BOUND = 0.02;
/** Unit stages, in the order they are applied. */
export declare const COMPOSER_SKELETON_STAGES: readonly ["feet", "metapodials", "tail", "torso", "neck"];
export type ComposerSkeletonStage = typeof COMPOSER_SKELETON_STAGES[number];
/** One reduction unit: joints removed together (both sides of a leg pair, or one midline joint). */
export interface ComposerSkeletonUnit {
    stage: ComposerSkeletonStage;
    joints: number[];
}
export interface ComposerSkeletonPlan {
    version: typeof COMPOSER_SKELETON_VERSION;
    fullJoints: number;
    joints: number;
    maxBones: number;
    /** True when joints were removed; false when the graph fits (nothing to do) or the units ran out (nothing removed). */
    reduced: boolean;
    /** joints <= maxBones. */
    reached: boolean;
    /** The last stage that removed a joint (null when nothing was removed). */
    stage: ComposerSkeletonStage | null;
    /** Surviving graph bones, ascending (graph order); every bone when nothing is removed. */
    survivors: number[];
    /** Graph bone -> its nearest surviving ancestor (itself when it survives). */
    into: number[];
    /** Removed joints by name, in removal order. */
    collapsed: {
        joint: string;
        into: string;
        stage: ComposerSkeletonStage;
    }[];
}
/** The reduction units of a graph, in application order: feet (per leg pair, pair ascending), metapodials (three-segment
 * legs, per pair), then the odd tail joints tip-most first, the odd torso joints rearmost first and the odd neck joints
 * base first, each merging into the joint before it. Knees (upper, lower), the root, head, arms, wings and trunk never
 * appear. */
export declare function composerSkeletonUnits(graph: ComposerGraph): ComposerSkeletonUnit[];
/** Applies the units in order until the joint count is at most `maxBones`, and no further. If they run out first,
 * nothing is removed (`reached: false`). */
export declare function planComposerSkeleton(graph: ComposerGraph, maxBones: number): ComposerSkeletonPlan;
/** The pre-registered skin error of a reduced skeleton: the largest distance between a vertex skinned with its full
 * rows (graph joints) and with its reduced rows (indices into `survivors`), over every key of every baked clip, with
 * joint matrices composed in float64 from the stored float32 channels times the stored float32 inverse bind matrices.
 * Rows whose joints all survive are identical in both skeletons and skipped. */
export declare function composerSkeletonSkinError(positions: Float32Array, full: {
    joints: Uint16Array;
    weights: Float32Array;
}, reduced: {
    joints: Uint16Array;
    weights: Float32Array;
}, survivors: readonly number[], ibm: Float32Array, clips: readonly {
    motion: string;
    translation: Float32Array[];
    rotation: Float32Array[];
    scale: (Float32Array | null)[];
    keys: number;
}[]): {
    max: number;
    vertex: number;
    motion: string | null;
    key: number;
    verticesChecked: number;
    keys: number;
};
/** Parses a GLB container (header, JSON chunk, BIN chunk). Throws on a malformed file. */
export declare function readComposerGlb(bytes: Uint8Array): {
    json: any;
    bin: Uint8Array;
};
/** MSFT_screencoverage hints, one per level: level i is drawn while the creature covers at least this fraction of the
 * screen height; the last level is never culled (0). */
export declare function composerLodScreenCoverage(levels: number): number[];
/** Builds the creature for `recipe` (a recipe object or its shared text) and returns the GLB bytes and a report. */
export declare function exportCreatureGlb(input: ComposerRecipe | string, options?: ComposerExportOptions): ComposerExportResult;
