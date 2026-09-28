import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {browserArgs} from '../../../tests/browser-options.mjs';

const candidate=resolve('C:/LLM/IWSDK/Assets/_assetctl/atlas-ez-family-f');
const near=join(candidate,'atlas-ez-oak.glb'),mid=join(candidate,'atlas-ez-oak.lod1.glb');
const out=resolve('test-results/three-ez-impostor-reference/native-map-fix/alpha-hash-followup.json');
const hash=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
const inputHashes={near:await hash(near),mid:await hash(mid)};
const sourceFiles=['tree-impostor-reference-lab.html','src/tree-impostor-reference-lab.ts','src/tree-impostor-reference-shader.ts','src/tree-asset.ts','src/vendor/three-ez-impostor/impostor-reference.js'];
const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async p=>[p,await hash(resolve(p))])));
const browser=await chromium.launch({headless:true,args:browserArgs}),page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1}),pageErrors=[];
page.on('pageerror',e=>pageErrors.push(e.message));
const compare=(a,b)=>{let aa=0,bb=0,ii=0,uu=0,si=0,su=0,wa=0,wb=0;for(let i=3;i<a.length;i+=4){const x=a[i]/255,y=b[i]/255,X=x>=.5,Y=y>=.5;aa+=+X;bb+=+Y;ii+=+(X&&Y);uu+=+(X||Y);si+=Math.min(x,y);su+=Math.max(x,y);wa+=x;wb+=y;}return {areaAPixels:aa,areaBPixels:bb,binaryIoU:uu?ii/uu:1,softIoU:su?si/su:1,weightedAreaA:wa,weightedAreaB:wb,weightedAreaRatio:wa?wb/wa:null};};
try{
  if(typeof page.routeWebSocket==='function')await page.routeWebSocket('**/*',s=>s.close());
  await page.goto('http://127.0.0.1:5197/tree-impostor-reference-lab.html',{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__impostorReferenceLab);
  await page.locator('#fix').check();await page.locator('#near').setInputFiles(near);await page.locator('#mid').setInputFiles(mid);await page.locator('#load').click();
  await page.waitForFunction(()=>window.__impostorReferenceLab?.ready&&window.__impostorReferenceLab.metadata.mapIncludeFix===true,{timeout:120000});
  const renderer=await page.evaluate(()=>{const lab=window.__impostorReferenceLab,gl=lab.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {unmasked:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,metadata:lab.metadata};});
  assert.match(renderer.unmasked??'',/NVIDIA GeForce RTX 5090/i);assert.deepEqual(renderer.metadata.inputHashes,inputHashes);
  const directions=[{tag:'horizon0',d:[0,0,1]},{tag:'diagonal45-elevation15',d:[Math.cos(Math.PI/12)*Math.SQRT1_2,Math.sin(Math.PI/12),Math.cos(Math.PI/12)*Math.SQRT1_2]},{tag:'top',d:[0,1,0]}],results=[];
  for(const view of directions){
    const result=await page.evaluate(({direction})=>{
      const lab=window.__impostorReferenceLab,regular=lab.probe('mesh',direction,256,4,true),material=lab.source.children.map(x=>x.material).find(x=>x.name==='MAT_AtlasFoliage');
      const settings={before:{alphaTest:material.alphaTest,alphaHash:material.alphaHash}};material.alphaTest=0;material.alphaHash=true;material.needsUpdate=true;
      const hashReference=lab.probe('mesh',direction,256,4,true);
      const area=a=>{let n=0;for(let i=3;i<a.length;i+=4)n+=a[i]/255;return n;};
      const mae=(a,b)=>{let n=0;for(let i=3;i<a.length;i+=4)n+=Math.abs(a[i]-b[i])/255;return n/(a.length/4);};
      const downsample=(data,size)=>{const factor=256/size,out=new Float32Array(size*size*4),n=factor*factor;for(let y=0;y<size;y++)for(let x=0;x<size;x++){let alpha=0;for(let j=0;j<factor;j++)for(let i=0;i<factor;i++)alpha+=data[(((y*factor+j)*256+x*factor+i)*4)+3];out[(y*size+x)*4+3]=alpha/n;}return out;};
      const outputs=[];
      for(const pixels of [8,16,32,64,128]){
        const reference=downsample(hashReference,pixels),nativeHash=lab.probe('mesh',direction,pixels,1,true),nativeProxy=lab.probe('impostor',direction,pixels,1,true);
        outputs.push({pixels,hashNativeVsHash256SS4:__cmp(reference,nativeHash),proxyNativeVsHash256SS4:__cmp(reference,nativeProxy),hashNativeVsProxyNative:__cmp(nativeHash,nativeProxy)});
      }
      material.alphaTest=settings.before.alphaTest;material.alphaHash=settings.before.alphaHash;material.needsUpdate=true;
      return {settings,regularReferenceArea:area(regular),hashReferenceArea:area(hashReference),regularVsHash256SS4Mae:mae(regular,hashReference),outputs};
      function __cmp(a,b){let aa=0,bb=0,ii=0,uu=0,si=0,su=0,wa=0,wb=0;for(let i=3;i<a.length;i+=4){const x=a[i]/255,y=b[i]/255,X=x>=.5,Y=y>=.5;aa+=+X;bb+=+Y;ii+=+(X&&Y);uu+=+(X||Y);si+=Math.min(x,y);su+=Math.max(x,y);wa+=x;wb+=y;}return {areaAPixels:aa,areaBPixels:bb,binaryIoU:uu?ii/uu:1,softIoU:su?si/su:1,weightedAreaA:wa,weightedAreaB:wb,weightedAreaRatio:wa?wb/wa:null};}
    },{direction:view.d});
    results.push({...view,...result});
  }
  const final=await page.evaluate(()=>{const lab=window.__impostorReferenceLab,gl=lab.renderer.getContext(),errors=[];for(let i=0;i<16;i++){const e=gl.getError();if(e===gl.NO_ERROR)break;errors.push(e);}return errors;});
  assert.deepEqual(final,[]);assert.deepEqual(pageErrors,[]);
  await writeFile(out,JSON.stringify({candidate,inputHashes,sourceHashes,browserVersion:browser.version(),renderer:renderer.unmasked,metadata:{revision:renderer.metadata.revision,bundleSha256:renderer.metadata.bundleSha256,threeRevision:renderer.metadata.threeRevision,grid:renderer.metadata.grid,textureSize:renderer.metadata.textureSize,mapIncludeFix:renderer.metadata.mapIncludeFix},probe:'All comparisons use alpha channel; 256px 4x mesh is the resolution reference, not temporal AA.',results,glErrors:final,pageErrors},null,2)+'\n');
}finally{await browser.close();}
