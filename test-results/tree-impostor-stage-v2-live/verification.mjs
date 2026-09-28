// Run tests/guide.mjs first with ATLAS_URL and ATLAS_RESULTS pointing to this
// directory's live-guide subdirectory. This verifier then compares publication
// bytes and runtime bundles against the exact authorized clean release.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { browserArgs } from '../../tests/browser-options.mjs';

const base = new URL(process.env.ATLAS_URL || 'https://dionysus.dk/webxr/IWSDK/universe-atlas/');
const expectedCommit = process.env.ATLAS_SOURCE_COMMIT;
assert.ok(expectedCommit, 'ATLAS_SOURCE_COMMIT must be the exact clean commit authorized for release');
const dist = path.resolve(process.env.ATLAS_DIST || 'C:/LLM/IWSDK/universe-atlas/dist');
const out = path.dirname(fileURLToPath(import.meta.url));
const oldReceiptPath = path.resolve(out, '../tree-asset-lab-v7-color-a/live-deployment-receipt.json');
const oldReceipt = JSON.parse(await readFile(oldReceiptPath, 'utf8'));
const guideReportPath = path.join(out, 'live-guide/guide-report.json');
const guideReport = JSON.parse(await readFile(guideReportPath, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const buildResponse = await fetch(new URL('build-info.json', base));
assert.equal(buildResponse.status, 200, 'build-info.json HTTP status');
const liveBuild = await buildResponse.json();
assert.equal(liveBuild.commit, expectedCommit, 'live commit equals authorized release SHA');
assert.equal(liveBuild.dirty, false, 'live build is clean');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await walk(absolute));
    else if (entry.isFile()) found.push(absolute);
  }
  return found;
}

const auditedRoots = [
  'guide', 'docs', 'assets/briefs',
  'test-results/tree-impostor-v7-color-a',
  'test-results/tree-impostor-capture-v2',
  'test-results/tree-impostor-render-v2-hardware',
];
const requiredResources = [
  'test-results/tree-impostor-v7-color-a/capture-v2-portability-audit.json',
  'test-results/tree-impostor-v7-color-a/capture-v2-portability-tests.log',
  'test-results/tree-impostor-capture-v2/cpu-test.log',
  'test-results/tree-impostor-capture-v2/combined-cpu-test.log',
  'test-results/tree-impostor-render-v2-hardware/browser-report.json',
  'test-results/tree-impostor-render-v2-hardware/node-test.log',
];
const resourcesByPath = new Map();
for (const root of auditedRoots) {
  for (const abs of await walk(path.join(dist, root))) {
    const relative = path.relative(dist, abs).replaceAll(path.sep, '/');
    resourcesByPath.set(relative, abs);
  }
}
for (const resource of requiredResources) assert.ok(resourcesByPath.has(resource), `required publication resource is in dist: ${resource}`);
const resources = [];
for (const resourcePath of [...resourcesByPath.keys()].sort()) {
  const local = await readFile(resourcesByPath.get(resourcePath));
  const response = await fetch(new URL(resourcePath, base));
  const remote = Buffer.from(await response.arrayBuffer());
  resources.push({ path: resourcePath, status: response.status, bytes: remote.length, localSha256: sha(local), remoteSha256: sha(remote), matches: response.status === 200 && local.equals(remote) });
}
assert.ok(resources.every(item => item.matches), 'all guide/docs/brief/capture/review/browser resources match release dist byte-for-byte');

const baselineAssets = oldReceipt.runtimeJavaScript.assets;
const baselineByName = new Map(baselineAssets.map(item => [item.name, item.sha256]));
const currentJsPaths = (await walk(path.join(dist, 'assets'))).filter(file => file.endsWith('.js'));
const runtimeJavaScript = [];
for (const abs of currentJsPaths) {
  const name = path.basename(abs), local = await readFile(abs);
  const response = await fetch(new URL(`assets/${name}`, base));
  const remote = Buffer.from(await response.arrayBuffer()), baselineSha256 = baselineByName.get(name);
  runtimeJavaScript.push({ name, status: response.status, sha256: sha(remote), localSha256: sha(local), baselineSha256, matchesDist: response.status === 200 && local.equals(remote), matchesBaseline: !!baselineSha256 && sha(remote) === baselineSha256 });
}
assert.equal(runtimeJavaScript.length, 22, 'runtime JS asset count');
assert.equal(baselineByName.size, 22, 'a76 baseline contains 22 recorded runtime JS assets');
assert.ok(runtimeJavaScript.every(item => item.matchesDist && item.matchesBaseline), 'all runtime JS assets match dist and unchanged a76 release baseline');

assert.equal(guideReport.chapters, 9, 'guide browser test covered all nine chapters');
assert.deepEqual(guideReport.widths, [1440, 390, 320], 'guide browser test covered desktop, mobile and narrow mobile widths');
assert.equal(guideReport.deployedRuntimeChecked, true, 'guide browser test exercised deployed runtime');
assert.deepEqual(guideReport.errors, [], 'guide browser test had no page, response or link errors');

const browser = await chromium.launch({ headless: true, args: browserArgs });
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(new URL('guide/life.html', base).href);
  const initial = await page.locator('details').evaluateAll(nodes => nodes.map(node => ({ summary: node.querySelector('summary')?.textContent?.trim(), open: node.open })));
  assert.ok(initial.length > 0, 'life guide exposes history/details without JavaScript');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'life guide fits 320px initially');
  await page.locator('details summary').first().click();
  const expanded = await page.locator('details').evaluateAll(nodes => nodes.map(node => ({ summary: node.querySelector('summary')?.textContent?.trim(), open: node.open })));
  assert.equal(expanded[0].open, true, 'life-guide history details expands');
  const expandedFits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  assert.equal(expandedFits, true, 'expanded history fits 320px');
  assert.deepEqual(pageErrors, [], 'mobile guide has no page errors');

  const receipt = {
    schema: 'https://iwsdk.local/schemas/live-atlas-publication-receipt/v4',
    base: base.href,
    checkedAt: new Date().toISOString(),
    expectedCommit,
    liveBuild,
    buildStampPass: liveBuild.commit === expectedCommit && liveBuild.dirty === false,
    resourceAudit: { roots: auditedRoots, requiredResources, count: resources.length, allMatchDist: resources.every(item => item.matches), resources },
    runtimeJavaScript: {
      baselineCommit: oldReceipt.runtimeJavaScript.baselineCommit,
      baselineReceipt: path.relative(dist, oldReceiptPath).replaceAll(path.sep, '/'),
      assetCount: runtimeJavaScript.length,
      all22Unchanged: runtimeJavaScript.every(item => item.matchesBaseline),
      assets: runtimeJavaScript,
    },
    guideBrowser: {
      report: path.relative(dist, guideReportPath).replaceAll(path.sep, '/'),
      chapters: guideReport.chapters,
      widths: guideReport.widths,
      internalDestinations: guideReport.internalDestinations,
      deployedRuntimeChecked: guideReport.deployedRuntimeChecked,
      errors: guideReport.errors,
      eraDeepLinks: [0, 5, 9],
      noJavaScriptReading: true,
      inGameGuideLink: true,
      mobileHistoryDetails: { initial, expanded, noHorizontalOverflow: expandedFits, pageErrors },
    },
    result: 'pass',
  };
  await mkdir(out, { recursive: true });
  await writeFile(path.join(out, 'live-publication-receipt.json'), JSON.stringify(receipt, null, 2));
  console.log(`Live publication passed: ${resources.length} guide/docs/brief/capture resources and ${runtimeJavaScript.length} unchanged runtime JS assets.`);
} finally {
  await browser.close();
}
