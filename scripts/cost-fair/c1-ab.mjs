// C1 (weighted warm resident sampler overhead) under the Q-A fair protocol: ONE fresh process measures two arms,
// ref (A) and cand (B), each its own checkout (separate module instances), on point sets precomputed by c1-points.mjs
// (no arm's modules touched by selection). `first` decides which arm is imported first, warmed first and runs first
// in even rounds; the driver alternates it between processes. A/A = two identical main checkouts.
// Per arm: one cold region pass + one outside pass (unmeasured warm-up), then 5 region rounds and 5 outside rounds,
// the arm order alternating per round. weighted = (s Bin + (1-s) Bout) / (s Ain + (1-s) Aout) - 1, medians of rounds.
//   node scripts/cost-fair/c1-ab.mjs <world> <refRoot> <candRoot> <pointsPrefix> <first: ref|cand> <label> <out.jsonl>
import {readFileSync, appendFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
const [worldName, refRoot, candRoot, prefix, first, label, out] = process.argv.slice(2);
if (first !== 'ref' && first !== 'cand') throw new Error('first must be ref|cand');
const meta = JSON.parse(readFileSync(`${prefix}.json`, 'utf8'));
const load = f => {const a = new Float64Array(readFileSync(f).buffer.slice(0)), r = [];for (let i = 0; i < a.length; i += 3) r.push([a[i], a[i + 1], a[i + 2]]);return r;};
const region = load(`${prefix}-region.f64`), outside = load(`${prefix}-outside.f64`);
const imp = (root, p) => import(pathToFileURL(`${root}/${p}`).href);
const arms = {};
for (const name of first === 'ref' ? ['ref', 'cand'] : ['cand', 'ref']) {
  const root = name === 'ref' ? refRoot : candRoot;
  const F = await imp(root, 'tests/terrain-climate-fixtures.mjs'), T = await imp(root, 'src/terrain.ts'), C = await imp(root, 'src/mountain-carving.ts');
  const world = F.waterWorlds().find(b => b.name === worldName);
  arms[name] = {ts: T.terrainSampler(world), stats: C.carvingBuildStats, version: T.TERRAIN_VERSION, wired: T.TERRAIN_MOUNTAINS_WIRED};
}
let sink = 0;
const pass = (ts, dirs) => {const t = performance.now();for (const d of dirs) sink += ts(d).groundHeightM;return (performance.now() - t) * 1e6 / dirs.length;};
const order = first === 'ref' ? ['ref', 'cand'] : ['cand', 'ref'];
const cold = {};
for (const n of order) {const b0 = arms[n].stats.count;cold[n] = {regionNs: pass(arms[n].ts, region), builds: arms[n].stats.count - b0};pass(arms[n].ts, outside);}
const b1 = {ref: arms.ref.stats.count, cand: arms.cand.stats.count};
const R = {ref: [], cand: []}, O = {ref: [], cand: []};
for (let r = 0; r < 5; r++) for (const n of r % 2 ? [...order].reverse() : order) R[n].push(pass(arms[n].ts, region));
for (let r = 0; r < 5; r++) for (const n of r % 2 ? [...order].reverse() : order) O[n].push(pass(arms[n].ts, outside));
const warmRebuilds = {ref: arms.ref.stats.count - b1.ref, cand: arms.cand.stats.count - b1.cand};
if (warmRebuilds.ref || warmRebuilds.cand) throw new Error(`not resident while warm: ${JSON.stringify(warmRebuilds)}`);
const med = a => [...a].sort((x, y) => x - y)[a.length >> 1], s = meta.share;
const Ain = med(R.ref), Bin = med(R.cand), Aout = med(O.ref), Bout = med(O.cand);
const rec = {label, world: worldName, first, share: s, refVersion: arms.ref.version, candVersion: arms.cand.version, refWired: arms.ref.wired, candWired: arms.cand.wired,
  refRegionNs: Ain, candRegionNs: Bin, refOutsideNs: Aout, candOutsideNs: Bout, inMassifOverhead: Bin / Ain - 1, outsideOverhead: Bout / Aout - 1,
  weighted: (s * Bin + (1 - s) * Bout) / (s * Ain + (1 - s) * Aout) - 1, cold, R, O, node: process.version, sink};
appendFileSync(out, JSON.stringify(rec) + '\n');
console.log(`${label} ${worldName} first=${first}: in ${(100 * rec.inMassifOverhead).toFixed(1)}% out ${(100 * rec.outsideOverhead).toFixed(1)}% WEIGHTED ${(100 * rec.weighted).toFixed(2)}%`);
