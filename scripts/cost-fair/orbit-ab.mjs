// Copy of test-results/mountains/t4/orbit-bench.mjs (git-ignored), kept for scripts/cost-fair/run.sh. Cost plan T4 (2): orbit bake <= main +5% (LOD_BUDGETS.orbitBakeGrowth, contract section 6). The orbit bake is
// planetSurface(body, 1024, 192), the main.ts/worker.ts 'surface' job. Protocol (as docs/terrain-relief-v1.md
// section 7): interleaved A/B in one process, separate module instances per arm (each arm its own checkout), one
// warm bake per arm first, then `rounds` rounds alternating the order; fresh process per world; CPU-quiet test slot.
// Also checks that the two arms' bakes are byte-identical when `--expect-equal` is given (A/A or value-preserving).
//   node scripts/cost-fair/orbit-ab.mjs <world> <rootA> <rootB> [rounds=5] [out.json] [label] [--expect-equal]
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {writeFileSync, existsSync, readFileSync} from 'node:fs';
const args = process.argv.slice(2).filter(a => !a.startsWith('--')), expectEqual = process.argv.includes('--expect-equal');
const [worldName, rootA, rootB, roundsArg = '5', out, label = 'orbit'] = args;
const imp = (root, p) => import(pathToFileURL(`${root}/${p}`).href);
const F = await imp(rootA, 'tests/terrain-climate-fixtures.mjs');
const body = F.waterWorlds().find(b => b.name === worldName);
const A = await imp(rootA, 'src/terrain.ts'), B = await imp(rootB, 'src/terrain.ts');
const CB = await imp(rootB, 'src/mountain-carving.ts');
const digest = s => createHash('sha256').update(s.data).update(s.relief).update(s.roughness).update(new Uint8Array(s.elevations.buffer)).update(String(s.landFraction)).digest('hex');
const bake = M => {const t = performance.now(), s = M.planetSurface(body, 1024, 192);return {ms: performance.now() - t, s};};
const b0 = CB.carvingBuildStats.count;
const coldA = bake(A), coldB = bake(B);
const dA = digest(coldA.s), dB = digest(coldB.s);
if (expectEqual && dA !== dB) throw new Error(`${worldName}: arms differ ${dA} vs ${dB}`);
const ta = [], tb = [];
for (let r = 0; r < +roundsArg; r++) {
  if (r % 2 === 0) {ta.push(bake(A).ms);tb.push(bake(B).ms);} else {tb.push(bake(B).ms);ta.push(bake(A).ms);}
}
const blockSolves = CB.carvingBuildStats.count - b0;
const mean = a => a.reduce((s, x) => s + x, 0) / a.length, med = a => [...a].sort((x, y) => x - y)[a.length >> 1];
const paired = ta.map((a, i) => tb[i] / a - 1);
const rec = {world: worldName, label, rootA, rootB, rounds: +roundsArg, coldAms: coldA.ms, coldBms: coldB.ms, aMs: ta, bMs: tb,
  meanGrowth: mean(tb) / mean(ta) - 1, medianGrowth: med(tb) / med(ta) - 1, pairedMedianGrowth: med(paired), blockSolves,
  digestA: dA, digestB: dB, identical: dA === dB};
console.log(JSON.stringify(rec));
if (out) {const all = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {};all[`${label}/${worldName}`] = rec;writeFileSync(out, JSON.stringify(all, null, 1) + '\n');}
