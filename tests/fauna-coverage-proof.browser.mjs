import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {acquireGpuLock} from './helpers/gpu-lock.mjs';
import {startOnFreePort,stopServer} from './helpers/free-port.mjs';
const out=process.env.ATLAS_RESULTS||'test-results/fauna-coverage-proof';await mkdir(out,{recursive:true});const report={ok:false,errors:[],hashes:{}};let server,lock,browser;
try{for(const file of ['src/fauna-coverage.ts','src/fauna-field-renderer.ts','src/fauna-skinned-batch.ts'])report.hashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');
 server=await startOnFreePort({url:p=>`http://127.0.0.1:${p}/tests/fauna-coverage-proof.html`,spawnServer:p=>spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(p),'--strictPort'],{stdio:'ignore'})});
 lock=await acquireGpuLock({owner:'fauna identical-geometry coverage proof',capture:true,retryMs:30000});browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});const page=await browser.newPage();page.on('pageerror',e=>{report.errors.push(String(e));console.error(String(e));});page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto(`http://127.0.0.1:${server.port}/tests/fauna-coverage-proof.html`);await page.waitForFunction(()=>window.__faunaCoverageProof,undefined,{timeout:60000});Object.assign(report,await page.evaluate(()=>window.__faunaCoverageProof));
 assert.deepEqual(report.errors,[]);assert.equal(report.rows.length,33);for(const row of report.rows){assert(row.referencePixels>100);for(const key of ['referenceDifferences','holes','overlap','outside'])assert.equal(row[key],0,`${row.pass} coverage${row.coverage} ${key}`);}report.ok=true;
}finally{await browser?.close();await lock?.release();if(server)await stopServer(server.child);await writeFile(out+'/report.json',JSON.stringify(report,null,2));}
