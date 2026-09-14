import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import { generateCreatureGenome } from '../src/creature-model.ts';
import { createCreatureRig, creatureTerrainHeight } from '../src/creature-rig.ts';

const genome = generateCreatureGenome('RIG-FIXTURE', 'runner');
const rounded = pose => JSON.parse(JSON.stringify(pose, (_, value) => typeof value === 'number' ? Math.round(value * 1e8) / 1e8 : value));

test('terrain sampler is deterministic, bounded, and shared across rig foot targets', () => {
  assert.equal(creatureTerrainHeight(0, 4, 'flat'), 0);
  assert.equal(creatureTerrainHeight(200, 0, 'slope'), creatureTerrainHeight(12, 0, 'slope'));
  assert.equal(creatureTerrainHeight(200, 0, 'steps'), creatureTerrainHeight(20, 0, 'steps'));
  const rig = createCreatureRig(genome);
  for (const terrain of ['flat', 'slope', 'steps']) {
    const pose = rig.update(1.37, 'walk', terrain);
    for (const foot of pose.feet) {
      const centre = creatureTerrainHeight(foot.target[0], foot.target[2], terrain) + Math.max(.025, genome.footWidth * .18) * .85;
      assert.ok(foot.target[1] >= centre && foot.target[1] - centre <= .1, 'target supports the complete foot sole');
    }
  }
  rig.dispose();
});

test('absolute-time walk evaluation replays A-B-A and plants stance feet', () => {
  const rig = createCreatureRig(genome), a = rounded(rig.update(2.125, 'walk', 'steps'));
  rig.update(8.75, 'run', 'slope');
  const replay = rounded(rig.update(2.125, 'walk', 'steps'));
  assert.deepEqual(replay, a);
  assert.equal(a.feet.length, 4); assert.equal(a.jointCount, 12);
  assert.ok(a.root[0] > 0, 'walk root traverses +X');
  for (const foot of a.feet) if (foot.stance) assert.deepEqual(foot.position, foot.target, `${foot.id} remains planted`);
  assert.ok(a.maxPenetration < 1e-8); assert.ok(a.maxReachError < .05);
  rig.dispose();
});

test('walk and run have distinct contact patterns and use real rigid limb parts', () => {
  const rig = createCreatureRig(genome), walk = rig.update(.42, 'walk', 'flat'), run = rig.update(.42, 'run', 'flat');
  assert.notDeepEqual(walk.feet.map(x => x.stance), run.feet.map(x => x.stance));
  const names = []; rig.group.traverse(x => names.push(x.name));
  for (const name of ['torso body', 'distinct head', 'eye', 'planted foot', 'knee joint']) assert.ok(names.includes(name), `has ${name}`);
  rig.setSkeletonVisible(true); assert.ok(rig.group.getObjectByName('solved joint overlay').visible);
  rig.setNeutral(true); rig.dispose(); rig.dispose();
});

test('tail and hips attach within the torso while feet retain the wider stance', () => {
  const rig = createCreatureRig(genome); rig.update(0, 'idle', 'flat');
  const torso = rig.group.getObjectByName('torso'), tail = rig.group.getObjectByName('tail');
  assert.ok(torso && tail);
  const localBase = new Vector3(0, -tail.geometry.parameters.height * .5, 0).applyQuaternion(tail.quaternion).add(tail.position);
  assert.ok(Math.abs(localBase.x / (genome.torsoLength * .52)) < 1 && Math.abs(localBase.y / (genome.torsoHeight * .42)) < 1, 'tail base overlaps torso ellipsoid');
  for (const id of ['rear-left', 'rear-right', 'front-left', 'front-right']) {
    const hip = rig.group.getObjectByName(id); assert.ok(Math.abs(hip.position.z) <= genome.torsoWidth * .31, `${id} hip is inside torso`);
  }
  const pose = rig.update(.3, 'walk', 'flat'); assert.ok(Math.abs(pose.feet[0].position[2]) > genome.torsoWidth * .3, 'feet preserve stance width');
  rig.dispose();
});
