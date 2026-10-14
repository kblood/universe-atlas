/** Tree Kit public API v1: validated GLB families, canopy material setup and wind. */
export {
  TREE_REFERENCE_HEIGHT_M,
  TREE_WIND_PERIOD_NS,
  loadTreeAssetFamily,
  prepareTreeLODPair,
  treeLodCardScale,
  treeVertexMeters,
  treeWindPhase,
} from '../tree-asset.ts';
export type {
  TreeAssetFamily,
  TreeAssetOptions,
  TreeCanopyPresentation,
  TreeCardCompensation,
  TreeInstanceAllometry,
} from '../tree-asset.ts';
export {TreeBarkTexturePool} from '../tree-bark-texture-pool.ts';
export type {TreeBarkTextureLease, TreeBarkTextureRole} from '../tree-bark-texture-pool.ts';
export {TREE_KIT_API_VERSION} from './version.ts';
