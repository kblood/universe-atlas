import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {cubeDirection, buildTile, surfaceNormal, PATCH_SEGMENTS} from '../src/planet-tiles.ts';
import {terrainSampler} from '../src/terrain.ts';
import {surfaceClearance} from '../src/travel.ts';
import {orbitStep, freeLook,alignPlanetaryDown,atmosphereHeightM} from '../src/planet-flight.ts';
const body = {id:'test',seed:'polar-regression-1',kind:'planet',type:'Terrestrial world',radiusM:6371000,water:.65};
const distance = (a,b) => Math.hypot(...a.map((v,i) => v-b[i]));

test('all twelve cube edges and eight corners share geography and normals', () => {
  const seen = new Map(), sample = terrainSampler(body);
  for (let face=0;face<6;face++) for (let i=0;i<=32;i++) for (const [u,v] of [[-1,i/16-1],[1,i/16-1],[i/16-1,-1],[i/16-1,1]]) {
    const d=cubeDirection(face,u,v), key=d.map(v=>v.toFixed(10)).join(',');
    const item={d,s:sample(d),normal:surfaceNormal(body,d)};
    if (seen.has(key)) {
      const old=seen.get(key);
      assert.ok(distance(old.d,d)<1e-12);
      assert.deepEqual(old.s,item.s);
      assert.ok(distance(old.normal,item.normal)<1e-10);
    } else seen.set(key,item);
  }
  assert.equal(seen.size,12*31+8);
  assert.deepEqual(cubeDirection(2,0,0),[0,1,-0]);
  assert.deepEqual(cubeDirection(3,0,0),[0,-1,0]);
});

test('patches are deterministic with outward triangles and shared child boundaries', () => {
  const n=PATCH_SEGMENTS, a=buildTile(body,{face:2,level:2,x:1,y:1}), b=buildTile(body,{face:2,level:2,x:2,y:1});
  assert.deepEqual(a,buildTile(body,a.tile));
  const point=(t,i)=>Array.from(t.positions.slice(i*3,i*3+3)).map((v,j)=>v+t.anchor[j]);
  for(let y=0;y<=n;y++) assert.ok(distance(point(a,y*(n+1)+n),point(b,y*(n+1))) * body.radiusM < .25);
  for(let f=0;f<6;f++) {
    const t=buildTile(body,{face:f,level:0,x:0,y:0});
    for(let i=0;i<n*n*6;i+=6) {
      const [ai,bi,ci]=t.indices.slice(i,i+3), p=new THREE.Vector3(...point(t,ai));
      const ab=new THREE.Vector3(...point(t,bi)).sub(p), ac=new THREE.Vector3(...point(t,ci)).sub(p);
      assert.ok(ab.cross(ac).dot(p)>0,'outward triangle winding on every face');
    }
  }
});

test('camera transport crosses both poles without heading jumps or radius drift', () => {
  const p=new THREE.Vector3(0,0,6471000), q=new THREE.Quaternion(), axis=new THREE.Vector3(1,0,0);
  let north=false,south=false;
  for(let i=0;i<1440;i++) {
    const previous=q.clone();
    orbitStep(p,q,axis,Math.PI/720);
    north ||= p.y>6470990; south ||= p.y< -6470990;
    assert.ok(Math.abs(p.length()-6471000)<.001);
    assert.ok(Math.abs(previous.dot(q))>.9999);
  }
  assert.ok(north&&south);
  assert.ok(p.distanceTo(new THREE.Vector3(0,0,6471000))<.001);
  for(let i=0;i<2000;i++) freeLook(q,.013,.023);
  assert.ok(Math.abs(q.length()-1)<1e-12);
});

test('terrain-aware clearance permits low orbit at poles, coasts and face corners', () => {
  for(const d of [[0,1,0],[0,-1,0],cubeDirection(0,1,1),cubeDirection(4,.3,.6)]) {
    const info=surfaceClearance(body,d.map(v=>v*(body.radiusM+30000)));
    assert.ok(info.minimum<body.radiusM+22000);
    assert.ok(info.clearance>0);
    assert.ok(Math.abs(info.altitude-30000)<1e-6);
    assert.equal(info.minimum,body.radiusM+info.terrainElevation+120);
  }
});

test('atmospheric roll assist preserves aim and gently aligns down at poles and equator',()=>{
  for(const radial of [[0,1,0],[0,-1,0],[1,0,0],[1,1,1]]){
    const up=new THREE.Vector3(...radial).normalize(),forward=new THREE.Vector3(0,0,-1).projectOnPlane(up).normalize();
    const base=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(),forward,up));
    const q=base.clone().premultiply(new THREE.Quaternion().setFromAxisAngle(forward,1.7)),aim=new THREE.Vector3(0,0,-1).applyQuaternion(q);
    for(let i=0;i<600;i++){
      const step=alignPlanetaryDown(q,up,600,80000,1/60);
      assert.ok(Math.abs(step.correctionRad)<=Math.PI/5/60+1e-12,'bounded nudge');
      assert.ok(new THREE.Vector3(0,0,-1).applyQuaternion(q).distanceTo(aim)<1e-12,'pitch/heading retained');
    }
    assert.ok(new THREE.Vector3(0,1,0).applyQuaternion(q).dot(up)>.999999);
  }
  const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),1),saved=q.clone();
  alignPlanetaryDown(q,new THREE.Vector3(0,1,0),80000,80000,1);assert.deepEqual(q,saved,'no correction outside atmosphere');
  alignPlanetaryDown(q,new THREE.Vector3(0,1,0),0,0,1);assert.deepEqual(q,saved,'no atmosphere means no artificial gravity cue');
  const vertical=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,-1),new THREE.Vector3(0,1,0)),before=vertical.clone();
  alignPlanetaryDown(vertical,new THREE.Vector3(0,1,0),1000,80000,1);assert.deepEqual(vertical,before,'no flip looking straight up');
  assert.equal(atmosphereHeightM({...body,kind:'moon',water:0}),0);
  assert.equal(atmosphereHeightM(body),80000);
});
