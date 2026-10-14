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
    put('package.json', JSON.stringify({scripts: {test: 'any wrapper -- node --test tests/a.test.mjs tests/b.test.mjs'}, imports: {
      '#kit/entry': './src/kit/entry.ts', '#kit/*': {types: './src/types/*.d.ts', default: './src/kit/*.ts'},
    }}));
    put('tests/a.test.mjs', "import './helpers/h.mjs'; import '#kit/entry'; import '#kit/nested';");
    put('tests/helpers/h.mjs', "export {x} from '../../src/foo.js'; import('../../src/bar.ts'); new URL('../../src/data.ts', import.meta.url); const files=['src/ref.ts'];");
    put('src/kit/entry.ts', "export {x} from './shared.ts';"); put('src/kit/shared.ts', '');
    put('src/kit/nested.ts', ''); put('src/types/nested.d.ts', '');
    put('src/foo.ts', "import {x} from './nested';"); put('src/nested/index.ts', '');
    for (const p of ['bar','data','ref']) put(`src/${p}.ts`, '');
    put('tests/b.test.mjs', "new URL('../src/', import.meta.url)");
    put('tests/new.test.mjs', '');
    const registered = registeredTests(root), graph = importGraph(root);
    for (const path of ['src/nested/index.ts','src/bar.ts','src/data.ts','src/ref.ts','src/kit/shared.ts','src/types/nested.d.ts']) assert.ok(selectTests([path], registered, graph).selected.some(s => s.file === 'tests/a.test.mjs'), path);
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

