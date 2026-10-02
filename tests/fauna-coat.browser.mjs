// Actual GLB texture bindings, shader effect and morph-dependent shading evidence.
// Requires Vite dev server. GPU execution is serialized with every other review.
import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {chromium} from 'playwright';
import {browserArgs} from './browser-options.mjs';
import {withGpuLock} from './helpers/gpu-lock.mjs';
import {FAUNA_REVIEW_SHADOWS} from '../src/fauna-review-lighting.ts';

const base = new URL('.', process.env.ATLAS_URL || 'http://127.0.0.1:5193/');
const output = process.env.ATLAS_RESULTS || 'test-results/fauna-coat-review';
const shadowReviewOptions = {depthBiasM: process.env.ATLAS_SHADOW_BIAS_MM ? Number(process.env.ATLAS_SHADOW_BIAS_MM) / 1000 : FAUNA_REVIEW_SHADOWS.depthBiasM};
const expectedHash = process.env.ATLAS_ASSET_HASH || createHash('sha256').update(await readFile(new URL('../public/assets/fauna/deer-doe-v1/deer-doe.glb', import.meta.url))).digest('hex');
await mkdir(output, {recursive: true});
const errors = [], report = {ok: false, expectedHash, cases: [], errors,
  scope: 'Actual decoded coat maps, shader effect and visual review captures; anatomy, surface seams and visual realism need separate acceptance'};
try {
  await withGpuLock({owner: 'fauna-coat-browser', timeoutMs: 60000, staleMs: Infinity}, async () => {
    const browser = await chromium.launch({headless: true, args: browserArgs});
    const page = await browser.newPage({viewport: {width: 1440, height: 900}, deviceScaleFactor: 1});
    try {
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      const url = new URL('__fauna-coat-review.html', base).href;
      const module = new URL('tests/helpers/fauna-template-performance-scene.mjs', base).href;
      await page.route(url, route => route.fulfill({contentType: 'text/html', body: `<!doctype html><html><head><link rel="icon" href="data:,"><title>Coat material review</title></head><body><script type="module">import {createFaunaPerformanceScene} from ${JSON.stringify(module)};window.createCoatScene=createFaunaPerformanceScene;</script></body></html>`}));
      await page.goto(url, {waitUntil: 'networkidle'});
      await page.waitForFunction(() => typeof window.createCoatScene === 'function');
      report.fixture = await page.evaluate(async options => { window.coatScene = await window.createCoatScene(options); return window.coatScene.metadata; }, {
        expectedHash, shadowMapSize: Number(process.env.ATLAS_SHADOW_MAP_SIZE ?? FAUNA_REVIEW_SHADOWS.mapSize), glbUrl: new URL('assets/fauna/deer-doe-v1/deer-doe.glb', base).href,
        sidecarUrl: new URL('assets/fauna/deer-doe-v1/fauna-template.json', base).href,
      });
      assert.equal(report.fixture.sourceHash, expectedHash);
      assert.equal(report.fixture.decodedTextures.length, 3, 'Three actual decoded coat maps');
      for (const lighting of ['neutral', 'grazing']) for (const frame of ['body', 'head']) {
        const common = {lighting, frame, controls: {}, ...shadowReviewOptions};
        await page.evaluate(options => window.coatScene.reviewCoat(options), {...common, detail: false});
        await page.screenshot({path: join(output, `${lighting}-${frame}-detail-off.png`)});
        const result = await page.evaluate(options => window.coatScene.reviewCoat(options), {...common, detail: true});
        await page.screenshot({path: join(output, `${lighting}-${frame}-detail-on.png`)});
        assert.ok(result.difference.changedPixels > 500, 'Normal and roughness maps must affect actual rendered pixels');
        assert.ok(result.difference.meanAbsoluteRgbByteDifference > .02, 'Coat detail is effectively disabled');
        report.cases.push(result);
      }
      for (const [name, controls] of [
        ['juvenile', {juvenile: 1}],
        ['elongated', {neckLength: 1, legLength: 1, muzzleLength: 1, earSize: 1}],
        ['compact', {bodyCondition: 1, neckLength: -1, legLength: -1, muzzleLength: -1}],
      ]) {
        const result = await page.evaluate(options => window.coatScene.reviewCoat(options), {detail: true, lighting: 'grazing', frame: 'body', controls, ...shadowReviewOptions});
        await page.screenshot({path: join(output, `${name}-grazing.png`)});
        report.cases.push({name, ...result});
      }
      for (const neutralMaterial of [false, true]) {
        const result = await page.evaluate(options => window.coatScene.reviewCoat(options), {detail: false, lighting: 'grazing', frame: 'head', shadows: false, neutralMaterial});
        await page.screenshot({path: join(output, `grazing-head-no-shadows-${neutralMaterial ? 'neutral-material' : 'coat'}.png`)});
        report.cases.push({diagnostic: 'Isolate self-shadow artifacts from material and geometry', ...result});
      }
      report.teardown = await page.evaluate(() => window.coatScene.dispose());
      assert.deepEqual(errors, []); report.ok = true;
    } finally { await page.evaluate(() => window.coatScene?.dispose()).catch(() => {}); await browser.close(); }
  });
} catch (error) { report.error = error.stack ?? String(error); process.exitCode = 1; }
await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ok: report.ok, expectedHash, cases: report.cases.length, output, error: report.error}));
