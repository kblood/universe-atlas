import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {browserArgs} from '../../tests/browser-options.mjs';
import {encodeVersions,CURRENT_VERSIONS} from '../../src/time-nav.ts';

const base=process.env.ATLAS_URL||'http://127.0.0.1:5198/';
const out=process.env.ATLAS_RESULTS||'test-results/offline-foliage-mips/browser-run';
const oak=process.env.ATLAS_OAK_ROOT||'C:/LLM/IWSDK/Assets/_assetctl/atlas-ez-family-f';
const pine=process.env.ATLAS_PINE_ROOT||'C:/LLM/IWSDK/Assets/_assetctl/atlas-ez-conifer-family-13977-16m-v1e';
const sidecars={
 oak:{manifest:process.env.ATLAS_OAK_MIP_MANIFEST,data:process.env.ATLAS_OAK_MIP_DATA},
 pine:{manifest:process.env.ATLAS_PINE_MIP_MANIFEST,data:process.env.ATLAS_PINE_MIP_DATA},
};
for(const [kind,s] of Object.entries(sidecars))if(!s.manifest||!s.data)throw new Error(`Set ATLAS_${kind.toUpperCase()}_MIP_MANIFEST and ATLAS_${kind.toUpperCase()}_MIP_DATA`);
const oakPaths=[`${oak}/atlas-ez-oak.glb`,`${oak}/atlas-ez-oak.lod1.glb`];
const pinePaths=[`${pine}/atlas-ez-conifer.glb`,`${pine}/atlas-ez-conifer.lod1.glb`];
const paths=[...oakPaths,...pinePaths,sidecars.oak.manifest,sidecars.oak.data,sidecars.pine.manifest,sidecars.pine.data];
const srcPaths=['src/main.ts','src/planet-renderer.ts','src/planet-forest.ts','src/forest-tree-family-library.ts','src/tree-asset.ts','src/tree-foliage-sidecar.ts','src/tree-foliage-mips.ts','src/compact-instance-slots.ts','src/forest-tree-catalogue.ts','src/surface-lighting.ts','src/terrain-shadow.ts','src/forest-material.ts','src/planet-canopy.ts','src/fauna-field-renderer.ts','test-results/offline-foliage-mips/integration.browser.mjs',...paths];
const hash=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
await mkdir(out,{recursive:true});
const startHashes=Object.fromEntries(await Promise.all(srcPaths.map(async p=>[p,await hash(p)])));
const bodyId='G001/C2128,0,1/0/planet/1',systemId='G001/C2128,0,1/0';
const query=new URLSearchParams({seed:'LETHRA-001',g:'G001',system:systemId,body:bodyId,date:'435084631200000032044300000',wv:encodeVersions(CURRENT_VERSIONS),profile:'1',lighting:'1'});
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(`page:${e.message}`));page.on('crash',()=>errors.push('page:renderer crashed'));
page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('[vite] failed to connect to websocket.'))errors.push(`console:${m.text()}`);});
if(typeof page.routeWebSocket==='function')await page.routeWebSocket('**/*',ws=>ws.close());
const wait=(fn,timeout=180000,arg)=>page.waitForFunction(fn,arg,{timeout});
const snap=()=>page.evaluate(()=>{const a=window.__atlas,t=a?.terrain?.tiles,f=t?.forest,d=f?.detailedTrees,b=a?.travel?.bodies?.find(x=>x.id===a?.state?.body?.id);
 const position=b?a.travel.position.map((v,i)=>v-b.positionM[i]):null;
 return{date:a?.date?.offsetNs,bodyId:a?.state?.body?.id,positionM:position,heading:a?.travel?.heading,
  clearanceM:a?.travel?.surface?.terrainClearance,lighting:a?.surfaceLighting,
  terrain:t?{pending:t.pending,lifePending:t.lifePending,faunaTerrainPending:t.faunaTerrainPending,staleWaterPatches:t.staleWaterPatches,lifePackBuilds:t.lifePackBuilds}:null,
  forest:f?{visible:f.visible,pending:f.pending,selectionPending:f.selectionPending,fullCanopy:f.fullCanopy,detailedTrees:d}:null,
  render:a?.stats?{draws:a.stats.draws,triangles:a.stats.triangles,textures:a.stats.textures}:null,profile:a?.renderProfile};});
