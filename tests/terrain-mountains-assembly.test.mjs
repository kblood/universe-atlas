// Mountains assembly (MTN-6, step A, docs/mountains-assembly-2026-10-05.md): M1 orogen layout + M2 massif
// envelope (massif-envelope-2) + M3 fixed-width carving, composed by src/mountain-assembly.ts.
//
// NOT WIRED into terrain.ts on main: wired (branch commit 92afaa3) every rule below passed, but sparse
// sampling costs one ~140 ms M3 block solve per in-massif sample (the 6 Maithea L0 tiles: 335 s), so the wiring
// waits for an owner decision on cold cost. The identity pins below are main's field and stay the
// acceptance rule for that wiring: outside every massif (and the ocean flag everywhere) bit-identical.
//
// HARD identity: the field outside every massif is bit-identical to main before the assembly. The digests were
// computed FIRST on unmodified main 39e2448 (terrain-1.8.1-grain) with this file's own selection rule
// (test-results/mountains/assembly-2/identity-pins-on-main.mjs reads main's src/terrain.ts read-only), and are
// literals here, never recomputed from the branch.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {terrainSampler, tectonicReliefOf} from '../src/terrain.ts';
import {orogenLayout} from '../src/mountain-layout.ts';
import {maxEnvelopeM, massifHalfWidthM, massifEnvelopeM, composeRidgeTermM, MASSIF_ENVELOPE_VERSION} from '../src/mountain-envelope.ts';
import {mountainRidgeTermM, carvingStrip, carvingSeed, MOUNTAIN_ASSEMBLY, MOUNTAIN_ASSEMBLY_VERSION, MASSIF_IS_ONE_STRIP} from '../src/mountain-assembly.ts';
import {MOUNTAIN_CARVING_VERSION} from '../src/mountain-carving.ts';
import {identityDigest, outsideBelt, outsideMassif, everywhere} from './helpers/mountain-assembly-identity.mjs';
import {measureSummits, beltAt} from './helpers/mountain-summits.mjs';
import {rasterFromArray} from './helpers/mountain-metrics.mjs';
import {waterWorlds, fib} from './terrain-climate-fixtures.mjs';

const MAIN_DIGESTS = {
  outsideBelt: {heights: 'a7000ad60afb60709e7b7621ea8f573a003a712170f016467ea930a4e7e63d7b',
    colour: 'e04aa67d90a7950f4924c468d03b78c00c23bb762614f28184de239c913940ea',
    counts: {Maithea: 3869, Selawyn: 3935, Raiva: 3970, Lethuris: 3939}},
  outsideMassif: {heights: 'e26e77d3abd8ca436dd5e90553d55e2ad3bdf272900545e1add56b9bd54fd024',
    colour: '35a334d2c174dd99fecd3848c48b3779c2e4dd5154d6b596cd728acd70c8f4b0',
    counts: {Maithea: 3997, Selawyn: 4039, Raiva: 4025, Lethuris: 4039}},
};

for (const [label, select] of [['outsideBelt', outsideBelt], ['outsideMassif', outsideMassif]])
  test(`HARD: ${label} directions (4096 per water world) are bit-identical to main: heights, ocean and colour`, () => {
    const pin = MAIN_DIGESTS[label], h = identityDigest(terrainSampler, {select}), c = identityDigest(terrainSampler, {select, colour: true});
    assert.deepEqual(h.counts, pin.counts);
    assert.equal(h.sha, pin.heights);
    assert.equal(c.sha, pin.colour);
  });

