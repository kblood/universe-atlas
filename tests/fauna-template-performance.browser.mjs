// Actual rendered-template budget fixture, served through the Vite development server.
// ATLAS_HARDWARE=1 uses the existing hardware browser args; otherwise SwiftShader.
// ATLAS_URL=http://127.0.0.1:5193/ ATLAS_RESULTS=test-results/fauna-template-render-performance
// ATLAS_ASSET_HASH may pin a supplied 64-hex GLB hash; default hashes the local public GLB.
import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import os from 'node:os';
import {chromium} from 'playwright';
import {browserArgs} from './browser-options.mjs';
import {withGpuLock} from './helpers/gpu-lock.mjs';

const base = new URL('.', process.env.ATLAS_URL || 'http://127.0.0.1:5193/');
const output = process.env.ATLAS_RESULTS || 'test-results/fauna-template-render-performance';
const localAsset = new URL('../public/assets/fauna/deer-doe-v1/deer-doe.glb', import.meta.url);
const expectedHash = (process.env.ATLAS_ASSET_HASH || createHash('sha256').update(await readFile(localAsset)).digest('hex')).toLowerCase();
assert.match(expectedHash, /^[a-f0-9]{64}$/, 'ATLAS_ASSET_HASH must be a SHA-256 hex digest');
await mkdir(output, {recursive: true});
const errors = [], report = {
  ok: false, okMeaning: 'Measurements and resource assertions completed; no frame-rate or device qualification is implied',
  scope: 'Isolated rendered Blender template fixture, one and six animals; not the planetary scene', expectedHash,
  expectedHashSource: process.env.ATLAS_ASSET_HASH ? 'ATLAS_ASSET_HASH' : localAsset.href,
  limitations: [
    'CPU render duration measures command submission and possible driver stalls, not GPU elapsed time.',
    'RAF intervals include browser scheduling, refresh cadence and stalls; headless timing is not headset performance.',
    'Scene includes decoded GLB textures, morph skinning, actual animation, a floor, hemisphere/sun light and shadow rendering.',
    'Excludes the planetary scene, terrain streaming, atmosphere, other wildlife, UI and XR. No full-scene or Quest qualification.',
    'Renderer counts and disposal events check bounded resources, not browser garbage collection or exact VRAM residency.',
  ],
  host: {cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, platform: process.platform, node: process.version},
  browserArgs, requestedHardware: !!process.env.ATLAS_HARDWARE, scenarios: [], errors,
};
try {
  await withGpuLock({owner: 'fauna-template-render-performance', timeoutMs: 60000, staleMs: Infinity}, async () => {
    const browser = await chromium.launch({headless: true, args: browserArgs});
    let page;
    try {
      report.browserVersion = browser.version();
      page = await browser.newPage({viewport: {width: 1440, height: 900}, deviceScaleFactor: 1});
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      const harnessUrl = new URL('__fauna-template-performance.html', base).href;
      const moduleUrl = new URL('tests/helpers/fauna-template-performance-scene.mjs', base).href;
      await page.route(harnessUrl, route => route.fulfill({contentType: 'text/html', body:
        `<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"><title>Fauna rendered performance fixture</title></head><body><script type="module">import {createFaunaPerformanceScene} from ${JSON.stringify(moduleUrl)}; window.createFaunaPerformanceScene=createFaunaPerformanceScene;</script></body></html>`}));
      await page.goto(harnessUrl, {waitUntil: 'networkidle'});
      await page.waitForFunction(() => typeof window.createFaunaPerformanceScene === 'function', null, {timeout: 30000});
      report.fixture = await page.evaluate(async options => {
        window.faunaPerformance = await window.createFaunaPerformanceScene(options);
        return window.faunaPerformance.metadata;
      }, {expectedHash, glbUrl: new URL('assets/fauna/deer-doe-v1/deer-doe.glb', base).href,
        sidecarUrl: new URL('assets/fauna/deer-doe-v1/fauna-template.json', base).href});
      assert.equal(report.fixture.sourceHash, expectedHash);
      for (const count of [1, 6]) {
        report.scenarios.push(await page.evaluate(count => window.faunaPerformance.measure(count), count));
        await page.screenshot({path: join(output, `${count}-animals.png`)});
      }
      report.churn = await page.evaluate(() => window.faunaPerformance.churn());
      report.teardown = await page.evaluate(() => window.faunaPerformance.dispose());
      assert.deepEqual(errors, []);
      report.ok = true;
    } finally {
      if (page) await page.evaluate(() => window.faunaPerformance?.dispose()).catch(e => errors.push(e.message));
      await browser.close();
    }
  });
} catch (error) { report.error = error.stack ?? String(error); process.exitCode = 1; }
finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ok: report.ok, output, expectedHash, error: report.error,
    scenarios: report.scenarios.map(row => ({animals: row.animals, walk: row.pose.walk}))}, null, 2));
}
