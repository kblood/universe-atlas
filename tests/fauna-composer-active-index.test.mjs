import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FaunaComposerMergedBatch} from '../src/fauna-composer-merged-batch.ts';
import {FaunaComposerRenderer} from '../src/fauna-composer-renderer.ts';
import {buildFaunaComposerLevels,validateComposerRenderLod} from '../src/fauna-composer-render-source.ts';
import {validatePackedComposerSkin} from '../src/fauna-composer-storage.ts';
import {poseComposer} from '../src/fauna-composer-rig.ts';
import {anatomyCorpus} from './helpers/composer-lod-anatomy.mjs';
import {composerFakeGl} from './helpers/composer-fake-gl.mjs';

// Distinct exact attributes/topology exercise storage. No generated source is
// substituted: the final test also submits an actual planet source-derived LOD.
function skin(seed,vertices=24,indices=3000){
 const floats=(width,f)=>Float32Array.from({length:vertices*width},(_,i)=>f(i));
 const colors=floats(3,i=>(i%53+seed%13)/64);
 return {version:'fauna-composer-skin-6',positions:floats(3,i=>seed*100+i/1024),normals:floats(3,i=>[.25,-.5,.75][i%3]),colors,
  skinIndex:Uint16Array.from({length:vertices*4},(_,i)=>(i+seed)%160),skinWeight:floats(4,i=>[.25,.5,.25,0][i%4]),gloss:floats(1,i=>i%17/16),
  index:Uint32Array.from({length:indices},(_,i)=>(i*7+seed)%vertices),sourceVertex:Uint32Array.from({length:vertices},(_,i)=>i*2+seed),
  coatCrisp:{code:2,seed:seed*593,cellsPerBody:17,threshold:.5,warp:.4,bellyLine:.2},
  coatLayers:{c0:colors.slice(),c1:floats(3,i=>i%13/12),c2:floats(3,i=>i%17/16),sample:floats(4,i=>seed+i/512)}};
}
function setup(mode,capacity=8,vertices=2048,glOptions={}){
 const gl=mode==='gpu'?composerFakeGl(glOptions):null,bones={value:new THREE.DataTexture(new Float32Array(16),4,1)};
 const options={storage:mode==='float'?'float-1':'packed-1',...(gl?{gpuContext:gl}:{}),maxVertices:vertices,maxIndices:capacity*3000,maxIndexPerRecord:3000,maxActors:capacity,maxBytes:35*1024*1024,bones};
 const pool=new FaunaComposerMergedBatch(options);
 return {pool,gl,options,dispose(){pool.dispose();bones.value.dispose();if(gl)assert.equal(gl.inspect().buffers,0);}};
}
function retained(pool,sources){return new Map([...sources].map(([id,source])=>{
 const record=pool.records.get(id),receipt=pool.residentSkin(id,source),second=pool.residentSkin(id,receipt);
 return [id,{record,vertex:record.vertex,receipt,second,before:structuredClone(FaunaComposerMergedBatch.snapshotSkin(receipt))}];
}));}
function verify(pool,kept){
 for(const[id,item]of kept){assert.equal(pool.records.get(id),item.record);assert.equal(item.record.vertex,item.vertex,'index partition never moves attributes');
  for(const receipt of [item.receipt,item.second])assert.deepEqual(FaunaComposerMergedBatch.snapshotSkin(receipt),item.before,'all attributes/topology/source maps and quantization proof stay exact');
 }
 const occupied=[...pool.records.values(),...[...pool.copying.values()].map(p=>p.record)];
 for(const[free,offset,length,limit]of [[pool.freeVertices,'vertex','vertices',pool.options.maxVertices],[pool.freeIndices,'index',null,pool.options.maxIndices]]){
  const spans=[...free.map(b=>[b.start,b.count]),...occupied.map(r=>[r[offset],length?r[length]:3000])].sort((a,b)=>a[0]-b[0]);let at=0;
  for(const[start,count]of spans){assert.equal(start,at,'free and occupied slots tile capacity');at+=count;}assert.equal(at,limit);
 }
}
const matrix=new THREE.Matrix4();
function frame(pool,camera,shadow=[]){pool.beginFrame();for(const id of camera)assert.ok(pool.submit(id,matrix,true));for(const id of shadow)assert.ok(pool.submit(id,matrix,false));pool.endFrame();}
function readIndices(pool,gl){
 const a=pool.mesh.geometry.index;if(!gl)return a.array.slice();
 const out=new Uint32Array(a.count);gl.bindBuffer(gl.COPY_READ_BUFFER,a.buffer);gl.getBufferSubData(gl.COPY_READ_BUFFER,0,out);gl.bindBuffer(gl.COPY_READ_BUFFER,null);return out;
}
function assertOrder(pool,camera,shadow){
 const slots=pool.indexSlots,c=new Set(camera),s=new Set(shadow.filter(x=>!c.has(x)));
 const ids=new Map([...pool.records].map(([id,r])=>[r,id]));
 assert.deepEqual(new Set(slots.slice(0,c.size).map(r=>ids.get(r))),c);
 assert.deepEqual(new Set(slots.slice(c.size,c.size+s.size).map(r=>ids.get(r))),s);
 assert.equal(pool.diagnostics().cameraSubmittedTriangles,c.size*1000);assert.equal(pool.diagnostics().unionSubmittedTriangles,(c.size+s.size)*1000);
}
for(const mode of ['float','packed','gpu'])test(`fixed index slots retain exact inactive/shared sources through repeated pass changes (${mode})`,()=>{
 const t=setup(mode),{pool,gl}=t,sources=new Map(Array.from({length:6},(_,i)=>[String(i),skin(i,24+i,3000-i*3)]));
 try{
  for(const[id,s]of sources)assert.ok(pool.register(id,s,Number(id)));
  const kept=retained(pool,sources),bytes=pool.ownedBytes,buffers=Object.values(pool.mesh.geometry.attributes).map(a=>a.buffer??a.array.buffer);
  let reads=gl?.inspect().reads,copies=gl?.inspect().copies;
  frame(pool,['5','1'],['4']);assertOrder(pool,['5','1'],['4']);
  if(gl){assert.equal(gl.inspect().reads,reads);assert.equal(gl.inspect().copies,copies,'no vertex or GPU scratch copy');}
  verify(pool,kept);
  const count=pool.diagnostics().indexSlotSwaps,uploads=gl?.inspect().uploads;
  frame(pool,['1','5'],['4']);assert.equal(pool.diagnostics().indexSlotSwaps,count);if(gl)assert.equal(gl.inspect().uploads,uploads,'unchanged membership uploads no indices');
  for(let i=0;i<20;i++){const camera=[String(i%6)],shadow=[String((i+2)%6),String((i+4)%6)];frame(pool,camera,shadow);assertOrder(pool,camera,shadow);verify(pool,kept);}
  // An inactive receipt remains a valid source for another independently posed row.
  const original=kept.get('0');assert.ok(pool.register('shared',original.receipt,6));
  const shared=pool.residentSkin('shared',original.receipt);assert.deepEqual(FaunaComposerMergedBatch.snapshotSkin(shared),original.before);
  frame(pool,['shared','0'],['1']);assertOrder(pool,['shared','0'],['1']);verify(pool,kept);
  const raw=readIndices(pool,gl);for(const r of pool.records.values())assert.ok(raw.subarray(r.index+r.indices,r.index+3000).every(x=>x===0),'every short slot is zero-padded');
  assert.equal(pool.ownedBytes,bytes);assert.deepEqual(Object.values(pool.mesh.geometry.attributes).map(a=>a.buffer??a.array.buffer),buffers);
  assert.equal(pool.diagnostics().indexMetadataBytes,8*20);
  frame(pool,[],[]);assert.equal(pool.mesh.visible,false);assert.equal(pool.mesh.geometry.drawRange.count,0);assert.equal(pool.records.size,7);
  verify(pool,kept);
 }finally{t.dispose();}
});

