import * as THREE from 'three';
import type { FaunaTemplateInstance, FaunaTemplatePoseState } from './fauna-template.ts';

export type FaunaTemplateGait = 'neutral' | 'idle' | 'walk';
export interface FaunaTemplateFoot {
  id: string; stance: boolean; contact: [number, number, number]; target: [number, number, number];
  contactErrorM: number; reachErrorM: number; soleHeightM: number; minSoleHeightM: number;
  upperLengthM: number; lowerLengthM: number;
}
export interface FaunaTemplateMotionResult {
  time: number; gait: FaunaTemplateGait; inPlace: boolean; speedMps: number; cycleS: number;
  feet: FaunaTemplateFoot[]; maxContactErrorM: number; maxReachErrorM: number;
  poseCorrectives: FaunaTemplatePoseState;
}
const tuple = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z];
const smooth = (v: number) => v * v * (3 - 2 * v);

/** Measured two-link solve. The return includes clamping error rather than
 * pretending an unreachable contact was reached. `pole` is a body-space point
 * on the anatomical bend side (caudal elbow, cranial stifle). */
export function solveFaunaTemplateLimb(root: THREE.Vector3, target: THREE.Vector3, upper: number, lower: number, pole: THREE.Vector3) {
  if (![upper, lower].every(n => Number.isFinite(n) && n > 0) || ![...root.toArray(), ...target.toArray(), ...pole.toArray()].every(Number.isFinite)) throw new Error('Invalid measured limb');
  const delta = target.clone().sub(root), distance = delta.length();
  const axis = distance > 1e-10 ? delta.clone().divideScalar(distance) : new THREE.Vector3(0, -1, 0);
  const epsilon = Math.min(upper, lower) * 1e-6;
  const reach = THREE.MathUtils.clamp(distance, Math.abs(upper - lower) + epsilon, upper + lower - epsilon);
  const along = (upper * upper - lower * lower + reach * reach) / (2 * reach), height = Math.sqrt(Math.max(0, upper * upper - along * along));
  const bend = pole.clone().sub(root); bend.addScaledVector(axis, -bend.dot(axis));
  if (bend.lengthSq() < 1e-12) { bend.set(Math.abs(axis.x) < .9 ? 1 : 0, Math.abs(axis.x) < .9 ? 0 : 1, 0); bend.addScaledVector(axis, -bend.dot(axis)); }
  bend.normalize();
  return { middle: root.clone().addScaledVector(axis, along).addScaledVector(bend, height), end: root.clone().addScaledVector(axis, reach), reachErrorM: Math.abs(distance - reach) };
}

/** Capture AFTER applying morphology and at neutral pose. Recreate this small
 * driver after changing morphs. It reads actual template joint lengths, bone
 * axes and weighted hoof vertices; the procedural 22-bone rig is not involved.
 *
 * Default walk translates the root for genuine stationary world contacts.
 * inPlace=true is a centred inspection treadmill and reports that explicitly.
 * All poses are functions of time: calls in any order reproduce the same pose. */
