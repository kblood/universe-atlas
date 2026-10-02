// Composer face close-up review sheets (manual review tool, like test:fauna-closeup; NOT in the npm test list).
//
//   node tests/fauna-face-closeups.browser.mjs --label before|after|wpN [--out <dir>] [--only <name|group,...>]
//        [--port 5231] [--live-presets] [--hold-budget-ms 22000]
//
// Builds every specimen of tests/fauna-face-specimens.json (frozen recipe TEXT, decoded by the current source, so
// later rounds see the same animals through recipe migration) on tests/fauna-face-closeups.html and writes:
//   <out>/<name>.png   one 1680 x 952 sheet per specimen: front, side (left), 3/4, top, left-eye macro (camera on
//                      the eye's outward normal at 4 x er) and the whole animal, with a recipe/constraint header;
//   <out>/report.json  deterministic numbers per specimen (part triangle counts, eye radius and placement,
//                      constraints, versions) - no timings, so two runs of the same source compare byte-equal;
//   <out>/run.json     timings, GPU-lock holds and console errors of this run;
//   <out>/contact.png  all sheets at 1/3 scale, labelled (ImageMagick montage when available, else a plain tiling).
// --only accepts specimen names and group names (preset, wild, custom, plausible, eye, eye-juvenile).
// --live-presets builds the 12 presets from composerPreset(id) instead of their frozen text (redesigned presets).
// Default --out is <main checkout>/test-results/fauna-face-eye-round-2026-10-02/<label>/ (the shared test-results,
// also when run from a git worktree).
//
// GPU: the browser only runs inside withGpuLock (tests/helpers/gpu-lock.mjs), in batches whose hold stays under
// --hold-budget-ms (default 22 s, hard limit 30 s per the round rules); the lock is released after every batch and on
// failure. Vite runs in-process on --port with strictPort and is closed at the end; the port is checked free.
// Renders use SwiftShader unless ATLAS_HARDWARE is set: specular highlights are not hardware-representative.
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {createServer as createNetServer} from 'node:net';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {deflateSync, crc32} from 'node:zlib';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {browserArgs} from './browser-options.mjs';
import {withGpuLock} from './helpers/gpu-lock.mjs';
import {decodePngRgba} from './helpers/png-rgba.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HARD_HOLD_MS = 30000;
const SHEET = {width: 1680, height: 952};

function args(argv) {
  const a = {label: null, out: null, only: null, port: 5231, livePresets: false, holdBudgetMs: 22000};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = () => { const x = argv[++i]; if (x === undefined) throw new Error(`${k} needs a value`); return x; };
    if (k === '--label') a.label = v();
    else if (k === '--out') a.out = resolve(v());
    else if (k === '--only') a.only = v().split(',').map(s => s.trim()).filter(Boolean);
    else if (k === '--port') a.port = Number(v());
    else if (k === '--live-presets') a.livePresets = true;
    else if (k === '--hold-budget-ms') a.holdBudgetMs = Math.min(Number(v()), HARD_HOLD_MS - 4000);
    else throw new Error(`Unknown argument ${k}`);
  }
  if (!a.label || !/^[\w.-]+$/.test(a.label)) throw new Error('--label <before|after|wpN> is required (letters, digits, . _ -)');
  if (!Number.isInteger(a.port) || a.port < 1024) throw new Error('--port must be an integer >= 1024');
  return a;
}

/** The main checkout's test-results (shared junction), also from a git worktree. */
function defaultOut(label) {
  let main = repo;
  try { main = resolve(repo, execFileSync('git', ['rev-parse', '--git-common-dir'], {cwd: repo, encoding: 'utf8'}).trim(), '..'); } catch {}
  return join(main, 'test-results', 'fauna-face-eye-round-2026-10-02', label);
}
const git = (...a) => { try { return execFileSync('git', a, {cwd: repo, encoding: 'utf8'}).trim(); } catch { return null; } };

const portFree = port => new Promise(res => {
  const s = createNetServer(); s.once('error', () => res(false)); s.listen(port, '127.0.0.1', () => s.close(() => res(true)));
});

function selectSpecimens(all, only) {
  if (!only) return all;
  const known = new Set([...all.map(s => s.name), ...all.map(s => s.group)]);
  const unknown = only.filter(o => !known.has(o));
  if (unknown.length) throw new Error(`--only: unknown specimen or group ${unknown.join(', ')}`);
  return all.filter(s => only.includes(s.name) || only.includes(s.group));
}

