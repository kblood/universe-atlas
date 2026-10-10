import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {lifeMemoryReview} from './helpers/life-memory-review.mjs';
test('shared flora/fauna/cache backing counted once; skeleton palette and independent forest separated',()=>{
  const shared=new Float32Array(24),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(shared.subarray(0,12),3));
  const mesh=new THREE.InstancedMesh(g,new THREE.MeshBasicMaterial(),2),skeleton={boneMatrices:new Float32Array(16)};
  const r=lifeMemoryReview({floraMeshes:[mesh],faunaMeshes:[mesh],faunaCachedGeometry:[g],hostArrays:[shared],skeletons:[skeleton,skeleton],
    forestAccounting:{retainedCpuBytes:100,estimatedGpuBytes:200},lifeReserveBytes:256,coreAccountedBytes:1024,candidateTypedBytes:64});
  assert.equal(r.sharedLifeBuffers.geometryBytes,96);assert.equal(r.sharedLifeBuffers.instanceBytes,128);
  assert.equal(r.extraHostCpuBytes,64);assert.equal(r.boneGpuEstimateBytes,64);
  assert.equal(r.lifeRetainedCpuBytes,388);assert.equal(r.lifeGpuEstimateBytes,440);
  assert.equal(r.coreWithMeasuredLifeEstimateBytes,1596);assert.equal(r.candidate.combinedLifeAfterAdditionEstimateBytes,892);
});
