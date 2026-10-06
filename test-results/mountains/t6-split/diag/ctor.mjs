import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
const root = 'C:/LLM/IWSDK/universe-atlas-wt/split-core';
const S = await import(pathToFileURL(root + '/src/terrain.ts').href);
const {waterWorlds} = await import(pathToFileURL(root + '/tests/terrain-climate-fixtures.mjs').href);
const body = waterWorlds().find(b => b.name === 'Maithea');
for (const on of [false, true, false, true]) {
  const t = performance.now(); let k = 0;
  for (let i = 0; i < 2000; i++) {const s = S.terrainSampler(body, undefined, undefined, false, 0, undefined, false, {mountains: on, lodLevel: 3}); k += s ? 1 : 0;}
  console.log(on ? 'on ' : 'off', ((performance.now() - t) * 1000 / 2000).toFixed(1), 'us/construction');
}
