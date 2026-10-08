// Notch-row periodicity and edge energy on frame.mjs frames (docs/mountain-riser-lod-2026-10-07.md section 4).
// Windows of 300 x 30 px at a stride of 150 x 15 px, fully covered in every arm of the frame group. A window is a
// ROCK window when the mean |v1 - off| grey difference in it is >= 2 (rock visibly present; set by the controls
// only, the same set for every arm). Per window and arm (the step-8 diagnosis metric, period.mjs):
//   per row, high-pass = grey minus its +-12 px box mean; hpRMS = RMS of that over the window;
//   periodic peak = the largest local maximum, over lags 12..40 px, of the row-normalised autocorrelation
//   averaged over the 30 rows (0 when there is none).
// Frame scores per arm: P99 = 99th percentile (nearest rank) of the window peaks (the REGISTERED notch score); EE =
// mean window hpRMS (INFO); NP (90th percentile), meanPeak and hitShare (share of windows with peak >= .35) are INFO.
//   node metric.mjs <groups.json> <out.json>     groups: [{id, v1, off, branch?}] (png paths)
import {readFileSync, writeFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';

export function readGreyAlpha(file) {
  const b = readFileSync(file);let o = 8, W = 0, H = 0;const idat = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o), type = b.toString('ascii', o + 4, o + 8), data = b.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') {W = data.readUInt32BE(0);H = data.readUInt32BE(4);if (data[8] !== 8 || data[9] !== 4) throw new Error('expects 8-bit grey+alpha');}
    if (type === 'IDAT') idat.push(data);
    o += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), g = new Float64Array(W * H), a = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    if (raw[y * (W * 2 + 1)] !== 0) throw new Error('expects filter 0');
    for (let x = 0; x < W; x++) {g[y * W + x] = raw[y * (W * 2 + 1) + 1 + 2 * x];a[y * W + x] = raw[y * (W * 2 + 1) + 2 + 2 * x];}
  }
  return {W, H, g, a};
}
const WW = 300, WH = 30, SX = 150, SY = 15, HP = 12, LAG0 = 12, LAG1 = 40, ROCK_GREY = 2, PEAK_HIT = .35; // frozen (section 4)
function windowStats(img, x0, y0) {
  const {W, g} = img, ac = new Float64Array(LAG1 + 2);let e = 0, cnt = 0;
  for (let y = y0; y < y0 + WH; y++) {
    const r = new Float64Array(WW);
    for (let i = 0; i < WW; i++) {const x = x0 + i;let s = 0, c = 0;for (let k = -HP; k <= HP; k++) {const xx = Math.min(W - 1, Math.max(0, x + k));s += g[y * W + xx];c++;}r[i] = g[y * W + x] - s / c;}
    let v = 0;for (const q of r) v += q * q;e += v;cnt += WW;if (v === 0) continue;
    for (let lag = 0; lag <= LAG1 + 1; lag++) {let s = 0;for (let i = 0; i + lag < WW; i++) s += r[i] * r[i + lag];ac[lag] += s / v / WH;}
  }
  let peak = 0;for (let lag = LAG0; lag <= LAG1; lag++) if (ac[lag] > peak && ac[lag] >= ac[lag - 1] && ac[lag] >= ac[lag + 1]) peak = ac[lag];
  return {peak, hpRms: Math.sqrt(e / cnt)};
}
const pct = (xs, p) => {if (!xs.length) return null;const s = [...xs].sort((a, b) => a - b);return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))];};
export function scoreGroup(group) {
  const arms = Object.keys(group).filter(k => k !== 'id' && group[k]), imgs = Object.fromEntries(arms.map(k => [k, readGreyAlpha(group[k])]));
  const {W, H} = imgs.v1, windows = [];
  for (let y0 = 0; y0 + WH <= H; y0 += SY) for (let x0 = 0; x0 + WW <= W; x0 += SX) {
    let covered = true, diff = 0;
    for (let y = y0; y < y0 + WH && covered; y++) for (let x = x0; x < x0 + WW; x++) {
      const p = y * W + x;if (arms.some(k => imgs[k].a[p] === 0)) {covered = false;break;}diff += Math.abs(imgs.v1.g[p] - imgs.off.g[p]);
    }
    if (covered && diff / (WW * WH) >= ROCK_GREY) windows.push([x0, y0]);
  }
  const out = {id: group.id, rockWindows: windows.length};
  for (const k of arms) {
    const st = windows.map(([x, y]) => windowStats(imgs[k], x, y));
    out[k] = {NP: pct(st.map(s => s.peak), .9), P99: pct(st.map(s => s.peak), .99), hitShare: st.length ? st.filter(s => s.peak >= PEAK_HIT).length / st.length : null, EE: st.length ? st.reduce((a, s) => a + s.hpRms, 0) / st.length : null,
      meanPeak: st.length ? st.reduce((a, s) => a + s.peak, 0) / st.length : null};
  }
  return out;
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const groups = JSON.parse(readFileSync(process.argv[2], 'utf8')), res = [];
  for (const g of groups) {const r = scoreGroup(g);res.push(r);console.log(JSON.stringify(r));}
  writeFileSync(process.argv[3], JSON.stringify(res, null, 1));
}
