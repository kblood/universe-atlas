import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FaunaSkinnedBatch,FaunaBonePaletteWriter,faunaSkinnedGeometryKey,FAUNA_PALETTE_BONES} from '../src/fauna-skinned-batch.ts';
import {createQuadrupedPlan,QUADRUPED_BONE_PARENTS} from '../src/fauna-body-plan.ts';
import {quadrupedPoseAt} from '../src/fauna-locomotion.ts';
import {generateCreatureGenome} from '../src/creature-model.ts';
import {faunaMemberActivityAtWorldNs} from '../src/fauna-runtime.ts';
const g=generateCreatureGenome('SKINNED-BATCH-TEST','browser'),plan=createQuadrupedPlan(g);
const member={id:'canonical-member',anchorOffsetX:1,anchorOffsetZ:2,orbitRadiusM:8,orbitAngularSpeed:.1,orbitPhase:.3,gaitPeriodS:12};
const ground=(x,z)=>.025*x+.015*z;
const tiny=()=>({plan,positions:new Float32Array([0,0,0,1,0,0,0,1,0]),normals:new Float32Array([0,0,1,0,0,1,0,0,1]),
 colors:new Uint8Array([15,35,25,25,55,35,45,75,55]),skinIndex:new Uint8Array(12),skinWeight:new Uint8Array([255,0,0,0,255,0,0,0,255,0,0,0]),index:new Uint16Array([0,1,2])});
const identityPalette=()=>{const p=new Float32Array(FAUNA_PALETTE_BONES*16);for(let i=0;i<FAUNA_PALETTE_BONES;i++)new THREE.Matrix4().toArray(p,i*16);return p;};

test('palette matches detached THREE skeleton boneMatrices exactly for canonical dates and real locomotion',()=>{
 const writer=new FaunaBonePaletteWriter(),bones=plan.bones.map(()=>new THREE.Bone());
 QUADRUPED_BONE_PARENTS.forEach((parent,i)=>{if(parent>=0)bones[parent].add(bones[i]);});
 const skeleton=new THREE.Skeleton(bones,plan.bones.map(b=>new THREE.Matrix4().makeTranslation(-b.rest[0],-b.rest[1],-b.rest[2])));
 const out=new Float32Array(FAUNA_PALETTE_BONES*16);
 for(const ns of [0n,12345678901n,312345678901n,99999999999999999999999999n]){
  const activity=faunaMemberActivityAtWorldNs(member,ns),pose=quadrupedPoseAt(plan,member,activity,ground,Number(ns%100000000000n)*1e-9);
  bones.forEach((bone,i)=>{bone.position.fromArray(pose.positions,i*3);bone.quaternion.fromArray(pose.quaternions,i*4);});
  bones[0].updateMatrixWorld(true);skeleton.update();writer.write(plan,pose,out);
  assert.deepEqual(out,skeleton.boneMatrices);
 }
});
test('exact cache reuse rejects changed colours and morphologies; admissions fail closed on budgets',()=>{
 const b=new FaunaSkinnedBatch({capacity:2,maxVerticesPerAnimal:3,maxIndicesPerAnimal:3,maxGeometryEntries:2});
 try{
  const data=tiny();assert.equal(b.registerGeometry('one',data),true);assert.equal(b.registerGeometry('one',data),true);
  assert.equal(b.registerGeometry('one',{...data,colors:new Uint8Array(9)}),false);
  const alt=tiny();alt.plan=createQuadrupedPlan({...g,torsoWidth:g.torsoWidth*1.1});assert.equal(b.registerGeometry('one',alt),false);
  assert.equal(b.registerGeometry('over',{...data,positions:new Float32Array(12)}),false);
  assert.notEqual(faunaSkinnedGeometryKey(g,'lod1',0),faunaSkinnedGeometryKey({...g,seed:'changed'},'lod1',0));
  assert.equal(b.prepareAnimal('a','one'),true);assert.equal(b.prepareAnimal('b','one'),true);assert.equal(b.prepareAnimal('c','one'),false);
  assert.equal(b.releaseGeometry('one'),false);b.releaseAnimal('a');b.releaseAnimal('b');assert.equal(b.releaseGeometry('one'),true);
 }finally{b.dispose();b.dispose();}
});
test('one merged geometry draws512 actors, preserves member slots and produces no per-frame geometry work',()=>{
 const b=new FaunaSkinnedBatch({capacity:512,maxVerticesPerAnimal:3,maxIndicesPerAnimal:3,maxGeometryEntries:1}),data=tiny(),palette=identityPalette();
 try{
  assert.equal(b.registerGeometry('one',data),true);
  for(let i=0;i<512;i++)assert.equal(b.prepareAnimal(`member/${i}`,'one'),true);
  const attrs=b.mesh.geometry.attributes,index=b.mesh.geometry.index,origin=new THREE.Vector3(),matrix=new THREE.Matrix4();
  const frame=()=>{b.beginFrame(origin);for(let i=0;i<512;i++){matrix.makeTranslation(i,0,0);assert.equal(b.submit(`member/${i}`,matrix,palette),true);}b.endFrame();};
  frame();const versions=[b.boneTexture.version,b.rootTexture.version],uploads=b.diagnostics().geometryUploads;
  frame();const stats=b.diagnostics();assert.equal(stats.active,512);assert.equal(stats.drawsPerPass,1);assert.equal(stats.triangles,512);
  assert.equal(stats.geometryUploads,uploads);assert.equal(stats.paletteUploadBytes,0);assert.deepEqual([b.boneTexture.version,b.rootTexture.version],versions);
  assert.equal(b.mesh.geometry.index,index);for(const k of Object.keys(attrs))assert.equal(b.mesh.geometry.getAttribute(k),attrs[k]);
  b.beginFrame(origin);assert.equal(b.submit('member/0',matrix,palette),true);b.endFrame();assert.equal(b.diagnostics().active,1);
  assert.equal(b.rootMatrices[20+16],0,'omitted member masked');
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  b.mesh.material.onBeforeCompile(shader,{});
  assert.ok(shader.vertexShader.includes('texelFetch(faunaBones'));assert.ok(shader.vertexShader.includes('actorRoot*skinned'));
  assert.ok(shader.fragmentShader.includes('roughnessFactor=vFaunaMeta.x'));
 }finally{b.dispose();}
});

