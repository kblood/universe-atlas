// Machine-wide test slot (docs/test-policy.md "Slot and exit codes"; shared/exclusive design: docs/shared-test-slot-2026-10-07.md).
// EXCLUSIVE (the only class when ATLAS_SLOT_SHARED is unset/0 at the call; runner entry points default it to 1, O1): atomic mkdir of TEST_SLOT_DIR with
// owner.txt. Before an exclusive holder runs it also waits until no live SHARED holder remains (a no-op when nobody uses
// the shared class). SHARED (ATLAS_SLOT_SHARED=1 only): a holder file `<dir>.shared/<token>.json` {pid, host, tokens};
// admitted while the exclusive dir is absent and the live tokens stay <= SLOT_CAPACITY. Writer priority: a shared caller
// writes its file, then re-checks the exclusive dir and backs off if one appeared; an exclusive caller takes the dir
// first (so no new shared holder enters) and then drains. Dead LOCAL pids are reaped; foreign or unreadable holders are
// never broken. Never nest: a child of a holder inherits ATLAS_TEST_SLOT_TOKEN and (flag on) runs through without a
// second level. Lock order merge -> slot -> GPU: asking for the slot while this process (or an ancestor) holds or waits
// for the GPU lock throws.
// I8 / T1 (docs/shared-test-slot-2026-10-07.md "Tickets, pending waits and the descendant registry"):
// - PENDING WAITS + FIFO TICKETS: every waiter publishes `<dir>.pending/<µs17>-<seq6>-<uuid>.json` {pid, mode, tokens,
//   since} from the start of its wait until it holds, times out or is aborted (`signal`). The in-process count is on a
//   globalThis symbol, and gpu-lock.mjs refuses the GPU lock while it is non-zero. A shared waiter is admitted only when
//   no live exclusive ticket and no earlier live shared ticket exists (exclusive keeps priority); dead local tickets are
//   reaped, tickets without a heartbeat for ticketStaleMs or of a process that already holds the slot never block.
// - DESCENDANT REGISTRY: a pass-through child registers `<dir>.nested/<id>.json` {pid, root token, parent id, tokens}.
//   The tokens of the live siblings under one parent sum to at most the parent's tokens (a sibling waits). A holder whose
//   process died or released while a registered descendant still runs is RE-HOMED (same token, pid of the descendant)
//   instead of reaped, so old and new code both keep counting it until the last descendant exits.
// The exclusive mkdir dir and `<dir>.shared/*.json` keep their old formats; old code never reads the new directories.
import {mkdir, readFile, rename, rm, stat, writeFile, readdir, utimes} from 'node:fs/promises';
import {writeFileSync, readFileSync, rmSync, utimesSync, existsSync, readdirSync, renameSync, mkdirSync, watch} from 'node:fs';
import {hostname} from 'node:os';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export const TEST_SLOT_DIR = process.env.ATLAS_TEST_SLOT_DIR || 'C:/LLM/IWSDK/.atlas-test-slot';
/** CPU tokens of the machine (16C/32T) handed to shared holders; 4 threads stay free for tsc, Vite, codex, the coordinator. */
export const SLOT_CAPACITY = 28;
/** A ticket whose heartbeat (mtime, refreshed every heartbeatMs) is older than this keeps no queue position (it is kept). */
export const TICKET_STALE_MS = 120000;
/** Slot class per run class when ATLAS_SLOT_SHARED=1. `tokens` is also the run's explicit --test-concurrency / --jobs.
 * test:full stays exclusive until the I3 load proof has also run on the test:full shards (critic correction, plan part 2).
 * `npm test` is listed for the CLI (`--shared 16`); package.json is merger-owned (needs: line in the design doc). */
export const RUN_CLASSES = Object.freeze({
  pkg: {mode: 'shared', tokens: 4}, affected: {mode: 'shared', tokens: 8}, fast: {mode: 'shared', tokens: 8},
  smoke: {mode: 'shared', tokens: 16}, work: {mode: 'shared', tokens: 16}, default: {mode: 'shared', tokens: 16}, 'npm-test': {mode: 'shared', tokens: 16},
  full: {mode: 'exclusive'}, perf: {mode: 'exclusive'}, 'cost-fair': {mode: 'exclusive'}, 'desktop-perf': {mode: 'exclusive'},
});
/** ATLAS_SLOT_SHARED: unset/'0' = off (library default; see defaultSharedSlotOn), '1' = on; anything else fails closed. Read at call time. */
export function sharedSlotEnabled(env = process.env) {
  const v = env.ATLAS_SLOT_SHARED ?? '';
  if (v !== '' && v !== '0' && v !== '1') throw new Error(`ATLAS_SLOT_SHARED must be 0 or 1, got ${JSON.stringify(v)}`);
  return v === '1';
}
/** Runner entry points (the test-runner.mjs CLI: test:pkg/affected/fast/smoke/work/all/full/perf, and this file's CLI:
 * npm test, cost-fair run.sh) call this first: since 2026-10-07 (review O1, I3 load proof in
 * docs/shared-test-slot-2026-10-07.md) the flag is ON for every runner of this checkout unless the caller's env sets it.
 * `ATLAS_SLOT_SHARED=0` still turns it off. Written into process.env so children inherit it (never-nest pass-through).
 * Library imports (acquireTestSlot, runTests) are unaffected: they read the env as given. */