test('fixed index pass callbacks preserve zero-camera casters, reflection/auxiliary union, registered eye identity and disposal',()=>{
 const t=setup('gpu'),{pool}=t,mesh=pool.mesh,main=new THREE.Camera(),reflection=new THREE.Camera(),light=new THREE.Camera(),eye0=new THREE.Camera(),eye1=new THREE.Camera();
 try{
  for(let i=0;i<4;i++)assert.ok(pool.register(String(i),skin(i),i));pool.setViewCameras([main]);frame(pool,['3'],['1','2']);
  const render=(camera,count)=>{mesh.onBeforeRender(null,null,camera,mesh.geometry,mesh.material,null);assert.equal(mesh.geometry.drawRange.count,count);mesh.onAfterRender(null,null,camera,mesh.geometry,mesh.material,null);assert.equal(mesh.geometry.drawRange.count,3000);};
  render(main,3000);render(reflection,9000);render(new THREE.Camera(),9000);
  for(const material of [mesh.customDepthMaterial,mesh.customDistanceMaterial]){mesh.onBeforeShadow(null,mesh,main,light,mesh.geometry,material,null);assert.equal(mesh.geometry.drawRange.count,9000);mesh.onAfterShadow(null,mesh,main,light,mesh.geometry,material,null);assert.equal(mesh.geometry.drawRange.count,3000);}
  pool.setViewCameras([eye0,eye1]);render(main,9000);render(eye0,3000);render(eye1,3000);render(reflection,9000);
  frame(pool,[],['1']);assert.equal(mesh.visible,true);assert.equal(mesh.geometry.drawRange.count,0);
  mesh.onBeforeRender(null,null,eye0,mesh.geometry,mesh.material,null);assert.equal(mesh.geometry.drawRange.count,0);mesh.onAfterRender(null,null,eye0,mesh.geometry,mesh.material,null);
  mesh.onBeforeShadow(null,mesh,eye0,light,mesh.geometry,mesh.customDepthMaterial,null);assert.equal(mesh.geometry.drawRange.count,3000);mesh.onAfterShadow(null,mesh,eye0,light,mesh.geometry,mesh.customDepthMaterial,null);assert.equal(mesh.geometry.drawRange.count,0);
  pool.dispose();for(const name of ['onBeforeRender','onAfterRender','onBeforeShadow','onAfterShadow'])assert.equal(mesh[name],THREE.Mesh.prototype[name]);
 }finally{t.dispose();}
});

