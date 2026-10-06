// Coarse-frame element test (tests/lod-coarse-frame.test.mjs; docs/lod-ladder-contract-v1.md section 3.1).
// Measurement for ONE world with the staged mountains on ({mountains: true}, the same test hook as
// tests/lod-carving-reduction.test.mjs), plus the pure check functions the test applies to the real data and to
// the negative controls. Run in-process (measureWorld) or as a worker thread (workerData = world name), one per
// world, so the four worlds measure in parallel inside the test slot.
//
// Tile selection uses M1 inputs only (never heights): the chain of tiles containing a massif axis site
// (axisSites: |axis distance| <= 3 km on a massif-width belt), and, at uncarved child levels, every child of those
// parents that touches a massif by the T1 band grid (bandCellFlagged, massif radius and width gate) confirmed by the
// belt query (inMassif) on a 65 x 65 net over the tile. The touching-sample count of every selected tile is reported.
import {isMainThread, parentPort, workerData} from 'node:worker_threads';
import * as tiles from '../../src/planet-tiles.ts';
import {carvingFromLevel, peakCorrectionMaxLevel, tileEdgeM} from '../../src/lod-ladder.ts';
import {carvingBuildStats} from '../../src/mountain-carving.ts';
import {orogenLayout} from '../../src/mountain-layout.ts';
import {MASSIF_ENVELOPE} from '../../src/mountain-envelope.ts';
import {waterWorlds} from '../terrain-climate-fixtures.mjs';
import {axisSites, buildOn, mountainSampler, parentBoundaryEdges} from './mountain-coarse-tiles.mjs';

const n = tiles.PATCH_SEGMENTS, stride = n + 1;

/** Axis sites per world: the tile chains of the frame check (2 sites at least 300 km apart). */
export const FRAME_SITES = 2;
/** Coarse-only net: per cube face K lines along u and K along v, each with N intervals over [-1 - E, 1 + E], so every
 * line runs a short way onto both neighbouring faces (a gnomonic line is a great circle, continuous across the edge). */
export const NET = Object.freeze({K: 4, N: 16384, E: 0.02});
/** Continuity bound (section 3.1): a jump between neighbouring samples may not exceed SLOPE_BOUND x their distance.
 * Measured on the net (all four worlds): the steepest neighbouring-sample slope of the coarse field is 0.70-1.03
 * (<= 46 deg); 4 (76 deg) leaves a margin >= 3.9x. */
export const SLOPE_BOUND = 4;
/** Intervals refined to REFINE sub-intervals: every M1 state change (belt edge, massif edge, belt switch) and every
 * height interval whose slope exceeds FLAG_RATIO x the steepest of its four neighbouring intervals. */
export const REFINE = 1024, FLAG_RATIO = 4;
/** Negative controls. */
export const CONTROL = Object.freeze({carveFactor: 2, edgeOffsetM: 1, stepM: 10});

const pct = (a, q) => {const s = Float64Array.from(a).sort();return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : NaN;};
export const stats = a => ({count: a.length, p50: pct(a, .5), p99: pct(a, .99), max: a.length ? Math.max(...a) : NaN});
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const unit = p => {const l = Math.hypot(...p);return p.map(v => v / l);};

// ---- pure checks (applied by the test to the real data and to the controls) ----

/** FRAME: shared points whose child lies more than roomM below the parent, or more than epsUpM above it. */
export function frameViolations(pair, roomM, epsUpM) {
  let below = 0, above = 0;
  for (let i = 0; i < pair.parent.length; i++) {
    // Written as !(... <= bound) so a non-finite height counts as a violation.
    if (!(pair.parent[i] - pair.child[i] <= roomM)) below++;
    if (!(pair.child[i] - pair.parent[i] <= epsUpM)) above++;
  }
  return {below, above};
}
/** (U1) Carving frame (decisions addendum 6, Q-B): shared points whose CHILD POINT SAMPLE (the child level's sampler at
 * the shared direction) lies more than epsUpM above the parent's STORED height. Non-finite counts as a violation. */
