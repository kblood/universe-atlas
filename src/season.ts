/**
 * Closed-form season basis (W0-SEASON, biome-climate increment 1).
 *
 * PRESENTATION ONLY. Nothing here may feed presence, species/kind choice or
 * any other discrete decision: flora and fauna presence read ANNUAL
 * statistics only (plan.faunaInterface rule 5). No src module imports this
 * file in this increment; it is the foundation for the next 4D increment.
 *
 * Model
 * -----
 * 1. Year. `yearNs` is the exact BigInt period `phaseAt` (world-time.ts) uses
 *    for the orbit that carries the body round the star: the body's own
 *    orbit for a planet, the parent planet's orbit for a moon. It is computed
 *    with the same expression orbitPosition uses, so
 *    bodyPosition(planet, t + yearNs) is bit-identical to bodyPosition(planet, t).
 *
 * 2. Sun geometry. At SEASON_SAMPLES (256) dates t_k = k*yearNs/256 the raw
 *    star direction is taken from the carrier's orbit: for a planet of a
 *    single star this is exactly main.ts's `bodyPosition(sys.stars[0]) -
 *    bodyPosition(body)` pair (normalised like THREE; stars[0] sits at the
 *    origin), and the test pins the basis samples bit-for-bit against
 *    seasonAt. Two deliberate refinements keep the basis exactly
 *    year-periodic and free of aliasing: in a binary the sun point is the
 *    barycentre (the origin the planet orbits) instead of stars[0], whose
 *    0.065 AU orbit is not year-periodic and aliased against the sampling
 *    (measured: a 2.63 AU planet whose year is ~257 binary periods showed a
 *    0.036 (~3%) north/south polar annual-mean asymmetry with stars[0]); and for a moon the
 *    position is the parent planet's (the month is not a season). seasonAt
 *    still evaluates the exact main.ts pair at t, so its subsolar latitude
 *    is the rendered sun's. The subsolar latitude delta_k comes
 *    from sun-frame.ts's `subsolarSinLat` with the body's DRAWN axial tilt
 *    (stellar-evolution.ts spinStateFor, 0..pi, retrograde included). No
 *    obliquity formula is assumed: the declination series is measured from
 *    the real orbit geometry, so the orbit inclination (|i| <= 0.06 rad) and
 *    eccentricity enter exactly. Climate depends on the obliquity folded to
 *    0..90 deg (`obliquityRad = min(t, pi - t)`); tilt t and pi - t give the
 *    same declination amplitude and hence the same annual statistics.
 *    `effectiveObliquityRad` is the folded angle between the spin axis and
 *    the carrier's orbit normal (it differs from the catalogue fold by at
 *    most the inclination).
 *
 * 3. Daily-mean insolation (Berger 1978, "Long-term variations of daily
 *    insolation and Quaternary climatic changes", J. Atmos. Sci. 35:2362,
 *    eq. for W_d; also Liou 2002 eq. 2.2.21 / Hartmann "Global Physical
 *    Climatology" eq. 2.15):
 *        Q(phi, delta) = (S0/pi) * (a/r)^2 * (h0*sin(phi)*sin(delta) + cos(phi)*cos(delta)*sin(h0))
 *        cos(h0) = -tan(phi)*tan(delta), clamped to [-1, 1]
 *    (h0 = pi: polar day, h0 = 0: polar night). Here S0 = 1, so the global
 *    mean of Q at any instant is exactly (a/r)^2/4 (intercepted pi R^2 over
 *    4 pi R^2). All per-band values are normalised by the ANNUAL global mean
 *    Qg = mean_k (a/r_k)^2 / 4, so qMean[equator] ~ 1.22 and qMean[pole] ~ 0.51
 *    for an Earth-like 23.44 deg tilt. Annual means: pole = sin(eps)/pi,
 *    equator = (2/pi^2) E(sin eps) (E = complete elliptic integral, 2nd kind),
 *    which cross at eps ~ 54 deg: above that the poles receive MORE annual
 *    insolation than the equator. tests/season.test.mjs checks these closed
 *    forms and an independent 8192-step Berger integral.
 *
 * 4. Temperature anomaly. Per band the insolation series is expanded in the
 *    complex Fourier harmonics F_m = (1/N) sum_k Q_k e^{-i m theta_k}, m = 1, 2,
 *    theta_k = 2 pi t_k / yearNs. The periodic solution of the one-box
 *    energy balance C dT/dt = F - B T for each harmonic is
 *        T_m = kappa * (anchorT/4) * (F_m / Qg) / (1 + i m omega tau)
 *    (anchorT/4 * dQ/Q is the radiative-equilibrium response T ~ Q^(1/4);
 *    kappa = 0.6 damps it for transport; tau = 20 d + 100 d * water is the
 *    heuristic-v1 thermal inertia; omega = 2 pi / year). The anomaly at
 *    phase theta is sum_m 2 Re(T_m e^{i m theta}). A window W multiplies
 *    harmonic m by sinc^2(m omega W / 2): the transfer function of two
 *    cascaded W-wide box averages (a triangular kernel of base 2W). W = 0 is
 *    exact (the filter is skipped, same bytes) and W >= 50 years leaves
 *    < 1e-3 of the paused amplitude for ANY W (a single box, sinc, only
 *    decays as 1/x and would leave ~6e-3 at W = 50.5 years).
 *
 * 5. Seasonal half-ranges. `qHalfRange` (insolation, (max - min)/2 over the
 *    256 samples, normalised by Qg) and `tempHalfRangeK` (of the 2-harmonic
 *    anomaly) are exposed per band so a later classifier can tell permanent
 *    from seasonal snow; at high obliquity the polar half-range becomes
 *    extreme (pole: (sin eps)/2 / Qg on a circular orbit).
 *
 * Determinism: the basis is cached per body.seed (plus any tilt override) and
 * a cold and warm basis are bit-identical. The insolation math uses det-math
 * (`sine`, `detCos`, `detAcos`, `detAtan2`) and + - * / sqrt only. The orbit
 * positions themselves come from catalog.ts's platform-trig orbitPosition,
 * which contract §1.2 rule 3 classifies as continuous / tolerant; that is
 * acceptable because nothing here is discrete.
 */
