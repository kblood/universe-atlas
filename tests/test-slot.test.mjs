import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, utimesSync} from 'node:fs';
import {hostname} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {acquireTestSlot} from './helpers/test-slot.mjs';
mkdirSync('test-results', {recursive: true});
const root = mkdtempSync(join(process.cwd(), 'test-results', 'atlas-slot-test-'));
test.after(() => rmSync(root, {recursive: true, force: true}));
test('acquire/release and second acquirer waits until release', async () => {
  const dir = join(root, 'wait'), a = await acquireTestSlot({dir, owner: 'first'});
  let acquired = false;
  const pending = acquireTestSlot({dir, owner: 'second', retryMs: 10}).then(b => { acquired = true; return b; });
  await new Promise(r => setTimeout(r, 60)); assert.equal(acquired, false);
  a.release(); const b = await pending; assert.ok(acquired); b.release(); assert.equal(existsSync(dir), false);
});
test('dead local pid taken over; ancient live and foreign holders never broken', async () => {
  const child = spawn(process.execPath, ['-e', '']); const pid = child.pid;
  await new Promise(r => child.on('close', r));
  const dir = join(root, 'dead'); mkdirSync(dir);
  writeFileSync(join(dir, 'owner.txt'), JSON.stringify({name: 'dead', pid, host: hostname()}));
  const lock = await acquireTestSlot({dir}); lock.release();
  for (const host of [hostname(), 'foreign-host']) {
    mkdirSync(dir); writeFileSync(join(dir, 'owner.txt'), JSON.stringify({name: 'live', pid: process.pid, host}));
    utimesSync(join(dir, 'owner.txt'), new Date(0), new Date(0));
    await assert.rejects(acquireTestSlot({dir, retryMs: 10, timeoutMs: 35}), /still held/);
    assert.ok(existsSync(dir)); rmSync(dir, {recursive: true});
  }
});
test('CLI preserves child exit code and releases after failure', async () => {
  const dir = join(root, 'cli');
  const child = spawn(process.execPath, ['tests/helpers/test-slot.mjs', '--', process.execPath, '-e', 'process.exit(7)'], {env: {...process.env, ATLAS_TEST_SLOT_DIR: dir}, stdio: 'pipe'});
  const code = await new Promise(r => child.on('close', r));
  assert.equal(code, 7); assert.equal(existsSync(dir), false);
});

