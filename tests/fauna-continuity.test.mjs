import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { faunaHerdAt, faunaMemberActivityAtWorldNs, faunaMemberGenome, toSeconds } from '../src/fauna-runtime.ts';
import { surfaceCellsWithin } from '../src/surface-cell.ts';
import { FaunaFieldRenderer, FAUNA_FIELD_CAPACITY, FAUNA_FIELD_EYE_DETAIL_M, FAUNA_FIELD_VISIBLE_M } from '../src/fauna-field-renderer.ts';
import { NS } from '../src/world-time.ts';
import { galaxies, refByAddress, system } from '../src/catalog.ts';

// Regression for the close-fauna follow-up (docs/fauna-continuity-2026-09-28.md).
// The follow-up fixture "lost" G001/C2128,0,1/0/planet/1:fauna:562ff898 after
// an in-page 1.75 s seek. Diagnosis: the individual never left the census or
// its draw range. An in-page seek from the ground releases the walker into the
// 160 m observation hover (time-and-coordinates-contract.md §3.3), the old
// fixture then dereferenced the null walker, and the 1.75 s step lies inside
// the individual's seeded idle window, so zero displacement is correct. The
// fixture below was exported by tests/fauna-continuity-fixture.browser.mjs from
// grounded exact-date restores in the running app.
const F = JSON.parse(readFileSync(new URL('./fixtures/fauna-continuity-562ff898.json', import.meta.url), 'utf8'));
// The body's own life seed, derived from the universe seed through the catalog.
const body = system(refByAddress(galaxies(F.seed)[0], F.bodyId.split('/planet/')[0])).planets.find(b => b.id === F.bodyId);
const canonicalCell = F.cellId.split('/').slice(2).join('/');
// The real cell passed its (lower) habitat roll; full habitat cannot reject it.
const fullHabitat = { weights: [0, 1, 0, 0], forestPotential: false, moisture: 1, slopeDeg: 0, ocean: false };
const member = () => faunaHerdAt(body.seed, body.id, F.direction, fullHabitat,
  { stage: 'complex', species: [F.species] }, toSeconds(0), canonicalCell).members[F.memberIndex];
const ns = offsetS => BigInt(F.date) + BigInt(Math.round(offsetS * 1e9));
const metres = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('the follow-up individual is a pure function of seed, body, canonical cell and species', () => {
  assert.equal(body.radiusM, F.bodyRadiusM);
  const m = member();
  assert.equal(m.id, F.targetId);
  const { speciesGenome, ...record } = m;
  assert.equal(speciesGenome, F.species.creature);
  assert.deepEqual(JSON.parse(JSON.stringify(record)), F.member, 'Node reproduces the browser census record');
  // Visit order and unrelated queries cannot change it.
  for (let i = 0; i < 20; i++) faunaHerdAt(body.seed, body.id, [Math.cos(i), Math.sin(i), .3], fullHabitat, { stage: 'complex', species: [F.species] }, toSeconds(0), `other/${i}`);
  assert.deepEqual(member(), m);
});

test('exact dated poses match the grounded browser observations at every offset', () => {
  const m = member();
  for (const o of F.observed) {
    const a = faunaMemberActivityAtWorldNs(m, BigInt(o.worldNs));
    assert.equal(a.pose.gait, o.pose.gait, `+${o.offsetS}s gait`);
    assert.ok(Math.abs(a.pose.x - o.pose.x) < 1e-9 && Math.abs(a.pose.z - o.pose.z) < 1e-9, `+${o.offsetS}s position`);
    assert.ok(Math.abs(a.stateS - o.pose.stateS) < 1e-9, `+${o.offsetS}s schedule`);
    // Drawn at every offset; which of the six rig slots it gets depends on the
    // (unaimed) camera facing, so either drawn stage is valid.
    assert.ok(['near-rig', 'instanced'].includes(o.stage), `+${o.offsetS}s the grounded observer draws it (${o.stage})`);
    if (o.offsetS <= 10) assert.equal(o.stage, 'near-rig', `+${o.offsetS}s idle 8 m away: rigged`);
  }
  // Direct seeks agree with any other evaluation order (no accumulated state).
  const direct = faunaMemberActivityAtWorldNs(m, ns(1.75));
  for (const s of [30, 0, 10, .25, 20]) faunaMemberActivityAtWorldNs(m, ns(s));
  assert.deepEqual(faunaMemberActivityAtWorldNs(m, ns(1.75)), direct);
});

