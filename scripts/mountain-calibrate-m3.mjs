// M3 row calibration (owner decision (a), 2026-10-05): measures the calibrated pit row and axis
// coherence row, plus all eight current rows and the superseded rows, on pre-registered positive and
// negative controls, then derives the coherence bounds by the pre-registered midpoint rule and checks
// them against MOUNTAIN_THRESHOLDS. Candidates are measured as INFO only and never enter the rule.
//   node scripts/mountain-calibrate-m3.mjs [--jobs 4] [--out test-results/mountains/M3-r5/calibration]
//   node scripts/mountain-calibrate-m3.mjs --field <name>     (one field, JSON on stdout)
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {measureSites,judgeM3,depressionPits,depressions,q,MOUNTAIN_THRESHOLDS,MOUNTAIN_THRESHOLDS_SUPERSEDED,syntheticSampler} from '../tests/helpers/mountain-metrics.mjs';
import {RAMP,steadyStateStrip,stripSampler,noiseCarveSampler,loadRejectedA0,rampCarvingSampler,resampledErodedControl,RESAMPLE_OFFSETS,CALIBRATION_CONTROLS_VERSION} from '../tests/helpers/mountain-calibration-controls.mjs';
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:d;};
const SITES=Array.from({length:8},(_,k)=>({d:[Math.cos(k*1e6/RAMP.R),0,Math.sin(k*1e6/RAMP.R)]}));
const OFF=[37,53];
// class: P = physically eroded positive, Niso = isotropic negative, Nstraight = straight fan/comb
// negative, Npit = pit-only negative, I = candidate INFO (never used by the rule). pitNeg marks the
// pit-row negatives (noise relief); the smooth dome is a coherence negative only (it legitimately
// drains: MTN-0 requires it to PASS the drainage rows).
const ss=(o,off)=>async()=>stripSampler(steadyStateStrip(o),off?{offx:OFF[0],offy:OFF[1]}:{});
export const FIELDS={
  'ss-uniform-s1':{cls:'P',make:ss({uplift:'uniform',seed:1})},
  'ss-uniform-s2':{cls:'P',make:ss({uplift:'uniform',seed:2})},
  'ss-uniform-s3':{cls:'P',make:ss({uplift:'uniform',seed:3})},
  'ss-uniform-s4':{cls:'P',make:ss({uplift:'uniform',seed:4})},
  'ss-uniform-s1-off':{cls:'P',make:ss({uplift:'uniform',seed:1},true)},
  'ss-uniform-sc09-s1':{cls:'P',make:ss({uplift:'uniform',seed:1,sc:.9})},
  'ss-uniform-125m-s1-off':{cls:'P',make:ss({uplift:'uniform',seed:1,step:125},true)},
  'ss-envelope-s1':{cls:'P',make:ss({uplift:'envelope',seed:1})},
  'ss-envelope-s2':{cls:'P',make:ss({uplift:'envelope',seed:2})},
  'ss-envelope-s3':{cls:'P',make:ss({uplift:'envelope',seed:3})},
  'ss-envelope-s1-off':{cls:'P',make:ss({uplift:'envelope',seed:1},true)},
  'ss-envelope-sc09-s1':{cls:'P',make:ss({uplift:'envelope',seed:1,sc:.9})},
  'eroded-resampled':{cls:'P',raster:'eroded'},
  'alpine':{cls:'Niso',pitNeg:true,make:async()=>syntheticSampler(RAMP.R,'alpine')},
  'dome':{cls:'Niso',make:async()=>syntheticSampler(RAMP.R,'dome')},
  'noiseCarve':{cls:'Niso',pitNeg:true,make:async()=>noiseCarveSampler()},
  'A0':{cls:'Nstraight',make:async()=>rampCarvingSampler((await loadRejectedA0()).carvingAM)},
  'B0':{cls:'Nstraight',make:async()=>rampCarvingSampler((await loadRejectedA0()).carvingBM)},
  'uneroded-resampled':{cls:'Npit',pitNeg:true,raster:'original'},
  'envelope-only':{cls:'I',make:async()=>rampCarvingSampler(()=>0)},
  'A2':{cls:'I',make:async()=>rampCarvingSampler((await import('../src/mountain-carving.ts')).carvingAM)},
  'B':{cls:'I',make:async()=>rampCarvingSampler((await import('../src/mountain-carving.ts')).carvingBM)},
  'C':{cls:'I',make:async()=>rampCarvingSampler((await import('../src/mountain-carving.ts')).carvingCM)},
};

