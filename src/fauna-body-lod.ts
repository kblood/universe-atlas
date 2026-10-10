/** Prototype only: deterministic LODs derived from an existing loaded body.
 * Construction is synchronous and expensive; schedule it off-frame/worker,
 * then retain results in the bounded source-identity cache. No renderer imports
 * this module. The original body and every surviving attribute stay untouched. */
import type {QuadrupedBodyData} from './fauna-body-plan.ts';
import {buildComposerLodChain,composerLodDeviation,COMPOSER_LOD_VERSION,type ComposerLodOptions,type ComposerLodPart,type ComposerLodStats} from './fauna-composer-lod.ts';

export const FAUNA_BODY_LOD_VERSION='fauna-body-lod-prototype-1';
export const FAUNA_BODY_LOD_TARGETS=Object.freeze([1500,500,200]);
export const FAUNA_BODY_LOD_SOURCE_TRIANGLE_LIMIT=60000;
export const FAUNA_BODY_LOD_SOURCE_VERTEX_LIMIT=40000;
const DEFAULT_OPTIONS=Object.freeze({});
const DEFAULT_OPTIONS_KEY=JSON.stringify([FAUNA_BODY_LOD_TARGETS,true,.02,.05,.08,10,.3,null,null]);
export interface FaunaBodyLodOptions {targets?:readonly number[];reducer?:ComposerLodOptions}
export interface FaunaBodyLodLevel extends QuadrupedBodyData {
  index:Uint32Array;
  target:number;reached:boolean;withinBudget:boolean;
  sourceVertex:Uint32Array;representative:Uint32Array;
  parts:ComposerLodPart[];stats:ComposerLodStats;
  /** Missing semantic parts are explicit; callers must review their policy. */
  droppedFeatures:string[];appendagesPresent:boolean;byteLength:number;
}
export interface FaunaBodyLodChain {
  version:typeof FAUNA_BODY_LOD_VERSION;source:QuadrupedBodyData;
  provenance:{sourceVersion:string;reducerVersion:string;sourceVertices:number;sourceTriangles:number;geometryChecksum:string};
  levels:FaunaBodyLodLevel[];
}
function optionsKey(options:FaunaBodyLodOptions):string {
  if(options===DEFAULT_OPTIONS)return DEFAULT_OPTIONS_KEY;
  const targets=options.targets??FAUNA_BODY_LOD_TARGETS;
  if(!Array.isArray(targets)||!targets.length||targets.length>4||[...targets].some((t,i)=>!Number.isInteger(t)||t<64||t>3000||(i>0&&t>=targets[i-1]!)))throw new Error('fauna body lod: 1..4 decreasing triangle targets in 64..3000 required');
  const o=options.reducer??{};
  if(o.symmetry!==undefined&&typeof o.symmetry!=='boolean')throw new Error('fauna body lod: symmetry must be boolean');
  for(const value of [o.colour,o.gloss,o.skin,o.boundary])if(value!==undefined&&(!Number.isFinite(value)||value<0))throw new Error('fauna body lod: finite non-negative reducer weights required');
  if(o.minFaceCosine!==undefined&&(!Number.isFinite(o.minFaceCosine)||o.minFaceCosine<0||o.minFaceCosine>1))throw new Error('fauna body lod: minFaceCosine must be in 0..1');
  return JSON.stringify([targets,o.symmetry??true,o.colour??.02,o.gloss??.05,o.skin??.08,o.boundary??10,o.minFaceCosine??.3,o.protectedVertices?Array.from(o.protectedVertices):null,o.vertexImportance?Array.from(o.vertexImportance):null]);
}
function validate(source:QuadrupedBodyData):void {
  const n=source.vertexCount,t=source.triangleCount;
  if(!(source.positions instanceof Float32Array)||!(source.normals instanceof Float32Array)||!(source.colors instanceof Uint8Array)||!(source.skinIndex instanceof Uint8Array)||!(source.skinWeight instanceof Uint8Array)||!(source.index instanceof Uint16Array||source.index instanceof Uint32Array))throw new Error('fauna body lod: expected Float32 geometry and Uint8 normalized attributes');
  if(!Number.isInteger(n)||n<4||n>FAUNA_BODY_LOD_SOURCE_VERTEX_LIMIT||!Number.isInteger(t)||t<4||t>FAUNA_BODY_LOD_SOURCE_TRIANGLE_LIMIT)throw new Error('fauna body lod: source exceeds bounded vertex/triangle limits');
  if(source.positions.length!==n*3||source.normals.length!==n*3||source.colors.length!==n*3||source.skinIndex.length!==n*4||source.skinWeight.length!==n*4||source.index.length!==t*3)throw new Error('fauna body lod: inconsistent source attribute counts');
  if(!Number.isInteger(source.bodyVertexCount)||source.bodyVertexCount<4||source.bodyVertexCount>n||!Number.isInteger(source.bodyTriangleCount)||source.bodyTriangleCount<4||source.bodyTriangleCount>t||!Number.isInteger(source.structuralVertexCount)||source.structuralVertexCount<0||!Number.isInteger(source.structuralTriangleCount)||source.structuralTriangleCount<0)throw new Error('fauna body lod: invalid body/structural ranges');
  if(!source.positions.every(Number.isFinite)||!source.normals.every(Number.isFinite))throw new Error('fauna body lod: non-finite source geometry');
  if(source.index.some(v=>v>=n))throw new Error('fauna body lod: source index out of range');
  for(let v=0;v<n;v++){
    let weight=0;for(let k=0;k<4;k++){const i=v*4+k;weight+=source.skinWeight[i]!;if(source.skinWeight[i]!>0&&source.skinIndex[i]!>=source.plan.bones.length)throw new Error('fauna body lod: joint outside source skeleton');}
    if(weight!==255)throw new Error('fauna body lod: source weights must sum to 255');
  }
}
/** Checksums are provenance/change diagnostics, not cryptographic identity.
 * Cache identity uses actual immutable source/array/genome objects. */
