import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {browserArgs} from './browser-options.mjs';
import {acquireGpuLock} from './helpers/gpu-lock.mjs';
import {UNIVERSE_END_NS} from '../src/world-time.ts';

const candidate=process.env.ATLAS_TREE_CANDIDATE;
if(!candidate)throw new Error('Set ATLAS_TREE_CANDIDATE to the retained v6 output directory.');
const lod0=resolve(process.env.ATLAS_TREE_LOD0??join(candidate,'atlas-branching-v1.glb'));
const lod1=resolve(process.env.ATLAS_TREE_LOD1??join(candidate,'atlas-branching-v1.lod1.glb'));
const base=process.env.ATLAS_URL??'http://127.0.0.1:5196/';
const out=resolve(process.env.ATLAS_RESULTS??join(candidate,'browser-tree-asset-review'));
for(const path of [lod0,lod1])if(!await import('node:fs/promises').then(fs=>fs.stat(path).then(()=>true,()=>false)))throw new Error(`Requested tree candidate file does not exist: ${path}`);
const width=2560,height=1440;
let lock,browser,page;
const errors=[],failedRequests=[];
await mkdir(out,{recursive:true});
const waitFrames=frames=>page.evaluate(count=>new Promise(resolve=>{
  let done=0;const tick=()=>{if(++done>=count)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);
}),frames);
const shot=async name=>page.screenshot({path:join(out,name),fullPage:false});
let report={candidate,lod0,lod1,url:base,viewport:{width,height,deviceScaleFactor:1},hardwareEnabled:!!process.env.ATLAS_HARDWARE,errors,failedRequests,profiles:[],screenshots:[],limitations:['This browser lab is a standalone prototype, not game integration or headset acceptance.','GPU measurements cover the lab scene and include ground/shadows; they do not predict the game.']};
try{
  lock=await acquireGpuLock({owner:'isolated Tree Asset Lab LOD baseline',capture:true,retryMs:30000});
  browser=await chromium.launch({headless:true,args:browserArgs});
  page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&!message.text().startsWith('[vite] failed to connect to websocket.'))errors.push(message.text());});
  page.on('requestfailed',request=>failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`));
  if(typeof page.routeWebSocket==='function')await page.routeWebSocket('**/*',socket=>socket.close());
  await page.goto(new URL('tree-asset-lab.html',base).href,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!!window.__treeAssetLab,{timeout:30000});
  await page.locator('#lod0-file').setInputFiles(lod0);
  await page.locator('#lod1-file').setInputFiles(lod1);
  await page.locator('#load-assets').click();
  await page.waitForFunction(()=>window.__treeAssetLab?.diagnostics().ready&&!window.__treeAssetLab.diagnostics().loading,{timeout:60000});
  await waitFrames(8);
  const loaded=await page.evaluate(()=>{
    const lab=window.__treeAssetLab,d=lab.diagnostics(),family=lab.family;
    const hooks=family.lods.flat().map(mesh=>{
      const material=mesh.material,shader={uniforms:{},vertexShader:'#include <beginnormal_vertex>\n#include <begin_vertex>'};
      material.onBeforeCompile(shader);
      return {name:material.name,programKey:material.customProgramCacheKey(),deformsVertex:shader.vertexShader.includes('atlasLeafRotation'),dateUniform:shader.uniforms.atlasTreePhase?.value};
    });
    return {diagnostics:d,canopyPresentation:family.canopyPresentation,textureCount:family.textures.size,materialsByLod:family.lods.map(meshes=>meshes.map(mesh=>mesh.material.name)),materialReferenceEquality:family.lods[0].map((mesh,i)=>mesh.material===family.lods[1][i].material),textureReferenceEquality:family.lods[0].map((mesh,i)=>mesh.material.map===family.lods[1][i].material.map),geometryAttributes:family.lods.map(meshes=>meshes.map(mesh=>Object.keys(mesh.geometry.attributes))),lodMeshCounts:family.lods.map(meshes=>meshes.length),hooks,light:{shadowMap:lab.renderer.shadowMap.enabled,lights:lab.scene.children.filter(o=>o.isLight).map(light=>({type:light.type,castShadow:light.castShadow}))},renderer:lab.renderer.getContext().getParameter(lab.renderer.getContext().RENDERER),unmaskedRenderer:(()=>{const gl=lab.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?{vendor:gl.getParameter(ext.UNMASKED_VENDOR_WEBGL),renderer:gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)}:null})()};
  });
  assert.equal(loaded.diagnostics.ready,true);assert.equal(loaded.diagnostics.sharedMaterials,true);
  assert.equal(loaded.canopyPresentation.enabled,false,'standard imported MASK family is not far-profile eligible without an offline sidecar');
  assert.equal(loaded.canopyPresentation.lod0Profile.bands.length,4);assert.equal(loaded.canopyPresentation.lod1Profile.bands.length,4);
  assert.ok(loaded.canopyPresentation.conservativeBounds.radiusM>0);
  assert.ok(loaded.canopyPresentation.baseCoverage>=0&&loaded.canopyPresentation.baseCoverage<=1);
  for(const channel of [...loaded.canopyPresentation.barkLinearRgb,...loaded.canopyPresentation.foliageLinearRgb])assert.ok(Number.isFinite(channel)&&channel>=0&&channel<=1);
  assert.equal(loaded.textureCount,4);assert.equal(loaded.diagnostics.materials,2);
  assert.deepEqual(loaded.materialReferenceEquality,[true,true]);assert.deepEqual(loaded.textureReferenceEquality,[true,true]);
  assert.deepEqual(loaded.lodMeshCounts,[2,2]);assert.ok(loaded.light.lights.some(light=>light.type==='DirectionalLight'&&light.castShadow));
  assert.equal(loaded.light.shadowMap,true);
  for(const lodAttributes of loaded.geometryAttributes)for(const attributes of lodAttributes)for(const name of ['_wind','_branch_level','_leaf_center','_leaf_pivot','position','normal','tangent','uv'])assert.ok(attributes.includes(name),`loaded geometry retains ${name}`);
  assert.ok(loaded.hooks.every(hook=>hook.deformsVertex&&hook.programKey==='atlas-tree-physical-3/tree-allometry-2'));
  report.loaded=loaded;
  const initial=await page.evaluate(()=>window.__treeAssetLab.diagnostics());
  assert.equal(initial.textures,4);assert.ok(initial.texturePNGContainerBytes>0);

  const endpointDates=['0','6999999999','7000000000','-1','-7000000001',UNIVERSE_END_NS.toString()];
  const phases=[];
  for(const value of endpointDates){
    await page.evaluate(text=>window.__treeAssetLab.setDate(BigInt(text)),value);await waitFrames(2);
    const state=await page.evaluate(()=>{
      const lab=window.__treeAssetLab,material=lab.family.lods[0][0].material,shader={uniforms:{},vertexShader:'#include <beginnormal_vertex>\n#include <begin_vertex>'};
      material.onBeforeCompile(shader);return {diagnostics:lab.diagnostics(),phase:shader.uniforms.atlasTreePhase.value};
    });
    assert.equal(state.diagnostics.date,value);assert.ok(Number.isFinite(state.phase)&&state.phase>=0&&state.phase<2*Math.PI);
    phases.push({date:value,phase:state.phase});
  }
  assert.equal(phases[0].phase,phases[2].phase,'zero and one period have the same compiled wind uniform');
  assert.equal(phases[3].phase,phases[1].phase,'negative one nanosecond has the equivalent period-end phase');
  report.windDateEndpoints=phases;
  await page.evaluate(()=>window.__treeAssetLab.setDate(0n));

  const details=await page.evaluate(()=>{
    const lab=window.__treeAssetLab;
    const batches=lab.batches.map(batch=>({capacity:batch.meshes[0].count,meshes:batch.meshes.map(mesh=>({castShadow:mesh.castShadow,receiveShadow:mesh.receiveShadow,depthHook:typeof mesh.customDepthMaterial?.onBeforeCompile==='function',distanceHook:typeof mesh.customDistanceMaterial?.onBeforeCompile==='function',depthKey:mesh.customDepthMaterial?.customProgramCacheKey?.(),distanceKey:mesh.customDistanceMaterial?.customProgramCacheKey?.(),windAttribute:mesh.geometry.getAttribute('_wind')?.count,pivotAttribute:mesh.geometry.getAttribute('_leaf_pivot')?.count,levelAttribute:mesh.geometry.getAttribute('_branch_level')?.count,instance:mesh.geometry.getAttribute('instanceTree')?.array.slice(0,12)}))}));
      return {batches,profile:lab.profile.diagnostics()};
  });
  for(const batch of details.batches){assert.equal(batch.meshes.length,2);for(const mesh of batch.meshes){assert.equal(mesh.castShadow,true);assert.equal(mesh.receiveShadow,true);assert.equal(mesh.depthHook,true);assert.equal(mesh.distanceHook,true);assert.equal(mesh.depthKey,'atlas-tree-physical-3/tree-allometry-2');assert.equal(mesh.distanceKey,'atlas-tree-physical-3/tree-allometry-2');assert.ok(mesh.windAttribute>0&&mesh.pivotAttribute>0&&mesh.levelAttribute>0);}}
  for(const mesh of details.batches[0].meshes){const data=mesh.instance;assert.ok(Math.abs(data[0]-10/16)<1e-7);assert.equal(data[1],0);assert.ok(Math.abs(data[2]-1)<1e-7);assert.ok(Math.abs(data[3]-1)<1e-7);assert.equal(data[4],1);assert.ok(Math.abs(data[5]-.7)<1e-7);assert.ok(Math.abs(data[8]-22/16)<1e-7);assert.ok(Math.abs(data[9]-1.4)<1e-7);}
  report.shadowDistanceHooks=details.batches;
  report.gpu={available:details.profile.gpuAvailable,method:details.profile.method,renderer:loaded.renderer,unmaskedRenderer:loaded.unmaskedRenderer};

  const batchContracts=await page.evaluate(()=>{
    const lab=window.__treeAssetLab,M=lab.family.lods[0][0].matrix.constructor,batch=lab.family.createBatch(0,3),matrix=(x=0)=>new M().makeRotationY(.4).setPosition(x,0,0),tau=2*Math.PI;
    const result={gapRejected:false,nonuniformRejected:false,reflectedRejected:false,truncateExpansionRejected:false,phaseNormalized:null};
    try{batch.setInstance(1,matrix(),16);}catch{result.gapRejected=true;}
    batch.setInstance(0,matrix(),16,8*tau+.25);result.phaseNormalized=batch.meshes[0].geometry.getAttribute('instanceTree').array.slice(0,2).at(1);
    try{batch.setInstance(1,new M().makeScale(1,2,1),16);}catch{result.nonuniformRejected=true;}
    try{batch.setInstance(1,new M().makeScale(-1,1,1),16);}catch{result.reflectedRejected=true;}
    batch.setInstance(1,matrix(1),16);batch.setCount(1);
    try{batch.setCount(2);}catch{result.truncateExpansionRejected=true;}
    result.countAfterTruncate=batch.meshes.map(mesh=>mesh.count);batch.dispose();
    return result;
  });
  assert.equal(batchContracts.gapRejected,true);assert.equal(batchContracts.nonuniformRejected,true);assert.equal(batchContracts.reflectedRejected,true);
  assert.equal(batchContracts.truncateExpansionRejected,true);assert.ok(Math.abs(batchContracts.phaseNormalized-.25)<1e-6);assert.deepEqual(batchContracts.countAfterTruncate,[1,1]);
  report.batchContracts=batchContracts;

  const failedLoadRollback=await page.evaluate(async()=>{
    const lab=window.__treeAssetLab,old=lab.family,scene=lab.scene,original=scene.add;
    const inputs=[document.querySelector('#lod0-file').files[0],document.querySelector('#lod1-file').files[0]],buffers=await Promise.all(inputs.map(file=>file.arrayBuffer()));
    scene.add=function(){throw new Error('injected scene attachment failure');};let rejected=false;
    try{await lab.load(buffers);}catch{rejected=true;}finally{scene.add=original;}
    return {rejected,oldFamilyPreserved:lab.family===old,ready:lab.diagnostics().ready,loading:lab.diagnostics().loading};
  });
  assert.deepEqual(failedLoadRollback,{rejected:true,oldFamilyPreserved:true,ready:true,loading:false});report.failedLoadRollback=failedLoadRollback;

  const pointShadow=await page.evaluate(async()=>{
    const lab=window.__treeAssetLab,THREE=await import(new URL('/node_modules/three/build/three.module.js',location.href).href);
    const light=new THREE.PointLight(0xffe0b0,2,70);light.position.set(6,16,8);light.castShadow=true;light.shadow.mapSize.set(256,256);light.shadow.camera.near=.5;light.shadow.camera.far=80;lab.scene.add(light);
    for(let i=0;i<4;i++)await new Promise(resolve=>requestAnimationFrame(()=>resolve()));
    const result={type:light.type,castShadow:light.castShadow,shadowMap:!!light.shadow.map,renderer:lab.renderer.info.render};
    lab.scene.remove(light);light.shadow.dispose();light.dispose();
    return result;
  });
  assert.equal(pointShadow.type,'PointLight');assert.equal(pointShadow.castShadow,true);assert.equal(pointShadow.shadowMap,true);report.pointShadowCompile=pointShadow;

  const successfulReload=await page.evaluate(async()=>{
    const lab=window.__treeAssetLab,old=lab.family,renderer=lab.renderer;
    const inputs=[document.querySelector('#lod0-file').files[0],document.querySelector('#lod1-file').files[0]],buffers=await Promise.all(inputs.map(file=>file.arrayBuffer()));
    await lab.load(buffers);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    return {replaced:lab.family!==old,ready:lab.diagnostics().ready,textureCount:lab.diagnostics().textures,memory:{textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries}};
  });
  assert.equal(successfulReload.replaced,true);assert.equal(successfulReload.ready,true);assert.equal(successfulReload.textureCount,4);report.successfulReload=successfulReload;

  for(const lodValue of [0,1])for(const population of [3,64,192]){
    await page.evaluate(([lod,count])=>{const lab=window.__treeAssetLab;lab.setLOD(lod);lab.setPopulation(count);},[lodValue,population]);
    await waitFrames(120);
    if(population===3||population===192){const image=`lod${lodValue}-population${population}.png`;await shot(image);report.screenshots.push(join(out,image));}
    await page.evaluate(()=>window.__treeAssetLab.profile.clear());
    await waitFrames(120);
    await waitFrames(60);
    const profile=await page.evaluate(()=>{
      const lab=window.__treeAssetLab,d=lab.diagnostics();
      return {diagnostics:d,profile:d.profile,renderer:d.renderer,batchCounts:lab.batches.map(batch=>batch.meshes.map(mesh=>mesh.count)),instanceTree:lab.batches.map(batch=>Array.from(batch.meshes[0].geometry.getAttribute('instanceTree').array.slice(0,d.population*4)))};
    });
    assert.equal(profile.diagnostics.population,population);assert.ok(profile.batchCounts.flat().every(count=>count===population));
    assert.ok(profile.renderer.triangles>0);assert.equal(profile.diagnostics.sharedMaterials,true);
    assert.equal(profile.profile.enabled,true);
    report.profiles.push({lod:lodValue,population,renderer:profile.renderer,profile:profile.profile,instanceScaleAndPhaseRange:{count:population,minScale:Math.min(...profile.instanceTree.flatMap(values=>values.filter((_,i)=>i%4===0))),maxScale:Math.max(...profile.instanceTree.flatMap(values=>values.filter((_,i)=>i%4===0))),finite:profile.instanceTree.every(values=>values.every(Number.isFinite))}});
  }
  await page.evaluate(()=>window.__treeAssetLab.setLOD(0));await waitFrames(120);
  assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);
  report.errors=errors;report.failedRequests=failedRequests;
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
}catch(error){
  report.errors=errors;report.failedRequests=failedRequests;report.failure=String(error);
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  throw error;
}finally{await browser?.close();await lock?.release();}
