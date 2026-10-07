// Instanced fauna proxy seams (docs/transition-audit-2026-10-07.md F12, F13):
// the idle <-> walk stride/bob eases on the dated activity clock instead of
// stepping, the eyes and the 600 m range fade to an exact 0 at the former cuts,
// and the paused-date replay still reproduces draw() byte for byte. Each check
// has a negative case: the former hard step, injected in-test, must fail it.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { faunaHerdAt, faunaMemberGenome, faunaMemberActivityAtWorldNs, faunaRigSecondsAt, toSeconds } from '../src/fauna-runtime.ts';
import { FaunaFieldRenderer, FAUNA_FIELD_EYE_DETAIL_M, FAUNA_FIELD_VISIBLE_M } from '../src/fauna-field-renderer.ts';
import { gaitBlend, eyeDetailWeight, rangeWeight, FAUNA_GAIT_EASE_S, FAUNA_EYE_FADE_START_M, FAUNA_RANGE_FADE_START_M } from '../src/fauna-handoff.ts';
import { CATALOGUE_EPOCH_NS } from '../src/world-time.ts';

const SEED = 'NEAR-RIG-001', BODY = 'sector/4,0,1/system/1/planet/2';
const biome = { weights: [.05, .8, .1, .05], forestPotential: false, moisture: .9, slopeDeg: 6, ocean: false };
function members(count) {
  const out = [];
  for (let i = 0; out.length < count && i < 4000; i++) {
    const a = i * 2.399963, z = 1 - (i + .5) / 2000 * 2, r = Math.sqrt(1 - z * z);
    const herd = faunaHerdAt(SEED, BODY, [Math.cos(a) * r, z, Math.sin(a) * r], biome, { stage: 'complex' }, toSeconds(0));
    if (herd.present) out.push(...herd.members);
  }
  return out.slice(0, count);
}
const MEMBERS = members(4);
const FRAME_NS = 16_000_000n, FRAME_S = .016;
const KIND = { bodies: 0, limbs: 1, feet: 3 };

/** Instance lanes of one animal drawn alone by a fresh renderer (no replay record). */
function drawAlone(genome, timeS, gait, distanceM, stateS, parent = new THREE.Matrix4()) {
  const field = new FaunaFieldRenderer();
  try {
    field.beginFrame(new THREE.Vector3());
    field.submit(genome, parent, timeS, gait, distanceM, undefined, stateS);
    field.endFrame();
    return lanes(field);
  } finally { field.dispose(); }
}
function lanes(field) {
  return field.group.children.map(m => ({ count: m.count, matrices: Array.from(m.instanceMatrix.array.subarray(0, m.count * 16)), colors: Array.from(m.instanceColor?.array.subarray(0, m.count * 3) ?? []) }));
}
/** Feet (first four kind-3 instances) and torso translation of a draw. */
function pose(out) {
  const feet = out[KIND.feet].matrices, torso = out[KIND.bodies].matrices;
  const points = [[torso[12], torso[13], torso[14]]];
  for (let f = 0; f < 4; f++) points.push([feet[f * 16 + 12], feet[f * 16 + 13], feet[f * 16 + 14]]);
  return points;
}
const largestMove = (a, b) => Math.max(...a.map((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1], p[2] - b[i][2])));

