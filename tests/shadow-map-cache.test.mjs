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

test('an unchanged frame reuses the map; the first frame renders',()=>{
  const w=world();
  assert.equal(w.check(),false);assert.equal(w.cache.stats.lastReason,'first');
  assert.equal(w.check(),true);assert.equal(w.check(),true);
  assert.equal(w.cache.stats.hits,2);assert.equal(w.cache.stats.lastCasters,2,'inside box and unculled trees; outside box is culled');
});
test('caster transforms, geometry, instances, materials and depth uniforms invalidate',()=>{
  const cases=[
    ['caster moved',w=>w.inside.position.x+=.01],
    ['caster hidden',w=>w.inside.visible=false],
    ['parent hidden',w=>{const g=new THREE.Group();w.scene.add(g);g.add(w.inside);g.visible=false;}],
    ['castShadow off',w=>w.inside.castShadow=false],
    ['geometry attribute rewritten',w=>w.inside.geometry.attributes.position.needsUpdate=true],
    ['geometry swapped',w=>w.inside.geometry=new THREE.BoxGeometry(1,1,1)],
    ['draw range',w=>w.inside.geometry.setDrawRange(0,12)],
    ['instance matrices',w=>{w.trees.setMatrixAt(2,new THREE.Matrix4().makeTranslation(1,0,0));w.trees.instanceMatrix.needsUpdate=true;}],
    ['instance count',w=>w.trees.count=5],
    ['material side',w=>w.inside.material.side=THREE.DoubleSide],
    ['material shadowSide',w=>w.inside.material.shadowSide=THREE.BackSide],
    ['alpha test',w=>w.trees.material.alphaTest=.4],
    ['material map',w=>w.trees.material.map=new THREE.Texture()],
    ['depth uniform',w=>w.morph.value=.5],
    ['custom depth material',w=>w.inside.customDepthMaterial=new THREE.MeshDepthMaterial()],
    ['caster enters light frustum',w=>w.outside.position.set(3,0,0)],
    ['camera layers exclude caster',w=>{w.inside.layers.set(2);}],
  ];
  for(const [name,mutate] of cases){
    const w=world();w.check();assert.equal(w.check(),true,`${name}: settled`);
    mutate(w);assert.equal(w.check(),false,`${name}: must re-render`);
    assert.equal(w.cache.stats.lastReason,'casters',name);
    assert.equal(w.check(),true,`${name}: reused again once unchanged`);
  }
});
test('the light camera and map identity invalidate as light changes',()=>{
  for(const [name,mutate] of [
    ['sun moved',w=>w.light.position.x+=.001],
    ['target moved',w=>w.light.target.position.z+=.5],
    ['frustum resized',w=>{w.light.shadow.camera.left=-21;w.light.shadow.camera.updateProjectionMatrix();}],
    ['map reallocated',w=>w.light.shadow.map={texture:{id:9002},width:2048,height:2048}],
  ]){
    const w=world();w.check();assert.equal(w.check(),true);
    mutate(w);assert.equal(w.check(),false,name);assert.equal(w.cache.stats.lastReason,'light',name);
  }
});
test('changes Three would not draw into the map do not invalidate',()=>{
  for(const [name,mutate] of [
    ['culled caster moved',w=>w.outside.position.x+=5],
    ['receiver moved',w=>w.receiver.position.y+=1],
    ['hidden caster changed',w=>{w.inside.visible=false;w.check();w.inside.position.x+=3;}],
    ['main camera turned',w=>w.camera.rotation.y+=.3],
    ['colour-only uniform object',w=>w.inside.material.color.set(0xff0000)],
    ['instances rewritten with identical contents',w=>{for(let i=0;i<4;i++){const m=new THREE.Matrix4();w.trees.getMatrixAt(i,m);w.trees.setMatrixAt(i,m);}w.trees.instanceMatrix.needsUpdate=true;}],
    ['unused instance slot changed',w=>{w.trees.setMatrixAt(6,new THREE.Matrix4().makeTranslation(9,0,0));w.trees.instanceMatrix.needsUpdate=true;}],
  ]){
    const w=world();w.check();w.check();
    mutate(w);assert.equal(w.check(),true,name);
  }
});
test('uncacheable inputs and the disabled cache always render',()=>{
  const w=world();w.check();assert.equal(w.check(),true);
  w.inside.onBeforeShadow=()=>{};
  assert.equal(w.check(),false);assert.equal(w.cache.stats.lastReason,'uncacheable');assert.equal(w.check(),false);
  const v=world();v.check();v.cache.enabled=false;assert.equal(v.check(),false);assert.equal(v.cache.stats.lastReason,'disabled');
  const u=world();u.check();u.light.shadow.map=null;assert.equal(u.check(),false);assert.equal(u.cache.stats.lastReason,'uncacheable');
  const x=world();x.check();x.check();x.cache.invalidate();assert.equal(x.check(),false);assert.equal(x.cache.stats.lastReason,'first');
});
test('the signature is linear in caster count and cheap',()=>{
  const w=world();
  for(let i=0;i<600;i++){const m=new THREE.Mesh(w.inside.geometry,w.inside.material);m.castShadow=true;m.customDepthMaterial=w.depth;m.position.set((i%30)-15,0,Math.floor(i/30)-10);w.scene.add(m);}
  w.check();const t0=performance.now();for(let i=0;i<50;i++)w.check();const ms=(performance.now()-t0)/50;
  assert.equal(w.cache.stats.lastReason,'hit');
  assert.ok(ms<2,`signature ${ms.toFixed(3)} ms for ${w.cache.stats.lastCasters} casters`);
  console.log(`# signature ${ms.toFixed(3)} ms per frame for ${w.cache.stats.lastCasters} casters, ${w.cache.stats.lastLength} values`);
});
