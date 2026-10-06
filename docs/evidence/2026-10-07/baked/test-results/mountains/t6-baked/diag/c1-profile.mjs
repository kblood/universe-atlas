// Mountains assembly (step A) sampler cost: a checkout with the assembly WIRED into terrain.ts (e.g. branch
// commit 92afaa3, or 2744237 for M1+M2 only) against main (read-only import of main's src/terrain.ts).
//   node scripts/mountain-assembly-cost.mjs <world> [outFile] [mainRoot] [--l0] [--same-version (M1+M2-only commit)]
// Run once per world in a FRESH process (M3's block memo is module-global, so only the first touch in a process is
// cold). Refuses to run when this checkout's TERRAIN_VERSION equals main's (nothing wired to measure).
// Owner decision (c): judged on the WARM RESIDENT cost (budget +8% sampler cost); cold (first-touch, streaming)
// cost is measured and reported.
//  1. region: 8 in-massif sites x 385^2 samples (125 m, axis-centred, 48 km) - the same points on main and the
//     branch; branch cold first pass, then 5 warm passes (asserted: no block rebuilds while warm).
//  2. outside: Fibonacci directions outside every massif (M1 layout + identity path only), 5 interleaved passes.
//  3. weighted resident overhead = (s Bin + (1-s) Bout) / (s Min + (1-s) Mout) - 1, s = in-massif land share of
//     the sphere (20000 Fibonacci), B/M branch/main ns per sample.
//  4. sparse: 1000 Fibonacci directions, cold (streaming-like: every in-massif sample needs its own block solve).
//  5. --l0: the 6 L0 tiles, main vs branch, cold.
import {writeFileSync,existsSync,readFileSync} from 'node:fs';
import {Session} from 'node:inspector/promises';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {waterWorlds,fib} from '../tests/terrain-climate-fixtures.mjs';
import {terrainSampler,TERRAIN_VERSION} from '../src/terrain.ts';
import * as tiles from '../src/planet-tiles.ts';
import {orogenLayout} from '../src/mountain-layout.ts';
import {massifHalfWidthM,MASSIF_ENVELOPE} from '../src/mountain-envelope.ts';
import {carvingBuildStats} from '../src/mountain-carving.ts';

const args=process.argv.slice(2).filter(a=>!a.startsWith('--')),l0=process.argv.includes('--l0');
const [worldName,out='test-results/mountains/assembly-2/cost.json',mainRoot='C:/LLM/IWSDK/universe-atlas']=args;
const M=await import(pathToFileURL(`${mainRoot}/src/terrain.ts`).href),MT=await import(pathToFileURL(`${mainRoot}/src/planet-tiles.ts`).href);
const wiredSource=readFileSync(new URL('../src/terrain.ts',import.meta.url),'utf8').includes('orogenLayout(body)');
if(!wiredSource)throw new Error('this checkout has no orogen layout wired into terrain.ts');
if(M.TERRAIN_VERSION===TERRAIN_VERSION&&!process.argv.includes('--same-version'))throw new Error(`nothing wired: this checkout and main are both ${TERRAIN_VERSION}`);
const world=waterWorlds().find(b=>b.name===worldName);if(!world)throw new Error(`unknown world ${worldName}`);
const unit=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const median=a=>[...a].sort((x,y)=>x-y)[a.length>>1];
let sink=0;
const pass=(ts,dirs)=>{const t=performance.now();for(const d of dirs)sink+=ts(d).groundHeightM;return (performance.now()-t)*1e6/dirs.length;};
const R=world.radiusM,layout=orogenLayout(world),mainTs=M.terrainSampler(world),ts=terrainSampler(world);
const inMassif=o=>o.belt!==0&&o.halfWidthM>=MASSIF_ENVELOPE.MIN_HALF_WIDTH_M&&Math.abs(o.axisDistanceM)<massifHalfWidthM(o.halfWidthM);
const fibs=Array.from({length:20000},(_,i)=>fib(i,20000));let inside=0;
for(const d of fibs){if(inMassif(layout.sample(d))&&mainTs(d).groundHeightM>0)inside++;}
const share=inside/fibs.length;
// Sparse cold first (nothing has touched M3 yet in this process).
const fib1k=Array.from({length:1000},(_,i)=>fib(i,1000));let sparse;
{const b0=carvingBuildStats.count,t=pass(ts,fib1k),m=median([pass(mainTs,fib1k),pass(mainTs,fib1k),pass(mainTs,fib1k)]);
  sparse={mainNs:m,branchColdNs:t,blockBuilds:carvingBuildStats.count-b0,ratio:t/m};}
const sites=[];for(let i=0;i<20000&&sites.length<8;i++){const d=fibs[i],o=layout.sample(d);
  if(o.belt<.5||o.halfWidthM<32000||Math.abs(o.axisDistanceM)>3000||mainTs(d).groundHeightM<=0)continue;
  if(sites.some(s=>Math.acos(Math.min(1,s.d[0]*d[0]+s.d[1]*d[1]+s.d[2]*d[2]))*R<300000))continue;sites.push({d,axis:[...o.axis]});}
const region=[];for(const s of sites){const across=unit(cross(s.d,s.axis));
  for(let p=0;p<385*385;p++){const x=(p%385-192)*125,y=(Math.floor(p/385)-192)*125;region.push(unit(s.d.map((v,j)=>v+(x*s.axis[j]+y*across[j])/R)));}}
const outside=fibs.filter(d=>!inMassif(layout.sample(d)));
const b0=carvingBuildStats.count,t0=performance.now(),cold=pass(ts,region),coldBuilds=carvingBuildStats.count-b0,coldMs=performance.now()-t0;
const mainRegion=[],warm=[];const b1=carvingBuildStats.count;
for(let k=0;k<5;k++){mainRegion.push(pass(mainTs,region));warm.push(pass(ts,region));}
const warmRebuilds=carvingBuildStats.count-b1;if(warmRebuilds!==0)throw new Error(`region not resident: ${warmRebuilds} rebuilds while warm`);
const mainOut=[],brOut=[];for(let k=0;k<5;k++){mainOut.push(pass(mainTs,outside));brOut.push(pass(ts,outside));}

const session=new Session();session.connect();await session.post('Profiler.enable');await session.post('Profiler.setSamplingInterval',{interval:50});
await session.post('Profiler.start');
const tP=[];for(let k=0;k<30;k++)tP.push(pass(ts,outside));
const {profile}=await session.post('Profiler.stop');
const self=new Map();const dt=profile.timeDeltas;const byId=new Map(profile.nodes.map(n=>[n.id,n]));
const cnt=new Map();for(const s of profile.samples)cnt.set(s,(cnt.get(s)||0)+1);
let tot=0;for(const [id,c] of cnt){const n=byId.get(id),cf=n.callFrame,k=cf.functionName+' '+cf.url.split('/').pop()+':'+cf.lineNumber;self.set(k,(self.get(k)||0)+c);tot+=c;}
console.log('outside ns/sample median',median(tP).toFixed(0),'main',median(mainOut).toFixed(0),'branch',median(brOut).toFixed(0));
for(const [k,c] of [...self].sort((a,b)=>b[1]-a[1]).slice(0,25))console.log((100*c/tot).toFixed(1).padStart(5),k);
