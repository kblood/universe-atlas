import {test} from 'node:test';
import assert from 'node:assert/strict';
import {galaxies,refByAddress,system} from '../../src/catalog.ts';
import {terrainSampler,baseTerrainSampler,planetSurface,DEFAULT_SURFACE_AGE_MYR,TERRAIN_VERSION} from '../../src/terrain.ts';
import {cubeDirection,buildTile,PATCH_SEGMENTS,directionTile} from '../../src/planet-tiles.ts';
import {biomeClassifier,materialBytes} from '../../src/surface-biomes.ts';
import {detailPixels,detailOrigin} from '../../src/ground-material.ts';
import {surfaceSurvey} from '../../src/surface-survey.ts';
const sys=system(refByAddress(galaxies('LETHRA-001')[0],'G001/C2128,0,1/0')),body=sys.planets[1];
test('planetSurface default stays within the system-surfaces multi-body job budget',()=>{
  const moon={id:'crater-test-moon-2',seed:'crater-test-seed-2',kind:'moon',type:'Rocky moon',radiusM:1737000,massKg:7.3e22,temperatureK:220,water:0};
  const t0=performance.now();
  const off=planetSurface(moon,64,16);
  // Regression guard: before terrain.ts gated craters off by default here,
  // a system view (worker.ts's job('system-surfaces',...), which calls this
  // function once per body with no per-call time budget of its own, all
  // inside ONE 60s-timeout job in main.ts) measured 261.2s in isolated Node
  // timing for a real 37-body system (11 planets + 26 moons), over 4x the
  // job's hard timeout, permanently stranding the app on the sector view -
  // see this task's report for the exact before/after numbers. This bound
  // is generous (the fixed body above measures under 50ms in isolation) but
  // catches the shape of that regression (an unbounded per-call cost that
  // does not scale down with a small width/segments request) recurring.
  assert.ok(performance.now()-t0<3000,'default planetSurface(...) must stay well inside a multi-body job budget');
});
