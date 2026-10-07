// Structural terrain metric 2: 2-D power spectrum, lattice-peak check and per-octave anisotropy
// (docs/terrain-structural-metrics-2026-10-07.md section 1.2 and section 4; results and calibration:
// docs/terrain-structural-spectrum-2026-10-07.md). Helper: tests/helpers/terrain-spectrum.mjs (test-side, pure).
//
// Part 1, Tier 0 (HARD): detectors on synthetic fields with INJECTED defects. Clean isotropic fractal controls
// (spectral synthesis, transect beta about 2.2) must stay quiet; a 16 km block rhythm (smooth sinusoid, and a comb of
// trunk gutters) and fine 250 m stripes must fire. Thresholds were set by the repo's midpoint rule between the
// control maximum and the defect minimum on calibration seeds 1-16 (doc section 3); the tests below run FRESH seeds
// 101-108, so a pass is out-of-sample evidence that the separation holds.
//
// Part 2 (INFO, MEASURE-ONLY): the frozen tier-set tiles of the four water worlds (tests/tier-sets.json), rasters
// aligned with the M1 belt axis. Reports the lattice-peak ratio at the M3 carving block (CORE x 2w/ROWS) and the
// doc's nominal 16 km, the 200 m carving lattice and the 250 m gully cell, and the anisotropy per octave. No pin on
// the block rhythm: off-belt real tiles already reach the synthetic comb threshold (doc section 4), so a real-terrain
// gate needs a real eroded control first.
// Part 3 (HARD, mountain-carving-3, docs/fable-decision-carving-lattice-2026-10-07.md and
// docs/mountain-carving-c1-2026-10-07.md): the 200 m carving-lattice pin on the same frozen massif tiles (truth, fine
// rasters, pooled), at every tier, with the mountain-carving-2 triangle interpolant as its negative control. Tiers (O7, docs/fable-test-review-2026-10-07.md; decided by Fable 5.1 on Kasper's
// instruction): smoke = 24 tiles (axis/flank/belt-end/outside) and 4 synthetic seeds; work = default = the same 24
// tiles and 8 seeds; gate (test:full) = 36 tiles (+ face-edge and coast) and 8 seeds. Alpine charts: 1 at smoke, 2
// otherwise. Thresholds, titles and the INFO (measure-only) status never change with the tier.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fft2,powerSpectrum2D,latticeTargets,latticeStats,latticePeaks,poolWhitened,summarisePeaks,octaveAnisotropy,
  structuralSpectrum,alignedRaster,fractalField,addRhythm,addGutters,addBlockScaling,addStripes,freqIndex,
} from './helpers/terrain-spectrum.mjs';
import {syntheticSampler} from './helpers/mountain-metrics.mjs';
import {mountainSampler} from './helpers/mountain-coarse-tiles.mjs';
import {waterWorlds} from './terrain-climate-fixtures.mjs';
import {orogenLayout} from '../src/mountain-layout.ts';
import {MOUNTAIN_CARVING} from '../src/mountain-carving.ts';
import {MOUNTAIN_ASSEMBLY} from '../src/mountain-assembly.ts';
import {MOUNTAIN_ROCK_DETAIL} from '../src/mountain-rock-detail.ts';
import {rockDetailFromLevel} from '../src/lod-ladder.ts';
import {pick,samples,tierNote,TIER} from './helpers/tier.mjs';
import {triangleRasters} from './helpers/spectrum-triangle-worker.mjs';