const quiet=async()=>wait(()=>{const a=window.__atlas,t=a?.terrain?.tiles,f=t?.forest,c=f?.fullCanopy,d=f?.detailedTrees;
 return t&&f&&c?.ready&&t.pending===0&&t.staleWaterPatches===0&&f.pending===0&&!f.selectionPending&&!c.selectionPending&&!c.selectionApplyPending&&!c.reusePending&&c.queuedPatches===0&&c.jobsInFlight===0&&t.lifePending===0&&t.faunaTerrainPending===0&&!d?.loading;},240000);
const capture=async name=>{const data=await page.evaluate(async()=>{await new Promise(requestAnimationFrame);return document.querySelector('canvas')?.toDataURL('image/png')||null;});assert.ok(data?.startsWith('data:image/png;base64,'));await writeFile(`${out}/${name}.png`,Buffer.from(data.slice(data.indexOf(',')+1),'base64'));return data;};
const compare=(a,b)=>page.evaluate(async([x,y])=>{const decode=async(s)=>{const i=new Image();i.src=s;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d');g.drawImage(i,0,0);return{w:i.width,h:i.height,d:g.getImageData(0,0,i.width,i.height).data};};const A=await decode(x),B=await decode(y);let changed=0,sum=0,max=0;for(let k=0;k<A.d.length;k+=4){const v=Math.max(Math.abs(A.d[k]-B.d[k]),Math.abs(A.d[k+1]-B.d[k+1]),Math.abs(A.d[k+2]-B.d[k+2]));sum+=v;max=Math.max(max,v);if(v>3)changed++;}return{width:A.w,height:A.h,changedPixelsOver3:changed,changedFraction:changed/(A.w*A.h),meanMaxChannelDelta:sum/(A.w*A.h),maxChannelDelta:max};},[a,b]);
const familyFiles={oak:oakPaths,pine:pinePaths};
const addInput=async(includeSidecars)=>{await page.evaluate(()=>{document.querySelector('#sidecar-fixture')?.remove();const e=document.createElement('input');e.type='file';e.multiple=true;e.id='sidecar-fixture';document.body.append(e);});
 const selected=includeSidecars?[...oakPaths,...pinePaths,sidecars.oak.manifest,sidecars.oak.data,sidecars.pine.manifest,sidecars.pine.data]:[...oakPaths,...pinePaths];
 await page.locator('#sidecar-fixture').setInputFiles(selected);};
const load=async(offline)=>{await addInput(offline);const started=Date.now();
 const loaded=await page.evaluate(async(offline)=>{const input=document.querySelector('#sidecar-fixture'),f=[...input.files];
 const oak={kind:'branching',lod0:await f[0].arrayBuffer(),lod1:await f[1].arrayBuffer()};
 const pine={kind:'spire',lod0:await f[2].arrayBuffer(),lod1:await f[3].arrayBuffer()};
 if(offline){oak.foliageMipSidecar={manifest:JSON.parse(await f[4].text()),data:await f[5].arrayBuffer()};pine.foliageMipSidecar={manifest:JSON.parse(await f[6].text()),data:await f[7].arrayBuffer()};}
 try{return await window.__atlas.loadForestTreeFamilies([oak,pine],{foliageCoverage:'mask',foliageMipmaps:false,leafTransmission:{factor:.35,tint:[.75,1,.8]}});}finally{input.remove();}},offline);
 assert.equal(loaded,true,offline?'offline mip family set installs':'default mip family set installs');
 await wait(()=>{const d=window.__atlas.terrain?.tiles?.forest?.detailedTrees;return d?.ready&&!d.loading&&d.families?.length===2&&d.families.every(x=>x.submitted.some(n=>n>0));},120000);
 await quiet();await page.waitForTimeout(750);return{elapsedMs:Date.now()-started,state:await snap()};};
const measureStorage=()=>page.evaluate(()=>{const gl=document.querySelector('canvas')?.getContext('webgl2');if(!gl)throw new Error('WebGL2 context unavailable');const proto=Object.getPrototypeOf(gl),original=proto.texStorage2D;if(typeof original!=='function')throw new Error('texStorage2D is unavailable');
 const rows=[];const wrapped=function(target,levels,format,width,height){if(target===gl.TEXTURE_2D){rows.push({levels,format,width,height,texture:this.getParameter(this.TEXTURE_BINDING_2D)});}return original.apply(this,arguments);};
 proto.texStorage2D=wrapped;if(proto.texStorage2D!==wrapped)throw new Error('Could not intercept WebGL2 texStorage2D');window.__offlineMipStorageAudit={gl,proto,original,rows};return{armed:true};});
const readbackStorage=()=>page.evaluate(()=>{const a=window.__offlineMipStorageAudit;if(!a)return{available:false,reason:'storage audit not armed'};const{gl,proto,original,rows}=a;proto.texStorage2D=original;const previous={active:gl.getParameter(gl.ACTIVE_TEXTURE),texture:gl.getParameter(gl.TEXTURE_BINDING_2D),draw:gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING),read:gl.getParameter(gl.READ_FRAMEBUFFER_BINDING)};const selected=rows.filter(x=>x.width===2048&&x.height===2048&&x.levels===8&&x.texture);const result=[];
 try{for(const r of selected){const fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,r.texture,7);const status=gl.checkFramebufferStatus(gl.FRAMEBUFFER);let pixels=null;if(status===gl.FRAMEBUFFER_COMPLETE){const bytes=new Uint8Array(16*16*4);gl.readPixels(0,0,16,16,gl.RGBA,gl.UNSIGNED_BYTE,bytes);let alpha=0;for(let i=3;i<bytes.length;i+=4)if(bytes[i]>=128)alpha++;pixels={width:16,height:16,alphaCoverage:alpha/(16*16),sha256:null,firstPixel:[...bytes.slice(0,4)]};}result.push({width:r.width,height:r.height,levels:r.levels,internalFormat:r.format,framebufferStatus:status,readback:pixels,glError:gl.getError()});gl.deleteFramebuffer(fb);}}
 finally{gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,previous.draw);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,previous.read);gl.activeTexture(previous.active);gl.bindTexture(gl.TEXTURE_2D,previous.texture);delete window.__offlineMipStorageAudit;}
 return{available:true,capturedStorageCalls:rows.map(({texture,...x})=>x),sidecarSizedLevel8:selected.length,readbacks:result,restoredBindings:true};});
