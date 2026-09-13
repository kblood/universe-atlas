import * as THREE from 'three';
import type {V3} from './catalog.ts';

type ScalarUniform={value:number};
type VectorUniform={value:THREE.Vector4};
export type OceanWaterDebug={freezeWater?:boolean;flat?:boolean;depth?:boolean};
export type OceanWaterPatchOptions={
  radiusM:number;
  normalAnchorDir:V3|THREE.Vector3;
  phaseOriginM:V3|THREE.Vector3;
  /** References owned by the terrain patch, so ocean and bed share morph state. */
  patchMorph:ScalarUniform;
  patchEdges:VectorUniform;
  patchTexels:ScalarUniform|number;
};
export type OceanWaterPatchFrame={localEyeM:V3|THREE.Vector3;sunDirection:V3|THREE.Vector3;timeSeconds?:number};
export type OceanWaterMaterial=THREE.ShaderMaterial & {setDebug:(debug:OceanWaterDebug)=>void;setFrame:(frame:OceanWaterPatchFrame)=>void};

const vector=(value:V3|THREE.Vector3)=>value instanceof THREE.Vector3?value:new THREE.Vector3(...value);

/**
 * Material for one terrain-grid ocean patch. Its position and parentPosition
 * attributes are sea-level, anchor-relative copies of the terrain grid and
 * deliberately exclude terrain skirts. There is no height/displacement bias.
 */
export function createOceanWaterMaterial(options:OceanWaterPatchOptions):OceanWaterMaterial{
  let frozenTime=0,freezeWater=false;
  const uniforms={
    oceanRadiusM:{value:options.radiusM},oceanNormalAnchor:{value:vector(options.normalAnchorDir).clone().normalize()},oceanPhaseOriginM:{value:vector(options.phaseOriginM).clone()},
    patchMorph:options.patchMorph,patchEdges:options.patchEdges,patchTexels:typeof options.patchTexels==='number'?{value:options.patchTexels}:options.patchTexels,
    oceanEyeM:{value:new THREE.Vector3()},oceanSun:{value:new THREE.Vector3(1,0,0)},oceanTime:{value:0},oceanFlat:{value:0},oceanDepthDebug:{value:0},
  };
  const material=new THREE.ShaderMaterial({
    uniforms,
    vertexShader:`#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 parentPosition;
uniform float patchMorph,patchTexels,oceanRadiusM; uniform vec4 patchEdges; uniform vec3 oceanNormalAnchor,oceanPhaseOriginM;
varying vec3 oceanNormalV,oceanLocalM; varying vec2 oceanPhaseM;
void main(){
  vec2 gridUV=(uv*(patchTexels+2.0)-1.0)/patchTexels;
  float lockEdge=max(max((1.0-step(.00001,gridUV.x))*patchEdges.x,step(.99999,gridUV.x)*patchEdges.y),max((1.0-step(.00001,gridUV.y))*patchEdges.z,step(.99999,gridUV.y)*patchEdges.w));
  // This is byte-for-byte the terrain patch interpolation. Do not normalize
  // or radially move it: those operations break shared LOD seams.
  vec3 transformed=mix(parentPosition,position,patchMorph*(1.0-lockEdge));
  oceanNormalV=normalize(oceanNormalAnchor+transformed);
  oceanLocalM=transformed*oceanRadiusM;
  oceanPhaseM=oceanLocalM.xz+oceanPhaseOriginM.xz;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(transformed,1.0);
  #include <logdepthbuf_vertex>
}`,
    fragmentShader:`// oceanWater marker: renderer diagnostics classify this surface.
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 oceanEyeM,oceanSun; uniform float oceanTime,oceanFlat,oceanDepthDebug;
varying vec3 oceanNormalV,oceanLocalM; varying vec2 oceanPhaseM;
void main(){
  #include <logdepthbuf_fragment>
  if(oceanDepthDebug>.5){float d=clamp(length(oceanEyeM-oceanLocalM)/4000.0,0.0,1.0);gl_FragColor=vec4(vec3(d),1.0);return;}
  if(oceanFlat>.5){gl_FragColor=vec4(vec3(.025,.13,.20),1.0);return;}
  vec3 base=normalize(oceanNormalV); vec3 view=normalize(oceanEyeM-oceanLocalM); vec3 sun=normalize(oceanSun);
  float footprint=max(length(dFdx(oceanPhaseM)),length(dFdy(oceanPhaseM)));
  float fade=1.0-smoothstep(.15,1.2,footprint); float t=oceanTime*.18;
  // detailOrigin is modulo 4096 m. Integer wave vectors times TAU/4096
  // preserve phase at every local-anchor wrap and across neighbouring tiles.
  float wx=(sin(dot(oceanPhaseM,vec2(.02607767,.01687379))-t)+sin(dot(oceanPhaseM,vec2(.06596117,-.04755340))+t*.7))*.018*fade;
  float wz=(sin(dot(oceanPhaseM,vec2(.01994175,-.02914563))+t*.8)+sin(dot(oceanPhaseM,vec2(.05675729,.03528156))-t*.4))*.014*fade;
  vec3 eastCandidate=cross(vec3(0.,1.,0.),base); float eastLength=length(eastCandidate); vec3 east=eastLength>.01?eastCandidate/eastLength:vec3(1.,0.,0.); vec3 north=normalize(cross(base,east));
  vec3 n=normalize(base+east*wx+north*wz); float fresnel=pow(1.0-max(0.0,dot(n,view)),5.0);
  float day=smoothstep(-.14,.08,dot(base,sun)); vec3 water=mix(vec3(.006,.035,.065),vec3(.025,.13,.19),day);
  vec3 sky=mix(vec3(.008,.018,.045),vec3(.18,.32,.47),day); float glint=pow(max(0.0,dot(reflect(-sun,n),view)),180.0)*day;
  gl_FragColor=vec4(mix(water,sky,.08+.72*fresnel)+glint,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
    side:THREE.FrontSide,depthWrite:true,transparent:false,toneMapped:true,
  }) as OceanWaterMaterial;
  material.setDebug=(debug={})=>{
    if(debug.freezeWater&&!freezeWater)frozenTime=uniforms.oceanTime.value;
    freezeWater=!!debug.freezeWater;
    uniforms.oceanFlat.value=debug.flat?1:0;uniforms.oceanDepthDebug.value=debug.depth?1:0;
  };
  material.setFrame=frame=>{
    uniforms.oceanEyeM.value.copy(vector(frame.localEyeM));uniforms.oceanSun.value.copy(vector(frame.sunDirection));
    if(frame.timeSeconds!==undefined&&!freezeWater)uniforms.oceanTime.value=frame.timeSeconds;
    else if(freezeWater)uniforms.oceanTime.value=frozenTime;
  };
  return material;
}

export function setOceanWaterPatchFrame(material:OceanWaterMaterial,frame:OceanWaterPatchFrame){material.setFrame(frame);}
export function setOceanWaterDebug(material:OceanWaterMaterial,debug:OceanWaterDebug){material.setDebug(debug);}
