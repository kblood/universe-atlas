// fauna-handoff-coverage (docs/transition-audit-2026-10-07.md F5, section 7):
// the near rig <-> instanced proxy handoff is one swap per band crossing, with
// complementary coverage weights through a bounded cross-fade, including the
// swaps inside 80 m (a time-sliced build finishing, capacity reassignment).
// Every assertion has a negative case: the former hard swap (fadeS 0) or a
// hysteresis-free selector, injected in-test, must fail the same check.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { faunaHerdAt, faunaMemberGenome, faunaMemberActivityAtWorldNs, faunaRigSecondsAt, toSeconds } from '../src/fauna-runtime.ts';
import { faunaGroundHeight, FAUNA_GROUND_N, FAUNA_GROUND_STEP_M, FAUNA_GROUND_HALF_M } from '../src/fauna-ground.ts';
import { FaunaNearRigs, FAUNA_NEAR_RIG_CAPACITY, FAUNA_NEAR_RIG_ENTER_M, FAUNA_NEAR_RIG_EXIT_M, FAUNA_NEAR_GEOMETRY_CACHE, FAUNA_NEAR_BUILD_BUDGET_MS } from '../src/fauna-near-rig.ts';
import { FAUNA_FIELD_CAPACITY, FAUNA_FIELD_EYE_DETAIL_M, FAUNA_FIELD_VISIBLE_M } from '../src/fauna-field-renderer.ts';
import { createHandoffState, handoffWeights, handoffInside, FAUNA_HANDOFF_ENTER_M, FAUNA_HANDOFF_EXIT_M, FAUNA_HANDOFF_FADE_S,
  FAUNA_EYE_FADE_END_M, FAUNA_RANGE_FADE_END_M } from '../src/fauna-handoff.ts';
import { CATALOGUE_EPOCH_NS } from '../src/world-time.ts';

const DT = 1 / 60, FADE = FAUNA_HANDOFF_FADE_S;
/** Largest per-frame coverage change an eased 0.3 s fade may make (smoothstep slope 1.5). */
const STEP_BOUND = 1.5 * DT / FADE + 1e-9;

// Oscillating 75 <-> 100 m (triangle wave, 0.5 m/frame) with +-3 m jitter, so
// the distance dithers across 80, 87.5 and 95 m several times per pass.
function oscillation(frames, lead = 0) {
  const out = [];
  for (let i = 0; i < frames; i++) {
    if (i < lead) { out.push(75); continue; }
    const k = (i - lead) % 100, tri = k < 50 ? 75 + k * .5 : 100 - (k - 50) * .5;
    out.push(tri + 3 * Math.sin(i * 2.3));
  }
  return out;
}
/** Representation targets the 80/95 m hysteresis demands, gated by readiness. */
function expectedTargets(distances, ready, enter = FAUNA_HANDOFF_ENTER_M, exit = FAUNA_HANDOFF_EXIT_M) {
  let inside = false;
  return distances.map((d, i) => { inside = handoffInside(d, inside, enter, exit); return inside && ready[i] ? 1 : 0; });
}
const flips = seq => seq.reduce((n, v, i) => n + (i > 0 && v !== seq[i - 1] ? 1 : 0), 0);
/** Target a coverage trace is heading for, read from the trace alone. */
function observedTargets(rig) {
  return rig.map((w, i) => w === 1 ? 1 : w === 0 ? 0 : w > (i ? rig[i - 1] : 0) ? 1 : 0);
}

/** The coverage contract for one member's per-frame trace. */
function assertCoverage(trace, label) {
  for (let i = 0; i < trace.rig.length; i++) {
    const rig = trace.rig[i], proxy = trace.proxy[i];
    assert.ok(rig >= 0 && rig <= 1 && proxy >= 0 && proxy <= 1, `${label} frame ${i}: weights in [0, 1]`);
    assert.ok(Math.abs(rig + proxy - 1) <= 1e-12, `${label} frame ${i}: rig ${rig} + proxy ${proxy} = 1`);
    if (i) assert.ok(Math.abs(rig - trace.rig[i - 1]) <= STEP_BOUND, `${label} frame ${i}: coverage step ${Math.abs(rig - trace.rig[i - 1]).toFixed(4)} > ${STEP_BOUND.toFixed(4)} (hard swap)`);
  }
}
function assertOneSwapPerCrossing(trace, distances, ready, label) {
  const expected = expectedTargets(distances, ready), observed = observedTargets(trace.rig);
  assert.equal(flips(observed), flips(expected), `${label}: ${flips(observed)} swaps for ${flips(expected)} band crossings`);
  assert.deepEqual(observed, expected, `${label}: each swap begins on the frame its crossing happens`);
}

