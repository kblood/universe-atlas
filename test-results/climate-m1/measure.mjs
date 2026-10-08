// R5-ATLAS-CLIMATE-M1 (backlog #9 BIOME2-CLIMATE, M1): before/after evidence probe.
// Measures the LIVE climate of the checkout it sits in (src/ next to this folder), so the
// same script gives the step-0 re-baseline on main 7419733 (shipped surface-climate-1.1-geo-g)
// and the after-M1 numbers (surface-climate-2). Read-only: nothing in src/ is changed.
//
// Usage: node test-results/climate-m1/measure.mjs <part ...>   parts: ela worlds site corpus zonal all
// Output: JSON lines on stdout (tee into <label>-<part>.json).
//
// Sampler: the level-0 statistic sampler (tests/helpers/statistic-level.mjs, lod-ladder-3 level 0,
// no carving), the same field the owner-decision-1 gates (terrain-relief-hypsometry) read.
// Snow 'label' = classifier name 'Alpine / polar snow' (snowFraction > 0.6 and slope <= 30,
// upDot = 1 here); 'onset' = snowFraction > 0. Eco classes use src/eco-class.ts ecoClassOf
// with Tc = coldestMonthK of the live climate and datumWarmestK = the warmest month at the
// climate datum from the live climate (same model, h = 0).
import {galaxies,sector,system,refByAddress} from '../../src/catalog.ts';
import * as SC from '../../src/surface-climate.ts';
import {biomeClassifier} from '../../src/surface-biomes.ts';
import {ecoClassOf,LEGACY_BEHAVIOUR_CLASSES,ECO_CLASS_CALIBRATION as EK} from '../../src/eco-class.ts';
import {statisticSampler} from '../../tests/helpers/statistic-level.mjs';

const parts=new Set(process.argv.slice(2));
if(parts.size===0||parts.has('all'))for(const p of ['ela','worlds','site','corpus','zonal'])parts.add(p);
const D=180/Math.PI;
const out=o=>console.log(JSON.stringify({climateVersion:SC.CLIMATE_VERSION,...o}));
const fib=(i,n)=>{const y=1-2*(i+.5)/n,p=i*2.399963229728653,r=Math.sqrt(1-y*y);return [Math.cos(p)*r,y,Math.sin(p)*r];};
const q=(a,p)=>{const s=Float64Array.from(a).sort();return s.length?s[Math.min(s.length-1,Math.floor(p*(s.length-1)+.5))]:NaN;};
const pct=(k,n)=>+(100*k/Math.max(1,n)).toFixed(1);
const r3=v=>v==null?v:+v.toFixed(3);
const ECO=['nival','arctic tundra','alpine meadow','boreal','temperate forest','temperate steppe','humid subtropical','tropical wet','savanna','hot desert','cold desert/steppe','coast','sterile hot','non-vegetated'];
/** ITCZ latitude (deg): the argmax row of the forcing's annual-mean insolation table (plan v2 R6). */
const itczLatDeg=f=>{let b=0;for(let k=1;k<f.qMean.length;k++)if(f.qMean[k]>f.qMean[b])b=k;return Math.asin(b/(f.qMean.length-1))*D;};
const latDegOf=d=>Math.asin(Math.min(1,Math.abs(d[1])))*D;

const g0=galaxies('LETHRA-001')[0];
const WORLDS={Maithea:['G001/C2128,0,1/0',1],Selawyn:['G001/C2142,3,4/0',0],Raiva:['G001/C2143,4,3/0',1],Lethuris:['G001/C2142,6,1/1',1]};
const bodyOf=name=>{const [a,i]=WORLDS[name];return system(refByAddress(g0,a)).planets[i];};

