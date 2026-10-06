// One arm per process: main (ref-main default) | off (split-core default) | on (split-core {mountains:true}); Maithea L0-5 bench tiles.
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
const root = 'C:/LLM/IWSDK/universe-atlas-wt/_diag', mainRoot = 'C:/LLM/IWSDK/universe-atlas-wt/ref-main';
const arm = process.argv[2];
const T = await import(pathToFileURL((arm === 'main' ? mainRoot : root) + '/src/planet-tiles.ts').href);
const MS = await import(pathToFileURL(mainRoot + '/src/terrain.ts').href);
const {waterWorlds, fib} = await import(pathToFileURL(root + '/tests/terrain-climate-fixtures.mjs').href);
const body = waterWorlds().find(b => b.name === (process.argv[3] || 'Maithea'));
const ts = MS.terrainSampler(body), dirs = [];
for (let i = 0; dirs.length < 12 && i < 4000; i++) {const d = fib(i * 37 % 4000, 4000); if (ts(d).groundHeightM > 0) dirs.push(d);}
const build = arm === 'on' ? t => T.buildTile(body, t, 1, 0, {mountains: true}) : t => T.buildTile(body, t);
let sink = 0, n = 0; const rounds = +(process.argv[4] || 4);
const t0 = performance.now();
for (let r = 0; r < rounds; r++) for (const L of [0, 1, 2, 3, 4, 5]) for (const d of dirs) {sink += build(T.directionTile(d, L)).surfaceHeight[0]; n++;}
console.log(arm, ((performance.now() - t0) / n).toFixed(2), 'ms/tile', sink ? '' : '.');
