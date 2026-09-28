/**
 * Puts Atlas's existing creature rigs onto a planet: deterministic herd
 * placement, a closed-form (non-accumulated) presentation-only movement
 * model, and a skinned/placeholder-VAT/impostor LOD ladder.
 *
 * Provenance: the LOD-band distance constants below
 * (`FAUNA_LOD0_DISTANCE_M`/`FAUNA_LOD1_DISTANCE_M`/`FAUNA_VISIBLE_DISTANCE_M`)
 * are ported from C:\LLM\IWSDK\nms\shared\faunaAnimAudio.ts's
 * `M9_LOD0_DISTANCE_M` (18) / `M9_LOD1_DISTANCE_M` (100) /
 * `M9_VISIBLE_DISTANCE_M` (280) - presentation distances for continuous low flight,
 * reused verbatim rather than re-deriving. The ring-based per-instance
 * placement idea (golden-angle spiral + sqrt-radius jitter) also follows
 * that file's `generateFaunaInstance`, adapted to a bounded per-anchor herd
 * instead of one fixed 4096-instance source pool.
 *
 * `nms`'s actual per-frame movement
 * (C:\LLM\IWSDK\nms\shared\faunaAnimAudio.ts's `simulateFaunaBoids`, and its
 * worker wrapper C:\LLM\IWSDK\nms\src\workers\faunaBoidWorker.ts) is
 * ITERATIVE Euler integration over fixed steps - accumulated velocity/
 * position state that cannot be evaluated at an arbitrary `t` without
 * replaying every step before it. That is incompatible with this task's
 * t-seek-independence requirement, so it is intentionally NOT ported.
 * Movement here (`faunaMemberPoseAt`) is instead a closed-form function of
 * (seed, memberIndex, t): a fixed per-member orbital phase/radius/speed
 * around the herd anchor, documented as PRESENTATION-ONLY - it never
 * affects which herd exists, its composition, or any genome, so seeking
 * straight to a `t` is always identical to having animated up to it.
 *
 * Rigs themselves are NOT reimplemented here: `createFaunaSkinnedRig` is a
 * thin call-through to Atlas's own `src/creature-rig.ts` `createCreatureRig`
 * (per the task's "put the existing creature rigs onto a planet"), and
 * genomes come from `src/creature-model.ts`'s `generateCreatureGenome`/
 * `individualCreatureGenome`. `nms` code was not used for the rig itself.
 *
 * Ground-height coupling: `creature-rig.ts`'s `CreatureRig.update(time, gait,
 * terrain)` only accepts a synthetic lab `TerrainKind` ('flat'|'slope'|
 * 'steps') driven by its own internal `creatureTerrainHeight`, not an
 * injectable real-world height callback - so this module cannot ground a
 * rig's per-foot IK to actual planet terrain without editing creature-rig.ts
 * (out of scope; owned by another agent). Instead, this module treats the
 * rig's own `update()` as an in-place local walk-cycle animator (call it
 * with `terrain: 'flat'`) and provides `faunaGroundedTransform` so the
 * wiring agent can apply the REAL world position/orientation (from its own
 * injected `groundHeightAt`) as an OUTER transform on `rig.group`'s parent.
 * See the module-level report for the exact wiring this implies.
 *
 * `t` is SECONDS (unlike `flora-field.ts`, which uses Myr - documented
 * explicitly per-module since gait/orbital speeds are naturally a
 * seconds-scale quantity, matching `creature-rig.ts`'s own
 * `update(time, ...)` contract). It is the branded `Seconds` type declared
 * below (not a plain `number`) precisely because an adversarial review
 * proved that mixing it up with flora-field.ts's `Myr` produces silent wrong
 * output with no error - see that section's comment and `toSeconds`'s
 * runtime guard for the fix. `t` never touches herd presence/composition/
 * genome (those depend only on seed/address/biome/gate), only the
 * continuous pose and the floor-windowed (so still directly seekable, no
 * accumulation) gait selection.
 *
 * Pure-Three, no IWSDK, no app singletons; imports only `three`,
 * `./creature-model.ts`, and `./creature-rig.ts` (both existing, read-only,
 * un-edited Atlas modules named explicitly by the task).
 */
