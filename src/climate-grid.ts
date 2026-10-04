import { macroHeightCode } from './catalog.ts';
import { detAtan2, detExp, sine, detCos } from './det-math.ts';

export const CLIMATE_GRID_VERSION = 'climate-grid-1';
export type LandProfile =
  | { kind: 'relief'; tau: number; hc: number; hup: number; b1: number; b2: number; hhi: number; b3: number; b4: number }
  | { kind: 'linear'; metresPerUnit: number };
export type ClimateGridParams = {
  moistureSeed: number; water: number; radiusM: number; obliquityRad: number;
  itczSinLat: number; hadleyEdgeDeg: number; zonalAnnualK: Float64Array; land?: LandProfile;
};
export type ClimateGrid = { version: typeof CLIMATE_GRID_VERSION; precipMul: Float32Array; oceanness: Float32Array };
export type ClimateGridSample = { precipMul: number; oceanness01: number };
const NX = 128, NY = 64, N = NX * NY, SIDE = 33, FACE = SIDE * SIDE;
const PI = Math.PI, STEP = PI / NY;
const LEGACY: LandProfile = { kind: 'linear', metresPerUnit: 47000 };
const smooth = (lo: number, hi: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

/** a0 is raw continental metres, not macro units. Relief is recommended;
 * absent land uses the legacy linear proxy. Clamp before radius scaling to
 * match terrain's floor. Ridges, fine and coast perturbation are deliberately
 * omitted: this grid models continentality and plateau-scale rain shadow. */
export function landProxyHeightM(a0: number, radiusM: number, profile: LandProfile): number {
  a0 = Math.max(0, a0);
  const h = profile.kind === 'linear' ? a0 * (profile.metresPerUnit / 47000)
    : a0 / (1 + a0 / profile.hc) + profile.tau * (
      profile.hup * smooth(profile.b1, profile.b2, a0) + profile.hhi * smooth(profile.b3, profile.b4, a0));
  return Math.max(0, Math.min(18000, h)) * Math.min(1, radiusM / 2e6);
}

// Immutable geometry shared by builds, independent of all planet parameters.
const rowY = new Float64Array(NY), rowCos = new Float64Array(NY);
const rowDiag = new Float64Array(NY - 1);
const lonX = new Float64Array(NX), lonZ = new Float64Array(NX);
for (let y = 0; y < NY; y++) {
  rowY[y] = sine(-PI / 2 + (y + 0.5) * STEP);
  rowCos[y] = Math.sqrt(1 - rowY[y] * rowY[y]);
}
for (let y = 0; y < NY - 1; y++) {
  const c = (rowCos[y] + rowCos[y + 1]) / 2;
  rowDiag[y] = Math.sqrt(1 + c * c);
}
for (let x = 0; x < NX; x++) {
  const lon = -PI + (x + 0.5) * STEP;
  lonX[x] = detCos(lon); lonZ[x] = sine(lon);
}
const cubeX = new Float64Array(6 * FACE), cubeY = new Float64Array(6 * FACE);
for (let f = 0; f < 6; f++) for (let j = 0; j < SIDE; j++) for (let i = 0; i < SIDE; i++) {
  const u = i / 16 - 1, v = j / 16 - 1, s = f % 2 === 0 ? 1 : -1;
  const x = f < 2 ? s : u, y = f < 2 ? u : f < 4 ? s : v, z = f < 4 ? v : s;
  const k = f * FACE + j * SIDE + i;
  cubeX[k] = (detAtan2(z, x) + PI) / STEP - 0.5;
  cubeY[k] = (detAtan2(y, Math.sqrt(x * x + z * z)) + PI / 2) / STEP - 0.5;
}

/** Test-only source: row-major south-to-north cell centres, longitude -pi..pi.
 * Heights are already scaled metres. Optional distanceKm receives diagnostics;
 * neither the mask nor any temporary arrays are retained by the result. */
export type ClimateGridTestMask = { ocean: Uint8Array; heightM: Float64Array; distanceKm?: Float64Array };
export function buildClimateGridFromMask(p: ClimateGridParams, mask: ClimateGridTestMask): ClimateGrid {
  if (mask.ocean.length !== N || mask.heightM.length !== N || (mask.distanceKm && mask.distanceKm.length !== N))
    throw new RangeError('Climate mask must contain 128 x 64 cells');
  return build(p, mask);
}
export function buildClimateGrid(p: ClimateGridParams): ClimateGrid { return build(p); }

function build(p: ClimateGridParams, mask?: ClimateGridTestMask): ClimateGrid {
  // Caller supplies finite parameters, positive radius, 65 finite temperatures,
  // 0 <= itczSinLat <= 1 and physically nonnegative relief coefficients.
  const g: ClimateGrid = { version: CLIMATE_GRID_VERSION, precipMul: new Float32Array(6 * FACE), oceanness: new Float32Array(6 * FACE) };
  g.precipMul.fill(1);
  if (p.water <= 0) { mask?.distanceKm?.fill(Infinity); return g; }
  const ocean = mask?.ocean ?? new Uint8Array(N), height = mask?.heightM ?? new Float64Array(N);
  let count = 0;
  const d: [number, number, number] = [0, 0, 0], sea = 0.37 + 0.22 * p.water;
  for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
    const k = y * NX + x;
    if (!mask) {
      d[0] = rowCos[y] * lonX[x]; d[1] = rowY[y]; d[2] = rowCos[y] * lonZ[x];
      const m = macroHeightCode(p.moistureSeed, d);
      ocean[k] = m < sea ? 1 : 0;
      height[k] = ocean[k] ? 0 : landProxyHeightM((m - sea) * 47000, p.radiusM, p.land ?? LEGACY);
    }
    if (ocean[k]) count++;
  }
  if (count === N) { g.oceanness.fill(1); mask?.distanceKm?.fill(0); return g; }
  const dist = new Float64Array(N), wet = new Float64Array(N), rain = new Float64Array(N);
  for (let k = 0; k < N; k++) dist[k] = ocean[k] ? 0 : Infinity;
  const dy = STEP * p.radiusM / 1000;
  // Eight-neighbour chamfer on the spherical cell metric. Relax to a fixed
  // point, including wrapped longitude and the opposite cell across each pole.
  // This removes arbitrary seam/start-column dependence even for tiny oceans.
  if (count) {
    let changed = true;
    while (changed) {
      changed = false;
      for (let pass = 0; pass < 2; pass++) for (let n = 0; n < N; n++) {
        const k = pass ? N - 1 - n : n, y = Math.floor(k / NX), x = k % NX;
        let best = dist[k];
        const dx = dy * rowCos[y];
        best = Math.min(best, dist[y * NX + ((x + 127) % NX)] + dx, dist[y * NX + ((x + 1) % NX)] + dx);
        for (let sign = -1; sign <= 1; sign += 2) {
          const yy = y + sign;
          if (yy < 0 || yy >= NY) best = Math.min(best, dist[y * NX + ((x + 64) % NX)] + dy);
          else {
            const diag = dy * rowDiag[Math.min(y, yy)];
            best = Math.min(best, dist[yy * NX + x] + dy,
              dist[yy * NX + ((x + 127) % NX)] + diag, dist[yy * NX + ((x + 1) % NX)] + diag);
          }
        }
        if (best < dist[k]) { dist[k] = best; changed = true; }
      }
    }
  }
  if (mask?.distanceKm) mask.distanceKm.set(dist);
  for (let k = 0; k < N; k++) wet[k] = ocean[k] ? 1 : count ? detExp(-dist[k] / 1500) : 0;
  const itcz = detAtan2(p.itczSinLat, Math.sqrt(1 - p.itczSinLat * p.itczSinLat));
  for (let y = 0; y < NY; y++) {
    const latitude = Math.abs(-PI / 2 + (y + 0.5) * STEP);
    // Absolute ITCZ latitude denotes mirrored northern/southern convergence.
    const deltaDeg = Math.abs(latitude - itcz) * 180 / PI;
    const wind = deltaDeg < p.hadleyEdgeDeg || deltaDeg >= 60 ? -1 : 1;
    const t = Math.abs(rowY[y]) * 64, i = Math.min(63, Math.floor(t));
    const temp = p.zonalAnnualK[i] + (p.zonalAnnualK[i + 1] - p.zonalAnnualK[i]) * (t - i);
    const sat = detExp(0.07 * (temp - 288));
    // L=2500 km gives exp(-2000/2500)=0.449 coastal retention.
    // k1=0.35 removes another 70% of the bucket on a 3 km ascent.
    const base = 1 - detExp(-dy * rowCos[y] / 2500), ref = sat * base;
    let w = 0;
    // No-ocean rows have the unique periodic equilibrium W=0 (rain floor).
    // First revolution encounters every ocean; the second is start-independent.
    for (let n = 0; n < 2 * NX; n++) {
      const x = wind > 0 ? n % NX : NX - 1 - n % NX, k = y * NX + x;
      if (ocean[k]) { w = sat; rain[k] = 1; }
      else {
        const up = y * NX + ((x - wind + NX) % NX);
        const rise = Math.max(0, height[k] - (ocean[up] ? 0 : height[up]));
        const amount = w * Math.min(0.9, base + 0.35 * rise / 1500);
        w -= amount;
        // Largest Float32 below 1.6 keeps the stored field inside the bound.
        rain[k] = Math.max(0.15, Math.min(1.5999999046325684, ref > 0 ? amount / ref : 0));
      }
    }
  }
  resample(rain, g.precipMul); resample(wet, g.oceanness);
  return g;
}

