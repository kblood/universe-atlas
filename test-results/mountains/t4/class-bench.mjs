// Diagnostic: per-class sampler cost on the orbit-bake directions (Maithea), main vs wired level-0, separate module
// instances in one process, interleaved. Classes from the wired layout: ocean (a0 < 0 in the sampler: s.ocean), land
// with belt = 0, land with belt != 0.
//   node test-results/mountains/t4/class-bench.mjs <mainRoot> <wiredRoot> <world> [rounds=5]
import {pathToFileURL} from 'node:url';
const [mainRoot, wiredRoot, world, rounds = '5'] = process.argv.slice(2);
const imp = (r, p) => import(pathToFileURL(`${r}/${p}`).href);
const A = await imp(mainRoot, 'src/terrain.ts'), B = await imp(wiredRoot, 'src/terrain.ts'), L = await imp(wiredRoot, 'src/mountain-layout.ts');
const F = await imp(mainRoot, 'tests/terrain-climate-fixtures.mjs');
const body = F.waterWorlds().find(b => b.name === world);
const W = 1024, H = 512, dirs = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const u = (x + .5) / W, v = (y + .5) / H, th = u * Math.PI * 2, ph = v * Math.PI;
  dirs.push([-Math.cos(th) * Math.sin(ph), Math.cos(ph), Math.sin(th) * Math.sin(ph)]);
}
const sa = A.terrainSampler(body, undefined, undefined, false), sb = B.terrainSampler(body, undefined, undefined, false, 0, undefined, false, {lodLevel: 0});
const layout = L.orogenLayout(body), a0 = L.continentalA0(body);
const cls = {ocean: [], landOut: [], landBelt: []};
for (const d of dirs) {const s = sa(d);if (s.ocean) cls.ocean.push(d);else (layout.sample(d).belt !== 0 ? cls.landBelt : cls.landOut).push(d);}
const time = (f, ds) => {let acc = 0;const t = performance.now();for (const d of ds) acc += f(d).elevationM;return [performance.now() - t, acc];};
for (const k of Object.keys(cls)) {time(sa, cls[k]);time(sb, cls[k]);}
const res = {};
for (const k of Object.keys(cls)) {
  const ta = [], tb = [];
  for (let r = 0; r < +rounds; r++) {if (r & 1) {tb.push(time(sb, cls[k])[0]);ta.push(time(sa, cls[k])[0]);} else {ta.push(time(sa, cls[k])[0]);tb.push(time(sb, cls[k])[0]);}}
  const med = a => [...a].sort((x, y) => x - y)[a.length >> 1];
  res[k] = {n: cls[k].length, mainNs: 1e6 * med(ta) / cls[k].length, wiredNs: 1e6 * med(tb) / cls[k].length};
  res[k].growth = res[k].wiredNs / res[k].mainNs - 1;
}
console.log(world, JSON.stringify(res));
