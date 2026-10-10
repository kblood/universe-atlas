import type { QuadrupedPlan } from './fauna-body-plan.ts';
/** An explicit presentation revision. The inherited genome and all locomotion
 * landmarks belong to the caller; only newly allocated skin volumes change. */
export declare const QUADRUPED_SCULPTED_BODY_VERSION = "quadruped-body-sculpted-1";
export type QuadrupedBodyPresentation = 'legacy-v4' | 'sculpted-v1';
export interface QuadrupedBodyOptions {
    presentation?: QuadrupedBodyPresentation;
}
/** A barely sampled tail cap can form a detached sub-cell island. Discard only
 * that numerical dust, never a foot, a substantial part, or the main skin.
 * The rest of the mesher (including its saddle-edge limitation) is unchanged. */
export declare function removeTailSamplingDust(positions: number[], indices: number[], plan: QuadrupedPlan, cell: number): {
    removedTailIslands: number;
    removedVertices: number;
    removedTriangles: number;
};
export declare function sculptQuadrupedPlan(source: QuadrupedPlan): QuadrupedPlan;
