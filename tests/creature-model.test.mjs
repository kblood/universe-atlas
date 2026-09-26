import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBiosphere,biosphereAt} from '../src/biosphere-model.ts';
import {generateCreatureGenome,individualCreatureGenome,validateCreatureGenome} from '../src/creature-model.ts';

const archetypes=['browser','runner','low-slung','long-neck'];
const animals=w=>w.species.filter(s=>s.creature);
test('all animal species have shared versioned anatomy and complete dated ancestry',()=>{
  for(const profile of ['temperate','arid','cold']){
    const w=generateBiosphere('CREATURE-HISTORY',profile,'planet/0'),list=animals(w);
    assert.equal(list.length,12);assert.equal(w.species.length,24);
    assert.deepEqual(new Set(list.map(s=>s.creature.archetype)),new Set(archetypes));
    for(const a of archetypes){
      const family=list.filter(s=>s.creature.archetype===a);assert.equal(family.length,3);
      const last=family.find(s=>!family.some(t=>t.parentId===s.id));let s=last;const chain=[];
      while(s){assert.ok(!chain.includes(s.id));chain.push(s.id);s=list.find(t=>t.id===s.parentId);}
      assert.equal(chain.length,3);assert.equal(new Set(family.map(s=>s.lineageId)).size,1);
    }
    for(const s of list){
      assert.deepEqual(validateCreatureGenome(s.creature),[],s.id);
      assert.ok(!biosphereAt(w,s.birthMyr-1).species.some(a=>a.id===s.id));
      assert.ok(biosphereAt(w,s.birthMyr).species.some(a=>a.id===s.id));
      if(s.parentId){const p=list.find(a=>a.id===s.parentId);assert.ok(p);
        const keys=['torsoLength','torsoWidth','legLength','neckLength','headLength','footWidth','tailLength','hornLength'];
        assert.ok(keys.filter(k=>Math.abs(s.creature[k]-p.creature[k])>.001).length>=3,'descendants change multiple anatomical dimensions');
        assert.ok(s.creature.mutationLog.length>0,'inheritance has inspectable changes');
      }
    }
    assert.equal(animals(biosphereAt(w,w.formationMyr-1)).length,0);
  }
  assert.equal(animals(generateBiosphere('CREATURE-HISTORY','airless','planet/0')).length,0);
});
test('body plan envelopes differ in shape rather than only uniform size or colour',()=>{
  for(const seed of ['SHAPES-A','SHAPES-B','SHAPES-C']){
    const g=Object.fromEntries(archetypes.map(a=>[a,generateCreatureGenome(seed,a)]));
    assert.ok(g.runner.legLength/g.runner.torsoLength>g['low-slung'].legLength/g['low-slung'].torsoLength*1.4);
    assert.ok(g['long-neck'].neckLength/g['long-neck'].torsoLength>g.browser.neckLength/g.browser.torsoLength*1.4);
    assert.ok(g['low-slung'].torsoWidth/g['low-slung'].torsoLength>g.runner.torsoWidth/g.runner.torsoLength*1.15);
  }
});
test('genomes and individual growth replay without mutating their canonical parent',()=>{
  for(const a of archetypes){
    const g=generateCreatureGenome('REPLAY',a),copy=structuredClone(g);
    generateCreatureGenome('OTHER',a);assert.deepEqual(generateCreatureGenome('REPLAY',a),g);
    const variants=[0,1,2,3].map(v=>individualCreatureGenome(g,'species-1',v,'adult'));
    for(const [v,individual] of variants.entries()){
      assert.deepEqual(validateCreatureGenome(individual),[]);
      assert.deepEqual(individualCreatureGenome(g,'species-1',v,'adult'),individual);
      const juvenile=individualCreatureGenome(g,'species-1',v,'juvenile');
      assert.ok(juvenile.torsoLength<individual.torsoLength);
      assert.ok(juvenile.legLength<individual.legLength);
    }
    assert.ok(new Set(variants.map(v=>JSON.stringify(v))).size>=3);
    assert.deepEqual(g,copy);
    const child=generateCreatureGenome('CHILD',a,g);assert.deepEqual(g,copy);
    assert.equal(child.archetype,a);assert.deepEqual(validateCreatureGenome(child),[]);
  }
});
test('juvenile anatomy and locomotion scale together, and planet context changes fauna',()=>{
  for(const a of archetypes){
    const g=generateCreatureGenome('GROWTH-CHECK',a),adult=individualCreatureGenome(g,'growth-specimen',2,'adult'),young=individualCreatureGenome(g,'growth-specimen',2,'juvenile');
    for(const key of ['neckRise','strideLength','walkSpeed','runSpeed']) assert.ok(young[key]<adult[key],`${a} juvenile ${key}`);
    assert.ok(young.runSpeed>young.walkSpeed);
  }
  const seed='s'.repeat(160);
  assert.deepEqual(validateCreatureGenome(generateCreatureGenome(seed,'browser')),[]);
  assert.doesNotThrow(()=>generateBiosphere(seed,'temperate','planet/0'));
  const temperate=animals(generateBiosphere('PROFILE-CONTEXT','temperate','planet/0')).map(s=>s.creature);
  const arid=animals(generateBiosphere('PROFILE-CONTEXT','arid','planet/0')).map(s=>s.creature);
  assert.notDeepEqual(temperate,arid,'planet/profile context changes creature founders and descendants');
});
test('invalid anatomical and individual inputs cannot silently produce malformed rigs',()=>{
  const g=generateCreatureGenome('VALID','browser');
  for(const key of ['torsoLength','legLength','headLength','footWidth']){
    assert.ok(validateCreatureGenome({...g,[key]:0}).length>0,key);
    assert.ok(validateCreatureGenome({...g,[key]:NaN}).length>0,key);
  }
  assert.ok(validateCreatureGenome({...g,runSpeed:-1}).length>0);
  assert.ok(validateCreatureGenome({...g,torsoLength:99}).length>0);
  assert.ok(validateCreatureGenome({...g,armor:2}).length>0);
  for(const v of [-1,4,NaN,.3])assert.throws(()=>individualCreatureGenome(g,'s',v));
  assert.throws(()=>generateCreatureGenome('SEED','unsupported'));
});
