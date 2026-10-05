// M3 candidate F (mountain-carving-2) driver: acceptance (pooled + per seed), coast safety,
// L6/L8 retention proxy, renders, and the cost benchmark. Not a test; writes evidence to
// test-results/mountains/M3-r5/F/.
//   node scripts/mountain-carving-f.mjs            acceptance + renders (exit 1 if a row fails)
//   node scripts/mountain-carving-f.mjs --bench    cold / second-pass / resident-warm cost
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {measureSites,judgeM3,hillshade,writePng,rasterFromArray,flowAccumulationD8,localMap,frame,q} from '../tests/helpers/mountain-metrics.mjs';
import {R,SEED_BASE,SITES,rampArgs,rampSampler,candidateMetrics,coast,retention} from './mountain-render-carving.mjs';
import {carvingFM,carvingBuildStats,MOUNTAIN_CARVING,MOUNTAIN_CARVING_VERSION} from '../src/mountain-carving.ts';

const OUT=new URL('../test-results/mountains/M3-r5/F/',import.meta.url);mkdirSync(OUT,{recursive:true});
const save=(name,data)=>writeFileSync(new URL(name,OUT),JSON.stringify(data,null,2)+'\n');
const sourceSha=()=>createHash('sha256').update(readFileSync(new URL('../src/mountain-carving.ts',import.meta.url))).digest('hex');
const rows=r=>Object.fromEntries(r.rows.map(x=>[x.id,{actual:x.actual,pass:x.pass}]));

