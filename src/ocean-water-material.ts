import * as THREE from 'three';
import type {V3} from './catalog.ts';
import {acquireWaterNormalAtlas,releaseWaterNormalAtlas,WATER_NORMAL_ATLAS_METRES_PER_REPEAT} from './water-normal-atlas.ts';
import {generateOceanWaveField,hashSeedString,maxOceanWaveAmplitudeM,oceanGerstnerVertexGLSL,oceanWavePhaseOffsets,oceanWaveUniformArrays,OCEAN_GERSTNER_WAVE_COUNT,OCEAN_TIME_WRAP_PERIOD_S,type GerstnerWave,type OceanPhaseS} from './ocean-gerstner.ts';

type ScalarUniform={value:number};
type VectorUniform={value:THREE.Vector4};
export type OceanWaterDebug={freezeWater?:boolean;flat?:boolean;depth?:boolean};
export type OceanWaterPatchOptions={
  radiusM:number;
  normalAnchorDir:V3|THREE.Vector3;
  /** Planar phase origin in metres: the patch anchor wrapped modulo
   * DETAIL_PERIOD_M (ground-material.ts's detailOrigin) for float32 precision.
   * The normal-atlas ripples are exactly periodic in that wrap. */
  phaseOriginM:V3|THREE.Vector3;
  /** Unwrapped anchor in metres (anchor * radiusM). The Gerstner waves are
   * not periodic in the wrap, so each wave gets a phase offset for
   * `waveOriginM - phaseOriginM` (see oceanWavePhaseOffsets). Omitted means
   * phaseOriginM is already unwrapped (offsets zero); a patch whose origin
   * is wrapped must pass it, or neighbouring patches in different wrap cells
   * show a seam (docs/ocean-seam-2026-09-29.md). */
  waveOriginM?:V3|THREE.Vector3;
  /** References owned by the terrain patch, so ocean and bed share morph state. */
  patchMorph:ScalarUniform;
  patchEdges:VectorUniform;
  patchTexels:ScalarUniform|number;
  /**
   * Deterministic per-body Gerstner wave seed (see ocean-gerstner.ts's
   * hashSeedString) -- combine the body's catalogue seed and address/id
   * (e.g. `hashSeedString(body.seed+'/'+body.id)`) so distinct planets get
   * distinct, stable seas. When omitted this falls back to a seed derived
   * only from radiusM: still fully deterministic, but the SAME sea shape on
   * every ocean of that radius rather than one unique per body. The current
   * planet-renderer.ts call site does not pass this yet -- see this port's
   * report for the exact one-line addition needed there.
   */
  waveSeed?:number;
  waveCount?:number;
  /** Shared by every ocean patch of a body: x = vertex spacing per metre of
   * eye distance, y = spacing floor (m); see ocean-gerstner.ts
   * oceanWaveSpacingM. Zero (the default) keeps every wave at every distance. */
  waveSpacing?:{value:THREE.Vector2};
  /** Upper bound of this patch's own vertex spacing (m): the tile's cube span
   * x radius / PATCH_SEGMENTS (the cube-to-sphere map is 1-Lipschitz). It
   * makes the fade an exact Nyquist bound whatever the selection did (budget
   * pressure keeps leaves coarser than the distance estimate). 0 = unused. */
  patchSpacingM?:number;
  /** Per edge (x: u=0, y: u=1, z: v=0, w: v=1, patchEdges' order): the larger
   * of this patch's and the neighbouring leaf's spacing bound, applied on that
   * edge's vertex row. Both sides of a 2:1 or 4:1 edge then use the coarse
   * value there, so the patch term adds no seam. Owned by the patch; the
   * renderer sets it when the frontier changes. Default: zeros (own only). */
  edgeSpacing?:{value:THREE.Vector4};
  /** Shared underwater state (atlasWater in OCEAN_UNDERWATER_GLSL): x = 1
   * while the eye is submerged, y = eye depth (m), z = dated sea level (m). */
  underwater?:{value:THREE.Vector4};
  /** Vertices of the shared base grid. Vertices at or past this index are the
   * skirt copies from oceanSkirtBuffers: they are not displaced, so they hang
   * below the displaced edge (default: no skirt vertices). */
  baseVertices?:number;
};
export type OceanWaterPatchFrame={localEyeM:V3|THREE.Vector3;sunDirection:V3|THREE.Vector3;oceanPhaseS?:OceanPhaseS};

