import * as THREE from 'three';
import {composerHash, composerRandom, type ComposerRecipe} from './fauna-composer-recipe.ts';
import {COAT_REGIONS, type CoatRegion} from './fauna-coat-vocab.ts';
import {COAT_CELLS_PER_BODY, applyCoatDrift, coatIndividualDrift, defaultCoatGenome, evaluateCoat, hash3u, valueNoise3, type CoatGenome} from './fauna-coat-fields.ts';
import {composerIndividualTraits, type ComposerIndividualTraits} from './fauna-composer-individual.ts';
import {composerFeatherFanSpan, composerWingChord, composerWingThickness, type ComposerBone, type ComposerGraph, type ComposerLimb, type ComposerSection, type Vec3} from './fauna-composer-rig.ts';

/** Procedural, experimental skin for a composer graph. Every visible part is
 * real geometry skinned to explicit bones: chain tubes follow centripetal
 * Catmull-Rom centrelines through the joints, limb roots blend out of the body
 * through weighted transition rings, the neck blends into the head through
 * weighted rings in the head frame, and rigid parts (beaks, horns, feet, hands,
 * shells, plates, feathers) carry full weight on their bone. Vertex colours come
 * from the shared fauna coat library (fauna-coat-1), sampled at each vertex's
 * true 3D position. Output is plain arrays so it can be inspected in tests. */
export const COMPOSER_SKIN_VERSION = 'fauna-composer-skin-2';
export type ComposerSkinPart = 'torso' | 'neck' | 'tail' | 'head' | 'eyes' | 'mouth' | 'horn' | 'trunk' | 'leg' | 'foot' | 'arm' | 'hand' | 'wing' | 'armor' | 'tail-tip';

/** Radial segments and rings per bone of the lofted tubes (feet and toes keep their own tessellation). */
export const COMPOSER_SKIN_TESSELLATION = Object.freeze({
  torsoRadial: 28, torsoRadialBanded: 22, torsoRings: 7, torsoRingsAnnulated: 9, neckRings: 6, tailRings: 6,
  legRadial: 16, legRadialArthropod: 9, legRings: 6, legRingsArthropod: 3, armRadial: 14, armRings: 4,
  eyeRadial: 8, eyeStations: 4, rootRings: 4,
});
/** Region code for vertices that carry no coat region. */
export const COMPOSER_SKIN_NO_REGION = 255;

/** One lofted ring of a chain tube (bind space), reported when `debug` is requested. */
export interface ComposerSkinRing {
  /** 'axial' (tail tip -> torso -> neck -> head blend), 'leg <n><L|R>', 'arm <L|R>' or 'trunk'. */
  chain: string;
  /** 'bone': regular ring; 'joint': the extra rings at +-12% around an interior joint; 'blend': neck-to-head;
   * 'root': limb-root transition ring (the last one is the first limb ring). */
  kind: 'bone' | 'joint' | 'blend' | 'root';
  bone: number; part: string; f: number;
  centre: Vec3; tangent: Vec3; rx: number; ry: number; ryBelow: number;
  weights: [number, number][];
  region: CoatRegion;
}
export interface ComposerSkinDebug {
  rings: ComposerSkinRing[];
  /** Interior joints whose spline overshot and fell back to the polyline. */
  splineFallbacks: number;
  coat: {
    pattern: string; requestedScale: number; effectiveScale: number; cellsPerBody: number;
    /** Mean pattern cell diameter in metres (Infinity for patterns without cells). */
    meanCellDiameter: number;
    /** Torso median edge estimated from the torso rings before colouring (metres). */
    torsoEdgeEstimate: number;
  };
  traitsNeutral: boolean;
}
export interface ComposerSkin {
  version: typeof COMPOSER_SKIN_VERSION;
  positions: Float32Array; normals?: undefined; colors: Float32Array; skinIndex: Uint16Array; skinWeight: Float32Array; index: Uint32Array;
  /** Coat region per vertex: an index into COAT_REGIONS, or COMPOSER_SKIN_NO_REGION. */
  regions: Uint8Array;
  /** Triangle ranges per anatomical part (start/count in triangles). */
  parts: {part: ComposerSkinPart; label: string; firstTriangle: number; triangles: number; bones: number[]}[];
  vertexCount: number; triangleCount: number;
  debug?: ComposerSkinDebug;
}
export interface ComposerSkinOptions {
  /** Individual traits to build with (default composerIndividualTraits(graph.recipe)). */
  traits?: ComposerIndividualTraits;
  /** Report ring centrelines, spline fallbacks and coat scale in `debug`. */
  debug?: boolean;
}
type RGB = [number, number, number];
type W = [number, number][];
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (lo: number, hi: number, v: number) => { const t = clamp((v - lo) / (hi - lo), 0, 1); return t * t * (3 - 2 * t); };
const gauss = (x: number, m: number, sigma: number) => Math.exp(-0.5 * ((x - m) / sigma) ** 2);
const mixC = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const scaleC = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
const TAU = Math.PI * 2;
const REGION = Object.fromEntries(COAT_REGIONS.map((name, i) => [name, i])) as Record<CoatRegion, number>;
const vec = (v: THREE.Vector3): Vec3 => [v.x, v.y, v.z];

class Skin {
  // growable typed buffers; positions stay double precision until the final Float32 copy
  p = new Float64Array(3 * 4096); c = new Float32Array(3 * 4096); si = new Uint16Array(4 * 4096); sw = new Float32Array(4 * 4096); rg = new Uint8Array(4096); ix = new Uint32Array(3 * 8192);
  /** Vertex and index counts. */
  nv = 0; ni = 0;
  /** Coat region written for vertices that do not name their own. */
  region = COMPOSER_SKIN_NO_REGION;
  parts: ComposerSkin['parts'] = [];
  private current: ComposerSkin['parts'][number] | undefined;
  begin(part: ComposerSkinPart, label: string) { this.end(); this.lastW = undefined; this.current = {part, label, firstTriangle: this.ni / 3, triangles: 0, bones: []}; }
  end() { if (this.current) { this.current.triangles = this.ni / 3 - this.current.firstTriangle; if (this.current.triangles > 0) this.parts.push(this.current); this.current = undefined; } }
  /** Normalised top-4 influences, prepared once per weight list (rings share one list for all their vertices). */
  private prepared = new WeakMap<W, number[]>();
  private lastW: W | undefined;
  private lastPrep: number[] = [];
  private grow() {
    const cap = this.rg.length * 2, g = <A extends Float64Array | Float32Array | Uint16Array | Uint8Array>(src: A, n: number): A => { const out = new (src.constructor as new (n: number) => A)(n); out.set(src); return out; };
    this.p = g(this.p, cap * 3); this.c = g(this.c, cap * 3); this.si = g(this.si, cap * 4); this.sw = g(this.sw, cap * 4); this.rg = g(this.rg, cap);
  }
  v(pos: THREE.Vector3, col: RGB, w: W, region = this.region): number {
    let prep = w === this.lastW ? this.lastPrep : this.prepared.get(w);
    if (!prep) {
      const list = w.filter(([, x]) => x > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
      const total = list.reduce((a, [, x]) => a + x, 0) || 1;
      prep = [];
      for (let k = 0; k < 4; k++) prep.push(list[k]?.[0] ?? 0, list[k] ? list[k]![1] / total : 0, list[k] ? 1 : 0);
      this.prepared.set(w, prep);
    }
    if (w !== this.lastW) {
      this.lastW = w; this.lastPrep = prep;
      if (this.current) for (let k = 0; k < 4; k++) if (prep[k * 3 + 2] && !this.current.bones.includes(prep[k * 3]!)) this.current.bones.push(prep[k * 3]!);
    }
    if (this.nv >= this.rg.length) this.grow();
    const i = this.nv++;
    for (let k = 0; k < 4; k++) { this.si[i * 4 + k] = prep[k * 3]!; this.sw[i * 4 + k] = prep[k * 3 + 1]!; }
    this.p[i * 3] = pos.x; this.p[i * 3 + 1] = pos.y; this.p[i * 3 + 2] = pos.z;
    this.c[i * 3] = clamp(col[0], 0, 1); this.c[i * 3 + 1] = clamp(col[1], 0, 1); this.c[i * 3 + 2] = clamp(col[2], 0, 1);
    this.rg[i] = region;
    return i;
  }
  t(a: number, b: number, c: number) {
    if (this.ni + 3 > this.ix.length) { const out = new Uint32Array(this.ix.length * 2); out.set(this.ix); this.ix = out; }
    this.ix[this.ni++] = a; this.ix[this.ni++] = b; this.ix[this.ni++] = c;
  }
  pos(i: number) { return V(this.p[i * 3], this.p[i * 3 + 1], this.p[i * 3 + 2]); }
  /** Triangle with winding chosen so its normal faces `out`. */
  to(a: number, b: number, c: number, out: THREE.Vector3) {
    const pa = this.pos(a), n = V().crossVectors(this.pos(b).sub(pa), this.pos(c).sub(pa));
    if (n.dot(out) >= 0) this.t(a, b, c); else this.t(a, c, b);
  }
}

interface Ring {
  c: THREE.Vector3; t: THREE.Vector3; u: THREE.Vector3; rx: number; ry: number; w: W;
  /** Colour at ring angle `a` for the final vertex position `p`. */
  color: (a: number, p: THREE.Vector3) => RGB;
  /** lower half radius (default ry) */ ryBelow?: number;
  /** Superellipse exponent (2 = ellipse). */ n?: number;
  /** Additive [lateral, dorsal] radius at angle a (dorsal only applies to the upper half). */
  lobe?: (a: number) => [number, number];
  /** In-plane flattening: direction (perpendicular to t) and fraction removed along it. */
  squash?: [THREE.Vector3, number];
  region?: number;
}
/** Lofts closed rings; caps are rounded. Winding is outward when the
 * ring basis (v = u x t, u, t) is right-handed, which this function enforces. */
type RingBasis = {t: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3};
const ringBasis = (r: Ring): RingBasis => { const t = r.t.clone().normalize(); let u = r.u.clone().addScaledVector(t, -r.u.dot(t)); if (u.lengthSq() < 1e-10) u = Math.abs(t.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0), u.addScaledVector(t, -u.dot(t)); u.normalize(); return {t, u, v: V().crossVectors(u, t)}; };
/** Position of a ring's vertex at angle `a` (superellipse section, lobes, squash), exactly as `loft` emits it. */
function ringPoint(r: Ring, b: RingBasis, a: number, out: THREE.Vector3, scale = 1, shift = 0) {
  const {t, u, v} = b, e = 2 / (r.n ?? 2), ca = Math.cos(a), sa = Math.sin(a);
  const cx = e === 1 ? ca : Math.sign(ca) * Math.pow(Math.abs(ca), e), sy = e === 1 ? sa : Math.sign(sa) * Math.pow(Math.abs(sa), e);
  let rx = r.rx, ry = sa < 0 ? r.ryBelow ?? r.ry : r.ry;
  if (r.lobe) { const [dl, dd] = r.lobe(a); rx = Math.max(1e-4, rx + dl); if (sa > 0) ry = Math.max(1e-4, ry + dd); }
  const kx = cx * rx * scale, ky = sy * ry * scale;
  out.set(r.c.x + t.x * shift + v.x * kx + u.x * ky, r.c.y + t.y * shift + v.y * kx + u.y * ky, r.c.z + t.z * shift + v.z * kx + u.z * ky);
  if (r.squash) { const [n, f] = r.squash, dn = -f * ((out.x - r.c.x) * n.x + (out.y - r.c.y) * n.y + (out.z - r.c.z) * n.z); out.x += n.x * dn; out.y += n.y * dn; out.z += n.z * dn; }
  return out;
}
/** Every triangle edge length a loft of `rings` would emit between consecutive rings (caps excluded). */
function loftEdgeLengths(rings: Ring[], segments: number, include: (i: number) => boolean): number[] {
  const out: number[] = [], pts = rings.map(r => { const b = ringBasis(r); return Array.from({length: segments}, (_, k) => ringPoint(r, b, TAU * k / segments, V())); });
  for (let i = 0; i + 1 < rings.length; i++) {
    if (!include(i)) continue;
    const A = pts[i]!, B = pts[i + 1]!;
    for (let k = 0; k < segments; k++) {
      const a = A[k]!, b = A[(k + 1) % segments]!, c = B[k]!, d = B[(k + 1) % segments]!;
      out.push(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a), b.distanceTo(d), d.distanceTo(c), c.distanceTo(b));
    }
  }
  return out;
}
function loft(s: Skin, rings: Ring[], segments: number, capStart = 0.6, capEnd = 0.6) {
  if (rings.length < 2) return;
  const ids: number[][] = [];
  const basis = ringBasis;
  const p = V();
  /** Emits one ring; with `colours` the vertices reuse those colours (cap rings copy their boundary ring, whose
   * colour they match to within the cap's tiny extent), otherwise each vertex samples the ring's colour field. */
  const ringIds = (r: Ring, scale = 1, shift = 0, colours?: RGB[], record?: RGB[]) => {
    const b = basis(r), out: number[] = [];
    for (let k = 0; k < segments; k++) {
      const a = TAU * k / segments;
      ringPoint(r, b, a, p, scale, shift);
      const col = colours ? colours[k]! : r.color(a, p);
      record?.push(col);
      out.push(s.v(p, col, r.w, r.region));
    }
    return out;
  };
  const capRings = (r: Ring, dir: number, len: number, colours: RGB[]) => {
    const list: number[][] = [], steps = 3, radius = Math.max(r.rx, r.ry) * len;
    for (let k = 1; k <= steps; k++) { const phi = (k / (steps + 1)) * Math.PI / 2; list.push(ringIds(r, Math.cos(phi), dir * Math.sin(phi) * radius, colours)); }
    const {t} = basis(r), apexPos = r.c.clone().addScaledVector(t, dir * radius);
    const apex = s.v(apexPos, colours[Math.floor(segments * 3 / 4)]!, r.w, r.region);
    return {list, apex};
  };
  const firstColours: RGB[] = [], lastColours: RGB[] = [];
  const startCap: number[][] = [];
  let startApex = -1;
  const main: number[][] = rings.map((r, i) => ringIds(r, 1, 0, undefined, i === 0 ? firstColours : i === rings.length - 1 ? lastColours : undefined));
  if (capStart > 0) { const cap = capRings(rings[0]!, -1, capStart, firstColours); startCap.push(...cap.list.reverse()); startApex = cap.apex; }
  ids.push(...startCap, ...main);
  if (startApex >= 0) fan(s, startApex, ids[0]!, true);
  if (capEnd > 0) { const cap = capRings(rings[rings.length - 1]!, 1, capEnd, lastColours); ids.push(...cap.list); fan(s, cap.apex, ids[ids.length - 1]!, false); }
  for (let i = 0; i + 1 < ids.length; i++) for (let k = 0; k < segments; k++) {
    const a = ids[i]![k]!, b = ids[i]![(k + 1) % segments]!, c = ids[i + 1]![k]!, d = ids[i + 1]![(k + 1) % segments]!;
    s.t(a, b, c); s.t(b, d, c);
  }
}
function fan(s: Skin, apex: number, ring: number[], start: boolean) {
  for (let k = 0; k < ring.length; k++) { const a = ring[k]!, b = ring[(k + 1) % ring.length]!; if (start) s.t(b, a, apex); else s.t(a, b, apex); }
}
/** Tube along a polyline with parallel-transported frames. */
function tube(s: Skin, points: THREE.Vector3[], radii: number[], weights: W[], color: (i: number, a: number, p: THREE.Vector3) => RGB, segments: number, capStart = 0.5, capEnd = 0.5, flatten = 1, upHint?: THREE.Vector3) {
  if (points.length < 2) return;
  const rings: Ring[] = [];
  let u = upHint?.clone() ?? V(0, 1, 0);
  for (let i = 0; i < points.length; i++) {
    const t = points[Math.min(points.length - 1, i + 1)]!.clone().sub(points[Math.max(0, i - 1)]!).normalize();
    u.addScaledVector(t, -u.dot(t)); if (u.lengthSq() < 1e-8) u = Math.abs(t.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0), u.addScaledVector(t, -u.dot(t));
    u.normalize();
    const index = i;
    rings.push({c: points[i]!, t, u: u.clone(), rx: Math.max(1e-4, radii[i]!), ry: Math.max(1e-4, radii[i]! * flatten), w: weights[i]!, color: (a, p) => color(index, a, p)});
  }
  loft(s, rings, segments, capStart, capEnd);
}
function ellipsoid(s: Skin, center: THREE.Vector3, axes: [THREE.Vector3, THREE.Vector3, THREE.Vector3], radii: [number, number, number], w: W, color: (a: number, f: number, p: THREE.Vector3) => RGB, segments = 10, stations = 6) {
  const [ax, ay] = axes, rings: Ring[] = [];
  for (let i = 0; i <= stations; i++) {
    const f = i / stations, th = mix(-0.92, 0.92, f) * Math.PI / 2, k = Math.cos(th);
    rings.push({c: center.clone().addScaledVector(ax, Math.sin(th) * radii[0]), t: ax, u: ay, rx: radii[2] * k, ry: radii[1] * k, w, color: (a, p) => color(a, f, p)});
  }
  loft(s, rings, segments, 0.32, 0.32);
}
/** Closed thin slab from a convex polygon (in a plane spanned by e1,e2 about origin). */
function slab(s: Skin, origin: THREE.Vector3, e1: THREE.Vector3, e2: THREE.Vector3, poly: [number, number][], thickness: number, w: W | ((x: number, y: number) => W), color: RGB | ((x: number, y: number) => RGB)) {
  const n = V().crossVectors(e1, e2).normalize(), centroid = V();
  const at = (x: number, y: number, side: number) => origin.clone().addScaledVector(e1, x).addScaledVector(e2, y).addScaledVector(n, side * thickness * 0.5);
  const weight = (x: number, y: number) => typeof w === 'function' ? w(x, y) : w, col = (x: number, y: number) => typeof color === 'function' ? color(x, y) : color;
  const top = poly.map(([x, y]) => s.v(at(x, y, 1), col(x, y), weight(x, y))), bottom = poly.map(([x, y]) => s.v(at(x, y, -1), col(x, y), weight(x, y)));
  poly.forEach(([x, y]) => centroid.add(at(x, y, 0))); centroid.multiplyScalar(1 / poly.length);
  for (let k = 1; k + 1 < poly.length; k++) { s.to(top[0]!, top[k]!, top[k + 1]!, n); s.to(bottom[0]!, bottom[k]!, bottom[k + 1]!, n.clone().negate()); }
  for (let k = 0; k < poly.length; k++) {
    const k2 = (k + 1) % poly.length, out = s.pos(top[k]!).add(s.pos(top[k2]!)).multiplyScalar(0.5).sub(centroid);
    s.to(top[k]!, bottom[k]!, top[k2]!, out); s.to(top[k2]!, bottom[k]!, bottom[k2]!, out);
  }
}

