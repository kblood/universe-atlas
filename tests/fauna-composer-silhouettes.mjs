#!/usr/bin/env node
// CPU side-view / three-quarter rasteriser for composer herds. No browser, no GPU lock.
// Builds creatures in Node with createComposerCreature, rasterises the bind-pose skin
// orthographically with a z-buffer (vertex colour x Lambert(0.35 + 0.65 max(0, n.l))),
// at a fixed metres-per-pixel shared by every cell, and writes PNGs with node:zlib.
//
//   node tests/fauna-composer-silhouettes.mjs --preset giraffe,rhinoceros --herd 12 --seedBase 1 --maturityRow --out <new dir>
//
// Options: --preset a,b (ids) | --recipe <encoded text>; --herd N; --seedBase S; --maturityRow;
//   --views side,three-quarter; --cell 300; --mpp 0.02 | giraffe=0.02,rhinoceros=0.015;
//   --set key=value,key=value (recipe overrides, e.g. dimorphism=0.8); --sexRow (female/male pair at seedBase).
//   --coherent N [--coherentBase S] [--coherentIndividual I]: a sheet of N coherent random species
//   (randomCoherentComposerRecipe seeds S..S+N-1), each cell fitted to its animal.
// The output directory must not exist (evidence is never overwritten). Other packages run this read-only.
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateSync} from 'node:zlib';
import * as recipeModule from '../src/fauna-composer-recipe.ts';
import {createComposerCreature} from '../src/fauna-composer.ts';

const {composerPreset, decodeComposerRecipe, normalizeComposerRecipe, encodeComposerRecipe, COMPOSER_RECIPE_VERSION} = recipeModule;

// ---------------------------------------------------------------- PNG
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4), body = Buffer.concat([Buffer.from(type, 'ascii'), data]), crc = Buffer.alloc(4); len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(body)); return Buffer.concat([len, body, crc]); };
export function encodePng(width, height, rgb) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) { raw[y * (width * 3 + 1)] = 0; Buffer.from(rgb.buffer, rgb.byteOffset + y * width * 3, width * 3).copy(raw, y * (width * 3 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, {level: 9})), chunk('IEND', Buffer.alloc(0))]);
}

// ---------------------------------------------------------------- 3x5 font for labels
/** 3x5 glyphs, five rows of three columns separated by spaces. */
const GLYPHS = Object.fromEntries(Object.entries({
  '0': '### #.# #.# #.# ###', '1': '.#. ##. .#. .#. ###', '2': '### ..# ### #.. ###', '3': '### ..# .## ..# ###', '4': '#.# #.# ### ..# ..#', '5': '### #.. ### ..# ###',
  '6': '### #.. ### #.# ###', '7': '### ..# ..# .#. .#.', '8': '### #.# ### #.# ###', '9': '### #.# ### ..# ###', 'a': '.#. #.# ### #.# #.#', 'b': '##. #.# ##. #.# ##.',
  'c': '.## #.. #.. #.. .##', 'd': '##. #.# #.# #.# ##.', 'e': '### #.. ##. #.. ###', 'f': '### #.. ##. #.. #..', 'g': '.## #.. #.# #.# .##', 'h': '#.# #.# ### #.# #.#',
  'i': '### .#. .#. .#. ###', 'j': '..# ..# ..# #.# .#.', 'k': '#.# #.# ##. #.# #.#', 'l': '#.. #.. #.. #.. ###', 'm': '#.# ### ### #.# #.#', 'n': '##. #.# #.# #.# #.#',
  'o': '.#. #.# #.# #.# .#.', 'p': '##. #.# ##. #.. #..', 'q': '.#. #.# #.# ##. .##', 'r': '##. #.# ##. #.# #.#', 's': '.## #.. .#. ..# ##.', 't': '### .#. .#. .#. .#.',
  'u': '#.# #.# #.# #.# ###', 'v': '#.# #.# #.# #.# .#.', 'w': '#.# #.# ### ### #.#', 'x': '#.# #.# .#. #.# #.#', 'y': '#.# #.# .#. .#. .#.', 'z': '### ..# .#. #.. ###',
  '.': '... ... ... ... .#.', '-': '... ... ### ... ...', ':': '... .#. ... .#. ...', '/': '..# ..# .#. #.. #..', '=': '... ### ... ### ...', ' ': '... ... ... ... ...',
  '%': '#.# ..# .#. #.. #.#', '(': '.#. #.. #.. #.. .#.', ')': '.#. ..# ..# ..# .#.', ',': '... ... ... .#. #..', '+': '... .#. ### .#. ...', '#': '#.# ### #.# ### #.#',
  '>': '#.. .#. ..# .#. #..', '<': '..# .#. #.. .#. ..#',
}).map(([k, v]) => [k, v.replace(/ /g, '')]));
function drawText(img, W, x, y, text, color, scale = 2) {
  for (const ch of String(text).toLowerCase()) {
    const g = GLYPHS[ch] ?? GLYPHS[' '];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r * 3 + c] === '#')
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) { const px = x + c * scale + dx, py = y + r * scale + dy; if (px >= 0 && py >= 0 && px < W && py * W + px < img.length / 3) img.set(color, (py * W + px) * 3); }
    x += 4 * scale;
  }
}

