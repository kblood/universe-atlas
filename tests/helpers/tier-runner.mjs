// Tiered runner (docs/test-tiers-2026-10-07.md; design docs/handoff-2026-10-06/tiered-testing-mvp.md section 1).
//   node tests/helpers/test-runner.mjs tier <smoke|work|default> [--resume <dir>] [--no-bail] [--force] [--only <file>...]
// Runs the tier's list from tests/tiers.json under ONE test-slot acquisition (never nested). Each STEP (a file, or one
// shard of a file) is one `node --test --test-isolation=none` child, all steps concurrently (up to cores - 1, longest
// first by the previous run of the same tier), each child reporting through tier-reporter.mjs into
// test-results/tiers/<treeKey12>-<tier>-<start>/:
//   run.json       {runId, tier, treeKey, commit, dirty, node, tierSets, steps, argv, started, forced, bail, wallS}
//   results.jsonl  one fsynced line per finished top-level test (tier-reporter.mjs), tagged with its step
//   steps.jsonl    one line per finished step {step, file, status, exit, ms, maxRSS, attempt, aware}; maxRSS = the step
//                  process's peak resident set in KiB (process.resourceUsage().maxRSS at exit), null if it never exited
//                  normally (killed by --bail or a signal)
//   summary.json   rewritten at the end of every attempt (a --resume is a new attempt)
//   files/<n>-<attempt>.spec.txt  spec output of each step (filtered excerpt printed for a failing step)
//   files/<n>-<attempt>.rss       the step's maxRSS in KiB, written by an exit hook preloaded into the step process
// Shards (tiers.json {file, shards: [regex, ...]}): one step per anchored title pattern (--test-name-pattern) plus a
// `#rest` step that skips the union (--test-skip-pattern), so every test of the file runs exactly once; a title reported
// twice in one attempt is flagged. Use shards only on files without subtests.
// --bail (default ON): the first NEW HARD/CONTRACT failure kills every running child.
// Green = 0 NEW HARD/CONTRACT failures, every step exited 0 (or failed only with known failures), no duplicate titles.
import {readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawn, execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {cpus, setPriority, constants as osConstants} from 'node:os';
import {withTestSlot, slotEnv, slotClass, SLOT_CAPACITY} from './test-slot.mjs';
import {registeredTests} from './test-selection.mjs';
import {appendLine} from './tier-reporter.mjs';
import {validateKnown} from './known-failures.mjs';

// 'default' is accepted for timing/comparison runs of the same list (no escalation rule, no subset coverage).
const TIERS = ['smoke', 'work', 'default'];
const WALL_WARN_S = {smoke: 120, work: 900, default: 900};
const ROOT = 'test-results/tiers';
const git = args => execFileSync('git', args, {encoding: 'utf8', maxBuffer: 256 << 20});
const readLines = p => existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];

