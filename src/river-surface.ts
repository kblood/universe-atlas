import * as THREE from "three";
import polygonClipping, {
  type MultiPolygon,
  type Pair,
  type Polygon,
} from "polygon-clipping";
import type { RiverChannel, RiverRegion } from "./river-types.ts";
import {conformRiverSurface} from './river-surface-conform.ts';
// Bumped to -2: childTapers/profile now taper a child channel's own depth to
// zero over a short stretch of arc length near its attached (confluence)
// end, closing a genuine wet/wet bed-height cliff that could otherwise
// appear right where the polygon-clipping ownership boundary cuts between a
// channel and its already-placed parent (see buildRiverSurface below).
export const RIVER_PHYSICAL_SURFACE_VERSION =
  "river-physical-surface-2" as const;
const { difference } = polygonClipping,
  MAX_BYTES = 16 * 1024 * 1024,
  CELL = 64;
type S = { channel: RiverChannel; segment: number; id: string };
type T = { a: number; b: number; c: number; s: S };
export type RiverSurfaceQuery = {
  wet: true;
  waterM: number;
  depthM: number;
  flow: [number, number];
  sourceId: string;
  segment: number;
};
export type RiverSurface = {
  version: typeof RIVER_PHYSICAL_SURFACE_VERSION;
  positions: Float64Array;
  waterM: Float32Array;
  depthM: Float32Array;
  flow: Float32Array;
  indices: Uint32Array;
  triangleSourceIds: Uint32Array;
  sources: ReadonlyArray<{ channelId: string; segment: number }>;
  bytes: number;
  diagnostics: {
    sources: number;
    triangles: number;
    vertices: number;
    rejected: string | null;
    canonicalBytes: number;
    queryBytes: number;
    projectedRenderBytes: number;
    candidateComparisons: number;
  };
  query: (x: number, z: number) => RiverSurfaceQuery | null;
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v)),
  lerp = (a: number, b: number, t: number) => a + (b - a) * t,
  key = (x: number, z: number) =>
    `${Math.round(x * 10000)},${Math.round(z * 10000)}`;