export const OCEAN_UNDERWATER_VERSION='ocean-underwater-1';
/** Underwater medium constants (linear radiance, metres). Presentation, not a
 * radiative-transfer model: per-channel absorption with a compressed depth so
 * a kilometres-deep floor stays readable as dim blue water, not black. */
export const OCEAN_UNDERWATER={
  /** In-scatter visibility: path length at which the green channel keeps 1/e. */
  visibilityM:1400,
  /** Per-channel path extinction relative to visibilityM (red is lost first). */
  pathExtinction:[2.2,1,.75] as const,
  /** Daylight reaching depth d sees an effective depth S*(1-exp(-d/S)). */
  absorbScaleM:150,
  absorbPerM:[.045,.016,.009] as const,
  /** Water colour near the lit surface and in the deep, and its depth scale. */
  shallow:[.030,.170,.210] as const,
  deep:[.006,.030,.050] as const,
  lightDepthM:250,
  /** Fraction of the water colour kept at night. */
  nightFloor:.25,
};
const g3=(v:readonly number[])=>`vec3(${v.map(x=>x.toFixed(4)).join(',')})`;
/** GLSL for the underwater medium, shared by the ocean surface (seen from
 * below) and the terrain/seabed shader. `water` is the atlasWater uniform. */
export const OCEAN_UNDERWATER_GLSL=`
vec3 atlasWaterColour(float depthM,float day){
  return mix(${g3(OCEAN_UNDERWATER.deep)},${g3(OCEAN_UNDERWATER.shallow)},exp(-max(depthM,0.0)/${OCEAN_UNDERWATER.lightDepthM.toFixed(1)}))*mix(${OCEAN_UNDERWATER.nightFloor.toFixed(3)},1.0,day);
}
vec3 atlasApplyUnderwater(vec3 radiance,float pathM,float surfaceDepthM,float sunCosine,vec4 water){
  if(water.x<.5)return radiance;
  float day=smoothstep(-.12,.10,sunCosine);
  float lightDepth=${OCEAN_UNDERWATER.absorbScaleM.toFixed(1)}*(1.0-exp(-max(surfaceDepthM,0.0)/${OCEAN_UNDERWATER.absorbScaleM.toFixed(1)}));
  vec3 transmitted=exp(-${g3(OCEAN_UNDERWATER.absorbPerM)}*lightDepth);
  vec3 path=exp(-${g3(OCEAN_UNDERWATER.pathExtinction)}*max(pathM,0.0)/${OCEAN_UNDERWATER.visibilityM.toFixed(1)});
  vec3 scatter=atlasWaterColour(.5*(max(water.y,0.0)+max(surfaceDepthM,0.0)),day);
  return radiance*transmitted*path+scatter*(1.0-path);
}
`;
/** Exact JS twin of atlasApplyUnderwater (tests and probes). */
export function underwaterReference(radiance:readonly number[],pathM:number,surfaceDepthM:number,sunCosine:number,water:readonly number[]){
  if(water[0]!<.5)return [...radiance];
  const u=OCEAN_UNDERWATER,t=Math.min(1,Math.max(0,(sunCosine+.12)/.22)),day=t*t*(3-2*t);
  const S=u.absorbScaleM,lightDepth=S*(1-Math.exp(-Math.max(surfaceDepthM,0)/S));
  const mid=.5*(Math.max(water[1]!,0)+Math.max(surfaceDepthM,0)),shade=u.nightFloor+(1-u.nightFloor)*day,blend=Math.exp(-mid/u.lightDepthM);
  return radiance.map((v,i)=>{
    const transmitted=Math.exp(-u.absorbPerM[i]!*lightDepth),path=Math.exp(-u.pathExtinction[i]!*Math.max(pathM,0)/u.visibilityM);
    const scatter=(u.deep[i]!+(u.shallow[i]!-u.deep[i]!)*blend)*shade;
    return v*transmitted*path+scatter*(1-path);
  });
}

/** Seabed caustics for a submerged eye (part of ocean-underwater-1): a
 * warped three-wave ridge pattern, about 2.5 m cells. Every wave vector has an
 * integer number of cycles per DETAIL_PERIOD_M (4096 m) on each axis, so the
 * pattern is exactly periodic in the wrapped ground position (no seam between
 * patch origins), and every angular speed is a whole multiple of
 * 2*PI/OCEAN_TIME_WRAP_PERIOD_S, so the time wrap cannot pop. Fades out with
 * depth (4-35 m), distance (25-90 m), steep slopes and night. */
