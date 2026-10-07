import {readFileSync} from 'node:fs';import {stripTypeScriptTypes} from 'node:module';
let s=readFileSync(process.argv[2]+'/src/mountain-carving.ts','utf8');
const marks=['// Routing surface','// Triangulated neighbours','// 1. Priority flood','// 2. Steepest','// 3. Upstream','// 4. Height integral','// 5. Hillslope','// 6. Smooth','return {h,cap:t2,ramp};'];
marks.forEach((m,i)=>{if(!s.includes(m))throw m;s=s.replace(m,`globalThis.T[${i}]+=performance.now();globalThis.T[${i}]-=0;globalThis.L[${i}]=performance.now();`+m);});
globalThis.T=new Array(9).fill(0);globalThis.L=new Array(9).fill(0);
// convert to durations: record per-mark timestamps then diff
s=s.replace(/globalThis\.T\[(\d)\]\+=performance\.now\(\);globalThis\.T\[\d\]-=0;/g,'');
s=s.replace(/globalThis\.L\[(\d)\]=performance\.now\(\);/g,(m,i)=>`globalThis.L[${i}]=performance.now();if(${i}>0)globalThis.T[${i}-1]+=globalThis.L[${i}]-globalThis.L[${i}-1];`);
const C=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(s+'\nexport {solve};')).toString('base64'));
for(let id=0;id<3;id++)C.solve(730201,48000,id);T.fill(0);
const n=10;for(let id=3;id<3+n;id++)C.solve(730201,48000,id);
const names=['noise','nbdef','flood','rcv','acc','integral','hill','norm'];
console.log(names.map((x,i)=>x+' '+(T[i]/n).toFixed(1)).join(' | '),'total',(T.slice(0,8).reduce((a,b)=>a+b)/n).toFixed(1));
