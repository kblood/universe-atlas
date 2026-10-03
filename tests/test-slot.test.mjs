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
