// Coarse frame (docs/lod-ladder-contract-v1.md section 3.1; owner principle, Kasper 2026-10-06): the coarse levels carry
// the large-scale structure; a finer tile gets some room but lies within the coarse frame, and tile-to-tile edges match,
// especially at the mountains. Element test with the staged mountains on ({mountains: true}, the test hook of
// tests/lod-carving-reduction.test.mjs), on the four real water worlds, on tiles that touch a massif (selected by the T1
// band grid and the belt query; tests/helpers/lod-coarse-frame.mjs). Each world is measured in its own worker thread.
//
// (1) FRAME at the shared (co-located) lattice vertices of every parent/child pair L -> L+1, L = 0 .. the last
//     peak-corrected level: parent - ROOM <= child <= parent + EPS_UP. ROOM is measured per world and pair (FRAME_ROOM_M
//     below: measured max + 25%, rounded up to 50 m). EPS_UP is the existing 0.05 m morph rule. The upper side is NOT MET
//     at peak-corrected child levels (a todo with the measured numbers: each level's peak correction reads its own finer
//     cell centres, so a child can rise above its parent); it holds exactly where the child stores point samples, and the
//     section 5 height tolerance holds everywhere.
// (2) EDGE MATCH: same-level neighbours sharing an edge (siblings, a non-sibling pair across a parent boundary, the 12
//     cube edges at L0, and cube-face edges on a massif at L(cut-1) and L(cut)): stored and morph-start edge heights
//     Object.is-identical from both builds (so no morph state opens a gap), and the rendered edge vertices (Float32,
//     anchor-relative) at morph t = 0 and t = 1 within the Float32 rounding bound of the two buffers.
// (3) COARSE-ONLY continuity: a net over all six faces sampled with the coarse system only (the L(cut-1) sampler,
//     0 M3 block solves by counter): no jump between neighbouring samples above SLOPE_BOUND x their distance, also after
//     refining every belt edge, massif edge, belt switch and height-flagged interval to REFINE sub-intervals.
// Negative controls (must fail): a child carved with 2x depth (frame), one edge vertex offset by 1 m (edge match), a
// 10 m step on every belt (continuity).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {LOD_TOLERANCES, carvingFromLevel, peakCorrectionMaxLevel} from '../src/lod-ladder.ts';
import {frameViolations, edgeViolations, stats, CONTROL, SLOPE_BOUND, REFINE, NET, FRAME_SITES} from './helpers/lod-coarse-frame.mjs';
import {waterWorlds} from './terrain-climate-fixtures.mjs';

const WORLDS = ['Maithea', 'Selawyn', 'Raiva', 'Lethuris'];
/** The existing 0.05 m morph rule (tests/lod-consistency.test.mjs, tests/lod-carving-reduction.test.mjs). */
const EPS_UP_M = .05;
/** ROOM per world and parent level L (pair L -> L+1): measured max of (parent - child) + 25%, rounded up to 50 m.
 * Measured values: section 3.1 of docs/lod-ladder-contract-v1.md. */
const FRAME_ROOM_M = {
  Maithea: [4900, 4200, 4950, 3250, 1000, 1550, 750, 500, 300, 200],
  Selawyn: [3600, 3400, 3450, 1650, 850, 500, 2000, 900, 400, 250, 250],
  Raiva: [2350, 2100, 2650, 1750, 800, 300, 300, 100, 100],
  Lethuris: [4800, 4950, 4550, 2200, 1350, 950, 2350, 700, 950, 300, 250],
};

let measured;
const measure = () => measured ??= Promise.all(WORLDS.map(name => new Promise((resolve, reject) => {
  const w = new Worker(new URL('./helpers/lod-coarse-frame.mjs', import.meta.url), {workerData: name});
  w.once('message', resolve);w.once('error', reject);
  w.once('exit', code => {if (code !== 0) reject(new Error(`${name} worker exit ${code}`));});
})));
const fmt = s => `p50 ${s.p50.toFixed(1)} / p99 ${s.p99.toFixed(1)} / max ${s.max.toFixed(1)} m (${s.count} points)`;

