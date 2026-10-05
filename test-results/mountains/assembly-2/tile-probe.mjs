// Per-tile probe on the FROZEN main selection: belt coverage of each L6/L8 parent tile and the per-tile
// class rows (name, carriedName, forest, snow) on main vs this branch. INFO only.
//   node tile-probe.mjs <mainRoot> <branchRoot> [levels]
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const [MAIN, BR, LV] = process.argv.slice(2);
const levels = (LV || '6,8').split(',').map(Number);
const load = async root => { const imp = p => import(pathToFileURL(`${root}/${p}`).href);
  const R = await imp('scripts/lod-consistency-report.mjs'); const m = await R.loadCheckout(root); const lay = await imp('src/mountain-layout.ts'); return {R, m, lay}; };
const A = await load(MAIN), B = await load(BR);
const out = [];
for (const name of ['Maithea', 'Lethuris']) {
  const bodyA = A.m.waterWorlds().find(b => b.name === name), tsA = A.m.terrainSampler(bodyA), clsA = A.m.biomeClassifier(bodyA);
  const sel = A.R.stratifiedEdgeDirections(tsA, clsA);
  const bodyB = B.m.waterWorlds().find(b => b.name === name), tsB = B.m.terrainSampler(bodyB), clsB = B.m.biomeClassifier(bodyB);
  const lay = B.lay.orogenLayout(bodyB);
  for (const [kind, dirs] of Object.entries(sel)) dirs.forEach((d, i) => {
    for (const L of levels) {
      const n = 32, P = B.m.directionTile(d, L); let cover = 0, maxBelt = 0, dhMax = 0;
      for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) { const q = B.m.tileDirection(P, x / n, y / n), o = lay.sample(q); if (o.belt > 0) cover++; maxBelt = Math.max(maxBelt, o.belt);
        dhMax = Math.max(dhMax, Math.abs(tsB(q).groundHeightM - tsA(q).groundHeightM)); }
      const row = {world: name, kind, i, L, beltCover: +(cover / ((n + 1) ** 2)).toFixed(3), maxBelt: +maxBelt.toFixed(3), dhMax: +dhMax.toFixed(1)};
      for (const [k, F, body, ts, cls] of [['main', A, bodyA, tsA, clsA], ['branch', B, bodyB, tsB, clsB]]) {
        const acc = F.R.newCrossAcc(false); F.R.crossPair(F.m, body, ts, cls, d, L, acc); const s = F.R.summariseCross(acc);
        row[k] = {land: acc.land, name: acc.name, carried: acc.carried, forest: acc.forest, snow: acc.snow};
      }
      out.push(row); console.log(JSON.stringify(row));
    }
  });
}
writeFileSync(new URL('./tile-probe.json', import.meta.url), JSON.stringify(out, null, 1));
