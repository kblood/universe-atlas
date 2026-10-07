// Tiered runner (docs/test-tiers-2026-10-07.md; design docs/handoff-2026-10-06/tiered-testing-mvp.md section 1).
//   node tests/helpers/test-runner.mjs tier <smoke|work|default> [--resume <dir>] [--no-bail] [--force] [--only <file>...]
//   node tests/helpers/test-runner.mjs tier all [--full] [--resume <dir>] [--no-bail] [--only <file>...]
// Runs the tier's list from tests/tiers.json under ONE test-slot acquisition (never nested). Each STEP (a file, or one
// shard of a file) is one `node --test --test-isolation=none` child, all steps concurrently (up to cores - 1, longest
// first by the step-seconds estimate: the latest local run of the same label, else the committed seed
// tests/tier-estimates.json, else "unknown" = first), each child reporting through tier-reporter.mjs into
// test-results/tiers/<treeKey12>-<label>-<start>/ (label = the tier, or `full` for `tier all --full`):
// Tier `all` (docs/tier-all-2026-10-07.md, review O2): the WHOLE registry (registeredTests(), i.e. the npm test list) at
// the default depth (ATLAS_TEST_TIER and ATLAS_TEST_FULL removed: exactly what plain `npm test` runs), sharded only where
// tests/tiers.json `all` lists {file, shards}. `--full` sets ATLAS_TEST_FULL=1 in every step (test:full: the carved-truth
// fullOnly tests run) and takes test:full's slot class. In `all` every failing test that the allowlist does not match is
// NEW, whatever its title class, and the verdict prints test:full's NEW / known / stale classification (classify() of
// tests/helpers/known-failures.mjs over the failing rows, exactly what failure-reporter.mjs fed it).
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
import {validateKnown, classify} from './known-failures.mjs';

// 'default' is accepted for timing/comparison runs of the same list (no escalation rule, no subset coverage).
// 'all' is the whole registry (npm test list); `--full` makes it test:full.
const TIERS = ['smoke', 'work', 'default', 'all'];
const WALL_WARN_S = {smoke: 120, work: 900, default: 900, all: 300, full: 1800};
const ROOT = 'test-results/tiers';
export const ESTIMATES = 'tests/tier-estimates.json';
// Estimate lookup order per label when the label's own table has no entry for a step (never a cheaper tier for a deeper
// one's critical path: `all` does not borrow from `full`, whose fullOnly files would jump the queue).
const ESTIMATE_FALLBACK = {smoke: [], work: ['smoke'], default: ['smoke', 'all'], all: [], full: ['all']};
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
/** Tier `all`: every registered file once, in registry order; a file listed in `shardEntries` (tiers.json `all`,
 * {file, shards}) becomes its shard steps. A shard entry for an unregistered file, a duplicate entry or a plain string
 * (meaningless here: every registered file is already in) throws. */
export function allSteps(registered, shardEntries = []) {
  const byFile = new Map();
  for (const e of shardEntries) {
    if (typeof e !== 'object' || !e?.file || !Array.isArray(e.shards) || !e.shards.length) throw new Error(`tests/tiers.json all: entries must be {file, shards: [regex, ...]}, got ${JSON.stringify(e)}`);
    if (!registered.includes(e.file)) throw new Error(`tests/tiers.json all: not registered in npm test: ${e.file}`);
    if (byFile.has(e.file)) throw new Error(`tests/tiers.json all: duplicate entry for ${e.file}`);
    byFile.set(e.file, e);
  }
  return expandSteps(registered.map(f => byFile.get(f) ?? f));
}

/** Step-seconds estimates for `label`: the committed seed (tests/tier-estimates.json: the label's table, then its
 * fallback labels), overlaid with `previous` (the latest local run of the same label). Lookup per step: the step name,
 * then its file (a shard of a file measured whole inherits the whole file's seconds). Unknown = undefined. */
export function estimator(label, {committed = {}, previous = {}} = {}) {
  const tables = [previous, committed[label] ?? {}, ...(ESTIMATE_FALLBACK[label] ?? []).map(l => committed[l] ?? {})];
  return s => {for (const t of tables) {const v = t[s.step] ?? t[s.file];if (Number.isFinite(v)) return v;}return undefined;};
}
/** Longest first; an unknown step (no estimate) runs first (it may be the longest), ties keep the list order. */
export function orderSteps(steps, est) {
  const key = s => est(s) ?? Infinity;
  return steps.map((s, i) => [s, i]).sort((a, b) => key(b[0]) - key(a[0]) || a[1] - b[1]);
}
export function loadEstimates(path = ESTIMATES) {
  try {return JSON.parse(readFileSync(path, 'utf8'));} catch {return {};}
}
/** Measured step seconds of finished run dirs (latest attempt per step; killed steps and steps without an exit are
 * dropped: a bail-killed step's time is not its length). Later dirs override earlier ones. */