test('default buffers stay bounded and use16bit indices; larger measurements require explicit overbudget opt-in',()=>{
 const batch=new FaunaSkinnedBatch();
 try{assert.ok(batch.diagnostics().estimatedBufferBytes<=16*1024*1024);assert.equal(batch.diagnostics().indexBytes,2);assert.equal(batch.capacity,128);}finally{batch.dispose();}
 assert.throws(()=>new FaunaSkinnedBatch({capacity:512,maxVerticesPerAnimal:500,maxIndicesPerAnimal:1500}),/exceedbudget/);
 const large=new FaunaSkinnedBatch({capacity:512,maxVerticesPerAnimal:500,maxIndicesPerAnimal:1500,maxBufferBytes:64*1024*1024});
 try{assert.equal(large.diagnostics().indexBytes,4);assert.ok(large.diagnostics().estimatedBufferBytes>16*1024*1024);}finally{large.dispose();}
});

test('palette ring wrap keeps exact data and all colour/shadow uniforms on the same snapshot',()=>{
 const b=new FaunaSkinnedBatch({capacity:8,maxVerticesPerAnimal:3,maxIndicesPerAnimal:3,paletteRingSize:3,paletteUploadMode:'adaptive-rows'});
 try{
  b.registerGeometry('body',tiny());b.prepareAnimal('a','body');b.prepareAnimal('b','body');
  const shaders=[b.mesh.material,b.mesh.customDepthMaterial,b.mesh.customDistanceMaterial].map(material=>{
   const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
   material.onBeforeCompile(shader,{});return shader;
  });
  const palette=identityPalette(),origin=new THREE.Vector3();
  for(let frame=0;frame<8;frame++){
   palette[12]=frame*.25;b.beginFrame(origin);b.submit('a',new THREE.Matrix4().makeTranslation(frame,0,0),palette);
   if(frame<3)b.submit('b',new THREE.Matrix4().makeTranslation(0,frame,0),identityPalette());b.endFrame();
   assert.deepEqual(b.boneTexture.image.data,b.boneMatrices,'rotated palette includes all current rows');
   assert.deepEqual(b.rootTexture.image.data,b.rootMatrices,'omitted member cannot resurrect from an older ring');
   for(const shader of shaders){assert.equal(shader.uniforms.faunaBones.value,b.boneTexture);assert.equal(shader.uniforms.faunaRoots.value,b.rootTexture);}
   b.boneTexture.onUpdate(b.boneTexture);b.rootTexture.onUpdate(b.rootTexture);
  }
  const index=b.diagnostics().paletteIndex,versions=[b.boneTexture.version,b.rootTexture.version];
  b.beginFrame(origin);b.submit('a',new THREE.Matrix4().makeTranslation(7,0,0),palette);b.endFrame();
  assert.equal(b.diagnostics().paletteIndex,index);assert.deepEqual([b.boneTexture.version,b.rootTexture.version],versions);
  assert.equal(b.diagnostics().paletteUploadBytes,0,'paused frame does not rotate or upload');
  const textures=new Set(),disposed=[];
  for(let frame=8;frame<14;frame++){
   b.beginFrame(origin);b.submit('a',new THREE.Matrix4().makeTranslation(frame,0,0),palette);b.endFrame();
   for(const texture of [b.boneTexture,b.rootTexture])if(!textures.has(texture)){textures.add(texture);texture.addEventListener('dispose',()=>disposed.push(texture));}
  }
  b.dispose();assert.equal(disposed.length,6,'all ring textures released');
 }finally{b.dispose();}
});

