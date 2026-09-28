// Attempt 2 corrected derivative of ../acceptance-inputs/normal-game-acceptance.mjs.
// NOT RUN: the GPU/browser slot was not confirmed with Luna acceptance/guide.
// Run it only once the slot is open, against a production build served on
// ATLAS_URL (default port 5212), from the worktree root:
//   node test-results/forest-visual-followup-opus/resume-2/normal-game-acceptance.mjs
//
// Corrections relative to the supplied route:
//  1. Date replay holds one frozen flight pose: time paused, same flight mode,
//     same body-relative position and heading, asserted before and after both
//     seeks; every queue drains before a signature is read.
//  2. Replay compares the whole-population census (__atlas.forestPresentationCensus:
//     every retained slot per family/LOD, digest over id/species/recipe/height/
//     structural variant/appearance variant/wind/tint) as well as the bounded samples.
//  3. Selected/eligible/owned/submitted occupancy is compared separately and
//     for the whole population, not inferred from the bounded HUD samples.
//  4. The far band must actually show the captured atlas: every screenshot
//     waits for farRepresentation 'captured-hemi-octahedral-atlas' with no
//     atlas error, and the report fails on any band/disc fallback.
//  5. Frame profile (including the forestAtlas pass) and memory figures.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { browserArgs } from '../../../tests/browser-options.mjs';
import { encodeVersions, CURRENT_VERSIONS } from '../../../src/time-nav.ts';

const base=process.env.ATLAS_URL||'http://127.0.0.1:5212/';
const out=process.env.ATLAS_RESULTS||'test-results/forest-visual-followup-opus/resume-2/browser';
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const sourceDirty=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().length>0;
const sourceFiles=['src/planet-canopy.ts','src/planet-forest.ts','src/forest-impostor.ts','src/forest-far-atlas.ts','src/tree-impostor-views.ts',
  'src/forest-presentation.ts','src/tree-asset.ts','src/tree-structural-variant.ts','src/tree-canopy-profile.ts','src/tree-canopy-bounds.ts',
  'src/forest-tree-family-library.ts','src/volumetric-clouds.ts'];
const sourceFilesSha256=Object.fromEntries(await Promise.all(sourceFiles.map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')])));
const buildInfo=JSON.parse(await readFile('dist/build-info.json','utf8'));
const builtAssetSha256=Object.fromEntries(await Promise.all((await readdir('dist/assets')).filter(name=>name.endsWith('.js')).map(async name=>[name,createHash('sha256').update(await readFile(`dist/assets/${name}`)).digest('hex')])));
const bodyId='G001/C2128,0,1/0/planet/1';
const pinnedDate='435084631200000032044300000';
const params=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:'G001/C2128,0,1/0',body:bodyId,date:pinnedDate,wv:encodeVersions(CURRENT_VERSIONS),trees:'1'});
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',e=>errors.push(`page: ${e.message}`));
page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('[vite] failed to connect to websocket.'))errors.push(`console: ${m.text()}`);});
if(typeof page.routeWebSocket==='function')await page.routeWebSocket('**/*',socket=>socket.close());
const waitFor=(fn,timeout=180000,arg)=>page.waitForFunction(fn,arg,{timeout});

