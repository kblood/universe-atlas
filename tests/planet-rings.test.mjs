import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ringSystemFor, ringActiveAt, rocheLimitM, createRingMesh, PLANET_RINGS_VERSION } from '../src/planet-rings.ts';

function addresses(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(`G${String(i + 1).padStart(3, '0')}/C0,0,0/${i}/planet/0`);
  return out;
}

function giantParams(overrides = {}) {
  return {
    massKg: 1.9e27,
    radiusM: 6e7,
    hasRingFlag: true,
    starDistanceAu: 5.2,
    temperatureK: 130,
    axialTiltRad: 0.5,
    ...overrides,
  };
}

test('ring systems are deterministic across >=100 body addresses', () => {
  const seed = 'LETHRA-RINGS';
  const addrs = addresses(120);
  function digest() {
    const out = [];
    for (const addr of addrs) {
      const ring = ringSystemFor(seed, addr, giantParams());
      out.push(JSON.stringify(ring, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
    }
    return out.join('|');
  }
  assert.equal(digest(), digest());
  // visit-order independence
  for (const addr of [...addrs].reverse().filter((_, i) => i % 11 === 0)) {
    const a = ringSystemFor(seed, addr, giantParams());
    const b = ringSystemFor(seed, addr, giantParams());
    assert.deepEqual(a, b);
  }
});

test('hasRingFlag=false always returns null', () => {
  const seed = 'LETHRA-RINGS';
  for (const addr of addresses(20)) {
    assert.equal(ringSystemFor(seed, addr, giantParams({ hasRingFlag: false })), null);
  }
});

test('ring bounds are physically ordered: radiusM < innerM < outerM <= Roche bound', () => {
  const seed = 'LETHRA-RINGS';
  const bodies = [
    giantParams({ massKg: 1.9e27, radiusM: 6e7, temperatureK: 130 }), // icy, Saturn-ish
    giantParams({ massKg: 8.68e25, radiusM: 2.5e7, temperatureK: 55, starDistanceAu: 19 }), // ice giant, cold
    giantParams({ massKg: 5e24, radiusM: 3.5e6, temperatureK: 320, starDistanceAu: 0.9 }), // hot rocky "ringed super-Earth"
    giantParams({ massKg: 6e26, radiusM: 4e7, temperatureK: 400, starDistanceAu: 0.3 }), // very hot, close-in
  ];
  for (const addr of addresses(50)) {
    for (const params of bodies) {
      const ring = ringSystemFor(seed, addr, params);
      const roche = rocheLimitM(params);
      if (ring === null) continue; // valid: Roche bound can fall inside the safety margin
      assert.ok(params.radiusM < ring.innerM, 'inner edge must clear the body radius');
      assert.ok(ring.innerM < ring.outerM, 'inner edge must be strictly inside the outer edge');
      assert.ok(ring.outerM <= roche + 1e-6, 'outer edge must not exceed the Roche bound');
      for (const gap of ring.gaps) {
        assert.ok(gap.innerM >= ring.innerM - 1e-6 && gap.outerM <= ring.outerM + 1e-6, 'gaps must sit inside the ring span');
        assert.ok(gap.innerM <= gap.outerM);
      }
      for (const band of ring.bands) {
        assert.ok(band.opacity >= 0 && band.opacity <= 1);
        assert.ok(band.innerM <= band.outerM);
      }
    }
  }
});

test('ringActiveAt respects [birthNs, deathNs)', () => {
  const seed = 'LETHRA-RINGS';
  for (const addr of addresses(60)) {
    const ring = ringSystemFor(seed, addr, giantParams());
    if (!ring) continue;
    assert.equal(ringActiveAt(ring, ring.birthNs - 1n), false);
    assert.equal(ringActiveAt(ring, ring.birthNs), true);
    if (ring.deathNs !== null) {
      assert.equal(ringActiveAt(ring, ring.deathNs - 1n), true);
      assert.equal(ringActiveAt(ring, ring.deathNs), false);
    } else {
      assert.equal(ringActiveAt(ring, ring.birthNs + 10_000_000_000_000_000n), true);
    }
  }
});

test('ulp perturbation of Math sin/cos/exp/log/pow/atan2/tan/cbrt leaves ring existence and bounds unchanged', () => {
  const seed = 'LETHRA-RINGS';
  const addrs = addresses(40);
  function digest() {
    const out = [];
    for (const addr of addrs) {
      const ring = ringSystemFor(seed, addr, giantParams());
      out.push(ring === null ? 'null' : JSON.stringify(ring, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
    }
    return out.join('|');
  }
  const before = digest();
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
    after = digest();
  } finally {
    for (const n of names) Math[n] = originals[n];
  }
  assert.equal(before, after);
});

test('createRingMesh builds geometry/material objects without a WebGL context', () => {
  const ring = ringSystemFor('LETHRA-RINGS', 'G099/C0,0,0/1/planet/0', giantParams());
  assert.ok(ring);
  const mesh = createRingMesh(ring);
  assert.ok(mesh.isMesh);
  assert.ok(mesh.geometry.isBufferGeometry);
  assert.ok(mesh.material.isMaterial);
  assert.equal(mesh.rotation.x, ring.tiltRad);
  mesh.geometry.dispose();
  mesh.material.dispose();
});

test('version string is exported', () => {
  assert.equal(typeof PLANET_RINGS_VERSION, 'string');
});