test('fixed index callbacks restore camera range on all inherited callback failures',()=>{
 for(const name of ['onBeforeRender','onAfterRender','onBeforeShadow','onAfterShadow']){
  const original=THREE.Mesh.prototype[name],error=new Error(name);let armed=false,seen=[];
  THREE.Mesh.prototype[name]=function(...args){seen.push(this.geometry.drawRange.count);if(armed)throw error;};
  const t=setup('float'),{pool}=t,mesh=pool.mesh,camera=new THREE.Camera();
  try{
   pool.setViewCameras([camera]);pool.register('c',skin(1),0);pool.register('s',skin(2),1);frame(pool,['c'],['s']);
   armed=true;const args=name.includes('Shadow')?[null,mesh,camera,new THREE.Camera(),mesh.geometry,mesh.customDepthMaterial,null]:[null,null,new THREE.Camera(),mesh.geometry,mesh.material,null];
   mesh.geometry.setDrawRange(0,6000);assert.throws(()=>mesh[name](...args),e=>e===error);assert.deepEqual(seen,[6000]);assert.equal(mesh.geometry.drawRange.count,3000);
   pool.dispose();assert.equal(mesh[name],THREE.Mesh.prototype[name]);
  }finally{t.dispose();THREE.Mesh.prototype[name]=original;}
 }
});

