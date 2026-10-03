import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {join, resolve, relative} from 'node:path';
import {spawn} from 'node:child_process';
import {classify} from './helpers/test-runner.mjs';
test('reporter records title + file, excludes TODO, and completes with the raw failed status', async () => {
  mkdirSync('test-results', {recursive: true});
  const root = mkdtempSync(resolve('test-results', 'atlas-reporter-'));
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
