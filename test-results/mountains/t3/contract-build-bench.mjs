// Cost plan T3 (2), contract section 6 under the CONTRACT's own benchmark protocol: benchBuild of
// scripts/lod-consistency-report.mjs (12 land tiles from Fibonacci directions i*37 mod 4000 with main's ground > 0,
// interleaved A/B in one process, alternating order per round, one warm build each first), main (read-only import of
// main's checkout) vs this branch with the mountains ON, at L0..L(cut-1) and, as context, L(cut) and L(cut+2).
// Fresh process per world, under the CPU-quiet test slot.
//   node test-results/mountains/t3/contract-build-bench.mjs <world> <mainRoot> [rounds=5] [out.json]
import {pathToFileURL} from 'node:url';
import {writeFileSync, existsSync, readFileSync} from 'node:fs';
import * as T from '../../../src/planet-tiles.ts';
import {carvingFromLevel} from '../../../src/lod-ladder.ts';
import {carvingBuildStats} from '../../../src/mountain-carving.ts';
import {benchBuild} from '../../../scripts/lod-consistency-report.mjs';
import {waterWorlds, fib} from '../../../tests/terrain-climate-fixtures.mjs';
const [worldName, mainRoot, roundsArg = '5', out = 'test-results/mountains/t3/contract-build-bench.json'] = process.argv.slice(2);
const MT = await import(pathToFileURL(`${mainRoot}/src/planet-tiles.ts`).href), MS = await import(pathToFileURL(`${mainRoot}/src/terrain.ts`).href);
const body = waterWorlds().find(b => b.name === worldName), cut = carvingFromLevel(body.radiusM);
const ts = MS.terrainSampler(body), dirs = [];
for (let i = 0; dirs.length < 12 && i < 4000; i++) {const d = fib(i * 37 % 4000, 4000);if (ts(d).groundHeightM > 0) dirs.push(d);}
const main = {buildTile: MT.buildTile, directionTile: MT.directionTile};
const branch = {buildTile: (b, t) => T.buildTile(b, t, 1, 0, {mountains: true}), directionTile: T.directionTile};
const coarse = Array.from({length: cut}, (_, L) => L), b0 = carvingBuildStats.count;
// benchBuild's warm build is a level-6 tile; at Maithea L6 that is carved, so count block solves on the coarse run only.
const res = benchBuild([main, branch], body, dirs, coarse, +roundsArg), coarseBlockSolves = carvingBuildStats.count - b0;
const rows = coarse.map(L => {const [m, b] = res[L];return {level: L, mainMeanMs: m.meanMs, branchMeanMs: b.meanMs, growth: b.meanMs / m.meanMs - 1, mainP50Ms: m.p50Ms, branchP50Ms: b.p50Ms};});
for (const r of rows) console.log(worldName, JSON.stringify(r));
const all = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {};
all[worldName] = {world: worldName, cut, tiles: dirs.length, rounds: +roundsArg, coarseBlockSolvesInclWarm: coarseBlockSolves, rows};
writeFileSync(out, JSON.stringify(all, null, 1) + '\n');
console.log(worldName, 'max growth', Math.max(...rows.map(r => r.growth)).toFixed(4), 'mean growth', (rows.reduce((s, r) => s + r.growth, 0) / rows.length).toFixed(4));
