// Records the identity pins on UNMODIFIED main (read-only import of main's src/terrain.ts); the
// classification (M1 layout, M2 massif cap) comes from this branch's modules.
import {pathToFileURL} from 'node:url';
const MAIN = process.argv[2] || 'C:/LLM/IWSDK/universe-atlas';
const {terrainSampler, TERRAIN_VERSION} = await import(pathToFileURL(`${MAIN}/src/terrain.ts`).href);
const {identityDigest, outsideBelt, outsideMassif, everywhere} = await import('../../../tests/helpers/mountain-assembly-identity.mjs');
console.log('main terrain', TERRAIN_VERSION);
for (const [label, select] of [['outsideBelt', outsideBelt], ['outsideMassif', outsideMassif]]) for (const colour of [false, true]) {
  const t = Date.now(), r = identityDigest(terrainSampler, {select, colour});
  console.log(label, colour ? 'heights+ocean+colour' : 'heights+ocean', r.sha, JSON.stringify(r.counts), Date.now() - t, 'ms');
}
for (const n of [4096, 20000]) { const t = Date.now(), r = identityDigest(terrainSampler, {n, select: everywhere, oceanOnly: true});
  console.log('everywhere ocean-only n=' + n, r.sha, JSON.stringify(r.counts), Date.now() - t, 'ms'); }
