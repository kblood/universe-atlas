/** Composition-only opt-in. One indexed batch retains the existing actor pose /
 * shadow paths, with per-actor field parameters and per-vertex colour basis.
 * No edits to the existing renderer, source body, genome or population. */
import * as THREE from 'three';
import {FaunaSkinnedBatch,FAUNA_PALETTE_BONES,type FaunaSkinnedBatchOptions} from './fauna-skinned-batch.ts';
import {FAUNA_PLANET_CRISP_VERSION,FAUNA_PLANET_CRISP_RAW_VERSION,FAUNA_PLANET_CRISP_BATCH_GLSL,FAUNA_PLANET_CRISP_BATCH_VARYINGS,type buildFaunaPlanetCrispData} from './fauna-planet-crisp.ts';
import {FAUNA_PLANET_CRISP_PACKED_VERSION,FAUNA_PLANET_CRISP_RAW_PACKED_VERSION,type FaunaPlanetCrispPackedData} from './fauna-planet-crisp-packed.ts';
import type {FaunaPackedRenderPayload} from './fauna-packed-worker-adapter.ts';
type Data=ReturnType<typeof buildFaunaPlanetCrispData>|FaunaPlanetCrispPackedData|FaunaPackedRenderPayload;
type BasisArray=Float32Array|Uint8Array|Int16Array;
type Basis={version:string;c0:BasisArray|null;c1:BasisArray|null;c2:BasisArray|null;sample:Float32Array|null;descriptor:Data['descriptor'];packingScale:number;clip:Uint8Array|null;bytes:number;vertices:number;ownerSlot:number};
export interface FaunaPlanetCrispBatchOptions extends FaunaSkinnedBatchOptions {cacheMode?:'retain-source'|'atlas-owned';basisStorage?:'float32'|'packed-delta16'|'packed-snorm16'}
export class FaunaPlanetCrispBatch {
  private base:FaunaSkinnedBatch;readonly group:THREE.Group;readonly mesh:THREE.Mesh;
  readonly estimatedBufferBytes:number;readonly maxBufferBytes:number;
  private cache=new Map<string,Basis>();private members=new Map<string,{slot:number;key:string}>();private slots:(string|null)[];
  private params:Float32Array;private paramsTexture:THREE.DataTexture;
  private attrs:{coatL0:THREE.BufferAttribute;coatL1:THREE.BufferAttribute;coatL2:THREE.BufferAttribute;coatSample:THREE.BufferAttribute;coatClip:THREE.BufferAttribute};
  private maxEntries:number;private maxVertices:number;private capacity:number;private disposed=false;
  readonly basisStorage:'float32'|'packed-delta16'|'packed-snorm16';
  readonly cacheMode:'retain-source'|'atlas-owned';private pendingKey:string|null=null;
  constructor(options:FaunaPlanetCrispBatchOptions={}){
    this.cacheMode=options.cacheMode??'retain-source';if(!['retain-source','atlas-owned'].includes(this.cacheMode))throw new Error('planet crisp batch: invalid cache mode');
    const compact=this.cacheMode==='atlas-owned';this.basisStorage=options.basisStorage??'float32';if(!['float32','packed-delta16','packed-snorm16'].includes(this.basisStorage))throw new Error('planet crisp batch: invalid basis storage');
    const packed=this.basisStorage!=='float32',rawPacked=this.basisStorage==='packed-snorm16',basisBytes=rawPacked?35:packed?32:53;
    this.capacity=options.capacity??128;this.maxVertices=options.maxVerticesPerAnimal??500;this.maxEntries=options.maxGeometryEntries??(compact?Math.min(512,this.capacity+1):8);
    const indices=options.maxIndicesPerAnimal??1500,vertices=this.capacity*this.maxVertices,indexBytes=vertices<=65535?2:4;this.maxBufferBytes=options.maxBufferBytes??16*1024*1024;
    for(const [value,max] of [[this.capacity,512],[this.maxVertices,4096],[this.maxEntries,512],[indices,12288]])if(!Number.isSafeInteger(value)||value<1||value>max)throw new Error('planet crisp batch: bounded integer capacities required');
    const ring=options.paletteRingSize??1,paletteCopies=ring===1?2:1+2*ring;
    const baseEstimate=2*(vertices*37+this.capacity*indices*indexBytes)+paletteCopies*this.capacity*(FAUNA_PALETTE_BONES*16+20)*4+this.capacity*7+(compact?1:this.maxEntries)*(this.maxVertices*35+indices*4);
    const extraEstimate=vertices*basisBytes*2+(compact?1:this.maxEntries)*this.maxVertices*basisBytes+this.capacity*12*4*2;
    this.estimatedBufferBytes=baseEstimate+extraEstimate;
    if(!Number.isSafeInteger(this.maxBufferBytes)||this.maxBufferBytes<1||this.estimatedBufferBytes>this.maxBufferBytes)throw new Error(`planet crisp batch: composite typed budget exceeded ${this.estimatedBufferBytes} > ${this.maxBufferBytes}`);
    this.base=new FaunaSkinnedBatch({...options,maxGeometryEntries:this.maxEntries});
    if(compact&&(this.base as FaunaSkinnedBatch&{cacheMode?:string}).cacheMode!=='atlas-owned'){this.base.dispose();throw new Error('planet crisp batch: base atlas-owned cache capability required');}
    if(this.base.estimatedBufferBytes+extraEstimate>this.maxBufferBytes){this.base.dispose();throw new Error('planet crisp batch: actual base/composite budget exceeded');}
    this.group=this.base.group;this.mesh=this.base.mesh;
    this.slots=new Array(this.capacity).fill(null);this.params=new Float32Array(this.capacity*12);
    this.paramsTexture=new THREE.DataTexture(this.params,3,this.capacity,THREE.RGBAFormat,THREE.FloatType);this.paramsTexture.internalFormat='RGBA32F';this.paramsTexture.minFilter=this.paramsTexture.magFilter=THREE.NearestFilter;this.paramsTexture.generateMipmaps=false;this.paramsTexture.flipY=false;this.paramsTexture.needsUpdate=true;
    this.attrs={coatL0:new THREE.BufferAttribute(rawPacked?new Int16Array(vertices*3):packed?new Uint8Array(vertices*3):new Float32Array(vertices*3),3,packed),coatL1:new THREE.BufferAttribute(packed?new Int16Array(vertices*3):new Float32Array(vertices*3),3,packed),coatL2:new THREE.BufferAttribute(packed?new Int16Array(vertices*3):new Float32Array(vertices*3),3,packed),coatSample:new THREE.BufferAttribute(new Float32Array(vertices*4),4),coatClip:new THREE.BufferAttribute(new Uint8Array(vertices),1)};
    for(const [name,attr] of Object.entries(this.attrs))this.mesh.geometry.setAttribute(name,attr);
    const material=this.mesh.material as THREE.Material,previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey;
    material.customProgramCacheKey=()=>previousKey.call(material)+`/${FAUNA_PLANET_CRISP_VERSION}/batched/${this.basisStorage}`;
    material.onBeforeCompile=(shader,renderer)=>{
      previous.call(material,shader,renderer);shader.uniforms.planetCoatParams={value:this.paramsTexture};
      shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\nattribute vec3 coatL0;attribute vec3 coatL1;attribute vec3 coatL2;attribute vec4 coatSample;attribute float coatClip;varying vec3 vCoatL0;varying vec3 vCoatL1;varying vec3 vCoatL2;varying vec4 vCoatSample;varying float vCoatClip;uniform sampler2D planetCoatParams;\n${FAUNA_PLANET_CRISP_BATCH_VARYINGS}`);
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
       vCoatL0=coatL0;vCoatL1=coatL1;vCoatL2=coatL2;vCoatSample=coatSample;vCoatClip=coatClip;
       vec4 pc0=texelFetch(planetCoatParams,ivec2(0,int(faunaActor)),0),pc1=texelFetch(planetCoatParams,ivec2(1,int(faunaActor)),0);
       coatSeed=uint(pc0.x)|(uint(pc0.y)<<16u);coatCells=pc0.z;coatThreshold=pc0.w;coatWarp=pc1.x;coatBellyLine=pc1.y;coatCanonicalFootprint=pc1.z;planetCoatCode=uint(pc1.w);`);
      if(packed)shader.vertexShader=shader.vertexShader.replace('vCoatL0=coatL0;vCoatL1=coatL1;vCoatL2=coatL2;',rawPacked?'float basisScale=texelFetch(planetCoatParams,ivec2(2,int(faunaActor)),0).x;vCoatL0=coatL0*basisScale;vCoatL1=(coatL0+coatL1)*basisScale;vCoatL2=(coatL0+coatL1+coatL2)*basisScale;':'vCoatL0=coatL0;vCoatL1=coatL0+coatL1;vCoatL2=coatL0+coatL1+coatL2;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\n${FAUNA_PLANET_CRISP_BATCH_GLSL}`).replace('#include <color_fragment>','diffuseColor.rgb *= planetBatchedCoat();');
    };
  }
  registerGeometry(key:string,data:Data):boolean{
    if(this.disposed||!(this.basisStorage==='packed-snorm16'?[FAUNA_PLANET_CRISP_RAW_PACKED_VERSION]:this.basisStorage==='packed-delta16'?[FAUNA_PLANET_CRISP_PACKED_VERSION]:[FAUNA_PLANET_CRISP_VERSION,FAUNA_PLANET_CRISP_RAW_VERSION]).includes(data.version)||data.sourceGeometry.plan!==('source' in data?data.source.plan:data.sourcePlan))return false;
    const d=data.descriptor;if(d&&(!Number.isInteger(d.code)||d.code<1||d.code>7||!Number.isSafeInteger(d.seed)||d.seed<0||d.seed>4294967295||!Number.isFinite(d.cells)||d.cells<=0||![d.threshold,d.warp,d.bellyLine,d.footprint].every(Number.isFinite)||d.footprint<0))return false;
    const packingScale='packingScale' in data?data.packingScale:1;if(!Number.isFinite(packingScale)||packingScale<1)return false;
    const old=this.cache.get(key);
    if(old){
      if(old.version!==data.version||old.packingScale!==packingScale||JSON.stringify(old.descriptor)!==JSON.stringify(data.descriptor))return false;
      for(const [name,attrName,lanes] of [['c0','coatL0',3],['c1','coatL1',3],['c2','coatL2',3],['sample','coatSample',4],['clip','coatClip',1]] as const){const values=old[name],atlas=this.attrs[attrName].array as BasisArray;if(old.vertices*lanes!==data[name].length)return false;for(let i=0;i<data[name].length;i++)if(!Object.is(values?values[i]:atlas[old.ownerSlot*this.maxVertices*lanes+i],data[name][i]))return false;}
      return this.base.registerGeometry(key,data.sourceGeometry);
    }
    const n=data.sourceGeometry.vertexCount;if(this.cacheMode==='atlas-owned'&&this.pendingKey!==null)return false;
    if(this.cache.size>=this.maxEntries||data.c0.length!==n*3||data.c1.length!==n*3||data.c2.length!==n*3||data.sample.length!==n*4||[data.c0,data.c1,data.c2,data.sample,data.clip].some(a=>!a.every(Number.isFinite))||!(data.sample instanceof Float32Array)||!(data.clip instanceof Uint8Array)||data.clip.length!==n||(this.basisStorage==='float32'?!(data.c0 instanceof Float32Array&&data.c1 instanceof Float32Array&&data.c2 instanceof Float32Array):!((this.basisStorage==='packed-snorm16'?data.c0 instanceof Int16Array:data.c0 instanceof Uint8Array)&&data.c1 instanceof Int16Array&&data.c2 instanceof Int16Array)))return false;
    if(!this.base.registerGeometry(key,data.sourceGeometry))return false;
    const basis={version:data.version,c0:data.c0.slice(),c1:data.c1.slice(),c2:data.c2.slice(),sample:data.sample.slice(),clip:data.clip.slice(),packingScale,descriptor:data.descriptor?{...data.descriptor}:undefined,bytes:data.c0.byteLength+data.c1.byteLength+data.c2.byteLength+data.sample.byteLength+data.clip.byteLength,vertices:n,ownerSlot:-1};this.cache.set(key,basis);if(this.cacheMode==='atlas-owned')this.pendingKey=key;return true;
  }
  prepareAnimal(id:string,key:string):boolean{
    const data=this.cache.get(key);if(this.disposed||!data)return false;const existing=this.members.get(id);if(existing?.key===key)return true;
    const slot=existing?.slot??this.slots.findIndex(id=>id===null);if(slot<0||!this.base.prepareAnimal(id,key))return false;
    if(existing&&existing.key!==key)this.dropOwner(id,existing.key);
    this.slots[slot]=id;this.members.set(id,{slot,key});const start=slot*this.maxVertices;
    for(const [attrName,dataName] of [['coatL0','c0'],['coatL1','c1'],['coatL2','c2'],['coatSample','sample'],['coatClip','clip']] as const){const attr=this.attrs[attrName],array=attr.array as Float32Array,values=data[dataName];array.fill(0,start*attr.itemSize,(start+this.maxVertices)*attr.itemSize);if(values)array.set(values,start*attr.itemSize);else array.copyWithin(start*attr.itemSize,data.ownerSlot*this.maxVertices*attr.itemSize,data.ownerSlot*this.maxVertices*attr.itemSize+data.vertices*attr.itemSize);attr.addUpdateRange(start*attr.itemSize,this.maxVertices*attr.itemSize);attr.needsUpdate=true;}
    const d=data.descriptor;this.params.set(d?[d.seed&65535,d.seed>>>16,d.cells,d.threshold,d.warp,d.bellyLine,d.footprint,d.code,data.packingScale,0,0,0]:[0,0,0,0,0,0,0,0,1,0,0,0],slot*12);this.paramsTexture.needsUpdate=true;if(this.cacheMode==='atlas-owned'){if(data.ownerSlot<0)data.ownerSlot=slot;data.c0=data.c1=data.c2=data.sample=null;data.clip=null;data.bytes=0;if(this.pendingKey===key)this.pendingKey=null;}return true;
  }
  private dropOwner(id:string,key:string):void{
    if(this.cacheMode!=='atlas-owned')return;const record=this.cache.get(key),member=this.members.get(id);if(!record||record.ownerSlot!==member?.slot)return;
    const replacement=[...this.members.entries()].find(([other,m])=>other!==id&&m.key===key);if(replacement)record.ownerSlot=replacement[1].slot;else this.cache.delete(key);
  }
  releaseAnimal(id:string):void{const entry=this.members.get(id);if(!entry)return;this.base.releaseAnimal(id);this.dropOwner(id,entry.key);this.slots[entry.slot]=null;this.members.delete(id);}
  releaseGeometry(key:string):boolean{if(!this.base.releaseGeometry(key))return false;if(this.pendingKey===key)this.pendingKey=null;return this.cache.delete(key);}
  geometryFor(key:string){return this.base.geometryFor(key);}
  beginFrame(origin:THREE.Vector3):void{this.base.beginFrame(origin);}
  submit(...args:Parameters<FaunaSkinnedBatch['submit']>):boolean{return this.base.submit(...args);}
  endFrame():void{this.base.endFrame();}
  get preparedCount(){return this.members.size;}
  get ownedBytes(){let basisCacheBytes=0;for(const data of this.cache.values())basisCacheBytes+=data.bytes;return this.base.ownedBytes+basisCacheBytes+this.params.byteLength*2;}
  diagnostics(){const appearanceVersions=[...new Set([...this.cache.values()].map(data=>data.version))].sort();let basisCacheBytes=0;for(const data of this.cache.values())basisCacheBytes+=data.bytes;return {...this.base.diagnostics(),appearanceVersion:this.basisStorage==='packed-snorm16'?FAUNA_PLANET_CRISP_RAW_PACKED_VERSION:this.basisStorage==='packed-delta16'?FAUNA_PLANET_CRISP_PACKED_VERSION:appearanceVersions.includes(FAUNA_PLANET_CRISP_RAW_VERSION)?FAUNA_PLANET_CRISP_RAW_VERSION:FAUNA_PLANET_CRISP_VERSION,appearanceVersions,basisStorage:this.basisStorage,appearanceCacheMode:this.cacheMode,pendingAppearanceGeometry:this.pendingKey!==null,estimatedCompositeBufferBytes:this.estimatedBufferBytes,maxCompositeBufferBytes:this.maxBufferBytes,basisAtlasCpuBytes:Object.values(this.attrs).reduce((n,a)=>n+a.array.byteLength,0),basisCacheBytes,appearanceMetaCpuBytes:this.params.byteLength};}
  dispose():void{if(this.disposed)return;this.disposed=true;this.base.dispose();this.paramsTexture.dispose();this.cache.clear();this.members.clear();}
}
