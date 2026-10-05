// Cost plan T3 (3): the truth sampler (mountains on, no level) of this branch against
//  - BASE: main 914d86f + the wiring hunk of 92afaa3 with T1's massifBeltSample call site (t2-wired-baseline.patch),
//    i.e. the wired truth before T3: must be bit-identical on every tested direction;
//  - A92: 92afaa3 itself (orogen-layout-1, ungridded), INFO only: T2 (orogen-layout-2) moved M1 by <= 7.8e-8 m in
//    distance and <= 0.1 m along the belt, so heights there are expected to differ in the last bits.
//   node test-results/mountains/t3/truth-identity.mjs <baseRoot> <a92Root> [out.json]
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {terrainSampler} from '../../../src/terrain.ts';
import {waterWorlds, fib} from '../../../tests/terrain-climate-fixtures.mjs';
import {axisSites} from '../../../tests/helpers/mountain-coarse-tiles.mjs';
const [baseRoot, a92Root, out = 'test-results/mountains/t3/truth-identity.json'] = process.argv.slice(2);
const B = await import(pathToFileURL(`${baseRoot}/src/terrain.ts`).href), A = await import(pathToFileURL(`${a92Root}/src/terrain.ts`).href);
const rows = {};
const key = s => [s.groundHeightM, s.ocean, ...s.color, s.roughness];
for (const body of waterWorlds()) {
  const R = body.radiusM, dirs = Array.from({length: 4096}, (_, i) => fib(i, 4096));
  for (const s of axisSites(body, {count: 8})) {
    const a = [s.d[1], -s.d[0], 0], al = Math.hypot(...a), t1 = a.map(v => v / al), t2 = [s.d[1] * t1[2] - s.d[2] * t1[1], s.d[2] * t1[0] - s.d[0] * t1[2], s.d[0] * t1[1] - s.d[1] * t1[0]];
    const raster = (k, step) => {for (let i = -k; i <= k; i++) for (let j = -k; j <= k; j++) {const p = s.d.map((v, q) => v + (i * step * t1[q] + j * step * t2[q]) / R), l = Math.hypot(...p);dirs.push(p.map(v => v / l));}};
    raster(16, 1500);raster(8, 6000);
  }
  const mine = terrainSampler(body, undefined, undefined, undefined, 0, undefined, false, {mountains: true}), base = B.terrainSampler(body), a92 = A.terrainSampler(body);
  const h = [createHash('sha256'), createHash('sha256'), createHash('sha256')];
  let baseMismatch = 0, a92Mismatch = 0, a92MaxDh = 0, carvedVsMain = 0;
  const main = terrainSampler(body);
  for (const d of dirs) {
    const m = key(mine(d)), b = key(base(d)), x = key(a92(d));
    h[0].update(JSON.stringify(m));h[1].update(JSON.stringify(b));h[2].update(JSON.stringify(x));
    if (m.some((v, i) => !Object.is(v, b[i]))) baseMismatch++;
    if (m.some((v, i) => !Object.is(v, x[i]))) {a92Mismatch++;a92MaxDh = Math.max(a92MaxDh, Math.abs(m[0] - x[0]));}
    if (m[0] !== main(d).groundHeightM) carvedVsMain++;
  }
  rows[body.name] = {directions: dirs.length, mountainsDifferFromUnwired: carvedVsMain, digest: h[0].digest('hex'), baseDigest: h[1].digest('hex'),
    baseMismatch, a92Digest: h[2].digest('hex'), a92Mismatch, a92MaxDhM: a92MaxDh};
  console.log(body.name, JSON.stringify(rows[body.name]));
}
writeFileSync(out, JSON.stringify(rows, null, 1) + '\n');
