import * as THREE from 'three';

/** Keep the same opaque coat lighting across the instanced/skinned handoff.
 * InstancedMesh supplies instance colours; the skinned body supplies vertex
 * colours. Both are linear-light RGB and use this same rough dielectric BRDF. */
export function createFaunaMaterial(vertexColors = false): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ vertexColors, roughness: .86, metalness: 0 });
}
