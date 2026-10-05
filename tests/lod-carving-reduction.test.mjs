// lod-ladder-2: the declared M3 carving reduction (mountains cost plan T3; docs/mountains-opus-decisions-2026-10-05.md
// Q2 and "Addendum 2026-10-05" item 1; docs/lod-ladder-contract-v1.md section 3 "Mountain carving").
//
// Tile levels whose edge exceeds 128 km cannot hold M3's 16 km band, so their samplers evaluate the uncarved
// composition (carving +0, an upper envelope, no M3 block solve). The truth sampler (no level) keeps the carving.
// The mountains are STAGED (TERRAIN_MOUNTAINS_WIRED = false until cost plan T6), so every test here opts in with
// {mountains: true}; the default field stays terrain-1.8.1-grain.
//
// Switch level (binding addendum item 1): a child at L(cut) and its parent mesh keep the carving state of their own
// level. Checked on a massif tile of every world: (1) the child's parent mesh starts on the actually built
// L(cut-1) tile (the existing 0.05 m morph rule of tests/lod-consistency.test.mjs), (2) the child's parent-boundary
// edge agrees with the neighbouring L(cut-1) tile under the same rule, and (3) a mutation control: a parent sampled
// at the child's level (carved) fails both comparisons. Each world has one case inside a cube face (axis site) and
// one whose parent-boundary edge is a cube-face edge (the neighbour lies on another face).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as tiles from '../src/planet-tiles.ts';
import {terrainSampler, mountainCarvingState, TERRAIN_MOUNTAINS_WIRED, TERRAIN_VERSION} from '../src/terrain.ts';
import {LOD_LADDER_VERSION, CARVING_REDUCTION, CARVING_MAX_EDGE_M, carvingFromLevel, carvingAtLevel, tileEdgeM} from '../src/lod-ladder.ts';
import {CARVING_BANDS, carvingBuildStats} from '../src/mountain-carving.ts';
import {MOUNTAIN_ASSEMBLY_VERSION, mountainRidgeTermM} from '../src/mountain-assembly.ts';
import {waterWorlds, fib} from './terrain-climate-fixtures.mjs';
import {
  ON, mountainSampler, buildOn, axisSites, switchSeamCase, latticeHeights, vertexPosition, storedPosition, distM, edgeNodes,
} from './helpers/mountain-coarse-tiles.mjs';

const bodies = Object.fromEntries(waterWorlds().map(b => [b.name, b]));
const MORPH_M = .05; // tests/lod-consistency.test.mjs 'morph: a child starts exactly on its corrected parent'
const CUT = {Maithea: 6, Selawyn: 7, Raiva: 5, Lethuris: 7};

test('lod-ladder-2: carving starts at the first level with edge <= 128 km; constants pinned to their sources', () => {
  assert.equal(LOD_LADDER_VERSION, 'lod-ladder-2');
  assert.equal(MOUNTAIN_ASSEMBLY_VERSION, 'mountain-assembly-2');
  assert.equal(CARVING_REDUCTION.longestWavelengthM, Math.max(...CARVING_BANDS.map(b => b.wavelengthM)));
  assert.equal(CARVING_REDUCTION.latticeSegments, tiles.PATCH_SEGMENTS);
  assert.equal(CARVING_MAX_EDGE_M, 128_000);
  for (const [name, cut] of Object.entries(CUT)) {
    const R = bodies[name].radiusM;
    assert.equal(carvingFromLevel(R), cut, name);
    assert.ok(tileEdgeM(R, cut) <= 128_000 && tileEdgeM(R, cut - 1) > 128_000, name);
    // Lattice Nyquist 2 x edge / 32 <= 8 km exactly from the cut on.
    assert.ok(2 * tileEdgeM(R, cut) / 32 <= 8000 && 2 * tileEdgeM(R, cut - 1) / 32 > 8000, name);
    assert.equal(carvingAtLevel(R), true, 'the truth (no level) carves');
    assert.equal(carvingAtLevel(R, cut - 1), false);assert.equal(carvingAtLevel(R, cut), true);assert.equal(carvingAtLevel(R, 0), false);
  }
});

