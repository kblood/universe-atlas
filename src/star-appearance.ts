import type { SystemRef } from './catalog.ts';

/** Display optics, not calibrated photometry. Share the approach curve across
 * galaxy points and unresolved system stars so changing scene cannot resize it. */
export function displayLuminosity(ref: SystemRef): number {
  let hash = 2166136261;
  for (const char of ref.id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return .8 + ((hash >>> 0) / 4294967295) * .4;
}
export function starPointDiameter(distanceLy: number, luminosity = 1): number {
  return (2.6 + 9 / (1 + Math.sqrt(Math.max(0, distanceLy) / .12))) * Math.sqrt(luminosity);
}
export const STAR_DIAMETER_GLSL = `float starPointDiameter(float distanceLy,float luminosity){
  return (2.6+9./(1.+sqrt(max(0.,distanceLy)/.12)))*sqrt(luminosity);
}`;
// A broad enough core to survive subpixel placement; no vanishing flux floor.
export const STAR_FRAGMENT = `uniform float alpha;varying vec3 tint;varying float visibility;
void main(){vec2 p=gl_PointCoord-.5;float d=dot(p,p);if(d>.25||visibility<.002)discard;
gl_FragColor=vec4(tint,exp(-d*24.)*.72*alpha*visibility);}`;
