import { AU, LY, bodyPosition, type StarSystem, type V3 } from "./catalog.ts";
import { terrainSampler } from './terrain.ts';
import { unit } from './planet-tiles.ts';
import {type OrbitTime} from './world-time.ts';
const samplers = new Map<string, ReturnType<typeof terrainSampler>>();
/** Stop a fast galactic step before a nearby star, then release that staging
 * boundary with a tolerance so floating-point roundoff cannot trap flight. */
export function sweptStarStep(step:number,along:number,perpendicularSq:number) {
  return along>.030001&&along<step+.03&&perpendicularSq<.02*.02
    ? Math.min(step,along-.03):step;
}
export function surfaceClearance(body: StarSystem['stars'][number], relative: V3) {
  const distance = Math.hypot(...relative);
  let elevation = 0;
  if (body.kind !== 'star' && body.type !== 'Gas giant') {
    // A body can receive a new immutable geology region without its catalogue
    // seed changing. Never reuse its pre-river clearance sampler.
    const key=`${body.seed}/${body.hydrology?.version||'terrain-1.1.0'}/${body.hydrology?.id||''}`;
    let sample = samplers.get(key);
    if (!sample) {
      sample = terrainSampler(body); samplers.set(key, sample);
      if (samplers.size > 32) samplers.delete(samplers.keys().next().value!);
    }
    elevation = sample(distance ? unit(relative) : [0,1,0]).visibleHeightM;
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
export function nearestBody(sys: StarSystem, p: V3, epoch: OrbitTime = 0) {
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
