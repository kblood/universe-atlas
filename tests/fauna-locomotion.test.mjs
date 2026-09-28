import test from 'node:test';
import assert from 'node:assert/strict';
import { faunaHerdAt, faunaMemberGenome, faunaMemberActivityAtWorldNs, faunaMemberPoseAtWorldNs, faunaRigSecondsAt, toSeconds } from '../src/fauna-runtime.ts';
import { faunaGroundHeight, FAUNA_GROUND_N, FAUNA_GROUND_STEP_M, FAUNA_GROUND_HALF_M } from '../src/fauna-ground.ts';
import { createQuadrupedPlan, QUADRUPED_BONE_PARENTS } from '../src/fauna-body-plan.ts';
import { quadrupedPoseAt, faunaGaitSchedule } from '../src/fauna-locomotion.ts';
import { CATALOGUE_EPOCH_NS, NS } from '../src/world-time.ts';

const SEED = 'LOCOMOTION-001', BODY = 'sector/1,2,3/system/2/planet/1';
const biome = { weights: [.05, .8, .1, .05], forestPotential: false, moisture: .9, slopeDeg: 6, ocean: false };
function members(count = 6) {
  const out = [], seen = new Set();
  for (let i = 0; out.length < count && i < 4000; i++) {
    const a = i * 2.399963, z = 1 - (i + .5) / 2000 * 2, r = Math.sqrt(1 - z * z);
    const herd = faunaHerdAt(SEED, BODY, [Math.cos(a) * r, z, Math.sin(a) * r], biome, { stage: 'complex' }, toSeconds(0));
    if (herd.present && !seen.has(herd.members[0].archetype)) { seen.add(herd.members[0].archetype); out.push(herd.members[0]); }
  }
  return out;
}
const MEMBERS = members(4);
// A sloping, uneven stencil: 1.5 m of relief across the herd plus local bumps.
const grid = new Float64Array(FAUNA_GROUND_N ** 2);
for (let j = 0; j < FAUNA_GROUND_N; j++) for (let i = 0; i < FAUNA_GROUND_N; i++) {
  const x = i * FAUNA_GROUND_STEP_M - FAUNA_GROUND_HALF_M, z = j * FAUNA_GROUND_STEP_M - FAUNA_GROUND_HALF_M;
  grid[j * FAUNA_GROUND_N + i] = 120 + x * .05 - z * .03 + Math.sin(i * 1.7 + j) * .6;
}
const ground = (x, z) => faunaGroundHeight(grid, x, z);
const poseAt = (member, plan, ns) => quadrupedPoseAt(plan, member, faunaMemberActivityAtWorldNs(member, ns), ground, faunaRigSecondsAt(ns));
const round = value => JSON.parse(JSON.stringify(value, (_, v) => typeof v === 'number' ? Math.round(v * 1e9) / 1e9 : ArrayBuffer.isView(v) ? Array.from(v, x => Math.round(x * 1e9) / 1e9) : v));
const cyclePeriodNs = member => 3n * BigInt(Math.round(member.gaitPeriodS * 1e9));

test('fixture covers every archetype with real herd members', () => {
  assert.deepEqual(MEMBERS.map(m => m.archetype).sort(), ['browser', 'long-neck', 'low-slung', 'runner']);
});

test('activity adapter preserves the canonical exact-date pose', () => {
  for (const member of MEMBERS) for (const ns of [CATALOGUE_EPOCH_NS, CATALOGUE_EPOCH_NS + 12_345_678_901n, 10n ** 40n]) {
    const activity = faunaMemberActivityAtWorldNs(member, ns);
    assert.deepEqual(activity.pose, faunaMemberPoseAtWorldNs(member, ns));
    assert.ok(activity.travel >= 0 && activity.travel < 1 && activity.stateS >= 0 && activity.stateS < member.gaitPeriodS * 2 + 1e-6);
  }
});

test('pose is a pure function of the date: A-B-A replay and far-future seeks', () => {
  for (const member of MEMBERS) {
    const plan = createQuadrupedPlan(faunaMemberGenome(member));
    for (const ns of [CATALOGUE_EPOCH_NS + 7_250_000_000n, 10n ** 30n + 3n, CATALOGUE_EPOCH_NS - 99n * NS]) {
      const a = round(poseAt(member, plan, ns));
      poseAt(member, plan, ns + 987_654_321n); poseAt(member, plan, CATALOGUE_EPOCH_NS);
      assert.deepEqual(round(poseAt(member, plan, ns)), a);
    }
  }
});

