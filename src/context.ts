import {
  overview,
  sector,
  type Galaxy,
  type V3,
  type SystemRef,
} from "./catalog.ts";
import { starMap } from "./star-map.ts";

// A bounded sample of the same catalogue used when these neighbours are entered.
// The selected cube is excluded, so its foreground stars are never duplicated.
export function sectorSurroundings(g: Galaxy, coords: V3) {
  const positions: number[] = [],
    colors: number[] = [],
    sizes: number[] = [];
  const addresses: string[] = [];
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue;
        const neighbour: V3 = [coords[0] + x, coords[1] + y, coords[2] + z];
        for (const ref of sector(g, neighbour, 160).refs) {
          positions.push(
            ...ref.position.map((v, i) => (v - (coords[i] * 32 + 16)) * 0.5),
          );
          const hex = parseInt(ref.color.slice(1), 16);
          colors.push(
            ((hex >> 16) & 255) / 255,
            ((hex >> 8) & 255) / 255,
            (hex & 255) / 255,
          );
          sizes.push(1.15);
          addresses.push(ref.id);
        }
      }
  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    sizes: new Float32Array(sizes),
    addresses,
  };
}

export function galaxyClouds(galaxies: Galaxy[], count = 220) {
  return galaxies.map((g) => ({ id: g.id, ...overview(g, count) }));
}
export function sectorView(g: Galaxy, coords: V3, galaxies: Galaxy[] = []) {
  return {
    ...sector(g, coords),
    surroundings: sectorSurroundings(g, coords),
    sky: overview(g, 24000),
    galaxyClouds: galaxyClouds(galaxies.filter((n) => n.id !== g.id)),
  };
}
export function systemContext(
  g: Galaxy,
  coords: V3,
  ref: SystemRef,
  galaxies: Galaxy[],
) {
  const data = sectorView(g, coords, galaxies);
  const positions: number[] = [],
    colors: number[] = [],
    sizes: number[] = [],
    addresses: string[] = [];
  const append = (id: string, p: V3, color: number[]) => {
    const distance = Math.hypot(...p);
    if (distance < 1e-7 || id === ref.id) return;
    positions.push(...p.map((v) => (v / distance) * 132));
    colors.push(...color);
    sizes.push(Math.min(10, 3 + 18 / Math.sqrt(distance)));
    addresses.push(id);
  };
  for (const n of data.refs) {
    const hex = parseInt(n.color.slice(1), 16);
    append(n.id, n.position.map((v, i) => v - ref.position[i]) as V3, [
      ((hex >> 16) & 255) / 255,
      ((hex >> 8) & 255) / 255,
      (hex & 255) / 255,
    ]);
  }
  const localCount = addresses.length;
  data.surroundings.addresses.forEach((id, i) => {
    const p = [0, 1, 2].map(
      (axis) =>
        data.surroundings.positions[i * 3 + axis] * 2 +
        coords[axis] * 32 +
        16 -
        ref.position[axis],
    ) as V3;
    append(id, p, Array.from(data.surroundings.colors.slice(i * 3, i * 3 + 3)));
  });
  return {
    sky: starMap(g),
    galaxyClouds: data.galaxyClouds,
    sectorRefs: data.refs,
    localSky: {
      positions: new Float32Array(positions),
      colors: new Float32Array(colors),
      sizes: new Float32Array(sizes),
      addresses,
      localCount,
    },
  };
}