export function carvingFrameViolations(pair, epsUpM) {
  let above = 0;
  for (let i = 0; i < pair.parent.length; i++) if (!(pair.childPoint[i] - pair.parent[i] <= epsUpM)) above++;
  return above;
}
/** EDGE: matched edge vertices whose stored surface or morph-start heights differ (not Object.is), and rendered vertex
 * gaps (morph t = 0 and t = 1) above the Float32 rounding bound of the two anchor-relative buffers. */
export function edgeViolations(e) {
  let heights = 0, morph = 0, gaps = 0;
  for (let i = 0; i < e.a.length; i++) {
    if (!Object.is(e.a[i], e.b[i]) || !Number.isFinite(e.a[i])) heights++;
    if (!Object.is(e.pa[i], e.pb[i]) || !Number.isFinite(e.pa[i])) morph++;
  }
  for (let i = 0; i < e.gap.length; i++) if (!(e.gap[i] <= e.bound[i])) gaps++;
  return {heights, morph, gaps};
}

// ---- measurement ----

/** The belt query (M1): direction on a massif (|axis distance| < MAX_HALF_WIDTH_M on a massif-width belt). */
function massifQuery(body) {
  const lay = orogenLayout(body), o = {belt: 0, axis: [0, 0, 0], axisDistanceM: 0, halfWidthM: 0, beltIndex: -1, alongM: 0};
  return d => {lay.sample(d, o);return o.belt !== 0 && o.halfWidthM >= MASSIF_ENVELOPE.MIN_HALF_WIDTH_M && Math.abs(o.axisDistanceM) < MASSIF_ENVELOPE.MAX_HALF_WIDTH_M;};
}
/** Massif samples of a tile on a 65 x 65 net: T1 band grid cell flagged (massif radius, width gate), then the belt query. */
function massifCounter(body) {
  const lay = orogenLayout(body), inMassif = massifQuery(body);
  return t => {let k = 0;
    for (let y = 0; y <= 64; y++) for (let x = 0; x <= 64; x++) {
      const d = tiles.tileDirection(t, x / 64, y / 64);
      if (lay.bandCellFlagged(d, MASSIF_ENVELOPE.MAX_HALF_WIDTH_M, MASSIF_ENVELOPE.MIN_HALF_WIDTH_M) && inMassif(d)) k++;
    }
    return k;};
}

/** Matched lattice vertices along edge e of tile A and its neighbour B (by direction, < 1e-9). */
function edgePair(body, kind, A, e, a, b, inMassif) {
  const B = b.tile, R = body.radiusM;
  const bDirs = [];for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) if (x === 0 || y === 0 || x === n || y === n) bDirs.push([y * stride + x, tiles.tileDirection(B, x / n, y / n)]);
  const out = {kind, A: tiles.tileKey(A), B: tiles.tileKey(B), edge: e, level: A.level, crossFace: A.face !== B.face, a: [], b: [], pa: [], pb: [], gap: [], bound: [],
    skirtM: Math.min(a.skirtDepthM, b.skirtDepthM), unmatched: 0, massifNodes: 0};
  const rel = (t, key, i) => [0, 1, 2].map(j => t[key][i * 3 + j]), abs = (t, r) => r.map((v, j) => v + t.anchor[j]);
  for (let k = 0; k <= n; k++) {
    const x = e === 0 ? 0 : e === 1 ? n : k, y = e === 2 ? 0 : e === 3 ? n : k, ia = y * stride + x, d = tiles.tileDirection(A, x / n, y / n);
    let best = Infinity, ib = -1;for (const [i, q] of bDirs) {const s = dist3(d, q);if (s < best) {best = s;ib = i;}}
    if (!(best < 1e-9)) {out.unmatched++;continue;}
    if (inMassif(d)) out.massifNodes++;
    out.a.push(a.surfaceHeight[ia]);out.b.push(b.surfaceHeight[ib]);out.pa.push(a.parentHeight[ia]);out.pb.push(b.parentHeight[ib]);
    // Rendered vertex at morph t = 0 (parents) and t = 1 (positions), absolute metres. Both tiles compute the same double
    // position; each stores it anchor-relative in Float32 (relative rounding <= 2^-24 per coordinate), so the gap is
    // bounded by R 2^-24 (|rel_A| + |rel_B|).
    for (const key of ['parents', 'positions']) {
      const ra = rel(a, key, ia), rb = rel(b, key, ib);
      out.gap.push(dist3(abs(a, ra), abs(b, rb)) * R);out.bound.push(R * 2 ** -24 * (Math.hypot(...ra) + Math.hypot(...rb)) * (1 + 1e-9));
    }
  }
  return out;
}

