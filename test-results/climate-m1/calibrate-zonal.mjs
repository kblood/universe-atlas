// R5-ATLAS-CLIMATE-M1 step 5/6 calibration scan (plain JS, Math.* allowed in a probe; NOT shipped code).
// Evaluates the planned PET effective moisture with the ITCZ zonal band on the Earth reference
// (288 K, 23.44 deg, water 0.7, g 9.81) at the datum (h = 0; the reference has no terrain, so the
// 'land zonal mean' is the mean over all directions of each latitude band, noise included) and scans
// the zonal band amplitudes/widths and PET_MIN against the plan targets (v1 P1 step 6):
//   P(15-35) <= 0.55 P(0-10); P(45-60) >= 1.2 P(15-35); P(>75) < 0.35 P(0-10);
//   effM(0-10) >= 0.6; effM(18-32) <= 0.40; effM(45-60) in 0.45-0.65.
// The only inputs are the Earth targets: no catalogue planet, SITE_A or corpus number is used.
// Usage: node test-results/climate-m1/calibrate-zonal.mjs [--eval a1,a2,a3,a4,w1,w2,w3,w4,petMin]
import * as SC from '../../src/surface-climate.ts';
const D=180/Math.PI,N=+(process.env.N||20000);
const fib=(i,n)=>{const y=1-2*(i+.5)/n,p=i*2.399963229728653,r=Math.sqrt(1-y*y);return [Math.cos(p)*r,y,Math.sin(p)*r];};
const f=SC.climateForcingFromParams({anchorTempK:288,obliquityRad:23.44/D,water:.7,surfaceGravityMS2:9.81,moistureSeed:1});
const c=SC.surfaceClimate(f),s=SC.createClimateSample();
// Precompute per-direction inputs from the shipped field at h=0: annual, half (no ceiling on Earth), noise, |lat|.
const rows=[];
for(let i=0;i<N;i++){const d=fib(i,N);c(d,0,s);rows.push({lat:Math.asin(Math.abs(d[1]))*D,annual:s.annualMeanTempK,half:s.seasonalHalfRangeK,m:s.legacyMoisture});}
const H=v=>v<=-1?0:v>=1?v:(Math.sqrt(1-v*v)+v*Math.acos(-v))/Math.PI;
const pddAbove=(thr,mu,A)=>A<1e-9?Math.max(0,mu-thr)*365.25:365.25*A*H((mu-thr)/A);
const g=(x,w)=>Math.exp(-(x/w)*(x/w));
function evalParams([a1,a2,a3,a4,w1,w2,w3,w4,petMin],centres=[50,28,88]){
  const Z=dI=>1+a1*g(dI,w1)+a2*g(dI-centres[0],w2)-a3*g(dI-centres[1],w3)-a4*g(dI-centres[2],w4);
  const band=(lo,hi)=>({n:0,P:0,eff:0,lo,hi});
  const B={itcz:band(0,10),sub:band(15,35),dry:band(18,32),mid:band(45,60),pol:band(75,90.1)};
  let zMin=1e9;
  for(const r of rows){
    const mu=r.annual-273.15,pdd0=pddAbove(0,mu,r.half),pdd30=pddAbove(30,mu,r.half);
    const PET=Math.max(petMin,58.93*(pdd0-pdd30)/365.25);
    const z=Z(r.lat);if(z<zMin)zMin=z;
    const P=1000*Math.min(1.2,Math.max(.2,.7/.7))*Math.max(.2,1+.025*(r.annual-288))*z*(.4+1.2*r.m);
    const AI=P/PET,eff=AI/(AI+.6);
    for(const b of Object.values(B))if(r.lat>=b.lo&&r.lat<b.hi){b.n++;b.P+=P;b.eff+=eff;}
  }
  const m=k=>({P:B[k].P/B[k].n,eff:B[k].eff/B[k].n});
  const it=m('itcz'),sub=m('sub'),dry=m('dry'),mid=m('mid'),pol=m('pol');
  const t={subOverItcz:sub.P/it.P,midOverSub:mid.P/sub.P,polOverItcz:pol.P/it.P,effItcz:it.eff,effDry:dry.eff,effMid:mid.eff,zMin};
  // Margins (>= 0 passes): each target as a signed distance.
  const margins=[.55-t.subOverItcz,t.midOverSub-1.2,.35-t.polOverItcz,t.effItcz-.6,.40-t.effDry,t.effMid-.45,.65-t.effMid];
  return {t,margins,minMargin:Math.min(...margins)};
}
const args=process.argv.slice(2);
if(args[0]==='--eval'){const p=args[1].split(',').map(Number);console.log(JSON.stringify(evalParams(p)));process.exit(0);}
const start=[.9,.6,.55,.4,10,12,9,12,120];
console.log(JSON.stringify({part:'start (v1 starting band)',params:start,...evalParams(start)}));
// Scan: amplitudes and PET_MIN on a grid, widths fixed to the v1 starting widths first, then +-.
let best=null;const cand=[];
for(const a1 of [.6,.8,.9,1,1.2,1.4])for(const a2 of [0,.2,.3,.4,.5,.6])for(const a3 of [.55,.6,.65,.7,.75,.8])for(const a4 of [.4,.5,.6,.7])
for(const w3 of [9,10,12])for(const petMin of [120,200,300]){
  const p=[a1,a2,a3,a4,10,12,w3,12,petMin],r=evalParams(p);
  // Distance from the starting band (prefer the smallest change that meets every target with margin).
  const dist=Math.abs(a1-.9)+Math.abs(a2-.6)+Math.abs(a3-.55)+Math.abs(a4-.4)+Math.abs(w3-9)/10+Math.abs(petMin-120)/400;
  cand.push({p,r,dist});
}
const passing=cand.filter(x=>x.r.minMargin>=.02&&x.r.t.zMin>.15).sort((a,b)=>a.dist-b.dist);
console.log(JSON.stringify({part:'scan',scanned:cand.length,passingWithMargin002:passing.length}));
for(const x of passing.slice(0,12))console.log(JSON.stringify({params:x.p,dist:+x.dist.toFixed(3),t:Object.fromEntries(Object.entries(x.r.t).map(([k,v])=>[k,+v.toFixed(3)])),minMargin:+x.r.minMargin.toFixed(3)}));
