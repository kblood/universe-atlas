/** Ocean VOLUME model: the dated sea level is the level at which the surviving
 * fraction of the catalogue-epoch ocean volume fills this body's own seabed.
 *
 * Why (relief round 2026-10, P2-OCEAN-QUERY): the previous model ramped the
 * sea level linearly in METRES (0 m at oceanNs -> -8000 m at giantNs). On the
 * shipped seabed that put Maithea's sea at about -4500 m at the catalogue
 * epoch, i.e. 61-68% of the ocean volume already lost, and on any reshaped
 * (shallower) seabed the same metre value empties the basins. Water loss is a
 * VOLUME process driven by stellar brightening (stellar-evolution.ts's
 * `waterKeysFor` authors the lost fraction over time); this module converts a
 * lost fraction into a level for one specific seabed.
 *
 * Model: `oceanHypsometry(body)` samples the body's ground height
 * (`terrainSampler(body).groundHeightM`, the same deterministic terrain
 * function the renderer, walker and seabed collision use) over
 * `HYPSOMETRY_SAMPLES` equal-area Fibonacci directions and sorts them. With
 * equal-area samples the ocean volume below level L is proportional to
 *   V(L) = sum_i max(0, L - h_i)
 * (spherical-shell curvature, (R+h)^2/R^2, is ignored: < 0.6% for a 16 km
 * deep basin on a 6000 km world). `levelForLoss(body, f)` solves
 * V(L) = (1 - f) * V(0) by a fixed 60-step bisection on [min h, 0]: exactly
 * 0 m at f = 0, monotone non-increasing in f, min h at f = 1.
 *
 * Height source: ground height (rock the water actually rests on). The plan
 * named the P1 regional FLOOR (falling back to elevation); on water worlds the
 * window above the floor is ~0 under the sea (terrain.ts landDetail), and the
 * acceptance figures (-4503 m for 67.8% on the shipped terrain; R-CAL-1
 * -171/-945/-1989/-3837 m) were measured on the total ground height, so
 * ground height is both the physical and the calibrated choice. It is also
 * identical to `elevationM` (terrain.ts terrainSampler) on today's tree.
 *
 * Determinism: the directions use det-math `sine`/`detCos`; everything that
 * feeds the level is + - * / sqrt floor min max on IEEE doubles, so the level
 * (an ocean-flag input) is bit-identical on every conformant engine.
 */
import type {Body, V3} from './catalog.ts';
import {terrainSampler, TERRAIN_VERSION} from './terrain.ts';
import {sine, detCos} from './det-math.ts';

export const OCEAN_VOLUME_VERSION = 'ocean-volume-1';
/** Equal-area Fibonacci samples per body (about 2 ms on the shipped terrain). */
export const HYPSOMETRY_SAMPLES = 4096;
/** Fixed bisection step count: interval 16 km / 2^60 is far below 1 ulp. */
export const LEVEL_BISECTION_STEPS = 60;

export type OceanHypsometry = {
  version: string;
  /** Ground heights (m) at the sample directions, sorted ascending. */
  heights: Float64Array;
  /** prefix[k] = heights[0] + ... + heights[k-1] (prefix[0] = 0). */
  prefix: Float64Array;
  /** Lowest sampled ground height (m); the level at total loss. */
  minHeightM: number;
  /** V(0) in sample-metres: sum of max(0, -h). 0 when nothing lies below 0. */
  fullVolume: number;
  /** Number of samples below 0 m (ocean area share at a full ocean). */
  belowZero: number;
};

const GOLDEN_ANGLE = 2.399963229728653;
/** Equal-area Fibonacci direction i of n (det-math trig, deterministic). */
export function fibonacciDirection(i: number, n: number): V3 {
  const y = 1 - 2 * (i + .5) / n, p = i * GOLDEN_ANGLE, r = Math.sqrt(Math.max(0, 1 - y * y));
  return [detCos(p) * r, y, sine(p) * r];
}

const cache = new Map<string, OceanHypsometry>();
const CACHE_LIMIT = 64;
/** Cache key: the terrain is a pure function of these body fields plus the
 * terrain version (body.seed carries the identity; radius/water/kind/type are
 * included so a derived fixture `{...body, water}` never aliases its parent). */