function order(r: RiverRegion) {
  const by = new Map(r.channels.map((c) => [c.id, c])),
    state = new Map<string, number>(),
    levels = new Map<string, number>(),
    depth = (c: RiverChannel): number => {
      const q = state.get(c.id);
      if (q === 1) throw new Error(`river parent cycle at ${c.id}`);
      if (q === 2) return levels.get(c.id)!;
      state.set(c.id, 1);
      const p = c.parentId ? by.get(c.parentId) : undefined;
      if (c.parentId && !p)
        throw new Error(`unknown river parent ${c.parentId}`);
      const d = p ? depth(p) + 1 : 0;
      state.set(c.id, 2);
      levels.set(c.id, d);
      return d;
    };
  for (const c of r.channels) depth(c);
  return r.channels
    .flatMap((c) =>
      c.points
        .slice(0, -1)
        .map((_, i) => ({ channel: c, segment: i, id: c.id + "/" + i })),
    )
    .sort(
      (a, b) =>
        depth(a.channel) - depth(b.channel) ||
        (a.channel.id < b.channel.id
          ? -1
          : a.channel.id > b.channel.id
            ? 1
            : 0) ||
        b.segment - a.segment,
    );
}
const clean = (ring: Pair[]) => {
  const a: Pair[] = [];
  for (const q of ring) {
    const p: Pair = [
        Math.round(q[0] * 1e4) / 1e4,
        Math.round(q[1] * 1e4) / 1e4,
      ],
      last = a.at(-1);
    if (!last || last[0] !== p[0] || last[1] !== p[1]) a.push(p);
  }
  if (a.length > 2 && key(...a[0]) === key(...a.at(-1)!)) a.pop();
  for (let i = a.length - 1; i >= 0 && a.length >= 3; i--) {
    const p = a[(i + a.length - 1) % a.length], q = a[i], n = a[(i + 1) % a.length];
    if (Math.abs((q[0] - p[0]) * (n[1] - q[1]) - (q[1] - p[1]) * (n[0] - q[0])) < 1e-10) a.splice(i, 1);
  }
  return a.length >= 3 ? [...a, a[0]] : [];
};
function pieces(s: S): Polygon[] {
  const a = s.channel.points[s.segment],
    b = s.channel.points[s.segment + 1],
    dx = b.x - a.x,
    dz = b.z - a.z,
    l = Math.hypot(dx, dz);
  if (l < 1e-6) return [];
  const nodeNormal = (index: number) => { const p=s.channel.points, lo=p[Math.max(0,index-1)], hi=p[Math.min(p.length-1,index+1)], tx=hi.x-lo.x,tz=hi.z-lo.z,n=Math.hypot(tx,tz)||1; return [-tz/n,tx/n] as const; },
    [nax,naz]=nodeNormal(s.segment), [nbx,nbz]=nodeNormal(s.segment+1),
    ra = a.widthM * 0.5,
    rb = b.widthM * 0.5,
    n = Math.max(
      2,
      Math.ceil(Math.PI / Math.acos(1 - 0.05 / Math.max(0.05, ra, rb))),
    ),
    out: Polygon[] = [
      [
        [
          [a.x, a.z],
          [a.x + nax * ra, a.z + naz * ra],
          [b.x + nbx * rb, b.z + nbz * rb],
          [b.x, b.z],
          [a.x, a.z],
        ],
      ],
      [
        [
          [a.x, a.z],
          [b.x, b.z],
          [b.x - nbx * rb, b.z - nbz * rb],
          [a.x - nax * ra, a.z - naz * ra],
          [a.x, a.z],
        ],
      ],
    ];
  for (const [c, r, sgn, normal] of [[ [a.x, a.z], ra, -1, [nax,naz] ], [ [b.x, b.z], rb, 1, [nbx,nbz] ]] as const) {
    if ((sgn < 0 && s.segment !== 0) || (sgn > 0 && s.segment !== s.channel.points.length - 2)) continue;
    let prev: Pair | undefined;
    for (let i = 0; i <= n; i++) {
      const q = Math.PI * 0.5 - (i * Math.PI) / n,
        p: Pair = [
          c[0] + ((sgn * Math.cos(q) * dx) / l) * r + Math.sin(q) * normal[0] * r,
          c[1] + ((sgn * Math.cos(q) * dz) / l) * r + Math.sin(q) * normal[1] * r,
        ];
      if (prev) {
        const cc: Pair = [c[0], c[1]],
          ring = clean([cc, prev, p, cc]);
        if (ring.length) out.push([ring]);
      }
      prev = p;
    }
  }
  return out.map((p) => [clean(p[0])]).filter((p) => p[0].length);
}
type ChildTaper = { attachedDistanceM: number; taperLenM: number; parent: RiverChannel };
/**
 * Every child channel is authored so one of its endpoints lands exactly on
 * its parent's own polyline (river-generation.ts's tributary junction). Each
 * channel's `profile()` bowl is centred on its OWN centreline and tapers to
 * zero depth at its OWN bank (e=1) — but the ownership boundary the
 * `difference()` loop below cuts between a child and its already-placed
 * parent is generally NOT the child's own bank; it is wherever the PARENT's
 * own shoreline happens to fall. Right at a confluence this is often nearly
 * perpendicular to the child's own centreline (a T-junction), so a point
 * that sits just outside the parent's channel — on the sliver of the child's
 * polygon that survives clipping — can still be very close to the CHILD's
 * OWN centreline (small e, near-full depth), even though physically it is
 * sitting right on the parent's shoreline (which is always zero-depth, since
 * `profile()`'s own e=1 edge always has depthM=0). That mismatch between "far
 * from the child's centreline" and "far from the parent's boundary" is the
 * actual seam: a wet/wet bed-height cliff that is a property of ARC-LENGTH
 * along the child's own centreline near its attached end, not of the child's
 * cross-channel position, and not of any single triangle's shape.
 *
 * Per-triangle radius/compactness gates were tried and rejected: "near the
 * seam" here is not a 2D Euclidean neighbourhood of the junction point (a
 * child approaching near-perpendicular can stay close to its OWN centreline,
 * i.e. deep, for a good distance past the junction in real 2D space), so any
 * fixed-radius or triangle-span test either missed the real seam entirely or
 * grabbed unrelated far-away geometry in coarser fixtures.
 *
 * The fix instead tapers a CHILD channel's own `depthM` smoothly to zero as
 * ARC LENGTH along the child's own centreline approaches its attached end —
 * using the channel's own monotonic `distanceM`, exactly the coordinate the
 * ownership cut is effectively aligned with at that end, regardless of
 * cross-channel position or triangle shape. At the attached end itself this
 * makes the child's own bed converge to its own `waterM` there. That alone
 * is not quite enough: `waterM` is flat across a channel's OWN width, but it
 * still varies along a channel's length (the water surface follows the
 * ground's slope), and the arc-length position `profile()` resolves to on
 * the child's own segment near the seam is generally NOT the exact
 * coincident point, so the child's own `waterM` there can differ from the
 * parent's local water level by a similar cliff. So within the same taper
 * zone, `waterM` is blended (with the identical smoothstep weight) toward
 * the PARENT's own `waterM` at the nearest point on the parent's own
 * polyline — which is safe to do only because it is confined to this short,
 * bounded zone and fades out with the same weight that zeroes the depth;
 * unbounded per-vertex blending toward a nearby channel's reading was tried
 * and rejected earlier for corrupting unrelated far-field geometry, but here
 * it can only ever act within `taperLenM` of a genuine, authored confluence
 * point. Both terms are plain functions of continuous coordinates (arc
 * length, and nearest-point projection onto the parent) run through a
 * smoothstep, so they are continuous in (x,z) by construction — ordinary
 * per-vertex barycentric interpolation of a continuous per-vertex field
 * stays continuous — with no triangle-level gating needed, so this cannot
 * introduce a new internal triangle discontinuity, and it self-limits to a
 * short stretch of the child's own length near the confluence rather than
 * reaching out along unrelated, possibly oversized, geometry.
 */
