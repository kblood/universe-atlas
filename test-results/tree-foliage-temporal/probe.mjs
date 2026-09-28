import {chromium} from 'playwright';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {browserArgs} from '../../tests/browser-options.mjs';
import {createRequire} from 'node:module';
const root=resolve('C:/LLM/IWSDK'),candidate=join(root,'Assets/_assetctl/atlas-ez-family-f');
const files=[join(candidate,'atlas-ez-oak.glb'),join(candidate,'atlas-ez-oak.lod1.glb')],out=resolve('test-results/tree-foliage-temporal/render-target-probes');
const sharp=createRequire(join(root,'tools/assetctl/package.json'))('sharp');
const browser=await chromium.launch({headless:true,args:browserArgs});await mkdir(out,{recursive:true});
const report={inputHashes:[],browserVersion:browser.version(),url:'http://127.0.0.1:5197/tree-asset-lab.html',modes:{},limitations:['512/1024 render-target samples are high-resolution references, not converged ground truth.','Coverage is a color-difference silhouette estimate against a constant background, not per-pixel alpha; rendered tree materials are opaque.','Only one centered specimen is retained in this isolated lab render. This is not game integration or TAA evaluation.']};
for(const f of files)report.inputHashes.push({path:f,sha256:createHash('sha256').update(await readFile(f)).digest('hex')});
const page=await browser.newPage({viewport:{width:1200,height:900},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(report.url,{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__treeAssetLab);
await page.locator('#lod0-file').setInputFiles(files[0]);await page.locator('#lod1-file').setInputFiles(files[1]);
const wait=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
for(const mode of ['mask','hash']){
 await page.locator('#coverage').selectOption(mode);await page.locator('#load-assets').click();await page.waitForFunction(()=>window.__treeAssetLab?.diagnostics().ready&&!window.__treeAssetLab.diagnostics().loading);await wait();
 const setup=await page.evaluate(async mode=>{
   const l=window.__treeAssetLab,THREE=await import('/node_modules/three/build/three.module.js');l.controls.enabled=false;l.renderer.shadowMap.enabled=false;l.sun.castShadow=false;l.ground.visible=false;l.grid.visible=false;
   for(const [bi,b] of l.batches.entries()){
     b.group.visible=bi===0;
     for(const mesh of b.meshes){mesh.castShadow=false;mesh.receiveShadow=false;const matrix=new THREE.Matrix4();for(const i of [0,2]){matrix.makeScale(1e-6,1e-6,1e-6).setPosition((i-1)*22,0,0);mesh.setMatrixAt(i,matrix);}mesh.instanceMatrix.needsUpdate=true;}
   }
   l.setPopulation(3);l.setLOD(0);l.setDate(0n);l.camera.fov=50;l.camera.aspect=1;l.camera.updateProjectionMatrix();
   const gl=l.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
   return {mode,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):null};
 },mode);
 const cap=async(options)=>page.evaluate(async cfg=>{
   const l=window.__treeAssetLab,THREE=await import('/node_modules/three/build/three.module.js'),size=cfg.size;
   l.setLOD(cfg.lod);l.setDate(BigInt(cfg.date));
   l.camera.position.set(Math.sin(cfg.yaw)*cfg.distance,8,Math.cos(cfg.yaw)*cfg.distance);l.camera.lookAt(0,8,0);l.camera.updateProjectionMatrix();
   const rt=new THREE.WebGLRenderTarget(size,size,{format:THREE.RGBAFormat,type:THREE.UnsignedByteType,depthBuffer:true,stencilBuffer:false});
   const data=new Uint8Array(size*size*4),result=[];
   const png=bytes=>{const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d'),image=ctx.createImageData(size,size);image.data.set(bytes);ctx.putImageData(image,0,0);return canvas.toDataURL('image/png').split(',')[1];};
   for(const visible of [false,true]){
     for(const b of l.batches)b.group.visible=visible&&b===l.batches[cfg.lod];
     l.renderer.setRenderTarget(rt);l.renderer.clear();l.renderer.render(l.scene,l.camera);l.renderer.readRenderTargetPixels(rt,0,0,size,size,data);
     result.push(png(data));
   }
   l.renderer.setRenderTarget(null);rt.dispose();
   return {background:result[0],tree:result[1],size,date:String(cfg.date),lod:cfg.lod,yaw:cfg.yaw,distance:cfg.distance};
 },{...options,date:String(options.date??0)});
 const classify=(background,tree)=>{const mask=new Uint8Array(background.length/4);for(let p=0;p<mask.length;p++){const i=p*4;const d=Math.max(Math.abs(background[i]-tree[i]),Math.abs(background[i+1]-tree[i+1]),Math.abs(background[i+2]-tree[i+2]));mask[p]=d>5?1:0;}return mask;};
 const stats=m=>{let n=0;for(const v of m)n+=v;return n;};
 const iou=(a,b)=>{let both=0,any=0,changed=0;for(let i=0;i<a.length;i++){if(a[i]||b[i])any++;if(a[i]&&b[i])both++;if(a[i]!==b[i])changed++;}return {iou:any?both/any:1,changedPixels:changed,areaA:stats(a),areaB:stats(b),pixels:a.length};};
 const box=async(png,size,target)=>{
   const raw=await sharp(Buffer.from(png,'base64')).ensureAlpha().raw().toBuffer();
   if(target===size)return raw;
   if(size%target)throw new Error(`Box filter requires integer ratio, ${size}->${target}`);
   const ratio=size/target,out=Buffer.alloc(target*target*4),divisor=ratio*ratio;
   for(let y=0;y<target;y++)for(let x=0;x<target;x++)for(let c=0;c<4;c++){
     let sum=0;for(let dy=0;dy<ratio;dy++)for(let dx=0;dx<ratio;dx++)sum+=raw[((y*ratio+dy)*size+x*ratio+dx)*4+c];
     out[(y*target+x)*4+c]=Math.round(sum/divisor);
   }
   return out;
 };
 const decoded=async(capture,target=capture.size)=>{
   const [tree,bg]=await Promise.all([box(capture.tree,capture.size,target),box(capture.background,capture.size,target)]);
   return {mask:classify(bg,tree),rgba:tree};
 };
 const downsample=async(capture,target)=>{
   const decodedTarget=await decoded(capture,target);
   return decodedTarget;
 };
 const native=async(target,options)=>{const c=await cap({size:target,...options});return {capture:c,...await decoded(c)};};
 const row={setup,footprints:[],wind:[],yaw:[]};
 for(const q of [16,32]){
   const high=512,footprint=q;
   // 16 m tree projects to about 4*q pixels in the high-resolution sample.
   const distance=16*high/(2*Math.tan(Math.PI*50/360)*4*footprint);
   const hi=await cap({size:high,distance,date:0n}),hiMask=(await decoded(hi)).mask,ref=await downsample(hi,q),lo=await native(q,{distance,date:0n});
   row.footprints.push({outputPixels:q,highResolutionPixels:high,cameraDistanceM:distance,meshNativeVsDownsampled:iou(lo.mask,ref.mask),highResolutionCoverageFraction:stats(hiMask)/(high*high),nativeCoverageFraction:stats(lo.mask)/(q*q)});
 }
 for(const q of [16,32]){
   const high=512,distance=16*high/(2*Math.tan(Math.PI*50/360)*4*q);
   const dates=['0','1750000000','7000000000','-7000000000'],nativeMasks={},highMasks={};
   for(const date of dates){const hi=await cap({size:high,distance,date:BigInt(date)}),lo=await native(q,{distance,date:BigInt(date)});nativeMasks[date]=lo.mask;highMasks[date]=(await downsample(hi,q)).mask;row.wind.push({outputPixels:q,date,highDownsampledMaskPixels:stats(highMasks[date]),nativeMaskPixels:stats(lo.mask),highCapturePixels:high});}
   const baseline=nativeMasks['0'];
   for(const x of row.wind.filter(x=>x.outputPixels===q)){x.nativeVsDate0=iou(baseline,nativeMasks[x.date]);x.highVsDate0=iou(highMasks['0'],highMasks[x.date]);}
 }
 for(const degrees of [0,.25,.5,.75]){
   const q=32,high=512,distance=16*high/(2*Math.tan(Math.PI*50/360)*4*q),yaw=degrees*Math.PI/180;
   const hi=await cap({size:high,distance,yaw}),ref=await downsample(hi,q),lo=await native(q,{distance,yaw});
   row.yaw.push({degrees,highResolution:high,meshNativeVsDownsampled:iou(lo.mask,ref.mask),nativeCoverageFraction:stats(lo.mask)/(q*q)});
 }
 report.modes[mode]=row;
}
report.errors=errors;
await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
await page.close();await browser.close();