/** Centripetal (alpha 0.5) Catmull-Rom segment p1 -> p2; returns the point and unit tangent at fraction f. */
function centripetal(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3) {
  const knot = (a: THREE.Vector3, b: THREE.Vector3) => Math.max(1e-6, Math.sqrt(a.distanceTo(b)));
  const t0 = 0, t1 = knot(p0, p1), t2 = t1 + knot(p1, p2), t3 = t2 + knot(p2, p3);
  const a1 = V(), a2 = V(), a3 = V(), b1 = V(), b2 = V();
  const point = (t: number, out: THREE.Vector3) => {
    a1.copy(p0).lerp(p1, (t - t0) / (t1 - t0)); a2.copy(p1).lerp(p2, (t - t1) / (t2 - t1)); a3.copy(p2).lerp(p3, (t - t2) / (t3 - t2));
    b1.copy(a1).lerp(a2, (t - t0) / (t2 - t0)); b2.copy(a2).lerp(a3, (t - t1) / (t3 - t1));
    return out.copy(b1).lerp(b2, (t - t1) / (t2 - t1));
  };
  return (f: number) => {
    const t = t1 + (t2 - t1) * f, h = (t2 - t1) * 1e-3;
    const c = point(t, V()), tan = point(t + h, V()).sub(point(t - h, V()));
    if (tan.lengthSq() < 1e-20) tan.copy(p2).sub(p1);
    return {c, t: tan.normalize()};
  };
}

/** Largest centreline turn allowed between consecutive rings before a midpoint ring is inserted. */
const MAX_RING_TURN = 12 * Math.PI / 180;
/**
 * Adaptive ring placement: wherever two consecutive stations (segment k, fraction f) differ in tangent by more
 * than MAX_RING_TURN, a station is inserted halfway in chain parameter (k + f), up to three levels deep. Only
 * sharply bent joints gain rings, so a straight chain keeps its spec'd tessellation.
 */
function refineStations<S extends {k: number; f: number; kind: ComposerSkinRing['kind']}>(plan: S[], tangent: (s: {k: number; f: number}) => THREE.Vector3, segCount: number): S[] {
  let cur = plan, tans = cur.map(st => tangent(st).clone().normalize());
  for (let pass = 0; pass < 3; pass++) {
    const next: S[] = [cur[0]!], nextT: THREE.Vector3[] = [tans[0]!];
    let added = false;
    for (let i = 1; i < cur.length; i++) {
      const a = cur[i - 1]!, b = cur[i]!;
      if (tans[i - 1]!.angleTo(tans[i]!) > MAX_RING_TURN) {
        const tm = (a.k + a.f + b.k + b.f) / 2, k = Math.min(segCount - 1, Math.floor(tm)), f = tm - k;
        const st = {...a, k, f, kind: f < 0.12 || f > 0.88 ? 'joint' : 'bone'} as S;
        next.push(st); nextT.push(tangent(st).clone().normalize()); added = true;
      }
      next.push(b); nextT.push(tans[i]!);
    }
    cur = next; tans = nextT;
    if (!added) break;
  }
  return cur;
}

// ------------------------------------------------------------------ head stations
interface HeadStation {x: number; w: number; h: number; yc: number}
/** The cranial station where the head loft starts (and the neck blend ends), in head-bone units. */
function headFirstStation(head: ComposerRecipe['head'], H: number, cW: number, cH: number): HeadStation {
  const x = 0.22 * H;
  if (head === 'muzzle' || head === 'jaws') { const fl = head === 'jaws' ? 0.82 : 1; return {x, w: 0.982 * cW, h: 0.973 * cH * fl, yc: -0.0133 * cH}; }
  if (head === 'beak') return {x, w: cW, h: cH, yc: 0.02 * cH};
  if (head === 'flat-face') return {x, w: cW, h: cH, yc: 0.04 * cH};
  if (head === 'blunt') return {x, w: 0.985 * cW, h: 0.985 * cH, yc: 0};
  return {x, w: 0.943 * cW, h: 0.931 * cH, yc: 0};
}

type At = (b: ComposerBone, x: number, y?: number, z?: number) => THREE.Vector3;
type Axis = (b: ComposerBone, x: number, y: number, z: number) => THREE.Vector3;
type Palette = Record<'base' | 'accent' | 'belly' | 'keratin' | 'skin' | 'eye' | 'horn' | 'plate', RGB>;
type CoatAt = (p: THREE.Vector3, dorsal: number, region: CoatRegion, along: number, footprint?: number) => RGB;
/** Dorsal component of an elliptical ring's outward normal at angle a (bone-local, -1 belly .. 1 back). */
const ringDorsal = (a: number, rx: number, ry: number, ryBelow = ry) => { const sa = Math.sin(a), ca = Math.cos(a), h = sa < 0 ? ryBelow : ry, n = Math.hypot(ca * h, sa * rx); return n > 1e-12 ? sa * rx / n : sa; };
const ringLateral = (a: number, rx: number, ry: number, ryBelow = ry) => { const sa = Math.sin(a), ca = Math.cos(a), h = sa < 0 ? ryBelow : ry, n = Math.hypot(ca * h, sa * rx); return n > 1e-12 ? ca * h / n : ca; };

/** Per-individual skin features; identity (zero jitter) when the traits are neutral. */
interface SkinIndividual {
  traits: ComposerIndividualTraits;
  /** Jitter strength: 0 for neutral traits, else the recipe variability (capped at 1.5). */
  jv: number;
  osteoSeed: number; plateSeed: number; featherSeed: number;
}
const jitterU = (seed: number, k: number, j: number) => hash3u(k, j, 7, seed) / 4294967296;

