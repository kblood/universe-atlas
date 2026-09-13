import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {cubeDirection, buildTile, surfaceNormal, PATCH_SEGMENTS, tileDirection, tileNeighbour} from '../src/planet-tiles.ts';
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
  // Morph endpoints use the same bed field on adjacent tiles; no water level
  // can enter either endpoint.
  const parentPoint=(t,i)=>Array.from(t.parents.slice(i*3,i*3+3)).map((v,j)=>v+t.anchor[j]);
  for(let y=0;y<=n;y++) assert.ok(distance(parentPoint(a,y*(n+1)+n),parentPoint(b,y*(n+1))) * body.radiusM < .25);
  for(let f=0;f<6;f++) {
    const t=buildTile(body,{face:f,level:0,x:0,y:0});
    for(let i=0;i<n*n*6;i+=6) {
      const [ai,bi,ci]=t.indices.slice(i,i+3), p=new THREE.Vector3(...point(t,ai));
      const ab=new THREE.Vector3(...point(t,bi)).sub(p), ac=new THREE.Vector3(...point(t,ci)).sub(p);
      assert.ok(ab.cross(ac).dot(p)>0,'outward triangle winding on every face');
    }
  }
});

test('canonical tile buffers are invariant under forward and reverse generation order',()=>{
  const fixtures=[
    {face:0,level:6,x:11,y:17}, {face:2,level:6,x:29,y:34},
    {face:0,level:18,x:12000,y:13000}, {face:4,level:18,x:0,y:12000},
  ];
  const digest=(tiles)=>{
    const h=createHash('sha256');
    for(const tile of [...tiles].sort((a,b)=>a.face-b.face||a.level-b.level||a.x-b.x||a.y-b.y)){
      const d=buildTile(body,tile);
      h.update(JSON.stringify([d.tile,d.anchor,d.width,d.skirtDepthM]));
      for(const value of [d.positions,d.parents,d.surfaceHeight,d.parentHeight,d.normals,d.materials,d.uvs,d.indices,d.color,d.oceanPositions,d.oceanParents])if(value)h.update(Buffer.from(value.buffer,value.byteOffset,value.byteLength));
    }
    return h.digest('hex');
  };
  assert.equal(digest(fixtures),digest([...fixtures].reverse()));
});

test('near-contact tiles reduce opaque colour-map resolution deterministically',()=>{
  const l13=buildTile(body,{face:0,level:13,x:375,y:406}),l14=buildTile(body,{face:0,level:14,x:750,y:812}),l18=buildTile(body,{face:0,level:18,x:12000,y:13000}),l20=buildTile(body,{face:0,level:20,x:48000,y:52000});
  assert.equal(l13.width,130);assert.equal(l14.width,66);assert.equal(l18.width,66);assert.equal(l20.width,34);
  for(const t of [l13,l14,l18,l20]){assert.equal(t.color.byteLength,t.width*t.width*4);for(const uv of t.uvs)assert.ok(uv>0&&uv<1,'half-texel gutter remains inside the opaque map');}
  assert.deepEqual(l20,buildTile(body,l20.tile));
});

test('fine L18 terrain and parent morph edges agree within two centimetres',()=>{
  const n=PATCH_SEGMENTS,childTile={face:2,level:18,x:12000,y:12000},parentTile={face:2,level:17,x:6000,y:6000};
  const child=buildTile(body,childTile),parent=buildTile(body,parentTile);
  const point=(data,attribute,index)=>[0,1,2].map(j=>data[attribute][index*3+j]+data.anchor[j]);
  // The child starts on the actual parent mesh at every co-located edge node.
  for(let y=0;y<=n;y+=2)for(const [ci,pi] of [[y*(n+1),y/2*(n+1)],[y*(n+1)+n,y/2*(n+1)+n/2]]){
    assert.ok(distance(point(child,'parents',ci),point(parent,'positions',pi))*body.radiusM<.02);
  }
});

test('fine cube-face edge positions agree within two centimetres',()=>{
  const n=PATCH_SEGMENTS,aTile={face:0,level:18,x:0,y:12000},bTile=tileNeighbour(aTile,0),a=buildTile(body,aTile),b=buildTile(body,bTile);
  const point=(data,index)=>[0,1,2].map(j=>data.positions[index*3+j]+data.anchor[j]);
  for(let y=0;y<=n;y++){
    const d=tileDirection(aTile,0,y/n);
    let match=-1,best=-Infinity;
    for(let j=0;j<=(n*n+2*n);j++){const q=tileDirection(bTile,(j%(n+1))/n,Math.floor(j/(n+1))/n),dot=d[0]*q[0]+d[1]*q[1]+d[2]*q[2];if(dot>best){best=dot;match=j;}}
    assert.ok(1-best<1e-14,'mapped cube-edge vertex stays on neighbour grid');
    assert.ok(distance(point(a,y*(n+1)),point(b,match))*body.radiusM<.02);
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

test('cached child-lattice normals are finite, outward, and continuous across tile and cube edges',()=>{
  const n=PATCH_SEGMENTS,a=buildTile(body,{face:2,level:8,x:77,y:91}),b=buildTile(body,{face:2,level:8,x:78,y:91}),normal=(data,i)=>Array.from(data.normals.slice(i*3,i*3+3));
  for(let y=0;y<=n;y++){const left=normal(a,y*(n+1)+n),right=normal(b,y*(n+1));assert.ok(left.every(Number.isFinite)&&right.every(Number.isFinite));assert.ok(distance(left,right)<2e-6,'same-face shared normal');}
  const edge={face:0,level:8,x:0,y:77},other=tileNeighbour(edge,0),x=buildTile(body,edge),z=buildTile(body,other);
  for(let y=0;y<=n;y++){const d=tileDirection(edge,0,y/n);let match=0,best=-Infinity;for(let i=0;i<(n+1)**2;i++){const q=tileDirection(other,(i%(n+1))/n,Math.floor(i/(n+1))/n),dot=d[0]*q[0]+d[1]*q[1]+d[2]*q[2];if(dot>best){best=dot;match=i;}}assert.ok(1-best<1e-14);const left=normal(x,y*(n+1)),right=normal(z,match);assert.ok(distance(left,right)<2e-6,'cube-face shared normal');assert.ok(left[0]*d[0]+left[1]*d[1]+left[2]*d[2]>0,'outward normal');}
});