function resample(src: Float64Array, dst: Float32Array): void {
  let south = 0, north = 0;
  for (let x = 0; x < NX; x++) { south += src[x] / NX; north += src[(NY - 1) * NX + x] / NX; }
  for (let k = 0; k < dst.length; k++) {
    const xx = cubeX[k], yy = cubeY[k], xf = Math.floor(xx), a = xx - xf;
    const x0 = (xf + NX) % NX, x1 = (x0 + 1) % NX;
    const y0 = Math.max(0, Math.min(NY - 1, Math.floor(yy))), y1 = Math.min(NY - 1, y0 + 1);
    const lo = src[y0 * NX + x0] * (1 - a) + src[y0 * NX + x1] * a;
    const hi = src[y1 * NX + x0] * (1 - a) + src[y1 * NX + x1] * a;
    // Collapse the half-cell polar cap continuously to its row mean.
    dst[k] = yy < 0 ? south + (lo - south) * (yy + 0.5) * 2
      : yy > NY - 1 ? north + (lo - north) * (NY - 0.5 - yy) * 2
      : lo + (hi - lo) * (yy - y0);
  }
}

export function createClimateGridSample(): ClimateGridSample { return { precipMul: 1, oceanness01: 0 }; }
/** Nonzero finite direction; normalization is unnecessary. No allocation. */
export function sampleClimateGrid(g: ClimateGrid, d: readonly number[], out: ClimateGridSample): ClimateGridSample {
  const x = d[0], y = d[1], z = d[2], ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
  let face: number, u: number, v: number;
  if (ax >= ay && ax >= az) { face = x >= 0 ? 0 : 1; u = y / ax; v = z / ax; }
  else if (ay >= az) { face = y >= 0 ? 2 : 3; u = x / ay; v = z / ay; }
  else { face = z >= 0 ? 4 : 5; u = x / az; v = y / az; }
  const xx = (u + 1) * 16, yy = (v + 1) * 16;
  const i = Math.min(31, Math.floor(xx)), j = Math.min(31, Math.floor(yy)), a = xx - i, b = yy - j;
  const k = face * FACE + j * SIDE + i, p = g.precipMul, o = g.oceanness;
  const pl = p[k] + (p[k + 1] - p[k]) * a, ph = p[k + SIDE] + (p[k + SIDE + 1] - p[k + SIDE]) * a;
  const ol = o[k] + (o[k + 1] - o[k]) * a, oh = o[k + SIDE] + (o[k + SIDE + 1] - o[k + SIDE]) * a;
  out.precipMul = pl + (ph - pl) * b;
  out.oceanness01 = ol + (oh - ol) * b;
  return out;
}
