import { BufferGeometry, Color, Float32BufferAttribute, Vector3 } from 'three';
import { specimenTraits } from './biosphere-model.ts';
import type { RockFamily, Species, Traits } from './biosphere-model.ts';

/** CPU phenotype compiler v1.  It deliberately makes structural, opaque meshes:
 * the lab material is white and uses these vertex colours directly. */
type Rng = () => number;
type Colour = [number, number, number];
const TAU = Math.PI * 2;

function hash(text: string) { let h = 2166136261; for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619); return h >>> 0; }
function random(key: string): Rng { let s = hash(key) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo)); }
function trait(t: Traits, key: keyof Traits, lo: number, hi: number) { return clamp(t[key] as number, lo, hi); }
function colour(value: string, light = 1): Colour {
  const m = /^#?([0-9a-f]{6})$/i.exec(value || ''); const hex = m ? m[1] : '738b52';
  // Color management converts CSS/sRGB hexadecimal input to linear once.
  const c = new Color(`#${hex}`);
  return [clamp(c.r * light, 0, 1), clamp(c.g * light, 0, 1), clamp(c.b * light, 0, 1)];
}
function mix(a: Colour, b: Colour, t: number): Colour { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

class MeshBuilder {
  readonly p: number[] = []; readonly c: number[] = [];
  tri(a: Vector3, b: Vector3, d: Vector3, col: Colour) {
    const cross = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(d, a));
    if (cross.lengthSq() < 1e-12) return;
    for (const v of [a, b, d]) { this.p.push(v.x, v.y, v.z); this.c.push(...col); }
  }
  outwardTri(a: Vector3, b: Vector3, d: Vector3, localCenter: Vector3, col: Colour) {
    const normal = b.clone().sub(a).cross(d.clone().sub(a)), faceCenter = a.clone().add(b).add(d).multiplyScalar(1 / 3);
    const outward = normal.dot(faceCenter.sub(localCenter)) >= 0;
    this.tri(a, outward ? b : d, outward ? d : b, col);
  }
  quad(a: Vector3, b: Vector3, c: Vector3, d: Vector3, col: Colour) { this.tri(a, b, d, col); this.tri(b, c, d, col); }
  frustum(a: Vector3, b: Vector3, ra: number, rb: number, sides: number, col: Colour, caps = false) {
    const axis = new Vector3().subVectors(b, a); if (axis.lengthSq() < 1e-10) return; axis.normalize();
    const u = new Vector3(0, 1, 0); if (Math.abs(axis.dot(u)) > .92) u.set(1, 0, 0); u.cross(axis).normalize(); const v = new Vector3().crossVectors(axis, u);
    const ring = (p: Vector3, r: number, i: number) => p.clone().addScaledVector(u, Math.cos(i * TAU / sides) * r).addScaledVector(v, Math.sin(i * TAU / sides) * r);
    for (let i = 0; i < sides; i++) this.quad(ring(a, ra, i), ring(a, ra, i + 1), ring(b, rb, i + 1), ring(b, rb, i), col);
    if (caps) for (let i = 0; i < sides; i++) { this.tri(a, ring(a, ra, i + 1), ring(a, ra, i), col); this.tri(b, ring(b, rb, i), ring(b, rb, i + 1), col); }
  }
  ellipsoid(center: Vector3, radii: Vector3, col: Colour, rings = 5, sides = 8) {
    const point = (r: number, s: number) => { const phi = r / rings * Math.PI; const th = s / sides * TAU; return new Vector3(center.x + radii.x * Math.sin(phi) * Math.cos(th), center.y + radii.y * Math.cos(phi), center.z + radii.z * Math.sin(phi) * Math.sin(th)); };
    for (let r = 0; r < rings; r++) for (let s = 0; s < sides; s++) this.quad(point(r, s), point(r, s + 1), point(r + 1, s + 1), point(r + 1, s), col);
  }
  leaf(center: Vector3, direction: Vector3, length: number, width: number, col: Colour) {
    const d = direction.clone().normalize(), side = new Vector3(-d.z, 0, d.x).normalize(); const up = new Vector3().crossVectors(side, d).normalize();
    const base = center.clone().addScaledVector(d, -length * .5), tip = center.clone().addScaledVector(d, length * .5);
    // A four-face, thin leaflet reads from every useful camera angle under a
    // FrontSide material, while remaining cheap enough for dense crowns.
    const thickness = Math.max(.002, width * .16), left = center.clone().addScaledVector(side, width).addScaledVector(up, thickness), right = center.clone().addScaledVector(side, -width).addScaledVector(up, thickness);
    this.outwardTri(base, left, tip, center, col); this.outwardTri(base, tip, right, center, col); this.outwardTri(base, right, left, center, col); this.outwardTri(left, right, tip, center, col);
  }
  finish() {
    const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(this.p, 3)); g.setAttribute('color', new Float32BufferAttribute(this.c, 3));
    g.computeVertexNormals(); g.computeBoundingBox();
    if (g.boundingBox) g.translate(0, -g.boundingBox.min.y, 0);
    g.computeBoundingBox(); g.computeBoundingSphere(); return g;
  }
}

