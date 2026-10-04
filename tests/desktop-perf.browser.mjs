/** Desktop frame-cost harness (handoff task 4; docs/desktop-perf-plan-2026-09-29.md,
 * receipt docs/desktop-perf-harness-2026-09-29.md).
 *
 * Builds (unless ATLAS_PERF_SKIP_BUILD=1), serves the production bundle with
 * `vite preview` (COOP/COEP), and runs scenarios S0-S6 at 2560x1440 DPR 1 for
 * each condition x repeat in a FRESH browser, holding the machine-wide GPU
 * browser lock only while that browser runs. Writes report.json + summary.md.
 *
 * Conditions: native, cpu-proxy (CDP Emulation.setCPUThrottlingRate 1.7; run
 * the harness under affinity 0xFFF for the 6C/12T proxy). The GPU ratio proxy
 * (x5.4, bracket 4.5-6.5) is derived from the native run's hide-one-system
 * attribution. Exits 0 when the harness completed (a budget FAIL is data, not
 * a harness failure); non-zero on a harness/precondition failure.
 *
 * Env: ATLAS_PERF_PORT (5195) ATLAS_PERF_OUT ATLAS_PERF_REPEATS (3)
 * ATLAS_PERF_CONDITIONS (native,cpu-proxy) ATLAS_PERF_SCENARIOS (S0,...,S6)
 * ATLAS_PERF_SKIP_BUILD ATLAS_PERF_ALLOW_DIRTY ATLAS_PERF_OWNER ATLAS_PERF_QUERY
 * ATLAS_PERF_GPU_CLOCK_LOCK (declared, e.g. "lgc=1100,lmc=7001")
 * ATLAS_PERF_S4_FAULT (wrong-date or wrong-bucket; unset for normal assertions)
 * ATLAS_PERF_LOCK_RETRY_MS (60000) ATLAS_PERF_SHORT=1 (shortened windows for harness development). */
import {chromium} from 'playwright';
import * as THREE from 'three';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {acquireGpuLock} from './helpers/gpu-lock.mjs';
import {nvidiaSnapshot,startGpuSampler,processAffinity,browserAffinities,setBrowserAffinity,cpuInfo,cpuLoad} from './helpers/perf-host.mjs';
import {aggregateReport,markdownSummary,CPU_PROXY_RATE} from './helpers/perf-report.mjs';
import {encodeVersions,CURRENT_VERSIONS} from '../src/time-nav.ts';
import {galaxies,refByAddress,system,bodyPosition} from '../src/catalog.ts';
import {parseAddress} from '../src/address.ts';
import {starLifecycle,planetLifecycle} from '../src/stellar-evolution.ts';
import {planetSnapshotAt} from '../src/world-surface.ts';
import {terrainSampler} from '../src/terrain.ts';
import {findShoreSite} from './rock-shore-site.mjs';
import {HARNESS_SEED,HARNESS_SYSTEM_ID,HARNESS_BODY_ID,HARNESS_DATE,SITE_A as HARNESS_SITE_A,SITE_A_M} from './harness-sites.mjs';
import {datedLoweredSea} from './helpers/harness-water.mjs';

const env=process.env;
const SHORT=env.ATLAS_PERF_SHORT==='1';
const config={
  port:Number(env.ATLAS_PERF_PORT||5195),
  repeats:Number(env.ATLAS_PERF_REPEATS||3),
  conditions:(env.ATLAS_PERF_CONDITIONS||'native,cpu-proxy').split(',').filter(Boolean),
  scenarios:(env.ATLAS_PERF_SCENARIOS||'S0,S1,S2,S3,S4,S5,S6').split(',').filter(Boolean),
  viewport:[2560,1440],cpuThrottle:CPU_PROXY_RATE,short:SHORT,
  build:env.ATLAS_PERF_SKIP_BUILD!=='1',allowDirty:env.ATLAS_PERF_ALLOW_DIRTY==='1',
  owner:env.ATLAS_PERF_OWNER||'desktop-perf harness',gpuClockLock:env.ATLAS_PERF_GPU_CLOCK_LOCK||null,
  // Extra app URL parameters for every run, e.g. 'quality=floor' (recorded in the report).
  query:env.ATLAS_PERF_QUERY||'',
  s4Fault:env.ATLAS_PERF_S4_FAULT??null,
  lockRetryMs:Number(env.ATLAS_PERF_LOCK_RETRY_MS||60000),
  // cpu-proxy: the harness pins its own browser to this mask (6C/12T); 'none' disables.
  cpuProxyAffinity:env.ATLAS_PERF_CPU_AFFINITY==='none'?null:Number(env.ATLAS_PERF_CPU_AFFINITY||0xFFF),
};
const W=(ms)=>SHORT?Math.max(1500,Math.round(ms/4)):ms;
const S4_WINDOW_MS=30000;
const CHROME_FLAGS=['--use-angle=d3d11','--enable-gpu','--disable-gpu-vsync','--disable-frame-rate-limit','--force-device-scale-factor=1',
  '--disable-renderer-backgrounding','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--enable-precise-memory-info'];
