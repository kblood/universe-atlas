import * as THREE from 'three';
import type { CreatureGenome } from './creature-model.ts';
import { QUADRUPED_BONE_NAMES, QUADRUPED_BONE_PARENTS, quadrupedBodyBuildSteps, quadrupedBodyBytes, type QuadrupedBodyData, type QuadrupedPlan } from './fauna-body-plan.ts';
import { quadrupedPoseAt, type FaunaGround, type FaunaPathMember, type QuadrupedPose } from './fauna-locomotion.ts';
import type { FaunaMemberActivity } from './fauna-runtime.ts';
import { createFaunaMaterial } from './fauna-material.ts';
import { advanceHandoff, handoffRigWeight, FAUNA_HANDOFF_FADE_S } from './fauna-handoff.ts';

/**
 * Bounded near-field representation: the nearest camera-visible animals are
 * drawn as one continuous skinned body each; everything else, and any animal
 * whose body is not built yet or failed to build, stays on the instanced
 * field renderer. Only the rigs in use are posed, each frame, from the exact
 * date; nothing here affects which animals exist or where they are.
 *
 * Resources: a fixed pool of `capacity` skinned meshes, each owning one
 * material and one 22-bone skeleton for its lifetime, plus an LRU cache of at
 * most `cacheSize` body geometries. One body builds at a time, time-sliced by
 * `buildBudgetMs` per frame. `dispose()` releases every GPU-backed object.
 *
 * Cross-fade (opt-in, `fadeS > 0`, audit F5 short-term): instead of a hard
 * swap, a slot's rig coverage eases 0 -> 1 over `fadeS` after it is acquired
 * (in range AND body built AND a slot free) and 1 -> 0 after it is released
 * (out of range, or outranked under capacity). The rig is dithered through
 * the built-in alpha-hash path (`material.alphaHash`, opacity = coverage; the
 * shared coat material in fauna-material.ts is not changed). `update` then
 * returns only the ids whose proxy is fully replaced, so a caller that skips
 * the proxy for returned ids keeps drawing it through the whole overlap;
 * `proxyWeights` holds the complementary proxy coverage (1 - rig) of every
 * slot member for a caller that can dither the proxy as well. A fading-out
 * slot stays bound to its member until its coverage reaches 0, so capacity
 * reassignment fades the old animal out before the new one fades in.
 * `fadeS = 0` (the default) is the former behaviour, bit for bit.
 *
 * A fade only ever runs on a slot re-posed this frame. Candidate matrices are
 * origin-relative and the caller moves the parent group to a new origin each
 * frame, so a slot whose member is missing from this frame's candidate list
 * has no valid transform: it is released at once (a documented hard drop,
 * counted as `unlistedDrops`), never left fading on its stale matrix. To
 * fade an exit instead of dropping it, the caller must keep listing every
 * member `holds(id)` reports until its fade completes (e.g. past the 95 m
 * candidate cut); any list cap that still omits one falls back to the drop.
 */
export const FAUNA_NEAR_RIG_CAPACITY = 6;
export const FAUNA_NEAR_RIG_ENTER_M = 80;
/** Hysteresis: an active rig is kept until its animal passes this distance. */
export const FAUNA_NEAR_RIG_EXIT_M = 95;
export const FAUNA_NEAR_GEOMETRY_CACHE = 8;
export const FAUNA_NEAR_BUILD_BUDGET_MS = 2.5;

