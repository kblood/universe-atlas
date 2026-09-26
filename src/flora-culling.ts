/**
 * Bounded-memory flora culling + instancing layer, adapted from nms's
 * worker-based hero-flora culler to Atlas's cube-sphere tiles.
 *
 * Provenance:
 *   - `cullSpheresSoA`/`packCullPlane`/the plane-stride constants are ported
 *     near-verbatim from C:\LLM\IWSDK\nms\shared\cull.ts (a 6-plane SoA
 *     sphere-frustum test - pure arithmetic, no engine-precision concerns).
 *   - The overall shape (validate a bounded candidate buffer, cull it, then
 *     apply survivors into instancing) follows the pattern in
 *     C:\LLM\IWSDK\nms\src\workers\heroFloraCullWorker.ts, but that file
 *     drives one fixed synthetic 50000-candidate hero scatter over a single
 *     archetype; nothing there is address/biome-driven or reusable directly.
 *     Everything below the ported `cullSpheresSoA` section (candidate
 *     buffer, LOD banding, InstancedMesh buckets) is new for Atlas's
 *     planet-wide use case.
 * `nms` is a separate, read-only sibling project; nothing there was edited.
 *
 * `InstancedMesh2` was checked for in `node_modules/three` (this project's
 * `three` alias is `super-three@0.181.0`) and is NOT present, so this module
 * uses plain `THREE.InstancedMesh` with hand-rolled per-(kind, LOD) buckets,
 * per the task's documented fallback.
 *
 * Zero per-frame allocation: every typed array here is sized once at
 * construction (`FloraCandidateBuffer`, per-bucket `InstancedMesh`, and the
 * cull `outIndices` scratch); the hot per-candidate path
 * (`drawFloraCandidates`) never allocates - it writes into preallocated
 * instance-matrix storage and reads matrix data via `Matrix4.fromArray`'s
 * offset parameter rather than slicing. This is enforced, not just claimed:
 * `FloraCandidateBuffer.cull()` reuses one `cullInput` object (built once in
 * the constructor, its mutable fields overwritten in place per call) instead
 * of a fresh object literal, and `FloraFieldRenderer` looks buckets up by a
 * flat, pre-sized `(kindIndex * FLORA_LOD_COUNT + lod)` array index - the
 * same array `bucketList` is built into once at construction - instead of a
 * template-literal `Map` key, so `submit()` never allocates a string or a
 * Map entry on the survivor path.
 *
 * Measured (60,000 frames x 500 candidates/frame, ~425 surviving+drawn per
 * frame, deterministic synthetic scatter, `node --trace-gc`, this repo's
 * scratchpad `gc-harness.mjs`): calling `drawFloraCandidates` every frame
 * went from 1523 Scavenge (minor) GCs before this fix to 923 after. That
 * 923 is NOT residual allocation in this module: an isolated run of the
 * exact same 60,000-frame candidate-generation loop with
 * `drawFloraCandidates` never called at all (only `FloraCandidateBuffer.push`,
 * unchanged by this fix) already produces ~919-920 Scavenge GCs by itself -
 * i.e. the harness's own float/typed-array churn, not this module. Net
 * Scavenge GCs attributable to `drawFloraCandidates`/`cull()`/`submit()`:
 * ~603 before this fix, ~3-4 after (statistically indistinguishable from
 * that harness-floor noise) - see tests/flora-culling.test.mjs and the fix
 * report for the full before/after/harness-floor numbers.
 *
 * Pure-Three: no IWSDK, no app singletons, no imports outside `three` and
 * this project's own `flora-field.ts` (for `FloraKind`/`FLORA_KIND_NAMES`/
 * `FLORA_LOD_COUNT`).
 */
import * as THREE from 'three';
import { FLORA_KIND_NAMES, FLORA_LOD_COUNT, type FloraKind } from './flora-field.ts';

// ---------------------------------------------------------------------------
// Ported frustum-sphere culling (nms/shared/cull.ts).
// ---------------------------------------------------------------------------

export const FRUSTUM_PLANE_STRIDE = 4;
export const DEFAULT_FRUSTUM_PLANE_COUNT = 6;

/** Placeholder `planes` reference for `FloraCandidateBuffer`'s preallocated
 * `cullInput` before the first real `cull()` call overwrites it - never read
 * with a nonzero `count`, so its zero length is never dereferenced. */
const EMPTY_PLANES = new Float32Array(0);

