import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FaunaFieldRenderer,FAUNA_FIELD_COVERAGE_VERSION} from '../src/fauna-field-renderer.ts';
import {generateCreatureGenome} from '../src/creature-model.ts';
const genome=generateCreatureGenome('FALLBACK-COVERAGE','runner'),matrix=new THREE.Matrix4(),origin=new THREE.Vector3();
function pose(field,key,coverage){field.beginFrame(origin);field.submit(genome,matrix,2,'walk',50,key,.7,coverage);field.endFrame();}
const geometry=field=>field.meshes.map(m=>({count:m.count,matrices:m.instanceMatrix.array.slice(),colors:m.instanceColor?.array.slice(),attributes:Object.keys(m.geometry.attributes),index:m.geometry.index.array.slice()}));

test('default fallback has exact previous buffers/shader and opt-in coverage leaves geometry/pose lanes unchanged',()=>{
  const legacy=new FaunaFieldRenderer({bodyPlan:true}),explicit=new FaunaFieldRenderer({bodyPlan:true,complementaryCoverage:false}),enabled=new FaunaFieldRenderer({bodyPlan:true,complementaryCoverage:true});
  try{
    pose(legacy,{},1);pose(explicit,{},1);pose(enabled,{},1);
    assert.deepEqual(geometry(legacy),geometry(explicit));
    for(let i=0;i<4;i++){
      const a=legacy.meshes[i],b=enabled.meshes[i];assert.equal(a.material.alphaHash,false);assert.equal(a.customDepthMaterial,undefined);assert.equal(a.geometry.hasAttribute('instanceFaunaCoverage'),false);
      assert.deepEqual(a.instanceMatrix.array,b.instanceMatrix.array);assert.deepEqual(a.instanceColor.array,b.instanceColor.array);assert.deepEqual(a.geometry.index.array,b.geometry.index.array);
      assert.equal(b.material.alphaHash,true);assert.equal(b.customDepthMaterial.alphaHash,true);
    }
    const channelBytes=enabled.meshes.reduce((n,m)=>n+m.geometry.getAttribute('instanceFaunaCoverage').array.byteLength,0);assert.equal(enabled.allocatedBytes-legacy.allocatedBytes,channelBytes*2,'CPU/GPU coverage storage is accounted');
  }finally{legacy.dispose();explicit.dispose();enabled.dispose();}
});

test('paused replay writes current per-animal coverage instead of retaining its recorded coverage',()=>{
  const field=new FaunaFieldRenderer({bodyPlan:true,complementaryCoverage:true}),key={};
  try{
    pose(field,key,1);pose(field,key,.8);const before=geometry(field);pose(field,key,.25);
    assert.deepEqual(geometry(field),before);
    for(const mesh of field.meshes){const attribute=mesh.geometry.getAttribute('instanceFaunaCoverage');assert.ok(Array.from(attribute.array.slice(0,mesh.count)).every(x=>x===.25));}
    pose(field,key,0);assert.equal(field.meshes.reduce((n,m)=>n+m.count,0),0);
    assert.throws(()=>pose(field,key,NaN),/finite/);
  }finally{field.dispose();}
});

test('colour and shadow programs consume the same alpha-hash coverage and owned depth materials dispose',()=>{
  const field=new FaunaFieldRenderer({complementaryCoverage:true});let depthDisposes=0;
  try{
    for(const mesh of field.meshes){
      mesh.customDepthMaterial.addEventListener('dispose',()=>depthDisposes++);
      for(const [material,template] of [[mesh.material,THREE.ShaderLib.standard],[mesh.customDepthMaterial,THREE.ShaderLib.depth]]){
        const shader={vertexShader:template.vertexShader,fragmentShader:template.fragmentShader,uniforms:{}};material.onBeforeCompile(shader,{});
        assert.ok(shader.vertexShader.includes('vFaunaCoverage=instanceFaunaCoverage;'));assert.ok(shader.fragmentShader.includes('diffuseColor.a *= vFaunaCoverage;'));
        assert.ok(material.customProgramCacheKey().includes(FAUNA_FIELD_COVERAGE_VERSION));assert.equal((shader.fragmentShader.match(/diffuseColor.a \*= vFaunaCoverage;/g)||[]).length,1);
      }
    }
  }finally{field.dispose();}
  assert.equal(depthDisposes,4);
});
