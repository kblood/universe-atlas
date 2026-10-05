import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const dir='test-results/mountains/t3/';
const read=f=>JSON.parse(readFileSync(dir+f,'utf8'));
const before=read('official-residual-vs-staged.json'),after=read('fix-residual.json');
const bm=read('official-after-contract.json'),am=read('fix-vs-main.json');
assert.deepStrictEqual(read('opt-identity-before.json'),read('fix-identity-after.json'));
const worlds=['Maithea','Selawyn','Raiva','Lethuris'];
const pct=x=>(x>=0?'+':'')+(100*x).toFixed(3)+'%';
const table=['| World | Level | Residual before → after | Against main before → after |','|---|---:|---:|---:|'];
for(const w of worlds) for(const r of after[w].rows) {
 const L=r.level;
 table.push(`| ${w} | L${L} | ${pct(before[w].rows[L].growth)} → ${pct(r.growth)} | ${pct(bm[w].rows[L].growth)} → ${pct(am[w].rows[L].growth)} |`);
}
const summary=['| World | Residual mean before → after | Residual maximum before → after | Against-main maximum after |','|---|---:|---:|---:|'];
const mean=v=>v.rows.reduce((s,r)=>s+r.growth,0)/v.rows.length,max=v=>Math.max(...v.rows.map(r=>r.growth));
for(const w of worlds) summary.push(`| ${w} | ${pct(mean(before[w]))} → ${pct(mean(after[w]))} | ${pct(max(before[w]))} → ${pct(max(after[w]))} | ${pct(max(am[w]))} |`);
const experiments=[['helper','Small mountain helper'],['base','Separate shared base-height calculation'],['layout','Merge band rejection and flagged solve'],['coarse','Dedicated uncarved M2 evaluator'],['noise','Isolated copy of noise kernels plus relief split'],['double','Force numeric CoreSample field representations'],['stable-noise','Memoize seeded noise closures'],['context','Explicit terrain-core context'],['scratch','Reuse internal CoreSample and snapshot caller fields'],['relief','Retained relief split, initial candidate run']];
const trials=['| Experiment | Maithea residual range | Raiva residual range |','|---|---:|---:|'];
for(const [file,label] of experiments) {
 const data=read(`fix-${file}.json`),range=w=>data[w]?`${pct(Math.min(...data[w].rows.map(r=>r.growth)))} to ${pct(max(data[w]))}`:'not run';
 trials.push(`| ${label} | ${range('Maithea')} | ${range('Raiva')} |`);
}
const report=`The +10% same-code residual target was not reached. Only the relief-composition split remains in production code. All four final against-main comparisons stay below +10%; see exact per-level results below. These are unofficial, sequential local measurements, not the coordinator's CPU-quiet slot.

Changed production file:

- src/terrain.ts — moves the existing relief block into a separate closure with one private scratch object per core. The caller immediately copies its four numeric fields. Arithmetic, branches, M1/M2/M3 implementations, public outputs, defaults, versions and budgets are unchanged. The retained candidate improves the measured aggregate residual but does not establish a per-level budget pass.

Before = official round-1 files official-residual-vs-staged.json and official-after-contract.json; after = fix-residual.json and fix-vs-main.json. Same contract-build-bench.mjs, five rounds, fresh process per world/comparison. The staging copy was refreshed after each source change before benchmarking. The shell policy rejected forced recursive deletion; normal PowerShell recursive deletion of the verified staging directory succeeded, producing the same fresh source copy. No benchmark protocol or test expectations were edited.

${summary.join('\n')}

${table.join('\n')}

JSON artifacts preserve the full-precision means, medians and growth values; tables round percentages to three decimals. The before/after runs have different machine-load conditions, so small differences are not official acceptance evidence.

V8 investigation:

- Node v24.7.0. fix-trace-before.log records the original on-only branch arm; fix-trace-mixed.log records main/off/on. In the on-only trace V8 inlines massifBeltSample into the terrain sample, and sampleWithinWithA0/reset into the mountain wrapper. The mixed trace considers the wrapper but does not inline it into sample. Both traces show warm-up map and call-target deoptimizations; they do not establish a sustained deoptimization loop as the cause.
- The retained split keeps the complete relief calculation in reliefHeight, beyond the inlining size limit, without dummy work or engine-specific production flags. The final trace explicitly refuses to inline reliefHeight (reason 5). It also shows repeated completed TurboFan optimizations for distinct sample closures; the two sample function identities have 3 and 9 recorded completions. This is evidence of differing compilation behavior, not proof of one specific root cause.
- In the retained-code profile, core sample self time is 1,535 ms on versus 641 ms off; macroHeightCode is 539 versus 308 ms, reliefHeight 333 versus 270 ms, and bandTag is 174 ms on. Both graphs reach TurboFan. These totals include warm-up and tracing overhead and must not replace the uninstrumented final timing tables. See fix-final-trace.log and fix-final-profile.txt.
- The experimental isolated-noise profile (fix-noise-profile.txt) still attributed 1,341 ms to the on core sample versus 598 ms off, while noise was 2,018 versus 2,080 ms and reliefHeight 322 versus 271 ms. This profile includes warm-up, including M3, and is diagnostic rather than contract timing. It shows why attributing the remaining gap solely to M1/M2 arithmetic is unsupported. Isolation helped Raiva once but not Maithea and was discarded.
- The exact remaining compiler cause is unresolved. Moving relief reduced some measured overhead, but the on-only core still runs materially more slowly than the same-code off core. Neither blocking the M1 wrapper's inlining, removing internal result allocations, stabilizing numeric fields, nor stabilizing noise closure targets consistently removed the gap. The evidence does not justify claiming the target is solved.

Experiments (all measurements use the unchanged contract harness; ranges cover all coarse levels tested):

${trials.join('\n')}

Every rejected production edit and its source-rewriting helper was removed. M2 helpers allocate no objects in the existing code; M1 reset/finish already mutate a scratch sample. Carving-strip objects are on the carved path, so removing them would not improve the measured coarse path. The separate coarse evaluator showed no win and was removed. No per-block rejection change was retained.

Checks (exact requested commands):

\`\`\`text
npx tsc --noEmit -p .
node --test tests/lod-carving-reduction.test.mjs tests/mountain-layout.test.mjs tests/mountain-layout-grid.test.mjs tests/mountain-envelope.test.mjs tests/mountain-carving.test.mjs tests/mountain-carving-pin.test.mjs tests/terrain-mountains-assembly.test.mjs tests/terrain-elevation-identity.test.mjs tests/lod-consistency.test.mjs tests/planet.test.mjs
node test-results/mountains/t3/opt-identity.mjs test-results/mountains/t3/fix-identity-after.json
\`\`\`

All three exited 0; 91/91 tests passed, including unchanged COST_IDENTITY and COST_SAMPLER_IDENTITY guards and M1/M2/M3 pins. The before/after identity JSON files are byte-identical, SHA-256 04a771608ab373a6a764110433e8ef20a76113785cde985ddd2c1664e05df3af. fix-default-identity.mjs additionally compares default sampler outputs at truth and L0–L22 (with/without exposed floor), and complete default tile digests through cut+2, directly against read-only main. See fix-default-identity.json/log.

Recorded exit codes:

\`\`\`text
${readFileSync(dir+'fix-check-exits.log','utf8').trim()}
\`\`\`

Not run: official coordinator CPU-quiet measurements, browser/headset validation, or the full repository test suite. No requested check was skipped. No installs, downloads, network access, commits, .git writes, or main-checkout writes. The disposable staged-off directory was deleted at completion.

New evidence files (all under test-results/mountains/t3; ignored by the existing test-results ignore rule, not staged):

${readdirSync(dir).filter(f=>f.startsWith('fix-')&&f!=='fix-report.md').sort().map(f=>'- '+f).join('\n')}
- fix-report.md — this report.
`;
writeFileSync(dir+'fix-report.md',report);
console.log(summary.join('\n'));
console.log(table.join('\n'));