function branchTree(b: MeshBuilder, t: Traits, r: Rng, spire: boolean) {
  const h = trait(t, 'heightM', .12, 25), width = trait(t, 'widthRatio', .12, 1.1) * h;
  const wood = colour(t.woodColor), leaf = colour(t.color), count = Math.round(trait(t, 'branchCount', 3, 28));
  const trunkTop = new Vector3((r() - .5) * h * .025, h, (r() - .5) * h * .025);
  b.frustum(new Vector3(0, 0, 0), trunkTop, Math.max(.025, h * .035), Math.max(.012, h * .014), 7, wood, true);
  const levels = spire ? Math.min(12, count) : Math.min(8, Math.max(3, Math.ceil(count / 3)));
  for (let level = 0; level < levels; level++) {
    const f = spire ? .18 + level / levels * .75 : .26 + level / levels * .65;
    const origin = new Vector3(trunkTop.x * f, h * f, trunkTop.z * f), atLevel = spire ? 4 + (level % 3) : 2 + (level % 3);
    for (let j = 0; j < atLevel; j++) {
      const angle = j * TAU / atLevel + level * 1.71 + (r() - .5) * .22;
      const reach = spire ? width * (1 - level / (levels + 1)) * .52 : width * (.38 + r() * .22);
      const elevation = spire ? .18 + r() * .24 : .20 + trait(t, 'branchAngle', .15, 1.3) * .24 + r() * .13;
      const end = origin.clone().add(new Vector3(Math.cos(angle) * reach, reach * elevation, Math.sin(angle) * reach));
      b.frustum(origin, end, Math.max(.009, h * .013 * (1 - level / (levels + 2))), .006, 5, wood);
      const twigs = spire ? 1 : 3;
      for (let k = 0; k < twigs; k++) {
        const td = end.clone().add(new Vector3(Math.cos(angle + (k ? .55 : -.55)) * reach * .26, reach * (.13 + r() * .16), Math.sin(angle + (k ? .55 : -.55)) * reach * .26));
        b.frustum(end, td, .009, .0045, 4, wood);
        // Shared traits are normalized [0.1, 1].  Map that phenotype density
        // to a visible leaf count on every connected twig, not a colour tint.
        const leaves = Math.round(8 + trait(t, 'leafDensity', .1, 1) * 12);
        for (let q = 0; q < leaves; q++) {
          const dir = td.clone().sub(end).normalize().add(new Vector3((r() - .5) * .7, (r() - .2) * .35, (r() - .5) * .7));
          const pos = end.clone().lerp(td, .35 + r() * .75);
          b.leaf(pos, dir, trait(t, 'leafLength', .015, .7) * (spire ? .95 : 1.55), trait(t, 'leafWidth', .006, .25) * (spire ? .58 : 1.4), mix(leaf, wood, r() * .05));
        }
      }
    }
  }
}

