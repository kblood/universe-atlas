// Cost plan T3 follow-up (decisions addendum 2026-10-06): per-level tile build mean, arms interleaved per round in ONE
// process, rotating order. Arms: main (read-only import of main's checkout), off (this branch, mountains off), on
// (this branch, mountains on). Same 12 land tiles as contract-build-bench.mjs. The "main,on" pair is the contract
// section 6 comparison (no off arm, so the branch module only ever runs mountains-on samplers, as when wired);
// adding the off arm changes V8's code for the branch core and is a diagnostic only.
//   node test-results/mountains/t3/tile-bench-arms.mjs <world> <mainRoot> [levels=0,1,2,3,4,5] [arms=main,on] [rounds=5]
import {pathToFileURL, fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const [world = 'Maithea', mainRoot = 'C:/LLM/IWSDK/universe-atlas', levelsArg = '0,1,2,3,4,5', armsArg = 'main,on', roundsArg = '5'] = process.argv.slice(2);
const T = await import(pathToFileURL(root + 'src/planet-tiles.ts').href);
const MT = await import(pathToFileURL(mainRoot + '/src/planet-tiles.ts').href);
const MS = await import(pathToFileURL(mainRoot + '/src/terrain.ts').href);
const {waterWorlds, fib} = await import(pathToFileURL(root + 'tests/terrain-climate-fixtures.mjs').href);
const levels = levelsArg.split(',').map(Number), arms = armsArg.split(','), rounds = +roundsArg;
const body = waterWorlds().find(b => b.name === world);
const ts = MS.terrainSampler(body), dirs = [];
for (let i = 0; dirs.length < 12 && i < 4000; i++) {const d = fib(i * 37 % 4000, 4000); if (ts(d).groundHeightM > 0) dirs.push(d);}
const build = {main: t => MT.buildTile(body, t), off: t => T.buildTile(body, t), on: t => T.buildTile(body, t, 1, 0, {mountains: true})};
let sink = 0;
for (const a of arms) sink += build[a]({face: 0, level: 4, x: 3, y: 5}).surfaceHeight[0];
for (const L of levels) {
  const tiles = [...new Map(dirs.map(d => {const t = T.directionTile(d, L); return [T.tileKey(t), t];})).values()];
  const ms = Object.fromEntries(arms.map(a => [a, 0]));
  for (let r = 0; r < rounds; r++) for (let k = 0; k < arms.length; k++) {
    const a = arms[(k + r) % arms.length], t0 = performance.now();
    for (const t of tiles) sink += build[a](t).surfaceHeight[0];
    ms[a] += performance.now() - t0;
  }
  const n = rounds * tiles.length, row = {level: L, tiles: tiles.length, ...Object.fromEntries(arms.map(a => [a, +(ms[a] / n).toFixed(2)]))};
  if (row.main) for (const a of arms) if (a !== 'main') row[a + '/main'] = +(row[a] / row.main - 1).toFixed(3);
  if (row.off && row.on) row['on/off'] = +(row.on / row.off - 1).toFixed(3);
  console.log(world, JSON.stringify(row));
}
if (!Number.isFinite(sink)) console.log('non-finite sink');
