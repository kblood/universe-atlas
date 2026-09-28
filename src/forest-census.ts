import type {Body} from './catalog.ts';
import {terrainSampler,TERRAIN_VERSION,REGIONAL_LANDFORM_VERSION} from './terrain.ts';
import {biomeClassifier,BIOME_VERSION} from './surface-biomes.ts';
import {LANDFORM_VERSION} from './planet-landforms.ts';
import {RIVER_SURFACE_VERSION} from './river-types.ts';
import {forestHabitat,TREE_HABITAT_VERSION} from './forest-habitat.ts';
import {forestPatch,validateForestPatchAddress,type ForestPatch,type ForestPatchAddress,FOREST_PATCH_SIDE,FOREST_PATCH_VERSION} from './forest-patch.ts';
import {POPULATION_VERSION,FOREST_CELL_M,forestRepresentative} from './planet-population.ts';
import {ForestWaterValidity,forestWaterIntervalContains,type ForestWaterInterval} from './forest-water-validity.ts';

export const FOREST_CENSUS_VERSION='forest-census-3';
/** Present members only: offset, direction xyz, roll, nominal height, yaw,
 * ground height and representative flag. An absent record in a COMPLETE patch
 * proves absence; a pending/missing patch must never be treated as empty. */
export const FOREST_CENSUS_STRIDE=9;
const sha256=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),value=>value.toString(16).padStart(2,'0')).join('');
export type ForestCensusPatch={
  context:string;address:ForestPatchAddress;testedCells:number;candidates:number;
  present:number;representatives:number;records:Float64Array;
  waterInterval?:ForestWaterInterval;
};
type Entry={patch:ForestCensusPatch;bytes:number};
type Active={patch:ForestPatch;index:number;records:number[];representatives:number};

/** Type-tagged canonical content. Unsupported values must never silently hash
 * as an empty object or null. Typed arrays retain both their type and values.
 * This is cache provenance, not the deterministic population seed. */
function canonical(value:unknown,ancestors=new Set<object>()):unknown{
  if(value===null)return null;
  if(value===undefined)return ['undefined'];
  if(typeof value==='number'){if(!Number.isFinite(value))throw new Error('Non-finite census context');return value;}
  if(typeof value==='string'||typeof value==='boolean')return value;
  if(typeof value!=='object')throw new Error('Unsupported census context value');
  if(ancestors.has(value))throw new Error('Cyclic census context');
  ancestors.add(value);
  try{
    if(ArrayBuffer.isView(value)){
      if(value instanceof DataView)throw new Error('Unsupported census context DataView');
      return ['typed',value.constructor.name,Array.from(value as unknown as ArrayLike<unknown>,v=>canonical(v,ancestors))];
    }
    if(Array.isArray(value))return ['array',Array.from(value,v=>canonical(v,ancestors))];
    if(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)throw new Error('Unsupported census context object');
    return ['object',Object.keys(value).sort().map(key=>{
      const descriptor=Object.getOwnPropertyDescriptor(value,key)!;
      if(!('value' in descriptor))throw new Error('Unsupported census context accessor');
      return [key,canonical(descriptor.value,ancestors)];
    })];
  }finally{ancestors.delete(value);}
}

/** This context owns a cloned body, including the actual hydrology geometry.
 * The SHA covers content, not merely region IDs. No date is simulated here:
 * dated world eligibility still gates the parent renderer, as it does near trees.
 * Object-key order cannot affect the stamp; array order is retained. */
