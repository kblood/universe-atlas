// ns/sample by class (out-of-band land/ocean, in-band) on the Maithea L3 lattices of the 12 bench tiles; one arm per process.
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
const root = process.env.ROOT || 'C:/LLM/IWSDK/universe-atlas-wt/split-core', mainRoot = 'C:/LLM/IWSDK/universe-atlas-wt/ref-main';
const arm = process.argv[2], L = +(process.argv[3] || 3);
const S = await import(pathToFileURL(root + '/src/terrain.ts').href), T = await import(pathToFileURL(root + '/src/planet-tiles.ts').href);
const ML = await import(pathToFileURL(root + '/src/mountain-layout.ts').href), ME = await import(pathToFileURL(root + '/src/mountain-envelope.ts').href);
const MS = await import(pathToFileURL(mainRoot + '/src/terrain.ts').href);
const {waterWorlds, fib} = await import(pathToFileURL(root + '/tests/terrain-climate-fixtures.mjs').href);
const body = waterWorlds().find(b => b.name === 'Maithea');
const ts = MS.terrainSampler(body), dirs = [];
for (let i = 0; dirs.length < 12 && i < 4000; i++) {const d = fib(i * 37 % 4000, 4000); if (ts(d).groundHeightM > 0) dirs.push(d);}
// lattice: vertex directions of each tile via buildTile's own dir helper is internal; use a 65x65 grid over each tile's corners
const lat = [];
for (const d of dirs) {const t = T.directionTile(d, L); for (let i = 0; i <= 64; i++) for (let j = 0; j <= 64; j++) lat.push(T.tileDirection ? T.tileDirection(t, i / 64, j / 64) : null);}
if (lat[0] === null) throw new Error('no tileDirection export');
const layout = ML.orogenLayout(body), M = ME.MASSIF_ENVELOPE;
const inB = lat.filter(d => layout.bandTagWithin(d, M.MAX_HALF_WIDTH_M, M.MIN_HALF_WIDTH_M) !== 0), outB = lat.filter(d => layout.bandTagWithin(d, M.MAX_HALF_WIDTH_M, M.MIN_HALF_WIDTH_M) === 0);
const s = arm === 'main' ? MS.terrainSampler(body) : S.terrainSampler(body, undefined, undefined, false, 0, undefined, false, {mountains: arm === 'on', lodLevel: L});
let sink = 0;
const pass = a => {const t = performance.now(); for (const d of a) sink += s(d).groundHeightM; return (performance.now() - t) * 1e6 / a.length;};
const all = [...lat]; for (let r = 0; r < 3; r++) pass(all);
const res = {all: [], out: [], in: []};
for (let r = 0; r < 7; r++) {res.all.push(pass(all)); res.out.push(pass(outB)); res.in.push(pass(inB));}
const med = a => [...a].sort((x, y) => x - y)[a.length >> 1];
console.log(arm, 'L' + L, 'n', lat.length, 'in', inB.length, 'all', med(res.all).toFixed(0), 'out', med(res.out).toFixed(0), 'in', med(res.in).toFixed(0), sink ? '' : '.');
