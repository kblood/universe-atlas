/** Reproducible visual fluctuations for the early full-screen sky.
 * This is an illustration, not a measured CMB power spectrum. */
import {rng} from './catalog.ts';

export const CMB_FIELD_VERSION='atlas-cmb-illustration-1';
export function illustrativeCmbGradient(seed:string):string {
  const draw=rng(`${seed}/${CMB_FIELD_VERSION}`);
  const spots:string[]=[];
  for(let i=0;i<24;i++){
    const x=Math.round(draw()*100),y=Math.round(draw()*100);
    const rx=15+Math.round(draw()*30),ry=12+Math.round(draw()*24);
    const warm=draw()>.5;
    const color=warm?'rgba(250,187,133,.2)':'rgba(121,169,223,.2)';
    spots.push(`radial-gradient(ellipse ${rx}% ${ry}% at ${x}% ${y}%, ${color} 0%, transparent 100%)`);
  }
  return spots.join(',');
}
