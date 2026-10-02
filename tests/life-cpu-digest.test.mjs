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
import {readFileSync} from 'node:fs';
import {lifeRendererModule,runLifeScenario,digestPoses,gitSource} from './life-scenario.mjs';

// Parent of the life CPU work (desktop-rendering-stage-c + perf harness).
const REFERENCE='e6a0b39';

// The intended life-gating behaviour change: hidden life also clears the flora
// counters (the S6 "flora visible from 15 km" finding). It is applied to the
// reference too, so the comparison isolates the optimisations.
const HIDE='    this.faunaVisibleCount=0;this.faunaCulledCount=0;this.faunaBudgetDrops=0;this.faunaDrawn=[];\n';
const FIX='    this.floraPresentCount=0;this.floraSurvivorCount=0;this.floraSubmittedCount=0;this.faunaCameraVisibleCount=0;\n';

// October's phenotype, continuous body, coat, face and pose work deliberately
// changes visible output. Feed the SAME visual model to both CPU paths so this
// remains an optimisation identity gate, rather than a frozen art snapshot.
// These exact modules own authored anatomy/appearance/motion only. In particular,
// planet-renderer, fauna-field-renderer, fauna-near-rig, fauna-runtime, ground,
// flora and culling retain their historical implementations in the reference.
// Do not expand this list to those optimised files to make a digest pass.
const SHARED_PRESENTATION_FILES=Object.freeze([
  'src/creature-model.ts','src/fauna-appearance.ts','src/fauna-body-plan.ts',
  'src/fauna-face.ts','src/fauna-structural-appendages.ts','src/fauna-locomotion.ts',
]);
function presentationSources(){
  return Object.fromEntries(SHARED_PRESENTATION_FILES.map(path=>[path,readFileSync(new URL(`../${path}`,import.meta.url),'utf8')]));
}
function useCurrentPhenotype(source){
  // Only the imported/called phenotype evaluator changes. Reference activity
  // clocks, exact date arithmetic and grounded transforms stay unoptimised.
  const imported='  individualCreatureGenome,',called='return individualCreatureGenome(founder, member.id, member.variant, member.stage);';
  assert.equal(source.split(imported).length,2,'reference phenotype import anchor');
  assert.equal(source.split(called).length,2,'reference phenotype call anchor');
  assert.equal(source.includes('ACTIVITY_SMALL_LIMIT'),false,'reference must retain original activity clock');
  return source.replace(imported,'  realisticIndividualCreatureGenome,').replace(called,'return realisticIndividualCreatureGenome(founder, member.id, member.variant, member.stage);');
}

test('life layer output is identical to the reference for a fixed pose/date sequence',async t=>{
  if(gitSource(REFERENCE,'src/planet-renderer.ts')===null){t.skip(`git object ${REFERENCE} unavailable`);return;}
  const sharedSources=presentationSources();
  const reference=await lifeRendererModule({prefix:'atlas-life-ref-',revision:REFERENCE,sharedSources,patch:{'src/fauna-runtime.ts':useCurrentPhenotype,'src/planet-renderer.ts':s=>{
    const n=s.replace(/\r\n/g,'\n');assert.equal(n.split(HIDE).length,2,'reference hideLife anchor');return n.replace(HIDE,FIX+HIDE);}}});
  const current=await lifeRendererModule({prefix:'atlas-life-cur-',sharedSources});
  const poses=digestPoses();
  assert.equal(poses.length,416,'retain every frame of the optimisation regression sequence');
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
