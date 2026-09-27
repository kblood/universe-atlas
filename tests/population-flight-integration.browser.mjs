import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserArgs } from './browser-options.mjs';

const base = process.env.ATLAS_URL || 'http://127.0.0.1:5188/';
const out = process.env.ATLAS_RESULTS || 'test-results/population-flight-integration';
const bodyId = 'G001/C2128,0,1/0/planet/1';
const query = new URLSearchParams({ seed: 'LETHRA-001', g: 'G001', system: 'G001/C2128,0,1/0', body: bodyId });
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ headless: true, args: browserArgs });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(`page: ${error.message}`));
page.on('console', message => {
  if (message.type() === 'error' && !message.text().startsWith('[vite] failed to connect to websocket.'))
    errors.push(`console: ${message.text()}`);
});
if (typeof page.routeWebSocket === 'function') await page.routeWebSocket('**/*', socket => socket.close());

const waitFor = (fn, timeout = 180000, arg) => page.waitForFunction(fn, arg, { timeout });
const read = () => page.evaluate(() => ({
  date: window.__atlas.date,
  state: { level: window.__atlas.state.level, body: window.__atlas.state.body?.id },
  bodyRadiusM: window.__atlas.state.body?.radiusM,
  travel: window.__atlas.travel,
  terrain: window.__atlas.terrain?.tiles,
  clouds: window.__atlas.terrain?.tiles?.clouds,
  lifeGate: window.__atlas.lifeGate,
}));
const distance = (a, b) => Math.hypot(...a.map((value, index) => value - b[index]));
let result;

