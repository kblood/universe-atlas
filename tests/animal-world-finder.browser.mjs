import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {acquireGpuLock} from './helpers/gpu-lock.mjs';
import {startDistPreview,stopServer} from './helpers/free-port.mjs';
const out=process.env.ATLAS_RESULTS||'test-results/animal-world-finder-browser';
await mkdir(out,{recursive:true});
const server=process.env.ATLAS_URL?null:await startDistPreview({dist:process.env.ATLAS_DIST||'dist'});
const base=process.env.ATLAS_URL||server.base;
let lock,browser,page;
const errors=[],requests=[];
const report={ok:false,base,errors,requests,steps:[]};
const snapshot=()=>page.evaluate(()=>{
  const a=window.__atlas,t=a?.travel,d=a?.terrain?.tiles;
  const ids=d?.faunaDrawn?.map(x=>x.id)||[];
  const center=t?.bodies?.find(body=>body.id===a?.state?.body?.id)?.positionM;
  return {status:document.getElementById('status')?.textContent,body:a?.state?.body?.id,date:a?.date,
    travel:t?{walking:t.walking,landing:t.landing,surfaceJourney:t.surfaceJourney,autopilot:t.autopilot,
      terrainCruise:t.terrainCruise,clearanceM:t.surface?.terrainClearance,speed:t.speed,position:t.position,
      bodyRelativeM:center?t.position.map((v,i)=>v-center[i]):null,heading:t.heading}:null,
    lifeGate:a?.lifeGate,tiles:d,faunaTrace:ids.length?a.faunaTrace(ids):null,drawEvidence:window.__finderDrawEvidence?.counts};
});
async function checkpoint(label){const state=await snapshot();report.steps.push({label,state});
  await writeFile(out+'/progress.json',JSON.stringify(report,null,2));console.log(JSON.stringify({step:label,body:state.body,travel:state.travel,
    floraSubmitted:state.tiles?.floraSubmittedCount,floraCameraCandidates:state.tiles?.floraSurvivorCount,faunaDrawn:state.tiles?.faunaDrawn?.length,drawEvidence:state.drawEvidence}));return state;}
