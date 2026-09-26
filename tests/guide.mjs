// Built-site smoke check: nested deployment paths, every guide link, responsive
// layout, no-JS reading and exact era bookmarks. No simulation/GPU test implied.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';
import { browserArgs } from './browser-options.mjs';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const reports = process.env.ATLAS_RESULTS || fileURLToPath(new URL('../test-results/guide/', import.meta.url));
const deployed = process.env.ATLAS_URL ? new URL(process.env.ATLAS_URL) : null;
const prefix = deployed ? `${deployed.pathname.replace(/\/$/, '')}/` : '/webxr/IWSDK/universe-atlas/';
const chapters = ['index', 'determinism', 'time', 'universe', 'terrain', 'water-atmosphere', 'life', 'travel', 'publishing'];
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.md': 'text/plain' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith(prefix)) { res.writeHead(404).end(); return; }
    const relative = decodeURIComponent(url.pathname.slice(prefix.length));
    const file = path.resolve(root, relative.endsWith('/') || !relative ? `${relative}index.html` : relative);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end(); }
});
if (!deployed) await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = deployed?.origin || `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  await mkdir(reports, { recursive: true });
  browser = await chromium.launch({ headless: true, args: browserArgs });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  const checked = new Set();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const chapter of chapters) {
      await page.goto(`${origin}${prefix}guide/${chapter}.html`);
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('[aria-current="page"]').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${chapter}: horizontal overflow at ${width}`);
      const links = await page.locator('a[href]').evaluateAll(anchors => anchors.map(a => a.href));
      for (const href of links) {
        const url = new URL(href);
        if (url.origin !== origin || !url.pathname.startsWith(prefix)) continue;
        if (url.pathname.endsWith(`${chapter}.html`) && url.hash) {
          assert.equal(await page.locator(`[id="${url.hash.slice(1)}"]`).count(), 1, `Missing anchor ${href}`);
        }
        url.hash = ''; url.search = '';
        if (checked.has(url.href)) continue;
        const response = await context.request.get(url.href);
        assert.equal(response.status(), 200, `Broken guide link ${url.href}`);
        checked.add(url.href);
      }
      if (width !== 320 && ['index', 'terrain', 'time'].includes(chapter)) {
        await page.screenshot({ path: path.join(reports, `${chapter}-${width}.png`), fullPage: true });
      }
    }
  }
  await page.goto(`${origin}${prefix}guide/time.html`);
  await page.locator('#era-explorer').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#era-select option').count(), 10);
  for (const [index, expectedNs] of [
    [0, 0n], [1, 1_000_000_000n], [5, 13_787_000_000n * 31_557_600_000_000_000n],
    [9, 10n ** 100n * 31_557_600_000_000_000n],
  ]) {
    await page.locator('#era-select').selectOption(String(index));
    const url = new URL(await page.locator('#era-visit').getAttribute('href'), page.url());
    assert.equal(url.pathname, prefix);
    assert.equal(url.searchParams.get('date'), index === 5 ? null : expectedNs.toString());
    assert.ok(url.searchParams.get('wv').startsWith('atlas-time-2,'));
    assert.ok(url.searchParams.get('mv'));
    assert.ok(url.searchParams.get('bv'));
    assert.equal(await page.locator('#era-slider').inputValue(), String(index));
  }
  await page.locator('#era-slider').fill('2');
  assert.equal(await page.locator('#era-select').inputValue(), '2');
  assert.equal(errors.length, 0, errors.join('\n'));

  const plain = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 800 } });
  const reading = await plain.newPage();
  await reading.goto(`${origin}${prefix}guide/time.html`);
  assert.equal(await reading.locator('#eras tbody tr').count(), 10);
  await reading.getByRole('link', { name: 'Terrain generation', exact: false }).click();
  assert.ok(reading.url().endsWith('/guide/terrain.html'));
  await reading.goto(`${origin}${prefix}`);
  const gameLink = reading.locator('.view-actions a[href="./guide/index.html"]');
  assert.equal(await gameLink.count(), 1);
  assert.equal(await gameLink.getAttribute('target'), '_blank');
  const bounds = await gameLink.boundingBox();
  assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 320, 'Game guide link fits at 320 px');
  const popupPromise = plain.waitForEvent('page');
  await gameLink.click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  assert.ok(popup.url().endsWith('/guide/index.html'));
  if (deployed) {
    // Exercise the real app reached from the guide, including both extremes.
    await page.goto(`${origin}${prefix}`);
    await page.waitForFunction(() => window.__atlas?.ready, null, { timeout: 60000 });
    const opened = context.waitForEvent('page');
    await page.locator('.view-actions a[href="./guide/index.html"]').click();
    const guide = await opened;
    await guide.waitForLoadState();
    assert.ok(guide.url().endsWith('/guide/index.html'));
    await guide.close();
    for (const index of [0, 5, 9]) {
      await page.goto(`${origin}${prefix}guide/time.html`);
      await page.locator('#era-select').selectOption(String(index));
      const label = await page.locator('#era-title').textContent();
      const target = new URL(await page.locator('#era-visit').getAttribute('href'), page.url());
      const expected = target.searchParams.get('date') || (13_787_000_000n * 31_557_600_000_000_000n).toString();
      await page.goto(target.href);
      await page.waitForFunction(() => window.__atlas?.ready, null, { timeout: 60000 });
      assert.equal(await page.evaluate(() => window.__atlas.date.offsetNs), expected);
      assert.equal(await page.locator('#era-label').textContent(), label);
      await page.screenshot({ path: path.join(reports, `live-era-${index}.png`) });
    }
  }
  assert.deepEqual(errors, []);
  await writeFile(path.join(reports, 'guide-report.json'), JSON.stringify({
    base: `${origin}${prefix}`, chapters: chapters.length, widths: [1440, 390, 320],
    internalDestinations: checked.size, deployedRuntimeChecked: !!deployed, errors,
  }, null, 2));
  console.log(`Guide passed: ${chapters.length} chapters at 3 widths; ${checked.size} internal destinations; exact era links; no-JS reading; in-game link. Screenshots: ${reports}`);
} finally {
  await browser?.close();
  if (server.listening) await new Promise(resolve => server.close(resolve));
}