test('staged wiring: off by default, the level changes nothing without mountains, carving state per option', () => {
  assert.equal(TERRAIN_MOUNTAINS_WIRED, false, 'wired at cost plan T6 together with TERRAIN_VERSION and the goldens');
  assert.equal(TERRAIN_VERSION, 'terrain-1.8.1-grain');
  const body = bodies.Maithea, cut = CUT.Maithea;
  assert.equal(mountainCarvingState(body), null);assert.equal(mountainCarvingState(body, {lodLevel: 0}), null);
  assert.equal(mountainCarvingState(body, ON), true);
  assert.equal(mountainCarvingState(body, {...ON, lodLevel: cut - 1}), false);assert.equal(mountainCarvingState(body, {...ON, lodLevel: cut}), true);
  const site = axisSites(body, {count: 1})[0].d, base = terrainSampler(body), coarse = terrainSampler(body, undefined, undefined, undefined, 0, undefined, false, {lodLevel: 0});
  for (const d of [site, ...Array.from({length: 64}, (_, i) => fib(i, 64))]) assert.deepEqual(coarse(d), base(d));
});

test('mountainRidgeTermM: carve = false is the composition without C, an upper envelope of the carved term', () => {
  const seeds = [730201];let carvedBelow = 0;
  for (let i = -40; i <= 40; i++) {
    const o = {belt: 1, axisDistanceM: i * 1000, halfWidthM: 48000, beltIndex: 0, alongM: 50 * i};
    for (const main of [0, 900, 3000]) {
      const carved = mountainRidgeTermM(main, o, 4000, 1, .8, seeds), plain = mountainRidgeTermM(main, o, 4000, 1, .8, seeds, false);
      assert.ok(plain >= carved, `uncarved ${plain} >= carved ${carved}`);if (plain > carved) carvedBelow++;
    }
  }
  assert.ok(carvedBelow > 0, 'the carving is active on the fixture (negative control for the >= check)');
});

for (const [name, body] of Object.entries(bodies)) test(`${name}: below the cut no block solve and an upper envelope; from the cut the truth`, () => {
  const cut = CUT[name], sites = axisSites(body, {count: 3}), truth = mountainSampler(body), R = body.radiusM;
  assert.equal(sites.length, 3, 'three massif axis sites');
  // A 9 x 9 raster spanning 2 x 48 km across and along the axis at every site.
  const dirs = [];
  for (const s of sites) {
    const a = [s.d[1], -s.d[0], 0], al = Math.hypot(...a), t1 = a.map(v => v / al), t2 = [s.d[1] * t1[2] - s.d[2] * t1[1], s.d[2] * t1[0] - s.d[0] * t1[2], s.d[0] * t1[1] - s.d[1] * t1[0]];
    for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) {
      const p = s.d.map((v, k) => v + (i * 12000 * t1[k] + j * 12000 * t2[k]) / R), l = Math.hypot(...p);dirs.push(p.map(v => v / l));
    }
  }
  // Every coarse level's sampler on the massif rasters: no M3 block solve (the module-global build counter).
  const b0 = carvingBuildStats.count;
  for (let L = 0; L < cut; L++) {const s = mountainSampler(body, L);for (const d of dirs) s(d);}
  assert.equal(carvingBuildStats.count - b0, 0, `0 block solves at L0..L${cut - 1}`);
  // Upper envelope against the truth: floor (the ridge term's own level) and ground height; ocean flag equal.
  const floorOf = o => terrainSampler(body, undefined, undefined, undefined, 0, undefined, true, o);
  const coarse = floorOf({...ON, lodLevel: cut - 1}), full = floorOf(ON);let lower = 0, raised = 0, groundBelow = 0;
  for (const d of dirs) {
    const c = coarse(d), f = full(d);
    if (c.floorM < f.floorM) lower++;if (c.floorM > f.floorM) raised++;if (c.groundHeightM < f.groundHeightM) groundBelow++;
    assert.equal(c.ocean, f.ocean, 'ocean flag unchanged by the reduction');
  }
  assert.equal(lower, 0, 'uncarved floor >= carved floor (upper envelope), 0 violations');
  assert.equal(groundBelow, 0, 'uncarved ground >= carved ground, 0 violations');
  assert.ok(raised > 0, 'the carving is active on these sites (negative control)');
  // From the cut on, a level's sampler IS the truth (bit for bit).
  for (const L of [cut, cut + 3]) {const s = mountainSampler(body, L);for (const d of dirs.slice(0, 81)) assert.deepEqual(s(d), truth(d), `L${L}`);}
});

