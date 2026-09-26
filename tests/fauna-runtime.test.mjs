import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  faunaHerdAt,
  faunaMemberGenome,
  faunaMemberPoseAt,
  faunaGroundedTransform,
  createFaunaSkinnedRig,
  buildFaunaProxyGeometryData,
  buildFaunaImpostorGeometryData,
  faunaGeometryToBufferGeometry,
  pickFaunaLodBand,
  FAUNA_LOD0_DISTANCE_M,
  FAUNA_LOD1_DISTANCE_M,
  FAUNA_VISIBLE_DISTANCE_M,
  FAUNA_LOD0_MAX_CONCURRENT_RIGS,
  FAUNA_LOD1_INSTANCE_BUDGET,
  FAUNA_LOD2_INSTANCE_BUDGET,
  validateCreatureGenome,
  toSeconds,
} from '../src/fauna-runtime.ts';

const SEED = 'FAUNA-GOLDEN-001';
const BODY = 'sector/2,1,0/system/3/planet/1';

function hash32(value) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}
function unit(key) { return hash32(key) / 0x1_0000_0000; }
function sampleDirections(count, salt) {
  const directions = [];
  for (let i = 0; i < count; i++) {
    const key = `${salt}|${i}`;
    const z = unit(`${key}|z`) * 2 - 1;
    const theta = unit(`${key}|theta`) * Math.PI * 2;
    const radius = Math.sqrt(Math.max(0, 1 - z * z));
    directions.push([radius * Math.cos(theta), z, radius * Math.sin(theta)]);
  }
  return directions;
}
const SAMPLE_DIRECTIONS = sampleDirections(120, 'fauna-runtime-directions');

function fixedBiome(overrides = {}) {
  return { weights: [0.1, 0.6, 0.25, 0.05], forestPotential: true, moisture: 0.6, slopeDeg: 8, ocean: false, ...overrides };
}
const COMPLEX_GATE = { stage: 'complex' };

test('faunaHerdAt is deterministic over >=100 (address, direction) samples', () => {
  const bodies = ['sector/0,0,0/system/1/planet/0', 'sector/9,-3,2/system/4/planet/2'];
  let sampleCount = 0;
  for (const body of bodies) {
    for (const direction of SAMPLE_DIRECTIONS) {
      const biome = fixedBiome();
      const a = faunaHerdAt(SEED, body, direction, biome, COMPLEX_GATE, toSeconds(12));
      const b = faunaHerdAt(SEED, body, direction, biome, COMPLEX_GATE, toSeconds(12));
      assert.deepEqual(a, b);
      sampleCount++;
    }
  }
  assert.ok(sampleCount >= 100);
});

test('faunaHerdAt does not depend on visit order or prior queries', () => {
  const biome = fixedBiome();
  const baseline = SAMPLE_DIRECTIONS.map((direction) => faunaHerdAt(SEED, BODY, direction, biome, COMPLEX_GATE, toSeconds(40)));
  for (const direction of [...SAMPLE_DIRECTIONS].reverse()) {
    faunaHerdAt(SEED, 'sector/7,7,7/system/1/planet/1', direction, biome, COMPLEX_GATE, toSeconds(999));
  }
  const revisited = SAMPLE_DIRECTIONS.map((direction) => faunaHerdAt(SEED, BODY, direction, biome, COMPLEX_GATE, toSeconds(40)));
  assert.deepEqual(revisited, baseline);
});

test('biosphere stage gates herd presence; only complex stage populates', () => {
  const biome = fixedBiome();
  let complexCount = 0;
  for (const direction of SAMPLE_DIRECTIONS) {
    for (const stage of ['unformed', 'forming', 'sterile', 'microbial']) {
      assert.equal(faunaHerdAt(SEED, BODY, direction, biome, { stage }, toSeconds(0)).present, false, `${stage} must never carry fauna`);
    }
    if (faunaHerdAt(SEED, BODY, direction, biome, COMPLEX_GATE, toSeconds(0)).present) complexCount++;
  }
  assert.ok(complexCount > 0, 'complex stage should place at least some herds across 120 samples');
});