// ---------- calibrated thresholds (synthetic, midpoint rule; doc section 3) ----------
// Coarse raster 512 x 200 m (102.4 km), 16 km rhythm at bin 6.4, harmonics 1-16. Calibration seeds 1-16:
//   clean maxPeakDb 1.92..6.09, combDb -0.86..1.33; 10% sinusoid min maxPeakDb 11.45; 2% gutter comb min combDb 4.19.
// Fine raster 256 x 50 m, octaves with >= 1000 bins (100-800 m): clean coherence max 0.150 (fractal seeds 1-16) and
//   0.190 (alpine, 4 charts); 250 m stripes at 30 deg with amplitude = the clean 200-400 m band RMS: min 0.285.
export const SPECTRUM_THRESHOLDS = Object.freeze({PEAK_DB: 8.75, COMB_DB: 2.75, FINE_COHERENCE: 0.24, FINE_MIN_BINS: 1000});
const T = SPECTRUM_THRESHOLDS;
const C = {n: 512, stepM: 200}, F = {n: 256, stepM: 50}, BLOCK_16K = 16000;
const SEEDS = Array.from({length: pick({smoke: 4, work: 8, default: 8, gate: 8})}, (_, i) => 101 + i);
const range = h => {let a = Infinity, b = -Infinity;for (const v of h) {if (v < a) a = v;if (v > b) b = v;}return b - a;};
const r2 = v => v === null || !Number.isFinite(v) ? v : Math.round(v * 100) / 100;
const T16 = latticeTargets('b16k', BLOCK_16K, {harmonics: 16});
const fine = an => an.filter(o => o.bins >= T.FINE_MIN_BINS);
const report = {tier: TIER, thresholds: T, synthetic: {}, real: {}};
test.after(() => console.log('SPECTRUM_ROWS ' + JSON.stringify(report)));

// ---------- Part 1: Tier 0 detectors ----------
test('HARD: fft2 round-trips; a periodic-Hann bin sinusoid keeps its variance in its 3x3; Parseval without window', () => {
  const n = 64, re = Float64Array.from({length: n * n}, (_, i) => Math.sin(i * .37) + (i % 7) * .1), im = new Float64Array(n * n), orig = re.slice();
  fft2(re, im, n);fft2(re, im, n, true);
  for (let i = 0; i < n * n; i++) {assert.ok(Math.abs(re[i] - orig[i]) < 1e-9);assert.ok(Math.abs(im[i]) < 1e-9);}
  const kx = 5, ky = 3, A = 2, h = new Float64Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) h[y * n + x] = A * Math.cos(2 * Math.PI * (kx * x + ky * y) / n);
  const plain = powerSpectrum2D(h, n, 10, {detrend: 'none', window: 'none'});
  assert.ok(Math.abs(plain.total - A * A / 2) < 1e-9);
  assert.ok(Math.abs(plain.P[ky * n + kx] - A * A / 4) < 1e-9);
  const hann = powerSpectrum2D(h, n, 10);let near = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {const fx = freqIndex(x, n), fy = freqIndex(y, n);
    if ((Math.abs(fx - kx) <= 1 && Math.abs(fy - ky) <= 1) || (Math.abs(fx + kx) <= 1 && Math.abs(fy + ky) <= 1)) near += hann.P[y * n + x];}
  assert.ok(Math.abs(near / hann.total - 1) < 1e-9, `3x3 share ${near / hann.total}`);
  // The tone estimate recovers the RMS height of a sinusoid on a quiet background.
  const peaks = latticePeaks(hann, latticeTargets('t', 10 * n / Math.hypot(kx, ky), {angleRad: Math.atan2(ky, kx)})).peaks;
  assert.ok(Math.abs(peaks[0].toneRmsM - A / Math.SQRT2) < 1e-6, `tone ${peaks[0].toneRmsM}`);
  assert.throws(() => powerSpectrum2D(new Float64Array(12), 3, 1), RangeError);
});

test('HARD: detectors are pure and deterministic (same input, same output; input untouched)', () => {
  const h = fractalField(F.n, F.stepM, {seed: 7}), copy = h.slice();
  const a = structuralSpectrum(h, F.n, F.stepM, latticeTargets('x', 400, {harmonics: 2})), b = structuralSpectrum(h, F.n, F.stepM, latticeTargets('x', 400, {harmonics: 2}));
  assert.deepEqual(h, copy);assert.deepEqual(a, b);
  assert.deepEqual(fractalField(64, 10, {seed: 3}), fractalField(64, 10, {seed: 3}));
});

