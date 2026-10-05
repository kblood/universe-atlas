// Cost plan T3 (1): build EVERY tile at L0..L(cut-1) of one water world with the mountains on, and count M3 block
// solves (module-global carvingBuildStats). Also counts the tiles whose lattice touches a massif (M1 only).
//   node test-results/mountains/t3/coarse-all-tiles.mjs <world> [out.json]
import {writeFileSync, existsSync, readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import * as T from '../../../src/planet-tiles.ts';
import {carvingFromLevel} from '../../../src/lod-ladder.ts';
import {carvingBuildStats} from '../../../src/mountain-carving.ts';
import {waterWorlds} from '../../../tests/terrain-climate-fixtures.mjs';
import {inMassif} from '../../../tests/helpers/mountain-coarse-tiles.mjs';
const [worldName, out = `test-results/mountains/t3/coarse-all-tiles-${worldName}.json`] = process.argv.slice(2);
const body = waterWorlds().find(b => b.name === worldName), cut = carvingFromLevel(body.radiusM), n = T.PATCH_SEGMENTS;
const levels = [];let sink = 0;const t0 = performance.now();
for (let L = 0; L < cut; L++) {
  const b0 = carvingBuildStats.count, t = performance.now(), N = 2 ** L;let tiles = 0, massifTiles = 0;
  for (let face = 0; face < 6; face++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const tile = {face, level: L, x, y}, r = T.buildTile(body, tile, 1, 0, {mountains: true});sink += r.surfaceHeight[0];tiles++;
    let m = false;for (let j = 0; j <= n && !m; j += 4) for (let i = 0; i <= n && !m; i += 4) m = inMassif(body, T.tileDirection(tile, i / n, j / n));
    if (m) massifTiles++;
  }
  levels.push({level: L, tiles, massifTiles, blockSolves: carvingBuildStats.count - b0, ms: performance.now() - t});
  console.log(worldName, JSON.stringify(levels.at(-1)));
}
const row = {world: worldName, cut, levels, totalTiles: levels.reduce((s, l) => s + l.tiles, 0), totalBlockSolves: carvingBuildStats.count, wallMs: performance.now() - t0, sink};
writeFileSync(out, JSON.stringify(row, null, 1) + '\n');
console.log(JSON.stringify({world: worldName, totalTiles: row.totalTiles, totalBlockSolves: row.totalBlockSolves}));
