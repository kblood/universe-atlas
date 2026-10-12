import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {withGpuLock} from './helpers/gpu-lock.mjs';
import {createServer} from 'vite';
const root=fileURLToPath(new URL('../',import.meta.url)),out=resolve(root,'test-results','animal-optimization-visual',new Date().toISOString().replace(/[:.]/g,'-'));
await mkdir(out,{recursive:true});let server;let report={ok:false};
try{server=await createServer({root,server:{host:'127.0.0.1',port:0,strictPort:false},logLevel:'warn'});await server.listen();const base=server.resolvedUrls.local[0];await withGpuLock({owner:'animal-optimization-visual-native',timeoutMs:600000,retryMs:10000},async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});
 try{const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto(new URL('tests/animal-optimization-visual.html',base).href);await page.waitForFunction(()=>window.__optimizationVisual?.ready,{},{timeout:120000});report=await page.evaluate(()=>window.__optimizationVisual);report.errors=errors;await page.screenshot({path:resolve(out,'native.png')});if(!report.ok||errors.length)throw new Error(JSON.stringify(report));await page.screenshot({path:resolve(out,'native.png')});}finally{await browser.close();}
});}catch(error){report.failure=String(error.stack);process.exitCode=1;}finally{await server?.close();await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,...report}));}