export async function createForestCensus(body:Body,waterLevelM:number,maxBytes=48*1024*1024,maxPatches=16000,previous?:ForestCensus|null){
  if(!Number.isFinite(body.radiusM)||body.radiusM<=0||!Number.isFinite(waterLevelM)||
    !Number.isSafeInteger(maxBytes)||maxBytes<0||!Number.isSafeInteger(maxPatches)||maxPatches<0)throw new Error('Invalid forest census context');
  const description=JSON.stringify([FOREST_CENSUS_VERSION,POPULATION_VERSION,TREE_HABITAT_VERSION,
    TERRAIN_VERSION,REGIONAL_LANDFORM_VERSION,LANDFORM_VERSION,BIOME_VERSION,RIVER_SURFACE_VERSION,FOREST_CELL_M,
    FOREST_PATCH_VERSION,FOREST_PATCH_SIDE,canonical(body)]);
  const snapshot=structuredClone(body);
  const family=await sha256(description);
  return censusForSnapshot(snapshot,family,waterLevelM,maxBytes,maxPatches,previous);
}
async function censusForSnapshot(snapshot:Body,family:string,waterLevelM:number,maxBytes:number,maxPatches:number,previous?:ForestCensus|null){
  if(!Number.isFinite(waterLevelM))throw new Error('Invalid forest water level');
  const context=await sha256(JSON.stringify([family,waterLevelM]));
  const validity=new ForestWaterValidity(waterLevelM);
  const sample=terrainSampler(snapshot,undefined,undefined,false,waterLevelM,validity.observe);
  const tracked:typeof sample=d=>{const result=sample(d);if(snapshot.water)validity.observe(result.groundHeightM);return result;};
  // Track every actual query, including probes whose slope rejects the tree.
  // Recording probe ground heights too is conservative (only centres classify).
  const habitat=forestHabitat(tracked,biomeClassifier(snapshot,waterLevelM),snapshot.radiusM,true);
  const census=new ForestCensus(context,snapshot.seed,Math.ceil(2*snapshot.radiusM/FOREST_CELL_M),habitat,maxBytes,maxPatches,{family,validity,snapshot});
  if(previous)census.inherit(previous,waterLevelM);return census;
}

/** Single bounded in-progress patch plus a byte/entry bounded completed LRU.
 * The caller decides job priority and yields between step() calls. It cannot
 * receive a partial patch. Every result owns its own transferable buffer. */