test('footholds are planted on the stencil and never slide, across idle and walk windows', t => {
  for (const member of MEMBERS) {
    const genome = faunaMemberGenome(member), plan = createQuadrupedPlan(genome), schedule = faunaGaitSchedule(plan, member, faunaMemberActivityAtWorldNs(member, CATALOGUE_EPOCH_NS).revolutionS);
    t.diagnostic(`${member.archetype}: ${schedule.cyclesPerRevolution} cycles/orbit, ${schedule.cycleM.toFixed(2)} m/cycle, ${schedule.frequencyHz.toFixed(2)} Hz`);
    assert.ok(schedule.frequencyHz > .25 && schedule.frequencyHz < 2.5, 'plausible walking cadence');
    const start = CATALOGUE_EPOCH_NS, stop = start + cyclePeriodNs(member), step = NS / 30n;
    let previous = null, planted = 0, states = new Set(), maxJointStep = 0, maxPenetration = 0, maxReach = 0;
    for (let ns = start; ns <= stop; ns += step) {
      const pose = poseAt(member, plan, ns);
      states.add(pose.state);
      maxPenetration = Math.max(maxPenetration, pose.maxPenetration); maxReach = Math.max(maxReach, pose.maxReachError);
      if (pose.state === 'walk') assert.ok(pose.feet.filter(f => f.stance).length >= 2, 'a walk always supports the body on two or more feet');
      for (const foot of pose.feet) if (foot.stance) assert.ok(Math.abs(foot.contact[1] - ground(foot.contact[0], foot.contact[2])) < 1e-9, 'stance contact lies on the stencil');
      if (previous) {
        for (let i = 0; i < 4; i++) if (previous.feet[i].stance && pose.feet[i].stance) {
          const a = previous.feet[i].contact, b = pose.feet[i].contact;
          assert.ok(Math.hypot(a[0] - b[0], a[2] - b[2]) < 1e-6, `${member.archetype} ${pose.feet[i].id} planted foot slid`); planted++;
        }
        // Joint continuity in the herd frame: no pops at idle/walk boundaries.
        const c0 = Math.cos(previous.root.yaw), s0 = Math.sin(previous.root.yaw), c1 = Math.cos(pose.root.yaw), s1 = Math.sin(pose.root.yaw);
        for (let j = 0; j < QUADRUPED_BONE_PARENTS.length; j++) {
          const p = previous.joints.subarray(j * 3, j * 3 + 3), q = pose.joints.subarray(j * 3, j * 3 + 3);
          const ax = previous.root.x + p[0] * c0 + p[2] * s0, az = previous.root.z + p[0] * s0 - p[2] * c0, ah = previous.root.h + p[1];
          const bx = pose.root.x + q[0] * c1 + q[2] * s1, bz = pose.root.z + q[0] * s1 - q[2] * c1, bh = pose.root.h + q[1];
          maxJointStep = Math.max(maxJointStep, Math.hypot(ax - bx, az - bz, ah - bh));
        }
      }
      previous = pose;
    }
    t.diagnostic(`${member.archetype}: penetration ${maxPenetration.toFixed(4)} m, reach clamp ${maxReach.toFixed(4)} m, largest joint step ${maxJointStep.toFixed(3)} m per 1/30 s`);
    assert.deepEqual([...states].sort(), ['idle', 'walk']);
    assert.ok(planted > 200, 'many planted-foot comparisons');
    assert.ok(maxPenetration < .012, `${member.archetype} sole/ankle/knee penetration ${maxPenetration}`);
    assert.ok(maxReach < genome.legLength * .06, `${member.archetype} reach clamp ${maxReach}`);
    assert.ok(maxJointStep < .2, `${member.archetype} joint jump ${maxJointStep}`);
  }
});

