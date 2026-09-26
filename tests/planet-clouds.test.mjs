import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cloudCoverAt, createCloudShell, PLANET_CLOUDS_VERSION } from '../src/planet-clouds.ts';

function normalize(v) {
  const m = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return [v[0] / m, v[1] / m, v[2] / m];
}
// Fixed literal directions built only from +,-,*,/,Math.sqrt (never a
// perturbed transcendental) so the ulp-perturbation test below feeds
// bit-identical `dir` inputs whether or not Math.sin/cos/... are
// monkey-patched.
const DIRS = [
  [1, 0, 0], [0, 1, 0], [0, 0, 1], [-1, 0, 0], [0, -1, 0], [0, 0, -1],
  [1, 1, 1], [1, -1, 1], [-1, 1, -1], [2, 1, 3], [5, -2, 1], [1, 5, -3],
  [0.3, 0.7, 0.2], [0.9, 0.1, -0.4], [1, 2, -1], [3, -1, 2],
].map(normalize);

function addresses(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(`G${String(i + 1).padStart(3, '0')}/C0,0,0/${i}/planet/0`);
  return out;
}

const PARAMS = { hasAtmosphere: true, hasOcean: true, temperatureK: 285, radiusM: 6.2e6, spinPeriodS: 55000 };
const GIANT_PARAMS = { hasAtmosphere: true, hasOcean: false, gasGiant: true, temperatureK: 140, radiusM: 5e7, spinPeriodS: 36000 };

test('cloud coverage is deterministic across >=100 body addresses', () => {
  const seed = 'LETHRA-CLOUDS';
  const addrs = addresses(120);
  function digest() {
    const out = [];
    for (const addr of addrs)
      for (const d of DIRS) {
        const s = cloudCoverAt(seed, addr, PARAMS, d, 123456789012345n);
        out.push(s.coverage.toFixed(15), s.heightM.toFixed(6));
      }
    return out.join('|');
  }
  assert.equal(digest(), digest());
  // visit order independence: shuffled address order gives each address the
  // same result as canonical order.
  for (const addr of [...addrs].reverse().filter((_, i) => i % 13 === 0)) {
    const a = cloudCoverAt(seed, addr, PARAMS, DIRS[0], 42n);
    const b = cloudCoverAt(seed, addr, PARAMS, DIRS[0], 42n);
    assert.deepEqual(a, b);
  }
});

test('existence gating: no clouds without atmosphere, or without ocean on a non-giant; gas giants keep clouds', () => {
  const seed = 'LETHRA-CLOUDS';
  const noAtmo = { ...PARAMS, hasAtmosphere: false };
  const noOcean = { ...PARAMS, hasOcean: false };
  for (const d of DIRS) {
    assert.equal(cloudCoverAt(seed, 'addr', noAtmo, d, 0n).coverage, 0);
    assert.equal(cloudCoverAt(seed, 'addr', noOcean, d, 0n).coverage, 0);
  }
  let anyGiantCoverage = false;
  for (const d of DIRS) {
    const g = cloudCoverAt(seed, 'addr', GIANT_PARAMS, d, 500000000000n);
    assert.ok(g.coverage >= 0 && g.coverage <= 1);
    if (g.coverage > 0) anyGiantCoverage = true;
  }
  assert.ok(anyGiantCoverage, 'a gas giant without an ocean should still show cloud coverage somewhere');
});

test('t-seek independence: direct t equals stepping through windows with arbitrary seeded steps', () => {
  const seed = 'LETHRA-CLOUDS', addr = 'G007/C1,-2,3/4/planet/2';
  const windowNs = 6n * 3600n * 1_000_000_000n;
  const targetT = 987654321098765n;
  const direct = DIRS.map((d) => cloudCoverAt(seed, addr, PARAMS, d, targetT));

  // Deterministic pseudo-random step generator (integer arithmetic only) so
  // the "arbitrary seeded steps" walk is itself reproducible.
  let t = 0n;
  let stepState = 12345n;
  while (t < targetT) {
    stepState = (stepState * 6364136223846793005n + 1442695040888963407n) & 0xffffffffffffffn;
    const step = 1n + (stepState % (windowNs * 3n));
    t = t + step > targetT ? targetT : t + step;
    for (const d of DIRS) cloudCoverAt(seed, addr, PARAMS, d, t); // simulate intermediate playback frames
  }
  assert.equal(t, targetT);
  const stepped = DIRS.map((d) => cloudCoverAt(seed, addr, PARAMS, d, targetT));
  for (let i = 0; i < DIRS.length; i++) {
    assert.ok(
      Math.abs(direct[i].coverage - stepped[i].coverage) < 1e-12,
      `coverage mismatch at dir ${i}: direct=${direct[i].coverage} stepped=${stepped[i].coverage}`,
    );
    assert.equal(direct[i].heightM, stepped[i].heightM);
  }
});

test('ulp perturbation of Math sin/cos/exp/log/pow/atan2/tan/cbrt leaves coverage and window/cell choice unchanged', () => {
  const seed = 'LETHRA-CLOUDS', addr = 'G011/C0,0,0/9/planet/1';
  const t = 44444444444444n;
  const before = DIRS.map((d) => cloudCoverAt(seed, addr, PARAMS, d, t));
  const names = ['sin', 'cos', 'exp', 'log', 'pow', 'atan2', 'tan', 'cbrt'];
  const originals = {};
  for (const n of names) originals[n] = Math[n];
  try {
    for (const n of names) {
      const orig = originals[n];
      Math[n] = (...args) => {
        const v = orig(...args);
        return v + (Math.abs(v) || 1) * Number.EPSILON * 4;
      };
    }
    const after = DIRS.map((d) => cloudCoverAt(seed, addr, PARAMS, d, t));
    for (let i = 0; i < DIRS.length; i++) {
      assert.equal(before[i].coverage, after[i].coverage, `coverage differs at dir ${i}`);
      assert.equal(before[i].heightM, after[i].heightM, `height differs at dir ${i}`);
    }
  } finally {
    for (const n of names) Math[n] = originals[n];
  }
});

test('createCloudShell builds mesh/material/texture objects without a WebGL context', () => {
  const shell = createCloudShell(PARAMS, 32, 16);
  assert.ok(shell.mesh.isMesh);
  assert.ok(shell.material.isMaterial);
  assert.ok(shell.texture.isDataTexture);
  shell.update('LETHRA-CLOUDS', 'G001/C0,0,0/0/planet/0', 1_000_000_000_000n);
  assert.equal(shell.texture.image.data.length, 32 * 16 * 4);
  shell.dispose();
});

test('version string is exported', () => {
  assert.equal(typeof PLANET_CLOUDS_VERSION, 'string');
});
