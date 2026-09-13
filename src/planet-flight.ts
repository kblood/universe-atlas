import * as THREE from 'three';
import type {Body} from './catalog.ts';

/** Match the atmosphere currently rendered by the app. Future atmosphere
 * records can replace this proxy without changing the attitude controller. */
export function atmosphereHeightM(body:Body){
  return body.kind==='planet'&&body.water>0&&body.type!=='Gas giant'?Math.min(body.radiusM*.12,80000):0;
}

/** Roll-only horizon assist. Pitch and heading remain exactly under the pilot's
 * control. Projection onto the view plane avoids any longitude/polar basis. */
export function alignPlanetaryDown(q:THREE.Quaternion,radial:THREE.Vector3,altitudeM:number,atmosphereM:number,dt:number){
  const forward=new THREE.Vector3(0,0,-1).applyQuaternion(q),up=new THREE.Vector3(0,1,0).applyQuaternion(q);
  const desired=radial.clone().normalize().projectOnPlane(forward),horizontal=desired.length();
  const weight=atmosphereM>0?1-THREE.MathUtils.smoothstep(altitudeM,atmosphereM*.45,atmosphereM):0;
  // Looking almost vertically has no well-defined horizon. Fade the correction
  // there rather than choosing a geographic heading and flipping the camera.
  const strength=weight*THREE.MathUtils.smoothstep(horizontal,.06,.3);
  if(strength===0||dt<=0)return {strength,rollErrorRad:0,correctionRad:0};
  desired.normalize();
  const error=Math.atan2(forward.dot(up.clone().cross(desired)),up.dot(desired));
  const requested=error*(1-Math.exp(-1.8*strength*dt));
  const step=THREE.MathUtils.clamp(requested,-Math.PI/5*strength*dt,Math.PI/5*strength*dt);
  q.premultiply(new THREE.Quaternion().setFromAxisAngle(forward,step)).normalize();
  return {strength,rollErrorRad:error-step,correctionRad:step};
}

/** Camera-relative rotations have no geographic-north or Euler pole. */
export function freeLook(q: THREE.Quaternion, dx: number, dy: number) {
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), -dx));
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), -dy));
  return q.normalize();
}
/** Parallel transport along a great circle preserves roll through both poles. */
export function orbitStep(relative: THREE.Vector3, heading: THREE.Quaternion, axis: THREE.Vector3, angle: number) {
  const rotation = new THREE.Quaternion().setFromAxisAngle(axis, angle);
  relative.applyQuaternion(rotation);
  heading.premultiply(rotation).normalize();
}
