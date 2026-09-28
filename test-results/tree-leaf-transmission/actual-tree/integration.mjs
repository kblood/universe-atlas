import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,stat,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {browserArgs} from '../../../tests/browser-options.mjs';

const candidate=resolve(process.env.ATLAS_TREE_CANDIDATE??'C:/LLM/IWSDK/Assets/_assetctl/atlas-ez-family-f');
const lod0=resolve(join(candidate,'atlas-ez-oak.glb'));
const lod1=resolve(join(candidate,'atlas-ez-oak.lod1.glb'));
const base=process.env.ATLAS_URL??'http://127.0.0.1:5197/';
const out=resolve(process.env.ATLAS_RESULTS??'test-results/tree-leaf-transmission/actual-tree/family-f');
for(const path of [lod0,lod1])await stat(path);
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width:2560,height:1440},deviceScaleFactor:1});
const errors=[],failedRequests=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error'&&!message.text().startsWith('[vite] failed to connect to websocket.'))errors.push(message.text());});
page.on('requestfailed',request=>failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`));
await mkdir(out,{recursive:true});
const sha=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
const report={candidate,lod0,lod1,url:base,out,viewport:{width:2560,height:1440,deviceScaleFactor:1},hardwareEnabled:!!process.env.ATLAS_HARDWARE,
  fixedLighting:{sunPosition:[0,30,40],sunIntensity:3,hemisphereIntensity:1,shadowNormalBias:0,shadowBias:-.0001,exposure:1.2},
  scope:'Opt-in family-F foliage transmission integration check. Four fixed-view screenshots; no performance or whole-game acceptance claims.',
  errors,failedRequests,screenshots:[],lodCompiles:[],windDates:[],limitations:['The preview uses the asset lab lighting and scene, not final game lighting.','The family is a comparison fixture, not an adopted production asset.']};
report.assets={lod0:await sha(lod0),lod1:await sha(lod1)};
for(const rel of ['../../../src/tree-asset.ts','../../../src/tree-leaf-transmission.ts','../../../src/tree-asset-lab.ts'])report.source??={},report.source[rel]=await sha(fileURLToPath(new URL(rel,import.meta.url)));
const waitFrames=count=>page.evaluate(count=>new Promise(resolve=>{let frame=0;const tick=()=>++frame>=count?resolve():requestAnimationFrame(tick);requestAnimationFrame(tick);}),count);
const screenshot=async name=>{const path=join(out,name);await page.locator('#viewport canvas').screenshot({path});report.screenshots.push(path);};
const capturePixels=async(key,compareTo)=>page.evaluate(({key,compareTo})=>{
  const lab=window.__treeAssetLab,gl=lab.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
  lab.renderer.render(lab.scene,lab.camera);const pixels=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  let hash=2166136261,lum=0;for(let i=0;i<pixels.length;i++){hash=Math.imul(hash^pixels[i],16777619);if(i%4===0)lum+=pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722;}
  const result={width:w,height:h,fnv1a32:(hash>>>0).toString(16).padStart(8,'0'),meanRGBLuma:lum/(w*h),glError:gl.getError()};
  if(compareTo){const previous=window.__leafTransmissionBaselines?.[compareTo];if(!previous)throw new Error(`Missing image baseline ${compareTo}`);let max=0,sum=0,nonzero=0;for(let i=0;i<pixels.length;i++){const d=Math.abs(pixels[i]-previous[i]);max=Math.max(max,d);sum+=d;if(d)nonzero++;}result.pixelDelta={maxAbs:max,meanAbs:sum/pixels.length,nonzeroValues:nonzero};}
  if(key){window.__leafTransmissionBaselines??={};window.__leafTransmissionBaselines[key]=pixels;}
  return result;
},{key,compareTo});
const waitReady=()=>page.waitForFunction(()=>window.__treeAssetLab?.diagnostics().ready&&!window.__treeAssetLab.diagnostics().loading,{timeout:60000});
const setScene=async(back,level,date='0')=>page.evaluate(({back,level,date})=>{
  const lab=window.__treeAssetLab;
  lab.setLOD(level);lab.setDate(BigInt(date));
  // Keep the sun on the same side; move the camera behind the leaf cards for
  // the backlit comparison rather than flipping camera and light together.
  lab.sun.position.set(0,30,40);lab.sun.target.position.set(0,0,0);lab.sun.target.updateMatrixWorld(true);
  lab.sun.shadow.normalBias=0;lab.sun.shadow.bias=-.0001;lab.sun.updateMatrixWorld(true);
  lab.controls.enabled=false;lab.controls.target.set(0,9,0);lab.camera.position.set(0,9,back?-32:32);lab.camera.lookAt(0,9,0);lab.camera.updateMatrixWorld(true);
}, {back,level,date});
const state=async()=>page.evaluate(async()=>{
  const THREE=await import(new URL('/node_modules/three/build/three.module.js',location.href).href);
  const lab=window.__treeAssetLab,gl=lab.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  const family=lab.family,meshes=lab.batches.map(batch=>batch.meshes);
  const shaderByLOD=family.lods.map(pair=>{
    const mesh=pair[1],shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
    mesh.material.onBeforeCompile(shader,lab.renderer);
    return {key:mesh.material.customProgramCacheKey(),transmission:shader.uniforms.atlasLeafTransmission?.value,tint:shader.uniforms.atlasLeafTransmissionTint?.value.toArray(),wind:shader.uniforms.atlasTreePhase?.value,vertexWind:shader.vertexShader.includes('atlasLeafRotation'),transmissionCode:shader.fragmentShader.includes('atlasLeafBackIrradiance')};
  });
  return {diagnostics:lab.diagnostics(),shaderByLOD,meshState:meshes.map(pair=>pair.map(mesh=>({visible:mesh.parent.visible,castShadow:mesh.castShadow,receiveShadow:mesh.receiveShadow,depthHook:typeof mesh.customDepthMaterial?.onBeforeCompile==='function',distanceHook:typeof mesh.customDistanceMaterial?.onBeforeCompile==='function'}))),renderer:{programs:lab.renderer.info.programs?.length??null,calls:lab.renderer.info.render.calls,triangles:lab.renderer.info.render.triangles,unmasked:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)},glError:gl.getError()};
});
try{
  if(typeof page.routeWebSocket==='function')await page.routeWebSocket('**/*',socket=>socket.close());
  await page.goto(new URL('tree-asset-lab.html',base).href,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!!window.__treeAssetLab,{timeout:30000});
  await page.locator('#lod0-file').setInputFiles(lod0);await page.locator('#lod1-file').setInputFiles(lod1);
  await page.locator('#coverage').selectOption('mask');await page.locator('#transmission').selectOption('off');await page.locator('#load-assets').click();await waitReady();
  report.initial=await state();assert.equal(report.initial.diagnostics.leafTransmission,null);

  const loadTransmission=async transmission=>{
    await page.evaluate(async({transmission})=>{
      const lab=window.__treeAssetLab,files=['lod0-file','lod1-file'].map(id=>document.querySelector(`#${id}`).files[0]);
      if(transmission==='off')await lab.load(await Promise.all(files.map(file=>file.arrayBuffer())),{foliageCoverage:'mask'});
      else await lab.load(await Promise.all(files.map(file=>file.arrayBuffer())),{foliageCoverage:'mask',leafTransmission:{factor:.35,tint:[1,1,1]}});
    },{transmission});
    await waitReady();
  };
  const renderPair=async({transmission,level,back,name})=>{
    await setScene(back,level,'0');await waitFrames(18);
    // Force a main and shadow draw at each level before recording diagnostics.
    const details=await state();
    assert.equal(details.diagnostics.ready,true);assert.equal(details.diagnostics.lod,level);
    assert.equal(details.glError,0);assert.equal(details.shaderByLOD.length,2);
    for(const shader of details.shaderByLOD){assert.equal(shader.vertexWind,true);assert.equal(shader.transmissionCode,transmission==='on');assert.equal(shader.wind,0);}
    assert.equal(details.diagnostics.leafTransmission?.factor??null,transmission==='on' ? 0.35 : null);
    assert.ok(details.renderer.calls>0&&details.renderer.triangles>0,`LOD${level} submits real geometry`);
    for(const mesh of details.meshState[level]){assert.equal(mesh.visible,true);assert.equal(mesh.castShadow,true);assert.equal(mesh.receiveShadow,true);assert.equal(mesh.depthHook,true);assert.equal(mesh.distanceHook,true);}
    report.lodCompiles.push({transmission,level,back,...details});
    if(transmission==='on'&&level===0){
      await page.evaluate(()=>window.__treeAssetLab.family.leafTransmission.set({factor:0,tint:[1,1,1]}));await waitFrames(3);
      const zero=await capturePixels(null,`off-${back?'back':'front'}`);
      assert.equal(zero.glError,0);assert.ok(zero.pixelDelta.meanAbs<1/255,`installed T=0 reproduces off ${back?'back':'front'} frame`);
      (report.zeroFactorPixelParity??=[]).push({view:back?'back':'front',...zero});
      await page.evaluate(()=>window.__treeAssetLab.family.leafTransmission.set({factor:.35,tint:[1,1,1]}));await waitFrames(3);
    }
    if(name){
      if(transmission==='off')report.canvasFrames??={},report.canvasFrames[`off-${back?'back':'front'}`]=await capturePixels(`off-${back?'back':'front'}`);
      else report.canvasFrames[`on-${back?'back':'front'}`]=await capturePixels();
      await screenshot(name);
    }
  };
  // Shader compilation and shadow/depth hooks at both LODs, same date/light rig.
  for(const transmission of ['off','on']){
    await loadTransmission(transmission);
    for(const level of [0,1])for(const back of [false,true]){
    const name=level===0?`lod0-${back?'back':'front'}-${transmission}.png`:null;
    await renderPair({transmission,level,back,name});
    }
  }
  assert.equal(report.screenshots.length,4);
  const phaseSamples=await page.evaluate(async()=>{
    const THREE=await import(new URL('/node_modules/three/build/three.module.js',location.href).href);
    const lab=window.__treeAssetLab,material=lab.family.lods[0][1].material;
    lab.setLOD(0);lab.sun.position.set(0,30,40);lab.sun.target.position.set(0,0,0);lab.sun.target.updateMatrixWorld(true);lab.controls.enabled=false;lab.controls.target.set(0,9,0);lab.camera.position.set(0,9,32);lab.camera.lookAt(0,9,0);lab.camera.updateMatrixWorld(true);
    const frameHash=()=>{const gl=lab.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,p=new Uint8Array(w*h*4);lab.renderer.render(lab.scene,lab.camera);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,p);let hash=2166136261;for(const x of p)hash=Math.imul(hash^x,16777619);return (hash>>>0).toString(16).padStart(8,'0');};
    const sample=ns=>{lab.setDate(BigInt(ns));const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader,lab.renderer);return {date:ns,wind:shader.uniforms.atlasTreePhase.value,transmission:shader.uniforms.atlasLeafTransmission.value,frameHash:frameHash()};};
    return [sample('0'),sample('1750000000'),sample('7000000000')];
  });
  assert.equal(phaseSamples[0].wind,phaseSamples[2].wind);assert.notEqual(phaseSamples[0].wind,phaseSamples[1].wind);
  assert.equal(phaseSamples[0].frameHash,phaseSamples[2].frameHash,'the rendered wind pose replays after one full period');
  assert.notEqual(phaseSamples[0].frameHash,phaseSamples[1].frameHash,'the intermediate date changes rendered pixels');
  assert.equal(phaseSamples[2].transmission,.35);report.windDates=phaseSamples;
  report.errors=errors;report.failedRequests=failedRequests;
  assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
}catch(error){
  report.errors=errors;report.failedRequests=failedRequests;report.failure=String(error);
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');throw error;
}finally{await browser.close();}
