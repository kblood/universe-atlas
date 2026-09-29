import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {levelForward} from '../src/view-heading.ts';

const up=new THREE.Vector3(0.3,0.9,-0.2).normalize();
const ref=new THREE.Vector3(1,0,0);
const tangent=new THREE.Vector3().crossVectors(ref,up).normalize();
const view=(eye,target)=>new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye,target,up));
const eye=up.clone().multiplyScalar(100);

test('level view keeps its horizontal direction',()=>{
  const q=view(eye,eye.clone().addScaledVector(tangent,10).addScaledVector(up,-1));
  assert.ok(levelForward(q,up).angleTo(tangent)<1e-6);
});
test('near-vertical downward view walks toward the side it leans to',()=>{
  const q=view(eye,eye.clone().addScaledVector(up,-100).addScaledVector(tangent,.5));
  assert.ok(levelForward(q,up).angleTo(tangent)<1e-3);
});
test('near-vertical upward view is not turned about pi (URL heading regression)',()=>{
  // The fauna fixtures encode a heading from 1 166 m below the ground toward a
  // point 8 m horizontally away: almost straight up, leaning toward +tangent.
  const q=view(eye,eye.clone().addScaledVector(up,1166).addScaledVector(tangent,8));
  const forward=levelForward(q,up);
  assert.ok(forward.angleTo(tangent)<1e-3,`forward ${forward.toArray()} vs ${tangent.toArray()}`);
  assert.ok(Math.abs(forward.dot(up))<1e-9);
});
