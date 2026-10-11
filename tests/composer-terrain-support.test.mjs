import {test} from 'node:test';
import assert from 'node:assert/strict';
import {galaxies,refByAddress,system} from '../src/catalog.ts';
import {terrainSampler} from '../src/terrain.ts';
import {rendererModule,createRenderer,nextTurn} from './terrain-renderer-fixture.mjs';
import {TOTAL_BUDGET_BYTES,WATER_ENVIRONMENT_RESERVE_BYTES,LIFE_RESERVE_BYTES,TERRAIN_BUDGET_BYTES,terrainBudgetForReservations,rendererMemoryAccounting} from '../src/renderer-memory.ts';
import {SHARED_WATER_NORMAL_ATLAS_BYTES} from '../src/water-normal-atlas.ts';
import {children,tileKey,tileNeighbour} from '../src/planet-tiles.ts';
import {residentTerrainFrontier,stepResidentTerrainFrontier,terrainParent} from '../src/terrain-residency.ts';

function checkCut(cut,resident,required){
 const map=new Map(cut.map(t=>[tileKey(t),t]));assert.equal(map.size,cut.length);
 assert.equal(cut.reduce((n,t)=>n+4**-t.level,0),6,'the complete cube has neither gaps nor duplicate area');
 for(const tile of cut){
  let parent=tile;while(parent.level){parent=terrainParent(parent);assert.ok(!map.has(tileKey(parent)),'a drawn parent never overlaps its descendant');}
  if(!required(tile))continue;assert.ok(resident.has(tileKey(tile)),'every required patch is resident');
  for(let edge=0;edge<4;edge++){let neighbour=tileNeighbour(tile,edge);while(neighbour.level&&!map.has(tileKey(neighbour)))neighbour=terrainParent(neighbour);if(map.has(tileKey(neighbour))&&required(neighbour))assert.ok(tile.level<=neighbour.level+1,'every visible shared edge is within2:1');}
 }
}
test('camera/shadow turns select complete resident fallback cuts with no overlaps or unsupported visible edges',()=>{
 const roots=Array.from({length:6},(_,face)=>({face,level:0,x:0,y:0}));let leaves=roots;
 const resident=new Map(roots.map(t=>[tileKey(t),true]));
 for(let level=0;level<4;level++){leaves=leaves.flatMap(children);for(const tile of leaves)if((tile.x*7+tile.y*11+tile.face)%5!==0)resident.set(tileKey(tile),true);}
 for(const face of [0,3,5,1,4,2]){
  const required=t=>t.face===face||t.face===(face+1)%6; // camera plus a different shadow view
  const cut=residentTerrainFrontier(leaves,resident,required);checkCut(cut,resident,required);
  assert.ok(cut.some(t=>t.level<4&&required(t)),'a newly visible missing patch has a real fallback');
 }
 const complete=new Map(resident);for(const tile of leaves)complete.set(tileKey(tile),true);
 const restored=residentTerrainFrontier(leaves,complete,()=>true);checkCut(restored,complete,()=>true);assert.equal(restored.length,leaves.length,'arrival restores the original logical detail');
});

test('resident transitions wait for complete children and reverse before releasing off-screen detail',()=>{
 const roots=Array.from({length:6},(_,face)=>({face,level:0,x:0,y:0}));
 let target=roots;const resident=new Map(roots.map(t=>[tileKey(t),true]));
 for(let i=0;i<3;i++){target=target.flatMap(children);for(const tile of target)resident.set(tileKey(tile),true);}
 const partial=new Map(roots.map(t=>[tileKey(t),true]));partial.set(tileKey(children(roots[0])[0]),true);
 const required=t=>t.face===0;
 const pending=stepResidentTerrainFrontier(roots,target,partial,()=>true,()=>false,required);
 assert.deepEqual(pending.tiles,roots,'a partly loaded split retains its complete resident parent');
 assert.equal(pending.requests.length,4,'all siblings remain protected while the group loads');
 let cut=roots;
 for(let i=0;i<3;i++){
  const next=stepResidentTerrainFrontier(cut,target,resident,()=>true,()=>false,required);
  assert.equal(Math.max(...next.tiles.map(t=>t.level)),i+1,'only one generation splits per frame');
  cut=next.tiles;checkCut(cut,resident,required);
 }
 assert.equal(cut.filter(t=>t.face===0).length,64);
 assert.equal(cut.filter(t=>t.face!==0).length,5,'off-screen logical detail does not become resident detail');
 const turning=stepResidentTerrainFrontier(cut,target,resident,()=>true,()=>false,t=>t.face===3);
 assert.equal(turning.tiles.filter(t=>t.face===0).length,64,'fine children stay until their reverse morph finishes');
 assert.equal(turning.reversing.size,64);
 const reversed=stepResidentTerrainFrontier(turning.tiles,target,resident,()=>true,()=>true,t=>t.face===3);
 assert.equal(reversed.tiles.filter(t=>t.face===0).length,16,'a completed reverse replaces each child group with its parent');
 checkCut(reversed.tiles,resident,t=>t.face===3);
});

