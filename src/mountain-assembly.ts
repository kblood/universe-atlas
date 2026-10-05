// Mountains assembly (MTN-6, step A of 2026-10-05; docs/mountains-assembly-2026-10-05.md): the relief floor's
// ridge term inside the M1 orogen belts, composed from the M2 massif envelope and the M3 ridge-valley carving.
// terrain.ts calls mountainRidgeTermM only where the M1 belt is non-zero; everywhere else it keeps main's
// literal ridge expression, so the field outside belts is bit-identical (docs/mountains-design section 1.3).
//
// Owner decision (g) of 2026-10-05: M3 gets a FIXED carving half-width (CARVING_HALF_WIDTH_M), tiled across
// the massif in strips of that width, instead of the belt's own half-width (M3's lattice spacing is 2w/480,
// so with the belt width its relief and summit density scaled with the belt: 917 m spacing and 0.05 summits
// per 1000 km2 on Selawyn's 220 km belt). The carving half-width equals M2's massif cap (massif-envelope-2,
// decision (e)), so a massif is exactly one strip; the strip rule is kept explicit (and unit-tested) so a
// wider massif would tile rather than stretch the carving.
//
// Arithmetic only (+ - * /, Math.floor/min/max/abs/imul): every value feeds a height and the ocean flag.
import {massifEnvelopeM, composeRidgeTermM, MASSIF_ENVELOPE} from './mountain-envelope.ts';
import {ridgeValleyCarvingM} from './mountain-carving.ts';

// mountain-assembly-2 (mountains cost plan T3): mountainRidgeTermM takes `carve`; with carve = false (tile
// levels coarser than lod-ladder.ts carvingFromLevel) it returns the uncarved composition. The truth (carve =
// true, the default) is unchanged. Was mountain-assembly-1.
export const MOUNTAIN_ASSEMBLY_VERSION = 'mountain-assembly-2';
export const MOUNTAIN_ASSEMBLY = Object.freeze({
  // Fixed M3 carving half-width (m): one strip spans 2x this across the belt axis.
  CARVING_HALF_WIDTH_M: 48000,
});

// The orogen sample fields the composition reads (mountain-layout.ts OrogenSample).
export interface BeltSample { belt: number; axisDistanceM: number; halfWidthM: number; beltIndex: number; alongM?: number }

// The layout entry the call site uses (mountain-layout.ts buildOrogenLayout().sampleWithinWithA0).
export interface OrogenBandLayout<S extends BeltSample> {
  sampleWithinWithA0(d: readonly [number, number, number], alt: number, maxDistM: number, out?: S, minHalfWidthM?: number): S;
}
// The M1 sample for mountainRidgeTermM (cost plan T1): the layout sample restricted to the massif band,
// |axisDistanceM| < MAX_HALF_WIDTH_M on belts of half-width >= MIN_HALF_WIDTH_M, else belt 0. Outside that
// band mountainRidgeTermM returns main's term unchanged (massifEnvelopeM = 0 and massifBlendWeight = 0, so
// composeRidgeTermM returns mainTermM), so this changes no value; it lets the layout's rejection grid skip
// the foot-point solve everywhere outside massifs (tests/mountain-layout-grid.test.mjs).
export function massifBeltSample<S extends BeltSample>(
  layout: OrogenBandLayout<S>, d: readonly [number, number, number], a0: number, out: S,
): S {
  return layout.sampleWithinWithA0(d, a0, MASSIF_ENVELOPE.MAX_HALF_WIDTH_M, out, MASSIF_ENVELOPE.MIN_HALF_WIDTH_M);
}

// Carving strip k of an across-axis coordinate and the coordinate inside it: strips of width
// 2 CARVING_HALF_WIDTH_M centred on the axis (k = 0) and on +-2w, +-4w, ...; local in [-w, w).
export function carvingStrip(acrossM: number): {strip: number; localM: number} {
  const w = MOUNTAIN_ASSEMBLY.CARVING_HALF_WIDTH_M, strip = Math.floor((acrossM + w) / (2 * w));
  return {strip, localM: acrossM - strip * 2 * w};
}

// The 32-bit M3 seed of strip `strip` of belt `beltSeed` (an integer hash, strip 0 = the belt seed).
export function carvingSeed(beltSeed: number, strip: number): number {
  if (strip === 0) return beltSeed >>> 0;
  let h = Math.imul(beltSeed ^ Math.imul(strip, 0x9e3779b1), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

// The ridge term inside an M1 belt (pre-radius-scale metres): (1 - w) x main + U + C, where U is the M2
// massif envelope (massif-envelope-2), w its composition weight and C the M3 carving of U on the fixed-width
// strip that contains the sample. U + C = U x retained >= 0, so the term is >= 0 and the sea-level-0
// coastline guarantee of the relief floor (F >= 0 where a0 >= 0) still holds. Outside the massif (and on a
// width-gated belt) it returns `mainTermM` itself.
//
// `carve = false` is the declared coarse-level reduction (lod-ladder-2, T3): the term without C, i.e. (1 - w) x
// main + U. C <= 0, so it is >= the carved term (an upper envelope), and no M3 block is ever solved for it.
export function mountainRidgeTermM(
  mainTermM: number, o: BeltSample, a0: number, landFactor: number, tau: number, beltSeeds: ArrayLike<number>,
  carve = true,
): number {
  const U = massifEnvelopeM(o.belt, o.axisDistanceM, o.halfWidthM, a0, landFactor, tau, 'water');
  const composed = composeRidgeTermM(mainTermM, o.belt, o.axisDistanceM, o.halfWidthM, U);
  if (!carve || !(U > 0)) return composed;
  const {strip, localM} = carvingStrip(o.axisDistanceM);
  return composed + ridgeValleyCarvingM(o.alongM ?? 0, localM, MOUNTAIN_ASSEMBLY.CARVING_HALF_WIDTH_M, U, o.belt,
    carvingSeed(beltSeeds[o.beltIndex], strip));
}

// The massif cap and the carving width agree (decision (e) and (g)): a massif is one carving strip.
export const MASSIF_IS_ONE_STRIP = MASSIF_ENVELOPE.MAX_HALF_WIDTH_M <= MOUNTAIN_ASSEMBLY.CARVING_HALF_WIDTH_M;