/** Face-edge tile at `level` with >= 3 massif nodes (belt query) on its cube-face edge, in face/edge/position order. */
function crossFaceTile(body, level) {
  const lay = orogenLayout(body), N = 2 ** level, o = {belt: 0, axis: [0, 0, 0], axisDistanceM: 0, halfWidthM: 0, beltIndex: -1, alongM: 0};
  for (let face = 0; face < 6; face++) for (let e = 0; e < 4; e++) for (let k = 0; k < N; k++) {
    const C = {face, level, x: [0, N - 1, k, k][e], y: [k, k, 0, N - 1][e]};
    let hits = 0;
    for (let i = 0; i <= n; i += 2) {
      const [x, y] = [[0, i], [n, i], [i, 0], [i, n]][e], d = tiles.tileDirection(C, x / n, y / n);
      lay.sample(d, o);if (o.belt !== 0 && o.halfWidthM >= MASSIF_ENVELOPE.MIN_HALF_WIDTH_M && Math.abs(o.axisDistanceM) < MASSIF_ENVELOPE.MAX_HALF_WIDTH_M) hits++;
    }
    if (hits >= 3) return {C, e, hits};
  }
  return null;
}

/** COARSE-ONLY continuity over a list of net lines with sampler `h` (direction -> height) and M1 `m1`. */
export function continuity(body, h, m1, lines) {
  const R = body.radiusM, {N, E} = NET;let worstNet = 0, worstFine = 0, refined = 0, violations = 0, flagged = 0, samples = 0;
  const changes = {belt: 0, massif: 0, beltSwitch: 0}, where = [], beltLines = [];let beltEdgesCaught = 0, nonFinite = 0;
  for (const line of lines) {
    const {face, dir, c} = line, beltBefore = changes.belt;
    const D = new Array(N + 1), H = new Float64Array(N + 1), S = new Int32Array(N + 1);
    for (let i = 0; i <= N; i++) {
      const t = -1 - E + (2 + 2 * E) * i / N, d = dir ? tiles.cubeDirection(face, c, t) : tiles.cubeDirection(face, t, c);
      D[i] = d;H[i] = h(d);S[i] = m1(d);samples++;if (!Number.isFinite(H[i])) nonFinite++;
    }
    const J = new Float64Array(N), L = new Float64Array(N), bad = new Uint8Array(N);
    for (let i = 0; i < N; i++) {L[i] = dist3(D[i], D[i + 1]) * R;J[i] = Math.abs(H[i + 1] - H[i]);
      const s = J[i] / L[i];worstNet = Math.max(worstNet, s);
      if (!(J[i] <= SLOPE_BOUND * L[i])) {violations++;bad[i] = 1;if (where.length < 8) where.push({face, dir, c, i, netSlope: s});}}
    for (let i = 0; i < N; i++) {
      const a = S[i], b = S[i + 1];
      // M1 state: 0 outside every belt, else (beltIndex + 1) * 2 + massif bit.
      const beltEdge = (a === 0) !== (b === 0), beltSwitch = a !== 0 && b !== 0 && a >> 1 !== b >> 1, massifEdge = (a & 1) !== (b & 1);
      let loc = 0;for (const k of [i - 2, i - 1, i + 1, i + 2]) if (k >= 0 && k < N) loc = Math.max(loc, J[k] / L[k]);
      const flag = J[i] / L[i] > FLAG_RATIO * loc;
      if (beltEdge) changes.belt++;if (beltSwitch) changes.beltSwitch++;if (massifEdge) changes.massif++;if (flag) flagged++;
      if (!(beltEdge || beltSwitch || massifEdge || flag)) continue;
      // Refine: REFINE sub-intervals on the great-circle arc; a continuous field's sub-jumps shrink with the spacing,
      // a step does not.
      refined++;let prev = H[i], pd = D[i];
      for (let k = 1; k <= REFINE; k++) {
        const t = k / REFINE, d = k === REFINE ? D[i + 1] : unit([0, 1, 2].map(j => D[i][j] * (1 - t) + D[i + 1][j] * t));
        const v = k === REFINE ? H[i + 1] : h(d), l = dist3(pd, d) * R, s = Math.abs(v - prev) / l;samples++;
        worstFine = Math.max(worstFine, s);
        if (!Number.isFinite(v)) nonFinite++;
        if (!(Math.abs(v - prev) <= SLOPE_BOUND * l)) {violations++;bad[i] = 1;if (where.length < 8) where.push({face, dir, c, i, k, jumpM: Math.abs(v - prev), lM: l});}
        prev = v;pd = d;
      }
      if (beltEdge && bad[i]) beltEdgesCaught++;
    }
    if (changes.belt > beltBefore) beltLines.push(line);
  }
  return {beltLines, lines: lines.length, samples, refined, flagged, changes, worstNetSlope: worstNet, worstFineSlope: worstFine, violations, beltEdgesCaught, nonFinite, where};
}

