// prototype accuracy + bake time: baked coarse vs exact uncarved (same level), all worlds.
import {pathToFileURL} from 'node:url';
const root = process.env.ROOT || 'C:/LLM/IWSDK/universe-atlas-wt/baked';
const S = await import(pathToFileURL(root + '/src/terrain.ts').href);
const L = await import(pathToFileURL(root + '/src/lod-ladder.ts').href);
const ML = await import(pathToFileURL(root + '/src/mountain-layout.ts').href);
const {waterWorlds, fib} = await import(pathToFileURL(root + '/tests/terrain-climate-fixtures.mjs').href);
for (const body of waterWorlds()) {
  const cut = L.carvingFromLevel(body.radiusM);
  const t0 = performance.now(); const lay = ML.orogenLayout(body); const t1 = performance.now();
  const baked = S.terrainSampler(body, undefined, undefined, undefined, 0, undefined, false, {mountains: true, lodLevel: cut - 1});
  const f = lay.coarseField(+(process.env.CFN || 512), 48000, 32000);
  process.env.CFOFF = '1';
  const exact = S.terrainSampler(body, undefined, undefined, undefined, 0, undefined, false, {mountains: true, lodLevel: cut - 1});
  delete process.env.CFOFF;
  let n = 0, nb = 0, up = 0, down = 0, sum = 0, oceanFlip = 0; const errs = [];
  const total = 200000;
  for (let i = 0; i < total; i++) {
    const d = fib(i, total), a = baked(d), b = exact(d);
    const e = a.groundHeightM - b.groundHeightM;
    if (a.ocean !== b.ocean) oceanFlip++;
    if (e !== 0) {nb++; errs.push(Math.abs(e));}
    up = Math.max(up, e); down = Math.min(down, e); sum += Math.abs(e); n++;
  }
  errs.sort((x, y) => x - y);
  const q = p => errs.length ? errs[Math.min(errs.length - 1, Math.floor(p * errs.length))].toFixed(1) : '0';
  console.log(body.name, 'R', body.radiusM, 'cut', cut, 'layout ms', (t1 - t0).toFixed(0), 'bake ms', f.ms.toFixed(0), 'N', f.N,
    'differing', nb, '/', n, 'max up', up.toFixed(1), 'max down', down.toFixed(1), '|e| p50', q(.5), 'p90', q(.9), 'p99', q(.99), 'oceanFlips', oceanFlip);
}
