// ECO_ASSEMBLAGES (biome increment 2, P3): fauna roles, flora and understory per eco class.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  ECO_ASSEMBLAGES, ECO_ROLE_IDS, ECO_FLORA_KIND_ORDER, RENDERED_ARCHETYPES, UNDERSTORY_SCALE, emptyEcoClasses, ecoRole,
} from '../src/eco-assemblages.ts';
import {ECO_CLASS_COUNT, ecotypeOf} from '../src/eco-class.ts';
import {FLORA_KIND_NAMES} from '../src/flora-field.ts';

test('one frozen entry per class 0-13, in class order',()=>{
  assert.equal(ECO_ASSEMBLAGES.length,ECO_CLASS_COUNT);
  ECO_ASSEMBLAGES.forEach((a,c)=>{assert.equal(a.ecoClass,c);assert.ok(Object.isFrozen(a)&&Object.isFrozen(a.faunaRoles)&&Object.isFrozen(a.floraKindWeights));});
  assert.ok(Object.isFrozen(ECO_ASSEMBLAGES));
});

test('flora weights use the flora-field kind order',()=>{
  assert.deepEqual([...ECO_FLORA_KIND_ORDER],[...FLORA_KIND_NAMES]);
});

test('no empty biome: every class 0-11 has a rendered fauna role and non-zero flora; 12-13 are lifeless',()=>{
  assert.deepEqual(emptyEcoClasses(),[]);
  for(let c=0;c<=11;c++){
    const a=ECO_ASSEMBLAGES[c];
    assert.ok(a.faunaRoles.some(r=>r.weight>0&&RENDERED_ARCHETYPES.includes(r.archetype)),`class ${c} fauna`);
    assert.ok(a.floraKindWeights.slice(1).reduce((s,w)=>s+w,0)>0,`class ${c} understory flora`);
    assert.ok(a.herdMultiplier>0&&a.herdMultiplier<=1,`class ${c} herd multiplier`);
  }
  for(const c of [12,13]){const a=ECO_ASSEMBLAGES[c];assert.equal(a.faunaRoles.length,0);assert.equal(a.herdMultiplier,0);assert.deepEqual([...a.floraKindWeights],[0,0,0,0]);}
});

test('negative: removing a class\'s roles or its flora makes the no-empty-biome check fail',()=>{
  const clone=ECO_ASSEMBLAGES.map(a=>({...a,faunaRoles:[...a.faunaRoles],floraKindWeights:[...a.floraKindWeights]}));
  clone[1]={...clone[1],faunaRoles:[]};
  assert.deepEqual(emptyEcoClasses(clone),[1]);
  const zeroWeight=ECO_ASSEMBLAGES.map(a=>a);zeroWeight[8]={...zeroWeight[8],faunaRoles:zeroWeight[8].faunaRoles.map(r=>({...r,weight:0}))};
  assert.deepEqual(emptyEcoClasses(zeroWeight),[8]);
  const unrendered=ECO_ASSEMBLAGES.map(a=>a);unrendered[9]={...unrendered[9],faunaRoles:unrendered[9].faunaRoles.map(r=>({...r,archetype:'hexapod'}))};
  assert.deepEqual(emptyEcoClasses(unrendered),[9]);
  const noFlora=ECO_ASSEMBLAGES.map(a=>a);noFlora[0]={...noFlora[0],floraKindWeights:[0,0,0,0]};
  assert.deepEqual(emptyEcoClasses(noFlora),[0]);
});

test('roles: ids unique and complete, archetype rendered, ecotype matches the class, anchors present',()=>{
  const seen=[];
  for(const a of ECO_ASSEMBLAGES)for(const r of a.faunaRoles){
    seen.push(r.id);
    assert.ok(RENDERED_ARCHETYPES.includes(r.archetype),r.id);
    assert.ok(Number.isInteger(r.weight)&&r.weight>0,r.id);
    assert.equal(r.ecotype,ecotypeOf(a.ecoClass),r.id);
    assert.ok(r.earthAnchor.length>3,r.id);
    assert.equal(ecoRole(r.id),r);
    if(r.archetype==='long-neck')assert.equal(r.morphology,'long-neck');
    if(r.archetype==='browser')assert.equal(r.morphology,'ungulate');
    if(r.archetype==='runner')assert.equal(r.morphology,'cursorial');
    if(r.archetype==='low-slung')assert.ok(['padded','proboscidean'].includes(r.morphology),r.id);
  }
  assert.equal(new Set(seen).size,seen.length,'role ids are unique');
  assert.deepEqual([...seen].sort(),[...ECO_ROLE_IDS].sort(),'ECO_ROLE_IDS lists exactly the table roles');
  assert.equal(ecoRole('no.such-role'),undefined);
});

test('plan anchors: savanna has a long-neck, tundra a cold browser, ice margin only bear and musk ox',()=>{
  assert.ok(ECO_ASSEMBLAGES[8].faunaRoles.some(r=>r.archetype==='long-neck'));
  assert.ok(ECO_ASSEMBLAGES[1].faunaRoles.some(r=>r.archetype==='browser'&&r.ecotype===1));
  assert.deepEqual(ECO_ASSEMBLAGES[0].faunaRoles.map(r=>r.archetype).sort(),['browser','low-slung']);
  assert.deepEqual(ECO_ASSEMBLAGES[9].faunaRoles.map(r=>r.archetype).sort(),['browser','runner','runner']);
});

test('understory, forest affinity and savanna cover are in range',()=>{
  for(const a of ECO_ASSEMBLAGES){
    assert.equal(a.understoryScale,UNDERSTORY_SCALE[a.understory]);
    assert.ok(a.forestAffinity>=-1&&a.forestAffinity<=1);
    if(a.ecoClass===8)assert.ok(a.savannaTreeCover>=.05&&a.savannaTreeCover<=.2);else assert.equal(a.savannaTreeCover,0);
    if(a.treeWeightSource==='none')assert.equal(a.floraKindWeights[0],0,`class ${a.ecoClass} tree weight without a tree source`);
    for(const w of a.floraKindWeights)assert.ok(w>=0&&w<=1);
  }
  // Spire bias in boreal and tundra margin, branching in tropics and savanna.
  assert.ok(ECO_ASSEMBLAGES[3].forestAffinity>0&&ECO_ASSEMBLAGES[1].forestAffinity>0);
  assert.ok(ECO_ASSEMBLAGES[7].forestAffinity<0&&ECO_ASSEMBLAGES[8].forestAffinity<0);
  // Legacy classes mirror flora-field pickKind: tree .34 forest / .05 open, grass .55.
  assert.deepEqual([...ECO_ASSEMBLAGES[4].floraKindWeights],[.34,.18,.55,.22]);
  assert.deepEqual([...ECO_ASSEMBLAGES[5].floraKindWeights],[.05,.06,.55,.12]);
});
