// W0-SEASON: closed-form season basis (src/season.ts). Presentation only;
// no src module consumes it in this increment.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { galaxies, sector, system, refByAddress, bodyPosition, AU, G } from '../src/catalog.ts';
import { advanceDate, CATALOGUE_EPOCH_NS, YEAR_NS } from '../src/world-time.ts';
import { PLAYBACK_TIERS } from '../src/time-nav.ts';
import {
  SEASON_VERSION, SEASON_BANDS, seasonBasis, seasonAt, clearSeasonBasisCache, createSeasonSample,
  dailyMeanInsolation, orbitPeriodNs, faunaSeasonContext, seasonalRangeAt, bandValueAt,
} from '../src/season.ts';

const DEG = Math.PI / 180;
const MSUN = 1.98847e30;

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Real catalogue planets (and their moons), walking sectors outward. */
function corpus(minPlanets, startCx = 900) {
  const g = galaxies('LETHRA-001')[0];
  const planets = [], moons = [];
  for (let cx = startCx; planets.length < minPlanets; cx++) {
    for (const ref of sector(g, [cx, 0, 0]).refs) {
      const sys = system(ref);
      for (const planet of sys.planets) planets.push({ body: planet, sys });
      for (const moon of sys.moons) moons.push({ body: moon, sys });
      if (planets.length >= minPlanets) break;
    }
  }
  return { planets, moons };
}

/** A synthetic one-star system with an exactly specified orbit, so annual
 * statistics can be compared with closed forms. */
function synthetic({ e = 0, inclination = 0, water = 0.5, temperatureK = 288, tag = '' } = {}) {
  const star = { id: 'SYN/star/0', name: 'Syn', kind: 'star', type: 'G · yellow dwarf', parentId: 'SYN', massKg: MSUN,
    radiusM: 6.957e8, temperatureK: 5772, color: '#fff', orbit: null, seed: 'SYN/star/0', water: 0, rings: false };
  const planet = { id: 'SYN/planet/0', name: 'Synplanet', kind: 'planet', type: 'Oceanic world', parentId: star.id,
    massKg: 6e24, radiusM: 6.4e6, temperatureK, color: '#3985ae',
    orbit: { a: AU, e, inclination, node: 0, periapsis: 0, anomaly: 0, mu: G * MSUN },
    seed: `SYN/planet/0/e=${e}/i=${inclination}/w=${water}/T=${temperatureK}/${tag}`, water, rings: false };
  const sys = { id: 'SYN', name: 'Syn', ref: null, stars: [star], planets: [planet], moons: [], belts: [], version: 'synthetic' };
  return { body: planet, sys };
}

/** Complete elliptic integral of the second kind E(k) by the AGM method. */
function ellipticE(k) {
  if (k >= 1) return 1;
  let a = 1, b = Math.sqrt(1 - k * k), c = k, sum = c * c / 2, p = 0.5;
  for (let i = 0; i < 30 && Math.abs(c) > 1e-17; i++) {
    const an = (a + b) / 2; c = (a - b) / 2; b = Math.sqrt(a * b); a = an; p *= 2; sum += p * c * c;
  }
  return (Math.PI / (2 * a)) * (1 - sum);
}

/** Independent annual-mean Berger insolation on a circular orbit, platform
 * Math, 8192 steps in true longitude (no shared code with season.ts). */
function bergerAnnualMean(latRad, eps, steps = 8192) {
  let s = 0;
  for (let j = 0; j < steps; j++) {
    const lam = (j + 0.5) * 2 * Math.PI / steps;
    const d = Math.asin(Math.sin(eps) * Math.sin(lam));
    const x = -Math.tan(latRad) * Math.tan(d);
    const h0 = x >= 1 ? 0 : x <= -1 ? Math.PI : Math.acos(x);
    s += (h0 * Math.sin(latRad) * Math.sin(d) + Math.cos(latRad) * Math.cos(d) * Math.sin(h0)) / Math.PI;
  }
  return s / steps;
}

