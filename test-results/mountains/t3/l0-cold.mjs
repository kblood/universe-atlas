// Cost plan T3 (C2): the 6 L0 tiles of one water world, cold, in a FRESH process, from one checkout.
//   node test-results/mountains/t3/l0-cold.mjs <root> <world> <mountains:0|1>
// Prints one JSON line: {root, world, mountains, l0Ms, blockBuilds}. Run main (mountains 0) and this branch
// (mountains 1) alternately in separate processes; main's checkout has no `mountains` option (ignored there).
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
const [root, worldName, wired] = process.argv.slice(2);
const T = await import(pathToFileURL(`${root}/src/planet-tiles.ts`).href);
const C = await import(pathToFileURL(`${root}/src/mountain-carving.ts`).href);
const {waterWorlds} = await import(pathToFileURL(`${root}/tests/terrain-climate-fixtures.mjs`).href);
const world = waterWorlds().find(b => b.name === worldName);
const opts = wired === '1' ? {mountains: true} : {};
let sink = 0;const b0 = C.carvingBuildStats.count, t = performance.now();
for (const face of [0, 1, 2, 3, 4, 5]) sink += T.buildTile(world, {face, level: 0, x: 0, y: 0}, 1, 0, opts).surfaceHeight[0];
const l0Ms = performance.now() - t;
console.log(JSON.stringify({root, world: worldName, mountains: wired === '1', l0Ms, blockBuilds: C.carvingBuildStats.count - b0, sink}));
