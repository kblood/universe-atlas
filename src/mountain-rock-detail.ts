// M5, staged: continuous rock relief on the carved surface, in pre-radius-scale metres.
// No runtime connection to terrain. Removing this non-positive term is an upper envelope.
export const MOUNTAIN_ROCK_DETAIL_VERSION = 'mountain-rock-detail-1';
export const MOUNTAIN_ROCK_DETAIL = Object.freeze({
  SLOPE_ZERO_TAN: 0.17632698070846498,
  SLOPE_FULL_TAN: 0.5773502691896257,
  SLOPE_STEP_M: 125,
  MAX_DEPTH_M: 55,
  CAP_FRACTION: 0.5,
  GULLY_CELL_M: 250,
  GULLY_HALF_LENGTH_M: 200,
  GULLY_HALF_WIDTH_M: 65,
  GULLY_JITTER: 0.15,
  KAPPA: 0.6,
  PROFILE_MAX_SLOPE: 1.539600717839002,
  STRATA_PERIOD_M: 280,
  BENCH_RISE: 0.5,
  BENCH_FALL: 0.08,
  STRATA_WEIGHT: 0.985,
  RIB_WEIGHT: 0.015,
  JITTER_M: 30,
  SEED_SALT: 0x68bc21eb,
});
export const ROCK_DETAIL_BANDS = Object.freeze([
  Object.freeze({octave: 0, wavelengthM: 1000}),
  Object.freeze({octave: 1, wavelengthM: 500}),
  Object.freeze({octave: 2, wavelengthM: 250}),
  Object.freeze({octave: 3, wavelengthM: 125}),
]);
export const ROCK_DETAIL_REDUCTION = Object.freeze({longestWavelengthM: 1000, latticeSegments: 32});
export const ROCK_DETAIL_MAX_EDGE_M = ROCK_DETAIL_REDUCTION.longestWavelengthM / 2
  * ROCK_DETAIL_REDUCTION.latticeSegments / 2;
const C = MOUNTAIN_ROCK_DETAIL;

export function rockSlopeWeight(slopeTan: number): number {
  if (!(slopeTan > C.SLOPE_ZERO_TAN)) return 0;
  if (slopeTan >= C.SLOPE_FULL_TAN) return 1;
  const t = (slopeTan - C.SLOPE_ZERO_TAN) / (C.SLOPE_FULL_TAN - C.SLOPE_ZERO_TAN);
  return t * t * (3 - 2 * t);
}
export function carvedSlopeTan(hC: number, hX: number, hY: number): number {
  const x = (hX - hC) / C.SLOPE_STEP_M, y = (hY - hC) / C.SLOPE_STEP_M;
  return Math.sqrt(x * x + y * y);
}
export function rockDetailSeed(carvingSeed: number): number {
  let h = Math.imul(carvingSeed ^ C.SEED_SALT, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}
function hash(x: number, y: number, octave: number, seed: number): number {
  let h = Math.imul(x, 0x9e3779b1) ^ Math.imul(y, 0x85ebca77)
    ^ Math.imul(octave, 0xc2b2ae3d) ^ seed;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  return (h ^ (h >>> 16)) >>> 0;
}
// Compact C1 kernels. The circumscribed support radius must be <= (1.5 - GULLY_JITTER) cells:
// an omitted centre is at least that far away, including at lattice boundaries.
// Here sqrt(200*200+65*65) = 210.297408 <= 337.5.
// This makes the 3 x 3 search identical to the infinite-lattice maximum.
function gullies(alongM: number, acrossM: number, ex: number, ey: number, seed: number): number {
  const cell = C.GULLY_CELL_M, ix = Math.floor(alongM / cell), iy = Math.floor(acrossM / cell);
  let gully = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const h = hash(ix + i, iy + j, 0, seed);
    const dx = alongM - (ix + i + 0.5 - C.GULLY_JITTER + 2 * C.GULLY_JITTER * (h & 1023) / 1023) * cell;
    const dy = acrossM - (iy + j + 0.5 - C.GULLY_JITTER + 2 * C.GULLY_JITTER * ((h >>> 10) & 1023) / 1023) * cell;
    const du = (dx * ex + dy * ey) / C.GULLY_HALF_LENGTH_M;
    const dw = (-dx * ey + dy * ex) / C.GULLY_HALF_WIDTH_M;
    if (Math.abs(du) >= 1 || Math.abs(dw) >= 1) continue;
    const u = 1 - du * du, v = 1 - dw * dw;
    gully = Math.max(gully, u * u * v * v);
  }
  return gully;
}
export function rockDetailM(alongM: number, acrossM: number, carvedM: number,
  carvedXM: number, carvedYM: number, seed: number): number {
  if (!(carvedM > 0) || carvedM - carvedM !== 0
    || carvedXM - carvedXM !== 0 || carvedYM - carvedYM !== 0
    || alongM - alongM !== 0 || acrossM - acrossM !== 0) return 0;
  const gx = (carvedXM - carvedM) / C.SLOPE_STEP_M, gy = (carvedYM - carvedM) / C.SLOPE_STEP_M;
  const slopeTan = Math.sqrt(gx * gx + gy * gy);
  const weight = rockSlopeWeight(slopeTan);
  if (weight === 0 || slopeTan - slopeTan !== 0) return 0;
  const ex = -gx / slopeTan, ey = -gy / slopeTan;
  const depth = Math.min(C.MAX_DEPTH_M, C.CAP_FRACTION * carvedM, C.KAPPA * slopeTan * C.GULLY_HALF_LENGTH_M);
  const gully = gullies(alongM, acrossM, ex, ey, seed);
  // Seed-only phase jitter is spatially constant: grad J = 0, including across cells.
  const jitter = C.JITTER_M * (seed >>> 0) / 4294967295;
  const phase = (carvedM + jitter) / C.STRATA_PERIOD_M, t = phase - Math.floor(phase);
  const strata = bench(t);
  // Continuous linear tread and fast linear riser; zero over the remaining phase.
  // For constant weight/depth: climb/slope <= depth*STRATA_WEIGHT/(P*rise)
  // + KAPPA*B*RIB_WEIGHT. J is seed-constant and has zero spatial derivative.
  // Frozen budget: .985*55/(280*.5) + .6*1.539600717839002*.015
  // = .386964285714286 + .013856406460551 = .400820692174837 < .6.
  // A height cap adds <= .5: even .900820692174837 < 1.
  // The bench mean is (.5+.08)/2 = .29, with zero phase on .42 of each cycle.
  // A height cap adds CAP_FRACTION*shape. On general surfaces the forward
  // gradient, orientation, weight and slope-depth vary: see HARD 7's bound.
  const shape = Math.max(0, Math.min(1, C.STRATA_WEIGHT * strata + C.RIB_WEIGHT * gully));
  const result = -weight * depth * shape;
  return result === 0 ? 0 : result;
}

function bench(t: number): number {
  if (t < C.BENCH_RISE) return t / C.BENCH_RISE;
  if (t < C.BENCH_RISE + C.BENCH_FALL) return 1 - (t - C.BENCH_RISE) / C.BENCH_FALL;
  return 0;
}
