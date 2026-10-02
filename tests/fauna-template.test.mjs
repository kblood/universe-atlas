import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFaunaTemplate,loadFaunaTemplate,faunaTemplateInfluences,validateFaunaTemplateSidecar,FAUNA_TEMPLATE_CONTROLS} from '../src/fauna-template.ts';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createHash} from 'node:crypto';

/** Actual morph BufferAttributes, weighted SkinnedMesh and a rotated parent
 * bone: parent-local child +X offsets move along model +Y, never model +X. */
function fixture({grouped=false,pose=false}={}){
  const root=new THREE.Group();root.name='Animal';root.position.set(2,.3,-1);
  const pelvis=new THREE.Bone();pelvis.name='pelvis';pelvis.rotation.z=Math.PI/2;
  const limb=new THREE.Bone();limb.name='limb';limb.position.set(1,0,0);pelvis.add(limb);root.add(pelvis);
  const controls=Object.fromEntries(FAUNA_TEMPLATE_CONTROLS.map(id=>[id,id==='juvenile'?{min:0,max:1,positive:'juvenile'}:{min:-1,max:1,negative:`${id}_min`,positive:`${id}_max`}]));
  const targetNames=Object.values(controls).flatMap(c=>[...(c.negative?[c.negative]:[]),c.positive]);
  targetNames.push('bodyCondition_max__legLength_max');
  if(pose)targetNames.push('pelvis_flexion');
  const base=[0,1,0,.2,1,0,0,1.2,0],jointDeltas={
    bodyCondition_max:{limb:[0,-.1,0]},legLength_max:{limb:[.4,0,0]},juvenile:{limb:[-.3,0,0]},
    bodyCondition_max__legLength_max:{limb:[0,-.05,0]},
  };
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(base,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1],3));
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0],4));
  geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0],4));geometry.setIndex([0,1,2]);
  geometry.morphTargetsRelative=true;
  geometry.morphAttributes.position=targetNames.map(name=>new THREE.Float32BufferAttribute(base.map((v,i)=>
    name==='legLength_max'?(i%3===1?.4:0):name==='bodyCondition_max'?(i%3===0?.1:0):
    name==='bodyCondition_max__legLength_max'?(i%3===0?.05:0):name==='juvenile'?-v*.3:name==='pelvis_flexion'?(i%3===2?.02:0):0),3));
  const material=new THREE.MeshStandardMaterial({color:0x916f43});
  const mesh=new THREE.SkinnedMesh(geometry,material);mesh.name=grouped?'SM_Doe_0':'SM_Doe';
  mesh.morphTargetDictionary=Object.fromEntries(targetNames.map((name,i)=>[name,i]));mesh.morphTargetInfluences=targetNames.map(()=>0);
  if(grouped){const group=new THREE.Group();group.name='SM_Doe';group.add(mesh);root.add(group);
    const second=new THREE.SkinnedMesh(geometry,material);second.name='SM_Doe_1';second.morphTargetDictionary={...mesh.morphTargetDictionary};second.morphTargetInfluences=targetNames.map(()=>0);group.add(second);}
  else root.add(mesh);
  root.updateMatrixWorld(true);const skeleton=new THREE.Skeleton([pelvis,limb]);
  root.traverse(o=>{if(o.isSkinnedMesh)o.bind(skeleton,o.matrixWorld.clone());});
  const sidecar={schemaVersion:'fauna-template-1',id:'test-doe',mesh:'SM_Doe',runtime:'deer-doe.glb',source:'deer-doe.blend',units:'metres',upAxis:'+Y',forwardAxis:'+X',
    neutralJoints:Object.fromEntries([pelvis,limb].map(b=>[b.name,{parent:b.parent.isBone?b.parent.name:null,translation:b.position.toArray(),rotation:b.quaternion.toArray(),scale:b.scale.toArray()}])),
    targets:targetNames.map(name=>({name,min:0,max:1,default:0,jointDeltas:jointDeltas[name]??{}})),controls,
    correctives:[{target:'bodyCondition_max__legLength_max',a:'bodyCondition_max',b:'legLength_max'}]};
  if(pose)sidecar.poseCorrectives=[{target:'pelvis_flexion',joint:'pelvis',child:'limb',driver:'sagittal-flexion',startRadians:.04,fullRadians:.15}];
  return{root,mesh,sidecar,geometry,material};
}
const vertex=(mesh,i=0)=>mesh.getVertexPosition(i,new THREE.Vector3());
const near=(actual,expected,epsilon=1e-6)=>assert.ok(actual.distanceTo(new THREE.Vector3(...expected))<epsilon,`${actual.toArray()} vs ${expected}`);

