// CPU-only coat swatch sheets for fauna-coat-1 (no browser, no GPU lock).
//
//   node tests/fauna-coat-swatches.mjs
//
// Writes <root>/wp1-swatches-<n>/ with:
//   coat-swatches.png    13 pattern rows ('auto' + 12 resolved) x 3 individuals as an
//                        unwrapped flank (belly at the bottom edge, spine at the top,
//                        head to the right, +z side), plus a lit side view of the first
//                        individual; then the 8 region marks and the legacy (v1
//                        composer, mesh.ts coat()) reference row.
//   coat-silhouettes.png the same patterns on a lit side-view quadruped, 3 individuals each,
//                        plus the legacy coat on the same body.
//   coat-palettes.png    14 palettes x 4 individuals (auto pattern) on the side view.
//   report.json          layout, genomes and timings.
// <root> defaults to <repo>/test-results; override with COAT_SWATCH_ROOT. An existing
// output directory is never reused.
import {deflateSync} from 'node:zlib';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import {
  FAUNA_COAT_FIELD_VERSION, applyCoatDrift, coatCanonicalSamples, coatIndividualDrift, coatMeanColor,
  coatMinFeature, defaultCoatGenome, evaluateCoat, linearToSrgb,
} from '../src/fauna-coat-fields.ts';
import {COAT_MARK_BITS, COAT_PALETTE_IDS, LEGACY_PALETTE_IDS} from '../src/fauna-coat-vocab.ts';
import {composerHash, composerRandom} from '../src/fauna-composer-recipe.ts';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CELL_W = 256, CELL_H = 128, GUTTER = 6;

// ------------------------------------------------------------------ PNG
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(name, data) {
  const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); out.write(name, 4, 'ascii'); data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length); return out;
}
function encodePng(width, height, rgb) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) { raw[y * (width * 3 + 1)] = 0; rgb.copy ? rgb.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3) : raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, {level: 9})), chunk('IEND', Buffer.alloc(0))]);
}

// ------------------------------------------------------------------ canvas + 3x5 font
class Canvas {
  constructor(w, h, bg = [24, 26, 30]) { this.w = w; this.h = h; this.px = new Uint8Array(w * h * 3); for (let i = 0; i < w * h; i++) this.px.set(bg, i * 3); }
  set(x, y, r, g, b) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const o = (y * this.w + x) * 3; this.px[o] = r; this.px[o + 1] = g; this.px[o + 2] = b; }
  blend(x, y, r, g, b, a) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const o = (y * this.w + x) * 3; this.px[o] += (r - this.px[o]) * a; this.px[o + 1] += (g - this.px[o + 1]) * a; this.px[o + 2] += (b - this.px[o + 2]) * a; }
  png() { return encodePng(this.w, this.h, Buffer.from(this.px.buffer)); }
}
const FONT = {
  a: '010101111101101', b: '110101110101110', c: '011100100100011', d: '110101101101110', e: '111100110100111', f: '111100110100100',
  g: '011100101101011', h: '101101111101101', i: '111010010010111', j: '001001001101010', k: '101101110101101', l: '100100100100111',
  m: '101111111101101', n: '110101101101101', o: '010101101101010', p: '110101110100100', q: '010101101110011', r: '110101110101101',
  s: '011100010001110', t: '111010010010010', u: '101101101101111', v: '101101101101010', w: '101101111111101', x: '101101010101101',
  y: '101101010010010', z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
  '-': '000000111000000', '/': '001001010100100', '.': '000000000000010', ':': '000010000010000', '=': '000111000111000', '+': '000010111010000', ' ': '000000000000000',
};
function label(cv, x0, y0, text, scale = 2) {
  text = String(text).toLowerCase();
  const w = text.length * 4 * scale + 2 * scale, h = 7 * scale;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cv.blend(x0 + x, y0 + y, 0, 0, 0, 0.62);
  [...text].forEach((ch, i) => {
    const g = FONT[ch] ?? FONT[' '];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r * 3 + c] === '1')
      for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) cv.set(x0 + scale + i * 4 * scale + c * scale + sx, y0 + scale + r * scale + sy, 236, 236, 230);
  });
}
const toByte = v => Math.round(255 * Math.max(0, Math.min(1, linearToSrgb(Math.max(0, Math.min(1, v))))));

