import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCreatureGenome, individualCreatureGenome } from '../src/creature-model.ts';
import {
  buildQuadrupedBody, quadrupedBodyBuildSteps, createQuadrupedPlan, quadrupedBodyDistance,
  QUADRUPED_BONE_NAMES, QUADRUPED_BONE_PARENTS, BONE,
} from '../src/fauna-body-plan.ts';

const ARCHETYPES = ['browser', 'runner', 'low-slung', 'long-neck'];
const cache = new Map();
function body(genome) {
  const key = JSON.stringify(genome);
  if (!cache.has(key)) cache.set(key, buildQuadrupedBody(genome));
  return cache.get(key);
}
function bounds(data, from = 0, to = data.bodyVertexCount) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let v = from; v < to; v++) for (let c = 0; c < 3; c++) { const x = data.positions[v * 3 + c]; min[c] = Math.min(min[c], x); max[c] = Math.max(max[c], x); }
  return { min, max };
}
function components(data) {
  const parent = Int32Array.from({ length: data.bodyVertexCount }, (_, i) => i);
  const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  for (let t = 0; t < data.bodyTriangleCount * 3; t += 3) for (const [a, b] of [[0, 1], [1, 2]]) parent[find(data.index[t + a])] = find(data.index[t + b]);
  const roots = new Set(); for (let v = 0; v < data.bodyVertexCount; v++) roots.add(find(v)); return roots.size;
}

