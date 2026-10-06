/** Render-cost probe (task 4, render submission / shadow / terrain GPU).
 * Serves an already built bundle, holds the machine-wide GPU lock for one
 * browser, and at frozen harness poses measures CPU/GPU pass statistics for a
 * list of in-page variants (JS evaluated before each window), optionally with a
 * CDP CPU profile summary and a canvas screenshot per variant.
 *
 *   node scripts/render-probe.browser.mjs --dist test-results/rs-dist/x [--port <n>] \
 *     --poses low100,groundEye --variants '[["base",""],["noShadowCache","__atlas.setShadowCache(false)"]]' \
 *     [--query 'quality=floor'] [--window 3000] [--cpuprofile] [--shots out/dir] [--out report.json]
 *
 * Poses match tests/desktop-perf.browser.mjs (same site, clearances, pitch).
 * --port: omitted = a free ephemeral port (retried on a bind race); an explicit busy port fails fast before the GPU
 * lock is taken (tests/helpers/free-port.mjs, docs/test-fixes-2026-10-07.md). */
import {chromium} from 'playwright';
import * as THREE from 'three';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {acquireGpuLock} from '../tests/helpers/gpu-lock.mjs';
import {parsePortOption,startDistPreview,stopServer} from '../tests/helpers/free-port.mjs';
import {encodeVersions,CURRENT_VERSIONS} from '../src/time-nav.ts';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {terrainSampler} from '../src/terrain.ts';
import {planetSnapshotAt} from '../src/world-surface.ts';
import {starLifecycle,planetLifecycle} from '../src/stellar-evolution.ts';
import {parseAddress} from '../src/address.ts';
import {HARNESS_SEED,HARNESS_SYSTEM_ID,HARNESS_BODY_ID,HARNESS_DATE,SITE_A as HARNESS_SITE_A} from '../tests/harness-sites.mjs';

const args=Object.fromEntries(process.argv.slice(2).reduce((out,a,i,all)=>{if(a.startsWith('--'))out.push([a.slice(2),all[i+1]&&!all[i+1].startsWith('--')?all[i+1]:'1']);return out;},[]));
const requestedPort=parsePortOption(args.port),dist=args.dist||'dist',windowMs=Number(args.window||3000);
const poseNames=(args.poses||'low100,groundEye').split(',');
const variants=JSON.parse(args.variants||'[["base",""]]');
const extraQuery=new URLSearchParams(args.query||'');
const log=(...a)=>console.error(`[probe ${new Date().toISOString().slice(11,19)}]`,...a);

const seed=HARNESS_SEED,galaxyId='G001',systemId=HARNESS_SYSTEM_ID,bodyId=HARNESS_BODY_ID;
const DATE=HARNESS_DATE;
const sys=system(refByAddress(galaxies(seed)[0],systemId));
const living=sys.planets[1];
const star=sys.stars[0],systemAddress=parseAddress(sys.ref.id);
const bodyAddress=value=>({...systemAddress,slot:value.id.slice(sys.ref.id.length+1)});
const starLife=starLifecycle(seed,bodyAddress(star),star),livingLife=planetLifecycle(seed,bodyAddress(living),living,starLife);
const LEVEL_A=Math.round(planetSnapshotAt(seed,living.id,living,livingLife,starLife,DATE,CURRENT_VERSIONS).ocean.renderWaterLevelM/25)*25;
const sampleA=terrainSampler(living,undefined,undefined,undefined,LEVEL_A);
function surfacePose(direction,{clearanceM,pitchDeg=-6,bearingDeg=0}){
  const up=new THREE.Vector3(...direction).normalize();
  const ground=sampleA(up.toArray()).visibleHeightM;
  const ref=Math.abs(up.y)>.92?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0);
  const east=new THREE.Vector3().crossVectors(ref,up).normalize();
  const forward=east.applyAxisAngle(up,bearingDeg*Math.PI/180).normalize();
  const eye=up.clone().multiplyScalar(living.radiusM+ground+clearanceM);
  const pitch=pitchDeg*Math.PI/180,look=eye.clone().addScaledVector(forward,Math.cos(pitch)*100).addScaledVector(up,Math.sin(pitch)*100);
  const heading=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye,look,up));
  return {position:eye.toArray(),heading:heading.toArray(),clearanceM};
}
// The shared harness living site (tests/harness-sites.mjs, relief round P6).
const SITE_A=[...HARNESS_SITE_A];
const POSES={groundEye:surfacePose(SITE_A,{clearanceM:1.7}),low100:surfacePose(SITE_A,{clearanceM:100,pitchDeg:-15}),
  flight120:surfacePose(SITE_A,{clearanceM:120,pitchDeg:-10}),hover160:surfacePose(SITE_A,{clearanceM:160,pitchDeg:-20}),
  high15km:surfacePose(SITE_A,{clearanceM:15000,pitchDeg:-35}),alt1500:surfacePose(SITE_A,{clearanceM:1500,pitchDeg:-20}),alt450:surfacePose(SITE_A,{clearanceM:450,pitchDeg:-20}),groundEyeEast:surfacePose(SITE_A,{clearanceM:1.7,bearingDeg:90})};