function shrub(b: MeshBuilder, t: Traits, r: Rng) {
  const h = trait(t, 'heightM', .12, 25), w = h * trait(t, 'widthRatio', .12, 1.1), wood = colour(t.woodColor), leaf = colour(t.color);
  const stems = Math.min(18, Math.max(5, Math.round(trait(t, 'branchCount', 4, 24))));
  for (let i = 0; i < stems; i++) {
    const a = i * TAU / stems + (r() - .5) * .4, len = h * (.58 + r() * .35);
    const base = new Vector3((r() - .5) * .05, 0, (r() - .5) * .05), elbow = new Vector3(Math.cos(a) * w * (.16 + r() * .13), len * .45, Math.sin(a) * w * (.16 + r() * .13));
    const end = new Vector3(Math.cos(a) * w * (.36 + r() * .3), len, Math.sin(a) * w * (.36 + r() * .3));
    b.frustum(base, elbow, Math.max(.012, h * .025), .012, 5, wood); b.frustum(elbow, end, .014, .005, 5, wood);
    for (let n = 0; n < 5; n++) { const d = end.clone().sub(elbow).normalize().add(new Vector3((r() - .5), (r() - .3) * .4, (r() - .5))).normalize(); b.leaf(end.clone().lerp(elbow, r() * .55), d, trait(t, 'leafLength', .025, .5), trait(t, 'leafWidth', .01, .22), leaf); }
  }
}

function grass(b: MeshBuilder, t: Traits, r: Rng) {
  const h = trait(t, 'heightM', .08, 25), curve = trait(t, 'curvature', -.9, .9), leaf = colour(t.color), blades = Math.min(42, Math.max(10, Math.round(trait(t, 'branchCount', 3, 36) * 1.5)));
  for (let i = 0; i < blades; i++) {
    const a = i * 2.399963 + (r() - .5) * .22, radial = Math.sqrt(r()) * h * .14, root = new Vector3(Math.cos(a) * radial, 0, Math.sin(a) * radial), bend = new Vector3(Math.cos(a) * h * curve * (.15 + r() * .18), 0, Math.sin(a) * h * curve * (.15 + r() * .18));
    const prev = root.clone(); const width = Math.max(.006, trait(t, 'leafWidth', .006, .25));
    for (let s = 1; s <= 4; s++) { const f = s / 4, p = root.clone().add(new Vector3(0, h * f, 0)).addScaledVector(bend, f * f); const side = new Vector3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(width * (1 - f * .72)); b.quad(prev.clone().add(side), prev.clone().sub(side), p.clone().sub(side), p.clone().add(side), leaf); prev.copy(p); }
  }
}

function quadruped(b: MeshBuilder, t: Traits, r: Rng) {
  const bodyL = trait(t, 'bodyLength', .1, 3), h = trait(t, 'heightM', .12, 4), leg = h * trait(t, 'legRatio', .2, 1.4), bodyY = leg + h * .22, bodyW = bodyL * trait(t, 'widthRatio', .12, 1.1), hide = colour(t.color), dark = mix(hide, colour(t.woodColor || t.color), .18);
  b.ellipsoid(new Vector3(0, bodyY, 0), new Vector3(bodyL * .5, h * .24, bodyW * .5), hide, 5, 9);
  const headL = bodyL * trait(t, 'headRatio', .1, .7), head = new Vector3(bodyL * .55, bodyY + h * .12, 0); b.frustum(new Vector3(bodyL * .42, bodyY + h * .08, 0), head, h * .13, h * .11, 7, dark); b.ellipsoid(head, new Vector3(headL * .55, h * .19, bodyW * .36), hide, 5, 8);
  const legX = [-bodyL * .32, bodyL * .32], legZ = [-bodyW * .33, bodyW * .33];
  for (const x of legX) for (const z of legZ) { const hip = new Vector3(x, bodyY - h * .12, z), knee = new Vector3(x + (r() - .5) * bodyL * .06, leg * .48, z + (r() - .5) * bodyW * .08), foot = new Vector3(x + bodyL * .05, .025, z); b.frustum(hip, knee, h * .065, h * .045, 6, dark); b.frustum(knee, foot, h * .047, h * .03, 6, dark); b.ellipsoid(new Vector3(foot.x + bodyL * .035, .035, foot.z), new Vector3(bodyL * .085, .035, bodyW * .095), dark, 3, 6); }
  const tailRoot = new Vector3(-bodyL * .5, bodyY + h * .05, 0), tailEnd = tailRoot.clone().add(new Vector3(-bodyL * trait(t, 'tailLength', .05, .9), h * (.08 + r() * .18), 0)); b.frustum(tailRoot, tailEnd, h * .055, h * .016, 6, dark);
  for (const z of [-bodyW * .18, bodyW * .18]) b.leaf(head.clone().add(new Vector3(-headL * .15, h * .18, z)), new Vector3(-.2, .95, z > 0 ? .25 : -.25), h * .22, bodyW * .1, dark);
}

