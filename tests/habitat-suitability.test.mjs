import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateBiosphere,biosphereAt,habitatMembership,profileFromPhysicalProperties} from '../src/biosphere-model.ts';
import {bindTreeSpecies} from '#tree-kit/v1/recipes';
import {climateForcingFromParams,surfaceClimate,createClimateSample} from '../src/surface-climate.ts';
import {
  HABITAT_SUITABILITY_VERSION,PROFILE_NOMINAL_TEMP_K,nicheSuitability,slopeDegToNiche01,rebaseTemperatureK,
  compileNicheEvaluator,familyClimateAffinity,treeSpeciesWeights,clearTreeSpeciesWeightCache,pickWeightedMax,faunaSpeciesWeights,
} from '../src/habitat-suitability.ts';

const PROFILES=['temperate','arid','cold'];
const worldFor=(profile,address='habitat-suitability/test')=>generateBiosphere('W0-CLIMATE',profile,address);
/** A date at which every lineage member except the extinct branching founder lives. */
const fullDate=world=>Math.max(...world.species.map(s=>s.birthMyr))+1;
// Frozen copy of tree-species-recipe.ts's private hash (FNV-1a + murmur finaliser).
function legacyHash(text){
  let h=2166136261;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
  h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);
  return (h^(h>>>16))>>>0;
}
let state=0x9e3779b9;
const rand=()=>{state=Math.imul(state^(state>>>15),0x2c1b3c6d)>>>0;state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};

test('versions and nominal profile temperatures match the biosphere niche centres',()=>{
  assert.equal(HABITAT_SUITABILITY_VERSION,'habitat-suitability-1');
  for(const profile of PROFILES){
    const world=worldFor(profile),nominal=PROFILE_NOMINAL_TEMP_K[profile];
    const quad=world.species.find(s=>s.id.endsWith('/lineage/quadruped/browser/0'));
    assert.equal((quad.niche.minTempK+quad.niche.maxTempK)/2,nominal,'quadruped founder niche is centred on the profile temperature');
    const branching=world.species.find(s=>s.id.endsWith('/lineage/branching/0'));
    assert.equal(branching.niche.minTempK,nominal-11);assert.equal(branching.niche.maxTempK,nominal+10);
  }
  assert.equal(slopeDegToNiche01(0),0);assert.equal(slopeDegToNiche01(22.5),.5);assert.equal(slopeDegToNiche01(90),1);
  assert.equal(rebaseTemperatureK(252,252,'cold'),268);
  assert.equal(rebaseTemperatureK(300,286,'temperate'),300);
});

test('nicheSuitability === habitatMembership over 5 lab habitats x 3 profiles; evaluator occupancy matches',()=>{
  let compared=0;
  for(const profile of PROFILES){
    const world=worldFor(profile),date=fullDate(world),dated=biosphereAt(world,date).species;
    // anchor == nominal => offset 0 => the evaluator sees the habitat temperature unchanged.
    const ev=compileNicheEvaluator(dated,profile,PROFILE_NOMINAL_TEMP_K[profile]);
    const plantOut=new Float32Array(ev.plantIds.length),animalOut=new Float32Array(ev.animalIds.length);
    assert.equal(world.habitats.length,5);
    for(const h of world.habitats){
      const local={temperatureK:h.temperatureK,moisture:h.moisture,slope01:h.slope,reachable:h.reachable};
      for(const s of world.species){
        assert.equal(nicheSuitability(s.niche,local).suitability,habitatMembership(world,s,h,date).suitability,`${profile}/${h.id}/${s.id}`);compared++;
      }
      ev.plants(local,plantOut);ev.animals(local,animalOut);
      ev.plantIds.forEach((id,i)=>{const m=habitatMembership(world,dated.find(s=>s.id===id),h,date);assert.equal(plantOut[i],m.occupied?Math.fround(m.suitability):0,`${profile}/${h.id}/${id}`);});
      ev.animalIds.forEach((id,i)=>{const m=habitatMembership(world,dated.find(s=>s.id===id),h,date);assert.equal(animalOut[i],m.occupied?Math.fround(m.suitability):0,`${profile}/${h.id}/${id}`);});
    }
  }
  assert.equal(compared,3*5*24);
});

