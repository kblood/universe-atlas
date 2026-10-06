// Every lod-consistency cross-level cell on current main, with its limit (SHIPPED_CEILINGS or the plan
// tolerance), exactly as tests/lod-consistency.test.mjs computes it. Evidence script, not a test.
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const MAIN = process.argv[2] || 'C:/LLM/IWSDK/universe-atlas', OUT = process.argv[3] || 'lod-cells', imp = p => import(pathToFileURL(`${MAIN}/${p}`).href);
const tiles = await imp('src/planet-tiles.ts'), {terrainSampler} = await imp('src/terrain.ts'), {biomeClassifier} = await imp('src/surface-biomes.ts');
const {waterWorlds} = await imp('tests/terrain-climate-fixtures.mjs');
const {LOD_TOLERANCES: tol, tileEdgeM, LOD_LADDER_VERSION} = await imp('src/lod-ladder.ts');
const {crossPair, newCrossAcc, summariseCross, stratifiedEdgeDirections} = await imp('scripts/lod-consistency-report.mjs');
const src = (await import('node:fs')).readFileSync(`${MAIN}/tests/lod-consistency.test.mjs`, 'utf8');
const SHIPPED_CEILINGS = Function(`return ${src.match(/const SHIPPED_CEILINGS=(\{[\s\S]*?\n\});/)[1]}`)();
const m = {...tiles, terrainSampler, biomeClassifier, waterWorlds}, bodies = Object.fromEntries(waterWorlds().map(b => [b.name, b]));
const rows = []; let fails = 0, pinned = 0, pinnedFail = 0;
for (const name of ['Maithea', 'Lethuris']) {
  const body = bodies[name], ts = terrainSampler(body), cls = biomeClassifier(body), dirs = Object.values(stratifiedEdgeDirections(ts, cls)).flat();
  for (const L of [6, 8, 10, 12, 14]) {
    const acc = newCrossAcc(true); for (const d of dirs) crossPair(m, body, ts, cls, d, L, acc);
    const s = summariseCross(acc), edge = tileEdgeM(body.radiusM, L), cap = SHIPPED_CEILINGS[name][L] || {};
    const check = (key, value, plan, pinnable = true) => { const pin = pinnable && cap[key] !== undefined, limit = pin ? Math.max(plan, cap[key]) : plan, ok = value <= limit;
      rows.push({world: name, L, key, value: +value.toFixed(3), limit: +limit.toFixed(3), source: pin ? 'SHIPPED_CEILING' : 'plan tolerance', ok, headroom: +(limit - value).toFixed(3)});
      if (pin) { pinned++; if (!ok) pinnedFail++; } if (!ok) fails++; };
    check('heightP99M', s.p99, tol.heightP99M(edge), false); check('heightMaxM', s.max, tol.heightMaxM(edge), false);
    check('sharedOceanMismatch', s.sharedOceanMismatch, 0, false); check('ocean', s.ocean, 100 * tol.classDisagreement, false);
    check('rgbP99', s.rgbP99, tol.colourP99(L));
    for (const key of ['snow', 'forest', 'name', 'carriedName']) check(key, s[key], 100 * tol.classDisagreement);
  }
}
{ // the retention test (tests/lod-consistency.test.mjs: Maithea, edgeDirections K=32)
  const {LOD_TOLERANCES} = await imp('src/lod-ladder.ts'), {retentionTile, newRetentionAcc, summariseRetention, edgeDirections} = await imp('scripts/lod-consistency-report.mjs');
  const body = bodies.Maithea, ts = terrainSampler(body), cls = biomeClassifier(body), dirs = edgeDirections(ts, cls, 32), keeps = LOD_TOLERANCES.coarseKeeps;
  const at = L => { const a = newRetentionAcc(); for (const d of dirs) retentionTile(m, body, ts, cls, d, L, a); return summariseRetention(a); };
  const l6 = at(6), l8 = at(8);
  const ret = [['L6 peakKept', l6.peakKept, 100 * keeps.peakAreaL6, '>='], ['L8 peakKept', l8.peakKept, 100 * keeps.peakAreaL8, '>='], ['L6 summitP50', l6.summitP50, 120, '<='], ['L6 summitMax', l6.summitMax, 400, '<='], ['L6 snowKept', l6.snowKept, 100 * keeps.snowL6, '>='], ['L6 forestKept', l6.forestKept, 100 * keeps.forestL6, '>=']];
  for (const [k, v, lim, op] of ret) { const ok = op === '>=' ? v >= lim : v <= lim; rows.push({world: 'Maithea', L: 'retention', key: k, value: +v.toFixed(3), limit: lim, source: 'retention test', ok}); if (!ok) fails++; console.log(`RETENTION ${ok ? 'pass' : 'FAIL'} Maithea ${k} ${v.toFixed(2)} ${op} ${lim}`); }
}
for (const r of rows.filter(r => r.source === 'SHIPPED_CEILING')) console.log(`PIN ${r.ok ? 'pass' : 'FAIL'} ${r.world} L${r.L} ${r.key} ${r.value} <= ${r.limit} (headroom ${r.headroom})`);
for (const r of rows.filter(r => !r.ok && r.source !== 'SHIPPED_CEILING')) console.log(`PLAN FAIL ${r.world} L${r.L} ${r.key} ${r.value} > ${r.limit}`);
console.log(`ladder ${LOD_LADDER_VERSION}; cells ${rows.length}; pinned ${pinned} (fail ${pinnedFail}); total fails ${fails}`);
writeFileSync(new URL('./'+OUT+'.json', import.meta.url), JSON.stringify({ladder: LOD_LADDER_VERSION, rows}, null, 1));
process.exit(fails ? 1 : 0);
