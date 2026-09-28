import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

const captureRoot=process.env.ATLAS_TREE_CAPTURE?resolve(process.env.ATLAS_TREE_CAPTURE):undefined;
const sourceRoot=process.env.ATLAS_TREE_SOURCE?resolve(process.env.ATLAS_TREE_SOURCE):undefined;
const baseURL=process.env.ATLAS_TREE_LAB_URL??'http://127.0.0.1:5197/tree-impostor-lab.html';
const output=resolve(process.env.ATLAS_TREE_IMPOSTOR_RESULTS??'test-results/tree-impostor-render-v2-hardware');
const fixtureConfigured=Boolean(captureRoot&&sourceRoot);
const viewFile=/^view-\d+\/mip-\d+\.(colour|data|classification)\.f32$/;
const referenceDirections=[[0,0,1],[1,0,0],[0,1,0],[0,-1,0],[0,0,-1],[-1,0,0],[1,.3,1],[1,1,0],[-1,0,1],[.01,1,.02],[.01,-1,.02]];
const length=v=>Math.hypot(...v),normalize=v=>{const n=length(v);return v.map(x=>x/n);};

async function routeFixture(page){
  await page.route('**/__capture/**',async route=>{
    const rel=new URL(route.request().url()).pathname.slice('/__capture/'.length);let file;
    if(rel==='source0')file=join(sourceRoot,'atlas-branching-v1.glb');
    else if(rel==='source1')file=join(sourceRoot,'atlas-branching-v1.lod1.glb');
    else if(rel==='capture-manifest.json'||viewFile.test(rel))file=join(captureRoot,rel);
    else throw new Error(`Fixture path is outside the approved tree asset pair: ${rel}`);
    const body=await readFile(file);
    await route.fulfill({status:200,body,contentType:rel.endsWith('.json')?'application/json':'application/octet-stream'});
  });
}