export class ForestCensus {
  private entries=new Map<string,Entry>();
  private active:Active|null=null;
  private bytes=0;private hits=0;private misses=0;private evictions=0;private sampled=0;
  readonly context:string;readonly n:number;readonly family:string|null;
  private validity:ForestWaterValidity|null;private reusedPatches=0;
  private snapshot:Body|null;
  private seed:string;private habitat:ReturnType<typeof forestHabitat>;private maxBytes:number;private maxPatches:number;
  constructor(context:string,seed:string,n:number,
    habitat:ReturnType<typeof forestHabitat>,maxBytes:number,maxPatches:number,options?:{family:string;validity:ForestWaterValidity;snapshot?:Body}){
    if(!Number.isSafeInteger(n)||n<1||!Number.isSafeInteger(maxBytes)||maxBytes<0||
      !Number.isSafeInteger(maxPatches)||maxPatches<0)throw new Error('Invalid forest census limits');
    this.context=context;this.seed=seed;this.n=n;this.habitat=habitat;this.maxBytes=maxBytes;this.maxPatches=maxPatches;
    this.family=options?.family??null;this.validity=options?.validity??null;this.snapshot=options?.snapshot??null;
  }
  /** Uses only the worker-owned immutable snapshot; never accepts a new body. */
  atWater(water:number){
    if(!this.snapshot||!this.family)throw new Error('Census has no reusable body snapshot');
    return censusForSnapshot(this.snapshot,this.family,water,this.maxBytes,this.maxPatches,this);
  }
  private key(address:ForestPatchAddress){return `${address.face}/${address.n}/${address.x}/${address.y}`;}
  private copy(patch:ForestCensusPatch):ForestCensusPatch{return {...patch,address:{...patch.address},records:patch.records.slice(),
    ...(patch.waterInterval?{waterInterval:[...patch.waterInterval] as ForestWaterInterval}:{})};}
  inherit(previous:ForestCensus,water:number){
    if(!this.family||previous.family!==this.family||previous.n!==this.n)return;
    for(const {patch} of previous.entries.values())if(forestWaterIntervalContains(patch.waterInterval,water)){
      // Cache records are immutable and returned buffers are always copies.
      // Neither the previous context nor any outstanding reply is mutated.
      if(this.store({...patch,context:this.context}))this.reusedPatches++;
    }
  }
  start(address:ForestPatchAddress):ForestCensusPatch|null {
    if(this.active)throw new Error('Forest census already has an active patch');
    if(address.n!==this.n)throw new Error('Forest census grid mismatch');
    validateForestPatchAddress(address);
    const key=this.key(address),cached=this.entries.get(key);
    if(cached){this.hits++;this.entries.delete(key);this.entries.set(key,cached);return this.copy(cached.patch);}
    const patch=forestPatch(this.seed,address);
    this.validity?.reset();
    this.misses++;this.active={patch,index:0,records:[],representatives:0};return null;
  }
  step(maxCandidates=8):ForestCensusPatch|null {
    if(!Number.isInteger(maxCandidates)||maxCandidates<1||maxCandidates>64)throw new Error('Invalid forest census slice');
    try{return this.advance(maxCandidates);}catch(error){this.active=null;throw error;}
  }
  private advance(maxCandidates:number):ForestCensusPatch|null {
    const active=this.active;if(!active)return null;
    const {patch}=active,{x,y}=patch.address,end=Math.min(patch.cells.length,active.index+maxCandidates);
    for(;active.index<end;active.index++){
      const cell=patch.cells[active.index],sample=this.habitat(cell);this.sampled++;
      if(!Number.isFinite(sample.groundHeightM))throw new Error('Non-finite forest census height');
      if(!sample.present)continue;
      const parts=cell.id.split('/'),offset=(Number(parts[3])-y*FOREST_PATCH_SIDE)*FOREST_PATCH_SIDE+Number(parts[2])-x*FOREST_PATCH_SIDE;
      if(Number(parts[0])!==patch.address.face||Number(parts[1])!==patch.address.n||
        !Number.isInteger(offset)||offset<0||offset>=FOREST_PATCH_SIDE**2)throw new Error('Invalid forest census cell identity');
      const representative=Number(forestRepresentative(this.seed,cell.id));active.representatives+=representative;
      active.records.push(offset,...cell.direction,cell.roll,cell.heightM,cell.yaw,sample.groundHeightM,representative);
    }
    if(active.index<patch.cells.length)return null;
    const result:ForestCensusPatch={context:this.context,address:{...patch.address},testedCells:patch.testedCells,
      candidates:patch.cells.length,present:active.records.length/FOREST_CENSUS_STRIDE,
      representatives:active.representatives,records:new Float64Array(active.records),
      ...(this.validity?{waterInterval:this.validity.interval()}:{})};
    this.active=null;
    this.store(result);return this.copy(result);
  }
  private store(result:ForestCensusPatch){
    const key=this.key(result.address),bytes=result.records.byteLength+288+key.length*2;
    if(bytes<=this.maxBytes&&this.maxPatches>0){
      const previous=this.entries.get(key);if(previous){this.bytes-=previous.bytes;this.entries.delete(key);}
      while(this.entries.size&&(this.bytes+bytes>this.maxBytes||this.entries.size>=this.maxPatches)){
        const oldest=this.entries.keys().next().value!;this.bytes-=this.entries.get(oldest)!.bytes;this.entries.delete(oldest);this.evictions++;
      }
      this.entries.set(key,{patch:result,bytes});this.bytes+=bytes;
      return true;
    }
    return false;
  }
  cancelActive(){this.active=null;}
  diagnostics(){return {context:this.context,family:this.family,reusedPatches:this.reusedPatches,patches:this.entries.size,estimatedBytes:this.bytes,maxBytes:this.maxBytes,
    maxPatches:this.maxPatches,hits:this.hits,misses:this.misses,evictionsTotal:this.evictions,sampledCandidates:this.sampled,
    activeCandidates:this.active?this.active.patch.cells.length-this.active.index:0};}
}
