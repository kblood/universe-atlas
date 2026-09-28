import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {browserArgs} from '../../tests/browser-options.mjs';
import {createRequire} from 'node:module';

const root=resolve('C:/LLM/IWSDK'),candidate=join(root,'Assets/_assetctl/atlas-ez-family-f');
const inputs=[join(candidate,'atlas-ez-oak.glb'),join(candidate,'atlas-ez-oak.lod1.glb')];
const out=resolve('test-results/tree-foliage-temporal/isolated-final');
const sharp=createRequire(join(root,'tools/assetctl/package.json'))('sharp');
const hash=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
const browser=await chromium.launch({headless:true,args:browserArgs});await mkdir(out,{recursive:true});
const report={inputs:[],sourceHashes:{},browserVersion:browser.version(),url:'http://127.0.0.1:5197/tree-asset-lab.html',modes:{},limitations:['512/1024 samples are high-resolution references, not converged ground truth.','Alpha coverage is measured from transparent render-target output; no background color threshold is used.','Only one controlled 16 m instance is rendered, without ground or shadows. This does not measure whole-scene or shadow performance.','TAA is not enabled.']};
for(const path of inputs)report.inputs.push({path,sha256:await hash(path)});
for(const path of ['tree-asset-lab.html','src/tree-asset-lab.ts','src/tree-asset.ts'])report.sourceHashes[path]=await hash(join(root,'universe-atlas-rendering',path));

