import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCreatureGenome, realisticIndividualCreatureGenome } from '../src/creature-model.ts';
import { createQuadrupedPlan, buildQuadrupedBody, quadrupedBodyDistance, QUADRUPED_BODY_VERSION } from '../src/fauna-body-plan.ts';

const families = ['browser', 'runner', 'low-slung', 'long-neck'];

test('body version 4 joins shoulder and haunch muscle volumes to the existing limb chains', () => {
  assert.equal(QUADRUPED_BODY_VERSION, 'quadruped-body-4');
  for (const family of families) {
    const plan = createQuadrupedPlan(generateCreatureGenome('ANATOMY-MUSCLE', family));
    assert.equal(plan.bones.length, 22);
    for (const leg of plan.legs) {
      const muscles = plan.primitives.filter(p => p.region === 'upper' && p.shape === 'ellipsoid' && p.bone === leg.upperBone);
      assert.equal(muscles.length, 1);
      assert.ok(quadrupedBodyDistance(plan, ...muscles[0].a) < 0, 'muscle mass is inside the continuous skin');
      assert.ok(muscles[0].a[1] < leg.hip[1] && muscles[0].a[1] > leg.knee[1], 'muscle volume follows the upper limb');
    }
    assert.ok(plan.primitives.filter(p => p.region === 'head' && p.shape === 'ellipsoid').length >= 3, 'cranium, mandible and nasal end have independent shaping volumes');
  }
});

test('explicit paw, split-hoof and broad-pad morphology changes the actual toe geometry', () => {
  const base = generateCreatureGenome('ANATOMY-TOES', 'browser');
  const counts = { hoof: 2, paw: 4, 'broad-pad': 1 };
  const shapes = [];
  for (const footType of Object.keys(counts)) {
    const genome = { ...base, morphology: { version: 'fauna-morphology-1', family: footType === 'hoof' ? 'ungulate' : 'padded', footType, trunkLength: 0, wingSpan: 0, wingState: 'none' } };
    const body = buildQuadrupedBody(genome);
    for (const leg of body.plan.legs) {
      const toes = body.plan.primitives.filter(p => p.region === 'foot' && p.shape === 'ellipsoid' && p.bone === leg.footBone);
      assert.equal(toes.length, counts[footType]);
      for (const toe of toes) assert.ok(Math.abs(toe.a[1] - toe.b[1]) < 1e-10, 'all toe soles share the ground plane');
    }
    assert.ok(body.triangleCount <= 40000, 'toe details retain the near geometry budget');
    shapes.push(Array.from(body.positions));
  }
  assert.notDeepEqual(shapes[0], shapes[1]);
  assert.notDeepEqual(shapes[1], shapes[2]);
});

test('toe pads broaden the contact silhouette while retaining the original ground and IK anchors', () => {
  for (const family of families) {
    const plan = createQuadrupedPlan(generateCreatureGenome('ANATOMY-FEET', family));
    for (const leg of plan.legs) {
      const pads = plan.primitives.filter(p => p.region === 'foot' && p.shape === 'ellipsoid' && p.bone === leg.footBone);
      assert.equal(pads.length, 1);
      const pad = pads[0];
      assert.ok(Math.abs(pad.a[1] - pad.b[1]) < 1e-10, 'sole touches ground');
      assert.ok(pad.b[0] > leg.toeRadius && pad.b[2] > leg.toeRadius, 'toe is broader than the original spherical joint');
      assert.deepEqual(plan.bones[leg.footBone].rest, leg.ankle);
      assert.ok(quadrupedBodyDistance(plan, ...leg.toe) < 0, 'contact point remains embedded in the pad');
    }
  }
});

test('all morphology profiles and stages keep a connected, bounded core skin and six facial features', () => {
  for (const family of ['ungulate', 'cursorial', 'padded', 'long-neck', 'proboscidean', 'winged']) for (const stage of ['adult', 'juvenile']) {
    const genome = realisticIndividualCreatureGenome(generateCreatureGenome('ANATOMY-PROFILES', 'browser'), 'anatomy-profile', 3, stage, family);
    const body = buildQuadrupedBody(genome);
    const parent = Int32Array.from({ length: body.bodyVertexCount }, (_, i) => i);
    const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    for (let t = 0; t < body.bodyTriangleCount * 3; t += 3) {
      const root = find(body.index[t]);
      parent[find(body.index[t + 1])] = root;
      parent[find(body.index[t + 2])] = root;
    }
    assert.equal(new Set(Array.from(parent, (_, i) => find(i))).size, 1, `${family}/${stage}: connected body including toes`);
    assert.equal(body.faceFeatures.length, 6);
    assert.ok(body.triangleCount <= 40000, `${family}/${stage}: triangle budget`);
    assert.equal(body.plan.bones.length, 22);
    assert.equal(body.structuralVertexCount > 0, family === 'proboscidean' || family === 'winged');
    for (const appendage of body.plan.appendages) assert.ok(quadrupedBodyDistance(body.plan, ...appendage.base) < 0, `${family}/${stage}: embedded ${appendage.kind} root`);
    if (family === 'proboscidean') for (const ear of body.plan.appendages.filter(a => a.kind === 'ear')) {
      assert.ok(Math.abs(ear.tip[2] - ear.base[2]) > Math.abs(ear.tip[1] - ear.base[1]) * 4, 'pinna spreads laterally');
      assert.ok(ear.radius >= genome.headWidth * .24, 'pinna has a broad leaf');
    }
    for (let v = 0; v < body.vertexCount; v++) {
      assert.equal(body.skinWeight.subarray(v * 4, v * 4 + 4).reduce((sum, w) => sum + w, 0), 255);
      for (let c = 0; c < 3; c++) assert.ok(Number.isFinite(body.positions[v * 3 + c]));
    }
  }
});
