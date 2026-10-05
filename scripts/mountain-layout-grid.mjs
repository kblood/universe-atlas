// M1 massif-band rejection grid measurement (mountains cost plan T1, docs/mountains-opus-decisions-2026-10-05.md Q2).
//   node scripts/mountain-layout-grid.mjs [outFile] [mainRoot]
// Correctness (identity, conservativeness, area) is HARD in tests/mountain-layout-grid.test.mjs; this script
// reports cost:
//  1. build: cold grid build per body (4 water worlds + the 60-body M1 corpus), each in a FRESH child process
//     (the first sampleWithinWithA0 call builds the grid; the budget is <= 50 ms per body).
//  2. outside: per world, the layout-level cost of the massif-band call on the Fibonacci directions outside
//     every massif (the cost script's outside set), against main's terrain sampler on the same directions:
//     added = sampleWithinWithA0 ns - a0-only ns, ratio = added / main terrain ns. (The wired terrain-level
//     number needs a checkout with the assembly wired into terrain.ts: scripts/mountain-assembly-cost.mjs.)
import {spawnSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {galaxies,sector,system} from '../src/catalog.ts';
import {orogenLayout,continentalA0,bandGridFlaggedCells} from '../src/mountain-layout.ts';
import {massifHalfWidthM,MASSIF_ENVELOPE} from '../src/mountain-envelope.ts';
import {waterWorlds,fib} from '../tests/terrain-climate-fixtures.mjs';

const MAX=MASSIF_ENVELOPE.MAX_HALF_WIDTH_M,MIN=MASSIF_ENVELOPE.MIN_HALF_WIDTH_M;
const worlds=waterWorlds();
function bodies(){
  const refs=[];
  for(const g of galaxies('LETHRA-GOLDEN-001').slice(0,3))for(const c of [[266,0,0],[0,0,0],[-2,-1,-2],[12,-4,7]])refs.push(...sector(g,c).refs);
  const all=refs.slice(0,220).map(system).flatMap(s=>[...s.planets,...s.moons]),pick=[];
  for(const type of [...new Set(all.map(b=>b.type))])pick.push(...all.filter(b=>b.type===type).slice(0,10));
  return [...worlds,...pick.filter(b=>!worlds.some(w=>w.id===b.id)).slice(0,60)];
}
const child=process.argv.indexOf('--child');
if(child>=0){
  const b=bodies()[+process.argv[child+1]],l=orogenLayout(b),t=performance.now();
  l.sampleWithinWithA0([0,0,1],1000,MAX,undefined,MIN);
  const ms=performance.now()-t,g=l.bandGrid(MAX,MIN);
  process.stdout.write(JSON.stringify({name:b.name,type:b.type,radiusM:Math.round(b.radiusM),belts:l.belts.length,faceCells:g.faceCells,all:g.all,nodes:g.nodes,flaggedCells:bandGridFlaggedCells(g),buildMs:+ms.toFixed(2)}));
  process.exit(0);
}
const args=process.argv.slice(2).filter(a=>!a.startsWith('--'));
const [out='test-results/mountains/layout-grid.json',mainRoot='C:/LLM/IWSDK/universe-atlas']=args;
const self=fileURLToPath(import.meta.url),cwd=fileURLToPath(new URL('..',import.meta.url));
const build=bodies().map((_,i)=>{
  const r=spawnSync(process.execPath,[self,'--child',String(i)],{cwd,encoding:'utf8'});
  if(r.status!==0)throw new Error(r.stderr);
  return JSON.parse(r.stdout);
});
const M=await import(pathToFileURL(`${mainRoot}/src/terrain.ts`).href);
const median=a=>[...a].sort((x,y)=>x-y)[a.length>>1];
let sink=0;
const time=(n,f)=>{const r=[];for(let k=0;k<15;k++){const t=performance.now();for(let i=0;i<n;i++)sink+=f(i);r.push((performance.now()-t)*1e6/n);}return median(r);};
const outside=[];
for(const w of worlds){
  const l=orogenLayout(w),a0=continentalA0(w),main=M.terrainSampler(w);
  const inMassif=o=>o.belt!==0&&o.halfWidthM>=MIN&&Math.abs(o.axisDistanceM)<massifHalfWidthM(o.halfWidthM);
  const dirs=Array.from({length:20000},(_,i)=>fib(i,20000)).filter(d=>!inMassif(l.sample(d)));
  const o={belt:0,axis:[0,0,0],axisDistanceM:0,halfWidthM:0,beltIndex:-1,alongM:0};
  const mainNs=time(dirs.length,i=>main(dirs[i]).groundHeightM);
  const a0Ns=time(dirs.length,i=>a0(dirs[i]));
  const withinNs=time(dirs.length,i=>{const d=dirs[i];return l.sampleWithinWithA0(d,a0(d),MAX,o,MIN).belt;});
  const fullNs=time(dirs.length,i=>{const d=dirs[i];return l.sampleWithA0(d,a0(d),o).belt;});
  const flaggedLand=dirs.filter(d=>a0(d)>0&&l.bandCellFlagged(d,MAX,MIN)).length;
  outside.push({world:w.name,samples:dirs.length,flaggedLandOutside:flaggedLand,mainTerrainNs:mainNs,a0Ns,withinNs,ungriddedNs:fullNs,
    addedRatio:(withinNs-a0Ns)/mainNs,ungriddedAddedRatio:(fullNs-a0Ns)/mainNs});
}
const report={node:process.version,build,buildMaxMs:Math.max(...build.map(b=>b.buildMs)),outside,sink};
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(report,null,1)+'\n');
for(const b of build.slice(0,4))console.log(`build ${b.name}: N=${b.faceCells} nodes ${b.nodes} ${b.buildMs} ms`);
console.log(`build max over ${build.length} bodies: ${report.buildMaxMs} ms (${build.find(b=>b.buildMs===report.buildMaxMs).name})`);
for(const r of outside)console.log(`outside ${r.world}: ${r.samples} samples, ${r.flaggedLandOutside} flagged land; main terrain ${r.mainTerrainNs.toFixed(1)} ns; added by the band call ${(r.withinNs-r.a0Ns).toFixed(1)} ns = ${(100*r.addedRatio).toFixed(2)}% (ungridded ${(100*r.ungriddedAddedRatio).toFixed(1)}%)`);
