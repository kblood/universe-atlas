import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {browserArgs} from '../../tests/browser-options.mjs';
import {encodeVersions,CURRENT_VERSIONS} from '../../src/time-nav.ts';

const base=process.env.ATLAS_URL||'http://127.0.0.1:5197/';
const out=process.env.ATLAS_RESULTS||'test-results/compact-tree-families/browser-run';
const oak=process.env.ATLAS_OAK||'C:/LLM/IWSDK/Assets/_assetctl/atlas-ez-family-f';
const pine=process.env.ATLAS_PINE||'C:/LLM/IWSDK/Assets/_assetctl/atlas-ez-conifer-family-13977-16m-v1e';
const bodyId='G001/C2128,0,1/0/planet/1', systemId='G001/C2128,0,1/0';
const assetPaths=[`${oak}/atlas-ez-oak.glb`,`${oak}/atlas-ez-oak.lod1.glb`,`${pine}/atlas-ez-conifer.glb`,`${pine}/atlas-ez-conifer.lod1.glb`];
const sourcePaths=['src/main.ts','src/planet-renderer.ts','src/planet-forest.ts','src/forest-tree-family-library.ts','src/compact-instance-slots.ts','src/tree-asset.ts','src/forest-tree-catalogue.ts','src/surface-lighting.ts','src/terrain-shadow.ts','src/forest-material.ts','src/planet-canopy.ts','src/fauna-field-renderer.ts','test-results/compact-tree-families/integration.browser.mjs',...assetPaths];
const sha=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
await mkdir(out,{recursive:true});
const startHashes=Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,await sha(p)])));
const query=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:systemId,body:bodyId,date:'435084631200000032044300000',wv:encodeVersions(CURRENT_VERSIONS),profile:'1',lighting:'1'});
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(`page:${e.message}`));page.on('crash',()=>errors.push('page:renderer crashed'));
page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('[vite] failed to connect to websocket.'))errors.push(`console:${m.text()}`);});
if(typeof page.routeWebSocket==='function')await page.routeWebSocket('**/*',ws=>ws.close());
const wait=(fn,timeout=180000,arg)=>page.waitForFunction(fn,arg,{timeout});
const state=()=>page.evaluate(()=>{const a=window.__atlas,t=a?.terrain?.tiles,f=t?.forest,d=f?.detailedTrees,b=a?.travel?.bodies?.find(x=>x.id===a?.state?.body?.id);
 const position=b?a.travel.position.map((v,i)=>v-b.positionM[i]):null;
 return{date:a?.date?.offsetNs,bodyId:a?.state?.body?.id,positionM:position,heading:a?.travel?.heading,
  travel:{clearanceM:a?.travel?.surface?.terrainClearance,systemUnit:a?.travel?.systemUnit},lighting:a?.surfaceLighting,
  terrain:t?{pending:t.pending,staleWaterPatches:t.staleWaterPatches,lifePackBuilds:t.lifePackBuilds,lifePending:t.lifePending,faunaTerrainPending:t.faunaTerrainPending,failures:t.failures}:null,
  forest:f?{visible:f.visible,near:f.near,cached:f.cached,pending:f.pending,originVersion:f.originVersion,originRebased:f.originRebased,workerFailures:f.workerFailures,
   selectionPending:f.selectionPending,fullCanopy:f.fullCanopy,detailedTrees:d}:null,
  render:a?.stats?{draws:a.stats.draws,triangles:a.stats.triangles,textures:a.stats.textures}:null,profile:a?.renderProfile};});
const capture=async name=>{const url=await page.evaluate(async()=>{await new Promise(requestAnimationFrame);return document.querySelector('canvas')?.toDataURL('image/png')||null;});
 assert.ok(url?.startsWith('data:image/png;base64,'));await writeFile(`${out}/${name}.png`,Buffer.from(url.slice(url.indexOf(',')+1),'base64'));};
const quiet=async()=>wait(()=>{const a=window.__atlas,t=a?.terrain?.tiles,f=t?.forest,c=f?.fullCanopy,d=f?.detailedTrees;
 return t&&f&&c?.ready&&t.pending===0&&t.staleWaterPatches===0&&f.pending===0&&!f.selectionPending&&!c.selectionPending&&!c.selectionApplyPending&&!c.reusePending&&c.queuedPatches===0&&c.jobsInFlight===0&&t.lifePending===0&&t.faunaTerrainPending===0&&(!d?.loading);},240000);