export interface FaunaNearCandidate {
  member: FaunaPathMember; genome: CreatureGenome; distanceM: number;
  /** The same radius-normalized, origin-relative transform the instanced fallback uses. */
  matrix: THREE.Matrix4;
  activity: FaunaMemberActivity; ground: FaunaGround; rigSeconds: number;
  /** Lab-only pose choice; ordinary planetary candidates use dated behaviour. */
  behaviour?: 'auto' | 'feed' | 'alert';
}
export interface FaunaNearOptions {
  capacity?: number; cacheSize?: number; buildBudgetMs?: number;
  enterM?: number; exitM?: number; now?: () => number;
  /** Rig <-> proxy cross-fade seconds; 0 (default) keeps the former hard swap. */
  fadeS?: number;
  /** Shorthand for `fadeS: FAUNA_HANDOFF_FADE_S` (0.3 s) when `fadeS` is not given. */
  crossFade?: boolean;
}
type Cached = { geometry: THREE.BufferGeometry; plan: QuadrupedPlan; bytes: number; used: number };
type Slot = { mesh: THREE.SkinnedMesh; material: THREE.MeshStandardMaterial; bones: THREE.Bone[]; skeleton: THREE.Skeleton; memberId: string | null; pose: QuadrupedPose | null;
  /** Cross-fade only: 1 while held, 0 while fading out; linear progress toward the rig. */
  target: 0 | 1; progress: number };

export function faunaBodyGeometry(data: QuadrupedBodyData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3, true));
  geometry.setAttribute('skinIndex', new THREE.BufferAttribute(data.skinIndex, 4));
  geometry.setAttribute('skinWeight', new THREE.BufferAttribute(data.skinWeight, 4, true));
  geometry.setIndex(new THREE.BufferAttribute(data.index, 1));
  geometry.computeBoundingSphere();
  geometry.name = `Fauna body ${data.plan.genome.archetype}`;
  geometry.userData.bodyVersion = data.plan.version;
  geometry.userData.faceFeatures = data.faceFeatures;
  geometry.userData.structuralVertexCount = data.structuralVertexCount;
  geometry.userData.structuralTriangleCount = data.structuralTriangleCount;
  geometry.userData.morphology = data.plan.genome.morphology;
  return geometry;
}

export class FaunaNearRigs {
  readonly group = new THREE.Group();
  readonly capacity: number;
  private readonly cacheSize: number;
  private readonly budgetMs: number;
  private readonly enterM: number;
  private readonly exitM: number;
  private readonly now: () => number;
  /** Cross-fade seconds; 0 is the former hard swap. */
  readonly fadeS: number;
  /** Proxy coverage (1 - rig coverage) of every member bound to a slot this
   * frame; members absent here are fully on the proxy. Reused across frames. */
  readonly proxyWeights = new Map<string, number>();
  /** Rig coverage (the dither opacity) of the same members. */
  private readonly rigWeights = new Map<string, number>();
  private lastNowMs: number | null = null;
  /** Cross-fade only: members inside the hysteresis band last frame. */
  private readonly inside = new Set<string>();
  /** A slot's coverage is still moving toward its target. */
  private fading = false;
  /** Cross-fade only: slots released at once because their member left the candidate list. */
  private unlistedDrops = 0;
  private readonly slots: Slot[] = [];
  private readonly cache = new Map<string, Cached>();
  private readonly failed = new Set<string>();
  private build: { id: string; steps: Generator<void, QuadrupedBodyData, void> } | null = null;
  /** Attribute-free stand-in for idle slots; it owns no GPU buffers. */
  private readonly placeholder = new THREE.BufferGeometry();
  private frame = 0;
  private disposed = false;
  /** Candidates of the last update that wanted a body not yet built. */
  private lastFallbacks = 0;
  private stats = { builds: 0, failures: 0, evictions: 0, abandoned: 0, fallbacks: 0, buildMs: 0 };

