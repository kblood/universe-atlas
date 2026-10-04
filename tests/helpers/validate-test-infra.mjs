// Explicit acceptance harness. B deliberately mutates ONE source at a time and
// restores exact bytes in finally; never run concurrently with an editor.
import {readFileSync, writeFileSync, mkdirSync, openSync, closeSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {registeredTests, importGraph, selectTests, git} from './test-selection.mjs';
import {classify} from './test-runner.mjs';
const out = 'test-results/test-infra'; mkdirSync(out, {recursive: true});
process.env.ATLAS_TEST_SLOT_DIR = resolve(out, 'slot');
function run(args, log, env = {}) {
  const fd = openSync(log, 'w');
  return new Promise((done, reject) => {
    const child = spawn(process.execPath, args, {env: {...process.env, ...env}, stdio: ['ignore', fd, fd]});
    child.on('error', reject); child.on('close', code => { closeSync(fd); done(code); });
  });
}
if (process.argv[2] === 'A') {
  const log = `${out}/A-concurrency.log`, fd = openSync(log, 'w');
  const rows = [];
  function contender(name) {
    return new Promise((done, reject) => {
      const body = `console.log('${name} start '+Date.now());setTimeout(()=>console.log('${name} end '+Date.now()),1500)`;
      const child = spawn(process.execPath, ['tests/helpers/test-slot.mjs', '--', process.execPath, '-e', body], {env: {...process.env, ATLAS_TEST_SLOT_DIR: resolve(out, 'A-slot')}, stdio: ['ignore','pipe','pipe']});
      for (const stream of [child.stdout, child.stderr]) stream.on('data', b => { const s = b.toString(); rows.push(s); writeFileSync(fd, s); });
      child.on('error', reject); child.on('close', done);
    });
  }
  const codes = await Promise.all([contender('one'), contender('two')]); closeSync(fd);
  const text = rows.join(''); assert.deepEqual(codes, [0,0]); assert.match(text, /waiting for test slot/);
  const events = [...text.matchAll(/(one|two) (start|end) (\d+)/g)].map(m => ({name:m[1],kind:m[2],time:Number(m[3])}));
  const starts = events.filter(e => e.kind === 'start').sort((a,b) => a.time-b.time);
  assert.ok(starts[1].time >= events.find(e => e.name === starts[0].name && e.kind === 'end').time);
  console.log(`A: exits ${codes}; serialized timestamps verified; ${log}`);
} else if (process.argv[2] === 'B') {
  const cases = [
    {commit:'248b929', file:'src/place-query.ts', from:'const floor = dated.floor(direction).floorM;', to:'const floor = dated.floor(direction).floorM + 12345;'},
    {commit:'76bb72a', file:'src/fauna-composer-eye.ts', from:'Object.freeze({segments: 12, stations: 3, lens:', to:'Object.freeze({segments: 14, stations: 5, lens:'},
    {commit:'9032eb1', file:'src/view-heading.ts', from:'return forward.normalize();', to:'return forward.normalize().negate();'},
  ];
  const known = JSON.parse(readFileSync('tests/known-failures.json')).failures;
  const summary = [];
  for (const c of cases) {
    if (process.argv.length > 3 && !process.argv.slice(3).includes(c.commit)) continue;
    assert.ok(git(['diff', '--name-only', `${c.commit}^`, c.commit, '--', 'src']).split('\n').includes(c.file));
    const original = readFileSync(c.file), text = original.toString(); assert.ok(text.includes(c.from), c.file);
    const hash = createHash('sha256').update(original).digest('hex');
    const prefix = `${out}/B-${c.commit}${process.env.ATLAS_INFRA_RUN_SUFFIX || ''}`;
    let result;
    try {
      writeFileSync(`${prefix}.source-backup`, original);
      writeFileSync(c.file, text.replace(c.from, c.to));
      // Same selector as test:affected --dry-run, with historical source change
      // isolated from this task's package.json edits (which correctly select all).
      const changed = [c.file], selection = selectTests(changed, registeredTests(), importGraph());
      writeFileSync(`${prefix}-selection.log`, `Changed: ${changed}\n` + selection.selected.map(s => `${s.file}: ${s.reason}`).join('\n') + `\n${selection.selected.length} selected\n`);
      const report = resolve(`${prefix}-failures.json`);
      const args = ['tests/helpers/test-slot.mjs', '--', process.execPath, '--test', '--test-reporter=spec', '--test-reporter-destination=stdout', '--test-reporter=./tests/helpers/failure-reporter.mjs', `--test-reporter-destination=${resolve(`${prefix}-reporter.txt`)}`, ...registeredTests()];
      console.log(`B ${c.commit}: full registered suite with deliberate mutation ${c.file}`);
      const raw = await run(args, `${prefix}-full.log`, {ATLAS_TEST_REPORT: report});
      const failures = JSON.parse(readFileSync(report)).failures;
      const fresh = classify(failures, known).fresh, failingFiles = [...new Set(fresh.map(f => f.file))];
      const missed = failingFiles.filter(f => !selection.selected.some(s => s.file === f));
      result = {...c, command: [process.execPath, ...args], rawExitCode: raw, selected: selection.selected, failures, newFailingFiles: failingFiles, missed, subset: !missed.length, originalSHA256: hash};
    } finally {
      writeFileSync(c.file, original); assert.deepEqual(readFileSync(c.file), original);
      assert.equal(git(['diff', '--stat', '--', c.file]), '');
    }
    result.restoredByteIdentically = true;
    writeFileSync(`${prefix}-result.json`, JSON.stringify(result, null, 2));
    summary.push(result); writeFileSync(`${out}/B-summary.json`, JSON.stringify(summary, null, 2));
    console.log(`B ${c.commit}: raw ${result.rawExitCode}; ${result.newFailingFiles.length} failing files / ${result.selected.length} selected; subset ${result.subset}; restored`);
    assert.ok(result.newFailingFiles.length > 0, 'mutation must be caught'); assert.ok(result.subset, `missed: ${result.missed}`);
  }
} else throw new Error('usage: node tests/helpers/validate-test-infra.mjs A|B');
