/** Opt-in measured prototype: one indexed draw perLOD, including unique genomes.
 * Geometry is admitted off-frame into fixed slots; only poses/root palettes
 * change during rendering. No production renderer is switched by this module.
 */
import * as THREE from 'three';
import {QUADRUPED_BONE_PARENTS,type QuadrupedBodyData,type QuadrupedPlan} from './fauna-body-plan.ts';
import {quadrupedPoseAt,type QuadrupedPose} from './fauna-locomotion.ts';
import type {FaunaNearCandidate} from './fauna-near-rig.ts';
import type {CreatureGenome} from './fauna-runtime.ts';
import {createFaunaMaterial} from './fauna-material.ts';
export const FAUNA_SKINNED_BATCH_VERSION='fauna-skinned-batch-prototype-1';
export const FAUNA_PALETTE_BONES=QUADRUPED_BONE_PARENTS.length;
export function faunaSkinnedGeometryKey(genome:CreatureGenome,lodVersion:string,level:number):string {
  return JSON.stringify([FAUNA_SKINNED_BATCH_VERSION,lodVersion,level,genome]);
}
/** Same compose/world/inverse-bind arithmetic as the detached near skeleton.
 * Workspace allocated once; the output includes Float32 rounding exactly where
 * THREE.Skeleton.update writes its boneMatrices. */
export class FaunaBonePaletteWriter {
  private readonly local=new THREE.Matrix4();
  private readonly inverse=new THREE.Matrix4();
  private readonly product=new THREE.Matrix4();
  private readonly worlds=Array.from({length:FAUNA_PALETTE_BONES},()=>new THREE.Matrix4());
  private readonly position=new THREE.Vector3();
  private readonly rotation=new THREE.Quaternion();
  private readonly scale=new THREE.Vector3(1,1,1);
  write(plan:QuadrupedPlan,pose:QuadrupedPose,out:Float32Array,offset=0):void {
    if(plan.bones.length!==FAUNA_PALETTE_BONES||out.length<offset+FAUNA_PALETTE_BONES*16)throw new Error('Invalid fauna palette size');
    for(let i=0;i<FAUNA_PALETTE_BONES;i++){
      this.position.fromArray(pose.positions,i*3);this.rotation.fromArray(pose.quaternions,i*4);
      this.local.compose(this.position,this.rotation,this.scale);
      const parent=QUADRUPED_BONE_PARENTS[i];
      if(parent>=0)this.worlds[i].multiplyMatrices(this.worlds[parent],this.local);else this.worlds[i].copy(this.local);
      const rest=plan.bones[i].rest;this.inverse.makeTranslation(-rest[0],-rest[1],-rest[2]);
      this.product.multiplyMatrices(this.worlds[i],this.inverse).toArray(out,offset+i*16);
    }
  }
  /** Includes the real canonical locomotion solver for honest cost measurements.
   * That solver currently allocates; palette-only timings must not hide its cost. */
  pose(candidate:FaunaNearCandidate,plan:QuadrupedPlan,out:Float32Array,offset=0):QuadrupedPose {
    const pose=quadrupedPoseAt(plan,candidate.member,candidate.activity,candidate.ground,candidate.rigSeconds,{behaviour:candidate.behaviour});
    this.write(plan,pose,out,offset);return pose;
  }
}
export interface FaunaSkinnedBatchOptions {
  capacity?:number;maxVerticesPerAnimal?:number;maxIndicesPerAnimal?:number;maxGeometryEntries?:number;
}
type GeometryRecord={plan:QuadrupedPlan;positions:Float32Array;normals:Float32Array;colors:Uint8Array;
  skinIndex:Uint8Array;skinWeight:Uint8Array;index:Uint16Array|Uint32Array;bytes:number;uses:number};
type Slot={id:string;key:string;roughness:number};
const HEADER=`
attribute float faunaActor;
attribute vec4 skinIndex;
attribute vec4 skinWeight;
uniform sampler2D faunaBones;
uniform sampler2D faunaRoots;
varying vec3 vFaunaMeta;
mat4 faunaBone(float actor,float bone){int x=int(bone)*4;int y=int(actor);return mat4(
 texelFetch(faunaBones,ivec2(x,y),0),texelFetch(faunaBones,ivec2(x+1,y),0),
 texelFetch(faunaBones,ivec2(x+2,y),0),texelFetch(faunaBones,ivec2(x+3,y),0));}
`;
function texture(data:Float32Array,width:number,height:number){
  const t=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);
  t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;t.flipY=false;t.internalFormat='RGBA32F';t.needsUpdate=true;return t;
}
/** Fixed vertex/index blocks mean inactive cachedslots still issue degenerate/
 * clipped work. diagnostics.reservedTriangles reports that overhead honestly.
 * This is one drawcall percolour/shadow pass, NOT512 separate SkinnedMeshes. */
