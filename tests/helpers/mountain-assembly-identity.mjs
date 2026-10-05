// Outside-belt / outside-massif identity digests of terrainSampler (mountains assembly, docs/mountains-assembly-2026-10-05.md).
// The terrain module is passed in, so the same digest can be computed on another checkout (scripts read main's
// src/terrain.ts read-only to record the pins FIRST, before terrain.ts is edited).
import {createHash} from 'node:crypto';
import {orogenLayout} from '../../src/mountain-layout.ts';
import {MASSIF_ENVELOPE,massifHalfWidthM} from '../../src/mountain-envelope.ts';
import {fib,waterWorlds} from '../terrain-climate-fixtures.mjs';

/** belt 0 or a width-gated belt (no M2 envelope, main's ridge term). */
export const outsideBelt=o=>o.belt===0||o.halfWidthM<MASSIF_ENVELOPE.MIN_HALF_WIDTH_M;
/** outside every massif: outside the belt, or at least the massif half-width from the axis (massif-envelope-2). */
export const outsideMassif=o=>outsideBelt(o)||Math.abs(o.axisDistanceM)>=massifHalfWidthM(o.halfWidthM);

/** SHA-256 over (elevationM, groundHeightM, ocean[, colour]) of every direction of an n-direction Fibonacci set
 * per water world that `select` accepts, in world then index order. */
export const everywhere=()=>true;
export function identityDigest(terrainSampler,{n=4096,select=outsideBelt,colour=false,oceanOnly=false}={}){
  const hash=createHash('sha256'),f=new Float64Array(colour?5:2),bytes=new Uint8Array(f.buffer),flag=new Uint8Array(1),counts={};
  for(const body of waterWorlds()){
    hash.update(body.id);
    const ts=terrainSampler(body),lay=orogenLayout(body);let k=0;
    for(let i=0;i<n;i++){
      const d=fib(i,n);if(!select(lay.sample(d)))continue;
      const s=ts(d);f[0]=s.elevationM;f[1]=s.groundHeightM;
      if(colour){f[2]=s.color[0];f[3]=s.color[1];f[4]=s.color[2];}
      if(!oceanOnly)hash.update(bytes);flag[0]=s.ocean?1:0;hash.update(flag);k++;
    }
    counts[body.name]=k;
  }
  return {sha:hash.digest('hex'),counts};
}
