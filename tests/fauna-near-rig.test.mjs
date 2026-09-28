import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { faunaHerdAt, faunaMemberGenome, faunaMemberActivityAtWorldNs, faunaGroundedTransform, faunaRigSecondsAt, toSeconds } from '../src/fauna-runtime.ts';
import { faunaGroundHeight, FAUNA_GROUND_N, FAUNA_GROUND_STEP_M, FAUNA_GROUND_HALF_M } from '../src/fauna-ground.ts';
import { FaunaFieldRenderer, FAUNA_FIELD_CAPACITY } from '../src/fauna-field-renderer.ts';
import { compareFaunaVisibility } from '../src/life-shadow-priority.ts';
import { FaunaNearRigs, FAUNA_NEAR_RIG_EXIT_M, FAUNA_NEAR_RIG_ENTER_M } from '../src/fauna-near-rig.ts';
import { CATALOGUE_EPOCH_NS, NS } from '../src/world-time.ts';

const SEED = 'NEAR-RIG-001', BODY = 'sector/4,0,1/system/1/planet/2';
const biome = { weights: [.05, .8, .1, .05], forestPotential: false, moisture: .9, slopeDeg: 6, ocean: false };
function herds(count) {
  const out = [];
  for (let i = 0; out.length < count && i < 4000; i++) {
    const a = i * 2.399963, z = 1 - (i + .5) / 2000 * 2, r = Math.sqrt(1 - z * z), direction = [Math.cos(a) * r, z, Math.sin(a) * r];
    const herd = faunaHerdAt(SEED, BODY, direction, biome, { stage: 'complex' }, toSeconds(0));
    if (herd.present) out.push({ direction, herd });
  }
  return out;
}
const HERDS = herds(3), MEMBERS = HERDS.flatMap(h => h.herd.members);
const grid = new Float64Array(FAUNA_GROUND_N ** 2);
for (let j = 0; j < FAUNA_GROUND_N; j++) for (let i = 0; i < FAUNA_GROUND_N; i++)
  grid[j * FAUNA_GROUND_N + i] = 40 + (i * FAUNA_GROUND_STEP_M - FAUNA_GROUND_HALF_M) * .06 + Math.cos(j * 1.3 + i * .4) * .5;
const ground = (x, z) => faunaGroundHeight(grid, x, z);
const NOW = CATALOGUE_EPOCH_NS + 5_500_000_000n;
function candidate(member, distanceM = 10, ns = NOW) {
  return { member, genome: faunaMemberGenome(member), distanceM, matrix: new THREE.Matrix4(), activity: faunaMemberActivityAtWorldNs(member, ns), ground, rigSeconds: faunaRigSecondsAt(ns) };
}
/** One build step per millisecond of fake clock: builds take a known number of frames. */
function steppedClock() { let t = 0; return () => t++; }
function settle(near, candidates, frames = 400) { let drawn; for (let i = 0; i < frames; i++) drawn = near.update(candidates); return drawn; }

