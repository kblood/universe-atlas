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
// Each engine runs inside the machine-wide browser lock (tests/helpers/gpu-lock.mjs),
// one engine per hold.
import { chromium, firefox, webkit } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
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
if (update && fixtureOption) throw new Error("--update rewrites golden.json; do not combine it with --fixture");
// Writing Node's result over the fixture it is compared with would make Node
// match by construction: refuse it (use --update for an intentional re-pin).
if (writeNode && path.resolve(writeNode) === GOLDEN_FIXTURE) throw new Error("--write-node must not name the comparison fixture");
if (writeNode && !fixtureOption && path.resolve(writeNode) === path.join(HERE, "golden.json")) throw new Error("--write-node must not name golden.json; use --update");

/** Digest keys an engine is KNOWN to disagree on: open determinism findings,
 * each with its measured cause. A listed key's mismatch is printed and lands
 * in the report as KNOWN-MISMATCH, but does not fail the gate; a listed key
 * that now matches is reported so the entry can be removed. Every key not
 * listed here must match on every engine. Keep this list short and specific:
 * generator.ts pins known-unstable specimens in their own key
 * (faunaKnownUnstable) so the main key keeps guarding everything else. */
const KNOWN_ENGINE_MISMATCHES = {
  webkit: {
    faunaKnownUnstable:
      "WebKit 26.5 (2026-10-04): GOLDEN-FAUNA-2's midline insect ocellus is seated differently (8 vertices, up to 0.42 mm); see generator.ts FAUNA_KNOWN_UNSTABLE",
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
    if (key in known && key in left && key in right) {
      if (left[key] !== right[key]) {
        console.warn(`${label} KNOWN MISMATCH (open finding, not failing): ${key}: ${left[key]} != ${right[key]} - ${known[key]}`);
        knownSeen?.add(key);
      }
      continue;
    }
    if (!(key in left)) mismatches.push(`${key}: missing on the left`);
    else if (!(key in right)) mismatches.push(`${key}: missing on the right (fixture predates this section: re-pin needed)`);
    else if (left[key] !== right[key]) mismatches.push(`${key}: ${left[key]} != ${right[key]}`);
  }
  if (mismatches.length) return `${label} MISMATCH:\n  ` + mismatches.join("\n  ");
  return null;
}

async function main() {
  console.log("Computing Node reference digests...");
  const nodeStarted = Date.now();
  const nodeResult = await computeGolden();
  const nodeMs = Date.now() - nodeStarted;
  console.log(JSON.stringify(nodeResult, null, 2));
  console.log(`Node computed the golden set in ${nodeMs} ms`);
  if (writeNode) {
    await writeFile(path.resolve(writeNode), JSON.stringify(nodeResult, null, 2) + "\n");
    console.log(`Wrote Node's result to ${path.resolve(writeNode)}`);
  }

  let fixture;
  if (update) {
    fixture = nodeResult;
    await writeFile(GOLDEN_FIXTURE, JSON.stringify(nodeResult, null, 2) + "\n");
    console.log(`Wrote ${GOLDEN_FIXTURE}`);
  } else {
    fixture = JSON.parse(await readFile(GOLDEN_FIXTURE, "utf8"));
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
        const known = KNOWN_ENGINE_MISMATCHES[name] ?? {}, knownSeen = new Set();
        const vsNode = diffDigests(`${name} vs Node`, result.digests, nodeResult.digests, known, knownSeen);
        const countsVsNode = diffDigests(`${name} counts vs Node`, result.counts, nodeResult.counts);
        if (countsVsNode) {
          console.error(countsVsNode);
          process.exitCode = 1;
        }
        const vsFixture = diffDigests(`${name} vs fixture ${path.basename(GOLDEN_FIXTURE)}`, result.digests, fixture.digests, known, knownSeen);
        result.knownMismatches = Object.fromEntries(Object.keys(known).map((k) => [k, knownSeen.has(k) ? "KNOWN-MISMATCH" : "NOW-MATCHES"]));
        for (const k of Object.keys(known)) {
          if (!knownSeen.has(k)) console.log(`${name}: known mismatch ${k} no longer reproduces - remove it from KNOWN_ENGINE_MISMATCHES`);
        }
        if (vsNode) {
          console.error(vsNode);
          process.exitCode = 1;
        }
        if (vsFixture) {
          console.error(vsFixture);
          process.exitCode = 1;
        }
        result.vsNode = vsNode || countsVsNode ? "MISMATCH" : "MATCH";
        result.vsFixture = vsFixture ? "MISMATCH" : "MATCH";
        if (!vsNode && !countsVsNode && !vsFixture) {
          console.log(`${name}: MATCH (Node and ${path.basename(GOLDEN_FIXTURE)})${knownSeen.size ? ` except known open finding(s): ${[...knownSeen].join(", ")}` : ""}`);
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

  if (reportPath) {
    const nodeVsFixture = update ? null : diffDigests("Node vs fixture", nodeResult.digests, fixture.digests);
    await writeFile(path.resolve(reportPath), JSON.stringify({
      fixture: GOLDEN_FIXTURE,
      node: { ...nodeResult, elapsedMs: nodeMs, nodeVersion: process.version, vsFixture: nodeVsFixture ? "MISMATCH" : "MATCH" },
      engines: report,
      gate: process.exitCode ? "FAIL" : "PASS",
    }, null, 2) + "\n");
    console.log(`Wrote report to ${path.resolve(reportPath)}`);
  }

  if (process.exitCode) {
    console.error("\nGOLDEN CROSS-ENGINE GATE: FAIL");
  } else {
    console.log("\nGOLDEN CROSS-ENGINE GATE: PASS");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