test('loader hashes exact sidecar bytes independently of unchanged GLB bytes',async t=>{
  const f=fixture(),bytes=new Uint8Array([1,2,3,4]);let sidecarText=JSON.stringify(f.sidecar),requests=[],parsed=0;
  t.mock.method(globalThis,'fetch',async url=>{requests.push(url);return new Response(url.endsWith('.json')?sidecarText:bytes);});
  t.mock.method(GLTFLoader.prototype,'parseAsync',async (buffer,base)=>{parsed++;assert.deepEqual(new Uint8Array(buffer),bytes);assert.equal(base,'https://example.test/fauna/');return{scene:fixture().root};});
  const hash=value=>createHash('sha256').update(value).digest('hex');
  const first=await loadFaunaTemplate('https://example.test/fauna/deer-doe.glb','https://example.test/fauna/fauna-template.json');
  assert.equal(first.sourceHash,hash(bytes));assert.equal(first.sidecarHash,hash(sidecarText));assert.equal(requests.length,2);
  sidecarText='\n'+JSON.stringify(f.sidecar,null,2)+'\n';requests=[];
  const second=await loadFaunaTemplate('https://example.test/fauna/deer-doe.glb','https://example.test/fauna/fauna-template.json');
  assert.equal(second.sourceHash,first.sourceHash);assert.notEqual(second.sidecarHash,first.sidecarHash);assert.deepEqual(second.sidecar,first.sidecar);assert.equal(requests.length,2);
  first.dispose();second.dispose();sidecarText='invalid JSON';await assert.rejects(()=>loadFaunaTemplate('https://example.test/fauna/deer-doe.glb','https://example.test/fauna/fauna-template.json'));assert.equal(parsed,2);
  const local=createFaunaTemplate(f.root,f.sidecar);assert.equal(local.sourceHash,null);assert.equal(local.sidecarHash,null,'Fixtures do not invent downloaded metadata hashes');local.dispose();
});

test('fauna template validates the authored contract and bounded corrective influences',()=>{
  const {sidecar}=fixture();assert.deepEqual(validateFaunaTemplateSidecar(sidecar),[]);
  const weights=faunaTemplateInfluences(sidecar,{bodyCondition:.5,legLength:.8,earSize:-.4});
  assert.equal(weights.bodyCondition_max,.5);assert.equal(weights.bodyCondition_min,0);
  assert.equal(weights.earSize_min,.4);assert.equal(weights.bodyCondition_max__legLength_max,.4);
  assert.equal(faunaTemplateInfluences(sidecar,{juvenile:2}).juvenile,1);
  assert.throws(()=>faunaTemplateInfluences(sidecar,{legLength:NaN}),/Invalid/);
  assert.throws(()=>faunaTemplateInfluences(sidecar,{unrecognised:1}),/Invalid/);
  for(const modify of [
    s=>s.schemaVersion='other',s=>s.upAxis='+Z',s=>s.runtime='../else.glb',s=>s.neutralJoints.limb.translation[0]=NaN,
    s=>s.neutralJoints.pelvis.parent='limb',s=>s.targets[0].jointDeltas.missing=[0,1,0],
    s=>s.targets[0].max=2,s=>s.targets[0].default=1,s=>s.controls.earSize.positive='absent',
    s=>s.correctives[0].a=s.correctives[0].target,s=>s.correctives.push({...s.correctives[0]}),
  ]){const malformed=structuredClone(sidecar);modify(malformed);assert.ok(validateFaunaTemplateSidecar(malformed).length>0);}
});

