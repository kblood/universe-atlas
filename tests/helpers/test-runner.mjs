import {readFileSync, mkdtempSync, rmSync, readdirSync, existsSync, mkdirSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {cpus} from 'node:os';
import {execFileSync} from 'node:child_process';
import {withTestSlot, runCommand, slotClass, boundTestConcurrency} from './test-slot.mjs';
import {registeredTests, changedFiles, baseRef, importGraph, selectTests, packageJsonChangeSince} from './test-selection.mjs';
import {classify, validateKnown} from './known-failures.mjs';
export {classify, validateKnown};

// Every CPU-heavy run takes the test slot (audit F8, docs/handoff-2026-10-06/test-time-audit.md): test:pkg, test:affected
// and test:fast used to run without it at <= 40 files and could overlap a timing run. One slot level only: a caller that
// already holds the slot passes {slot: false} (test:perf does).
// `runClass` (tests/helpers/test-slot.mjs RUN_CLASSES) picks the slot class. With ATLAS_SLOT_SHARED=1 a shared class takes
// its tokens and passes the same number as an explicit --test-concurrency; with the flag off every run is exclusive and the
// node arguments are exactly as before.
export async function runTests(files, {slot = true, args = [], env = process.env, runClass} = {}) {
  if (!files.length) { console.log('No tests selected.'); return 0; }
  const cls = slot && runClass ? slotClass(runClass) : {mode: 'exclusive'};
  const nodeArgs = cls.mode === 'shared' ? boundTestConcurrency(['--test', ...args], cls.tokens) : ['--test', ...args];
  const work = () => runCommand(process.execPath, [...nodeArgs, ...files], {env});
  return slot ? withTestSlot({owner: `tests: ${files.length} files${cls.mode === 'shared' ? ` (${runClass}, shared ${cls.tokens} tokens)` : ''}`, ...cls}, work) : work();
}
// test:full (docs/tier-all-2026-10-07.md, review O2): the tier runner's `all` mode with ATLAS_TEST_FULL=1, one process per
// file (or shard), longest first, fsynced per-test results, resume and optional bail. Its NEW / known / stale lines are
// classify() over the failing title + file pairs, as the legacy failure-reporter path below computed them; the switch was
// made after one full run gave the same counts and classification as the last legacy report (docs/tier-all-2026-10-07.md).
async function full(args) {
  // Fail closed before the suite: an allowlist that could wave a CONTRACT failure through is rejected.
  const invalid = validateKnown(JSON.parse(readFileSync('tests/known-failures.json')));
  if (invalid.length) { console.error(`Rejected: tests/known-failures.json is invalid (nothing was run):\n  ${invalid.join('\n  ')}`); return 1; }
  const {runTier} = await import('./tier-runner.mjs');
  return runTier('all', ['--full', ...args]);
}
// The pre-2026-10-07 test:full: one `node --test` over the registry with failure-reporter.mjs (kept for cross-checks:
// npm run test:full:legacy). Same allowlist rules and acceptance as before.
async function fullLegacy() {
  // Fail closed before the ~28 min suite: an allowlist that could wave a CONTRACT failure through is rejected.
  const knownDoc = JSON.parse(readFileSync('tests/known-failures.json')), invalid = validateKnown(knownDoc);
  if (invalid.length) { console.error(`Rejected: tests/known-failures.json is invalid (nothing was run):\n  ${invalid.join('\n  ')}`); return 1; }
  mkdirSync('test-results', {recursive: true});
  const dir = mkdtempSync(resolve('test-results', 'atlas-test-report-')), report = join(dir, 'report.json');
  try {
    const raw = await runTests(registeredTests(), {slot: true, runClass: 'full', args: ['--test-reporter=spec', '--test-reporter-destination=stdout', '--test-reporter=./tests/helpers/failure-reporter.mjs', `--test-reporter-destination=${join(dir, 'reporter.txt')}`], env: {...process.env, ATLAS_TEST_REPORT: report, ATLAS_TEST_FULL: '1'}});
    console.log(`raw node exit code: ${raw}`);
    if (!existsSync(report)) { console.error('NEW failure: reporter did not finish'); return raw || 1; }
    const result = JSON.parse(readFileSync(report)), known = knownDoc.failures;
    const {matched, fresh, stale} = classify(result.failures, known);
    for (const [label, rows] of [['KNOWN failures matched', matched], ['NEW failures', fresh], ['Known entries that did NOT fail (stale)', stale]]) console.log(`${label}: ${rows.length}\n${rows.map(r => `  ${r.file}: ${r.title}`).join('\n')}`);
    const accounted = result.summary && result.summary.counts.cancelled === 0 && result.summary.counts.failed === result.failures.length;
    const ok = result.tests > 0 && accounted && !fresh.length && (raw === 0 || (raw === 1 && matched.length > 0));
    console.log(ok ? `Accepted: zero NEW failures; raw node exit code ${raw}. TODOs remain OPEN.` : 'Rejected: NEW failure or runner error.');
    return ok ? 0 : raw || 1;
  } finally { rmSync(dir, {recursive: true, force: true}); }
}
async function quietCPU() {
  const threshold = Number(process.env.ATLAS_TEST_CPU_MAX || 25), deadline = Date.now() + Number(process.env.ATLAS_TEST_CPU_WAIT_MS || 180000);
  let consecutive = 0;
  let useOSCounters = process.platform !== 'win32';
  async function cpuCounters() {
    const before = cpus(); await new Promise(r => setTimeout(r, 1000)); const after = cpus();
    let idle = 0, total = 0;
    after.forEach((c, i) => { idle += c.times.idle - before[i].times.idle; for (const k in c.times) total += c.times[k] - before[i].times[k]; });
    return total > 0 ? 100 * (1 - idle / total) : NaN;
  }
  while (Date.now() < deadline) {
    let load;
    if (!useOSCounters) {
      try {
        const value = execFileSync('powershell', ['-NoProfile', '-Command', "$ErrorActionPreference='Stop'; (Get-CimInstance Win32_Processor | Measure-Object LoadPercentage -Average).Average"], {encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'pipe']}).trim();
        if (!value) throw new Error('empty Win32_Processor result');
        load = Number(value);
      } catch (e) {
        console.error(`Win32_Processor CPU query blocked/unavailable: ${e.stderr?.toString().trim() || e.message}; using node:os CPU time deltas (1 s sample).`);
        useOSCounters = true;
      }
    }
    if (useOSCounters) load = await cpuCounters();
    if (!Number.isFinite(load)) throw new Error('CPU load unavailable');
    console.log(`CPU load ${load.toFixed(1)}%; require < ${threshold}% for 3 samples`);
    consecutive = load < threshold ? consecutive + 1 : 0;
    if (consecutive >= 3) return;
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('CPU quietness timeout; perf NOT run');
}
if (process.argv[1] && resolve(process.argv[1]) === resolve('tests/helpers/test-runner.mjs')) {
  const [mode, ...args] = process.argv.slice(2), baseIndex = args.indexOf('--base');
  let code;
  if (mode === 'full') code = await full(args);
  else if (mode === 'full-legacy') code = await fullLegacy();
  else if (mode === 'tier-estimates') {
    // node tests/helpers/test-runner.mjs tier-estimates <label> <run dir>...: rewrite that label's table of
    // tests/tier-estimates.json from finished tier runs (killed steps dropped). Commit the result with the run ids.
    const {writeEstimates} = await import('./tier-runner.mjs');
    if (args.length < 2) throw new Error('tier-estimates <smoke|work|default|all|full> <run dir>...');
    console.log(writeEstimates(args[0], args.slice(1))); code = 0;
  } else if (mode === 'pkg') {
    if (!args.length || args.some(f => !/\.test\.mjs$/.test(f) || !existsSync(f))) throw new Error('test:pkg requires existing .test.mjs paths');
    code = await runTests(args, {runClass: 'pkg'});
  } else if (mode === 'affected') {
    if (baseIndex >= 0 && !args[baseIndex + 1]) throw new Error('--base needs a ref');
    const base = baseRef(baseIndex < 0 ? undefined : args[baseIndex + 1]), changed = changedFiles(base);
    const pkg = changed.includes('package.json') ? packageJsonChangeSince(base) : undefined;
    if (pkg) console.log(`package.json: ${pkg.full ? 'FULL suite' : 'no forced full run'} (${pkg.reason})`);
    const {selected, outside} = selectTests(changed, registeredTests(), importGraph(), {pkg});
    console.log(`Changed vs ${base}:\n${changed.join('\n')}`);
    for (const s of selected) console.log(`${s.unregistered ? 'UNREGISTERED ' : ''}${s.file}: ${s.reason}`);
    console.log(`Outside graph (review manually):\n${outside.join('\n')}\n${changed.length} changed; ${selected.length} selected`);
    code = args.includes('--dry-run') ? 0 : await runTests(selected.map(s => s.file), {runClass: 'affected'});
  } else if (mode === 'fast') {
    // Formerly `test:smoke` (renamed 2026-10-07; `test:smoke` is now the tier-0 terrain smoke, mode 'tier').
    const all = registeredTests(), files = JSON.parse(readFileSync('tests/smoke.json')).files.map(f => f.file);
    if (files.some(f => !all.includes(f) || f.includes('/perf/') || f.includes('digest'))) throw new Error('stale fast list (tests/smoke.json); regenerate with npm run test:fast:generate');
    const start = performance.now(); code = await runTests(files, {runClass: 'fast'}); console.log(`fast: ${files.length} files; wall ${( (performance.now() - start) / 1000).toFixed(3)} s; raw node exit code ${code}`);
  } else if (mode === 'tier') {
    const {runTier} = await import('./tier-runner.mjs');
    code = await runTier(args[0], args.slice(1));
  } else if (mode === 'perf') code = await withTestSlot({owner: 'test:perf CPU quiet gate', ...slotClass('perf')}, async () => {
    await quietCPU(); return runTests(readdirSync('tests/perf').filter(f => f.endsWith('.perf.test.mjs')).map(f => `tests/perf/${f}`), {slot: false, args: ['--test-concurrency=1']});
  });
  else throw new Error(`unknown test mode ${mode}`);
  process.exitCode = code;
}
