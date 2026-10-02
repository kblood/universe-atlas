/**
 * Eye geometry for the modular creature composer (fauna-composer-eye-1; face round WP4).
 *
 * Pure: plain number arrays, no rendering library, no randomness, no clock, so every function here can be
 * unit-tested in node. Erasable TypeScript only (Node type-strips src/*.ts). The mesh glue
 * (fauna-composer-mesh.ts) places, colours and skins what these functions return.
 *
 * All coordinates are head-local (x forward along the head bone, y up, z lateral), in metres.
 *
 * - raycastFirstHit / raycastLine / nearestExit: ray and line queries against a triangle soup (9 numbers per
 *   triangle, outward winding), used to seat an eye on the already-built skull.
 * - buildEyePatch: a lidded vertebrate eye, a 20-segment ring patch: pupil (round, horizontal bar or vertical slit),
 *   iris, limbus, an almond lid opening, a raised outer lid and an orbit ring that lies on the skull surface. A cone
 *   behind it closes the patch, so the eye part is a closed outward surface like every other part.
 * - buildCompoundEye: an arthropod compound-eye dome (12 x 5) with a facet checker and a dark pseudopupil at its apex.
 * - buildEyespot: a worm's flush pigment eyespot (8 triangles).
 */

export const COMPOSER_EYE_VERSION = 'fauna-composer-eye-1';
export type Vec3 = [number, number, number];
export type LiddedEyeType = 'round' | 'horizontal' | 'vertical-slit';

/** Per-vertex roles. The mesh glue colours by role; gloss is per role too. Append-only. */
export const EYE_ROLES = ['pupil', 'iris-inner', 'iris', 'limbus', 'lid', 'outer-lid', 'orbit', 'socket', 'facet-a', 'facet-b', 'pseudopupil', 'eyespot'] as const;
export type EyeRole = typeof EYE_ROLES[number];
export const EYE_ROLE: Readonly<Record<EyeRole, number>> = Object.freeze(Object.fromEntries(EYE_ROLES.map((r, i) => [r, i])) as Record<EyeRole, number>);

/** Lidded-eye layout, in units of the eye radius er (radii in the eye plane, lifts along the gaze). */
export const EYE_PATCH = Object.freeze({
  segments: 20,
  /** pupil edge radius (round); the bar and slit use their own half-axes below */
  pupil: 0.34, pupilInnerScale: 1.06, iris: 0.65, limbus: 0.92,
  horizontalPupil: {rx: 0.55, ry: 0.16, n: 4},
  slitPupil: {rx: 0.08, ry: 0.46, point: 0.6},
  /** vertical slit: the iris fills this fraction of the opening */
  slitIrisFill: 0.95, slitIrisInner: 0.85,
  /** lid opening (almond): half-width, half-height above and below */
  lid: {w: 1, above: 0.72, below: 0.62},
  outerLid: {w: 1.2, above: 0.95, below: 0.85},
  orbit: {w: 1.55, above: 1.35, below: 1.25},
  /** inner rings are clipped to these fractions of the lid opening (pupil edge, inner iris, iris, limbus) */
  clip: [0.8, 0.84, 0.9, 0.98] as readonly number[],
  /** eye centre below the skull surface; every ring's lift above the skin under it: the eyeball (+ the cornea dome toward
   * the centre), the lid margin, the outer lid (at most outerLidDrop below the margin) and the orbit */
  recess: 0.2, eyeLift: 0.06, corneaLift: 0.30, lidLift: 0.12, outerLidLift: 0.08, outerLidDrop: 0.06, orbitLift: 0.01,
  /** a rim vertex looks for the skull surface within this distance of the hit plane */
  rimSearch: 1.0,
  /** a rim vertex whose line misses takes the depth of the closest skull point within this distance */
  closestSearch: 2.5,
  /** the closing cone's apex behind the eye centre */
  socketDepth: 0.8,
});
export const EYE_GLOSS = Object.freeze({cornea: 1, lid: 0.4, compound: 0.35});
/** Compound eye dome: radial segments x stations (apex excluded); facet shading amplitude. */
export const COMPOUND_EYE = Object.freeze({segments: 12, stations: 5, facet: 0.08});
export const EYESPOT_SEGMENTS = 8;

