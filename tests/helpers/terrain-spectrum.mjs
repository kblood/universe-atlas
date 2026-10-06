// Structural terrain metric 2 (docs/terrain-structural-metrics-2026-10-07.md section 1.2, recommendation 2):
// 2-D power spectrum of a height raster with a LATTICE-PEAK check (a narrow excess at a generator lattice
// wavenumber: block rhythm, kernel lattice) and per-octave ANGULAR ANISOTROPY (stripes). Test-side only: pure,
// deterministic, never imported by src/, never changes a terrain value. Uses Math.cos/sin/log (allowed for test
// statistics); results are tolerance-compared, never digest-compared, and nothing here reuses the runtime hash.
// Design and numbers: docs/terrain-structural-spectrum-2026-10-07.md.

// ---------- complex radix-2 FFT ----------
const isPow2 = n => Number.isInteger(n) && n >= 2 && (n & (n - 1)) === 0;
const twiddleCache = new Map();
function twiddles(n) {
  let t = twiddleCache.get(n);
  if (!t) {
    t = {c: new Float64Array(n / 2), s: new Float64Array(n / 2)};
    for (let k = 0; k < n / 2; k++) {t.c[k] = Math.cos(-2 * Math.PI * k / n);t.s[k] = Math.sin(-2 * Math.PI * k / n);}
    twiddleCache.set(n, t);
  }
  return t;
}
/** In-place 1-D complex FFT of length n (forward; inverse = conj trick by the caller). */
function fft1(re, im, n) {
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;for (; j & bit; bit >>= 1) j ^= bit;j ^= bit;
    if (i < j) {let t = re[i];re[i] = re[j];re[j] = t;t = im[i];im[i] = im[j];im[j] = t;}
  }
  const {c, s} = twiddles(n);
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1, step = n / len;
    for (let i = 0; i < n; i += len) for (let k = 0; k < half; k++) {
      const wr = c[k * step], wi = s[k * step], a = i + k, b = a + half;
      const vr = re[b] * wr - im[b] * wi, vi = re[b] * wi + im[b] * wr;
      re[b] = re[a] - vr;im[b] = im[a] - vi;re[a] += vr;im[a] += vi;
    }
  }
}
/** In-place 2-D forward FFT of an n x n row-major complex array (rows, then columns). */
export function fft2(re, im, n, inverse = false) {
  if (!isPow2(n) || re.length !== n * n || im.length !== n * n) throw new RangeError('fft2: n must be a power of two and arrays n*n');
  if (inverse) for (let i = 0; i < n * n; i++) im[i] = -im[i];
  const r = new Float64Array(n), m = new Float64Array(n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {r[x] = re[y * n + x];m[x] = im[y * n + x];}
    fft1(r, m, n);
    for (let x = 0; x < n; x++) {re[y * n + x] = r[x];im[y * n + x] = m[x];}
  }
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) {r[y] = re[y * n + x];m[y] = im[y * n + x];}
    fft1(r, m, n);
    for (let y = 0; y < n; y++) {re[y * n + x] = r[y];im[y * n + x] = m[y];}
  }
  if (inverse) {const s = 1 / (n * n);for (let i = 0; i < n * n; i++) {re[i] *= s;im[i] = -im[i] * s;}}
}

// ---------- spectrum ----------
/** Signed frequency index of FFT index i (Nyquist n/2 kept positive). */
export const freqIndex = (i, n) => (i <= n / 2 ? i : i - n);
const median = a => {if (!a.length) return NaN;const s = Float64Array.from(a).sort(), m = s.length >> 1;return s.length & 1 ? s[m] : (s[m - 1] + s[m]) / 2;};

/**
 * 2-D power spectrum of an n x n row-major height raster (x = columns = the raster's first axis).
 * Plane-detrended (least squares; NOT an envelope, which would inject structure), periodic 2-D Hann window.
 * P[fy*n+fx] in m^2, normalised so that the sum over all non-DC bins estimates the detrended variance.
 * The input is never mutated.
 */
