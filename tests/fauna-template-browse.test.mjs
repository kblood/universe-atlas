import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFaunaTemplate,FAUNA_TEMPLATE_CONTROLS} from '../src/fauna-template.ts';
import {createFaunaTemplateBrowse,FAUNA_BROWSE_ANGLES} from '../src/fauna-template-browse.ts';
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
  { const start=positions.length/3,head=names.indexOf('head'); positions.push(1.17,1.33,-.02,1.17,1.33,.02,1.15,1.36,0); for(let k=0;k<3;k++){indices.push(head,0,0,0);weights.push(1,0,0,0);} triangles.push(start,start+1,start+2); }
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
const snapshot=i=>[...i.bones].map(([id,b])=>[id,...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray()]);
test('browse measures the real neck/muzzle, bounds angles and preserves planted feet',()=>{
 const {template}=fixture(),i=template.instantiate(),browse=createFaunaTemplateBrowse(i),lengths=new Map([...i.bones].map(([id,b])=>[id,b.position.length()]));
 assert.ok(browse.measurements.foliageHeightRangeM[0]>.5,'bounded browse does not claim ground grazing');
 for(let k=0;k<=48;k++){const state=browse.update(k/6);assert.ok(state.reachResidualM<1e-8);assert.ok(state.heightResidualM<1e-8);assert.ok(state.base.maxContactErrorM<1e-6);
  for(const [name,angle]of Object.entries(state.angles))assert.ok(Math.abs(angle)<=Math.abs(FAUNA_BROWSE_ANGLES[name])+1e-12);
  for(const [id,b]of i.bones)assert.ok(Math.abs(b.position.length()-lengths.get(id))<1e-12,'no translated or stretched bones');
  for(let v=0;v<12;v++){const p=i.mesh.getVertexPosition(v,new THREE.Vector3());assert.ok(Math.abs(p.y)<1e-6,'actual weighted hoof remains on ground');}
 }
 template.dispose();
});
test('browse is seekable, handles negative/large finite time, and rejects nonfinite values',()=>{
 const{template}=fixture(),i=template.instantiate(),browse=createFaunaTemplateBrowse(i),a=browse.update(3.17),pose=snapshot(i);
 for(const t of[-3.17,1e15,Number.MAX_VALUE,0]){const s=browse.update(t);assert.ok(s.actualMuzzle.every(Number.isFinite));}
 assert.deepEqual(browse.update(3.17),a);assert.deepEqual(snapshot(i),pose);
 for(const t of[NaN,Infinity,-Infinity])assert.throws(()=>browse.update(t));
 assert.throws(()=>browse.update(0,{foliageHeightM:NaN}));template.dispose();
});
test('unreachable foliage height clamps honestly and a requested reachable height is reached',()=>{
 const{template}=fixture(),i=template.instantiate(),browse=createFaunaTemplateBrowse(i),[low,high]=browse.measurements.foliageHeightRangeM;
 const lowState=browse.update(3,{foliageHeightM:0});assert.equal(lowState.reachableHeightM,low);assert.equal(lowState.heightClampErrorM,low);assert.ok(lowState.actualMuzzle[1]>.5);
 const highState=browse.update(3,{foliageHeightM:5});assert.equal(highState.reachableHeightM,high);assert.equal(highState.heightClampErrorM,5-high);
 const middle=(low+high)/2,mid=browse.update(3,{foliageHeightM:middle});assert.ok(Math.abs(mid.actualMuzzle[1]-middle)<1e-8);assert.equal(mid.heightClampErrorM,0);template.dispose();
});
test('morphology changes require a new measurement capture',()=>{
 const{template}=fixture(),i=template.instantiate(),browse=createFaunaTemplateBrowse(i);i.apply({juvenile:1});assert.throws(()=>browse.update(0),/Recreate browse/);assert.doesNotThrow(()=>createFaunaTemplateBrowse(i).update(3));template.dispose();
});
test('root placement does not change model-space reach',()=>{
 const{template}=fixture(),i=template.instantiate();i.root.position.set(7,3,-9);i.root.rotation.set(.2,.7,-.1);i.root.scale.setScalar(2);const browse=createFaunaTemplateBrowse(i),s=browse.update(3);
 assert.ok(s.reachResidualM<1e-8);assert.ok(new THREE.Vector3(...s.actualMuzzle).applyMatrix4(i.root.matrixWorld).distanceTo(new THREE.Vector3(...s.worldMuzzle))<1e-9);template.dispose();
});