for(const mode of ['float','packed','gpu'])test(`partial admissions can move slots, finish or cancel without exposing partial anatomy (${mode})`,()=>{
 const t=setup(mode),{pool,gl}=t;
 try{
  const first=skin(1,300),next=skin(2,300),third=skin(3,300);
  pool.beginFrame();let ticks=0;assert.equal(pool.registerSlice('pending',next,1,.8,1,()=>ticks++),'pending');
  const p=pool.copying.get('pending'),at=p.vertexAt,old=p.record.index;assert.ok(at>0&&at<300);pool.register('first',first,0);pool.register('third',third,2);pool.submit('third',matrix);pool.endFrame();
  assert.equal(pool.copying.get('pending'),p);assert.equal(p.vertexAt,at);assert.equal(pool.records.has('pending'),false);assert.equal(pool.mesh.geometry.drawRange.count,3000);
  assert.notEqual(p.record.index,old,'the partially copied record actually moved');assert.equal(pool.roots[p.record.row*28+23],0);verify(pool,new Map());
  pool.beginFrame();assert.equal(pool.registerSlice('pending',next,1,.8,Infinity),'ready');pool.submit('pending',matrix);pool.submit('third',matrix,false);pool.endFrame();assertOrder(pool,['pending'],['third']);
  const receipt=pool.residentSkin('pending',next),restored=FaunaComposerMergedBatch.snapshotSkin(receipt);
  if(mode==='float')assert.deepEqual(restored.positions,next.positions);else validatePackedComposerSkin(next,restored);
  pool.beginFrame();ticks=0;assert.equal(pool.registerSlice('cancel',skin(4,300),3,.8,1,()=>ticks++),'pending');pool.submit('first',matrix);pool.endFrame();
  pool.beginFrame();pool.submit('third',matrix);pool.endFrame();assert.equal(pool.copying.size,0);verify(pool,new Map());
  pool.reset();assert.equal(pool.records.size,0);assert.equal(pool.mesh.geometry.drawRange.count,0);assert.ok(pool.indexSlots.every(x=>x===null));
  if(gl){assert.throws(()=>FaunaComposerMergedBatch.snapshotSkin(receipt),/no longer resident/);gl.contextLost();pool.loseContext();gl.contextRestored();pool.restoreContext();}
  pool.register('restored',third,0);frame(pool,['restored']);assert.equal(pool.mesh.geometry.drawRange.count,3000);verify(pool,new Map());
 }finally{t.dispose();}
});

test('partial index upload can move its record before continuing from the original progress',()=>{
 const t=setup('gpu'),{pool}=t;
 try{
  const a=skin(1,24,2400),b=skin(2,24,2997);let ticks=0;pool.beginFrame();
  assert.equal(pool.registerSlice('pending',b,1,.8,2,()=>ticks++),'pending');const p=pool.copying.get('pending');assert.equal(p.indexAt,768);
  const old=p.record.index;pool.register('old',a,0);pool.register('last',a,2);pool.submit('last',matrix);pool.endFrame();assert.equal(p.indexAt,768);assert.notEqual(p.record.index,old);assert.equal(pool.records.has('pending'),false);
  pool.beginFrame();assert.equal(pool.registerSlice('pending',b,1,.8,Infinity),'ready');pool.submit('pending',matrix);pool.submit('last',matrix,false);pool.endFrame();assertOrder(pool,['pending'],['last']);
  const receipt=pool.residentSkin('pending',b);validatePackedComposerSkin(b,FaunaComposerMergedBatch.snapshotSkin(receipt));verify(pool,new Map());
 }finally{t.dispose();}
});

test('release failure retains the same record and receipt, then cancellation frees the entire slot',()=>{
 let armed=false,failed=false,indexBuffer;
 const t=setup('gpu',2,100,{upload(n,e){if(armed&&!failed&&e.buffer===indexBuffer&&e.offset===768*4){failed=true;throw new Error('release failed');}}}),{pool,gl}=t;
 try{
  const s=skin(1,24,2400);pool.register('a',s,0);const kept=retained(pool,new Map([['a',s]])),before=readIndices(pool,gl);
  indexBuffer=pool.mesh.geometry.index.buffer;armed=true;assert.throws(()=>pool.release('a'),/release failed/);assert.ok(failed);assert.deepEqual(readIndices(pool,gl),before);verify(pool,kept);
  pool.release('a');assert.equal(pool.records.size,0);assert.ok(readIndices(pool,gl).every(x=>x===0));assert.throws(()=>FaunaComposerMergedBatch.snapshotSkin(kept.get('a').receipt),/no longer resident/);
 }finally{t.dispose();}
});

