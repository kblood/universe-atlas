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
import {readFileSync} from 'node:fs';
import {rendererModule,maithea} from './terrain-renderer-fixture.mjs';
import {runScenario,digestPoses,gitRendererSource} from './terrain-leaf-scenario.mjs';

// Parent of the leaf-loop change: the terrain budget fix, before caching.
const REFERENCE='5ad62a6';

// The request-order policy added after the leaf-loop change
// (`deferUndrawnRefreshes`) is a behaviour change, not an optimization. It is
// applied to the reference with the worktree's own function text, so the
// comparison still isolates the cached loop from the policy.
function withRequestOrder(source){
  const current=readFileSync(new URL('../src/planet-renderer.ts',import.meta.url),'utf8');
  const fn=current.replace(/\r\n/g,'\n').match(/\/\*\* Request order[\s\S]*?\nexport function deferUndrawnRefreshes[\s\S]*?\n}\n/);
  assert.ok(fn,'deferUndrawnRefreshes found in the worktree renderer');
  const unique='    const unique = new Map(wanted.map(t => [tileKey(t), t]));\n',roots='const ROOTS: Tile[] = Array.from';
  assert.equal(source.split(unique).length,2,'reference request map anchor');
  assert.equal(source.split(roots).length,2,'reference ROOTS anchor');
  return source.replace(unique,unique+'    deferUndrawnRefreshes(unique,this.patches);\n').replace(roots,fn[0]+roots);
}

// render-bounds-1 (P5-RENDER-BOUNDS) changes WHICH tiles are culled and
// refined (body height bound, per-tile drawn extent, ancestor-metadata
// candidates, seabed-distance selection), again a policy and not part of the
// cached loop. The worktree's own `// <render-bounds>` block is inserted into
// the reference and its four bound sites call it, so the comparison still
// isolates the cache. The byte-blocked refinement fix (P5, found by the deep
// seabed descent) runs only on a seabed dive (renderSeabedDive), which no
// pose here is, so it needs no swap: the reference keeps its own streaming
// lines. Every anchor must match exactly once.
function withRenderBounds(source){
  const current=readFileSync(new URL('../src/planet-renderer.ts',import.meta.url),'utf8').replace(/\r\n/g,'\n');
  const block=current.match(/\/\/ <render-bounds>\n[\s\S]*?\n\/\/ <\/render-bounds>\n/);
  assert.ok(block,'render-bounds block found in the worktree renderer');
  const swaps=[
    ['const ROOTS: Tile[] = Array.from',block[0]+'const ROOTS: Tile[] = Array.from'],
    [`      // Conservative horizon test, expanded for the highest possible terrain.
      const margin = 20000 * this.relief / this.body.radiusM;
      const core=1-16000/this.body.radiusM;
      const eyeCos=Math.min(1,Math.max(0,core/distance)),peakCos=Math.min(1,Math.max(0,core/(1+margin)));
      const horizonCos=eyeCos*peakCos-Math.sqrt(1-eyeCos*eyeCos)*Math.sqrt(1-peakCos*peakCos);
      const horizon = direction.dot(center) + bound >= horizonCos;
      const sphere = new THREE.Sphere(center, bound + margin);
      const resident=this.patches.get(key);
      if(resident?.mesh.geometry.boundingSphere){
        sphere.copy(resident.mesh.geometry.boundingSphere);sphere.center.add(resident.mesh.position);
      }
`,`      const resident=this.patches.get(key);
      const {horizon,sphere}=renderTileBounds(t,center,bound,resident,this.patches,this.body,this.relief,snappedWaterLevelM,distance,direction);
`],
    [`      const ground=new THREE.Vector3(...nearest).multiplyScalar(1+Math.max(this.body.water?snappedWaterLevelM*this.relief:-Infinity,elevation)/this.body.radiusM);
      const near = Math.max(1e-9, eye.distanceTo(ground));
`,`      const near=seabedAwareNear(eye,nearest,elevation,!!resident?.ocean,this.body,snappedWaterLevelM);
`],
    ['(distance-1)*this.body.radiusM<20000*this.relief+6000&&','(distance-1)*this.body.radiusM<renderDetailAltitudeM(this.body,this.relief)&&'],
  ];
  for(const [from,to] of swaps){
    assert.equal(source.split(from).length,2,`reference render-bounds anchor: ${from.slice(0,60)}`);
    source=source.replace(from,()=>to);
  }
  return source;
}

test('cached terrain leaf loop is output-identical to the reference loop for a fixed pose sequence',async t=>{
  const raw=gitRendererSource(REFERENCE);
  if(raw===null){t.skip(`git object ${REFERENCE} unavailable`);return;}
  const source=withRenderBounds(withRequestOrder(raw));
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