export function powerSpectrum2D(h, n, stepM, {detrend = 'plane', window = 'hann'} = {}) {
  if (!isPow2(n) || h.length !== n * n) throw new RangeError('powerSpectrum2D: n must be a power of two and h n*n');
  if (!(stepM > 0) || !Number.isFinite(stepM)) throw new RangeError('powerSpectrum2D: positive finite stepM');
  if (detrend !== 'plane' && detrend !== 'none') throw new RangeError('powerSpectrum2D: detrend plane|none');
  if (window !== 'hann' && window !== 'none') throw new RangeError('powerSpectrum2D: window hann|none');
  const N = n * n, c = (n - 1) / 2;
  let mean = 0, sx = 0, sy = 0, sxx = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {const v = h[y * n + x];if (!Number.isFinite(v)) throw new RangeError('powerSpectrum2D: finite heights');mean += v;sx += (x - c) * v;sy += (y - c) * v;}
  for (let x = 0; x < n; x++) sxx += (x - c) * (x - c);
  mean /= N;const gx = detrend === 'plane' ? sx / (sxx * n) : 0, gy = detrend === 'plane' ? sy / (sxx * n) : 0, m0 = detrend === 'plane' ? mean : 0;
  const w = new Float64Array(n);for (let i = 0; i < n; i++) w[i] = window === 'hann' ? .5 - .5 * Math.cos(2 * Math.PI * i / n) : 1;
  let wss = 0;const re = new Float64Array(N), im = new Float64Array(N);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const ww = w[x] * w[y];wss += ww * ww;re[y * n + x] = (h[y * n + x] - m0 - gx * (x - c) - gy * (y - c)) * ww;
  }
  fft2(re, im, n);
  const P = new Float64Array(N), s = 1 / (N * wss);let total = 0;
  for (let i = 0; i < N; i++) {P[i] = (re[i] * re[i] + im[i] * im[i]) * s;if (i) total += P[i];}
  return {P, n, stepM, total, binCyclesPerM: 1 / (n * stepM)};
}

/** Ring-median whitening: W = P / median(P over the integer ring round(|k|)), rings >= 1 bin; `exclude(fx,fy)`
 * keeps lattice neighbourhoods out of the ring medians. Returns {W, ringMedian}. */
export function whiten(spec, exclude = () => false) {
  const {P, n} = spec, maxR = Math.ceil(Math.SQRT2 * n / 2) + 1, rings = Array.from({length: maxR + 1}, () => []);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const fx = freqIndex(x, n), fy = freqIndex(y, n), r = Math.round(Math.hypot(fx, fy));
    if (r >= 1 && !exclude(fx, fy)) rings[r].push(P[y * n + x]);
  }
  const ringMedian = rings.map(median), W = new Float64Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const fx = freqIndex(x, n), fy = freqIndex(y, n), r = Math.round(Math.hypot(fx, fy)), m = ringMedian[r];
    W[y * n + x] = r >= 1 && m > 0 ? P[y * n + x] / m : 0;
  }
  return {W, ringMedian};
}

/** Lattice wavevectors (cycles/m in raster coordinates) of a rhythm of `wavelengthM` along `angleRad` from raster
 * x, harmonics 1..harmonics. Labels carry the harmonic. */
export function latticeTargets(label, wavelengthM, {angleRad = 0, harmonics = 1} = {}) {
  const out = [];
  for (let m = 1; m <= harmonics; m++) out.push({label: `${label} h${m}`, family: label, harmonic: m, wavelengthM: wavelengthM / m,
    kx: m * Math.cos(angleRad) / wavelengthM, ky: m * Math.sin(angleRad) / wavelengthM});
  return out;
}

const PEAK_HALF = 1, BOX_HALF = 5, MIN_BIN = 2;
const binsOf = (t, n, stepM) => ({bx: t.kx * n * stepM, by: t.ky * n * stepM});
const inRange = ({bx, by}, n) => {const r = Math.hypot(bx, by);return r >= MIN_BIN && r <= n / 2 - PEAK_HALF;};
/** The 3x3 neighbourhoods of every in-range target and its mirror -k: kept out of ring medians and boxes. */
export function targetExclusion(n, stepM, targets) {
  const mask = new Uint8Array(n * n), wrap = i => ((i % n) + n) % n;
  for (const t of targets) {
    const b = binsOf(t, n, stepM);if (!inRange(b, n)) continue;const cx = Math.round(b.bx), cy = Math.round(b.by);
    for (const s of [1, -1]) for (let dy = -PEAK_HALF; dy <= PEAK_HALF; dy++) for (let dx = -PEAK_HALF; dx <= PEAK_HALF; dx++) mask[wrap(s * cy + dy) * n + wrap(s * cx + dx)] = 1;
  }
  return (fx, fy) => mask[wrap(fy) * n + wrap(fx)] === 1;
}
/** Ring-whitened spectrum with the targets' neighbourhoods excluded from the ring medians. */
export const whitenForTargets = (spec, targets) => whiten(spec, targetExclusion(spec.n, spec.stepM, targets)).W;
/** Mean of several whitened spectra of the same n and stepM (tiles in the same orientation): pooling cuts the
 * per-bin scatter by about sqrt(count), so a weak rhythm common to every tile rises above the pooled background. */
