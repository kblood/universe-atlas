import * as THREE from 'three';
import type { CreatureGenome } from './creature-model.ts';
import { QUADRUPED_BONE_NAMES, QUADRUPED_BONE_PARENTS, quadrupedBodyBuildSteps, quadrupedBodyBytes, type QuadrupedBodyData, type QuadrupedPlan } from './fauna-body-plan.ts';
import { quadrupedPoseAt, type FaunaGround, type FaunaPathMember, type QuadrupedPose } from './fauna-locomotion.ts';
import type { FaunaMemberActivity } from './fauna-runtime.ts';

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
}
export interface FaunaNearOptions {
  capacity?: number; cacheSize?: number; buildBudgetMs?: number;
  enterM?: number; exitM?: number; now?: () => number;
}
type Cached = { geometry: THREE.BufferGeometry; plan: QuadrupedPlan; bytes: number; used: number };
type Slot = { mesh: THREE.SkinnedMesh; material: THREE.MeshStandardMaterial; bones: THREE.Bone[]; skeleton: THREE.Skeleton; memberId: string | null; pose: QuadrupedPose | null };

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
  private readonly slots: Slot[] = [];
  private readonly cache = new Map<string, Cached>();
  private readonly failed = new Set<string>();
  private build: { id: string; steps: Generator<void, QuadrupedBodyData, void> } | null = null;
  /** Attribute-free stand-in for idle slots; it owns no GPU buffers. */
  private readonly placeholder = new THREE.BufferGeometry();
  private frame = 0;
  private disposed = false;
  private stats = { builds: 0, failures: 0, evictions: 0, abandoned: 0, fallbacks: 0, buildMs: 0 };

  constructor(options: FaunaNearOptions = {}) {
    this.capacity = Math.max(0, Math.floor(options.capacity ?? FAUNA_NEAR_RIG_CAPACITY));
    this.cacheSize = Math.max(this.capacity, Math.floor(options.cacheSize ?? FAUNA_NEAR_GEOMETRY_CACHE));
    this.budgetMs = options.buildBudgetMs ?? FAUNA_NEAR_BUILD_BUDGET_MS;
    this.enterM = options.enterM ?? FAUNA_NEAR_RIG_ENTER_M;
    this.exitM = Math.max(this.enterM, options.exitM ?? FAUNA_NEAR_RIG_EXIT_M);
    this.now = options.now ?? (() => performance.now());
    this.group.name = 'Near fauna rigs';
    const placeholder = this.placeholder;
    for (let s = 0; s < this.capacity; s++) {
      const bones = QUADRUPED_BONE_NAMES.map(name => { const bone = new THREE.Bone(); bone.name = name; return bone; });
      QUADRUPED_BONE_PARENTS.forEach((parent, i) => { if (parent >= 0) bones[parent]!.add(bones[i]!); });
      const skeleton = new THREE.Skeleton(bones, bones.map(() => new THREE.Matrix4()));
      const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .86, metalness: 0 });
      const mesh = new THREE.SkinnedMesh(placeholder, material);
      // Bones stay outside the scene graph, so skinning matrices are pure body
      // space; the mesh transform alone carries the planet placement.
      mesh.bindMode = THREE.DetachedBindMode;
      mesh.bind(skeleton, new THREE.Matrix4());
      mesh.name = `Near fauna rig ${s}`; mesh.visible = false; mesh.frustumCulled = false;
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
      this.slots.push({ mesh, material, bones, skeleton, memberId: null, pose: null });
    }
  }

  /**
   * Select, pose and show rigs for this frame. `candidates` must be in draw
   * priority order. Returns the member ids drawn as rigs; the caller draws
   * every other animal through its existing fallback.
   */
  update(candidates: readonly FaunaNearCandidate[]): Set<string> {
    const drawn = new Set<string>();
    if (this.disposed) return drawn;
    this.frame++;
    const chosen: FaunaNearCandidate[] = [];
    let wanted: FaunaNearCandidate | null = null;
    for (const candidate of candidates) {
      const id = candidate.member.id, active = this.slots.some(s => s.memberId === id);
      if (candidate.distanceM > (active ? this.exitM : this.enterM) || this.failed.has(id) || drawn.has(id)) continue;
      if (chosen.length >= this.capacity) break;
      if (this.cache.has(id)) { chosen.push(candidate); drawn.add(id); }
      else { this.stats.fallbacks++; wanted ??= candidate; }
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
    return drawn;
  }

  private bindSlot(slot: Slot, id: string, cached: Cached) {
    slot.memberId = id; slot.mesh.geometry = cached.geometry;
    cached.plan.bones.forEach((bone, i) => {
      const parent = bone.parent >= 0 ? cached.plan.bones[bone.parent]!.rest : [0, 0, 0];
      slot.bones[i]!.position.set(bone.rest[0] - parent[0]!, bone.rest[1] - parent[1]!, bone.rest[2] - parent[2]!);
      slot.bones[i]!.quaternion.identity();
      // Bind rotations are identity, so each inverse bind is a translation.
      slot.skeleton.boneInverses[i]!.makeTranslation(-bone.rest[0], -bone.rest[1], -bone.rest[2]);
    });
  }

  private poseSlot(slot: Slot, plan: QuadrupedPlan, candidate: FaunaNearCandidate) {
    const pose = quadrupedPoseAt(plan, candidate.member, candidate.activity, candidate.ground, candidate.rigSeconds);
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

  /** Hide every rig without discarding cached bodies. */
  hide() { for (const slot of this.slots) { slot.memberId = null; slot.pose = null; slot.mesh.visible = false; slot.mesh.geometry = this.placeholder; } }

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
    return { active: this.slots.filter(s => s.memberId).length, capacity: this.capacity, cached: this.cache.size, cacheSize: this.cacheSize,
      building: this.build?.id ?? null, failed: this.failed.size, allocatedBytes: this.allocatedBytes, ...this.stats };
  }

  dispose() {
    if (this.disposed) return;
    this.clear(); this.disposed = true;
    for (const slot of this.slots) { slot.skeleton.dispose(); slot.material.dispose(); }
    this.placeholder.dispose(); this.group.removeFromParent(); this.group.clear();
  }
}
