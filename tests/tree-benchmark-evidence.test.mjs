import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { loadConfigFromFile } from 'vite';
import { checkoutIdentity, createBuildInfo, gitIdentity, identityUntrackedAllowlist, sourceCleanliness, publicBuildIdentity } from '../scripts/build-identity.mjs';
import { fetchServedIdentity, fetchPageServedIdentity, sameServedIdentity, verifyServedIdentity } from './helpers/tree-benchmark-identity.mjs';
import { pairedPreparationTrials } from './helpers/tree-preparation-trials.mjs';

const root = resolve('.');
const atlasCommit = 'a'.repeat(40), treeKitCommit = 'b'.repeat(40);
const served = (changes = {}) => ({ build: { mode: 'development', builtAt: '2026-10-14T00:00:00.000Z',
  atlas: { commit: atlasCommit, dirty: false, workingTree: '' },
  treeKit: { commit: treeKitCommit, dirty: false, workingTree: '' }, ...changes } });
const expected = { atlasCommit, treeKitCommit };

test('checkout/build metadata preserve exact commits and explicit cleanliness for both repositories', () => {
  const actual = checkoutIdentity(root), build = createBuildInfo(root);
  for (const [name, path] of [['atlas', root], ['treeKit', resolve(root, 'external/tree-kit')]]) {
    const git = args => execFileSync('git', ['-C', path, ...args], { encoding: 'utf8', windowsHide: true }).trim();
    assert.equal(actual[name].commit, git(['rev-parse', 'HEAD']));
    const rawEntries = execFileSync('git', ['-C', path, 'status', '--porcelain=v1', '-z', '--untracked-files=all'],
      { encoding: 'utf8', windowsHide: true }).split('\0').filter(Boolean);
    assert.deepEqual(actual[name].workingTreeEntries, rawEntries);
    assert.equal(actual[name].workingTree, rawEntries.join('\n').trim());
    assert.equal(actual[name].dirty, actual[name].workingTree.length > 0);
    assert.deepEqual(build[name], publicBuildIdentity(actual[name]));
  }
  assert.equal(build.commit, actual.atlas.commit, 'backward-compatible pinned Atlas commit');
  assert.equal(build.dirty, actual.atlas.dirty);
  assert.equal(build.mode, 'build');
});

test('production build metadata retains identity and status digests while omitting every raw path field', () => {
  const entries = [' M src/private-fixture.ts', '?? private-fixture-notes.txt'];
  const detailed = { commit: atlasCommit, branch: 'test', subject: 'fixture', dirty: true,
    workingTree: entries.join('\n').trim(), workingTreeEntries: entries,
    ...sourceCleanliness(entries, ['private-fixture-notes.txt']), error: 'private-fixture-error-path' };
  const summary = publicBuildIdentity(detailed);
  assert.equal(summary.commit, atlasCommit);
  assert.equal(summary.dirty, true);
  assert.equal(summary.sourceDirty, true);
  assert.equal(summary.workingTreeEntryCount, 2);
  assert.equal(summary.sourceEntryCount, 1);
  assert.equal(summary.allowedUntrackedPathCount, 1);
  assert.equal(summary.excludedUntrackedPathCount, 1);
  assert.match(summary.workingTreeSha256, /^[a-f\d]{64}$/);
  for (const raw of ['workingTree', 'workingTreeEntries', 'sourceWorkingTree', 'allowedUntrackedPaths', 'excludedUntrackedPaths', 'error']) {
    assert.equal(Object.hasOwn(summary, raw), false, raw);
  }
  assert.equal(JSON.stringify(summary).includes('private-fixture'), false);
  const actualBuild = createBuildInfo(root), actual = checkoutIdentity(root);
  assert.equal(actualBuild.mode, 'build');
  for (const scope of [actualBuild, actualBuild.atlas, actualBuild.treeKit]) {
    for (const raw of ['workingTree', 'workingTreeEntries', 'sourceWorkingTree', 'allowedUntrackedPaths', 'excludedUntrackedPaths', 'error']) {
      assert.equal(Object.hasOwn(scope, raw), false, raw);
    }
  }
  const serialized = JSON.stringify(actualBuild);
  for (const identity of Object.values(actual)) {
    for (const entry of identity.workingTreeEntries) assert.equal(serialized.includes(entry), false);
    for (const path of identity.allowedUntrackedPaths) assert.equal(serialized.includes(path), false);
  }
});