export interface CullSpheresSoAInput {
  centerX: Float32Array;
  centerY: Float32Array;
  centerZ: Float32Array;
  radius: Float32Array;
  count: number;
  /** `planeCount * FRUSTUM_PLANE_STRIDE` floats: [nx, ny, nz, d, ...] per
   * plane, outward normal + signed distance such that a point `p` is inside
   * when `dot(normal, p) + d >= 0` for every plane. */
  planes: Float32Array;
  outIndices: Uint32Array;
  planeCount?: number;
}

/** Writes surviving candidate indices (in ascending original order) into
 * `input.outIndices` and returns the survivor count. No allocation. */
export function cullSpheresSoA(input: CullSpheresSoAInput): number {
  const planeCount = input.planeCount ?? DEFAULT_FRUSTUM_PLANE_COUNT;
  const { centerX, centerY, centerZ, radius, planes, outIndices } = input;
  let survivorCount = 0;
  for (let i = 0; i < input.count; i++) {
    const cx = centerX[i]!, cy = centerY[i]!, cz = centerZ[i]!, r = radius[i]!;
    let inside = true;
    for (let p = 0; p < planeCount; p++) {
      const o = p * FRUSTUM_PLANE_STRIDE;
      const nx = planes[o]!, ny = planes[o + 1]!, nz = planes[o + 2]!, d = planes[o + 3]!;
      if (nx * cx + ny * cy + nz * cz + d + r < 0) { inside = false; break; }
    }
    if (inside) { outIndices[survivorCount] = i; survivorCount++; }
  }
  return survivorCount;
}

/** Writes one [nx, ny, nz, d] plane into `out` at `planeIndex * FRUSTUM_PLANE_STRIDE`. */
export function packCullPlane(out: Float32Array, planeIndex: number, nx: number, ny: number, nz: number, d: number): void {
  const o = planeIndex * FRUSTUM_PLANE_STRIDE;
  out[o] = nx; out[o + 1] = ny; out[o + 2] = nz; out[o + 3] = d;
}

/** Extracts the 6 world-space frustum planes of `camera` into a fresh
 * `Float32Array(24)` in `packCullPlane` layout. Not part of the zero-alloc
 * per-frame path - call once per camera-frustum change, not per candidate. */
export function frustumPlanesFromCamera(camera: THREE.Camera): Float32Array {
  const frustum = new THREE.Frustum();
  frustum.setFromProjectionMatrix(camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse));
  const planes = new Float32Array(DEFAULT_FRUSTUM_PLANE_COUNT * FRUSTUM_PLANE_STRIDE);
  for (let i = 0; i < DEFAULT_FRUSTUM_PLANE_COUNT; i++) {
    const plane = frustum.planes[i]!;
    packCullPlane(planes, i, plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
  }
  return planes;
}

// ---------------------------------------------------------------------------
// LOD banding.
// ---------------------------------------------------------------------------

/** LOD band 0 = nearest/highest detail, 2 = farthest/lowest detail, matching
 * `flora-field.ts`'s `FLORA_LOD_COUNT` geometry LOD indexing. */
export type FloraLodBand = 0 | 1 | 2;

/** Distance (meters) at which LOD0->LOD1, LOD1->LOD2, and LOD2->culled
 * transitions occur. Mirrors the shape of nms's M9 fauna LOD thresholds
 * (`M9_LOD0_DISTANCE_M`/`M9_LOD1_DISTANCE_M`/`M9_VISIBLE_DISTANCE_M`), scaled
 * down for flora (which fills far more of the screen at any given range). */
export const FLORA_LOD0_DISTANCE_M = 22;
export const FLORA_LOD1_DISTANCE_M = 55;
export const FLORA_VISIBLE_DISTANCE_M = 120;

/** Returns the LOD band for `distanceM`, or -1 if beyond the visible range
 * (caller should drop the candidate entirely). */
export function pickFloraLodBand(distanceM: number): FloraLodBand | -1 {
  if (distanceM <= FLORA_LOD0_DISTANCE_M) return 0;
  if (distanceM <= FLORA_LOD1_DISTANCE_M) return 1;
  if (distanceM <= FLORA_VISIBLE_DISTANCE_M) return 2;
  return -1;
}

