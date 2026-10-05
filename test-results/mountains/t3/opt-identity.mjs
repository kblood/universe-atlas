// Before-change value ledger: every tile buffer at a massif coarse/switch tile,
// and complete sampler outputs at truth and all tile levels (including signed zero).
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {waterWorlds, fib} from '../../../tests/terrain-climate-fixtures.mjs';
import {axisSites} from '../../../tests/helpers/mountain-coarse-tiles.mjs';
import {buildTile, directionTile} from '../../../src/planet-tiles.ts';
import {terrainSampler} from '../../../src/terrain.ts';
import {carvingFromLevel} from '../../../src/lod-ladder.ts';
export function digest(value) {
  const h = createHash('sha256');
  function add(v) {
    if (ArrayBuffer.isView(v)) { h.update(v.constructor.name); h.update(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)); }
    else if (typeof v === 'number') { const b = Buffer.alloc(8); b.writeDoubleLE(v); h.update(b); }
    else if (v && typeof v === 'object') { for (const k of Object.keys(v).sort()) { h.update(k); add(v[k]); } }
    else h.update(String(v));
  }
  add(value); return h.digest('hex');
}
const rows = {};
for (const b of waterWorlds()) {
  const cut = carvingFromLevel(b.radiusM), sites = axisSites(b, {count: 3}), d = sites[0].d;
  const tiles = [cut-1, cut].map(L => directionTile(d, L));
  const tileDigests = tiles.map(t => digest(buildTile(b,t,1,0,{mountains:true})));
  const dirs = [...sites.map(s=>s.d), ...Array.from({length:256},(_,i)=>fib(i,256))];
  const samplerDigests = [undefined,...Array.from({length:23},(_,i)=>i)].map(lodLevel => {
    const s = terrainSampler(b,undefined,undefined,undefined,0,undefined,true,{mountains:true,lodLevel});
    return digest(dirs.map(d=>s(d)));
  });
  rows[b.name] = {tiles,tileDigests,samplerDigests};
  console.log(b.name, JSON.stringify(rows[b.name]));
}
writeFileSync(process.argv[2], JSON.stringify(rows,null,2)+'\n');
