// Frozen tier sample sets (docs/test-tiers-2026-10-07.md; design docs/handoff-2026-10-06/tiered-testing-mvp.md section 2).
//   npm run tier-sets:generate -- --reason "<why the set moved>"
// Selection reads M1 (the orogen layout), the frozen M1-picked lists (FROZEN_MASSIF_TILE_SET, FROZEN_STRATIFIED) and
// the LEVEL-0 field only, never the carved truth: 0 M3 block solves (asserted with carvingBuildStats), so a carving
// bug cannot move the set that is meant to catch it. Deterministic (Fibonacci order, no randomness, no clock): two
// runs are byte-identical. tests/tier-sets.test.mjs regenerates in-process and deepEquals tests/tier-sets.json.
//
// MVP slice (2026-10-07): the SMOKE set only, per water world:
//   axis x2 (FROZEN_MASSIF_TILE_SET axis[0], axis[1]), flank x1, belt-end x2, face-edge x2 (crossFaceTile at L(cut-1)
//   and L(cut)), switch x1 (the L(cut) tile of axis[0]), rock x1 (the L(rock) tile of axis[0]), coast x1, ocean x1,
//   outside x1. The working set (audit section 2.1) is NOT generated yet: `work` falls back to the smoke set.
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import * as tiles from '../../src/planet-tiles.ts';
import {terrainSampler, TERRAIN_VERSION} from '../../src/terrain.ts';
import {orogenLayout, OROGEN_LAYOUT_VERSION} from '../../src/mountain-layout.ts';
import {MASSIF_ENVELOPE_VERSION} from '../../src/mountain-envelope.ts';
import {LOD_LADDER_VERSION, carvingFromLevel, rockDetailFromLevel} from '../../src/lod-ladder.ts';
import {carvingBuildStats} from '../../src/mountain-carving.ts';
import {waterWorlds, fib} from '../../tests/terrain-climate-fixtures.mjs';
import {FROZEN_MASSIF_TILE_SET} from '../../tests/helpers/mountain-tile-set.mjs';
import {FROZEN_STRATIFIED} from '../../tests/helpers/lod-frozen-selection.mjs';
import {crossFaceTile} from '../../tests/helpers/lod-coarse-frame.mjs';

export const TIER_SETS_VERSION = 'tier-sets-1';
export const SMOKE_CAP = 50;
const SELF = new URL(import.meta.url);
/** sha256 of this generator's source, line endings normalised (stable across checkouts). */
export const generatorSha = () => createHash('sha256').update(readFileSync(SELF, 'utf8').replace(/\r\n/g, '\n')).digest('hex');

const unit = p => {const l = Math.hypot(...p);return p.map(v => v / l);};
/** First fib(i, 4096) satisfying pred, with its index. */
function firstFib(pred) {
  for (let i = 0; i < 4096; i++) {const d = fib(i, 4096);if (pred(d)) return {i, d};}
  return null;
}

