// R5-ATLAS-CLIMATE-M1 step 6 calibration, round 2 (plain JS probe, Math.* allowed; NOT shipped code).
//
// Round 1 (calibrate-zonal.mjs, output calibrate-zonal.out.jsonl) scanned the zonal band amplitudes,
// the subsidence width and PET_MIN with the precipitation scale fixed at 1000 mm: 0 of 7776 candidates
// met the v1 P1 step-6 Earth targets. The reason is structural: with Z = 1 + (bumps) the mid-latitude
// band keeps Z >= ~1, and at 1000 mm its aridity index (P / Holdridge PET ~450 mm) is ~1.6-2,
// i.e. effM ~0.75-0.8, above the 0.45-0.65 target, while the 1.2x P(45-60)/P(15-35) target forbids
// lowering it by a mid-latitude dip. Round 2 therefore also scans the precipitation scale P_REF_MM
// (the one number that sets P against PET) and the widths, and keeps the formula of plan v1 step 5/6.
//
// Inputs: ONLY the Earth reference (288 K, 23.44 deg, water 0.7, g 9.81, h = 0, all directions,
// noise included). No catalogue planet, SITE_A or corpus number is used. The live climate supplies
// annual mean, half-range (after the step-3 ceiling) and legacy noise per direction.
// Targets (v1 plan P1 step 6): P(15-35) <= 0.55 P(0-10); P(45-60) >= 1.2 P(15-35); P(>75) < 0.35 P(0-10);
// effM(0-10) >= 0.6; effM(18-32) <= 0.40; effM(45-60) in 0.45-0.65. Margin required: >= 0.02 each.
// Choice rule: among passing candidates, the one closest to the plan's starting band
// (a = 0.9, 0.6, 0.55, 0.4; w = 10, 12, 9, 12; PET_MIN 120; P_REF 1000).
// Usage: node test-results/climate-m1/calibrate-zonal-2.mjs [--eval a1,a2,a3,a4,w1,w2,w3,w4,petMin,pRef]
import * as SC from '../../src/surface-climate.ts';
const D=180/Math.PI,N=+(process.env.N||20000);
const fib=(i,n)=>{const y=1-2*(i+.5)/n,p=i*2.399963229728653,r=Math.sqrt(1-y*y);return [Math.cos(p)*r,y,Math.sin(p)*r];};
const f=SC.climateForcingFromParams({anchorTempK:288,obliquityRad:23.44/D,water:.7,surfaceGravityMS2:9.81,moistureSeed:1});
const c=SC.surfaceClimate(f),s=SC.createClimateSample();
const H=v=>v<=-1?0:v>=1?v:(Math.sqrt(1-v*v)+v*Math.acos(-v))/Math.PI;
const dd=(thr,mu,A)=>A<1e-9?Math.max(0,mu-thr)*365.25:365.25*A*H((mu-thr)/A);
// Per-direction, parameter-free precomputation: |lat|, biotemp PET (unfloored), P without Z and scale.
const lat=new Float64Array(N),petRaw=new Float64Array(N),pBase=new Float64Array(N);
for(let i=0;i<N;i++){
  const d=fib(i,N);c(d,0,s);
  const mu=s.annualMeanTempK-273.15,A=s.seasonalHalfRangeK;
  lat[i]=Math.asin(Math.abs(d[1]))*D;
  petRaw[i]=58.93*(dd(0,mu,A)-dd(30,mu,A))/365.25;
  pBase[i]=Math.min(1.2,Math.max(.2,.7/.7))*Math.max(.2,1+.025*(s.annualMeanTempK-288))*(.4+1.2*s.legacyMoisture);
}
const g=(x,w)=>Math.exp(-(x/w)*(x/w));
const BANDS={itcz:[0,10],sub:[15,35],dry:[18,32],mid:[45,60],pol:[75,90.1]};
function evalParams([a1,a2,a3,a4,w1,w2,w3,w4,petMin,pRef]){
  const acc={};for(const k in BANDS)acc[k]={n:0,P:0,eff:0};
  let zMin=1e9;
  for(let i=0;i<N;i++){
    const x=lat[i],z=1+a1*g(x,w1)+a2*g(x-50,w2)-a3*g(x-28,w3)-a4*g(x-88,w4);if(z<zMin)zMin=z;
    const P=pRef*pBase[i]*z,PET=Math.max(petMin,petRaw[i]),AI=P/PET,eff=AI/(AI+.6);
    for(const k in BANDS){const [lo,hi]=BANDS[k];if(x>=lo&&x<hi){acc[k].n++;acc[k].P+=P;acc[k].eff+=eff;}}
  }
  const m=k=>({P:acc[k].P/acc[k].n,eff:acc[k].eff/acc[k].n});
  const it=m('itcz'),sub=m('sub'),dry=m('dry'),mid=m('mid'),pol=m('pol');
  const t={subOverItcz:sub.P/it.P,midOverSub:mid.P/sub.P,polOverItcz:pol.P/it.P,effItcz:it.eff,effDry:dry.eff,effMid:mid.eff,zMin};
  const margins=[.55-t.subOverItcz,t.midOverSub-1.2,.35-t.polOverItcz,t.effItcz-.6,.40-t.effDry,t.effMid-.45,.65-t.effMid];
  return {t,margins,minMargin:Math.min(...margins)};
}
const START=[.9,.6,.55,.4,10,12,9,12,120,1000];
const dist=p=>Math.abs(p[0]-.9)+Math.abs(p[1]-.6)+Math.abs(p[2]-.55)+Math.abs(p[3]-.4)
  +(Math.abs(p[4]-10)+Math.abs(p[5]-12)+Math.abs(p[6]-9)+Math.abs(p[7]-12))/10+Math.abs(p[8]-120)/400+Math.abs(p[9]-1000)/500;
