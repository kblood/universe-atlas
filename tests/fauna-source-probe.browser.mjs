import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {acquireGpuLock} from './helpers/gpu-lock.mjs';
import {startOnFreePort,stopServer} from './helpers/free-port.mjs';
import {prepareFaunaReferenceBody} from './helpers/fauna-reference-body.mjs';
const root='C:/LLM/IWSDK/Assets/_assetctl/animal-system-20261010',receipt=JSON.parse(await readFile(root+'/lod-runtime-float-into-fixed/report.json','utf8'));
const state=receipt.worlds[1].arrival,id='G001/C-715,-331,-495/0/planet/1:fauna:eea975f3',genome=state.tiles.faunaDrawn.find(x=>x.id===id).genome;
const reference=await prepareFaunaReferenceBody();let server,browser,lock;const report={id,reference:reference.manifest,reportedWorkerSourceDigest:state.faunaLod.ownership.find(x=>x.id===id).sourceDigest};
try{server=await startOnFreePort({url:p=>`http://127.0.0.1:${p}/tests/fauna-source-probe.html`,spawnServer:p=>spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(p),'--strictPort'],{stdio:'ignore'})});
 lock=await acquireGpuLock({owner:'CPU Chromium source identity diagnostic',capture:true,retryMs:30000});browser=await chromium.launch({headless:true,args:['--disable-gpu']});const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.port}/tests/fauna-source-probe.html`);
 report.chromium=await page.evaluate(async ({genome,module})=>{const {buildQuadrupedBody}=await import(module),body=buildQuadrupedBody(genome),arrays=['positions','normals','colors','skinIndex','skinWeight','index'],bytes=new Uint8Array(arrays.reduce((n,f)=>n+body[f].byteLength,0));let offset=0;const fields={};
  for(const f of arrays){const a=body[f],view=new Uint8Array(a.buffer,a.byteOffset,a.byteLength);bytes.set(view,offset);offset+=a.byteLength;fields[f]={type:a.constructor.name,length:a.length,sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',view)),x=>x.toString(16).padStart(2,'0')).join('')};}
  return {sourceModule:'original f96 source transpiled by Vite, Chromium CPU only',digest:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join(''),fields};},{genome,module:reference.url});
}finally{await browser?.close();await lock?.release();if(server)await stopServer(server.child);await writeFile(root+'/lod-runtime-float-into-fixed/source-cross-engine-probe.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