function childTapers(region: RiverRegion): Map<string, ChildTaper> {
  const byId = new Map(region.channels.map((c) => [c.id, c] as const)),
    tapers = new Map<string, ChildTaper>();
  for (const c of region.channels) {
    if (!c.parentId) continue;
    const parent = byId.get(c.parentId);
    if (!parent) continue;
    for (const end of [c.points[0], c.points[c.points.length - 1]]) {
      let nearest = parent.points[0], best = Infinity;
      for (const p of parent.points) {
        const d = Math.hypot(p.x - end.x, p.z - end.z);
        if (d < best) { best = d; nearest = p; }
      }
      // Only the endpoint that is actually attached to the parent (the other
      // end is the tributary's own free headwater) gets a taper.
      if (best > 1e-6) continue;
      // A generous multiple of the local channel width: a near-perpendicular
      // (T-junction) approach can keep a query point close to the CHILD's
      // own centreline for a good stretch of arc length past the confluence
      // even though it is only a hair outside the PARENT's channel, so the
      // taper needs enough length to fully reach zero before the ownership
      // cut can plausibly still be biting into the child's polygon (measured
      // empirically against real canonical basins, not merely the synthetic
      // fixture). It still stays short enough to leave the rest of the
      // child's length (an unrelated, possibly much longer, stretch)
      // completely untouched.
      const taperLenM = Math.max(end.widthM, nearest.widthM) * 10;
      tapers.set(c.id, { attachedDistanceM: end.distanceM, taperLenM, parent });
    }
  }
  return tapers;
}
/** The parent's own `waterM` at the point on the parent's polyline nearest
 * (x,z) — a plain nearest-segment projection, continuous in (x,z) wherever
 * two segments' own local projections agree at their shared node (which they
 * do, since adjacent segments of one channel share endpoint values). Only
 * ever consulted from within a bounded taper zone (see childTapers above),
 * never as a general cross-channel lookup. */