const controls = SEEDS.map(seed => fractalField(C.n, C.stepM, {seed}));
const ctl = controls.map(h => structuralSpectrum(h, C.n, C.stepM, T16));
test('HARD: clean fractal controls stay quiet at the 16 km lattice (per tile maxPeakDb and combDb below threshold)', t => {
  t.diagnostic(tierNote(`${SEEDS.length} fresh seeds ${SEEDS[0]}..${SEEDS.at(-1)}`));
  report.synthetic.control = ctl.map((r, i) => ({seed: SEEDS[i], maxPeakDb: r2(r.maxPeakDb), peakAt: r.peakAt, combDb: r2(r.comb.b16k.combDb), maxLineDb: r2(r.maxLineDb), beta1D: r2(r.beta.beta1D)}));
  for (const row of report.synthetic.control) {
    t.diagnostic(JSON.stringify(row));
    assert.ok(row.maxPeakDb < T.PEAK_DB, `seed ${row.seed}: maxPeakDb ${row.maxPeakDb} >= ${T.PEAK_DB}`);
    assert.ok(row.combDb < T.COMB_DB, `seed ${row.seed}: combDb ${row.combDb} >= ${T.COMB_DB}`);
    assert.ok(row.beta1D > 2 && row.beta1D < 2.4, `control beta1D ${row.beta1D}`);
  }
});

test('HARD: injected 16 km block rhythm fires (10% sinusoid: peak; 2% trunk-gutter comb: comb) on every control', t => {
  const rows = controls.map((h, i) => {
    const s = structuralSpectrum(addRhythm(h, C.n, C.stepM, BLOCK_16K, .1 * range(h)), C.n, C.stepM, T16);
    const g = structuralSpectrum(addGutters(h, C.n, C.stepM, BLOCK_16K, .02 * range(h)), C.n, C.stepM, T16);
    return {seed: SEEDS[i], sinusoid10pctPeakDb: r2(s.maxPeakDb), sinusoidAt: s.peakAt, gutter2pctCombDb: r2(g.comb.b16k.combDb), gutter2pctPeakDb: r2(g.maxPeakDb)};
  });
  report.synthetic.defects = rows;
  for (const row of rows) {
    t.diagnostic(JSON.stringify(row));
    assert.ok(row.sinusoid10pctPeakDb >= T.PEAK_DB, `seed ${row.seed}: sinusoid peak ${row.sinusoid10pctPeakDb} < ${T.PEAK_DB}`);
    assert.equal(row.sinusoidAt, 'b16k h1');
    assert.ok(row.gutter2pctCombDb >= T.COMB_DB, `seed ${row.seed}: gutter comb ${row.gutter2pctCombDb} < ${T.COMB_DB}`);
  }
});

test('INFO: detection limits (1% sinusoid, 1% gutters, 10% block relief scaling per tile; pooled over the controls)', t => {
  // The design doc's "a 1% amplitude 16 km modulation must exceed the threshold" is NOT met per tile: at 16 km the
  // fractal background holds about as much power per bin as a 1%-of-relief sinusoid. Pooling the whitened spectra of
  // several tiles in the same orientation is the lever. Block relief scaling (seams whose step varies along the seam)
  // is invisible to the spectrum up to +-10%: that failure belongs to the seam probe (metric 1.3), not to this one.
  const pool = list => {const s = latticeStats(poolWhitened(list.map(r => r.W)), C.n, C.stepM, T16);return {...summarisePeaks(s.peaks), comb: s.comb.b16k.combDb};};
  const mk = fn => controls.map(h => structuralSpectrum(fn(h), C.n, C.stepM, T16));
  const cases = {
    control: ctl,
    sinusoid1pct: mk(h => addRhythm(h, C.n, C.stepM, BLOCK_16K, .01 * range(h))),
    sinusoid2pct: mk(h => addRhythm(h, C.n, C.stepM, BLOCK_16K, .02 * range(h))),
    gutter1pct: mk(h => addGutters(h, C.n, C.stepM, BLOCK_16K, .01 * range(h))),
    blockScale10pct: mk(h => addBlockScaling(h, C.n, C.stepM, BLOCK_16K, .1)),
  };
  report.synthetic.limits = Object.fromEntries(Object.entries(cases).map(([k, rs]) => {const p = pool(rs);
    return [k, {perTileMaxPeakDb: [r2(Math.min(...rs.map(r => r.maxPeakDb))), r2(Math.max(...rs.map(r => r.maxPeakDb)))],
      perTileCombDb: [r2(Math.min(...rs.map(r => r.comb.b16k.combDb))), r2(Math.max(...rs.map(r => r.comb.b16k.combDb)))],
      firesPerTile: rs.filter(r => r.maxPeakDb >= T.PEAK_DB || r.comb.b16k.combDb >= T.COMB_DB).length + '/' + rs.length,
      pooledMaxPeakDb: r2(p.maxPeakDb), pooledAt: p.peakAt, pooledCombDb: r2(p.comb)}];}));
  for (const [k, v] of Object.entries(report.synthetic.limits)) t.diagnostic(`${k}: ${JSON.stringify(v)}`);
  assert.ok(Object.values(report.synthetic.limits).every(v => Number.isFinite(v.pooledMaxPeakDb)));
});

