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
//   ATLAS_POSE      fixed seed/body/date plus reference forest-pose JSON (defaults to the retained review pose)
//   ATLAS_FRAMES    frames per profiling condition (default 120)
//   ATLAS_HARDWARE  set to 1 to request the hardware browser configuration
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cpus, hostname, platform, release, totalmem } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium } from 'playwright';
import { acquireGpuLock } from './helpers/gpu-lock.mjs';

if (process.env.ATLAS_HARDWARE === undefined) process.env.ATLAS_HARDWARE = '1';
// Evaluate browser-options after applying this benchmark's hardware default.
const { browserArgs } = await import('./browser-options.mjs');
const base = process.env.ATLAS_URL || 'http://127.0.0.1:5196/';
const out = resolve(process.env.ATLAS_RESULTS || 'test-results/tree-runtime-benchmark');
const poseFile = resolve(process.env.ATLAS_POSE ||
  'tests/fixtures/tree-runtime-benchmark-pose.json');
const frames = Math.max(60, Math.min(600, Number(process.env.ATLAS_FRAMES) || 120));
const tiers = ['forestNear', 'forestMiddle', 'forestFar'];
const W = 1440, H = 1000;
const warmupFrames = 60;
const run = promisify(execFile);
let pose;
const report = {
  ok: false, acceptanceEligible: false, base, poseFile, pose: null, viewport: [W, H], frames, warmupFrames,
  acceptanceMeaning: 'A valid, uncontended measurement capture only; this single capture does not establish a performance improvement or pass the paired release gate.',
  method: 'fixed pose; Atlas profilingObjects tier isolation; whole-scene GPU marginal deltas; app dirty-range upload accounting; Atlas memory estimates and renderer global object counts',
  limitations: [
    'Per-tier draw calls and triangles are full-view minus same-view tier-hidden counts; they are exact only while other scene submissions remain stable.',
    'Per-tier GPU milliseconds are marginal full-scene deltas and are affected by depth, occlusion, and overdraw; they are not isolated shader execution times.',
    'steadyUploadBytesPerFrame is Atlas scheduled dirty-range instance upload bytes, not driver-observed initial bufferData or texture transfer bytes.',
    'renderer.info geometries/textures are global object counts; tree-specific retained and peak bytes come from Atlas forest resource estimates.',
    'loadPeak is sampled every six animation frames and can miss sub-frame transient memory peaks; Atlas far-atlas diagnostics retain its explicit build scratch peak estimate.'
  ],
  errors: [], gateFindings: [], screenshots: [],
};
const save = async () => {
  await mkdir(out, { recursive: true });
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
};
let lock, browser, page, monitor;
const waitFor = (fn, arg, timeout = 240000) => page.waitForFunction(fn, arg, { timeout });

function gateFinding(code, passed, detail, observed = null) {
  const existing = report.gateFindings.find(x => x.code === code);
  if (!existing) report.gateFindings.push({ code, passed, detail, observed });
  else if (!passed && existing.passed) Object.assign(existing, { passed, detail, observed });
}

async function runtimeIdentity() {
  const git = await Promise.allSettled([
    run('git', ['rev-parse', 'HEAD'], { timeout: 10000 }),
    run('git', ['status', '--porcelain'], { timeout: 10000 }),
  ]);
  const sha = git[0].status === 'fulfilled' ? git[0].value.stdout.trim() : null;
  const dirty = git[1].status === 'fulfilled' ? Boolean(git[1].value.stdout.trim()) : null;
  if (!sha || dirty === null) gateFinding('atlas-git-identity', false, 'Atlas SHA/dirty state could not be read.');
  return { os: { platform: platform(), release: release(), arch: process.arch, hostname: hostname() },
    device: { cpuModel: cpus()[0]?.model ?? null, logicalCpus: cpus().length, memoryBytes: totalmem() },
    atlas: { sha, dirty, source: 'local checkout; served build identity is not independently verified' },
    node: process.version, browser: null, webgl: null, graphicsSettings: null };
}