export function poolWhitened(list) {
  const N = list[0].length, W = new Float64Array(N);
  for (const w of list) {if (w.length !== N) throw new RangeError('poolWhitened: equal sizes');for (let i = 0; i < N; i++) W[i] += w[i] / list.length;}
  return W;
}
/**
 * Lattice-peak statistics on a whitened spectrum W (whitenForTargets, or poolWhitened of several). For every
 * target with 2 <= |k| <= n/2 - 1 bins:
 *  - peakDb = 10 log10( mean W over the 3x3 bins around the target / mean W over the 11x11 box around it ); the box
 *    drops the 3x3 neighbourhoods of every target and its mirror and |k| < 2 bins. W is ring-whitened, so the box
 *    is local in |k| and in angle (anisotropy-robust). A clean field scatters around 0 dB; a sinusoid of the
 *    target wavevector (which a periodic Hann window spreads over exactly the 3x3) raises it.
 *  - lineDb (axis-aligned targets only) = 10 log10( mean W on the target's column (|f_other| <= n/4, |k| >= 2) /
 *    mean W on the columns at +-2 and +-3 bins that are not target columns ). Seams or steps at the rhythm that
 *    vary along the seam spread their power along the whole column; a column mean is a low-scatter detector.
 * Per family (latticeTargets label), combDb = 10 log10 of the mean linear peak ratio over its in-range harmonics:
 * a seam or gutter comb has many harmonics, a natural bump has one. With the raw spectrum P (one tile), each peak
 * also carries toneRmsM, the RMS height of the 3x3 excess over the box mean (an amplitude in metres).
 */
