// HARD: reduced 129-square ramp metric pin for the M3 winner (carving F, mountain-carving-2).
// Full 8-seed acceptance: node scripts/mountain-carving-f.mjs (docs/mountain-carving-f-v1.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import {measureSites,judgeM3} from './helpers/mountain-metrics.mjs';
import {R,SITES,rampSampler} from '../scripts/mountain-render-carving.mjs';

test('HARD: reduced 129-square ramp metric pin for the winner',()=>{
  const metrics=measureSites(rampSampler(),SITES.slice(0,1),R,{n:129,axisSub:2});
  const actual=Object.fromEntries(judgeM3(metrics).map(r=>[r.id,r.actual]));
  console.log('METRIC_PIN '+JSON.stringify(actual));
  // Re-pinned for carving F (mountain-carving-2); rows 7/8 are the calibrated rows of owner
  // decision (a). Previous pin (A2, mountain-carving-1): slope125Over30 44.5, slope125P50 27.4,
  // flank500mP50 22.1, relief8kmP50 2739, beta 2.04, fill 0.003, pits025 3.8, coherence 0.297.
  assert.deepEqual(actual,{"slope125Over30":79.8,"slope125P50":42.2,"flank500mP50":24.2,"relief8kmP50":1908,"beta500mTo8km":2.41,"fill10ShareP50":0.007,"pits025Per1000km2P50":0,"axisCoherence40kmP50":0.192});
});
