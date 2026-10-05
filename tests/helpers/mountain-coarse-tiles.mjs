// Cost plan T3 (lod-ladder-2, docs/mountains-opus-decisions-2026-10-05.md T3 and addendum item 1): massif tiles at
// the carving switch level and an independent lattice-height reference (contract section 3), shared by
// tests/lod-carving-reduction.test.mjs and the T3 evidence scripts. Selection reads M1 only (the axis), never
// heights, except the carving test that picks which parent edge to check (carved vs uncarved point samples).
import {terrainSampler} from '../../src/terrain.ts';
import * as tiles from '../../src/planet-tiles.ts';
import {peakCorrectionMaxLevel, carvingFromLevel} from '../../src/lod-ladder.ts';
import {orogenLayout, continentalA0} from '../../src/mountain-layout.ts';
import {MASSIF_ENVELOPE} from '../../src/mountain-envelope.ts';
import {fib} from '../terrain-climate-fixtures.mjs';

export const ON = {mountains: true};
/** Sampler with the mountains on: the truth (lodLevel undefined) or a tile level's reduction. */
export const mountainSampler = (body, lodLevel) =>
  terrainSampler(body, undefined, undefined, undefined, 0, undefined, false, lodLevel === undefined ? ON : {...ON, lodLevel});
export const buildOn = (body, tile) => tiles.buildTile(body, tile, 1, 0, ON);

/** Axis sites: Fibonacci directions on a massif belt axis (|axis distance| <= 3 km, belt >= .5, massif-width belt,
 * continental coordinate a0 > 0), at least `minSepM` apart, in Fibonacci order. M1 inputs only, never heights. */
export function axisSites(body, {count = 8, minSepM = 300_000, total = 20_000} = {}) {
  const layout = orogenLayout(body), a0 = continentalA0(body), sites = [], R = body.radiusM;
  for (let i = 0; i < total && sites.length < count; i++) {
    const d = fib(i, total), o = layout.sample(d);
    if (o.belt < .5 || o.halfWidthM < MASSIF_ENVELOPE.MIN_HALF_WIDTH_M || Math.abs(o.axisDistanceM) > 3000) continue;
    if (!(a0(d) > 0)) continue;
    if (sites.some(s => Math.acos(Math.min(1, s.d[0] * d[0] + s.d[1] * d[1] + s.d[2] * d[2])) * R < minSepM)) continue;
    sites.push({d, axisDistanceM: o.axisDistanceM, beltIndex: o.beltIndex});
  }
  return sites;
}

/** The M1 massif test for a direction: |axis distance| < MAX_HALF_WIDTH_M on a massif-width belt. */
export function inMassif(body, d) {
  const o = orogenLayout(body).sample(d);
  return o.belt !== 0 && o.halfWidthM >= MASSIF_ENVELOPE.MIN_HALF_WIDTH_M && Math.abs(o.axisDistanceM) < MASSIF_ENVELOPE.MAX_HALF_WIDTH_M;
}

// Child edge e of the parent boundary: 0 u=0 (west), 1 u=1 (east), 2 v=0 (south), 3 v=1 (north), as tileNeighbour.
const edgeNode = (e, i, n) => [[0, i], [n, i], [i, 0], [i, n]][e];
/** The two edges of child tile C that lie on its parent's boundary. */
export const parentBoundaryEdges = C => [C.x & 1 ? 1 : 0, C.y & 1 ? 3 : 2];
/** Co-located (even) lattice nodes along edge e of a tile: [x, y] child-lattice coordinates. */
export const edgeNodes = (e, n = tiles.PATCH_SEGMENTS) => Array.from({length: n / 2 + 1}, (_, k) => edgeNode(e, 2 * k, n));

/**
 * A switch-level seam case per body: a tile C at L(cut) on a massif whose parent-boundary edge carries carving
 * (the carved and uncarved point samples differ by > 1 m on a co-located edge node), its parent P and P's
 * neighbour N across that edge, both at L(cut - 1). Deterministic: axis sites in Fibonacci order, edges in order.
 */