async function measureField(name){const f=FIELDS[name];if(!f)throw new Error('unknown field '+name);const t=performance.now();
  if(f.raster){const per=[];
    for(let s=0;s<4;s++)for(const off of RESAMPLE_OFFSETS){const r=resampledErodedControl(s,off,f.raster),p=depressionPits(r),d=depressions(r);
      per.push({site:s,off,pits025:p.pitsPer1000km2,allPits:p.allPitsPer1000km2,fill10:d.fill10Share});}
    return {name,cls:f.cls,pitNeg:!!f.pitNeg,rows:{pits025Per1000km2P50:Math.round(q(per.map(p=>p.pits025),.5)*10)/10,pitsPer1000km2P50:Math.round(q(per.map(p=>p.allPits),.5)*10)/10,fill10ShareP50:Math.round(q(per.map(p=>p.fill10),.5)*1000)/1000},per,seconds:(performance.now()-t)/1000};}
  const ts=await f.make(),met=measureSites(ts,SITES,RAMP.R);
  const rows=Object.fromEntries(judgeM3(met).map(r=>[r.id,r.actual]));
  const flat={...met.E3b_drainage,...met.E1_layout};for(const r of MOUNTAIN_THRESHOLDS_SUPERSEDED)rows[r.id]=flat[r.id];
  return {name,cls:f.cls,pitNeg:!!f.pitNeg,rows,seconds:(performance.now()-t)/1000};}

const r2=v=>Math.round(v*100)/100;
/** Pre-registered rule. Coherence: lo = midpoint(min positive, max isotropic negative), hi =
 * midpoint(max positive, min straight negative), rounded to 0.01. Pits: the bound stays 50; every
 * positive must pass it and every noise-relief negative (pitNeg) must fail it. */
export function deriveRule(results){const by=c=>results.filter(r=>r.cls===c);
  const coh=r=>r.rows.axisCoherence40kmP50,P=by('P').filter(r=>Number.isFinite(coh(r)));
  const minP=Math.min(...P.map(coh)),maxP=Math.max(...P.map(coh)),maxIso=Math.max(...by('Niso').map(coh)),minStr=Math.min(...by('Nstraight').map(coh));
  const pit=r=>r.rows.pits025Per1000km2P50;
  return {coherence:{minPositive:minP,maxPositive:maxP,maxIsotropicNegative:maxIso,minStraightNegative:minStr,lo:r2((minP+maxIso)/2),hi:r2((maxP+minStr)/2),separable:maxIso<minP&&maxP<minStr},
    pits:{bound:50,maxPositive:Math.max(...by('P').map(pit)),minNegative:Math.min(...results.filter(r=>r.pitNeg).map(pit)),
      separable:Math.max(...by('P').map(pit))<=50&&Math.min(...results.filter(r=>r.pitNeg).map(pit))>50}};}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const one=arg('field',null);
  if(one){console.log(JSON.stringify(await measureField(one)));}
  else{const out=arg('out','test-results/mountains/M3-r5/calibration'),jobs=+arg('jobs',4),names=Object.keys(FIELDS),results=[];mkdirSync(out,{recursive:true});
    let next=0,failed=0;const self=fileURLToPath(import.meta.url);
    const run=()=>new Promise(res=>{const loop=()=>{if(next>=names.length)return res();const n=names[next++];let so='',se='';
      const p=spawn(process.execPath,[self,'--field',n]);p.stdout.on('data',d=>so+=d);p.stderr.on('data',d=>se+=d);
      p.on('close',code=>{if(code){failed++;console.error(n,'exit',code,se.slice(-2000));}else{const r=JSON.parse(so.trim().split('\n').pop());results.push(r);console.error(n,r.cls,JSON.stringify(r.rows),r.seconds.toFixed(1)+'s');}loop();});};loop();});
    await Promise.all(Array.from({length:jobs},run));
    results.sort((a,b)=>names.indexOf(a.name)-names.indexOf(b.name));
    const rule=deriveRule(results),frozen=Object.fromEntries(MOUNTAIN_THRESHOLDS.map(r=>[r.id,r.value]));
    const agrees=JSON.stringify(frozen.axisCoherence40kmP50)===JSON.stringify([rule.coherence.lo,rule.coherence.hi])&&frozen.pits025Per1000km2P50===rule.pits.bound;
    const evidence={version:CALIBRATION_CONTROLS_VERSION,date:'2026-10-05',offsetM:OFF,rule,frozenRows:frozen,ruleAgreesWithFrozenRows:agrees,
      judged:Object.fromEntries(results.filter(r=>!r.name.endsWith('resampled')).map(r=>[r.name,Object.fromEntries(judgeM3(r.rows).map(j=>[j.id,j.pass]))])),results};
    writeFileSync(out+'/calibration.json',JSON.stringify(evidence,null,1));
    console.log(JSON.stringify({rule,agrees,failed}));
    process.exitCode=failed||!agrees||!rule.coherence.separable||!rule.pits.separable?1:0;}
}
