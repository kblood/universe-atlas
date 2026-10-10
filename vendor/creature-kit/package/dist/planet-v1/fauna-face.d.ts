import type { QuadrupedPlan, Vec3 } from './fauna-body-plan.ts';
/** Small surface details share the body's draw, material and skinning. All
 * landmarks are projected onto the actual polygonised skin, so coarse grids
 * cannot swallow an eye or leave a mouth floating above a different surface. */
export interface FaunaFaceFeature {
    kind: 'eye' | 'nostril' | 'mouth';
    side: -1 | 1;
    firstVertex: number;
    vertexCount: number;
    firstTriangle: number;
    triangleCount: number;
}
export interface FaunaFaceAttachment {
    vertices: [number, number, number];
    weights: [number, number, number];
}
export declare function quadrupedFaceBuildSteps(plan: QuadrupedPlan, positions: number[], indices: number[], bodyTriangleCount: number, colors: Vec3[], attachments: FaunaFaceAttachment[]): Generator<void, FaunaFaceFeature[], void>;