test('each failed slot-pair upload restores exact topology, padding, offsets and caller binding before retry',()=>{
 // First record, partial first record, first padding, second record, and its padding.
 for(const failOffset of [0,768,2400,3000,4500]){
  let armed=false,failed=false,indexBuffer;
  const t=setup('gpu',2,100,{upload(n,e){if(armed&&!failed&&e.buffer===indexBuffer&&e.offset===failOffset*4){failed=true;throw new Error('slot upload failed');}}}),{pool,gl}=t;
  try{
   const sources=new Map([['a',skin(1,24,1500)],['b',skin(2,24,2400)]]);for(const[id,s]of sources)pool.register(id,s,id==='a'?0:1);
   const kept=retained(pool,sources),before=readIndices(pool,gl),offsets=[...pool.records.values()].map(r=>r.index),read=gl.inspect().reads;
   indexBuffer=pool.mesh.geometry.index.buffer;const binding=pool.mesh.geometry.attributes.color.buffer;gl.bindBuffer(gl.COPY_WRITE_BUFFER,binding);
   pool.beginFrame();pool.submit('b',matrix);armed=true;assert.throws(()=>pool.endFrame(),/slot upload failed/);assert.ok(failed);
   assert.equal(gl.inspect().reads,read);assert.equal(gl.getParameter(gl.COPY_WRITE_BUFFER_BINDING),binding);assert.deepEqual([...pool.records.values()].map(r=>r.index),offsets);
   assert.deepEqual(readIndices(pool,gl),before);verify(pool,kept);
   pool.endFrame();assertOrder(pool,['b'],[]);verify(pool,kept);
  }finally{t.dispose();}
 }
});

test('fixed-slot capacity is explicit, rejects oversized source before mutation and leaves generic allocation unchanged',()=>{
 const t=setup('gpu'),{pool,gl,options}=t;
 try{
  for(const maxIndexPerRecord of [0,2,3001,6000])assert.throws(()=>new FaunaComposerMergedBatch({...options,maxIndexPerRecord}),/fixed index capacity/);
  const oversized=skin(1,24,3003),before=gl.inspect();assert.equal(pool.canAdmit(oversized),false);assert.throws(()=>pool.register('large',oversized,0),/exceeds explicit/);
  assert.deepEqual(gl.inspect(),before);assert.equal(pool.records.size,0);assert.equal(pool.copying.size,0);
  const generic=new FaunaComposerMergedBatch({...options,maxIndexPerRecord:undefined});try{assert.ok(generic.register('large',oversized,0));frame(generic,['large']);assert.equal(generic.mesh.geometry.drawRange.count,3003);assert.equal(generic.diagnostics().maxIndexPerRecord,undefined);assert.equal(pool.ownedBytes-generic.ownedBytes,160);}finally{generic.dispose();}
 }finally{t.dispose();}
});

test('a later slot-pair failure rolls the entire pass partition back before a successful retry',()=>{
 let armed=false,failed=false,indexBuffer;
 const t=setup('gpu',4,200,{upload(n,e){if(armed&&!failed&&e.buffer===indexBuffer&&e.offset===3000*4){failed=true;throw new Error('later pair failed');}}}),{pool,gl}=t;
 try{
  const sources=new Map(Array.from({length:4},(_,i)=>[String(i),skin(i,24,1500+i*3)]));for(const[id,s]of sources)pool.register(id,s,Number(id));
  frame(pool,['0','1'],['2']);const kept=retained(pool,sources),bytes=readIndices(pool,gl),order=[...pool.indexSlots],offsets=[...pool.records.values()].map(r=>r.index),range=pool.mesh.geometry.drawRange.count;
  pool.beginFrame();pool.submit('2',matrix);pool.submit('3',matrix);indexBuffer=pool.mesh.geometry.index.buffer;armed=true;
  assert.throws(()=>pool.endFrame(),/later pair failed/);assert.ok(failed);assert.deepEqual(pool.indexSlots,order);assert.deepEqual([...pool.records.values()].map(r=>r.index),offsets);assert.deepEqual(readIndices(pool,gl),bytes);assert.equal(pool.mesh.geometry.drawRange.count,range);verify(pool,kept);
  pool.endFrame();assertOrder(pool,['2','3'],[]);verify(pool,kept);
 }finally{t.dispose();}
});