// ------------------------------------------------------------------ skin builder
export function buildComposerSkin(graph: ComposerGraph, options: ComposerSkinOptions = {}): ComposerSkin {
  const s = new Skin(), r = graph.recipe, d = graph.dims, bones = graph.bones;
  const traits = options.traits ?? composerIndividualTraits(r);
  const jv = traits.neutral ? 0 : clamp(r.variability, 0, 1.5);
  const seed = composerHash(`${r.colorSeed}/${r.palette}`);
  const Q = (b: ComposerBone) => new THREE.Quaternion(...b.restQuaternion);
  const P = (b: ComposerBone) => V(...b.restPosition);
  const at = (b: ComposerBone, x: number, y = 0, z = 0) => V(x, y, z).applyQuaternion(Q(b)).add(P(b));
  const axis = (b: ComposerBone, x: number, y: number, z: number) => V(x, y, z).applyQuaternion(Q(b)).normalize();
  const L = d.bodyLength, scale = Math.max(L, 0.2);
  const one = (bone: number): W => [[bone, 1]];
  const debugRings: ComposerSkinRing[] | undefined = options.debug ? [] : undefined;
  let splineFallbacks = 0;
  const T = COMPOSER_SKIN_TESSELLATION;

  // ---- individual stream: fixed draw order, mesh-local, never colorSeed
  const ind = composerRandom(`composer-skin-ind-v1/${traits.coat.driftKey}`);
  const u9: number[] = []; for (let i = 0; i < 12; i++) u9.push(ind());
  const word = (u: number) => Math.floor(u * 4294967296) >>> 0;
  const mottleSeed = word(u9[0]!), mottleAmp = jv * (0.05 + 0.07 * u9[1]!);
  const bellyShift = jv * (u9[2]! - 0.5) * 0.24, countershadeScale = 1 + jv * (u9[3]! - 0.5) * 0.3;
  const soil = jv * 0.45 * u9[4]!, soilHeight = 0.12 + 0.3 * u9[5]!;
  // overall coat tone: individuals of one species differ in shade by about +-17% perceptual lightness
  const tone = 1 + jv * (u9[9]! - 0.5) * 0.34;
  const individual: SkinIndividual = {traits, jv, osteoSeed: word(u9[6]!), plateSeed: word(u9[7]!), featherSeed: word(u9[8]!)};

  // ---- coat genome (built once per creature)
  let genome: CoatGenome = applyCoatDrift(defaultCoatGenome(r.palette, r.colorSeed, {pattern: r.pattern, marks: r.marks, scale: r.patternScale, contrast: r.patternContrast, countershade: r.countershade, juvenileSpots: traits.coat.juvenileSpots}),
    coatIndividualDrift(traits.coat.driftKey, r.variability));
  if (jv > 0) genome = {...genome, bellyLine: clamp(genome.bellyLine + bellyShift, -1, 1), countershade: clamp(genome.countershade * countershadeScale, 0, 1)};
  const requestedScale = genome.scale;
  // bare parts vary per individual too: skin and keratin pigment together (+-15% perceptual), iris shade (+-10%)
  const skinMul = (1 + jv * (u9[10]! - 0.5) * 0.3) ** 2.2, eyeMul = (1 + jv * (u9[11]! - 0.5) * 0.2) ** 2.2;
  const pal = {...genome.colours, skin: scaleC(genome.colours.skin, skinMul), keratin: scaleC(genome.colours.keratin, skinMul), eye: scaleC(genome.colours.eye, eyeMul)} as Palette;
  const male = traits.sex === 'male' && r.dimorphism > 0;
  const SOIL: RGB = [0.155, 0.117, 0.08];

  // coat frame: origin at the torso centre, x along the torso (in the sagittal plane), z lateral
  const {torso, tail, neck, head, trunk} = graph.chains;
  const tFirst = bones[torso[0]!]!, tLast = bones[torso[torso.length - 1]!]!;
  const rear = at(tFirst, 0, tFirst.start.yc), front = at(tLast, tLast.length, tLast.end.yc);
  const origin = rear.clone().add(front).multiplyScalar(0.5), fwd = front.clone().sub(rear); fwd.z = 0;
  if (fwd.lengthSq() < 1e-12) fwd.set(1, 0, 0);
  fwd.normalize();
  const coatOut = new Float64Array(3);
  const sample = {x: 0, y: 0, z: 0, dorsal: 0, region: 'torso' as CoatRegion, along: 0, footprint: 0};
  const groundRef = Math.max(d.legReach, d.frontLegReach, 1e-3);
  const coatAt: CoatAt = (p, dorsal, region, along, fp = 0) => {
    const dx = p.x - origin.x, dy = p.y - origin.y;
    sample.x = (dx * fwd.x + dy * fwd.y) / scale; sample.y = (dy * fwd.x - dx * fwd.y) / scale; sample.z = p.z / scale;
    sample.dorsal = clamp(dorsal, -1, 1); sample.region = region; sample.along = clamp(along, 0, 1); sample.footprint = fp;
    evaluateCoat(genome, sample, coatOut, 0);
    let c: RGB = [coatOut[0]!, coatOut[1]!, coatOut[2]!];
    if (region === 'eye' || region === 'horn' || region === 'armor') return c;
    // individual tone, low-frequency mottling and darker males along the back, as perceptual (sRGB-like)
    // lightness factors so dark coats vary visibly too (linear factor = perceptual factor ^ 2.2)
    let k = tone;
    if (mottleAmp > 0) k *= 1 + mottleAmp * 2 * (valueNoise3(sample.x * 4.5, sample.y * 4.5, sample.z * 4.5, mottleSeed) - 0.5);
    if (male) k *= 1 - 0.06 * r.dimorphism * smooth(-0.2, 0.7, dorsal);
    if (k !== 1) c = scaleC(c, Math.pow(k, 2.2));
    if (r.palette === 'plumage' && region === 'neck') c = mixC(c, pal.accent, 0.25);
    // dried mud and dust on the lower legs, varying per individual
    if (soil > 0 && (region === 'limb-lower' || region === 'foot' || region === 'limb-upper') && r.layout !== 'limbless') c = mixC(c, SOIL, soil * smooth(soilHeight * groundRef, 0.02 * groundRef, p.y));
    return c;
  };

  // ---- chains
  type Seg = {bone: ComposerBone; reversed: boolean};
  interface Meta {kind: ComposerSkinRing['kind']; bone: ComposerBone; k: number; f: number; sec: ComposerSection; fp: number; along: number; region: CoatRegion}
  interface ChainOpts {
    ringsFor: (bone: ComposerBone) => number;
    ripple?: (bone: ComposerBone, f: number) => number;
    startWeights?: W; endBone?: number;
    /** Control points past the chain end (the spline continues into them). */
    extra?: THREE.Vector3[];
    /** First ring of the first segment (limb root); earlier rings are dropped. */
    rootF?: number;
    dress: (ring: Ring, meta: Meta) => void;
    /** Runs after the underside clamp. */
    after?: (ring: Ring, meta: Meta) => void;
  }
  const buildChain = (segs: Seg[], o: ChainOpts) => {
    const sections: ComposerSection[] = [];
    segs.forEach(({bone, reversed}, k) => {
      const first = reversed ? bone.end : bone.start, last = reversed ? bone.start : bone.end;
      if (k === 0) sections.push(first); else { const prev = sections[sections.length - 1]!; sections[sections.length - 1] = {w: (prev.w + first.w) / 2, h: (prev.h + first.h) / 2, yc: (prev.yc + first.yc) / 2}; }
      sections.push(last);
    });
    // Catmull-Rom across joint sections smooths the silhouette between bones
    const sampleSec = (k: number, f: number): ComposerSection => {
      const p0 = sections[Math.max(0, k - 1)]!, p1 = sections[k]!, p2 = sections[k + 1]!, p3 = sections[Math.min(sections.length - 1, k + 2)]!;
      const cr = (a: number, b: number, c: number, e: number) => 0.5 * ((2 * b) + (-a + c) * f + (2 * a - 5 * b + 4 * c - e) * f * f + (-a + 3 * b - 3 * c + e) * f * f * f);
      const w = Math.max(1e-4, cr(p0.w, p1.w, p2.w, p3.w)), yc = cr(p0.yc, p1.yc, p2.yc, p3.yc);
      // The underside never bulges below the straight line between joint undersides (the rig's support contract);
      // Catmull-Rom overshoot would otherwise push a resting belly through the floor.
      const lowest = mix(p1.yc - p1.h, p2.yc - p2.h, f);
      return {w, h: Math.max(1e-4, Math.min(cr(p0.h, p1.h, p2.h, p3.h), yc - lowest)), yc};
    };
    // centreline control points: joints offset by the section centre along the (averaged) dorsal axis
    const ctrl: THREE.Vector3[] = [], ups: THREE.Vector3[] = [];
    segs.forEach(({bone, reversed}, k) => {
      const up = axis(bone, 0, 1, 0), a = at(bone, reversed ? bone.length : 0), b = at(bone, reversed ? 0 : bone.length);
      if (k === 0) { ctrl.push(a); ups.push(up); } else { ctrl[k]!.add(a).multiplyScalar(0.5); ups[k] = ups[k]!.clone().add(up).normalize(); }
      ctrl.push(b); ups.push(up);
    });
    ctrl.forEach((c, i) => c.addScaledVector(ups[i]!, sections[i]!.yc));
    const ext = [...ctrl, ...(o.extra ?? [])];
    const pad = [ext[0]!.clone().multiplyScalar(2).sub(ext[1]!), ...ext, ext[ext.length - 1]!.clone().multiplyScalar(2).sub(ext[ext.length - 2]!)];
    const curves = ext.slice(0, -1).map((_, k) => centripetal(pad[k]!, pad[k + 1]!, pad[k + 2]!, pad[k + 3]!));
    const chordDir = (k: number) => ext[k + 1]!.clone().sub(ext[k]!).normalize();
    // overshoot guard: a segment that strays from its chord falls back to the polyline at its interior joints
    const fallback = curves.map(() => false), fellBack = new Set<number>();
    for (let k = 0; k < segs.length; k++) {
      const a = ext[k]!, dir = chordDir(k), len = ext[k + 1]!.distanceTo(a);
      const rmin = Math.max(1e-4, Math.min((sections[k]!.w + sections[k]!.h) / 2, (sections[k + 1]!.w + sections[k + 1]!.h) / 2));
      for (let q = 1; q < 8; q++) {
        const {c, t} = curves[k]!(q / 8), off = c.clone().sub(a), dev = off.addScaledVector(dir, -off.dot(dir)).length();
        if (dev > Math.max(0.5 * rmin, 0.12 * len) || t.dot(dir) < 0.3) { fallback[k] = true; break; }
      }
      if (fallback[k]) { if (k > 0) fellBack.add(k); if (k + 1 < ext.length - 1) fellBack.add(k + 1); }
    }
    splineFallbacks += fellBack.size;
    const evalSeg = (k: number, f: number) => {
      if (!fallback[k]) return curves[k]!(f);
      const dir = chordDir(k), t = dir.clone();
      if (k > 0 && fellBack.has(k) && f < 0.12) t.lerp(chordDir(k - 1), 0.5 - f / 0.24);
      if (k + 1 < curves.length && fellBack.has(k + 1) && f > 0.88) t.lerp(chordDir(k + 1), (f - 0.88) / 0.24);
      return {c: ext[k]!.clone().lerp(ext[k + 1]!, f), t: t.normalize()};
    };
    // ring plan: regular rings, joint rings at +-12%, then adaptive midpoints wherever the centreline turns too fast
    type Station = {k: number; f: number; kind: ComposerSkinRing['kind']};
    let plan: Station[] = [];
    segs.forEach(({bone}, k) => {
      const R = o.ringsFor(bone);
      let fr: number[] = [];
      for (let i = 0; i < R; i++) fr.push(i / R);
      if (k === segs.length - 1) fr.push(1);
      const extras = new Set<number>();
      if (k > 0) extras.add(0.12);
      if (k < segs.length - 1 || o.extra) extras.add(0.88);
      // regular rings too close to a joint ring are dropped so no sliver quads appear
      fr = fr.filter(f => ![...extras].some(e => Math.abs(f - e) < 0.04));
      fr = [...fr, ...extras].sort((a, b) => a - b);
      if (k === 0 && o.rootF !== undefined) { const f3 = o.rootF, gap = 0.5 / R; fr = [f3, ...fr.filter(f => f > f3 + gap)]; }
      for (const f of fr) plan.push({k, f, kind: k === 0 && f === o.rootF ? 'root' : extras.has(f) ? 'joint' : 'bone'});
    });
    plan = refineStations(plan, st => evalSeg(st.k, st.f).t, segs.length);
    const rings: Ring[] = [], metas: Meta[] = [];
    segs.forEach(({bone}, k) => {
      const prev = segs[k - 1]?.bone, next = segs[k + 1]?.bone;
      for (const {f, kind} of plan.filter(st => st.k === k)) {
        const sec = sampleSec(k, f), ripple = o.ripple ? o.ripple(bone, f) : 1;
        const {c, t} = evalSeg(k, f), up = axis(bone, 0, 1, 0);
        let weights: W;
        if (f < 0.5 && prev) { const wp = 0.5 * (1 - smooth(0, 0.5, f)); weights = [[prev.index, wp], [bone.index, 1 - wp]]; }
        else if (f > 0.5 && next) { const wn = 0.5 * smooth(0.5, 1, f); weights = [[next.index, wn], [bone.index, 1 - wn]]; }
        // The tube end hands over completely to `endBone` (a leg's level foot), so the ankle follows the planted sole.
        else if (f > 0.5 && !next && o.endBone !== undefined) { const wn = smooth(0.5, 1, f); weights = [[o.endBone, wn], [bone.index, 1 - wn]]; }
        else weights = [[bone.index, 1]];
        if (k === 0 && rings.length === 0 && o.startWeights) weights = o.startWeights;
        const ring: Ring = {c, t, u: up, rx: sec.w * ripple, ry: sec.h * ripple, w: weights, color: () => [0, 0, 0]};
        const meta: Meta = {kind, bone, k, f, sec, fp: 0, along: 0, region: 'torso'};
        o.dress(ring, meta);
        // the spline centreline may sag below the straight bone line: keep the underside above the joint-underside line
        const lineY = mix(sections[k]!.yc - sections[k]!.h, sections[k + 1]!.yc - sections[k + 1]!.h, f);
        const local = c.clone().sub(P(bone)).dot(up);
        let below = ring.ryBelow ?? ring.ry;
        if (local - below < lineY) {
          below = local - lineY;
          const floor = 0.35 * ring.ry;
          if (below < floor) { c.addScaledVector(up, floor - below); below = floor; }
        }
        ring.ryBelow = Math.max(1e-4, below);
        o.after?.(ring, meta);
        rings.push(ring); metas.push(meta);
      }
    });
    return {rings, metas, sections, evalSeg};
  };
  /** Pattern footprint per ring: the larger of the circumferential and axial vertex spacing, in body lengths. */
  const setFootprints = (rings: Ring[], metas: Meta[], radial: number) => {
    rings.forEach((ring, i) => {
      const circ = TAU * 0.5 * (ring.rx + 0.5 * (ring.ry + (ring.ryBelow ?? ring.ry))) / radial;
      const dPrev = i > 0 ? rings[i - 1]!.c.distanceTo(ring.c) : Infinity, dNext = i + 1 < rings.length ? rings[i + 1]!.c.distanceTo(ring.c) : Infinity;
      const axial = Math.min(dPrev, dNext);
      metas[i]!.fp = Math.max(circ, Number.isFinite(axial) ? axial : circ) / scale;
    });
  };
  const report = (chain: string, rings: Ring[], metas: Meta[]) => {
    if (!debugRings) return;
    rings.forEach((ring, i) => {
      const m = metas[i]!;
      debugRings.push({chain, kind: m.kind, bone: m.bone.index, part: m.bone.part, f: m.f, centre: vec(ring.c), tangent: vec(ring.t.clone().normalize()), rx: ring.rx, ry: ring.ry, ryBelow: ring.ryBelow ?? ring.ry, weights: ring.w.map(([b, w]) => [b, w] as [number, number]), region: m.region});
    });
  };

  // ---- axial chain: tail tip -> torso -> neck end -> head blend
  const torsoSeg = r.torso === 'segmented', annulated = r.torso === 'annulated';
  const ripple = (bone: ComposerBone, f: number) => bone.part !== 'torso' ? 1 : torsoSeg ? 1 - 0.14 * Math.pow(Math.cos(Math.PI * f), 8) : annulated ? 1 - 0.05 * Math.pow(Math.cos(Math.PI * 3 * f), 6) : 1;
  const band = (bone: ComposerBone, f: number) => bone.part !== 'torso' ? 0 : torsoSeg ? 0.55 * Math.pow(Math.cos(Math.PI * f), 6) : annulated ? 0.25 * Math.pow(Math.cos(Math.PI * 3 * f), 4) : 0;
  const axialSegs: Seg[] = [...[...tail].reverse().map(i => ({bone: bones[i]!, reversed: true})), ...torso.map(i => ({bone: bones[i]!, reversed: false})), ...neck.map(i => ({bone: bones[i]!, reversed: false}))];
  const torsoBones = torso.map(i => bones[i]!), torsoTotal = torsoBones.reduce((a, b) => a + b.length, 0);
  const startOf = (list: number[]) => { const m = new Map<number, number>(); let acc = 0; for (const i of list) { m.set(i, acc); acc += bones[i]!.length; } return m; };
  const chainLen = (list: number[]) => list.reduce((a, i) => a + bones[i]!.length, 0);
  const torsoStartOf = startOf(torso), tailStart = startOf(tail), neckStart = startOf(neck);
  const tailTotal = chainLen(tail), neckTotal = chainLen(neck);
  // torso lobes: withers, scapula, haunch, flank tuck, male shoulders (dorsal or lateral only)
  const limbU = (limb: ComposerLimb) => ((torsoStartOf.get(limb.socketBone) ?? 0) + limb.socket[0]) / Math.max(torsoTotal, 1e-9);
  const ground = graph.limbs.filter(l => l.kind !== 'wing');
  const meanU = (list: ComposerLimb[]) => list.length ? list.reduce((a, l) => a + limbU(l), 0) / list.length : undefined;
  const hindU = meanU(ground.filter(l => !l.front)), foreU = meanU(ground.filter(l => l.front));
  const lobed = ground.length > 0 && (r.layout === 'quadruped' || r.layout === 'biped' || r.layout === 'sprawled') && !torsoSeg && !annulated;
  const socketSep = ground.length ? Math.min(...ground.map(l => 2 * Math.abs(l.socket[2]))) : 0;
  const latCap = 0.35 * socketSep;
  const torsoLobe = (u: number, sec: ComposerSection) => (a: number): [number, number] => {
    const ca = Math.cos(a), sa = Math.sin(a), c2 = ca * ca, upper = smooth(-0.25, 0.35, sa), lower = smooth(0.25, -0.45, sa);
    const dor = 0.06 * sec.h * (1 + 0.05 * traits.torso.withers) * gauss(u, 0.85, 0.09) * Math.max(0, sa) ** 2;
    let lat = 0;
    if (foreU !== undefined) lat += 0.08 * sec.w * gauss(u, foreU, 0.07) * c2 * upper;
    if (hindU !== undefined) lat += 0.10 * sec.w * gauss(u, hindU, 0.08) * c2 * upper;
    lat -= 0.06 * sec.w * gauss(u, 0.25, 0.1) * c2 * lower;
    if (male) lat += 0.08 * r.dimorphism * sec.w * smooth(0.72, 0.86, u) * c2 * upper;
    return [clamp(lat, -latCap, latCap), dor];
  };
  const torsoU = (bone: ComposerBone, f: number) => ((torsoStartOf.get(bone.index) ?? 0) + f * bone.length) / Math.max(torsoTotal, 1e-9);
  const axialRegion = (bone: ComposerBone, f: number): [CoatRegion, number] => {
    if (bone.part === 'tail') { const x = ((tailStart.get(bone.index) ?? 0) + (1 - f) * bone.length) / Math.max(tailTotal, 1e-9); return x > 0.85 ? ['tail-tip', (x - 0.85) / 0.15] : ['tail', x / 0.85]; }
    if (bone.part === 'neck') return ['neck', ((neckStart.get(bone.index) ?? 0) + f * bone.length) / Math.max(neckTotal, 1e-9)];
    return ['torso', torsoU(bone, f)];
  };
  const hb = bones[head]!, H = d.headLength;
  const station0 = headFirstStation(r.head, H, d.craniumWidth, d.craniumHeight);
  const hc1 = at(hb, station0.x, station0.yc), hc2 = at(hb, 0.5 * H, station0.yc);
  const axialRadial = torsoSeg || annulated ? T.torsoRadialBanded : T.torsoRadial;
  const headCtx = makeHeadColours(r, d, coatAt, axialRadial, scale);
  s.begin('torso', torsoSeg ? 'segmented trunk' : annulated ? 'annulated body' : 'torso');
  const axialChain = buildChain(axialSegs, {
    ripple, extra: [hc1, hc2],
    ringsFor: b => b.part === 'torso' ? (annulated ? T.torsoRingsAnnulated : T.torsoRings) : b.part === 'neck' ? T.neckRings : T.tailRings,
    dress: (ring, meta) => {
      const {bone, f, sec} = meta, [region, along] = axialRegion(bone, f);
      meta.region = region; meta.along = along; ring.region = REGION[region];
      if (bone.part === 'torso') {
        const u = torsoU(bone, f);
        ring.n = 2 + 0.3 * smooth(0, 0.15, u) * smooth(1, 0.85, u);
        if (lobed) ring.lobe = torsoLobe(u, sec);
      }
      const bandK = band(bone, f);
      ring.color = (a, p) => {
        const c = coatAt(p, ringDorsal(a, ring.rx, ring.ry, ring.ryBelow), region, along, meta.fp);
        return bandK ? mixC(c, pal.accent, bandK) : c;
      };
    },
  });
  // neck -> head blend rings in the head frame: sections ramp geometrically, weights hand over to the head
  const lastSeg = axialSegs[axialSegs.length - 1]!.bone, lastSec = axialChain.sections[axialChain.sections.length - 1]!;
  const meanR = (w: number, h: number) => (w + h) / 2;
  const ratio = meanR(station0.w, station0.h) / Math.max(1e-6, meanR(lastSec.w, lastSec.h));
  const blendCount = clamp(Math.ceil(Math.abs(Math.log(ratio)) / Math.log(1.12)), 2, 5);
  const headWeightAt = (x: number) => x <= 0.1 * H ? 0.35 * x / (0.1 * H) : Math.min(0.7, 0.35 + 0.35 * (x - 0.1 * H) / (0.12 * H));
  const blendRings: Ring[] = [], blendMetas: Meta[] = [];
  // blend stations: uniform in sb, then refined where the neck-to-head centreline turns faster than MAX_RING_TURN
  const headAxis = axis(hb, 1, 0, 0), lastAxial = axialChain.rings[axialChain.rings.length - 1]!;
  const blendPlan = refineStations([{k: 0, f: 0, kind: 'blend' as const}, ...Array.from({length: blendCount}, (_, i) => ({k: 0, f: (i + 1) / blendCount, kind: 'blend' as const}))],
    st => st.f === 0 ? lastAxial.t : st.f === 1 ? headAxis : axialChain.evalSeg(axialSegs.length, st.f).t, 1).slice(1).map(st => st.f);
  for (const sb of blendPlan) {
    const x = station0.x * sb, last = sb === 1;
    const {c, t} = axialChain.evalSeg(axialSegs.length, sb);
    const w = lastSec.w * (station0.w / lastSec.w) ** sb, h = lastSec.h * (station0.h / lastSec.h) ** sb;
    const hw = headWeightAt(x), up = last ? axis(hb, 0, 1, 0) : axis(lastSeg, 0, 1, 0).lerp(axis(hb, 0, 1, 0), sb).normalize();
    const ring: Ring = {c: last ? hc1.clone() : c, t: last ? axis(hb, 1, 0, 0) : t, u: up, rx: last ? station0.w : w, ry: last ? station0.h : h, w: [[lastSeg.index, 1 - hw], [hb.index, hw]], color: () => [0, 0, 0]};
    const region: CoatRegion = sb < 0.5 ? 'neck' : headCtx.region(x), along = sb < 0.5 ? 1 : headCtx.along(x);
    const meta: Meta = {kind: 'blend', bone: hb, k: axialSegs.length, f: sb, sec: {w, h, yc: 0}, fp: 0, along, region};
    ring.region = REGION[region];
    if (last) ring.color = headCtx.col(x, station0.w, station0.h);
    else ring.color = (a, p) => {
      const dorsal = ringDorsal(a, ring.rx, ring.ry);
      // stretch: a soft cavity under the jaw where the throat meets the head
      const cavity = 1 - 0.12 * Math.sin(Math.PI * sb) * smooth(0.1, -0.7, dorsal);
      return scaleC(coatAt(p, dorsal, region, along, meta.fp), cavity);
    };
    blendRings.push(ring); blendMetas.push(meta);
  }
  const axialRings = [...axialChain.rings, ...blendRings], axialMetas = [...axialChain.metas, ...blendMetas];
  setFootprints(axialRings, axialMetas, axialRadial);
  // ---- pattern scale clamp: keep a mean pattern cell at least four torso edges across
  // the exact triangle edges the loft will emit between torso-region rings (same superellipse, lobes and squash)
  const torsoEdges = loftEdgeLengths(axialRings, axialRadial, i => axialMetas[i]!.region === 'torso' && axialMetas[i + 1]!.region === 'torso');
  torsoEdges.sort((a, b) => a - b);
  const torsoEdge = torsoEdges.length ? torsoEdges[torsoEdges.length >> 1]! : 0;
  const cells = COAT_CELLS_PER_BODY[genome.pattern];
  if (cells > 0 && genome.pattern !== 'roan' && torsoEdge > 0) {
    const maxScale = scale / (4 * 1.08 * cells * torsoEdge);
    if (genome.scale > maxScale) genome = {...genome, scale: maxScale};
  }
  loft(s, axialRings, axialRadial, tail.length ? 0.25 : 0.85, 0.25);
  report('axial', axialRings, axialMetas);
  s.end();

  // ---- head (rigid on the head bone except the first station, which shares the last blend ring's weights)
  buildHead(s, graph, hb, pal, at, axis, headCtx, station0, blendRings[blendRings.length - 1]!.w, individual, coatAt);
  // ---- trunk
  if (trunk.length) {
    s.begin('trunk', 'trunk');
    s.region = REGION.head;
    const segs = trunk.map(i => ({bone: bones[i]!, reversed: false}));
    const tr = buildChain(segs, {ringsFor: () => 4, startWeights: [[head, 0.7], [trunk[0]!, 0.3]], dress: (ring, meta) => {
      meta.region = 'head'; meta.along = 1; ring.region = REGION.head;
      const bandK = 0.18 * Math.pow(Math.sin(Math.PI * 4 * meta.f), 8);
      ring.color = (a, p) => mixC(coatAt(p, ringDorsal(a, ring.rx, ring.ry, ring.ryBelow), 'head', 1, meta.fp), pal.accent, bandK);
    }});
    setFootprints(tr.rings, tr.metas, 12);
    loft(s, tr.rings, 12, 0.2, 0.35);
    report('trunk', tr.rings, tr.metas);
    // a rounded, slightly swollen tip with a darker nostril rim instead of a flat plate
    const tip = bones[trunk[trunk.length - 1]!]!, r0 = tip.end.h;
    ellipsoid(s, at(tip, tip.length - r0 * 0.15, 0, 0), [axis(tip, 1, 0, 0), axis(tip, 0, 1, 0), axis(tip, 0, 0, 1)], [r0 * 0.9, r0 * 1.12, r0 * 1.12], one(tip.index),
      (a, f, p) => mixC(coatAt(p, Math.sin(a), 'head', 1), pal.keratin, 0.45 * smooth(0.65, 0.9, f)), 12, 6);
    s.end();
  }

  // ---- tail extras
  if (tail.length) {
    const tip = bones[tail[tail.length - 1]!]!, tipEnd = at(tip, tip.length);
    const ax = axis(tip, 1, 0, 0), ay = axis(tip, 0, 1, 0), az = axis(tip, 0, 0, 1);
    s.begin('tail-tip', r.tail);
    s.region = REGION['tail-tip'];
    if (r.tail === 'tufted') ellipsoid(s, tipEnd.clone().addScaledVector(ax, tip.end.h * 2), [ax, ay, az], [Math.max(tip.length * 0.9, tip.end.h * 4), tip.end.h * 2.6, tip.end.h * 2.6], one(tip.index),
      (a, f, p) => mixC(mixC(coatAt(p, Math.sin(a), 'tail-tip', 1), pal.accent, 0.75), pal.keratin, 0.4 + 0.2 * Math.sin(a * 5 + f * 9)), 10, 6);
    if (r.tail === 'club') {
      const rr = Math.max(tip.end.h * 2.4, L * 0.05);
      ellipsoid(s, tipEnd.clone().addScaledVector(ax, rr * 0.6), [ax, ay, az], [rr * 1.1, rr * 0.8, rr * 1.3], one(tip.index), () => pal.horn, 12, 7);
      for (const side of [-1, 1]) ellipsoid(s, tipEnd.clone().addScaledVector(ax, rr * 0.6).addScaledVector(az, side * rr * 1.2), [ax, ay, az], [rr * 0.55, rr * 0.45, rr * 0.5], one(tip.index), () => pal.horn, 8, 4);
    }
    if (r.tail === 'feather-fan') {
      const span = composerFeatherFanSpan(r, L), feathers = Math.max(5, 9 + traits.countScale.feather);
      for (let k = 0; k < feathers; k++) {
        const ang = mix(-0.75, 0.75, k / (feathers - 1)), dir = ax.clone().multiplyScalar(Math.cos(ang)).addScaledVector(az, Math.sin(ang)).normalize();
        const side = V().crossVectors(ay, dir).normalize(), len = span * (1 - 0.18 * Math.abs(ang)) * (1 + 0.24 * individual.jv * (jitterU(individual.featherSeed, k, 0) - 0.5));
        const wdt = span * 0.11;
        slab(s, tipEnd.clone().addScaledVector(ay, 0.004 * k * span / feathers), dir, side, [[-0.02 * len, 0], [0.3 * len, -wdt * 0.5], [0.85 * len, -wdt * 0.55], [len, 0], [0.85 * len, wdt * 0.55], [0.3 * len, wdt * 0.5]], span * 0.012, one(tip.index), (x) => mixC(pal.accent, pal.keratin, smooth(0.7, 1, x / len) * 0.7));
      }
    }
    s.end();
  }

  // ---- limbs
  /** Torso skin weights at a carrier bone fraction (the axial chain's smoothstep blend). */
  const carrierWeights = (carrier: ComposerBone, f: number): W => {
    const k = axialSegs.findIndex(sg => sg.bone.index === carrier.index);
    const prev = k > 0 ? axialSegs[k - 1]!.bone : undefined, next = k >= 0 ? axialSegs[k + 1]?.bone : undefined;
    if (f < 0.5 && prev) { const wp = 0.5 * (1 - smooth(0, 0.5, f)); return [[prev.index, wp], [carrier.index, 1 - wp]]; }
    if (f > 0.5 && next) { const wn = 0.5 * smooth(0.5, 1, f); return [[next.index, wn], [carrier.index, 1 - wn]]; }
    return [[carrier.index, 1]];
  };
  const limbChain = (limb: ComposerLimb, segBones: ComposerBone[], kind: 'leg' | 'arm', chainName: string) => {
    const arth = kind === 'leg' && r.legs === 'arthropod';
    const radial = kind === 'arm' ? T.armRadial : arth ? T.legRadialArthropod : T.legRadial;
    const R = kind === 'arm' ? T.armRings : arth ? T.legRingsArthropod : T.legRings;
    const upper = segBones[0]!, carrier = bones[limb.socketBone]!, footBone = kind === 'leg' ? bones[limb.bones[limb.bones.length - 1]!]! : undefined;
    const lowerTotal = segBones.slice(1).reduce((a, b) => a + b.length, 0);
    const lowerStart = new Map<number, number>(); { let acc = 0; for (const b of segBones.slice(1)) { lowerStart.set(b.index, acc); acc += b.length; } }
    const S = P(upper), dir = axis(upper, 1, 0, 0), qInv = Q(carrier).invert(), PC = P(carrier);
    const cAlong = clamp(S.clone().sub(PC).dot(axis(carrier, 1, 0, 0)), 0, carrier.length), fc = cAlong / Math.max(carrier.length, 1e-9);
    const csec = {w: mix(carrier.start.w, carrier.end.w, fc), h: mix(carrier.start.h, carrier.end.h, fc), yc: mix(carrier.start.yc, carrier.end.yc, fc)};
    const local = (p: THREE.Vector3) => p.clone().sub(PC).applyQuaternion(qInv);
    const inside = (x: number) => { const q = local(S.clone().addScaledVector(dir, x)), yy = (q.y - csec.yc) / csec.h, zz = q.z / csec.w; return yy * yy + zz * zz < 1; };
    // where the limb axis leaves the body
    let xe = 0;
    if (inside(0)) {
      const steps = 32; let lo = 0, hi = upper.length;
      for (let i = 1; i <= steps; i++) { const x = upper.length * i / steps; if (!inside(x)) { hi = x; break; } lo = x; }
      for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (inside(m)) lo = m; else hi = m; }
      xe = hi;
    }
    const qe = local(S.clone().addScaledVector(dir, xe));
    const nS = V(0, (qe.y - csec.yc) / (csec.h * csec.h), qe.z / (csec.w * csec.w)).applyQuaternion(Q(carrier)).normalize();
    const torsoDorsal = (p: THREE.Vector3) => { const q = local(p), y = (q.y - csec.yc) / (csec.h * csec.h), z = q.z / (csec.w * csec.w), n = Math.hypot(y, z); return n > 1e-12 ? y / n : 0; };
    const fE = clamp(xe / upper.length, 0, 0.9);
    const sE = upper.start, eE = upper.end, rE = Math.max(1e-4, mix((sE.w + sE.h) / 2, (eE.w + eE.h) / 2, fE));
    const cosI = Math.max(0.35, Math.abs(dir.dot(nS)));
    const x0 = xe - 0.3 * rE / cosI, x3 = Math.max(x0 + 0.6 * rE, xe + 0.1 * rE);
    const f3 = clamp(x3 / upper.length, 0.01, 0.45);
    const thighCap = Math.abs(limb.socket[2]) * 0.9;
    const latCapLimb = 0.35 * Math.max(2 * Math.abs(limb.socket[2]), 1e-6);
    const deepCannon = kind === 'leg' && (r.legs === 'unguligrade' || r.legs === 'digitigrade');
    const basisCache = new WeakMap<Ring, {u: THREE.Vector3; v: THREE.Vector3}>();
    const limbColour = (ring: Ring, region: CoatRegion, along: number, fp: number, rootness: number, a: number, p: THREE.Vector3): RGB => {
      let b = basisCache.get(ring);
      if (!b) { const t = ring.t.clone().normalize(), u = ring.u.clone().addScaledVector(t, -ring.u.dot(t)).normalize(); b = {u, v: V().crossVectors(u, t)}; basisCache.set(ring, b); }
      const nl = ringLateral(a, ring.rx, ring.ry, ring.ryBelow), nd = ringDorsal(a, ring.rx, ring.ry, ring.ryBelow);
      const nz = b.v.z * nl + b.u.z * nd, ny = b.v.y * nl + b.u.y * nd, medial = -limb.side * nz;
      // limbs have no spine: outer and upper faces read as dorsal, the inner (medial) face as belly
      let dorsal = clamp(0.35 - 0.9 * medial + 0.5 * ny, -1, 1);
      if (rootness > 0) dorsal = mix(dorsal, torsoDorsal(p), rootness);
      const c = coatAt(p, dorsal, region, along, fp);
      return arth && r.palette === 'ink' ? mixC(c, pal.accent, 0.85) : c;
    };
    const chain = buildChain(segBones.map(b => ({bone: b, reversed: false})), {
      ringsFor: () => R, endBone: footBone?.index, rootF: f3,
      dress: (ring, meta) => {
        const {bone, f, sec} = meta, bi = segBones.indexOf(bone);
        const region: CoatRegion = bi === 0 ? 'limb-upper' : 'limb-lower';
        const along = bi === 0 ? f : ((lowerStart.get(bone.index) ?? 0) + f * bone.length) / Math.max(lowerTotal, 1e-9);
        meta.region = region; meta.along = along; ring.region = REGION[region];
        let k = 1;
        if (!arth) {
          if (bi === 0) k += 0.45 * smooth(0, 0.2, f) * (1 - smooth(0.3, 0.7, f));   // thigh / upper arm
          if (bi === 1) k += 0.12 * gauss(f, 0.45, 0.15);                             // gaskin / forearm
          if (bi >= 1) k += 0.12 * (1 - smooth(0.03, 0.14, f));                       // condyle at the joint
        }
        let rx = Math.min(sec.w * k, sec.w + latCapLimb);
        const ry = sec.h * k;
        // upright limbs: the thigh never crosses the body midline
        if (bi === 0 && Math.abs(axis(bone, 0, 0, 1).z) > 0.7 && Math.abs(axis(bone, 1, 0, 0).y) > 0.6) rx = Math.min(rx, Math.max(thighCap, 0.55 * sec.w));
        ring.rx = rx; ring.ry = ry; ring.ryBelow = ry;
        const rootness = bi === 0 ? 1 - smooth(0, 0.3, f) : 0;
        ring.color = (a, p) => limbColour(ring, region, along, meta.fp, rootness, a, p);
      },
      after: (ring, meta) => {
        // unguligrade / digitigrade cannons: deeper fore-aft than wide
        if (deepCannon && segBones.indexOf(meta.bone) >= 1) ring.rx = (ring.ry + (ring.ryBelow ?? ring.ry)) / (2 * 1.3);
      },
    });
    // root transition rings: from a flattened ellipse inside the body surface to the first limb ring
    const ring3 = chain.rings[0]!, meta3 = chain.metas[0]!;
    const nPerp = nS.clone().addScaledVector(ring3.t, -nS.dot(ring3.t));
    const squashDir = nPerp.lengthSq() > 0.01 ? nPerp.normalize() : undefined;
    const cw = carrierWeights(carrier, fc);
    const rootRings: Ring[] = [], rootMetas: Meta[] = [];
    const ROOT: [number, number, number][] = [[0, 1, 0.18], [1 / 3, 0.7, 0.12], [2 / 3, 0.35, 0.06]];
    for (const [sF, carrierShare, cavityK] of ROOT) {
      const grow = mix(1.15, 1, sF), c = S.clone().addScaledVector(dir, x0).lerp(ring3.c, sF), t = dir.clone().lerp(ring3.t, sF).normalize();
      const weights: W = [...cw.map(([b, w]) => [b, w * carrierShare] as [number, number]), [upper.index, 1 - carrierShare]];
      const ring: Ring = {c, t, u: ring3.u.clone(), rx: ring3.rx * grow, ry: ring3.ry * grow, ryBelow: (ring3.ryBelow ?? ring3.ry) * grow, w: weights, region: REGION['limb-upper'], color: () => [0, 0, 0]};
      if (squashDir) ring.squash = [squashDir, 0.4 * (1 - sF)];
      const meta: Meta = {kind: 'root', bone: upper, k: 0, f: mix(x0, x3, sF) / upper.length, sec: meta3.sec, fp: 0, along: 0, region: 'limb-upper'};
      // stretch: cavity shading where the limb meets the body, strongest on the ventral side
      ring.color = (a, p) => scaleC(limbColour(ring, 'limb-upper', 0, meta.fp, 1, a, p), 1 - cavityK * (0.5 + 0.5 * smooth(0.2, -0.6, torsoDorsal(p))));
      rootRings.push(ring); rootMetas.push(meta);
    }
    const rings = [...rootRings, ...chain.rings], metas = [...rootMetas, ...chain.metas];
    setFootprints(rings, metas, radial);
    // a small start cap keeps the buried root closed (positive part volume) without a visible collar
    loft(s, rings, radial, 0.1, kind === 'arm' ? 0.3 : 0.4);
    report(chainName, rings, metas);
  };
  for (const limb of graph.limbs) {
    const carrier = bones[limb.socketBone]!;
    const tag = `${limb.side < 0 ? 'L' : 'R'}`;
    if (limb.kind === 'leg') {
      const name = `leg ${limb.pair + 1}${tag}`;
      s.begin('leg', name);
      s.region = REGION['limb-upper'];
      const firstVertex = s.nv, footBone = bones[limb.bones[limb.bones.length - 1]!]!;
      limbChain(limb, limb.bones.slice(0, limb.segments.length).map(i => bones[i]!), 'leg', name);
      s.end();
      s.begin('foot', `${r.feet} ${limb.pair + 1}${tag}`);
      s.region = REGION.foot;
      buildFoot(s, r.feet, footBone, bones[limb.bones[limb.bones.length - 2]!]!, limb.footHeight, limb.footLength, limb.side, pal, at, axis, p => coatAt(p, 0, 'foot', 1));
      s.end();
      fitFootContract(s, firstVertex, footBone, limb.footHeight, limb.footExtent);
    } else if (limb.kind === 'arm') {
      s.begin('arm', `arm ${tag}`);
      s.region = REGION['limb-upper'];
      limbChain(limb, limb.bones.slice(0, 2).map(i => bones[i]!), 'arm', `arm ${tag}`);
      s.end();
      s.begin('hand', `${r.hands} ${tag}`);
      s.region = REGION.foot;
      buildHand(s, r.hands, bones[limb.bones[1]!]!, bones[limb.bones[2]!]!, bones[limb.bones[3]!]!, limb.side, pal, at, axis, p => coatAt(p, 0, 'foot', 1));
      s.end();
    } else {
      s.begin('wing', `${r.wings} wing ${tag}`);
      s.region = REGION.wing;
      buildWing(s, graph, limb.bones.map(i => bones[i]!), carrier, limb.side, pal, at, axis, (p, u) => coatAt(p, 0.6, 'wing', u));
      s.end();
    }
  }

  // ---- armor
  if (r.armor !== 'none') { s.begin('armor', r.armor); s.region = REGION.armor; buildArmor(s, graph, pal, at, axis, seed, individual); s.end(); }
  s.end();

  const positions = new Float32Array(s.p.subarray(0, s.nv * 3)), colors = s.c.slice(0, s.nv * 3), skinIndex = s.si.slice(0, s.nv * 4), skinWeight = s.sw.slice(0, s.nv * 4), index = s.ix.slice(0, s.ni), regions = s.rg.slice(0, s.nv);
  const out: ComposerSkin = {version: COMPOSER_SKIN_VERSION, positions, colors, skinIndex, skinWeight, index, regions, parts: s.parts, vertexCount: positions.length / 3, triangleCount: index.length / 3};
  if (options.debug) out.debug = {
    rings: debugRings!, splineFallbacks,
    coat: {pattern: genome.pattern, requestedScale, effectiveScale: genome.scale, cellsPerBody: cells, meanCellDiameter: cells > 0 ? scale / (cells * genome.scale) : Infinity, torsoEdgeEstimate: torsoEdge},
    traitsNeutral: traits.neutral,
  };
  return out;
}

