// Fair-protocol analysis (argv[2] = the scripts/cost-fair/run.sh OUT dir; decisions addendum (6), Q-A): medians over processes, distribution-free 95% CI of the median
// (order statistics; n = 30 -> ranks 10 and 21), A/A bias demonstrated only if the A/A CI excludes 0.
import {readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
if (!process.argv[2]) throw new Error('usage: node scripts/cost-fair/analyze.mjs <outDir>');
const O = pathToFileURL(process.argv[2].replace(/[\\/]?$/, '/'));
const lines = f => readFileSync(new URL(f, O), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const c1 = lines('c1.jsonl'), orbit = lines('orbit.jsonl');
const sorted = a => [...a].sort((x, y) => x - y);
const median = a => {const s = sorted(a), n = s.length;return n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2;};
// Binomial order-statistic CI for the median: largest k with P(Bin(n,.5) < k) <= .025.
const ciRanks = n => {let c = 0, k = 0;const p = i => {let r = 1;for (let j = 0; j < i; j++) r = r * (n - j) / (j + 1);return r / 2 ** n;};
  while (c + p(k) <= .025) {c += p(k);k++;}return [k, n - k + 1];};
const ci = a => {const s = sorted(a), [lo, hi] = ciRanks(s.length);return [s[lo - 1], s[hi - 1]];};
const pct = x => (100 * x).toFixed(2);
const out = [];const verdict = {};
const orbitGrowth = r => {const [, first] = r.label.split('|first=');const med = a => sorted(a)[a.length >> 1];
  // first=ref: rootA = ref (main1), rootB = cand; first=cand: rootA = cand, rootB = ref.
  const ref = first === 'ref' ? r.aMs : r.bMs, cand = first === 'ref' ? r.bMs : r.aMs;return med(cand) / med(ref) - 1;};
for (const w of ['Maithea', 'Selawyn', 'Raiva', 'Lethuris']) {
  const rows = {};
  for (const kind of ['AB', 'AA']) {
    const c = c1.filter(r => r.world === w && r.label === kind), o = orbit.filter(r => r.world === w && r.label.startsWith(kind + '|'));
    rows[kind] = {
      n: c.length, nOrbit: o.length,
      weighted: c.map(r => r.weighted), outside: c.map(r => r.outsideOverhead), inMassif: c.map(r => r.inMassifOverhead),
      orbit: o.map(orbitGrowth),
      byFirst: Object.fromEntries(['ref', 'cand'].map(f => [f, median(c.filter(r => r.first === f).map(r => r.weighted))])),
      orbitByFirst: Object.fromEntries(['ref', 'cand'].map(f => [f, median(o.filter(r => r.label.endsWith('first=' + f)).map(orbitGrowth))])),
    };
  }
  const judge = (metric, budget) => {
    const ab = rows.AB[metric], aa = rows.AA[metric], mAB = median(ab), mAA = median(aa), ciAA = ci(aa), ciAB = ci(ab);
    const demonstrated = ciAA[0] > 0 || ciAA[1] < 0, judged = demonstrated ? mAB - mAA : mAB;
    const r = {metric, n: ab.length, nAA: aa.length, medianAB: mAB, ciAB, medianAA: mAA, ciAA, aaBiasDemonstrated: demonstrated, judged, budget, met: judged <= budget};
    out.push(`${w} ${metric}: A/B median ${pct(mAB)}% [${pct(ciAB[0])}, ${pct(ciAB[1])}] (n=${ab.length}); A/A median ${pct(mAA)}% [${pct(ciAA[0])}, ${pct(ciAA[1])}] (n=${aa.length}); A/A bias ${demonstrated ? 'DEMONSTRATED' : 'not demonstrated'}; judged ${pct(judged)}% vs ${pct(budget)}% -> ${r.met ? 'MET' : 'NOT MET'}`);
    return r;
  };
  verdict[w] = {c1: judge('weighted', .08), orbit: judge('orbit', .05),
    info: {outsideAB: median(rows.AB.outside), outsideAA: median(rows.AA.outside), inMassifAB: median(rows.AB.inMassif), inMassifAA: median(rows.AA.inMassif),
      rangeAB: [Math.min(...rows.AB.weighted), Math.max(...rows.AB.weighted)], rangeAA: [Math.min(...rows.AA.weighted), Math.max(...rows.AA.weighted)],
      orbitRangeAB: [Math.min(...rows.AB.orbit), Math.max(...rows.AB.orbit)], orbitRangeAA: [Math.min(...rows.AA.orbit), Math.max(...rows.AA.orbit)],
      c1ByFirstAB: rows.AB.byFirst, c1ByFirstAA: rows.AA.byFirst, orbitByFirstAB: rows.AB.orbitByFirst, orbitByFirstAA: rows.AA.orbitByFirst}};
  const i = verdict[w].info;
  out.push(`${w} INFO: C1 outside A/B ${pct(i.outsideAB)}% A/A ${pct(i.outsideAA)}%; in-massif A/B ${pct(i.inMassifAB)}% A/A ${pct(i.inMassifAA)}%; C1 range A/B ${pct(i.rangeAB[0])}..${pct(i.rangeAB[1])}% A/A ${pct(i.rangeAA[0])}..${pct(i.rangeAA[1])}%; orbit range A/B ${pct(i.orbitRangeAB[0])}..${pct(i.orbitRangeAB[1])}% A/A ${pct(i.orbitRangeAA[0])}..${pct(i.orbitRangeAA[1])}%; C1 by first arm A/B ref ${pct(i.c1ByFirstAB.ref)} cand ${pct(i.c1ByFirstAB.cand)}, A/A ref ${pct(i.c1ByFirstAA.ref)} cand ${pct(i.c1ByFirstAA.cand)}; orbit by first A/B ref ${pct(i.orbitByFirstAB.ref)} cand ${pct(i.orbitByFirstAB.cand)}, A/A ref ${pct(i.orbitByFirstAA.ref)} cand ${pct(i.orbitByFirstAA.cand)}`);
}
const all = Object.values(verdict).every(v => v.c1.met && v.orbit.met);
out.push(`ALL MET: ${all}  (CI ranks for n=30: ${ciRanks(30)})`);
console.log(out.join('\n'));
writeFileSync(new URL('analysis.json', O), JSON.stringify(verdict, null, 1) + '\n');
writeFileSync(new URL('analysis.txt', O), out.join('\n') + '\n');
