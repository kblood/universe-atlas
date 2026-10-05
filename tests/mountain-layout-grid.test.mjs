// HARD. M1 massif-band rejection grid (mountains cost plan T1, docs/mountains-opus-decisions-2026-10-05.md Q2;
// docs/mountain-layout-v1.md "Band rejection grid"). The grid is value-preserving: sampleWithinWithA0 must equal
// sampleWithA0 filtered to the band (belt !== 0, halfWidthM >= minHalfWidthM, |axisDistanceM| < maxDistM) field
// for field, signed zeros included, and must never leave a band direction in an unflagged cell.
// Cost (outside-massif branch, grid build ms) is measured by scripts/mountain-layout-grid.mjs, not here.
import test from 'node:test';
import assert from 'node:assert/strict';
import {galaxies, sector, system, noise} from '../src/catalog.ts';
import {orogenLayout, continentalA0, bandGridFlaggedCells, OROGEN_LAYOUT_VERSION} from '../src/mountain-layout.ts';
import {MASSIF_ENVELOPE, massifEnvelopeM, composeRidgeTermM} from '../src/mountain-envelope.ts';
import {massifBeltSample, mountainRidgeTermM} from '../src/mountain-assembly.ts';
import {waterWorlds, fib} from './terrain-climate-fixtures.mjs';

const MAX = MASSIF_ENVELOPE.MAX_HALF_WIDTH_M, MIN = MASSIF_ENVELOPE.MIN_HALF_WIDTH_M;
const empty = () => ({belt: 0, axis: [0, 0, 0], axisDistanceM: 0, halfWidthM: 0, beltIndex: -1, alongM: 0});
const unit = v => {const l = Math.hypot(...v); return v.map(x => x / l);};
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const FIELDS = ['belt', 'axisDistanceM', 'halfWidthM', 'beltIndex', 'alongM'];
const same = (a, b) => FIELDS.every(f => Object.is(a[f], b[f])) && [0, 1, 2].every(j => Object.is(a.axis[j], b.axis[j]));
const inBand = (o, max, min) => o.belt !== 0 && o.halfWidthM >= min && Math.abs(o.axisDistanceM) < max;

// The four water worlds and the M1 corpus (scripts/mountain-render.mjs: 10 bodies per catalogue type, worlds excluded).
const worlds = waterWorlds();
function corpusBodies() {
  const refs = [];
  for (const g of galaxies('LETHRA-GOLDEN-001').slice(0, 3))
    for (const c of [[266, 0, 0], [0, 0, 0], [-2, -1, -2], [12, -4, 7]]) refs.push(...sector(g, c).refs);
  const all = refs.slice(0, 220).map(system).flatMap(s => [...s.planets, ...s.moons]), pick = [];
  for (const type of [...new Set(all.map(b => b.type))]) pick.push(...all.filter(b => b.type === type).slice(0, 10));
  const corpus = pick.filter(b => !worlds.some(w => w.id === b.id)).slice(0, 60);
  assert.equal(corpus.length, 60);
  return corpus;
}

