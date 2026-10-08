import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {forestHabitat,TREE_HABITAT_VERSION,TREE_FULL_COVER} from '../src/forest-habitat.ts';
import {forestPatch} from '../src/forest-patch.ts';
import {terrainSampler} from '../src/terrain.ts';
import {biomeClassifier} from '../src/surface-biomes.ts';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {legacyClassifier} from './helpers/surface-biomes-1-legacy.mjs';

const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];

test('strict census sampling never records a non-finite slope neighbour as absence',()=>{
  const cell={direction:[1,0,0],roll:.2},classify=()=>({forestPotential:true,forestSuitability01:1,climateCode:0});
  const sampler=()=>{let calls=0;return ()=>({groundHeightM:calls++===0?200:NaN,wet:false});};
  assert.equal(forestHabitat(sampler(),classify,6371000)(cell).present,false,'legacy near behavior remains explicit');
  assert.throws(()=>forestHabitat(sampler(),classify,6371000,true)(cell),/Non-finite forest habitat slope/);
});

/** Frozen tree-habitat-1 expression (shipped before tree-habitat-2-climate),
 * evaluated against whichever classifier the caller passes. */
function habitatV1(cell,sample,classify,r){
  const s=sample(cell.direction),biome=classify(cell.direction,s.groundHeightM);
  let present=!s.wet&&biome.forestPotential&&cell.roll<.76;
  if(present){
    const d=new THREE.Vector3(...cell.direction),right=new THREE.Vector3().crossVectors(Math.abs(d.y)>.9?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0),d).normalize();
    const a=d.clone().addScaledVector(right,5/r).normalize(),b=d.clone().addScaledVector(right,-5/r).normalize();
    const slope=Math.abs(sample(a.toArray()).groundHeightM-sample(b.toArray()).groundHeightM)/10;
    present=slope<.55;
  }
  return {present,groundHeightM:s.groundHeightM,forestPotential:biome.forestPotential};
}
/** Frozen copy of the tree-habitat-2-climate expression (this round). */
function habitatV2(cell,sample,classify,r){
  const s=sample(cell.direction),biome=classify(cell.direction,s.groundHeightM);
  let present=!s.wet&&biome.forestPotential&&cell.roll<.76*biome.forestSuitability01;
  if(present){
    const d=new THREE.Vector3(...cell.direction),right=new THREE.Vector3().crossVectors(Math.abs(d.y)>.9?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0),d).normalize();
    const a=d.clone().addScaledVector(right,5/r).normalize(),b=d.clone().addScaledVector(right,-5/r).normalize();
    const slope=Math.abs(sample(a.toArray()).groundHeightM-sample(b.toArray()).groundHeightM)/10;
    present=slope<.55;
  }
  return {present,groundHeightM:s.groundHeightM,climateCode:biome.climateCode};
}
const fib=(i,n)=>{const y=1-2*(i+.5)/n,p=i*2.399963229728653,r=Math.sqrt(1-y*y);return [Math.cos(p)*r,y,Math.sin(p)*r];};
/** Patch address containing direction d at grid n (cube face mapping of planet-population). */
function patchAt(d,n){
  const [cx,cy,cz]=d,components=[cx,-cx,cy,-cy,cz,-cz],axis=Math.max(...components),face=components.indexOf(axis);
  const [u,v]=[[-cz/axis,cy/axis],[cz/axis,cy/axis],[cx/axis,-cz/axis],[cx/axis,cz/axis],[cx/axis,cy/axis],[-cx/axis,cy/axis]][face];
  return {face,n,x:Math.floor(Math.min(n-1,Math.floor((u+1)*n/2))/8),y:Math.floor(Math.min(n-1,Math.floor((v+1)*n/2))/8)};
}

test('shared habitat matches the tree-habitat-2-climate expression on terrain and water fixtures',()=>{
  const n=Math.ceil(body.radiusM*2/18);let count=0,present=0;
  for(const water of [-10,0,10]){
    const sample=terrainSampler(body,undefined,undefined,undefined,water),classify=biomeClassifier(body,water),query=forestHabitat(sample,classify,body.radiusM);
    const addresses=[];
    for(let face=0;face<6;face++)addresses.push({face,n,x:Math.floor(n*.5/8),y:Math.floor(n*.5/8)});
    for(let i=0,found=0;i<4096&&found<4;i++){const d=fib(i,4096);if(classify(d,sample(d).groundHeightM).forestPotential){addresses.push(patchAt(d,n));found++;}}
    for(const address of addresses)for(const cell of forestPatch(body.seed,address).cells){
      const a=query(cell);assert.deepEqual(a,habitatV2(cell,sample,classify,body.radiusM));count++;present+=Number(a.present);
      assert.ok(Number.isInteger(a.climateCode)&&a.climateCode>=0&&a.climateCode<256);
    }
  }
  assert.ok(count>1000);assert.ok(present>0,'fixture includes present trees');
});