  constructor(options: FaunaNearOptions = {}) {
    this.capacity = Math.max(0, Math.floor(options.capacity ?? FAUNA_NEAR_RIG_CAPACITY));
    this.cacheSize = Math.max(this.capacity, Math.floor(options.cacheSize ?? FAUNA_NEAR_GEOMETRY_CACHE));
    this.budgetMs = options.buildBudgetMs ?? FAUNA_NEAR_BUILD_BUDGET_MS;
    this.enterM = options.enterM ?? FAUNA_NEAR_RIG_ENTER_M;
    this.exitM = Math.max(this.enterM, options.exitM ?? FAUNA_NEAR_RIG_EXIT_M);
    this.now = options.now ?? (() => performance.now());
    this.fadeS = Math.max(0, options.fadeS ?? (options.crossFade ? FAUNA_HANDOFF_FADE_S : 0));
    this.group.name = 'Near fauna rigs';
    const placeholder = this.placeholder;
    for (let s = 0; s < this.capacity; s++) {
      const bones = QUADRUPED_BONE_NAMES.map(name => { const bone = new THREE.Bone(); bone.name = name; return bone; });
      QUADRUPED_BONE_PARENTS.forEach((parent, i) => { if (parent >= 0) bones[parent]!.add(bones[i]!); });
      const skeleton = new THREE.Skeleton(bones, bones.map(() => new THREE.Matrix4()));
      const material = createFaunaMaterial(true);
      // Fixed for the material's lifetime, so the program never switches; at
      // opacity 1 the hash threshold (< 1) never discards a fragment.
      if (this.fadeS > 0) material.alphaHash = true;
      const mesh = new THREE.SkinnedMesh(placeholder, material);
      // Bones stay outside the scene graph, so skinning matrices are pure body
      // space; the mesh transform alone carries the planet placement.
      mesh.bindMode = THREE.DetachedBindMode;
      mesh.bind(skeleton, new THREE.Matrix4());
      mesh.name = `Near fauna rig ${s}`; mesh.visible = false; mesh.frustumCulled = false;
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
      this.slots.push({ mesh, material, bones, skeleton, memberId: null, pose: null, target: 0, progress: 0 });
    }
  }

  /**
   * Select, pose and show rigs for this frame. `candidates` must be in draw
   * priority order. Returns the member ids drawn as rigs; the caller draws
   * every other animal through its existing fallback. With a cross-fade
   * (`fadeS > 0`) the returned ids are those whose rig coverage is complete
   * (proxy coverage 0); `proxyWeights` covers the fading ones. `dtS`
   * overrides the frame interval otherwise read from `now()`.
   */
  update(candidates: readonly FaunaNearCandidate[], dtS?: number): Set<string> {
    if (this.fadeS > 0) return this.updateFaded(candidates, dtS);
    const drawn = new Set<string>();
    this.proxyWeights.clear(); this.rigWeights.clear();
    if (this.disposed) return drawn;
    this.frame++;
    const chosen: FaunaNearCandidate[] = [];
    let wanted: FaunaNearCandidate | null = null, fallbacks = 0;
    for (const candidate of candidates) {
      const id = candidate.member.id, active = this.slots.some(s => s.memberId === id);
      if (candidate.distanceM > (active ? this.exitM : this.enterM) || this.failed.has(id) || drawn.has(id)) continue;
      if (chosen.length >= this.capacity) break;
      if (this.cache.has(id)) { chosen.push(candidate); drawn.add(id); }
      else { this.stats.fallbacks++; fallbacks++; wanted ??= candidate; }
    }
    // Keep existing assignments stable, then fill freed slots.
    const assigned = new Map<string, Slot>();
    for (const slot of this.slots) if (slot.memberId && drawn.has(slot.memberId)) assigned.set(slot.memberId, slot);
    const free = this.slots.filter(slot => !slot.memberId || !drawn.has(slot.memberId));
    for (const slot of free) { slot.memberId = null; slot.pose = null; slot.mesh.visible = false; slot.mesh.geometry = this.placeholder; }
    for (const candidate of chosen) {
      const id = candidate.member.id, cached = this.cache.get(id)!;
      let slot = assigned.get(id);
      if (!slot) { slot = free.shift()!; this.bindSlot(slot, id, cached); }
      cached.used = this.frame;
      this.poseSlot(slot, cached.plan, candidate);
    }
    this.advanceBuild(wanted);
    this.evict();
    this.lastFallbacks = fallbacks;
    for (const id of drawn) { this.proxyWeights.set(id, 0); this.rigWeights.set(id, 1); }
    return drawn;
  }

