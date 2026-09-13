import {hash64,noise,type V3} from './catalog.ts';
import type {RiverRegion} from './river-types.ts';
import {riverFeatureAt} from './river-sample.ts';

/** Versioned regional physical-surface relief.  It deliberately sits outside
 * the legacy terrain and drainage samplers: river exports and canonical
 * catchments retain their terrain-1.1.0 inputs. */
export const REGIONAL_LANDFORM_VERSION='regional-landform-1';
const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const seeds=new WeakMap<RiverRegion,number>();
function seedFor(region:RiverRegion){let seed=seeds.get(region);if(seed===undefined){seed=Number(hash64(region.bodySeed+'/regional-landform-1')&0xffffffffn);seeds.set(region,seed);}return seed;}

/** Adds a bounded valley-wall/rim and sparse talus-like residual to dry land.
 * The correction is exactly zero at the wet edge and at the 3 km region limit;
 * water beds and the legacy base sampler remain authoritative. */
export function regionalLandformHeight(region:RiverRegion,d:V3,baseHeightM:number){
  const feature=riverFeatureAt(region,d);
  if(!feature)return baseHeightM;
  const outward=Math.max(0,feature.distanceM-feature.wetRadiusM);
  if(outward<=0||outward>=3000)return baseHeightM;
  const near=smooth(18,260,outward),far=1-smooth(1650,3000,outward);
  const corridor=near*far;
  // Broad walls make a readable valley at flight scale; the short inner rise
  // supplies exposed cliff faces without a discontinuity at the water edge.
  const wall=(42*smooth(35,310,outward)+25*smooth(260,900,outward))*far;
  const seed=seedFor(region);
  const strata=noise(d[0]*region.radiusM/230+17,d[1]*region.radiusM/230+29,d[2]*region.radiusM/230+43,seed);
  const talus=(strata-.5)*16*smooth(180,650,outward)*far;
  return baseHeightM+(wall+talus)*corridor;
}