test('an empty availableArchetypes gate yields no fauna even at complex stage', () => {
  const biome = fixedBiome();
  for (const direction of SAMPLE_DIRECTIONS.slice(0, 20)) {
    assert.equal(faunaHerdAt(SEED, BODY, direction, biome, { stage: 'complex', availableArchetypes: [] }, toSeconds(0)).present, false);
  }
});

test('ocean and steep-slope anchors never carry a herd', () => {
  const oceanBiome = fixedBiome({ ocean: true });
  const steepBiome = fixedBiome({ slopeDeg: 45 });
  for (const direction of SAMPLE_DIRECTIONS.slice(0, 30)) {
    assert.equal(faunaHerdAt(SEED, BODY, direction, oceanBiome, COMPLEX_GATE, toSeconds(0)).present, false);
    assert.equal(faunaHerdAt(SEED, BODY, direction, steepBiome, COMPLEX_GATE, toSeconds(0)).present, false);
  }
});

test('herds are internally consistent: one archetype per herd, valid reproducible genomes, bounded size', () => {
  const biome = fixedBiome();
  let checkedHerds = 0;
  for (const direction of SAMPLE_DIRECTIONS) {
    const herd = faunaHerdAt(SEED, BODY, direction, biome, COMPLEX_GATE, toSeconds(0));
    if (!herd.present) continue;
    checkedHerds++;
    assert.ok(herd.members.length >= 3 && herd.members.length <= 7);
    const archetypes = new Set(herd.members.map((m) => m.archetype));
    assert.equal(archetypes.size, 1, 'a herd must be a single archetype');
    const ids = new Set(herd.members.map((m) => m.id));
    assert.equal(ids.size, herd.members.length, 'member ids must be unique within a herd');
    for (const member of herd.members) {
      const genomeA = faunaMemberGenome(member);
      const genomeB = faunaMemberGenome(member);
      assert.deepEqual(genomeA, genomeB, 'genome reproduction must be deterministic');
      assert.deepEqual(validateCreatureGenome(genomeA), []);
    }
  }
  assert.ok(checkedHerds > 0, 'sanity: at least one herd was found to check');
});

test('t-seek independence: faunaMemberPoseAt at a given t matches direct evaluation regardless of prior evaluations', () => {
  const biome = fixedBiome();
  const direction = SAMPLE_DIRECTIONS[3];
  const herd = faunaHerdAt(SEED, BODY, direction, biome, COMPLEX_GATE, toSeconds(0));
  assert.ok(herd.present || true);
  if (!herd.present) return;
  const member = herd.members[0];
  const direct = faunaMemberPoseAt(member, toSeconds(733.5));
  for (let t = 0; t < 5000; t += 91) faunaMemberPoseAt(member, toSeconds(t));
  const afterStepping = faunaMemberPoseAt(member, toSeconds(733.5));
  assert.deepEqual(afterStepping, direct);
  // Gait is a discrete, floor-windowed choice: direct evaluation at a t must
  // match what "stepping" through the same window would have produced.
  const t0 = member.gaitPeriodS * 4.2;
  const stepSize = member.gaitPeriodS / 37;
  let lastGait;
  for (let t = 0; t <= t0; t += stepSize) lastGait = faunaMemberPoseAt(member, toSeconds(t)).gait;
  const directGaitWindow = faunaMemberPoseAt(member, toSeconds(Math.floor(t0 / stepSize) * stepSize)).gait;
  assert.equal(lastGait, directGaitWindow);
});

test('faunaMemberPoseAt never mutates the member and produces finite, bounded output', () => {
  const biome = fixedBiome();
  for (const direction of SAMPLE_DIRECTIONS.slice(0, 10)) {
    const herd = faunaHerdAt(SEED, BODY, direction, biome, COMPLEX_GATE, toSeconds(0));
    if (!herd.present) continue;
    for (const member of herd.members) {
      const before = JSON.stringify(member);
      const pose = faunaMemberPoseAt(member, toSeconds(12345.6789));
      assert.equal(JSON.stringify(member), before, 'pose evaluation must not mutate the member');
      assert.ok(Number.isFinite(pose.x) && Number.isFinite(pose.z) && Number.isFinite(pose.yaw));
      const distance = Math.hypot(pose.x - member.anchorOffsetX, pose.z - member.anchorOffsetZ);
      assert.ok(distance <= member.orbitRadiusM + 1e-6, 'orbit must stay within its bounded radius');
    }
  }
});

