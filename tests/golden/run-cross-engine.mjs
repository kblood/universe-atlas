// Cross-engine determinism gate: loads the golden-hash harness in Chromium,
// Firefox and WebKit (headless, no GPU/WebGL involved - this is pure
// catalogue/terrain/world-history math plus the GOLDEN-EXT platform sections:
// geophysics, climate, biomes, ocean volume, place-query, census, rocks and the
// fauna composer) and asserts every engine's digest set equals both Node's own
// live computation and the committed tests/golden/golden.json fixture.
//
// Usage:
//   node tests/golden/run-cross-engine.mjs            # build + serve + test, then stop the server
//   node tests/golden/run-cross-engine.mjs --no-build  # assume dist/ and the server are already up
//   node tests/golden/run-cross-engine.mjs --update    # also rewrite golden.json from Node's result
// Options (for packages that must not touch golden.json before the merger re-pins it):
//   --fixture <path>     compare against this fixture instead of golden.json
//   --write-node <path>  write Node's result (the proposed fixture) to <path>
//   --report <path>      write every engine's counts, digests and timing as JSON
//   --port <n>           preview port (default 5192)
//   --strict             fail on a KNOWN_ENGINE_MISMATCHES entry too (require four-engine equality)
//   --check-args         validate the options (output-alias guard) and exit without computing
// Outputs (--write-node, --report) may not alias golden.json, the --fixture or
// each other (symlinks, junctions, Windows case and hard links included).
// Gate result: PASS (all four engines equal), PASS-WITH-KNOWN-MISMATCH (exit 0,
// but NOT four-engine equal: a recorded open finding was tolerated), or FAIL.
// Each engine runs inside the machine-wide browser lock (tests/helpers/gpu-lock.mjs),
// one engine per hold.
import { chromium, firefox, webkit } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { lstatSync, realpathSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { computeGolden } from "./generator.ts";
import { withGpuLock } from "../helpers/gpu-lock.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const argv = process.argv.slice(2);
const args = new Set(argv);
function option(name) {
  const i = argv.indexOf(name);
  if (i < 0) return null;
  const value = argv[i + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} needs a value`);
  return value;
}
const PORT = Number(option("--port") ?? 5192);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error(`invalid --port ${PORT}`);
const HOST = "127.0.0.1";
const URL = `http://${HOST}:${PORT}/golden.html`;
const fixtureOption = option("--fixture");
const GOLDEN_FIXTURE = fixtureOption ? path.resolve(fixtureOption) : path.join(HERE, "golden.json");
const writeNode = option("--write-node");
const reportPath = option("--report");
/** The platform sections build meshes and planet samples: far slower than the catalogue in a cold browser. */
const PAGE_TIMEOUT_MS = 180000;

const skipBuild = args.has("--no-build");
const update = args.has("--update");
const strict = args.has("--strict");
const checkArgsOnly = args.has("--check-args");
if (update && fixtureOption) throw new Error("--update rewrites golden.json; do not combine it with --fixture");

// Output-destination guard. Writing Node's result (or a report) over the
// fixture it is compared with would make Node match by construction, or
// replace the committed fixture with report-shaped JSON: refuse every output
// (--write-node, --report) that aliases golden.json, the --fixture, or another
// output (use --update for an intentional re-pin). Aliases are resolved, not
// just compared as strings: realpath follows symlinks and junctions (of the
// file or of its nearest existing parent directory), Windows paths are
// case-folded after that (case-insensitive filesystem), and an existing file is
// also compared by device+inode, which catches hard links. Spellings the
// resolver cannot see through are refused outright: on Windows an NTFS stream
// suffix or device path (any ':' after the drive letter, e.g. `x.json::$DATA`)
// and a component ending in '.' or ' ' (Win32 strips those, so `golden.json.`
// IS golden.json); anywhere, a dangling symlink/junction. The check runs at
// start-up AND again immediately before every write (an earlier output may
// have created the file a later one aliases). main() additionally reads the
// fixture BEFORE any output is written.
function canonicalPath(p) {
  const abs = path.resolve(p);
  if (process.platform === "win32") {
    if (abs.replace(/^[A-Za-z]:/, "").includes(":")) throw new Error(`${p}: stream or device syntax (':' after the drive) is not supported for an output`);
    if (abs.split(/[\\/]/).slice(1).some((c) => /[. ]$/.test(c))) throw new Error(`${p}: a path component ending in '.' or ' ' is not supported for an output (Win32 strips it)`);
  }
  // realpath the nearest existing ancestor, then re-append the not-yet-existing tail
  let dir = abs, resolved = abs;
  const tail = [];
  for (;;) {
    try {
      resolved = path.join(realpathSync.native(dir), ...tail);
      break;
    } catch {
      // an entry that exists but does not resolve is a dangling link: its target is unknowable here
      if (lstatSync(dir, { throwIfNoEntry: false })) throw new Error(`${p}: ${dir} is a dangling symlink or junction`);
      const parent = path.dirname(dir);
      if (parent === dir) break;
      tail.unshift(path.basename(dir));
      dir = parent;
    }
  }
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}
function fileIdentity(p) {
  try {
    const s = statSync(p, { bigint: true });
    return s.isFile() ? `${s.dev}:${s.ino}` : null;
  } catch {
    return null;
  }
}
function sameFile(a, b) {
  if (canonicalPath(a) === canonicalPath(b)) return true;
  const ia = fileIdentity(a), ib = fileIdentity(b);
  return ia !== null && ia === ib;
}
const COMMITTED_FIXTURE = path.join(HERE, "golden.json");
/** Pure check of the output destinations; returns the list of violations (empty = OK). */
function outputViolations() {
  const protectedFiles = [["golden.json", COMMITTED_FIXTURE]];
  if (!sameFile(GOLDEN_FIXTURE, COMMITTED_FIXTURE)) protectedFiles.push(["the --fixture", GOLDEN_FIXTURE]);
  const outputs = [];
  if (writeNode) outputs.push(["--write-node", writeNode]);
  if (reportPath) outputs.push(["--report", reportPath]);
  const problems = [];
  for (const [flag, out] of outputs) {
    try {
      canonicalPath(out);
    } catch (err) {
      problems.push(`${flag} ${err.message}`);
      continue;
    }
    for (const [what, file] of protectedFiles) {
      if (sameFile(out, file)) problems.push(`${flag} ${out} is ${what} (${file}); use --update for a re-pin`);
    }
  }
  if (problems.length) return problems;
  for (let i = 0; i < outputs.length; i++) {
    for (let j = i + 1; j < outputs.length; j++) {
      if (sameFile(outputs[i][1], outputs[j][1])) problems.push(`${outputs[i][0]} and ${outputs[j][0]} name the same file (${outputs[i][1]})`);
    }
  }
  return problems;
}
function assertOutputsSafe(stage) {
  const problems = outputViolations();
  if (problems.length) throw new Error(`refusing to ${stage}, output destination(s) alias a protected file or each other:\n  ${problems.join("\n  ")}`);
}
assertOutputsSafe("run");
if (checkArgsOnly) {
  console.log(`--check-args: OK. fixture=${GOLDEN_FIXTURE} write-node=${writeNode ?? "-"} report=${reportPath ?? "-"} update=${update} strict=${strict}`);
  process.exit(0);
}

/** Digest keys an engine is KNOWN to disagree on: open determinism findings,
 * each with the engine's own MEASURED digest and the cause. A listed key is
 * KNOWN-MISMATCH (printed, reported, not failing) only while the engine still
 * produces exactly that measured digest; any other value on that engine fails
 * the gate, so the exemption cannot absorb a new change. A listed key that now
 * matches Node is reported so the entry can be removed. Every key not listed
 * here must match on every engine. Re-measure the pinned digest whenever the
 * faunaKnownUnstable fixture digest is re-pinned (a composer version bump). Keep this list short and specific:
 * generator.ts pins known-unstable specimens in their own key
 * (faunaKnownUnstable) so the main key keeps guarding everything else.
 * A tolerated entry is NOT equality: the gate reports PASS-WITH-KNOWN-MISMATCH
 * and fourEngineEqual=false, and --strict fails on it.
 * Root cause of the webkit entry (measured 2026-10-04): the midline ocellus site
 * (z = 0) lies on the head's mirror seam, where raycastLine returns two exit
 * hits with the same t (seam triangles with normal z -0.073 / +0.078). Chromium
 * orders one first, WebKit the other (the site differs by 1 ULP upstream), so
 * nearestExit's tie-break flips the lens normal. The fix belongs in
 * src/fauna-composer-mesh.ts (outside this task); a trialled patch makes all
 * four engines equal. Remove this entry when that lands (the run then reports
 * NOW-MATCHES) and fold GOLDEN-FAUNA-2 back into the fauna key. */
const KNOWN_ENGINE_MISMATCHES = {
  webkit: {
    faunaKnownUnstable: {
      digest: "7b81264f3db57e86c92eeb083476a94d1229c21a6879200d3b6257746b4c890f",
      cause: "WebKit 26.5 (2026-10-04): GOLDEN-FAUNA-2's midline insect ocellus is seated differently (8 vertices, up to 0.42 mm); see generator.ts FAUNA_KNOWN_UNSTABLE",
    },
  },
};

function run(cmd, cmdArgs, opts = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, cmdArgs, { cwd: ROOT, stdio: "inherit", shell: true, ...opts });
    child.on("exit", (code) => (code === 0 ? resolvePromise() : reject(new Error(`${cmd} ${cmdArgs.join(" ")} exited ${code}`))));
    child.on("error", reject);
  });
}

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`golden harness server did not come up at ${url} within ${timeoutMs}ms`);
}