test('evaluator reproduces habitatMembership occupancy on 3,000 random habitats (incl. the producer rule)',()=>{
  let occupiedAnimals=0,blockedByProducer=0;
  for(const profile of PROFILES){
    const world=worldFor(profile,'habitat-suitability/random'),date=fullDate(world),dated=biosphereAt(world,date).species;
    const nominal=PROFILE_NOMINAL_TEMP_K[profile],ev=compileNicheEvaluator(dated,profile,nominal);
    const plantOut=new Float32Array(ev.plantIds.length),animalOut=new Float32Array(ev.animalIds.length);
    const plants=ev.plantIds.map(id=>dated.find(s=>s.id===id)),animals=ev.animalIds.map(id=>dated.find(s=>s.id===id));
    for(let i=0;i<1000;i++){
      const h={id:'h',name:'h',groundColor:'#000',temperatureK:nominal-25+rand()*50,moisture:rand(),slope:rand(),reachable:rand()<.9};
      ev.plants({temperatureK:h.temperatureK,moisture:h.moisture,slope01:h.slope,reachable:h.reachable},plantOut);
      ev.animals({temperatureK:h.temperatureK,moisture:h.moisture,slope01:h.slope,reachable:h.reachable},animalOut);
      plants.forEach((s,k)=>{const m=habitatMembership(world,s,h,date);assert.equal(plantOut[k],m.occupied?Math.fround(m.suitability):0);});
      animals.forEach((s,k)=>{const m=habitatMembership(world,s,h,date);assert.equal(animalOut[k],m.occupied?Math.fround(m.suitability):0);
        if(m.occupied)occupiedAnimals++;if(m.reasons.includes('no eligible producer resource'))blockedByProducer++;});
    }
  }
  assert.ok(occupiedAnimals>100&&blockedByProducer>100,`exercised both producer branches (${occupiedAnimals}/${blockedByProducer})`);
});

test('after rebasing, planets at 235..330 K all have occupied plants somewhere on a latitude x height sweep',()=>{
  for(const T of [235,252,278,279,295,321,330]){
    const profile=profileFromPhysicalProperties({water:.5,temperatureK:T},'main-sequence');
    const world=worldFor(profile,`habitat-suitability/anchor-${T}`),dated=biosphereAt(world,fullDate(world)).species;
    const ev=compileNicheEvaluator(dated,profile,T),out=new Float32Array(ev.plantIds.length);
    const climate=surfaceClimate(climateForcingFromParams({anchorTempK:T,obliquityRad:23.44*Math.PI/180,water:.5,moistureSeed:T*977})),o=createClimateSample();
    let occupied=0,samples=0;
    for(let lat=0;lat<=90;lat+=5)for(let lon=0;lon<12;lon++)for(let h=0;h<=4000;h+=250){
      const x=Math.sin(lat*Math.PI/180),r=Math.cos(lat*Math.PI/180),a=lon*Math.PI/6;
      climate([Math.cos(a)*r,x,Math.sin(a)*r],h,o);
      ev.plants({temperatureK:o.annualMeanTempK,moisture:o.effectiveMoisture,slope01:.2},out);samples++;
      if(out.some(v=>v>0))occupied++;
    }
    assert.ok(occupied>0,`${T} K (${profile}): ${occupied}/${samples} sample points occupied`);
  }
});

test('family affinity corrects the spire/branching inversion; tree weights are bounded, memoised and fall back',()=>{
  for(const profile of PROFILES){
    const n=PROFILE_NOMINAL_TEMP_K[profile];
    assert.ok(familyClimateAffinity('spire',n-8,.6,profile)>familyClimateAffinity('branching',n-8,.6,profile),'cold favours spires');
    assert.ok(familyClimateAffinity('branching',n+8,.7,profile)>familyClimateAffinity('spire',n+8,.7,profile),'warm+moist favours branching');
    assert.equal(familyClimateAffinity('bush',n,.5,profile),1);
  }
  clearTreeSpeciesWeightCache();
  const world=worldFor('temperate'),dated=biosphereAt(world,fullDate(world)).species,trees=dated.filter(s=>s.kind==='tree');
  const mixed=[...dated];
  let nonUniform=0;
  for(let code=0;code<256;code++){
    const w=treeSpeciesWeights(mixed,code,'temperate');
    assert.equal(w.length,mixed.length);
    mixed.forEach((s,i)=>{assert.ok(w[i]>=0&&w[i]<=8);if(s.kind!=='tree')assert.equal(w[i],0);else assert.ok(w[i]>=1||trees.some((_,j)=>w[mixed.indexOf(trees[j])]>0));});
    if(new Set(trees.map(s=>w[mixed.indexOf(s)])).size>1)nonUniform++;
    const again=treeSpeciesWeights(mixed,code,'temperate');assert.deepEqual(again,w);assert.notEqual(again,w,'fresh copy');
    again[0]=99;assert.deepEqual(treeSpeciesWeights(mixed,code,'temperate'),w,'memo cannot be corrupted');
  }
  assert.ok(nonUniform>20,`climate shapes tree weights in ${nonUniform} codes`);
  // Far too cold for every niche: legacy uniform fallback.
  const frozen=treeSpeciesWeights(trees,(0<<3)|4,'temperate');
  assert.deepEqual([...frozen],trees.map(()=>1));
  // Cold codes prefer spires, warm-moist codes prefer branching trees.
  const famWeight=(code,family)=>{const w=treeSpeciesWeights(trees,code,'temperate');return trees.reduce((a,s,i)=>a+(s.family===family?w[i]:0),0);};
  const cold=((16-5)<<3)|5,warm=((16+1)<<3)|5; // -9 K and +3 K from the anchor, moisture 0.69
  assert.ok(famWeight(cold,'spire')/famWeight(cold,'branching')>famWeight(warm,'spire')/famWeight(warm,'branching'));
});

