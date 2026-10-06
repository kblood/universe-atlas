// T6 wired M5 check on a NEW pool, seeds 731001-731008 (fixed before measuring; never used by M5 tuning, burnt or gate
// pools 730501-730908). Same row functions and the same pass rules as tests/mountain-rock-detail.test.mjs "ROW gate"
// (copied verbatim below); no tuning. Part 2 (INFO): the wired truth vs the carved no-rock level sampler
// (rockDetailFromLevel - 1) at real massif axis sites of the four worlds: rock depth statistics and sign.
//   node tests/helpers/test-slot.mjs -- node test-results/mountains/t6-wiring/m5-pool.mjs <out.json>
import {writeFileSync} from 'node:fs';
import {measurePool} from '../../../tests/helpers/mountain-rock-detail-fixture.mjs';
import {MOUNTAIN_THRESHOLDS} from '../../../tests/helpers/mountain-metrics.mjs';
import {waterWorlds} from '../../../tests/terrain-climate-fixtures.mjs';
import {axisSites, mountainSampler} from '../../../tests/helpers/mountain-coarse-tiles.mjs';
import {rockDetailFromLevel} from '../../../src/lod-ladder.ts';
import {TERRAIN_VERSION, mountainCarvingState} from '../../../src/terrain.ts';
const POOL = Array.from({length: 8}, (_, i) => 731001 + i), ALPINE_FINE_BETA = 2.617, t0 = performance.now();
const {actual, without, controls} = await measurePool(POOL);
const thr = id => MOUNTAIN_THRESHOLDS.find(r => r.id === id).value, b = actual.R2_R5.base, limit = without.R3.beta - (without.R3.beta - ALPINE_FINE_BETA) / 3;
const rows = {
  baseFixture: b.flatShare >= .15 && b.steepShare >= .25 && ['fill10ShareP50', 'pits025Per1000km2P50'].every(id => b[id] <= thr(id)),
  R1e: actual.R1e.ratio >= 2, R1eControls: without.R1e.ratio < 2 && controls.shallowR1.R1e.ratio < 2,
  R2: actual.R2_R5.p50 >= without.R2_R5.p50 - .5 && actual.R2_R5.p50 >= 20 && actual.R2_R5.p90 <= 48.4,
  R2control: controls.depth4R2.p90 > 48.4 || controls.depth4R2.p50 < without.R2_R5.p50 - .5,
  R3prime: without.R3.beta > limit && actual.R3.beta >= 2 && actual.R3.beta <= limit, R3speckleControl: controls.speckleR3.beta < 2,
  R4: actual.R4 <= .2, R4control: controls.longR4 > .2,
  R6: actual.R6.newPitsPerKm2 <= 1, R6control: controls.round2R6.newPitsPerKm2 > 1,
  R5: ['fill10ShareP50', 'pits025Per1000km2P50'].every(id => actual.R2_R5[id] <= thr(id)),
};
const values = {R1e: actual.R1e, R2: {p50: actual.R2_R5.p50, p90: actual.R2_R5.p90, withoutP50: without.R2_R5.p50}, R3: {beta: actual.R3.beta, limit, without: without.R3.beta},
  R4: actual.R4, R6: actual.R6.newPitsPerKm2, R5: {fill10ShareP50: actual.R2_R5.fill10ShareP50, pits025Per1000km2P50: actual.R2_R5.pits025Per1000km2P50},
  controls: {shallowR1e: controls.shallowR1.R1e.ratio, depth4R2: {p50: controls.depth4R2.p50, p90: controls.depth4R2.p90}, speckleR3: controls.speckleR3.beta, longR4: controls.longR4, round2R6: controls.round2R6.newPitsPerKm2}};
const out = {pool: POOL, terrainVersion: TERRAIN_VERSION, rows, values, allPass: Object.values(rows).every(Boolean), wired: []};
// Part 2 (INFO): wired truth vs carved no-rock at 4 axis sites per world, 33 x 33 points at 125 m around each site.
for (const body of waterWorlds()) {
  const rockL = rockDetailFromLevel(body.radiusM), truth = mountainSampler(body), carved = mountainSampler(body, rockL - 1);
  const depths = [];let positive = 0;
  for (const s of axisSites(body, {count: 4})) {
    const d = s.d, ref = Math.abs(d[1]) > .9 ? [1, 0, 0] : [0, 1, 0];
    const e = [ref[1] * d[2] - ref[2] * d[1], ref[2] * d[0] - ref[0] * d[2], ref[0] * d[1] - ref[1] * d[0]], el = Math.hypot(...e), east = e.map(v => v / el);
    const north = [d[1] * east[2] - d[2] * east[1], d[2] * east[0] - d[0] * east[2], d[0] * east[1] - d[1] * east[0]];
    for (let j = -16; j <= 16; j++) for (let i = -16; i <= 16; i++) {
      const q = d.map((v, k) => v + (i * 125 * east[k] + j * 125 * north[k]) / body.radiusM), l = Math.hypot(...q), u = q.map(v => v / l);
      const r = truth(u).groundHeightM - carved(u).groundHeightM;if (r > 0) positive++;depths.push(-r);
    }
  }
  depths.sort((a, b) => a - b);const at = p => depths[Math.min(depths.length - 1, Math.floor(p * depths.length))];
  out.wired.push({world: body.name, rockFromLevel: rockL, states: {truth: mountainCarvingState(body, {}), below: mountainCarvingState(body, {lodLevel: rockL - 1}), at: mountainCarvingState(body, {lodLevel: rockL})},
    points: depths.length, positiveRockTerm: positive, nonZeroShare: depths.filter(v => v > 0).length / depths.length, depthM: {p50: at(.5), p90: at(.9), max: depths[depths.length - 1]}});
}
out.seconds = (performance.now() - t0) / 1000;
writeFileSync(process.argv[2], JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({rows, allPass: out.allPass, wired: out.wired.map(w => [w.world, w.states, w.positiveRockTerm, w.nonZeroShare.toFixed(3), w.depthM])}));
process.exitCode = out.allPass && out.wired.every(w => w.positiveRockTerm === 0) ? 0 : 1;
