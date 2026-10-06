// Cost plan T4: sparse-consumer audit. One caller, one world, one fresh process, with the mountains WIRED (a scratch
// copy of this tree with TERRAIN_MOUNTAINS_WIRED = true, see sync-wired.sh) and, for timing, main's checkout as it is
// (mountains off). Counts M3 block solves (carvingBuildStats, module-global in the wired tree) during the caller.
//   node test-results/mountains/t4/audit.mjs <wiredRoot> <mainRoot> <caller> <world|all> [out.json]
// caller: orbit | ocean | survey | place | golden-terrain | golden-platform
import {pathToFileURL} from 'node:url';
import {writeFileSync, existsSync, readFileSync} from 'node:fs';
const [wiredRoot, mainRoot, caller, worldName, out] = process.argv.slice(2);
const imp = (root, p) => import(pathToFileURL(`${root}/${p}`).href);
const C = await imp(wiredRoot, 'src/mountain-carving.ts');
const F = await imp(mainRoot, 'tests/terrain-climate-fixtures.mjs');
const worlds = F.waterWorlds(), body = worlds.find(b => b.name === worldName);
const now = () => performance.now();
async function measure(fn) {const b0 = C.carvingBuildStats.count, t0 = now();const r = await fn();return {ms: now() - t0, blockSolves: C.carvingBuildStats.count - b0, r};}
let row;
if (caller === 'orbit') {
  const W = await imp(wiredRoot, 'src/terrain.ts');
  const w = await measure(() => W.planetSurface(body, 1024, 192));
  row = {ms: w.ms, blockSolves: w.blockSolves, landFraction: w.r.landFraction};
} else if (caller === 'ocean') {
  const O = await imp(wiredRoot, 'src/ocean-volume.ts');
  O.clearOceanHypsometryCache();
  const w = await measure(() => O.oceanHypsometry(body));
  row = {ms: w.ms, blockSolves: w.blockSolves, minHeightM: w.r.minHeightM, belowZero: w.r.belowZero};
} else if (caller === 'survey') {
  const S = await imp(wiredRoot, 'src/surface-survey.ts');
  const w = await measure(() => S.surfaceSurvey(body));
  row = {ms: w.ms, blockSolves: w.blockSolves, sites: w.r.length};
} else if (caller === 'place') {
  // The golden placeQuery section's own directions (directions(22) + 2 seam directions) at the catalogue epoch, with
  // and without measured slope: a placeAt is a point query, so each first touch of a massif block solves it.
  const Q = await imp(wiredRoot, 'src/place-query.ts'), O = await imp(wiredRoot, 'src/ocean-volume.ts');
  const T = await imp(wiredRoot, 'src/world-time.ts'), K = await imp(wiredRoot, 'src/catalog.ts');
  const g0 = K.galaxies('LETHRA-001')[0], addr = {Maithea: ['G001/C2128,0,1/0', 1], Selawyn: ['G001/C2142,3,4/0', 0], Raiva: ['G001/C2143,4,3/0', 1], Lethuris: ['G001/C2142,6,1/1', 1]}[worldName];
  const sys = K.system(K.refByAddress(g0, addr[0])), b = sys.planets[addr[1]];
  if (b.name !== worldName) throw new Error('world mismatch ' + b.name);
  const ctx = {sys, body: b, t: T.CATALOGUE_EPOCH_NS};
  const dirs = [...Array.from({length: 22}, (_, i) => O.fibonacciDirection(i, 22)), [0.99995, 0, 0.01], [0.99995, 0, -0.01]];
  // Warm the dated resolution (hypsometry and samplers) first, so the count is the point queries only.
  const warm = await measure(() => Q.placeAt(ctx, [0, 1, 0]));
  const pts = await measure(() => dirs.map(d => Q.placeAt(ctx, d, 'S4', {measureSlope: true})));
  // A massif point: the M1 axis site the T3 tests use (first axis station), for a per-query first-touch cost.
  const H = await imp(wiredRoot, 'tests/helpers/mountain-coarse-tiles.mjs');
  const site = H.axisSites(b, {count: 1})[0].d;
  const one = site ? await measure(() => Q.placeAt(ctx, site, "S4")) : null;
  const again = site ? await measure(() => Q.placeAt(ctx, site, "S4")) : null;
  row = {warmMs: warm.ms, warmBlockSolves: warm.blockSolves, queries: dirs.length, ms: pts.ms, blockSolves: pts.blockSolves,
    massifFirstTouch: one && {ms: one.ms, blockSolves: one.blockSolves}, massifRepeat: again && {ms: again.ms, blockSolves: again.blockSolves}};
} else if (caller === 'golden-terrain') {
  const G = await imp(wiredRoot, 'tests/golden/generator.ts');
  const w = await measure(() => G.computeGolden());
  row = {ms: w.ms, blockSolves: w.blockSolves, terrainDigest: w.r.terrainDigest ?? null};
} else if (caller === 'golden-platform') {
  const G = await imp(wiredRoot, 'tests/golden/generator.ts');
  const w = await measure(() => G.platformSectionLines('golden'));
  row = {ms: w.ms, blockSolves: w.blockSolves};
} else throw new Error('unknown caller ' + caller);
const rec = {caller, world: worldName, wiredRoot, ...row};
console.log(JSON.stringify(rec));
if (out) {const all = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {};all[`${caller}/${worldName}`] = rec;writeFileSync(out, JSON.stringify(all, null, 1) + '\n');}