/** Head-surface colour helpers shared by the neck blend rings and the head loft, so the seam matches exactly. */
function makeHeadColours(r: ComposerRecipe, d: ComposerGraph['dims'], coatAt: CoatAt, radial: number, scale: number) {
  const H = d.headLength, sn = d.snoutLength, muzzleFrom = r.head === 'muzzle' || r.head === 'jaws' || r.head === 'flat-face' ? 0.4 * H : Infinity;
  const region = (x: number): CoatRegion => x >= muzzleFrom ? 'muzzle' : 'head';
  const along = (x: number) => x >= muzzleFrom ? clamp((x - muzzleFrom) / Math.max(sn, 1e-3), 0, 1) : clamp(x / (0.4 * H + sn), 0, 1);
  const col = (x: number, sw: number, sh: number) => {
    const reg = region(x), al = along(x), fp = TAU * 0.5 * (sw + sh) / radial / scale;
    return (a: number, p: THREE.Vector3): RGB => coatAt(p, ringDorsal(a, sw, sh), reg, al, fp);
  };
  return {region, along, col, radial};
}

function buildHead(s: Skin, graph: ComposerGraph, hb: ComposerBone, pal: Palette, at: At, axis: Axis, hc: ReturnType<typeof makeHeadColours>, st0: HeadStation, firstWeights: W, ind: SkinIndividual, coatAt: CoatAt) {
  const r = graph.recipe, d = graph.dims, H = d.headLength, cW = d.craniumWidth, cH = d.craniumHeight, sn = d.snoutLength, tr = ind.traits;
  const ax = axis(hb, 1, 0, 0), ay = axis(hb, 0, 1, 0), az = axis(hb, 0, 0, 1), w = [[hb.index, 1]] as W;
  const seg = hc.radial;
  const station = (x: number, sw: number, sh: number, yc: number, color?: (a: number, p: THREE.Vector3) => RGB): Ring => ({c: at(hb, x, yc), t: ax, u: ay, rx: sw, ry: sh, w, color: color ?? hc.col(x, sw, sh), region: REGION[hc.region(x)]});
  // the first station coincides with the last neck blend ring (same centre, section, basis, colour and weights)
  const first = (): Ring => ({...station(st0.x, st0.w, st0.h, st0.yc), w: firstWeights});
  s.begin('head', r.head);
  s.region = REGION.head;
  let tipX = 0.4 * H + sn, tipY = -0.2 * cH, tipH = 0.5 * cH;
  if (r.head === 'muzzle' || r.head === 'jaws') {
    const jaws = r.head === 'jaws', flatten = jaws ? 0.82 : 1;
    const rings = [first(), station(0.36 * H, 0.92 * cW, 0.88 * cH * flatten, -0.06 * cH)];
    const n = 4;
    for (let i = 1; i <= n; i++) {
      const f = i / n, x = 0.4 * H + sn * f, sw = mix(0.8, jaws ? 0.5 : 0.48, f) * cW, sh = mix(0.82, jaws ? 0.36 : 0.52, f) * cH, base = hc.col(x, sw, sh);
      const mouth = (a: number, p: THREE.Vector3): RGB => { const c = base(a, p); const line = Math.abs(Math.sin(a) + (jaws ? 0.25 : 0.35)) < (jaws ? 0.07 : 0.05) && Math.abs(Math.cos(a)) > 0.5; return line ? pal.keratin : jaws ? c : f > 0.75 ? mixC(c, pal.skin, 0.6) : c; };
      rings.push(station(x, sw, sh, mix(-0.08, jaws ? -0.12 : -0.24, f) * cH, mouth));
    }
    loft(s, rings, seg, 0.2, jaws ? 0.55 : 0.45);
    tipY = (jaws ? -0.12 : -0.24) * cH; tipH = (jaws ? 0.36 : 0.52) * cH;
    s.region = REGION.muzzle;
    if (!jaws) for (const side of [-1, 1]) ellipsoid(s, at(hb, tipX + 0.02 * H, tipY + 0.15 * cH, side * 0.18 * cW), [ax, ay, az], [0.03 * H, 0.06 * cH, 0.06 * cW], w, () => pal.eye, 6, 3);
    if (jaws) for (const side of [-1, 1]) for (let k = 0; k < 6; k++) {
      const f = 0.15 + 0.13 * k, x = 0.4 * H + sn * f, sw = mix(0.8, 0.5, f) * cW * 0.93, y = mix(-0.08, -0.12, f) * cH - mix(0.82, 0.36, f) * cH * 0.25;
      tube(s, [at(hb, x, y, side * sw), at(hb, x + 0.01 * H, y - 0.07 * cH, side * sw * 0.97)], [0.028 * cH, 0.004 * cH], [w, w], () => [0.92, 0.9, 0.82], 5, 0.2, 0.1);
    }
    if (!jaws && r.horns !== 'ossicones' && r.horns !== 'paired') {
      s.begin('head', `${r.head} ears`);
      s.region = REGION.ear;
      const es = tr.earScale;
      for (const side of [-1, 1]) {
        const base = at(hb, 0.04 * H, 0.75 * cH, side * 0.55 * cW), dir = ay.clone().multiplyScalar(0.8).addScaledVector(az, side * 0.6).addScaledVector(ax, -0.25).normalize();
        ellipsoid(s, base.clone().addScaledVector(dir, 0.16 * H * es), [dir, ax.clone().negate(), az], [0.18 * H * es, 0.03 * H * es, 0.09 * H * es], w, (_a, f, p) => mixC(coatAt(p, 0.4, 'ear', f), pal.skin, 0.25), 8, 4);
      }
    }
  } else if (r.head === 'beak') {
    loft(s, [first(), station(0.4 * H, 0.62 * cW, 0.66 * cH, 0.02 * cH)], seg, 0.2, 0.3);
    const len = Math.max(sn, 0.15 * H), n = 6, upper: Ring[] = [], lower: Ring[] = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n, x = 0.36 * H + len * f, hook = len < 0.35 * H ? smooth(0.6, 1, f) * 0.18 : 0;
      upper.push(station(x, mix(0.55, 0.06, Math.pow(f, 0.8)) * cW, mix(0.42, 0.05, Math.pow(f, 0.9)) * cH, (0.08 - 0.12 * f - hook) * cH, () => pal.keratin));
      if (f <= 0.85) lower.push(station(x, mix(0.45, 0.08, f / 0.85) * cW, mix(0.22, 0.04, f / 0.85) * cH, (-0.3 - 0.02 * f) * cH, () => mixC(pal.keratin, [0, 0, 0], 0.25)));
    }
    s.region = REGION.muzzle;
    for (const rg of [...upper, ...lower]) rg.region = REGION.muzzle;
    loft(s, upper, 12, 0.2, 0.3); loft(s, lower, 10, 0.2, 0.3);
    tipX = 0.36 * H + len; tipY = -0.05 * cH; tipH = 0.1 * cH;
  } else if (r.head === 'flat-face') {
    const skinBelow = (base: (a: number, p: THREE.Vector3) => RGB) => (a: number, p: THREE.Vector3) => Math.sin(a) < 0.2 ? pal.skin : base(a, p);
    loft(s, [first(), station(0.4 * H, 0.86 * cW, 0.86 * cH, -0.02 * cH, skinBelow(hc.col(0.4 * H, 0.86 * cW, 0.86 * cH))), station(0.48 * H, 0.55 * cW, 0.5 * cH, -0.1 * cH, () => pal.skin)], seg, 0.2, 0.45);
    const len = Math.max(0.05 * H, sn * 0.6);
    loft(s, [station(0.36 * H, 0.55 * cW, 0.45 * cH, -0.4 * cH, () => pal.skin), station(0.36 * H + len, 0.42 * cW, 0.34 * cH, -0.42 * cH, () => pal.skin)].map(rg => ({...rg, region: REGION.muzzle})), 14, 0.3, 0.6);
    ellipsoid(s, at(hb, 0.4 * H, 0.22 * cH, 0), [ax, ay, az], [0.08 * H, 0.12 * cH, 0.9 * cW], w, () => mixC(pal.base, pal.keratin, 0.3), 12, 4);
    s.region = REGION.ear;
    const es = tr.earScale;
    for (const side of [-1, 1]) ellipsoid(s, at(hb, 0.12 * H, 0, side * 0.96 * cW), [ax, ay, az], [0.08 * H * es, 0.2 * cH * es, 0.05 * cW * es], w, () => pal.skin, 8, 4);
    tipX = 0.36 * H + len; tipY = -0.42 * cH; tipH = 0.34 * cH;
  } else if (r.head === 'blunt') {
    const xt = 0.6 * H + sn * 0.3, base = hc.col(xt, 0.75 * cW, 0.75 * cH);
    loft(s, [first(), station(xt, 0.75 * cW, 0.75 * cH, 0, (a, p) => mixC(base(a, p), pal.skin, 0.5))], seg, 0.2, 0.75);
    s.region = REGION.eye;
    ellipsoid(s, at(hb, 0.6 * H + sn * 0.3 + 0.72 * cW, 0, 0), [ax, ay, az], [0.03 * H, 0.32 * cH, 0.32 * cW], w, () => pal.eye, 10, 3);
    tipX = 0.6 * H + sn * 0.3 + 0.7 * cW; tipY = 0; tipH = 0.5 * cH;
  } else {
    // mandibles: arthropod head capsule with antennae and pincer mouthparts
    loft(s, [first(), station(0.3 * H, cW, cH, 0), station(0.75 * H, 0.8 * cW, 0.75 * cH, -0.1 * cH)], seg, 0.2, 0.5);
    const len = Math.max(0.25 * H, sn * 1.1);
    for (const side of [-1, 1]) {
      const pts = [0, 0.35, 0.7, 1].map(f => at(hb, 0.72 * H + len * f, -0.25 * cH, side * mix(0.55, 0.05, f * f) * cW));
      s.region = REGION.muzzle;
      tube(s, pts, [0.16 * cW, 0.12 * cW, 0.08 * cW, 0.01 * cW], pts.map(() => w), () => pal.keratin, 7, 0.3, 0.1, 0.7);
      const ant = [0, 0.25, 0.5, 0.75, 1].map(f => at(hb, 0.6 * H + 1.5 * H * f, 0.45 * cH + 0.8 * H * f * (1 - 0.4 * f), side * (0.4 * cW + 0.55 * H * f)));
      s.region = REGION.ear;
      tube(s, ant, [0.07, 0.06, 0.05, 0.04, 0.02].map(x => x * cW * tr.earScale), ant.map(() => w), (i) => i % 2 ? pal.accent : pal.keratin, 5, 0.2, 0.2);
      s.region = REGION.eye;
      const er = tr.eyeScale * tr.allometry.eyeRel;
      ellipsoid(s, at(hb, 0.45 * H, 0.35 * cH, side * 0.82 * cW), [ax, ay, az], [0.07 * H * er, 0.18 * cH * er, 0.12 * cW * er], w, () => pal.eye, 6, 3);
    }
    tipX = 0.72 * H + len; tipY = -0.25 * cH; tipH = 0.3 * cH;
  }
  s.end();
  // eyes
  if (r.head !== 'blunt' && r.head !== 'mandibles') {
    s.begin('eyes', 'eyes');
    s.region = REGION.eye;
    const er = (r.head === 'beak' ? 0.17 : r.head === 'flat-face' ? 0.11 : 0.13) * cH * tr.eyeScale * tr.allometry.eyeRel;
    const [ex, ey, ez] = r.head === 'beak' ? [0.2 * H, 0.3 * cH, 0.86 * cW] : r.head === 'flat-face' ? [0.43 * H, 0.06 * cH, 0.42 * cW] : r.head === 'jaws' ? [0.24 * H, 0.52 * cH, 0.72 * cW] : [0.3 * H, 0.38 * cH, 0.8 * cW];
    for (const side of [-1, 1]) ellipsoid(s, at(hb, ex, ey, side * ez), [ax, ay, az], [er, er, er * 0.8], w, (a) => Math.cos(a) * side > 0.75 ? [0.5, 0.48, 0.42] : pal.eye, COMPOSER_SKIN_TESSELLATION.eyeRadial, COMPOSER_SKIN_TESSELLATION.eyeStations);
    s.end();
  }
  // horns: length x hornScale, curl rotated by hornCurl, left/right x (1 +- hornAsym)
  if (r.horns !== 'none') {
    s.begin('horn', r.horns);
    s.region = REGION.horn;
    const hs = tr.hornScale, curl = tr.hornCurl, asym = tr.hornAsym, thick = 0.5 + 0.5 * hs;
    const hornCol = (i: number, n: number, p: THREE.Vector3) => mixC(coatAt(p, 1, 'horn', i / n), pal.keratin, 0.35 + 0.65 * i / n);
    const curled = (pts: THREE.Vector3[], base: THREE.Vector3, about: THREE.Vector3, angle: number) => angle === 0 ? pts : pts.map((p, i) => i === 0 ? p : p.clone().sub(base).applyAxisAngle(about, angle * i / (pts.length - 1)).add(base));
    const grow = (pts: THREE.Vector3[], k: number) => k === 1 ? pts : pts.map((p, i) => i === 0 ? p : p.clone().sub(pts[0]!).multiplyScalar(k).add(pts[0]!));
    if (r.horns === 'nasal') {
      const forehead = r.trunk === 'trunk';
      const x0 = forehead ? 0.12 * H : 0.4 * H + sn * 0.65, y0 = forehead ? 0.9 * cH : (r.head === 'muzzle' ? -0.24 * cH * 0.65 : tipY) + tipH * 0.9 + 0.05 * cH;
      const big = 0.5 * H * hs, root = at(hb, x0, y0, 0);
      const pts = curled([0, 0.33, 0.66, 1].map(f => at(hb, x0 + big * (0.12 * f - 0.25 * f * f), y0 + big * f, 0)), root, az, -curl);
      tube(s, [at(hb, x0, y0 - 0.12 * cH, 0), ...pts], [0.15 * H, 0.14 * H, 0.1 * H, 0.05 * H, 0.008 * H].map(x => x * thick), [w, w, w, w, w], (i, _a, p) => hornCol(i, 4, p), 10, 0.2, 0.15);
      const x1 = forehead ? -0.02 * H : x0 - 0.25 * H, y1 = forehead ? cH * 0.9 : y0 + 0.08 * cH, k2 = hs * (1 + asym);
      tube(s, [at(hb, x1, y1 - 0.1 * cH, 0), at(hb, x1 + 0.02 * H * k2, y1 + 0.12 * H * k2, 0), at(hb, x1 - 0.02 * H * k2, y1 + 0.22 * H * k2, 0)], [0.09 * H, 0.06 * H, 0.008 * H].map(x => x * (0.5 + 0.5 * k2)), [w, w, w], (i, _a, p) => hornCol(i, 2, p), 8, 0.2, 0.15);
    } else if (r.horns === 'paired') {
      for (const side of [-1, 1]) {
        const k = hs * (1 + side * asym), raw = [V(0.05, 0.7, 0.55), V(0.0, 0.95, 0.85), V(-0.12, 1.25, 1.15), V(-0.15, 1.75, 1.2), V(-0.05, 2.1, 1.0)].map(p => at(hb, p.x * H, p.y * cH, side * p.z * cW));
        const pts = curled(grow(raw, k), raw[0]!, az, -curl * side);
        tube(s, pts, [0.1 * H, 0.08 * H, 0.06 * H, 0.035 * H, 0.006 * H].map(x => x * (0.5 + 0.5 * k)), pts.map(() => w), (i, _a, p) => hornCol(i, 4, p), 9, 0.2, 0.15);
      }
    } else if (r.horns === 'ossicones') {
      for (const side of [-1, 1]) {
        const k = hs * (1 + side * asym), base = at(hb, 0.02 * H, 0.8 * cH, side * 0.35 * cW);
        const [, top] = curled(grow([base, at(hb, -0.03 * H, 0.8 * cH + 0.32 * H, side * 0.42 * cW)], k), base, az, -curl);
        tube(s, [base, top!], [0.055 * H, 0.045 * H].map(x => x * (0.5 + 0.5 * k)), [w, w], (_i, a, p) => mixC(coatAt(p, Math.sin(a), 'head', 0.2), pal.accent, 0.3), 9, 0.2, 0.2);
        ellipsoid(s, top!, [ax, ay, az], [0.06 * H, 0.06 * H, 0.06 * H].map(x => x * (0.5 + 0.5 * k)) as [number, number, number], w, () => pal.keratin, 8, 4);
      }
    } else if (r.horns === 'crest') {
      const crestH = Math.max(0.5 * cH, 0.25 * H) * hs;
      slab(s, at(hb, 0, 0.82 * cH, 0), ax, ay, [[-0.12 * H, 0], [0.05 * H, crestH * 0.9], [0.22 * H, crestH], [0.42 * H, crestH * 0.45], [0.5 * H, 0]], 0.07 * cW, w, (x, y) => mixC(pal.accent, pal.plate, y / crestH * 0.6 + x * 0));
    }
    s.end();
  }
}

