// Riser LOD pre-merge timing (coordinator quiet window 2026-10-08): tile-build cost at the levels whose parent sampler
// the branch newly splits, i.e. L(rock)+1 .. L(sharp) (the filtered levels above L(rock) plus the first sharp level),
// and L(rock) itself (split on both arms; the branch child sampler is filtered there). Main = git-archive export of
// 7419733 (read-only import), branch = this checkout. Both arms build with the default (wired) sampler options.
// Interleaved A/B in ONE process: per round, per tile, both arms build back to back, order alternating per round,
// after an untimed warm-up of one tile per level per arm. Tiles: the station tiles of up to 8 massif axis sites per
// level (tests/helpers/mountain-coarse-tiles.mjs axisSites), so every timed tile is in-massif, where the extra parent
// sampler costs. Gate (coordinator): branch mean / main mean - 1 <= +0.50 on EVERY (world, level) row.
//   node test-results/mountains/riser-lod/timing/tile-build-ab.mjs <world> <mainRoot> [rounds=5]
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import * as T from '../../../../src/planet-tiles.ts';
import {rockDetailFromLevel, riserSharpFromLevel} from '../../../../src/lod-ladder.ts';
import {waterWorlds} from '../../../../tests/terrain-climate-fixtures.mjs';
import {axisSites} from '../../../../tests/helpers/mountain-coarse-tiles.mjs';
const [worldName, mainRoot, roundsArg = '5'] = process.argv.slice(2);
const MT = await import(pathToFileURL(`${mainRoot}/src/planet-tiles.ts`).href);
const body = waterWorlds().find(b => b.name === worldName), rounds = +roundsArg;
const rockL = rockDetailFromLevel(body.radiusM), sharpL = riserSharpFromLevel(body.radiusM);
const sites = axisSites(body, {count: 8}).map(s => s.d);
const tilesAt = L => {const seen = new Map();for (const d of sites) {const t = T.directionTile(d, L);seen.set(T.tileKey(t), t);}return [...seen.values()];};
const sides = [{name: 'main', build: t => MT.buildTile(body, t)}, {name: 'branch', build: t => T.buildTile(body, t)}];
const levels = [];for (let L = rockL; L <= sharpL; L++) levels.push(L);
let sink = 0;
for (const L of levels) for (const s of sides) sink += s.build(tilesAt(L)[0]).surfaceHeight[0];
const rows = [];
for (const L of levels) {
  const list = tilesAt(L), ms = {main: [], branch: []};
  for (let r = 0; r < rounds; r++) for (const t of list) for (let k = 0; k < 2; k++) {
    const s = sides[(k + r) % 2], t0 = performance.now();sink += s.build(t).surfaceHeight[0];ms[s.name].push(performance.now() - t0);
  }
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length, med = a => {const s = [...a].sort((x, y) => x - y);return s[s.length >> 1];};
  const row = {world: worldName, level: L, role: L === rockL ? 'rock (split on both arms)' : L === sharpL ? 'first sharp (newly split)' : 'filtered (newly split)',
    tiles: list.length, builds: ms.main.length, mainMeanMs: +mean(ms.main).toFixed(2), branchMeanMs: +mean(ms.branch).toFixed(2),
    mainMedianMs: +med(ms.main).toFixed(2), branchMedianMs: +med(ms.branch).toFixed(2)};
  row.ratio = +(row.branchMeanMs / row.mainMeanMs - 1).toFixed(3);row.medianRatio = +(row.branchMedianMs / row.mainMedianMs - 1).toFixed(3);
  row.pass = row.ratio <= 0.5;rows.push(row);console.log('TILE_BUILD_AB ' + JSON.stringify(row));
}
console.log('TILE_BUILD_AB_WORLD ' + JSON.stringify({world: worldName, rockL, sharpL, pass: rows.every(r => r.pass), maxRatio: Math.max(...rows.map(r => r.ratio)), sinkFinite: Number.isFinite(sink)}));
