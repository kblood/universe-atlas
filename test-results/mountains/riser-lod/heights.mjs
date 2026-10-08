// Height-domain rows of docs/mountain-riser-lod-2026-10-07.md section 4 on one station window. CPU only.
//   node heights.mjs <world> <station: probe | tileSetIndex> <arm: v1 | branch> <out.json>
// Fields: truth (v1 src, no level), off (lodLevel rockDetailFromLevel - 1), arm at every level rock-1 .. sharp+1
// (sharp = first level whose tile edge <= 620.767 m, i.e. lattice spacing <= 19.399 m; written out here so the
// script also runs on main's src, which has no such function).
//  (a) coarse >= truth and (b) level monotonicity and (c) switch continuity: on the level-`sharp` lattice of a
//      4 km x 4 km window (every level's sampler at the same directions);
//  (d) ledge retention LR per level: on the level-L lattice of an 8 km x 8 km window, r = h_L - h_off at vertices,
//      ideal = the 4 x 4 box mean of (h_truth - h_off) over the cell around each vertex; hp = minus the
//      (2m+1)^2-vertex box mean, m = ceil(500 m / spacing); rock vertices = truth rock term < -1 m with the whole
//      box in the window; LR = RMS(hp r) / RMS(hp ideal).
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
import {ROOT_V1, ROOT_BRANCH, stationFor} from './frame.mjs';
const [world, station, arm, out] = process.argv.slice(2);
const root = arm === 'branch' ? ROOT_BRANCH : ROOT_V1;
const T = await import(pathToFileURL(root + '/src/terrain.ts').href);
const T1 = await import(pathToFileURL(ROOT_V1 + '/src/terrain.ts').href);
const {cubeDirection, directionCoordinates} = await import(pathToFileURL(ROOT_V1 + '/src/planet-tiles.ts').href);
const LL = await import(pathToFileURL(ROOT_V1 + '/src/lod-ladder.ts').href);
const {waterWorlds} = await import(pathToFileURL(ROOT_V1 + '/tests/terrain-climate-fixtures.mjs').href);
const body = waterWorlds().find(b => b.name === world), R = body.radiusM;
const {t} = await stationFor(world, station);
const rock = LL.rockDetailFromLevel(R), sharp = LL.firstLevelAtOrBelowEdge(R, .08 * 280 / (2 * .5773502691896257) * 32);
const mk = (TT, lodLevel) => TT.terrainSampler(body, undefined, undefined, false, 0, undefined, false, lodLevel === undefined ? {} : {lodLevel});
const truth = mk(T1), off = mk(T1, rock - 1), armTruth = mk(T);
const levels = [];for (let L = rock - 1; L <= sharp + 1; L++) levels.push(L);
const samplers = Object.fromEntries(levels.map(L => [L, mk(T, L)]));
const {face, u: u0, v: v0} = directionCoordinates(t);
const lattice = (L, halfM) => {
  const cells = 2 ** L * 32, cx = Math.round((u0 + 1) / 2 * cells), cy = Math.round((v0 + 1) / 2 * cells);
  const at = (gx, gy) => cubeDirection(face, gx * 2 / cells - 1, gy * 2 / cells - 1);
  const a = at(cx, cy), b = at(cx + 1, cy), s = Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])) * R, N = Math.ceil(halfM / s);
  return {s, N, S: 2 * N + 1, dir: (i, j) => at(cx - N + i, cy - N + j)};
};
const report = {world, station, arm, root, rock, sharp, levels};
// (a)-(c)
{
  const G = lattice(sharp, 2000), n = G.S * G.S, H = {}, ht = new Float64Array(n), ho = new Float64Array(n), hat = new Float64Array(n);
  for (const L of levels) H[L] = new Float64Array(n);
  for (let j = 0, k = 0; j < G.S; j++) for (let i = 0; i < G.S; i++, k++) {
    const d = G.dir(i, j);ht[k] = truth(d).groundHeightM;ho[k] = off(d).groundHeightM;hat[k] = armTruth(d).groundHeightM;
    for (const L of levels) H[L][k] = samplers[L](d).groundHeightM;
  }
  let truthMismatch = 0;for (let k = 0; k < n; k++) truthMismatch += !Object.is(ht[k], hat[k]);
  const rows = {points: n, spacingM: G.s, armTruthVsV1TruthMismatch: truthMismatch, rockPoints: 0, perLevel: {}, switches: {}};
  for (let k = 0; k < n; k++) rows.rockPoints += ht[k] < ho[k] - 1e-9;
  for (const L of levels) {
    let below = 0, belowMax = 0, aboveOff = 0;
    for (let k = 0; k < n; k++) {const d = ht[k] - H[L][k];if (d > 0) {below++;belowMax = Math.max(belowMax, d);}if (H[L][k] > ho[k]) aboveOff++;}
    rows.perLevel[L] = {coarseBelowTruth: below, coarseBelowTruthMaxM: belowMax, aboveRockOff: aboveOff};
  }
  // main's rock switch jump at each point (the pointwise continuity bound): |truth - off|
  for (let x = 1; x < levels.length; x++) {
    const P = levels[x - 1], C = levels[x];let rev = 0, revUlp = 0, max = 0, boundViol = 0;const ds = [];
    for (let k = 0; k < n; k++) {
      const d = H[P][k] - H[C][k];if (d < -1e-9) rev++;else if (d < 0) revUlp++;
      const a = Math.abs(d);ds.push(a);max = Math.max(max, a);if (a > Math.abs(ht[k] - ho[k]) + 1e-9) boundViol++;
    }
    ds.sort((a, b) => a - b);
    rows.switches[`L${P}->L${C}`] = {monotoneViolations: rev, ulpViolations: revUlp, maxAbsM: max, p99AbsM: ds[Math.floor(.99 * (n - 1))], pointwiseBoundViolations: boundViol};
  }
  {const ds = [];let max = 0;for (let k = 0; k < n; k++) {const a = Math.abs(ht[k] - ho[k]);ds.push(a);max = Math.max(max, a);}ds.sort((a, b) => a - b);
    rows.mainRockSwitch = {maxAbsM: max, p99AbsM: ds[Math.floor(.99 * (n - 1))]};}
  report.crossLevel = rows;
}
// (d)
report.LR = {};
for (const L of levels.filter(L => L >= rock && L <= sharp)) {
  const G = lattice(L, 4000), n = G.S * G.S, r = new Float64Array(n), ideal = new Float64Array(n), tr = new Float64Array(n);
  for (let j = 0, k = 0; j < G.S; j++) for (let i = 0; i < G.S; i++, k++) {
    const d = G.dir(i, j);r[k] = samplers[L](d).groundHeightM - off(d).groundHeightM;tr[k] = truth(d).groundHeightM - off(d).groundHeightM;
    let s = 0;for (let b = 0; b < 4; b++) for (let a = 0; a < 4; a++) {const dd = G.dir(i - .375 + .25 * a, j - .375 + .25 * b);s += truth(dd).groundHeightM - off(dd).groundHeightM;}
    ideal[k] = s / 16;
  }
  const m = Math.ceil(500 / G.s), hp = (f, i, j) => {let s = 0;for (let b = -m; b <= m; b++) for (let a = -m; a <= m; a++) s += f[(j + b) * G.S + i + a];return f[j * G.S + i] - s / (2 * m + 1) ** 2;};
  let er = 0, ei = 0, et = 0, cnt = 0;
  for (let j = m; j < G.S - m; j++) for (let i = m; i < G.S - m; i++) {
    if (!(tr[j * G.S + i] < -1)) continue;const a = hp(r, i, j), b = hp(ideal, i, j), c = hp(tr, i, j);er += a * a;ei += b * b;et += c * c;cnt++;
  }
  report.LR[L] = {spacingM: G.s, rockVertices: cnt, LR: Math.sqrt(er / ei), truthPointLR: Math.sqrt(et / ei), hpRmsM: Math.sqrt(er / cnt), idealHpRmsM: Math.sqrt(ei / cnt)};
}
writeFileSync(out, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report));