for(const c of config.conditions)if(!['native','cpu-proxy'].includes(c))throw new Error(`Unknown condition ${c}`);
if(config.s4Fault!==null&&!['wrong-date','wrong-bucket'].includes(config.s4Fault))throw new Error(`Unknown S4 fault ${config.s4Fault}`);

// ---- Fixed content (plan "Measurement protocol") --------------------------
const seed=HARNESS_SEED,galaxyId='G001',systemId=HARNESS_SYSTEM_ID,bodyId=HARNESS_BODY_ID;
const DATE=HARNESS_DATE;
const sys=system(refByAddress(galaxies(seed)[0],systemId));
const living=sys.planets[1];if(living.id!==bodyId)throw new Error(`unexpected body ${living.id}`);
const star=sys.stars[0],systemAddress=parseAddress(sys.ref.id);
const bodyAddress=value=>({...systemAddress,slot:value.id.slice(sys.ref.id.length+1)});
const starLife=starLifecycle(seed,bodyAddress(star),star),livingLife=planetLifecycle(seed,bodyAddress(living),living,starLife);
const snappedLevel=dateNs=>Math.round(planetSnapshotAt(seed,living.id,living,livingLife,starLife,dateNs,CURRENT_VERSIONS).ocean.renderWaterLevelM/25)*25;
// S4 seek dates (relief round P6). The dated sea is exactly 0 at the catalogue
// date and only falls after it (surface-8 ocean volume), so the old
// "whole years before DATE in the -4475 m bucket" date no longer moved the sea.
// A and B are now whole Maithea years AFTER DATE (same sun direction) whose
// dated seas are the 60%-volume-lost harness level and one bucket higher
// (tests/helpers/harness-water.mjs; Maithea -2425 / -2400 m).
const YEAR_LIVING_NS=BigInt(Math.max(1,Math.round(2*Math.PI/Math.sqrt(living.orbit.mu/living.orbit.a**3)*1e9)));
const S4_SEA=datedLoweredSea(living,snappedLevel,DATE,YEAR_LIVING_NS,starLife.giantNs);
if(!S4_SEA)throw new Error('no dated lowered sea for S4');
const DATE_A=S4_SEA.dateLowNs,DATE_B=S4_SEA.dateHighNs;
const LEVEL_A=snappedLevel(DATE_A),LEVEL_B=snappedLevel(DATE_B);
if(LEVEL_A!==S4_SEA.lowM||LEVEL_B!==S4_SEA.highM)throw new Error(`S4 dated seas ${LEVEL_A}/${LEVEL_B} are not ${S4_SEA.lowM}/${S4_SEA.highM}`);
const LEVEL_DATE=snappedLevel(DATE);
const sampleDate=terrainSampler(living,undefined,undefined,undefined,LEVEL_DATE),sampleA=terrainSampler(living,undefined,undefined,undefined,LEVEL_A);

/** Pose helpers in body-relative metres. `bearing` rotates about local up. */
function surfacePose(direction,{clearanceM,pitchDeg=-6,bearingDeg=0,sampler=sampleDate}){
  const up=new THREE.Vector3(...direction).normalize();
  const ground=sampler(up.toArray()).visibleHeightM;
  const ref=Math.abs(up.y)>.92?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0);
  const east=new THREE.Vector3().crossVectors(ref,up).normalize();
  const forward=east.applyAxisAngle(up,bearingDeg*Math.PI/180).normalize();
  const eye=up.clone().multiplyScalar(living.radiusM+ground+clearanceM);
  const pitch=pitchDeg*Math.PI/180,look=eye.clone().addScaledVector(forward,Math.cos(pitch)*100).addScaledVector(up,Math.sin(pitch)*100);
  const heading=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye,look,up));
  return {position:eye.toArray(),heading:heading.toArray(),groundHeightM:ground,clearanceM,pitchDeg,bearingDeg};
}
// Living inland site: the shared harness SITE_A (tests/harness-sites.mjs).
const SITE_A=[...HARNESS_SITE_A];
const POSES={
  groundEye:surfacePose(SITE_A,{clearanceM:1.7}),
  low100:surfacePose(SITE_A,{clearanceM:100,pitchDeg:-15}),
  flight120:surfacePose(SITE_A,{clearanceM:120,pitchDeg:-10}),
  hover160:surfacePose(SITE_A,{clearanceM:160,pitchDeg:-20}),
  high15km:surfacePose(SITE_A,{clearanceM:15000,pitchDeg:-35}),
};

