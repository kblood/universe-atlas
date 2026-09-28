/** Deterministic search for a sunlit-adjacent coastal walking site on a wet
 * body, used by tests/rock-acceptance.browser.mjs. From a start direction it
 * scans rings of candidate sites (nearest first) for dry ground a few metres
 * above both compared sea levels, facing a short slope that crosses the
 * band between them and reaches open ocean. Pure: only the terrain sampler. */
import {terrainSampler} from '../src/terrain.ts';
const norm=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function basis(d){const ref=Math.abs(d[1])>.92?[1,0,0]:[0,1,0];const e=norm(cross(ref,d));return {e,n:cross(d,e)};}
const offset=(d,e,n,x,z,r)=>norm([d[0]+(e[0]*x+n[0]*z)/r,d[1]+(e[1]*x+n[1]*z)/r,d[2]+(e[2]*x+n[2]*z)/r]);
/** lowLevelM < highLevelM: rocks with ground in [lowLevelM+.3, highLevelM+.3)
 * exist only at the low level. Coarse global candidates (Fibonacci sphere,
 * nearest the start first) are dry sites a few metres above the high level;
 * the first with open ocean (at the low level) within `reachM` along one of
 * 16 bearings, crossing the band on the way, is returned. */
export function findShoreSite(body,start,{lowLevelM,highLevelM,globalSamples=400000,siteAboveM=[3,40],reachM=2400,stepM=20}={}){
  const sample=terrainSampler(body,undefined,undefined,undefined,lowLevelM),r=body.radiusM,s=norm(start);
  const coarse=[];
  for(let i=0;i<globalSamples;i++){
    const y=1-2*(i+.5)/globalSamples,phi=i*2.399963229728653,q=Math.sqrt(1-y*y),d=[Math.cos(phi)*q,y,Math.sin(phi)*q];
    const p=sample(d);if(p.ocean||!(p.groundHeightM>highLevelM+siteAboveM[0]&&p.groundHeightM<highLevelM+siteAboveM[1]))continue;
    coarse.push({d,h:p.groundHeightM,dot:d[0]*s[0]+d[1]*s[1]+d[2]*s[2]});
  }
  coarse.sort((a,b)=>b.dot-a.dot);
  for(const c of coarse){
    const b=basis(c.d);
    for(let q=0;q<16;q++){
      const t=2*Math.PI*q/16,dir=[Math.cos(t),Math.sin(t)];let band=0,ocean=null,firstBand=null,firstBandHeight=null;
      for(let m=stepM;m<=reachM;m+=stepM){
        const p=sample(offset(c.d,b.e,b.n,dir[0]*m,dir[1]*m,r));
        if(p.ocean||p.groundHeightM<lowLevelM){ocean=m;break;}
        if(p.groundHeightM>=lowLevelM+.3&&p.groundHeightM<highLevelM+.3){band++;if(firstBand===null){firstBand=m;firstBandHeight=p.groundHeightM;}}
      }
      if(ocean!==null&&band>=2){
        const facing=offset(c.d,b.e,b.n,dir[0]*ocean,dir[1]*ocean,r);
        // Observer: the first bearing sample inside the band (dry at the low
        // level, flooded at the high level), still facing the ocean.
        const observer=offset(c.d,b.e,b.n,dir[0]*firstBand,dir[1]*firstBand,r);
        // Waterline stand: the last dry sample before the low-level ocean.
        const shoreM=ocean-stepM,waterline=offset(c.d,b.e,b.n,dir[0]*shoreM,dir[1]*shoreM,r);
        return {direction:c.d,groundHeightM:c.h,facing,oceanAtM:ocean,bandSamples:band,firstBandM:firstBand,
          observer,observerGroundHeightM:firstBandHeight,waterline,waterlineGroundHeightM:sample(waterline).groundHeightM,waterlineM:shoreM,candidates:coarse.length,
          fromStartKm:Math.acos(Math.min(1,c.dot))*r/1000};
      }
    }
  }
  return null;
}