for (const [name, body] of Object.entries(bodies)) for (const crossFace of [false, true]) test(`${name}: switch level L(cut-1) -> L(cut): parent and child keep their own level's carving (${crossFace ? 'cube-face edge' : 'axis site'})`, t => {
  const sc = switchSeamCase(body, {crossFace});
  assert.ok(sc, 'a massif tile at the switch level with carving on its parent-boundary edge');
  const {cut, C, P, N, edge} = sc, n = tiles.PATCH_SEGMENTS;
  assert.equal(N.level, cut - 1);
  if (crossFace) assert.notEqual(N.face, P.face, 'the neighbour lies across a cube-face edge');
  assert.equal(cut, CUT[name]);
  const b0 = carvingBuildStats.count, p = buildOn(body, P), nb = buildOn(body, N);
  assert.equal(carvingBuildStats.count - b0, 0, 'building the two L(cut-1) tiles solves no block');
  const c = buildOn(body, C);
  // The reference: P's stored heights recomputed from the contract with the uncarved L(cut-1) sampler.
  const coarse = mountainSampler(body, cut - 1), carved = mountainSampler(body, cut);
  const ref = latticeHeights(body, P, coarse), mutant = latticeHeights(body, P, carved);
  for (let i = 0; i < ref.length; i++) assert.equal(p.surfaceHeight[i], Math.fround(ref[i]), `P vertex ${i}: reference reproduces the built tile`);
  // (1) Child's parent mesh at every co-located node vs the actually built parent; mutant vs the same parent.
  const ox = (C.x & 1) * n / 2, oy = (C.y & 1) * n / 2;let worst = 0, mutantWorst = 0;
  for (let y = 0; y <= n; y += 2) for (let x = 0; x <= n; x += 2) {
    const ci = y * (n + 1) + x, px = ox + x / 2, py = oy + y / 2, pi = py * (n + 1) + px, real = storedPosition(p, 'positions', pi);
    worst = Math.max(worst, distM(body, storedPosition(c, 'parents', ci), real));
    mutantWorst = Math.max(mutantWorst, distM(body, vertexPosition(body, P, px, py, mutant[pi]), real));
  }
  assert.ok(worst < MORPH_M, `child parent mesh vs built L${cut - 1} parent: ${worst.toFixed(4)} m < ${MORPH_M} m`);
  assert.ok(mutantWorst >= MORPH_M, `mutation (parent sampled at the child's level) fails the same rule: ${mutantWorst.toFixed(1)} m`);
  // (2) The child's parent-boundary edge vs the neighbouring L(cut-1) tile N (matched by direction).
  const nDirs = [];for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) nDirs.push(tiles.tileDirection(N, x / n, y / n));
  let seam = 0, mutantSeam = 0, matched = 0;
  for (const [x, y] of edgeNodes(edge, n)) {
    const d = tiles.tileDirection(C, x / n, y / n);let best = Infinity, bi = -1;
    for (let i = 0; i < nDirs.length; i++) {const e = Math.hypot(nDirs[i][0] - d[0], nDirs[i][1] - d[1], nDirs[i][2] - d[2]);if (e < best) {best = e;bi = i;}}
    assert.ok(best < 1e-9, `edge node (${x},${y}) is a vertex of the neighbour (${best})`);matched++;
    const real = storedPosition(nb, 'positions', bi), pi = (oy + y / 2) * (n + 1) + ox + x / 2;
    seam = Math.max(seam, distM(body, storedPosition(c, 'parents', y * (n + 1) + x), real));
    mutantSeam = Math.max(mutantSeam, distM(body, vertexPosition(body, P, ox + x / 2, oy + y / 2, mutant[pi]), real));
  }
  assert.equal(matched, n / 2 + 1);
  assert.ok(seam < MORPH_M, `child edge parent mesh vs neighbour L${cut - 1} tile: ${seam.toFixed(4)} m < ${MORPH_M} m`);
  assert.ok(mutantSeam >= MORPH_M, `mutation fails the seam rule: ${mutantSeam.toFixed(1)} m`);
  // INFO (addendum item 1): the mean height step at the cut on this massif tile (child carved - parent uncarved).
  let step = 0, cnt = 0, minStep = Infinity;
  for (let i = 0; i < (n + 1) * (n + 1); i++) {const s = c.surfaceHeight[i] - c.parentHeight[i];step += s;cnt++;minStep = Math.min(minStep, s);}
  t.diagnostic(`INFO ${name}${crossFace ? ' (cube-face edge)' : ''} C=${tiles.tileKey(C)} N=${tiles.tileKey(N)} edge ${edge}: morph start ${worst.toFixed(4)} m, seam ${seam.toFixed(4)} m; mutant ${mutantWorst.toFixed(1)} / ${mutantSeam.toFixed(1)} m; mean step at the cut ${(step / cnt).toFixed(1)} m (min ${minStep.toFixed(1)} m)`);
});
