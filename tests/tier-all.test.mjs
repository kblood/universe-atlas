// Tier `all` of the tier runner (docs/tier-all-2026-10-07.md, review O2): whole-registry steps, longest-first estimates,
// the step env, test:full's classification on tier rows, and one end-to-end run in a sandbox repo. Never the live slot
// (sandbox ATLAS_TEST_SLOT_DIR), never the real registry run. A few seconds.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn, spawnSync, execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, readdirSync, realpathSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {allSteps, expandSteps, estimator, orderSteps, measuredSeconds, tierEnv, classifyRows, isNewFailure, writeEstimates} from './helpers/tier-runner.mjs';
import {classify} from './helpers/known-failures.mjs';
import {registeredTests} from './helpers/test-selection.mjs';

const lines = p => existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
const cleanEnv = extra => {const env = {...process.env, ...extra};for (const k of ['NODE_TEST_CONTEXT', 'ATLAS_TEST_FULL', 'ATLAS_TEST_TIER', 'ATLAS_TEST_SLOT_TOKEN', 'ATLAS_SLOT_SHARED']) delete env[k];return {...env, ...extra};};

test('HARD: tier all steps: every registered file exactly once in registry order; {file, shards} entries expand in place; bad entries throw', () => {
  const reg = ['tests/a.test.mjs', 'tests/b.test.mjs', 'tests/c.test.mjs'];
  assert.deepEqual(allSteps(reg).map(s => s.step), reg);
  const steps = allSteps(reg, [{file: 'tests/b.test.mjs', shards: ['^x', '^y']}]);
  assert.deepEqual(steps.map(s => s.step), ['tests/a.test.mjs', 'tests/b.test.mjs#0', 'tests/b.test.mjs#1', 'tests/b.test.mjs#rest', 'tests/c.test.mjs']);
  assert.deepEqual(steps.filter(s => s.file === 'tests/b.test.mjs').map(s => s.args), [['--test-name-pattern=^x'], ['--test-name-pattern=^y'], ['--test-skip-pattern=(?:^x)|(?:^y)']]);
  assert.deepEqual(steps.slice(1, 4), expandSteps([{file: 'tests/b.test.mjs', shards: ['^x', '^y']}]), 'same shard expansion as the smoke/work lists');
  assert.throws(() => allSteps(reg, [{file: 'tests/z.test.mjs', shards: ['^x']}]), /not registered in npm test: tests\/z\.test\.mjs/);
  assert.throws(() => allSteps(reg, [{file: 'tests/a.test.mjs', shards: ['^x']}, {file: 'tests/a.test.mjs', shards: ['^y']}]), /duplicate entry/);
  assert.throws(() => allSteps(reg, ['tests/a.test.mjs']), /entries must be \{file, shards/);
  assert.throws(() => allSteps(reg, [{file: 'tests/a.test.mjs', shards: []}]), /entries must be \{file, shards/);
  // The committed `all` list is valid against the committed registry, and every file runs once.
  const tiers = JSON.parse(readFileSync('tests/tiers.json', 'utf8')), real = registeredTests();
  const files = [...new Set(allSteps(real, tiers.all).map(s => s.file))];
  assert.deepEqual(files, real);
});

test('HARD: tier all estimates: local run > committed step > committed file > fallback label; unknown first; longest first, ties in list order', () => {
  const committed = {full: {'tests/a.test.mjs': 5, 'tests/b.test.mjs#0': 50}, all: {'tests/b.test.mjs': 30, 'tests/c.test.mjs': 1, 'tests/d.test.mjs': 1}};
  const est = estimator('full', {committed, previous: {'tests/a.test.mjs': 7}});
  const s = (step, file = step.split('#')[0]) => ({step, file});
  assert.equal(est(s('tests/a.test.mjs')), 7, 'the latest local run wins');
  assert.equal(est(s('tests/b.test.mjs#0')), 50, 'the step entry');
  assert.equal(est(s('tests/b.test.mjs#rest')), 30, 'a shard falls back to its whole file (fallback label all)');
  assert.equal(est(s('tests/e.test.mjs')), undefined, 'unknown');
  assert.equal(estimator('all', {committed})(s('tests/a.test.mjs')), undefined, 'all never borrows from full');
  const steps = ['tests/c.test.mjs', 'tests/a.test.mjs', 'tests/e.test.mjs', 'tests/b.test.mjs#0', 'tests/d.test.mjs', 'tests/b.test.mjs#rest'].map(x => s(x));
  assert.deepEqual(orderSteps(steps, est).map(([x, i]) => [x.step, i]),
    [['tests/e.test.mjs', 2], ['tests/b.test.mjs#0', 3], ['tests/b.test.mjs#rest', 5], ['tests/a.test.mjs', 1], ['tests/c.test.mjs', 0], ['tests/d.test.mjs', 4]]);
  // Every registered step has a committed estimate for all and full (no cold start in a fresh worktree, review weakness 7).
  const doc = JSON.parse(readFileSync('tests/tier-estimates.json', 'utf8')), tiers = JSON.parse(readFileSync('tests/tiers.json', 'utf8'));
  for (const label of ['all', 'full']) {
    const e = estimator(label, {committed: doc}), steps = allSteps(registeredTests(), tiers.all), missing = steps.filter(x => e(x) === undefined).map(x => x.step);
    assert.ok(missing.length <= 0.05 * steps.length, `${label}: steps without an estimate: ${missing.join(', ')}`);
  }
});

test('HARD: tier all measured seconds: latest attempt per step, killed steps dropped; writeEstimates keeps unmeasured entries and refuses another label', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-tier-all-est-'));
  try {
    writeFileSync(join(dir, 'run.json'), JSON.stringify({runId: 'r1', tier: 'all', label: 'full', commit: 'c', dirty: false, wallS: 9}));
    writeFileSync(join(dir, 'steps.jsonl'), [{step: 'a', status: 'fail', ms: 1000, attempt: 1}, {step: 'a', status: 'pass', ms: 2500, attempt: 2},
      {step: 'b', status: 'killed', ms: 300, attempt: 1}, {step: 'c', status: 'pass', ms: 12345, attempt: 1}].map(x => JSON.stringify(x)).join('\n') + '\n');
    assert.deepEqual(measuredSeconds([dir]), {a: 2.5, c: 12.3});
    const path = join(dir, 'est.json');writeFileSync(path, JSON.stringify({full: {b: 4, c: 1}, all: {z: 1}}));
    assert.deepEqual(writeEstimates('full', [dir], path), {label: 'full', steps: 2, total: 3});
    const doc = JSON.parse(readFileSync(path, 'utf8'));
    assert.deepEqual(doc.full, {a: 2.5, b: 4, c: 12.3});assert.deepEqual(doc.all, {z: 1});assert.equal(doc.sources.full[0].runId, 'r1');
    assert.throws(() => writeEstimates('all', [dir], path), /is a full run, not all/);
  } finally {rmSync(dir, {recursive: true, force: true});}
});

test('HARD: tier all step env: all = plain npm test (no ATLAS_TEST_TIER, no ATLAS_TEST_FULL), --full sets ATLAS_TEST_FULL=1, subset tiers set the tier', () => {
  assert.deepEqual(tierEnv({ATLAS_TEST_TIER: 'smoke', ATLAS_TEST_FULL: '1', X: '1'}, 'all'), {X: '1'});
  assert.deepEqual(tierEnv({ATLAS_TEST_TIER: 'smoke'}, 'all', true), {ATLAS_TEST_FULL: '1'});
  assert.deepEqual(tierEnv({ATLAS_TEST_FULL: '1'}, 'smoke'), {ATLAS_TEST_TIER: 'smoke'});
  assert.deepEqual(tierEnv({}, 'default'), {ATLAS_TEST_TIER: 'default'});
});

// The same fixture run through BOTH reporters at once: test:full's failure-reporter.mjs + classify() and the tier rows +
// classifyRows() must give the same matched / NEW / stale lists and the same counts.
test('HARD: tier all classification equals failure-reporter + classify on the same run (known, NEW of any class, stale, todo, skip)', () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'atlas-tier-all-cls-')));
  try {
    mkdirSync(join(root, 'tests'));
    writeFileSync(join(root, 'tests', 'a.test.mjs'), ["import {test} from 'node:test';import assert from 'node:assert';",
      "test('HARD: passes', () => {});", "test('HARD: known red', () => assert.fail('k'));", "test('HARD: new red', () => assert.fail('n'));",
      "test('INFO: info red', () => assert.fail('i'));", "test('unprefixed red', () => assert.fail('u'));",
      "test('todo red', {todo: 'open'}, () => assert.fail('t'));", "test('skipped', {skip: 'why'}, () => {});"].join('\n') + '\n');
    const known = [{title: 'HARD: known red', file: 'tests/a.test.mjs', reason: 'r', owner: 'o', class: 'HARD'},
      {title: 'HARD: gone', file: 'tests/a.test.mjs', reason: 'r', owner: 'o', class: 'HARD'}];
    writeFileSync(join(root, 'tests', 'known-failures.json'), JSON.stringify({failures: known}));
    const rows = join(root, 'rows.jsonl'), report = join(root, 'report.json'), url = f => pathToFileURL(resolve('tests/helpers', f)).href;
    const r = spawnSync(process.execPath, ['--test', '--test-isolation=none', `--test-reporter=${url('tier-reporter.mjs')}`, '--test-reporter-destination=stdout',
      `--test-reporter=${url('failure-reporter.mjs')}`, `--test-reporter-destination=${join(root, 'reporter.txt')}`, 'tests/a.test.mjs'],
    {cwd: root, encoding: 'utf8', env: cleanEnv({ATLAS_TIER_RESULTS: rows, ATLAS_TEST_REPORT: report})});
    assert.equal(r.status, 1, r.stderr);
    const tierRows = lines(rows), legacy = JSON.parse(readFileSync(report, 'utf8'));
    const a = classifyRows(tierRows, known), b = classify(legacy.failures, known);
    assert.deepEqual(a, b, 'identical matched / NEW / stale');
    assert.deepEqual(a.matched.map(f => f.title), ['HARD: known red']);
    assert.deepEqual(a.fresh.map(f => f.title), ['HARD: new red', 'INFO: info red', 'unprefixed red'], 'every unmatched failure is NEW, whatever the class');
    assert.deepEqual(a.stale.map(f => f.title), ['HARD: gone']);
    const c = legacy.summary.counts, n = s => tierRows.filter(x => x.status === s).length;
    assert.deepEqual([tierRows.length, n('pass'), n('fail'), n('skip'), n('todo')], [c.tests, c.passed, c.failed, c.skipped, c.todo], 'same counts as node');
    // Bail/green rule: in tier all the INFO failure blocks, in the subset tiers only HARD/CONTRACT do.
    const info = tierRows.find(x => x.test === 'INFO: info red');
    assert.equal(isNewFailure(info, 'all'), true);assert.equal(isNewFailure(info, 'smoke'), false);
    assert.equal(isNewFailure(tierRows.find(x => x.test === 'HARD: known red'), 'all'), false);
  } finally {rmSync(root, {recursive: true, force: true});}
});