test('HARD: negative controls: the identity digest rejects one changed height, colour or ocean flag', () => {
  const pin = MAIN_DIGESTS.outsideBelt;let k = 0;
  const mutate = how => body => {const ts = terrainSampler(body);return d => {const s = ts(d);
    if (body.name === 'Raiva' && k++ === 1234) {const m = {...s, color: [...s.color]};how(m);return m;}return s;};};
  for (const [name, how, colour] of [['height', m => {m.groundHeightM += 1e-6;}, false], ['colour', m => {m.color[1] += 1e-9;}, true],
    ['ocean', m => {m.ocean = !m.ocean;}, false]]) {
    k = 0;const r = identityDigest(mutate(how), {select: outsideBelt, colour});
    assert.notEqual(r.sha, colour ? pin.colour : pin.heights, name);
  }
});

// The sea-level-0 coastline is unchanged everywhere (inside belts too): the ridge term stays >= 0 where a0 >= 0.
const MAIN_OCEAN_DIGEST = '48f643c59f6b2a55671c348d431e8242700a2e4eb5d63791ee1ff42db5b1c22d';
test('HARD: the ocean flag of every direction (4096 per water world, belts included) is identical to main', () => {
  const r = identityDigest(terrainSampler, {select: everywhere, oceanOnly: true});
  assert.equal(r.sha, MAIN_OCEAN_DIGEST);
});

test('HARD: versions, fixed carving width, strip rule and per-strip seeds', () => {
  assert.deepEqual([MASSIF_ENVELOPE_VERSION, MOUNTAIN_CARVING_VERSION, MOUNTAIN_ASSEMBLY_VERSION], ['massif-envelope-2', 'mountain-carving-2', 'mountain-assembly-2'], 'mountain-assembly-1 -> -2: cost plan T3 coarse-level carve flag; the truth term is unchanged');
  assert.ok(Object.isFrozen(MOUNTAIN_ASSEMBLY));assert.deepEqual({...MOUNTAIN_ASSEMBLY}, {CARVING_HALF_WIDTH_M: 48000});
  assert.equal(MASSIF_IS_ONE_STRIP, true);
  const w = MOUNTAIN_ASSEMBLY.CARVING_HALF_WIDTH_M;
  for (const [across, strip] of [[0, 0], [w - 1, 0], [-w, 0], [w, 1], [3 * w - 1, 1], [-w - 1, -1], [-3 * w, -1], [5 * w, 3]]) {
    const c = carvingStrip(across);assert.equal(c.strip, strip, `${across}`);
    assert.ok(c.localM >= -w && c.localM < w);assert.equal(c.localM + c.strip * 2 * w, across);
  }
  assert.equal(carvingSeed(12345, 0), 12345);
  const seeds = new Set([-3, -2, -1, 0, 1, 2, 3].map(k => carvingSeed(12345, k)));assert.equal(seeds.size, 7);
  for (const k of [-3, 1, 7]) {const v = carvingSeed(0xdeadbeef, k);assert.ok(Number.isInteger(v) && v >= 0 && v < 2 ** 32);}
});

test('HARD: the assembled ridge term: >= 0, <= max(main, analytic envelope), main outside the massif', () => {
  const seeds = [730201];
  for (const tau of [.456, .789]) for (const wBelt of [32000, 71600, 220000]) for (const main of [0, 900, 3000])
    for (let i = -70; i <= 70; i++) {
      // alongM stays inside two M3 blocks (block solves are ~140 ms each; a spread-out x would solve one per sample).
      const y = i * 1000, x = 50 * i, o = {belt: beltAt(y, wBelt), axisDistanceM: y, halfWidthM: wBelt, beltIndex: 0, alongM: x};
      const h = mountainRidgeTermM(main, o, 1000, 1, tau, seeds);
      assert.ok(h >= 0 && h <= Math.max(main, maxEnvelopeM(tau, 'water')) * (1 + 4 * Number.EPSILON), `${tau} ${wBelt} ${main} ${y}: ${h}`);
      if (Math.abs(y) >= massifHalfWidthM(wBelt) || o.belt === 0) assert.ok(Object.is(h, main));
    }
  // a0 <= 0 (sea floor side): no envelope, no carving; the term is main's composed with weight w (never > main).
  const o = {belt: 1, axisDistanceM: 0, halfWidthM: 71600, beltIndex: 0, alongM: 0};
  assert.equal(mountainRidgeTermM(0, o, -1, 1, .789, seeds), 0);
});