// ---------------- Earth reference ELA (label and onset) ----------------
if(parts.has('ela')){
  const f=SC.climateForcingFromParams({anchorTempK:288,obliquityRad:23.44/D,water:.7,surfaceGravityMS2:9.81,moistureSeed:1});
  const c=SC.surfaceClimate(f),s=SC.createClimateSample();
  const at=(lat,h)=>{c([Math.cos(lat/D),Math.sin(lat/D),0],h,s);return s;};
  const ela=(lat,thr)=>{if(at(lat,0).snowFraction>thr)return 0;let lo=0,hi=20000;if(!(at(lat,hi).snowFraction>thr))return null;
    for(let i=0;i<60;i++){const m=(lo+hi)/2;if(at(lat,m).snowFraction>thr)hi=m;else lo=m;}return Math.round(hi);};
  const rows=[0,15,30,45,60,70,78,85].map(lat=>({lat,label:ela(lat,.6),onset:ela(lat,0),datumTa:r3(at(lat,0).annualMeanTempK),datumHalf:r3(s.seasonalHalfRangeK),datumPdd:s.pdd===undefined?null:Math.round(s.pdd)}));
  out({part:'ela',lapseKPerKm:+(f.lapseKPerM*1000).toFixed(4),itczDeg:itczLatDeg(f),targets:{0:'>=4450',45:'2700-3100',60:'1200-1700',70:'550-1000',78:'250-650'},rows});
}

// ---------------- zonal curves (Earth reference + 4 worlds) ----------------
if(parts.has('zonal')){
  const N=+(process.env.ZN||40000);
  const curve=(f,label,useLand,body)=>{
    const c=SC.surfaceClimate(f),s=SC.createClimateSample(),ts=useLand?statisticSampler(body):null;
    const bins=Array.from({length:18},()=>({n:0,eff:0,P:0,PET:0,belt:0}));
    for(let i=0;i<N;i++){const d=fib(i,N);let h=0;if(ts){const t=ts(d);if(t.ocean)continue;h=t.groundHeightM;}
      c(d,h,s);const b=bins[Math.min(17,Math.floor(latDegOf(d)/5))];b.n++;b.eff+=s.effectiveMoisture;b.belt+=s.dryBelt01;
      if(s.precipMm!==undefined){b.P+=s.precipMm;b.PET+=s.petMm;}}
    return {label,itczDeg:+itczLatDeg(f).toFixed(1),bins:bins.map((b,k)=>({lat:`${k*5}-${k*5+5}`,n:b.n,effM:b.n?r3(b.eff/b.n):null,dryBelt01:b.n?r3(b.belt/b.n):null,
      P:b.n&&b.P?Math.round(b.P/b.n):null,PET:b.n&&b.PET?Math.round(b.PET/b.n):null}))};
  };
  out({part:'zonal',...curve(SC.climateForcingFromParams({anchorTempK:288,obliquityRad:23.44/D,water:.7,surfaceGravityMS2:9.81,moistureSeed:1}),'Earth reference (all directions, h=0)',false)});
  out({part:'zonal',...curve(SC.climateForcingFromParams({anchorTempK:288,obliquityRad:70/D,water:.7,surfaceGravityMS2:9.81,moistureSeed:1}),'synthetic 70 deg (all directions, h=0)',false)});
  for(const name of Object.keys(WORLDS)){const b=bodyOf(name);out({part:'zonal',...curve(SC.climateForcingFor(b),name+' (land, ground height)',true,b)});}
}

