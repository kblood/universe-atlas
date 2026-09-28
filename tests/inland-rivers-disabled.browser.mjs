import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserArgs } from './browser-options.mjs';
import { galaxies, refByAddress, system } from '../src/catalog.ts';
import { CURRENT_VERSIONS, encodeVersions } from '../src/time-nav.ts';
import { CATALOGUE_EPOCH_NS } from '../src/world-time.ts';
import { starLifecycle, planetLifecycle } from '../src/stellar-evolution.ts';
import { planetSnapshotAt } from '../src/world-surface.ts';

const seed = 'LETHRA-001';
const systemId = 'G001/C2128,0,1/0';
const bodyId = `${systemId}/planet/1`;
const ref = refByAddress(galaxies(seed)[0], systemId);
const sys = system(ref);
const body = sys.planets[1];
const star = sys.stars.find(item => item.id === body.parentId) || sys.stars[0];
const address = item => ({ ...refByAddress(galaxies(seed)[0], systemId), slot: item.id.slice(systemId.length + 1) });
const starLc = starLifecycle(seed, address(star), star);
const planetLc = planetLifecycle(seed, address(body), body, starLc);
const dateNs = CATALOGUE_EPOCH_NS;
const expected = planetSnapshotAt(seed, body.id, body, planetLc, starLc, dateNs, CURRENT_VERSIONS);
assert.equal(expected.ocean.globalOceanAvailable, true, 'chosen date retains the ordinary dated ocean');

const base = process.env.ATLAS_URL || 'http://127.0.0.1:5186/';
const out = process.env.ATLAS_RESULTS || 'test-results/inland-rivers-disabled';
const expectedCommit = process.env.ATLAS_SOURCE_COMMIT;
const params = new URLSearchParams({
  seed, g: 'G001', system: systemId, body: bodyId,
  date: dateNs.toString(), wv: encodeVersions(CURRENT_VERSIONS),
  river: `${bodyId}/drainage-2/n64/outlet/16162`,
});
await mkdir(out, { recursive: true });
const stampResponse = await fetch(new URL('build-info.json', base));
assert.ok(stampResponse.ok, 'preview exposes its build stamp');
const buildInfo = await stampResponse.json();
if (expectedCommit) assert.ok(buildInfo.commit.startsWith(expectedCommit), 'preview is the expected source revision');
assert.equal(buildInfo.dirty, false, 'acceptance requires a clean build');

const browser = await chromium.launch({ headless: true, args: browserArgs });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(`page: ${error.message}`));
page.on('console', message => {
  if (message.type() === 'error' && !message.text().startsWith('[vite] failed to connect to websocket.')) errors.push(`console: ${message.text()}`);
});
if (typeof page.routeWebSocket === 'function') await page.routeWebSocket('**/*', socket => socket.close());
const snapshot = () => page.evaluate(() => {
  const a = window.__atlas;
  const tiles = a?.terrain?.tiles;
  return {
    ready: a?.ready, level: a?.state?.level, bodyId: a?.state?.body?.id,
    date: a?.date, oceanExpectedFromFixture: null,
    riverDiagnostic: a?.river, drainageDiagnostic: a?.drainage,
    notice: { hidden: document.querySelector('#compat-notice')?.hidden,
      text: document.querySelector('#compat-notice')?.textContent?.trim() },
    riverControls: [...document.querySelectorAll('[id*="river"], [data-river]')].map(node => node.id || node.tagName),
    url: location.href,
    travel: a?.travel ? { active: a.travel.active, landing: a.travel.landing,
      walking: a.travel.walking ? { grounded: a.travel.walking.grounded, position: a.travel.walking.position,
        eye: a.travel.walking.eye, speed: a.travel.walking.speed } : null,
      surface: a.travel.surface, clearance: a.travel.clearance } : null,
    terrain: tiles ? { version: tiles.materialVersion, waterLevelM: tiles.waterLevelM,
      oceanDraws: tiles.oceanDraws, river: tiles.river, reflection: tiles.reflection,
      environment: tiles.environment, contactLevel: tiles.contactLevel,
      baseContactLevel: tiles.baseContactLevel, surfaceReady: tiles.surfaceReady,
      resident: tiles.resident, pending: tiles.pending, failures: tiles.failures } : null,
    buttons: [...document.querySelectorAll('button')].map(button => ({ id: button.id, text: button.textContent?.trim() })),
    status: document.querySelector('#status')?.textContent?.trim(),
  };
});

