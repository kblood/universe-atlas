import * as THREE from "three";

type FadeMaterial = {
  material: THREE.Material;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
  alpha?: number;
};
function materials(root: THREE.Object3D) {
  const list: FadeMaterial[] = [],
    seen = new Set<THREE.Material>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    for (const m of mesh.material
      ? Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material]
      : []) {
      if (seen.has(m)) continue;
      seen.add(m);
      const alpha = (m as THREE.ShaderMaterial).uniforms?.alpha?.value;
      list.push({
        material: m,
        opacity: m.opacity,
        transparent: m.transparent,
        depthWrite: m.depthWrite,
        alpha,
      });
      m.transparent = true;
      m.depthWrite = false;
      m.needsUpdate = true;
    }
  });
  return list;
}
function fade(list: FadeMaterial[], alpha: number) {
  for (const base of list) {
    base.material.opacity = base.opacity * alpha;
    if (base.alpha !== undefined)
      (base.material as THREE.ShaderMaterial).uniforms.alpha.value =
        base.alpha * alpha;
  }
}
function restore(list: FadeMaterial[]) {
  for (const base of list) {
    base.material.opacity = base.opacity;
    base.material.transparent = base.transparent;
    base.material.depthWrite = base.depthWrite;
    if (base.alpha !== undefined)
      (base.material as THREE.ShaderMaterial).uniforms.alpha.value = base.alpha;
    base.material.needsUpdate = true;
  }
}

/** Retain one outgoing view until the incoming one is visible. No screenshot
 * textures, extra render targets, or artificial headset motion are required. */
export class ViewBlend {
  private wrapper = new THREE.Group();
  private outgoing: FadeMaterial[];
  private incoming: FadeMaterial[];
  private start = performance.now();
  private finished = false;
  progress = 0;
  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    oldRoot: THREE.Group,
    newRoot: THREE.Group,
    private oldCameraInverse: THREE.Matrix4,
    private immersive: boolean,
    private oldLabels: HTMLElement[],
    private newLabels: HTMLElement[],
    private cleanup: () => void,
  ) {
    this.wrapper.matrixAutoUpdate = false;
    this.wrapper.add(oldRoot);
    scene.add(this.wrapper);
    this.outgoing = materials(oldRoot);
    this.incoming = materials(newRoot);
    fade(this.incoming, 0);
    this.update(this.start);
  }
  update(now: number) {
    if (this.finished) return true;
    const t = Math.min(1, (now - this.start) / (this.immersive ? 450 : 700));
    this.progress = t;
    const eased = t * t * (3 - 2 * t);
    if (!this.immersive) {
      this.camera.updateMatrixWorld();
      this.wrapper.matrix.multiplyMatrices(
        this.camera.matrixWorld,
        this.oldCameraInverse,
      );
    }
    this.wrapper.updateMatrixWorld(true);
    fade(this.outgoing, 1 - eased);
    fade(this.incoming, eased);
    for (const label of this.oldLabels) label.style.opacity = String(1 - eased);
    for (const label of this.newLabels) label.style.opacity = String(eased);
    if (t === 1) this.finish();
    return this.finished;
  }
  finish() {
    if (this.finished) return;
    this.finished = true;
    restore(this.incoming);
    for (const label of this.newLabels) label.style.opacity = "";
    for (const label of this.oldLabels) label.remove();
    this.scene.remove(this.wrapper);
    this.cleanup();
  }
}
