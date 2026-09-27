/** Stable integer cubemap cells for local populations. The cell center,
 * rather than a camera-derived float direction, defines a herd anchor. */
import type {V3} from './catalog.ts';

export const SURFACE_CELL_VERSION='atlas-surface-cell-1';
export type SurfaceCell={id:string;direction:V3};
export function surfaceCellAt(direction:V3,radiusM:number,cellSizeM=32):SurfaceCell {
  const [x,y,z]=direction;
  const ax=Math.abs(x),ay=Math.abs(y),az=Math.abs(z);
  if(!(radiusM>0)||!Number.isFinite(radiusM)||!(cellSizeM>0)||Math.max(ax,ay,az)===0)
    throw new RangeError('surfaceCellAt requires a valid direction and positive sizes');
  let face:string,u:number,v:number;
  if(ax>=ay&&ax>=az){face=x>=0?'x+':'x-';u=(x>=0?z:-z)/ax;v=y/ax;}
  else if(ay>=az){face=y>=0?'y+':'y-';u=x/ay;v=(y>=0?z:-z)/ay;}
  else {face=z>=0?'z+':'z-';u=(z>=0?x:-x)/az;v=y/az;}
  const n=Math.max(1,Math.ceil(2*radiusM/cellSizeM));
  const ix=Math.max(0,Math.min(n-1,Math.floor((u+1)*n/2)));
  const iy=Math.max(0,Math.min(n-1,Math.floor((v+1)*n/2)));
  const cu=(ix+.5)*2/n-1,cv=(iy+.5)*2/n-1;
  const raw:V3=face==='x+'?[1,cv,cu]:face==='x-'?[-1,cv,-cu]
    :face==='y+'?[cu,1,cv]:face==='y-'?[cu,-1,-cv]
    :face==='z+'?[cu,cv,1]:[-cu,cv,-1];
  const length=Math.hypot(...raw);
  return {id:`${face}/${ix}/${iy}`,direction:[raw[0]/length,raw[1]/length,raw[2]/length]};
}

/** Complete canonical-cell selection. Bounds are conservative in cube UV;
 * the final chord-distance filter is exact. No observer-aligned sample grid
 * can skip an interior cell. Includes all incident faces at seams/corners. */
export function surfaceCellsWithin(direction:V3,radiusM:number,rangeM:number,cellSizeM=32):SurfaceCell[]{
  if(!(radiusM>0)||!Number.isFinite(radiusM)||!(cellSizeM>0)||!Number.isFinite(cellSizeM)||rangeM<0||!Number.isFinite(rangeM))throw new RangeError('Invalid surface cell region');
  const length=Math.hypot(...direction);if(!length||!Number.isFinite(length))throw new RangeError('Invalid surface direction');
  const [x,y,z]=direction.map(v=>v/length),n=Math.max(1,Math.ceil(2*radiusM/cellSizeM));
  const angular=Math.min(2,rangeM/radiusM),out:SurfaceCell[]=[];
  const faces=[{id:'x+',axis:x,u:z,v:y},{id:'x-',axis:-x,u:-z,v:y},
    {id:'y+',axis:y,u:x,v:z},{id:'y-',axis:-y,u:x,v:-z},
    {id:'z+',axis:z,u:x,v:y},{id:'z-',axis:-z,u:-x,v:y}];
  for(const f of faces){
    // An owning cube face has its dominant component >= 1/sqrt(3).
    if(f.axis<1/Math.sqrt(3)-angular)continue;
    // The ratios' derivatives are bounded by 4 inside a face. Using the
    // interval denominator also covers centres just outside the face.
    const axisMin=Math.max(.01,f.axis-angular),span=angular*(1/axisMin+Math.max(Math.abs(f.u),Math.abs(f.v))/(axisMin*axisMin));
    const u=f.u/f.axis,v=f.v/f.axis;
    const loX=Math.max(0,Math.floor((u-span+1)*n/2)),hiX=Math.min(n-1,Math.floor((u+span+1)*n/2));
    const loY=Math.max(0,Math.floor((v-span+1)*n/2)),hiY=Math.min(n-1,Math.floor((v+span+1)*n/2));
    for(let iy=loY;iy<=hiY;iy++)for(let ix=loX;ix<=hiX;ix++){
      const a=(ix+.5)*2/n-1,b=(iy+.5)*2/n-1;
      const raw:V3=f.id==='x+'?[1,b,a]:f.id==='x-'?[-1,b,-a]:f.id==='y+'?[a,1,b]:f.id==='y-'?[a,-1,-b]:f.id==='z+'?[a,b,1]:[-a,b,-1];
      const l=Math.hypot(...raw),d:V3=[raw[0]/l,raw[1]/l,raw[2]/l];
      if(Math.hypot(d[0]-x,d[1]-y,d[2]-z)>angular+1e-14)continue;
      out.push({id:`${f.id}/${ix}/${iy}`,direction:d});
    }
  }
  return out.sort((a,b)=>Math.hypot(a.direction[0]-x,a.direction[1]-y,a.direction[2]-z)-Math.hypot(b.direction[0]-x,b.direction[1]-y,b.direction[2]-z)||a.id.localeCompare(b.id));
}
