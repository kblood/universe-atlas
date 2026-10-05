// Node-only M1 integration. Run: node scripts/mountain-render.mjs layout
import {mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {galaxies,sector,system,hash64,noise} from '../src/catalog.ts';
import {RELIEF_CALIBRATION,reliefLayersSampler} from '../src/terrain.ts';
import {orogenLayout,buildOrogenLayout,continentalA0,OROGEN_LAYOUT_VERSION,OROGEN_LAYOUT} from '../src/mountain-layout.ts';
import {waterWorlds,fib} from '../tests/terrain-climate-fixtures.mjs';
import {layoutMap,layoutCoherence,layoutDistanceAccuracy,layoutCurvature,coastSafety,judgeLayout,LAYOUT_THRESHOLDS} from '../tests/helpers/mountain-layout-metrics.mjs';
import {writePng} from '../tests/helpers/mountain-metrics.mjs';

if(process.argv[2]!=='layout')throw new Error('Usage: node scripts/mountain-render.mjs layout');
const start=performance.now(),worlds=waterWorlds(),refs=[];
for(const g of galaxies('LETHRA-GOLDEN-001').slice(0,3))
  for(const c of [[266,0,0],[0,0,0],[-2,-1,-2],[12,-4,7]])refs.push(...sector(g,c).refs);
const all=refs.slice(0,220).map(system).flatMap(s=>[...s.planets,...s.moons]),pick=[];
for(const type of [...new Set(all.map(b=>b.type))])pick.push(...all.filter(b=>b.type===type).slice(0,10));
// The four worlds AND 60 corpus bodies (10 per catalogue type, worlds excluded): 64 bodies.
const corpus=pick.filter(b=>!worlds.some(w=>w.id===b.id)).slice(0,60);
if(corpus.length!==60)throw new Error('Corpus selection did not produce 60 bodies');
const bodies=[...worlds,...corpus];
const dir='test-results/mountains/M1';mkdirSync(dir,{recursive:true});
const rows=[];
let distanceAccuracy;
console.log('World | R km | land % | belt % | >=.5 % | main % | large | min aspect | coherence | coast | build ms | result');
for(const body of bodies){
  const t=performance.now(),layout=orogenLayout(body),constructionMs=performance.now()-t,a0=continentalA0(body);
  const out={belt:0,axis:[0,0,0],axisDistanceM:0,halfWidthM:0,beltIndex:-1};
  const sample=d=>layout.sample(d,out).belt;
  let row={name:body.name,id:body.id,seed:body.seed,type:body.type,radiusM:body.radiusM,constructionMs,beltCount:layout.belts.length,majorCount:layout.belts.filter(b=>b.rank==='major').length};
  if(body.type==='Gas giant'){
    let nonzeroSamples=0;for(let i=0;i<20000;i++)if(sample(fib(i,20000))!==0)nonzeroSamples++;
    row={...row,gas:true,landShare:null,beltShare:null,coreShare:null,mainShare:null,components:[],minAspect:null,coherenceP50:null,coastViolations:0,nonzeroSamples,coastDirections:20000};
  }else{
    const code=Number(hash64(body.seed+'/macro-v1')&0xffffffffn);
    const baseline=d=>{const b=1-Math.abs(2*noise(d[0]*30+13,d[1]*30+37,d[2]*30+19,code+7)-1);return b*b*b*b*b>RELIEF_CALIBRATION.BT0;};
    const map=layoutMap((d,alt)=>layout.sampleWithA0(d,alt,out).belt,a0,{baseline});
    const linear=layoutCoherence(sample,body.radiusM),world=worlds.some(w=>w.id===body.id);
    const coastViolations=coastSafety(sample,a0,20000)+(world?coastSafety(sample,a0,102500):0);
    // Pin: the duplicated a0 stays bit-identical to terrain's continentalM (kept out of the unit file, section 2.6).
    const relief=reliefLayersSampler(body),scale=Math.min(1,body.radiusM/2e6);let a0Mismatches=0;
    for(let i=0;i<2000;i++){const d=fib(i,2000);if(a0(d)*scale!==relief(d).continentalM)a0Mismatches++;}
    const {grid,mask,land,...metrics}=map;
    row={...row,...metrics,coherenceP50:linear.p50,coherenceWindowCount:linear.windowCount,
      coherenceStrictP50:linear.strictP50,coherenceStrictWindowCount:linear.strictWindowCount,coherenceZeroTraceCount:linear.zeroTraceCount,
      coherenceSites:linear.sites,coastViolations,coastDirections:20000+(world?102500:0),a0Mismatches};
    if(world){const rgb=Buffer.alloc(grid.w*grid.h*3);
      for(let i=0;i<mask.length;i++){const b=mask[i],base=land[i]?[125,125,125]:[8,23,48],orange=[255,105,12];
        for(let j=0;j<3;j++)rgb[3*i+j]=Math.round(base[j]*(1-b)+orange[j]*b);}
      writePng(`${dir}/${body.name}-layout.png`,grid.w,grid.h,rgb);
    }
  }
  if(body.id===worlds[0].id||body.id===worlds[3].id)row.curvature=layoutCurvature(layout,body.radiusM);
  row.failures=judgeLayout(row);if(row.a0Mismatches)row.failures.push('a0 identity');rows.push(row);
  if(body.id===worlds[0].id){distanceAccuracy=layoutDistanceAccuracy(layout,body.radiusM);if(!distanceAccuracy.pass)row.failures.push('axis distance accuracy');}
  if(!row.gas)row.largeComponentNote=row.components.length?'Measured large components': 'No >1% component found within the width, length, land-continuity and separation constraints; not a proof that none can fit.';
  const f=(v,scale=1)=>v==null?'N/A':(v*scale).toFixed(3);
  console.log(`${row.name} | ${f(row.radiusM,.001)} | ${f(row.landShare,100)} | ${f(row.beltShare,100)} | ${f(row.coreShare,100)} | ${f(row.mainShare,100)} | ${row.components.length} | ${f(row.minAspect)} | ${f(row.coherenceP50)} | ${row.coastViolations} | ${f(constructionMs)} | ${row.failures.join(', ')||'PASS'}`);
  if(!row.gas)console.log(`  coherence primary/strict: ${f(row.coherenceP50)} / ${f(row.coherenceStrictP50)}; windows: ${row.coherenceWindowCount} / ${row.coherenceStrictWindowCount}; zero trace: ${row.coherenceZeroTraceCount}`);
  if(!row.gas)console.log(`  >1% aspects: ${row.components.map(c=>f(c.aspect)).join(', ')||'none'}; >0.1% min/p10/below4: ${f(row.smallMinAspect)} / ${f(row.smallP10Aspect)} / ${row.smallBelow4}; majors: ${row.majorCount}; ${row.largeComponentNote}`);
}
// INFO only (wall clock, not CPU-quiet): direct Maithea build and 100k-direction sample cost incl. a0.
const cost=(()=>{const body=worlds[0],a0=continentalA0(body),directions=Array.from({length:100000},(_,i)=>fib(i,100000));
  const t0=performance.now(),built=buildOrogenLayout({seed:body.seed,radiusM:body.radiusM,a0}),buildMs=performance.now()-t0;
  const out={belt:0,axis:[0,0,0],axisDistanceM:0,halfWidthM:0,beltIndex:-1};
  for(let i=0;i<10000;i++)built.sample(directions[i],out);
  let checksum=0;const t1=performance.now();for(const d of directions)checksum+=built.sample(d,out).belt;
  return {class:'INFO',world:body.name,buildMs,sampleNs:(performance.now()-t1)*1e6/directions.length,directions:directions.length,checksum};})();
console.log(`COST ${JSON.stringify(cost)}`);
const terrestrial=rows.filter(r=>!r.gas),summary={};
for(const key of ['radiusM','landShare','beltShare','coreShare','mainShare','minAspect','smallMinAspect','smallP10Aspect','smallBelow4','majorCount','coherenceP50','coherenceStrictP50','coherenceWindowCount','coherenceStrictWindowCount','coherenceZeroTraceCount','coastViolations','constructionMs']){
  const values=terrestrial.map(r=>r[key]).filter(v=>v!=null);summary[key]={min:Math.min(...values),max:Math.max(...values)};
}
summary.largeComponents={min:Math.min(...terrestrial.map(r=>r.components.length)),max:Math.max(...terrestrial.map(r=>r.components.length))};
summary.a0Mismatches=terrestrial.reduce((n,r)=>n+r.a0Mismatches,0);
summary.bodiesWithLargeComponents=terrestrial.filter(r=>r.components.length).length;
const report={version:OROGEN_LAYOUT_VERSION,constants:OROGEN_LAYOUT,thresholds:LAYOUT_THRESHOLDS,class:'CONTRACT',resolution:[1024,512],worldIds:worlds.map(w=>w.id),bodyCount:rows.length,gasCount:rows.filter(r=>r.gas).length,corpusCount:corpus.length,rows,summary,distanceAccuracy,cost,wallMs:performance.now()-start,failures:rows.filter(r=>r.failures.length).map(r=>({id:r.id,name:r.name,failures:r.failures}))};
writeFileSync(`${dir}/report.json`,JSON.stringify(report,null,2)+'\n');
console.log(`CONTRACT: ${report.failures.length} failing bodies; ${(report.wallMs/1000).toFixed(3)} s; ${dir}/report.json`);
process.exitCode=report.failures.length?1:0;

