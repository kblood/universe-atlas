import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {forestHabitat,TREE_HABITAT_VERSION} from '../src/forest-habitat.ts';

test('strict census sampling never records a non-finite slope neighbour as absence',()=>{
  const cell={direction:[1,0,0],roll:.2},classify=()=>({forestPotential:true});
  const sampler=()=>{let calls=0;return ()=>({groundHeightM:calls++===0?200:NaN,wet:false});};
  assert.equal(forestHabitat(sampler(),classify,6371000)(cell).present,false,'legacy near behavior remains explicit');
  assert.throws(()=>forestHabitat(sampler(),classify,6371000,true)(cell),/Non-finite forest habitat slope/);
});
import {forestPatch} from '../src/forest-patch.ts';
import {terrainSampler} from '../src/terrain.ts';
import {biomeClassifier} from '../src/surface-biomes.ts';
import {galaxies,refByAddress,system} from '../src/catalog.ts';

// Frozen copy of the placement expression shipped before this extraction.
function previous(cell,sample,classify,r){
  const s=sample(cell.direction),biome=classify(cell.direction,s.groundHeightM);
  let present=!s.wet&&biome.forestPotential&&cell.roll<.76;
  if(present){
    const d=new THREE.Vector3(...cell.direction),right=new THREE.Vector3().crossVectors(Math.abs(d.y)>.9?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0),d).normalize();
    const a=d.clone().addScaledVector(right,5/r).normalize(),b=d.clone().addScaledVector(right,-5/r).normalize();
    const slope=Math.abs(sample(a.toArray()).groundHeightM-sample(b.toArray()).groundHeightM)/10;
    present=slope<.55;
  }
  return {present,groundHeightM:s.groundHeightM};
}

test('shared habitat matches the shipped expression on terrain and water fixtures',()=>{
  const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
  const n=Math.ceil(body.radiusM*2/18);let count=0;
  for(const water of [-10,0,10]){
    const sample=terrainSampler(body,undefined,undefined,undefined,water),classify=biomeClassifier(body,water),query=forestHabitat(sample,classify,body.radiusM);
    for(let face=0;face<6;face++){
      const p=forestPatch(body.seed,{face,n,x:Math.floor(n*.5/8),y:Math.floor(n*.5/8)});
      for(const cell of p.cells){assert.deepEqual(query(cell),previous(cell,sample,classify,body.radiusM));count++;}
    }
  }
  assert.ok(count>1000);
});

test('legacy slope behavior stays explicit, including the unsampled tangent axis',()=>{
  const r=6000000,classify=()=>({forestPotential:true});
  const cell={id:'synthetic',direction:[0,0,1],roll:.1,heightM:15,yaw:0,distanceM:0};
  const plane=(axis,slope)=>(d)=>({groundHeightM:200+d[axis]*r*slope,wet:false});
  assert.equal(TREE_HABITAT_VERSION,'tree-habitat-1');
  assert.equal(forestHabitat(plane(0,0),classify,r)(cell).present,true);
  assert.equal(forestHabitat(plane(0,.8),classify,r)(cell).present,false);
  assert.equal(forestHabitat(plane(1,.8),classify,r)(cell).present,true,'known one-axis rule, not silently migrated');
  assert.equal(forestHabitat(()=>({groundHeightM:200,wet:true}),classify,r)(cell).present,false);
  assert.equal(forestHabitat(plane(0,0),classify,r)({...cell,roll:.8}).present,false);
});