test('solved skeleton is rigid and toes land on their contacts', () => {
  for (const member of MEMBERS) {
    const plan = createQuadrupedPlan(faunaMemberGenome(member));
    for (let k = 0; k < 40; k++) {
      const pose = poseAt(member, plan, CATALOGUE_EPOCH_NS + BigInt(k) * 737_000_000n);
      for (let i = 1; i < QUADRUPED_BONE_PARENTS.length; i++) {
        const parent = QUADRUPED_BONE_PARENTS[i], rest = plan.bones[i].rest, restParent = plan.bones[parent].rest;
        const a = pose.joints.subarray(i * 3, i * 3 + 3), b = pose.joints.subarray(parent * 3, parent * 3 + 3);
        const expected = Math.hypot(rest[0] - restParent[0], rest[1] - restParent[1], rest[2] - restParent[2]) + (i === 1 ? Infinity : 0);
        if (i !== 1) assert.ok(Math.abs(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) - expected) < 1e-6, `bone ${i} keeps its length`);
      }
      for (let q = 0; q < pose.quaternions.length; q += 4) assert.ok(Math.abs(Math.hypot(...pose.quaternions.subarray(q, q + 4)) - 1) < 1e-9);
      for (const foot of pose.feet) if (foot.stance && pose.maxReachError < 1e-6) {
        const c = Math.cos(pose.root.yaw), s = Math.sin(pose.root.yaw), dx = foot.contact[0] - pose.root.x, dz = foot.contact[2] - pose.root.z;
        const leg = plan.legs.find(l => l.id === foot.id);
        const expectedY = foot.contact[1] - pose.root.h + leg.toeRadius * .9;
        assert.ok(Math.hypot(foot.toe[0] - (dx * c + dz * s), foot.toe[2] - (dx * s - dz * c)) < leg.toeRadius * .5, `${foot.id} toe over its contact`);
        assert.ok(foot.toe[1] >= expectedY - 1e-6 && foot.toe[1] <= foot.contact[1] - pose.root.h + leg.toeRadius + 1e-6, `${foot.id} toe rests on the ground`);
      }
    }
  }
});

test('idle windows settle all four feet and lower the head safely to graze or look round', () => {
  let grazed = 0;
  for (const member of MEMBERS) {
    const plan = createQuadrupedPlan(faunaMemberGenome(member)), cycle = cyclePeriodNs(member);
    for (let window = 0n; window < 6n; window++) {
      // Find the middle of an idle window by scanning its cycle.
      let idle = null;
      for (let ns = CATALOGUE_EPOCH_NS + window * cycle; ns < CATALOGUE_EPOCH_NS + (window + 1n) * cycle; ns += NS / 2n) {
        const a = faunaMemberActivityAtWorldNs(member, ns);
        if (a.pose.gait === 'idle' && a.stateS > member.gaitPeriodS * .45 && a.stateS < member.gaitPeriodS * .55) { idle = ns; break; }
      }
      assert.ok(idle !== null, 'every activity cycle has an idle window');
      const pose = poseAt(member, plan, idle);
      assert.equal(pose.state, 'idle');
      assert.ok(pose.feet.every(f => f.stance), 'feet are settled and planted in idle');
      assert.ok(pose.headClearance > -.005, `${member.archetype} head stays above ground (${pose.headClearance})`);
      const head = pose.joints[6 * 3 + 1], rest = plan.bones[6].rest[1];
      if (head < rest - plan.genome.legLength * .25) grazed++;
    }
  }
  assert.ok(grazed >= 4, `some idle windows graze (${grazed})`);
});

test('proportions drive locomotion: longer legs stride further and stand higher', () => {
  const member = MEMBERS[0], genome = faunaMemberGenome(member);
  const short = createQuadrupedPlan(genome), long = createQuadrupedPlan({ ...genome, legLength: genome.legLength * 1.3, strideLength: genome.strideLength * 1.3 });
  const revolution = faunaMemberActivityAtWorldNs(member, CATALOGUE_EPOCH_NS).revolutionS;
  assert.ok(faunaGaitSchedule(long, member, revolution).cycleM > faunaGaitSchedule(short, member, revolution).cycleM);
  const ns = CATALOGUE_EPOCH_NS + 3_000_000_000n;
  assert.ok(poseAt(member, long, ns).joints[1 * 3 + 1] > poseAt(member, short, ns).joints[1 * 3 + 1] + genome.legLength * .2);
});