// ---------------- worlds (60k Fibonacci directions) ----------------
function worldStats(body,N){
  const ts=statisticSampler(body),f=SC.climateForcingFor(body),c=SC.surfaceClimate(f),cl=biomeClassifier(body);
  const s=SC.createClimateSample(),s0=SC.createClimateSample();
  const H=[],eff=[];const eco=new Array(14).fill(0);
  const k={land:0,label:0,onset:0,tundra:0,tw316:0,forestPot:0,f05:0,fHot:0,hotForestClass:0,rangeHi:0,rangeHiSnow:0,low:0,lowSnow:0};
  let twMax=-1;
  for(let i=0;i<N;i++){
    const d=fib(i,N),t=ts(d);if(t.ocean)continue;k.land++;
    const h=t.groundHeightM;H.push(h);
    const b=cl(d,h,1);c(d,h,s);c(d,0,s0);
    const isSnow=b.name==='Alpine / polar snow';
    k.label+=isSnow;k.onset+=b.snowFraction>0;
    k.tundra+=!(b.snowFraction>.6)&&s.warmestMonthK>=273.15&&s.warmestMonthK<283.15;
    k.tw316+=s.warmestMonthK>316;if(s.warmestMonthK>twMax)twMax=s.warmestMonthK;
    k.forestPot+=b.forestPotential;k.f05+=s.forestSuitability01>.5;
    k.fHot+=s.warmestMonthK>=316&&s.forestSuitability01>0;
    if(h>3000&&Math.abs(d[1])<.866){k.rangeHi++;k.rangeHiSnow+=isSnow;}
    if(h<1500&&Math.abs(d[1])<.866){k.low++;k.lowSnow+=isSnow;}
    eff.push(s.effectiveMoisture);
    const e=ecoClassOf(s.annualMeanTempK,s.warmestMonthK,s.coldestMonthK,s.effectiveMoisture,b.snowFraction,h,b.weights[0],s0.warmestMonthK,true);
    eco[e]++;if(s.warmestMonthK>=316&&(e===3||e===4||e===6||e===7))k.hotForestClass++;
  }
  const L=k.land;
  return {name:body.name,id:body.id,T:body.temperatureK,lapseKPerKm:+(f.lapseKPerM*1000).toFixed(2),oblDeg:+(f.obliquityRad*D).toFixed(1),itczDeg:+itczLatDeg(f).toFixed(1),
    N,landPct:pct(L,N),landH:{p10:Math.round(q(H,.1)),p50:Math.round(q(H,.5)),p90:Math.round(q(H,.9)),p99:Math.round(q(H,.99)),max:Math.round(q(H,1))},
    snowLabelPct:pct(k.label,L),snowOnsetPct:pct(k.onset,L),rangeSnowAbove3kmLt60Pct:pct(k.rangeHiSnow,k.rangeHi),lowSnowBelow1500Lt60Pct:pct(k.lowSnow,k.low),
    tundraPct:pct(k.tundra,L),twGt316Pct:pct(k.tw316,L),twMaxK:+twMax.toFixed(1),
    forestPotentialPct:pct(k.forestPot,L),forestSuit05Pct:pct(k.f05,L),landTwGe316WithForestSuitGt0:k.fHot,
    effM_p10_p50_p90:[.1,.5,.9].map(p=>r3(q(eff,p))),
    ecoClassPct:Object.fromEntries(eco.map((v,i)=>[i+' '+ECO[i],pct(v,L)]).filter(([,v])=>v>0)),
    forestClassWithTwGe316Pct:pct(k.hotForestClass,L)};
}
if(parts.has('worlds')){
  const N=+(process.env.N||60000);
  for(const name of Object.keys(WORLDS))out({part:'worlds',...worldStats(bodyOf(name),N)});
}

// ---------------- SITE_A (complete SITE_RULE + eco class + Tc margin) ----------------
if(parts.has('site')){
  const {harnessWorld,evaluateSite,offsetDirection}=await import('../../tests/helpers/harness-site-search.mjs');
  const HS=await import('../../tests/harness-sites.mjs');
  const world=harnessWorld();
  const f=SC.climateForcingFor(world.body),c=SC.surfaceClimate(f),s=SC.createClimateSample(),s0=SC.createClimateSample();
  const at=d=>{const h=world.sample(d).groundHeightM,b=world.classify(d,h,1);c(d,h-world.sea,s);c(d,0,s0);
    const e=ecoClassOf(s.annualMeanTempK,s.warmestMonthK,s.coldestMonthK,s.effectiveMoisture,b.snowFraction,h-world.sea,b.weights[0],s0.warmestMonthK,true);
    return {h:+h.toFixed(1),name:b.name,forestPotential:b.forestPotential,Ta:r3(s.annualMeanTempK),Tw:r3(s.warmestMonthK),Tc:r3(s.coldestMonthK),effM:r3(s.effectiveMoisture),
      eco:e,tcMarginK:r3(Math.min(EK.TROPICAL_COLDEST_K-s.coldestMonthK,s.coldestMonthK-EK.BOREAL_COLDEST_K)),latDeg:+latDegOf(d).toFixed(2)};};
  const report=(label,dir)=>{
    const centre=at(dir),rule=evaluateSite(world,dir),rings={};
    for(const R of HS.SITE_RULE.ringsM){const pts=[];for(let i=0;i<HS.SITE_RULE.ringSamples;i++){const a=2*Math.PI*i/HS.SITE_RULE.ringSamples;pts.push(at(offsetDirection(world,dir,R*Math.cos(a),R*Math.sin(a))));}
      const cls={};for(const p of pts)cls[p.eco]=(cls[p.eco]||0)+1;
      rings[R]={classes:cls,inLegacy:pts.filter(p=>LEGACY_BEHAVIOUR_CLASSES.has(p.eco)).length,minTcMarginK:Math.min(...pts.map(p=>p.tcMarginK)),effM:[Math.min(...pts.map(p=>p.effM)),Math.max(...pts.map(p=>p.effM))]};}
    out({part:'site',label,SITE_RULE:HS.SITE_RULE,centre,siteRule:rule,rings});
  };
  report('SITE_A',HS.SITE_A);
  if(HS.SITE_A_PRE_CLIMATE2)report('SITE_A_PRE_CLIMATE2',HS.SITE_A_PRE_CLIMATE2);
}

