import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {browserArgs} from '../../tests/browser-options.mjs';
const out=process.env.ATLAS_RESULTS||'test-results/family-canopy/shader-fbe3c26';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width:1000,height:700}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const report={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'isolated actual-family shader compile and render, not game acceptance',errors};
report.dirty=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().length>0;
report.sources={};
for(const path of ['src/tree-asset.ts','src/tree-canopy-profile.ts','src/forest-impostor.ts','src/forest-presentation.ts','src/forest-coverage.ts','src/forest-asset-source.ts'])
 report.sources[path]=createHash('sha256').update(await readFile(path)).digest('hex');
try{
 await page.goto('http://127.0.0.1:5197/guide/life.html');
 report.result=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/.vite/deps/three.js');
  const {ForestAssetSource}=await import('/src/forest-asset-source.ts');
  const {loadTreeAssetFamily}=await import('/src/tree-asset.ts');
  const {ForestImpostors}=await import('/src/forest-impostor.ts');
  const {packForestPresentation}=await import('/src/forest-presentation.ts');
  const source=new ForestAssetSource(new URL('/assets/forest/desktop-v1/forest-bundle-manifest.json',location.href));
  const bundle=await source.load(),families=[];
  for(const input of bundle.inputs)families.push({kind:input.kind,family:await loadTreeAssetFamily(input.lod0,input.lod1,{foliageMipSidecar:input.foliageMipSidecar})});
  document.body.replaceChildren();document.body.style.margin='0';
  const renderer=new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true});renderer.setSize(1000,700);document.body.append(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color(.25,.32,.4);
  scene.add(new THREE.HemisphereLight(0xc8dcff,0x413f30,2));const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(12,24,15);scene.add(sun);
  const camera=new THREE.PerspectiveCamera(45,1000/700,.1,1000);camera.position.set(0,14,65);camera.lookAt(0,8,0);
  const far=new ForestImpostors(4);scene.add(far.mesh);
  const stats=[];
  for(const [i,{kind,family}] of families.entries()){
   far.setFamilyPresentation(kind,family.canopyPresentation);
   far.write(i,new THREE.Vector3(i===0?-12:12,0,0),16,new THREE.Quaternion(),.5,0);
   far.setPresentation(i,packForestPresentation(kind,1,1));
   stats.push({kind,presentation:family.canopyPresentation});
  }
  far.commit();renderer.render(scene,camera);await renderer.compileAsync(scene,camera);renderer.render(scene,camera);
  const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  return {families:stats,draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,glError:gl.getError(),
   renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,programs:renderer.info.programs.map(p=>({name:p.name,diagnostics:p.diagnostics}))};
 });
 await page.screenshot({path:`${out}/families.png`});assert.equal(report.result.glError,0);assert.deepEqual(errors,[]);report.ok=true;
}catch(error){report.ok=false;report.failure=String(error);throw error;}
finally{await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({ok:report.ok,renderer:report.result?.renderer,errors}));
