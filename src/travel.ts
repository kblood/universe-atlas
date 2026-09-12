import { AU, LY, bodyPosition, type StarSystem, type V3 } from "./catalog.ts";
import { terrainSampler } from './terrain.ts';
import { visibleElevation, unit } from './planet-tiles.ts';
const samplers = new Map<string, ReturnType<typeof terrainSampler>>();
export function surfaceClearance(body: StarSystem['stars'][number], relative: V3) {
  const distance = Math.hypot(...relative);
  let elevation = 0;
  if (body.kind !== 'star' && body.type !== 'Gas giant') {
    let sample = samplers.get(body.seed);
    if (!sample) {
      sample = terrainSampler(body); samplers.set(body.seed, sample);
      if (samplers.size > 32) samplers.delete(samplers.keys().next().value!);
    }
    elevation = visibleElevation(body, sample(distance ? unit(relative) : [0,1,0]).elevationM);
  }
  const minimum = body.kind === 'star' || body.type === 'Gas giant'
    ? body.radiusM * 1.025 : body.radiusM + elevation + 120;
  return {minimum, altitude: distance - body.radiusM, terrainElevation: elevation,
    terrainClearance: distance - body.radiusM - elevation, clearance: Math.max(0, distance - minimum)};
}
export const LY_PER_MPC = 3261563.777167433;
export function systemBoundary(sys: StarSystem) {
  return Math.max(
    300 * AU,
    ...sys.planets.map((p) => p.orbit!.a * (1 + p.orbit!.e) * 8),
  );
}
export function automaticSpeed(
  domain: "universe" | "galaxy" | "system",
  clearance: number,
) {
  // Units are Mpc, ly and metres respectively. Proximity controls speed so
  // a large-scale boost cannot carry the camera through a small world in one frame.
  return domain === "universe"
    ? Math.max(0.0001, Math.min(5, clearance * 1.6))
    : domain === "galaxy"
      ? Math.max(0.000001, Math.min(50000, clearance * 1.6))
      : Math.max(20, Math.min(AU * 50000, clearance * (.3 + 1.5 * Math.max(0, Math.min(1,(clearance-10000)/50000)))));
}
export function nearestBody(sys: StarSystem, p: V3, epoch = 0) {
  let best: any = null;
  for (const body of [...sys.stars, ...sys.planets, ...sys.moons]) {
    const center = bodyPosition(body, sys, epoch),
      distance = Math.hypot(...p.map((v, i) => v - center[i]));
    const details = surfaceClearance(body, p.map((v,i) => v - center[i]) as V3);
    const clearance = details.clearance;
    if (!best || clearance < best.clearance)
      best = { body, center, distance, ...details };
  }
  return best as {
    body: StarSystem["stars"][number];
    center: V3;
    distance: number;
    clearance: number;
    minimum: number;
    altitude: number;
    terrainElevation: number;
    terrainClearance: number;
  };
}
