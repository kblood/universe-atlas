import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {browserArgs} from '../../../tests/browser-options.mjs';

const candidate=resolve('C:/LLM/IWSDK/Assets/_assetctl/atlas-ez-family-f');
const nearPath=join(candidate,'atlas-ez-oak.glb'),midPath=join(candidate,'atlas-ez-oak.lod1.glb');
const base=process.env.ATLAS_URL??'http://127.0.0.1:5197/';
const out=resolve('test-results/three-ez-impostor-reference/native-map-fix');
await mkdir(join(out,'masks'),{recursive:true});
const hash=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
const inputHashes={near:await hash(nearPath),mid:await hash(midPath)};
const sourceFiles=['tree-impostor-reference-lab.html','src/tree-impostor-reference-lab.ts','src/tree-impostor-reference-shader.ts','src/tree-asset.ts','src/render-profile.ts','src/vendor/three-ez-impostor/impostor-reference.js','src/vendor/three-ez-impostor/reference-manifest.json'];
const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async path=>[path,await hash(resolve(path))])));
const pinned=JSON.parse(await readFile(resolve('src/vendor/three-ez-impostor/reference-manifest.json'),'utf8'));
const pinnedBundleHash=pinned.artifacts.find(a=>a.path==='impostor-reference.js').sha256;
const browser=await chromium.launch({headless:true,args:browserArgs});
const errors={page:[],console:[],requests:[]};
const waitFrames=(page,n)=>page.evaluate(count=>new Promise(resolve=>{let done=0;const tick=()=>{if(++done>=count)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);}),n);
const makePage=async mapIncludeFix=>{
  const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.page.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('[vite] failed to connect to websocket.'))errors.console.push(m.text());});
  page.on('requestfailed',r=>errors.requests.push(`${r.url()}: ${r.failure()?.errorText}`));
  if(typeof page.routeWebSocket==='function')await page.routeWebSocket('**/*',s=>s.close());
  await page.goto(new URL('tree-impostor-reference-lab.html',base).href,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!!window.__impostorReferenceLab,{timeout:30000});
  if(mapIncludeFix)await page.locator('#fix').check();else await page.locator('#fix').uncheck();
  await page.locator('#near').setInputFiles(nearPath);await page.locator('#mid').setInputFiles(midPath);await page.locator('#load').click();
  await page.waitForFunction(()=>window.__impostorReferenceLab?.ready&&!!window.__impostorReferenceLab.metadata?.inputHashes,{timeout:120000});
  await waitFrames(page,10);
  return page;
};
const metrics=(a,b)=>{
  let areaA=0,areaB=0,intersection=0,union=0,softIntersection=0,softUnion=0,weightedA=0,weightedB=0;
  for(let i=3;i<a.length;i+=4){const x=a[i]/255,y=b[i]/255,xa=x>=.5,ya=y>=.5;areaA+=+xa;areaB+=+ya;intersection+=+(xa&&ya);union+=+(xa||ya);softIntersection+=Math.min(x,y);softUnion+=Math.max(x,y);weightedA+=x;weightedB+=y;}
  return {areaAPixels:areaA,areaBPixels:areaB,intersectionPixels:intersection,unionPixels:union,binaryIoU:union?intersection/union:1,
    softIoU:softUnion?softIntersection/softUnion:1,weightedAreaA:weightedA,weightedAreaB:weightedB,weightedAreaRatio:weightedA?weightedB/weightedA:null};
};
const report={candidate,nearPath,midPath,url:base,browserVersion:browser.version(),viewport:{width:1600,height:1000,deviceScaleFactor:1},hardwareEnabled:!!process.env.ATLAS_HARDWARE,inputHashes,sourceHashes,pinnedBundleHash,baselineNative:{},fixed:{},pageErrors:errors.page,consoleErrors:errors.console,failedRequests:errors.requests,
  limitations:['Pinned Three.ez hemisphere reference; views below the capture centre are unsupported diagnostics.','Static source geometry; no Atlas wind or height scaling.','Full mesh, middle mesh, and proxy use distinct material/shader paths.','No ground, shadows, production integration, or headset acceptance.','GPU/CPU timings cover only this isolated reference canvas and are not full-game benchmarks.']};