import * as THREE from 'three';
import {
  generateCreatureGenome,
  individualCreatureGenome,
  validateCreatureGenome,
  type CreatureArchetype,
  type CreatureGenome,
} from './creature-model.ts';
import { createCreatureRig, type CreatureGait, type CreatureRig } from './creature-rig.ts';
import { CATALOGUE_EPOCH_NS, NS } from './world-time.ts';

export type { CreatureGenome, CreatureArchetype, CreatureGait, CreatureRig };

// ---------------------------------------------------------------------------
// Hashing (same FNV-1a + avalanche convention as biosphere-model.ts /
// river-environment.ts / creature-model.ts - duplicated locally, ~10 lines,
// to keep this module import-free of everything except the two named
// creature files).
// ---------------------------------------------------------------------------

function hash32(value: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}
function unit(key: string): number { return hash32(key) / 0x1_0000_0000; }
function between(key: string, low: number, high: number): number { return low + (high - low) * unit(key); }
function clamp(value: number, low: number, high: number): number { return Math.max(low, Math.min(high, value)); }
function clampInt(value: number, low: number, high: number): number { return Math.max(low, Math.min(high, Math.floor(value))); }

// ---------------------------------------------------------------------------
// Branded time unit (fix for the adversarial review's FINDING 2).
//
// This module's `t` is SECONDS (matching creature-rig.ts's own
// `update(time, ...)` contract and this module's own gait/orbital speeds,
// which are naturally a seconds-scale quantity - see the module header).
// The sibling module flora-field.ts has its own `t` in Myr (millions of
// years). Both were previously plain `number`, so a caller could silently
// swap them: the adversarial review fed a raw ~1.3e26 magnitude (what a
// world-time.ts Ns/BigInt-nanosecond value looks like once misread as
// seconds) into `faunaMemberPoseAt` and got a BIT-IDENTICAL pose for a full
// extra simulated nanosecond - i.e. the creature reads as frozen, with no
// error at all. A brand makes this a compile-time type error for any
// TypeScript caller; because brands are erased at runtime (a `.mjs` test,
// or any caller that bypasses the type system, still just sees a `number`),
// `toSeconds` below ALSO enforces a runtime magnitude check that throws -
// never clamps, never warns - so the mistake is loud even when the compiler
// can't see it.
//
// Range and why: this module's own values are all small (gaitPeriodS is
// 10-18s, orbitAngularSpeed is roughly +-0.25 rad/s - see `faunaHerdAt`
// below), and `t` is meant to be driven by an ordinary elapsed-seconds
// presentation clock, not a cosmic-scale one (that is flora-field.ts's Myr
// job). [-1e15, 1e15] seconds (~+-31.7 million years) is already many
// orders of magnitude more generous than any real caller needs, while
// staying ~11 orders of magnitude tighter than the ~1.3e26 magnitude the
// review actually observed reaching this module by mistake - so an
// out-of-range tSeconds reliably signals a wrong-unit value.
const SECONDS_MIN = -1e15;
const SECONDS_MAX = 1e15;

/** Branded Seconds: a plain `number` at runtime, but a distinct nominal type
 * at compile time so `faunaHerdAt`/`faunaMemberPoseAt` cannot accept a raw
 * number or flora-field.ts's `Myr` by accident - see the section header
 * above. */
export type Seconds = number & { readonly __unit: 's' };

/**
 * Constructs a branded `Seconds`, throwing a loud `RangeError` if `value` is
 * outside the documented plausible range above. Call this at any boundary
 * that owns a raw `number` (e.g. wiring code's elapsed-time accumulator).
 * `faunaHerdAt` and `faunaMemberPoseAt` also call this at their own entry
 * point, so even a caller that bypasses TypeScript entirely (brands do not
 * exist at runtime) still gets a thrown error instead of a silently frozen
 * pose.
 */