function nearestChannelWaterM(channel: RiverChannel, x: number, z: number): number {
  let best = Infinity, waterM = channel.points[0].waterM;
  for (let i = 0; i < channel.points.length - 1; i++) {
    const a = channel.points[i], b = channel.points[i + 1],
      dx = b.x - a.x, dz = b.z - a.z, l = dx * dx + dz * dz,
      t = l ? clamp(((x - a.x) * dx + (z - a.z) * dz) / l, 0, 1) : 0,
      cx = a.x + dx * t, cz = a.z + dz * t,
      d = Math.hypot(x - cx, z - cz);
    if (d < best) { best = d; waterM = lerp(a.waterM, b.waterM, t); }
  }
  return waterM;
}
function profile(s: S, x: number, z: number, tapers?: Map<string, ChildTaper>) {
  const a = s.channel.points[s.segment],
    b = s.channel.points[s.segment + 1],
    dx = b.x - a.x,
    dz = b.z - a.z,
    l = dx * dx + dz * dz,
    t = l ? clamp(((x - a.x) * dx + (z - a.z) * dz) / l, 0, 1) : 0,
    cx = a.x + dx * t,
    cz = a.z + dz * t,
    r = Math.max(0.001, lerp(a.widthM, b.widthM, t) * 0.5),
    e = clamp(Math.hypot(x - cx, z - cz) / r, 0, 1),
    n = Math.hypot(dx, dz) || 1;
  let depthM = lerp(a.depthM, b.depthM, t) * (1 - e * e),
    waterM = lerp(a.waterM, b.waterM, t);
  const taper = tapers?.get(s.channel.id);
  if (taper) {
    const arc = lerp(a.distanceM, b.distanceM, t),
      k = clamp(Math.abs(arc - taper.attachedDistanceM) / Math.max(1e-6, taper.taperLenM), 0, 1),
      smooth = k * k * (3 - 2 * k);
    depthM *= smooth;
    if (smooth < 1) waterM = lerp(nearestChannelWaterM(taper.parent, x, z), waterM, smooth);
  }
  return {
    waterM,
    depthM,
    flow: [dx / n, dz / n] as [number, number],
  };
}
type RiverSurfaceIndex = {
  cellKeys: Float64Array;
  cellOffsets: Uint32Array;
  triangleRefs: Uint32Array;
};

function buildRiverSurfaceIndex(positions: Float64Array, indices: Uint32Array): RiverSurfaceIndex {
  const cells = new Map<number, number[]>();
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2],
      x0 = Math.min(positions[a * 2], positions[b * 2], positions[c * 2]),
      x1 = Math.max(positions[a * 2], positions[b * 2], positions[c * 2]),
      z0 = Math.min(positions[a * 2 + 1], positions[b * 2 + 1], positions[c * 2 + 1]),
      z1 = Math.max(positions[a * 2 + 1], positions[b * 2 + 1], positions[c * 2 + 1]);
    for (let z = Math.floor(z0 / CELL); z <= Math.floor(z1 / CELL); z++)
      for (let x = Math.floor(x0 / CELL); x <= Math.floor(x1 / CELL); x++) {
        const k = x * 1048576 + z, bucket = cells.get(k) || [];
        bucket.push(i / 3);
        cells.set(k, bucket);
      }
  }
  const keys = [...cells.keys()].sort((a, b) => a - b),
    cellKeys = Float64Array.from(keys),
    cellOffsets = new Uint32Array(keys.length + 1),
    triangleRefs = new Uint32Array([...cells.values()].reduce((n, v) => n + v.length, 0));
  let cursor = 0;
  for (let i = 0; i < keys.length; i++) {
    cellOffsets[i] = cursor;
    for (const triangle of cells.get(keys[i])!) triangleRefs[cursor++] = triangle;
  }
  cellOffsets[keys.length] = cursor;
  return { cellKeys, cellOffsets, triangleRefs };
}