test('absent inland owners release only their unused reserve; shared ocean atlas and full Composer ceilings remain reserved',()=>{
 const water=SHARED_WATER_NORMAL_ATLAS_BYTES,budget=terrainBudgetForReservations(water);
 assert.equal(LIFE_RESERVE_BYTES,152*1024*1024);
 assert.equal(budget,TERRAIN_BUDGET_BYTES+WATER_ENVIRONMENT_RESERVE_BYTES-water);
 for(const reserve of [0,water,WATER_ENVIRONMENT_RESERVE_BYTES])for(const clouds of [0,12*1024*1024]){
  const terrain=terrainBudgetForReservations(reserve,clouds);
  const combined=rendererMemoryAccounting({residentBytes:terrain,oceanNormalBytes:Math.min(water,reserve),rockOwnedBytes:0,cloudAllocatedBytes:clouds,pendingTiles:0,waterEnvironmentReserveBytes:reserve});
  assert.equal(combined.reservedCombinedBytes,TOTAL_BUDGET_BYTES);
 }
});

test('Daunune contact terrain converges above the byte-blocked coarse frontier without changing canonical ground or the core budget',async t=>{
 const {module,cleanup}=await rendererModule({prefix:'atlas-composer-terrain-'});
 const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2456,274,-369/0')).planets[1],fx=createRenderer(module,body,{rendererOptions:{presentationContinuity:true}}),r=fx.renderer,{THREE}=module;
 const eye=new THREE.Vector3(-3437224.677581787,-4462375.4797616005,1281889.4530944824).divideScalar(body.radiusM);
 const target=new THREE.Vector3(-.5950324904968615,-.7724998930739495,.22191145319499378).normalize(),sample=terrainSampler(body),ground=sample(target.toArray()).groundHeightM;
 const focus=eye.clone().normalize(),focusGround=sample(focus.toArray()).groundHeightM;
 r.setContactFocus(focus.multiplyScalar(body.radiusM+focusGround+.92).toArray());
 const camera=new THREE.PerspectiveCamera(48,1.44,.1/body.radiusM,100);camera.position.copy(eye);camera.quaternion.set(-.022213675075556612,-.4135851861783163,.8311661879201566,.37096713395092);camera.updateMatrixWorld();
 const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
 let d,drawn,readyFrame=-1,quiet=0;
 try{
  for(let i=0;i<1500;i++){
   r.update(eye.toArray(),1000,48,1/60,false,[1,0,0],[frustum],undefined,null,0);await nextTurn();d=r.diagnostics();drawn=r.renderedGroundHeightM(target.toArray());
   assert.ok(d.terrainReservedBytes<=d.terrainBudgetBytes,`frame${i} terrain bytes ${d.terrainReservedBytes}/${d.terrainBudgetBytes}`);
   assert.ok(d.reservedCombinedBytes-d.cloudAllocatedBytes<=TOTAL_BUDGET_BYTES,`frame${i} shared core budget`);
   if(drawn?.level>=r.contactLevel&&Math.abs(drawn.heightM-ground)<.05){readyFrame=readyFrame<0?i:readyFrame;quiet=d.pending===0?quiet+1:0;}else quiet=0;
   if(quiet===15)break;
  }
  t.diagnostic(JSON.stringify({readyFrame,drawn,canonicalGroundM:ground,resident:d.terrainResidentBytes,budget:d.terrainBudgetBytes,residentTiles:d.resident,frontier:d.frontierMaxLevel,blocked:d.splitsBlockedByBytes,contact:r.contactLevel,pressure:r.terrainPressure,dirty:r.selectionDirty,leaves:r.leafTiles.length,levels:Object.fromEntries([...new Set(r.leafTiles.map(x=>x.level))].map(l=>[l,r.leafTiles.filter(x=>x.level===l).length])),protected:r.leafProtected.size}));
  assert.ok(readyFrame>=0,`target remains at level${drawn?.level}, ground gap${drawn?.heightM-ground}m`);
  assert.ok(r.contactPatches(r.contactFocus,r.contactFocus),'actual contact ring is resident, drawn and settled');
  checkCut([...r.residentFrontier.values()].map(v=>v.tile),r.patches,tile=>r.active.has(tileKey(tile)));
  assert.equal(d.coreBudgetBytes,TOTAL_BUDGET_BYTES);assert.equal(d.lifeReserveBytes,LIFE_RESERVE_BYTES);
 }finally{fx.dispose();await cleanup();}
});
