// Integrated Atlas tree runtime benchmark.
//
// This benchmark deliberately uses Atlas' existing profiling seams. It does
// not change tree population, rendering, or object materials. Tier draw and
// triangle counts are differences between one fixed full-scene view and that
// same view with exactly one Atlas forest tier hidden. GPU milliseconds are
// reported as marginal scene cost for the same comparison (overdraw means
// those values need not add up to the all-trees total).
//
//   ATLAS_URL       running Atlas page (default http://127.0.0.1:5196/)
//   ATLAS_RESULTS   output directory
//   ATLAS_POSE      fixed grounded pose JSON (defaults to the retained review pose)
//   ATLAS_FRAMES    frames per profiling condition (default 120)
//   ATLAS_HARDWARE  set to 1 to request the hardware browser configuration
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { browserArgs } from './browser-options.mjs';
import { acquireGpuLock } from './helpers/gpu-lock.mjs';

if (process.env.ATLAS_HARDWARE === undefined) process.env.ATLAS_HARDWARE = '1';
const base = process.env.ATLAS_URL || 'http://127.0.0.1:5196/';
const out = resolve(process.env.ATLAS_RESULTS || 'test-results/tree-runtime-benchmark');
const poseFile = resolve(process.env.ATLAS_POSE ||
  'tests/fixtures/tree-runtime-benchmark-pose.json');
const frames = Math.max(60, Math.min(600, Number(process.env.ATLAS_FRAMES) || 120));
const tiers = ['forestNear', 'forestMiddle', 'forestFar'];
const W = 1440, H = 1000;
const pose = JSON.parse(await readFile(poseFile, 'utf8'));
const report = {
  ok: false, base, poseFile, pose, viewport: [W, H], frames,
  method: 'fixed pose; Atlas profilingObjects tier isolation; whole-scene GPU marginal deltas; app dirty-range upload accounting; Atlas memory estimates and renderer global object counts',
  limitations: [
    'Per-tier draw calls and triangles are full-view minus same-view tier-hidden counts; they are exact only while other scene submissions remain stable.',
    'Per-tier GPU milliseconds are marginal full-scene deltas and are affected by depth, occlusion, and overdraw; they are not isolated shader execution times.',
    'steadyUploadBytesPerFrame is Atlas scheduled dirty-range instance upload bytes, not driver-observed initial bufferData or texture transfer bytes.',
    'renderer.info geometries/textures are global object counts; tree-specific retained and peak bytes come from Atlas forest resource estimates.',
    'loadPeak is sampled every six animation frames and can miss sub-frame transient memory peaks; Atlas far-atlas diagnostics retain its explicit build scratch peak estimate.'
  ],
  errors: [],
};
await mkdir(out, { recursive: true });
const save = () => writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
let lock, browser, page;
const waitFor = (fn, arg, timeout = 240000) => page.waitForFunction(fn, arg, { timeout });

async function snapshot() {
  return page.evaluate(() => {
    const a = window.__atlas, r = a.renderDebug().renderer;
    const forest = a.terrain?.tiles?.forest;
    const detailed = forest?.detailedTrees;
    const memory = detailed?.memoryAccounting ?? null;
    return {
      renderer: { geometries: r.info.memory.geometries, textures: r.info.memory.textures },
      tree: {
        visible: forest?.visible ?? 0, near: forest?.near ?? 0,
        scheduledUploadBytes: forest?.scheduledUploadBytes ?? 0,
        allocatedBytes: forest?.allocatedBytes ?? 0,
        memoryAccounting: memory,
        families: detailed?.families?.map(x => ({ kind: x.kind, submitted: x.submitted, retainedSlots: x.retainedSlots })) ?? [],
        farRepresentation: detailed?.farRepresentation ?? null,
        farAtlas: detailed?.farAtlas?.families?.map(x => ({ kind: x.kind, state: x.state, views: x.views,
          viewCount: x.viewCount, bakeCpuMs: x.bakeCpuMs, steps: x.steps,
          residentGpuBytes: x.bytes, buildScratchPeakGpuBytes: x.buildScratchPeakGpuBytes })) ?? [],
        canopyTrees: forest?.fullCanopy?.trees ?? 0,
      },
      assets: a.forestAssets,
    };
  });
}

