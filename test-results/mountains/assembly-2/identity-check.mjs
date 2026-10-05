// Assembly step 1, item 0 (docs/mountains-design-2026-10-04.md section 3): terrainSampler output
// (elevationM, groundHeightM, ocean, color) on a 4096-direction Fibonacci set per water world, this branch
// against main a3c2a26 (read-only checkout). Reuses the assembled check's identity-check.mjs logic, plus a
// grain-reverted copy of this branch (TERRAIN_LOCAL_GRAIN set back to .88/.24 in a scratch copy) so the
// colour difference outside belts is attributed to the grain alone.
//   node identity-check.mjs <mainRoot> <revertedRoot> [--n 4096]
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const CUR = 'C:/LLM/IWSDK/universe-atlas-wt/asm1';
const [refRoot, revRoot] = process.argv.slice(2);
const N = Number(process.argv[process.argv.indexOf('--n') + 1]) || 4096;
const imp = (root, p) => import(pathToFileURL(`${root}/${p}`).href);
const cur = await imp(CUR, 'src/terrain.ts'), ref = await imp(refRoot, 'src/terrain.ts'), rev = await imp(revRoot, 'src/terrain.ts');
const {galaxies, refByAddress, system} = await imp(CUR, 'src/catalog.ts');
const {orogenLayout} = await imp(CUR, 'src/mountain-layout.ts');
const {MASSIF_ENVELOPE} = await imp(CUR, 'src/mountain-envelope.ts');
const g0 = galaxies('LETHRA-001')[0];
const FIXTURE = {Maithea: ['G001/C2128,0,1/0', 1], Selawyn: ['G001/C2142,3,4/0', 0], Raiva: ['G001/C2143,4,3/0', 1], Lethuris: ['G001/C2142,6,1/1', 1]};
const fib = (i, n) => { const y = 1 - 2 * (i + .5) / n, phi = i * 2.399963229728653, r = Math.sqrt(1 - y * y); return [Math.cos(phi) * r, y, Math.sin(phi) * r]; };
const eqColor = (a, b) => { if (a === b) return true; if (!a || !b || a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false; return true; };
const out = {refRoot, revRoot, n: N, versions: {branch: cur.TERRAIN_VERSION, main: ref.TERRAIN_VERSION, reverted: rev.TERRAIN_VERSION, grain: cur.TERRAIN_LOCAL_GRAIN}, worlds: {}};
let hardDiffs = 0;
for (const [name, [addr, i]] of Object.entries(FIXTURE)) {
  const body = system(refByAddress(g0, addr)).planets[i];
  const tsC = cur.terrainSampler(body), tsR = ref.terrainSampler(body), tsV = rev.terrainSampler(body), lay = orogenLayout(body);
  const row = {beltPositive: 0, outside: 0, inside: 0, outsideHeightOceanDiffs: 0, outsideColourDiffsVsMain: 0, outsideRevertedDiffsVsMain: 0,
    insideHeightChanged: 0, insideRaised: 0, insideLowered: 0, insideMaxRaiseM: 0, insideMaxLowerM: 0, insideOceanFlips: 0, insideRevertedColourSameWhereHeightSame: 0, firstDiff: null};
  for (let k = 0; k < N; k++) {
    const d = fib(k, N), o = lay.sample(d), a = tsC(d), b = tsR(d), v = tsV(d);
    if (o.belt > 0) row.beltPositive++;
    const outside = o.belt === 0 || o.halfWidthM < MASSIF_ENVELOPE.MIN_HALF_WIDTH_M;
    const hSame = Object.is(a.elevationM, b.elevationM) && Object.is(a.groundHeightM, b.groundHeightM) && a.ocean === b.ocean;
    if (outside) {
      row.outside++;
      if (!hSame) { row.outsideHeightOceanDiffs++; row.firstDiff ??= {k, a: [a.elevationM, a.groundHeightM, a.ocean], b: [b.elevationM, b.groundHeightM, b.ocean]}; }
      if (!eqColor(a.color, b.color)) row.outsideColourDiffsVsMain++;
      if (!eqColor(v.color, b.color) || !Object.is(v.groundHeightM, b.groundHeightM) || v.ocean !== b.ocean) row.outsideRevertedDiffsVsMain++;
    } else {
      row.inside++;
      const dh = a.groundHeightM - b.groundHeightM;
      if (dh !== 0) { row.insideHeightChanged++; if (dh > 0) { row.insideRaised++; row.insideMaxRaiseM = Math.max(row.insideMaxRaiseM, dh); } else { row.insideLowered++; row.insideMaxLowerM = Math.max(row.insideMaxLowerM, -dh); } }
      if (a.ocean !== b.ocean) row.insideOceanFlips++;
      if (hSame && eqColor(v.color, b.color)) row.insideRevertedColourSameWhereHeightSame++;
    }
  }
  hardDiffs += row.outsideHeightOceanDiffs + row.outsideRevertedDiffsVsMain + row.insideOceanFlips;
  out.worlds[name] = row;
  console.log(name, JSON.stringify(row));
}
out.hardDiffs = hardDiffs;
writeFileSync(new URL('./identity.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(`versions ${JSON.stringify(out.versions)}; hard diffs (outside heights/ocean, outside grain-reverted colour, inside ocean flips) ${hardDiffs}`);
process.exit(hardDiffs ? 1 : 0);