async function browserIdentity() {
  return page.evaluate(() => {
    const a = window.__atlas, gl = a.renderDebug().renderer.getContext();
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return { browser: { userAgent: navigator.userAgent, platform: navigator.platform },
      webgl: { vendor: gl.getParameter(gl.VENDOR), renderer: gl.getParameter(gl.RENDERER),
        unmaskedVendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : null,
        unmaskedRenderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
        version: gl.getParameter(gl.VERSION), shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        contextAttributes: gl.getContextAttributes() },
      graphicsSettings: a.qualitySettings?.() ?? null };
  });
}

// Sampling is intentionally coarse: no per-frame subprocesses compete with Atlas.
// GPU totals during capture include Atlas and cannot identify foreign GPU activity.
async function startHostMonitor() {
  const state = report.host = { intervalMs: 5000, phase: 'pre-browser', samples: [],
    thresholds: { baselineCpuBusyPercent: 25, foreignCpuPercent: 20, baselineGpuBusyPercent: 10 },
    processMonitoring: { supported: platform() === 'win32', source: platform() === 'win32' ? 'Win32_Process' : null },
    gpuMonitoring: { supported: null, source: 'nvidia-smi when available', foreignUtilizationPercent: null },
    limitations: ['CPU/process samples can miss short-lived contention between polls.',
      'Foreign Blender/browser presence conservatively blocks acceptance, even if idle.',
      'GPU utilization during capture includes Atlas; only pre-browser GPU activity can be attributed to other work.',
      'nvidia-smi does not cover non-NVIDIA GPUs; unavailable telemetry is null, not evidence of an idle GPU.'] };
  let previousCpu, previousProcesses, previousTime, timer, pending, stopped = false;
  const sample = async phase => {
    const now = Date.now(), cpu = cpus().reduce((sum, core) => {
      sum.idle += core.times.idle;
      sum.total += Object.values(core.times).reduce((a, b) => a + b, 0);
      return sum;
    }, { idle: 0, total: 0 });
    const cpuDelta = previousCpu ? cpu.total - previousCpu.total : 0;
    const row = { at: new Date(now).toISOString(), phase,
      cpuBusyPercent: cpuDelta > 0 ? 100 * (1 - (cpu.idle - previousCpu.idle) / cpuDelta) : null,
      foreignCpuPercent: null, foreignProcesses: null, gpu: null };
    previousCpu = cpu;
    const probes = await Promise.allSettled([
      platform() === 'win32' ? run('powershell', ['-NoProfile', '-Command',
        'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,KernelModeTime,UserModeTime | ConvertTo-Json -Compress'],
      { timeout: 10000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }) : Promise.reject(new Error('Process CPU/ancestry monitoring is unsupported on this platform.')),
      state.gpuMonitoring.supported === false ? Promise.reject(new Error('GPU telemetry unavailable.')) :
        run('nvidia-smi', ['--query-gpu=index,name,uuid,utilization.gpu', '--format=csv,noheader,nounits'],
          { timeout: 5000, windowsHide: true }),
    ]);
    if (probes[0].status === 'fulfilled') {
      const parsed = JSON.parse(probes[0].value.stdout), processes = Array.isArray(parsed) ? parsed : [parsed];
      const own = new Set([process.pid]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const p of processes) if (own.has(p.ParentProcessId) && !own.has(p.ProcessId)) {
          own.add(p.ProcessId); changed = true;
        }
      }
      row.foreignProcesses = processes.filter(p => !own.has(p.ProcessId) &&
        /^(blender|chrome|chrome-headless-shell|headless_shell|chromium|firefox|msedge|brave|opera|safari)(\.exe)?$/i.test(p.Name))
        .map(p => ({ pid: p.ProcessId, name: p.Name }));
      const current = new Map(processes.map(p => [p.ProcessId, {
        name: p.Name, cpuMs: (Number(p.KernelModeTime) + Number(p.UserModeTime)) / 10000,
      }]));
      if (previousProcesses && now > previousTime) {
        let foreignMs = 0;
        for (const [pid, p] of current) {
          const prev = previousProcesses.get(pid);
          // Win32 PID 0 is idle time, not foreign CPU work.
          if (pid !== 0 && !own.has(pid) && prev?.name === p.name) foreignMs += Math.max(0, p.cpuMs - prev.cpuMs);
        }
        row.foreignCpuPercent = 100 * foreignMs / ((now - previousTime) * cpus().length);
      }
      previousProcesses = current;
      state.processMonitoring.supported = true;
      if (row.foreignProcesses.length) gateFinding('foreign-blender-or-browser', false,
        'Known foreign Blender/user-browser processes were present during capture.', row.foreignProcesses);
      if (row.foreignCpuPercent > state.thresholds.foreignCpuPercent) gateFinding('foreign-cpu-contention', false,
        'CPU use outside the benchmark process tree exceeded the host-capacity threshold.', row.foreignCpuPercent);
    } else {
      state.processMonitoring.supported = false;
      state.processMonitoring.reason = probes[0].reason.message;
      gateFinding('host-process-monitor-unavailable', false, state.processMonitoring.reason);
    }
    previousTime = now;
    if (probes[1].status === 'fulfilled') {
      row.gpu = probes[1].value.stdout.trim().split(/\r?\n/).filter(Boolean).map(line => {
        const [index, name, uuid, utilization] = line.split(',').map(x => x.trim());
        return { index: Number(index), name, uuid,
          utilizationPercent: Number.isFinite(Number(utilization)) ? Number(utilization) : null };
      });
      state.gpuMonitoring.supported = row.gpu.some(x => x.utilizationPercent !== null);
      if (!state.gpuMonitoring.supported) {
        state.gpuMonitoring.reason = 'The driver did not report numeric GPU utilization.';
        gateFinding('gpu-utilization-telemetry', false,
          'GPU utilization telemetry became unavailable during the capture; acceptance requires valid host GPU telemetry throughout.',
          state.gpuMonitoring.reason);
      }
    } else {
      state.gpuMonitoring.supported = false;
      state.gpuMonitoring.reason = probes[1].reason.message;
      gateFinding('gpu-utilization-telemetry', false,
        'GPU utilization telemetry failed during the capture; acceptance requires valid host GPU telemetry throughout.',
        state.gpuMonitoring.reason);
    }
    if (phase === 'pre-browser') {
      if (row.cpuBusyPercent > state.thresholds.baselineCpuBusyPercent) gateFinding('baseline-cpu-contention', false,
        'Host CPU was busy before launching the benchmark browser.', row.cpuBusyPercent);
      if (row.gpu?.some(x => x.utilizationPercent > state.thresholds.baselineGpuBusyPercent))
        gateFinding('baseline-gpu-contention', false, 'GPU activity preceded the benchmark browser.', row.gpu);
    }
    state.samples.push(row);
  };
  await sample('pre-browser');
  await new Promise(resolve => setTimeout(resolve, 1000));
  await sample('pre-browser');
  gateFinding('gpu-utilization-telemetry', state.gpuMonitoring.supported === true,
    'Acceptance requires host GPU-utilization telemetry; unavailable telemetry is unknown, not evidence of a quiet GPU.',
    state.gpuMonitoring.reason ?? state.gpuMonitoring.source);
  const poll = () => {
    pending = sample(state.phase).catch(error => {
      state.failure = String(error);
      gateFinding('host-monitor-failure', false, state.failure);
    }).finally(() => { if (!stopped) timer = setTimeout(poll, state.intervalMs); });
  };
  timer = setTimeout(poll, state.intervalMs);
  return { phase: value => { state.phase = value; }, stop: async () => {
    stopped = true; clearTimeout(timer); await pending;
    await sample('capture-end');
  } };
}