function renderSquare(name,seed,x0=-24000){
  const n=385,h=new Float64Array(n*n);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=x0+i*125,y=(j-192)*125,e=3000*Math.max(0,1-Math.abs(y)/30000);
    h[j*n+i]=e+carvingFM(x,y,30000,e,Math.abs(y)<30000?1:0,seed);}
  const r=rasterFromArray(h,n,125);writePng(new URL(name+'-48km-hillshade.png',OUT),n,n,hillshade(r,5000));
  const f=flowAccumulationD8(r),rgb=Buffer.alloc(n*n*3);let max=0;for(const a of f.accumulation)max=Math.max(max,a);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const v=Math.round(255*Math.log1p(f.accumulation[j*n+i])/Math.log1p(max)),k=((n-1-j)*n+i)*3;rgb[k]=rgb[k+1]=rgb[k+2]=v;}
  writePng(new URL(name+'-48km-flow.png',OUT),n,n,rgb);
}
function renderStrip(name,seed){
  // 192 km x 60 km: overlapping square panels so shading uses genuine neighbours.
  const step=125,n=483,width=1537,height=481,rgb=Buffer.alloc(width*height*3);
  for(let start=0;start<width;start+=n-2){const h=new Float64Array(n*n);
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=(start+i-1)*step-96000,y=(j-241)*step,e=3000*Math.max(0,1-Math.abs(y)/30000);h[j*n+i]=e+carvingFM(x,y,30000,e,1,seed);}
    const sh=hillshade(rasterFromArray(h,n,step),5000),cols=Math.min(n-2,width-start);
    for(let j=0;j<height;j++)sh.copy(rgb,(j*width+start)*3,((j+1)*n+1)*3,((j+1)*n+1+cols)*3);}
  writePng(new URL(name+'-strip-192km-hillshade.png',OUT),width,height,rgb);
}
async function acceptance(){
  const t0=performance.now();
  console.log('F pooled');const pooled=candidateMetrics(carvingFM,'F',{renders:false}),perSeed=[];
  for(let i=0;i<SITES.length;i++){const r=candidateMetrics(carvingFM,'F-seed'+i,{sites:[SITES[i]],renders:false});
    perSeed.push({seed:SEED_BASE+i,site:i,rows:rows(r),coreSlopeP50:r.coreSlopeP50});console.log('F seed',SEED_BASE+i,JSON.stringify(rows(r)));}
  const safety=coast(carvingFM),proxy=retention(rampSampler(carvingFM)),envelopeRetention=retention(rampSampler(()=>0));
  for(const k of [0,3,6])renderSquare('F-seed'+k,SEED_BASE+k);
  renderStrip('F-seed0',SEED_BASE);renderStrip('F-seed5',SEED_BASE+5);
  const pass=pooled.rows.every(r=>r.pass)&&perSeed.every(s=>Object.values(s.rows).every(r=>r.pass))&&!safety.violations&&!safety.zeroOutsideViolations&&!safety.positiveCarving;
  const result={class:'CONTRACT',version:MOUNTAIN_CARVING_VERSION,constants:MOUNTAIN_CARVING,sourceSha256:sourceSha(),
    pooled:{rows:rows(pooled),coreSlopeP50:pooled.coreSlopeP50,wholeRasterOver30:pooled.wholeRasterOver30},perSeed,coast:safety,
    retention:{class:'INFO',note:'Point-sampled proxy omits production peak correction.',F:proxy,envelope:envelopeRetention},
    builds:carvingBuildStats.count,seconds:(performance.now()-t0)/1000,pass};
  save('report.json',result);console.table(pooled.rows.map(({id,actual,pass})=>({id,actual,pass})));
  console.log('ACCEPTANCE '+(pass?'PASS':'BLOCKED'));if(!pass)process.exitCode=1;
}
async function bench(){
  const args=[],source=sourceSha();
  for(const {d} of SITES){const map=localMap(d,frame(d),R);for(let j=0;j<385;j++)for(let i=0;i<385;i++)args.push(rampArgs(map((i-192)*125,(j-192)*125)));}
  let checksum=0;
  const run=a=>{const b=carvingBuildStats.count,t=performance.now();for(const v of a)checksum+=carvingFM(...v);return {ms:performance.now()-t,builds:carvingBuildStats.count-b};};
  const cold=run(args),second=run(args);
  // Resident warm: each site's working set is preloaded outside timing (the LRU holds a
  // site, not all eight), then timed over five rounds; median of the rounds.
  const site=args.length/SITES.length,rounds=[];let residentBuilds=0;
  for(let round=0;round<5;round++){let ms=0;
    for(let s=0;s<SITES.length;s++){const a=args.slice(s*site,(s+1)*site);run(a);const r=run(a);ms+=r.ms;residentBuilds+=r.builds;}
    rounds.push(ms*1e6/args.length);}
  const buildMs=[];for(let id=40;id<47;id++){const t=performance.now();carvingFM(id*16000+1,0,30000,3000,1,SEED_BASE);buildMs.push(performance.now()-t);}
  const {terrainSampler}=await import('../src/terrain.ts');
  const {maithea,fib}=await import('../tests/terrain-climate-fixtures.mjs');
  const ts=terrainSampler(maithea()),dirs=Array.from({length:args.length},(_,i)=>fib(i,args.length));
  for(let i=0;i<10000;i++)checksum+=ts(dirs[i]).groundHeightM;
  const terrainRounds=[];for(let r=0;r<3;r++){const t=performance.now();for(const d of dirs)checksum+=ts(d).groundHeightM;terrainRounds.push((performance.now()-t)*1e6/args.length);}
  if(source!==sourceSha())throw new Error('Source changed during benchmark');
  const residentNs=q(rounds,.5),terrainNs=q(terrainRounds,.5),coldNs=cold.ms*1e6/args.length;
  const result={class:'INFO',sourceSha256:source,samples:args.length,
    nsPerSample:{emptyCache:coldNs,secondPass:second.ms*1e6/args.length,residentWarm:residentNs,residentRounds:rounds,terrain:terrainNs,terrainRounds},
    coldBuilds:cold.builds,secondPassBuilds:second.builds,residentBuilds,blockBuildMs:{median:q(buildMs,.5),samples:buildMs},
    weightedRatioAt10Pct:{cold:.1*coldNs/terrainNs,warmResident:.1*residentNs/terrainNs},budget:.08,
    budgetRule:'Owner decision (c) 2026-10-05: judged on warm-cache resident cost per region; cold first-touch is reported, non-blocking.',
    memoBytes:MOUNTAIN_CARVING.CACHE*(MOUNTAIN_CARVING.ROWS+1)*(MOUNTAIN_CARVING.CORE+1)*4,checksum,
    note:'The 8 site rasters touch 28 blocks, which fit in the 32-block LRU, so the second pass rebuilds nothing. Single machine, CPU quiet slot not acquired.'};
  save('benchmark.json',result);console.log('BENCH F '+JSON.stringify(result));
  if(result.weightedRatioAt10Pct.warmResident>.08)process.exitCode=1;
}
if(process.argv.includes('--bench'))await bench();else await acceptance();