test('HARD: injected fine stripes (250 m, 30 deg, amplitude = band RMS) fire the 200-400 m octave only; controls quiet', t => {
  const rows = [];
  for (const seed of SEEDS) {
    const h = fractalField(F.n, F.stepM, {seed, rmsM: 300}), clean = octaveAnisotropy(powerSpectrum2D(h, F.n, F.stepM)), bandClean = clean.find(o => o.loM === 200);
    const striped = octaveAnisotropy(powerSpectrum2D(addStripes(h, F.n, F.stepM, 250, bandClean.rmsM, Math.PI / 6), F.n, F.stepM));
    const band = striped.find(o => o.loM === 200);
    rows.push({seed, cleanFineMax: r2(Math.max(...fine(clean).map(o => o.coherence))), stripedCoherence: r2(band.coherence), stripedAngleDeg: Math.round(band.gradientAngleDeg), cleanRmsM: r2(bandClean.rmsM)});
    for (const o of fine(clean)) assert.ok(o.coherence < T.FINE_COHERENCE, `seed ${seed} ${o.band}: clean coherence ${o.coherence}`);
    assert.ok(band.coherence >= T.FINE_COHERENCE, `seed ${seed}: stripes coherence ${band.coherence}`);
    assert.ok(Math.abs(band.gradientAngleDeg - 30) < 5, `stripe angle ${band.gradientAngleDeg}`);
    for (const o of striped) if (o.loM !== 200) assert.ok(Math.abs(o.coherence - clean.find(c => c.loM === o.loM).coherence) < .02, `${o.band} moved`);
  }
  report.synthetic.stripes = rows;for (const r of rows) t.diagnostic(JSON.stringify(r));
});

test('INFO: the alpine ridged-noise control carries its own gradient-noise lattice (peaks at 2 km / 1 km)', t => {
  // mountain-metrics.mjs syntheticSampler('alpine') sums gradient noise on lattices of 64 km / 2^o. On a chart aligned
  // with that lattice the detector finds it: a natural positive, and the reason the alpine field is NOT used as a
  // clean lattice control here.
  const R = 5194907, rows = [];
  for (const d of pick({smoke: [[1, 0, 0]], default: [[1, 0, 0], [.6, .8, 0]]})) {
    const r = structuralSpectrum(alignedRaster(syntheticSampler(R, 'alpine'), d, R, C.n, C.stepM), C.n, C.stepM, T16);
    rows.push({d, maxPeakDb: r2(r.maxPeakDb), peakAt: r.peakAt, combDb: r2(r.comb.b16k.combDb), beta1D: r2(r.beta.beta1D)});
  }
  report.synthetic.alpine = rows;for (const r of rows) t.diagnostic(JSON.stringify(r));
  assert.ok(rows.every(r => Number.isFinite(r.maxPeakDb)));
});

// ---------- Part 2: real terrain, frozen tier-set tiles (INFO, measure-only) ----------
const LATTICE_M = 2 * MOUNTAIN_ASSEMBLY.CARVING_HALF_WIDTH_M / MOUNTAIN_CARVING.ROWS; // 200 m at w = 48 km
const BLOCK_M = MOUNTAIN_CARVING.CORE * LATTICE_M; // 25.6 km: one M3 memo block along the belt axis
const GULLY_M = MOUNTAIN_ROCK_DETAIL.GULLY_CELL_M;
const TC = [...latticeTargets('block', BLOCK_M, {harmonics: 16}), ...latticeTargets('nominal16k', BLOCK_16K, {harmonics: 8})];
const TF = [...latticeTargets('lattice-x', LATTICE_M), ...latticeTargets('lattice-y', LATTICE_M, {angleRad: Math.PI / 2}),
  ...latticeTargets('lattice-d', LATTICE_M * Math.SQRT1_2, {angleRad: Math.PI / 4}), ...latticeTargets('lattice-d2', LATTICE_M * Math.SQRT1_2, {angleRad: -Math.PI / 4}),
  ...latticeTargets('gully-x', GULLY_M, {harmonics: 2}), ...latticeTargets('gully-y', GULLY_M, {angleRad: Math.PI / 2, harmonics: 2})];
