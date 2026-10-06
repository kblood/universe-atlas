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
import {createHash} from 'node:crypto';
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

// Captured BEFORE the value-preserving cost optimisation, from ea0c802's mountains-on
// path. Hash all tile fields/buffers, with binary doubles (including signed zero).
// Re-pinned at the baked coarse field (massif-envelope-3 / orogen-layout-3, docs/mountains-t6-baked-coarse-2026-10-06.md):
// [0] (L(cut-1)) and the [1] tiles' parents/parentHeight (their parent mesh is the L(cut-1) sampler); every
// other [1] field and every COST_SAMPLER_IDENTITY[1] (carved) value is unchanged. Old -> new in that doc.
const COST_IDENTITY = {
  Maithea: ['6c4bf8046e49e179c0d4c7e9ab8223963d1645eadd15babdaaf18faaf8714b1d', '00446f5aac1c49ecefc9a592989b1ee4c57a8cac3680c5b28e9eeae097d99cfa'],
  Selawyn: ['c455f00ad1539773f2a855253c467cec2de9a8c2c681f22747dcc9595b45728f', 'fa4de7c27478144dcda67f7c1a05640866309416335caaf102df68f41731d5fa'],
  Raiva: ['b6c55c60a34a26ab1dfe241ecc9b5078b2a1cd712e0344e57bea96186b8e2ac6', '134db519076d04473c6eee0e352fd9eb9271db3ad5edb403f19db6dcac62d2b6'],
  Lethuris: ['acf6482bbfe06f80880de8482b1b2f6308dfa7fc89918a29da3bb1d5ce5e1a48', 'c3574bed133f5866e327c6457da6e586af4b99deea16f5520931e2cb4ed4ffab'],
};
const COST_SAMPLER_IDENTITY = {
  Maithea: ['6da066889d287cdb32d528d5aaec3f5d4a426d3869547e174806f9e98905225d', 'a49cc5e166d1686748f7516556d5bd4fd53d0bcef1792c93b45b4daeabf42a79'],
  Selawyn: ['5fdbe43b04673c3b1a9785c7cf937459de4caf4d9ce55a5d47266ed12f2ab0b2', 'efba81af653849461b56d8314e3fa39280ab32c0543c1da71ffd36fe8780ba54'],
  Raiva: ['0b215f0689780c575b21f1c226e5470bbbf0789b466f6269cbaf6099a5472270', '3c9b85ba194eaa8c6edfa426446b1840d7510c1c0274438eec18cd240fa6f573'],
  Lethuris: ['1c5faaacd4faa4d7db7e8353629a8e77f0539d90a728e17cc3f4872e35b16878', '72ca784c16ba4b497b099e1861b9d89d26f627d318dc6023f25e31b6ad01f610'],
};
function costIdentityDigest(value) {
  const h = createHash('sha256');
  function add(v) {
    if (ArrayBuffer.isView(v)) { h.update(v.constructor.name); h.update(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)); }
    else if (typeof v === 'number') { const b = Buffer.alloc(8); b.writeDoubleLE(v); h.update(b); }
    else if (v && typeof v === 'object') { for (const k of Object.keys(v).sort()) { h.update(k); add(v[k]); } }
    else h.update(String(v));
  }
  add(value); return h.digest('hex');
}
for (const [name, body] of Object.entries(bodies)) test(`${name}: cost optimisation preserves every coarse/switch tile buffer`, () => {
  const d = axisSites(body, {count: 3})[0].d, cut = CUT[name];
  for (const [i, L] of [cut - 1, cut].entries()) {
    assert.equal(costIdentityDigest(buildOn(body, tiles.directionTile(d, L))), COST_IDENTITY[name][i]);
  }
});
for (const [name, body] of Object.entries(bodies)) test(`${name}: cost optimisation preserves full sampler outputs at truth and L0..22`, () => {
  const dirs = [...axisSites(body, {count: 3}).map(s => s.d), ...Array.from({length: 256}, (_, i) => fib(i, 256))];
  for (const lodLevel of [undefined, ...Array.from({length: 23}, (_, i) => i)]) {
    const sample = terrainSampler(body, undefined, undefined, undefined, 0, undefined, true, {mountains: true, lodLevel});
    const carved = lodLevel === undefined || lodLevel >= CUT[name];
    assert.equal(costIdentityDigest(dirs.map(d => sample(d))), COST_SAMPLER_IDENTITY[name][+carved], `L${lodLevel}`);
  }
});

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
