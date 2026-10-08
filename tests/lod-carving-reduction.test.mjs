// lod-ladder-2: the declared M3 carving reduction (mountains cost plan T3; docs/mountains-opus-decisions-2026-10-05.md
// Q2 and "Addendum 2026-10-05" item 1; docs/lod-ladder-contract-v1.md section 3 "Mountain carving").
//
// Tile levels whose edge exceeds 128 km cannot hold M3's 16 km band, so their samplers evaluate the uncarved
// composition (carving +0, an upper envelope, no M3 block solve). The truth sampler (no level) keeps the carving.
// lod-ladder-3 (M5, wired at T6): levels from rockDetailFromLevel(R) (edge <= 8 km) and the truth add the M5 steep-rock
// term (<= 0); between the cut and that level the carved term without rock, an upper envelope of the truth.
// WIRED since T6 (TERRAIN_MOUNTAINS_WIRED = true, terrain-1.9.0-mountains): {mountains: true} below equals the default.
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
import {LOD_LADDER_VERSION, CARVING_REDUCTION, CARVING_MAX_EDGE_M, carvingFromLevel, carvingAtLevel, rockDetailFromLevel, tileEdgeM, riserSharpFromLevel, rockRiserWidthM} from '../src/lod-ladder.ts';
import {CARVING_BANDS, carvingBuildStats} from '../src/mountain-carving.ts';
import {MOUNTAIN_ASSEMBLY_VERSION, mountainRidgeTermM} from '../src/mountain-assembly.ts';
import {waterWorlds, fib} from './terrain-climate-fixtures.mjs';
import {
  ON, mountainSampler, buildOn, axisSites, switchSeamCase, latticeHeights, vertexPosition, storedPosition, distM, edgeNodes,
} from './helpers/mountain-coarse-tiles.mjs';
import {pick, tierNote} from './helpers/tier.mjs';

const bodies = Object.fromEntries(waterWorlds().map(b => [b.name, b]));
const MORPH_M = .05; // tests/lod-consistency.test.mjs 'morph: a child starts exactly on its corrected parent'
const CUT = {Maithea: 6, Selawyn: 7, Raiva: 5, Lethuris: 7};
/** lod-ladder-3: first level with the M5 rock term (edge <= ROCK_DETAIL_MAX_EDGE_M = 8 km). */
const ROCK = {Maithea: 10, Selawyn: 11, Raiva: 9, Lethuris: 11};