test('each archetype and growth stage is one closed, outward, bounded skin', t => {
  for (const archetype of ARCHETYPES) for (const stage of ['adult', 'juvenile']) {
    const genome = individualCreatureGenome(generateCreatureGenome(`BODY-${archetype}`, archetype), `member-${archetype}`, 1, stage);
    const started = performance.now(), data = buildQuadrupedBody(genome), ms = performance.now() - started;
    t.diagnostic(`${archetype}/${stage}: ${ms.toFixed(1)} ms, cell ${data.cellM.toFixed(3)} m, grid ${data.grid.join('x')}, ${data.vertexCount} vertices, ${data.triangleCount} triangles`);
    assert.equal(components(data), 1, `${archetype} ${stage}: legs, neck, head and tail form one connected surface`);
    // Every undirected edge of a closed surface is shared by an even, non-zero number of triangles.
    const edges = new Map();
    for (let tri = 0; tri < data.bodyTriangleCount * 3; tri += 3) for (let e = 0; e < 3; e++) {
      const a = data.index[tri + e], b = data.index[tri + (e + 1) % 3], key = a < b ? a * 1e6 + b : b * 1e6 + a;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
    for (const count of edges.values()) assert.equal(count % 2, 0, 'no open boundary edges');
    // Positive enclosed volume means the winding faces outward.
    let volume = 0;
    for (let tri = 0; tri < data.bodyTriangleCount * 3; tri += 3) {
      const [a, b, c] = [0, 1, 2].map(k => Array.from(data.positions.subarray(data.index[tri + k] * 3, data.index[tri + k] * 3 + 3)));
      volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    }
    const g = genome, trunk = 4 / 3 * Math.PI * g.torsoLength * .5 * g.torsoHeight * .5 * g.torsoWidth * .5;
    assert.ok(volume > trunk * .6 && volume < trunk * 4, `${archetype} ${stage} volume ${volume.toFixed(3)} tracks the trunk ${trunk.toFixed(3)}`);
    assert.ok(data.triangleCount <= 40000, `${archetype} ${stage}: ${data.triangleCount} triangles within near-rig budget`);
    for (let v = 0; v < data.bodyVertexCount; v += 7) {
      const d = quadrupedBodyDistance(data.plan, data.positions[v * 3], data.positions[v * 3 + 1], data.positions[v * 3 + 2]);
      assert.ok(Math.abs(d) <= data.cellM, 'vertices lie on the genome body field');
    }
    const box = bounds(data);
    assert.ok(box.min[1] > -data.cellM * .6 && box.min[1] < data.cellM, `${archetype} ${stage}: bind-pose feet rest on the ground plane (${box.min[1]})`);
  }
});

test('skin weights and skeleton form a valid rig', () => {
  const data = body(generateCreatureGenome('RIG-VALID', 'browser'));
  assert.equal(data.plan.bones.length, QUADRUPED_BONE_NAMES.length);
  QUADRUPED_BONE_PARENTS.forEach((parent, i) => assert.ok(parent < i, 'parents precede children'));
  assert.equal(data.plan.legs.length, 4);
  const used = new Set();
  for (let v = 0; v < data.vertexCount; v++) {
    let sum = 0;
    for (let s = 0; s < 4; s++) { sum += data.skinWeight[v * 4 + s]; assert.ok(data.skinIndex[v * 4 + s] < QUADRUPED_BONE_NAMES.length); if (data.skinWeight[v * 4 + s]) used.add(data.skinIndex[v * 4 + s]); }
    assert.equal(sum, 255);
    for (let c = 0; c < 3; c++) assert.ok(Number.isFinite(data.positions[v * 3 + c]) && Number.isFinite(data.normals[v * 3 + c]));
  }
  for (let b = 1; b < QUADRUPED_BONE_NAMES.length; b++) assert.ok(used.has(b), `${QUADRUPED_BONE_NAMES[b]} drives skin`);
  for (const leg of data.plan.legs) {
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    assert.ok(Math.abs(dist(leg.hip, leg.knee) - leg.upperLength) < 1e-9 && Math.abs(dist(leg.knee, leg.ankle) - leg.lowerLength) < 1e-6);
    assert.deepEqual(data.plan.bones[leg.upperBone].rest, leg.hip);
    assert.equal(QUADRUPED_BONE_PARENTS[leg.upperBone], leg.parentBone);
    assert.ok(quadrupedBodyDistance(data.plan, ...leg.hip) < 0, `${leg.id} hip joint is inside the trunk`);
    assert.ok(Math.sign(leg.knee[0] - (leg.hip[0] + leg.ankle[0]) / 2) === leg.pole, `${leg.id} knee flexes toward its pole`);
  }
  for (const a of data.plan.appendages) assert.ok(quadrupedBodyDistance(data.plan, ...a.base) < 0, `${a.kind} is rooted inside the head`);
});

test('proportions respond to the genome fields they are derived from', () => {
  const base = generateCreatureGenome('PROPORTION', 'browser');
  const measure = genome => { const data = body(genome), box = bounds(data); return { data, box, head: data.plan.bones[BONE.head].rest, hip: data.plan.legs[0].hip }; };
  const ref = measure(base);
  const legs = measure({ ...base, legLength: base.legLength * 1.3 });
  assert.ok(legs.hip[1] > ref.hip[1] + base.legLength * .25 && legs.box.max[1] > ref.box.max[1] + base.legLength * .25, 'longer legs raise hips and the whole body');
  assert.ok(legs.data.plan.legs[0].upperLength > ref.data.plan.legs[0].upperLength);
  const neck = measure({ ...base, neckLength: base.neckLength * 1.8 });
  assert.ok(neck.head[1] > ref.head[1] + .2 && neck.box.max[1] > ref.box.max[1] + .2, 'a longer neck lifts the head');
  const tail = measure({ ...base, tailLength: base.tailLength * 2 });
  assert.ok(tail.box.min[0] < ref.box.min[0] - base.tailLength * .7, 'a longer tail extends the rear silhouette');
  const wide = measure({ ...base, torsoWidth: base.torsoWidth * 1.3, stanceWidth: base.stanceWidth * 1.3 });
  assert.ok(wide.box.max[2] - wide.box.min[2] > (ref.box.max[2] - ref.box.min[2]) * 1.15, 'a broader torso and stance widen the body');
  const upper = measure({ ...base, upperLegFraction: .6 });
  assert.ok(upper.data.plan.legs[0].upperLength / upper.data.plan.legs[0].lowerLength > ref.data.plan.legs[0].upperLength / ref.data.plan.legs[0].lowerLength);
  const armoured = createQuadrupedPlan({ ...base, armor: .8 }), plain = createQuadrupedPlan({ ...base, armor: 0 });
  assert.ok(armoured.primitives.filter(p => p.region === 'armor').length >= 4 && plain.primitives.every(p => p.region !== 'armor'));
  assert.equal(createQuadrupedPlan({ ...base, hornLength: 0 }).appendages.filter(a => a.kind === 'horn').length, 0);
  assert.equal(createQuadrupedPlan({ ...base, hornLength: .3 }).appendages.filter(a => a.kind === 'horn').length, 2);
  // Clade envelopes stay distinct at a common seed.
  const shapes = ARCHETYPES.map(a => { const box = bounds(body(generateCreatureGenome('CLADES', a))); return [box.max[0] - box.min[0], box.max[1] - box.min[1]]; });
  const long = shapes[3], low = shapes[2];
  assert.ok(long[1] > low[1] * 1.8, 'long-neck stands far taller than low-slung');
});

test('the resumable build is deterministic and bounded per step', () => {
  const genome = generateCreatureGenome('STEPPED', 'runner'), steps = quadrupedBodyBuildSteps(genome);
  let result, yields = 0, longest = 0;
  for (;;) { const t = performance.now(), next = steps.next(); longest = Math.max(longest, performance.now() - t); if (next.done) { result = next.value; break; } yields++; }
  const direct = buildQuadrupedBody(genome);
  assert.ok(yields > 20, 'work is divided into many resumable steps');
  for (const key of ['positions', 'normals', 'colors', 'skinIndex', 'skinWeight', 'index']) assert.deepEqual(result[key], direct[key], `${key} is reproducible`);
  assert.ok(longest < 250, `longest step ${longest.toFixed(1)} ms`);
  assert.throws(() => createQuadrupedPlan({ ...genome, legLength: Number.NaN }), /legLength/);
});