export function latticeStats(W, n, stepM, targets, P = null) {
  const near = targetExclusion(n, stepM, targets), at = (fx, fy) => W[(((fy % n) + n) % n) * n + (((fx % n) + n) % n)];
  const targetCols = {x: new Set(), y: new Set()};
  for (const t of targets) {const b = binsOf(t, n, stepM);if (!inRange(b, n)) continue;if (Math.abs(b.by) < .5) targetCols.x.add(Math.round(b.bx));if (Math.abs(b.bx) < .5) targetCols.y.add(Math.round(b.by));}
  const peaks = targets.map(t => {
    const b = binsOf(t, n, stepM), base = {label: t.label, family: t.family, harmonic: t.harmonic, wavelengthM: t.wavelengthM, bx: b.bx, by: b.by};
    if (!inRange(b, n)) return {...base, inRange: false, peakDb: null, lineDb: null};
    const cx = Math.round(b.bx), cy = Math.round(b.by);let ps = 0, pk = 0, bs = 0, bk = 0, rp = 0, rb = 0;
    const raw = (fx, fy) => P ? P[(((fy % n) + n) % n) * n + (((fx % n) + n) % n)] : 0;
    for (let dy = -BOX_HALF; dy <= BOX_HALF; dy++) for (let dx = -BOX_HALF; dx <= BOX_HALF; dx++) {
      const fx = cx + dx, fy = cy + dy;
      if (Math.abs(dx) <= PEAK_HALF && Math.abs(dy) <= PEAK_HALF) {ps += at(fx, fy);rp += raw(fx, fy);pk++;continue;}
      if (Math.hypot(fx, fy) < MIN_BIN || near(fx, fy) || Math.abs(fx) > n / 2 || Math.abs(fy) > n / 2) continue;
      bs += at(fx, fy);rb += raw(fx, fy);bk++;
    }
    const ratio = bk && bs > 0 ? (ps / pk) / (bs / bk) : null;
    let lineDb = null;
    const axis = Math.abs(b.by) < .5 ? 'x' : Math.abs(b.bx) < .5 ? 'y' : null;
    if (axis) {
      const c0 = axis === 'x' ? cx : cy, lim = n / 4, cols = targetCols[axis];
      const lineMean = c => {let s = 0, k = 0;for (let o = -lim; o <= lim; o++) {const fx = axis === 'x' ? c : o, fy = axis === 'x' ? o : c;
        if (Math.hypot(fx, fy) < MIN_BIN) continue;s += at(fx, fy);k++;}return k ? s / k : NaN;};
      const nb = [-3, -2, 2, 3].map(o => c0 + o).filter(c => Math.abs(c) >= MIN_BIN && Math.abs(c) <= n / 2 && ![...cols].some(t => Math.abs(Math.abs(c) - Math.abs(t)) <= 1));
      if (nb.length) {const on = lineMean(c0), off = nb.reduce((a, c) => a + lineMean(c), 0) / nb.length;lineDb = on > 0 && off > 0 ? 10 * Math.log10(on / off) : null;}
    }
    // toneRmsM (single spectrum only): RMS height of the excess over the local box mean, both mirror halves.
    const toneRmsM = P && bk ? Math.sqrt(Math.max(0, 2 * (rp - pk * rb / bk))) : null;
    return {...base, inRange: true, ratio, peakDb: ratio ? 10 * Math.log10(ratio) : null, lineDb, toneRmsM};
  });
  const families = {};
  for (const p of peaks) {if (!p.inRange || p.ratio === null) continue;(families[p.family] ??= []).push(p.ratio);}
  const comb = Object.fromEntries(Object.entries(families).map(([f, r]) => [f, {harmonics: r.length, combDb: 10 * Math.log10(r.reduce((a, v) => a + v, 0) / r.length)}]));
  return {peaks, comb};
}
/** latticeStats of one spectrum. */
export const latticePeaks = (spec, targets) => latticeStats(whitenForTargets(spec, targets), spec.n, spec.stepM, targets, spec.P);

/**
 * Angular anisotropy per octave of wavelength [lo, 2 lo), lo = 2 stepM * 2^j, bins with |k| <= n/2 only (no
 * corner bias). For each band: coherence = |sum P e^{2i theta}| / sum P (the band-passed structure-tensor
 * coherence: 0 isotropic, 1 one direction), sectorRatio = strongest 30-degree sector (theta mod 180) power over
 * the mean sector power (1 isotropic, 6 all in one sector), gradientAngleDeg = dominant wavevector angle from raster
 * x in [0, 180) (stripes run perpendicular to it), bins = number of bins (coarse octaves are noisy).
 */
export function octaveAnisotropy(spec, {minBins = 24} = {}) {
  const {P, n, stepM} = spec, bands = [];
  for (let lo = 2 * stepM; ; lo *= 2) {const kHi = n * stepM / lo;if (kHi / 2 < MIN_BIN) break;bands.push({lo, kHi, kLo: kHi / 2, sp: 0, sc: 0, ss: 0, bins: 0, sectors: new Float64Array(6)});}
  // One pass over the half plane (P(k) = P(-k) for real input): fy in 0..n/2, fx > 0 on the fy = 0 row.
  for (let fy = 0; fy <= n / 2; fy++) for (let x = 0; x < n; x++) {
    const fx = freqIndex(x, n);if (fy === 0 && fx <= 0) continue;
    const r = Math.hypot(fx, fy);if (r > n / 2) continue;
    const b = bands.find(o => r > o.kLo && r <= o.kHi);if (!b) continue;
    const th = Math.atan2(fy, fx), p = P[fy * n + x];b.sp += p;b.sc += p * Math.cos(2 * th);b.ss += p * Math.sin(2 * th);b.bins++;
    b.sectors[Math.min(5, Math.floor(th / (Math.PI / 6)))] += p; // th in (0, pi]: pi itself folds into the last sector
  }
  const out = [];
  for (const {lo, sp, sc, ss, bins, sectors} of bands) {
    if (bins < minBins) continue;
    const mean = sp / 6;let mx = 0;for (const v of sectors) mx = Math.max(mx, v);
    let ang = .5 * Math.atan2(ss, sc) * 180 / Math.PI;if (ang < 0) ang += 180;
    out.push({band: `${Math.round(lo)}-${Math.round(2 * lo)}m`, loM: lo, hiM: 2 * lo, bins, rmsM: Math.sqrt(2 * sp),
      coherence: sp > 0 ? Math.hypot(sc, ss) / sp : 0, sectorRatio: mean > 0 ? mx / mean : 1, gradientAngleDeg: ang});
  }
  return out;
}