import { bodyPosition, type Body, type StarSystem } from './catalog.ts';
import { detAcos, detAtan2, detCos, sine } from './det-math.ts';
import { spinStateFor } from './stellar-evolution.ts';
import { normalizeLikeThree, subsolarSinLat } from './sun-frame.ts';

export const SEASON_VERSION = 'atlas-season-1';

/** Number of latitude bands: -90..90 deg in 10-degree steps. */
export const SEASON_BANDS = 19;
/** Dates sampled per year for the basis. The plan sketched 64; measured on
 * the catalogue, 64 uniform-in-time samples leave up to ~0.8% error in the
 * polar annual mean at high obliquity and eccentricity (Q has a kink at the
 * equinox, where polar day starts, so the trapezoid rule is only O(h^2)
 * there). 256 samples bring that under ~5e-4 and still cost < 1 ms/body. */
export const SEASON_SAMPLES = 256;
export const SEASON_CALIBRATION = Object.freeze({
  /** Transport damping of the radiative-equilibrium response. */
  KAPPA: 0.6,
  /** Thermal inertia tau = TAU_BASE_DAYS + TAU_WATER_DAYS * water (heuristic-v1). */
  TAU_BASE_DAYS: 20,
  TAU_WATER_DAYS: 100,
  /** spinPeriodS / yearS above this marks a slow rotator (day-night is then
   * itself seasonal and the daily-mean insolation formula is only indicative). */
  SLOW_ROTATOR_RATIO: 0.1,
});

const PI = Math.PI;
const TWO_PI = 2 * Math.PI;
const DEG = Math.PI / 180;

