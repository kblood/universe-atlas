import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { browserArgs } from '../../tests/browser-options.mjs';
import { encodeVersions, CURRENT_VERSIONS } from '../../src/time-nav.ts';

const base = process.env.ATLAS_URL || 'http://127.0.0.1:5197/';
const out = process.env.ATLAS_RESULTS || 'test-results/tree-forest-integration/run';
const assetRoot = process.env.ATLAS_TREE_FAMILY || 'C:/LLM/IWSDK/Assets/_assetctl/atlas-ez-family-f';
const bodyId = 'G001/C2128,0,1/0/planet/1';
const systemId = 'G001/C2128,0,1/0';
const initialDate = 435084631200000032044300000n;
const shiftedDate = initialDate + 31_536_000_000_000_000n;
const query = new URLSearchParams({ seed: 'LETHRA-001', g: 'G001', system: systemId, body: bodyId,
  date: initialDate.toString(), wv: encodeVersions(CURRENT_VERSIONS) });
await mkdir(out, { recursive: true });
const assetPaths=[`${assetRoot}/atlas-ez-oak.glb`,`${assetRoot}/atlas-ez-oak.lod1.glb`];
const assetBytes=await Promise.all(assetPaths.map(async path=>(await readFile(path)).length));
const sourcePaths=['src/tree-asset.ts','src/tree-forest-coverage.ts','src/local-aerial-perspective.ts','src/planet-forest.ts','src/planet-renderer.ts','src/main.ts','src/forest-tree-catalogue.ts'];
const sha256=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
const startHashes=Object.fromEntries(await Promise.all([...sourcePaths,...assetPaths,'test-results/tree-forest-integration/acceptance.browser.mjs'].map(async path=>[path,await sha256(path)])));
const browser = await chromium.launch({ headless: true, args: browserArgs });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(`page: ${error.message}`));
page.on('crash',()=>errors.push('page: renderer crashed'));
page.on('close',()=>errors.push('page: closed during browser run'));
page.on('console', message => {
  if (message.type() === 'error' && !message.text().startsWith('[vite] failed to connect to websocket.')) errors.push(`console: ${message.text()}`);
});
if (typeof page.routeWebSocket === 'function') await page.routeWebSocket('**/*', socket => socket.close());
const waitFor = (fn, timeout = 180000, arg) => page.waitForFunction(fn, arg, { timeout });
const state = () => page.evaluate(() => {
  const a=window.__atlas,t=a?.terrain?.tiles,f=t?.forest,d=f?.detailedTrees;
  const body=a?.travel?.bodies?.find(x=>x.id===a?.state?.body?.id);
  const position=body?a.travel.position.map((v,i)=>(v-body.positionM[i])):null;
  return {date:a?.date?.offsetNs,bodyId:a?.state?.body?.id,level:a?.state?.level,
    positionM:position,travel:{active:a?.travel?.active,domain:a?.travel?.domain,clearanceM:a?.travel?.surface?.terrainClearance},
    forest:f?{visible:f.visible,near:f.near,cached:f.cached,pending:f.pending,originVersion:f.originVersion,
      originRebased:f.originRebased,originRebaseM:f.originRebaseM,matrixWrites:f.matrixWrites,
      selectionPending:f.selectionPending,workerFailures:f.workerFailures,detailedTrees:d,
      fullCanopy:f.fullCanopy}:null,
    terrain:t?{pending:t.pending,staleWaterPatches:t.staleWaterPatches,failures:t.failures,
      waterBucket:t.waterBucket,localAerial:t.localAerial}:null,lifeGate:a?.lifeGate};
});
let report={ok:false,base,out,bodyId,assetRoot,assetBytes:{lod0:assetBytes[0],lod1:assetBytes[1]},dates:{initial:initialDate.toString(),shifted:shiftedDate.toString()},inputHashes:startHashes,phases:[],errors};
try {
  await page.goto(`${base}?${query}`,{waitUntil:'domcontentloaded'});
  await waitFor(id=>window.__atlas?.ready&&window.__atlas.state.level==='body'&&window.__atlas.state.body?.id===id&&!window.__atlas.camera.animating,180000,bodyId);
  await page.locator('#find-life').click();
  await waitFor(()=>window.__atlas.travel.terrainCruise!==null);
  await page.keyboard.down('q');
  await waitFor(()=>window.__atlas.travel.surface?.terrainClearance<100,180000);
  await page.keyboard.up('q');
  await page.evaluate(()=>window.__atlas.setExplorationPaused(true));
  await waitFor(()=>{const f=window.__atlas.terrain?.tiles?.forest,c=f?.fullCanopy;
    return f?.visible>200&&c?.ready&&c.trees>100000&&!c.selectionPending&&!c.selectionApplyPending&&!c.reusePending&&c.queuedPatches===0&&c.jobsInFlight===0;},240000);
  const beforeLoad=await state();
  assert.ok(beforeLoad.forest.visible>0,'canonical forest is resident before loading the replacement asset family');
  await page.evaluate(()=>{const input=document.createElement('input');input.type='file';input.multiple=true;input.id='forest-family-fixture';document.body.append(input);});
  await page.locator('#forest-family-fixture').setInputFiles(assetPaths);
  const loaded=await page.evaluate(async ()=>{
    const input=document.querySelector('#forest-family-fixture');
    const files=[...input.files];
    try{return await window.__atlas.loadForestTreeAssets(await files[0].arrayBuffer(),await files[1].arrayBuffer(),{foliageCoverage:'mask',leafTransmission:{factor:0.35,tint:[0.75,1,0.8]}});}
    finally{input.remove();}
  });
  assert.equal(loaded,true,'development hook installs actual family F into the visited planet');
  await waitFor(()=>{const d=window.__atlas.terrain?.tiles?.forest?.detailedTrees;return d?.ready&&!d.loading&&d.visible.some(n=>n>0)&&d.samples.length>0;},90000);
  await page.waitForTimeout(1500);
  const installed=await state();
  await page.screenshot({path:`${out}/detailed-forest-initial.png`});
  report.phases.push({label:'initial-family-installed',state:installed});
  assert.equal(installed.bodyId,bodyId);
  assert.ok(installed.forest.detailedTrees.visible.reduce((a,b)=>a+b,0)>0,'detailed trees are drawn');
  assert.ok(installed.forest.detailedTrees.species>0,'dated catalogue has tree species');
  assert.ok(installed.forest.detailedTrees.samples.length>0,'bounded diagnostics expose canonical detailed tree samples');
  assert.ok(installed.terrain.localAerial,'planet renderer reports local aerial material hooks');
  assert.deepEqual(installed.terrain.localAerial.failures,[],'local aerial hooks attach to the loaded bark and foliage materials');
  const samples0=installed.forest.detailedTrees.samples;
  const stableMap=Object.fromEntries(samples0.map(x=>[x.id,{speciesId:x.speciesId,recipe:x.recipe,heightM:x.heightM,windPhase01:x.windPhase01}]));

  await page.evaluate(date=>{window.__atlas.setExplorationPaused(true);window.__atlas.seek(date);},shiftedDate.toString());
  await waitFor(date=>{const a=window.__atlas,t=a?.terrain?.tiles,f=t?.forest,c=f?.fullCanopy;
    return a?.date?.offsetNs===date&&t?.pending===0&&t?.staleWaterPatches===0&&f?.pending===0&&
      c?.ready&&!c.selectionPending&&!c.selectionApplyPending&&!c.reusePending&&c.queuedPatches===0&&c.jobsInFlight===0;},180000,shiftedDate.toString());
  const shifted=await state();report.phases.push({label:'date-plus-one-year',state:shifted});
  await page.screenshot({path:`${out}/detailed-forest-date-shift.png`});
  assert.equal(shifted.forest.detailedTrees.ready,true);
  assert.ok(shifted.forest.detailedTrees.visible.reduce((a,b)=>a+b,0)>0,'detailed representation remains available after date seek');

  await page.evaluate(date=>{window.__atlas.setExplorationPaused(true);window.__atlas.seek(date);},initialDate.toString());
  await waitFor(date=>{const a=window.__atlas,t=a?.terrain?.tiles,f=t?.forest,c=f?.fullCanopy;
    return a?.date?.offsetNs===date&&t?.pending===0&&t?.staleWaterPatches===0&&f?.pending===0&&
      c?.ready&&!c.selectionPending&&!c.selectionApplyPending&&!c.reusePending&&c.queuedPatches===0&&c.jobsInFlight===0;},180000,initialDate.toString());
  await page.waitForTimeout(700);
  const returned=await state();report.phases.push({label:'date-return',state:returned});
  await page.screenshot({path:`${out}/detailed-forest-date-return.png`});
  const returnedById=Object.fromEntries(returned.forest.detailedTrees.samples.map(x=>[x.id,x]));
  const stableIds=Object.keys(stableMap).filter(id=>returnedById[id]);
  const replayMismatches=stableIds.filter(id=>{const a=stableMap[id],b=returnedById[id];return a.speciesId!==b.speciesId||a.recipe!==b.recipe||a.heightM!==b.heightM||a.windPhase01!==b.windPhase01;});
  report.dateReplay={baselineSampleCount:samples0.length,returnedSampleCount:returned.forest.detailedTrees.samples.length,
    matchingIds:stableIds.length,mismatches:replayMismatches.slice(0,10)};
  assert.ok(stableIds.length>0,'same resident canonical IDs can be compared after date return');
  assert.deepEqual(replayMismatches,[],'date return restores catalogue binding, physical height and deterministic wind phase for matching residents');

  // Exercise an actual keyboard movement across the forest origin rebase threshold.
  const origin0=returned.forest.originVersion,position0=returned.positionM;
  await page.evaluate(()=>window.__atlas.setExplorationPaused(false));
  await page.keyboard.down('Shift');await page.keyboard.down('w');
  await page.waitForTimeout(3500);
  await page.keyboard.up('w');await page.keyboard.up('Shift');
  await page.evaluate(()=>window.__atlas.setExplorationPaused(true));
  await waitFor(()=>{const f=window.__atlas.terrain?.tiles?.forest,c=f?.fullCanopy;return f?.visible>0&&c?.ready&&!c.selectionPending&&!c.selectionApplyPending&&!c.reusePending;},180000);
  const moved=await state();report.phases.push({label:'keyboard-movement-after-date-return',state:moved});
  await page.screenshot({path:`${out}/detailed-forest-after-movement.png`});
  const movementM=position0&&moved.positionM?Math.hypot(...moved.positionM.map((v,i)=>v-position0[i])):null;
  report.movement={distanceM:movementM,originVersionBefore:origin0,originVersionAfter:moved.forest.originVersion,
    thresholdM:moved.forest.originRebaseM,originRebased:moved.forest.originRebased};
  assert.ok(movementM>0,'keyboard input moved the observer');
  assert.ok(moved.forest.detailedTrees.visible.reduce((a,b)=>a+b,0)>0,'detailed forest survives real observer movement');
  assert.equal(moved.forest.workerFailures,0,'population worker stayed healthy');
  assert.equal(moved.terrain.failures,0,'terrain workers stayed healthy');
  report.renderer=await page.evaluate(()=>{const gl=document.querySelector('canvas')?.getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';});
  report.glError=await page.evaluate(()=>{const gl=document.querySelector('canvas')?.getContext('webgl2');return gl?.getError()??null;});
  const endHashes=Object.fromEntries(await Promise.all([...sourcePaths,...assetPaths,'test-results/tree-forest-integration/acceptance.browser.mjs'].map(async path=>[path,await sha256(path)])));
  report.sourceIntegrity={unchanged:Object.keys(startHashes).every(path=>startHashes[path]===endHashes[path]),start:startHashes,end:endHashes};
  assert.equal(report.sourceIntegrity.unchanged,true,'runtime source, test runner and GLB inputs did not change during the run');
  report.errors=errors;report.ok=errors.length===0&&report.glError===0;
  assert.equal(report.glError,0,'WebGL reports no error');
  assert.deepEqual(errors,[],'no page or console errors');
  await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify({ok:report.ok,renderer:report.renderer,glError:report.glError,assetBytes:report.assetBytes,
    initial:{visible:installed.forest.detailedTrees.visible,species:installed.forest.detailedTrees.species,samples:installed.forest.detailedTrees.samples.length},
    dateReplay:report.dateReplay,movement:report.movement,errors},null,2));
} catch(error) {
  report.ok=false;report.failure=String(error);report.errors=errors;
  const endHashes=Object.fromEntries(await Promise.all([...sourcePaths,...assetPaths,'test-results/tree-forest-integration/acceptance.browser.mjs'].map(async path=>[path,await sha256(path)])));
  report.sourceIntegrity={unchanged:Object.keys(startHashes).every(path=>startHashes[path]===endHashes[path]),start:startHashes,end:endHashes};
  report.current=await state().catch(()=>null);
  await writeFile(`${out}/failure.json`,JSON.stringify(report,null,2));
  await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});
  throw error;
} finally { await page.keyboard.up('q').catch(()=>{});await page.keyboard.up('w').catch(()=>{});await page.keyboard.up('Shift').catch(()=>{});await browser.close(); }