// Free port + strict bind + exit detection + build-info ownership (the served builtAt must be this dist's).
const server=await startDistPreview({dist,port:requestedPort,log:line=>log('preview:',line)});
const preview=server.child,port=server.port,base=server.base,served=server.build;
process.on('exit',()=>stopServer(preview));
log(`preview serves ${dist} on port ${port} (attempt ${server.attempts})`);
// --nowalk opens the body view (arrival from space) instead of a walking pose.
const urlFor=pose=>`${base}?${new URLSearchParams({seed,g:galaxyId,system:systemId,body:bodyId,date:DATE.toString(),
  wv:encodeVersions(CURRENT_VERSIONS),...(args.nowalk?{}:{walk:pose.position.join(','),heading:pose.heading.join(',')}),profile:'1',...Object.fromEntries(extraQuery)})}`;

const report={build:served,dist,query:args.query||'',windowMs,poses:{},started:new Date().toISOString()};
const lock=await acquireGpuLock({owner:`opus55 render-submit probe port ${port}`,log});
let browser=null;
try{
  browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu','--disable-gpu-vsync','--disable-frame-rate-limit','--force-device-scale-factor=1',
    '--disable-renderer-backgrounding','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--enable-precise-memory-info']});
  const context=await browser.newContext({viewport:{width:2560,height:1440},deviceScaleFactor:1});
  await context.addInitScript(()=>{
    const define=Object.defineProperty;
    Object.defineProperty=function(target,key,descriptor){
      const result=Reflect.apply(define,Object,[target,key,descriptor]);
      if(target===window&&key==='__atlas'&&descriptor?.value?.setExplorationPaused){descriptor.value.setExplorationPaused(true);Object.defineProperty=define;}
      return result;
    };
  });
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(`page: ${e.message}`));page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
  const cdp=await context.newCDPSession(page);
  const ev=(fn,arg)=>page.evaluate(fn,arg);
  const settle=async(timeout=90000)=>{const t0=Date.now();try{await page.waitForFunction(()=>{const s=window.__atlas.perfSample(),b=s.backlog;return !!b&&b.surfaceReady&&b.terrainPending===0&&b.forestPending===0&&!b.forestSelectionPending&&b.lifePending===0&&b.faunaTerrainPending===0;},null,{timeout,polling:100});return Date.now()-t0;}catch{return -1;}};
  await page.goto(urlFor(POSES.groundEye),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(nowalk=>window.__atlas?.ready&&(nowalk||window.__atlas.perfSample().walking),!!args.nowalk,{timeout:180000,polling:100});
  if(args.nowalk)await page.waitForTimeout(5000);
  await ev(poses=>{window.__poses=poses;},POSES);
  report.qualitySettings=await ev(()=>window.__atlas.qualitySettings());
  for(const poseName of poseNames){
    const pose=POSES[poseName];
    await ev(p=>window.__atlas.setPose(p.position,p.heading,p.clearanceM),pose);await ev(d=>window.__atlas.seek(d),DATE.toString());
    const settledMs=await settle();await page.waitForTimeout(2000);
    const rows=[];
    for(const [name,code] of variants){
      if(code)await ev(c=>(0,eval)(c),code);
      await page.waitForTimeout(700);
      await ev(()=>{window.__atlas.setProfileHistory(36000);window.__atlas.setProfiling(true);window.__atlas.resetProfile();});
      if(args.cpuprofile){await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:100});await cdp.send('Profiler.start');}
      await page.waitForTimeout(windowMs);
      let profile=null;
      if(args.cpuprofile){profile=(await cdp.send('Profiler.stop')).profile;}
      const stats=await ev(()=>{const d=window.__atlas.renderProfile,r=window.__rsResult??null;window.__rsResult=null;return {stats:d.statistics,shadowCache:window.__atlas.shadowCache??null,quality:window.__atlas.qualitySettings?.().renderQuality??null,result:r};});
      const row={variant:name,code,...stats};
      if(profile)row.cpuProfile=summarizeProfile(profile);
      if(args.shots){await mkdir(args.shots,{recursive:true});const file=`${args.shots}/${poseName}-${name}.png`;await page.screenshot({path:file});row.shot=file;}
      rows.push(row);
      log(poseName,name,'frameWork p50/p95',fmt(stats.stats['cpu/frameWorkMs']),'gpu sum',fmt(stats.stats['gpu/framePassSumMs']),'shadow',fmt(stats.stats['cpu/system/shadowMs']),'submission',fmt(stats.stats['cpu/system/submissionMs']),'draws',stats.stats.drawCalls?.p50,stats.result?JSON.stringify(stats.result):'');
    }
    report.poses[poseName]={settledMs,rows};
  }
  report.errors=errors;
}finally{
  try{await browser?.close();}catch{}
  await lock.release();
  preview.kill();
}
const out=args.out||`test-results/render-probe/${Date.now()}.json`;
await mkdir(dirname(out),{recursive:true});await writeFile(out,JSON.stringify(report,null,1));
log('wrote',out,'errors',report.errors?.length??'?');
process.exit(0);