test('HARD: mountain-assembly.ts is arithmetic only and imports only M2 and M3', () => {
  const src = readFileSync(new URL('../src/mountain-assembly.ts', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
  assert.deepEqual([...src.matchAll(/from\s*['"]([^'"]+)['"]/g)].map(m => m[1]), ['./mountain-envelope.ts', './mountain-carving.ts']);
  assert.deepEqual([...new Set([...src.matchAll(/Math\.(\w+)/g)].map(m => m[1]))].sort(), ['floor', 'imul']);
  const forbidden = /\*\*|\bMath\s*\[|\b(?:Number|BigInt|parseFloat|parseInt|Date|performance)\b/;
  assert.doesNotMatch(src, forbidden);
  // Negative controls: the audit sees each forbidden form.
  for (const bad of ['const z = x ** 2;', 'Math["sin"](x)', 'Number(x)', 'BigInt(1)']) assert.match(bad, forbidden);
});

// M4 R1 (>= 8 summits of prominence >= 300 m per 1000 km2 of belt core) on the worst real world: Raiva has the
// lowest tau (.456) of the four. The full four-world measurement (axis, flank, whole core, R2, R3) is
// scripts/mountain-assembly-summits.mjs (docs/mountains-assembly-2026-10-05.md); this pins the binding case.
// The whole-core method (one raster spanning the full core band) is proposed here and awaits owner acceptance;
// the 48 km axis/flank rasters of docs/mountain-summits-v1.md are reported beside it (Raiva flank-centred: 7.12).
test('CONTRACT: M4 R1 on the whole belt core at the real Raiva tau and belt width (8 seeds, 64 km rasters)', () => {
  const raiva = waterWorlds().find(b => b.name === 'Raiva'), tau = tectonicReliefOf(raiva), lay = orogenLayout(raiva);
  let w = 0;for (let i = 0; i < 20000; i++) {const b = lay.sample(fib(i, 20000));if (b.belt >= .5 && b.halfWidthM >= 32000) {w = b.halfWidthM;break;}}
  assert.ok(w > 0);
  let count = 0, area = 0;const n = 513, c = 256, step = 125;
  for (let site = 0; site < 8; site++) {
    const h = new Float64Array(n * n), seeds = [730201 + site];
    for (let p = 0; p < h.length; p++) {const x = site * 1e6 + (p % n - c) * step, y = (Math.floor(p / n) - c) * step;
      h[p] = mountainRidgeTermM(0, {belt: beltAt(y, w), axisDistanceM: y, halfWidthM: w, beltIndex: 0, alongM: x}, 1000, 1, tau, seeds);}
    const m = measureSummits({...rasterFromArray(h, n, step), w: massifHalfWidthM(w), tau, y0: 0});
    count += m.count;area += m.areaKm2;assert.equal(m.boundViolations, 0);
  }
  const density = count * 1000 / area;console.log(`RAIVA R1 ${JSON.stringify({tau, w, count, area, density})}`);
  assert.ok(density >= 8, `R1 ${density.toFixed(2)} >= 8`);
  // Negative control: the bare envelope (carving disabled) on the same rasters fails R1 (a smooth dome).
  const h = new Float64Array(n * n);
  for (let p = 0; p < h.length; p++) {const y = (Math.floor(p / n) - c) * step, belt = beltAt(y, w), U = massifEnvelopeM(belt, y, w, 1000, 1, tau, 'water');
    h[p] = composeRidgeTermM(0, belt, y, w, U);}
  const bare = measureSummits({...rasterFromArray(h, n, step), w: massifHalfWidthM(w), tau, y0: 0});
  assert.ok(bare.density < 8, `bare envelope R1 ${bare.density}`);
});