// ---- Paths, commit, build ---------------------------------------------------
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const head=git('rev-parse','HEAD'),dirtyTree=git('status','--porcelain').length>0;
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const out=env.ATLAS_PERF_OUT||`test-results/desktop-perf/${head.slice(0,7)}-${stamp}`;
await mkdir(out,{recursive:true});
const log=(...args)=>console.error(`[perf ${new Date().toISOString().slice(11,19)}]`,...args);
if(config.s4Fault)log(`!!! S4 FAULT ACTIVE: ${config.s4Fault}; this run must fail !!!`);
if(dirtyTree&&!config.allowDirty)throw new Error('Working tree is dirty; commit first (or ATLAS_PERF_ALLOW_DIRTY=1 for harness development, labelled in the report).');
function npm(args){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.platform==='win32'?'npm.cmd':'npm',args,{stdio:'inherit',shell:process.platform==='win32'});
    child.on('exit',code=>code===0?resolve():reject(new Error(`npm ${args.join(' ')} exited ${code}`)));
  });
}
if(config.build){log('npm run build');await npm(['run','build']);}
const buildInfo=JSON.parse(await readFile('dist/build-info.json','utf8'));
if(buildInfo.commit!==head)throw new Error(`dist/build-info.json commit ${buildInfo.commit} is not HEAD ${head}; rebuild`);
if(buildInfo.dirty&&!config.allowDirty)throw new Error('dist was built from a dirty tree; commit and rebuild');

// ---- Shore site (deterministic; cached) ----------------------------------
const shoreCache='test-results/desktop-perf/shore-site.json';
let shore=null;
if(existsSync(shoreCache)){const c=JSON.parse(await readFile(shoreCache,'utf8'));if(c.key===`${seed}|${bodyId}|${LEVEL_A}|${LEVEL_B}|${SITE_A_M.join(",")}`)shore=c.site;}
if(!shore&&config.scenarios.includes('S4')){
  log('searching deterministic shore site (rock-shore-site.mjs)…');
  shore=findShoreSite(living,[...SITE_A_M],{lowLevelM:LEVEL_A,highLevelM:LEVEL_B});
  if(!shore)throw new Error('no deterministic shore site');
  await mkdir('test-results/desktop-perf',{recursive:true});
  await writeFile(shoreCache,JSON.stringify({key:`${seed}|${bodyId}|${LEVEL_A}|${LEVEL_B}|${SITE_A_M.join(",")}`,site:shore},null,2));
}
if(shore)POSES.shoreHover=surfacePose(shore.observer,{clearanceM:160,pitchDeg:-20,sampler:sampleA});

// ---- Preview server --------------------------------------------------------
const base=`http://127.0.0.1:${config.port}/`;
log(`vite preview on ${base}`);
const preview=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(config.port),'--strictPort'],{stdio:['ignore','pipe','pipe']});
let previewLog='';preview.stdout.on('data',d=>previewLog+=d);preview.stderr.on('data',d=>previewLog+=d);
const stopPreview=()=>{try{preview.kill();}catch{}};
process.on('exit',stopPreview);
let served=null;
for(let i=0;i<120&&!served;i++){
  try{const r=await fetch(base+'build-info.json');if(r.ok)served={info:await r.json(),coop:r.headers.get('cross-origin-opener-policy'),coep:r.headers.get('cross-origin-embedder-policy')};}
  catch{await new Promise(r=>setTimeout(r,500));}
}
if(!served){stopPreview();throw new Error(`vite preview did not start:\n${previewLog}`);}
if(served.info.commit!==head){stopPreview();throw new Error(`preview serves ${served.info.commit}, expected ${head} (port ${config.port} taken by another server?)`);}

const urlFor=(pose,{date=DATE,profile=true}={})=>`${base}?${new URLSearchParams({seed,g:galaxyId,system:systemId,body:bodyId,date:date.toString(),
  wv:encodeVersions(CURRENT_VERSIONS),walk:pose.position.join(','),heading:pose.heading.join(','),...(profile?{profile:'1'}:{}),...Object.fromEntries(new URLSearchParams(config.query))})}`;