function fmt(s){return s?`${s.p50?.toFixed(2)}/${s.p95?.toFixed(2)}`:'-';}
/** Self and inclusive time per function (url:line:name), top entries. */
function summarizeProfile(profile){
  const byId=new Map(profile.nodes.map(n=>[n.id,n]));
  const self=new Map();const dt=profile.timeDeltas;let total=0;
  for(let i=0;i<profile.samples.length;i++){const n=byId.get(profile.samples[i]);const ms=(dt[i+1]??0)/1000;total+=ms;self.set(n.id,(self.get(n.id)??0)+ms);}
  const parent=new Map();for(const n of profile.nodes)for(const c of n.children??[])parent.set(c,n.id);
  const key=n=>`${n.callFrame.functionName||'(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber}:${n.callFrame.columnNumber}`;
  const selfBy=new Map(),inclBy=new Map();
  for(const [id,ms] of self){
    const n=byId.get(id);selfBy.set(key(n),(selfBy.get(key(n))??0)+ms);
    const seen=new Set();let cur=id;
    while(cur!==undefined){const k=key(byId.get(cur));if(!seen.has(k)){seen.add(k);inclBy.set(k,(inclBy.get(k)??0)+ms);}cur=parent.get(cur);}
  }
  const top=(m,n)=>[...m].sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,v])=>[k,+v.toFixed(1)]);
  return {totalMs:+total.toFixed(1),self:top(selfBy,60),inclusive:top(inclBy,80)};
}
