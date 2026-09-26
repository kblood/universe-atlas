import {
  density,
  spiralArmStrength,
  rng,
  groupsInCluster,
  type Galaxy,
  type GroupAnchor,
  type V3,
} from "./catalog.ts";
import type { CellV3 } from "./address.ts";

// Integrate the SAME density used by 4-ly catalogue cells. The nonuniform
// vertical bins resolve thin disks without allocating a galaxy-sized grid.
const NX = 96;
const Y = [
  -1.4, -0.7, -0.35, -0.15, -0.06, -0.025, -0.01, -0.003, 0, 0.003, 0.01, 0.025,
  0.06, 0.15, 0.35, 0.7, 1.4,
];
const NY = Y.length - 1,
  STEP = 2.8 / NX;
const cache = new Map<string, Float32Array>();
function distribution(g: Galaxy) {
  const key = JSON.stringify([
    g.seed,
    g.type,
    g.radiusLy,
    g.arms,
    g.phase,
    g.pitch,
  ]);
  const prior = cache.get(key);
  if (prior) {
    cache.delete(key);
    cache.set(key, prior);
    return prior;
  }
  const weights = new Float64Array(NX * NX * NY);
  let total = 0;
  for (let x = 0; x < NX; x++)
    for (let z = 0; z < NX; z++)
      for (let y = 0; y < NY; y++) {
        const p: V3 = [
          (-1.4 + (x + 0.5) * STEP) * g.radiusLy,
          (Y[y] + Y[y + 1]) * 0.5 * g.radiusLy,
          (-1.4 + (z + 0.5) * STEP) * g.radiusLy,
        ];
        total += density(g, p) * (Y[y + 1] - Y[y]);
        weights[(x * NX + z) * NY + y] = total;
      }
  const cdf = Float32Array.from(weights, (v) => v / total);
  if (cache.size >= 32) cache.delete(cache.keys().next().value!);
  cache.set(key, cdf);
  return cdf;
}
export function densityOverview(g: Galaxy, count: number) {
  const cdf = distribution(g),
    random = rng(g.seed + "/density-preview-v1"),
    colorRandom = rng(g.seed + "/density-colour-v1");
  const positions = new Float32Array(count * 3),
    colors = new Float32Array(count * 3),
    sizes = new Float32Array(count);
  let n = 0;
  while (n < count) {
    const pick = random();
    let lo = 0,
      hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (cdf[mid] <= pick) lo = mid + 1;
      else hi = mid;
    }
    const y = lo % NY,
      z = Math.floor(lo / NY) % NX,
      x = Math.floor(lo / (NY * NX));
    const p: V3 = [
      (-1.4 + (x + random()) * STEP) * g.radiusLy,
      (Y[y] + random() * (Y[y + 1] - Y[y])) * g.radiusLy,
      (-1.4 + (z + random()) * STEP) * g.radiusLy,
    ];
    if (density(g, p) <= 0) continue;
    positions.set(p, n * 3);
    const core = Math.hypot(...p) < g.radiusLy * 0.15;
    // Population counts and luminosity differ: young thin-disk arm populations
    // outshine the old bulge. Derive their light from the catalogue's arm field.
    const spiral = g.type === "Spiral" || g.type === "Barred spiral";
    const young = spiral
      ? Math.exp(-Math.abs(p[1]) / (g.radiusLy * 0.012)) *
        spiralArmStrength(g, p[0], p[2])
      : 0;
    const light = spiral ? 0.22 + young * 1.8 : 0.8;
    const blue = young > 0.12 || (!core && !spiral && colorRandom() > 0.3);
    const rgb = blue ? [0.46, 0.72, 1] : [1, 0.74, 0.45];
    colors.set(
      rgb.map((v) => v * light),
      n * 3,
    );
    sizes[n] = spiral
      ? 0.55 + colorRandom() * 0.7 + young * 3.6
      : 1 + colorRandom() * 1.5;
    n++;
  }
  return { positions, colors, sizes };
}

// ---------------------------------------------------------------------------
// Cluster-scale field: a lazy replacement for iterating the fixed 32-galaxy
// array at the "which galaxies exist near the camera" scale. Where
// `densityOverview` above turns one galaxy's continuous density field into a
// renderable star point-cloud, `fieldOverview` turns a window of the
// cluster/group hierarchy (catalog.ts's `groupsInCluster`) into a renderable
// "where are the groups" point-cloud - the piece Package D's
// `galaxy-space.ts` needs to stream chunks over an unbounded universe
// instead of assuming a fixed 32-entry array.
// ---------------------------------------------------------------------------

export interface FieldAnchor extends GroupAnchor {
  clusterCell: CellV3;
}

/** Enumerates every non-empty group across a rectangular block of cluster
 * cells (inclusive `loCluster`..`hiCluster` per axis - both BigInt, so the
 * block itself can sit anywhere in the unbounded universe). Each cluster is
 * generated independently via `groupsInCluster` (no dependency on
 * neighbouring clusters), so callers request only the window they need
 * instead of the whole universe. */
export function fieldOverview(seed: string, loCluster: CellV3, hiCluster: CellV3): FieldAnchor[] {
  const anchors: FieldAnchor[] = [];
  for (let x = loCluster[0]; x <= hiCluster[0]; x++)
    for (let y = loCluster[1]; y <= hiCluster[1]; y++)
      for (let z = loCluster[2]; z <= hiCluster[2]; z++) {
        const clusterCell: CellV3 = [x, y, z];
        for (const anchor of groupsInCluster(seed, clusterCell)) {
          anchors.push({ ...anchor, clusterCell });
        }
      }
  return anchors;
}
