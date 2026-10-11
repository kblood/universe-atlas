import * as THREE from 'three';
import {createComposerColouredMaterial, COMPOSER_COAT_CRISP_GLSL} from './fauna-composer.ts';
import {patchFaunaComposerInstancing} from './fauna-composer-instance-batch.ts';
import type {FaunaComposerRenderSkin} from './fauna-composer-render-source.ts';
import {COMPOSER_PACKED_STORAGE_VERSION, isPackedComposerSkin, compactComposerIndices, composerQuantizationProof, composerStorageCodec, assertComposerQuantizationProof, type ComposerQuantizationProof, type ComposerStoredArray, type FaunaComposerStoredSkin, type FaunaComposerPackedSkin, type FaunaComposerArenaStorage} from './fauna-composer-storage.ts';

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
type Record = {vertex: number; vertices: number; index: number; indices: number; row: number; skinVersion: string; crisp: FaunaComposerRenderSkin['coatCrisp']; roughness: number; proof?: ComposerQuantizationProof};
export interface FaunaComposerMergedOptions {storage?: FaunaComposerArenaStorage; maxVertices: number; maxIndices: number; maxActors: number; maxBytes: number; bones: {value: THREE.DataTexture}}

/** Bounded unique-geometry arena: one draw for any mix of Composer anatomy and
 * coats. CPU source arrays are copied once on admission, never regenerated.
 * Released index blocks become degenerate until reused; reserved triangles are
 * reported separately from active triangles. No per-frame geometry rebuilding. */
