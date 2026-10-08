// lod-ladder-4 riser reduction on the M5 element fixture (docs/mountain-riser-lod-2026-10-07.md section 4c, F1-F5).
// rockDetailM(..., seed, riserWidthM) with the widths the ladder hands Maithea's filtered levels (2 x edge / 32 at
// L10..L13) plus a stress width (2 x the L10 width). Synthetic fixture only (tests/helpers/mountain-rock-detail-fixture.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as M from '../src/mountain-rock-detail.ts';
import {rockDetailFromLevel, riserSharpFromLevel, rockRiserWidthM, RISER_REDUCTION} from '../src/lod-ladder.ts';
import {TUNING, GATE, base, slope, offset} from './helpers/mountain-rock-detail-fixture.mjs';
import {waterWorlds} from './terrain-climate-fixtures.mjs';

const C = M.MOUNTAIN_ROCK_DETAIL, ROCK_DETAIL_DIGEST = 'c1cd74f8f82d1b2fb8699337b4736a50bf2770515590eb987045dc4e55b34577';
const Maithea = waterWorlds().find(b => b.name === 'Maithea'), R = Maithea.radiusM;
const LEVELS = Array.from({length: riserSharpFromLevel(R) - rockDetailFromLevel(R)}, (_, i) => rockDetailFromLevel(R) + i);
const WIDTHS = [...LEVELS.map(L => rockRiserWidthM(R, L)), 2 * rockRiserWidthM(R, rockDetailFromLevel(R))]; // L10 .. L13, then stress
const BY_WIDTH = [...WIDTHS].sort((a, b) => a - b);
const report = {widths: WIDTHS};
test.after(() => console.log('RISER_ROWS ' + JSON.stringify(report)));
const at = (seed, x, y, width) => {
  const h = base(x, y, seed);
  return M.rockDetailM(x + offset(seed), y, h, base(x + 125, y, seed), base(x, y + 125, seed), M.rockDetailSeed(seed), width);
};
const samples = function* (seeds) {for (const seed of seeds) for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) yield [seed, -20000 + i * 634.62, -19500 + j * 614.14];};

test('ladder: Maithea filtered levels L10..L13, sharp from L14, widths 2 x edge / 32', () => {
  assert.deepEqual(LEVELS, [10, 11, 12, 13]);assert.equal(RISER_REDUCTION.widthCells, 2);
  assert.equal(RISER_REDUCTION.sharpMaxSpacingM, C.BENCH_FALL * C.STRATA_PERIOD_M / (2 * C.SLOPE_FULL_TAN));
  for (let k = 1; k < LEVELS.length; k++) assert.ok(WIDTHS[k] < WIDTHS[k - 1]);
  assert.ok(WIDTHS[LEVELS.length - 1] / 2 > RISER_REDUCTION.sharpMaxSpacingM && rockRiserWidthM(R, 14) === 0 && rockRiserWidthM(R) === 0 && rockRiserWidthM(R, 9) === 0);
  report.ladder = {levels: LEVELS, widthsM: WIDTHS};
});

test('F1: width 0 and every width with w <= BENCH_FALL reproduce v1 exactly; ROCK_DETAIL_DIGEST unchanged', async () => {
  const {digest} = await import('./helpers/mountain-rock-detail-digest.mjs');
  assert.equal(digest(M.rockDetailM), ROCK_DETAIL_DIGEST);
  for (const [label, seeds] of [['tuning', TUNING], ['gate', GATE]]) {
    let n = 0, small = 0, bad = 0;
    for (const [seed, x, y] of samples(seeds)) {
      const v1 = at(seed, x, y), s = slope(x, y, seed);n++;
      if (!Object.is(at(seed, x, y, 0), v1)) bad++;
      for (const w of WIDTHS) if (w * s / C.STRATA_PERIOD_M <= C.BENCH_FALL) {small++;if (!Object.is(at(seed, x, y, w), v1)) bad++;}
    }
    report[`F1_${label}`] = {samples: n, smallWidthCases: small, mismatches: bad};
    assert.equal(bad, 0);assert.ok(small > 0);
  }
});

test('F2/F3: v1 <= filtered <= 0 and coarser width >= finer width, exactly; non-vacuous', () => {
  for (const [label, seeds] of [['tuning', TUNING], ['gate', GATE]]) {
    let n = 0, f2 = 0, f3 = 0, raised = 0;
    for (const [seed, x, y] of samples(seeds)) {
      const v1 = at(seed, x, y), vs = BY_WIDTH.map(w => at(seed, x, y, w));n++;
      for (const v of vs) {if (!(v1 <= v && v <= 0) || Object.is(v, -0)) f2++;}
      for (let k = 1; k < vs.length; k++) if (!(vs[k] >= vs[k - 1])) f3++;   // BY_WIDTH ascending: vs[k] is the wider width
      if (vs.some(v => v > v1)) raised++;
    }
    report[`F23_${label}`] = {samples: n, f2Violations: f2, f3Violations: f3, raised};
    assert.equal(f2, 0);assert.equal(f3, 0);assert.ok(raised > 0, 'the reduction is active (negative control)');
  }
});