export const OCEAN_CAUSTICS_GLSL=(()=>{
  const W=(2*Math.PI/4096).toFixed(12),Q=2*Math.PI/OCEAN_TIME_WRAP_PERIOD_S,q=(s:number)=>(Math.round(s/Q)*Q).toFixed(10);
  return `
float atlasCaustic(vec3 p,float t){
  float a=sin(dot(p,vec3(1201.0,577.0,893.0))*${W}+t*${q(1.1)});
  float b=sin(dot(p,vec3(-641.0,1307.0,-311.0))*${W}+t*${q(.9)}+1.7*a);
  float c=sin(dot(p,vec3(419.0,-863.0,1277.0))*${W}-t*${q(1.3)}+1.7*b);
  return pow(1.0-abs(c),5.0);
}
vec3 atlasApplyCaustics(vec3 radiance,vec3 groundPositionM,float surfaceDepthM,float pathM,float upFacing,float sunCosine,float t,vec4 water){
  if(water.x<.5||surfaceDepthM<=0.0)return radiance;
  float k=(1.0-smoothstep(4.0,35.0,surfaceDepthM))*smoothstep(.35,.8,upFacing)*(1.0-smoothstep(25.0,90.0,pathM))*smoothstep(-.05,.25,sunCosine);
  return radiance*(1.0+1.4*k*atlasCaustic(groundPositionM,t));
}
`;})();

/** Upper bound of a level-L ocean/terrain patch's vertex spacing (m): cube
 * span x radius / segments (the cube-to-sphere map is 1-Lipschitz). */
export function oceanPatchSpacingM(level:number,radiusM:number,segments=32){return 2/2**level*radiusM/segments;}
/** Geometric part of a level-L patch's skirt: the sag below the sphere of a
 * neighbour's straight edge segment when that neighbour is up to two levels
 * coarser (a 4:1 frontier edge; the edge lock only removes the 2:1 part).
 * R(1-cos(theta/2)) <= R theta^2/8 with theta <= 4 s / R, capped at 40 m like
 * the terrain skirts (planet-tiles skirtDepthM). */
export function oceanSkirtSagM(level:number,radiusM:number,segments=32){
  const s=oceanPatchSpacingM(level,radiusM,segments);return Math.min(40,2*s*s/radiusM);
}
/** Skirt depth below the undisplaced sea: deeper than the lowest possible
 * trough (the wave part stays inside render-bounds' RENDER_WAVE_BOUND_M, 3 m,
 * because every wave is <= 0.33 m), plus, given a level, the coarser
 * neighbour's chord sag, so the higher side of any mismatch at a 2:1, 4:1 or
 * morphing patch edge always hangs below the lower side's surface. */
export function oceanSkirtDepthM(waves:GerstnerWave[],level?:number,radiusM?:number,segments=32){
  return maxOceanWaveAmplitudeM(waves)+.25+(level===undefined||radiusM===undefined?0:oceanSkirtSagM(level,radiusM,segments));
}
/** Edge vertex order of planet-tiles.ts buildTile's skirts (the terrain index
 * buffer's skirt triangles reference vertex base + edge*stride + k). */
export function oceanSkirtEdges(segments:number){
  const n=segments,stride=n+1;
  return [Array.from({length:stride},(_,i)=>i),Array.from({length:stride},(_,i)=>i*stride+n),Array.from({length:stride},(_,i)=>n*stride+n-i),Array.from({length:stride},(_,i)=>(n-i)*stride)];
}
/**
 * Ocean position/parent buffers with skirt copies appended in the terrain
 * skirt layout, so the terrain patch's own index buffer (base grid + skirt
 * triangles) draws them. Each copy is its edge vertex moved `depthM` toward
 * the planet centre; the vertex shader leaves copies undisplaced, so a skirt
 * runs from the displaced wave edge down to `depthM` below the sea.
 */
