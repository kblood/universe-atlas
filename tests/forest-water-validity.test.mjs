import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ForestWaterValidity,forestWaterIntervalContains} from '../src/forest-water-validity.ts';
import {createForestCensus} from '../src/forest-census.ts';
import {forestPatch} from '../src/forest-patch.ts';
import {forestHabitat} from '../src/forest-habitat.ts';
import {terrainSampler,previousDouble} from '../src/terrain.ts';
import {buildCanonicalHydrology} from '../src/hydrology-registry.ts';
import {biomeClassifier} from '../src/surface-biomes.ts';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {setArchivedInlandRiversForTesting} from '../src/inland-rivers.ts';

const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
// Fixture history: surface-biomes-2-climate turned the old face:2 patch to snow;
// the face:4 (25214, 46241) patch then had 35 eligible cells and 30 slope-rejected
// trees. terrain-1.8.0-relief (P4-RELIEF r2) lowers that land below the 300 m
// test water (empty census). The patch is now FOUND, not hard-coded: the first
// direction in fib(i, 65536) order that is dry land with v2 forest at water 300
// and a +-5 m habitat-probe slope >= 0.4, whose patch has slope-rejected trees
// and more eligible cells than rejections. On terrain-1.8.0-relief this is
// fib i 17234 (lat 28.30 deg, ground 2301 m): face 5 (23790, 56593), 26 eligible,
// 4 rejected, 22 present.
//
// Sea datum (surface-biomes-2.1-sea-datum, terrain-1.8.0-relief): the climate,
// the coast/forest gates and the land colour are measured from the CURRENT sea
// level, so every land sample depends continuously on the water level, and the
// terrain observer pins a patch with land to exactly its own water level. A
// completed land patch is therefore reused only at an unchanged water level;
// before the datum it was reused anywhere inside its H/G step envelope.
const FIXTURE_WATER_M=300;
const fib=(i,N)=>{const y=1-2*(i+.5)/N,p=i*2.399963229728653,r=Math.sqrt(1-y*y);return [Math.cos(p)*r,y,Math.sin(p)*r];};
function patchAt(d,n){
  const [cx,cy,cz]=d,components=[cx,-cx,cy,-cy,cz,-cz],axis=Math.max(...components),face=components.indexOf(axis);
  const [u,v]=[[-cz/axis,cy/axis],[cz/axis,cy/axis],[cx/axis,-cz/axis],[cx/axis,cz/axis],[cx/axis,cy/axis],[-cx/axis,cy/axis]][face];
  return {face,n,x:Math.floor(Math.min(n-1,Math.floor((u+1)*n/2))/8),y:Math.floor(Math.min(n-1,Math.floor((v+1)*n/2))/8)};
}
function findFixturePatch(){
  const n=Math.ceil(2*body.radiusM/18),W=FIXTURE_WATER_M;
  const sample=terrainSampler(body,undefined,undefined,false,W),classify=biomeClassifier(body,W),habitat=forestHabitat(sample,classify,body.radiusM,true);
  const up=new THREE.Vector3(0,1,0),pole=new THREE.Vector3(1,0,0);
  const slopeAt=dir=>{const d=new THREE.Vector3(...dir),right=new THREE.Vector3().crossVectors(Math.abs(d.y)>.9?pole:up,d).normalize();
    const a=d.clone().addScaledVector(right,5/body.radiusM).normalize(),b=d.clone().addScaledVector(right,-5/body.radiusM).normalize();
    return Math.abs(sample(a.toArray()).groundHeightM-sample(b.toArray()).groundHeightM)/10;};
  for(let i=0,N=1<<16;i<N;i++){
    const d=fib(i,N),s=sample(d);
    if(s.wet||!classify(d,s.groundHeightM).forestPotential||slopeAt(d)<.4)continue;
    const a=patchAt(d,n);let eligible=0,rejected=0;
    for(const cell of forestPatch(body.seed,a).cells){
      const c=sample(cell.direction),b=classify(cell.direction,c.groundHeightM);
      if(c.wet||!b.forestPotential||!(cell.roll<.76*b.forestSuitability01))continue;
      eligible++;if(!habitat(cell).present)rejected++;
    }
    if(rejected>0&&eligible>rejected)return {address:a,i,eligible,rejected};
  }
  throw new Error('no forest-water-validity fixture patch found');
}
const fixture=findFixturePatch(),address=fixture.address;
console.log('# forest-water-validity fixture',JSON.stringify(fixture));
function complete(census,a){let result=census.start(a);while(!result)result=census.step(8);return result;}