export function toSeconds(value: number): Seconds {
  if (!Number.isFinite(value) || value < SECONDS_MIN || value > SECONDS_MAX) {
    throw new RangeError(
      `toSeconds: ${value} is outside the plausible tSeconds range [${SECONDS_MIN}, ${SECONDS_MAX}] s - ` +
        'this usually means a value in the wrong time unit (e.g. Myr, or a raw world-time.ts ' +
        'Ns/BigInt-nanosecond magnitude) was passed where seconds was expected.',
    );
  }
  return value as Seconds;
}

// ---------------------------------------------------------------------------
// Biosphere/biome gating (structural types, no import of biosphere-model.ts
// or surface-biomes.ts - see module header and flora-field.ts's identical
// convention).
// ---------------------------------------------------------------------------

export type FaunaStage = 'unformed' | 'forming' | 'sterile' | 'microbial' | 'complex';
export interface FaunaBiosphereGate {
  stage: FaunaStage;
  /** Canonical living species at this date. When present, herd genomes and
   * identities derive from these records, not a separately rolled founder. */
  species?: readonly { id: string; creature: CreatureGenome }[];
  /** Animal species (by archetype) actually alive at the query date, as
   * already computed by the caller from biosphere-model.ts's
   * `biosphereAt(world, dateMyr).species` (map `creature.archetype` for
   * entries with a `.creature`). Omitted = every archetype allowed once the
   * stage gate passes. An empty array (all animal lineages currently
   * extinct) yields no fauna even at the 'complex' stage. */
  availableArchetypes?: readonly CreatureArchetype[];
}
export interface FaunaBiomeSample {
  weights: readonly [number, number, number, number];
  forestPotential: boolean;
  moisture: number;
  slopeDeg: number;
  ocean: boolean;
}

const ALL_ARCHETYPES: readonly CreatureArchetype[] = ['browser', 'runner', 'low-slung', 'long-neck'];
const MAX_HERD_SLOPE_DEG = 26;

// ---------------------------------------------------------------------------
// Deterministic herd placement.
// ---------------------------------------------------------------------------

export interface FaunaHerdMember {
  id: string;
  spatialCellId?:string;
  archetype: CreatureArchetype;
  speciesId?: string;
  speciesGenome?: CreatureGenome;
  /** Pass to `generateCreatureGenome(genomeSeed, archetype)` to reproduce
   * this member's founder genome exactly. */
  genomeSeed: string;
  variant: number;
  stage: 'adult' | 'juvenile';
  /** Fixed per-member orbital center, in meters, in the local tangent-plane
   * frame the caller places the herd anchor in (does not vary with `t`). */
  anchorOffsetX: number;
  anchorOffsetZ: number;
  orbitRadiusM: number;
  orbitAngularSpeed: number;
  orbitPhase: number;
  gaitPeriodS: number;
}
export type FaunaHerd =
  | { present: false; members: readonly [] }
  | { present: true; members: readonly FaunaHerdMember[]; herdRadiusM: number };

/**
 * Deterministic herd/flock composition for one placement anchor (e.g. a
 * tile-lattice sample point, analogous to `floraAt`'s `direction`). Pure
 * function of its arguments: identical inputs give an identical herd
 * regardless of call order, streaming state, or what else has been queried.
 * `tSeconds` is accepted for API symmetry with the rest of this module but
 * does NOT affect presence/composition (only `faunaMemberPoseAt` uses it) -
 * see module header. Still validated via `toSeconds` below so a wrong-unit
 * value is loud here too, not just at the one call site that reads it.
 */
