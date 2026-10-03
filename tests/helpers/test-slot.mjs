import {mkdir, readFile, rename, rm, stat} from 'node:fs/promises';
import {writeFileSync, readFileSync, rmSync, utimesSync} from 'node:fs';
import {hostname} from 'node:os';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export const TEST_SLOT_DIR = process.env.ATLAS_TEST_SLOT_DIR || 'C:/LLM/IWSDK/.atlas-test-slot';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let activeChildren = 0;
function dead(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return false; } catch (e) { return e.code === 'ESRCH'; }
}
export async function acquireTestSlot({owner = 'node tests', dir = TEST_SLOT_DIR, retryMs = 1000, timeoutMs = Infinity, heartbeatMs = 10000} = {}) {
  if (!(retryMs > 0) || !(heartbeatMs > 0) || !(timeoutMs >= 0)) throw new Error('invalid test slot timeout/interval');
  const started = Date.now();
  let attempts = 0;
  for (;;) {
    if (attempts++ && Date.now() - started >= timeoutMs) throw new Error(`test slot still held by ${await readFile(`${dir}/owner.txt`, 'utf8').catch(() => '(owner unavailable)')}`);
    try { await mkdir(dir); } catch (e) {
      if (e.code !== 'EEXIST') throw e;
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
        try { await mkdir(`${dir}/reaping`); } catch { await sleep(retryMs); continue; }
        if (await readFile(`${dir}/owner.txt`, 'utf8').catch(() => null) !== text) {
          await rm(`${dir}/reaping`, {recursive: true}); continue;
        }
        const tomb = `${dir}.stale-${randomUUID()}`;
        try { await rename(dir, tomb); } catch { await rm(`${dir}/reaping`, {recursive: true}); continue; }
        // Validate again after rename: never remove a replacement owner.
        if (await readFile(`${tomb}/owner.txt`, 'utf8').catch(() => null) !== text) {
          await rename(tomb, dir); throw new Error('test slot owner changed during takeover');
        }
        console.error(`TOOK OVER test slot: ${text.trim()} (${age}; pid verifiably dead on this host)`);
        await rm(tomb, {recursive: true}); continue;
      }
      if (Date.now() - started >= timeoutMs) throw new Error(`test slot still held by ${text.trim()}`);
      console.error(`waiting for test slot: held by ${text.trim()} (${age}) - retry in ${retryMs / 1000} s`);
      await sleep(Math.min(retryMs, timeoutMs - (Date.now() - started))); continue;
    }
    const text = JSON.stringify({name: owner, pid: process.pid, host: hostname(), time: new Date().toISOString(), token: randomUUID()});
    try { writeFileSync(`${dir}/owner.txt`, text); } catch (e) { await rm(dir, {recursive: true}); throw e; }
    let released = false;
    const ours = () => { try { return readFileSync(`${dir}/owner.txt`, 'utf8') === text; } catch { return false; } };
    const release = () => {
      if (released) return;
      released = true; clearInterval(timer);
      process.off('exit', release); process.off('SIGINT', interrupt); process.off('SIGTERM', terminate);
      if (ours()) rmSync(dir, {recursive: true, force: true});
    };
    const interrupt = () => { if (!activeChildren) { release(); process.exit(130); } };
    const terminate = () => { if (!activeChildren) { release(); process.exit(143); } };
    const timer = setInterval(() => { if (ours()) { const now = new Date(); try { utimesSync(`${dir}/owner.txt`, now, now); } catch {} } }, heartbeatMs);
    timer.unref();
    process.on('exit', release); process.on('SIGINT', interrupt); process.on('SIGTERM', terminate);
    return {release, owner: text};
  }
}
export async function withTestSlot(options, work) {
  const lock = await acquireTestSlot(options);
  try { return await work(); } finally { lock.release(); }
}
export function runCommand(command, args, options = {}) {
  return new Promise(resolve => {
    const child = spawn(command, args, {stdio: 'inherit', ...options});
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
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), divider = args.indexOf('--');
  const timeoutIndex = args.indexOf('--timeout-ms');
  if (divider < 0 || !args[divider + 1]) throw new Error('usage: test-slot.mjs [--timeout-ms N] -- command args...');
  process.exitCode = await withTestSlot({owner: args.slice(divider + 1).join(' ').slice(0, 160), timeoutMs: timeoutIndex < 0 ? Infinity : Number(args[timeoutIndex + 1])},
    () => runCommand(args[divider + 1] === 'node' ? process.execPath : args[divider + 1], args.slice(divider + 2)));
}