function makeRiverSurfaceQuery(
  positions: Float64Array,
  waterM: Float32Array,
  depthM: Float32Array,
  flow: Float32Array,
  indices: Uint32Array,
  triangleSourceIds: Uint32Array,
  sources: ReadonlyArray<{ channelId: string; segment: number }>,
  index: RiverSurfaceIndex,
): (x: number, z: number) => RiverSurfaceQuery | null {
  const { cellKeys, cellOffsets, triangleRefs } = index;
  return (x, z) => {
    const target = Math.floor(x / CELL) * 1048576 + Math.floor(z / CELL);
    let lo = 0, hi = cellKeys.length - 1, cell = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1, value = cellKeys[mid];
      if (value === target) { cell = mid; break; }
      if (value < target) lo = mid + 1; else hi = mid - 1;
    }
    if (cell < 0) return null;
    for (let ref = cellOffsets[cell]; ref < cellOffsets[cell + 1]; ref++) {
      const triangle = triangleRefs[ref],
        a = indices[triangle * 3], b = indices[triangle * 3 + 1], c = indices[triangle * 3 + 2],
        ax = positions[a * 2], az = positions[a * 2 + 1],
        bx = positions[b * 2], bz = positions[b * 2 + 1],
        cx = positions[c * 2], cz = positions[c * 2 + 1],
        determinant = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
      if (Math.abs(determinant) < 1e-12) continue;
      const u = ((x - ax) * (cz - az) - (z - az) * (cx - ax)) / determinant,
        v = ((bx - ax) * (z - az) - (bz - az) * (x - ax)) / determinant,
        w = 1 - u - v;
      if (u < -1e-7 || v < -1e-7 || w < -1e-7) continue;
      const source = sources[triangleSourceIds[triangle]],
        flowX = flow[a * 2] * w + flow[b * 2] * u + flow[c * 2] * v,
        flowZ = flow[a * 2 + 1] * w + flow[b * 2 + 1] * u + flow[c * 2 + 1] * v,
        length = Math.hypot(flowX, flowZ) || 1;
      return {
        wet: true,
        waterM: waterM[a] * w + waterM[b] * u + waterM[c] * v,
        depthM: depthM[a] * w + depthM[b] * u + depthM[c] * v,
        flow: [flowX / length, flowZ / length],
        sourceId: source.channelId,
        segment: source.segment,
      };
    }
    return null;
  };
}

