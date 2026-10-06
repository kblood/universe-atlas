// Preview-server port selection for browser runners (golden cross-engine, render probes, Luna sheet captures).
// Incident 2026-10-06 (docs/mountains-handoff-2026-10-06.md section 8): fixed ports 5293/5294 were held by another
// local service, so `vite preview --strictPort` exited and the runner only noticed after a 20 s poll (and, for the
// golden --update, after golden.json had already been rewritten). Rules implemented here:
//   - no --port given: an ephemeral port from the OS (listen on 0), retried on a bind race;
//   - --port given: used as is, but checked free BEFORE any work, and a busy explicit port fails fast (never a
//     silent switch to another port the caller did not ask for);
//   - the server child must stay alive and answer, and an optional `owns` check proves the answer comes from the
//     server we started (another server on the same port is never accepted);
//   - a child that exits (EADDRINUSE under --strictPort) is detected at once, not after the poll times out.
import {createServer} from 'node:net';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

export const LOOPBACK = '127.0.0.1';

/** True when `port` can be bound on `host` right now (closed again before returning). */
export function portFree(port, host = LOOPBACK) {
  return new Promise(resolve => {
    const s = createServer();
    s.once('error', () => resolve(false));
    s.listen(port, host, () => s.close(() => resolve(true)));
  });
}

/** A port the OS reports free on `host` (bind to 0, read the port, release it). */
export function ephemeralPort(host = LOOPBACK) {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.once('error', reject);
    s.listen(0, host, () => {const {port} = s.address(); s.close(() => resolve(port));});
  });
}

/** Parse a `--port` value: null/undefined/'auto' = pick a free port; otherwise an integer 1..65535. */
export function parsePortOption(value) {
  if (value == null || value === 'auto') return null;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`invalid --port ${value}`);
  return port;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Start a server on a free port and wait until it answers.
 *  spawnServer(port) -> ChildProcess, started with strict port binding (vite: --strictPort);
 *  url(port)         -> the URL to poll (must answer 2xx);
 *  owns(response, port) -> optional async check that the answer is from OUR server (e.g. a build stamp);
 *  port              -> explicit port (fails fast when busy) or null for ephemeral ports with `attempts` retries.
 * Returns {port, child, attempts}. Throws with every attempt's reason; kills each failed child.
 */
export async function startOnFreePort({spawnServer, url, owns = null, port = null, host = LOOPBACK, attempts = 5,
  timeoutMs = 30000, pollMs = 200, choosePort = ephemeralPort, log = () => {}}) {
  const reasons = [];
  const tries = port == null ? attempts : 1;
  for (let attempt = 1; attempt <= tries; attempt++) {
    const candidate = port ?? await choosePort(host);
    if (!await portFree(candidate, host)) {
      const why = `port ${candidate} on ${host} is in use`;
      if (port != null) throw new Error(`${why}; pass another --port or omit it to use a free ephemeral port`);
      reasons.push(`attempt ${attempt}: ${why} before start`); log(reasons.at(-1)); continue;
    }
    const child = spawnServer(candidate);
    let exited = null;
    const onExit = (code, signal) => {exited = `server exited (code ${code}, signal ${signal}) before answering`;};
    child.once('exit', onExit);
    child.once('error', err => {exited = `server failed to start: ${err.message}`;});
    const deadline = Date.now() + timeoutMs;
    let ready = false, lastError = '';
    while (!exited && Date.now() < deadline) {
      try {
        const res = await fetch(url(candidate));
        if (res.ok) {
          if (exited) break;
          if (!owns || await owns(res, candidate)) {ready = true; break;}
          // With strict binding a foreign answer means this URL is not served by our child: fail the attempt now.
          lastError = 'a server answered but it is not the one this runner started';
          exited = lastError; break;
        } else lastError = `HTTP ${res.status}`;
      } catch (err) {lastError = err.message;}
      await sleep(pollMs);
    }
    if (ready && !exited && child.exitCode === null) {child.off('exit', onExit); return {port: candidate, child, attempts: attempt};}
    reasons.push(`attempt ${attempt} on port ${candidate}: ${exited ?? `no answer within ${timeoutMs} ms (${lastError})`}`);
    log(reasons.at(-1));
    stopServer(child);
    if (port != null) break;
  }
  throw new Error(`could not start a server on a free port:\n  ${reasons.join('\n  ')}`);
}

/**
 * Serve an app build (`vite build` output with build-info.json) with `vite preview --strictPort` on a free port, for
 * render probes and Luna sheet captures. Ownership: the served build-info.json must carry the dist's own builtAt
 * (the rule the capture scripts already used; now combined with port selection and exit detection).
 * root = the checkout whose node_modules/vite runs the preview. Returns {port, base, build, child, output()}.
 */
export async function startDistPreview({root = '.', dist = 'dist', port = null, host = LOOPBACK, log, attempts, timeoutMs}) {
  const expected = JSON.parse(await readFile(join(dist, 'build-info.json'), 'utf8'));
  let output = '';
  const started = await startOnFreePort({
    port, host, log, attempts, timeoutMs,
    url: p => `http://${host}:${p}/build-info.json`,
    owns: async res => {try {return (await res.json()).builtAt === expected.builtAt;} catch {return false;}},
    spawnServer: p => {
      const child = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--host', host,
        '--port', String(p), '--strictPort', '--outDir', dist], {cwd: root, stdio: ['ignore', 'pipe', 'pipe']});
      child.stdout.on('data', d => {output += d;}); child.stderr.on('data', d => {output += d;});
      return child;
    },
  });
  return {...started, base: `http://${host}:${started.port}/`, build: expected, output: () => output};
}

/** Stop a server child spawned without a shell (the child is the server process itself). */
export function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  try {child.kill();} catch {/* already gone */}
}
