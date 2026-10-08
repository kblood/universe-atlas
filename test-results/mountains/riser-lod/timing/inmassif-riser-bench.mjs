// Riser LOD (INFO row): test-results/mountains/carving-c1/inmassif-bench.mjs with the rock path given a riser width,
// i.e. the filtered-level rock path. Same 4096 inputs (Raiva tau, belt 1), 9 rounds of 1e6 calls, median of the last 7.
// Widths: rockRiserWidthM(Raiva radius, L) at the first and last filtered level, read from the BRANCH lod-ladder. On a
// root without the riser parameter (main 7419733) the extra argument is ignored, so main measures its v1 rock path.
//   node test-results/mountains/riser-lod/timing/inmassif-riser-bench.mjs <root>
import {pathToFileURL, fileURLToPath} from 'node:url';
const root = process.argv[2], imp = p => import(pathToFileURL(`${root}/${p}`).href);
const branchRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const {mountainRidgeTermM} = await imp('src/mountain-assembly.ts');
const L = await import(pathToFileURL(`${branchRoot}src/lod-ladder.ts`).href);
const {waterWorlds} = await import(pathToFileURL(`${branchRoot}tests/terrain-climate-fixtures.mjs`).href);
const R = waterWorlds().find(b => b.name === 'Raiva').radiusM, rockL = L.rockDetailFromLevel(R), sharpL = L.riserSharpFromLevel(R);
const widths = {[`L${rockL}`]: L.rockRiserWidthM(R, rockL), [`L${sharpL - 1}`]: L.rockRiserWidthM(R, sharpL - 1)};
const tau = 0.456, w = 90090, seeds = [730201];
const inputs = Array.from({length: 4096}, (_, i) => ({x: 1000 + (i * 7919) % 23000 + ((i * 37) % 100) / 100, y: ((i * 104729) % 60000) - 30000 + ((i * 13) % 10) / 10}));
const q = (a, p) => {const s = [...a].sort((x, y) => x - y);return s[Math.floor(p * (s.length - 1))];};
let sink = 0;
const bench = width => {const rounds = [];
  for (let r = -2; r < 7; r++) {const t = process.hrtime.bigint();
    for (let i = 0; i < 1000000; i++) {const a = inputs[i & 4095];
      sink += mountainRidgeTermM(0, {belt: 1, axisDistanceM: a.y, halfWidthM: w, beltIndex: 0, alongM: a.x}, 1000, 1, tau, seeds, true, true, width);}
    if (r >= 0) rounds.push(Number(process.hrtime.bigint() - t) / 1e6);}
  return {medianNs: +q(rounds, .5).toFixed(1), minNs: +Math.min(...rounds).toFixed(1)};};
for (const a of inputs) sink += mountainRidgeTermM(0, {belt: 1, axisDistanceM: a.y, halfWidthM: w, beltIndex: 0, alongM: a.x}, 1000, 1, tau, seeds, true, true, 0);
const out = {root, widths, rows: Object.fromEntries(Object.entries(widths).map(([k, v]) => [k, bench(v)])), sink: sink !== 0};
console.log('INMASSIF_RISER ' + JSON.stringify(out));
