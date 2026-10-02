import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFaunaTemplate,FAUNA_TEMPLATE_CONTROLS} from '../src/fauna-template.ts';
import {createFaunaTemplateMotion,solveFaunaTemplateLimb} from '../src/fauna-template-motion.ts';

function fixture({mixed=false,pose=false}={}){
  // Explicit authored quadruped chain; triangles are actual weighted hoof soles.
  const joints={root:[[0,0,0],null],pelvis:[[-.43,.98,0],'root'],spine:[[-.12,.97,0],'pelvis'],chest:[[.32,.97,0],'spine'],neck1:[[.5,1.02,0],'chest'],neck2:[[.66,1.24,0],'neck1'],head:[[.8,1.42,0],'neck2'],tail1:[[-.64,1.02,0],'pelvis'],tail2:[[-.75,.95,0],'tail1']};
  for(const [s,z]of[['L',-.155],['R',.155]])Object.assign(joints,{
    [`${s}_scapula`]:[[.28,1.1,z],'chest'],[`${s}_shoulder`]:[[.45,.91,z],`${s}_scapula`],
    [`${s}_elbow`]:[[.30,.69,z],`${s}_shoulder`],[`${s}_carpus`]:[[.40,.39,z],`${s}_elbow`],[`${s}_front_fetlock`]:[[.39,.105,z],`${s}_carpus`],
    [`${s}_hip`]:[[-.44,.99,z],'pelvis'],[`${s}_stifle`]:[[-.25,.74,z],`${s}_hip`],[`${s}_hock`]:[[-.47,.41,z],`${s}_stifle`],[`${s}_rear_fetlock`]:[[-.40,.105,z],`${s}_hock`],
  });
  const root=new THREE.Group(),bones=new Map(Object.keys(joints).map(id=>[id,Object.assign(new THREE.Bone(),{name:id})]));
  for(const[id,[p,parent]]of Object.entries(joints)){const b=bones.get(id);b.position.fromArray(p);if(parent)b.position.sub(new THREE.Vector3(...joints[parent][0]));(parent?bones.get(parent):root).add(b);}
  const positions=[],indices=[],weights=[],triangles=[],names=[...bones.keys()];
  for(const[s,z]of[['L',-.155],['R',.155]])for(const[end,x]of[['front',.39],['rear',-.40]]){
    const start=positions.length/3,b=names.indexOf(`${s}_${end}_fetlock`);
    positions.push(x-.02,0,z-.03,x+.08,0,z-.03,x+.03,0,z+.03);
    for(let i=0;i<3;i++){indices.push(b,names.indexOf(`${s}_${end==='front'?'elbow':'stifle'}`),0,0);weights.push(mixed?.8:1,mixed?.2:0,0,0);}triangles.push(start,start+1,start+2);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));g.setIndex(triangles);g.computeVertexNormals();
  const controls=Object.fromEntries(FAUNA_TEMPLATE_CONTROLS.map(id=>[id,id==='juvenile'?{min:0,max:1,positive:id}:{min:-1,max:1,negative:`${id}_min`,positive:`${id}_max`}]));
  const targets=Object.values(controls).flatMap(c=>[...(c.negative?[c.negative]:[]),c.positive]).map(name=>({name,min:0,max:1,default:0,jointDeltas:{}}));
  if(pose)for(const side of ['L','R'])targets.push({name:`${side}_hip_flexion_groin`,min:0,max:1,default:0,jointDeltas:{}});
  g.morphTargetsRelative=true;g.morphAttributes.position=targets.map(()=>new THREE.Float32BufferAttribute(new Float32Array(positions.length),3));
  const mesh=new THREE.SkinnedMesh(g,new THREE.MeshStandardMaterial());mesh.name='HoofContactFixture';mesh.morphTargetDictionary=Object.fromEntries(targets.map((t,i)=>[t.name,i]));mesh.morphTargetInfluences=targets.map(()=>0);root.add(mesh);root.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton([...bones.values()]));
  const sidecar={schemaVersion:'fauna-template-1',id:'contact-fixture',mesh:mesh.name,runtime:'contact.glb',source:'contact.blend',units:'metres',upAxis:'+Y',forwardAxis:'+X',controls,targets,correctives:[],neutralJoints:Object.fromEntries([...bones].map(([id,b])=>[id,{parent:joints[id][1],translation:b.position.toArray(),rotation:b.quaternion.toArray(),scale:[1,1,1]}]))};
  if(pose)sidecar.poseCorrectives=['L','R'].map(side=>({target:`${side}_hip_flexion_groin`,joint:`${side}_hip`,child:`${side}_stifle`,driver:'sagittal-flexion',startRadians:.04,fullRadians:.15}));
  return{template:createFaunaTemplate(root,sidecar,{ownsSource:true}),joints};
}
const positions=i=>[...i.bones].map(([id,b])=>[id,...b.getWorldPosition(new THREE.Vector3()).toArray()]);

