import type { QuadrupedPlan, Vec3 } from './fauna-body-plan.ts';
/** Authored grounded morphologies. These closed surfaces share the body's
 * material and existing skeleton. Trunks follow the head; folded wings follow
 * the chest. Independent trunk articulation and powered flight need new rigs. */
export declare function appendFaunaStructuralFeatures(plan: QuadrupedPlan, positions: number[], indices: number[]): {
    colors: Vec3[];
    bones: number[];
};
