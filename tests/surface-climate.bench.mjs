// Cost bench for surface-climate-1 / habitat-suitability-1 (NOT part of npm test).
// Run: node --expose-gc tests/surface-climate.bench.mjs
// Budgets (docs/biome-climate-increment-1-plan-2026-10-02.json plan.budgets):
//   surfaceClimate <= 0.15 us/sample warm; climateForcingFor table build <= 5 ms/body;
//   niche evaluator <= 1 us/sample for 24 species.
// Allocation (climate-m1 decision-5, Opus-decided on Kasper's instruction, overrulable;
// docs/surface-climate-v2.md section 8): surfaceClimate allocates <= 20 B per call,
// counted from GC events (v8.GCProfiler) over the 15 timed passes, and a no-op control
// sampler in the same loop shape stays < 1 B per call (else the measurement is invalid).
// Strict zero stays a goal, not a gate. Exit code 1 when any pass entry is false.
import {galaxies,refByAddress,sector,system} from '../src/catalog.ts';
import {generateBiosphere,biosphereAt} from '../src/biosphere-model.ts';
import {climateForcingFor,clearClimateForcingCache,surfaceClimate,createClimateSample,temperateHabitat} from '../src/surface-climate.ts';
import {compileNicheEvaluator} from '../src/habitat-suitability.ts';
import v8 from 'node:v8';

const g=galaxies('LETHRA-001')[0];
const maithea=system(refByAddress(g,'G001/C2128,0,1/0')).planets[1];
const bodies=[];
for(let sx=266;bodies.length<40;sx++)for(const ref of sector(g,[sx,0,0]).refs){for(const b of system(ref).planets)if(temperateHabitat(b))bodies.push(b);if(bodies.length>=40)break;}
const gc=globalThis.gc??(()=>{});
const N=200000;
const dirs=new Float64Array(N*3),heights=new Float64Array(N);
for(let i=0;i<N;i++){const y=1-2*(i+.5)/N,p=i*2.399963229728653,r=Math.sqrt(1-y*y);dirs[i*3]=Math.cos(p)*r;dirs[i*3+1]=y;dirs[i*3+2]=Math.sin(p)*r;heights[i]=((i*7919)%9000)-500;}
const results={node:process.version,gcExposed:!!globalThis.gc};

// 1. Table build per body (cold cache, warmed JIT).
clearClimateForcingCache();for(const b of bodies.slice(0,5))climateForcingFor(b);
clearClimateForcingCache();
const t0=performance.now();for(const b of bodies)climateForcingFor(b);
results.tableBuildMsPerBody=(performance.now()-t0)/bodies.length;

// 2. surfaceClimate per sample, warm, plus allocation across the timed loop.
const sample=surfaceClimate(climateForcingFor(maithea)),out=createClimateSample(),d=[0,0,0];
// Accumulate into a typed array: a captured `let` number would box a HeapNumber per write.
const acc=new Float64Array(1);
const run=()=>{for(let i=0;i<N;i++){d[0]=dirs[i*3];d[1]=dirs[i*3+1];d[2]=dirs[i*3+2];acc[0]+=sample(d,heights[i],out).annualMeanTempK;}};
for(let w=0;w<5;w++)run();
// Allocation is counted from GC events, not from heap growth. A heap-growth check
// (heapUsed after minus before the loop) is blind: a young-generation scavenge frees
// short-lived garbage while the loop runs, so 3M calls that each box a double (~83 B
// per call on climate-m1 3ab2eab, 118 scavenges) still end with < 1 MB of growth.
// The bytes each GC inside the loop freed, plus the non-negative net growth, give a
// conservative (upper) estimate of what the loop allocated; profiler bookkeeping is
// included. The no-op control (same loop shape, its own function literal so each call
// site stays monomorphic) checks that the loop overhead stays below 1 B per call.
const allocCount=(fn,passes,times)=>{
  gc();gc();
  const heap0=process.memoryUsage().heapUsed,prof=new v8.GCProfiler();prof.start();
  for(let r=0;r<passes;r++){const t=performance.now();fn();if(times)times.push(performance.now()-t);}
  const stats=prof.stop()?.statistics??[],heap1=process.memoryUsage().heapUsed;
  let freed=0;for(const st of stats)freed+=Math.max(0,(st.beforeGC?.heapStatistics?.usedHeapSize??0)-(st.afterGC?.heapStatistics?.usedHeapSize??0));
  const calls=passes*N;
  return {calls,gcEvents:stats.length,heapGrowthBytes:heap1-heap0,freedByGcBytes:freed,bytesPerCall:(Math.max(0,heap1-heap0)+freed)/calls};
};
// The machine may be shared with other agents: report the best and median of
// 15 timed passes of 200k samples (the best pass is the uncontended cost).
const reps=15,times=[];
results.surfaceClimateAlloc=allocCount(run,reps,times);
const us=t=>t*1000/N,sorted=[...times].sort((a,b)=>a-b);
results.surfaceClimateUsPerSample=us(sorted[0]);results.surfaceClimateUsPerSampleMedian=us(sorted[reps>>1]);
const control=(dd,h,o)=>{o.annualMeanTempK=dd[0]*h+1.5;o.effectiveMoisture=dd[1]*0.5+0.25;return o;};
const runControl=()=>{for(let i=0;i<N;i++){d[0]=dirs[i*3];d[1]=dirs[i*3+1];d[2]=dirs[i*3+2];acc[0]+=control(d,heights[i],out).annualMeanTempK;}};
for(let w=0;w<5;w++)runControl();
results.controlAlloc=allocCount(runControl,reps,null);

