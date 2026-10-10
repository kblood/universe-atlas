// Compatibility path: canonical animal implementation is the versioned built creature-kit/planet entry.
export {
  QUADRUPED_BODY_VERSION,
  QUADRUPED_BONE_NAMES,
  QUADRUPED_BONE_PARENTS,
  BONE,
  LEG_UPPER_BONES,
  QUADRUPED_GRID_POINT_BUDGET,
  solveTwoBone,
  ankleFromToe,
  createQuadrupedPlan,
  primitiveDistance,
  quadrupedBodyDistance,
  quadrupedBodyBuildSteps,
  buildQuadrupedBody,
  quadrupedBodyBytes,
  type Vec3,
  type QuadrupedLegPlan,
  type QuadrupedPrimitive,
  type QuadrupedAppendage,
  type QuadrupedPlan,
  type QuadrupedBodyData
} from '#creature-kit/planet';
