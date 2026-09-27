import { AU, LY, bodyPosition, type StarSystem, type V3 } from "./catalog.ts";
import { terrainSampler } from './terrain.ts';
import { unit } from './planet-tiles.ts';
import {type OrbitTime} from './world-time.ts';
const samplers = new Map<string, ReturnType<typeof terrainSampler>>();
/** Eye height of the walking capsule. Flight uses the same physical contact
 * boundary so touchdown does not lift the observer by an arbitrary amount. */
export const FLIGHT_EYE_CLEARANCE_M = 1.64;
/** Stop a fast galactic step before a nearby star, then release that staging
 * boundary with a tolerance so floating-point roundoff cannot trap flight. */
export function sweptStarStep(step:number,along:number,perpendicularSq:number) {
  return along>.030001&&along<step+.03&&perpendicularSq<.02*.02
    ? Math.min(step,along-.03):step;
}
export function surfaceClearance(body: StarSystem['stars'][number], relative: V3, waterLevelM = 0) {
  const distance = Math.hypot(...relative);
  let elevation = 0;
  if (body.kind !== 'star' && body.type !== 'Gas giant') {
    // A body can receive a new immutable geology region without its catalogue
    // seed changing. Never reuse its pre-river clearance sampler.
    const key=`${body.seed}/${body.hydrology?.version||'terrain-1.1.0'}/${body.hydrology?.id||''}/${body.canonicalRivers?.map(r=>r.id).join(',')||''}/${waterLevelM}`;
    let sample = samplers.get(key);
    if (!sample) {
      sample = terrainSampler(body,undefined,undefined,undefined,waterLevelM); samplers.set(key, sample);
      if (samplers.size > 32) samplers.delete(samplers.keys().next().value!);
    }
    elevation = sample(distance ? unit(relative) : [0,1,0]).visibleHeightM;
  }
  const minimum = body.kind === 'star' || body.type === 'Gas giant'
    ? body.radiusM * 1.025 : body.radiusM + elevation + FLIGHT_EYE_CLEARANCE_M;
  return {minimum, altitude: distance - body.radiusM, terrainElevation: elevation,
    terrainClearance: distance - body.radiusM - elevation, clearance: Math.max(0, distance - minimum)};
}
export const LY_PER_MPC = 3261563.777167433;
export const GALAXY_ENTRY_RADII = 6;
export const GALAXY_EXIT_RADII = 8;
export const SYSTEM_PREPARE_LY = .4;
export function systemBoundary(sys: StarSystem) {
  return Math.max(
    // Load the physical system while its primary star is still unresolved.
    // Exit uses twice this radius to prevent crossing back and forth.
    6000 * AU,
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
      : Math.max(.8, Math.min(AU * 50000, clearance * (.3 + 1.5 * Math.max(0, Math.min(1,(clearance-10000)/50000)))));
}

/** Conservative bounded terrain sweep. Check the path, not just its endpoint.
 * Close to the surface, restrict each sampled segment to half a metre. Work
 * stays bounded even during boosted flight or a long frame; excess requested
 * travel is deferred instead of skipping unsampled terrain. The caller owns
 * the authoritative dated surface query. */
export function sweptTerrainStep(start: V3, direction: V3, requestedM: number,
  clearanceM: number, radiusM: number, visibleHeight: (direction: V3) => number) {
  const spacing = Math.max(.5, Math.min(5000, Math.max(0, clearanceM) * .2));
  const distance = Math.min(Math.max(0, requestedM), spacing * 16);
  const segments = Math.max(1, Math.ceil(distance / spacing));
  const gap = (travel: number) => {
    const p = start.map((v, i) => v + direction[i] * travel) as V3;
    const r = Math.hypot(...p);
    return r - radiusM - visibleHeight(r > 0 ? p.map(v => v / r) as V3 : [0, 1, 0]) - FLIGHT_EYE_CLEARANCE_M;
  };
  let safe = 0;
  for (let i = 1; i <= segments; i++) {
    const next = distance * i / segments;
    if (gap(next) < 0) {
      let blocked = next;
      for (let iteration = 0; iteration < 8; iteration++) {
        const middle = (safe + blocked) * .5;
        if (gap(middle) >= 0) safe = middle; else blocked = middle;
      }
      return { distanceM: safe, contact: true, samples: i + 8 };
    }
    safe = next;
  }
  return { distanceM: distance, contact: false, samples: segments };
}
export function nearestBody(sys: StarSystem, p: V3, epoch: OrbitTime = 0, waterLevelForBody: (body: StarSystem['stars'][number]) => number = () => 0) {
  let best: any = null;
  for (const body of [...sys.stars, ...sys.planets, ...sys.moons]) {
    const center = bodyPosition(body, sys, epoch),
      distance = Math.hypot(...p.map((v, i) => v - center[i]));
    const details = surfaceClearance(body, p.map((v,i) => v - center[i]) as V3,waterLevelForBody(body));
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
