// T6: surface survey sites on main (unwired) vs the wired tree, for the four water worlds and the golden catalogue
// bodies used by the terrain tests. Any moved site means SURVEY_VERSION must move.
//   node survey-diff.mjs <mainRoot> <wiredRoot> <out.json>
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const [mainRoot, wiredRoot, out] = process.argv.slice(2), imp = (r, p) => import(pathToFileURL(`${r}/${p}`).href);
const A = await imp(mainRoot, 'src/surface-survey.ts'), B = await imp(wiredRoot, 'src/surface-survey.ts'), F = await imp(wiredRoot, 'tests/terrain-climate-fixtures.mjs');
const bodies = [...F.waterWorlds(), ...F.goldenTerrainBodies()];
const rows = [];let moved = 0;
for (const body of bodies) {
  const a = A.surfaceSurvey(body), b = B.surfaceSurvey(body), ja = JSON.stringify(a), jb = JSON.stringify(b);
  const changes = [];
  for (const s of b) {const o = a.find(x => x.category === s.category);if (!o || JSON.stringify(o) !== JSON.stringify(s)) changes.push({category: s.category, main: o ? {id: o.id, elevationM: +o.elevationM.toFixed(1), biome: o.biome} : null, wired: {id: s.id, elevationM: +s.elevationM.toFixed(1), biome: s.biome}});}
  for (const o of a) if (!b.find(x => x.category === o.category)) changes.push({category: o.category, main: {id: o.id}, wired: null});
  if (ja !== jb) moved++;
  rows.push({body: body.name ?? body.id, same: ja === jb, changes});
}
const summary = {mainVersion: A.SURVEY_VERSION, wiredVersion: B.SURVEY_VERSION, bodies: bodies.length, bodiesChanged: moved};
console.log(JSON.stringify(summary));for (const r of rows) if (!r.same) console.log(r.body, JSON.stringify(r.changes));
writeFileSync(out, JSON.stringify({summary, rows}, null, 1) + '\n');