test('measured limb IK preserves lengths, bends anatomically and exposes unreachable contacts',()=>{
  const hip=new THREE.Vector3(0,1,0),target=new THREE.Vector3(.1,.4,0);
  const fore=solveFaunaTemplateLimb(hip,target,.35,.4,new THREE.Vector3(-1,1,0));
  const hind=solveFaunaTemplateLimb(hip,target,.35,.4,new THREE.Vector3(1,1,0));
  for(const s of[fore,hind]){assert.ok(Math.abs(s.middle.distanceTo(hip)-.35)<1e-10);assert.ok(Math.abs(s.middle.distanceTo(s.end)-.4)<1e-10);assert.ok(s.end.distanceTo(target)<1e-10);}
  assert.ok(fore.middle.x<0,'fore elbow remains caudal to shoulder');assert.ok(hind.middle.x>target.x,'stifle remains cranial to hip and hock');
  const far=solveFaunaTemplateLimb(hip,new THREE.Vector3(10,1,0),.35,.4,new THREE.Vector3(0,0,1));
  assert.ok(far.reachErrorM>9.25);assert.ok(Math.abs(far.middle.distanceTo(far.end)-.4)<1e-8);
  const parallel=solveFaunaTemplateLimb(new THREE.Vector3(),new THREE.Vector3(0,0,.5),.35,.4,new THREE.Vector3(0,0,1));
  assert.ok(Math.abs(parallel.middle.length()-.35)<1e-10);assert.ok(Math.abs(parallel.middle.distanceTo(parallel.end)-.4)<1e-10);
  assert.throws(()=>solveFaunaTemplateLimb(hip,target,NaN,.4,hip));
});

test('neutral template motion preserves all 27 authored joint positions',()=>{
  const{template,joints}=fixture(),instance=template.instantiate(),motion=createFaunaTemplateMotion(instance);
  const state=motion.update(19,{gait:'neutral'});assert.equal(instance.bones.size,27);
  for(const[id,b]of instance.bones)assert.ok(b.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(...joints[id][0]))<1e-9,id);
  assert.ok(state.maxContactErrorM<1e-9);assert.ok(state.feet.every(f=>Math.abs(f.soleHeightM)<1e-8));template.dispose();
});

test('walk plants actual weighted hoof vertices in world space and preserves all segment lengths',()=>{
  const{template}=fixture(),instance=template.instantiate(),motion=createFaunaTemplateMotion(instance);let previous=null,plantedPairs=0;
  for(let step=0;step<=180;step++){
    const time=step*motion.measurements.cycleS/60,state=motion.update(time);
    assert.ok(state.maxContactErrorM<1e-6);assert.ok(state.maxReachErrorM<1e-9);
    for(const foot of state.feet){
      const old=previous?.feet.find(f=>f.id===foot.id);
      if(old?.stance&&foot.stance){assert.ok(new THREE.Vector3(...old.contact).distanceTo(new THREE.Vector3(...foot.contact))<1e-6,'planted hoof cannot skate in world space');plantedPairs++;}
      const p=foot.id.startsWith('L')?'L':'R',front=foot.id.endsWith('front');
      const a=instance.bones.get(`${p}_${front?'shoulder':'hip'}`).getWorldPosition(new THREE.Vector3());
      const b=instance.bones.get(`${p}_${front?'elbow':'stifle'}`).getWorldPosition(new THREE.Vector3());
      const c=instance.bones.get(`${p}_${front?'carpus':'hock'}`).getWorldPosition(new THREE.Vector3());
      assert.ok(Math.abs(a.distanceTo(b)-foot.upperLengthM)<1e-7);assert.ok(Math.abs(b.distanceTo(c)-foot.lowerLengthM)<1e-7);
    }
    // Independent geometry check: CPU skinning of the actual sole vertices,
    // not the IK solver's target or its own diagnostic contact values.
    for(let v=0;v<instance.mesh.geometry.attributes.position.count;v++){
      const point=instance.mesh.getVertexPosition(v,new THREE.Vector3()).applyMatrix4(instance.mesh.matrixWorld);
      assert.ok(point.y>=-1e-6,`skinned hoof sole below ground: ${point.y}`);
    }
    previous=state;
  }
  assert.ok(plantedPairs>400);template.dispose();
});