test('production verification requires consistent sanitized counts and exact expected status digests', () => {
  const detailed = (commit, entries = []) => ({ commit, branch: 'test', subject: 'fixture',
    workingTreeEntries: entries, ...sourceCleanliness(entries) });
  const atlasStatus = publicBuildIdentity(detailed(atlasCommit)), treeKitStatus = publicBuildIdentity(detailed(treeKitCommit));
  const build = { mode: 'build', builtAt: '2026-10-14T00:00:00.000Z', atlas: atlasStatus, treeKit: treeKitStatus };
  const expectedBuild = { ...expected, atlasStatus, treeKitStatus };
  assert.ok(verifyServedIdentity({ build }, expectedBuild).every(row => row.passed));
  const dirtyLocal = publicBuildIdentity(detailed(atlasCommit, [' M src/changed.ts']));
  assert.equal(verifyServedIdentity({ build }, { ...expectedBuild, atlasStatus: dirtyLocal })
    .find(row => row.code === 'served-atlas-expected-status').passed, false, 'same HEAD cannot hide changed local source');
  assert.equal(verifyServedIdentity({ build }, expected).find(row => row.code === 'served-atlas-expected-status').passed, false);
  for (const changes of [{ sourceDirty: true }, { workingTreeEntryCount: 1 }, { sourceEntryCount: 1 },
    { excludedUntrackedPathCount: 1 }, { workingTreeSha256: 'bad' }, { workingTree: ' M private-path.ts' }]) {
    const changed = { ...build, atlas: { ...atlasStatus, ...changes } };
    assert.equal(verifyServedIdentity({ build: changed }, expectedBuild)
      .find(row => row.code === 'served-atlas-identity').passed, false);
  }
  assert.equal(sameServedIdentity({ build }, { build: { ...build, atlas: dirtyLocal } }), false);
});

test('source cleanliness excludes only explicitly allowed untracked paths and records them', () => {
  assert.deepEqual(identityUntrackedAllowlist('[]'), []);
  const allowlist = identityUntrackedAllowlist('["local-notes.txt"]');
  assert.deepEqual(sourceCleanliness(['?? local-notes.txt'], allowlist), {
    sourceDirty: false, sourceWorkingTree: '', allowedUntrackedPaths: ['local-notes.txt'], excludedUntrackedPaths: ['local-notes.txt'],
  });
  for (const entry of [' M local-notes.txt', 'M  local-notes.txt', '?? src/new.ts', '?? other/local-notes.txt']) {
    assert.equal(sourceCleanliness(['?? local-notes.txt', entry], allowlist).sourceDirty, true);
  }
  assert.equal(sourceCleanliness(['?? local-notes.txt']).sourceDirty, true, 'default policy excludes nothing');
  for (const value of ['["../escape"]', '["/absolute"]', '["src/*"]', '[".git/config"]', '"notes.txt"']) {
    assert.throws(() => identityUntrackedAllowlist(value));
  }
  const source = sourceCleanliness(['?? local-notes.txt'], allowlist);
  const findings = verifyServedIdentity(served({ atlas: { commit: atlasCommit, dirty: true,
    workingTree: '?? local-notes.txt', workingTreeEntries: ['?? local-notes.txt'], ...source } }), expected);
  assert.ok(findings.every(row => row.passed));
  assert.deepEqual(findings.find(row => row.code === 'served-atlas-clean').observed.excludedUntrackedPaths, ['local-notes.txt']);
});