// ------------------------------------------------------------------ flank unwrap
/** Unwrapped +z flank: x from rump (left) to shoulder (right), belly (bottom) to spine (top). Unlit albedo. */
function drawFlank(cv, ox, oy, colourAt) {
  const c = [0, 0, 0];
  for (let py = 0; py < CELL_H; py++) for (let px = 0; px < CELL_W; px++) {
    const x = -0.42 + 0.84 * (px + 0.5) / CELL_W, phi = Math.PI * (py + 0.5) / CELL_H;
    colourAt({x, y: Math.cos(phi) * 0.15, z: Math.sin(phi) * 0.12, dorsal: Math.cos(phi), region: 'torso', along: 0.5, footprint: 0.0033}, c);
    cv.set(ox + px, oy + py, toByte(c[0]), toByte(c[1]), toByte(c[2]));
  }
}

// ------------------------------------------------------------------ side-view quadruped
// Tubes in body-length units: a->b, radius r0->r1 (y), z radius = r * k. Camera looks down -z (sees +z side).
const T = (region, a, b, r0, r1, k = 1, alongFrom = 0, alongTo = 1, shade = 1) => ({region, a, b, r0, r1, k, alongFrom, alongTo, shade});
const BODY = [
  // far-side legs first (darker; they are behind)
  T('limb-upper', [0.27, -0.02, -0.075], [0.255, -0.29, -0.075], 0.05, 0.034, 0.9, 0, 1, 0.72),
  T('limb-lower', [0.255, -0.29, -0.075], [0.262, -0.53, -0.075], 0.024, 0.02, 1, 0, 1, 0.72),
  T('foot', [0.262, -0.53, -0.075], [0.272, -0.56, -0.075], 0.024, 0.026, 1, 0, 1, 0.72),
  T('limb-upper', [-0.25, 0.0, -0.075], [-0.2, -0.27, -0.075], 0.06, 0.035, 0.9, 0, 1, 0.72),
  T('limb-lower', [-0.2, -0.27, -0.075], [-0.235, -0.53, -0.075], 0.024, 0.02, 1, 0, 1, 0.72),
  T('foot', [-0.235, -0.53, -0.075], [-0.225, -0.56, -0.075], 0.024, 0.026, 1, 0, 1, 0.72),
  // body
  T('torso', [-0.34, 0.0, 0], [0.27, 0.025, 0], 0.15, 0.16, 0.82),
  T('neck', [0.27, 0.07, 0], [0.48, 0.25, 0], 0.085, 0.055, 1),
  T('head', [0.47, 0.27, 0], [0.6, 0.255, 0], 0.062, 0.05, 0.85),
  T('muzzle', [0.6, 0.255, 0], [0.7, 0.21, 0], 0.045, 0.033, 0.9),
  T('ear', [0.5, 0.31, 0.03], [0.455, 0.4, 0.05], 0.022, 0.008, 0.4),
  T('eye', [0.575, 0.28, 0.035], [0.575, 0.28, 0.035], 0.012, 0.012, 1.4),
  T('tail', [-0.4, 0.07, 0], [-0.52, -0.16, 0.01], 0.026, 0.016, 1),
  T('tail-tip', [-0.52, -0.16, 0.01], [-0.545, -0.25, 0.012], 0.016, 0.022, 1),
  // near-side legs
  T('limb-upper', [0.2, -0.02, 0.075], [0.19, -0.29, 0.075], 0.055, 0.034, 0.9),
  T('limb-lower', [0.19, -0.29, 0.075], [0.198, -0.53, 0.075], 0.025, 0.021, 1),
  T('foot', [0.198, -0.53, 0.075], [0.208, -0.56, 0.075], 0.025, 0.027, 1),
  T('limb-upper', [-0.27, 0.0, 0.075], [-0.22, -0.27, 0.075], 0.065, 0.036, 0.9),
  T('limb-lower', [-0.22, -0.27, 0.075], [-0.255, -0.53, 0.075], 0.025, 0.021, 1),
  T('foot', [-0.255, -0.53, 0.075], [-0.245, -0.56, 0.075], 0.025, 0.027, 1),
];
const LIGHT = (() => { const v = [-0.35, 0.72, 0.6], l = Math.hypot(...v); return v.map(x => x / l); })();
const SIDE_SCALE = 0.0076; // body lengths per pixel
function drawSide(cv, ox, oy, colourAt) {
  const c = [0, 0, 0];
  for (let py = 0; py < CELL_H; py++) for (let px = 0; px < CELL_W; px++) {
    const X = -0.03 + (px - CELL_W / 2 + 0.5) * SIDE_SCALE, Y = -0.11 + (CELL_H / 2 - py - 0.5) * SIDE_SCALE;
    let best = null, bestZ = -1e9;
    for (const t of BODY) {
      const ax = t.a[0], ay = t.a[1], bx = t.b[0], by = t.b[1], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      const f = l2 > 0 ? Math.max(0, Math.min(1, ((X - ax) * dx + (Y - ay) * dy) / l2)) : 0;
      const cx = ax + dx * f, cy = ay + dy * f, ex = X - cx, ey = Y - cy, d = Math.hypot(ex, ey), r = t.r0 + (t.r1 - t.r0) * f;
      if (d >= r) continue;
      const rz = r * t.k, dz = rz * Math.sqrt(1 - (d / r) ** 2), z = t.a[2] + (t.b[2] - t.a[2]) * f + dz;
      if (z <= bestZ) continue;
      let nx = ex / (r * r), ny = ey / (r * r), nz = dz / (rz * rz); const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      bestZ = z; best = {t, f, x: X, y: Y, z, nx, ny, nz};
    }
    if (!best) {
      const g = 0.16 + 0.05 * (py / CELL_H); cv.set(ox + px, oy + py, toByte(g * 0.9), toByte(g), toByte(g * 1.05));
      if (Y < -0.56 && Y > -0.58) cv.set(ox + px, oy + py, toByte(0.06), toByte(0.06), toByte(0.055));
      continue;
    }
    const {t, f} = best;
    colourAt({x: best.x, y: best.y, z: best.z, dorsal: Math.max(-1, Math.min(1, best.ny)), region: t.region, along: t.alongFrom + (t.alongTo - t.alongFrom) * f, footprint: SIDE_SCALE}, c);
    const diffuse = Math.max(0, best.nx * LIGHT[0] + best.ny * LIGHT[1] + best.nz * LIGHT[2]);
    const light = (0.85 * diffuse + 0.2 + 0.08 * best.ny) * t.shade;
    const spec = t.region === 'eye' ? 0.25 * Math.max(0, best.nx * LIGHT[0] + best.ny * LIGHT[1] + best.nz * LIGHT[2]) ** 24 : 0;
    cv.set(ox + px, oy + py, toByte(c[0] * light + spec), toByte(c[1] * light + spec), toByte(c[2] * light + spec));
  }
}

