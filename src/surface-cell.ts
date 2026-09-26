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
