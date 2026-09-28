import * as THREE from 'three';

/** Byte accounting for forest-owned Three.js resources.
 *
 * These values describe typed-array allocations and estimated texture storage;
 * they do not measure driver padding, shader/program state, or browser/GPU
 * allocator overhead. Shared attributes, backing buffers, textures, and image
 * sources are counted once per ownership scope.
 */
export type ForestBufferFootprint={geometryBytes:number;instanceBytes:number};
export type ForestTextureFootprint={decodedCpuBytes:number;gpuEstimateBytes:number;textureCount:number;imageSourceCount:number};
export type ForestMemoryFootprint={geometryCpuBytes:number;geometryGpuEstimateBytes:number;instanceCpuBytes:number;instanceGpuEstimateBytes:number;
  decodedTextureCpuBytes:number;gpuTextureEstimateBytes:number;embeddedImageFileBytes:number;geometryCount:number;textureCount:number;
  imageSourceCount:number;estimatedGpuBytes:number;retainedCpuBytes:number};

type ArrayView=ArrayBufferView&{buffer:ArrayBufferLike};
type BufferAttributeLike={array?:ArrayView;data?:{array?:ArrayView}};
type GeometryLike={attributes?:Record<string,BufferAttributeLike>;index?:BufferAttributeLike|null};
type MeshLike={geometry:GeometryLike;instanceMatrix?:BufferAttributeLike|null;instanceColor?:BufferAttributeLike|null};
type TextureImageLike={width?:number;height?:number;naturalWidth?:number;naturalHeight?:number;videoWidth?:number;videoHeight?:number;data?:ArrayView};
type TextureLike={image?:unknown;mipmaps?:readonly unknown[];generateMipmaps?:boolean;minFilter?:number;format?:number;type?:number};

function isImageLike(value:unknown):value is TextureImageLike{return !!value&&typeof value==='object';}

function arrayView(attribute:BufferAttributeLike|undefined|null){return attribute?.array??attribute?.data?.array??null;}
function imageSize(image:TextureImageLike|undefined|null){
  if(!image)return {width:0,height:0};
  return {width:image.width??image.naturalWidth??image.videoWidth??0,height:image.height??image.naturalHeight??image.videoHeight??0};
}
function imageBytes(image:TextureImageLike){
  if(image.data&&Number.isSafeInteger(image.data.byteLength))return image.data.byteLength;
  const {width,height}=imageSize(image);return Number.isSafeInteger(width*height*4)&&width>0&&height>0?width*height*4:0;
}
function mipFilter(filter:number|undefined){return filter===THREE.NearestMipmapNearestFilter||filter===THREE.NearestMipmapLinearFilter||
  filter===THREE.LinearMipmapNearestFilter||filter===THREE.LinearMipmapLinearFilter;}
function pixelBytes(texture:TextureLike){
  // Forest family maps are RGBA8 glTF PNGs. Recognize the common compact
  // formats too so shared helpers remain correct for diagnostic fixtures.
  const channelCount=texture.format===THREE.AlphaFormat||texture.format===THREE.RedFormat||texture.format===THREE.RedIntegerFormat?1:
    texture.format===THREE.RGFormat||texture.format===THREE.RGIntegerFormat?2:texture.format===THREE.RGBFormat?3:4;
  const bytesPerChannel=texture.type===THREE.FloatType?4:texture.type===THREE.HalfFloatType?2:1;
  return channelCount*bytesPerChannel;
}
function gpuTextureEstimate(texture:TextureLike){
  const base=isImageLike(texture.image)?texture.image:null;if(!base)return 0;
  const {width,height}=imageSize(base);if(width<=0||height<=0)return 0;
  const bytesPerPixel=pixelBytes(texture),levels=(texture.mipmaps??[]).filter(isImageLike);
  if(levels.length){
    const sizes=levels.map(imageSize);if(!sizes.some(size=>size.width===width&&size.height===height))sizes.unshift({width,height});
    return sizes.reduce((sum,size)=>sum+size.width*size.height*bytesPerPixel,0);
  }
  let total=width*height*bytesPerPixel;
  if(texture.generateMipmaps!==false&&mipFilter(texture.minFilter)){
    let w=width,h=height;while(w>1||h>1){w=Math.max(1,w>>1);h=Math.max(1,h>>1);total+=w*h*bytesPerPixel;}
  }
  return total;
}

