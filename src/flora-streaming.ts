/** Presentation demand for the existing canonical 2 m flora grid. */
import type {V3} from './catalog.ts';
import {surfaceCellAt,surfaceCellsWithin,type SurfaceCell} from './surface-cell.ts';
export const FLORA_FINE_NEAR_M = 34;
export const FLORA_FINE_FADE_START_M = 26;
export const FLORA_FINE_DEMAND_CAP = 5200;
export type FloraStreamCell = SurfaceCell & {farRepresentative: boolean};
/** An 8 m presentation cell selects the nearest EXISTING 2 m canonical cell.
 * This never changes canonical directions, seeds, presence or genome draws. */
export function floraFarRepresentative(direction: V3, radiusM: number) {
  return surfaceCellAt(surfaceCellAt(direction,radiusM,8).direction,radiusM,2);
}
function priority(id: string) {let h=2166136261;for(let i=0;i<id.length;i++)h=Math.imul(h^id.charCodeAt(i),16777619);return h>>>0;}
export function floraFineDemand(center: V3, radiusM: number, rangeM = 168): FloraStreamCell[] {
  const near = surfaceCellsWithin(center,radiusM,FLORA_FINE_NEAR_M,2);
  const out: FloraStreamCell[] = near.map(cell => ({...cell,farRepresentative: floraFarRepresentative(cell.direction,radiusM).id === cell.id}));
  const seen = new Set(near.map(cell => cell.id));
  const far: (FloraStreamCell & {priority: number})[] = [];
  for (const block of surfaceCellsWithin(center,radiusM,rangeM,8)) {
    const cell = surfaceCellAt(block.direction,radiusM,2);
    if (seen.has(cell.id)) continue;
    const distance = Math.hypot(cell.direction[0]-center[0],cell.direction[1]-center[1],cell.direction[2]-center[2])*radiusM;
    if (distance > rangeM) continue;
    seen.add(cell.id); far.push({...cell,farRepresentative:true,priority:priority(cell.id)});
  }
  // A stable cell-ID priority spreads a capped demand across the whole
  // range rather than spending every remaining slot just outside the near ring.
  far.sort((a,b)=>a.priority-b.priority||(a.id<b.id?-1:a.id>b.id?1:0));
  out.push(...far.slice(0,Math.max(0,FLORA_FINE_DEMAND_CAP-out.length)));
  return out.slice(0,FLORA_FINE_DEMAND_CAP);
}
/** Nonrepresentative fine plants fade before their dense demand ends.
 * Representatives retain ordinary 108-120 m renderer range fading. */
export function floraFineCoverage(representative: boolean, distanceM: number) {
  if (representative || distanceM <= FLORA_FINE_FADE_START_M) return 1;
  if (distanceM >= FLORA_FINE_NEAR_M) return 0;
  const t = (distanceM-FLORA_FINE_FADE_START_M)/(FLORA_FINE_NEAR_M-FLORA_FINE_FADE_START_M);
  return 1-t*t*(3-2*t);
}