test('interval boundaries preserve strict ocean comparisons exactly',()=>{
  const v=new ForestWaterValidity(10);
  v.observe(4);v.observe(9);v.observe(10);v.observe(12);v.observe(20);
  assert.deepEqual(v.interval(),[9,10]);
  assert.equal(forestWaterIntervalContains(v.interval(),9),false,'lower threshold equality flips strict threshold < water');
  assert.equal(forestWaterIntervalContains(v.interval(),9+Number.EPSILON*16),true);
  assert.equal(forestWaterIntervalContains(v.interval(),10),true,'upper threshold equality remains false for threshold < water');
  assert.equal(forestWaterIntervalContains(v.interval(),10+Number.EPSILON*16),false);
  assert.throws(()=>v.observe(NaN));assert.throws(()=>v.observe(Infinity));
});

test('waterless bodies retain an unbounded interval',async()=>{
  const dry={...structuredClone(body),water:0};
  const census=await createForestCensus(dry,1234);
  const patch=complete(census,address);
  assert.deepEqual(patch.waterInterval,[-Infinity,Infinity]);
  assert.equal(forestWaterIntervalContains(patch.waterInterval,-1e9),true);
  assert.equal(forestWaterIntervalContains(patch.waterInterval,1e9),true);
});

test('real patch interval records primary and every evaluated slope probe, including rejected trees',async()=>{
  const W=FIXTURE_WATER_M;
  const census=await createForestCensus(body,W),actual=complete(census,address);
  const classify=biomeClassifier(body,W);
  const thresholds=[],ground=[],d=new THREE.Vector3(),right=new THREE.Vector3(),a=new THREE.Vector3(),b=new THREE.Vector3();
  const up=new THREE.Vector3(0,1,0),pole=new THREE.Vector3(1,0,0),ad=[0,0,0],bd=[0,0,0];
  let eligible=0,rejected=0,primary=0,samples=0,landSamples=0;
  const terrain=terrainSampler(body,undefined,undefined,false,W,h=>thresholds.push(h));
  const track=dir=>{const result=terrain(dir);thresholds.push(result.groundHeightM);ground.push(result.groundHeightM);samples++;if(result.groundHeightM>=W)landSamples++;return result;};
  const checked=forestHabitat(track,classify,body.radiusM,true);
  for(const cell of forestPatch(body.seed,address).cells){
    const s=track(cell.direction);primary++;
    const biome=classify(cell.direction,s.groundHeightM);
    const preSlope=!s.wet&&biome.forestPotential&&cell.roll<.76*biome.forestSuitability01;
    const result=checked(cell);
    if(!preSlope)continue;
    eligible++;
    d.set(...cell.direction);right.crossVectors(Math.abs(d.y)>.9?pole:up,d).normalize();
    a.copy(d).addScaledVector(right,5/body.radiusM).normalize();b.copy(d).addScaledVector(right,-5/body.radiusM).normalize();
    a.toArray(ad);b.toArray(bd);track(ad);track(bd);
    if(!result.present)rejected++;
  }
  const lower=Math.max(...thresholds.filter(t=>t<W),-Infinity),upper=Math.min(...thresholds.filter(t=>t>=W),Infinity);
  assert.ok(rejected>0,'the fixture contains candidates rejected after both slope probes were evaluated');
  assert.equal(samples,2*primary+4*eligible,'each primary is sampled twice and each eligible candidate adds two probes, twice');
  assert.equal(thresholds.length,2*samples+2*landSamples,'one H callback and one returned G per sample, plus the sea-datum pin pair per land sample');
  assert.deepEqual(actual.waterInterval,[lower,upper]);
  assert.ok(eligible>rejected);assert.ok(actual.present>0);
  // A forested patch has land samples, so its interval is pinned to exactly W.
  assert.ok(landSamples>0);
  assert.deepEqual(actual.waterInterval,[previousDouble(W),W],'land patch: valid at exactly its own water level');
  assert.equal(forestWaterIntervalContains(actual.waterInterval,W),true);
  assert.equal(forestWaterIntervalContains(actual.waterInterval,lower),false);
  assert.equal(forestWaterIntervalContains(actual.waterInterval,upper+1e-5),false);
  const same=await createForestCensus(body,W),again=complete(same,address);
  assert.deepEqual(again.records,actual.records,'the exact water level reproduces canonical census records');
  // Why the pin is required: the step-only (H/G) envelope of this patch would
  // still contain 1000 m, but the census at 1000 m differs (the sea datum moved
  // the climate and the forest gate), so reusing there would return stale trees.
  const stepOnly=[Math.max(...ground.filter(t=>t<W),-Infinity),Math.min(...ground.filter(t=>t>=W),Infinity)];
  assert.equal(forestWaterIntervalContains(stepOnly,1000),true,'fixture: 1000 m lies inside the step-only envelope');
  const higher=await createForestCensus(body,1000),moved=complete(higher,address);
  assert.notDeepEqual(moved.records,actual.records,'sea datum 1000 m changes the canonical census of this patch');
});

