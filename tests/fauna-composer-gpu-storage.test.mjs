import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {composerPreset} from '../src/fauna-composer-recipe.ts';
import {createComposerCreature} from '../src/fauna-composer.ts';
import {FaunaComposerMergedBatch} from '../src/fauna-composer-merged-batch.ts';
import {FaunaComposerRenderer} from '../src/fauna-composer-renderer.ts';
import {FaunaComposerGpuBuffers} from '../src/fauna-composer-gpu-buffers.ts';
import {createFaunaPlanetComposerRenderer,FAUNA_PLANET_COMPOSER_POLICY} from '../src/fauna-planet-composer.ts';
import {composerRenderSkin,composerTypedBytes} from '../src/fauna-composer-render-source.ts';
import {isGpuComposerSkin,validatePackedComposerSkin} from '../src/fauna-composer-storage.ts';
import {composerFakeGl} from './helpers/composer-fake-gl.mjs';

test('GPU storage rejects short, zero and thrown allocations atomically and restores caller bindings',()=>{
 for(const mode of ['zero','short','throw'])for(const failAt of [1,6,12]){
  const gl=composerFakeGl({allocate(bytes,n){if(n!==failAt)return bytes;if(mode==='throw')throw new Error('injected allocation failure');return mode==='zero'?0:bytes-1;}});
  const copy=gl.createBuffer(),defaultElement=gl.createBuffer(),element=gl.createBuffer(),vao={};
  gl.bindBuffer(gl.COPY_WRITE_BUFFER,copy);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,defaultElement);gl.bindVertexArray(vao);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,element);
  const geometry=new THREE.BufferGeometry();
  assert.throws(()=>new FaunaComposerGpuBuffers(gl,geometry,24,36,true),/allocation fail/);
  assert.equal(gl.inspect().buffers,3,`${mode}/${failAt}: no partial buffer survives`);
  assert.equal(gl.inspect().bytes,0);assert.equal(gl.getParameter(gl.COPY_WRITE_BUFFER_BINDING),copy);assert.equal(gl.getParameter(gl.VERTEX_ARRAY_BINDING),vao);assert.equal(gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING),element);
  gl.bindVertexArray(null);assert.equal(gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING),defaultElement);geometry.dispose();
 }
});

test('GPU restoration publishes all verified buffers together and releases a failed generation',()=>{
 let failAt=0;
 const gl=composerFakeGl({allocate(bytes,n){return n===failAt?0:bytes;}}),geometry=new THREE.BufferGeometry(),gpu=new FaunaComposerGpuBuffers(gl,geometry,24,36,true);
 const old=[...Object.values(geometry.attributes),geometry.index].map(a=>a.buffer),expected=gpu.gpuBytes;
 gl.contextLost();gl.contextRestored();failAt=18;
 assert.throws(()=>gpu.restore(),/storage allocation failed/);assert.equal(gl.inspect().buffers,0);
 assert.deepEqual([...Object.values(geometry.attributes),geometry.index].map(a=>a.buffer),old,'failed generation cannot replace any attribute handle');
 failAt=0;gpu.restore();assert.equal(gl.inspect().buffers,12);assert.equal(gl.inspect().bytes,expected);
 assert.ok([...Object.values(geometry.attributes),geometry.index].every((a,i)=>a.buffer!==old[i]));gpu.dispose();geometry.dispose();assert.equal(gl.inspect().buffers,0);
});

test('production Composer factory checks all default GPU arena bytes without changing the policy',()=>{
 const gl=composerFakeGl(),p=FAUNA_PLANET_COMPOSER_POLICY,renderer=createFaunaPlanetComposerRenderer({renderer:{getContext:()=>gl,capabilities:{maxAttributes:16,maxVertexTextures:16,maxTextureSize:16384}},onReady(){},onMeshAdopted(){}});
 try{
  const bytes=73*(p.middleVertices+p.farVertices)+4*(p.middleIndices+p.farIndices),d=renderer.diagnostics();
  assert.equal(gl.inspect().buffers,24);assert.equal(gl.inspect().bytes,bytes);assert.equal(gl.inspect().reads,0);
  assert.equal(d.mergedTiers.middle.gpuBytes+d.mergedTiers.far.gpuBytes,bytes+2*p.capacity*112);
  assert.equal(d.maxBytes,80*1024*1024);assert.equal(d.capacity,512);assert.ok(d.ownedBytes<d.maxBytes);
 }finally{renderer.dispose();}assert.equal(gl.inspect().buffers,0);
});