try{
  // Fresh page: unmodified source color path, native 1x masks only.
  const raw=await makePage(false);
  const rawAudit=await raw.evaluate(()=>{const lab=window.__impostorReferenceLab;lab.probe('impostor',[0,0,1],8,1,true);return lab.metadata;});
  const rawInfo=await raw.evaluate(()=>{const lab=window.__impostorReferenceLab,gl=lab.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {metadata:lab.metadata,unmaskedRenderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null};});
  assert.match(rawInfo.unmaskedRenderer??'',/NVIDIA GeForce RTX 5090/i);assert.equal(rawAudit.mapIncludeFix,false);
  const rawShaderAudit=rawAudit.shaderAudits.at(-1);assert.ok(rawShaderAudit);assert.equal(rawShaderAudit.before.liveMapIncludes,1);assert.equal(rawShaderAudit.before.blendedColorApplied,0);assert.equal(rawShaderAudit.after.liveMapIncludes,1);assert.equal(rawShaderAudit.after.blendedColorApplied,0);
  assert.equal(rawAudit.bundleSha256,pinnedBundleHash);assert.deepEqual(rawAudit.inputHashes,inputHashes);
  const nativeDirections=[
    {tag:'az0-el0',d:[0,0,1]},{tag:'az45-el0',d:[Math.SQRT1_2,0,Math.SQRT1_2]},
    {tag:'az90-el15',d:[Math.cos(Math.PI/12),Math.sin(Math.PI/12),0]},
    {tag:'az45-el45',d:[.5,Math.SQRT1_2,.5]},{tag:'az0-el85',d:[0,Math.sin(85*Math.PI/180),Math.cos(85*Math.PI/180)]},
    {tag:'top',d:[0,1,0]},{tag:'az0-el-5',d:[0,-Math.sin(5*Math.PI/180),Math.cos(5*Math.PI/180)]},
    {tag:'az0-el-20',d:[0,-Math.sin(20*Math.PI/180),Math.cos(20*Math.PI/180)]},
  ];
  report.baselineNative={metadata:rawAudit,renderer:rawInfo.unmaskedRenderer,directions:[]};
  for(const view of nativeDirections)for(const pixels of [8,16,32,64,128]){
    const result=await raw.evaluate(({direction,pixels})=>{
      const lab=window.__impostorReferenceLab;
      const meshGround=lab.probe('mesh',direction,pixels,4,true),meshNative=lab.probe('mesh',direction,pixels,1,true),midNative=lab.probe('mid',direction,pixels,1,true),proxyNative=lab.probe('impostor',direction,pixels,1,true);
      return {meshNative:meshNative,midNative:midNative,proxyNative:proxyNative,meshGround:meshGround};
    },{direction:view.d,pixels});
    report.baselineNative.directions.push({tag:view.tag,pixels,meshNativeVs4x:metrics(result.meshGround,result.meshNative),midNativeVs4x:metrics(result.meshGround,result.midNative),proxyNativeVs4x:metrics(result.meshGround,result.proxyNative),proxyVsNativeMesh:metrics(result.meshNative,result.proxyNative)});
  }
  await raw.close();

  // Main repaired page: checkbox is enabled before the one capture is begun.
  const page=await makePage(true);
  const loaded=await page.evaluate(()=>{const lab=window.__impostorReferenceLab,gl=lab.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {metadata:lab.metadata,unmaskedRenderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,userAgent:navigator.userAgent};});
  assert.match(loaded.unmaskedRenderer??'',/NVIDIA GeForce RTX 5090/i);assert.equal(loaded.metadata.mapIncludeFix,true);
  assert.deepEqual(loaded.metadata.inputHashes,inputHashes);assert.equal(loaded.metadata.bundleSha256,pinnedBundleHash);
  assert.equal(loaded.metadata.threeRevision, (await page.evaluate(async()=> (await import(new URL('/node_modules/three/build/three.module.js',location.href))).REVISION)));
  assert.equal(loaded.metadata.sourceTriangles,13806);assert.equal(loaded.metadata.midTriangles,4866);assert.equal(loaded.metadata.proxyTriangles,2);
  const audit=await page.evaluate(()=>{const lab=window.__impostorReferenceLab;lab.probe('impostor',[0,0,1],8,1,true);return lab.metadata.shaderAudits.at(-1);});
  assert.ok(audit);assert.equal(audit.repairMapInclude,true);assert.equal(audit.before.liveMapIncludes,1);assert.equal(audit.before.blendedColorApplied,0);
  assert.equal(audit.after.liveMapIncludes,0);assert.equal(audit.after.blendedColorApplied,1);assert.equal(audit.after.liveProjectIncludes,0);assert.equal(audit.after.liveNormalMapIncludes,0);
  report.fixed={loaded,shaderAudit:audit,mainDirections:[],nativeComparisons:[],distanceFootprints:[],yawSweep:[],screenshots:[],profiles:[]};

  const azimuths=[0,45,90,135,180,225,270,315],angles=[0,15,45,85];
  const views=[];for(const elevation of angles)for(const azimuth of azimuths)views.push({azimuth,elevation,tag:`az${azimuth}-el${elevation}`});
  views.push({azimuth:0,elevation:90,tag:'top'});
  for(const elevation of [-5,-20])for(const azimuth of azimuths)views.push({azimuth,elevation,tag:`az${azimuth}-el${elevation}`,unsupported:true});
  for(const view of views){
    const direction=[Math.cos(view.elevation*Math.PI/180)*Math.sin(view.azimuth*Math.PI/180),Math.sin(view.elevation*Math.PI/180),Math.cos(view.elevation*Math.PI/180)*Math.cos(view.azimuth*Math.PI/180)];
    const saveMask=['az0-el0','az45-el0','az0-el15','az45-el45','az0-el85','top','az0-el-5','az0-el-20'].includes(view.tag);
    const row=await page.evaluate(({direction,saveMask})=>{
      const lab=window.__impostorReferenceLab,mesh=lab.probe('mesh',direction,128,2,true),mid=lab.probe('mid',direction,128,2,true),proxy=lab.probe('impostor',direction,128,2,true);
      const result={midVsMesh:__metrics(mesh,mid),proxyVsMesh:__metrics(mesh,proxy),finite:[...mesh,...mid,...proxy].every(Number.isFinite)};
      if(saveMask){const encode=data=>{const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),image=ctx.createImageData(128,128);for(let i=0;i<data.length;i+=4){const v=data[i+3]>=127.5?255:0;image.data[i]=image.data[i+1]=image.data[i+2]=v;image.data[i+3]=255;}ctx.putImageData(image,0,0);return c.toDataURL('image/png');};result.masks={mesh:encode(mesh),mid:encode(mid),impostor:encode(proxy)};}
      return result;
      function __metrics(a,b){let aa=0,bb=0,ii=0,uu=0,si=0,su=0,wa=0,wb=0;for(let i=3;i<a.length;i+=4){const x=a[i]/255,y=b[i]/255,X=x>=.5,Y=y>=.5;aa+=+X;bb+=+Y;ii+=+(X&&Y);uu+=+(X||Y);si+=Math.min(x,y);su+=Math.max(x,y);wa+=x;wb+=y;}return {areaAPixels:aa,areaBPixels:bb,binaryIoU:uu?ii/uu:1,softIoU:su?si/su:1,weightedAreaA:wa,weightedAreaB:wb,weightedAreaRatio:wa?wb/wa:null};}
    },{direction,saveMask});
    const entry={...view,vector:direction,viewPixels:128,supersample:2,...row};
    delete entry.masks;
    if(view.unsupported)entry.note='Below-centre diagnostic outside supported hemi views; not an acceptance angle.';
    report.fixed.mainDirections.push(entry);assert.ok(row.finite,`non-finite mask values ${view.tag}`);
    if(row.masks)for(const mode of ['mesh','mid','impostor']){const path=join(out,'masks',`${view.tag}-${mode}.png`),data=row.masks[mode];await writeFile(path,Buffer.from(data.slice(data.indexOf(',')+1),'base64'));entry[`${mode}Mask`]=path;report.fixed.screenshots.push(path);}
  }

  const nativeViews=nativeDirections;
  for(const view of nativeViews)for(const pixels of [8,16,32,64,128]){
    const result=await page.evaluate(({direction,pixels})=>{
      const lab=window.__impostorReferenceLab,ground=lab.probe('mesh',direction,pixels,4,true),mesh=lab.probe('mesh',direction,pixels,1,true),mid=lab.probe('mid',direction,pixels,1,true),proxy=lab.probe('impostor',direction,pixels,1,true);
      const metric=(a,b)=>{let aa=0,bb=0,ii=0,uu=0,si=0,su=0,wa=0,wb=0;for(let i=3;i<a.length;i+=4){const x=a[i]/255,y=b[i]/255,X=x>=.5,Y=y>=.5;aa+=+X;bb+=+Y;ii+=+(X&&Y);uu+=+(X||Y);si+=Math.min(x,y);su+=Math.max(x,y);wa+=x;wb+=y;}return {areaAPixels:aa,areaBPixels:bb,binaryIoU:uu?ii/uu:1,softIoU:su?si/su:1,weightedAreaA:wa,weightedAreaB:wb,weightedAreaRatio:wa?wb/wa:null};};
      return {meshNoise:metric(ground,mesh),midVsGround:metric(ground,mid),proxyVsGround:metric(ground,proxy),proxyVsNativeMesh:metric(mesh,proxy)};
    },{direction:view.d,pixels});
    report.fixed.nativeComparisons.push({tag:view.tag,pixels,supersampleReference:4,...result});
  }

  for(const view of [{tag:'front-horizon',d:[0,0,1]},{tag:'front-15deg',d:[0,Math.sin(Math.PI/12),Math.cos(Math.PI/12)]},{tag:'top',d:[0,1,0]}])for(const distanceRadii of [30,300,1000])for(const pixels of [32,64,128]){
    const result=await page.evaluate(({direction,distanceRadii,pixels})=>{
      const lab=window.__impostorReferenceLab,mesh=lab.probe('mesh',direction,pixels,1,true,distanceRadii),proxy=lab.probe('impostor',direction,pixels,1,true,distanceRadii);let a=0,b=0,i=0,u=0,si=0,su=0;
      for(let j=3;j<mesh.length;j+=4){const x=mesh[j]/255,y=proxy[j]/255,X=x>=.5,Y=y>=.5;a+=+X;b+=+Y;i+=+(X&&Y);u+=+(X||Y);si+=Math.min(x,y);su+=Math.max(x,y);}return {meshArea:a,proxyArea:b,binaryIoU:u?i/u:1,softIoU:su?si/su:1,areaRatio:a?b/a:null};
    },{direction:view.d,distanceRadii,pixels});
    report.fixed.distanceFootprints.push({...view,distanceRadii,pixels,...result});
  }

  const yawSweep=[];
  for(const [center,span] of [[45,10],[90,10]])for(let yaw=center-span;yaw<=center+span+1e-6;yaw+=.5){
    const elevation=15,direction=[Math.cos(elevation*Math.PI/180)*Math.sin(yaw*Math.PI/180),Math.sin(elevation*Math.PI/180),Math.cos(elevation*Math.PI/180)*Math.cos(yaw*Math.PI/180)];
    const coverage=await page.evaluate(direction=>{const lab=window.__impostorReferenceLab,area=mode=>{const data=lab.probe(mode,direction,128,1,true);let total=0;for(let i=3;i<data.length;i+=4)total+=data[i]/255;return total;};return {mesh:area('mesh'),impostor:area('impostor')};},direction);
    yawSweep.push({yaw,elevation,direction,...coverage});
  }
  for(let i=1;i<yawSweep.length;i++){yawSweep[i].meshStepChange=Math.abs(yawSweep[i].mesh-yawSweep[i-1].mesh);yawSweep[i].impostorStepChange=Math.abs(yawSweep[i].impostor-yawSweep[i-1].impostor);}
  report.fixed.yawSweep=yawSweep;

  for(const view of [{name:'front',d:[0,0,1],up:[0,1,0]},{name:'back',d:[0,0,-1],up:[0,1,0]},{name:'top',d:[0,1,0],up:[0,0,1]}])for(const mode of ['mesh','mid','impostor']){
    await page.evaluate(({mode,d,up})=>{const lab=window.__impostorReferenceLab,c=lab.metadata.center,r=lab.metadata.radius,v=lab.camera.position.constructor;lab.setMode(mode);lab.camera.up.set(...up);lab.camera.position.copy(new v(...c)).addScaledVector(new v(...d),r*3.5);lab.camera.lookAt(...c);lab.camera.updateProjectionMatrix();}, {mode,d:view.d,up:view.up});
    await waitFrames(page,4);const data=await page.evaluate(()=>{const lab=window.__impostorReferenceLab;lab.renderer.render(lab.scene,lab.camera);return lab.renderer.domElement.toDataURL('image/png');});
    const path=join(out,`${view.name}-${mode}.png`);await writeFile(path,Buffer.from(data.slice(data.indexOf(',')+1),'base64'));report.fixed.screenshots.push(path);
  }

  for(const mode of ['mesh','mid','impostor']){
    await page.evaluate(({mode})=>{const lab=window.__impostorReferenceLab,c=lab.metadata.center,r=lab.metadata.radius,v=lab.camera.position.constructor;lab.setMode(mode);lab.camera.up.set(0,1,0);lab.camera.position.set(c[0],c[1],c[2]+r*3.5);lab.camera.lookAt(...c);lab.camera.updateProjectionMatrix();}, {mode});
    await waitFrames(page,120);await page.evaluate(()=>window.__impostorReferenceLab.profile.clear());await waitFrames(page,180);
    const profile=await page.evaluate(mode=>({mode,diagnostics:window.__impostorReferenceLab.profile.diagnostics()}),mode);
    assert.equal(profile.diagnostics.statistics.frameIntervalMs.samples,180);report.fixed.profiles.push(profile);
  }
  await page.evaluate(()=>window.__impostorReferenceLab.setMode('impostor'));await waitFrames(page,2);
  const final=await page.evaluate(()=>{const lab=window.__impostorReferenceLab,gl=lab.renderer.getContext(),errors=[];for(let i=0;i<16;i++){const e=gl.getError();if(e===gl.NO_ERROR)break;errors.push(e);}return {glErrors:errors,metadata:lab.metadata};});
  assert.deepEqual(final.glErrors,[]);assert.deepEqual(errors.page,[]);assert.deepEqual(errors.console,[]);assert.deepEqual(errors.requests,[]);
  report.glErrors=final.glErrors;report.pageErrors=errors.page;report.consoleErrors=errors.console;report.failedRequests=errors.requests;
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  await page.close();
}catch(error){report.pageErrors=errors.page;report.consoleErrors=errors.console;report.failedRequests=errors.requests;report.failure=String(error);await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');throw error;}
finally{await browser.close();}