export function createFaunaTemplateMotion(instance: FaunaTemplateInstance) {
  instance.resetPose();
  const { root, bones } = instance;
  root.updateMatrixWorld(true);
  const baseRoot = root.position.clone(), rootInverse = root.matrixWorld.clone().invert();
  const rest = new Map([...bones].map(([id, bone]) => [id, {
    position: bone.position.clone(), quaternion: bone.quaternion.clone(), scale: bone.scale.clone(),
    model: bone.getWorldPosition(new THREE.Vector3()).applyMatrix4(rootInverse),
    modelQuaternion: root.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(bone.getWorldQuaternion(new THREE.Quaternion())),
  }]));
  const needed = (id: string) => { const bone = bones.get(id); if (!bone) throw new Error(`Template gait missing joint ${id}`); return bone; };
  const parts: THREE.SkinnedMesh[] = []; root.traverse(o => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) parts.push(o as THREE.SkinnedMesh); });
  const definitions = [
    ['L_front', 'L_shoulder', 'L_elbow', 'L_carpus', 'L_front_fetlock', -1, .25],
    ['R_front', 'R_shoulder', 'R_elbow', 'R_carpus', 'R_front_fetlock', -1, .75],
    ['L_rear', 'L_hip', 'L_stifle', 'L_hock', 'L_rear_fetlock', 1, 0],
    ['R_rear', 'R_hip', 'R_stifle', 'R_hock', 'R_rear_fetlock', 1, .5],
  ] as const;
  const legs = definitions.map(([id, upperName, middleName, distalName, footName, pole, phase]) => {
    const upper = needed(upperName), middle = needed(middleName), distal = needed(distalName), foot = needed(footName);
    if (middle.parent !== upper || distal.parent !== middle || foot.parent !== distal) throw new Error(`Unexpected anatomical chain ${id}`);
    const u = rest.get(upperName)!.model, m = rest.get(middleName)!.model, d = rest.get(distalName)!.model, f = rest.get(footName)!.model;
    const a = u.distanceTo(m), b = m.distanceTo(d), cannon = f.clone().sub(d);
    let support: THREE.Vector3 | null = null, supportVertex: { part: THREE.SkinnedMesh; index: number } | null = null;
    const hoofVertices: { part: THREE.SkinnedMesh; index: number }[] = [];
    for (const part of parts) {
      const index = part.geometry.getAttribute('skinIndex'), weights = part.geometry.getAttribute('skinWeight');
      for (let i = 0; i < part.geometry.attributes.position!.count; i++) {
        let weight = 0; for (let j = 0; j < 4; j++) if (part.skeleton.bones[index.getComponent(i, j)]?.name === footName) weight += weights.getComponent(i, j);
        if (weight >= .5) hoofVertices.push({part,index:i});
        if (weight < .75) continue;
        const v = part.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(part.matrixWorld).applyMatrix4(rootInverse);
        if (!support || v.y < support.y) { support = v; supportVertex = { part, index: i }; }
      }
    }
    if (!support) throw new Error(`Template gait requires a weighted hoof support vertex: ${footName}`);
    const supportOffset = support.clone().sub(f);
    const reach = a + b, dy = d.y - u.y, dz = d.z - u.z;
    const xRoom = Math.sqrt(Math.max(0, (reach * .985) ** 2 - dy * dy - dz * dz)) - Math.abs(d.x - u.x);
    if (xRoom <= 0) throw new Error(`Template limb has no walk reach margin: ${id}`);
    return { id, upper, middle, distal, foot, upperName, footName, pole, phase, a, b, cannon, support, supportVertex: supportVertex!, hoofVertices, supportOffset, xRoom };
  });
  // Stay well inside the measured reach envelope, including small trunk bob.
  const excursion = Math.min(...legs.map(l => l.xRoom * 1.25), ...legs.map(l => (l.a + l.b) * .38));
  const duty = .72, cycleS = 1 + Math.min(...legs.map(l => l.a + l.b)) * .45;
  const speedMps = excursion / (duty * cycleS);
  function modelPosition(b: THREE.Bone) { return b.getWorldPosition(new THREE.Vector3()).applyMatrix4(root.matrixWorld.clone().invert()); }
  function orient(b: THREE.Bone, quaternion: THREE.Quaternion) {
    const world = root.getWorldQuaternion(new THREE.Quaternion()).multiply(quaternion);
    const parent = b.parent!.getWorldQuaternion(new THREE.Quaternion()); b.quaternion.copy(parent.invert().multiply(world)); root.updateMatrixWorld(true);
  }
  function aim(b: THREE.Bone, child: THREE.Bone, target: THREE.Vector3) {
    const origin = modelPosition(b), from = modelPosition(child).sub(origin).normalize(), to = target.clone().sub(origin).normalize();
    const current = root.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(b.getWorldQuaternion(new THREE.Quaternion()));
    orient(b, new THREE.Quaternion().setFromUnitVectors(from, to).multiply(current));
  }
  return {
    measurements: { excursionM: excursion, cycleS, speedMps, duty, legs: legs.map(l => ({ id: l.id, upperLengthM: l.a, lowerLengthM: l.b, cannonLengthM: l.cannon.length(), reachMarginM: l.xRoom })) },
    update(time: number, options: { gait?: FaunaTemplateGait; inPlace?: boolean; groundY?: number } = {}): FaunaTemplateMotionResult {
      if (!Number.isFinite(time) || !Number.isFinite(options.groundY ?? 0)) throw new Error('Template pose time and floor must be finite');
      const gait = options.gait ?? 'walk', inPlace = options.inPlace ?? false, groundY = options.groundY ?? 0;
      if (!['neutral', 'idle', 'walk'].includes(gait)) throw new Error('Unknown template gait');
      for (const [id, b] of bones) { const r = rest.get(id)!; b.position.copy(r.position); b.quaternion.copy(r.quaternion); b.scale.copy(r.scale); }
      root.position.copy(baseRoot);
      if (gait === 'walk' && !inPlace) root.position.add(new THREE.Vector3(time * speedMps, 0, 0).multiply(root.scale).applyQuaternion(root.quaternion));
      root.updateMatrixWorld(true);
      if (gait !== 'neutral') {
        const head = bones.get('head'), tail = bones.get('tail1');
        if (head) orient(head, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.sin(time * .8) * .009).multiply(rest.get('head')!.modelQuaternion));
        if (tail) orient(tail, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.sin(time * 1.2) * .025).multiply(rest.get('tail1')!.modelQuaternion));
      }
      const solved: { leg: typeof legs[number]; target: THREE.Vector3; stance: boolean; reachErrorM: number }[] = [];
      for (const leg of legs) {
        const phase = ((time / cycleS + leg.phase) % 1 + 1) % 1, stance = gait !== 'walk' || phase < duty;
        const target = leg.support.clone(); let reachErrorM = 0;
        if (gait !== 'neutral') {
          target.y = groundY;
          if (gait === 'walk') {
            const swing = (phase - duty) / (1 - duty);
            target.x += excursion * (stance ? .5 - phase / duty : smooth(swing) - .5);
            if (!stance) target.y += Math.sin(Math.PI * swing) ** 2 * Math.min(leg.a + leg.b, .7) * .075;
          }
          const footTarget = target.clone().sub(leg.supportOffset), distalTarget = footTarget.clone().sub(leg.cannon);
          const hip = modelPosition(leg.upper), pole = hip.clone().add(new THREE.Vector3(leg.pole, 0, 0));
          const solve = solveFaunaTemplateLimb(hip, distalTarget, leg.a, leg.b, pole); reachErrorM = solve.reachErrorM;
          aim(leg.upper, leg.middle, solve.middle); aim(leg.middle, leg.distal, solve.end);
          // Preserve the cannon segment and hoof orientation, even if an
          // unreachable target was clamped: do not stretch distal bones to hide it.
          aim(leg.distal, leg.foot, modelPosition(leg.distal).add(leg.cannon));
          orient(leg.foot, rest.get(leg.footName)!.modelQuaternion);
        }
        solved.push({leg,target,stance,reachErrorM});
      }
      root.traverse(o => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) (o as THREE.SkinnedMesh).skeleton.update(); });
      const poseCorrectives = instance.updatePoseCorrectives();
      // Measure the ACTUAL morphed/skinned support vertex after every bone has
      // been posed. A >=75% fetlock vertex may retain influences from other
      // joints, so the rigid IK support offset is not evidence of skin contact.
      const inverse = root.matrixWorld.clone().invert(), scratch = new THREE.Vector3();
      const feet: FaunaTemplateFoot[] = solved.map(({leg,target,stance,reachErrorM})=>{
        const support = leg.supportVertex, contactWorld = support.part.getVertexPosition(support.index,new THREE.Vector3()).applyMatrix4(support.part.matrixWorld);
        const contact = contactWorld.clone().applyMatrix4(inverse); let minSoleHeightM = Infinity;
        for(const vertex of leg.hoofVertices){vertex.part.getVertexPosition(vertex.index,scratch).applyMatrix4(vertex.part.matrixWorld).applyMatrix4(inverse);minSoleHeightM=Math.min(minSoleHeightM,scratch.y-groundY);}
        return {id:leg.id,stance,contact:tuple(contactWorld),target:tuple(target.clone().applyMatrix4(root.matrixWorld)),contactErrorM:contact.distanceTo(target),reachErrorM,
          soleHeightM:contact.y-groundY,minSoleHeightM,upperLengthM:leg.a,lowerLengthM:leg.b};
      });
      return { time, gait, inPlace, speedMps: gait === 'walk' ? speedMps : 0, cycleS, feet, poseCorrectives,
        maxContactErrorM: Math.max(...feet.map(f => f.contactErrorM)), maxReachErrorM: Math.max(...feet.map(f => f.reachErrorM)) };
    },
  };
}