export function faunaHerdAt(
  seed: string,
  bodyAddress: string,
  direction: readonly [number, number, number],
  biome: FaunaBiomeSample,
  gate: FaunaBiosphereGate,
  _tSeconds: Seconds = toSeconds(0),
  spatialCellId?:string,
): FaunaHerd {
  toSeconds(_tSeconds);
  if (gate.stage !== 'complex') return { present: false, members: [] };
  if (biome.ocean || biome.slopeDeg >= MAX_HERD_SLOPE_DEG) return { present: false, members: [] };

  const anchorKey = `${seed}|${bodyAddress}|fauna|${spatialCellId??`${direction[0]},${direction[1]},${direction[2]}`}`;
  const groundWeight = clamp(biome.weights[1] ?? 0, 0, 1);
  const habitability = groundWeight * (0.4 + biome.moisture * 0.6);
  const presenceRoll = unit(`${anchorKey}|presence`);
  // Herds are sparse relative to flora - most anchors have none.
  if (presenceRoll >= habitability * 0.12) return { present: false, members: [] };

  const livingSpecies = gate.species?.slice().sort((a,b)=>a.id.localeCompare(b.id)) ?? [];
  if (gate.species && livingSpecies.length === 0) return { present: false, members: [] };
  let candidateArchetypes = ALL_ARCHETYPES;
  if (gate.availableArchetypes) {
    const allowed = new Set(gate.availableArchetypes);
    candidateArchetypes = ALL_ARCHETYPES.filter((a) => allowed.has(a));
  }
  if (candidateArchetypes.length === 0) return { present: false, members: [] };
  const selectedSpecies = livingSpecies.length
    ? livingSpecies[clampInt(unit(`${anchorKey}|species`) * livingSpecies.length, 0, livingSpecies.length - 1)]!
    : null;
  const archetype = selectedSpecies?.creature.archetype ?? candidateArchetypes[clampInt(unit(`${anchorKey}|archetype`) * candidateArchetypes.length, 0, candidateArchetypes.length - 1)]!;

  const herdSize = clampInt(3 + unit(`${anchorKey}|size`) * 5, 3, 7);
  const herdRadiusM = 4 + unit(`${anchorKey}|radius`) * 6;
  const genomeSeed = `${anchorKey}|founder`;
  const members: FaunaHerdMember[] = [];
  for (let i = 0; i < herdSize; i++) {
    const memberKey = `${anchorKey}|${selectedSpecies?.id ?? archetype}|member${i}`;
    const angle = (i / herdSize) * Math.PI * 2 + between(`${memberKey}|angle`, -0.4, 0.4);
    const distanceFromAnchor = herdRadiusM * (0.25 + unit(`${memberKey}|distance`) * 0.75);
    members.push({
      id: `${bodyAddress}:fauna:${hash32(memberKey).toString(16)}`,
      spatialCellId,
      archetype,
      speciesId: selectedSpecies?.id,
      speciesGenome: selectedSpecies?.creature,
      genomeSeed,
      variant: i % 4,
      stage: unit(`${memberKey}|stage`) < 0.18 ? 'juvenile' : 'adult',
      anchorOffsetX: Math.cos(angle) * distanceFromAnchor,
      anchorOffsetZ: Math.sin(angle) * distanceFromAnchor,
      orbitRadiusM: 2.5 + unit(`${memberKey}|orbitRadius`) * 5,
      orbitAngularSpeed: (unit(`${memberKey}|orbitDirection`) < .5 ? -1 : 1) *
        (.45 + unit(`${memberKey}|orbitSpeed`) * .45) / (2.5 + unit(`${memberKey}|orbitRadius`) * 5),
      orbitPhase: unit(`${memberKey}|orbitPhase`) * Math.PI * 2,
      gaitPeriodS: 10 + unit(`${memberKey}|gaitPeriod`) * 8,
    });
  }
  return { present: true, members, herdRadiusM };
}

/** Reproduces `member`'s genome deterministically via `creature-model.ts`. */
export function faunaMemberGenome(member: FaunaHerdMember): CreatureGenome {
  const founder = member.speciesGenome ?? generateCreatureGenome(member.genomeSeed, member.archetype);
  return individualCreatureGenome(founder, member.id, member.variant, member.stage);
}

