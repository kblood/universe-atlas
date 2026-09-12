import * as THREE from 'three';

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