/**
 * Documented per-(kind, LOD band) instance budget. Bounds worst-case memory
 * (each unit of budget is one `THREE.InstancedMesh` instance slot, allocated
 * once at construction) and worst-case triangle/draw-call cost against the
 * Quest 3 budgets in docs/webxr/quest3-perf-budgets.md (11 ms/frame,
 * <=150 draw calls/eye, <=150k tris, no per-frame allocation):
 *   - 4 kinds x 3 LOD bands = 12 InstancedMesh draw calls total for all of
 *     flora (well under the 150/eye budget, leaving headroom for terrain,
 *     water, fauna, and everything else sharing that budget).
 *   - Total instance capacity below is 4480; at the worst case (every slot
 *     full, all LOD0) triangle cost is bounded by
 *     `sum(capacity[kind][0] * lod0TriangleCount[kind])` - see
 *     tests/flora-culling.test.mjs for the measured figure against the
 *     actual `buildFloraGeometryData` output.
 *   - When more surviving candidates target a band than its budget, only the
 *     first `capacity` (in candidate-submission order, itself derived from
 *     bounded per-tile iteration order) are drawn; the rest are silently
 *     dropped for that frame. This is a rendering-time degradation only -
 *     it never feeds back into `floraAt`'s placement decisions, so it does
 *     not affect generated content, determinism, or reproducibility.
 */
export const FLORA_LOD_INSTANCE_BUDGET: Record<FloraKind, readonly [number, number, number]> = {
  tree: [128, 256, 512],
  shrub: [128, 256, 512],
  grass: [256, 512, 1024],
  flower: [128, 256, 512],
};

export function totalFloraInstanceBudget(budget: Record<FloraKind, readonly [number, number, number]> = FLORA_LOD_INSTANCE_BUDGET): number {
  let sum = 0;
  for (const kind of FLORA_KIND_NAMES) for (const capacity of budget[kind]) sum += capacity;
  return sum;
}

// ---------------------------------------------------------------------------
// Per-(kind, LOD) InstancedMesh bucket.
// ---------------------------------------------------------------------------

export class FloraLodBucket {
  readonly mesh: THREE.InstancedMesh;
  readonly capacity: number;
  private writeCount = 0;
  private readonly scratchMatrix = new THREE.Matrix4();

  constructor(geometry: THREE.BufferGeometry, material: THREE.Material, capacity: number) {
    this.capacity = capacity;
    this.mesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.mesh.count = 0;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // This module does its own bounded sphere-frustum cull upstream
    // (cullSpheresSoA); THREE's per-instance auto frustum culling would be
    // redundant CPU work on top of that.
    this.mesh.frustumCulled = false;
  }

  /** Resets the write cursor for a new frame. No allocation. */
  beginFrame(): void { this.writeCount = 0; }

  /** Writes one instance's transform from `source[offset..offset+16]`
   * (`THREE.Matrix4.elements` layout). Returns false once `capacity` is
   * reached for this frame (see budget-drop note above); never throws, never
   * allocates. */
  tryAdd(source: ArrayLike<number>, offset = 0): boolean {
    if (this.writeCount >= this.capacity) return false;
    this.scratchMatrix.fromArray(source, offset);
    this.mesh.setMatrixAt(this.writeCount, this.scratchMatrix);
    this.writeCount++;
    return true;
  }

  /** Commits this frame's written instance count to the mesh. No allocation. */
  endFrame(): void {
    this.mesh.count = this.writeCount;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  get instanceCount(): number { return this.writeCount; }
}

// ---------------------------------------------------------------------------
// Top-level renderer: one bucket per (kind, LOD band).
// ---------------------------------------------------------------------------

export type FloraGeometryProvider = (kind: FloraKind, lod: FloraLodBand) => THREE.BufferGeometry;
export type FloraMaterialProvider = (kind: FloraKind, lod: FloraLodBand) => THREE.Material;

/**
 * Precomputed once at module load (not per call): `kind` -> its position in
 * `FLORA_KIND_NAMES`. Lets `bucketIndex` below turn a (kind, lod) pair into
 * a flat array index with a plain property read, never a template-literal
 * string key or a `Map.get` - see the FINDING-1 fix note in the module
 * header. `Record<FloraKind, number>` because `FLORA_KIND_NAMES` is a fixed,
 * small, closed set (4 entries); this table itself is built once, not
 * per-frame, so the `Object.fromEntries` here is not on the hot path.
 */
const FLORA_KIND_INDEX: Record<FloraKind, number> = Object.fromEntries(
  FLORA_KIND_NAMES.map((kind, index) => [kind, index]),
) as Record<FloraKind, number>;

/** Flat index into a kind-major, lod-minor array of length
 * `FLORA_KIND_NAMES.length * FLORA_LOD_COUNT` - the same order
 * `FloraFieldRenderer`'s constructor already builds `bucketList` in, so
 * `bucketList[bucketIndex(kind, lod)]` is that (kind, lod)'s bucket with no
 * lookup structure at all, just arithmetic + one array read. */
function bucketIndex(kind: FloraKind, lod: FloraLodBand): number {
  return FLORA_KIND_INDEX[kind] * FLORA_LOD_COUNT + lod;
}

/**
 * Owns one bounded `THREE.InstancedMesh` per (kind, LOD band) - 12 meshes
 * total for the 4 kinds x 3 bands in `FLORA_LOD_INSTANCE_BUDGET`. The
 * wiring agent adds `.meshes` to the scene once; per frame it calls
 * `beginFrame()`, `submit(...)` for every surviving candidate (or uses
 * `drawFloraCandidates` below), then `endFrame()`.
 */
export class FloraFieldRenderer {
  /** Pre-sized once at construction, kind-major/lod-minor order (matches
   * `bucketIndex`) - looked up by flat integer index, never a string key. */
  private readonly bucketList: FloraLodBucket[] = [];

