import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserArgs } from './browser-options.mjs';
import { encodeVersions, CURRENT_VERSIONS } from '../src/time-nav.ts';

const base = process.env.ATLAS_URL || 'http://127.0.0.1:5188/';
const out = process.env.ATLAS_RESULTS || 'test-results/combined-visual-acceptance-c9ba64f';
const bodyId = 'G001/C2128,0,1/0/planet/1';
const params = new URLSearchParams({ seed: 'LETHRA-001', g: 'G001', system: 'G001/C2128,0,1/0', body: bodyId });
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: browserArgs });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
let phase = 'startup';
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const waitFor = (predicate, timeout = 180000, arg) => page.waitForFunction(predicate, arg, { timeout });
const waitWithProgress = async (name, predicate, timeout = 180000, arg) => {
  const deadline = Date.now() + timeout;
  phase = name;
  while (Date.now() < deadline) {
    const slice = Math.min(5000, deadline - Date.now());
    try { await page.waitForFunction(predicate, arg, { timeout: slice }); return; }
    catch (error) {
      if (!String(error).includes('Timeout')) throw error;
      await checkpoint(`${name}-pending`);
    }
  }
  await checkpoint(`${name}-timeout`);
  throw new Error(`Timed out waiting for ${name}`);
};
const checkpoint = async name => {
  phase = name;
  const state = await page.evaluate(() => {
    const a = window.__atlas;
    return a ? { ready: a.ready, level: a.state?.level, body: a.state?.body?.id,
      date: a.date?.offsetNs, camera: a.travel?.position, walking: a.travel?.walking,
      faunaVisibleCount: a.terrain?.tiles?.faunaVisibleCount,
      faunaDrawnCount: a.terrain?.tiles?.faunaDrawn?.length,
      faunaNear: a.terrain?.tiles?.faunaNear,
      surfaceReady: a.terrain?.tiles?.surfaceReady,
      detailPatches: a.terrain?.tiles?.detailPatches,
      contactLevel: a.terrain?.tiles?.contactLevel,
      baseContactLevel: a.terrain?.tiles?.baseContactLevel,
      maxLevel: a.terrain?.tiles?.maxLevel,
      failures: a.terrain?.tiles?.failures,
      terrainPending: a.terrain?.tiles?.pending,
      lifePending: a.terrain?.tiles?.lifePending,
      faunaTerrainPending: a.terrain?.tiles?.faunaTerrainPending } : null;
  }).catch(() => null);
  await writeFile(`${out}/progress.json`, JSON.stringify({ phase, state, errors }, null, 2));
};

