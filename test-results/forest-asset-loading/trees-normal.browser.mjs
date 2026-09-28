import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {browserArgs} from '../../tests/browser-options.mjs';
import {encodeVersions,CURRENT_VERSIONS} from '../../src/time-nav.ts';
import {unpackForestPresentation} from '../../src/forest-presentation.ts';

const base=process.env.ATLAS_URL||'http://127.0.0.1:5199/';
const out=process.env.ATLAS_RESULTS||'test-results/forest-asset-loading/normal-ui-c2bca35';
const expectedBuild=process.env.ATLAS_EXPECTED_COMMIT;assert.match(expectedBuild||'',/^[a-f0-9]{40}$/,'ATLAS_EXPECTED_COMMIT must be a full clean build SHA');
const servedBuild=await fetch(new URL('build-info.json',base)).then(r=>r.json());assert.equal(servedBuild.commit,expectedBuild);assert.equal(servedBuild.dirty,false);
const bodyId='G001/C2128,0,1/0/planet/1',systemId='G001/C2128,0,1/0';
const date=435084631200000032044300000n;
const query=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:systemId,body:bodyId,date:date.toString(),wv:encodeVersions(CURRENT_VERSIONS)});
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:browserArgs});
const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const page=await context.newPage();
const errors=[],expectedErrors=[],requests=[],responses=[],failedOnce={value:false},failureArmed={value:false},phases=[];
page.on('pageerror',e=>errors.push(`page: ${e.message}`));
page.on('crash',()=>errors.push('page crashed'));
page.on('console',m=>{
 if(m.type()!=='error'||m.text().startsWith('[vite] failed to connect to websocket.'))return;
 const url=m.location().url;
 if(failureArmed.value&&failedOnce.value&&expectedErrors.length===0&&/503/.test(m.text())&&
   (!url||url.endsWith('/branching/oak-lod0.glb')))expectedErrors.push({message:m.text(),url});
 else errors.push(`console: ${m.text()} (${url})`);
});
page.on('request',r=>{if(r.url().includes('/assets/forest/'))requests.push({url:r.url(),method:r.method()});});
page.on('response',r=>{if(r.url().includes('/assets/forest/'))responses.push({url:r.url(),status:r.status(),bytes:Number(r.headers()['content-length']||0)});});
await page.route('**/assets/forest/desktop-v1/branching/oak-lod0.glb',async route=>{
  if(failureArmed.value&&!failedOnce.value){failedOnce.value=true;await route.fulfill({status:503,contentType:'text/plain',body:'controlled acceptance failure'});}
  else await route.continue();
});
if(typeof page.routeWebSocket==='function')await page.routeWebSocket('**/*',ws=>ws.close());
const wait=(fn,timeout=180000,arg)=>page.waitForFunction(fn,arg,{timeout,polling:100});
const snapshot=()=>page.evaluate(()=>{
 const a=window.__atlas,t=a?.terrain?.tiles,f=t?.forest,c=f?.fullCanopy;
 return {ready:a?.ready,level:a?.state?.level,bodyId:a?.state?.body?.id,date:a?.date?.offsetNs,
  travel:{active:a?.travel?.active,clearance:a?.travel?.surface?.terrainClearance,position:a?.travel?.position},
  lifeGate:a?.lifeGate,forestAssets:a?.forestAssets,forest:f?{visible:f.visible,near:f.near,pending:f.pending,
   fullCanopy:c?{ready:c.ready,trees:c.trees,queuedPatches:c.queuedPatches,jobsInFlight:c.jobsInFlight,selectionPending:c.selectionPending,failures:c.failures}:null,
   detailedTrees:f.detailedTrees,farWork:f.farWork}:null,
  profile:a?.renderProfile};
});
const waitAssetsReady=async(timeout=180000)=>{
 await wait(()=>{const a=window.__atlas?.forestAssets,d=window.__atlas?.terrain?.tiles?.forest?.detailedTrees;
  return !!(a?.ready&&!a.loading&&d?.ready&&d.visible.some(n=>n>0))||!!(a?.error&&!a.loading);},timeout);
 const s=await snapshot();
 assert.ok(s.forestAssets?.ready&&!s.forestAssets.loading&&s.forest?.detailedTrees?.ready&&s.forest.detailedTrees.visible.some(n=>n>0),
  `normal detailed tree attach failed: ${s.forestAssets?.error||s.forest?.detailedTrees?.error||'not ready'}`);
 return s;
};
const record=async(name)=>{const state=await snapshot();phases.push({name,state,assetRequests:requests.length});await page.screenshot({path:`${out}/${name}.png`});return state;};
const timelineOpen=async(open)=>{
 if(await page.locator('#timeline').evaluate(element=>element.open)!==open)await page.locator('#timeline summary').click();
 await wait(value=>document.querySelector('#timeline').open===value,10000,open);
};
const clickToggle=async()=>{await timelineOpen(false);await page.locator('#forest-detail').waitFor({state:'visible',timeout:30000});await page.locator('#forest-detail').click();};
let cdp=null;
const report={ok:false,base,expectedBuild,servedBuild,startedAt:new Date().toISOString(),bodyId,errors,expectedErrors,requests,responses,phases};
try{
 await page.addInitScript(()=>localStorage.clear());
 await page.goto(`${base}?${query}`,{waitUntil:'domcontentloaded'});
 await wait(id=>window.__atlas?.ready&&window.__atlas.state.level==='body'&&window.__atlas.state.body?.id===id&&!window.__atlas.camera.animating,180000,bodyId);
 await page.locator('#find-life').click();
 await wait(()=>window.__atlas.travel.terrainCruise!==null,120000);
 await page.keyboard.down('q');
 await wait(()=>window.__atlas.travel.surface?.terrainClearance<180,180000);
 await page.keyboard.up('q');
 await page.evaluate(()=>window.__atlas.setExplorationPaused(true));
 await wait(()=>{const f=window.__atlas.terrain?.tiles?.forest,c=f?.fullCanopy;return f?.visible>100&&c?.ready&&!c.selectionPending&&!c.selectionApplyPending&&c.queuedPatches===0&&c.jobsInFlight===0;},240000);
 const basic=await record('01-basic-before');
 assert.equal(basic.bodyId,bodyId);assert.ok(basic.forest?.visible>0);assert.equal(basic.forestAssets?.enabled,false);

 // Normal product control loads the configured package; no debug file-input or JS loader hook.
 await clickToggle();
 await waitAssetsReady();
 let loaded=await record('02-loaded-normal-ui');
 assert.equal(loaded.forestAssets.enabled,true);assert.equal(loaded.forestAssets.error,'');assert.ok(loaded.forest.detailedTrees.visible.some(n=>n>0));
 assert.ok(requests.some(x=>x.url.endsWith('forest-bundle-manifest.json')));assert.ok(requests.some(x=>x.url.endsWith('branching/oak-lod0.glb')));assert.ok(requests.some(x=>x.url.endsWith('spire/conifer-lod0.glb')));
 // Verify dated tree identity through the visible day controls and exact return.
 const baseTreeDate=loaded.forest.detailedTrees.dateNs;
 const identityOf=samples=>Object.fromEntries(samples.map(x=>[x.id,{speciesId:x.speciesId,recipe:x.recipe,heightM:x.heightM,windPhase01:x.windPhase01}]));
 const initialIdentity=identityOf(loaded.forest.detailedTrees.samples);
 await timelineOpen(true);await page.locator('#time-day-forward').click();
 await wait(date=>window.__atlas.date.offsetNs!==date&&window.__atlas.terrain?.tiles?.forest?.detailedTrees?.dateNs===window.__atlas.date.offsetNs,60000,baseTreeDate);
 const dateForward=await record('02a-date-plus-one-day');
 await page.locator('#time-day-back').click();
 await wait(date=>window.__atlas.date.offsetNs===date&&window.__atlas.terrain?.tiles?.forest?.detailedTrees?.dateNs===date,60000,baseTreeDate);
 const dateReturned=await record('02b-date-return');await timelineOpen(false);
 const returnedIdentity=identityOf(dateReturned.forest.detailedTrees.samples),commonIds=Object.keys(initialIdentity).filter(id=>id in returnedIdentity);
 const identityMismatches=commonIds.filter(id=>JSON.stringify(initialIdentity[id])!==JSON.stringify(returnedIdentity[id]));
 report.dateReplay={baseDate:baseTreeDate,shiftedDate:dateForward.date,returnedDate:dateReturned.date,initialSamples:Object.keys(initialIdentity).length,returnedSamples:Object.keys(returnedIdentity).length,matchingIds:commonIds.length,mismatches:identityMismatches};
 assert.ok(commonIds.length>0);assert.deepEqual(identityMismatches,[],'date return preserves matched detailed-tree identity, recipe, height and stable wind phase');
 const handoffSamples=loaded.forest.detailedTrees.handoffSamples??[];const nearById=new Map(loaded.forest.detailedTrees.samples.map(x=>[x.id,x]));const handoffRows=handoffSamples.map(h=>{const near=nearById.get(h.id),far=h.far;if(!near||!far)return {id:h.id,status:'missing'};const code=unpackForestPresentation(far.code);const heightDelta=far.heightM-near.heightM;const familyMatch=code.kind===near.family;const barkDelta=code.bark-near.barkBrightness,foliageDelta=code.foliage-near.foliageBrightness;return {id:h.id,status:far.current?'current':'stale',nearFamily:near.family,farFamily:code.kind,heightDeltaM:heightDelta,barkDelta,foliageDelta,ownership:far.ownership,familyMatch,barkMatch:Math.abs(barkDelta)<=0.4/255,foliageMatch:Math.abs(foliageDelta)<=0.4/255};});const handoffMatches=handoffRows.filter(h=>h.status==='current'&&Math.abs(h.heightDeltaM)<1e-5&&h.familyMatch&&h.barkMatch&&h.foliageMatch);report.familyHandoffs={sampleCount:handoffRows.length,matched:handoffMatches.length,missing:handoffRows.filter(h=>h.status==='missing').map(h=>h.id),stale:handoffRows.filter(h=>h.status==='stale').map(h=>h.id),mismatches:handoffRows.filter(h=>h.status==='current'&&!handoffMatches.includes(h)),rows:handoffRows};

 await clickToggle();
 await wait(()=>!window.__atlas.forestAssets?.enabled&&!window.__atlas.terrain?.tiles?.forest?.detailedTrees?.ready,60000);
 const off=await record('03-disabled');assert.ok(off.forest.visible>0,'basic forest remains while detailed trees are off');

 // Force one real package request to fail. Basic canopy must remain drawable and Retry must be offered.
 failureArmed.value=true;await clickToggle();
 await wait(()=>window.__atlas.forestAssets?.error&&!window.__atlas.forestAssets.loading,120000);
 const failed=await record('04-controlled-fetch-failure');
 assert.ok(failedOnce.value,'route injected one 503 for Oak LOD0');assert.ok(failed.forestAssets.error);assert.ok(failed.forest.visible>0);
 assert.equal(await page.locator('#forest-retry').count(),1,'retry control is visible after error');

 await page.locator('#forest-retry').click();
 await waitAssetsReady();
 loaded=await record('05-retry-success');assert.equal(loaded.forestAssets.error,'');assert.ok(loaded.forest.detailedTrees.visible.some(n=>n>0));

 // Leave through the visible breadcrumb, then revisit the same canonical planet through its system list.
 const cachedVersion=loaded.forestAssets.source?.version??null;const assetRequestsBeforeDeparture=requests.length;
 await page.locator('#breadcrumbs button[data-level="system"]').click();
 await wait(()=>window.__atlas.state.level==='system'&&!window.__atlas.state.body,90000);
 await wait(()=>!window.__atlas.terrain?.tiles?.forest?.detailedTrees?.ready,30000);
 const departed=await record('06-left-planet');
 assert.equal(departed.level,'system');assert.equal(departed.forest?.detailedTrees?.ready??false,false,'detailed forest is detached from the departed system view');
 await page.locator(`[data-select="${bodyId}"]`).click();
 await page.locator('#explore').click();
 await wait(id=>window.__atlas.ready&&window.__atlas.state.level==='body'&&window.__atlas.state.body?.id===id&&!window.__atlas.camera.animating,120000,bodyId);
 await page.evaluate(()=>window.__atlas.setExplorationPaused(false));
 await page.locator('#find-life').waitFor({state:'visible',timeout:60000});
 await page.locator('#find-life').click();
 await wait(()=>window.__atlas.travel.terrainCruise!==null,120000);
 await page.keyboard.down('q');await wait(()=>window.__atlas.travel.surface?.terrainClearance<180,180000);await page.keyboard.up('q');
 await page.evaluate(()=>window.__atlas.setExplorationPaused(true));
 await wait(()=>window.__atlas.terrain?.tiles?.forest?.visible>100,90000);
 await waitAssetsReady();
 const revisited=await record('07-revisited-loaded');
 assert.equal(revisited.bodyId,bodyId);assert.ok(revisited.forest.detailedTrees.visible.some(n=>n>0));
 const cachedVersionAfter=revisited.forestAssets.source?.version??null;assert.equal(revisited.forestAssets.enabled,true,'Trees preference remains enabled after planet revisit');assert.equal(cachedVersionAfter,cachedVersion,'verified package byte cache survives leave/revisit');assert.equal(requests.length,assetRequestsBeforeDeparture,'return did not refetch the forest package');report.leaveRevisit={leftSystem:true,revisitedBodyId:revisited.bodyId,packageVersionBeforeDeparture:cachedVersion,packageVersionAfterReturn:cachedVersionAfter,requestsBeforeDeparture:assetRequestsBeforeDeparture,requestsAfterReturn:requests.length};

 // Instrumentation window is sampled only after queues settle. This is not a before/after optimization comparison.
 await wait(()=>{const f=window.__atlas.terrain?.tiles?.forest,c=f?.fullCanopy;return f?.pending===0&&c?.ready&&!c.selectionPending&&!c.selectionApplyPending&&c.queuedPatches===0&&c.jobsInFlight===0;},180000);
 await page.evaluate(()=>{window.__atlas.resetProfile();window.__atlas.setProfiling(true);});
 await page.waitForTimeout(2000);
 cdp=await context.newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.start');
 await page.waitForTimeout(6000);
 const cpu=await cdp.send('Profiler.stop');await cdp.send('Profiler.disable');
 await writeFile(`${out}/stationary-6s.cpuprofile`,JSON.stringify(cpu.profile));
 const profile=await page.evaluate(()=>window.__atlas.renderProfile);
 await page.evaluate(()=>window.__atlas.setProfiling(false));
 report.profile={windowMs:6000,prewarmMs:2000,renderProfile:profile,farWork:(await snapshot()).forest?.farWork??null};
 assert.ok(profile?.statistics?.frameIntervalMs?.samples>0,'opt-in render profile produced stationary frame samples');
 report.renderer=await page.evaluate(()=>{const gl=document.querySelector('canvas')?.getContext('webgl2'),e=gl?.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'unavailable';});
 report.glError=await page.evaluate(()=>document.querySelector('canvas')?.getContext('webgl2')?.getError()??null);
 assert.equal(report.glError,0);assert.deepEqual(errors,[]);
 assert.equal(responses.filter(r=>r.status===503&&r.url.endsWith('branching/oak-lod0.glb')).length,1,'exactly one controlled failure is recorded');
 assert.equal(expectedErrors.length,1,'only the injected 503 console error is expected');
 assert.ok(responses.some(r=>r.status===200&&r.url.endsWith('branching/oak-lod0.glb')),'retry recovered with HTTP 200');
 report.ok=true;report.finishedAt=new Date().toISOString();
 await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({ok:report.ok,renderer:report.renderer,phases:phases.map(p=>({name:p.name,assets:p.assetRequests,enabled:p.state.forestAssets?.enabled,ready:p.state.forestAssets?.ready,visible:p.state.forest?.visible,detailed:p.state.forest?.detailedTrees?.visible,error:p.state.forestAssets?.error})),requests:requests.length,profile:report.profile.renderProfile,glError:report.glError,errors},null,2));
}catch(error){
 report.failure=String(error);report.finishedAt=new Date().toISOString();report.current=await snapshot().catch(()=>null);report.url=page.url();report.failedOnce=failedOnce.value;
 await page.screenshot({path:`${out}/failure.png`,fullPage:true}).catch(()=>{});await writeFile(`${out}/failure.json`,JSON.stringify(report,null,2));throw error;
}finally{await page.keyboard.up('q').catch(()=>{});await cdp?.detach().catch(()=>{});await browser.close();}


















