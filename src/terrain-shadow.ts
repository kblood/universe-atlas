import * as THREE from 'three';

export const patchMorphHeader='attribute vec3 parentPosition; uniform float patchMorph,patchTexels; uniform vec4 patchEdges;\n';
export const patchMorphVertex=`vec2 gridUV=(uv*(patchTexels+2.0)-1.0)/patchTexels;
float lockEdge=max(max((1.0-step(.00001,gridUV.x))*patchEdges.x,step(.99999,gridUV.x)*patchEdges.y),max((1.0-step(.00001,gridUV.y))*patchEdges.z,step(.99999,gridUV.y)*patchEdges.w));
float patchBlend=patchMorph*(1.0-lockEdge);
vec3 transformed=mix(parentPosition,position,patchBlend);`;

export function terrainDepthMaterial(morph:{value:number},edges:{value:THREE.Vector4},texels:number){
  const material=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
  material.onBeforeCompile=shader=>{
    shader.uniforms.patchMorph=morph;shader.uniforms.patchEdges=edges;shader.uniforms.patchTexels={value:texels};
    shader.vertexShader=patchMorphHeader+shader.vertexShader.replace('#include <begin_vertex>',patchMorphVertex);
  };
  material.customProgramCacheKey=()=> 'terrain-shadow-morph-1';return material;
}

/** Standard camera/shadow culling must enclose both morph endpoints, including
 * skirts. An interpolated vertex always lies inside this convex bound. */
export function boundMorphedTerrain(geometry:THREE.BufferGeometry){
  const bounds=new THREE.Box3().setFromBufferAttribute(geometry.getAttribute('position') as THREE.BufferAttribute);
  bounds.union(new THREE.Box3().setFromBufferAttribute(geometry.getAttribute('parentPosition') as THREE.BufferAttribute));
  geometry.boundingBox=bounds;geometry.boundingSphere=bounds.getBoundingSphere(new THREE.Sphere());
}