export function createSpeciesGeometry(species: Species, variant: number, stage: 'juvenile' | 'adult' = 'adult'): BufferGeometry {
  if (!species || typeof species.id !== 'string') throw new Error('Invalid species');
  if (!Number.isInteger(variant) || variant < 0 || variant >= 4) throw new Error('variant must be an integer from 0 to 3');
  if (stage !== 'juvenile' && stage !== 'adult') throw new Error('stage must be juvenile or adult');
  const r = random(`biosphere-phenotype-v1|${species.id}|${variant}|${stage}`), b = new MeshBuilder(), t = specimenTraits(species, variant, stage);
  if (species.family === 'branching') branchTree(b, t, r, false);
  else if (species.family === 'spire') branchTree(b, t, r, true);
  else if (species.family === 'bush') shrub(b, t, r);
  else if (species.family === 'blade') grass(b, t, r);
  else if (species.family === 'quadruped') quadruped(b, t, r);
  else throw new Error(`Unsupported species family: ${String(species.family)}`);
  return b.finish();
}

export function createRockGeometry(rock: RockFamily, variant: number): BufferGeometry {
  if (!rock || typeof rock.id !== 'string') throw new Error('Invalid rock family');
  if (!Number.isInteger(variant) || variant < 0 || variant >= 4) throw new Error('variant must be an integer from 0 to 3');
  const r = random(`biosphere-rock-v1|${rock.id}|${variant | 0}`), b = new MeshBuilder(), col = colour(rock.color), sides = 7 + (variant & 1), scale = clamp(rock.scaleM, .08, 5), elongation = clamp(rock.elongation, .35, 2.5), layers = Math.round(clamp(rock.layers, 1, 8));
  const ring = (y: number, radius: number, jitter: number, i: number) => { const a = i * TAU / sides; const q = 1 + jitter * Math.sin(i * 7.13 + variant * 1.7); return new Vector3(Math.cos(a) * radius * elongation * q, y, Math.sin(a) * radius * q); };
  if (rock.form === 'angular') {
    const base = Array.from({ length: sides }, (_, i) => ring(0, scale * .55, .22, i)), shoulder = Array.from({ length: sides }, (_, i) => ring(scale * (.45 + r() * .14), scale * (.5 + r() * .17), .32, i)), top = new Vector3((r() - .5) * scale * .28, scale * (.9 + r() * .32), (r() - .5) * scale * .28);
    for (let i = 0; i < sides; i++) { b.quad(base[i], shoulder[i], shoulder[(i + 1) % sides], base[(i + 1) % sides], mix(col, colour('#ffffff'), .03 * (i & 1))); b.tri(shoulder[i], top, shoulder[(i + 1) % sides], col); }
  } else {
    const bands = rock.form === 'layered' ? Math.max(2, layers) : 5;
    const rings: Vector3[][] = [];
    for (let j = 0; j <= bands; j++) { const f = j / bands; const profile = rock.form === 'rounded' ? Math.sin(f * Math.PI) : .74 + Math.sin(f * Math.PI) * .24; const y = scale * (rock.form === 'layered' ? f * (.72 + r() * .1) : f * .86); rings.push(Array.from({ length: sides }, (_, i) => ring(y, scale * profile * (.8 + r() * .1), rock.form === 'rounded' ? .06 : .025, i))); }
    for (let j = 0; j < bands; j++) for (let i = 0; i < sides; i++) b.quad(rings[j][i], rings[j + 1][i], rings[j + 1][(i + 1) % sides], rings[j][(i + 1) % sides], rock.form === 'layered' ? mix(col, colour('#ffffff'), (j & 1) * .07) : col);
    const bottom = new Vector3(0, 0, 0), top = new Vector3(0, scale * (rock.form === 'rounded' ? .92 : .82), 0); for (let i = 0; i < sides; i++) { b.tri(bottom, rings[0][i], rings[0][(i + 1) % sides], col); b.tri(rings[bands][i], top, rings[bands][(i + 1) % sides], col); }
  }
  return b.finish();
}