  constructor(
    geometryFor: FloraGeometryProvider,
    materialFor: FloraMaterialProvider,
    budget: Record<FloraKind, readonly [number, number, number]> = FLORA_LOD_INSTANCE_BUDGET,
  ) {
    for (const kind of FLORA_KIND_NAMES) {
      for (let lod = 0; lod < FLORA_LOD_COUNT; lod++) {
        const band = lod as FloraLodBand;
        const capacity = budget[kind][band];
        const bucket = new FloraLodBucket(geometryFor(kind, band), materialFor(kind, band), capacity);
        this.bucketList.push(bucket);
      }
    }
  }

  /** All 12 backing meshes, for the wiring agent to add to its scene graph once. */
  get meshes(): readonly THREE.InstancedMesh[] { return this.bucketList.map((bucket) => bucket.mesh); }

  bucketFor(kind: FloraKind, lod: FloraLodBand): FloraLodBucket | undefined { return this.bucketList[bucketIndex(kind, lod)]; }

  beginFrame(): void { for (const bucket of this.bucketList) bucket.beginFrame(); }

  /** Zero-allocation: `bucketIndex` is a Record lookup + arithmetic (no
   * string concatenation) and `bucketList[...]` is a plain array read (no
   * `Map.get`), so this is safe to call once per surviving candidate. */
  submit(kind: FloraKind, lod: FloraLodBand, source: ArrayLike<number>, offset = 0): boolean {
    const bucket = this.bucketList[bucketIndex(kind, lod)];
    return bucket ? bucket.tryAdd(source, offset) : false;
  }

  endFrame(): void { for (const bucket of this.bucketList) bucket.endFrame(); }

  totalCapacity(): number { let sum = 0; for (const bucket of this.bucketList) sum += bucket.capacity; return sum; }
  totalInstanceCount(): number { let sum = 0; for (const bucket of this.bucketList) sum += bucket.instanceCount; return sum; }
}

// ---------------------------------------------------------------------------
// Bounded candidate buffer + cull-and-draw entry point.
// ---------------------------------------------------------------------------

/** Per-tile scratch capacity: bounds worst-case memory for the candidate
 * buffer independent of how many flora points a tile's sampling lattice
 * could in principle produce. Sized comfortably above the total instance
 * budget (4480) so a full tile's candidates are never truncated before
 * culling/LOD-banding gets a chance to reject most of them. */
export const FLORA_CANDIDATE_BUFFER_CAPACITY = 8192;

/**
 * Fixed-capacity struct-of-arrays candidate list, filled by the wiring
 * agent (one `push` per `floraAt` hit while walking a tile's sample
 * lattice) and consumed by `drawFloraCandidates`. All storage is allocated
 * once at construction; `push`/`clear` never allocate.
 */
export class FloraCandidateBuffer {
  readonly capacity: number;
  count = 0;
  readonly centerX: Float32Array;
  readonly centerY: Float32Array;
  readonly centerZ: Float32Array;
  readonly radius: Float32Array;
  readonly kindIndex: Uint8Array;
  /** `capacity * 16` floats, `THREE.Matrix4.elements` layout per candidate. */
  readonly matrices: Float32Array;
  private readonly outIndices: Uint32Array;
  /** Built once at construction and reused for every `cull()` call: only its
   * `count`/`planes`/`planeCount` fields are overwritten in place per call
   * (plain property assignment, not a new object). This is what `cull()`
   * being zero-allocation actually depends on - see FINDING 1 in the module
   * header. */
  private readonly cullInput: CullSpheresSoAInput;

