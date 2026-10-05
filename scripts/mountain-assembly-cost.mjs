// Mountains assembly (step A) sampler cost, branch vs main (read-only import of main's src/terrain.ts).
//   node scripts/mountain-assembly-cost.mjs [outFile] [mainRoot]
// Owner decision (c): judged on the WARM RESIDENT cost (budget +8% sampler cost); the cold (first-touch,
// streaming) cost is measured and reported and does not block.
//  1. resident region: 8 in-massif sites x 385^2 samples (125 m) per world, the same points on main and the
//     branch; branch cold first pass, then warm median of 5 passes (the sites' M3 blocks fit the LRU).
//  2. sparse: 1000 Fibonacci directions per world, cold (the streaming case: every in-massif sample is far
//     from the previous one and needs its own M3 block solve).
//  3. weighted resident overhead = (in-massif land share x in-massif warm overhead) + (rest x outside overhead).
//  4. cold streaming tile builds: the 6 L0 tiles of Maithea, main vs branch.
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {waterWorlds,fib} from '../tests/terrain-climate-fixtures.mjs';
import {terrainSampler,TERRAIN_VERSION} from '../src/terrain.ts';
import * as tiles from '../src/planet-tiles.ts';
import {orogenLayout} from '../src/mountain-layout.ts';
import {massifHalfWidthM,MASSIF_ENVELOPE} from '../src/mountain-envelope.ts';
import {carvingBuildStats} from '../src/mountain-carving.ts';

