// Pre-check before EACH counted fair-protocol process (O5; promoted from docs/quiet-window-2026-10-07/gate1/precheck.mjs,
// see docs/cost-fair-harness-2026-10-07.md). It never kills anything and never drops a process:
//  (1) HARD: the shared test-slot holder dir `<slot>.shared` must be empty; with --in-batch also: this batch must still
//      hold the EXCLUSIVE slot (its ATLAS_TEST_SLOT_TOKEN is the live owner). Either failing after the wait -> exit 3.
//  (2) contenders: perf-host classifyProcess over the tasklist and the nvidia-smi compute apps, diffed against the
//      baseline taken at the batch start. A NEW strong-named process (codex, chrome, blender, ffmpeg, llama, comfyui,
//      python) counts ONLY if it used more than 5 % of one logical CPU over a 500 ms sample (CPU_ACTIVE_FRAC); idle ones
//      are recorded as `quiet`. A process whose CPU time cannot be read counts (fail closed); one that exited is gone.
//      A new GPU compute contender counts as before.
//  (3) host CPU idle over 500 ms (os.cpus deltas) must be at least 85 %.
// A counted contender or a busy host makes it WAIT (15 s steps, at most PRECHECK_MAX_WAIT_MS, default 10 min); then it
// proceeds and the process is FLAGGED in the log (flag, never drop). One JSON line per call is appended to argv[3].
//   node scripts/cost-fair/precheck.mjs <label> <out.jsonl> <baseline.json> [--baseline] [--in-batch]
import {execFileSync, execFile} from 'node:child_process';
import {readdirSync, existsSync, appendFileSync, writeFileSync, readFileSync} from 'node:fs';
import {cpus} from 'node:os';
import {pathToFileURL} from 'node:url';
import {classifyProcess} from '../../tests/helpers/perf-host.mjs';
import {TEST_SLOT_DIR, sharedDir} from '../../tests/helpers/test-slot.mjs';
import {slotHolding} from './slot-held.mjs';

export const CPU_ACTIVE_FRAC = 0.05, CPU_SAMPLE_MS = 500, IDLE_MIN = 0.85;
export const STRONG = /^(codex|chrome|chrome-headless-shell|blender|ffmpeg|ollama_llama_server|llama-server|comfyui)\.exe$/i;
export const strongName = name => STRONG.test(name) || /python/i.test(name);

/** Pure classification of one snapshot. `cpu`: Map pid -> {state: 'measured', frac} | {state: 'gone'} | {state: 'unknown'},
 * or null when the sampler failed as a whole (every candidate then counts: fail closed). */
export function classify({heavy, gpu = [], idleFrac, shared = [], basePids = new Set(), baseGpuPids = new Set(), cpu = new Map()}) {
  const newHeavy = heavy.filter(p => !basePids.has(p.pid));
  const active = [], quiet = [], gone = [];
  for (const p of newHeavy.filter(q => strongName(q.name))) {
    const c = cpu === null ? {state: 'unknown'} : cpu.get(p.pid) ?? {state: 'unknown'};
    if (c.state === 'gone') gone.push(p);
    else if (c.state === 'measured' && !(c.frac > CPU_ACTIVE_FRAC)) quiet.push({...p, frac: c.frac});
    else active.push({...p, frac: c.state === 'measured' ? c.frac : null});
  }
  const newGpu = gpu.filter(p => p.pid && !baseGpuPids.has(p.pid));
  const reasons = [];
  if (shared.length) reasons.push(`shared holders ${shared.join(',')}`);
  if (active.length) reasons.push(`new strong contender active >${100 * CPU_ACTIVE_FRAC}% CPU: ${active.map(fmt).join(', ')}`);
  if (newGpu.some(p => p.class === 'contender')) reasons.push('new GPU contender');
  if (idleFrac < IDLE_MIN) reasons.push(`host idle ${(100 * idleFrac).toFixed(1)}%`);
  return {reasons, newHeavy, active, quiet, gone, newGpu};
}
const fmt = p => `${p.pid} ${p.name} ${p.frac === null ? 'cpu unknown' : (100 * p.frac).toFixed(1) + '%'}`;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const tasks = () => execFileSync('tasklist', ['/FO', 'CSV', '/NH'], {encoding: 'utf8'}).trim().split(/\r?\n/).map(l => {
  const c = l.slice(1, -1).split('","');return {name: c[0], pid: +c[1]};});
const gpuApps = () => {try {return execFileSync('nvidia-smi', ['--query-compute-apps=pid,process_name', '--format=csv,noheader,nounits'], {encoding: 'utf8', timeout: 15000})
  .trim().split(/\r?\n/).filter(Boolean).map(l => {const [pid, name] = l.split(',').map(s => s.trim());return {pid: +pid, name, class: classifyProcess(name)};});} catch (e) {return [{error: String(e.message || e)}];}};
const idle = async () => {const a = cpus();await sleep(CPU_SAMPLE_MS);const b = cpus();let busy = 0, tot = 0;
  b.forEach((c, i) => {const d = k => c.times[k] - a[i].times[k], t = d('user') + d('nice') + d('sys') + d('idle') + d('irq');tot += t;busy += t - d('idle');});return 1 - busy / tot;};
