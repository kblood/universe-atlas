import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generateCreatureGenome, individualCreatureGenome } from '../src/creature-model.ts';
import { buildQuadrupedBody, QUADRUPED_BODY_VERSION } from '../src/fauna-body-plan.ts';
import { createFaunaSkinInspector } from '../src/fauna-skin-inspector.ts';

const archetypes = ['browser', 'runner', 'low-slung', 'long-neck'];

test('facial landmarks survive different genomes and mesh resolutions on both sides of the actual skin', () => {
  for (const archetype of archetypes) for (const seed of ['FACE-A', 'FACE-B', 'FACE-C']) for (const stage of ['adult', 'juvenile']) {
    const genome = individualCreatureGenome(generateCreatureGenome(seed, archetype), seed, 2, stage);
    const body = buildQuadrupedBody(genome);
    assert.equal(body.plan.version, QUADRUPED_BODY_VERSION);
    assert.equal(body.faceFeatures.length, 6);
    assert.deepEqual(body.faceFeatures.map(f => `${f.side}/${f.kind}`), ['-1/eye', '-1/nostril', '-1/mouth', '1/eye', '1/nostril', '1/mouth']);
    assert.ok(body.faceFeatures.reduce((n, f) => n + f.triangleCount, 0) <= 500, 'facial detail has a fixed triangle budget');
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(body.positions, 3));
    geometry.setIndex(new THREE.BufferAttribute(body.index.subarray(0, body.bodyTriangleCount * 3), 1));
    const material = new THREE.MeshBasicMaterial();
    const skin = new THREE.Mesh(geometry, material), ray = new THREE.Raycaster();
    skin.updateMatrixWorld();
    for (const f of body.faceFeatures) {
      for (let i = f.firstVertex; i < f.firstVertex + f.vertexCount; i += 7) {
        const p = new THREE.Vector3().fromArray(body.positions, i * 3);
        ray.set(new THREE.Vector3(p.x, p.y, f.side * 100), new THREE.Vector3(0, 0, -f.side));
        const hit = ray.intersectObject(skin)[0];
        assert.ok(hit, `${archetype}/${stage}/${f.kind} lies over skull skin`);
        const gap = f.side * (p.z - hit.point.z);
        assert.ok(gap > 0 && gap < genome.headWidth * .07, `detail is exposed and rooted, gap=${gap}`);
      }
      for (let t = f.firstTriangle * 3; t < (f.firstTriangle + f.triangleCount) * 3; t += 3) {
        const a = new THREE.Vector3().fromArray(body.positions, body.index[t] * 3);
        const b = new THREE.Vector3().fromArray(body.positions, body.index[t + 1] * 3);
        const c = new THREE.Vector3().fromArray(body.positions, body.index[t + 2] * 3);
        assert.ok(b.sub(a).cross(c.sub(a)).z * f.side > 0, 'outward winding on either side');
      }
    }
    geometry.dispose(); material.dispose();
  }
});

test('production skin inspection replays dated poses and keeps facial patches attached while deforming', () => {
  for (const archetype of archetypes) {
    const genome = generateCreatureGenome('FACE-MOTION', archetype);
    const rig = createFaunaSkinInspector(genome, `FACE-MOTION/${archetype}`);
    const mesh = rig.group.children.find(o => o.isSkinnedMesh);
    assert.ok(mesh);
    const geometry = mesh.geometry, position = geometry.getAttribute('position'), index = geometry.index;
    const features = geometry.userData.faceFeatures, bodyIndexEnd = features[0].firstTriangle * 3;
    const replay = rig.update(3, 'idle', 'flat');
    let moving;
    for (const time of [0, 8, 15]) {
      moving = rig.update(time, 'idle', 'flat');
      mesh.skeleton.update();
      const vertices = Array.from({ length: position.count }, (_, i) => mesh.applyBoneTransform(i, new THREE.Vector3().fromBufferAttribute(position, i)));
      const triangle = new THREE.Triangle(), closest = new THREE.Vector3();
      for (const f of features) {
        // The centre/first point of each visible feature must remain close
        // to the deformed supporting skin, including in grazing poses.
        const p = vertices[f.firstVertex];
        let gap = Infinity;
        for (let t = 0; t < bodyIndexEnd; t += 3) {
          triangle.set(vertices[index.getX(t)], vertices[index.getX(t + 1)], vertices[index.getX(t + 2)]);
          triangle.closestPointToPoint(p, closest);
          gap = Math.min(gap, p.distanceTo(closest));
        }
        assert.ok(gap < genome.headWidth * .08, `${archetype}/${f.kind} remains attached (${gap})`);
      }
    }
    assert.notDeepEqual(moving.feet, replay.feet, 'inspection exercises solved motion');
    assert.deepEqual(rig.update(3, 'idle', 'flat'), replay, 'A-B-A replay uses the production date path');
    assert.equal(mesh.geometry, geometry, 'pose seeks do not regenerate skin');
    rig.setNeutral(true); assert.equal(mesh.material.vertexColors, false);
    rig.setNeutral(false); assert.equal(mesh.material.vertexColors, true);
    assert.equal(mesh.geometry, geometry);
    const helper = rig.group.children.find(o => o.isSkeletonHelper);
    rig.setSkeletonVisible(true); assert.equal(helper.visible, true);
    const disposed = new Set();
    mesh.skeleton.computeBoneTexture();
    for (const object of [geometry, mesh.material, helper.geometry, helper.material, mesh.skeleton.boneTexture])
      object.addEventListener('dispose', () => disposed.add(object));
    rig.dispose(); rig.dispose();
    assert.equal(disposed.size, 5, 'skin, overlay, material and bone texture are all released');
    assert.equal(rig.group.children.length, 0);
  }
});
