// Cross-engine determinism gate: loads the golden-hash harness in Chromium,
// Firefox and WebKit (headless, no GPU/WebGL involved - this is pure
// catalogue/terrain/world-history math) and asserts every engine's digest
// set equals both Node's own live computation and the committed
// tests/golden/golden.json fixture.
//
// Usage:
//   node tests/golden/run-cross-engine.mjs            # build + serve + test, then stop the server
//   node tests/golden/run-cross-engine.mjs --no-build  # assume dist/ and the server are already up
//   node tests/golden/run-cross-engine.mjs --update    # also rewrite golden.json from Node's result
import { chromium, firefox, webkit } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { computeGolden } from "./generator.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const PORT = 5192;
const HOST = "127.0.0.1";
const URL = `http://${HOST}:${PORT}/golden.html`;
const GOLDEN_FIXTURE = path.join(HERE, "golden.json");

const args = new Set(process.argv.slice(2));
const skipBuild = args.has("--no-build");
const update = args.has("--update");

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
  const browser = await browserType.launch();
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(String(err)));
    page.on("console", (msg) => {
      if (msg.type() === "error") pageErrors.push(msg.text());
    });
    await page.goto(URL, { waitUntil: "load" });
    await page.waitForFunction(() => window.__GOLDEN_RESULT__ || window.__GOLDEN_ERROR__, null, { timeout: 20000 });
    const error = await page.evaluate(() => window.__GOLDEN_ERROR__ || null);
    if (error) throw new Error(`${name}: golden-entry threw: ${error}`);
    if (pageErrors.length) throw new Error(`${name}: page errors: ${pageErrors.join("; ")}`);
    const result = await page.evaluate(() => window.__GOLDEN_RESULT__);
    return result;
  } finally {
    await browser.close();
  }
}

function diffDigests(label, a, b) {
  const mismatches = [];
  for (const key of Object.keys(a)) {
    if (a[key] !== b[key]) mismatches.push(`${key}: ${a[key]} != ${b[key]}`);
  }
  if (mismatches.length) return `${label} MISMATCH:\n  ` + mismatches.join("\n  ");
  return null;
}

async function main() {
  console.log("Computing Node reference digests...");
  const nodeResult = await computeGolden();
  console.log(JSON.stringify(nodeResult, null, 2));

  let fixture;
  if (update) {
    fixture = nodeResult;
    await writeFile(GOLDEN_FIXTURE, JSON.stringify(nodeResult, null, 2) + "\n");
    console.log(`Wrote ${GOLDEN_FIXTURE}`);
  } else {
    fixture = JSON.parse(await readFile(GOLDEN_FIXTURE, "utf8"));
    const nodeVsFixture = diffDigests("Node vs committed golden.json", nodeResult.digests, fixture.digests);
    if (nodeVsFixture) {
      console.error(nodeVsFixture);
      process.exitCode = 1;
    } else {
      console.log("Node matches committed golden.json.");
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
        console.log(`${name} counts:`, JSON.stringify(result.counts));
        console.log(`${name} digests:`, JSON.stringify(result.digests));
        const vsNode = diffDigests(`${name} vs Node`, result.digests, nodeResult.digests);
        const vsFixture = diffDigests(`${name} vs committed golden.json`, result.digests, fixture.digests);
        if (vsNode) {
          console.error(vsNode);
          process.exitCode = 1;
        }
        if (vsFixture) {
          console.error(vsFixture);
          process.exitCode = 1;
        }
        if (!vsNode && !vsFixture) console.log(`${name}: MATCH (Node and golden.json)`);
      } catch (err) {
        console.error(`${name}: FAILED TO RUN:`, err);
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