export type SeasonBasis = {
  readonly version: typeof SEASON_VERSION;
  readonly bodyId: string;
  readonly bodySeed: string;
  /** The body whose orbit round the star defines the year (self or parent planet). */
  readonly carrierId: string;
  readonly yearNs: bigint;
  readonly yearS: number;
  readonly semiMajorAxisM: number;
  /** Drawn axial tilt, 0..pi (retrograde included), or the test override. */
  readonly axialTiltRad: number;
  /** Catalogue tilt folded to 0..pi/2: min(t, pi - t). */
  readonly obliquityRad: number;
  /** Folded angle between the spin axis and the carrier's orbit normal. */
  readonly effectiveObliquityRad: number;
  /** max_k |subsolar latitude| over the basis dates. */
  readonly maxSubsolarLatRad: number;
  readonly spinPeriodS: number;
  readonly slowRotator: boolean;
  readonly anchorTempK: number;
  readonly tauS: number;
  /** Annual global-mean insolation, units of the star's flux at distance a. */
  readonly qGlobalMean: number;
  /** Band centre latitudes, radians, -pi/2..pi/2. */
  readonly latitudesRad: Float64Array;
  /** Annual-mean daily insolation per band / qGlobalMean. */
  readonly qMean: Float64Array;
  /** (max - min)/2 of daily insolation over the year per band / qGlobalMean. */
  readonly qHalfRange: Float64Array;
  /** Insolation harmonics F_m / qGlobalMean (real, imaginary), m = 1, 2. */
  readonly f1Re: Float64Array; readonly f1Im: Float64Array;
  readonly f2Re: Float64Array; readonly f2Im: Float64Array;
  /** Temperature harmonics T_m in kelvin (real, imaginary), m = 1, 2. */
  readonly t1Re: Float64Array; readonly t1Im: Float64Array;
  readonly t2Re: Float64Array; readonly t2Im: Float64Array;
  /** (max - min)/2 of the unwindowed temperature anomaly per band, kelvin. */
  readonly tempHalfRangeK: Float64Array;
  /** The basis samples themselves: sin(subsolar latitude) and (a/r)^2 at t_k = k*yearNs/N. */
  readonly subsolarSinLatSamples: Float64Array;
  readonly distanceFactorSamples: Float64Array;
  /** @internal evaluation context (not part of the data identity). */
  readonly body: Body;
  readonly sys: StarSystem;
};

export type SeasonSample = {
  yearNs: bigint;
  phase01: number;
  /** Exact at t from the main.ts bodyPosition pair (renderer parity). */
  subsolarSinLat: number;
  /** (a/r)^2 at t from the same pair. */
  distanceFactor: number;
  /** Per-band temperature anomaly about the annual mean, kelvin (19 bands). */
  tempAnomalyK: Float64Array;
  slowRotator: boolean;
};

/**
 * Daily-mean insolation (Berger 1978) in units of the flux at the reference
 * distance, for a latitude given by its sine/cosine and a subsolar latitude
 * (declination) given by its sine/cosine, times the distance factor (a/r)^2.
 */
export function dailyMeanInsolation(sinLat: number, cosLat: number, sinDec: number, cosDec: number, distanceFactor = 1): number {
  if (cosLat < 1e-12 || cosDec < 1e-12) {
    // Pole, or sun over the pole: the sun's elevation is constant through the
    // day, so Q = max(0, sin(phi) sin(delta)).
    const v = sinLat * sinDec;
    return v > 0 ? distanceFactor * v : 0;
  }
  let c = -(sinLat * sinDec) / (cosLat * cosDec);
  if (c > 1) c = 1; else if (c < -1) c = -1;
  const h0 = detAcos(c);
  return distanceFactor * (h0 * sinLat * sinDec + cosLat * cosDec * Math.sqrt(1 - c * c)) / PI;
}

/** The exact BigInt orbital period `phaseAt` derives for an orbit. */
export function orbitPeriodNs(orbit: NonNullable<Body['orbit']>): bigint {
  // Must be the SAME expression orbitPosition (catalog.ts) passes to phaseAt,
  // `Math.sqrt(o.mu / o.a ** 3)`, so the BigInt period is bit-identical and
  // positions repeat exactly after yearNs. `**` here is continuous orbital
  // evaluation (contract §1.2 rule 3), copied for parity, never hashed.
  const omega = Math.sqrt(orbit.mu / orbit.a ** 3);
  return BigInt(Math.max(1, Math.round(2 * Math.PI / omega * 1e9)));
}