  /** `update` with the cross-fade: same selection, hysteresis, build and cache
   * rules; only the slot lifetime and the returned set differ (class note). */
  private updateFaded(candidates: readonly FaunaNearCandidate[], dtS?: number): Set<string> {
    const drawn = new Set<string>();
    this.proxyWeights.clear(); this.rigWeights.clear();
    if (this.disposed) return drawn;
    this.frame++;
    let dt = 0;
    if (dtS !== undefined) dt = Math.max(0, dtS);
    else { const t = this.now(); if (this.lastNowMs !== null) dt = Math.max(0, (t - this.lastNowMs) / 1000); this.lastNowMs = t; }
    // Selection: the 80/95 m hysteresis is a per-animal distance latch,
    // independent of readiness and capacity, so a body that finishes building
    // (or a slot that frees) inside the band acquires without a new crossing.
    // An animal missing from the list is beyond the caller's range: outside.
    const chosen: FaunaNearCandidate[] = [], held = new Set<string>(), inside = new Set<string>();
    const listed = new Map<string, FaunaNearCandidate>();
    let wanted: FaunaNearCandidate | null = null, fallbacks = 0;
    for (const candidate of candidates) {
      const id = candidate.member.id;
      if (!listed.has(id)) listed.set(id, candidate);
      if (inside.has(id) || candidate.distanceM > (this.inside.has(id) ? this.exitM : this.enterM)) continue;
      inside.add(id);
      if (this.failed.has(id) || chosen.length >= this.capacity) continue;
      if (this.cache.has(id)) { chosen.push(candidate); held.add(id); }
      else { this.stats.fallbacks++; fallbacks++; wanted ??= candidate; }
    }
    this.inside.clear(); for (const id of inside) this.inside.add(id);
    for (const slot of this.slots) {
      if (!slot.memberId) continue;
      slot.target = held.has(slot.memberId) ? 1 : 0;
      // No candidate, no transform this frame: drop now rather than fade on a
      // stale origin-relative matrix (class note). Frees the slot for a waiter.
      if (!listed.has(slot.memberId)) this.dropUnlisted(slot);
    }
    // Bind newly held animals to free slots, step every bound slot, free the
    // slots that finished fading out, then give those to animals still waiting.
    this.bindFree(chosen);
    let fading = false;
    for (const slot of this.slots) {
      if (!slot.memberId) continue;
      slot.progress = advanceHandoff(slot.progress, slot.target, dt, this.fadeS);
      if (slot.target === 0 && slot.progress === 0) { this.releaseSlot(slot); continue; }
      if (slot.progress !== slot.target) fading = true;
    }
    if (this.bindFree(chosen)) fading = true;
    for (const slot of this.slots) {
      const id = slot.memberId;
      if (!id) continue;
      const cached = this.cache.get(id)!;
      cached.used = this.frame;
      // Every bound member is listed (unlisted ones were dropped above), so
      // each visible slot carries this frame's pose and matrix.
      const candidate = listed.get(id);
      if (candidate) this.poseSlot(slot, cached.plan, candidate);
      const rig = handoffRigWeight(slot.progress);
      slot.material.opacity = rig;
      slot.mesh.visible = rig > 0;
      this.proxyWeights.set(id, 1 - rig); this.rigWeights.set(id, rig);
      if (slot.target === 1 && slot.progress === 1) drawn.add(id);
    }
    this.fading = fading;
    this.advanceBuild(wanted);
    this.evict();
    this.lastFallbacks = fallbacks;
    return drawn;
  }