export function oceanSkirtBuffers(positions:Float32Array,parents:Float32Array,anchor:readonly number[],segments:number,depthM:number,radiusM:number){
  const stride=segments+1,base=stride*stride,skirt=depthM/radiusM;
  const outPositions=new Float32Array((base+4*stride)*3),outParents=new Float32Array((base+4*stride)*3);
  outPositions.set(positions.subarray(0,base*3));outParents.set(parents.subarray(0,base*3));
  oceanSkirtEdges(segments).forEach((edge,e)=>edge.forEach((a,k)=>{
    const b=base+e*stride+k,x=positions[a*3]!+anchor[0]!,y=positions[a*3+1]!+anchor[1]!,z=positions[a*3+2]!+anchor[2]!,l=Math.hypot(x,y,z);
    for(let i=0;i<3;i++){const d=[x,y,z][i]!/l;outPositions[b*3+i]=positions[a*3+i]!-d*skirt;outParents[b*3+i]=parents[a*3+i]!-d*skirt;}
  }));
  return {positions:outPositions,parents:outParents,baseVertices:base,skirtVertices:4*stride};
}
export type OceanWaterMaterial=THREE.ShaderMaterial & {setDebug:(debug:OceanWaterDebug)=>void;setFrame:(frame:OceanWaterPatchFrame)=>void;setSubmerged:(submerged:boolean)=>void;readonly waves:GerstnerWave[];readonly maxWaveAmplitudeM:number};

const vector=(value:V3|THREE.Vector3)=>value instanceof THREE.Vector3?value:new THREE.Vector3(...value);

/**
 * Material for one terrain-grid ocean patch. Its position and parentPosition
 * attributes are sea-level, anchor-relative copies of the terrain grid and
 * deliberately exclude terrain skirts.
 *
 * Vertex displacement is real analytic Gerstner waves (see
 * src/ocean-gerstner.ts, ported from nms's heroOceanSurface.ts), evaluated
 * directly from each vertex's world-metre position and the live clock --
 * never from patch/LOD/morph state -- so neighbouring patches and LOD levels
 * agree on the same wave field with no seam, and the ocean stays flush with
 * the sea-level (radius = body.radiusM, elevationM = 0) shoreline terrain.ts
 * reports: the sum of every wave's amplitude bounds how far a crest/trough
 * can move away from that shared sea level (see maxOceanWaveAmplitudeM and
 * this file's tests).
 */
