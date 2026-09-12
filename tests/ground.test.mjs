import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GroundWalker,initWalking} from '../src/ground-walker.ts';
import {buildTile,directionTile,tileKey} from '../src/planet-tiles.ts';
import {contactGeometry} from '../src/terrain-contact.ts';
import {surfaceQuery} from '../src/world-surface.ts';
await initWalking();
test('capsule walks and jumps with radial gravity at both poles and the equator',()=>{
  const body={id:'physics',seed:'physics',kind:'planet',type:'Rocky world',radiusM:6371000,massKg:5.972e24,water:0};
  for(const axis of [[0,1,0],[0,-1,0],[1,0,0]]){
    const up=new THREE.Vector3(...axis),a=new THREE.Vector3(0,0,1),b=new THREE.Vector3().crossVectors(up,a).normalize();
    const position=up.clone().multiplyScalar(body.radiusM+1);
    const walker=new GroundWalker(body,position.toArray()),heading=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),up);
    const patches=(p,origin)=>{
      const vertices=[[-100,-100],[-100,100],[100,100],[100,-100]].flatMap(([x,y])=>up.clone().multiplyScalar(body.radiusM).addScaledVector(a,x).addScaledVector(b,y).sub(new THREE.Vector3(...origin)).toArray());
      return [{key:'plane',anchor:axis,positions:new Float32Array(vertices),indices:new Uint32Array([0,1,2,0,2,3])}];
    };
    for(let i=0;i<120;i++)walker.update(1/60,heading,new Set(),patches);
    assert.ok(walker.grounded);assert.ok(Math.abs(walker.position.length()-body.radiusM-.91)<.03);
    const start=walker.position.clone();for(let i=0;i<120;i++)walker.update(1/60,heading,new Set(['w']),patches);
    assert.ok(walker.position.distanceTo(start)>7.5);
    walker.requestJump();walker.update(1/240,heading,new Set(),patches);walker.update(1/60,heading,new Set(),patches);assert.equal(walker.grounded,false);
    let peak=0;for(let i=0;i<120;i++){walker.update(1/60,heading,new Set(),patches);peak=Math.max(peak,walker.position.length()-body.radiusM);}
    assert.ok(peak>1.7);assert.ok(walker.grounded);walker.dispose();
  }
});

test('actual moon terrain supports walking across poles, cube edges and origin rebases',()=>{
  const body={id:'moon-contact',seed:'moon-contact',kind:'moon',type:'Rocky moon',radiusM:1737400,massKg:7.342e22,water:0};
  const sample=surfaceQuery(body),level=17;
  for(const axis of [[0,1,0],[0,-1,0],[1,1,0],[1,1,1]]){
    const up=new THREE.Vector3(...axis).normalize(),height=sample(up.toArray()).rockHeightM;
    const start=up.clone().multiplyScalar(body.radiusM+height+1);
    const walker=new GroundWalker(body,start.toArray()),heading=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),up);
    const data=new Map(),cache=new Map();let cachedOrigin='';
    const patches=(p,origin)=>{
      if(origin.join(',')!==cachedOrigin){cache.clear();cachedOrigin=origin.join(',');}
      const radial=new THREE.Vector3(...p).normalize(),east=new THREE.Vector3(0,0,1).cross(radial).normalize(),north=radial.clone().cross(east).normalize(),selected=new Map();
      for(const x of [-10,0,10])for(const y of [-10,0,10]){
        const tile=directionTile(new THREE.Vector3(...p).addScaledVector(east,x).addScaledVector(north,y).toArray(),level),key=tileKey(tile);
        if(!data.has(key))data.set(key,buildTile(body,tile));
        if(!cache.has(key))cache.set(key,contactGeometry(data.get(key),[0,0,0,0],body.radiusM,origin,key));
        selected.set(key,cache.get(key));
      }
      return [...selected.values()];
    };
    for(let i=0;i<180;i++)walker.update(1/60,heading,new Set(),patches);
    assert.ok(walker.grounded,'settled on real terrain at '+axis);
    const stopped=walker.position.clone();walker.update(.1,heading,new Set(['w']),()=>null);
    assert.deepEqual(walker.position,stopped);assert.ok(walker.waiting);
    for(let i=0;i<660;i++)walker.update(1/60,heading,new Set(['w','shift']),patches);
    assert.ok(walker.position.distanceTo(start)>70,'crossed fine tiles and physics origin');
    assert.ok(walker.origin.distanceTo(start)>60);assert.ok(walker.grounded);
    assert.ok(walker.mismatchM<.05,'visible ground/analytic mismatch under 5 cm');
    assert.ok(data.size>4);walker.dispose();
  }
});
