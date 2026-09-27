import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserArgs } from './browser-options.mjs';
import { encodeVersions, CURRENT_VERSIONS } from '../src/time-nav.ts';

const base = process.env.ATLAS_URL || 'http://127.0.0.1:5188/';
const out = process.env.ATLAS_RESULTS || 'test-results/fauna-closeup';
const bodyId = 'G001/C2128,0,1/0/planet/1';
const params = new URLSearchParams({ seed: 'LETHRA-001', g: 'G001', system: 'G001/C2128,0,1/0', body: bodyId });
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: browserArgs });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const waitFor = (predicate, timeout = 180000, arg) => page.waitForFunction(predicate, arg, { timeout });

try {
  await page.goto(`${base}?${params}`, { waitUntil: 'networkidle' });
  await waitFor(id => window.__atlas?.ready && window.__atlas.state.level === 'body' &&
    window.__atlas.state.body?.id === id && window.__atlas.terrain?.tiles?.ready && !window.__atlas.camera.animating, 180000, bodyId);
  await page.waitForTimeout(800);
  await page.locator('#find-life').click();
  await waitFor(() => window.__atlas.travel.terrainCruise !== null && window.__atlas.terrain?.tiles?.surfaceReady &&
    window.__atlas.terrain.tiles.forest.visible > 200);
  await page.keyboard.down('q');
  await waitFor(() => window.__atlas.travel.surface?.terrainClearance < 110);
  await page.keyboard.up('q');
  await waitFor(() => window.__atlas.terrain.tiles.faunaVisibleCount > 0 && window.__atlas.terrain.tiles.faunaDrawn.length > 0);
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
  const up = nearest.local.clone().normalize();
  const reference = Math.abs(up.y) > .92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3().crossVectors(reference, up).normalize();
  const eye = nearest.local.clone().addScaledVector(tangent, 8).addScaledVector(up, 1.64);
  const lookTarget = nearest.local.clone().addScaledVector(up, 1.0);
  const orientation = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(eye, lookTarget, up),
  );
  const closeupParams = new URLSearchParams(params);
  closeupParams.set('walk', eye.toArray().join(','));
  closeupParams.set('heading', orientation.toArray().join(','));
  closeupParams.set('date', source.date);
  closeupParams.set('wv', encodeVersions(CURRENT_VERSIONS));
  await page.goto(`${base}?${closeupParams}`, { waitUntil: 'networkidle' });
  await waitFor(id => window.__atlas?.ready && window.__atlas.state.level === 'body' &&
    window.__atlas.state.body?.id === id && window.__atlas.terrain?.tiles?.ready, 180000, bodyId);
  await waitFor(id => window.__atlas.travel.walking?.grounded &&
    window.__atlas.terrain.tiles.faunaDrawn.some(animal => animal.id === id), 180000, nearest.id);
  await page.evaluate(() => window.__atlas.setExplorationPaused(true));
  const first = await page.evaluate(() => window.__atlas.terrain.tiles.faunaDrawn.map(({ id, position }) => ({ id, position })));
  await page.screenshot({ path: `${out}/01-fauna-closeup.png` });
  await page.waitForTimeout(1000);
  const second = await page.evaluate(() => window.__atlas.terrain.tiles.faunaDrawn.map(({ id, position }) => ({ id, position })));
  await page.screenshot({ path: `${out}/02-fauna-paused-repeat.png` });
  const secondById = new Map(second.map(animal => [animal.id, animal.position]));
  const stable = first.length > 0 && first.every(animal => {
    const other = secondById.get(animal.id);
    return other && Math.hypot(...animal.position.map((value, i) => value - other[i])) < 1e-12;
  });
  const report = {
    ok: false, base, bodyId, targetId: nearest.id, sourceDistanceM: nearest.distanceM,
    sourceGenome: nearest.genome, closeupEyeRelativeM: eye.toArray(), errors,
    drawnFirstFrame: first.length, drawnSecondFrame: second.length, stableIdsAndPositions: stable,
    walking: await page.evaluate(() => window.__atlas.travel.walking),
  };
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  assert.ok(first.some(animal => animal.id === nearest.id), 'target individual is visible in the close-up view');
  assert.ok(stable, 'paused consecutive frames preserve exact animal identities and positions');
  assert.deepEqual(errors, []);
  report.ok = true;
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  await writeFile(`${out}/failure.json`, JSON.stringify({ failure: String(error), errors,
    state: await page.evaluate(() => ({ state: window.__atlas?.state, travel: window.__atlas?.travel,
      terrain: window.__atlas?.terrain?.tiles })).catch(() => null) }, null, 2));
  throw error;
} finally {
  await browser.close();
}
