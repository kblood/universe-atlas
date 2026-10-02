import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ForestWaterValidity,forestWaterIntervalContains} from '../src/forest-water-validity.ts';
import {createForestCensus} from '../src/forest-census.ts';
import {forestPatch} from '../src/forest-patch.ts';
import {forestHabitat} from '../src/forest-habitat.ts';
import {terrainSampler} from '../src/terrain.ts';
import {buildCanonicalHydrology} from '../src/hydrology-registry.ts';
import {biomeClassifier} from '../src/surface-biomes.ts';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {setArchivedInlandRiversForTesting} from '../src/inland-rivers.ts';

const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
// surface-biomes-2-climate turned the old face:2 patch to snow (no slope-rejected
// trees left); this face:4 patch has 35 eligible cells and 30 slope-rejected trees.
const address={face:4,n:Math.ceil(2*body.radiusM/18),x:25214,y:46241};
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
  const census=await createForestCensus(body,300),actual=complete(census,address);
  const sample=terrainSampler(body,undefined,undefined,false,300),classify=biomeClassifier(body,300),habitat=forestHabitat(sample,classify,body.radiusM,true);
  const thresholds=[],d=new THREE.Vector3(),right=new THREE.Vector3(),a=new THREE.Vector3(),b=new THREE.Vector3();
  const up=new THREE.Vector3(0,1,0),pole=new THREE.Vector3(1,0,0),ad=[0,0,0],bd=[0,0,0];
  let eligible=0,rejected=0,primary=0,probes=0;
  const terrain=terrainSampler(body,undefined,undefined,false,300,h=>thresholds.push(h));
  const track=dir=>{const result=terrain(dir);thresholds.push(result.groundHeightM);return result;};
  const checked=forestHabitat(track,classify,body.radiusM,true);
  for(const cell of forestPatch(body.seed,address).cells){
    const s=track(cell.direction);primary++;
    const biome=classify(cell.direction,s.groundHeightM);
    const preSlope=!s.wet&&biome.forestPotential&&cell.roll<.76*biome.forestSuitability01;
    const result=checked(cell);
    if(!preSlope)continue;
    eligible++;probes+=2;
    d.set(...cell.direction);right.crossVectors(Math.abs(d.y)>.9?pole:up,d).normalize();
    a.copy(d).addScaledVector(right,5/body.radiusM).normalize();b.copy(d).addScaledVector(right,-5/body.radiusM).normalize();
    a.toArray(ad);b.toArray(bd);track(ad);track(bd);
    if(!result.present)rejected++;
  }
  const lower=Math.max(...thresholds.filter(t=>t<300),-Infinity),upper=Math.min(...thresholds.filter(t=>t>=300),Infinity);
  assert.ok(rejected>0,'the fixture contains candidates rejected after both slope probes were evaluated');
  assert.equal(thresholds.length,4*primary+8*eligible,'one H callback and one returned G per sample; duplicate reference queries do not change the envelope');
  assert.deepEqual(actual.waterInterval,[lower,upper]);
  assert.ok(eligible>rejected);assert.ok(actual.present>0);
  const within=await createForestCensus(body,1000),inside=complete(within,address);
  assert.deepEqual(inside.records,actual.records,'a water level within the exact interval preserves canonical census records');
  assert.equal(forestWaterIntervalContains(actual.waterInterval,lower),false);
  assert.equal(forestWaterIntervalContains(actual.waterInterval,upper),true);
  assert.equal(forestWaterIntervalContains(actual.waterInterval,upper+1e-5),false);
});

test('family and water both gate inherited completed patches; returned interval copies are isolated',async()=>{
  const first=await createForestCensus(body,300),original=complete(first,address),saved=original.records.slice();
  original.waterInterval[0]=Number.POSITIVE_INFINITY;original.records.fill(NaN);
  const inRange=await createForestCensus(body,1000,undefined,undefined,first);
  assert.equal(inRange.diagnostics().reusedPatches,1);
  assert.deepEqual(complete(inRange,address).records,saved,'caller edits cannot mutate immutable cached records or interval metadata');

  const outside=await createForestCensus(body,3000,undefined,undefined,first);
  assert.equal(outside.diagnostics().reusedPatches,0,'outside the recorded interval forces a new complete census');
  const outsidePatch=complete(outside,address),fresh=await createForestCensus(body,3000);
  assert.deepEqual(outsidePatch.records,complete(fresh,address).records);
  assert.equal(outside.diagnostics().misses,1);

  const changed={...structuredClone(body),seed:body.seed+'-different-family'};
  const mismatch=await createForestCensus(changed,1000,undefined,undefined,first);
  assert.notEqual(mismatch.family,first.family);
  assert.equal(mismatch.diagnostics().reusedPatches,0,'body family mismatch rejects an otherwise in-range patch');

  const hydrology={version:'river-region-2',id:'same-id',parentCatchmentId:'test',bodyId:body.id,bodySeed:body.seed,
    radiusM:body.radiusM,origin:[0,0,1],east:[1,0,0],north:[0,1,0],boundsM:[-100,-100,100,100],channels:[],lakes:[],sites:[],
    stats:{samples:0,lengthM:0,maxCutM:0,maxFillM:0,buildAlgorithm:'fixture'}};
  const riverBody={...structuredClone(body),hydrology};
  const withRiver=await createForestCensus(riverBody,300),riverPatch=complete(withRiver,address);
  const oldFamily=withRiver.family;riverBody.hydrology.boundsM[0]=-200;
  const changedRiver=await createForestCensus(riverBody,1000,undefined,undefined,withRiver);
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

test('two water-only census hops reuse exact immutable records through both intervals',async()=>{
  const first=await createForestCensus(body,300),source=complete(first,address);
  const second=await first.atWater(1000);
  assert.equal(second.family,first.family);assert.notEqual(second.context,first.context);
  assert.equal(second.diagnostics().reusedPatches,1);
  const secondPatch=complete(second,address);assert.deepEqual(secondPatch.records,source.records);
  const [lo,hi]=secondPatch.waterInterval,water2=1000<hi?Math.min(1200,(1000+hi)/2):1000;
  assert.ok(forestWaterIntervalContains(secondPatch.waterInterval,water2));
  const third=await second.atWater(water2);
  assert.equal(third.family,first.family);assert.notEqual(third.context,second.context);
  assert.equal(third.diagnostics().reusedPatches,1);
  const thirdPatch=complete(third,address),fresh=await createForestCensus(body,water2);
  assert.deepEqual(thirdPatch.records,source.records);
  assert.deepEqual(thirdPatch.records,complete(fresh,address).records);
});