/** One member's flip dates from its dated activity clock: idle->walk and walk->idle. */
function flipsOf(member) {
  let ns = CATALOGUE_EPOCH_NS + 5_500_000_000n;
  const a = faunaMemberActivityAtWorldNs(member, ns), g = BigInt(Math.round(member.gaitPeriodS * 1e9));
  // Walk to the next idle window start, then its end (idle->walk) and the walk's end (walk->idle).
  if (a.pose.gait === 'walk') ns += BigInt(Math.round((2 * member.gaitPeriodS - a.stateS) * 1e9));
  else ns += BigInt(Math.round((member.gaitPeriodS - a.stateS) * 1e9)) + 2n * g;
  const idleStart = ns;
  return { idleToWalk: idleStart + g, walkToIdle: idleStart + 3n * g };
}
/** Largest per-16-ms move of the torso and feet across [flip - 0.5 s, flip + 1.2 s]. */
function moveAcross(member, flipNs, continuous) {
  const genome = faunaMemberGenome(member);
  let previous = null, largest = 0, walkSteady = 0;
  for (let k = -32n; k <= 75n; k++) {
    const ns = flipNs + k * FRAME_NS, activity = faunaMemberActivityAtWorldNs(member, ns);
    const p = pose(drawAlone(genome, faunaRigSecondsAt(ns), activity.pose.gait, 10, continuous ? activity.stateS : undefined));
    if (previous) largest = Math.max(largest, largestMove(previous, p));
    previous = p;
  }
  // Reference: the steady walking motion well inside the adjacent walk window
  // (3 s after an idle->walk flip, 3 s before a walk->idle flip).
  for (const steady of [flipNs + 3_000_000_000n, flipNs - 4_200_000_000n]) {
    previous = null;
    for (let k = 0n; k < 75n; k++) {
      const ns = steady + k * FRAME_NS, activity = faunaMemberActivityAtWorldNs(member, ns);
      if (activity.pose.gait !== 'walk') { previous = null; continue; }
      const p = pose(drawAlone(genome, faunaRigSecondsAt(ns), 'walk', 10, undefined));
      if (previous) walkSteady = Math.max(walkSteady, largestMove(previous, p));
      previous = p;
    }
  }
  assert.ok(walkSteady > 0, 'a steady walking reference exists');
  return { largest, walkSteady, genome };
}
/** Continuity contract: no frame moves a part more than steady walking plus the ease's own share. */
function assertGaitContinuous({ largest, walkSteady, genome }, label) {
  // The ease adds at most 1.5 / 0.6 s of amplitude per second on top of the walk.
  const easeShare = 1.5 / FAUNA_GAIT_EASE_S * FRAME_S * (genome.strideLength * .24 + genome.legLength * .15);
  assert.ok(largest <= walkSteady + easeShare + 1e-6, `${label}: ${largest.toFixed(4)} m in one frame > ${(walkSteady + easeShare).toFixed(4)} m (hard step)`);
}

test('gaitBlend is the near rig ease on the dated clock: continuous across both flips; an injected step fails', () => {
  const step = (gait) => gait === 'idle' ? 0 : 1;
  const continuity = (f, label) => {
    // Flip with windows of 12 s: idle 0..12 s, then walk from 0 s.
    let previous = null;
    for (let t = 11.5; t < 13.5; t += FRAME_S) {
      const gait = t < 12 ? 'idle' : 'walk', stateS = t < 12 ? t : t - 12, w = f(gait, stateS);
      assert.ok(w >= 0 && w <= 1);
      if (previous !== null) assert.ok(Math.abs(w - previous) <= 1.5 / FAUNA_GAIT_EASE_S * FRAME_S + 1e-9, `${label}: |delta| ${Math.abs(w - previous).toFixed(4)} per 16 ms (hard step)`);
      previous = w;
    }
    // ...and walk -> idle.
    previous = null;
    for (let t = 23.5; t < 25.5; t += FRAME_S) {
      const gait = t < 24 ? 'walk' : 'idle', stateS = t < 24 ? t - 12 : t - 24, w = f(gait, stateS);
      if (previous !== null) assert.ok(Math.abs(w - previous) <= 1.5 / FAUNA_GAIT_EASE_S * FRAME_S + 1e-9, `${label}: |delta| ${Math.abs(w - previous).toFixed(4)} per 16 ms (hard step)`);
      previous = w;
    }
  };
  continuity(gaitBlend, 'gaitBlend');
  assert.equal(gaitBlend('walk', 0), 0); assert.equal(gaitBlend('walk', FAUNA_GAIT_EASE_S), 1);
  assert.equal(gaitBlend('idle', 0), 1); assert.equal(gaitBlend('idle', FAUNA_GAIT_EASE_S), 0);
  assert.throws(() => continuity(step, 'injected step'), /hard step/);
});

