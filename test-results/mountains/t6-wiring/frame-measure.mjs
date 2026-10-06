// T6 Q-B (decisions addendum 6): the coarse-frame measurement ONCE on the wired tree, per world and pair:
// parent - child (lower side, against today's ROOM pins), child - parent (U2, corrected pairs -> UP_ROOM = max + 25%,
// rounded up to 50 m), child POINT sample - parent stored (U1, max), and whether the child point sampler reproduces the
// stored height at point-sampled child levels. One worker per world (tests/helpers/lod-coarse-frame.mjs).
//   node tests/helpers/test-slot.mjs -- node test-results/mountains/t6-wiring/frame-measure.mjs <out.json>
import {Worker} from 'node:worker_threads';
import {writeFileSync} from 'node:fs';
import {stats} from '../../../tests/helpers/lod-coarse-frame.mjs';
const WORLDS = ['Maithea', 'Selawyn', 'Raiva', 'Lethuris'];
const ROOM = {Maithea: [4900, 4200, 4950, 3250, 1000, 1550, 750, 500, 300, 200], Selawyn: [3600, 3400, 3450, 1650, 850, 500, 2000, 900, 400, 250, 250],
  Raiva: [2350, 2100, 2650, 1750, 800, 300, 300, 100, 100], Lethuris: [4800, 4950, 4550, 2200, 1350, 950, 2350, 700, 950, 300, 250]};
const all = await Promise.all(WORLDS.map(name => new Promise((res, rej) => {
  const w = new Worker(new URL('../../../tests/helpers/lod-coarse-frame.mjs', import.meta.url), {workerData: name});
  w.once('message', res);w.once('error', rej);})));
const round = v => +v.toFixed(3), S = a => {const s = stats(a);return {count: s.count, p50: round(s.p50), p99: round(s.p99), max: round(s.max)};};
const out = {};
for (const r of all) {
  out[r.world] = {cut: r.cut, corrMax: r.corrMax, ms: Math.round(r.ms), solves: r.solves, pairs: r.frame.map(f => {
    const down = S(f.pairs.flatMap(p => p.parent.map((v, i) => v - p.child[i]))), up = S(f.pairs.flatMap(p => p.child.map((v, i) => v - p.parent[i])));
    const u1 = S(f.pairs.flatMap(p => p.childPoint.map((v, i) => v - p.parent[i])));
    const pointMismatch = f.childCorrected ? null : f.pairs.reduce((k, p) => k + p.child.filter((v, i) => !Object.is(v, Math.fround(p.childPoint[i]))).length, 0);
    const storedBelowPoint = f.pairs.reduce((k, p) => k + p.child.filter((v, i) => v < Math.fround(p.childPoint[i])).length, 0);
    return {L: f.L, childCorrected: f.childCorrected, switch: f.switch, pairs: f.pairs.length, room: ROOM[r.world][f.L], roomMet: down.max <= ROOM[r.world][f.L],
      parentMinusChild: down, childMinusParent: up, upRoom: f.childCorrected ? Math.ceil(Math.max(0, up.max) * 1.25 / 50) * 50 : null,
      childPointMinusParent: u1, pointMismatch, storedBelowPoint};
  }), continuity: {violations: r.continuity.violations, worstFine: r.continuity.worstFineSlope, solves: r.continuity.solves},
  edges: r.edges.length};
}
writeFileSync(process.argv[2], JSON.stringify(out, null, 1) + '\n');
for (const [w, o] of Object.entries(out)) for (const p of o.pairs)
  console.log(`${w} L${p.L}->${p.L + 1}${p.switch ? ' S' : ''}${p.childCorrected ? ' C' : ''}: down max ${p.parentMinusChild.max} / ROOM ${p.room} ${p.roomMet ? 'ok' : 'OVER'}; up p50/p99/max ${p.childMinusParent.p50}/${p.childMinusParent.p99}/${p.childMinusParent.max} UP_ROOM ${p.upRoom}; U1 max ${p.childPointMinusParent.max}; mismatch ${p.pointMismatch}; storedBelowPoint ${p.storedBelowPoint}`);
