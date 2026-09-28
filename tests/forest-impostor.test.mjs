import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ForestImpostors} from '../src/forest-impostor.ts';
test('far proxy bounds instance allocation and validates physical transforms',()=>{
  for(const capacity of [0,-1,1.5,229377,Infinity])assert.throws(()=>new ForestImpostors(capacity));
  const f=new ForestImpostors(8),p=new THREE.Vector3(100,200,300),q=new THREE.Quaternion();
  try{
    assert.equal(f.commit(),0);f.write(2,p,16,q,.3,900);assert.equal(f.mesh.geometry.instanceCount,3);
    assert.equal(f.commit(),48);assert.equal(f.commit(),0);
    assert.deepEqual(Array.from(f.positions.array.slice(8,12)),[100,200,300,16]);
    for(const index of [-1,8,.5,NaN])assert.throws(()=>f.write(index,p,16,q,.3,900));
    assert.throws(()=>f.write(0,p,NaN,q,.3,900));assert.throws(()=>f.write(0,p,16,new THREE.Quaternion(1,1,1,1),.3,900));
    assert.throws(()=>f.write(0,new THREE.Vector3(1e100,0,0),16,q,.3,900));
    f.write(2,p,0,q,.3,900);assert.equal(f.positions.getW(2),0,'zero height retires a slot');
  }finally{f.dispose();}
});
test('hidden batches retain uploads without accumulating unbounded ranges',()=>{
  const f=new ForestImpostors(8),p=new THREE.Vector3(),q=new THREE.Quaternion();
  try{
    for(let i=0;i<1000;i++){f.write(i%8,p,16,q,.5,0);f.commit();}
    for(const a of [f.positions,f.rotations,f.parameters])assert.deepEqual(a.updateRanges,[{start:0,count:32}]);
  }finally{f.dispose();}
});
