// M2: pre-radius-scale metres; finite inputs, belt/landFactor in [0,1], tau >= 0.
export const MASSIF_ENVELOPE_VERSION = 'massif-envelope-1';
export const MASSIF_ENVELOPE = Object.freeze({
  GAIN: 1,
  MIN_HALF_WIDTH_M: 32000,
  RIDGE_EQUIVALENT_WATER_M: 3640,
  RIDGE_EQUIVALENT_DRY_M: 1800,
  BLEND_BELT_FULL: 0.5,
  MIN_FEATURE_WAVELENGTH_M: 32000,
});
type EnvelopeClass = 'water' | 'dry';

export function envelopeBlendWeight(belt: number): number {
  const t = Math.max(0, Math.min(1, belt / MASSIF_ENVELOPE.BLEND_BELT_FULL));
  return t * t * (3 - 2 * t);
}

export function maxEnvelopeM(tau: number, cls: EnvelopeClass): number {
  return cls === 'water'
    ? MASSIF_ENVELOPE.GAIN * tau * MASSIF_ENVELOPE.RIDGE_EQUIVALENT_WATER_M
    : MASSIF_ENVELOPE.GAIN * MASSIF_ENVELOPE.RIDGE_EQUIVALENT_DRY_M;
}

export function massifEnvelopeM(
  belt: number, axisDistanceM: number, halfWidthM: number, a0: number,
  landFactor: number, tau: number, cls: EnvelopeClass,
): number {
  if (a0 <= 0 || belt === 0 || halfWidthM < MASSIF_ENVELOPE.MIN_HALF_WIDTH_M) return 0;
  const s = Math.abs(axisDistanceM) / halfWidthM;
  if (s >= 1) return 0;
  const p = 1 - s * s;
  return maxEnvelopeM(tau, cls) * (p * p * p) * landFactor * envelopeBlendWeight(belt);
}

// Proposed MTN-6 assembly only; the exact-zero branch preserves even signed zero.
// A belt below the width gate carries no envelope, so it is treated as outside
// belts too: main's term is returned unchanged (the old ridges are not faded out
// with nothing to replace them).
export function composeRidgeTermM(mainTermM: number, belt: number, halfWidthM: number, envelopeM: number): number {
  return belt === 0 || halfWidthM < MASSIF_ENVELOPE.MIN_HALF_WIDTH_M
    ? mainTermM
    : (1 - envelopeBlendWeight(belt)) * mainTermM + envelopeM;
}