async function digestsFromPage(browserType, name) {
  return withGpuLock({ owner: `universe-atlas golden cross-engine (${name})`, retryMs: 5000 }, () => digestsFromPageLocked(browserType, name));
}
async function digestsFromPageLocked(browserType, name) {
  const started = Date.now();
  const browser = await browserType.launch();
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(String(err)));
    page.on("console", (msg) => {
      if (msg.type() === "error") pageErrors.push(msg.text());
    });
    await page.goto(URL, { waitUntil: "load", timeout: PAGE_TIMEOUT_MS });
    await page.waitForFunction(() => window.__GOLDEN_RESULT__ || window.__GOLDEN_ERROR__, null, { timeout: PAGE_TIMEOUT_MS, polling: 250 });
    const error = await page.evaluate(() => window.__GOLDEN_ERROR__ || null);
    if (error) throw new Error(`${name}: golden-entry threw: ${error}`);
    if (pageErrors.length) throw new Error(`${name}: page errors: ${pageErrors.join("; ")}`);
    const result = await page.evaluate(() => window.__GOLDEN_RESULT__);
    return { ...result, elapsedMs: Date.now() - started, engineVersion: browser.version() };
  } finally {
    await browser.close();
  }
}

/** Every key of either side must match: a section missing on one side is a
 * mismatch too (a new section absent from an old fixture needs the re-pin). */
