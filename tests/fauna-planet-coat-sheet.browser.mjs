/** Planet coat review sheet (fauna round WP6): the production skin of the four
 * planetary archetypes, individuals 1-4 at both growth stages, plus the six
 * explicit morphology families, rendered in the Creature Lab skin mode.
 *
 * Writes per-specimen PNGs, one contact sheet per archetype and view, a family
 * sheet, and report.json with the side-view RMSE between individuals 1 and 3
 * (the "variant 0 vs 2" individuality metric). Takes the machine-wide GPU lock
 * for the whole browser session. Not part of `npm test`.
 *
 *   ATLAS_URL=http://127.0.0.1:<port>/creature-lab.html ATLAS_RESULTS=<fresh dir> node tests/fauna-planet-coat-sheet.browser.mjs
 */
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { browserArgs } from './browser-options.mjs';
import { withGpuLock } from './helpers/gpu-lock.mjs';
import { decodePngRgba } from './helpers/png-rgba.mjs';

const url = new URL(process.env.ATLAS_URL || 'http://127.0.0.1:5186/creature-lab.html');
url.search = '?mode=skin';
const output = path.resolve(process.env.ATLAS_RESULTS || `test-results/fauna-planet-coat-sheet-${Date.now()}`);
await mkdir(output, { recursive: true });

const ARCHETYPES = ['browser', 'runner', 'low-slung', 'long-neck'];
const FAMILIES = ['ungulate', 'cursorial', 'padded', 'long-neck', 'proboscidean', 'winged'];

/** RMSE of two equally sized PNGs over RGB, as a fraction of full scale. */
function rmse(a, b) {
  const x = decodePngRgba(a), y = decodePngRgba(b);
  assert.equal(x.width, y.width); assert.equal(x.height, y.height);
  let sum = 0, n = 0;
  for (let i = 0; i < x.data.length; i += 4) for (let c = 0; c < 3; c++) { const d = (x.data[i + c] - y.data[i + c]) / 255; sum += d * d; n++; }
  return Math.sqrt(sum / n);
}