test('HARD: selection: massif-touching tiles by the T1 grid and belt query; coarse builds solve 0 M3 blocks', async t => {
  const all = await measure(), bodies = Object.fromEntries(waterWorlds().map(b => [b.name, b]));
  for (const r of all) {
    assert.equal(r.cut, carvingFromLevel(bodies[r.world].radiusM));assert.equal(r.corrMax, peakCorrectionMaxLevel(bodies[r.world].radiusM));
    assert.equal(r.sites.length, FRAME_SITES, `${r.world}: ${FRAME_SITES} massif axis sites`);
    for (const s of r.selected) if (s.role === 'frame') assert.ok(s.massifSamples > 0, `${r.world} ${s.tile}: touches a massif`);
    assert.equal(r.solves.coarse, 0, `${r.world}: tiles below L${r.cut} solve no M3 block`);
    assert.ok(r.solves.fine > 0, `${r.world}: carved tiles do solve blocks (the counter is live)`);
    const byLevel = {};for (const s of r.selected) if (s.role === 'frame') (byLevel[s.level] ??= []).push(s.massifSamples);
    t.diagnostic(`${r.world}: cut L${r.cut}, last corrected L${r.corrMax}, ${r.selected.filter(s => s.role === 'frame').length} frame tiles (+${r.selected.filter(s => s.role !== 'frame').length} edge-only); per level [tiles: massif samples of 65x65]: ${Object.entries(byLevel).map(([L, a]) => `L${L} [${a.length}: ${a.join(',')}]`).join(' ')}; block solves fine ${r.solves.fine}; ${(r.ms / 1000).toFixed(1)} s`);
  }
});

test('HARD: FRAME lower side: child >= parent - ROOM at every shared point of every pair (ROOM measured per pair)', async t => {
  for (const r of await measure()) for (const f of r.frame) {
    assert.equal(FRAME_ROOM_M[r.world].length, r.frame.length, `${r.world}: a ROOM pin for every pair L0 -> L${r.corrMax + 1}`);
    const room = FRAME_ROOM_M[r.world][f.L], s = stats(f.pairs.flatMap(p => p.parent.map((v, i) => v - p.child[i])));
    t.diagnostic(`${r.world} L${f.L}->${f.L + 1}${f.switch ? ' (switch)' : ''}: ${f.pairs.length} pairs, parent - child ${fmt(s)}; ROOM ${room} m`);
    assert.ok(room > 0, `${r.world} L${f.L}: ROOM pinned`);
    for (const p of f.pairs) assert.ok(p.parent.length === 289 && p.child.length === 289, `${r.world} ${p.C}: 17 x 17 shared points`);
    for (const p of f.pairs) assert.equal(frameViolations(p, room, Infinity).below, 0, `${r.world} ${p.P} -> ${p.C}: child below parent - ${room} m`);
  }
});

test('HARD: FRAME upper side where the child stores point samples (child level > last corrected level): child <= parent + 0.05 m', async () => {
  let pairs = 0;
  for (const r of await measure()) for (const f of r.frame) if (!f.childCorrected) for (const p of f.pairs) {
    pairs++;assert.equal(frameViolations(p, Infinity, EPS_UP_M).above, 0, `${r.world} ${p.P} -> ${p.C}`);
  }
  assert.ok(pairs >= 4 * FRAME_SITES, 'one such pair per site and world');
});

test('HARD: FRAME upper side at peak-corrected child levels: child - parent within the section 5 height tolerance', async t => {
  for (const r of await measure()) for (const f of r.frame) if (f.childCorrected) {
    const s = stats(f.pairs.flatMap(p => p.child.map((v, i) => v - p.parent[i])));
    t.diagnostic(`${r.world} L${f.L}->${f.L + 1}: child - parent ${fmt(s)} (strict bound ${EPS_UP_M} m)`);
    assert.ok(s.p99 <= LOD_TOLERANCES.heightP99M(f.edgeM) && s.max <= LOD_TOLERANCES.heightMaxM(f.edgeM), `${r.world} L${f.L}`);
  }
});

