// Output identity for the cached terrain leaf loop (docs/terrain-budget-2026-09-29.md).
// Runs one scripted pose sequence (settle, turn, fast flight, descent into low
// flight, stationary sea-level seek, turn back) through the reference revision
// of src/planet-renderer.ts from git and through the working tree, and
// compares a per-frame digest of every leaf-loop, eviction and admission
// output: leaf order, active set, pending/jobs, and per patch visibility,
// ocean visibility, morph, edge mask, draw range (stitching), detail flags,
// local eye, ocean uniforms, water bucket and LRU stamp.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rendererModule,maithea} from './terrain-renderer-fixture.mjs';
import {runScenario,digestPoses,gitRendererSource} from './terrain-leaf-scenario.mjs';

// Parent of the leaf-loop change: the terrain budget fix, before caching.
const REFERENCE='5ad62a6';

test('cached terrain leaf loop is output-identical to the reference loop for a fixed pose sequence',async t=>{
  const source=gitRendererSource(REFERENCE);
  if(source===null){t.skip(`git object ${REFERENCE} unavailable`);return;}
  const body=maithea(),poses=digestPoses();
  const reference=await rendererModule({prefix:'atlas-leaf-ref-',rendererSource:source});
  const current=await rendererModule({prefix:'atlas-leaf-cur-'});
  try{
    const a=await runScenario(reference.module,body,poses);
    const b=await runScenario(current.module,body,poses);
    const first=a.digests.findIndex((digest,i)=>digest!==b.digests[i]);
    if(first>=0){
      const detail=new Set([first]);
      const [ra,rb]=[await runScenario(reference.module,body,poses.slice(0,first+1),{detailFrames:detail}),await runScenario(current.module,body,poses.slice(0,first+1),{detailFrames:detail})];
      const sa=ra.details.get(first),sb=rb.details.get(first),diff=[];
      for(const field of Object.keys(sa))if(JSON.stringify(sa[field])!==JSON.stringify(sb[field])){
        if(field==='patches'){const m=new Map(sb.patches.map(p=>[p[0],JSON.stringify(p)]));for(const p of sa.patches)if(m.get(p[0])!==JSON.stringify(p))diff.push({ref:p,cur:m.get(p[0])??null});}
        else diff.push({field,ref:sa[field],cur:sb[field]});
      }
      assert.fail(`frame ${first} of ${poses.length} differs: ${JSON.stringify(diff.slice(0,6))}`);
    }
    assert.equal(b.digests.length,poses.length);
    // The fixture must exercise what the cache skips: leaf-set changes,
    // morphing, a stationary refresh, evictions and a stitched frontier.
    assert.equal(b.final.staleWaterPatches,0,'sea-level seek resolved within the sequence');
    assert.ok(b.final.lowFlightDetail&&b.final.visible>50,`ends in a large low-flight frontier (${b.final.visible})`);
    assert.ok(new Set(b.digests).size>200,'sequence changes output on many frames');
  }finally{await reference.cleanup();await current.cleanup();}
});