test('constants keep their former values (acceptance f)', () => {
  assert.equal(FAUNA_FIELD_CAPACITY, 512);
  assert.equal(FAUNA_NEAR_RIG_CAPACITY, 6);
  assert.equal(FAUNA_NEAR_RIG_ENTER_M, 80); assert.equal(FAUNA_NEAR_RIG_EXIT_M, 95);
  assert.equal(FAUNA_NEAR_GEOMETRY_CACHE, 8); assert.equal(FAUNA_NEAR_BUILD_BUDGET_MS, 2.5);
  assert.equal(FAUNA_FIELD_EYE_DETAIL_M, 60); assert.equal(FAUNA_FIELD_VISIBLE_M, 600);
  // The pure module's bands are the renderers' own cuts, not new ones.
  assert.equal(FAUNA_HANDOFF_ENTER_M, FAUNA_NEAR_RIG_ENTER_M); assert.equal(FAUNA_HANDOFF_EXIT_M, FAUNA_NEAR_RIG_EXIT_M);
  assert.equal(FAUNA_EYE_FADE_END_M, FAUNA_FIELD_EYE_DETAIL_M); assert.equal(FAUNA_RANGE_FADE_END_M, FAUNA_FIELD_VISIBLE_M);
  assert.equal(FADE, .3);
});

test('pure handoff: one swap per crossing, complementary eased weights; hard swap and no hysteresis fail', () => {
  const distances = oscillation(600, 20);
  // Delayed build: the rig is not available for the first 45 frames inside 80 m.
  const ready = distances.map((_, i) => i >= 45);
  const run = options => {
    const state = createHandoffState(false), trace = { rig: [], proxy: [] };
    distances.forEach((d, i) => { state.ready = ready[i]; handoffWeights(d, state, DT, options); trace.rig.push(state.rig); trace.proxy.push(state.proxy); });
    return { trace, swaps: state.swaps };
  };
  const { trace, swaps } = run({ fadeS: FADE });
  assertCoverage(trace, 'pure');
  assertOneSwapPerCrossing(trace, distances, ready, 'pure');
  assert.equal(swaps, flips(expectedTargets(distances, ready)), 'the state counts the same swaps');
  assert.ok(swaps >= 10, `the trace crosses the band repeatedly (${swaps})`);
  assert.ok(trace.rig.some(w => w > 0 && w < 1), 'the trace has overlap frames');
  assert.equal(trace.rig[44], 0, 'no rig before the build completes');
  // Negative 1: the former hard swap (fadeS 0) breaks the coverage bound.
  assert.throws(() => assertCoverage(run({ fadeS: 0 }).trace, 'hard swap'), /hard swap/);
  // Negative 2: a selector without hysteresis swaps several times per crossing.
  const noHysteresis = run({ fadeS: FADE, enterM: 87.5, exitM: 87.5 });
  assert.throws(() => assertOneSwapPerCrossing(noHysteresis.trace, distances, ready, 'no hysteresis'), /swaps for/);
});

// --- FaunaNearRigs with the cross-fade -------------------------------------
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
const MEMBERS = members(3);
const grid = new Float64Array(FAUNA_GROUND_N ** 2);
for (let j = 0; j < FAUNA_GROUND_N; j++) for (let i = 0; i < FAUNA_GROUND_N; i++)
  grid[j * FAUNA_GROUND_N + i] = 40 + (i * FAUNA_GROUND_STEP_M - FAUNA_GROUND_HALF_M) * .06 + Math.cos(j * 1.3 + i * .4) * .5;
const ground = (x, z) => faunaGroundHeight(grid, x, z);
const NOW = CATALOGUE_EPOCH_NS + 5_500_000_000n;
const candidate = (member, distanceM) => ({ member, genome: faunaMemberGenome(member), distanceM, matrix: new THREE.Matrix4().makeTranslation(distanceM, 0, 0),
  activity: faunaMemberActivityAtWorldNs(member, NOW), ground, rigSeconds: faunaRigSecondsAt(NOW) });
/** One build step per fake millisecond: a body takes many frames (a delayed, time-sliced build). */
function steppedClock() { let t = 0; return () => t++; }
/**
 * PlanetRenderer.drawFauna's near-candidate cut with the REQUIRED widening
 * hook (needs: planet-renderer.ts:2069): animals within the 95 m retention
 * range, plus any member a slot still holds, so a fade-out is re-posed with a
 * fresh matrix every frame until it completes.
 */