test('the 1.75 s step lies inside one seeded idle window; walking resumes at its end', () => {
  const m = member(), start = faunaMemberActivityAtWorldNs(m, ns(0));
  assert.equal(start.pose.gait, 'idle');
  const idleEndS = m.gaitPeriodS - start.stateS;
  assert.ok(idleEndS > 10, `idle window lasts past +10 s (ends at +${idleEndS.toFixed(3)} s)`);
  for (const s of [.25, .5, 1, 1.75, 3, 5, 10]) {
    const a = faunaMemberActivityAtWorldNs(m, ns(s));
    assert.equal(a.pose.gait, 'idle');
    assert.equal(metres(a.pose, start.pose), 0, `+${s}s: an idle animal does not translate`);
    assert.ok(Math.abs(a.stateS - start.stateS - s) < 1e-9);
  }
  // Ordinary time advances motion once the window ends, continuously.
  const end = ns(0) + BigInt(Math.round(idleEndS * 1e9));
  const before = faunaMemberActivityAtWorldNs(m, end - 1_000_000n), after = faunaMemberActivityAtWorldNs(m, end + 1_000_000n);
  assert.equal(before.pose.gait, 'idle'); assert.equal(after.pose.gait, 'walk');
  const speed = Math.abs(m.orbitAngularSpeed) * m.orbitRadiusM;
  assert.ok(metres(before.pose, after.pose) <= speed * .002 + 1e-9, 'no teleport across the idle/walk boundary');
  assert.ok(metres(faunaMemberActivityAtWorldNs(m, ns(20)).pose, start.pose) > 1, 'walking by +20 s');
  assert.ok(metres(faunaMemberActivityAtWorldNs(m, ns(30)).pose, start.pose) > 1, 'still walking by +30 s');
  // Pure periodic schedule: one full idle+walk cycle later it idles again.
  const cycleNs = 3n * BigInt(Math.round(m.gaitPeriodS * Number(NS)));
  assert.equal(faunaMemberActivityAtWorldNs(m, ns(1.75) + cycleNs).pose.gait, 'idle');
});

test('observation hover keeps the individual resident and within draw range', () => {
  // A grounded seek lifts the observer 160 m straight up. Life is focused on
  // the ground point below the observer, so the resident cell set is unchanged;
  // only the camera frustum (unchanged heading, now 160 m up) excludes the animal.
  const radius = F.bodyRadiusM, ground = new THREE.Vector3(...F.observed[0].walker);
  const direction = ground.clone().normalize();
  const hover = direction.clone().multiplyScalar(ground.length() + 160);
  const hoverFocus = hover.clone().normalize();
  assert.ok(hoverFocus.distanceTo(direction) * radius < 1e-6, 'same life focus on the ground');
  const cells = surfaceCellsWithin(hoverFocus.toArray(), radius, FAUNA_FIELD_VISIBLE_M, 32).map(c => c.id);
  assert.ok(cells.includes(canonicalCell), 'the canonical cell stays resident');
  const animal = new THREE.Vector3(...F.observed[4].position).multiplyScalar(radius);
  const d = hover.distanceTo(animal);
  assert.ok(d > 150 && d < FAUNA_FIELD_VISIBLE_M, `hover distance ${d.toFixed(2)} m is inside the visible range`);
});

test('the instanced field draws the whole measured in-view population without a distance-rank cutoff', () => {
  // Ground-level census at the follow-up pose (trace at 743b3f4): 224
  // camera-visible animals plus 65 off-camera shadow casters within 600 m.
  // A 128-animal cap dropped 96 in-view animals, so a distant animal's
  // presence depended on how many nearer animals the camera faced.
  const cameraVisible = 224, shadowOnly = 65;
  assert.ok(FAUNA_FIELD_CAPACITY >= cameraVisible + shadowOnly);
  const field = new FaunaFieldRenderer(), genome = faunaMemberGenome(member()), m = new THREE.Matrix4();
  const bodies = field.group.children.find(c => c.name === 'Fauna bodies and eyes');
  field.beginFrame(new THREE.Vector3());
  for (let i = 0; i < cameraVisible + shadowOnly; i++)
    assert.ok(field.submit(genome, m.makeTranslation(i, 0, 0), 1, 'walk', 5 + i * 2), `animal ${i} is drawn`);
  field.endFrame();
  assert.equal(field.count, cameraVisible + shadowOnly);
  // Eyes are a fixed-distance detail: two per animal inside 60 m, none beyond.
  const inside = Array.from({ length: cameraVisible + shadowOnly }, (_, i) => 5 + i * 2).filter(d => d <= FAUNA_FIELD_EYE_DETAIL_M).length;
  assert.equal(bodies.count, (cameraVisible + shadowOnly) * 2 + inside * 2);
  // The budget only ever refuses beyond its documented capacity.
  field.beginFrame(new THREE.Vector3());
  for (let i = 0; i < FAUNA_FIELD_CAPACITY; i++) assert.ok(field.submit(genome, m, 1, 'idle', 300));
  assert.equal(field.submit(genome, m, 1, 'idle', 300), false);
  field.endFrame(); field.dispose();
});