export function defaultSharedSlotOn(env = process.env) {
  if (env.ATLAS_SLOT_SHARED === undefined) env.ATLAS_SLOT_SHARED = '1';
  return sharedSlotEnabled(env);
}
/** The slot class for a named run class: always exclusive while the flag is off. */
export function slotClass(name, env = process.env) {
  const c = RUN_CLASSES[name];
  if (!c) throw new Error(`unknown run class ${name}`);
  return sharedSlotEnabled(env) ? {...c} : {mode: 'exclusive'};
}
export const sharedDir = dir => `${dir}.shared`;
/** FIFO tickets and published pending waits (new code only; old checkouts never read it). */
export const pendingDir = dir => `${dir}.pending`;
/** Descendant registry of pass-through children (new code only). */
export const nestedDir = dir => `${dir}.nested`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const sleep = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));
const sleepSync = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
let activeChildren = 0;
// Slots held by THIS process (innermost last); its token is injected into children (runCommand / slotEnv), never into
// this process's own env, so two in-process acquisitions never pass through each other.
const HELD = globalThis[Symbol.for('atlas.test-slot.held')] ??= [];
// Slot waits of THIS process that have not resolved yet (published for gpu-lock.mjs: no GPU lock while one is pending).
const PENDING = globalThis[Symbol.for('atlas.test-slot.pending')] ??= {waits: 0, owners: []};
// This process's registry entries, one per (dir, root token); refcounted, released at exit.
const NESTED = new Map();
// This process's ticket files, removed at exit (a killed process leaves them to the dead-pid reaper).
const TICKETS = new Map();
process.on('exit', () => {
  for (const n of [...NESTED.values()]) n.releaseNow();
  for (const [path, t] of TICKETS) { clearInterval(t.timer); try { rmSync(path, {force: true}); } catch {} }
});
function dead(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return false; } catch (e) { return e.code === 'ESRCH'; }
}
/** `env` plus ATLAS_TEST_SLOT_TOKEN of the innermost slot this process holds (children inherit it: never nest). A
 * pass-through child also hands its registry id down as ATLAS_TEST_SLOT_NESTED, so its own children are counted
 * against its tokens, never as its siblings (that would make a child wait for its own parent). */
export function slotEnv(env = process.env) {
  const held = HELD.at(-1);
  if (held) { const out = {...env, ATLAS_TEST_SLOT_TOKEN: held.token}; delete out.ATLAS_TEST_SLOT_NESTED; return out; }
  const nested = [...NESTED.values()].at(-1);
  return nested ? {...env, ATLAS_TEST_SLOT_TOKEN: nested.root, ATLAS_TEST_SLOT_NESTED: nested.id} : env;
}
/** Lock order merge -> slot -> GPU (docs/test-policy.md "Lock order"). gpu-lock.mjs publishes its state in-process and,
 * for children, through ATLAS_GPU_LOCK_HELD. Waiting for the slot while holding or waiting for the GPU can deadlock. */
export function assertSlotLockOrder(owner) {
  const gpu = globalThis[Symbol.for('atlas.gpu-lock.state')];
  const why = process.env.ATLAS_GPU_LOCK_HELD ? `the GPU lock is held (${process.env.ATLAS_GPU_LOCK_HELD.trim()})`
    : gpu?.held ? 'this process holds the GPU lock' : gpu?.waiting ? 'this process is waiting for the GPU lock' : null;
  if (why) throw new Error(`lock order violation: "${owner}" asks for the test slot while ${why}; the order is merge -> slot -> GPU, never GPU -> slot (docs/test-policy.md)`);
}
/** The slot waits this process has not resolved yet ({waits, owners}); gpu-lock.mjs reads the same globalThis state. */
export function pendingSlotWaits() { return {waits: PENDING.waits, owners: [...PENDING.owners]}; }
function beginPending(owner) {
  PENDING.waits++; PENDING.owners.push(owner);
  let done = false;
  return () => { if (done) return; done = true; PENDING.waits--; const i = PENDING.owners.lastIndexOf(owner); if (i >= 0) PENDING.owners.splice(i, 1); };
}