test('sparse RGBA uploads stay within rows and preserve unconsumed full uploads',()=>{
 const b=new FaunaSkinnedBatch({capacity:8,maxVerticesPerAnimal:3,maxIndicesPerAnimal:3,paletteUploadMode:'adaptive-rows'});
 try{
  b.registerGeometry('body',tiny());b.prepareAnimal('a','body');b.prepareAnimal('b','body');
  const palette=identityPalette(),origin=new THREE.Vector3(),frame=(time,second=true)=>{
   b.beginFrame(origin);b.submit('a',new THREE.Matrix4().makeTranslation(time,0,0),palette);
   if(second)b.submit('b',new THREE.Matrix4(),palette);b.endFrame();
  };
  frame(0);frame(1);assert.deepEqual(b.rootTexture.updateRanges,[],'full upload still pending');
  assert.equal(b.diagnostics().paletteUploadBytes,b.rootMatrices.byteLength);
  b.boneTexture.onUpdate(b.boneTexture);b.rootTexture.onUpdate(b.rootTexture);
  frame(2);assert.deepEqual(b.rootTexture.updateRanges,[{start:0,count:20}]);assert.equal(b.diagnostics().paletteUploadBytes,80);
  frame(3,false);assert.ok(b.rootTexture.updateRanges.some(r=>r.start===20&&r.count===20),'omission joins pending uploads');
  for(const range of b.rootTexture.updateRanges)assert.equal(Math.floor(range.start/20),Math.floor((range.start+range.count-1)/20));
  b.rootTexture.clearUpdateRanges();b.rootTexture.onUpdate(b.rootTexture);
  palette[12]=.5;frame(3,false);assert.deepEqual(b.boneTexture.updateRanges,[{start:0,count:FAUNA_PALETTE_BONES*16}]);
  assert.equal(b.diagnostics().paletteUploadBytes,FAUNA_PALETTE_BONES*16*4);
 }finally{b.dispose();}
});

test('ring allocation has explicit CPU/GPU headroom and rejects invalid streaming options',()=>{
 const one=new FaunaSkinnedBatch(),three=new FaunaSkinnedBatch({paletteRingSize:3});
 try{
  const a=one.diagnostics(),b=three.diagnostics();
  assert.equal(b.paletteRetainedCpuBytes,4*a.paletteBytes);assert.equal(b.paletteGpuEstimateBytes,3*a.paletteBytes);
  assert.equal(b.estimatedBufferBytes-a.estimatedBufferBytes,5*a.paletteBytes);
  assert.throws(()=>new FaunaSkinnedBatch({paletteRingSize:3,maxBufferBytes:a.estimatedBufferBytes}),/exceedbudget/);
 }finally{one.dispose();three.dispose();}
 assert.throws(()=>new FaunaSkinnedBatch({paletteRingSize:4}),/Invalid fauna palette/);
 assert.throws(()=>new FaunaSkinnedBatch({paletteUploadMode:'invalid'}),/Invalid fauna palette/);
});