test('pickWeightedMax: all-ones reproduces bindTreeSpecies; weights are proportional; order independent',()=>{
  const score=(cell,list)=>(i,k)=>legacyHash(JSON.stringify(k===0?[cell,list[i].id,'tree-species-binding-1']:[cell,list[i].id,'tree-species-binding-1',k]));
  let matched=0;
  for(const [profile,address] of [['temperate','a'],['arid','b'],['cold','c']]){
    const world=worldFor(profile,`habitat-suitability/bind/${address}`),dated=biosphereAt(world,fullDate(world)).species;
    const weights=dated.map(s=>s.kind==='tree'&&(s.family==='branching'||s.family==='spire')?1:0);
    for(let c=0;c<10000;c++){
      const cell=`${address}/cell/${c}`;
      const i=pickWeightedMax(dated.length,weights,score(cell,dated),i=>dated[i].id);
      assert.equal(dated[i]?.id,bindTreeSpecies(cell,dated)?.id);matched++;
    }
  }
  assert.equal(matched,30000);
  // Chi-square proportionality for weights {1,3,4} over 100k cells (df=2, p>0.01 <=> chi2<9.21).
  const cand=[{id:'x'},{id:'y'},{id:'z'}],w=[1,3,4],counts=[0,0,0],N=100000;
  for(let c=0;c<N;c++)counts[pickWeightedMax(3,w,score(`chi/${c}`,cand),i=>cand[i].id)]++;
  const chi2=counts.reduce((a,n,i)=>{const e=N*w[i]/8;return a+(n-e)*(n-e)/e;},0);
  assert.ok(chi2<9.21,`chi2=${chi2} counts=${counts}`);
  // Enumeration order does not matter.
  const perm=[2,0,1],pc=perm.map(i=>cand[i]),pw=perm.map(i=>w[i]);
  for(let c=0;c<5000;c++){
    const a=cand[pickWeightedMax(3,w,score(`ord/${c}`,cand),i=>cand[i].id)].id;
    const b=pc[pickWeightedMax(3,pw,score(`ord/${c}`,pc),i=>pc[i].id)].id;
    assert.equal(a,b);
  }
  // Ties go to the smaller key by code-unit order; zero weights never win; all-zero returns -1.
  assert.equal(pickWeightedMax(3,[1,1,1],()=>5,i=>['b','a','c'][i]),1);
  assert.equal(pickWeightedMax(3,[1,1,1],()=>5,i=>['B','a','é'][i]),0,'code-unit, not locale, order');
  assert.equal(pickWeightedMax(2,[0,1],(i)=>i?1:100,()=>''),1);
  assert.equal(pickWeightedMax(2,[0,0],()=>1,()=>''),-1);
});

test('fauna species weights are bounded integers and zero only where absent',()=>{
  const w=faunaSpeciesWeights(new Float32Array([0,.001,.28,.5,1,1.5]));
  assert.deepEqual([...w],[0,1,2,4,8,8]);
});

import {checkAllocation} from './helpers/alloc-audit/check.mjs';
test('habitat-suitability allocation: GC bytes plus heap growth, validated no-op control', () => {
  checkAllocation('h-niche.mjs');
});