test('instanced proxy limbs and bob stay continuous across real dated idle/walk flips; the former binary gait fails', () => {
  let failingLegacy = 0;
  for (const member of MEMBERS) {
    const flips = flipsOf(member);
    for (const [name, ns] of Object.entries(flips)) {
      const before = faunaMemberActivityAtWorldNs(member, ns - FRAME_NS), after = faunaMemberActivityAtWorldNs(member, ns + FRAME_NS);
      assert.notEqual(before.pose.gait, after.pose.gait, `${member.id} ${name}: the clock flips here`);
      assertGaitContinuous(moveAcross(member, ns, true), `${member.id} ${name}`);
      // Negative: the same dates through the former binary gait (no stateS).
      try { assertGaitContinuous(moveAcross(member, ns, false), `${member.id} ${name} legacy`); } catch (error) { if (/hard step/.test(error.message)) failingLegacy++; else throw error; }
    }
  }
  assert.equal(failingLegacy, MEMBERS.length * 2, 'every legacy flip shows the step');
});

test('eye and range weights are monotone, eased, exactly 0 at the former cuts; an injected step fails', () => {
  const sweep = (f, from, to, cut, start, label) => {
    let previous = f(from);
    const width = cut - start, slope = 1.5 / width;
    for (let d = from + .01; d <= to; d += .01) {
      const w = f(d);
      assert.ok(w <= previous + 1e-15, `${label}: monotone at ${d.toFixed(2)} m`);
      assert.ok(previous - w <= slope * .01 + 1e-9, `${label}: ${(previous - w).toFixed(4)} drop over 1 cm at ${d.toFixed(2)} m (hard step)`);
      previous = w;
    }
    assert.equal(f(cut), 0, `${label}: exact 0 at the cut`);
    assert.equal(f(cut + 1e-9), 0); assert.equal(f(1e9), 0); assert.equal(f(Number.NaN), 0);
    assert.equal(f(start), 1, `${label}: unchanged inside the fade start`);
    assert.equal(f(0), 1);
  };
  sweep(eyeDetailWeight, 0, 80, FAUNA_FIELD_EYE_DETAIL_M, FAUNA_EYE_FADE_START_M, 'eyes');
  sweep(rangeWeight, 500, 650, FAUNA_FIELD_VISIBLE_M, FAUNA_RANGE_FADE_START_M, 'range');
  // Negative: the former cuts.
  assert.throws(() => sweep(d => d <= FAUNA_FIELD_EYE_DETAIL_M ? 1 : 0, 0, 80, FAUNA_FIELD_EYE_DETAIL_M + .01, FAUNA_EYE_FADE_START_M, 'eye step'), /hard step/);
  assert.throws(() => sweep(d => d <= FAUNA_FIELD_VISIBLE_M ? 1 : 0, 500, 650, FAUNA_FIELD_VISIBLE_M + .01, FAUNA_RANGE_FADE_START_M, 'range step'), /hard step/);
});