// The belt's displaced centreline (src/mountain-layout.ts offset/centreline, restated here).
const offsetM = (b, u) => {const v = u / b.uLimit; return b.bendM * v * v + b.amplitudeM * (2 * noise(u * 2 / b.wavelength + 13, 37, 19, b.noiseSeed) - 1);};
function centrelinePoint(b, u, R) {
  const y = offsetM(b, u) / R, r = Math.sqrt(1 - y * y), den = 1 + u * u, x = r * 2 * u / den, z = r * (1 - u * u) / den;
  return [0, 1, 2].map(j => x * b.tangent[j] + z * b.centre[j] + y * b.pole[j]);
}
// Directions concentrated at the band edge: for every belt the band admits, stations on the displaced
// centreline, a transverse offset refined (secant on sampleWithA0's own distance, coast gate open) until the
// distance to that belt is the edge (maxDistM, or the belt's half-width), then a pair just inside / just
// outside it. Returns the directions and, for the maxDistM edge, the number of pairs that straddle it.
function edgeDirections(layout, R, max, min, perBelt) {
  const dirs = [];
  let pairs = 0, straddling = 0;
  for (const [i, b] of layout.belts.entries()) {
    if (b.halfWidthM < min) continue;
    for (let k = 0; k < perBelt; k++) {
      const u = ((k + .5) / perBelt * 2 - 1) * b.uLimit * .98;
      const p = centrelinePoint(b, u, R), q = centrelinePoint(b, u + 1e-5, R);
      const across = unit(cross(p, unit(q.map((v, j) => v - p[j]))));
      const at = r => unit(p.map((v, j) => v + across[j] * Math.tan(r / R)));
      const edge = [max, Math.min(max, b.halfWidthM), b.halfWidthM][k % 3], sign = k % 2 ? 1 : -1;
      let r = edge;
      for (let it = 0; it < 4; it++) {
        const s = layout.sampleWithA0(at(sign * r), 1e9);
        if (s.belt === 0 || s.beltIndex !== i) break;
        r += edge - Math.abs(s.axisDistanceM);
      }
      const delta = [.01, 1, 50][(k >> 1) % 3], inner = at(sign * (r - delta)), outer = at(sign * (r + delta));
      dirs.push(inner, outer);
      if (k % 3 === 0) {
        pairs++;
        const a = layout.sampleWithA0(inner, 1e9), c = layout.sampleWithA0(outer, 1e9);
        if (a.beltIndex === i && Math.abs(a.axisDistanceM) < max && !(c.beltIndex === i && Math.abs(c.axisDistanceM) < max)) straddling++;
      }
    }
  }
  return Object.assign(dirs, {pairs, straddling});
}

function check(body, dirs, max, min, label) {
  const layout = orogenLayout(body), a0 = continentalA0(body), out = empty(), ref = empty();
  let positives = 0, unflaggedBand = 0, mismatches = 0, first = null;
  for (const d of dirs) {
    const alt = a0(d);
    // Reference: sampleWithA0 filtered to the band.
    layout.sampleWithA0(d, alt, ref);
    if (!inBand(ref, max, min)) Object.assign(ref, empty());
    const got = layout.sampleWithinWithA0(d, alt, max, out, min);
    assert.equal(got, out);
    if (!same(got, ref)) {mismatches++; first ??= {d, got: {...got, axis: [...got.axis]}, ref: {...ref, axis: [...ref.axis]}};}
    if (ref.belt !== 0) positives++;
    // Conservativeness, alt-independent: the geometric band (coast gate open) never lies in an unflagged cell,
    // and the whole lookup chain (voxel, coarse, fine, word tag, beyondChord) keeps it: with the coast gate
    // open sampleWithinWithA0 still equals the filtered sampleWithA0 (ocean directions included).
    const geometric = layout.sampleWithA0(d, 1e9, empty());
    if (!inBand(geometric, max, min)) Object.assign(geometric, empty());
    else if (!layout.bandCellFlagged(d, max, min)) unflaggedBand++;
    if (!same(layout.sampleWithinWithA0(d, 1e9, max, out, min), geometric)) {mismatches++; first ??= {d, open: true};}
  }
  assert.equal(mismatches, 0, `${label}: ${mismatches} mismatches, first ${JSON.stringify(first)}`);
  assert.equal(unflaggedBand, 0, `${label}: ${unflaggedBand} band directions in unflagged cells`);
  return positives;
}

test('HARD: version and API unchanged by the grid (output-neutral; orogen-layout-2 since cost plan T2)', () => {
  assert.equal(OROGEN_LAYOUT_VERSION, 'orogen-layout-2');
  const l = orogenLayout(worlds[0]);
  assert.equal(typeof l.sample, 'function'); assert.equal(typeof l.sampleWithA0, 'function');
  assert.equal(typeof l.sampleWithinWithA0, 'function');
});