test('source/config/runtime files cannot be excluded even through a direct cleanliness call', () => {
  const sourceLikePaths = ['src/new.ts', 'new.ts', 'new.js', 'new.mjs', 'new.cjs', 'new.json', 'new.html',
    'vite.config.ts', 'config', 'config.txt', 'CMakeLists.txt', 'requirements.txt', 'settings.txt',
    'style.css', 'shader.glsl', 'runtime.wasm', 'model.glb', 'model.gltf', 'texture.png', 'texture.ktx2',
    'audio.wav', 'sprite.svg', 'public/notes.txt', 'src/notes.txt', 'assets/notes.txt', 'external/notes.txt'];
  for (const path of sourceLikePaths) {
    assert.throws(() => identityUntrackedAllowlist(JSON.stringify([path])), /cannot be excluded/, path);
    assert.throws(() => sourceCleanliness([`?? ${path}`], [path]), /cannot be excluded/, path);
    assert.equal(sourceCleanliness([`?? ${path}`]).sourceDirty, true, path);
    const staleMetadata = served({ atlas: { commit: atlasCommit, dirty: true, workingTree: `?? ${path}`,
      workingTreeEntries: [`?? ${path}`], sourceDirty: false, sourceWorkingTree: '',
      allowedUntrackedPaths: [path], excludedUntrackedPaths: [path] } });
    assert.ok(verifyServedIdentity(staleMetadata, expected).some(row => !row.passed), path);
  }
  const allowed = identityUntrackedAllowlist('["local-notes.txt","session-history.txt"]');
  const evidence = sourceCleanliness(['?? local-notes.txt', '?? session-history.txt'], allowed);
  assert.equal(evidence.sourceDirty, false);
  assert.deepEqual(evidence.allowedUntrackedPaths, allowed);
  assert.deepEqual(evidence.excludedUntrackedPaths, allowed);
});

test('served source-cleanliness fields must exactly match the full raw status records', () => {
  const entries = [' M src/foo.ts', '?? local-notes.txt'];
  const identity = { commit: atlasCommit, dirty: true, workingTree: entries.join('\n').trim(),
    workingTreeEntries: entries, ...sourceCleanliness(entries, ['local-notes.txt']) };
  const verify = changes => verifyServedIdentity(served({ atlas: { ...identity, ...changes } }), expected);
  assert.equal(verify({}).find(row => row.code === 'served-atlas-identity').passed, true);
  assert.equal(verify({}).find(row => row.code === 'served-atlas-clean').passed, false);
  for (const changes of [{ sourceDirty: false, sourceWorkingTree: '' },
    { sourceWorkingTree: 'M src/other.ts' }, { excludedUntrackedPaths: [] },
    { excludedUntrackedPaths: ['local-notes.txt', 'local-notes.txt'] },
    { workingTreeEntries: ['?? local-notes.txt'], sourceDirty: false, sourceWorkingTree: '' },
    { workingTreeEntries: undefined }]) {
    assert.equal(verify(changes).find(row => row.code === 'served-atlas-identity').passed, false);
  }
  // One filename can contain newlines that resemble another status record.
  // Retaining original record boundaries prevents a note exclusion hiding it.
  const unusual = ['?? local-notes.txt\n?? local-notes.txt'];
  const preserved = { commit: atlasCommit, dirty: true, workingTree: unusual.join('\n').trim(),
    workingTreeEntries: unusual, ...sourceCleanliness(unusual, ['local-notes.txt']) };
  assert.equal(verifyServedIdentity(served({ atlas: preserved }), expected)
    .find(row => row.code === 'served-atlas-clean').passed, false);
  assert.equal(verifyServedIdentity(served({ atlas: { ...preserved, sourceDirty: false,
    sourceWorkingTree: '', excludedUntrackedPaths: ['local-notes.txt'] } }), expected)
    .find(row => row.code === 'served-atlas-identity').passed, false);
});

test('an absent kit or directory inside the parent checkout cannot inherit Atlas identity', () => {
  for (const path of [resolve(root, 'src'), resolve(root, '__missing-tree-kit-repository__')]) {
    const identity = gitIdentity(path);
    assert.equal(identity.commit, null);
    assert.equal(identity.dirty, null);
    assert.match(identity.error, /.+/);
  }
});

test('served release identity rejects missing, old, dirty, inconsistent, and mismatched identities', () => {
  assert.ok(verifyServedIdentity(served(), expected).every(row => row.passed));
  for (const bad of [null, { build: { commit: atlasCommit, dirty: false } },
    served({ treeKit: { commit: 'short', dirty: false, workingTree: '' } }),
    served({ atlas: { commit: atlasCommit, dirty: true, workingTree: ' M src/app.ts' } }),
    served({ atlas: { commit: atlasCommit, dirty: false, workingTree: ' M src/app.ts' } })]) {
    assert.ok(verifyServedIdentity(bad, expected).some(row => !row.passed));
  }
  assert.equal(verifyServedIdentity(served(), { ...expected, treeKitCommit: 'c'.repeat(40) })
    .find(row => row.code === 'served-treeKit-expected-commit').passed, false);
  assert.equal(verifyServedIdentity(served(), {}).find(row => row.code === 'served-atlas-expected-commit').passed, false);
});

