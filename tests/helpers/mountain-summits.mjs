// M4 fixture only: flat chart, independent synthetic belt; no assembled field.
import {massifEnvelopeM,maxEnvelopeM} from '../../src/mountain-envelope.ts';
import {ridgeValleyCarvingM} from '../../src/mountain-carving.ts';
import {prominence,rasterFromArray} from './mountain-metrics.mjs';

export const SUMMIT_FIXTURE=Object.freeze({w:32000,tau:3000/3640,n:385,localStep:125,wideStep:250,seed:730201});
export const SUMMIT_THRESHOLDS=Object.freeze([
  Object.freeze({id:'density',row:'R1',class:'CONTRACT',op:'>=',value:8}),
  Object.freeze({id:'placement',row:'R2',class:'CONTRACT',op:'>=',value:.9}),
  Object.freeze({id:'boundViolations',row:'R3',class:'CONTRACT',op:'<=',value:0}),
]);
export function judgeM4(metrics={}){
  return SUMMIT_THRESHOLDS.map(row=>{const actual=metrics[row.id];return {...row,actual,
    pass:Number.isFinite(actual)&&actual>=0&&(row.op==='>='?actual>=row.value:actual<=row.value)};});
}
export function beltAt(y,w=SUMMIT_FIXTURE.w){
  const s=Math.abs(y)/w;if(s>=1)return 0;
  const t=Math.max(0,Math.min(1,(s-.65)/.35));return (1-.1*s*s)*(1-t*t*(3-2*t));
}
export function summitRaster({site=0,w=SUMMIT_FIXTURE.w,tau=SUMMIT_FIXTURE.tau,step=125,y0=0,shift=0,bare=false,gain=1,reverse=false}={}){
  const n=385,h=new Float64Array(n*n);
  for(let k=0;k<h.length;k++){
    const p=reverse?h.length-1-k:k,x=site*1e6+(p%n-192)*step,y=y0+(Math.floor(p/n)-192)*step-shift;
    const belt=beltAt(y,w),U=massifEnvelopeM(belt,y,w,1000,1,tau,'water');
    h[p]=gain*(U+(bare?0:ridgeValleyCarvingM(x,y,w,U,belt,730201+site)));
  }
  return {...rasterFromArray(h,n,step),site,w,tau,y0};
}
// Cell-area convention matches the shared harness: each sampled cell owns step^2.
// Mask is always centred at y=0, including for the shifted-field negative.
export function measureSummits(r,{w=r.w??32000,tau=r.tau??SUMMIT_FIXTURE.tau,y0=r.y0??0}={}){
  const peaks=prominence(r).filter(p=>p.prom>=300).map(p=>({...p,height:r.h[p.p],
    y:y0+(Math.floor(p.p/r.n)-(r.n-1)/2)*r.step}));
  let coreCells=0,max=-Infinity,boundViolations=0;
  const bound=maxEnvelopeM(tau,'water');
  for(let p=0;p<r.h.length;p++){
    if(Math.abs(y0+(Math.floor(p/r.n)-(r.n-1)/2)*r.step)<=.65*w)coreCells++;
    max=Math.max(max,r.h[p]);if(!Number.isFinite(r.h[p])||r.h[p]>bound)boundViolations++;
  }
  const count=peaks.filter(p=>Math.abs(p.y)<=.65*w).length,areaKm2=coreCells*r.step*r.step/1e6;
  return {count,areaKm2,density:count*1000/areaKm2,max,bound,boundViolations,samples:r.h.length,
    peaks:peaks.map(p=>({...p,inBelt:beltAt(p.y,w)>=.5}))};
}
export function poolSummits(local,wide){
  const count=local.reduce((s,r)=>s+r.count,0),areaKm2=local.reduce((s,r)=>s+r.areaKm2,0);
  const top=wide.flatMap((r,site)=>r.peaks.map(p=>({...p,site}))).sort((a,b)=>b.height-a.height||a.site-b.site||a.p-b.p).slice(0,100);
  const share=top.length?top.filter(p=>p.inBelt).length/top.length:NaN;
  // R2 is defined on the 100 highest summits: a smaller population is reported (INFO,
  // placementOfAvailable) but the CONTRACT value is NaN, so judgeM4 fails it closed.
  return {count,areaKm2,density:count*1000/areaKm2,placement:top.length===100?share:NaN,placementOfAvailable:share,
    topCount:top.length,max:Math.max(...local.concat(wide).map(r=>r.max)),
    boundViolations:local.concat(wide).reduce((s,r)=>s+r.boundViolations,0),
    samples:local.concat(wide).reduce((s,r)=>s+r.samples,0)};
}
