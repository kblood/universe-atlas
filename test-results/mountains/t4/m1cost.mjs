import {pathToFileURL} from 'node:url';
const [root, world] = process.argv.slice(2);
const imp = p => import(pathToFileURL(`${root}/${p}`).href);
const L = await imp('src/mountain-layout.ts'), A = await imp('src/mountain-assembly.ts'), F = await imp('tests/terrain-climate-fixtures.mjs');
const body = F.waterWorlds().find(b => b.name === world), layout = L.orogenLayout(body), a0f = L.continentalA0(body);
const W = 1024, H = 512, dirs = [], a0s = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {const u = (x + .5) / W, v = (y + .5) / H, th = u * Math.PI * 2, ph = v * Math.PI;const d = [-Math.cos(th) * Math.sin(ph), Math.cos(ph), Math.sin(th) * Math.sin(ph)];const a = a0f(d);if (a >= 0) {dirs.push(d);a0s.push(a);}}
const out = {belt: 0, axis: [0, 0, 0], axisDistanceM: 0, halfWidthM: 0, beltIndex: -1, alongM: 0};
let acc = 0;
for (let r = 0; r < 6; r++) {const t = performance.now();for (let i = 0; i < dirs.length; i++) acc += A.massifBeltSample(layout, dirs[i], a0s[i], out).belt;console.log('land', dirs.length, 'ns/call', (1e6 * (performance.now() - t) / dirs.length).toFixed(1));}
