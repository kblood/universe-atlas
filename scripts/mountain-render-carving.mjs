import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {raster,carvingStructure,rasterFromArray,slopes,crests,windowRelief,prominence,depressions,bandPowers,betaFromOctaves,q,flowAccumulationD8,hillshade,writePng,measureSites,syntheticSampler,judgeM3,frame,localMap} from '../tests/helpers/mountain-metrics.mjs';
import {ERODED_CONTROL,ERODED_CONTROL_VERSION,CONTROL_SITES,buildErodedControl,centralCrop} from '../tests/helpers/mountain-eroded-control.mjs';
import {ridgeValleyCarvingM} from '../src/mountain-carving.ts';
import {loadRejectedR5} from '../tests/helpers/mountain-calibration-controls.mjs';
// Rounds 1-5 (A2, B, C, E) are frozen in a fixture since F replaced them in src/ (mountain-carving-2).
// The legacy modes below reproduce that evidence; F's own driver is scripts/mountain-carving-f.mjs.
const LEGACY_SOURCE=new URL('../tests/fixtures/mountain-carving-r5-rejected.ts.txt',import.meta.url);
const legacy=await loadRejectedR5(),{carvingAM,carvingBM}=legacy;
const MOUNTAIN_CARVING=legacy.MOUNTAIN_CARVING,MOUNTAIN_CARVING_VERSION=legacy.MOUNTAIN_CARVING_VERSION;

export const R=5194907,SEED_BASE=730201;
export const SITES=Object.freeze(Array.from({length:8},(_,k)=>({d:[Math.cos(k*1e6/R),0,Math.sin(k*1e6/R)]})));
export function rampArgs(d){
  const across=R*Math.asin(d[1]),along=R*Math.atan2(d[2],d[0]);
  return [along,across,30000,3000*Math.max(0,1-Math.abs(across)/30000),Math.abs(across)<30000?1:0,(SEED_BASE+Math.round(along/1e6))>>>0];
}
export function rampSampler(carving=ridgeValleyCarvingM){return d=>{
  const args=rampArgs(d),h=args[3]+carving(...args);return {groundHeightM:h,ocean:h<0};
};}

const candidateC=process.argv[process.argv.indexOf('--candidate')+1]==='C';
const candidateE=process.argv[process.argv.indexOf('--candidate')+1]==='E';
const OUT=new URL(candidateE?'../test-results/mountains/M3-r5/E/':candidateC?'../test-results/mountains/M3-r4/':'../test-results/mountains/M3/',import.meta.url);
const save=(name,data)=>writeFileSync(new URL(name,OUT),JSON.stringify(data,null,2)+'\n');
const digest=r=>createHash('sha256').update(Buffer.from(r.h.buffer)).digest('hex');
const sourceSha=()=>createHash('sha256').update(readFileSync(LEGACY_SOURCE)).digest('hex');
function render(name,r){
  writePng(new URL(name+'-hillshade.png',OUT),r.n,r.n,hillshade(r,5000));
  const f=flowAccumulationD8(r),rgb=Buffer.alloc(r.n*r.n*3);
  let max=0;for(const a of f.accumulation)max=Math.max(max,a);
  for(let j=0;j<r.n;j++)for(let i=0;i<r.n;i++){
    const v=Math.round(255*Math.log1p(f.accumulation[j*r.n+i])/Math.log1p(max));
    const k=((r.n-1-j)*r.n+i)*3;rgb[k]=rgb[k+1]=rgb[k+2]=v;
  }
  writePng(new URL(name+'-flow.png',OUT),r.n,r.n,rgb);
}
// Compose existing metrics; no metric implementation is duplicated here.
function controlAccumulator(){return {slope:[],flank:[],relief:[],fill:[],pits:[],peaks:0,area:0,bands:new Float64Array(10)};}
function addControl(a,full){
  const r=centralCrop(full);for(const v of slopes(r,1))a.slope.push(v);
  for(const v of crests(r).flank)a.flank.push(v);for(const v of windowRelief(r,8))a.relief.push(v);
  const dp=depressions(r);a.fill.push(dp.fill10Share);a.pits.push(dp.pitsPer1000km2);
  a.peaks+=prominence(r).filter(p=>p.prom>=300).length;a.area+=(r.n*r.step/1000)**2;
  // All 1025 rows and columns, first 1024 samples each: 128 km at 125 m.
  for(let axis=0;axis<2;axis++)for(let row=0;row<full.n;row++){
    const values=Float64Array.from({length:1024},(_,i)=>full.h[axis?i*full.n+row:row*full.n+i]);
    const {freqPower}=bandPowers(values,full.step);
    for(const p of freqPower.slice(1)){const b=Math.floor(Math.log2(p.wavelength/125));if(b>=0&&b<10)a.bands[b]+=p.power/(2*full.n*CONTROL_SITES.length);}
  }
  return {drainage:dp,digest:digest(full)};
}
function finishControl(a){return {slope125P50:q(a.slope,.5),slope125Over30:100*a.slope.filter(v=>v>30).length/a.slope.length,
  flank500mP50:q(a.flank,.5),relief8kmP50:q(a.relief,.5),peaksProm300Per1000km2:1000*a.peaks/a.area,
  fill10ShareP50:q(a.fill,.5),pitsPer1000km2P50:q(a.pits,.5),beta500mTo8km:betaFromOctaves(a.bands),
  octavePowers:Array.from(a.bands),coherence40kmWindowP50:null,coherenceNote:'Not measured: requires a 386 km regional raster.'};}
