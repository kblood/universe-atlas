// Cost plan T4, Astra review follow-up: the global landing searches of main.ts exploreTerrain (pickLandingSite's 384
// candidates, the preferLife search's 1024 candidates) sample the TRUTH through surfaceFor -> world-surface
// surfaceQuery -> terrainSampler(body). They are sparse-global consumers on the truth: count their block solves with
// the mountains wired, in a fresh process per world, and measure the landing summit cutoff (landPercentileM p99 over
// sea level 0) from the truth hypsometry vs T4's level-0 hypsometry, with the candidates whose eligibility flips.
//   node test-results/mountains/t4/landing-consumers.mjs <wiredRoot> <world> [out.json]
import {pathToFileURL} from 'node:url';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
const [root, world, out] = process.argv.slice(2);
const imp = p => import(pathToFileURL(`${root}/${p}`).href);
const T = await imp('src/terrain.ts'), C = await imp('src/mountain-carving.ts'), L = await imp('src/landing-site.ts'), O = await imp('src/ocean-volume.ts'), F = await imp('tests/terrain-climate-fixtures.mjs');
if (!T.TERRAIN_MOUNTAINS_WIRED) throw new Error('not wired');
const body = F.waterWorlds().find(b => b.name === world), truth = T.terrainSampler(body);
const solves = fn => {const b = C.carvingBuildStats.count, t = performance.now(), r = fn();return {blockSolves: C.carvingBuildStats.count - b, ms: Math.round(performance.now() - t), r};};
const land384 = solves(() => Array.from({length: 384}, (_, i) => truth(L.landingCandidate(i, 384)).groundHeightM));
const land1024 = solves(() => Array.from({length: 1024}, (_, i) => truth(L.landingCandidate(i, 1024)).groundHeightM));
// Summit cutoff: level-0 hypsometry (T4) via landPercentileM, vs the same percentile rule on truth heights.
const n = O.HYPSOMETRY_SAMPLES, truthHyp = O.hypsometryFromHeights(Array.from({length: n}, (_, i) => truth(O.fibonacciDirection(i, n)).groundHeightM));
const pct = (h, p, sea = 0) => {let lo = 0, hi = h.length;while (lo < hi) {const m = (lo + hi) >> 1;if (h[m] < sea) lo = m + 1;else hi = m;}const k = h.length - lo;return k ? h[lo + Math.min(k - 1, Math.floor(p * (k - 1)))] : NaN;};
const summitTruth = pct(truthHyp.heights, L.LANDING_SUMMIT_PERCENTILE), levelHyp = O.oceanHypsometry(body), summitLevel0 = pct(levelHyp.heights, L.LANDING_SUMMIT_PERCENTILE);
const p90Truth = pct(truthHyp.heights, .9), p90Level0 = pct(levelHyp.heights, .9), ceiling = Infinity; // planet-renderer.ts (landPercentileM, landingCeilingM) needs the TS loader; pct is landPercentileM's rule, and the ceiling (80% of the bound) lies above p99 on every fixture world (planet-renderer.ts note)
const flips = hs => hs.filter(h => L.landingHeightAllowed(h, 0, ceiling, summitLevel0) !== L.landingHeightAllowed(h, 0, ceiling, summitTruth)).length;
const rec = {world, landing384: {blockSolves: land384.blockSolves, ms: land384.ms, eligibilityFlips: flips(land384.r)},
  habitat1024: {blockSolves: land1024.blockSolves, ms: land1024.ms, eligibilityFlips: flips(land1024.r)},
  summitP99: {truthM: summitTruth, level0M: summitLevel0}, p90: {truthM: p90Truth, level0M: p90Level0}};
console.log(JSON.stringify(rec));
if (out) {const all = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {};all[world] = rec;writeFileSync(out, JSON.stringify(all, null, 1) + '\n');}
