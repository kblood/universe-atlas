// Riser-LOD evidence renderer (docs/mountain-riser-lod-2026-10-07.md section 4). CPU only, no GPU, no browser.
// One frame = one station pose, one FORCED lattice level L (the whole frame is the level-L 33x33-per-tile lattice,
// so arms are always compared at the same LOD), one arm:
//   v1     = main's src (exported tree, ROOT_V1) sampled at lodLevel L;
//   off    = main's src at lodLevel rockDetailFromLevel(R) - 1 (exact M3 carving, no M5 rock), on the level-L lattice;
//   branch = this worktree's src at lodLevel L.
// Vertex heights are groundHeightM; vertex normals are central differences of the lattice positions (as
// planet-tiles childNormal); quads split (a, a+1, a+S+1), (a, a+S+1, a+S); Lambert with the station sun; no
// texture, no shadow. Eye height = TRUTH ground (v1 sampler, no level) under the eye + clearance, the same for
// every arm. Validated in the step-8 diagnosis against the GPU stills (NCC 0.96-0.97 at matched levels).
//
// Pose rule (the step-8 probe's, scripts in strata step8 provenance/probe-strata.browser.mjs): pitch 35 deg, view
// azimuth = sun azimuth + 90 deg about the station normal, eye d = c / tan(35 deg) back along the view on the
// great circle, looking at the station.
//   node frame.mjs <world> <station: probe | tileSetIndex> <clearanceM> <L> <arm> <out.png> [halfKm=16]
import {pathToFileURL} from 'node:url';
import {readFileSync, writeFileSync} from 'node:fs';
import {deflateSync} from 'node:zlib';
export const ROOT_V1 = 'C:/Users/Caldor/AppData/Local/Temp/claude/C--LLM-IWSDK/84c3735d-46ff-4f28-8f76-5598fd94ed7b/scratchpad/main-7419733';
export const ROOT_BRANCH = new URL('../../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const STEP8 = 'C:/LLM/IWSDK/universe-atlas-wt/strata-datum/docs/quiet-window-2026-10-07/gate-strata/step8/frames/probe-maithea-axis-main.json';
const PITCH = 35 * Math.PI / 180, SUN_ELEV = 10 * Math.PI / 180;

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = a => {const l = Math.hypot(...a);return a.map(v => v / l);};
const add = (a, b, s = 1) => a.map((v, i) => v + s * b[i]);
const tangentTo = (a, b) => unit(add(b, a, -dot(a, b)));
const toward = (t, dir, distM, R) => {const ang = distM / R;return unit(add(t.map(v => v * Math.cos(ang)), dir, Math.sin(ang)));};

/** Station direction and sun for a world: 'probe' = the step-8 maithea-axis station and its recorded sun; an index
 * = FROZEN_MASSIF_TILE_SET[world][index] with the held-out synthetic sun (elevation 10 deg, azimuth = the tangent
 * at the station toward world +Y, or +X when the station is within 25 deg of the Y axis). */
export async function stationFor(world, station) {
  if (station === 'probe') {
    const J = JSON.parse(readFileSync(STEP8, 'utf8'));
    return {t: J.station.dir, S: J.sunDir, source: 'step8 probe-maithea-axis-main.json'};
  }
  const {FROZEN_MASSIF_TILE_SET} = await import(pathToFileURL(ROOT_V1 + '/tests/helpers/mountain-tile-set.mjs').href);
  const e = FROZEN_MASSIF_TILE_SET[world][+station], t = unit(e.d);
  const ref = Math.abs(t[1]) > Math.cos(25 * Math.PI / 180) ? [1, 0, 0] : [0, 1, 0], az = tangentTo(t, ref);
  return {t, S: unit(add(az.map(v => v * Math.cos(SUN_ELEV)), t, Math.sin(SUN_ELEV))), source: `FROZEN_MASSIF_TILE_SET.${world}[${station}] (${e.kind})`};
}
export function poseFor(t, S, clearanceM, R) {
  const az = tangentTo(t, S), view = cross(t, az); // az rotated +90 deg about t
  const d = clearanceM / Math.tan(PITCH), q = toward(t, view.map(v => -v), d, R);
  const fwdH = tangentTo(q, t), f = add(fwdH.map(v => v * Math.cos(PITCH)), q, -Math.sin(PITCH));
  const z = unit(f.map(v => -v)), x = unit(cross(q, z)), y = cross(z, x);
  return {eyeDir: q, x, y, z};
}

export async function renderFrame({world, station, clearanceM, L, arm, out, halfKm = 16, W = 1920, H = 1080}) {
  const root = arm === 'branch' ? ROOT_BRANCH : ROOT_V1;
  const T = await import(pathToFileURL(root + '/src/terrain.ts').href);
  const T1 = await import(pathToFileURL(ROOT_V1 + '/src/terrain.ts').href);
  const {cubeDirection, directionCoordinates} = await import(pathToFileURL(ROOT_V1 + '/src/planet-tiles.ts').href);
  const {rockDetailFromLevel} = await import(pathToFileURL(ROOT_V1 + '/src/lod-ladder.ts').href);
  const {waterWorlds} = await import(pathToFileURL(ROOT_V1 + '/tests/terrain-climate-fixtures.mjs').href);
  const body = waterWorlds().find(b => b.name === world), R = body.radiusM;
  const {t, S, source} = await stationFor(world, station);
  const opt = arm === 'off' ? {lodLevel: rockDetailFromLevel(R) - 1} : {lodLevel: L};
  const sample = T.terrainSampler(body, undefined, undefined, false, 0, undefined, false, opt);
  const truth = T1.terrainSampler(body, undefined, undefined, false, 0, undefined, false, {});
  const n = 32, cells = 2 ** L * n, {face, u: u0, v: v0} = directionCoordinates(t);
  const cx = Math.round((u0 + 1) / 2 * cells), cy = Math.round((v0 + 1) / 2 * cells);
  const dirAt = (gx, gy) => cubeDirection(face, gx * 2 / cells - 1, gy * 2 / cells - 1);
  const a = dirAt(cx, cy), b = dirAt(cx + 1, cy), spacing = Math.acos(Math.min(1, dot(a, b))) * R;
  const N = Math.ceil(halfKm * 1000 / spacing), Sg = 2 * N + 1;
  const P = new Float64Array(Sg * Sg * 3), Hh = new Float64Array(Sg * Sg), D = new Float64Array(Sg * Sg * 3);
  for (let j = 0; j < Sg; j++) for (let i = 0; i < Sg; i++) {
    const d = dirAt(cx - N + i, cy - N + j), h = sample(d).groundHeightM, r = R + h, k = j * Sg + i;
    Hh[k] = h;for (let c = 0; c < 3; c++) {P[k * 3 + c] = d[c] * r;D[k * 3 + c] = d[c];}
  }
  const Nr = new Float64Array(Sg * Sg * 3);
  for (let j = 0; j < Sg; j++) for (let i = 0; i < Sg; i++) {
    const w = j * Sg + Math.max(0, i - 1), e = j * Sg + Math.min(Sg - 1, i + 1), s = Math.max(0, j - 1) * Sg + i, no = Math.min(Sg - 1, j + 1) * Sg + i;
    const ex = [0, 1, 2].map(c => P[e * 3 + c] - P[w * 3 + c]), ny = [0, 1, 2].map(c => P[no * 3 + c] - P[s * 3 + c]);
    let nn = unit(cross(ex, ny));const k = j * Sg + i;
    if (nn[0] * D[k * 3] + nn[1] * D[k * 3 + 1] + nn[2] * D[k * 3 + 2] < 0) nn = nn.map(v => -v);
    for (let c = 0; c < 3; c++) Nr[k * 3 + c] = nn[c];
  }
  const pose = poseFor(t, S, clearanceM, R), eyeH = Math.max(0, truth(pose.eyeDir).groundHeightM) + clearanceM;
  const eye = pose.eyeDir.map(v => v * (R + eyeH)), fov = 48 * Math.PI / 180, ty = Math.tan(fov / 2), tx = ty * W / H;
  const sx = new Float64Array(Sg * Sg), sy = new Float64Array(Sg * Sg), sz = new Float64Array(Sg * Sg);
  for (let k = 0; k < Sg * Sg; k++) {
    const v = [P[k * 3] - eye[0], P[k * 3 + 1] - eye[1], P[k * 3 + 2] - eye[2]], z = -dot(v, pose.z);
    sz[k] = z;sx[k] = (dot(v, pose.x) / z / tx + 1) / 2 * W;sy[k] = (1 - dot(v, pose.y) / z / ty) / 2 * H;
  }
  const zb = new Float64Array(W * H).fill(Infinity), img = new Uint8Array(W * H), cov = new Uint8Array(W * H);
  const tri = (k0, k1, k2) => {
    if (sz[k0] <= 1 || sz[k1] <= 1 || sz[k2] <= 1) return;
    const x0 = sx[k0], y0 = sy[k0], x1 = sx[k1], y1 = sy[k1], x2 = sx[k2], y2 = sy[k2];
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);if (area === 0) return;
    const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2))), maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2))), maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
    for (let py = minY; py <= maxY; py++) for (let px = minX; px <= maxX; px++) {
      const X = px + .5, Y = py + .5;
      const w0 = ((x1 - X) * (y2 - Y) - (x2 - X) * (y1 - Y)) / area, w1 = ((x2 - X) * (y0 - Y) - (x0 - X) * (y2 - Y)) / area, w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const z = 1 / (w0 / sz[k0] + w1 / sz[k1] + w2 / sz[k2]), p = py * W + px;
      if (z >= zb[p]) continue;zb[p] = z;cov[p] = 1;
      const a0 = w0 / sz[k0] * z, a1 = w1 / sz[k1] * z, a2 = w2 / sz[k2] * z;
      let nx = 0, ny = 0, nz = 0;
      for (const [k, wt] of [[k0, a0], [k1, a1], [k2, a2]]) {nx += Nr[k * 3] * wt;ny += Nr[k * 3 + 1] * wt;nz += Nr[k * 3 + 2] * wt;}
      const ndl = (nx * S[0] + ny * S[1] + nz * S[2]) / Math.hypot(nx, ny, nz);
      img[p] = Math.max(0, Math.min(255, Math.round(255 * (0.35 + 0.65 * Math.min(1, Math.max(0, ndl) * 1.6)))));
    }
  };
  for (let j = 0; j < Sg - 1; j++) for (let i = 0; i < Sg - 1; i++) {const q = j * Sg + i;tri(q, q + 1, q + Sg + 1);tri(q, q + Sg + 1, q + Sg);}
  // grey PNG + coverage mask (alpha) so the metric can intersect coverage across arms
  const raw = Buffer.alloc((W * 2 + 1) * H);
  for (let y = 0; y < H; y++) {raw[y * (W * 2 + 1)] = 0;for (let x = 0; x < W; x++) {raw[y * (W * 2 + 1) + 1 + 2 * x] = img[y * W + x];raw[y * (W * 2 + 1) + 2 + 2 * x] = cov[y * W + x] ? 255 : 0;}}
  const crcT = [];for (let n2 = 0; n2 < 256; n2++) {let c = n2;for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;crcT[n2] = c >>> 0;}
  const crc = buf => {let r = 0xffffffff;for (const b2 of buf) r = crcT[(r ^ b2) & 255] ^ (r >>> 8);return (r ^ 0xffffffff) >>> 0;};
  const chunk = (ty2, d) => {const l = Buffer.alloc(4);l.writeUInt32BE(d.length);const td = Buffer.concat([Buffer.from(ty2), d]);const c = Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l, td, c]);};
  const ihdr = Buffer.alloc(13);ihdr.writeUInt32BE(W, 0);ihdr.writeUInt32BE(H, 4);ihdr[8] = 8;ihdr[9] = 4;
  writeFileSync(out, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
  const meta = {world, station, source, clearanceM, L, arm, opt, root, spacingM: spacing, grid: Sg, eyeHeightM: eyeH, sun: S, stationDir: t};
  writeFileSync(out.replace(/\.png$/, '.json'), JSON.stringify(meta));
  return meta;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [world, station, c, L, arm, out, halfKm] = process.argv.slice(2);
  const m = await renderFrame({world, station, clearanceM: +c, L: +L, arm, out, halfKm: halfKm ? +halfKm : 16});
  console.log(JSON.stringify(m));
}