async function controls(){
  const P=controlAccumulator(),N=controlAccumulator(),sites=[];
  for(let i=0;i<4;i++){
    const {original,eroded}=buildErodedControl(i);
    const entry={d:CONTROL_SITES[i].d,P:addControl(P,eroded),N:addControl(N,original)};sites.push(entry);
    if(i===0){render('eroded-control',centralCrop(eroded));render('un-eroded-control',centralCrop(original));}
    console.log('PHASE1 site '+i+' '+JSON.stringify(entry));
  }
  const p=finishControl(P),n=finishControl(N);
  const rule=[['fill10ShareP50',.05],['pitsPer1000km2P50',50]].map(([id,bound])=>({id,bound,P:p[id],N:n[id],calibrated:p[id]<=bound&&n[id]>bound}));
  const result={version:ERODED_CONTROL_VERSION,constants:ERODED_CONTROL,sites,P:p,N:n,rule,order:'Measured before candidate implementation or measurement. Bounds fixed in advance; no value edits.'};
  save('eroded-control.json',result);console.log('PHASE1 result '+JSON.stringify(result));
}
function verifyControls(){
  const reference=JSON.parse(readFileSync(new URL('eroded-control.json',OUT),'utf8')),sites=[];
  for(let i=0;i<4;i++){
    const {original,eroded}=buildErodedControl(i),P=digest(eroded),N=digest(original);
    const pass=P===reference.sites[i].P.digest&&N===reference.sites[i].N.digest;
    sites.push({site:i,P,N,pass});console.log('CONTROL REPEAT '+JSON.stringify(sites.at(-1)));
  }
  save('control-repeat.json',{pass:sites.every(s=>s.pass),sites});if(!sites.every(s=>s.pass))process.exitCode=1;
}

