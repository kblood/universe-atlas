/** Named surface destinations are physical places. Arrival precision must
 * remain the same in metres on moons and large planets. */
export const SURFACE_SITE_ARRIVAL_M = 100;

export function surfaceSiteReached(angleRad:number, radiusM:number):boolean {
  return Number.isFinite(angleRad) && angleRad >= 0 &&
    Number.isFinite(radiusM) && radiusM > 0 &&
    angleRad <= SURFACE_SITE_ARRIVAL_M / radiusM;
}