function diffDigests(label, a, b, known = {}, knownSeen = null) {
  const mismatches = [];
  const left = a ?? {}, right = b ?? {};
  for (const key of [...new Set([...Object.keys(left), ...Object.keys(right)])]) {
    // `left` is the engine's digest set: the exemption holds only for the measured engine digest.
    if (key in known && key in left && key in right && left[key] !== right[key] && left[key] === known[key].digest) {
      console.warn(`${label} KNOWN MISMATCH (open finding, not failing): ${key}: ${left[key]} != ${right[key]} - ${known[key].cause}`);
      knownSeen?.add(key);
      continue;
    }
    if (key in known && key in left && key in right && left[key] !== right[key]) {
      mismatches.push(`${key}: ${left[key]} != ${right[key]} (and != the measured known-mismatch digest ${known[key].digest}: a NEW change on this engine)`);
      continue;
    }
    if (!(key in left)) mismatches.push(`${key}: missing on the left`);
    else if (!(key in right)) mismatches.push(`${key}: missing on the right (fixture predates this section: re-pin needed)`);
    else if (left[key] !== right[key]) mismatches.push(`${key}: ${left[key]} != ${right[key]}`);
  }
  if (mismatches.length) return `${label} MISMATCH:\n  ` + mismatches.join("\n  ");
  return null;
}

/** Pure classification of one engine's result against Node and the fixture.
 * The Node and fixture comparisons keep SEPARATE tolerated-key sets, so a stale
 * fixture cannot mislabel the Node comparison (or the reverse). A tolerated
 * known mismatch is never reported as MATCH: it is MATCH-EXCEPT-KNOWN. */
