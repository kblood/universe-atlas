// Is this process inside an EXCLUSIVE test slot that an ancestor holds? Used by scripts/cost-fair/run.sh (O5,
// docs/cost-fair-harness-2026-10-07.md): run.sh takes the exclusive slot ONCE for the whole batch, and its children run
// without the test-slot wrapper. They inherit ATLAS_TEST_SLOT_TOKEN from the slot CLI (runCommand/slotEnv). Never nest:
//   exclusive -> the token names the live exclusive owner of TEST_SLOT_DIR on this host: run through, take nothing.
//   shared    -> the token names a live SHARED holder: refuse (an exclusive run takes the slot at the top level).
//   none      -> no token, or a token of no live holder (stale, dead, foreign host): acquire the slot normally.
//   node scripts/cost-fair/slot-held.mjs   -> exit 10 exclusive, 11 none, 12 shared; anything else is an error.
import {readFileSync} from 'node:fs';
import {hostname} from 'node:os';
import {pathToFileURL} from 'node:url';
import {TEST_SLOT_DIR, sharedDir} from '../../tests/helpers/test-slot.mjs';

export const EXIT = Object.freeze({exclusive: 10, none: 11, shared: 12});
export function pidAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}
const readJson = path => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; } };
/** {state: 'exclusive'|'shared'|'none', owner?} for `env.ATLAS_TEST_SLOT_TOKEN` against the slot `dir`. */
export function slotHolding({env = process.env, dir = TEST_SLOT_DIR, host = hostname(), alive = pidAlive} = {}) {
  const token = env.ATLAS_TEST_SLOT_TOKEN;
  if (!token) return {state: 'none'};
  const live = h => h?.token === token && h.host === host && alive(h.pid);
  const ex = readJson(`${dir}/owner.txt`);
  if (live(ex)) return {state: 'exclusive', owner: ex};
  const sh = readJson(`${sharedDir(dir)}/${token}.json`);
  if (live(sh)) return {state: 'shared', owner: sh};
  return {state: 'none'};
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const s = slotHolding();
  if (s.state !== 'none') console.error(`cost-fair: inside a ${s.state} test slot held by pid ${s.owner.pid} (${s.owner.name})`);
  process.exit(EXIT[s.state]);
}