export function switchSeamCase(body, {maxSites = 24, crossFace = false} = {}) {
  const cut = carvingFromLevel(body.radiusM), truth = mountainSampler(body), coarse = mountainSampler(body, cut - 1), n = tiles.PATCH_SEGMENTS;
  const carvedEdge = (C, e) => {let best = 0;
    for (const [x, y] of edgeNodes(e, n)) {const d = tiles.tileDirection(C, x / n, y / n);best = Math.max(best, coarse(d).groundHeightM - truth(d).groundHeightM);}
    return best;};
  const result = (C, e, best, site) => {const P = {face: C.face, level: cut - 1, x: C.x >> 1, y: C.y >> 1};
    return {cut, C, P, N: tiles.tileNeighbour(P, e), edge: e, site, edgeCarvingM: best};};
  if (crossFace) {
    // Child tiles on a cube-face edge (the parent-boundary edge IS the face edge), in face/edge/position order; the
    // M1 massif pre-filter on the edge nodes keeps the carved samples (block solves) to massif edges only.
    const N = 2 ** cut;
    for (let face = 0; face < 6; face++) for (let e = 0; e < 4; e++) for (let k = 0; k < N; k++) {
      const C = {face, level: cut, x: [0, N - 1, k, k][e], y: [k, k, 0, N - 1][e]};
      if (!edgeNodes(e, n).some(([x, y]) => inMassif(body, tiles.tileDirection(C, x / n, y / n)))) continue;
      const best = carvedEdge(C, e);
      if (best > 1) return result(C, e, best, null);
    }
    return null;
  }
  for (const site of axisSites(body, {count: maxSites, minSepM: 150_000})) {
    const C = tiles.directionTile(site.d, cut);
    for (const e of parentBoundaryEdges(C)) {
      const best = carvedEdge(C, e);
      if (best > 1) return result(C, e, best, site);
    }
  }
  return null;
}

/**
 * Independent recomputation of a tile's stored vertex heights from a sampler (contract section 3, written from
 * the contract text, not from planet-tiles.ts): point sample p plus the bounded max-preserving correction at
 * levels <= peakCorrectionMaxLevel; ocean, sea-footprint and cube-face-edge vertices keep p. Sea level 0, no
 * river region (inland rivers are withdrawn). Returns Float64Array((n+1)^2) of heights.
 */
export function latticeHeights(body, tile, ts) {
  const n = tiles.PATCH_SEGMENTS, faceCells = 2 ** tile.level * n, corrected = tile.level <= peakCorrectionMaxLevel(body.radiusM);
  const memo = new Map(), raw = (hx, hy) => {const k = hx * 4096 + hy;let h = memo.get(k);
    if (h === undefined) {h = ts(tiles.tileDirection(tile, hx / (2 * n), hy / (2 * n))).groundHeightM;memo.set(k, h);}return h;};
  const at = (i, j) => raw(2 * i, 2 * j), out = new Float64Array((n + 1) * (n + 1));
  for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) {
    const p = at(x, y), gx = tile.x * n + x, gy = tile.y * n + y;
    let h = p;
    if (corrected && !(gx <= 0 || gy <= 0 || gx >= faceCells || gy >= faceCells) && !(body.water && p < 0)) {
      let max = p, min = p, lift = p;
      for (const [cx, cy] of [[x - 1, y - 1], [x, y - 1], [x - 1, y], [x, y]]) {
        const c = raw(2 * cx + 1, 2 * cy + 1);max = Math.max(max, c);min = Math.min(min, c);
        const top = Math.max(at(cx, cy), at(cx + 1, cy), at(cx, cy + 1), at(cx + 1, cy + 1));
        if (p === top && c > top) lift = Math.max(lift, c);
      }
      if (body.water && min < 0) lift = p;
      else if (max > min) lift = Math.max(lift, p + (p - min) / (max - min) * (max - p));
      h = lift;
    }
    out[y * (n + 1) + x] = h;
  }
  return out;
}

/** Absolute (unit-sphere) position of lattice vertex (x, y) of a tile for a height in metres. */
export function vertexPosition(body, tile, x, y, heightM) {
  const n = tiles.PATCH_SEGMENTS, d = tiles.tileDirection(tile, x / n, y / n), r = 1 + heightM / body.radiusM;
  return d.map(v => v * r);
}
/** Absolute position of stored vertex i of `positions`/`parents` (Float32, anchor-relative). */
export const storedPosition = (data, key, i) => [0, 1, 2].map(j => data[key][i * 3 + j] + data.anchor[j]);
export const distM = (body, a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * body.radiusM;
