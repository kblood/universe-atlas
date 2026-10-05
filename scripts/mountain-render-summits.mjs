// Offline M4 acceptance + INFO studies. No network, browser, GPU or visual judge.
import {mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {SUMMIT_FIXTURE,SUMMIT_THRESHOLDS,summitRaster,measureSummits,poolSummits,judgeM4} from '../tests/helpers/mountain-summits.mjs';
import {raster,syntheticSampler,prominence,hillshade,writePng} from '../tests/helpers/mountain-metrics.mjs';
import {buildErodedControl,centralCrop,CONTROL_SITES,ERODED_CONTROL} from '../tests/helpers/mountain-eroded-control.mjs';
import {steadyStateStrip,stripSampler,RAMP} from '../tests/helpers/mountain-calibration-controls.mjs';
import {waterWorlds,fib} from '../tests/terrain-climate-fixtures.mjs';
import {tectonicReliefOf,bodyHeightBoundM} from '../src/terrain.ts';
import {orogenLayout} from '../src/mountain-layout.ts';
import {maxEnvelopeM} from '../src/mountain-envelope.ts';

const dir='test-results/mountains/M4',start=performance.now();mkdirSync(dir,{recursive:true});
writeFileSync(`${dir}/run.log`,'');
const log=s=>{console.log(s);appendFileSync(`${dir}/run.log`,s+'\n');};
const report={fixture:SUMMIT_FIXTURE,thresholds:SUMMIT_THRESHOLDS,method:{class:'CONTRACT',row:'R4',implementation:'unchanged harness prominence()',pin:'tests/mountain-metrics.test.mjs: HARD: exact two-peak prominence and border censoring',border:'component reaching border before key saddle dropped; saddle must be interior; highest never counted'},renders:[],sweeps:[],realPairs:[],controls:[]};
const save=()=>writeFileSync(`${dir}/report.json`,JSON.stringify(report,null,2)+'\n');
function render(name,r){
  const rgb=hillshade(r,5000);writePng(`${dir}/${name}-plain.png`,r.n,r.n,rgb);
  for(const {p,prom} of prominence(r).filter(p=>p.prom>=300)){
    const x=p%r.n,y=r.n-1-Math.floor(p/r.n),size=2+Math.floor(Math.sqrt(prom/300));
    for(let dy=-size;dy<=size;dy++)for(let dx=-size;dx<=size;dx++){
      if(Math.abs(dx)!==size&&Math.abs(dy)!==size)continue;
      const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=r.n||yy>=r.n)continue;
      rgb.set([225,70,35],(yy*r.n+xx)*3);
    }
  }
  writePng(`${dir}/${name}-peaks.png`,r.n,r.n,rgb);
  report.renders.push({class:'VISUAL-ADVISORY',name,n:r.n,step:r.step,site:r.site??null,bound:5000,marker:'square radius 2+floor(sqrt(prominence/300)), RGB 225,70,35'});
}
const compact=m=>{const {peaks,...rest}=m;return {...rest,resolvedPeaks:peaks.length};};
function measurePair(options){const local=summitRaster(options),wide=summitRaster({...options,step:250});return {local,wide,l:measureSummits(local),w:measureSummits(wide)};}
function summarize(local,wide){const pooled=poolSummits(local,wide);return {...pooled,perSeed:local.map((l,i)=>({seed:730201+i,...compact(l),...poolSummits([l],[wide[i]])}))};}

const local=[],wide=[];
for(let site=0;site<8;site++){
  const p=measurePair({site});local.push(p.l);wide.push(p.w);
  if(site===0||site===3)render(`composed-${730201+site}-48km`,p.local);
  if(site===0)render('composed-730201-96km',p.wide);
  log(`CONTRACT acceptance seed ${730201+site}: density ${p.l.density}`);
}
report.acceptance=summarize(local,wide);report.acceptance.rows=judgeM4(report.acceptance);
report.upperBound={class:'INFO',proposed:25,status:'UNCALIBRATED; never gated',actual:report.acceptance.density};
report.placementCaveat='Element placement holds by construction (U=0 and C=+0 where belt=0); belt>=0.5 is measured. Meaningful assembled placement remains MTN-6.';
const dome=raster(syntheticSampler(RAMP.R,'dome'),[1,0,0],RAMP.R,385,125),bare=summitRaster({bare:true}),shift=summitRaster({shift:32000,step:250}),mutation=summitRaster({bare:true,gain:1.01});
report.negative={dome:compact(measureSummits(dome)),bare:compact(measureSummits(bare)),shift:poolSummits([],[measureSummits(shift)]),boundMutation:compact(measureSummits(mutation))};
render('dome-48km',dome);render('bare-envelope-48km',bare);render('off-belt-shift-96km',shift);save();

