// T6 decision 3 companion: the Maithea land hypsometry of tests/terrain-relief-hypsometry.test.mjs (20,000 Fibonacci
// directions, sea level 0, same statistics and bands) on the wired TRUTH, the wired level 0 (what npm test now reads)
// and the pre-mountains field ({mountains: false}). Report only; the test's bands are printed beside each value.
//   node hyps-truth.mjs <out.json>
import {writeFileSync} from 'node:fs';
import {terrainSampler, tectonicReliefOf} from '../../../src/terrain.ts';
import {biomeClassifier} from '../../../src/surface-biomes.ts';
import {carvingBuildStats} from '../../../src/mountain-carving.ts';
import {fib, maithea} from '../../../tests/terrain-climate-fixtures.mjs';
const SNOW = 'Alpine / polar snow', quantile = (a, q) => {const s = Float64Array.from(a).sort();return s[Math.floor(q * (s.length - 1))];};
const body = maithea(), tau = tectonicReliefOf(body), cls = biomeClassifier(body), N = 20000, out = {};
for (const [label, options] of [['off', {mountains: false}], ['level0', {lodLevel: 0}], ['truth', {}]]) {
  const ts = terrainSampler(body, undefined, undefined, undefined, 0, undefined, false, options), t0 = performance.now(), b0 = carvingBuildStats.count;
  const land = [];let snow = 0, sand = 0, lowland = 0, rangeHi = 0, rangeHiSnow = 0, low = 0, lowSnow = 0;
  for (let i = 0; i < N; i++) {
    const d = fib(i, N), s = ts(d);if (s.ocean) continue;
    const h = s.groundHeightM, c = cls(d, h, 1), isSnow = c.name === SNOW;land.push(h);
    snow += isSnow;sand += c.name === 'Coastal sand';
    if ((c.name === 'Temperate ground' || c.name === 'Dry upland') && h < 500) lowland++;
    if (Math.abs(d[1]) < .866 && h > 3000) {rangeHi++;rangeHiSnow += isSnow;}
    if (Math.abs(d[1]) < .866 && h < 1500) {low++;lowSnow += isSnow;}
  }
  const n = land.length, p = q => quantile(land, q), pct = v => 100 * v / n;
  out[label] = {n, p10: p(.1), p50: p(.5), p90: p(.9), p99: p(.99), max: p(1), above4km: pct(land.filter(h => h > 4000).length), below500: pct(land.filter(h => h < 500).length),
    snow: pct(snow), sand: pct(sand), lowland: pct(lowland), rangeSnow: 100 * rangeHiSnow / rangeHi, lowSnow: 100 * lowSnow / low, ms: Math.round(performance.now() - t0), blockSolves: carvingBuildStats.count - b0};
  console.log(label, JSON.stringify(out[label]));
}
out.bands = {p10: [150, 300], p50: [350, 650], p90: [1800, 3300], p99: [3500, 6000], above4km: [1, 6], below500: ['>=45'], max: ['<=', 8800 * tau + 1000], snow: [15, 40], rangeSnow: ['>=20'], lowSnow: ['<=5'], sand: [.8, 3], lowland: ['>=30']};
writeFileSync(process.argv[2], JSON.stringify(out, null, 1) + '\n');
