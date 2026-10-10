import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {buildQuadrupedBody} from '../src/fauna-body-plan.ts';
const out=process.env.ATLAS_RESULTS||'test-results/kit-production-route';
const actual=JSON.parse(await readFile(out+'/report.json','utf8'));
const baseline=JSON.parse(await readFile('C:/LLM/IWSDK/Assets/_assetctl/animal-system-20261010/warmup-comparison/report.json','utf8'));
assert(actual.ok);assert.deepEqual(actual.errors,[]);
const summary={actualBuild:actual.build,baselineBuild:baseline.runs[0].build,worlds:[],cachedBodyComparisons:[]},seen=new Set();
for(const world of actual.worlds){
  const a=world.views.find(v=>v.clearance===20).state,b=baseline.runs[world.index].snapshot;
  const am=new Map(a.faunaTrace.individuals.map(x=>[x.id,x])),bm=new Map(b.trace.individuals.map(x=>[x.id,x]));
  assert.deepEqual([...am.keys()].sort(),[...bm.keys()].sort());
  let maxPositionDelta=0,poseDifferences=0,censusDifferences=0,cameraDifferences=0;
  for(const [id,x]of am){const y=bm.get(id);maxPositionDelta=Math.max(maxPositionDelta,Math.hypot(...x.position.map((v,i)=>v-y.position[i])));
    if(JSON.stringify(x.pose)!==JSON.stringify(y.pose))poseDifferences++;if(JSON.stringify(x.census.member)!==JSON.stringify(y.census.member))censusDifferences++;if(x.cameraVisible!==y.cameraVisible)cameraDifferences++;}
  assert.equal(maxPositionDelta,0);assert.equal(poseDifferences,0);assert.equal(censusDifferences,0);assert.equal(cameraDifferences,0);
  summary.worlds.push({world:a.body.id,canonicalDrawn:am.size,maxPositionDelta,poseDifferences,censusDifferences,cameraDifferences,
    forestFixedPose:a.tiles.forest.visible,routeForest:world.arrival.tiles.forest.visible,routeClearance:world.arrival.clearanceM,
    routeMainCameraDraws:world.arrival.cameraDraws,walking:world.arrival.walking,farFlora:world.vegetationRange.floraKinds});
  for(const state of [world.arrival,...world.views.map(v=>v.state),world.vegetationRange])for(const c of state.bodyDigests||[]){
    if(seen.has(c.id))continue;seen.add(c.id);const body=buildQuadrupedBody(c.genome),hash=createHash('sha256');
    for(const name of ['positions','normals','colors','skinIndex','skinWeight','index'])hash.update(new Uint8Array(body[name].buffer,body[name].byteOffset,body[name].byteLength));
    assert.equal(hash.digest('hex'),c.digest);summary.cachedBodyComparisons.push({id:c.id,digest:c.digest,oldGeneratorEqualsLiveBuiltKit:true});
  }
}
summary.ok=true;await writeFile(out+'/summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify({ok:true,worlds:summary.worlds.map(w=>({world:w.world,animals:w.canonicalDrawn,forest:w.forestFixedPose})),liveBodies:summary.cachedBodyComparisons.length}));
