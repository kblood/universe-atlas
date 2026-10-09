import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {generateCreatureGenome,realisticIndividualCreatureGenome} from '../src/creature-model.ts';
import {buildQuadrupedBody} from '../src/fauna-body-plan.ts';
import {buildFaunaBodyLodChain,FaunaBodyLodCache,faunaBodyLodQuality} from '../src/fauna-body-lod.ts';
import {posedBodyPositions,bodyDiagonal} from './helpers/fauna-body-lod-metrics.mjs';
const families=[['browser','ungulate'],['runner','cursorial'],['low-slung','padded'],['long-neck','long-neck'],['browser','proboscidean'],['runner','winged']];
const fixtures=families.map(([a,f])=>{
  const body=buildQuadrupedBody(realisticIndividualCreatureGenome(generateCreatureGenome('LOD-PROBE',a),a+'/'+f,1,'adult',f));
  return {name:f,body,chain:buildFaunaBodyLodChain(body)};
});
const hash=body=>{const h=createHash('sha256');for(const k of ['positions','normals','colors','skinIndex','skinWeight','index'])h.update(Buffer.from(body[k].buffer,body[k].byteOffset,body[k].byteLength));return h.digest('hex');};
test('derived levels preserve original attributes, source body and bone/genome identity, under explicit budgets',()=>{
  for(const {name,body,chain} of fixtures){
    const before=hash(body),genome=JSON.stringify(body.plan.genome);
    const repeat=buildFaunaBodyLodChain(body);
    assert.equal(hash(body),before,`${name}: source modified`);assert.equal(JSON.stringify(body.plan.genome),genome);
    assert.equal(chain.source,body);assert.equal(chain.provenance.geometryChecksum,repeat.provenance.geometryChecksum);
    let previous=Infinity;
    for(const [i,l] of chain.levels.entries()){
      assert.equal(hash(l),hash(repeat.levels[i]),`${name}: nondeterministic chain`);
      assert.equal(l.plan,body.plan);assert.ok(l.reached&&l.withinBudget,`${name}/${l.target}: bounded target not reached`);
      assert.ok(l.triangleCount<=l.target&&l.vertexCount<=l.target&&l.triangleCount<previous);previous=l.triangleCount;
      for(let v=0;v<l.vertexCount;v++){
        const s=l.sourceVertex[v];assert.ok(s<body.vertexCount&&(v===0||s>l.sourceVertex[v-1]));
        for(const [k,lanes] of [['positions',3],['normals',3],['colors',3],['skinIndex',4],['skinWeight',4]])for(let c=0;c<lanes;c++)assert.ok(Object.is(l[k][v*lanes+c],body[k][s*lanes+c]),`${name}: ${k} source byte/float moved`);
        assert.equal(l.skinWeight.slice(v*4,v*4+4).reduce((a,b)=>a+b,0),255);
      }
      assert.ok(l.index.every(v=>v<l.vertexCount));assert.ok(l.representative.every(v=>v<l.vertexCount));
      let cursor=0;for(const part of l.parts){assert.equal(part.firstTriangle,cursor);cursor+=part.triangles;}assert.equal(cursor,l.triangleCount);
      assert.ok(l.appendagesPresent,`${name}/${l.target}: a primary appendage disappeared`);
      for(const f of l.faceFeatures){assert.ok(f.firstVertex+f.vertexCount<=l.vertexCount);assert.ok(f.firstTriangle+f.triangleCount<=l.triangleCount);}
    }
  }
});
test('LOD skinning uses exactly the same surviving positions/weights at walk and head-lowered poses',()=>{
  for(const {name,body,chain} of fixtures)for(const [phase,behaviour] of [[.18,'alert'],[.61,'alert'],[0,'feed']]){
    const source=posedBodyPositions(body,phase,behaviour);
    for(const l of chain.levels){
      const posed=posedBodyPositions(l,phase,behaviour);
      for(let v=0;v<l.vertexCount;v++)for(let c=0;c<3;c++)assert.ok(Object.is(posed[v*3+c],source[l.sourceVertex[v]*3+c]),`${name}/${l.target}: surviving vertex poses differently`);
    }
  }
});
test('close and mid levels retain a bounded surface/envelope; far quality is reported honestly',()=>{
  for(const {name,body,chain} of fixtures){
    const diagonal=bodyDiagonal(body);
    for(const l of chain.levels){
      const q=faunaBodyLodQuality(body,l,{stride:32});
      assert.ok(Number.isFinite(q.surface.max)&&q.surface.samples>0&&Number.isFinite(q.envelopeLossM));
      if(l.target>=500){
        assert.ok(q.surface.p95<diagonal*.05,`${name}/${l.target}: surface p95 ${q.surface.p95/diagonal}`);
        assert.ok(q.envelopeLossM<diagonal*.12,`${name}/${l.target}: silhouette envelope loss ${q.envelopeLossM/diagonal}`);
      }
    }
  }
});
test('source-identity cache is bounded, immutable-source hits reuse results, replacements invalidate',()=>{
  const cache=new FaunaBodyLodCache(2),[a,b,c]=fixtures.map(f=>f.body);
  const one=cache.get(a,{targets:[500]});assert.equal(cache.get(a,{targets:[500]}),one);
  const two=cache.get(b,{targets:[500]});cache.get(a,{targets:[500]});cache.get(c,{targets:[500]});assert.equal(cache.size,2);
  assert.notEqual(cache.get(b,{targets:[500]}),two,'least recently used B must be rebuilt');
  const changed={...a,plan:{...a.plan,genome:{...a.plan.genome}}};const value=cache.get(changed,{targets:[500]});
  changed.plan={...changed.plan,genome:{...changed.plan.genome}};const newGenome=cache.get(changed,{targets:[500]});assert.notEqual(newGenome,value,'genome identity change must invalidate');
  changed.positions=changed.positions.slice();assert.notEqual(cache.get(changed,{targets:[500]}),newGenome);
  assert.ok(cache.allocatedBytes>0);cache.clear();assert.equal(cache.size,0);assert.equal(cache.allocatedBytes,0);
});
test('invalid budgets, malformed indices/weights and missing feature ranges fail closed',()=>{
  const body=fixtures[0].body;
  for(const targets of [[],[3],[500,500],[500,1500],[3001],[1500,,200],[1500,500,200,100,64]])assert.throws(()=>buildFaunaBodyLodChain(body,{targets}),/targets/);
  assert.throws(()=>buildFaunaBodyLodChain(body,{reducer:{skin:NaN}}),/finite/);
  const index=body.index.slice();index[0]=body.vertexCount;assert.throws(()=>buildFaunaBodyLodChain({...body,index}),/index/);
  const skinWeight=body.skinWeight.slice();skinWeight[0]=0;skinWeight[1]=0;skinWeight[2]=0;skinWeight[3]=0;assert.throws(()=>buildFaunaBodyLodChain({...body,skinWeight}),/sum/);
  assert.throws(()=>buildFaunaBodyLodChain({...body,faceFeatures:[]}),/range layout/);
  assert.throws(()=>buildFaunaBodyLodChain({...body,faceFeatures:body.faceFeatures.map((f,i)=>i?f:{...f,firstVertex:-1})}),/range layout/);
});