function hypsometryKey(body: Body): string {
  return [body.seed, TERRAIN_VERSION, OCEAN_VOLUME_VERSION, body.kind, body.type, body.radiusM, body.water].join('|');
}
export function clearOceanHypsometryCache() { cache.clear(); }

/** Sorted ground-height hypsometry of one body, built once per (seed, terrain version). */
export function oceanHypsometry(body: Body): OceanHypsometry {
  const key = hypsometryKey(body);
  const hit = cache.get(key);
  if (hit) return hit;
  const n = HYPSOMETRY_SAMPLES, heights = new Float64Array(n);
  const solid = body.kind !== 'star' && body.type !== 'Gas giant';
  if (solid) {
    const sample = terrainSampler(body);
    for (let i = 0; i < n; i++) heights[i] = sample(fibonacciDirection(i, n)).groundHeightM;
  }
  heights.sort();
  const prefix = new Float64Array(n + 1);
  let below = 0;
  for (let i = 0; i < n; i++) {
    prefix[i + 1] = prefix[i] + heights[i];
    if (heights[i] < 0) below = i + 1;
  }
  const result: OceanHypsometry = {
    version: OCEAN_VOLUME_VERSION, heights, prefix, minHeightM: heights[0],
    fullVolume: volumeBelow(heights, prefix, 0), belowZero: below,
  };
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  return result;
}

/** Number of sorted heights strictly below `level` (binary search). */
function countBelow(heights: Float64Array, level: number): number {
  let lo = 0, hi = heights.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (heights[mid] < level) lo = mid + 1; else hi = mid; }
  return lo;
}
/** V(L) = sum_i max(0, L - h_i) = k*L - (h_0 + ... + h_{k-1}), k = #{h_i < L}. */
function volumeBelow(heights: Float64Array, prefix: Float64Array, level: number): number {
  const k = countBelow(heights, level);
  return k * level - prefix[k];
}
/** Ocean volume (sample-metres) below `levelM` on this hypsometry. */
export function oceanVolumeAt(hyp: OceanHypsometry, levelM: number): number {
  return volumeBelow(hyp.heights, hyp.prefix, levelM);
}

/** Level (m) holding (1 - lossFraction) of the full (level 0) ocean volume.
 * f <= 0 -> exactly 0; f >= 1 -> the lowest sampled ground height; a body with
 * nothing below 0 m keeps 0 (no basin to drain). */
export function levelForLossOn(hyp: OceanHypsometry, lossFraction: number): number {
  if (!(lossFraction > 0) || hyp.fullVolume <= 0) return 0;
  if (lossFraction >= 1) return hyp.minHeightM;
  const target = (1 - lossFraction) * hyp.fullVolume;
  let lo = hyp.minHeightM, hi = 0;
  for (let k = 0; k < LEVEL_BISECTION_STEPS; k++) {
    const mid = (lo + hi) / 2;
    if (volumeBelow(hyp.heights, hyp.prefix, mid) > target) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

/** Dated sea level for a body from the ocean-volume loss fraction. */
export function levelForLoss(body: Body, lossFraction: number): number {
  return levelForLossOn(oceanHypsometry(body), lossFraction);
}

/** Inverse view: the volume fraction lost when the sea stands at `levelM`. */
export function lossForLevel(body: Body, levelM: number): number {
  const hyp = oceanHypsometry(body);
  if (hyp.fullVolume <= 0) return 0;
  return 1 - oceanVolumeAt(hyp, Math.min(0, levelM)) / hyp.fullVolume;
}

/** Hypsometry built from caller-supplied heights (any order). Used by tests
 * and planning scripts to run the same solver on a candidate seabed. */
export function hypsometryFromHeights(values: ArrayLike<number>): OceanHypsometry {
  const heights = Float64Array.from(values).sort(), n = heights.length, prefix = new Float64Array(n + 1);
  let below = 0;
  for (let i = 0; i < n; i++) { prefix[i + 1] = prefix[i] + heights[i]; if (heights[i] < 0) below = i + 1; }
  return {version: OCEAN_VOLUME_VERSION, heights, prefix, minHeightM: n ? heights[0] : 0,
    fullVolume: n ? volumeBelow(heights, prefix, 0) : 0, belowZero: below};
}
