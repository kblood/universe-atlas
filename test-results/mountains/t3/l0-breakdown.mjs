// Cost plan T3 (C2) breakdown: where the cold 6 x L0 time of the mountains-on sampler goes (fresh process).
//   node test-results/mountains/t3/l0-breakdown.mjs <world> [layoutFirst:0|1] [grid:0|1]
import {performance} from 'node:perf_hooks';
import * as T from '../../../src/planet-tiles.ts';
import {orogenLayout} from '../../../src/mountain-layout.ts';
import {MASSIF_ENVELOPE} from '../../../src/mountain-envelope.ts';
import {carvingBuildStats} from '../../../src/mountain-carving.ts';
import {waterWorlds} from '../../../tests/terrain-climate-fixtures.mjs';
const [worldName, layoutFirst = '1', grid = '1'] = process.argv.slice(2);
const world = waterWorlds().find(b => b.name === worldName);
const row = {world: worldName};
if (layoutFirst === '1') {
  let t = performance.now();const L = orogenLayout(world);row.layoutBuildMs = performance.now() - t;
  if (grid === '1') {t = performance.now();L.bandGrid(MASSIF_ENVELOPE.MAX_HALF_WIDTH_M, MASSIF_ENVELOPE.MIN_HALF_WIDTH_M);row.gridBuildMs = performance.now() - t;}
}
let sink = 0;const b0 = carvingBuildStats.count;let t = performance.now();
for (const face of [0, 1, 2, 3, 4, 5]) sink += T.buildTile(world, {face, level: 0, x: 0, y: 0}, 1, 0, {mountains: true}).surfaceHeight[0];
row.l0Ms = performance.now() - t;row.blockBuilds = carvingBuildStats.count - b0;
t = performance.now();
for (const face of [0, 1, 2, 3, 4, 5]) sink += T.buildTile(world, {face, level: 0, x: 0, y: 0}, 1, 0, {mountains: true}).surfaceHeight[0];
row.l0WarmMs = performance.now() - t;
t = performance.now();
for (const face of [0, 1, 2, 3, 4, 5]) sink += T.buildTile(world, {face, level: 0, x: 0, y: 0}, 1, 0).surfaceHeight[0];
row.l0WarmOffMs = performance.now() - t;
console.log(JSON.stringify({...row, sink}));
