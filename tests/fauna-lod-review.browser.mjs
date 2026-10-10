import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {acquireGpuLock} from './helpers/gpu-lock.mjs';
import {startOnFreePort,stopServer} from './helpers/free-port.mjs';
const out=process.env.ATLAS_RESULTS||'test-results/fauna-lod-review';await mkdir(out,{recursive:true});
const server=await startOnFreePort({url:p=>`http://127.0.0.1:${p}/tests/fauna-lod-review.html`,spawnServer:p=>spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(p),'--strictPort'],{stdio:'ignore'})});
const report={errors:[],reviews:[],scope:'canonical loaded geometry with same exact 22-bone palette; flat-ground side/front review only, not production integration or Quest acceptance'};let lock,browser;
try{
  lock=await acquireGpuLock({owner:'canonical animal LOD anatomy review',capture:true,retryMs:30000});browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});
  const page=await browser.newPage({viewport:{width:1440,height:1120}});page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${server.port}/tests/fauna-lod-review.html`);await page.waitForFunction(()=>window.__animalLodReview?.ready,undefined,{timeout:90000});
  const count=await page.evaluate(()=>window.__animalLodReview.count);
  const selectedRows=process.env.LOD_REVIEW_ROWS?JSON.parse(process.env.LOD_REVIEW_ROWS):Array.from({length:count},(_,i)=>i);
  const views=process.env.LOD_REVIEW_VIEWS?JSON.parse(process.env.LOD_REVIEW_VIEWS):['side','front'];
  for(const row of selectedRows)for(const pose of ['rest','walk','feed'])for(const view of views){
    const result=await page.evaluate(({row,pose,view})=>window.__animalLodReview.review(row,pose,view),{row,pose,view});report.reviews.push(result);
    await page.screenshot({path:`${out}/${row}-${pose}-${view}.png`});await writeFile(out+'/report.json',JSON.stringify(report,null,2));
    console.log(JSON.stringify({row,pose,view,worstSilhouette:Math.min(...result.panels.map(p=>p.silhouetteIoU)),worstFoot:Math.min(...result.panels.map(p=>p.footRegionIoU))}));
  }
  assert.deepEqual(report.errors,[]);report.ok=true;
}finally{await browser?.close();await lock?.release();await stopServer(server.child);await writeFile(out+'/report.json',JSON.stringify(report,null,2));}
