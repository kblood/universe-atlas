import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {acquireGpuLock} from './helpers/gpu-lock.mjs';
import {startOnFreePort,stopServer} from './helpers/free-port.mjs';
const out=process.env.ATLAS_RESULTS||'test-results/crisp-field-probe';await mkdir(out,{recursive:true});
const server=await startOnFreePort({url:p=>`http://127.0.0.1:${p}/tests/fauna-crisp-field-probe.html`,spawnServer:p=>spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(p),'--strictPort'],{stdio:'ignore'})});
let lock,browser;const report={errors:[],ok:false};
try{lock=await acquireGpuLock({owner:'planet coat shader constant-field parity',capture:true,retryMs:30000});browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${server.port}/tests/fauna-crisp-field-probe.html`);await page.waitForFunction(()=>window.__crispFieldProbe,undefined,{timeout:90000});Object.assign(report,await page.evaluate(()=>window.__crispFieldProbe));
  assert.deepEqual(report.errors,[]);assert(report.results.length>=12);assert(report.maxDifference<=3,'GPU field differs more than documented3/255 float/quantization tolerance');report.ok=true;
}finally{await browser?.close();await lock?.release();await stopServer(server.child);await writeFile(out+'/report.json',JSON.stringify(report,null,2));}
