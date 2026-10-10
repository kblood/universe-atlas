import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
const path=resolve(process.argv[2]),report=JSON.parse(await readFile(path,'utf8'));
const owners=run=>run.pixelState.lod.ownership.map(({id,tier,sourceDigest,low,high})=>({id,tier,sourceDigest,low,high})).sort((a,b)=>a.id.localeCompare(b.id));
const full=report.runs.find(r=>r.mode==='full'),rows=report.runs.find(r=>r.mode==='rows');
assert.deepEqual(owners(full),owners(rows));assert.deepEqual(full.pixelState.lod.canonical,rows.pixelState.lod.canonical);
const windows=report.runs.flatMap(run=>run.windows.map(w=>{
 const before=w.before.lod.lod.adapter,after=w.after.lod.lod.adapter,pb=before.profile,pa=after.profile,n=pa.frames-pb.frames;
 return {mode:run.mode,phase:w.phase,dateBefore:w.before.date,dateAfter:w.after.date,
  streaming:w.streaming,cpu:w.timing.profile.statistics['cpu/frameWorkMs'],gpu:w.timing.profile.statistics['gpu/framePassSumMs'],
  sampledEndUploads:{close:after.close.paletteUploadBytes,middle:after.middle.paletteUploadBytes,mode:after.middle.paletteUploadMode,closeActive:after.close.active,middleActive:after.middle.active},
  attribution:pa.enabled?{frames:n,phases:Object.fromEntries(Object.keys(pa.phases).map(k=>[k,{calls:pa.phases[k].calls-pb.phases[k].calls,msPerFrame:(pa.phases[k].ms-pb.phases[k].ms)/n}]))}:null};
}));
const pixel=JSON.parse(await readFile(resolve(dirname(path),'pixel-parity.json'),'utf8'));
const summary={ok:report.ok,errors:report.errors,build:report.build,browser:report.browser,
 scope:report.scope,canonicalSourceOwnershipExact:true,pixel,windows,
 limitations:['Controller time includes pose, ground, palette, submit and stream: nested totals must not be added.',
 'Controller profile excludes initial desired-map construction; postMessage timer excludes worker startup/build.',
 'All moving windows include worker-active frames. No steady no-cold cohort was isolated.',
 'Upload values are sampled at the end of a window, not cumulative bytes for every frame.',
 'Single full-to-rows order on this desktop GPU; modest tail differences are not a universal improvement.'],
 verdict:'Adaptive rows preserves exact paused pixels/source/ownership and reduces sparse middle palette bytes, but moving GPU medians are higher and tails only modestly lower. Keep opt-in.'};
await writeFile(resolve(dirname(path),'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({ok:summary.ok,canonicalSourceOwnershipExact:true,pixel,windows:windows.length,verdict:summary.verdict}));
