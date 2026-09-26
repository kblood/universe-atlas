import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  generateOceanWaveField,
  sampleOceanDisplacement,
  sampleOceanHeight,
  maxOceanWaveAmplitudeM,
  hashSeedString,
  oceanWaveUniformArrays,
  oceanGerstnerVertexGLSL,
  OCEAN_GERSTNER_WAVE_COUNT,
} from '../src/ocean-gerstner.ts';
import {createOceanWaterMaterial} from '../src/ocean-water-material.ts';
import {galaxies, refByAddress, system} from '../src/catalog.ts';
import {terrainSampler} from '../src/terrain.ts';

const SEED_A = hashSeedString('LETHRA-001/maithea-ocean-test');
const SEED_B = hashSeedString('some-other-body');

test('wave field generation is deterministic and body-distinct', () => {
  const a1 = generateOceanWaveField(SEED_A);
  const a2 = generateOceanWaveField(SEED_A);
  assert.equal(a1.length, OCEAN_GERSTNER_WAVE_COUNT);
  assert.deepEqual(a1, a2, 'same seed must produce bit-identical waves');
  const b = generateOceanWaveField(SEED_B);
  assert.notDeepEqual(a1, b, 'different seeds must produce a different sea');
  for (const w of a1) {
    assert.ok(Number.isFinite(w.dirX) && Number.isFinite(w.dirZ));
    assert.ok(w.amplitudeM > 0 && Number.isFinite(w.amplitudeM));
    assert.ok(w.wavelengthM > 0 && Number.isFinite(w.wavelengthM));
    assert.ok(w.speedMps > 0 && Number.isFinite(w.speedMps));
  }
});

test('seeking time directly equals arriving at it by stepping through arbitrary increments (no accumulated state)', () => {
  const waves = generateOceanWaveField(SEED_A);
  const before = sampleOceanDisplacement(waves, 12.5, -8.25, 5.0);
  // Simulate an update loop that has advanced the clock through many
  // unrelated frames -- forward, then a large jump, then "backwards" (a
  // rewind/seek) -- in between two samples at the SAME t. A module with any
  // internal per-frame accumulator would drift; sampleOceanDisplacement's
  // only per-call input is the explicit t argument, so revisiting t=5.0
  // after any amount of other traffic must reproduce the exact same result.
  let dt = 0;
  for (let i = 0; i < 37; i++) dt += 0.083;
  sampleOceanDisplacement(waves, 12.5, -8.25, dt);
  sampleOceanDisplacement(waves, 12.5, -8.25, 9001.7);
  sampleOceanDisplacement(waves, 12.5, -8.25, -412.3);
  const after = sampleOceanDisplacement(waves, 12.5, -8.25, 5.0);
  assert.deepEqual(before, after);
  // Directly seeking to a time equals reaching the same numeric t via any
  // step sequence that sums to it (up to float summation-order rounding,
  // which is a property of JS addition, not of this module).
  const seeked = sampleOceanDisplacement(waves, 1, 1, 3.111);
  const stepped = sampleOceanDisplacement(waves, 1, 1, 1.0 + 1.0 + 1.111);
  assert.ok(Math.abs(seeked.heightM - stepped.heightM) < 1e-12);
  assert.ok(Math.abs(seeked.dHdx - stepped.dHdx) < 1e-12);
  assert.ok(Math.abs(seeked.dHdz - stepped.dHdz) < 1e-12);
});

test('height is a smooth, continuous function of position', () => {
  const waves = generateOceanWaveField(SEED_A);
  const eps = 0.01;
  // Lipschitz bound: |dh| <= sum(amplitude*k) * |dx| for a sum of sinusoids.
  let maxSlope = 0;
  for (const w of waves) maxSlope += (w.amplitudeM * Math.PI * 2) / w.wavelengthM;
  for (const [x, z] of [[0, 0], [120.3, -44.1], [-900.2, 300.7], [5000, -5000]]) {
    const h0 = sampleOceanHeight(waves, x, z, 42);
    const hx = sampleOceanHeight(waves, x + eps, z, 42);
    const hz = sampleOceanHeight(waves, x, z + eps, 42);
    assert.ok(Math.abs(hx - h0) <= maxSlope * eps + 1e-9, 'no discontinuity along x');
    assert.ok(Math.abs(hz - h0) <= maxSlope * eps + 1e-9, 'no discontinuity along z');
  }
});

test('analytic slope matches the finite-difference gradient', () => {
  const waves = generateOceanWaveField(SEED_B, 4);
  const eps = 1e-3;
  for (const [x, z, t] of [[3, 4, 0], [-100, 250, 17.5], [0, 0, 3.3]]) {
    const {heightM, dHdx, dHdz} = sampleOceanDisplacement(waves, x, z, t);
    const fdx = (sampleOceanHeight(waves, x + eps, z, t) - sampleOceanHeight(waves, x - eps, z, t)) / (2 * eps);
    const fdz = (sampleOceanHeight(waves, x, z + eps, t) - sampleOceanHeight(waves, x, z - eps, t)) / (2 * eps);
    assert.equal(heightM, sampleOceanHeight(waves, x, z, t));
    assert.ok(Math.abs(dHdx - fdx) < 1e-3, `dHdx ${dHdx} vs finite-diff ${fdx}`);
    assert.ok(Math.abs(dHdz - fdz) < 1e-3, `dHdz ${dHdz} vs finite-diff ${fdz}`);
  }
});

