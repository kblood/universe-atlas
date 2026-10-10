/** Prototype: indexed geometry + exact planetary colour-basis/context, sharing
 * only the existing coat library's integer mask GLSL. No composer recipe/body.
 * Unsupported patterns, limb layouts and nonlinear points are explicit fallbacks. */
import * as THREE from 'three';
import type {QuadrupedBodyData} from './fauna-body-plan.ts';
import type {CoatGenome,CoatSample} from './fauna-coat-fields.ts';
import {coatSeedMix,COAT_CELLS_PER_BODY} from './fauna-coat-fields.ts';
import {COAT_PATTERN_CRISP_GLSL as COMPOSER_COAT_CRISP_GLSL} from '#creature-kit/planet';
import {createFaunaMaterial} from './fauna-material.ts';
export const FAUNA_PLANET_CRISP_VERSION='planet-coat-crisp-context-1';
export const FAUNA_PLANET_CRISP_RAW_VERSION='planet-coat-crisp-raw-clamp-1';
export const FAUNA_PLANET_CRISP_PATTERNS=['spots','rosettes','reticulated','dapple','stripes','bands','brindle'] as const;
export interface FaunaPlanetPatternOracle {
  source:Readonly<QuadrupedBodyData>;version:string;
  sampleInto(x:number,y:number,z:number,normalY:number,layers:Float64Array,context:CoatSample):{coat:Readonly<CoatGenome>|undefined;region:string;affineError:number;mask:number;patch:number;rawLayers?:boolean};
}
export function buildFaunaPlanetCrispData(source:QuadrupedBodyData,geometry:QuadrupedBodyData,oracle:FaunaPlanetPatternOracle,options:{cancelFlag?:Int32Array}={}){
  const flag=options.cancelFlag;if(flag&&(!(flag instanceof Int32Array)||typeof SharedArrayBuffer==='undefined'||!(flag.buffer instanceof SharedArrayBuffer)||flag.length!==1))throw new Error('planet crisp coat: shared one-element cancellation flag required');
  const check=()=>{if(flag&&Atomics.load(flag,0)!==0)throw new Error('planet crisp coat: cancelled');};check();
  if(oracle.source!==source||!['quadruped-body-pattern-sampler-1','quadruped-body-pattern-sampler-raw-1'].includes(oracle.version)||geometry.plan!==source.plan)throw new Error('planet crisp coat: matching source-bound planetary context required');
  if(!Number.isInteger(geometry.vertexCount)||geometry.vertexCount<3||geometry.vertexCount>40000||geometry.positions.length!==geometry.vertexCount*3||geometry.normals.length!==geometry.vertexCount*3||geometry.colors.length!==geometry.vertexCount*3||geometry.index.length!==geometry.triangleCount*3)throw new Error('planet crisp coat: bounded geometry required');
  if(!(geometry.positions instanceof Float32Array)||!(geometry.normals instanceof Float32Array)||!(geometry.colors instanceof Uint8Array)||!geometry.positions.every(Number.isFinite)||!geometry.normals.every(Number.isFinite)||!Number.isInteger(geometry.bodyVertexCount)||geometry.bodyVertexCount<1||geometry.bodyVertexCount>geometry.vertexCount)throw new Error('planet crisp coat: finite typed body attributes required');
  const raw=oracle.version==='quadruped-body-pattern-sampler-raw-1',clip=new Uint8Array(geometry.vertexCount);
  const n=geometry.vertexCount,c0=new Float32Array(n*3),c1=new Float32Array(n*3),c2=new Float32Array(n*3),sample=new Float32Array(n*4),layers=new Float64Array(9),context:CoatSample={x:0,y:0,z:0,dorsal:0,region:'torso',along:0,footprint:0};
  let descriptor:{pattern:string;code:number;seed:number;cells:number;threshold:number;warp:number;bellyLine:number;footprint:number}|undefined;
  let eligible=0,unsupported=0,nonlinear=0,limbFallback=0,maxAffineError=0,maxPackedPointError=0;
  for(let v=0;v<n;v++){
    if((v&31)===0)check();
    // Supplements retain their exact existing vertex colour in every layer.
    const colour=[geometry.colors[v*3]!/255,geometry.colors[v*3+1]!/255,geometry.colors[v*3+2]!/255];
    c0.set(colour,v*3);c1.set(colour,v*3);c2.set(colour,v*3);
    if(v>=geometry.bodyVertexCount)continue;
    const info=oracle.sampleInto(geometry.positions[v*3]!,geometry.positions[v*3+1]!,geometry.positions[v*3+2]!,geometry.normals[v*3+1]!,layers,context),coat=info.coat;
    if(coat)sample.set([context.x,context.y,context.z,context.dorsal],v*4);
    if(!Number.isFinite(info.affineError)||info.affineError<0||!layers.every(Number.isFinite)||![context.x,context.y,context.z,context.dorsal].every(Number.isFinite))throw new Error('planet crisp coat: invalid context/oracle colour');
    const pattern=coat?.pattern,index=FAUNA_PLANET_CRISP_PATTERNS.indexOf(pattern as typeof FAUNA_PLANET_CRISP_PATTERNS[number]);
    if(!coat||index<0){unsupported++;continue;}
    maxAffineError=Math.max(maxAffineError,info.affineError);
    if(info.affineError>1e-8||(raw&&!info.rawLayers)){nonlinear++;continue;}
    if(['stripes','bands','brindle'].includes(pattern!)&&(info.region.startsWith('limb-')||info.region==='foot')){limbFallback++;continue;}
    const current={pattern:pattern!,code:index+1,seed:coatSeedMix(coat.seed)>>>0,cells:COAT_CELLS_PER_BODY[pattern!]*coat.scale,threshold:coat.threshold,warp:coat.warp,bellyLine:coat.bellyLine,footprint:context.footprint??0};
    if(!descriptor)descriptor=current;else if(JSON.stringify(descriptor)!==JSON.stringify(current))throw new Error('planet crisp coat: inconsistent prepared source pattern parameters');
    if(raw)clip[v]=1;
    c0.set(layers.subarray(0,3),v*3);c1.set(layers.subarray(3,6),v*3);c2.set(layers.subarray(6,9),v*3);eligible++;
    for(let lane=0;lane<3;lane++){
      const exact=layers[lane]!+info.mask*(layers[lane+3]!-layers[lane]!)+info.mask*info.patch*(layers[lane+6]!-layers[lane+3]!);
      const packed=c0[v*3+lane]!+info.mask*(c1[v*3+lane]!-c0[v*3+lane]!)+info.mask*info.patch*(c2[v*3+lane]!-c1[v*3+lane]!);
      maxPackedPointError=Math.max(maxPackedPointError,Math.abs(exact-packed));
    }
  }
  const extraCpuBytes=c0.byteLength+c1.byteLength+c2.byteLength+sample.byteLength+clip.byteLength;
  return {version:raw?FAUNA_PLANET_CRISP_RAW_VERSION:FAUNA_PLANET_CRISP_VERSION,source,sourceGeometry:geometry,c0,c1,c2,sample,clip,descriptor,
    diagnostics:{eligible,unsupported,nonlinear,limbFallback,maxAffineError,maxPackedPointError},resources:{extraCpuBytes,extraGpuBytes:extraCpuBytes,extraCombinedBytes:extraCpuBytes*2},
    provenance:{sourceVersion:source.plan.version,oracleVersion:oracle.version,scale:'exact-source-density-clamped',coordinates:'planetary-prepare-context-phase-and-signed-flank',footprint:'max-canonical-source-footprint-and-screen-derivative',clamp:raw?'source0.002..1-after-mask-mix-with-supplement-fallback':'original-clipped-endpoint-control',fallback:'original-vertex-colour-at-unsupported-points',presentationDrift:'mask-per-fragment-with-interpolated-regional-colour-basis; source arrays unchanged'}};
}
/** Library mask shared verbatim. Only fragment filtering changes: keep the
 * exact source's canonical footprint as the minimum, allowing coarser screen
 * footprint to reduce distant aliasing. No requested-scale override. */
