import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,ws:false},appType:'custom'});
const {localAerialReference,localAerialGLSL,attachLocalAerial}=await vite.ssrLoadModule('/src/local-aerial-perspective.ts');
after(()=>vite.close());
test('zero distance and airless surfaces preserve close material response',()=>{
  const light=[.0001,.1,.5];
  assert.deepEqual(localAerialReference(light,0,1,0,1),light);
  assert.deepEqual(localAerialReference(light,50000,1,0,1,0),light);
});
test('shared aerial approximation reproduces previous terrain formula',()=>{
  for(const distance of [1,100,4000,65000])for(const altitude of [-50,0,3000,20000])for(const cosine of [-1,0,1]){
    const light=[.015,.06,.22],airFog=Math.min(.92,1-Math.exp(-distance/65000*Math.exp(-Math.max(0,(altitude+10)*.5)/14000)));
    const t=Math.max(0,Math.min(1,(cosine+.15)/.3)),day=t*t*(3-2*t);
    const target=[.02+(.23-.02)*day,.032+(.43-.032)*day,.055+(.64-.055)*day];
    const result=light.map((v,i)=>{const x=v*(1-airFog)+target[i]*airFog;return x*(1-airFog)+Math.max(x,[.007,.011,.018][i])*airFog;});
    localAerialReference(light,distance,altitude,10,cosine).forEach((v,i)=>assert.ok(Math.abs(v-result[i])<1e-14));
  }
});
test('instanced attachment composes existing shader modifications and uniform coordinate frame',()=>{
  const planet=new THREE.Group(),anchor=new THREE.Group(),mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshLambertMaterial(),1);
  const radius=6e6;planet.position.set(1e8,-2e8,3e8);planet.scale.setScalar(radius);anchor.position.set(0,0,1);planet.add(anchor);anchor.add(mesh);
  const sun={value:new THREE.Vector3(1,0,0)};mesh.material.onBeforeCompile=shader=>{shader.vertexShader='// previous modification\n'+shader.vertexShader;};
  const uniforms=attachLocalAerial(mesh,planet,radius,sun);
  const shader={uniforms:{},vertexShader:'#include <project_vertex>',fragmentShader:'#include <opaque_fragment>'};
  mesh.material.onBeforeCompile(shader,{});
  assert.ok(shader.vertexShader.includes('previous modification'));assert.ok(shader.vertexShader.includes('instanceMatrix*atlasAirLocalPosition'));
  assert.ok(shader.fragmentShader.includes(localAerialGLSL));assert.equal(shader.uniforms.atlasAirSun,sun);
  planet.updateMatrixWorld(true);
  const camera=new THREE.PerspectiveCamera();camera.position.copy(planet.localToWorld(new THREE.Vector3(0,0,1+100/radius)));camera.updateMatrixWorld(true);
  mesh.onBeforeRender({},new THREE.Scene(),camera,mesh.geometry,mesh.material,null);
  assert.ok(Math.abs(uniforms.atlasAirEyeHeight.value-100)<1e-5);assert.equal(uniforms.atlasAirMetresPerViewUnit.value,1);
  assert.ok(Math.abs(uniforms.atlasAirObjectToPlanet.value.elements[14]-1)<1e-12);
  assert.throws(()=>attachLocalAerial(mesh,planet,radius,sun),/already attached/);
  mesh.geometry.dispose();mesh.material.dispose();
});