export interface RayHit {
  /** Distance along `dir` (negative behind the origin for line queries). */
  t: number; point: Vec3;
  /** Unit geometric normal of the hit triangle (its winding). */
  normal: Vec3;
  /** Triangle index and barycentric weights of vertices b and c (a gets 1 - u - v). */
  tri: number; u: number; v: number;
}
export interface EyePatch {
  /** xyz per vertex, head-local */
  positions: number[];
  roles: Uint8Array;
  gloss: number[];
  /** three vertex indices per triangle, outward winding */
  index: number[];
  /** Per vertex: the skull-surface hit a rim vertex was projected onto (lid, outer lid and orbit rings), else null. */
  surface: (RayHit | null)[];
  /** Vertices that found no skull surface (neither along the gaze nor within EYE_PATCH.closestSearch) and kept the hit plane. */
  rimFallbacks: number;
  /** First vertex of each ring (centre first), for measurement. */
  rings: number[];
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const addS = (a: Vec3, b: Vec3, k: number): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
export const normalize3 = (a: Vec3): Vec3 => { const l = Math.hypot(a[0], a[1], a[2]); return l > 1e-15 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0]; };

type Tris = ArrayLike<number>;
/** Every crossing of the full line origin + t dir (t of either sign), sorted by t. Shared edges may report twice. */
export function raycastLine(tris: Tris, origin: Vec3, dir: Vec3): RayHit[] {
  const out: RayHit[] = [];
  const [ox, oy, oz] = origin, [dx, dy, dz] = dir;
  for (let i = 0, n = Math.floor(tris.length / 9); i < n; i++) {
    const o = i * 9, ax = tris[o]!, ay = tris[o + 1]!, az = tris[o + 2]!;
    const e1x = tris[o + 3]! - ax, e1y = tris[o + 4]! - ay, e1z = tris[o + 5]! - az, e2x = tris[o + 6]! - ax, e2y = tris[o + 7]! - ay, e2z = tris[o + 8]! - az;
    const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x, det = e1x * px + e1y * py + e1z * pz;
    if (Math.abs(det) < 1e-18) continue;
    const inv = 1 / det, tx = ox - ax, ty = oy - ay, tz = oz - az, u = (tx * px + ty * py + tz * pz) * inv;
    if (u < -1e-9 || u > 1 + 1e-9) continue;
    const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x, v = (dx * qx + dy * qy + dz * qz) * inv;
    if (v < -1e-9 || u + v > 1 + 1e-9) continue;
    const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
    const normal = normalize3([e1y * e2z - e1z * e2y, e1z * e2x - e1x * e2z, e1x * e2y - e1y * e2x]);
    out.push({t, point: [ox + dx * t, oy + dy * t, oz + dz * t], normal, tri: i, u, v});
  }
  return out.sort((a, b) => a.t - b.t);
}
/** First hit in front of the origin (t > 1e-9), or null. */
export function raycastFirstHit(tris: Tris, origin: Vec3, dir: Vec3): RayHit | null {
  for (const h of raycastLine(tris, origin, dir)) if (h.t > 1e-9) return h;
  return null;
}
/** The exit crossing (normal along dir) of the line through `point` that lies nearest to it, within |t| <= maxAbsT.
 * Choosing the crossing nearest the intended site, rather than the first hit of a ray, keeps a brow, beak or ear
 * that the line passes through from capturing the eye. */
export function nearestExit(tris: Tris, point: Vec3, dir: Vec3, maxAbsT = Infinity): RayHit | null {
  let best: RayHit | null = null;
  for (const h of raycastLine(tris, point, dir)) if (dot(h.normal, dir) > 0 && Math.abs(h.t) <= maxAbsT && (!best || Math.abs(h.t) < Math.abs(best.t))) best = h;
  return best;
}

/** The closest point of a triangle soup to `p` (Ericson's region test per triangle), with its triangle, barycentric
 * weights and geometric normal; t is 0 (the caller measures depth). */