// test:affected semantic package.json diff (plan I5 + critic correction): scripts.test token set >= base AND identical text
// around the paths -> no forced full run (appended paths are selected); anything else -> full suite.
import {packageJsonChange} from './helpers/test-selection.mjs';
const PREFIX = 'node tests/helpers/test-slot.mjs -- node --test';
const pkgText = (test, extra = {}) => JSON.stringify({name: 'atlas', scripts: {build: 'vite build', test}, devDependencies: {vite: '1'}, ...extra}, null, 2);
const BASE = pkgText(`${PREFIX} tests/a.test.mjs tests/b.test.mjs`);
test('I5: appended or reordered test paths with an identical wrapper never force the full suite', () => {
  const appended = packageJsonChange(BASE, pkgText(`${PREFIX} tests/a.test.mjs tests/b.test.mjs tests/c.test.mjs`));
  assert.deepEqual([appended.full, appended.added], [false, ['tests/c.test.mjs']]);
  assert.deepEqual(packageJsonChange(BASE, pkgText(`${PREFIX} tests/b.test.mjs tests/a.test.mjs`)), {full: false, added: [], reason: 'scripts.test reordered only'});
  assert.equal(packageJsonChange(BASE, BASE).full, false, 'unchanged');
  assert.equal(packageJsonChange(BASE, JSON.stringify(JSON.parse(BASE))).full, false, 'formatting only');
  const registered = ['tests/a.test.mjs', 'tests/b.test.mjs', 'tests/c.test.mjs'], graph = new Map();
  const {selected, outside} = selectTests(['package.json'], registered, graph, {pkg: appended});
  assert.deepEqual(selected.map(s => [s.file, s.reason]), [['tests/c.test.mjs', 'newly registered in package.json scripts.test']]);
  assert.deepEqual(outside, [], 'the reviewed package.json is not reported for manual review');
});
test('I5: a changed wrapper prefix, a removed path, other text or any other key selects the full suite', () => {
  const full = (head, why) => { const r = packageJsonChange(BASE, head); assert.equal(r.full, true, why); assert.match(r.reason, /./); return r; };
  assert.match(full(pkgText(`node tests/helpers/test-slot.mjs --shared 16 -- node --test --test-concurrency=16 tests/a.test.mjs tests/b.test.mjs tests/c.test.mjs`), 'prefix (I2 flags)').reason, /prefix changed/);
  assert.match(full(pkgText(`${PREFIX} tests/a.test.mjs tests/c.test.mjs`), 'b removed').reason, /removed tests\/b\.test\.mjs/);
  assert.match(full(pkgText(`${PREFIX} tests/a.test.mjs --test-only tests/b.test.mjs`), 'flag between paths').reason, /outside its test paths/);
  full(pkgText(`${PREFIX} tests/a.test.mjs tests/b.test.mjs && echo done`), 'suffix');
  assert.match(full(pkgText(`${PREFIX} tests/a.test.mjs tests/b.test.mjs`, {devDependencies: {vite: '2'}}), 'dependency').reason, /outside scripts\.test/);
  full(JSON.stringify({...JSON.parse(BASE), scripts: {...JSON.parse(BASE).scripts, 'test:pkg': 'x'}}), 'another script');
  full(pkgText('vitest'), 'no paths'); full('{', 'unparsable'); full(null, 'deleted');
  assert.equal(packageJsonChange(null, BASE).full, true, 'absent at base');
  // selectTests: a full verdict, or no verdict at all, keeps today's fail-closed behaviour.
  const registered = ['tests/a.test.mjs', 'tests/b.test.mjs'], graph = new Map();
  for (const pkg of [packageJsonChange(BASE, '{'), undefined]) assert.equal(selectTests(['package.json'], registered, graph, {pkg}).selected.length, 2);
  assert.match(selectTests(['package.json'], registered, graph, {pkg: packageJsonChange(BASE, '{')}).selected[0].reason, /full suite: package\.json changed \(package\.json missing or unparsable/);
  assert.equal(selectTests(['package.json', 'tsconfig.json'], registered, graph, {pkg: packageJsonChange(BASE, BASE)}).selected.length, 2, 'tsconfig still forces full');
});
test('review 4/8: only paths in the node --test argument list count; moving one out of it, or an unsupported script, forces full', () => {
  const S = `${PREFIX} tests/a.test.mjs tests/b.test.mjs && echo done`;
  assert.equal(packageJsonChange(pkgText(S), pkgText(`${PREFIX} tests/a.test.mjs && echo tests/b.test.mjs done`)).full, true, 'b moved out of node --test');
  assert.equal(packageJsonChange(pkgText(S), pkgText(`${PREFIX} tests/a.test.mjs tests/b.test.mjs tests/c.test.mjs && echo done`)).full, false, 'append before an unchanged suffix');
  assert.equal(packageJsonChange(pkgText('node x.mjs tests/a.test.mjs'), pkgText('node x.mjs tests/a.test.mjs tests/c.test.mjs')).full, true, 'paths not given to node --test');
  assert.equal(packageJsonChange(pkgText('vitest'), JSON.stringify(JSON.parse(pkgText('vitest')))).full, true, 'unchanged but unsupported (no paths)');
  assert.equal(packageJsonChange(BASE, JSON.stringify(JSON.parse(BASE))).full, false, 'unchanged supported script, formatting only');
});
test('scripts/**/*.test.mjs is a registered test path: registry, argument list, import graph and the allowlist rule', async () => {
  mkdirSync('test-results', {recursive: true});
  const root = mkdtempSync(join(process.cwd(), 'test-results', 'atlas-selection-scripts-'));
  const put = (p, s) => { mkdirSync(join(root, p, '..'), {recursive: true}); writeFileSync(join(root, p), s); };
  try {
    put('package.json', JSON.stringify({scripts: {test: 'w -- node --test tests/a.test.mjs scripts/tool/x.test.mjs'}}));
    put('tests/a.test.mjs', ''); put('tests/helpers/slot.mjs', '');
    put('scripts/tool/x.test.mjs', "import './x.mjs';"); put('scripts/tool/x.mjs', "import '../../tests/helpers/slot.mjs';");
    const registered = registeredTests(root), graph = importGraph(root);
    assert.deepEqual(registered, ['tests/a.test.mjs', 'scripts/tool/x.test.mjs']);
    for (const changed of ['scripts/tool/x.mjs', 'tests/helpers/slot.mjs']) assert.deepEqual(selectTests([changed], registered, graph).selected.map(s => s.file), ['scripts/tool/x.test.mjs'], changed);
    const {testArgumentList} = await import('./helpers/test-selection.mjs');
    assert.deepEqual(testArgumentList('w -- node --test tests/a.test.mjs scripts/tool/x.test.mjs')?.paths, ['tests/a.test.mjs', 'scripts/tool/x.test.mjs']);
    assert.equal(testArgumentList('w -- node --test tests/a.test.mjs && node scripts/tool/x.test.mjs'), null, 'a scripts/ path outside the list is unsupported');
    const {validateKnown} = await import('./helpers/known-failures.mjs');
    const entry = file => ({failures: [{title: 't', file, reason: 'r', owner: 'o', class: 'HARD'}]});
    assert.deepEqual(validateKnown(entry('scripts/tool/x.test.mjs')), []);
    assert.equal(validateKnown(entry('tests/perf/x.perf.test.mjs')).length > 0, true, 'perf is never allowlisted');
  } finally { rmSync(root, {recursive: true, force: true}); }
});