// ---------------------------------------------------------------- rasteriser
const VIEWS = {
  side: {yaw: 0, elevation: 0},
  'three-quarter': {yaw: -Math.PI / 4, elevation: Math.atan2(0.42, Math.SQRT2)},
};
/** World (+X forward, +Y up, +Z right) to camera (x right, y up, z toward viewer). */
function viewTransform(view) {
  const {yaw, elevation} = VIEWS[view];
  const cy = Math.cos(yaw), sy = Math.sin(yaw), ce = Math.cos(elevation), se = Math.sin(elevation);
  return (x, y, z) => { const x1 = x * cy + z * sy, z1 = -x * sy + z * cy; return [x1, y * ce - z1 * se, y * se + z1 * ce]; };
}
const LIGHT = (() => { const l = [-0.35, 0.75, 0.55], n = Math.hypot(...l); return l.map(v => v / n); })();
const SRGB = c => { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; return Math.max(0, Math.min(255, Math.round(v * 255))); };

/** Rasterises a skin into an RGB cell. `ss` supersampling; origin (0,0,0) maps to (ox, oy) in cell pixels. */
export function rasterSkin(skin, {view = 'side', mpp, width, height, ox, oy, ss = 2, background = [0.93, 0.93, 0.9]}) {
  const W = width * ss, H = height * ss, toCam = viewTransform(view), pxm = ss / mpp;
  const color = new Float32Array(W * H * 3), depth = new Float32Array(W * H).fill(-Infinity), cover = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) color.set(background, i * 3);
  const n = skin.vertexCount, sx = new Float32Array(n), sy = new Float32Array(n), sz = new Float32Array(n), cam = new Float32Array(n * 3);
  for (let v = 0; v < n; v++) {
    const [x, y, z] = toCam(skin.positions[v * 3], skin.positions[v * 3 + 1], skin.positions[v * 3 + 2]);
    cam[v * 3] = x; cam[v * 3 + 1] = y; cam[v * 3 + 2] = z;
    sx[v] = ox * ss + x * pxm; sy[v] = oy * ss - y * pxm; sz[v] = z;
  }
  const idx = skin.index, col = skin.colors;
  let drawn = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    const ux = cam[b * 3] - cam[a * 3], uy = cam[b * 3 + 1] - cam[a * 3 + 1], uz = cam[b * 3 + 2] - cam[a * 3 + 2];
    const vx = cam[c * 3] - cam[a * 3], vy = cam[c * 3 + 1] - cam[a * 3 + 1], vz = cam[c * 3 + 2] - cam[a * 3 + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const nl = Math.hypot(nx, ny, nz); if (nl === 0) continue;
    nx /= nl; ny /= nl; nz /= nl; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; } // shade the side facing the viewer
    const shade = 0.35 + 0.65 * Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
    const x0 = sx[a], y0 = sy[a], x1 = sx[b], y1 = sy[b], x2 = sx[c], y2 = sy[c];
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0); if (Math.abs(area) < 1e-12) continue;
    const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2))), maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2))), maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
    for (let py = minY; py <= maxY; py++) for (let px = minX; px <= maxX; px++) {
      const qx = px + 0.5, qy = py + 0.5;
      const w0 = ((x1 - qx) * (y2 - qy) - (x2 - qx) * (y1 - qy)) / area, w1 = ((x2 - qx) * (y0 - qy) - (x0 - qx) * (y2 - qy)) / area, w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const z = w0 * sz[a] + w1 * sz[b] + w2 * sz[c], k = py * W + px;
      if (z <= depth[k]) continue;
      depth[k] = z; cover[k] = 1; drawn++;
      for (let ch = 0; ch < 3; ch++) color[k * 3 + ch] = (w0 * col[a * 3 + ch] + w1 * col[b * 3 + ch] + w2 * col[c * 3 + ch]) * shade;
    }
  }
  // box-filter downsample, sRGB encode
  const out = new Uint8Array(width * height * 3), mask = new Float32Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const acc = [0, 0, 0]; let m = 0;
    for (let dy = 0; dy < ss; dy++) for (let dx = 0; dx < ss; dx++) { const k = (y * ss + dy) * W + x * ss + dx; for (let ch = 0; ch < 3; ch++) acc[ch] += color[k * 3 + ch]; m += cover[k]; }
    for (let ch = 0; ch < 3; ch++) out[(y * width + x) * 3 + ch] = SRGB(acc[ch] / (ss * ss));
    mask[y * width + x] = m / (ss * ss);
  }
  return {rgb: out, mask, drawn};
}

