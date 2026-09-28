import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {browserArgs} from '../../tests/browser-options.mjs';

const here=dirname(fileURLToPath(import.meta.url));
const repoRoot=resolve(here,'../..');
const out=join(here,`run-${Date.now()}`);
const candidate=process.env.ATLAS_TREE_CANDIDATE;
if(!candidate)throw new Error('Set ATLAS_TREE_CANDIDATE to the preserved family-F GLB directory.');
if(process.env.ATLAS_HARDWARE!=='1')throw new Error('Set ATLAS_HARDWARE=1 so this test uses the real desktop GPU.');
const lod0=resolve(process.env.ATLAS_TREE_LOD0??join(candidate,'atlas-ez-oak.glb'));
const lod1=resolve(process.env.ATLAS_TREE_LOD1??join(candidate,'atlas-ez-oak.lod1.glb'));
const base=process.env.ATLAS_URL??'http://127.0.0.1:5197/';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[],failedRequests=[],failures=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('[vite] failed to connect to websocket.'))errors.push(m.text());});
page.on('requestfailed',r=>failedRequests.push(`${r.url()}: ${r.failure()?.errorText}`));
const check=(name,condition,detail)=>{if(!condition)failures.push({name,detail});};
const waitFrames=n=>page.evaluate(count=>new Promise(resolve=>{let i=0;function next(){if(++i>=count)resolve();else requestAnimationFrame(next);}requestAnimationFrame(next);}),n);
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceFiles=['src/tree-asset.ts','src/instance-update-ranges.ts','src/tree-asset-lab.ts'];
const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async path=>[path,sha256(await import('node:fs/promises').then(fs=>fs.readFile(resolve(repoRoot,path))))])));
const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:repoRoot,encoding:'utf8'}).trim();
const sourceStatus=execFileSync('git',['status','--short','--','src/tree-asset.ts','src/instance-update-ranges.ts','src/tree-asset-lab.ts'],{cwd:repoRoot,encoding:'utf8'}).trim();
const report={candidate,lod0,lod1,url:base,commit,sourceHashes,sourceWorktree:{dirty:!!sourceStatus,status:sourceStatus},viewport:{width:1440,height:1000,deviceScaleFactor:1},hardwareEnabled:true,glbHashes:{},errors,failedRequests,failures,tests:{},limitations:['Prototype tree-family batch update test only; it does not test PlanetForest integration or whole-game performance.','Sparse 0/191 range accounting uses one 192-slot LOD0 batch; tint pixel replay covers both LODs at three instances for MASK/HASH × transmission off/.35.','A hidden batch retains pending BufferAttribute update ranges until its visible draw uploads them.']};
try{
  if(typeof page.routeWebSocket==='function')await page.routeWebSocket('**/*',socket=>socket.close());
  await page.goto(new URL('tree-asset-lab.html',base).href,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!!window.__treeAssetLab,{timeout:30000});
  await page.locator('#animate').uncheck();
  await page.locator('#lod0-file').setInputFiles(lod0);
  await page.locator('#lod1-file').setInputFiles(lod1);
  await page.evaluate(async()=>{
    const lab=window.__treeAssetLab,a=document.querySelector('#lod0-file').files?.[0],b=document.querySelector('#lod1-file').files?.[0];
    if(!a||!b)throw new Error('Both GLB inputs are required');await lab.load([await a.arrayBuffer(),await b.arrayBuffer()]);
    lab.renderer.setAnimationLoop(null);
  });
  await page.waitForFunction(()=>window.__treeAssetLab?.diagnostics().ready&&!window.__treeAssetLab.diagnostics().loading,{timeout:60000});
  const {readFile}=await import('node:fs/promises');report.glbHashes[lod0]=sha256(await readFile(lod0));report.glbHashes[lod1]=sha256(await readFile(lod1));
  await page.evaluate(()=>{
    const lab=window.__treeAssetLab;lab.setDate(0n);lab.setLOD(0);
    for(const batch of lab.batches)batch.group.visible=false;
    lab.camera.position.set(0,9,32);lab.camera.lookAt(0,9,0);lab.camera.updateProjectionMatrix();lab.camera.updateMatrixWorld(true);
    const grid=lab.scene.children.find(o=>o.isGridHelper);if(grid)grid.visible=false;
  });

  const created=await page.evaluate(()=>{
    const lab=window.__treeAssetLab,f=lab.family;
    const batch=f.createBatch(0,192),M=window.__treeAssetLab.batches[0].meshes[0].matrix.constructor;
    for(let i=0;i<192;i++){
      const x=i===0?0:i===191?500:700+i*5;
      batch.setInstance(i,new M().makeRotationY(i*.017).setPosition(x,0,0),i===0?16:10+(i%13),i*.1);
    }
    batch.setCount(192);batch.group.visible=true;lab.scene.add(batch.group);
    window.__treeInstanceTestBatch=batch;
    const initializedRanges=batch.meshes.map(m=>({matrix:m.instanceMatrix.updateRanges.map(r=>({...r})),tree:m.geometry.getAttribute('instanceTree').updateRanges.map(r=>({...r})),color:m.instanceColor.updateRanges.map(r=>({...r}))}));
    lab.renderer.render(lab.scene,lab.camera);
    const afterFirstUpload=batch.meshes.map(m=>({matrix:m.instanceMatrix.updateRanges.map(r=>({...r})),tree:m.geometry.getAttribute('instanceTree').updateRanges.map(r=>({...r})),color:m.instanceColor.updateRanges.map(r=>({...r}))}));
    return {white:batch.meshes.map(m=>Array.from(m.instanceColor.array.slice(0,3))),count:batch.meshes.map(m=>m.count),sharedMaterials:f.lods[0].map((m,i)=>m.material===f.lods[1][i].material),initializedRanges,afterFirstUpload};
  });
  check('fresh batch defaults to white instance tint',created.white.every(rgb=>rgb.every(v=>v===1)),created.white);
  check('batch initializes both primitive counts',created.count.every(n=>n===192),created.count);
  check('LOD materials are shared by material identity',created.sharedMaterials.every(Boolean),created.sharedMaterials);
  check('first full GPU upload consumes initialization ranges',created.initializedRanges.every(p=>p.matrix.length>0&&p.tree.length>0)&&created.afterFirstUpload.every(p=>p.matrix.length===0&&p.tree.length===0&&p.color.length===0),{initialized:created.initializedRanges,afterFirstUpload:created.afterFirstUpload});
  report.tests.freshBatch={white:created.white,count:created.count,sharedLODMaterials:created.sharedMaterials,initializedRanges:created.initializedRanges,afterFirstUpload:created.afterFirstUpload};
  await waitFrames(8);

  const steady=await page.evaluate(()=>{
    const batch=window.__treeInstanceTestBatch;
    const snap=()=>({matrix:batch.meshes.map(m=>m.instanceMatrix.version),tree:batch.meshes[0].geometry.getAttribute('instanceTree').version,color:batch.meshes.map(m=>m.instanceColor.version)});
    const before=snap(),M=batch.meshes[0].matrix.constructor,matrix=new M().makeRotationY(0).setPosition(0,0,0);
    batch.setInstance(0,matrix,16,0);batch.setAppearance(0,[1,1,1],[1,1,1]);
    return {before,after:snap(),ranges:batch.meshes.map(m=>({matrix:m.instanceMatrix.updateRanges.map(r=>({...r})),tree:m.geometry.getAttribute('instanceTree').updateRanges.map(r=>({...r})),color:m.instanceColor.updateRanges.map(r=>({...r}))}))};
  });
  check('unchanged instance and appearance do not bump attribute versions',JSON.stringify(steady.before)===JSON.stringify(steady.after),steady);
  report.tests.unchanged={versions:steady};
  await waitFrames(3);

  const sparse=await page.evaluate(()=>{
    const batch=window.__treeInstanceTestBatch;
    const M=batch.meshes[0].matrix.constructor;
    batch.setInstance(0,new M().makeRotationY(.23).setPosition(1,0,0),16.5,.4);
    batch.setInstance(191,new M().makeRotationY(.47).setPosition(501,0,0),18,.8);
    batch.setAppearance(0,[1.15,.9,.82],[.77,1.08,.84]);
    batch.setAppearance(191,[.82,1.1,.9],[1.08,.8,.92]);
    const tree=batch.meshes[0].geometry.getAttribute('instanceTree').array;
    return {parts:batch.meshes.map(m=>({matrix:m.instanceMatrix.updateRanges.map(r=>({...r})),tree:m.geometry.getAttribute('instanceTree').updateRanges.map(r=>({...r})),color:m.instanceColor.updateRanges.map(r=>({...r}))})),instanceTree:{slot0:Array.from(tree.slice(0,2)),slot191:Array.from(tree.slice(191*2,192*2))},colors:batch.meshes.map(m=>({slot0:Array.from(m.instanceColor.array.slice(0,3)),slot191:Array.from(m.instanceColor.array.slice(191*3,192*3))}))};
  });
  const sparseValid=sparse.parts.every(p=>p.matrix.length===2&&p.matrix.every(r=>r.count===16)&&p.color.length===2&&p.color.every(r=>r.count===3))&&sparse.parts[0].tree.length===2&&sparse.parts[0].tree.every(r=>r.count===2);
  check('slots 0 and 191 produce only two component ranges per changed attribute',sparseValid,sparse);
  check('per-part tint values are distinct while shared materials stay shared',sparse.colors[0].slot0.join(',')!==sparse.colors[1].slot0.join(',')&&sparse.colors[0].slot191.join(',')!==sparse.colors[1].slot191.join(','),sparse.colors);
  check('instance height and wind phase are stored separately from the transform',Math.abs(sparse.instanceTree.slot0[0]-16.5/16)<1e-6&&Math.abs(sparse.instanceTree.slot0[1]-.4)<1e-6&&Math.abs(sparse.instanceTree.slot191[0]-18/16)<1e-6&&Math.abs(sparse.instanceTree.slot191[1]-.8)<1e-6,sparse.instanceTree);
  report.tests.sparseUpdates=sparse;
  await waitFrames(8);

  const hidden=await page.evaluate(()=>{
    const batch=window.__treeInstanceTestBatch;
    const group=batch.group;group.visible=false;
    const M=batch.meshes[0].matrix.constructor;
    batch.setInstance(7,new M().makeRotationY(.6).setPosition(777,0,0),15,.7);
    batch.setAppearance(7,[.95,1.02,1.1],[1.02,.95,1.08]);
    const pending=batch.meshes.map(m=>({matrix:m.instanceMatrix.updateRanges.map(r=>({...r})),color:m.instanceColor.updateRanges.map(r=>({...r}))}));
    window.__treeAssetLab.renderer.render(window.__treeAssetLab.scene,window.__treeAssetLab.camera);
    const afterHiddenDraw=batch.meshes.map(m=>({matrix:m.instanceMatrix.updateRanges.map(r=>({...r})),color:m.instanceColor.updateRanges.map(r=>({...r}))}));
    group.visible=true;window.__treeAssetLab.renderer.render(window.__treeAssetLab.scene,window.__treeAssetLab.camera);
    const afterVisibleDraw=batch.meshes.map(m=>({matrix:m.instanceMatrix.updateRanges.map(r=>({...r})),color:m.instanceColor.updateRanges.map(r=>({...r}))}));
    return {pending,afterHiddenDraw,afterVisibleDraw};
  });
  const hiddenPreserved=hidden.pending.every((p,i)=>p.matrix.length>0&&p.color.length>0&&JSON.stringify(p)===JSON.stringify(hidden.afterHiddenDraw[i]));
  const visibleCleared=hidden.afterVisibleDraw.every(p=>p.matrix.length===0&&p.color.length===0);
  check('pending ranges survive a hidden draw',hiddenPreserved,hidden);
  check('visible draw consumes pending ranges',visibleCleared,hidden);
  report.tests.hiddenRanges=hidden;
  await waitFrames(5);

  const capture=()=>page.evaluate(()=>{
    const lab=window.__treeAssetLab,gl=lab.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,pixels=new Uint8Array(w*h*4);
    while(gl.getError()!==gl.NO_ERROR){}
    lab.renderer.render(lab.scene,lab.camera);gl.finish();gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    let hash=2166136261;for(const b of pixels)hash=Math.imul(hash^b,16777619);
    const errors=[];let error;while((error=gl.getError())!==gl.NO_ERROR)errors.push(error);
    return {hash:(hash>>>0).toString(16).padStart(8,'0'),width:w,height:h,renderer:(()=>{const e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);})(),glErrors:errors};
  });
  await page.evaluate(()=>window.__treeInstanceTestBatch.setAppearance(0,[1,1,1],[1,1,1]));
  const baselinePixels=await capture();await page.screenshot({path:join(out,'white-before.png')});
  await page.evaluate(()=>window.__treeInstanceTestBatch.setAppearance(0,[1.35,.55,.55],[.45,1.25,.5]));await waitFrames(3);
  const tintedPixels=await capture();await page.screenshot({path:join(out,'tinted.png')});
  await page.evaluate(()=>window.__treeInstanceTestBatch.setAppearance(0,[1,1,1],[1,1,1]));await waitFrames(3);
  const restoredPixels=await capture();await page.screenshot({path:join(out,'white-restored.png')});
  check('per-instance tint changes rendered pixels',tintedPixels.hash!==baselinePixels.hash,{baselinePixels,tintedPixels});
  check('restoring white tint restores exact framebuffer pixels',restoredPixels.hash===baselinePixels.hash,{baselinePixels,tintedPixels,restoredPixels});
  check('framebuffer captures have no WebGL errors',[baselinePixels,tintedPixels,restoredPixels].every(s=>s.glErrors.length===0),[baselinePixels,tintedPixels,restoredPixels]);
  report.tests.pixelTint={baselinePixels,tintedPixels,restoredPixels,limitation:'Framebuffer hash covers the complete lab canvas; only slot 0 is inside the camera frustum.'};

  const invalid=await page.evaluate(()=>{
    const batch=window.__treeInstanceTestBatch;
    const snapshots=()=>batch.meshes.map(m=>({version:m.instanceColor.version,slot:Array.from(m.instanceColor.array.slice(0,3))}));
    const before=snapshots(),errors=[];
    for(const [label,bark,foliage] of [
      ['null bark',null,[1,1,1]],['null foliage',[1,1,1],null],['sparse bark',[1,,1],[1,1,1]],['sparse foliage',[1,1,1],[1,,1]],['out of range',[2.01,1,1],[1,1,1]],['negative',[1,1,1],[1,-.01,1]],['NaN',[1,1,1],[1,Number.NaN,1]],
    ]){let rejected=false;try{batch.setAppearance(0,bark,foliage);}catch(error){rejected=true;errors.push({label,rejected,error:String(error)});}if(!rejected)errors.push({label,rejected,error:'did not reject'});}
    return {before,after:snapshots(),errors};
  });
  check('invalid appearance inputs reject atomically',invalid.errors.length===7&&invalid.errors.every(e=>e.rejected)&&JSON.stringify(invalid.before)===JSON.stringify(invalid.after),invalid);
  report.tests.invalidAppearance=invalid;

  const reuse=await page.evaluate(()=>{
    const batch=window.__treeInstanceTestBatch,index=191;batch.setCount(191);
    const before=batch.meshes.map(m=>Array.from(m.instanceColor.array.slice(index*3,index*3+3)));
    const M=batch.meshes[0].matrix.constructor;batch.setInstance(index,new M().makeRotationY(.47).setPosition(501,0,0),18,.8);
    return {before,after:batch.meshes.map(m=>Array.from(m.instanceColor.array.slice(index*3,index*3+3))),count:batch.meshes.map(m=>m.count)};
  });
  check('truncated and re-grown slot resets both part tints to white',reuse.after.every(rgb=>rgb.every(v=>v===1))&&reuse.count.every(n=>n===192),reuse);
  report.tests.slotReuse=reuse;

  const lifecycle=await page.evaluate(()=>{
    const batch=window.__treeInstanceTestBatch;
    const family=window.__treeAssetLab.family,group=batch.group;batch.dispose();
    let useAfterDisposeRejected=false;try{batch.setAppearance(0,[1,1,1],[1,1,1]);}catch{useAfterDisposeRejected=true;}
    let familyPrematureDisposeRejected=false;try{family.dispose();}catch{familyPrematureDisposeRejected=true;}
    return {groupParent:group.parent,useAfterDisposeRejected,familyPrematureDisposeRejected,labStillReady:window.__treeAssetLab.diagnostics().ready};
  });
  check('disposed batch detaches and rejects writes while live family remains',lifecycle.groupParent===null&&lifecycle.useAfterDisposeRejected&&lifecycle.familyPrematureDisposeRejected&&lifecycle.labStillReady,lifecycle);
  report.tests.lifecycle=lifecycle;

  const modes=[];
  for(const foliageCoverage of ['mask','hash'])for(const factor of [0,.35]){
    const mode=await page.evaluate(async({foliageCoverage,factor})=>{
      const lab=window.__treeAssetLab,a=document.querySelector('#lod0-file').files[0],b=document.querySelector('#lod1-file').files[0];
      const options={foliageCoverage,...(factor===0?{}:{leafTransmission:{factor}})};
      await lab.load([await a.arrayBuffer(),await b.arrayBuffer()],options);lab.setDate(0n);lab.setLOD(0);
      const gl=lab.renderer.getContext(),collectErrors=()=>{const out=[];let e;while((e=gl.getError())!==gl.NO_ERROR)out.push(e);return out;};
      const preCompileErrors=collectErrors();lab.renderer.compile(lab.scene,lab.camera);const compileErrors=collectErrors();
      const capture=()=>{lab.renderer.render(lab.scene,lab.camera);gl.finish();const pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let hash=2166136261;for(const v of pixels)hash=Math.imul(hash^v,16777619);return {hash:(hash>>>0).toString(16),errors:collectErrors()};};
      const tintReplay=[];
      for(const lod of [0,1]){
        lab.setLOD(lod);const batch=lab.batches[lod],base=capture();
        batch.setAppearance(0,[1.35,.55,.55],[.45,1.25,.5]);const tinted=capture();
        batch.setAppearance(0,[1,1,1],[1,1,1]);const restored=capture();
        tintReplay.push({lod,base,tinted,restored});
      }
      const foliage=lab.family.lods[0].find(m=>m.material.name==='MAT_AtlasFoliage').material;
      const coverageMaterials=lab.batches[0].meshes.map(m=>({depth:{alphaTest:m.customDepthMaterial.alphaTest,alphaHash:m.customDepthMaterial.alphaHash},distance:{alphaTest:m.customDistanceMaterial.alphaTest,alphaHash:m.customDistanceMaterial.alphaHash}}));
      const leafTransmission=lab.diagnostics().leafTransmission;
      return {foliageCoverage:lab.diagnostics().foliageCoverage,factor:leafTransmission?.factor??0,transmissionInstalled:!!leafTransmission,transmissionMode:leafTransmission?'installed':'off',alphaTest:foliage.alphaTest,alphaHash:foliage.alphaHash,coverageMaterials,preCompileErrors,compileErrors,tintReplay,renderer:(()=>{const e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);})()};
    },{foliageCoverage,factor});
    const validCoverage=foliageCoverage==='mask'?mode.alphaTest>0&&!mode.alphaHash:mode.alphaTest===0&&mode.alphaHash;
    const modeErrors=[...mode.preCompileErrors,...mode.compileErrors,...mode.tintReplay.flatMap(row=>[...row.base.errors,...row.tinted.errors,...row.restored.errors])];
    check(`${foliageCoverage} coverage compiles and renders at transmission ${factor}`,mode.foliageCoverage===foliageCoverage&&mode.factor===factor&&mode.transmissionInstalled===(factor>0)&&validCoverage&&modeErrors.length===0,mode);
    const foliageShadow=mode.coverageMaterials[1];
    check(`${foliageCoverage} ${factor} preserves the expected MASK/HASH foliage shadow paths`,['depth','distance'].every(pass=>foliageCoverage==='mask'?foliageShadow[pass].alphaTest>0&&!foliageShadow[pass].alphaHash:foliageShadow[pass].alphaHash),foliageShadow);
    check(`${foliageCoverage} transmission ${factor} tint changes and exactly restores pixels in both LODs`,mode.tintReplay.length===2&&mode.tintReplay.every(row=>row.base.hash!==row.tinted.hash&&row.base.hash===row.restored.hash),mode.tintReplay);
    modes.push(mode);
  }
  for(const coverage of ['mask','hash']){
    const off=modes.find(m=>m.foliageCoverage===coverage&&m.factor===0),on=modes.find(m=>m.foliageCoverage===coverage&&m.factor===.35);
    check(`${coverage} transmission .35 changes actual rendered pixels in both LODs`,!!off&&!!on&&[0,1].every(lod=>off.tintReplay[lod].base.hash!==on.tintReplay[lod].base.hash),{off,on});
  }
  check('browser is using the expected RTX 5090 hardware renderer',modes.every(m=>/RTX\s*5090/i.test(m.renderer)),modes.map(m=>m.renderer));
  report.tests.coverageAndTransmission=modes;
  report.errors=errors;report.failedRequests=failedRequests;
  check('no page/console errors',errors.length===0,errors);
  check('no failed requests',failedRequests.length===0,failedRequests);
  report.failures=failures;
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  assert.equal(failures.length,0,`${failures.length} browser assertions failed; see ${join(out,'report.json')}`);
  assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);
}catch(error){
  report.errors=errors;report.failedRequests=failedRequests;report.failures=failures;report.failure=String(error);
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');throw error;
}finally{await browser.close();}
