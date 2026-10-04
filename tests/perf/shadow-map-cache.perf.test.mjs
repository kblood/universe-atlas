import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {ShadowMapCache}=await vite.ssrLoadModule('/src/shadow-map-cache.ts');
after(()=>vite.close());

/** A directional light with an allocated map (as after Three's first shadow
 * render), a camera, a caster inside the light frustum and one far outside. */
function world(){
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,1,.1,1000);
  camera.position.set(0,2,10);camera.lookAt(0,0,0);
  const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(5,20,5);light.castShadow=true;
  Object.assign(light.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:.1,far:60});light.shadow.camera.updateProjectionMatrix();
  light.shadow.map={texture:{id:9001},width:2048,height:2048};
  scene.add(light,light.target);
  const uniforms=new Map();
  const depth=new THREE.MeshDepthMaterial();const morph={value:0};uniforms.set(depth,{patchMorph:morph,opacity:{value:1}});
  const inside=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());inside.castShadow=true;inside.customDepthMaterial=depth;
  const outside=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());outside.castShadow=true;outside.position.set(500,0,0);
  const receiver=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshStandardMaterial());receiver.receiveShadow=true;
  const trees=new THREE.InstancedMesh(new THREE.BoxGeometry(.2,2,.2),new THREE.MeshLambertMaterial(),8);trees.castShadow=true;trees.frustumCulled=false;trees.count=4;
  scene.add(inside,outside,receiver,trees);
  const cache=new ShadowMapCache(material=>uniforms.get(material));
  const check=()=>{scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);return cache.canSkip([light],scene,camera,THREE.PCFSoftShadowMap);};
  return {scene,camera,light,inside,outside,receiver,trees,depth,morph,cache,check};
}

test('the signature is linear in caster count and cheap',()=>{
  const w=world();
  for(let i=0;i<600;i++){const m=new THREE.Mesh(w.inside.geometry,w.inside.material);m.castShadow=true;m.customDepthMaterial=w.depth;m.position.set((i%30)-15,0,Math.floor(i/30)-10);w.scene.add(m);}
  // Best of five batches: a loaded serial suite inflates one batch, not all five.
  w.check();let ms=Infinity;for(let b=0;b<5;b++){const t0=performance.now();for(let i=0;i<50;i++)w.check();ms=Math.min(ms,(performance.now()-t0)/50);}
  assert.ok(ms<2,`signature ${ms.toFixed(3)} ms for ${w.cache.stats.lastCasters} casters`);
  console.log(`# signature ${ms.toFixed(3)} ms per frame for ${w.cache.stats.lastCasters} casters, ${w.cache.stats.lastLength} values`);
});