// F4: fall-line climb. 1 m steps up the carved gradient from 64 quasi-random starts per seed (3000 steps); a step counts
// where the carved slope >= SLOPE_ZERO_TAN and the step climbs >= 0.9 of its gradient; a reversal is a counted step on
// which carved + rock does not rise. HARD on GATE: no filtered width reverses more often than the truth (width 0).
function reversals(seeds, width) {
  let steps = 0, rev = 0, min = Infinity;
  for (const seed of seeds) {
    const rs = M.rockDetailSeed(seed), h = (x, y) => {const c = base(x, y, seed);return c + M.rockDetailM(x + offset(seed), y, c, base(x + 125, y, seed), base(x, y + 125, seed), rs, width);};
    for (let k = 0; k < 64; k++) {
      let x = -8000 + 16000 * ((k * 0.6180339887) % 1), y = -26000 + 52000 * ((k * 0.7548776662) % 1);
      for (let step = 0; step < 3000; step++) {
        const c = base(x, y, seed), gx = base(x + .5, y, seed) - base(x - .5, y, seed), gy = base(x, y + .5, seed) - base(x, y - .5, seed), g = Math.hypot(gx, gy);
        if (!(g > 1e-9)) break;
        const nx = x + gx / g, ny = y + gy / g, dc = base(nx, ny, seed) - c;
        if (g >= C.SLOPE_ZERO_TAN && dc >= .9 * g) {const r = (h(nx, ny) - h(x, y)) / dc;steps++;if (r <= 0) rev++;min = Math.min(min, r);}
        x = nx;y = ny;
      }
    }
  }
  return {steps, reversals: rev, minRatio: min};
}
test('F4: uphill reversals at every filtered width <= the truth (GATE seeds)', () => {
  const truth = reversals(GATE, 0), rows = WIDTHS.map(w => ({widthM: w, ...reversals(GATE, w)}));
  report.F4_gate = {truth, rows};
  assert.ok(truth.steps > 100000);
  for (const r of rows) assert.ok(r.reversals <= truth.reversals, `width ${r.widthM}: ${r.reversals} > ${truth.reversals}`);
});

// F5: HARD 7's straddle (6000 pairs 0.01 m apart, lattice and apex crossings) at every filtered width, against HARD 7's
// own analytic L_MAX (the same expression, checked textually against tests/mountain-rock-detail.test.mjs).
const gradL = 2 * Math.SQRT2 * 1.03 / 125, eL = gradL / C.SLOPE_ZERO_TAN;
const kernelL = C.PROFILE_MAX_SLOPE * (1 / C.GULLY_HALF_LENGTH_M + 1 / C.GULLY_HALF_WIDTH_M) * (1 + Math.hypot(C.GULLY_HALF_LENGTH_M, C.GULLY_HALF_WIDTH_M) * eL);
const L_MAX = .515 + C.KAPPA * C.GULLY_HALF_LENGTH_M * gradL + C.MAX_DEPTH_M * (1.5 / (C.SLOPE_FULL_TAN - C.SLOPE_ZERO_TAN) * gradL + C.STRATA_WEIGHT * Math.max(1 / C.BENCH_RISE, 1 / C.BENCH_FALL) / C.STRATA_PERIOD_M * 1.03 + C.RIB_WEIGHT * kernelL);
function straddle(width, seeds) {
  let max = 0;
  for (let i = 0; i < 6000; i++) {
    const seed = seeds[i % 8], a = i * 2.399963229728653, dx = .01 * Math.cos(a), dy = .01 * Math.sin(a);let x = (i * 7919 % 400000) - 200000, y = (i * 3571 % 39000) - 19500;
    if (i % 3 === 0) {const cell = i % 2 ? C.GULLY_CELL_M : 31.25;x = Math.round((x + offset(seed)) / cell) * cell - offset(seed) - dx / 2;}
    if (i % 7 === 0) {const t = i % 2 ? .5 : .095;x = 4000 * (Math.floor((x + offset(seed)) / 4000) + t) - offset(seed) - 180 * Math.sin(y / 6000 + (seed - 730500) * .7) - dx / 2;}
    max = Math.max(max, Math.abs(at(seed, x + dx, y + dy, width) - at(seed, x, y, width)));
  }
  return max;
}
test('F5: continuity at every filtered width <= HARD 7 L_MAX x 0.01 (TUNING and GATE)', () => {
  const src = readFileSync(new URL('./mountain-rock-detail.test.mjs', import.meta.url), 'utf8').replace(/\s/g, '');
  assert.ok(src.includes('constL_MAX=.515+C.KAPPA*C.GULLY_HALF_LENGTH_M*gradL+C.MAX_DEPTH_M*(1.5/(C.SLOPE_FULL_TAN-C.SLOPE_ZERO_TAN)*gradL+C.STRATA_WEIGHT*Math.max(1/C.BENCH_RISE,1/C.BENCH_FALL)/C.STRATA_PERIOD_M*1.03+C.RIB_WEIGHT*kernelL);'), 'L_MAX is HARD 7\'s expression');
  report.F5 = {L_MAX, limitM: L_MAX * .01, rows: []};
  for (const w of [0, ...WIDTHS]) {
    const row = {widthM: w, tuning: straddle(w, TUNING), gate: straddle(w, GATE)};report.F5.rows.push(row);
    assert.ok(row.tuning <= L_MAX * .01 && row.gate <= L_MAX * .01, JSON.stringify(row));
  }
});