/** Enforces the rig's foot contract on a leg's vertices: anything below the ankle moves rigidly with the
 * level foot bone, and foot-rigid vertices are kept inside x in [-back, front], y >= -footHeight of the foot
 * frame. Soles become flat contact patches at exactly the rig's sole plane, so a planted foot neither sinks
 * into nor hovers above the floor, and the rig's swing-pitch limit covers every foot vertex. */
function fitFootContract(s: Skin, firstVertex: number, foot: ComposerBone, hF: number, [back, front]: [number, number]) {
  const origin = V(...foot.restPosition), inverse = new THREE.Quaternion(...foot.restQuaternion).invert(), rotate = new THREE.Quaternion(...foot.restQuaternion);
  for (let i = firstVertex; i < s.nv; i++) {
    let footWeight = 0;
    for (let k = 0; k < 4; k++) if (s.si[i * 4 + k] === foot.index) footWeight += s.sw[i * 4 + k]!;
    if (footWeight <= 0) continue;
    const local = s.pos(i).sub(origin).applyQuaternion(inverse);
    if (footWeight < 0.999) { if (local.y >= 0) continue; for (let k = 0; k < 4; k++) { s.si[i * 4 + k] = k ? 0 : foot.index; s.sw[i * 4 + k] = k ? 0 : 1; } }
    local.set(clamp(local.x, -back, front), Math.max(local.y, -hF), local.z);
    const p = local.applyQuaternion(rotate).add(origin);
    s.p[i * 3] = p.x; s.p[i * 3 + 1] = p.y; s.p[i * 3 + 2] = p.z;
  }
}

