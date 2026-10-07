// Quiet-window pre-check before EACH counted fair-protocol process (plan part 2, binding critic corrections):
//  (1) the shared test-slot holder dir must be empty (wait, never break a holder);
//  (2) perf-host contender list (main's tests/helpers/perf-host.mjs classifyProcess over nvidia-smi compute apps
//      AND the tasklist), diffed against the baseline recorded at the window start;
//  (3) host CPU idle over 500 ms (os.cpus deltas).
// Never kills anything. A NEW heavy contender or a busy host makes it WAIT (15 s steps, max 10 min), then it proceeds
// and the process is FLAGGED in the log (flag, never drop). One JSON line per call to argv[3].
//   node precheck.mjs <label> <out.jsonl> <baseline.json> [--baseline]
import {execFileSync} from 'node:child_process';
import {readdirSync, existsSync, appendFileSync, writeFileSync, readFileSync} from 'node:fs';
import {cpus} from 'node:os';
import {pathToFileURL} from 'node:url';
const [label, out, basePath] = process.argv.slice(2), makeBaseline = process.argv.includes('--baseline');
const {classifyProcess} = await import(pathToFileURL('C:/LLM/IWSDK/universe-atlas/tests/helpers/perf-host.mjs').href);
const SLOT = 'C:/LLM/IWSDK/.atlas-test-slot', SHARED = `${SLOT}.shared`;
const STRONG = /^(codex|chrome|chrome-headless-shell|blender|ffmpeg|ollama_llama_server|llama-server|comfyui)\.exe$/i;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sharedHolders = () => existsSync(SHARED) ? readdirSync(SHARED).filter(n => n.endsWith('.json') && !n.startsWith('.')) : [];
const tasks = () => execFileSync('tasklist', ['/FO', 'CSV', '/NH'], {encoding: 'utf8'}).trim().split(/\r?\n/).map(l => {
  const c = l.slice(1, -1).split('","');return {name: c[0], pid: +c[1]};});
const gpuApps = () => {try {return execFileSync('nvidia-smi', ['--query-compute-apps=pid,process_name', '--format=csv,noheader,nounits'], {encoding: 'utf8', timeout: 15000})
  .trim().split(/\r?\n/).filter(Boolean).map(l => {const [pid, name] = l.split(',').map(s => s.trim());return {pid: +pid, name, class: classifyProcess(name)};});} catch (e) {return [{error: String(e.message || e)}];}};
const idle = async () => {const a = cpus();await sleep(500);const b = cpus();let busy = 0, tot = 0;
  b.forEach((c, i) => {const d = k => c.times[k] - a[i].times[k], t = d('user') + d('nice') + d('sys') + d('idle') + d('irq');tot += t;busy += t - d('idle');});return 1 - busy / tot;};
const snap = async () => {const t = tasks(), heavy = t.filter(p => classifyProcess('\\' + p.name) === 'contender' && p.pid !== process.pid);
  return {heavy, gpu: gpuApps(), idleFrac: await idle(), shared: sharedHolders(), exclusive: existsSync(SLOT)};};
if (makeBaseline) {const s = await snap();writeFileSync(basePath, JSON.stringify({at: new Date().toISOString(), ...s}, null, 1));console.log(JSON.stringify(s));process.exit(0);}
const base = JSON.parse(readFileSync(basePath, 'utf8')), basePids = new Set(base.heavy.map(p => p.pid)), baseGpu = new Set(base.gpu.map(p => p.pid));
const t0 = Date.now();let waits = 0, s, newHeavy, newGpu, reasons;
for (;;) {
  s = await snap();
  newHeavy = s.heavy.filter(p => !basePids.has(p.pid));
  newGpu = s.gpu.filter(p => p.pid && !baseGpu.has(p.pid));
  reasons = [];
  if (s.shared.length) reasons.push(`shared holders ${s.shared.join(',')}`);
  if (newHeavy.some(p => STRONG.test(p.name) || /python/i.test(p.name))) reasons.push('new strong contender');
  if (newGpu.some(p => p.class === 'contender')) reasons.push('new GPU contender');
  if (s.idleFrac < 0.85) reasons.push(`host idle ${(100 * s.idleFrac).toFixed(1)}%`);
  if (!reasons.length || Date.now() - t0 > 600000) break;
  waits++;await sleep(15000);
}
const rec = {at: new Date().toISOString(), label, waits, waitedMs: Date.now() - t0, flagged: reasons.length > 0 || waits > 0, reasons,
  idlePct: +(100 * s.idleFrac).toFixed(1), shared: s.shared, exclusiveHeld: s.exclusive, newHeavy: newHeavy.map(p => `${p.pid} ${p.name}`), newGpu: newGpu.map(p => `${p.pid} ${p.name}`)};
appendFileSync(out, JSON.stringify(rec) + '\n');
// The shared-holder assert is HARD: if holders remain after the max wait, stop the driver (exit 3) instead of measuring.
if (s.shared.length) {console.error(`ABORT: shared test-slot holders present: ${s.shared.join(',')}`);process.exit(3);}
