// Output identity for the forest frame-cost work (docs/forest-cpu-2026-09-29.md).
// Runs one scripted pose/date sequence at the perf harness's living inland
// site through the reference revision of the forest sources (from git) and
// through the working tree, and compares a per-frame digest of everything the
// frame produces: legacy near/middle/far-proxy slots and every instance
// channel with its upload ranges, detailed family pools and per-slot batch
// data, far-canopy ownership and static channels, retained hysteresis sets
// and the non-timing diagnostics (tests/forest-frame-fixture.mjs).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {forestModule,createForestScene,forestDigest,gitSource,digestPoses} from './forest-frame-fixture.mjs';

// Parent of the forest CPU work (desktop perf harness merge).
const REFERENCE='e6a0b39';
const FILES=['src/planet-forest.ts','src/planet-canopy.ts','src/forest-ordered-work.ts','src/forest-patch-broadphase.ts',
  'src/compact-instance-slots.ts','src/instance-update-ranges.ts','src/forest-selection-transfer.ts'];

async function run(sources,poses){
  const {module,cleanup}=await forestModule({prefix:'atlas-forest-digest-',sources});
  const scene=await createForestScene(module,{censusRangeM:1600});
  try{
    const base=scene.world.water;
    const settled=await scene.settle({clearanceM:1.7},1500);
    const digests=[];
    for(const pose of poses){
      await scene.step({...pose,water:base+(pose.waterDelta??0)});
      digests.push(forestDigest(scene.forest,scene.batches));
    }
    return {settled,digests,final:scene.forest.diagnostics()};
  }finally{scene.dispose();await cleanup();}
}

async function firstDifference(sources,poses,index){
  const {module,cleanup}=await forestModule({prefix:'atlas-forest-digest-',sources});
  const scene=await createForestScene(module,{censusRangeM:1600});
  try{
    const base=scene.world.water;await scene.settle({clearanceM:1.7},1500);
    for(let i=0;i<=index;i++)await scene.step({...poses[i],water:base+(poses[i].waterDelta??0)});
    return forestDigest(scene.forest,scene.batches,{detail:true}).parts;
  }finally{scene.dispose();await cleanup();}
}

test('forest frame outputs are identical to the reference forest for a fixed pose/date sequence',async t=>{
  const sources={};
  for(const path of FILES){const text=gitSource(REFERENCE,path);if(text===null){t.skip(`git object ${REFERENCE}:${path} unavailable`);return;}sources[path]=text;}
  const poses=digestPoses();
  const a=await run(sources,poses),b=await run({},poses);
  assert.equal(a.settled,b.settled,'same settle length');
  const first=a.digests.findIndex((digest,i)=>digest!==b.digests[i]);
  if(first>=0){
    const [pa,pb]=[await firstDifference(sources,poses,first),await firstDifference({},poses,first)];
    const diff=Object.keys(pa).filter(k=>JSON.stringify(pa[k])!==JSON.stringify(pb[k])).map(k=>({field:k,ref:JSON.stringify(pa[k]).slice(0,400),cur:JSON.stringify(pb[k]).slice(0,400)}));
    assert.fail(`frame ${first} of ${poses.length} (${JSON.stringify(poses[first],(k,v)=>typeof v==='bigint'?String(v):v)}) differs: ${JSON.stringify(diff)}`);
  }
  // The sequence must exercise what the optimisations skip or replay.
  assert.ok(new Set(b.digests).size>250,`sequence changes output on many frames (${new Set(b.digests).size})`);
  let repeats=0;for(let i=1;i<b.digests.length;i++)if(b.digests[i]===b.digests[i-1])repeats++;
  assert.ok(repeats>30,`sequence contains still frames (${repeats})`);
});
