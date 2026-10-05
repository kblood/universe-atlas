// Shared M3 (carving F) digest fixture: 4096 fixed argument tuples over two seeds and the
// blocks -1 and 0 (along -16..16 km), including exclusions (belt 0, envelope 0, |across| >= w).
// Used by tests/mountain-carving*.test.mjs in-process and in a child process.
import {createHash} from 'node:crypto';

export const CARVING_F_DIGEST='1321803fcd6ba5b03fa009035154a025aefff6a2a5bf1442e9e4cf902443cfee';
export function carvingDigestArgs(){
  const out=[];
  for(let i=0;i<4096;i++){
    const along=-16000+((i*7919)%32000)+((i*37)%100)/100,across=((i*104729)%62000)-31000+((i*13)%10)/10;
    const envelope=i%97===0?0:3000*Math.max(0,1-Math.abs(across)/30000);
    out.push([along,across,30000,envelope,i%89===0?0:1,730201+(i&1)]);
  }
  return out;
}
/** SHA-256 of fn over the fixture in the given index order (values stored by index). */
export function carvingDigest(fn,order=null){
  const args=carvingDigestArgs(),v=new Float64Array(args.length);
  const idx=order??args.map((_,i)=>i);
  for(const i of idx)v[i]=fn(...args[i]);
  return createHash('sha256').update(Buffer.from(v.buffer)).digest('hex');
}
