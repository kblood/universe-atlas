// Tier helper and incremental reporter (docs/test-tiers-2026-10-07.md). Pure and fast (< 2 s).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {ORDER, parseTier, pickFor, atLeastFor, TIER} from './helpers/tier.mjs';
import {classOf} from './helpers/tier-reporter.mjs';
import {summarize} from './helpers/tier-runner.mjs';

test('HARD: tier env parse: default when unset, ATLAS_TEST_FULL=1 implies gate, unknown tiers throw', () => {
  assert.deepEqual(ORDER, ['smoke', 'work', 'default', 'gate']);
  assert.equal(parseTier({}), 'default');
  assert.equal(parseTier({ATLAS_TEST_TIER: 'smoke'}), 'smoke');
  assert.equal(parseTier({ATLAS_TEST_TIER: 'work'}), 'work');
  assert.equal(parseTier({ATLAS_TEST_TIER: 'smoke', ATLAS_TEST_FULL: '1'}), 'gate');
  assert.equal(parseTier({ATLAS_TEST_FULL: '0'}), 'default');
  assert.throws(() => parseTier({ATLAS_TEST_TIER: 'quick'}), /expected smoke\|work\|default\|gate/);
  // This file runs in the default suite with no tier set: the default tier is what plain `npm test` sees.
  if (!process.env.ATLAS_TEST_TIER && process.env.ATLAS_TEST_FULL !== '1') assert.equal(TIER, 'default');
});

test('HARD: pick falls back to the next DEEPER tier given (never shallower); gate falls back to default', () => {
  const v = {smoke: 1, default: 3};
  assert.equal(pickFor('smoke', v), 1);
  assert.equal(pickFor('work', v), 3, 'work without a value takes default, never smoke');
  assert.equal(pickFor('default', v), 3);
  assert.equal(pickFor('gate', v), 3, 'gate = today\'s full nets unless a file says otherwise');
  assert.equal(pickFor('gate', {default: 3, gate: 4}), 4);
  assert.equal(pickFor('default', {smoke: 1, work: 2, default: 3}), 3);
  assert.throws(() => pickFor('default', {smoke: 1}), /no value/);
  assert.equal(atLeastFor('smoke', 'default'), false);assert.equal(atLeastFor('gate', 'default'), true);
});

test('HARD: gateOnly / onlyFrom skip below their tier and run from it (fresh processes)', () => {
  const url = new URL('./helpers/tier.mjs', import.meta.url).href;
  const probe = env => {
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', `const t=await import(${JSON.stringify(url)});console.log(JSON.stringify([t.TIER,t.gateOnly('x'),t.onlyFrom('default','y'),t.coverage(),t.tierBodies(['Maithea','Selawyn','Raiva','Lethuris'])]))`],
      {env: {...process.env, ATLAS_TEST_TIER: '', ATLAS_TEST_FULL: '', ...env}, encoding: 'utf8'});
    assert.equal(r.status, 0, r.stderr);return JSON.parse(r.stdout);
  };
  const all = ['Maithea', 'Selawyn', 'Raiva', 'Lethuris'];
  assert.deepEqual(probe({ATLAS_TEST_TIER: 'smoke'}), ['smoke', {skip: 'tier gate+ only (now smoke): x'}, {skip: 'tier default+ only (now smoke): y'}, 'subset', all]);
  assert.deepEqual(probe({ATLAS_TEST_TIER: 'work'}), ['work', {skip: 'tier gate+ only (now work): x'}, {skip: 'tier default+ only (now work): y'}, 'subset', ['Maithea', 'Lethuris']]);
  assert.deepEqual(probe({}), ['default', {skip: 'tier gate+ only (now default): x'}, {}, 'full', all]);
  assert.deepEqual(probe({ATLAS_TEST_FULL: '1'}), ['gate', {}, {}, 'full', all]);
});

