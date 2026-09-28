import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SurfaceLighting,SURFACE_SHADOW,SURFACE_GROUND_ALBEDO} from '../src/surface-lighting.ts';
import {terrainDepthMaterial,patchMorphHeader,patchMorphVertex,boundMorphedTerrain} from '../src/terrain-shadow.ts';
import {forestMaterial,forestDepthMaterial} from '../src/forest-material.ts';

const close=(a,b,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
function fixture(unit=1,offset=new THREE.Vector3()){
  const radiusM=6000000,planet=new THREE.Group();planet.scale.setScalar(radiusM*unit);planet.position.copy(offset);planet.updateMatrixWorld();
  const sun=new THREE.DirectionalLight('#ffecd0',3),ambient=new THREE.AmbientLight('#91b3cc',.22),lighting=new SurfaceLighting(sun,ambient);
  const frame={planet,radiusM,eye:new THREE.Vector3(0,(radiusM+10)*unit,0).add(offset),
    sun:new THREE.Vector3(.2,1,.3).normalize(),altitudeM:10,atmosphere:true,enabled:true,immersive:false};
  return {sun,ambient,lighting,frame};
}
test('shadow extent, depth and normal bias remain metres across renderer scales',()=>{
  for(const unit of [1e-6,.01,1,10]){
    const {sun,lighting,frame}=fixture(unit);const frustum=lighting.update(frame);
    assert.ok(frustum);close((sun.shadow.camera.right-sun.shadow.camera.left)/unit,SURFACE_SHADOW.widthM);
    close(sun.shadow.camera.far/unit,SURFACE_SHADOW.depthM);close(sun.shadow.normalBias/unit,SURFACE_SHADOW.normalBiasM);
    assert.ok(frustum.containsPoint(new THREE.Vector3(0,1,0)));
    assert.equal(frustum.containsPoint(new THREE.Vector3(0,-1,0)),false);
    const direction=sun.position.clone().sub(sun.target.position).normalize();close(direction.dot(frame.sun),1);
  }
});
test('scene rebasing preserves planet-relative shadow target and all frustum planes',()=>{
  const a=fixture(1),b=fixture(1,new THREE.Vector3(32120,-6100300,92652));
  a.lighting.update(a.frame);b.lighting.update(b.frame);
  const target=b.sun.target.position.clone().sub(b.frame.planet.position);
  close(target.distanceTo(a.sun.target.position),0,1e-6);
  for(let i=0;i<6;i++){
    const x=a.lighting.localFrustum.planes[i],y=b.lighting.localFrustum.planes[i];
    close(x.normal.distanceTo(y.normal),0);close(x.constant,y.constant);
  }
});
test('daylight gates sky fill and shadow; orbital, XR and basic paths restore baseline',()=>{
  const {lighting,frame,sun,ambient}=fixture();
  lighting.update(frame);assert.ok(lighting.sky.intensity>0);assert.ok(ambient.intensity<.22);
  for(const change of [{enabled:false},{immersive:true},{altitudeM:7000},{sun:new THREE.Vector3(0,-1,0)}]){
    assert.equal(lighting.update({...frame,...change}),null);assert.equal(sun.castShadow,false);
    assert.equal(lighting.sky.intensity,0);close(ambient.intensity,.22);
  }
  lighting.update({...frame,atmosphere:false});assert.equal(lighting.sky.intensity,0);assert.ok(sun.castShadow);
  sun.intensity=0;lighting.update(frame);assert.equal(sun.castShadow,false);assert.equal(lighting.sky.intensity,0);
  close(ambient.intensity,.22);
  lighting.disable();close(ambient.intensity,.22);
});
test('grazing light and altitude fade smoothly while retaining one fixed map allocation',()=>{
  const {lighting,frame,sun}=fixture();lighting.update(frame);const full=sun.shadow.intensity;
  lighting.update({...frame,altitudeM:500});assert.ok(sun.shadow.intensity>0&&sun.shadow.intensity<full);
  lighting.update({...frame,sun:new THREE.Vector3(1,.02,0).normalize()});assert.ok(sun.shadow.intensity>0&&sun.shadow.intensity<full);
  assert.deepEqual(sun.shadow.mapSize.toArray(),[2048,2048]);
});
test('depth uses the exact terrain morph and edge-lock expression used in colour',()=>{
  const morph={value:.5},edges={value:new THREE.Vector4(1,0,0,1)},material=terrainDepthMaterial(morph,edges,32);
  const shader={uniforms:{},...THREE.ShaderLib.depth};material.onBeforeCompile(shader,{});
  assert.ok(shader.vertexShader.startsWith(patchMorphHeader));assert.ok(shader.vertexShader.includes(patchMorphVertex));
  assert.equal(shader.uniforms.patchMorph,morph);assert.equal(shader.uniforms.patchEdges,edges);
  assert.equal(shader.uniforms.patchTexels.value,32);material.dispose();
});
test('terrain shadow/camera bound contains both ends of every morph',()=>{
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,1,1],3));
  geometry.setAttribute('parentPosition',new THREE.Float32BufferAttribute([-10,7,2,5,-3,9],3));
  boundMorphedTerrain(geometry);
  for(const name of ['position','parentPosition'])for(let i=0;i<2;i++)assert.ok(geometry.boundingSphere.containsPoint(new THREE.Vector3().fromBufferAttribute(geometry.getAttribute(name),i)));
  geometry.dispose();
});
test('legacy colour and depth discard identical hidden canonical slots',()=>{
  for(const [material,key] of [[forestMaterial(true),'lambert'],[forestDepthMaterial(),'depth']]){
    const shader={uniforms:{},...THREE.ShaderLib[key]};material.onBeforeCompile(shader,{});
    assert.ok(shader.vertexShader.includes('vForestCoverage=instanceCoverage;vForestSeed=instanceForestSeed;'));
    assert.ok(shader.fragmentShader.includes('if(atlasForestHash(uint(vForestSeed+.5))>=atlasForestLevel(vForestCoverage))discard;'));
    material.dispose();
  }
});
test('ground fill is sunlit ground albedo, so shaded undersides are not near black',()=>{
  const {lighting,frame,sun}=fixture();lighting.update(frame);
  const s=lighting.sky.intensity,cos=Math.max(0,frame.sun.y);
  // Irradiance on a downward-facing surface = albedo x irradiance reaching the ground.
  const reflected=lighting.sky.groundColor.clone().multiplyScalar(s);
  const expected=sun.color.clone().multiplyScalar(cos*sun.intensity).add(lighting.sky.color.clone().multiplyScalar(s)).multiply(SURFACE_GROUND_ALBEDO);
  for(const c of ['r','g','b'])close(reflected[c],expected[c],1e-9);
  // Midday bounce is several times the old fixed albedo-as-radiance fill.
  for(const c of ['r','g','b'])assert.ok(reflected[c]>3*SURFACE_GROUND_ALBEDO[c]*s,`${c} bounce`);
  // A lower sun reflects less; the sky colour itself is unchanged.
  const sky=lighting.sky.color.clone();
  lighting.update({...frame,sun:new THREE.Vector3(1,.25,0).normalize()});
  assert.ok(lighting.sky.groundColor.r*lighting.sky.intensity<reflected.r);
  assert.ok(lighting.sky.color.equals(sky));
  // Orbital/basic paths restore the plain albedo with zero intensity.
  lighting.disable();assert.equal(lighting.sky.intensity,0);assert.ok(lighting.sky.groundColor.equals(SURFACE_GROUND_ALBEDO));
});