// Shared/exclusive slot (plan I2, docs/shared-test-slot-2026-10-07.md). Every test uses a sandbox dir under test-results,
// never the live C:/LLM/IWSDK/.atlas-test-slot; ATLAS_SLOT_SHARED is set per test and restored.
import {readdirSync, readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {sharedSlotEnabled, slotClass, slotEnv, sharedDir, boundTestConcurrency, SLOT_CAPACITY, RUN_CLASSES} from './helpers/test-slot.mjs';
const quietly = async fn => { const e = console.error; console.error = () => {}; try { return await fn(); } finally { console.error = e; } };
async function withEnv(vars, fn) {
  const saved = Object.fromEntries(Object.keys(vars).map(k => [k, process.env[k]]));
  for (const [k, v] of Object.entries(vars)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  try { return await quietly(fn); } finally { for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v; }
}
const shared = fn => withEnv({ATLAS_SLOT_SHARED: '1', ATLAS_TEST_SLOT_TOKEN: undefined}, fn);
const tick = ms => new Promise(r => setTimeout(r, ms));
const holderFiles = dir => existsSync(sharedDir(dir)) ? readdirSync(sharedDir(dir)).filter(n => n.endsWith('.json')) : [];
test('flag off (default): a shared request is exclusive exactly as before; run classes all exclusive; bad flag fails closed', () => withEnv({ATLAS_SLOT_SHARED: undefined, ATLAS_TEST_SLOT_TOKEN: undefined}, async () => {
  assert.equal(sharedSlotEnabled(), false);
  for (const name of Object.keys(RUN_CLASSES)) assert.deepEqual(slotClass(name), {mode: 'exclusive'}, name);
  const dir = join(root, 'off'), a = await acquireTestSlot({dir, mode: 'shared', tokens: 4});
  assert.ok(existsSync(join(dir, 'owner.txt')), 'took the mkdir gate'); assert.equal(existsSync(sharedDir(dir)), false, 'no shared holder files');
  await assert.rejects(acquireTestSlot({dir, mode: 'shared', tokens: 4, retryMs: 10, timeoutMs: 40}), /still held/);
  a.release(); assert.equal(existsSync(dir), false);
  assert.throws(() => sharedSlotEnabled({ATLAS_SLOT_SHARED: 'yes'}), /must be 0 or 1/);
  assert.equal(sharedSlotEnabled({ATLAS_SLOT_SHARED: '0'}), false);
  await assert.rejects(acquireTestSlot({dir, mode: 'shared'}), /explicit tokens/);
  await assert.rejects(acquireTestSlot({dir, mode: 'shared', tokens: SLOT_CAPACITY + 1}), /explicit tokens/);
}));
test('flag on: shared holders coexist up to 28 tokens; the next one waits for capacity, then enters', () => shared(async () => {
  const dir = join(root, 'cap');
  assert.deepEqual(slotClass('pkg'), {mode: 'shared', tokens: 4}); assert.deepEqual(slotClass('smoke'), {mode: 'shared', tokens: 16});
  assert.deepEqual(slotClass('full'), {mode: 'exclusive'}, 'test:full stays exclusive until I3 ran on its shards');
  const a = await acquireTestSlot({dir, mode: 'shared', tokens: 20}), b = await acquireTestSlot({dir, mode: 'shared', tokens: 8});
  assert.equal(existsSync(dir), false, 'shared holders never create the exclusive dir'); assert.equal(holderFiles(dir).length, 2);
  const holder = JSON.parse(readFileSync(join(sharedDir(dir), `${a.token}.json`), 'utf8'));
  assert.deepEqual([holder.pid, holder.tokens, holder.class], [process.pid, 20, 'shared']);
  await assert.rejects(acquireTestSlot({dir, mode: 'shared', tokens: 1, retryMs: 10, timeoutMs: 40}), /28\/28 tokens in use/);
  assert.equal(holderFiles(dir).length, 2, 'a refused caller removes its own file');
  let c = null; const pending = acquireTestSlot({dir, mode: 'shared', tokens: 1, retryMs: 10}).then(l => { c = l; });
  await tick(40); assert.equal(c, null); a.release(); await pending; assert.ok(c);
  b.release(); c.release(); assert.deepEqual(holderFiles(dir), []);
}));
test('flag on: writer priority - an exclusive caller takes the gate, new shared callers back off, it runs once drained', () => shared(async () => {
  const dir = join(root, 'writer'), order = [];
  const s1 = await acquireTestSlot({dir, mode: 'shared', tokens: 4});
  const e = acquireTestSlot({dir, retryMs: 10}).then(l => { order.push('E'); return l; });
  for (let i = 0; i < 200 && !existsSync(join(dir, 'owner.txt')); i++) await tick(5);
  assert.ok(existsSync(dir), 'the exclusive caller holds the gate while draining');
  const s2 = acquireTestSlot({dir, mode: 'shared', tokens: 4, retryMs: 10}).then(l => { order.push('S2'); return l; });
  await tick(60); assert.deepEqual(order, [], 'E waits for s1; s2 waits behind E although 24 tokens are free');
  s1.release(); const el = await e; await tick(40); assert.deepEqual(order, ['E']);
  assert.deepEqual(holderFiles(dir), [], 'no shared holder while the exclusive one runs');
  el.release(); (await s2).release(); assert.deepEqual(order, ['E', 'S2']);
}));
test('flag on: an old-style exclusive holder (stale checkout: plain mkdir) blocks shared callers; foreign host too', () => shared(async () => {
  const dir = join(root, 'old');
  for (const host of [hostname(), 'foreign-host']) {
    mkdirSync(dir); writeFileSync(join(dir, 'owner.txt'), JSON.stringify({name: 'old npm test', pid: process.pid, host}));
    await assert.rejects(acquireTestSlot({dir, mode: 'shared', tokens: 1, retryMs: 10, timeoutMs: 40}), /exclusive held by .*old npm test/);
    assert.deepEqual(holderFiles(dir), []); rmSync(dir, {recursive: true});
  }
}));
test('flag on: dead local shared holders are reaped; foreign and unreadable holders are never broken', () => shared(async () => {
  const child = spawn(process.execPath, ['-e', '']); const pid = child.pid; await new Promise(r => child.on('close', r));
  const dir = join(root, 'reap'), sd = sharedDir(dir); mkdirSync(sd, {recursive: true});
  const put = (h, name = `${randomUUID()}.json`) => { writeFileSync(join(sd, name), typeof h === 'string' ? h : JSON.stringify(h)); return name; };
  const deadOne = put({name: 'dead', pid, host: hostname(), tokens: 28});
  const lock = await acquireTestSlot({dir, mode: 'shared', tokens: 4}); lock.release();
  assert.equal(existsSync(join(sd, deadOne)), false, 'dead local holder reaped');
  const foreign = put({name: 'other machine', pid: process.pid, host: 'foreign-host', tokens: 2});
  await assert.rejects(acquireTestSlot({dir, retryMs: 10, timeoutMs: 40}), /1 shared holder\(s\), 2 tokens: .*other machine/);
  assert.ok(existsSync(join(sd, foreign)), 'foreign holder kept'); assert.equal(existsSync(dir), false, 'a timed-out exclusive caller gives the gate back');
  rmSync(join(sd, foreign));
  const junk = put('{not json');
  await assert.rejects(acquireTestSlot({dir, mode: 'shared', tokens: 1, retryMs: 10, timeoutMs: 40}), /unreadable holder file/);
  assert.ok(existsSync(join(sd, junk)), 'unreadable holder kept and counted as the full capacity'); rmSync(join(sd, junk));
}));
test('flag on: concurrent shared callers never exceed the capacity (publish-then-look)', () => shared(async () => {
  const dir = join(root, 'race'); let inUse = 0, peak = 0;
  await Promise.all(Array.from({length: 12}, async () => {
    const l = await acquireTestSlot({dir, mode: 'shared', tokens: 10, retryMs: 5});
    inUse += 10; peak = Math.max(peak, inUse); await tick(15); inUse -= 10; l.release();
  }));
  assert.ok(peak <= SLOT_CAPACITY && peak >= 10, `peak ${peak} tokens`); assert.deepEqual(holderFiles(dir), []);
}));
test('never nest: a child holding the parent token runs through; exclusive inside shared is refused; stale tokens are ignored', () => shared(async () => {
  const dir = join(root, 'nest');
  const p = await acquireTestSlot({dir});
  assert.equal(slotEnv({}).ATLAS_TEST_SLOT_TOKEN, p.token, 'children of a holder inherit its token');
  await withEnv({ATLAS_TEST_SLOT_TOKEN: p.token}, async () => {
    const n1 = await acquireTestSlot({dir, mode: 'shared', tokens: 4, timeoutMs: 0}), n2 = await acquireTestSlot({dir, timeoutMs: 0});
    assert.ok(n1.nested && n2.nested); assert.equal(n1.mode, 'exclusive'); n1.release(); n2.release();
  });
  assert.ok(existsSync(join(dir, 'owner.txt')), 'a nested release never frees the parent'); p.release();
  assert.equal(slotEnv({}).ATLAS_TEST_SLOT_TOKEN, undefined);
  const s = await acquireTestSlot({dir, mode: 'shared', tokens: 4});
  await withEnv({ATLAS_TEST_SLOT_TOKEN: s.token}, async () => {
    await assert.rejects(acquireTestSlot({dir, timeoutMs: 0}), /never nest/);
    const n3 = await acquireTestSlot({dir, mode: 'shared', tokens: 2, timeoutMs: 0}); assert.ok(n3.nested); n3.release();
  });
  s.release();
  await withEnv({ATLAS_TEST_SLOT_TOKEN: randomUUID()}, async () => { const l = await acquireTestSlot({dir}); assert.equal(l.nested, undefined); l.release(); });
  // Flag off: the token is exported but ignored, exactly as before (a nested acquisition waits).
  const q = await acquireTestSlot({dir});
  await withEnv({ATLAS_SLOT_SHARED: '0', ATLAS_TEST_SLOT_TOKEN: q.token}, () => assert.rejects(acquireTestSlot({dir, retryMs: 10, timeoutMs: 30}), /still held/));
  q.release();
}));
test('lock order: asking for the slot while the GPU lock is held throws before touching the slot', () => withEnv({ATLAS_GPU_LOCK_HELD: 'capture pid=1'}, async () => {
  const dir = join(root, 'order');
  await assert.rejects(acquireTestSlot({dir, owner: 'golden'}), /lock order violation: "golden" .*GPU lock is held .*merge -> slot -> GPU/);
  assert.equal(existsSync(dir), false);
}));
test('CLI: --shared K is a shared hold only with ATLAS_SLOT_SHARED=1; the child gets the token; --test-concurrency is bounded', async () => {
  assert.deepEqual(boundTestConcurrency(['--test', 'a.test.mjs'], 4), ['--test', '--test-concurrency=4', 'a.test.mjs']);
  assert.deepEqual(boundTestConcurrency(['--test', '--test-concurrency=2', 'a'], 4), ['--test', '--test-concurrency=2', 'a']);
  assert.throws(() => boundTestConcurrency(['--test', '--test-concurrency', '8', 'a'], 4), /exceeds the 4 shared tokens/);
  assert.deepEqual(boundTestConcurrency(['-e', '1'], 4), ['-e', '1']);
  const probe = "const fs=require('fs');const t=process.env.ATLAS_TEST_SLOT_TOKEN;const d=process.env.ATLAS_TEST_SLOT_DIR;console.log(JSON.stringify({t,shared:fs.existsSync(d+'.shared/'+t+'.json'),excl:fs.existsSync(d)}))";
  for (const flag of ['1', '0']) {
    const dir = join(root, `cli-${flag}`), env = {...process.env, ATLAS_TEST_SLOT_DIR: dir, ATLAS_SLOT_SHARED: flag}; delete env.ATLAS_TEST_SLOT_TOKEN;
    const child = spawn(process.execPath, ['tests/helpers/test-slot.mjs', '--shared', '4', '--', 'node', '-e', probe], {env, stdio: 'pipe'});
    let out = ''; child.stdout.on('data', b => { out += b; });
    assert.equal(await new Promise(r => child.on('close', r)), 0);
    const seen = JSON.parse(out);
    assert.match(seen.t, /^[0-9a-f-]{36}$/);
    assert.deepEqual([seen.shared, seen.excl], flag === '1' ? [true, false] : [false, true], `flag ${flag}`);
    assert.equal(existsSync(dir), false); assert.deepEqual(holderFiles(dir), []);
  }
});

// Review fixes (Astra review of 2250d1e..70b68fe; docs/shared-test-slot-2026-10-07.md "Review fixes"). Each test failed
// before its fix. New exports are read through the module namespace so a missing one fails only its own test.
const slotMod = await import('./helpers/test-slot.mjs');
const runCli = (args, env) => new Promise(resolve => {
  const child = spawn(process.execPath, ['tests/helpers/test-slot.mjs', ...args], {env, stdio: 'pipe'});
  let out = ''; child.stdout.on('data', b => { out += b; }); child.stderr.on('data', b => { out += b; });
  const kill = setTimeout(() => child.kill(), 10000);
  child.on('close', code => { clearTimeout(kill); resolve({code, out}); });
});
const cliEnv = (dir, flag = '1') => { const env = {...process.env, ATLAS_TEST_SLOT_DIR: dir, ATLAS_SLOT_SHARED: flag}; delete env.ATLAS_TEST_SLOT_TOKEN; return env; };
const deadPid = async () => { const c = spawn(process.execPath, ['-e', '']); await new Promise(r => c.on('close', r)); return c.pid; };
test('review 1: an inherited token is a pass-through only while its holder pid is alive on this host', () => shared(async () => {
  const pid = await deadPid(), dir = join(root, 'orphan'), token = randomUUID(), parentFile = join(sharedDir(dir), `${token}.json`);
  await withEnv({ATLAS_TEST_SLOT_TOKEN: token}, async () => {
    mkdirSync(dir); writeFileSync(join(dir, 'owner.txt'), JSON.stringify({name: 'dead exclusive parent', pid, host: hostname(), token}));
    const a = await acquireTestSlot({dir, retryMs: 10, timeoutMs: 2000});
    assert.equal(a.nested, undefined, 'a real acquisition (the dead parent is reaped)');
    assert.equal(JSON.parse(readFileSync(join(dir, 'owner.txt'), 'utf8')).pid, process.pid); a.release();
    mkdirSync(sharedDir(dir), {recursive: true});
    writeFileSync(parentFile, JSON.stringify({name: 'dead shared parent', pid, host: hostname(), token, class: 'shared', tokens: 4}));
    const b = await acquireTestSlot({dir, mode: 'shared', tokens: 2, retryMs: 10, timeoutMs: 2000});
    assert.equal(b.nested, undefined); assert.equal(existsSync(parentFile), false, 'dead parent reaped'); b.release();
    writeFileSync(parentFile, JSON.stringify({name: 'foreign parent', pid: process.pid, host: 'foreign-host', token, class: 'shared', tokens: 4}));
    const c = await acquireTestSlot({dir, mode: 'shared', tokens: 2, retryMs: 10, timeoutMs: 2000});
    assert.equal(c.nested, undefined, 'a holder on another host is never an ancestor of this process'); c.release(); rmSync(parentFile);
  });
}));
test('review 2: a nested shared request may not exceed the tokens of its shared parent', () => shared(async () => {
  const dir = join(root, 'budget'), s = await acquireTestSlot({dir, mode: 'shared', tokens: 4});
  await withEnv({ATLAS_TEST_SLOT_TOKEN: s.token}, async () => {
    await assert.rejects(acquireTestSlot({dir, mode: 'shared', tokens: 8, timeoutMs: 0}), /8 tokens exceed the 4 of the shared parent/);
    await assert.rejects(acquireTestSlot({dir, mode: 'shared', tokens: SLOT_CAPACITY, timeoutMs: 0}), /exceed the 4 of the shared parent/);
    const n = await acquireTestSlot({dir, mode: 'shared', tokens: 4, timeoutMs: 0}); assert.ok(n.nested); n.release();
  });
  s.release();
}));
test('review 5: the LAST --test-concurrency is the bound one; node.exe and absolute node paths are bounded; other commands refused', async () => {
  assert.throws(() => boundTestConcurrency(['--test', '--test-concurrency=1', '--test-concurrency=28', 'a'], 4), /28 exceeds the 4 shared tokens/);
  assert.throws(() => boundTestConcurrency(['--test', '--test-concurrency=2', '--test-concurrency', '9', 'a'], 4), /9 exceeds/);
  assert.deepEqual(boundTestConcurrency(['--test', '--test-concurrency=28', '--test-concurrency=2', 'a'], 4), ['--test', '--test-concurrency=28', '--test-concurrency=2', 'a'], 'node uses the last value');
  assert.throws(() => boundTestConcurrency(['--test', '--test-concurrency'], 4), /exceeds|needs a value/);
  const dir = join(root, 'cli-node-exe');
  const r = await runCli(['--shared', '4', '--', process.execPath, '--test', '--test-concurrency=28', 'no-such.test.mjs'], cliEnv(dir));
  assert.notEqual(r.code, 0); assert.match(r.out, /28 exceeds the 4 shared tokens/, 'absolute node.exe path is bounded');
  const g = await runCli(['--shared', '4', '--', 'git', '--version'], cliEnv(dir));
  assert.notEqual(g.code, 0); assert.match(g.out, /--shared needs a node command/);
  assert.equal(existsSync(dir), false); assert.deepEqual(holderFiles(dir), []);
});
test('review 9: --timeout-ms or --shared without a value fails before acquiring (flag off and on), never waits forever', async () => {
  for (const [flag, opt] of [['0', '--timeout-ms'], ['1', '--timeout-ms'], ['1', '--shared']]) {
    const dir = join(root, `cli-missing-${flag}`), r = await runCli([opt, '--', 'node', '-e', 'process.exit(0)'], cliEnv(dir, flag));
    assert.notEqual(r.code, 0, `${opt} flag ${flag}: ${r.out}`); assert.match(r.out, /needs a value|invalid test slot timeout/);
    assert.equal(existsSync(dir), false);
  }
});
test('review 7: a shared caller honours its deadline and backs off while a dead exclusive owner cannot be renamed away', () => shared(async () => {
  const pid = await deadPid(), dir = join(root, 'stuck'); mkdirSync(dir);
  writeFileSync(join(dir, 'owner.txt'), JSON.stringify({name: 'dead, dir pinned', pid, host: hostname()}));
  // A process whose cwd is the slot dir pins it: on Windows the takeover rename fails (EBUSY) on every attempt.
  const pin = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 20000)'], {cwd: dir});
  try {
    await tick(300);
    const started = Date.now();
    const outcome = await Promise.race([acquireTestSlot({dir, mode: 'shared', tokens: 1, retryMs: 20, timeoutMs: 300}).then(l => { l.release(); return 'acquired'; }, e => e.message),
      tick(4000).then(() => 'still looping after 4 s')]);
    if (process.platform === 'win32') assert.match(outcome, /still unavailable/, outcome);
    else assert.ok(outcome === 'acquired' || /still unavailable/.test(outcome), outcome);
    assert.ok(Date.now() - started < 2000, `returned after ${Date.now() - started} ms`);
  } finally { pin.kill(); await new Promise(r => pin.on('close', r)); rmSync(dir, {recursive: true, force: true}); }
}));
test('review 6: a holder file published before admission is removed when anything throws before the hold', () => shared(async () => {
  const hooks = slotMod.slotTestHooks; assert.ok(hooks, 'slotTestHooks exported');
  const dir = join(root, 'leak');
  hooks.afterPublish = () => { throw new Error('injected EPERM after publish'); };
  try { await assert.rejects(acquireTestSlot({dir, mode: 'shared', tokens: 4}), /injected EPERM/); } finally { hooks.afterPublish = null; }
  assert.deepEqual(holderFiles(dir), [], 'no leaked reservation');
  const l = await acquireTestSlot({dir, timeoutMs: 200}); l.release();
}));
test('review 10: forced interleaving - shared caller saw no gate, then an exclusive caller takes it and drains empty: the shared one never enters alongside', () => shared(async () => {
  const hooks = slotMod.slotTestHooks; assert.ok(hooks, 'slotTestHooks exported');
  const dir = join(root, 'interleave'); let exclusive = null, sharedIn = false, overlap = false;
  // The shared caller has checked the exclusive dir (absent) and pauses just before publishing; the exclusive caller now
  // takes the gate and finishes an EMPTY drain. Only the post-publication re-check keeps the shared caller out.
  hooks.beforePublish = async () => { hooks.beforePublish = null; exclusive = await acquireTestSlot({dir, retryMs: 10}); };
  try {
    const s = acquireTestSlot({dir, mode: 'shared', tokens: 4, retryMs: 10}).then(l => { sharedIn = true; overlap = !!exclusive && !exclusive.done; return l; });
    for (let i = 0; i < 200 && !exclusive; i++) await tick(5);
    assert.ok(exclusive, 'exclusive acquired with an empty drain'); await tick(80);
    assert.equal(sharedIn, false, 'the shared caller backed off: it must not run alongside the exclusive holder');
    exclusive.done = true; exclusive.release(); (await s).release();
    assert.equal(overlap, false); assert.equal(sharedIn, true, 'it enters once the exclusive holder is gone');
  } finally { hooks.beforePublish = null; }
}));
// O1 (docs/shared-test-slot-2026-10-07.md "I3 result and switch-on"): runner entry points default the flag ON unless
// the caller's env sets it; library calls read the env as given.
test('O1: defaultSharedSlotOn sets 1 only when unset; 0 and an empty value stay off; the CLI defaults to a shared hold', async () => {
  const on = slotMod.defaultSharedSlotOn; assert.equal(typeof on, 'function', 'defaultSharedSlotOn exported');
  const unset = {}; assert.equal(on(unset), true); assert.equal(unset.ATLAS_SLOT_SHARED, '1');
  for (const v of ['0', '']) { const e = {ATLAS_SLOT_SHARED: v}; assert.equal(on(e), false, JSON.stringify(v)); assert.equal(e.ATLAS_SLOT_SHARED, v); }
  assert.throws(() => on({ATLAS_SLOT_SHARED: 'yes'}), /must be 0 or 1/);
  const probe = "const fs=require('fs');const t=process.env.ATLAS_TEST_SLOT_TOKEN;const d=process.env.ATLAS_TEST_SLOT_DIR;console.log(JSON.stringify({t,flag:process.env.ATLAS_SLOT_SHARED,shared:fs.existsSync(d+'.shared/'+t+'.json'),excl:fs.existsSync(d)}))";
  for (const [flag, expect] of [[undefined, [true, false, '1']], ['0', [false, true, '0']]]) {
    const dir = join(root, `cli-default-${flag ?? 'unset'}`), env = cliEnv(dir); if (flag === undefined) delete env.ATLAS_SLOT_SHARED; else env.ATLAS_SLOT_SHARED = flag;
    const r = await runCli(['--shared', '4', '--', 'node', '-e', probe], env);
    assert.equal(r.code, 0, r.out);
    const seen = JSON.parse(r.out.trim().split('\n').at(-1));
    assert.deepEqual([seen.shared, seen.excl, seen.flag], expect, `flag ${flag}`);
    assert.equal(existsSync(dir), false); assert.deepEqual(holderFiles(dir), []);
  }
});

// I8 / T1 (docs/shared-test-slot-2026-10-07.md "Tickets, pending waits and the descendant registry"): FIFO tickets,
// published pending waits, legacy coexistence and the descendant registry. Sandbox dirs under test-results only; the
// "live" foreign pids are throwaway sleeper processes, never a real slot user.
import {rmdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {pendingDir, nestedDir, nestedEntries, pendingSlotWaits} = slotMod;
const until = async (cond, what, ms = 8000) => { for (const end = Date.now() + ms; Date.now() < end; await tick(5)) if (await cond()) return; throw new Error(`timed out waiting for ${what}`); };
const ticketFiles = dir => existsSync(pendingDir(dir)) ? readdirSync(pendingDir(dir)).filter(n => n.endsWith('.json')) : [];
const ticketPids = dir => ticketFiles(dir).map(n => { try { return JSON.parse(readFileSync(join(pendingDir(dir), n), 'utf8')).pid; } catch { return null; } });
const sleeper = () => { const s = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 120000)'], {stdio: 'ignore'}); s.closed = new Promise(r => s.on('close', r)); return s; };
const putTicket = (dir, name, t) => { mkdirSync(pendingDir(dir), {recursive: true}); const p = join(pendingDir(dir), name); writeFileSync(p, JSON.stringify({host: hostname(), time: new Date().toISOString(), since: Date.now(), ticket: randomUUID(), class: 'ticket', holds: 0, ...t})); return p; };
// A child process that takes the slot from the helper under test, prints {"ev":"in"} once it holds, and releases when
// its stdin gets a line (or closes). It never inherits the runner's live-slot token.
const childScript = join(root, 'slot-child.mjs');
writeFileSync(childScript, `const {acquireTestSlot} = await import(${JSON.stringify(pathToFileURL(join(process.cwd(), 'tests/helpers/test-slot.mjs')).href)});
const [mode, tokens, timeoutMs] = process.argv.slice(2);
try {
  const l = await acquireTestSlot({owner: process.env.CHILD_NAME, mode, tokens: mode === 'shared' ? Number(tokens) : undefined, retryMs: 20, timeoutMs: Number(timeoutMs)});
  console.log(JSON.stringify({ev: 'in', t: Date.now(), pid: process.pid, nested: !!l.nested, id: l.id ?? null}));
  let done = false; const out = () => { if (done) return; done = true; l.release(); console.log(JSON.stringify({ev: 'out', t: Date.now()})); process.stdin.destroy(); };
  process.stdin.on('data', out); process.stdin.on('end', out);
} catch (e) { console.log(JSON.stringify({ev: 'error', message: e.message})); process.exitCode = 3; process.stdin.destroy(); }
`);
function child(name, mode, tokens, {timeoutMs = 20000, env = {}} = {}) {
  const e = {...process.env, ATLAS_SLOT_SHARED: '1', CHILD_NAME: name};
  for (const k of ['ATLAS_TEST_SLOT_TOKEN', 'ATLAS_TEST_SLOT_NESTED', 'NODE_TEST_CONTEXT']) delete e[k];
  const c = spawn(process.execPath, [childScript, mode, String(tokens), String(timeoutMs)], {env: {...e, ...env}, stdio: ['pipe', 'pipe', 'pipe']});
  c.events = []; c.err = ''; let buf = '';
  c.stdout.on('data', b => { buf += b; for (let i; (i = buf.indexOf('\n')) >= 0;) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (line.startsWith('{')) c.events.push(JSON.parse(line)); } });
  c.stderr.on('data', b => { c.err += b; });
  c.exited = new Promise(r => c.on('close', code => r(code)));
  c.seen = ev => c.events.find(x => x.ev === ev);
  c.until = async ev => { await until(() => c.seen(ev) || c.seen('error'), `${name} ${ev}`); const x = c.seen(ev); if (!x) throw new Error(`${name}: ${c.seen('error').message}\n${c.err}`); return x; };
  c.go = () => { try { c.stdin.end('go\n'); } catch {} };
  return c;
}

test('FIFO tickets: a 16-token waiter behind a stream of 4-token holders gets in within 4 releases; later small callers queue behind it (negative: without the queue it starves)', () => shared(async () => {
  const hooks = slotMod.slotTestHooks;
  for (const ignoreQueue of [false, true]) {
    const dir = join(root, `fifo-${ignoreQueue ? 'off' : 'on'}`), order = [], holders = [];
    hooks.ignoreQueue = ignoreQueue;
    try {
      for (let i = 0; i < 7; i++) holders.push(await acquireTestSlot({dir, mode: 'shared', tokens: 4, retryMs: 10, owner: `h${i}`}));
      let big = null, releases = 0;
      const bigP = acquireTestSlot({dir, mode: 'shared', tokens: 16, retryMs: 10, owner: 'big'}).then(l => { big = l; order.push('big'); });
      await until(() => ticketFiles(dir).length === 1, 'the big waiter ticket');
      const late = [];
      while (!big && releases < 12) {
        holders.shift().release(); releases++;
        const n = releases;
        late.push(acquireTestSlot({dir, mode: 'shared', tokens: 4, retryMs: 10, owner: `late${n}`}).then(l => { holders.push(l); order.push(`late${n}`); }));
        await tick(80);
      }
      if (!ignoreQueue) {
        assert.ok(big, `the 16-token waiter acquired (after ${releases} releases)`);
        assert.equal(releases, 4, '28 - 16 = 12: exactly 4 of the 7 four-token holders had to go');
        assert.equal(order[0], 'big', `no later 4-token caller overtook it: ${order.join(',')}`);
        big.release();
        await Promise.all(late);
        assert.deepEqual(order, ['big', 'late1', 'late2', 'late3', 'late4'], 'the queued small callers then enter in arrival order');
      } else {
        assert.equal(big, null, `negative: without the queue, a stream of 4-token callers keeps the 16-token waiter out (${releases} releases, order ${order.join(',')})`);
        assert.equal(order.length, 12, 'every late caller overtook it');
        hooks.ignoreQueue = false;
        for (const h of holders.splice(0)) h.release();
        await bigP; big.release();
      }
      await bigP;
      for (const h of holders) h.release();
      assert.deepEqual(holderFiles(dir), []); assert.deepEqual(ticketFiles(dir), []);
    } finally { hooks.ignoreQueue = false; }
  }
}));
test('FIFO tickets: concurrent shared callers still never exceed the capacity, with and without the queue', () => shared(async () => {
  for (const ignoreQueue of [false, true]) {
    slotMod.slotTestHooks.ignoreQueue = ignoreQueue;
    try {
      const dir = join(root, `race-q-${ignoreQueue}`); let inUse = 0, peak = 0;
      await Promise.all(Array.from({length: 12}, async () => {
        const l = await acquireTestSlot({dir, mode: 'shared', tokens: 10, retryMs: 5});
        inUse += 10; peak = Math.max(peak, inUse); await tick(15); inUse -= 10; l.release();
      }));
      assert.ok(peak <= SLOT_CAPACITY && peak >= 10, `peak ${peak} tokens (queue ${ignoreQueue ? 'off' : 'on'})`);
      assert.deepEqual(holderFiles(dir), []); assert.deepEqual(ticketFiles(dir), []);
    } finally { slotMod.slotTestHooks.ignoreQueue = false; }
  }
}));
test('pending waits: published as a ticket, removed on acquire, timeout and abort; dead tickets reaped; stale or slot-holding ones never block and are kept (negative: a fresh live earlier ticket blocks)', () => shared(async () => {
  const dir = join(root, 'tickets'), s = sleeper();
  try {
    const full = await acquireTestSlot({dir, mode: 'shared', tokens: 28});
    const ac = new AbortController();
    const w = acquireTestSlot({dir, mode: 'shared', tokens: 4, retryMs: 10, owner: 'waiter', signal: ac.signal});
    await until(() => ticketFiles(dir).length === 1, 'pending ticket');
    const t = JSON.parse(readFileSync(join(pendingDir(dir), ticketFiles(dir)[0]), 'utf8'));
    assert.deepEqual([t.name, t.pid, t.mode, t.tokens, t.host, t.holds], ['waiter', process.pid, 'shared', 4, hostname(), 1], 'this process holds `full`');
    assert.ok(Number.isFinite(t.since)); assert.match(ticketFiles(dir)[0], /^\d{17}-\d{6}-[0-9a-f-]{36}\.json$/);
    assert.deepEqual(pendingSlotWaits(), {waits: 1, owners: ['waiter']});
    ac.abort(); await assert.rejects(w, /abort/i);
    assert.deepEqual(ticketFiles(dir), [], 'abort removes the ticket'); assert.equal(pendingSlotWaits().waits, 0);
    await assert.rejects(acquireTestSlot({dir, mode: 'shared', tokens: 4, retryMs: 10, timeoutMs: 40}), /28\/28 tokens in use/);
    assert.deepEqual(ticketFiles(dir), [], 'timeout removes the ticket');
    full.release();
    const l = await acquireTestSlot({dir, mode: 'shared', tokens: 4}); assert.deepEqual(ticketFiles(dir), [], 'acquire removes the ticket'); l.release();
    // A dead local ticket at the very front of the queue is reaped and does not block.
    const deadTicket = putTicket(dir, `00000000000000001-000001-${randomUUID()}.json`, {name: 'dead waiter', pid: await deadPid(), mode: 'shared', tokens: 28});
    const a = await acquireTestSlot({dir, mode: 'shared', tokens: 4, retryMs: 10, timeoutMs: 2000}); a.release();
    assert.equal(existsSync(deadTicket), false, 'dead ticket reaped');
    // Live but stale (no heartbeat), and live but its process already holds the slot: no queue position, never deleted.
    const stale = putTicket(dir, `00000000000000002-000001-${randomUUID()}.json`, {name: 'frozen waiter', pid: s.pid, mode: 'exclusive'});
    utimesSync(stale, new Date(0), new Date(0));
    const holding = putTicket(dir, `00000000000000003-000001-${randomUUID()}.json`, {name: 'nesting waiter', pid: s.pid, mode: 'shared', tokens: 28, holds: 1});
    const b = await acquireTestSlot({dir, mode: 'shared', tokens: 4, retryMs: 10, timeoutMs: 2000}); b.release();
    assert.ok(existsSync(stale) && existsSync(holding), 'live tickets are never deleted');
    rmSync(stale); rmSync(holding);
    // Negative: a fresh live earlier shared ticket, and a fresh live exclusive ticket, do keep a shared caller out.
    const ahead = putTicket(dir, `00000000000000004-000001-${randomUUID()}.json`, {name: 'earlier waiter', pid: s.pid, mode: 'shared', tokens: 4});
    await assert.rejects(acquireTestSlot({dir, mode: 'shared', tokens: 1, retryMs: 10, timeoutMs: 60}), /queued behind 1 earlier shared waiter\(s\) \(earlier waiter pid/);
    rmSync(ahead);
    const excl = putTicket(dir, `99999999999999999-000001-${randomUUID()}.json`, {name: 'queued exclusive', pid: s.pid, mode: 'exclusive'});
    await assert.rejects(acquireTestSlot({dir, mode: 'shared', tokens: 1, retryMs: 10, timeoutMs: 60}), /an exclusive caller is queued \(queued exclusive pid/);
    assert.ok(existsSync(excl)); rmSync(excl);
    assert.deepEqual(holderFiles(dir), []); assert.deepEqual(ticketFiles(dir), []);
  } finally { s.kill(); await s.closed; }
}));
test('legacy coexistence: old-format exclusive dirs and shared holder files block new callers correctly and are never deleted while their pid lives (negative: once it dies they are reaped)', () => shared(async () => {
  const dir = join(root, 'legacy'), sd = sharedDir(dir), s = sleeper();
  try {
    // Old exclusive owners: pre-token {name,pid,host} and the token format of main before this branch.
    for (const owner of [{name: 'old npm test', pid: s.pid, host: hostname()}, {name: 'old npm test (token)', pid: s.pid, host: hostname(), time: new Date().toISOString(), token: randomUUID()}]) {
      mkdirSync(dir); const text = JSON.stringify(owner); writeFileSync(join(dir, 'owner.txt'), text);
      await assert.rejects(acquireTestSlot({dir, mode: 'shared', tokens: 1, retryMs: 10, timeoutMs: 60}), /exclusive held by .*old npm test/);
      await assert.rejects(acquireTestSlot({dir, retryMs: 10, timeoutMs: 60}), /still held by .*old npm test/);
      assert.equal(readFileSync(join(dir, 'owner.txt'), 'utf8'), text, 'old exclusive owner untouched');
      assert.deepEqual(readdirSync(dir), ['owner.txt']); rmSync(dir, {recursive: true});
    }
    // An old shared holder file (format of main before this branch), 20 tokens.
    mkdirSync(sd, {recursive: true});
    const oldName = `${randomUUID()}.json`, oldFile = join(sd, oldName);
    const old = JSON.stringify({name: 'old test:smoke', pid: s.pid, host: hostname(), time: new Date().toISOString(), token: oldName.slice(0, 36), class: 'shared', tokens: 20});
    writeFileSync(oldFile, old);
    await assert.rejects(acquireTestSlot({dir, mode: 'shared', tokens: 16, retryMs: 10, timeoutMs: 60}), /20\/28 tokens in use by .*old test:smoke/);
    const s8 = await acquireTestSlot({dir, mode: 'shared', tokens: 8});
    // New-code tickets and registry entries live in their own dirs: an old reader (*.json directly in .shared) still
    // counts exactly the two holders.
    const waiter = acquireTestSlot({dir, mode: 'shared', tokens: 4, retryMs: 10});
    await until(() => ticketFiles(dir).length === 1, 'waiter ticket');
    const nested = await withEnv({ATLAS_TEST_SLOT_TOKEN: s8.token}, () => acquireTestSlot({dir, mode: 'shared', tokens: 4, timeoutMs: 0}));
    assert.ok(nested.nested); assert.equal(nestedEntries(dir).length, 1);
    assert.deepEqual(holderFiles(dir).sort(), [oldName, `${s8.token}.json`].sort());
    await assert.rejects(acquireTestSlot({dir, retryMs: 10, timeoutMs: 80}), /2 shared holder\(s\), 28 tokens: .*old test:smoke/);
    assert.equal(readFileSync(oldFile, 'utf8'), old, 'old shared holder untouched (no re-home, no reap)');
    nested.release(); s8.release(); (await waiter).release();
    assert.equal(readFileSync(oldFile, 'utf8'), old);
    // Negative: the old holders were kept because their pid lives; once it dies the next scan reaps them.
    s.kill(); await s.closed;
    const all = await acquireTestSlot({dir, mode: 'shared', tokens: SLOT_CAPACITY, retryMs: 10, timeoutMs: 2000});
    assert.equal(existsSync(oldFile), false, 'dead old shared holder reaped'); all.release();
    mkdirSync(dir); writeFileSync(join(dir, 'owner.txt'), JSON.stringify({name: 'old npm test', pid: s.pid, host: hostname()}));
    const ex = await acquireTestSlot({dir, retryMs: 10, timeoutMs: 2000}); ex.release();
    assert.equal(existsSync(dir), false, 'dead old exclusive owner taken over');
    assert.deepEqual(holderFiles(dir), []); assert.deepEqual(ticketFiles(dir), []);
  } finally { s.kill(); await s.closed; }
}));
test('descendant registry: a parent that dies or releases while its pass-through child runs is re-homed to the child and kept until the child exits (negative: a dead parent without live descendants is reaped)', () => shared(async () => {
  const dir = join(root, 'heir'), sd = sharedDir(dir), env = {ATLAS_TEST_SLOT_DIR: dir};
  // (1) The parent process dies (killed, no exit handler): the next scan re-homes its holder file to the live child.
  const s = sleeper(), token = randomUUID(), parentFile = join(sd, `${token}.json`);
  mkdirSync(sd, {recursive: true});
  writeFileSync(parentFile, JSON.stringify({name: 'parent runner', pid: s.pid, host: hostname(), time: new Date().toISOString(), token, class: 'shared', tokens: 4}));
  const c = child('heir', 'shared', 4, {env: {...env, ATLAS_TEST_SLOT_TOKEN: token}});
  const inEv = await c.until('in'); assert.equal(inEv.nested, true);
  assert.deepEqual(nestedEntries(dir).map(e => [e.pid, e.root, e.parent, e.tokens]), [[c.pid, token, token, 4]]);
  s.kill(); await s.closed;
  await assert.rejects(acquireTestSlot({dir, retryMs: 10, timeoutMs: 120}), /1 shared holder\(s\), 4 tokens/);
  const h = JSON.parse(readFileSync(parentFile, 'utf8'));
  assert.deepEqual([h.token, h.pid, h.rehomed.from, h.rehomed.to], [token, c.pid, s.pid, inEv.id], 're-homed: same token, the child pid');
  c.go(); assert.equal(await c.exited, 0);
  assert.equal(existsSync(parentFile), false, 'the child was its last process: the record goes with it');
  assert.deepEqual(nestedEntries(dir), []);
  // (2) The parent releases normally (here: this process) while the child still runs: re-homed instead of deleted.
  const p = await acquireTestSlot({dir, mode: 'shared', tokens: 4});
  const c2 = child('heir2', 'shared', 2, {env: {...env, ATLAS_TEST_SLOT_TOKEN: p.token}});
  assert.equal((await c2.until('in')).nested, true);
  p.release();
  assert.equal(JSON.parse(readFileSync(join(sd, `${p.token}.json`), 'utf8')).pid, c2.pid, 'kept alive under the child pid');
  await assert.rejects(acquireTestSlot({dir, retryMs: 10, timeoutMs: 80}), /1 shared holder\(s\), 4 tokens/);
  // (3) Negative: the child is killed too (no exit handler) - now nothing of the tree lives, and the record is reaped.
  c2.kill(); await c2.exited;
  const ex = await acquireTestSlot({dir, retryMs: 10, timeoutMs: 2000}); ex.release();
  assert.deepEqual(holderFiles(dir), []); assert.deepEqual(nestedEntries(dir), []);
  // (4) An exclusive parent re-homes the same way (owner.txt keeps its token, gets the child pid).
  const s2 = sleeper(), t2 = randomUUID();
  mkdirSync(dir); writeFileSync(join(dir, 'owner.txt'), JSON.stringify({name: 'exclusive parent', pid: s2.pid, host: hostname(), time: new Date().toISOString(), token: t2}));
  const c3 = child('heir3', 'exclusive', 0, {env: {...env, ATLAS_TEST_SLOT_TOKEN: t2}});
  assert.equal((await c3.until('in')).nested, true);
  s2.kill(); await s2.closed;
  await assert.rejects(acquireTestSlot({dir, mode: 'shared', tokens: 1, retryMs: 10, timeoutMs: 80}), /exclusive held by .*exclusive parent/);
  assert.equal(JSON.parse(readFileSync(join(dir, 'owner.txt'), 'utf8')).pid, c3.pid);
  c3.go(); assert.equal(await c3.exited, 0);
  assert.equal(existsSync(dir), false, 're-homed exclusive dir freed by its last descendant');
}));
test('descendant registry: nested siblings share the parent tokens (sum cap); a grandchild counts against its own parent (negative: over the cap it waits and times out)', () => shared(async () => {
  const dir = join(root, 'sibs'), env = {ATLAS_TEST_SLOT_DIR: dir};
  const p = await acquireTestSlot({dir, mode: 'shared', tokens: 4}), tok = {...env, ATLAS_TEST_SLOT_TOKEN: p.token};
  const c1 = child('sib1', 'shared', 4, {env: tok}); await c1.until('in');
  const c2 = child('sib2', 'shared', 2, {env: tok, timeoutMs: 300});
  assert.equal(await c2.exited, 3);
  assert.match(c2.seen('error').message, /nested, 2 of 4 tokens\) still unavailable: 4\/4 tokens of the shared parent in use by nested sibling\(s\) sib1/);
  c1.go(); assert.equal(await c1.exited, 0);
  // Two siblings of 2 fit together under a 4-token parent.
  const c3 = child('sib3', 'shared', 2, {env: tok}), c4 = child('sib4', 'shared', 2, {env: tok});
  const e3 = await c3.until('in'); await c4.until('in');
  // A grandchild under sib3 (2 tokens) is counted against sib3, not against the full root: it gets in.
  const g1 = child('grand1', 'shared', 2, {env: {...tok, ATLAS_TEST_SLOT_NESTED: e3.id}}); assert.equal((await g1.until('in')).nested, true);
  assert.equal(nestedEntries(dir).find(e => e.pid === g1.pid).parent, e3.id);
  // ...and a second grandchild of 2 would exceed sib3's 2: it waits and times out.
  const g2 = child('grand2', 'shared', 2, {env: {...tok, ATLAS_TEST_SLOT_NESTED: e3.id}, timeoutMs: 300});
  assert.equal(await g2.exited, 3); assert.match(g2.seen('error').message, /2\/2 tokens of the nested parent in use by nested sibling\(s\) grand1/);
  // A grandchild asking for more than its parent holds is refused outright (never nest), as before.
  const g3 = child('grand3', 'shared', 4, {env: {...tok, ATLAS_TEST_SLOT_NESTED: e3.id}, timeoutMs: 300});
  assert.equal(await g3.exited, 3); assert.match(g3.seen('error').message, /4 tokens exceed the 2 of the nested parent/);
  for (const c of [g1, c3, c4]) { c.go(); assert.equal(await c.exited, 0); }
  assert.deepEqual(nestedEntries(dir), []);
  p.release(); assert.deepEqual(holderFiles(dir), []);
}));
test('cross-process smoke: 3 child processes on a sandbox dir keep FIFO order across processes; a killed waiter is reaped; the sandbox ends empty', async () => {
  const box = join(root, 'xproc'); mkdirSync(box);
  const dir = join(box, 'slot'), env = {ATLAS_TEST_SLOT_DIR: dir}, kids = [];
  try {
    const A = child('A', 'shared', 16, {env}); kids.push(A); await A.until('in');
    // D queues first and is killed while waiting: its ticket stays behind with a dead pid.
    const D = child('D', 'shared', 16, {env}); kids.push(D);
    await until(() => ticketPids(dir).includes(D.pid), 'D ticket'); D.kill(); await D.exited;
    const B = child('B', 'shared', 20, {env}); kids.push(B); await until(() => ticketPids(dir).includes(B.pid), 'B ticket');
    const C = child('C', 'shared', 12, {env}); kids.push(C); await until(() => ticketPids(dir).includes(C.pid), 'C ticket');
    await tick(400);
    assert.equal(C.seen('in'), undefined, 'C (12) would fit next to A (16) but is queued behind B');
    assert.equal(B.seen('in'), undefined, 'B (20) does not fit next to A');
    A.go(); assert.equal(await A.exited, 0);
    await B.until('in');
    assert.ok(!ticketPids(dir).includes(D.pid), 'the dead waiter D was reaped, not waited for');
    await tick(300); assert.equal(C.seen('in'), undefined, 'C (12) does not fit next to B (20)');
    B.go(); assert.equal(await B.exited, 0);
    await C.until('in'); C.go(); assert.equal(await C.exited, 0);
    // Non-recursive rmdir throws if anything is left: no holder, ticket, tmp or registry file, no exclusive dir.
    for (const d of [sharedDir(dir), pendingDir(dir), nestedDir(dir)]) if (existsSync(d)) rmdirSync(d);
    assert.deepEqual(readdirSync(box), [], 'sandbox empty');
  } finally { for (const k of kids) k.kill(); }
});
