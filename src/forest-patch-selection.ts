import type {V3} from './catalog.ts';
import {cubeDirection} from './planet-tiles.ts';
import {FOREST_CELL_M} from './planet-population.ts';
import {FOREST_PATCH_SIDE,type ForestPatchAddress} from './forest-patch.ts';

/** Conservative patch residency, independent of population hashes/habitat.
 * Shares the existing selector's face windows but visits patches, not cells.
 * Normalizing a face vector has derivative norm <= 1: the UV half-diagonal
 * therefore bounds every jittered cell in a patch. Extra patches are allowed;
 * omitting a production-selected candidate is not. Distance is chord metres,
 * matching populationCells. Intended for local (< 0.1R) forest working sets. */
export function forestPatchAddresses(center:V3,radiusM:number,rangeM:number,maxPatches=32768):ForestPatchAddress[]{
  if(!Array.isArray(center)||center.length!==3||!center.every(Number.isFinite)||Math.abs(Math.hypot(...center)-1)>1e-6||
    !Number.isFinite(radiusM)||radiusM<=0||!Number.isFinite(rangeM)||rangeM<0||rangeM>radiusM*.1||
    !Number.isSafeInteger(maxPatches)||maxPatches<1)throw new Error('Invalid forest patch selection');
  const n=Math.ceil(2*radiusM/FOREST_CELL_M),angular=rangeM/radiusM,side=FOREST_PATCH_SIDE;
  const [x,y,z]=center,component=[x,-x,y,-y,z,-z],result:{address:ForestPatchAddress;distance:number}[]=[];
  for(let face=0;face<6;face++){
    const axis=component[face];if(axis<.5-angular*2)continue;
    const [u,v]=[[-z/axis,y/axis],[z/axis,y/axis],[x/axis,-z/axis],[x/axis,z/axis],[x/axis,y/axis],[-x/axis,y/axis]][face];
    const span=angular*3;
    const loX=Math.floor(Math.max(0,Math.floor((u-span+1)*n/2))/side),hiX=Math.floor(Math.min(n-1,Math.ceil((u+span+1)*n/2))/side);
    const loY=Math.floor(Math.max(0,Math.floor((v-span+1)*n/2))/side),hiY=Math.floor(Math.min(n-1,Math.ceil((v+span+1)*n/2))/side);
    for(let py=loY;py<=hiY;py++)for(let px=loX;px<=hiX;px++){
      const x0=px*side,x1=Math.min(n,x0+side),y0=py*side,y1=Math.min(n,y0+side);
      const d=cubeDirection(face,(x0+x1)/n-1,(y0+y1)/n-1);
      const distance=Math.hypot(d[0]-x,d[1]-y,d[2]-z),bound=Math.hypot(x1-x0,y1-y0)/n;
      if(distance>angular+bound)continue;
      if(result.length>=maxPatches)throw new Error('Forest patch selection exceeds residency limit');
      result.push({address:{face,n,x:px,y:py},distance});
    }
  }
  return result.sort((a,b)=>a.distance-b.distance||a.address.face-b.address.face||a.address.y-b.address.y||a.address.x-b.address.x).map(x=>x.address);
}
