import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {floraShadowOrder,compareFaunaVisibility} from '../src/life-shadow-priority.ts';

test('visible flora keeps its original budget order before additional shadow casters',()=>{
  const candidates={count:5,centerX:new Float32Array([0,1,2,3,4]),centerY:new Float32Array(5),centerZ:new Float32Array(5),radius:new Float32Array(5),survivorIndex:slot=>[3,1][slot]};
  const order=new Uint32Array(5),seen=new Uint8Array(5),origin=new THREE.Vector3(10,0,0),sphere=new THREE.Sphere();
  const shadow={intersectsSphere:s=>s.center.x<14};
  assert.equal(floraShadowOrder(candidates,2,shadow,origin,order,seen,sphere),4);
  assert.deepEqual([...order.slice(0,4)],[3,1,0,2]);
  assert.deepEqual([...order.slice(0,2)],[3,1],'two available slots still draw the same camera-visible plants');
  assert.equal(floraShadowOrder(candidates,2,null,origin,order,seen,sphere),2);
  assert.deepEqual([...order.slice(0,2)],[3,1]);
  candidates.survivorIndex=()=>0;
  assert.equal(floraShadowOrder(candidates,1,shadow,origin,order,seen,sphere),4);
  assert.deepEqual([...order.slice(0,4)],[0,1,2,3],'no stale visible flags or duplicate submissions');
});

test('closer off-camera animals cannot displace visible animals at the instance cap',()=>{
  const animal=(id,distance,cameraVisible)=>({member:{id},distance,cameraVisible});
  const candidates=[animal('shadow',1,false),animal('visible-b',20,true),animal('visible-a',20,true),animal('close',10,true)];
  candidates.sort(compareFaunaVisibility);
  assert.deepEqual(candidates.map(a=>a.member.id),['close','visible-a','visible-b','shadow']);
  assert.deepEqual(candidates.slice(0,2).map(a=>a.member.id),['close','visible-a']);
});
