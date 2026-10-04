import {hash64,noise,type Body,type V3} from './catalog.ts';
/** The SEED of the landform noise. Never bump it: a bump re-rolls every ridge. */
export const LANDFORM_VERSION='planet-landforms-1';
/** The landform SHAPE (gates and ceiling). planet-landforms-shape-2 (terrain-1.8.0-relief):
 * the water-world land gate can read a separate raw height and the ceiling is per body. */
export const LANDFORM_SHAPE_VERSION='planet-landforms-shape-2';
/** The legacy (terrain-1.7) ceiling, used when a caller passes none. */
export const LEGACY_LANDFORM_CEILING_M=19500;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(a:number,b:number,v:number)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};

/** Fixed metre wavelengths create regional ranges, secondary ridges and rock
 * outcrops beneath the continental field. No camera/LOD/time input. Coastal
 * lowlands stay unchanged, and small bodies scale the amplitude down.
 *
 * (d, baseHeightM, gateHeightM = baseHeightM, ceilingM = 19500):
 *  - gateHeightM: the height the water-world land gate smooth(300,1700) reads.
 *    terrain-1.8.0's relief mode passes the RAW terrain-1.7 base height, so the
 *    landform geography (where ranges stand) is unchanged by the reshaped floor;
 *  - ceilingM: the result is clamped to ceilingM - baseHeightM. Relief mode
 *    passes bodyHeightBoundM(body).maxM (terrain.ts). Two-argument callers get
 *    the terrain-1.7 behaviour exactly (gate and 19500 ceiling on baseHeightM). */
export function planetLandforms(body:Body){
  const seed=Number(hash64(body.seed+'/'+LANDFORM_VERSION)&0xffffffffn),r=body.radiusM;
  return (d:V3,baseHeightM:number,gateHeightM:number=baseHeightM,ceilingM:number=LEGACY_LANDFORM_CEILING_M)=>{
    if(body.kind==='star'||body.type==='Gas giant')return 0;
    const land=body.water?smooth(300,1700,gateHeightM):1;
    if(!land)return 0;
    const ridge=(length:number,channel:number)=>1-Math.abs(2*noise(d[0]*r/length+31,d[1]*r/length+17,d[2]*r/length+53,seed+channel)-1);
    const range=ridge(14000,1),spur=ridge(2300,2),rock=ridge(310,3);
    const height=land*Math.min(1,r/2e6)*(range*range*range*range*1650+spur*spur*spur*230+rock*rock*28);
    return Math.max(0,Math.min(height,ceilingM-baseHeightM));
  };
}
