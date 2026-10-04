/**
 * Landing-site rules (round 2 LANDING-FIXES, backlog task 4).
 *
 * Pure arithmetic over caller-supplied samplers: no THREE, no renderer, no
 * terrain import. main.ts `exploreTerrain` / `prepareLanding` and the Node
 * tests run exactly these functions, so a test result is the app's rule.
 *
 * 1. No summit. The owner kept the landing ceiling formula (80% of the body
 *    height bound, `planet-renderer.ts landingCeilingM`). On the relief
 *    terrain that ceiling lies above p99 land on every fixture world, so it
 *    alone does not exclude summits. A site must ALSO lie strictly below the
 *    summit height: the LANDING_SUMMIT_PERCENTILE quantile of land at the
 *    dated sea (the same "summit" definition the render-bounds tests use).
 *    The ceiling is unchanged; the summit cap only removes sites.
 *
 * 2. Flooded ground bookmark. A `?walk=` bookmark stores a direction. When the
 *    ground there is now under water (the relief re-pin and the surface-8 sea
 *    moved the coast), FLOODED_GROUND_BOOKMARK decides what happens. The owner
 *    has not answered (owner-decisions task 1); the default keeps the saved
 *    place and hovers above the water, because the relief notice promises
 *    "This place is the same location". 'nearest-shore' is implemented and
 *    tested so the owner can switch by changing one constant.
 */
export const LANDING_SITE_VERSION = 'landing-site-1';

/** "Summit" = at or above this quantile of land at the dated sea. */
export const LANDING_SUMMIT_PERCENTILE = .99;

export type FloodedBookmarkPolicy = 'hover' | 'nearest-shore';
/** OPEN owner item (relief round item 12). Default: keep the place, hover. */
export const FLOODED_GROUND_BOOKMARK: FloodedBookmarkPolicy = 'hover';
/** Eye height over the visible water surface for a hovering flooded bookmark.
 * Above the largest drawn wave (planet-renderer RENDER_WAVE_BOUND_M is a few
 * metres) and inside the 2 km ocean surface band, so the waves stream. */
export const FLOODED_BOOKMARK_HOVER_M = 40;
/** Nearest-shore search: rings of this angular step (as ground metres) out to
 * the maximum, SHORE_RING_DIRECTIONS directions per ring. Past the maximum the
 * bookmark hovers. */
export const SHORE_SEARCH_STEP_M = 500;
export const SHORE_SEARCH_MAX_M = 60_000;
export const SHORE_RING_DIRECTIONS = 32;

type V3 = [number, number, number];

/** Whether a site of ground height `heightM` may be landed on: dry (at or
 * above the dated sea), not above the kept ceiling, and strictly below the
 * summit height. A NaN summit (a body with no land) caps nothing. */
export function landingHeightAllowed(heightM: number, seaLevelM: number, ceilingM: number, summitM: number): boolean {
  if (!(heightM >= seaLevelM) || heightM - seaLevelM > ceilingM) return false;
  return !(heightM >= summitM);
}

/** main.ts exploreTerrain's candidate direction `i` of `count` (a golden-angle
 * Fibonacci sphere). */
export function landingCandidate(i: number, count: number): V3 {
  const y = 1 - 2 * (i + .5) / count, phi = i * 2.399963229728653, r = Math.sqrt(1 - y * y);
  return [Math.cos(phi) * r, y, Math.sin(phi) * r];
}

export type LandingPickInput = {
  /** Ground height of candidate `d` (index `i`), or null when the site is not
   * walkable (wet, molten, no surface). */
  height: (d: V3, i: number) => number | null;
  eye: V3;
  /** Spin-compensated sun direction; omitted = no sun term (tests). */
  sun?: V3;
  seaLevelM: number;
  ceilingM: number;
  summitM: number;
  referenceM: number;
  count?: number;
};

/** The plain terrain-site pick (exploreTerrain without preferLife): near the
 * eye, sunward, with a small elevation bonus, never on a summit. */
export function pickLandingSite(o: LandingPickInput): {direction: V3; heightM: number; index: number} | null {
  const count = o.count ?? 384;
  let best = -Infinity, out: {direction: V3; heightM: number; index: number} | null = null;
  for (let i = 0; i < count; i++) {
    const d = landingCandidate(i, count), h = o.height(d, i);
    if (h === null || !landingHeightAllowed(h, o.seaLevelM, o.ceilingM, o.summitM)) continue;
    const sun = o.sun ? Math.max(-.5, d[0] * o.sun[0] + d[1] * o.sun[1] + d[2] * o.sun[2]) * .7 : 0;
    const score = (d[0] * o.eye[0] + d[1] * o.eye[1] + d[2] * o.eye[2]) * 2 + sun + Math.min(1, (h - o.seaLevelM) / o.referenceM) * .12;
    if (score > best) { best = score; out = {direction: d, heightM: h, index: i}; }
  }
  return out;
}

export type FloodedSample = {walkable: boolean; visibleHeightM: number};
export type FloodedResolution =
  | {kind: 'walk'; direction: V3}
  | {kind: 'hover'; direction: V3; eyeHeightM: number}
  | {kind: 'shore'; direction: V3; distanceM: number};

const unit = (v: V3): V3 => { const n = Math.hypot(v[0], v[1], v[2]); return [v[0] / n, v[1] / n, v[2] / n]; };

/** Resolve a restored ground bookmark at unit-ish `direction`. A walkable
 * site walks there; a flooded one follows `policy`. 'nearest-shore' walks
 * the rings outward and takes the first walkable direction (ring order, then
 * azimuth order: deterministic); with none inside SHORE_SEARCH_MAX_M it
 * hovers. A hover keeps the saved direction, FLOODED_BOOKMARK_HOVER_M over
 * the visible (water) surface. */
export function resolveGroundBookmark(direction: V3, sample: (d: V3) => FloodedSample, radiusM: number, policy: FloodedBookmarkPolicy = FLOODED_GROUND_BOOKMARK): FloodedResolution {
  const up = unit(direction), here = sample(up);
  if (here.walkable) return {kind: 'walk', direction: up};
  const hover: FloodedResolution = {kind: 'hover', direction: up, eyeHeightM: here.visibleHeightM + FLOODED_BOOKMARK_HOVER_M};
  if (policy === 'hover') return hover;
  const ref: V3 = Math.abs(up[1]) > .9 ? [1, 0, 0] : [0, 1, 0];
  const east = unit([ref[1] * up[2] - ref[2] * up[1], ref[2] * up[0] - ref[0] * up[2], ref[0] * up[1] - ref[1] * up[0]]);
  const north: V3 = [up[1] * east[2] - up[2] * east[1], up[2] * east[0] - up[0] * east[2], up[0] * east[1] - up[1] * east[0]];
  for (let m = SHORE_SEARCH_STEP_M; m <= SHORE_SEARCH_MAX_M; m += SHORE_SEARCH_STEP_M) {
    const a = m / radiusM, c = Math.cos(a), s = Math.sin(a);
    for (let k = 0; k < SHORE_RING_DIRECTIONS; k++) {
      const b = k / SHORE_RING_DIRECTIONS * 2 * Math.PI, cb = Math.cos(b), sb = Math.sin(b);
      const d: V3 = [0, 1, 2].map(j => up[j] * c + (east[j] * cb + north[j] * sb) * s) as V3;
      if (sample(d).walkable) return {kind: 'shore', direction: d, distanceM: m};
    }
  }
  return hover;
}
