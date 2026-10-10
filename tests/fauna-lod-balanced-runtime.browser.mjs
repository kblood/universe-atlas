/** Same-build counterbalanced controls; no screenshots inside measured windows. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {startDistPreview,stopServer} from './helpers/free-port.mjs';
import {acquireGpuLock} from './helpers/gpu-lock.mjs';
import {samplePlanetCpuWindow} from './helpers/planet-frame-window.mjs';
import {CURRENT_VERSIONS,MODEL_MANIFEST_ID,encodeVersions} from '../src/time-nav.ts';
const out=process.env.ATLAS_RESULTS||'test-results/fauna-lod-balanced';await mkdir(out,{recursive:true});const fixture=JSON.parse(await readFile('C:/LLM/IWSDK/Assets/_assetctl/life-presentation-20261009/baseline-flight/replay.json','utf8'));
let server,lock,browser;const report={ok:false,errors:[],runs:[],scope:'same frozen build, two variant orders, pinned high quality; paused and natural wall-clock moving windows reset to same initial date/pose; moving sampled end dates may differ with frame scheduling'};
try{server=await startDistPreview({dist:process.env.ATLAS_DIST});report.build=server.build;lock=await acquireGpuLock({owner:'balanced same-build animal LOD runtime comparison',capture:true,retryMs:30000});browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});report.browser=browser.version();
 for(const [order,variants] of [[0,[false,true]],[1,[true,false]]])for(const enabled of variants)for(const world of fixture.worlds){
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  const pose=world.views.find(v=>v.clearance===30),params=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:world.bodyId.split('/planet/')[0],body:world.bodyId,date:world.date,wv:encodeVersions(CURRENT_VERSIONS),mv:MODEL_MANIFEST_ID});params.set('fauna-lod-prototype',enabled?'float':'off');
  await page.goto(server.base+'?'+params);await page.waitForFunction(()=>window.__atlas?.ready&&window.__atlas.terrain.tiles.ready,undefined,{timeout:180000});
  const settle=async()=>{await page.evaluate(({pose,date})=>{const a=window.__atlas;a.setRenderQuality('high');a.setExplorationPaused(true);a.seek(date);a.setPose(pose.p,pose.q,pose.clearance);},{pose,date:world.date});await page.waitForTimeout(6000);
   await page.waitForFunction(enabled=>{const a=window.__atlas,p=a.renderDebug().planet,b=a.perfSample().backlog,l=p.faunaLod?.diagnostics();return b.terrainPending===0&&b.lifePending===0&&b.faunaTerrainPending===0&&!a.forestAssets.loading&&(!enabled||(l&&l.coldJobs===0&&l.pendingResults===0&&p.faunaLod.idle));},enabled,{timeout:180000});};
  const settings=()=>page.evaluate(()=>{const a=window.__atlas,d=a.renderDebug(),r=d.renderer,gl=r.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info');return {quality:a.qualitySettings().renderQuality,pixelRatio:r.getPixelRatio(),devicePixelRatio:devicePixelRatio,canvas:[r.domElement.width,r.domElement.height],drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],hardware:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):null,
   shadow:{enabled:r.shadowMap.enabled,type:r.shadowMap.type,autoUpdate:r.shadowMap.autoUpdate,mapSize:d.light.shadow.mapSize.toArray(),bias:d.light.shadow.bias,normalBias:d.light.shadow.normalBias},clouds:a.terrain.tiles.clouds};});
  const sample=()=>page.evaluate(()=>{const a=window.__atlas,ids=a.terrain.tiles.faunaDrawn.map(x=>x.id);return {date:a.date.offsetNs,ids,trace:a.faunaTrace(ids),lod:a.faunaLodTrace?.(),backlog:a.perfSample().backlog};});
  const run={order,enabled,world:world.bodyId,clearance:30,windows:[]};report.runs.push(run);
  for(const moving of [false,true]){await settle();const beforeSettings=await settings(),before=await sample();if(moving)await page.evaluate(()=>window.__atlas.setExplorationPaused(false));
   const timing=await samplePlanetCpuWindow(page,{frames:180});await page.evaluate(()=>window.__atlas.setExplorationPaused(true));const after=await sample(),afterSettings=await settings();
   assert.deepEqual(beforeSettings.quality,afterSettings.quality);assert.equal(beforeSettings.pixelRatio,afterSettings.pixelRatio);assert.deepEqual(beforeSettings.drawingBuffer,afterSettings.drawingBuffer);assert.deepEqual(beforeSettings.shadow,afterSettings.shadow);assert.equal(timing.profile.skippedQueries,0);assert.equal(timing.profile.disjointQueries,0);
   if(!moving)assert.equal(timing.before.date,timing.after.date);run.windows.push({moving,beforeSettings,afterSettings,before,after,timing});await writeFile(out+'/report.json',JSON.stringify(report,null,2));
   console.log(JSON.stringify({order,enabled,world:world.index,moving,cpu:timing.profile.statistics['cpu/frameWorkMs'],gpu:timing.profile.statistics['gpu/framePassSumMs'],coldJobs:after.lod?.lod?.coldJobs??0}));
  }await page.close();
 }assert.deepEqual(report.errors,[]);report.ok=true;
}finally{await browser?.close();await lock?.release();if(server)await stopServer(server.child);await writeFile(out+'/report.json',JSON.stringify(report,null,2));}