function sampleBytes(s) {
  const f = new Float64Array(3 + SEASON_BANDS);
  f[0] = s.phase01; f[1] = s.subsolarSinLat; f[2] = s.distanceFactor; f.set(s.tempAnomalyK, 3);
  return Buffer.concat([Buffer.from(f.buffer), Buffer.from(s.yearNs.toString() + (s.slowRotator ? 'S' : 'F'))]);
}

const THE_CORPUS = corpus(566);

test('version literal', () => {
  assert.equal(SEASON_VERSION, 'atlas-season-1');
});

test('yearNs is the exact phaseAt period: carrier positions repeat bit for bit after a year', () => {
  const rand = mulberry32(7);
  for (const { body, sys } of THE_CORPUS.planets.slice(0, 120)) {
    const b = seasonBasis(body, sys);
    assert.equal(b.yearNs, orbitPeriodNs(body.orbit));
    const t = CATALOGUE_EPOCH_NS + BigInt(Math.floor(rand() * 1e15));
    assert.deepEqual(bodyPosition(body, sys, t + b.yearNs), bodyPosition(body, sys, t));
  }
  // A moon's year is its parent planet's.
  const { body: moon, sys } = THE_CORPUS.moons[0];
  const parent = sys.planets.find((p) => p.id === moon.parentId);
  assert.equal(seasonBasis(moon, sys).yearNs, orbitPeriodNs(parent.orbit));
  assert.equal(seasonBasis(moon, sys).carrierId, parent.id);
});

test('basis samples are the main.ts sun pair: bit-identical to seasonAt at t_k for single-star planets', () => {
  let checked = 0;
  for (const { body, sys } of THE_CORPUS.planets.filter((p) => p.sys.stars.length === 1).slice(0, 60)) {
    const b = seasonBasis(body, sys);
    const N = b.subsolarSinLatSamples.length;
    for (let k = 0; k < N; k += 17) {
      const s = seasonAt(b, (BigInt(k) * b.yearNs) / BigInt(N));
      assert.equal(b.subsolarSinLatSamples[k], Math.max(-1, Math.min(1, s.subsolarSinLat)));
      assert.equal(b.distanceFactorSamples[k], s.distanceFactor);
      checked++;
    }
  }
  assert.ok(checked > 500);
});

test('periodicity: seasonAt(t) deep-equals seasonAt(t + yearNs) for 200 random t (negative and > 1e27 ns included)', () => {
  const rand = mulberry32(11);
  const single = THE_CORPUS.planets.filter((p) => p.sys.stars.length === 1);
  const binary = THE_CORPUS.planets.filter((p) => p.sys.stars.length === 2);
  assert.ok(single.length > 50 && binary.length > 10);
  let neg = 0, huge = 0, maxBinary = 0, maxMoon = 0;
  for (let i = 0; i < 200; i++) {
    const mag = BigInt(Math.floor(rand() * 2 ** 52)) * 10n ** BigInt(Math.floor(rand() * 16));
    let t = rand() < 0.3 ? -mag : mag;
    if (i % 5 === 0) t = 10n ** 27n + mag; // beyond 1e27 ns
    if (t < 0n) neg++;
    if (t > 10n ** 27n) huge++;
    // Planets of a single star: every field, bit for bit.
    const { body, sys } = single[i % single.length];
    const b = seasonBasis(body, sys);
    assert.deepEqual(seasonAt(b, t + b.yearNs), seasonAt(b, t), `${body.id} t=${t}`);
    assert.deepEqual(seasonAt(b, t - 3n * b.yearNs), seasonAt(b, t));
    // Binary planets and moons: the year-phase fields are exact; the sun
    // geometry follows the real (non-year-periodic) stars[0]/moon motion,
    // exactly like the rendered sun, and stays within the wobble bound.
    for (const [list, kind] of [[binary, 'binary'], [THE_CORPUS.moons, 'moon']]) {
      const { body: ob, sys: os } = list[i % list.length];
      const bb = seasonBasis(ob, os);
      const x = seasonAt(bb, t), y = seasonAt(bb, t + bb.yearNs);
      assert.equal(x.phase01, y.phase01);
      assert.deepEqual(x.tempAnomalyK, y.tempAnomalyK);
      const d = Math.abs(x.subsolarSinLat - y.subsolarSinLat);
      if (kind === 'binary') maxBinary = Math.max(maxBinary, d); else maxMoon = Math.max(maxMoon, d);
    }
  }
  assert.ok(neg >= 20 && huge >= 40, `coverage neg=${neg} huge=${huge}`);
  console.log(`# periodicity: single-star planets bit-exact; |d subsolarSinLat| after one year: binary max ${maxBinary.toExponential(2)}, moon max ${maxMoon.toExponential(2)}`);
  assert.ok(maxBinary < 0.1 && maxMoon < 0.05);
});

