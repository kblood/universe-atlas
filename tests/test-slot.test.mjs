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
    assert.ok((await acquireTestSlot({dir, mode: 'shared', tokens: 2, timeoutMs: 0})).nested);
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