export class FaunaComposerMergedBatch {
  readonly mesh: THREE.Mesh;
  readonly ownedBytes: number;
  private readonly geometry = new THREE.BufferGeometry();
  private readonly records = new Map<string, Record>();
  private readonly copying = new Map<string, {record: Record; skin: FaunaComposerStoredSkin; vertexAt: number; indexAt: number; seen: boolean}>();
  readonly backingBuffers = new Set<ArrayBufferLike>();
  private readonly freeVertices: Block[]; private readonly freeIndices: Block[];
  private readonly roots: Float32Array; private readonly rootTexture: THREE.DataTexture;
  private readonly options: FaunaComposerMergedOptions;
  private highIndex = 0; private disposed = false; private active = 0; private triangles = 0;
  constructor(options: FaunaComposerMergedOptions) {
    this.options = options;
    if (options.storage !== undefined && options.storage !== 'float-1' && options.storage !== 'packed-1') throw new Error('Unknown Composer arena storage');
    if (![options.maxVertices, options.maxIndices, options.maxActors, options.maxBytes].every(n => Number.isSafeInteger(n) && n > 0) || options.maxIndices % 3 || options.maxActors > 512) throw new Error('Invalid merged Composer capacity');
    // Packed: position12 + normal6 + colour6 + joints4 + weights8 + gloss1
    // + coat colours18 + exact noise sample16 + actor row2 =73 bytes/vertex.
    const packed = options.storage === 'packed-1';
    this.ownedBytes = (options.maxVertices * (packed ? 73 : 120) + options.maxIndices * 4 + options.maxActors * 28 * 4) * 2;
    if (this.ownedBytes > options.maxBytes) throw new Error('Merged Composer arena exceeds byte ceiling');
    const vertex = options.maxVertices;
    for (const [name, width] of [['position',3],['normal',3],['color',3],['skinWeight',4],['composerGloss',1],['coatL0',3],['coatL1',3],['coatL2',3],['coatSample',4],['composerActor',1],['skinIndex',4]] as const) {
      const codec = composerStorageCodec(name);
      const ArrayType = !packed ? (name==='skinIndex'?Uint16Array:Float32Array) : name==='normal'?Int16Array : name==='composerGloss'||name==='skinIndex'?Uint8Array : codec||name==='composerActor'?Uint16Array:Float32Array;
      this.geometry.setAttribute(name, new THREE.BufferAttribute(new ArrayType(vertex*width),width,packed&&!!codec).setUsage(THREE.DynamicDrawUsage));
    }
    this.geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(options.maxIndices), 1).setUsage(THREE.DynamicDrawUsage)); this.geometry.setDrawRange(0, 0);
    for (const attribute of Object.values(this.geometry.attributes)) this.backingBuffers.add(attribute.array.buffer); this.backingBuffers.add(this.geometry.index!.array.buffer);
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
  }
  register(id: string, skin: FaunaComposerStoredSkin, row: number, roughness = .82): boolean {
    if (this.records.has(id)) return false;
    return this.registerSlice(id, skin, row, roughness, Infinity) === 'ready';
  }
  canAdmit(skin: FaunaComposerStoredSkin): boolean {
    return this.freeVertices.some(b => b.count >= skin.positions.length / 3) && this.freeIndices.some(b => b.count >= skin.index.length);
  }
  /** Copies at most 128 vertices or 768 indices between deadline checks. A
   * partial admission is invisible and retains its previous tier until complete. */
  registerSlice(id: string, skin: FaunaComposerStoredSkin, row: number, roughness: number, deadline: number, now = () => performance.now()): 'ready'|'pending'|'full' {
    if (this.records.has(id)) return 'ready';
    if (isPackedComposerSkin(skin) && this.options.storage !== 'packed-1') throw new Error('Cannot restore a raw Composer tier from packed runtime attributes');
    if (this.disposed || !id || !Number.isInteger(row) || row < 0 || row >= this.options.maxActors) return 'full';
    let pending = this.copying.get(id);
    if (pending && pending.skin !== skin) {this.release(id); pending = undefined;}
    if (!pending) {
      if ([...this.records.values()].some(r => r.row === row) || [...this.copying.values()].some(p => p.record.row === row)) return 'full';
      const vertices = skin.positions.length / 3, indices = skin.index.length;
      const vertex = allocate(this.freeVertices, vertices); if (vertex === null) return 'full';
      const index = allocate(this.freeIndices, indices); if (index === null) {release(this.freeVertices, vertex, vertices); return 'full';}
      pending = {record: {vertex, vertices, index, indices, row, skinVersion: skin.version, crisp: skin.coatCrisp, roughness, proof:this.options.storage==='packed-1'?{...(isPackedComposerSkin(skin)?skin.storage.proof:composerQuantizationProof(vertices)),checkedVertices:0}:undefined}, skin, vertexAt: 0, indexAt: 0, seen: true};
      this.copying.set(id, pending); this.roots[row * 28 + 23] = 0;
    }
    pending.seen = true; const r = pending.record;
    const arrays: [string, ComposerStoredArray|null, number][] = [['position', skin.positions, 3], ['normal', skin.normals, 3], ['color', skin.colors, 3], ['skinIndex', skin.skinIndex, 4], ['skinWeight', skin.skinWeight, 4], ['composerGloss', skin.gloss, 1],
      ['coatL0', skin.coatLayers?.c0 ?? skin.colors, 3], ['coatL1', skin.coatLayers?.c1 ?? skin.colors, 3], ['coatL2', skin.coatLayers?.c2 ?? skin.colors, 3], ['coatSample', skin.coatLayers?.sample ?? null, 4]];
    while (pending.vertexAt < r.vertices && now() < deadline) {
      const begin = pending.vertexAt, end = Math.min(r.vertices, begin + 128);
      for (const [name, source, width] of arrays) {const a = this.geometry.getAttribute(name) as THREE.BufferAttribute;
        const codec=this.options.storage==='packed-1'?composerStorageCodec(name):null;
        if(source&&codec&&!isPackedComposerSkin(skin)) {
          for(let i=begin*width;i<end*width;i++) {
            const value=source[i]!;if(!Number.isFinite(value)||value<(codec.signed?-1:0)-1e-7||value>codec.range+1e-7)throw new Error(`Composer packed ${name} outside normalized range`);
            const encoded=Math.round(Math.max(codec.signed?-1:0,Math.min(codec.range,value))/codec.range*codec.scale);a.array[r.vertex*width+i]=encoded;
            const error=Math.abs(value-encoded/codec.scale*codec.range),proof=r.proof!;
            if(name==='normal')proof.maxNormalError=Math.max(proof.maxNormalError,error);
            else if(name==='composerGloss')proof.maxGlossError=Math.max(proof.maxGlossError,error);
            else if(name!=='skinWeight')proof.maxColourError=Math.max(proof.maxColourError,error);
          }
        } else if (source) {
          if(name==='skinIndex'&&this.options.storage==='packed-1')for(let i=begin*width;i<end*width;i++)if(source[i]!>255||source[i]!<0||!Number.isInteger(source[i]))throw new Error('Composer packed joint exceeds byte range');
          a.array.set(source.subarray(begin*width,end*width),(r.vertex+begin)*width);
        } else a.array.fill(0,(r.vertex+begin)*width,(r.vertex+end)*width);
        a.addUpdateRange((r.vertex + begin) * width, (end - begin) * width); a.needsUpdate = true;}
      const rows = this.geometry.getAttribute('composerActor') as THREE.BufferAttribute; rows.array.fill(row, r.vertex + begin, r.vertex + end); rows.addUpdateRange(r.vertex + begin, end - begin); rows.needsUpdate = true;
      if(r.proof) {
        const weights=this.geometry.getAttribute('skinWeight').array;
        for(let v=begin;v<end;v++) {
          let sum=0;for(let k=0;k<4;k++)sum+=weights[(r.vertex+v)*4+k]!/65535;
          if(sum<=0)throw new Error('Composer packed weights have zero sum');
          r.proof.maxWeightSumError=Math.max(r.proof.maxWeightSumError,Math.abs(sum-1));
          if(!isPackedComposerSkin(skin))for(let k=0;k<4;k++)r.proof.maxWeightError=Math.max(r.proof.maxWeightError,Math.abs(skin.skinWeight[v*4+k]!-weights[(r.vertex+v)*4+k]!/65535/sum));
        }
        r.proof.checkedVertices=end;
      }
      pending.vertexAt = end;
    }
    const out = this.geometry.index!;
    while (pending.vertexAt === r.vertices && pending.indexAt < r.indices && now() < deadline) {
      const begin = pending.indexAt, end = Math.min(r.indices, begin + 768);
      for (let i = begin; i < end; i++) out.array[r.index + i] = skin.index[i]! + r.vertex;
      out.addUpdateRange(r.index + begin, end - begin); out.needsUpdate = true; pending.indexAt = end;
    }
    if (pending.indexAt < r.indices) return 'pending';
    if(r.proof)assertComposerQuantizationProof(r.proof);
    this.copying.delete(id); this.records.set(id, r); this.highIndex = Math.max(this.highIndex, r.index + r.indices); this.geometry.setDrawRange(0, this.highIndex); return 'ready';
  }
  /** The arena owns these exact attribute views. Only the compact local index
   * and source-vertex map remain outside its already-accounted backing buffers. */
  residentSkin(id: string, source: FaunaComposerStoredSkin): FaunaComposerStoredSkin {
    const r = this.records.get(id); if (!r) throw new Error('Composer arena source not resident');
    const view = (name:string,width:number) => (this.geometry.getAttribute(name).array as ComposerStoredArray).subarray(r.vertex*width,(r.vertex+r.vertices)*width);
    if(this.options.storage==='packed-1') {
      assertComposerQuantizationProof(r.proof!);
      const index=compactComposerIndices(source.index),sourceVertex=source.sourceVertex?compactComposerIndices(source.sourceVertex):null;
      return {...source,index,sourceVertex,storage:{version:COMPOSER_PACKED_STORAGE_VERSION,proof:{...r.proof!},
        localIndexType:index instanceof Uint16Array?'uint16':'uint32',sourceVertexType:sourceVertex?(sourceVertex instanceof Uint16Array?'uint16':'uint32'):null},positions:view('position',3) as Float32Array,normals:view('normal',3) as Int16Array,
        colors:view('color',3) as Uint16Array,skinIndex:view('skinIndex',4) as Uint8Array,skinWeight:view('skinWeight',4) as Uint16Array,gloss:view('composerGloss',1) as Uint8Array,
        coatLayers:source.coatLayers?{c0:view('coatL0',3) as Uint16Array,c1:view('coatL1',3) as Uint16Array,c2:view('coatL2',3) as Uint16Array,sample:view('coatSample',4) as Float32Array}:null} satisfies FaunaComposerPackedSkin;
    }
    if(isPackedComposerSkin(source))throw new Error('Packed Composer tier cannot claim original floats');
    return {...source,positions:view('position',3) as Float32Array,normals:view('normal',3) as Float32Array,colors:view('color',3) as Float32Array,
      skinIndex:view('skinIndex',4) as Uint16Array,skinWeight:view('skinWeight',4) as Float32Array,gloss:view('composerGloss',1) as Float32Array,
      coatLayers:source.coatLayers?{c0:view('coatL0',3) as Float32Array,c1:view('coatL1',3) as Float32Array,c2:view('coatL2',3) as Float32Array,sample:view('coatSample',4) as Float32Array}:null};
  }
  beginFrame(): void {for (const p of this.copying.values()) p.seen = false; this.active = 0; this.triangles = 0; for (const r of this.records.values()) this.roots[r.row * 28 + 23] = 0;}
  submit(id: string, matrix: THREE.Matrix4): boolean {
    const r = this.records.get(id); if (!r || this.disposed) return false;
    const at = r.row * 28, crisp = r.crisp, seed = crisp?.seed ?? 0;
    matrix.toArray(this.roots, at); this.roots[at + 16] = seed & 65535; this.roots[at + 17] = seed >>> 16;
    this.roots[at + 18] = crisp?.cellsPerBody ?? 0; this.roots[at + 19] = crisp?.threshold ?? 0;
    this.roots[at + 20] = crisp?.warp ?? 0; this.roots[at + 21] = crisp?.bellyLine ?? 0; this.roots[at + 22] = crisp?.code ?? 0; this.roots[at + 23] = 1;
    this.roots[at + 24] = r.roughness;
    this.active++; this.triangles += r.indices / 3; return true;
  }
  endFrame(): void {for (const [id, p] of this.copying) if (!p.seen) this.release(id); this.rootTexture.needsUpdate = true; this.mesh.visible = this.active > 0;}
  release(id: string): void {
    const r = this.records.get(id) ?? this.copying.get(id)?.record; if (!r) return; this.records.delete(id); this.copying.delete(id); this.roots[r.row * 28 + 23] = 0;
    const index = this.geometry.index!; index.array.fill(0, r.index, r.index + r.indices); index.addUpdateRange(r.index, r.indices); index.needsUpdate = true;
    release(this.freeVertices, r.vertex, r.vertices); release(this.freeIndices, r.index, r.indices);
    this.highIndex = Math.max(0, ...[...this.records.values()].map(record => record.index + record.indices)); this.geometry.setDrawRange(0, this.highIndex);
  }
  diagnostics() {return {storage:this.options.storage??'float-1',vertexStride:this.options.storage==='packed-1'?73:120,actors: this.active, records: this.records.size, copying: this.copying.size, draws: this.active ? 1 : 0, activeTriangles: this.triangles, reservedTriangles: this.highIndex / 3, ownedBytes: this.disposed ? 0 : this.ownedBytes, cpuBytes: this.ownedBytes / 2, gpuBytes: this.ownedBytes / 2};}
  dispose(): void {if (this.disposed) return; this.disposed = true; this.records.clear(); this.copying.clear(); this.mesh.removeFromParent(); this.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); this.mesh.customDepthMaterial!.dispose(); this.mesh.customDistanceMaterial!.dispose(); this.rootTexture.dispose();}
}
