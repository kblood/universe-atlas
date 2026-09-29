import * as THREE from 'three';
/** The level walking direction for a camera orientation (unit, tangent to
 * `up`). Near-vertical views use the screen-up vector: forward when looking
 * down, but backward when looking up (the top of an upward view points
 * behind the observer). Using screen-up unconditionally turned restored
 * upward headings about π away. */
export function levelForward(quaternion:THREE.Quaternion,up:THREE.Vector3){
  const view=new THREE.Vector3(0,0,-1).applyQuaternion(quaternion),forward=view.clone().projectOnPlane(up);
  if(forward.lengthSq()<.01)forward.set(0,1,0).applyQuaternion(quaternion).multiplyScalar(view.dot(up)>0?-1:1).projectOnPlane(up);
  return forward.normalize();
}