export const FAUNA_PLANET_CRISP_GLSL=COMPOSER_COAT_CRISP_GLSL.replace('uniform float coatCells, coatThreshold, coatWarp, coatBellyLine;','uniform float coatCells, coatThreshold, coatWarp, coatBellyLine, coatCanonicalFootprint;').replace('varying vec4 vCoatSample;','varying vec4 vCoatSample; varying float vCoatClip;').replace('), 0.0, 1.0);\n}', '), .002*vCoatClip, 1.0);\n}').replace('float fp = max(length(dFdx(sp)), length(dFdy(sp)));','float fp = max(coatCanonicalFootprint,max(length(dFdx(sp)), length(dFdy(sp))));');
/** Resolve the library's compile-time pattern branches without changing their
 * arithmetic. Shared helpers are emitted once, seven small mask bodies dispatch
 * by actor code. GLSL uint hash and parameters remain the same library inputs. */
function maskVariant(body:string,code:number):string{
  const stack:{parent:boolean;taken:boolean;active:boolean}[]=[];let active=true;const out:string[]=[];
  const condition=(expr:string)=>expr.split('||').some(term=>{const match=/COAT_PATTERN\s*==\s*(\d+)/.exec(term);if(!match)throw new Error('planet crisp coat: unknown library preprocessor condition');return code===Number(match[1]);});
  for(const line of body.split('\n')){
    const ifMatch=/^\s*#if\s+(.+)/.exec(line),elifMatch=/^\s*#elif\s+(.+)/.exec(line);
    if(ifMatch){const take=condition(ifMatch[1]!);stack.push({parent:active,taken:take,active:active&&take});active=active&&take;}
    else if(elifMatch){const top=stack[stack.length-1]!;const take=!top.taken&&condition(elifMatch[1]!);top.taken||=take;top.active=top.parent&&take;active=top.active;}
    else if(/^\s*#else/.test(line)){const top=stack[stack.length-1]!;top.active=top.parent&&!top.taken;top.taken=true;active=top.active;}
    else if(/^\s*#endif/.test(line)){const top=stack.pop()!;active=top.parent;}
    else if(active)out.push(line.replace(/COAT_PATTERN/g,String(code)).replace('coatPatternMask(',`planetMask${code}(`));
  }
  if(stack.length)throw new Error('planet crisp coat: unbalanced library mask');return out.join('\n');
}
const MASK_START=FAUNA_PLANET_CRISP_GLSL.indexOf('vec2 coatPatternMask('),MASK_END=FAUNA_PLANET_CRISP_GLSL.indexOf('vec3 composerCoatCrisp()');
export const FAUNA_PLANET_CRISP_BATCH_VARYINGS='flat varying highp uint coatSeed;flat varying highp uint planetCoatCode;flat varying float coatCells;flat varying float coatThreshold;flat varying float coatWarp;flat varying float coatBellyLine;flat varying float coatCanonicalFootprint;';
export const FAUNA_PLANET_CRISP_BATCH_GLSL=FAUNA_PLANET_CRISP_GLSL.slice(0,MASK_START).replace('uniform highp uint coatSeed;','').replace('uniform float coatCells, coatThreshold, coatWarp, coatBellyLine, coatCanonicalFootprint;','')+FAUNA_PLANET_CRISP_BATCH_VARYINGS+
  [1,2,3,4,5,6,7].map(code=>maskVariant(FAUNA_PLANET_CRISP_GLSL.slice(MASK_START,MASK_END),code)).join('\n')+`
vec3 planetBatchedCoat(){
 if(planetCoatCode==0u)return clamp(vCoatL0,0.0,1.0);
 vec3 sp=vCoatSample.xyz;float dorsal=clamp(vCoatSample.w,-1.0,1.0),fp=max(coatCanonicalFootprint,max(length(dFdx(sp)),length(dFdy(sp))));vec2 mp;
 if(planetCoatCode==1u)mp=planetMask1(sp,dorsal,fp);else if(planetCoatCode==2u)mp=planetMask2(sp,dorsal,fp);else if(planetCoatCode==3u)mp=planetMask3(sp,dorsal,fp);else if(planetCoatCode==4u)mp=planetMask4(sp,dorsal,fp);else if(planetCoatCode==5u)mp=planetMask5(sp,dorsal,fp);else if(planetCoatCode==6u)mp=planetMask6(sp,dorsal,fp);else mp=planetMask7(sp,dorsal,fp);
 return clamp(vCoatL0+mp.x*(vCoatL1-vCoatL0)+mp.x*mp.y*(vCoatL2-vCoatL1),.002*vCoatClip,1.0);
}`;
export function createFaunaPlanetCrispGeometry(data:ReturnType<typeof buildFaunaPlanetCrispData>){
  const s=data.sourceGeometry,g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(s.positions,3));g.setAttribute('normal',new THREE.BufferAttribute(s.normals,3));g.setAttribute('color',new THREE.BufferAttribute(s.colors,3,true));g.setAttribute('skinIndex',new THREE.BufferAttribute(s.skinIndex,4));g.setAttribute('skinWeight',new THREE.BufferAttribute(s.skinWeight,4,true));g.setIndex(new THREE.BufferAttribute(s.index,1));
  g.setAttribute('coatL0',new THREE.BufferAttribute(data.c0,3));g.setAttribute('coatL1',new THREE.BufferAttribute(data.c1,3));g.setAttribute('coatL2',new THREE.BufferAttribute(data.c2,3));g.setAttribute('coatSample',new THREE.BufferAttribute(data.sample,4));g.setAttribute('coatClip',new THREE.BufferAttribute(data.clip,1));return g;
}
export function createFaunaPlanetCrispMaterial(data:ReturnType<typeof buildFaunaPlanetCrispData>){
  const material=createFaunaMaterial(true),d=data.descriptor;if(!d)return material;
  material.customProgramCacheKey=()=>`${data.version}/${d.code}`;
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{coatSeed:{value:d.seed},coatCells:{value:d.cells},coatThreshold:{value:d.threshold},coatWarp:{value:d.warp},coatBellyLine:{value:d.bellyLine},coatCanonicalFootprint:{value:d.footprint}});
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 coatL0;attribute vec3 coatL1;attribute vec3 coatL2;attribute vec4 coatSample;attribute float coatClip;varying vec3 vCoatL0;varying vec3 vCoatL1;varying vec3 vCoatL2;varying vec4 vCoatSample; varying float vCoatClip;').replace('#include <begin_vertex>','#include <begin_vertex>\nvCoatL0=coatL0;vCoatL1=coatL1;vCoatL2=coatL2;vCoatSample=coatSample;vCoatClip=coatClip;');
    shader.fragmentShader=`#define COAT_PATTERN ${d.code}\n`+shader.fragmentShader.replace('#include <common>',`#include <common>\n${FAUNA_PLANET_CRISP_GLSL}`).replace('#include <color_fragment>','diffuseColor.rgb *= composerCoatCrisp();');
  };return material;
}
