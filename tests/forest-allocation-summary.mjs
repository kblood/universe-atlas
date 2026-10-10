import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='C:/LLM/IWSDK/Assets/_assetctl/animal-system-20261010',after=JSON.parse(await readFile(root+'/life-memory-forest-ineligible/report.json','utf8')),
  before=JSON.parse(await readFile(root+'/life-memory-baseline/report.json','utf8')),baseline=JSON.parse(await readFile(root+'/warmup-comparison/report.json','utf8')),
  lifecycle=JSON.parse(await readFile(root+'/forest-dispose-revisit/report.json','utf8'));
assert(lifecycle.ok);assert.deepEqual(lifecycle.errors,[]);const summary={afterBuild:after.sampledAppBuild,beforeBuild:before.sampledAppBuild,worlds:[],lifecycleOk:true};
for(let i=0;i<2;i++){
  const m=after.runs[i].memory,b=before.runs[i].memory,actual=m.runtime.faunaTrace.individuals,expected=new Map(baseline.runs[i].snapshot.trace.individuals.map(x=>[x.id,x]));
  assert.deepEqual(actual.map(x=>x.id).sort(),[...expected.keys()].sort());
  for(const x of actual){const y=expected.get(x.id);assert.deepEqual(x.census.member,y.census.member);assert.deepEqual(x.pose,y.pose);assert.deepEqual(x.position,y.position);assert.equal(x.cameraVisible,y.cameraVisible);}
  if(i===0){assert.equal(m.runtime.forestResourceState,'body-ineligible');assert.equal(m.runtime.forestAllocatedBytes,0);assert.equal(m.runtime.forestMeshCount,0);assert.equal(m.runtime.forestWorker,false);assert.equal(m.runtime.canopyWorker,false);}
  else{assert.equal(m.forest.retainedCpuBytes,b.forest.retainedCpuBytes);assert.equal(m.forest.estimatedGpuBytes,b.forest.estimatedGpuBytes);assert.equal(m.runtime.trees,155);}
  summary.worlds.push({world:after.runs[i].world,canonicalAnimals:actual.length,censusPosePositionCameraEqual:true,
    lifeCpu:m.lifeRetainedCpuBytes,lifeGpuEstimate:m.lifeGpuEstimateBytes,forest:m.runtime.forestAllocatedBytes,
    cpuRecovered:b.lifeRetainedCpuBytes-m.lifeRetainedCpuBytes,gpuRecovered:b.lifeGpuEstimateBytes-m.lifeGpuEstimateBytes,
    meshes:m.runtime.forestMeshCount,forestWorker:m.runtime.forestWorker,canopyWorker:m.runtime.canopyWorker,
    disposed:lifecycle.worlds[i].disposed,revisitIdsAndTreesEqual:true});
}
summary.ok=true;await writeFile(root+'/life-memory-forest-ineligible/summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
