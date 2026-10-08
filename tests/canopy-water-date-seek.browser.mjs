import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserArgs } from './browser-options.mjs';
import { acquireGpuLock, assertCaptureOutsideSlot } from './helpers/gpu-lock.mjs';
import { galaxies, refByAddress, system } from '../src/catalog.ts';
import { parseAddress } from '../src/address.ts';
import { CURRENT_VERSIONS, encodeVersions } from '../src/time-nav.ts';
import { starLifecycle, planetLifecycle } from '../src/stellar-evolution.ts';
import { planetSnapshotAt } from '../src/world-surface.ts';
import { datedLoweredSea } from './helpers/harness-water.mjs';

const seed = 'LETHRA-001';
const bodyId = 'G001/C2128,0,1/0/planet/1';
const systemId = 'G001/C2128,0,1/0';
const ref = refByAddress(galaxies(seed)[0], systemId);
const sys = system(ref);
const body = sys.planets[1];
const star = sys.stars[0];
const systemAddress = parseAddress(sys.ref.id);
const bodyAddress = value => ({ ...systemAddress, slot: value.id.slice(sys.ref.id.length + 1) });
const starLife = starLifecycle(seed, bodyAddress(star), star);
const planetLife = planetLifecycle(seed, bodyAddress(body), body, starLife);
assert.ok(planetLife.oceanNs !== null && planetLife.engulfedNs !== null);

// Two nearby dates on Maithea's dated ocean. Both retain a solid body, but
// their snapped global sea levels differ by exactly one 25 m bucket. Relief
// round P6: the old pair came from the linear metre ramp (-4500 / -4475 m);
// under surface-8 the dated sea is 0 at the catalogue epoch and falls by
// VOLUME afterwards, so the pair is now the first whole Maithea years after
// the catalogue date at the 60%-volume-lost harness sea and one bucket higher
// (tests/helpers/harness-water.mjs; -2425 / -2400 m on the relief seabed).
const CATALOGUE_DATE = 435084631200000032044300000n;
const YEAR_LIVING_NS = BigInt(Math.max(1, Math.round(2 * Math.PI / Math.sqrt(body.orbit.mu / body.orbit.a ** 3) * 1e9)));
const snapped = dateNs => Math.round(planetSnapshotAt(seed, body.id, body, planetLife, starLife, dateNs, CURRENT_VERSIONS).ocean.renderWaterLevelM / 25) * 25;
const SEA = datedLoweredSea(body, snapped, CATALOGUE_DATE, YEAR_LIVING_NS, starLife.giantNs);
assert.ok(SEA, 'a dated lowered sea exists before the giant phase');
const dates = [[SEA.lowM, SEA.dateLowNs], [SEA.highM, SEA.dateHighNs]].map(([levelM, dateNs]) => {
  const snapshot = planetSnapshotAt(seed, body.id, body, planetLife, starLife, dateNs, CURRENT_VERSIONS);
  const waterLevelM = Math.round(snapshot.ocean.renderWaterLevelM / 25) * 25;
  return { levelM, dateNs, waterLevelM, stage: snapshot.state.stage, oceanAvailable: snapshot.ocean.globalOceanAvailable };
});
assert.deepEqual(dates.map(d => d.waterLevelM), [SEA.lowM, SEA.highM]);
assert.ok(dates.every(d => d.stage === 'solid' && d.oceanAvailable));

const base = process.env.ATLAS_URL || 'http://127.0.0.1:5201/';
const out = process.env.ATLAS_RESULTS || 'test-results/canopy-water-date-seek-c02ee95';
const buildResponse = await fetch(new URL('build-info.json', base));
assert.ok(buildResponse.ok, 'served build stamp is available');
const buildInfo = await buildResponse.json();
const sourceCommit = buildInfo.commit;
if(process.env.ATLAS_SOURCE_COMMIT)assert.ok(sourceCommit.startsWith(process.env.ATLAS_SOURCE_COMMIT), 'served revision matches expected snapshot');
assert.equal(buildInfo.dirty, false, 'acceptance requires a clean published or preview artifact');
await mkdir(out, { recursive: true });
assertCaptureOutsideSlot('canopy-water-date-seek');
const lock = process.env.ATLAS_GPU_LOCK_HELD ? null
  : await acquireGpuLock({ owner: `canopy-water-date-seek ${base}`, capture: true });