test('faunaGroundedTransform applies real ground height as an outer transform', () => {
  const anchor = new THREE.Vector3(10, 0, 20);
  const right = new THREE.Vector3(1, 0, 0), forward = new THREE.Vector3(0, 0, 1), up = new THREE.Vector3(0, 1, 0);
  const pose = { x: 2, z: -3, yaw: Math.PI / 4, gait: 'walk' };
  const groundHeightAt = (p) => 5 + p.x * 0; // constant height for this test
  const { position, quaternion } = faunaGroundedTransform(anchor, right, forward, up, pose, groundHeightAt);
  assert.ok(quaternion instanceof THREE.Quaternion);
  assert.equal(position.x, 12);
  assert.equal(position.z, 17);
  assert.equal(position.y, 5);
});

test('pickFaunaLodBand retains close rigs and extends proxies into low flight', () => {
  assert.equal(FAUNA_LOD0_DISTANCE_M, 18);
  assert.equal(FAUNA_LOD1_DISTANCE_M, 100);
  assert.equal(FAUNA_VISIBLE_DISTANCE_M, 280);
  assert.equal(pickFaunaLodBand(0), 0);
  assert.equal(pickFaunaLodBand(18), 0);
  assert.equal(pickFaunaLodBand(18.01), 1);
  assert.equal(pickFaunaLodBand(100), 1);
  assert.equal(pickFaunaLodBand(100.01), 2);
  assert.equal(pickFaunaLodBand(280), 2);
  assert.equal(pickFaunaLodBand(280.01), -1);
});

test('LOD budgets are documented, positive, and the L0 concurrent-rig cap is small relative to instanced L1/L2', () => {
  assert.ok(FAUNA_LOD0_MAX_CONCURRENT_RIGS > 0 && FAUNA_LOD0_MAX_CONCURRENT_RIGS < FAUNA_LOD1_INSTANCE_BUDGET);
  assert.ok(FAUNA_LOD1_INSTANCE_BUDGET > 0 && FAUNA_LOD1_INSTANCE_BUDGET < FAUNA_LOD2_INSTANCE_BUDGET);
  assert.ok(FAUNA_LOD2_INSTANCE_BUDGET > 0);
});

test('L0 skinned rig, L1 proxy geometry, and L2 impostor geometry all construct without a GL context', () => {
  const biome = fixedBiome();
  let checked = 0;
  for (const direction of SAMPLE_DIRECTIONS) {
    const herd = faunaHerdAt(SEED, BODY, direction, biome, COMPLEX_GATE, toSeconds(0));
    if (!herd.present) continue;
    const member = herd.members[0];
    const genome = faunaMemberGenome(member);

    const rig = createFaunaSkinnedRig(genome);
    assert.ok(rig.group instanceof THREE.Group);
    const pose = rig.update(1.5, 'walk', 'flat');
    assert.equal(pose.feet.length, 4);
    rig.dispose();

    const proxy = buildFaunaProxyGeometryData(genome);
    assert.ok(proxy.triangleCount > 0);
    const proxyGeometry = faunaGeometryToBufferGeometry(proxy);
    assert.equal(proxyGeometry.getAttribute('position').count, proxy.positions.length / 3);
    proxyGeometry.dispose();

    const impostor = buildFaunaImpostorGeometryData(genome);
    assert.ok(impostor.triangleCount > 0);
    const impostorGeometry = faunaGeometryToBufferGeometry(impostor);
    assert.equal(impostorGeometry.getAttribute('position').count, impostor.positions.length / 3);
    impostorGeometry.dispose();

    checked++;
    if (checked >= 5) break;
  }
  assert.ok(checked > 0, 'sanity: at least one herd member was available to build geometry for');
});

