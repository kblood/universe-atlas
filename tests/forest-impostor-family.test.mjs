import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ForestImpostors} from '../src/forest-impostor.ts';
import {packForestPresentation} from '../src/forest-presentation.ts';

function presentation(){return {enabled:true,lod1Profile:{referenceHeightM:16,maxLeafOffsetM:.8,
  bands:Array.from({length:4},(_,i)=>({centerM:[.1,2+i*4,-.1],radiusM:3-i*.5,halfHeightM:1.8,populated:i>0}))},
  conservativeBounds:{radiusM:26},barkLinearRgb:[.12,.08,.05],foliageLinearRgb:[.025,.085,.014]};}

test('family profile updates uniforms and packed appearance updates only the existing parameter channel',()=>{
  const f=new ForestImpostors(128);
  try{
    f.write(1,new THREE.Vector3(10,20,30),16,new THREE.Quaternion(),.3,120);f.commit();
    const before=[f.positions.version,f.rotations.version,f.ownership.version];
    f.setFamilyPresentation('branching',presentation());
    assert.equal(f.uniforms.treeFamilyBounds.value.x,26);
    assert.equal(f.uniforms.treeFamilyBands.value[0].w,-1,'empty band never draws');
    assert.deepEqual(f.uniforms.treeFamilyBands.value[2].toArray(),[.1,10,-.1,2]);
    assert.deepEqual(f.uniforms.treeFamilyBandExtent.value[2].toArray(),[1.8,.8]);
    const code=packForestPresentation('branching',.95,1.08);
    f.setPresentation(1,code);assert.equal(f.commit(),64*16);
    assert.equal(f.parameters.getZ(1),code);assert.equal(f.familyBoundRadius(1),26);
    assert.deepEqual([f.positions.version,f.rotations.version,f.ownership.version],before);
    f.setPresentation(1,code);assert.equal(f.commit(),0);
    f.setFamilyPresentation('branching',null);assert.equal(f.familyBoundRadius(1),0);
    assert.equal(f.parameters.getZ(1),code,'disabled family falls back through a uniform without clearing every slot');
    f.write(1,new THREE.Vector3(),16,new THREE.Quaternion(),.3,120);assert.equal(f.parameters.getZ(1),0,'reused slot clears old appearance');
    for(const slot of [-1,.5,128,NaN])assert.throws(()=>f.setPresentation(slot,0));
    for(const code of [3,Infinity,262143])assert.throws(()=>f.setPresentation(1,code));
  }finally{f.dispose();}
});

test('invalid profile is rejected before changing the active family uniforms',()=>{
  const f=new ForestImpostors(8);
  try{
    f.setFamilyPresentation('spire',presentation());
    for(const mutate of [p=>p.lod1Profile.referenceHeightM=12,p=>p.lod1Profile.bands[1].radiusM=-1,
      p=>p.conservativeBounds.radiusM=NaN,p=>p.foliageLinearRgb[0]=Infinity]){
      const p=presentation();mutate(p);assert.throws(()=>f.setFamilyPresentation('spire',p));
      assert.equal(f.uniforms.treeFamilyBounds.value.y,26);
    }
  }finally{f.dispose();}
});

test('Lambert shader composes family shape, linear color and conservative bounds with legacy fallback',()=>{
  const f=new ForestImpostors(8);
  try{
    const shader={uniforms:{},vertexShader:THREE.ShaderLib.lambert.vertexShader,fragmentShader:THREE.ShaderLib.lambert.fragmentShader};
    f.mesh.material.onBeforeCompile(shader,{capabilities:{logarithmicDepthBuffer:true,reversedDepthBuffer:false}});
    for(const source of [shader.vertexShader,shader.fragmentShader]){
      assert.equal((source.match(/float familyCode=forestFamilyCode\(treeData.z\);/g)||[]).length,1);
      assert.match(source,/uniform vec4 treeFamilyBands\[8\]/);
    }
    assert.match(shader.vertexShader,/familyBound>0.0\?vec3\(familyBound\)/);
    assert.match(shader.fragmentShader,/treeFamilyCone\(ro,rd,band.xyz\/16.0/);
    assert.match(shader.fragmentShader,/float numerator=1\.0-dot\(n,o\)/,'integer cone plane distances are emitted as GLSL floats');
    assert.doesNotMatch(shader.fragmentShader,/float numerator=-?\d+-dot\(n,o\)/);
    assert.match(shader.fragmentShader,/treeFamilyFoliage\[familyIndex\]\*brightness.y/);
    assert.match(shader.fragmentShader,/familyBound\/treeRootHeight.w/,'ray shift uses the family bound');
    assert.ok(!shader.fragmentShader.includes('baseCoverage'),'atlas occupancy is not treated as tree opacity');
    assert.match(f.mesh.material.customProgramCacheKey(),/forest-presentation-1/);
  }finally{f.dispose();}
});
