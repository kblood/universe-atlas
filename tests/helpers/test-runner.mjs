import {readFileSync, mkdtempSync, rmSync, readdirSync, existsSync, mkdirSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {cpus} from 'node:os';
import {execFileSync} from 'node:child_process';
import {withTestSlot, runCommand} from './test-slot.mjs';
import {registeredTests, changedFiles, baseRef, importGraph, selectTests} from './test-selection.mjs';

export async function runTests(files, {slot = files.length > 40, args = [], env = process.env} = {}) {
  if (!files.length) { console.log('No tests selected.'); return 0; }
  const work = () => runCommand(process.execPath, ['--test', ...args, ...files], {env});
  return slot ? withTestSlot({owner: `tests: ${files.length} files`}, work) : work();
}
export function classify(failures, known) {
  const matches = (a, b) => a.title === b.title && a.file === b.file;
  return {matched: failures.filter(f => known.some(k => matches(f, k))), fresh: failures.filter(f => !known.some(k => matches(f, k))), stale: known.filter(k => !failures.some(f => matches(f, k)))};
}
async function full() {
  mkdirSync('test-results', {recursive: true});
  const dir = mkdtempSync(resolve('test-results', 'atlas-test-report-')), report = join(dir, 'report.json');
  try {
    const raw = await runTests(registeredTests(), {slot: true, args: ['--test-reporter=spec', '--test-reporter-destination=stdout', '--test-reporter=./tests/helpers/failure-reporter.mjs', `--test-reporter-destination=${join(dir, 'reporter.txt')}`], env: {...process.env, ATLAS_TEST_REPORT: report, ATLAS_TEST_FULL: '1'}});
    console.log(`raw node exit code: ${raw}`);
    if (!existsSync(report)) { console.error('NEW failure: reporter did not finish'); return raw || 1; }
    const result = JSON.parse(readFileSync(report)), known = JSON.parse(readFileSync('tests/known-failures.json')).failures;
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
  if (mode === 'full') code = await full();
  else if (mode === 'pkg') {
    if (!args.length || args.some(f => !/\.test\.mjs$/.test(f) || !existsSync(f))) throw new Error('test:pkg requires existing .test.mjs paths');
    const all = registeredTests(); code = await runTests(args, {slot: args.length > 40 || all.every(f => args.includes(f))});
  } else if (mode === 'affected') {
    if (baseIndex >= 0 && !args[baseIndex + 1]) throw new Error('--base needs a ref');
    const base = baseRef(baseIndex < 0 ? undefined : args[baseIndex + 1]), changed = changedFiles(base);
    const {selected, outside} = selectTests(changed, registeredTests(), importGraph());
    console.log(`Changed vs ${base}:\n${changed.join('\n')}`);
    for (const s of selected) console.log(`${s.unregistered ? 'UNREGISTERED ' : ''}${s.file}: ${s.reason}`);
    console.log(`Outside graph (review manually):\n${outside.join('\n')}\n${changed.length} changed; ${selected.length} selected`);
    code = args.includes('--dry-run') ? 0 : await runTests(selected.map(s => s.file));
  } else if (mode === 'smoke') {
    const all = registeredTests(), files = JSON.parse(readFileSync('tests/smoke.json')).files.map(f => f.file);
    if (files.some(f => !all.includes(f) || f.includes('/perf/') || f.includes('digest'))) throw new Error('stale smoke list; regenerate');
    const start = performance.now(); code = await runTests(files); console.log(`smoke: ${files.length} files; wall ${( (performance.now() - start) / 1000).toFixed(3)} s; raw node exit code ${code}`);
  } else if (mode === 'perf') code = await withTestSlot({owner: 'test:perf CPU quiet gate'}, async () => {
    await quietCPU(); return runTests(readdirSync('tests/perf').filter(f => f.endsWith('.perf.test.mjs')).map(f => `tests/perf/${f}`), {slot: false, args: ['--test-concurrency=1']});
  });
  else throw new Error(`unknown test mode ${mode}`);
  process.exitCode = code;
}
