import {hash64,noise,type Body,type V3} from './catalog.ts';
export const LANDFORM_VERSION='planet-landforms-1';
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(a:number,b:number,v:number)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};

/** Fixed metre wavelengths create regional ranges, secondary ridges and rock
 * outcrops beneath the continental field. No camera/LOD/time input. Coastal
 * lowlands stay unchanged, and small bodies scale the amplitude down. */
export function planetLandforms(body:Body){
  const seed=Number(hash64(body.seed+'/'+LANDFORM_VERSION)&0xffffffffn),r=body.radiusM;
  return (d:V3,baseHeightM:number)=>{
    if(body.kind==='star'||body.type==='Gas giant')return 0;
    const land=body.water?smooth(300,1700,baseHeightM):1;
    if(!land)return 0;
    const ridge=(length:number,channel:number)=>1-Math.abs(2*noise(d[0]*r/length+31,d[1]*r/length+17,d[2]*r/length+53,seed+channel)-1);
    const range=ridge(14000,1),spur=ridge(2300,2),rock=ridge(310,3);
    const height=land*Math.min(1,r/2e6)*(range*range*range*range*1650+spur*spur*spur*230+rock*rock*28);
    return Math.max(0,Math.min(height,19500-baseHeightM));
  };
}
