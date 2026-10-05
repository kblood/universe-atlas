// Diagnostic (not a candidate export): candidate C with a coarser construction mesh, K recalibrated
// by the same pfit rule (p90 of uncapped H/E over e0>0.35 on seed 730201, block 0). Tests whether the
// raster pits of C (and the probe under sub-cell offsets) come from 125 m-wide channels aliasing on
// the 125 m D8 raster. Usage: node scripts/mountain-carving-c-coarse-probe.mjs ROWS COLS OUTPREFIX
import {readFileSync,writeFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {measureSites,judgeM3,q,hillshade,writePng,localMap,frame,raster} from '../tests/helpers/mountain-metrics.mjs';
import {rampSampler,rampArgs,SITES,R} from './mountain-render-carving.mjs';
const [ROWS,COLS,out]=process.argv.slice(2);
const src=readFileSync(new URL('../tests/fixtures/mountain-carving-r5-rejected.ts.txt',import.meta.url),'utf8');
const load=K=>{let s=src.replace('ROWS: 480, COLS: 120',`ROWS: ${ROWS}, COLS: ${COLS}`).replace(/\bK: [0-9.]+/,'K: '+K);
  return import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(s+'\nexport {cBuild,cCache};')).toString('base64'));};
let lo=.001,hi=1e6;
for(let i=0;i<30;i++){const K=Math.sqrt(lo*hi),m=await load(K),b=m.cBuild(730201,30000,0),v=[];
  for(let k=0;k<b.h.length;k++)if(b.mesh.e[k]>1050)v.push(b.uncapped[k]/b.mesh.e[k]);
  if(q(v,.9)>1)hi=K;else lo=K;}
const K=Math.sqrt(lo*hi),m=await load(K);
let first=null;const met=measureSites(rampSampler(m.carvingCM),SITES,R,{onRaster:(r,reg,si)=>{if(si===0)first=r;}});
const rows=Object.fromEntries(judgeM3(met).map(r=>[r.id,[r.actual,r.pass?'P':'F']]));
const per=[];for(let i=0;i<8;i++){const mm=measureSites(rampSampler(m.carvingCM),[SITES[i]],R);per.push(Object.fromEntries(judgeM3(mm).map(r=>[r.id,r.actual])));}
// Cold standard workload incl. builds (same args as the benchmark), ns/sample.
const args=[];for(const {d} of SITES){const map=localMap(d,frame(d),R);for(let j=0;j<385;j++)for(let i=0;i<385;i++)args.push(rampArgs(map((i-192)*125,(j-192)*125)));}
m.cCache.fill(undefined);let cs=0,t=performance.now();for(const a of args)cs+=m.carvingCM(...a);const coldNs=(performance.now()-t)*1e6/args.length;
t=performance.now();for(let id=0;id<7;id++)m.cBuild(730201,30000,id);const buildMs=(performance.now()-t)/7;
const res={ROWS:+ROWS,COLS:+COLS,K,rows,perSeed:per,coldNsPerSample:coldNs,meanBuildMs:buildMs,checksum:cs};
console.log(JSON.stringify(res));writeFileSync(out+'.json',JSON.stringify(res,null,1));
writePng(out+'-site0.png',first.n,first.n,hillshade(first,5000));