// fs.watch wakes a waiter as soon as a holder, ticket or registry entry changes; the retry timer is the fallback (and the
// only mechanism with ATLAS_SLOT_WATCH=0). Burst events collapse into one re-check after a short debounce. The exclusive
// dir itself is never watched (an open handle could make an old holder's release fail); its parent is.
function waitChange(paths, ms, signal) {
  return new Promise(resolve => {
    const watchers = []; let done = false, woke = false;
    const finish = () => {
      if (done) return; done = true; clearTimeout(timer);
      for (const w of watchers) { try { w.close(); } catch {} }
      signal?.removeEventListener('abort', finish); resolve();
    };
    let timer = setTimeout(finish, Math.max(0, ms));
    const soon = () => { if (woke || done) return; woke = true; clearTimeout(timer); timer = setTimeout(finish, Math.min(Math.max(0, ms), 10 + Math.random() * 30)); };
    if (process.env.ATLAS_SLOT_WATCH !== '0') for (const p of paths) {
      try { const w = watch(p, {persistent: false}, soon); w.on('error', () => {}); watchers.push(w); } catch {}
    }
    if (signal) { if (signal.aborted) finish(); else signal.addEventListener('abort', finish, {once: true}); }
  });
}
const aborted = signal => { if (signal?.aborted) throw signal.reason ?? new Error('test slot wait aborted'); };

