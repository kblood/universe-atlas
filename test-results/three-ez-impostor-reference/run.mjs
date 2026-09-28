import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {browserArgs} from '../../tests/browser-options.mjs';

const candidate=resolve('C:/LLM/IWSDK/Assets/_assetctl/atlas-ez-family-f');
const nearPath=join(candidate,'atlas-ez-oak.glb'),midPath=join(candidate,'atlas-ez-oak.lod1.glb');
const base=process.env.ATLAS_URL??'http://127.0.0.1:5197/';
const out=resolve('test-results/three-ez-impostor-reference');
await mkdir(join(out,'masks'),{recursive:true});
const sha=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
const inputHashes={near:await sha(nearPath),mid:await sha(midPath)};
const sourceFiles=['tree-impostor-reference-lab.html','src/tree-impostor-reference-lab.ts','src/tree-asset.ts','src/render-profile.ts','src/vendor/three-ez-impostor/impostor-reference.js'];
const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async path=>[path,await sha(resolve(path))])));
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
const pageErrors=[],consoleErrors=[],failedRequests=[];
page.on('pageerror',e=>pageErrors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('[vite] failed to connect to websocket.'))consoleErrors.push(m.text());});
page.on('requestfailed',r=>failedRequests.push(`${r.url()}: ${r.failure()?.errorText}`));
const waitFrames=n=>page.evaluate(count=>new Promise(resolve=>{let done=0;const tick=()=>{if(++done>=count)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);}),n);
const canvasPng=async name=>{
  const url=await page.evaluate(()=>{const lab=window.__impostorReferenceLab;lab.renderer.render(lab.scene,lab.camera);return lab.renderer.domElement.toDataURL('image/png');});
  const path=join(out,name);await writeFile(path,Buffer.from(url.slice(url.indexOf(',')+1),'base64'));return path;
};
const report={candidate,nearPath,midPath,url:base,browserVersion:browser.version(),viewport:{width:1600,height:1000,deviceScaleFactor:1},hardwareEnabled:!!process.env.ATLAS_HARDWARE,inputHashes,sourceHashes,probeGrid:{grid:16,textureSize:2048,viewPixels:128,supersample:2},directions:[],distanceFootprints:[],screenshots:[],profiles:[],pageErrors,consoleErrors,failedRequests,limitations:['Pinned Three.ez hemi-only reference implementation; below-centre views are outside supported coverage.','Static 16 m source; no Atlas wind or physical-height deformation.','Mesh and proxy use different material models; no ground, shadows, species, or game integration.','Measurements describe this isolated lab and are not full-game or production performance claims.']};
try{
  if(typeof page.routeWebSocket==='function')await page.routeWebSocket('**/*',socket=>socket.close());
  await page.goto(new URL('tree-impostor-reference-lab.html',base).href,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!!window.__impostorReferenceLab,{timeout:30000});
  await page.locator('#near').setInputFiles(nearPath);await page.locator('#mid').setInputFiles(midPath);await page.locator('#load').click();
  await page.waitForFunction(()=>window.__impostorReferenceLab?.ready&&!!window.__impostorReferenceLab.metadata?.inputHashes,{timeout:120000});
  await waitFrames(10);
  const loaded=await page.evaluate(()=>{
    const lab=window.__impostorReferenceLab,gl=lab.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
    return {metadata:lab.metadata,renderer:gl.getParameter(gl.RENDERER),unmaskedRenderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,
      userAgent:navigator.userAgent,canvas:{width:lab.renderer.domElement.width,height:lab.renderer.domElement.height},sourceChildren:lab.source.children.length,proxyVisible:lab.proxy.visible};
  });
  assert.match(loaded.unmaskedRenderer??'',/NVIDIA GeForce RTX 5090/i,'expected actual RTX 5090 hardware renderer');
  assert.deepEqual(loaded.metadata.inputHashes,inputHashes);
  assert.equal(loaded.metadata.grid,16);assert.equal(loaded.metadata.textureSize,2048);assert.equal(loaded.metadata.viewPixels,128);
  assert.equal(loaded.metadata.sourceTriangles,13806);assert.equal(loaded.metadata.proxyTriangles,2);
  assert.equal(loaded.sourceChildren,2);report.loaded=loaded;

  const azimuths=[0,45,90,135,180,225,270,315],elevations=[0,15,45,85];
  const rows=[];
  for(const elevation of elevations)for(const azimuth of azimuths)rows.push({azimuth,elevation,tag:`az${azimuth}-el${elevation}`});
  rows.push({azimuth:0,elevation:90,tag:'top'});
  for(const azimuth of azimuths)rows.push({azimuth,elevation:-5,tag:`az${azimuth}-el-5`,unsupported:true});
  const directions=rows.map(row=>({...row,vector:[Math.cos(row.elevation*Math.PI/180)*Math.sin(row.azimuth*Math.PI/180),Math.sin(row.elevation*Math.PI/180),Math.cos(row.elevation*Math.PI/180)*Math.cos(row.azimuth*Math.PI/180)]}));
  const savedMasks=new Set(['az0-el0','az45-el0','az90-el0','az0-el15','az45-el45','az0-el85','top','az0-el-5']);
  for(const item of directions){
    const result=await page.evaluate(({direction,saveMask})=>{
      const lab=window.__impostorReferenceLab;
      const mesh=lab.probe('mesh',direction,128,2,true),impostor=lab.probe('impostor',direction,128,2,true);
      const metrics=(a,b)=>{
        let areaA=0,areaB=0,intersect=0,union=0,weightedA=0,weightedB=0;
        for(let i=3;i<a.length;i+=4){const x=a[i]/255,y=b[i]/255,xa=x>=.5,ya=y>=.5;areaA+=Number(xa);areaB+=Number(ya);intersect+=Number(xa&&ya);union+=Number(xa||ya);weightedA+=x;weightedB+=y;}
        return {meshAreaPixels:areaA,impostorAreaPixels:areaB,intersectionPixels:intersect,unionPixels:union,iou:union?intersect/union:1,
          meshWeightedArea:weightedA,impostorWeightedArea:weightedB,weightedAreaRatio:weightedA?weightedB/weightedA:null};
      };
      const result={metrics:metrics(mesh,impostor),meshFinite:mesh.every(Number.isFinite),impostorFinite:impostor.every(Number.isFinite)};
      if(saveMask){
        const encode=values=>{const c=document.createElement('canvas');c.width=c.height=128;const context=c.getContext('2d'),image=context.createImageData(128,128);
          for(let i=0;i<values.length;i+=4){const v=values[i+3]>=127.5?255:0;image.data[i]=image.data[i+1]=image.data[i+2]=v;image.data[i+3]=255;}context.putImageData(image,0,0);return c.toDataURL('image/png');};
        result.meshMask=encode(mesh);result.impostorMask=encode(impostor);
      }
      return result;
    },{direction:item.vector,saveMask:savedMasks.has(item.tag)});
    const row={...item,...result.metrics,finite:result.meshFinite&&result.impostorFinite};
    if(item.unsupported)row.note='Below-centre view is outside the pinned hemi reference support; retained as a diagnostic.';
    report.directions.push(row);
    if(savedMasks.has(item.tag)){
      for(const mode of ['mesh','impostor']){
        const path=join(out,'masks',`${item.tag}-${mode}.png`),data=result[`${mode}Mask`];await writeFile(path,Buffer.from(data.slice(data.indexOf(',')+1),'base64'));row[`${mode}MaskPath`]=path;report.screenshots.push(path);
      }
    }
    assert.ok(row.finite,`non-finite mask values at ${item.tag}`);
  }
  const footprints=[];
  for(const item of [{tag:'front-horizon',direction:[0,0,1]},{tag:'front-15deg',direction:[0,Math.sin(Math.PI/12),Math.cos(Math.PI/12)]},{tag:'up',direction:[0,1,0]}])for(const pixels of [32,64,128]){
    const metrics=await page.evaluate(({direction,pixels})=>{
      const lab=window.__impostorReferenceLab,a=lab.probe('mesh',direction,pixels,2,true),b=lab.probe('impostor',direction,pixels,2,true);
      let ma=0,ia=0,ix=0,un=0;for(let i=3;i<a.length;i+=4){const x=a[i]>=127.5,y=b[i]>=127.5;ma+=+x;ia+=+y;ix+=+(x&&y);un+=+(x||y);}return {meshAreaPixels:ma,impostorAreaPixels:ia,iou:un?ix/un:1};
    },{direction:item.direction,pixels});
    footprints.push({...item,pixels,supersample:2,...metrics});
  }
  report.distanceFootprints=footprints;

  const screenshotViews=[{name:'front',direction:[0,0,1],up:[0,1,0]},{name:'back',direction:[0,0,-1],up:[0,1,0]},{name:'top',direction:[0,1,0],up:[0,0,1]}];
  for(const view of screenshotViews){
    for(const mode of ['mesh','impostor']){
      await page.evaluate(({mode,direction,up})=>{
        const lab=window.__impostorReferenceLab,center=lab.metadata.center,radius=lab.metadata.radius,target=new (lab.camera.position.constructor)(...center);
        lab.setMode(mode);lab.camera.up.set(...up);lab.camera.position.copy(target).addScaledVector(new (lab.camera.position.constructor)(...direction),radius*3.5);lab.camera.lookAt(target);lab.camera.updateProjectionMatrix();
      },{mode,direction:view.direction,up:view.up});
      await waitFrames(4);const path=await canvasPng(`${view.name}-${mode}.png`);report.screenshots.push(path);
    }
  }

  // Measure identical near view; frame batches satisfy 120 warmup + 180 samples per representation.
  const profileResults=[];
  for(const mode of ['mesh','impostor']){
    await page.evaluate(mode=>{const lab=window.__impostorReferenceLab,center=lab.metadata.center,radius=lab.metadata.radius;lab.setMode(mode);lab.camera.up.set(0,1,0);lab.camera.position.set(center[0],center[1],center[2]+radius*3.5);lab.camera.lookAt(...center);lab.camera.updateProjectionMatrix();},mode);
    await waitFrames(120);await page.evaluate(()=>window.__impostorReferenceLab.profile.clear());await waitFrames(180);
    profileResults.push(await page.evaluate(mode=>({mode,frames:180,diagnostics:window.__impostorReferenceLab.profile.diagnostics()}),mode));
  }
  report.profiles=profileResults;
  const finalState=await page.evaluate(()=>{const lab=window.__impostorReferenceLab,gl=lab.renderer.getContext(),errors=[];for(let i=0;i<16;i++){const e=gl.getError();if(e===gl.NO_ERROR)break;errors.push(e);}return {glErrors:errors,metadata:lab.metadata};});
  report.glErrors=finalState.glErrors;assert.deepEqual(finalState.glErrors,[]);
  assert.deepEqual(pageErrors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(failedRequests,[]);
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
}catch(error){
  report.pageErrors=pageErrors;report.consoleErrors=consoleErrors;report.failedRequests=failedRequests;report.failure=String(error);
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');throw error;
}finally{await browser.close();}