export function createOceanWaterMaterial(options:OceanWaterPatchOptions):OceanWaterMaterial{
  let frozenTime=0,freezeWater=false;
  const normalAtlas=acquireWaterNormalAtlas();
  const waveCount=options.waveCount??OCEAN_GERSTNER_WAVE_COUNT;
  const waveSeed=options.waveSeed??hashSeedString('atlas-ocean-fallback/'+Math.round(options.radiusM));
  const waves=generateOceanWaveField(waveSeed,waveCount);
  const waveArrays=oceanWaveUniformArrays(waves);
  const maxWaveAmplitudeM=maxOceanWaveAmplitudeM(waves);
  const phaseOrigin=vector(options.phaseOriginM),waveOrigin=options.waveOriginM?vector(options.waveOriginM):phaseOrigin;
  const wavePhase=oceanWavePhaseOffsets(waves,waveOrigin.x-phaseOrigin.x,waveOrigin.z-phaseOrigin.z);
  const uniforms={
    oceanRadiusM:{value:options.radiusM},oceanNormalAnchor:{value:vector(options.normalAnchorDir).clone().normalize()},oceanPhaseOriginM:{value:vector(options.phaseOriginM).clone()},
    patchMorph:options.patchMorph,patchEdges:options.patchEdges,patchTexels:typeof options.patchTexels==='number'?{value:options.patchTexels}:options.patchTexels,
    oceanEyeM:{value:new THREE.Vector3()},oceanSun:{value:new THREE.Vector3(1,0,0)},oceanTime:{value:0},oceanFlat:{value:0},oceanDepthDebug:{value:0},oceanNormalAtlas:{value:normalAtlas},oceanNormalRepeatM:{value:WATER_NORMAL_ATLAS_METRES_PER_REPEAT},
    oceanWaveDir:{value:waveArrays.dir.map(([x,z])=>new THREE.Vector2(x,z))},oceanWaveAmplitudeM:{value:waveArrays.amplitudeM},oceanWaveNumber:{value:waveArrays.waveNumber},oceanWaveSpeed:{value:waveArrays.speedMps},oceanWavePhase:{value:wavePhase},
    oceanWaveSpacing:options.waveSpacing??{value:new THREE.Vector2(0,0)},oceanPatchSpacingM:{value:Math.max(0,options.patchSpacingM??0)},oceanEdgeSpacingM:options.edgeSpacing??{value:new THREE.Vector4(0,0,0,0)},atlasWater:options.underwater??{value:new THREE.Vector4(0,0,0,0)},
  };
  const baseVertices=Math.min(2147483647,Math.max(0,Math.floor(options.baseVertices??2147483647)));
  const material=new THREE.ShaderMaterial({
    uniforms,
    vertexShader:`#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 parentPosition;
uniform float patchMorph,patchTexels,oceanRadiusM; uniform vec4 patchEdges; uniform vec3 oceanNormalAnchor,oceanPhaseOriginM,oceanEyeM; uniform float oceanTime,oceanPatchSpacingM; uniform vec2 oceanWaveSpacing; uniform vec4 oceanEdgeSpacingM;
varying vec3 oceanNormalV,oceanWaveNormalV,oceanLocalM; varying vec2 oceanPhaseM;
#define OCEAN_BASE_VERTICES ${baseVertices}
${oceanGerstnerVertexGLSL(waveCount)}
void main(){
  vec2 gridUV=(uv*(patchTexels+2.0)-1.0)/patchTexels;
  float lockEdge=max(max((1.0-step(.00001,gridUV.x))*patchEdges.x,step(.99999,gridUV.x)*patchEdges.y),max((1.0-step(.00001,gridUV.y))*patchEdges.z,step(.99999,gridUV.y)*patchEdges.w));
  // This is byte-for-byte the terrain patch interpolation. Do not normalize
  // or radially move it: those operations break shared LOD seams.
  vec3 transformed=mix(parentPosition,position,patchMorph*(1.0-lockEdge));
  vec3 base=normalize(oceanNormalAnchor+transformed);
  // Real Gerstner displacement: a deterministic analytic function of world
  // position and time only (never of patchMorph/LOD), so neighbouring
  // patches -- and the same patch across LOD levels -- sample the identical
  // wave field and never show a seam. wavePosM uses the 4096 m-wrapped
  // origin; oceanWavePhase (per wave, per patch) restores the unwrapped
  // world phase, since the wavelengths do not divide 4096 m.
  vec2 wavePosM=transformed.xz*oceanRadiusM+oceanPhaseOriginM.xz;
  float waveHeightM; vec2 waveSlope;
  // Distance fade (ocean-wave-fade-1): each wave fades out before the grid
  // spacing reaches its Nyquist limit. The spacing is the larger of a smooth
  // eye-distance estimate (the same world quantity in every patch) and this
  // patch's own spacing bound, raised on each edge row to the coarser
  // neighbour's bound (equal on both sides), so neither term adds a seam.
  float edgeSpacingM=max(max((1.0-step(.00001,gridUV.x))*oceanEdgeSpacingM.x,step(.99999,gridUV.x)*oceanEdgeSpacingM.y),max((1.0-step(.00001,gridUV.y))*oceanEdgeSpacingM.z,step(.99999,gridUV.y)*oceanEdgeSpacingM.w));
  oceanGerstnerSpacingM=max(max(length(oceanEyeM-transformed*oceanRadiusM)*oceanWaveSpacing.x,oceanWaveSpacing.y),max(oceanPatchSpacingM,edgeSpacingM));
  oceanGerstner(wavePosM,oceanTime,waveHeightM,waveSlope);
  // Skirt copies (oceanSkirtBuffers) stay at their depth below the sea.
  if(gl_VertexID>=OCEAN_BASE_VERTICES){waveHeightM=0.0;waveSlope=vec2(0.0);}
  transformed+=base*(waveHeightM/oceanRadiusM);
  oceanNormalV=base;
  vec3 eastCandidate=cross(vec3(0.,1.,0.),base); float eastLength=length(eastCandidate);
  vec3 east=eastLength>.01?eastCandidate/eastLength:vec3(1.,0.,0.); vec3 north=normalize(cross(base,east));
  oceanWaveNormalV=normalize(base-east*waveSlope.x-north*waveSlope.y);
  oceanLocalM=transformed*oceanRadiusM;
  oceanPhaseM=wavePosM;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(transformed,1.0);
  #include <logdepthbuf_vertex>
}`,
    fragmentShader:`// oceanWater marker: renderer diagnostics classify this surface.
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 oceanEyeM,oceanSun; uniform float oceanTime,oceanFlat,oceanDepthDebug,oceanNormalRepeatM; uniform sampler2D oceanNormalAtlas; uniform vec4 atlasWater;
varying vec3 oceanNormalV,oceanWaveNormalV,oceanLocalM; varying vec2 oceanPhaseM;
${OCEAN_UNDERWATER_GLSL}
void main(){
  #include <logdepthbuf_fragment>
  if(oceanDepthDebug>.5){float d=clamp(length(oceanEyeM-oceanLocalM)/4000.0,0.0,1.0);gl_FragColor=vec4(vec3(d),1.0);return;}
  if(oceanFlat>.5){gl_FragColor=vec4(vec3(.025,.13,.20),1.0);return;}
  // Analytic macro-wave normal (real Gerstner slope) as the shading base,
  // with the existing normal-atlas ripples layered on top for micro detail.
  vec3 base=normalize(oceanWaveNormalV); vec3 view=normalize(oceanEyeM-oceanLocalM); vec3 sun=normalize(oceanSun);
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
  // Specular anti-aliasing for the sun glint: a single un-filtered mirror
  // lobe (fixed exponent 180) under-samples badly once a fragment's screen
  // footprint spans many wave periods (orbital or distant views), which
  // read as one harsh, hard-edged white blob rather than sparkling glitter.
  // Widen (and dim) the lobe with the same world-space footprint already
  // used to fade wave micro-detail, so the glint spreads into a softer
  // highlight at a distance instead of aliasing to a flat disc.
  float glintSpread=clamp(footprint/40.0,0.0,1.0),glintExponent=mix(180.0,22.0,glintSpread),glintGain=mix(1.0,.4,glintSpread);
  // Night floors (deep/shallow/sky) are lifted just above their prior
  // near-zero values: open ocean at night previously rendered as flat,
  // unreadable black under terrain-following flight. The daytime mix
  // target (.18,.32,.47) and glint are untouched.
  float day=smoothstep(-.14,.08,dot(base,sun)); vec3 deep=vec3(.012,.040,.065),shallow=vec3(.030,.115,.145);
  vec3 sky=mix(vec3(.020,.035,.065),vec3(.18,.32,.47),day); float glint=pow(max(0.0,dot(reflect(-sun,n),view)),glintExponent)*day*glintGain;
  vec3 waterColor=mix(mix(shallow,deep,.78),sky,.025+.72*fresnel)+glint;
  if(!gl_FrontFacing){
    // Seen from below (ocean-underwater-1, eye submerged): Snell's window --
    // the sky inside ~48.6 deg of the zenith, total internal reflection of
    // the darker water outside it.
    float cosBelow=clamp(dot(view,-n),0.0,1.0);
    float sinAir=sqrt(max(0.0,1.0-cosBelow*cosBelow))*1.333;
    vec3 above=mix(vec3(.020,.035,.065),vec3(.40,.60,.76),day);
    waterColor=mix(atlasWaterColour(max(atlasWater.y,0.0),day)*.7,above,1.0-smoothstep(.90,1.0,sinAir));
  }
  waterColor=atlasApplyUnderwater(waterColor,length(oceanEyeM-oceanLocalM),0.0,dot(base,sun),atlasWater);
  gl_FragColor=vec4(max(waterColor,vec3(.009,.015,.022)),1.0);
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
  // A submerged eye sees the surface's back faces (the Snell's-window
  // branch); above water only front faces are drawn, as before.
  material.setSubmerged=submerged=>{
    const side=submerged?THREE.DoubleSide:THREE.FrontSide;
    if(material.side!==side){material.side=side;material.needsUpdate=true;}
  };
  material.setFrame=frame=>{
    uniforms.oceanEyeM.value.copy(vector(frame.localEyeM));uniforms.oceanSun.value.copy(vector(frame.sunDirection));
    if(frame.oceanPhaseS!==undefined&&!freezeWater)uniforms.oceanTime.value=frame.oceanPhaseS;
    else if(freezeWater)uniforms.oceanTime.value=frozenTime;
  };
  let released=false;material.addEventListener('dispose',()=>{if(!released){released=true;releaseWaterNormalAtlas();}});
  (material as {waves:GerstnerWave[]}).waves=waves;
  (material as {maxWaveAmplitudeM:number}).maxWaveAmplitudeM=maxWaveAmplitudeM;
  return material;
}

export function setOceanWaterPatchFrame(material:OceanWaterMaterial,frame:OceanWaterPatchFrame){material.setFrame(frame);}
export function setOceanWaterDebug(material:OceanWaterMaterial,debug:OceanWaterDebug){material.setDebug(debug);}
