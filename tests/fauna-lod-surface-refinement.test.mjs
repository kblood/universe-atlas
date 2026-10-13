import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Worker} from 'node:worker_threads';
import {generateCreatureGenome,realisticIndividualCreatureGenome} from '../src/creature-model.ts';
import {buildQuadrupedBody} from '../src/fauna-body-plan.ts';
import {buildFaunaBodyLodCandidates} from '../src/fauna-body-lod-candidates.ts';
import {buildFaunaSurfaceRefinedLodChain} from '../src/fauna-lod-surface-refinement.ts';
import {posedBodyPositions} from './helpers/fauna-body-lod-metrics.mjs';
const hash=s=>{const h=createHash('sha256');for(const k of ['positions','normals','colors','skinIndex','skinWeight','index'])h.update(new Uint8Array(s[k].buffer,s[k].byteOffset,s[k].byteLength));return h.digest('hex');};
const source=buildQuadrupedBody(realisticIndividualCreatureGenome(generateCreatureGenome('SURFACE-REFINEMENT','runner'),'refine/runner',1,'adult','cursorial'));
let refined;
test('refinement keeps source, target topology and anchors, publishes true barycentric provenance',()=>{
  const before=hash(source),genome=JSON.stringify(source.plan.genome),base=buildFaunaBodyLodCandidates(source,{methods:['joint-constrained-qem']});
  refined=buildFaunaSurfaceRefinedLodChain(source);
  assert.equal(hash(source),before);assert.equal(JSON.stringify(source.plan.genome),genome);assert.equal(refined.source,source);
  for(let i=0;i<refined.levels.length;i++){
    const level=refined.levels[i],original=base.chains[0].levels[i];assert.deepEqual(level.index,original.index);assert.equal(level.triangleCount,original.triangleCount);assert.equal(level.vertexCount,original.vertexCount);assert.equal(level.plan,source.plan);
    assert.equal(level.resampled,true);assert.equal(level.sourceVertex,undefined);assert.ok(level.refinement.movedVertices>0);assert.equal(level.reached,original.reached);
    for(let v=0;v<level.vertexCount;v++){
      const tri=level.sourceTriangle[v],bary=level.barycentric.subarray(v*3,v*3+3),total=bary[0]+bary[1]+bary[2];assert.ok(tri<source.triangleCount);assert.ok(Math.abs(total-1)<1e-6);assert.ok(bary.every(w=>w>=0&&w<=1));
      for(let c=0;c<3;c++){
        let value=0,colour=0;for(let k=0;k<3;k++){const s=source.index[tri*3+k];value+=source.positions[s*3+c]*bary[k]/total;colour+=source.colors[s*3+c]*bary[k]/total;}
        assert.ok(Object.is(level.positions[v*3+c],Math.fround(value)));assert.equal(level.colors[v*3+c],Math.round(colour));
      }
      assert.equal(level.skinWeight.subarray(v*4,v*4+4).reduce((a,b)=>a+b,0),255);assert.ok(level.skinIndex.subarray(v*4,v*4+4).every(bone=>bone<22));
      assert.ok(Math.abs(Math.hypot(...level.normals.subarray(v*3,v*3+3))-1)<1e-5);
    }
    for(const anchor of refined.anchorVertices){
      const v=level.initialSourceVertex.findIndex(s=>[0,1,2].every(c=>source.positions[s*3+c]===source.positions[anchor*3+c]));assert.ok(v>=0);
      for(const [key,lanes] of [['positions',3],['normals',3],['colors',3],['skinIndex',4],['skinWeight',4]])for(let c=0;c<lanes;c++)assert.ok(Object.is(level[key][v*lanes+c],original[key][v*lanes+c]));
    }
  }
});
test('deterministic canonical-palette deformation remains finite with fixed foot anchors',()=>{
  const second=buildFaunaSurfaceRefinedLodChain(source);for(let i=0;i<second.levels.length;i++)assert.equal(hash(second.levels[i]),hash(refined.levels[i]));
  for(const [phase,state] of [[.18,'alert'],[.61,'alert'],[0,'feed']]){
    const full=posedBodyPositions(source,phase,state);
    for(const level of refined.levels){const posed=posedBodyPositions(level,phase,state);assert.ok(posed.every(Number.isFinite));
      for(const anchor of refined.anchorVertices){const v=level.initialSourceVertex.findIndex(s=>[0,1,2].every(c=>source.positions[s*3+c]===source.positions[anchor*3+c]));const s=level.initialSourceVertex[v];for(let c=0;c<3;c++)assert.ok(Object.is(posed[v*3+c],full[s*3+c]));}
    }
  }
});
test('bounds and shared cancellation reject without changing source',()=>{
  const before=hash(source);for(const options of [{passes:0},{passes:5},{strength:1},{maxMoveFraction:.1},{cancelFlag:new Int32Array(1)}])assert.throws(()=>buildFaunaSurfaceRefinedLodChain(source,options),/fauna surface refinement/);
  const flag=new Int32Array(new SharedArrayBuffer(4));Atomics.store(flag,0,1);assert.throws(()=>buildFaunaSurfaceRefinedLodChain(source,{cancelFlag:flag}),/cancelled/);assert.equal(hash(source),before);
});