// ---------------- 721 corpus (W0-CLIMATE definition) ----------------
function corpusRow(b,N){
  const ts=statisticSampler(b),f=SC.climateForcingFor(b),c=SC.surfaceClimate(f),cl=biomeClassifier(b),s=SC.createClimateSample();
  const itcz=itczLatDeg(f),near=[0,0],sub=[0,0];
  let land=0,label=0,onset=0,tw316=0,f05=0,fHot=0;
  for(let i=0;i<N;i++){
    const d=fib(i,N),t=ts(d);if(t.ocean)continue;land++;
    const h=t.groundHeightM,bb=cl(d,h,1);c(d,h,s);
    const dI=Math.abs(latDegOf(d)-itcz);
    if(dI<=10){near[0]++;near[1]+=s.effectiveMoisture;}else if(dI>=18&&dI<=35){sub[0]++;sub[1]+=s.effectiveMoisture;}
    label+=bb.name==='Alpine / polar snow';onset+=bb.snowFraction>0;tw316+=s.warmestMonthK>316;f05+=s.forestSuitability01>.5;fHot+=s.warmestMonthK>=316&&s.forestSuitability01>0;
  }
  return {id:b.id,T:b.temperatureK,oblDeg:+(f.obliquityRad*D).toFixed(3),itczDeg:+itcz.toFixed(2),landShare:pct(land,N),
    nNear:near[0],nSub:sub[0],effNear:near[0]?near[1]/near[0]:null,effSub:sub[0]?sub[1]/sub[0]:null,
    snowLabel:pct(label,land),snowOnset:pct(onset,land),tw316:pct(tw316,land),forest05:pct(f05,land),hotForest:fHot};
}
if(parts.has('corpus')){
  const N=+(process.env.CN||8000),t0=performance.now();
  const corpus=[];let systems=0;
  for(let sx=266;systems<2000;sx++)for(const ref of sector(g0,[sx,0,0]).refs){if(systems>=2000)break;systems++;for(const b of system(ref).planets)if(SC.temperateHabitat(b))corpus.push(b);}
  const rows=corpus.map(b=>corpusRow(b,N)).filter(r=>r.landShare>=1);
  const dist=k=>Object.fromEntries([.1,.25,.5,.75,.9].map(p=>['p'+Math.round(p*100),+q(rows.map(r=>r[k]),p).toFixed(1)]));
  const polar=rows.filter(r=>r.itczDeg>45),judged=polar.filter(r=>r.nNear>=50&&r.nSub>=50),fails=judged.filter(r=>!(r.effNear>=r.effSub));
  out({part:'corpus721',n:rows.length,eligibleBodies:corpus.length,systems,samplesPerBody:N,
    snowLabel:dist('snowLabel'),snowOnset:dist('snowOnset'),snowLabelOver90Pct:pct(rows.filter(r=>r.snowLabel>90).length,rows.length),snowLabelOver90Count:rows.filter(r=>r.snowLabel>90).length,
    tw316:dist('tw316'),planetsTw316Over5Pct:rows.filter(r=>r.tw316>5).length,forest05:dist('forest05'),
    landTwGe316WithForestSuitGt0:rows.reduce((a,r)=>a+r.hotForest,0),
    effectiveObliquityOver54:rows.filter(r=>r.oblDeg>54).length,
    polarItcz:{selected:polar.length,judged:judged.length,thinOrEmpty:polar.length-judged.length,nearGeSub:judged.length-fails.length,
      fails:fails.map(r=>({id:r.id,effNear:r3(r.effNear),effSub:r3(r.effSub),nNear:r.nNear,nSub:r.nSub})),
      thinIds:polar.filter(r=>!(r.nNear>=50&&r.nSub>=50)).map(r=>({id:r.id,nNear:r.nNear,nSub:r.nSub}))},
    ms:Math.round(performance.now()-t0)});
  if(process.env.ROWS)for(const r of rows)out({part:'corpus721-row',...r});
}
