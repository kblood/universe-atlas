/** Reproducible review corpus: four families × three inherited species × four
 * individuals × two growth stages. Run separately from the short smoke suite. */
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { browserArgs } from './browser-options.mjs';
import { acquireGpuLock } from './helpers/gpu-lock.mjs';

const url = new URL(process.env.ATLAS_URL || 'http://127.0.0.1:5186/creature-lab.html');
url.search = '?mode=skin';
const output = process.env.ATLAS_RESULTS || 'test-results/fauna-variation-corpus-2026-10-02';
await mkdir(output, { recursive: true });
const lock = await acquireGpuLock({ owner: 'fauna-variation-corpus', timeoutMs: 45000, retryMs: 5000 });
let browser;
const specimens = [], errors = [];
try {
  browser = await chromium.launch({ headless: true, args: browserArgs });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
  await page.goto(url.href, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: '.caption{display:none}' });
  const settle = async () => {
    await page.waitForFunction(() => window.__creatureLab?.ready && !window.__creatureLab.error);
    await page.evaluate(() => new Promise(resolve => {
      let frames = 0; const next = () => ++frames >= 4 ? resolve() : requestAnimationFrame(next); requestAnimationFrame(next);
    }));
    return page.evaluate(() => {
      const d = window.__creatureLab;
      return { state: d.specimenState, url: d.specimenUrl, individuals: d.individuals, skinDetails: d.skinDetails,
        poses: d.poses, renderer: d.renderer, cpuMs: d.cpuMs, fps: d.fps };
    });
  };
  await settle();
  const species = await page.evaluate(() => window.__creatureLab.world.species.filter(s => s.creature));
  const set = values => page.evaluate(values => {
    for (const [id, value] of Object.entries(values)) {
      const control = document.getElementById(id);
      if (typeof value === 'boolean') control.checked = value; else control.value = String(value);
    }
    document.getElementById('growth').dispatchEvent(new Event('change'));
    document.getElementById('skin-time').dispatchEvent(new Event('input'));
  }, values);
  for (const [archetype, family] of [['browser', 'ungulate'], ['runner', 'cursorial'], ['low-slung', 'padded'], ['long-neck', 'long-neck']]) {
    const familySpecies = species.filter(s => s.creature.archetype === archetype).slice(0, 3);
    assert.equal(familySpecies.length, 3);
    for (let s = 0; s < familySpecies.length; s++) {
      await page.selectOption('#species', familySpecies[s].id);
      for (let variant = 0; variant < 4; variant++) for (const growth of ['adult', 'juvenile']) {
        const name = `${family}-species${s + 1}-individual${variant + 1}-${growth}`;
        await set({ 'skin-family': family, variant, growth, 'skin-focus': 'body', 'skin-view': 'three-quarter', 'skin-pose': 'idle', 'skin-time': 3, neutral: false, skeleton: false });
        const sample = await settle();
        assert.equal(sample.skinDetails.length, 1); assert.equal(sample.skinDetails[0].version, 'quadruped-body-3');
        assert.equal(sample.individuals[0].genome.morphology.family, family);
        assert.deepEqual(sample.individuals[0].scale, [1, 1, 1]);
        await page.locator('#viewport').screenshot({ path: path.join(output, `${name}-body.png`) });
        await set({ 'skin-focus': 'head' }); await settle();
        await page.locator('#viewport').screenshot({ path: path.join(output, `${name}-face.png`) });
        await set({ 'skin-focus': 'body', 'skin-view': 'side', neutral: true }); await settle();
        await page.locator('#viewport').screenshot({ path: path.join(output, `${name}-neutral.png`) });
        await set({ 'skin-view': 'three-quarter', neutral: false, 'skin-pose': 'walk' });
        const walking = await settle();
        if (variant === 0) await page.locator('#viewport').screenshot({ path: path.join(output, `${name}-walk.png`) });
        specimens.push({ name, family, speciesIndex: s, variant, growth, ...sample, walking });
      }
    }
    console.log(`Captured ${family}: ${specimens.length}/96 specimens`);
  }
  assert.equal(specimens.length, 96); assert.deepEqual(errors, []);
  const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const css = 'body{margin:0;padding:20px;background:#08131a;color:#e1eee8;font:14px system-ui}h1{font-size:22px}p{color:#aac4be}.sheet{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.tile{background:#10242b;padding:8px}img{width:100%;display:block}.meta{font-size:11px;margin:6px 0}a{color:#9cdbcb}';
  const card = (s, src) => `<article class="tile"><img src="${src}" alt="${escape(s.name)}"><div class="meta">Species ${s.speciesIndex + 1} · individual ${s.variant + 1} · ${s.growth}<br>Torso ${s.individuals[0].genome.torsoLength.toFixed(2)} m · ${s.skinDetails[0].triangles} triangles</div><a href="${escape(s.url)}">Open specimen</a></article>`;
  await writeFile(path.join(output, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Fauna variation corpus</title><style>${css}</style><h1>96 production skin specimens</h1><p>Actual metre scale; each panel is framed independently. Use the lab comparison for a shared camera and scale. Body, face and neutral side views are retained beside this sheet. Idle and walk diagnostics are in report.json.</p><div class="sheet">${specimens.map(s => card(s, `${s.name}-body.png`)).join('')}</div>`);
  const sheet = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  for (const family of ['ungulate', 'cursorial', 'padded', 'long-neck']) {
    const members = specimens.filter(s => s.family === family);
    for (const view of ['body', 'neutral']) {
      const cards = [];
      for (const s of members) cards.push(card(s, `data:image/png;base64,${(await readFile(path.join(output, `${s.name}-${view}.png`))).toString('base64')}`));
      await sheet.setContent(`<style>${css}</style><h1>${family} · ${view} · 24 specimens</h1><p>Three species, four individuals and two life stages. Panels framed independently.</p><div class="sheet">${cards.join('')}</div>`);
      await sheet.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
      await sheet.screenshot({ path: path.join(output, `${family}-${view}-sheet.png`), fullPage: true });
    }
  }
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ ok: true, url: url.href, browserArgs, count: specimens.length, errors, specimens }, null, 2));
  console.log(JSON.stringify({ ok: true, specimens: specimens.length, output }));
} finally {
  await browser?.close(); await lock.release();
}