const args=process.argv.slice(2);
if(args[0]==='--eval'){const p=args[1].split(',').map(Number);console.log(JSON.stringify({params:p,dist:+dist(p).toFixed(3),...evalParams(p)}));process.exit(0);}
console.log(JSON.stringify({part:'start',params:START,...evalParams(START)}));
const cand=[];
if(args[0]==='--fine'){
  // Round 2b: the coarse grid's best margin is 0.006 (ITCZ effM vs mid-latitude effM pull against each other);
  // widen the ITCZ peak (a1, w1) and the subsidence (a3, w3) around it, a2 0..0.3, a4 0.4, PET_MIN 120.
  for(const pRef of [600,625,650,675,700,725,750,775,800])for(const a1 of [1,1.2,1.4,1.6,1.8,2])for(const w1 of [10,12,14])for(const a2 of [0,.1,.2,.3])
  for(const a3 of [.6,.7,.75,.8,.85])for(const w3 of [10,12,14,16]){
    const p=[a1,a2,a3,.4,w1,12,w3,12,120,pRef],r=evalParams(p);cand.push({p,r,dist:dist(p)});
  }
}else
for(const pRef of [400,450,500,550,600,650,700,750,800,900,1000])for(const a1 of [.6,.8,.9,1,1.2])for(const a2 of [0,.2,.4,.6])
for(const a3 of [.45,.55,.65,.75])for(const a4 of [.2,.4,.6])for(const w3 of [9,12,15])for(const petMin of [120,200]){
  const p=[a1,a2,a3,a4,10,12,w3,12,petMin,pRef],r=evalParams(p);cand.push({p,r,dist:dist(p)});
}
const MARGIN=+(process.env.MARGIN||.02);
const passing=cand.filter(x=>x.r.minMargin>=MARGIN&&x.r.t.zMin>.15).sort((a,b)=>a.dist-b.dist);
console.log(JSON.stringify({part:'scan',mode:args[0]||'coarse',margin:MARGIN,scanned:cand.length,passing:passing.length}));
const r3=v=>+v.toFixed(3);
for(const x of passing.slice(0,15))console.log(JSON.stringify({part:'pass',params:x.p,dist:r3(x.dist),t:Object.fromEntries(Object.entries(x.r.t).map(([k,v])=>[k,r3(v)])),minMargin:r3(x.r.minMargin)}));
// Best by margin too (most robust), for the record.
const robust=[...cand].sort((a,b)=>b.r.minMargin-a.r.minMargin).slice(0,5);
for(const x of robust)console.log(JSON.stringify({part:'robust',params:x.p,dist:r3(x.dist),t:Object.fromEntries(Object.entries(x.r.t).map(([k,v])=>[k,r3(v)])),minMargin:r3(x.r.minMargin)}));