const report = { url: url.href, output, browserArgs, startedAt: new Date().toISOString(), specimens: [], families: [], rmse: {}, errors: [] };
await withGpuLock({ owner: 'fauna-planet-coat-sheet', retryMs: 15000, timeoutMs: 20 * 60 * 1000 }, async () => {
  const browser = await chromium.launch({ headless: true, args: browserArgs });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 820 } });
    page.on('pageerror', e => report.errors.push(e.message));
    page.on('console', e => { if (e.type() === 'error') report.errors.push(e.text()); });
    await page.goto(url.href, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: '.caption{display:none}' });
    const settle = async () => {
      await page.waitForFunction(() => window.__creatureLab?.ready && !window.__creatureLab.error);
      await page.evaluate(() => new Promise(resolve => { let f = 0; const next = () => ++f >= 4 ? resolve() : requestAnimationFrame(next); requestAnimationFrame(next); }));
      return page.evaluate(() => {
        const d = window.__creatureLab;
        return { url: d.specimenUrl, individuals: d.individuals, skinDetails: d.skinDetails };
      });
    };
    const set = values => page.evaluate(values => {
      for (const [id, value] of Object.entries(values)) {
        const control = document.getElementById(id);
        if (typeof value === 'boolean') control.checked = value; else control.value = String(value);
      }
      document.getElementById('growth').dispatchEvent(new Event('change'));
      document.getElementById('skin-time').dispatchEvent(new Event('input'));
    }, values);
    const shot = async name => { const file = path.join(output, `${name}.png`); await page.locator('#viewport').screenshot({ path: file }); return file; };
    await settle();
    const species = await page.evaluate(() => window.__creatureLab.world.species.filter(s => s.creature).map(s => ({ id: s.id, archetype: s.creature.archetype })));
    for (const archetype of ARCHETYPES) {
      const specimen = species.find(s => s.archetype === archetype);
      assert.ok(specimen, `a ${archetype} species exists`);
      await page.selectOption('#species', specimen.id);
      for (let variant = 0; variant < 4; variant++) for (const growth of ['adult', 'juvenile']) {
        const name = `${archetype}-v${variant}-${growth}`;
        await set({ 'skin-family': 'inherited', variant, growth, 'skin-focus': 'body', 'skin-view': 'side', 'skin-pose': 'idle', 'skin-time': 3, neutral: false, skeleton: false });
        const sample = await settle();
        const side = await shot(`${name}-side`);
        await set({ 'skin-view': 'three-quarter' }); await settle();
        const threeQuarter = await shot(`${name}-three-quarter`);
        const g = sample.individuals[0].genome, a = g.appearance ?? {};
        report.specimens.push({ name, archetype, variant, growth, side, threeQuarter, url: sample.url, version: sample.skinDetails[0]?.version,
          triangles: sample.skinDetails[0]?.triangles, color: g.color, accentColor: g.accentColor, hornLength: g.hornLength, torsoLength: g.torsoLength,
          headLength: g.headLength, legLength: g.legLength, family: g.morphology?.family, appearanceVersion: a.version, coat: a.coat ? { pattern: a.coat.pattern, marks: a.coat.marks, scale: a.coat.scale, juvenileSpots: a.coat.juvenileSpots } : null,
          sex: a.individual?.sex ?? null, maturity: a.growth?.maturity ?? null });
      }
      await set({ variant: 0, growth: 'adult', 'skin-focus': 'head', 'skin-view': 'three-quarter' }); await settle();
      await shot(`${archetype}-v0-adult-head`);
      await set({ growth: 'juvenile' }); await settle();
      await shot(`${archetype}-v0-juvenile-head`);
      const [v0, v2] = await Promise.all([0, 2].map(v => readFile(path.join(output, `${archetype}-v${v}-adult-side.png`))));
      report.rmse[archetype] = rmse(v0, v2);
    }
    const first = species.find(s => s.archetype === 'browser');
    await page.selectOption('#species', first.id);
    for (const family of FAMILIES) for (const growth of ['adult', 'juvenile']) {
      await set({ 'skin-family': family, variant: 1, growth, 'skin-focus': 'body', 'skin-view': 'three-quarter', 'skin-pose': 'idle', 'skin-time': 3, neutral: false, skeleton: false });
      const sample = await settle();
      assert.equal(sample.individuals[0].genome.morphology.family, family);
      const file = await shot(`family-${family}-${growth}`);
      report.families.push({ family, growth, file, url: sample.url, coat: sample.individuals[0].genome.appearance?.coat?.pattern ?? null });
    }
    // Contact sheets, composed in a second page of the same browser session.
    const sheet = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    const css = 'body{margin:0;padding:16px;background:#0b1418;color:#dfeee8;font:13px system-ui}h1{font-size:19px;margin:0 0 10px}.g{display:grid;gap:8px}.t{background:#132329;padding:6px}img{width:100%;display:block}.m{font-size:11px;margin-top:4px;color:#b9d2cc}';
    const data = async file => `data:image/png;base64,${(await readFile(file)).toString('base64')}`;
    const tile = async (file, caption) => `<div class="t"><img src="${await data(file)}"><div class="m">${caption}</div></div>`;
    const compose = async (title, columns, tiles, name) => {
      await sheet.setContent(`<style>${css}</style><h1>${title}</h1><div class="g" style="grid-template-columns:repeat(${columns},1fr)">${tiles.join('')}</div>`);
      await sheet.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
      const file = path.join(output, `${name}.png`); await sheet.screenshot({ path: file, fullPage: true }); return file;
    };
    report.sheets = [];
    for (const archetype of ARCHETYPES) for (const view of ['side', 'threeQuarter']) {
      const members = report.specimens.filter(s => s.archetype === archetype);
      const ordered = [...members.filter(s => s.growth === 'adult'), ...members.filter(s => s.growth === 'juvenile')];
      const tiles = [];
      for (const s of ordered) tiles.push(await tile(s[view], `${s.growth} · individual ${s.variant + 1} · ${s.sex ?? '-'}${s.maturity !== null && s.growth === 'juvenile' ? ` · m ${Number(s.maturity).toFixed(2)}` : ''} · ${s.coat ? `${s.coat.pattern} marks ${s.coat.marks}` : 'legacy coat'} · horn ${s.hornLength}`));
      report.sheets.push(await compose(`${archetype} · ${view === 'side' ? 'side' : 'three-quarter'} · individuals 1-4, adult (top) and juvenile (bottom)`, 4, tiles, `sheet-${archetype}-${view}`));
    }
    const heads = [];
    for (const archetype of ARCHETYPES) for (const growth of ['adult', 'juvenile']) heads.push(await tile(path.join(output, `${archetype}-v0-${growth}-head.png`), `${archetype} · ${growth} head`));
    report.sheets.push(await compose('Heads · individual 1, adult and juvenile', 4, heads, 'sheet-heads'));
    const families = [];
    for (const f of report.families) families.push(await tile(f.file, `${f.family} · ${f.growth} · ${f.coat ?? 'legacy coat'}`));
    report.sheets.push(await compose('Family overrides (first browser species, individual 2)', 4, families, 'sheet-families'));
  } finally { await browser.close(); }
});
report.finishedAt = new Date().toISOString();
await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.errors.length === 0, output, rmse: report.rmse, errors: report.errors.slice(0, 5) }));
assert.deepEqual(report.errors, []);
