import * as THREE from 'three';
import type {V3} from './catalog.ts';
import {acquireWaterNormalAtlas,releaseWaterNormalAtlas,WATER_NORMAL_ATLAS_METRES_PER_REPEAT} from './water-normal-atlas.ts';

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
  const normalAtlas=acquireWaterNormalAtlas();
  const uniforms={
    oceanRadiusM:{value:options.radiusM},oceanNormalAnchor:{value:vector(options.normalAnchorDir).clone().normalize()},oceanPhaseOriginM:{value:vector(options.phaseOriginM).clone()},
    patchMorph:options.patchMorph,patchEdges:options.patchEdges,patchTexels:typeof options.patchTexels==='number'?{value:options.patchTexels}:options.patchTexels,
    oceanEyeM:{value:new THREE.Vector3()},oceanSun:{value:new THREE.Vector3(1,0,0)},oceanTime:{value:0},oceanFlat:{value:0},oceanDepthDebug:{value:0},oceanNormalAtlas:{value:normalAtlas},oceanNormalRepeatM:{value:WATER_NORMAL_ATLAS_METRES_PER_REPEAT},
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
uniform vec3 oceanEyeM,oceanSun; uniform float oceanTime,oceanFlat,oceanDepthDebug,oceanNormalRepeatM; uniform sampler2D oceanNormalAtlas;
varying vec3 oceanNormalV,oceanLocalM; varying vec2 oceanPhaseM;
void main(){
  #include <logdepthbuf_fragment>
  if(oceanDepthDebug>.5){float d=clamp(length(oceanEyeM-oceanLocalM)/4000.0,0.0,1.0);gl_FragColor=vec4(vec3(d),1.0);return;}
  if(oceanFlat>.5){gl_FragColor=vec4(vec3(.025,.13,.20),1.0);return;}
  vec3 base=normalize(oceanNormalV); vec3 view=normalize(oceanEyeM-oceanLocalM); vec3 sun=normalize(oceanSun);
  float footprint=max(length(dFdx(oceanPhaseM)),length(dFdy(oceanPhaseM)));
  float fade=1.0-smoothstep(.30,4.5,footprint),microFade=1.0-smoothstep(.035,.45,footprint); float t=oceanTime;
  vec3 eastCandidate=cross(vec3(0.,1.,0.),base); float eastLength=length(eastCandidate); vec3 east=eastLength>.01?eastCandidate/eastLength:vec3(1.,0.,0.); vec3 north=normalize(cross(base,east));
  // Both atlas phases stay continuous in world metres. Their exact harmonic
  // scales repeat at the canonical/modulo 4096 m anchor period without a
  // fragment-space wrap, preserving derivatives for mip selection.
  vec2 wind=normalize(vec2(.73,.68)),sideWind=vec2(-wind.y,wind.x);
  vec2 atlasA=(oceanPhaseM+wind*t*.48+sideWind*11.0)/oceanNormalRepeatM;
  vec2 atlasB=(oceanPhaseM*.5-wind*t*.21+sideWind*29.0)/oceanNormalRepeatM;
  vec2 atlasMicro=(oceanPhaseM*8.0+wind*t*2.1+sideWind*3.7)/oceanNormalRepeatM;
  vec2 waves=(texture2D(oceanNormalAtlas,atlasA).xy*2.0-1.0)*.048*fade+(texture2D(oceanNormalAtlas,atlasB).xy*2.0-1.0)*.024*fade+(texture2D(oceanNormalAtlas,atlasMicro).xy*2.0-1.0)*.011*microFade;
  vec3 n=normalize(base+east*waves.x+north*waves.y); float fresnel=.020+.980*pow(1.0-max(0.0,dot(n,view)),5.0);
  float day=smoothstep(-.14,.08,dot(base,sun)); vec3 deep=vec3(.005,.030,.055),shallow=vec3(.020,.105,.135);
  vec3 sky=mix(vec3(.008,.018,.045),vec3(.18,.32,.47),day); float glint=pow(max(0.0,dot(reflect(-sun,n),view)),180.0)*day;
  gl_FragColor=vec4(mix(mix(shallow,deep,.78),sky,.025+.72*fresnel)+glint,1.0);
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
  let released=false;material.addEventListener('dispose',()=>{if(!released){released=true;releaseWaterNormalAtlas();}});
  return material;
}

export function setOceanWaterPatchFrame(material:OceanWaterMaterial,frame:OceanWaterPatchFrame){material.setFrame(frame);}
export function setOceanWaterDebug(material:OceanWaterMaterial,debug:OceanWaterDebug){material.setDebug(debug);}