test('built bodies are skinned by the solved skeleton and stand on the stencil', () => {
  const near = new FaunaNearRigs({ capacity: 2, now: steppedClock(), buildBudgetMs: 40 });
  for (const member of MEMBERS.slice(0, 4)) {
    const drawn = settle(near, [candidate(member)]);
    assert.ok(drawn.has(member.id), 'rigged once its body is built');
    const mesh = near.meshOf(member.id), pose = near.poseOf(member.id), geometry = mesh.geometry;
    assert.ok(mesh.visible && mesh.isSkinnedMesh && mesh.skeleton.bones.length === 22);
    for (let b = 0; b < 22; b++) {
      const p = new THREE.Vector3().setFromMatrixPosition(mesh.skeleton.bones[b].matrixWorld);
      assert.ok(p.distanceTo(new THREE.Vector3(...pose.joints.subarray(b * 3, b * 3 + 3))) < 1e-9, 'bone matrices match the solver');
    }
    // CPU-skin the actual render geometry.
    const position = geometry.getAttribute('position'), skinned = new Float32Array(position.count * 3), v = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) { mesh.applyBoneTransform(i, v.fromBufferAttribute(position, i)); v.toArray(skinned, i * 3); }
    assert.ok(skinned.every(Number.isFinite));
    const index = geometry.getIndex(); let stretch = 0;
    for (let t = 0; t < index.count; t += 3) for (let e = 0; e < 3; e++) {
      const a = index.getX(t + e), b = index.getX(t + (e + 1) % 3);
      const rest = Math.hypot(position.getX(a) - position.getX(b), position.getY(a) - position.getY(b), position.getZ(a) - position.getZ(b));
      const posed = Math.hypot(skinned[a * 3] - skinned[b * 3], skinned[a * 3 + 1] - skinned[b * 3 + 1], skinned[a * 3 + 2] - skinned[b * 3 + 2]);
      if (rest > 1e-4) stretch = Math.max(stretch, posed / rest);
    }
    assert.ok(stretch < 3.5, `${member.archetype}: skin stays continuous without tearing (max edge stretch ${stretch.toFixed(2)})`);
    // Rendered surface near each stance foot rests on, and does not sink into, the ground.
    const c = Math.cos(pose.root.yaw), s = Math.sin(pose.root.yaw), local = (X, Z) => ground(pose.root.x + X * c + Z * s, pose.root.z + X * s - Z * c) - pose.root.h;
    let deepest = 0;
    for (let i = 0; i < position.count; i++) deepest = Math.max(deepest, local(skinned[i * 3], skinned[i * 3 + 2]) - skinned[i * 3 + 1]);
    assert.ok(deepest < .05, `${member.archetype}: skinned surface penetration ${deepest.toFixed(3)} m`);
    for (const foot of pose.feet.filter(f => f.stance)) {
      let lowest = Infinity;
      for (let i = 0; i < position.count; i++) if (Math.hypot(skinned[i * 3] - foot.toe[0], skinned[i * 3 + 2] - foot.toe[2]) < .15) lowest = Math.min(lowest, skinned[i * 3 + 1] - local(skinned[i * 3], skinned[i * 3 + 2]));
      assert.ok(lowest < .06, `${member.archetype} ${foot.id}: rendered hoof reaches the ground (${lowest.toFixed(3)} m)`);
    }
  }
  near.dispose();
});

test('capacity, hysteresis and stable slot ownership', () => {
  const near = new FaunaNearRigs({ capacity: 3, cacheSize: 8, now: steppedClock(), buildBudgetMs: 60 });
  const six = MEMBERS.slice(0, 6).map((m, i) => candidate(m, 5 + i));
  settle(near, six, 900);
  const drawn = near.update(six);
  assert.equal(drawn.size, 3, 'never more rigs than capacity');
  assert.deepEqual([...drawn], six.slice(0, 3).map(c => c.member.id), 'nearest animals get the rigs');
  const diagnostics = near.diagnostics();
  assert.deepEqual(diagnostics.activeMembers.map(x => x.id).sort(), [...drawn].sort(), 'diagnostics identify the actual rig owners');
  assert.equal(diagnostics.activeMembers.length, diagnostics.active);
  for (const member of diagnostics.activeMembers) {
    assert.equal(member.poseState, near.poseOf(member.id).state);
    assert.equal(member.phase, near.poseOf(member.id).phase);
    assert.equal(member.stencilMaxPenetrationM, near.poseOf(member.id).maxPenetration);
    assert.equal(member.stencilMaxReachErrorM, near.poseOf(member.id).maxReachError);
  }
  diagnostics.activeMembers[0].id = 'modified-external-snapshot';
  assert.deepEqual(near.diagnostics().activeMembers.map(x => x.id).sort(), [...drawn].sort(), 'snapshot edits cannot change rig ownership');
  const meshes = [...drawn].map(id => near.meshOf(id));
  near.update([six[2], six[1], six[0]]);
  assert.deepEqual([...drawn].map(id => near.meshOf(id)), meshes, 'reordering keeps each animal on its slot');
  // Between enter and exit range: kept if active, not newly acquired.
  const between = (FAUNA_NEAR_RIG_ENTER_M + FAUNA_NEAR_RIG_EXIT_M) / 2;
  const kept = near.update([{ ...six[0], distanceM: between }, { ...six[4], distanceM: between }]);
  assert.ok(kept.has(six[0].member.id) && !kept.has(six[4].member.id));
  assert.deepEqual(near.diagnostics().activeMembers.map(x => x.id), [six[0].member.id], 'hysteresis reports the retained individual only');
  assert.equal(near.update([{ ...six[0], distanceM: FAUNA_NEAR_RIG_EXIT_M + 1 }]).size, 0, 'released past exit distance');
  assert.equal(near.diagnostics().active, 0);
  assert.deepEqual(near.diagnostics().activeMembers, [], 'released individuals are absent from active diagnostics');
  assert.ok(near.group.children.every(m => !m.visible), 'released slots are hidden');
  near.dispose();
});

