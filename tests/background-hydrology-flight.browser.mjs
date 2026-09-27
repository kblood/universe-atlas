import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserArgs } from './browser-options.mjs';
import { encodeVersions, CURRENT_VERSIONS } from '../src/time-nav.ts';

const base = process.env.ATLAS_URL || 'http://127.0.0.1:5195/';
const out = process.env.ATLAS_RESULTS || 'test-results/background-hydrology-flight';
const action = process.env.ATLAS_ACTION || 'life';
const bodyId = 'G001/C2128,0,1/0/planet/1';
const params = new URLSearchParams({
  seed: 'LETHRA-001', g: 'G001', system: 'G001/C2128,0,1/0', body: bodyId,
  date: '435084631200000032044300000', wv: encodeVersions(CURRENT_VERSIONS),
});
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: browserArgs });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(`page: ${error.message}`));
page.on('console', message => {
  if (message.type() === 'error' && !message.text().startsWith('[vite] failed to connect to websocket.')) errors.push(`console: ${message.text()}`);
});
const waitFor = (predicate, timeout = 55000, arg) => page.waitForFunction(predicate, arg, { timeout });
const snapshot = () => page.evaluate(() => ({
  level: window.__atlas?.state?.level,
  bodyId: window.__atlas?.state?.body?.id,
  travel: (() => {
    const t = window.__atlas?.travel;
    return t ? {
      active: t.active, domain: t.domain, surfaceJourney: t.surfaceJourney,
      terrainCruise: t.terrainCruise, landing: t.landing,
      walking: t.walking ? { active: t.walking.active, grounded: t.walking.grounded, waiting: t.walking.waiting } : null,
      riverJourney: t.riverJourney,
    } : null;
  })(),
  riverStatus: window.__atlas?.river?.status,
  held: window.__backgroundSurfaceGate?.heldCount,
  heldJobs: window.__backgroundSurfaceGate?.heldJobs,
  released: window.__backgroundSurfaceGate?.released,
}));
let report = { ok: false, base, bodyId, action, errors };
try {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    const gate = {
      heldCount: 0,
      heldJobs: [],
      released: false,
      workers: [],
      release() {
        this.released = true;
        for (const worker of this.workers) {
          const events = worker.__heldSurfaceEvents.splice(0);
          for (const event of events) worker.__dispatchMainHandler(event);
        }
      },
    };
    class GatedWorker extends NativeWorker {
      constructor(...args) {
        super(...args);
        this.__mainMessageHandler = null;
        this.__mainErrorHandler = null;
        this.__surfaceJobs = new Set();
        this.__heldSurfaceEvents = [];
        gate.workers.push(this);
        super.addEventListener('message', event => {
          const id = event.data?.id;
          if (this.__surfaceJobs.has(id) && !gate.released) {
            this.__surfaceJobs.delete(id);
            this.__heldSurfaceEvents.push(event);
            gate.heldCount++;
            gate.heldJobs.push(id);
            return;
          }
          this.__dispatchMainHandler(event);
        });
        super.addEventListener('error', event => this.__mainErrorHandler?.call(this, event));
      }
      get onmessage() { return this.__mainMessageHandler; }
      set onmessage(handler) { this.__mainMessageHandler = handler; }
      get onerror() { return this.__mainErrorHandler; }
      set onerror(handler) { this.__mainErrorHandler = handler; }
      __dispatchMainHandler(event) { this.__mainMessageHandler?.call(this, event); }
      postMessage(message, ...transfer) {
        if (message?.kind === 'surface' && message.args?.body?.hydrology) this.__surfaceJobs.add(message.id);
        return super.postMessage(message, ...transfer);
      }
    }
    window.Worker = GatedWorker;
    window.__backgroundSurfaceGate = gate;
  });

  await page.goto(`${base}?${params}`, { waitUntil: 'domcontentloaded' });
  await waitFor(id => window.__atlas?.ready && window.__atlas.state.level === 'body' && window.__atlas.state.body?.id === id, 55000, bodyId);
  // Hold only the asynchronous, hydrology-enriched terrain result. The initial
  // overview/system and non-hydrology surface worker responses pass through.
  await waitFor(() => window.__backgroundSurfaceGate?.heldCount > 0);
  const beforeAction = await snapshot();

  if (action === 'life') {
    await page.locator('#find-life').click();
    await waitFor(() => window.__atlas.travel.surfaceJourney === true);
  } else if (action === 'land') {
    await page.locator('#walk-surface').click();
    await waitFor(() => window.__atlas.travel.landing === true || window.__atlas.travel.surfaceJourney === true);
  } else {
    throw new Error(`Unsupported ATLAS_ACTION ${action}`);
  }
  const heldTravel = await snapshot();
  assert.equal(heldTravel.travel.active, true, 'the user flight command is active while the background worker is held');
  assert.ok(heldTravel.travel.surfaceJourney || heldTravel.travel.landing || heldTravel.travel.terrainCruise,
    'Find Life or Land has installed a travel intent before worker completion');

  await page.evaluate(() => window.__backgroundSurfaceGate.release());
  await waitFor(() => window.__atlas.river?.status === 'ready');
  await page.waitForTimeout(100);
  const afterBackgroundCompletion = await snapshot();
  assert.equal(afterBackgroundCompletion.travel.active, true, 'background hydrology completion preserves flight');
  assert.ok(afterBackgroundCompletion.travel.surfaceJourney || afterBackgroundCompletion.travel.landing || afterBackgroundCompletion.travel.terrainCruise,
    'background hydrology completion preserves the pending Find Life or Land intent');

  // Explicit selection remains an intentional inspection action and should
  // end the current flight after the background result has installed.
  await page.locator('#river-find').click();
  await waitFor(() => window.__atlas.river?.status === 'ready' && window.__atlas.travel.active === false);
  const afterExplicitSelection = await snapshot();
  assert.equal(afterExplicitSelection.travel.active, false, 'explicit river inspection still takes control of navigation');
  assert.equal(afterExplicitSelection.travel.surfaceJourney, false, 'explicit inspection clears the previous travel intent');
  assert.deepEqual(errors, [], 'browser has no page or console errors');

  report = {
    ok: true, base, bodyId, action,
    date: await page.evaluate(() => window.__atlas.date),
    renderer: await page.evaluate(() => {
      const gl = document.querySelector('canvas')?.getContext('webgl2');
      const ext = gl?.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable';
    }),
    beforeAction, heldTravel, afterBackgroundCompletion, afterExplicitSelection, errors,
  };
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report = { ...report, failure: String(error), state: await snapshot().catch(() => null) };
  await writeFile(`${out}/failure.json`, JSON.stringify(report, null, 2));
  await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  throw error;
} finally {
  await page.evaluate(() => window.__backgroundSurfaceGate?.release()).catch(() => {});
  await browser.close();
}
