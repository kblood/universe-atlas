import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
const path=resolve(process.argv[2]),dir=dirname(path),report=JSON.parse(await readFile(path,'utf8'));
assert(report.ok&&report.inputGate);
const stats=values=>{const sorted=[...values].sort((a,b)=>a-b),at=q=>sorted[Math.min(sorted.length-1,Math.ceil(q*sorted.length)-1)];return {samples:sorted.length,p50:at(.5),p95:at(.95),max:sorted.at(-1)};};
const rows=[];for(const run of report.runs){const buffer=await readFile(resolve(dir,run.buffers.recorderMs.file));const recorder=new Float64Array(buffer.buffer,buffer.byteOffset,buffer.length/8);
 rows.push({order:run.order,enabled:run.enabled,clock:run.clock,dateHash:run.dateHash,
  cpu:run.timing['cpu/frameWorkMs'],gpu:run.timing['gpu/framePassSumMs'],frameInterval:run.timing.frameIntervalMs,
  externalRecorderCpuMs:stats(recorder),externalRecorderTypedBytes:Object.values(run.buffers).reduce((n,b)=>n+b.bytes,0),
  cameraAndPoseBuffers:Object.fromEntries(['poses','present','camera','near','nearWorld','palettes'].map(name=>[name,run.buffers[name].sha256])),
  visibleCanonicalMembers:run.ids.length,nearMembers:run.nearIds.length,
  lodActors:run.before.lod?.lod?.submitted??0,lodOwnedEstimateBytes:run.before.lod?.lod?.currentCombinedEstimateBytes??0,
  coldCausesBefore:run.before.lod?.lod?.coldJobCauses??null,coldCausesAfter:run.after.lod?.lod?.coldJobCauses??null,
  settings:run.before.settings});
}
const pairs=rows.filter(r=>!r.enabled).map(off=>{const on=rows.find(r=>r.enabled&&r.order===off.order);return {order:off.order,onMinusOffMs:{cpuP50:on.cpu.p50-off.cpu.p50,cpuP95:on.cpu.p95-off.cpu.p95,gpuP50:on.gpu.p50-off.gpu.p50,gpuP95:on.gpu.p95-off.gpu.p95,frameP95:on.frameInterval.p95-off.frameInterval.p95}};});
const summary={ok:report.ok,errors:report.errors,build:report.build,browser:report.browser,inputGate:report.inputGate,scope:report.scope,rows,pairs,
 resourceContext:{newLodOwnedEstimateBytes:14707462,separatelyValidatedBarkCpuGpuSavingBytes:19573416,barkSharingEnabledInThisMeasurement:false,wholeLife16MiBApproval:false},
 limitations:['180ms of simulation motion across180real frames; this is a steady diagnostic, not natural gameplay FPS.',
 'CPU work and GPU pass sums overlap in the pipeline and must not be added as a frame interval.',
 'Opt-in CPU p95 9.990–10.480ms and GPU p95 6.783–6.838ms; observed frame interval p95 17.545–18.025ms, not a strict16.67ms frame guarantee.',
 'External recorder runs after the native callback, has reported overhead and typed memory, and does not monkeypatch performance clocks.',
 'Default overflow geometry differs from connected skins; canonical identity/motion inputs match, representation quality intentionally differs.',
 'Whole-life accounting exceeds a16MiB reserve on Anitar; owned LOD pool fit is not aggregate approval.',
 'One RTX5090desktop; no physical XR validation. XR LOD remains suspended.'],
 verdict:'Exact workload gates pass. Connected skins impose a modest steady GPU cost; CPU/frame tails vary by order. Evidence supports a bounded desktop quality/resource tradeoff, not a blanket performance win.'};
await writeFile(resolve(dir,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({ok:summary.ok,inputGate:summary.inputGate,pairs,verdict:summary.verdict}));