function carrierOf(body: Body, sys: StarSystem): Body {
  if (body.kind === 'star') throw new Error(`seasonBasis: ${body.id} is a star`);
  if (body.kind === 'planet') return body;
  const parent = sys.planets.find((p) => p.id === body.parentId);
  if (!parent) throw new Error(`seasonBasis: parent planet of ${body.id} not found`);
  return parent;
}

/** Unit raw sun vector + distance factor at t, written into `out`; returns
 * (a/r)^2. Same pair and normalisation as main.ts:2679-2680. */
function rawSunAt(body: Body, sys: StarSystem, semiMajor: number, t: bigint, out: number[]): number {
  const s = bodyPosition(sys.stars[0], sys, t);
  const p = bodyPosition(body, sys, t);
  const x = s[0] - p[0], y = s[1] - p[1], z = s[2] - p[2];
  normalizeLikeThree(x, y, z, out);
  const r2 = x * x + y * y + z * z;
  return r2 > 0 ? (semiMajor * semiMajor) / r2 : 1;
}

const ORIGIN = [0, 0, 0];
/** Year-periodic seasonal sun (see header item 2): carrier position against
 * stars[0] (single star; at the origin) or the barycentre (binary). */
function seasonalSunAt(carrier: Body, sys: StarSystem, semiMajor: number, t: bigint, out: number[]): number {
  const s = sys.stars.length > 1 ? ORIGIN : bodyPosition(sys.stars[0], sys, t);
  const p = bodyPosition(carrier, sys, t);
  const x = s[0] - p[0], y = s[1] - p[1], z = s[2] - p[2];
  normalizeLikeThree(x, y, z, out);
  const r2 = x * x + y * y + z * z;
  return r2 > 0 ? (semiMajor * semiMajor) / r2 : 1;
}
function bandTrig(b: number): { s: number; c: number } {
  if (b === 0) return { s: -1, c: 0 };
  if (b === SEASON_BANDS - 1) return { s: 1, c: 0 };
  if (b === (SEASON_BANDS - 1) / 2) return { s: 0, c: 1 };
  const s = sine((b * 10 - 90) * DEG);
  return { s, c: Math.sqrt(Math.max(0, 1 - s * s)) };
}

export type SeasonBasisOptions = {
  /** Test/report override of the drawn axial tilt (radians, 0..pi). */
  axialTiltRad?: number;
  /** Override of body.temperatureK as the radiative anchor. */
  anchorTempK?: number;
};

