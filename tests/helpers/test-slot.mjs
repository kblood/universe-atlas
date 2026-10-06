// Machine-wide test slot (docs/test-policy.md "Slot and exit codes"; shared/exclusive design: docs/shared-test-slot-2026-10-07.md).
// EXCLUSIVE (the only class while ATLAS_SLOT_SHARED is unset/0, i.e. today's behaviour): atomic mkdir of TEST_SLOT_DIR with
// owner.txt. Before an exclusive holder runs it also waits until no live SHARED holder remains (a no-op when nobody uses
// the shared class). SHARED (ATLAS_SLOT_SHARED=1 only): a holder file `<dir>.shared/<token>.json` {pid, host, tokens};
// admitted while the exclusive dir is absent and the live tokens stay <= SLOT_CAPACITY. Writer priority: a shared caller
// writes its file, then re-checks the exclusive dir and backs off if one appeared; an exclusive caller takes the dir
// first (so no new shared holder enters) and then drains. Dead LOCAL pids are reaped; foreign or unreadable holders are
// never broken. Never nest: a child of a holder inherits ATLAS_TEST_SLOT_TOKEN and (flag on) runs through without a
// second level. Lock order merge -> slot -> GPU: asking for the slot while this process (or an ancestor) holds or waits
// for the GPU lock throws.
import {mkdir, readFile, rename, rm, stat, writeFile, readdir} from 'node:fs/promises';
import {writeFileSync, readFileSync, rmSync, utimesSync, existsSync} from 'node:fs';
import {hostname} from 'node:os';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export const TEST_SLOT_DIR = process.env.ATLAS_TEST_SLOT_DIR || 'C:/LLM/IWSDK/.atlas-test-slot';
/** CPU tokens of the machine (16C/32T) handed to shared holders; 4 threads stay free for tsc, Vite, codex, the coordinator. */
export const SLOT_CAPACITY = 28;
/** Slot class per run class when ATLAS_SLOT_SHARED=1. `tokens` is also the run's explicit --test-concurrency / --jobs.
 * test:full stays exclusive until the I3 load proof has also run on the test:full shards (critic correction, plan part 2).
 * `npm test` is listed for the CLI (`--shared 16`); package.json is merger-owned (needs: line in the design doc). */
export const RUN_CLASSES = Object.freeze({
  pkg: {mode: 'shared', tokens: 4}, affected: {mode: 'shared', tokens: 8}, fast: {mode: 'shared', tokens: 8},
  smoke: {mode: 'shared', tokens: 16}, work: {mode: 'shared', tokens: 16}, default: {mode: 'shared', tokens: 16}, 'npm-test': {mode: 'shared', tokens: 16},
  full: {mode: 'exclusive'}, perf: {mode: 'exclusive'}, 'cost-fair': {mode: 'exclusive'}, 'desktop-perf': {mode: 'exclusive'},
});
/** ATLAS_SLOT_SHARED: unset/'0' = off (today's behaviour), '1' = on; anything else fails closed. Read at call time. */
export function sharedSlotEnabled(env = process.env) {
  const v = env.ATLAS_SLOT_SHARED ?? '';
  if (v !== '' && v !== '0' && v !== '1') throw new Error(`ATLAS_SLOT_SHARED must be 0 or 1, got ${JSON.stringify(v)}`);
  return v === '1';
}
/** The slot class for a named run class: always exclusive while the flag is off. */
export function slotClass(name, env = process.env) {
  const c = RUN_CLASSES[name];
  if (!c) throw new Error(`unknown run class ${name}`);
  return sharedSlotEnabled(env) ? {...c} : {mode: 'exclusive'};
}
export const sharedDir = dir => `${dir}.shared`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const sleep = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));
let activeChildren = 0;
// Slots held by THIS process (innermost last); its token is injected into children (runCommand / slotEnv), never into
// this process's own env, so two in-process acquisitions never pass through each other.
const HELD = globalThis[Symbol.for('atlas.test-slot.held')] ??= [];
function dead(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return false; } catch (e) { return e.code === 'ESRCH'; }
}
/** `env` plus ATLAS_TEST_SLOT_TOKEN of the innermost slot this process holds (children inherit it: never nest). */
export function slotEnv(env = process.env) {
  const held = HELD.at(-1);
  return held ? {...env, ATLAS_TEST_SLOT_TOKEN: held.token} : env;
}
/** Lock order merge -> slot -> GPU (docs/test-policy.md "Lock order"). gpu-lock.mjs publishes its state in-process and,
 * for children, through ATLAS_GPU_LOCK_HELD. Waiting for the slot while holding or waiting for the GPU can deadlock. */
