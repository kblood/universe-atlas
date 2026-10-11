import * as THREE from 'three';
import {COMPOSER_BUDGET, type ComposerGraph, type ComposerPose} from './fauna-composer-rig.ts';
import {FaunaComposerPaletteWriter} from './fauna-composer-palette.ts';
import {FaunaComposerInstanceBatch, FAUNA_COMPOSER_REQUIRED_ATTRIBUTES} from './fauna-composer-instance-batch.ts';
import {FAUNA_COMPOSER_TIERS, FAUNA_COMPOSER_RENDER_VERSION, composerTypedBytes, validateComposerRenderSkin, validateComposerRenderLod,
  type FaunaComposerSource, type FaunaComposerSourceProvider, type FaunaComposerBuildResult, type FaunaComposerRenderSkin, type FaunaComposerTier} from './fauna-composer-render-source.ts';

export interface FaunaComposerCandidate<D> {
  id: string; definition: D; sourceKey: string;
  /** Metre-space body to radius-normalized origin-relative world. +X is forward. */
  matrix: THREE.Matrix4; distanceM: number; cameraVisible: boolean; shadowVisible?: boolean;
  rigSeconds: number;
  /** Include date, ground revision, activity and every pose option, or omit to evaluate each frame. */
  poseKey?: string;
}
export interface FaunaComposerRendererOptions<D, C extends FaunaComposerCandidate<D>> {
  provider: FaunaComposerSourceProvider<D>;
  /** Shared Kit Composer solver, including its terrain/flight options. Never a quadruped retarget. */
  pose: (graph: ComposerGraph, candidate: C) => ComposerPose;
  /** Attach the planet's lighting/aerial/shadow hooks to this owned mesh once. */
  onMeshAdopted?: (mesh: THREE.InstancedMesh) => void;
  capacity?: number; maxSources?: number; maxBones?: number; maxBytes?: number; maxResultBytes?: number;
  workerReserveBytes?: number; maxDistanceM?: number; nearM?: number; middleM?: number;
  fullSourceCache?: number; adoptionBudgetMs?: number; now?: () => number; onReady?: () => void;
}
type Entry = {source: FaunaComposerSource | null; graph: ComposerGraph; levels: Partial<Record<FaunaComposerTier, FaunaComposerRenderSkin>>;
  batches: Partial<Record<FaunaComposerTier, FaunaComposerInstanceBatch>>; writer: FaunaComposerPaletteWriter;
  definition: string; used: number; cpuBytes: number};
type Actor = {key: string; row: number; poseKey?: string; tier?: FaunaComposerTier; pose: ComposerPose | null; poseBytes: number};
type Running = {key: string; definition: string; epoch: number; abort: AbortController};
const positive = (n: number) => Number.isSafeInteger(n) && n > 0;

/** Normal-runtime Composer draw owner. All tiers come from one immutable source;
 * a pending or failed upgrade continues to draw a resident tier. Cold animals
 * remain explicitly pending until their actual source arrives. No proxy body,
 * secondary generator, fixed rig or altitude-dependent representation exists.
 *
 * Call with camera-first, distance/id-stable candidates. One asynchronous build
 * and one bounded result adoption may be active. Object and buffer lifetimes
 * follow source eviction/context reset; CPU and GPU copies are counted separately. */