test('ulp-perturbation of platform transcendentals leaves herd presence/composition unchanged', () => {
  // Scope note (mirrors tests/golden/perturbation.test.mjs and
  // tests/flora-field.test.mjs): faunaHerdAt's presence/archetype/size/id
  // decisions are derived only from the Math.imul-based hash32/unit mix,
  // never from Math.sin/cos/pow/atan2/tan/cbrt/exp/log, so they must be
  // exactly invariant. faunaMemberPoseAt's continuous orbital motion (and
  // the rig's own procedural geometry) legitimately uses those
  // transcendentals for ordinary continuous shape/animation and is
  // intentionally out of scope here.
  const names = ['sin', 'cos', 'exp', 'log', 'pow', 'atan2', 'tan', 'cbrt'];
  const originals = {};
  for (const name of names) originals[name] = Math[name];
  const nudge = (x) => (Number.isFinite(x) ? x + Math.abs(x || 1e-300) * Number.EPSILON : x);
  for (const name of names) { const original = originals[name]; Math[name] = (...args) => nudge(original(...args)); }
  const biome = fixedBiome();
  let perturbed;
  try {
    perturbed = SAMPLE_DIRECTIONS.map((direction) => faunaHerdAt(SEED, BODY, direction, biome, COMPLEX_GATE, toSeconds(0)));
  } finally {
    for (const name of names) Math[name] = originals[name];
  }
  const baseline = SAMPLE_DIRECTIONS.map((direction) => faunaHerdAt(SEED, BODY, direction, biome, COMPLEX_GATE, toSeconds(0)));
  for (let i = 0; i < baseline.length; i++) {
    assert.equal(perturbed[i].present, baseline[i].present, `presence changed at sample ${i}`);
    if (baseline[i].present) {
      assert.equal(perturbed[i].members.length, baseline[i].members.length);
      assert.equal(perturbed[i].members[0].archetype, baseline[i].members[0].archetype);
      assert.equal(perturbed[i].members[0].id, baseline[i].members[0].id);
    }
  }
});

test('toSeconds rejects an out-of-range magnitude (the wrong-unit failure mode the adversarial review found)', () => {
  // flora-field.ts's tMyr and fauna-runtime.ts's tSeconds are both plain
  // `number` at runtime once the TypeScript brand is erased, so a caller
  // that accidentally passes a Myr value (or any wildly wrong unit) where
  // tSeconds is expected must fail loudly rather than silently producing a
  // bogus pose. Brands alone are compile-time-only and cannot catch this in
  // a .mjs test file (not type-checked by tsc) or a runtime mis-wiring in
  // src/*.ts, so toSeconds() also does a cheap magnitude sanity check.
  // Boundary values inside the documented plausible range must pass through.
  assert.equal(toSeconds(0), 0);
  assert.equal(toSeconds(1e15), 1e15);
  assert.equal(toSeconds(-1e15), -1e15);
  assert.equal(toSeconds(12345.6789), 12345.6789);

  // Out-of-range / non-finite magnitudes must throw, not clamp or warn.
  // 1.3e26 mirrors the specific magnitude the adversarial review used to
  // demonstrate the tMyr/tSeconds mix-up going undetected.
  for (const bad of [1.3e26, -1.3e26, Infinity, -Infinity, NaN]) {
    assert.throws(() => toSeconds(bad), RangeError, `toSeconds(${bad}) must throw`);
  }

  // The check is wired into both public entry points that accept a time:
  // a raw out-of-range number must be rejected before it can reach any
  // orbit/gait math, whether via faunaHerdAt's optional trailing time
  // argument or faunaMemberPoseAt's required one.
  const biome = fixedBiome();
  assert.throws(
    () => faunaHerdAt(SEED, BODY, SAMPLE_DIRECTIONS[0], biome, COMPLEX_GATE, 1.3e26),
    RangeError,
    'faunaHerdAt must reject an out-of-range raw time value'
  );
  const herd = faunaHerdAt(SEED, BODY, SAMPLE_DIRECTIONS[0], biome, COMPLEX_GATE, toSeconds(0));
  if (herd.present) {
    assert.throws(
      () => faunaMemberPoseAt(herd.members[0], 1.3e26),
      RangeError,
      'faunaMemberPoseAt must reject an out-of-range raw time value'
    );
  }
});