test('family and water both gate inherited completed patches; returned interval copies are isolated',async()=>{
  const W=FIXTURE_WATER_M;
  const first=await createForestCensus(body,W),original=complete(first,address),saved=original.records.slice();
  original.waterInterval[0]=Number.POSITIVE_INFINITY;original.records.fill(NaN);
  const inRange=await createForestCensus(body,W,undefined,undefined,first);
  assert.equal(inRange.diagnostics().reusedPatches,1);
  assert.deepEqual(complete(inRange,address).records,saved,'caller edits cannot mutate immutable cached records or interval metadata');

  for(const water of [1000,3000]){
    const outside=await createForestCensus(body,water,undefined,undefined,first);
    assert.equal(outside.diagnostics().reusedPatches,0,`water ${water}: outside the recorded interval (sea datum moved) forces a new complete census`);
    const outsidePatch=complete(outside,address),fresh=await createForestCensus(body,water);
    assert.deepEqual(outsidePatch.records,complete(fresh,address).records);
    assert.equal(outside.diagnostics().misses,1);
  }

  const changed={...structuredClone(body),seed:body.seed+'-different-family'};
  const mismatch=await createForestCensus(changed,W,undefined,undefined,first);
  assert.notEqual(mismatch.family,first.family);
  assert.equal(mismatch.diagnostics().reusedPatches,0,'body family mismatch rejects an otherwise in-range patch');

  const hydrology={version:'river-region-2',id:'same-id',parentCatchmentId:'test',bodyId:body.id,bodySeed:body.seed,
    radiusM:body.radiusM,origin:[0,0,1],east:[1,0,0],north:[0,1,0],boundsM:[-100,-100,100,100],channels:[],lakes:[],sites:[],
    stats:{samples:0,lengthM:0,maxCutM:0,maxFillM:0,buildAlgorithm:'fixture'}};
  const riverBody={...structuredClone(body),hydrology};
  const withRiver=await createForestCensus(riverBody,W),riverPatch=complete(withRiver,address);
  const oldFamily=withRiver.family;riverBody.hydrology.boundsM[0]=-200;
  const changedRiver=await createForestCensus(riverBody,W,undefined,undefined,withRiver);
  assert.notEqual(changedRiver.family,oldFamily,'same river ID cannot hide changed hydrology geometry');
  assert.equal(changedRiver.diagnostics().reusedPatches,0);
  assert.equal(complete(changedRiver,address).present,riverPatch.present);
});