export class FaunaComposerRenderer<D, C extends FaunaComposerCandidate<D> = FaunaComposerCandidate<D>> {
  readonly group = new THREE.Group();
  readonly capacity: number;
  readonly maxBones: number;
  readonly workerReserveBytes: number;
  private readonly options: FaunaComposerRendererOptions<D, C>;
  private readonly entries = new Map<string, Entry>();
  private readonly actors = new Map<string, Actor>();
  private readonly failed = new Map<string, number>();
  private readonly desired = new Map<string, C>();
  private readonly fullSourceKeys = new Set<string>();
  private paletteData: Float32Array;
  private scratch: Float32Array;
  private readonly paletteUniform: {value: THREE.DataTexture};
  private paletteBones: number;
  private readonly drawn = new Set<string>();
  private running: Running | null = null;
  private pending: {run: Running; result: FaunaComposerBuildResult} | null = null;
  private frame = 0; private epoch = 0; private context = ''; private disposed = false;
  private readonly maxSources: number; private readonly maxBytes: number; private readonly maxResultBytes: number;
  private readonly now: () => number;
  private stats = {builds: 0, failures: 0, evictions: 0, stale: 0, budgetDrops: 0, pending: 0, poseFailures: 0,
    buildMs: 0, adoptionMs: 0, adoptionOverruns: 0, active: 0, draws: 0, triangles: 0, poseBuilds: 0, uploadBytes: 0};
  private lastError: string | null = null;

