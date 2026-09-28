import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { browserArgs } from '../../tests/browser-options.mjs';
import { encodeVersions, CURRENT_VERSIONS } from '../../src/time-nav.ts';
import { treeWindPhase } from '../../src/tree-asset.ts';

const base=process.env.ATLAS_URL||'http://127.0.0.1:5197/';
const out=process.env.ATLAS_RESULTS||'test-results/surface-lighting/revised-family-lighting';
const root=process.env.ATLAS_TREE_FAMILY||'C:/LLM/IWSDK/Assets/_assetctl/atlas-ez-family-f';
const paths=[`${root}/atlas-ez-oak.glb`,`${root}/atlas-ez-oak.lod1.glb`,`${root}/family-manifest.json`];
const bodyId='G001/C2128,0,1/0/planet/1',date0=435084631200000032044300000n,dateWind=date0+3_500_000_000n;
const sourcePaths=['src/main.ts','src/surface-lighting.ts','src/terrain-shadow.ts','src/forest-material.ts','src/planet-renderer.ts',
 'src/planet-forest.ts','src/planet-canopy.ts','src/fauna-field-renderer.ts','src/tree-asset.ts','src/tree-foliage-mips.ts',
 'test-results/surface-lighting/revised-family.browser.mjs',...paths];
const hash=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
await mkdir(out,{recursive:true});const startHashes=Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,await hash(p)])));
const q=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:'G001/C2128,0,1/0',body:bodyId,date:date0.toString(),
 wv:encodeVersions(CURRENT_VERSIONS),profile:'1',lighting:'1'});
const browser=await chromium.launch({headless:true,args:browserArgs}),page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(`page: ${e.message}`));page.on('crash',()=>errors.push('page: renderer crashed'));
page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('[vite] failed to connect to websocket.'))errors.push(`console: ${m.text()}`);});
if(typeof page.routeWebSocket==='function')await page.routeWebSocket('**/*',s=>s.close());
const wait=(fn,timeout=180000,arg)=>page.waitForFunction(fn,arg,{timeout});
const snap=()=>page.evaluate(()=>{const a=window.__atlas,t=a?.terrain?.tiles,f=t?.forest,c=f?.fullCanopy,d=f?.detailedTrees;
 return{bodyId:a?.state?.body?.id,date:a?.date?.offsetNs,position:a?.travel?.position,heading:a?.travel?.heading,
  travel:{clearanceM:a?.travel?.surface?.terrainClearance,systemUnit:a?.travel?.systemUnit},lighting:a?.surfaceLighting,
  terrain:t?{pending:t.pending,staleWaterPatches:t.staleWaterPatches,lifePackBuilds:t.lifePackBuilds,lifePending:t.lifePending,
   faunaTerrainPending:t.faunaTerrainPending,faunaVisible:t.faunaVisibleCount,floraPresent:t.floraPresentCount,failures:t.failures}:null,
  forest:f?{visible:f.visible,cached:f.cached,pending:f.pending,selectionPending:f.selectionPending,workerFailures:f.workerFailures,
   fullCanopy:c,detailedTrees:d}:null,render:a?.stats?{draws:a.stats.draws,triangles:a.stats.triangles,textures:a.stats.textures}:null,
  profile:a?.renderProfile};});
const capture=async name=>{const url=await page.evaluate(async()=>{await new Promise(requestAnimationFrame);return document.querySelector('canvas')?.toDataURL('image/png')||null;});
 assert.ok(url?.startsWith('data:image/png;base64,'));await writeFile(`${out}/${name}.png`,Buffer.from(url.slice(url.indexOf(',')+1),'base64'));return url;};