function candidateMetrics(fn,name,{n=385,siteCount=8,renders=true,sites=SITES.slice(0,siteCount)}={}){
  const core=[],structure=[];
  const metrics=measureSites(rampSampler(fn),sites,R,{n,onRaster:(r,reg,si)=>{
    const map=localMap(sites[si].d,frame(sites[si].d),R),s=slopes(r,1),o=(r.n-1)*r.step/2;
    for(let k=0;k<s.length;k++){
      const i=1+k%(r.n-2),j=1+Math.floor(k/(r.n-2));
      if(Math.abs(R*Math.asin(map(i*r.step-o,j*r.step-o)[1]))<=19500)core.push(s[k]);
    }
    if(renders){
      const delta=new Float64Array(r.h.length),mirror=new Float64Array(r.h.length),mask=new Uint8Array(r.h.length);
      for(let j=0;j<r.n;j++)for(let i=0;i<r.n;i++){
        const a=rampArgs(map(i*r.step-o,j*r.step-o)),k=j*r.n+i;
        delta[k]=fn(...a);mask[k]=Math.abs(a[1])<=19500;a[1]=-a[1];mirror[k]=fn(...a);
      }
      structure.push({site:si,...carvingStructure(r,delta,mirror,mask)});
    }
    if(si===0&&renders)render(name,r);
  }});
  const wholeRasterOver30=metrics.E5_slopes.slope125Over30;
  const coreOver30=100*core.filter(v=>v>30).length/core.length;
  return {metrics,structure,coreSlopeP50:q(core,.5),wholeRasterOver30,coreOver30,
    rows:judgeM3({...metrics,slope125Over30:coreOver30})};
}
function coast(fn){
  let violations=0,zeroOutsideViolations=0,positiveCarving=0,samples=0,outside=0;
  for(const {d} of SITES){const map=localMap(d,frame(d),R);
    for(let j=0;j<193;j++)for(let i=0;i<193;i++){
      const a=rampArgs(map((i-96)*500,(j-96)*500)),v=fn(...a);samples++;
      if(!(a[3]+v>=0))violations++;if(v>0)positiveCarving++;
      if(a[4]===0){outside++;if(!Object.is(v,0))zeroOutsideViolations++;}
    }
  }
  return {samples,outside,violations,zeroOutsideViolations,positiveCarving};
}
function retention(ts){
  const result={};
  for(const L of [6,8]){const edge=Math.PI/2*R/2**L,sites=[];let total=0,kept=0;
    for(const {d} of SITES){const map=localMap(d,frame(d),R),grid=new Float64Array(33*33),truth=[];
      for(let j=0;j<=32;j++)for(let i=0;i<=32;i++)grid[j*33+i]=ts(map((i/32-.5)*edge,(j/32-.5)*edge)).groundHeightM;
      for(let j=0;j<97;j++)for(let i=0;i<97;i++){
        const u=(i+.5)/97,v=(j+.5)/97,h=ts(map((u-.5)*edge,(v-.5)*edge)).groundHeightM;
        if(h>=0)truth.push({u,v,h});
      }
      const p90=q(truth.map(p=>p.h),.9);let peak=0,keep=0;
      for(const p of truth){if(p.h<p90)continue;peak++;
        const x=p.u*32,y=p.v*32,i=Math.floor(x),j=Math.floor(y),u=x-i,v=y-j;
        const h=(1-v)*((1-u)*grid[j*33+i]+u*grid[j*33+i+1])+v*((1-u)*grid[(j+1)*33+i]+u*grid[(j+1)*33+i+1]);
        if(h>=p90)keep++;
      }
      sites.push({p90,peak,kept:keep,peakKept:100*keep/peak});total+=peak;kept+=keep;
    }
    result['L'+L]={edgeM:edge,peakKept:100*kept/total,sites};
  }
  return result;
}
async function benchmark(){
  const initialSourceSha256=sourceSha();
  const {terrainSampler}=await import('../src/terrain.ts');
  const {maithea,fib}=await import('../tests/terrain-climate-fixtures.mjs');
  const ts=terrainSampler(maithea()),args=[];
  for(const {d} of SITES){const map=localMap(d,frame(d),R);
    for(let j=0;j<385;j++)for(let i=0;i<385;i++)args.push(rampArgs(map((i-192)*125,(j-192)*125)));
  }
  const dirs=Array.from({length:args.length},(_,i)=>fib(i,args.length)),rounds={A:[],B:[],terrain:[]};let checksum=0;
  const funcs={A:i=>carvingAM(...args[i]),B:i=>carvingBM(...args[i]),terrain:i=>ts(dirs[i]).groundHeightM};
  for(const fn of Object.values(funcs))for(let i=0;i<10000;i++)checksum+=fn(i);
  for(let r=0;r<5;r++)for(const key of ['A','B','terrain'].slice(r%3).concat(['A','B','terrain'].slice(0,r%3))){
    const t=performance.now(),fn=funcs[key];for(let i=0;i<args.length;i++)checksum+=fn(i);
    rounds[key].push((performance.now()-t)*1e6/args.length);console.log('BENCH round '+r+' '+key+' '+rounds[key].at(-1));
  }
  const ns=Object.fromEntries(Object.entries(rounds).map(([k,v])=>[k,q(v,.5)]));
  if(sourceSha()!==initialSourceSha256)throw new Error('Source changed during benchmark');
  const result={class:'INFO',sourceSha256:initialSourceSha256,samples:args.length,rounds,nsPerSample:ns,ratio:{A:ns.A/ns.terrain,B:ns.B/ns.terrain},weightedRatio:{A:.1*ns.A/ns.terrain,B:.1*ns.B/ns.terrain},beltLandShare:.10,budget:.08,checksum,cpuQuietSlot:'Not acquired by this script; coordinator should run --bench under its CPU slot.'};
  save('benchmark.json',result);
  const reportPath=new URL('report.json',OUT);
  if(existsSync(reportPath)){
    const report=JSON.parse(readFileSync(reportPath,'utf8'));
    if(report.sourceSha256===result.sourceSha256){report.benchmark=result;for(const k of ['A','B'])report.table[k].nsPerSample=ns[k];save('report.json',report);}
  }
  console.log('BENCH result '+JSON.stringify(result));return result;
}
async function acceptance(){
  const control=JSON.parse(readFileSync(new URL('eroded-control.json',OUT),'utf8'));
  console.log('ACCEPTANCE calibrated control loaded');
  const candidates={};
  for(const [name,fn] of [['A',carvingAM],['B',carvingBM]]){
    console.log('ACCEPTANCE measuring '+name);candidates[name]=candidateMetrics(fn,name);
    candidates[name].coast=coast(fn);console.log('ACCEPTANCE '+name+' '+JSON.stringify(candidates[name]));
  }
  const controls={envelope:candidateMetrics(()=>0,'envelope',{renders:false})};
  for(const kind of ['alpine','dome']){
    const metrics=measureSites(syntheticSampler(R,kind),SITES,R);controls[kind]={metrics,rows:judgeM3(metrics)};
    console.log('CONTEXT '+kind+' '+JSON.stringify(controls[kind]));
  }
  const controlStructure={P:[],N:[]};
  for(let site=0;site<4;site++){
    const {original,eroded}=buildErodedControl(site);
    if(digest(original)!==control.sites[site].N.digest||digest(eroded)!==control.sites[site].P.digest)throw new Error('Frozen control mismatch at site '+site);
    controlStructure.P.push({site,...carvingStructure(centralCrop(eroded))});
    controlStructure.N.push({site,...carvingStructure(centralCrop(original))});
    if(site===0){render('eroded-control',centralCrop(eroded));render('un-eroded-control',centralCrop(original));}
    console.log('STRUCTURE control site '+site+' '+JSON.stringify({P:controlStructure.P.at(-1),N:controlStructure.N.at(-1)}));
  }
  controls.eroded={metrics:control.P,rows:judgeM3(control.P),note:'Four separate control sites; coherence not measured; >30 is whole crop.'};
  const proxy={note:'Point-sampled proxy omits the production lattice non-negative peak correction.'};
  for(const [name,ts] of [['envelope',rampSampler(()=>0)],['A',rampSampler(carvingAM)],['B',rampSampler(carvingBM)],['alpine',syntheticSampler(R,'alpine')]])proxy[name]=retention(ts);
  console.log('RETENTION '+JSON.stringify(proxy));
  const benchPath=new URL('benchmark.json',OUT),cachedBench=existsSync(benchPath)?JSON.parse(readFileSync(benchPath,'utf8')):null;
  const bench=cachedBench?.sourceSha256===sourceSha()?cachedBench:null;
  const table=Object.fromEntries([...Object.entries(candidates),...Object.entries(controls)].map(([k,v])=>[k,{rows:v.rows,nsPerSample:bench?.nsPerSample[k]??null}]));
  const winner=MOUNTAIN_CARVING.METHOD,pass=candidates[winner].rows.every(r=>r.pass)&&Object.values(candidates).every(c=>!c.coast.violations&&!c.coast.zeroOutsideViolations&&!c.coast.positiveCarving);
  const result={candidateDesign:{A:'A2',B:'Accepted round-1 B, unchanged'},acceptedWinner:null,visualReview:{"status":"BLOCKED","A":"A2 has smooth trunk bands, repeated comb-like wall gullies, rounded coarse tributary ends and sharp active-cone transitions; conspicuously geometric, not an eroded range.","B":"Irregular bending near-vertical gullies and rough side detail alternate with broad smooth slopes; strong preferred direction and measured drainage failures remain."},structure:{class:'INFO',A:candidates.A.structure,B:candidates.B.structure,...controlStructure},version:MOUNTAIN_CARVING_VERSION,sourceSha256:sourceSha(),constants:MOUNTAIN_CARVING,class:'CONTRACT',winner,pass,status:pass?'NUMERIC_PASS_REQUIRES_VISUAL_REVIEW':'BLOCKED',candidates,controls,table,retention:proxy,benchmark:bench};
  save('report.json',result);
  console.table(Object.fromEntries(Object.entries(table).map(([k,v])=>[k,Object.fromEntries(v.rows.map(r=>[r.id,`${r.actual} ${r.pass?'PASS':'FAIL'}`]))])));
  console.log('ACCEPTANCE '+(pass?'PASS':'BLOCKED')+' winner '+winner);if(!pass)process.exitCode=1;
}
async function sweep(){
  const {stripTypeScriptTypes}=await import('node:module');
  const source=readFileSync(LEGACY_SOURCE,'utf8'),results=[];
  const variants=[.1,.2,.3].flatMap(HEAD_RISE=>[1.4,2.2,3].map(WALL_GAIN=>({HEAD_RISE,WALL_GAIN})));
  for(const constants of variants){
    let sourceText=source;for(const [k,v] of Object.entries(constants))sourceText=sourceText.replace(new RegExp(k+': [0-9.]+'),k+': '+v);
    const m=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(sourceText)).toString('base64'));
    const name='A';
    const measured=candidateMetrics(name==='A'?m.carvingAM:m.carvingBM,name,{siteCount:1,renders:false});
    results.push({baseSourceSha256:sourceSha(),constants,rows:measured.rows.map(({id,actual,pass})=>({id,actual,pass}))});
    console.log('SWEEP '+JSON.stringify(results.at(-1)));
  }
  save('a2-sweep.json',results);
}