const widenedCut = (member, d) => near => d <= FAUNA_NEAR_RIG_EXIT_M || near.holds(member.id) ? [candidate(member, d)] : [];

/**
 * No stale rig: every drawn rig mesh carries the matrix of its member's
 * candidate in THIS frame's list. Candidate matrices are origin-relative and
 * the planet moves the parent group to the eye each frame, so a visible rig
 * on an older matrix slides with the camera over a proxy that walked on.
 */
function assertNoStaleRig(near, list, label = 'rig') {
  for (const mesh of near.group.children) {
    if (!mesh.visible) continue;
    const own = list.find(c => near.meshOf(c.member.id) === mesh);
    assert.ok(own, `${label}: a visible rig has no candidate this frame (stale matrix)`);
    assert.ok(mesh.matrix.equals(own.matrix), `${label}: a visible rig is not on this frame's matrix (stale matrix)`);
  }
}

/** Drives `near` through per-frame candidate lists (or `near => list`) and records each member's coverage. */
function drive(near, frames, ids) {
  const traces = Object.fromEntries(ids.map(id => [id, { rig: [], proxy: [] }])), readyBefore = Object.fromEntries(ids.map(id => [id, []]));
  frames.forEach(frame => {
    const list = typeof frame === 'function' ? frame(near) : frame;
    // Readiness = the body is in the geometry cache when selection runs
    // (read from the private cache: test-only observation, no mutation).
    for (const id of ids) readyBefore[id].push(near.cache.has(id));
    const replaced = near.update(list, DT);
    assertNoStaleRig(near, list);
    for (const id of ids) {
      const rig = near.rigWeightOf(id), proxy = near.proxyWeightOf(id), mesh = near.meshOf(id);
      traces[id].rig.push(rig); traces[id].proxy.push(proxy);
      // The returned set is exactly the fully replaced proxies; the caller
      // keeps drawing every other proxy, so the overlap shows both forms.
      assert.equal(replaced.has(id), proxy === 0, `${id}: returned set <=> proxy coverage 0`);
      if (rig > 0) { assert.ok(mesh?.visible, 'a covering rig is drawn'); assert.equal(mesh.material.opacity, rig, 'dither coverage = rig weight'); assert.equal(mesh.material.alphaHash, near.fadeS > 0, 'dithered only with a fade'); }
      else assert.ok(!mesh || !mesh.visible, 'a rig with no coverage is not drawn');
    }
  });
  return { traces, readyBefore };
}
test('near rigs: oscillating 75 <-> 100 m with a delayed build, one swap per crossing; the hard swap fails', () => {
  const member = MEMBERS[0], id = member.id, distances = oscillation(560, 40);
  // PlanetRenderer.drawFauna with the required widening hook: a released rig
  // stays listed (and re-posed) until its fade-out completes.
  const frames = distances.map(d => widenedCut(member, d));
  const run = options => {
    const near = new FaunaNearRigs({ capacity: 2, now: steppedClock(), buildBudgetMs: 3, ...options });
    try { return drive(near, frames, [id]); } finally { near.dispose(); }
  };
  const { traces, readyBefore } = run({ fadeS: FADE });
  const ready = readyBefore[id];
  assert.ok(ready.indexOf(true) > 5, `the body builds over several frames (ready at frame ${ready.indexOf(true)})`);
  assertCoverage(traces[id], 'near rig');
  assertOneSwapPerCrossing(traces[id], distances, ready, 'near rig');
  assert.ok(flips(observedTargets(traces[id].rig)) >= 8, 'the trace crosses the band repeatedly');
  // The build finishing inside 80 m starts a fade, not a pop.
  const first = traces[id].rig.findIndex(w => w > 0);
  assert.ok(first > 0 && traces[id].rig[first] <= STEP_BOUND, `first rig coverage ${traces[id].rig[first]}`);
  // Negative: the former hard swap on the same candidate lists.
  const hard = run({ fadeS: 0 });
  assert.throws(() => assertCoverage(hard.traces[id], 'hard swap'), /hard swap/);
  // Negative: no hysteresis band, same fade, swaps more than once per crossing.
  const flat = run({ fadeS: FADE, enterM: 87.5, exitM: 87.5 });
  assert.throws(() => assertOneSwapPerCrossing(flat.traces[id], distances, flat.readyBefore[id], 'no hysteresis'), /swaps for/);
});

