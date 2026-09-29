// Output identity for the life CPU optimisations (docs/life-cpu-2026-09-29.md).
// Runs one scripted pose/date sequence at the harness's living inland site
// (paused and realtime still frames, turning, walking, no shadow frustum, fast
// flight with rescatter, climbing out of and back into the life gate, exact
// seeks) through the reference life files from git and through the working
// tree, and compares a per-frame digest of every life output: each fauna
// instanced mesh's count, matrices and colours; the visible near rigs, their
// transforms and bone palettes; the rigged member ids and pose states; every
// flora bucket's count and matrices; group origins; `faunaDrawn` (ids, cells,
// positions, genomes); and the life counters.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lifeRendererModule,runLifeScenario,digestPoses,gitSource} from './life-scenario.mjs';

// Parent of the life CPU work (desktop-rendering-stage-c + perf harness).
const REFERENCE='e6a0b39';

// The one intended behaviour change: hidden life also clears the flora
// counters (the S6 "flora visible from 15 km" finding). It is applied to the
// reference too, so the comparison isolates the optimisations.
const HIDE='    this.faunaVisibleCount=0;this.faunaCulledCount=0;this.faunaBudgetDrops=0;this.faunaDrawn=[];\n';
const FIX='    this.floraPresentCount=0;this.floraSurvivorCount=0;this.floraSubmittedCount=0;this.faunaCameraVisibleCount=0;\n';

test('life layer output is identical to the reference for a fixed pose/date sequence',async t=>{
  if(gitSource(REFERENCE,'src/planet-renderer.ts')===null){t.skip(`git object ${REFERENCE} unavailable`);return;}
  const reference=await lifeRendererModule({prefix:'atlas-life-ref-',revision:REFERENCE,patch:{'src/planet-renderer.ts':s=>{
    const n=s.replace(/\r\n/g,'\n');assert.equal(n.split(HIDE).length,2,'reference hideLife anchor');return n.replace(HIDE,FIX+HIDE);}}});
  const current=await lifeRendererModule({prefix:'atlas-life-cur-'});
  const poses=digestPoses();
  try{
    const a=await runLifeScenario(reference.module,poses);
    const b=await runLifeScenario(current.module,poses);
    const first=a.digests.findIndex((digest,i)=>digest!==b.digests[i]);
    if(first>=0){
      const detail=new Set([first]);
      const [ra,rb]=[await runLifeScenario(reference.module,poses.slice(0,first+1),{detailFrames:detail}),await runLifeScenario(current.module,poses.slice(0,first+1),{detailFrames:detail})];
      const sa=ra.details.get(first),sb=rb.details.get(first),diff=[];
      for(const field of Object.keys(sa))if(JSON.stringify(sa[field])!==JSON.stringify(sb[field]))diff.push({field,ref:JSON.stringify(sa[field]).slice(0,400),cur:JSON.stringify(sb[field]).slice(0,400)});
      assert.fail(`frame ${first} (${poses[first].phase}) of ${poses.length} differs: ${JSON.stringify(diff.slice(0,4))}`);
    }
    assert.equal(b.digests.length,poses.length);
    // The sequence must exercise what the optimisations skip or cache.
    const s=b.stats;
    assert.ok(s.maxDrawn>=300,`dense fauna in view (${s.maxDrawn})`);
    assert.ok(s.maxRigs>=3,`near rigs active (${s.maxRigs})`);
    assert.ok(s.maxFlora>=500,`understory flora submitted (${s.maxFlora})`);
    assert.ok(s.hiddenFrames>=5,`life gate closed on some frames (${s.hiddenFrames})`);
    assert.ok(s.packBuilds>=2,`rescatter repacked life (${s.packBuilds})`);
    assert.ok(new Set(b.digests).size>poses.length*.6,'output changes on most frames');
  }finally{await reference.cleanup();await current.cleanup();}
});

test('hidden life reports no flora or fauna (S6 15 km finding)',async()=>{
  const current=await lifeRendererModule({prefix:'atlas-life-hide-'});
  const poses=digestPoses();
  try{
    const r=await runLifeScenario(current.module,poses);
    const hidden=r.hidden;assert.ok(hidden.length>=5);
    for(const h of hidden){
      assert.deepEqual(h.floraCounts,[0,0,0],`frame ${h.i}: flora present/survivor/submitted`);
      assert.equal(h.floraMeshInstances,0,`frame ${h.i}: no flora instances drawn`);
      assert.equal(h.backlog[0],0,`frame ${h.i}: backlog floraSubmitted`);
      assert.equal(h.backlog[1],0,`frame ${h.i}: backlog faunaVisible`);
      assert.equal(h.faunaDrawn,0);
    }
  }finally{await current.cleanup();}
});
