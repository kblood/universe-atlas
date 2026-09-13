import type {V3} from './catalog.ts';

export type OceanCullInput={
  positions:ArrayLike<number>; parents:ArrayLike<number>; oceanPositions:ArrayLike<number>; oceanParents:ArrayLike<number>;
  /** Only the shared base grid participates. Terrain skirts are never ocean geometry. */
  baseVertices:number; anchorDir:V3; radiusM:number; epsilonM?:number;
};
export type OceanCullProof={canCull:boolean; reason:'separated'|'overlap'; groundMinM:number;oceanMaxM:number};

/**
 * Cheap whole-patch proof. Project all child and parent vertices onto the
 * tile-anchor outward axis in local metres. A morph, edge lock, and triangle
 * interpolation are all convex combinations of those vertices, so a strict
 * interval gap proves that no rendered ocean point can meet rendered ground.
 * It intentionally rejects curved/coarse patches whose projection bounds
 * overlap; that is safe and keeps coast patches drawing water.
 */
export function oceanPatchCullProof(input:OceanCullInput):OceanCullProof{
  const length=Math.hypot(...input.anchorDir);if(!length)return {canCull:false,reason:'overlap',groundMinM:-Infinity,oceanMaxM:Infinity};
  const n=input.anchorDir.map(v=>v/length) as V3,project=(buffer:ArrayLike<number>,i:number)=>(buffer[i*3]*n[0]+buffer[i*3+1]*n[1]+buffer[i*3+2]*n[2])*input.radiusM;
  let groundMin=Infinity,oceanMax=-Infinity;
  for(let i=0;i<input.baseVertices;i++){
    groundMin=Math.min(groundMin,project(input.positions,i),project(input.parents,i));
    oceanMax=Math.max(oceanMax,project(input.oceanPositions,i),project(input.oceanParents,i));
  }
  const canCull=groundMin>oceanMax+(input.epsilonM??.002);
  return {canCull,reason:canCull?'separated':'overlap',groundMinM:groundMin,oceanMaxM:oceanMax};
}