export class FaunaSkinnedBatch {
  readonly group=new THREE.Group();readonly mesh:THREE.Mesh;
  readonly capacity:number;readonly maxVerticesPerAnimal:number;readonly maxIndicesPerAnimal:number;
  readonly boneMatrices:Float32Array;readonly rootMatrices:Float32Array;
  readonly boneTexture:THREE.DataTexture;readonly rootTexture:THREE.DataTexture;
  private readonly geometry=new THREE.BufferGeometry();
  private readonly cache=new Map<string,GeometryRecord>();private readonly members=new Map<string,number>();
  private readonly slots:(Slot|null)[];private readonly seen:Uint32Array;private frame=0;private highWater=0;
  private readonly maxGeometryEntries:number;private boneDirty=false;private rootDirty=false;private disposed=false;
  private active=0;private actualTriangles=0;private geometryUploads=0;private rejected=0;private uploadBytes=0;
  constructor(options:FaunaSkinnedBatchOptions={}){
    this.capacity=options.capacity??512;this.maxVerticesPerAnimal=options.maxVerticesPerAnimal??1500;
    this.maxIndicesPerAnimal=options.maxIndicesPerAnimal??4500;this.maxGeometryEntries=options.maxGeometryEntries??512;
    for(const [name,value,max] of [['capacity',this.capacity,512],['vertices',this.maxVerticesPerAnimal,4096],
      ['indices',this.maxIndicesPerAnimal,12288],['cache',this.maxGeometryEntries,512]] as const)
      if(!Number.isSafeInteger(value)||value<1||value>max)throw new Error(`Invalid fauna batch ${name}`);
    if(this.maxIndicesPerAnimal%3)throw new Error('Fauna indexbudget must contain whole triangles');
    const vertices=this.capacity*this.maxVerticesPerAnimal;
    const attrs={position:new THREE.BufferAttribute(new Float32Array(vertices*3),3),normal:new THREE.BufferAttribute(new Float32Array(vertices*3),3),
      color:new THREE.BufferAttribute(new Uint8Array(vertices*3),3,true),skinIndex:new THREE.BufferAttribute(new Uint8Array(vertices*4),4),
      skinWeight:new THREE.BufferAttribute(new Uint8Array(vertices*4),4,true),faunaActor:new THREE.BufferAttribute(new Uint16Array(vertices),1)};
    for(const [name,attr] of Object.entries(attrs))this.geometry.setAttribute(name,attr);
    this.geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(this.capacity*this.maxIndicesPerAnimal),1));this.geometry.setDrawRange(0,0);
    this.slots=new Array(this.capacity).fill(null);this.seen=new Uint32Array(this.capacity);
    this.boneMatrices=new Float32Array(this.capacity*FAUNA_PALETTE_BONES*16);
    // Four rootmatrixtexels plus (active,roughness,coverage,unused).
    this.rootMatrices=new Float32Array(this.capacity*20);
    this.boneTexture=texture(this.boneMatrices,FAUNA_PALETTE_BONES*4,this.capacity);
    this.rootTexture=texture(this.rootMatrices,5,this.capacity);
    const material=createFaunaMaterial(true);this.attach(material,true);
    const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});this.attach(depth,false);
    const distance=new THREE.MeshDistanceMaterial();this.attach(distance,false);
    this.mesh=new THREE.Mesh(this.geometry,material);this.mesh.customDepthMaterial=depth;this.mesh.customDistanceMaterial=distance;
    this.mesh.frustumCulled=false;this.mesh.castShadow=true;this.mesh.receiveShadow=true;
    this.mesh.name='Prototype pooled skinned fauna';this.group.add(this.mesh);this.group.userData.prototype=true;
  }
  private attach(material:THREE.Material,lit:boolean){
    material.customProgramCacheKey=()=>FAUNA_SKINNED_BATCH_VERSION+(lit?'/lit':'/shadow');
    material.onBeforeCompile=shader=>{
      shader.uniforms.faunaBones={value:this.boneTexture};shader.uniforms.faunaRoots={value:this.rootTexture};
      shader.vertexShader=HEADER+shader.vertexShader;
      const setup=`
        vec4 actorMeta=texelFetch(faunaRoots,ivec2(4,int(faunaActor)),0);
        if(actorMeta.x<0.5){gl_Position=vec4(2.0,2.0,2.0,1.0);return;}
        vFaunaMeta=actorMeta.yzw;
        mat4 actorRoot=mat4(texelFetch(faunaRoots,ivec2(0,int(faunaActor)),0),texelFetch(faunaRoots,ivec2(1,int(faunaActor)),0),
          texelFetch(faunaRoots,ivec2(2,int(faunaActor)),0),texelFetch(faunaRoots,ivec2(3,int(faunaActor)),0));
        mat4 b0=faunaBone(faunaActor,skinIndex.x),b1=faunaBone(faunaActor,skinIndex.y),b2=faunaBone(faunaActor,skinIndex.z),b3=faunaBone(faunaActor,skinIndex.w);
      `;
      shader.vertexShader=shader.vertexShader.replace('void main() {','void main() {'+setup);
      shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
        mat4 skinNormal=skinWeight.x*b0+skinWeight.y*b1+skinWeight.z*b2+skinWeight.w*b3;
        objectNormal=(skinNormal*vec4(objectNormal,0.0)).xyz;
        mat3 rootNormal=mat3(actorRoot);
        objectNormal/=vec3(dot(rootNormal[0],rootNormal[0]),dot(rootNormal[1],rootNormal[1]),dot(rootNormal[2],rootNormal[2]));
        objectNormal=rootNormal*objectNormal;`);
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        vec4 vertex=vec4(transformed,1.0),skinned=vec4(0.0);
        skinned+=b0*vertex*skinWeight.x;skinned+=b1*vertex*skinWeight.y;
        skinned+=b2*vertex*skinWeight.z;skinned+=b3*vertex*skinWeight.w;
        transformed=(actorRoot*skinned).xyz;`);
      shader.fragmentShader='varying vec3 vFaunaMeta;\n'+shader.fragmentShader;
      if(lit)shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=vFaunaMeta.x;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
        if(vFaunaMeta.y<1.0&&fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))>=vFaunaMeta.y)discard;`);
    };
  }
  /** Exact geometry key must contain fullgenome+LODversion. Only supplied
   * worker-built arrays are copied; no mesh generation is performed here. */
  registerGeometry(key:string,data:QuadrupedBodyData):boolean{
    if(this.disposed||!key){this.rejected++;return false;}
    const existing=this.cache.get(key);
    if(existing){
      if(JSON.stringify(existing.plan)!==JSON.stringify(data.plan)){this.rejected++;return false;}
      for(const name of ['positions','normals','colors','skinIndex','skinWeight','index'] as const){
        const a=existing[name],b=data[name];if(a.length!==b.length){this.rejected++;return false;}
        for(let i=0;i<a.length;i++)if(!Object.is(a[i],b[i])){this.rejected++;return false;}
      }
      return true;
    }
    if(this.cache.size>=this.maxGeometryEntries){this.rejected++;return false;}
    const v=data.positions.length/3;
    if(!Number.isInteger(v)||v<1||v>this.maxVerticesPerAnimal||data.index.length>this.maxIndicesPerAnimal||data.index.length%3||
      data.plan.bones.length!==FAUNA_PALETTE_BONES||data.normals.length!==v*3||data.colors.length!==v*3||
      data.skinIndex.length!==v*4||data.skinWeight.length!==v*4){this.rejected++;return false;}
    for(const i of data.index)if(i>=v){this.rejected++;return false;}
    for(let i=0;i<v;i++){
      let sum=0;for(let j=0;j<4;j++){const n=i*4+j;if(data.skinIndex[n]>=FAUNA_PALETTE_BONES){this.rejected++;return false;}sum+=data.skinWeight[n];}
      if(sum!==255){this.rejected++;return false;}
    }
    for(const a of [data.positions,data.normals])for(const n of a)if(!Number.isFinite(n)){this.rejected++;return false;}
    const record:GeometryRecord={plan:data.plan,positions:data.positions.slice(),normals:data.normals.slice(),colors:data.colors.slice(),
      skinIndex:data.skinIndex.slice(),skinWeight:data.skinWeight.slice(),index:data.index.slice(),bytes:0,uses:0};
    record.bytes=record.positions.byteLength+record.normals.byteLength+record.colors.byteLength+record.skinIndex.byteLength+record.skinWeight.byteLength+record.index.byteLength;
    this.cache.set(key,record);return true;
  }
  prepareAnimal(memberId:string,key:string):boolean{
    const data=this.cache.get(key);if(this.disposed||!data||!memberId){this.rejected++;return false;}
    let slot=this.members.get(memberId);
    if(slot!==undefined&&this.slots[slot]?.key===key)return true;
    if(slot===undefined){slot=this.slots.findIndex(s=>s===null);if(slot<0){this.rejected++;return false;}this.members.set(memberId,slot);}
    const old=this.slots[slot];if(old)this.cache.get(old.key)!.uses--;
    this.slots[slot]={id:memberId,key,roughness:data.plan.genome.appearance?.roughness??.86};data.uses++;
    const base=slot*this.maxVerticesPerAnimal;
    for(const name of ['position','normal','color','skinIndex','skinWeight'] as const){
      const attr=this.geometry.getAttribute(name) as THREE.BufferAttribute,source=data[name==='position'?'positions':name==='normal'?'normals':name==='color'?'colors':name];
      (attr.array as Float32Array|Uint8Array).set(source,base*attr.itemSize);attr.addUpdateRange(base*attr.itemSize,source.length);attr.needsUpdate=true;
    }
    const actor=this.geometry.getAttribute('faunaActor') as THREE.BufferAttribute;
    (actor.array as Uint16Array).fill(slot,base,base+this.maxVerticesPerAnimal);actor.addUpdateRange(base,this.maxVerticesPerAnimal);actor.needsUpdate=true;
    const index=this.geometry.index!,indices=index.array as Uint32Array,io=slot*this.maxIndicesPerAnimal;
    indices.fill(base,io,io+this.maxIndicesPerAnimal);for(let i=0;i<data.index.length;i++)indices[io+i]=base+data.index[i];
    index.addUpdateRange(io,this.maxIndicesPerAnimal);index.needsUpdate=true;
    this.highWater=Math.max(this.highWater,slot+1);this.geometry.setDrawRange(0,this.highWater*this.maxIndicesPerAnimal);this.geometryUploads++;return true;
  }
  releaseAnimal(memberId:string):void{
    const slot=this.members.get(memberId);if(slot===undefined)return;
    this.cache.get(this.slots[slot]!.key)!.uses--;this.slots[slot]=null;this.members.delete(memberId);
    this.rootMatrices[slot*20+16]=0;this.rootDirty=true;
  }
  releaseGeometry(key:string):boolean{const data=this.cache.get(key);if(!data||data.uses)return false;return this.cache.delete(key);}
  beginFrame(origin:THREE.Vector3):void{this.group.position.copy(origin);this.frame++;this.active=0;this.actualTriangles=0;this.uploadBytes=0;}
  submit(memberId:string,root:THREE.Matrix4,bones:Float32Array,options?:{roughness?:number;coverage?:number}):boolean{
    const slot=this.members.get(memberId);if(slot===undefined||this.disposed||bones.length!==FAUNA_PALETTE_BONES*16)return false;
    if(this.seen[slot]===this.frame)return false;
    const p=slot*20,b=slot*FAUNA_PALETTE_BONES*16;
    for(let i=0;i<16;i++){const n=Math.fround(root.elements[i]);if(!Object.is(this.rootMatrices[p+i],n)){this.rootMatrices[p+i]=n;this.rootDirty=true;}}
    for(let i=0;i<bones.length;i++)if(!Object.is(this.boneMatrices[b+i],bones[i])){this.boneMatrices[b+i]=bones[i];this.boneDirty=true;}
    const roughness=options?.roughness??this.slots[slot]!.roughness,coverage=options?.coverage??1;
    for(let i=0;i<4;i++){const n=Math.fround(i===0?1:i===1?roughness:i===2?coverage:0);if(!Object.is(this.rootMatrices[p+16+i],n)){this.rootMatrices[p+16+i]=n;this.rootDirty=true;}}
    this.seen[slot]=this.frame;this.active++;this.actualTriangles+=this.cache.get(this.slots[slot]!.key)!.index.length/3;return true;
  }
  endFrame():void{
    for(let i=0;i<this.highWater;i++)if(this.seen[i]!==this.frame&&this.rootMatrices[i*20+16]!==0){this.rootMatrices[i*20+16]=0;this.rootDirty=true;}
    if(this.boneDirty){this.boneTexture.needsUpdate=true;this.uploadBytes+=this.boneMatrices.byteLength;}
    if(this.rootDirty){this.rootTexture.needsUpdate=true;this.uploadBytes+=this.rootMatrices.byteLength;}
    this.boneDirty=this.rootDirty=false;this.mesh.visible=this.active>0;
  }
  geometryFor(key:string){return this.cache.get(key)?.plan??null;}
  diagnostics(){
    let geometryBytes=this.geometry.index!.array.byteLength,cacheBytes=0;
    for(const a of Object.values(this.geometry.attributes))geometryBytes+=a.array.byteLength;
    for(const record of this.cache.values())cacheBytes+=record.bytes;
    return {prototype:true,active:this.active,prepared:this.members.size,geometryEntries:this.cache.size,geometryUploads:this.geometryUploads,
      triangles:this.actualTriangles,reservedTriangles:this.highWater*this.maxIndicesPerAnimal/3,drawsPerPass:this.active?1:0,
      geometryBytes,paletteBytes:this.boneMatrices.byteLength+this.rootMatrices.byteLength,cacheBytes,paletteUploadBytes:this.uploadBytes,rejected:this.rejected};
  }
  dispose():void{
    if(this.disposed)return;this.disposed=true;this.geometry.dispose();(this.mesh.material as THREE.Material).dispose();
    this.mesh.customDepthMaterial?.dispose();this.mesh.customDistanceMaterial?.dispose();this.boneTexture.dispose();this.rootTexture.dispose();this.group.clear();this.cache.clear();this.members.clear();
  }
}