async function warmup() {
  await page.evaluate(async frames => {
    for (let i = 0; i < frames; i++) await new Promise(resolve => requestAnimationFrame(resolve));
  }, warmupFrames);
}

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
  monitor?.phase(`profiling:${hidden.join(',') || 'all-tiers'}`);
  return page.evaluate(async ({ frames, hidden, tiers, warmupFrames }) => {
    const a = window.__atlas, renderer = a.renderDebug().renderer;
    const prior = { enabled: a.renderProfile.enabled, sampling: a.renderProfile.sampling, history: a.renderProfile.historyLimit,
      autoReset: renderer.info.autoReset };
    a.setProfiling(false);
    for (const tier of tiers) a.setSystemVisible(tier, true);
    for (const tier of hidden) a.setSystemVisible(tier, false);
    // Visibility changes can schedule instance uploads and shadow-cache work.
    // Keep that transition outside the stationary measurement window.
    for (let i = 0; i < warmupFrames; i++) await new Promise(resolve => requestAnimationFrame(resolve));
    a.setProfiling(true); a.resetProfile(); a.setProfileHistory(frames + 128);
    let n = 0;
    await new Promise(resolve => {
      const tick = () => { if (++n >= frames) resolve(); else requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    // Stop adding samples, then let the profiler poll already-issued timer queries.
    a.setProfileSampling(false);
    let drains = 0;
    while (drains++ < 90 && a.renderProfile.pendingQueries > 0) {
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    const result = { profile: a.renderProfile, warmupFrames,
      renderer: { geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures },
      hidden: [...hidden] };
    a.setProfiling(false);
    for (const tier of tiers) a.setSystemVisible(tier, true);
    for (let i = 0; i < warmupFrames; i++) await new Promise(resolve => requestAnimationFrame(resolve));
    a.setProfiling(prior.enabled); a.setProfileSampling(prior.sampling); a.setProfileHistory(prior.history);
    renderer.info.autoReset = prior.autoReset;
    if (!prior.enabled) renderer.info.reset();
    return result;
  }, { frames, hidden, tiers, warmupFrames });
}

function metric(profile, name) { return profile?.statistics?.[name] ?? { samples: 0, p50: null, p95: null, max: null }; }
function sceneGpuMetric(profile) {
  const capture = metric(profile, 'gpu/sceneCaptureMs');
  if (capture.samples > 0) return { name: 'gpu/sceneCaptureMs', value: capture };
  return { name: 'gpu/sceneMs', value: metric(profile, 'gpu/sceneMs') };
}
function conditionSummary(capture) {
  const scene = sceneGpuMetric(capture.profile);
  return { hidden: capture.hidden, warmupFrames: capture.warmupFrames, drawCalls: metric(capture.profile, 'drawCalls'),
    triangles: metric(capture.profile, 'triangles'), gpuScenePass: scene.name, gpuSceneMs: scene.value,
    gpuForestAtlasMs: metric(capture.profile, 'gpu/forestAtlasMs'),
    cpuFrameWorkMs: metric(capture.profile, 'cpu/frameWorkMs'),
    cpuForestMs: metric(capture.profile, 'cpu/system/forestMs'),
    cpuCanopyMs: metric(capture.profile, 'cpu/system/canopyMs'),
    frameIntervalMs: metric(capture.profile, 'frameIntervalMs'), hitches: capture.profile.hitches,
    gpuAvailable: capture.profile.gpuAvailable,
    skippedQueries: capture.profile.skippedQueries, disjointQueries: capture.profile.disjointQueries,
    expiredQueries: capture.profile.expiredQueries, pendingQueries: capture.profile.pendingQueries,
    renderer: capture.renderer };
}
function assertValidWindow(name, capture) {
  assert.equal(capture.profile.gpuAvailable, true, `${name} exposes EXT_disjoint_timer_query_webgl2`);
  assert.equal(capture.profile.skippedQueries, 0, `${name} has no skipped GPU timer queries`);
  assert.equal(capture.profile.disjointQueries, 0, `${name} has no disjoint GPU timer queries`);
  assert.equal(capture.profile.expiredQueries, 0, `${name} has no expired GPU timer queries`);
  assert.equal(capture.profile.pendingQueries, 0, `${name} drains every pending GPU timer query`);
  const scene = sceneGpuMetric(capture.profile);
  assert.ok(scene.value.samples >= frames - 2,
    `${name} has enough complete ${scene.name} GPU samples`);
}

async function loadPose(trees) {
  const query = new URLSearchParams({ seed: pose.seed, g: 'G001', system: 'G001/C2128,0,1/0',
    body: pose.bodyId, trees: trees ? '1' : '0', date: pose.dateNs });
  if (pose.wv) query.set('wv', pose.wv);
  query.set('walk', pose.walkPosition.join(','));
  query.set('heading', pose.heading.join(','));
  await page.addInitScript(() => {
    const define = Object.defineProperty;
    Object.defineProperty = function (target, key, descriptor) {
      const result = Reflect.apply(define, Object, [target, key, descriptor]);
      if (target === window && key === '__atlas' && descriptor?.value?.setExplorationPaused) {
        descriptor.value.setExplorationPaused(true);
        Object.defineProperty = define;
      }
      return result;
    };
  });
  await page.goto(`${base}?${query}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await waitFor(id => window.__atlas?.ready && window.__atlas.state.level === 'body' &&
    window.__atlas.state.body?.id === id && !window.__atlas.camera.animating, pose.bodyId);
  await waitFor(dateNs => window.__atlas.date.offsetNs.toString() === dateNs &&
    window.__atlas.travel.walking?.active === true && window.__atlas.travel.walking?.grounded === true &&
    window.__atlas.travel.walking?.waiting === false, pose.dateNs, 240000);
  await waitFor(() => {
    const a = window.__atlas, t = a.terrain?.tiles, f = t?.forest, c = f?.fullCanopy;
    return f?.selectionPending === false && f.pending === 0 && t.pending === 0 &&
      t.faunaTerrainPending === 0 && (!c || (c.ready && !c.selectionPending &&
        !c.selectionApplyPending && !c.reusePending && c.queuedPatches === 0 && c.jobsInFlight === 0));
  }, undefined, 240000);
  report.realizedPose = await page.evaluate(() => ({
    dateNs: window.__atlas.date.offsetNs.toString(),
    walkPosition: window.__atlas.travel.walking.position,
    heading: window.__atlas.travel.heading,
    bodyId: window.__atlas.state.body.id,
  }));
  const positionErrorM = Math.hypot(...pose.walkPosition.map((value, i) => value - report.realizedPose.walkPosition[i]));
  const expectedHeadingLength = Math.hypot(...pose.heading), actualHeadingLength = Math.hypot(...report.realizedPose.heading);
  const headingDot = pose.heading.reduce((sum, value, i) => sum + value / expectedHeadingLength *
    report.realizedPose.heading[i] / actualHeadingLength, 0);
  const headingErrorRad = 2 * Math.acos(Math.min(1, Math.abs(headingDot)));
  assert.equal(report.realizedPose.dateNs, pose.dateNs, 'the benchmark remains on its fixture date');
  assert.ok(positionErrorM <= 0.05, `the restored walk position matches the fixture (${positionErrorM} m)`);
  assert.ok(headingErrorRad <= 1e-5, `the restored view heading matches the fixture (${headingErrorRad} rad)`);
  report.poseParity = { positionErrorM, headingErrorRad, dateMatches: true };
  await page.addStyleTag({ content: 'body * { visibility: hidden !important; } #viewport canvas { visibility: visible !important; }' });
}

try {
  await mkdir(out, { recursive: true });
  pose = JSON.parse(await readFile(poseFile, 'utf8'));
  report.pose = pose;
  report.runtime = await runtimeIdentity();
  lock = await acquireGpuLock({ owner: 'integrated Atlas tree near/middle/far benchmark', capture: true, retryMs: 30000 });
  monitor = await startHostMonitor();
  monitor.phase('loading');
  browser = await chromium.launch({ headless: true, args: browserArgs });
  report.runtime.browserLaunch = { version: browser.version(), headless: true, args: [...browserArgs], hardwareRequested: process.env.ATLAS_HARDWARE };
  page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', error => report.errors.push(`page: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error' && !message.text().startsWith('[vite] failed to connect to websocket.')) report.errors.push(`console: ${message.text()}`); });
  if (typeof page.routeWebSocket === 'function') await page.routeWebSocket('**/*', socket => socket.close());

  await loadPose(false);
  Object.assign(report.runtime, await browserIdentity());
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
  await page.evaluate(() => window.__atlas.setProfiling(false));
  await warmup();
  Object.assign(report.runtime, await browserIdentity());
  gateFinding('graphics-settings-available', report.runtime.graphicsSettings !== null,
    'Atlas must expose the active graphics settings.');
  const gpuRenderer = report.runtime.webgl.unmaskedRenderer;
  gateFinding('hardware-renderer', Boolean(gpuRenderer) && !/swiftshader|llvmpipe|softpipe|software|warp/i.test(gpuRenderer),
    'Runtime GPU acceptance requires an identifiable hardware WebGL renderer.', gpuRenderer);
  const screenshot = 'loaded-mixed-tiers.png';
  await page.screenshot({ path: resolve(out, screenshot), fullPage: false, animations: 'disabled' });
  report.screenshots.push({ file: screenshot, condition: 'loaded mixed near/middle/far tiers', populations });

  const all = await profilingWindow();
  report.profilingConditions = { allTiers: conditionSummary(all) };
  const without = {};
  for (const tier of tiers) {
    without[tier] = await profilingWindow([tier]);
    report.profilingConditions[`without:${tier}`] = conditionSummary(without[tier]);
  }
  const withoutTrees = await profilingWindow(tiers);
  report.profilingConditions.withoutAllTrees = conditionSummary(withoutTrees);
  assertValidWindow('all tiers', all);
  for (const tier of tiers) assertValidWindow(`without ${tier}`, without[tier]);
  assertValidWindow('without all tree tiers', withoutTrees);
  const sceneMetrics = new Set([all, ...Object.values(without), withoutTrees].map(x => sceneGpuMetric(x.profile).name));
  assert.equal(sceneMetrics.size, 1, 'the active scene GPU pass is consistent across all visibility conditions');
  report.sceneGpuMetric = [...sceneMetrics][0];
  const full = conditionSummary(all), hiddenTrees = conditionSummary(withoutTrees);
  report.draws = {
    method: 'renderer.info profile deltas with one frozen full scene; the app hides only the objects returned by each tier profilingObjects hook',
    fullScene: full, allTreesMarginal: {
      drawCalls: full.drawCalls.p50 - hiddenTrees.drawCalls.p50,
      triangles: full.triangles.p50 - hiddenTrees.triangles.p50,
      gpuScenePass: report.sceneGpuMetric,
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

  monitor.phase('stationary-writes');
  await page.evaluate(() => window.__atlas.setProfiling(false));
  await warmup();
  const steadyFrames = await page.evaluate(({ frames }) => new Promise(resolve => {
    const rows = []; let n = 0;
    const tick = () => {
      const p = window.__atlas.renderDebug().planet;
      rows.push({ scheduledUploadBytes: p.forest.scheduledUploadBytes ?? null,
        matrixWrites: p.forest.matrixWrites ?? null, colorWrites: p.forest.colorWrites ?? null,
        coverageWrites: p.forest.coverageWrites ?? null });
      if (++n >= frames) resolve(rows); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { frames });
  const sortedUploads = steadyFrames.map(x => x.scheduledUploadBytes).filter(x => x !== null).sort((a, b) => a - b);
  const allUploadsKnown = sortedUploads.length === steadyFrames.length;
  const maxWrites = key => steadyFrames.every(x => x[key] !== null) ? Math.max(...steadyFrames.map(x => x[key])) : null;
  report.memory.steady = {
    resident: await snapshot(),
    steadyUploadBytesPerFrame: { samples: sortedUploads.length, missingSamples: steadyFrames.length - sortedUploads.length,
      p50: allUploadsKnown ? sortedUploads[Math.floor(sortedUploads.length * 0.5)] : null,
      p95: allUploadsKnown ? sortedUploads[Math.floor(sortedUploads.length * 0.95)] : null,
      max: allUploadsKnown ? sortedUploads.at(-1) : null },
    writeCounts: { matrix: maxWrites('matrixWrites'), color: maxWrites('colorWrites'), coverage: maxWrites('coverageWrites') },
  };
  report.uploads = {
    initialTreeAssets: report.memory.load.treeAssetUploadEstimates,
    steadyScheduledDirtyRangeBytesPerFrame: report.memory.steady.steadyUploadBytesPerFrame,
    interpretation: 'Initial geometry/texture values are Atlas resource-accounting byte estimates; the steady value is Atlas scheduled instance dirty-range bytes, not a driver-level transfer counter.',
  };
  const stationaryZero = steadyFrames.every(x => Object.values(x).every(value => value === 0));
  gateFinding('stationary-steady-writes-zero', stationaryZero,
    'Every sampled stationary frame must have zero scheduled upload bytes and matrix/color/coverage writes; missing counters fail the gate.',
    { samples: steadyFrames.length, nonzeroOrMissingFrames: steadyFrames.filter(x => Object.values(x).some(value => value !== 0)).length,
      maxima: report.memory.steady.writeCounts, uploadBytes: report.memory.steady.steadyUploadBytesPerFrame });

  // Exercise the attachment's real disable/dispose path and record memory
  // after renderer disposal callbacks have had several frames to run.
  monitor.phase('dispose');
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
  report.captureComplete = true;
} catch (error) {
  report.failure = String(error?.stack ?? error);
  try {
    report.failureState = await page?.evaluate(() => {
      const a = window.__atlas, t = a?.terrain?.tiles, f = t?.forest;
      return {
        href: location.href,
        atlasReady: a?.ready ?? false,
        level: a?.state?.level ?? null,
        bodyId: a?.state?.body?.id ?? null,
        cameraAnimating: a?.camera?.animating ?? null,
        dateNs: a?.date?.offsetNs?.toString?.() ?? null,
        travel: a?.travel ? {
          landing: a.travel.landing,
          walkingActive: a.travel.walking?.active ?? false,
          walkingGrounded: a.travel.walking?.grounded ?? false,
          walkingWaiting: a.travel.walking?.waiting ?? null,
          terrainClearanceM: a.travel.surface?.terrainClearance ?? null,
        } : null,
        terrain: t ? { surfaceReady: t.surfaceReady, pending: t.pending,
          forestPending: f?.pending ?? null, selectionPending: f?.selectionPending ?? null } : null,
        forestAssets: a?.forestAssets ? { enabled: a.forestAssets.enabled,
          loading: a.forestAssets.loading, ready: a.forestAssets.ready,
          error: a.forestAssets.error ?? null } : null,
        renderer: a?.stats ?? null,
      };
    });
    if (page) {
      const failureImage = `${out}/failure.png`;
      await page.screenshot({ path: failureImage, timeout: 10000 });
      report.screenshots.push(failureImage);
    }
  } catch (diagnosticError) {
    report.failureDiagnosticsError = String(diagnosticError?.stack ?? diagnosticError);
  }
  console.error(error);
  process.exitCode = 1;
} finally {
  await monitor?.stop().catch(error => gateFinding('host-monitor-finalization', false, String(error)));
  await page?.evaluate(() => {
    const a = window.__atlas;
    if (!a) return;
    for (const tier of ['forestNear', 'forestMiddle', 'forestFar']) a.setSystemVisible(tier, true);
    a.setProfiling(false); a.setExplorationPaused(true);
  }).catch(() => {});
  await browser?.close().catch(() => {});
  await lock?.release().catch(() => {});
  report.errors = [...new Set(report.errors)];
  report.ok = report.captureComplete === true && !report.failure && report.errors.length === 0;
  report.acceptanceEligible = report.ok && report.gateFindings.every(x => x.passed);
  report.finishedAt = new Date().toISOString();
  await save();
  if (!report.acceptanceEligible) process.exitCode = 1;
  console.log(JSON.stringify({ ok: report.ok, acceptanceEligible: report.acceptanceEligible, out,
    gateFindings: report.gateFindings, failure: report.failure ?? null,
    populations: report.posePopulation, screenshots: report.screenshots, draws: report.draws,
    loadMs: report.memory?.load?.durationMs, uploadBytes: report.memory?.steady?.steadyUploadBytesPerFrame,
    disposeDelta: report.disposeDelta }, null, 2));
}
