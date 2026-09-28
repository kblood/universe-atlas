import * as THREE from 'three';
export class OctahedralImpostor extends THREE.Mesh<THREE.PlaneGeometry,THREE.MeshStandardMaterial> {
  constructor(params:{target:THREE.Object3D;renderer:THREE.WebGLRenderer;baseType:typeof THREE.MeshStandardMaterial;useHemiOctahedron:boolean;textureSize:number;spritesPerSide:number;alphaClamp:number});
}