/** Projected bounds of a skin in a view (metres, camera x/y). */
export function projectedBounds(skin, view) {
  const toCam = viewTransform(view); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let v = 0; v < skin.vertexCount; v++) { const [x, y] = toCam(skin.positions[v * 3], skin.positions[v * 3 + 1], skin.positions[v * 3 + 2]); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return {x0, x1, y0, y1};
}

// ---------------------------------------------------------------- CLI
function parseArgs(argv) {
  const o = {coherent: 0, coherentBase: 0, coherentIndividual: 0, preset: [], herd: 12, seedBase: 1, maturityRow: false, sexRow: false, views: ['side', 'three-quarter'], cell: 300, mpp: {}, set: {}, recipe: null, out: null};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => { const v = argv[++i]; if (v === undefined) throw new Error(`${a} needs a value`); return v; };
    if (a === '--preset') o.preset.push(...next().split(',').filter(Boolean));
    else if (a === '--recipe') o.recipe = next();
    else if (a === '--herd') o.herd = Math.max(1, Math.min(48, Math.floor(Number(next()))));
    else if (a === '--seedBase') o.seedBase = Math.max(0, Math.floor(Number(next())));
    else if (a === '--maturityRow') o.maturityRow = true;
    else if (a === '--sexRow') o.sexRow = true;
    else if (a === '--views') o.views = next().split(',').filter(v => v in VIEWS);
    else if (a === '--cell') o.cell = Math.max(120, Math.min(800, Math.floor(Number(next()))));
    else if (a === '--mpp') { const v = next(); if (/^[\d.]+$/.test(v)) o.mpp['*'] = Number(v); else for (const kv of v.split(',')) { const [k, x] = kv.split('='); o.mpp[k] = Number(x); } }
    else if (a === '--set') for (const kv of next().split(',')) { const [k, x] = kv.split('='); o.set[k] = x !== undefined && x.trim() !== '' && Number.isFinite(Number(x)) ? Number(x) : x; }
    else if (a === '--out') o.out = next();
    else if (a === '--coherent') o.coherent = Math.max(1, Math.min(48, Math.floor(Number(next()))));
    else if (a === '--coherentBase') o.coherentBase = Math.max(0, Math.floor(Number(next())));
    else if (a === '--coherentIndividual') o.coherentIndividual = Math.max(0, Math.min(9999, Math.floor(Number(next()))));
    else throw new Error(`Unknown option ${a}`);
  }
  if (!o.out) throw new Error('--out <new directory> is required');
  if (!o.preset.length && !o.recipe) o.preset = ['giraffe'];
  return o;
}

