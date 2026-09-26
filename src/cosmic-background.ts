/** A homogeneous, flat radiation + matter + constant-dark-energy background.
 * The scale-factor history is tabulated in log(a) once and inverted by direct
 * lookup. It is an expansion model, not an inflation or structure-formation
 * simulation. The 13.787 Gyr catalogue instant is normalized to a=1.
 *
 * Planck 2018 base-LCDM: H0=67.4 km/s/Mpc, Omega_m about 0.315. The small
 * Omega_r term (~9.17e-5, photons plus relativistic neutrinos today) matters
 * for the early universe. Temperature T0/a is only a useful photon-background
 * approximation after early entropy-transfer transitions. */
import { CATALOGUE_EPOCH_NS, NS, type Ns } from './world-time.ts';

export const BACKGROUND_VERSION = 'atlas-background-radiation-1';
export const RECOMBINATION_NS = 380_000n * 31_557_600n * NS;
export const FIRST_STARS_NS = 100_000_000n * 31_557_600n * NS;
const H0_S = 67.4 / 3.0856775814913673e19;
const OMEGA_R = 9.17e-5;
const OMEGA_L = 0.685;
const OMEGA_M = 1 - OMEGA_L - OMEGA_R;
const T0_K = 2.7255;
const MIN_LNA = -42;
const TABLE_STEPS = 2048;
const STEP = -MIN_LNA / TABLE_STEPS;
const C_MPC_S = 299792.458 / 3.0856775814913673e19;

function e2AtLnA(lnA: number): number {
  return OMEGA_R * Math.exp(-4 * lnA) + OMEGA_M * Math.exp(-3 * lnA) + OMEGA_L;
}
const timeDerivative = (lnA: number) => 1 / (H0_S * Math.sqrt(e2AtLnA(lnA)));
const horizonDerivative = (lnA: number) => C_MPC_S / (Math.exp(lnA) * H0_S * Math.sqrt(e2AtLnA(lnA)));

const rawSeconds: number[] = new Array(TABLE_STEPS + 1);
const comovingMpc: number[] = new Array(TABLE_STEPS + 1);
rawSeconds[0] = Math.exp(2 * MIN_LNA) / (2 * H0_S * Math.sqrt(OMEGA_R));
comovingMpc[0] = C_MPC_S * Math.exp(MIN_LNA) / (H0_S * Math.sqrt(OMEGA_R));
for (let i = 1; i <= TABLE_STEPS; i++) {
  const lo = MIN_LNA + (i - 1) * STEP;
  const hi = MIN_LNA + i * STEP;
  const mid = (lo + hi) / 2;
  rawSeconds[i] = rawSeconds[i - 1] + STEP *
    (timeDerivative(lo) + 4 * timeDerivative(mid) + timeDerivative(hi)) / 6;
  comovingMpc[i] = comovingMpc[i - 1] + STEP *
    (horizonDerivative(lo) + 4 * horizonDerivative(mid) + horizonDerivative(hi)) / 6;
}
const AGE_SECONDS = Number(CATALOGUE_EPOCH_NS) / Number(NS);
const TIME_NORMALIZATION = AGE_SECONDS / rawSeconds[TABLE_STEPS];
const H0_EFFECTIVE_S = H0_S / TIME_NORMALIZATION;
const FUTURE_X0 = Math.asinh(Math.sqrt(OMEGA_L / OMEGA_M));
const FUTURE_X_RATE = 1.5 * H0_EFFECTIVE_S * Math.sqrt(OMEGA_L);
const LN_SINH_X0 = Math.log(Math.sinh(FUTURE_X0));

function lnSinh(x: number): number {
  return x < 600 ? Math.log(Math.sinh(x)) : x - Math.LN2 + Math.log1p(-Math.exp(-2 * x));
}

function earlyIndex(seconds: number): number {
  let lo = 0, hi = TABLE_STEPS;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (rawSeconds[mid] * TIME_NORMALIZATION <= seconds) lo = mid;
    else hi = mid;
  }
  return lo;
}

function earlyLnA(seconds: number): number {
  if (seconds <= 0) return -Infinity;
  const first = rawSeconds[0] * TIME_NORMALIZATION;
  if (seconds <= first) return MIN_LNA + 0.5 * Math.log(seconds / first);
  const i = earlyIndex(seconds);
  const a = rawSeconds[i] * TIME_NORMALIZATION;
  const b = rawSeconds[i + 1] * TIME_NORMALIZATION;
  const fraction = Math.max(0, Math.min(1, (Math.log(seconds) - Math.log(a)) / (Math.log(b) - Math.log(a))));
  return MIN_LNA + (i + fraction) * STEP;
}