/** Individual idle schedules share the orbit's seeded phase, with no new
 * random stream or accumulated state. Quantize once to nanoseconds so both
 * public pose adapters use the same window boundaries. */
function activityClock(member: FaunaHerdMember) {
  const gaitPeriod=BigInt(Math.max(1,Math.round(member.gaitPeriodS*Number(NS))));
  const cyclePeriod=3n*gaitPeriod;
  const turn=((member.orbitPhase/(Math.PI*2))%1+1)%1;
  const offset=BigInt(Math.round(turn*Number(cyclePeriod)))%cyclePeriod;
  return {gaitPeriod,cyclePeriod,offset};
}

/** Exact-date pose. Only bounded periodic remainders are converted to Number;
 * a 10^100-year date never becomes an imprecise floating-point second count. */
export function faunaMemberPoseAtWorldNs(member: FaunaHerdMember, worldNs: bigint): FaunaMemberPose {
  return faunaMemberActivityAtWorldNs(member, worldNs).pose;
}

/** The exact-date pose plus the bounded quantities a detailed rig needs to
 * derive footfalls from the same path: how far round its orbit the member has
 * walked, the orbit's walking period, and time spent in the current idle or
 * walk window. All three are periodic remainders, so they stay exact for any date. */
export interface FaunaMemberActivity {
  pose: FaunaMemberPose;
  /** Fraction [0, 1) of one orbit already walked (idle time excluded). */
  travel: number;
  /** Seconds to walk one full orbit; Infinity for a stationary member. */
  revolutionS: number;
  /** Seconds since the current idle or walk window began. */
  stateS: number;
}

export function faunaMemberActivityAtWorldNs(member: FaunaHerdMember, worldNs: bigint): FaunaMemberActivity {
  const {gaitPeriod,cyclePeriod,offset}=activityClock(member);
  const elapsed = worldNs - CATALOGUE_EPOCH_NS + offset;
  const cycleRemainder=((elapsed%cyclePeriod)+cyclePeriod)%cyclePeriod;
  // Integrate the periodic idle/walk schedule analytically. Idle pauses both
  // translation and gait, with no accumulated state and no seek dependence.
  const activeElapsed=(elapsed-cycleRemainder)/cyclePeriod*(2n*gaitPeriod)+(cycleRemainder>gaitPeriod?cycleRemainder-gaitPeriod:0n)
    -(offset>gaitPeriod?offset-gaitPeriod:0n);
  const speed = Math.abs(member.orbitAngularSpeed);
  const period = speed < 1e-9 ? 1n : BigInt(Math.max(1, Math.round((Math.PI * 2 / speed) * Number(NS))));
  const remainder = ((activeElapsed % period) + period) % period;
  const angle = member.orbitPhase + (speed < 1e-9 ? 0 : Math.sign(member.orbitAngularSpeed) * Number(remainder) / Number(period) * Math.PI * 2);
  const gaitWindow = (elapsed - ((elapsed % gaitPeriod) + gaitPeriod) % gaitPeriod) / gaitPeriod;
  const gait: CreatureGait = ((gaitWindow % 3n) + 3n) % 3n === 0n ? 'idle' : 'walk';
  const pose: FaunaMemberPose = {
    x: member.anchorOffsetX + Math.cos(angle) * member.orbitRadiusM,
    z: member.anchorOffsetZ + Math.sin(angle) * member.orbitRadiusM,
    yaw: angle + Math.sign(member.orbitAngularSpeed || 1) * Math.PI * 0.5,
    gait,
  };
  const moving = speed >= 1e-9;
  return {
    pose,
    travel: moving ? Number(remainder) / Number(period) : 0,
    revolutionS: moving ? Number(period) / Number(NS) : Infinity,
    stateS: Number(gait === 'idle' ? cycleRemainder : cycleRemainder - gaitPeriod) / Number(NS),
  };
}