test('seek independence: direct seasonAt equals the value reached by playback across all 5 PLAYBACK_TIERS', () => {
  assert.equal(PLAYBACK_TIERS.length, 5);
  const rand = mulberry32(23);
  function playbackTicks(t0, target) {
    const ticks = [t0];
    let t = t0, guard = 0;
    while (t < target && guard++ < 300) {
      const tier = PLAYBACK_TIERS[Math.floor(rand() * PLAYBACK_TIERS.length)];
      const next = advanceDate(t, 0.1 + rand() * 40, tier.rate);
      t = next > target ? target : next;
      ticks.push(t);
    }
    if (ticks[ticks.length - 1] !== target) ticks.push(target);
    return ticks;
  }
  const tiersSeen = new Set();
  const subjects = [...THE_CORPUS.planets.slice(0, 8), ...THE_CORPUS.moons.slice(0, 2)];
  for (const { body, sys } of subjects) {
    for (const tier of PLAYBACK_TIERS) {
      tiersSeen.add(tier.id);
      const t0 = CATALOGUE_EPOCH_NS + BigInt(Math.floor(rand() * 1e17));
      const target = advanceDate(t0, 200 + rand() * 1000, tier.rate);
      const warm = seasonBasis(body, sys);
      const out = createSeasonSample();
      const played = playbackTicks(t0, target).map((t) => ({ t, bytes: sampleBytes(seasonAt(warm, t, 0n, out)) }));
      clearSeasonBasisCache();
      const cold = seasonBasis(body, sys);
      for (const { t, bytes } of played) assert.deepEqual(sampleBytes(seasonAt(cold, t)), bytes, `${body.id} ${tier.id} t=${t}`);
    }
  }
  assert.equal(tiersSeen.size, 5);
});

test('cold vs warm basis cache and shuffled body order are bit-identical', () => {
  const subjects = [...THE_CORPUS.planets.slice(0, 60), ...THE_CORPUS.moons.slice(0, 10)];
  const dates = [0n, -1234567890123456789n, CATALOGUE_EPOCH_NS, CATALOGUE_EPOCH_NS + 98765432109876n, 10n ** 28n + 17n];
  function digest(order) {
    const parts = new Array(subjects.length);
    for (const i of order) {
      const { body, sys } = subjects[i];
      const b = seasonBasis(body, sys);
      const basisBytes = Buffer.concat([b.qMean, b.qHalfRange, b.f1Re, b.f1Im, b.f2Re, b.f2Im, b.t1Re, b.t1Im, b.t2Re, b.t2Im, b.tempHalfRangeK]
        .map((a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength)));
      parts[i] = Buffer.concat([basisBytes, ...dates.map((t) => sampleBytes(seasonAt(b, t, 0n))), sampleBytes(seasonAt(b, dates[3], 37n * YEAR_NS))]);
    }
    return createHash('sha256').update(Buffer.concat(parts)).digest('hex');
  }
  const order = subjects.map((_, i) => i);
  clearSeasonBasisCache();
  const cold = digest(order);
  const warm = digest(order);
  clearSeasonBasisCache();
  const shuffled = digest(order.map((_, i) => order[(i * 29 + 13) % order.length]));
  assert.equal(warm, cold);
  assert.equal(shuffled, cold);
});

