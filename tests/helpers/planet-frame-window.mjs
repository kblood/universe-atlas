/** No screenshots or allocation-heavy planetary diagnostics during sampling. */
export async function samplePlanetFrameWindow(page,{frames=180}={}){
 return page.evaluate(({frames})=>new Promise(resolve=>{
  const a=window.__atlas,renderer=a.renderDebug().renderer,gl=renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const original=renderer.render,queries=[],intervals=[],longFrames=[],gpu=new Map(),cpu=new Map(),expected=new Map(),received=new Map(),invalid=new Set();
  let frame=-3,previous=null,nested=false,disjoint=0,skippedQueries=0;
  renderer.render=function(...args){
   if(nested)return original.apply(this,args);
   const measured=frame>=0&&frame<frames,q=measured&&ext&&queries.length<24&&!gl.getQuery(ext.TIME_ELAPSED_EXT,gl.CURRENT_QUERY)?gl.createQuery():null;
   if(measured&&ext&&!q){invalid.add(frame);skippedQueries++;}if(q){expected.set(frame,(expected.get(frame)??0)+1);gl.beginQuery(ext.TIME_ELAPSED_EXT,q);}
   const start=performance.now();nested=true;
   try{return original.apply(this,args);}finally{nested=false;if(measured)cpu.set(frame,(cpu.get(frame)??0)+performance.now()-start);if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);queries.push({q,frame});}}
  };
  const collect=()=>{if(!ext)return;for(let i=queries.length-1;i>=0;i--){const item=queries[i];if(gl.getQueryParameter(item.q,gl.QUERY_RESULT_AVAILABLE)){
    if(gl.getParameter(ext.GPU_DISJOINT_EXT)){disjoint++;invalid.add(item.frame);}else{gpu.set(item.frame,(gpu.get(item.frame)??0)+gl.getQueryParameter(item.q,gl.QUERY_RESULT)/1e6);received.set(item.frame,(received.get(item.frame)??0)+1);}gl.deleteQuery(item.q);queries.splice(i,1);}}};
  const stats=values=>{values.sort((a,b)=>a-b);return {samples:values.length,p50:values[Math.floor(values.length*.5)]??null,p95:values[Math.floor(values.length*.95)]??null,max:values.at(-1)??null};};
  function finish(drains=0){collect();if(queries.length&&drains<30){requestAnimationFrame(()=>finish(drains+1));return;}
   for(const {q,frame} of queries){invalid.add(frame);gl.deleteQuery(q);}resolve({scope:'uncaptured desktop rAF intervals; GPU queries start/end synchronously around each outer renderer.render call and sum every measured render pass perframe; no interframe idle time inside queries',
    frameIntervalsMs:stats(intervals),renderCpuMs:stats([...cpu.values()]),gpuMs:stats([...gpu].filter(([f])=>!invalid.has(f)&&received.get(f)===expected.get(f)).map(([,ms])=>ms)),
    disjoint,skippedQueries,invalidGpuFrames:invalid.size,longFrames,gpuTimerAvailable:!!ext});}
  function tick(now){collect();if(frame<0){frame++;previous=null;requestAnimationFrame(tick);return;}
   if(previous!==null){const delta=now-previous;intervals.push(delta);if(delta>250)longFrames.push({intervalMs:delta,backlog:a.perfSample().backlog});}previous=now;
   if(++frame>=frames){renderer.render=original;finish();return;}requestAnimationFrame(tick);
  }requestAnimationFrame(tick);
 }),{frames});
}

/** Separate window: the app profiler owns GPU queries and full callback CPU. */
export async function samplePlanetCpuWindow(page,{frames=180}={}){
 return page.evaluate(({frames})=>new Promise(resolve=>{const a=window.__atlas,wasEnabled=a.renderProfile.enabled,history=a.renderProfile.historyLimit;
  a.setProfiling(true);a.resetProfile();a.setProfileHistory(frames);let drain=3,count=0;
  function tick(){if(drain-->0){requestAnimationFrame(tick);return;}if(++count<frames){requestAnimationFrame(tick);return;}
   const profile=a.renderProfile;const result={scope:'separate uncaptured window with native app profiler; cpu/frameWorkMs spans actual whole animation callback, GPU uses native non-overlapping pass queries',profile};
   a.setProfiling(wasEnabled);a.setProfileHistory(history);resolve(result);
  }requestAnimationFrame(tick);
 }),{frames});
}
