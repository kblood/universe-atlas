// Carving C1 (terrain-1.9.1-carving-c1): the truth sampler of this branch against main's, on the T3 direction set
// (4096 Fibonacci + 8 axis sites x (33^2 + 17^2) rasters = 15,120 per world). Every direction with belt = 0 must be
// bit-identical (the whole sample: height, ocean, colour, roughness), and so must every direction outside the massif
// (|axis| >= H); the in-massif directions are expected to move (negative control: moved > 0).
//   node test-results/mountains/carving-c1/belt-identity.mjs <mainRoot> [out.json]
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
import {terrainSampler, TERRAIN_VERSION} from '../../../src/terrain.ts';
import {orogenLayout} from '../../../src/mountain-layout.ts';
import {MASSIF_ENVELOPE} from '../../../src/mountain-envelope.ts';
import {waterWorlds, fib} from '../../../tests/terrain-climate-fixtures.mjs';
import {axisSites} from '../../../tests/helpers/mountain-coarse-tiles.mjs';
const [mainRoot, out = 'test-results/mountains/carving-c1/belt-identity.json'] = process.argv.slice(2);
const M = await import(pathToFileURL(`${mainRoot}/src/terrain.ts`).href);
const key = s => [s.groundHeightM, s.ocean, ...s.color, s.roughness, s.landformScale];
const rows = {mine: TERRAIN_VERSION, main: M.TERRAIN_VERSION};
for (const body of waterWorlds()) {
  const R = body.radiusM, dirs = Array.from({length: 4096}, (_, i) => fib(i, 4096));
  for (const s of axisSites(body, {count: 8})) {
    const a = [s.d[1], -s.d[0], 0], al = Math.hypot(...a), t1 = a.map(v => v / al), t2 = [s.d[1] * t1[2] - s.d[2] * t1[1], s.d[2] * t1[0] - s.d[0] * t1[2], s.d[0] * t1[1] - s.d[1] * t1[0]];
    const raster = (k, step) => {for (let i = -k; i <= k; i++) for (let j = -k; j <= k; j++) {const p = s.d.map((v, q) => v + (i * step * t1[q] + j * step * t2[q]) / R), l = Math.hypot(...p);dirs.push(p.map(v => v / l));}};
    raster(16, 1500);raster(8, 6000);
  }
  const mine = terrainSampler(body), main = M.terrainSampler(body), lay = orogenLayout(body);
  let belt0 = 0, belt0Mismatch = 0, outside = 0, outsideMismatch = 0, inside = 0, moved = 0, maxDhM = 0;
  for (const d of dirs) {
    const o = lay.sample(d), a = key(mine(d)), b = key(main(d)), diff = a.some((v, i) => !Object.is(v, b[i]));
    const massif = o.belt !== 0 && o.halfWidthM >= MASSIF_ENVELOPE.MIN_HALF_WIDTH_M && Math.abs(o.axisDistanceM) < Math.min(o.halfWidthM, MASSIF_ENVELOPE.MAX_HALF_WIDTH_M);
    if (o.belt === 0) {belt0++;if (diff) belt0Mismatch++;}
    if (!massif) {outside++;if (diff) outsideMismatch++;} else {inside++;if (diff) {moved++;maxDhM = Math.max(maxDhM, Math.abs(a[0] - b[0]));}}
  }
  rows[body.name] = {directions: dirs.length, belt0, belt0Mismatch, outsideMassif: outside, outsideMismatch, inMassif: inside, inMassifMoved: moved, maxInMassifDhM: +maxDhM.toFixed(2)};
  console.log(body.name, JSON.stringify(rows[body.name]));
}
writeFileSync(out, JSON.stringify(rows, null, 1) + '\n');