// End to end through `test-runner.mjs full` (= tier all --full) and `tier all` in a throwaway git repo with a sandbox slot.
test('HARD: tier all end to end in a sandbox repo: --full reaches every step, shards split a file, test:full verdict lines, a NEW INFO failure rejects, a known one is accepted', async () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'atlas-tier-all-e2e-')));
  try {
    mkdirSync(join(root, 'tests', 'helpers'), {recursive: true});
    for (const f of ['test-runner.mjs', 'tier-runner.mjs', 'tier-reporter.mjs', 'known-failures.mjs', 'test-slot.mjs', 'test-selection.mjs']) writeFileSync(join(root, 'tests', 'helpers', f), readFileSync(join('tests', 'helpers', f)));
    writeFileSync(join(root, 'package.json'), JSON.stringify({scripts: {test: 'node --test tests/a.test.mjs tests/b.test.mjs'}}));
    const envCheck = "assert.equal(process.env.ATLAS_TEST_FULL ?? '', process.env.EXPECT_FULL ?? ''); assert.equal(process.env.ATLAS_TEST_TIER, undefined);";
    writeFileSync(join(root, 'tests', 'a.test.mjs'), `import {test} from 'node:test';import assert from 'node:assert';\ntest('A env', () => {${envCheck}});\n`
      + "test('INFO: maybe red', () => assert.equal(process.env.FAIL_INFO ?? '', ''));\n");
    writeFileSync(join(root, 'tests', 'b.test.mjs'), `import {test} from 'node:test';import assert from 'node:assert';\nfor (const t of ['B1', 'B2', 'B3']) test(t, () => {${envCheck}});\n`);
    writeFileSync(join(root, 'tests', 'tiers.json'), JSON.stringify({smoke: ['tests/a.test.mjs'], all: [{file: 'tests/b.test.mjs', shards: ['^B1']}]}));
    const setKnown = failures => writeFileSync(join(root, 'tests', 'known-failures.json'), JSON.stringify({failures}));
    setKnown([]);
    const git = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'core.autocrlf=false', ...a], {cwd: root});
    git('init', '-q');writeFileSync(join(root, '.gitignore'), 'test-results/\n');git('add', '.');git('commit', '-qm', 'fixture');
    const run = (args, extra) => new Promise((done, reject) => {
      const child = spawn(process.execPath, ['tests/helpers/test-runner.mjs', ...args], {cwd: root, stdio: 'pipe', env: cleanEnv({ATLAS_TEST_SLOT_DIR: join(root, 'slot'), ...extra})});
      let out = '';child.stdout.on('data', b => {out += b;});child.stderr.on('data', b => {out += b;});
      child.on('error', reject);child.on('close', code => done({code, out}));
    });
    const summaries = () => readdirSync(join(root, 'test-results', 'tiers')).sort().map(d => JSON.parse(readFileSync(join(root, 'test-results', 'tiers', d, 'summary.json'), 'utf8')));

    let r = await run(['full', '--no-bail'], {EXPECT_FULL: '1'});
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /tier all --full \(ATLAS_TEST_FULL=1, test:full\): 2 files in 3 steps/);
    assert.match(r.out, /KNOWN failures matched: 0\n+NEW failures: 0\n+Known entries that did NOT fail \(stale\): 0\n+Accepted: zero NEW failures/);
    let s = summaries().at(-1);
    assert.deepEqual([s.label, s.full, s.green, s.tests, s.pass, s.steps], ['full', true, true, 5, 5, 3]);
    assert.deepEqual(Object.keys(s.perStepS).sort(), ['tests/a.test.mjs', 'tests/b.test.mjs#0', 'tests/b.test.mjs#rest']);

    r = await run(['tier', 'all'], {EXPECT_FULL: ''});
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /tier all \(default depth, the npm test list\)/);

    r = await run(['full', '--no-bail'], {EXPECT_FULL: '1', FAIL_INFO: '1'});
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /NEW failures: 1\n {2}tests\/a\.test\.mjs: INFO: maybe red\n/);
    assert.match(r.out, /Rejected: NEW failure/);
    assert.equal(summaries().at(-1).green, false);

    setKnown([{title: 'INFO: maybe red', file: 'tests/a.test.mjs', reason: 'fixture', owner: 'test', class: 'HARD'}, {title: 'B9', file: 'tests/b.test.mjs', reason: 'fixture', owner: 'test', class: 'HARD'}]);
    r = await run(['full', '--no-bail'], {EXPECT_FULL: '1', FAIL_INFO: '1'});
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /KNOWN failures matched: 1\n {2}tests\/a\.test\.mjs: INFO: maybe red\nNEW failures: 0\n+Known entries that did NOT fail \(stale\): 1\n {2}tests\/b\.test\.mjs: B9\n/);
    assert.match(r.out, /Accepted: zero NEW failures; every step exited 0 or failed only on known failures/);

    assert.equal(existsSync(join(root, 'slot')), false, 'the sandbox slot was released');
  } finally {rmSync(root, {recursive: true, force: true});}
});
