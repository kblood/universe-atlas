import * as THREE from 'three';
import {FAUNA_PLANET_CRISP_GLSL} from '../src/fauna-planet-crisp.ts';
const data=await fetch('/test-results/animal-crisp-review/data.json').then(r=>r.json());
const renderer=new THREE.WebGLRenderer({antialias:false});renderer.setSize(8,8);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;document.body.append(renderer.domElement);
const target=new THREE.WebGLRenderTarget(8,8);target.texture.colorSpace=THREE.NoColorSpace;
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,10);camera.position.z=1;
const results=[];
for(const row of [...data.rows,...(data.patternProbes||[])]){const descriptor=row.descriptor||row.crispFull.crisp.descriptor;if(!descriptor)continue;
  for(const probe of row.probes){
    const material=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,toneMapped:false,uniforms:{
      p0:{value:new THREE.Vector3(...probe.c0)},p1:{value:new THREE.Vector3(...probe.c1)},p2:{value:new THREE.Vector3(...probe.c2)},ps:{value:new THREE.Vector4(...probe.sample)},pc:{value:probe.clip},
      coatSeed:{value:descriptor.seed},coatCells:{value:descriptor.cells},coatThreshold:{value:descriptor.threshold},coatWarp:{value:descriptor.warp},coatBellyLine:{value:descriptor.bellyLine},coatCanonicalFootprint:{value:descriptor.footprint}},
      vertexShader:'uniform vec3 p0,p1,p2;uniform vec4 ps;uniform float pc;out vec3 vCoatL0,vCoatL1,vCoatL2;out vec4 vCoatSample;out float vCoatClip;void main(){vCoatL0=p0;vCoatL1=p1;vCoatL2=p2;vCoatSample=ps;vCoatClip=pc;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`#define COAT_PATTERN ${descriptor.code}\n${FAUNA_PLANET_CRISP_GLSL.replace(/\bvarying\b/g,'in')}\nout vec4 resultColour;void main(){resultColour=vec4(composerCoatCrisp(),1.);}`});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);scene.add(mesh);renderer.setRenderTarget(target);renderer.render(scene,camera);const bytes=new Uint8Array(8*8*4);renderer.readRenderTargetPixels(target,0,0,8,8,bytes);
    const actual=Array.from(bytes.subarray((4*8+4)*4,(4*8+4)*4+3)),differences=actual.map((v,i)=>Math.abs(v-probe.expectedLinearRgbBytes[i]));
    results.push({id:row.id,vertex:probe.vertex,expected:probe.expectedLinearRgbBytes,actual,differences,maxDifference:Math.max(...differences)});scene.remove(mesh);mesh.geometry.dispose();material.dispose();
  }
}
window.__crispFieldProbe={results,maxDifference:Math.max(...results.map(r=>r.maxDifference)),scope:'constant context and basis across quad; derivatives zero, canonical footprint floor; linear no-lighting RGBA8 output'};