const forestState=()=>page.evaluate(()=>{
  const a=window.__atlas,f=a?.terrain?.tiles?.forest,d=f?.detailedTrees,c=f?.fullCanopy;
  return {visible:f?.visible,near:f?.near,pending:f?.pending,selectionPending:f?.selectionPending,candidateCells:f?.candidateCells,farOwnedSkipped:f?.farOwnedSkipped,
    detailedTrees:d?{ready:d.ready,loading:d.loading,error:d.error,dateNs:d.dateNs,farRepresentation:d.farRepresentation,farAtlas:d.farAtlas,
      families:d.families?.map(x=>({kind:x.kind,submitted:x.submitted,retainedSlots:x.retainedSlots,capacities:x.capacities,lod1CardScale:x.lod1CardScale,cardCompensation:x.cardCompensation}))}:null,
    fullCanopy:c?{ready:c.ready,trees:c.trees,patches:c.patches,jobsInFlight:c.jobsInFlight,queuedPatches:c.queuedPatches,selectionPending:c.selectionPending,
      failures:c.failures,capacityMisses:c.capacityMisses,nearPresentNotInCensus:c.nearPresentNotInCensus,nearAbsentInCensus:c.nearAbsentInCensus,
      attributeBytes:c.attributeBytes,retainedCoordinateBytes:c.retainedCoordinateBytes,rebaseBufferBytes:c.rebaseBufferBytes}:null,
    terrainPending:a?.terrain?.tiles?.pending,surfaceReady:a?.terrain?.tiles?.surfaceReady};
});
// Body-relative pose and mode; the frozen-pose precondition for the replay.
const pose=()=>page.evaluate(id=>{
  const t=window.__atlas.travel,b=t.bodies.find(v=>v.id===id);if(!b)throw new Error('target body not in travel state');
  return {active:t.active,domain:t.domain,landing:t.landing,walking:!!t.walking?.active,surfaceJourney:t.surfaceJourney,terrainCruise:t.terrainCruise,
    paused:t.explorationClock.paused,running:t.explorationClock.running,
    relativeM:t.position.map((v,i)=>v-b.positionM[i]),heading:t.heading,clearanceM:t.surface?.terrainClearance??null};
},bodyId);
const assertSamePose=(a,b,label)=>{
  for(const key of ['active','domain','landing','walking','surfaceJourney','terrainCruise','paused','running'])assert.deepEqual(b[key],a[key],`${label}: ${key} unchanged`);
  assert.ok(a.paused&&!a.running,`${label}: exploration clock is paused`);
  const moved=Math.hypot(...a.relativeM.map((v,i)=>v-b.relativeM[i]));assert.ok(moved<1e-3,`${label}: body-relative position held (${moved} m)`);
  const turned=Math.max(...a.heading.map((v,i)=>Math.abs(v-b.heading[i])));assert.ok(turned<1e-9,`${label}: heading held (${turned})`);
};
// Every queue that feeds the forest presentation has drained.
const drained=()=>waitFor(()=>{
  const a=window.__atlas,tiles=a?.terrain?.tiles,f=tiles?.forest,d=f?.detailedTrees,c=f?.fullCanopy;
  return !!(tiles?.surfaceReady&&tiles.pending===0&&f&&f.pending===0&&!f.selectionPending&&d?.ready&&!d.loading&&!d.error&&
    c?.ready&&c.jobsInFlight===0&&c.queuedPatches===0&&!c.selectionPending);
},180000);
// The far band must be the captured atlas for every presented family.
const atlasAdopted=()=>waitFor(()=>{
  const d=window.__atlas?.terrain?.tiles?.forest?.detailedTrees;
  if(d?.farAtlas?.error)throw new Error(`far atlas failed: ${d.farAtlas.error}`);
  return d?.farRepresentation==='captured-hemi-octahedral-atlas'&&d.farAtlas.adopted.includes('branching')&&d.farAtlas.adopted.includes('spire');
},240000);
const signature=()=>page.evaluate(()=>{
  const a=window.__atlas,d=a.terrain.tiles.forest.detailedTrees;
  return {dateNs:d.dateNs,
    samples:(d.samples??[]).map(s=>({id:s.id,speciesId:s.speciesId,recipe:s.recipe,heightM:s.heightM,structuralVariant:s.structuralVariant,
      variant:s.variant,windPhase01:s.windPhase01,barkBrightness:s.barkBrightness,foliageBrightness:s.foliageBrightness})).sort((x,y)=>x.id.localeCompare(y.id)),
    census:a.forestPresentationCensus()};
});
const occupancy=census=>({selected:census.selected,eligible:census.eligible,farOwned:census.farOwned,legacySubmitted:census.legacySubmitted,
  families:census.families.map(f=>({kind:f.kind,lods:f.lods.map(l=>({owned:l.owned,submitted:l.submitted,unbound:l.unbound,variantHistogram:l.variantHistogram}))}))});
const identity=census=>census.families.map(f=>({kind:f.kind,digests:f.lods.map(l=>l.digest)}));
const shot=async(name,report)=>{
  await atlasAdopted();await drained();await page.waitForTimeout(800);
  report.phases[name]={pose:await pose(),forest:await forestState()};
  await page.screenshot({path:`${out}/${name}.png`});
};
const memory=()=>page.evaluate(()=>{
  const a=window.__atlas,d=a.terrain?.tiles?.forest?.detailedTrees;
  return {stats:{draws:a.stats.draws,triangles:a.stats.triangles,geometries:a.stats.geometries,textures:a.stats.textures},
    farAtlasBytes:(d?.farAtlas?.families??[]).reduce((n,x)=>n+x.bytes,0),farAtlasScratchBytes:(d?.farAtlas?.families??[]).reduce((n,x)=>n+x.scratchBytes,0),
    jsHeap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize}:null};
});

let report={ok:false,base,bodyId,pinnedDate,errors,phases:{},notes:[
  'Distance bands are read from the frozen low-flight frames: <110 m foreground, 250-500 m middle, >600 m captured-atlas band; walking-close is the <110 m LOD0 check.',
  'Manual PNG review is required; this script does not judge appearance.']};
