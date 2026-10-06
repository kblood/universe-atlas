import {createHash} from 'node:crypto';
export function tuples(){return Array.from({length:4096},(_,i)=>{
  const x=i%7===0?(i-2048)*250:(i*7919%40000001)-20000000;
  const y=i%11===0?(i-2000)*62.5:(i*3571%40000001)-20000000;
  const h=i%31===0?0:1+i*127%6000,s=i%29===0?NaN:i%19===0?.1:.2+(i%100)/80;
  return [i%97===0?NaN:x,i%101===0?Infinity:y,h,h+125*s,h,i*2654435761>>>0];});}
export function digest(fn,reverse=false){const a=tuples(),b=Buffer.alloc(a.length*8);for(let k=0;k<a.length;k++){const i=reverse?a.length-1-k:k;b.writeDoubleLE(fn(...a[i]),i*8);}return createHash('sha256').update(b).digest('hex');}
