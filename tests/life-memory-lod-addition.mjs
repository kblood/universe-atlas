import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root='C:/LLM/IWSDK/Assets/_assetctl/animal-system-20261010';
const baselinePath=process.env.LIFE_MEMORY_RECEIPT||root+'/life-memory-baseline/report.json';
const candidatePath=process.env.LOD_GPU_SUMMARY||root+'/lod-gpu-final-128/summary.json';
const baseline=JSON.parse(await readFile(baselinePath,'utf8')),candidate=JSON.parse(await readFile(candidatePath,'utf8'));
const report={baselinePath,candidatePath,sampledAppBuild:baseline.sampledAppBuild,scope:'conservative addition of one isolated candidate pool to measured baseline ownership; does not subtract a replaced representation or establish aggregate budget acceptance',
  worlds:baseline.runs.map(run=>({world:run.world,existingCpuBytes:run.memory.lifeRetainedCpuBytes,existingGpuEstimateBytes:run.memory.lifeGpuEstimateBytes,
    existingLifeReserveBytes:run.memory.lifeReserveBytes,candidates:candidate.candidateMethods128.map(c=>({method:c.method,
      addedCpuBytes:c.retainedCpuBytes,addedGpuEstimateBytes:c.gpuEstimateBytes,
      lifeCpuAfterAdditionBytes:run.memory.lifeRetainedCpuBytes+c.retainedCpuBytes,lifeGpuAfterAdditionEstimateBytes:run.memory.lifeGpuEstimateBytes+c.gpuEstimateBytes,
      partialAllocatedCorePlusLifeAfterAdditionBytes:run.memory.coreAccountedPlusMeasuredLifeEstimateBytes+c.retainedCpuBytes+c.gpuEstimateBytes}))})),
  exclusions:['baseline forest ownership estimate includes decoded texture CPU and estimated texture/render-target GPU storage',
    'candidate render pool includes cached render arrays, caller palettes, approximate-pose typed workspace and seen table',
    'loaded source worker assets, spatial-index construction scratch, derived correspondence cache, JS records and driver/program overhead are separate',
    'accounted core excludes fixed life reserve, clouds/environment absent there; partial allocated estimate remains partial']};
const out=process.env.ATLAS_RESULTS||root+'/life-memory-lod-addition';await mkdir(out,{recursive:true});await writeFile(out+'/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report.worlds.map(w=>({world:w.world,cpu:w.candidates[1].lifeCpuAfterAdditionBytes,gpu:w.candidates[1].lifeGpuAfterAdditionEstimateBytes})),null,2));