function buildFoot(s: Skin, type: ComposerRecipe['feet'], foot: ComposerBone, shank: ComposerBone, hF: number, lF: number, side: number, pal: Palette, at: At, axis: Axis, coat: (p: THREE.Vector3) => RGB) {
  const w = [[foot.index, 1]] as W, wb = [[foot.index, 0.6], [shank.index, 0.4]] as W;
  const ax = axis(foot, 1, 0, 0), ay = axis(foot, 0, 1, 0), az = axis(foot, 0, 0, 1);
  const r0 = Math.max(shank.end.w, 1e-3);
  const vertical = (pts: [number, number, number, number][], color: (i: number, p: THREE.Vector3) => RGB, seg: number, capEnd = 0.25) => {
    // [x, y, rx, rz] stations stacked downward in the foot frame
    const rings: Ring[] = pts.map(([x, y, rx, rz], i) => ({c: at(foot, x, y), t: ay.clone().negate(), u: ax, rx: rz, ry: rx, w: i === 0 ? wb : w, color: (_a, p) => color(i, p)}));
    loft(s, rings, seg, 0.15, capEnd);
  };
  if (type === 'hoof') {
    vertical([[0, 0.25 * hF, r0, r0], [0.05 * lF, -0.3 * hF, r0 * 1.15, r0 * 1.1], [0.18 * lF, -1.02 * hF, r0 * 1.35, r0 * 1.2]], (i, p) => i === 0 ? mixC(pal.keratin, coat(p), 0.4) : pal.keratin, 12, 0.08);
  } else if (type === 'pad') {
    vertical([[0, 0.3 * hF, r0, r0], [0.02 * lF, -0.4 * hF, r0 * 1.2, r0 * 1.2], [0.05 * lF, -1.02 * hF, r0 * 1.35, r0 * 1.3]], (_i, p) => mixC(coat(p), pal.skin, 0.3), 14, 0.06);
    for (let k = -1; k <= 1; k++) ellipsoid(s, at(foot, 0.05 * lF + r0 * 1.25 * Math.cos(k * 0.5), -0.8 * hF, r0 * 1.2 * Math.sin(k * 0.5)), [ax, ay, az], [r0 * 0.18, hF * 0.22, r0 * 0.3], w, () => [0.78, 0.72, 0.62], 6, 3);
  } else if (type === 'paw') {
    ellipsoid(s, at(foot, 0.25 * lF, -0.45 * hF), [ax, ay, az], [0.42 * lF, 0.55 * hF + 0.01 * lF, Math.max(r0 * 1.15, 0.28 * lF)], wb, (_a, _f, p) => mixC(coat(p), pal.accent, 0.2), 10, 5);
    for (let k = 0; k < 4; k++) {
      const z = (k - 1.5) * 0.17 * lF, x = 0.62 * lF - Math.abs(k - 1.5) * 0.06 * lF;
      ellipsoid(s, at(foot, x, -0.62 * hF, z), [ax, ay, az], [0.12 * lF, 0.38 * hF, 0.085 * lF], w, (_a, _f, p) => coat(p), 7, 4);
      tube(s, [at(foot, x + 0.08 * lF, -0.5 * hF, z), at(foot, x + 0.17 * lF, -0.85 * hF, z)], [0.03 * lF, 0.003 * lF], [w, w], () => pal.keratin, 5, 0.1, 0.1);
    }
  } else if (type === 'claw' || type === 'hand') {
    const hand = type === 'hand', toeR = hand ? 0.06 * lF : Math.max(0.035 * lF, 0.45 * hF);
    const toes = hand ? [-0.36, -0.12, 0.12, 0.36] : [-0.42, 0, 0.42];
    if (hand) ellipsoid(s, at(foot, 0.32 * lF, -0.6 * hF), [ax, ay, az], [0.36 * lF, 0.4 * hF, 0.22 * lF], wb, () => pal.skin, 10, 5);
    else ellipsoid(s, at(foot, 0.02 * lF, -0.3 * hF), [ax, ay, az], [toeR * 2, toeR * 1.5, toeR * 2], wb, () => mixC(pal.keratin, pal.skin, 0.5), 8, 4);
    for (const a of toes) {
      const len = (hand ? 0.55 : 1 - 0.25 * Math.abs(a)) * lF, base = hand ? at(foot, 0.6 * lF, -0.6 * hF, a * 0.5 * lF) : at(foot, 0.02 * lF, -0.4 * hF, 0);
      const dir = ax.clone().multiplyScalar(Math.cos(a)).addScaledVector(az, Math.sin(a) * side * (hand ? 0.3 : 1)).normalize();
      const pts = [0, 0.35, 0.7, 0.95].map(f => base.clone().addScaledVector(dir, len * f).addScaledVector(ay, -hF * 0.55 * f + (hand ? 0 : hF * 0.1)));
      tube(s, pts, [toeR, toeR * 0.85, toeR * 0.7, toeR * 0.5], pts.map(() => w), () => hand ? pal.skin : mixC(pal.keratin, pal.skin, 0.55), 7, 0.3, 0.2);
      const tip = pts[3]!, claw = [tip, tip.clone().addScaledVector(dir, toeR * 2.2).addScaledVector(ay, -toeR * 0.2), tip.clone().addScaledVector(dir, toeR * 3.6).addScaledVector(ay, -toeR * 1.1)];
      tube(s, claw, [toeR * 0.5, toeR * 0.32, toeR * 0.03], [w, w, w], () => pal.keratin, 6, 0.1, 0.1);
    }
    // hallux / thumb: backward (bird, dinosaur) or sideways (grasping foot)
    const hDir = hand ? ax.clone().multiplyScalar(0.3).addScaledVector(az, -side * 0.95).normalize() : ax.clone().negate().addScaledVector(az, -side * 0.15).normalize();
    const hb = hand ? at(foot, 0.25 * lF, -0.6 * hF, -side * 0.2 * lF) : at(foot, 0, -0.5 * hF, 0);
    const hp = [0, 0.5, 1].map(f => hb.clone().addScaledVector(hDir, (hand ? 0.35 : 0.3) * lF * f).addScaledVector(ay, -0.4 * hF * f));
    tube(s, hp, [toeR * 0.9, toeR * 0.7, toeR * 0.35], [w, w, w], () => hand ? pal.skin : pal.keratin, 6, 0.3, 0.2);
  } else {
    // spike: tapered tarsus tip
    tube(s, [at(foot, 0, 0.25 * hF), at(foot, 0.08 * hF, -0.5 * hF), at(foot, 0.12 * hF, -hF)], [r0, r0 * 0.6, r0 * 0.06], [wb, w, w], (i) => i ? pal.keratin : mixC(pal.keratin, pal.accent, 0.4), 6, 0.1, 0.05);
  }
}

