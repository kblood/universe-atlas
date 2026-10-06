// T6 decision 3 (docs/mountains-opus-decisions-2026-10-05.md, addendum 4): with the mountains wired, the truth
// sampler solves M3 carving blocks and adds the M5 rock term at every massif direction, so a test that sweeps tens of
// thousands of GLOBAL directions for a statistic (climate colour and agreement, floor window, relief hypsometry,
// render bounds) costs minutes. Those tests read the level-0 field (lod-ladder-3: no carving, no rock, 0 block solves),
// where they test the global statistic rather than the carving. A test whose purpose is the carved truth itself is not
// moved here; it runs in test:full (fullOnly below). No pin is loosened by a move; a level-0 failure is a finding.
// Every move is listed in docs/mountains-t6-wiring-2026-10-06.md (file, old/new sampler, reason).
import {terrainSampler} from '../../src/terrain.ts';

/** The level whose sampler statistic-style tests read. */
export const STATISTIC_LEVEL = 0;
/** terrainSampler at the statistic level; same positional arguments as the truth calls it replaces. */
export function statisticSampler(body, {waterLevelM = 0, exposeFloor = false, regions, surfaceAgeMyr, includeCraters} = {}) {
  return terrainSampler(body, regions, surfaceAgeMyr, includeCraters, waterLevelM, undefined, exposeFloor, {lodLevel: STATISTIC_LEVEL});
}
/** node:test option for a test that checks the carved truth over many directions: runs in `npm run test:full`
 * (tests/helpers/test-runner.mjs sets ATLAS_TEST_FULL=1), skipped with the reason in the default `npm test`. */
export const fullOnly = (reason) => process.env.ATLAS_TEST_FULL === '1' ? {} : {skip: `test:full only (T6 decision 3): ${reason}`};
