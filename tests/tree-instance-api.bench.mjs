// CPU-only, fixed-input benchmark for the production Tree Kit setInstance API.
// Start Vite from the Atlas root before running this script. No renderer or
// GPU timing is used; run the same trials on the baseline and candidate commits.
import { chromium } from 'playwright';
import { browserArgs } from './browser-options.mjs';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { resolve } from 'node:path';

const base = process.env.ATLAS_URL || 'http://127.0.0.1:5196/';
const out = resolve(process.env.ATLAS_RESULTS || 'test-results/tree-instance-api');
const family = process.env.ATLAS_TREE_FAMILY === 'spire' ? 'spire' : 'branching';
const species = family === 'spire' ? 'conifer' : 'oak';
const lod0Url = process.env.ATLAS_TREE_LOD0_URL || `/assets/forest/desktop-v1/${family}/${species}-lod0.glb`;
const lod1Url = process.env.ATLAS_TREE_LOD1_URL || `/assets/forest/desktop-v1/${family}/${species}-lod1.glb`;
const lod0Path = resolve(process.env.ATLAS_TREE_LOD0 || `public${lod0Url}`);
const lod1Path = resolve(process.env.ATLAS_TREE_LOD1 || `public${lod1Url}`);
const population = Math.max(32, Math.min(2048, Number(process.env.ATLAS_TREE_POPULATION) || 192));
const operations = Math.max(5000, Math.min(1000000, Number(process.env.ATLAS_TREE_OPERATIONS) || 50000));
const trials = Math.max(5, Math.min(25, Number(process.env.ATLAS_TREE_TRIALS) || 7));
const warmupOperations = Math.max(5000, Math.min(100000, Math.floor(operations / 2)));
const allocationOperations = Math.max(5000, Math.min(50000, operations));
const baselineModuleUrl = process.env.ATLAS_TREE_BASELINE_MODULE_URL || '/external/tree-kit/src/tree-asset-baseline.ts';
const treeSourcePath = resolve('external/tree-kit/src/tree-asset.ts');
const treeSourceBytes = await readFile(treeSourcePath);
const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
const summary = (rows, operationCount = operations) => {
  const sorted = rows.map(row => row.elapsedMs).sort((a, b) => a - b);
  return { samples: sorted.length, p50Ms: percentile(sorted, 0.5), p95Ms: percentile(sorted, 0.95),
    maxMs: sorted.at(-1), minMs: sorted[0], operations: operationCount,
    p50UsPerCall: operationCount > 1 ? percentile(sorted, 0.5) * 1000 / operationCount : undefined };
};
const report = {
  ok: false,
  method: 'Production Tree Kit APIs; CPU-only; preparation baseline/candidate paired in alternating order in one browser; fixed population, matrices and operation count; paired unchanged/changing rows in alternating order; warmup excluded; no renderer/GPU measurements.',
  environment: { atlasCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    treeKitCommit: execFileSync('git', ['-C', 'external/tree-kit', 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    treeKitWorkingTree: execFileSync('git', ['-C', 'external/tree-kit', 'status', '--porcelain'], { encoding: 'utf8' }).trim(),
    treeAssetSourceSha256: createHash('sha256').update(treeSourceBytes).digest('hex'),
    platform: `${os.platform()} ${os.release()}`, cpu: os.cpus()[0]?.model ?? 'unknown',
    node: process.version, base, family, lod0Url, lod1Url, population, operations, warmupOperations, allocationOperations, trials },
  assets: { lod0: { path: lod0Path, sha256: createHash('sha256').update(await readFile(lod0Path)).digest('hex') },
    lod1: { path: lod1Path, sha256: createHash('sha256').update(await readFile(lod1Path)).digest('hex') } },
  limitations: ['CPU microbenchmark isolates batch.setInstance API cost and buffer writes; it does not represent complete Atlas frame cost.',
    'Allocation bytes are sampled by Chromium HeapProfiler, not exact per-call accounting; driver uploads, shader execution and GPU time are not measured.',
    'Preparation baseline and candidate are loaded as separate modules and measured in alternating order on identical GLBs in one browser. Compare on the same machine/runtime, and retain all paired trial values.'],
  errors: [],
  trials: [],
};
await mkdir(out, { recursive: true });
const save = () => writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
let browser, page;
try {
  browser = await chromium.launch({ headless: true, args: browserArgs });
  page = await browser.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(new URL('tests/tree-instance-api-bench.html', base).href, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__treeInstanceBenchReady === true, undefined, { timeout: 30000 });
  const preparationTrials = { baseline: [], candidate: [] };
  for (let trial = 0; trial < trials; trial++) {
    const order = trial % 2 === 0 ? ['baseline', 'candidate'] : ['candidate', 'baseline'];
    for (const variant of order) {
      const moduleUrl = variant === 'baseline' ? baselineModuleUrl : '/external/tree-kit/src/tree-asset.ts';
      const result = await page.evaluate(({ lod0Url, lod1Url, moduleUrl }) =>
        window.__measureTreePreparation({ lod0Url, lod1Url, moduleUrl }), { lod0Url, lod1Url, moduleUrl });
      preparationTrials[variant].push({ trial, pairOrder: order.join(','), ...result });
    }
  }
  const firstBaseline = preparationTrials.baseline[0], firstCandidate = preparationTrials.candidate[0];
  report.preparation = { trials: preparationTrials,
    baselineSummary: summary(preparationTrials.baseline, 1), candidateSummary: summary(preparationTrials.candidate, 1),
    sourceBinaryBytes: firstCandidate.sourceBinaryBytes,
    baselineParserBinaryBytes: firstBaseline.parserBinaryBytes,
    candidateParserBinaryBytes: firstCandidate.parserBinaryBytes,
    imageBytes: firstCandidate.imageBytes, geometryEndBytes: firstCandidate.geometryEndBytes,
    removableTrailingBytes: firstCandidate.removableTrailingBytes,
    parserBinaryBytesSaved: firstBaseline.parserBinaryBytes - firstCandidate.parserBinaryBytes };
  report.preparation.pairedElapsedDeltasMs = preparationTrials.baseline.map((baseline, trial) => ({
    trial, baselineMs: baseline.elapsedMs, candidateMs: preparationTrials.candidate[trial].elapsedMs,
    candidateMinusBaselineMs: preparationTrials.candidate[trial].elapsedMs - baseline.elapsedMs,
  }));
  await page.evaluate(async ({ lod0, lod1, population, operations }) => {
    window.__treeInstanceBench = await window.__loadTreeInstanceBench({ lod0Url: lod0, lod1Url: lod1, population });
    window.__treeInstanceBench.run({ mode: 'unchanged', operations });
    window.__treeInstanceBench.run({ mode: 'changing', operations });
  }, {
      lod0: lod0Url, lod1: lod1Url, population, operations: warmupOperations,
    });
  const rows = { unchanged: [], changing: [] };
  for (let trial = 0; trial < trials; trial++) {
    const order = trial % 2 === 0 ? ['unchanged', 'changing'] : ['changing', 'unchanged'];
    for (const mode of order) {
      const result = await page.evaluate(({ mode, operations }) =>
        window.__treeInstanceBench.timed({ mode, operations }), { mode, operations });
      rows[mode].push({ trial, pairOrder: order.join(','), ...result });
    }
  }
  report.trials = { unchanged: rows.unchanged, changing: rows.changing };
  report.summary = { unchanged: summary(rows.unchanged), changing: summary(rows.changing) };
  const allocationSession = await page.context().newCDPSession(page);
  const allocations = {};
  try {
    await allocationSession.send('HeapProfiler.enable');
    for (const mode of ['unchanged', 'changing']) {
      await allocationSession.send('HeapProfiler.startSampling', { samplingInterval: 256 });
      await page.evaluate(({ mode, operations }) =>
        window.__treeInstanceBench.run({ mode, operations }), { mode, operations: allocationOperations });
      const { profile } = await allocationSession.send('HeapProfiler.stopSampling');
      const totals = new Map();
      function visit(node, path = []) {
        const next = [...path, node.callFrame?.functionName || '(anonymous)'];
        if (node.selfSize > 0) {
          const stack = next.slice(-4).join(' <- ');
          totals.set(stack, (totals.get(stack) ?? 0) + node.selfSize);
        }
        for (const child of node.children ?? []) visit(child, next);
      }
      visit(profile.head);
      allocations[mode] = { operations: allocationOperations, samplingIntervalBytes: 256,
        topAllocationStacks: [...totals].map(([stack, sampledBytes]) => ({ stack, sampledBytes }))
          .sort((a, b) => b.sampledBytes - a.sampledBytes).slice(0, 20) };
    }
  } finally {
    await allocationSession.detach();
  }
  report.allocations = allocations;
  if (report.errors.length) throw new Error(`Browser errors: ${report.errors.join('; ')}`);
  report.ok = report.errors.length === 0;
  await save();
  console.log(JSON.stringify({ ok: report.ok, out, environment: report.environment, summary: report.summary }, null, 2));
} catch (error) {
  report.failure = String(error?.stack ?? error);
  await save();
  console.error(error);
  process.exitCode = 1;
} finally {
  await page?.evaluate(() => window.__treeInstanceBench?.dispose()).catch(() => {});
  await browser?.close().catch(() => {});
}
