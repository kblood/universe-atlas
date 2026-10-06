// C1 point sets, computed ONCE per world in a separate process from a main checkout, so that no measured arm's
// module instance is touched by point selection. Same selection as scripts/mountain-assembly-cost.mjs (C1):
// share = in-massif land share of 20000 Fibonacci directions; region = 8 in-massif sites x 385^2 (125 m);
// outside = the Fibonacci directions outside every massif.
//   node scripts/cost-fair/c1-points.mjs <world> <mainRoot> <outPrefix>   -> <outPrefix>.json + <outPrefix>-region.f64 + <outPrefix>-outside.f64
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [worldName, root, outPrefix] = process.argv.slice(2);
const imp = p => import(pathToFileURL(`${root}/${p}`).href);
const F = await imp('tests/terrain-climate-fixtures.mjs');
const {terrainSampler} = await imp('src/terrain.ts');
const {orogenLayout} = await imp('src/mountain-layout.ts');
const {massifHalfWidthM, MASSIF_ENVELOPE} = await imp('src/mountain-envelope.ts');
const world = F.waterWorlds().find(b => b.name === worldName);
const unit = v => {const l = Math.hypot(...v);return v.map(x => x / l);};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const R = world.radiusM, layout = orogenLayout(world), mainTs = terrainSampler(world);
const inMassif = o => o.belt !== 0 && o.halfWidthM >= MASSIF_ENVELOPE.MIN_HALF_WIDTH_M && Math.abs(o.axisDistanceM) < massifHalfWidthM(o.halfWidthM);
const fibs = Array.from({length: 20000}, (_, i) => F.fib(i, 20000));
let inside = 0;
for (const d of fibs) if (inMassif(layout.sample(d)) && mainTs(d).groundHeightM > 0) inside++;
const share = inside / fibs.length;
const sites = [];
for (let i = 0; i < 20000 && sites.length < 8; i++) {
  const d = fibs[i], o = layout.sample(d);
  if (o.belt < .5 || o.halfWidthM < 32000 || Math.abs(o.axisDistanceM) > 3000 || mainTs(d).groundHeightM <= 0) continue;
  if (sites.some(s => Math.acos(Math.min(1, s.d[0] * d[0] + s.d[1] * d[1] + s.d[2] * d[2])) * R < 300000)) continue;
  sites.push({d, axis: [...o.axis]});
}
const region = new Float64Array(sites.length * 385 * 385 * 3);
let k = 0;
for (const s of sites) {
  const across = unit(cross(s.d, s.axis));
  for (let p = 0; p < 385 * 385; p++) {
    const x = (p % 385 - 192) * 125, y = (Math.floor(p / 385) - 192) * 125;
    const v = unit(s.d.map((c, j) => c + (x * s.axis[j] + y * across[j]) / R));
    region[k++] = v[0]; region[k++] = v[1]; region[k++] = v[2];
  }
}
const outsideDirs = fibs.filter(d => !inMassif(layout.sample(d)));
const outside = new Float64Array(outsideDirs.length * 3);
outsideDirs.forEach((d, i) => {outside[3 * i] = d[0]; outside[3 * i + 1] = d[1]; outside[3 * i + 2] = d[2];});
writeFileSync(`${outPrefix}-region.f64`, region);
writeFileSync(`${outPrefix}-outside.f64`, outside);
writeFileSync(`${outPrefix}.json`, JSON.stringify({world: worldName, root, share, sites: sites.length, region: region.length / 3, outside: outsideDirs.length}) + '\n');
console.log(JSON.stringify({world: worldName, share, sites: sites.length, region: region.length / 3, outside: outsideDirs.length}));
