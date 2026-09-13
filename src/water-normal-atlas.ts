import * as THREE from 'three';

/** A small, periodic normal field shared by every inland and ocean water draw. */
export const WATER_NORMAL_ATLAS_SIZE=128;
/** Divides the terrain's 4096 m canonical phase period exactly. */
export const WATER_NORMAL_ATLAS_METRES_PER_REPEAT=16;
export const WATER_NORMAL_CANONICAL_PERIOD_M=4096;
const mipBytes=(size:number)=>{let total=0;for(let n=size;n>0;n>>=1)total+=n*n*4;return total;};
/** CPU pixels plus the identically sized GPU texture, including the mip chain. */
export const SHARED_WATER_NORMAL_ATLAS_BYTES=mipBytes(WATER_NORMAL_ATLAS_SIZE)*2;

let texture:THREE.DataTexture|undefined,refs=0;
/** Continuous periodic slope field; integer harmonics make each atlas edge agree. */
export function waterNormalSlope(u:number,v:number){
  const tau=Math.PI*2,warpU=u+.075*Math.sin(tau*(2*v+u)),warpV=v+.065*Math.sin(tau*(3*u-2*v));
  let x=0,z=0;
  for(const [fx,fy,phase,weight] of [[1,3,.17,.48],[3,-2,.61,.29],[-5,4,.39,.16]] as const){const a=tau*(fx*warpU+fy*warpV)+phase;x+=Math.cos(a)*fx*weight;z+=Math.cos(a)*fy*weight;}
  return [x,z] as const;
}

/** Deterministic, toroidal wave slopes. No external art or random state is used. */
export function createWaterNormalAtlasPixels(size=WATER_NORMAL_ATLAS_SIZE){
  const pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    let sx=0,sy=0;
    // Analytic field is continuous through the repeat seam before quantization.
    [sx,sy]=waterNormalSlope(x/size,y/size);
    const inv=1/Math.max(1,Math.hypot(sx,sy));
    const i=(y*size+x)*4;pixels[i]=Math.round(128+sx*inv*42);pixels[i+1]=Math.round(128+sy*inv*42);pixels[i+2]=255;pixels[i+3]=255;
  }
  return pixels;
}

export function acquireWaterNormalAtlas(){
  if(!texture){
    texture=new THREE.DataTexture(createWaterNormalAtlasPixels(),WATER_NORMAL_ATLAS_SIZE,WATER_NORMAL_ATLAS_SIZE,THREE.RGBAFormat,THREE.UnsignedByteType);
    texture.name='Deterministic shared water normal atlas';texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=true;texture.colorSpace=THREE.NoColorSpace;texture.needsUpdate=true;
  }
  refs++;return texture;
}

export function releaseWaterNormalAtlas(){
  if(refs>0)refs--;
  if(refs===0&&texture){texture.dispose();texture=undefined;}
}

export function waterNormalAtlasDiagnostics(){return {references:refs,allocated:!!texture,size:WATER_NORMAL_ATLAS_SIZE,metresPerRepeat:WATER_NORMAL_ATLAS_METRES_PER_REPEAT,accountedBytes:refs?SHARED_WATER_NORMAL_ATLAS_BYTES:0};}

/** CPU mirror of shader canonical phase wrapping, used to guard rebase seams. */
export function canonicalWaterAtlasUv(x:number,z:number,scale=1){const wrap=(v:number)=>((v%WATER_NORMAL_CANONICAL_PERIOD_M)+WATER_NORMAL_CANONICAL_PERIOD_M)%WATER_NORMAL_CANONICAL_PERIOD_M;return [wrap(x)*scale/WATER_NORMAL_ATLAS_METRES_PER_REPEAT,wrap(z)*scale/WATER_NORMAL_ATLAS_METRES_PER_REPEAT] as const;}
