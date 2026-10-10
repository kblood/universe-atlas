import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {startOnFreePort,stopServer} from './helpers/free-port.mjs';
import {acquireGpuLock} from './helpers/gpu-lock.mjs';
import {prepareFaunaReferenceBody} from './helpers/fauna-reference-body.mjs';
const out=process.env.ATLAS_RESULTS;if(!out)throw new Error('ATLAS_RESULTS actual runtime receipt required');const receipt=JSON.parse(await readFile(out+'/report.json','utf8')),sources=new Map();
for(const world of receipt.worlds)for(const state of [world.arrival,...world.views.map(v=>v.state)])for(const owner of state.faunaLod?.ownership||[]){if(!owner.tier.startsWith('lod'))continue;
 const genome=state.tiles.faunaDrawn.find(x=>x.id===owner.id).genome,key=createHash('sha256').update(JSON.stringify(genome)).digest('hex'),previous=sources.get(key);
 if(previous)assert.equal(previous.expected,owner.sourceDigest,'same individual source stays immutable');else sources.set(key,{id:owner.id,genome,key,expected:owner.sourceDigest});}
const reference=await prepareFaunaReferenceBody();let server,lock,browser;const report={ok:false,reference:reference.manifest,scope:'original f96 body generator evaluated in same Chromium engine; exact full six-buffer SHA, no Node-vs-browser tolerance',rows:[]};
try{server=await startOnFreePort({url:p=>`http://127.0.0.1:${p}/tests/fauna-source-probe.html`,spawnServer:p=>spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(p),'--strictPort'],{stdio:'ignore'})});
 lock=await acquireGpuLock({owner:'CPU Chromium exact source identity audit',capture:true,retryMs:30000});browser=await chromium.launch({headless:true,args:['--disable-gpu']});const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.port}/tests/fauna-source-probe.html`);
 for(const row of sources.values()){const digest=await page.evaluate(async ({genome,module})=>{const {buildQuadrupedBody}=await import(module),body=buildQuadrupedBody(genome),names=['positions','normals','colors','skinIndex','skinWeight','index'],bytes=new Uint8Array(names.reduce((n,f)=>n+body[f].byteLength,0));let offset=0;for(const f of names){const a=body[f];bytes.set(new Uint8Array(a.buffer,a.byteOffset,a.byteLength),offset);offset+=a.byteLength;}return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');},{genome:row.genome,module:reference.url});
  assert.equal(digest,row.expected,`${row.id} original source bytes in same Chromium`);report.rows.push({id:row.id,genomeDigest:row.key,digest,oldSourceExact:true});}
 report.ok=true;
}finally{await browser?.close();await lock?.release();if(server)await stopServer(server.child);await writeFile(out+'/source-identity-browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify({ok:report.ok,bodies:report.rows.length}));}