// Keep each seed/width's M3 blocks warm across taus; evaluate the exact composition every time.
const taus=[.456,.603,.771,.789,3000/3640,1];
for(const w of [32000,48000,64000,71600,90100,129700,220000]){
  const bins=taus.map(tau=>({tau,w,local:[],wide:[]}));
  for(let site=0;site<8;site++)for(const b of bins){const p=measurePair({site,w,tau:b.tau});b.local.push(p.l);b.wide.push(p.w);}
  for(const b of bins)report.sweeps.push({class:'INFO',tau:b.tau,w,...summarize(b.local,b.wide)});
  log(`INFO sweep w=${w}: ${bins.map(b=>`${b.tau.toFixed(6)}=${poolSummits(b.local,b.wide).density.toFixed(3)}`).join(', ')}`);save();
}

for(const world of waterWorlds()){
  const tau=tectonicReliefOf(world),layout=orogenLayout(world);let site;
  // Exactly the first M2 spectrum-site rule (no separation test needed for first site).
  for(let i=0;i<20000;i++){const d=fib(i,20000),b=layout.sample(d);if(b.belt>=.5&&b.halfWidthM>=32000){site={d,b};break;}}
  if(!site)throw new Error(`No M2 site for ${world.name}`);
  const w=site.b.halfWidthM,bodyBound=bodyHeightBoundM(world).maxM;
  for(const offset of [0,.4]){
    const ls=[],ws=[];let bodyViolations=0;
    for(let seedSite=0;seedSite<8;seedSite++){
      const p=measurePair({site:seedSite,w,tau,y0:offset*w});ls.push(p.l);ws.push(p.w);
      for(const r of [p.local,p.wide])for(const h of r.h)if(!Number.isFinite(h)||h>bodyBound)bodyViolations++;
    }
    const result={class:'INFO',world:world.name,tau,w,y0:offset*w,source:'orogenLayout; first M2 Fibonacci spectrum site',layoutSite:site,...summarize(ls,ws),bodyBound,maxEnvelope:maxEnvelopeM(tau,'water'),bodyViolations};
    report.realPairs.push(result);log(`INFO ${world.name}, y/w=${offset}: density=${result.density}, max=${result.max}, body violations=${bodyViolations}`);save();
  }
}
// Control context uses each control's whole raster area, as in the plan, not the synthetic belt mask.
function control(name,rasters){
  const perSite=rasters.map(r=>{const count=prominence(r).filter(p=>p.prom>=300).length,areaKm2=(r.n*r.step/1000)**2;return {count,areaKm2,density:count*1000/areaKm2};});
  const density=1000*perSite.reduce((s,r)=>s+r.count,0)/perSite.reduce((s,r)=>s+r.areaKm2,0);
  report.controls.push({class:'INFO',name,density,perSite});log(`INFO control ${name}: ${density}`);save();
}
for(const kind of ['alpine','dome'])control(kind,CONTROL_SITES.map(s=>raster(syntheticSampler(ERODED_CONTROL.radiusM,kind),s.d,ERODED_CONTROL.radiusM,385,125)));
const eroded=[];for(let i=0;i<4;i++){const r=centralCrop(buildErodedControl(i).eroded);eroded.push(r);if(i===0)render('eroded-alpine-site0-48km',r);log(`INFO eroded site ${i} built`);}control('eroded-alpine-central-crop',eroded);
// All steady-state positive variants in the M3 calibration, on its eight 48 km sites.
const variants=[
  ...[1,2,3,4].map(seed=>({name:`ss-uniform-s${seed}`,uplift:'uniform',seed})),
  {name:'ss-uniform-s1-off',uplift:'uniform',seed:1,off:true},
  {name:'ss-uniform-sc09-s1',uplift:'uniform',seed:1,sc:.9},
  {name:'ss-uniform-125m-s1-off',uplift:'uniform',seed:1,step:125,off:true},
  ...[1,2,3].map(seed=>({name:`ss-envelope-s${seed}`,uplift:'envelope',seed})),
  {name:'ss-envelope-s1-off',uplift:'envelope',seed:1,off:true},
  {name:'ss-envelope-sc09-s1',uplift:'envelope',seed:1,sc:.9},
];
for(const {name,off,...options} of variants){
  log(`INFO building ${name}`);
  const sampler=stripSampler(steadyStateStrip(options),off?{offx:37,offy:53}:{});
  const rs=Array.from({length:8},(_,i)=>raster(sampler,[Math.cos(i*1e6/RAMP.R),0,Math.sin(i*1e6/RAMP.R)],RAMP.R,385,125));
  control(name,rs);if(name==='ss-uniform-s1')render('steady-state-uniform-s1-site0-48km',rs[0]);
}
report.seconds=(performance.now()-start)/1000;
report.exitCode=report.acceptance.rows.every(r=>r.pass)?0:1;
save();log(`Acceptance exit ${report.exitCode}; wall ${report.seconds.toFixed(3)} s`);process.exitCode=report.exitCode;
