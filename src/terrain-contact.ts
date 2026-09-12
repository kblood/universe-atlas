import type {V3} from './catalog.ts';
import {PATCH_SEGMENTS,type buildTile} from './planet-tiles.ts';
export type ContactPatch={key:string;anchor:V3;positions:Float32Array;indices:Uint32Array};
/** Mirror settled vertex-shader positions, including locked coarse edges.
 * Subtract the local physics origin before converting metre positions to float32. */
export function contactGeometry(data:ReturnType<typeof buildTile>,mask:number[],radius:number,origin:V3,key:string):ContactPatch {
  const n=PATCH_SEGMENTS,stride=n+1,positions=new Float32Array(stride*stride*3);
  for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){
    const i=(y*stride+x)*3,edge=(x===0&&mask[0])||(x===n&&mask[1])||(y===0&&mask[2])||(y===n&&mask[3]);
    const source=edge?data.parents:data.positions;
    for(let j=0;j<3;j++)positions[i+j]=(source[i+j]+data.anchor[j])*radius-origin[j];
  }
  return {key,anchor:data.anchor,positions,indices:new Uint32Array(data.indices.slice(0,n*n*6))};
}
