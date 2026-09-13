import type {RiverRegion} from './river-types.ts';
import { densityOverview } from "./galaxy-field.ts";
import {phaseAt, type OrbitTime} from './world-time.ts';
/** Pure catalogue. No renderer state, wall clock, or exploration-order inputs. */
export const VERSION = "atlas-1.0.0";
export const LY = 9.4607304725808e15;
export const AU = 149597870700;
export const G = 6.6743e-11;
const MASK = (1n << 64n) - 1n;
export type V3 = [number, number, number];
export type Morphology =
  | "Spiral"
  | "Barred spiral"
  | "Elliptical"
  | "Irregular";
export interface Galaxy {
  id: string;
  name: string;
  type: Morphology;
  position: V3;
  rotation: V3;
  radiusLy: number;
  seed: string;
  arms: number;
  pitch: number;
  phase: number;
  tint: number;
}
export interface SystemRef {
  id: string;
  name: string;
  galaxyId: string;
  cell: V3;
  ordinal: number;
  position: V3;
  seed: string;
  color: string;
}
export interface Orbit {
  a: number;
  e: number;
  inclination: number;
  node: number;
  periapsis: number;
  anomaly: number;
  mu: number;
}
export interface Body {
  hydrology?: RiverRegion;
  id: string;
  name: string;
  kind: "star" | "planet" | "moon";
  type: string;
  parentId: string;
  massKg: number;
  radiusM: number;
  temperatureK: number;
  color: string;
  orbit: Orbit | null;
  seed: string;
  water: number;
  rings: boolean;
}
export interface StarSystem {
  id: string;
  name: string;
  ref: SystemRef;
  stars: Body[];
  planets: Body[];
  moons: Body[];
  belts: { id: string; name: string; innerM: number; outerM: number }[];
  version: string;
}
export function hash64(s: string): bigint {
  let h = 14695981039346656037n;
  for (const c of new TextEncoder().encode(s)) {
    h ^= BigInt(c);
    h = (h * 1099511628211n) & MASK;
  }
  return h;
}
export function pcg(initstate: bigint, initseq: bigint) {
  let state = 0n;
  const inc = ((initseq << 1n) | 1n) & MASK;
  const next = () => {
    const old = state;
    state = (old * 6364136223846793005n + inc) & MASK;
    const x = Number((((old >> 18n) ^ old) >> 27n) & 0xffffffffn) >>> 0;
    const rot = Number(old >> 59n);
    return ((x >>> rot) | (x << (-rot & 31))) >>> 0;
  };
  next();
  state = (state + initstate) & MASK;
  next();
  return next;
}
export function rng(key: string) {
  const next = pcg(hash64(key), hash64(key + "/stream"));
  return () => next() / 4294967296;
}
const start = [
  "Al",
  "An",
  "As",
  "Aur",
  "Bel",
  "Ca",
  "Cer",
  "Da",
  "El",
  "Er",
  "Es",
  "Hal",
  "Il",
  "Is",
  "Ka",
  "Kel",
  "La",
  "Leth",
  "Ly",
  "Ma",
  "Mer",
  "Na",
  "Ne",
  "Or",
  "Ra",
  "Sa",
  "Sel",
  "Ta",
  "Va",
  "Ve",
  "Yl",
  "Ze",
];
const middle = [
  "a",
  "ae",
  "ar",
  "e",
  "el",
  "en",
  "i",
  "il",
  "in",
  "o",
  "or",
  "u",
  "un",
  "y",
];
const end = [
  "ra",
  "ria",
  "ron",
  "ris",
  "th",
  "thea",
  "ven",
  "va",
  "lia",
  "lis",
  "nor",
  "nus",
  "s",
  "sara",
  "se",
  "tar",
  "tis",
  "une",
  "us",
  "wyn",
];
export function name(key: string) {
  const r = rng(key + "/name-v1");
  return (
    start[Math.floor(r() * start.length)] +
    middle[Math.floor(r() * middle.length)] +
    end[Math.floor(r() * end.length)]
  );
}
export function galaxies(seed: string): Galaxy[] {
  return Array.from({ length: 32 }, (_, i) => {
    const id = `G${String(i + 1).padStart(3, "0")}`;
    const key = JSON.stringify([seed, id]);
    const r = rng(key);
    const group = Math.floor(i / 8);
    const a = r() * Math.PI * 2,
      d = 0.35 + r() * 1.25;
    return {
      id,
      name: name(key),
      seed: key,
      type: (
        ["Spiral", "Barred spiral", "Elliptical", "Irregular"] as Morphology[]
      )[i % 4],
      position: [
        (group % 2) * 5 - 2.5 + Math.cos(a) * d,
        (r() - 0.5) * 2.8,
        Math.floor(group / 2) * 5 - 2.5 + Math.sin(a) * d,
      ],
      rotation: [(r() - 0.5) * 1.7, r() * 6.28, (r() - 0.5) * 0.6],
      radiusLy: 18000 + r() * 38000,
      arms: 2 + Math.floor(r() * 3),
      pitch: 0.22 + r() * 0.22,
      phase: r() * 6.28,
      tint: r(),
    };
  });
}
const sq = (x: number) => x * x;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
/** Fixed arithmetic approximations keep density branch decisions independent of platform libm. */
function expNeg(x: number) {
  let v = 1 + Math.max(0, x) / 256;
  for (let i = 0; i < 8; i++) v *= v;
  return 1 / v;
}
function sine(x: number) {
  x =
    ((((x + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  let sum = x,
    term = x;
  for (let n = 1; n < 10; n++) {
    term *= (-x * x) / (2 * n * (2 * n + 1));
    sum += term;
  }
  return sum;
}
function logPos(x: number) {
  let e = 0;
  while (x > 2) {
    x *= 0.5;
    e++;
  }
  while (x < 1) {
    x *= 2;
    e--;
  }
  const t = (x - 1) / (x + 1);
  let v = t,
    s = t;
  for (let i = 3; i < 24; i += 2) {
    v *= t * t;
    s += v / i;
  }
  return 2 * s + e * 0.6931471805599453;
}
export function spiralArmStrength(
  g: Galaxy,
  x: number,
  z: number,
  r = Math.sqrt(x * x + z * z),
) {
  const R = g.radiusLy;
  const armAngle =
    g.phase + logPos(Math.max(r, R * 0.04) / (R * 0.2)) / Math.tan(g.pitch);
  const t = g.arms * (Math.atan2(z, x) - armAngle);
  return Math.pow((1 + sine(t + Math.PI / 2)) * 0.5, 6);
}
export function density(g: Galaxy, p: V3) {
  const [x, y, z] = p;
  const R = g.radiusLy,
    r = Math.sqrt(x * x + z * z),
    r3 = Math.sqrt(x * x + y * y + z * z);
  if (r3 > R * 1.4) return 0;
  if (g.type === "Elliptical") {
    const q = Math.sqrt(sq(x / R) + sq(y / (R * 0.58)) + sq(z / (R * 0.78)));
    return 0.035 * expNeg(q * 7) * clamp((1.3 - q) * 5, 0, 1);
  }
  if (g.type === "Irregular") {
    let d = 0.0002 * expNeg((r3 / R) * 4);
    for (let i = 0; i < 4; i++) {
      const a = g.phase + i * 2.3;
      const cx = sine(a) * R * 0.43,
        cz = sine(a + Math.PI / 2) * R * 0.38;
      d +=
        0.011 *
        expNeg(
          (sq((x - cx) / (R * 0.22)) +
            sq(y / (R * 0.17)) +
            sq((z - cz) / (R * 0.22))) *
            2,
        );
    }
    return d;
  }
  const disk =
    0.022 * expNeg(r / (R * 0.27)) * expNeg(Math.abs(y) / (R * 0.015));
  const bulge = 0.16 * expNeg(r3 / (R * 0.06));
  // atan2 only shapes a quantized density; supported-browser fixtures guard the sampler contract.
  const arm = spiralArmStrength(g, x, z, r);
  const bar =
    g.type === "Barred spiral"
      ? 0.04 *
        expNeg(sq(x / (R * 0.24)) + sq(z / (R * 0.045)) + sq(y / (R * 0.025)))
      : 0;
  return (
    Math.round(
      (disk * (0.4 + 2 * arm) + bulge + bar) *
        clamp((1 - r / R) * 10, 0, 1) *
        1e9,
    ) / 1e9
  );
}
export function overview(g: Galaxy, count: number) {
  return densityOverview(g, count);
}

function poisson(lambda: number, r: () => number) {
  if (lambda <= 0) return 0; // Chunking the mean bounds work and avoids underflow without changing the distribution.
  let count = 0;
  while (lambda > 0) {
    const part = Math.min(lambda, 12);
    const limit = expNeg(part);
    let p = 1,
      n = 0;
    do {
      p *= Math.max(r(), 1e-12);
      n++;
    } while (p > limit);
    count += n - 1;
    lambda -= part;
  }
  return count;
}
export function sector(g: Galaxy, coords: V3, maxRefs = 10000) {
  const refs: SystemRef[] = [];
  let total = 0;
  const cells: { cell: V3; count: number }[] = [];
  for (let x = 0; x < 8; x++)
    for (let y = 0; y < 8; y++)
      for (let z = 0; z < 8; z++) {
        const cell: V3 = [
          coords[0] * 8 + x,
          coords[1] * 8 + y,
          coords[2] * 8 + z,
        ];
        const key = JSON.stringify([g.seed, cell]);
        const center: V3 = cell.map((v) => v * 4 + 2) as V3;
        const count = poisson(density(g, center) * 64, rng(key + "/count"));
        cells.push({ cell, count });
        total += count;
      }
  const stride = Math.max(1, Math.ceil(total / maxRefs));
  let global = 0;
  for (const { cell, count } of cells)
    for (let i = 0; i < count; i++, global++) {
      if (global % stride) continue;
      const key = JSON.stringify([g.seed, cell, i]);
      const r = rng(key + "/position");
      const position = cell.map(
        (v) => Math.round((v * 4 + r() * 4) * 1e9) / 1e9,
      ) as V3;
      const id = `${g.id}/C${cell.join(",")}/${i}`;
      const rr = rng(key + "/star-color")();
      refs.push({
        id,
        name: name(key),
        galaxyId: g.id,
        cell,
        ordinal: i,
        position,
        seed: key,
        color: rr < 0.55 ? "#ffae7d" : rr < 0.85 ? "#ffe6b6" : "#b3d7ff",
      });
    }
  return { refs, total, coords, aggregated: stride > 1 };
}
export function refByAddress(g: Galaxy, address: string): SystemRef | null {
  const m = address.match(/^G\d+\/C(-?\d+),(-?\d+),(-?\d+)\/(\d+)$/);
  if (!m || !address.startsWith(g.id + "/")) return null;
  const cell = m.slice(1, 4).map(Number) as V3;
  const ordinal = Number(m[4]);
  if (
    cell.some(
      (n) => !Number.isSafeInteger(n) || Math.abs(n) * 4 > g.radiusLy * 1.5,
    ) ||
    ordinal > 100000
  )
    return null;
  const key = JSON.stringify([g.seed, cell]);
  const count = poisson(
    density(g, cell.map((v) => v * 4 + 2) as V3) * 64,
    rng(key + "/count"),
  );
  if (ordinal >= count) return null;
  const sk = JSON.stringify([g.seed, cell, ordinal]),
    r = rng(sk + "/position"),
    rr = rng(sk + "/star-color")();
  return {
    id: address,
    name: name(sk),
    galaxyId: g.id,
    cell,
    ordinal,
    position: cell.map((v) => Math.round((v * 4 + r() * 4) * 1e9) / 1e9) as V3,
    seed: sk,
    color: rr < 0.55 ? "#ffae7d" : rr < 0.85 ? "#ffe6b6" : "#b3d7ff",
  };
}
function orbit(r: () => number, a: number, mu: number): Orbit {
  return {
    a,
    e: r() * 0.12,
    inclination: (r() - 0.5) * 0.12,
    node: r() * 6.283,
    periapsis: r() * 6.283,
    anomaly: r() * 6.283,
    mu,
  };
}
export function system(ref: SystemRef): StarSystem {
  const sr = rng(ref.seed + "/architecture");
  const binary = sr() < 0.24;
  const count = binary ? 2 : 1;
  const stars: Body[] = [];
  const planets: Body[] = [];
  const moons: Body[] = [];
  for (let i = 0; i < count; i++) {
    const sk = ref.seed + "/star/" + i,
      r = rng(sk),
      solarMass = 0.18 + r() * 1.45,
      massKg = solarMass * 1.98847e30;
    stars.push({
      id: ref.id + "/star/" + i,
      name: name(sk),
      kind: "star",
      type:
        solarMass < 0.5
          ? "M · red dwarf"
          : solarMass < 0.8
            ? "K · orange dwarf"
            : solarMass < 1.1
              ? "G · yellow dwarf"
              : solarMass < 1.4
                ? "F · yellow-white star"
                : "A · white star",
      parentId: ref.id,
      massKg,
      radiusM: 6.957e8 * Math.pow(solarMass, 0.8),
      temperatureK: Math.round(5772 * Math.pow(solarMass, 0.5)),
      color:
        solarMass < 0.5
          ? "#ff9870"
          : solarMass < 0.8
            ? "#ffc28a"
            : solarMass < 1.1
              ? "#ffe2b1"
              : "#d7e7ff",
      orbit: null,
      seed: sk,
      water: 0,
      rings: false,
    });
  }
  const totalMass = stars.reduce((s, b) => s + b.massKg, 0);
  const binaryA = AU * 0.065;
  if (binary) {
    const mu = G * totalMass;
    const base = orbit(rng(ref.seed + "/binary"), binaryA, mu);
    base.e = 0.03;
    for (let i = 0; i < 2; i++) {
      const fraction = stars[1 - i].massKg / totalMass;
      stars[i].orbit = {
        ...base,
        a: binaryA * fraction,
        mu: mu * fraction ** 3,
        periapsis: base.periapsis + (i ? Math.PI : 0),
      };
    }
  }
  const np = Math.floor(sr() * 11) + 1;
  let nextA = (binary ? 0.65 : 0.18) + sr() * 0.25;
  for (let i = 0; i < np; i++) {
    const sk = ref.seed + "/planet/" + i,
      r = rng(sk);
    nextA *= 1.65 + r() * 0.65;
    const giant = nextA > 2 && r() < 0.55;
    const water =
      !giant && nextA > 0.5 && nextA < 3.8 && r() < 0.62
        ? 0.38 + r() * 0.35
        : 0;
    const radiusM = giant ? 2e7 + r() * 5.4e7 : 2e6 + r() * 7e6;
    const type = giant
      ? "Gas giant"
      : water
        ? "Oceanic world"
        : nextA > 4
          ? "Ice world"
          : nextA < 0.65
            ? "Volcanic world"
            : "Rocky world";
    const p: Body = {
      id: ref.id + "/planet/" + i,
      name: name(sk),
      kind: "planet",
      type,
      parentId: binary ? ref.id : stars[0].id,
      massKg: ((4 * Math.PI) / 3) * radiusM ** 3 * (giant ? 1200 : 4800),
      radiusM,
      temperatureK: Math.round(278 / Math.sqrt(nextA)),
      color: giant
        ? "#cfae85"
        : water
          ? "#3985ae"
          : type === "Ice world"
            ? "#b4d9df"
            : type === "Volcanic world"
              ? "#bb6651"
              : "#a5917f",
      orbit: orbit(r, nextA * AU, G * totalMass),
      seed: sk,
      water,
      rings: giant && r() < 0.55,
    };
    planets.push(p);
    const moonCount = Math.floor(r() * (giant ? 9 : 4));
    let ma = radiusM * 4;
    const hill =
      p.orbit!.a * (1 - p.orbit!.e) * Math.cbrt(p.massKg / (3 * totalMass));
    for (let j = 0; j < moonCount; j++) {
      const mk = sk + "/moon/" + j,
        mr = rng(mk);
      ma *= 1.5 + mr() * 0.45;
      if (ma > hill * 0.25) break;
      const rad = Math.min(radiusM * 0.2, 3e5 + mr() * 1.8e6);
      moons.push({
        id: p.id + "/moon/" + j,
        name: name(mk),
        kind: "moon",
        type: "Airless moon",
        parentId: p.id,
        massKg: ((4 * Math.PI) / 3) * rad ** 3 * 3000,
        radiusM: rad,
        temperatureK: p.temperatureK,
        color: "#b4b2ab",
        orbit: orbit(mr, ma, G * p.massKg),
        seed: mk,
        water: 0,
        rings: false,
      });
    }
  }
  const belts =
    planets.length > 3 && sr() < 0.65
      ? [
          {
            id: ref.id + "/belt/0",
            name: name(ref.seed + "/belt") + " Belt",
            innerM: planets[1].orbit!.a * 1.25,
            outerM: planets[2].orbit!.a * 0.8,
          },
        ].filter((b) => b.outerM > b.innerM)
      : [];
  return {
    id: ref.id,
    name: ref.name,
    ref,
    stars,
    planets,
    moons,
    belts,
    version: VERSION,
  };
}
export function orbitPosition(o: Orbit | null, time: OrbitTime = 0): V3 {
  if (!o) return [0, 0, 0];
  const M = (o.anomaly + phaseAt(time, Math.sqrt(o.mu / o.a ** 3))) % (Math.PI * 2);
  let E = M;
  for (let i = 0; i < 12; i++) {
    const d = (E - o.e * Math.sin(E) - M) / (1 - o.e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  const x = o.a * (Math.cos(E) - o.e),
    z = o.a * Math.sqrt(1 - o.e * o.e) * Math.sin(E);
  const a = o.periapsis,
    n = o.node,
    c = Math.cos(o.inclination),
    s = Math.sin(o.inclination);
  const u = x * Math.cos(a) - z * Math.sin(a),
    v = x * Math.sin(a) + z * Math.cos(a);
  return [
    u * Math.cos(n) - v * c * Math.sin(n),
    v * s,
    u * Math.sin(n) + v * c * Math.cos(n),
  ];
}
export function bodyPosition(b: Body, sys: StarSystem, time: OrbitTime = 0): V3 {
  const p = orbitPosition(b.orbit, time);
  const parent = [...sys.stars, ...sys.planets].find(
    (x) => x.id === b.parentId,
  );
  if (parent) {
    const v = orbitPosition(parent.orbit, time);
    return p.map((x, i) => x + v[i]) as V3;
  }
  return p;
}
function ihash(x: number, y: number, z: number, s: number) {
  let h =
    Math.imul(x, 374761393) ^
    Math.imul(y, 668265263) ^
    Math.imul(z, 2147483647) ^
    s;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
export function noise(x: number, y: number, z: number, s: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    iz = Math.floor(z);
  let a = x - ix,
    b = y - iy,
    c = z - iz;
  a = a * a * (3 - 2 * a);
  b = b * b * (3 - 2 * b);
  c = c * c * (3 - 2 * c);
  let value = 0;
  for (let dx = 0; dx < 2; dx++)
    for (let dy = 0; dy < 2; dy++)
      for (let dz = 0; dz < 2; dz++)
        value +=
          ihash(ix + dx, iy + dy, iz + dz, s) *
          (dx ? a : 1 - a) *
          (dy ? b : 1 - b) *
          (dz ? c : 1 - c);
  return value;
}
export function macroHeight(seed: string, d: V3) {
  return macroHeightCode(Number(hash64(seed + "/macro-v1") & 0xffffffffn), d);
}
export function macroHeightCode(s: number, d: V3) {
  return (
    0.68 * noise(d[0] * 2.6 + 11, d[1] * 2.6 + 31, d[2] * 2.6 + 17, s) +
    0.23 * noise(d[0] * 5.2, d[1] * 5.2, d[2] * 5.2, s + 1) +
    0.09 * noise(d[0] * 10.4, d[1] * 10.4, d[2] * 10.4, s + 2)
  );
}
export function surfaceSample(
  b: Body,
  d: V3,
  code = Number(hash64(b.seed + "/macro-v1") & 0xffffffffn),
): [number, number, number] {
  const h = macroHeightCode(code, d);
  if (b.type === "Gas giant") {
    const band = 0.5 + 0.5 * Math.sin(d[1] * 60 + h * 8);
    return [145 + band * 72, 113 + band * 67, 83 + band * 52];
  }
  if (b.water) {
    const sea = 0.37 + b.water * 0.22;
    if (Math.abs(d[1]) > 0.9 + h * 0.045) return [211, 225, 223];
    if (h < sea) {
      const t = clamp((sea - h) * 7, 0, 1);
      return [19 - 9 * t, 89 - 57 * t, 118 - 58 * t];
    }
    const t = clamp((h - sea) * 7, 0, 1);
    return [125 - 55 * t, 137 - 44 * t, 89 - 34 * t];
  }
  if (b.type === "Ice world") return [148 + h * 74, 169 + h * 66, 183 + h * 60];
  if (b.type === "Volcanic world")
    return [99 + h * 83, 46 + h * 61, 33 + h * 52];
  return [73 + h * 115, 69 + h * 109, 66 + h * 101];
}
export function surfaceTexture(b: Body, width = 512) {
  const code = Number(hash64(b.seed + "/macro-v1") & 0xffffffffn);
  const height = width / 2,
    data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const theta = ((x + 0.5) / width) * Math.PI * 2,
        phi = ((y + 0.5) / height) * Math.PI;
      const d: V3 = [
        -Math.cos(theta) * Math.sin(phi),
        Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
      ];
      const rgb = surfaceSample(b, d, code),
        j = (y * width + x) * 4;
      data[j] = rgb[0];
      data[j + 1] = rgb[1];
      data[j + 2] = rgb[2];
      data[j + 3] = 255;
    }
  return { data, width, height };
}