test('near rigs: capacity reassignment inside 80 m fades the old rig out before the new one fades in; the hard swap fails', () => {
  const [a, b] = MEMBERS, frames = [];
  for (let i = 0; i < 260; i++) frames.push([candidate(b, 50)]);                       // B builds and rigs
  for (let i = 0; i < 260; i++) frames.push([candidate(a, 50), candidate(b, 100)]);    // A builds; B walks past 95 m (still listed)
  for (let i = 0; i < 120; i++) frames.push([candidate(b, 40), candidate(a, 60)]);     // B outranks A for the one slot
  const run = fadeS => {
    const near = new FaunaNearRigs({ capacity: 1, cacheSize: 4, now: steppedClock(), buildBudgetMs: 12, fadeS });
    try { return drive(near, frames, [a.id, b.id]).traces; } finally { near.dispose(); }
  };
  const traces = run(FADE);
  for (const id of [a.id, b.id]) assertCoverage(traces[id], id);
  // Capacity 1: the two rigs never overlap; a fading-out rig keeps the slot.
  for (let i = 0; i < frames.length; i++) assert.ok(traces[a.id].rig[i] === 0 || traces[b.id].rig[i] === 0, `frame ${i}: one slot, one rig`);
  const swap = 520, aOut = traces[a.id].rig.slice(swap), bIn = traces[b.id].rig.slice(swap);
  assert.equal(traces[a.id].rig[swap - 1], 1, 'A fully rigged before B returns');
  const aGone = aOut.indexOf(0), bStart = bIn.findIndex(w => w > 0);
  assert.ok(aGone > 5 && bStart > aGone, `A fades out over ${aGone} frames, then B fades in from frame ${bStart}`);
  assert.equal(bIn.at(-1), 1, 'B ends fully rigged');
  // B passed 95 m at frame 260 while rigged and still listed: it fades out, re-posed each frame.
  assert.ok(traces[b.id].rig[260] < 1 && traces[b.id].rig[260] > 0, 'B fades out after passing the exit distance');
  // Negative: the former instant reassignment.
  const hard = run(0);
  assert.throws(() => { for (const id of [a.id, b.id]) assertCoverage(hard[id], id); }, /hard swap/);
});

test('near rigs: a member dropped from the list mid-fade is released at once, never left on a stale matrix; keeping its last pose fails', () => {
  const member = MEMBERS[2], id = member.id;
  // The eye moves every frame, so every candidate matrix differs from the last
  // one (as planet-renderer.ts composes item.position - lifeOrigin).
  let frame = 0;
  const moving = d => { const c = candidate(member, d); c.matrix.makeTranslation(d - frame * .25, frame * .01, frame * .13); return c; };
  const script = [];
  const phase = (n, d, tag) => { for (let i = 0; i < n; i++) script.push({ d, tag: i === 0 ? tag : null }); };
  phase(200, 50, 'rig');            // build, fade in, fully rigged
  phase(5, 100, 'fadeOut');         // past 95 m, still listed: fading out, re-posed
  phase(10, null, 'dropOut');       // dropped from the list mid fade-out
  phase(5, 50, 'fadeIn');           // back inside 80 m: fading in
  phase(10, null, 'dropIn');        // dropped from the list mid fade-in
  phase(60, 50, 'rigAgain');        // fully rigged again
  phase(10, null, 'dropFull');      // dropped while fully rigged
  const run = patch => {
    const near = new FaunaNearRigs({ capacity: 1, now: steppedClock(), buildBudgetMs: 60, fadeS: FADE });
    patch?.(near);
    const at = {};
    try {
      frame = 0;
      for (const step of script) {
        const before = near.rigWeightOf(id);
        const list = step.d === null ? [] : [moving(step.d)];
        near.update(list, DT);
        assertNoStaleRig(near, list, `frame ${frame}`);
        if (step.tag) at[step.tag] = { before, after: near.rigWeightOf(id), proxy: near.proxyWeightOf(id), mesh: near.meshOf(id), held: near.holds(id) };
        frame++;
      }
      return { at, diagnostics: near.diagnostics() };
    } finally { near.dispose(); }
  };
  const { at, diagnostics } = run();
  assert.equal(at.fadeOut.before, 1, 'fully rigged before passing 95 m');
  for (const tag of ['dropOut', 'dropIn']) {
    assert.ok(at[tag].before > 0 && at[tag].before < 1, `${tag}: the drop lands mid-fade (${at[tag].before})`);
    assert.equal(at[tag].after, 0, `${tag}: released at once`);
    assert.equal(at[tag].proxy, 1, `${tag}: the proxy carries the animal`);
    assert.equal(at[tag].mesh, null, `${tag}: no slot keeps the member`);
    assert.equal(at[tag].held, false, `${tag}: holds() reports the release`);
  }
  assert.equal(at.dropFull.before, 1); assert.equal(at.dropFull.after, 0, 'a fully rigged member dropped from the list is released at once');
  assert.equal(diagnostics.unlistedDrops, 3, 'each unlisted drop is counted');
  // Negative: the former "keep the last pose for the rest of the fade-out".
  assert.throws(() => run(near => { near.dropUnlisted = () => {}; }), /stale matrix/);
});