const page=await browser.newPage({viewport:{width:1200,height:900},deviceScaleFactor:1});const errors=[],failedRequests=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error'&&!message.text().startsWith('[vite] failed to connect to websocket.'))errors.push(message.text());});
page.on('requestfailed',request=>failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`));
await page.goto(report.url,{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__treeAssetLab);
await page.locator('#lod0-file').setInputFiles(inputs[0]);await page.locator('#lod1-file').setInputFiles(inputs[1]);
let activeMode='mask';

// The failed probe omitted yaw/LOD defaults (NaN camera, both groups hidden),
// and called setPopulation after hiding side instances. This harness defaults
// the camera/LOD, creates one real identity-transform 16 m tree, then fixes its
// instance count to one. A 128px alpha smoke must pass before smaller probes.
const loadMode=async mode=>{
  return page.evaluate(async mode=>{
    const l=window.__treeAssetLab,THREE=await import('/node_modules/three/build/three.module.js');
    const files=[...document.querySelectorAll('input[type=file]')].map(input=>input.files?.[0]);
    if(files.length!==2||files.some(file=>!file))throw new Error('Both F GLBs must be selected before load');
    await l.load(await Promise.all(files.map(file=>file.arrayBuffer())),{foliageCoverage:mode});
    l.renderer.setAnimationLoop(null);
    const loaded=l.diagnostics();
    if(!loaded.ready||loaded.loading||loaded.foliageCoverage!==mode)throw new Error(`Load did not commit requested ${mode} mode`);
    const foliage=loaded.coverageMaterials.color.find(material=>material.name==='MAT_AtlasFoliage');
    if(!foliage||foliage.alphaHash!==(mode==='hash')||foliage.alphaTest!==(mode==='hash'?0:.5))throw new Error(`Color foliage material did not load requested ${mode} settings`);
    for(const level of loaded.coverageMaterials.shadows){
      const f=level.find(material=>material.depth.alphaTest===.5||material.depth.alphaHash||material.distance.alphaTest===.5||material.distance.alphaHash);
      if(!f||f.depth.alphaHash!==(mode==='hash')||f.distance.alphaHash!==(mode==='hash')||f.depth.alphaTest!==(mode==='hash'?0:.5)||f.distance.alphaTest!==(mode==='hash'?0:.5))throw new Error(`Shadow foliage material did not load requested ${mode} settings`);
    }
    l.controls.enabled=false;l.ground.visible=false;l.grid.visible=false;l.sun.castShadow=false;l.renderer.shadowMap.enabled=false;
    l.scene.background=null;l.renderer.setClearColor(0x000000,0);
    l.setDate(0n);l.setPopulation(3);l.camera.fov=50;l.camera.aspect=1;l.camera.far=400;l.camera.updateProjectionMatrix();
    for(const [lod,batch] of l.batches.entries()){
      batch.group.visible=lod===0;
      const identity=new THREE.Matrix4();
      for(const mesh of batch.meshes){mesh.castShadow=false;mesh.receiveShadow=false;}
      batch.setInstance(0,identity,16,0);
      batch.setCount(1);
    }
    const gl=l.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
    return {mode,diagnostics:loaded,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),sourceGeometry:l.family.lods.map(level=>level.map(mesh=>({name:mesh.material.name,vertices:mesh.geometry.getAttribute('position').count,triangles:mesh.geometry.index.count/3,instanceTree:mesh.geometry.getAttribute('instanceTree')?.count??null}))),batches:l.batches.map(batch=>batch.meshes.map(mesh=>({name:mesh.material.name,count:mesh.count,instanceTree:mesh.geometry.getAttribute('instanceTree')?.count??null}))),coverageMaterials:loaded.coverageMaterials};
  },mode);
};

const capture=async({size,lod=0,date=0n,yaw=0,distance=20,filename})=>{
  const result=await page.evaluate(async cfg=>{
    const l=window.__treeAssetLab,size=cfg.size,THREE=await import('/node_modules/three/build/three.module.js');
    const d=l.diagnostics(),color=d.coverageMaterials?.color?.find(material=>material.name==='MAT_AtlasFoliage');
    if(d.foliageCoverage!==cfg.mode||!color||color.alphaHash!==(cfg.mode==='hash')||color.alphaTest!==(cfg.mode==='hash'?0:.5))throw new Error(`Capture mode mismatch: expected ${cfg.mode}, got ${d.foliageCoverage}`);
    for(const level of d.coverageMaterials.shadows){const foliage=level[1];if(!foliage||foliage.depth.alphaHash!==(cfg.mode==='hash')||foliage.distance.alphaHash!==(cfg.mode==='hash')||foliage.depth.alphaTest!==(cfg.mode==='hash'?0:.5)||foliage.distance.alphaTest!==(cfg.mode==='hash'?0:.5))throw new Error(`Capture shadow-material mode mismatch for ${cfg.mode}`);}
    l.setLOD(cfg.lod);l.setDate(BigInt(cfg.date));
    l.camera.aspect=1;l.camera.position.set(Math.sin(cfg.yaw)*cfg.distance,8,Math.cos(cfg.yaw)*cfg.distance);l.camera.lookAt(0,8,0);l.camera.updateProjectionMatrix();
    for(const batch of l.batches)batch.group.visible=batch===l.batches[cfg.lod];
    const target=new THREE.WebGLRenderTarget(size,size,{format:THREE.RGBAFormat,type:THREE.UnsignedByteType,depthBuffer:true,stencilBuffer:false});
    const rgba=new Uint8Array(size*size*4),imageCanvas=document.createElement('canvas');imageCanvas.width=size;imageCanvas.height=size;
    const ctx=imageCanvas.getContext('2d'),image=ctx.createImageData(size,size);
    l.renderer.setRenderTarget(target);l.renderer.clear();l.renderer.render(l.scene,l.camera);l.renderer.readRenderTargetPixels(target,0,0,size,size,rgba);const glError=l.renderer.getContext().getError();l.renderer.setRenderTarget(null);target.dispose();
    if(glError!==l.renderer.getContext().NO_ERROR)throw new Error(`WebGL error 0x${glError.toString(16)} during ${cfg.mode} LOD${cfg.lod} ${size}px capture`);
    for(let i=0;i<rgba.length;i+=4){const a=rgba[i+3];image.data[i]=255;image.data[i+1]=255;image.data[i+2]=255;image.data[i+3]=a;}
    ctx.putImageData(image,0,0);
    return {png:imageCanvas.toDataURL('image/png').split(',')[1],size,lod:cfg.lod,date:String(cfg.date),yaw:cfg.yaw,distance:cfg.distance,mode:d.foliageCoverage,glError:0};
  },{size,lod,date:String(date),yaw,distance,mode:activeMode});
  const png=Buffer.from(result.png,'base64');
  if(filename)await writeFile(filename,png);
  return { ...result, png:result.png };
};

const alphaMap=async(capture,size=capture.size)=>{
  const raw=await sharp(Buffer.from(capture.png,'base64')).ensureAlpha().raw().toBuffer();
  if(size===capture.size)return Float32Array.from({length:size*size},(_,i)=>raw[i*4+3]/255);
  if(capture.size%size!==0)throw new Error(`Noninteger alpha box filter ${capture.size}->${size}`);
  const scale=capture.size/size,den=scale*scale,result=new Float32Array(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    let sum=0;for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++)sum+=raw[((y*scale+dy)*capture.size+x*scale+dx)*4+3];
    result[y*size+x]=sum/(255*den);
  }
  return result;
};
const coverageStats=map=>{let area=0,hard=0;for(const a of map){area+=a;if(a>=.5)hard++;}return {coverageEquivalentPixels:area,hardPixelsAtHalfAlpha:hard,meanAlpha:area/map.length};};
const compareCoverage=(a,b)=>{assert.equal(a.length,b.length);let abs=0,changed=0,intersection=0,union=0;for(let i=0;i<a.length;i++){abs+=Math.abs(a[i]-b[i]);const x=a[i]>=.5,y=b[i]>=.5;if(x!==y)changed++;if(x||y)union++;if(x&&y)intersection++;}return {meanAbsoluteCoverageDelta:abs/a.length,thresholdChangedPixels:changed,iou:union?intersection/union:1};};
for(const mode of ['mask','hash']){
  const modeDir=join(out,mode);await mkdir(modeDir,{recursive:true});
  const setup=await loadMode(mode);
  activeMode=mode;
  assert.match(setup.renderer,/RTX 5090|GeForce RTX 5090/i,'must use RTX5090 hardware');
  assert.ok(setup.batches.every(level=>level.length===2&&level.every(mesh=>mesh.count===1&&mesh.instanceTree>=1)),'both material batches use one initialized instance');
  const modeResult={setup,lods:{}};
  for(const lod of [0,1]){
    const lodDir=join(modeDir,`lod${lod}`);await mkdir(lodDir,{recursive:true});
    const smokeCap=await capture({size:128,lod,date:0n,distance:20,filename:join(lodDir,'smoke-128-date0.png')});
    const smoke=coverageStats(await alphaMap(smokeCap));
    const smokeRecord={size:128,lod,distanceM:20,...smoke};
    await writeFile(join(lodDir,'smoke.json'),JSON.stringify(smokeRecord,null,2)+'\n');
    assert.ok(smoke.coverageEquivalentPixels>0,`${mode} LOD${lod}: required 128px specimen smoke is transparent`);

    const footprints=[];
    for(const q of [16,32,64]){
      const high=q===64?1024:512;
      const highCap=await capture({size:high,lod,date:0n,distance:20});
      const nativeCap=await capture({size:q,lod,date:0n,distance:20});
      const reference=await alphaMap(highCap,q),native=await alphaMap(nativeCap);
      footprints.push({outputPixels:q,referencePixels:high,distanceM:20,native:coverageStats(native),highResolutionDownsampled:coverageStats(reference),nativeVsHighResolution:compareCoverage(native,reference)});
    }

    const temporal=[];
    for(const q of [16,32]){
      const high=q===16?512:1024;
      const captures={};
      for(const date of ['0','1750000000','7000000000','-7000000000']){
        const hi=await capture({size:high,lod,date:BigInt(date),distance:20});
        const lo=await capture({size:q,lod,date:BigInt(date),distance:20});
        captures[date]={high:await alphaMap(hi,q),native:await alphaMap(lo)};
      }
      for(const date of ['1750000000','7000000000','-7000000000'])temporal.push({outputPixels:q,date,highReferencePixels:high,nativeVsDate0:compareCoverage(captures['0'].native,captures[date].native),highDownsampledVsDate0:compareCoverage(captures['0'].high,captures[date].high),nativeCoverage:coverageStats(captures[date].native),highDownsampledCoverage:coverageStats(captures[date].high)});
    }

    const yaw=[];
    for(const degrees of [0,.5,1]){
      const q=32,high=512,yawRadians=degrees*Math.PI/180;
      const hi=await capture({size:high,lod,date:0n,yaw:yawRadians,distance:20});
      const lo=await capture({size:q,lod,date:0n,yaw:yawRadians,distance:20});
      yaw.push({degrees,outputPixels:q,referencePixels:high,native:await alphaMap(lo),highDownsampled:await alphaMap(hi,q)});
    }
    const yawMetrics=[];for(let i=1;i<yaw.length;i++)yawMetrics.push({fromDegrees:yaw[i-1].degrees,toDegrees:yaw[i].degrees,native:compareCoverage(yaw[i-1].native,yaw[i].native),highDownsampled:compareCoverage(yaw[i-1].highDownsampled,yaw[i].highDownsampled)});

    modeResult.lods[lod]={nonzero128Smoke:smokeRecord,footprints,temporal,yawSteps:yawMetrics};
  }
  report.modes[mode]=modeResult;
  await writeFile(join(modeDir,'report.json'),JSON.stringify(modeResult,null,2)+'\n');
}

report.errors=errors;report.failedRequests=failedRequests;
assert.deepEqual(errors,[]);
assert.deepEqual(failedRequests,[]);
await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
await page.close();await browser.close();
