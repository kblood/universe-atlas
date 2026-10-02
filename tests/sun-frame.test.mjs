// W0-SEASON: sun-frame.ts is a pure, three-free restatement of main.ts's
// spinCompensatedSunDirection (main.ts:2667-2673). These tests pin it against
// a real THREE.Vector3 replica of that function over real catalogue planets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { galaxies, sector, system, bodyPosition } from '../src/catalog.ts';
import { spinStateFor, rotationAngleAt } from '../src/stellar-evolution.ts';
import { CATALOGUE_EPOCH_NS, YEAR_NS } from '../src/world-time.ts';
import { spinCompensated, subsolarSinLat, polarAxisWorld, normalizeLikeThree } from '../src/sun-frame.ts';

const SPIN_Y_AXIS = new THREE.Vector3(0, 1, 0), SPIN_X_AXIS = new THREE.Vector3(1, 0, 0);
/** Verbatim replica of main.ts:2667-2673 (spinCompensatedSunDirection). */
function threeSpinCompensated(rawSun, spin, formationNs, t) {
  const angle = rotationAngleAt(spin, formationNs, t);
  const v = new THREE.Vector3(...rawSun);
  v.applyAxisAngle(SPIN_X_AXIS, -spin.axialTiltRad);
  v.applyAxisAngle(SPIN_Y_AXIS, -angle);
  return { out: v.toArray(), angle };
}
/** main.ts:2679-2680's rawSun. */
function threeRawSun(sys, body, t) {
  return new THREE.Vector3(...bodyPosition(sys.stars[0], sys, t))
    .sub(new THREE.Vector3(...bodyPosition(body, sys, t))).normalize().toArray();
}

export function cataloguePlanets(minPlanets, startCx = 900) {
  const g = galaxies('LETHRA-001')[0];
  const out = [];
  for (let cx = startCx; out.length < minPlanets; cx++) {
    if (cx > startCx + 2000) throw new Error('corpus exhausted');
    for (const ref of sector(g, [cx, 0, 0]).refs) {
      const sys = system(ref);
      for (const planet of sys.planets) out.push({ planet, sys });
      if (out.length >= minPlanets) break;
    }
  }
  return out.slice(0, minPlanets);
}

test('parity: spinCompensated and subsolarSinLat match a THREE replica of main.ts within 1e-12 (566 planets x 64 dates)', () => {
  const corpus = cataloguePlanets(566);
  assert.equal(corpus.length, 566);
  let maxVec = 0, maxLat = 0, bitIdentical = 0, total = 0;
  const out = [0, 0, 0];
  for (const { planet, sys } of corpus) {
    const spin = spinStateFor(planet);
    const formationNs = CATALOGUE_EPOCH_NS - 4_000_000_000n * YEAR_NS;
    for (let k = 0; k < 64; k++) {
      // Spread across sub-day, sub-year and multi-year offsets of the epoch.
      const t = CATALOGUE_EPOCH_NS + BigInt(k) * 7_919_000_000_017n + BigInt(k * k) * 1_000_003n;
      const raw = threeRawSun(sys, planet, t);
      const ps = bodyPosition(sys.stars[0], sys, t), pb = bodyPosition(planet, sys, t);
      const mine = normalizeLikeThree(ps[0] - pb[0], ps[1] - pb[1], ps[2] - pb[2], [0, 0, 0]);
      assert.deepEqual(mine, raw, 'normalizeLikeThree must reproduce THREE normalize bit for bit');
      const { out: ref, angle } = threeSpinCompensated(raw, spin, formationNs, t);
      spinCompensated(raw, spin.axialTiltRad, angle, out);
      for (let i = 0; i < 3; i++) maxVec = Math.max(maxVec, Math.abs(out[i] - ref[i]));
      if (out[0] === ref[0] && out[1] === ref[1] && out[2] === ref[2]) bitIdentical++;
      // After the X rotation, y is the subsolar sine latitude; spin about Y keeps it.
      maxLat = Math.max(maxLat, Math.abs(subsolarSinLat(raw, spin.axialTiltRad) - ref[1]));
      total++;
    }
  }
  console.log(`# sun-frame parity: ${total} evaluations, max |dv|=${maxVec.toExponential(2)}, max |d sinLat|=${maxLat.toExponential(2)}, bit-identical vectors ${bitIdentical}/${total}`);
  assert.ok(maxVec <= 1e-12, `spinCompensated max error ${maxVec}`);
  assert.ok(maxLat <= 1e-12, `subsolarSinLat max error ${maxLat}`);
  assert.equal(total, 566 * 64);
});

test('subsolarSinLat is independent of the spin angle and equals dot(sun, polar axis)', () => {
  const sun = [0.3, -0.4, Math.sqrt(1 - 0.25)];
  for (const tilt of [0, 0.4, 1.2, Math.PI / 2, 2.5, Math.PI]) {
    const a = polarAxisWorld(tilt);
    const dot = sun[0] * a[0] + sun[1] * a[1] + sun[2] * a[2];
    assert.ok(Math.abs(subsolarSinLat(sun, tilt) - dot) < 1e-15);
    for (const angle of [0, 1, 2.2, 5.9]) {
      assert.ok(Math.abs(spinCompensated(sun, tilt, angle)[1] - subsolarSinLat(sun, tilt)) < 1e-12);
    }
  }
});

test('sun-frame.ts is pure: no three import, no state', () => {
  const src = readFileSync(new URL('../src/sun-frame.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /from\s+['"]three['"]/);
  assert.doesNotMatch(src, /^import /m, 'sun-frame.ts must not import anything');
});