export function smokeSet(body) {
  const R = body.radiusM, cut = carvingFromLevel(R), rock = rockDetailFromLevel(R), lay = orogenLayout(body);
  const l0 = terrainSampler(body, undefined, undefined, undefined, 0, undefined, false, {lodLevel: 0});
  const frozen = FROZEN_MASSIF_TILE_SET[body.name], of = kind => frozen.map((e, idx) => ({...e, idx})).filter(e => e.kind === kind);
  const out = [];
  const add = (kind, d, extra = {}) => out.push({kind, d, ...extra});
  const [ax0, ax1] = of('axis');
  add('axis', ax0.d, {source: `FROZEN_MASSIF_TILE_SET.${body.name}[${ax0.idx}]`});
  add('axis', ax1.d, {source: `FROZEN_MASSIF_TILE_SET.${body.name}[${ax1.idx}]`});
  const fl = of('flank')[0];add('flank', fl.d, {source: `FROZEN_MASSIF_TILE_SET.${body.name}[${fl.idx}]`});
  for (const e of of('belt-end')) add('belt-end', e.d, {source: `FROZEN_MASSIF_TILE_SET.${body.name}[${e.idx}]`});
  for (const L of [cut - 1, cut]) {
    const f = crossFaceTile(body, L);
    if (!f) throw new Error(`${body.name}: no cube-face massif edge tile at L${L}`);
    add('face-edge', tiles.tileDirection(f.C, .5, .5), {level: L, tile: tiles.tileKey(f.C), edge: f.e, massifEdgeNodes: f.hits});
  }
  add('switch', ax0.d, {level: cut, tile: tiles.tileKey(tiles.directionTile(ax0.d, cut)), parent: tiles.tileKey(tiles.directionTile(ax0.d, cut - 1))});
  add('rock', ax0.d, {level: rock, tile: tiles.tileKey(tiles.directionTile(ax0.d, rock)), parent: tiles.tileKey(tiles.directionTile(ax0.d, rock - 1))});
  // Coast: FROZEN_STRATIFIED coast[0] where it exists (Maithea, Lethuris); else the first fib(i, 4096) whose level-0
  // sample is land within 25 m of the datum with level-0 ocean 2 km east.
  if (FROZEN_STRATIFIED[body.name]) add('coast', FROZEN_STRATIFIED[body.name].coast[0], {source: `FROZEN_STRATIFIED.${body.name}.coast[0]`});
  else {
    const c = firstFib(d => {const s = l0(d);if (s.ocean || !(s.groundHeightM < 25)) return false;
      const east = unit([-d[1], d[0], 0]), q = unit(d.map((v, k) => v + east[k] * 2000 / R));return l0(q).ocean;});
    if (!c) throw new Error(`${body.name}: no coast direction`);
    add('coast', c.d, {source: `fib(${c.i}, 4096): level-0 land < 25 m, ocean 2 km east`});
  }
  const ocean = firstFib(d => l0(d).ocean);add('ocean', ocean.d, {source: `fib(${ocean.i}, 4096): level-0 ocean`});
  const outside = firstFib(d => !l0(d).ocean && lay.sample(d).belt === 0);add('outside', outside.d, {source: `fib(${outside.i}, 4096): level-0 land outside every belt`});
  if (out.length > SMOKE_CAP) throw new Error(`${body.name}: ${out.length} smoke entries > cap ${SMOKE_CAP}`);
  return out;
}

/** The deterministic part of tests/tier-sets.json (everything the test compares). */
export function generateTierSets() {
  const before = carvingBuildStats.count, smoke = {};
  for (const body of waterWorlds()) smoke[body.name] = smokeSet(body);
  const solves = carvingBuildStats.count - before;
  if (solves !== 0) throw new Error(`tier-set selection solved ${solves} M3 blocks (must read M1 and level 0 only)`);
  return {version: TIER_SETS_VERSION, sha256: generatorSha(),
    inputs: {OROGEN_LAYOUT_VERSION, MASSIF_ENVELOPE_VERSION, LOD_LADDER_VERSION, TERRAIN_VERSION}, smoke};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(SELF)) {
  const i = process.argv.indexOf('--reason'), reason = i < 0 ? null : process.argv[i + 1];
  if (!reason) throw new Error('usage: npm run tier-sets:generate -- --reason "<why>" (recorded in the history ledger)');
  const path = new URL('../../tests/tier-sets.json', SELF);
  let history = [];try {history = JSON.parse(readFileSync(path, 'utf8')).history ?? [];} catch {}
  const sets = generateTierSets(), commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {encoding: 'utf8'}).trim();
  history.push({date: new Date().toISOString().slice(0, 10), commit, sha256: sets.sha256, inputs: sets.inputs, reason});
  writeFileSync(path, JSON.stringify({...sets, history}, null, 1) + '\n');
  console.log(`tests/tier-sets.json: ${Object.entries(sets.smoke).map(([w, s]) => `${w} ${s.length}`).join(', ')} smoke entries; sha ${sets.sha256.slice(0, 12)}`);
}