test('window: W=0n is byte-identical to the unfiltered call; W >= 50 years leaves < 1e-3 of the paused amplitude', () => {
  for (const { body, sys } of THE_CORPUS.planets.slice(0, 40)) {
    const b = seasonBasis(body, sys);
    let paused = 0;
    for (let k = 0; k < 256; k++) {
      const t = (BigInt(k) * b.yearNs) / 256n;
      for (const v of seasonAt(b, t).tempAnomalyK) paused = Math.max(paused, Math.abs(v));
    }
    assert.ok(paused > 0);
    const t = CATALOGUE_EPOCH_NS + 123456789n;
    assert.deepEqual(sampleBytes(seasonAt(b, t, 0n)), sampleBytes(seasonAt(b, t)));
    for (const years of [50, 50.5, 73.3, 1000, 1e9]) {
      const W = BigInt(Math.round(years * 1000)) * b.yearNs / 1000n;
      for (const tt of [t, -t, t * 1000n]) {
        const s = seasonAt(b, tt, W);
        for (const v of s.tempAnomalyK) assert.ok(Math.abs(v) < 1e-3 * paused, `${years}y: ${v} vs paused ${paused}`);
        assert.deepEqual(seasonAt(b, tt, -W).tempAnomalyK, s.tempAnomalyK);
      }
    }
    // The window is monotone in effect: a 0.3-year window already attenuates.
    const s0 = seasonAt(b, t), s1 = seasonAt(b, t, (3n * b.yearNs) / 10n);
    const n0 = Math.hypot(...s0.tempAnomalyK), n1 = Math.hypot(...s1.tempAnomalyK);
    assert.ok(n1 <= n0 + 1e-12);
  }
});

test('Berger daily-mean insolation: equinox/solstice spot values', () => {
  // Equator at equinox: 1/pi. Pole at solstice (delta = eps): sin(eps).
  assert.ok(Math.abs(dailyMeanInsolation(0, 1, 0, 1) - 1 / Math.PI) < 1e-15);
  const e = 23.44 * DEG;
  assert.ok(Math.abs(dailyMeanInsolation(1, 0, Math.sin(e), Math.cos(e)) - Math.sin(e)) < 1e-15);
  assert.equal(dailyMeanInsolation(-1, 0, Math.sin(e), Math.cos(e)), 0); // polar night
  // 60N at the solstice, Earth tilt, mean distance: hand-computed 0.3618 S0
  // (h0 = acos(-tan60 tan23.44) = 2.4223 rad) = 492 W/m2 for S0 = 1361; the
  // familiar ~476 W/m2 for June includes the aphelion factor 0.967.
  const p = 60 * DEG;
  const q = dailyMeanInsolation(Math.sin(p), Math.cos(p), Math.sin(e), Math.cos(e));
  const x = -Math.tan(p) * Math.tan(e), h0 = Math.acos(x);
  assert.ok(Math.abs(q - (h0 * Math.sin(p) * Math.sin(e) + Math.cos(p) * Math.cos(e) * Math.sin(h0)) / Math.PI) < 1e-14);
  assert.ok(Math.abs(q - 0.3618) < 2e-4 && Math.abs(q * 1361 * 0.9670 - 476) < 1.5, `60N solstice ${q * 1361} W/m2`);
});

