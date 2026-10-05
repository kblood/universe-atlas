// Build Maithea L0-L5 bench tiles with ONE arm only (main | on), for --cpu-prof comparison.
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
const root = 'C:/LLM/IWSDK/universe-atlas-wt/t3-coarse', mainRoot = 'C:/LLM/IWSDK/universe-atlas';
const arm = process.argv[2];
const T = await import(pathToFileURL((arm === 'main' ? mainRoot : root) + '/src/planet-tiles.ts').href);
const MS = await import(pathToFileURL(mainRoot + '/src/terrain.ts').href);
const {waterWorlds, fib} = await import(pathToFileURL(root + '/tests/terrain-climate-fixtures.mjs').href);
const body = waterWorlds().find(b => b.name === (process.argv[3] || 'Maithea'));
const ts = MS.terrainSampler(body), dirs = [];
for (let i = 0; dirs.length < 12 && i < 4000; i++) {const d = fib(i * 37 % 4000, 4000); if (ts(d).groundHeightM > 0) dirs.push(d);}
const build = arm === 'main' ? t => T.buildTile(body, t) : t => T.buildTile(body, t, 1, 0, {mountains: true});
let sink = 0; const t0 = performance.now(); let n = 0;
for (let r = 0; r < 4; r++) for (const L of [0, 1, 2, 3, 4, 5]) for (const d of dirs) {sink += build(T.directionTile(d, L)).surfaceHeight[0]; n++;}
console.log(arm, ((performance.now() - t0) / n).toFixed(2), 'ms/tile', sink ? '' : '.');