try{
  lock=await acquireGpuLock({owner:'animal-world-finder browser',capture:true,retryMs:30000});
  browser=await chromium.launch({headless:true,args:process.platform==='win32'?['--use-angle=d3d11','--enable-gpu']:['--enable-gpu']});
  page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>requests.push(r.url()));
  report.buildInfo=await fetch(new URL('build-info.json',base)).then(r=>r.json());
  await page.goto(base+'?seed=LETHRA-001&g=G001');
  await page.waitForFunction(()=>window.__atlas?.ready&&window.__atlas.state.level==='galaxy',undefined,{timeout:90000});
  await page.locator('#find-animal-worlds').click();
  await page.waitForFunction(()=>document.querySelectorAll('[data-animal-world]').length>0,undefined,{timeout:60000});
  const initial=await page.locator('[data-animal-world]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.animalWorld,text:n.textContent})));
  report.initial=initial;
  assert.equal(initial.length,5);
  for(const row of initial){assert.ok(row.id.startsWith('G001/'));assert.ok(row.id.includes('/planet/'));assert.ok(!row.id.includes('/moon/'));assert.match(row.text,/[1-9]\d* animal species/);}
  await page.screenshot({path:out+'/01-planets-with-animals.png'});
  await page.locator('#more-animal-worlds').click();
  await page.waitForFunction(previous=>{const rows=[...document.querySelectorAll('[data-animal-world]')];return rows.length>0&&rows[0].dataset.animalWorld!==previous;},initial[0].id,{timeout:60000});
  const more=await page.locator('[data-animal-world]').evaluateAll(nodes=>nodes.map(n=>n.dataset.animalWorld));
  assert.ok(more.every(id=>!initial.some(row=>row.id===id)),'next page does not repeat systems');
  await page.locator('#timeline > summary').click();
  await page.locator('#time-reset').click();
  await page.waitForFunction(()=>document.querySelectorAll('[data-animal-world]').length===0);
  await page.locator('#timeline > summary').click();
  await page.locator('#find-animal-worlds').click();
  await page.waitForFunction(()=>document.querySelectorAll('[data-animal-world]').length===5,undefined,{timeout:60000});
  const replay=await page.locator('[data-animal-world]').evaluateAll(nodes=>nodes.map(n=>n.dataset.animalWorld));
  assert.deepEqual(replay,initial.map(r=>r.id),'reference-date replay returns the same planets');
  await page.locator('[data-animal-world]').first().click();
  await page.waitForFunction(id=>window.__atlas?.ready&&window.__atlas.state.level==='body'&&window.__atlas.state.body?.id===id,initial[0].id,{timeout:90000});
  assert.ok(await page.locator('#find-life').isVisible(),'visited animal planet offers living-habitat navigation');
  await page.screenshot({path:out+'/02-visited-animal-planet.png'});
  await checkpoint('visited-first-animal-world');
  await page.locator('#find-life').click();
  await page.waitForFunction(()=>{const a=window.__atlas,t=a?.travel;return !t?.walking&&!t?.landing&&!t?.surfaceJourney&&!t?.autopilot&&
    t?.terrainCruise!==null&&a?.terrain?.tiles?.surfaceReady&&t?.surface?.terrainClearance<=110;},undefined,{timeout:180000});
  const arrival=await checkpoint('habitat-low-flight-arrival');
  // Observe real main-camera submissions, including tree meshes and near rigs.
  // A shadow pass, lifeGate, population count or candidate list cannot pass this gate.
  await page.evaluate(()=>{
    const debug=window.__atlas.renderDebug(),p=debug.planet,seen=new Set(),hooks=[],counts={flora:0,fauna:0};
    const roots={flora:['flora','forestNear','forestMiddle','forestFar'].flatMap(name=>p.profilingObjects(name)),
      fauna:[...p.profilingObjects('fauna'),p.faunaNear?.group].filter(Boolean)};
    for(const [kind,objects] of Object.entries(roots))for(const root of objects)root.traverse(object=>{
      if(!object.isMesh||seen.has(object))return;seen.add(object);const original=object.onAfterRender;
      object.onAfterRender=function(...args){original.apply(this,args);if(args[2]===debug.camera&&
        (object.isInstancedMesh?object.count>0:(object.geometry?.attributes?.position?.count||0)>0))counts[kind]++;};
      hooks.push([object,original]);
    });
    window.__finderDrawEvidence={counts,hooks};
  });
  await page.waitForTimeout(15000);
  await checkpoint('habitat-streaming-15s');
  await page.screenshot({path:out+'/03-habitat-low-flight.png'});
  await page.waitForFunction(()=>{const a=window.__atlas,d=a?.terrain?.tiles,e=window.__finderDrawEvidence?.counts;
    if(!(e?.flora>0&&e?.fauna>0&&d?.faunaDrawn?.length>0))return false;
    return a.faunaTrace(d.faunaDrawn.map(x=>x.id)).individuals.some(x=>x.cameraVisible&&x.drawnIndex!==null&&x.drawnIndex!==undefined);
  },undefined,{timeout:120000});
  const habitat=await checkpoint('habitat-visible-flora-and-fauna');
  assert.equal(habitat.body,initial[0].id,'habitat remains on the first actual finder planet');
  assert.ok(!habitat.travel.walking&&!habitat.travel.landing,'living habitat is visible without Land and walk');
  assert.ok(!habitat.travel.surfaceJourney&&!habitat.travel.autopilot,'habitat journey finishes');
  assert.ok(habitat.travel.clearanceM>0&&habitat.travel.clearanceM<=110,'arrival is low flight above the surface');
  assert.ok(Math.hypot(...habitat.travel.bodyRelativeM.map((v,i)=>v-arrival.travel.bodyRelativeM[i]))<2,
    'habitat arrival holds its position above the living site instead of continuing to fly');
  assert.ok(habitat.drawEvidence.flora>0&&habitat.drawEvidence.fauna>0,'main-camera flora and fauna meshes rendered');
  await page.screenshot({path:out+'/04-visible-habitat.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  assert.deepEqual(await fetch(new URL('build-info.json',base)).then(r=>r.json()),report.buildInfo,'served build remains unchanged during the route');
  Object.assign(report,{ok:true,more,replay,visited:initial[0].id,habitat});
  await writeFile(out+'/report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({ok:true,worlds:initial.length,visited:initial[0].id}));
}catch(error){await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});Object.assign(report,{error:String(error),failureState:page?await snapshot().catch(()=>null):null});await writeFile(out+'/failure.json',JSON.stringify(report,null,2));throw error;}
finally{await browser?.close().catch(()=>{});await lock?.release();if(server)await stopServer(server.child);}
