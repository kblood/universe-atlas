import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='C:/LLM/IWSDK',out=process.env.ATLAS_CAPTURE_REPORT??'test-results/family-capture/filtering-v1';
await mkdir(out,{recursive:true});
const families=[{name:'oak',source:'atlas-ez-family-f',stem:'atlas-ez-oak',capture:'atlas-oak-lod1-capture-16m-64-v1'},
  {name:'pine',source:'atlas-ez-conifer-family-13977-16m-v1e',stem:'atlas-ez-conifer',capture:'atlas-pine-lod1-capture-16m-64-v1'}];
if(process.env.ATLAS_CAPTURE_SIDECAR==='1')for(const f of families)f.capture=f.capture.replace('-v1','-sidecar-v1');
const sha=b=>createHash('sha256').update(b).digest('hex');
const sourceFiles=[];
for(const path of ['src/tree-impostor-lab.ts','src/tree-captured-impostor.ts','src/tree-impostor-filter.ts','src/tree-asset.ts','src/tree-impostor-views.ts'])sourceFiles.push({path,sha256:sha(await readFile(path))});
const report={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceFiles,
  scope:'Isolated exact 16m LOD1 comparison; frame pixels refer to full capture diameter, not tree height. Supersampled mesh is calibration; native mesh reported separately. No forest integration/performance claim.',results:[],errors:[]};
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});
try{
for(const family of families){
  const page=await browser.newPage({viewport:{width:1200,height:900}}),cache=new Map();
  page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});
  await page.route('**/__capture/**',async route=>{
    const name=new URL(route.request().url()).pathname.slice('/__capture/'.length);
    let path;if(name==='source0'||name==='source1')path=join(root,'Assets/_assetctl',family.source,family.stem+(name==='source0'?'.glb':'.lod1.glb'));
    else if(['capture-manifest.json','source-mip-manifest.json','source-foliage-mips.rgba8'].includes(name)||/^view-\d+\/mip-\d+\.(colour|data|classification)\.f32$/.test(name))path=join(root,'Assets/_assetctl',family.capture,name);
    else throw new Error('Unknown capture fixture path');
    if(!cache.has(path))cache.set(path,await readFile(path));
    await route.fulfill({status:200,body:cache.get(path),contentType:name.endsWith('.json')?'application/json':'application/octet-stream'});
  });
  await page.goto('http://127.0.0.1:5197/tree-impostor-lab.html');await page.waitForFunction(()=>window.__treeImpostorLab);
  for(const filtering of ['legacy-unassociated','coverage-weighted']){
    await page.evaluate(async filtering=>{const read=async p=>(await fetch('/__capture/'+p)).arrayBuffer();const [a,b,m]=await Promise.all([read('source0'),read('source1'),fetch('/__capture/capture-manifest.json').then(r=>r.json())]);await window.__treeImpostorLab.load(a,b,m,read,filtering);},filtering);
    if(process.env.ATLAS_CAPTURE_RELIGHT==='1')await page.evaluate(()=>{const u=window.__treeImpostorLab.impostor.uniforms.captureRelightViews;if(!u)throw new Error('Missing per-view relighting option');u.value=1;});
    const metrics=await page.evaluate(()=>{
      const lab=window.__treeImpostorLab,rows=[];
      function metrics(a,b,n){
        const blur=v=>{const out=new Float64Array(n*n);for(let y=0;y<n;y++)for(let x=0;x<n;x++){let total=0,weights=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(x+dx<0||x+dx>=n||y+dy<0||y+dy>=n)continue;const w=(dx===0?2:1)*(dy===0?2:1);total+=v[((y+dy)*n+x+dx)*4+3]*w;weights+=w;}out[y*n+x]=total/weights;}return out};
        let areaA=0,areaB=0,lo=0,hi=0;for(let p=3;p<a.length;p+=4){areaA+=a[p]/255;areaB+=b[p]/255;lo+=Math.min(a[p],b[p]);hi+=Math.max(a[p],b[p]);}
        const ba=blur(a),bb=blur(b);let blo=0,bhi=0;for(let i=0;i<ba.length;i++){blo+=Math.min(ba[i],bb[i]);bhi+=Math.max(ba[i],bb[i]);}
        return {referenceArea:areaA,measuredArea:areaB,relativeAreaError:(areaB-areaA)/areaA,coverageIoU:lo/hi,blurredIoU:blo/bhi};
      }
      for(const direction of [[0,0,1],[1,.3,1]])for(const pixels of [33,128]){
        const reference=lab.probe(direction,'mesh',pixels,pixels===33?16:4),calibration=lab.probe(direction,'mesh',pixels,pixels===33?8:2),native=lab.probe(direction,'mesh',pixels,1);
        lab.setSourceCoverage('hash');const nativeHash=lab.probe(direction,'mesh',pixels,1);lab.setSourceCoverage('mask');
        for(const parallax of [0,1]){lab.impostor.uniforms.captureParallax.value=parallax;const captured=lab.probe(direction,'capture',pixels,1);rows.push({direction,pixels,parallax,capture:metrics(reference,captured,pixels),native:metrics(reference,native,pixels),nativeHash:metrics(reference,nativeHash,pixels),referenceConvergence:metrics(reference,calibration,pixels)});}
      }
      const surface=[];lab.impostor.uniforms.captureParallax.value=1;
      for(const direction of [[0,0,1],[1,.3,1]]){
        const meshDepth=lab.probe(direction,'mesh',33,32,'depth'),proxyDepth=lab.probe(direction,'capture',33,1,'depth');
        const meshColour=lab.probe(direction,'mesh',33,32,'colour'),proxyColour=lab.probe(direction,'capture',33,1,'colour');
        const errors=[];
        function luminance(data){let sum=0,area=0;for(let p=0;p<data.length;p+=4){const a=data[p+3];area+=a;sum+=(.2126*data[p]+.7152*data[p+1]+.0722*data[p+2])*a;}return sum/area;}
        for(let p=0;p<meshDepth.length;p+=4)if(meshDepth[p+3]>.1&&proxyDepth[p+3]>.1)errors.push(Math.abs(meshDepth[p]-proxyDepth[p]));
        errors.sort((a,b)=>a-b);
        const a=luminance(meshColour),b=luminance(proxyColour);
        const high=lab.probe(direction,'mesh',33,32),low=lab.probe(direction,'mesh',33,16);
        surface.push({direction,depthSamples:errors.length,depthMedianErrorM:errors[Math.floor(errors.length*.5)],depthP95ErrorM:errors[Math.floor(errors.length*.95)],sourceMeanLuminance:a,captureMeanLuminance:b,relativeLuminanceError:(b-a)/a,referenceConvergence1056vs528:metrics(high,low,33)});
      }
      const gl=lab.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
      return {rows,surface,foliageSampling:lab.capture.manifest.foliageSampling??'original-mips',relightViews:lab.impostor.uniforms.captureRelightViews?.value??0,filtering:lab.capture.filtering,bytes:lab.capture.bytes,lod:lab.capture.manifest.options.lod,glError:gl.getError(),adapter:gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)};
    });
    report.results.push({family:family.name,requestedFiltering:filtering,...metrics});
    await page.evaluate(()=>{const l=window.__treeImpostorLab;l.impostor.uniforms.captureParallax.value=1;l.camera.position.set(40,20,40);l.controls.target.set(0,8,0);l.controls.update()});
    for(const mode of ['mesh','capture']){await page.evaluate(m=>window.__treeImpostorLab.setMode(m),mode);await page.waitForTimeout(100);await page.screenshot({path:join(out,`${family.name}-${filtering}-${mode}.png`)});}
    console.log(JSON.stringify({family:family.name,filtering,...metrics}));
  }
  await page.close();
}
}catch(error){report.errors.push(String(error));process.exitCode=1;}
finally{await browser.close();await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');}
if(report.errors.length||report.results.some(r=>r.glError||r.filtering!==r.requestedFiltering))process.exitCode=1;