  constructor(options: FaunaComposerRendererOptions<D, C>) {
    this.options = options; this.capacity = options.capacity ?? 512; this.maxBones = options.maxBones ?? COMPOSER_BUDGET.maxBones;
    this.maxSources = options.maxSources ?? 512; this.maxBytes = options.maxBytes ?? 32 * 1024 * 1024;
    this.maxResultBytes = options.maxResultBytes ?? 8 * 1024 * 1024; this.workerReserveBytes = options.workerReserveBytes ?? 16 * 1024 * 1024;
    this.now = options.now ?? (() => performance.now());
    if (![this.capacity, this.maxBones, this.maxSources, this.maxBytes, this.maxResultBytes, this.workerReserveBytes].every(positive) ||
        this.capacity > 512 || this.maxBones > COMPOSER_BUDGET.maxBones || this.maxSources > 512 ||
        (options.nearM ?? 35) <= 0 || (options.middleM ?? 140) <= (options.nearM ?? 35) ||
        (options.maxDistanceM ?? 600) < (options.middleM ?? 140) || (options.adoptionBudgetMs ?? 3) <= 0) throw new Error('Invalid Composer renderer budgets');
    this.paletteBones = Math.min(16, this.maxBones);
    this.paletteData = new Float32Array(this.capacity * this.paletteBones * 16); this.scratch = new Float32Array(this.maxBones * 16);
    this.paletteUniform = {value: this.makePalette()};
    if (this.ownedBytes > this.maxBytes) {this.paletteUniform.value.dispose(); throw new Error('Composer palette exceeds resident budget');}
    this.group.name = 'Planet Composer animals'; this.group.userData.version = FAUNA_COMPOSER_RENDER_VERSION;
  }
  private makePalette(): THREE.DataTexture {
    const texture = new THREE.DataTexture(this.paletteData, this.paletteBones * 4, this.capacity, THREE.RGBAFormat, THREE.FloatType);
    texture.minFilter = texture.magFilter = THREE.NearestFilter; texture.generateMipmaps = false;
    texture.internalFormat = 'RGBA32F'; texture.needsUpdate = true; return texture;
  }
  private resizePalette(bones: number): void {
    const old = this.paletteData, width = this.paletteBones;
    this.paletteBones = bones; this.paletteData = new Float32Array(this.capacity * bones * 16);
    for (let row = 0; row < this.capacity; row++) this.paletteData.set(old.subarray(row * width * 16, row * width * 16 + Math.min(width, bones) * 16), row * bones * 16);
    this.paletteUniform.value.dispose(); this.paletteUniform.value = this.makePalette();
  }
  /** Fail before rendering on unsupported devices; 15 slots include full crisp coat and matrix instancing. */
  assertCapabilities(renderer: THREE.WebGLRenderer): void {
    const c = renderer.capabilities;
    if (c.maxAttributes < FAUNA_COMPOSER_REQUIRED_ATTRIBUTES || c.maxVertexTextures < 1 ||
        c.maxTextureSize < Math.max(this.maxBones * 4, this.capacity)) throw new Error('Planet Composer requires variable bone textures and 15 vertex attributes');
  }
  setContext(context: string): void {
    if (context === this.context) return; this.context = context; this.epoch++;
    this.running?.abort.abort(); this.pending = null; this.desired.clear(); this.drawn.clear(); this.actors.clear(); this.failed.clear();
    for (const key of this.entries.keys()) this.evict(key);
    this.resizePalette(Math.min(16, this.maxBones));
  }
  update(candidates: readonly C[], origin?: THREE.Vector3): ReadonlySet<string> {
    this.drawn.clear(); if (this.disposed) return this.drawn;
    if (origin) this.group.position.copy(origin);
    this.frame++; this.desired.clear(); this.stats.budgetDrops = 0; this.stats.pending = 0;
    const keys = new Set<string>();
    for (const c of candidates) {
      if ((!c.cameraVisible && !c.shadowVisible) || !c.id || !c.sourceKey || !Number.isFinite(c.distanceM) || c.distanceM < 0 || c.distanceM > (this.options.maxDistanceM ?? 600) || this.desired.has(c.id)) continue;
      if (this.desired.size >= this.capacity) {this.stats.budgetDrops++; continue;}
      this.desired.set(c.id, c); keys.add(c.sourceKey);
    }
    this.fullSourceKeys.clear();
    for (const c of this.desired.values()) if (c.distanceM < (this.options.nearM ?? 35) * 1.1 && this.fullSourceKeys.size < (this.options.fullSourceCache ?? 6)) this.fullSourceKeys.add(c.sourceKey);
    this.trimFullSources(); this.adoptPending(keys);
    for (const entry of this.entries.values()) for (const batch of Object.values(entry.batches)) batch.beginFrame();
    for (const [id, actor] of this.actors) if (this.desired.get(id)?.sourceKey !== actor.key) this.actors.delete(id);
    const rows = new Set([...this.actors.values()].map(a => a.row));
    let dirty = false; this.stats.active = 0; this.stats.draws = 0; this.stats.triangles = 0; this.stats.uploadBytes = 0;
    for (const c of this.desired.values()) {
      const entry = this.entries.get(c.sourceKey);
      if (!entry) {this.stats.pending++; continue;}
      // Detect accidental key reuse instead of replacing another phenotype under the same cache key.
      if (entry.definition !== JSON.stringify(c.definition)) {this.lastError = 'Composer source key reused for a different definition'; this.stats.failures++; continue;}
      entry.used = this.frame;
      let actor = this.actors.get(c.id);
      const wanted = this.candidateTier(c, actor?.tier);
      const available = [wanted, ...FAUNA_COMPOSER_TIERS.filter(t => t !== wanted).sort((a, b) => Math.abs(FAUNA_COMPOSER_TIERS.indexOf(a) - FAUNA_COMPOSER_TIERS.indexOf(wanted)) - Math.abs(FAUNA_COMPOSER_TIERS.indexOf(b) - FAUNA_COMPOSER_TIERS.indexOf(wanted)))].find(t => entry.levels[t]);
      if (!available) {this.stats.pending++; continue;}
      const instances = [...this.desired.values()].filter(x => x.sourceKey === c.sourceKey).length;
      const batch = this.batch(entry, available, keys, instances); if (!batch) {this.stats.budgetDrops++; continue;}
      if (!actor) {let row = 0; while (rows.has(row)) row++; rows.add(row); actor = {key: c.sourceKey, row, pose: null, poseBytes: 0}; this.actors.set(c.id, actor);}
      try {
        if (!actor.pose || c.poseKey === undefined || actor.poseKey !== c.poseKey) {
          const pose = this.options.pose(entry.graph, c); entry.writer.write(pose, this.scratch);
          const poseBytes = composerTypedBytes(pose) + JSON.stringify(pose.contacts).length * 2;
          if (!this.room(poseBytes - actor.poseBytes, keys, false)) throw new Error('Composer pose exceeds resident budget');
          const count = entry.graph.bones.length * 16, offset = actor.row * this.paletteBones * 16;
          for (let i = 0; i < count; i++) if (!Object.is(this.paletteData[offset + i], this.scratch[i])) {this.paletteData[offset + i] = this.scratch[i]!; dirty = true;}
          actor.pose = pose; actor.poseBytes = poseBytes; actor.poseKey = c.poseKey; this.stats.poseBuilds++;
        }
        if (c.matrix.elements.some(x => !Number.isFinite(x))) throw new Error('Invalid Composer instance transform');
        batch.submit(c.matrix, actor.row); actor.tier = available; this.drawn.add(c.id); this.stats.active++;
        this.stats.triangles += batch.skin.index.length / 3;
      } catch (error) {this.stats.poseFailures++; this.lastError = String(error);}
    }
    for (const entry of this.entries.values()) for (const batch of Object.values(entry.batches)) {batch.endFrame(); if (batch.mesh.count) this.stats.draws++;}
    if (dirty) {this.paletteUniform.value.needsUpdate = true; this.stats.uploadBytes = this.paletteData.byteLength;}
    this.startNext(); return this.drawn;
  }
  private tier(distance: number, previous?: FaunaComposerTier): FaunaComposerTier {
    const near = this.options.nearM ?? 35, middle = this.options.middleM ?? 140;
    if (previous === 'near' && distance < near * 1.1) return 'near';
    if (previous === 'far' && distance > middle * .9) return 'far';
    if (previous === 'middle' && distance >= near * .9 && distance <= middle * 1.1) return 'middle';
    return distance < near ? 'near' : distance < middle ? 'middle' : 'far';
  }
  private candidateTier(c: C, previous?: FaunaComposerTier): FaunaComposerTier {
    const tier = this.tier(c.distanceM, previous); return tier === 'near' && !this.fullSourceKeys.has(c.sourceKey) ? 'middle' : tier;
  }
  private entryBytes(entry: Entry): number {
    let bytes = entry.cpuBytes + entry.writer.ownedBytes;
    for (const b of Object.values(entry.batches)) bytes += b.uploadedGeometryBytes + b.instanceBytes * 2;
    return bytes;
  }
  get ownedBytes(): number {let n = this.paletteData.byteLength * 2 + this.scratch.byteLength; for (const e of this.entries.values()) n += this.entryBytes(e); for (const a of this.actors.values()) n += a.poseBytes; return n;}
  get reservedBytes(): number {return this.disposed ? 0 : this.ownedBytes + this.workerReserveBytes + (this.pending ? composerTypedBytes(this.pending.result) : 0);}
  private room(bytes: number, protectedKeys: ReadonlySet<string>, extraEntry: boolean): boolean {
    while (this.ownedBytes + bytes > this.maxBytes || (extraEntry && this.entries.size >= this.maxSources)) {
      const victim = [...this.entries].filter(([key]) => !protectedKeys.has(key)).sort((a, b) => a[1].used - b[1].used)[0];
      if (!victim) return false; this.evict(victim[0]);
    }
    return true;
  }
  private batch(entry: Entry, tier: FaunaComposerTier, protectedKeys: ReadonlySet<string>, instances: number): FaunaComposerInstanceBatch | null {
    const existing = entry.batches[tier]; if (existing && existing.capacity >= instances) return existing;
    const skin = entry.levels[tier]!;
    // sourceVertex is not uploaded. This upper bound also counts it and safely over-reserves admission.
    const bytes = (existing ? 0 : composerTypedBytes(skin)) + instances * 68 * 2 - (existing?.instanceBytes ?? 0) * 2;
    if (!this.room(bytes, protectedKeys, false)) return null;
    existing?.dispose();
    const batch = new FaunaComposerInstanceBatch(skin, this.paletteUniform, instances);
    try {this.options.onMeshAdopted?.(batch.mesh);} catch (error) {batch.dispose(); this.lastError = String(error); return null;}
    entry.batches[tier] = batch; this.group.add(batch.mesh); return batch;
  }
  private adoptPending(keys: ReadonlySet<string>): void {
    this.stats.adoptionMs = 0; if (!this.pending) return;
    const {run, result} = this.pending; this.pending = null; const started = this.now();
    try {
      if (run.epoch !== this.epoch || !keys.has(run.key)) {this.stats.stale++; return;}
      if (result.key !== run.key || !result.source || result.source.skin.version !== 'fauna-composer-skin-6') throw new Error('Composer source identity/version mismatch');
      const count = result.source.graph.bones.length;
      if (count < 1 || count > this.maxBones || composerTypedBytes(result) > this.maxResultBytes) throw new Error('Composer build result exceeds budget');
      validateComposerRenderSkin({...result.source.skin, sourceVertex: null}, count);
      for (const level of Object.values(result.levels)) {if (level.version !== result.source.skin.version) throw new Error('LOD source version mismatch'); validateComposerRenderSkin(level, count); validateComposerRenderLod(result.source.skin, level);}
      if (!Object.keys(result.levels).length) throw new Error('Composer build returned no levels');
      const prior = this.entries.get(run.key);
      if (prior && JSON.stringify(prior.graph) !== JSON.stringify(result.source.graph)) throw new Error('Composer source graph changed during upgrade');
      // Never mutate a resident original during a tier upgrade.
      let source: FaunaComposerSource | null = prior?.source ?? result.source;
      const levels = {...result.levels, ...prior?.levels};
      for (const level of Object.values(levels)) validateComposerRenderLod(source.skin, level);
      const graph = source.graph, writer = prior?.writer ?? new FaunaComposerPaletteWriter(graph);
      if (!this.fullSourceKeys.has(run.key) && (levels.middle || levels.far)) {source = null; delete levels.near;}
      const definitionBytes = (run.definition.length + run.key.length) * 2, graphBytes = JSON.stringify(graph).length * 2;
      const cpuBytes = composerTypedBytes({source, levels}) + definitionBytes + graphBytes;
      const width = Math.max(this.paletteBones, Math.min(this.maxBones, Math.ceil(count / 16) * 16));
      const paletteGrowth = (width - this.paletteBones) * this.capacity * 16 * 4 * 2;
      const added = cpuBytes + writer.ownedBytes - (prior ? prior.cpuBytes + prior.writer.ownedBytes : 0) + paletteGrowth;
      if (!this.room(added, keys, !prior)) throw new Error('Composer resident source budget full');
      if (width !== this.paletteBones) this.resizePalette(width);
      const entry: Entry = {source, graph, levels, writer, definition: run.definition, batches: prior?.batches ?? {}, used: this.frame, cpuBytes};
      this.entries.set(run.key, entry); this.failed.delete(run.key); this.stats.builds++; this.stats.buildMs += result.buildMs;
    } catch (error) {this.fail(run.key, error);}
    finally {this.stats.adoptionMs = this.now() - started; if (this.stats.adoptionMs > (this.options.adoptionBudgetMs ?? 3)) this.stats.adoptionOverruns++;}
  }
  private startNext(): void {
    if (this.running || this.pending || this.disposed) return;
    for (const c of this.desired.values()) {
      const entry = this.entries.get(c.sourceKey), tier = this.candidateTier(c, this.actors.get(c.id)?.tier);
      if (entry?.levels[tier] || (this.failed.get(c.sourceKey) ?? -Infinity) > this.frame - 120) continue;
      const run: Running = {key: c.sourceKey, definition: JSON.stringify(c.definition), epoch: this.epoch, abort: new AbortController()};
      this.running = run;
      try {Promise.resolve(this.options.provider.build({key: run.key, definition: c.definition, tiers: [tier], loadedSource: entry?.source ?? undefined}, run.abort.signal)).then(result => {
        if (this.disposed || run.abort.signal.aborted || run.epoch !== this.epoch) {this.stats.stale++; return;}
        if (composerTypedBytes(result) > this.maxResultBytes) {this.fail(run.key, new Error('Composer build result exceeds budget')); return;}
        this.pending = {run, result};
      }).catch(error => {if (!run.abort.signal.aborted && !this.disposed) this.fail(run.key, error);}).finally(() => {
        if (this.running === run) this.running = null; if (!this.disposed) this.options.onReady?.();
      });} catch (error) {this.running = null; this.fail(run.key, error);}
      return;
    }
  }
  private trimFullSources(): void {
    for (const [key, entry] of this.entries) if (!this.fullSourceKeys.has(key) && entry.source && (entry.levels.middle || entry.levels.far)) {
      entry.batches.near?.dispose(); delete entry.batches.near; delete entry.levels.near; entry.source = null;
      entry.cpuBytes = composerTypedBytes(entry.levels) + (entry.definition.length + key.length) * 2 + JSON.stringify(entry.graph).length * 2;
    }
  }
  private fail(key: string, error: unknown): void {
    this.failed.set(key, this.frame); while (this.failed.size > this.maxSources) this.failed.delete(this.failed.keys().next().value!);
    this.stats.failures++; this.lastError = error instanceof Error ? error.message : String(error);
  }
  private evict(key: string): void {
    const entry = this.entries.get(key); if (!entry) return;
    for (const batch of Object.values(entry.batches)) batch.dispose(); this.entries.delete(key);
    for (const [id, actor] of this.actors) if (actor.key === key) this.actors.delete(id);
    this.stats.evictions++;
  }
  sourceOf(id: string): FaunaComposerSource | null {const actor = this.actors.get(id); return actor ? this.entries.get(actor.key)?.source ?? null : null;}
  poseOf(id: string): ComposerPose | null {return this.actors.get(id)?.pose ?? null;}
  diagnostics() {return {version: FAUNA_COMPOSER_RENDER_VERSION, ...this.stats, capacity: this.capacity, sources: this.entries.size,
    actors: [...this.drawn].map(id => {const actor = this.actors.get(id)!, entry = this.entries.get(actor.key)!; return {id, key: actor.key, tier: actor.tier, bones: entry.graph.bones.length, skin: entry.levels[actor.tier!]!.version};}),
    ownedBytes: this.ownedBytes, maxBytes: this.maxBytes, reservedBytes: this.reservedBytes, workerReserveBytes: this.workerReserveBytes,
    paletteBones: this.paletteBones, paletteCpuBytes: this.paletteData.byteLength, paletteGpuBytes: this.paletteData.byteLength,
    sourceCpuBytes: [...this.entries.values()].reduce((n, e) => n + e.cpuBytes, 0),
    geometryGpuBytes: [...this.entries.values()].reduce((n, e) => n + Object.values(e.batches).reduce((m, b) => m + b.uploadedGeometryBytes, 0), 0),
    instanceCpuGpuBytes: [...this.entries.values()].reduce((n, e) => n + Object.values(e.batches).reduce((m, b) => m + b.instanceBytes * 2, 0), 0),
    pendingResultBytes: this.pending ? composerTypedBytes(this.pending.result) : 0,
    poseCpuBytes: [...this.actors.values()].reduce((n, a) => n + a.poseBytes, 0),
    running: this.running?.key ?? null, lastError: this.lastError};}
  dispose(): void {
    if (this.disposed) return; this.disposed = true; this.epoch++; this.running?.abort.abort(); this.pending = null;
    for (const key of this.entries.keys()) this.evict(key); this.paletteUniform.value.dispose(); this.options.provider.dispose?.();
    this.paletteData = new Float32Array(0); this.scratch = new Float32Array(0); this.paletteUniform.value.image.data = this.paletteData;
    this.actors.clear(); this.desired.clear(); this.drawn.clear(); this.failed.clear(); this.group.removeFromParent();
  }
}
