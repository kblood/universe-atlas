export const DRY_SURFACE_ROUGHNESS=.9;
export const WET_SURFACE_ROUGHNESS=.28;
/** Normalize the existing terrain sampler's dry/wet roughness endpoints to a
 * wet response weight. Intermediate sampler values retain a linear blend. */
export function surfaceWetnessFromRoughness(roughness:number){
  return Math.max(0,Math.min(1,(DRY_SURFACE_ROUGHNESS-roughness)/(DRY_SURFACE_ROUGHNESS-WET_SURFACE_ROUGHNESS)));
}
/** Preserve biome material targets when dry, approaching the sampler's wet
 * target only as its roughness signal becomes wetter. */
export function groundRoughnessTarget(biomeRoughness:number,surfaceRoughness:number){
  const biome=Math.max(0,Math.min(1,biomeRoughness));
  const wetness=surfaceWetnessFromRoughness(surfaceRoughness);
  return biome+(WET_SURFACE_ROUGHNESS-biome)*wetness;
}