test('drawn eyes shrink through the fade and vanish at 60 m; the animal scales to nothing at 600 m', () => {
  const member = MEMBERS[0], genome = faunaMemberGenome(member), a = faunaMemberActivityAtWorldNs(member, CATALOGUE_EPOCH_NS);
  const at = (d, stateS = a.stateS) => drawAlone(genome, 3, a.pose.gait, d, stateS);
  const base = at(10)[KIND.bodies].count;
  // Eye instances follow the torso, neck-head and head bodies: indices 2 and 3 of kind 0.
  const eye = out => out[KIND.bodies].count >= 4 ? Math.hypot(...out[KIND.bodies].matrices.slice(2 * 16, 2 * 16 + 3)) : 0;
  assert.equal(base, 4, 'torso, head and two eyes inside 50 m');
  assert.ok(Math.abs(eye(at(10)) - .025) < 1e-7, 'full-size eyes inside the fade');
  assert.ok(Math.abs(eye(at(55)) - .025 * eyeDetailWeight(55)) < 1e-7, 'eyes scale with the fade weight');
  assert.equal(at(FAUNA_FIELD_EYE_DETAIL_M)[KIND.bodies].count, 2, 'no eye instances at the former cut');
  assert.equal(at(FAUNA_FIELD_EYE_DETAIL_M - 1e-3)[KIND.bodies].count, 4);
  // Without stateS (the current planet call) the former cut applies unchanged.
  assert.equal(drawAlone(genome, 3, a.pose.gait, 55, undefined)[KIND.bodies].count, 4);
  assert.ok(Math.abs(Math.hypot(...drawAlone(genome, 3, a.pose.gait, 55, undefined)[KIND.bodies].matrices.slice(32, 35)) - .025) < 1e-7);
  // Range: a uniform scale about the ground point, exactly nothing at 600 m.
  const torso = d => Math.hypot(...at(d)[KIND.bodies].matrices.slice(0, 3));
  assert.ok(Math.abs(torso(580) / torso(500) - rangeWeight(580)) < 1e-6, 'the whole animal scales by the range weight');
  assert.equal(torso(FAUNA_RANGE_FADE_START_M), torso(100), 'unchanged inside the range fade');
  assert.ok(at(FAUNA_FIELD_VISIBLE_M).every(m => m.count === 0), 'nothing drawn at the former range cut');
  const translation = d => at(d)[KIND.bodies].matrices.slice(12, 15);
  assert.ok(Math.abs(translation(580)[1] / translation(500)[1] - rangeWeight(580)) < 1e-6, 'local offsets shrink toward the ground point');
});

test('paused-date replay reproduces draw() byte for byte, with stateS and the eye/range weights in the record', () => {
  const member = MEMBERS[1], genome = faunaMemberGenome(member), ns = CATALOGUE_EPOCH_NS + 7_000_000_000n;
  const activity = faunaMemberActivityAtWorldNs(member, ns), timeS = faunaRigSecondsAt(ns), key = {};
  let negatives = 0;
  for (const [distanceM, stateS] of [[10, activity.stateS], [55, activity.stateS], [580, activity.stateS], [10, .3], [55, undefined], [10, undefined]]) {
    const field = new FaunaFieldRenderer();
    try {
      const frame = (eye, d = distanceM, s = stateS) => {
        const parent = new THREE.Matrix4().makeRotationY(.7).setPosition(eye);
        field.beginFrame(new THREE.Vector3());
        field.submit(genome, parent, timeS, activity.pose.gait, d, key, s);
        field.endFrame();
        return { out: lanes(field), parent };
      };
      // Frame 1 draws (new date), frame 2 records, frames 3-4 replay, the eye moving.
      frame(new THREE.Vector3(1, 2, 3)); frame(new THREE.Vector3(1, 2, 3));
      for (const eye of [new THREE.Vector3(1, 2, 3), new THREE.Vector3(-40.5, 2.25, 17)]) {
        const { out, parent } = frame(eye);
        assert.deepEqual(out, drawAlone(genome, timeS, activity.pose.gait, distanceM, stateS, parent), `${distanceM} m stateS ${stateS}: replay = draw`);
      }
      if (stateS !== undefined) {
        // A different stateS at the same date (and a different eye weight) must
        // not replay the stale record: the output follows the new inputs...
        const eye = new THREE.Vector3(1, 2, 3), stale = frame(eye).out;
        const changed = frame(eye, distanceM, stateS + .2);
        assert.deepEqual(changed.out, drawAlone(genome, timeS, activity.pose.gait, distanceM, stateS + .2, changed.parent));
        // ...and that matters: a record that ignored stateS would have kept `stale`.
        if (stateS + .2 < FAUNA_GAIT_EASE_S) { assert.notDeepEqual(changed.out, stale, 'negative: stale lanes differ'); negatives++; }
        const nearer = frame(eye, distanceM - .5, stateS + .2);
        assert.deepEqual(nearer.out, drawAlone(genome, timeS, activity.pose.gait, distanceM - .5, stateS + .2, nearer.parent));
      }
    } finally { field.dispose(); }
  }
  assert.ok(negatives >= 1, 'the stale-record negative ran');
});
