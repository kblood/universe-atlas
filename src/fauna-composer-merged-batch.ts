import * as THREE from 'three';
import {createComposerColouredMaterial, COMPOSER_COAT_CRISP_GLSL} from './fauna-composer.ts';
import {patchFaunaComposerInstancing} from './fauna-composer-instance-batch.ts';
import type {FaunaComposerRenderSkin} from './fauna-composer-render-source.ts';
import {COMPOSER_PACKED_STORAGE_VERSION, COMPOSER_GPU_STORAGE_VERSION, isGpuComposerSkin, composerStoredVertices, isPackedComposerSkin, compactComposerIndices, composerQuantizationProof, composerStorageCodec, assertComposerQuantizationProof, type ComposerQuantizationProof, type ComposerStoredArray, type FaunaComposerStoredSkin, type FaunaComposerPackedSkin, type FaunaComposerGpuSkin, type FaunaComposerArenaStorage} from './fauna-composer-storage.ts';
import {FaunaComposerGpuBuffers,COMPOSER_ARENA_ATTRIBUTES,composerArenaArrayType,COMPOSER_COMPACTION_SCRATCH_BYTES} from './fauna-composer-gpu-buffers.ts';

/** One dynamic branch per animal, with the original pattern arithmetic. Flat
 * varyings keep the pattern/seed constant over every triangle. This removes the
 * per-source draw requirement without quantizing coat layers or seeds. */