  /** Binds each chosen animal without a slot to a free one, in priority order. True if any was bound. */
  private bindFree(chosen: readonly FaunaNearCandidate[]): boolean {
    let bound = false;
    for (const candidate of chosen) {
      const id = candidate.member.id;
      if (this.slots.some(s => s.memberId === id)) continue;
      const slot = this.slots.find(s => !s.memberId);
      if (!slot) break;
      this.bindSlot(slot, id, this.cache.get(id)!);
      slot.target = 1; slot.progress = 0; slot.material.opacity = 0; bound = true;
    }
    return bound;
  }

  /** Hard drop of a slot whose member left the candidate list (class note). */
  private dropUnlisted(slot: Slot) { this.releaseSlot(slot); this.unlistedDrops++; }

  /** True while `id` is bound to a slot (held or fading out). A caller that
   * keeps listing these past its distance cut lets every exit fade instead of
   * dropping; one that does not gets the hard drop. */
  holds(id: string): boolean { return this.slots.some(s => s.memberId === id); }

  private releaseSlot(slot: Slot) {
    slot.memberId = null; slot.pose = null; slot.target = 0; slot.progress = 0;
    slot.mesh.visible = false; slot.mesh.geometry = this.placeholder;
    if (this.fadeS > 0) slot.material.opacity = 0;
  }

  /** Rig coverage of a member this frame: 0 on the proxy, 1 fully rigged. */
  rigWeightOf(id: string): number { return this.rigWeights.get(id) ?? 0; }
  /** Proxy coverage of a member this frame (complement of `rigWeightOf`). */
  proxyWeightOf(id: string): number { return this.proxyWeights.get(id) ?? 1; }

  /**
   * True when repeating the last `update` with the same candidates would
   * change nothing: no body is building, none was wanted, so selection,
   * slots, poses, cache and stats would all come out identical (`used`
   * stamps of the chosen bodies stay the newest, so eviction order is
   * unchanged). A caller with unchanged candidates may then skip the call.
   */
  get idle(): boolean { return !this.disposed && this.frame > 0 && this.build === null && this.lastFallbacks === 0 && !this.fading; }

  private bindSlot(slot: Slot, id: string, cached: Cached) {
    slot.memberId = id; slot.mesh.geometry = cached.geometry;
    slot.material.roughness = cached.plan.genome.appearance?.roughness ?? .86;
    cached.plan.bones.forEach((bone, i) => {
      const parent = bone.parent >= 0 ? cached.plan.bones[bone.parent]!.rest : [0, 0, 0];
      slot.bones[i]!.position.set(bone.rest[0] - parent[0]!, bone.rest[1] - parent[1]!, bone.rest[2] - parent[2]!);
      slot.bones[i]!.quaternion.identity();
      // Bind rotations are identity, so each inverse bind is a translation.
      slot.skeleton.boneInverses[i]!.makeTranslation(-bone.rest[0], -bone.rest[1], -bone.rest[2]);
    });
  }

  private poseSlot(slot: Slot, plan: QuadrupedPlan, candidate: FaunaNearCandidate) {
    const pose = quadrupedPoseAt(plan, candidate.member, candidate.activity, candidate.ground, candidate.rigSeconds, { behaviour: candidate.behaviour });
    for (let i = 0; i < slot.bones.length; i++) { slot.bones[i]!.position.fromArray(pose.positions, i * 3); slot.bones[i]!.quaternion.fromArray(pose.quaternions, i * 4); }
    slot.bones[0]!.updateMatrixWorld(true);
    slot.mesh.matrix.copy(candidate.matrix); slot.mesh.matrixWorldNeedsUpdate = true;
    slot.mesh.visible = true; slot.pose = pose;
  }

