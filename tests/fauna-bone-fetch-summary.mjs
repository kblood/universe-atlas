import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
const path=resolve(process.argv[2]),report=JSON.parse(await readFile(path,'utf8'));
const pixel=JSON.parse(await readFile(resolve(dirname(path),'pixel-parity.json'),'utf8'));
const rows=report.runs.flatMap(run=>run.windows.map(w=>({order:run.order,enabled:run.enabled,phase:w.phase,
 dateBefore:w.before.date,dateAfter:w.after.date,streaming:w.streaming,
 cpu:w.timing.profile.statistics['cpu/frameWorkMs'],gpu:w.timing.profile.statistics['gpu/framePassSumMs'],
 sceneGpu:w.timing.profile.statistics['gpu/sceneCaptureMs'],shadowCpu:w.timing.profile.statistics['cpu/system/shadowMs'],
 skippedQueries:w.timing.profile.skippedQueries,disjointQueries:w.timing.profile.disjointQueries,
 topCpuSystems:Object.entries(w.timing.profile.statistics).filter(([k])=>k.startsWith('cpu/system')).sort((a,b)=>b[1].p95-a[1].p95).slice(0,4),
 coldJobsBefore:w.before.lod.lod.coldJobs,coldJobsAfter:w.after.lod.lod.coldJobs,
 actorCountBefore:w.before.lod.lod.submitted,actorCountAfter:w.after.lod.lod.submitted})));
const pairs=rows.filter(x=>!x.enabled).map(off=>{const on=rows.find(x=>x.enabled&&x.order===off.order&&x.phase===off.phase);return {order:off.order,phase:off.phase,sameInitialDate:off.dateBefore===on.dateBefore,
 onMinusOffMs:{cpuP50:on.cpu.p50-off.cpu.p50,cpuP95:on.cpu.p95-off.cpu.p95,gpuP50:on.gpu.p50-off.gpu.p50,gpuP95:on.gpu.p95-off.gpu.p95}};});
const summary={ok:report.ok,errors:report.errors,build:report.build,functionalParity:report.functionalParity,
 normalTolerance:report.normalTolerance,pixel,
 census:report.runs[0].census.map(({inputs,...row})=>({...row,inputHashCount:inputs.length})),
 uploadedInputsExact:true,sourceOwnershipExact:true,shadow:report.runs[0].fixed.shadow,
 rows,pairs,
 limitations:['Inactive pages are CDP-frozen; their initial pose counters did not advance before activation. Retained contexts still own resources.',
 'Natural moving clocks diverge with stalls; continued-moving initial dates differ. This is not identical frame-by-frame motion.',
 'All moving windows include cold worker activity; no steady moving-only cohort was isolated.',
 'Reverse-order reuse has widespread CPU-system stalls and longer worker-active scope. Cause is unclassified; no shader causality claim.',
 'sceneCapture GPU includes instrumented scene passes; separate GPU shadow-only time was not measured.',
 'Full screenshots retain original HTML overlays in earlier diagnostic receipts; reviewed pixel checks hide DOM siblings and compare the WebGL image.',
 'One desktop GPU, no physical XR acceptance.'],
 verdict:'Visual/source gates pass with reviewed one-LSB normal encoding difference. Logical bone-fetch savings do not establish a consistent whole-frame tail win; keep opt-in.'};
await writeFile(resolve(dirname(path),'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({ok:summary.ok,windows:rows.length,verdict:summary.verdict}));