test('owner amendment 2: any obliquity 0/23.4/60/90/120/180 deg matches the annual-mean closed forms and folds', () => {
  const tilts = [0, 23.4, 60, 90, 120, 180];
  const bases = new Map();
  const { body, sys } = synthetic({ tag: 'tilts' });
  for (const d of tilts) bases.set(d, seasonBasis(body, sys, { axialTiltRad: d * DEG }));
  const report = [];
  for (const d of tilts) {
    const b = bases.get(d);
    const eps = Math.min(d, 180 - d) * DEG;
    assert.ok(Math.abs(b.obliquityRad - eps) < 1e-12);
    assert.ok(Math.abs(b.effectiveObliquityRad - eps) < 1e-7, `${d}: effective ${b.effectiveObliquityRad / DEG}`);
    assert.ok(Math.abs(b.qGlobalMean - 0.25) < 1e-12, 'circular orbit: global mean S0/4');
    // Closed forms (units of S0, divided by the global mean 1/4):
    //   pole = sin(eps)/pi, equator = (2/pi^2) E(sin eps).
    const pole = (Math.sin(eps) / Math.PI) / 0.25, equator = (2 / (Math.PI * Math.PI)) * ellipticE(Math.sin(eps)) / 0.25;
    assert.ok(Math.abs(b.qMean[18] - pole) < 2e-3 * Math.max(pole, 0.1), `${d}: pole ${b.qMean[18]} vs ${pole}`);
    assert.ok(Math.abs(b.qMean[0] - pole) < 2e-3 * Math.max(pole, 0.1));
    assert.ok(Math.abs(b.qMean[9] - equator) < 2e-3 * equator, `${d}: equator ${b.qMean[9]} vs ${equator}`);
    // Independent 8192-step Berger integral at every band.
    for (let k = 0; k < SEASON_BANDS; k++) {
      const ref = bergerAnnualMean(b.latitudesRad[k], eps) / 0.25;
      assert.ok(Math.abs(b.qMean[k] - ref) < 3e-3, `${d} deg band ${k}: ${b.qMean[k]} vs Berger ${ref}`);
    }
    // Seasonal half-range at the pole on a circular orbit: (sin eps)/2 / (1/4) = 2 sin eps.
    assert.ok(Math.abs(b.qHalfRange[18] - 2 * Math.sin(eps)) < 2e-3, `${d}: polar half-range ${b.qHalfRange[18]}`);
    report.push(`${d}deg: Qeq=${b.qMean[9].toFixed(4)} Qpole=${b.qMean[18].toFixed(4)} halfPole=${b.qHalfRange[18].toFixed(3)} dTpole=${b.tempHalfRangeK[18].toFixed(1)}K dTeq=${b.tempHalfRangeK[9].toFixed(1)}K`);
  }
  console.log('# ' + report.join('\n# '));
  // Retrograde folding: 120 == 60, 180 == 0 (annual statistics and half-ranges).
  for (const [a, c] of [[120, 60], [180, 0]]) {
    const A = bases.get(a), C = bases.get(c);
    for (const key of ['qMean', 'qHalfRange', 'tempHalfRangeK']) {
      for (let k = 0; k < SEASON_BANDS; k++) assert.ok(Math.abs(A[key][k] - C[key][k]) < 1e-9, `${a} vs ${c} ${key}[${k}]`);
    }
  }
  // Poles beat the equator above ~54 deg (60, 90, 120), not below (0, 23.4, 180).
  for (const d of [60, 90, 120]) assert.ok(bases.get(d).qMean[18] > bases.get(d).qMean[9], `${d}`);
  for (const d of [0, 23.4, 180]) assert.ok(bases.get(d).qMean[18] < bases.get(d).qMean[9], `${d}`);
  // Polar seasons grow extreme with tilt: no polar cycle at 0, strongest at 90.
  assert.ok(bases.get(0).qHalfRange[18] < 1e-6 && bases.get(0).tempHalfRangeK[18] < 1e-6);
  assert.ok(bases.get(23.4).tempHalfRangeK[18] < bases.get(60).tempHalfRangeK[18]);
  assert.ok(bases.get(60).tempHalfRangeK[18] < bases.get(90).tempHalfRangeK[18]);
  // Earth-like reference (23.44 deg, circular): equator 1.221 x, pole 0.506 x the global mean.
  const earth = seasonBasis(body, sys, { axialTiltRad: 23.44 * DEG });
  assert.ok(Math.abs(earth.qMean[9] - 1.2214) < 2e-3 && Math.abs(earth.qMean[18] - 0.5064) < 2e-3);
  assert.ok(Math.abs(seasonalRangeAt(earth, 0).qMean - earth.qMean[9]) < 1e-15);
});