test('GPU-owned storage copies actual packed bytes without CPU mirrors or implicit readback; released receipts cannot alias new occupants',()=>{
 const gl=composerFakeGl(),creature=createComposerCreature({...composerPreset('trunked-centipede'),pattern:'bands'},{presentation:'realism-1'}),source=composerRenderSkin(creature.skin),bones={value:new THREE.DataTexture(new Float32Array(160*16*2),640,2)};
 const pool=new FaunaComposerMergedBatch({storage:'packed-1',gpuContext:gl,maxVertices:source.positions.length/3*2,maxIndices:source.index.length*2,maxActors:2,maxBytes:40e6,bones});
 try{
  assert.ok(pool.register('a',source,0));const stored=pool.residentSkin('a',source);assert.ok(isGpuComposerSkin(stored));assert.equal('positions' in stored,false);
  assert.equal(composerTypedBytes(stored),stored.index.byteLength);assert.equal(gl.inspect().reads,0);
  assert.ok(pool.register('b',stored,1));const copy=pool.residentSkin('b',stored);assert.equal(gl.inspect().reads,0);assert.ok(gl.inspect().copies>0);
  validatePackedComposerSkin(source,FaunaComposerMergedBatch.snapshotSkin(copy));
  const rows=new Uint16Array(source.positions.length/3*2),attr=pool.mesh.geometry.getAttribute('composerActor');gl.bindBuffer(gl.COPY_READ_BUFFER,attr.buffer);gl.getBufferSubData(gl.COPY_READ_BUFFER,0,rows);
  assert.ok(rows.subarray(0,rows.length/2).every(x=>x===0));assert.ok(rows.subarray(rows.length/2).every(x=>x===1));
  assert.equal(pool.mesh.geometry.getAttribute('normal').normalized,true);assert.equal(pool.mesh.geometry.getAttribute('skinIndex').normalized,false);
  const d=pool.diagnostics();assert.equal(d.cpuBytes,128*73+768*4+2*112);assert.equal(d.gpuBytes,gl.inspect().bytes+2*112);assert.equal(pool.backingBuffers.size,0);
  pool.release('a');assert.throws(()=>FaunaComposerMergedBatch.snapshotSkin(stored),/no longer resident/);assert.ok(pool.register('a',source,0));assert.throws(()=>FaunaComposerMergedBatch.snapshotSkin(stored),/no longer resident/);
  validatePackedComposerSkin(source,FaunaComposerMergedBatch.snapshotSkin(copy));
 }finally{pool.dispose();creature.dispose();bones.value.dispose();}
 assert.equal(gl.inspect().buffers,0);
});

test('GPU context loss aborts work and discards old receipts; restoration rebuilds canonical sources and poses',async()=>{
 const gl=composerFakeGl(),creature=createComposerCreature(composerPreset('turtle'),{presentation:'realism-1'}),skin=composerRenderSkin(creature.skin);let builds=0,aborted=false,hold=false;
 const provider={async build(job,signal){builds++;if(hold)await new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(new Error('aborted'));},{once:true}));return {key:job.key,source:{graph:creature.graph,skin:creature.skin},levels:{far:skin},buildMs:0};}};
 const renderer=new FaunaComposerRenderer({provider,pose:()=>creature.update('walk',.3),mergedGpuContext:gl,maxBytes:40e6,mergedTiers:{far:{storage:'packed-1',maxVertices:skin.positions.length/3*2,maxIndices:skin.index.length*2,maxBytes:20e6}}});
 const c={id:'a',sourceKey:'a',definition:{id:'a'},matrix:new THREE.Matrix4(),distanceM:300,cameraVisible:true,rigSeconds:.3};
 async function settle(){for(let i=0;i<20;i++){renderer.update([c]);await new Promise(r=>setTimeout(r,1));if(renderer.diagnostics().active===1)return;}assert.fail('source did not rebuild');}
 try{await settle();const before=renderer.snapshotOf('a');assert.ok(before.skin.positions.length);hold=true;renderer.update([c,{...c,id:'b',sourceKey:'b',definition:{id:'b'}}]);
  let tick=0;const pool=renderer.merged.get('far');assert.equal(pool.registerSlice('partial',skin,3,.8,1,()=>tick+=.2),'pending');
  gl.contextLost();await new Promise(r=>setTimeout(r,1));assert.ok(aborted);assert.equal(renderer.entries.size,0);assert.equal(pool.diagnostics().copying,0);assert.equal(renderer.update([c]).size,0);hold=false;
  gl.contextRestored();await settle();assert.ok(builds>=3);assert.deepEqual(renderer.snapshotOf('a').skin.positions,before.skin.positions);assert.equal(renderer.diagnostics().failures,0);
 }finally{renderer.dispose();creature.dispose();}assert.equal(gl.inspect().buffers,0);
});
