// Acceptance (W3-INTEGRATE, docs/biome-climate-increment-1-plan-2026-10-02.json):
// the orbit colour and the ground classifier read ONE climate field. This closes
// the baseline audit's orbit/ground mismatch gate (white orbit peaks over ground
// that classified as temperate, and the reverse).
//
// On 20k land directions x 4 water worlds, at the same post-landform height:
//  - terrainSampler's colour === waterWorldLandColour(climate) x grain x localGrain;
//  - classifier weights[3] (snow) === that climate's snowFraction;
//  - classifier effectiveMoisture === that climate's effectiveMoisture;
//  - the classifier's 'Alpine / polar snow' label and forestPotential agree with
//    the same snow and forest-suitability numbers the colour mixed in.
// And the orbit bake (planetSurface, the texture the orbit view draws) stores
// exactly terrainSampler's colour per pixel, so the chain reaches the orbit view.
//
// Run this file explicitly (never the tests/acceptance/ directory; see helpers.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planetSurface, waterWorldLandColour } from '../../src/terrain.ts';
import { biomeClassifier, BIOME_VERSION } from '../../src/surface-biomes.ts';
import { climateForcingFor, createClimateSample, surfaceClimate, temperateHabitat, CLIMATE_VERSION } from '../../src/surface-climate.ts';
import { galaxies, sector, system } from '../../src/catalog.ts';
import { waterWorlds } from '../terrain-climate-fixtures.mjs';
// T6 decision 3: the global agreement statistic reads the level-0 field; the orbit bake IS the level-0 field (T4).
import { statisticSampler, fullOnly } from '../helpers/statistic-level.mjs';
// The agreement scan, with the independent grain derivation (written out, not imported from src, so a drifted shared
// helper is caught rather than reused), is SCANS.agreement.
import { scanBodies, inOrder, logScan } from '../helpers/body-chunks.mjs';

const N = 20000;

// Re-pinned for P4-RELIEF: surface-biomes-2.1-sea-datum (gates and climate datum
// relative to the current sea level). Re-pinned for BIOME2-CLIMATE M1: surface-climate-2
// (old surface-climate-1.1-geo-g; PDD snow, warm-column lapse, warmest-month ceiling,
// heat cap, PET moisture, ITCZ band). The agreement assertions below are unchanged.
test('versions: the agreement is between surface-biomes-2.1-sea-datum and surface-climate-2', () => {
  assert.equal(BIOME_VERSION, 'surface-biomes-2.1-sea-datum');
  assert.equal(CLIMATE_VERSION, 'surface-climate-2');
});

// Pointwise agreement, run on two samplers: level 0 by default, the carved truth (terrainSampler) in test:full (T6
// Astra review: the agreement is pointwise, so the truth copy is kept). The per-world scan (the whole sphere, M = 3 N
// Fibonacci directions so every world has >= N land, the independent grain copy and every per-direction assert) is
// SCANS.agreement in tests/helpers/body-chunks.mjs (O3, docs/truth-scan-chunks-2026-10-07.md): level 0 in-process, the
// truth one worker thread per water world. The log and the non-vacuity assert run here, in world order.
async function agreement(mode, workers) {
  assert.equal(waterWorlds().length, 4);
  const scan = await scanBodies('agreement', 'waterWorlds', mode, { workers }); logScan('agreement', mode, scan);
  for (const { body, value: { land, snowLabel, forest, partialSnow } } of inOrder(scan)) {
    assert.ok(land >= N, `${body.name}: ${land} land directions, need ${N}`);
    // Non-vacuity: each world must exercise the snow or forest branch.
    console.log(`# ${body.name}: land ${land}, snow-labelled ${snowLabel}, forestPotential ${forest}, partial snow ${partialSnow}`);
    assert.ok(snowLabel + forest > 0, `${body.name} exercises the climate branches`);
  }
}
test('orbit/tile colour and ground classifier agree on 20k land directions x 4 water worlds', () => agreement('level0', 0));
test('colour and classifier agree on the carved truth, 20k land directions x 4 water worlds (test:full)',
  fullOnly('truth agreement solves M3 blocks'), () => agreement('truth', 4));

