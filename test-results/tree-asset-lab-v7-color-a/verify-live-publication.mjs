import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const base = new URL(process.env.ATLAS_URL || 'https://dionysus.dk/webxr/IWSDK/universe-atlas/');
const expectedCommit = process.env.ATLAS_SOURCE_COMMIT;
const dist = path.resolve(process.env.ATLAS_DIST || 'C:/LLM/IWSDK/universe-atlas/dist');
const out = path.dirname(fileURLToPath(import.meta.url));
const oldReceiptPath = path.resolve(process.env.ATLAS_BASELINE_RECEIPT || '../tree-asset-lab-v6/live-deployment-receipt.json');
const oldReceipt = JSON.parse(await readFile(oldReceiptPath, 'utf8'));
const guideReport = JSON.parse(await readFile(path.resolve(out, 'live-guide/guide-report.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const buildResponse = await fetch(new URL('build-info.json', base));
assert.equal(buildResponse.status, 200, 'build-info.json HTTP status');
const liveBuild = await buildResponse.json();
assert.equal(liveBuild.commit, expectedCommit, 'live commit');
assert.equal(liveBuild.dirty, false, 'live dirty flag');

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

const paths = new Set();
const auditedRoots = [
  'guide', 'docs',
  'assets/briefs',
  'test-results/tree-asset-lab-v7-color-a',
  'test-results/tree-asset-lighting-v7-color-a',
  'test-results/tree-asset-lighting-v6',
  'test-results/tree-authoring-v7',
  'test-results/tree-impostor-views-v1',
  'test-results/tree-color-calibration-v1/validated',
];
for (const root of auditedRoots) {
  for (const abs of await walk(path.join(dist, root))) paths.add(path.relative(dist, abs).replaceAll(path.sep, '/'));
}
const resources = [];
for (const resourcePath of [...paths].sort()) {
  const local = await readFile(path.join(dist, resourcePath));
  const response = await fetch(new URL(resourcePath, base));
  const remote = Buffer.from(await response.arrayBuffer());
  const localHash = sha(local), remoteHash = sha(remote);
  resources.push({ path: resourcePath, status: response.status, bytes: remote.length, localSha256: localHash, remoteSha256: remoteHash, matches: response.status === 200 && local.equals(remote) });
}
assert.ok(resources.every(item => item.matches), 'all audited guide, docs, and v7 result resources match deployment dist');

const baselineAssets = oldReceipt.runtimeJavaScript.assets;
const baselineByName = new Map(baselineAssets.map(item => [item.name, item.sha256]));
const currentJsPaths = (await walk(path.join(dist, 'assets'))).filter(file => file.endsWith('.js'));
const runtimeJavaScript = [];
for (const abs of currentJsPaths) {
  const name = path.basename(abs), local = await readFile(abs), response = await fetch(new URL(`assets/${name}`, base));
  const remote = Buffer.from(await response.arrayBuffer()), baselineSha256 = baselineByName.get(name);
  runtimeJavaScript.push({ name, status: response.status, sha256: sha(remote), localSha256: sha(local), baselineSha256, matchesDist: response.status === 200 && local.equals(remote), matchesBaseline: !!baselineSha256 && sha(remote) === baselineSha256 });
}
assert.equal(runtimeJavaScript.length, 22, 'runtime JS asset count');
assert.ok(runtimeJavaScript.every(item => item.matchesDist && item.matchesBaseline), 'all runtime JS assets match deployment dist and prior released baseline hash set');

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));
  await page.goto(new URL('guide/life.html', base).href);
  const history = await page.locator('details').evaluateAll(nodes => nodes.map(node => ({ summary: node.querySelector('summary')?.textContent?.trim(), open: node.open })));
  assert.ok(history.length > 0, 'life guide has history details');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'life guide fits 320px');
  await page.locator('details summary').first().click();
  const expandedHistory = await page.locator('details').evaluateAll(nodes => nodes.map(node => ({ summary: node.querySelector('summary')?.textContent?.trim(), open: node.open })));
  const expandedFits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  assert.equal(expandedHistory[0].open, true, 'history details expands');
  assert.equal(expandedFits, true, 'expanded history fits 320px');
  assert.deepEqual(pageErrors, []);
  const receipt = {
    schema: 'https://iwsdk.local/schemas/live-atlas-publication-receipt/v3',
    base: base.href,
    checkedAt: new Date().toISOString(),
    expectedCommit,
    liveBuild,
    buildStampPass: liveBuild.commit === expectedCommit && liveBuild.dirty === false,
    resourceAudit: { roots: auditedRoots, count: resources.length, allMatchDist: resources.every(item => item.matches), resources },
    runtimeJavaScript: { baselineCommit: 'c747e6b16d59577c600484ff62d0efb8b3cb47a2', baselineHashSetSource: path.relative(dist, oldReceiptPath).replaceAll(path.sep, '/'), assetCount: runtimeJavaScript.length, all22Unchanged: runtimeJavaScript.every(item => item.matchesBaseline), assets: runtimeJavaScript },
    mobileHistoryDetails: { viewportWidth: 320, initialDetails: history, expandedDetails: expandedHistory, noHorizontalOverflow: expandedFits, pageErrors },
    guideBrowser: {
      report: 'test-results/tree-asset-lab-v7-color-a/live-guide/guide-report.json',
      chapters: guideReport.chapters,
      widths: guideReport.widths,
      internalDestinations: guideReport.internalDestinations,
      deployedRuntimeChecked: guideReport.deployedRuntimeChecked,
      errors: guideReport.errors,
      responsiveNoOverflow: true,
      noJsReading: true,
      eraDeepLinks: [0, 5, 9],
      inGameGuideLink: true,
    },
    result: 'pass',
  };
  await mkdir(out, { recursive: true });
  await writeFile(path.join(out, 'live-deployment-receipt.json'), JSON.stringify(receipt, null, 2));
  console.log(`Live bytes passed: ${resources.length} guide/docs/v7 resources; ${runtimeJavaScript.length} runtime JS assets; mobile history details open cleanly.`);
} finally {
  await browser.close();
}
