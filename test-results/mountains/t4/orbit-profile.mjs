// Profile helper: n orbit bakes of one world from one checkout (use with node --cpu-prof).
//   node --cpu-prof --cpu-prof-dir=<dir> test-results/mountains/t4/orbit-profile.mjs <root> <world> [n=4]
import {pathToFileURL} from 'node:url';
const [root, world, n = '4'] = process.argv.slice(2);
const T = await import(pathToFileURL(`${root}/src/terrain.ts`).href), F = await import(pathToFileURL(`${root}/tests/terrain-climate-fixtures.mjs`).href);
const body = F.waterWorlds().find(b => b.name === world);
for (let i = 0; i < +n; i++) {const t = performance.now();T.planetSurface(body, 1024, 192);console.log('bake', i, (performance.now() - t).toFixed(0), 'ms');}