function buildHand(s: Skin, type: ComposerRecipe['hands'], fore: ComposerBone, hand: ComposerBone, finger: ComposerBone, side: number, pal: Palette, at: At, axis: Axis, coat: (p: THREE.Vector3) => RGB) {
  const wh = [[hand.index, 1]] as W, wf = [[finger.index, 1]] as W, wb = [[hand.index, 0.5], [fore.index, 0.5]] as W, wj = [[hand.index, 0.5], [finger.index, 0.5]] as W;
  const ax = axis(hand, 1, 0, 0), ay = axis(hand, 0, 1, 0), az = axis(hand, 0, 0, 1);
  const lh = hand.length, lf = finger.length, r0 = Math.max(fore.end.w, 1e-3);
  if (type === 'pincer') {
    const big = Math.max(lh * 1.6, r0 * 3);
    ellipsoid(s, at(hand, big * 0.45), [ax, ay, az], [big * 0.6, r0 * 1.7, r0 * 1.4], wb, () => mixC(pal.plate, pal.accent, 0.3), 12, 6);
    const fixed = [0, 0.5, 1].map(f => at(hand, big * (0.9 + 0.7 * f), r0 * (0.6 - 0.7 * f * f)));
    tube(s, fixed, [r0 * 0.7, r0 * 0.45, r0 * 0.05], [wh, wh, wh], () => pal.keratin, 8, 0.2, 0.1);
    const dact = [0, 0.5, 1].map(f => at(finger, big * (0.45 + 0.7 * f) - lf * 0, -r0 * (0.6 - 0.6 * f * f)));
    tube(s, dact, [r0 * 0.65, r0 * 0.42, r0 * 0.05], [wf, wf, wf], () => pal.keratin, 8, 0.2, 0.1);
    return;
  }
  const claw = type === 'claw';
  ellipsoid(s, at(hand, lh * 0.5), [ax, ay, az], [lh * 0.62, r0 * 0.7, r0 * (claw ? 1 : 1.25)], wb, (_a, _f, p) => claw ? coat(p) : pal.skin, 10, 5);
  const digits = claw ? [-0.5, 0, 0.5] : [-0.45, -0.15, 0.15, 0.45];
  for (const k of digits) {
    const len = lf * (claw ? 2.2 : 1.6) * (1 - 0.2 * Math.abs(k));
    const base = at(hand, lh * 0.95, 0, k * r0 * 1.6);
    const pts = [base, ...[0.33, 0.66, 1].map(f => at(finger, len * f, -len * 0.18 * f * f, k * r0 * 1.6 * (1 - 0.15 * f)))];
    tube(s, pts, claw ? [r0 * 0.35, r0 * 0.28, r0 * 0.18, r0 * 0.02] : [r0 * 0.28, r0 * 0.24, r0 * 0.2, r0 * 0.14], [wj, wf, wf, wf], () => claw ? pal.keratin : pal.skin, 6, 0.2, claw ? 0.05 : 0.6);
  }
  if (!claw) {
    const tb = at(hand, lh * 0.35, -r0 * 0.3, -side * r0 * 1.1), tdir = ax.clone().addScaledVector(az, -side * 0.8).addScaledVector(ay, -0.3).normalize();
    tube(s, [tb, tb.clone().addScaledVector(tdir, lf * 0.9), tb.clone().addScaledVector(tdir, lf * 1.5)], [r0 * 0.3, r0 * 0.24, r0 * 0.16], [wh, wh, wh], () => pal.skin, 6, 0.2, 0.6);
  }
}