function build(recipeLike) {
  const creature = createComposerCreature(recipeLike);
  try {
    const ind = creature.individual;
    return {skin: {positions: creature.skin.positions.slice(), colors: creature.skin.colors.slice(), index: creature.skin.index.slice(), vertexCount: creature.skin.vertexCount, triangleCount: creature.skin.triangleCount},
      info: {triangles: creature.skin.triangleCount, vertices: creature.skin.vertexCount, bones: creature.graph.bones.length, bodyLength: creature.graph.recipe.bodyLength,
        effective: ind ? encodeComposerRecipe(ind.effectiveRecipe) : null, sex: ind?.traits?.sex ?? null, maturity: ind?.traits?.maturity ?? null, deltas: ind?.deltas ?? null}};
  } finally { creature.dispose(); }
}

function renderSheet(name, species, opts, view, mpp) {
  const cells = [];
  for (let k = 0; k < opts.herd; k++) cells.push({label: `#${opts.seedBase + k}`, recipe: {...species, individualSeed: opts.seedBase + k}});
  const rows = [];
  rows.push({title: 'individuals', cells});
  if (opts.sexRow) rows.push({title: 'sex (same seed)', cells: ['female', 'male'].map(sex => ({label: sex, recipe: {...species, individualSeed: opts.seedBase, sex}}))});
  if (opts.maturityRow) rows.push({title: 'maturity (same individual)', cells: [0.25, 0.5, 0.75, 1].map(m => ({label: `m ${m}`, recipe: {...species, individualSeed: opts.seedBase, maturity: m}}))});
  const C = opts.cell, cols = Math.min(6, Math.max(4, ...rows.map(r => Math.min(6, r.cells.length)))), labelH = 22, titleH = 40, rowTitleH = 18;
  const built = rows.map(r => r.cells.map(c => ({...c, ...build(c.recipe)})));
  // shared origin: from the union of projected bounds, so every animal stands on one ground line at one scale
  let ux0 = Infinity, ux1 = -Infinity, uy0 = Infinity, uy1 = -Infinity;
  for (const row of built) for (const c of row) { const b = projectedBounds(c.skin, view); ux0 = Math.min(ux0, b.x0); ux1 = Math.max(ux1, b.x1); uy0 = Math.min(uy0, b.y0); uy1 = Math.max(uy1, b.y1); }
  const ox = C / 2 - ((ux0 + ux1) / 2) / mpp, oy = C - 10 + uy0 / mpp - ((C - 20) - (uy1 - uy0) / mpp) / 2;
  const gridRows = rows.reduce((a, r) => a + Math.ceil(r.cells.length / cols), 0) + 1; // +1 overlay row
  const W = cols * C, H = titleH + gridRows * (C + labelH) + rows.length * rowTitleH + rowTitleH;
  const img = new Uint8Array(W * H * 3).fill(250);
  drawText(img, W, 8, 8, `${name} - ${view} - ${mpp} m/px - cell ${(C * mpp).toFixed(2)} m - recipe v${COMPOSER_RECIPE_VERSION}`, [20, 20, 20], 2);
  drawText(img, W, 8, 22, Object.keys(opts.set).length ? `set ${Object.entries(opts.set).map(([k, v]) => `${k}=${v}`).join(',')}` : 'grid line = ground y 0, ticks every 0.5 m', [90, 90, 90], 2);
  let y = titleH; const overlay = new Float32Array(C * C);
  const meta = [];
  for (let r = 0; r < rows.length; r++) {
    drawText(img, W, 8, y + 3, rows[r].title, [60, 60, 120], 2); y += rowTitleH;
    built[r].forEach((c, i) => {
      const cx = (i % cols) * C, cy = y + Math.floor(i / cols) * (C + labelH);
      const {rgb, mask} = rasterSkin(c.skin, {view, mpp, width: C, height: C, ox, oy});
      for (let py = 0; py < C; py++) for (let px = 0; px < C; px++) img.set(rgb.subarray((py * C + px) * 3, (py * C + px) * 3 + 3), ((cy + py) * W + cx + px) * 3);
      if (r === 0) for (let k = 0; k < C * C; k++) overlay[k] += mask[k];
      // ground line and 0.5 m ticks (side view only: the ground is a line there)
      if (view === 'side') { const gy = Math.round(oy); if (gy >= 0 && gy < C) for (let px = 0; px < C; px++) img.set([120, 120, 110], ((cy + gy) * W + cx + px) * 3);
        for (let m = -20; m <= 20; m++) { const tx = Math.round(ox + m * 0.5 / mpp); if (tx >= 0 && tx < C) for (let d = 1; d <= (m % 2 ? 3 : 6); d++) if (gy + d < C) img.set([120, 120, 110], ((cy + gy + d) * W + cx + tx) * 3); } }
      for (let px = 0; px < C; px++) { img.set([200, 200, 195], (cy * W + cx + px) * 3); }
      for (let py = 0; py < C; py++) { img.set([200, 200, 195], ((cy + py) * W + cx) * 3); }
      const L = c.info.bodyLength.toFixed(2), sex = c.info.sex && c.info.sex !== 'none' ? ` ${c.info.sex[0]}` : '', mat = c.info.maturity !== null && c.info.maturity !== 1 ? ` m${c.info.maturity}` : '';
      drawText(img, W, cx + 4, cy + C + 4, `${c.label}${sex}${mat} l=${L}m ${c.info.triangles}t`, [30, 30, 30], 2);
      meta.push({row: rows[r].title, label: c.label, input: encodeComposerRecipe(normalizeComposerRecipe(c.recipe).recipe), ...c.info});
    });
    y += Math.ceil(built[r].length / cols) * (C + labelH);
  }
  // overlay of every individual's silhouette: darker = more animals cover that pixel
  drawText(img, W, 8, y + 3, `silhouette overlay of the ${built[0].length} individuals (dark = all agree, grey = spread)`, [60, 60, 120], 2); y += rowTitleH;
  const n = built[0].length;
  for (let py = 0; py < C; py++) for (let px = 0; px < C; px++) { const f = overlay[py * C + px] / n, v = Math.round(245 - 205 * f); img.set([v, v, v + (f > 0 && f < 1 ? 10 : 0)], ((y + py) * W + px) * 3); }
  return {png: encodePng(W, H, img), meta, width: W, height: H};
}