let browser, page;
const errors = [];
const waitFor = (fn, arg, timeout = 180000) => page.waitForFunction(fn, arg, { timeout });
const query = new URLSearchParams({ seed, g: 'G001', system: systemId, body: bodyId,
  date: dates[0].dateNs.toString(), wv: encodeVersions(CURRENT_VERSIONS) });
const diagnostics = () => page.evaluate(() => {
  const a = window.__atlas, t = a?.terrain?.tiles, f = t?.forest, c = f?.fullCanopy;
  const travel = a?.travel;
  const target = travel?.bodies?.find(b => b.id === a?.state?.body?.id);
  const relative = target ? travel.position.map((v, i) => v - target.positionM[i]) : null;
  return {
    date: a?.date, bodyId: a?.state?.body?.id, level: a?.state?.level,
    lifeGate: a?.lifeGate,
    travel: travel ? { active: travel.active, domain: travel.domain, systemUnit: travel.systemUnit,
      terrainClearanceM: travel.surface?.terrainClearance, relativePositionM: relative, heading: travel.heading } : null,
    terrain: t ? { waterLevelM: t.waterLevelM, waterBucket: t.waterBucket,
      staleWaterPatches: t.staleWaterPatches, pending: t.pending, resident: t.resident,
      visible: t.visible, failures: t.failures, forest: f ? { waterBucket: f.waterBucket,
        pending: f.pending, cached: f.cached, candidateCells: f.candidateCells,
        selectionPending: f.selectionPending, farOwnedSkipped: f.farOwnedSkipped,
        fullCanopy: c } : null } : null,
  };
});
const waitSettled = async target => waitFor(({ dateNs, waterLevelM }) => {
  const a = window.__atlas, t = a?.terrain?.tiles, f = t?.forest, c = f?.fullCanopy;
  return a?.state?.body?.id === 'G001/C2128,0,1/0/planet/1' && a?.date?.offsetNs === dateNs &&
    t?.waterLevelM === waterLevelM && t?.waterBucket === Math.round(waterLevelM / 25) &&
    t?.staleWaterPatches === 0 && t?.pending === 0 && f?.waterBucket === waterLevelM && f?.pending === 0 &&
    c?.ready && !c.reusePending && !c.selectionApplyPending && !c.selectionPending &&
    c.queuedPatches === 0 && c.jobsInFlight === 0 && c.failures === 0 && c.capacityMisses === 0 &&
    c.nearPresentNotInCensus === 0 && c.nearAbsentInCensus === 0;
}, target, 30000);

const report = { ok: false, base, bodyId, sourceCommit, buildInfo,
  waterTargets: dates.map(d => ({ levelM: d.levelM, dateNs: d.dateNs.toString(), waterLevelM: d.waterLevelM,
    stage: d.stage, oceanAvailable: d.oceanAvailable })), errors, phases: [] };