/** Radial log-log slope of the ring-mean 2-D spectrum between loM and hiM wavelength: P2(k) ~ k^-beta2D. For an
 * isotropic field the 1-D transect exponent of mountain-metrics.mjs is beta2D - 1 (reported as beta1D). INFO. */
export function radialBeta(spec, {loM = 500, hiM = 8000} = {}) {
  const {P, n, stepM} = spec, sum = new Float64Array(n), cnt = new Float64Array(n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const r = Math.round(Math.hypot(freqIndex(x, n), freqIndex(y, n)));if (r < 1 || r > n / 2) continue;sum[r] += P[y * n + x];cnt[r]++;
  }
  let sx = 0, sy = 0, sxx = 0, sxy = 0, k = 0;
  for (let r = 1; r <= n / 2; r++) {
    const lam = n * stepM / r;if (lam < loM || lam > hiM || !cnt[r] || !(sum[r] > 0)) continue;
    const X = Math.log(r), Y = Math.log(sum[r] / cnt[r]);sx += X;sy += Y;sxx += X * X;sxy += X * Y;k++;
  }
  if (k < 3) return {beta2D: NaN, beta1D: NaN, rings: k};
  const slope = (k * sxy - sx * sy) / (k * sxx - sx * sx);
  return {beta2D: -slope, beta1D: -slope - 1, rings: k};
}

/** Largest in-range peakDb and lineDb (and which target), -Infinity when none is in range. */
export function summarisePeaks(peaks) {
  const inR = peaks.filter(p => p.inRange);let maxPeakDb = -Infinity, maxLineDb = -Infinity, peakAt = null, lineAt = null;
  for (const p of inR) {if (p.peakDb !== null && p.peakDb > maxPeakDb) {maxPeakDb = p.peakDb;peakAt = p.label;}if (p.lineDb !== null && p.lineDb > maxLineDb) {maxLineDb = p.lineDb;lineAt = p.label;}}
  return {peaks, maxPeakDb, peakAt, maxLineDb, lineAt};
}
/** One-call summary: spectrum, lattice peaks and combs for `targets`, octave anisotropy, radial beta; W (the
 * whitened spectrum) is returned for pooling. */
export function structuralSpectrum(h, n, stepM, targets = []) {
  const spec = powerSpectrum2D(h, n, stepM);
  const W = whitenForTargets(spec, targets), {peaks, comb} = latticeStats(W, n, stepM, targets, spec.P);
  return {n, stepM, windowM: n * stepM, rmsM: Math.sqrt(spec.total), W, ...summarisePeaks(peaks), comb,
    anisotropy: octaveAnisotropy(spec), beta: radialBeta(spec)};
}

// ---------- rasters ----------
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = v => {const l = Math.hypot(v[0], v[1], v[2]);return [v[0] / l, v[1] / l, v[2] / l];};
/**
 * n x n gnomonic raster of sampler(d).groundHeightM centred on unit direction d, raster x along `axis` (a world
 * vector, projected into the tangent plane; e.g. the belt axis of the M1 layout sample) or, when axis is null or
 * degenerate, the east-ish tangent of mountain-metrics.mjs frame(). y = d x X. Cell centres at (i - n/2 + .5) step.
 */
export function alignedRaster(sampler, d, R, n, stepM, axis = null) {
  let X = null;
  if (axis) {const dot = axis[0] * d[0] + axis[1] * d[1] + axis[2] * d[2], t = [axis[0] - dot * d[0], axis[1] - dot * d[1], axis[2] - dot * d[2]];if (Math.hypot(...t) > 1e-6) X = unit(t);}
  if (!X) X = unit(cross(Math.abs(d[1]) < .9 ? [0, 1, 0] : [1, 0, 0], d));
  const Y = cross(d, X), h = new Float64Array(n * n), o = n / 2 - .5;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i - o) * stepM, y = (j - o) * stepM;
    h[j * n + i] = sampler(unit([d[0] * R + X[0] * x + Y[0] * y, d[1] * R + X[1] * x + Y[1] * y, d[2] * R + X[2] * x + Y[2] * y])).groundHeightM;
  }
  return h;
}

