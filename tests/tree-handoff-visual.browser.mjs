// Matched near/far tree hand-off captures and per-distance-band crown metrics.
//
//   ATLAS_URL      served build (default http://127.0.0.1:5196/)
//   ATLAS_RESULTS  output directory (default test-results/opus55-tree-handoff/run)
//   ATLAS_POSE     pose.json from tests/tree-families-visual.browser.mjs (walk position, heading, date)
//   ATLAS_VIEWS    optional comma list of view names (ground,alt50,alt160,alt500)
//   ATLAS_HARDWARE=1 (default here) uses the GPU via browser-options.mjs.
//
// Every view is rendered at one frozen pose several times, changing only
// forest presentation through `__atlas.forestDebug`:
//   hidden   forest colour and depth writes off (shadow casters still draw)
//   default  the build's own LOD0 / LOD1 / far-atlas hand-off
//   h<N>     paired LOD1 -> far atlas at N m instead of the default
// Tree pixels are those that differ from `hidden` by more than 10/255 in any
// channel. Each pixel is banded by the eye distance of the terrain it covers
// (in-page terrain ray march on a coarse grid, interpolated), so a band
// compares the SAME trees drawn as LOD1 (default) and as far atlas (h150).
import { chromium } from 'playwright';
import * as THREE from 'three';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { decodePngRgba } from './helpers/png-rgba.mjs';

if (process.env.ATLAS_HARDWARE === undefined) process.env.ATLAS_HARDWARE = '1';
const { browserArgs } = await import('./browser-options.mjs');

const base = process.env.ATLAS_URL || 'http://127.0.0.1:5196/';
const out = resolve(process.env.ATLAS_RESULTS || 'test-results/opus55-tree-handoff/run');
const poseFile = resolve(process.env.ATLAS_POSE || 'test-results/opus55-tree-handoff/pose.json');
const W = 1440, H = 1000, GRID = 32, THRESHOLD = 10;
export const HANDOFF_BANDS_M = [[0, 110], [110, 200], [200, 300], [300, 400], [400, 550], [550, 700], [700, 1000], [1000, 1600], [1600, 4000]];
const VIEWS = [
  { name: 'ground', clearanceM: null, aimM: null },
  { name: 'alt50', clearanceM: 50, aimM: 300 },
  { name: 'alt160', clearanceM: 160, aimM: 400 },
  { name: 'alt500', clearanceM: 500, aimM: 900 },
];
const VARIANTS = { ground: [null, 450, 350, 150], alt50: [null, 450, 350, 250, 150], alt160: [null, 450, 350, 250, 150], alt500: [null, 150] };
const only = process.env.ATLAS_VIEWS ? new Set(process.env.ATLAS_VIEWS.split(',')) : null;

await mkdir(out, { recursive: true });
const pose = JSON.parse(await readFile(poseFile, 'utf8'));
const report = { ok: false, base, out, pose: poseFile, viewport: [W, H], thresholdByte: THRESHOLD, bands: HANDOFF_BANDS_M, startedAt: new Date().toISOString(), errors: [], views: {} };
const t0 = Date.now();
const log = m => console.log(`[${((Date.now() - t0) / 1000).toFixed(0).padStart(4)}s] ${m}`);
const V = a => new THREE.Vector3(...a);
const save = () => writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));

const browser = await chromium.launch({ headless: true, args: browserArgs });
let page = null;
const waitFor = (fn, arg, timeout = 240000) => page.waitForFunction(fn, arg, { timeout });
const HIDE_UI = 'body * { visibility: hidden !important; } #viewport canvas { visibility: visible !important; }';