/** sha256 of HEAD + `git diff HEAD --binary` + sorted untracked-file hashes: detects unversioned edits. */
export function treeKey() {
  const h = createHash('sha256'), head = git(['rev-parse', 'HEAD']).trim();
  h.update(head);h.update(git(['diff', 'HEAD', '--binary']));
  const untracked = git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean).sort();
  for (const f of untracked) {h.update(f);h.update(createHash('sha256').update(readFileSync(f)).digest('hex'));}
  return {treeKey: h.digest('hex'), commit: head, dirty: untracked.length > 0 || git(['status', '--porcelain', '--untracked-files=no']).trim().length > 0};
}
/** A test file is tier-aware when it imports helpers/tier.mjs itself. */
export const isTierAware = file => /helpers\/tier\.mjs['"]/.test(readFileSync(file, 'utf8'));
/** tiers.json entries -> steps. */
export function expandSteps(list) {
  return list.flatMap(e => {
    if (typeof e === 'string') return [{step: e, file: e, args: []}];
    if (!e.shards?.length) return [{step: e.file, file: e.file, args: []}];
    return [...e.shards.map((p, i) => ({step: `${e.file}#${i}`, file: e.file, args: [`--test-name-pattern=${p}`]})),
      {step: `${e.file}#rest`, file: e.file, args: [`--test-skip-pattern=${e.shards.map(p => `(?:${p})`).join('|')}`]}];
  });
}

export function summarize(dir) {
  const steps = readLines(join(dir, 'steps.jsonl')), results = readLines(join(dir, 'results.jsonl')), run = JSON.parse(readFileSync(join(dir, 'run.json'), 'utf8'));
  const stepOf = r => r.step ?? r.file;
  // Latest attempt per step wins.
  const lastStep = new Map();for (const s of steps) lastStep.set(s.step, s);
  const rows = results.filter(r => lastStep.has(stepOf(r)) ? r.attempt === lastStep.get(stepOf(r)).attempt : true);
  const count = s => rows.filter(r => r.status === s).length;
  const fresh = rows.filter(r => r.status === 'fail' && !r.known && (r.class === 'HARD' || r.class === 'CONTRACT'));
  const knownFails = rows.filter(r => r.status === 'fail' && r.known);
  const titles = new Map();for (const r of rows) {const k = `${r.file} :: ${r.test}`;titles.set(k, (titles.get(k) ?? 0) + 1);}
  const duplicates = [...titles].filter(([, n]) => n > 1).map(([k]) => k);
  const names = run.steps ?? run.files;
  const missing = names.filter(f => !lastStep.has(f));
  const badSteps = [...lastStep.values()].filter(s => s.status !== 'pass' && !(s.exit === 1 && rows.some(r => stepOf(r) === s.step && r.status === 'fail' && r.known) && !fresh.some(r => stepOf(r) === s.step)));
  const green = !fresh.length && !badSteps.length && !missing.length && !duplicates.length;
  return {runId: run.runId, tier: run.tier, treeKey: run.treeKey, commit: run.commit, dirty: run.dirty, green,
    steps: names.length, stepsDone: lastStep.size, tests: rows.length, pass: count('pass'), fail: count('fail'), skip: count('skip'), todo: count('todo'),
    subsetResults: rows.filter(r => r.coverage === 'subset').length,
    newFailures: fresh.map(r => ({file: r.file, test: r.test, class: r.class, diag: r.diag})), knownFailures: knownFails.map(r => ({file: r.file, test: r.test})),
    badSteps: badSteps.map(s => ({step: s.step, status: s.status, exit: s.exit})), missing, duplicates,
    wallS: run.wallS, perStepS: Object.fromEntries([...lastStep].map(([f, s]) => [f, +(s.ms / 1000).toFixed(1)])),
    // Largest single-step peak RSS of the latest attempts (MiB; null when no step recorded one).
    peakStepRSSMiB: [...lastStep.values()].reduce((m, s) => Number.isFinite(s.maxRSS) && s.maxRSS / 1024 > (m ?? 0) ? +(s.maxRSS / 1024).toFixed(1) : m, null)};
}

const runDirs = (tier, prefix = '') => existsSync(ROOT) ? readdirSync(ROOT).filter(d => d.startsWith(prefix) && d.includes(`-${tier}-`)).sort((a, b) => a.slice(13).localeCompare(b.slice(13))).reverse() : [];
/** Latest green run dir of `tier` for this treeKey, or null. */
export function latestGreen(tier, key) {
  for (const d of runDirs(tier, `${key.slice(0, 12)}-${tier}-`)) {
    try {const s = JSON.parse(readFileSync(join(ROOT, d, 'summary.json'), 'utf8'));if (s.green && s.treeKey === key) return join(ROOT, d);} catch {}
  }
  return null;
}
/** Step seconds of the most recent completed run of `tier` (any tree), for longest-first scheduling. */
function previousSeconds(tier) {
  for (const d of runDirs(tier)) {try {const s = JSON.parse(readFileSync(join(ROOT, d, 'summary.json'), 'utf8'));if (s.perStepS) return s.perStepS;} catch {}}
  return {};
}

// Preloaded into every step process: writes its peak RSS (KiB) at exit (I3: measure RSS before raising shared holders).
const RSS_PROBE = `data:text/javascript,${encodeURIComponent("import{writeFileSync}from'node:fs';process.on('exit',()=>{try{writeFileSync(process.env.ATLAS_TIER_RSS_FILE,String(process.resourceUsage().maxRSS))}catch{}})")}`;
/** maxRSS (KiB) written by RSS_PROBE, or null. */
export function readMaxRSS(file) {
  try {const v = Number(readFileSync(file, 'utf8'));return Number.isSafeInteger(v) && v > 0 ? v : null;} catch {return null;}
}
export function runStep(s, {dir, tier, attempt, aware, index}) {
  const spec = join(dir, 'files', `${index}-${attempt}.spec.txt`), rss = join(dir, 'files', `${index}-${attempt}.rss`);
  const args = [`--import=${RSS_PROBE}`, '--test', '--test-isolation=none', ...s.args, `--test-reporter=${pathToFileURL(resolve('tests/helpers/tier-reporter.mjs')).href}`, '--test-reporter-destination=stdout',
    '--test-reporter=spec', `--test-reporter-destination=${spec}`, s.file];
  const env = slotEnv({...process.env, ATLAS_TEST_TIER: tier, ATLAS_TIER_RESULTS: resolve(dir, 'results.jsonl'), ATLAS_TIER_AWARE: aware ? '1' : '0',
    ATLAS_TIER_ATTEMPT: String(attempt), ATLAS_TIER_STEP: s.step, ATLAS_TIER_RSS_FILE: resolve(rss)});
  delete env.ATLAS_TEST_FULL;delete env.NODE_TEST_CONTEXT;
  const child = spawn(process.execPath, args, {env, stdio: ['ignore', 'pipe', 'pipe']});
  // Critical-path steps keep normal priority; the rest yield the CPU to them (scheduling only, never what a test checks).
  if (!s.critical) try {setPriority(child.pid, osConstants.priority.PRIORITY_BELOW_NORMAL);} catch {}
  let err = '';child.stderr.on('data', b => {err += b;});child.stdout.on('data', () => {});
  const t0 = performance.now();
  const done = new Promise(r => child.on('close', (code, signal) => r({code: code ?? (signal ? 143 : 1), signal, ms: performance.now() - t0, err, spec, maxRSS: readMaxRSS(rss)})));
  return {child, done};
}

export async function runTier(tier, argv) {
  if (!TIERS.includes(tier)) throw new Error(`tier must be ${TIERS.join('|')}`);
  const flag = f => argv.includes(f), value = f => {const i = argv.indexOf(f);return i < 0 ? undefined : argv[i + 1];};
  const bail = !flag('--no-bail'), force = flag('--force'), resumeDir = value('--resume');
  const lists = JSON.parse(readFileSync('tests/tiers.json', 'utf8')), list = lists[tier] ?? (tier === 'default' ? lists.smoke : undefined);
  if (!Array.isArray(list) || !list.length) throw new Error(`tests/tiers.json has no ${tier} list`);
  // Fail closed like test:full (tests/helpers/known-failures.mjs): an invalid allowlist rejects the run before any test.
  const invalid = validateKnown(JSON.parse(readFileSync('tests/known-failures.json', 'utf8')));
  if (invalid.length) {console.error(`Rejected: tests/known-failures.json is invalid (nothing was run):\n  ${invalid.join('\n  ')}`);return 1;}
  const registered = registeredTests();
  let all = expandSteps(list);
  const unregistered = [...new Set(all.map(s => s.file))].filter(f => !registered.includes(f) || !existsSync(f));
  if (unregistered.length) throw new Error(`tests/tiers.json: not registered in npm test: ${unregistered.join(', ')}`);
  const only = argv.flatMap((a, i) => argv[i - 1] === '--only' ? [a] : []);
  if (only.length) all = all.filter(s => only.includes(s.file) || only.includes(s.step));
  const key = treeKey();
  let dir, attempt = 1, steps = all;
  if (resumeDir) {
    dir = resumeDir;const prev = JSON.parse(readFileSync(join(dir, 'run.json'), 'utf8'));
    if (prev.treeKey !== key.treeKey) {console.error(`--resume refused: the tree changed since ${prev.runId} (treeKey ${prev.treeKey.slice(0, 12)} -> ${key.treeKey.slice(0, 12)}); start a new run`);return 2;}
    if (prev.tier !== tier) {console.error(`--resume refused: ${dir} is a ${prev.tier} run`);return 2;}
    const done = readLines(join(dir, 'steps.jsonl')), last = new Map();for (const s of done) last.set(s.step, s);
    attempt = Math.max(0, ...done.map(s => s.attempt)) + 1;
    steps = all.filter(s => prev.steps.includes(s.step) && last.get(s.step)?.status !== 'pass');
    console.log(`resume ${prev.runId}: ${prev.steps.length - steps.length} green steps kept, ${steps.length} to run (attempt ${attempt})`);
  } else {
    if (tier === 'work') {
      const smoke = latestGreen('smoke', key.treeKey);
      if (!smoke && !force) {console.error(`test:work refused: no green smoke run for treeKey ${key.treeKey.slice(0, 12)} (run npm run test:smoke first, or pass --force)`);return 3;}
      console.log(smoke ? `escalation: green smoke run ${smoke}` : 'escalation FORCED: no green smoke run for this tree');
    }
    const started = new Date().toISOString();
    dir = join(ROOT, `${key.treeKey.slice(0, 12)}-${tier}-${started.replace(/[:.]/g, '-')}`);
    mkdirSync(join(dir, 'files'), {recursive: true});
    let sets = null;try {const s = JSON.parse(readFileSync('tests/tier-sets.json', 'utf8'));sets = {version: s.version, sha256: s.sha256};} catch {}
    writeFileSync(join(dir, 'run.json'), JSON.stringify({runId: `${key.treeKey.slice(0, 12)}-${tier}-${started}`, tier, ...key, node: process.version, tierSets: sets,
      steps: steps.map(s => s.step), argv, started, forced: tier === 'work' && force, bail}, null, 2) + '\n');
  }
  mkdirSync(join(dir, 'files'), {recursive: true});
  const stepsLog = join(dir, 'steps.jsonl'), results = join(dir, 'results.jsonl');
  const aware = Object.fromEntries([...new Set(steps.map(s => s.file))].map(f => [f, isTierAware(f)]));
  const files = Object.keys(aware);
  console.log(`tier ${tier}: ${files.length} files in ${steps.length} steps (${files.filter(f => aware[f]).length} files tier-aware, ${files.filter(f => !aware[f]).length} at default depth); bail ${bail ? 'on' : 'off'}; log ${dir}`);
  // Longest first by the previous run of this tier; steps within half of the longest estimate are the critical path.
  const prevS = previousSeconds(tier), est = s => prevS[s.step] ?? Infinity;
  const longest = Math.max(0, ...steps.map(s => prevS[s.step] ?? 0));
  for (const s of steps) s.critical = !(s.step in prevS) || prevS[s.step] >= longest / 2;
  const critical = steps.filter(s => s.critical && s.step in prevS);
  if (critical.length) console.log(`critical path (normal priority, others below normal): ${critical.map(s => `${s.step} ~${prevS[s.step]} s`).join(', ')}`);
  // Slot class (tests/helpers/test-slot.mjs RUN_CLASSES): with ATLAS_SLOT_SHARED=1 the tier is shared and its tokens are the
  // explicit job count (--jobs, default 16); with the flag off it is exclusive with cores - 1 jobs, as before.
  const cls = slotClass(tier), limit = Math.max(1, Number(value('--jobs')) || (cls.mode === 'shared' ? cls.tokens : cpus().length - 1));
  if (cls.mode === 'shared' && limit > SLOT_CAPACITY) throw new Error(`--jobs ${limit} exceeds the ${SLOT_CAPACITY} shared slot tokens`);
  const t0 = performance.now();
  const code = await withTestSlot({owner: `test:${tier} (${steps.length} steps)`, ...cls, ...(cls.mode === 'shared' ? {tokens: limit} : {})}, async () => {
    const queue = steps.map((s, i) => [s, i]).sort((a, b) => est(b[0]) - est(a[0])), live = new Map();let bailed = null, seen = 0;
    const newBad = row => row.status === 'fail' && !row.known && (row.class === 'HARD' || row.class === 'CONTRACT') && row.attempt === attempt;
    const poll = () => {
      const rows = readLines(results);
      for (; seen < rows.length; seen++) if (!bailed && newBad(rows[seen])) {
        bailed = rows[seen];console.error(`BAIL at ${((performance.now() - t0) / 1000).toFixed(1)} s: NEW ${bailed.class} failure ${bailed.file} :: ${bailed.test}`);
        for (const {child} of live.values()) child.kill();
      }
    };
    const watcher = bail && setInterval(poll, 200);
    const workers = Array.from({length: Math.min(limit, steps.length)}, async () => {
      while (queue.length && !bailed) {
        const [s, index] = queue.shift(), job = runStep(s, {dir, tier, attempt, aware: aware[s.file], index});
        live.set(s.step, job);
        const r = await job.done;live.delete(s.step);
        if (bail) poll();
        const status = r.code === 0 ? 'pass' : bailed && r.signal ? 'killed' : 'fail';
        appendLine(stepsLog, {step: s.step, file: s.file, status, exit: r.code, ms: Math.round(r.ms), maxRSS: r.maxRSS, attempt, aware: aware[s.file], t: new Date().toISOString()});
        console.log(`${status.padEnd(6)} ${(r.ms / 1000).toFixed(1).padStart(6)} s ${(r.maxRSS ? `${Math.round(r.maxRSS / 1024)}` : '?').padStart(5)} MiB  ${s.step}${aware[s.file] ? '' : '  (default depth)'}`);
        if (status === 'fail') {
          if (existsSync(r.spec)) process.stdout.write(readFileSync(r.spec, 'utf8').split('\n').filter(l => /✖|Error|expected|actual/.test(l)).slice(0, 30).join('\n') + '\n');
          if (r.err.trim()) process.stderr.write(r.err.split('\n').filter(l => !/ExperimentalWarning|--trace-warnings/.test(l)).slice(0, 20).join('\n') + '\n');
        }
      }
    });
    await Promise.all(workers);
    if (watcher) clearInterval(watcher);
    return bailed ? 1 : 0;
  });
  const wallS = (performance.now() - t0) / 1000;
  const run = JSON.parse(readFileSync(join(dir, 'run.json'), 'utf8'));run.wallS = +((run.wallS ?? 0) + wallS).toFixed(1);run[`attempt${attempt}WallS`] = +wallS.toFixed(1);
  writeFileSync(join(dir, 'run.json'), JSON.stringify(run, null, 2) + '\n');
  const summary = summarize(dir);writeFileSync(join(dir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(`\n${tier}: ${summary.green ? 'GREEN' : 'RED'}; ${summary.tests} tests (pass ${summary.pass}, fail ${summary.fail}, skip ${summary.skip}, todo ${summary.todo}; ${summary.subsetResults} subset-coverage results); ${summary.stepsDone}/${summary.steps} steps; wall ${wallS.toFixed(1)} s; peak step RSS ${summary.peakStepRSSMiB ?? '?'} MiB`);
  for (const f of summary.newFailures) console.log(`  NEW ${f.class}: ${f.file} :: ${f.test}${f.diag[0] ? `\n      ${f.diag[0].split('\n')[0]}` : ''}`);
  for (const s of summary.badSteps) console.log(`  step ${s.status} (exit ${s.exit}): ${s.step}`);
  for (const t of summary.duplicates) console.log(`  DUPLICATE (overlapping shards): ${t}`);
  if (summary.missing.length) console.log(`  not run: ${summary.missing.length} steps (resume: npm run test:${tier} -- --resume ${dir})`);
  if (wallS > WALL_WARN_S[tier]) console.log(`WARNING: ${tier} wall ${wallS.toFixed(1)} s exceeds the ${WALL_WARN_S[tier]} s budget`);
  console.log(`log: ${dir}`);
  return summary.green && !code ? 0 : 1;
}