  private advanceBuild(wanted: FaunaNearCandidate | null) {
    // Abandon a build nobody currently wants; start the most important missing body.
    if (this.build && this.build.id !== wanted?.member.id) { this.build = null; this.stats.abandoned++; }
    if (!this.build && wanted) this.build = { id: wanted.member.id, steps: quadrupedBodyBuildSteps(wanted.genome) };
    const build = this.build;
    if (!build) return;
    const start = this.now();
    try {
      do {
        const next = build.steps.next();
        if (next.done) {
          const geometry = faunaBodyGeometry(next.value);
          this.cache.set(build.id, { geometry, plan: next.value.plan, bytes: quadrupedBodyBytes(next.value), used: this.frame });
          this.stats.builds++; this.build = null; break;
        }
      } while (this.now() - start < this.budgetMs);
    } catch {
      // An unusable genome keeps its existing instanced representation.
      this.failed.add(build.id); this.stats.failures++; this.build = null;
      if (this.failed.size > 512) this.failed.clear();
    }
    this.stats.buildMs = this.now() - start;
  }

  private evict() {
    if (this.cache.size <= this.cacheSize) return;
    const inUse = new Set(this.slots.map(s => s.memberId));
    const order = [...this.cache].filter(([id]) => !inUse.has(id)).sort((a, b) => a[1].used - b[1].used || a[0].localeCompare(b[0]));
    for (const [id, cached] of order) {
      if (this.cache.size <= this.cacheSize) break;
      cached.geometry.dispose(); this.cache.delete(id); this.stats.evictions++;
    }
  }

  /** Hide every rig without discarding cached bodies (immediately, no fade). */
  hide() {
    for (const slot of this.slots) { slot.memberId = null; slot.pose = null; slot.mesh.visible = false; slot.mesh.geometry = this.placeholder; slot.target = 0; slot.progress = 0; }
    this.proxyWeights.clear(); this.rigWeights.clear(); this.inside.clear(); this.fading = false; this.lastNowMs = null;
  }

  /** Discard every body, e.g. when the living species set changes. */
  clear() {
    this.hide(); this.build = null; this.failed.clear();
    for (const cached of this.cache.values()) cached.geometry.dispose();
    this.cache.clear();
  }

  /** Current pose of a rigged member (diagnostics/tests). */
  poseOf(id: string): QuadrupedPose | null { return this.slots.find(s => s.memberId === id)?.pose ?? null; }
  meshOf(id: string): THREE.SkinnedMesh | null { return this.slots.find(s => s.memberId === id)?.mesh ?? null; }

  /** CPU and GPU copies of cached bodies plus the bone palettes. */
  get allocatedBytes() {
    let bytes = 0; for (const cached of this.cache.values()) bytes += cached.bytes * 2;
    return bytes + this.slots.length * QUADRUPED_BONE_NAMES.length * 64 * 2;
  }

  diagnostics() {
    // Aggregate counts cannot establish that a particular animal survived a
    // representation handoff. Keep this snapshot bounded by the live rig pool;
    // contact errors describe the immutable ground stencil, not mesh collision.
    const activeMembers = this.slots.filter(s => s.memberId !== null).map(s => ({
      id: s.memberId!, poseState: s.pose?.state ?? null, phase: s.pose?.phase ?? null,
      stencilMaxPenetrationM: s.pose?.maxPenetration ?? null,
      stencilMaxReachErrorM: s.pose?.maxReachError ?? null,
      // Cross-fade only (the former snapshot shape is unchanged without it).
      ...(this.fadeS > 0 ? { rigWeight: handoffRigWeight(s.progress), fadingOut: s.target === 0 } : {}),
    }));
    return { active: activeMembers.length, activeMembers, capacity: this.capacity, cached: this.cache.size, cacheSize: this.cacheSize,
      building: this.build?.id ?? null, failed: this.failed.size, allocatedBytes: this.allocatedBytes, ...this.stats,
      ...(this.fadeS > 0 ? { fadeS: this.fadeS, fading: this.fading, unlistedDrops: this.unlistedDrops } : {}) };
  }

  dispose() {
    if (this.disposed) return;
    this.clear(); this.disposed = true;
    for (const slot of this.slots) { slot.skeleton.dispose(); slot.material.dispose(); }
    this.placeholder.dispose(); this.group.removeFromParent(); this.group.clear();
  }
}
