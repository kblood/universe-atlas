/** Isolated renderer comparison; no production flags or app assets changed. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {acquireGpuLock} from './helpers/gpu-lock.mjs';
import {startOnFreePort,stopServer} from './helpers/free-port.mjs';
const out=process.env.ATLAS_RESULTS||'test-results/body-lod-gpu';await mkdir(out,{recursive:true});
const server=await startOnFreePort({url:p=>`http://127.0.0.1:${p}/tests/fauna-body-lod-lab.html`,spawnServer:p=>
  spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(p),'--strictPort'],{stdio:'ignore'})});
let browser,lock,page;const streaming=new URLSearchParams({paletteRingSize:process.env.BODY_LOD_RING_SIZE||'1',paletteUploadMode:process.env.BODY_LOD_UPLOAD_MODE||'full',movingStride:process.env.BODY_LOD_MOVING_STRIDE||'1'});
if(process.env.BODY_LOD_DATA)streaming.set('data',process.env.BODY_LOD_DATA);
if(process.env.BODY_LOD_COMPACT)streaming.set('compact',process.env.BODY_LOD_COMPACT);
const report={prototypeOnly:true,errors:[],rows:[],scope:'one desktop prototype; full update CPU includes activity+selectedpose+submission; no release gate',poseMode:process.env.BODY_LOD_POSE_MODE||'canonical',paletteStreaming:Object.fromEntries(streaming)};
try{
  lock=await acquireGpuLock({owner:'body LOD GPU prototype',capture:true,retryMs:30000});
  browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu','--disable-renderer-backgrounding','--disable-background-timer-throttling']});
  page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${server.port}/tests/fauna-body-lod-lab.html?${streaming}`);await page.waitForFunction(()=>window.__lodLab,undefined,{timeout:90000});
  report.renderer=await page.evaluate(()=>{const gl=window.__lodLab.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(e.UNMASKED_RENDERER_WEBGL);});
  if(process.env.BODY_LOD_REST_GALLERY==='1'){
    for(const [mode,target] of [['source',0],['derived',1500],['derived',500]])for(let sample=0;sample<6;sample++){
      await page.evaluate(({mode,target,sample})=>{const l=window.__lodLab;l.setRestPose(true);l.choose(mode,target,6);l.closeup(sample);},{mode,target,sample});
      await page.waitForTimeout(400);await page.screenshot({path:out+`/rest-${mode}-${target}-sample${sample}.png`});
    }
    assert.deepEqual(report.errors,[],'rest gallery shader errors');report.ok=true;report.restPalette='identity for source and every derived bone; original attributes';
    await writeFile(out+'/report.json',JSON.stringify(report,null,2));
  }else{
  for(const [mode,target,method] of JSON.parse(process.env.BODY_LOD_VARIANTS||'[["body2",500],["derived",1500],["derived",500],["derived",200]]')){
    for(const paused of [true,false]){
      await page.evaluate(({mode,target,method,paused,poseMode,count})=>{const l=window.__lodLab;l.choose(mode,target,count,method);l.setPoseMode(poseMode);l.field();l.setPaused(paused);},{mode,target,method,paused,poseMode:process.env.BODY_LOD_POSE_MODE||'canonical',count:Number(process.env.BODY_LOD_COUNT||512)});
      await page.waitForTimeout(2000);
      const timings=await page.evaluate(()=>new Promise(resolve=>{
        const l=window.__lodLab,gl=l.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),cpu=[],renderCpu=[],gpu=[],pending=[];
        const original=l.renderer.render.bind(l.renderer);let frames=0;
        l.renderer.render=function(...args){
          for(let i=pending.length-1;i>=0;i--){const q=pending[i];if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){
            if(!gl.getParameter(ext.GPU_DISJOINT_EXT))gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);pending.splice(i,1);}}
          const q=ext&&pending.length<8?gl.createQuery():null;if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);
          const renderStarted=performance.now();original(...args);renderCpu.push(performance.now()-renderStarted);if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(q);}cpu.push(l.info().lastCpu);
          if(++frames>=120){l.renderer.render=original;const stats=a=>{a.sort((x,y)=>x-y);return {samples:a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)};};
            const result={cpu:stats(cpu),renderCpu:stats(renderCpu),gpu:stats(gpu),info:l.info()};for(const q of pending)gl.deleteQuery(q);resolve(result);}
        };
      }));
      report.rows.push({mode,target,method,paused,...timings});await writeFile(out+'/report.json',JSON.stringify(report,null,2));
      if(process.env.BODY_LOD_COMPACT&&mode==='derived'){
        const b=timings.info.backend;assert.equal(b.prepared,Number(process.env.BODY_LOD_COUNT||512));assert.equal(b.geometryEntries,b.prepared);
        assert.equal(b.cacheBytes,0);assert.equal(b.basisCacheBytes,0);assert.equal(b.pendingGeometryEntries,0);assert.equal(b.pendingAppearanceGeometry,false);assert.equal(b.rejected,0);
        if(paused)assert.equal(b.paletteUploadBytes,0);
        report.admissionScope='Distinct owner keys each registered/prepared interleaved; frozen fixture genomes reused, not a distinct-genome quality corpus';
      }
      console.log(JSON.stringify({mode,target,paused,cpu:timings.cpu,renderCpu:timings.renderCpu,gpu:timings.gpu,draw:timings.info.render,backend:timings.info.backend}));
    }
    await page.evaluate(fixed=>{if(fixed){window.__lodLab.setRestPose(true);window.__lodLab.setPaused(true);}window.__lodLab.closeup(0);},process.env.BODY_LOD_FIXED_CAPTURE==='1');await page.waitForTimeout(1000);
    await page.screenshot({path:out+`/${mode}-${target}${method?'-'+method:''}-close.png`});
  }
  assert.deepEqual(report.errors,[],'no shader/page errors in measured variants');
  report.ok=true;await writeFile(out+'/report.json',JSON.stringify(report,null,2));
  }
}catch(error){report.failure=String(error);await writeFile(out+'/report.json',JSON.stringify(report,null,2));throw error;}
finally{await browser?.close();await lock?.release();await stopServer(server.child);}