export function backgroundLnScaleFactorAt(t: Ns): number {
  if (t <= 0n) return -Infinity;
  if (t < CATALOGUE_EPOCH_NS) return earlyLnA(Number(t) / Number(NS));
  const deltaSeconds = Number(t - CATALOGUE_EPOCH_NS) / Number(NS);
  const x = FUTURE_X0 + FUTURE_X_RATE * deltaSeconds;
  return (2 / 3) * (lnSinh(x) - LN_SINH_X0);
}

/** Local late-time difference avoids subtracting two enormous rounded logs. */
export function backgroundLnScaleRatio(t1:Ns,t2:Ns):number {
  if(t1===t2)return 0;
  if(t1>=CATALOGUE_EPOCH_NS&&t2>=CATALOGUE_EPOCH_NS){
    const x1=FUTURE_X0+FUTURE_X_RATE*Number(t1-CATALOGUE_EPOCH_NS)/Number(NS);
    const x2=FUTURE_X0+FUTURE_X_RATE*Number(t2-CATALOGUE_EPOCH_NS)/Number(NS);
    const correction=x1<600||x2<600
      ? lnSinh(x1)-lnSinh(x2)-(x1-x2)
      : Math.log1p(-Math.exp(-2*x1))-Math.log1p(-Math.exp(-2*x2));
    return (2/3)*(FUTURE_X_RATE*Number(t1-t2)/Number(NS)+correction);
  }
  return backgroundLnScaleFactorAt(t1)-backgroundLnScaleFactorAt(t2);
}

function hubblePerSecondAtLnA(lnA: number): number {
  if (lnA >= 0) {
    const matter = OMEGA_M * Math.exp(-3 * lnA);
    return H0_EFFECTIVE_S * Math.sqrt(matter + OMEGA_L);
  }
  return H0_EFFECTIVE_S * Math.sqrt(e2AtLnA(lnA));
}

export type CosmicBackground = {
  lnScaleFactor: number;
  hubblePerSecond: number;
  photonTemperatureK: number | null;
  comovingParticleHorizonMpc: number;
  opacity: 'unknown' | 'opaque' | 'transparent';
  fidelity: 'explanatory' | 'approximation';
};

export function cosmicBackgroundAt(t: Ns): CosmicBackground {
  if (t <= 0n) return {lnScaleFactor:-Infinity,hubblePerSecond:Infinity,
    photonTemperatureK:null,comovingParticleHorizonMpc:0,opacity:'unknown',fidelity:'explanatory'};
  const lnScaleFactor = backgroundLnScaleFactorAt(t);
  const hubblePerSecond = hubblePerSecondAtLnA(lnScaleFactor);
  const seconds = Number(t) / Number(NS);
  let horizon: number;
  if (t <= CATALOGUE_EPOCH_NS) {
    const i = earlyIndex(seconds);
    const loTime = rawSeconds[i] * TIME_NORMALIZATION;
    const hiTime = rawSeconds[i + 1] * TIME_NORMALIZATION;
    const fraction = Math.max(0, Math.min(1, (seconds - loTime) / (hiTime - loTime)));
    horizon = (comovingMpc[i] + (comovingMpc[i + 1] - comovingMpc[i]) * fraction) * TIME_NORMALIZATION;
  } else {
    // The particle horizon grows toward a finite comoving limit in this
    // constant-dark-energy scenario. This is an approximation for the
    // simultaneous-date map; a full observed sky needs light-cone queries.
    const now = comovingMpc[TABLE_STEPS] * TIME_NORMALIZATION;
    const tail = C_MPC_S / (H0_EFFECTIVE_S * Math.sqrt(OMEGA_L));
    horizon = now + tail * (1 - Math.exp(-lnScaleFactor));
  }
  return {
    lnScaleFactor,hubblePerSecond,
    photonTemperatureK:seconds >= 1 ? T0_K * Math.exp(-lnScaleFactor) : null,
    comovingParticleHorizonMpc:horizon,
    opacity:t<RECOMBINATION_NS?'opaque':'transparent',
    fidelity:seconds>=1?'approximation':'explanatory',
  };
}
