import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAtmosphereLut,
  sampleAtmosphereLut,
  createAtmosphereShell,
  ATMOSPHERE_LUT_WIDTH,
  ATMOSPHERE_LUT_HEIGHT,
} from '../src/sky-atmosphere.ts';
import {PlanetAtmosphere} from '../src/planet-atmosphere.ts';
import {galaxies, refByAddress, system} from '../src/catalog.ts';
import * as THREE from 'three';

const PARAMS = {atmosphereHeight: 0.012, radius: 1, groundAlbedo: [0.35, 0.32, 0.28], seed: 0x1234abcd};

test('LUT generation is deterministic', () => {
  const width = 32, height = 16;
  const a = new Uint8Array(width * height * 4), b = new Uint8Array(width * height * 4);
  buildAtmosphereLut(a, width, height, PARAMS);
  buildAtmosphereLut(b, width, height, PARAMS);
  assert.deepEqual([...a], [...b]);
  const differentSeed = new Uint8Array(width * height * 4);
  buildAtmosphereLut(differentSeed, width, height, {...PARAMS, seed: PARAMS.seed ^ 0xffffffff});
  assert.notDeepEqual([...a], [...differentSeed]);
});

test('LUT is finite (no NaN/Infinity) across the full sun-angle range, including grazing and full night', () => {
  const width = ATMOSPHERE_LUT_WIDTH, height = ATMOSPHERE_LUT_HEIGHT;
  const data = new Uint8Array(width * height * 4);
  buildAtmosphereLut(data, width, height, PARAMS);
  for (const b of data) {
    assert.ok(Number.isFinite(b) && b >= 0 && b <= 255);
  }
  // The x axis IS the sun-relative "twilight" angle: x=0 is full night, the
  // terminator band sits mid-range, x=width-1 is fully lit. Sample all three
  // explicitly, at every altitude row, through the CPU mirror of the
  // fragment shader's read.
  for (let y = 0; y < height; y++) {
    const altitude = y / (height - 1);
    for (const twilight of [0, 0.001, 0.44, 0.5, 0.575, 0.999, 1]) {
      const s = sampleAtmosphereLut(data, width, height, twilight, altitude);
      for (const v of [s.r, s.g, s.b, s.day]) assert.ok(Number.isFinite(v) && v >= 0 && v <= 1);
    }
  }
});

test('LUT day weight rises from night to lit through the terminator band', () => {
  const width = 64, height = 8;
  const data = new Uint8Array(width * height * 4);
  buildAtmosphereLut(data, width, height, PARAMS);
  const night = sampleAtmosphereLut(data, width, height, 0, 0.5);
  const dusk = sampleAtmosphereLut(data, width, height, 0.5, 0.5);
  const day = sampleAtmosphereLut(data, width, height, 1, 0.5);
  assert.ok(night.day < dusk.day, 'day weight must rise leaving full night');
  assert.ok(dusk.day < day.day, 'day weight must keep rising into full daylight');
  // Sunset colours: the terminator band should read warmer (relatively more
  // red than blue) than either the deep-night or full-day samples.
  const warmth = (s) => s.r - s.b;
  assert.ok(warmth(dusk) > warmth(day), 'the terminator band should be warmer/redder than full daylight');
});

test('sky-view shell (mesh/material/LUT) constructs without a GL context and caches the LUT build cost', () => {
  const shell = createAtmosphereShell(PARAMS);
  assert.ok(shell.mesh.isMesh);
  assert.ok(shell.material.isShaderMaterial);
  assert.ok(shell.lut.isDataTexture);
  assert.equal(shell.lut.image.width, ATMOSPHERE_LUT_WIDTH);
  assert.equal(shell.lut.image.height, ATMOSPHERE_LUT_HEIGHT);
  assert.ok(shell.buildCostMs >= 0 && Number.isFinite(shell.buildCostMs));
  const before = shell.lut.image.data.slice();
  // update() must never rebuild the LUT (it's per-body, built once): the
  // texture pixels are untouched by moving the sun.
  shell.update(new THREE.Vector3(0, 0, 2), new THREE.Vector3(1, 0, 0));
  shell.update([0.1, 0.2, 1.5], [0, 1, 0]);
  assert.deepEqual([...shell.lut.image.data], [...before]);
  shell.dispose();
});

test('update() performs no per-call allocation of its own uniforms (same Vector3 identity across calls)', () => {
  const shell = createAtmosphereShell(PARAMS);
  shell.update([1, 0, 0], [0, 1, 0]);
  const eyeRef = shell.material.uniforms.eye.value;
  const sunRef = shell.material.uniforms.sun.value;
  shell.update([2, 3, 4], [1, 1, 0]);
  assert.equal(shell.material.uniforms.eye.value, eyeRef, 'eye uniform Vector3 is reused, not replaced');
  assert.equal(shell.material.uniforms.sun.value, sunRef, 'sun uniform Vector3 is reused, not replaced');
  assert.ok(Math.abs(sunRef.length() - 1) < 1e-9, 'sun direction is normalised');
  shell.dispose();
});

test('PlanetAtmosphere (adapter) preserves its exact existing public API and constructs from a real catalogue body', () => {
  const body = system(refByAddress(galaxies('LETHRA-001')[0], 'G001/C2128,0,1/0')).planets[1];
  const atmosphere = new PlanetAtmosphere(body);
  assert.ok(atmosphere.mesh.isMesh);
  assert.equal(typeof atmosphere.update, 'function');
  assert.equal(typeof atmosphere.dispose, 'function');
  assert.ok(atmosphere.uniforms.sun);
  atmosphere.update(new THREE.Vector3(0, 0, 1.1), new THREE.Vector3(1, 0, 0));
  assert.ok(atmosphere.lutBuildCostMs >= 0);
  atmosphere.dispose();
});
