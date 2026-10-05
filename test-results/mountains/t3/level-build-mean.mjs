// Cost plan T3 (2), contract section 6: per-level tile build mean at L0..L(cut-1), main (unwired, read-only import
// of main's checkout) vs this branch with the mountains ON (uncarved levels), interleaved in ONE process with the
// order alternating per round, after a warm-up. Tiles per level: up to 8 massif-site tiles (M1-only selection) plus
// 8 Fibonacci tiles (all 6 at L0). Run under the CPU-quiet test slot, one fresh process per world.
//   node test-results/mountains/t3/level-build-mean.mjs <world> <mainRoot> [rounds=5] [out.json]
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {writeFileSync, existsSync, readFileSync} from 'node:fs';
import * as T from '../../../src/planet-tiles.ts';
import {carvingFromLevel} from '../../../src/lod-ladder.ts';
import {carvingBuildStats} from '../../../src/mountain-carving.ts';
import {waterWorlds, fib} from '../../../tests/terrain-climate-fixtures.mjs';
import {axisSites} from '../../../tests/helpers/mountain-coarse-tiles.mjs';
const [worldName, mainRoot, roundsArg = '5', out = 'test-results/mountains/t3/level-build-mean.json'] = process.argv.slice(2);
const MT = await import(pathToFileURL(`${mainRoot}/src/planet-tiles.ts`).href);
const body = waterWorlds().find(b => b.name === worldName), cut = carvingFromLevel(body.radiusM), rounds = +roundsArg;
const sites = axisSites(body, {count: 8}).map(s => s.d), fibs = Array.from({length: 8}, (_, i) => fib(i * 7 + 3, 64));
const tilesAt = L => {if (L === 0) return [0, 1, 2, 3, 4, 5].map(face => ({face, level: 0, x: 0, y: 0}));
  const seen = new Map();for (const d of [...sites, ...fibs]) {const t = T.directionTile(d, L);seen.set(T.tileKey(t), t);}return [...seen.values()];};
const sides = [{name: 'main', build: t => MT.buildTile(body, t)}, {name: 'branch', build: t => T.buildTile(body, t, 1, 0, {mountains: true})}];
let sink = 0;
// Warm-up: every side builds one tile per level (layout, grid, JIT); not timed.
for (let L = 0; L < cut; L++) for (const s of sides) sink += s.build(tilesAt(L)[0]).surfaceHeight[0];
const b0 = carvingBuildStats.count, levels = [];
for (let L = 0; L < cut; L++) {
  const list = tilesAt(L), ms = {main: [], branch: []};
  for (let r = 0; r < rounds; r++) for (const t of list) for (let k = 0; k < 2; k++) {
    const s = sides[(k + r) % 2], t0 = performance.now();sink += s.build(t).surfaceHeight[0];ms[s.name].push(performance.now() - t0);
  }
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const row = {level: L, tiles: list.length, builds: ms.main.length, mainMeanMs: mean(ms.main), branchMeanMs: mean(ms.branch)};
  row.growth = row.branchMeanMs / row.mainMeanMs - 1;levels.push(row);console.log(worldName, JSON.stringify(row));
}
const res = {world: worldName, cut, rounds, blockSolves: carvingBuildStats.count - b0, levels, sink};
const all = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {};all[worldName] = res;writeFileSync(out, JSON.stringify(all, null, 1) + '\n');
console.log(worldName, 'blockSolves', res.blockSolves, 'max growth', Math.max(...levels.map(l => l.growth)).toFixed(4));
