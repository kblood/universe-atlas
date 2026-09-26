import {chromium} from 'playwright';
import {browserArgs} from './browser-options.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {DRAINAGE_VERSION} from '../src/drainage.ts';
const base=process.env.ATLAS_URL||'http://127.0.0.1:5186/',out=process.env.ATLAS_RESULTS||'test-results/drainage';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
if(process.env.ATLAS_DRAINAGE_FAULT)await page.addInitScript(()=>{
  const Native=Worker;let injected=false;
  window.Worker=class extends Native{constructor(url,options){super(url,options);if(String(url).includes('drainage-worker')&&!injected){injected=true;queueMicrotask(()=>this.dispatchEvent(new ErrorEvent('error',{cancelable:true,message:'Injected drainage worker fault'})));}}};
});
const address={seed:'LETHRA-001',g:'G001',system:'G001/C2128,0,1/0',body:'G001/C2128,0,1/0/planet/1'};
const wait=fn=>page.waitForFunction(fn,undefined,{timeout:180000});
const snapshot=()=>page.evaluate(()=>({drainage:window.__atlas.drainage,travel:window.__atlas.travel,terrain:window.__atlas.terrain.tiles,date:window.__atlas.date}));
async function analyse(){
  await page.locator('#drainage-panel summary').click();await page.locator('#drainage-build').click();
  if(process.env.ATLAS_DRAINAGE_FAULT){
    await wait(()=>window.__atlas.drainage.status==='error');await page.locator('#drainage-build').click();
  }
  await wait(()=>window.__atlas.drainage?.status==='ready'&&window.__atlas.drainage.visible);
}
async function download(){const event=page.waitForEvent('download');await page.locator('#drainage-export').click();const d=await event;await d.saveAs(out+'/graph.json');return JSON.parse(await readFile(out+'/graph.json','utf8'));}
try{
  await page.goto(base+'?'+new URLSearchParams(address));await wait(()=>window.__atlas?.ready&&window.__atlas.terrain?.tiles?.ready&&!window.__atlas.camera.animating);
  const before=await snapshot();await analyse();await page.waitForTimeout(1500);
  const map=await snapshot();assert.equal(map.drainage.stats.nodes,24578);assert.equal(map.drainage.catchments.length,12);
  assert.ok(map.drainage.accountedBytes<map.drainage.budgetBytes);assert.equal(map.travel.sceneId,before.travel.sceneId);
  await page.screenshot({path:out+'/01-drainage-globe.png'});
  await page.locator('#drainage-toggle').click();await page.waitForTimeout(100);assert.equal((await snapshot()).drainage.visible,false);
  await page.screenshot({path:out+'/02-map-hidden.png'});await page.locator('#drainage-toggle').click();
  const basin=map.drainage.catchments[1];await page.locator('#drainage-catchment').selectOption(basin.id);await page.locator('#drainage-inspect').click();
  await wait(()=>!window.__atlas.camera.animating);assert.equal((await snapshot()).drainage.selected,basin.id);
  await page.screenshot({path:out+'/03-selected-basin.png'});
  const graph=await download(),hash=createHash('sha256').update(JSON.stringify(graph)).digest('hex');
  assert.equal(graph.version,DRAINAGE_VERSION);assert.equal(graph.receiver.length,24578);assert.equal(graph.directions.length,24578*3);
  const perf=await page.evaluate(async()=>{const rows=[];let last=performance.now();for(let i=0;i<120;i++){await new Promise(requestAnimationFrame);const now=performance.now();rows.push(now-last);last=now;}rows.sort((a,b)=>a-b);const gl=document.querySelector('canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return {frames:rows.length,medianMs:rows[60],p95Ms:rows[114],renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown'};});
  await page.locator('#timeline summary').click();await page.locator('#date-years').fill('13800000000.1');await page.locator('#time-apply').click();
  assert.deepEqual((await snapshot()).drainage.catchments,map.drainage.catchments,'reference drainage is stable under time seeks');
  await page.locator('#time-reset').click();await page.locator('#timeline summary').click();
  // Repeated selection retains one overlay and a bounded allocation estimate.
  for(const c of map.drainage.catchments)await page.locator('#drainage-catchment').selectOption(c.id);
  assert.ok((await snapshot()).drainage.accountedBytes<map.drainage.budgetBytes);
  await page.locator('#drainage-catchment').selectOption(basin.id);await page.locator('#drainage-mouth').click();
  await wait(()=>window.__atlas.travel.terrainCruise===600);assert.equal((await snapshot()).drainage.visible,false,'cartographic shell hidden near ground');
  await page.locator('#walk-surface').click();await wait(()=>window.__atlas.travel.walking?.grounded);
  const landed=await snapshot(),p=landed.travel.walking.position,r=Math.hypot(...p);
  const missM=Math.hypot(...p.map((v,i)=>v/r-basin.mouth.direction[i]))*r;
  assert.ok(missM<2000);assert.ok(landed.terrain.accountedBytes+landed.drainage.accountedBytes<268435456);
  assert.equal(landed.travel.sceneId,map.travel.sceneId);await page.screenshot({path:out+'/04-outlet-ground.png'});
  await page.goto(base+'?'+new URLSearchParams(address));await wait(()=>window.__atlas?.ready&&window.__atlas.terrain?.tiles?.ready&&!window.__atlas.camera.animating);
  await analyse();assert.deepEqual((await snapshot()).drainage.catchments,map.drainage.catchments);
  assert.equal(createHash('sha256').update(JSON.stringify(await download())).digest('hex'),hash,'cold regeneration reproduces the complete graph');
  // Leave while a fresh worker owns an unfinished analysis. Late results must
  // not install a map onto the next view or leak the previous overlay.
  await page.reload();await wait(()=>window.__atlas?.ready&&window.__atlas.terrain?.tiles?.ready);
  await page.locator('#drainage-panel summary').click();await page.locator('#drainage-build').click();
  await page.locator('#breadcrumbs [data-level="system"]').click();await wait(()=>window.__atlas.ready&&window.__atlas.state.level==='system');
  await page.waitForTimeout(1200);assert.equal((await page.evaluate(()=>window.__atlas.drainage)),null);
  assert.deepEqual(errors,[]);
  const report={ok:true,base,map:map.drainage,perf,landed,missM,hash,errors};await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({ok:true,stats:map.drainage.stats,bytes:map.drainage.accountedBytes,buildMs:map.drainage.buildMs,perf,missM,hash,errors}));
}catch(error){await page.screenshot({path:out+'/failure.png'});console.log(JSON.stringify(await snapshot()));console.log(errors);throw error;}
finally{await browser.close();}
