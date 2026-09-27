import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserArgs } from './browser-options.mjs';
import { encodeVersions, CURRENT_VERSIONS } from '../src/time-nav.ts';

const base = process.env.ATLAS_URL || 'http://127.0.0.1:5194/';
const out = process.env.ATLAS_RESULTS || 'test-results/desktop-rendering-6b87e13';
const bodyId = 'G001/C2128,0,1/0/planet/1';
const query = new URLSearchParams({ seed: 'LETHRA-001', g: 'G001', system: 'G001/C2128,0,1/0', body: bodyId,
  date: '435084631200000032044300000', wv: encodeVersions(CURRENT_VERSIONS) });
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: browserArgs });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(`page: ${error.message}`));
page.on('console', message => {
  if (message.type() === 'error' && !message.text().startsWith('[vite] failed to connect to websocket.')) errors.push(`console: ${message.text()}`);
});
if (typeof page.routeWebSocket === 'function') await page.routeWebSocket('**/*', socket => socket.close());
const waitFor = (fn, timeout = 180000, arg) => page.waitForFunction(fn, arg, { timeout });
const snap = () => page.evaluate(() => ({
  position: window.__atlas.travel.position,
  heading: window.__atlas.travel.heading,
  forest: window.__atlas.terrain?.tiles?.forest,
  terrain: window.__atlas.terrain?.tiles,
  date: window.__atlas.date,
}));
let report;
try {
  await page.goto(`${base}?${query}`, { waitUntil: 'networkidle' });
  await waitFor(id => window.__atlas?.ready && window.__atlas.state.level === 'body' && window.__atlas.state.body?.id === id && !window.__atlas.camera.animating, 180000, bodyId);
  await page.locator('#find-life').click();
  await waitFor(() => window.__atlas.travel.terrainCruise !== null);
  await page.keyboard.down('q');
  await waitFor(() => window.__atlas.travel.surface?.terrainClearance < 100, 180000);
  await page.keyboard.up('q');
  await waitFor(() => window.__atlas.terrain?.tiles?.forest?.visible > 200 &&
    window.__atlas.terrain.tiles.faunaVisibleCount > 0 && window.__atlas.terrain.tiles.floraPresentCount > 0, 180000);
  await page.evaluate(() => window.__atlas.setExplorationPaused(true));
  await waitFor(() => window.__atlas.terrain?.tiles?.forest?.selectionPending === false &&
    window.__atlas.terrain.tiles.forest.pending === 0 && window.__atlas.terrain.tiles.pending === 0 &&
    window.__atlas.terrain.tiles.faunaTerrainPending === 0);
  await page.waitForTimeout(1500);
  const warmed = await snap();
  await page.screenshot({ path: `${out}/near-ground-warmed.png` });
  const cloudSamples = {};
  for (const samples of [0, 2, 4]) {
    await page.evaluate(value => window.__atlas.setCloudSceneSamples(value), samples);
    await page.waitForTimeout(1500);
    cloudSamples[samples] = await page.evaluate(() => window.__atlas.terrain.tiles.clouds);
    await page.screenshot({ path: `${out}/cloud-aa-${samples}.png` });
  }
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.evaluate(() => window.__atlas.setCloudSceneSamples(4));
  await page.waitForTimeout(1800);
  const resizedFour = await page.evaluate(() => window.__atlas.terrain.tiles.clouds);
  await page.screenshot({ path: `${out}/cloud-aa-4-2560x1440.png` });
  await page.evaluate(() => window.__atlas.setCloudSceneSamples(0));
  await page.waitForTimeout(1800);
  const resizedClouds = await page.evaluate(() => window.__atlas.terrain.tiles.clouds);
  await page.screenshot({ path: `${out}/near-ground-resized-2560x1440.png` });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForTimeout(700);
  await page.waitForTimeout(900);
  const stationary = await snap();
  const beforeHeading = stationary.heading;
  await page.mouse.move(720, 500);
  await page.mouse.down();
  await page.mouse.move(1000, 500, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(1000);
  const turned = await snap();
  const distance = Math.hypot(...turned.position.map((v, i) => v - stationary.position[i]));
  const headingChange = Math.hypot(...turned.heading.map((v, i) => v - beforeHeading[i]));
  await page.screenshot({ path: `${out}/forest-turned.png` });
  await page.evaluate(() => { window.__atlas.setProfiling(true); window.__atlas.resetProfile(); });
  await page.waitForTimeout(8000);
  const profile = await page.evaluate(() => window.__atlas.renderProfile);
  await page.evaluate(() => window.__atlas.setProfiling(false));
  report = {
    ok: false, base, bodyId, date: warmed.date, viewport: [1440, 1000],
    renderer: await page.evaluate(() => {
      const gl = document.querySelector('canvas')?.getContext('webgl2');
      const ext = gl?.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable';
    }), errors,
    nearGround: { terrainClearanceM: await page.evaluate(() => window.__atlas.travel.surface?.terrainClearance), floraPresent: warmed.terrain.floraPresentCount,
      faunaVisible: warmed.terrain.faunaVisibleCount, faunaDrawn: warmed.terrain.faunaDrawn?.length },
    cloudSamples, resizedFour, resizedClouds,
    floraRecipeBuilds: warmed.terrain.floraRecipeBuilds,
    localAerial: warmed.terrain.localAerial,
    warmed: { visible: warmed.forest.visible, near: warmed.forest.near, cached: warmed.forest.cached, pending: warmed.forest.pending,
      matrixWrites: warmed.forest.matrixWrites, colorWrites: warmed.forest.colorWrites, coverageWrites: warmed.forest.coverageWrites,
      originVersion: warmed.forest.originVersion, selectionPending: warmed.forest.selectionPending },
    stationarySecond: { visible: stationary.forest.visible, matrixWrites: stationary.forest.matrixWrites,
      colorWrites: stationary.forest.colorWrites, coverageWrites: stationary.forest.coverageWrites,
      originVersion: stationary.forest.originVersion },
    terrainDiagnostics: {
      forest: warmed.terrain.forest,
      floraRecipeBuilds: warmed.terrain.floraRecipeBuilds,
      localAerial: warmed.terrain.localAerial,
      updateMs: warmed.terrain.updateMs,
      lifeMs: warmed.terrain.lifeMs,
      rescatterMs: warmed.terrain.rescatterMs,
      drawFloraMs: warmed.terrain.drawFloraMs,
      drawFaunaMs: warmed.terrain.drawFaunaMs,
      residentTiles: warmed.terrain.resident,
      pendingTiles: warmed.terrain.pending,
      visibleTiles: warmed.terrain.visible,
      surfaceReady: warmed.terrain.surfaceReady,
      waterBucket: warmed.terrain.waterBucket,
      floraSlots: warmed.terrain.floraSlotCount,
      floraSubmitted: warmed.terrain.floraSubmittedCount,
      faunaDrawn: warmed.terrain.faunaDrawn?.length,
      faunaTerrainPending: warmed.terrain.faunaTerrainPending,
      tileSelection: warmed.terrain.debug,
    },
    turn: { visible: turned.forest.visible, near: turned.forest.near, positionDeltaM: distance,
      headingDeltaQuaternionNorm: headingChange, matrixWrites: turned.forest.matrixWrites,
      colorWrites: turned.forest.colorWrites, originVersion: turned.forest.originVersion },
    profile,
  };
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  assert.ok(warmed.forest.visible > 200, `forest populated (${warmed.forest.visible})`);
  assert.equal(warmed.terrain.floraRecipeBuilds, 0, 'warmed stationary frame reuses resident flora recipes');
  assert.equal(warmed.terrain.localAerial.failures.length, 0, `all local materials have aerial hooks (${JSON.stringify(warmed.terrain.localAerial.failures)})`);
  assert.equal(warmed.terrain.localAerial.attached, warmed.terrain.localAerial.meshes, 'all local material hooks are attached');
  for (const samples of [0, 2, 4]) {
    assert.equal(cloudSamples[samples].requestedSceneSamples, samples);
    assert.equal(cloudSamples[samples].effectiveSceneSamples, samples);
    assert.equal(cloudSamples[samples].sceneResolutionScale, 1);
    assert.ok(cloudSamples[samples].estimatedBytes <= cloudSamples[samples].targetBudgetBytes);
  }
  assert.equal(resizedFour.requestedSceneSamples, 4);
  assert.equal(resizedFour.effectiveSceneSamples, 2, '4x request uses the largest budget-fitting sample count at 2560x1440');
  assert.equal(resizedFour.sceneResolutionScale, 1, 'AA budget does not lower full-scene resolution');
  assert.equal(resizedFour.targets[0].width, 2560);
  assert.equal(resizedFour.targets[0].height, 1440);
  assert.equal(resizedClouds.requestedSceneSamples, 0, 'sample request restores to 0 after 4x');
  assert.equal(warmed.forest.matrixWrites, 0, 'warm stationary frame has no matrix writes');
  assert.equal(warmed.forest.colorWrites, 0, 'warm stationary frame has no color writes');
  assert.equal(stationary.forest.matrixWrites, 0, 'next stationary frame has no matrix writes');
  assert.equal(stationary.forest.colorWrites, 0, 'next stationary frame has no color writes');
  assert.ok(headingChange > 0.05, `camera heading changed (${headingChange})`);
  assert.ok(distance < 0.1, `observer stayed in place (${distance}m)`);
  assert.equal(turned.forest.originVersion, stationary.forest.originVersion, 'turning in place does not rebase forest origin');
  assert.deepEqual(errors, [], 'browser has no page or console errors');
  report.ok = true;
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  if (!report) {
    report = { ok: false, base, bodyId, errors, failure: String(error), state: await snap().catch(() => null), travel: await page.evaluate(() => window.__atlas?.travel).catch(() => null) };
    await writeFile(`${out}/failure.json`, JSON.stringify(report, null, 2));
    await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  }
  throw error;
} finally { await browser.close(); }