test('canonical river patch reuses only within its sampled H/G interval (archived rivers)',async t=>{
  // Inland rivers are withdrawn from the application; exercise the archived
  // river terrain explicitly for this historical cache-validity case.
  setArchivedInlandRiversForTesting(true);t.after(()=>setArchivedInlandRiversForTesting(false));
  const {regions}=buildCanonicalHydrology(body);assert.ok(regions.length>0);
  const riverBody={...body,canonicalRivers:regions},region=regions[0];
  const faceComponents=[region.origin[0],-region.origin[0],region.origin[1],-region.origin[1],region.origin[2],-region.origin[2]];
  const axis=Math.max(...faceComponents),face=faceComponents.indexOf(axis);
  const [u,v]=[[-region.origin[2]/axis,region.origin[1]/axis],[region.origin[2]/axis,region.origin[1]/axis],
    [region.origin[0]/axis,-region.origin[2]/axis],[region.origin[0]/axis,region.origin[2]/axis],
    [region.origin[0]/axis,region.origin[1]/axis],[-region.origin[0]/axis,region.origin[1]/axis]][face];
  const n=address.n,a={face,n,x:Math.floor(Math.min(n-1,Math.floor((u+1)*n/2))/8),y:Math.floor(Math.min(n-1,Math.floor((v+1)*n/2))/8)};
  const originalCensus=await createForestCensus(riverBody,0),original=complete(originalCensus,a);
  const withRiver=terrainSampler(riverBody,undefined,undefined,false,0),withoutRiver=terrainSampler({...riverBody,canonicalRivers:undefined},undefined,undefined,false,0);
  let changedGround=0,riverWaterSamples=0;
  for(const cell of forestPatch(body.seed,a).cells){const r=withRiver(cell.direction);if(r.waterKind)riverWaterSamples++;if(r.groundHeightM!==withoutRiver(cell.direction).groundHeightM)changedGround++;}
  assert.ok(riverWaterSamples>0,'fixture patch samples actual canonical river water');
  assert.ok(changedGround>0,'river geometry changes terrain ground samples in this patch');
  assert.equal(original.present,0,'this river-mouth fixture is a complete known-empty tree patch');
  const [lo,hi]=original.waterInterval,insideWater=(lo+hi)/2;
  const reused=await createForestCensus(riverBody,insideWater,undefined,undefined,originalCensus);
  assert.equal(reused.diagnostics().reusedPatches,1);
  assert.deepEqual(complete(reused,a).records,original.records);
  const fresh=await createForestCensus(riverBody,insideWater);
  assert.deepEqual(complete(fresh,a).records,original.records,'reused and fresh canonical river censuses agree');
});

test('water-only census hops reuse exact immutable records only at an unchanged sea datum',async()=>{
  // terrain-1.8.0-relief: a land patch is pinned to its own water level (see the
  // header). Same-level hops reuse; a hop that moves the sea recomputes, and the
  // result never depends on the path taken to reach a water level.
  const W=FIXTURE_WATER_M;
  const first=await createForestCensus(body,W),source=complete(first,address);
  const second=await first.atWater(W);
  assert.equal(second.family,first.family);assert.equal(second.diagnostics().reusedPatches,1);
  const secondPatch=complete(second,address);assert.deepEqual(secondPatch.records,source.records);
  const third=await second.atWater(1000);
  assert.equal(third.family,first.family);assert.notEqual(third.context,second.context);
  assert.equal(third.diagnostics().reusedPatches,0,'the sea datum moved: no stale reuse');
  const thirdPatch=complete(third,address),fresh=await createForestCensus(body,1000);
  assert.deepEqual(thirdPatch.records,complete(fresh,address).records,'path-independent: hop result equals a fresh census');
  assert.notDeepEqual(thirdPatch.records,source.records);
  const fourth=await third.atWater(1000);
  assert.equal(fourth.diagnostics().reusedPatches,1);
  assert.deepEqual(complete(fourth,address).records,thirdPatch.records);
});
