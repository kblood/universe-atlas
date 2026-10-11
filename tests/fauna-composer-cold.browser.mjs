import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {withGpuLock} from './helpers/gpu-lock.mjs';
const output=process.env.COMPOSER_COLD_RESULTS??'C:/LLM/IWSDK/Assets/_assetctl/planet-composer-cold-20261011/browser24';
const kit=process.env.COMPOSER_BROWSER_KIT??'/@fs/C:/LLM/IWSDK/creature-kit-wt/planet-composer-integration/src/planet-composer.ts';
const maxJobsPerWorker=Number(process.env.COMPOSER_WORKER_JOBS??1);
await mkdir(output,{recursive:true});
await withGpuLock({owner:'composer-cold-worker-heap',capture:true},async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage(),cdp=await page.context().newCDPSession(page);
 const errors=[],samplingErrors=[],heap=[],pending=new Map();let next=1,session=null,stopped=false,workerCount=0;
 const command=(method,params={})=>new Promise((resolve,reject)=>{const id=next++,target=session;const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP worker heap sample timed out'));},5000);pending.set(id,{session:target,resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});cdp.send('Target.sendMessageToTarget',{sessionId:target,message:JSON.stringify({id,method,params})}).catch(reject);});
 cdp.on('Target.receivedMessageFromTarget',({message})=>{const data=JSON.parse(message),p=pending.get(data.id);if(p){pending.delete(data.id);data.error?p.reject(data.error):p.resolve(data.result);}});
 cdp.on('Target.attachedToTarget',event=>{if(event.targetInfo.type==='worker'){session=event.sessionId;workerCount++;}});
 cdp.on('Target.detachedFromTarget',event=>{if(session===event.sessionId)session=null;for(const [id,p] of pending)if(p.session===event.sessionId){pending.delete(id);p.resolve(null);}});
 await cdp.send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:false,flatten:false});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const sampler=(async()=>{while(!stopped){if(session)try{const worker=workerCount,value=await command('Runtime.getHeapUsage');if(value)heap.push({at:Date.now(),worker,...value});}catch(error){samplingErrors.push(String(error));}await new Promise(resolve=>setTimeout(resolve,50));}})();
 try{await page.goto('http://127.0.0.1:5195/tests/fauna-composer-cold.html?kit='+encodeURIComponent(kit));await page.waitForFunction(()=>window.__composerCold?.ready);
  const ticker=setInterval(async()=>{try{console.log(JSON.stringify(await page.evaluate(()=>window.__composerCold.live)));}catch{}},10000);let report;try{report=await page.evaluate(cap=>window.__composerCold.run(24,cap),maxJobsPerWorker);}finally{clearInterval(ticker);} if(session){const value=await command('Runtime.getHeapUsage');if(value)heap.push({at:Date.now(),worker:workerCount,...value});}
  stopped=true;await sampler;report.workerHeap={workerCount,samplingErrors,method:'CDP Runtime.getHeapUsage, sampled every50ms when worker accepts commands; this is a sampled lower bound on peak, not an allocation hard cap',samples:heap,peakUsedSize:Math.max(0,...heap.map(h=>h.usedSize)),peakTotalSize:Math.max(0,...heap.map(h=>h.totalSize)),peakBackingStorageSize:Math.max(0,...heap.map(h=>h.backingStorageSize??0))};report.errors=errors;
  await writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({count:report.count,maxJobsPerWorker,firstVisibleMs:report.firstVisibleMs,allVisibleMs:report.allVisibleMs,workerHeap:{...report.workerHeap,samples:heap.length},diagnostics:report.diagnostics,longTasks:report.longTasks,errors},null,2));
  assert.equal(report.diagnostics.active,24);assert.equal(report.diagnostics.verificationOnMain,0);assert.equal(report.diagnostics.failures,0);assert.ok(heap.length>0);assert.deepEqual(errors,[]);
  await page.evaluate(()=>window.__composerCold.dispose());
 }catch(error){await writeFile(output+'/failure.json',JSON.stringify({error:String(error),errors},null,2));console.error(errors);throw error;}finally{stopped=true;await browser.close();}
});