// ---- One browser run --------------------------------------------------------
const PERF_SERIES=['frameIntervalMs','cpu/frameWorkMs','gpu/framePassSumMs','cpu/planetUpdateMs',
  ...['terrainTiles','sky','forest','canopy','flora','lifeScatter','fauna','rocks','clouds','submission','shadow','other'].map(n=>`cpu/system/${n}Ms`)];
const INIT_SCRIPT=()=>{
  window.__perfLongTasks=[];
  try{new PerformanceObserver(list=>{for(const e of list.getEntries())window.__perfLongTasks.push([e.startTime,e.duration]);}).observe({type:'longtask',buffered:true});}catch{}
  // Freeze exploration when the diagnostic API installs, before the first RAF.
  const define=Object.defineProperty;
  Object.defineProperty=function(target,key,descriptor){
    const result=Reflect.apply(define,Object,[target,key,descriptor]);
    if(target===window&&key==='__atlas'&&descriptor?.value?.setExplorationPaused){descriptor.value.setExplorationPaused(true);Object.defineProperty=define;}
    return result;
  };
  // S0 milestones (ms since navigation start).
  const m=window.__perfMilestones={};
  const poll=setInterval(()=>{
    const a=window.__atlas;if(!a?.perfSample)return;
    const now=performance.now(),set=(k,c)=>{if(m[k]===undefined&&c)m[k]=now;};
    let s=null;try{s=a.perfSample();}catch{return;}const b=s.backlog;
    set('api',true);set('ready',a.ready);set('surfaceReady',b?.surfaceReady);set('grounded',s.walking);
    set('forest',b?.forestVisible>0||b?.forestFarTrees>0);set('flora',b?.floraSubmitted>0);set('fauna',b?.faunaVisible>0);set('rocks',b?.rocksDrawn>0);
    set('settled',!!b&&s.walking&&b.surfaceReady&&b.terrainPending===0&&b.forestPending===0&&!b.forestSelectionPending&&b.lifePending===0&&b.faunaTerrainPending===0);
    if(m.hitches10s===undefined&&m.firstFrame!==undefined&&now-m.firstFrame>=10000){
      try{m.hitches10s=a.renderProfile.hitches;}catch{}
      m.longTasks10s=window.__perfLongTasks.filter(([t])=>t<=now).length;
    }
    set('firstFrame',a.frameCount>0);
    if(m.settled!==undefined&&m.hitches10s!==undefined)clearInterval(poll);
  },50);
};