export function composerMergedCoatGlsl(): string {
  let glsl = COMPOSER_COAT_CRISP_GLSL;
  const uniforms = 'uniform highp uint coatSeed;\nuniform float coatCells, coatThreshold, coatWarp, coatBellyLine;';
  if (!glsl.includes(uniforms)) throw new Error('Composer coat uniform contract changed');
  glsl = glsl.replace(uniforms, `flat varying vec4 vComposerCoatA;\nflat varying vec4 vComposerCoatB;
    #define coatSeed (uint(vComposerCoatA.x) | (uint(vComposerCoatA.y) << 16u))
    #define coatCells vComposerCoatA.z
    #define coatThreshold vComposerCoatA.w
    #define coatWarp vComposerCoatB.x
    #define coatBellyLine vComposerCoatB.y`);
  const warp = '#if COAT_PATTERN == 3\n  const float warpAmp = 0.32;\n#elif COAT_PATTERN == 2\n  const float warpAmp = 0.28;\n#else\n  const float warpAmp = 0.22;\n#endif';
  if (!glsl.includes(warp)) throw new Error('Composer coat warp contract changed');
  glsl = glsl.replace(warp, 'float warpAmp = COAT_PATTERN == 3 ? 0.32 : COAT_PATTERN == 2 ? 0.28 : 0.22;');
  glsl = glsl.replace(/^#if (.+)$/gm, 'if ($1) {').replace(/^#elif (.+)$/gm, '} else if ($1) {')
    .replace(/^#else$/gm, '} else {').replace(/^#endif$/gm, '}').replaceAll('COAT_PATTERN', 'int(vComposerCoatB.z)')
    .replace('const bool stripes =', 'bool stripes =');
  // Plain/non-crisp animals carry their original colour in all three layers.
  glsl = glsl.replace('vec3 composerCoatCrisp() {', 'vec3 composerCoatCrisp() {\n  if (vComposerCoatB.z < 0.5) return vCoatL0;');
  return glsl;
}
export function patchComposerMergedShader(shader: {vertexShader: string; fragmentShader: string}, lit: boolean, storage: FaunaComposerArenaStorage = 'float-1'): void {
  patchFaunaComposerInstancing(shader);
  if (storage === 'packed-1') {
    shader.vertexShader = shader.vertexShader.replace('mat4 composerSkin =', 'vec4 composerPackedWeight=skinWeight/max(dot(skinWeight,vec4(1.0)),0.0000001);\n    mat4 composerSkin =');
    for (const component of ['x','y','z','w']) shader.vertexShader = shader.vertexShader.replaceAll(`skinWeight.${component}`, `composerPackedWeight.${component}`);
  }
  const header = `uniform sampler2D composerRoots;\n${lit ? 'flat varying vec4 vComposerCoatA; flat varying vec4 vComposerCoatB; flat varying float vComposerRoughness;\nattribute vec3 coatL0; attribute vec3 coatL1; attribute vec3 coatL2; attribute vec4 coatSample;\nvarying vec3 vCoatL0; varying vec3 vCoatL1; varying vec3 vCoatL2; varying vec4 vCoatSample;' : ''}`;
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n' + header)
    .replace('void main() {', `void main() {
      int composerRow=int(composerActor);
      mat4 composerRoot=mat4(texelFetch(composerRoots,ivec2(0,composerRow),0),texelFetch(composerRoots,ivec2(1,composerRow),0),texelFetch(composerRoots,ivec2(2,composerRow),0),texelFetch(composerRoots,ivec2(3,composerRow),0));
      vec4 composerCoatA=texelFetch(composerRoots,ivec2(4,composerRow),0), composerCoatB=texelFetch(composerRoots,ivec2(5,composerRow),0);
      ${lit ? 'vComposerCoatA=composerCoatA; vComposerCoatB=composerCoatB; vComposerRoughness=texelFetch(composerRoots,ivec2(6,composerRow),0).x; vCoatL0=coatL0; vCoatL1=coatL1; vCoatL2=coatL2; vCoatSample=coatSample;' : ''}`)
    .replace('transformed=(composerSkin*vec4(transformed,1.0)).xyz;', 'transformed=(composerSkin*vec4(transformed,1.0)).xyz; transformed=(composerRoot*vec4(transformed,1.0)).xyz;')
    .replace('objectNormal=(composerSkin*vec4(objectNormal,0.0)).xyz;', `objectNormal=(composerSkin*vec4(objectNormal,0.0)).xyz;
      mat3 composerRootNormal=mat3(composerRoot);
      objectNormal/=vec3(dot(composerRootNormal[0],composerRootNormal[0]),dot(composerRootNormal[1],composerRootNormal[1]),dot(composerRootNormal[2],composerRootNormal[2]));
      objectNormal=composerRootNormal*objectNormal;`)
    .replace('#include <project_vertex>', '#include <project_vertex>\nif(composerCoatB.w<0.5)gl_Position=vec4(2.0,2.0,2.0,1.0);');
  if(storage==='packed-1'&&lit) {
    // Linear coat shading may exceed1 (e.g. bright giraffe layers). The fixed
    // [0,2] domain preserves that source colour without clipping or a new uniform.
    for(const layer of ['0','1','2'])shader.vertexShader=shader.vertexShader.replace(`vCoatL${layer}=coatL${layer};`,`vCoatL${layer}=coatL${layer}*2.0;`);
    shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>','#include <color_vertex>\n#ifdef USE_COLOR\nvColor.rgb*=2.0;\n#endif');
  }
  if (lit) shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nflat varying float vComposerRoughness;\n' + composerMergedCoatGlsl())
    .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=vComposerRoughness;')
    .replace('#include <color_fragment>', 'diffuseColor.rgb *= composerCoatCrisp();');
}

type Block = {start: number; count: number};
function allocate(free: Block[], count: number): number | null {
  const i = free.findIndex(b => b.count >= count); if (i < 0) return null;
  const block = free[i]!, start = block.start; block.start += count; block.count -= count; if (!block.count) free.splice(i, 1); return start;
}
function release(free: Block[], start: number, count: number): void {
  free.push({start, count}); free.sort((a, b) => a.start - b.start);
  for (let i = 0; i < free.length - 1;) {const a = free[i]!, b = free[i + 1]!;
    if (a.start + a.count === b.start) {a.count += b.count; free.splice(i + 1, 1);} else i++;}
}
type Record = {vertex: number; vertices: number; index: number; indices: number; row: number; skinVersion: string; crisp: FaunaComposerRenderSkin['coatCrisp']; roughness: number; proof?: ComposerQuantizationProof;
  /** Borrowed immutable topology; shared with the source/retained receipt, never copied for relocation. */
  localIndex:Uint16Array|Uint32Array; views:Set<WeakRef<FaunaComposerRenderSkin|FaunaComposerPackedSkin>>; pass?:0|1|2};
export interface FaunaComposerMergedOptions {storage?: FaunaComposerArenaStorage; gpuContext?:WebGL2RenderingContext; maxVertices: number; maxIndices: number; maxActors: number; maxBytes: number; bones: {value: THREE.DataTexture};
  /** Optional fixed index slots. Exact local topology is retained; unused slot
   * indices are degenerate. Requires maxIndices === maxActors * this value. */
  maxIndexPerRecord?:number}
const gpuOwners=new WeakMap<FaunaComposerGpuSkin,{pool:FaunaComposerMergedBatch;id:string;record:Record}>();

/** Bounded unique-geometry arena: one draw for any mix of Composer anatomy and
 * coats. CPU source arrays are copied once on admission, never regenerated.
 * Released index blocks become degenerate until reused; reserved triangles are
 * reported separately from active triangles. No per-frame geometry rebuilding. */
export class FaunaComposerMergedBatch {
  readonly mesh: THREE.Mesh;
  readonly ownedBytes: number;
  private readonly cpuBytes:number;
  private readonly gpuBytes:number;
  private readonly gpu?:FaunaComposerGpuBuffers;
  private readonly geometry = new THREE.BufferGeometry();
  private readonly records = new Map<string, Record>();
  private readonly copying = new Map<string, {record: Record; skin: FaunaComposerStoredSkin; vertexAt: number; indexAt: number; seen: boolean}>();
  readonly backingBuffers = new Set<ArrayBufferLike>();
  private readonly freeVertices: Block[]; private readonly freeIndices: Block[];
  private readonly roots: Float32Array; private readonly rootTexture: THREE.DataTexture;
  private readonly options: FaunaComposerMergedOptions;
  private highIndex = 0; private disposed = false; private active = 0; private triangles = 0;
  private compactionMoves=0; private compactionMaxMoveMs=0; private compactionMaxOverrunMs=0;
  private readonly indexSlots?:Array<Record|null>;
  private readonly indexSwapLog?:Uint16Array;
  private viewCameras:readonly THREE.Camera[]=[];
  private cameraSlots=0; private activeSlots=0; private indexSlotSwaps=0;
  private readonly indexMetadataBytes:number;
  private restorePassCallbacks?:()=>void;
  constructor(options: FaunaComposerMergedOptions) {
    this.options = options;
    if (options.storage !== undefined && options.storage !== 'float-1' && options.storage !== 'packed-1') throw new Error('Unknown Composer arena storage');
    if (![options.maxVertices, options.maxIndices, options.maxActors, options.maxBytes].every(n => Number.isSafeInteger(n) && n > 0) || options.maxIndices % 3 || options.maxActors > 512) throw new Error('Invalid merged Composer capacity');
    const slot=options.maxIndexPerRecord;
    if(slot!==undefined&&(!Number.isSafeInteger(slot)||slot<=0||slot%3||slot*options.maxActors!==options.maxIndices))throw new Error('Invalid Composer fixed index capacity');
    // Conservative reference/pass-field reserve and bounded transaction log.
    // This CPU slot-number log is not a second topology/index buffer.
    this.indexMetadataBytes=slot===undefined?0:options.maxActors*20;
    if(slot!==undefined){this.indexSlots=Array.from({length:options.maxActors},()=>null);this.indexSwapLog=new Uint16Array(options.maxActors*2);}
    // Packed: position12 + normal6 + colour6 + joints4 + weights8 + gloss1
    // + coat colours18 + exact noise sample16 + actor row2 =73 bytes/vertex.
    const packed = options.storage === 'packed-1';
    if(options.gpuContext&&!packed)throw new Error('GPU-owned Composer storage requires the explicit packed format');
    const attributeBytes=options.maxVertices*(packed?73:120)+options.maxIndices*4,rootBytes=options.maxActors*28*4;
    this.cpuBytes=(options.gpuContext?128*73+768*4:attributeBytes)+rootBytes+this.indexMetadataBytes;
    this.gpuBytes=attributeBytes+rootBytes+(options.gpuContext?COMPOSER_COMPACTION_SCRATCH_BYTES:0);this.ownedBytes=this.cpuBytes+this.gpuBytes;
    if (this.ownedBytes > options.maxBytes) throw new Error('Merged Composer arena exceeds byte ceiling');
    const vertex = options.maxVertices;
    if(options.gpuContext)this.gpu=new FaunaComposerGpuBuffers(options.gpuContext,this.geometry,vertex,options.maxIndices,packed);
    else {
    for (const [name, width] of COMPOSER_ARENA_ATTRIBUTES) {
      const codec = composerStorageCodec(name);
      const ArrayType = composerArenaArrayType(name,packed);
      this.geometry.setAttribute(name, new THREE.BufferAttribute(new ArrayType(vertex*width),width,packed&&!!codec).setUsage(THREE.DynamicDrawUsage));
    }
    this.geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(options.maxIndices), 1).setUsage(THREE.DynamicDrawUsage));
    for (const attribute of Object.values(this.geometry.attributes)) this.backingBuffers.add(attribute.array.buffer); this.backingBuffers.add(this.geometry.index!.array.buffer);
    }
    this.geometry.setDrawRange(0,0);
    // Vertices are transformed by per-actor root/palette textures. A static
    // unposed geometry bound cannot describe this explicitly uncullable batch.
    this.geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),Infinity);
    this.freeVertices = [{start: 0, count: vertex}]; this.freeIndices = [{start: 0, count: options.maxIndices}];
    this.roots = new Float32Array(options.maxActors * 28);
    this.rootTexture = new THREE.DataTexture(this.roots, 7, options.maxActors, THREE.RGBAFormat, THREE.FloatType);
    this.rootTexture.minFilter = this.rootTexture.magFilter = THREE.NearestFilter; this.rootTexture.generateMipmaps = false; this.rootTexture.internalFormat = 'RGBA32F'; this.rootTexture.needsUpdate = true;
    const install = (material: THREE.Material, lit: boolean) => {const previous = material.onBeforeCompile, key = material.customProgramCacheKey();
      material.customProgramCacheKey = () => `${key}/composer-merged-1/${options.storage ?? 'float-1'}`;
      material.onBeforeCompile = (shader, renderer) => {previous.call(material, shader, renderer); patchComposerMergedShader(shader, lit, options.storage); shader.uniforms.composerBones = options.bones; shader.uniforms.composerRoots = {value: this.rootTexture};};};
    const material = createComposerColouredMaterial(); install(material, true);
    this.mesh = new THREE.Mesh(this.geometry, material); this.mesh.frustumCulled = false; this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.visible = false; this.mesh.name = 'Merged Composer tier';
    const depth = new THREE.MeshDepthMaterial({depthPacking: THREE.RGBADepthPacking}); install(depth, false); this.mesh.customDepthMaterial = depth;
    const distance = new THREE.MeshDistanceMaterial(); install(distance, false); this.mesh.customDistanceMaterial = distance;
    if(this.indexSlots)this.installIndexPasses();
  }
  /** Only the actual registered view cameras use the camera prefix. Auxiliary
   * cameras (including reflection) and shadow cameras retain the active union. */
  setViewCameras(cameras:readonly THREE.Camera[]):void {this.viewCameras=cameras;}
  private setIndexDrawRange(camera:boolean):void {this.geometry.setDrawRange(0,(camera?this.cameraSlots:this.activeSlots)*this.options.maxIndexPerRecord!);}
  private installIndexPasses():void {
    const mesh=this.mesh,before=mesh.onBeforeRender,after=mesh.onAfterRender,shadow=mesh.onBeforeShadow,afterShadow=mesh.onAfterShadow;
    const onBeforeRender:typeof before=(...args)=>{const camera=this.viewCameras.includes(args[2]);this.setIndexDrawRange(camera);try{before.apply(mesh,args);this.setIndexDrawRange(camera);}catch(error){this.setIndexDrawRange(true);throw error;}};
    const onAfterRender:typeof after=(...args)=>{try{after.apply(mesh,args);}finally{this.setIndexDrawRange(true);}};
    const onBeforeShadow:typeof shadow=(...args)=>{this.setIndexDrawRange(false);try{shadow.apply(mesh,args);this.setIndexDrawRange(false);}catch(error){this.setIndexDrawRange(true);throw error;}};
    const onAfterShadow:typeof afterShadow=(...args)=>{try{afterShadow.apply(mesh,args);}finally{this.setIndexDrawRange(true);}};
    mesh.onBeforeRender=onBeforeRender;mesh.onAfterRender=onAfterRender;mesh.onBeforeShadow=onBeforeShadow;mesh.onAfterShadow=onAfterShadow;
    this.restorePassCallbacks=()=>{if(mesh.onBeforeRender===onBeforeRender)mesh.onBeforeRender=before;if(mesh.onAfterRender===onAfterRender)mesh.onAfterRender=after;if(mesh.onBeforeShadow===onBeforeShadow)mesh.onBeforeShadow=shadow;if(mesh.onAfterShadow===onAfterShadow)mesh.onAfterShadow=afterShadow;};
  }
  private indexFootprint(indices:number):number {return this.options.maxIndexPerRecord??indices;}
  register(id: string, skin: FaunaComposerStoredSkin, row: number, roughness = .82): boolean {
    if (this.records.has(id)) return false;
    return this.registerSlice(id, skin, row, roughness, Infinity) === 'ready';
  }
  canAdmit(skin: FaunaComposerStoredSkin): boolean {
    return !(this.indexSlots&&skin.index.length>this.options.maxIndexPerRecord!)&&this.freeVertices.some(b => b.count >= composerStoredVertices(skin)) && this.freeIndices.some(b => b.count >= this.indexFootprint(skin.index.length));
  }
  /** Rewrite one bounded slot from retained local topology, never a readback. */
  private writeIndexSlot(r:Record|null,slot:number):void {
    const size=this.options.maxIndexPerRecord!,at=slot*size;
    if(r)this.writeIndices(r,at,r.vertex);
    this.clearIndices(at+(r?.indices??0),size-(r?.indices??0));
  }
  private swapIndexSlots(a:number,b:number):void {
    if(a===b)return;
    const slots=this.indexSlots!,left=slots[a]!,right=slots[b]!,gl=this.gpu?.gl;
    const previous=gl?.getParameter(gl.COPY_WRITE_BUFFER_BINDING);
    try {
      try{this.writeIndexSlot(right,a);this.writeIndexSlot(left,b);}
      catch(error){if(!gl?.isContextLost()){this.writeIndexSlot(left,a);this.writeIndexSlot(right,b);}throw error;}
      // Publish both offsets together. GPU receipts keep these same Records.
      slots[a]=right;slots[b]=left;
      if(left)left.index=b*this.options.maxIndexPerRecord!;
      if(right)right.index=a*this.options.maxIndexPerRecord!;
      this.indexSlotSwaps++;
    }finally{if(gl)gl.bindBuffer(gl.COPY_WRITE_BUFFER,previous);}
  }
  private partitionIndexSlots():void {
    const slots=this.indexSlots!,moves=this.indexSlotSwaps,log=this.indexSwapLog!;let logged=0;
    const partition=(start:number,accept:(r:Record|null)=>boolean)=>{
      let left=start,right=slots.length-1;
      while(left<=right){if(accept(slots[left]!)){left++;continue;}while(right>left&&!accept(slots[right]!))right--;if(right<=left)break;this.swapIndexSlots(left,right);log[logged++]=left++;log[logged++]=right--;}
      return left;
    };
    try {
      const camera=partition(0,r=>r?.pass===1),active=partition(camera,r=>r?.pass===2);
      this.cameraSlots=camera;this.activeSlots=active;
    }catch(error){
      // The failing pair restored itself. Reverse earlier complete pairs too,
      // so a retry starts from the same offsets, free blocks and pass ranges.
      if(!this.gpu?.gl.isContextLost())while(logged){const b=log[--logged]!,a=log[--logged]!;this.swapIndexSlots(a,b);}
      throw error;
    }finally{
      // Includes partially admitted slots: their offsets may move, but their
      // original vertex/index copy progress and invisibility do not change.
      if(this.indexSlotSwaps!==moves){
        // Vertex ownership never changes in an index swap. Rebuild just the
        // slot free list, without sorting or allocating per-record plans.
        this.freeIndices.length=0;let start=-1;this.highIndex=0;
        for(let i=0;i<=slots.length;i++){
          if(i<slots.length&&!slots[i]){if(start<0)start=i;}
          else {if(start>=0){this.freeIndices.push({start:start*this.options.maxIndexPerRecord!,count:(i-start)*this.options.maxIndexPerRecord!});start=-1;}if(i<slots.length)this.highIndex=(i+1)*this.options.maxIndexPerRecord!;}
        }
      }
      this.setIndexDrawRange(true);
    }
  }
  private writeIndices(r:Record,index:number,vertex:number):void {
    const out=this.geometry.index!;
    for(let begin=0;begin<r.indices;begin+=768){const end=Math.min(r.indices,begin+768);
      for(let i=begin;i<end;i++)if(this.gpu)this.gpu.indexScratch[i-begin]=r.localIndex[i]!+vertex;else out.array[index+i]=r.localIndex[i]!+vertex;
      if(this.gpu)this.gpu.uploadIndices(index+begin,end-begin);
    }
    if(!this.gpu){out.addUpdateRange(index,r.indices);out.needsUpdate=true;}
  }
  private clearIndices(index:number,count:number):void {
    if(!count)return;
    if(this.gpu)this.gpu.clearIndices(index,count);
    else {const out=this.geometry.index!;out.array.fill(0,index,index+count);out.addUpdateRange(index,count);out.needsUpdate=true;}
  }
  private refreshViews(r:Record):void {
    for(const ref of r.views){const skin=ref.deref();if(!skin){r.views.delete(ref);continue;}
      const view=(name:string,width:number)=>this.geometry.getAttribute(name).array.subarray(r.vertex*width,(r.vertex+r.vertices)*width);
      Object.assign(skin,{positions:view('position',3),normals:view('normal',3),colors:view('color',3),skinIndex:view('skinIndex',4),skinWeight:view('skinWeight',4),gloss:view('composerGloss',1)});
      if(skin.coatLayers)Object.assign(skin.coatLayers,{c0:view('coatL0',3),c1:view('coatL1',3),c2:view('coatL2',3),sample:view('coatSample',4)});
    }
  }
  private rebuildFree():void {
    const records=[...this.records.values(),...(this.indexSlots?[...this.copying.values()].map(p=>p.record):[])];
    for(const [free,offset,length,limit]of [[this.freeVertices,'vertex','vertices',this.options.maxVertices],[this.freeIndices,'index','indices',this.options.maxIndices]] as const){
      free.length=0;let at=0;for(const r of records.slice().sort((a,b)=>a[offset]-b[offset])){if(r[offset]>at)free.push({start:at,count:r[offset]-at});at=r[offset]+(offset==='index'?this.indexFootprint(r.indices):r[length]);}
      if(at<limit)free.push({start:at,count:limit-at});
    }
    this.highIndex=Math.max(0,...records.map(r=>r.index+this.indexFootprint(r.indices)));if(!this.indexSlots)this.geometry.setDrawRange(0,this.highIndex);
  }
  /** Compact only when summed free space fits but a contiguous span does not.
   * Each record move is atomic; deadlines are checked between complete moves.
   * No plan survives a frame, release or context generation. */
  private compact(skin:FaunaComposerStoredSkin,deadline:number,now:()=>number):'ready'|'pending'|'full' {
    if(this.freeVertices.reduce((n,b)=>n+b.count,0)<composerStoredVertices(skin)||this.freeIndices.reduce((n,b)=>n+b.count,0)<this.indexFootprint(skin.index.length))return 'full';
    if(this.copying.size)return 'pending';
    for(const axis of ['vertex','index'] as const){
      if(axis==='index'&&this.indexSlots)continue;
      const free=axis==='vertex'?this.freeVertices:this.freeIndices,required=axis==='vertex'?composerStoredVertices(skin):skin.index.length;
      // Fragmentation in one arena must not relocate an already-fitting arena.
      if(free.some(block=>block.count>=required))continue;
      let at=0;
      for(const r of [...this.records.values()].sort((a,b)=>a[axis]-b[axis])){
        const old=r[axis],count=axis==='vertex'?r.vertices:r.indices;
        if(old!==at){const start=now();if(start>=deadline)return 'pending';
          if(axis==='vertex'){
            if(this.gpu){this.gpu.moveVertices(old,at,count);
              try{this.writeIndices(r,r.index,at);}catch(error){if(!this.gpu.gl.isContextLost()){this.gpu.moveVertices(at,old,count);this.writeIndices(r,r.index,old);}throw error;}
            }else {for(const attribute of Object.values(this.geometry.attributes)){const a=attribute as THREE.BufferAttribute,width=a.itemSize;a.array.copyWithin(at*width,old*width,(old+count)*width);a.addUpdateRange(at*width,count*width);a.needsUpdate=true;}this.writeIndices(r,r.index,at);}
            r.vertex=at;this.refreshViews(r);
          }else{
            try{this.writeIndices(r,at,r.vertex);this.clearIndices(Math.max(old,at+count),Math.min(count,old-at));}
            catch(error){if(!this.gpu?.gl.isContextLost()){this.writeIndices(r,old,r.vertex);this.clearIndices(at,Math.min(count,old-at));}throw error;}
            r.index=at;
          }
          this.rebuildFree();this.compactionMoves++;
          const end=now();this.compactionMaxMoveMs=Math.max(this.compactionMaxMoveMs,end-start);this.compactionMaxOverrunMs=Math.max(this.compactionMaxOverrunMs,end-deadline);
          if(this.canAdmit(skin))return 'ready';
        }
        at+=count;
      }
    }
    return this.canAdmit(skin)?'ready':'pending';
  }
  /** Copies at most 128 vertices or 768 indices between deadline checks. A
   * partial admission is invisible and retains its previous tier until complete. */
  registerSlice(id: string, skin: FaunaComposerStoredSkin, row: number, roughness: number, deadline: number, now = () => performance.now()): 'ready'|'pending'|'full' {
    if(this.indexSlots&&skin.index.length>this.options.maxIndexPerRecord!)throw new Error('Composer source exceeds explicit maxIndexPerRecord');
    if (this.records.has(id)) return 'ready';
    const stored=isPackedComposerSkin(skin)||isGpuComposerSkin(skin);
    if (stored && this.options.storage !== 'packed-1') throw new Error('Cannot restore a raw Composer tier from packed runtime attributes');
    const owner=isGpuComposerSkin(skin)?gpuOwners.get(skin):undefined;
    const sourceRecord=owner?.pool.records.get(owner.id);
    if(isGpuComposerSkin(skin)&&(!this.gpu||!owner?.pool.gpu||!sourceRecord||sourceRecord!==owner.record))throw new Error('Composer GPU source allocation is no longer resident');
    if (this.disposed || !id || !Number.isInteger(row) || row < 0 || row >= this.options.maxActors) return 'full';
    let pending = this.copying.get(id);
    if (pending && pending.skin !== skin) {this.release(id); pending = undefined;}
    if (!pending) {
      if ([...this.records.values()].some(r => r.row === row) || [...this.copying.values()].some(p => p.record.row === row)) return 'full';
      const vertices = composerStoredVertices(skin), indices = skin.index.length;
      if(!this.canAdmit(skin)){const status=this.compact(skin,deadline,now);if(status!=='ready')return status;}
      const vertex = allocate(this.freeVertices, vertices); if (vertex === null) return 'full';
      const index = allocate(this.freeIndices, this.indexFootprint(indices)); if (index === null) {release(this.freeVertices, vertex, vertices); return 'full';}
      pending = {record: {vertex, vertices, index, indices, row, skinVersion: skin.version, crisp: skin.coatCrisp, roughness, localIndex:skin.index,views:new Set(),proof:this.options.storage==='packed-1'?{...(stored?skin.storage.proof:composerQuantizationProof(vertices)),checkedVertices:0}:undefined}, skin, vertexAt: 0, indexAt: 0, seen: true};
      this.copying.set(id, pending); this.roots[row * 28 + 23] = 0;
      if(this.indexSlots){this.indexSlots[index/this.options.maxIndexPerRecord!]=pending.record;pending.record.pass=0;}
    }
    pending.seen = true; const r = pending.record;
    const arrays: [string, ComposerStoredArray|null, number][] = isGpuComposerSkin(skin)?[]:[['position', skin.positions, 3], ['normal', skin.normals, 3], ['color', skin.colors, 3], ['skinIndex', skin.skinIndex, 4], ['skinWeight', skin.skinWeight, 4], ['composerGloss', skin.gloss, 1],
      ['coatL0', skin.coatLayers?.c0 ?? skin.colors, 3], ['coatL1', skin.coatLayers?.c1 ?? skin.colors, 3], ['coatL2', skin.coatLayers?.c2 ?? skin.colors, 3], ['coatSample', skin.coatLayers?.sample ?? null, 4]];
    while (pending.vertexAt < r.vertices && now() < deadline) {
      const begin = pending.vertexAt, end = Math.min(r.vertices, begin + 128);
      if(owner&&sourceRecord)this.gpu!.copyVertices(owner.pool.gpu!,sourceRecord.vertex+begin,r.vertex+begin,end-begin);
      for (const [name, source, width] of arrays) {const a = this.geometry.getAttribute(name) as THREE.BufferAttribute;
        const out=this.gpu?this.gpu.scratch(name).subarray(0,(end-begin)*width):a.array.subarray((r.vertex+begin)*width,(r.vertex+end)*width);
        const codec=this.options.storage==='packed-1'?composerStorageCodec(name):null;
        if(source&&codec&&!stored) {
          for(let i=begin*width;i<end*width;i++) {
            const value=source[i]!;if(!Number.isFinite(value)||value<(codec.signed?-1:0)-1e-7||value>codec.range+1e-7)throw new Error(`Composer packed ${name} outside normalized range`);
            const encoded=Math.round(Math.max(codec.signed?-1:0,Math.min(codec.range,value))/codec.range*codec.scale);out[i-begin*width]=encoded;
            const error=Math.abs(value-encoded/codec.scale*codec.range),proof=r.proof!;
            if(name==='normal')proof.maxNormalError=Math.max(proof.maxNormalError,error);
            else if(name==='composerGloss')proof.maxGlossError=Math.max(proof.maxGlossError,error);
            else if(name!=='skinWeight')proof.maxColourError=Math.max(proof.maxColourError,error);
          }
        } else if (source) {
          if(name==='skinIndex'&&this.options.storage==='packed-1')for(let i=begin*width;i<end*width;i++)if(source[i]!>255||source[i]!<0||!Number.isInteger(source[i]))throw new Error('Composer packed joint exceeds byte range');
          out.set(source.subarray(begin*width,end*width));
        } else out.fill(0);
        if(this.gpu)this.gpu.upload(name,r.vertex+begin,end-begin);
        else {a.addUpdateRange((r.vertex + begin) * width, (end - begin) * width); a.needsUpdate = true;}}
      const rows = this.geometry.getAttribute('composerActor') as THREE.BufferAttribute;
      if(this.gpu){this.gpu.scratch('composerActor').fill(row,0,end-begin);this.gpu.upload('composerActor',r.vertex+begin,end-begin);}
      else {rows.array.fill(row, r.vertex + begin, r.vertex + end); rows.addUpdateRange(r.vertex + begin, end - begin); rows.needsUpdate = true;}
      if(r.proof) {
        if(!isGpuComposerSkin(skin)) {
        const weights=this.gpu?this.gpu.scratch('skinWeight'):this.geometry.getAttribute('skinWeight').array;
        for(let v=begin;v<end;v++) {
          const at=this.gpu?v-begin:r.vertex+v;
          let sum=0;for(let k=0;k<4;k++)sum+=weights[at*4+k]!/65535;
          if(sum<=0)throw new Error('Composer packed weights have zero sum');
          r.proof.maxWeightSumError=Math.max(r.proof.maxWeightSumError,Math.abs(sum-1));
          if(!isPackedComposerSkin(skin))for(let k=0;k<4;k++)r.proof.maxWeightError=Math.max(r.proof.maxWeightError,Math.abs(skin.skinWeight[v*4+k]!-weights[at*4+k]!/65535/sum));
        }
        }
        r.proof.checkedVertices=end;
      }
      pending.vertexAt = end;
    }
    const out = this.geometry.index!;
    while (pending.vertexAt === r.vertices && pending.indexAt < r.indices && now() < deadline) {
      const begin = pending.indexAt, end = Math.min(r.indices, begin + 768);
      for (let i = begin; i < end; i++) {if(this.gpu)this.gpu.indexScratch[i-begin]=skin.index[i]!+r.vertex;else out.array[r.index + i] = skin.index[i]! + r.vertex;}
      if(this.gpu)this.gpu.uploadIndices(r.index+begin,end-begin);
      else {out.addUpdateRange(r.index + begin, end - begin); out.needsUpdate = true;} pending.indexAt = end;
    }
    if (pending.indexAt < r.indices) return 'pending';
    if(r.proof)assertComposerQuantizationProof(r.proof);
    this.copying.delete(id); this.records.set(id, r); this.highIndex = Math.max(this.highIndex, r.index + this.indexFootprint(r.indices)); if(!this.indexSlots)this.geometry.setDrawRange(0, this.highIndex); return 'ready';
  }
  /** The arena owns these exact attribute views. Only the compact local index
   * and source-vertex map remain outside its already-accounted backing buffers.
   * Keep the skin object, not extracted array references: compaction refreshes
   * every live receipt's fields. Borrowed receipts expire when released. */
  residentSkin(id: string, source: FaunaComposerStoredSkin): FaunaComposerStoredSkin {
    const r = this.records.get(id); if (!r) throw new Error('Composer arena source not resident');
    if(this.gpu){
      assertComposerQuantizationProof(r.proof!);
      const index=compactComposerIndices(source.index),sourceVertex=source.sourceVertex?compactComposerIndices(source.sourceVertex):null;
      r.localIndex=index;
      const skin:FaunaComposerGpuSkin={version:source.version,index,sourceVertex,coatCrisp:source.coatCrisp,vertexCount:r.vertices,
        hasCoatLayers:isGpuComposerSkin(source)?source.hasCoatLayers:!!source.coatLayers,
        storage:{version:COMPOSER_GPU_STORAGE_VERSION,format:COMPOSER_PACKED_STORAGE_VERSION,proof:{...r.proof!},
          localIndexType:index instanceof Uint16Array?'uint16':'uint32',sourceVertexType:sourceVertex?(sourceVertex instanceof Uint16Array?'uint16':'uint32'):null}};
      gpuOwners.set(skin,{pool:this,id,record:r});return skin;
    }
    if(isGpuComposerSkin(source))throw new Error('Cannot borrow GPU-owned Composer attributes as CPU arrays');
    const view = (name:string,width:number) => (this.geometry.getAttribute(name).array as ComposerStoredArray).subarray(r.vertex*width,(r.vertex+r.vertices)*width);
    if(this.options.storage==='packed-1') {
      assertComposerQuantizationProof(r.proof!);
      const index=compactComposerIndices(source.index),sourceVertex=source.sourceVertex?compactComposerIndices(source.sourceVertex):null;
      const skin={...source,index,sourceVertex,storage:{version:COMPOSER_PACKED_STORAGE_VERSION,proof:{...r.proof!},
        localIndexType:index instanceof Uint16Array?'uint16':'uint32',sourceVertexType:sourceVertex?(sourceVertex instanceof Uint16Array?'uint16':'uint32'):null},positions:view('position',3) as Float32Array,normals:view('normal',3) as Int16Array,
        colors:view('color',3) as Uint16Array,skinIndex:view('skinIndex',4) as Uint8Array,skinWeight:view('skinWeight',4) as Uint16Array,gloss:view('composerGloss',1) as Uint8Array,
        coatLayers:source.coatLayers?{c0:view('coatL0',3) as Uint16Array,c1:view('coatL1',3) as Uint16Array,c2:view('coatL2',3) as Uint16Array,sample:view('coatSample',4) as Float32Array}:null} satisfies FaunaComposerPackedSkin;
      r.localIndex=index;r.views.add(new WeakRef(skin));this.refreshViews(r);return skin;
    }
    if(isPackedComposerSkin(source))throw new Error('Packed Composer tier cannot claim original floats');
    const skin={...source,positions:view('position',3) as Float32Array,normals:view('normal',3) as Float32Array,colors:view('color',3) as Float32Array,
      skinIndex:view('skinIndex',4) as Uint16Array,skinWeight:view('skinWeight',4) as Float32Array,gloss:view('composerGloss',1) as Float32Array,
      coatLayers:source.coatLayers?{c0:view('coatL0',3) as Float32Array,c1:view('coatL1',3) as Float32Array,c2:view('coatL2',3) as Float32Array,sample:view('coatSample',4) as Float32Array}:null};
    r.views.add(new WeakRef(skin));this.refreshViews(r);return skin;
  }
  /** Actual GPU bytes, only for an explicit inspection. The returned CPU copy is
   * owned by that caller and never retained in the resident cache. */
  static snapshotSkin(source:FaunaComposerStoredSkin):FaunaComposerRenderSkin|FaunaComposerPackedSkin {
    if(!isGpuComposerSkin(source))return source;
    const owner=gpuOwners.get(source),r=owner?.pool.records.get(owner.id),gpu=owner?.pool.gpu;
    if(!r||r!==owner?.record||!gpu)throw new Error('Composer GPU inspection source is no longer resident');
    const view=(name:string)=>gpu.read(name,r.vertex,r.vertices);
    const indices=gpu.readIndices(r.index,r.indices);for(let i=0;i<indices.length;i++){indices[i]-=r.vertex;if(indices[i]!==source.index[i])throw new Error('Composer GPU index readback differs from verified local topology');}
    const actorRows=view('composerActor');if(actorRows.some(row=>row!==r.row))throw new Error('Composer GPU actor rows differ from palette ownership');
    return {version:source.version,index:compactComposerIndices(indices),sourceVertex:source.sourceVertex,coatCrisp:source.coatCrisp,
      storage:{version:COMPOSER_PACKED_STORAGE_VERSION,proof:{...source.storage.proof},localIndexType:source.storage.localIndexType,sourceVertexType:source.storage.sourceVertexType,readback:'webgl2-getBufferSubData',sourceOwnership:COMPOSER_GPU_STORAGE_VERSION},
      positions:view('position') as Float32Array,normals:view('normal') as Int16Array,colors:view('color') as Uint16Array,skinIndex:view('skinIndex') as Uint8Array,
      skinWeight:view('skinWeight') as Uint16Array,gloss:view('composerGloss') as Uint8Array,
      coatLayers:source.hasCoatLayers?{c0:view('coatL0') as Uint16Array,c1:view('coatL1') as Uint16Array,c2:view('coatL2') as Uint16Array,sample:view('coatSample') as Float32Array}:null};
  }
  /** Called after context loss cleared all source owners. No stale allocation
   * receipt survives; canonical jobs repopulate the empty new buffers. */
  loseContext():void {
    // Remove Three's old-generation disposal listeners while the lost context
    // accepts deletion as a no-op. Reusing a geometry without this leaves an
    // old listener that would later delete stale VBO handles after restoration.
    this.geometry.dispose();this.rootTexture.dispose();(this.mesh.material as THREE.Material).dispose();this.mesh.customDepthMaterial!.dispose();this.mesh.customDistanceMaterial!.dispose();
  }
  restoreContext():void {if(this.records.size||this.copying.size)throw new Error('Composer context restoration requires an empty arena');this.gpu?.restore();this.rootTexture.needsUpdate=true;}
  reset():void {for(const id of new Set([...this.records.keys(),...this.copying.keys()]))this.release(id);this.beginFrame();this.endFrame();}
  beginFrame(): void {for (const p of this.copying.values()) p.seen = false; this.active = 0; this.triangles = 0; for (const r of this.records.values()) {this.roots[r.row * 28 + 23] = 0;if(this.indexSlots)r.pass=0;}}
  submit(id: string, matrix: THREE.Matrix4, cameraVisible=true): boolean {
    const r = this.records.get(id); if (!r || this.disposed) return false;
    const at = r.row * 28, crisp = r.crisp, seed = crisp?.seed ?? 0;
    matrix.toArray(this.roots, at); this.roots[at + 16] = seed & 65535; this.roots[at + 17] = seed >>> 16;
    this.roots[at + 18] = crisp?.cellsPerBody ?? 0; this.roots[at + 19] = crisp?.threshold ?? 0;
    this.roots[at + 20] = crisp?.warp ?? 0; this.roots[at + 21] = crisp?.bellyLine ?? 0; this.roots[at + 22] = crisp?.code ?? 0; this.roots[at + 23] = 1;
    this.roots[at + 24] = r.roughness;
    if(this.indexSlots){if(!r.pass){this.active++;this.triangles+=r.indices/3;}r.pass=cameraVisible||r.pass===1?1:2;return true;}
    this.active++; this.triangles += r.indices / 3; return true;
  }
  endFrame(): void {for (const [id, p] of this.copying) if (!p.seen) this.release(id);if(this.indexSlots)this.partitionIndexSlots(); this.rootTexture.needsUpdate = true; this.mesh.visible = this.active > 0;}
  release(id: string): void {
    const r = this.records.get(id) ?? this.copying.get(id)?.record; if (!r) return;
    if(this.indexSlots){
      const gl=this.gpu?.gl,previous=gl?.getParameter(gl.COPY_WRITE_BUFFER_BINDING);
      try{try{this.clearIndices(r.index,this.indexFootprint(r.indices));}catch(error){if(!gl?.isContextLost())this.writeIndexSlot(r,r.index/this.options.maxIndexPerRecord!);throw error;}}
      finally{if(gl)gl.bindBuffer(gl.COPY_WRITE_BUFFER,previous);}
    }else this.clearIndices(r.index,r.indices);
    this.records.delete(id); this.copying.delete(id); this.roots[r.row * 28 + 23] = 0;r.views.clear();
    if(this.indexSlots)this.indexSlots[r.index/this.options.maxIndexPerRecord!]=null;
    release(this.freeVertices, r.vertex, r.vertices); release(this.freeIndices, r.index, this.indexFootprint(r.indices));
    this.highIndex = Math.max(0, ...[...this.records.values()].map(record => record.index + this.indexFootprint(record.indices))); if(!this.indexSlots)this.geometry.setDrawRange(0, this.highIndex);
  }
  diagnostics() {return {storage:this.options.storage??'float-1',ownership:this.gpu?COMPOSER_GPU_STORAGE_VERSION:'cpu-gpu-mirror',vertexStride:this.options.storage==='packed-1'?73:120,actors: this.active, records: this.records.size, copying: this.copying.size, draws: this.active ? 1 : 0, activeTriangles: this.triangles, reservedTriangles: this.highIndex / 3, ownedBytes: this.disposed ? 0 : this.ownedBytes, cpuBytes:this.disposed?0:this.cpuBytes,gpuBytes:this.disposed?0:this.gpuBytes,compactionMoves:this.compactionMoves,compactionMaxMoveMs:this.compactionMaxMoveMs,compactionMaxOverrunMs:this.compactionMaxOverrunMs,
    ...(this.indexSlots?{maxIndexPerRecord:this.options.maxIndexPerRecord,indexMetadataBytes:this.disposed?0:this.indexMetadataBytes,indexSlotSwaps:this.indexSlotSwaps,cameraActors:this.cameraSlots,unionActors:this.activeSlots,cameraSubmittedTriangles:this.cameraSlots*this.options.maxIndexPerRecord!/3,unionSubmittedTriangles:this.activeSlots*this.options.maxIndexPerRecord!/3}: {})};}
  dispose(): void {if (this.disposed) return; this.disposed = true; this.records.clear(); this.copying.clear();this.indexSlots?.fill(null);this.viewCameras=[];this.restorePassCallbacks?.(); this.mesh.removeFromParent(); this.geometry.dispose();this.gpu?.dispose(); (this.mesh.material as THREE.Material).dispose(); this.mesh.customDepthMaterial!.dispose(); this.mesh.customDistanceMaterial!.dispose(); this.rootTexture.dispose();}
}
