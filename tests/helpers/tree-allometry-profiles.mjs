import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {deriveTreeCanopyMetadata} from '../../src/tree-canopy-profile.ts';
import {forestStructuralVariants,forestVariantEnvelope} from '../../src/tree-structural-variant.ts';
import {treeAllometryReference} from '../../src/tree-allometry.ts';
import {FOREST_CARD_COMPENSATION} from '../../src/forest-tree-family-library.ts';
import {treeLodCardScale} from '../../src/tree-asset.ts';

/** Packaged Oak/Pine GLB vertex sets as Three geometries (measurement only). */
const FILES={branching:['oak-lod0','oak-lod1'],spire:['conifer-lod0','conifer-lod1']};
function floatAccessor(doc,binary,index){
  const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
  const start=(v.byteOffset??0)+(a.byteOffset??0),stride=v.byteStride??n*4,out=new Float32Array(a.count*n),view=new DataView(binary.buffer,binary.byteOffset,binary.byteLength);
  for(let i=0;i<a.count;i++)for(let c=0;c<n;c++)out[i*n+c]=view.getFloat32(start+i*stride+c*4,true);
  return out;
}
function indexAccessor(doc,binary,index){
  const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],start=(v.byteOffset??0)+(a.byteOffset??0),view=new DataView(binary.buffer,binary.byteOffset,binary.byteLength);
  const size=a.componentType===5125?4:a.componentType===5123?2:1,out=new Uint32Array(a.count);
  for(let i=0;i<a.count;i++)out[i]=size===4?view.getUint32(start+i*4,true):size===2?view.getUint16(start+i*2,true):view.getUint8(start+i);
  return out;
}
const cache=new Map();
export async function familyGeometries(kind,lod){
  const key=`${kind}/${lod}`;if(cache.has(key))return cache.get(key);
  const bytes=new Uint8Array(await readFile(new URL(`../../public/assets/forest/desktop-v1/${kind}/${FILES[kind][lod]}.glb`,import.meta.url)));
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),jsonEnd=20+view.getUint32(12,true);
  const doc=JSON.parse(new TextDecoder().decode(bytes.subarray(20,jsonEnd))),binary=bytes.subarray(jsonEnd+8,jsonEnd+8+view.getUint32(jsonEnd,true));
  const geometries=doc.meshes[0].primitives.map(p=>{
    const g=new THREE.BufferGeometry();
    for(const [name,accessor,size] of [['position','POSITION',3],['_leaf_pivot','_LEAF_PIVOT',3],['_branch_level','_BRANCH_LEVEL',1],['_wind','_WIND',1]])
      g.setAttribute(name,new THREE.BufferAttribute(floatAccessor(doc,binary,p.attributes[accessor]),size));
    if(p.indices!==undefined)g.setIndex(new THREE.BufferAttribute(indexAccessor(doc,binary,p.indices),1));
    return g;
  });
  cache.set(key,geometries);return geometries;
}
/** The reference the loader derives for the library's shipped family options
 * (full structural pool, card compensation). The silhouette-matched LOD1 card
 * scale needs a canvas; its area-preserving upper bound is used instead. */
export async function familyReference(kind){
  const [lod0,lod1]=await Promise.all([familyGeometries(kind,0),familyGeometries(kind,1)]);
  const p0=deriveTreeCanopyMetadata(lod0),p1=deriveTreeCanopyMetadata(lod1),envelope=forestVariantEnvelope(forestStructuralVariants(kind));
  const lod1CardScale=treeLodCardScale(p0.profile,p1.profile);
  return {profiles:[p0,p1],lod1CardScale,reference:treeAllometryReference(p0.profile,p1.profile,
    {variantScale:envelope.scale,variantLeanFraction:envelope.leanFraction,cardScaleMax:Math.max(1,lod1CardScale)*FOREST_CARD_COMPENSATION.maxScale})};
}