export function closestPointOnSoup(tris: Tris, p: Vec3): RayHit | null {
  let best: RayHit | null = null, bestD = Infinity;
  for (let i = 0, n = Math.floor(tris.length / 9); i < n; i++) {
    const o = i * 9, A: Vec3 = [tris[o]!, tris[o + 1]!, tris[o + 2]!], B: Vec3 = [tris[o + 3]!, tris[o + 4]!, tris[o + 5]!], C: Vec3 = [tris[o + 6]!, tris[o + 7]!, tris[o + 8]!];
    const [u, v] = closestBary(A, B, C, p), q: Vec3 = [A[0] + (B[0] - A[0]) * u + (C[0] - A[0]) * v, A[1] + (B[1] - A[1]) * u + (C[1] - A[1]) * v, A[2] + (B[2] - A[2]) * u + (C[2] - A[2]) * v];
    const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2;
    if (d < bestD) { bestD = d; best = {t: 0, point: q, normal: normalize3(cross(sub(B, A), sub(C, A))), tri: i, u, v}; }
  }
  return best;
}
/** Barycentric (u for B, v for C) of the closest point of triangle ABC to p. */
function closestBary(a: Vec3, b: Vec3, c: Vec3, p: Vec3): [number, number] {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a), d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return [0, 0];
  const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return [1, 0];
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return [d1 / (d1 - d3), 0];
  const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return [0, 1];
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return [0, d2 / (d2 - d6)];
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return [1 - w, w]; }
  const den = 1 / (va + vb + vc);
  return [vb * den, vc * den];
}

/** The outermost exit crossing (largest t, normal along dir) of the line through `point` within |t| <= maxAbsT. A ring
 * vertex is seated on it so that no overlapping skull surface (a jaw loft, a cheek) lies outside the eye and hides it. */
export function outermostExit(tris: Tris, point: Vec3, dir: Vec3, maxAbsT: number): RayHit | null {
  let best: RayHit | null = null;
  for (const h of raycastLine(tris, point, dir)) if (dot(h.normal, dir) > 0 && Math.abs(h.t) <= maxAbsT && (!best || h.t > best.t)) best = h;
  return best;
}

/** Unit gaze from a yaw (degrees from the forward midline toward `side`) and a pitch (degrees up), head-local. */
export function eyeGaze(yawDeg: number, pitchDeg: number, side: number): Vec3 {
  const y = yawDeg * Math.PI / 180, p = pitchDeg * Math.PI / 180;
  return [Math.cos(p) * Math.cos(y), Math.sin(p), side * Math.cos(p) * Math.sin(y)];
}
/** In-plane axis of the eye (the pupil bar and the lid opening's long axis): the head-forward projection onto the eye
 * plane blended 0.7 toward the world-horizontal projection, which counter-rolls the rest head pitch. `worldUp` is the
 * world up direction in head-local coordinates. Signed so that gaze x axis points up. */
export function eyeBarAxis(gaze: Vec3, worldUp: Vec3, headForward: Vec3 = [1, 0, 0]): Vec3 {
  const g = normalize3(gaze);
  const proj = (v: Vec3) => addS(v, g, -dot(v, g));
  let hw = cross(worldUp, g);
  if (Math.hypot(...hw) < 1e-6) hw = proj([1, 0, 0]);
  hw = normalize3(hw);
  const hf = proj(headForward), hfl = Math.hypot(...hf);
  let axis = hw;
  if (hfl > 0.2) {
    const hfn = scale(hf, 1 / hfl), s = dot(hfn, hw) < 0 ? -1 : 1;
    axis = normalize3(addS(scale(hfn, 0.3), hw, 0.7 * s));
  }
  // in-plane up = gaze x axis; flip the axis so that up is up (lid above, lid below)
  if (dot(cross(g, axis), worldUp) < 0) axis = scale(axis, -1);
  return axis;
}

/** Almond lid opening: in-plane point at angle th (radians) for half-width w and half-heights above/below. */
export function lidPoint(th: number, w: number, above: number, below: number): [number, number] {
  const c = Math.cos(th), s = Math.sin(th);
  return [w * c, (s >= 0 ? above : below) * s * (1 - 0.25 * c * c)];
}
/** Pupil edge in-plane point at angle th, in er. */
export function pupilPoint(type: LiddedEyeType, th: number): [number, number] {
  const c = Math.cos(th), s = Math.sin(th), E = EYE_PATCH;
  if (type === 'horizontal') { const e = 2 / E.horizontalPupil.n; return [E.horizontalPupil.rx * Math.sign(c) * Math.abs(c) ** e, E.horizontalPupil.ry * Math.sign(s) * Math.abs(s) ** e]; }
  if (type === 'vertical-slit') return [E.slitPupil.rx * c * Math.abs(c) ** E.slitPupil.point, E.slitPupil.ry * s];
  return [E.pupil * c, E.pupil * s];
}