async function browserRun(condition,repeat){
  const lock=await acquireGpuLock({owner:`${config.owner} ${condition} r${repeat} (${head.slice(0,7)}) port ${config.port}`,retryMs:config.lockRetryMs,log});
  const run={condition,repeat,lock:{owner:lock.owner,waitedMs:lock.waitedMs},errors:[],scenarios:{},started:new Date().toISOString()};
  let browser=null,sampler=null;
  try{
    run.gpuBefore=await nvidiaSnapshot('before');run.cpuLoadBefore=await cpuLoad();
    sampler=startGpuSampler();
    const launchedAt=Date.now();
    browser=await chromium.launch({headless:true,args:CHROME_FLAGS});
    run.browserVersion=browser.version();run.chromeFlags=CHROME_FLAGS;
    const context=await browser.newContext({viewport:{width:config.viewport[0],height:config.viewport[1]},deviceScaleFactor:1});
    await context.addInitScript(INIT_SCRIPT);
    const page=await context.newPage();
    page.on('pageerror',e=>run.errors.push(`page: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')run.errors.push(`console: ${m.text()}`);});
    const cdp=await context.newCDPSession(page);
    const throttle=condition==='cpu-proxy'?config.cpuThrottle:1;
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:throttle});run.cpuThrottleRate=throttle;
    if(condition==='cpu-proxy'&&config.cpuProxyAffinity)run.affinitySet=await setBrowserAffinity(launchedAt-2000,config.cpuProxyAffinity);
    run.browserAffinity=await browserAffinities(launchedAt-2000);
    const ev=(fn,arg)=>page.evaluate(fn,arg);
    const waitFor=(fn,arg,timeout=180000,polling=100)=>page.waitForFunction(fn,arg,{timeout,polling});
    const sleep=ms=>page.waitForTimeout(ms);
    const settle=async(label,timeout=90000,{walking=false}={})=>{
      const t0=Date.now();
      try{
        await waitFor(w=>{const s=window.__atlas.perfSample(),b=s.backlog;return !!b&&(!w||s.walking)&&b.surfaceReady&&b.terrainPending===0&&b.forestPending===0&&
          !b.forestSelectionPending&&b.lifePending===0&&b.faunaTerrainPending===0;},walking,timeout);
        return {label,settledMs:Date.now()-t0,timedOut:false};
      }catch{return {label,settledMs:Date.now()-t0,timedOut:true};}
    };
    /** Profiled window with 4 Hz backlog samples; optional scripted motion. */
    const capture=async(name,ms,{motion=null,sampleMs=250,onSample=null}={})=>{
      await ev(()=>{window.__atlas.setProfileHistory(36000);window.__atlas.setProfiling(true);window.__atlas.resetProfile();});
      const t0=await ev(()=>performance.now());
      if(motion)await ev(m=>window.__atlas.setPerfMotion(m),motion);
      const series=[];const deadline=Date.now()+ms;
      while(Date.now()<deadline){const s=await ev(()=>window.__atlas.perfSample());s.t-=t0;series.push(s);if(onSample&&await onSample(s))break;await sleep(sampleMs);}
      if(motion)await ev(()=>window.__atlas.setPerfMotion(null));
      const result=await ev(([names,start])=>{
        const a=window.__atlas,d=a.renderProfile,now=performance.now();
        const tasks=window.__perfLongTasks.filter(([t])=>t>=start&&t<=now);
        return {stats:d.statistics,hitches:d.hitches,gpuAvailable:d.gpuAvailable,skippedQueries:d.skippedQueries,disjointQueries:d.disjointQueries,expiredQueries:d.expiredQueries,
          samples:a.renderProfileSamples(names),longTasks:{count:tasks.length,maxMs:tasks.reduce((m,[,d])=>Math.max(m,d),0),totalMs:tasks.reduce((s,[,d])=>s+d,0)},durationMs:now-start};
      },[PERF_SERIES,t0]);
      const forestWrites=series.reduce((a,s)=>({matrix:a.matrix+(s.backlog?.forestMatrixWrites??0),color:a.color+(s.backlog?.forestColorWrites??0),coverage:a.coverage+(s.backlog?.forestCoverageWrites??0)}),{matrix:0,color:0,coverage:0});
      const heap=series.filter(s=>s.heap).map(s=>s.heap.used);
      const peakReserved=Math.max(0,...series.map(s=>s.backlog?.reservedCombinedBytes??0));
      return {name,...result,backlogSeries:series.map(s=>({t:Math.round(s.t),clearanceM:s.clearanceM,...s.backlog,heapUsed:s.heap?.used??null})),
        forestWritesSampled:forestWrites,heap:{first:heap[0]??null,last:heap.at(-1)??null,max:heap.length?Math.max(...heap):null},
        peakReservedCombinedBytes:peakReserved,budgetBytes:series.find(s=>s.backlog)?.backlog.budgetBytes??null,
        originVersions:[...new Set(series.map(s=>s.backlog?.forestOriginVersion))]};
    };
    const setPose=async pose=>ev(p=>window.__atlas.setPose(p.position,p.heading,p.clearanceM),pose);

    // S0 cold + warm load, landing at the ground-eye pose.
    const t0=Date.now();
    await page.goto(urlFor(POSES.groundEye),{waitUntil:'domcontentloaded'});
    run.crossOriginIsolated=await ev(()=>self.crossOriginIsolated);
    run.webgl=await ev(()=>{const gl=document.querySelector('canvas')?.getContext('webgl2');const x=gl?.getExtension('WEBGL_debug_renderer_info');
      return {renderer:x?gl.getParameter(x.UNMASKED_RENDERER_WEBGL):null,vendor:x?gl.getParameter(x.UNMASKED_VENDOR_WEBGL):null,timerQuery:!!gl?.getExtension('EXT_disjoint_timer_query_webgl2')};});
    const loadMilestones=async cache=>{
      try{await waitFor(()=>window.__perfMilestones?.settled!==undefined&&window.__perfMilestones?.hitches10s!==undefined,null,180000);}catch{run.errors.push(`S0 ${cache}: not settled within 180 s`);}
      return ev(()=>({...window.__perfMilestones}));
    };
    if(config.scenarios.includes('S0')){
      const cold=await loadMilestones('cold');run.scenarios.S0={cold,coldWallMs:Date.now()-t0};
      await page.reload({waitUntil:'domcontentloaded'});
      run.scenarios.S0.warm=await loadMilestones('warm');
    }
    await waitFor(()=>window.__atlas?.ready&&window.__atlas.perfSample().walking,null,180000);
    run.qualitySettings=await ev(()=>window.__atlas.qualitySettings());
    run.viewport={css:config.viewport,drawingBuffer:run.qualitySettings.renderer.drawingBuffer,pixelRatio:run.qualitySettings.renderer.pixelRatio};
    run.headingRestore=await ev(p=>{const q=window.__atlas.travel.heading,d=Math.abs(q[0]*p[0]+q[1]*p[1]+q[2]*p[2]+q[3]*p[3]);return {requested:p,restored:q,angleDeg:2*Math.acos(Math.min(1,d))*180/Math.PI};},POSES.groundEye.heading);

    // S1 settled: walking eye (paused, realtime), then 100 m.
    if(config.scenarios.includes('S1')){
      const s={};s.groundSettle=await settle('ground',90000,{walking:true});await sleep(1500);
      s.groundPaused=await capture('S1 ground 1.7 m paused',W(10000));
      await ev(()=>window.__atlas.setExplorationPaused(false));
      s.groundRealtime=await capture('S1 ground 1.7 m realtime',W(10000));
      await ev(()=>window.__atlas.setExplorationPaused(true));
      run.scenarios.S1=s;
    }
    await setPose(POSES.low100);await ev(d=>window.__atlas.seek(d),DATE.toString());
    if(config.scenarios.includes('S1')){
      const s=run.scenarios.S1;s.low100Settle=await settle('100 m');await sleep(1500);
      s.low100Paused=await capture('S1 100 m paused',W(10000));
    }
    // GPU attribution (native only): hide one system at a frozen pose.
    const attribution=async poseName=>{
      await setPose(POSES[poseName]);const settled=await settle(`attribution ${poseName}`);await sleep(1500);
      const systems=await ev(()=>window.__atlas.profilingSystems);
      const rows=[];
      for(const hidden of ['none',...systems,'all','none-after']){
        const list=hidden==='all'?systems:hidden.startsWith('none')?[]:[hidden];
        await ev(l=>{for(const n of window.__atlas.profilingSystems)window.__atlas.setSystemVisible(n,true);for(const n of l)window.__atlas.setSystemVisible(n,false);},list);
        await sleep(600);
        await ev(()=>{window.__atlas.setProfiling(true);window.__atlas.resetProfile();});
        await sleep(SHORT?1200:2500);
        const r=await ev(()=>{const s=window.__atlas.renderProfile.statistics;return {gpu:s['gpu/framePassSumMs']??null,cpu:s['cpu/frameWorkMs']??null,interval:s.frameIntervalMs??null,
          scene:s['gpu/sceneCaptureMs']??s['gpu/sceneMs']??null,clouds:s['gpu/cloudIntegrationMs']??null,triangles:s.triangles??null,draws:s.drawCalls??null};});
        rows.push({hidden,...r});
      }
      await ev(()=>{for(const n of window.__atlas.profilingSystems)window.__atlas.setSystemVisible(n,true);});
      return {pose:poseName,settled,rows};
    };
    if(condition==='native'&&config.scenarios.includes('S1')){
      run.gpuAttribution=[await attribution('low100'),await attribution('groundEye')];
    }
    // S2 turning in place at the ground eye (flight pose, clearance held).
    if(config.scenarios.includes('S2')){
      await setPose(POSES.groundEye);const st=await settle('S2');await sleep(1000);
      const c=await capture('S2 turning 90°/s',W(8000),{motion:{yawDegPerS:90,clearanceM:1.7}});
      run.scenarios.S2={settle:st,capture:c,originVersionChanged:c.originVersions.length>1};
    }
    // S3 movement: low flight 40 m/s at 120 m; walk-speed 1.6 m/s at 1.7 m eye.
    if(config.scenarios.includes('S3')){
      await setPose(POSES.flight120);const st=await settle('S3 flight');await sleep(1000);
      const flight=await capture('S3 low flight 40 m/s @120 m',W(20000),{motion:{speedMps:40,clearanceM:120}});
      await setPose(POSES.groundEye);const st2=await settle('S3 walk');await sleep(1000);
      const walk=await capture('S3 walk proxy 1.6 m/s @1.7 m',W(20000),{motion:{speedMps:1.6,clearanceM:1.7}});
      const spikes=c=>{const v=c.backlogSeries.map(s=>s.forestSelectionApplyMs);const changes=[];for(let i=1;i<v.length;i++)if(v[i]!==v[i-1])changes.push(v[i]);return {applies:changes.length,maxMs:changes.length?Math.max(...changes):null};};
      run.scenarios.S3={flight:{settle:st,capture:flight,selectionApply:spikes(flight)},walk:{settle:st2,capture:walk,selectionApply:spikes(walk)}};
    }
    // S4 date seek A->B->A: inland hover and shore hover; assert browser date and water bucket.
    if(config.scenarios.includes('S4')){
      const waitSeek=async(date,level,started)=>{
        try{
          await waitFor(({date,level})=>{const a=window.__atlas,t=a?.terrain?.tiles;
            return a?.date?.offsetNs===date&&t?.waterLevelM===level&&t?.waterBucket===level/25;
          },{date:date.toString(),level},S4_WINDOW_MS,500);
          return Date.now()-started;
        }catch(error){if(error?.name!=='TimeoutError')throw error;}
        return null;
      };
      const checkSeek=async(label,date,level,matchedMs)=>{
        const expectedDateNs=date.toString(),expectedWaterLevelM=level;
        const observed=await ev(({date,level})=>{const a=window.__atlas,t=a?.terrain?.tiles;
          return {observedDateNs:a?.date?.offsetNs??null,observedWaterLevelM:t?.waterLevelM??null,observedWaterBucket:t?.waterBucket??null,
            dateOk:a?.date?.offsetNs===date,bucketOk:t?.waterLevelM===level&&t?.waterBucket===level/25};
        },{date:expectedDateNs,level});
        if(!observed.dateOk){run.errors.push(`S4 ${label}: browser date ${observed.observedDateNs} != expected ${expectedDateNs}`);run.failed=true;}
        if(!observed.bucketOk){run.errors.push(`S4 ${label}: water level ${observed.observedWaterLevelM} m (bucket ${observed.observedWaterBucket}) != expected ${level} m (bucket ${level/25})`);run.failed=true;}
        return {expectedDateNs,...observed,expectedWaterLevelM,matchedMs};
      };
      const seekSeries=async(poseName)=>{
        await setPose(POSES[poseName]);const initialStarted=Date.now();await ev(d=>window.__atlas.seek(d),DATE_A.toString());
        const initial=await checkSeek(`${poseName} initial A`,DATE_A,LEVEL_A,await waitSeek(DATE_A,LEVEL_A,initialStarted));
        const st=await settle(`S4 ${poseName}`);await sleep(1000);
        const steps=[];
        for(const [label,date,level] of [['A→B',DATE_B,LEVEL_B],['B→A',DATE_A,LEVEL_A]]){
          let clearedMs=null,seekMatched=false;const started=Date.now();
          await ev(()=>{window.__atlas.setProfileHistory(36000);window.__atlas.setProfiling(true);window.__atlas.resetProfile();});
          const fault=label==='A→B'?config.s4Fault:null;
          await ev(d=>window.__atlas.seek(d),(fault==='wrong-date'?date+YEAR_LIVING_NS:date).toString());
          const expectedLevel=fault==='wrong-bucket'?LEVEL_A:level;
          const matched=waitSeek(date,expectedLevel,started).then(ms=>{seekMatched=ms!==null;return ms;});
          // Up to 30 s; stops 2 s after the refresh has drained (plan bound: 3 s).
          const [matchedMs,c]=await Promise.all([matched,capture(`S4 ${poseName} ${label}`,S4_WINDOW_MS,{sampleMs:100,onSample:async s=>{
            const b=s.backlog;if(seekMatched&&clearedMs===null&&b&&b.staleWaterPatches===0&&b.terrainPending===0&&s.t>200)clearedMs=Date.now()-started;
            return clearedMs!==null&&Date.now()-started>clearedMs+2000;}})]);
          const check=await checkSeek(`${poseName} ${label}`,date,expectedLevel,matchedMs);
          steps.push({label,date:date.toString(),windowMs:S4_WINDOW_MS,staleClearedMs:clearedMs,...check,
            staleMax:Math.max(0,...c.backlogSeries.map(x=>x.staleWaterPatches??0)),staleAtEnd:c.backlogSeries.at(-1)?.staleWaterPatches??null,peakReservedCombinedBytes:c.peakReservedCombinedBytes,budgetBytes:c.budgetBytes,
            withinBudget:c.budgetBytes!==null&&c.peakReservedCombinedBytes<=c.budgetBytes,capture:c});
        }
        return {pose:poseName,settle:st,initial,steps};
      };
      run.scenarios.S4={inland:await seekSeries('hover160'),...(POSES.shoreHover?{shore:await seekSeries('shoreHover')}:{})};
      await ev(d=>window.__atlas.seek(d),DATE.toString());
    }
    // S5 handoff: ground-eye traverse out and back across the 110 m and 550/600 m bands.
    if(config.scenarios.includes('S5')){
      await setPose(POSES.groundEye);const st=await settle('S5');await sleep(1000);
      const out1=await capture('S5 traverse out 30 m/s',W(20000),{motion:{speedMps:30,clearanceM:1.7},sampleMs:100});
      await ev(()=>window.__atlas.setPerfMotion({yawDegPerS:180,clearanceM:1.7}));await sleep(1000);await ev(()=>window.__atlas.setPerfMotion(null));
      const back=await capture('S5 traverse back 30 m/s',W(20000),{motion:{speedMps:30,clearanceM:1.7},sampleMs:100});
      const counts=c=>c.backlogSeries.map(s=>({t:s.t,near:s.forestNear,visible:s.forestVisible,faunaVisible:s.faunaVisible,nearRigs:s.faunaNearRigs,flora:s.floraSubmitted}));
      run.scenarios.S5={settle:st,out:out1,back,representationCounts:{out:counts(out1),back:counts(back)},
        note:'Per-sample representation counts only; duplicate/pop correctness is covered by desktop-forest and fauna acceptance tests.'};
    }
    // S6 flight -> landing from 15 km through the clouds.
    if(config.scenarios.includes('S6')){
      await setPose(POSES.high15km);const st=await settle('S6',60000);await sleep(1000);
      const c=await capture('S6 descent 15 km → 1.7 m',60000,{motion:{descentPerS:.3,minDescentMps:3,clearanceM:1.7},sampleMs:100,
        onSample:async s=>s.clearanceM!==null&&s.clearanceM<1.8});
      const first=(pred)=>c.backlogSeries.find(pred)?.clearanceM??null;
      const at=(pred)=>c.backlogSeries.find(pred)?.t??null;
      const clearance125=at(s=>s.clearanceM!==null&&s.clearanceM<=125);
      const signals={forestFirstClearanceM:first(s=>s.forestVisible>0||s.forestFarTrees>0),forestTreesFirstClearanceM:first(s=>s.forestVisible>0),floraFirstClearanceM:first(s=>s.floraSubmitted>0),faunaFirstClearanceM:first(s=>s.faunaVisible>0),
        rocksFirstClearanceM:first(s=>s.rocksDrawn>0),reached125mAtMs:clearance125,touchdownAtMs:at(s=>s.clearanceM!==null&&s.clearanceM<1.8)};
      signals.forestBelow3500=signals.forestFirstClearanceM!==null&&signals.forestFirstClearanceM<=3500;
      signals.lifeBefore125=signals.floraFirstClearanceM!==null&&signals.floraFirstClearanceM>=125;
      signals.rocksBefore125=signals.rocksFirstClearanceM!==null&&signals.rocksFirstClearanceM>=125;
      run.scenarios.S6={settle:st,capture:c,signals};
    }
    run.heapEnd=await ev(()=>window.__atlas.perfSample().heap);
  }catch(error){
    run.errors.push(`harness: ${error?.stack||error}`);run.failed=true;
  }finally{
    try{await browser?.close();}catch{}
    run.gpuSamples=sampler?.stop()??null;
    try{run.gpuAfter=await nvidiaSnapshot('after');}catch(error){run.gpuAfter={error:String(error)};}
    await lock.release();
    run.finished=new Date().toISOString();
  }
  return run;
}

// ---- Main -------------------------------------------------------------------
const report={ok:false,config,base,out,build:{...buildInfo,head,treeDirty:dirtyTree,served:served.info,headers:{coop:served.coop,coep:served.coep}},
  host:{cpu:cpuInfo(),affinity:await processAffinity(),throttleNote:'cpu-proxy uses CDP Emulation.setCPUThrottlingRate'},
  content:{seed,bodyId,date:DATE.toString(),dateA:DATE_A.toString(),dateB:DATE_B.toString(),levels:{date:LEVEL_DATE,A:LEVEL_A,B:LEVEL_B,lossFraction:S4_SEA.lossFraction},poses:POSES,shore},runs:[]};
const save=()=>writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
try{
  for(let repeat=1;repeat<=config.repeats;repeat++){
    // Alternate condition order per repeat to spread drift.
    const order=repeat%2?config.conditions:[...config.conditions].reverse();
    for(const condition of order){
      log(`run ${condition} repeat ${repeat}`);
      const run=await browserRun(condition,repeat);report.runs.push(run);await save();
      log(`  done ${condition} r${repeat}: errors ${run.errors.length}${run.failed?' (FAILED)':''}`);
    }
  }
}finally{stopPreview();}

// ---- Aggregate (tests/helpers/perf-report.mjs; re-runnable on a saved report.json) ----
report.browser={version:report.runs[0]?.browserVersion,flags:CHROME_FLAGS};
aggregateReport(report);
await save();
await writeFile(`${out}/summary.md`,markdownSummary(report));
log(`report: ${out}/report.json  summary: ${out}/summary.md  overall: ${report.verdict.overall}`);
process.exit(report.ok?0:1);
