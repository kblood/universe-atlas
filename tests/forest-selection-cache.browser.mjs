import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserArgs } from './browser-options.mjs';
import { encodeVersions, CURRENT_VERSIONS } from '../src/time-nav.ts';

const base = process.env.ATLAS_URL || 'http://127.0.0.1:5198/';
const out = process.env.ATLAS_RESULTS || 'test-results/forest-selection-cache-browser';
const bodyId = 'G001/C2128,0,1/0/planet/1';
const params = new URLSearchParams({
  seed: 'LETHRA-001', g: 'G001', system: 'G001/C2128,0,1/0', body: bodyId,
  date: '435084631200000032044300000', wv: encodeVersions(CURRENT_VERSIONS),
});
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: browserArgs });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(`page: ${error.message}`));
page.on('console', message => {
  if (message.type() === 'error' && !message.text().startsWith('[vite] failed to connect to websocket.')) errors.push(`console: ${message.text()}`);
});
const waitFor = (predicate, timeout = 180000, arg) => page.waitForFunction(predicate, arg, { timeout });
const read = () => page.evaluate(() => ({
  date: window.__atlas.date,
  body: window.__atlas.state.body?.id,
  travel: {
    active: window.__atlas.travel.active,
    position: window.__atlas.travel.position,
    surfaceJourney: window.__atlas.travel.surfaceJourney,
    autopilot: window.__atlas.travel.autopilot,
    terrainClearanceM: window.__atlas.travel.surface?.terrainClearance,
    terrainCruise: window.__atlas.travel.terrainCruise,
  },
  terrain: window.__atlas.terrain.tiles,
  workerSelections: [...window.__forestSelectionWorkerResponses],
}));
let report;
let before = null;
let beforePosition = null;
let beforeCache = null;
let responseCount = null;
let movedPosition = null;
let movedM = null;
let groundMovedM = null;