try {
  await page.goto(`${base}?${query}`, { waitUntil: 'networkidle' });
  await waitFor(id => window.__atlas?.ready && window.__atlas.state.level === 'body' &&
    window.__atlas.state.body?.id === id && window.__atlas.terrain?.tiles?.ready && !window.__atlas.camera.animating, 180000, bodyId);
  await page.waitForTimeout(800);
  const orbital = await read();
  assert.equal(orbital.clouds?.version, 'cloud-volume-2');
  assert.equal(orbital.clouds?.enabled, true);
  assert.ok(orbital.clouds?.eyes > 0 && orbital.clouds.targets?.[0]?.width > 0,
    'integrated volume has an active render target');

  await page.locator('#find-life').click();
  await waitFor(() => window.__atlas.travel.terrainCruise !== null &&
    window.__atlas.terrain?.tiles?.surfaceReady && window.__atlas.terrain.tiles.forest.visible > 200);
  await page.keyboard.down('q');
  await waitFor(() => window.__atlas.travel.surface?.terrainClearance < 100);
  await page.keyboard.up('q');
  await waitFor(() => window.__atlas.terrain.tiles.faunaAnchorCount > 0 &&
    window.__atlas.terrain.tiles.lifePending === 0 && window.__atlas.terrain.tiles.faunaTerrainPending === 0);
  await page.waitForTimeout(500);
  const lowFlight = await read();
  const faunaBeforeMove = lowFlight.terrain.faunaDrawn || [];
  const originOffsetM = lowFlight.travel.cameraOffsetM;
  await page.screenshot({ path: `${out}/02-fauna-low-flight.png` });

  // Pause the world clock while moving the observer by a measured physical distance.
  await page.evaluate(() => window.__atlas.setExplorationPaused(true));
  const movementStart = (await read()).travel.position;
  await page.keyboard.down('w');
  await waitFor(start => {
    const p = window.__atlas.travel.position;
    return Math.hypot(...p.map((v, i) => v - start[i])) >= 20;
  }, 60000, movementStart).catch(async () => {});
  await page.keyboard.up('w');
  // Compare movement outside the page predicate as well; it uses a known start pose.
  const movementEnd = (await read()).travel.position;
  const movedM = distance(movementStart, movementEnd);
  const faunaAfterMove = (await read()).terrain.faunaDrawn || [];
  const idsBeforeMove = new Set(faunaBeforeMove.map(animal => animal.id));
  const retained = faunaAfterMove.find(animal => idsBeforeMove.has(animal.id));

  // The authoritative date is paused through direct seeks, and replaying an exact date
  // must reproduce the same canonical individuals and their double-precision positions.
  const startNs = BigInt((await read()).date.offsetNs);
  const replayA = startNs + 20_000_000_000n;
  const replayB = startNs + 80_000_000_000n;
  await page.evaluate(value => window.__atlas.seek(value), replayA.toString());
  await waitFor(value => window.__atlas.date.offsetNs === value, 30000, replayA.toString());
  const atA = (await read()).terrain.faunaDrawn || [];
  await page.evaluate(value => window.__atlas.seek(value), replayB.toString());
  await page.waitForTimeout(500);
  const atB = (await read()).terrain.faunaDrawn || [];
  await page.evaluate(value => window.__atlas.seek(value), replayA.toString());
  await page.waitForTimeout(500);
  const replayedA = (await read()).terrain.faunaDrawn || [];
  const replayById = new Map(replayedA.map(animal => [animal.id, animal]));
  const replayExact = atA.length > 0 && atA.every(animal => {
    const replay = replayById.get(animal.id);
    return replay && distance(animal.position, replay.position) < 1e-12;
  });
  const positionsB = new Map(atB.map(animal => [animal.id, animal.position]));
  const dateMotion = atA.some(animal => positionsB.has(animal.id) &&
    distance(animal.position, positionsB.get(animal.id)) * lowFlight.bodyRadiusM > 0.25);

  // Resume ordinary exploration at 1x and ensure its date follows elapsed wall seconds.
  await page.evaluate(() => window.__atlas.setExplorationPaused(false));
  const realtimeStart = await read();
  await page.waitForTimeout(4000);
  const realtimeEnd = await read();
  const elapsedWorldS = (Number(BigInt(realtimeEnd.date.offsetNs) - BigInt(realtimeStart.date.offsetNs))) / 1e9;
  const realtimeAnimals = realtimeEnd.terrain.faunaDrawn || [];
  const realtimeById = new Map(realtimeAnimals.map(animal => [animal.id, animal.position]));
  const realtimeMotion = (realtimeStart.terrain.faunaDrawn || []).some(animal =>
    realtimeById.has(animal.id) && distance(animal.position, realtimeById.get(animal.id)) * realtimeEnd.bodyRadiusM > 0.05);

  await page.keyboard.down('q');
  await waitFor(() => window.__atlas.travel.surface?.terrainClearance < 120);
  await page.keyboard.up('q');
  const below120 = await read();
  await page.keyboard.down('q');
  await waitFor(() => window.__atlas.travel.walking !== null, 180000);
  await page.keyboard.up('q');
  await page.waitForTimeout(800);
  const contact = await read();

  const renderer = await page.evaluate(() => {
    const gl = document.querySelector('canvas')?.getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable';
  });
  result = {
    ok: false, base, bodyId, renderer, errors,
    orbital: { cloudVolume: orbital.clouds, state: orbital.state },
    lowFlight: {
      clearanceM: lowFlight.travel.surface?.terrainClearance,
      faunaAnchorCount: lowFlight.terrain.faunaAnchorCount,
      faunaVisibleCount: lowFlight.terrain.faunaVisibleCount,
      faunaDrawnCount: faunaBeforeMove.length,
      lifePending: lowFlight.terrain.lifePending,
      faunaTerrainPending: lowFlight.terrain.faunaTerrainPending,
      cameraOffsetM: originOffsetM,
    },
    movement: { movedM, retainedId: retained?.id || null, beforeCount: faunaBeforeMove.length, afterCount: faunaAfterMove.length },
    dateReplay: { paused: true, startNs: startNs.toString(), replayA: replayA.toString(), replayB: replayB.toString(), exact: replayExact, motionBetweenDates: dateMotion },
    realtime: { elapsedWorldS, motion: realtimeMotion },
    below120: { clearanceM: below120.travel.surface?.terrainClearance, cameraOffsetM: below120.travel.cameraOffsetM, systemUnit: below120.travel.systemUnit },
    contact: { walking: !!contact.travel.walking, clearanceM: contact.travel.surface?.terrainClearance },
  };
  await page.screenshot({ path: `${out}/01-contact.png` });
  await writeFile(`${out}/report.json`, JSON.stringify(result, null, 2));

  assert.ok(lowFlight.terrain.faunaVisibleCount > 0 && faunaBeforeMove.length > 0,
    'actual individuals are submitted during low flight');
  assert.ok(originOffsetM <= 256, `local metre origin offset is ${originOffsetM}m`);
  assert.ok(movedM >= 20, `observer moved ${movedM}m`);
  assert.ok(retained, 'at least one fauna ID remains drawn after moving 20m');
  assert.ok(replayExact, 'explicit pause/date replay preserves individual IDs and positions');
  assert.ok(dateMotion, 'exact-date fauna positions change at a different world date');
  assert.ok(realtimeMotion && elapsedWorldS >= 3.2 && elapsedWorldS <= 5.5,
    `one-second-per-second exploration produces animal motion (${elapsedWorldS}s advanced)`);
  assert.ok(below120.travel.surface?.terrainClearance < 120);
  assert.ok(contact.travel.walking, 'touchdown occurs after actual physical contact');
  assert.ok(contact.travel.surface?.terrainClearance < 3, 'contact view is at observer eye height');
  assert.deepEqual(errors, [], 'integrated volume and local flight have no browser/WebGL console errors');
  result.ok = true;
  await writeFile(`${out}/report.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  if (!result) {
    result = { ok: false, base, bodyId, errors, failure: String(error), state: await read().catch(() => null) };
    await writeFile(`${out}/failure.json`, JSON.stringify(result, null, 2));
    await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  }
  throw error;
} finally {
  await browser.close();
}