// ---------- synthetic fields and injected defects (Tier 0) ----------
/** Deterministic integer hash -> [0, 1). Test-side only (not the runtime hash). */
export function hash01(a, b, seed) {
  let h = Math.imul(a | 0, 0x27d4eb2f) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b9);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Isotropic Gaussian fractal (spectral synthesis, P2 ~ |k|^-beta2D, random phases, Rayleigh amplitudes), periodic,
 * zero mean, scaled to rmsM. beta2D = 3.2 is a 1-D transect exponent of about 2.2 (Earth-like). */
export function fractalField(n, stepM, {beta2D = 3.2, rmsM = 800, seed = 1} = {}) {
  const re = new Float64Array(n * n), im = new Float64Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const fx = freqIndex(x, n), fy = freqIndex(y, n), r = Math.hypot(fx, fy);if (r < 1) continue;
    const u1 = Math.max(1e-12, hash01(x, y, seed)), u2 = hash01(x, y, seed + 7919);
    const a = Math.sqrt(-2 * Math.log(u1)) * Math.pow(r, -beta2D / 2), ph = 2 * Math.PI * u2;
    re[y * n + x] = a * Math.cos(ph);im[y * n + x] = a * Math.sin(ph);
  }
  fft2(re, im, n, true);
  let s = 0;for (let i = 0; i < n * n; i++) s += re[i] * re[i];
  const k = rmsM / Math.sqrt(s / (n * n));for (let i = 0; i < n * n; i++) re[i] *= k;
  return re;
}
const copy = h => Float64Array.from(h);
/** + amplitudeM * sin(2 pi x / wavelengthM + phase) along raster x (a smooth block rhythm). */
export function addRhythm(h, n, stepM, wavelengthM, amplitudeM, phase = .7) {
  const o = copy(h);for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) o[y * n + x] += amplitudeM * Math.sin(2 * Math.PI * x * stepM / wavelengthM + phase);return o;
}
/** Trunk gutters: a Gaussian trench of depthM and sigma widthM along every block boundary x = k blockM + offset
 * (the rejected C/D/E look). */
export function addGutters(h, n, stepM, blockM, depthM, widthM = 250, offsetM = 3100) {
  const o = copy(h);
  for (let x = 0; x < n; x++) {let t = ((x * stepM - offsetM) % blockM + blockM) % blockM;if (t > blockM / 2) t -= blockM;const g = depthM * Math.exp(-.5 * (t / widthM) ** 2);for (let y = 0; y < n; y++) o[y * n + x] -= g;}
  return o;
}
/** Block seams: each block of blockM along x scales the relief about the field mean by (1 + fraction * r_b),
 * r_b = +-1 hashed per block: a step at every boundary that varies along it. */
export function addBlockScaling(h, n, stepM, blockM, fraction, seed = 3, offsetM = 3100) {
  const o = copy(h);let mean = 0;for (const v of h) mean += v;mean /= h.length;
  for (let x = 0; x < n; x++) {const b = Math.floor((x * stepM - offsetM) / blockM), f = 1 + fraction * (hash01(b, 17, seed) < .5 ? -1 : 1);
    for (let y = 0; y < n; y++) o[y * n + x] = mean + (h[y * n + x] - mean) * f;}
  return o;
}
/** Fine stripes: + amplitudeM * sin of wavelengthM with its wavevector at angleRad from raster x (a fixed-angle
 * stripe lattice; the stripes run perpendicular to the wavevector). */
export function addStripes(h, n, stepM, wavelengthM, amplitudeM, angleRad = Math.PI / 6) {
  const o = copy(h), c = Math.cos(angleRad), s = Math.sin(angleRad);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) o[y * n + x] += amplitudeM * Math.sin(2 * Math.PI * (x * c + y * s) * stepM / wavelengthM);
  return o;
}