try {
  await checkpoint('initial-navigation');
  await page.goto(`${base}?${params}`, { waitUntil: 'networkidle' });
  await checkpoint('initial-body-ready');
  await waitFor(id => window.__atlas?.ready && window.__atlas.state.level === 'body' &&
    window.__atlas.state.body?.id === id && window.__atlas.terrain?.tiles?.ready && !window.__atlas.camera.animating, 180000, bodyId);
  await page.waitForTimeout(800);
  await page.locator('#find-life').click();
  await checkpoint('find-life-settled');
  await waitFor(() => window.__atlas.travel.terrainCruise !== null && window.__atlas.terrain?.tiles?.surfaceReady &&
    window.__atlas.terrain.tiles.forest.visible > 200);
  await page.keyboard.down('q');
  await checkpoint('flight-descent');
  await waitFor(() => window.__atlas.travel.surface?.terrainClearance < 110);
  await page.keyboard.up('q');
  await checkpoint('fauna-visible');
  await waitFor(() => window.__atlas.terrain.tiles.faunaVisibleCount > 0 && window.__atlas.terrain.tiles.faunaDrawn.length > 0);
  await page.evaluate(() => window.__atlas.setExplorationPaused(true));
  const source = await page.evaluate(() => ({
    date: window.__atlas.date.offsetNs,
    radiusM: window.__atlas.state.body.radiusM,
    body: window.__atlas.state.body.id,
    center: window.__atlas.travel.bodies.find(body => body.id === window.__atlas.state.body.id).positionM,
    camera: window.__atlas.travel.position,
    animals: window.__atlas.terrain.tiles.faunaDrawn,
  }));
  const center = new THREE.Vector3(...source.center), camera = new THREE.Vector3(...source.camera), radius = source.radiusM;
  const nearest = source.animals.map(animal => {
    const local = new THREE.Vector3(...animal.position).multiplyScalar(radius);
    return { ...animal, local, distanceM: center.clone().add(local).distanceTo(camera) };
  }).sort((a, b) => a.distanceM - b.distanceM)[0];
  assert.ok(nearest, 'at least one actual fauna individual is drawn');
  await writeFile(`${out}/source-target.json`, JSON.stringify({
    date: source.date, body: source.body, radiusM: source.radiusM,
    target: { id: nearest.id, cell: nearest.cell, position: nearest.position,
      bodyLocalM: nearest.local.toArray(), distanceM: nearest.distanceM, genome: nearest.genome },
    sourceCamera: source.camera,
  }, null, 2));
  const up = nearest.local.clone().normalize();
  const reference = Math.abs(up.y) > .92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3().crossVectors(reference, up).normalize();
  const eye = nearest.local.clone().addScaledVector(tangent, 3).addScaledVector(up, 1.64);
  const lookTarget = center.clone().add(nearest.local).addScaledVector(up, 1.0);
  // prepareLanding normalizes the saved point then places the eye about 12 m
  // over the sampled ground. Aim from that actual landing eye, not from the
  // pre-normalized 1.64 m input point.
  const landingEye = center.clone().add(eye.clone().normalize().multiplyScalar(radius + 12));
  const orientation = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(landingEye, lookTarget, up),
  );
  const closeupParams = new URLSearchParams(params);
  closeupParams.set('walk', eye.toArray().join(','));
  closeupParams.set('heading', orientation.toArray().join(','));
  closeupParams.set('date', source.date);
  closeupParams.set('wv', encodeVersions(CURRENT_VERSIONS));
  // `__atlas` is defined before ready; pausing when the diagnostic API is
  // installed prevents even one autonomous flight tick on the restored route.
  // Limit the hook to walk URLs so the source flight remains interactive.
  await page.addInitScript(() => {
    if (!new URL(location.href).searchParams.has('walk')) return;
    const define = Object.defineProperty;
    Object.defineProperty = function(target, key, descriptor) {
      const result = Reflect.apply(define, Object, [target, key, descriptor]);
      if (target === window && key === '__atlas' && descriptor?.value?.setExplorationPaused) {
        descriptor.value.setExplorationPaused(true);
        Object.defineProperty = define;
      }
      return result;
    };
  });
  await checkpoint('close-route-navigation');
  await page.goto(`${base}?${closeupParams}`, { waitUntil: 'networkidle' });
  // The simulation clock is allowed to advance while flight is active. Freeze
  // it as soon as the runtime API is published, before waiting on body/terrain
  // readiness, so a source/landing population comparison uses one exact epoch.
  await waitFor(() => !!window.__atlas?.setExplorationPaused, 30000);
  await page.evaluate(() => window.__atlas.setExplorationPaused(true));
  await waitWithProgress('close-body-ready', id => window.__atlas?.ready && window.__atlas.state.level === 'body' &&
    window.__atlas.state.body?.id === id && window.__atlas.terrain?.tiles?.ready, 180000, bodyId);
  const loadedDate = await page.evaluate(() => window.__atlas.date.offsetNs);
  await writeFile(`${out}/route-load.json`, JSON.stringify({
    requestedDate: source.date, loadedDate,
    pausedImmediately: await page.evaluate(() => window.__atlas.travel.explorationClock.paused),
  }, null, 2));
  assert.equal(loadedDate, source.date, 'close route loads the exact source world epoch');
  await waitWithProgress('walking-settled', () => window.__atlas.travel.walking?.grounded, 180000);
  await checkpoint('walker-grounded');
  // Record the canonical target before any optional visibility/aiming work.
  // `faunaDrawn.position` is body-local normalized position, while the walker
  // position is body-local metres; convert before comparing distances.
  const landed = await page.evaluate(({ radius, targetId }) => {
    const a = window.__atlas;
    const animals = a.terrain.tiles.faunaDrawn.map(({ id, cell, position }) => ({
      id, cell, position, bodyLocalM: position.map(value => value * radius),
    }));
    const walker = a.travel.walking;
    const body = a.state.body;
    const bodyCenterM = a.travel.bodies.find(item => item.id === body.id).positionM;
    return { date: a.date.offsetNs, heading: a.travel.heading, walker,
      bodyCenterM, cameraPositionM: a.travel.position, cameraHeading: a.travel.heading,
      camera: a.camera, viewport: { width: innerWidth, height: innerHeight },
      sourceTargetPresent: animals.some(animal => animal.id === targetId),
      sourceTarget: animals.find(animal => animal.id === targetId) ?? null,
      drawnCount: animals.length, drawn: animals,
      nearestToWalker: animals.map(animal => ({ id: animal.id, cell: animal.cell,
        distanceM: Math.hypot(...animal.bodyLocalM.map((value, i) => value - walker.position[i])) }))
        .sort((a, b) => a.distanceM - b.distanceM).slice(0, 8),
    };
  }, { radius, targetId: nearest.id });
  const projectBodyLocal = (positionM) => {
    const worldPosition = new THREE.Vector3(...landed.bodyCenterM).add(new THREE.Vector3(...positionM));
    const local = worldPosition.sub(new THREE.Vector3(...landed.cameraPositionM))
      .applyQuaternion(new THREE.Quaternion(...landed.cameraHeading).invert());
    const depthM = -local.z;
    if (depthM <= 0) return { inFront: false, depthM };
    const halfY = Math.tan((landed.camera.fov * Math.PI / 180) / 2);
    const halfX = halfY * landed.viewport.width / landed.viewport.height;
    const ndcX = local.x / (depthM * halfX), ndcY = local.y / (depthM * halfY);
    return { inFront: true, ndcX, ndcY, depthM,
      inFrame: Math.abs(ndcX) <= 1 && Math.abs(ndcY) <= 1 };
  };
  landed.sourceTargetExpected = {
    positionBodyLocalM: nearest.local.toArray(),
    distanceToGroundWalkerM: new THREE.Vector3(...nearest.local).distanceTo(new THREE.Vector3(...landed.walker.position)),
    projectedFromSettledCamera: projectBodyLocal(nearest.local.toArray()),
  };
  landed.nearestDrawnProjected = landed.nearestToWalker.slice(0, 8).map(item => ({
    id: item.id, distanceM: item.distanceM,
    projected: projectBodyLocal(landed.drawn.find(animal => animal.id === item.id).bodyLocalM),
  }));
  await writeFile(`${out}/landed-population.json`, JSON.stringify({
    source: { date: source.date, target: { id: nearest.id, cell: nearest.cell,
      bodyLocalM: nearest.local.toArray(), distanceM: nearest.distanceM,
      genome: nearest.genome }, radiusM: source.radiusM },
    landed,
  }, null, 2));
  // The bookmark restores a grounded heading, but landing may flatten it.
  // Re-aim in the settled page using the real drag-to-look input, then record
  // the target projection before taking any visual evidence.
  await page.locator('#timeline').evaluate(details => { details.open = false; }).catch(() => {});
  await page.locator('#collapse').click({ timeout: 1200 }).catch(() => {});
  const targetWorld = new THREE.Vector3(...landed.bodyCenterM).add(nearest.local);
  const localAim = targetWorld.clone().sub(new THREE.Vector3(...landed.cameraPositionM))
    .applyQuaternion(new THREE.Quaternion(...landed.cameraHeading).invert());
  const aim = { yaw: Math.atan2(localAim.x, -localAim.z),
    pitch: Math.atan2(localAim.y, Math.hypot(localAim.x, localAim.z)) };
  const rect = await page.locator('canvas').boundingBox();
  if (!rect) throw new Error('Canvas is unavailable for in-page look adjustment');
  const dragX = Math.round(-aim.yaw / 0.003), dragY = Math.round(-aim.pitch / 0.003);
  const startX = Math.min(rect.x + rect.width - 20, Math.max(rect.x + 20, rect.x + rect.width * 0.78));
  const startY = Math.min(rect.y + rect.height - 20, Math.max(rect.y + 20, rect.y + rect.height * 0.5));
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dragX), Math.abs(dragY)) / 120));
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(startX + dragX * i / steps, startY + dragY * i / steps);
  }
  await page.mouse.up();
  await page.waitForTimeout(500);
  const aimedSnapshot = await page.evaluate(() => ({ heading: window.__atlas.travel.heading,
    position: window.__atlas.travel.position, fov: window.__atlas.camera.fov,
    grounded: window.__atlas.travel.walking?.grounded, date: window.__atlas.date.offsetNs }));
  const aimedLocal = targetWorld.clone().sub(new THREE.Vector3(...aimedSnapshot.position))
    .applyQuaternion(new THREE.Quaternion(...aimedSnapshot.heading).invert());
  const depth = -aimedLocal.z, halfY = Math.tan((aimedSnapshot.fov * Math.PI / 180) / 2), halfX = halfY * 1440 / 1000;
  const aimed = { ...aimedSnapshot, targetLocal: nearest.local.toArray(), depthM: depth,
    ndc: [aimedLocal.x / (depth * halfX), aimedLocal.y / (depth * halfY)] };
  await writeFile(`${out}/aimed-state.json`, JSON.stringify({ requestedDrag: { yaw: aim.yaw, pitch: aim.pitch, dragX, dragY }, aimed }, null, 2));
  await page.screenshot({ path: `${out}/aimed-page.png` });
  await page.locator('canvas').screenshot({ path: `${out}/aimed-canvas.png` });
  let nearRigReady = false;
  try {
    await waitFor(() => window.__atlas.terrain.tiles.faunaNear?.active > 0 && window.__atlas.terrain.tiles.faunaNear?.builds > 0, 15000);
    nearRigReady = true;
  } catch (error) {
    if (!String(error).includes('Timeout')) throw error;
  }
  await checkpoint(nearRigReady ? 'near-rig-built' : 'near-rig-not-ready');
  await page.evaluate(() => window.__atlas.setExplorationPaused(true));
  let panelCollapsed = false;
  try {
    await page.locator('#timeline').evaluate(details => { details.open = false; });
    await page.locator('#collapse').click({ timeout: 1500 });
    panelCollapsed = true;
  } catch { /* optional screenshot preparation; diagnostics continue */ }
  const first = await page.evaluate(() => window.__atlas.terrain.tiles.faunaDrawn.map(({ id, position }) => ({ id, position })));
  const firstRender = await page.evaluate(() => ({ stats: window.__atlas.terrain.tiles, camera: window.__atlas.travel.position }));
  await page.screenshot({ path: `${out}/01-fauna-closeup.png` });
  await page.locator('canvas').screenshot({ path: `${out}/01-fauna-canvas.png` });
  await page.waitForTimeout(1000);
  const second = await page.evaluate(() => window.__atlas.terrain.tiles.faunaDrawn.map(({ id, position }) => ({ id, position })));
  await page.screenshot({ path: `${out}/02-fauna-paused-repeat.png` });
  await page.locator('canvas').screenshot({ path: `${out}/02-fauna-canvas-repeat.png` });
  const secondRender = await page.evaluate(() => ({ stats: window.__atlas.terrain.tiles, camera: window.__atlas.travel.position }));
  const secondById = new Map(second.map(animal => [animal.id, animal.position]));
  const stable = first.length > 0 && first.every(animal => {
    const other = secondById.get(animal.id);
    return other && Math.hypot(...animal.position.map((value, i) => value - other[i])) < 1e-12;
  });
  const report = {
    ok: false, base, bodyId, targetId: nearest.id, sourceDistanceM: nearest.distanceM,
    nearRigReady, panelCollapsed,
    sourceGenome: nearest.genome, closeupEyeRelativeM: eye.toArray(), errors,
    drawnFirstFrame: first.length, drawnSecondFrame: second.length, stableIdsAndPositions: stable,
    walking: await page.evaluate(() => window.__atlas.travel.walking),
    firstRender: { faunaNear: firstRender.stats.faunaNear, faunaRigCount: firstRender.stats.faunaRigCount, faunaVisibleCount: firstRender.stats.faunaVisibleCount, faunaDrawnCount: firstRender.stats.faunaDrawn.length, allocatedBytes: firstRender.stats.faunaAllocatedBytes, camera: firstRender.camera },
    secondRender: { faunaNear: secondRender.stats.faunaNear, faunaRigCount: secondRender.stats.faunaRigCount, faunaVisibleCount: secondRender.stats.faunaVisibleCount, faunaDrawnCount: secondRender.stats.faunaDrawn.length, allocatedBytes: secondRender.stats.faunaAllocatedBytes, camera: secondRender.camera },
  };
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  assert.ok(first.some(animal => animal.id === nearest.id), 'target individual is visible in the close-up view');
  assert.ok(nearRigReady, 'near-body skinned rig is active in the close-up view');
  assert.ok(stable, 'paused consecutive frames preserve exact animal identities and positions');
  assert.deepEqual(errors, []);
  report.ok = true;
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  await writeFile(`${out}/failure.json`, JSON.stringify({ phase, failure: String(error), errors,
    state: await page.evaluate(() => ({ state: window.__atlas?.state, travel: window.__atlas?.travel,
      terrain: window.__atlas?.terrain?.tiles })).catch(() => null) }, null, 2));
  throw error;
} finally {
  await browser.close();
}