test('v1 -> v2 report: v2 presence is nested thinning plus cells newly suitable under the treeline window',()=>{
  const n=Math.ceil(body.radiusM*2/18),sample=terrainSampler(body),v2=biomeClassifier(body),v1=legacyClassifier(body);
  const query=forestHabitat(sample,v2,body.radiusM);
  const report={cells:0,v1Present:0,v2Present:0,kept:0,lost:0,gainedNewlySuitable:0,thinnedSameWindow:0,ecotoneCells:0,suitableCells:0};
  // Fixture selection re-picked for terrain-1.8.0-relief (P4-RELIEF r2): the
  // first 24 directions with v1 OR v2 forest now fall at 53.6-54.9 deg latitude,
  // where the relief terrain is low enough for the height-only v1 classifier to
  // place forest but v2 (climate) has none (report: cells 853, v1Present 661,
  // v2Present 0), so the nested-thinning assertions had no subject. Selecting on
  // v2 forestPotential (48.2-50.9 deg, all also v1 forest) keeps every assertion.
  // OLD report (terrain-1.7.0, v1|v2 selection): cells 599, v1Present 439,
  // v2Present 85, kept 85, lost 354, thinnedSameWindow 89, ecotone 184, suitable 229.
  // NEW report (terrain-1.8.0-relief, v2 selection): cells 626, v1Present 472,
  // v2Present 52, kept 52, lost 420, thinnedSameWindow 420, ecotone 303, suitable 626.
  // surface-climate-2 report (BIOME2-CLIMATE M1, same selection and assertions): cells 623, v1Present 367,
  // v2Present 56, kept 41, lost 326, gainedNewlySuitable 15, thinnedSameWindow 409, ecotone 383, suitable 611.
  for(let i=0,found=0;i<8192&&found<24;i++){
    const d=fib(i,8192),h=sample(d).groundHeightM;
    if(!v2(d,h).forestPotential)continue;
    found++;
    for(const cell of forestPatch(body.seed,patchAt(d,n)).cells){
      const a=query(cell),old=habitatV1(cell,sample,v1,body.radiusM),sameWindow=habitatV1(cell,sample,v2,body.radiusM);
      const now=v2(cell.direction,a.groundHeightM);report.cells++;
      report.v1Present+=Number(old.present);report.v2Present+=Number(a.present);
      if(now.forestPotential){report.suitableCells++;if(now.forestSuitability01>.1&&now.forestSuitability01<.9)report.ecotoneCells++;}
      const newlySuitable=!old.forestPotential&&now.forestPotential;
      // Plan acceptance: v2-present ⊆ (v1-eligible ∪ newly suitable cells).
      if(a.present)assert.ok(old.present||newlySuitable,`${cell.id}: v2 tree outside v1 presence and outside the new treeline window`);
      // Nested thinning: under the same classifier, never a tree tree-habitat-1 would not place.
      if(a.present)assert.ok(sameWindow.present,`${cell.id}: thinning must be nested in the shipped 76% roll`);
      if(a.present&&old.present)report.kept++;else if(old.present)report.lost++;else if(a.present)report.gainedNewlySuitable++;
      if(sameWindow.present&&!a.present)report.thinnedSameWindow++;
    }
  }
  console.log('# tree-habitat-1 -> tree-habitat-2-climate',JSON.stringify(report));
  assert.ok(report.v2Present>0&&report.v1Present>0);
  assert.ok(report.thinnedSameWindow>0,'suitability below 1 thins some cells');
  assert.ok(report.ecotoneCells>0,'ecotones exist');
});

test('legacy slope behavior stays explicit, including the unsampled tangent axis; suitability scales the roll',()=>{
  const r=6000000,classify=(fs=1)=>()=>({forestPotential:fs>0,forestSuitability01:fs,climateCode:181});
  const cell={id:'synthetic',direction:[0,0,1],roll:.1,heightM:15,yaw:0,distanceM:0};
  const plane=(axis,slope)=>(d)=>({groundHeightM:200+d[axis]*r*slope,wet:false});
  // tree-habitat-3-heat (surface-climate-2 M1, old tree-habitat-2-climate): the presence expression is
  // unchanged; the surface-climate-2 heat cap moves the forestSuitability01 it reads.
  assert.equal(TREE_HABITAT_VERSION,'tree-habitat-3-heat');
  assert.equal(TREE_FULL_COVER,.76);
  assert.equal(forestHabitat(plane(0,0),classify(),r)(cell).present,true);
  assert.equal(forestHabitat(plane(0,0),classify(),r)(cell).climateCode,181);
  assert.equal(forestHabitat(plane(0,.8),classify(),r)(cell).present,false);
  assert.equal(forestHabitat(plane(1,.8),classify(),r)(cell).present,true,'known one-axis rule, not silently migrated');
  assert.equal(forestHabitat(()=>({groundHeightM:200,wet:true}),classify(),r)(cell).present,false);
  assert.equal(forestHabitat(plane(0,0),classify(),r)({...cell,roll:.8}).present,false);
  assert.equal(forestHabitat(plane(0,0),classify(),r)({...cell,roll:.7599}).present,true,'full suitability keeps the shipped 76%');
  // Nested thinning: roll .3 survives suitability .5 (.38) but not .3 (.228).
  assert.equal(forestHabitat(plane(0,0),classify(.5),r)({...cell,roll:.3}).present,true);
  assert.equal(forestHabitat(plane(0,0),classify(.3),r)({...cell,roll:.3}).present,false);
  assert.equal(forestHabitat(plane(0,0),classify(0),r)({...cell,roll:0}).present,false,'zero suitability holds no tree even at roll 0');
});
