// Step 2 identity (docs/mountain-riser-lod-2026-10-07.md section 5): the branch's truth and every level from
// riserSharpFromLevel on are Object.is-identical to main 7419733 (exported tree) on 4 worlds x 3 FROZEN axis sites x a
// 65 x 65 lattice at each of L(sharp), L(sharp)+1, L(sharp)+2 (the site's own tile) and the truth at the same points;
// plus F1 on the M5 fixture: rockDetailM with riserWidthM 0, and with every width whose w <= BENCH_FALL, equals v1.
//   node identity.mjs <out.json>
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
import {ROOT_V1, ROOT_BRANCH} from './frame.mjs';
const imp = (root, p) => import(pathToFileURL(root + p).href);
const Tb = await imp(ROOT_BRANCH, '/src/terrain.ts'), Tm = await imp(ROOT_V1, '/src/terrain.ts');
const LL = await imp(ROOT_BRANCH, '/src/lod-ladder.ts');
const tiles = await imp(ROOT_V1, '/src/planet-tiles.ts');
const {waterWorlds} = await imp(ROOT_V1, '/tests/terrain-climate-fixtures.mjs');
const {FROZEN_MASSIF_TILE_SET} = await imp(ROOT_V1, '/tests/helpers/mountain-tile-set.mjs');
const Rb = await imp(ROOT_BRANCH, '/src/mountain-rock-detail.ts'), Rm = await imp(ROOT_V1, '/src/mountain-rock-detail.ts');
const F = await imp(ROOT_V1, '/tests/helpers/mountain-rock-detail-fixture.mjs');
const fields = ['elevationM', 'groundHeightM', 'rockHeightM', 'visibleHeightM', 'ocean', 'biome', 'colour', 'color'];
const same = (a, b) => {
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k], y = b[k];
    if (Array.isArray(x) || ArrayBuffer.isView(x)) {if (x.length !== y?.length) return false;for (let i = 0; i < x.length; i++) if (!Object.is(x[i], y[i])) return false;}
    else if (x && typeof x === 'object') {if (JSON.stringify(x) !== JSON.stringify(y)) return false;}
    else if (!Object.is(x, y)) return false;
  }
  return true;
};
const report = {worlds: {}, fixture: {}};
for (const body of waterWorlds()) {
  const R = body.radiusM, sharp = LL.riserSharpFromLevel(R), rows = {sharp, rock: LL.rockDetailFromLevel(R), compared: 0, mismatches: 0, perLevel: {}};
  const sites = FROZEN_MASSIF_TILE_SET[body.name].filter(e => e.kind === 'axis').slice(0, 3);
  for (const lodLevel of [undefined, sharp, sharp + 1, sharp + 2]) {
    const opt = lodLevel === undefined ? {} : {lodLevel};
    const sb = Tb.terrainSampler(body, undefined, undefined, false, 0, undefined, false, opt), sm = Tm.terrainSampler(body, undefined, undefined, false, 0, undefined, false, opt);
    let n = 0, bad = 0;
    for (const site of sites) {
      const t = tiles.directionTile(site.d, lodLevel ?? sharp);
      for (let y = 0; y <= 64; y++) for (let x = 0; x <= 64; x++) {const d = tiles.tileDirection(t, x / 64, y / 64);n++;if (!same(sb(d), sm(d))) bad++;}
    }
    rows.perLevel[lodLevel === undefined ? 'truth' : `L${lodLevel}`] = {points: n, mismatches: bad};rows.compared += n;rows.mismatches += bad;
  }
  // the filtered level just below sharp must differ somewhere (non-vacuity of the change), reported only
  {
    const L = sharp - 1, sb = Tb.terrainSampler(body, undefined, undefined, false, 0, undefined, false, {lodLevel: L}), sm = Tm.terrainSampler(body, undefined, undefined, false, 0, undefined, false, {lodLevel: L});
    let n = 0, moved = 0;for (const site of sites) {const t = tiles.directionTile(site.d, L);for (let y = 0; y <= 64; y += 2) for (let x = 0; x <= 64; x += 2) {const d = tiles.tileDirection(t, x / 64, y / 64);n++;moved += sb(d).groundHeightM !== sm(d).groundHeightM;}}
    rows.infoFilteredLevelMoved = {level: L, points: n, moved};
  }
  report.worlds[body.name] = rows;console.log(body.name, JSON.stringify(rows));
}
// F1
const C = Rm.MOUNTAIN_ROCK_DETAIL;
for (const [label, seeds] of [['tuning', F.TUNING], ['gate', F.GATE]]) {
  let n = 0, bad0 = 0, badSmall = 0, small = 0;
  for (const seed of seeds) for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) {
    const x = -20000 + i * 634.62, y = -19500 + j * 614.14, h = F.base(x, y, seed), hx = F.base(x + 125, y, seed), hy = F.base(x, y + 125, seed), rs = Rm.rockDetailSeed(seed);
    const v1 = Rm.rockDetailM(x + F.offset(seed), y, h, hx, hy, rs);n++;
    if (!Object.is(Rb.rockDetailM(x + F.offset(seed), y, h, hx, hy, rs), v1) || !Object.is(Rb.rockDetailM(x + F.offset(seed), y, h, hx, hy, rs, 0), v1)) bad0++;
    const s = Rm.carvedSlopeTan(h, hx, hy);
    for (const width of [10, 20, 31.13, 62.26, 124.51, 249.03, 498.06]) if (width * s / C.STRATA_PERIOD_M <= C.BENCH_FALL) {small++;if (!Object.is(Rb.rockDetailM(x + F.offset(seed), y, h, hx, hy, rs, width), v1)) badSmall++;}
  }
  report.fixture[label] = {samples: n, widthZeroMismatches: bad0, smallWidthCases: small, smallWidthMismatches: badSmall};
  console.log('F1', label, JSON.stringify(report.fixture[label]));
}
writeFileSync(process.argv[2], JSON.stringify(report, null, 1));
