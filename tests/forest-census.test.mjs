import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createForestCensus,ForestCensus,FOREST_CENSUS_STRIDE as STRIDE} from '../src/forest-census.ts';
import {forestPatch} from '../src/forest-patch.ts';
import {forestHabitat} from '../src/forest-habitat.ts';
import {forestRepresentative,populationCellAt} from '../src/planet-population.ts';
import {terrainSampler} from '../src/terrain.ts';
import {biomeClassifier} from '../src/surface-biomes.ts';
import {galaxies,refByAddress,system} from '../src/catalog.ts';

const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
function livingPatch(n){
  const sample=terrainSampler(body),classify=biomeClassifier(body);
  for(let i=0;i<1024;i++){
    const cy=1-2*(i+.5)/1024,phi=i*2.399963229728653,r=Math.sqrt(1-cy*cy),cx=Math.cos(phi)*r,cz=Math.sin(phi)*r;
    const d=[cx,cy,cz];if(!classify(d,sample(d).groundHeightM).forestPotential)continue;
    const components=[cx,-cx,cy,-cy,cz,-cz],axis=Math.max(...components),face=components.indexOf(axis);
    const [u,v]=[[-cz/axis,cy/axis],[cz/axis,cy/axis],[cx/axis,-cz/axis],[cx/axis,cz/axis],[cx/axis,cy/axis],[-cx/axis,cy/axis]][face];
    return {face,n,x:Math.floor(Math.min(n-1,Math.floor((u+1)*n/2))/8),y:Math.floor(Math.min(n-1,Math.floor((v+1)*n/2))/8)};
  }
  throw new Error('No forest fixture found');
}
function complete(census,address,slice=8){let result=census.start(address);while(!result)result=census.step(slice);return result;}
function assertAddressRoundTrip(seed,patch){
  assert.equal(patch.records.length,patch.present*STRIDE);
  for(let i=0;i<patch.records.length;i+=STRIDE){
    const offset=patch.records[i];assert.ok(Number.isInteger(offset)&&offset>=0&&offset<64);
    const ix=patch.address.x*8+(offset%8),iy=patch.address.y*8+Math.floor(offset/8);
    const cell=populationCellAt(seed,patch.address.face,patch.address.n,ix,iy);
    assert.ok(cell,`address ${patch.address.face}/${patch.address.n}/${ix}/${iy} must select a population cell`);
    assert.equal(cell.id,`${patch.address.face}/${patch.address.n}/${ix}/${iy}`);
    assert.deepEqual(cell.direction,Array.from(patch.records.slice(i+1,i+4)));
    assert.equal(cell.roll,patch.records[i+4]);assert.equal(cell.heightM,patch.records[i+5]);assert.equal(cell.yaw,patch.records[i+6]);
  }
}
function reference(seed,address,habitat){
  const p=forestPatch(seed,address),records=[];let representatives=0;
  for(const c of p.cells){const h=habitat(c);if(!h.present)continue;
    const parts=c.id.split('/'),offset=(Number(parts[3])-address.y*8)*8+Number(parts[2])-address.x*8;
    const representative=Number(forestRepresentative(seed,c.id));representatives+=representative;
    records.push(offset,...c.direction,c.roll,c.heightM,c.yaw,h.groundHeightM,representative);
  }
  return {records:new Float64Array(records),candidates:p.cells.length,representatives};
}
test('complete census equals the authoritative near query across cube faces and water contexts',async()=>{
  let candidates=0,trees=0;
  for(const water of [-50,0,3000]){
    const census=await createForestCensus(body,water),n=census.n;
    const query=forestHabitat(terrainSampler(body,undefined,undefined,undefined,water),biomeClassifier(body,water),body.radiusM);
    const living=livingPatch(n),actualLiving=complete(census,living),expectedLiving=reference(body.seed,living,query);
    assertAddressRoundTrip(body.seed,actualLiving);
    assert.deepEqual(actualLiving.records,expectedLiving.records);trees+=actualLiving.present;
    for(let face=0;face<6;face++)for(const fraction of [.02,.38,.5,.98]){
      const a={face,n,x:Math.floor(n*fraction/8),y:Math.floor(n*.49/8)},actual=complete(census,a),expected=reference(body.seed,a,query);
      assert.deepEqual(actual.records,expected.records);assertAddressRoundTrip(body.seed,actual);assert.equal(actual.candidates,expected.candidates);
      assert.equal(actual.present,expected.records.length/STRIDE);assert.equal(actual.representatives,expected.representatives);candidates+=actual.candidates;trees+=actual.present;
    }
  }
  assert.ok(candidates>1000);
  assert.ok(trees>0,'fixture includes real present trees, not only empty habitat');
});
test('slices are bounded, cancellation never yields a partial patch and visit order is irrelevant',()=>{
  let calls=0;const query=c=>{calls++;return {present:c.roll<.76,groundHeightM:240+c.roll};};
  const c=new ForestCensus('fixture','CENSUS',33,query,100000,10),a={face:0,n:33,x:2,y:2};
  assert.equal(c.start(a),null);assert.throws(()=>c.start(a));
  assert.equal(c.step(1),null);assert.equal(calls,1);c.cancelActive();assert.equal(c.step(),null);
  const first=complete(c,a,1),again=complete(c,a,8);assert.deepEqual(first,again);
  assert.equal(c.diagnostics().hits,1);
  assert.deepEqual(first.records,reference('CENSUS',a,query).records);
  assert.throws(()=>c.step(0));assert.throws(()=>c.step(65));
  assert.throws(()=>c.start({...a,n:34}));assert.throws(()=>c.start({...a,x:-1}));
});
test('transfer detachment, mutations, zero budgets and eviction cannot change patch results',()=>{
  const query=c=>({present:true,groundHeightM:300+c.roll});
  const c=new ForestCensus('fixture','CACHE',33,query,10000,1),a={face:0,n:33,x:2,y:2};
  const first=complete(c,a),expected=first.records.slice();
  structuredClone(first,{transfer:[first.records.buffer]});assert.equal(first.records.byteLength,0);
  const fresh=complete(c,a);assert.deepEqual(fresh.records,expected);fresh.records.fill(NaN);fresh.address.face=4;
  assert.deepEqual(complete(c,a).records,expected);
  complete(c,{...a,x:3});assert.equal(c.diagnostics().patches,1);assert.equal(c.diagnostics().evictionsTotal,1);
  assert.deepEqual(complete(c,a).records,expected);assert.ok(c.diagnostics().estimatedBytes<=10000);
  const uncached=new ForestCensus('fixture','CACHE',33,query,0,0);assert.deepEqual(complete(uncached,a).records,expected);assert.equal(uncached.diagnostics().patches,0);
});
test('partial edge patches and known empty patches are complete, not missing',()=>{
  const c=new ForestCensus('fixture','EDGE',33,()=>({present:false,groundHeightM:0}),10000,10);
  const p=complete(c,{face:5,n:33,x:4,y:4});assert.equal(p.testedCells,1);assert.equal(p.present,0);assert.equal(p.records.length,0);
  assert.equal(c.diagnostics().patches,1);
  const invalid=new ForestCensus('fixture','EDGE',33,()=>({present:true,groundHeightM:NaN}),10000,10);
  const address={face:0,n:33,x:2,y:2};invalid.start(address);assert.throws(()=>invalid.step());assert.equal(invalid.diagnostics().patches,0);
  assert.equal(invalid.start(address),null,'a failed step must clear the active patch so callers can recover');
  invalid.cancelActive();
});
test('snapshot and content stamp isolate water and same-ID hydrology edits',async()=>{
  const plain=await createForestCensus(body,0),reordered=await createForestCensus(Object.fromEntries(Object.entries(body).reverse()),0);
  assert.equal(plain.context,reordered.context);assert.notEqual(plain.context,(await createForestCensus(body,1)).context);
  const region={version:'river-region-2',id:'same-id',parentCatchmentId:'test',bodyId:body.id,bodySeed:body.seed,radiusM:body.radiusM,
    origin:[0,0,1],east:[1,0,0],north:[0,1,0],boundsM:[-100,-100,100,100],channels:[],lakes:[],sites:[],stats:{samples:0,lengthM:0,maxCutM:0,maxFillM:0,buildAlgorithm:'fixture'}};
  const changed={...body,hydrology:region},first=await createForestCensus(changed,0),stamp=first.context;
  changed.hydrology.boundsM[0]=-200;
  assert.notEqual(stamp,(await createForestCensus(changed,0)).context);assert.equal(first.context,stamp);
  const a={face:0,n:plain.n,x:Math.floor(plain.n*.5/8),y:Math.floor(plain.n*.5/8)};
  const expected=complete(first,a);changed.seed='caller-mutated';changed.water=0;
  assert.deepEqual(complete(first,a),expected,'caller mutation cannot reach sampler snapshot');
  await assert.rejects(createForestCensus(body,NaN));await assert.rejects(createForestCensus(body,0,-1));
});

test('context hashing fails closed on unsupported binary/container values and non-finite numbers',async()=>{
  for(const value of [new Map([['river',1]]),new Set([1]),new ArrayBuffer(8),new DataView(new ArrayBuffer(8)),NaN,Infinity,-Infinity]){
    const malformed=structuredClone(body);malformed.hashProbe=value;
    await assert.rejects(createForestCensus(malformed,0),undefined,`reject ${Object.prototype.toString.call(value)}`);
  }
  const first=structuredClone(body);first.hashProbe=new Float64Array([1,2,3]);
  const changed=structuredClone(body);changed.hashProbe=new Float64Array([1,2,4]);
  assert.notEqual((await createForestCensus(first,0)).context,(await createForestCensus(changed,0)).context,
    'typed-array contents must participate in the content stamp');
});
