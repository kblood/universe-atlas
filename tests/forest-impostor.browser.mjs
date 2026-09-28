import {chromium} from 'playwright';
import {createServer} from 'vite';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {browserArgs} from './browser-options.mjs';
const out=process.env.ATLAS_RESULTS||'test-results/forest-impostor';await mkdir(out,{recursive:true});
const server=await createServer({configFile:false,root:process.cwd(),server:{host:'127.0.0.1',port:0},appType:'custom'});await server.listen();
const base=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true,args:browserArgs}),page=await browser.newPage({viewport:{width:520,height:520}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
let report;
try{
  await page.route(`${base}/impostor-test`,r=>r.fulfill({contentType:'text/html',body:'<!doctype html><style>body{margin:0;background:#223}</style><script type="module" src="/tests/forest-impostor-lab.mjs"></script>'}));
  await page.goto(`${base}/impostor-test`);await page.waitForFunction(()=>window.labReady,{}, {timeout:90000});assert.deepEqual(errors,[]);
  report=await page.evaluate(()=>{
    const lab=window.impostorLab;lab.far.uniforms.treeFaceted.value=0;const full=lab.compare(1);
    let low=.75,high=1;for(let i=0;i<8;i++){const scale=(low+high)/2,result=lab.compare(scale),mean=result.ratios.reduce((s,v)=>s+v,0)/64;if(mean>1)high=scale;else low=scale;}
    const fitted=lab.compare((low+high)/2);lab.far.uniforms.treeFaceted.value=1;
    const faceted=lab.compare(1),inflated=lab.compare(1,2),masks=lab.verifyMasks(),perspective=lab.verifyDepthAndPerspective(),antialiasing=lab.verifyAntialiasing();
    const gl=lab.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
    return {acceptedRepresentation:'faceted mesh planes',acceptedScale:1,rejectedRepresentation:'fitted smooth ellipsoids',
      renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable',poses:lab.poses,referenceAreas:lab.referenceAreas,
      uncalibrated:full,fitted,faceted,inflated,masks,perspective,antialiasing,meanError:faceted.ratios.reduce((s,v)=>s+Math.abs(v-1),0)/64,maxError:Math.max(...faceted.ratios.map(v=>Math.abs(v-1)))};
  });
  assert.ok(report.referenceAreas.every(x=>x>100),'reference draws visible silhouettes');
  assert.ok(report.fitted.areas.every(x=>x>100),'impostor draws visible silhouettes');
  // Rasterization/interpolation can disagree at a boundary. Check actual masks,
  // not net area alone: every changed pixel must touch the one-pixel silhouette edge.
  assert.ok(report.maxError<.001,'faceted shape preserves projected area to 0.1%');
  for(const aa of report.antialiasing){assert.equal(aa.enabled,Number(aa.samples>1));assert.ok(aa.maxRelativeAreaError<.01,'MSAA projected coverage stays within 1%');}
  for(const masks of [...report.masks,...report.perspective])for(const key of ['reference','bounds']){
    assert.equal(masks[key].interior,0,`${key} has no interior silhouette mismatch`);
    assert.ok(masks[key].changed<=32,`${key} has at most 32 edge pixel differences`);
  }
  await page.evaluate(()=>window.impostorLab.show(false));await page.screenshot({path:`${out}/reference.png`});
  await page.evaluate(()=>window.impostorLab.show(true));await page.screenshot({path:`${out}/impostor.png`});
  await page.evaluate(()=>window.impostorLab.show(false,[1,.4,2],1,true));await page.screenshot({path:`${out}/reference-lit.png`});
  await page.evaluate(()=>window.impostorLab.show(true,[1,.4,2],1,true));await page.screenshot({path:`${out}/impostor-lit.png`});
  assert.deepEqual(errors,[]);report.ok=true;report.errors=errors;report.scope='Isolated 64-view orthographic silhouettes, perspective bounds and opaque depth at 24/64/650/4000m; not game/streaming acceptance';
  report.recordedAt=new Date().toISOString();report.source={baseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),files:[]};
  for(const path of ['src/forest-impostor.ts','src/tree-shape.ts','tests/forest-impostor-lab.mjs','tests/forest-impostor.browser.mjs'])report.source.files.push({path,sha256:createHash('sha256').update(await readFile(path)).digest('hex')});
  await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({ok:true,renderer:report.renderer,acceptedScale:report.acceptedScale,rejectedEllipsoidFitScale:report.fitted.scale,meanError:report.meanError,maxError:report.maxError}));
}catch(error){await writeFile(`${out}/failure.json`,JSON.stringify({error:String(error),errors,report},null,2));await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error;}
finally{await page.evaluate(()=>window.impostorLab?.dispose()).catch(()=>{});await browser.close();await server.close();}