try {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.__forestSelectionWorkerResponses = [];
    class ObservedWorker extends NativeWorker {
      constructor(...args) {
        super(...args);
        super.addEventListener('message', event => {
          const data = event.data;
          if (data && data.cache && Number.isInteger(data.requestId)) {
            window.__forestSelectionWorkerResponses.push({ requestId: data.requestId, ...data.cache });
          }
        });
      }
    }
    window.Worker = ObservedWorker;
  });

  await page.goto(`${base}?${params}`, { waitUntil: 'domcontentloaded' });
  await waitFor(id => window.__atlas?.ready && window.__atlas.state.level === 'body' &&
    window.__atlas.state.body?.id === id && !window.__atlas.camera.animating, 180000, bodyId);
  await page.locator('#find-life').click();
  await waitFor(() => window.__atlas.travel.terrainCruise !== null &&
    window.__atlas.terrain?.tiles?.surfaceReady && window.__atlas.terrain.tiles.forest.visible > 200);
  await page.keyboard.down('q');
  await waitFor(() => window.__atlas.travel.surface?.terrainClearance < 100);
  await page.keyboard.up('q');
  await waitFor(() => window.__atlas.terrain.tiles.faunaVisibleCount > 0 &&
    window.__atlas.terrain.tiles.floraPresentCount > 0 && window.__atlas.terrain.tiles.faunaTerrainPending === 0);
  await page.evaluate(() => window.__atlas.setExplorationPaused(true));
  await waitFor(() => window.__atlas.terrain.tiles.forest.selectionPending === false &&
    window.__atlas.terrain.tiles.forest.pending === 0 && window.__atlas.terrain.tiles.pending === 0);
  await page.waitForTimeout(500);
  before = await read();
  beforePosition = before.travel.position;
  responseCount = before.workerSelections.length;
  beforeCache = before.terrain.forest.selectionCache;
  const groundStart = await page.evaluate(id => {
    const travel = window.__atlas.travel;
    const body = travel.bodies.find(item => item.id === id);
    const radiusM = window.__atlas.state.body.radiusM;
    const vector = travel.position.map((value, index) => value - body.positionM[index]);
    const length = Math.hypot(...vector);
    return { direction: vector.map(value => value / length), radiusM };
  }, bodyId);

  await page.keyboard.down('a');
  await waitFor(start => {
    const travel = window.__atlas.travel;
    const body = travel.bodies.find(item => item.id === start.bodyId);
    const vector = travel.position.map((value, index) => value - body.positionM[index]);
    const length = Math.hypot(...vector);
    const direction = vector.map(value => value / length);
    const dot = direction.reduce((sum, value, index) => sum + value * start.direction[index], 0);
    return Math.acos(Math.max(-1, Math.min(1, dot))) * start.radiusM > 110;
  }, 45000, { ...groundStart, bodyId });
  await page.keyboard.up('a');
  movedPosition = await page.evaluate(() => window.__atlas.travel.position);
  movedM = Math.hypot(...movedPosition.map((value, index) => value - beforePosition[index]));
  groundMovedM = await page.evaluate(({ start, id }) => {
    const travel = window.__atlas.travel;
    const body = travel.bodies.find(item => item.id === id);
    const vector = travel.position.map((value, index) => value - body.positionM[index]);
    const length = Math.hypot(...vector);
    const direction = vector.map(value => value / length);
    const dot = direction.reduce((sum, value, index) => sum + value * start.direction[index], 0);
    return Math.acos(Math.max(-1, Math.min(1, dot))) * start.radiusM;
  }, { start: groundStart, id: bodyId });
  assert.ok(groundMovedM > 80, `observer moved laterally over 80 m at ground level (${groundMovedM})`);

  await waitFor(count => window.__forestSelectionWorkerResponses.length > count, 60000, responseCount);
  await waitFor(() => window.__atlas.terrain.tiles.forest.selectionPending === false &&
    window.__atlas.terrain.tiles.forest.pending === 0);
  await page.waitForTimeout(250);
  const after = await read();
  const cache = after.terrain.forest.selectionCache;
  const movedResponses = after.workerSelections.slice(responseCount);
  assert.ok(movedResponses.length > 0, 'forest selection worker returned after the movement');
  assert.ok(cache, 'forest exposes selection cache diagnostics');
  assert.ok(cache.hits > 0, `moved working set reused cached patches (${cache.hits} hits)`);
  assert.ok(cache.misses >= 0, `cache misses are reported (${cache.misses})`);
  assert.ok(cache.estimatedBytes <= cache.maxBytes, `cache stays within its byte cap (${cache.estimatedBytes}/${cache.maxBytes})`);
  assert.ok(cache.maxBytes <= 32 * 1024 * 1024, `configured cap is at most 32 MiB (${cache.maxBytes})`);
  assert.equal(after.terrain.forest.workerFailures, 0);
  assert.equal(after.terrain.forest.workerRestarts, 0);
  assert.ok(after.terrain.forest.visible > 200, 'trees remain visible after movement');
  assert.ok(after.terrain.floraPresentCount > 0, 'flora remains populated after movement');
  assert.ok(after.terrain.faunaDrawn?.length > 0, 'fauna remains drawn after movement');
  assert.equal(after.terrain.surfaceReady, true);
  assert.deepEqual(errors, [], 'browser has no page or console errors');
  await page.screenshot({ path: `${out}/after-move.png` });

  report = {
    ok: true, base, bodyId, renderer: await page.evaluate(() => {
      const gl = document.querySelector('canvas')?.getContext('webgl2');
      const ext = gl?.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable';
    }),
    date: after.date, movedM, groundMovedM, beforeCache, cache,
    workerResponsesBefore: responseCount, movedResponses,
    forest: {
      before: { visible: before.terrain.forest.visible, cached: before.terrain.forest.cached, pending: before.terrain.forest.pending },
      after: { visible: after.terrain.forest.visible, cached: after.terrain.forest.cached, pending: after.terrain.forest.pending,
        workerRestarts: after.terrain.forest.workerRestarts, workerFailures: after.terrain.forest.workerFailures },
    },
    life: { floraPresent: after.terrain.floraPresentCount, faunaDrawn: after.terrain.faunaDrawn?.length,
      faunaTerrainPending: after.terrain.faunaTerrainPending, surfaceReady: after.terrain.surfaceReady },
    errors,
  };
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report = { ok: false, base, bodyId, errors, failure: String(error), before, beforePosition, beforeCache, responseCount, movedPosition, movedM, groundMovedM, state: await read().catch(() => null) };
  await writeFile(`${out}/failure.json`, JSON.stringify(report, null, 2));
  await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