async function startLoadSampler() {
  await page.evaluate(() => {
    const state = window.__treeRuntimeBenchLoad = { stop: false, frame: 0, samples: [], start: performance.now() };
    const sample = () => {
      if (state.stop) return;
      if (++state.frame % 6 === 0) {
        const a = window.__atlas, r = a.renderDebug().renderer, f = a.terrain?.tiles?.forest;
        const d = f?.detailedTrees, m = d?.memoryAccounting;
        state.samples.push({ elapsedMs: performance.now() - state.start,
          renderer: { geometries: r.info.memory.geometries, textures: r.info.memory.textures },
          assets: a.forestAssets,
          tree: m ? { retainedCpuBytes: m.retainedCpuBytes, estimatedGpuBytes: m.estimatedGpuBytes,
            estimatedPeakCpuBytes: m.estimatedPeakCpuBytes, estimatedPeakGpuBytes: m.estimatedPeakGpuBytes,
            farAtlasResidentGpuBytes: m.farAtlasResidentGpuBytes, farAtlasScratchGpuBytes: m.farAtlasScratchGpuBytes,
            farAtlasBuildScratchPeakGpuBytes: m.farAtlasBuildScratchPeakGpuBytes,
            farAtlasCaptureBufferCpuBytes: m.farAtlasCaptureBufferCpuBytes } : null,
          farAtlas: d?.farAtlas?.families?.map(x => ({ kind: x.kind, state: x.state, bakeCpuMs: x.bakeCpuMs,
            buildScratchPeakGpuBytes: x.buildScratchPeakGpuBytes })) ?? [] });
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

async function stopLoadSampler() {
  return page.evaluate(() => {
    const x = window.__treeRuntimeBenchLoad;
    x.stop = true;
    return { durationMs: performance.now() - x.start, samples: x.samples };
  });
}

async function profilingWindow(hidden = []) {
  return page.evaluate(async ({ frames, hidden, tiers }) => {
    const a = window.__atlas, renderer = a.renderDebug().renderer;
    const prior = { enabled: a.renderProfile.enabled, history: a.renderProfile.historyLimit,
      autoReset: renderer.info.autoReset };
    for (const tier of tiers) a.setSystemVisible(tier, true);
    for (const tier of hidden) a.setSystemVisible(tier, false);
    a.setProfiling(true); a.resetProfile(); a.setProfileHistory(frames + 128);
    let n = -3;
    await new Promise(resolve => {
      const tick = () => { if (++n >= frames) resolve(); else requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    // GPU query availability is asynchronous. Drain without blocking on the GPU.
    let drains = 0;
    while (drains++ < 90 && (a.renderProfile.pendingQueries > 0 ||
      (a.renderProfile.statistics?.['gpu/sceneMs']?.samples ?? 0) < frames - 2)) {
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    const result = { profile: a.renderProfile,
      renderer: { geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures },
      hidden: [...hidden] };
    for (const tier of tiers) a.setSystemVisible(tier, true);
    a.setProfiling(prior.enabled); a.setProfileHistory(prior.history);
    renderer.info.autoReset = prior.autoReset;
    if (!prior.enabled) renderer.info.reset();
    return result;
  }, { frames, hidden, tiers });
}

function metric(profile, name) { return profile?.statistics?.[name] ?? { samples: 0, p50: null, p95: null, max: null }; }
function conditionSummary(capture) {
  const s = capture.profile.statistics ?? {};
  return { hidden: capture.hidden, drawCalls: metric(capture.profile, 'drawCalls'),
    triangles: metric(capture.profile, 'triangles'), gpuSceneMs: metric(capture.profile, 'gpu/sceneMs'),
    gpuForestAtlasMs: metric(capture.profile, 'gpu/forestAtlasMs'),
    skippedQueries: capture.profile.skippedQueries, disjointQueries: capture.profile.disjointQueries,
    expiredQueries: capture.profile.expiredQueries, pendingQueries: capture.profile.pendingQueries,
    renderer: capture.renderer };
}
function assertValidWindow(name, capture) {
  assert.equal(capture.profile.gpuAvailable, true, `${name} exposes EXT_disjoint_timer_query_webgl2`);
  assert.equal(capture.profile.skippedQueries, 0, `${name} has no skipped GPU timer queries`);
  assert.equal(capture.profile.disjointQueries, 0, `${name} has no disjoint GPU timer queries`);
  assert.equal(capture.profile.expiredQueries, 0, `${name} has no expired GPU timer queries`);
  assert.ok((capture.profile.statistics?.['gpu/sceneMs']?.samples ?? 0) >= frames - 2,
    `${name} has enough complete scene GPU samples`);
}

async function loadPose(trees) {
  await page.addInitScript(() => {
    const define = Object.defineProperty;
    Object.defineProperty = function (target, key, descriptor) {
      const result = Reflect.apply(define, Object, [target, key, descriptor]);
      if (target === window && key === '__atlas' && descriptor?.value?.setExplorationPaused) {
        descriptor.value.setExplorationPaused(true); Object.defineProperty = define;
      }
      return result;
    };
  });
  const query = new URLSearchParams({ seed: pose.seed, g: 'G001', system: 'G001/C2128,0,1/0',
    body: pose.bodyId, trees: trees ? '1' : '0', date: pose.dateNs,
    walk: pose.walkPosition.join(','), heading: pose.heading.join(',') });
  if (pose.wv) query.set('wv', pose.wv);
  await page.goto(`${base}?${query}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await waitFor(id => window.__atlas?.ready && window.__atlas.state.level === 'body' &&
    window.__atlas.state.body?.id === id && !window.__atlas.camera.animating, pose.bodyId);
  await waitFor(date => window.__atlas.date.offsetNs === date && window.__atlas.travel.walking?.grounded, pose.dateNs);
  await page.addStyleTag({ content: 'body * { visibility: hidden !important; } #viewport canvas { visibility: visible !important; }' });
}

try {
  lock = await acquireGpuLock({ owner: 'integrated Atlas tree near/middle/far benchmark', capture: true, retryMs: 30000 });
  browser = await chromium.launch({ headless: true, args: browserArgs });
  page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', error => report.errors.push(`page: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error' && !message.text().startsWith('[vite] failed to connect to websocket.')) report.errors.push(`console: ${message.text()}`); });
  if (typeof page.routeWebSocket === 'function') await page.routeWebSocket('**/*', socket => socket.close());

  await loadPose(false);
  await waitFor(() => window.__atlas.forestAssets.enabled === false && window.__atlas.terrain?.tiles?.forest?.pending === 0);
  await page.waitForTimeout(500);
  report.memory = { disabledBaseline: await snapshot() };

  // Enable native Atlas profiling before the asset attachment starts so its
  // `forestAtlas` pass captures the actual far-atlas bake work.
  await page.evaluate(() => { window.__atlas.setProfiling(true); window.__atlas.resetProfile(); });
  await startLoadSampler();
  await page.evaluate(() => document.querySelector('#forest-detail')?.click());
  await waitFor(() => {
    const a = window.__atlas, f = a.terrain?.tiles?.forest, d = f?.detailedTrees;
    return a.forestAssets.enabled && a.forestAssets.ready && !a.forestAssets.loading && d?.ready && !d.loading &&
      !d.error && (d.families?.length ?? 0) > 0 && d.families.every(x => d.farAtlas?.adopted?.includes(x.kind)) &&
      f.selectionPending === false && f.pending === 0 && a.terrain.tiles.pending === 0;
  }, undefined, 360000);
  await page.waitForTimeout(1200);
  const loading = await stopLoadSampler();
  const loaded = await snapshot();
  const loadProfile = await page.evaluate(() => window.__atlas.renderProfile);
  report.memory.load = {
    durationMs: loading.durationMs, sampledFrames: loading.samples.length,
    sampledPeak: loading.samples.reduce((peak, current) => !peak ||
      (current.tree?.estimatedPeakGpuBytes ?? 0) > (peak.tree?.estimatedPeakGpuBytes ?? 0) ? current : peak, null),
    resident: loaded,
    farAtlasGpuPassMs: metric(loadProfile, 'gpu/forestAtlasMs'),
    farAtlasDiagnostics: loaded.tree.farAtlas,
    treeAssetUploadEstimates: {
      familyBufferCpuBytes: loaded.tree.memoryAccounting?.familyBufferCpuBytes ?? null,
      familyBufferGpuEstimateBytes: loaded.tree.memoryAccounting?.familyBufferGpuEstimateBytes ?? null,
      decodedFamilyTextureCpuBytes: loaded.tree.memoryAccounting?.familyDecodedTextureCpuBytes ?? null,
      familyTextureGpuEstimateBytes: loaded.tree.memoryAccounting?.familyGpuTextureEstimateBytes ?? null,
      embeddedTextureFileBytes: loaded.tree.memoryAccounting?.embeddedImageFileBytes ?? null,
      farAtlasResidentGpuBytes: loaded.tree.memoryAccounting?.farAtlasResidentGpuBytes ?? null,
      farAtlasBuildScratchPeakGpuBytes: loaded.tree.memoryAccounting?.farAtlasBuildScratchPeakGpuBytes ?? null,
    },
  };

  // Check the fixed camera actually contains submissions in all three tiers.
  const populations = await page.evaluate(() => {
    const f = window.__atlas.terrain.tiles.forest, d = f.detailedTrees;
    const near = d.families.reduce((n, x) => n + (x.submitted?.[0] ?? 0), 0);
    const middle = d.families.reduce((n, x) => n + (x.submitted?.[1] ?? 0), 0);
    const far = f.fullCanopy?.trees ?? 0;
    return { near, middle, far, families: d.families.map(x => ({ kind: x.kind, submitted: x.submitted,
      retainedSlots: x.retainedSlots })), renderer: window.__atlas.stats };
  });
  report.posePopulation = populations;
  assert.ok(populations.near > 0, `fixed pose has near trees (${populations.near})`);
  assert.ok(populations.middle > 0, `fixed pose has middle trees (${populations.middle})`);
  assert.ok(populations.far > 0, `fixed pose has far trees (${populations.far})`);

  const all = await profilingWindow();
  const without = {};
  for (const tier of tiers) without[tier] = await profilingWindow([tier]);
  const withoutTrees = await profilingWindow(tiers);
  assertValidWindow('all tiers', all);
  for (const tier of tiers) assertValidWindow(`without ${tier}`, without[tier]);
  assertValidWindow('without all tree tiers', withoutTrees);
  const full = conditionSummary(all), hiddenTrees = conditionSummary(withoutTrees);
  report.draws = {
    method: 'renderer.info profile deltas with one frozen full scene; the app hides only the objects returned by each tier profilingObjects hook',
    fullScene: full, allTreesMarginal: {
      drawCalls: full.drawCalls.p50 - hiddenTrees.drawCalls.p50,
      triangles: full.triangles.p50 - hiddenTrees.triangles.p50,
      gpuSceneMs: full.gpuSceneMs.p50 - hiddenTrees.gpuSceneMs.p50,
    },
    byTier: Object.fromEntries(tiers.map(tier => {
      const hidden = conditionSummary(without[tier]);
      return [tier, { hiddenCondition: hidden,
        treeDrawCalls: full.drawCalls.p50 - hidden.drawCalls.p50,
        treeTriangles: full.triangles.p50 - hidden.triangles.p50,
        marginalGpuSceneMs: full.gpuSceneMs.p50 - hidden.gpuSceneMs.p50 }];
    })),
  };
  for (const tier of tiers) {
    assert.ok(report.draws.byTier[tier].treeDrawCalls > 0, `${tier} contributes visible draw calls`);
    assert.ok(report.draws.byTier[tier].treeTriangles > 0, `${tier} contributes visible triangles`);
  }

  const steadyFrames = await page.evaluate(({ frames }) => new Promise(resolve => {
    const rows = []; let n = 0;
    const tick = () => {
      const p = window.__atlas.renderDebug().planet;
      rows.push({ scheduledUploadBytes: p.forest.scheduledUploadBytes ?? 0,
        matrixWrites: p.forest.matrixWrites ?? 0, colorWrites: p.forest.colorWrites ?? 0,
        coverageWrites: p.forest.coverageWrites ?? 0 });
      if (++n >= frames) resolve(rows); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { frames });
  const sortedUploads = steadyFrames.map(x => x.scheduledUploadBytes).sort((a, b) => a - b);
  report.memory.steady = {
    resident: await snapshot(),
    steadyUploadBytesPerFrame: { samples: sortedUploads.length,
      p50: sortedUploads[Math.floor(sortedUploads.length * 0.5)] ?? 0,
      p95: sortedUploads[Math.floor(sortedUploads.length * 0.95)] ?? 0,
      max: sortedUploads.at(-1) ?? 0 },
    writeCounts: { matrix: Math.max(...steadyFrames.map(x => x.matrixWrites)),
      color: Math.max(...steadyFrames.map(x => x.colorWrites)), coverage: Math.max(...steadyFrames.map(x => x.coverageWrites)) },
  };
  report.uploads = {
    initialTreeAssets: report.memory.load.treeAssetUploadEstimates,
    steadyScheduledDirtyRangeBytesPerFrame: report.memory.steady.steadyUploadBytesPerFrame,
    interpretation: 'Initial geometry/texture values are Atlas resource-accounting byte estimates; the steady value is Atlas scheduled instance dirty-range bytes, not a driver-level transfer counter.',
  };

  // Exercise the attachment's real disable/dispose path and record memory
  // after renderer disposal callbacks have had several frames to run.
  await page.evaluate(() => document.querySelector('#forest-detail')?.click());
  await waitFor(() => window.__atlas.forestAssets.enabled === false && !window.__atlas.forestAssets.loading &&
    (window.__atlas.terrain?.tiles?.forest?.detailedTrees?.families?.length ?? 0) === 0);
  await page.waitForTimeout(600);
  report.memory.disposed = await snapshot();
  report.disposeDelta = {
    rendererGeometryCount: report.memory.steady.resident.renderer.geometries - report.memory.disposed.renderer.geometries,
    rendererTextureCount: report.memory.steady.resident.renderer.textures - report.memory.disposed.renderer.textures,
    treeEstimatedBytesBefore: report.memory.steady.resident.tree.allocatedBytes,
    treeEstimatedBytesAfter: report.memory.disposed.tree.allocatedBytes,
  };
  report.errors = [...new Set(report.errors)];
  report.ok = report.errors.length === 0;
  await save();
  console.log(JSON.stringify({ ok: report.ok, out, populations, draws: report.draws,
    loadMs: report.memory.load.durationMs, uploadBytes: report.memory.steady.steadyUploadBytesPerFrame,
    disposeDelta: report.disposeDelta }, null, 2));
} catch (error) {
  report.failure = String(error?.stack ?? error);
  await save();
  console.error(error);
  process.exitCode = 1;
} finally {
  await page?.evaluate(() => {
    const a = window.__atlas;
    if (!a) return;
    for (const tier of ['forestNear', 'forestMiddle', 'forestFar']) a.setSystemVisible(tier, true);
    a.setProfiling(false); a.setExplorationPaused(true);
  }).catch(() => {});
  await browser?.close().catch(() => {});
  await lock?.release().catch(() => {});
}
