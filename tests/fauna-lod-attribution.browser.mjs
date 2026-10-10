import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { startDistPreview,stopServer } from './helpers/free-port.mjs';
import { acquireGpuLock } from './helpers/gpu-lock.mjs';
import { samplePlanetCpuWindow } from './helpers/planet-frame-window.mjs';
import { CURRENT_VERSIONS,MODEL_MANIFEST_ID,encodeVersions } from '../src/time-nav.ts';
const out=process.env.ATLAS_RESULTS;await mkdir(out,{recursive:true});
const fixture=JSON.parse(await readFile('C:/LLM/IWSDK/Assets/_assetctl/life-presentation-20261009/baseline-flight/replay.json','utf8'));
const world=fixture.worlds.find(w=>w.bodyId.includes('C-715,')),pose=world.views.find(v=>v.clearance===30);
const report={ok:false,errors:[],runs:[],scope:'Same frozen high-quality Anitar30 build; initial date/pose identical. Natural moving clocks; profile timers add overhead. Worker flags sampled without allocating diagnostics each frame.'};
let server,lock,browser;
try{
 server=await startDistPreview({dist:process.env.ATLAS_DIST});report.build=server.build;
 lock=await acquireGpuLock({owner:'Anitar LOD attribution and upload comparison',capture:true,retryMs:30000});
 browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});report.browser=browser.version();
 for(const mode of ['profile-full','full','rows']){
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  const params=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:world.bodyId.split('/planet/')[0],body:world.bodyId,date:world.date,wv:encodeVersions(CURRENT_VERSIONS),mv:MODEL_MANIFEST_ID,'fauna-lod-prototype':'float'});
  if(mode==='profile-full')params.set('fauna-lod-profile','1');if(mode==='rows')params.set('fauna-lod-upload','rows');
  await page.goto(server.base+'?'+params);await page.waitForFunction(()=>window.__atlas?.ready&&window.__atlas.terrain.tiles.ready,undefined,{timeout:180000});
  const reset=async()=>{await page.evaluate(({pose,date})=>{const a=window.__atlas;a.setRenderQuality('high');a.setExplorationPaused(true);a.seek(date);a.setPose(pose.p,pose.q,pose.clearance);},{pose,date:world.date});await page.waitForTimeout(6000);await page.waitForFunction(()=>{const a=window.__atlas,p=a.renderDebug().planet,b=a.perfSample().backlog,l=p.faunaLod?.diagnostics();return b.terrainPending===0&&b.lifePending===0&&b.faunaTerrainPending===0&&!a.forestAssets.loading&&l&&l.coldJobs===0&&l.pendingResults===0&&p.faunaLod.idle;},undefined,{timeout:180000});};
  const snapshot=()=>page.evaluate(()=>{const a=window.__atlas,d=a.renderDebug(),r=d.renderer;return {date:a.date.offsetNs,lod:a.faunaLodTrace(),backlog:a.perfSample().backlog,quality:a.qualitySettings().renderQuality,pixelRatio:r.getPixelRatio(),canvas:[r.domElement.width,r.domElement.height],shadow:{enabled:r.shadowMap.enabled,type:r.shadowMap.type,mapSize:d.light.shadow.mapSize.toArray()},clouds:a.terrain.tiles.clouds};});
  await reset();const run={mode,windows:[]};report.runs.push(run);
  for(const phase of ['first-moving','continued-moving']){
   const before=await snapshot();await page.evaluate(()=>{const a=window.__atlas,c=a.renderDebug().planet.faunaLod;window.__workerSamples={frames:0,workerFrames:0,pendingFrames:0,events:[],stopped:false};let previous=null;const tick=()=>{const s=window.__workerSamples;if(s.stopped)return;const busy=!!c.running,pending=!!c.pending;s.frames++;if(busy)s.workerFrames++;if(pending)s.pendingFrames++;if(busy!==previous){s.events.push({frame:s.frames,busy,date:a.date.offsetNs});previous=busy;}requestAnimationFrame(tick);};requestAnimationFrame(tick);a.setExplorationPaused(false);});
   const timing=await samplePlanetCpuWindow(page,{frames:180});const streaming=await page.evaluate(()=>{const s=window.__workerSamples;s.stopped=true;return s;});const after=await snapshot();assert.deepEqual(before.quality,after.quality);assert.equal(before.pixelRatio,after.pixelRatio);assert.deepEqual(before.canvas,after.canvas);assert.deepEqual(before.shadow,after.shadow);assert.equal(timing.profile.disjointQueries,0);assert.equal(timing.profile.skippedQueries,0);run.windows.push({phase,before,after,timing,streaming});await writeFile(out+'/report.json',JSON.stringify(report,null,2));
   console.log(JSON.stringify({mode,phase,workerFrames:streaming.workerFrames,cpu:timing.profile.statistics['cpu/frameWorkMs'],gpu:timing.profile.statistics['gpu/framePassSumMs']}));
  }
  await reset();run.pixelState=await snapshot();await page.locator('canvas').first().screenshot({path:out+'/'+mode+'.png'});await page.close();
 }
 assert.deepEqual(report.errors,[]);report.ok=true;
}finally{await browser?.close();await lock?.release();if(server)await stopServer(server.child);await writeFile(out+'/report.json',JSON.stringify(report,null,2));}
