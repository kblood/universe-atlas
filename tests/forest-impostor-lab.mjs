import * as THREE from 'three';
import {ForestImpostors} from '../src/forest-impostor.ts';
import {createLegacyTreeGeometry} from '../src/tree-shape.ts';

const renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,logarithmicDepthBuffer:true,preserveDrawingBuffer:true});
renderer.setSize(512,512);renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
document.body.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-12,12,12,-12,.1,1000);
const perspectiveCamera=new THREE.PerspectiveCamera(50,1,.1,10000);
const geometry=createLegacyTreeGeometry(0),material=new THREE.MeshBasicMaterial({color:0xffffff});
const reference=new THREE.Mesh(geometry,material);reference.scale.setScalar(16);scene.add(reference);
const far=new ForestImpostors(1);far.write(0,new THREE.Vector3(),16,new THREE.Quaternion(),.5,0);far.commit();
far.uniforms.treeMaskOnly.value=1;far.mesh.material.toneMapped=false;scene.add(far.mesh);
far.uniforms.treeEdgeAA.value=0;
const target=new THREE.WebGLRenderTarget(512,512,{format:THREE.RGBAFormat,type:THREE.UnsignedByteType,depthBuffer:true});
const pixels=new Uint8Array(512*512*4);
const poses=Array.from({length:64},(_,i)=>{const y=1-2*(i+.5)/64,p=i*2.399963229728653,r=Math.sqrt(1-y*y);return [Math.cos(p)*r,y,Math.sin(p)*r];});
function render(useFar,pose,scale=1,inflation=1){
  reference.visible=!useFar;far.mesh.visible=useFar;far.uniforms.treeRadiusScale.value=scale;far.uniforms.treeBoundInflation.value=inflation;
  camera.position.set(...pose).multiplyScalar(100).add(new THREE.Vector3(0,8,0));camera.up.set(0,1,0);camera.lookAt(0,8,0);camera.updateMatrixWorld();
  renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,512,512,pixels);renderer.setRenderTarget(null);
  let area=0;for(let i=0;i<pixels.length;i+=4)area+=pixels[i]/255;return area;
}
const referenceAreas=poses.map(p=>render(false,p));
function compare(scale,inflation=1){const areas=poses.map(p=>render(true,p,scale,inflation));return {scale,areas,ratios:areas.map((a,i)=>a/referenceAreas[i])};}
function mask(){return Uint8Array.from({length:512*512},(_,i)=>pixels[i*4+3]>0?1:0);}
function maskDifference(a,b){
  let changed=0,interior=0;
  for(let i=0;i<a.length;i++)if(a[i]!==b[i]){
    changed++;const x=i%512,y=Math.floor(i/512);let edge=false;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      if(x+dx<0||x+dx>=512||y+dy<0||y+dy>=512)continue;
      const j=i+dy*512+dx;if(a[j]!==a[i]||b[j]!==b[i])edge=true;
    }
    if(!edge)interior++;
  }
  return {changed,interior};
}
function verifyMasks(){return poses.map(p=>{
  render(false,p);const referenceMask=mask();render(true,p);const normal=mask();render(true,p,1,2);const inflated=mask();
  return {reference:maskDifference(referenceMask,normal),bounds:maskDifference(normal,inflated)};
});}
function verifyDepthAndPerspective(viewUnitsPerMetre=1){
  const results=[],plane=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.MeshBasicMaterial({color:0,side:THREE.DoubleSide}));
  scene.scale.setScalar(viewUnitsPerMetre);
  perspectiveCamera.near=.1*viewUnitsPerMetre;perspectiveCamera.far=10000*viewUnitsPerMetre;perspectiveCamera.updateProjectionMatrix();
  const redMask=()=>Uint8Array.from({length:512*512},(_,i)=>pixels[i*4]>128?1:0);
  scene.add(plane);far.uniforms.treeRadiusScale.value=1;
  for(const distance of [24,64,650,4000])for(const pose of [[1,.4,2],[0,1,0],[0,-1,0]])for(const occlude of [false,true]){
    const aim=new THREE.Vector3(0,8,0),direction=new THREE.Vector3(...pose).normalize();
    perspectiveCamera.position.copy(direction).multiplyScalar(distance).add(aim).multiplyScalar(viewUnitsPerMetre);perspectiveCamera.lookAt(aim.clone().multiplyScalar(viewUnitsPerMetre));perspectiveCamera.updateMatrixWorld();
    plane.visible=occlude;plane.position.copy(aim);plane.quaternion.copy(perspectiveCamera.quaternion);
    const masks=[];
    for(const [useFar,inflation] of [[false,1],[true,1],[true,2]]){
      reference.visible=!useFar;far.mesh.visible=useFar;far.uniforms.treeBoundInflation.value=inflation;
      renderer.setRenderTarget(target);renderer.render(scene,perspectiveCamera);renderer.readRenderTargetPixels(target,0,0,512,512,pixels);renderer.setRenderTarget(null);masks.push(redMask());
    }
    results.push({distance,viewUnitsPerMetre,pose,occlude,referencePixels:masks[0].reduce((s,x)=>s+x,0),reference:maskDifference(masks[0],masks[1]),bounds:maskDifference(masks[1],masks[2])});
  }
  scene.scale.setScalar(1);perspectiveCamera.near=.1;perspectiveCamera.far=10000;perspectiveCamera.updateProjectionMatrix();
  plane.removeFromParent();plane.geometry.dispose();plane.material.dispose();return results;
}
function verifyAntialiasing(){
  const results=[];far.uniforms.treeEdgeAA.value=1;
  for(const samples of [0,2,4]){
    target.dispose();target.samples=samples;
    const reference=poses.map(p=>render(false,p)),proxy=poses.map(p=>render(true,p));
    results.push({samples,enabled:far.uniforms.treeSampleAA.value,maxRelativeAreaError:Math.max(...proxy.map((a,i)=>Math.abs(a/reference[i]-1)))});
  }
  target.dispose();target.samples=0;far.uniforms.treeEdgeAA.value=0;return results;
}
async function verifyOwnership(){
  // Compile the actual game near material, including its Uint16 seed path.
  const {PlanetForest}=await import('../src/planet-forest.ts');
  const {galaxies,refByAddress,system}=await import('../src/catalog.ts');
  const body=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')).planets[1];
  const forest=new PlanetForest(body),nearMaterial=forest.meshes[1].material;
  const compile=nearMaterial.onBeforeCompile;
  nearMaterial.onBeforeCompile=(shader,r)=>{compile.call(nearMaterial,shader,r);shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight=vec3(1.0);\n#include <opaque_fragment>');};
  nearMaterial.toneMapped=false;
  const nearGeometry=createLegacyTreeGeometry(0),coverage=new THREE.InstancedBufferAttribute(new Float32Array([1]),1);
  nearGeometry.setAttribute('instanceCoverage',coverage);
  nearGeometry.setAttribute('instanceForestSeed',new THREE.InstancedBufferAttribute(new Uint16Array([128]),1));
  const near=new THREE.InstancedMesh(nearGeometry,nearMaterial,1);near.setMatrixAt(0,new THREE.Matrix4().makeScale(16,16,16));near.setColorAt(0,new THREE.Color(1,1,1));scene.add(near);
  const results=[];
  try{
    near.visible=false;render(false,[1,.4,2]);const full=mask();
    reference.visible=false;far.mesh.visible=true;near.visible=true;
    for(const level of [0,1,64,128,255,256]){
      coverage.array[0]=level/256;coverage.needsUpdate=true;far.setOwnership(0,level);far.commit();
      renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,512,512,pixels);renderer.setRenderTarget(null);
      results.push({level,...maskDifference(full,mask())});
    }
  }finally{near.removeFromParent();nearGeometry.dispose();forest.dispose();far.setOwnership(0,0);far.commit();}
  return results;
}
const light=new THREE.DirectionalLight(0xffffff,2),ambient=new THREE.AmbientLight(0xffffff,.5);
light.position.set(20,30,40);scene.add(light,ambient);
const litMaterial=new THREE.MeshLambertMaterial({vertexColors:true,color:new THREE.Color(.9,.925,.875),toneMapped:false});
window.impostorLab={renderer,scene,camera,reference,far,target,poses,referenceAreas,render,compare,
  verifyMasks,verifyDepthAndPerspective,verifyAntialiasing,verifyOwnership,
  show(useFar,pose=[1,.4,2],scale=1,lit=false){reference.material=lit?litMaterial:material;far.uniforms.treeMaskOnly.value=lit?0:1;reference.visible=!useFar;far.mesh.visible=useFar;far.uniforms.treeRadiusScale.value=scale;far.uniforms.treeBoundInflation.value=1;
    camera.position.set(...pose).normalize().multiplyScalar(100).add(new THREE.Vector3(0,8,0));camera.lookAt(0,8,0);camera.updateMatrixWorld();renderer.setRenderTarget(null);renderer.render(scene,camera);},
  dispose(){far.dispose();geometry.dispose();material.dispose();litMaterial.dispose();target.dispose();renderer.dispose();},
};
window.labReady=true;