test('four archetypes adult and juvenile preserve faces, budgets, source identity and finite resampled rigs',()=>{
 for(const [archetype,family] of [['browser','ungulate'],['runner','cursorial'],['low-slung','padded'],['long-neck','long-neck']])for(const stage of ['adult','juvenile']){
  const body=buildQuadrupedBody(realisticIndividualCreatureGenome(generateCreatureGenome('SURFACE-REFINEMENT-CORPUS',archetype),`${archetype}/${stage}`,1,stage,family)),before=hash(body),base=buildFaunaBodyLodCandidates(body,{methods:['joint-constrained-qem']}),result=buildFaunaSurfaceRefinedLodChain(body);
  assert.equal(hash(body),before);
  for(let i=0;i<result.levels.length;i++){
   const level=result.levels[i],original=base.chains[0].levels[i];assert.deepEqual(level.index,original.index);assert.ok(level.reached&&level.withinBudget);assert.equal(level.appendagesPresent,true);assert.equal(level.droppedFeatures.length,0);
   const faceNormal=(p,t)=>{const [a,b,c]=Array.from(level.index.subarray(t*3,t*3+3),v=>Array.from(p.subarray(v*3,v*3+3))),u=b.map((v,k)=>v-a[k]),w=c.map((v,k)=>v-a[k]);return [u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];};
   for(let t=0;t<level.triangleCount;t++){const a=faceNormal(original.positions,t),b=faceNormal(level.positions,t);assert.ok(a.reduce((sum,v,k)=>sum+v*b[k],0)>0,`${archetype}/${stage}/${level.target}: inverted face`);}
   for(const [phase,state] of [[.61,'alert'],[0,'feed']]){
    const posed=posedBodyPositions(level,phase,state),full=posedBodyPositions(body,phase,state);assert.ok(posed.every(Number.isFinite));
    for(const anchor of result.anchorVertices){const v=level.initialSourceVertex.findIndex(s=>[0,1,2].every(c=>body.positions[s*3+c]===body.positions[anchor*3+c]));assert.ok(v>=0);const originalId=level.initialSourceVertex[v];for(let c=0;c<3;c++)assert.ok(Object.is(posed[v*3+c],full[originalId*3+c]));}
   }
  }
 }
});

test('live worker job cancels with a shared flag and borrowed source buffers remain attached',async()=>{
 const before=hash(source),flag=new Int32Array(new SharedArrayBuffer(4)),worker=new Worker(new URL('./helpers/fauna-lod-surface-worker.mjs',import.meta.url),{workerData:{source,cancelFlag:flag}});
 try{
  const response=await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(new Error('surface worker cancellation timeout')),30000);
   worker.on('error',error=>{clearTimeout(timeout);reject(error);});worker.on('message',message=>{if(message.started)setTimeout(()=>Atomics.store(flag,0,1),10);else{clearTimeout(timeout);resolve(message);}});
  });assert.match(response.error,/cancelled/);assert.equal(hash(source),before);assert.ok(source.positions.byteLength>0);
 }finally{await worker.terminate();}
});