test('physics: catalogue crossover — effective obliquity above the ~54 deg crossover gives polar annual mean > equatorial', () => {
  // Crossover: sin(eps)/pi == (2/pi^2) E(sin eps).
  let lo = 40 * DEG, hi = 70 * DEG;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (Math.sin(m) / Math.PI < (2 / (Math.PI * Math.PI)) * ellipticE(Math.sin(m))) lo = m; else hi = m;
  }
  const crossover = lo / DEG;
  assert.ok(crossover > 53.5 && crossover < 54.7, `crossover ${crossover}`);
  let above = 0, below = 0;
  for (const { body, sys } of THE_CORPUS.planets) {
    const b = seasonBasis(body, sys);
    const eff = b.effectiveObliquityRad / DEG;
    // Annual means are hemispherically symmetric even with eccentricity (Kepler II).
    assert.ok(Math.abs(b.qMean[0] - b.qMean[18]) < 2e-3, `${body.id} N/S asymmetry ${b.qMean[0]} ${b.qMean[18]}`);
    if (eff > 54.7) { above++; assert.ok(Math.min(b.qMean[0], b.qMean[18]) > b.qMean[9], `${body.id} eff ${eff}`); }
    else if (eff < crossover - 0.5) { below++; assert.ok(Math.max(b.qMean[0], b.qMean[18]) < b.qMean[9], `${body.id} eff ${eff}`); }
  }
  console.log(`# crossover ${crossover.toFixed(3)} deg; catalogue planets above 54.7: ${above}, below: ${below} of ${THE_CORPUS.planets.length}`);
  assert.ok(above > 100 && below > 200);
});

test('physics: 23.4 deg tilt gives a solstice subsolar latitude of 23.4 deg +- the orbit inclination', () => {
  const nearCircular = THE_CORPUS.planets.filter((p) => p.sys.stars.length === 1 && p.body.orbit.e < 0.03).slice(0, 40);
  assert.ok(nearCircular.length >= 20);
  let worst = 0;
  for (const { body, sys } of nearCircular) {
    const b = seasonBasis(body, sys, { axialTiltRad: 23.4 * DEG });
    let maxLat = 0;
    for (let k = 0; k < 4096; k++) {
      const s = seasonAt(b, CATALOGUE_EPOCH_NS + (BigInt(k) * b.yearNs) / 4096n);
      maxLat = Math.max(maxLat, Math.abs(Math.asin(s.subsolarSinLat)) / DEG);
    }
    const inc = Math.abs(body.orbit.inclination) / DEG;
    assert.ok(inc <= 3.5);
    assert.ok(Math.abs(maxLat - 23.4) <= inc + 0.01, `${body.id}: solstice ${maxLat} inclination ${inc}`);
    assert.ok(Math.abs(maxLat - b.effectiveObliquityRad / DEG) < 0.01, `${body.id}: ${maxLat} vs effective ${b.effectiveObliquityRad / DEG}`);
    worst = Math.max(worst, Math.abs(maxLat - 23.4));
  }
  console.log(`# solstice subsolar latitude at 23.4 deg tilt: worst |delta| ${worst.toFixed(3)} deg over ${nearCircular.length} planets`);
});