const out=process.argv[2]||'test-results/mountains/assembly-2/cost.json',mainRoot=process.argv[3]||'C:/LLM/IWSDK/universe-atlas';
const M=await import(pathToFileURL(`${mainRoot}/src/terrain.ts`).href),MT=await import(pathToFileURL(`${mainRoot}/src/planet-tiles.ts`).href);
const unit=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const median=a=>[...a].sort((x,y)=>x-y)[a.length>>1];
let sink=0;
const pass=(ts,dirs)=>{const t=performance.now();for(const d of dirs)sink+=ts(d).groundHeightM;return (performance.now()-t)*1e6/dirs.length;};
const report={terrainVersion:TERRAIN_VERSION,main:M.TERRAIN_VERSION,node:process.version,worlds:[]};
for(const world of waterWorlds()){
  const R=world.radiusM,layout=orogenLayout(world),mainTs=M.terrainSampler(world),inMassif=o=>o.belt!==0&&o.halfWidthM>=MASSIF_ENVELOPE.MIN_HALF_WIDTH_M&&Math.abs(o.axisDistanceM)<massifHalfWidthM(o.halfWidthM);
  // Global composition: in-massif land share of the sphere (20000 Fibonacci).
  const fibs=Array.from({length:20000},(_,i)=>fib(i,20000));let inside=0;for(const d of fibs){const o=layout.sample(d);if(inMassif(o)&&mainTs(d).groundHeightM>0)inside++;}
  const share=inside/fibs.length;
  // Sites: land, belt >= .5, on the axis, >= 300 km apart.
  const sites=[];for(let i=0;i<20000&&sites.length<8;i++){const d=fibs[i],o=layout.sample(d);
    if(o.belt<.5||o.halfWidthM<32000||Math.abs(o.axisDistanceM)>3000||mainTs(d).groundHeightM<=0)continue;
    if(sites.some(s=>Math.acos(Math.min(1,s.d[0]*d[0]+s.d[1]*d[1]+s.d[2]*d[2]))*R<300000))continue;sites.push({d,axis:[...o.axis]});}
  const region=[];for(const s of sites){const across=unit(cross(s.d,s.axis));
    for(let p=0;p<385*385;p++){const x=(p%385-192)*125,y=(Math.floor(p/385)-192)*125;region.push(unit(s.d.map((v,j)=>v+(x*s.axis[j]+y*across[j])/R)));}}
  const outside=fibs.filter(d=>!inMassif(layout.sample(d)));
  // Fresh samplers per measurement family; main first (warms the shared JIT for the common code).
  const mainRegion=[pass(mainTs,region)];for(let k=0;k<5;k++)mainRegion.push(pass(mainTs,region));
  const ts=terrainSampler(world);const b0=carvingBuildStats.count,t0=performance.now();
  const cold=pass(ts,region),coldBuilds=carvingBuildStats.count-b0,coldMs=performance.now()-t0;
  const warm=[];for(let k=0;k<5;k++)warm.push(pass(ts,region));const warmBuilds=carvingBuildStats.count-b0-coldBuilds;
  const mainOut=[];const brOut=[];for(let k=0;k<5;k++){mainOut.push(pass(mainTs,outside));brOut.push(pass(ts,outside));}
  // Sparse (streaming-like) sampling: 1000 Fibonacci directions, every in-massif sample is ~one block solve.
  const fib1k=Array.from({length:1000},(_,i)=>fib(i,1000)),g0=carvingBuildStats.count,global1=pass(ts,fib1k),gBuilds=carvingBuildStats.count-g0;
  const mainGlobal=median([pass(mainTs,fib1k),pass(mainTs,fib1k),pass(mainTs,fib1k)]);
  const mR=median(mainRegion.slice(1)),wR=median(warm),mO=median(mainOut),bO=median(brOut);
  const inOver=(wR-mR)/mR,outOver=(bO-mO)/mO,weighted=share*inOver+(1-share)*outOver;
  // Cold tile streaming, Maithea only (the 6 L0 tiles; L0 vertices are ~300 km apart, so in-massif samples
  // each need their own block solve): main vs branch.
  let tileRow=null;
  if(world.name==='Maithea'){const L0=[0,1,2,3,4,5].map(f=>({face:f,level:0,x:0,y:0}));
    const buildAll=(fn,list)=>{const t=performance.now();for(const tl of list)sink+=fn(world,tl).surfaceHeight[0];return performance.now()-t;};
    const tb0=carvingBuildStats.count,mainL0Ms=buildAll(MT.buildTile,L0),branchL0Ms=buildAll(tiles.buildTile,L0);
    tileRow={tiles:'L0 x6',mainL0Ms,branchL0Ms,carvingBlockBuilds:carvingBuildStats.count-tb0};}
  const row={world:world.name,inMassifLandShare:share,regionSamples:region.length,
    mainRegionNs:mR,branchColdRegionNs:cold,coldBlockBuilds:coldBuilds,coldRegionMs:coldMs,branchWarmRegionNs:wR,warmRounds:warm,warmRebuilds:warmBuilds,
    inMassifWarmOverhead:inOver,mainOutsideNs:mO,branchOutsideNs:bO,outsideOverhead:outOver,weightedResidentOverhead:weighted,
    coldInMassifOverhead:(cold-mR)/mR,
    sparse1000:{mainNs:mainGlobal,branchColdNs:global1,blockBuilds:gBuilds,ratio:global1/mainGlobal},
    tiles:tileRow};
  report.worlds.push(row);writeFileSync(out,JSON.stringify(report,null,1)+'\n');
  console.log(`${world.name}: massif land share ${(100*share).toFixed(2)}%; region main ${mR.toFixed(0)} ns, branch warm ${wR.toFixed(0)} ns (+${(100*inOver).toFixed(1)}%), cold ${cold.toFixed(0)} ns (${coldBuilds} block builds, ${(coldMs/1000).toFixed(1)} s); outside main ${mO.toFixed(0)} vs ${bO.toFixed(0)} ns (${(100*outOver).toFixed(1)}%); WEIGHTED RESIDENT ${(100*weighted).toFixed(2)}%`);
  console.log(`  sparse 1000 Fibonacci: main ${mainGlobal.toFixed(0)} ns, branch cold ${global1.toFixed(0)} ns/sample (${gBuilds} block builds, x${(global1/mainGlobal).toFixed(0)})`+(tileRow?`; L0 x6 tiles: main ${tileRow.mainL0Ms.toFixed(0)} ms, branch ${tileRow.branchL0Ms.toFixed(0)} ms (${tileRow.carvingBlockBuilds} block builds)`:''));
}
report.sink=sink;writeFileSync(out,JSON.stringify(report,null,1)+'\n');
