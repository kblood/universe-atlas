import { type V3 } from './catalog.ts';
import { cubeDirection } from './planet-tiles.ts';

export const POPULATION_VERSION='surface-population-2';
/** Frozen address-grid input. Changing this requires a population migration. */
export const FOREST_CELL_M=18;
/** Presentation sampling only; does not change canonical presence. */
export const FAR_CROWN_PROBABILITY=.065;
export type PopulationCell={id:string;direction:V3;roll:number;heightM:number;yaw:number;distanceM:number;canopyRepresentative?:boolean};
function hash(text:string){let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);h=Math.imul(h^(h>>>16),2246822507);return (h^(h>>>13))>>>0;}
const random=(key:string)=>hash(key)/4294967296;
export const forestRepresentative=(seed:string,id:string)=>random(seed+'/'+POPULATION_VERSION+'/'+id+'/far-crown')<FAR_CROWN_PROBABILITY;

function cellAt(key:string,id:string,face:number,n:number,ix:number,iy:number,distanceM:number):PopulationCell {
  const direction=cubeDirection(face,(ix+.2+random(key+'/x')*.6)*2/n-1,(iy+.2+random(key+'/y')*.6)*2/n-1);
  return {id,direction,roll:random(key+'/presence'),heightM:10+random(key+'/height')*12,
    yaw:random(key+'/yaw')*Math.PI*2,distanceM};
}

/** A camera-independent address query for regional summaries. It uses exactly
 * the existing cell jitter, area correction and physical dimensions. Distance
 * is working-set metadata and is zero here. Habitat is a separate query. */
export function populationCellAt(seed:string,face:number,n:number,ix:number,iy:number):PopulationCell|null {
  if(!Number.isSafeInteger(n)||n<1||!Number.isInteger(face)||face<0||face>5||
    !Number.isInteger(ix)||!Number.isInteger(iy)||ix<0||iy<0||ix>=n||iy>=n)throw new Error('Invalid population cell address');
  const id=`${face}/${n}/${ix}/${iy}`,key=seed+'/'+POPULATION_VERSION+'/'+id;
  const cu=(ix+.5)*2/n-1,cv=(iy+.5)*2/n-1;
  const area=1/Math.pow(1+cu*cu+cv*cv,1.5);
  if(random(key+'/area')>Math.floor(area*1e6)/1e6)return null;
  return cellAt(key,id,face,n,ix,iy,0);
}

/** Enumerate fixed cubemap cells across face seams. Camera position selects
 * the working set only; jitter, identity and physical dimensions use cell IDs.
 * Actual surface area varies across the cube projection, so placement uses a
 * Jacobian correction to avoid denser forests at cube corners. */
export function populationCells(seed:string,center:V3,radiusM:number,rangeM:number,cellM:number,farSubset?:{fullRangeM:number;probability:number}):PopulationCell[]{
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
      const representative=farSubset?random(key+'/far-crown')<farSubset.probability:undefined;
      // Reject sparse far cells before allocating/jittering/sorting them.
      // At 4.5 km this avoids ~180,000 temporary objects per selection.
      if(farSubset&&!representative&&d2>(farSubset.fullRangeM/radiusM)**2)continue;
      const cell=cellAt(key,id,face,n,ix,iy,Math.sqrt(d2)*radiusM);
      if(farSubset)cell.canopyRepresentative=representative;
      result.push(cell);
    }
  }
  return result.sort((a,b)=>a.distanceM-b.distanceM||a.id.localeCompare(b.id));
}

/** Far crowns are a fixed, sparse sample of the SAME tree field. The mask is
 * independent of the camera and the presence roll. Approaching a far crown
 * therefore reveals exactly that tree, including its dimensions and yaw.
 * This is a coverage approximation at distance, not a separate stand flora. */
export function forestPopulationCells(seed:string,center:V3,radiusM:number,nearRangeM:number,farRangeM:number,cellM:number):PopulationCell[]{
  return populationCells(seed,center,radiusM,farRangeM,cellM,{fullRangeM:nearRangeM,probability:FAR_CROWN_PROBABILITY});
}