test('real morph geometry and local joint offsets align under a rotated parent without double displacement',()=>{
  const f=fixture(),template=createFaunaTemplate(f.root,f.sidecar),instance=template.instantiate();
  near(vertex(instance.mesh),[0,1,0]);
  instance.apply({legLength:1});near(vertex(instance.mesh),[0,1.4,0]);
  near(instance.bones.get('limb').position,[1.4,0,0]);
  near(instance.bones.get('limb').getWorldPosition(new THREE.Vector3()),[2,1.7,-1]);
  instance.apply({bodyCondition:1,legLength:1});near(vertex(instance.mesh),[.15,1.4,0]);
  near(instance.bones.get('limb').position,[1.4,-.15,0]);
  const joint=instance.bones.get('limb').getWorldPosition(new THREE.Vector3());
  near(joint,[2.15,1.7,-1]);
  const shape=vertex(instance.mesh).applyMatrix4(instance.mesh.matrixWorld);assert.ok(shape.distanceTo(joint)<1e-6,'joint follows its morphological landmark');
  instance.apply({juvenile:1});near(vertex(instance.mesh),[0,.7,0]);near(instance.bones.get('limb').position,[.7,0,0]);
  instance.apply();near(vertex(instance.mesh),[0,1,0]);
  for(let i=0;i<f.mesh.skeleton.boneInverses.length;i++)assert.ok(instance.mesh.skeleton.boneInverses[i].elements.every((v,j)=>Math.abs(v-f.mesh.skeleton.boneInverses[i].elements[j])<1e-12));
  template.dispose();
});

test('morph rebasing never bakes an active animation pose into inverse binds',()=>{
  const f=fixture(),template=createFaunaTemplate(f.root,f.sidecar),a=template.instantiate(),b=template.instantiate();
  a.apply({legLength:.7,bodyCondition:.4});
  const pose=i=>{i.bones.get('limb').rotation.z=.45;i.root.updateMatrixWorld(true);i.mesh.skeleton.update();};
  pose(a);pose(b);b.apply({legLength:.7,bodyCondition:.4});
  for(let i=0;i<3;i++)assert.ok(vertex(a.mesh,i).distanceTo(vertex(b.mesh,i))<1e-6);
  b.resetPose();near(vertex(b.mesh),[.054,1.28,0]);
  assert.equal(b.controls().legLength,.7);assert.ok(Math.abs(b.bones.get('limb').rotation.z)<1e-12);
  template.dispose();
});

test('template instances own skeletons/materials/influences and share immutable geometry',()=>{
  const f=fixture(),template=createFaunaTemplate(f.root,f.sidecar),a=template.instantiate(),b=template.instantiate();
  assert.notEqual(a.mesh.skeleton,b.mesh.skeleton);assert.notEqual(a.bones.get('limb'),b.bones.get('limb'));
  assert.notEqual(a.mesh.material,b.mesh.material);assert.equal(a.mesh.geometry,b.mesh.geometry);
  assert.notEqual(a.mesh.morphTargetInfluences,b.mesh.morphTargetInfluences);
  a.apply({legLength:1});near(vertex(b.mesh),[0,1,0]);near(vertex(f.mesh),[0,1,0]);
  a.root.position.set(-20,4,7);a.root.rotation.y=.7;a.root.updateMatrixWorld(true);a.apply({legLength:.5});near(vertex(a.mesh),[0,1.2,0]);
  assert.deepEqual(f.mesh.morphTargetInfluences,f.mesh.morphTargetInfluences.map(()=>0));
  const state=a.controls();state.legLength=0;assert.equal(a.controls().legLength,.5);
  a.dispose();assert.throws(()=>a.apply(),/disposed/);b.apply({juvenile:1});near(vertex(b.mesh),[0,.7,0]);
  template.dispose();assert.throws(()=>template.instantiate(),/disposed/);
});

test('multi-material GLTF group primitives receive the same shapes and independent inverse binds',()=>{
  const f=fixture({grouped:true}),template=createFaunaTemplate(f.root,f.sidecar),instance=template.instantiate();
  assert.equal(instance.mesh.name,'SM_Doe_0');instance.apply({legLength:1});
  const parts=[];instance.root.traverse(o=>{if(o.isSkinnedMesh)parts.push(o);});assert.equal(parts.length,2);
  for(const part of parts){near(vertex(part),[0,1.4,0]);assert.equal(part.morphTargetInfluences[part.morphTargetDictionary.legLength_max],1);}
  template.dispose();
});

