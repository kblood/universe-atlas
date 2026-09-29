import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {ShadowProgramWarmup}=await vite.ssrLoadModule('/src/shadow-program-warmup.ts');
after(()=>vite.close());

function rig(){
  const calls=[];const light=new THREE.DirectionalLight();light.castShadow=false;
  const renderer={shadowMap:{type:THREE.PCFSoftShadowMap},compileAsync(object){calls.push({object,casting:light.castShadow});return Promise.resolve();}};
  return {calls,light,renderer,warmup:new ShadowProgramWarmup(renderer,light),scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera()};
}
const tile=()=>{const m=new THREE.MeshStandardMaterial();m.customProgramCacheKey=()=>'planet-patch';return new THREE.Mesh(new THREE.BufferGeometry(),m);};

test('compiles with the sun casting, then restores the light exactly',()=>{
  const {calls,light,warmup,scene,camera}=rig();
  assert.equal(warmup.warm([tile()],camera,scene),1);
  assert.equal(calls.length,1);assert.equal(calls[0].casting,true);assert.equal(light.castShadow,false);
  light.castShadow=true;warmup.warm([new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshLambertMaterial())],camera,scene);
  assert.equal(light.castShadow,true);
});

test('one compile per program family, however many tiles share it',()=>{
  const {calls,warmup,scene,camera}=rig();
  warmup.warm([tile(),tile(),tile()],camera,scene);
  assert.equal(calls.length,1);
  assert.equal(warmup.warm([tile()],camera,scene),0);assert.equal(calls.length,1);
  // Instancing selects a different program; so does another material type.
  const group=new THREE.Group();group.add(new THREE.InstancedMesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial(),4));
  warmup.warm([tile(),group,new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshPhongMaterial())],camera,scene);
  assert.equal(calls.length,3);assert.equal(warmup.stats.families,3);
  warmup.reset();warmup.warm([tile()],camera,scene);assert.equal(calls.length,4);
});

test('a failing compile never leaves the light casting',()=>{
  const {light,scene,camera}=rig();
  const warmup=new ShadowProgramWarmup({shadowMap:{type:1},compileAsync(){throw new Error('lost context');}},light);
  assert.equal(warmup.warm([tile()],camera,scene),1);
  assert.equal(light.castShadow,false);assert.equal(warmup.stats.failures,1);
});
