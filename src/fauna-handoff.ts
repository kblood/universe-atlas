/**
 * Pure presentation weights for the fauna representation seams
 * (docs/transition-audit-2026-10-07.md F5, F12, F13).
 *
 * Nothing here decides which animals exist, where they are or what they do;
 * every function maps a distance, a dated clock value or a frame interval to
 * a coverage weight in [0, 1]. No allocation, no module state, no THREE.
 *
 * - `handoffWeights`: near rig <-> instanced proxy. The 80/95 m hysteresis
 *   decides the target representation; a 0.3 s eased cross-fade moves the
 *   coverage toward it, so each crossing is exactly one swap and the two
 *   weights are complementary throughout the overlap.
 * - `gaitBlend`: the proxy's idle <-> walk amplitude, eased exactly as the near
 *   rig eases its locomotion (`fauna-locomotion.ts`, 0.6 s smoothstep on the
 *   dated activity clock's `stateS`). Pure in the dated clock, so a paused date
 *   replays bit for bit.
 * - `eyeDetailWeight` / `rangeWeight`: distance fades that end in an exact 0 at
 *   the former hard cuts (60 m eyes, 600 m range), so nothing beyond the old
 *   cut is ever drawn and nothing inside the fade start changes.
 */

/** Near rig acquisition distance; equals `FAUNA_NEAR_RIG_ENTER_M` (asserted by tests/fauna-handoff-coverage). */
export const FAUNA_HANDOFF_ENTER_M = 80;
/** Near rig retention distance; equals `FAUNA_NEAR_RIG_EXIT_M` (asserted by tests/fauna-handoff-coverage). */
export const FAUNA_HANDOFF_EXIT_M = 95;
/** Rig <-> proxy cross-fade duration (audit F5 short-term fix). */
export const FAUNA_HANDOFF_FADE_S = .3;
/** Idle <-> walk ease, the near rig's own `smooth(tau / .6)` (fauna-locomotion.ts:142). */
export const FAUNA_GAIT_EASE_S = .6;
/** Proxy eyes fade out across [start, end]; end equals `FAUNA_FIELD_EYE_DETAIL_M`. */
export const FAUNA_EYE_FADE_START_M = 50;
export const FAUNA_EYE_FADE_END_M = 60;
/** Proxy range fade across [start, end]; end equals `FAUNA_FIELD_VISIBLE_M`. */
export const FAUNA_RANGE_FADE_START_M = 560;
export const FAUNA_RANGE_FADE_END_M = 600;

/** Hermite smoothstep of x in [0, 1]: C1, exact 0 and 1 at the ends. */
export function smoothstep01(x: number): number {
  const t = x <= 0 ? 0 : x >= 1 ? 1 : x;
  return t * t * (3 - 2 * t);
}

/** 1 up to `start`, eased to exactly 0 at and beyond `end`. NaN reads as beyond. */
function fadeOut(distanceM: number, start: number, end: number): number {
  if (distanceM <= start) return 1;
  if (!(distanceM < end)) return 0;
  return 1 - smoothstep01((distanceM - start) / (end - start));
}

/** Proxy eye coverage: 1 within 50 m, exactly 0 from 60 m (the former cut). */
export function eyeDetailWeight(distanceM: number, startM = FAUNA_EYE_FADE_START_M, endM = FAUNA_EYE_FADE_END_M): number {
  return fadeOut(distanceM, startM, endM);
}

/** Proxy range coverage: 1 within 560 m, exactly 0 from 600 m (the former cut). */
export function rangeWeight(distanceM: number, startM = FAUNA_RANGE_FADE_START_M, endM = FAUNA_RANGE_FADE_END_M): number {
  return fadeOut(distanceM, startM, endM);
}

/**
 * Locomotion amplitude of a proxy in [0, 1] from the dated activity clock:
 * `stateS` is the seconds since the current idle or walk window began
 * (`FaunaMemberActivity.stateS`). Walking eases in from 0, idling eases out
 * from 1, so the amplitude is continuous across both flips whenever a window
 * is longer than `easeS` (gait windows are 10-18 s).
 */
export function gaitBlend(gait: string, stateS: number, easeS = FAUNA_GAIT_EASE_S): number {
  const w = smoothstep01(Math.max(0, stateS) / easeS);
  return gait === 'idle' ? 1 - w : w;
}

/** Hysteresis latch: enters at `enterM`, leaves beyond `exitM`. */
export function handoffInside(distanceM: number, inside: boolean, enterM = FAUNA_HANDOFF_ENTER_M, exitM = FAUNA_HANDOFF_EXIT_M): boolean {
  return distanceM <= (inside ? exitM : enterM);
}

/** Linear progress toward `target` (0 proxy, 1 rig) after `dtS`. `fadeS <= 0` is the former hard swap. */
export function advanceHandoff(progress: number, target: 0 | 1, dtS: number, fadeS = FAUNA_HANDOFF_FADE_S): number {
  if (!(fadeS > 0)) return target;
  const step = Math.max(0, dtS) / fadeS;
  return target ? Math.min(1, progress + step) : Math.max(0, progress - step);
}

/** Rig coverage for a linear progress: eased, exact 0 and 1 at the ends. */
export function handoffRigWeight(progress: number): number { return smoothstep01(progress); }

export interface FaunaHandoffState {
  /** Hysteresis latch for the distance band. */
  inside: boolean;
  /** The rig representation can be shown (body built, slot available). */
  ready: boolean;
  /** Representation the cross-fade is moving toward: 1 rig, 0 proxy. */
  target: 0 | 1;
  /** Linear cross-fade progress toward the rig, [0, 1]. */
  progress: number;
  /** Complementary coverage weights: rig + proxy = 1. */
  rig: number;
  proxy: number;
  /** Target changes so far: each is one representation swap begun. */
  swaps: number;
}
export interface FaunaHandoffOptions { enterM?: number; exitM?: number; fadeS?: number }

export function createHandoffState(ready = true): FaunaHandoffState {
  return { inside: false, ready, target: 0, progress: 0, rig: 0, proxy: 1, swaps: 0 };
}

/**
 * One frame of the single-animal handoff. Mutates and returns `state`. The
 * target is `inside && ready`, so a body that finishes building inside 80 m
 * starts a fade rather than popping, and losing readiness (capacity) fades
 * back. With `fadeS = 0` this is exactly the former hard swap.
 */
export function handoffWeights(distanceM: number, state: FaunaHandoffState, dtS = 0, options: FaunaHandoffOptions = {}): FaunaHandoffState {
  state.inside = handoffInside(distanceM, state.inside, options.enterM, options.exitM);
  const target: 0 | 1 = state.inside && state.ready ? 1 : 0;
  if (target !== state.target) { state.target = target; state.swaps++; }
  state.progress = advanceHandoff(state.progress, target, dtS, options.fadeS);
  state.rig = handoffRigWeight(state.progress);
  state.proxy = 1 - state.rig;
  return state;
}