test('HARD: 4 water worlds x 102,500 Fibonacci + band-edge offsets: sampleWithinWithA0 == filtered sampleWithA0, 0 unflagged band directions', () => {
  for (const w of worlds) {
    const layout = orogenLayout(w);
    const fibs = Array.from({length: 102500}, (_, i) => fib(i, 102500));
    const positives = check(w, fibs, MAX, MIN, w.name);
    const edge = edgeDirections(layout, w.radiusM, MAX, MIN, 120);
    const edgePositives = check(w, edge, MAX, MIN, `${w.name} edge`);
    console.log(`GRID ${w.name}: N=${layout.bandGrid(MAX, MIN).faceCells}, ${positives} in-band of 102500, edge ${edgePositives} in-band of ${edge.length}, ${edge.straddling}/${edge.pairs} pairs straddle 48 km`);
    assert.ok(positives > 500, `${w.name}: the Fibonacci set must exercise the band (${positives})`);
    assert.ok(edgePositives > edge.length / 10 && edgePositives < edge.length * .9, `${w.name}: edge set must straddle the band (${edgePositives}/${edge.length})`);
    assert.ok(edge.straddling >= edge.pairs / 2, `${w.name}: ${edge.straddling}/${edge.pairs} pairs straddle the 48 km edge`);
  }
});

test('HARD: negative control: a grid stamped for a narrower band leaves band directions unflagged (the check has teeth)', () => {
  const w = worlds[0], layout = orogenLayout(w), a0 = continentalA0(w), narrow = layout.bandGrid(.8 * MAX, MIN);
  let missed = 0;
  for (let i = 0; i < 102500; i++) {
    const d = fib(i, 102500);
    if (!inBand(layout.sampleWithA0(d, 1e9), MAX, MIN)) continue;
    const idx = layout.bandCellIndex(d, narrow.faceCells);
    if (!(narrow.bits[idx >>> 5] & (1 << (idx & 31)))) missed++;
  }
  assert.ok(missed > 20, `${missed} band directions unflagged by the 0.8 x grid`);
});

test('HARD: coarse summary covers every flagged cell, and the word tags agree with the bits, at N = 256..2048', () => {
  const layout = orogenLayout(worlds[0]);
  for (const N of [256, 512, 1024, 2048]) {
    const g = layout.bandGrid(MAX, MIN, N), Nc = N >>> 3, W = N >>> 5;
    assert.equal(g.bits.length, 6 * N * W); assert.equal(g.coarse.length, (6 * Nc * Nc + 31) >>> 5);
    let flagged = 0;
    for (let w = 0; w < g.bits.length; w++) {
      const v = g.bits[w];
      assert.equal(v === 0, g.wordBelt[w] === 0, `N=${N} word ${w}: tag ${g.wordBelt[w]} for bits ${v}`);
      if (!v) continue;
      const face = Math.floor(w / (N * W)), j = Math.floor(w / W) % N, i0 = (w % W) * 32;
      for (let b = 0; b < 32; b++) {
        if (!((v >>> b) & 1)) continue;
        flagged++;
        const c = (face * Nc + (j >>> 3)) * Nc + ((i0 + b) >>> 3);
        assert.ok(g.coarse[c >>> 5] & (1 << (c & 31)), `N=${N}: flagged cell (${face},${j},${i0 + b}) has an unset coarse bit`);
      }
    }
    assert.ok(flagged > 0);
  }
});

test('HARD: other band parameters (16 km / no width gate, 48 km / no width gate) on two worlds', () => {
  for (const w of [worlds[0], worlds[2]]) {
    const fibs = Array.from({length: 20000}, (_, i) => fib(i, 20000));
    for (const [max, min] of [[16000, 0], [MAX, 0]]) check(w, fibs, max, min, `${w.name} ${max}/${min}`);
  }
});

test('HARD: 60 corpus bodies x 20,000 directions + band-edge offsets: identical and conservative', () => {
  let bodies = 0, withBand = 0;
  for (const body of corpusBodies()) {
    const layout = orogenLayout(body);
    const fibs = Array.from({length: 20000}, (_, i) => fib(i, 20000));
    const p = check(body, fibs, MAX, MIN, body.name);
    if (layout.belts.length) check(body, edgeDirections(layout, body.radiusM, MAX, MIN, 24), MAX, MIN, `${body.name} edge`);
    bodies++; if (p > 0) withBand++;
  }
  assert.equal(bodies, 60);
  assert.ok(withBand >= 10, `${withBand} corpus bodies exercise the band`);
});