export function classifyEngine(name, result, nodeResult, fixtureDigests, known, fixtureLabel = "fixture") {
  const knownVsNode = new Set(), knownVsFixture = new Set();
  const vsNode = diffDigests(`${name} vs Node`, result.digests, nodeResult.digests, known, knownVsNode);
  const countsVsNode = diffDigests(`${name} counts vs Node`, result.counts, nodeResult.counts);
  const vsFixture = diffDigests(`${name} vs fixture ${fixtureLabel}`, result.digests, fixtureDigests, known, knownVsFixture);
  const knownStatus = (k) => (knownVsNode.has(k) ? "KNOWN-MISMATCH" : result.digests?.[k] === nodeResult.digests?.[k] ? "NOW-MATCHES" : "CHANGED (gate failure)");
  return {
    vsNode: vsNode || countsVsNode ? "MISMATCH" : knownVsNode.size ? "MATCH-EXCEPT-KNOWN" : "MATCH",
    vsFixture: vsFixture ? "MISMATCH" : knownVsFixture.size ? "MATCH-EXCEPT-KNOWN" : "MATCH",
    failures: [countsVsNode, vsNode, vsFixture].filter(Boolean),
    tolerated: [...[...knownVsNode].map((k) => `${name}:${k} (vs Node)`), ...[...knownVsFixture].map((k) => `${name}:${k} (vs fixture)`)],
    knownMismatches: Object.fromEntries(Object.keys(known).map((k) => [k, knownStatus(k)])),
  };
}