/** Short, exact-date cycle for the rig's decorative walk animation. */
export function faunaRigSecondsAt(worldNs: bigint): number {
  const period = 1_000_000n * NS;
  const remainder = ((worldNs - CATALOGUE_EPOCH_NS) % period + period) % period;
  return Number(remainder) / Number(NS);
}

// ---------------------------------------------------------------------------
// Closed-form (non-accumulated) presentation movement.
// ---------------------------------------------------------------------------

export interface FaunaMemberPose {
  /** Local tangent-plane offset (meters) from the herd anchor, at `tSeconds`. */
  x: number;
  z: number;
  /** Facing yaw, radians, tangent to the direction of travel. */
  yaw: number;
  gait: CreatureGait;
}

/**
 * Pure, closed-form function of (`member`, `tSeconds`): a fixed circular
 * orbit around the member's own anchor offset, at a fixed per-member angular
 * speed and phase. No integration/accumulated state, so
 * `faunaMemberPoseAt(member, tSeconds)` for any `tSeconds` always equals
 * having stepped there through smaller increments - this is what satisfies
 * the t-seek independence requirement in place of nms's iterative boid
 * integrator (see module header). Presentation-only: never read by
 * `faunaHerdAt` or anything that decides generated content.
 *
 * `tSeconds` is validated via `toSeconds` at entry - loud on a wrong-unit
 * value (e.g. flora-field.ts's Myr, or a raw Ns magnitude) even if the
 * TypeScript brand was bypassed - see the Seconds section above (FINDING 2
 * fix). Without this guard a wrong-unit `t` produced a bit-identical pose
 * for a full extra simulated nanosecond with no error at all.
 */
export function faunaMemberPoseAt(member: FaunaHerdMember, tSeconds: Seconds): FaunaMemberPose {
  const clock=activityClock(member),offset=Number(clock.offset)/Number(NS),gaitPeriod=Number(clock.gaitPeriod)/Number(NS);
  const time = toSeconds(tSeconds)+offset;
  const cyclePeriod=Number(clock.cyclePeriod)/Number(NS),cycleRemainder=((time%cyclePeriod)+cyclePeriod)%cyclePeriod;
  const activeTime=(time-cycleRemainder)/cyclePeriod*(2*gaitPeriod)+Math.max(0,cycleRemainder-gaitPeriod)-Math.max(0,offset-gaitPeriod);
  const angle = member.orbitPhase + member.orbitAngularSpeed * activeTime;
  const x = member.anchorOffsetX + Math.cos(angle) * member.orbitRadiusM;
  const z = member.anchorOffsetZ + Math.sin(angle) * member.orbitRadiusM;
  const yaw = angle + Math.sign(member.orbitAngularSpeed || 1) * Math.PI * 0.5;
  // Floor-windowed (not accumulated) gait cycling: idle roughly one window
  // in three, otherwise walking. Directly evaluable at any `t`.
  const window = Math.floor(time / gaitPeriod);
  const gait: CreatureGait = window % 3 === 0 ? 'idle' : 'walk';
  return { x, z, yaw, gait };
}

/**
 * Combines a real-world anchor placement with `groundHeightAt` (the
 * wiring agent's real terrain sampler - see module header on why this must
 * be applied as an OUTER transform rather than through
 * `CreatureRig.update`'s synthetic `TerrainKind`) into a position/quaternion
 * for the rig's parent transform. Pure function, no THREE globals mutated.
 */
export function faunaGroundedTransform(
  anchorWorld: THREE.Vector3,
  tangentRight: THREE.Vector3,
  tangentForward: THREE.Vector3,
  up: THREE.Vector3,
  pose: FaunaMemberPose,
  groundHeightAt: (worldPosition: THREE.Vector3) => number,
): { position: THREE.Vector3; quaternion: THREE.Quaternion } {
  const position = anchorWorld.clone()
    .addScaledVector(tangentRight, pose.x)
    .addScaledVector(tangentForward, pose.z);
  position.addScaledVector(up, groundHeightAt(position));
  const facing = tangentRight.clone().multiplyScalar(Math.cos(pose.yaw)).addScaledVector(tangentForward, Math.sin(pose.yaw)).normalize();
  // Creature anatomy faces +X and stands along +Y. A shortest-arc rotation
  // from +Z alone leaves arbitrary roll on a spherical planet.
  const radialUp=up.clone().normalize(),side=new THREE.Vector3().crossVectors(facing,radialUp).normalize();
  facing.crossVectors(radialUp,side).normalize();
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(facing,radialUp,side));
  return { position, quaternion };
}