export function measuredSeconds(dirs) {
  const out = {};
  for (const dir of dirs) {
    const last = new Map();for (const s of readLines(join(dir, 'steps.jsonl'))) last.set(s.step, s);
    for (const s of last.values()) if ((s.status === 'pass' || s.status === 'fail') && Number.isFinite(s.ms)) out[s.step] = +(s.ms / 1000).toFixed(1);
  }
  return out;
}
/** Rewrite the `label` table of tests/tier-estimates.json from run dirs of that label (CLI: test-runner.mjs
 * tier-estimates <label> <run dir>...). Steps not in the runs keep their committed value. */
export function writeEstimates(label, dirs, path = ESTIMATES) {
  for (const d of dirs) {
    const run = JSON.parse(readFileSync(join(d, 'run.json'), 'utf8'));
    if ((run.label ?? run.tier) !== label) throw new Error(`${d} is a ${run.label ?? run.tier} run, not ${label}`);
  }
  const doc = loadEstimates(path), measured = measuredSeconds(dirs);
  const table = {...(doc[label] ?? {}), ...measured};
  doc[label] = Object.fromEntries(Object.entries(table).sort(([a], [b]) => a.localeCompare(b)));
  doc.sources = {...(doc.sources ?? {}), [label]: dirs.map(d => {const r = JSON.parse(readFileSync(join(d, 'run.json'), 'utf8'));return {runId: r.runId, commit: r.commit, dirty: r.dirty, wallS: r.wallS};})};
  writeFileSync(path, JSON.stringify(doc, null, 1) + '\n');
  return {label, steps: Object.keys(measured).length, total: Object.keys(table).length};
}

/** A failing row that blocks: in tier `all` every unmatched failure (test:full's rule: any title class), in the subset
 * tiers a NEW HARD/CONTRACT one. */
export const isNewFailure = (row, tier) => row.status === 'fail' && !row.known && (tier === 'all' || row.class === 'HARD' || row.class === 'CONTRACT');
/** test:full's classification of tier rows: classify() over every failing row as {title, file}, as failure-reporter.mjs
 * collected them (no subtests exist in the registry, so a top-level row is a test). */
export function classifyRows(rows, known) {
  return classify(rows.filter(r => r.status === 'fail').map(r => ({title: r.test, file: r.file})), known);
}

