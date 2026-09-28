// Separate diagnostic pass for the production legacy-forest smoke. This avoids
// repeating the full release-resource byte audit while investigating route/UI
// failures. It does not produce the publication receipt.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {browserArgs} from '../../tests/browser-options.mjs';
import {encodeVersions,CURRENT_VERSIONS} from '../../src/time-nav.ts';

const base=new URL(process.env.ATLAS_URL||'https://dionysus.dk/webxr/IWSDK/universe-atlas/');
const expectedCommit=process.env.ATLAS_SOURCE_COMMIT;
assert.ok(expectedCommit&&/^[a-f0-9]{40}$/.test(expectedCommit),'Set exact ATLAS_SOURCE_COMMIT');
const output=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'game-smoke');
await mkdir(output,{recursive:true});
const buildResponse=await fetch(new URL('build-info.json',base));
assert.equal(buildResponse.status,200);
const build=await buildResponse.json();assert.equal(build.commit,expectedCommit);assert.equal(build.dirty,false);
const bodyId='G001/C2128,0,1/0/planet/1';
const query=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:'G001/C2128,0,1/0',body:bodyId,
  date:'435084631200000032044300000',wv:encodeVersions(CURRENT_VERSIONS)});
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[],candidateRequests=[];
page.on('pageerror',error=>errors.push(`page: ${error.message}`));
page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`);});
page.on('request',request=>{if(/atlas-ez-oak(?:\.lod1)?\.glb/i.test(request.url()))candidateRequests.push(request.url());});
if(typeof page.routeWebSocket==='function')await page.routeWebSocket('**/*',socket=>socket.close());
const snapshot=()=>page.evaluate(()=>({url:location.href,status:document.querySelector('#status')?.innerText,
  ready:window.__atlas?.ready,state:window.__atlas?.state,travel:window.__atlas?.travel,camera:window.__atlas?.camera,
  date:window.__atlas?.date,lifeGate:window.__atlas?.lifeGate?{tMyr:window.__atlas.lifeGate.tMyr,floraStage:window.__atlas.lifeGate.floraStage,
    floraAvailableKinds:window.__atlas.lifeGate.floraAvailableKinds,treeSpecies:window.__atlas.lifeGate.treeSpecies?.length}:null,
  forest:window.__atlas?.terrain?.tiles?.forest}));
let report={expectedCommit,build,base:base.href,viewport:[1440,1000],bodyId,errors,candidateRequests,phases:[]};
try{
  await page.goto(new URL(`?${query}`,base).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(id=>window.__atlas?.ready&&window.__atlas.state.level==='body'&&window.__atlas.state.body?.id===id&&!window.__atlas.camera.animating,bodyId,{timeout:180000});
  report.phases.push({name:'body-ready',state:await snapshot()});
  const loader=await page.evaluate(async()=>{try{await window.__atlas.loadForestTreeAssets(new ArrayBuffer(8),new ArrayBuffer(8));return {rejected:false};}catch(error){return {rejected:true,message:String(error)};}});
  assert.equal(loader.rejected,true);assert.match(loader.message,/development build/);report.loader=loader;
  const button=page.locator('#find-life');await button.waitFor({state:'visible',timeout:30000});
  const buttonBefore=await button.evaluate(el=>{const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,top=document.elementFromPoint(x,y);
    return {text:el.textContent,disabled:el.disabled,rect:{x:r.x,y:r.y,width:r.width,height:r.height},topTag:top?.tagName,topId:top?.id,topText:top?.textContent?.trim()};});
  await page.screenshot({path:path.join(output,'before-find-life.png')});
  await button.click();
  report.phases.push({name:'immediate-after-click',buttonBefore,state:await snapshot()});
  await page.waitForTimeout(1500);report.phases.push({name:'after-1.5s',state:await snapshot()});
  await page.screenshot({path:path.join(output,'after-find-life-1.5s.png')});
  await page.waitForFunction(()=>window.__atlas.travel.terrainCruise!==null,null,{timeout:180000});
  report.phases.push({name:'terrain-cruise',state:await snapshot()});
  await page.keyboard.down('q');await page.waitForFunction(()=>window.__atlas.travel.surface?.terrainClearance<100,null,{timeout:180000});await page.keyboard.up('q');
  await page.evaluate(()=>window.__atlas.setExplorationPaused(true));
  await page.waitForFunction(()=>{const f=window.__atlas.terrain?.tiles?.forest,c=f?.fullCanopy;
    return f?.visible>0&&c?.ready&&c.trees>100000&&!c.selectionPending&&!c.selectionApplyPending&&!c.reusePending&&c.queuedPatches===0&&c.jobsInFlight===0&&c.failures===0;},null,{timeout:240000});
  report.phases.push({name:'legacy-forest-warmed',state:await snapshot()});
  assert.deepEqual(candidateRequests,[]);assert.deepEqual(errors,[]);
  const glError=await page.evaluate(()=>document.querySelector('canvas')?.getContext('webgl2')?.getError()??null);
  assert.equal(glError,0);report.renderer=await page.evaluate(()=>{const gl=document.querySelector('canvas')?.getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';});
  report.glError=glError;report.ok=true;
}catch(error){
  report.ok=false;report.failure=String(error);report.errors=errors;report.candidateRequests=candidateRequests;
  report.current=await snapshot().catch(()=>null);
  const button=page.locator('#find-life');
  report.findLife={count:await button.count().catch(()=>null),visible:await button.isVisible().catch(()=>null)};
  report.glError=await page.evaluate(()=>document.querySelector('canvas')?.getContext('webgl2')?.getError()??null).catch(()=>null);
  await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});
  throw error;
}finally{
  await page.keyboard.up('q').catch(()=>{});
  report.errors=errors;report.candidateRequests=candidateRequests;
  await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
  await browser.close();
}