// ---- contact sheet -------------------------------------------------------------------------------------------
function magickPath() {
  const candidates = [process.env.MAGICK, 'C:/LLM/IWSDK/tools/bin/imagemagick/magick.exe'].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  try { execFileSync('magick', ['-version'], {stdio: 'ignore'}); return 'magick'; } catch { return null; }
}
function encodePngRgb(width, height, rgb) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) { raw[y * (width * 3 + 1)] = 0; rgb.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3); }
  const chunk = (name, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const nd = Buffer.concat([Buffer.from(name, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(nd) >>> 0); return Buffer.concat([len, nd, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function plainContact(files, outFile, cols = 6, k = 3) {
  const imgs = files.map(f => decodePngRgba(readFileSync(f)));
  const tw = Math.floor(SHEET.width / k), th = Math.floor(SHEET.height / k), rows = Math.ceil(imgs.length / cols), W = cols * tw, H = rows * th;
  const out = Buffer.alloc(W * H * 3, 17);
  imgs.forEach((img, n) => {
    const ox = (n % cols) * tw, oy = Math.floor(n / cols) * th;
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
      let r = 0, g = 0, b = 0, c = 0;
      for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) {
        const sx = x * k + dx, sy = y * k + dy; if (sx >= img.width || sy >= img.height) continue;
        const i = (sy * img.width + sx) * 4; r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; c++;
      }
      const o = ((oy + y) * W + ox + x) * 3; out[o] = r / c; out[o + 1] = g / c; out[o + 2] = b / c;
    }
  });
  writeFileSync(outFile, encodePngRgb(W, H, out));
  return 'plain tiling (node, unlabelled)';
}
function contactSheet(out, names) {
  const files = names.map(n => join(out, `${n}.png`)), target = join(out, 'contact.png'), magick = magickPath();
  if (magick) {
    try {
      const argv = ['montage'];
      for (const n of names) argv.push('-label', n, join(out, `${n}.png`));
      argv.push('-tile', '6x', '-geometry', `${Math.floor(SHEET.width / 3)}x${Math.floor(SHEET.height / 3)}+4+4`, '-background', '#111111', '-fill', '#eeeeee',
        '-pointsize', '16', '-define', 'png:exclude-chunks=date,time', '-strip', target);
      execFileSync(magick, argv, {stdio: 'pipe'});
      return `ImageMagick montage (${magick})`;
    } catch (error) { console.warn(`[closeups] montage failed (${error.message.split('\n')[0]}); using the plain tiling`); }
  }
  return plainContact(files, target);
}

// ---- main ----------------------------------------------------------------------------------------------------
const opt = args(process.argv.slice(2));
const out = opt.out ?? defaultOut(opt.label);
const specFile = JSON.parse(readFileSync(join(repo, 'tests', 'fauna-face-specimens.json'), 'utf8'));
const specimens = selectSpecimens(specFile.specimens, opt.only);
mkdirSync(out, {recursive: true});
// stale sheets of specimens no longer selected would make the file set differ between runs: clear this label's PNGs
// only when the full set is captured
if (!opt.only) for (const f of readdirSync(out)) if (f.endsWith('.png')) rmSync(join(out, f));

if (!await portFree(opt.port)) throw new Error(`Port ${opt.port} is in use; pass --port <free port>`);
const vite = await createServer({configFile: false, root: repo, logLevel: 'warn', appType: 'mpa',
  server: {host: '127.0.0.1', port: opt.port, strictPort: true, hmr: false, watch: null}});
const run = {schema: 'fauna-face-closeups-run-1', label: opt.label, out, port: opt.port, startedAt: new Date().toISOString(),
  commit: git('rev-parse', 'HEAD'), dirty: (git('status', '--porcelain') ?? '').length > 0, renderer: process.env.ATLAS_HARDWARE ? 'hardware' : 'swiftshader',
  livePresets: opt.livePresets, holdBudgetMs: opt.holdBudgetMs, holds: [], errors: [], perSpecimenMs: {}};
const results = new Map();
let failure = null;
try {
  await vite.listen();
  const origin = `http://127.0.0.1:${opt.port}`;
  // warm Vite's transform cache outside the GPU lock, so lock holds are spent rendering
  const warm = await fetch(`${origin}/tests/fauna-face-closeups.html`); if (!warm.ok) throw new Error(`page ${warm.status}`);
  for (const m of ['/src/fauna-composer.ts', '/src/fauna-composer-recipe.ts', '/src/fauna-coat-vocab.ts', '/src/fauna-review-environment.ts'])
    await vite.warmupRequest(m);
  await vite.transformRequest('/src/fauna-composer.ts');

  const queue = [...specimens];
  let batch = 0, lastPerSpecimen = 3000;
  while (queue.length) {
    batch++;
    await withGpuLock({owner: `fauna-face-closeups-${opt.label}`, retryMs: 15000, timeoutMs: 45 * 60 * 1000}, async () => {
      const t0 = Date.now(), done = [];
      const browser = await chromium.launch({headless: true, args: browserArgs});
      try {
        const page = await browser.newPage({viewport: SHEET, deviceScaleFactor: 1});
        page.on('pageerror', e => run.errors.push(`pageerror: ${e.message}`));
        page.on('console', m => { if (m.type() === 'error') run.errors.push(`console: ${m.text()}`); });
        await page.goto(`${origin}/tests/fauna-face-closeups.html`, {waitUntil: 'load'});
        await page.waitForFunction(() => window.faceCloseups?.ready, null, {timeout: 20000});
        // always render at least one specimen per hold; stop before the next one would overrun the budget
        while (queue.length && (done.length === 0 || Date.now() - t0 + lastPerSpecimen * 1.5 < opt.holdBudgetMs)) {
          const spec = queue.shift(), s0 = Date.now();
          const result = await page.evaluate(([s, o]) => window.faceCloseups.draw(s, o), [spec, {livePresets: opt.livePresets}]);
          await page.evaluate(() => new Promise(r => requestAnimationFrame(() => r())));
          await page.screenshot({path: join(out, `${spec.name}.png`)});
          results.set(spec.name, result); done.push(spec.name);
          lastPerSpecimen = Date.now() - s0; run.perSpecimenMs[spec.name] = lastPerSpecimen;
          console.log(`[closeups] ${spec.name} ${lastPerSpecimen} ms${result.eye ? ` er=${(result.eye.er * 1000).toFixed(1)}mm` : ' (no eyes)'}`);
        }
      } finally {
        await browser.close();
        const heldMs = Date.now() - t0;
        run.holds.push({batch, heldMs, specimens: done.length});
        console.log(`[closeups] batch ${batch}: ${done.length} specimens, GPU lock held ${heldMs} ms`);
      }
    });
  }
} catch (error) {
  failure = error;
} finally {
  await vite.close();
}
run.portFreeAfter = await portFree(opt.port);
run.finishedAt = new Date().toISOString();
run.maxHoldMs = Math.max(0, ...run.holds.map(h => h.heldMs));
run.holdsWithinLimit = run.holds.every(h => h.heldMs <= HARD_HOLD_MS);
if (!failure) {
  const ordered = specimens.map(s => results.get(s.name));
  const report = {schema: 'fauna-face-closeups-report-1', label: opt.label, specimens: ordered.length,
    specimenFile: {schema: specFile.schema, capturedAt: specFile.capturedAt}, livePresets: opt.livePresets,
    panels: ['front', 'side (left)', 'three-quarter (front-left)', 'top', 'eye macro (left eye, outward normal, 4 x er)', 'whole animal'],
    framing: 'posed head-group vertices (parts head, eyes, mouth, horn, trunk); headBounds() is only cross-checked when present',
    results: ordered};
  writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 1) + '\n');
  run.contact = contactSheet(out, specimens.map(s => s.name));
}
run.failure = failure ? String(failure.stack ?? failure) : null;
writeFileSync(join(out, 'run.json'), JSON.stringify(run, null, 1) + '\n');
console.log(`[closeups] ${results.size}/${specimens.length} sheets -> ${out}; max hold ${run.maxHoldMs} ms; port ${opt.port} free after: ${run.portFreeAfter}; errors ${run.errors.length}`);
if (failure) { console.error(failure); process.exit(1); }
if (run.errors.length || !run.holdsWithinLimit || !run.portFreeAfter) process.exit(1);
process.exit(0);
