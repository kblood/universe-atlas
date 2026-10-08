// climate-m1 decision-5 gate 1: every ClimateSample field Object.is-identical between the fixed
// 3ab2eab tree (A) and the hand-inlined tree (B), on the pinned sets:
//   - 200k Fibonacci directions x the alloc-diag height pattern ((i*7919)%9000)-500 on Maithea,
//     Selawyn, Raiva, Lethuris (tests/landing-site.test.mjs FIXTURE) and the Earth reference;
//   - the first 50 bodies of the climate-agreement corpus (temperate planets of the 2000 systems from
//     sector x=266) x 8k Fibonacci directions, at the alloc-diag heights and at the
//     surface-climate.test digest heights ((i*7919)%12000)-1000;
//   - extra branch coverage (not part of the pinned set): Earth at obliquity 0 (half=0 branch) and
//     70 deg, a dry (water 0) and a frozen-style forcing, and the first 50 NON-temperate planets
//     (habitat false, frozen and dry bodies).
// node identity.mjs <dirA> <dirB> <out.json>
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
const [dirA, dirB, outPath] = process.argv.slice(2);
const u = (d, f) => pathToFileURL(`${d}/src/${f}`).href;
const A = await import(u(dirA, 'surface-climate.ts')), B = await import(u(dirB, 'surface-climate.ts'));
const {galaxies, refByAddress, sector, system} = await import(u(dirB, 'catalog.ts'));
const D = Math.PI / 180;
const EARTH = {anchorTempK: 288, obliquityRad: 23.44 * D, water: .7, surfaceGravityMS2: 9.81, moistureSeed: 1};
const g = galaxies('LETHRA-001')[0];
const FIXTURE = {Maithea: ['G001/C2128,0,1/0', 1], Selawyn: ['G001/C2142,3,4/0', 0], Raiva: ['G001/C2143,4,3/0', 1], Lethuris: ['G001/C2142,6,1/1', 1]};
const FIELDS = Object.keys(A.createClimateSample());
const fib = (i, n) => { const y = 1 - 2 * (i + .5) / n, p = i * 2.399963229728653, r = Math.sqrt(1 - y * y); return [Math.cos(p) * r, y, Math.sin(p) * r]; };
const hDiag = i => ((i * 7919) % 9000) - 500, hDigest = i => ((i * 7919) % 12000) - 1000;
const res = {dirA, dirB, node: process.version, fields: FIELDS, sets: {}, totalSamples: 0, totalComparisons: 0, differences: 0, firstDifferences: []};
// Branch reach of the inlined code, from B's outputs (all sets): proves the rare branches were exercised.
const reach = {halfZero: 0, pdd0Zero: 0, growZero: 0, growOne: 0, growInterior: 0, snowZero: 0, snowOne: 0, snowInterior: 0, treelineZero: 0, treelineOne: 0, treelineInterior: 0, aridityZero: 0, aridityOne: 0, aridityInterior: 0, heatRampInterior: 0, forestPositive: 0, forestZero: 0};
function tally(o) {
  const b3 = (v, z, one, mid) => { if (v === 0) reach[z]++; else if (v === 1) reach[one]++; else reach[mid]++; };
  if (o.seasonalHalfRangeK === 0) reach.halfZero++;
  if (o.pdd === 0) reach.pdd0Zero++;
  b3(o.growingSeason01, 'growZero', 'growOne', 'growInterior'); b3(o.snowFraction, 'snowZero', 'snowOne', 'snowInterior');
  b3(o.treeline01, 'treelineZero', 'treelineOne', 'treelineInterior'); b3(o.aridity01, 'aridityZero', 'aridityOne', 'aridityInterior');
  if (o.warmestMonthK > 305 && o.warmestMonthK < 316) reach.heatRampInterior++;
  if (o.forestSuitability01 > 0) reach.forestPositive++; else reach.forestZero++;
}
function compare(label, mkA, mkB, n, heightFns) {
  const sa = mkA(), sb = mkB(), oa = A.createClimateSample(), ob = B.createClimateSample();
  const h = createHash('sha256'); const buf = new Float64Array(FIELDS.length);
  let samples = 0, diffs = 0;
  for (const hf of heightFns) for (let i = 0; i < n; i++) {
    const d = fib(i, n), hm = hf(i);
    sa(d, hm, oa); sb(d, hm, ob); samples++;
    for (let k = 0; k < FIELDS.length; k++) {
      const f = FIELDS[k], va = oa[f], vb = ob[f]; buf[k] = va;
      if (!Object.is(va, vb)) { diffs++; if (res.firstDifferences.length < 20) res.firstDifferences.push({label, i, heightM: hm, field: f, a: va, b: vb}); }
    }
    h.update(Buffer.from(buf.buffer)); tally(ob);
  }
  res.sets[label] = {samples, comparisons: samples * FIELDS.length, differences: diffs, sha256OfA: h.digest('hex')};
  res.totalSamples += samples; res.totalComparisons += samples * FIELDS.length; res.differences += diffs;
}
// Pinned set 1: the four named worlds and Earth, 200k x alloc-diag heights.
for (const [name, [addr, idx]] of Object.entries(FIXTURE)) {
  const body = system(refByAddress(g, addr)).planets[idx];
  compare(`fixture:${name}`, () => A.surfaceClimate(A.climateForcingFor(body)), () => B.surfaceClimate(B.climateForcingFor(body)), 200000, [hDiag]);
}
compare('earth-reference', () => A.surfaceClimate(A.climateForcingFromParams(EARTH)), () => B.surfaceClimate(B.climateForcingFromParams(EARTH)), 200000, [hDiag]);
// Pinned set 2: first 50 corpus bodies x 8k directions.
const corpus = [], other = []; let systems = 0;
for (let sx = 266; systems < 2000; sx++) for (const ref of sector(g, [sx, 0, 0]).refs) {
  if (systems >= 2000) break; systems++;
  for (const b of system(ref).planets) (B.temperateHabitat(b) ? corpus : other).push(b);
}
for (const b of corpus.slice(0, 50)) compare(`corpus:${b.id}`, () => A.surfaceClimate(A.climateForcingFor(b)), () => B.surfaceClimate(B.climateForcingFor(b)), 8000, [hDiag, hDigest]);
const pinned = {samples: res.totalSamples, comparisons: res.totalComparisons, differences: res.differences};
// Extra branch coverage.
const extras = {'earth-obliquity-0': {...EARTH, obliquityRad: 0}, 'earth-obliquity-70': {...EARTH, obliquityRad: 70 * D}, 'earth-water-0': {...EARTH, water: 0}, 'earth-cold-230K': {...EARTH, anchorTempK: 230}, 'earth-hot-330K': {...EARTH, anchorTempK: 330}};
for (const [k, p] of Object.entries(extras)) compare(`extra:${k}`, () => A.surfaceClimate(A.climateForcingFromParams(p)), () => B.surfaceClimate(B.climateForcingFromParams(p)), 20000, [hDiag, hDigest]);
for (const b of other.slice(0, 50)) compare(`extra-nontemperate:${b.id}`, () => A.surfaceClimate(A.climateForcingFor(b)), () => B.surfaceClimate(B.climateForcingFor(b)), 4000, [hDiag, hDigest]);
res.pinned = pinned; res.corpusSize = corpus.length; res.nonTemperateCount = other.length;
res.branchReach = reach;
res.pass = res.differences === 0;
writeFileSync(outPath, JSON.stringify(res, null, 1));
console.log(JSON.stringify({pass: res.pass, branchReach: reach, pinned, totalSamples: res.totalSamples, totalComparisons: res.totalComparisons, differences: res.differences, sets: Object.keys(res.sets).length, firstDifferences: res.firstDifferences.slice(0, 3)}));
