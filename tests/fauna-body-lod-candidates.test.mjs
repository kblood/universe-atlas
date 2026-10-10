import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {generateCreatureGenome,realisticIndividualCreatureGenome} from '../src/creature-model.ts';
import {buildQuadrupedBody} from '../src/fauna-body-plan.ts';
import {buildFaunaBodyLodCandidates} from '../src/fauna-body-lod-candidates.ts';
import {FaunaLodCandidateCache} from '../src/fauna-lod-candidate-cache.ts';
import {FaunaBodyLodCache} from '../src/fauna-body-lod.ts';
import {posedBodyPositions} from './helpers/fauna-body-lod-metrics.mjs';
const hash=b=>{const h=createHash('sha256');for(const k of ['positions','normals','colors','skinIndex','skinWeight','index'])h.update(new Uint8Array(b[k].buffer,b[k].byteOffset,b[k].byteLength));return h.digest('hex');};
const fixture=(archetype='browser',family='ungulate',stage='adult')=>buildQuadrupedBody(realisticIndividualCreatureGenome(generateCreatureGenome('LOD-CANDIDATE-TEST',archetype),`${archetype}/${family}/${stage}`,1,stage,family));
test('both methods retain source identity, exact surviving attributes and honest budget metadata',()=>{
  for(const [archetype,family] of [['browser','ungulate'],['runner','cursorial'],['low-slung','padded'],['long-neck','long-neck']])for(const stage of ['adult','juvenile']){
    const source=fixture(archetype,family,stage),before=hash(source),genome=JSON.stringify(source.plan.genome),result=buildFaunaBodyLodCandidates(source);
    assert.equal(result.source,source);assert.equal(hash(source),before);assert.equal(JSON.stringify(source.plan.genome),genome);
    for(const chain of result.chains){
      assert.ok(chain.anchorVertices.length>=16);assert.ok(chain.optionsHash);assert.equal(chain.provenance.geometryChecksum,result.baseline.provenance.geometryChecksum);
      for(const level of chain.levels){
        assert.equal(level.plan,source.plan);assert.equal(level.reached,level.triangleCount<=level.target);assert.equal(level.withinBudget,level.reached&&level.vertexCount<=level.target);
        assert.ok(level.index.every(v=>v<level.vertexCount));assert.ok(level.representative.every(v=>v<level.vertexCount));
        let triangles=0;for(const part of level.parts){assert.equal(part.firstTriangle,triangles);triangles+=part.triangles;}assert.equal(triangles,level.triangleCount);
        for(let v=0;v<level.vertexCount;v++)for(const [k,lanes] of [['positions',3],['normals',3],['colors',3],['skinIndex',4],['skinWeight',4]])for(let c=0;c<lanes;c++)assert.ok(Object.is(level[k][v*lanes+c],source[k][level.sourceVertex[v]*lanes+c]));
        if(chain.method==='joint-constrained-qem')for(const anchor of chain.anchorVertices)assert.ok(level.sourceVertex.some(v=>[0,1,2].every(c=>source.positions[v*3+c]===source.positions[anchor*3+c])),`${family}/${stage}/${level.target}: protected foot position lost`);
      }
    }
  }
});
test('same-source candidates are deterministic and preserve canonical walk/feed skinning',()=>{
  const source=fixture(),first=buildFaunaBodyLodCandidates(source),second=buildFaunaBodyLodCandidates(source);
  for(let i=0;i<first.chains.length;i++)for(let j=0;j<3;j++){
    const level=first.chains[i].levels[j];assert.equal(hash(level),hash(second.chains[i].levels[j]));assert.equal(first.chains[i].optionsHash,second.chains[i].optionsHash);
    for(const [phase,behaviour] of [[.18,'alert'],[.61,'alert'],[0,'feed']]){
      const full=posedBodyPositions(source,phase,behaviour),reduced=posedBodyPositions(level,phase,behaviour);
      for(let v=0;v<level.vertexCount;v++)for(let c=0;c<3;c++)assert.ok(Object.is(reduced[v*3+c],full[level.sourceVertex[v]*3+c]));
    }
  }
});
test('constraints affect cache identity and invalid controls reject',()=>{
  const source=fixture(),cache=new FaunaBodyLodCache(1),mask=new Uint8Array(source.vertexCount),options={targets:[500],reducer:{protectedVertices:mask}};
  const a=cache.get(source,options);mask.fill(1);const b=cache.get(source,options);assert.notEqual(a,b);assert.equal(b.levels[0].reached,false);
  for(const bad of [{targets:[500,750]},{methods:['unknown']},{methods:[]},{methods:['joint-constrained-qem','joint-constrained-qem']}])assert.throws(()=>buildFaunaBodyLodCandidates(source,bad));
});

test('candidate retention cache enforces count and bytes, clears borrowed lifetime, rejects over-budget admission',()=>{
 const source=fixture(),cache=new FaunaLodCandidateCache(1),a=cache.get(source);
 assert.equal(cache.get(source),a);assert.ok(cache.allocatedBytes>0&&cache.allocatedBytes<=cache.maxDerivedBytes);assert.ok(cache.retainedSourceBytes>=source.positions.byteLength);
 const other=fixture('runner','cursorial');cache.get(other);assert.equal(cache.size,1);assert.notEqual(cache.get(source),a);
 cache.invalidate(source);assert.equal(cache.size,0);assert.equal(cache.allocatedBytes,0);assert.equal(cache.retainedSourceBytes,0);
 const tiny=new FaunaLodCandidateCache(1,1024);assert.throws(()=>tiny.get(source),/retained byte budget/);assert.equal(tiny.size,0);cache.clear();
});