const compare=async(a,b)=>page.evaluate(async([x,y])=>{const decode=async(s)=>{const i=new Image();i.src=s;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d');g.drawImage(i,0,0);return{w:i.width,h:i.height,d:g.getImageData(0,0,i.width,i.height).data};};const A=await decode(x),B=await decode(y);let n=0,sum=0,max=0;for(let k=0;k<A.d.length;k+=4){const v=Math.max(Math.abs(A.d[k]-B.d[k]),Math.abs(A.d[k+1]-B.d[k+1]),Math.abs(A.d[k+2]-B.d[k+2]));sum+=v;max=Math.max(max,v);if(v>3)n++;}return{width:A.w,height:A.h,changedPixelsOver3:n,changedFraction:n/(A.w*A.h),meanMaxChannelDelta:sum/(A.w*A.h),maxChannelDelta:max};},[a,b]);
const profile=async(name,warmMs=2000,sampleMs=8000)=>{await page.evaluate(()=>{window.__atlas.setProfiling(true);window.__atlas.resetProfile();});await page.waitForTimeout(warmMs);await page.evaluate(()=>window.__atlas.resetProfile());await page.waitForTimeout(sampleMs);const s=await snap();return{name,warmMs,sampleMs,diagnostics:s.profile,render:s.render,lifePackBuilds:s.terrain.lifePackBuilds,faunaTerrainPending:s.terrain.faunaTerrainPending,lifePending:s.terrain.lifePending,forestVisible:s.forest.visible,detailedVisible:s.forest.detailedTrees.visible};};
const quiet=async()=>wait(()=>{const a=window.__atlas,t=a?.terrain?.tiles,f=t?.forest,c=f?.fullCanopy;return t&&f&&c?.ready&&t.pending===0&&t.staleWaterPatches===0&&f.pending===0&&
  f.selectionPending===false&&c.selectionPending===false&&!c.selectionApplyPending&&!c.reusePending&&c.queuedPatches===0&&c.jobsInFlight===0&&t.lifePending===0&&t.faunaTerrainPending===0;},240000);
const lifeSamples=async(label)=>{const samples=[];for(let i=0;i<6;i++){samples.push(await page.evaluate(()=>{const t=window.__atlas.terrain.tiles,c=t.forest.fullCanopy,f=t.forest;return{lifePackBuilds:t.lifePackBuilds,lifePending:t.lifePending,faunaTerrainPending:t.faunaTerrainPending,
  patchLookupCache:c.patchLookupCache,visible:f.visible,cached:f.cached,pending:f.pending};}));await page.waitForTimeout(500);}return{label,samples,stable:samples.every(s=>s.lifePackBuilds===samples[0].lifePackBuilds),
 cacheStable:samples.every(s=>JSON.stringify(s.patchLookupCache)===JSON.stringify(samples[0].patchLookupCache))};};
const load=async(mips)=>{await page.evaluate(()=>{document.getElementById('forest-family-fixture')?.remove();const x=document.createElement('input');x.type='file';x.multiple=true;x.id='forest-family-fixture';document.body.append(x);});
 await page.locator('#forest-family-fixture').setInputFiles(paths.slice(0,2));const start=Date.now();const installed=await page.evaluate(async(m)=>{const x=document.querySelector('#forest-family-fixture'),f=[...x.files];try{return await window.__atlas.loadForestTreeAssets(await f[0].arrayBuffer(),await f[1].arrayBuffer(),{
  foliageCoverage:'mask',foliageMipmaps:m,leafTransmission:{factor:.35,tint:[.75,1,.8]}});}finally{x.remove();}},mips);assert.equal(installed,true);
 await wait(()=>{const d=window.__atlas.terrain?.tiles?.forest?.detailedTrees;return d?.ready&&!d.loading&&d.visible.some(n=>n>0)&&d.samples.length>0;},120000);await quiet();await page.waitForTimeout(1000);return{coldLoadMs:Date.now()-start,state:await snap()};};
let report={ok:false,base,out,renderer:null,bodyId,assetRoot:root,assetPaths:paths,viewport:[1440,1000],date0:date0.toString(),dateWind:dateWind.toString(),sourceHashes:startHashes,errors,phases:[]};
try{
 console.log('navigate');await page.goto(`${base}?${q}`,{waitUntil:'domcontentloaded'});await wait(id=>window.__atlas?.ready&&window.__atlas.state.level==='body'&&window.__atlas.state.body?.id===id&&!window.__atlas.camera.animating,180000,bodyId);
 console.log('find-life');await page.locator('#find-life').click();await wait(()=>window.__atlas.travel.terrainCruise!==null,180000);
 console.log('descend');await page.keyboard.down('q');await wait(()=>window.__atlas.travel.surface?.terrainClearance<12,180000);await page.keyboard.up('q');
 await page.evaluate(()=>window.__atlas.setExplorationPaused(true));await quiet();
 const baseWarm=await lifeSamples('legacy after all life/fauna queues drained');const baseState=await snap();
 assert.equal(baseState.lighting.enabled,true);assert.equal(baseState.lighting.active,true);assert.ok(baseState.travel.clearanceM<20);
 const baseImg=await capture('legacy-detailed-lit-close');await page.screenshot({path:`${out}/legacy-detailed-lit-close-ui.png`});
 const baseProfile=await profile('legacy-detailed-lit',2000,8000);report.phases.push({name:'legacy-detailed-lit-close',state:baseState,stableLife:baseWarm,profile:baseProfile});
 assert.equal(baseWarm.stable,true,'life pack builds stabilize after fauna ground queue drains');

 console.log('load-default-mips');const def=await load(false);const defImg=await capture('family-default-mips-detailed-lit-close');await page.screenshot({path:`${out}/family-default-mips-detailed-lit-close-ui.png`});
 const defProfile=await profile('family-default-mips-detailed-lit',2000,8000);report.phases.push({name:'family-default-mips-detailed-lit-close',...def,image:'family-default-mips-detailed-lit-close.png',profile:defProfile});
 assert.equal(def.state.lighting.enabled,true);assert.equal(def.state.lighting.active,true);assert.equal(def.state.forest.detailedTrees.foliageMipmaps,null);

 console.log('load-coverage-mips');const mip=await load(true);const mipImg=await capture('family-coverage-mips-detailed-lit-close');await page.screenshot({path:`${out}/family-coverage-mips-detailed-lit-close-ui.png`});
 const mipProfile=await profile('family-coverage-mips-detailed-lit',2000,8000);report.phases.push({name:'family-coverage-mips-detailed-lit-close',...mip,image:'family-coverage-mips-detailed-lit-close.png',profile:mipProfile});
 assert.equal(mip.state.lighting.enabled,true);assert.equal(mip.state.lighting.active,true);assert.ok(mip.state.forest.detailedTrees.foliageMipmaps?.levels?.length>0);
 report.mipComparison={positionDeltaM:Math.hypot(...def.state.position.map((v,i)=>v-mip.state.position[i])),
  headingDelta:Math.hypot(...def.state.heading.map((v,i)=>v-mip.state.heading[i])),dateEqual:def.state.date===mip.state.date,
  image:await compare(defImg,mipImg),defaultMipDiagnostics:def.state.forest.detailedTrees.foliageMipmaps,
  coverageMipDiagnostics:mip.state.forest.detailedTrees.foliageMipmaps};
 report.mipLoad={defaultColdLoadMs:def.coldLoadMs,coverageColdLoadMs:mip.coldLoadMs,setupMs:mip.state.forest.detailedTrees.foliageMipmaps.setupMs,
  levels:mip.state.forest.detailedTrees.foliageMipmaps.levels.length};

 const phases=mip.state.forest.detailedTrees.samples,phaseById=Object.fromEntries(phases.map(x=>[x.id,x.windPhase01]));
 await page.evaluate(date=>{window.__atlas.setExplorationPaused(true);window.__atlas.seek(date);},dateWind.toString());await quiet();
 const shifted=await snap(),windImg=await capture('family-coverage-mips-wind-shift');
 const shiftedById=Object.fromEntries(shifted.forest.detailedTrees.samples.map(x=>[x.id,x.windPhase01]));
 const common=Object.keys(phaseById).filter(id=>id in shiftedById);
 report.wind={periodNs:'7000000000',expectedPhaseBefore:treeWindPhase(date0),expectedPhaseAfter:treeWindPhase(dateWind),expectedPhaseDelta:treeWindPhase(dateWind)-treeWindPhase(date0),
  datePhaseMatches:mip.state.forest.detailedTrees.dateNs===date0.toString()&&shifted.forest.detailedTrees.dateNs===dateWind.toString(),
  sampleIds:common.length,windPhase01IsPerInstanceOffset:common.every(id=>phaseById[id]===shiftedById[id]),
  perInstancePhaseSamples:common.slice(0,5).map(id=>({id,before:phaseById[id],after:shiftedById[id]})),
  wholeFrameDelta:await compare(mipImg,windImg),glError:await page.evaluate(()=>document.querySelector('canvas')?.getContext('webgl2')?.getError()??null)};
 await page.evaluate(date=>{window.__atlas.setExplorationPaused(true);window.__atlas.seek(date);},date0.toString());await quiet();
 await page.evaluate(()=>window.__atlas.setExplorationPaused(false));await page.keyboard.down('e');await wait(()=>window.__atlas.travel.surface?.terrainClearance>380,60000);await page.keyboard.up('e');
 await page.evaluate(()=>window.__atlas.setExplorationPaused(true));await quiet();await page.waitForTimeout(700);
 const mid=await snap();const midImg=await capture('family-coverage-mips-detailed-lit-mid');await page.screenshot({path:`${out}/family-coverage-mips-detailed-lit-mid-ui.png`});
 report.mid={clearanceM:mid.travel.clearanceM,lighting:mid.lighting,forestVisible:mid.forest.visible,detailedVisible:mid.forest.detailedTrees.visible,
  terrainPending:mid.terrain.pending,lifePending:mid.terrain.lifePending,faunaTerrainPending:mid.terrain.faunaTerrainPending,imageDeltaFromClose:await compare(mipImg,midImg)};
 report.renderer=await page.evaluate(()=>{const gl=document.querySelector('canvas')?.getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info');return gl&&ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null;});
 report.glError=await page.evaluate(()=>document.querySelector('canvas')?.getContext('webgl2')?.getError()??null);report.errors=errors;
 const endHashes=Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,await hash(p)])));
 report.sourceIntegrity={unchanged:Object.keys(startHashes).every(p=>startHashes[p]===endHashes[p]),start:startHashes,end:endHashes};
 report.ok=errors.length===0&&report.glError===0;
 await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));assert.equal(report.glError,0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({ok:report.ok,renderer:report.renderer,baseWarm,lighting:report.phases.map(p=>({name:p.name,active:p.state.lighting.active,clearance:p.state.travel.clearanceM,faunaPending:p.state.terrain.faunaTerrainPending,lifePackBuilds:p.state.terrain.lifePackBuilds})),
  mipLoad:report.mipLoad,mipComparison:report.mipComparison&&{pose:report.mipComparison.positionDeltaM,dateEqual:report.mipComparison.dateEqual,image:report.mipComparison.image},
  wind:report.wind,mid:report.mid,glError:report.glError,errors,sourceUnchanged:report.sourceIntegrity.unchanged},null,2));
}catch(e){report.ok=false;report.failure=String(e);report.errors=errors;report.current=await snap().catch(()=>null);
 const endHashes=Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,await hash(p).catch(()=>null)])));
 report.sourceIntegrity={unchanged:Object.keys(startHashes).every(p=>startHashes[p]===endHashes[p]),start:startHashes,end:endHashes};
 await writeFile(`${out}/failure.json`,JSON.stringify(report,null,2));await page.screenshot({path:`${out}/failure-page.png`}).catch(()=>{});throw e;
}finally{await page.keyboard.up('q').catch(()=>{});await page.keyboard.up('e').catch(()=>{});await browser.close();}