// O7: 24 tiles (4 worlds x axis x2, flank, belt-end x2, outside) at smoke, work and default; 36 tiles at gate only.
const KINDS_24 = ['axis', 'flank', 'belt-end', 'outside'];
const KINDS = pick({smoke: KINDS_24, work: KINDS_24, default: KINDS_24, gate: ['axis', 'flank', 'belt-end', 'face-edge', 'outside', 'coast']});
const MASSIF = new Set(['axis', 'flank', 'belt-end', 'face-edge']);
let tiles = null;
/** The frozen tiles with their fine 256 x 50 m rasters (truth). The coarse rasters are added by realTiles() on first use,
 * so the HARD lattice pin (fine rasters only) does not pay for them when it runs in a shard step of its own. The memo is
 * observationally pure, so the sampling order does not change a value. */
function fineTiles() {
  if (tiles) return tiles;
  tiles = [];
  for (const body of waterWorlds()) {
    const ts = mountainSampler(body), layout = orogenLayout(body), seen = new Set();
    for (const e of samples(body.name, KINDS)) {
      const key = e.d.join();if (seen.has(key)) continue;seen.add(key);
      const o = layout.sample(e.d), axis = o.belt > 0 ? [...o.axis] : null;
      const hf = alignedRaster(ts, e.d, body.radiusM, F.n, F.stepM, axis);
      tiles.push({body, ts, d: e.d, axis, world: body.name, kind: e.kind, massif: MASSIF.has(e.kind) && o.belt > 0, belt: r2(o.belt), hf,
        fine: structuralSpectrum(hf, F.n, F.stepM, TF)});
    }
  }
  return tiles;
}
function realTiles() {
  for (const x of fineTiles()) if (!x.hc) {
    x.hc = alignedRaster(x.ts, x.d, x.body.radiusM, C.n, C.stepM, x.axis);x.coarse = structuralSpectrum(x.hc, C.n, C.stepM, TC);
  }
  return tiles;
}
const famPeak = (r, fam) => {let best = null;for (const p of r.peaks) if (p.family === fam && p.inRange && (best === null || p.peakDb > best.peakDb)) best = p;return best;};

test('INFO: real tiles, coarse 512 x 200 m: no M3 block lattice peak (25.6 km block, nominal 16 km), per tile and pooled', t => {
  const all = realTiles();
  t.diagnostic(tierNote(`${all.length} tiles (${all.filter(x => x.massif).length} massif), kinds ${KINDS.join(',')}; block ${BLOCK_M} m = CORE ${MOUNTAIN_CARVING.CORE} x 2w/ROWS`));
  assert.ok(all.length >= 10 && all.length <= 50, `tile count ${all.length}`);
  const rows = all.map(x => {const b = famPeak(x.coarse, 'block'), n16 = famPeak(x.coarse, 'nominal16k');
    return {world: x.world, kind: x.kind, belt: x.belt, blockMaxPeakDb: r2(b.peakDb), blockAt: b.label, blockCombDb: r2(x.coarse.comb.block.combDb),
      nominal16kMaxPeakDb: r2(n16.peakDb), nominal16kCombDb: r2(x.coarse.comb.nominal16k.combDb), maxLineDb: r2(x.coarse.maxLineDb), beta1D: r2(x.coarse.beta.beta1D),
      overSyntheticThreshold: b.peakDb >= T.PEAK_DB || x.coarse.comb.block.combDb >= T.COMB_DB};});
  const m = all.filter(x => x.massif), ps = latticeStats(poolWhitened(m.map(x => x.coarse.W)), C.n, C.stepM, TC);
  const pooled = {tiles: m.length, blockCombDb: r2(ps.comb.block.combDb), nominal16kCombDb: r2(ps.comb.nominal16k.combDb),
    blockMaxPeakDb: r2(Math.max(...ps.peaks.filter(p => p.family === 'block' && p.inRange).map(p => p.peakDb))),
    blockHarmonicsDb: ps.peaks.filter(p => p.family === 'block' && p.inRange).map(p => r2(p.peakDb))};
  report.real.coarse = {rows, pooledMassif: pooled};
  for (const r of rows) t.diagnostic(JSON.stringify(r));
  t.diagnostic('pooled massif ' + JSON.stringify(pooled));
  assert.ok(rows.every(r => Number.isFinite(r.blockMaxPeakDb) && Number.isFinite(r.blockCombDb)));
});

