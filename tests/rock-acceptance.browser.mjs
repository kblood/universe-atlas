/** Browser acceptance for ordinary surface rocks (desktop, WebGL2).
 *
 * Scenarios (all LETHRA-001, system G001/C2128,0,1/0, catalogue date):
 * - barren: airless moon Kelelsara (planet/1/moon/0): wide low-flight view,
 *   rock work while stationary and while flying, then a few-metre walking
 *   close-up of a canonical boulder, work while walking, and a dry date seek
 *   (+1 year and back) that must leave the census and drawn set unchanged.
 * - living: Maithea (planet/1) living habitat from "Find life": the same
 *   wide/close/work checks, then an exact-date replay across two water dates
 *   (whole years after the catalogue date; relief round P6) whose snapped sea
 *   levels differ by one 25 m bucket (rocks are re-resolved; inland content is
 *   identical; the replayed date is identical).
 * - shore: a deterministic coastal site on Maithea (tests/rock-shore-site.mjs)
 *   on the lowered (60%-volume-lost) dated sea, opened at the low water date and
 *   viewed from observation hover. At the low sea level rocks exist in the band
 *   that the higher sea level floods; after the seek they are absent; the
 *   exact-date replay restores the identical census and drawn set.
 *
 * Every drawn rock is also probed against the drawn terrain (floating or
 * buried) and against the canonical ocean/shore gate. Timings are the page's
 * performance.now() and are only as fine as the browser's timer resolution.
 * Rocks are visual only (no collision); the report records that note. */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import * as THREE from 'three';
import { browserArgs } from './browser-options.mjs';
import { encodeVersions, CURRENT_VERSIONS } from '../src/time-nav.ts';
import { galaxies, refByAddress, system, bodyPosition } from '../src/catalog.ts';
import { parseAddress } from '../src/address.ts';
import { starLifecycle, planetLifecycle } from '../src/stellar-evolution.ts';
import { planetSnapshotAt } from '../src/world-surface.ts';
import { findShoreSite } from './rock-shore-site.mjs';
import { HARNESS_SEED, HARNESS_SYSTEM_ID, HARNESS_DATE, SITE_A_M } from './harness-sites.mjs';
import { datedLoweredSea } from './helpers/harness-water.mjs';