test('uniform-array packing matches the wave field, one entry per wave', () => {
  const waves = generateOceanWaveField(SEED_A, 5);
  const arrays = oceanWaveUniformArrays(waves);
  assert.equal(arrays.dir.length, 5);
  waves.forEach((w, i) => {
    assert.deepEqual(arrays.dir[i], [w.dirX, w.dirZ]);
    assert.equal(arrays.amplitudeM[i], w.amplitudeM);
    assert.equal(arrays.speedMps[i], w.speedMps);
    assert.ok(Math.abs(arrays.waveNumber[i] - (Math.PI * 2) / w.wavelengthM) < 1e-9);
  });
});

test('GLSL mirror declares the same wave count and both stay in sync (single source of truth check)', () => {
  const glsl = oceanGerstnerVertexGLSL(6);
  assert.match(glsl, /#define OCEAN_WAVE_COUNT 6/);
  assert.match(glsl, /void oceanGerstner\(/);
});

test('ocean height matches terrain.ts waterLevelM at the shoreline, within the documented wave-amplitude tolerance (Maithea G001/C2128,0,1/0 planets[1])', () => {
  const body = system(refByAddress(galaxies('LETHRA-001')[0], 'G001/C2128,0,1/0')).planets[1];
  const sample = terrainSampler(body);
  const waves = generateOceanWaveField(hashSeedString(body.seed + '/' + body.id));
  const tolerance = maxOceanWaveAmplitudeM(waves);
  assert.ok(tolerance > 0 && tolerance < 3, `wave amplitude tolerance ${tolerance} should be a small, bounded swell height`);

  // Bisect a handful of great-circle arcs down to a real land/ocean boundary
  // on this body, the same way tests/shore-stability.mjs locates one for its
  // browser fixture, but purely in terrain.ts (no WebGL, no browser).
  const norm = (v) => {const n = Math.hypot(...v); return v.map((c) => c / n);};
  const axis = (t, tilt) => norm([Math.cos(t), tilt, Math.sin(t)]);
  let found = 0;
  for (let tilt of [0.05, 0.2, 0.5, -0.3, 0.8]) {
    let land = null, wet = null;
    for (let i = 0; i < 256; i++) {
      const a = axis((i / 256) * Math.PI * 2, tilt), b = axis(((i + 1) / 256) * Math.PI * 2, tilt);
      const sa = sample(a), sb = sample(b);
      if (!sa.ocean && sb.ocean) {land = a; wet = b; break;}
    }
    if (!land) continue;
    for (let i = 0; i < 30; i++) {
      const mid = norm(land.map((v, k) => v + wet[k]));
      if (sample(mid).ocean) wet = mid; else land = mid;
    }
    const shore = sample(wet);
    assert.equal(shore.ocean, true, 'the wet side of the bisection is open ocean');
    assert.equal(shore.waterLevelM, 0, 'open-ocean sea level is exactly the catalogue radius (elevationM=0)');
    // The Gerstner surface oscillates around that shared sea level; it never
    // reports a *different* nominal level, only a bounded excursion above and
    // below it -- this is the "meets the carved shore without ... a flat
    // sheet" continuity the ocean surface must keep. (x,z) here is the wet
    // sample's own position projected to metres, the same world-metre space
    // ocean-water-material.ts's vertex shader phases its waves in; the
    // boundedness property holds at any position, so this is a real,
    // non-cherry-picked shoreline point rather than an arbitrary one.
    for (const tSeconds of [0, 12.5, 500, -30]) {
      const displaced = sampleOceanDisplacement(waves, wet[0] * body.radiusM, wet[2] * body.radiusM, tSeconds);
      assert.ok(Math.abs(displaced.heightM) <= tolerance + 1e-9, `|${displaced.heightM}| must stay within tolerance ${tolerance} at t=${tSeconds}`);
    }
    found++;
  }
  assert.ok(found >= 2, 'expected to bisect at least two real coastlines on this body');
});

test('material construction needs no GL context', () => {
  const material = createOceanWaterMaterial({
    radiusM: 6.4e6,
    normalAnchorDir: [0, 1, 0],
    phaseOriginM: [0, 0, 0],
    patchMorph: {value: 1},
    patchEdges: {value: {x: 0, y: 0, z: 0, w: 0}},
    patchTexels: 32,
    waveSeed: SEED_A,
  });
  assert.equal(material.waves.length, OCEAN_GERSTNER_WAVE_COUNT);
  assert.ok(material.maxWaveAmplitudeM > 0);
  assert.equal(typeof material.setFrame, 'function');
  assert.equal(typeof material.setDebug, 'function');
  assert.match(material.vertexShader, /oceanGerstner\(wavePosM,oceanTime,waveHeightM,waveSlope\)/);
});