test('INFO: real tiles + injected 25.6 km defects (calibration on the real background)', t => {
  // The same detectors on the real coarse rasters with a 10% sinusoid and a 2% gutter comb at the block length added.
  const rows = realTiles().filter(x => x.massif).map(x => {
    const s = structuralSpectrum(addRhythm(x.hc, C.n, C.stepM, BLOCK_M, .1 * range(x.hc)), C.n, C.stepM, TC);
    const g = structuralSpectrum(addGutters(x.hc, C.n, C.stepM, BLOCK_M, .02 * range(x.hc)), C.n, C.stepM, TC);
    return {world: x.world, kind: x.kind, clean: [r2(famPeak(x.coarse, 'block').peakDb), r2(x.coarse.comb.block.combDb)],
      sinusoid10pctPeakDb: r2(famPeak(s, 'block').peakDb), gutter2pctCombDb: r2(g.comb.block.combDb)};
  });
  const fired = rows.filter(r => r.sinusoid10pctPeakDb >= T.PEAK_DB).length, firedG = rows.filter(r => r.gutter2pctCombDb >= T.COMB_DB).length;
  report.real.injected = {rows, sinusoidFires: `${fired}/${rows.length}`, gutterFires: `${firedG}/${rows.length}`};
  for (const r of rows) t.diagnostic(JSON.stringify(r));
  t.diagnostic(`fires: sinusoid ${fired}/${rows.length}, gutters ${firedG}/${rows.length}`);
  assert.ok(rows.length > 0);
});

test('INFO: real tiles, fine 256 x 50 m: 200 m carving-lattice and 250 m gully-cell peaks; anisotropy per octave', t => {
  const all = realTiles();
  const rows = all.map(x => {const f = x.fine;const lat = ['lattice-x', 'lattice-y', 'lattice-d', 'lattice-d2'].map(k => famPeak(f, k));
    return {world: x.world, kind: x.kind, massif: x.massif, latticePeakDb: lat.map(p => r2(p.peakDb)), latticeToneRmsM: lat.map(p => r2(p.toneRmsM)),
      gullyPeakDb: ['gully-x', 'gully-y'].map(k => r2(famPeak(f, k).peakDb)), rmsM: r2(f.rmsM),
      coarseCoherence: Object.fromEntries(x.coarse.anisotropy.map(o => [o.band, r2(o.coherence)])),
      fineCoherence: Object.fromEntries(f.anisotropy.map(o => [o.band, r2(o.coherence)]))};});
  const pool = (sel) => {const s = latticeStats(poolWhitened(sel.map(x => x.fine.W)), F.n, F.stepM, TF);return Object.fromEntries(Object.entries(s.comb).map(([k, v]) => [k, r2(v.combDb)]));};
  const m = all.filter(x => x.massif), off = all.filter(x => !x.massif);
  report.real.fine = {rows, pooledMassif: pool(m), pooledOffBelt: off.length ? pool(off) : null};
  for (const r of rows) t.diagnostic(JSON.stringify(r));
  t.diagnostic('pooled massif ' + JSON.stringify(report.real.fine.pooledMassif) + ' | pooled off-belt ' + JSON.stringify(report.real.fine.pooledOffBelt));
  assert.ok(rows.every(r => r.latticePeakDb.every(Number.isFinite)));
});