/** Coherent random species, one type specimen per cell, each cell scaled to fit its animal (scale bar per cell). */
async function renderSpeciesSheet(opts, view) {
  const {coherentComposerSpecies} = await import('../src/fauna-composer-species.ts');
  const C = opts.cell, cols = 6, labelH = 34, titleH = 40, n = opts.coherent;
  const rows = Math.ceil(n / cols), W = cols * C, H = titleH + rows * (C + labelH);
  const img = new Uint8Array(W * H * 3).fill(250), meta = [];
  drawText(img, W, 8, 8, `coherent species ${opts.coherentBase}..${opts.coherentBase + n - 1} - ${view} - each cell fitted; bar = 0.5 m`, [20, 20, 20], 2);
  drawText(img, W, 8, 22, `stream composer-species-v1/<seed>, ${opts.coherentIndividual ? `individual ${opts.coherentIndividual}` : 'type specimens (individual 0)'}${Object.keys(opts.set).length ? `, set ${Object.entries(opts.set).map(([k, v]) => `${k}=${v}`).join(',')}` : ''}`, [90, 90, 90], 2);
  for (let i = 0; i < n; i++) {
    const seed = String(opts.coherentBase + i), s = coherentComposerSpecies(seed), recipe = {...s.recipe, ...opts.set, individualSeed: opts.coherentIndividual};
    const b = build(recipe), side = projectedBounds(b.skin, 'side'), pb = projectedBounds(b.skin, view);
    const ext = Math.max(side.x1 - side.x0, side.y1 - side.y0) * 1.25 / C, mpp = Number(ext.toPrecision(2));
    const ox = C / 2 - ((pb.x0 + pb.x1) / 2) / mpp, oy = C - 10 + pb.y0 / mpp - ((C - 20) - (pb.y1 - pb.y0) / mpp) / 2;
    const cx = (i % cols) * C, cy = titleH + Math.floor(i / cols) * (C + labelH);
    const {rgb} = rasterSkin(b.skin, {view, mpp, width: C, height: C, ox, oy});
    for (let py = 0; py < C; py++) for (let px = 0; px < C; px++) img.set(rgb.subarray((py * C + px) * 3, (py * C + px) * 3 + 3), ((cy + py) * W + cx + px) * 3);
    if (view === 'side') { const gy = Math.round(oy); if (gy >= 0 && gy < C) for (let px = 0; px < C; px++) img.set([150, 150, 140], ((cy + gy) * W + cx + px) * 3); }
    const bar = Math.round(0.5 / mpp); for (let px = 0; px < Math.min(bar, C - 16); px++) for (let d = 0; d < 3; d++) img.set([40, 40, 40], ((cy + C - 6 + d) * W + cx + 8 + px) * 3);
    for (let px = 0; px < C; px++) img.set([200, 200, 195], (cy * W + cx + px) * 3);
    for (let py = 0; py < C; py++) img.set([200, 200, 195], ((cy + py) * W + cx) * 3);
    drawText(img, W, cx + 4, cy + C + 4, `${seed} ${s.archetype}${s.attempt ? ` r${s.attempt}` : ''}`, [30, 30, 30], 2);
    drawText(img, W, cx + 4, cy + C + 18, `l=${b.info.bodyLength.toFixed(2)}m ${recipe.palette}/${recipe.pattern} ${b.info.triangles}t`, [80, 80, 80], 2);
    meta.push({seed, archetype: s.archetype, attempt: s.attempt, balance: s.balance, mpp, input: encodeComposerRecipe(normalizeComposerRecipe(recipe).recipe), ...b.info});
  }
  return {png: encodePng(W, H, img), meta, width: W, height: H};
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const out = resolve(opts.out);
  if (existsSync(out)) { console.error(`Refusing to write into existing directory ${out}`); process.exit(2); }
  mkdirSync(out, {recursive: true});
  if (opts.coherent) {
    const summary = {tool: 'fauna-composer-silhouettes', mode: 'coherent', recipeVersion: COMPOSER_RECIPE_VERSION, options: {...opts, out}, sheets: []};
    for (const view of opts.views) {
      const t0 = performance.now(), sheet = await renderSpeciesSheet(opts, view), file = `coherent-${view}.png`;
      writeFileSync(resolve(out, file), sheet.png);
      summary.sheets.push({view, file, width: sheet.width, height: sheet.height, ms: Math.round(performance.now() - t0), cells: sheet.meta});
      console.log(`${file} ${sheet.width}x${sheet.height} (${Math.round(performance.now() - t0)} ms)`);
    }
    writeFileSync(resolve(out, 'sheet.json'), JSON.stringify(summary, null, 1) + '\n');
    return;
  }
  const species = [];
  for (const id of opts.preset) species.push([id, {...composerPreset(id), ...opts.set}]);
  if (opts.recipe) { const d = decodeComposerRecipe(opts.recipe); if (d.error) throw new Error(d.error); species.push(['recipe', {...d.recipe, ...opts.set}]); }
  const summary = {tool: 'fauna-composer-silhouettes', recipeVersion: COMPOSER_RECIPE_VERSION, options: {...opts, out}, sheets: []};
  for (const [name, recipe] of species) {
    let mpp = opts.mpp[name] ?? opts.mpp['*'];
    if (!mpp) { // auto: fit the type specimen with 45% headroom for variation, rounded up to 2 significant digits
      const b = build(recipe), side = projectedBounds(b.skin, 'side'), ext = Math.max(side.x1 - side.x0, side.y1 - side.y0) * 1.45 / opts.cell;
      const p = 10 ** Math.floor(Math.log10(ext)); mpp = Math.ceil(ext / p * 10) / 10 * p; mpp = Number(mpp.toPrecision(2));
    }
    for (const view of opts.views) {
      const t0 = performance.now(), sheet = renderSheet(name, recipe, opts, view, mpp), file = `${name}-${view}.png`;
      writeFileSync(resolve(out, file), sheet.png);
      summary.sheets.push({name, view, file, mpp, width: sheet.width, height: sheet.height, ms: Math.round(performance.now() - t0), cells: sheet.meta});
      console.log(`${file} ${sheet.width}x${sheet.height} mpp ${mpp} (${Math.round(performance.now() - t0)} ms)`);
    }
  }
  writeFileSync(resolve(out, 'sheet.json'), JSON.stringify(summary, null, 1) + '\n');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e.stack || e); process.exit(1); });