test('source mismatch is rejected and disposal releases each owned resource exactly once',()=>{
  const f=fixture();let geometries=0,materials=0,textures=0;
  f.geometry.addEventListener('dispose',()=>geometries++);f.material.addEventListener('dispose',()=>materials++);
  f.material.map=new THREE.Texture();f.material.map.addEventListener('dispose',()=>textures++);
  const bad=structuredClone(f.sidecar);bad.neutralJoints.limb.translation[0]=2;
  assert.throws(()=>createFaunaTemplate(f.root,bad),/rest transform mismatch/);
  const index=f.mesh.morphTargetDictionary.legLength_max;delete f.mesh.morphTargetDictionary.legLength_max;
  assert.throws(()=>createFaunaTemplate(f.root,f.sidecar),/Missing or invalid morph/);f.mesh.morphTargetDictionary.legLength_max=index;
  const template=createFaunaTemplate(f.root,f.sidecar,{ownsSource:true}),a=template.instantiate(),b=template.instantiate();
  a.dispose();assert.deepEqual([geometries,materials,textures],[0,0,0]);
  template.dispose();template.dispose();b.dispose();assert.deepEqual([geometries,materials,textures],[1,1,1]);
});

test('pose corrective schema rejects ambiguous drivers, stale targets and moving rest joints',()=>{
  const {sidecar}=fixture({pose:true});assert.deepEqual(validateFaunaTemplateSidecar(sidecar),[]);
  for(const modify of[
    s=>s.poseCorrectives={},s=>s.poseCorrectives.push({...s.poseCorrectives[0]}),
    s=>s.poseCorrectives[0].target='absent',s=>s.poseCorrectives[0].target='bodyCondition_max',
    s=>s.poseCorrectives[0].target='bodyCondition_max__legLength_max',s=>s.poseCorrectives[0].driver='clock',
    s=>s.poseCorrectives[0].joint='limb',s=>s.poseCorrectives[0].child='absent',
    s=>s.poseCorrectives[0].startRadians=NaN,s=>s.poseCorrectives[0].startRadians=-.1,
    s=>s.poseCorrectives[0].fullRadians=.02,s=>s.poseCorrectives[0].fullRadians=Infinity,
    s=>s.poseCorrectives[0].fullRadians=2,s=>s.poseCorrectives[0].phase=.2,
    s=>s.poseCorrectives[0].morphScale='juvenile-shortcut',
    s=>s.targets.at(-1).jointDeltas={limb:[0,.001,0]},s=>delete s.poseCorrectives,
  ]){const malformed=structuredClone(sidecar);modify(malformed);assert.ok(validateFaunaTemplateSidecar(malformed).length>0);}
  const missing=fixture({pose:true});delete missing.mesh.morphTargetDictionary.pelvis_flexion;
  assert.throws(()=>createFaunaTemplate(missing.root,missing.sidecar),/Missing or invalid morph/);
});

test('actual joint angle drives bounded pose morph without joint rebinding or retained state',()=>{
  const f=fixture({grouped:true,pose:true}),template=createFaunaTemplate(f.root,f.sidecar),a=template.instantiate(),b=template.instantiate();
  const joint=a.bones.get('pelvis'),neutral=joint.quaternion.clone(),inverses=a.mesh.skeleton.boneInverses.map(m=>m.toArray());
  const setAngle=angle=>joint.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),angle).multiply(neutral));
  assert.equal(a.updatePoseCorrectives().influences.pelvis_flexion,0);
  setAngle(.095);const half=a.updatePoseCorrectives();assert.ok(Math.abs(half.angles.pelvis-.095)<1e-12);assert.ok(Math.abs(half.influences.pelvis_flexion-.5)<1e-12);
  assert.ok(Math.abs(vertex(a.mesh).z-.01)<1e-8,'actual morph BufferAttribute affects skinned geometry');
  a.root.traverse(m=>{if(m.isSkinnedMesh)assert.ok(Math.abs(m.morphTargetInfluences[m.morphTargetDictionary.pelvis_flexion]-.5)<1e-12);});
  assert.equal(b.influences().pelvis_flexion,0);assert.deepEqual(a.mesh.skeleton.boneInverses.map(m=>m.toArray()),inverses);
  a.root.position.set(18,7,-12);a.root.rotation.set(.4,-.7,.2);a.root.updateMatrixWorld(true);assert.deepEqual(a.updatePoseCorrectives(),half);
  setAngle(.8);assert.equal(a.updatePoseCorrectives().influences.pelvis_flexion,1);setAngle(-.3);assert.equal(a.updatePoseCorrectives().influences.pelvis_flexion,0);
  setAngle(.095);assert.deepEqual(a.updatePoseCorrectives(),half);
  a.apply({legLength:.5});assert.equal(a.influences().pelvis_flexion,0,'control apply clears stale posed weights');
  assert.ok(Math.abs(a.updatePoseCorrectives().influences.pelvis_flexion-.5)<1e-12);
  a.resetPose();assert.equal(a.influences().pelvis_flexion,0);assert.equal(a.updatePoseCorrectives().angles.pelvis,0);assert.equal(a.controls().legLength,.5);
  template.dispose();
});

