// Cost plan T3 (5), INFO: cross-level cells at the carving switch L(cut-1) -> L(cut) on massif tiles (provisional
// M1-only selection: 8 axis sites per world, 300 km apart; the frozen Q6 massif set is T6's), level-faithful: each
// tile's lattice, classes and colour come from ITS level's sampler (the coarse tile is uncarved). For reference the
// same sites at the next pair L(cut) -> L(cut+1) (both carved). Also the mean height step child - parent mesh.
// Report-only: no ceiling or pin is set from these numbers (addendum item 2).
//   node test-results/mountains/t3/switch-cells.mjs [out.json]
import {writeFileSync} from 'node:fs';
import * as T from '../../../src/planet-tiles.ts';
import {carvingFromLevel, tileEdgeM, LOD_TOLERANCES} from '../../../src/lod-ladder.ts';
import {biomeClassifier} from '../../../src/surface-biomes.ts';
import {waterWorlds} from '../../../tests/terrain-climate-fixtures.mjs';
import {axisSites, mountainSampler, buildOn} from '../../../tests/helpers/mountain-coarse-tiles.mjs';
const out = process.argv[2] || 'test-results/mountains/t3/switch-cells.json', n = T.PATCH_SEGMENTS;
const q = (a, p) => {const s = [...a].sort((x, y) => x - y);return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + .5))] : NaN;};
const bil = (g, m, u, v, f) => {const gx = Math.min(m - 1e-9, u * m), gy = Math.min(m - 1e-9, v * m), ix = Math.floor(gx), iy = Math.floor(gy), a = gx - ix, b = gy - iy, s = m + 1;
  return f(g[iy * s + ix]) * (1 - a) * (1 - b) + f(g[iy * s + ix + 1]) * a * (1 - b) + f(g[(iy + 1) * s + ix]) * (1 - a) * b + f(g[(iy + 1) * s + ix + 1]) * a * b;};
function pair(body, cls, d, L) {
  const P = T.directionTile(d, L), C = T.directionTile(d, L + 1), tsP = mountainSampler(body, L), tsC = mountainSampler(body, L + 1);
  const pt = buildOn(body, P), ct = buildOn(body, C);
  const lattice = (t, data, ts) => {const g = [];for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) {const dd = T.tileDirection(t, x / n, y / n), s = ts(dd), c = cls(dd, s.groundHeightM, 1);
    g.push({h: data.surfaceHeight[y * (n + 1) + x], raw: s.groundHeightM, snowW: c.weights[3], name: c.name, forest: c.forestPotential ? 1 : 0});}return g;};
  const pg = lattice(P, pt, tsP), cg = lattice(C, ct, tsC), ox = C.x - P.x * 2, oy = C.y - P.y * 2;
  const r = {dh: [], rgb: [], n: 0, land: 0, snow: 0, forest: 0, name: 0, sharedOcean: 0, step: 0, steps: 0};
  for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) {
    const i = y * (n + 1) + x;r.step += ct.surfaceHeight[i] - ct.parentHeight[i];r.steps++;
    const u = (ox + x / n) / 2, v = (oy + y / n) / 2, c = cg[i];
    if (x % 2 === 0 && y % 2 === 0) {const p = pg[(oy * n / 2 + y / 2) * (n + 1) + ox * n / 2 + x / 2];if ((p.h < 0) !== (c.h < 0)) r.sharedOcean++;continue;}
    r.n++;const hp = bil(pg, n, u, v, o => o.h);r.dh.push(Math.abs(hp - c.h));
    if (c.raw >= 0) {r.land++;
      if ((bil(pg, n, u, v, o => o.snowW) > .5) !== (c.snowW > .5)) r.snow++;
      if ((bil(pg, n, u, v, o => o.forest) > .5) !== (c.forest > .5)) r.forest++;
      if (cls(T.tileDirection(C, x / n, y / n), hp, 1).name !== c.name) r.name++;}
  }
  const tp = 128, tc = 128, cgrid = (t, ts, res) => {const g = [];for (let y = 0; y <= res; y++) for (let x = 0; x <= res; x++) g.push(ts(T.tileDirection(t, x / res, y / res)).color);return g;};
  const pc = cgrid(P, tsP, tp), cc = cgrid(C, tsC, tc);
  for (let y = 1; y <= tc; y += 2) for (let x = 1; x <= tc; x += 2) {const u = (ox + x / tc) / 2, v = (oy + y / tc) / 2, c = cc[y * (tc + 1) + x];
    const rgb = [0, 1, 2].map(k => bil(pc, tp, u, v, o => o[k]));r.rgb.push(Math.hypot(rgb[0] - c[0], rgb[1] - c[1], rgb[2] - c[2]));}
  return r;
}
const rows = {};
for (const body of waterWorlds()) {
  const cut = carvingFromLevel(body.radiusM), cls = biomeClassifier(body), sites = axisSites(body, {count: 8});
  for (const L of [cut - 1, cut]) {
    const acc = {dh: [], rgb: [], n: 0, land: 0, snow: 0, forest: 0, name: 0, sharedOcean: 0, step: 0, steps: 0};
    for (const s of sites) {const r = pair(body, cls, s.d, L);for (const k of Object.keys(acc)) acc[k] = Array.isArray(acc[k]) ? acc[k].concat(r[k]) : acc[k] + r[k];}
    const edge = tileEdgeM(body.radiusM, L), pct = x => 100 * x / Math.max(1, acc.land);
    const row = {pair: `L${L}->L${L + 1}`, switch: L === cut - 1, tiles: sites.length, samples: acc.n, heightP50M: q(acc.dh, .5), heightP99M: q(acc.dh, .99), heightMaxM: q(acc.dh, 1),
      planHeightP99M: LOD_TOLERANCES.heightP99M(edge), planHeightMaxM: LOD_TOLERANCES.heightMaxM(edge), rgbP99: q(acc.rgb, .99), planRgbP99: LOD_TOLERANCES.colourP99(L),
      snowPct: pct(acc.snow), forestPct: pct(acc.forest), namePct: pct(acc.name), sharedOceanMismatch: acc.sharedOcean, meanStepChildMinusParentM: acc.step / acc.steps};
    rows[`${body.name}/L${L}`] = row;console.log(body.name, JSON.stringify(row));
  }
}
writeFileSync(out, JSON.stringify(rows, null, 1) + '\n');