export function buildRiverSurface(region: RiverRegion): RiverSurface {
  const empty = (why: string) => ({
    version: RIVER_PHYSICAL_SURFACE_VERSION,
    positions: new Float64Array(),
    waterM: new Float32Array(),
    depthM: new Float32Array(),
    flow: new Float32Array(),
    indices: new Uint32Array(),
    triangleSourceIds: new Uint32Array(),
    sources: [],
    bytes: 0,
    diagnostics: {
      sources: 0,
      triangles: 0,
      vertices: 0,
      rejected: why,
      canonicalBytes: 0,
      queryBytes: 0,
      projectedRenderBytes: 0,
      candidateComparisons: 0,
    },
    query: () => null,
  });
  if (region.boundsM.some((v) => !Number.isFinite(v) || Math.abs(v) > 500000))
    return empty("unsafe spatial bounds");
  if (region.channels.length > 8192) return empty("channel count cap");
  for (const channel of region.channels) {
    if (channel.points.length < 2 || channel.points.length > 4096) return empty("point count cap");
    for (const p of channel.points)
      if (![p.x, p.z, p.widthM, p.waterM, p.depthM].every(Number.isFinite) || Math.abs(p.x) > 500000 || Math.abs(p.z) > 500000 || p.widthM < 0 || p.widthM > 20000 || p.depthM < 0 || p.depthM > 20000)
        return empty("unsafe channel point");
  }
  let sources: S[];
  try {
    sources = order(region);
  } catch (e) {
    return empty(e instanceof Error ? e.message : String(e));
  }
  const verts: Pair[] = [],
    tri: T[] = [],
    maps = new Map<string, Map<string, number>>(),
    occ: Polygon[] = [],
    grid = new Map<number, number[]>();
  let compares = 0,
    failed = "";
  const bbox = (p: Polygon) =>
    p[0].reduce(
      (b, q) => [
        Math.min(b[0], q[0]),
        Math.min(b[1], q[1]),
        Math.max(b[2], q[0]),
        Math.max(b[3], q[1]),
      ],
      [Infinity, Infinity, -Infinity, -Infinity],
    );
  const ids = (p: Polygon) => {
    const b = bbox(p),
      set = new Set<number>();
    for (let z = Math.floor(b[1] / CELL); z <= Math.floor(b[3] / CELL); z++)
      for (let x = Math.floor(b[0] / CELL); x <= Math.floor(b[2] / CELL); x++)
        for (const id of grid.get(x * 1048576 + z) || []) set.add(id);
    return set;
  };
  const add = (p: Polygon, id: number) => {
    const b = bbox(p);
    for (let z = Math.floor(b[1] / CELL); z <= Math.floor(b[3] / CELL); z++)
      for (let x = Math.floor(b[0] / CELL); x <= Math.floor(b[2] / CELL); x++) {
        const k = x * 1048576 + z,
          v = grid.get(k) || [];
        if (v.length > 8192) {
          failed = "ownership cell cap";
          return;
        }
        v.push(id);
        grid.set(k, v);
      }
  };
  for (const s of sources) {
    const ps = pieces(s);
    for (const p of ps) {
      let rest: MultiPolygon = [p];
      const near = ids(p);
      compares += near.size;
      try {
        for (const id of near) rest = difference(rest, occ[id]);
      } catch (e) {
        failed = e instanceof Error ? e.message : String(e);
        break;
      }
      for (const poly of rest) {
        const rings = poly.map((r) => clean(r)).filter((r) => r.length >= 4);
        if (!rings.length) continue;
        const ring = rings[0].slice(0, -1),
          base = ring.map((q) => new THREE.Vector2(...q)),
          holes = rings.slice(1).map((r) => r.slice(0, -1).map((q) => new THREE.Vector2(...q))),
          flattened = [ring, ...rings.slice(1).map((r) => r.slice(0, -1))].flat(),
          map = maps.get(s.id) || new Map<string, number>();
        maps.set(s.id, map);
        const ix = (i: number) => {
          const q = flattened[i],
            k = key(...q),
            old = map.get(k);
          if (old !== undefined) return old;
          const n = verts.length;
          verts.push(q);
          map.set(k, n);
          return n;
        };
        for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(base, holes)) {
          const ia = ix(a),
            ib = ix(b),
            ic = ix(c),
            u = verts[ia],
            v = verts[ib],
            w = verts[ic];
          if (
            Math.abs(
              (v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0]),
            ) > 1e-8
          )
            tri.push({ a: ia, b: ib, c: ic, s });
        }
      }
    }
    if (failed) break;
    for (const p of ps) {
      add(p, occ.length);
      occ.push(p);
    }
    if (failed || verts.length * 160 + tri.length * 24 > MAX_BYTES) {
      failed = failed || "construction budget";
      break;
    }
  }
  if (failed) return empty(failed);
  let pos = new Float64Array(verts.length * 2),
    wm = new Float32Array(verts.length),
    dm = new Float32Array(verts.length),
    fl = new Float32Array(verts.length * 2),
    ind = new Uint32Array(tri.length * 3);
  for (let i = 0; i < verts.length; i++) pos.set(verts[i], i * 2);
  const tapers = childTapers(region);
  for (let i = 0; i < tri.length; i++) {
    const t = tri[i];
    ind.set([t.a, t.b, t.c], i * 3);
    for (const j of [t.a, t.b, t.c]) {
      const q = profile(t.s, ...verts[j], tapers);
      wm[j] = q.waterM;
      dm[j] = q.depthM;
      fl.set(q.flow, j * 2);
    }
  }
  const sourceTable: { channelId: string; segment: number }[] = [], sourceIds = new Map<string, number>();
  let triangleSourceIds = new Uint32Array(tri.length);
  for (let i = 0; i < tri.length; i++) {
    const source = tri[i].s, sourceKey = source.id;
    let sourceId = sourceIds.get(sourceKey);
    if (sourceId === undefined) {
      sourceId = sourceTable.length;
      sourceIds.set(sourceKey, sourceId);
      sourceTable.push({ channelId: source.channel.id, segment: source.segment });
    }
    triangleSourceIds[i] = sourceId;
  }
  let conformed;
  try {
    conformed = conformRiverSurface({ positions: pos, indices: ind, triangleSourceIds });
  } catch (error) {
    return empty(error instanceof Error ? `conform rejected: ${error.message}` : "conform rejected");
  }
  const oldWm = wm, oldDm = dm, oldFl = fl, oldInd = ind;
  pos = new Float64Array(conformed.positions);
  ind = new Uint32Array(conformed.indices);
  triangleSourceIds = new Uint32Array(conformed.triangleSourceIds);
  wm = new Float32Array(pos.length / 2);
  dm = new Float32Array(pos.length / 2);
  fl = new Float32Array(pos.length);
  for (let i = 0; i < wm.length; i++) {
    const original = conformed.vertexOriginalIndices[i], parent = conformed.vertexParentTriangles[i];
    if (original >= 0) {
      wm[i] = oldWm[original]; dm[i] = oldDm[original];
      fl[i * 2] = oldFl[original * 2]; fl[i * 2 + 1] = oldFl[original * 2 + 1];
    } else {
      const a = oldInd[parent * 3], b = oldInd[parent * 3 + 1], c = oldInd[parent * 3 + 2];
      wm[i] = (oldWm[a] + oldWm[b] + oldWm[c]) / 3;
      dm[i] = (oldDm[a] + oldDm[b] + oldDm[c]) / 3;
      fl[i * 2] = (oldFl[a * 2] + oldFl[b * 2] + oldFl[c * 2]) / 3;
      fl[i * 2 + 1] = (oldFl[a * 2 + 1] + oldFl[b * 2 + 1] + oldFl[c * 2 + 1]) / 3;
    }
  }
  const finalIndex = buildRiverSurfaceIndex(pos, ind),
    query = makeRiverSurfaceQuery(pos, wm, dm, fl, ind, triangleSourceIds, sourceTable, finalIndex),
    { cellKeys, cellOffsets, triangleRefs } = finalIndex;
  const canonical =
      pos.byteLength +
      wm.byteLength +
      dm.byteLength +
      fl.byteLength +
      ind.byteLength,
    queryBytes = cellKeys.byteLength + cellOffsets.byteLength + triangleRefs.byteLength + triangleSourceIds.byteLength,
    render = ((pos.length / 2) * 64 + ind.byteLength) * 2,
    bytes = canonical + queryBytes + render;
  if (bytes > MAX_BYTES) return empty("accounted storage budget");
  return {
    version: RIVER_PHYSICAL_SURFACE_VERSION,
    positions: pos,
    waterM: wm,
    depthM: dm,
    flow: fl,
    indices: ind,
    triangleSourceIds,
    sources: sourceTable,
    bytes,
    diagnostics: {
      sources: sources.length,
      triangles: ind.length / 3,
      vertices: pos.length / 2,
      rejected: null,
      canonicalBytes: canonical,
      queryBytes,
      projectedRenderBytes: render,
      candidateComparisons: compares,
    },
    query,
  };
}
