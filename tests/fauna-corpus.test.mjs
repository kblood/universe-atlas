import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import * as THREE from 'three';
import { generateCreatureGenome, realisticIndividualCreatureGenome } from '../src/creature-model.ts';
import { buildQuadrupedBody, quadrupedBodyBytes, QUADRUPED_GRID_POINT_BUDGET } from '../src/fauna-body-plan.ts';
import { createFaunaSkinInspector } from '../src/fauna-skin-inspector.ts';

const report = { generator: 'quadruped-body-3', createdAt: new Date().toISOString(), specimens: [], boundaries: [],
  limits: { triangles: 40000, gridPoints: QUADRUPED_GRID_POINT_BUDGET, edgeStretch: 3.5, surfacePenetrationM: .05, footSurfaceGapM: .06, solverPenetrationM: .012, reachFraction: .06 },
  notes: ['CPU wall time depends on machine and concurrent work.', 'Flat-floor production rig review; no GPU, flight, or Quest qualification.'] };
after(async () => {
  const values = report.specimens;
  report.aggregate = {
    specimens: values.length, boundaryPoses: report.boundaries.length,
    maxVertices: Math.max(0, ...values.map(s => s.vertices)), maxTriangles: Math.max(0, ...values.map(s => s.triangles)),
    maxGridPoints: Math.max(0, ...values.map(s => s.gridPoints)), maxCpuBytes: Math.max(0, ...values.map(s => s.cpuBytes)),
    maxBuildMs: Math.max(0, ...values.map(s => s.buildMs)), meanBuildMs: values.reduce((n, s) => n + s.buildMs, 0) / Math.max(1, values.length),
    maxEdgeStretch: Math.max(0, ...report.boundaries.map(s => s.edgeStretch)),
    maxSurfacePenetrationM: Math.max(0, ...report.boundaries.map(s => s.surfacePenetrationM)),
    minTrunkClearanceM: Math.min(Infinity, ...report.boundaries.flatMap(s => s.trunkClearanceM === null ? [] : [s.trunkClearanceM])),
  };
  const directory = new URL('../test-results/fauna-variation-2026-10-02/', import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('cpu-corpus.json', directory), JSON.stringify(report, null, 2) + '\n');
});

test('96 specimen anatomy corpus retains finite bounded geometry, attached features and valid weights', () => {
  for (const archetype of ['browser', 'runner', 'low-slung', 'long-neck']) for (let species = 0; species < 3; species++) for (let individual = 0; individual < 4; individual++) for (const stage of ['adult', 'juvenile']) {
    const seed = `FAUNA-CORPUS/${archetype}/${species}`, id = `${seed}/${individual}/${stage}`;
    const genome = realisticIndividualCreatureGenome(generateCreatureGenome(seed, archetype), `${seed}/member`, individual, stage);
    const start = performance.now(), body = buildQuadrupedBody(genome), buildMs = performance.now() - start;
    const gridPoints = body.grid.reduce((n, v) => n * v, 1);
    report.specimens.push({ id, family: genome.morphology.family, vertices: body.vertexCount, triangles: body.triangleCount, gridPoints, cpuBytes: quadrupedBodyBytes(body), buildMs });
    assert.ok(body.triangleCount <= report.limits.triangles, `${id} triangles`);
    assert.ok(gridPoints <= report.limits.gridPoints, `${id} grid`);
    assert.equal(body.faceFeatures.length, 6, `${id} bilateral eyes, nostrils and mouth`);
    assert.ok(body.positions.every(Number.isFinite) && body.normals.every(Number.isFinite), `${id} finite skin`);
    assert.ok(body.index.every(i => i < body.vertexCount), `${id} valid indices`);
    for (let v = 0; v < body.vertexCount; v++) {
      const offset = v * 4;
      assert.equal(body.skinWeight[offset] + body.skinWeight[offset + 1] + body.skinWeight[offset + 2] + body.skinWeight[offset + 3], 255, `${id} normalized skin`);
      for (let c = 0; c < 4; c++) assert.ok(body.skinIndex[offset + c] < 22);
    }
  }
  assert.equal(report.specimens.length, 96);
});