/** Count unique owned buffer allocations across arbitrary related meshes. */
export function forestMeshBufferFootprint(meshes:Iterable<MeshLike>,extraGeometries:Iterable<GeometryLike>=[]):ForestBufferFootprint&{totalBytes:number;geometryCount:number}{
  const buffers=new Set<ArrayBufferLike>(),geometryBuffers=new Set<ArrayBufferLike>(),instanceBuffers=new Set<ArrayBufferLike>(),geometries=new Set<GeometryLike>();
  let geometryBytes=0,instanceBytes=0;
  const add=(attribute:BufferAttributeLike|undefined|null,instance:boolean)=>{
    const view=arrayView(attribute);if(!view||buffers.has(view.buffer))return;buffers.add(view.buffer);
    const target=instance?instanceBuffers:geometryBuffers;target.add(view.buffer);
    if(instance)instanceBytes+=view.buffer.byteLength;else geometryBytes+=view.buffer.byteLength;
  };
  const addGeometry=(geometry:GeometryLike)=>{
    if(geometries.has(geometry))return;geometries.add(geometry);
    for(const [name,attribute] of Object.entries(geometry.attributes??{}))add(attribute,name.startsWith('instance')||name.startsWith('tree'));
    add(geometry.index,false);
  };
  for(const geometry of extraGeometries)addGeometry(geometry);
  for(const mesh of meshes){
    addGeometry(mesh.geometry);add(mesh.instanceMatrix,true);add(mesh.instanceColor,true);
  }
  return {geometryBytes,instanceBytes,totalBytes:geometryBytes+instanceBytes,geometryCount:geometries.size};
}

/** Count decoded CPU image sources separately from the estimated GPU texture
 * storage. Different texture objects can upload the same image twice, while a
 * shared texture referenced by multiple materials uploads only once.
 */
export function forestTextureFootprint(textures:Iterable<TextureLike>):ForestTextureFootprint{
  const uniqueTextures=new Set<TextureLike>(),imageSources=new Set<object>(),dataBuffers=new Set<ArrayBufferLike>();
  let decodedCpuBytes=0,gpuEstimateBytes=0;
  for(const texture of textures){
    if(uniqueTextures.has(texture))continue;uniqueTextures.add(texture);
    gpuEstimateBytes+=gpuTextureEstimate(texture);
    for(const source of [texture.image,...(texture.mipmaps??[])]){
      if(!isImageLike(source)||imageSources.has(source))continue;imageSources.add(source);
      const data=source.data;
      if(data){if(!dataBuffers.has(data.buffer)){dataBuffers.add(data.buffer);decodedCpuBytes+=data.buffer.byteLength;}}
      else decodedCpuBytes+=imageBytes(source);
    }
  }
  return {decodedCpuBytes,gpuEstimateBytes,textureCount:uniqueTextures.size,imageSourceCount:imageSources.size};
}

export function forestMemoryFootprint(input:{legacyMeshes:Iterable<MeshLike>;familyGeometries:Iterable<GeometryLike>;
  familyMeshes:Iterable<MeshLike>;familyTextures:Iterable<TextureLike>;embeddedImageFileBytes:number;farAtlasResidentBytes:number}):ForestMemoryFootprint{
  const geometry=forestMeshBufferFootprint([...input.legacyMeshes,...input.familyMeshes],input.familyGeometries);
  const textures=forestTextureFootprint(input.familyTextures);
  const geometryCpuBytes=geometry.geometryBytes,geometryGpuEstimateBytes=geometry.geometryBytes;
  const instanceCpuBytes=geometry.instanceBytes,instanceGpuEstimateBytes=geometry.instanceBytes;
  const estimatedGpuBytes=geometryGpuEstimateBytes+instanceGpuEstimateBytes+textures.gpuEstimateBytes+input.farAtlasResidentBytes;
  const retainedCpuBytes=geometryCpuBytes+instanceCpuBytes+textures.decodedCpuBytes;
  return {geometryCpuBytes,geometryGpuEstimateBytes,instanceCpuBytes,instanceGpuEstimateBytes,
    decodedTextureCpuBytes:textures.decodedCpuBytes,gpuTextureEstimateBytes:textures.gpuEstimateBytes,
    embeddedImageFileBytes:input.embeddedImageFileBytes,geometryCount:geometry.geometryCount,textureCount:textures.textureCount,
    imageSourceCount:textures.imageSourceCount,estimatedGpuBytes,retainedCpuBytes};
}