test('bodies build one at a time within a frame budget and fall back meanwhile', () => {
  const near = new FaunaNearRigs({ capacity: 2, now: steppedClock(), buildBudgetMs: 3 });
  const pair = MEMBERS.slice(0, 2).map(m => candidate(m));
  let frames = 0;
  while (!near.update(pair).has(pair[0].member.id)) { frames++; assert.ok(near.diagnostics().building === pair[0].member.id || near.diagnostics().cached > 0); assert.ok(frames < 2000); }
  assert.ok(frames > 5, 'a body is spread over several frames');
  assert.equal(near.diagnostics().cached, 1, 'only the highest-priority body built first');
  settle(near, pair, 2000);
  assert.equal(near.update(pair).size, 2);
  near.dispose();
});

test('invalid genomes keep the instanced fallback without blocking other builds', () => {
  const near = new FaunaNearRigs({ capacity: 2, now: steppedClock(), buildBudgetMs: 40 });
  const bad = { ...candidate(MEMBERS[0]), genome: { ...faunaMemberGenome(MEMBERS[0]), legLength: Number.NaN } }, good = candidate(MEMBERS[1]);
  const drawn = settle(near, [bad, good]);
  assert.ok(!drawn.has(bad.member.id) && drawn.has(good.member.id));
  assert.equal(near.diagnostics().failures, 1);
  near.dispose();
});

test('geometry cache is bounded, never evicts bodies in use, and dispose releases everything', () => {
  const near = new FaunaNearRigs({ capacity: 2, cacheSize: 3, now: steppedClock(), buildBudgetMs: 60 });
  const disposed = new Set(), created = new Set();
  const track = () => { for (const m of near.group.children) { const geometry = m.geometry; if (geometry.getAttribute('position') && !created.has(geometry)) { created.add(geometry); geometry.addEventListener('dispose', () => disposed.add(geometry)); } } };
  const all = MEMBERS.slice(0, 6).map(m => candidate(m));
  for (const c of all) { for (let i = 0; i < 300; i++) { near.update([all[0], c]); track(); } }
  const d = near.diagnostics();
  assert.ok(d.cached <= 3 && d.evictions >= 2, `cache bounded (${d.cached} cached, ${d.evictions} evicted)`);
  assert.ok(near.meshOf(all[0].member.id), 'the continuously wanted body stays resident');
  assert.ok(![...disposed].includes(near.meshOf(all[0].member.id).geometry), 'in-use geometry is never disposed');
  assert.ok(near.allocatedBytes > 0 && near.allocatedBytes < 16 * 1024 * 1024);
  const materials = near.group.children.map(m => m.material), skeletons = near.group.children.map(m => m.skeleton), released = new Set();
  for (const x of [...materials]) x.addEventListener('dispose', () => released.add(x));
  let skeletonDisposals = 0; for (const s of skeletons) { const original = s.dispose.bind(s); s.dispose = () => { skeletonDisposals++; original(); }; }
  const parent = new THREE.Group(); parent.add(near.group);
  near.dispose(); near.dispose();
  assert.equal(released.size, materials.length); assert.equal(skeletonDisposals, skeletons.length);
  assert.equal(near.group.parent, null); assert.equal(near.update(all).size, 0);
  for (const g of created) assert.ok(disposed.has(g), 'every created body geometry disposed');
});

