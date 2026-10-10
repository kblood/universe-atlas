import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {acquireGpuLock} from './helpers/gpu-lock.mjs';
import {startDistPreview,stopServer} from './helpers/free-port.mjs';
import {CURRENT_VERSIONS,MODEL_MANIFEST_ID,encodeVersions} from '../src/time-nav.ts';
const out=process.env.ATLAS_RESULTS||'test-results/forest-allocation-lifecycle';await mkdir(out,{recursive:true});
const fixture=JSON.parse(await readFile('C:/LLM/IWSDK/Assets/_assetctl/life-presentation-20261009/baseline-flight/replay.json','utf8')),report={worlds:[],errors:[],ok:false};let browser,server,lock;
try{
  server=await startDistPreview({dist:process.env.ATLAS_DIST||'dist'});report.build=server.build;lock=await acquireGpuLock({owner:'forest exact eligibility disposal/revisit',capture:true,retryMs:30000});browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});
  for(const world of fixture.worlds){
    const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>report.errors.push(String(e)));
    const params=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:world.bodyId.split('/planet/')[0],body:world.bodyId,date:world.date,wv:encodeVersions(CURRENT_VERSIONS),mv:MODEL_MANIFEST_ID});
    await page.goto(server.base+'?'+params);const waitReady=()=>page.waitForFunction(id=>window.__atlas?.ready&&window.__atlas.state.body?.id===id&&window.__atlas.terrain?.tiles?.ready,world.bodyId,{timeout:180000});await waitReady();
    const pose=world.views[0],sample=async()=>{await page.evaluate(p=>{window.__atlas.setExplorationPaused(true);window.__atlas.setPose(p.p,p.q,p.clearance);},pose);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await page.waitForFunction(()=>{const a=window.__atlas,b=a.perfSample().backlog;return b.terrainPending===0&&b.lifePending===0&&b.faunaTerrainPending===0&&!a.forestAssets.loading;},undefined,{timeout:180000});
      return page.evaluate(()=>{const a=window.__atlas,p=a.renderDebug().planet,f=p.forest.diagnostics();return {forest:f,ids:a.terrain.tiles.faunaDrawn.map(x=>x.id),flora:a.terrain.tiles.floraSubmittedCount,forestWorker:!!p.forest.worker,canopyWorker:!!p.forest.fullCanopy?.worker};});};
    const before=await sample();await page.evaluate(()=>{window.__heldForestPlanet=window.__atlas.renderDebug().planet;});await page.locator('#back').click();
    await page.waitForFunction(()=>window.__atlas.state.level==='system'&&window.__heldForestPlanet.disposed,undefined,{timeout:90000});
    const disposed=await page.evaluate(()=>{const p=window.__heldForestPlanet;return {planet:p.disposed,forest:p.forest.disposed,forestWorker:!!p.forest.worker,canopy:p.forest.fullCanopy!==null,attached:!!p.group.parent};});
    assert(disposed.planet&&disposed.forest);assert.equal(disposed.forestWorker,false);assert.equal(disposed.canopy,false);assert.equal(disposed.attached,false);
    const button=page.locator(`[data-select="${world.bodyId}"]`).first();await button.click();await page.keyboard.press('f');await waitReady();
    const after=await sample();assert.deepEqual([...before.ids].sort(),[...after.ids].sort());assert.equal(before.forest.visible,after.forest.visible);
    if(world.index===0){for(const s of [before,after]){assert.equal(s.forest.resourceState,'body-ineligible');assert.equal(s.forest.allocatedBytes,0);assert.equal(s.forestWorker,false);assert.equal(s.canopyWorker,false);}}
    else{assert(after.forest.visible>0);assert.equal(before.forest.memoryAccounting.retainedCpuBytes,after.forest.memoryAccounting.retainedCpuBytes);assert.equal(before.forest.memoryAccounting.estimatedGpuBytes,after.forest.memoryAccounting.estimatedGpuBytes);}
    report.worlds.push({world:world.bodyId,before,disposed,after});await writeFile(out+'/report.json',JSON.stringify(report,null,2));await page.close();
  }
  assert.deepEqual(report.errors,[]);report.ok=true;
}finally{await browser?.close();await lock?.release();if(server)await stopServer(server.child);await writeFile(out+'/report.json',JSON.stringify(report,null,2));}