async function loadC(replacements={},instrument=false){
  const {stripTypeScriptTypes}=await import('node:module');
  let source=readFileSync(LEGACY_SOURCE,'utf8');
  for(const [key,value] of Object.entries(replacements))source=source.replace(new RegExp('\\b'+key+': [0-9.]+'),key+': '+value);
  if(instrument){
    source=source.replace('function cBuild(seed:','function cBuildRaw(seed:');
    source+='\nexport const buildStats={count:0,ms:0}; function cBuild(seed:number,w:number,id:number){const t=performance.now();const b=cBuildRaw(seed,w,id);buildStats.count++;buildStats.ms+=performance.now()-t;return b;}';
  }
  return import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source+'\nexport {cBuild,cCache,cGet};')).toString('base64'));
}
async function calibrateC(){
  let lo=.001,hi=1e6;const iterations=[];
  for(let i=0;i<22;i++){
    const K=Math.sqrt(lo*hi),m=await loadC({K}),b=m.cBuild(SEED_BASE,30000,0),values=[];
    for(let k=0;k<b.h.length;k++)if(b.mesh.e[k]>1050)values.push(b.uncapped[k]/b.mesh.e[k]);
    const p90=q(values,.9);iterations.push({K,p90});console.log('CALIBRATE',K,p90);
    if(p90>1)hi=K;else lo=K;
  }
  const result={seed:SEED_BASE,halfWidthM:30000,blockId:0,quantile:.9,core:'e0 > 0.35',K:Math.sqrt(lo*hi),iterations};
  save('calibration.json',result);console.log(JSON.stringify(result));
}
function longStripC(fn,name='C'){
  // Reuse the square hillshade helper in overlapping square panels, crop their
  // interior columns so panel edges use genuine neighbours (no shading seams).
  const step=125,n=483,width=1537,height=481,rgb=Buffer.alloc(width*height*3);
  for(let start=0;start<width;start+=n-2){
    const h=new Float64Array(n*n);
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){
      const x=(start+i-1)*step-96000,y=(j-241)*step,e=3000*Math.max(0,1-Math.abs(y)/30000);
      h[j*n+i]=e+fn(x,y,30000,e,1,SEED_BASE);
    }
    const shaded=hillshade(rasterFromArray(h,n,step),5000),cols=Math.min(n-2,width-start);
    for(let j=0;j<height;j++)shaded.copy(rgb,(j*width+start)*3,((j+1)*n+1)*3,((j+1)*n+1+cols)*3);
  }
  writePng(new URL(name+'-strip-192km-hillshade.png',OUT),width,height,rgb);
}
async function acceptanceC(){
  const m=await loadC(),fn=m.carvingCM;
  console.log('C pooled measurement');const pooled=candidateMetrics(fn,'C'),perSeed=[];
  for(let i=0;i<SITES.length;i++){
    const result=candidateMetrics(fn,'C-seed'+i,{sites:[SITES[i]],renders:false});
    perSeed.push({seed:SEED_BASE+i,site:i,...result});console.log('C seed',SEED_BASE+i,JSON.stringify(result.rows));
  }
  console.log('C coast and retention');const safety=coast(fn),proxy=retention(rampSampler(fn));
  longStripC(fn);
  const pass=pooled.rows.every(r=>r.pass)&&perSeed.every(s=>s.rows.every(r=>r.pass))&&!safety.violations&&!safety.zeroOutsideViolations&&!safety.positiveCarving;
  const result={version:m.CARVING_C_VERSION,constants:m.MOUNTAIN_CARVING_C,sourceSha256:sourceSha(),pooled,perSeed,coast:safety,retention:{class:'INFO',note:'Point-sampled proxy omits production peak correction.',...proxy},pass};
  save('report.json',result);console.table(pooled.rows.map(({id,actual,pass})=>({id,actual,pass})));
  if(!pass)process.exitCode=1;
}
async function benchmarkC(){
  const m=await loadC({},true),args=[],source=sourceSha();
  for(const {d} of SITES){const map=localMap(d,frame(d),R);
    for(let j=0;j<385;j++)for(let i=0;i<385;i++)args.push(rampArgs(map((i-192)*125,(j-192)*125)));
  }
  let checksum=0;
  const run=()=>{
    const before={...m.buildStats},t=performance.now();for(const a of args)checksum+=m.carvingCM(...a);
    return {nsPerSample:(performance.now()-t)*1e6/args.length,builds:m.buildStats.count-before.count,buildMs:m.buildStats.ms-before.ms};
  };
  m.cCache.fill(undefined);const cold=run(),warm=run(),build=[];
  for(let id=0;id<7;id++){const t=performance.now();m.cBuild(SEED_BASE,30000,id);build.push(performance.now()-t);}
  // Fully resident warm cost in the same site/raster order. Preload each site's
  // working set outside timing; the direct-mapped cache cannot hold all 8 sites.
  let residentMs=0,residentBuilds=0;
  for(let site=0;site<8;site++){
    const a=args.slice(site*385*385,(site+1)*385*385);
    for(const v of a)m.carvingCM(...v);
    const before=m.buildStats.count,t=performance.now();for(const v of a)checksum+=m.carvingCM(...v);residentMs+=performance.now()-t;residentBuilds+=m.buildStats.count-before;
  }
  const {terrainSampler}=await import('../src/terrain.ts');
  const {maithea,fib}=await import('../tests/terrain-climate-fixtures.mjs');
  const ts=terrainSampler(maithea()),dirs=Array.from({length:args.length},(_,i)=>fib(i,args.length));
  for(let i=0;i<10000;i++)checksum+=ts(dirs[i]).groundHeightM;
  const terrainStart=performance.now();for(const d of dirs)checksum+=ts(d).groundHeightM;
  const terrainNs=(performance.now()-terrainStart)*1e6/args.length;
  if(source!==sourceSha())throw new Error('Source changed during benchmark');
  const residentNs=residentMs*1e6/args.length;
  const result={class:'INFO',sourceSha256:source,samples:args.length,nsPerSample:{emptyCache:cold.nsPerSample,secondPass:warm.nsPerSample,residentWarm:residentNs,terrain:terrainNs},cold,secondPass:warm,residentBuilds,blockBuildMs:{median:q(build,.5),samples:build},weightedRatioAt10Pct:{cold:.1*cold.nsPerSample/terrainNs,warm:.1*residentNs/terrainNs},budget:.08,cacheHeightBytes:m.MOUNTAIN_CARVING_C.CACHE*(m.MOUNTAIN_CARVING_C.ROWS+1)*(m.MOUNTAIN_CARVING_C.COLS+3)*8,checksum,note:'Cold and second pass include all builds and collisions. Resident warm preloads each site outside timing. Single measured pass per workload, not a five-round median. Build timing uses a private source-loaded wrapper; production arithmetic is unchanged. CPU quiet lock not acquired.'};
  save('benchmark.json',result);console.log('BENCH C '+JSON.stringify(result));
}

