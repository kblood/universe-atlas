import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {importGraph, selectTests, registeredTests} from './helpers/test-selection.mjs';
import {classify} from './helpers/test-runner.mjs';
test('literal forms, transitive chains, directory and repo path references, unregistered and configuration', () => {
  mkdirSync('test-results', {recursive: true});
  const root = mkdtempSync(join(process.cwd(), 'test-results', 'atlas-selection-'));
  const put = (p, s) => { mkdirSync(join(root, p, '..'), {recursive: true}); writeFileSync(join(root, p), s); };
  try {
    put('package.json', JSON.stringify({scripts: {test: 'any wrapper -- node --test tests/a.test.mjs tests/b.test.mjs'}}));
    put('tests/a.test.mjs', "import './helpers/h.mjs';");
    put('tests/helpers/h.mjs', "export {x} from '../../src/foo.js'; import('../../src/bar.ts'); new URL('../../src/data.ts', import.meta.url); const files=['src/ref.ts'];");
    put('src/foo.ts', "import {x} from './nested';"); put('src/nested/index.ts', '');
    for (const p of ['bar','data','ref']) put(`src/${p}.ts`, '');
    put('tests/b.test.mjs', "new URL('../src/', import.meta.url)");
    put('tests/new.test.mjs', '');
    const registered = registeredTests(root), graph = importGraph(root);
    for (const path of ['src/nested/index.ts','src/bar.ts','src/data.ts','src/ref.ts']) assert.ok(selectTests([path], registered, graph).selected.some(s => s.file === 'tests/a.test.mjs'), path);
    assert.match(selectTests(['src/ref.ts'], registered, graph).selected[0].reason, /references path/);
    assert.ok(selectTests(['src/ref.ts'], registered, graph).selected.some(s => s.file === 'tests/b.test.mjs'), 'directory URL dependency');
    assert.equal(selectTests(['tests/new.test.mjs'], registered, graph).selected[0].unregistered, true);
    assert.equal(selectTests(['package.json'], registered, graph).selected.length, 2);
    assert.deepEqual(selectTests(['vite.config.ts'], registered, graph).outside, ['vite.config.ts']);
  } finally { rmSync(root, {recursive: true, force: true}); }
});
test('known failure matching requires both title and file; fixes are stale entries', () => {
  const known = [{title:'same',file:'tests/a.test.mjs'}, {title:'fixed',file:'tests/b.test.mjs'}];
  const result = classify([{title:'same',file:'tests/a.test.mjs'}, {title:'same',file:'tests/c.test.mjs'}], known);
  assert.equal(result.matched.length, 1); assert.equal(result.fresh.length, 1); assert.equal(result.stale[0].title, 'fixed');
});