function buildWing(s: Skin, graph: ComposerGraph, chain: ComposerBone[], carrier: ComposerBone, side: number, pal: Palette, at: At, axis: Axis, coat: (p: THREE.Vector3, u: number) => RGB) {
  const r = graph.recipe, feathered = r.wings === 'feathered';
  const total = chain.reduce((a, b) => a + b.length, 0);
  const stations = 16, rows = 4;
  const top: number[][] = [], bottom: number[][] = [];
  const thickness = composerWingThickness(feathered, total);
  const grid: {p: THREE.Vector3; n: THREE.Vector3; w: W; col: RGB}[][] = [];
  for (let i = 0; i <= stations; i++) {
    const sArc = i / stations * total;
    let k = 0, acc = 0; while (k < chain.length - 1 && acc + chain[k]!.length < sArc - 1e-9) { acc += chain[k]!.length; k++; }
    const bone = chain[k]!, local = sArc - acc, f = local / bone.length;
    const lead = at(bone, local), back = axis(bone, 0, 0, 1).multiplyScalar(side), up = axis(bone, 0, 1, 0);
    const u = i / stations;
    const chord = composerWingChord(feathered, total, u);
    const row: typeof grid[number] = [];
    for (let j = 0; j <= rows; j++) {
      const v = j / rows;
      const near = f < 0.5 && k > 0 ? [[chain[k - 1]!.index, 0.5 * (1 - smooth(0, 0.5, f))], [bone.index, 1]] as W : f > 0.5 && k < chain.length - 1 ? [[chain[k + 1]!.index, 0.5 * smooth(0.5, 1, f)], [bone.index, 1]] as W : [[bone.index, 1]] as W;
      let w: W = near;
      // the membrane's inner trailing edge joins the flank
      if (!feathered && u < 0.2) w = [...near.map(([b, x]) => [b, x * (1 - v * (1 - u / 0.2))] as [number, number]), [carrier.index, v * (1 - u / 0.2)]];
      const p = lead.clone().addScaledVector(back, chord * v).addScaledVector(up, chord * 0.06 * Math.sin(Math.PI * v));
      const col: RGB = feathered ? mixC(mixC(coat(p, u), pal.accent, smooth(0.45, 0.9, v) * 0.8), pal.keratin, smooth(0.75, 1, u) * 0.5 * v) : mixC(mixC(pal.skin, pal.accent, 0.35), pal.keratin, 0.25 * smooth(0.6, 1, v));
      row.push({p, n: up, w, col});
    }
    grid.push(row);
  }
  for (const row of grid) {
    top.push(row.map(({p, n, w, col}, j) => s.v(p.clone().addScaledVector(n, thickness * 0.5 * (1 - 0.7 * j / rows)), col, w)));
    bottom.push(row.map(({p, n, w, col}, j) => s.v(p.clone().addScaledVector(n, -thickness * 0.5 * (1 - 0.7 * j / rows)), mixC(col, [0.8, 0.78, 0.74], 0.12), w)));
  }
  const centroid = V(); let count = 0; for (const row of grid) for (const g of row) { centroid.add(g.p); count++; } centroid.multiplyScalar(1 / count);
  for (let i = 0; i < stations; i++) for (let j = 0; j < rows; j++) {
    const n = grid[i]![j]!.n;
    s.to(top[i]![j]!, top[i + 1]![j]!, top[i]![j + 1]!, n); s.to(top[i + 1]![j]!, top[i + 1]![j + 1]!, top[i]![j + 1]!, n);
    const m = n.clone().negate();
    s.to(bottom[i]![j]!, bottom[i + 1]![j]!, bottom[i]![j + 1]!, m); s.to(bottom[i + 1]![j]!, bottom[i + 1]![j + 1]!, bottom[i]![j + 1]!, m);
  }
  // seal the perimeter
  const edge: [number, number][] = [];
  for (let i = 0; i <= stations; i++) edge.push([i, 0]);
  for (let j = 1; j <= rows; j++) edge.push([stations, j]);
  for (let i = stations - 1; i >= 0; i--) edge.push([i, rows]);
  for (let j = rows - 1; j >= 1; j--) edge.push([0, j]);
  for (let e = 0; e < edge.length; e++) {
    const [i0, j0] = edge[e]!, [i1, j1] = edge[(e + 1) % edge.length]!;
    const out = grid[i0]![j0]!.p.clone().add(grid[i1]![j1]!.p).multiplyScalar(0.5).sub(centroid);
    s.to(top[i0]![j0]!, bottom[i0]![j0]!, top[i1]![j1]!, out); s.to(top[i1]![j1]!, bottom[i0]![j0]!, bottom[i1]![j1]!, out);
  }
  // finger struts on membranes, covert feather ridge on feathered wings
  if (!feathered) {
    const hand = chain[chain.length - 1]!;
    for (const a of [0.35, 0.75]) {
      const base = at(hand, 0), dir = axis(hand, 1, 0, 0).multiplyScalar(Math.cos(a)).addScaledVector(axis(hand, 0, 0, 1), side * Math.sin(a)).normalize();
      const len = hand.length * (1.2 - 0.4 * a);
      tube(s, [base, base.clone().addScaledVector(dir, len * 0.5), base.clone().addScaledVector(dir, len)], [hand.start.w * 0.5, hand.start.w * 0.35, hand.start.w * 0.1], [[[hand.index, 1]], [[hand.index, 1]], [[hand.index, 1]]], () => pal.keratin, 5, 0.1, 0.1);
    }
  }
  for (const bone of chain) tube(s, [at(bone, 0), at(bone, bone.length)], [bone.start.w, bone.end.w], [[[bone.index, 1]], [[bone.index, 1]]], (_i, _a, p) => feathered ? coat(p, 0) : pal.skin, 7, 0.4, 0.4);
}

function buildArmor(s: Skin, graph: ComposerGraph, pal: Palette, at: At, axis: Axis, seed: number, ind: SkinIndividual) {
  const r = graph.recipe, bones = graph.bones, torso = graph.chains.torso.map(i => bones[i]!);
  const n = torso.length, total = torso.reduce((a, b) => a + b.length, 0);
  const flexible = r.layout === 'limbless' || r.layout === 'many-legged';
  const sample = (u: number) => {
    // position along the torso chain at fraction u (may extrapolate slightly)
    const x = clamp(u, -0.12, 1.12) * total; let acc = 0, k = 0;
    while (k < n - 1 && acc + torso[k]!.length < x) { acc += torso[k]!.length; k++; }
    const bone = torso[k]!, local = x - acc, f = clamp(local / bone.length, 0, 1);
    const sec = {w: mix(bone.start.w, bone.end.w, f), h: mix(bone.start.h, bone.end.h, f), yc: mix(bone.start.yc, bone.end.yc, f)};
    const prev = torso[k - 1], next = torso[k + 1];
    const w: W = f < 0.5 && prev ? [[prev.index, 0.5 * (1 - smooth(0, 0.5, f))], [bone.index, 1]] : f > 0.5 && next ? [[next.index, 0.5 * smooth(0.5, 1, f)], [bone.index, 1]] : [[bone.index, 1]];
    return {bone, local, sec, w};
  };
  if (r.armor === 'dome') {
    const [u0, u1] = flexible ? [0.33, 0.67] : [-0.08, 1.04];
    const rings: Ring[] = [], count = 10;
    for (let i = 0; i <= count; i++) {
      const u = mix(u0, u1, i / count), {bone, local, sec, w} = sample(u);
      const along = i / count, env = Math.pow(Math.sin(Math.PI * mix(0.08, 0.92, along)), 0.45);
      const c = at(bone, local, sec.yc + sec.h * 0.12);
      const ax = axis(bone, 1, 0, 0), ay = axis(bone, 0, 1, 0);
      rings.push({c, t: ax, u: ay, rx: sec.w * 1.25 * env, ry: sec.h * 1.32 * env, ryBelow: sec.h * Math.min(1.32 * env, 1.1), w, color: a => {
        const up = Math.sin(a);
        if (up < -0.15) return mixC(pal.belly, pal.plate, 0.35);
        const cell = Math.abs(Math.sin(along * Math.PI * 5)) < 0.12 || Math.abs(Math.sin(a * 3)) < 0.1;
        return up < 0.1 ? mixC(pal.plate, pal.belly, 0.4) : cell ? mixC(pal.plate, pal.keratin, 0.6) : mixC(pal.plate, pal.horn, 0.25 + 0.15 * Math.sin(seed + along * 13));
      }});
    }
    // the plastron (lower half) stops at the torso's underside instead of hanging below the belly
    loft(s, rings, 24, 0.25, 0.25);
    return;
  }
  if (r.armor === 'bands') {
    const count = flexible ? n : Math.max(6, n * 2);
    for (let k = 0; k < count; k++) {
      // bands overlap their neighbour but the front band stops at the torso's end: past it the body narrows into the
      // neck and a full-size shell would hang open over it
      const u0 = (k + 0.05) / count, u1 = Math.min((k + 1.15) / count, 0.985);
      const a0 = -0.35, a1 = Math.PI + 0.35, steps = 12;
      const ids: number[][][] = [];
      for (const [ui, u] of [u0, u1].entries()) {
        const {bone, local, sec, w} = sample(u), ay = axis(bone, 0, 1, 0), az = axis(bone, 0, 0, 1), c = at(bone, local, sec.yc);
        const layer: number[][] = [];
        // the exposed ends of the first and last band sink flush into the body instead of showing a dark open lip
        const flush = (k === count - 1 && ui === 1) || (k === 0 && ui === 0);
        for (const scale of flush ? [1.03, 0.95] : [1.16, 1.02]) {
          const row: number[] = [];
          for (let q = 0; q <= steps; q++) {
            const a = mix(a0, a1, q / steps), p = c.clone().addScaledVector(az, -Math.cos(a) * sec.w * scale).addScaledVector(ay, Math.sin(a) * sec.h * scale);
            row.push(s.v(p, mixC(pal.plate, pal.keratin, ui ? 0.35 : 0.1), w));
          }
          layer.push(row);
        }
        ids.push(layer);
      }
      // outer, inner, front, back and arc-end faces
      const [front, back] = ids as [number[][], number[][]];
      const centre = (u: number) => { const {bone, local, sec} = sample(u); return at(bone, local, sec.yc); };
      const cMid = centre((u0 + u1) / 2);
      for (let q = 0; q < steps; q++) {
        const o = (a: number, b: number, c: number, out: THREE.Vector3) => s.to(a, b, c, out);
        const outward = s.pos(front[0]![q]!).sub(cMid);
        o(front[0]![q]!, front[0]![q + 1]!, back[0]![q]!, outward); o(front[0]![q + 1]!, back[0]![q + 1]!, back[0]![q]!, outward);
        o(front[1]![q]!, front[1]![q + 1]!, back[1]![q]!, outward.clone().negate()); o(front[1]![q + 1]!, back[1]![q + 1]!, back[1]![q]!, outward.clone().negate());
        const fw = centre(u0).sub(cMid), bw = centre(u1).sub(cMid);
        o(front[0]![q]!, front[0]![q + 1]!, front[1]![q]!, fw); o(front[0]![q + 1]!, front[1]![q + 1]!, front[1]![q]!, fw);
        o(back[0]![q]!, back[0]![q + 1]!, back[1]![q]!, bw); o(back[0]![q + 1]!, back[1]![q + 1]!, back[1]![q]!, bw);
      }
      for (const q of [0, steps]) {
        const out = s.pos(front[0]![q]!).sub(s.pos(front[0]![steps / 2]!));
        s.to(front[0]![q]!, front[1]![q]!, back[0]![q]!, out); s.to(front[1]![q]!, back[1]![q]!, back[0]![q]!, out);
      }
    }
    return;
  }
  if (r.armor === 'plates') {
    const tailBones = graph.chains.tail.slice(0, Math.ceil(graph.chains.tail.length / 2)).map(i => bones[i]!);
    const list: {bone: ComposerBone; local: number; sec: {w: number; h: number; yc: number}; w: W; size: number}[] = [];
    const count = flexible ? n : Math.max(3, 9 + ind.traits.countScale.plate);
    for (let k = 0; k < count; k++) { const u = (k + 0.5) / count, smp = sample(u); list.push({...smp, size: 0.6 + 0.5 * Math.sin(Math.PI * u)}); }
    for (const [k, bone] of tailBones.entries()) list.push({bone, local: bone.length * 0.5, sec: {w: bone.start.w, h: bone.start.h, yc: 0}, w: [[bone.index, 1]], size: 0.7 - 0.12 * k});
    list.forEach(({bone, local, sec, w, size}, k) => {
      // alternating height noise: neighbouring plates differ, never a perfectly regular comb
      const noise = ind.jv * ((k % 2 ? 0.07 : -0.07) + 0.12 * (jitterU(ind.plateSeed, k, 0) - 0.5));
      const hgt = Math.max(sec.h, graph.dims.torsoHeight * 0.5) * 0.85 * size * (1 + noise), len = hgt * 0.95;
      const ax = axis(bone, bone.part === 'tail' ? -1 : 1, 0, 0), ay = axis(bone, 0, 1, 0), az = axis(bone, 0, 0, 1);
      const base = at(bone, local, sec.yc + sec.h * 0.82).addScaledVector(az, (k % 2 ? 1 : -1) * sec.w * 0.14);
      slab(s, base, ax, ay, [[-len * 0.5, 0], [-len * 0.3, hgt * 0.7], [0, hgt], [len * 0.35, hgt * 0.65], [len * 0.5, 0]], hgt * 0.07, w, (_x, y) => mixC(pal.plate, pal.accent, smooth(0.5, 1, y / hgt) * 0.6));
    });
    return;
  }
  // osteoderms: rows of keeled studs over the back and flanks, jittered per individual (+-0.25 cell, +-15% size)
  const rows = Math.max(3, (flexible ? n * 2 : 10) + ind.traits.countScale.osteoderm), angles = [0.55, 0.95, 1.5707, 2.19, 2.59];
  for (let k = 0; k < rows; k++) for (const [ai, a0] of angles.entries()) {
    const ju = ind.jv * (jitterU(ind.osteoSeed, k, ai * 3) - 0.5) * 0.5, ja = ind.jv * (jitterU(ind.osteoSeed, k, ai * 3 + 1) - 0.5) * 0.2;
    const js = 1 + ind.jv * (jitterU(ind.osteoSeed, k, ai * 3 + 2) - 0.5) * 0.3;
    const u = (k + 0.5 + (ai % 2) * 0.5 + ju) / (rows + 0.5), a = a0 + ja, {bone, local, sec, w} = sample(u);
    const ay = axis(bone, 0, 1, 0), az = axis(bone, 0, 0, 1), c = at(bone, local, sec.yc);
    const normal = az.clone().multiplyScalar(-Math.cos(a) * sec.h).addScaledVector(ay, Math.sin(a) * sec.w).normalize();
    const surface = c.clone().addScaledVector(az, -Math.cos(a) * sec.w * 0.97).addScaledVector(ay, Math.sin(a) * sec.h * 0.97);
    const size = Math.min(sec.w, sec.h) * 0.16 * js;
    tube(s, [surface.clone().addScaledVector(normal, -size * 0.4), surface.clone().addScaledVector(normal, size * 0.55), surface.clone().addScaledVector(normal, size * 0.95)], [size, size * 0.75, size * 0.08], [w, w, w], (i) => i ? mixC(pal.plate, pal.horn, 0.4) : pal.plate, 5, 0.1, 0.05);
  }
}
