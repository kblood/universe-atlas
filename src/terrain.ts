import {
  hash64,
  macroHeightCode,
  noise,
  type Body,
  type V3,
} from "./catalog.ts";

export const TERRAIN_VERSION = "terrain-1.1.0";
export const ELEVATION_RANGE_M = 60000;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mix = (a: number[], b: number[], t: number) =>
  a.map((v, i) => v + (b[i] - v) * clamp(t));

/** One continuous direction-space field for orbital geometry, colour and detail.
 * Keeps the catalogue's macro-continent seed; no longitude or LOD-dependent noise. */
export function terrainSampler(body: Body) {
  const code = Number(hash64(body.seed + "/macro-v1") & 0xffffffffn);
  const n = (d: V3, f: number, seed: number) =>
    noise(d[0] * f + 13, d[1] * f + 37, d[2] * f + 19, code + seed);
  const sea = 0.37 + body.water * 0.22;
  return (d: V3) => {
    const macro = macroHeightCode(code, d);
    if (body.type === "Gas giant") {
      const turbulence = n(d, 9, 24),
        bands = 0.5 + 0.5 * Math.sin(d[1] * 75 + turbulence * 8);
      const fine = n(d, 80, 22);
      return {
        elevationM: 0,
        ocean: false,
        color: mix([135, 98, 68], [225, 197, 153], bands * 0.8 + fine * 0.2),
        roughness: 1,
      };
    }
    const coast =
      macro + (n(d, 42, 5) - 0.5) * 0.012 + (n(d, 90, 6) - 0.5) * 0.003;
    const ridges = (1 - Math.abs(n(d, 30, 7) * 2 - 1)) ** 5;
    const fine = (n(d, 80, 8) - 0.5) * 380 + (n(d, 155, 9) - 0.5) * 95;
    const landFactor = clamp((coast - sea) * 12);
    let elevationM = body.water
      ? (coast - sea) * 47000 + ridges * 2800 * landFactor + fine * landFactor
      : (macro - 0.46) * 44000 + ridges * 1800 + fine;
    elevationM =
      clamp(elevationM, -16000, 18000) * Math.min(1, body.radiusM / 2e6);
    // Metre-based wavelengths, shared by collision, orbit previews and tiles.
    // Positive land detail fades to zero at sea level, preserving every coast.
    const landDetail = body.water ? clamp(elevationM / 700) : 1;
    if (landDetail > 0) {
      const hills = (1 - Math.abs(n(d, body.radiusM / 6500, 71) * 2 - 1)) ** 3;
      const gullies = n(d, body.radiusM / 1400, 72);
      const rocks = n(d, body.radiusM / 260, 73);
      elevationM += (hills * 620 + gullies * 130 + rocks * 22) * landDetail;
    }
    const ocean = !!body.water && elevationM < 0;
    const latitude = Math.abs(d[1]);
    const snow = clamp(
      (latitude - 0.79) * 7 + Math.max(0, elevationM - 2600) / 3300,
    );
    let color: number[];
    if (ocean) {
      color = mix(
        [26, 114, 139],
        [5, 25, 58],
        Math.sqrt(clamp(-elevationM / 5500)),
      );
      if (latitude > 0.94)
        color = mix(color, [202, 225, 234], clamp((latitude - 0.94) * 25));
    } else if (body.water) {
      const moisture = n(d, 5, 30);
      const aridity = clamp(
        (0.5 - moisture) * 4 + (latitude > 0.18 && latitude < 0.52 ? 0.17 : 0),
      );
      color = mix([40, 89, 48], [173, 145, 89], aridity);
      color = mix(color, [134, 124, 107], clamp((elevationM - 1500) / 4300));
      if (elevationM < 120)
        color = mix([185, 175, 128], color, elevationM / 120);
      color = mix(color, [216, 228, 226], snow);
    } else if (body.type === "Ice world") {
      color = mix([119, 156, 178], [218, 232, 239], macro * 0.8 + ridges * 0.2);
    } else if (body.type === "Volcanic world") {
      color = mix([49, 42, 42], [131, 85, 62], macro);
    } else {
      color = mix([55, 51, 49], [168, 154, 135], macro);
    }
    const grain = 0.91 + n(d, 115, 35) * 0.18;
    const localGrain = ocean ? 1 : .88 + n(d, body.radiusM / 800, 74) * .24;
    return {
      elevationM,
      ocean,
      color: color.map((v) => clamp(v * grain * localGrain, 0, 255)),
      roughness: ocean ? 0.28 : 0.9,
    };
  };
}

export function planetSurface(body: Body, width = 1024, segments = 192) {
  const sample = terrainSampler(body),
    height = width / 2;
  const data = new Uint8Array(width * height * 4),
    relief = new Uint8Array(width * height * 4),
    roughness = new Uint8Array(width * height * 4);
  let landPixels = 0,
    totalWeight = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const theta = ((x + 0.5) / width) * Math.PI * 2,
        phi = ((y + 0.5) / height) * Math.PI;
      const d: V3 = [
        -Math.cos(theta) * Math.sin(phi),
        Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
      ];
      const s = sample(d),
        i = (y * width + x) * 4;
      data.set([...s.color, 255], i);
      // Visible ocean is a constant-radius sea surface. Seafloor remains in the sampler.
      const visible = body.water ? Math.max(0, s.elevationM) : s.elevationM;
      const h = clamp(0.5 + visible / ELEVATION_RANGE_M) * 255;
      relief.set([h, h, h, 255], i);
      const r = s.roughness * 255;
      roughness.set([r, r, r, 255], i);
      const weight = Math.sin(phi);
      totalWeight += weight;
      if (!s.ocean) landPixels += weight;
    }
  const rows = segments / 2;
  const elevations = new Float32Array((segments + 1) * (rows + 1));
  for (let y = 0; y <= rows; y++)
    for (let x = 0; x <= segments; x++) {
      const theta = (x / segments) * Math.PI * 2,
        phi = (y / rows) * Math.PI;
      const s = sample([
        -Math.cos(theta) * Math.sin(phi),
        Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
      ]);
      elevations[y * (segments + 1) + x] = body.water
        ? Math.max(0, s.elevationM)
        : s.elevationM;
    }
  return {
    data,
    relief,
    roughness,
    width,
    height,
    elevations,
    segments,
    version: TERRAIN_VERSION,
    landFraction: landPixels / totalWeight,
  };
}