try{
  await page.goto(`${base}?${params}`,{waitUntil:'domcontentloaded'});
  await waitFor(id=>window.__atlas?.ready&&window.__atlas.state.level==='body'&&window.__atlas.state.body?.id===id&&!window.__atlas.camera.animating,180000,bodyId);
  await page.evaluate(()=>{window.__atlas.setCloudSceneSamples(0);window.__atlas.setProfiling(true);});
  await page.locator('#find-life').click();
  await waitFor(()=>window.__atlas.travel.terrainCruise!==null);
  await page.keyboard.down('q');await waitFor(()=>window.__atlas.travel.surface?.terrainClearance<100);await page.keyboard.up('q');
  await page.evaluate(()=>window.__atlas.setExplorationPaused(true));
  await waitFor(()=>window.__atlas.terrain?.tiles?.forest?.visible>200);
  await waitFor(()=>{const a=window.__atlas,d=a?.terrain?.tiles?.forest?.detailedTrees;return a?.forestAssets?.ready&&d?.families?.some(f=>f.kind==='branching')&&d.families.some(f=>f.kind==='spire');},240000);
  await waitFor(()=>{const c=window.__atlas.terrain?.tiles?.forest?.fullCanopy;return c?.enabled&&c.ready&&c.trees>100000;},240000);
  await shot('flight-near-ground',report);

  // Frozen-pose date replay: same flight mode and pose around both seeks.
  const pose0=await pose(),initial=await signature(),dateNs=await page.evaluate(()=>String(window.__atlas.date.offsetNs));
  assert.equal(initial.dateNs,dateNs,'forest presents the pinned date');
  const awayDate=(BigInt(dateNs)+1000000n).toString();
  for(const target of [awayDate,dateNs]){
    await page.evaluate(value=>{window.__atlas.setExplorationPaused(true);window.__atlas.seek(value);},target);
    await waitFor(value=>String(window.__atlas.date.offsetNs)===value&&window.__atlas.terrain?.tiles?.forest?.detailedTrees?.dateNs===value,60000,target);
    await drained();await page.waitForTimeout(400);await drained();
    assertSamePose(pose0,await pose(),`after seek to ${target}`);
  }
  const replay=await signature();
  report.dateReplay={dateNs,awayDate,pose:pose0,initial,replay,
    identity:JSON.stringify(identity(initial.census))===JSON.stringify(identity(replay.census)),
    samples:JSON.stringify(initial.samples)===JSON.stringify(replay.samples),
    occupancy:JSON.stringify(occupancy(initial.census))===JSON.stringify(occupancy(replay.census))};
  assert.deepEqual(identity(replay.census),identity(initial.census),'whole population: same ids with exact species/recipe/height/variant/wind/tint');
  assert.deepEqual(replay.samples,initial.samples,'bounded samples replay exactly');
  assert.deepEqual(occupancy(replay.census),occupancy(initial.census),'whole-population selected/eligible/owned/submitted occupancy replays');
  assert.ok(initial.census.families.every(f=>f.lods.every(l=>l.unbound===0)),'every retained slot resolves a dated species');

  // Frame profile at the frozen far-atlas pose.
  await page.evaluate(()=>window.__atlas.resetProfile());await page.waitForTimeout(4000);
  report.profile={flight:await page.evaluate(()=>window.__atlas.renderProfile),frameTimes:await page.evaluate(()=>window.__atlas.stats.frameTimes)};
  report.memory={flight:await memory()};

  // Changed heading at the same position.
  const beforeTurn=await pose();
  await page.mouse.move(700,500);await page.mouse.down();await page.mouse.move(990,500,{steps:10});await page.mouse.up();
  await shot('flight-turned',report);
  const afterTurn=report.phases['flight-turned'].pose;
  report.flightTurn={positionDeltaM:Math.hypot(...afterTurn.relativeM.map((v,i)=>v-beforeTurn.relativeM[i])),headingDelta:Math.hypot(...afterTurn.heading.map((v,i)=>v-beforeTurn.heading[i]))};

  // Lateral flight: new trees enter every band; the atlas must still own the far band.
  await page.evaluate(()=>window.__atlas.setExplorationPaused(false));
  const start=pose0.relativeM,radius=await page.evaluate(()=>window.__atlas.state.body.radiusM);
  const moved=()=>page.evaluate(({start,id,radius})=>{const t=window.__atlas.travel,b=t.bodies.find(v=>v.id===id),q=t.position.map((v,i)=>v-b.positionM[i]);
    const dot=q.reduce((s,v,i)=>s+v*start[i],0)/Math.hypot(...q)/Math.hypot(...start);return Math.acos(Math.max(-1,Math.min(1,dot)))*radius;},{start,id:bodyId,radius});
  await page.keyboard.down('a');
  await waitFor(({start,id,radius})=>{const t=window.__atlas.travel,b=t.bodies.find(v=>v.id===id),q=t.position.map((v,i)=>v-b.positionM[i]);
    const dot=q.reduce((s,v,i)=>s+v*start[i],0)/Math.hypot(...q)/Math.hypot(...start);return Math.acos(Math.max(-1,Math.min(1,dot)))*radius>320;},45000,{start,id:bodyId,radius});
  await page.keyboard.up('a');report.flightLateralM=await moved();
  await page.evaluate(()=>window.__atlas.setExplorationPaused(true));
  await shot('flight-lateral',report);

  // Walking: close LOD0 (<110 m) and a changed heading on foot.
  await page.evaluate(()=>window.__atlas.setExplorationPaused(false));
  await page.locator('#walk-surface').click();
  await waitFor(()=>window.__atlas.travel.walking?.active===true&&!window.__atlas.travel.landing,180000);
  await waitFor(()=>window.__atlas.travel.walking?.grounded===true&&window.__atlas.travel.walking?.waiting===false,60000);
  await page.evaluate(()=>window.__atlas.setExplorationPaused(true));
  await shot('walking-close',report);
  await page.mouse.move(700,500);await page.mouse.down();await page.mouse.move(970,500,{steps:10});await page.mouse.up();
  await shot('walking-turned',report);
  await page.evaluate(()=>window.__atlas.resetProfile());await page.waitForTimeout(4000);
  report.profile.walking=await page.evaluate(()=>window.__atlas.renderProfile);report.memory.walking=await memory();

  report.environment={renderer:await page.evaluate(()=>{const gl=document.querySelector('canvas')?.getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';}),
    viewport:[1440,1000],cloudSceneSamples:0,date:await page.evaluate(()=>window.__atlas.date),sourceCommit,sourceWorkingTreeDirty:sourceDirty,sourceFilesSha256,buildInfo,builtAssetSha256};
  report.glErrors=await page.evaluate(()=>{const gl=document.querySelector('canvas')?.getContext('webgl2');if(!gl)return ['WebGL2 unavailable'];const out=[];for(let e=gl.getError();e!==gl.NO_ERROR;e=gl.getError())out.push(e);return out;});
  report.final=await forestState();report.errors=errors;
  const fallback=Object.entries(report.phases).filter(([,p])=>p.forest.detailedTrees?.farRepresentation!=='captured-hemi-octahedral-atlas').map(([name])=>name);
  report.farFallbackPhases=fallback;
  const atlasBudget=report.memory.walking.farAtlasBytes<=2*30e6&&report.memory.walking.farAtlasScratchBytes===0;
  report.ok=errors.length===0&&report.glErrors.length===0&&fallback.length===0&&report.dateReplay.identity&&report.dateReplay.samples&&report.dateReplay.occupancy&&
    report.flightLateralM>300&&report.final.fullCanopy?.nearPresentNotInCensus===0&&report.final.fullCanopy?.nearAbsentInCensus===0&&
    report.final.fullCanopy?.failures===0&&report.final.fullCanopy?.capacityMisses===0&&atlasBudget;
  await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
  assert.deepEqual(fallback,[],'every captured frame shows the captured far atlas, never the band/disc fallback');
  assert.ok(report.flightLateralM>300,`flight moved laterally ${report.flightLateralM} m`);
  assert.ok(atlasBudget,'far atlases within budget and scratch targets released');
  assert.equal(report.final.fullCanopy?.nearPresentNotInCensus,0,'near presence agrees with census');
  assert.equal(report.final.fullCanopy?.nearAbsentInCensus,0,'near absence agrees with census');
  assert.equal(report.final.fullCanopy?.failures,0,'census worker healthy');
  assert.equal(report.final.fullCanopy?.capacityMisses,0,'canopy allocator retained capacity');
  assert.deepEqual(report.glErrors,[],'WebGL reports no errors');
  assert.deepEqual(errors,[],'no browser errors');
  console.log(JSON.stringify({ok:report.ok,dateReplay:{identity:report.dateReplay.identity,samples:report.dateReplay.samples,occupancy:report.dateReplay.occupancy},
    farFallbackPhases:fallback,memory:report.memory},null,2));
}catch(error){
  report.failure=String(error);report.errors=errors;report.state=await forestState().catch(()=>null);
  await writeFile(`${out}/failure.json`,JSON.stringify(report,null,2));await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error;
}finally{await page.keyboard.up('a').catch(()=>{});await page.keyboard.up('q').catch(()=>{});await browser.close();}