// ---------------------------------------------------------------------------
// LOD ladder: skinned (L0) / static low-poly proxy (L1, placeholder for a
// true vertex-animation-texture ladder) / billboard impostor (L2).
// ---------------------------------------------------------------------------

export type FaunaLodBand = 0 | 1 | 2;

/** Ported from nms/shared/faunaAnimAudio.ts's M9_LOD*_DISTANCE_M / M9_VISIBLE_DISTANCE_M. */
export const FAUNA_LOD0_DISTANCE_M = 18;
export const FAUNA_LOD1_DISTANCE_M = 100;
export const FAUNA_VISIBLE_DISTANCE_M = 280;

export function pickFaunaLodBand(distanceM: number): FaunaLodBand | -1 {
  if (distanceM <= FAUNA_LOD0_DISTANCE_M) return 0;
  if (distanceM <= FAUNA_LOD1_DISTANCE_M) return 1;
  if (distanceM <= FAUNA_VISIBLE_DISTANCE_M) return 2;
  return -1;
}

/**
 * L0 budget is a hard concurrent-rig cap, not an InstancedMesh capacity:
 * each `createCreatureRig` result is an individually skinned hierarchy of
 * ~20 `THREE.Mesh` draw calls (body/head/eyes/ears/horn/tail + 4 legs x
 * upper/knee/lower/foot), so unlike flora's instanced buckets these do NOT
 * share draw calls. 16 concurrent LOD0 rigs is already up to ~320 draw
 * calls, so this is deliberately small against the
 * docs/webxr/quest3-perf-budgets.md <=150 draw calls/eye ceiling once
 * terrain/water/flora/UI are also drawing - the wiring agent should treat
 * this as an outer ceiling, not a target to fill.
 */
export const FAUNA_LOD0_MAX_CONCURRENT_RIGS = 16;
/** L1/L2 are drawn as InstancedMesh (one draw call per band regardless of
 * count), so their budgets are ordinary instance caps. */
export const FAUNA_LOD1_INSTANCE_BUDGET = 128;
export const FAUNA_LOD2_INSTANCE_BUDGET = 512;

/** L0: thin call-through to the existing, unedited `creature-rig.ts`. */
export function createFaunaSkinnedRig(genome: CreatureGenome): CreatureRig {
  return createCreatureRig(genome);
}

export interface FaunaGeometryData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  colors: Float32Array;
  indices: Uint16Array;
  triangleCount: number;
}
interface FaunaBuilder { positions: number[]; normals: number[]; uvs: number[]; colors: number[]; indices: number[]; }
function createFaunaBuilder(): FaunaBuilder { return { positions: [], normals: [], uvs: [], colors: [], indices: [] }; }
function finishFaunaBuilder(builder: FaunaBuilder): FaunaGeometryData {
  const indices = new Uint16Array(builder.indices);
  return { positions: new Float32Array(builder.positions), normals: new Float32Array(builder.normals), uvs: new Float32Array(builder.uvs), colors: new Float32Array(builder.colors), indices, triangleCount: indices.length / 3 };
}
function addBox(builder: FaunaBuilder, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color: [number, number, number]): void {
  const hx = sx / 2, hy = sy / 2, hz = sz / 2;
  const faces: Array<{ normal: [number, number, number]; corners: [number, number, number][] }> = [
    { normal: [1, 0, 0], corners: [[hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz], [hx, -hy, hz]] },
    { normal: [-1, 0, 0], corners: [[-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz], [-hx, -hy, -hz]] },
    { normal: [0, 1, 0], corners: [[-hx, hy, -hz], [hx, hy, -hz], [hx, hy, hz], [-hx, hy, hz]] },
    { normal: [0, -1, 0], corners: [[-hx, -hy, hz], [hx, -hy, hz], [hx, -hy, -hz], [-hx, -hy, -hz]] },
    { normal: [0, 0, 1], corners: [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]] },
    { normal: [0, 0, -1], corners: [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]] },
  ];
  for (const face of faces) {
    const start = builder.positions.length / 3;
    for (let i = 0; i < 4; i++) {
      const corner = face.corners[i]!;
      builder.positions.push(cx + corner[0], cy + corner[1], cz + corner[2]);
      builder.normals.push(face.normal[0], face.normal[1], face.normal[2]);
      builder.uvs.push(i === 1 || i === 2 ? 1 : 0, i >= 2 ? 1 : 0);
      builder.colors.push(color[0], color[1], color[2]);
    }
    builder.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
}