export interface EyePatchOptions {
  type: LiddedEyeType;
  /** eye radius, metres */
  er: number;
  /** eye centre (recess below the skull surface), head-local */
  centre: Vec3;
  gaze: Vec3;
  /** in-plane long axis (eyeBarAxis); default: from `up` */
  barAxis?: Vec3;
  /** head-local up, used when barAxis is omitted */
  up?: Vec3;
  /** head triangles (9 numbers each) the lid and orbit rings are projected onto; omitted: the hit plane */
  surface?: Tris;
}
/** A lidded vertebrate eye. 141 front vertices (centre + 7 rings of 20) + a 21-vertex closing cone; 280 triangles. */
export function buildEyePatch(o: EyePatchOptions): EyePatch {
  const E = EYE_PATCH, N = E.segments, er = o.er, g = normalize3(o.gaze), c0 = o.centre;
  const a = o.barAxis ? normalize3(addS(o.barAxis, g, -dot(o.barAxis, g))) : eyeBarAxis(g, o.up ?? [0, 1, 0]);
  const b = cross(g, a);
  const positions: number[] = [], roles: number[] = [], gloss: number[] = [], index: number[] = [], surface: (RayHit | null)[] = [], rings: number[] = [];
  let rimFallbacks = 0;
  const at = (x: number, y: number, z: number): Vec3 => [c0[0] + (a[0] * x + b[0] * y + g[0] * z) * er, c0[1] + (a[1] * x + b[1] * y + g[1] * z) * er, c0[2] + (a[2] * x + b[2] * y + g[2] * z) * er];
  const push = (p: Vec3, role: EyeRole, gl: number, hit: RayHit | null = null) => { positions.push(p[0], p[1], p[2]); roles.push(EYE_ROLE[role]); gloss.push(gl); surface.push(hit); return positions.length / 3 - 1; };
  const lift = (x: number, y: number) => { const rho = Math.min(1, Math.hypot(x, y) / E.limbus); return E.corneaLift * (1 - rho * rho); };
  /** the almond's vertical extent at in-plane x (inner rings are clipped to a fraction of it) */
  const lidY = (x: number, upper: boolean) => { const c = Math.max(-1, Math.min(1, x / E.lid.w)), s = Math.sqrt(1 - c * c); return (upper ? E.lid.above : E.lid.below) * s * (1 - 0.25 * c * c); };
  const clipY = (x: number, y: number, k: number) => { const lim = k * lidY(x, y >= 0); return Math.sign(y) * Math.min(Math.abs(y), lim); };
  const th = (k: number) => 2 * Math.PI * k / N;

  // every ring is seated on the skull surface found along the gaze (the head skin is not cut: the eye lies on it)
  const surfaceZ = (x: number, y: number): [number, RayHit | null] => {
    if (o.surface) {
      const p = at(x, y, E.recess), hit = outermostExit(o.surface, p, g, E.rimSearch * er);
      if (hit) return [E.recess + hit.t / er, hit];
      // the line misses (the rim overhangs the skull's edge): the closest skull point sets the rim's depth
      const near = closestPointOnSoup(o.surface, p);
      if (near && Math.hypot(...sub(near.point, p)) <= E.closestSearch * er) { const t = dot(sub(near.point, p), g); return [E.recess + t / er, {...near, t}]; }
    }
    rimFallbacks += o.surface ? 1 : 0;
    return [E.recess, null];
  };
  // centre and inner rings (pupil edge, inner iris, iris, limbus): one smooth cornea dome, raised so that it clears the
  // skin under every one of its vertices by eyeLift (a per-vertex seat would crumple the dome over a skull crease)
  const slit = o.type === 'vertical-slit';
  const inner: [EyeRole, (t: number) => [number, number], number][] = [
    ['pupil', t => pupilPoint(o.type, t), E.clip[0]!],
    ['iris-inner', t => { const [x, y] = pupilPoint(o.type, t); return [x * E.pupilInnerScale, y * E.pupilInnerScale]; }, E.clip[1]!],
    ['iris', t => slit ? scale2(lidPoint(t, E.lid.w, E.lid.above, E.lid.below), E.slitIrisInner) : [E.iris * Math.cos(t), E.iris * Math.sin(t)], E.clip[2]!],
    ['limbus', t => slit ? scale2(lidPoint(t, E.lid.w, E.lid.above, E.lid.below), E.slitIrisFill) : [E.limbus * Math.cos(t), E.limbus * Math.sin(t)], E.clip[3]!],
  ];
  const dome: {x: number; y: number; role: EyeRole; hit: RayHit | null}[] = [];
  let base = -Infinity;
  const seat = (x: number, y: number, role: EyeRole) => { const [sz, hit] = surfaceZ(x, y); base = Math.max(base, sz - lift(x, y)); dome.push({x, y, role, hit}); };
  seat(0, 0, 'pupil');
  for (const [role, shape, k] of inner) for (let i = 0; i < N; i++) { const [x, y0] = shape(th(i)), y = clipY(x, y0, k); seat(x, y, role); }
  dome.forEach(({x, y, role, hit}, i) => { if (i % N === 1 || i === 0) rings.push(positions.length / 3); push(at(x, y, base + E.eyeLift + lift(x, y)), role, EYE_GLOSS.cornea, hit); });
  const lidZ: number[] = [];
  rings.push(positions.length / 3);
  for (let i = 0; i < N; i++) { const [x, y] = lidPoint(th(i), E.lid.w, E.lid.above, E.lid.below), [sz, hit] = surfaceZ(x, y), z = sz + E.lidLift; lidZ.push(z); push(at(x, y, z), 'lid', EYE_GLOSS.lid, hit); }
  rings.push(positions.length / 3);
  for (let i = 0; i < N; i++) { const [x, y] = lidPoint(th(i), E.outerLid.w, E.outerLid.above, E.outerLid.below), [sz, hit] = surfaceZ(x, y); push(at(x, y, Math.max(sz + E.outerLidLift, lidZ[i]! - E.outerLidDrop)), 'outer-lid', 0, hit); }
  rings.push(positions.length / 3);
  const orbit: Vec3[] = [];
  for (let i = 0; i < N; i++) { const [x, y] = lidPoint(th(i), E.orbit.w, E.orbit.above, E.orbit.below), [sz, hit] = surfaceZ(x, y), p = at(x, y, sz + E.orbitLift); orbit.push(p); push(p, 'orbit', 0, hit); }
  // front triangles: centre fan, then a band between consecutive rings (normals along +gaze)
  for (let i = 0; i < N; i++) index.push(0, 1 + i, 1 + (i + 1) % N);
  for (let r = 1; r + 1 < rings.length; r++) {
    const A = rings[r]!, B = rings[r + 1]!;
    for (let i = 0; i < N; i++) { const j = (i + 1) % N; index.push(A + i, B + i, B + j, A + i, B + j, A + j); }
  }
  // closing cone behind the eye: the orbit ring again (own vertices, so the front keeps its normals) and an apex
  const socket = positions.length / 3;
  rings.push(socket);
  for (const p of orbit) push(p, 'socket', 0);
  const apex = push(at(0, 0, -E.socketDepth), 'socket', 0);
  for (let i = 0; i < N; i++) index.push(apex, socket + (i + 1) % N, socket + i);
  return {positions, roles: Uint8Array.from(roles), gloss, index, surface, rimFallbacks, rings};
}
const scale2 = (p: [number, number], k: number): [number, number] => [p[0] * k, p[1] * k];

