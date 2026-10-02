// Cost bench for surface-climate-1 / habitat-suitability-1 (NOT part of npm test).
// Run: node --expose-gc tests/surface-climate.bench.mjs
// Budgets (docs/biome-climate-increment-1-plan-2026-10-02.json plan.budgets):
//   surfaceClimate <= 0.15 us/sample warm, zero heap growth; climateForcingFor
//   table build <= 5 ms/body; niche evaluator <= 1 us/sample for 24 species.
import {galaxies,refByAddress,sector,system} from '../src/catalog.ts';
import {generateBiosphere,biosphereAt} from '../src/biosphere-model.ts';
import {climateForcingFor,clearClimateForcingCache,surfaceClimate,createClimateSample,temperateHabitat} from '../src/surface-climate.ts';
import {compileNicheEvaluator} from '../src/habitat-suitability.ts';

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

// 2. surfaceClimate per sample, warm, plus heap growth across the timed loop.
const sample=surfaceClimate(climateForcingFor(maithea)),out=createClimateSample(),d=[0,0,0];
// Accumulate into a typed array: a captured `let` number would box a HeapNumber per write.
const acc=new Float64Array(1);
const run=()=>{for(let i=0;i<N;i++){d[0]=dirs[i*3];d[1]=dirs[i*3+1];d[2]=dirs[i*3+2];acc[0]+=sample(d,heights[i],out).annualMeanTempK;}};
for(let w=0;w<5;w++)run();
gc();const heap0=process.memoryUsage().heapUsed;
// The machine may be shared with other agents: report the best and median of
// 15 timed passes of 200k samples (the best pass is the uncontended cost).
const reps=15,times=[];for(let r=0;r<reps;r++){const t=performance.now();run();times.push(performance.now()-t);}
const heap1=process.memoryUsage().heapUsed;gc();const heap2=process.memoryUsage().heapUsed;
const us=t=>t*1000/N,sorted=[...times].sort((a,b)=>a-b);
results.surfaceClimateUsPerSample=us(sorted[0]);results.surfaceClimateUsPerSampleMedian=us(sorted[reps>>1]);
results.surfaceClimateHeapGrowthBytesDuringLoop=heap1-heap0;
results.surfaceClimateHeapGrowthBytesAfterGc=heap2-heap0;

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

results.budgets={surfaceClimateUs:.15,tableBuildMs:5,nicheEvaluatorUs:1};
results.pass={
  surfaceClimate:results.surfaceClimateUsPerSample<=.15,
  // 3M warm calls: anything allocating per call would show >= 48 MB here.
  zeroHeapGrowth:results.surfaceClimateHeapGrowthBytesDuringLoop<=4*1024*1024,
  tableBuild:results.tableBuildMsPerBody<=5,
  nicheEvaluator:results.nicheEvaluatorUsPerSample<=1,
};
console.log(JSON.stringify(results,null,2));