export function netLines() {
  const lines = [];
  for (let face = 0; face < 6; face++) for (let dir = 0; dir < 2; dir++) for (let k = 0; k < NET.K; k++) lines.push({face, dir, c: -1 + (2 * k + 1) / NET.K});
  return lines;
}

export function measureWorld(name) {
  const t0 = performance.now(), body = waterWorlds().find(b => b.name === name), R = body.radiusM;
  const cut = carvingFromLevel(R), corrMax = peakCorrectionMaxLevel(R), massifCount = massifCounter(body), inMassif = massifQuery(body);
  const cache = new Map(), solves = {coarse: 0, fine: 0};
  const build = t => {const k = tiles.tileKey(t);let b = cache.get(k);
    if (!b) {const s0 = carvingBuildStats.count;b = buildOn(body, t);solves[t.level < cut ? 'coarse' : 'fine'] += carvingBuildStats.count - s0;cache.set(k, b);}
    return b;};
  const sites = axisSites(body, {count: FRAME_SITES});
  // Every tile of the frame check touches a massif (asserted); edge-only neighbours are reported, their shared edge's massif
  // nodes are counted per edge pair instead.
  const selected = new Map(), select = (t, role = 'frame') => {const k = tiles.tileKey(t);
    if (!selected.has(k)) selected.set(k, {tile: k, level: t.level, role, massifSamples: massifCount(t)});
    const s = selected.get(k);if (role === 'frame') s.role = 'frame';return s;};

  // (1) FRAME: parent L -> child L + 1 at the shared (co-located) lattice vertices, L = 0 .. corrMax.
  const frame = [], siblings = [];
  for (let L = 0; L <= corrMax; L++) {
    // (U1) The child level's own sampler: its point samples at the shared directions (no peak correction).
    const childSampler = mountainSampler(body, L + 1);
    const pairs = [], seen = new Set();
    for (const s of sites) {
      const P = tiles.directionTile(s.d, L);if (seen.has(tiles.tileKey(P))) continue;seen.add(tiles.tileKey(P));
      select(P);const p = build(P), site = tiles.directionTile(s.d, L + 1), kids = [];
      for (const C of tiles.children(P)) {
        // Uncarved child levels: every child of the parent that touches a massif; carved: the site's own child.
        const isSite = C.x === site.x && C.y === site.y;
        if (L + 1 >= cut ? !isSite : massifCount(C) === 0 && !isSite) continue;
        select(C);const c = build(C), ox = (C.x & 1) * n / 2, oy = (C.y & 1) * n / 2, parent = [], child = [], childPoint = [], dirs = [];
        for (let y = 0; y <= n; y += 2) for (let x = 0; x <= n; x += 2) {
          parent.push(p.surfaceHeight[(oy + y / 2) * stride + ox + x / 2]);child.push(c.surfaceHeight[y * stride + x]);
          const d = tiles.tileDirection(C, x / n, y / n);childPoint.push(childSampler(d).groundHeightM);
          if (L + 1 === cut) dirs.push(d);
        }
        const pair = {P: tiles.tileKey(P), C: tiles.tileKey(C), parent, child, childPoint};
        // Control input at the switch: the child's own carving depth at each shared point (uncarved - carved point sample).
        if (L + 1 === cut) {const up = mountainSampler(body, cut - 1), tr = mountainSampler(body);pair.carveDepth = dirs.map(d => up(d).groundHeightM - tr(d).groundHeightM);}
        pairs.push(pair);kids.push(C);
      }
      if (L + 1 < cut) for (const [i, j, e] of [[0, 1, 1], [2, 3, 1], [0, 2, 3], [1, 3, 3]]) {
        const A = tiles.children(P)[i], B = tiles.children(P)[j];
        if (kids.some(k => k.x === A.x && k.y === A.y) && kids.some(k => k.x === B.x && k.y === B.y)) siblings.push(edgePair(body, 'sibling', A, e, build(A), build(B), inMassif));
      }
    }
    frame.push({L, edgeM: tileEdgeM(R, L), childCorrected: L + 1 <= corrMax, switch: L + 1 === cut, pairs});
  }

  // (2) EDGE MATCH: siblings (above), the 12 cube edges at L0, a cross-face pair at L(cut-1) and L(cut), a non-sibling
  // pair across a parent boundary at L(cut) and a sibling pair at L(cut+1).
  const edges = [...siblings];
  const faces = Array.from({length: 6}, (_, face) => ({face, level: 0, x: 0, y: 0}));
  for (const F of faces) for (let e = 0; e < 4; e++) {
    const G = tiles.tileNeighbour(F, e);if (G.face < F.face) continue;
    edges.push(edgePair(body, 'cube-edge L0', F, e, build(F), build(G), inMassif));
  }
  const cross = {};
  for (const L of [cut - 1, cut]) {
    const f = crossFaceTile(body, L);cross[L] = f && {tile: tiles.tileKey(f.C), edge: f.e, massifEdgeNodes: f.hits};
    if (f) {select(f.C, 'edge');const G = tiles.tileNeighbour(f.C, f.e);select(G, 'edge');edges.push(edgePair(body, `cross-face L${L}`, f.C, f.e, build(f.C), build(G), inMassif));}
  }
  // Same face, carved: at L(cut) a NON-sibling pair (across a parent-boundary edge) and at L(cut+1) a sibling pair, each
  // the candidate edge with the most massif nodes among the site tiles of both sites and their same-face neighbours.
  const edgeMassif = (T, k) => Array.from({length: n + 1}, (_, i) => [[0, i], [n, i], [i, 0], [i, n]][k]).filter(([x, y]) => inMassif(tiles.tileDirection(T, x / n, y / n))).length;
  for (const [L, kind] of [[cut, 'neighbour'], [cut + 1, 'sibling']]) {
    let best = null;
    for (const s0 of sites) {
      const S0 = tiles.directionTile(s0.d, L);
      for (const T of [S0, ...[0, 1, 2, 3].map(k => tiles.tileNeighbour(S0, k)).filter(T => T.face === S0.face)]) {
        const pb = parentBoundaryEdges(T);
        for (const k of [0, 1, 2, 3]) {
          if (tiles.tileNeighbour(T, k).face !== T.face || pb.includes(k) !== (kind === 'neighbour')) continue;
          const m = edgeMassif(T, k);if (!best || m > best.m) best = {T, k, m};
        }
      }
    }
    const NB = tiles.tileNeighbour(best.T, best.k);select(best.T, 'edge');select(NB, 'edge');
    const e = edgePair(body, `${kind} L${L}`, best.T, best.k, build(best.T), build(NB), inMassif);
    e.sameParent = NB.x >> 1 === best.T.x >> 1 && NB.y >> 1 === best.T.y >> 1;edges.push(e);
  }
  for (const e of edges) if (e.sameParent === undefined) e.sameParent = e.kind.startsWith('sibling');

  // Edge control through the normal measurement path: tile A's middle edge vertex raised 1 m (stored height and rendered
  // position, radially), then matched and measured again against the untouched tile B.
  const edgeControl = [];
  for (const e of edges.filter(x => x.level >= cut - 1)) {
    const [face, level, x0, y0] = e.A.split('/').map(Number), TA = {face, level, x: x0, y: y0}, a = build(TA), b = cache.get(e.B), k = 16;
    const ia = [k, k, 0, n][e.edge] * stride + [0, n, k, k][e.edge];
    const pa = {...a, surfaceHeight: Float32Array.from(a.surfaceHeight), positions: Float32Array.from(a.positions)};
    pa.surfaceHeight[ia] = Math.fround(pa.surfaceHeight[ia] + CONTROL.edgeOffsetM);
    const abs = [0, 1, 2].map(j => pa.positions[ia * 3 + j] + pa.anchor[j]), u = unit(abs);
    for (let j = 0; j < 3; j++) pa.positions[ia * 3 + j] = abs[j] + u[j] * CONTROL.edgeOffsetM / R - pa.anchor[j];
    edgeControl.push({kind: e.kind, A: e.A, B: e.B, ...edgeViolations(edgePair(body, e.kind, TA, e.edge, pa, b, inMassif))});
  }

  // (3) COARSE-ONLY continuity on the net, sampled at L(cut-1) (every level below the cut is the same uncarved field).
  const coarse = mountainSampler(body, cut - 1), lay = orogenLayout(body), o = {belt: 0, axis: [0, 0, 0], axisDistanceM: 0, halfWidthM: 0, beltIndex: -1, alongM: 0};
  const m1 = d => {lay.sample(d, o);if (o.belt === 0) return 0;
    const massif = o.halfWidthM >= MASSIF_ENVELOPE.MIN_HALF_WIDTH_M && Math.abs(o.axisDistanceM) < MASSIF_ENVELOPE.MAX_HALF_WIDTH_M;
    return (o.beltIndex + 1) * 2 + (massif ? 1 : 0);};
  const h = d => coarse(d).groundHeightM, lines = netLines();
  const c0 = carvingBuildStats.count, real = continuity(body, h, m1, lines), netSolves = carvingBuildStats.count - c0;
  // Control: the same field with a CONTROL.stepM step on every belt (belt > 0), on the lines that cross a belt edge.
  const beltLines = real.beltLines.slice(0, 4);
  const stepped = continuity(body, d => h(d) + (lay.sample(d, o).belt > 0 ? CONTROL.stepM : 0), m1, beltLines);
  return {world: name, cut, corrMax, sites: sites.map(s => s.d), selected: [...selected.values()], solves, frame, edges, cross,
    continuity: {...real, solves: netSolves}, stepControl: stepped, edgeControl, ms: performance.now() - t0};
}

if (!isMainThread && workerData) parentPort.postMessage(measureWorld(workerData));
