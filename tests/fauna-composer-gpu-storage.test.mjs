import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {composerPreset} from '../src/fauna-composer-recipe.ts';
import {createComposerCreature} from '../src/fauna-composer.ts';
import {FaunaComposerMergedBatch} from '../src/fauna-composer-merged-batch.ts';
import {FaunaComposerRenderer} from '../src/fauna-composer-renderer.ts';
import {FaunaComposerGpuBuffers,COMPOSER_COMPACTION_SCRATCH_BYTES} from '../src/fauna-composer-gpu-buffers.ts';
import {createFaunaPlanetComposerRenderer,FAUNA_PLANET_COMPOSER_POLICY} from '../src/fauna-planet-composer.ts';
import {composerRenderSkin,composerTypedBytes} from '../src/fauna-composer-render-source.ts';
import {isGpuComposerSkin,validatePackedComposerSkin} from '../src/fauna-composer-storage.ts';
import {composerFakeGl} from './helpers/composer-fake-gl.mjs';

test('GPU storage rejects short, zero and thrown allocations atomically and restores caller bindings',()=>{
 for(const mode of ['zero','short','throw'])for(const failAt of [1,6,12,13]){
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
 failAt=0;gpu.restore();assert.equal(gl.inspect().buffers,13);assert.equal(gl.inspect().bytes,expected);
 assert.ok([...Object.values(geometry.attributes),geometry.index].every((a,i)=>a.buffer!==old[i]));gpu.dispose();geometry.dispose();assert.equal(gl.inspect().buffers,0);
});

// Synthetic distinct attributes exercise copying, not creature generation. The
// allocation extents below are the real world-1 state-10 failure on 59df73f:
// admission-world1-59df73f-01/state-10.json SHA256
// 7a9fa72ddd90286f2a19faa9d6d3daa0bccfdf47adb7660c4f076ff480042a99.
function relocationSkin(vertices,indices,seed){
 const floats=(width,f)=>Float32Array.from({length:vertices*width},(_,i)=>f(i));
 const positions=floats(3,i=>seed*100+i/1024),normals=floats(3,i=>[.25,-.5,.75][i%3]),colors=floats(3,i=>(i%61+seed)/64);
 return {version:'fauna-composer-skin-6',positions,normals,colors,skinIndex:Uint16Array.from({length:vertices*4},(_,i)=>(i+seed)%160),
  skinWeight:floats(4,i=>[.25,.5,.25,0][i%4]),gloss:floats(1,i=>i%17/16),index:Uint32Array.from({length:indices},(_,i)=>(i*7+seed)%vertices),
  sourceVertex:Uint32Array.from({length:vertices},(_,i)=>i*2+seed),coatCrisp:{code:2,seed:seed*593,cellsPerBody:17,threshold:.5,warp:.4,bellyLine:.2},
  coatLayers:{c0:colors.slice(),c1:floats(3,i=>(i%13)/12),c2:floats(3,i=>(i%17)/16),sample:floats(4,i=>seed+i/512)}};
}
function relocationPool(mode,vertices=16000,indices=96000,glOptions={}){
 const gl=mode==='gpu'?composerFakeGl(glOptions):null,bones={value:new THREE.DataTexture(new Float32Array(16),4,1)};
 const pool=new FaunaComposerMergedBatch({storage:mode==='float'?'float-1':'packed-1',...(gl?{gpuContext:gl}:{}),maxVertices:vertices,maxIndices:indices,maxActors:512,maxBytes:80*1024*1024,bones});
 return {pool,gl,dispose(){pool.dispose();bones.value.dispose();if(gl)assert.equal(gl.inspect().buffers,0);}};
}
function capturedFragmentation(pool){
 const initial=[[2333,13500,440],[2333,13500,442],[2330,13500,4],[2326,13494,441],[2327,13494,0],[2330,13494,439]];
 const sources=new Map();
 for(let i=0;i<initial.length;i++){const[v,n,row]=initial[i],s=relocationSkin(v,n,i);sources.set(String(i),s);assert.ok(pool.register(String(i),s,row));}
 pool.release('0');pool.release('1');
 for(const[id,v,row,seed]of [['first',2328,440,6],['second',2325,442,7]]){const s=relocationSkin(v,13500,seed);sources.set(id,s);assert.ok(pool.register(id,s,row));}
 pool.release('3');
 assert.deepEqual(pool.freeVertices,[{start:4653,count:13},{start:6996,count:2326},{start:13979,count:2021}]);
 assert.deepEqual(pool.freeIndices,[{start:40500,count:13494},{start:80982,count:15018}]);
 return new Map([...pool.records].map(([id,r])=>{const source=sources.get(id),receipt=pool.residentSkin(id,source),second=pool.residentSkin(id,receipt);
  return [id,{source,receipt,second,record:r,before:structuredClone(FaunaComposerMergedBatch.snapshotSkin(receipt))}];}));
}
function assertRetained(pool,retained){
 for(const[id,{receipt,second,record,before}]of retained){assert.equal(pool.records.get(id),record,'allocation identity survives');
  for(const skin of [receipt,second])assert.deepEqual(FaunaComposerMergedBatch.snapshotSkin(skin),before,'every original attribute/topology/proof stays exact');
  assert.equal(record.localIndex,second.index,'relocation borrows already-accounted local topology');
 }
 const records=[...pool.records.values(),...[...pool.copying.values()].map(p=>p.record)];
 for(const[free,offset,count,capacity]of [[pool.freeVertices,'vertex','vertices',pool.options.maxVertices],[pool.freeIndices,'index','indices',pool.options.maxIndices]]){
  const spans=[...free.map(b=>[b.start,b.count]),...records.map(r=>[r[offset],r[count]])].sort((a,b)=>a[0]-b[0]);let at=0;
  for(const[start,length]of spans){assert.equal(start,at,'occupied and free spans tile capacity without overlap');at+=length;}assert.equal(at,capacity);
 }
}
for(const mode of ['float','packed','gpu'])test(`actual world-1 fragmentation admits 2336 vertices without losing five residents (${mode})`,()=>{
 const t=relocationPool(mode),{pool,gl}=t;
 try{
  const retained=capturedFragmentation(pool),request=relocationSkin(2336,13494,8),bytes=pool.diagnostics().ownedBytes,reads=gl?.inspect().reads;
  assert.equal(pool.canAdmit(request),false,'largest 2326-slot hole is ten vertices too small');
  assert.equal(pool.registerSlice('f248b8f4',request,441,.82,Infinity),'ready');
  if(gl)assert.equal(gl.inspect().reads,reads,'relocation never reads GPU buffers');
  assertRetained(pool,retained);assert.ok(pool.diagnostics().compactionMoves>0);assert.equal(pool.diagnostics().ownedBytes,bytes);
  pool.beginFrame();for(const id of pool.records.keys())assert.ok(pool.submit(id,new THREE.Matrix4()));pool.endFrame();
  assert.equal(pool.diagnostics().actors,6);assert.equal(pool.diagnostics().activeTriangles,(67488+13494)/3);
  // A same-source copy after relocation must follow the unchanged record object.
  pool.release('first');const shared=retained.get('2').receipt;assert.ok(pool.register('shared',shared,440));
  assert.deepEqual(FaunaComposerMergedBatch.snapshotSkin(pool.residentSkin('shared',shared)),retained.get('2').before);
  pool.reset();assert.equal(pool.diagnostics().records,0);assert.deepEqual(pool.freeVertices,[{start:0,count:16000}]);assert.deepEqual(pool.freeIndices,[{start:0,count:96000}]);
  if(gl){assert.throws(()=>FaunaComposerMergedBatch.snapshotSkin(shared),/no longer resident/);gl.contextLost();pool.loseContext();gl.contextRestored();pool.restoreContext();assert.ok(pool.register('restored',request,441));assert.equal(gl.inspect().buffers,13);}
 }finally{t.dispose();}
});

test('compaction yields only between complete records, reports overrun and preserves every resident',()=>{
 const t=relocationPool('gpu'),{pool}=t;
 try{
  const retained=capturedFragmentation(pool),request=relocationSkin(2336,13494,8);let tick=0;
  assert.equal(pool.registerSlice('request',request,441,.82,0,()=>0),'pending');assert.equal(pool.diagnostics().compactionMoves,0);assertRetained(pool,retained);
  assert.equal(pool.registerSlice('request',request,441,.82,3,()=>{const value=tick;tick+=4;return value;}),'pending');
  assert.ok(pool.diagnostics().compactionMoves>0);assert.ok(pool.diagnostics().compactionMaxOverrunMs>=1);assertRetained(pool,retained);
  assert.equal(pool.registerSlice('request',request,441,.82,Infinity),'ready');assertRetained(pool,retained);
 }finally{t.dispose();}
});

for(const mode of ['float','packed','gpu'])test(`vertex and index allocation orders compact independently through nonuniform churn (${mode})`,()=>{
 const t=relocationPool(mode,48,90),{pool,gl}=t;
 try{
  const sources=new Map();const put=(id,v,n,row)=>{const s=relocationSkin(v,n,row);sources.set(id,s);assert.ok(pool.register(id,s,row));};
  put('a',12,6,0);put('b',12,12,1);put('c',6,18,2);put('d',12,12,3);pool.release('a');pool.release('c');put('x',10,15,4);put('y',5,6,5);
  assert.notDeepEqual([...pool.records.keys()].sort((a,b)=>pool.records.get(a).vertex-pool.records.get(b).vertex),[...pool.records.keys()].sort((a,b)=>pool.records.get(a).index-pool.records.get(b).index));
  const retained=new Map([...pool.records].map(([id,record])=>{const receipt=pool.residentSkin(id,sources.get(id));return[id,{record,receipt,second:receipt,before:structuredClone(FaunaComposerMergedBatch.snapshotSkin(receipt))}];}));
  const reads=gl?.inspect().reads;put('z',8,45,6);if(gl)assert.equal(gl.inspect().reads,reads);assertRetained(pool,retained);
  for(let cycle=0;cycle<20;cycle++){pool.release('z');put('z',7+cycle%2,45,6);assertRetained(pool,retained);assert.equal(pool.diagnostics().records,5);}
 }finally{t.dispose();}
});

test('GPU relocation rolls back one-shot copy and index-write failures without publishing partial moves',()=>{
 for(const kind of ['copy-first','copy-destination','copy-later-attribute','index-rebase']){
  let fail=0;const options=kind==='index-rebase'?{upload(n){if(n===fail)throw new Error('injected relocation failure');}}:{copy(n){if(n===fail)throw new Error('injected relocation failure');}};
  const t=relocationPool('gpu',16000,96000,options),{pool,gl}=t;
  try{const retained=capturedFragmentation(pool),request=relocationSkin(2336,13494,8),before=structuredClone({v:pool.freeVertices,i:pool.freeIndices});
   const d=gl.inspect();fail=kind==='index-rebase'?d.uploads+2:d.copies+({'copy-first':1,'copy-destination':4,'copy-later-attribute':34}[kind]);
   assert.throws(()=>pool.registerSlice('request',request,441,.82,Infinity),/injected relocation failure/);
   assertRetained(pool,retained);assert.deepEqual({v:pool.freeVertices,i:pool.freeIndices},before);assert.equal(pool.copying.size,0);
   fail=0;assert.equal(pool.registerSlice('request',request,441,.82,Infinity),'ready');assertRetained(pool,retained);
  }finally{t.dispose();}
 }
});

test('last scratch allocation failure on restore preserves the complete old generation',()=>{
 let fail=0;const gl=composerFakeGl({allocate(bytes,n){return n===fail?0:bytes;}}),geometry=new THREE.BufferGeometry(),gpu=new FaunaComposerGpuBuffers(gl,geometry,24,36,true);
 const old=Object.values(geometry.attributes).map(a=>a.buffer);gl.contextLost();gl.contextRestored();fail=26;
 assert.throws(()=>gpu.restore(),/storage allocation failed/);assert.equal(gl.inspect().buffers,0);assert.deepEqual(Object.values(geometry.attributes).map(a=>a.buffer),old);
 fail=0;gpu.restore();assert.equal(gl.inspect().buffers,13);assert.equal(gl.inspect().bytes,gpu.gpuBytes);gpu.dispose();geometry.dispose();assert.equal(gl.inspect().buffers,0);
});

test('overlapping index relocation restores old topology after partial upload or old-tail clear failure',()=>{
 for(const failOffset of [4068,4500]){
  let armed=false,indexBuffer=null,failed=false;
  const t=relocationPool('gpu',48,9000,{upload(n,event){if(armed&&!failed&&event.buffer===indexBuffer&&event.offset===failOffset*4){failed=true;throw new Error('injected index relocation failure');}}}),{pool,gl}=t;
  try{
   const sources=new Map(),put=(id,v,n,row)=>{const skin=relocationSkin(v,n,row);sources.set(id,skin);assert.ok(pool.register(id,skin,row));};
   put('a',12,600,0);put('b',12,1200,1);put('c',6,1800,2);put('d',12,1200,3);pool.release('a');pool.release('c');put('x',10,1500,4);put('y',5,600,5);
   const retained=new Map([...pool.records].map(([id,record])=>{const receipt=pool.residentSkin(id,sources.get(id));return[id,{record,receipt,second:receipt,before:structuredClone(FaunaComposerMergedBatch.snapshotSkin(receipt))}];}));
   const request=relocationSkin(8,4500,6);indexBuffer=pool.mesh.geometry.index.buffer;armed=true;
   assert.throws(()=>pool.registerSlice('z',request,6,.82,Infinity),/injected index relocation failure/);assert.ok(failed);assertRetained(pool,retained);
   assert.equal(pool.records.get('d').index,3600,'failed move does not publish its new index offset');
   assert.equal(pool.copying.size,0);assert.equal(gl.inspect().buffers,13);
   assert.equal(pool.registerSlice('z',request,6,.82,Infinity),'ready');assertRetained(pool,retained);
  }finally{t.dispose();}
 }
});

test('active admission prevents compaction and cancellation restores full reusable capacity',()=>{
 const t=relocationPool('gpu'),{pool}=t;
 try{
  const retained=capturedFragmentation(pool),small=relocationSkin(1,3,8);let tick=0;
  assert.equal(pool.registerSlice('partial',small,443,.8,1,()=>tick++),'pending');
  assert.equal(pool.registerSlice('fragmented',relocationSkin(2336,13494,9),441,.8,Infinity),'pending');
  assert.equal(pool.diagnostics().compactionMoves,0);assertRetained(pool,retained);
  pool.reset();assert.equal(pool.copying.size,0);assert.equal(pool.records.size,0);assert.deepEqual(pool.freeVertices,[{start:0,count:16000}]);assert.deepEqual(pool.freeIndices,[{start:0,count:96000}]);
 }finally{t.dispose();}
});

test('production Composer factory checks all default GPU arena bytes without changing the policy',()=>{
 const gl=composerFakeGl(),p=FAUNA_PLANET_COMPOSER_POLICY,renderer=createFaunaPlanetComposerRenderer({renderer:{getContext:()=>gl,capabilities:{maxAttributes:16,maxVertexTextures:16,maxTextureSize:16384}},onReady(){},onMeshAdopted(){}});
 try{
  const bytes=73*(p.middleVertices+p.farVertices)+4*(p.middleIndices+p.farIndices)+2*COMPOSER_COMPACTION_SCRATCH_BYTES,d=renderer.diagnostics();
  assert.equal(gl.inspect().buffers,26);assert.equal(gl.inspect().bytes,bytes);assert.equal(gl.inspect().reads,0);
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
