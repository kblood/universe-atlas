import * as THREE from 'three';
import {composerHash, composerRandom, type ComposerRecipe} from './fauna-composer-recipe.ts';
import {COAT_PALETTE_HEX} from './fauna-coat-vocab.ts';
import {composerFeatherFanSpan, composerLimbMass, composerWingChord, composerWingThickness, type ComposerBone, type ComposerGraph, type ComposerSection, type Vec3} from './fauna-composer-rig.ts';

/** Procedural, experimental skin for a composer graph. Every visible part is
 * real geometry skinned to explicit bones: chain tubes blend across joints,
 * limb roots start inside the body with a weighted collar, and rigid parts
 * (heads, beaks, horns, feet, hands, shells, plates, feathers) carry full
 * weight on their bone. Output is plain arrays so it can be inspected in tests. */
export const COMPOSER_SKIN_VERSION = 'fauna-composer-skin-1';
export type ComposerSkinPart = 'torso' | 'neck' | 'tail' | 'head' | 'eyes' | 'mouth' | 'horn' | 'trunk' | 'leg' | 'foot' | 'arm' | 'hand' | 'wing' | 'armor' | 'tail-tip';
export interface ComposerSkin {
  version: typeof COMPOSER_SKIN_VERSION;
  positions: Float32Array; normals?: undefined; colors: Float32Array; skinIndex: Uint16Array; skinWeight: Float32Array; index: Uint32Array;
  /** Triangle ranges per anatomical part (start/count in triangles). */
  parts: {part: ComposerSkinPart; label: string; firstTriangle: number; triangles: number; bones: number[]}[];
  vertexCount: number; triangleCount: number;
}
type RGB = [number, number, number];
type W = [number, number][];
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (lo: number, hi: number, v: number) => { const t = clamp((v - lo) / (hi - lo), 0, 1); return t * t * (3 - 2 * t); };
const mixC = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const TAU = Math.PI * 2;