function buildBasis(body: Body, sys: StarSystem, opts?: SeasonBasisOptions): SeasonBasis {
  const carrier = carrierOf(body, sys);
  if (!carrier.orbit) throw new Error(`seasonBasis: ${carrier.id} has no orbit`);
  const spin = spinStateFor(body);
  const tilt = opts?.axialTiltRad ?? spin.axialTiltRad;
  const anchorTempK = opts?.anchorTempK ?? body.temperatureK;
  const yearNs = orbitPeriodNs(carrier.orbit);
  const yearS = Number(yearNs) / 1e9;
  const a = carrier.orbit.a;
  const N = SEASON_SAMPLES, NB = SEASON_BANDS;

  const sinDec = new Float64Array(N), cosDec = new Float64Array(N), rho = new Float64Array(N);
  const cosT1 = new Float64Array(N), sinT1 = new Float64Array(N), cosT2 = new Float64Array(N), sinT2 = new Float64Array(N);
  const sun = [0, 0, 0];
  let qg = 0, maxLat = 0;
  const nBig = BigInt(N);
  for (let k = 0; k < N; k++) {
    const tk = (BigInt(k) * yearNs) / nBig;
    rho[k] = seasonalSunAt(carrier, sys, a, tk, sun);
    let sd = subsolarSinLat(sun, tilt);
    if (sd > 1) sd = 1; else if (sd < -1) sd = -1;
    sinDec[k] = sd;
    cosDec[k] = Math.sqrt(Math.max(0, 1 - sd * sd));
    const lat = detAtan2(sd < 0 ? -sd : sd, cosDec[k]);
    if (lat > maxLat) maxLat = lat;
    qg += rho[k];
    const theta = TWO_PI * (Number(tk) / Number(yearNs));
    cosT1[k] = detCos(theta); sinT1[k] = sine(theta);
    cosT2[k] = detCos(2 * theta); sinT2[k] = sine(2 * theta);
  }
  qg = qg / N / 4;

  const latitudesRad = new Float64Array(NB), qMean = new Float64Array(NB), qHalfRange = new Float64Array(NB);
  const f1Re = new Float64Array(NB), f1Im = new Float64Array(NB), f2Re = new Float64Array(NB), f2Im = new Float64Array(NB);
  const t1Re = new Float64Array(NB), t1Im = new Float64Array(NB), t2Re = new Float64Array(NB), t2Im = new Float64Array(NB);
  const tempHalfRangeK = new Float64Array(NB);
  const tauS = 86400 * (SEASON_CALIBRATION.TAU_BASE_DAYS + SEASON_CALIBRATION.TAU_WATER_DAYS * body.water);
  const omega = TWO_PI / yearS;
  const amp = SEASON_CALIBRATION.KAPPA * (anchorTempK / 4);
  for (let b = 0; b < NB; b++) {
    latitudesRad[b] = (b * 10 - 90) * DEG;
    const { s: sl, c: cl } = bandTrig(b);
    let sum = 0, mx = -Infinity, mn = Infinity, a1r = 0, a1i = 0, a2r = 0, a2i = 0;
    for (let k = 0; k < N; k++) {
      const q = dailyMeanInsolation(sl, cl, sinDec[k], cosDec[k], rho[k]);
      sum += q;
      if (q > mx) mx = q;
      if (q < mn) mn = q;
      a1r += q * cosT1[k]; a1i -= q * sinT1[k];
      a2r += q * cosT2[k]; a2i -= q * sinT2[k];
    }
    qMean[b] = sum / N / qg;
    qHalfRange[b] = (mx - mn) / 2 / qg;
    f1Re[b] = a1r / N / qg; f1Im[b] = a1i / N / qg;
    f2Re[b] = a2r / N / qg; f2Im[b] = a2i / N / qg;
    // (x + iy) / (1 + ic) = (x + y c + i (y - x c)) / (1 + c^2)
    const c1 = omega * tauS, c2 = 2 * omega * tauS;
    const d1 = 1 + c1 * c1, d2 = 1 + c2 * c2;
    t1Re[b] = amp * (f1Re[b] + f1Im[b] * c1) / d1; t1Im[b] = amp * (f1Im[b] - f1Re[b] * c1) / d1;
    t2Re[b] = amp * (f2Re[b] + f2Im[b] * c2) / d2; t2Im[b] = amp * (f2Im[b] - f2Re[b] * c2) / d2;
    let tmx = -Infinity, tmn = Infinity;
    for (let k = 0; k < N; k++) {
      const v = 2 * (t1Re[b] * cosT1[k] - t1Im[b] * sinT1[k] + t2Re[b] * cosT2[k] - t2Im[b] * sinT2[k]);
      if (v > tmx) tmx = v;
      if (v < tmn) tmn = v;
    }
    tempHalfRangeK[b] = (tmx - tmn) / 2;
  }

  // Effective obliquity: spin axis (0, cos t, sin t) (sun-frame.ts
  // polarAxisWorld) against the carrier's orbit normal. orbitPosition's
  // in-plane basis is e_u = (cos n, 0, sin n), e_v = (-cos i sin n, sin i,
  // cos i cos n); e_u x e_v = (-sin i sin n, -cos i, sin i cos n).
  const o = carrier.orbit;
  const dot = -Math.cos(o.inclination) * Math.cos(tilt) + Math.sin(o.inclination) * Math.cos(o.node) * Math.sin(tilt);
  const effectiveObliquityRad = detAcos(Math.min(1, dot < 0 ? -dot : dot));

  return Object.freeze({
    version: SEASON_VERSION,
    bodyId: body.id,
    bodySeed: body.seed,
    carrierId: carrier.id,
    yearNs, yearS, semiMajorAxisM: a,
    axialTiltRad: tilt,
    obliquityRad: Math.min(tilt, PI - tilt),
    effectiveObliquityRad,
    maxSubsolarLatRad: maxLat,
    spinPeriodS: spin.spinPeriodS,
    slowRotator: spin.spinPeriodS / yearS > SEASON_CALIBRATION.SLOW_ROTATOR_RATIO,
    anchorTempK, tauS, qGlobalMean: qg,
    latitudesRad, qMean, qHalfRange, f1Re, f1Im, f2Re, f2Im, t1Re, t1Im, t2Re, t2Im, tempHalfRangeK,
    subsolarSinLatSamples: sinDec, distanceFactorSamples: rho,
    body, sys,
  });
}

