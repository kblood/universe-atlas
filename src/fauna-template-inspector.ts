import * as THREE from 'three';
import type { CreatureRig } from './creature-rig.ts';
import type { createFaunaTemplate, FaunaTemplateValues } from './fauna-template.ts';
import { createFaunaTemplateMotion, type FaunaTemplateGait, type FaunaTemplateMotionResult } from './fauna-template-motion.ts';

export type LoadedFaunaTemplate = ReturnType<typeof createFaunaTemplate>;
/** Authored review candidate with a centred gait. In-place inspection does not
 * establish stationary world contacts; travel-mode validation is separate. */
export function createFaunaTemplateInspector(template: LoadedFaunaTemplate, values: FaunaTemplateValues, options: { pose?: FaunaTemplateGait } = {}) {
  const instance = template.instantiate(), group = new THREE.Group();
  group.add(instance.root); instance.apply(values);
  const neutralRoot = instance.root.position.clone();
  let driver: ReturnType<typeof createFaunaTemplateMotion>, motion: FaunaTemplateMotionResult | null = null;
  try { driver = createFaunaTemplateMotion(instance); }
  catch (error) { instance.dispose(); throw error; }
  const helper = new THREE.SkeletonHelper(instance.root);
  helper.visible = false; helper.renderOrder = 10;
  const helperMaterial = helper.material as THREE.LineBasicMaterial;
  helperMaterial.depthTest = false; helperMaterial.transparent = true;
  group.add(helper);
  const saved = new Map<THREE.MeshStandardMaterial, { color: THREE.Color; vertexColors: boolean; map: THREE.Texture | null }>();
  instance.root.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    o.castShadow = true; o.receiveShadow = true;
    for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
      if (material instanceof THREE.MeshStandardMaterial && !saved.has(material)) saved.set(material, { color: material.color.clone(), vertexColors: material.vertexColors, map: material.map });
    }
  });
  let disposed = false;
  const adapter: CreatureRig & {
    templateInstance: typeof instance;
    setMorphs(values: FaunaTemplateValues): void;
    bounds(head?: boolean): THREE.Box3;
    diagnostics(): { id: string; version: string; sourceHash: string | null; sourceUrl: string | null; status: string; controls: FaunaTemplateValues; influences: Record<string, number>; bones: string[]; motion: FaunaTemplateMotionResult | null; motionMeasurements: typeof driver.measurements; bounds: { min: number[]; max: number[]; size: number[]; finite: boolean } };
  } = {
    group, templateInstance: instance,
    update(time) {
      motion = driver.update(time, { gait: options.pose ?? 'neutral', inPlace: true });
      group.updateMatrixWorld(true);
      return { time, gait: motion.gait === 'walk' ? 'walk' : 'idle', root: [0, 0, 0],
        feet: motion.feet.map(f => ({ id: f.id, position: [...f.contact], target: [...f.target], stance: f.stance })),
        maxPenetration: Math.max(0, ...motion.feet.map(f => -f.minSoleHeightM)), maxReachError: motion.maxReachErrorM, jointCount: instance.bones.size };
    },
    setMorphs(next) {
      instance.root.position.copy(neutralRoot); instance.resetPose(); instance.apply(next);
      driver = createFaunaTemplateMotion(instance); motion = null;
    },
    setSkeletonVisible(value) { helper.visible = value; },
    setNeutral(value) {
      for (const [material, original] of saved) {
        material.color.copy(value ? new THREE.Color('#a7a7a7') : original.color);
        material.vertexColors = value ? false : original.vertexColors; material.map = value ? null : original.map; material.needsUpdate = true;
      }
    },
    bounds(head = false) {
      group.updateMatrixWorld(true); const box = new THREE.Box3(), p = new THREE.Vector3();
      instance.root.traverse(o => {
        if (!(o instanceof THREE.Mesh)) return;
        const count = o.geometry.getAttribute('position')?.count || 0;
        const indices = o.geometry.getAttribute('skinIndex'), weights = o.geometry.getAttribute('skinWeight');
        const isHead = (index: number) => {
          if (!(o instanceof THREE.SkinnedMesh)) return /head|eye|ear|muzzle|nose/i.test(o.name);
          let weight = 0;
          for (let component = 0; component < 4; component++) {
            let bone: THREE.Object3D | null = o.skeleton.bones[indices.getComponent(index, component)] || null;
            while (bone && !/head|skull/i.test(bone.name)) bone = bone.parent;
            if (bone) weight += weights.getComponent(index, component);
          }
          return weight > .5;
        };
        for (let i = 0; i < count; i++) {
          if (head && !isHead(i)) continue;
          o.getVertexPosition(i, p); box.expandByPoint(o.localToWorld(p));
        }
      });
      return box;
    },
    diagnostics() {
      const box = adapter.bounds(), size = box.getSize(new THREE.Vector3());
      const metadata = template as LoadedFaunaTemplate & { sourceHash?: string; sourceUrl?: string };
      const min = box.min.toArray(), max = box.max.toArray();
      return { id: template.sidecar.id, version: template.sidecar.schemaVersion,
        sourceHash: metadata.sourceHash ?? null, sourceUrl: metadata.sourceUrl ?? null,
        status: 'reference-motion-candidate', controls: instance.controls(), influences: instance.influences(), bones: [...instance.bones.keys()],
        motion: motion ? structuredClone(motion) : null, motionMeasurements: structuredClone(driver.measurements),
        bounds: { min, max, size: size.toArray(), finite: !box.isEmpty() && [...min, ...max, ...size.toArray()].every(Number.isFinite) } };
    },
    dispose() {
      if (disposed) return; disposed = true;
      helper.geometry.dispose(); helperMaterial.dispose(); helper.removeFromParent(); instance.dispose(); group.removeFromParent();
    },
  };
  return adapter;
}
export type FaunaTemplateInspector = ReturnType<typeof createFaunaTemplateInspector>;
