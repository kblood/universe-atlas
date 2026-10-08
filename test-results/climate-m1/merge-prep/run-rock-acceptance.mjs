// Merge-prep wrapper: tests/rock-acceptance.browser.mjs has no lock of its own. Serve the built dist on a free port,
// hold the machine-wide GPU browser lock for the one browser, run the test, release. Run from the worktree root,
// never inside the shared test slot.
import {spawn} from 'node:child_process';
import {acquireGpuLock, assertCaptureOutsideSlot} from '../../../tests/helpers/gpu-lock.mjs';
import {startDistPreview, stopServer} from '../../../tests/helpers/free-port.mjs';
const out = process.argv[2] || 'test-results/climate-m1/merge-prep/rock-acceptance';
assertCaptureOutsideSlot('climate-m1 rock-acceptance');
const server = await startDistPreview({root: '.', dist: 'dist', log: console.error});
let lock, code = 1;
try {
  lock = await acquireGpuLock({owner: `climate-m1 merge-prep rock-acceptance port ${server.port}`, log: console.error});
  code = await new Promise((res, rej) => {
    const c = spawn(process.execPath, ['tests/rock-acceptance.browser.mjs'], {stdio: 'inherit', env: {...process.env, ATLAS_URL: server.base, ATLAS_RESULTS: out}});
    c.on('exit', res); c.on('error', rej);
  });
} finally {
  await lock?.release?.();
  stopServer(server.child ?? server.process ?? server.server);
}
console.error(`rock-acceptance exit ${code}`);
process.exitCode = code;
