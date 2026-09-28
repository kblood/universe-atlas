import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,stat,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {browserArgs} from './browser-options.mjs';

const candidate=process.env.ATLAS_TREE_CANDIDATE;
if(!candidate)throw new Error('Set ATLAS_TREE_CANDIDATE to the retained v6 output directory.');
const lod0=resolve(process.env.ATLAS_TREE_LOD0??join(candidate,'atlas-branching-v1.glb'));
const lod1=resolve(process.env.ATLAS_TREE_LOD1??join(candidate,'atlas-branching-v1.lod1.glb'));
for(const path of [lod0,lod1])try{await stat(path);}catch{throw new Error(`Requested tree candidate file does not exist: ${path}`);}
const base=process.env.ATLAS_URL??'http://127.0.0.1:5196/';
const out=resolve(process.env.ATLAS_RESULTS??join(candidate,'tree-asset-lighting-v6'));
const width=2560,height=1440;
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:browserArgs}),page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
const errors=[],failedRequests=[];page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('[vite] failed to connect to websocket.'))errors.push(m.text());});
page.on('requestfailed',r=>failedRequests.push(`${r.url()}: ${r.failure()?.errorText}`));
const waitFrames=count=>page.evaluate(n=>new Promise(resolve=>{let done=0;const tick=()=>++done>=n?resolve():requestAnimationFrame(tick);requestAnimationFrame(tick);}),count);
const report={candidate,lod0,lod1,url:base,sourceRevision:process.env.ATLAS_SOURCE_REVISION??null,hardwareEnabled:!!process.env.ATLAS_HARDWARE,viewport:{width,height,deviceScaleFactor:1},date:'0',toneMapping:'ACESFilmicToneMapping',toneMappingExposure:1.2,comparisons:[],alteredMaterialComparisons:[],errors,failedRequests,limitations:['Standalone prototype lighting diagnostic; no gameplay lighting or realism acceptance.','Only one specimen is centered and the other batch instances are moved out of view.']};
try{
  await page.goto(new URL('tree-asset-lab.html',base).href,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!!window.__treeAssetLab,{timeout:30000});
  await page.locator('#lod0-file').setInputFiles(lod0);await page.locator('#lod1-file').setInputFiles(lod1);await page.locator('#load-assets').click();
  await page.waitForFunction(()=>window.__treeAssetLab?.diagnostics().ready&&!window.__treeAssetLab.diagnostics().loading,{timeout:60000});
  await page.evaluate(()=>{
    const lab=window.__treeAssetLab;lab.setDate(0n);lab.setLOD(0);lab.setPopulation(3);
    document.querySelector('#animate').checked=false;document.querySelector('aside').style.display='none';
    const grid=lab.scene.children.find(o=>o.isGridHelper);if(grid)grid.visible=false;
    const M=lab.family.lods[0][0].matrix.constructor;
    for(const batch of lab.batches){batch.setInstance(0,new M().makeRotationY(0).setPosition(-300,0,0),10,0);batch.setInstance(1,new M().makeRotationY(0).setPosition(0,0,0),16,0);batch.setInstance(2,new M().makeRotationY(0).setPosition(300,0,0),22,0);}
    lab.camera.position.set(0,9,27);lab.camera.lookAt(0,9,0);lab.camera.updateProjectionMatrix();lab.camera.updateMatrixWorld(true);
    const sun=lab.scene.children.find(o=>o.isDirectionalLight);if(!sun)throw new Error('Lab directional light is missing');
  });
  const materialInfo=await page.evaluate(()=>{
    const lab=window.__treeAssetLab,renderer=lab.renderer;
    const foliage=lab.family.lods[0].find(m=>m.material.name==='MAT_AtlasFoliage'),texture=foliage.material.map,image=texture.image,canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);const pixels=context.getImageData(0,0,image.width,image.height).data;
    const accum={opaque:[0,0,0,0],transparent:[0,0,0,0],opaqueCount:0,transparentCount:0};
    for(let i=0;i<pixels.length;i+=4){const target=pixels[i+3]>0?'opaque':'transparent';accum[target][0]+=pixels[i];accum[target][1]+=pixels[i+1];accum[target][2]+=pixels[i+2];accum[target][3]+=pixels[i+3];accum[`${target}Count`]++;}
    const mean=(name)=>accum[name].map(v=>accum[`${name}Count`]?v/accum[`${name}Count`]:null);
    return {materials:lab.family.lods[0].map(m=>({name:m.material.name,color:m.material.color.toArray(),roughness:m.material.roughness,metalness:m.material.metalness,alphaMode:m.material.transparent?'BLEND':m.material.alphaTest>0?'MASK':'OPAQUE',alphaTest:m.material.alphaTest,side:m.material.side,map:!!m.material.map,mapColorSpace:m.material.map?.colorSpace??null,normalMap:!!m.material.normalMap,normalMapColorSpace:m.material.normalMap?.colorSpace??null,normalScale:m.material.normalScale?.toArray(),aoMap:!!m.material.aoMap,emissive:m.material.emissive.toArray(),emissiveIntensity:m.material.emissiveIntensity})),foliageBaseColorPixels:{width:image.width,height:image.height,opaqueCount:accum.opaqueCount,opaqueRGBAmean:mean('opaque'),transparentCount:accum.transparentCount,transparentRGBAMean:mean('transparent')},textures:[...lab.family.textures].map(t=>({name:t.name,width:t.image?.width,height:t.image?.height,colorSpace:t.colorSpace,format:t.format,minFilter:t.minFilter,magFilter:t.magFilter,generateMipmaps:t.generateMipmaps})),sun:{color:lab.scene.children.find(o=>o.isDirectionalLight).color.toArray(),intensity:lab.scene.children.find(o=>o.isDirectionalLight).intensity,shadowMapSize:lab.scene.children.find(o=>o.isDirectionalLight).shadow.mapSize.toArray(),bias:lab.scene.children.find(o=>o.isDirectionalLight).shadow.bias,normalBias:lab.scene.children.find(o=>o.isDirectionalLight).shadow.normalBias},renderer:{toneMapping:renderer.toneMapping,toneMappingExposure:renderer.toneMappingExposure,shadowMapType:renderer.shadowMap.type},hemi:lab.scene.children.filter(o=>o.isHemisphereLight).map(o=>({color:o.color.toArray(),groundColor:o.groundColor.toArray(),intensity:o.intensity}))};
  });
  report.materialsAndLighting=materialInfo;
  const directions=[['front',[0,25,30]],['back',[0,25,-30]]];
  for(const [direction,position] of directions)for(const shadows of [true,false]){
    await page.evaluate(({position,shadows})=>{
      const lab=window.__treeAssetLab,sun=lab.scene.children.find(o=>o.isDirectionalLight);
      sun.position.set(...position);sun.castShadow=shadows;lab.renderer.shadowMap.enabled=shadows;
      lab.renderer.toneMappingExposure=1.2;lab.setDate(0n);lab.setLOD(0);
    },{position,shadows});
    await waitFrames(30);
    const name=`center-16m-${direction}-shadows-${shadows?'on':'off'}.png`;await page.screenshot({path:join(out,name),fullPage:false});
    const state=await page.evaluate(()=>{const lab=window.__treeAssetLab,sun=lab.scene.children.find(o=>o.isDirectionalLight);return {date:lab.diagnostics().date,lod:lab.diagnostics().lod,population:lab.diagnostics().population,lightPosition:sun.position.toArray(),lightCastShadow:sun.castShadow,shadowMapEnabled:lab.renderer.shadowMap.enabled,exposure:lab.renderer.toneMappingExposure,render:{calls:lab.renderer.info.render.calls,triangles:lab.renderer.info.render.triangles},materialValues:lab.family.lods[0].map(m=>({name:m.material.name,color:m.material.color.toArray(),roughness:m.material.roughness,metalness:m.material.metalness,alphaTest:m.material.alphaTest,normalMap:!!m.material.normalMap}))};});
    assert.equal(state.date,'0');assert.equal(state.lod,0);assert.equal(state.population,3);assert.equal(state.lightCastShadow,shadows);assert.equal(state.shadowMapEnabled,shadows);assert.equal(state.exposure,1.2);
    report.comparisons.push({direction,shadows,screenshot:name,state});
  }
  const alteredMaterialComparisons=await page.evaluate(async()=>{
    const lab=window.__treeAssetLab,sun=lab.scene.children.find(o=>o.isDirectionalLight),foliage=lab.family.lods[0].find(m=>m.material.name==='MAT_AtlasFoliage').material,original={map:foliage.map,normalMap:foliage.normalMap,alphaTest:foliage.alphaTest,color:foliage.color.clone(),colorSpace:window.__treeAssetLab.renderer.outputColorSpace};
    sun.position.set(0,25,30);sun.castShadow=false;lab.renderer.shadowMap.enabled=false;lab.renderer.toneMappingExposure=1.2;lab.setDate(0n);foliage.normalMap=null;foliage.needsUpdate=true;
    return {original:{map:!!original.map,normalMap:!!original.normalMap,alphaTest:original.alphaTest},colorSpace:original.colorSpace};
  });
  await waitFrames(30);await page.screenshot({path:join(out,'center-16m-front-shadows-off-normalmap-off.png'),fullPage:false});
  const normalMapOffState=await page.evaluate(()=>{const lab=window.__treeAssetLab,m=lab.family.lods[0].find(x=>x.material.name==='MAT_AtlasFoliage').material;return {normalMapEnabled:!!m.normalMap,baseColorMapEnabled:!!m.map,exposure:lab.renderer.toneMappingExposure,shadows:lab.renderer.shadowMap.enabled};});
  report.alteredMaterialComparisons.push({...normalMapOffState,screenshot:'center-16m-front-shadows-off-normalmap-off.png'});
  await page.evaluate(async()=>{const lab=window.__treeAssetLab,m=lab.family.lods[0].find(x=>x.material.name==='MAT_AtlasFoliage').material,THREE=await import(new URL('/node_modules/three/build/three.module.js',location.href).href);m.map=null;m.normalMap=null;m.alphaTest=0;m.color.setRGB(.5,.5,.5,THREE.SRGBColorSpace);m.needsUpdate=true;});
  await waitFrames(30);await page.screenshot({path:join(out,'center-16m-front-shadows-off-neutral-half-srgb.png'),fullPage:false});
  const neutralState=await page.evaluate(()=>{const lab=window.__treeAssetLab,m=lab.family.lods[0].find(x=>x.material.name==='MAT_AtlasFoliage').material;return {normalMapEnabled:!!m.normalMap,baseColorMapEnabled:!!m.map,alphaTest:m.alphaTest,color:m.color.toArray(),exposure:lab.renderer.toneMappingExposure,shadows:lab.renderer.shadowMap.enabled};});
  report.alteredMaterialComparisons.push({...neutralState,screenshot:'center-16m-front-shadows-off-neutral-half-srgb.png',limitation:'Without the base-color map, alpha cutout is removed and card quads are fully visible; this is a neutral illumination diagnostic, not a candidate material/render.'});
  await page.evaluate(async()=>{const lab=window.__treeAssetLab,m=lab.family.lods[0].find(x=>x.material.name==='MAT_AtlasFoliage').material,THREE=await import(new URL('/node_modules/three/build/three.module.js',location.href).href);m.map=[...lab.family.textures].find(t=>t.name==='MAT_AtlasFoliage_BaseColor');m.normalMap=[...lab.family.textures].find(t=>t.name==='MAT_AtlasFoliage_Normal');m.color.setRGB(1,1,1,THREE.SRGBColorSpace);m.alphaTest=.5;m.needsUpdate=true;});
  await waitFrames(8);
  report.materialMutationSetup=alteredMaterialComparisons;
  assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);report.errors=errors;report.failedRequests=failedRequests;
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
}catch(error){report.errors=errors;report.failedRequests=failedRequests;report.failure=String(error);await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');throw error;}
finally{await browser.close();}