async function openPose() {
  if (page) await page.close().catch(() => {});
  page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', e => report.errors.push(`page: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !m.text().startsWith('[vite] failed to connect to websocket.')) report.errors.push(`console: ${m.text()}`); });
  if (typeof page.routeWebSocket === 'function') await page.routeWebSocket('**/*', s => s.close());
  await page.addInitScript(() => {
    const def = Object.defineProperty;
    Object.defineProperty = function (t, k, d) {
      const r = Reflect.apply(def, Object, [t, k, d]);
      if (t === window && k === '__atlas' && d?.value?.setExplorationPaused) { d.value.setExplorationPaused(true); Object.defineProperty = def; }
      return r;
    };
  });
  const q = new URLSearchParams({ seed: pose.seed, g: 'G001', system: 'G001/C2128,0,1/0', body: pose.bodyId, trees: '1', date: pose.dateNs, walk: pose.walkPosition.join(','), heading: pose.heading.join(',') });
  if (pose.wv) q.set('wv', pose.wv);
  await page.goto(`${base}?${q}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await waitFor(id => window.__atlas?.ready && window.__atlas.state.level === 'body' && window.__atlas.state.body?.id === id && !window.__atlas.camera.animating, pose.bodyId);
  await waitFor(dateNs => window.__atlas.date.offsetNs === dateNs && window.__atlas.travel.walking?.grounded, pose.dateNs);
  await page.addStyleTag({ content: HIDE_UI });
  await settled();
}
async function settled(minMs = 800) {
  await waitFor(() => {
    const a = window.__atlas, t = a?.terrain?.tiles, f = t?.forest, c = f?.fullCanopy, d = f?.detailedTrees, fa = a?.forestAssets;
    if (!a?.ready || !t || !f || f.selectionPending !== false || f.pending !== 0 || t.pending !== 0) return false;
    if (c && !(c.ready && !c.reusePending && !c.selectionApplyPending && !c.selectionPending && c.queuedPatches === 0 && c.jobsInFlight === 0)) return false;
    if (!fa?.enabled || fa.loading || !fa.ready || fa.error || !d?.ready || d.loading || d.error) return false;
    const presented = (d.families ?? []).map(x => x.kind);
    return presented.length > 0 && presented.every(k => d.farAtlas?.adopted?.includes(k));
  }, undefined, 240000);
  await page.waitForTimeout(minMs);
  const key = () => page.evaluate(() => { const f = window.__atlas.terrain.tiles.forest; return [f.visible, f.near, f.cached, f.pending, window.__atlas.terrain.tiles.pending, f.fullCanopy?.trees].join('/'); });
  for (let i = 0; i < 10; i++) { const a = await key(); await page.waitForTimeout(400); if (a === await key()) return; }
}
async function state() {
  return page.evaluate(() => {
    const a = window.__atlas, trav = a.travel, center = trav.bodies?.find(b => b.id === a.state.body.id)?.positionM ?? null;
    const f = a.terrain.tiles.forest, d = f.detailedTrees;
    return { position: trav.position, heading: trav.heading, fov: a.camera.fov, center, clearanceM: trav.surface?.terrainClearance ?? null,
      walking: !!trav.walking, forest: { visible: f.visible, near: f.near, updateMs: f.updateMs, detailedVisible: d?.visible,
        families: d?.families?.map(x => ({ kind: x.kind, submitted: x.submitted, foliageCutoff: x.foliageCutoff ?? null })) },
      farAtlas: d?.farAtlas?.families?.map(x => ({ kind: x.kind, version: x.version, state: x.state })) ?? null,
      surfaceLighting: a.surfaceLighting ?? null };
  });
}
async function drag(dx, dy) {
  const box = await page.locator('#viewport canvas').boundingBox();
  const sx = box.x + box.width * .45, sy = box.y + box.height * .52, chunks = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 150));
  for (let i = 0; i < chunks; i++) { await page.mouse.move(sx, sy); await page.mouse.down(); await page.mouse.move(sx + dx / chunks, sy + dy / chunks, { steps: 4 }); await page.mouse.up(); }
}
async function aimAt(bodyLocal, rounds = 4) {
  let pr;
  for (let i = 0; i < rounds; i++) {
    const s = await state(), v = V(bodyLocal).add(V(s.center)).sub(V(s.position)).applyQuaternion(new THREE.Quaternion(...s.heading).invert());
    pr = { yaw: Math.atan2(v.x, -v.z), pitch: Math.atan2(v.y, Math.hypot(v.x, v.z)) };
    if (Math.abs(pr.yaw) < .002 && Math.abs(pr.pitch) < .002) break;
    await drag(pr.yaw / .003, 0); await drag(0, -pr.pitch / .003); await page.waitForTimeout(150);
  }
  return pr;
}

/** Eye distance (m) to the terrain for every pixel: ray march on a GRID-px lattice, bilinear between. */
async function distanceMap(s) {
  const eye = V(s.position).sub(V(s.center)), q = new THREE.Quaternion(...s.heading), hy = Math.tan(s.fov * Math.PI / 360), hx = hy * W / H;
  const cols = Math.ceil(W / GRID) + 1, rows = Math.ceil(H / GRID) + 1, dirs = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = ((i * GRID) / W) * 2 - 1, y = 1 - ((j * GRID) / H) * 2;
    dirs.push(new THREE.Vector3(x * hx, y * hy, -1).normalize().applyQuaternion(q).toArray());
  }
  const hits = await page.evaluate(({ o, d }) => window.__atlas.surfaceRays(o, d, 4000), { o: eye.toArray(), d: dirs });
  const grid = Float32Array.from(hits, h => h ?? Infinity), map = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const gx = x / GRID, gy = y / GRID, i = Math.min(cols - 2, Math.floor(gx)), j = Math.min(rows - 2, Math.floor(gy)), fx = gx - i, fy = gy - j;
    const a = grid[j * cols + i], b = grid[j * cols + i + 1], c = grid[(j + 1) * cols + i], d = grid[(j + 1) * cols + i + 1];
    map[y * W + x] = [a, b, c, d].some(v => !Number.isFinite(v)) ? Math.max(a, b, c, d) : (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  }
  return map;
}
const luma = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
/** Per band: tree coverage of terrain pixels and mean sRGB luma / RGB of tree pixels. */
export function bandMetrics(image, hidden, dist, bands = HANDOFF_BANDS_M) {
  const acc = bands.map(() => ({ pixels: 0, tree: 0, luma: 0, r: 0, g: 0, b: 0, groundLuma: 0 }));
  for (let p = 0; p < W * H; p++) {
    const d = dist[p]; if (!Number.isFinite(d)) continue;
    const k = bands.findIndex(([lo, hi]) => d >= lo && d < hi); if (k < 0) continue;
    const o = p * 4, a = acc[k];
    a.pixels++; a.groundLuma += luma(hidden[o], hidden[o + 1], hidden[o + 2]);
    if (Math.max(Math.abs(image[o] - hidden[o]), Math.abs(image[o + 1] - hidden[o + 1]), Math.abs(image[o + 2] - hidden[o + 2])) > THRESHOLD) {
      a.tree++; a.luma += luma(image[o], image[o + 1], image[o + 2]); a.r += image[o]; a.g += image[o + 1]; a.b += image[o + 2];
    }
  }
  return acc.map((a, k) => ({ band: bands[k], pixels: a.pixels, coverage: a.pixels ? +(a.tree / a.pixels).toFixed(4) : null,
    treeLuma: a.tree ? +(a.luma / a.tree).toFixed(4) : null, treeRgb: a.tree ? [a.r, a.g, a.b].map(x => +(x / a.tree).toFixed(1)) : null,
    groundLuma: a.pixels ? +(a.groundLuma / a.pixels).toFixed(4) : null }));
}
function pairedBands(a, b, hidden, dist, bands = HANDOFF_BANDS_M) {
  const differs = (img, o) => Math.max(Math.abs(img[o] - hidden[o]), Math.abs(img[o + 1] - hidden[o + 1]), Math.abs(img[o + 2] - hidden[o + 2])) > THRESHOLD;
  const acc = bands.map(() => ({ pixels: 0, la: 0, lb: 0 }));
  for (let p = 0; p < W * H; p++) {
    const d = dist[p]; if (!Number.isFinite(d)) continue;
    const k = bands.findIndex(([lo, hi]) => d >= lo && d < hi), o = p * 4; if (k < 0 || !differs(a, o) || !differs(b, o)) continue;
    acc[k].pixels++; acc[k].la += luma(a[o], a[o + 1], a[o + 2]); acc[k].lb += luma(b[o], b[o + 1], b[o + 2]);
  }
  return acc.map((x, k) => ({ band: bands[k], pixels: x.pixels, lumaA: x.pixels ? +(x.la / x.pixels).toFixed(4) : null, lumaB: x.pixels ? +(x.lb / x.pixels).toFixed(4) : null,
    ratio: x.pixels && x.lb ? +(x.la / x.lb).toFixed(3) : null }));
}
async function capture(file) {
  await page.waitForTimeout(700);
  const png = await page.screenshot({ path: `${out}/${file}` });
  return decodePngRgba(png);
}
async function forestDebug(options) { return page.evaluate(o => window.__atlas.forestDebug(o), options); }

async function runView(view) {
  await openPose();
  const ground = await state(), walkerGround = V(pose.walkPosition);
  let aimBodyLocal = null;
  if (view.clearanceM !== null) {
    await page.evaluate(h => window.__atlas.launchTo(h), view.clearanceM);
    await waitFor(h => !window.__atlas.travel.walking && !window.__atlas.travel.landing && Math.abs((window.__atlas.travel.surface?.terrainClearance ?? 0) - h) < Math.max(3, h * .05), view.clearanceM, 120000);
    const up = walkerGround.clone().normalize(), fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion(...pose.heading));
    fwd.sub(up.clone().multiplyScalar(fwd.dot(up))).normalize();
    const aim = walkerGround.clone().addScaledVector(fwd, view.aimM).normalize().multiplyScalar(walkerGround.length());
    await aimAt(aim.toArray()); await settled(1500); await aimAt(aim.toArray(), 2); await settled(800);
    aimBodyLocal = aim.toArray();
  }
  const s = await state();
  const record = report.views[view.name] = { aimBodyLocal, clearanceM: s.clearanceM, cameraBodyLocal: V(s.position).sub(V(s.center)).toArray(), heading: s.heading, groundState: ground.forest, variants: {} };
  log(`${view.name}: clearance ${s.clearanceM?.toFixed(1)} m`);
  const dist = await distanceMap(s);
  await forestDebug({ hideColour: true });
  const hidden = await capture(`${view.name}-hidden.png`);
  await forestDebug({ hideColour: false });
  const images = {};
  for (const handoff of VARIANTS[view.name]) {
    await forestDebug({ middleHandoffM: handoff }); await page.waitForTimeout(400);
    const name = handoff === null ? 'default' : `h${handoff}`;
    const image = await capture(`${view.name}-${name}.png`);
    images[name] = image.data ?? image;
    const st = await state();
    record.variants[name] = { handoffM: handoff, forest: st.forest, bands: bandMetrics(image.data ?? image, hidden.data ?? hidden, dist) };
    log(`${view.name} ${name}: ` + record.variants[name].bands.filter(b => b.pixels > 2000).map(b => `${b.band[0]}-${b.band[1]} cov ${b.coverage} L ${b.treeLuma}`).join(' | '));
  }
  await forestDebug({ middleHandoffM: null });
  if (images.default && images.h150) {
    // Same pixels, same trees: default draws LOD1 inside 550 m, h150 draws the far atlas.
    record.pairedDefaultVsH150 = pairedBands(images.default, images.h150, hidden.data ?? hidden, dist);
    log(`${view.name} paired LOD1/far luma: ` + record.pairedDefaultVsH150.filter(b => b.pixels > 2000).map(b => `${b.band[0]}-${b.band[1]} ${b.lumaA}/${b.lumaB} x${b.ratio}`).join(' | '));
  }
  if (view.aimM !== null) {
    // Turning: 30 degrees away and back (re-aimed at the same ground point) must
    // reproduce the default per-band presentation; the retained +50 m band may
    // not leave a different LOD1/far split behind.
    const aim = record.aimBodyLocal;
    await drag(Math.PI / 6 / .003, 0); await settled(600); await capture(`${view.name}-turned-30.png`);
    await aimAt(aim, 4); await settled(600);
    const back = await capture(`${view.name}-turned-back.png`), s2 = await state();
    const bands = bandMetrics(back.data ?? back, hidden.data ?? hidden, await distanceMap(s2)), def = record.variants.default.bands;
    record.turnBack = { bands, maxAbsCoverageDelta: 0, maxAbsLumaDelta: 0 };
    bands.forEach((b, i) => { if (b.pixels < 2000 || def[i].pixels < 2000 || b.treeLuma === null || def[i].treeLuma === null) return;
      record.turnBack.maxAbsCoverageDelta = Math.max(record.turnBack.maxAbsCoverageDelta, +Math.abs(b.coverage - def[i].coverage).toFixed(4));
      record.turnBack.maxAbsLumaDelta = Math.max(record.turnBack.maxAbsLumaDelta, +Math.abs(b.treeLuma - def[i].treeLuma).toFixed(4)); });
    log(`${view.name}: turned 30 deg and back, max band |dCoverage| ${record.turnBack.maxAbsCoverageDelta} |dLuma| ${record.turnBack.maxAbsLumaDelta}`);
  }
  await save();
}

try {
  report.state = null;
  for (const view of VIEWS) if (!only || only.has(view.name)) await runView(view);
  report.final = await state();
  report.renderer = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); const e = gl?.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unavailable'; });
  report.ok = report.errors.length === 0;
} catch (error) {
  report.failure = String(error?.stack ?? error);
  await page?.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  console.error(error); process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  await save();
  await browser.close();
  log(`done ok=${report.ok} errors=${report.errors.length}`);
}
