// Carving C1: warm in-massif cost of the assembled ridge term (mountainRidgeTermM, carve = true), rock off and on,
// on one checkout. 4096 fixed in-massif inputs (Raiva tau, belt 1, |axis| < 30 km, along within one 25.6 km block,
// so the CACHE holds every block after the warm-up); 9 rounds of 1e6 calls, median of the last 7 (ns per sample).
//   node test-results/mountains/carving-c1/inmassif-bench.mjs <root>
import {pathToFileURL} from 'node:url';
const root = process.argv[2], imp = p => import(pathToFileURL(`${root}/${p}`).href);
const {mountainRidgeTermM, MOUNTAIN_ASSEMBLY_VERSION} = await imp('src/mountain-assembly.ts');
const {MOUNTAIN_CARVING_VERSION} = await imp('src/mountain-carving.ts');
const tau = 0.456, w = 90090, seeds = [730201];
const inputs = Array.from({length: 4096}, (_, i) => ({x: 1000 + (i * 7919) % 23000 + ((i * 37) % 100) / 100, y: ((i * 104729) % 60000) - 30000 + ((i * 13) % 10) / 10}));
const q = (a, p) => {const s = [...a].sort((x, y) => x - y);return s[Math.floor(p * (s.length - 1))];};
let sink = 0;
const bench = rock => {const rounds = [];
  for (let r = -2; r < 7; r++) {const t = process.hrtime.bigint();
    for (let i = 0; i < 1000000; i++) {const a = inputs[i & 4095];
      sink += mountainRidgeTermM(0, {belt: 1, axisDistanceM: a.y, halfWidthM: w, beltIndex: 0, alongM: a.x}, 1000, 1, tau, seeds, true, rock);}
    if (r >= 0) rounds.push(Number(process.hrtime.bigint() - t) / 1e6);}
  return {medianNs: +q(rounds, .5).toFixed(1), minNs: +Math.min(...rounds).toFixed(1)};};
for (const a of inputs) sink += mountainRidgeTermM(0, {belt: 1, axisDistanceM: a.y, halfWidthM: w, beltIndex: 0, alongM: a.x}, 1000, 1, tau, seeds, true, true);
const out = {root, MOUNTAIN_CARVING_VERSION, MOUNTAIN_ASSEMBLY_VERSION, carveNoRock: bench(false), carveRock: bench(true), sink: sink !== 0};
console.log('INMASSIF_BENCH ' + JSON.stringify(out));
