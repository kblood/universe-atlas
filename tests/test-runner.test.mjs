import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, realpathSync, existsSync, readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {join, resolve, relative} from 'node:path';
import {spawn, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {classify} from './helpers/test-runner.mjs';
import {registeredTests, selectTests, DEFAULT_TEST_MANIFEST, DEFAULT_TEST_PRELOAD} from './helpers/test-selection.mjs';

test('npm test manifest preserves all 277 curated paths in their original order and stays below the Windows shell limit', () => {
  const files = registeredTests();
  assert.equal(files.length, 277);
  // The ordered list extracted from scripts.test before its Windows-safe migration.
  assert.equal(createHash('sha256').update(files.join('\n')).digest('hex'),
    '7da155e68f8bd74c4410bd0f5efd35f9695e2ad1f633c20c0ec1ff34dcb6b91e');
  assert.equal(new Set(files).size, files.length);
  for (const file of files) assert.ok(existsSync(file), file);
  const script = JSON.parse(readFileSync('package.json')).scripts.test;
  assert.match(script, /^node tests\/helpers\/test-slot\.mjs --shared 16 -- node --test --test-concurrency=16 --test-isolation=process --require /);
  assert.ok(script.length < 512, `${script.length} characters; cmd.exe limit is 8191`);
  assert.ok(`${script} ${files.join(' ')}`.length > 8191, 'the old inline list exceeds cmd.exe capacity');
  assert.deepEqual(selectTests([DEFAULT_TEST_MANIFEST], files, new Map()).selected.map(s => s.file), files,
    'manifest edits select the whole current suite, including newly registered paths');
  assert.deepEqual(selectTests([DEFAULT_TEST_PRELOAD], files, new Map()).selected.map(s => s.file), files,
    'preload edits also select the whole current suite');
});

function defaultSuiteFixture(work) {
  mkdirSync('test-results', {recursive: true});
  const root = realpathSync(mkdtempSync(resolve('test-results', 'atlas-default-suite-')));
  try {
    mkdirSync(join(root, 'tests', 'helpers'), {recursive: true});
    for (const file of ['default-test-suite.cjs', 'test-selection.mjs', 'test-slot.mjs']) {
      writeFileSync(join(root, 'tests', 'helpers', file), readFileSync(join('tests', 'helpers', file)));
    }
    const script = JSON.parse(readFileSync('package.json')).scripts.test;
    writeFileSync(join(root, 'package.json'), JSON.stringify({type: 'module', scripts: {test: script}}));
    const env = {...process.env, ATLAS_TEST_SLOT_DIR: join(root, 'slot')};
    for (const key of ['NODE_TEST_CONTEXT', 'ATLAS_TEST_SLOT_TOKEN', 'ATLAS_TEST_SLOT_NESTED', 'ATLAS_SLOT_SHARED']) delete env[key];
    const run = (args = [], extra = {}, nativeFiles) => spawnSync(process.execPath,
      nativeFiles ? ['--test', '--test-concurrency=16', ...args, ...nativeFiles] : [...script.split(' ').slice(1), ...args],
      {cwd: root, env: {...env, ...extra}, encoding: 'utf8', timeout: 30000});
    return work({root, run});
  } finally {rmSync(root, {recursive: true, force: true});}
}

test('npm test manifest uses native reporters, raw fail/TODO/skip status, isolation and shared/exclusive slot lifecycle', () => defaultSuiteFixture(({root, run}) => {
  const files = ['tests/a.test.mjs', 'tests/b.test.mjs'];
  writeFileSync(join(root, DEFAULT_TEST_MANIFEST), JSON.stringify(files));
  writeFileSync(join(root, files[0]), `import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
test('pass', () => {
  assert.equal(process.argv.length, 2, 'suite argv must not leak into a test worker');
  if (process.env.EXPECT_SLOT) {
    const dir = process.env.ATLAS_TEST_SLOT_DIR, token = process.env.ATLAS_TEST_SLOT_TOKEN;
    const shared = fs.existsSync(dir + '.shared/' + token + '.json');
    const path = shared ? dir + '.shared/' + token + '.json' : dir + '/owner.txt';
    const holder = JSON.parse(fs.readFileSync(path, 'utf8'));
    assert.equal(shared, process.env.EXPECT_SLOT === 'shared');
    if (shared) assert.equal(holder.tokens, 16);
    fs.writeFileSync(process.env.PROBE_OUT, JSON.stringify({pid: process.pid, token}));
  }
});
test('skipped', {skip: true}, () => assert.fail());
test('todo', {todo: true}, () => assert.fail('open'));
`);
  writeFileSync(join(root, files[1]), "import test from 'node:test'; test('fail', () => {throw Error('raw failure')});\n");
  // An unregistered test must never be discovered, even though it matches Node's default patterns.
  writeFileSync(join(root, 'tests', 'unregistered.test.mjs'), "throw Error('UNREGISTERED WAS RUN');\n");
  for (const args of [['--test-isolation=none'], ['--test-isolation', 'none']]) {
    const rejected = run(args);
    assert.notEqual(rejected.status, 0, rejected.stdout + rejected.stderr);
    assert.match(rejected.stdout + rejected.stderr, /curated npm test requires --test-isolation=process/);
    assert.doesNotMatch(rejected.stdout + rejected.stderr, /UNREGISTERED WAS RUN|raw failure|open/,
      'unsupported isolation fails before test files execute');
  }
  const fromEnv = run(['--test-name-pattern=^pass$'], {NODE_OPTIONS: '--test-isolation=none'});
  assert.equal(fromEnv.status, 0, fromEnv.stdout + fromEnv.stderr);
  assert.doesNotMatch(fromEnv.stdout + fromEnv.stderr, /UNREGISTERED WAS RUN|raw failure/,
    'explicit process isolation keeps inherited NODE_OPTIONS from broadening discovery');
  const normalize = text => text.replace(/\(\d+(?:\.\d+)?ms\)/g, '(TIME)')
    .replace(/duration_ms: \d+(?:\.\d+)?/g, 'duration_ms: TIME').replace(/duration_ms \d+(?:\.\d+)?/g, 'duration_ms TIME');
  for (const reporter of ['spec', 'tap']) {
    const args = [`--test-reporter=${reporter}`], native = run(args, {}, files), migrated = run(args);
    assert.equal(native.status, 1, native.stderr);
    assert.equal(migrated.status, native.status, migrated.stderr);
    assert.equal(normalize(migrated.stdout), normalize(native.stdout), 'same Node reporter output apart from durations');
    assert.doesNotMatch(migrated.stdout + migrated.stderr, /UNREGISTERED WAS RUN|called recursively/);
  }
  for (const [flag, mode] of [[undefined, 'shared'], ['0', 'exclusive']]) {
    const probe = join(root, `probe-${mode}.json`);
    const result = run(['--test-name-pattern=^(?:pass|todo|skipped)$'],
      {...(flag ? {ATLAS_SLOT_SHARED: flag} : {}), EXPECT_SLOT: mode, PROBE_OUT: probe});
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.ok(JSON.parse(readFileSync(probe)).token, 'workers inherit the live slot token');
    assert.equal(existsSync(join(root, 'slot')), false, 'exclusive slot released');
    for (const suffix of ['shared', 'nested', 'pending']) {
      const dir = join(root, `slot.${suffix}`);
      assert.deepEqual(existsSync(dir) ? readdirSync(dir) : [], [], `${suffix} records released`);
    }
  }
}));

test('npm test expands a command larger than the Windows shell limit in memory and rejects invalid manifests', () => defaultSuiteFixture(({root, run}) => {
  const files = Array.from({length: 276}, (_, i) => `tests/${String(i).padStart(3, '0')}-${'long-curated-name-'.repeat(3)}.test.mjs`);
  assert.ok(files.join(' ').length > 8191);
  for (const file of files) writeFileSync(join(root, file), "import test from 'node:test'; test('selected shard', () => {});\n");
  writeFileSync(join(root, DEFAULT_TEST_MANIFEST), JSON.stringify(files));
  const result = run(['--test-shard=1/276']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /tests 1\b/);
  for (const invalid of [[], [files[0], files[0]], ['tests/*.test.mjs'], ['tests/../escape.test.mjs'], {}]) {
    writeFileSync(join(root, DEFAULT_TEST_MANIFEST), JSON.stringify(invalid));
    const failed = run();
    assert.equal(failed.status, 1, failed.stdout + failed.stderr);
    assert.match(failed.stderr, /invalid curated test manifest/);
    assert.doesNotMatch(failed.stdout, /selected shard/);
  }
}));
test('reporter records title + file, excludes TODO, and completes with the raw failed status', async () => {
  mkdirSync('test-results', {recursive: true});
  // realpath: on the main checkout test-results is a junction to another drive, and
  // node's reporter reports the resolved file path, so the known-row path must match it.
  const root = realpathSync(mkdtempSync(resolve('test-results', 'atlas-reporter-')));
  try {
    const a = join(root, 'a.mjs'), b = join(root, 'b.mjs'), report = join(root, 'result.json');
    writeFileSync(a, "import test from 'node:test'; test('same title',()=>{throw Error('known')}); test('OPEN',{todo:true},()=>{throw Error('todo')});");
    writeFileSync(b, "import test from 'node:test'; test('same title',()=>{throw Error('new')});");
    const env = {...process.env, ATLAS_TEST_REPORT:report}; delete env.NODE_TEST_CONTEXT;
    const child = spawn(process.execPath, ['--test', '--test-reporter=./tests/helpers/failure-reporter.mjs', a, b], {env, stdio:'pipe'});
    let stderr = ''; child.stderr.on('data', b => {stderr += b;});
    const code = await new Promise((done, reject) => {child.on('error',reject);child.on('close',done);});
    assert.equal(code, 1, stderr);
    const result = JSON.parse(readFileSync(report));
    assert.equal(result.failures.length, 2); assert.equal(result.todos.length, 1);
    assert.equal(result.summary.counts.failed, 2); assert.equal(result.summary.counts.todo, 1);
    const known = [{title:'same title',file:relative(process.cwd(),a).replaceAll('\\','/')}];
    const checked = classify(result.failures, known);
    assert.equal(checked.matched.length, 1); assert.equal(checked.fresh.length, 1); assert.equal(checked.stale.length, 0);
  } finally {rmSync(root,{recursive:true,force:true});}
});

// Known-failures hardening (tests/helpers/known-failures.mjs, docs/test-fixes-2026-10-07.md): an allowlist keyed by
// title + file must not be able to wave a CONTRACT failure through like a flake.
import {validateKnown, titleClass} from './helpers/known-failures.mjs';
const DECISION = 'docs/owner-decision-x.md';
const docs = {[DECISION]: 'Owner decision: accept "CONTRACT: R1 >= 8 on Raiva" failing until M3 v4.\n'};
const readDoc = p => docs[p] ?? null;
const entry = o => ({title: 'HARD: x', file: 'tests/a.test.mjs', reason: 'r', owner: 'merger', class: 'HARD', ...o});
const contract = o => entry({title: 'CONTRACT: R1 >= 8 on Raiva', class: 'CONTRACT', decision: DECISION, ...o});
test('known-failures: valid HARD and CONTRACT entries pass validation', () => {
  assert.deepEqual(validateKnown({failures: []}, {readDoc}), []);
  assert.deepEqual(validateKnown({failures: [entry(), contract(), entry({title: 'untitled class', class: 'HARD'})]}, {readDoc}), []);
  assert.deepEqual(validateKnown({failures: [contract({decision: `${DECISION}#section`})]}, {readDoc}), [], 'an anchor is allowed');
  assert.equal(titleClass('CONTRACT: a'), 'CONTRACT'); assert.equal(titleClass('HARD (U2): b'), 'HARD'); assert.equal(titleClass('plain'), null);
});
test('known-failures: every unsafe entry is rejected (negative controls)', () => {
  const bad = {
    'no class': entry({class: undefined}),
    'unknown class': entry({class: 'PERF'}),
    'no reason': entry({reason: ''}),
    'no owner': entry({owner: undefined}),
    'perf file': entry({file: 'tests/perf/x.perf.test.mjs'}),
    'non-test file': entry({file: 'src/x.ts'}),
    'CONTRACT title listed as HARD': contract({class: 'HARD', decision: undefined}),
    'HARD title listed as CONTRACT': entry({class: 'CONTRACT', decision: DECISION}),
    'CONTRACT without decision': contract({decision: undefined}),
    'CONTRACT with empty decision': contract({decision: ' '}),
    'decision outside docs/': contract({decision: 'tests/known-failures.md'}),
    'decision path escaping docs/': contract({decision: 'docs/../README.md'}),
    'missing decision record': contract({decision: 'docs/nope.md'}),
    'decision record not naming the title': contract({title: 'CONTRACT: another pin', decision: DECISION}),
    'non-object': null,
  };
  for (const [name, e] of Object.entries(bad)) assert.ok(validateKnown({failures: [e]}, {readDoc}).length > 0, name);
  assert.ok(validateKnown({failures: [entry(), entry()]}, {readDoc}).some(p => /duplicate/.test(p)), 'duplicate');
  assert.ok(validateKnown({}).length > 0, 'failures must be an array');
  // The real decision reader: only existing files under docs/.
  assert.ok(validateKnown({failures: [contract({decision: 'docs/does-not-exist-2026.md'})]}).some(p => /does not exist/.test(p)));
});
test('known-failures: classify never matches a CONTRACT-titled failure through a bare title + file entry', () => {
  const failure = {title: 'CONTRACT: R1 >= 8 on Raiva', file: 'tests/a.test.mjs'};
  const bare = {title: failure.title, file: failure.file};
  assert.deepEqual(classify([failure], [bare]).fresh, [failure], 'bypassing validation still does not allow it');
  assert.deepEqual(classify([failure], [contract()]).matched, [failure], 'a CONTRACT entry with a decision does');
  const hard = {title: 'HARD: x', file: 'tests/a.test.mjs'};
  assert.deepEqual(classify([hard], [entry()]).matched, [hard]);
  assert.deepEqual(classify([hard], [entry({file: 'tests/b.test.mjs'})]).fresh, [hard], 'same title, other file is NEW');
});
test('known-failures: test:full rejects an invalid allowlist before running or taking the slot', async () => {
  mkdirSync('test-results', {recursive: true});
  const root = realpathSync(mkdtempSync(resolve('test-results', 'atlas-known-')));
  try {
    mkdirSync(join(root, 'tests', 'helpers'), {recursive: true});
    for (const f of ['test-runner.mjs', 'known-failures.mjs', 'test-slot.mjs', 'test-selection.mjs']) writeFileSync(join(root, 'tests', 'helpers', f), readFileSync(join('tests', 'helpers', f)));
    writeFileSync(join(root, 'tests', 'known-failures.json'), JSON.stringify({failures: [{title: 'CONTRACT: R1 >= 8 on Raiva', file: 'tests/a.test.mjs', reason: 'flaky?', owner: 'x', class: 'HARD'}]}));
    const slotDir = join(root, 'slot'), env = {...process.env, ATLAS_TEST_SLOT_DIR: slotDir}; delete env.NODE_TEST_CONTEXT;
    const child = spawn(process.execPath, ['tests/helpers/test-runner.mjs', 'full'], {cwd: root, env, stdio: 'pipe'});
    let out = ''; child.stdout.on('data', b => {out += b;}); child.stderr.on('data', b => {out += b;});
    const code = await new Promise((done, reject) => {child.on('error', reject); child.on('close', done);});
    assert.equal(code, 1, out);
    assert.match(out, /Rejected: tests\/known-failures\.json is invalid \(nothing was run\)/);
    assert.match(out, /the title declares CONTRACT but the entry says HARD/);
    assert.equal(existsSync(slotDir), false, 'the test slot was never taken');
    assert.equal(existsSync(join(root, 'test-results')), false, 'no report directory was created');
  } finally {rmSync(root, {recursive: true, force: true});}
});

// Shared slot wiring (plan I2): runTests takes its run class's slot class; flag off = exclusive exactly as before.
// Child process with a sandbox ATLAS_TEST_SLOT_DIR (TEST_SLOT_DIR is read at import); never the live slot.
test('runTests: test:pkg is a shared 4-token holder with ATLAS_SLOT_SHARED=1 and exclusive without it; children carry the token', async () => {
  mkdirSync('test-results', {recursive: true});
  const root = realpathSync(mkdtempSync(resolve('test-results', 'atlas-runner-slot-')));
  try {
    const probe = join(root, 'probe.test.mjs'), slotDir = join(root, 'slot');
    writeFileSync(probe, "import test from 'node:test'; import fs from 'node:fs'; test('probe', () => { const t = process.env.ATLAS_TEST_SLOT_TOKEN, d = process.env.ATLAS_TEST_SLOT_DIR, f = `${d}.shared/${t}.json`;"
      + " fs.writeFileSync(process.env.PROBE_OUT, JSON.stringify({token: t, holder: fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null, exclusive: fs.existsSync(`${d}/owner.txt`) ? JSON.parse(fs.readFileSync(`${d}/owner.txt`, 'utf8')) : null})); });\n");
    const runner = pathToFileURL(resolve('tests/helpers/test-runner.mjs')).href;
    for (const flag of ['1', '0']) {
      const out = join(root, `probe-${flag}.json`), env = {...process.env, ATLAS_TEST_SLOT_DIR: slotDir, ATLAS_SLOT_SHARED: flag, PROBE_OUT: out};
      delete env.NODE_TEST_CONTEXT; delete env.ATLAS_TEST_SLOT_TOKEN;
      const child = spawn(process.execPath, ['--input-type=module', '-e', `const {runTests} = await import(${JSON.stringify(runner)}); process.exitCode = await runTests([${JSON.stringify(probe)}], {runClass: 'pkg'});`], {env, stdio: 'pipe'});
      let log = ''; child.stdout.on('data', b => {log += b;}); child.stderr.on('data', b => {log += b;});
      assert.equal(await new Promise((done, reject) => {child.on('error', reject); child.on('close', done);}), 0, log);
      const seen = JSON.parse(readFileSync(out, 'utf8'));
      if (flag === '1') {
        assert.equal(seen.exclusive, null); assert.equal(seen.holder.token, seen.token);
        assert.deepEqual([seen.holder.class, seen.holder.tokens], ['shared', 4]); assert.match(seen.holder.name, /pkg, shared 4 tokens/);
      } else {
        assert.equal(seen.holder, null); assert.equal(seen.exclusive.token, seen.token, 'exclusive owner.txt token reaches the test process');
      }
      assert.equal(existsSync(slotDir), false); assert.equal(existsSync(`${slotDir}.shared`) && readdirSync(`${slotDir}.shared`).some(n => n.endsWith('.json')), false);
    }
  } finally {rmSync(root, {recursive: true, force: true});}
});
