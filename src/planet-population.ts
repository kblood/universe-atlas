import { type V3 } from './catalog.ts';
import { cubeDirection } from './planet-tiles.ts';

export const POPULATION_VERSION='surface-population-2';
export type PopulationCell={id:string;direction:V3;roll:number;heightM:number;yaw:number;distanceM:number};
function hash(text:string){let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);h=Math.imul(h^(h>>>16),2246822507);return (h^(h>>>13))>>>0;}
const random=(key:string)=>hash(key)/4294967296;

/** Enumerate fixed cubemap cells across face seams. Camera position selects
 * the working set only; jitter, identity and physical dimensions use cell IDs.
 * Actual surface area varies across the cube projection, so placement uses a
 * Jacobian correction to avoid denser forests at cube corners. */
export function populationCells(seed:string,center:V3,radiusM:number,rangeM:number,cellM:number):PopulationCell[]{
  const n=Math.ceil(2*radiusM/cellM),result:PopulationCell[]=[];
  const angular=rangeM/radiusM,limit=angular*angular;
  const component=[center[0],-center[0],center[1],-center[1],center[2],-center[2]];
  for(let face=0;face<6;face++){
    const axis=component[face];if(axis<.5-angular*2)continue;
    const [x,y,z]=center;
    const [u,v]=[[-z/axis,y/axis],[z/axis,y/axis],[x/axis,-z/axis],[x/axis,z/axis],[x/axis,y/axis],[-x/axis,y/axis]][face];
    const span=angular*3;
    const loX=Math.max(0,Math.floor((u-span+1)*n/2)),hiX=Math.min(n-1,Math.ceil((u+span+1)*n/2));
    const loY=Math.max(0,Math.floor((v-span+1)*n/2)),hiY=Math.min(n-1,Math.ceil((v+span+1)*n/2));
    for(let iy=loY;iy<=hiY;iy++)for(let ix=loX;ix<=hiX;ix++){
      const cu=(ix+.5)*2/n-1,cv=(iy+.5)*2/n-1;
      const d=cubeDirection(face,cu,cv);
      const d2=(d[0]-x)**2+(d[1]-y)**2+(d[2]-z)**2;
      if(d2>limit)continue;
      const id=`${face}/${n}/${ix}/${iy}`,key=seed+'/'+POPULATION_VERSION+'/'+id;
      // Uniform density in square metres, including cube seams/corners.
      const area=1/Math.pow(1+cu*cu+cv*cv,1.5);
      if(random(key+'/area')>Math.floor(area*1e6)/1e6)continue;
      const direction=cubeDirection(face,(ix+.2+random(key+'/x')*.6)*2/n-1,(iy+.2+random(key+'/y')*.6)*2/n-1);
      result.push({id,direction,roll:random(key+'/presence'),heightM:10+random(key+'/height')*12,
        yaw:random(key+'/yaw')*Math.PI*2,distanceM:Math.sqrt(d2)*radiusM});
    }
  }
  return result.sort((a,b)=>a.distanceM-b.distanceM||a.id.localeCompare(b.id));
}