export interface CompoundEyeOptions {
  /** dome radii: in-plane along the long axis, in-plane up, and along the gaze (dome height) */
  er3: [number, number, number];
  /** centre of the dome's base, head-local */
  centre: Vec3;
  gaze: Vec3;
  up: Vec3;
}
/** Arthropod compound eye: a closed half-ellipsoid dome on its base, 12 segments x 5 stations plus an apex (the dark
 * pseudopupil) and a base centre. 120 triangles. Facet roles alternate per station and segment (checker). */
export function buildCompoundEye(o: CompoundEyeOptions): EyePatch {
  const {segments: S, stations: M} = COMPOUND_EYE, g = normalize3(o.gaze);
  const a = normalize3(cross(o.up, g)), b = cross(g, a), [ra, rb, rg] = o.er3, c0 = o.centre;
  const positions: number[] = [], roles: number[] = [], gloss: number[] = [], index: number[] = [], rings: number[] = [];
  const push = (p: Vec3, role: EyeRole) => { positions.push(p[0], p[1], p[2]); roles.push(EYE_ROLE[role]); gloss.push(EYE_GLOSS.compound); return positions.length / 3 - 1; };
  const at = (x: number, y: number, z: number): Vec3 => [c0[0] + a[0] * x + b[0] * y + g[0] * z, c0[1] + a[1] * x + b[1] * y + g[1] * z, c0[2] + a[2] * x + b[2] * y + g[2] * z];
  rings.push(push(at(0, 0, rg), 'pseudopupil'));
  for (let j = 1; j <= M; j++) {
    rings.push(positions.length / 3);
    const phi = (j / M) * Math.PI / 2, sp = Math.sin(phi), cp = Math.cos(phi);
    for (let k = 0; k < S; k++) { const t = 2 * Math.PI * k / S; push(at(ra * sp * Math.cos(t), rb * sp * Math.sin(t), rg * cp), (j + k) % 2 ? 'facet-b' : 'facet-a'); }
  }
  const base = positions.length / 3;
  rings.push(base);
  positions.push(c0[0], c0[1], c0[2]); roles.push(EYE_ROLE.socket); gloss.push(0);
  for (let k = 0; k < S; k++) index.push(0, 1 + k, 1 + (k + 1) % S);
  for (let j = 1; j < M; j++) {
    const A = 1 + (j - 1) * S, B = 1 + j * S;
    for (let k = 0; k < S; k++) { const l = (k + 1) % S; index.push(A + k, B + k, B + l, A + k, B + l, A + l); }
  }
  const last = 1 + (M - 1) * S;
  for (let k = 0; k < S; k++) index.push(base, last + (k + 1) % S, last + k);
  return {positions, roles: Uint8Array.from(roles), gloss, index, surface: roles.map(() => null), rimFallbacks: 0, rings};
}

