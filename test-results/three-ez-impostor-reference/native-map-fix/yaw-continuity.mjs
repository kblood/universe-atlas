import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {browserArgs} from '../../../tests/browser-options.mjs';

const candidate=resolve('C:/LLM/IWSDK/Assets/_assetctl/atlas-ez-family-f');
const near=join(candidate,'atlas-ez-oak.glb'),mid=join(candidate,'atlas-ez-oak.lod1.glb');
const out=resolve('test-results/three-ez-impostor-reference/native-map-fix/yaw-continuity.json');
const hash=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
const inputHashes={near:await hash(near),mid:await hash(mid)};
const sourceFiles=['tree-impostor-reference-lab.html','src/tree-impostor-reference-lab.ts','src/tree-impostor-reference-shader.ts','src/tree-asset.ts','src/vendor/three-ez-impostor/impostor-reference.js'];
const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async p=>[p,await hash(resolve(p))])));
const browser=await chromium.launch({headless:true,args:browserArgs}),page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
const sample=[];
try{
  if(typeof page.routeWebSocket==='function')await page.routeWebSocket('**/*',s=>s.close());
  await page.goto('http://127.0.0.1:5197/tree-impostor-reference-lab.html',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!!window.__impostorReferenceLab);
  await page.locator('#fix').check();await page.locator('#near').setInputFiles(near);await page.locator('#mid').setInputFiles(mid);await page.locator('#load').click();
  await page.waitForFunction(()=>window.__impostorReferenceLab?.ready&&window.__impostorReferenceLab.metadata.mapIncludeFix===true,{timeout:120000});
  await page.evaluate(()=>window.__impostorReferenceLab.probe('impostor',[0,0,1],8,1,true));
  const renderer=await page.evaluate(()=>{const lab=window.__impostorReferenceLab,gl=lab.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {unmasked:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,metadata:lab.metadata};});
  assert.match(renderer.unmasked??'',/NVIDIA GeForce RTX 5090/i);assert.deepEqual(renderer.metadata.inputHashes,inputHashes);
  const convergence=[];
  for(const view of [{tag:'horizon0',d:[0,0,1]},{tag:'diagonal45-elevation15',d:[Math.cos(Math.PI/12)*Math.SQRT1_2,Math.sin(Math.PI/12),Math.cos(Math.PI/12)*Math.SQRT1_2]},{tag:'top',d:[0,1,0]}]){
    convergence.push(await page.evaluate(({tag,direction})=>{
      const lab=window.__impostorReferenceLab,refs={};
      for(const supersample of [1,2,4])refs[supersample]=lab.probe('mesh',direction,256,supersample,true);
      const area=data=>{let sum=0;for(let i=3;i<data.length;i+=4)sum+=data[i]/255;return sum;};
      const mae=(a,b)=>{let sum=0;for(let i=3;i<a.length;i+=4)sum+=Math.abs(a[i]-b[i])/255;return sum/(a.length/4);};
      const compare=(a,b)=>{let aa=0,bb=0,ii=0,uu=0,si=0,su=0,wa=0,wb=0;for(let i=3;i<a.length;i+=4){const x=a[i]/255,y=b[i]/255,X=x>=.5,Y=y>=.5;aa+=+X;bb+=+Y;ii+=+(X&&Y);uu+=+(X||Y);si+=Math.min(x,y);su+=Math.max(x,y);wa+=x;wb+=y;}return {areaA:aa,areaB:bb,binaryIoU:uu?ii/uu:1,softIoU:su?si/su:1,weightedAreaA:wa,weightedAreaB:wb,weightedAreaRatio:wa?wb/wa:null};};
      const downsample=(data,size)=>{const factor=256/size,out=new Float32Array(size*size*4),n=factor*factor;for(let y=0;y<size;y++)for(let x=0;x<size;x++){let alpha=0;for(let j=0;j<factor;j++)for(let i=0;i<factor;i++)alpha+=data[(((y*factor+j)*256+x*factor+i)*4)+3];out[(y*size+x)*4+3]=alpha/n;}return out;};
      const resolutionConvergence={reference256:{areaBySupersample:Object.fromEntries([1,2,4].map(s=>[s,area(refs[s])])),mae1to2:mae(refs[1],refs[2]),mae2to4:mae(refs[2],refs[4]),mae1to4:mae(refs[1],refs[4])},nativeOutputs:[]};
      for(const pixels of [8,16,32,64,128]){
        const ref=downsample(refs[4],pixels),meshNative=lab.probe('mesh',direction,pixels,1,true),proxyNative=lab.probe('impostor',direction,pixels,1,true);
        resolutionConvergence.nativeOutputs.push({pixels,meshNativeVsMesh256SS4:compare(ref,meshNative),proxyNativeVsMesh256SS4:compare(ref,proxyNative),meshNativeVsProxyNative:compare(meshNative,proxyNative)});
      }
      return {tag,direction,referenceResolution:256,referenceSupersamples:[1,2,4],resolutionConvergence};
    },{tag:view.tag,direction:view.d}));
  }
  for(const [segment,center,span] of [['boundary45',45,10],['boundary90',90,10]]){
    for(let yaw=center-span;yaw<=center+span+1e-6;yaw+=.5){
      const result=await page.evaluate(({yaw,segment})=>{
        const lab=window.__impostorReferenceLab,e=15*Math.PI/180,d=[Math.cos(e)*Math.sin(yaw*Math.PI/180),Math.sin(e),Math.cos(e)*Math.cos(yaw*Math.PI/180)];
        const previous=window.__yawPrevious??{};if(previous.segment!==segment)for(const key of Object.keys(previous))delete previous[key];previous.segment=segment;
        const meanAbs=(a,b)=>{let sum=0;for(let i=3;i<a.length;i+=4)sum+=Math.abs(a[i]-b[i])/255;return sum/(a.length/4);};
        const weightedArea=a=>{let n=0;for(let i=3;i<a.length;i+=4)n+=a[i]/255;return n;};
        const rows=[];
        for(const pixels of [64,128]){
          const mesh=lab.probe('mesh',d,pixels,1,true),impostor=lab.probe('impostor',d,pixels,1,true),key=`${segment}:${pixels}`,prev=previous[key];
          const row={pixels,meshCoverage:weightedArea(mesh),impostorCoverage:weightedArea(impostor),nativeProxyMeshMae:meanAbs(mesh,impostor),
            meshStepMae:prev?meanAbs(prev.mesh,mesh):null,impostorStepMae:prev?meanAbs(prev.impostor,impostor):null};
          const refAngles=segment==='boundary45'?[43,45,47]:[88,90,92];
          if(refAngles.some(a=>Math.abs(a-yaw)<1e-6)){
            const ground=lab.probe('mesh',d,pixels,4,true);row.meshVs4xNoiseMae=meanAbs(mesh,ground);row.impostorVs4xMeshMae=meanAbs(impostor,ground);
          }
          previous[key]={mesh,impostor};rows.push(row);
        }
        window.__yawPrevious=previous;return {segment,yaw,elevation:15,direction:d,rows};
      },{yaw,segment});
      sample.push(result);
    }
  }
  const full={candidate,inputHashes,sourceHashes,browserVersion:browser.version(),renderer:renderer.unmasked,bundleSha256:renderer.metadata.bundleSha256,metadata:{revision:renderer.metadata.revision,threeRevision:renderer.metadata.threeRevision,mapIncludeFix:renderer.metadata.mapIncludeFix,shaderAudits:renderer.metadata.shaderAudits,grid:renderer.metadata.grid,textureSize:renderer.metadata.textureSize},convergence,samples:sample,pageErrors};
  assert.deepEqual(pageErrors,[]);await writeFile(out,JSON.stringify(full,null,2)+'\n');
}finally{await browser.close();}
