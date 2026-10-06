// Attribution of the lod-consistency name/carriedName/forest pin failures of assembly step 1: field vs tile
// selection. Evaluates each field (main a3c2a26, this branch) on each selection (its own 12 stratified tiles,
// the other's 12 tiles), with the test's own crossPair. INFO only: no pin or selection is changed.
//   node lod-attribution.mjs <mainRoot> <branchRoot>
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const [MAIN, BR] = process.argv.slice(2);
const load = async root => { const imp = p => import(pathToFileURL(`${root}/${p}`).href);
  const R = await imp('scripts/lod-consistency-report.mjs'); const m = await R.loadCheckout(root); return {R, m}; };
const A = await load(MAIN), B = await load(BR);
const keys = ['rgbP99', 'snow', 'forest', 'name', 'carriedName'];
const out = {selections: {}, cells: []};
for (const name of ['Maithea', 'Lethuris']) {
  const fields = {main: A, branch: B}, sel = {};
  for (const [k, F] of Object.entries(fields)) { const body = F.m.waterWorlds().find(b => b.name === name), ts = F.m.terrainSampler(body), cls = F.m.biomeClassifier(body);
    sel[k] = F.R.stratifiedEdgeDirections(ts, cls); }
  out.selections[name] = Object.fromEntries(Object.keys(sel.main).map(kind => [kind, sel.main[kind].map((d, i) => JSON.stringify(d) === JSON.stringify(sel.branch[kind][i]))]));
  for (const [fk, F] of Object.entries(fields)) for (const sk of ['main', 'branch']) {
    const body = F.m.waterWorlds().find(b => b.name === name), ts = F.m.terrainSampler(body), cls = F.m.biomeClassifier(body), dirs = Object.values(sel[sk]).flat();
    for (const L of [6, 8]) { const acc = F.R.newCrossAcc(true); for (const d of dirs) F.R.crossPair(F.m, body, ts, cls, d, L, acc); const s = F.R.summariseCross(acc);
      const row = {world: name, L, field: fk, selection: sk, ...Object.fromEntries(keys.map(k => [k, +s[k].toFixed(3)]))}; out.cells.push(row); console.log(JSON.stringify(row)); }
  }
  // per-kind breakdown of the name row on the branch field, branch selection
  { const body = B.m.waterWorlds().find(b => b.name === name), ts = B.m.terrainSampler(body), cls = B.m.biomeClassifier(body);
    for (const [kind, dirs] of Object.entries(sel.branch)) for (const L of [6, 8]) { const acc = B.R.newCrossAcc(false); for (const d of dirs) B.R.crossPair(B.m, body, ts, cls, d, L, acc); const s = B.R.summariseCross(acc);
      const row = {world: name, L, field: 'branch', selection: 'branch', kind, land: acc.land, name: +s.name.toFixed(3), carriedName: +s.carriedName.toFixed(3), forest: +s.forest.toFixed(3)}; out.cells.push(row); console.log(JSON.stringify(row)); } }
  { const body = A.m.waterWorlds().find(b => b.name === name), ts = A.m.terrainSampler(body), cls = A.m.biomeClassifier(body);
    for (const [kind, dirs] of Object.entries(sel.main)) for (const L of [6, 8]) { const acc = A.R.newCrossAcc(false); for (const d of dirs) A.R.crossPair(A.m, body, ts, cls, d, L, acc); const s = A.R.summariseCross(acc);
      const row = {world: name, L, field: 'main', selection: 'main', kind, land: acc.land, name: +s.name.toFixed(3), carriedName: +s.carriedName.toFixed(3), forest: +s.forest.toFixed(3)}; out.cells.push(row); console.log(JSON.stringify(row)); } }
}
console.log('selection identical per tile (main vs branch):', JSON.stringify(out.selections));
writeFileSync(new URL('./lod-attribution.json', import.meta.url), JSON.stringify(out, null, 1));