export function summarize(dir, {known} = {}) {
  const steps = readLines(join(dir, 'steps.jsonl')), results = readLines(join(dir, 'results.jsonl')), run = JSON.parse(readFileSync(join(dir, 'run.json'), 'utf8'));
  const stepOf = r => r.step ?? r.file;
  // Latest attempt per step wins.
  const lastStep = new Map();for (const s of steps) lastStep.set(s.step, s);
  const rows = results.filter(r => lastStep.has(stepOf(r)) ? r.attempt === lastStep.get(stepOf(r)).attempt : true);
  const count = s => rows.filter(r => r.status === s).length;
  const fresh = rows.filter(r => isNewFailure(r, run.tier));
  const knownFails = rows.filter(r => r.status === 'fail' && r.known);
  let classification;
  if (run.tier === 'all') {
    known ??= (() => {try {return JSON.parse(readFileSync('tests/known-failures.json', 'utf8')).failures;} catch {return [];}})();
    const c = classifyRows(rows, known), row = r => ({file: r.file, title: r.title});
    classification = {matched: c.matched.map(row), fresh: c.fresh.map(row), stale: c.stale.map(row)};
  }
  const titles = new Map();for (const r of rows) {const k = `${r.file} :: ${r.test}`;titles.set(k, (titles.get(k) ?? 0) + 1);}
  const duplicates = [...titles].filter(([, n]) => n > 1).map(([k]) => k);
  const names = run.steps ?? run.files;
  const missing = names.filter(f => !lastStep.has(f));
  const badSteps = [...lastStep.values()].filter(s => s.status !== 'pass' && !(s.exit === 1 && rows.some(r => stepOf(r) === s.step && r.status === 'fail' && r.known) && !fresh.some(r => stepOf(r) === s.step)));
  // Tier all also needs at least one test and test:full's classification free of NEW rows (same rows, same rule).
  const green = !fresh.length && !badSteps.length && !missing.length && !duplicates.length
    && (run.tier !== 'all' || (rows.length > 0 && classification.fresh.length === 0));
  return {runId: run.runId, tier: run.tier, label: run.label ?? run.tier, full: !!run.full, treeKey: run.treeKey, commit: run.commit, dirty: run.dirty, green,
    ...(classification ? {classification} : {}),
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
/** Measured step seconds of the most recent completed run of `label` (any tree), for longest-first scheduling. */
function previousSeconds(label) {
  for (const d of runDirs(label)) if (existsSync(join(ROOT, d, 'summary.json'))) {try {return measuredSeconds([join(ROOT, d)]);} catch {}}
  return {};
}

// Preloaded into every step process: writes its peak RSS (KiB) at exit (I3: measure RSS before raising shared holders).
const RSS_PROBE = `data:text/javascript,${encodeURIComponent("import{writeFileSync}from'node:fs';process.on('exit',()=>{try{writeFileSync(process.env.ATLAS_TIER_RSS_FILE,String(process.resourceUsage().maxRSS))}catch{}})")}`;
/** maxRSS (KiB) written by RSS_PROBE, or null. */
export function readMaxRSS(file) {
  try {const v = Number(readFileSync(file, 'utf8'));return Number.isSafeInteger(v) && v > 0 ? v : null;} catch {return null;}
}
/** The step env's tier variables: a subset tier sets ATLAS_TEST_TIER and clears ATLAS_TEST_FULL; tier `all` clears both
 * (plain npm test: default depth), and `all --full` sets ATLAS_TEST_FULL=1 (test:full: gate, fullOnly tests run). */
export function tierEnv(env, tier, full = false) {
  delete env.ATLAS_TEST_FULL;delete env.ATLAS_TEST_TIER;
  if (tier !== 'all') env.ATLAS_TEST_TIER = tier;
  else if (full) env.ATLAS_TEST_FULL = '1';
  return env;
}
export function runStep(s, {dir, tier, full = false, attempt, aware, index}) {
  const spec = join(dir, 'files', `${index}-${attempt}.spec.txt`), rss = join(dir, 'files', `${index}-${attempt}.rss`);
  const args = [`--import=${RSS_PROBE}`, '--test', '--test-isolation=none', ...s.args, `--test-reporter=${pathToFileURL(resolve('tests/helpers/tier-reporter.mjs')).href}`, '--test-reporter-destination=stdout',
    '--test-reporter=spec', `--test-reporter-destination=${spec}`, s.file];
  const env = tierEnv(slotEnv({...process.env, ATLAS_TIER_RESULTS: resolve(dir, 'results.jsonl'), ATLAS_TIER_AWARE: aware ? '1' : '0',
    ATLAS_TIER_ATTEMPT: String(attempt), ATLAS_TIER_STEP: s.step, ATLAS_TIER_RSS_FILE: resolve(rss)}), tier, full);
  delete env.NODE_TEST_CONTEXT;
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
  const bail = !flag('--no-bail'), force = flag('--force'), resumeDir = value('--resume'), full = flag('--full');
  if (full && tier !== 'all') throw new Error('--full is a tier all option (test:full)');
  const label = full ? 'full' : tier;
  const lists = JSON.parse(readFileSync('tests/tiers.json', 'utf8'));
  // Fail closed like test:full (tests/helpers/known-failures.mjs): an invalid allowlist rejects the run before any test.
  const knownDoc = JSON.parse(readFileSync('tests/known-failures.json', 'utf8')), invalid = validateKnown(knownDoc);
  if (invalid.length) {console.error(`Rejected: tests/known-failures.json is invalid (nothing was run):\n  ${invalid.join('\n  ')}`);return 1;}
  const registered = registeredTests();
  let all;
  if (tier === 'all') all = allSteps(registered, lists.all ?? []);
  else {
    const list = lists[tier] ?? (tier === 'default' ? lists.smoke : undefined);
    if (!Array.isArray(list) || !list.length) throw new Error(`tests/tiers.json has no ${tier} list`);
    all = expandSteps(list);
  }
  const unregistered = [...new Set(all.map(s => s.file))].filter(f => !registered.includes(f) || !existsSync(f));
  if (unregistered.length) throw new Error(`tests/tiers.json: not registered in npm test: ${unregistered.join(', ')}`);
  const only = argv.flatMap((a, i) => argv[i - 1] === '--only' ? [a] : []);
  if (only.length) {
    const unknown = only.filter(o => !all.some(s => s.file === o || s.step === o));
    if (unknown.length) throw new Error(`--only: not in the ${label} list: ${unknown.join(', ')}`);
    all = all.filter(s => only.includes(s.file) || only.includes(s.step));
  }
  const key = treeKey();
  let dir, attempt = 1, steps = all;
  if (resumeDir) {
    dir = resumeDir;const prev = JSON.parse(readFileSync(join(dir, 'run.json'), 'utf8'));
    if (prev.treeKey !== key.treeKey) {console.error(`--resume refused: the tree changed since ${prev.runId} (treeKey ${prev.treeKey.slice(0, 12)} -> ${key.treeKey.slice(0, 12)}); start a new run`);return 2;}
    if ((prev.label ?? prev.tier) !== label) {console.error(`--resume refused: ${dir} is a ${prev.label ?? prev.tier} run`);return 2;}
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
    dir = join(ROOT, `${key.treeKey.slice(0, 12)}-${label}-${started.replace(/[:.]/g, '-')}`);
    mkdirSync(join(dir, 'files'), {recursive: true});
    let sets = null;try {const s = JSON.parse(readFileSync('tests/tier-sets.json', 'utf8'));sets = {version: s.version, sha256: s.sha256};} catch {}
    writeFileSync(join(dir, 'run.json'), JSON.stringify({runId: `${key.treeKey.slice(0, 12)}-${label}-${started}`, tier, label, full, ...key, node: process.version, tierSets: sets,
      steps: steps.map(s => s.step), argv, started, forced: tier === 'work' && force, bail}, null, 2) + '\n');
  }
  mkdirSync(join(dir, 'files'), {recursive: true});
  const stepsLog = join(dir, 'steps.jsonl'), results = join(dir, 'results.jsonl');
  const aware = Object.fromEntries([...new Set(steps.map(s => s.file))].map(f => [f, isTierAware(f)]));
  const files = Object.keys(aware);
  console.log(tier === 'all'
    ? `tier all${full ? ' --full (ATLAS_TEST_FULL=1, test:full)' : ' (default depth, the npm test list)'}: ${files.length} files in ${steps.length} steps; bail ${bail ? 'on' : 'off'}; log ${dir}`
    : `tier ${tier}: ${files.length} files in ${steps.length} steps (${files.filter(f => aware[f]).length} files tier-aware, ${files.filter(f => !aware[f]).length} at default depth); bail ${bail ? 'on' : 'off'}; log ${dir}`);
  // Longest first by the estimate (latest local run of this label, else tests/tier-estimates.json); steps within half of
  // the longest estimate, and unknown steps, are the critical path.
  const prevS = previousSeconds(label), est = estimator(label, {committed: loadEstimates(), previous: prevS});
  const known = steps.filter(s => est(s) !== undefined).length;
  const longest = Math.max(0, ...steps.map(s => est(s) ?? 0));
  for (const s of steps) s.critical = est(s) === undefined || est(s) >= longest / 2;
  const critical = steps.filter(s => s.critical && est(s) !== undefined).sort((a, b) => est(b) - est(a));
  console.log(`estimates: ${known}/${steps.length} steps (${Object.keys(prevS).length ? 'latest local run + ' : ''}${ESTIMATES}); unknown steps run first`);
  if (critical.length) console.log(`critical path (normal priority, others below normal): ${critical.slice(0, 12).map(s => `${s.step} ~${est(s)} s`).join(', ')}${critical.length > 12 ? `, ... (${critical.length})` : ''}`);
  // Slot class (tests/helpers/test-slot.mjs RUN_CLASSES): with ATLAS_SLOT_SHARED=1 the tier is shared and its tokens are the
  // explicit job count (--jobs, default 16); with the flag off it is exclusive with cores - 1 jobs, as before. Tier all
  // takes npm test's class ('npm-test'), --full takes test:full's ('full': exclusive until I3 ran on its shards).
  const cls = slotClass(tier === 'all' ? (full ? 'full' : 'npm-test') : tier), limit = Math.max(1, Number(value('--jobs')) || (cls.mode === 'shared' ? cls.tokens : cpus().length - 1));
  if (cls.mode === 'shared' && limit > SLOT_CAPACITY) throw new Error(`--jobs ${limit} exceeds the ${SLOT_CAPACITY} shared slot tokens`);
  // wallS is measured from slot acquisition (the run itself); the wait for the slot is recorded separately.
  const tWait = performance.now();let t0 = tWait;
  const code = await withTestSlot({owner: `test:${label} (${steps.length} steps)`, ...cls, ...(cls.mode === 'shared' ? {tokens: limit} : {})}, async () => {
    t0 = performance.now();
    const queue = orderSteps(steps, est), live = new Map();let bailed = null, seen = 0;
    const newBad = row => isNewFailure(row, tier) && row.attempt === attempt;
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
        const [s, index] = queue.shift(), job = runStep(s, {dir, tier, full, attempt, aware: aware[s.file], index});
        live.set(s.step, job);
        const r = await job.done;live.delete(s.step);
        if (bail) poll();
        const status = r.code === 0 ? 'pass' : bailed && r.signal ? 'killed' : 'fail';
        appendLine(stepsLog, {step: s.step, file: s.file, status, exit: r.code, ms: Math.round(r.ms), maxRSS: r.maxRSS, attempt, aware: aware[s.file], t: new Date().toISOString()});
        console.log(`${status.padEnd(6)} ${(r.ms / 1000).toFixed(1).padStart(6)} s ${(r.maxRSS ? `${Math.round(r.maxRSS / 1024)}` : '?').padStart(5)} MiB  ${s.step}${aware[s.file] || tier === 'all' ? '' : '  (default depth)'}`);
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
  const wallS = (performance.now() - t0) / 1000, slotWaitS = (t0 - tWait) / 1000;
  const run = JSON.parse(readFileSync(join(dir, 'run.json'), 'utf8'));run.wallS = +((run.wallS ?? 0) + wallS).toFixed(1);run[`attempt${attempt}WallS`] = +wallS.toFixed(1);run[`attempt${attempt}SlotWaitS`] = +slotWaitS.toFixed(1);
  writeFileSync(join(dir, 'run.json'), JSON.stringify(run, null, 2) + '\n');
  const summary = summarize(dir, {known: knownDoc.failures});writeFileSync(join(dir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(`\n${label}: ${summary.green ? 'GREEN' : 'RED'}; ${summary.tests} tests (pass ${summary.pass}, fail ${summary.fail}, skip ${summary.skip}, todo ${summary.todo}; ${summary.subsetResults} subset-coverage results); ${summary.stepsDone}/${summary.steps} steps; wall ${wallS.toFixed(1)} s (slot wait ${slotWaitS.toFixed(1)} s before it); peak step RSS ${summary.peakStepRSSMiB ?? '?'} MiB`);
  for (const f of summary.newFailures) console.log(`  NEW ${f.class}: ${f.file} :: ${f.test}${f.diag[0] ? `\n      ${f.diag[0].split('\n')[0]}` : ''}`);
  for (const s of summary.badSteps) console.log(`  step ${s.status} (exit ${s.exit}): ${s.step}`);
  for (const t of summary.duplicates) console.log(`  DUPLICATE (overlapping shards): ${t}`);
  const script = tier === 'all' ? (full ? 'test:full' : 'test:all') : `test:${tier}`;
  if (summary.missing.length) console.log(`  not run: ${summary.missing.length} steps (resume: npm run ${script} -- --resume ${dir})`);
  if (summary.classification) {
    // test:full's report lines (same classify() over the same failing title + file pairs as failure-reporter.mjs).
    const {matched, fresh, stale} = summary.classification;
    for (const [name, rows] of [['KNOWN failures matched', matched], ['NEW failures', fresh], ['Known entries that did NOT fail (stale)', stale]]) console.log(`${name}: ${rows.length}\n${rows.map(r => `  ${r.file}: ${r.title}`).join('\n')}`);
    if (summary.missing.length) console.log('stale entries are incomplete: not every step ran');
    console.log(summary.green && !code ? `Accepted: zero NEW failures; every step exited 0${matched.length ? ' or failed only on known failures' : ''}. TODOs remain OPEN.` : 'Rejected: NEW failure, a failed/missing step or a runner error.');
  }
  if (wallS > WALL_WARN_S[label]) console.log(`WARNING: ${label} wall ${wallS.toFixed(1)} s exceeds the ${WALL_WARN_S[label]} s budget`);
  console.log(`log: ${dir}`);
  return summary.green && !code ? 0 : 1;
}