test('HARD: reporter: one complete JSON line per top-level test, class from the title prefix, a killed run keeps finished lines', () => {
  assert.equal(classOf('HARD: x'), 'HARD');assert.equal(classOf('CONTRACT: x'), 'CONTRACT');assert.equal(classOf('VISUAL-ADVISORY: x'), 'VISUAL-ADVISORY');
  assert.equal(classOf('Maithea: plain title'), 'HARD', 'unprefixed deterministic tests count as HARD');
  const dir = mkdtempSync(join(tmpdir(), 'tier-reporter-')), out = join(dir, 'results.jsonl'), file = join(dir, 'probe.test.mjs');
  try {
    // Third test never finishes: the parent kills the run by timeout after the first two have been reported.
    writeFileSync(file, `import {test} from 'node:test';
test('HARD: a', t => t.diagnostic('INFO a'));
test('CONTRACT: b', () => { throw new Error('b broke'); });
test('c hangs', () => new Promise(() => setInterval(() => {}, 1000)));
`);
    const reporter = new URL('./helpers/tier-reporter.mjs', import.meta.url).href;
    spawnSync(process.execPath, ['--test', '--test-isolation=none', `--test-reporter=${reporter}`, '--test-reporter-destination=stdout', file],
      {env: {...process.env, NODE_TEST_CONTEXT: undefined, ATLAS_TIER_RESULTS: out, ATLAS_TEST_TIER: 'smoke', ATLAS_TEST_FULL: '', ATLAS_TIER_AWARE: '1'}, encoding: 'utf8', timeout: 2500, killSignal: 'SIGKILL'});
    const lines = readFileSync(out, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
    assert.equal(lines.length, 2, 'both finished tests, not the one in flight');
    assert.deepEqual([lines[0].test, lines[0].class, lines[0].status, lines[0].coverage, lines[0].diag], ['HARD: a', 'HARD', 'pass', 'subset', ['INFO a']]);
    assert.deepEqual([lines[1].test, lines[1].class, lines[1].status, lines[1].known], ['CONTRACT: b', 'CONTRACT', 'fail', false]);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('HARD: summary: latest attempt per file wins; NEW HARD/CONTRACT failures and missing files make a run red', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tier-summary-'));
  try {
    writeFileSync(join(dir, 'run.json'), JSON.stringify({runId: 'r', tier: 'smoke', treeKey: 'k', files: ['a', 'b', 'c']}));
    const jl = rows => rows.map(r => JSON.stringify(r)).join('\n') + '\n';
    writeFileSync(join(dir, 'steps.jsonl'), jl([{step: 'a', status: 'fail', exit: 1, ms: 5, attempt: 1}, {step: 'b', status: 'pass', exit: 0, ms: 5, attempt: 1}, {step: 'a', status: 'pass', exit: 0, ms: 5, attempt: 2}]));
    writeFileSync(join(dir, 'results.jsonl'), jl([{file: 'a', test: 'HARD: x', class: 'HARD', status: 'fail', attempt: 1, known: false, diag: []},
      {file: 'b', test: 'y', class: 'HARD', status: 'pass', attempt: 1, coverage: 'subset'}, {file: 'a', test: 'HARD: x', class: 'HARD', status: 'pass', attempt: 2}]));
    let s = summarize(dir);
    assert.equal(s.newFailures.length, 0, 'attempt 2 of a passed');assert.deepEqual(s.missing, ['c']);assert.equal(s.green, false, 'c never ran');
    writeFileSync(join(dir, 'steps.jsonl'), readFileSync(join(dir, 'steps.jsonl'), 'utf8') + jl([{step: 'c', status: 'fail', exit: 1, ms: 5, attempt: 2}]));
    writeFileSync(join(dir, 'results.jsonl'), readFileSync(join(dir, 'results.jsonl'), 'utf8') + jl([{file: 'c', test: 'CONTRACT: z', class: 'CONTRACT', status: 'fail', attempt: 2, known: false, diag: ['d']}]));
    s = summarize(dir);
    assert.equal(s.green, false);assert.deepEqual(s.newFailures.map(f => f.test), ['CONTRACT: z']);assert.equal(s.subsetResults, 1);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

// Peak RSS per step (plan I3: steps.jsonl maxRSS column, KiB): measured by an exit hook preloaded into the step process.
import {runStep, readMaxRSS} from './helpers/tier-runner.mjs';
import {mkdirSync} from 'node:fs';
test('HARD: runStep records the step process peak RSS (maxRSS, KiB); a killed step records null; summary keeps the peak', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tier-rss-'));
  try {
    mkdirSync(join(dir, 'files'));
    const big = join(dir, 'big.test.mjs'), hang = join(dir, 'hang.test.mjs');
    writeFileSync(big, "import test from 'node:test'; test('HARD: 96 MiB', () => { globalThis.keep = Buffer.alloc(96 << 20, 1); });\n");
    writeFileSync(hang, "import test from 'node:test'; test('HARD: hang', () => new Promise(() => setInterval(() => {}, 1000)));\n");
    const ok = await runStep({step: 'big', file: big, args: []}, {dir, tier: 'smoke', attempt: 1, aware: false, index: 0}).done;
    assert.equal(ok.code, 0, ok.err);
    assert.ok(ok.maxRSS >= 96 * 1024 && ok.maxRSS < 4 << 20, `maxRSS ${ok.maxRSS} KiB`);
    const job = runStep({step: 'hang', file: hang, args: []}, {dir, tier: 'smoke', attempt: 1, aware: false, index: 1});
    setTimeout(() => job.child.kill(), 300);
    const killed = await job.done;
    assert.notEqual(killed.code, 0); assert.equal(killed.maxRSS, null, 'no exit hook ran: unknown, never 0');
    assert.equal(readMaxRSS(join(dir, 'missing.rss')), null);
    writeFileSync(join(dir, 'run.json'), JSON.stringify({runId: 'r', tier: 'smoke', treeKey: 'k', steps: ['big', 'hang']}));
    writeFileSync(join(dir, 'steps.jsonl'), [{step: 'big', status: 'pass', exit: 0, ms: 1, maxRSS: ok.maxRSS, attempt: 1}, {step: 'hang', status: 'fail', exit: 1, ms: 1, maxRSS: null, attempt: 1}].map(r => JSON.stringify(r)).join('\n') + '\n');
    assert.equal(summarize(dir).peakStepRSSMiB, +(ok.maxRSS / 1024).toFixed(1));
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