let report = { ok: false, base, buildInfo, seed, systemId, bodyId, dateNs: dateNs.toString(), expectedOcean: expected.ocean };
try {
  await page.goto(`${base}?${params}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(id => window.__atlas?.ready && window.__atlas.state.level === 'body'
    && window.__atlas.state.body?.id === id, bodyId, { timeout: 90000 });
  await page.evaluate(() => window.__atlas.setExplorationPaused(true));
  await page.waitForTimeout(250);
  const oldRiverRoute = await snapshot();
  assert.equal(oldRiverRoute.level, 'body', 'legacy river address opens the ordinary body view');
  assert.equal(oldRiverRoute.bodyId, bodyId);
  assert.equal(oldRiverRoute.riverDiagnostic, null);
  assert.equal(oldRiverRoute.drainageDiagnostic, null);
  assert.equal(oldRiverRoute.notice.hidden, false, 'legacy river address shows its compatibility notice');
  assert.match(oldRiverRoute.notice.text, /inland rivers.*unavailable/i);
  assert.ok(!new URL(oldRiverRoute.url).searchParams.has('river'), 'ordinary persistence drops the retired river address');
  assert.deepEqual(oldRiverRoute.riverControls, [], 'no river-specific controls are present');
  assert.ok(oldRiverRoute.terrain?.oceanDraws > 0, 'the dated ocean remains rendered in the selected solid water world');
  assert.equal(oldRiverRoute.terrain.river, null);
  assert.equal(oldRiverRoute.terrain.reflection, null);
  assert.equal(oldRiverRoute.terrain.environment, null);
  await page.screenshot({ path: `${out}/old-river-link-ordinary-body.png` });

  const flightButton = page.locator('#toggle-flight');
  if (!oldRiverRoute.travel?.active) await flightButton.click();
  await page.waitForFunction(() => window.__atlas?.travel?.active === true, null, { timeout: 10000 });
  await page.locator('#descend').click();
  await page.waitForFunction(() => window.__atlas?.travel?.surface?.terrainClearance < 20000, null, { timeout: 90000 });
  const lowFlight = await snapshot();
  const landButton = page.locator('#walk-surface');
  assert.equal(await landButton.count(), 1, 'ordinary Land and walk control exists');
  await landButton.click();
  await page.waitForFunction(() => window.__atlas?.travel?.walking?.grounded === true, null, { timeout: 150000 });
  await page.waitForTimeout(500);
  const grounded = await snapshot();
  assert.equal(grounded.bodyId, bodyId);
  assert.equal(grounded.travel.walking.grounded, true);
  assert.ok(grounded.terrain.surfaceReady);
  assert.equal(grounded.riverDiagnostic, null);
  assert.equal(grounded.terrain.river, null);
  assert.equal(grounded.terrain.reflection, null);
  assert.equal(grounded.terrain.environment, null);
  await page.screenshot({ path: `${out}/ordinary-grounded.png` });
  assert.deepEqual(errors, [], 'browser has no page or console errors');
  report = { ...report, ok: true, oldRiverRoute, lowFlight, grounded, renderer: await page.evaluate(() => {
    const gl = document.querySelector('canvas')?.getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable';
  }), errors };
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report = { ...report, failure: String(error), state: await snapshot().catch(() => null), errors };
  await writeFile(`${out}/failure.json`, JSON.stringify(report, null, 2));
  await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