try {
  browser = await chromium.launch({ headless: true, args: browserArgs });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => errors.push(`page: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().startsWith('[vite] failed to connect to websocket.')) errors.push(`console: ${message.text()}`);
  });
  if (typeof page.routeWebSocket === 'function') await page.routeWebSocket('**/*', socket => socket.close());
  await page.goto(`${base}?${query}`, { waitUntil: 'domcontentloaded' });
  await waitFor(id => window.__atlas?.ready && window.__atlas.state.level === 'body' &&
    window.__atlas.state.body?.id === id && !window.__atlas.camera.animating, bodyId);
  await page.locator('#find-life').click();
  await waitFor(() => window.__atlas.travel.terrainCruise !== null, undefined);
  await page.keyboard.down('q');
  await waitFor(() => window.__atlas.travel.surface?.terrainClearance < 100, undefined, 180000);
  await page.keyboard.up('q');
  await page.evaluate(() => window.__atlas.setExplorationPaused(true));
  await waitFor(() => {
    const t = window.__atlas.terrain?.tiles, f = t?.forest, c = f?.fullCanopy;
    return f?.visible > 200 && c?.trees > 100000 && c.ready && !c.reusePending &&
      !c.selectionApplyPending && !c.selectionPending && c.queuedPatches === 0 && c.jobsInFlight === 0;
  }, undefined, 240000);
  await page.waitForTimeout(1000);
  const baseline = await diagnostics();
  assert.equal(baseline.terrain.waterLevelM, dates[0].waterLevelM);
  assert.equal(baseline.terrain.forest.waterBucket, dates[0].waterLevelM);
  assert.equal(baseline.lifeGate?.faunaStage === undefined, false, 'life gate exists for the settled body date');
  await page.screenshot({ path: `${out}/water-low-${-SEA.lowM}m.png` });
  report.phases.push({ label: `baseline-low-${-SEA.lowM}m`, state: baseline });

  const identity = baseline.terrain.forest.fullCanopy.family;
  const initialGeneration = baseline.terrain.forest.fullCanopy.generation;
  const baselineRelative = baseline.travel.relativePositionM;
  for (const target of [dates[1], dates[0]]) {
    await page.evaluate(dateNs => { window.__atlas.setExplorationPaused(true); window.__atlas.seek(dateNs); }, target.dateNs.toString());
    await waitSettled({ dateNs: target.dateNs.toString(), waterLevelM: target.waterLevelM });
    await page.waitForTimeout(500);
    const state = await diagnostics();
    assert.equal(state.level, 'body');
    assert.equal(state.bodyId, bodyId);
    assert.equal(state.lifeGate?.faunaStage === undefined, false);
    assert.equal(state.terrain.forest.fullCanopy.family, identity, 'canonical tree family is stable across dated water updates');
    assert.ok(state.terrain.forest.fullCanopy.generation > initialGeneration, 'water changes reconfigure the worker context');
    // Relief round (terrain-1.8.0-relief, P4-RELIEF r2): a land sample's climate
    // and classifier gates depend continuously on the sea datum, so terrain.ts
    // pins every land-touching forest patch's water-validity interval to the
    // exact water level. Cross-bucket reuse is therefore no longer expected
    // (before relief this asserted reusedPatches > 0). The count is recorded,
    // not asserted; the rebuilt canopy is still checked against the census below.
    report.reuse ??= { contract: 'terrain-1.8.0-relief pins land-patch water validity to the exact level (src/terrain.ts terrainSampler observer); cross-bucket reuse not expected', reusedPatches: [] };
    report.reuse.reusedPatches.push(state.terrain.forest.fullCanopy.reusedPatches);
    assert.deepEqual(state.travel.relativePositionM.map((v, i) => v - baselineRelative[i]).map(Math.abs).map(v => Math.round(v * 1000) / 1000), [0, 0, 0], 'date seek preserves the observer pose relative to the body');
    assert.equal(state.terrain.staleWaterPatches, 0);
    assert.equal(state.terrain.pending, 0);
    await page.screenshot({ path: `${out}/water-${target.levelM}m-${report.phases.length}.png` });
    report.phases.push({ label: `water-${target.levelM}m`, state });
  }
  report.renderer = await page.evaluate(() => {
    const gl = document.querySelector('canvas')?.getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable';
  });
  report.errors = errors;
  report.ok = errors.length === 0 && report.phases.length === 3 &&
    report.phases.every(p => p.state.terrain.staleWaterPatches === 0 && p.state.terrain.forest.fullCanopy.nearPresentNotInCensus === 0 && p.state.terrain.forest.fullCanopy.nearAbsentInCensus === 0);
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  assert.deepEqual(errors, []);
  const summary = { ...report, phases: report.phases.map(p => ({ label: p.label, date: p.state.date,
    waterLevelM: p.state.terrain.waterLevelM, canopy: p.state.terrain.forest.fullCanopy,
    forest: { candidateCells: p.state.terrain.forest.candidateCells, cached: p.state.terrain.forest.cached,
      pending: p.state.terrain.forest.pending, farOwnedSkipped: p.state.terrain.forest.farOwnedSkipped },
    staleWaterPatches: p.state.terrain.staleWaterPatches, terrainPending: p.state.terrain.pending,
    terrainResident: p.state.terrain.resident, lifeGate: p.state.lifeGate })) };
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  report.ok = false; report.failure = String(error); report.errors = errors;
  report.current = page ? await diagnostics().catch(() => null) : null;
  await writeFile(`${out}/failure.json`, JSON.stringify(report, null, 2));
  await page?.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  throw error;
} finally {
  await page?.keyboard.up('q').catch(() => {});
  await browser?.close().catch(() => {});
  await lock?.release();
}
