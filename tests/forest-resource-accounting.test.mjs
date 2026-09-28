import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {forestMemoryFootprint,forestMeshBufferFootprint,forestTextureFootprint} from '../src/forest-resource-accounting.ts';

test('mesh buffer estimates count shared and interleaved backing buffers once',()=>{
  const geometry=new THREE.BufferGeometry(),positions=new Float32Array(9);
  const shared=new THREE.BufferAttribute(positions,3);
  geometry.setAttribute('position',shared);geometry.setAttribute('normal',shared);
  geometry.setAttribute('instanceTree',{array:new Float32Array(2),itemSize:2,count:1});
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array([0,1,2]),1));
  const interleaved=new Float32Array(8),other=new THREE.BufferGeometry();
  other.setAttribute('custom',{data:{array:interleaved},itemSize:2,count:4});
  const matrix=new THREE.InstancedBufferAttribute(new Float32Array(16),16),colour=new THREE.InstancedBufferAttribute(new Float32Array(3),3);
  const meshes=[{geometry,instanceMatrix:matrix,instanceColor:colour},{geometry,instanceMatrix:matrix,instanceColor:colour}];
  const value=forestMeshBufferFootprint(meshes,[other]);
  assert.equal(value.geometryBytes,positions.byteLength+6+interleaved.byteLength);
  assert.equal(value.instanceBytes,8+matrix.array.byteLength+colour.array.byteLength);
  assert.equal(value.geometryCount,2);
  assert.equal(value.totalBytes,value.geometryBytes+value.instanceBytes);
});

test('shared textures count decoded image sources once and GPU storage per texture object',()=>{
  const base={width:4,height:4},mip2={width:2,height:2},mip1={width:1,height:1};
  const texture={image:base,mipmaps:[base,mip2,mip1],generateMipmaps:false,minFilter:THREE.LinearMipmapLinearFilter,
    format:THREE.RGBAFormat,type:THREE.UnsignedByteType};
  const value=forestTextureFootprint([texture,texture]);
  assert.deepEqual(value,{decodedCpuBytes:(16+4+1)*4,gpuEstimateBytes:(16+4+1)*4,textureCount:1,imageSourceCount:3});
  const second={...texture};
  assert.deepEqual(forestTextureFootprint([texture,second]),{
    decodedCpuBytes:(16+4+1)*4,gpuEstimateBytes:2*(16+4+1)*4,textureCount:2,imageSourceCount:3});
});

test('ordinary mipmapped RGBA texture estimates the full GPU mip chain',()=>{
  const texture={image:{width:4,height:4},mipmaps:[],generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter,
    format:THREE.RGBAFormat,type:THREE.UnsignedByteType};
  assert.equal(forestTextureFootprint([texture]).gpuEstimateBytes,(16+4+1)*4);
});

test('forest ledger combines legacy buffers, family buffers, unique images and atlas storage without double counting',()=>{
  const legacyGeometry=new THREE.BufferGeometry();legacyGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(3),3));
  const legacy={geometry:legacyGeometry,instanceMatrix:new THREE.InstancedBufferAttribute(new Float32Array(16),16),
    instanceColor:new THREE.InstancedBufferAttribute(new Float32Array(3),3)};
  const familyGeometry=new THREE.BufferGeometry();familyGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));
  const batchGeometry=familyGeometry.clone();batchGeometry.setAttribute('instanceTree',new THREE.InstancedBufferAttribute(new Float32Array(2),2));
  const batch={geometry:batchGeometry,instanceMatrix:new THREE.InstancedBufferAttribute(new Float32Array(16),16),
    instanceColor:new THREE.InstancedBufferAttribute(new Float32Array(3),3)};
  const base={width:4,height:4},texture={image:base,mipmaps:[base,{width:2,height:2},{width:1,height:1}],
    generateMipmaps:false,minFilter:THREE.LinearMipmapLinearFilter,format:THREE.RGBAFormat,type:THREE.UnsignedByteType};
  const value=forestMemoryFootprint({legacyMeshes:[legacy],familyGeometries:[familyGeometry],familyMeshes:[batch],
    familyTextures:[texture,texture],embeddedImageFileBytes:13,farAtlasResidentBytes:1000});
  assert.equal(value.geometryCpuBytes,12+24+24);
  assert.equal(value.instanceCpuBytes,16*4+3*4+2*4+16*4+3*4);
  assert.equal(value.decodedTextureCpuBytes,(16+4+1)*4);
  assert.equal(value.gpuTextureEstimateBytes,(16+4+1)*4);
  assert.equal(value.embeddedImageFileBytes,13,'compressed source image bytes stay separate from decoded and GPU estimates');
  assert.equal(value.estimatedGpuBytes,value.geometryCpuBytes+value.instanceCpuBytes+value.gpuTextureEstimateBytes+1000);
  assert.equal(value.retainedCpuBytes,value.geometryCpuBytes+value.instanceCpuBytes+value.decodedTextureCpuBytes);
});