const install=async(kindIndices,label)=>{
 await page.evaluate(()=>{document.querySelector('#family-fixture')?.remove();const e=document.createElement('input');e.type='file';e.multiple=true;e.id='family-fixture';document.body.append(e);});
 await page.locator('#family-fixture').setInputFiles(kindIndices.map(i=>assetPaths[i]));
 const loadStarted=Date.now();
 const result=await page.evaluate(async(label)=>{const e=document.querySelector('#family-fixture'),f=[...e.files];
 const groups=[];if(label==='oak')groups.push({kind:'branching',lod0:await f[0].arrayBuffer(),lod1:await f[1].arrayBuffer()});
 else groups.push({kind:'branching',lod0:await f[0].arrayBuffer(),lod1:await f[1].arrayBuffer()},{kind:'spire',lod0:await f[2].arrayBuffer(),lod1:await f[3].arrayBuffer()});
 try{return await window.__atlas.loadForestTreeFamilies(groups,{foliageCoverage:'mask',leafTransmission:{factor:.35,tint:[.75,1,.8]}});}finally{e.remove();}},label);
 assert.equal(result,true,`${label} family set installed`);
 await wait(expected=>{const d=window.__atlas.terrain?.tiles?.forest?.detailedTrees;return d?.ready&&!d.loading&&d.families?.length===expected&&d.families.some(x=>x.submitted.some(n=>n>0));},120000,label==='oak'?1:2);
 await quiet();await page.waitForTimeout(700);
 const s=await state();return{elapsedMs:Date.now()-loadStarted,state:s};
};
const profile=async(name,warmMs=2000,sampleMs=8000)=>{await page.evaluate(()=>{window.__atlas.setProfiling(true);window.__atlas.resetProfile();});await page.waitForTimeout(warmMs);await page.evaluate(()=>window.__atlas.resetProfile());await page.waitForTimeout(sampleMs);const s=await state();return{name,warmMs,sampleMs,statistics:s.profile?.statistics,diagnostics:s.profile,render:s.render,lifePackBuilds:s.terrain.lifePackBuilds,lifePending:s.terrain.lifePending,faunaTerrainPending:s.terrain.faunaTerrainPending,detailedVisible:s.forest.detailedTrees.visible,families:s.forest.detailedTrees.families};};
const cpuProfile=async()=>{const cdp=await page.context().newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.start');await page.waitForTimeout(5000);const {profile}=await cdp.send('Profiler.stop');await cdp.detach();await writeFile(`${out}/compact-oak.cpuprofile`,JSON.stringify(profile));
 const nodes=profile.nodes.map(n=>({fn:n.callFrame.functionName||'(anonymous)',url:n.callFrame.url,line:n.callFrame.lineNumber+1,selfSamples:n.hitCount||0})).sort((a,b)=>b.selfSamples-a.selfSamples).slice(0,25);return{duration:profile.endTime-profile.startTime,nodes};};
