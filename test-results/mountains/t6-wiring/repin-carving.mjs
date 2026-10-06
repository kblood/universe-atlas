// T6 re-pin evidence for tests/lod-carving-reduction.test.mjs: the same digest function and inputs as the test, on
// the wired tree. Prints COST_IDENTITY ([0] L(cut-1), [1] L(cut) tile buffers) and COST_SAMPLER_IDENTITY per class
// ([0] coarse, [1] carved without rock, [2] rock = truth and levels >= rockDetailFromLevel), checking that every level
// of a class gives the same digest.
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import * as tiles from '../../../src/planet-tiles.ts';
import {terrainSampler} from '../../../src/terrain.ts';
import {carvingFromLevel, rockDetailFromLevel} from '../../../src/lod-ladder.ts';
import {waterWorlds, fib} from '../../../tests/terrain-climate-fixtures.mjs';
import {axisSites, buildOn} from '../../../tests/helpers/mountain-coarse-tiles.mjs';
function costIdentityDigest(value) {
  const h = createHash('sha256');
  function add(v) {
    if (ArrayBuffer.isView(v)) { h.update(v.constructor.name); h.update(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)); }
    else if (typeof v === 'number') { const b = Buffer.alloc(8); b.writeDoubleLE(v); h.update(b); }
    else if (v && typeof v === 'object') { for (const k of Object.keys(v).sort()) { h.update(k); add(v[k]); } }
    else h.update(String(v));
  }
  add(value); return h.digest('hex');
}
const out = {};
for (const body of waterWorlds()) {
  const cut = carvingFromLevel(body.radiusM), rock = rockDetailFromLevel(body.radiusM), site = axisSites(body, {count: 3});
  const tilesDigest = [cut - 1, cut].map(L => costIdentityDigest(buildOn(body, tiles.directionTile(site[0].d, L))));
  const dirs = [...site.map(s => s.d), ...Array.from({length: 256}, (_, i) => fib(i, 256))], cls = [new Set(), new Set(), new Set()];
  for (const lodLevel of [undefined, ...Array.from({length: 23}, (_, i) => i)]) {
    const sample = terrainSampler(body, undefined, undefined, undefined, 0, undefined, true, {mountains: true, lodLevel});
    cls[lodLevel === undefined || lodLevel >= rock ? 2 : lodLevel >= cut ? 1 : 0].add(costIdentityDigest(dirs.map(d => sample(d))));
  }
  out[body.name] = {cut, rock, COST_IDENTITY: tilesDigest, COST_SAMPLER_IDENTITY: cls.map(s => [...s])};
  console.log(body.name, JSON.stringify(out[body.name]));
}
writeFileSync(process.argv[2], JSON.stringify(out, null, 1) + '\n');
