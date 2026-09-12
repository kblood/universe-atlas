import {
  AU,
  bodyPosition,
  type Body,
  type StarSystem,
  type V3,
} from "./catalog.ts";

export type SystemScale = "overview" | "physical";
export type LayoutBody = {
  id: string;
  radius: number;
  extent: number;
  orbitScale: number;
};
export function systemLayout(sys: StarSystem, mode: SystemScale = "overview") {
  const physicalScale =
    14 / Math.max(AU, ...sys.planets.map((p) => p.orbit!.a * (1 + p.orbit!.e)));
  const records: Record<string, LayoutBody> = {};
  let outer = 1.3;
  const binaryA = sys.stars.reduce((n, s) => n + (s.orbit?.a || 0), 0);
  for (const star of sys.stars) {
    const radius = mode === "physical" ? star.radiusM * physicalScale : 0.24;
    records[star.id] = {
      id: star.id,
      radius,
      extent: radius,
      orbitScale:
        mode === "physical" ? physicalScale : binaryA ? 0.85 / binaryA : 1,
    };
  }
  for (const planet of sys.planets) {
    const radius =
      mode === "physical"
        ? planet.radiusM * physicalScale
        : 0.13 + Math.min(0.11, planet.radiusM / 6e8);
    const extent = radius * (planet.rings ? 2.3 : 1);
    // Clear radial envelopes, including eccentricity and rings, at every epoch.
    const a = (outer + 0.42 + extent) / (1 - planet.orbit!.e);
    const orbitScale =
      mode === "physical" ? physicalScale : a / planet.orbit!.a;
    records[planet.id] = { id: planet.id, radius, extent, orbitScale };
    outer = a * (1 + planet.orbit!.e) + extent;
  }
  if (mode === "physical")
    for (const moon of sys.moons) {
      const radius = moon.radiusM * physicalScale;
      records[moon.id] = {
        id: moon.id,
        radius,
        extent: radius,
        orbitScale: physicalScale,
      };
    }
  return { records, radius: mode === "physical" ? 15 : outer + 0.7, mode };
}
export function layoutPosition(
  b: Body,
  sys: StarSystem,
  record: LayoutBody,
  time = 0,
): V3 {
  return bodyPosition(b, sys, time).map((v) => v * record.orbitScale) as V3;
}