test('tree capture loader and shader reconstruct views without WebGL errors and restore lab state',{skip:!fixtureConfigured&&'Set ATLAS_TREE_CAPTURE and ATLAS_TREE_SOURCE to run the hardware fixture'},async t=>{
  await mkdir(output,{recursive:true});
  await Promise.all([
    stat(join(sourceRoot,'atlas-branching-v1.glb')),stat(join(sourceRoot,'atlas-branching-v1.lod1.glb')),
    stat(join(captureRoot,'capture-manifest.json')),
  ]);
  const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],warnings=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());else if(m.type()==='warning')warnings.push(m.text());});
  let report;
  try{
    await routeFixture(page);
    const response=await page.goto(baseURL);assert.ok(response?.ok(),`lab endpoint returned ${response?.status()}`);
    await page.waitForFunction(()=>window.__treeImpostorLab,undefined,{timeout:30000});
    await page.evaluate(async()=>{
      const read=async path=>(await fetch('/__capture/'+path)).arrayBuffer();
      const [lod0,lod1,manifest]=await Promise.all([read('source0'),read('source1'),fetch('/__capture/capture-manifest.json').then(r=>r.json())]);
      await window.__treeImpostorLab.load(lod0,lod1,manifest,read);
    });
    await page.waitForFunction(()=>window.__treeImpostorLab.ready);
    const hardware=await page.evaluate(()=>{
      const lab=window.__treeImpostorLab,gl=lab.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
      return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),captureBytes:lab.capture.bytes,textureCount:lab.renderer.info.memory.textures,geometryCount:lab.renderer.info.memory.geometries,views:lab.capture.views.length,version:lab.capture.manifest.version};
    });
    assert.equal(hardware.views,81);assert.equal(hardware.version,'tree-material-capture-2');
    assert.doesNotMatch(hardware.renderer,/SwiftShader|llvmpipe|software/i,'browser must use a hardware WebGL adapter');
    const coverageContract=await page.evaluate(async()=>{
      const l=window.__treeImpostorLab,instances=[];l.scene.traverse(o=>{if(o.isInstancedMesh)instances.push(o);});
      const source= l.family.lods[0].find(m=>m.material.name==='MAT_AtlasFoliage').material;
      const live=instances.find(m=>m.material.name==='MAT_AtlasFoliage');
      const defaultMask={alphaHash:source.alphaHash,alphaTest:source.alphaTest,depthAlphaHash:live.customDepthMaterial.alphaHash,distanceAlphaHash:live.customDistanceMaterial.alphaHash};
      l.setSourceCoverage('hash');
      const labHash={alphaHash:source.alphaHash,alphaTest:source.alphaTest,depthAlphaHash:live.customDepthMaterial.alphaHash,distanceAlphaHash:live.customDistanceMaterial.alphaHash};
      l.setSourceCoverage('mask');
      const adapter=await import('/src/tree-asset.ts'),[a,b]=await Promise.all([(await fetch('/__capture/source0')).arrayBuffer(),(await fetch('/__capture/source1')).arrayBuffer()]);
      const family=await adapter.loadTreeAssetFamily(a,b,{foliageCoverage:'hash'}),batch=family.createBatch(0,1),foliage=batch.meshes.find(m=>m.material.name==='MAT_AtlasFoliage');
      const loaderHash={alphaHash:foliage.material.alphaHash,alphaTest:foliage.material.alphaTest,depthAlphaHash:foliage.customDepthMaterial.alphaHash,depthAlphaTest:foliage.customDepthMaterial.alphaTest,distanceAlphaHash:foliage.customDistanceMaterial.alphaHash,distanceAlphaTest:foliage.customDistanceMaterial.alphaTest};
      batch.dispose();family.dispose();
      return {defaultMask,labHash,loaderHash};
    });
    assert.ok(coverageContract.defaultMask.alphaTest>0&&!coverageContract.defaultMask.alphaHash&&!coverageContract.defaultMask.depthAlphaHash&&!coverageContract.defaultMask.distanceAlphaHash);
    assert.deepEqual(coverageContract.labHash,{alphaHash:true,alphaTest:0,depthAlphaHash:true,distanceAlphaHash:true});
    assert.deepEqual(coverageContract.loaderHash,{alphaHash:true,alphaTest:0,depthAlphaHash:true,depthAlphaTest:0,distanceAlphaHash:true,distanceAlphaTest:0});
    await page.evaluate(()=>{const l=window.__treeImpostorLab;l.camera.position.set(0,9,25);l.controls.target.set(0,8,0);l.controls.update();l.setMode('mesh');});
    await page.screenshot({path:join(output,'source-mesh.png')});
    await page.evaluate(()=>window.__treeImpostorLab.setMode('capture'));
    await page.screenshot({path:join(output,'captured-impostor.png')});
    await page.evaluate(()=>{const l=window.__treeImpostorLab;l.impostor.uniforms.captureMask.value=0;l.impostor.uniforms.captureHash.value=1;l.renderer.render(l.scene,l.camera);});
    await page.screenshot({path:join(output,'captured-object-hash.png')});

    // A failed second load must leave the current family, capture and visible
    // representation installed. The deliberately bad payload is test-only.
    const rollback=await page.evaluate(async()=>{
      const l=window.__treeImpostorLab,old={family:l.family,capture:l.capture,impostor:l.impostor,mode:l.scene.children.find(o=>o.name==='Authored tree capture reconstruction (development)')?.visible};
      const [a,b,m]=await Promise.all([(await fetch('/__capture/source0')).arrayBuffer(),(await fetch('/__capture/source1')).arrayBuffer(),fetch('/__capture/capture-manifest.json').then(r=>r.json())]);
      let message='';try{await l.load(a,b,m,async()=>new ArrayBuffer(1));}catch(error){message=String(error);}
      return {message,oldFamilyRetained:l.family===old.family,oldCaptureRetained:l.capture===old.capture,oldImpostorRetained:l.impostor===old.impostor,ready:l.ready,mode:l.scene.children.find(o=>o.name==='Authored tree capture reconstruction (development)')?.visible};
    });
    assert.match(rollback.message,/Truncated capture attachment|Capture attachment length is invalid/);assert.equal(rollback.oldFamilyRetained,true);assert.equal(rollback.oldCaptureRetained,true);assert.equal(rollback.oldImpostorRetained,true);assert.equal(rollback.ready,true);assert.equal(rollback.mode,true);

    const captureDirections=await page.evaluate(()=>window.__treeImpostorLab.capture.views.map(view=>view.towardCamera));
    const probes=await page.evaluate(async directions=>{
      const l=window.__treeImpostorLab,results=[];
      const analyze=(direction,pixels,ssaa,comparison)=>{
        const imp=l.probe(direction,'capture',pixels,1),stats={direction,pixels,impCoverage:imp.filter((_,i)=>i%4===3).reduce((s,v)=>s+v/255,0),allFinite:imp.every(v=>Number.isFinite(v)&&v>=0&&v<=255)};
        if(comparison){const mesh=l.probe(direction,'mesh',pixels,ssaa);Object.assign(stats,{meshCoverage:mesh.filter((_,i)=>i%4===3).reduce((s,v)=>s+v/255,0),...comparison(mesh,imp)});}
        return stats;
      };
      const metric=(mesh,imp)=>{let ma=0,ia=0,is=0,un=0;for(let p=3;p<mesh.length;p+=4){ma+=mesh[p]/255;ia+=imp[p]/255;is+=Math.min(mesh[p],imp[p])/255;un+=Math.max(mesh[p],imp[p])/255;}return{sourceArea:ma,captureArea:ia,relativeAreaError:(ia-ma)/ma,coverageIoU:un?is/un:1};};
      for(const direction of directions){
        const result=analyze(direction,32,1,null);if(result.impCoverage<=0||!result.allFinite)throw new Error(`Empty or nonfinite capture probe: ${JSON.stringify(direction)}`);results.push({...result,probeKind:'capture-grid-view'});
      }
      const representative=[[0,0,1],[1,0,0],[0,1,0],[0,-1,0],[0,0,-1],[-1,0,0],[1,.3,1]];
      for(const coverage of ['mask','hash']){
        l.setSourceCoverage(coverage);
        for(const direction of representative)for(const pixels of [32,64,128]){
          const mesh=l.probe(direction,'mesh',pixels,4),imp=l.probe(direction,'capture',pixels,1);
          results.push({direction,pixels,sourceCoverage:coverage,probeKind:'mesh-capture',...metric(mesh,imp),meshAllFinite:mesh.every(Number.isFinite),captureAllFinite:imp.every(Number.isFinite)});
        }
      }
      l.setSourceCoverage('mask');
      const parallax=[];
      for(const direction of [[1,.3,1],[1,1,0],[.01,-1,.02]]){
        const samples=[];for(const strength of [0,1]){l.impostor.uniforms.captureParallax.value=strength;const pixels=l.probe(direction,'capture',128,1);samples.push({strength,coverage:pixels.filter((_,i)=>i%4===3).reduce((s,v)=>s+v/255,0),pixels});}
        let changed=0;for(let i=0;i<samples[0].pixels.length;i++)if(samples[0].pixels[i]!==samples[1].pixels[i])changed++;
        parallax.push({direction,offCoverage:samples[0].coverage,onCoverage:samples[1].coverage,changedBytes:changed});
      }
      l.impostor.uniforms.captureParallax.value=1;
      const center=[0,0,1];
      // Probe restoration: mode and external render target survive a pass.
      const THREE=await import('/node_modules/three/build/three.module.js');
      const target=new THREE.WebGLRenderTarget(8,8);l.renderer.setRenderTarget(target);
      l.setMode('mesh');const prior=l.renderer.getRenderTarget();l.probe(center,'capture',32,1);
      const restored={renderTarget:l.renderer.getRenderTarget()===prior,mode:l.scene.children.find(o=>o.name==='Authored tree capture reconstruction (development)')?.visible===false};
      l.renderer.setRenderTarget(null);target.dispose();l.setMode('capture');
      if(!restored.renderTarget||!restored.mode)throw new Error('Probe failed to restore renderer target or representation mode');
      return {results,restored,parallax};
    },[...captureDirections,...referenceDirections.map(d=>normalize(d))]);
    for(const result of probes.results){assert.ok(result.allFinite!==false&&result.meshAllFinite!==false&&result.captureAllFinite!==false);if(result.probeKind==='mesh-capture')assert.ok(result.sourceArea>0&&result.captureArea>0,`empty comparison coverage: ${JSON.stringify(result)}`);}
    const finalState=await page.evaluate(()=>{
      const l=window.__treeImpostorLab,gl=l.renderer.getContext();return {ready:l.ready,mode:l.scene.children.find(o=>o.name==='Authored tree capture reconstruction (development)')?.visible?'capture':'mesh',textures:l.renderer.info.memory.textures,geometries:l.renderer.info.memory.geometries,programs:l.renderer.info.programs?.map(p=>({name:p.name,diagnostics:p.diagnostics?.runnable===false?p.diagnostics.infoLog:null}))??[],glError:gl.getError()};
    });
    assert.equal(finalState.ready,true);assert.equal(finalState.glError,0);
    assert.ok(!finalState.programs.some(p=>p.diagnostics),'shader program reports a failed compile/link');
    assert.deepEqual(errors,[],'browser reported no unhandled page or console errors');
    const sourceHashes={};for(const file of ['src/tree-captured-impostor.ts','src/tree-impostor-lab.ts','tree-impostor-lab.html','src/tree-impostor-views.ts','src/tree-asset.ts'])sourceHashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');
    const inputHashes={};for(const file of ['atlas-branching-v1.glb','atlas-branching-v1.lod1.glb'])inputHashes[file]=createHash('sha256').update(await readFile(join(sourceRoot,file))).digest('hex');
    inputHashes['capture-manifest.json']=createHash('sha256').update(await readFile(join(captureRoot,'capture-manifest.json'))).digest('hex');
    report={capturedAt:new Date().toISOString(),gitRevision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),gitStatus:execFileSync('git',['status','--short'],{encoding:'utf8'}).trim(),sourceHashes,inputHashes,hardware,coverageContract,rollback,probeRestoration:probes.restored,probeParallax:probes.parallax,probes:probes.results,finalState,errors,warnings,knownLimitations:[
      'Source comparison uses 4x supersampled mesh probes; captures were baked from the same asset at 4x supersampling.',
      'Native source alpha mips at 1x render resolution lose foliage; 128px/4x is the reference mesh probe.',
      'Intermediate-angle silhouette mismatch is unresolved. Record IoU and area error as diagnostics, not as evidence of full visual acceptance.',
      'This lab does not establish game integration, parallax, shadow casting, wind, handoff, or full-population performance.',
    ]};
    await writeFile(join(output,'browser-report.json'),JSON.stringify(report,null,2));
    assert.ok(probes.restored.renderTarget&&probes.restored.mode);
    const exactAxis=probes.results.find(r=>r.probeKind==='mesh-capture'&&r.sourceCoverage==='mask'&&r.pixels===128&&JSON.stringify(r.direction)==='[0,0,1]');
    assert.ok(exactAxis,`expected exact-axis 128px MASK comparison in report: ${JSON.stringify(probes.results.filter(r=>r.probeKind==='mesh-capture'&&r.sourceCoverage==='mask'&&r.pixels===128))}`);
    assert.ok(exactAxis.coverageIoU>=.995,`exact-axis 128px MASK IoU was ${exactAxis.coverageIoU}`);
  }finally{await browser.close();}
});