function checksum(source:QuadrupedBodyData):string {
  let a=2166136261,b=0x9e3779b9;
  for(const array of [source.positions,source.normals,source.colors,source.skinIndex,source.skinWeight,source.index]){
    const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);
    for(const byte of bytes){a=Math.imul(a^byte,16777619);b=Math.imul(b^byte,0x85ebca6b);}
  }
  return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');
}
/** Existing builder ranges: body, each ear/horn, structural appendages, faces.
 * No guessed morphology or second genome is introduced. */
export function faunaBodyLodSourceParts(source:QuadrupedBodyData):ComposerLodPart[]{
  const parts:ComposerLodPart[]=[{part:'body',label:'body',firstTriangle:0,triangles:source.bodyTriangleCount}];
  let cursor=source.bodyTriangleCount;
  source.plan.appendages.forEach((a,i)=>{
    const triangles=a.kind==='ear'?96:28;
    parts.push({part:a.kind,label:`${a.kind}/${i}`,firstTriangle:cursor,triangles});cursor+=triangles;
  });
  if(source.structuralTriangleCount){parts.push({part:'structural',label:'structural',firstTriangle:cursor,triangles:source.structuralTriangleCount});cursor+=source.structuralTriangleCount;}
  for(const f of source.faceFeatures){
    if(f.firstTriangle!==cursor||!Number.isInteger(f.triangleCount)||f.triangleCount<0||!Number.isInteger(f.firstVertex)||f.firstVertex<source.bodyVertexCount||!Number.isInteger(f.vertexCount)||f.vertexCount<0||f.firstVertex+f.vertexCount>source.vertexCount)throw new Error('fauna body lod: unsupported face/source range layout');
    parts.push({part:f.kind,label:`${f.kind}/${f.side}`,firstTriangle:cursor,triangles:f.triangleCount});cursor+=f.triangleCount;
  }
  if(cursor!==source.triangleCount)throw new Error('fauna body lod: unsupported appendage/source range layout');
  return parts;
}
const lowerBound=(a:Uint32Array,value:number)=>{let lo=0,hi=a.length;while(lo<hi){const mid=(lo+hi)>>>1;if(a[mid]!<value)lo=mid+1;else hi=mid;}return lo;};
const takeBytes=(source:Uint8Array,vertices:Uint32Array,lanes:number)=>{
  const out=new Uint8Array(vertices.length*lanes);
  for(let i=0;i<vertices.length;i++)for(let k=0;k<lanes;k++)out[i*lanes+k]=source[vertices[i]!*lanes+k]!;
  return out;
};
export function buildFaunaBodyLodChain(source:QuadrupedBodyData,options:FaunaBodyLodOptions=DEFAULT_OPTIONS):FaunaBodyLodChain{
  optionsKey(options);validate(source);const parts=faunaBodyLodSourceParts(source);
  // Only scoring data is normalized; output copies original Uint8 bytes.
  const chain=buildComposerLodChain({positions:source.positions,normals:source.normals,index:source.index,
    colors:Float32Array.from(source.colors,x=>x/255),skinIndex:Uint16Array.from(source.skinIndex),skinWeight:Float32Array.from(source.skinWeight,x=>x/255),parts},options.targets??FAUNA_BODY_LOD_TARGETS,options.reducer);
  const appendageVertices=source.plan.appendages.reduce((n,a)=>n+(a.kind==='ear'?50:16),0),structuralStart=source.bodyVertexCount+appendageVertices;
  const levels=chain.levels.map(l=>{
    const colors=takeBytes(source.colors,l.sourceVertex,3),skinIndex=takeBytes(source.skinIndex,l.sourceVertex,4),skinWeight=takeBytes(source.skinWeight,l.sourceVertex,4);
    const target=l.target!;
    const faceFeatures=source.faceFeatures.map(f=>{
      const p=l.parts.find(p=>p.label===`${f.kind}/${f.side}`)!;
      const firstVertex=lowerBound(l.sourceVertex,f.firstVertex),end=lowerBound(l.sourceVertex,f.firstVertex+f.vertexCount);
      return {...f,firstVertex,vertexCount:end-firstVertex,firstTriangle:p.firstTriangle,triangleCount:p.triangles};
    });
    const droppedFeatures=l.parts.filter((p,i)=>parts[i]!.triangles>0&&p.triangles===0).map(p=>p.label);
    const appendagesPresent=l.parts.every(p=>!['ear','horn','structural'].includes(p.part)||p.triangles>0);
    const byteLength=[l.positions,l.normals!,colors,skinIndex,skinWeight,l.index,l.sourceVertex,l.representative].reduce((n,a)=>n+a.byteLength,0);
    return {plan:source.plan,positions:l.positions,normals:l.normals!,colors,skinIndex,skinWeight,index:l.index,
      vertexCount:l.vertices,triangleCount:l.triangles,bodyVertexCount:lowerBound(l.sourceVertex,source.bodyVertexCount),bodyTriangleCount:l.parts[0]!.triangles,
      structuralVertexCount:lowerBound(l.sourceVertex,structuralStart+source.structuralVertexCount)-lowerBound(l.sourceVertex,structuralStart),structuralTriangleCount:l.parts.find(p=>p.part==='structural')?.triangles??0,
      cellM:source.cellM,grid:source.grid,faceFeatures,target,reached:l.reached,withinBudget:l.reached&&l.vertices<=target,
      sourceVertex:l.sourceVertex,representative:l.representative,parts:l.parts,stats:l.stats,droppedFeatures,appendagesPresent,byteLength};
  });
  return {version:FAUNA_BODY_LOD_VERSION,source,provenance:{sourceVersion:source.plan.version,reducerVersion:COMPOSER_LOD_VERSION,sourceVertices:source.vertexCount,sourceTriangles:source.triangleCount,geometryChecksum:checksum(source)},levels};
}
/** Expensive evidence only: nearest-surface deviation plus source envelope loss.
 * Posed arrays use the source skeleton's skinning; survivors retain its exact weights. */
