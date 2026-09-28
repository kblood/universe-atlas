import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {browserArgs} from '../../../tests/browser-options.mjs';

const candidate=resolve('C:/LLM/IWSDK/Assets/_assetctl/atlas-ez-family-f');
const lod0=resolve(candidate,'atlas-ez-oak.glb');
const lod1=resolve(candidate,'atlas-ez-oak.lod1.glb');
const out=resolve('test-results/tree-ez-family-v1/candidate-f-canvasfinal/gl-check.json');
const browser=await chromium.launch({headless:true,args:browserArgs});
const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  if(typeof page.routeWebSocket==='function')await page.routeWebSocket('**/*',s=>s.close());
  await page.goto('http://127.0.0.1:5197/tree-asset-lab.html',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!!window.__treeAssetLab);
  await page.locator('#lod0-file').setInputFiles(lod0);await page.locator('#lod1-file').setInputFiles(lod1);await page.locator('#load-assets').click();
  await page.waitForFunction(()=>window.__treeAssetLab.diagnostics().ready);
  const states=[];
  for(const date of ['0','1750000000','7000000000'])for(const lod of [0,1])for(const population of [3,64,192]){
    const state=await page.evaluate(({date:d,lod:l,population:p})=>{
      const lab=window.__treeAssetLab;lab.setDate(BigInt(d));lab.setLOD(l);lab.setPopulation(p);lab.renderer.render(lab.scene,lab.camera);
      const gl=lab.renderer.getContext(),errors=[];for(let i=0;i<16;i++){const e=gl.getError();if(e===gl.NO_ERROR)break;errors.push(e);}
      const ext=gl.getExtension('WEBGL_debug_renderer_info');
      return {date:d,lod:l,population:p,errors,renderer:gl.getParameter(gl.RENDERER),unmaskedRenderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null};
    },{date,lod,population});
    states.push(state);assert.deepEqual(state.errors,[]);
  }
  assert.match(states[0].unmaskedRenderer??'',/NVIDIA GeForce RTX 5090/i);
  assert.deepEqual(errors,[]);
  await writeFile(out,JSON.stringify({candidate,lodTriangles:[13806,4866],browserVersion:browser.version(),states,pageErrors:errors},null,2)+'\n');
}finally{await browser.close();}
