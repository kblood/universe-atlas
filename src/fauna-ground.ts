/** Fixed terrain stencil shared by every dated pose of a herd. Sampling this
 * immutable patch is cheap and seek independent; it avoids terrain/noise work
 * for every visible creature on every frame. The anchor's motion envelope is
 * <18 m and the stencil extends 24 m in each tangent axis. */
export const FAUNA_GROUND_N=7;
export const FAUNA_GROUND_STEP_M=8;
export const FAUNA_GROUND_HALF_M=24;
export function faunaGroundHeight(grid:Float64Array,x:number,z:number):number {
  const fx=Math.max(0,Math.min(FAUNA_GROUND_N-1,(x+FAUNA_GROUND_HALF_M)/FAUNA_GROUND_STEP_M));
  const fz=Math.max(0,Math.min(FAUNA_GROUND_N-1,(z+FAUNA_GROUND_HALF_M)/FAUNA_GROUND_STEP_M));
  const ix=Math.min(FAUNA_GROUND_N-2,Math.floor(fx)),iz=Math.min(FAUNA_GROUND_N-2,Math.floor(fz)),u=fx-ix,v=fz-iz;
  const a=grid[iz*FAUNA_GROUND_N+ix]*(1-u)+grid[iz*FAUNA_GROUND_N+ix+1]*u;
  const b=grid[(iz+1)*FAUNA_GROUND_N+ix]*(1-u)+grid[(iz+1)*FAUNA_GROUND_N+ix+1]*u;
  return a*(1-v)+b*v;
}