test('temperature harmonics are the exact periodic solution of tau dT/dt = F - T (RK4 cross-check)', () => {
  const { body, sys } = synthetic({ e: 0.08, water: 0.6, temperatureK: 280, tag: 'ode' });
  const b = seasonBasis(body, sys, { axialTiltRad: 35 * DEG });
  const omegaTau = 2 * Math.PI / b.yearS * b.tauS;
  const amp = 0.6 * b.anchorTempK / 4;
  for (const band of [2, 9, 15, 18]) {
    const F = (th) => amp * 2 * (b.f1Re[band] * Math.cos(th) - b.f1Im[band] * Math.sin(th) + b.f2Re[band] * Math.cos(2 * th) - b.f2Im[band] * Math.sin(2 * th));
    const f = (th, T) => (F(th) - T) / omegaTau; // dT/dtheta
    let T = 0, th = 0;
    const steps = 4096, h = 2 * Math.PI / steps;
    for (let y = 0; y < 40; y++) for (let i = 0; i < steps; i++) {
      const k1 = f(th, T), k2 = f(th + h / 2, T + h * k1 / 2), k3 = f(th + h / 2, T + h * k2 / 2), k4 = f(th + h, T + h * k3);
      T += h * (k1 + 2 * k2 + 2 * k3 + k4) / 6; th += h;
    }
    // th is now 40 * 2 pi; compare one more year against the closed form.
    let maxErr = 0, scale = 0;
    for (let i = 0; i < steps; i++) {
      if (i % 64 === 0) {
        const phase01 = i / steps;
        const tNs = (BigInt(i) * b.yearNs) / BigInt(steps);
        const closed = seasonAt(b, tNs).tempAnomalyK[band];
        maxErr = Math.max(maxErr, Math.abs(closed - T));
        scale = Math.max(scale, Math.abs(closed));
        void phase01;
      }
      const k1 = f(th, T), k2 = f(th + h / 2, T + h * k1 / 2), k3 = f(th + h / 2, T + h * k2 / 2), k4 = f(th + h, T + h * k3);
      T += h * (k1 + 2 * k2 + 2 * k3 + k4) / 6; th += h;
    }
    assert.ok(maxErr < 1e-6 * Math.max(1, scale), `band ${band}: ${maxErr} K (scale ${scale})`);
  }
  // More water = more thermal inertia = smaller seasonal amplitude.
  const dry = seasonBasis(synthetic({ water: 0, tag: 'dry' }).body, synthetic({ water: 0, tag: 'dry' }).sys, { axialTiltRad: 35 * DEG });
  const wet = seasonBasis(synthetic({ water: 0.9, tag: 'wet' }).body, synthetic({ water: 0.9, tag: 'wet' }).sys, { axialTiltRad: 35 * DEG });
  assert.ok(wet.tempHalfRangeK[16] < dry.tempHalfRangeK[16]);
});

test('slowRotator flag and fauna season context', () => {
  for (const { body, sys } of THE_CORPUS.planets.slice(0, 100)) {
    const b = seasonBasis(body, sys);
    assert.equal(b.slowRotator, b.spinPeriodS / b.yearS > 0.1);
    assert.equal(seasonAt(b, 0n).slowRotator, b.slowRotator);
  }
  const { body, sys } = synthetic({ tag: 'fauna' });
  const b = seasonBasis(body, sys, { axialTiltRad: 23.4 * DEG });
  for (let k = 0; k < 16; k++) {
    const t = CATALOGUE_EPOCH_NS + (BigInt(k) * b.yearNs) / 16n;
    const ctx = faunaSeasonContext(b, t);
    assert.equal(ctx.version, SEASON_VERSION);
    assert.equal(ctx.yearNs, b.yearNs);
    const s = seasonAt(b, t);
    for (const lat of [-80, -45, 0, 30, 60, 89.9]) {
      const L = lat * DEG;
      const p = ctx.seasonPhase01(L), d = ctx.daylightFraction(L);
      assert.ok(p >= 0 && p < 1 && d >= 0 && d <= 1);
      assert.equal(ctx.tempAnomalyK(L), bandValueAt(s.tempAnomalyK, L));
    }
    assert.ok(Math.abs(ctx.daylightFraction(0) - 0.5) < 1e-9, 'equator: always 12 h');
    // The hemispheres are half a year out of phase.
    let dp = Math.abs(ctx.seasonPhase01(45 * DEG) - ctx.seasonPhase01(-45 * DEG));
    if (dp > 0.5) dp = 1 - dp;
    assert.ok(Math.abs(dp - 0.5) < 0.02, `phase gap ${dp}`);
    // Summer hemisphere has the longer day.
    if (s.subsolarSinLat > 0.1) assert.ok(ctx.daylightFraction(45 * DEG) > 0.5 && ctx.daylightFraction(-45 * DEG) < 0.5);
  }
  // Midsummer (0.5) in the north lags the solstice by the thermal lag.
  let best = null;
  for (let k = 0; k < 256; k++) {
    const t = (BigInt(k) * b.yearNs) / 256n;
    const T = seasonAt(b, t).tempAnomalyK[15];
    if (!best || T > best.T) best = { T, t };
  }
  const atPeak = faunaSeasonContext(b, best.t).seasonPhase01(60 * DEG);
  assert.ok(Math.abs(atPeak - 0.5) < 0.03, `warmest date reads as phase ${atPeak}`);
});