test('HARD: flagged area <= 1.5 x massif (band) area per world', () => {
  // Area fractions by 102,500 Fibonacci directions (equal-area). Massif = in-band land (what the cost script
  // calls in-massif); geometric band = in-band with the coast gate open (the grid cannot see land).
  for (const w of worlds) {
    const layout = orogenLayout(w), a0 = continentalA0(w), n = 102500;
    let massif = 0, geo = 0, flagged = 0, flaggedLand = 0;
    for (let i = 0; i < n; i++) {
      const d = fib(i, n), alt = a0(d), f = layout.bandCellFlagged(d, MAX, MIN);
      if (alt > 0 && inBand(layout.sampleWithA0(d, alt), MAX, MIN)) massif++;
      if (inBand(layout.sampleWithA0(d, 1e9), MAX, MIN)) geo++;
      if (f) {flagged++; if (alt > 0) flaggedLand++;}
    }
    const g = layout.bandGrid(MAX, MIN);
    console.log(`GRID AREA ${w.name}: N=${g.faceCells} cells ${bandGridFlaggedCells(g)} nodes ${g.nodes}; massif ${(100 * massif / n).toFixed(3)}%, geometric band ${(100 * geo / n).toFixed(3)}%, flagged ${(100 * flagged / n).toFixed(3)}% (land ${(100 * flaggedLand / n).toFixed(3)}%); land ratio ${(flaggedLand / massif).toFixed(3)}, geometric ratio ${(flagged / geo).toFixed(3)}`);
    console.log(`GRID AREA ${w.name}: flagged / massif ${(flagged / massif).toFixed(3)}`);
    // The T1 target literally: all flagged area (land and ocean) against the massif (in-band land) area.
    assert.ok(flagged <= 1.5 * massif, `${w.name}: flagged ${flagged} > 1.5 x massif ${massif}`);
    assert.ok(flaggedLand <= 1.5 * massif, `${w.name}: flagged land ${flaggedLand} > 1.5 x massif ${massif}`);
    assert.ok(flagged <= 1.5 * geo, `${w.name}: flagged ${flagged} > 1.5 x geometric band ${geo}`);
  }
});

test('HARD: outside the band mountainRidgeTermM returns main\'s term unchanged, so massifBeltSample is value-neutral at the call site', () => {
  // Every in-belt direction OUTSIDE the band (sampleWithA0 belt !== 0 but massifBeltSample belt 0): the ridge
  // term with the full sample is exactly main's term (no carving runs: the envelope is 0 there).
  let checked = 0;
  const seeds = new Uint32Array(64).map((_, i) => 0x9e3779b1 * (i + 1) >>> 0);
  for (const w of worlds) {
    const layout = orogenLayout(w), a0 = continentalA0(w), out = empty();
    for (let i = 0; i < 20000; i++) {
      const d = fib(i, 20000), alt = a0(d), full = layout.sampleWithA0(d, alt);
      const banded = massifBeltSample(layout, d, alt, out);
      if (full.belt === 0) {assert.equal(banded.belt, 0); continue;}
      if (banded.belt !== 0) {assert.ok(same(banded, full)); continue;}
      for (const main of [1234.5, 0, -0, 7.25e3]) {
        assert.equal(massifEnvelopeM(full.belt, full.axisDistanceM, full.halfWidthM, alt, 1, 1, 'water'), 0);
        assert.ok(Object.is(composeRidgeTermM(main, full.belt, full.axisDistanceM, full.halfWidthM, 0), main));
        assert.ok(Object.is(mountainRidgeTermM(main, full, alt, .8, 1.3, seeds), main));
      }
      checked++;
    }
  }
  assert.ok(checked > 1000, `${checked} in-belt out-of-band directions`);
});