export interface EyespotOptions {
  /** disc radius, metres */
  r: number;
  /** disc centre, head-local */
  centre: Vec3;
  /** disc normal (outward) */
  normal: Vec3;
  up: Vec3;
  /** per-rim-vertex lift along the normal (to sit flush on a curved cap); default 0 */
  rimLift?: (k: number, p: Vec3) => number;
}
/** A worm's pigment eyespot: a flat disc of 8 segments (centre + 8 rim vertices, 8 triangles), gloss 0. */
export function buildEyespot(o: EyespotOptions): EyePatch {
  const n = normalize3(o.normal), a = normalize3(cross(o.up, n)), b = cross(n, a), S = EYESPOT_SEGMENTS;
  const positions: number[] = [...o.centre], index: number[] = [];
  for (let k = 0; k < S; k++) {
    const t = 2 * Math.PI * k / S, p: Vec3 = [o.centre[0] + (a[0] * Math.cos(t) + b[0] * Math.sin(t)) * o.r, o.centre[1] + (a[1] * Math.cos(t) + b[1] * Math.sin(t)) * o.r, o.centre[2] + (a[2] * Math.cos(t) + b[2] * Math.sin(t)) * o.r];
    const l = o.rimLift ? o.rimLift(k, p) : 0;
    positions.push(p[0] + n[0] * l, p[1] + n[1] * l, p[2] + n[2] * l);
  }
  for (let k = 0; k < S; k++) index.push(0, 1 + k, 1 + (k + 1) % S);
  return {positions, roles: new Uint8Array(S + 1).fill(EYE_ROLE.eyespot), gloss: new Array(S + 1).fill(0), index, surface: new Array(S + 1).fill(null), rimFallbacks: 0, rings: [0, 1]};
}

/** Newell normal of a closed polygon (vertex ids into an xyz array): the plane normal of a ring, exact for planar or
 * mirror-symmetric rings. */
export function ringNormal(positions: ArrayLike<number>, ids: readonly number[]): Vec3 {
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < ids.length; i++) {
    const p = ids[i]! * 3, q = ids[(i + 1) % ids.length]! * 3;
    const px = positions[p]!, py = positions[p + 1]!, pz = positions[p + 2]!, qx = positions[q]!, qy = positions[q + 1]!, qz = positions[q + 2]!;
    nx += (py - qy) * (pz + qz); ny += (pz - qz) * (px + qx); nz += (px - qx) * (py + qy);
  }
  return normalize3([nx, ny, nz]);
}
export {sub as eyeSub, dot as eyeDot, cross as eyeCross};