test('the orbit bake stores terrainSampler colour per pixel (orbit view = sampler = classifier)', () => {
  for (const body of waterWorlds()) {
    const W = 256, H = W / 2, surface = planetSurface(body, W, 16);
    // The bake samples level 0 (mountains cost plan T4, sparse-global caller), so the per-pixel identity is with the
    // level-0 sampler (before T6 the two were the same field).
    const sample = statisticSampler(body), classify = biomeClassifier(body);
    const climate = surfaceClimate(climateForcingFor(body)), o = createClimateSample();
    let land = 0, white = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = (x + .5) / W, v = (y + .5) / H, theta = u * Math.PI * 2, phi = v * Math.PI;
      const d = [-Math.cos(theta) * Math.sin(phi), Math.cos(phi), Math.sin(theta) * Math.sin(phi)];
      const s = sample(d), i = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) if (surface.data[i + c] !== Math.trunc(s.color[c]))
        assert.fail(`${body.name} pixel ${x},${y} ch${c}: ${surface.data[i + c]} !== trunc(${s.color[c]})`);
      if (s.ocean) continue;
      land++;
      climate(d, s.groundHeightM, o);
      const b = classify(d, s.groundHeightM);
      assert.equal(b.weights[3], o.snowFraction);
      if (b.name === 'Alpine / polar snow') {
        white++;
        // A snow-labelled pixel is at least 60% of the way to the snow white.
        const noSnow = waterWorldLandColour({ ...o, snowFraction: 0 }, s.groundHeightM);
        const got = waterWorldLandColour(o, s.groundHeightM);
        const snowWhite = [216, 228, 226];
        for (let c = 0; c < 3; c++) if (Math.abs(snowWhite[c] - noSnow[c]) > 1e-9)
          assert.ok((got[c] - noSnow[c]) / (snowWhite[c] - noSnow[c]) > .6 - 1e-12);
      }
    }
    console.log(`# ${body.name} orbit ${W}x${H}: land ${land}, snow-labelled ${white}`);
    assert.ok(land > 0);
  }
});

// BIOME2-CLIMATE M1 acceptance 2 (plan v2 P1 step 6): the polar-ITCZ branch is a main path. Corpus = the
// W0-CLIMATE definition (temperate-habitat bodies of the first 2000 systems from sector x = 266 of LETHRA-001,
// land share >= 1 % on 8000 Fibonacci directions, level-0 sampler). Selected: ITCZ (argmax row of the annual
// insolation table) poleward of 45 deg. Judged: >= 50 land samples both within 10 deg of the ITCZ and 18-35 deg
// from it. Every judged planet must have mean effective moisture near the ITCZ >= in its subsidence band.
// Negative: the shipped surface-climate-1.1 rule (legacyMoisture - 0.0425 x fixed sin-lat 0.18-0.52 belt; legacy
// noise is unchanged by M1) fails it on many planets (step-0 baseline: 93 of 213 judged).
test('polar ITCZ: every judged corpus planet is wetter near the ITCZ than 18-35 deg from it (shipped belt fails)', t => {
  const g0 = galaxies('LETHRA-001')[0], CN = 8000, D = 180 / Math.PI;
  const fibN = i => { const y = 1 - 2 * (i + .5) / CN, p = i * 2.399963229728653, r = Math.sqrt(1 - y * y); return [Math.cos(p) * r, y, Math.sin(p) * r]; };
  const sm = (x, lo, hi) => { const u = Math.max(0, Math.min(1, (x - lo) / (hi - lo))); return u * u * (3 - 2 * u); };
  const shippedBelt = x => sm(x, .15, .21) * (1 - sm(x, .49, .55));
  const corpus = []; let systems = 0;
  for (let sx = 266; systems < 2000; sx++) for (const ref of sector(g0, [sx, 0, 0]).refs) {
    if (systems >= 2000) break; systems++;
    for (const b of system(ref).planets) if (temperateHabitat(b)) corpus.push(b);
  }
  let selected = 0, judged = 0, shippedFails = 0; const fails = [];
  for (const b of corpus) {
    const f = climateForcingFor(b);
    if (!(f.itczLatDeg > 45)) continue; // not selected; land share is only needed for selected bodies
    const ts = statisticSampler(b), c = surfaceClimate(f), s = createClimateSample();
    let land = 0; const near = [0, 0, 0], sub = [0, 0, 0];
    for (let i = 0; i < CN; i++) {
      const d = fibN(i), x = ts(d); if (x.ocean) continue; land++;
      c(d, x.groundHeightM, s);
      const ax = Math.min(1, Math.abs(d[1])), dI = Math.abs(Math.asin(ax) * D - f.itczLatDeg);
      const shipped = s.legacyMoisture - .0425 * shippedBelt(ax);
      if (dI <= 10) { near[0]++; near[1] += s.effectiveMoisture; near[2] += shipped; }
      else if (dI >= 18 && dI <= 35) { sub[0]++; sub[1] += s.effectiveMoisture; sub[2] += shipped; }
    }
    if (100 * land / CN < 1) continue;
    selected++;
    if (near[0] < 50 || sub[0] < 50) continue;
    judged++;
    if (!(near[1] / near[0] >= sub[1] / sub[0])) fails.push({ id: b.id, near: near[1] / near[0], sub: sub[1] / sub[0] });
    if (!(near[2] / near[0] >= sub[2] / sub[0])) shippedFails++;
  }
  t.diagnostic(JSON.stringify({ corpus: corpus.length, selected, judged, fails: fails.length, shippedFails }));
  assert.equal(selected, 311, 'selected polar-ITCZ planets (plan v2: 311)');
  assert.equal(judged, 213, 'judged planets (>= 50 land samples in both bands)');
  assert.deepEqual(fails, [], 'every judged planet passes');
  assert.ok(shippedFails >= 50, `negative: the shipped fixed belt fails ${shippedFails} judged planets (baseline 93)`);
});