const SEASON_CACHE_CAP = 256;
const basisCache = new Map<string, SeasonBasis>();

/** Season basis for a planet or moon: no t, cached per body.seed (and any
 * override), FIFO-capped at 256 entries. Eviction never changes values. */
export function seasonBasis(body: Body, sys: StarSystem, opts?: SeasonBasisOptions): SeasonBasis {
  const key = body.seed + '|' + (opts?.axialTiltRad ?? '') + '|' + (opts?.anchorTempK ?? '');
  const hit = basisCache.get(key);
  if (hit) return hit;
  const basis = buildBasis(body, sys, opts);
  if (basisCache.size >= SEASON_CACHE_CAP) basisCache.delete(basisCache.keys().next().value as string);
  basisCache.set(key, basis);
  return basis;
}
/** Test hook: drop every cached basis (cold-cache checks). */
export function clearSeasonBasisCache(): void { basisCache.clear(); }

export function createSeasonSample(): SeasonSample {
  return { yearNs: 0n, phase01: 0, subsolarSinLat: 0, distanceFactor: 1, tempAnomalyK: new Float64Array(SEASON_BANDS), slowRotator: false };
}

/** sinc^2(x) = (sin x / x)^2: two cascaded box averages. */
function sinc2(x: number): number {
  if (x < 0) x = -x;
  if (x < 1e-8) return 1;
  const s = sine(x) / x;
  return s * s;
}

const sunScratch: number[] = [0, 0, 0];
/**
 * Season state at absolute date t (ns). Closed form, so a direct seek equals
 * any playback path. `windowNs` low-passes the temperature anomaly (see
 * header); 0n is exact. Pass `out` (from createSeasonSample) to avoid
 * allocating the result object and its arrays. This does not make the call
 * allocation-free: exact-date BigInt arithmetic and bodyPosition temporaries
 * still allocate transient garbage (~1.1 KB/call in the phase-1 GC audit).
 * The retained-heap test checks bounded retention, not transient allocation.
 *
 * phase01 and tempAnomalyK are exactly year-periodic. subsolarSinLat and
 * distanceFactor are evaluated exactly at t from the main.ts pair, so they
 * are bit-identical after a year for a planet of a single star, and only
 * approximately periodic for a moon (its own month) or in a binary system
 * (stars[0] orbits the barycentre), exactly like the rendered sun.
 */
export function seasonAt(basis: SeasonBasis, t: bigint, windowNs: bigint = 0n, out?: SeasonSample): SeasonSample {
  const r = out ?? createSeasonSample();
  const yearNs = basis.yearNs;
  const phase = ((t % yearNs) + yearNs) % yearNs;
  const phase01 = Number(phase) / Number(yearNs);
  const rho = rawSunAt(basis.body, basis.sys, basis.semiMajorAxisM, t, sunScratch);
  r.yearNs = yearNs;
  r.phase01 = phase01;
  r.subsolarSinLat = subsolarSinLat(sunScratch, basis.axialTiltRad);
  r.distanceFactor = rho;
  r.slowRotator = basis.slowRotator;
  const theta = TWO_PI * phase01;
  const c1 = detCos(theta), s1 = sine(theta);
  const c2 = 2 * c1 * c1 - 1, s2 = 2 * s1 * c1;
  let w1 = 1, w2 = 1;
  if (windowNs !== 0n) {
    const ratio = Number(windowNs < 0n ? -windowNs : windowNs) / Number(yearNs);
    // x_m = m * omega * W / 2 = m * pi * W / year
    w1 = sinc2(PI * ratio);
    w2 = sinc2(2 * PI * ratio);
  }
  const T = r.tempAnomalyK;
  const { t1Re, t1Im, t2Re, t2Im } = basis;
  if (windowNs === 0n) {
    for (let b = 0; b < SEASON_BANDS; b++) {
      T[b] = 2 * (t1Re[b] * c1 - t1Im[b] * s1 + t2Re[b] * c2 - t2Im[b] * s2);
    }
  } else {
    for (let b = 0; b < SEASON_BANDS; b++) {
      T[b] = 2 * (w1 * (t1Re[b] * c1 - t1Im[b] * s1) + w2 * (t2Re[b] * c2 - t2Im[b] * s2));
    }
  }
  return r;
}

