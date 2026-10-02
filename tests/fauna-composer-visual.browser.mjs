import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {browserArgs} from './browser-options.mjs';
import {withGpuLock} from './helpers/gpu-lock.mjs';

const origin=new URL(process.env.ATLAS_URL||'http://127.0.0.1:5193').origin;
const output=process.env.ATLAS_RESULTS||'test-results/fauna-opus-modular-001/independent-visual-001';
await mkdir(output,{recursive:false});
const sourceFiles=['fauna-composer.ts','fauna-composer-recipe.ts','fauna-composer-rig.ts','fauna-composer-mesh.ts'];
const snapshot=async()=>Object.fromEntries(await Promise.all(sourceFiles.map(async name=>[name,createHash('sha256').update(await readFile(new URL(`../src/${name}`,import.meta.url))).digest('hex')])));
const before=await snapshot(),errors=[],samples=[];
const html=`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#343a3d;color:white;font:16px system-ui}canvas{display:block}#label{position:absolute;left:18px;top:14px;background:#202529dd;padding:10px;max-width:820px}</style><div id="label"></div><script type="module">
import * as THREE from '/node_modules/three/build/three.module.js';
import {createComposerCreature} from '/src/fauna-composer.ts';
import {COMPOSER_PRESETS,composerPreset} from '/src/fauna-composer-recipe.ts';
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(960,720);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#343a3d');scene.add(new THREE.HemisphereLight(0xe4edff,0x6a6258,2));const light=new THREE.DirectionalLight(0xfff1df,3);light.position.set(4,7,5);scene.add(light);renderer.shadowMap.enabled=false;
const grid=new THREE.GridHelper(14,28,0x727d81,0x4a5358);grid.position.y=-.01;scene.add(grid);
const camera=new THREE.OrthographicCamera(-1,1,1,-1,.001,1000);let animal;
function frame(box,view){const centre=box.getCenter(new THREE.Vector3());const direction=new THREE.Vector3(...(view==='side'?[0,.12,1]:view==='front'?[1,.1,0]:[1.2,.65,1.6])).normalize();camera.position.copy(centre).addScaledVector(direction,box.getSize(new THREE.Vector3()).length()*3+1);camera.lookAt(centre);camera.updateMatrixWorld(true);let maxX=0,maxY=0;for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);maxX=Math.max(maxX,Math.abs(p.x));maxY=Math.max(maxY,Math.abs(p.y));}const half=Math.max(maxY,maxX/(960/720),.05)*1.25;camera.top=half;camera.bottom=-half;camera.left=-half*960/720;camera.right=half*960/720;camera.updateProjectionMatrix();}
window.specimen={ids:Object.keys(COMPOSER_PRESETS),draw(id,view,motion='neutral',time=0){if(animal)animal.dispose();animal=createComposerCreature(composerPreset(id));scene.add(animal.group);animal.update(motion,time);scene.updateMatrixWorld(true);renderer.render(scene,camera);const bounds=animal.bounds();frame(bounds,view);document.querySelector('#label').textContent=id+' · '+view+' · '+motion+' '+time+'s · experimental geometry';renderer.render(scene,camera);const b={min:bounds.min.toArray(),max:bounds.max.toArray()};return {id,view,motion,time,recipe:composerPreset(id),bounds:b,details:animal.details(),renderer:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,memory:{...renderer.info.memory}}};},dispose(){animal?.dispose();renderer.dispose();}};
</script>`;
await withGpuLock({owner:'composer-independent-visual',timeoutMs:60000,staleMs:Infinity},async()=>{
 const browser=await chromium.launch({headless:true,args:browserArgs});
 try{
  const page=await browser.newPage({viewport:{width:960,height:720}});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/tests/composer-independent-review.html',route=>route.fulfill({contentType:'text/html',body:html}));
  await page.goto(origin+'/tests/composer-independent-review.html');
  await page.waitForFunction(()=>window.specimen, null,{timeout:30000});
  const ids=await page.evaluate(()=>window.specimen.ids);assert.equal(ids.length,12);
  for(const id of ids)for(const [view,motion,time] of [['hero','neutral',0],['side','neutral',0],['front','neutral',0],['hero','walk',.35]]){
   const sample=await page.evaluate(args=>window.specimen.draw(...args),[id,view,motion,time]);
   assert(sample.bounds.min.concat(sample.bounds.max).every(Number.isFinite),`${id}: finite actual posed bounds`);
   assert(sample.details.withinBudget,`${id}: declared budget`);assert(sample.details.vertices>0&&sample.details.triangles>0);
   const file=`${id}-${view}-${motion}.png`;await page.screenshot({path:join(output,file)});samples.push({...sample,file});console.log(file);
  }
  await page.evaluate(()=>window.specimen.dispose());
  const figures=await Promise.all(samples.filter(s=>s.view==='hero'&&s.motion==='neutral').map(async s=>`<figure><img src="data:image/png;base64,${(await readFile(join(output,s.file))).toString('base64')}"><figcaption>${s.id}</figcaption></figure>`));
  await page.setViewportSize({width:1920,height:1560});await page.setContent(`<style>body{margin:0;background:#202529;color:white;font:20px system-ui;display:grid;grid-template-columns:repeat(4,1fr)}figure{margin:0;padding:6px}img{width:100%;display:block}figcaption{padding:4px}</style>${figures.join('')}`);await page.screenshot({path:join(output,'contact-sheet.png'),fullPage:true});
 }finally{await browser.close();}
});
const after=await snapshot();
await writeFile(join(output,'report.json'),JSON.stringify({technicalChecks:errors.length===0,visualAcceptance:false,errors,sourceBefore:before,sourceAfter:after,sourceStable:JSON.stringify(before)===JSON.stringify(after),lighting:{shadows:false,reason:'Isolate actual geometry and attachments from renderer shadow artifacts',normalizedFraming:true,metreScaleComparison:false},samples},null,2));
assert.deepEqual(errors,[],'No browser errors');console.log('GPU clear; inspect images before visual acceptance.');