// ------------------------------------------------------------------ legacy coat (fauna-composer-mesh.ts v1, inline)
function legacyCoatFn(paletteId, colorSeed = 0) {
  const PAL = {
    earth: {base: '#7a5a3c', accent: '#4a3322', belly: '#b89c78'}, savanna: {base: '#c99a52', accent: '#6b3f1d', belly: '#ead8b0'},
    reptile: {base: '#5e7a3a', accent: '#37502a', belly: '#cfc890'}, plumage: {base: '#2f6fa8', accent: '#e0a020', belly: '#e8e2d0'},
    slate: {base: '#6d6f70', accent: '#4c4e50', belly: '#8e8c88'}, ink: {base: '#2c2b31', accent: '#c84a2a', belly: '#5e5249'},
  };
  const rand = composerRandom(`composer-colour/${paletteId}/${colorSeed}`), dh = (rand() - 0.5) * 0.06, dl = (rand() - 0.5) * 0.1, pal = {};
  for (const [key, hex] of Object.entries(PAL[paletteId])) {
    const c = new THREE.Color(hex), hsl = {h: 0, s: 0, l: 0}; c.getHSL(hsl);
    if (key === 'base' || key === 'accent') c.setHSL((hsl.h + dh + 1) % 1, hsl.s, Math.max(0.04, Math.min(0.9, hsl.l + dl)));
    pal[key] = [c.r, c.g, c.b];
  }
  const seed = composerHash(`${colorSeed}/${paletteId}`);
  const smooth = (lo, hi, v) => { const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo))); return t * t * (3 - 2 * t); };
  const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const noise3 = (x, y, z) => {
    const h = (i, j, k) => composerHash(`${seed}/${i}/${j}/${k}`) / 4294967296, ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    let best = 9;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      const cx = ix + a, cy = iy + b, cz = iz + c; best = Math.min(best, Math.hypot(x - cx - h(cx, cy, cz), y - cy - h(cy, cz, cx), z - cz - h(cz, cx, cy)));
    }
    return best;
  };
  return (s, out) => {
    const part = s.region.startsWith('limb') || s.region === 'foot' ? 'limb' : s.region === 'neck' ? 'neck' : s.region.startsWith('tail') ? 'tail' : 'body';
    if (s.region === 'eye') { out[0] = out[1] = out[2] = 0.006; return; }
    let c = pal.base; const q = s;
    if (paletteId === 'savanna') { const cell = noise3(q.x * 9, q.y * 9, q.z * 9); c = mixC(pal.belly, pal.accent, 1 - smooth(0.3, 0.4, cell)); }
    else if (paletteId === 'reptile') c = mixC(c, pal.accent, smooth(0.25, 0.75, Math.sin(q.x * 22 + q.z * 2) * 0.5 + 0.5) * smooth(-0.2, 0.5, s.dorsal));
    else if (paletteId === 'earth') c = mixC(c, pal.accent, smooth(0.55, 0.95, s.dorsal) * 0.7);
    else if (paletteId === 'plumage' && part === 'neck') c = mixC(pal.base, pal.accent, 0.25);
    const grain = 1 + 0.05 * Math.sin(q.x * 61 + q.y * 37) * Math.sin(q.z * 53 - q.y * 29);
    const belly = part === 'limb' ? 0 : smooth(-0.15, -0.75, s.dorsal);
    c = mixC(c, pal.belly, belly * 0.8);
    out[0] = c[0] * grain; out[1] = c[1] * grain; out[2] = c[2] * grain;
  };
}

