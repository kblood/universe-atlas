import {readFileSync, writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root = 'test-results/mountains/t3/';
const read = name => readFileSync(root + name, 'utf8');
const json = name => JSON.parse(read(name));
const before = json('opt-identity-before.json'), after = json('opt-identity-after.json');
assert.deepEqual(after, before, 'all eight tile and 96 full sampler digests unchanged');
const truth = json('opt-truth-identity.json');
for (const row of Object.values(truth)) { assert.equal(row.baseMismatch, 0); assert.equal(row.digest, row.baseDigest); }
const contract = json('opt-after-contract.json');
const pct = v => (v >= 0 ? '+' : '') + (100*v).toFixed(1) + '%';
const quick = name => read(name).trim().split(/\r?\n/).map(line => JSON.parse(line.slice(line.indexOf('{'))));
const out = [
  '# T3 value-preserving cost follow-up (unofficial)', '',
  'No test slot, network, package installation, commit, version change, pin replacement or budget change. Main was read-only. All timings below are unofficial; the coordinator owns official acceptance.', '',
  'Retained: belt seed memoization in `src/terrain.ts`; dense halo-aware lattice caches, one raw-grid lookup per correction, single-face vector selection, and direct texel stores in `src/planet-tiles.ts`; eight tile and full-output sampler guards in `tests/lod-carving-reduction.test.mjs`. Evidence scripts/logs/snapshots are under this directory.', '',
  'The default and mountain fields retain their values. The tile optimisations also apply with mountains off. No sampler cache or terrain-core rewrite remains.', '',
  '## Quick benchmark: before and after', '',
  '| World | Level | Before main/on ms | Before growth | After main/on ms | After growth |',
  '|---|---:|---:|---:|---:|---:|',
];
for (const world of ['Maithea','Raiva']) {
  const b = quick(`opt-before-${world}.log`), a = quick(`opt-after-${world}.log`);
  for (let i=0;i<b.length;i++) out.push(`| ${world} | ${b[i].level} | ${b[i].main}/${b[i].on} | ${pct(b[i]['on/main'])} | ${a[i].main}/${a[i].on} | ${pct(a[i]['on/main'])} |`);
}
out.push('', '## Contract protocol (five rounds, fresh process per world)', '', '| Level | Maithea | Selawyn | Raiva | Lethuris |', '|---:|---:|---:|---:|---:|');
for (let L=0;L<7;L++) out.push(`| ${L} | `+Object.values(contract).map(w=>w.rows[L]?pct(w.rows[L].growth):'—').join(' | ')+' |');
const failures = Object.values(contract).flatMap(w=>w.rows.filter(r=>r.growth>.1).map(r=>`${w.world} L${r.level} ${pct(r.growth)}`));
out.push('', failures.length ? `Budget NOT MET on this run: ${failures.join('; ')}.` : 'Every measured coarse level is <= +10% on this unofficial run.', '', '## Mountains-off control', '');
for (const world of ['Maithea','Raiva']) out.push(`${world} L0..${world==='Maithea'?5:4}: ${quick(`opt-off-${world}.log`).map(r=>pct(r['off/main'])).join(', ')}.`);
out.push('', '## Identity (captured before changes)', '', 'All eight complete tile hashes below are unchanged. Hashing covers all fields and buffers, using binary doubles including signed zero. The full sampler ledger covers truth and L0..22 on 259 directions per world, including three massif sites; all 96 hashes are unchanged.', '', '| World | L(cut-1) SHA-256 | L(cut) SHA-256 |', '|---|---|---|');
for (const [world,row] of Object.entries(before)) out.push(`| ${world} | ${row.tileDigests[0]} | ${row.tileDigests[1]} |`);
out.push('', 'Truth comparison: 15,120 directions per world, zero mismatches on all four worlds. BASE is the saved pre-optimisation ea0c802 source with only the staging constant enabled, whose truth is the unoptimised T3 truth. A92 is a read-only git archive of 92afaa3; its historical pre-T2 differences remain INFO.', '', '| World | Equal before/after truth SHA-256 |', '|---|---|');
for (const [world,row] of Object.entries(truth)) out.push(`| ${world} | ${row.digest} |`);
out.push('', '## Commands and exit codes', '', '```text',
  'npx tsc --noEmit -p .',
  'node --test tests/lod-carving-reduction.test.mjs tests/mountain-layout.test.mjs tests/mountain-layout-grid.test.mjs tests/mountain-envelope.test.mjs tests/mountain-carving.test.mjs tests/mountain-carving-pin.test.mjs tests/terrain-mountains-assembly.test.mjs tests/terrain-elevation-identity.test.mjs tests/lod-consistency.test.mjs tests/planet.test.mjs',
  'node test-results/mountains/t3/truth-identity.mjs test-results/mountains/t3/opt-baseline test-results/mountains/t3/opt-a92 test-results/mountains/t3/opt-truth-identity.json',
  'node test-results/mountains/t3/opt-identity.mjs test-results/mountains/t3/opt-identity-before.json',
  'node test-results/mountains/t3/opt-identity.mjs test-results/mountains/t3/opt-identity-after.json',
  '```', '', 'Final tsc and suite: exit 0; 91/91 tests pass. Truth and both identity captures: exit 0. This report generator asserts equality of the before/after ledgers and the four truth comparisons.', '');
for (const world of ['Maithea','Raiva']) {
  const levels = world==='Maithea'?'0,1,2,3,4,5':'0,1,2,3,4';
  out.push(`Before and after (exit 0): \`node test-results/mountains/t3/tile-bench-arms.mjs ${world} C:/LLM/IWSDK/universe-atlas ${levels} main,on\``, '');
  out.push(`Off control (exit 0): \`node test-results/mountains/t3/tile-bench-arms.mjs ${world} C:/LLM/IWSDK/universe-atlas ${levels} main,off\``, '');
}
for (const world of Object.keys(contract)) out.push(`Exit 0: \`node test-results/mountains/t3/contract-build-bench.mjs ${world} C:/LLM/IWSDK/universe-atlas 5 test-results/mountains/t3/opt-after-contract.json\``, '');
out.push('## Discarded experiments', '',
  '- Seed memo alone was insufficient (Maithea quick +7.9% to +21.9%); retained to remove the known per-tile hashing.',
  '- Out-of-line mountain helper, early grid rejection, numeric argument buffer, partial/full mountain prepasses, optional precomputed ridge parameter, and extracting the whole ridge expression: no reliable budget win. All removed.',
  '- Reusing tile samplers improved the quick test but missed the contract protocol (Maithea +11.0% to +18.5%); removed, including body-input invalidation logic.',
  '- Routing grid-rejected directions through a real mountains-off sampler also missed the contract (+13.7% to +21.5%); removed.',
  '- Numeric Map keys helped, then were replaced by a dense halo array. Texture stores and lattice indexing supplied the material gain; no mountain arithmetic changed.', '',
  'Candidate logs use `opt-<variant>-*`. The earlier `opt-final-contract-*` files are intermediate evidence (numeric/dense cache transition), not the final set; use `opt-after-contract.*` for final measurements.', '',
  'Not run: official quiet-slot measurements, full repository suite, browser/headset checks. No requested check was skipped.', '');
writeFileSync(root+'opt-report.md', out.join('\n'));
console.log('Identity ledgers equal; truth mismatches 0; contract failures:', failures);