export function assertSlotLockOrder(owner) {
  const gpu = globalThis[Symbol.for('atlas.gpu-lock.state')];
  const why = process.env.ATLAS_GPU_LOCK_HELD ? `the GPU lock is held (${process.env.ATLAS_GPU_LOCK_HELD.trim()})`
    : gpu?.held ? 'this process holds the GPU lock' : gpu?.waiting ? 'this process is waiting for the GPU lock' : null;
  if (why) throw new Error(`lock order violation: "${owner}" asks for the test slot while ${why}; the order is merge -> slot -> GPU, never GPU -> slot (docs/test-policy.md)`);
}

// Inspect an existing exclusive dir: reap it if its owner is a verifiably dead LOCAL pid, otherwise report the holder.
async function inspectExclusive(dir) {
  let text = '(owner unavailable)', age = '?', holder;
  try {
    text = await readFile(`${dir}/owner.txt`, 'utf8');
    age = `${Math.round((Date.now() - (await stat(`${dir}/owner.txt`)).mtimeMs) / 1000)} s`;
    holder = JSON.parse(text);
  } catch {}
  // Age alone is never evidence of death; foreign/unknown owners are kept.
  if (holder?.host === hostname() && dead(holder.pid)) {
    // Serialize reapers inside the dead directory. A second reaper cannot
    // rename a newly acquired live directory after checking the old owner.
    try { await mkdir(`${dir}/reaping`); } catch { return {state: 'wait'}; }
    if (await readFile(`${dir}/owner.txt`, 'utf8').catch(() => null) !== text) {
      await rm(`${dir}/reaping`, {recursive: true}); return {state: 'retry'};
    }
    const tomb = `${dir}.stale-${randomUUID()}`;
    try { await rename(dir, tomb); } catch { await rm(`${dir}/reaping`, {recursive: true}); return {state: 'retry'}; }
    // Validate again after rename: never remove a replacement owner.
    if (await readFile(`${tomb}/owner.txt`, 'utf8').catch(() => null) !== text) {
      await rename(tomb, dir); throw new Error('test slot owner changed during takeover');
    }
    console.error(`TOOK OVER test slot: ${text.trim()} (${age}; pid verifiably dead on this host)`);
    await rm(tomb, {recursive: true}); return {state: 'retry'};
  }
  return {state: 'held', text, age};
}
/** Live shared holders of `dir` (dead local pids are reaped on the way; an unreadable holder counts as `capacity`). */
export async function sharedHolders(dir, {capacity = SLOT_CAPACITY} = {}) {
  const sd = sharedDir(dir);
  let names;
  try { names = await readdir(sd); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  const live = [];
  for (const name of names.filter(n => n.endsWith('.json') && !n.startsWith('.'))) {
    let text, h;
    try { text = await readFile(`${sd}/${name}`, 'utf8'); h = JSON.parse(text); } catch (e) {
      if (e.code === 'ENOENT') continue; // released meanwhile
      live.push({file: name, tokens: capacity, text: '(unreadable holder file; never broken)'}); continue;
    }
    if (h?.host === hostname() && dead(h.pid)) {
      // Holder files are named by a fresh uuid and never reused, so removing this name can only remove the dead holder.
      await rm(`${sd}/${name}`, {force: true});
      console.error(`REAPED shared test-slot holder: ${text.trim()} (pid verifiably dead on this host)`); continue;
    }
    live.push({...h, file: name, tokens: Number.isSafeInteger(h?.tokens) && h.tokens > 0 ? h.tokens : capacity, text: text.trim()});
  }
  return live;
}
// A child of a holder (ATLAS_TEST_SLOT_TOKEN matches a live holder of `dir`) runs through without a second level.
function inheritedSlot(dir, mode) {
  const token = process.env.ATLAS_TEST_SLOT_TOKEN;
  if (!token || !UUID.test(token)) return null;
  let parent = null;
  try { if (JSON.parse(readFileSync(`${dir}/owner.txt`, 'utf8')).token === token) parent = 'exclusive'; } catch {}
  if (!parent) try { if (JSON.parse(readFileSync(`${sharedDir(dir)}/${token}.json`, 'utf8')).token === token) parent = 'shared'; } catch {}
  if (!parent) return null; // stale or foreign token: acquire normally
  if (parent === 'shared' && mode === 'exclusive') throw new Error('never nest: an exclusive test slot was requested inside a SHARED holder (ATLAS_TEST_SLOT_TOKEN); take the exclusive slot at the top level instead');
  return {release() {}, owner: `(inherited ${parent} slot)`, token, mode: parent, nested: true};
}
function hold({kind, token, text, file, cleanup, heartbeatMs}) {
  let released = false;
  const ours = () => { try { return readFileSync(file, 'utf8') === text; } catch { return false; } };
  const entry = {token, kind};
  const release = () => {
    if (released) return;
    released = true; clearInterval(timer);
    process.off('exit', release); process.off('SIGINT', interrupt); process.off('SIGTERM', terminate);
    const i = HELD.indexOf(entry); if (i >= 0) HELD.splice(i, 1);
    if (ours()) cleanup();
  };
  const interrupt = () => { if (!activeChildren) { release(); process.exit(130); } };
  const terminate = () => { if (!activeChildren) { release(); process.exit(143); } };
  const timer = setInterval(() => { if (ours()) { const now = new Date(); try { utimesSync(file, now, now); } catch {} } }, heartbeatMs);
  timer.unref();
  process.on('exit', release); process.on('SIGINT', interrupt); process.on('SIGTERM', terminate);
  HELD.push(entry);
  return {release, owner: text, token, mode: kind};
}

/** Exclusive (default) or, with ATLAS_SLOT_SHARED=1, shared `{mode: 'shared', tokens: k}` hold of the test slot. */
export async function acquireTestSlot({owner = 'node tests', dir = TEST_SLOT_DIR, retryMs = 1000, timeoutMs = Infinity, heartbeatMs = 10000, mode = 'exclusive', tokens, capacity = SLOT_CAPACITY} = {}) {
  if (!(retryMs > 0) || !(heartbeatMs > 0) || !(timeoutMs >= 0)) throw new Error('invalid test slot timeout/interval');
  if (mode !== 'exclusive' && mode !== 'shared') throw new Error(`test slot mode must be exclusive|shared, got ${mode}`);
  if (mode === 'shared' && !(Number.isSafeInteger(tokens) && tokens >= 1 && tokens <= capacity)) throw new Error(`a shared test slot needs explicit tokens in 1..${capacity}, got ${tokens}`);
  const shared = sharedSlotEnabled();
  if (shared) { const nested = inheritedSlot(dir, mode); if (nested) return nested; }
  assertSlotLockOrder(owner);
  if (shared && mode === 'shared') return acquireShared({owner, dir, retryMs, timeoutMs, heartbeatMs, tokens, capacity});
  return acquireExclusive({owner, dir, retryMs, timeoutMs, heartbeatMs, capacity});
}
async function acquireExclusive({owner, dir, retryMs, timeoutMs, heartbeatMs, capacity}) {
  const started = Date.now();
  let attempts = 0;
  for (;;) {
    if (attempts++ && Date.now() - started >= timeoutMs) throw new Error(`test slot still held by ${await readFile(`${dir}/owner.txt`, 'utf8').catch(() => '(owner unavailable)')}`);
    try { await mkdir(dir); } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      const s = await inspectExclusive(dir);
      if (s.state === 'wait') { await sleep(retryMs); continue; }
      if (s.state === 'retry') continue;
      if (Date.now() - started >= timeoutMs) throw new Error(`test slot still held by ${s.text.trim()}`);
      console.error(`waiting for test slot: held by ${s.text.trim()} (${s.age}) - retry in ${retryMs / 1000} s`);
      await sleep(Math.min(retryMs, timeoutMs - (Date.now() - started))); continue;
    }
    const token = randomUUID();
    const text = JSON.stringify({name: owner, pid: process.pid, host: hostname(), time: new Date().toISOString(), token});
    try { writeFileSync(`${dir}/owner.txt`, text); } catch (e) { await rm(dir, {recursive: true}); throw e; }
    const lock = hold({kind: 'exclusive', token, text, file: `${dir}/owner.txt`, heartbeatMs, cleanup: () => rmSync(dir, {recursive: true, force: true})});
    // Drain: the dir already keeps new shared holders out (writer priority); wait for the admitted ones to finish.
    // Without shared holders (flag off everywhere) this is one empty readdir: today's behaviour.
    for (let waits = 0;; waits++) {
      let live;
      try { live = await sharedHolders(dir, {capacity}); } catch (e) { lock.release(); throw e; }
      if (!live.length) return lock;
      const used = live.reduce((a, h) => a + h.tokens, 0);
      if (Date.now() - started >= timeoutMs) { lock.release(); throw new Error(`test slot still held by ${live.length} shared holder(s), ${used} tokens: ${live.map(h => h.text).join('; ')}`); }
      if (!waits || waits % 30 === 0) console.error(`exclusive test slot taken; draining ${live.length} shared holder(s) (${used} tokens): ${live.map(h => h.text).join('; ')}`);
      await sleep(Math.min(retryMs, timeoutMs - (Date.now() - started)));
    }
  }
}
async function acquireShared({owner, dir, retryMs, timeoutMs, heartbeatMs, tokens, capacity}) {
  const started = Date.now(), sd = sharedDir(dir), token = randomUUID(), file = `${sd}/${token}.json`;
  const text = JSON.stringify({name: owner, pid: process.pid, host: hostname(), time: new Date().toISOString(), token, class: 'shared', tokens});
  for (let attempt = 0;; attempt++) {
    let why;
    if (existsSync(dir)) {
      const s = await inspectExclusive(dir);
      if (s.state === 'retry') continue;
      why = s.state === 'wait' ? 'exclusive owner being reaped' : `exclusive held by ${s.text.trim()} (${s.age})`;
    } else {
      // Publish first, then look (Dekker): whichever of two callers looks last sees the other, so the admitted token
      // total never exceeds capacity and an exclusive caller that mkdir'd before our re-check always wins.
      await mkdir(sd, {recursive: true});
      await writeFile(`${sd}/.${token}.tmp`, text); await rename(`${sd}/.${token}.tmp`, file);
      if (existsSync(dir)) why = 'an exclusive caller arrived (writer priority)';
      else {
        const live = await sharedHolders(dir, {capacity}), used = live.reduce((a, h) => a + h.tokens, 0);
        if (live.some(h => h.file === `${token}.json`) && used <= capacity) return hold({kind: 'shared', token, text, file, heartbeatMs, cleanup: () => rmSync(file, {force: true})});
        why = `${used - tokens}/${capacity} tokens in use by ${live.filter(h => h.token !== token).map(h => h.text).join('; ')}`;
      }
      await rm(file, {force: true});
    }
    if (Date.now() - started >= timeoutMs) throw new Error(`test slot (shared, ${tokens} tokens) still unavailable: ${why}`);
    if (attempt % 30 === 0) console.error(`waiting for shared test slot (${tokens} tokens): ${why} - retry in ${retryMs / 1000} s`);
    // Jitter breaks lock-step retries of two callers that both backed off.
    await sleep(Math.min(retryMs * (0.5 + Math.random()), timeoutMs - (Date.now() - started)));
  }
}
export async function withTestSlot(options, work) {
  const lock = await acquireTestSlot(options);
  try { return await work(lock); } finally { lock.release(); }
}
export function runCommand(command, args, options = {}) {
  return new Promise(resolve => {
    const child = spawn(command, args, {stdio: 'inherit', ...options, env: slotEnv(options.env ?? process.env)});
    activeChildren++;
    const forward = signal => child.kill(signal);
    const int = () => forward('SIGINT'), term = () => forward('SIGTERM');
    process.on('SIGINT', int); process.on('SIGTERM', term);
    child.on('error', e => console.error(e.message));
    child.on('close', (code, signal) => {
      activeChildren--;
      process.off('SIGINT', int); process.off('SIGTERM', term);
      resolve(code ?? (signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1));
    });
  });
}
/** Shared `node --test` children get an explicit --test-concurrency (inserted after --test); a larger one is refused. */
export function boundTestConcurrency(args, tokens) {
  const at = args.indexOf('--test');
  if (at < 0) return args;
  const given = args.find(a => /^--test-concurrency(=|$)/.test(a));
  if (!given) return [...args.slice(0, at + 1), `--test-concurrency=${tokens}`, ...args.slice(at + 1)];
  const k = Number(given.includes('=') ? given.split('=')[1] : args[args.indexOf(given) + 1]);
  if (!(k >= 1 && k <= tokens)) throw new Error(`--test-concurrency ${k} exceeds the ${tokens} shared tokens`);
  return args;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), divider = args.indexOf('--'), own = args.slice(0, Math.max(0, divider));
  const option = name => { const i = own.indexOf(name); return i < 0 ? undefined : own[i + 1]; };
  if (divider < 0 || !args[divider + 1]) throw new Error('usage: test-slot.mjs [--timeout-ms N] [--shared K] -- command args...');
  // --shared K takes effect only with ATLAS_SLOT_SHARED=1; without it every CLI call is exclusive, exactly as before.
  const k = option('--shared') === undefined ? null : Number(option('--shared'));
  const shared = k !== null && sharedSlotEnabled();
  const command = args[divider + 1] === 'node' ? process.execPath : args[divider + 1];
  const childArgs = shared && args[divider + 1] === 'node' ? boundTestConcurrency(args.slice(divider + 2), k) : args.slice(divider + 2);
  process.exitCode = await withTestSlot({owner: args.slice(divider + 1).join(' ').slice(0, 160), timeoutMs: option('--timeout-ms') === undefined ? Infinity : Number(option('--timeout-ms')),
    ...(shared ? {mode: 'shared', tokens: k} : {})}, () => runCommand(command, childArgs));
}
