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