test('planet integration: rigged animals replace, never duplicate, their instanced fallback', () => {
  // Mirrors PlanetRenderer.drawFauna: exact-date activity -> grounded outer
  // transform on the herd stencil -> priority sort -> near candidates -> rigs
  // for the nearest, instanced submission for everything else.
  const radiusM = 6.371e6, field = new FaunaFieldRenderer();
  const frame = (near, eyeMetres, ns) => {
    const anchor = new THREE.Vector3(...HERDS[0].direction).normalize();
    const ref = Math.abs(anchor.y) > .92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(ref, anchor).normalize().multiplyScalar(1 / radiusM);
    const forward = new THREE.Vector3().crossVectors(anchor, right).normalize().multiplyScalar(1 / radiusM);
    const up = anchor.clone().multiplyScalar(1 / radiusM);
    const eye = anchor.clone().addScaledVector(up, 60 + eyeMetres[1]).addScaledVector(right, eyeMetres[0]).addScaledVector(forward, eyeMetres[2]);
    const visible = [];
    for (const member of HERDS[0].herd.members) {
      const activity = faunaMemberActivityAtWorldNs(member, ns), value = ground(activity.pose.x, activity.pose.z);
      const grounded = faunaGroundedTransform(anchor, right, forward, up, activity.pose, () => value);
      visible.push({ cameraVisible: true, member, ...grounded, distance: eye.distanceTo(grounded.position) * radiusM, activity, rootH: value });
    }
    visible.sort(compareFaunaVisibility);
    const scale = new THREE.Vector3().setScalar(1 / radiusM), candidates = [];
    for (const item of visible) {
      if (!item.cameraVisible || item.distance > FAUNA_NEAR_RIG_EXIT_M || candidates.length >= (near?.capacity ?? 0) * 2) break;
      candidates.push({ member: item.member, genome: faunaMemberGenome(item.member), distanceM: item.distance, activity: item.activity, rigSeconds: faunaRigSecondsAt(ns),
        matrix: new THREE.Matrix4().compose(item.position.clone().sub(eye), item.quaternion, scale), ground });
    }
    const rigged = near ? near.update(candidates) : new Set();
    field.beginFrame(eye);
    const drawn = [], instanced = [];
    for (const item of visible) {
      if (drawn.length >= FAUNA_FIELD_CAPACITY) continue;
      drawn.push(item.member.id);
      if (rigged.has(item.member.id)) continue;
      field.submit(faunaMemberGenome(item.member), new THREE.Matrix4().compose(item.position.clone().sub(eye), item.quaternion, scale), faunaRigSecondsAt(ns), item.activity.pose.gait);
      instanced.push(item.member.id);
    }
    field.endFrame();
    return { drawn, instanced, rigged, visible, candidates };
  };
  const near = new FaunaNearRigs({ capacity: 2, now: steppedClock(), buildBudgetMs: 60 });
  let result;
  for (let i = 0; i < 300; i++) result = frame(near, [0, 0, 0], NOW);
  assert.equal(field.count, result.instanced.length, 'the instanced batch holds only unrigged animals');
  const baseline = frame(null, [0, 0, 0], NOW);
  assert.deepEqual(result.drawn, baseline.drawn, 'population, identity and order do not depend on rigs');
  assert.equal(result.rigged.size, 2);
  assert.equal(result.instanced.length + result.rigged.size, result.drawn.length, 'every animal drawn exactly once');
  for (const id of result.rigged) {
    assert.ok(!result.instanced.includes(id));
    const item = result.visible.find(v => v.member.id === id), c = result.candidates.find(x => x.member.id === id);
    assert.deepEqual(near.meshOf(id).matrix.elements, c.matrix.elements, 'rig uses the fallback outer transform');
    assert.ok(Math.abs(near.poseOf(id).root.h - item.rootH) < 1e-6, 'rig root sits on the same stencil height');
  }
  // Moving the observer away hands every animal back to the instanced path.
  const far = frame(near, [0, 400, 0], NOW);
  assert.equal(far.rigged.size, 0); assert.equal(far.instanced.length, far.drawn.length);
  // Returning replays the same rigged pose at the same date.
  for (let i = 0; i < 3; i++) result = frame(near, [0, 0, 0], NOW);
  const again = [...result.rigged].map(id => Array.from(near.poseOf(id).quaternions));
  frame(near, [0, 0, 0], NOW + 777n * NS);
  result = frame(near, [0, 0, 0], NOW);
  assert.deepEqual([...result.rigged].map(id => Array.from(near.poseOf(id).quaternions)), again, 'date replay is independent of visits');
  near.dispose(); field.dispose();
});
