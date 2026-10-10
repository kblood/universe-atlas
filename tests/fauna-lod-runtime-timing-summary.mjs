import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const root='C:/LLM/IWSDK/Assets/_assetctl/animal-system-20261010',out=process.env.ATLAS_RESULTS||root+'/lod-runtime-final-float-into-fixed';
const candidate=JSON.parse(await readFile(out+'/report.json','utf8')),gpuControl=JSON.parse(await readFile(root+'/lod-runtime-default-fixed/report.json','utf8')),cpuControl=JSON.parse(await readFile(root+'/lod-runtime-default-native-profile/report.json','utf8'));
assert(candidate.ok&&gpuControl.ok&&cpuControl.ok);const report={candidateBuild:candidate.build,controlBuild:gpuControl.build,scope:'paused desktop, uncaptured180frame windows, serial project GPU/CPU coordination; independent runs, external OS activity not excluded, no causal or physical Quest acceptance',rows:[]};
for(const world of candidate.worlds)for(const v of [{clearance:80,state:world.arrival,frames:world.arrivalFrames},...world.views]){
 const oldGpu=v.clearance===80?gpuControl.worlds[world.index].arrivalFrames:gpuControl.worlds[world.index].views.find(x=>x.clearance===v.clearance).frames;
 const oldCpu=v.clearance===80?cpuControl.worlds[world.index].arrivalFrames:cpuControl.worlds[world.index].views.find(x=>x.clearance===v.clearance).frames;
 const external=v.frames.externalGpu,native=v.frames.native,stability=[];
 for(const window of [external,native]){assert.equal(window.before.date,window.after.date);const positionDeltaM=Math.hypot(...window.after.bodyRelativeM.map((x,i)=>x-window.before.bodyRelativeM[i]));
  const cameraMatrixMaxDelta=Math.max(...window.after.cameraMatrix.map((x,i)=>Math.abs(x-window.before.cameraMatrix[i])));assert(positionDeltaM<=1e-5);assert(cameraMatrixMaxDelta<=1e-12);stability.push({positionDeltaM,cameraMatrixMaxDelta,dateFrozen:true});}
 assert.equal(external.disjoint,0);assert.equal(external.invalidGpuFrames,0);assert.equal(native.profile.disjointQueries,0);assert.equal(native.profile.skippedQueries,0);assert.equal(v.state.tiles.pending,0);
 const adapter=v.state.faunaLod.lod.adapter,trace=new Map(v.state.faunaTrace.individuals.map(x=>[x.id,x])),tiers={};
 for(const owner of v.state.faunaLod.ownership){if(owner.high<=owner.low)continue;const t=tiers[owner.tier]??={represented:0,cameraVisible:0};t.represented++;if(trace.get(owner.id)?.cameraVisible)t.cameraVisible++;}
 report.rows.push({world:v.state.body.name,clearanceM:v.clearance,stability,tiers,controlGpuMs:oldGpu.gpuMs,candidateGpuMs:external.gpuMs,
  controlWholeCpuMs:oldCpu.profile.statistics['cpu/frameWorkMs'],candidateWholeCpuMs:native.profile.statistics['cpu/frameWorkMs'],
  controlFrameIntervalMs:oldGpu.frameIntervalsMs,candidateFrameIntervalMs:external.frameIntervalsMs,
  residentTypedCpuGpuEstimateBytes:v.state.faunaLod.lod.adapterOwnedBytes,maxResidentBytes:v.state.faunaLod.lod.maxResidentBytes,
  workerActive:adapter.workerActive,sourceOrBasisCachesBytes:adapter.close.cacheBytes+adapter.middle.cacheBytes+adapter.close.basisCacheBytes+adapter.middle.basisCacheBytes,
  lifeCombinedEstimateBytes:v.state.tiles.faunaLodMemory.lifeCombinedEstimateBytes,withinWholeLifeReserve:v.state.tiles.faunaLodMemory.withinLifeReserve,
  excluded:'worker JS heap, driver/program overhead; cold-job reserve absent in these drained windows but separately32MiB'});
}
report.conclusion='GPU tails mixed; whole CPU p95 regresses in several views. No blanket performance win or default rollout acceptance. Candidate resident pool fits16MiB, complete life ownership exceeds the fixed life reserve.';
await writeFile(out+'/timing-summary.json',JSON.stringify(report,null,2));console.log(JSON.stringify({ok:true,scenes:report.rows.length,conclusion:report.conclusion}));
