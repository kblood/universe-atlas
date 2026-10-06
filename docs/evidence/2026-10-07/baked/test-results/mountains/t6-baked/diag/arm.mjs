// Per-round ms/tile, L0-L5 x 12 land tiles, one arm per process. ARM: main | off | on ; PRE: layout | bake | none
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
const root = process.env.ROOT || 'C:/LLM/IWSDK/universe-atlas-wt/baked', mainRoot = 'C:/LLM/IWSDK/universe-atlas-wt/ref-main';
const [arm, world = 'Maithea', rounds = '8'] = process.argv.slice(2), pre = process.env.PRE || 'none';
const T = await import(pathToFileURL((arm === 'main' ? mainRoot : root) + '/src/planet-tiles.ts').href);
const MS = await import(pathToFileURL(mainRoot + '/src/terrain.ts').href);
const {waterWorlds, fib} = await import(pathToFileURL(root + '/tests/terrain-climate-fixtures.mjs').href);
const body = waterWorlds().find(b => b.name === world);
if (pre !== 'none') {
  const ML = await import(pathToFileURL(root + '/src/mountain-layout.ts').href);
  const lay = ML.orogenLayout(body);
  if (pre === 'bake') lay.coarseField(+(process.env.CFN || 512), 48000, 32000);
}
const ts = MS.terrainSampler(body), dirs = [];
for (let i = 0; dirs.length < 12 && i < 4000; i++) {const d = fib(i * 37 % 4000, 4000); if (ts(d).groundHeightM > 0) dirs.push(d);}
if (pre === 'warm6') { T.buildTile(body, T.directionTile(dirs[0], 6), 1, 0, {mountains: true}); }
if (pre === 'exactUncarved' || pre === 'truth' || pre === 'bakedAxis' || pre === 'mainAxis') {
  const S = await import(pathToFileURL(root + '/src/terrain.ts').href), L = await import(pathToFileURL(root + '/src/lod-ladder.ts').href);
  const CS = await import(pathToFileURL(root + '/tests/helpers/mountain-coarse-tiles.mjs').href);
  if (pre === 'exactUncarved') process.env.CFOFF = '1';
  const smp = pre === 'mainAxis' ? MS.terrainSampler(body) : S.terrainSampler(body, undefined, undefined, undefined, 0, undefined, false, pre === 'truth' ? {mountains: true} : {mountains: true, lodLevel: L.carvingFromLevel(body.radiusM) - 1});
  delete process.env.CFOFF;
  const site = CS.axisSites(body, {count: 1})[0].d; let acc = 0;
  for (let k = 0; k < +(process.env.PREN || 2000); k++) {const a = (k / 2000 - .5) * .01, d = [site[0] + a, site[1] - a * .3, site[2]], l = Math.hypot(...d); acc += smp([d[0] / l, d[1] / l, d[2] / l]).groundHeightM;}
  console.log('pre acc', acc.toFixed(0));
}
if (pre === 'm3') {
  const C = await import(pathToFileURL(root + '/src/mountain-carving.ts').href);
  let acc = 0; for (let k = 0; k < 200; k++) acc += C.ridgeValleyCarvingM(k * 100, (k % 50) * 500 - 12000, 48000, 3000, 1, 12345);
  console.log('pre acc', acc.toFixed(0));
}
const build = arm === 'on' ? t => T.buildTile(body, t, 1, 0, {mountains: true}) : t => T.buildTile(body, t);
const levels = (process.env.LEVELS || '0,1,2,3,4,5').split(',').map(Number);
let sink = 0; const out = [];
for (let r = 0; r < +rounds; r++) {const t0 = performance.now(); let n = 0;
  for (const L of levels) for (const d of dirs) {sink += build(T.directionTile(d, L)).surfaceHeight[0]; n++;}
  out.push(((performance.now() - t0) / n).toFixed(1));}
const tail = out.slice(2).map(Number), med = [...tail].sort((a, b) => a - b)[tail.length >> 1];
console.log(arm, `pre=${pre}`, process.env.CFX ? `CFX=${process.env.CFX}` : '', 'median(r>=2)', med, '|', out.join(' '), sink ? '' : '.');