// ------------------------------------------------------------------ specimens
const PATTERN_ROWS = [
  ['auto', null], ['plain', 'tawny'], ['spots', 'tawny'], ['rosettes', 'ochre'], ['reticulated', 'savanna'], ['stripes', 'ochre'],
  ['bands', 'reptile'], ['saddle', 'earth'], ['dorsal-stripe', 'dun'], ['dapple', 'grey'], ['piebald', 'sable'], ['roan', 'rufous'], ['brindle', 'fawn'],
];
const AUTO_PALETTES = ['savanna', 'earth', 'dun'];
const VARIABILITY = [0, 1, 1];
function specimen(pattern, palette, i) {
  const pal = pattern === 'auto' ? AUTO_PALETTES[i] : palette;
  const species = defaultCoatGenome(pal, 'swatch', {pattern});
  const drift = coatIndividualDrift(`swatch/${pattern}/${i}`, VARIABILITY[i]);
  return {palette: pal, variability: VARIABILITY[i], morph: drift.morph, genome: applyCoatDrift(species, drift)};
}
const coatOf = genome => (s, out) => evaluateCoat(genome, s, out, 0);
const MARK_SPECIMENS = Object.entries(COAT_MARK_BITS).map(([name, bit]) => {
  const pal = name === 'juvenile-spots' ? 'fawn' : name === 'rump-patch' ? 'dun' : 'tawny';
  const markRole = name === 'tail-tip' || name === 'socks' ? 'belly' : 'accent';
  return {name, palette: pal, markRole, genome: defaultCoatGenome(pal, 'marks', {pattern: 'plain', marks: bit, markRole, greying: name === 'mask' ? 0.6 : 0})};
});