test('FRAME upper side at peak-corrected child levels: child <= parent + 0.05 m (NOT MET, OPEN finding: section 3.1)', {todo: 'measured child - parent up to ~3.9 km at S0/S1 pairs; the peak correction of each level reads its own cell centres'}, async () => {
  const bad = [];
  for (const r of await measure()) for (const f of r.frame) if (f.childCorrected) {
    const v = f.pairs.reduce((k, p) => k + frameViolations(p, Infinity, EPS_UP_M).above, 0);
    if (v) bad.push(`${r.world} L${f.L}->${f.L + 1}: ${v} of ${f.pairs.length * 289}`);
  }
  assert.deepEqual(bad, []);
});

// Point-level model of a 2x carve: there is no source hook for a doubled carving depth, so the child's stored height is
// lowered once more by its own point-sample carving depth (uncarved - carved sample) at each shared point; the peak
// correction is not re-run on the mutant.
test('HARD: negative control: a switch child carved with 2x depth leaves the frame on every world', async t => {
  for (const r of await measure()) {
    const f = r.frame.find(x => x.switch), room = FRAME_ROOM_M[r.world][f.L];let caught = 0;
    assert.ok(f && f.pairs.length === FRAME_SITES);
    for (const p of f.pairs) {
      assert.ok(Math.max(...p.carveDepth) > 0, 'the switch child is carved');
      assert.ok(p.carveDepth.every(v => v >= 0), 'carving only lowers (upper envelope)');
      // 2x depth: the child's stored height lowered by its own carving depth once more.
      const mutant = {...p, child: p.child.map((v, i) => v - (CONTROL.carveFactor - 1) * p.carveDepth[i])};
      const v = frameViolations(mutant, room, Infinity).below;if (v) caught++;
      t.diagnostic(`${r.world} ${p.C}: carving depth max ${Math.max(...p.carveDepth).toFixed(0)} m; 2x-depth child: ${v} shared points below parent - ${room} m`);
    }
    assert.ok(caught > 0, `${r.world}: the 2x-carved switch child violates the frame`);
  }
});

test('HARD: EDGE MATCH: neighbouring tiles agree on every edge vertex (Object.is), no morph or Float32 position gap', async t => {
  for (const r of await measure()) {
    const kinds = {};
    for (const e of r.edges) {
      const where = `${r.world} ${e.kind} ${e.A}|${e.B}`, v = edgeViolations(e);
      assert.equal(e.unmatched, 0, `${where}: every edge vertex matched by direction`);
      assert.equal(e.a.length, 33);assert.notEqual(e.A, e.B, `${where}: two different tiles`);
      assert.equal(v.heights, 0, `${where}: stored edge heights identical`);
      assert.equal(v.morph, 0, `${where}: morph-start (parent mesh) edge heights identical`);
      assert.equal(v.gaps, 0, `${where}: rendered edge vertices within the Float32 rounding of their buffers`);
      const k = (kinds[e.kind.replace(/ L\d+$/, '')] ??= {pairs: 0, crossFace: 0, onMassif: 0, gapM: 0, boundM: 0, skirtM: Infinity});
      k.pairs++;if (e.crossFace) k.crossFace++;if (e.massifNodes) k.onMassif++;
      k.gapM = Math.max(k.gapM, ...e.gap);k.boundM = Math.max(k.boundM, ...e.bound);k.skirtM = Math.min(k.skirtM, e.skirtM);
    }
    // Massif edges at the coarse and the first fine levels, same face and across cube-face edges.
    for (const L of [r.cut - 1, r.cut]) assert.ok(r.edges.some(e => e.crossFace && e.level === L && e.massifNodes >= 3), `${r.world}: a cube-face edge on a massif at L${L}`);
    for (const L of [r.cut, r.cut + 1]) assert.ok(r.edges.some(e => !e.crossFace && e.level === L && e.massifNodes > 0), `${r.world}: a same-face massif edge at L${L}`);
    assert.ok(r.edges.filter(e => e.kind === 'sibling' && e.massifNodes > 0).length >= 4, `${r.world}: coarse sibling edges on a massif`);
    assert.equal(r.edges.filter(e => e.kind === 'cube-edge L0').length, 12, `${r.world}: all 12 cube edges at L0`);
    assert.ok(r.edges.some(e => e.kind === 'sibling' && e.level === r.cut - 1 && e.massifNodes > 0), `${r.world}: a same-face massif edge at L${r.cut - 1}`);
    assert.ok(r.edges.some(e => e.level === r.cut && !e.crossFace && !e.sameParent && e.massifNodes > 0), `${r.world}: a non-sibling massif edge at L${r.cut}`);
    assert.ok(r.edges.some(e => e.level === r.cut + 1 && e.sameParent && e.massifNodes > 0), `${r.world}: a sibling massif edge at L${r.cut + 1}`);
    for (const k of Object.values(kinds)) {k.gapM = +k.gapM.toFixed(4);k.boundM = +k.boundM.toFixed(4);}
    t.diagnostic(`${r.world}: ${r.edges.length} edge pairs ${JSON.stringify(kinds)}; cube-face massif tiles ${JSON.stringify(r.cross)}`);
  }
});