test('six morphology boundaries retain production contact and deformation in idle, walk and feeding poses', () => {
  for (const family of ['ungulate', 'cursorial', 'padded', 'long-neck', 'proboscidean', 'winged']) for (const stage of ['adult', 'juvenile']) {
    const genome = realisticIndividualCreatureGenome(generateCreatureGenome('FAUNA-BOUNDARY', 'browser'), 'FAUNA-BOUNDARY/member', stage === 'adult' ? 3 : 0, stage, family);
    for (const pose of ['idle', 'walk', 'feed']) {
      const id = `${family}/${stage}/${pose}`, rig = createFaunaSkinInspector(genome, id, { pose });
      try {
        const mesh = rig.group.children.find(o => o.isSkinnedMesh), geometry = mesh.geometry;
        const position = geometry.getAttribute('position'), index = geometry.index;
        const structuralEnd = geometry.userData.faceFeatures[0].firstVertex;
        const structuralStart = structuralEnd - geometry.userData.structuralVertexCount;
        const edges = [];
        for (let t = 0; t < index.count; t += 3) for (let e = 0; e < 3; e++) {
          const a = index.getX(t + e), b = index.getX(t + (e + 1) % 3);
          const rest = Math.hypot(position.getX(a) - position.getX(b), position.getY(a) - position.getY(b), position.getZ(a) - position.getZ(b));
          if (rest > 1e-4) edges.push([a * 3, b * 3, rest]);
        }
        const skinned = new Float32Array(position.count * 3), vector = new THREE.Vector3();
        for (const time of [0, .25, 1, 3, 8]) {
          const diagnostics = rig.update(time, 'idle', 'flat');
          mesh.skeleton.update();
          let lowest = Infinity, trunkClearanceM = null, wingMin = Infinity, wingMax = -Infinity;
          for (let i = 0; i < position.count; i++) {
            mesh.applyBoneTransform(i, vector.fromBufferAttribute(position, i));
            vector.toArray(skinned, i * 3); lowest = Math.min(lowest, vector.y);
            if (i >= structuralStart && i < structuralEnd) {
              if (family === 'proboscidean') trunkClearanceM = Math.min(trunkClearanceM ?? Infinity, vector.y);
              if (family === 'winged') { wingMin = Math.min(wingMin, vector.z); wingMax = Math.max(wingMax, vector.z); }
            }
          }
          assert.ok(skinned.every(Number.isFinite), `${id}/${time} finite deformation`);
          let edgeStretch = 0;
          for (const [a, b, rest] of edges) edgeStretch = Math.max(edgeStretch, Math.hypot(skinned[a] - skinned[b], skinned[a + 1] - skinned[b + 1], skinned[a + 2] - skinned[b + 2]) / rest);
          const footGaps = diagnostics.feet.filter(f => f.stance).map(foot => {
            let floorGap = Infinity;
            for (let i = 0; i < position.count; i++) if (Math.hypot(skinned[i * 3] - foot.position[0], skinned[i * 3 + 2] - foot.position[2]) < .15)
              floorGap = Math.min(floorGap, skinned[i * 3 + 1]);
            return floorGap;
          });
          const result = { id, time, edgeStretch, surfacePenetrationM: Math.max(0, -lowest), maxFootGapM: Math.max(...footGaps), solverPenetrationM: diagnostics.maxPenetration, reachErrorM: diagnostics.maxReachError, trunkClearanceM, wingWidthM: family === 'winged' ? wingMax - wingMin : null };
          report.boundaries.push(result);
          assert.ok(edgeStretch < report.limits.edgeStretch, `${id}/${time} stretch ${edgeStretch}`);
          assert.ok(result.surfacePenetrationM < report.limits.surfacePenetrationM, `${id}/${time} skin penetration ${result.surfacePenetrationM}`);
          assert.ok(result.maxFootGapM < report.limits.footSurfaceGapM, `${id}/${time} foot gap ${result.maxFootGapM}`);
          assert.ok(diagnostics.maxPenetration < report.limits.solverPenetrationM, `${id}/${time} contact penetration`);
          assert.ok(diagnostics.maxReachError < genome.legLength * report.limits.reachFraction, `${id}/${time} reach ${diagnostics.maxReachError}`);
          if (family === 'proboscidean') assert.ok(trunkClearanceM >= 0, `${id}/${time} trunk clearance ${trunkClearanceM}`);
          if (family === 'winged') assert.ok(result.wingWidthM > genome.torsoWidth * 1.5, `${id}/${time} wings visibly extend beyond torso`);
        }
      } finally { rig.dispose(); }
    }
  }
});