test('season sampling has no retained heap growth', async () => {
  setFlagsFromString('--expose-gc');
  const gc = runInNewContext('gc');
  const bodies = THE_CORPUS.planets.slice(0, 200);
  for (const { body, sys } of bodies.slice(0, 20)) seasonBasis(body, sys);
  for (let rep = 0; rep < 5; rep++) {
    clearSeasonBasisCache();
    for (const {body, sys} of bodies.slice(rep * 40, rep * 40 + 40)) seasonBasis(body, sys);
  }
  const b = seasonBasis(bodies[3].body, bodies[3].sys), out = createSeasonSample(), t = CATALOGUE_EPOCH_NS;
  for (let i = 0; i < 20000; i++) seasonAt(b, t + BigInt(i) * 1_000_000_007n, 0n, out);
  // Drain prior test reporting before sampling. No observer or await inside
  // the measured interval: retained reporter/GC-event objects are not season state.
  await new Promise(resolve => setImmediate(resolve));
  gc();
  const heap0 = process.memoryUsage().heapUsed, N = 20000;
  for (let rep = 0; rep < 5; rep++) {
    for (let i = 0; i < N; i++) seasonAt(b, t + BigInt(rep * N + i) * 1_000_000_007n, 0n, out);
  }
  gc();
  const heap1 = process.memoryUsage().heapUsed;
  console.log(`# retained season heap ${heap1 - heap0} B over ${5 * N} calls`);
  assert.ok(heap1 - heap0 < 256 * 1024, `retained ${heap1 - heap0} B`);
});

test('isolation: nothing in src imports season.ts or sun-frame.ts; season.ts has no three import', () => {
  const dir = new URL('../src/', import.meta.url);
  for (const f of readdirSync(dir)) {
    if (!/\.(ts|tsx|js|mjs)$/.test(f) || f === 'season.ts') continue;
    const src = readFileSync(new URL(f, dir), 'utf8');
    assert.doesNotMatch(src, /from\s+['"]\.\/(season|sun-frame)(\.ts)?['"]/, `${f} imports a W0-SEASON module`);
  }
  const season = readFileSync(new URL('season.ts', dir), 'utf8');
  assert.doesNotMatch(season, /from\s+['"]three['"]/);
  assert.doesNotMatch(season, /Math\.(pow|exp|log|asin|acos|atan2?)\(/);
});

test('Maithea fixture (LETHRA-001 G001/C2128,0,1/0/planet/1)', () => {
  const g = galaxies('LETHRA-001')[0];
  const sys = system(refByAddress(g, 'G001/C2128,0,1/0'));
  const body = sys.planets[1];
  assert.equal(body.id, 'G001/C2128,0,1/0/planet/1');
  const b = seasonBasis(body, sys);
  console.log(`# Maithea: tilt ${(b.axialTiltRad / DEG).toFixed(2)} deg (folded ${(b.obliquityRad / DEG).toFixed(2)}, effective ${(b.effectiveObliquityRad / DEG).toFixed(2)}), e=${body.orbit.e.toFixed(4)}, year ${(b.yearS / 86400).toFixed(1)} d, spin ${(b.spinPeriodS / 3600).toFixed(1)} h, slowRotator ${b.slowRotator}; qMean eq ${b.qMean[9].toFixed(3)} 45N ${bandValueAt(b.qMean, 45 * DEG).toFixed(3)} pole ${b.qMean[18].toFixed(3)}; dT half-range eq ${b.tempHalfRangeK[9].toFixed(1)} K, 60N ${b.tempHalfRangeK[15].toFixed(1)} K, 60S ${b.tempHalfRangeK[3].toFixed(1)} K`);
  assert.ok(b.effectiveObliquityRad < 54.7 * DEG && b.qMean[9] > b.qMean[18]);
  assert.ok(Math.abs(b.maxSubsolarLatRad - b.effectiveObliquityRad) < 0.002);
});