const base = process.env.ATLAS_URL || 'http://127.0.0.1:5193/';
const out = process.env.ATLAS_RESULTS || 'test-results/opus55-rocks';
const scenarios = (process.env.ROCK_SCENARIOS || 'barren,living,shore').split(',');
const seed = HARNESS_SEED, systemId = HARNESS_SYSTEM_ID;
const DATE = HARNESS_DATE;
const YEAR_NS = 31_557_600_000_000_000n;
const sys = system(refByAddress(galaxies(seed)[0], systemId));
const living = sys.planets[1], barren = sys.moons.find(m => m.id === `${systemId}/planet/1/moon/0`);
const star = sys.stars[0], systemAddress = parseAddress(sys.ref.id);
const bodyAddress = value => ({ ...systemAddress, slot: value.id.slice(sys.ref.id.length + 1) });
const starLife = starLifecycle(seed, bodyAddress(star), star);
const livingLife = planetLifecycle(seed, bodyAddress(living), living, starLife);
const snappedLevel = dateNs => Math.round(planetSnapshotAt(seed, living.id, living, livingLife, starLife, dateNs, CURRENT_VERSIONS).ocean.renderWaterLevelM / 25) * 25;
// Relief round P6 (surface-8 ocean volume): the dated sea is exactly 0 at the
// catalogue date and only falls after it, so the old pair (catalogue date at
// -4500 m, whole years before it at -4475 m on the linear metre ramp) no
// longer lowers the sea. The water dates are now whole Maithea years AFTER the
// catalogue date (same orbital phase, so the same sun direction and lighting)
// whose dated seas are the 60%-volume-lost harness level and one 25 m bucket
// higher (tests/helpers/harness-water.mjs; Maithea -2425 / -2400 m). Barren and
// living surveys stay at the catalogue date.
const YEAR_LIVING_NS = BigInt(Math.max(1, Math.round(2 * Math.PI / Math.sqrt(living.orbit.mu / living.orbit.a ** 3) * 1e9)));
const SEA = datedLoweredSea(living, snappedLevel, DATE, YEAR_LIVING_NS, starLife.giantNs);
assert.ok(SEA, 'a dated lowered sea exists before the giant phase');
const DATE_LOW = SEA.dateLowNs, DATE_HIGH = SEA.dateHighNs;
const sunFrom = t => { const s = bodyPosition(star, sys, t), b = bodyPosition(living, sys, t), d = s.map((v, i) => v - b[i]), l = Math.hypot(...d); return d.map(v => v / l); };
const sunAngleOf = t => Math.acos(Math.min(1, sunFrom(DATE).reduce((a, v, i) => a + v * sunFrom(t)[i], 0)));
const sunAngle = Math.max(sunAngleOf(DATE_LOW), sunAngleOf(DATE_HIGH));
assert.ok(sunAngle < 1e-6, `water dates have the catalogue date's sun direction (${sunAngle} rad)`);
const LEVEL_LOW = snappedLevel(DATE_LOW), LEVEL_HIGH = snappedLevel(DATE_HIGH);
assert.equal(snappedLevel(DATE), 0, 'catalogue-date sea level is the full ocean');
assert.equal(LEVEL_LOW, SEA.lowM, 'low water date is at the 60%-volume-lost harness sea');
assert.equal(LEVEL_HIGH, LEVEL_LOW + 25, 'high water date is one bucket higher');

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: browserArgs });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(`page: ${error.message}`));
page.on('console', message => {
  if (message.type() === 'error' && !message.text().startsWith('[vite] failed to connect to websocket.')) errors.push(`console: ${message.text()}`);
});
if (typeof page.routeWebSocket === 'function') await page.routeWebSocket('**/*', socket => socket.close());
const waitFor = (fn, arg, timeout = 180000) => page.waitForFunction(fn, arg, { timeout });
const report = { ok: false, base, date: DATE.toString(), dateLow: DATE_LOW.toString(), dateHigh: DATE_HIGH.toString(), levels: { low: LEVEL_LOW, high: LEVEL_HIGH, lossFraction: SEA.lossFraction },
  livingYearNs: YEAR_LIVING_NS.toString(), comparisonSunAngleRad: sunAngle,
  hardware: !!process.env.ATLAS_HARDWARE, contention: process.env.ROCK_CONTENTION || 'shared GPU: other headless browsers were running; timings are contended',
  errors, scenarios: {} };
const save = () => writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));

const urlFor = (body, extra = {}) => `${base}?${new URLSearchParams({ seed, g: 'G001', system: systemId, body: body.id,
  date: (extra.date ?? DATE).toString(), wv: encodeVersions(CURRENT_VERSIONS), ...(extra.walk ? { walk: extra.walk, heading: extra.heading } : {}) })}`;