// Captured BEFORE the value-preserving cost optimisation, from ea0c802's mountains-on
// path. Hash all tile fields/buffers, with binary doubles (including signed zero).
// Re-pinned at the baked coarse field (massif-envelope-3 / orogen-layout-3, docs/mountains-t6-baked-coarse-2026-10-06.md):
// [0] (L(cut-1)) and the [1] tiles' parents/parentHeight (their parent mesh is the L(cut-1) sampler); every
// other [1] field and every COST_SAMPLER_IDENTITY[1] (carved) value is unchanged. Old -> new in that doc.
// T6 (M5 wired, lod-ladder-3): COST_IDENTITY and COST_SAMPLER_IDENTITY[0], [1] are unchanged (L(cut-1) and L(cut) carry no
// rock; rock = false is bit-identical to mountain-assembly-2). The truth and levels >= ROCK now carry the rock term, a new
// class [2] (re-pinned; old: the truth was [1]). Ledger: docs/mountains-t6-wiring-2026-10-06.md.
// Carving C1 (terrain-1.9.1-carving-c1, mountain-carving-3 + mountain-assembly-4): COST_IDENTITY[1] and
// COST_SAMPLER_IDENTITY[1], [2] re-pinned (carved levels and the truth); [0] (uncarved L(cut-1)) unchanged.
// Old -> new: docs/mountain-carving-c1-2026-10-07.md.
// surface-climate-2 (R5-ATLAS-CLIMATE-M1, granted by climate-m1-decision 2 and decision-2 (b), 2026-10-08; Opus-decided on
// Kasper's instruction, overrulable): all 31 literals below (COST_IDENTITY, COST_SAMPLER_IDENTITY, RISER_SAMPLER_IDENTITY)
// re-pinned. Only the climate-driven fields moved: tile color, materials and meta, and sampler color; every geometry,
// height, ocean and water field is bit-identical to main 290472d. Main's climate reproduces every old literal. Old -> new
// map and per-field digests: test-results/climate-m1/resume/carving-repin.json, carving-digests-*.json.
const COST_IDENTITY = {
  Maithea: ['f9a05355ea77048c17d088ff9f75a4528097ee8456023811da64722e7313b4ae', '98ff583fe32afa1ada8c073d3d1acc78def25a5770bb0c95f7cba8d6fbf904ff'],
  Selawyn: ['4ea1a7fee7c8c4e8f2f2e8570c970c480f783edb5d5da3b1165538e40259764d', '6ac59fd7b381c9f26990c08ddb1ecce24a7d24f299dd33d4beb07526552c527f'],
  Raiva: ['88490857dbbdefc8a3874474dea55bede2af67f7a640609580a1ea6af1436053', 'f4055545134d078cda51738981b230e2fb65a3e3b0af32ef41cad4edbde769c5'],
  Lethuris: ['3c9a96a5489ab03316c3e20e263bcaee16f9a437ac336d40ebce7d84c8e358dd', 'f4d76b5d9969d93d3f31baf99666123b96180fdc96e84ba310b70d9bd042f701'],
};
const COST_SAMPLER_IDENTITY = {
  Maithea: ['74ef8ff2358e094702bc7196e7108d7c454722aeae6b7a8753dfd7e02c05d984', '99950b5a4a2082991827375d131ea484d4d823370fcf697cf1b1842f3043fe18', 'b62e5cbe7bf73587e648b628e88f428acedb12d6497ae575695e3c8ca5b870e7'],
  Selawyn: ['4f6f2022bd8846f9c8b0fd956bf1b426e22bc078a0a3d390c3e7a76c5d6952e3', '44043b0fce962ce104ed4ff6a87357799953a8f273be19c2a0d120cc7b8b8af3', '62e9174778cc8ce93558c1f2a264ceec0de7cafef1d821e4dee6cfd3a284b8e1'],
  Raiva: ['888d92ba2bd47676e4bc5d25c64331fc55e4044668a6b2e6cfda9c3a99ebe1be', 'daaa5d4167d4ae2014dac4f8d61a6ac4b53eb13ed7be00cda4a582c1b9a20769', '76fa5ffd77cae11b827e7ca3a7e11d27c9d62b6ed9dfcfc7eddb748542ed0a32'],
  Lethuris: ['888318418df66e72e51515fff95d8d9edaf0b2150d78c15cf4c515b3724f698a', 'a34a25e0a77d5e059a312dff838573e334819b5b896ac8b99b9be3ee11308f20', 'f52807fc78b1f19ca4a490250aa1541f93d1162c4fb2e670beab456e6053810f'],
};
// lod-ladder-4 riser reduction (docs/mountain-riser-lod-2026-10-07.md): the filtered levels rockDetailFromLevel ..
// riserSharpFromLevel - 1 whose digest moved get their own pin (old: COST_SAMPLER_IDENTITY[name][2]); a filtered level not
// listed (no strata in these 259 directions at that riser width) and the truth and levels >= the sharp level stay on [2].
const RISER_SAMPLER_IDENTITY = {
  Maithea: {10: '0e64486cb040817e33847ce99d355a9e2ea12e5fa5ac7dc1bb8cadfad34c7bd5', 11: 'dfa0871c60e6f548de80fb3c3300b0e56490ce76a13d8b7990c0181d081c2354',
    12: '6ab621325cdb4c827e93830fedeaa4c798221d8589109ba363370f12f779e013', 13: 'd6da672d5f7792a025a3eb902f988ce81fb83a8681b822ae51e6db48a4bff876'},
  Selawyn: {11: 'f804f64896ce2f88ddd2afbae954e45a865a43d01403f1f4fc18e796fd8e5535', 12: 'da67b9325a4fff6c090389997a0725e335b41b04e4b72a60477d9f9efc9e9eea'},
  Raiva: {9: 'ef687b03c80374b5e8100067975fad57722e161c73cd3dc776a1e80486236300', 10: 'e39bb748342f6db6897632bec9e9f6da37de916279c80867a26c69bc92b3f4af'},
  Lethuris: {11: '200b458253af30e122acde02e0fee547a88f4134792f54b6bde32964494e2890', 12: '8530fc2c076401b3096cf2aaa73389d6073dd7fa9c6d0129a22b84adc8320104',
    13: '9154279ee6d1d085ceb8b7ba5b7d79c40a2bbc068cc295fe34de4ce67d54785c'},
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
// These historical whole-buffer pins include the old forest palette. Keep every
// literal frozen by using the review palette, then prove the production default
// changes only RGB. This keeps the geometry/material/metadata contract intact.
const physicalFields = ({color, ...rest}) => color instanceof Uint8Array
  ? {...rest,colorAlpha:color.filter((_,i)=>i%4===3)} : rest;
for (const [name, body] of Object.entries(bodies)) test(`${name}: cost optimisation preserves every coarse/switch tile buffer`, () => {
  const d = axisSites(body, {count: 3})[0].d, cut = CUT[name];
  for (const [i, L] of [cut - 1, cut].entries()) {
    const tile=tiles.directionTile(d,L),legacy=tiles.buildTile(body,tile,1,0,{...ON,orbitForestTint:false});
    assert.equal(costIdentityDigest(legacy), COST_IDENTITY[name][i]);
    assert.equal(costIdentityDigest(physicalFields(buildOn(body,tile))),costIdentityDigest(physicalFields(legacy)),`L${L}: default changes only colour`);
  }
});
// Tier (docs/test-tiers-2026-10-07.md): each level's digest is pinned on its own, so a subset of levels is still exact.
// default = truth + L0..22; smoke = truth + the class boundaries; work adds L0 and L22.
const SAMPLER_LEVELS = (cut, rock, sharp) => pick({smoke: [undefined, cut - 1, cut, rock - 1, rock, sharp - 1, sharp], work: [undefined, 0, cut - 1, cut, rock - 1, rock, sharp - 1, sharp, 22],
  default: [undefined, ...Array.from({length: 23}, (_, i) => i)]});
for (const [name, body] of Object.entries(bodies)) test(`${name}: cost optimisation preserves full sampler outputs at truth and L0..22`, t => {
  const dirs = [...axisSites(body, {count: 3}).map(s => s.d), ...Array.from({length: 256}, (_, i) => fib(i, 256))];
  const levels = SAMPLER_LEVELS(CUT[name], ROCK[name], riserSharpFromLevel(body.radiusM));
  if (levels.length !== 24) t.diagnostic(tierNote(`levels ${levels.map(L => L === undefined ? 'truth' : `L${L}`).join(', ')}`));
  for (const lodLevel of levels) {
    const sample = terrainSampler(body, undefined, undefined, undefined, 0, undefined, true, {mountains: true, lodLevel, orbitForestTint:false});
    const current = terrainSampler(body, undefined, undefined, undefined, 0, undefined, true, {mountains: true, lodLevel});
    const cls = lodLevel === undefined || lodLevel >= ROCK[name] ? 2 : lodLevel >= CUT[name] ? 1 : 0;
    const pin = cls === 2 && lodLevel !== undefined && RISER_SAMPLER_IDENTITY[name][lodLevel] || COST_SAMPLER_IDENTITY[name][cls];
    if (pin !== COST_SAMPLER_IDENTITY[name][cls]) assert.ok(rockRiserWidthM(body.radiusM, lodLevel) > 0, `L${lodLevel} pinned as filtered`);
    const legacy=dirs.map(d=>sample(d));
    assert.equal(costIdentityDigest(legacy), pin, `L${lodLevel}`);
    assert.equal(costIdentityDigest(dirs.map(d=>physicalFields(current(d)))),costIdentityDigest(legacy.map(physicalFields)),`L${lodLevel}: default changes only colour`);
  }
});

test('lod-ladder-2: carving starts at the first level with edge <= 128 km; constants pinned to their sources', () => {
  assert.equal(LOD_LADDER_VERSION, 'lod-ladder-4'); // was lod-ladder-3 (riser LOD, docs/mountain-riser-lod-2026-10-07.md)
  assert.equal(MOUNTAIN_ASSEMBLY_VERSION, 'mountain-assembly-4');
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

test('wired (T6): on by default, the level changes nothing without mountains, carving state per level', () => {
  assert.equal(TERRAIN_MOUNTAINS_WIRED, true, 'wired at cost plan T6 together with TERRAIN_VERSION and the goldens');
  assert.equal(TERRAIN_VERSION, 'terrain-1.10.1-forest-colour'); // was terrain-1.9.1-carving-c1 (BIOME2-CLIMATE M1); was terrain-1.9.0-mountains (carving C1)
  const body = bodies.Maithea, cut = CUT.Maithea, rock = ROCK.Maithea;
  assert.equal(rockDetailFromLevel(body.radiusM), rock);
  assert.equal(mountainCarvingState(body), 'rock');assert.equal(mountainCarvingState(body, {lodLevel: 0}), false);
  assert.equal(mountainCarvingState(body, ON), 'rock');assert.equal(mountainCarvingState(body, {mountains: false}), null);
  assert.equal(mountainCarvingState(body, {...ON, lodLevel: cut - 1}), false);assert.equal(mountainCarvingState(body, {...ON, lodLevel: cut}), true);
  assert.equal(mountainCarvingState(body, {lodLevel: rock - 1}), true);
  // lod-ladder-4: filtered levels carry their riser width (2 x edge / 32); 'rock' from the sharp level (Maithea L14) on.
  assert.equal(mountainCarvingState(body, {lodLevel: rock}), rockRiserWidthM(body.radiusM, rock));assert.ok(rockRiserWidthM(body.radiusM, rock) > 0);
  assert.equal(riserSharpFromLevel(body.radiusM), 14);assert.equal(mountainCarvingState(body, {lodLevel: 13}), 2 * tileEdgeM(body.radiusM, 13) / 32);
  assert.equal(mountainCarvingState(body, {lodLevel: 14}), 'rock');assert.equal(mountainCarvingState(body, {lodLevel: 20}), 'rock');
  // Without the mountains a level changes nothing (the plain field is level-free).
  const site = axisSites(body, {count: 1})[0].d, OFF = {mountains: false}, base = terrainSampler(body, undefined, undefined, undefined, 0, undefined, false, OFF),
    coarse = terrainSampler(body, undefined, undefined, undefined, 0, undefined, false, {...OFF, lodLevel: 0});
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

for (const [name, body] of Object.entries(bodies)) test(`${name}: below the cut no block solve and an upper envelope; from the cut an upper envelope of the truth (no rock); from the rock level the truth`, t => {
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
  // lod-ladder-3: between the cut and the rock level the carved term without rock, an upper envelope of the truth
  // (the M5 term is <= 0); from the rock level on a level's sampler IS the truth (bit for bit).
  const rockL = ROCK[name];assert.equal(rockDetailFromLevel(R), rockL);let rockActive = 0;
  for (const L of [cut, rockL - 1]) {const s = mountainSampler(body, L);
    for (const d of dirs.slice(0, 81)) {const a = s(d), b = truth(d);assert.ok(a.groundHeightM >= b.groundHeightM, `L${L}: no-rock >= truth`);assert.equal(a.ocean, b.ocean);if (a.groundHeightM > b.groundHeightM) rockActive++;}}
  assert.ok(rockActive > 0, 'the rock term is active on these sites (negative control for the >= check)');
  // lod-ladder-4 (riser reduction, docs/mountain-riser-lod-2026-10-07.md): from the rock level up to the sharp level - 1
  // each level lies between the next coarser level and the truth (no-rock >= L(rock) >= ... >= truth, ocean equal), and
  // from the sharp level on a level's sampler IS the truth, bit for bit. (Was: rockL and rockL + 3 equal to the truth.)
  const sharpL = riserSharpFromLevel(R);assert.ok(sharpL > rockL);let filteredAbove = 0;
  for (let L = rockL; L < sharpL; L++) {const s = mountainSampler(body, L), p = mountainSampler(body, L - 1);
    for (const d of dirs.slice(0, 81)) {const a = s(d), b = truth(d), c = p(d);
      assert.ok(a.groundHeightM >= b.groundHeightM, `L${L}: filtered >= truth`);assert.ok(c.groundHeightM >= a.groundHeightM, `L${L - 1} >= L${L}`);
      assert.equal(a.ocean, b.ocean);if (a.groundHeightM > b.groundHeightM) filteredAbove++;}}
  t.diagnostic(`filtered-level points above the truth: ${filteredAbove}`);
  for (const L of [sharpL, sharpL + 3]) {const s = mountainSampler(body, L);for (const d of dirs.slice(0, 81)) assert.deepEqual(s(d), truth(d), `L${L}`);}
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