/** Linear interpolation of a per-band array at a latitude in radians. */
export function bandValueAt(values: ArrayLike<number>, latRad: number): number {
  let u = (latRad / DEG + 90) / 10;
  if (!(u > 0)) u = 0; else if (u > SEASON_BANDS - 1) u = SEASON_BANDS - 1;
  const i = Math.min(SEASON_BANDS - 2, Math.floor(u));
  const f = u - i;
  return values[i] + (values[i + 1] - values[i]) * f;
}

/** Annual-mean insolation and seasonal half-ranges at a latitude, for a
 * later classifier that must tell permanent from seasonal snow. */
export function seasonalRangeAt(basis: SeasonBasis, latRad: number): { qMean: number; qHalfRange: number; tempHalfRangeK: number } {
  return {
    qMean: bandValueAt(basis.qMean, latRad),
    qHalfRange: bandValueAt(basis.qHalfRange, latRad),
    tempHalfRangeK: bandValueAt(basis.tempHalfRangeK, latRad),
  };
}

/** Fraction of the local day with the sun above the horizon, h0/pi, for
 * latitude phi and subsolar latitude delta (sines given). */
export function daylightFraction(sinLat: number, sinDec: number): number {
  const cosLat = Math.sqrt(Math.max(0, 1 - sinLat * sinLat));
  const cosDec = Math.sqrt(Math.max(0, 1 - sinDec * sinDec));
  if (cosLat < 1e-12 || cosDec < 1e-12) {
    const v = sinLat * sinDec;
    return v > 0 ? 1 : v < 0 ? 0 : 0.5;
  }
  let c = -(sinLat * sinDec) / (cosLat * cosDec);
  if (c > 1) c = 1; else if (c < -1) c = -1;
  return detAcos(c) / PI;
}

/**
 * Season context for fauna PRESENTATION (activity, coat, migration cues).
 * It must never feed presence or species choice.
 */
export type FaunaSeasonContext = {
  version: typeof SEASON_VERSION;
  yearNs: bigint;
  /** 0 = local midwinter, 0.5 = local midsummer, from the phase of the first
   * temperature harmonic at that latitude; the global phase01 where the
   * latitude has no first-harmonic cycle. */
  seasonPhase01(latRad: number): number;
  /** Temperature anomaly about the annual mean at that latitude, kelvin. */
  tempAnomalyK(latRad: number): number;
  /** Fraction of the day the sun is up at that latitude, 0..1. */
  daylightFraction(latRad: number): number;
};

export function faunaSeasonContext(basis: SeasonBasis, t: bigint): FaunaSeasonContext {
  const s = seasonAt(basis, t);
  const anomalies = s.tempAnomalyK;
  const sinDec = s.subsolarSinLat;
  const phase01 = s.phase01;
  return Object.freeze({
    version: SEASON_VERSION,
    yearNs: basis.yearNs,
    seasonPhase01(latRad: number): number {
      const re = bandValueAt(basis.t1Re, latRad), im = bandValueAt(basis.t1Im, latRad);
      if (re * re + im * im < 1e-18) return phase01;
      // 2|T1| cos(theta + arg T1) peaks at theta = -arg T1.
      const peak = -detAtan2(im, re) / TWO_PI;
      let v = phase01 - peak + 0.5;
      v -= Math.floor(v);
      return v;
    },
    tempAnomalyK(latRad: number): number { return bandValueAt(anomalies, latRad); },
    daylightFraction(latRad: number): number { return daylightFraction(sine(latRad), sinDec); },
  });
}