// ---- descendant registry (sync: it also runs from exit handlers) ----
/** Live registered pass-through descendants of `dir`; dead local entries are reaped, foreign/unreadable ones skipped. */
export function nestedEntries(dir) {
  const nd = nestedDir(dir);
  let names; try { names = readdirSync(nd); } catch { return []; }
  const out = [];
  for (const name of names) {
    if (!name.endsWith('.json') || name.startsWith('.')) continue;
    let text, e; try { text = readFileSync(`${nd}/${name}`, 'utf8'); e = JSON.parse(text); } catch { continue; }
    if (e?.host !== hostname() || !Number.isSafeInteger(e.pid)) continue;
    if (dead(e.pid)) {
      // Entry names are fresh uuids, never reused: removing this name can only remove the dead entry.
      try { rmSync(`${nd}/${name}`, {force: true}); } catch {}
      console.error(`REAPED nested test-slot entry: ${text.trim()} (pid verifiably dead on this host)`); continue;
    }
    out.push({...e, file: name});
  }
  return out;
}
const descendantsOf = (dir, root, exceptPid) => root ? nestedEntries(dir).filter(e => e.root === root && e.pid !== exceptPid) : [];
function renameRetry(from, to) {
  for (let i = 0; ; i++) {
    try { renameSync(from, to); return; } catch (e) { if (i >= 20 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e; sleepSync(10); }
  }
}
// Points a holder record (owner.txt or a shared json) whose process died or released at a live descendant: same token, so
// the descendants still find it; a live pid, so old and new reapers keep it. Only if the record is still `text`.
function rehome(path, text, holder, to, why) {
  try { if (readFileSync(path, 'utf8') !== text) return null; } catch { return null; }
  const next = JSON.stringify({...holder, pid: to.pid, rehomed: {from: holder.pid, to: to.token, at: new Date().toISOString(), why}});
  const tmp = `${dirname(path)}/.rehome-${randomUUID()}.tmp`;
  try { writeFileSync(tmp, next); renameRetry(tmp, path); } catch (e) {
    try { rmSync(tmp, {force: true}); } catch {}
    console.error(`could not re-home test-slot holder ${path}: ${e.code ?? e.message}`); return null;
  }
  console.error(`RE-HOMED test-slot holder ${holder.token} from pid ${holder.pid} to live descendant pid ${to.pid} (${why})`);
  return next;
}
// The root holder record of `token` in `dir`: the exclusive owner.txt or the shared holder file.
function readRoot(dir, token) {
  const read = path => { try { const text = readFileSync(path, 'utf8'); const h = JSON.parse(text); return h?.token === token ? {path, text, h} : null; } catch { return null; } };
  const ex = read(`${dir}/owner.txt`); if (ex) return {...ex, parent: 'exclusive'};
  const sh = read(`${sharedDir(dir)}/${token}.json`); return sh ? {...sh, parent: 'shared'} : null;
}
// A dead local root holder with live descendants is re-homed to one of them (the descendant keeps it alive).
function rescueRoot(dir, token, root = readRoot(dir, token)) {
  if (!root || root.h.host !== hostname() || !dead(root.h.pid)) return root;
  const heirs = descendantsOf(dir, token);
  if (!heirs.length) return root;
  const next = rehome(root.path, root.text, root.h, heirs[0], 'holder died');
  return next ? {...root, text: next, h: JSON.parse(next)} : readRoot(dir, token);
}

// Inspect an existing exclusive dir: reap it if its owner is a verifiably dead LOCAL pid (or re-home it to a live
// registered descendant), otherwise report the holder.
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
    const heirs = descendantsOf(dir, holder.token);
    if (heirs.length) {
      const next = rehome(`${dir}/owner.txt`, text, holder, heirs[0], 'holder died');
      await rm(`${dir}/reaping`, {recursive: true, force: true});
      return next ? {state: 'held', text: next, age} : {state: 'retry'};
    }
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
/** Live shared holders of `dir` (dead local pids are reaped on the way unless a registered descendant still runs, which
 * re-homes the holder; an unreadable holder counts as `capacity`). */
export async function sharedHolders(dir, {capacity = SLOT_CAPACITY} = {}) {
  const sd = sharedDir(dir);
  let names;
  try { names = await readdir(sd); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  const live = [];
  const entry = (h, name, text) => ({...h, file: name, tokens: Number.isSafeInteger(h?.tokens) && h.tokens > 0 ? h.tokens : capacity, text: text.trim()});
  for (const name of names.filter(n => n.endsWith('.json') && !n.startsWith('.'))) {
    let text, h;
    try { text = await readFile(`${sd}/${name}`, 'utf8'); h = JSON.parse(text); } catch (e) {
      if (e.code === 'ENOENT') continue; // released meanwhile
      live.push({file: name, tokens: capacity, text: '(unreadable holder file; never broken)'}); continue;
    }
    if (h?.host === hostname() && dead(h.pid)) {
      const heirs = descendantsOf(dir, h.token);
      if (heirs.length) {
        // Its tokens are still in use by a descendant: keep counting them (conservatively also if the re-home lost a race).
        const next = rehome(`${sd}/${name}`, text, h, heirs[0], 'holder died');
        live.push(next ? entry(JSON.parse(next), name, next) : entry(h, name, text)); continue;
      }
      // Holder files are named by a fresh uuid and never reused, so removing this name can only remove the dead holder.
      await rm(`${sd}/${name}`, {force: true});
      console.error(`REAPED shared test-slot holder: ${text.trim()} (pid verifiably dead on this host)`); continue;
    }
    live.push(entry(h, name, text));
  }
  return live;
}

// A child of a holder (ATLAS_TEST_SLOT_TOKEN matches a holder of `dir` whose pid is ALIVE on this host, or re-homed to a
// live descendant) runs through without a second level. A dead or foreign holder is no ancestor: acquire normally (the
// dead one gets reaped). A nested shared request may not ask for more tokens than its parent holds, and the live
// siblings under one parent share the parent's tokens (a sibling waits). One registry entry per process and root.
async function inheritedSlot(dir, mode, tokens, {owner, retryMs, timeoutMs, heartbeatMs, signal}) {
  const token = process.env.ATLAS_TEST_SLOT_TOKEN;
  if (!token || !UUID.test(token)) return null;
  let root = rescueRoot(dir, token);
  if (!root || root.h.host !== hostname() || !Number.isSafeInteger(root.h.pid) || root.h.pid <= 0 || dead(root.h.pid)) return null;
  const rootMode = root.parent;
  if (rootMode === 'shared' && mode === 'exclusive') throw new Error('never nest: an exclusive test slot was requested inside a SHARED holder (ATLAS_TEST_SLOT_TOKEN); take the exclusive slot at the top level instead');
  const rootBudget = rootMode === 'shared' ? root.h.tokens : SLOT_CAPACITY;
  // The immediate parent: the registry entry named by ATLAS_TEST_SLOT_NESTED (or, if the env lost it, our parent pid's
  // entry), else the root holder itself.
  const entries = nestedEntries(dir).filter(e => e.root === token);
  const named = process.env.ATLAS_TEST_SLOT_NESTED;
  const pe = entries.find(e => UUID.test(named ?? '') && e.token === named) ?? entries.find(e => e.pid === process.ppid);
  const parent = pe ? {id: pe.token, tokens: pe.tokens, label: 'nested parent'} : {id: token, tokens: rootBudget, label: `${rootMode} parent`};
  if (mode === 'shared' && !(tokens <= parent.tokens)) throw new Error(`never nest: a nested shared request of ${tokens} tokens exceed the ${parent.tokens} of the ${parent.label} (ATLAS_TEST_SLOT_TOKEN); ask for at most ${parent.tokens}`);
  const key = `${dir}\0${token}`, mine = NESTED.get(key);
  // A second acquisition in a process that already has an entry for this root is accounted by that entry.
  if (mine) { mine.refs++; return mine.lock(); }
  const take = mode === 'shared' ? tokens : parent.tokens, id = randomUUID(), nd = nestedDir(dir), file = `${nd}/${id}.json`;
  const text = JSON.stringify({name: owner, pid: process.pid, host: hostname(), time: new Date().toISOString(), token: id, root: token, parent: parent.id, class: 'nested', mode, tokens: take});
  const started = Date.now();
  let why = 'not tried', endPending = null;
  try {
    for (let attempt = 0; ; attempt++) {
      if (attempt) {
        const left = timeoutMs - (Date.now() - started);
        if (left <= 0) throw new Error(`test slot (nested, ${take} of ${parent.tokens} tokens) still unavailable: ${why}`);
        assertSlotLockOrder(owner); // a pass-through that has to wait is a slot wait: never while holding/awaiting the GPU
        endPending ??= beginPending(owner);
        if (attempt % 30 === 1) console.error(`waiting for nested test slot (${take} tokens of the ${parent.label}): ${why} - retry in ${retryMs / 1000} s`);
        await waitChange([nd], Math.min(retryMs * (0.5 + Math.random()), left), signal);
        aborted(signal);
        root = rescueRoot(dir, token);
        if (!root || dead(root.h.pid)) return null; // the root is gone: no ancestor any more, acquire normally
      }
      mkdirSync(nd, {recursive: true});
      writeFileSync(`${nd}/.${id}.tmp`, text); renameRetry(`${nd}/.${id}.tmp`, file);
      // Publish, then sum the live siblings including ourselves (the same Dekker argument as the shared admission).
      const sibs = nestedEntries(dir).filter(e => e.root === token && e.parent === parent.id), used = sibs.reduce((a, e) => a + (Number(e.tokens) || 0), 0);
      if (sibs.some(e => e.token === id) && used <= parent.tokens) break;
      try { rmSync(file, {force: true}); } catch {}
      why = `${used - take}/${parent.tokens} tokens of the ${parent.label} in use by nested sibling(s) ${sibs.filter(e => e.token !== id).map(e => `${e.name} pid ${e.pid}`).join('; ')}`;
    }
  } catch (e) { try { rmSync(file, {force: true}); } catch {} throw e; } finally { endPending?.(); }
  const prevEnv = process.env.ATLAS_TEST_SLOT_NESTED;
  process.env.ATLAS_TEST_SLOT_NESTED = id;
  const n = {id, root: token, dir, refs: 1, released: false};
  // Heartbeat: if the root holder died meanwhile, re-home it to a live descendant (possibly us).
  n.timer = setInterval(() => { try { rescueRoot(dir, token); } catch {} }, heartbeatMs); n.timer.unref();
  n.releaseNow = () => {
    if (n.released) return; n.released = true; clearInterval(n.timer); NESTED.delete(key);
    try { rmSync(file, {force: true}); } catch {}
    if (process.env.ATLAS_TEST_SLOT_NESTED === id) { if (prevEnv === undefined) delete process.env.ATLAS_TEST_SLOT_NESTED; else process.env.ATLAS_TEST_SLOT_NESTED = prevEnv; }
    // The root was re-homed to us: hand it to another live descendant, or free it (we were its last process).
    const r = readRoot(dir, token);
    if (!r || r.h.rehomed?.to !== id || r.h.pid !== process.pid) return;
    const heirs = descendantsOf(dir, token, process.pid);
    if (heirs.length) { rehome(r.path, r.text, r.h, heirs[0], 'descendant released'); return; }
    try { if (readFileSync(r.path, 'utf8') === r.text) rmSync(r.parent === 'exclusive' ? dir : r.path, {recursive: true, force: true}); } catch {}
  };
  n.lock = () => {
    let done = false;
    return {release() { if (done) return; done = true; if (--n.refs <= 0) n.releaseNow(); }, owner: `(inherited ${rootMode} slot)`, token, id, mode: rootMode, tokens: take, nested: true};
  };
  NESTED.set(key, n);
  return n.lock();
}
const heldIn = dir => HELD.filter(e => e.dir === dir).length + [...NESTED.values()].filter(n => n.dir === dir).length;
function hold({kind, token, text, file, cleanup, heartbeatMs, dir}) {
  let released = false;
  const ours = () => { try { return readFileSync(file, 'utf8') === text; } catch { return false; } };
  const entry = {token, kind, dir};
  const release = () => {
    if (released) return;
    released = true; clearInterval(timer);
    process.off('exit', release); process.off('SIGINT', interrupt); process.off('SIGTERM', terminate);
    const i = HELD.indexOf(entry); if (i >= 0) HELD.splice(i, 1);
    if (!ours()) return;
    // A registered descendant in another process still runs: the record lives on under its pid until it exits.
    const heirs = descendantsOf(dir, token, process.pid);
    if (heirs.length && rehome(file, text, JSON.parse(text), heirs[0], 'holder released while a descendant still runs')) return;
    cleanup();
  };
  const interrupt = () => { if (!activeChildren) { release(); process.exit(130); } };
  const terminate = () => { if (!activeChildren) { release(); process.exit(143); } };
  const timer = setInterval(() => { if (ours()) { const now = new Date(); try { utimesSync(file, now, now); } catch {} } }, heartbeatMs);
  timer.unref();
  process.on('exit', release); process.on('SIGINT', interrupt); process.on('SIGTERM', terminate);
  HELD.push(entry);
  return {release, owner: text, token, mode: kind};
}

// ---- FIFO tickets ----
let ticketSeq = 0;
// `<µs since epoch, 17 digits>-<per-process seq>-<uuid>.json`: lexical order = arrival order (µs clock across processes,
// the sequence inside one, the uuid breaks exact ties). Written as `.<uuid>.tmp` and renamed, so readers never see half.
async function publishTicket(dir, {owner, mode, tokens, heartbeatMs}) {
  const pd = pendingDir(dir), id = randomUUID();
  const us = Math.floor((performance.timeOrigin + performance.now()) * 1000);
  const name = `${String(us).padStart(17, '0')}-${String(++ticketSeq % 1e6).padStart(6, '0')}-${id}.json`, path = `${pd}/${name}`, tmp = `${pd}/.${id}.tmp`;
  const text = JSON.stringify({name: owner, pid: process.pid, host: hostname(), time: new Date().toISOString(), since: Date.now(), ticket: id, class: 'ticket', mode, ...(mode === 'shared' ? {tokens} : {}), holds: heldIn(dir)});
  try { await mkdir(pd, {recursive: true}); await writeFile(tmp, text); await rename(tmp, path); } catch (e) {
    await removeOwn(tmp);
    console.error(`could not publish a test-slot ticket in ${pd} (${e.code ?? e.message}); waiting behind every queued shared caller`);
    return null;
  }
  const timer = setInterval(() => { const now = new Date(); try { utimesSync(path, now, now); } catch {} }, heartbeatMs); timer.unref();
  TICKETS.set(path, {timer});
  return {path, name};
}
async function removeTicket(ticket) {
  if (!ticket) return;
  const t = TICKETS.get(ticket.path); if (t) clearInterval(t.timer);
  TICKETS.delete(ticket.path);
  await removeOwn(ticket.path);
}
// The live tickets that keep a shared waiter out: any exclusive ticket (writer priority) and every earlier shared one.
// Dead local tickets are reaped; unreadable, stale (no heartbeat) tickets and those of a process that already holds the
// slot keep no queue position and are never deleted. Tickets only order the waiters: the holder files still bound tokens.
async function queueAhead(dir, ticket, staleMs) {
  const pd = pendingDir(dir);
  let names; try { names = await readdir(pd); } catch (e) { if (e.code === 'ENOENT') return {exclusive: [], ahead: []}; throw e; }
  const exclusive = [], ahead = [];
  for (const name of names) {
    if (!name.endsWith('.json') || name.startsWith('.') || name === ticket?.name) continue;
    let text, t, st;
    try { st = await stat(`${pd}/${name}`); text = await readFile(`${pd}/${name}`, 'utf8'); t = JSON.parse(text); } catch { continue; }
    if (t?.host === hostname() && dead(t.pid)) {
      await rm(`${pd}/${name}`, {force: true}).catch(() => {});
      console.error(`REAPED test-slot ticket: ${text.trim()} (pid verifiably dead on this host)`); continue;
    }
    // A waiter whose process already holds this slot may be waiting on itself (in-process nesting): other processes do not
    // queue behind it. Inside that process its tickets still order its own waiters.
    if (Date.now() - st.mtimeMs > staleMs || (t?.holds > 0 && t.pid !== process.pid)) continue;
    if (t?.mode === 'exclusive') exclusive.push(t);
    else if (!ticket || name < ticket.name) ahead.push(t);
  }
  return {exclusive, ahead};
}

/** Exclusive (default) or, with ATLAS_SLOT_SHARED=1, shared `{mode: 'shared', tokens: k}` hold of the test slot.
 * `signal` (AbortSignal) cancels a pending wait. While the wait is pending this process may not take the GPU lock
 * (gpu-lock.mjs refuses): the order is slot -> GPU. */
export async function acquireTestSlot({owner = 'node tests', dir = TEST_SLOT_DIR, retryMs = 1000, timeoutMs = Infinity, heartbeatMs = 10000, mode = 'exclusive', tokens, capacity = SLOT_CAPACITY, signal, ticketStaleMs = TICKET_STALE_MS} = {}) {
  if (!(retryMs > 0) || !(heartbeatMs > 0) || !(timeoutMs >= 0) || !(ticketStaleMs > 0)) throw new Error('invalid test slot timeout/interval');
  if (mode !== 'exclusive' && mode !== 'shared') throw new Error(`test slot mode must be exclusive|shared, got ${mode}`);
  if (mode === 'shared' && !(Number.isSafeInteger(tokens) && tokens >= 1 && tokens <= capacity)) throw new Error(`a shared test slot needs explicit tokens in 1..${capacity}, got ${tokens}`);
  aborted(signal);
  const shared = sharedSlotEnabled();
  if (shared) { const nested = await inheritedSlot(dir, mode, tokens, {owner, retryMs, timeoutMs, heartbeatMs, signal}); if (nested) return nested; }
  assertSlotLockOrder(owner);
  const endPending = beginPending(owner);
  let ticket = null;
  try {
    ticket = await publishTicket(dir, {owner, mode: shared && mode === 'shared' ? 'shared' : 'exclusive', tokens, heartbeatMs});
    const o = {owner, dir, retryMs, timeoutMs, heartbeatMs, capacity, signal, ticket, ticketStaleMs};
    if (shared && mode === 'shared') return await acquireShared({...o, tokens});
    return await acquireExclusive(o);
  } finally { endPending(); await removeTicket(ticket); }
}
const watched = dir => [dirname(dir), sharedDir(dir), pendingDir(dir)];
async function acquireExclusive({owner, dir, retryMs, timeoutMs, heartbeatMs, capacity, signal}) {
  const started = Date.now(), wait = ms => waitChange(watched(dir), ms, signal).then(() => aborted(signal));
  let attempts = 0;
  for (;;) {
    if (attempts++ && Date.now() - started >= timeoutMs) throw new Error(`test slot still held by ${await readFile(`${dir}/owner.txt`, 'utf8').catch(() => '(owner unavailable)')}`);
    try { await mkdir(dir); } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      const s = await inspectExclusive(dir);
      if (s.state === 'wait') { await wait(retryMs); continue; }
      if (s.state === 'retry') continue;
      if (Date.now() - started >= timeoutMs) throw new Error(`test slot still held by ${s.text.trim()}`);
      console.error(`waiting for test slot: held by ${s.text.trim()} (${s.age}) - retry in ${retryMs / 1000} s`);
      await wait(Math.min(retryMs, timeoutMs - (Date.now() - started))); continue;
    }
    const token = randomUUID();
    const text = JSON.stringify({name: owner, pid: process.pid, host: hostname(), time: new Date().toISOString(), token});
    try { writeFileSync(`${dir}/owner.txt`, text); } catch (e) { await rm(dir, {recursive: true}); throw e; }
    const lock = hold({kind: 'exclusive', token, text, file: `${dir}/owner.txt`, heartbeatMs, dir, cleanup: () => rmSync(dir, {recursive: true, force: true})});
    // Drain: the dir already keeps new shared holders out (writer priority); wait for the admitted ones to finish.
    // Without shared holders (flag off everywhere) this is one empty readdir: today's behaviour.
    for (let waits = 0;; waits++) {
      let live;
      try { live = await sharedHolders(dir, {capacity}); } catch (e) { lock.release(); throw e; }
      if (!live.length) return lock;
      const used = live.reduce((a, h) => a + h.tokens, 0);
      if (Date.now() - started >= timeoutMs) { lock.release(); throw new Error(`test slot still held by ${live.length} shared holder(s), ${used} tokens: ${live.map(h => h.text).join('; ')}`); }
      if (!waits || waits % 30 === 0) console.error(`exclusive test slot taken; draining ${live.length} shared holder(s) (${used} tokens): ${live.map(h => h.text).join('; ')}`);
      try { await wait(Math.min(retryMs, timeoutMs - (Date.now() - started))); } catch (e) { lock.release(); throw e; }
    }
  }
}
/** Test-only interleaving points of the shared admission (tests/test-slot.test.mjs). All null/false in production.
 * `ignoreQueue` makes a shared waiter skip the FIFO check (the pre-ticket behaviour; negative tests only). */
export const slotTestHooks = {beforePublish: null, afterPublish: null, ignoreQueue: false};
// Deletes our own holder file; Windows can refuse a delete transiently (EPERM/EBUSY), so retry before giving up loudly.
async function removeOwn(path) {
  for (let i = 0; ; i++) {
    try { await rm(path, {force: true}); return; } catch (e) {
      if (i >= 20) { console.error(`could not remove own test-slot file ${path}: ${e.code ?? e.message}; it is reaped once this pid exits`); return; }
      await sleep(25);
    }
  }
}
async function acquireShared({owner, dir, retryMs, timeoutMs, heartbeatMs, tokens, capacity, signal, ticket, ticketStaleMs}) {
  const started = Date.now(), sd = sharedDir(dir), token = randomUUID(), file = `${sd}/${token}.json`, tmp = `${sd}/.${token}.tmp`;
  const text = JSON.stringify({name: owner, pid: process.pid, host: hostname(), time: new Date().toISOString(), token, class: 'shared', tokens});
  let why = 'not tried';
  for (let attempt = 0; ; attempt++) {
    // Every retry, including a failed takeover of a dead exclusive owner, passes the deadline check and sleeps.
    if (attempt) {
      const left = timeoutMs - (Date.now() - started);
      if (left <= 0) throw new Error(`test slot (shared, ${tokens} tokens) still unavailable: ${why}`);
      if (attempt % 30 === 1) console.error(`waiting for shared test slot (${tokens} tokens): ${why} - retry in ${retryMs / 1000} s`);
      // Jitter breaks lock-step retries of two callers that both backed off; a watched change wakes the waiter early.
      await waitChange(watched(dir), Math.min(retryMs * (0.5 + Math.random()), left), signal);
      aborted(signal);
    }
    if (existsSync(dir)) {
      const s = await inspectExclusive(dir);
      why = s.state === 'held' ? `exclusive held by ${s.text.trim()} (${s.age})` : s.state === 'wait' ? 'exclusive owner being reaped' : 'takeover of a dead exclusive owner attempted';
      continue;
    }
    // FIFO: an exclusive waiter goes first (writer priority), then every earlier shared ticket.
    if (!slotTestHooks.ignoreQueue) {
      const q = await queueAhead(dir, ticket, ticketStaleMs);
      if (q.exclusive.length) { why = `an exclusive caller is queued (${q.exclusive.map(t => `${t.name} pid ${t.pid}`).join('; ')})`; continue; }
      if (q.ahead.length) { why = `queued behind ${q.ahead.length} earlier shared waiter(s) (${q.ahead.map(t => `${t.name} pid ${t.pid}, ${t.tokens} tokens`).join('; ')})`; continue; }
    }
    // Read-only pre-check: do not publish (and wake every watcher) while the tokens visibly do not fit.
    const seen = await sharedHolders(dir, {capacity}), seenUsed = seen.reduce((a, h) => a + h.tokens, 0);
    if (seenUsed + tokens > capacity) { why = `${seenUsed}/${capacity} tokens in use by ${seen.map(h => h.text).join('; ')}`; continue; }
    await slotTestHooks.beforePublish?.();
    // Publish first, then look (Dekker): whichever of two callers looks last sees the other, so the admitted token total
    // never exceeds capacity, and an exclusive caller that took the gate before our re-check always wins.
    let admitted = null;
    try {
      await mkdir(sd, {recursive: true});
      await writeFile(tmp, text); await rename(tmp, file);
      await slotTestHooks.afterPublish?.();
      if (existsSync(dir)) why = 'an exclusive caller arrived (writer priority)';
      else {
        const live = await sharedHolders(dir, {capacity}), used = live.reduce((a, h) => a + h.tokens, 0);
        if (live.some(h => h.file === `${token}.json`) && used <= capacity) admitted = hold({kind: 'shared', token, text, file, heartbeatMs, dir, cleanup: () => rmSync(file, {force: true})});
        else why = `${used - tokens}/${capacity} tokens in use by ${live.filter(h => h.token !== token).map(h => h.text).join('; ')}`;
      }
    } finally {
      // Until hold() owns the file, every exit path (back-off or a throw) removes our reservation.
      if (!admitted) { await removeOwn(file); await removeOwn(tmp); }
    }
    if (admitted) return admitted;
  }
}
/** Holds the slot for `work(lock)` and releases it on success or failure. Since 2026-10-07 `work` receives the lock
 * (it used to be called with no argument); callbacks that ignore their arguments are unaffected.
 * Lock order merge -> slot -> GPU: a GPU lock is taken INSIDE `work` (withGpuLock), never around this call and never
 * from another async path while this acquisition is still pending. */
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
/** True for a node executable: `node`, `node.exe`, any path whose basename is node[.exe], or this process's execPath. */
export function isNodeCommand(command) {
  return /^node(\.exe)?$/i.test(String(command).split(/[\/]/).pop()) || command === process.execPath;
}
/** Shared `node --test` children get an explicit --test-concurrency (inserted after --test). Node uses the LAST
 * occurrence, so that one must be in 1..tokens; an occurrence without a value is refused. */
export function boundTestConcurrency(args, tokens) {
  const at = args.indexOf('--test');
  if (at < 0) return args;
  const values = [];
  args.forEach((a, i) => {
    if (a === '--test-concurrency') values.push(args[i + 1] === undefined || args[i + 1].startsWith('--') ? undefined : args[i + 1]);
    else if (a.startsWith('--test-concurrency=')) values.push(a.slice('--test-concurrency='.length) || undefined);
  });
  if (!values.length) return [...args.slice(0, at + 1), `--test-concurrency=${tokens}`, ...args.slice(at + 1)];
  if (values.includes(undefined)) throw new Error('--test-concurrency needs a value');
  const k = Number(values.at(-1));
  if (!(Number.isSafeInteger(k) && k >= 1 && k <= tokens)) throw new Error(`--test-concurrency ${values.at(-1)} exceeds the ${tokens} shared tokens (node uses the last occurrence)`);
  return args;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), divider = args.indexOf('--'), own = args.slice(0, Math.max(0, divider));
  if (divider < 0 || !args[divider + 1]) throw new Error('usage: test-slot.mjs [--timeout-ms N] [--shared K] -- command args...');
  // An option given without its value fails here, before acquiring (the old parser read the `--` as NaN and refused).
  const option = name => { const i = own.indexOf(name); if (i < 0) return undefined; if (i + 1 >= own.length) throw new Error(`${name} needs a value`); return own[i + 1]; };
  // --shared K takes effect only with ATLAS_SLOT_SHARED=1 (the CLI's default since O1; 0 turns it off); without --shared
  // every CLI call is exclusive, exactly as before.
  defaultSharedSlotOn();
  const k =option('--shared') === undefined ? null : Number(option('--shared'));
  const timeoutMs = option('--timeout-ms') === undefined ? Infinity : Number(option('--timeout-ms'));
  const shared = k !== null && sharedSlotEnabled(), given = args[divider + 1];
  if (shared && !isNodeCommand(given)) throw new Error(`--shared needs a node command (its --test-concurrency is bounded); got ${given}`);
  const command = /^node(\.exe)?$/i.test(given) ? process.execPath : given;
  const childArgs = shared ? boundTestConcurrency(args.slice(divider + 2), k) : args.slice(divider + 2);
  process.exitCode = await withTestSlot({owner: args.slice(divider + 1).join(' ').slice(0, 160), timeoutMs, ...(shared ? {mode: 'shared', tokens: k} : {})},
    () => runCommand(command, childArgs));
}
