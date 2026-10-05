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
import { hash64, noise } from '../../src/catalog.ts';
import { terrainSampler, planetSurface, waterWorldLandColour } from '../../src/terrain.ts';
import { biomeClassifier, BIOME_VERSION } from '../../src/surface-biomes.ts';
import { climateForcingFor, createClimateSample, surfaceClimate, CLIMATE_VERSION } from '../../src/surface-climate.ts';
import { fib, waterWorlds } from '../terrain-climate-fixtures.mjs';

const N = 20000;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
/** Independent grain derivation (written out, not imported), so a drifted
 * shared helper is caught rather than reused. Mirrors terrain-climate-colour. */
function grainOf(body) {
  const code = Number(hash64(body.seed + '/macro-v1') & 0xffffffffn);
  const n = (d, f, seed) => noise(d[0] * f + 13, d[1] * f + 37, d[2] * f + 19, code + seed);
  // terrain-1.8.1-grain (mountains step G, owner decision (b)): the 800 m local grain
  // of water-world land colour is .952 + n x .096 (was .88 + n x .24).
  return d => [0.91 + n(d, 115, 35) * 0.18, .952 + n(d, body.radiusM / 800, 74) * .096];
}

// Re-pinned for P4-RELIEF: surface-biomes-2.1-sea-datum (gates and climate datum
// relative to the current sea level) and surface-climate-1.1-geo-g (lapse gravity
// from planet-geophysics). The agreement assertions below are unchanged.
test('versions: the agreement is between surface-biomes-2.1-sea-datum and surface-climate-1.1-geo-g', () => {
  assert.equal(BIOME_VERSION, 'surface-biomes-2.1-sea-datum');
  assert.equal(CLIMATE_VERSION, 'surface-climate-1.1-geo-g');
});

test('orbit/tile colour and ground classifier agree on 20k land directions x 4 water worlds', () => {
  const worlds = waterWorlds();
  assert.equal(worlds.length, 4);
  for (const body of worlds) {
    assert.ok(body.water > 0 && body.type !== 'Ice world', `${body.name} is a liquid-water world`);
    const sample = terrainSampler(body), classify = biomeClassifier(body);
    const climate = surfaceClimate(climateForcingFor(body)), o = createClimateSample(), grain = grainOf(body);
    let land = 0, snowLabel = 0, forest = 0, partialSnow = 0;
    // The WHOLE sphere (uniform Fibonacci set), never a prefix: a prefix of the
    // Fibonacci order is one polar cap. M is sized so every world has >= N land.
    const M = 3 * N;
    for (let i = 0; i < M; i++) {
      const d = fib(i, M), s = sample(d);
      if (s.ocean) continue;
      land++;
      const h = s.groundHeightM; // includeCraters=false: post-landform, pre-crater
      climate(d, h, o);
      const [g, l] = grain(d);
      const expected = waterWorldLandColour(o, h).map(v => clamp(v * g * l, 0, 255));
      if (s.color[0] !== expected[0] || s.color[1] !== expected[1] || s.color[2] !== expected[2])
        assert.fail(`${body.name} colour ${d}: ${s.color} !== ${expected}`);
      const b = classify(d, h);
      if (b.weights[3] !== o.snowFraction || b.snowFraction !== o.snowFraction)
        assert.fail(`${body.name} snow ${d}: classifier ${b.weights[3]}/${b.snowFraction} !== climate ${o.snowFraction}`);
      if (b.effectiveMoisture !== o.effectiveMoisture)
        assert.fail(`${body.name} moisture ${d}: classifier ${b.effectiveMoisture} !== climate ${o.effectiveMoisture}`);
      if (b.annualMeanTempK !== o.annualMeanTempK || b.climateCode !== o.climateCode)
        assert.fail(`${body.name} temperature/code ${d}: classifier disagrees with climate`);
      if ((b.name === 'Alpine / polar snow') !== (o.snowFraction > .6 && !b.ocean))
        assert.fail(`${body.name} label ${d}: '${b.name}' vs snowFraction ${o.snowFraction}`);
      if (b.forestPotential && !(o.forestSuitability01 > 0 && b.forestSuitability01 === o.forestSuitability01))
        assert.fail(`${body.name} forest ${d}: forestPotential without the colour's forest suitability`);
      snowLabel += b.name === 'Alpine / polar snow'; forest += b.forestPotential; partialSnow += o.snowFraction > 0 && o.snowFraction < 1;
    }
    assert.ok(land >= N, `${body.name}: ${land} land directions, need ${N}`);
    // Non-vacuity: each world must exercise the snow or forest branch.
    console.log(`# ${body.name}: land ${land}, snow-labelled ${snowLabel}, forestPotential ${forest}, partial snow ${partialSnow}`);
    assert.ok(snowLabel + forest > 0, `${body.name} exercises the climate branches`);
  }
});

test('the orbit bake stores terrainSampler colour per pixel (orbit view = sampler = classifier)', () => {
  for (const body of waterWorlds()) {
    const W = 256, H = W / 2, surface = planetSurface(body, W, 16);
    const sample = terrainSampler(body, undefined, undefined, false), classify = biomeClassifier(body);
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