test('served identity fetch bypasses cache and fails on HTTP errors', async () => {
  const evidence = await fetchServedIdentity('https://atlas.example/release/?seed=1', {
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://atlas.example/release/build-info.json');
      assert.equal(options.cache, 'no-store');
      assert.ok(options.signal instanceof AbortSignal);
      return { ok: true, json: async () => served().build };
    },
  });
  assert.deepEqual(evidence.build, served().build);
  await assert.rejects(fetchServedIdentity('https://atlas.example/', {
    fetchImpl: async () => ({ ok: false, status: 404 }),
  }), /HTTP 404/);
});

test('browser identity fetch binds to the actual page origin and deployment path', async () => {
  const page = { evaluate: (fn, path) => runInNewContext(`(${fn.toString()})(path)`, {
    path, URL, AbortSignal, location: { href: 'https://actual.example/release/tests/tree-instance-api-bench.html' },
    fetch: async (url, options) => {
      assert.equal(url, 'https://actual.example/release/build-info.json');
      assert.equal(options.cache, 'no-store');
      return { ok: true, json: async () => served().build };
    },
  }) };
  const evidence = await fetchPageServedIdentity(page, 'https://requested.example/release/');
  assert.equal(evidence.pageUrl, 'https://actual.example/release/tests/tree-instance-api-bench.html');
  assert.equal(evidence.build.treeKit.commit, treeKitCommit);
});

test('capture stability detects commit, dirty-state, working-tree, and rebuilt artifact changes', () => {
  assert.equal(sameServedIdentity(served(), served()), true);
  for (const changed of [served({ treeKit: { commit: 'c'.repeat(40), dirty: false, workingTree: '' } }),
    served({ atlas: { commit: atlasCommit, dirty: true, workingTree: ' M app.ts' } })]) {
    assert.equal(sameServedIdentity(served(), changed), false);
  }
  assert.equal(sameServedIdentity(served({ mode: 'build' }), served({ mode: 'build', builtAt: 'later' })), false);
  assert.equal(sameServedIdentity(served({ mode: 'development' }),
    served({ mode: 'development', builtAt: 'later' })), true, 'dev observation time is not a rebuild');
});

test('Vite dev middleware exposes current Atlas and Tree Kit metadata without starting a server', async () => {
  const loaded = await loadConfigFromFile({ command: 'serve', mode: 'development' }, resolve(root, 'vite.config.ts'));
  const plugin = loaded.config.plugins.find(plugin => plugin.name === 'publish-orbit-docs');
  let middleware;
  plugin.configureServer({ middlewares: { use(fn) { middleware = fn; } } });
  let nextCalls = 0, body;
  const headers = {};
  const response = { setHeader(key, value) { headers[key] = value; }, end(value) { body = value; } };
  middleware({ url: '/other.json' }, response, () => nextCalls++);
  assert.equal(nextCalls, 1);
  middleware({ url: '/build-info.json?uncached=1' }, response, () => nextCalls++);
  const build = JSON.parse(body), local = checkoutIdentity(root);
  assert.deepEqual(build.atlas, local.atlas);
  assert.deepEqual(build.treeKit, local.treeKit);
  assert.equal(build.mode, 'development');
  assert.equal(headers['Cache-Control'], 'no-store');
  assert.equal(headers['Content-Type'], 'application/json');
});

test('preparation warmup is separately retained and excluded from alternating measured trials', async () => {
  const calls = [];
  const result = await pairedPreparationTrials({ warmupTrials: 3, trials: 4,
    measure: async variant => { calls.push(variant); return { elapsedMs: calls.length }; } });
  assert.deepEqual(calls, ['baseline', 'candidate', 'candidate', 'baseline', 'baseline', 'candidate',
    'baseline', 'candidate', 'candidate', 'baseline', 'baseline', 'candidate', 'candidate', 'baseline']);
  assert.deepEqual(result.warmup.baseline.map(row => row.elapsedMs), [1, 4, 5]);
  assert.deepEqual(result.trials.baseline.map(row => row.elapsedMs), [7, 10, 11, 14]);
  assert.deepEqual(result.trials.candidate.map(row => row.elapsedMs), [8, 9, 12, 13]);
  assert.deepEqual(result.trials.baseline.map(row => row.pairOrder),
    ['baseline,candidate', 'candidate,baseline', 'baseline,candidate', 'candidate,baseline']);
});