// 3. Niche evaluator, 24 species (plants + animals per sample).
const world=generateBiosphere('BENCH','temperate',maithea.id),date=Math.max(...world.species.map(s=>s.birthMyr))+1;
// All 24 catalogue species (the dated list drops the extinct branching founder).
void biosphereAt(world,date);
const ev=compileNicheEvaluator(world.species,'temperate',maithea.temperatureK);
const pOut=new Float32Array(ev.plantIds.length),aOut=new Float32Array(ev.animalIds.length),local={temperatureK:0,moisture:0,slope01:.2,reachable:true};
const runEv=()=>{for(let i=0;i<N;i++){sample([dirs[i*3],dirs[i*3+1],dirs[i*3+2]],heights[i],out);local.temperatureK=out.annualMeanTempK;local.moisture=out.effectiveMoisture;ev.plants(local,pOut);ev.animals(local,aOut);acc[0]+=pOut[0]+aOut[0];}};
// Climate alone with the same per-iteration array literal, to subtract.
const runClimateOnly=()=>{for(let i=0;i<N;i++){sample([dirs[i*3],dirs[i*3+1],dirs[i*3+2]],heights[i],out);acc[0]+=out.annualMeanTempK;}};
for(let w=0;w<3;w++){runEv();runClimateOnly();}
const best=fn=>{let b=Infinity;for(let r=0;r<reps;r++){const t=performance.now();fn();b=Math.min(b,performance.now()-t);}return b;};
const evTotal=best(runEv),climOnly=best(runClimateOnly);
results.speciesEvaluated=ev.plantIds.length+ev.animalIds.length;
results.nicheEvaluatorUsPerSample=(evTotal-climOnly)*1000/N;
results.sink=Number.isFinite(acc[0]);

results.budgets={surfaceClimateUs:.15,surfaceClimateBytesPerCall:20,controlBytesPerCall:1,tableBuildMs:5,nicheEvaluatorUs:1};
results.pass={
  surfaceClimate:results.surfaceClimateUsPerSample<=.15,
  // GC-counted bytes per call over the 15 timed passes (3M warm calls); valid only
  // while the no-op control in the same loop shape stays below 1 B per call.
  allocation:results.surfaceClimateAlloc.bytesPerCall<=20,
  allocationControlValid:results.controlAlloc.bytesPerCall<1,
  tableBuild:results.tableBuildMsPerBody<=5,
  nicheEvaluator:results.nicheEvaluatorUsPerSample<=1,
};
results.ok=Object.values(results.pass).every(Boolean);
console.log(JSON.stringify(results,null,2));
if(!results.ok)process.exitCode=1;