const profile=async(name,warmMs=2000,sampleMs=8000)=>{await page.evaluate(()=>{window.__atlas.setProfiling(true);window.__atlas.resetProfile();});await page.waitForTimeout(warmMs);await page.evaluate(()=>window.__atlas.resetProfile());await page.waitForTimeout(sampleMs);const s=await snap();return{name,warmMs,sampleMs,statistics:s.profile?.statistics,diagnostics:s.profile,render:s.render,lifePackBuilds:s.terrain.lifePackBuilds,lifePending:s.terrain.lifePending,faunaTerrainPending:s.terrain.faunaTerrainPending};};
const samples=s=>Object.fromEntries(s.forest.detailedTrees.samples.map(x=>[x.id,{family:x.family,speciesId:x.speciesId,recipe:x.recipe,heightM:x.heightM,windPhase01:x.windPhase01}]));
let report={ok:false,base,out,bodyId,renderer:null,assetPaths:paths,sourceHashes:startHashes,phases:[],errors};
try{
 console.log('navigate');await page.goto(`${base}?${query}`,{waitUntil:'domcontentloaded'});await wait(id=>window.__atlas?.ready&&window.__atlas.state.level==='body'&&window.__atlas.state.body?.id===id&&!window.__atlas.camera.animating,180000,bodyId);
 console.log('find-life');await page.locator('#find-life').click();await wait(()=>window.__atlas.travel.terrainCruise!==null,180000);
 console.log('descend');await page.keyboard.down('q');await wait(()=>window.__atlas.travel.surface?.terrainClearance<12,180000);await page.keyboard.up('q');await page.evaluate(()=>window.__atlas.setExplorationPaused(true));await quiet();
 const baseline=await snap();assert.equal(baseline.lighting?.active,true);report.observedDateAfterFindLife=baseline.date;report.phases.push({label:'legacy-close-baseline',state:baseline});await capture('legacy-close-baseline');
 console.log('load-default-mips');const defaults=await load(false);report.phases.push({label:'families-default-mips-close',...defaults});const defaultImg=await capture('families-default-mips-close');
 assert.equal(defaults.state.lighting.active,true);assert.equal(defaults.state.forest.detailedTrees.families.length,2);
 report.defaultProfiles=await profile('families-default-mips-detailed-lit',2000,8000);report.defaultLoadMs=defaults.elapsedMs;
 console.log('arm-webgl-storage-audit');report.storageAuditArmed=await measureStorage();
 console.log('load-offline-sidecars');const offline=await load(true);report.phases.push({label:'families-offline-mips-close',...offline});const offlineImg=await capture('families-offline-mips-close');report.offlineProfiles=await profile('families-offline-mips-detailed-lit',2000,8000);report.offlineLoadMs=offline.elapsedMs;
 report.textureStorage=await readbackStorage();
 report.sidecarDiagnostics=offline.state.forest.detailedTrees.families.map(f=>({kind:f.kind,foliageMipmaps:f.foliageMipmaps,submitted:f.submitted}));
 assert.ok(report.sidecarDiagnostics.every(f=>f.foliageMipmaps?.source==='offline-sidecar'&&f.foliageMipmaps.levels.length===8),'both family sidecars install eight explicit levels');
 report.closeComparison={positionDeltaM:Math.hypot(...defaults.state.positionM.map((v,i)=>v-offline.state.positionM[i])),headingDelta:Math.hypot(...defaults.state.heading.map((v,i)=>v-offline.state.heading[i])),dateEqual:defaults.state.date===offline.state.date,pixels:await compare(defaultImg,offlineImg)};
 const date0=BigInt(baseline.date),dateShift=date0+3_500_000_000n;const before=samples(await snap());
 console.log('date-shift');await page.evaluate(date=>{window.__atlas.setExplorationPaused(true);window.__atlas.seek(date);},dateShift.toString());await quiet();const shifted=await snap();report.phases.push({label:'offline-sidecar-date-shift',state:shifted});await capture('offline-date-shift');
 console.log('date-return');await page.evaluate(date=>{window.__atlas.setExplorationPaused(true);window.__atlas.seek(date);},date0.toString());await quiet();await page.waitForTimeout(500);const returned=await snap();report.phases.push({label:'offline-sidecar-date-return',state:returned});await capture('offline-date-return');
 const after=samples(returned),ids=Object.keys(before).filter(id=>id in after),mismatches=ids.filter(id=>JSON.stringify(before[id])!==JSON.stringify(after[id]));report.dateReplay={baseDate:date0.toString(),shiftDate:dateShift.toString(),matchingIds:ids.length,mismatches:mismatches.slice(0,12)};assert.ok(ids.length>0);assert.deepEqual(mismatches,[],'offline sidecar date return preserves canonical tree sample bindings');
 console.log('mid-flight');await page.evaluate(()=>window.__atlas.setExplorationPaused(false));await page.keyboard.down('e');await wait(()=>window.__atlas.travel.surface?.terrainClearance>380,60000);await page.keyboard.up('e');await page.evaluate(()=>window.__atlas.setExplorationPaused(true));await quiet();await page.waitForTimeout(750);const mid=await snap();report.phases.push({label:'offline-sidecar-mid-390m',state:mid});await capture('offline-mid-390m');
 report.renderer=await page.evaluate(()=>{const gl=document.querySelector('canvas')?.getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';});report.glError=await page.evaluate(()=>document.querySelector('canvas')?.getContext('webgl2')?.getError()??null);
 const endHashes=Object.fromEntries(await Promise.all(srcPaths.map(async p=>[p,await hash(p)])));report.sourceIntegrity={unchanged:Object.keys(startHashes).every(p=>startHashes[p]===endHashes[p]),start:startHashes,end:endHashes};report.errors=errors;report.ok=errors.length===0&&report.glError===0&&report.sourceIntegrity.unchanged;
 await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));assert.equal(report.glError,0);assert.deepEqual(errors,[]);assert.equal(report.sourceIntegrity.unchanged,true);
 console.log(JSON.stringify({ok:report.ok,renderer:report.renderer,baseDate:report.observedDateAfterFindLife,defaultLoadMs:report.defaultLoadMs,offlineLoadMs:report.offlineLoadMs,sidecars:report.sidecarDiagnostics.map(x=>({kind:x.kind,source:x.foliageMipmaps?.source,payloadBytes:x.foliageMipmaps?.payloadBytes,setupMs:x.foliageMipmaps?.setupMs,levels:x.foliageMipmaps?.levels?.length})),storage:report.textureStorage,close:report.closeComparison,dateReplay:report.dateReplay,mid:{clearance:mid.clearanceM,lighting:mid.lighting?.active,families:mid.forest.detailedTrees.families.map(f=>f.submitted)},glError:report.glError,errors},null,2));
}catch(error){report.ok=false;report.failure=String(error);report.errors=errors;report.current=await snap().catch(()=>null);const endHashes=Object.fromEntries(await Promise.all(srcPaths.map(async p=>[p,await hash(p).catch(()=>null)])));report.sourceIntegrity={unchanged:Object.keys(startHashes).every(p=>startHashes[p]===endHashes[p]),start:startHashes,end:endHashes};await writeFile(`${out}/failure.json`,JSON.stringify(report,null,2));await page.screenshot({path:`${out}/failure-page.png`}).catch(()=>{});throw error;
}finally{await page.keyboard.up('q').catch(()=>{});await page.keyboard.up('e').catch(()=>{});await browser.close();}