/**
 * L1: a static, low-poly boxy proxy silhouette (torso + head + 4 legs) sized
 * from `genome`, tinted with its coat color. This is a PLACEHOLDER for a
 * true vertex-animation-texture (VAT) ladder - baking real per-vertex
 * animation frames into a texture needs a render pass, which this pure-CPU,
 * no-GL-context module cannot perform (nms's own M9 fauna is documented in
 * HANDOFF.md §7k as starter/proof code too, not production VAT playback).
 * Wiring note: swap this out for genuine VAT once a render-capable build
 * step exists; until then it gives L1 the right silhouette/color at a
 * fraction of L0's draw-call cost.
 */
export function buildFaunaProxyGeometryData(genome: CreatureGenome): FaunaGeometryData {
  const builder = createFaunaBuilder();
  const color: [number, number, number] = hexToLinear(genome.color);
  const accent: [number, number, number] = hexToLinear(genome.accentColor);
  addBox(builder, 0, genome.legLength + genome.torsoHeight * 0.5, 0, genome.torsoLength, genome.torsoHeight, genome.torsoWidth, color);
  addBox(builder, genome.torsoLength * 0.55, genome.legLength + genome.torsoHeight * 0.55 + genome.neckRise * 0.5, 0, genome.headLength, genome.headWidth, genome.headWidth, color);
  const legY = genome.legLength * 0.5;
  for (const xSign of [-1, 1]) for (const zSign of [-1, 1]) {
    addBox(builder, xSign * genome.torsoLength * 0.3, legY, zSign * genome.stanceWidth * 0.5, genome.footWidth, genome.legLength, genome.footWidth, accent);
  }
  return finishFaunaBuilder(builder);
}

/** L2: a single billboard quad sized to the genome's rough bounding box; the
 * wiring agent rotates it to face the camera each frame (out of scope for a
 * GL-context-free module - see report). */
export function buildFaunaImpostorGeometryData(genome: CreatureGenome): FaunaGeometryData {
  const builder = createFaunaBuilder();
  const width = genome.torsoLength + genome.headLength;
  const height = genome.legLength + genome.torsoHeight + genome.neckRise + genome.headWidth;
  const color: [number, number, number] = hexToLinear(genome.color);
  const start = 0;
  builder.positions.push(-width / 2, 0, 0, width / 2, 0, 0, width / 2, height, 0, -width / 2, height, 0);
  for (let i = 0; i < 4; i++) { builder.normals.push(0, 0, 1); builder.colors.push(color[0], color[1], color[2]); }
  builder.uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
  builder.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  return finishFaunaBuilder(builder);
}

export function faunaGeometryToBufferGeometry(data: FaunaGeometryData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
  geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
  return geometry;
}

function hexToLinear(hex: string): [number, number, number] {
  const hit = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  const value = Number.parseInt(hit ? hit[1]! : '778877', 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

// Re-export so wiring code has one place to validate a reproduced genome.
export { validateCreatureGenome };