test('HARD: negative control: one edge vertex offset by 1 m fails the edge match', async t => {
  for (const r of await measure()) {
    // Built in the worker: tile A's middle edge vertex raised 1 m (stored height and rendered position, radially), then
    // matched and measured against the untouched tile B through the same edgePair path as the real edges.
    assert.ok(r.edgeControl.length >= 4, `${r.world}: controls on the coarse-to-fine edges`);
    for (const v of r.edgeControl) assert.ok(v.heights === 1 && v.morph === 0 && v.gaps >= 1, `${r.world} ${v.kind} ${v.A}|${v.B}: offset edge detected (${JSON.stringify(v)})`);
    t.diagnostic(`${r.world}: ${r.edgeControl.length} offset edges, all caught (${r.edgeControl.map(v => `${v.kind}: heights ${v.heights}, gaps ${v.gaps}`).join('; ')})`);
  }
});

test('HARD: COARSE-ONLY: the coarse field is continuous on a net over all six faces, 0 M3 block solves', async t => {
  for (const r of await measure()) {
    const c = r.continuity;
    t.diagnostic(`${r.world}: ${c.lines} lines x ${NET.N}, ${c.samples} samples, ${c.refined} intervals refined x ${REFINE} (belt edges ${c.changes.belt}, massif edges ${c.changes.massif}, belt switches ${c.changes.beltSwitch}, height-flagged ${c.flagged}); steepest slope net ${c.worstNetSlope.toFixed(3)}, refined ${c.worstFineSlope.toFixed(3)} (bound ${SLOPE_BOUND}); block solves ${c.solves}`);
    assert.equal(c.solves, 0, `${r.world}: no M3 block solved by the coarse system`);
    assert.ok(c.changes.belt > 0 && c.changes.massif > 0, `${r.world}: the net crosses belt and massif edges`);
    assert.equal(c.nonFinite, 0, `${r.world}: every sample finite`);
    assert.equal(c.violations, 0, `${r.world}: ${JSON.stringify(c.where)}`);
  }
});

test('HARD: negative control: a 10 m step on every belt breaks the continuity check at the belt edges', async t => {
  for (const r of await measure()) {
    const s = r.stepControl;
    t.diagnostic(`${r.world}: ${s.lines} belt-crossing lines, ${s.changes.belt} belt edges, ${s.beltEdgesCaught} caught, ${s.violations} violations`);
    assert.ok(s.lines > 0 && s.changes.belt > 0, `${r.world}: the control lines cross belt edges`);
    assert.equal(s.beltEdgesCaught, s.changes.belt, `${r.world}: every stepped belt edge is caught in its own interval`);
  }
});
