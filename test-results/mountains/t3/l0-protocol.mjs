// Cost plan T3 (C2), Maithea 6 x L0 cold build, main vs branch (mountains ON), the protocol of
// scripts/mountain-assembly-cost.mjs --l0 reduced to what precedes the L0 row there: both samplers built and warmed
// on the 20,000 Fibonacci directions (layout, band grid, JIT), no tile built before. Then the 6 L0 tiles: main then
// branch (the cost script's order) or, with --swap, branch then main. One fresh process per run, CPU-quiet slot.
//   node test-results/mountains/t3/l0-protocol.mjs <world> <mainRoot> [--swap] [out.json]
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {writeFileSync, existsSync, readFileSync} from 'node:fs';
import * as T from '../../../src/planet-tiles.ts';
import {terrainSampler} from '../../../src/terrain.ts';
import {carvingBuildStats} from '../../../src/mountain-carving.ts';
import {waterWorlds, fib} from '../../../tests/terrain-climate-fixtures.mjs';
const args = process.argv.slice(2).filter(a => !a.startsWith('--')), swap = process.argv.includes('--swap');
const [worldName, mainRoot, out = 'test-results/mountains/t3/l0-protocol.json'] = args;
const MT = await import(pathToFileURL(`${mainRoot}/src/planet-tiles.ts`).href), MS = await import(pathToFileURL(`${mainRoot}/src/terrain.ts`).href);
const body = waterWorlds().find(b => b.name === worldName);
const mainTs = MS.terrainSampler(body), ts = terrainSampler(body, undefined, undefined, undefined, 0, undefined, false, {mountains: true});
const fibs = Array.from({length: 20000}, (_, i) => fib(i, 20000));let sink = 0;
for (let k = 0; k < 3; k++) for (const d of fibs) sink += mainTs(d).groundHeightM + ts(d).groundHeightM;
const L0 = [0, 1, 2, 3, 4, 5].map(face => ({face, level: 0, x: 0, y: 0}));
const all6 = fn => {const t = performance.now();for (const tile of L0) sink += fn(tile).surfaceHeight[0];return performance.now() - t;};
const runMain = () => all6(t => MT.buildTile(body, t)), runBranch = () => all6(t => T.buildTile(body, t, 1, 0, {mountains: true}));
const b0 = carvingBuildStats.count;let mainL0Ms, branchL0Ms;
if (swap) {branchL0Ms = runBranch();mainL0Ms = runMain();} else {mainL0Ms = runMain();branchL0Ms = runBranch();}
const row = {world: worldName, order: swap ? 'branch-first' : 'main-first', mainL0Ms, branchL0Ms, ratio: branchL0Ms / mainL0Ms, blockSolves: carvingBuildStats.count - b0, sink};
const all = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : [];all.push(row);writeFileSync(out, JSON.stringify(all, null, 1) + '\n');
console.log(JSON.stringify(row));
