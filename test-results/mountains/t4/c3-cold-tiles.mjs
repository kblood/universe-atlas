// Cost plan (C3) / T5 trigger: cold build of massif tiles at the carved levels (L(cut) .. L(cut)+2), mountains on
// ({mountains: true}, the staged opt-in, which is what TERRAIN_MOUNTAINS_WIRED makes the default). One fresh process
// per (world, level); its tiles are the tiles under 8 axis sites >= 300 km apart, so no two tiles share an M3 block
// (block = 16 km core + 24 km halo) and every build is cold. Reports ms and block solves per tile.
//   node test-results/mountains/t4/c3-cold-tiles.mjs <world> <levelOffset> [out.json]
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import * as tiles from '../../../src/planet-tiles.ts';
import {carvingBuildStats} from '../../../src/mountain-carving.ts';
import {carvingFromLevel} from '../../../src/lod-ladder.ts';
import {waterWorlds} from '../../../tests/terrain-climate-fixtures.mjs';
import {axisSites, buildOn} from '../../../tests/helpers/mountain-coarse-tiles.mjs';
const [world, offArg, out] = process.argv.slice(2);
const body = waterWorlds().find(b => b.name === world), level = carvingFromLevel(body.radiusM) + +offArg;
// Warm everything that is not M3 (layout, samplers' module state, JIT) on a non-massif tile at the same level.
buildOn(body, tiles.directionTile([0, 0, 1], level));
const rows = [];
for (const s of axisSites(body, {count: 8})) {
  const tile = tiles.directionTile(s.d, level), b0 = carvingBuildStats.count, t0 = performance.now();
  buildOn(body, tile);
  rows.push({tile: tiles.tileKey(tile), ms: Math.round(performance.now() - t0), blockSolves: carvingBuildStats.count - b0});
}
const rec = {world, level, edgeKm: Math.round(Math.PI / 2 * body.radiusM / 2 ** level / 1000), maxMs: Math.max(...rows.map(r => r.ms)), maxSolves: Math.max(...rows.map(r => r.blockSolves)), rows};
console.log(JSON.stringify(rec));
if (out) {const all = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {};all[`${world}/L${level}`] = rec;writeFileSync(out, JSON.stringify(all, null, 1) + '\n');}
