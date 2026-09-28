import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { browserArgs } from './browser-options.mjs';
import { encodeVersions, CURRENT_VERSIONS } from '../src/time-nav.ts';

const base=process.env.ATLAS_URL||'http://127.0.0.1:5197/';
const out=process.env.ATLAS_RESULTS||'test-results/canopy-flight';
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const sourceDirty=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().length>0;
const sourceFiles=['src/planet-canopy.ts','src/planet-forest.ts','src/volumetric-clouds.ts'];
const sourceFilesSha256=Object.fromEntries(await Promise.all(sourceFiles.map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')])));
const bodyId='G001/C2128,0,1/0/planet/1';
const params=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:'G001/C2128,0,1/0',body:bodyId,date:'435084631200000032044300000',wv:encodeVersions(CURRENT_VERSIONS)});
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',e=>errors.push(`page: ${e.message}`));
page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('[vite] failed to connect to websocket.'))errors.push(`console: ${m.text()}`);});
if(typeof page.routeWebSocket==='function')await page.routeWebSocket('**/*',socket=>socket.close());
const waitFor=(fn,timeout=180000,arg)=>page.waitForFunction(fn,arg,{timeout});
const snap=()=>page.evaluate(()=>{
  const a=window.__atlas,t=a?.travel,tiles=a?.terrain?.tiles,f=tiles?.forest,c=f?.fullCanopy;
  return {date:a?.date,bodyId:a?.state?.body?.id,
    travel:t?{active:t.active,domain:t.domain,landing:t.landing,walking:t.walking,position:t.position,heading:t.heading,
      surfaceJourney:t.surfaceJourney,terrainCruise:t.terrainCruise,surface:t.surface,explorationClock:t.explorationClock,systemUnit:t.systemUnit}:null,
    forest:f?{visible:f.visible,near:f.near,cached:f.cached,pending:f.pending,selectionPending:f.selectionPending,
      matrixWrites:f.matrixWrites,colorWrites:f.colorWrites,coverageWrites:f.coverageWrites,originVersion:f.originVersion,
      selectionTransfer:f.selectionTransfer,selectionCache:f.selectionCache,fullCanopy:c}:null,
    terrain:tiles?{surfaceReady:tiles.surfaceReady,resident:tiles.resident,pending:tiles.pending,visible:tiles.visible,
      floraPresent:tiles.floraPresentCount,faunaDrawn:tiles.faunaDrawn?.length,faunaTerrainPending:tiles.faunaTerrainPending,
      updateMs:tiles.updateMs,lifeMs:tiles.lifeMs,drawFloraMs:tiles.drawFloraMs,drawFaunaMs:tiles.drawFaunaMs}:null};
});
const radial=()=>page.evaluate(id=>{
  const t=window.__atlas.travel,b=t.bodies.find(v=>v.id===id);if(!b)throw new Error('target body not in travel state');
  const q=t.position.map((v,i)=>v-b.positionM[i]),r=Math.hypot(...q);return {direction:q.map(v=>v/r),radiusM:window.__atlas.state.body.radiusM};
},bodyId);
const surfaceDistance=start=>page.evaluate(({start,id})=>{
  const t=window.__atlas.travel,b=t.bodies.find(v=>v.id===id),q=t.position.map((v,i)=>v-b.positionM[i]),r=Math.hypot(...q),d=q.map(v=>v/r);
  const dot=d.reduce((s,v,i)=>s+v*start.direction[i],0);return Math.acos(Math.max(-1,Math.min(1,dot)))*start.radiusM;
},{start,id:bodyId});
const concise=()=>page.evaluate(()=>{
  const a=window.__atlas,t=a?.travel,tiles=a?.terrain?.tiles,f=tiles?.forest,c=f?.fullCanopy;
  return {bodyId:a?.state?.body?.id,level:a?.state?.level,travel:{active:t?.active,domain:t?.domain,landing:t?.landing,
    walking:t?.walking?{grounded:t.walking.grounded,waiting:t.walking.waiting,speed:t.walking.speed,steps:t.walking.steps,travelledM:t.walking.travelledM,colliders:t.walking.colliders}:null,
    terrainClearanceM:t?.surface?.terrainClearance,position:t?.position,heading:t?.heading,systemUnit:t?.systemUnit},
    forest:{visible:f?.visible,near:f?.near,cached:f?.cached,pending:f?.pending,matrixWrites:f?.matrixWrites,colorWrites:f?.colorWrites,
      coverageWrites:f?.coverageWrites,originVersion:f?.originVersion,selectionPending:f?.selectionPending,
      fullCanopy:c?{context:c.context,generation:c.generation,ready:c.ready,trees:c.trees,patches:c.patches,selectedPatches:c.selectedPatches,
        queuedPatches:c.queuedPatches,jobsInFlight:c.jobsInFlight,selectionPending:c.selectionPending,uploadBytes:c.uploadBytes,
        installedThisFrame:c.installedThisFrame,installMs:c.installMs,selectionMs:c.selectionMs,selectionApplyMs:c.selectionApplyMs,
        failures:c.failures,workerRestarts:c.workerRestarts,capacityMisses:c.capacityMisses,slots:c.slots,
        nearPresentNotInCensus:c.nearPresentNotInCensus,nearAbsentInCensus:c.nearAbsentInCensus,
        farForcedClose:c.farForcedClose,closeCandidateScope:c.closeCandidateScope,attributeBytes:c.attributeBytes,
        retainedCoordinateBytes:c.retainedCoordinateBytes,rebaseBufferBytes:c.rebaseBufferBytes}:null},
    terrain:{surfaceReady:tiles?.surfaceReady,pending:tiles?.pending,floraPresent:tiles?.floraPresentCount,faunaDrawn:tiles?.faunaDrawn?.length,
      faunaTerrainPending:tiles?.faunaTerrainPending}};
});
const captureAlpha=async samples=>page.evaluate(async samples=>{
  window.__atlas.setCloudSceneSamples(samples);
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const canvas=document.querySelector('canvas'),gl=canvas?.getContext('webgl2');if(!gl)throw new Error('WebGL2 canvas unavailable');
  const width=gl.drawingBufferWidth,height=gl.drawingBufferHeight,pixels=new Uint8Array(width*height*4);
  const old=gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,null);
  try{gl.readBuffer(gl.BACK);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);}
  finally{gl.bindFramebuffer(gl.READ_FRAMEBUFFER,old);}
  let min=255,max=0,non255=0,zero=0;const histogram=new Map();
  for(let i=3;i<pixels.length;i+=4){const a=pixels[i];if(a<min)min=a;if(a>max)max=a;if(a!==255)non255++;if(a===0)zero++;histogram.set(a,(histogram.get(a)||0)+1);}
  return {samples,width,height,contextAlpha:gl.getContextAttributes()?.alpha,readFramebufferWasDefault:old===null,
    alphaMin:min,alphaMax:max,nonOpaquePixels:non255,transparentPixels:zero,alphaHistogram:Object.fromEntries([...histogram].sort((a,b)=>a[0]-b[0]))};
},samples);
let report={ok:false,base,bodyId,errors,phases:{},alpha:[],trace:null};
try{
  await page.goto(`${base}?${params}`,{waitUntil:'domcontentloaded'});
  await waitFor(id=>window.__atlas?.ready&&window.__atlas.state.level==='body'&&window.__atlas.state.body?.id===id&&!window.__atlas.camera.animating,180000,bodyId);
  await page.locator('#find-life').click();
  await waitFor(()=>window.__atlas.travel.terrainCruise!==null);
  await page.keyboard.down('q');await waitFor(()=>window.__atlas.travel.surface?.terrainClearance<100);await page.keyboard.up('q');
  await waitFor(()=>window.__atlas.terrain?.tiles?.forest?.visible>200&&window.__atlas.terrain.tiles.surfaceReady);
  await waitFor(()=>{const c=window.__atlas.terrain?.tiles?.forest?.fullCanopy;return c?.enabled&&c.ready&&c.trees>100000&&c.jobsInFlight===0&&c.queuedPatches===0&&!c.selectionPending;});
  await page.waitForTimeout(1000);
  await page.screenshot({path:`${out}/flight-near-ground.png`});report.phases.flightNearGround=await snap();
  await page.evaluate(()=>{
    const trace={samples:[],active:true};window.__canopyTrace=trace;
    const sample=()=>{if(!trace.active)return;const a=window.__atlas,t=a?.travel,tiles=a?.terrain?.tiles,f=tiles?.forest,c=f?.fullCanopy;if(c){trace.samples.push({time:performance.now(),walking:t?.walking?{grounded:t.walking.grounded,waiting:t.walking.waiting,speed:t.walking.speed,travelledM:t.walking.travelledM}:null,
      visible:f.visible,fullCanopy:{context:c.context,generation:c.generation,trees:c.trees,patches:c.patches,selectedPatches:c.selectedPatches,queuedPatches:c.queuedPatches,jobsInFlight:c.jobsInFlight,selectionPending:c.selectionPending,
        uploadBytes:c.uploadBytes,installedThisFrame:c.installedThisFrame,installMs:c.installMs,selectionMs:c.selectionMs,selectionApplyMs:c.selectionApplyMs,
        failures:c.failures,workerRestarts:c.workerRestarts,capacityMisses:c.capacityMisses,slots:c.slots,nearPresentNotInCensus:c.nearPresentNotInCensus,
        nearAbsentInCensus:c.nearAbsentInCensus,farForcedClose:c.farForcedClose,attributeBytes:c.attributeBytes,retainedCoordinateBytes:c.retainedCoordinateBytes,rebaseBufferBytes:c.rebaseBufferBytes}});if(trace.samples.length>1800)trace.samples.shift();}setTimeout(sample,100);};sample();
  });

  const flightStart=await radial();
  await page.keyboard.down('a');
  await waitFor(({start})=>{
    const t=window.__atlas.travel,b=t.bodies.find(v=>v.id==='G001/C2128,0,1/0/planet/1'),q=t.position.map((v,i)=>v-b.positionM[i]),r=Math.hypot(...q),d=q.map(v=>v/r),dot=d.reduce((s,v,i)=>s+v*start.direction[i],0);
    return Math.acos(Math.max(-1,Math.min(1,dot)))*start.radiusM>320;
  },45000,{start:flightStart});
  await page.keyboard.up('a');const flightMovedM=await surfaceDistance(flightStart);
  await page.evaluate(()=>window.__atlas.setExplorationPaused(true));
  await waitFor(()=>window.__atlas.terrain?.tiles?.forest?.fullCanopy?.ready&&window.__atlas.terrain.tiles.forest.fullCanopy.jobsInFlight===0&&window.__atlas.terrain.tiles.forest.fullCanopy.queuedPatches===0&&!window.__atlas.terrain.tiles.forest.fullCanopy.selectionPending,180000);
  await page.waitForTimeout(400);report.phases.flightLateral={groundDisplacementM:flightMovedM,state:await snap()};
  await page.screenshot({path:`${out}/flight-lateral.png`});

  const beforeTurn=await page.evaluate(()=>({position:window.__atlas.travel.position,heading:window.__atlas.travel.heading,originVersion:window.__atlas.terrain.tiles.forest.originVersion}));
  await page.mouse.move(700,500);await page.mouse.down();await page.mouse.move(990,500,{steps:10});await page.mouse.up();await page.waitForTimeout(500);
  const afterTurn=await page.evaluate(()=>({position:window.__atlas.travel.position,heading:window.__atlas.travel.heading,originVersion:window.__atlas.terrain.tiles.forest.originVersion}));
  const flightTurn={positionDeltaM:Math.hypot(...afterTurn.position.map((v,i)=>v-beforeTurn.position[i])),headingDelta:Math.hypot(...afterTurn.heading.map((v,i)=>v-beforeTurn.heading[i])),originVersionBefore:beforeTurn.originVersion,originVersionAfter:afterTurn.originVersion};
  report.phases.flightTurn={...flightTurn,state:await snap()};await page.screenshot({path:`${out}/flight-turned.png`});

  await page.evaluate(()=>window.__atlas.setExplorationPaused(false));
  await page.locator('#walk-surface').click();
  await waitFor(()=>window.__atlas.travel.walking?.active===true&&!window.__atlas.travel.landing,180000);
  await waitFor(()=>window.__atlas.travel.walking?.grounded===true&&window.__atlas.travel.walking?.waiting===false,60000);
  await page.waitForTimeout(1500);
  report.phases.walkingClose=await snap();await page.screenshot({path:`${out}/walking-close.png`});

  const walkBeforeTurn=await page.evaluate(()=>({position:window.__atlas.travel.walking.position,heading:window.__atlas.travel.heading}));
  await page.mouse.move(700,500);await page.mouse.down();await page.mouse.move(970,500,{steps:10});await page.mouse.up();await page.waitForTimeout(500);
  const walkAfterTurn=await page.evaluate(()=>({position:window.__atlas.travel.walking.position,heading:window.__atlas.travel.heading}));
  report.phases.walkTurn={positionDeltaM:Math.hypot(...walkAfterTurn.position.map((v,i)=>v-walkBeforeTurn.position[i])),headingDelta:Math.hypot(...walkAfterTurn.heading.map((v,i)=>v-walkBeforeTurn.heading[i])),state:await snap()};
  await page.screenshot({path:`${out}/walking-turned.png`});

  const walkStart=await radial();await page.keyboard.down('Shift');await page.keyboard.down('a');
  await waitFor(({start})=>{
    const t=window.__atlas.travel,b=t.bodies.find(v=>v.id==='G001/C2128,0,1/0/planet/1'),q=t.position.map((v,i)=>v-b.positionM[i]),r=Math.hypot(...q),d=q.map(v=>v/r),dot=d.reduce((s,v,i)=>s+v*start.direction[i],0);
    return Math.acos(Math.max(-1,Math.min(1,dot)))*start.radiusM>320;
  },75000,{start:walkStart});
  await page.keyboard.up('a');await page.keyboard.up('Shift');const walkingLateralM=await surfaceDistance(walkStart);
  await page.evaluate(()=>window.__atlas.setExplorationPaused(true));
  await waitFor(()=>{const a=window.__atlas,t=a.travel,c=a.terrain?.tiles?.forest?.fullCanopy;return t.walking?.grounded&&!t.walking.waiting&&c?.ready&&c.jobsInFlight===0&&c.queuedPatches===0&&!c.selectionPending&&a.terrain.tiles.forest.pending===0&&a.terrain.tiles.pending===0;},180000);
  await page.waitForTimeout(1200);
  report.phases.walkingLateral={groundDisplacementM:walkingLateralM,state:await snap()};await page.screenshot({path:`${out}/walking-lateral-300m.png`});
  report.phases.settled=await snap();await page.screenshot({path:`${out}/settled.png`});

  for(const samples of [0,2,4]){await page.evaluate(s=>window.__atlas.setCloudSceneSamples(s),samples);await page.waitForTimeout(1200);report.alpha.push(await captureAlpha(samples));}
  await page.evaluate(()=>{if(window.__canopyTrace)window.__canopyTrace.active=false;});
  report.trace=await page.evaluate(()=>window.__canopyTrace?.samples??[]);
  const servedModuleSha256=Object.fromEntries(await Promise.all(sourceFiles.map(async path=>{const response=await fetch(new URL(path,base));if(!response.ok)throw new Error(`served source ${path}: HTTP ${response.status}`);return[path,createHash('sha256').update(await response.text()).digest('hex')];})));
  report.environment={renderer:await page.evaluate(()=>{const gl=document.querySelector('canvas')?.getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';}),viewport:[1440,1000],date:await page.evaluate(()=>window.__atlas.date),sourceCommit,sourceWorkingTreeDirty:sourceDirty,sourceFilesSha256,servedModuleSha256};
  report.checks={flightLateralM:flightMovedM,walkingLateralM,flightTurn,walkTurn:report.phases.walkTurn,finalForest:await concise()};
  report.errors=errors;
  report.alphaPass=report.alpha.every(x=>x.alphaMin===255&&x.alphaMax===255&&x.nonOpaquePixels===0&&x.readFramebufferWasDefault);
  report.ok=errors.length===0&&flightMovedM>300&&walkingLateralM>300&&report.phases.walkingClose.travel.walking?.active&&report.checks.finalForest.forest.fullCanopy?.nearPresentNotInCensus===0&&report.checks.finalForest.forest.fullCanopy?.nearAbsentInCensus===0&&report.alphaPass;
  await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
  assert.ok(flightMovedM>300,`flight moved laterally ${flightMovedM} m`);assert.ok(walkingLateralM>300,`walking moved laterally ${walkingLateralM} m`);
  assert.ok(report.phases.walkingClose.travel.walking?.active,'arrived in ground walker');
  assert.equal(report.checks.finalForest.forest.fullCanopy?.nearPresentNotInCensus,0,'near presence agrees with census');
  assert.equal(report.checks.finalForest.forest.fullCanopy?.nearAbsentInCensus,0,'near absence agrees with census');
  assert.equal(report.checks.finalForest.forest.fullCanopy?.failures,0,'census worker healthy');
  assert.equal(report.checks.finalForest.forest.fullCanopy?.capacityMisses,0,'canopy allocator retained capacity');
  assert.ok(report.alphaPass,'default framebuffer alpha is fully opaque for MSAA 0/2/4');
  assert.deepEqual(errors,[],'no browser errors');
  console.log(JSON.stringify(report,null,2));
}catch(error){
  report.failure=String(error);report.errors=errors;report.state=await concise().catch(()=>null);report.trace=await page.evaluate(()=>window.__canopyTrace?.samples??[]).catch(()=>[]);
  await writeFile(`${out}/failure.json`,JSON.stringify(report,null,2));await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error;
}finally{await page.keyboard.up('a').catch(()=>{});await page.keyboard.up('Shift').catch(()=>{});await page.keyboard.up('q').catch(()=>{});await page.evaluate(()=>{if(window.__canopyTrace)window.__canopyTrace.active=false;}).catch(()=>{});await browser.close();}