const sharedHolders = () => existsSync(sharedDir(TEST_SLOT_DIR)) ? readdirSync(sharedDir(TEST_SLOT_DIR)).filter(n => n.endsWith('.json') && !n.startsWith('.')) : [];
/** CPU time of `pids` over CPU_SAMPLE_MS (one PowerShell call; only run when there is a candidate). Fraction of ONE
 * logical CPU. Windows updates process times at the clock tick (~15.6 ms), so 5 % of 500 ms is about 1.6 ticks. */
export function sampleCpu(pids, ms = CPU_SAMPLE_MS) {
  if (!pids.length) return Promise.resolve({map: new Map()});
  const ps = `$ids=@(${pids.map(Number).join(',')});$a=@{};$p0=@{};Get-Process -Id $ids -ErrorAction SilentlyContinue|ForEach-Object{$p0[$_.Id]=1;$a[$_.Id]=$_.TotalProcessorTime.TotalMilliseconds};`
    + `$sw=[Diagnostics.Stopwatch]::StartNew();Start-Sleep -Milliseconds ${ms};$b=@{};$p1=@{};Get-Process -Id $ids -ErrorAction SilentlyContinue|ForEach-Object{$p1[$_.Id]=1;$b[$_.Id]=$_.TotalProcessorTime.TotalMilliseconds};`
    + `$w=$sw.Elapsed.TotalMilliseconds;ConvertTo-Json -Compress -InputObject @($ids|ForEach-Object{[pscustomobject]@{pid=$_;p0=[bool]$p0[$_];p1=[bool]$p1[$_];a=$a[$_];b=$b[$_];w=$w}})`;
  return new Promise(resolve => execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], {timeout: 30000, windowsHide: true}, (err, stdout) => {
    if (err) return resolve({map: null, error: String(err.message || err)});
    try {
      const map = new Map();
      for (const r of [JSON.parse(stdout)].flat()) {
        map.set(r.pid, !r.p1 ? {state: 'gone'} : !r.p0 || r.a == null || r.b == null || !(r.w > 0) ? {state: 'unknown'} : {state: 'measured', frac: (r.b - r.a) / r.w});
      }
      resolve({map});
    } catch (e) { resolve({map: null, error: `unparsable sampler output: ${String(stdout).slice(0, 200)}`}); }
  }));
}
async function snap(basePids) {
  const t = tasks(), heavy = t.filter(p => classifyProcess('\\' + p.name) === 'contender' && p.pid !== process.pid);
  const candidates = heavy.filter(p => !basePids.has(p.pid) && strongName(p.name)).map(p => p.pid);
  const [idleFrac, cpu] = await Promise.all([idle(), sampleCpu(candidates)]);
  return {heavy, gpu: gpuApps(), idleFrac, shared: sharedHolders(), cpu, slot: slotHolding().state, exclusive: existsSync(TEST_SLOT_DIR)};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [label, out, basePath] = process.argv.slice(2), makeBaseline = process.argv.includes('--baseline'), inBatch = process.argv.includes('--in-batch');
  const maxWaitMs = Number(process.env.PRECHECK_MAX_WAIT_MS ?? 600000), stepMs = Number(process.env.PRECHECK_STEP_MS ?? 15000);
  if (!(maxWaitMs >= 0) || !(stepMs > 0)) throw new Error('PRECHECK_MAX_WAIT_MS / PRECHECK_STEP_MS invalid');
  if (makeBaseline) {
    const s = await snap(new Set());
    const rec = {at: new Date().toISOString(), heavy: s.heavy, gpu: s.gpu, idleFrac: s.idleFrac, shared: s.shared, slot: s.slot, exclusive: s.exclusive};
    writeFileSync(basePath, JSON.stringify(rec, null, 1));console.log(JSON.stringify(rec));process.exit(0);
  }
  const base = JSON.parse(readFileSync(basePath, 'utf8')), basePids = new Set(base.heavy.map(p => p.pid)), baseGpuPids = new Set(base.gpu.map(p => p.pid));
  const t0 = Date.now();let waits = 0, s, c, hard;
  for (;;) {
    s = await snap(basePids);
    c = classify({...s, cpu: s.cpu.map, basePids, baseGpuPids});
    hard = inBatch && s.slot !== 'exclusive' ? `this batch does not hold the exclusive test slot (state ${s.slot})` : null;
    if (hard) c.reasons.push(hard);
    if (!c.reasons.length || Date.now() - t0 >= maxWaitMs) break;
    waits++;await sleep(stepMs);
  }
  const rec = {at: new Date().toISOString(), label, waits, waitedMs: Date.now() - t0, flagged: c.reasons.length > 0 || waits > 0, reasons: c.reasons,
    idlePct: +(100 * s.idleFrac).toFixed(1), shared: s.shared, slot: s.slot, newHeavy: c.newHeavy.map(p => `${p.pid} ${p.name}`),
    active: c.active.map(fmt), quiet: c.quiet.map(fmt), gone: c.gone.map(p => `${p.pid} ${p.name}`), newGpu: c.newGpu.map(p => `${p.pid} ${p.name}`),
    ...(s.cpu.error ? {cpuSampleError: s.cpu.error} : {})};
  appendFileSync(out, JSON.stringify(rec) + '\n');
  // HARD asserts: shared holders, or a batch that lost its exclusive slot, stop the driver (exit 3) instead of measuring.
  if (s.shared.length) {console.error(`ABORT: shared test-slot holders present: ${s.shared.join(',')}`);process.exit(3);}
  if (hard) {console.error(`ABORT: ${hard}`);process.exit(3);}
}
