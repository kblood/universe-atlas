// Output identity for the cached terrain leaf loop (docs/terrain-budget-2026-09-29.md).
// Runs one scripted pose sequence (settle, turn, fast flight, descent into low
// flight, stationary sea-level seek, turn back) through an uncached control
// generated from today's src/planet-renderer.ts and through the working tree, and
// compares a per-frame digest of every leaf-loop, eviction and admission
// output: leaf order, active set, pending/jobs, and per patch visibility,
// ocean visibility, morph, edge mask, draw range (stitching), detail flags,
// local eye, ocean uniforms, water bucket and LRU stamp.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rendererModule,maithea} from './terrain-renderer-fixture.mjs';
import {runScenario,digestPoses} from './terrain-leaf-scenario.mjs';

async function uncachedLeafLoopSource(){
  let source=readFileSync(new URL('../src/planet-renderer.ts',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  const changes=[
    ['const selectedLeaves=changed||!this.leafRecords.length;','const selectedLeaves=true;'],
    ['let sameFrame=this.leafFrameMatches(eye,frusta.length,retainedFrusta)&&!leafSetChanged&&!patchesChanged;','let sameFrame=false;'],
    ['const dirty=leafSetChanged||patchesChanged||this.morphingLeaves>0;let restitch=dirty||this.leafLoopDirty;','const dirty=leafSetChanged||patchesChanged||this.morphingLeaves>0;let restitch=true;'],
  ];
  for(const [from,to] of changes){
    assert.equal(source.split(from).length,2,`uncached-loop anchor: ${from}`);
    source=source.replace(from,()=>to);
  }
  return source;
}

test('cached terrain leaf loop is output-identical to the uncached loop for a fixed pose sequence',async t=>{
  const source=await uncachedLeafLoopSource();
  const body=maithea(),poses=digestPoses();
  const reference=await rendererModule({prefix:'atlas-leaf-ref-',rendererSource:source});
  const current=await rendererModule({prefix:'atlas-leaf-cur-'});
  try{
    // Sparse Composer residency has its own policy and request cadence. Use
    // the dense fallback here so both sides exercise only the leaf-loop cache.
    const rendererOptions={faunaGenerator:'archive-quadruped'};
    const a=await runScenario(reference.module,body,poses,{rendererOptions});
    const b=await runScenario(current.module,body,poses,{rendererOptions});
    const first=a.digests.findIndex((digest,i)=>digest!==b.digests[i]);
    if(first>=0){
      const detail=new Set([first]);
      const [ra,rb]=[await runScenario(reference.module,body,poses.slice(0,first+1),{detailFrames:detail,rendererOptions}),await runScenario(current.module,body,poses.slice(0,first+1),{detailFrames:detail,rendererOptions})];
      const sa=ra.details.get(first),sb=rb.details.get(first),diff=[];
      for(const field of Object.keys(sa))if(JSON.stringify(sa[field])!==JSON.stringify(sb[field])){
        if(field==='patches'){const m=new Map(sb.patches.map(p=>[p[0],JSON.stringify(p)]));for(const p of sa.patches)if(m.get(p[0])!==JSON.stringify(p))diff.push({ref:p,cur:m.get(p[0])??null});}
        else diff.push({field,ref:sa[field],cur:sb[field]});
      }
      assert.fail(`frame ${first} of ${poses.length} differs: ${JSON.stringify(diff.slice(0,6))}`);
    }
    assert.equal(b.digests.length,poses.length);
    // Sparse Composer residency can use fewer resident patches than the old
    // dense frontier; the fixed sequence itself exercises cache skips through
    // leaf-set changes, morphing, a stationary refresh, evictions and stitching.
    assert.equal(b.final.staleWaterPatches,0,'sea-level seek resolved within the sequence');
    assert.ok(b.final.lowFlightDetail&&b.final.visible>50,`ends in a substantial low-flight frontier (${b.final.visible})`);
    assert.ok(new Set(b.digests).size>200,'sequence changes output on many frames');
  }finally{await reference.cleanup();await current.cleanup();}
});
