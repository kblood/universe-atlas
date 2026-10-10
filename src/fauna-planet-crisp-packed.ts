/** Optional bounded representation of the same field coefficients. Never clamp
 * an out-of-range layer to force admission: reject and keep the float control. */
import * as THREE from 'three';
import {createFaunaPlanetCrispMaterial,type buildFaunaPlanetCrispData} from './fauna-planet-crisp.ts';
export const FAUNA_PLANET_CRISP_PACKED_VERSION='planet-coat-crisp-packed-delta16-1';
export function packFaunaPlanetCrispData(data:ReturnType<typeof buildFaunaPlanetCrispData>){
  const c0=new Uint8Array(data.c0.length),c1=new Int16Array(data.c1.length),c2=new Int16Array(data.c2.length);let maxErrorBound=0;
  for(let i=0;i<c0.length;i++){
    const base=data.c0[i]!,d01=data.c1[i]!-base,d12=data.c2[i]!-data.c1[i]!;
    if(!Number.isFinite(base)||base<0||base>1||!Number.isFinite(d01)||d01< -1||d01>1||!Number.isFinite(d12)||d12< -1||d12>1)throw new Error('planet packed coat: coefficient outside exact packing domain');
    c0[i]=Math.round(base*255);c1[i]=Math.round(d01*32767);c2[i]=Math.round(d12*32767);
    // All masks/patch values and triangle interpolation weights lie in0..1.
    // This bound therefore holds at every point, not just chosen mask probes.
    maxErrorBound=Math.max(maxErrorBound,Math.abs(c0[i]!/255-base)+Math.abs(c1[i]!/32767-d01)+Math.abs(c2[i]!/32767-d12));
  }
  if(maxErrorBound>1/255)throw new Error('planet packed coat: exceeds one-channel-byte quantization bound');
  const sample=data.sample.slice(),extraCpuBytes=c0.byteLength+c1.byteLength+c2.byteLength+sample.byteLength;
  return {version:FAUNA_PLANET_CRISP_PACKED_VERSION,source:data.source,sourceGeometry:data.sourceGeometry,c0,c1,c2,sample,descriptor:data.descriptor?{...data.descriptor}:undefined,
    diagnostics:{...data.diagnostics,maxPackingErrorBound:maxErrorBound},resources:{extraCpuBytes,extraGpuBytes:extraCpuBytes,extraCombinedBytes:extraCpuBytes*2},
    provenance:{...data.provenance,floatControlVersion:data.version,representation:'baseRGB-u8-plus-delta01/delta12-snorm16',quantizationBound:'<=1/255 for every mask/patch and convex triangle interpolation'}};
}
export type FaunaPlanetCrispPackedData=ReturnType<typeof packFaunaPlanetCrispData>;
export function createFaunaPlanetCrispPackedGeometry(data:FaunaPlanetCrispPackedData){
  const s=data.sourceGeometry,g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(s.positions,3));g.setAttribute('normal',new THREE.BufferAttribute(s.normals,3));g.setAttribute('color',new THREE.BufferAttribute(s.colors,3,true));g.setAttribute('skinIndex',new THREE.BufferAttribute(s.skinIndex,4));g.setAttribute('skinWeight',new THREE.BufferAttribute(s.skinWeight,4,true));g.setIndex(new THREE.BufferAttribute(s.index,1));
  g.setAttribute('coatL0',new THREE.BufferAttribute(data.c0,3,true));g.setAttribute('coatL1',new THREE.BufferAttribute(data.c1,3,true));g.setAttribute('coatL2',new THREE.BufferAttribute(data.c2,3,true));g.setAttribute('coatSample',new THREE.BufferAttribute(data.sample,4));return g;
}
export function createFaunaPlanetCrispPackedMaterial(data:FaunaPlanetCrispPackedData){
  // The material consumes only the source descriptor; its field math is the
  // unchanged float control. Vertex input reconstructs the absolute layers.
  const material=createFaunaPlanetCrispMaterial(data as unknown as ReturnType<typeof buildFaunaPlanetCrispData>),previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey;
  material.customProgramCacheKey=()=>previousKey.call(material)+`/${FAUNA_PLANET_CRISP_PACKED_VERSION}`;
  material.onBeforeCompile=(shader,renderer)=>{previous.call(material,shader,renderer);shader.vertexShader=shader.vertexShader.replace('vCoatL0=coatL0;vCoatL1=coatL1;vCoatL2=coatL2;','vCoatL0=coatL0;vCoatL1=coatL0+coatL1;vCoatL2=coatL0+coatL1+coatL2;');};return material;
}
