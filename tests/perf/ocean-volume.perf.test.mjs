// ocean-volume-1 (relief round 2026-10, P2-OCEAN-QUERY): the dated sea level
// is a VOLUME model. The lifecycle authors a lost-volume fraction
// (stellar-evolution.ts waterKeysFor) and ocean-volume.ts solves the level on
// the body's own seabed. Replaces the old linear 0 -> -8000 m metre ramp,
// which rendered Maithea at about -4500 m (67.8% of the ocean volume lost)
// at the catalogue epoch.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {galaxies, refByAddress, system} from '../../src/catalog.ts';
import {CATALOGUE_EPOCH_NS, YEAR_NS} from '../../src/world-time.ts';
import {TERRAIN_VERSION} from '../../src/terrain.ts';
import {starLifecycle, planetLifecycle, waterKeysFor, WATER_LOSS_KEY_LIMIT} from '../../src/stellar-evolution.ts';
import {datedOceanState, waterLossAt, SURFACE_VERSION} from '../../src/world-surface.ts';
import {
  OCEAN_VOLUME_VERSION, HYPSOMETRY_SAMPLES, oceanHypsometry, levelForLoss, levelForLossOn,
  oceanVolumeAt, lossForLevel, hypsometryFromHeights, clearOceanHypsometryCache,
} from '../../src/ocean-volume.ts';

const SEED = 'LETHRA-001';
const ADDR = {clusterCell:[0n,0n,0n], groupCell:[0n,0n,0n], galaxyOrdinal:0,
  sectorCell:[0n,0n,0n], genCell:[0n,0n,0n], systemOrdinal:0, slot:'x'};
const g0 = galaxies(SEED)[0];
/** The four water worlds the relief round is judged on (terrain-climate-fixtures.mjs picks). */
const WORLDS = [['G001/C2128,0,1/0',1],['G001/C2142,3,4/0',0],['G001/C2143,4,3/0',1],['G001/C2142,6,1/1',1]].map(([a,i]) => {
  const sys = system(refByAddress(g0, a)), body = sys.planets[i];
  const star = sys.stars.find(s => s.id === body.parentId) || sys.stars[0];
  const starLc = starLifecycle(SEED, ADDR, star), planetLc = planetLifecycle(SEED, ADDR, body, starLc);
  return {body, starLc, planetLc};
});
const LOSSES = [0, .05, .25, .5, .9, 1];

test('cost: hypsometry build and levelForLoss (strict budgets with OCEAN_PERF_STRICT=1)', () => {
  const strict = process.env.OCEAN_PERF_STRICT === '1';
  const builds = [];
  for (let round = 0; round < 3; round++) for (const {body} of WORLDS) {
    clearOceanHypsometryCache();
    const t0 = performance.now(); oceanHypsometry(body); builds.push(performance.now() - t0);
  }
  const warm = builds.slice(WORLDS.length).sort((a, b) => a - b), median = warm[warm.length >> 1];
  const body = WORLDS[0].body; oceanHypsometry(body);
  const N = 20000, t0 = performance.now(); let s = 0;
  for (let i = 0; i < N; i++) s += levelForLoss(body, (i % 997) / 997);
  const perLevelUs = (performance.now() - t0) / N * 1000;
  console.log(`ocean-volume cost: build median ${median.toFixed(2)} ms (first call in this test ${builds[0].toFixed(2)} ms), levelForLoss ${perLevelUs.toFixed(2)} us`, s < 0);
  assert.ok(median <= (strict ? 5 : 50), `build ${median} ms`);
  assert.ok(perLevelUs <= (strict ? 20 : 200), `levelForLoss ${perLevelUs} us`);
});
