// place-query-1 (relief round 2026-10, P2-OCEAN-QUERY): the documented query
// surface for games built on the platform. Plain derived data, never game rules.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {galaxies, refByAddress, system} from '../../src/catalog.ts';
import {CATALOGUE_EPOCH_NS, YEAR_NS} from '../../src/world-time.ts';
import {starLifecycle, planetLifecycle} from '../../src/stellar-evolution.ts';
import {surfaceAt, surfaceQuery, datedOceanState} from '../../src/world-surface.ts';
import {fibonacciDirection} from '../../src/ocean-volume.ts';
import {geophysicsFromParams, pressureAtDepthPa, planetGeophysics} from '../../src/planet-geophysics.ts';
import {terrainSampler, terrainFloorSampler} from '../../src/terrain.ts';
import {placeAt, depthAndPressureAt, PLACE_QUERY_VERSION, PLACE_VERSIONS} from '../../src/place-query.ts';

const SEED = 'LETHRA-001';
const ADDR = {clusterCell:[0n,0n,0n], groupCell:[0n,0n,0n], galaxyOrdinal:0,
  sectorCell:[0n,0n,0n], genCell:[0n,0n,0n], systemOrdinal:0, slot:'x'};
const g0 = galaxies(SEED)[0];
const WORLDS = [['G001/C2128,0,1/0',1],['G001/C2142,3,4/0',0],['G001/C2143,4,3/0',1],['G001/C2142,6,1/1',1]].map(([a,i]) => {
  const sys = system(refByAddress(g0, a)), body = sys.planets[i];
  const starLc = starLifecycle(SEED, ADDR, sys.stars[0]);
  return {sys, body, starLc, planetLc: planetLifecycle(SEED, ADDR, body, starLc)};
});
const DIRS = Array.from({length: 600}, (_, i) => fibonacciDirection(i, 600));

test('cost: placeAt at full level (strict budget 3 us with OCEAN_PERF_STRICT=1)', () => {
  const {sys, body} = WORLDS[0], ctx = {sys, body, t: CATALOGUE_EPOCH_NS};
  const N = 40000, dirs = Array.from({length: N}, (_, i) => fibonacciDirection(i, N));
  let x = 0, us = Infinity;
  for (let round = 0; round < 3; round++) {
    const t0 = performance.now();
    for (let i = 0; i < N; i++) x += placeAt(ctx, dirs[i]).groundHeightM;
    us = Math.min(us, (performance.now() - t0) / N * 1000);
  }
  console.log(`placeAt ${us.toFixed(2)} us (best of 3 x ${N})`, x !== 0);
  assert.ok(us <= (process.env.OCEAN_PERF_STRICT === '1' ? 3 : 30), `placeAt ${us} us`);
});
