// T6 (C3) on the massif tile set: cold build of the frozen 12 massif tiles per world (tests/helpers/mountain-tile-set.mjs)
// at the carved levels L(cut) .. L(cut)+2, the rock level and rock+2, with the mountains WIRED (default sampler). One
// fresh process per (world, level). Tiles of one world can share an M3 block (flank next to its axis station), so a
// later tile may be warm: the first touch is reported per tile in build order. Decision bound: no single tile above 2 s.
//   node c3-tile-set.mjs <world> <level> <out.json>
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import * as tiles from '../../../src/planet-tiles.ts';
import {carvingBuildStats} from '../../../src/mountain-carving.ts';
import {TERRAIN_MOUNTAINS_WIRED} from '../../../src/terrain.ts';
import {waterWorlds} from '../../../tests/terrain-climate-fixtures.mjs';
import {FROZEN_MASSIF_TILE_SET} from '../../../tests/helpers/mountain-tile-set.mjs';
if (!TERRAIN_MOUNTAINS_WIRED) throw new Error('not wired');
const [world, levelArg, out] = process.argv.slice(2), level = +levelArg;
const body = waterWorlds().find(b => b.name === world);
tiles.buildTile(body, tiles.directionTile([0, 0, 1], level));// warm non-M3 state on a non-massif tile
const rows = [];
for (const s of FROZEN_MASSIF_TILE_SET[world]) {
  const tile = tiles.directionTile(s.d, level), b0 = carvingBuildStats.count, t0 = performance.now();
  tiles.buildTile(body, tile);
  rows.push({kind: s.kind, tile: tiles.tileKey(tile), ms: Math.round(performance.now() - t0), blockSolves: carvingBuildStats.count - b0});
}
const rec = {world, level, maxMs: Math.max(...rows.map(r => r.ms)), meanMs: Math.round(rows.reduce((a, r) => a + r.ms, 0) / rows.length), maxSolves: Math.max(...rows.map(r => r.blockSolves)), over2s: rows.filter(r => r.ms > 2000).length, rows};
console.log(JSON.stringify({world, level, maxMs: rec.maxMs, meanMs: rec.meanMs, maxSolves: rec.maxSolves, over2s: rec.over2s}));
const all = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {};all[`${world}/L${level}`] = rec;writeFileSync(out, JSON.stringify(all, null, 1) + '\n');
