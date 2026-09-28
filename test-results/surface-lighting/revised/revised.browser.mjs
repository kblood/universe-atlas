import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { browserArgs } from '../../tests/browser-options.mjs';
import { encodeVersions, CURRENT_VERSIONS } from '../../src/time-nav.ts';

const base=process.env.ATLAS_URL||'http://127.0.0.1:5197/';
const out=process.env.ATLAS_RESULTS||'test-results/surface-lighting/revised';
const assetRoot=process.env.ATLAS_TREE_FAMILY||'C:/LLM/IWSDK/Assets/_assetctl/atlas-ez-family-f';
const bodyId='G001/C2128,0,1/0/planet/1',baseDate=435084631200000032044300000n;
const assetPaths=[`${assetRoot}/atlas-ez-oak.glb`,`${assetRoot}/atlas-ez-oak.lod1.glb`];
const sourceFiles=['src/main.ts','src/surface-lighting.ts','src/terrain-shadow.ts','src/forest-material.ts',
 'src/planet-renderer.ts','src/planet-forest.ts','src/planet-canopy.ts','src/fauna-field-renderer.ts',
 'src/tree-asset.ts','src/tree-foliage-mips.ts','test-results/surface-lighting/revised.browser.mjs',...assetPaths,
 `${assetRoot}/family-manifest.json`];