test('512 retained records submit only the active camera/union slots inside the identical production GPU arena',()=>{
 const t=setup('gpu',512,320000),{pool,gl}=t;
 try{
  const bytes=gl.inspect().bytes,owned=pool.ownedBytes;
  for(let i=0;i<512;i++)assert.ok(pool.register(String(i),skin(i,24,3000),i));
  const camera=Array.from({length:14},(_,i)=>String(498+i)),shadow=Array.from({length:349},(_,i)=>String(i));
  const reads=gl.inspect().reads;frame(pool,camera,shadow);assert.equal(gl.inspect().reads,reads);assertOrder(pool,camera,shadow);
  const d=pool.diagnostics();assert.equal(d.records,512);assert.equal(d.actors,363);assert.equal(d.activeTriangles,363000);assert.equal(d.cameraSubmittedTriangles,14000);assert.equal(d.unionSubmittedTriangles,363000);
  assert.equal(pool.mesh.geometry.index.count,1536000);assert.equal(gl.inspect().bytes,bytes);assert.equal(pool.ownedBytes,owned);assert.ok(owned<35*1024*1024);assert.equal(d.indexMetadataBytes,10240);
  const swaps=d.indexSlotSwaps,uploads=gl.inspect().uploads;frame(pool,camera,shadow);assert.equal(pool.diagnostics().indexSlotSwaps,swaps);assert.equal(gl.inspect().uploads,uploads);
  verify(pool,new Map());
 }finally{t.dispose();}
});

test('renderer routes original planet source/LOD, shared receipts and camera visibility into the fixed slots',async()=>{
 const specimen=anatomyCorpus().find(x=>x.id==='planet-proboscidean-adult'),source=specimen.build(),before=structuredClone(source.skin),levels=buildFaunaComposerLevels(source,[4500,1000]);
 validateComposerRenderLod(source.skin,levels.far);assert.ok(levels.far.index.length<=3000);
 const gl=composerFakeGl();let builds=0;
 const provider={async build(job){builds++;return {key:job.key,source,levels:{far:levels.far},buildMs:0};}};
 const r=new FaunaComposerRenderer({provider,pose:(g,c)=>poseComposer(g,'walk',c.rigSeconds),capacity:4,mergedGpuContext:gl,maxBytes:80*1024*1024,mergedTiers:{far:{maxVertices:10000,maxIndices:12000,maxIndexPerRecord:3000,maxBytes:5*1024*1024,storage:'packed-1'}}});
 const c=id=>({id,definition:specimen.definition,sourceKey:'original-planet-source',matrix:new THREE.Matrix4(),distanceM:200,cameraVisible:true,shadowVisible:false,rigSeconds:.3}),a=c('a'),b={...c('b'),cameraVisible:false,shadowVisible:true},camera=new THREE.Camera();
 try{
  r.setViewCameras([camera]);for(let i=0;i<150&&r.diagnostics().active!==2;i++){r.update([a,b]);await new Promise(resolve=>setTimeout(resolve,1));}
  assert.equal(r.diagnostics().active,2);const pool=r.merged.get('far');assert.equal(pool.viewCameras[0],camera);assertOrder(pool,['a'],['b']);
  const aRecord=pool.records.get('a'),snapshot=r.snapshotOf('a');validatePackedComposerSkin(levels.far,snapshot.skin);assert.deepEqual(source.skin,before);
  const count=builds;r.update([{...a,cameraVisible:false,shadowVisible:true},{...b,cameraVisible:true}]);assert.equal(builds,count);assertOrder(pool,['b'],['a']);assert.equal(pool.records.get('a'),aRecord);assert.deepEqual(r.snapshotOf('a').skin,snapshot.skin);
  r.update([b]);assert.equal(pool.records.size,2);assert.equal(pool.diagnostics().unionActors,1);assert.equal(r.diagnostics().budgetDrops,0);
  r.setContext('other');assert.equal(pool.records.size,0);assert.equal(pool.mesh.geometry.drawRange.count,0);
 }finally{r.dispose();source.dispose?.();}assert.equal(gl.inspect().buffers,0);
});
