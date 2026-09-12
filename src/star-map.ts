import {
  overview,
  refByAddress,
  rng,
  sector,
  type Galaxy,
  type V3,
  type SystemRef,
} from "./catalog.ts";

// Every point offered for selection in the galaxy map is an existing catalogue
// system. Probe around a density tracer; never turn the tracer itself into a star.
const maps = new Map<string, ReturnType<typeof buildStarMap>>();
function buildStarMap(g: Galaxy, count: number) {
  const field = overview(g, count),
    refs: SystemRef[] = [],
    positions: number[] = [],
    colors: number[] = [],
    sizes: number[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < count; i++) {
    const base = [0, 1, 2].map((a) =>
      Math.floor(field.positions[i * 3 + a] / 4),
    ) as V3;
    const random = rng(g.seed + "/map-anchor/" + i);
    for (let attempt = 0; attempt < 56; attempt++) {
      const radius = attempt === 0 ? 0 : 2 ** Math.floor(attempt / 8);
      const cell = base.map(
        (v) => v + Math.floor((random() * 2 - 1) * radius),
      ) as V3;
      const ref = refByAddress(g, `${g.id}/C${cell.join(",")}/0`);
      if (!ref) continue;
      if (!seen.has(ref.id)) {
        seen.add(ref.id);
        refs.push(ref);
        positions.push(...ref.position);
        colors.push(...field.colors.slice(i * 3, i * 3 + 3));
        sizes.push(field.sizes[i]);
      }
      break;
    }
  }
  return {
    refs,
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    sizes: new Float32Array(sizes),
  };
}
export function starMap(g: Galaxy, count = 10000) {
  const key = g.seed + "/" + count;
  let data = maps.get(key);
  if (!data) {
    data = buildStarMap(g, count);
    if (maps.size >= 4) maps.delete(maps.keys().next().value!);
    maps.set(key, data);
  }
  // The cached originals must survive transfer to the renderer.
  return {
    ...data,
    positions: data.positions.slice(),
    colors: data.colors.slice(),
    sizes: data.sizes.slice(),
  };
}
export const chunkKey = (c: V3) => c.join(",");
export function neighbourhood(p: V3): V3[] {
  const c = p.map((v) => Math.floor(v / 32)) as V3,
    result: V3[] = [];
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) result.push([c[0] + x, c[1] + y, c[2] + z]);
  return result.sort(
    (a, b) =>
      a.reduce((s, v, i) => s + (v * 32 + 16 - p[i]) ** 2, 0) -
      b.reduce((s, v, i) => s + (v * 32 + 16 - p[i]) ** 2, 0),
  );
}
export function starChunk(g: Galaxy, coords: V3) {
  return sector(g, coords, 512);
}