async function main() {
  console.log("Computing Node reference digests...");
  const nodeStarted = Date.now();
  const nodeResult = await computeGolden();
  const nodeMs = Date.now() - nodeStarted;
  console.log(JSON.stringify(nodeResult, null, 2));
  console.log(`Node computed the golden set in ${nodeMs} ms`);
  // Read the comparison fixture before writing anything (see the --write-node guard).
  const fixtureBefore = update ? null : JSON.parse(await readFile(GOLDEN_FIXTURE, "utf8"));
  if (writeNode) {
    assertOutputsSafe("write --write-node");
    await writeFile(path.resolve(writeNode), JSON.stringify(nodeResult, null, 2) + "\n");
    console.log(`Wrote Node's result to ${path.resolve(writeNode)}`);
  }

  let fixture;
  if (update) {
    fixture = nodeResult;
    await writeFile(GOLDEN_FIXTURE, JSON.stringify(nodeResult, null, 2) + "\n");
    console.log(`Wrote ${GOLDEN_FIXTURE}`);
  } else {
    fixture = fixtureBefore;
    const nodeVsFixture = diffDigests(`Node vs fixture ${GOLDEN_FIXTURE}`, nodeResult.digests, fixture.digests);
    if (nodeVsFixture) {
      console.error(nodeVsFixture);
      process.exitCode = 1;
    } else {
      console.log(`Node matches fixture ${GOLDEN_FIXTURE}.`);
    }
  }

  let previewProc = null;
  if (!skipBuild) {
    console.log("Building golden harness (vite build)...");
    await run("npx", ["vite", "build", "--config", "tests/golden/vite.golden.config.ts"]);
    console.log(`Starting vite preview on ${HOST}:${PORT}...`);
    previewProc = spawn(
      "npx",
      ["vite", "preview", "--config", "tests/golden/vite.golden.config.ts", "--host", HOST, "--port", String(PORT), "--strictPort"],
      { cwd: ROOT, stdio: "inherit", shell: true },
    );
  }

  const report = {};
  /** "<engine>:<key>" pairs that differed from Node but were tolerated as KNOWN_ENGINE_MISMATCHES. */
  const knownTolerated = [];
  try {
    await waitForServer(URL);
    for (const [name, browserType] of [
      ["chromium", chromium],
      ["firefox", firefox],
      ["webkit", webkit],
    ]) {
      console.log(`\n== ${name} ==`);
      // Isolate each engine: one browser failing to launch must not hide the
      // other two engines' results.
      try {
        const result = await digestsFromPage(browserType, name);
        report[name] = result;
        console.log(`${name} (${result.engineVersion}) computed the golden set in ${result.elapsedMs} ms (launch included)`);
        console.log(`${name} counts:`, JSON.stringify(result.counts));
        console.log(`${name} digests:`, JSON.stringify(result.digests));
        const c = classifyEngine(name, result, nodeResult, fixture.digests, KNOWN_ENGINE_MISMATCHES[name] ?? {}, path.basename(GOLDEN_FIXTURE));
        result.knownMismatches = c.knownMismatches;
        for (const [k, status] of Object.entries(c.knownMismatches)) {
          if (status === "NOW-MATCHES") console.log(`${name}: known mismatch ${k} no longer reproduces - remove it from KNOWN_ENGINE_MISMATCHES`);
        }
        for (const text of c.failures) {
          console.error(text);
          process.exitCode = 1;
        }
        result.vsNode = c.vsNode;
        result.vsFixture = c.vsFixture;
        knownTolerated.push(...c.tolerated);
        if (!c.failures.length) {
          if (c.tolerated.length) {
            console.log(`${name}: NOT EQUAL - vsNode ${c.vsNode}, vsFixture ${c.vsFixture}; tolerated known open finding(s): ${c.tolerated.join(", ")}`);
          } else {
            console.log(`${name}: MATCH (Node and ${path.basename(GOLDEN_FIXTURE)})`);
          }
        }
      } catch (err) {
        console.error(`${name}: FAILED TO RUN:`, err);
        report[name] = { error: String((err && err.stack) || err) };
        process.exitCode = 1;
      }
    }
  } finally {
    if (previewProc) {
      // On Windows, spawn(..., { shell: true }) makes previewProc the cmd.exe
      // shell wrapper, not the actual "npx vite preview" node process it
      // launches - a plain previewProc.kill() only kills the shell and
      // leaves the real server listening on PORT. Kill the whole process
      // tree via taskkill; fall back to a plain kill on non-Windows.
      if (process.platform === "win32" && previewProc.pid) {
        spawnSync("taskkill", ["/PID", String(previewProc.pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        previewProc.kill();
      }
    }
  }

  // Strict mode: a tolerated known mismatch fails the gate (four-engine equality required).
  if (strict && knownTolerated.length) {
    console.error(`--strict: known mismatch(es) are not equality: ${knownTolerated.join(", ")}`);
    process.exitCode = 1;
  }
  // Four-engine equality is Node vs each browser on every digest and count, with
  // nothing tolerated; it is independent of whether the fixture is current.
  const fourEngineEqual = ["chromium", "firefox", "webkit"].every((n) => report[n] && !report[n].error && report[n].vsNode === "MATCH");
  const gate = process.exitCode ? "FAIL" : knownTolerated.length ? "PASS-WITH-KNOWN-MISMATCH" : "PASS";

  if (reportPath) {
    const nodeVsFixture = update ? null : diffDigests("Node vs fixture", nodeResult.digests, fixture.digests);
    // re-check: --write-node (or anything else) may have created a file this path now aliases
    assertOutputsSafe("write --report");
    await writeFile(path.resolve(reportPath), JSON.stringify({
      fixture: GOLDEN_FIXTURE,
      strict,
      node: { ...nodeResult, elapsedMs: nodeMs, nodeVersion: process.version, vsFixture: nodeVsFixture ? "MISMATCH" : "MATCH" },
      engines: report,
      knownMismatchesTolerated: knownTolerated,
      fourEngineEqual,
      gate,
    }, null, 2) + "\n");
    console.log(`Wrote report to ${path.resolve(reportPath)}`);
  }

  if (gate === "FAIL") {
    console.error("\nGOLDEN CROSS-ENGINE GATE: FAIL");
  } else if (gate === "PASS-WITH-KNOWN-MISMATCH") {
    console.log(`\nGOLDEN CROSS-ENGINE GATE: PASS WITH KNOWN MISMATCH - the four engines are NOT all equal (${knownTolerated.join(", ")}); run with --strict to require equality`);
  } else {
    console.log("\nGOLDEN CROSS-ENGINE GATE: PASS (all four engines equal)");
  }
}

// Always runs, except when a test imports classifyEngine and has set this flag
// first (an argv-path comparison could silently skip the gate and exit 0).
if (!globalThis.__GOLDEN_RUNNER_IMPORT_ONLY__) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
