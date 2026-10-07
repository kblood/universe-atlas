// INFO-only sensitivity for a cost-fair OUT dir: arm checks + medians excluding pre-check-flagged processes.
// usage: node sensitivity.mjs <OUT> [<gate-c1 OUT for digest comparison>]
import {readFileSync, readdirSync} from 'node:fs';
const O = process.argv[2], P = process.argv[3];
const J = f => readFileSync(`${O}/${f}`, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const pre = J('precheck.jsonl');
const flag = new Map(); for (const p of pre) flag.set(p.label, (flag.get(p.label) || false) || p.flagged);
const recs = readdirSync(`${O}/rec`).filter(f => f.endsWith('.json')).sort().map(f => {
  const [, type, kind, world, first, ii] = f.replace('.json', '').split('-');
  return {type, kind, world, first, i: +ii.slice(1), label: `${type} ${kind} ${world} ${first} i=${ii.slice(1)}`, r: JSON.parse(readFileSync(`${O}/rec/${f}`, 'utf8'))};
});
const fails = readdirSync(`${O}/rec`).filter(f => f.endsWith('.fail'));
const sorted = a => [...a].sort((x, y) => x - y);
const median = a => {const s = sorted(a), n = s.length; return n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2;};
const ciRanks = n => {let c = 0, k = 0; const p = i => {let r = 1; for (let j = 0; j < i; j++) r = r * (n - j) / (j + 1); return r / 2 ** n;};
  while (c + p(k) <= .025) {c += p(k); k++;} return [k, n - k + 1];};
const ci = a => {const s = sorted(a), [lo, hi] = ciRanks(s.length); return [s[lo - 1], s[hi - 1]];};
const med = a => sorted(a)[a.length >> 1];
const og = r => {const first = r.label.split('|first=')[1]; const ref = first === 'ref' ? r.aMs : r.bMs, cand = first === 'ref' ? r.bMs : r.aMs; return med(cand) / med(ref) - 1;};
const pct = x => (100 * x).toFixed(2);
const out = [];
const vers = new Set(recs.filter(x => x.type === 'c1').map(x => `${x.kind} ${x.r.refVersion}/${x.r.refWired} -> ${x.r.candVersion}/${x.r.candWired}`));
out.push('c1 versions ' + [...vers].join('; '));
const orb = recs.filter(x => x.type === 'orbit');
out.push(`orbit identical AA ${orb.filter(x => x.kind === 'AA').every(x => x.r.identical)} AB ${orb.filter(x => x.kind === 'AB').some(x => x.r.identical)} blockSolves ${Math.max(...orb.map(x => x.r.blockSolves))}`);
const candDigest = {}; for (const x of orb.filter(x => x.kind === 'AB')) { const d = x.first === 'ref' ? x.r.digestB : x.r.digestA; (candDigest[x.world] ??= new Set()).add(d); }
out.push('orbit CAND digests ' + Object.entries(candDigest).map(([w, s]) => `${w} ${[...s].map(d => d.slice(0, 8)).join(',')}`).join(' '));
if (P) { const prev = readFileSync(`${P}/orbit.jsonl`, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(r => r.label.startsWith('AB'));
  const pd = {}; for (const r of prev) (pd[r.world] ??= new Set()).add(r.label.endsWith('first=ref') ? r.digestB : r.digestA);
  out.push('orbit CAND digests equal to GATE-C1 CAND: ' + Object.keys(candDigest).map(w => `${w} ${[...candDigest[w]].join() === [...pd[w]].join()}`).join(' ')); }
out.push(`node ${process.version}`);
out.push(`records c1 ${recs.filter(x => x.type === 'c1').length} orbit ${orb.length} fail ${fails.length}; precheck lines ${pre.length}`);
const fl = recs.filter(x => flag.get(x.label));
const strong = pre.filter(p => (p.active || []).length || (p.newGpu || []).length);
out.push(`flagged c1 ${fl.filter(x => x.type === 'c1').length} flagged orbit ${fl.filter(x => x.type === 'orbit').length} contender-counted ${strong.length}`);
const waits = pre.reduce((s, p) => s + (p.waitedMs || 0), 0);
out.push(`waits total s ${Math.round(waits / 1000)} (incl. ~1 s sample per call) idle min ${Math.min(...pre.map(p => p.idlePct))} waitReasons ${[...new Set(pre.flatMap(p => p.waitReasons || []).map(r => String(r).split(/[ :(]/)[0]))].join(',')}`);
for (const w of ['Maithea', 'Selawyn', 'Raiva', 'Lethuris']) {
  const ab = recs.filter(x => x.world === w && x.kind === 'AB' && !flag.get(x.label));
  const c = ab.filter(x => x.type === 'c1').map(x => x.r.weighted), o = ab.filter(x => x.type === 'orbit').map(x => og(x.r));
  const ci1 = ci(c), ci2 = ci(o);
  out.push(`${w} UNFLAGGED-ONLY (INFO): C1 A/B ${pct(median(c))}% [${pct(ci1[0])},${pct(ci1[1])}] n=${c.length}; orbit A/B ${pct(median(o))}% [${pct(ci2[0])},${pct(ci2[1])}] n=${o.length}`);
}
for (const w of ['Raiva', 'Maithea']) {
  const o = sorted(recs.filter(x => x.world === w && x.kind === 'AB' && x.type === 'orbit').map(x => og(x.r)));
  out.push(`${w} orbit A/B sorted (INFO): ${o.map(pct).join(' ')}`);
}
console.log(out.join('\n'));
