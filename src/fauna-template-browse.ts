import * as THREE from 'three';
import type { FaunaTemplateInstance } from './fauna-template.ts';
import { createFaunaTemplateMotion } from './fauna-template-motion.ts';

type Point = [number, number, number];
const tuple = (p: THREE.Vector3): Point => [p.x, p.y, p.z];
const axis = new THREE.Vector3(0, 0, 1);
const smooth = (x: number) => x * x * (3 - 2 * x);
/** Authored animation limits, not a claim about measured biological ROM. */
export const FAUNA_BROWSE_ANGLES = Object.freeze({ neck1: -.32, neck2: -.24, head: .08 });

/** A deterministic foliage browse along a measured, bounded neck arc.
 * Capture after applying morphology; recreate after changing controls.
 * Heights and planning points use model metres. World placement is reported
 * separately. This does not promise that a short neck can graze at floor level,
 * and the current skeleton has no independently animated jaw. */
export function createFaunaTemplateBrowse(instance: FaunaTemplateInstance) {
  const idle = createFaunaTemplateMotion(instance), { root, bones } = instance;
  const controls = JSON.stringify(instance.controls());
  const chain = (['neck1', 'neck2', 'head'] as const).map(name => {
    const bone = bones.get(name); if (!bone) throw new Error(`Browse missing joint ${name}`);
    return { name, bone };
  });
  if (chain[1]!.bone.parent !== chain[0]!.bone || chain[2]!.bone.parent !== chain[1]!.bone) throw new Error('Browse requires the authored neck1/neck2/head chain');
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert(), rootQuaternion = root.getWorldQuaternion(new THREE.Quaternion());
  const rest = chain.map(({ bone }) => ({
    point: bone.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse),
    quaternion: rootQuaternion.clone().invert().multiply(bone.getWorldQuaternion(new THREE.Quaternion())),
  }));
  let support: { part: THREE.SkinnedMesh; index: number; point: THREE.Vector3; headWeight: number } | undefined;
  root.traverse(object => {
    const part = object as THREE.SkinnedMesh; if (!part.isSkinnedMesh) return;
    const ids = part.geometry.getAttribute('skinIndex'), weights = part.geometry.getAttribute('skinWeight');
    for (let index = 0; index < part.geometry.attributes.position!.count; index++) {
      let headWeight = 0;
      for (let slot = 0; slot < 4; slot++) if (part.skeleton.bones[ids.getComponent(index, slot)]?.name === 'head') headWeight += weights.getComponent(index, slot);
      if (headWeight < .95) continue;
      const point = part.getVertexPosition(index, new THREE.Vector3()).applyMatrix4(part.matrixWorld).applyMatrix4(inverse);
      if (!support || point.x > support.point.x) support = { part, index, point, headWeight };
    }
  });
  if (!support || support.point.x <= rest[2]!.point.x) throw new Error('Browse requires an anterior head-weighted muzzle support vertex');
  const muzzle = support;
  const segments = [rest[1]!.point.clone().sub(rest[0]!.point), rest[2]!.point.clone().sub(rest[1]!.point), muzzle.point.clone().sub(rest[2]!.point)];
  if (segments.some(p => p.length() < 1e-5)) throw new Error('Browse requires nonzero measured neck and muzzle lengths');
  function planned(amount: number) {
    const p = rest[0]!.point.clone(); let angle = 0;
    chain.forEach(({ name }, i) => { angle += FAUNA_BROWSE_ANGLES[name] * amount; p.add(segments[i]!.clone().applyAxisAngle(axis, angle)); });
    return p;
  }
  const high = planned(0), low = planned(1);
  if (!(low.y < high.y)) throw new Error('Browse profile does not lower the measured muzzle');
  let previous = high.y;
  for (let i = 1; i <= 32; i++) { const height = planned(i / 32).y; if (height >= previous) throw new Error('Browse height arc must be monotonic'); previous = height; }
  function amountForHeight(height: number) {
    if (height >= high.y) return 0;
    if (height <= low.y) return 1;
    let a = 0, b = 1;
    for (let i = 0; i < 32; i++) { const mid = (a + b) / 2; if (planned(mid).y > height) a = mid; else b = mid; }
    return (a + b) / 2;
  }
  const cycleS = 8;
  return {
    measurements: {
      cycleS, neckSegmentLengthsM: segments.slice(0, 2).map(v => v.length()), headToMuzzleLengthM: segments[2]!.length(),
      foliageHeightRangeM: [low.y, high.y] as [number, number], neutralMuzzle: tuple(high), lowerMuzzle: tuple(low),
      support: { part: muzzle.part.name, vertex: muzzle.index, headWeight: muzzle.headWeight },
      angleLimitsRadians: FAUNA_BROWSE_ANGLES,
    },
    update(time: number, options: { foliageHeightM?: number } = {}) {
      if (!Number.isFinite(time) || !Number.isFinite(options.foliageHeightM ?? low.y)) throw new Error('Browse time and foliage height must be finite');
      if (JSON.stringify(instance.controls()) !== controls) throw new Error('Recreate browse after changing morphology');
      const phase = ((time % cycleS) + cycleS) % cycleS / cycleS;
      const blend = phase < .25 ? smooth(phase / .25) : phase <= .70 ? 1 : 1 - smooth((phase - .70) / .30);
      const requestedHeightM = options.foliageHeightM ?? low.y;
      const reachableHeightM = THREE.MathUtils.clamp(requestedHeightM, low.y, high.y);
      const targetHeightM = high.y + (reachableHeightM - high.y) * blend;
      const amount = amountForHeight(targetHeightM), target = planned(amount);
      const base = idle.update(phase * cycleS, { gait: 'idle', inPlace: true });
      let angle = 0;
      const angles: Record<string, number> = {};
      chain.forEach(({ name, bone }, i) => {
        angles[name] = FAUNA_BROWSE_ANGLES[name] * amount; angle += angles[name]!;
        const model = new THREE.Quaternion().setFromAxisAngle(axis, angle).multiply(rest[i]!.quaternion);
        const world = root.getWorldQuaternion(new THREE.Quaternion()).multiply(model);
        bone.quaternion.copy(bone.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
        root.updateMatrixWorld(true);
      });
      // Also refresh conservative bounds after changing the neck rotations.
      const poseCorrectives = instance.updatePoseCorrectives();
      const actualWorld = muzzle.part.getVertexPosition(muzzle.index, new THREE.Vector3()).applyMatrix4(muzzle.part.matrixWorld);
      const actual = actualWorld.clone().applyMatrix4(root.matrixWorld.clone().invert());
      return {
        time, phase, state: blend === 1 ? 'feeding' as const : 'reaching' as const, blend, angles, base, poseCorrectives,
        requestedHeightM, reachableHeightM, heightClampErrorM: Math.abs(requestedHeightM - reachableHeightM),
        plannedMuzzle: tuple(target), actualMuzzle: tuple(actual), worldMuzzle: tuple(actualWorld),
        reachResidualM: actual.distanceTo(target), heightResidualM: Math.abs(actual.y - targetHeightM),
      };
    },
  };
}