const sha=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
await mkdir(out,{recursive:true});
const startHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async p=>[p,await sha(p)])));
const query=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:'G001/C2128,0,1/0',body:bodyId,
 date:baseDate.toString(),wv:encodeVersions(CURRENT_VERSIONS),profile:'1'});
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',e=>errors.push(`page: ${e.message}`));page.on('crash',()=>errors.push('page: renderer crashed'));
page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('[vite] failed to connect to websocket.'))errors.push(`console: ${m.text()}`);});
if(typeof page.routeWebSocket==='function')await page.routeWebSocket('**/*',s=>s.close());
const wait=(fn,timeout=180000,arg)=>page.waitForFunction(fn,arg,{timeout});
const snap=()=>page.evaluate(()=>{
 const a=window.__atlas,t=a?.terrain?.tiles,f=t?.forest,c=f?.fullCanopy,d=f?.detailedTrees;
 return {ready:a?.ready,bodyId:a?.state?.body?.id,date:a?.date?.offsetNs,level:a?.state?.level,
  position:a?.travel?.position,heading:a?.travel?.heading,travel:{active:a?.travel?.active,domain:a?.travel?.domain,
   terrainCruise:a?.travel?.terrainCruise,clearanceM:a?.travel?.surface?.terrainClearance,systemUnit:a?.travel?.systemUnit},
  lighting:a?.surfaceLighting,forest:f?{visible:f.visible,near:f.near,cached:f.cached,pending:f.pending,
   selectionPending:f.selectionPending,workerFailures:f.workerFailures,fullCanopy:c,detailedTrees:d}:null,
  terrain:t?{pending:t.pending,staleWaterPatches:t.staleWaterPatches,failures:t.failures,lifePackBuilds:t.lifePackBuilds,
   lifePending:t.lifePending,lifeResidentCells:t.lifeResidentCells,floraPresent:t.floraPresentCount,faunaVisible:t.faunaVisibleCount,
   faunaTerrainPending:t.faunaTerrainPending,waterBucket:t.waterBucket}:null,
  render:a?.stats?{draws:a.stats.draws,triangles:a.stats.triangles,geometries:a.stats.geometries,textures:a.stats.textures}:null,
  profile:a?.renderProfile};
});
const capture=async name=>{
 const data=await page.evaluate(async()=>{await new Promise(requestAnimationFrame);return document.querySelector('canvas')?.toDataURL('image/png')||null;});
 assert.ok(data?.startsWith('data:image/png;base64,'),'canvas PNG is available');
 await writeFile(`${out}/${name}.png`,Buffer.from(data.slice(data.indexOf(',')+1),'base64'));return data;
};
const difference=async(a,b)=>page.evaluate(async([one,two])=>{
 const decode=async(src)=>{const i=new Image();i.src=src;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);return{x:i.width,y:i.height,d:x.getImageData(0,0,i.width,i.height).data};};
 const A=await decode(one),B=await decode(two);let changed=0,sum=0,max=0;for(let k=0;k<A.d.length;k+=4){const z=Math.max(Math.abs(A.d[k]-B.d[k]),Math.abs(A.d[k+1]-B.d[k+1]),Math.abs(A.d[k+2]-B.d[k+2]));sum+=z;max=Math.max(max,z);if(z>3)changed++;}
 return{width:A.x,height:A.y,pixels:A.x*A.y,changedPixelsOver3:changed,changedFraction:changed/(A.x*A.y),meanMaxChannelDelta:sum/(A.x*A.y),maxChannelDelta:max};
},[a,b]);
const profile=async(name,warmMs=1500,sampleMs=8000)=>{
 await page.evaluate(()=>{window.__atlas.setProfiling(true);window.__atlas.resetProfile();});await page.waitForTimeout(warmMs);
 await page.evaluate(()=>window.__atlas.resetProfile());await page.waitForTimeout(sampleMs);
 const result=await page.evaluate(()=>window.__atlas.renderProfile);const state=await snap();
 return{name,warmMs,sampleMs,diagnostics:result,render:state.render,lifePackBuilds:state.terrain?.lifePackBuilds,canopyCache:state.forest?.fullCanopy?.patchLookupCache,
  legacyVisible:state.forest?.visible,detailedVisible:state.forest?.detailedTrees?.visible};
};
const awaitSettled=async()=>{
 await wait(()=>{const a=window.__atlas,t=a?.terrain?.tiles,f=t?.forest,c=f?.fullCanopy;return a?.ready&&t&&f&&c?.ready&&
  t.pending===0&&t.staleWaterPatches===0&&f.pending===0&&!f.selectionPending&&!c.selectionPending&&
  !c.selectionApplyPending&&!c.reusePending&&c.queuedPatches===0&&c.jobsInFlight===0;},240000);
 await page.waitForTimeout(1000);
};
const stableLife=async(label)=>{
 const samples=[];for(let i=0;i<5;i++){samples.push(await page.evaluate(()=>{const t=window.__atlas.terrain.tiles,c=t.forest.fullCanopy;return{lifePackBuilds:t.lifePackBuilds,patchLookupCache:c.patchLookupCache,
  visible:t.forest.visible,cached:t.forest.cached,pending:t.forest.pending,terrainPending:t.pending,lifePending:t.lifePending};}));await page.waitForTimeout(750);}
 return{label,samples,lifePackBuildsStable:samples.every(x=>x.lifePackBuilds===samples[0].lifePackBuilds),
  sameVisibleAcrossWindow:samples.every(x=>x.visible===samples[0].visible),cacheHits:samples.map(x=>x.patchLookupCache?.hits??0),
  cacheMisses:samples.map(x=>x.patchLookupCache?.misses??0),cacheKeys:samples.map(x=>x.patchLookupCache?.keys??0)};
};
const loadFamily=async(mips)=>{
 await page.evaluate(()=>{const x=document.getElementById('forest-family-fixture');if(x)x.remove();const n=document.createElement('input');n.type='file';n.multiple=true;n.id='forest-family-fixture';document.body.append(n);});
 await page.locator('#forest-family-fixture').setInputFiles(assetPaths);
 const started=Date.now();const ok=await page.evaluate(async({mips})=>{const x=document.querySelector('#forest-family-fixture'),f=[...x.files];try{return await window.__atlas.loadForestTreeAssets(await f[0].arrayBuffer(),await f[1].arrayBuffer(),{
 foliageCoverage:'mask',foliageMipmaps:mips,leafTransmission:{factor:.35,tint:[.75,1,.8]}});}finally{x.remove();}}, {mips});
 assert.equal(ok,true,`family F loads with foliageMipmaps=${mips}`);
 await wait(()=>{const d=window.__atlas.terrain?.tiles?.forest?.detailedTrees;return d?.ready&&!d.loading&&d.visible.some(n=>n>0)&&d.samples.length>0;},120000);
 await page.waitForTimeout(1800);
 return{loadElapsedMs:Date.now()-started,state:await snap()};
};
let report={ok:false,base,out,bodyId,assetRoot,viewport:[1440,1000],baseDateNs:baseDate.toString(),sourceHashes:startHashes,errors,phases:[]};
try{
 console.log('navigate');await page.goto(`${base}?${query}`,{waitUntil:'domcontentloaded'});
 await wait(id=>window.__atlas?.ready&&window.__atlas.state.level==='body'&&window.__atlas.state.body?.id===id&&!window.__atlas.camera.animating,180000,bodyId);
 console.log('find-life');await page.locator('#find-life').click();await wait(()=>window.__atlas.travel.terrainCruise!==null,180000);
 console.log('descend-close');await page.keyboard.down('q');await wait(()=>window.__atlas.travel.surface?.terrainClearance<12,180000);await page.keyboard.up('q');
 await wait(()=>window.__atlas.terrain?.tiles?.forest?.visible>100,180000);await page.evaluate(()=>window.__atlas.setExplorationPaused(true));await awaitSettled();
 assert.ok(await page.locator('#surface-lighting').isVisible());
 const legacyOn=await snap();const legacyOnImg=await capture('legacy-detailed-close');await page.screenshot({path:`${out}/legacy-detailed-close-ui.png`});
 const stableOn=await stableLife('legacy-detailed-close');const legacyOnProfile=await profile('legacy-detailed');
 report.phases.push({name:'legacy-detailed-close',state:legacyOn,stableLife:stableOn,profile:legacyOnProfile});
 await page.locator('#surface-lighting').click();await wait(()=>window.__atlas.surfaceLighting.enabled===false,10000);await awaitSettled();
 const legacyOff=await snap();const legacyOffImg=await capture('legacy-basic-close');await page.screenshot({path:`${out}/legacy-basic-close-ui.png`});
 const stableOff=await stableLife('legacy-basic-close');const legacyOffProfile=await profile('legacy-basic');
 report.phases.push({name:'legacy-basic-close',state:legacyOff,stableLife:stableOff,profile:legacyOffProfile});
 report.legacyImageDelta=await difference(legacyOnImg,legacyOffImg);
 report.legacyPose={positionDeltaM:Math.hypot(...legacyOn.position.map((v,i)=>v-legacyOff.position[i])),headingDelta:Math.hypot(...legacyOn.heading.map((v,i)=>v-legacyOff.heading[i]))};
 assert.equal(report.legacyPose.positionDeltaM,0);report.lifePackStability={detailed:stableOn.lifePackBuildsStable,basic:stableOff.lifePackBuildsStable};

 console.log('load-family-default-mips');const defaultLoad=await loadFamily(false);const defaultImg=await capture('family-default-mips-close');await page.screenshot({path:`${out}/family-default-mips-close-ui.png`});
 const defaultStable=await stableLife('family-default-mips-close');const defaultProfile=await profile('family-default-mips',1500,6000);
 report.phases.push({name:'family-default-mips-close',...defaultLoad,image:'family-default-mips-close.png',stableLife:defaultStable,profile:defaultProfile});
 assert.equal(defaultLoad.state.forest.detailedTrees.foliageMipmaps,null,'default path uses renderer-generated mips');

 console.log('replace-family-coverage-mips');const mipLoad=await loadFamily(true);const mipImg=await capture('family-coverage-mips-close');await page.screenshot({path:`${out}/family-coverage-mips-close-ui.png`});
 const mipStable=await stableLife('family-coverage-mips-close');const mipProfile=await profile('family-coverage-mips',1500,6000);
 report.phases.push({name:'family-coverage-mips-close',...mipLoad,image:'family-coverage-mips-close.png',stableLife:mipStable,profile:mipProfile});
 assert.ok(mipLoad.state.forest.detailedTrees.foliageMipmaps?.levels?.length>0,'coverage-preserving mip chain installed');
 report.mipImageDelta=await difference(defaultImg,mipImg);
 report.mipSetup={default:{loadElapsedMs:defaultLoad.loadElapsedMs,diagnostics:defaultLoad.state.forest.detailedTrees.foliageMipmaps},
  coveragePreserving:{loadElapsedMs:mipLoad.loadElapsedMs,diagnostics:mipLoad.state.forest.detailedTrees.foliageMipmaps}};
 report.mipPose={positionDeltaM:Math.hypot(...defaultLoad.state.position.map((v,i)=>v-mipLoad.state.position[i])),
  headingDelta:Math.hypot(...defaultLoad.state.heading.map((v,i)=>v-mipLoad.state.heading[i])),dateEqual:defaultLoad.state.date===mipLoad.state.date};
 assert.equal(report.mipPose.positionDeltaM,0);assert.equal(report.mipPose.dateEqual,true);

 const samplesBase=mipLoad.state.forest.detailedTrees.samples;
 const windDate=baseDate+3_500_000_000n;
 await page.evaluate(date=>{window.__atlas.setExplorationPaused(true);window.__atlas.seek(date);},windDate.toString());await awaitSettled();
 const windShift=await snap();const windShiftImg=await capture('family-wind-shift-close');
 const baseById=Object.fromEntries(samplesBase.map(x=>[x.id,x]));const shiftById=Object.fromEntries(windShift.forest.detailedTrees.samples.map(x=>[x.id,x]));
 const ids=Object.keys(baseById).filter(id=>shiftById[id]);const windChanged=ids.filter(id=>baseById[id].windPhase01!==shiftById[id].windPhase01);
 report.wind={baseDateNs:baseDate.toString(),shiftDateNs:windDate.toString(),sampleCounts:[samplesBase.length,windShift.forest.detailedTrees.samples.length],matchingIds:ids.length,
  phaseChangedIds:windChanged.length,phaseSamples:ids.slice(0,6).map(id=>({id,before:baseById[id].windPhase01,after:shiftById[id].windPhase01})),
  imageDelta:await difference(mipImg,windShiftImg),glError:await page.evaluate(()=>document.querySelector('canvas')?.getContext('webgl2')?.getError()??null)};

 await page.evaluate(date=>{window.__atlas.setExplorationPaused(true);window.__atlas.seek(date);},baseDate.toString());await awaitSettled();
 // Rise into the middle of the shared 300–700m shadow fade and retain the same full-scene family.
 await page.evaluate(()=>window.__atlas.setExplorationPaused(false));await page.keyboard.down('e');await wait(()=>window.__atlas.travel.surface?.terrainClearance>380,60000);await page.keyboard.up('e');
 await page.evaluate(()=>window.__atlas.setExplorationPaused(true));await awaitSettled();await page.waitForTimeout(1000);
 const mid=await snap();const midImg=await capture('family-coverage-mips-mid');await page.screenshot({path:`${out}/family-coverage-mips-mid-ui.png`});
 report.phases.push({name:'family-coverage-mips-mid',state:mid,image:'family-coverage-mips-mid.png'});
 report.mid={clearanceM:mid.travel.clearanceM,lighting:mid.lighting,forestVisible:mid.forest.visible,detailedVisible:mid.forest.detailedTrees.visible,
  leafMipDiagnostics:mid.forest.detailedTrees.foliageMipmaps,image:'family-coverage-mips-mid.png'};
 report.midImageDelta=await difference(mipImg,midImg);
 report.renderer=await page.evaluate(()=>{const c=document.querySelector('canvas'),gl=c?.getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info');return ext&&gl?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null;});
 report.glError=await page.evaluate(()=>document.querySelector('canvas')?.getContext('webgl2')?.getError()??null);
 report.errors=errors;const endHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async p=>[p,await sha(p)])));
 report.sourceIntegrity={unchanged:Object.keys(startHashes).every(p=>startHashes[p]===endHashes[p]),start:startHashes,end:endHashes};
 report.ok=errors.length===0&&report.glError===0;
 await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
 assert.equal(report.glError,0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({ok:report.ok,renderer:report.renderer,legacyPose:report.legacyPose,legacyImageDelta:report.legacyImageDelta,
  lifePackStable:[stableOn.lifePackBuildsStable,stableOff.lifePackBuildsStable],canopyCache:{on:stableOn,off:stableOff},mipSetup:report.mipSetup,mipImageDelta:report.mipImageDelta,
  wind:report.wind,mid:report.mid,glError:report.glError,errors,sourceUnchanged:report.sourceIntegrity.unchanged},null,2));
}catch(error){report.ok=false;report.failure=String(error);report.errors=errors;report.current=await snap().catch(()=>null);
 const endHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async p=>[p,await sha(p).catch(()=>null)])));
 report.sourceIntegrity={unchanged:Object.keys(startHashes).every(p=>startHashes[p]===endHashes[p]),start:startHashes,end:endHashes};
 await writeFile(`${out}/failure.json`,JSON.stringify(report,null,2));await page.screenshot({path:`${out}/failure-page.png`}).catch(()=>{});throw error;
}finally{await page.keyboard.up('q').catch(()=>{});await page.keyboard.up('e').catch(()=>{});await browser.close();}

