/** QA-owned pressure evidence only; never a production budget or headset benchmark. */
export async function isolatedQaCycle({persist,measure,release,operate}){
 await persist();
 const before=await measure('before QA reference release');
 const releaseReceipt=await release();
 const after=await measure('after QA reference release, before actual readiness');
 const result=await operate();
 return {result,pressure:{before,after,release:releaseReceipt}};
}
export function compactEvidence(snapshot,artifact){
 return {artifact,scope:'full immutable evidence saved separately; compact receipt holds no source/foot arrays',bodyId:snapshot.canonical.bodyId,worldNs:snapshot.canonical.worldNs,measured:{...snapshot.measured},wrapperCounts:structuredClone(snapshot.wrapperCounts),sourceReceipts:snapshot.sources.map(s=>({id:s.id,versions:{...s.versions},sourceBufferDigests:{...s.sourceBufferDigests}})),referenceCache:{...snapshot.referenceCache},footSamples:snapshot.feet.samples.length,represented:snapshot.ownership.length};
}
export async function qaPressure(page,phase,cache){
 const node={...process.memoryUsage()};
 const browser=await page.evaluate(()=>{
  if(!window.__planetQaPressure){
   const q=window.__planetQaPressure={startedMs:performance.now(),frames:0,maxFrameIntervalMs:0,lastFrameMs:null,longTaskSupported:PerformanceObserver.supportedEntryTypes.includes('longtask'),longTasks:0,longTaskTotalMs:0,maxLongTaskMs:0};
   if(q.longTaskSupported){q.observer=new PerformanceObserver(list=>{for(const e of list.getEntries()){q.longTasks++;q.longTaskTotalMs+=e.duration;q.maxLongTaskMs=Math.max(q.maxLongTaskMs,e.duration);}});q.observer.observe({type:'longtask',buffered:false});}
   const tick=now=>{q.frames++;if(q.lastFrameMs!==null)q.maxFrameIntervalMs=Math.max(q.maxFrameIntervalMs,now-q.lastFrameMs);q.lastFrameMs=now;q.raf=requestAnimationFrame(tick);};q.raf=requestAnimationFrame(tick);
  }
  const q=window.__planetQaPressure,m=performance.memory;
  return {elapsedMs:performance.now()-q.startedMs,frames:q.frames,maxFrameIntervalMs:q.maxFrameIntervalMs,longTaskSupported:q.longTaskSupported,longTasks:q.longTasks,longTaskTotalMs:q.longTaskTotalMs,maxLongTaskMs:q.maxLongTaskMs,coarseJsHeap:m?{used:m.usedJSHeapSize,total:m.totalJSHeapSize,limit:m.jsHeapSizeLimit}:null};
 });
 return {phase,at:new Date().toISOString(),node,browser,cache,forcedNodeGcAvailable:typeof globalThis.gc==='function',scope:'QA host process memory; Chromium performance.memory is coarse and includes shared-context activity; rAF/longtasks include production AND verification. Not runtime-owned budgets, GPU timing or physical-device performance.'};
}
