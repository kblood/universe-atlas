// Child process of tests/sparse-consumer-levels.test.mjs (mountains cost plan T4). Run with the mountains wired:
//   node --import ./tests/helpers/wire-mountains.mjs tests/helpers/sparse-consumers-wired.mjs
// For each of the four water worlds it runs the sparse-global terrainSampler consumers exactly as the application
// calls them (default arguments) and counts M3 block solves (carvingBuildStats, module-global). Prints one JSON line.
import * as T from '../../src/terrain.ts';
import {carvingBuildStats} from '../../src/mountain-carving.ts';
import {carvingFromLevel} from '../../src/lod-ladder.ts';
import {oceanHypsometry, clearOceanHypsometryCache} from '../../src/ocean-volume.ts';
import {surfaceSurvey} from '../../src/surface-survey.ts';
import {waterWorlds} from '../terrain-climate-fixtures.mjs';
import {axisSites} from './mountain-coarse-tiles.mjs';

const solves = fn => {const b = carvingBuildStats.count, r = fn();return [carvingBuildStats.count - b, r];};
const out = {wired: T.TERRAIN_MOUNTAINS_WIRED, worlds: []};
for (const body of waterWorlds()) {
  const row = {world: body.name, cut: carvingFromLevel(body.radiusM)};
  // Orbit bake at the application's size (main.ts / worker.ts 'surface' job).
  const [orbitSolves, bake] = solves(() => T.planetSurface(body, 1024, 192));
  row.orbitSolves = orbitSolves;
  // Its elevation grid is the level-0 field exactly, and that field carries the massifs (not vacuous).
  const level0 = T.terrainSampler(body, undefined, undefined, false, 0, undefined, false, {lodLevel: 0});
  const off = T.terrainSampler(body, undefined, undefined, false, 0, undefined, false, {mountains: false});
  const {segments} = bake, rows = segments / 2;
  let notLevel0 = 0, raisedByMountains = 0;
  const [level0Solves] = solves(() => {
    for (let y = 0; y <= rows; y++) for (let x = 0; x <= segments; x++) {
      const theta = (x / segments) * Math.PI * 2, phi = (y / rows) * Math.PI;
      const d = [-Math.cos(theta) * Math.sin(phi), Math.cos(phi), Math.sin(theta) * Math.sin(phi)];
      const e = bake.elevations[y * (segments + 1) + x];
      if (!Object.is(e, Math.fround(level0(d).visibleHeightM))) notLevel0++;
      if (e > Math.fround(off(d).visibleHeightM)) raisedByMountains++;
    }
  });
  Object.assign(row, {gridPoints: (segments + 1) * (rows + 1), notLevel0, raisedByMountains, level0Solves});
  clearOceanHypsometryCache();
  const [oceanSolves, hyp] = solves(() => oceanHypsometry(body));
  const [surveySolves, sites] = solves(() => surfaceSurvey(body));
  // Negative control: the truth sampler (no level) at a massif axis site solves a block.
  const site = axisSites(body, {count: 1})[0].d;
  const [truthSolves] = solves(() => T.terrainSampler(body)(site));
  Object.assign(row, {oceanSolves, belowZero: hyp.belowZero, surveySolves, sites: sites.length, truthSolves});
  out.worlds.push(row);
}
process.stdout.write(JSON.stringify(out) + '\n');
