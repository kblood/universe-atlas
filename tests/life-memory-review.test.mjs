import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {lifeMemoryReview} from './helpers/life-memory-review.mjs';
import {rendererMemoryAccounting,LIFE_RESERVE_BYTES} from '../src/renderer-memory.ts';
test('shared flora/fauna/cache backing counted once; skeleton palette and independent forest separated',()=>{
  const shared=new Float32Array(24),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(shared.subarray(0,12),3));
  const mesh=new THREE.InstancedMesh(g,new THREE.MeshBasicMaterial(),2),skeleton={boneMatrices:new Float32Array(16)};
  const r=lifeMemoryReview({floraMeshes:[mesh],faunaMeshes:[mesh],faunaCachedGeometry:[g],hostArrays:[shared],skeletons:[skeleton,skeleton],
    forestAccounting:{retainedCpuBytes:100,estimatedGpuBytes:200},lifeReserveBytes:256,coreAccountedBytes:1024,candidateTypedBytes:64});
  assert.equal(r.sharedLifeBuffers.geometryBytes,96);assert.equal(r.sharedLifeBuffers.instanceBytes,128);
  assert.equal(r.extraHostCpuBytes,64);assert.equal(r.boneGpuEstimateBytes,64);
  assert.equal(r.lifeRetainedCpuBytes,388);assert.equal(r.lifeGpuEstimateBytes,440);
  assert.equal(r.coreAccountedPlusMeasuredLifeEstimateBytes,1852);assert.equal(r.candidate.combinedLifeAfterAdditionEstimateBytes,892);
});
test('actual renderer accounted and reserved semantics remain distinct when adding measured life',()=>{
  const core=rendererMemoryAccounting({residentBytes:4096,oceanNormalBytes:1024,rockOwnedBytes:8192,cloudAllocatedBytes:2048,pendingTiles:1});
  const r=lifeMemoryReview({forestAccounting:{retainedCpuBytes:100,estimatedGpuBytes:200},lifeReserveBytes:LIFE_RESERVE_BYTES,
    coreAccountedBytes:core.accountedBytes,coreReservedCombinedBytes:core.reservedCombinedBytes});
  assert.equal(r.coreAccountedPlusMeasuredLifeEstimateBytes,core.accountedBytes+300);
  assert.equal(r.coreReservedWithMeasuredLifeEstimateBytes,core.reservedCombinedBytes-LIFE_RESERVE_BYTES+300);
  assert.notEqual(r.coreAccountedPlusMeasuredLifeEstimateBytes,core.accountedBytes-LIFE_RESERVE_BYTES+300);
});