function sheetLayout(rows, cols) { return {w: cols * CELL_W + (cols + 1) * GUTTER, h: rows * CELL_H + (rows + 1) * GUTTER}; }
const cellXY = (r, c) => [GUTTER + c * (CELL_W + GUTTER), GUTTER + r * (CELL_H + GUTTER)];

function main() {
  const root = resolve(process.env.COAT_SWATCH_ROOT ?? join(repo, 'test-results'));
  mkdirSync(root, {recursive: true});
  let n = 1; while (existsSync(join(root, `wp1-swatches-${n}`))) n++;
  const outDir = join(root, `wp1-swatches-${n}`); mkdirSync(outDir);
  const report = {version: FAUNA_COAT_FIELD_VERSION, outDir, node: process.version, sheets: {}, specimens: {}, timings: {}};

  // Sheet 1: swatches.
  const rows1 = PATTERN_ROWS.length + 2 + 2, l1 = sheetLayout(rows1, 4), s1 = new Canvas(l1.w, l1.h);
  report.sheets['coat-swatches.png'] = {cell: [CELL_W, CELL_H], rows: []};
  PATTERN_ROWS.forEach(([pattern, palette], r) => {
    const row = [];
    for (let i = 0; i < 3; i++) {
      const sp = specimen(pattern, palette, i), [x, y] = cellXY(r, i);
      drawFlank(s1, x, y, coatOf(sp.genome));
      label(s1, x + 2, y + 2, `${pattern === 'auto' ? `auto ${sp.palette}=${sp.genome.pattern}` : `${pattern} ${sp.palette}`} v${sp.variability}${sp.morph !== 'none' ? ' ' + sp.morph : ''}`);
      row.push({pattern, palette: sp.palette, variability: sp.variability, morph: sp.morph, resolved: sp.genome.pattern, minFeature: coatMinFeature(sp.genome), view: 'flank'});
      if (i === 0) { const [sx, sy] = cellXY(r, 3); drawSide(s1, sx, sy, coatOf(sp.genome)); label(s1, sx + 2, sy + 2, `side v0`); }
    }
    row.push({view: 'side', of: 0});
    report.sheets['coat-swatches.png'].rows.push(row);
  });
  MARK_SPECIMENS.forEach((m, k) => {
    const r = PATTERN_ROWS.length + Math.floor(k / 4), c = k % 4, [x, y] = cellXY(r, c);
    drawSide(s1, x, y, coatOf(m.genome)); label(s1, x + 2, y + 2, `mark ${m.name}${m.name === 'mask' ? ' +greying' : ''}`);
  });
  report.sheets['coat-swatches.png'].markRows = MARK_SPECIMENS.map(m => ({name: m.name, palette: m.palette, markRole: m.markRole, view: 'side'}));
  LEGACY_PALETTE_IDS.forEach((pal, k) => {
    const r = PATTERN_ROWS.length + 2 + Math.floor(k / 4), c = k % 4, [x, y] = cellXY(r, c);
    drawFlank(s1, x, y, legacyCoatFn(pal)); label(s1, x + 2, y + 2, `legacy v1 ${pal}`);
  });
  report.sheets['coat-swatches.png'].legacyRow = LEGACY_PALETTE_IDS.map(p => ({palette: p, view: 'flank', source: 'fauna-composer-mesh.ts coat() re-implemented inline'}));
  writeFileSync(join(outDir, 'coat-swatches.png'), s1.png());

  // Sheet 2: silhouettes.
  const rows2 = PATTERN_ROWS.length - 1 + 2, l2 = sheetLayout(rows2, 3), s2 = new Canvas(l2.w, l2.h);
  PATTERN_ROWS.slice(1).forEach(([pattern, palette], r) => {
    for (let i = 0; i < 3; i++) {
      const sp = specimen(pattern, palette, i), [x, y] = cellXY(r, i);
      drawSide(s2, x, y, coatOf(sp.genome)); label(s2, x + 2, y + 2, `${pattern} ${sp.palette} v${sp.variability}${sp.morph !== 'none' ? ' ' + sp.morph : ''}`);
    }
  });
  LEGACY_PALETTE_IDS.forEach((pal, k) => {
    const r = PATTERN_ROWS.length - 1 + Math.floor(k / 3), c = k % 3, [x, y] = cellXY(r, c);
    drawSide(s2, x, y, legacyCoatFn(pal)); label(s2, x + 2, y + 2, `legacy v1 ${pal}`);
  });
  writeFileSync(join(outDir, 'coat-silhouettes.png'), s2.png());

  // Sheet 3: palettes x individuals.
  const l3 = sheetLayout(COAT_PALETTE_IDS.length, 4), s3 = new Canvas(l3.w, l3.h);
  report.specimens.palettes = [];
  COAT_PALETTE_IDS.forEach((pal, r) => {
    const species = defaultCoatGenome(pal, 'palette-sheet');
    for (let i = 0; i < 4; i++) {
      const drift = coatIndividualDrift(`palette-sheet/${pal}/${i}`, i === 0 ? 0 : 1), g = applyCoatDrift(species, drift), [x, y] = cellXY(r, i);
      drawSide(s3, x, y, coatOf(g)); label(s3, x + 2, y + 2, `${pal} ${g.pattern} ind ${i}${drift.morph !== 'none' ? ' ' + drift.morph : ''}`);
      report.specimens.palettes.push({palette: pal, individual: i, pattern: g.pattern, morph: drift.morph, mean: coatMeanColor(g).map(v => +v.toFixed(5))});
    }
  });
  writeFileSync(join(outDir, 'coat-palettes.png'), s3.png());

  // Timings.
  const samples = coatCanonicalSamples(), out = new Float64Array(3);
  const genomes = PATTERN_ROWS.slice(1).map(([pattern, palette]) => defaultCoatGenome(palette, 'timing', {pattern, marks: 255}));
  for (let w = 0; w < 20000; w++) evaluateCoat(genomes[w % genomes.length], samples[w & 511], out); // warm-up
  const perSample = [];
  for (let b = 0; b < 100; b++) {
    const g = genomes[b % genomes.length], t0 = process.hrtime.bigint();
    for (let i = 0; i < 1000; i++) evaluateCoat(g, samples[(i * 7 + b) & 511], out);
    perSample.push(Number(process.hrtime.bigint() - t0) / 1000 / 1000);
  }
  perSample.sort((a, b) => a - b);
  const perPattern = {};
  for (const g of genomes) {
    const t0 = process.hrtime.bigint(); for (let i = 0; i < 20000; i++) evaluateCoat(g, samples[i & 511], out);
    perPattern[g.pattern] = +(Number(process.hrtime.bigint() - t0) / 20000 / 1000).toFixed(4);
  }
  const meanMs = [];
  for (let i = 0; i < 40; i++) { const t0 = process.hrtime.bigint(); coatMeanColor(genomes[i % genomes.length]); meanMs.push(Number(process.hrtime.bigint() - t0) / 1e6); }
  meanMs.sort((a, b) => a - b);
  report.timings = {
    evaluateCoatMedianMicrosecondsPerSample: +perSample[50].toFixed(4), evaluateCoatSamples: 100000, evaluateCoatBudgetMicroseconds: 2,
    evaluateCoatWithinBudget: perSample[50] <= 2, perPatternMicroseconds: perPattern,
    coatMeanColorMedianMilliseconds: +meanMs[20].toFixed(4), coatMeanColorBudgetMilliseconds: 3, coatMeanColorWithinBudget: meanMs[20] <= 3,
  };
  writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 1));
  console.log(JSON.stringify({outDir, timings: report.timings}, null, 1));
}
main();