test('pose scale follows actual supported morph geometry rather than named controls',()=>{
  const f=fixture({pose:true});f.sidecar.poseCorrectives[0].morphScale='support-edge-projection';
  // Directional support lies along Y. Juvenile geometry scales Y to 70%,
  // whereas legLength translates every vertex equally and must not scale it.
  f.geometry.morphAttributes.position.at(-1).array.set([0,.02,0,0,.02,0,0,.02,0]);
  const template=createFaunaTemplate(f.root,f.sidecar),i=template.instantiate(),joint=i.bones.get('pelvis'),neutral=joint.quaternion.clone();
  const flex=()=>{joint.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),.2).multiply(neutral));return i.updatePoseCorrectives();};
  assert.equal(flex().scales.pelvis_flexion,1);i.apply({juvenile:1});const young=flex();
  assert.ok(Math.abs(young.scales.pelvis_flexion-.7)<1e-6);assert.ok(Math.abs(young.influences.pelvis_flexion-.7)<1e-6);
  i.apply({legLength:1});assert.equal(flex().scales.pelvis_flexion,1);i.apply();assert.equal(flex().scales.pelvis_flexion,1);
  i.resetPose();assert.equal(i.influences().pelvis_flexion,0);template.dispose();
  const degenerate=fixture({pose:true});degenerate.sidecar.poseCorrectives[0].morphScale='support-edge-projection';
  assert.throws(()=>createFaunaTemplate(degenerate.root,degenerate.sidecar).instantiate(),/no measurable directional support edges/);
});

for(const pose of[false,true])test(`bone envelopes contain actual morphed skin without per-pose vertex scans (pose targets: ${pose})`,()=>{
  const f=fixture({grouped:true,pose}),template=createFaunaTemplate(f.root,f.sidecar),instance=template.instantiate();
  const parts=[];instance.root.traverse(m=>{if(m.isSkinnedMesh)parts.push(m);});
  const joint=instance.bones.get('pelvis'),neutral=joint.quaternion.clone();
  for(const controls of[{}, {juvenile:1}, {legLength:1,bodyCondition:1}]){
    instance.apply(controls);instance.root.rotation.set(.4,-.3,.2);instance.root.position.set(25,9,-12);
    for(const angle of[-.8,0,.095,.8,-.8]){
      joint.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),angle).multiply(neutral));
      const original=parts.map(m=>({get:m.getVertexPosition,bounds:m.computeBoundingBox}));
      for(const m of parts){m.getVertexPosition=()=>{throw new Error('Per-pose skin scan forbidden');};m.computeBoundingBox=()=>{throw new Error('Per-pose bounds scan forbidden');};}
      const state=instance.updatePoseCorrectives();if(!pose)assert.deepEqual(state,{angles:{},influences:{},scales:{}});
      parts.forEach((m,k)=>{m.getVertexPosition=original[k].get;m.computeBoundingBox=original[k].bounds;});
      for(const m of parts)for(let v=0;v<m.geometry.attributes.position.count;v++){const point=m.getVertexPosition(v,new THREE.Vector3());assert.ok(m.boundingBox.containsPoint(point),'conservative bone envelope contains actual skinned point');assert.ok(m.boundingSphere.containsPoint(point),'conservative sphere contains actual skinned point');}
    }
  }
  template.dispose();
});
