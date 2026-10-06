// T6: every lod-consistency cross-level cell (the 96: 2 worlds x L6..L14 x 9 keys + 6 retention cells, the 17
// SHIPPED_CEILINGS pins among them) on a checkout, with the FROZEN selection (tests/helpers/lod-frozen-selection.mjs)
// exactly as tests/lod-consistency.test.mjs computes it. NOT mountain evidence: no frozen tile touches a 48 km massif
// (docs/mountains-opus-decisions-2026-10-05.md); these cells show "no regression outside the massifs" only.
//   node lod-cells-t6.mjs <root> <out.json>
import {pathToFileURL} from 'node:url';
import {writeFileSync, readFileSync} from 'node:fs';
const ROOT = process.argv[2], OUT = process.argv[3], imp = p => import(pathToFileURL(`${ROOT}/${p}`).href);
const tiles = await imp('src/planet-tiles.ts'), {terrainSampler, TERRAIN_VERSION} = await imp('src/terrain.ts'), {biomeClassifier} = await imp('src/surface-biomes.ts');
const {waterWorlds} = await imp('tests/terrain-climate-fixtures.mjs');
const {LOD_TOLERANCES: tol, tileEdgeM} = await imp('src/lod-ladder.ts');
const {crossPair, newCrossAcc, summariseCross, retentionTile, newRetentionAcc, summariseRetention} = await imp('scripts/lod-consistency-report.mjs');
const {FROZEN_STRATIFIED, FROZEN_MAITHEA_RETENTION_EDGES} = await imp('tests/helpers/lod-frozen-selection.mjs');
const src = readFileSync(`${ROOT}/tests/lod-consistency.test.mjs`, 'utf8');
const SHIPPED_CEILINGS = Function(`return ${src.match(/const SHIPPED_CEILINGS=(\{[\s\S]*?\n\});/)[1]}`)();
const m = {...tiles, terrainSampler, biomeClassifier, waterWorlds}, bodies = Object.fromEntries(waterWorlds().map(b => [b.name, b]));
const rows = [];
for (const name of ['Maithea', 'Lethuris']) {
  const body = bodies[name], ts = terrainSampler(body), cls = biomeClassifier(body), dirs = Object.values(FROZEN_STRATIFIED[name]).flat();
  for (const L of [6, 8, 10, 12, 14]) {
    const acc = newCrossAcc(true);for (const d of dirs) crossPair(m, body, ts, cls, d, L, acc);
    const s = summariseCross(acc), edge = tileEdgeM(body.radiusM, L), cap = SHIPPED_CEILINGS[name][L] || {};
    const check = (key, value, plan, pinnable = true) => {const pin = pinnable && cap[key] !== undefined, limit = pin ? Math.max(plan, cap[key]) : plan;
      rows.push({world: name, L, key, value: +value.toFixed(3), limit: +limit.toFixed(3), source: pin ? 'SHIPPED_CEILING' : 'plan tolerance', ok: value <= limit});};
    check('heightP99M', s.p99, tol.heightP99M(edge), false);check('heightMaxM', s.max, tol.heightMaxM(edge), false);
    check('sharedOceanMismatch', s.sharedOceanMismatch, 0, false);check('ocean', s.ocean, 100 * tol.classDisagreement, false);
    check('rgbP99', s.rgbP99, tol.colourP99(L));
    for (const key of ['snow', 'forest', 'name', 'carriedName']) check(key, s[key], 100 * tol.classDisagreement);
  }
}
{
  const body = bodies.Maithea, ts = terrainSampler(body), cls = biomeClassifier(body), keeps = tol.coarseKeeps;
  const at = L => {const a = newRetentionAcc();for (const d of FROZEN_MAITHEA_RETENTION_EDGES) retentionTile(m, body, ts, cls, d, L, a);return summariseRetention(a);};
  const l6 = at(6), l8 = at(8);
  for (const [k, v, lim, op] of [['L6 peakKept', l6.peakKept, 100 * keeps.peakAreaL6, '>='], ['L8 peakKept', l8.peakKept, 100 * keeps.peakAreaL8, '>='], ['L6 summitP50', l6.summitP50, 120, '<='], ['L6 summitMax', l6.summitMax, 400, '<='], ['L6 snowKept', l6.snowKept, 100 * keeps.snowL6, '>='], ['L6 forestKept', l6.forestKept, 100 * keeps.forestL6, '>=']])
    rows.push({world: 'Maithea', L: 'retention', key: k, value: +v.toFixed(3), limit: lim, source: 'retention test', ok: op === '>=' ? v >= lim : v <= lim});
}
const pins = rows.filter(r => r.source === 'SHIPPED_CEILING');
const summary = {root: ROOT, terrainVersion: TERRAIN_VERSION, cells: rows.length, pass: rows.filter(r => r.ok).length, pins: pins.length, pinsPass: pins.filter(r => r.ok).length};
console.log(JSON.stringify(summary));
writeFileSync(OUT, JSON.stringify({summary, rows}, null, 1) + '\n');