export function faunaBodyLodQuality(source:QuadrupedBodyData,level:FaunaBodyLodLevel,options:{posed?:ArrayLike<number>;stride?:number}={}){
  const positions=options.posed??source.positions,surface=composerLodDeviation(source.positions,level,options);
  let envelopeLossM=0;
  for(let c=0;c<3;c++){
    let lo=Infinity,hi=-Infinity,lodLo=Infinity,lodHi=-Infinity;
    for(let i=c;i<positions.length;i+=3){lo=Math.min(lo,positions[i]!);hi=Math.max(hi,positions[i]!);}
    for(const v of level.sourceVertex){const x=positions[v*3+c]!;lodLo=Math.min(lodLo,x);lodHi=Math.max(lodHi,x);}
    envelopeLossM=Math.max(envelopeLossM,lodLo-lo,hi-lodHi);
  }
  return {surface,envelopeLossM,appendagesPresent:level.appendagesPresent,droppedFeatures:level.droppedFeatures};
}
type CacheEntry={source:QuadrupedBodyData;plan:QuadrupedBodyData['plan'];genome:QuadrupedBodyData['plan']['genome'];arrays:object[];key:string;chain:FaunaBodyLodChain};
/** Caller treats loaded source arrays/genome as immutable. Array/genome replacement
 * invalidates automatically; in-place edits require invalidate(source). LRU stores
 * at most capacity bodies; no global population/species identity cache is created. */
export class FaunaBodyLodCache{
  readonly capacity:number;private entries=new Map<QuadrupedBodyData,CacheEntry>();
  constructor(capacity=8){if(!Number.isInteger(capacity)||capacity<1||capacity>64)throw new Error('fauna body lod: cache capacity must be 1..64');this.capacity=capacity;}
  get(source:QuadrupedBodyData,options:FaunaBodyLodOptions=DEFAULT_OPTIONS):FaunaBodyLodChain{
    const key=optionsKey(options),entry=this.entries.get(source);
    if(entry&&entry.plan===source.plan&&entry.genome===source.plan.genome&&entry.key===key&&entry.arrays[0]===source.positions&&entry.arrays[1]===source.normals&&entry.arrays[2]===source.colors&&entry.arrays[3]===source.skinIndex&&entry.arrays[4]===source.skinWeight&&entry.arrays[5]===source.index){this.entries.delete(source);this.entries.set(source,entry);return entry.chain;}
    const chain=buildFaunaBodyLodChain(source,options);
    const arrays=[source.positions,source.normals,source.colors,source.skinIndex,source.skinWeight,source.index];
    this.entries.delete(source);this.entries.set(source,{source,plan:source.plan,genome:source.plan.genome,arrays,key,chain});
    while(this.entries.size>this.capacity)this.entries.delete(this.entries.keys().next().value!);
    return chain;
  }
  invalidate(source:QuadrupedBodyData):void{this.entries.delete(source);}
  clear():void{this.entries.clear();}
  get size():number{return this.entries.size;}
  get allocatedBytes():number{let bytes=0;for(const entry of this.entries.values())for(const level of entry.chain.levels)bytes+=level.byteLength;return bytes;}
}