test('near rigs at the current 95 m candidate cut (no widening hook): exits drop instead of fading, but no rig is stale', () => {
  const member = MEMBERS[0], id = member.id;
  const near = new FaunaNearRigs({ crossFade: true, capacity: 2, now: steppedClock(), buildBudgetMs: 60 });
  try {
    let drops = 0;
    for (let i = 0; i < 400; i++) {
      // 70 m for 200 frames, then out to 120 m and back (0.5 m/frame steps).
      const d = i < 200 ? 70 : 70 + Math.min(i - 200, 400 - i) * .5;
      const list = d <= FAUNA_NEAR_RIG_EXIT_M ? [candidate(member, d)] : [], before = near.rigWeightOf(id);
      near.update(list, DT);
      assertNoStaleRig(near, list, `${d.toFixed(1)} m`);
      if (before > 0 && !list.length) { assert.equal(near.rigWeightOf(id), 0, 'unlisted: released at once'); drops++; }
    }
    assert.equal(drops, 1, 'the one exit past 95 m is a hard drop without the widening hook');
    assert.equal(near.diagnostics().unlistedDrops, 1);
  } finally { near.dispose(); }
});

test('near rigs without a fade keep the former behaviour and report no fade state', () => {
  const near = new FaunaNearRigs({ capacity: 1, now: steppedClock(), buildBudgetMs: 60 });
  try {
    let drawn; for (let i = 0; i < 300; i++) drawn = near.update([candidate(MEMBERS[0], 10)]);
    assert.ok(drawn.has(MEMBERS[0].id));
    assert.equal(near.proxyWeightOf(MEMBERS[0].id), 0); assert.equal(near.rigWeightOf(MEMBERS[0].id), 1);
    const material = near.meshOf(MEMBERS[0].id).material;
    assert.equal(material.alphaHash, false); assert.equal(material.opacity, 1);
    const d = near.diagnostics();
    assert.ok(!('fadeS' in d) && !('rigWeight' in d.activeMembers[0]), 'diagnostics shape unchanged');
    assert.equal(near.update([candidate(MEMBERS[0], 96)]).size, 0, 'released at once past 95 m');
    assert.equal(near.proxyWeightOf(MEMBERS[0].id), 1);
  } finally { near.dispose(); }
});

test('planet hooks applied (crossFade rigs, proxy skipped only for returned ids): no frame leaves an animal uncovered, and idle waits for fades', () => {
  const member = MEMBERS[1], id = member.id;
  const near = new FaunaNearRigs({ crossFade: true, capacity: 2, now: steppedClock(), buildBudgetMs: 60 });
  try {
    assert.equal(near.fadeS, FADE, 'crossFade is the 0.3 s fade');
    const distances = [];
    for (let i = 0; i < 200; i++) distances.push(70);                 // build, then fade in
    for (let i = 0; i < 80; i++) distances.push(70 + i * .5);         // walk out past 95 m
    for (let i = 0; i < 80; i++) distances.push(110 - i * .5);        // and back inside 80 m
    let overlap = 0, sawIdleDuringFade = false;
    for (const d of distances) {
      // PlanetRenderer.drawFauna with both required hooks: the widened cut
      // (95 m plus held members) and the proxy skipped only for returned ids.
      const list = widenedCut(member, d)(near), rigged = near.update(list, DT);
      assertNoStaleRig(near, list);
      const proxyDrawn = !rigged.has(id), rig = near.rigWeightOf(id);
      assert.ok((proxyDrawn ? 1 : 0) + rig >= 1, `${d.toFixed(1)} m: the animal is covered`);
      assert.ok(proxyDrawn || near.proxyWeightOf(id) === 0, 'the proxy is drawn whenever it still has coverage');
      if (proxyDrawn && rig > 0) overlap++;
      if (rig > 0 && rig < 1 && near.idle) sawIdleDuringFade = true;
    }
    assert.ok(overlap >= 2 * Math.floor(FADE / DT) - 2, `both forms drawn through each overlap (${overlap} frames)`);
    assert.equal(sawIdleDuringFade, false, 'an unchanged frame never skips a fading rig');
  } finally { near.dispose(); }
});