// ---------- Part 3: the 200 m carving-lattice pin (HARD, mountain-carving-3) ----------
// PRE-REGISTERED (docs/fable-decision-carving-lattice-2026-10-07.md, before the Catmull-Rom field was measured) by the
// midpoint rule on doc section 3.2 (smoke tiles, truth): control max 1.58 dB (pooled off-belt, max over the four lattice
// families) and defect min 7.84 dB (pooled massif, mountain-carving-2 triangle lattice): (1.58 + 7.84) / 2 = 4.71 -> 4.7.
export const LATTICE_PIN_DB = 4.7;
const LATTICE_FAMILIES = ['lattice-x', 'lattice-y', 'lattice-d', 'lattice-d2'], GULLY_FAMILIES = ['gully-x', 'gully-y'];
/** Pooled whitened spectrum of fine rasters' W: per family the largest in-range harmonic peakDb, and the overall max. */
function pooledFamilies(Ws, families) {
  const st = latticeStats(poolWhitened(Ws), F.n, F.stepM, TF), per = {};
  for (const f of families) per[f] = r2(Math.max(...st.peaks.filter(p => p.family === f && p.inRange).map(p => p.peakDb)));
  return {per, max: Math.max(...Object.values(per))};
}
test('HARD: 200 m carving lattice: pooled massif max lattice-x/y/d/d2 peakDb <= 4.7 dB on the truth; the triangle reference exceeds it; 250 m gully cell < 4.7 dB', async t => {
  const m = fineTiles().filter(x => x.massif);
  t.diagnostic(tierNote(`${m.length} frozen massif tiles (truth, fine 256 x 50 m, aligned with the belt axis), lattice ${LATTICE_M} m`));
  assert.ok(m.length >= 10, `massif tile count ${m.length}`);
  const truth = pooledFamilies(m.map(x => x.fine.W), LATTICE_FAMILIES), gully = pooledFamilies(m.map(x => x.fine.W), GULLY_FAMILIES);
  // Negative control: the same tiles with main's semantics on the same block data (worker): the carving height AND
  // the M5 rock driver triangle-interpolated (mountain-carving-2 / mountain-assembly-3).
  const ref = await triangleRasters(m.map(x => ({world: x.world, d: x.d, axis: x.axis})), F.n, F.stepM);
  assert.equal(ref.interpolant, 'triangle');assert.equal(ref.rasters.length, m.length);
  const triangle = pooledFamilies(ref.rasters.map(h => structuralSpectrum(h, F.n, F.stepM, TF).W), LATTICE_FAMILIES);
  // INFO: the row with rock off (tile level rockDetailFromLevel - 1: exact M3 carving, no M5 rock detail).
  // INFO: rock alone (truth - rock off): the M5 term, driven by the smoothed carving (mountain-assembly-4).
  const off = m.map(x => alignedRaster(mountainSampler(x.body, rockDetailFromLevel(x.body.radiusM) - 1), x.d, x.body.radiusM, F.n, F.stepM, x.axis));
  const rockOff = pooledFamilies(off.map(h => structuralSpectrum(h, F.n, F.stepM, TF).W), LATTICE_FAMILIES);
  const rockAlone = pooledFamilies(m.map((x, i) => structuralSpectrum(x.hf.map((v, j) => v - off[i][j]), F.n, F.stepM, TF).W), LATTICE_FAMILIES);
  report.real.latticePin = {class: 'HARD', pinDb: LATTICE_PIN_DB, tiles: m.length, truth, triangleControl: triangle, gully,
    INFO: {rockOff, rockAlone, triangleWorkerBuilds: ref.builds}};
  t.diagnostic('lattice pin ' + JSON.stringify(report.real.latticePin));
  assert.ok(truth.max <= LATTICE_PIN_DB, `truth pooled lattice peak ${truth.max} dB > ${LATTICE_PIN_DB} (${JSON.stringify(truth.per)})`);
  assert.ok(triangle.max > LATTICE_PIN_DB, `negative control: the triangle reference must exceed ${LATTICE_PIN_DB} dB, got ${triangle.max}`);
  assert.ok(gully.max < LATTICE_PIN_DB, `250 m gully cell pooled peak ${gully.max} dB >= ${LATTICE_PIN_DB}`);
});
