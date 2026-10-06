// Cost plan T4 evidence: with the mountains WIRED, the ocean hypsometry from the truth sampler (full carving) and from
// the level-0 sampler (S0, carving +0) agree exactly below 0 m (the carving acts only on land), so fullVolume and every
// level/loss on it are identical; only land heights differ (upper envelope).
//   node test-results/mountains/t4/hypsometry-identity.mjs <wiredRoot> [out.json]
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const [root, out] = process.argv.slice(2);
const imp = p => import(pathToFileURL(`${root}/${p}`).href);
const T = await imp('src/terrain.ts'), O = await imp('src/ocean-volume.ts'), C = await imp('src/mountain-carving.ts'), F = await imp('tests/terrain-climate-fixtures.mjs');
if (!T.TERRAIN_MOUNTAINS_WIRED) throw new Error('not wired');
const rows = [];
for (const body of F.waterWorlds()) {
  const n = O.HYPSOMETRY_SAMPLES, dirs = Array.from({length: n}, (_, i) => O.fibonacciDirection(i, n));
  const b0 = C.carvingBuildStats.count, t0 = performance.now();
  const truth = T.terrainSampler(body, undefined, undefined, undefined, 0, undefined, false), ht = Float64Array.from(dirs, d => truth(d).groundHeightM);
  const truthSolves = C.carvingBuildStats.count - b0, truthMs = performance.now() - t0;
  const b1 = C.carvingBuildStats.count;
  const lvl = T.terrainSampler(body, undefined, undefined, undefined, 0, undefined, false, {lodLevel: 0}), hl = Float64Array.from(dirs, d => lvl(d).groundHeightM);
  const levelSolves = C.carvingBuildStats.count - b1;
  let belowDiffer = 0, landDiffer = 0, signFlip = 0, maxLandDeltaM = 0;
  for (let i = 0; i < n; i++) {
    if ((ht[i] < 0) !== (hl[i] < 0)) signFlip++;
    if (ht[i] < 0 || hl[i] < 0) {if (!Object.is(ht[i], hl[i])) belowDiffer++;}
    else if (ht[i] !== hl[i]) {landDiffer++;maxLandDeltaM = Math.max(maxLandDeltaM, Math.abs(hl[i] - ht[i]));}
  }
  const HT = O.hypsometryFromHeights(ht), HL = O.hypsometryFromHeights(hl);
  const losses = [0.1, 0.3, 0.5, 0.678, 0.9], levelsEqual = losses.every(f => Object.is(O.levelForLossOn(HT, f), O.levelForLossOn(HL, f)));
  rows.push({world: body.name, samples: n, truthSolves, truthMs: Math.round(truthMs), levelSolves, belowDiffer, signFlip, landDiffer, maxLandDeltaM,
    fullVolumeEqual: Object.is(HT.fullVolume, HL.fullVolume), belowZeroEqual: HT.belowZero === HL.belowZero, minEqual: Object.is(HT.minHeightM, HL.minHeightM), levelsEqual});
}
console.log(JSON.stringify(rows, null, 1));
if (out) writeFileSync(out, JSON.stringify(rows, null, 1) + '\n');
