import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createServer} from 'vite';
import {FAUNA_GROUND_N} from '../src/fauna-ground.ts';
const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {PlanetRenderer}=await vite.ssrLoadModule('/src/planet-renderer.ts');
after(()=>vite.close());

function fixture(){
  const f=Object.create(PlanetRenderer.prototype);
  Object.assign(f,{body:{radiusM:6000000},lifeContext:{faunaStage:'complex'},faunaGateScratch:{},lifeQueueIndex:0,lifeQueue:[],faunaGroundQueue:[],
    lifePackingDirty:true,lifePackBuilds:0,lifeWanted:[],lifeResidents:new Map(),faunaGenomes:new Map(),floraSlotResidents:[],faunaSurfaces:[],faunaHerds:[],
    floraSlotDir:new Float64Array(12),floraSlotHeightM:new Float32Array(4),floraSlotWeights:new Float32Array(16),floraSlotForest:new Uint8Array(4),
    floraSlotMoisture:new Float32Array(4),floraSlotSlopeDeg:new Float32Array(4),floraSlotOcean:new Uint8Array(4),faunaAnchorDirections:new Float64Array(12),
    lifeBasisUp:new THREE.Vector3(),lifeBasisRight:new THREE.Vector3(),lifeBasisForward:new THREE.Vector3(),lifeWorldUpScratch:new THREE.Vector3(),
    faunaGroundDirScratch:new THREE.Vector3(),sample:()=>({groundHeightM:7})});
  const flora={cell:{id:'flora-a',layer:'flora',direction:[0,1,0]},height:12,biome:{weights:[.2,.3,.4,.1],forestPotential:true,moisture:.7,slopeDeg:8,ocean:false}};
  const fauna={cell:{id:'fauna-a',layer:'fauna',direction:[1,0,0]},herd:{present:true,members:[]},ground:new Float64Array(FAUNA_GROUND_N**2),groundCursor:FAUNA_GROUND_N**2};
  f.lifeWanted=[flora.cell,fauna.cell];f.lifeResidents.set(flora.cell.id,flora);f.lifeResidents.set(fauna.cell.id,fauna);
  return {f,flora,fauna};
}
test('stable retained life stops repacking anchors while preserving resident recipe identity',()=>{
  const {f,flora,fauna}=fixture();f.processLifeQueue();
  assert.equal(f.lifePackBuilds,1);assert.equal(f.floraSlotCount,1);assert.equal(f.faunaAnchorCount,1);
  assert.equal(f.floraSlotResidents[0],flora);assert.equal(f.faunaSurfaces[0],fauna);
  const bytes=Buffer.from(f.floraSlotWeights.buffer).toString('hex');
  for(let i=0;i<50;i++)f.processLifeQueue();
  assert.equal(f.lifePackBuilds,1);assert.equal(Buffer.from(f.floraSlotWeights.buffer).toString('hex'),bytes);
  f.lifeWanted=[fauna.cell];f.lifePackingDirty=true;f.processLifeQueue();
  assert.equal(f.lifePackBuilds,2);assert.equal(f.floraSlotCount,0);assert.equal(f.floraSlotResidents.length,0);
});
test('completion of a retained herd stencil publishes that herd exactly once',()=>{
  const {f,fauna}=fixture();fauna.groundCursor=FAUNA_GROUND_N**2-1;
  f.processLifeQueue();assert.equal(f.faunaAnchorCount,0);assert.equal(f.lifePackBuilds,1);
  f.faunaGroundQueue.push(fauna);f.processLifeQueue();
  assert.equal(f.faunaAnchorCount,1);assert.equal(f.lifePackBuilds,2);assert.equal(f.faunaGroundQueue.length,0);
  assert.equal(fauna.ground.at(-1),7);
  f.processLifeQueue();assert.equal(f.lifePackBuilds,2);
});
test('dated gate invalidation can rebuild an empty packed set without retaining old herds',()=>{
  const {f}=fixture();f.processLifeQueue();f.lifeResidents.clear();f.lifePackingDirty=true;f.processLifeQueue();
  assert.equal(f.floraSlotCount,0);assert.equal(f.faunaAnchorCount,0);assert.equal(f.faunaHerds.length,0);
});
