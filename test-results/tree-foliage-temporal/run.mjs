import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {browserArgs} from '../../tests/browser-options.mjs';
import {createRequire} from 'node:module';

const root=resolve('C:/LLM/IWSDK');
const candidate=join(root,'Assets/_assetctl/atlas-ez-family-f');
const lodFiles=[join(candidate,'atlas-ez-oak.glb'),join(candidate,'atlas-ez-oak.lod1.glb')];
const out=resolve('test-results/tree-foliage-temporal');
const base='http://127.0.0.1:5197/tree-asset-lab.html';
const sharp=createRequire(join(root,'tools/assetctl/package.json'))('sharp');
const sha=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
const waitFrames=(page,n=4)=>page.evaluate(count=>new Promise(resolve=>{let i=0;const step=()=>++i>=count?resolve():requestAnimationFrame(step);requestAnimationFrame(step);}),n);
const browser=await chromium.launch({headless:true,args:browserArgs});
await mkdir(out,{recursive:true});
const report={candidate,lodFiles,url:base,hardwareEnabled:!!process.env.ATLAS_HARDWARE,browserVersion:browser.version(),viewport:{width:1200,height:900,deviceScaleFactor:1},sourceHashes:{},inputHashes:{},modes:{},limitations:['Standalone local asset lab; not full-game, XR, or headset acceptance.','AlphaHash is tested without temporal antialiasing; coverage stability is not visual acceptance.','The same RTX 5090 and browser session were used serially; timings describe this lab scene only.']};
for(const path of ['tree-asset-lab.html','src/tree-asset-lab.ts','src/tree-asset.ts','src/world-time.ts']) report.sourceHashes[path]=await sha(join(root,'universe-atlas-rendering',path));
report.inputHashes={lod0:await sha(lodFiles[0]),lod1:await sha(lodFiles[1])};
const rgba=async p=>sharp(p).ensureAlpha().raw().toBuffer();
const compare=async(a,b)=>{const [x,y]=await Promise.all([rgba(a),rgba(b)]);assert.equal(x.length,y.length);let changed=0,sum=0,max=0;for(let i=0;i<x.length;i+=4){const d=Math.max(Math.abs(x[i]-y[i]),Math.abs(x[i+1]-y[i+1]),Math.abs(x[i+2]-y[i+2]),Math.abs(x[i+3]-y[i+3]));if(d){changed++;sum+=d;max=Math.max(max,d);}}return {changedPixels:changed,meanMaxChannelDelta:sum/(x.length/4),maxChannelDelta:max,totalPixels:x.length/4};};
const loadBuffers=await Promise.all(lodFiles.map(path=>readFile(path)));
for(const mode of ['mask','hash']){
  const dir=join(out,mode);await mkdir(dir,{recursive:true});
  const page=await browser.newPage({viewport:report.viewport,deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('[vite] failed to connect to websocket.'))errors.push(m.text());});
  await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__treeAssetLab);
  await page.locator('#coverage').selectOption(mode);
  await page.locator('#lod0-file').setInputFiles(lodFiles[0]);await page.locator('#lod1-file').setInputFiles(lodFiles[1]);await page.locator('#load-assets').click();
  await page.waitForFunction(()=>window.__treeAssetLab?.diagnostics().ready&&!window.__treeAssetLab.diagnostics().loading,{timeout:60000});
  await page.evaluate(()=>{const l=window.__treeAssetLab;l.controls.enableDamping=false;l.setPopulation(3);l.setLOD(0);l.setDate(0n);l.camera.position.set(13,13,30);l.camera.lookAt(0,8,0);l.camera.updateProjectionMatrix();});await waitFrames(page,12);
  const loaded=await page.evaluate(()=>{
    const l=window.__treeAssetLab,d=l.diagnostics(),gl=l.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
    return {diagnostics:d,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):null,materialContract:d.coverageMaterials.color.map((entry,i)=>({name:entry.name,color:{alphaTest:entry.alphaTest,alphaHash:entry.alphaHash},i})),batches:l.batches.map(b=>b.meshes.map(m=>({name:m.material.name,depth:{alphaTest:m.customDepthMaterial.alphaTest,alphaHash:m.customDepthMaterial.alphaHash},distance:{alphaTest:m.customDistanceMaterial.alphaTest,alphaHash:m.customDistanceMaterial.alphaHash},castShadow:m.castShadow,receiveShadow:m.receiveShadow}))),memory:{...d.renderer}};
  });
  assert.match(loaded.renderer,/RTX 5090|GeForce RTX 5090/i,'must use actual RTX 5090 hardware');
  const foliage=loaded.materialContract.find(m=>m.name==='MAT_AtlasFoliage')?.color;
  const bark=loaded.materialContract.find(m=>m.name==='MAT_AtlasBark')?.color;
  assert.ok(foliage&&foliage.alphaHash===(mode==='hash')&&foliage.alphaTest===(mode==='hash'?0:.5),`${mode} color material settings`);
  assert.ok(bark&&bark.alphaHash===false&&bark.alphaTest===0,'bark settings unchanged');
  for(const level of loaded.batches) for(const m of level){const expected=m.name==='MAT_AtlasFoliage';assert.equal(m.depth.alphaHash,mode==='hash'&&expected);assert.equal(m.distance.alphaHash,mode==='hash'&&expected);assert.equal(m.depth.alphaTest,mode==='hash'&&expected?0:expected?.5:0);assert.equal(m.distance.alphaTest,mode==='hash'&&expected?0:expected?.5:0);assert.equal(m.castShadow,true);assert.equal(m.receiveShadow,true);}
  const capture=async name=>{await waitFrames(page,4);const data=await page.evaluate(()=>{const l=window.__treeAssetLab;l.renderer.render(l.scene,l.camera);return l.renderer.domElement.toDataURL('image/png');});const path=join(dir,name+'.png');await writeFile(path,Buffer.from(data.split(',')[1],'base64'));return path;};
  const snap={};
  await page.evaluate(()=>{const l=window.__treeAssetLab;l.renderer.shadowMap.enabled=true;l.sun.castShadow=true;for(const b of l.batches)for(const m of b.meshes){m.castShadow=true;m.receiveShadow=true;}});
  for(const lod of [0,1]) for(const side of ['front','back']){
    await page.evaluate(([n,side])=>{const l=window.__treeAssetLab;l.setLOD(n);l.sun.position.set(...(side==='front'?[40,30,70]:[-40,30,-70]));},[lod,side]);
    snap[`lod${lod}-${side}-shadows-on`]=await capture(`lod${lod}-${side}-shadows-on`);
  }
  await page.evaluate(()=>{const l=window.__treeAssetLab;l.sun.castShadow=false;l.renderer.shadowMap.enabled=false;for(const b of l.batches)for(const m of b.meshes){m.castShadow=false;m.receiveShadow=false;}l.setLOD(0);});
  snap.wind0a=await capture('wind-0-a');
  await page.evaluate(()=>window.__treeAssetLab.setDate(1750000000n));snap.wind175=await capture('wind-1750000000');
  await page.evaluate(()=>window.__treeAssetLab.setDate(7000000000n));snap.wind7s=await capture('wind-7s');
  await page.evaluate(()=>window.__treeAssetLab.setDate(-7000000000n));snap.windNeg7s=await capture('wind-neg7s');
  await page.evaluate(()=>window.__treeAssetLab.setDate(0n));snap.wind0b=await capture('wind-0-b');
  const wind={move:await compare(snap.wind0a,snap.wind175),period7s:await compare(snap.wind0a,snap.wind7s),negativePeriod:await compare(snap.wind0a,snap.windNeg7s),staticRepeat:await compare(snap.wind0a,snap.wind0b)};
  assert.ok(wind.move.changedPixels>0,`${mode} wind phase should move rendered pixels`);
  // Small camera perturbations at a fixed date expose temporal coverage instability; no TAA is enabled.
  const yaw=[];
  for(const degrees of [0,.35,.7,1.05]){
    await page.evaluate(deg=>{const l=window.__treeAssetLab,r=30,a=deg*Math.PI/180;l.camera.position.set(13*Math.cos(a)+r*Math.sin(a),13,30*Math.cos(a)-13*Math.sin(a));l.camera.lookAt(0,8,0);l.camera.updateProjectionMatrix();},degrees);
    const path=await capture(`yaw-${degrees.toFixed(2)}deg`);yaw.push({degrees,path});
  }
  for(let i=1;i<yaw.length;i++)yaw[i].step=await compare(yaw[i-1].path,yaw[i].path);
  const profileRows=[];
  await page.evaluate(()=>{const l=window.__treeAssetLab;l.sun.castShadow=true;l.renderer.shadowMap.enabled=true;for(const b of l.batches)for(const m of b.meshes){m.castShadow=true;m.receiveShadow=true;}l.setPopulation(192);l.camera.position.set(40,22,64);l.camera.lookAt(0,9,0);l.camera.updateProjectionMatrix();});
  for(const lod of [0,1]){
    await page.evaluate(n=>{const l=window.__treeAssetLab;l.setLOD(n);l.profile.clear();},lod);await waitFrames(page,120);await page.evaluate(()=>window.__treeAssetLab.profile.clear());await waitFrames(page,180);
    profileRows.push(await page.evaluate(n=>({lod:n,population:192,coverage:window.__treeAssetLab.diagnostics().foliageCoverage,renderer:window.__treeAssetLab.diagnostics().renderer,profile:window.__treeAssetLab.profile.diagnostics()}),lod));
  }
  const before=await page.evaluate(()=>{const l=window.__treeAssetLab;l.setPopulation(3);l.setLOD(0);l.setDate(0n);l.renderer.render(l.scene,l.camera);return l.diagnostics().renderer;});
  await page.evaluate(async mode=>{const l=window.__treeAssetLab,files=[...document.querySelectorAll('input[type=file]')].map(x=>x.files[0]);await l.load(await Promise.all(files.map(f=>f.arrayBuffer())),{foliageCoverage:mode});},mode);await waitFrames(page,10);
  const after=await page.evaluate(()=>{const l=window.__treeAssetLab;l.renderer.render(l.scene,l.camera);return l.diagnostics().renderer;});
  const row={loaded,wind,cameraYawSteps:yaw,profiles:profileRows,reloadMemory:{before,after},screenshots:snap,errors};
  report.modes[mode]=row;assert.deepEqual(errors,[]);
  await writeFile(join(dir,'report.json'),JSON.stringify(row,null,2)+'\n');await page.close();
}
const cross={};
for(const key of ['lod0-front-shadows-on','lod0-back-shadows-on','lod1-front-shadows-on','lod1-back-shadows-on','wind0a','wind175','wind7s','windNeg7s'])cross[key]=await compare(report.modes.mask.screenshots[key],report.modes.hash.screenshots[key]);
report.crossModePixels=cross;
await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
await browser.close();