let report={ok:false,base,out,bodyId,renderer:null,assetPaths,sourceHashes:startHashes,phases:[],errors};
try{
 console.log('navigate');await page.goto(`${base}?${query}`,{waitUntil:'domcontentloaded'});
 await wait(id=>window.__atlas?.ready&&window.__atlas.state.level==='body'&&window.__atlas.state.body?.id===id&&!window.__atlas.camera.animating,180000,bodyId);
 console.log('find-life');await page.locator('#find-life').click();await wait(()=>window.__atlas.travel.terrainCruise!==null,180000);
 console.log('descend');await page.keyboard.down('q');await wait(()=>window.__atlas.travel.surface?.terrainClearance<12,180000);await page.keyboard.up('q');
 await page.evaluate(()=>window.__atlas.setExplorationPaused(true));await quiet();
 const baseState=await state();assert.equal(baseState.lighting?.active,true);assert.ok(baseState.travel.clearanceM<20);
 report.baseDateAfterFindLife=baseState.date;report.phases.push({label:'legacy-close-baseline',state:baseState});await capture('legacy-close-baseline');
 console.log('load-oak-only');const oakResult=await install([0,1],'oak');report.phases.push({label:'oak-only',...oakResult});await capture('oak-only-close');
 const oakState=oakResult.state,d=oakState.forest.detailedTrees;
 const submittedByLod=[0,1].map(lod=>d.families.reduce((sum,f)=>sum+f.submitted[lod],0));
 report.oakOnly={eligibleVisible:d.visible,submittedByLod,countsMatch:JSON.stringify(submittedByLod)===JSON.stringify(d.visible),families:d.families,
 triangleDeltaFromLegacy:oakState.render.triangles-baseState.render.triangles,drawDeltaFromLegacy:oakState.render.draws-baseState.render.draws};
 assert.deepEqual(submittedByLod,d.visible,'Oak submitted slots equal eligible detailed visibility per LOD');
 console.log('oak-profile');report.oakProfile=await profile('oak-only-detailed-lit',2000,8000);
 console.log('oak-cdp-profile');report.cpuProfile=await cpuProfile();
 const baseDate=BigInt(baseState.date),shiftDate=baseDate+3_500_000_000n;
 const sampleMap=s=>Object.fromEntries(s.forest.detailedTrees.samples.map(x=>[x.id,{speciesId:x.speciesId,recipe:x.recipe,heightM:x.heightM,windPhase01:x.windPhase01}]));
 const beforeSamples=sampleMap(await state());
 console.log('date-shift');await page.evaluate(v=>{window.__atlas.setExplorationPaused(true);window.__atlas.seek(v);},shiftDate.toString());await quiet();const shifted=await state();report.phases.push({label:'date-plus-3.5s',state:shifted});await capture('oak-date-shift');
 console.log('date-return');await page.evaluate(v=>{window.__atlas.setExplorationPaused(true);window.__atlas.seek(v);},baseDate.toString());await quiet();await page.waitForTimeout(500);const returned=await state();report.phases.push({label:'date-return',state:returned});await capture('oak-date-return');
 const before=beforeSamples,after=sampleMap(returned);const common=Object.keys(before).filter(id=>id in after);const mismatches=common.filter(id=>JSON.stringify(before[id])!==JSON.stringify(after[id]));
 report.dateReplay={observedBaseDate:baseDate.toString(),shiftedDate:shiftDate.toString(),matchingIds:common.length,mismatches:mismatches.slice(0,8),phaseSamples:common.slice(0,6).map(id=>({id,before:before[id],after:after[id]}))};
 assert.ok(common.length>0);assert.deepEqual(mismatches,[],'date return restores sample identity/recipe/height/wind-offset');
 const movedFrom=returned.positionM,originFrom=returned.forest.originVersion;
 console.log('movement');await page.evaluate(()=>window.__atlas.setExplorationPaused(false));await page.keyboard.down('Shift');await page.keyboard.down('w');await page.waitForTimeout(1800);await page.keyboard.up('w');await page.keyboard.up('Shift');await page.evaluate(()=>window.__atlas.setExplorationPaused(true));await quiet();
 const moved=await state();report.phases.push({label:'oak-after-movement',state:moved});await capture('oak-after-movement');report.movement={distanceM:movedFrom&&moved.positionM?Math.hypot(...moved.positionM.map((x,i)=>x-movedFrom[i])):null,originVersionBefore:originFrom,originVersionAfter:moved.forest.originVersion,originRebased:moved.forest.originRebased};
 console.log('load-oak-pine');const both=await install([0,1,2,3],'both');report.phases.push({label:'oak-plus-pine',...both});await capture('oak-plus-pine-close');
 const b=both.state.forest.detailedTrees,combined=[0,1].map(lod=>b.families.reduce((n,f)=>n+f.submitted[lod],0));report.oakPlusPine={eligibleVisible:b.visible,submittedByLod:combined,countsMatch:JSON.stringify(combined)===JSON.stringify(b.visible),families:b.families,render:both.state.render};
 assert.deepEqual(combined,b.visible,'combined family submitted slots equal total eligible detailed visibility per LOD');
 report.renderer=await page.evaluate(()=>{const gl=document.querySelector('canvas')?.getContext('webgl2'),e=gl?.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'unavailable';});
 report.glError=await page.evaluate(()=>document.querySelector('canvas')?.getContext('webgl2')?.getError()??null);
 const endHashes=Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,await sha(p)])));report.sourceIntegrity={unchanged:Object.keys(startHashes).every(p=>startHashes[p]===endHashes[p]),start:startHashes,end:endHashes};
 report.errors=errors;report.ok=errors.length===0&&report.glError===0&&report.sourceIntegrity.unchanged;
 await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));assert.equal(report.glError,0);assert.deepEqual(errors,[]);assert.equal(report.sourceIntegrity.unchanged,true);
 console.log(JSON.stringify({ok:report.ok,renderer:report.renderer,baseDate:report.baseDateAfterFindLife,oak:report.oakOnly,oakProfile:{statistics:report.oakProfile.statistics,families:report.oakProfile.families},cpuTop:report.cpuProfile.nodes.slice(0,12),dateReplay:report.dateReplay,movement:report.movement,oakPlusPine:report.oakPlusPine,errors},null,2));
}catch(e){report.ok=false;report.failure=String(e);report.current=await state().catch(()=>null);report.errors=errors;const endHashes=Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,await sha(p).catch(()=>null)])));report.sourceIntegrity={unchanged:Object.keys(startHashes).every(p=>startHashes[p]===endHashes[p]),start:startHashes,end:endHashes};await writeFile(`${out}/failure.json`,JSON.stringify(report,null,2));await page.screenshot({path:`${out}/failure-page.png`}).catch(()=>{});throw e;
}finally{await page.keyboard.up('q').catch(()=>{});await page.keyboard.up('w').catch(()=>{});await page.keyboard.up('Shift').catch(()=>{});await browser.close();}

