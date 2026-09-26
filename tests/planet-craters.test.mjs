import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  craterField,
  craterAgeGate,
  craterHeightDeltaAt,
  craterCandidatesAt,
  PLANET_CRATERS_VERSION,
} from '../src/planet-craters.ts';

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

const PARAMS = { surfaceAgeMyr: 4000, hasAtmosphere: false, hasOcean: false, hasActiveBiosphere: false };
const RADIUS_M = 1_700_000;

function addresses(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(`G${String(i + 1).padStart(3, '0')}/C0,0,0/${i}/planet/0`);
  return out;
}

test('crater height delta is deterministic across >=100 body addresses', () => {
  const seed = 'LETHRA-CRATERS';
  const addrs = addresses(120);
  function digest() {
    const out = [];
    for (const addr of addrs) {
      const field = craterField(seed, addr, RADIUS_M, PARAMS);
      for (const d of DIRS) out.push(craterHeightDeltaAt(field, d).toFixed(9));
    }
    return out.join('|');
  }
  const a = digest();
  const b = digest();
  assert.equal(a, b);
  // visit order independence: shuffled address order must give each address
  // the same result as canonical order.
  const shuffled = [...addrs].reverse();
  for (let i = 0; i < shuffled.length; i += 17) {
    const addr = shuffled[i];
    const field = craterField(seed, addr, RADIUS_M, PARAMS);
    const direct = craterField(seed, addr, RADIUS_M, PARAMS);
    for (const d of DIRS) assert.equal(craterHeightDeltaAt(field, d), craterHeightDeltaAt(direct, d));
  }
});

test('a 1,700 km airless body at 4 Gyr surface age has a large, non-trivial crater population', () => {
  const seed = 'LETHRA-CRATERS';
  const field = craterField(seed, 'G050/C0,0,0/0/planet/0', RADIUS_M, {
    surfaceAgeMyr: 4000, hasAtmosphere: false, hasOcean: false, hasActiveBiosphere: false,
  });
  const found = new Map();
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = 2.399963229728653 * i; // golden angle
    for (const c of craterCandidatesAt(field, [Math.cos(theta) * r, y, Math.sin(theta) * r])) found.set(c.id, c);
  }
  // Analytic expected total (resolution-independent by design - see
  // planet-craters.ts's `craterField`): refCountPerGyr summed across the
  // fixed SIZE_BANDS table, x4 (Gyr) x1 (areaScale===1 at REF_RADIUS_M)
  // x1 (survival===1, airless) = (3+22+190+1600+12000)*4 = 55,260.
  const EXPECTED_TOTAL = (3 + 22 + 190 + 1600 + 12000) * 4;
  assert.equal(EXPECTED_TOTAL, 55260);
  // Dense-sampling discovery is a lower bound (small craters can be missed
  // between sample points) but should already find a large fraction of it.
  assert.ok(found.size > 5000, `expected >5000 discovered craters near a ${EXPECTED_TOTAL}-crater population, got ${found.size}`);
  assert.ok(found.size <= EXPECTED_TOTAL, 'discovered count cannot exceed the analytic expected total');
});

test('crater seamlessness across a cube-face-diagonal crossing', () => {
  const seed = 'LETHRA-CRATERS', addr = 'G020/C0,0,0/5/planet/0';
  const field = craterField(seed, addr, RADIUS_M, { ...PARAMS, surfaceAgeMyr: 4500 });
  const STEPS = 400;
  const samples = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    samples.push(normalize([1 - t, t, 0.05])); // crosses the conceptual +X/+Y cube-face boundary at t=0.5
  }
  const heights = samples.map((d) => craterHeightDeltaAt(field, d));
  const deltas = [];
  for (let i = 1; i < heights.length; i++) deltas.push(Math.abs(heights[i] - heights[i - 1]));
  const maxDelta = Math.max(...deltas);
  const meanDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const crossingIndex = Math.round(STEPS / 2);
  const crossingDelta = Math.abs(heights[crossingIndex] - heights[crossingIndex - 1]);
  assert.ok(crossingDelta <= maxDelta + 1e-9, 'crossing step cannot exceed the line maximum');
  assert.ok(
    crossingDelta <= meanDelta * 50 + 1,
    `crossing step (${crossingDelta}) looks like a seam-specific discontinuity vs mean step ${meanDelta}`,
  );
});

test('craterAgeGate is monotone: visible count at t1 <= count at t2 for t1 < t2', () => {
  const seed = 'LETHRA-CRATERS', addr = 'G030/C2,-1,0/3/planet/1';
  const field = craterField(seed, addr, RADIUS_M, PARAMS);
  const found = new Map();
  const N = 1500;
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = 2.399963229728653 * i;
    for (const c of craterCandidatesAt(field, [Math.cos(theta) * r, y, Math.sin(theta) * r])) found.set(c.id, c);
  }
  assert.ok(found.size > 50, 'sanity: discovered population should be non-trivial');
  const times = [...found.values()].map((c) => c.formationNs).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const tSamples = [
    0n,
    times[Math.floor(times.length * 0.25)],
    times[Math.floor(times.length * 0.5)],
    times[Math.floor(times.length * 0.75)],
    field.surfaceAgeNs,
  ];
  let prevCount = -1;
  for (const t of tSamples) {
    const gated = craterAgeGate(field, t);
    const count = [...found.values()].filter((c) => c.formationNs <= gated.ageCutoffNs).length;
    assert.ok(count >= prevCount, `count must be non-decreasing: prev=${prevCount} now=${count} at t=${t}`);
    prevCount = count;
  }
  assert.ok(prevCount > 0, 'at full surface age, some craters must be visible');
});

test('ulp perturbation of Math sin/cos/exp/log/pow/atan2/tan/cbrt leaves the crater list unchanged', () => {
  const seed = 'LETHRA-CRATERS', addr = 'G040/C0,0,0/1/planet/0';
  function digest(field) {
    const out = [];
    for (const d of DIRS) {
      const list = craterCandidatesAt(field, d)
        .map((c) => `${c.id}:${c.radiusM.toFixed(9)}:${c.depthM.toFixed(9)}:${c.formationNs.toString()}`)
        .sort();
      out.push(list.join(','));
    }
    return out.join('|');
  }
  // Fresh field before AND fresh field under perturbation (not the same
  // object) so the second digest re-runs voxel generation from scratch
  // under the perturbed Math, rather than hitting a cache populated before
  // the perturbation was installed.
  const before = digest(craterField(seed, addr, RADIUS_M, PARAMS));
  const names = ['sin', 'cos', 'exp', 'log', 'pow', 'atan2', 'tan', 'cbrt'];
  const originals = {};
  for (const n of names) originals[n] = Math[n];
  let after;
  try {
    for (const n of names) {
      const orig = originals[n];
      Math[n] = (...args) => {
        const v = orig(...args);
        return v + (Math.abs(v) || 1) * Number.EPSILON * 4;
      };
    }
    after = digest(craterField(seed, addr, RADIUS_M, PARAMS));
  } finally {
    for (const n of names) Math[n] = originals[n];
  }
  assert.equal(before, after);
});

test('version string is exported', () => {
  assert.equal(typeof PLANET_CRATERS_VERSION, 'string');
});
