// Node microbenchmark of PlanetForest.update (near + middle + canopy host
// calls) at the perf harness's living inland site. Not part of `npm test`.
//   node tests/forest-frame-benchmark.mjs [--ref <git-revision>] [--frames N]
// Scenarios mirror the harness: S1 ground still, S1 100 m still, S2 turning
// 90 deg/s, S3 walk 1.6 m/s, S3 flight 40 m/s @120 m. Reports per-frame
// p50/p95/max ms of the forest update, and selection-apply max.
import {forestModule,createForestScene,gitSource} from './forest-frame-fixture.mjs';

const args=process.argv.slice(2),arg=(name,fallback)=>{const i=args.indexOf(name);return i>=0?args[i+1]:fallback;};
const revision=arg('--ref',null),N=Number(arg('--frames',240)),censusRangeM=Number(arg('--census',4500));
const FILES=['src/planet-forest.ts','src/planet-canopy.ts','src/forest-ordered-work.ts','src/forest-patch-broadphase.ts','src/compact-instance-slots.ts','src/instance-update-ranges.ts','src/forest-selection-transfer.ts'];
const sources={};
if(revision)for(const path of FILES){const text=gitSource(revision,path);if(text!==null)sources[path]=text;}
const {module,cleanup}=await forestModule({prefix:'atlas-forest-bench-',sources});
const scene=await createForestScene(module,{censusRangeM});
const q=(values,p)=>{const s=[...values].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(p*(s.length-1)))];};
const report=(name,ms,extra='')=>console.log(`${name.padEnd(28)} p50 ${q(ms,.5).toFixed(3)}  p95 ${q(ms,.95).toFixed(3)}  max ${Math.max(...ms).toFixed(3)} ms  (${ms.length} frames)${extra}`);
try{
  const t0=Date.now();
  const settleFrames=await scene.settle({clearanceM:1.7},3000);
  const d=scene.forest.diagnostics();
  console.log(`${revision?`reference ${revision}`:'working tree'}; settled in ${settleFrames} frames (${((Date.now()-t0)/1000).toFixed(1)} s): selected ${d.candidateCells}, cached ${d.cached}, near ${d.near}, visible ${d.visible}, active ${d.farWork.activeCells}, far-owned ${d.farOwnedSkipped}, canopy trees ${d.fullCanopy?.trees}, detailed ${JSON.stringify(d.detailedTrees.visible)}`);
  const run=async(name,poseAt,frames=N)=>{
    for(let i=0;i<20;i++)await scene.step(poseAt(-1));
    const ms=[];let applyMax=0;
    for(let i=0;i<frames;i++){ms.push(await scene.step(poseAt(i),{time:true}));applyMax=Math.max(applyMax,scene.forest.diagnostics().selectionApplyMs);}
    report(name,ms);return ms;
  };
  await run('S1 ground still',()=>({clearanceM:1.7}));
  await run('S2 turn 90deg/s',i=>({clearanceM:1.7,bearingDeg:Math.max(0,i)*1.5}));
  await run('S3 walk 1.6 m/s',i=>({clearanceM:1.7,eastM:Math.max(0,i)*1.6/60}));
  await scene.settle({clearanceM:100,pitchDeg:-15},3000);
  await run('S1 100 m still',()=>({clearanceM:100,pitchDeg:-15}));
  await scene.settle({clearanceM:120,pitchDeg:-10},3000);
  // Flight: time only the forest update; selection replies land between frames.
  const flight=[];scene.stats.selectionReplies.length=0;
  for(let i=0;i<Math.max(N,600);i++)flight.push(await scene.step({clearanceM:120,pitchDeg:-10,northM:i*40/60},{time:true}));
  const replies=scene.stats.selectionReplies;
  report('S3 flight 40 m/s @120 m',flight,`; frames >4 ms: ${flight.filter(x=>x>4).length}`);
  console.log(`selection reply (decode + apply) over flight: ${replies.length} replies, max ${Math.max(0,...replies).toFixed(2)} ms, mean ${(replies.reduce((a,b)=>a+b,0)/Math.max(1,replies.length)).toFixed(2)} ms`);
}finally{scene.dispose();await cleanup();}