  constructor(capacity: number = FLORA_CANDIDATE_BUFFER_CAPACITY) {
    this.capacity = capacity;
    this.centerX = new Float32Array(capacity);
    this.centerY = new Float32Array(capacity);
    this.centerZ = new Float32Array(capacity);
    this.radius = new Float32Array(capacity);
    this.kindIndex = new Uint8Array(capacity);
    this.matrices = new Float32Array(capacity * 16);
    this.outIndices = new Uint32Array(capacity);
    this.cullInput = {
      centerX: this.centerX, centerY: this.centerY, centerZ: this.centerZ, radius: this.radius,
      count: 0, planes: EMPTY_PLANES, planeCount: DEFAULT_FRUSTUM_PLANE_COUNT, outIndices: this.outIndices,
    };
  }

  clear(): void { this.count = 0; }

  /** Returns false once `capacity` is reached (silently dropped, same
   * bounded-degradation contract as `FloraLodBucket.tryAdd`). */
  push(kind: FloraKind, centerX: number, centerY: number, centerZ: number, radius: number, matrixElements: ArrayLike<number>): boolean {
    if (this.count >= this.capacity) return false;
    const i = this.count;
    this.centerX[i] = centerX; this.centerY[i] = centerY; this.centerZ[i] = centerZ; this.radius[i] = radius;
    const kindIdx = FLORA_KIND_NAMES.indexOf(kind);
    this.kindIndex[i] = kindIdx < 0 ? 0 : kindIdx;
    const base = i * 16;
    for (let k = 0; k < 16; k++) this.matrices[base + k] = matrixElements[k] ?? 0;
    this.count++;
    return true;
  }

  /** Runs `cullSpheresSoA` against this buffer's current candidates and
   * returns the survivor count; survivor original-indices are available via
   * `survivorIndex`. No allocation: overwrites `cullInput`'s mutable fields
   * in place instead of building a fresh `{...}` object literal (the fix for
   * FINDING 1 - see module header and `cullInput`'s own comment). */
  cull(planes: Float32Array, planeCount = DEFAULT_FRUSTUM_PLANE_COUNT): number {
    this.cullInput.count = this.count;
    this.cullInput.planes = planes;
    this.cullInput.planeCount = planeCount;
    return cullSpheresSoA(this.cullInput);
  }

  survivorIndex(survivorSlot: number): number { return this.outIndices[survivorSlot]!; }
}

/**
 * Culls `buffer` against `planes`, buckets survivors into `renderer` by
 * distance-from-`cameraPosition` LOD band, and commits the frame. Zero
 * per-frame allocation - true of every step here, not just asserted:
 *   - `buffer.cull` overwrites a preallocated `cullInput` object in place
 *     (no `{...}` literal - see `FloraCandidateBuffer.cull`).
 *   - Matrix data is read via `Matrix4.fromArray`'s offset parameter (no
 *     subarray copies).
 *   - `renderer.submit` resolves each surviving candidate's bucket by a flat
 *     integer array index (`bucketIndex`), never a template-literal string
 *     key or `Map.get` (see `FloraFieldRenderer.submit`).
 *   - The cull output and per-bucket write cursors reuse buffers sized once
 *     at construction.
 * Measured (60,000 frames x 500 candidates, `node --trace-gc`): see the
 * module header and tests/flora-culling.test.mjs for the before/after
 * Scavenge-GC counts this claim is based on.
 */
export function drawFloraCandidates(
  buffer: FloraCandidateBuffer,
  renderer: FloraFieldRenderer,
  cameraPosition: { x: number; y: number; z: number },
  planes: Float32Array,
  planeCount = DEFAULT_FRUSTUM_PLANE_COUNT,
): { survivorCount: number; drawnCount: number } {
  renderer.beginFrame();
  const survivorCount = buffer.cull(planes, planeCount);
  let drawnCount = 0;
  for (let slot = 0; slot < survivorCount; slot++) {
    const idx = buffer.survivorIndex(slot);
    const dx = buffer.centerX[idx]! - cameraPosition.x;
    const dy = buffer.centerY[idx]! - cameraPosition.y;
    const dz = buffer.centerZ[idx]! - cameraPosition.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const lod = pickFloraLodBand(distance);
    if (lod === -1) continue;
    const kind = FLORA_KIND_NAMES[buffer.kindIndex[idx]!]!;
    if (renderer.submit(kind, lod, buffer.matrices, idx * 16)) drawnCount++;
  }
  renderer.endFrame();
  return { survivorCount, drawnCount };
}