class Skin {
  p: number[] = []; c: number[] = []; si: number[] = []; sw: number[] = []; ix: number[] = [];
  parts: ComposerSkin['parts'] = [];
  private current: ComposerSkin['parts'][number] | undefined;
  begin(part: ComposerSkinPart, label: string) { this.end(); this.current = {part, label, firstTriangle: this.ix.length / 3, triangles: 0, bones: []}; }
  end() { if (this.current) { this.current.triangles = this.ix.length / 3 - this.current.firstTriangle; if (this.current.triangles > 0) this.parts.push(this.current); this.current = undefined; } }
  v(pos: THREE.Vector3, col: RGB, w: W): number {
    const list = w.filter(([, x]) => x > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const total = list.reduce((a, [, x]) => a + x, 0) || 1;
    for (let k = 0; k < 4; k++) { this.si.push(list[k]?.[0] ?? 0); this.sw.push(list[k] ? list[k]![1] / total : 0); }
    if (this.current) for (const [bone] of list) if (!this.current.bones.includes(bone)) this.current.bones.push(bone);
    this.p.push(pos.x, pos.y, pos.z); this.c.push(clamp(col[0], 0, 1), clamp(col[1], 0, 1), clamp(col[2], 0, 1));
    return this.p.length / 3 - 1;
  }
  t(a: number, b: number, c: number) { this.ix.push(a, b, c); }
  pos(i: number) { return V(this.p[i * 3], this.p[i * 3 + 1], this.p[i * 3 + 2]); }
  /** Triangle with winding chosen so its normal faces `out`. */
  to(a: number, b: number, c: number, out: THREE.Vector3) {
    const pa = this.pos(a), n = V().crossVectors(this.pos(b).sub(pa), this.pos(c).sub(pa));
    if (n.dot(out) >= 0) this.t(a, b, c); else this.t(a, c, b);
  }
}

interface Ring { c: THREE.Vector3; t: THREE.Vector3; u: THREE.Vector3; rx: number; ry: number; w: W; color: (angle: number) => RGB; open?: [number, number]; /** lower half radius (default ry) */ ryBelow?: number }
/** Lofts closed elliptical rings; caps are rounded. Winding is outward when the
 * ring basis (v = u x t, u, t) is right-handed, which this function enforces. */
function loft(s: Skin, rings: Ring[], segments: number, capStart = 0.6, capEnd = 0.6) {
  if (rings.length < 2) return;
  const ids: number[][] = [];
  const basis = (r: Ring) => { const t = r.t.clone().normalize(); let u = r.u.clone().addScaledVector(t, -r.u.dot(t)); if (u.lengthSq() < 1e-10) u = Math.abs(t.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0), u.addScaledVector(t, -u.dot(t)); u.normalize(); return {t, u, v: V().crossVectors(u, t)}; };
  const ringIds = (r: Ring, scale = 1, shift = 0) => {
    const {t, u, v} = basis(r), out: number[] = [];
    for (let k = 0; k < segments; k++) {
      const a = TAU * k / segments;
      const p = r.c.clone().addScaledVector(t, shift).addScaledVector(v, Math.cos(a) * r.rx * scale).addScaledVector(u, Math.sin(a) * (Math.sin(a) < 0 ? r.ryBelow ?? r.ry : r.ry) * scale);
      out.push(s.v(p, r.color(a), r.w));
    }
    return out;
  };
  const capRings = (r: Ring, dir: number, len: number) => {
    const list: number[][] = [], steps = 3, radius = Math.max(r.rx, r.ry) * len;
    for (let k = 1; k <= steps; k++) { const phi = (k / (steps + 1)) * Math.PI / 2; list.push(ringIds(r, Math.cos(phi), dir * Math.sin(phi) * radius)); }
    const {t} = basis(r);
    const apex = s.v(r.c.clone().addScaledVector(t, dir * radius), r.color(Math.PI * 1.5), r.w);
    return {list, apex};
  };
  if (capStart > 0) { const cap = capRings(rings[0]!, -1, capStart); ids.push(...cap.list.reverse()); fan(s, cap.apex, ids[0]!, true); }
  for (const r of rings) ids.push(ringIds(r));
  if (capEnd > 0) { const cap = capRings(rings[rings.length - 1]!, 1, capEnd); ids.push(...cap.list); fan(s, cap.apex, ids[ids.length - 1]!, false); }
  for (let i = 0; i + 1 < ids.length; i++) for (let k = 0; k < segments; k++) {
    const a = ids[i]![k]!, b = ids[i]![(k + 1) % segments]!, c = ids[i + 1]![k]!, d = ids[i + 1]![(k + 1) % segments]!;
    s.t(a, b, c); s.t(b, d, c);
  }
}
function fan(s: Skin, apex: number, ring: number[], start: boolean) {
  for (let k = 0; k < ring.length; k++) { const a = ring[k]!, b = ring[(k + 1) % ring.length]!; if (start) s.t(b, a, apex); else s.t(a, b, apex); }
}
/** Tube along a polyline with parallel-transported frames. */
function tube(s: Skin, points: THREE.Vector3[], radii: number[], weights: W[], color: (i: number, a: number) => RGB, segments: number, capStart = 0.5, capEnd = 0.5, flatten = 1, upHint?: THREE.Vector3) {
  if (points.length < 2) return;
  const rings: Ring[] = [];
  let u = upHint?.clone() ?? V(0, 1, 0);
  for (let i = 0; i < points.length; i++) {
    const t = points[Math.min(points.length - 1, i + 1)]!.clone().sub(points[Math.max(0, i - 1)]!).normalize();
    u.addScaledVector(t, -u.dot(t)); if (u.lengthSq() < 1e-8) u = Math.abs(t.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0), u.addScaledVector(t, -u.dot(t));
    u.normalize();
    const index = i;
    rings.push({c: points[i]!, t, u: u.clone(), rx: radii[i]!, ry: radii[i]! * flatten, w: weights[i]!, color: a => color(index, a)});
  }
  loft(s, rings, segments, capStart, capEnd);
}
function ellipsoid(s: Skin, center: THREE.Vector3, axes: [THREE.Vector3, THREE.Vector3, THREE.Vector3], radii: [number, number, number], w: W, color: (a: number, f: number) => RGB, segments = 10, stations = 6) {
  const [ax, ay] = axes, rings: Ring[] = [];
  for (let i = 0; i <= stations; i++) {
    const f = i / stations, th = mix(-0.92, 0.92, f) * Math.PI / 2, k = Math.cos(th);
    rings.push({c: center.clone().addScaledVector(ax, Math.sin(th) * radii[0]), t: ax, u: ay, rx: radii[2] * k, ry: radii[1] * k, w, color: a => color(a, f)});
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

// ------------------------------------------------------------------ palette
// WP2 wave-1 shim: the six legacy rows of COAT_PALETTE_HEX are the former literal table, byte for byte.
const PALETTES = COAT_PALETTE_HEX;
type Palette = Record<keyof typeof PALETTES['earth'], RGB>;
function palette(recipe: ComposerRecipe): Palette {
  const rand = composerRandom(`composer-colour/${recipe.palette}/${recipe.colorSeed}`), out = {} as Palette;
  const dh = (rand() - 0.5) * 0.06, dl = (rand() - 0.5) * 0.1;
  for (const [key, hex] of Object.entries(PALETTES[recipe.palette])) {
    const c = new THREE.Color(hex), hsl = {h: 0, s: 0, l: 0}; c.getHSL(hsl);
    if (key === 'base' || key === 'accent') c.setHSL((hsl.h + dh + 1) % 1, hsl.s, clamp(hsl.l + dl, 0.04, 0.9));
    out[key as keyof Palette] = [c.r, c.g, c.b];
  }
  return out;
}
function noise3(x: number, y: number, z: number, seed: number) {
  const h = (i: number, j: number, k: number) => composerHash(`${seed}/${i}/${j}/${k}`) / 4294967296;
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let best = 9;
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
    const cx = ix + a, cy = iy + b, cz = iz + c;
    best = Math.min(best, Math.hypot(x - cx - h(cx, cy, cz), y - cy - h(cy, cz, cx), z - cz - h(cz, cx, cy)));
  }
  return best;
}

// ------------------------------------------------------------------ skin builder
export function buildComposerSkin(graph: ComposerGraph): ComposerSkin {
  const s = new Skin(), r = graph.recipe, d = graph.dims, bones = graph.bones, pal = palette(r);
  const seed = composerHash(`${r.colorSeed}/${r.palette}`);
  const Q = (b: ComposerBone) => new THREE.Quaternion(...b.restQuaternion);
  const P = (b: ComposerBone) => V(...b.restPosition);
  const at = (b: ComposerBone, x: number, y = 0, z = 0) => V(x, y, z).applyQuaternion(Q(b)).add(P(b));
  const axis = (b: ComposerBone, x: number, y: number, z: number) => V(x, y, z).applyQuaternion(Q(b)).normalize();
  const L = d.bodyLength, scale = Math.max(L, 0.2);
  const one = (bone: number): W => [[bone, 1]];

  /** Body coat: dorsal darkening, pale belly and palette patterning in bind space. */
  const coat = (p: THREE.Vector3, dorsal: number, part: 'body' | 'limb' | 'neck' | 'tail', along = 0): RGB => {
    let c = pal.base;
    const q = p.clone().multiplyScalar(1 / scale);
    if (r.palette === 'savanna') { const cell = noise3(q.x * 9, q.y * 9, q.z * 9, seed); c = mixC(pal.belly, pal.accent, 1 - smooth(0.3, 0.4, cell)); }
    else if (r.palette === 'reptile') c = mixC(c, pal.accent, smooth(0.25, 0.75, Math.sin(q.x * 22 + q.z * 2) * 0.5 + 0.5) * smooth(-0.2, 0.5, dorsal));
    else if (r.palette === 'earth') c = mixC(c, pal.accent, smooth(0.55, 0.95, dorsal) * 0.7);
    // Contrasting legs only on jointed (arthropod) limbs; fur or skin limbs keep the body colour.
    else if (r.palette === 'ink' && part === 'limb' && r.legs === 'arthropod') c = pal.accent;
    else if (r.palette === 'plumage' && part === 'neck') c = mixC(pal.base, pal.accent, 0.25);
    const grain = 1 + 0.05 * Math.sin(q.x * 61 + q.y * 37) * Math.sin(q.z * 53 - q.y * 29);
    const belly = part === 'limb' ? 0 : smooth(-0.15, -0.75, dorsal);
    c = mixC(c, pal.belly, belly * 0.8);
    void along;
    return [c[0] * grain, c[1] * grain, c[2] * grain];
  };

  // ---- axial chain: tail tip -> torso -> neck end
  const {torso, tail, neck, head, trunk} = graph.chains;
  type Seg = {bone: ComposerBone; reversed: boolean};
  const chainTube = (segs: Seg[], ringsPerBone: number, segments: number, part: 'body' | 'neck' | 'tail' | 'limb', opts: {capStart?: number; capEnd?: number; ripple?: (bone: ComposerBone, f: number) => number; band?: (bone: ComposerBone, f: number) => number; startWeights?: W; endBone?: number; collarBone?: number; collarScale?: number; collarInset?: number; colorOverride?: (p: THREE.Vector3, a: number) => RGB | undefined} = {}) => {
    const rings: Ring[] = [];
    const sections: ComposerSection[] = [];
    // Catmull-Rom across joint sections smooths the silhouette between bones
    segs.forEach(({bone, reversed}, k) => {
      const first = reversed ? bone.end : bone.start, last = reversed ? bone.start : bone.end;
      if (k === 0) sections.push(first); else { const prev = sections[sections.length - 1]!; sections[sections.length - 1] = {w: (prev.w + first.w) / 2, h: (prev.h + first.h) / 2, yc: (prev.yc + first.yc) / 2}; }
      sections.push(last);
    });
    const sample = (k: number, f: number): ComposerSection => {
      const p0 = sections[Math.max(0, k - 1)]!, p1 = sections[k]!, p2 = sections[k + 1]!, p3 = sections[Math.min(sections.length - 1, k + 2)]!;
      const cr = (a: number, b: number, c: number, e: number) => 0.5 * ((2 * b) + (-a + c) * f + (2 * a - 5 * b + 4 * c - e) * f * f + (-a + 3 * b - 3 * c + e) * f * f * f);
      const w = Math.max(1e-4, cr(p0.w, p1.w, p2.w, p3.w)), yc = cr(p0.yc, p1.yc, p2.yc, p3.yc);
      // The underside never bulges below the straight line between joint undersides (the rig's support contract);
      // Catmull-Rom overshoot would otherwise push a resting belly through the floor.
      const lowest = mix(p1.yc - p1.h, p2.yc - p2.h, f);
      return {w, h: Math.max(1e-4, Math.min(cr(p0.h, p1.h, p2.h, p3.h), yc - lowest)), yc};
    };
    if (opts.collarBone !== undefined && segs.length) {
      // The collar is buried toward the carrier's centreline (not back along the limb axis),
      // so thick or high-set limb roots blend into the body instead of capping out above it.
      const {bone} = segs[0]!, sec0 = sections[0]!, carrier = bones[opts.collarBone]!, root = P(bone);
      const along = clamp(root.clone().sub(P(carrier)).dot(axis(carrier, 1, 0, 0)), 0, carrier.length), f = along / Math.max(1e-9, carrier.length);
      const toward = at(carrier, along, mix(carrier.start.yc, carrier.end.yc, f), 0).sub(root), dist = toward.length();
      const t = dist > 1e-6 ? toward.multiplyScalar(-1 / dist) : axis(bone, 1, 0, 0);
      const c = root.clone().addScaledVector(t, -Math.min((opts.collarInset ?? 0.4) * Math.max(sec0.w, sec0.h), dist * 0.6));
      const cs = opts.collarScale ?? 1.3;
      rings.push({c, t, u: axis(bone, 0, 1, 0), rx: sec0.w * cs, ry: sec0.h * cs, w: [[carrier.index, 1]], color: a => coat(c, Math.sin(a) * 0.3, part)});
    }
    segs.forEach(({bone, reversed}, k) => {
      const prev = segs[k - 1]?.bone, next = segs[k + 1]?.bone;
      const dir = axis(bone, reversed ? -1 : 1, 0, 0), up = axis(bone, 0, 1, 0);
      const count = k === segs.length - 1 ? ringsPerBone + 1 : ringsPerBone;
      for (let i = 0; i < count; i++) {
        const f = i / ringsPerBone, x = (reversed ? 1 - f : f) * bone.length;
        const sec = sample(k, f), ripple = opts.ripple ? opts.ripple(bone, f) : 1;
        const c = at(bone, x, sec.yc, 0);
        let weights: W;
        if (f < 0.5 && prev) { const wp = 0.5 * (1 - smooth(0, 0.5, f)); weights = [[prev.index, wp], [bone.index, 1 - wp]]; }
        else if (f > 0.5 && next) { const wn = 0.5 * smooth(0.5, 1, f); weights = [[next.index, wn], [bone.index, 1 - wn]]; }
        // The tube end hands over completely to `endBone` (a leg's level foot), so the ankle follows the planted sole.
        else if (f > 0.5 && !next && opts.endBone !== undefined) { const wn = smooth(0.5, 1, f); weights = [[opts.endBone, wn], [bone.index, 1 - wn]]; }
        else weights = [[bone.index, 1]];
        if (k === 0 && i === 0 && opts.startWeights) weights = opts.startWeights;
        let t = dir.clone();
        if (f < 0.01 && prev) t.add(axis(prev, segs[k - 1]!.reversed ? -1 : 1, 0, 0)).normalize();
        const band = opts.band ? opts.band(bone, f) : 0;
        rings.push({c, t, u: up, rx: sec.w * ripple, ry: sec.h * ripple, w: weights, color: a => {
          const o = opts.colorOverride?.(c, a); if (o) return o;
          const base = coat(c.clone().addScaledVector(up, Math.sin(a) * sec.h), Math.sin(a), part);
          return band ? mixC(base, pal.accent, band) : base;
        }});
      }
    });
    loft(s, rings, segments, opts.capStart ?? 0.55, opts.capEnd ?? 0.55);
  };

  const torsoSeg = r.torso === 'segmented', annulated = r.torso === 'annulated';
  const ripple = (bone: ComposerBone, f: number) => bone.part !== 'torso' ? 1 : torsoSeg ? 1 - 0.14 * Math.pow(Math.cos(Math.PI * f), 8) : annulated ? 1 - 0.05 * Math.pow(Math.cos(Math.PI * 3 * f), 6) : 1;
  const band = (bone: ComposerBone, f: number) => bone.part !== 'torso' ? 0 : torsoSeg ? 0.55 * Math.pow(Math.cos(Math.PI * f), 6) : annulated ? 0.25 * Math.pow(Math.cos(Math.PI * 3 * f), 4) : 0;
  s.begin('torso', torsoSeg ? 'segmented trunk' : annulated ? 'annulated body' : 'torso');
  const axial: Seg[] = [...[...tail].reverse().map(i => ({bone: bones[i]!, reversed: true})), ...torso.map(i => ({bone: bones[i]!, reversed: false})), ...neck.map(i => ({bone: bones[i]!, reversed: false}))];
  const ringsTorso = torsoSeg ? 5 : annulated ? 9 : 5;
  chainTube(axial, ringsTorso, torsoSeg || annulated ? 16 : 20, 'body', {ripple, band, capStart: tail.length ? 0.25 : 0.85, capEnd: 0.5});
  s.end();

  // ---- head (rigid on the head bone)
  const hb = bones[head]!;
  buildHead(s, graph, hb, pal, at, axis, coat);
  // ---- trunk
  if (trunk.length) {
    s.begin('trunk', 'trunk');
    const segs = trunk.map(i => ({bone: bones[i]!, reversed: false}));
    chainTube(segs, 4, 12, 'neck', {capEnd: 0.35, capStart: 0.2, startWeights: [[head, 0.7], [trunk[0]!, 0.3]], band: (_b, f) => 0.18 * Math.pow(Math.sin(Math.PI * 4 * f), 8)});
    // a rounded, slightly swollen tip with a darker nostril rim instead of a flat plate
    const tip = bones[trunk[trunk.length - 1]!]!, r0 = tip.end.h;
    ellipsoid(s, at(tip, tip.length - r0 * 0.15, 0, 0), [axis(tip, 1, 0, 0), axis(tip, 0, 1, 0), axis(tip, 0, 0, 1)], [r0 * 0.9, r0 * 1.12, r0 * 1.12], one(tip.index),
      (a, f) => mixC(coat(at(tip, tip.length, Math.sin(a) * r0, 0), Math.sin(a), 'neck'), pal.keratin, 0.45 * smooth(0.65, 0.9, f)), 12, 6);
    s.end();
  }

  // ---- tail extras
  if (tail.length) {
    const tip = bones[tail[tail.length - 1]!]!, tipEnd = at(tip, tip.length);
    const ax = axis(tip, 1, 0, 0), ay = axis(tip, 0, 1, 0), az = axis(tip, 0, 0, 1);
    s.begin('tail-tip', r.tail);
    if (r.tail === 'tufted') ellipsoid(s, tipEnd.clone().addScaledVector(ax, tip.end.h * 2), [ax, ay, az], [Math.max(tip.length * 0.9, tip.end.h * 4), tip.end.h * 2.6, tip.end.h * 2.6], one(tip.index), (a, f) => mixC(pal.accent, pal.keratin, 0.4 + 0.2 * Math.sin(a * 5 + f * 9)), 10, 6);
    if (r.tail === 'club') {
      const rr = Math.max(tip.end.h * 2.4, L * 0.05);
      ellipsoid(s, tipEnd.clone().addScaledVector(ax, rr * 0.6), [ax, ay, az], [rr * 1.1, rr * 0.8, rr * 1.3], one(tip.index), () => pal.horn, 12, 7);
      for (const side of [-1, 1]) ellipsoid(s, tipEnd.clone().addScaledVector(ax, rr * 0.6).addScaledVector(az, side * rr * 1.2), [ax, ay, az], [rr * 0.55, rr * 0.45, rr * 0.5], one(tip.index), () => pal.horn, 8, 4);
    }
    if (r.tail === 'feather-fan') {
      const span = composerFeatherFanSpan(r, L), feathers = 9;
      for (let k = 0; k < feathers; k++) {
        const ang = mix(-0.75, 0.75, k / (feathers - 1)), dir = ax.clone().multiplyScalar(Math.cos(ang)).addScaledVector(az, Math.sin(ang)).normalize();
        const side = V().crossVectors(ay, dir).normalize(), len = span * (1 - 0.18 * Math.abs(ang));
        const wdt = span * 0.11;
        slab(s, tipEnd.clone().addScaledVector(ay, 0.004 * k * span / feathers), dir, side, [[-0.02 * len, 0], [0.3 * len, -wdt * 0.5], [0.85 * len, -wdt * 0.55], [len, 0], [0.85 * len, wdt * 0.55], [0.3 * len, wdt * 0.5]], span * 0.012, one(tip.index), (x) => mixC(pal.accent, pal.keratin, smooth(0.7, 1, x / len) * 0.7));
      }
    }
    s.end();
  }

  // ---- limbs
  for (const limb of graph.limbs) {
    const carrier = bones[limb.socketBone]!;
    if (limb.kind === 'leg') {
      s.begin('leg', `leg ${limb.pair + 1}${limb.side < 0 ? 'L' : 'R'}`);
      const segBones = limb.bones.slice(0, limb.segments.length).map(i => ({bone: bones[i]!, reversed: false}));
      const arth = r.legs === 'arthropod', firstVertex = s.p.length / 3, footBone = bones[limb.bones[limb.bones.length - 1]!]!;
      chainTube(segBones, arth ? 3 : 4, arth ? 7 : 11, 'limb', {collarBone: carrier.index, endBone: footBone.index, collarScale: (arth ? 1.25 : r.layout === 'sprawled' ? 1.35 : 1.5) / composerLimbMass(r, 'leg'), collarInset: arth ? 0.2 : 0.55, capEnd: 0.4,
        band: arth ? (_b, f) => 0.5 * Math.pow(Math.cos(Math.PI * f), 10) : undefined});
      s.end();
      s.begin('foot', `${r.feet} ${limb.pair + 1}${limb.side < 0 ? 'L' : 'R'}`);
      buildFoot(s, r.feet, bones[limb.bones[limb.bones.length - 1]!]!, bones[limb.bones[limb.bones.length - 2]!]!, limb.footHeight, limb.footLength, limb.side, pal, at, axis);
      s.end();
      fitFootContract(s, firstVertex, footBone, limb.footHeight, limb.footExtent);
    } else if (limb.kind === 'arm') {
      s.begin('arm', `arm ${limb.side < 0 ? 'L' : 'R'}`);
      const segBones = limb.bones.slice(0, 2).map(i => ({bone: bones[i]!, reversed: false}));
      chainTube(segBones, 4, 10, 'limb', {collarBone: carrier.index, collarScale: 1.4 / composerLimbMass(r, 'arm') * 1.05, collarInset: 0.5, capEnd: 0.3});
      s.end();
      s.begin('hand', `${r.hands} ${limb.side < 0 ? 'L' : 'R'}`);
      buildHand(s, r.hands, bones[limb.bones[1]!]!, bones[limb.bones[2]!]!, bones[limb.bones[3]!]!, limb.side, pal, at, axis);
      s.end();
    } else {
      s.begin('wing', `${r.wings} wing ${limb.side < 0 ? 'L' : 'R'}`);
      buildWing(s, graph, limb.bones.map(i => bones[i]!), carrier, limb.side, pal, at, axis);
      s.end();
    }
  }

  // ---- armor
  if (r.armor !== 'none') { s.begin('armor', r.armor); buildArmor(s, graph, pal, at, axis, seed); s.end(); }
  s.end();

  const positions = new Float32Array(s.p), colors = new Float32Array(s.c), skinIndex = new Uint16Array(s.si), skinWeight = new Float32Array(s.sw), index = new Uint32Array(s.ix);
  return {version: COMPOSER_SKIN_VERSION, positions, colors, skinIndex, skinWeight, index, parts: s.parts, vertexCount: positions.length / 3, triangleCount: index.length / 3};
}

type At = (b: ComposerBone, x: number, y?: number, z?: number) => THREE.Vector3;
type Axis = (b: ComposerBone, x: number, y: number, z: number) => THREE.Vector3;

function buildHead(s: Skin, graph: ComposerGraph, hb: ComposerBone, pal: Palette, at: At, axis: Axis, coat: (p: THREE.Vector3, dorsal: number, part: 'body' | 'limb' | 'neck' | 'tail') => RGB) {
  const r = graph.recipe, d = graph.dims, H = d.headLength, cW = d.craniumWidth, cH = d.craniumHeight, sn = d.snoutLength;
  const ax = axis(hb, 1, 0, 0), ay = axis(hb, 0, 1, 0), az = axis(hb, 0, 0, 1), w = [[hb.index, 1]] as W;
  const station = (x: number, sw: number, sh: number, yc: number, color: (a: number) => RGB): Ring => ({c: at(hb, x, yc), t: ax, u: ay, rx: sw, ry: sh, w, color});
  const skinCol = (x: number) => (a: number) => coat(at(hb, x, Math.sin(a) * cH), Math.sin(a), 'neck');
  s.begin('head', r.head);
  let tipX = 0.4 * H + sn, tipY = -0.2 * cH, tipH = 0.5 * cH;
  if (r.head === 'muzzle' || r.head === 'jaws') {
    const jaws = r.head === 'jaws', flatten = jaws ? 0.82 : 1;
    const rings = [station(-0.12 * H, 0.6 * cW, 0.6 * cH * flatten, 0, skinCol(0)), station(0, 0.88 * cW, 0.9 * cH * flatten, 0, skinCol(0)), station(0.18 * H, cW, cH * flatten, 0, skinCol(0.18 * H)), station(0.36 * H, 0.92 * cW, 0.88 * cH * flatten, -0.06 * cH, skinCol(0.36 * H))];
    const n = 4;
    for (let i = 1; i <= n; i++) {
      const f = i / n, x = 0.4 * H + sn * f;
      const mouth = (a: number) => { const c = skinCol(x)(a); const line = Math.abs(Math.sin(a) + (jaws ? 0.25 : 0.35)) < (jaws ? 0.07 : 0.05) && Math.abs(Math.cos(a)) > 0.5; return line ? pal.keratin : jaws ? c : f > 0.75 ? mixC(c, pal.skin, 0.6) : c; };
      rings.push(station(x, mix(0.8, jaws ? 0.5 : 0.48, f) * cW, mix(0.82, jaws ? 0.36 : 0.52, f) * cH, mix(-0.08, jaws ? -0.12 : -0.24, f) * cH, mouth));
    }
    loft(s, rings, 18, 0.5, jaws ? 0.55 : 0.45);
    tipY = (jaws ? -0.12 : -0.24) * cH; tipH = (jaws ? 0.36 : 0.52) * cH;
    if (!jaws) for (const side of [-1, 1]) ellipsoid(s, at(hb, tipX + 0.02 * H, tipY + 0.15 * cH, side * 0.18 * cW), [ax, ay, az], [0.03 * H, 0.06 * cH, 0.06 * cW], w, () => pal.eye, 6, 3);
    if (jaws) for (const side of [-1, 1]) for (let k = 0; k < 6; k++) {
      const f = 0.15 + 0.13 * k, x = 0.4 * H + sn * f, sw = mix(0.8, 0.5, f) * cW * 0.93, y = mix(-0.08, -0.12, f) * cH - mix(0.82, 0.36, f) * cH * 0.25;
      tube(s, [at(hb, x, y, side * sw), at(hb, x + 0.01 * H, y - 0.07 * cH, side * sw * 0.97)], [0.028 * cH, 0.004 * cH], [w, w], () => [0.92, 0.9, 0.82], 5, 0.2, 0.1);
    }
    if (!jaws && r.horns !== 'ossicones' && r.horns !== 'paired') for (const side of [-1, 1]) {
      const base = at(hb, 0.04 * H, 0.75 * cH, side * 0.55 * cW), dir = ay.clone().multiplyScalar(0.8).addScaledVector(az, side * 0.6).addScaledVector(ax, -0.25).normalize();
      ellipsoid(s, base.clone().addScaledVector(dir, 0.16 * H), [dir, ax.clone().negate(), az], [0.18 * H, 0.03 * H, 0.09 * H], w, () => mixC(pal.base, pal.skin, 0.4), 8, 4);
    }
  } else if (r.head === 'beak') {
    loft(s, [station(-0.1 * H, 0.6 * cW, 0.6 * cH, 0, skinCol(0)), station(0.05 * H, 0.95 * cW, 0.98 * cH, 0, skinCol(0)), station(0.22 * H, cW, cH, 0.02 * cH, skinCol(0.2 * H)), station(0.4 * H, 0.62 * cW, 0.66 * cH, 0.02 * cH, skinCol(0.4 * H))], 18, 0.5, 0.3);
    const len = Math.max(sn, 0.15 * H), n = 6, upper: Ring[] = [], lower: Ring[] = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n, x = 0.36 * H + len * f, hook = len < 0.35 * H ? smooth(0.6, 1, f) * 0.18 : 0;
      upper.push(station(x, mix(0.55, 0.06, Math.pow(f, 0.8)) * cW, mix(0.42, 0.05, Math.pow(f, 0.9)) * cH, (0.08 - 0.12 * f - hook) * cH, () => pal.keratin));
      if (f <= 0.85) lower.push(station(x, mix(0.45, 0.08, f / 0.85) * cW, mix(0.22, 0.04, f / 0.85) * cH, (-0.3 - 0.02 * f) * cH, () => mixC(pal.keratin, [0, 0, 0], 0.25)));
    }
    loft(s, upper, 12, 0.2, 0.3); loft(s, lower, 10, 0.2, 0.3);
    tipX = 0.36 * H + len; tipY = -0.05 * cH; tipH = 0.1 * cH;
  } else if (r.head === 'flat-face') {
    loft(s, [station(-0.15 * H, 0.65 * cW, 0.66 * cH, 0.05 * cH, skinCol(0)), station(0.02 * H, 0.95 * cW, 0.98 * cH, 0.05 * cH, skinCol(0)), station(0.22 * H, cW, cH, 0.04 * cH, skinCol(0.2 * H)), station(0.4 * H, 0.86 * cW, 0.86 * cH, -0.02 * cH, a => Math.sin(a) < 0.2 ? pal.skin : skinCol(0.4 * H)(a)), station(0.48 * H, 0.55 * cW, 0.5 * cH, -0.1 * cH, () => pal.skin)], 18, 0.5, 0.45);
    const len = Math.max(0.05 * H, sn * 0.6);
    loft(s, [station(0.36 * H, 0.55 * cW, 0.45 * cH, -0.4 * cH, () => pal.skin), station(0.36 * H + len, 0.42 * cW, 0.34 * cH, -0.42 * cH, () => pal.skin)], 14, 0.3, 0.6);
    ellipsoid(s, at(hb, 0.4 * H, 0.22 * cH, 0), [ax, ay, az], [0.08 * H, 0.12 * cH, 0.9 * cW], w, () => mixC(pal.base, pal.keratin, 0.3), 12, 4);
    for (const side of [-1, 1]) ellipsoid(s, at(hb, 0.12 * H, 0, side * 0.96 * cW), [ax, ay, az], [0.08 * H, 0.2 * cH, 0.05 * cW], w, () => pal.skin, 8, 4);
    tipX = 0.36 * H + len; tipY = -0.42 * cH; tipH = 0.34 * cH;
  } else if (r.head === 'blunt') {
    loft(s, [station(-0.1 * H, 0.8 * cW, 0.8 * cH, 0, skinCol(0)), station(0.25 * H, cW, cH, 0, skinCol(0.2 * H)), station(0.6 * H + sn * 0.3, 0.75 * cW, 0.75 * cH, 0, a => mixC(skinCol(0.6 * H)(a), pal.skin, 0.5))], 16, 0.4, 0.75);
    ellipsoid(s, at(hb, 0.6 * H + sn * 0.3 + 0.72 * cW, 0, 0), [ax, ay, az], [0.03 * H, 0.32 * cH, 0.32 * cW], w, () => pal.eye, 10, 3);
    tipX = 0.6 * H + sn * 0.3 + 0.7 * cW; tipY = 0; tipH = 0.5 * cH;
  } else {
    // mandibles: arthropod head capsule with antennae and pincer mouthparts
    loft(s, [station(-0.05 * H, 0.75 * cW, 0.7 * cH, 0, skinCol(0)), station(0.3 * H, cW, cH, 0, skinCol(0.3 * H)), station(0.75 * H, 0.8 * cW, 0.75 * cH, -0.1 * cH, skinCol(0.7 * H))], 16, 0.45, 0.5);
    const len = Math.max(0.25 * H, sn * 1.1);
    for (const side of [-1, 1]) {
      const pts = [0, 0.35, 0.7, 1].map(f => at(hb, 0.72 * H + len * f, -0.25 * cH, side * mix(0.55, 0.05, f * f) * cW));
      tube(s, pts, [0.16 * cW, 0.12 * cW, 0.08 * cW, 0.01 * cW], pts.map(() => w), () => pal.keratin, 7, 0.3, 0.1, 0.7);
      const ant = [0, 0.25, 0.5, 0.75, 1].map(f => at(hb, 0.6 * H + 1.5 * H * f, 0.45 * cH + 0.8 * H * f * (1 - 0.4 * f), side * (0.4 * cW + 0.55 * H * f)));
      tube(s, ant, [0.07, 0.06, 0.05, 0.04, 0.02].map(x => x * cW), ant.map(() => w), (i) => i % 2 ? pal.accent : pal.keratin, 5, 0.2, 0.2);
      ellipsoid(s, at(hb, 0.45 * H, 0.35 * cH, side * 0.82 * cW), [ax, ay, az], [0.07 * H, 0.18 * cH, 0.12 * cW], w, () => pal.eye, 6, 3);
    }
    tipX = 0.72 * H + len; tipY = -0.25 * cH; tipH = 0.3 * cH;
  }
  s.end();
  // eyes
  if (r.head !== 'blunt' && r.head !== 'mandibles') {
    s.begin('eyes', 'eyes');
    const er = (r.head === 'beak' ? 0.17 : r.head === 'flat-face' ? 0.11 : 0.13) * cH;
    const [ex, ey, ez] = r.head === 'beak' ? [0.2 * H, 0.3 * cH, 0.86 * cW] : r.head === 'flat-face' ? [0.43 * H, 0.06 * cH, 0.42 * cW] : r.head === 'jaws' ? [0.24 * H, 0.52 * cH, 0.72 * cW] : [0.3 * H, 0.38 * cH, 0.8 * cW];
    for (const side of [-1, 1]) ellipsoid(s, at(hb, ex, ey, side * ez), [ax, ay, az], [er, er, er * 0.8], w, (a) => Math.cos(a) * side > 0.75 ? [0.5, 0.48, 0.42] : pal.eye, 10, 5);
    s.end();
  }
  // horns
  if (r.horns !== 'none') {
    s.begin('horn', r.horns);
    const hornCol = (i: number, n: number) => mixC(pal.horn, pal.keratin, i / n);
    if (r.horns === 'nasal') {
      const forehead = r.trunk === 'trunk';
      const x0 = forehead ? 0.12 * H : 0.4 * H + sn * 0.65, y0 = forehead ? 0.9 * cH : (r.head === 'muzzle' ? -0.24 * cH * 0.65 : tipY) + tipH * 0.9 + 0.05 * cH;
      const big = 0.5 * H;
      const pts = [0, 0.33, 0.66, 1].map(f => at(hb, x0 + big * (0.12 * f - 0.25 * f * f), y0 + big * f, 0));
      tube(s, [at(hb, x0, y0 - 0.12 * cH, 0), ...pts], [0.15 * H, 0.14 * H, 0.1 * H, 0.05 * H, 0.008 * H], [w, w, w, w, w], (i) => hornCol(i, 4), 10, 0.2, 0.15);
      const x1 = forehead ? -0.02 * H : x0 - 0.25 * H, y1 = forehead ? cH * 0.9 : y0 + 0.08 * cH;
      tube(s, [at(hb, x1, y1 - 0.1 * cH, 0), at(hb, x1 + 0.02 * H, y1 + 0.12 * H, 0), at(hb, x1 - 0.02 * H, y1 + 0.22 * H, 0)], [0.09 * H, 0.06 * H, 0.008 * H], [w, w, w], (i) => hornCol(i, 2), 8, 0.2, 0.15);
    } else if (r.horns === 'paired') {
      for (const side of [-1, 1]) {
        const pts = [V(0.05, 0.7, 0.55), V(0.0, 0.95, 0.85), V(-0.12, 1.25, 1.15), V(-0.15, 1.75, 1.2), V(-0.05, 2.1, 1.0)].map(p => at(hb, p.x * H, p.y * cH, side * p.z * cW));
        tube(s, pts, [0.1 * H, 0.08 * H, 0.06 * H, 0.035 * H, 0.006 * H], pts.map(() => w), (i) => hornCol(i, 4), 9, 0.2, 0.15);
      }
    } else if (r.horns === 'ossicones') {
      for (const side of [-1, 1]) {
        const base = at(hb, 0.02 * H, 0.8 * cH, side * 0.35 * cW), top = at(hb, -0.03 * H, 0.8 * cH + 0.32 * H, side * 0.42 * cW);
        tube(s, [base, top], [0.055 * H, 0.045 * H], [w, w], () => mixC(pal.base, pal.accent, 0.3), 9, 0.2, 0.2);
        ellipsoid(s, top, [ax, ay, az], [0.06 * H, 0.06 * H, 0.06 * H], w, () => pal.keratin, 8, 4);
      }
    } else if (r.horns === 'crest') {
      const crestH = Math.max(0.5 * cH, 0.25 * H);
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
  for (let i = firstVertex; i < s.p.length / 3; i++) {
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

function buildFoot(s: Skin, type: ComposerRecipe['feet'], foot: ComposerBone, shank: ComposerBone, hF: number, lF: number, side: number, pal: Palette, at: At, axis: Axis) {
  const w = [[foot.index, 1]] as W, wb = [[foot.index, 0.6], [shank.index, 0.4]] as W;
  const ax = axis(foot, 1, 0, 0), ay = axis(foot, 0, 1, 0), az = axis(foot, 0, 0, 1);
  const r0 = Math.max(shank.end.w, 1e-3);
  const vertical = (pts: [number, number, number, number][], color: (i: number) => RGB, seg: number, capEnd = 0.25) => {
    // [x, y, rx, rz] stations stacked downward in the foot frame
    const rings: Ring[] = pts.map(([x, y, rx, rz], i) => ({c: at(foot, x, y), t: ay.clone().negate(), u: ax, rx: rz, ry: rx, w: i === 0 ? wb : w, color: () => color(i)}));
    loft(s, rings, seg, 0.15, capEnd);
  };
  if (type === 'hoof') {
    vertical([[0, 0.25 * hF, r0, r0], [0.05 * lF, -0.3 * hF, r0 * 1.15, r0 * 1.1], [0.18 * lF, -1.02 * hF, r0 * 1.35, r0 * 1.2]], i => i === 0 ? mixC(pal.keratin, pal.base, 0.4) : pal.keratin, 12, 0.08);
  } else if (type === 'pad') {
    vertical([[0, 0.3 * hF, r0, r0], [0.02 * lF, -0.4 * hF, r0 * 1.2, r0 * 1.2], [0.05 * lF, -1.02 * hF, r0 * 1.35, r0 * 1.3]], () => mixC(pal.base, pal.skin, 0.3), 14, 0.06);
    for (let k = -1; k <= 1; k++) ellipsoid(s, at(foot, 0.05 * lF + r0 * 1.25 * Math.cos(k * 0.5), -0.8 * hF, r0 * 1.2 * Math.sin(k * 0.5)), [ax, ay, az], [r0 * 0.18, hF * 0.22, r0 * 0.3], w, () => [0.78, 0.72, 0.62], 6, 3);
  } else if (type === 'paw') {
    ellipsoid(s, at(foot, 0.25 * lF, -0.45 * hF), [ax, ay, az], [0.42 * lF, 0.55 * hF + 0.01 * lF, Math.max(r0 * 1.15, 0.28 * lF)], wb, () => mixC(pal.base, pal.accent, 0.2), 10, 5);
    for (let k = 0; k < 4; k++) {
      const z = (k - 1.5) * 0.17 * lF, x = 0.62 * lF - Math.abs(k - 1.5) * 0.06 * lF;
      ellipsoid(s, at(foot, x, -0.62 * hF, z), [ax, ay, az], [0.12 * lF, 0.38 * hF, 0.085 * lF], w, () => pal.base, 7, 4);
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

function buildHand(s: Skin, type: ComposerRecipe['hands'], fore: ComposerBone, hand: ComposerBone, finger: ComposerBone, side: number, pal: Palette, at: At, axis: Axis) {
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
  ellipsoid(s, at(hand, lh * 0.5), [ax, ay, az], [lh * 0.62, r0 * 0.7, r0 * (claw ? 1 : 1.25)], wb, () => claw ? pal.base : pal.skin, 10, 5);
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

function buildWing(s: Skin, graph: ComposerGraph, chain: ComposerBone[], carrier: ComposerBone, side: number, pal: Palette, at: At, axis: Axis) {
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
      let w: W;
      const near = f < 0.5 && k > 0 ? [[chain[k - 1]!.index, 0.5 * (1 - smooth(0, 0.5, f))], [bone.index, 1]] as W : f > 0.5 && k < chain.length - 1 ? [[chain[k + 1]!.index, 0.5 * smooth(0.5, 1, f)], [bone.index, 1]] as W : [[bone.index, 1]] as W;
      w = near;
      // the membrane's inner trailing edge joins the flank
      if (!feathered && u < 0.2) w = [...near.map(([b, x]) => [b, x * (1 - v * (1 - u / 0.2))] as [number, number]), [carrier.index, v * (1 - u / 0.2)]];
      const p = lead.clone().addScaledVector(back, chord * v).addScaledVector(up, chord * 0.06 * Math.sin(Math.PI * v));
      const col: RGB = feathered ? mixC(mixC(pal.base, pal.accent, smooth(0.45, 0.9, v) * 0.8), pal.keratin, smooth(0.75, 1, u) * 0.5 * v) : mixC(mixC(pal.skin, pal.accent, 0.35), pal.keratin, 0.25 * smooth(0.6, 1, v));
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
  for (const bone of chain) tube(s, [at(bone, 0), at(bone, bone.length)], [bone.start.w, bone.end.w], [[[bone.index, 1]], [[bone.index, 1]]], () => feathered ? pal.base : pal.skin, 7, 0.4, 0.4);
}

function buildArmor(s: Skin, graph: ComposerGraph, pal: Palette, at: At, axis: Axis, seed: number) {
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
    loft(s, rings.map(rg => rg), 24, 0.25, 0.25);
    return;
  }
  if (r.armor === 'bands') {
    const count = flexible ? n : Math.max(6, n * 2);
    for (let k = 0; k < count; k++) {
      // bands overlap their neighbour but the front band stops at the torso's end: past it the body narrows into the
      // neck and a full-size shell would hang open over it
      const u0 = (k + 0.05) / count, u1 = Math.min((k + 1.15) / count, 0.985);
      const a0 = -0.35, a1 = Math.PI + 0.35, steps = 12, outer: Ring[] = [];
      void outer;
      const ids: number[][][] = [];
      for (const [ui, u] of [u0, u1].entries()) {
        const {bone, local, sec, w} = sample(u), ax = axis(bone, 1, 0, 0), ay = axis(bone, 0, 1, 0), az = axis(bone, 0, 0, 1), c = at(bone, local, sec.yc);
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
        void ax;
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
    const count = flexible ? n : 9;
    for (let k = 0; k < count; k++) { const u = (k + 0.5) / count, smp = sample(u); list.push({...smp, size: 0.6 + 0.5 * Math.sin(Math.PI * u)}); }
    for (const [k, bone] of tailBones.entries()) list.push({bone, local: bone.length * 0.5, sec: {w: bone.start.w, h: bone.start.h, yc: 0}, w: [[bone.index, 1]], size: 0.7 - 0.12 * k});
    list.forEach(({bone, local, sec, w, size}, k) => {
      const hgt = Math.max(sec.h, graph.dims.torsoHeight * 0.5) * 0.85 * size, len = hgt * 0.95;
      const ax = axis(bone, bone.part === 'tail' ? -1 : 1, 0, 0), ay = axis(bone, 0, 1, 0), az = axis(bone, 0, 0, 1);
      const base = at(bone, local, sec.yc + sec.h * 0.82).addScaledVector(az, (k % 2 ? 1 : -1) * sec.w * 0.14);
      slab(s, base, ax, ay, [[-len * 0.5, 0], [-len * 0.3, hgt * 0.7], [0, hgt], [len * 0.35, hgt * 0.65], [len * 0.5, 0]], hgt * 0.07, w, (_x, y) => mixC(pal.plate, pal.accent, smooth(0.5, 1, y / hgt) * 0.6));
    });
    return;
  }
  // osteoderms: rows of keeled studs over the back and flanks
  const rows = flexible ? n * 2 : 10, angles = [0.55, 0.95, 1.5707, 2.19, 2.59];
  for (let k = 0; k < rows; k++) for (const [ai, a0] of angles.entries()) {
    const u = (k + 0.5 + (ai % 2) * 0.5) / (rows + 0.5), {bone, local, sec, w} = sample(u);
    const ay = axis(bone, 0, 1, 0), az = axis(bone, 0, 0, 1), c = at(bone, local, sec.yc);
    const normal = az.clone().multiplyScalar(-Math.cos(a0) * sec.h).addScaledVector(ay, Math.sin(a0) * sec.w).normalize();
    const surface = c.clone().addScaledVector(az, -Math.cos(a0) * sec.w * 0.97).addScaledVector(ay, Math.sin(a0) * sec.h * 0.97);
    const size = Math.min(sec.w, sec.h) * 0.16;
    tube(s, [surface.clone().addScaledVector(normal, -size * 0.4), surface.clone().addScaledVector(normal, size * 0.55), surface.clone().addScaledVector(normal, size * 0.95)], [size, size * 0.75, size * 0.08], [w, w, w], (i) => i ? mixC(pal.plate, pal.horn, 0.4) : pal.plate, 5, 0.1, 0.05);
  }
}
