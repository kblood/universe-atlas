import {test} from 'node:test';
import assert from 'node:assert/strict';
import {forestPopulationCells} from '../src/planet-population.ts';
import {ForestSelectionCache} from '../src/forest-selection-cache.ts';
const norm=v=>v.map(x=>x/Math.hypot(...v));
test('cached selection is exactly equal at faces, seams, corners and nearby flight positions',()=>{
  for(const seed of ['CACHE-A','CACHE-B']){
    const r=3200,cache=new ForestSelectionCache(seed,r,18);
    for(const c of [[0,0,1],[1,1,0],[1,1,1],[-1,1,1],[1,.999,1.001],[.01,.02,1]].map(norm)){
      const expected=forestPopulationCells(seed,c,r,250,700,18);
      assert.deepEqual(cache.select(c,250,700),expected);
      assert.deepEqual(cache.select(c,250,700),expected);
      assert.equal(cache.diagnostics().misses,0,'warmed identical view reuses all population arithmetic');
      assert.ok(cache.diagnostics().estimatedBytes<=cache.diagnostics().maxBytes);
    }
  }
});
test('eviction, zero cache and query order cannot change selected cells',()=>{
  for(const [bytes,count] of [[0,0],[12000,2],[100000,100]]){
    const cache=new ForestSelectionCache('EVICTION',3200,18,bytes,count);
    const c=norm([1,1,1]),expected=forestPopulationCells('EVICTION',c,3200,150,500,18);
    assert.deepEqual(cache.select(c,150,500),expected);
    cache.select(norm([-1,-1,-1]),150,500);
    assert.deepEqual(cache.select(c,150,500),expected);
    assert.ok(cache.diagnostics().estimatedBytes<=bytes);assert.ok(cache.diagnostics().patches<=count);
  }
});
test('cache validates bounds and returns independent objects',()=>{
  assert.throws(()=>new ForestSelectionCache('X',NaN,18));
  assert.throws(()=>new ForestSelectionCache('X',3200,18,-1));
  const cache=new ForestSelectionCache('X',3200,18);
  assert.throws(()=>cache.select([0,0,2],100,200));
  const first=cache.select([0,0,1],100,200),copy=structuredClone(first);
  first[0].heightM=999;first[0].direction[0]=999;
  assert.deepEqual(cache.select([0,0,1],100,200),copy);
});

test('Earth-scale seam and corner perturbations retain exact selection boundaries',()=>{
  const r=6000000,cache=new ForestSelectionCache('FUZZ-SEAMS',r,18);let state=0x781298;
  const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  for(let i=0;i<12;i++){
    const base=i%2?[1,1,0]:[1,1,1],c=norm(base.map(x=>x+(random()-.5)*1000/r));
    const near=100+random()*300,far=500+random()*1000;
    assert.deepEqual(cache.select(c,near,far),forestPopulationCells('FUZZ-SEAMS',c,r,near,far,18));
  }
});

test('current Earth-scale corner working set leaves cache headroom',()=>{
  const cache=new ForestSelectionCache('CACHE-EARTH-SCALE',6000000,18);
  cache.select(norm([1,1,1]),750,4500);const stats=cache.diagnostics();
  assert.ok(stats.estimatedBytes<stats.maxBytes*.7,'range increases need an explicit memory/headroom review');
  assert.ok(stats.patches<stats.maxEntries*.7);
  assert.equal(stats.evictionsTotal,0);
});
