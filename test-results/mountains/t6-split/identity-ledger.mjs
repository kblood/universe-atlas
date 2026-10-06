// Split-core identity ledger (T6 cost attempt, 2026-10-06). SHA-256 of complete outputs, captured BEFORE the change
// on a read-only main checkout and AFTER on the branch; the two JSON files must be byte-identical.
//   node identity-ledger.mjs <root> <out.json>                      (unwired default + {mountains:true} samplers/tiles)
//   node --import <root>/tests/helpers/wire-mountains.mjs identity-ledger.mjs <root> <out.json> --wired-default
//     (default samplers wired by the T4 load hook: orbit bake, hypsometry and survey as T6 will run them)
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const [root, out] = process.argv.slice(2).filter(a => !a.startsWith('--')), wiredDefault = process.argv.includes('--wired-default');
const imp = p => import(pathToFileURL(`${root}/${p}`).href);
const S = await imp('src/terrain.ts'), T = await imp('src/planet-tiles.ts'), L = await imp('src/lod-ladder.ts');
const F = await imp('tests/terrain-climate-fixtures.mjs'), H = await imp('tests/helpers/mountain-coarse-tiles.mjs');
const OV = await imp('src/ocean-volume.ts'), SV = await imp('src/surface-survey.ts');
if (wiredDefault !== S.TERRAIN_MOUNTAINS_WIRED) throw new Error(`wired flag ${S.TERRAIN_MOUNTAINS_WIRED} but --wired-default=${wiredDefault}`);
function digest(value) {
  const h = createHash('sha256');
  const add = v => {
    if (ArrayBuffer.isView(v)) {h.update(v.constructor.name);h.update(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));}
    else if (typeof v === 'number') {const b = Buffer.alloc(8);b.writeDoubleLE(v);h.update(b);}
    else if (Array.isArray(v)) {h.update(`[${v.length}`);for (const x of v) add(x);}
    else if (v && typeof v === 'object') {for (const k of Object.keys(v).sort()) {h.update(k);add(v[k]);}}
    else h.update(`${typeof v}:${String(v)}`);
  };
  add(value);return h.digest('hex');
}
const rows = {mode: wiredDefault ? 'wired-default' : 'staged-default'};
for (const body of F.waterWorlds()) {
  const R = body.radiusM, cut = L.carvingFromLevel(R), dirs = Array.from({length: 4096}, (_, i) => F.fib(i, 4096));
  const sites = H.axisSites(body, {count: 8});
  for (const s of sites) {
    const a = [s.d[1], -s.d[0], 0], al = Math.hypot(...a), t1 = a.map(v => v / al), t2 = [s.d[1] * t1[2] - s.d[2] * t1[1], s.d[2] * t1[0] - s.d[0] * t1[2], s.d[0] * t1[1] - s.d[1] * t1[0]];
    const raster = (k, step) => {for (let i = -k; i <= k; i++) for (let j = -k; j <= k; j++) {const p = s.d.map((v, q) => v + (i * step * t1[q] + j * step * t2[q]) / R), l = Math.hypot(...p);dirs.push(p.map(v => v / l));}};
    raster(16, 1500);raster(8, 6000);
  }
  const row = {directions: dirs.length, cut, samplers: {}, tiles: {}};
  const variants = [['default', {}], ['default-L0', {lodLevel: 0}], ['on-truth', {mountains: true}], ['on-L0', {mountains: true, lodLevel: 0}],
    [`on-L${cut - 1}`, {mountains: true, lodLevel: cut - 1}], [`on-L${cut}`, {mountains: true, lodLevel: cut}], ['off-truth', {mountains: false}]];
  for (const [name, opt] of variants) for (const floor of [false, true]) {
    const s = S.terrainSampler(body, undefined, undefined, undefined, 0, undefined, floor, opt);
    row.samplers[`${name}${floor ? '+floor' : ''}`] = digest(dirs.map(d => s(d)));
  }
  const crater = S.terrainSampler(body, undefined, undefined, true);
  row.samplers['default+craters'] = digest(dirs.slice(0, 4096).map(d => crater(d)));
  const base = S.baseTerrainSampler(body);
  row.samplers.base = digest(dirs.slice(0, 4096).map(d => base(d)));
  for (const lvl of [0, 3, cut - 1, cut, cut + 2]) {
    const t = T.directionTile(sites[0].d, lvl), t2 = T.directionTile(sites[3].d, lvl);
    row.tiles[`L${lvl}`] = [digest(T.buildTile(body, t)), digest(T.buildTile(body, t, 1, 0, {mountains: true})), digest(T.buildTile(body, t2)), digest(T.buildTile(body, t2, 1, 0, {mountains: true}))];
  }
  const orbit = S.planetSurface(body, 512, 96);
  row.orbit = digest({data: orbit.data, relief: orbit.relief, roughness: orbit.roughness, elevations: orbit.elevations, landFraction: orbit.landFraction});
  row.hypsometry = digest(OV.oceanHypsometry(body));
  try {row.survey = digest(SV.surfaceSurvey(body));} catch (e) {row.survey = `error: ${e.message}`;}
  rows[body.name] = row;
  console.log(body.name, JSON.stringify(row));
}
writeFileSync(out, JSON.stringify(rows, null, 1) + '\n');
