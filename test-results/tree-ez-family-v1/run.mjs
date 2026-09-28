import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {browserArgs} from '../../tests/browser-options.mjs';
import {UNIVERSE_END_NS} from '../../src/world-time.ts';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const sharp=createRequire(resolve(process.env.IWSDK_ROOT??'C:/LLM/IWSDK','tools/assetctl/package.json'))('sharp');

const candidate=process.env.ATLAS_TREE_CANDIDATE;
if(!candidate)throw new Error('Set ATLAS_TREE_CANDIDATE to the retained v6 output directory.');
const lod0=resolve(process.env.ATLAS_TREE_LOD0??join(candidate,'atlas-ez-oak.glb'));
const lod1=resolve(process.env.ATLAS_TREE_LOD1??join(candidate,'atlas-ez-oak.lod1.glb'));
const base=process.env.ATLAS_URL??'http://127.0.0.1:5197/';
const out=resolve(process.env.ATLAS_RESULTS??join(candidate,'browser-tree-asset-review'));
for(const path of [lod0,lod1])if(!await import('node:fs/promises').then(fs=>fs.stat(path).then(()=>true,()=>false)))throw new Error(`Requested tree candidate file does not exist: ${path}`);
const width=1600,height=1000;
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
const errors=[],failedRequests=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error'&&!message.text().startsWith('[vite] failed to connect to websocket.'))errors.push(message.text());});
page.on('requestfailed',request=>failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`));
await mkdir(out,{recursive:true});
const waitFrames=frames=>page.evaluate(count=>new Promise(resolve=>{
  let done=0;const tick=()=>{if(++done>=count)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);
}),frames);
const shot=async name=>page.screenshot({path:join(out,name),fullPage:false});
const canvasShot=async name=>{
  const path=join(out,name),dataUrl=await page.evaluate(()=>{const lab=window.__treeAssetLab;lab.renderer.render(lab.scene,lab.camera);return lab.renderer.domElement.toDataURL('image/png');});
  await writeFile(path,Buffer.from(dataUrl.slice(dataUrl.indexOf(',')+1),'base64'));return path;
};
const familyManifestPath=join(candidate,'family-manifest.json');
const familyManifest=JSON.parse(await readFile(familyManifestPath,'utf8'));
const hashFile=async file=>createHash('sha256').update(await readFile(file)).digest('hex');
let report={candidate,lod0,lod1,familyManifestPath,url:base,viewport:{width,height,deviceScaleFactor:1},hardwareEnabled:!!process.env.ATLAS_HARDWARE,browserVersion:browser.version(),sourceHashes:Object.fromEntries(await Promise.all(['tree-asset-lab.html','src/tree-asset-lab.ts','src/tree-asset.ts','src/world-time.ts'].map(async path=>[path,await hashFile(resolve(path))]))),errors,failedRequests,profiles:[],screenshots:[],inputHashes:{lod0:await hashFile(lod0),lod1:await hashFile(lod1),familyManifest:await hashFile(familyManifestPath)},limitations:['Standalone asset lab only; this is not full-game or headset acceptance.','GPU samples cover this fixed lab scene, lights, ground and shadow settings; they do not predict game performance.']};
try{
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
    const xyz=(a,row)=>[a.getX(row),a.getY(row),a.getZ(row)];
    const key=(g,row)=>[...xyz(g.getAttribute('_leaf_pivot'),row),g.getAttribute('uv').getX(row),g.getAttribute('uv').getY(row),g.getAttribute('_wind').getX(row)].map(x=>Number(x).toFixed(6)).join(',');
    const positions=(g,row)=>xyz(g.getAttribute('position'),row);
    const lodGeometry=family.lods.map(meshes=>{
      const metrics=meshes.map(mesh=>({material:mesh.material.name,triangles:mesh.geometry.index.count/3,vertices:mesh.geometry.getAttribute('position').count,attributes:Object.keys(mesh.geometry.attributes)}));
      const leaf=meshes.find(mesh=>mesh.material.name==='MAT_AtlasFoliage').geometry,wind=leaf.getAttribute('_wind');let min=Infinity,max=-Infinity,finite=true;
      for(let i=0;i<wind.count;i++){const value=wind.getX(i);finite&&=Number.isFinite(value);min=Math.min(min,value);max=Math.max(max,value);}
      return {metrics,leafWind:{count:wind.count,finite,min,max,itemSize:wind.itemSize},leafGeometry:leaf};
    });
    const lod0Leaf=lodGeometry[0].leafGeometry,lod1Leaf=lodGeometry[1].leafGeometry,source=new Map();
    for(let row=0;row<lod0Leaf.getAttribute('position').count;row++){const k=key(lod0Leaf,row),set=source.get(k)??[];set.push(positions(lod0Leaf,row));source.set(k,set);}
    let matched=0,maxPositionDelta=0;
    for(let row=0;row<lod1Leaf.getAttribute('position').count;row++){
      const candidates=source.get(key(lod1Leaf,row));if(!candidates)continue;const p=positions(lod1Leaf,row);
      const delta=Math.min(...candidates.map(q=>Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2])));
      if(delta<1e-5){matched++;maxPositionDelta=Math.max(maxPositionDelta,delta);}
    }
    return {diagnostics:d,textureCount:family.textures.size,materialsByLod:family.lods.map(meshes=>meshes.map(mesh=>mesh.material.name)),materialReferenceEquality:family.lods[0].map((mesh,i)=>mesh.material===family.lods[1][i].material),textureReferenceEquality:family.lods[0].map((mesh,i)=>mesh.material.map===family.lods[1][i].material.map),geometryAttributes:family.lods.map(meshes=>meshes.map(mesh=>Object.keys(mesh.geometry.attributes))),lodMeshCounts:family.lods.map(meshes=>meshes.length),lodGeometry:lodGeometry.map(({metrics,leafWind})=>({metrics,leafWind})),lod1LeafRetainedMatch:{matched,total:lod1Leaf.getAttribute('position').count,maxPositionDelta},hooks,light:{shadowMap:lab.renderer.shadowMap.enabled,lights:lab.scene.children.filter(o=>o.isLight).map(light=>({type:light.type,castShadow:light.castShadow}))},renderer:lab.renderer.getContext().getParameter(lab.renderer.getContext().RENDERER),unmaskedRenderer:(()=>{const gl=lab.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?{vendor:gl.getParameter(ext.UNMASKED_VENDOR_WEBGL),renderer:gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)}:null})()};
  });
  assert.equal(loaded.diagnostics.ready,true);assert.equal(loaded.diagnostics.sharedMaterials,true);
  assert.equal(loaded.textureCount,4);assert.equal(loaded.diagnostics.materials,2);
  assert.deepEqual(loaded.materialReferenceEquality,[true,true]);assert.deepEqual(loaded.textureReferenceEquality,[true,true]);
  assert.deepEqual(loaded.lodMeshCounts,[2,2]);assert.ok(loaded.light.lights.some(light=>light.type==='DirectionalLight'&&light.castShadow));
  assert.equal(loaded.light.shadowMap,true);
  for(const lodAttributes of loaded.geometryAttributes)for(const attributes of lodAttributes)for(const name of ['_wind','_branch_level','_leaf_center','_leaf_pivot','position','normal','tangent','uv'])assert.ok(attributes.includes(name),`loaded geometry retains ${name}`);
  assert.ok(loaded.hooks.every(hook=>hook.deformsVertex&&hook.programKey==='atlas-tree-physical-1'));
  assert.match(loaded.unmaskedRenderer?.renderer??'',/NVIDIA/i,'hardware browser must report NVIDIA renderer');
  assert.equal(loaded.diagnostics.textures,4);assert.equal(loaded.diagnostics.materials,2);assert.equal(loaded.diagnostics.sharedMaterials,true);
  assert.deepEqual(loaded.lodGeometry.map(level=>level.metrics.reduce((sum,mesh)=>sum+mesh.triangles,0)),familyManifest.levels.map(level=>level.triangles),'actual loaded GLB index counts match family manifest');
  assert.ok(loaded.lodGeometry.every(level=>level.leafWind.finite&&level.leafWind.max>0));
  assert.equal(loaded.lod1LeafRetainedMatch.matched,loaded.lod1LeafRetainedMatch.total,'every LOD1 foliage vertex retains an exact LOD0 pivot/UV/wind/position record');
  assert.ok(loaded.lod1LeafRetainedMatch.maxPositionDelta<1e-5);
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

  // Capture deterministic canvas-only wind replay at the center 16 m specimen.
  await page.evaluate(()=>{
    const lab=window.__treeAssetLab;lab.setLOD(0);lab.setPopulation(3);
    lab.camera.position.set(13,13,30);lab.camera.lookAt(0,8,0);lab.camera.updateProjectionMatrix();
    lab.renderer.shadowMap.enabled=false;
  });
  await waitFrames(8);
  const canvas=page.locator('#viewport canvas');
  const dateShots={};
  for(const [label,value] of [['date0-a','0'],['date1750000000','1750000000'],['date0-b','0'],['date7000000000','7000000000']]){
    await page.evaluate(text=>window.__treeAssetLab.setDate(BigInt(text)),value);await waitFrames(8);
    const path=await canvasShot(`${label}.png`);dateShots[label]=path;report.screenshots.push(path);
  }
  const rgba=async path=>sharp(path).removeAlpha().raw().toBuffer();
  const [windA,windMove,windB,windPeriod]=await Promise.all(Object.values(dateShots).map(rgba));
  const changedPixels=(a,b)=>{let n=0;for(let i=0;i<a.length;i+=3)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])n++;return n;};
  const windReplay={changedAt1750000000:changedPixels(windA,windMove),resetChanged:changedPixels(windA,windB),periodChanged:changedPixels(windA,windPeriod),shots:dateShots};
  report.windPixelReplay=windReplay;
  assert.ok(windReplay.changedAt1750000000>0,'wind phase changes rendered pixels');
  await page.evaluate(()=>window.__treeAssetLab.renderer.shadowMap.enabled=true);
  await waitFrames(8);

  const details=await page.evaluate(()=>{
    const lab=window.__treeAssetLab;
    const batches=lab.batches.map(batch=>({capacity:batch.meshes[0].count,meshes:batch.meshes.map(mesh=>({castShadow:mesh.castShadow,receiveShadow:mesh.receiveShadow,depthHook:typeof mesh.customDepthMaterial?.onBeforeCompile==='function',distanceHook:typeof mesh.customDistanceMaterial?.onBeforeCompile==='function',depthKey:mesh.customDepthMaterial?.customProgramCacheKey?.(),distanceKey:mesh.customDistanceMaterial?.customProgramCacheKey?.(),windAttribute:mesh.geometry.getAttribute('_wind')?.count,pivotAttribute:mesh.geometry.getAttribute('_leaf_pivot')?.count,levelAttribute:mesh.geometry.getAttribute('_branch_level')?.count,instance:mesh.geometry.getAttribute('instanceTree')?.array.slice(0,6)}))}));
    return {batches,profile:lab.profile.diagnostics()};
  });
  for(const batch of details.batches){assert.equal(batch.meshes.length,2);for(const mesh of batch.meshes){assert.equal(mesh.castShadow,true);assert.equal(mesh.receiveShadow,true);assert.equal(mesh.depthHook,true);assert.equal(mesh.distanceHook,true);assert.equal(mesh.depthKey,'atlas-tree-physical-1');assert.equal(mesh.distanceKey,'atlas-tree-physical-1');assert.ok(mesh.windAttribute>0&&mesh.pivotAttribute>0&&mesh.levelAttribute>0);}}
  for(const mesh of details.batches[0].meshes){const data=mesh.instance;assert.ok(Math.abs(data[0]-10/16)<1e-7);assert.equal(data[1],0);assert.ok(Math.abs(data[2]-1)<1e-7);assert.ok(Math.abs(data[3]-.7)<1e-7);assert.ok(Math.abs(data[4]-22/16)<1e-7);assert.ok(Math.abs(data[5]-1.4)<1e-7);}
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

  // Same close center-tree view, shadow maps disabled, compare front and back light.
  const lighting=await page.evaluate(()=>{
    const lab=window.__treeAssetLab,sun=lab.scene.children.find(o=>o.isDirectionalLight);
    lab.renderer.shadowMap.enabled=false;sun.castShadow=false;
    for(const batch of lab.batches)for(const mesh of batch.meshes){mesh.castShadow=false;mesh.receiveShadow=false;}
    lab.setLOD(0);lab.setPopulation(3);lab.setDate(0n);
    lab.camera.position.set(13,13,30);lab.camera.lookAt(0,8,0);lab.camera.updateProjectionMatrix();
    return {shadowMap:lab.renderer.shadowMap.enabled,sun:sun.intensity,hemi:lab.scene.children.find(o=>o.isHemisphereLight)?.intensity};
  });
  report.closeLighting={configuration:lighting,shots:[]};
  for(const lodValue of [0,1])for(const [direction,position] of [['front',[40,30,70]],['back',[-40,30,-70]]]){
    await page.evaluate(([lod,pos])=>{const lab=window.__treeAssetLab;lab.setLOD(lod);lab.scene.children.find(o=>o.isDirectionalLight).position.set(...pos);},[lodValue,position]);
    await waitFrames(8);const name=`close-lod${lodValue}-${direction}-shadows-off.png`,path=await canvasShot(name);
    report.closeLighting.shots.push({lod:lodValue,direction,path});report.screenshots.push(path);
  }

  await page.evaluate(()=>{
    const lab=window.__treeAssetLab,sun=lab.scene.children.find(o=>o.isDirectionalLight);
    lab.renderer.shadowMap.enabled=true;sun.castShadow=true;sun.position.set(-30,55,25);
    for(const batch of lab.batches)for(const mesh of batch.meshes){mesh.castShadow=true;mesh.receiveShadow=true;}
    lab.camera.position.set(40,22,64);lab.camera.lookAt(0,9,0);lab.camera.updateProjectionMatrix();
    lab.setLOD(0);lab.setPopulation(3);lab.setDate(0n);
  });
  await waitFrames(12);

  for(const lodValue of [0,1])for(const population of [3,64,192]){
    await page.evaluate(([lod,count])=>{const lab=window.__treeAssetLab;lab.setLOD(lod);lab.setPopulation(count);},[lodValue,population]);
    await waitFrames(120);
    if(population===3||population===192){const image=`lod${lodValue}-population${population}.png`;await shot(image);report.screenshots.push(join(out,image));}
    await page.evaluate(()=>window.__treeAssetLab.profile.clear());
    await waitFrames(120);
    await waitFrames(60);
    const profile=await page.evaluate(()=>{
      const lab=window.__treeAssetLab,d=lab.diagnostics();
      return {diagnostics:d,profile:d.profile,renderer:d.renderer,batchCounts:lab.batches.map(batch=>batch.meshes.map(mesh=>mesh.count)),instanceTree:lab.batches.map(batch=>Array.from(batch.meshes[0].geometry.getAttribute('instanceTree').array.slice(0,d.population*2)))};
    });
    assert.equal(profile.diagnostics.population,population);assert.ok(profile.batchCounts.flat().every(count=>count===population));
    assert.ok(profile.renderer.triangles>0);assert.equal(profile.diagnostics.sharedMaterials,true);
    assert.equal(profile.profile.enabled,true);
    report.profiles.push({lod:lodValue,population,renderer:profile.renderer,profile:profile.profile,instanceScaleAndPhaseRange:{count:population,minScale:Math.min(...profile.instanceTree.flatMap(values=>values.filter((_,i)=>i%2===0))),maxScale:Math.max(...profile.instanceTree.flatMap(values=>values.filter((_,i)=>i%2===0))),finite:profile.instanceTree.every(values=>values.every(Number.isFinite))}});
  }
  await page.evaluate(()=>window.__treeAssetLab.setLOD(0));await waitFrames(120);
  assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);
  report.errors=errors;report.failedRequests=failedRequests;
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
}catch(error){
  report.errors=errors;report.failedRequests=failedRequests;report.failure=String(error);
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  throw error;
}finally{await browser.close();}