export async function loadE(replacements={},instrument=false){
  const {stripTypeScriptTypes}=await import('node:module');
  let source=readFileSync(LEGACY_SOURCE,'utf8');
  const at=source.indexOf('export const CARVING_E_VERSION');
  let tail=source.slice(at);
  // Rejected crest-cap variants live only in this private diagnostic loader.
  if(replacements.CAP_WANDER){
    tail=tail.replace('SPUR:800,','SPUR:800,CAP_WANDER:0,').replace('SPUR?:N};','SPUR?:N,CAP_WANDER?:N};');
    tail=tail.replace('h[k]=Math.min(h[k],eb[k],ee[k]);', 'const y=-w+Math.floor(k/stride)*dy,shift=o.CAP_WANDER?o.CAP_WANDER*cNoise(ex[k]/24000,0,111,seed):0,cap=shift?3000*Math.max(0,1-(Math.abs(y-shift)+Math.abs(shift))/w):ee[k];h[k]=Math.min(h[k],eb[k],ee[k],cap);');
    if(!replacements.LEGACY_CAP)tail=tail.replace('let best=3000*Math.max(0,1-Math.abs(y)/a.w);','let best=3000*Math.max(0,1-Math.abs(y)/a.w);if(EE.CAP_WANDER){const shift=EE.CAP_WANDER*cNoise(x/24000,0,111,a.seed);best=Math.min(best,3000*Math.max(0,1-(Math.abs(y-shift)+Math.abs(shift))/a.w));}');
  }

  for(const [key,value] of Object.entries(replacements))tail=tail.replace(new RegExp('\\b'+key+':[0-9.]+'),key+':'+value);
  source=source.slice(0,at)+tail;
  if(instrument){source=source.replace('function eBuild(seed:','function eBuildRaw(seed:');
    source+='\nexport const buildStats={count:0,ms:0}; function eBuild(seed:N,w:N,id:N,o:EO=EE){const t=performance.now();const b=eBuildRaw(seed,w,id,o);buildStats.count++;buildStats.ms+=performance.now()-t;return b;}';}
  return import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source+'\nexport {eBuild,eCache,eRawCache,eGet,eRaw,eEdge,eBoundaryAt,eEdges,ex,ee,ea,ep,eb,ed,er,eo,es,eg,ei,el,eh,ek};')).toString('base64'));
}
export function eMemory(m){
 const c=m.MOUNTAIN_CARVING_E, scratch=['ex','ee','ea','ep','eb','ed','er','eo','es','eg','ei','el','ek'].reduce((s,k)=>s+m[k].byteLength,0)+m.eh.ids.byteLength+m.eh.pos.byteLength;
 const blocks=(c.CACHE+c.RAW_CACHE)*(c.ROWS+1)*(c.COLS+3)*8;
 return {class:'INFO',scratchBytes:scratch,blockCapacityBytes:blocks,totalTypedArrayBytes:scratch+blocks,note:'Conservative: shared boundary arrays counted twice. Object headers excluded. C memo excluded; A2 remains dispatcher.'};
}
async function acceptanceE(){
 const m=await loadE(),fn=m.carvingEM;
 const pooled=candidateMetrics(fn,'E'),perSeed=[];
 for(let i=0;i<SITES.length;i++){const result=candidateMetrics(fn,'E-seed'+i,{sites:[SITES[i]],renders:false});perSeed.push({seed:SEED_BASE+i,...result});console.log('E seed',SEED_BASE+i,JSON.stringify(result.rows));}
 const safety=coast(fn),proxy=retention(rampSampler(fn));longStripC(fn,'E');
 const capped=[];for(let i=0;i<8;i++){
  const b=m.eGet(SEED_BASE+i,30000,Math.floor(i*1e6/15000)),{ROWS,COLS}=m.MOUNTAIN_CARVING_E;let count=0;
  for(let j=1;j<ROWS;j++)for(let k=j*(COLS+1);k<(j+1)*(COLS+1);k++)if(b.h[k]>=3000*Math.max(0,1-Math.abs(-30000+60000*j/ROWS)/30000))count++;
  capped.push(count/(ROWS-1)/(COLS+1));
 }
 const pass=pooled.rows.every(r=>r.pass)&&!safety.violations&&!safety.zeroOutsideViolations&&!safety.positiveCarving;
 save('report.json',{class:'CONTRACT',version:m.CARVING_E_VERSION,constants:m.MOUNTAIN_CARVING_E,sourceSha256:sourceSha(),pooled,perSeed,coast:safety,retention:{class:'INFO',note:'Point-sampled proxy; no production peak correction.',...proxy},memory:eMemory(m),cappedShare:capped,pass});console.table(pooled.rows.map(({id,actual,pass})=>({id,actual,pass})));if(!pass)process.exitCode=1;
}
export {candidateMetrics,coast,retention,longStripC};
async function benchmarkE(){
  const m=await loadE({},true),args=[],source=sourceSha();
  for(const {d} of SITES){const map=localMap(d,frame(d),R);
    for(let j=0;j<385;j++)for(let i=0;i<385;i++)args.push(rampArgs(map((i-192)*125,(j-192)*125)));
  }
  let checksum=0;
  const run=()=>{
    const before={...m.buildStats},t=performance.now();for(const a of args)checksum+=m.carvingEM(...a);
    return {nsPerSample:(performance.now()-t)*1e6/args.length,builds:m.buildStats.count-before.count,buildMs:m.buildStats.ms-before.ms};
  };
  m.eCache.fill(undefined);m.eRawCache.fill(undefined);const cold=run(),warm=run(),build=[];
  for(let id=0;id<7;id++){const t=performance.now();m.eBuild(SEED_BASE,30000,id);build.push(performance.now()-t);}
  // Fully resident warm cost in the same site/raster order. Preload each site's
  // working set outside timing; the direct-mapped cache cannot hold all 8 sites.
  let residentMs=0,residentBuilds=0;
  for(let site=0;site<8;site++){
    const a=args.slice(site*385*385,(site+1)*385*385);
    for(const v of a)m.carvingEM(...v);
    const before=m.buildStats.count,t=performance.now();for(const v of a)checksum+=m.carvingEM(...v);residentMs+=performance.now()-t;residentBuilds+=m.buildStats.count-before;
  }
  const {terrainSampler}=await import('../src/terrain.ts');
  const {maithea,fib}=await import('../tests/terrain-climate-fixtures.mjs');
  const ts=terrainSampler(maithea()),dirs=Array.from({length:args.length},(_,i)=>fib(i,args.length));
  for(let i=0;i<10000;i++)checksum+=ts(dirs[i]).groundHeightM;
  const terrainStart=performance.now();for(const d of dirs)checksum+=ts(d).groundHeightM;
  const terrainNs=(performance.now()-terrainStart)*1e6/args.length;
  if(source!==sourceSha())throw new Error('Source changed during benchmark');
  const residentNs=residentMs*1e6/args.length;
  const result={class:'INFO',sourceSha256:source,samples:args.length,nsPerSample:{emptyCache:cold.nsPerSample,secondPass:warm.nsPerSample,residentWarm:residentNs,terrain:terrainNs},cold,secondPass:warm,residentBuilds,blockBuildMs:{median:q(build,.5),samples:build},weightedRatioAt10Pct:{cold:.1*cold.nsPerSample/terrainNs,warm:.1*residentNs/terrainNs},budget:.08,cacheHeightBytes:(m.MOUNTAIN_CARVING_E.CACHE+m.MOUNTAIN_CARVING_E.RAW_CACHE)*(m.MOUNTAIN_CARVING_E.ROWS+1)*(m.MOUNTAIN_CARVING_E.COLS+3)*8,checksum,note:'Cold and second pass include all builds and collisions. Resident warm preloads each site outside timing. Single measured pass per workload, not a five-round median. Build timing uses a private source-loaded wrapper; production arithmetic is unchanged. CPU quiet lock not acquired.'};
  result.memory=eMemory(m);save('benchmark.json',result);console.log('BENCH E '+JSON.stringify(result));
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  mkdirSync(OUT,{recursive:true});
  if(candidateE){if(process.argv.includes('--bench'))await benchmarkE();else await acceptanceE();}
  else if(candidateC){if(process.argv.includes('--calibrate'))await calibrateC();else if(process.argv.includes('--bench'))await benchmarkC();else await acceptanceC();}
  else if(process.argv.includes('--controls'))await controls();
  else if(process.argv.includes('--verify-controls'))verifyControls();
  else if(process.argv.includes('--bench'))await benchmark();
  else if(process.argv.includes('--sweep'))await sweep();
  else if(process.argv.includes('--quick')){
    for(const [name,fn] of [['A',carvingAM],['B',carvingBM]])console.log('QUICK '+name+' '+JSON.stringify(candidateMetrics(fn,name,{siteCount:process.argv.includes('--eight')?8:1,renders:process.argv.includes('--render-quick')})));
  }
  else await acceptance();
}
