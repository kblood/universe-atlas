import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { browserArgs } from './browser-options.mjs';
import { acquireGpuLock } from './helpers/gpu-lock.mjs';

const url = process.env.ATLAS_URL || 'http://127.0.0.1:5186/creature-lab.html?mode=skin';
const output = process.env.ATLAS_RESULTS || 'test-results/fauna-skin-2026-10-02';
await mkdir(output, { recursive: true });
const lock = await acquireGpuLock({ owner: 'fauna-skin-review', timeoutMs: 45000, retryMs: 5000 });
let browser;
const errors = [], samples = [];
try {
  browser = await chromium.launch({ headless: true, args: browserArgs });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
  await page.goto(url, { waitUntil: 'networkidle' });
  const settle = async () => {
    await page.waitForFunction(() => window.__creatureLab?.ready && !window.__creatureLab.error);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    return page.evaluate(() => {
      const d = window.__creatureLab;
      return { mode: d.mode, actorCount: d.actorCount, skinDetails: d.skinDetails, poses: d.poses, renderer: d.renderer };
    });
  };
  await settle();
  await page.selectOption('#mode', 'skin');
  const species = await page.evaluate(() => window.__creatureLab.world.species.filter(s => s.creature));
  for (const archetype of ['browser', 'runner', 'low-slung', 'long-neck']) {
    const specimen = species.find(s => s.creature.archetype === archetype);
    await page.selectOption('#species', specimen.id);
    await page.selectOption('#skin-focus', 'body');
    const adult = await settle();
    assert.equal(adult.actorCount, 1);
    assert.equal(adult.skinDetails.length, 1);
    assert.equal(adult.skinDetails[0].version, 'quadruped-body-2');
    assert.equal(adult.skinDetails[0].features.length, 6);
    assert.equal(adult.skinDetails[0].bones, 22);
    await page.screenshot({ path: path.join(output, `${archetype}-body.png`) });
    await page.selectOption('#skin-focus', 'head');
    await settle();
    await page.screenshot({ path: path.join(output, `${archetype}-face.png`) });
    await page.locator('#skin-time').fill('3');
    const first = await settle();
    await page.locator('#skin-time').fill('8');
    const moved = await settle();
    assert.notDeepEqual(moved.poses, first.poses);
    await page.locator('#skin-time').fill('3');
    const replay = await settle();
    assert.deepEqual(replay.poses, first.poses);
    await page.locator('#skeleton').check();
    await page.locator('#neutral').check();
    await settle();
    await page.screenshot({ path: path.join(output, `${archetype}-skeleton.png`) });
    await page.locator('#skeleton').uncheck();
    await page.locator('#neutral').uncheck();
    await page.selectOption('#growth', 'juvenile');
    const juvenile = await settle();
    await page.screenshot({ path: path.join(output, `${archetype}-juvenile-face.png`) });
    await page.selectOption('#growth', 'adult');
    samples.push({ archetype, adult, juvenile });
  }
  const baseline = (await settle()).renderer.memory;
  for (let i = 0; i < 4; i++) { await page.selectOption('#variant', String(i)); await settle(); }
  const after = (await settle()).renderer.memory;
  assert.deepEqual(after, baseline, 'rebuilding a specimen keeps geometry/texture counts stable');
  await page.locator('#date-myr').fill('-20000');
  await page.locator('#date-myr').press('Tab');
  const early = await settle();
  assert.equal(early.actorCount, 0, 'pre-life dates remain empty in production skin mode');
  await page.locator('#date-myr').fill('0'); await page.locator('#date-myr').press('Tab');
  await settle();
  await page.setViewportSize({ width: 390, height: 844 });
  await settle();
  assert.ok(await page.locator('#skin-focus').isVisible());
  await page.screenshot({ path: path.join(output, 'mobile.png') });
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ ok: true, url, browserArgs, samples, baseline, after, errors }, null, 2));
  console.log(JSON.stringify({ ok: true, archetypes: samples.length, baseline, after, output }));
} finally {
  await browser?.close();
  await lock.release();
}