async function openBody(body, extra) {
  await page.goto(urlFor(body, extra), { waitUntil: 'networkidle' });
  await waitFor(id => window.__atlas?.ready && window.__atlas.state.level === 'body' && window.__atlas.state.body?.id === id &&
    window.__atlas.terrain?.tiles?.ready, body.id);
}
const rocks = () => page.evaluate(() => window.__atlas.terrain?.tiles?.rocks ?? null);
/** Rocks resolved and published for a fixed view: no pending cells, no job. */
const settleRocks = (timeout = 120000) => waitFor(() => {
  const r = window.__atlas.terrain?.tiles?.rocks;
  return r && r.enabled && r.work.process.pendingCells === 0 && !r.work.draw.pending && !r.work.draw.stale &&
    r.tiers.every(t => t.pending === 0);
}, null, timeout);
async function capture(name) {
  await page.evaluate(() => document.querySelectorAll('[data-rock-hide]').forEach(e => e.remove()));
  await page.evaluate(() => { const s = document.createElement('style'); s.dataset.rockHide = '1';
    s.textContent = 'body *:not(canvas){visibility:hidden !important} canvas{visibility:visible !important}'; document.head.append(s); });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${out}/${name}.png` });
  await page.evaluate(() => document.querySelectorAll('[data-rock-hide]').forEach(e => e.remove()));
  return `${out}/${name}.png`;
}
async function pitch(pixels) {
  await page.mouse.move(720, 420); await page.mouse.down();
  await page.mouse.move(720, 420 + pixels, { steps: 12 }); await page.mouse.up();
}
/** Observer pose relative to the current body centre (bodies move with the date). */
const pose = () => page.evaluate(() => {
  const a = window.__atlas, t = a.travel, b = t.bodies.find(x => x.id === a.state.body.id);
  return { position: t.position.map((v, i) => v - b.positionM[i]), heading: t.heading,
    clearanceM: t.surface?.terrainClearance, walking: !!t.walking?.grounded };
});
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
/** Rock CPU work over a wall-clock window. `drive` holds a key (or null). */
async function workWindow(label, ms, drive = null) {
  const before = await pose();
  await page.evaluate(() => { window.__atlas.resetRockWork(); window.__atlas.setProfiling(true); window.__atlas.resetProfile(); });
  if (drive) await page.keyboard.down(drive);
  await page.waitForTimeout(ms);
  if (drive) await page.keyboard.up(drive);
  const [work, profile, diag] = await Promise.all([page.evaluate(() => window.__atlas.rockWork()),
    page.evaluate(() => window.__atlas.renderProfile.statistics), rocks()]);
  await page.evaluate(() => window.__atlas.setProfiling(false));
  const after = await pose();
  return { label, windowMs: ms, drive, movedM: distance(before.position, after.position), work,
    context: { frameIntervalMs: profile.frameIntervalMs, frameWorkMs: profile['cpu/frameWorkMs'], planetUpdateMs: profile['cpu/planetUpdateMs'] },
    drawnAtEnd: diag.drawn, publishedAgeFrames: diag.work.draw.publishedAgeFrames, maxJobFrames: diag.work.draw.maxJobFrames };
}
/** Probe summary: floating/buried against the drawn terrain, wet/ocean gate. */
async function probe(limit = 600) {
  const p = await page.evaluate(n => window.__atlas.rockProbe(n), limit);
  const rs = p.rocks, measured = rs.filter(r => r.renderedGroundM !== null);
  const gaps = measured.map(r => r.maxBaseGapM), deltas = measured.map(r => Math.abs(r.canonicalDeltaM));
  const q = (values, f) => { const s = [...values].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(f * s.length))] : null; };
  // Pixels per radian at the view's vertical focal length. A base gap counts
  // when it exceeds 2 cm and 4% of the rock height. It fails the test when it
  // subtends at least one pixel; gaps of 0.5-1 px are reported as `marginal`
  // (a known far-LOD case, see docs/rock-acceptance-2026-09-28.md) and
  // smaller ones as `subPixel`.
  const focalPx = await page.evaluate(() => innerHeight / (2 * Math.tan(window.__atlas.camera.fov * Math.PI / 360)));
  const gapPx = r => r.maxBaseGapM / Math.max(r.distanceM, .1) * focalPx;
  const metricFloating = measured.filter(r => r.maxBaseGapM > Math.max(.02, .04 * r.heightM));
  const floating = metricFloating.filter(r => gapPx(r) >= 1);
  const marginal = metricFloating.filter(r => gapPx(r) >= .5 && gapPx(r) < 1);
  const buried = measured.filter(r => r.minTopClearanceM < .25 * r.heightM);
  const byTier = {}, byLod = [0, 0, 0], forms = {};
  for (const r of rs) { byTier[r.tier] = (byTier[r.tier] || 0) + 1; byLod[r.lod]++; forms[r.form] = (forms[r.form] || 0) + 1; }
  return { waterLevelM: p.waterLevelM, bodyWater: p.bodyWater, probed: rs.length, measured: measured.length, byTier, byLod, forms,
    diameterM: { min: q(rs.map(r => r.diameterM), 0), p50: q(rs.map(r => r.diameterM), .5), max: q(rs.map(r => r.diameterM), 1) },
    nearestM: rs[0]?.distanceM ?? null, farthestM: rs[rs.length - 1]?.distanceM ?? null,
    drawnVsCanonicalGroundM: { p50: q(deltas, .5), p95: q(deltas, .95), max: q(deltas, 1) },
    baseGapM: { p50: q(gaps, .5), p95: q(gaps, .95), max: q(gaps, 1) },
    focalPx, floating: floating.length, floatingExamples: floating.slice(0, 5).map(r => ({ id: r.id, lod: r.lod, distanceM: r.distanceM, gapM: r.maxBaseGapM, gapPx: gapPx(r), heightM: r.heightM, tileLevel: r.tileLevel })),
    marginalFloating: marginal.length,
    marginalFloatingExamples: marginal.slice(0, 5).map(r => ({ id: r.id.split('|').slice(-3).join('|'), lod: r.lod, distanceM: r.distanceM, gapM: r.maxBaseGapM, gapPx: gapPx(r), heightM: r.heightM, tileLevel: r.tileLevel, canonicalDeltaM: r.canonicalDeltaM })),
    subPixelFloating: metricFloating.length - floating.length - marginal.length,
    subPixelFloatingExamples: metricFloating.filter(r => gapPx(r) < .5).slice(0, 5).map(r => ({ id: r.id.split('|').slice(-3).join('|'), lod: r.lod, distanceM: r.distanceM, gapM: r.maxBaseGapM, gapPx: gapPx(r), heightM: r.heightM, tileLevel: r.tileLevel, canonicalDeltaM: r.canonicalDeltaM })),
    buried: buried.length, buriedExamples: buried.slice(0, 5).map(r => ({ id: r.id, topClearanceM: r.minTopClearanceM, heightM: r.heightM, tileLevel: r.tileLevel })),
    onOcean: rs.filter(r => r.ocean).length, onWet: rs.filter(r => r.wet).length,
    minAboveWaterM: p.bodyWater > 0 ? Math.min(...rs.map(r => r.aboveWaterM)) : null,
    tileLevels: [...new Set(measured.map(r => r.tileLevel))].sort((a, b) => a - b), raw: rs };
}
const brief = p => { const { raw, ...rest } = p; return rest; };
const census = () => page.evaluate(() => window.__atlas.rockCensus());
const published = () => page.evaluate(() => window.__atlas.rockPublished());
async function seekAndSettle(dateNs, level) {
  await page.evaluate(value => window.__atlas.seek(value), dateNs.toString());
  const seekStart = Date.now();
  // The first frames after a seek on a wet body show residents cleared.
  const immediately = await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => {
    const r = window.__atlas.terrain.tiles.rocks; resolve({ residentRocks: r.bytes.residentRocks, resident: r.tiers.map(t => t.resident), drawn: r.drawn.total });
  }))));
  await waitFor(({ value, lvl }) => window.__atlas.date.offsetNs === value && (lvl === null || window.__atlas.terrain?.tiles?.waterLevelM === lvl) &&
    window.__atlas.terrain.tiles.pending === 0, { value: dateNs.toString(), lvl: level ?? null });
  await settleRocks();
  await page.waitForTimeout(600);
  await settleRocks();
  return { immediately, settleMs: Date.now() - seekStart };
}

/** Wide low-flight view, work windows, then a close walking view of a boulder. */
async function surveyBody(name, body, button) {
  const result = { body: body.id, type: body.type, water: body.water };
  report.scenarios[name] = result;
  await openBody(body);
  await page.waitForTimeout(800);
  await page.locator(button).click();
  await waitFor(() => window.__atlas.travel.terrainCruise !== null && window.__atlas.terrain?.tiles?.surfaceReady);
  await page.keyboard.down('q');
  await waitFor(() => window.__atlas.travel.surface?.terrainClearance < 120);
  await page.keyboard.up('q');
  await page.evaluate(() => window.__atlas.setExplorationPaused(true));
  await page.waitForTimeout(1500);
  await settleRocks();
  await pitch(130);
  await page.waitForTimeout(1200);
  await settleRocks();
  await page.waitForTimeout(800);
  const wideDiag = await rocks(), wideProbe = await probe(), widePose = await pose();
  result.wide = { pose: widePose, capture: await capture(`${name}-wide`), diagnostics: wideDiag, probe: brief(wideProbe), census: await census() };
  result.wideStationary = await workWindow('wide stationary', 5000);
  result.wideFlying = await workWindow('wide flying forward (W)', 5000, 'w');
  await page.waitForTimeout(300);
  await settleRocks();
  result.afterFlight = { pose: await pose(), capture: await capture(`${name}-wide-after-flight`), drawn: (await rocks()).drawn };
  // Close target: the nearest drawn boulder or outcrop of 0.7-2.6 m from the wide view.
  const target = wideProbe.raw.filter(r => r.tier !== 'scatter' && r.diameterM >= .7 && r.diameterM <= 2.6 && !r.ocean)[0];
  assert.ok(target, `${name}: a drawn boulder is available for the close view`);
  const radiusM = await page.evaluate(() => window.__atlas.state.body.radiusM);
  const up = new THREE.Vector3(...target.direction), rockAt = up.clone().multiplyScalar(radiusM + target.groundHeightM);
  const ref = Math.abs(up.y) > .92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3().crossVectors(ref, up).normalize();
  const standoffM = 3.2 + target.widthM * .6;
  const eye = rockAt.clone().addScaledVector(tangent, standoffM).addScaledVector(up, 1.6);
  const heading = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye, rockAt, up));
  await openBody(body, { walk: eye.toArray().join(','), heading: heading.toArray().join(',') });
  await waitFor(() => window.__atlas.travel.walking?.grounded);
  await page.evaluate(() => window.__atlas.setExplorationPaused(true));
  await waitFor(id => (window.__atlas.rockPublished() || []).some(s => s.startsWith(id + '@')), target.id);
  await settleRocks();
  // Walker faces the rock horizontally; look down at its middle.
  const eyeAboveMid = 1.6 - (target.heightM * .5 - target.sinkM);
  await pitch(Math.round(Math.atan2(eyeAboveMid, standoffM) / .003));
  await page.waitForTimeout(1000);
  await settleRocks();
  await page.waitForTimeout(600);
  const closeProbe = await probe();
  const closeTarget = closeProbe.raw.find(r => r.id === target.id);
  result.close = { target: { ...closeTarget, standoffM }, pose: await pose(), capture: await capture(`${name}-close`),
    diagnostics: await rocks(), probe: brief(closeProbe), nearest: closeProbe.raw.slice(0, 12).map(r => ({ id: r.id.split('|').slice(-3).join('|'), tier: r.tier, form: r.form, lod: r.lod,
      distanceM: +r.distanceM.toFixed(2), diameterM: +r.diameterM.toFixed(3), heightM: +r.heightM.toFixed(3), sinkM: +r.sinkM.toFixed(3), baseGapM: +r.maxBaseGapM.toFixed(3) })) };
  // A few-metre overview with the same pose, lower pitch, for distribution.
  result.closeStationary = await workWindow('close walking stationary', 5000);
  result.closeWalking = await workWindow('close walking forward (W)', 5000, 'w');
  await settleRocks();
  result.closeAfterWalk = { capture: await capture(`${name}-close-after-walk`), drawn: (await rocks()).drawn };
  return result;
}

/** Exact-date replay from observation hover: A -> B -> A with an identical pose. */
async function replay(name, dates, levels) {
  const result = { dates: dates.map(String), levels };
  // A same-date seek lifts a grounded observer into the observation hover; the
  // pose then stays fixed (relative to the body) across the following seeks.
  // The resident census is the wanted neighbourhood around the last rescatter
  // focus, so it depends on where the tiers were last refreshed (a cache
  // window), not only on the date. A warm-up cycle A -> B -> A from the hover
  // makes the compared A windows both come from the same hover focus.
  const warm = [await seekAndSettle(dates[0], levels[0]), await seekAndSettle(dates[1], levels[1])];
  const toHover = await seekAndSettle(dates[0], levels[0]);
  result.warmUp = warm;
  const at = async label => { const d = await rocks();
    return { label, pose: await pose(), census: await census(), published: await published(), probe: brief(await probe()),
      rocks: { drawn: d.drawn, cameraCulled: d.cameraCulled, shadowOnly: d.shadowOnly, nearUnculled: d.nearUnculled, reason: d.reason, bytesTotal: d.bytes.total },
      // Terrain water freshness is recorded, not asserted: see the receipt doc
      // (stale-bucket rebuilds can starve under terrain byte pressure).
      terrain: await page.evaluate(() => { const t = window.__atlas.terrain.tiles;
        return { waterLevelM: t.waterLevelM, staleWaterPatches: t.staleWaterPatches, visible: t.visible, resident: t.resident, pending: t.pending,
          terrainResidentBytes: t.terrainResidentBytes, accountedBytes: t.accountedBytes,
          reservedCombinedBytes: t.reservedCombinedBytes, rockReserveBytes: t.rockReserveBytes }; }),
      capture: await capture(`${name}-${label}`) }; };
  const a = await at('date-a'); a.seek = toHover;
  const seekB = await seekAndSettle(dates[1], levels[1]);
  const b = await at('date-b'); b.seek = seekB;
  const seekA = await seekAndSettle(dates[0], levels[0]);
  const a2 = await at('date-a-replay'); a2.seek = seekA;
  const summary = x => ({ label: x.label, seek: x.seek, poseRelative: x.pose, census: x.census, publishedCount: x.published.length, rocks: x.rocks, terrain: x.terrain, probe: x.probe, capture: x.capture });
  const ids = x => new Set(x.published.map(v => v.slice(0, v.lastIndexOf('@'))));
  const setA = ids(a), setB = ids(b);
  result.publishedOnlyA = [...setA].filter(v => !setB.has(v)).length;
  result.publishedOnlyB = [...setB].filter(v => !setA.has(v)).length;
  Object.assign(result, { a: summary(a), b: summary(b), replay: summary(a2),
    poseStableM: Math.max(distance(a.pose.position, b.pose.position), distance(a.pose.position, a2.pose.position)),
    replayCensusIdentical: JSON.stringify(a.census) === JSON.stringify(a2.census),
    replayPublishedIdentical: JSON.stringify(a.published) === JSON.stringify(a2.published),
    bCensusIdenticalToA: JSON.stringify(a.census.tiers) === JSON.stringify(b.census.tiers),
    bPublishedIdenticalToA: JSON.stringify(a.published) === JSON.stringify(b.published) });
  return { result, a, b, a2 };
}

try {
  report.timer = await (async () => { await page.goto(base); return page.evaluate(() => ({ crossOriginIsolated: self.crossOriginIsolated,
    resolutionMs: (() => { let min = Infinity, last = performance.now(); for (let i = 0; i < 200000; i++) { const t = performance.now(); if (t > last) { min = Math.min(min, t - last); last = t; } } return min; })() })); })();
  report.renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2'), ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable';
  });
  report.buildInfo = await fetch(new URL('build-info.json', base)).then(r => r.ok ? r.json() : null).catch(() => null);

  if (scenarios.includes('barren')) {
    const r = await surveyBody('barren', barren, '#terrain-flight');
    // Dry body: rocks do not depend on the dated sea level, so a date seek and
    // its replay keep the census and the drawn set.
    const { result } = await replay('barren', [DATE + YEAR_NS, DATE], [null, null]);
    r.dateSeek = result;
    await save();
  }
  if (scenarios.includes('living')) {
    const r = await surveyBody('living', living, '#find-life');
    const { result } = await replay('living', [DATE_LOW, DATE_HIGH], [LEVEL_LOW, LEVEL_HIGH]);
    r.dateSeek = result;
    await save();
  }
  if (scenarios.includes('shore')) {
    // Search from the living close-view site (body-relative), or its recorded value.
    const start = report.scenarios.living?.close?.pose?.position ?? [...SITE_A_M];
    const site = findShoreSite(living, start, { lowLevelM: LEVEL_LOW, highLevelM: LEVEL_HIGH });
    assert.ok(site, 'a deterministic coastal site exists');
    const r = { body: living.id, site };
    report.scenarios.shore = r;
    const up = new THREE.Vector3(...site.observer), eye = up.clone().multiplyScalar(living.radiusM + site.observerGroundHeightM + 1.6);
    const toward = new THREE.Vector3(...site.facing).multiplyScalar(living.radiusM + LEVEL_LOW);
    const heading = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye, toward, up));
    await openBody(living, { date: DATE_LOW, walk: eye.toArray().join(','), heading: heading.toArray().join(',') });
    await waitFor(() => window.__atlas.travel.walking?.grounded);
    await page.evaluate(() => window.__atlas.setExplorationPaused(true));
    await settleRocks();
    r.grounded = { pose: await pose(), capture: await capture('shore-grounded'), probe: brief(await probe()) };
    // Waterline stand at the low sea level: rocks reach the shore but never stand in the sea.
    {
      const wUp = new THREE.Vector3(...site.waterline), wEye = wUp.clone().multiplyScalar(living.radiusM + site.waterlineGroundHeightM + 1.6);
      // Look along the shoreline (sea on one side, beach on the other), 30 degrees landward.
      const seaward = toward.clone().sub(wEye).projectOnPlane(wUp).normalize(), along = new THREE.Vector3().crossVectors(wUp, seaward);
      const look = wEye.clone().addScaledVector(along.multiplyScalar(Math.cos(Math.PI / 6)), 100).addScaledVector(seaward, -100 * Math.sin(Math.PI / 6));
      const wHeading = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(wEye, look, wUp));
      await openBody(living, { date: DATE_LOW, walk: wEye.toArray().join(','), heading: wHeading.toArray().join(',') });
      await waitFor(() => window.__atlas.travel.walking?.grounded);
      await page.evaluate(() => window.__atlas.setExplorationPaused(true));
      await settleRocks();
      await pitch(60);
      await page.waitForTimeout(800);
      await settleRocks();
      const p = await probe();
      r.waterline = { pose: await pose(), capture: await capture('shore-waterline'), probe: brief(p),
        within3mOfWater: p.raw.filter(q => q.aboveWaterM < 3).length,
        lowest: [...p.raw].sort((x, y) => x.aboveWaterM - y.aboveWaterM).slice(0, 5).map(q => ({ id: q.id.split('|').slice(-3).join('|'), tier: q.tier, aboveWaterM: q.aboveWaterM, distanceM: q.distanceM, ocean: q.ocean, wet: q.wet })) };
      await openBody(living, { date: DATE_LOW, walk: eye.toArray().join(','), heading: heading.toArray().join(',') });
      await waitFor(() => window.__atlas.travel.walking?.grounded);
      await page.evaluate(() => window.__atlas.setExplorationPaused(true));
      await settleRocks();
    }
    // Hover 160 m above the site (same-date seek), looking down the slope to the sea.
    await seekAndSettle(DATE_LOW, LEVEL_LOW);
    await pitch(120);
    await page.waitForTimeout(800);
    await settleRocks();
    const { result, a2 } = await replay('shore', [DATE_LOW, DATE_HIGH], [LEVEL_LOW, LEVEL_HIGH]);
    // Drawn rocks standing in the band the higher sea floods, re-probed per date.
    const inBand = rs => rs.filter(q => q.groundHeightM < LEVEL_HIGH + .3);
    await seekAndSettle(DATE_HIGH, LEVEL_HIGH);
    const pb = await probe();
    await seekAndSettle(DATE_LOW, LEVEL_LOW);
    const pa = await probe();
    result.bandRocks = { note: `drawn rocks with ground below ${LEVEL_HIGH + .3} m (flooded at the higher sea level)`,
      atA: inBand(pa.raw).length, atB: inBand(pb.raw).length, minAboveWaterA: pa.minAboveWaterM, minAboveWaterB: pb.minAboveWaterM,
      bandExamplesA: inBand(pa.raw).slice(0, 6).map(q => ({ id: q.id, tier: q.tier, groundHeightM: q.groundHeightM, aboveWaterM: q.aboveWaterM, distanceM: q.distanceM })),
      probedA: pa.probed, probedB: pb.probed,
      finalPublishedIdenticalToReplay: JSON.stringify(await published()) === JSON.stringify(a2.published) };
    r.dateSeek = result;
    await save();
  }

  // ---- assertions -------------------------------------------------------
  for (const name of ['barren', 'living']) {
    const s = report.scenarios[name]; if (!s) continue;
    assert.equal(s.wide.diagnostics.enabled, true, `${name}: rocks enabled`);
    assert.ok(s.wide.diagnostics.drawn.total > 0, `${name}: rocks drawn in the wide view`);
    assert.ok(s.close.diagnostics.drawn.lod0 > 0, `${name}: LOD0 rocks drawn in the close view`);
    assert.equal(s.close.target?.lod, 0, `${name}: close target drawn at LOD0`);
    for (const view of [s.wide.probe, s.close.probe]) {
      assert.equal(view.floating, 0, `${name}: no drawn rock floats above the drawn terrain (${JSON.stringify(view.floatingExamples)})`);
      assert.equal(view.buried, 0, `${name}: no drawn rock is buried (${JSON.stringify(view.buriedExamples)})`);
      assert.equal(view.onOcean + view.onWet, 0, `${name}: no drawn rock on ocean or wet ground`);
    }
    for (const w of [s.wideStationary, s.closeStationary])
      assert.equal(w.work.drawUnits.p95, 0, `${name}: a stationary view does no rock draw traversal (${w.label})`);
    const d = s.dateSeek;
    assert.ok(d.poseStableM < .01, `${name}: pose fixed across seeks (${d.poseStableM} m)`);
    assert.ok(d.replayCensusIdentical, `${name}: exact-date replay census identical`);
    assert.ok(d.replayPublishedIdentical, `${name}: exact-date replay drawn set identical`);
  }
  if (report.scenarios.barren) {
    const d = report.scenarios.barren.dateSeek;
    // Canonical rocks are date-independent on a dry body. The drawn set is
    // view-dependent: the dated sun moves the shadow-caster selection.
    assert.ok(d.bCensusIdenticalToA, 'barren: canonical rock census independent of date on a dry body');
    assert.ok(d.b.seek.immediately.residentRocks > 0, 'barren: a date seek keeps rock residents (dry signature)');
  }
  if (report.scenarios.living) {
    const d = report.scenarios.living.dateSeek;
    // Residents are cleared on the bucket change and re-resolved over frames:
    // two frames after the seek only a small fraction of the wanted cells exist.
    const early = d.b.seek.immediately.resident.reduce((x, y) => x + y, 0), wanted = d.b.census.tiers.reduce((x, t) => x + t.wantedCells, 0);
    assert.ok(early < .25 * wanted, `living: a sea-level bucket change clears rock residents (${early} of ${wanted} cells two frames later)`);
    assert.ok(d.bCensusIdenticalToA, 'living: inland rocks far above both sea levels are unchanged by the sea-level change');
  }
  if (report.scenarios.shore) {
    const d = report.scenarios.shore.dateSeek;
    assert.ok(d.bandRocks.atA > 0, `shore: rocks exist in the band at the low sea level (${d.bandRocks.atA})`);
    assert.equal(d.bandRocks.atB, 0, 'shore: no rocks in the flooded band at the high sea level');
    assert.ok(d.bandRocks.minAboveWaterA >= .3 && d.bandRocks.minAboveWaterB >= .3, 'shore: every drawn rock is >= 0.3 m above the dated sea');
    assert.ok(d.replayCensusIdentical && d.replayPublishedIdentical, 'shore: exact-date replay identical');
    assert.ok(!d.bCensusIdenticalToA, 'shore: the census changes with the sea level');
    const w = report.scenarios.shore.waterline.probe;
    assert.equal(w.onOcean + w.onWet, 0, 'shore waterline: no drawn rock on ocean or wet ground');
    assert.ok(w.minAboveWaterM >= .3, `shore waterline: every drawn rock >= 0.3 m above the sea (${w.minAboveWaterM})`);
    assert.equal(w.floating + w.buried, 0, 'shore waterline: no floating or buried rocks');
  }
  assert.deepEqual(errors, [], 'no page or console errors');
  report.ok = true;
} catch (error) {
  report.failure = String(error?.stack || error);
  await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  throw error;
} finally {
  report.collision = 'none: rocks are visual only; walker, landing and fauna do not collide with them';
  await save().catch(() => {});
  await browser.close();
}