test('template pose replay is independent of update order and inspection mode is explicit',()=>{
  const{template}=fixture(),i=template.instantiate(),motion=createFaunaTemplateMotion(i);
  const a=motion.update(.37),pose=positions(i);motion.update(15);motion.update(-3);const b=motion.update(.37);
  assert.deepEqual(b,a);assert.deepEqual(positions(i),pose);
  const stationary=motion.update(2,{gait:'walk',inPlace:true});assert.equal(stationary.inPlace,true);assert.equal(i.root.position.x,0);
  motion.update(2,{gait:'neutral'});motion.update(2,{gait:'idle'});assert.ok(motion.update(2,{gait:'idle'}).maxContactErrorM<1e-6);
  assert.throws(()=>motion.update(NaN));template.dispose();
});

test('contact diagnostics expose blended-skin error instead of reporting a perfect rigid proxy',()=>{
  const{template}=fixture({mixed:true}),i=template.instantiate(),motion=createFaunaTemplateMotion(i),state=motion.update(.24);
  for(const foot of state.feet){
    const start={L_front:0,L_rear:3,R_front:6,R_rear:9}[foot.id];
    const vertices=[0,1,2].map(v=>i.mesh.getVertexPosition(start+v,new THREE.Vector3()).applyMatrix4(i.mesh.matrixWorld));
    assert.ok(vertices.some(v=>v.distanceTo(new THREE.Vector3(...foot.contact))<1e-9),'diagnostic contact is an actual skinned sole vertex');
    assert.ok(Math.abs(Math.min(...vertices.map(v=>v.y))-foot.minSoleHeightM)<1e-9);
  }
  // This fixture's non-rigid hoof may or may not penetrate at a particular
  // phase; whichever happens must be reported rather than replaced by its IK goal.
  assert.ok(state.feet.some(f=>f.contactErrorM>1e-5));template.dispose();
});

test('motion evaluates actual mirrored hip flexion with neutral reset and order independence',()=>{
  const {template}=fixture({pose:true}),instance=template.instantiate(),motion=createFaunaTemplateMotion(instance),cycle=motion.measurements.cycleS;
  const a=motion.update(cycle*.375,{inPlace:true}),b=motion.update(cycle*.875,{inPlace:true});
  assert.ok(a.poseCorrectives.angles.R_hip>0);assert.ok(Math.abs(a.poseCorrectives.angles.R_hip-b.poseCorrectives.angles.L_hip)<1e-12);
  assert.ok(Math.abs(a.poseCorrectives.influences.R_hip_flexion_groin-b.poseCorrectives.influences.L_hip_flexion_groin)<1e-12);
  motion.update(-19);assert.deepEqual(motion.update(cycle*.375,{inPlace:true}),a);
  // Parent/root rotations must not masquerade as local hip flexion.
  instance.bones.get('pelvis').rotation.set(.25,-.17,.38);instance.root.rotation.set(.5,.8,-.3);instance.root.position.set(20,5,-9);instance.root.updateMatrixWorld(true);
  assert.deepEqual(instance.updatePoseCorrectives(),a.poseCorrectives);
  const neutral=motion.update(19,{gait:'neutral'});assert.deepEqual(Object.values(neutral.poseCorrectives.influences),[0,0]);assert.deepEqual(Object.values(neutral.poseCorrectives.angles),[0,0]);
  template.dispose();
});
