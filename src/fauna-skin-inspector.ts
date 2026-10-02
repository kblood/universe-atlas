import * as THREE from 'three';
import type { CreatureGenome } from './creature-model.ts';
import type { CreatureRig, CreaturePoseDiagnostics } from './creature-rig.ts';
import { FaunaNearRigs, type FaunaNearCandidate } from './fauna-near-rig.ts';
import { faunaMemberActivityAtWorldNs, faunaRigSecondsAt, type FaunaHerdMember } from './fauna-runtime.ts';
import { CATALOGUE_EPOCH_NS } from './world-time.ts';

/** A single production rig on a flat inspection floor. The specimen stays
 * centred while its actual dated body pose is evaluated on a demo orbit.
 * The orbit is a lab fixture; it never creates a planetary member or species. */
export type FaunaInspectionPose = 'dated' | 'idle' | 'walk' | 'feed';
export function createFaunaSkinInspector(genome: CreatureGenome, id: string, options: { pose?: FaunaInspectionPose } = {}): CreatureRig {
  // A deliberate synchronous one-specimen build for the inspector. Planetary
  // pools retain their normal time slicing and capacity limits.
  const pool = new FaunaNearRigs({ capacity: 1, cacheSize: 1, now: () => 0 });
  const radius = Math.max(6, genome.torsoLength * 3);
  const member: FaunaHerdMember = { id, archetype: genome.archetype, genomeSeed: id, variant: 0, stage: 'adult',
    anchorOffsetX: 0, anchorOffsetZ: 0, orbitRadiusM: radius, orbitAngularSpeed: genome.walkSpeed / radius,
    orbitPhase: 0, gaitPeriodS: 6 };
  const candidate: FaunaNearCandidate = { member, genome, distanceM: 0, matrix: new THREE.Matrix4(), ground: () => 0,
    activity: faunaMemberActivityAtWorldNs(member, CATALOGUE_EPOCH_NS), rigSeconds: 0 };
  pool.update([candidate]); pool.update([candidate]);
  const mesh = pool.meshOf(id);
  if (!mesh) { pool.dispose(); throw new Error('Could not build production fauna skin'); }
  const helper = new THREE.SkeletonHelper(mesh.skeleton.bones[0]!);
  helper.visible = false;
  const helperMaterial = helper.material as THREE.LineBasicMaterial;
  helperMaterial.depthTest = false; helperMaterial.transparent = true;
  helper.renderOrder = 10;
  pool.group.add(helper);
  let disposed = false;
  return {
    group: pool.group,
    update(time): CreaturePoseDiagnostics {
      if (!Number.isFinite(time)) throw new Error('Fauna inspection time must be finite');
      const date = CATALOGUE_EPOCH_NS + BigInt(Math.round(time * 1e9));
      candidate.activity = faunaMemberActivityAtWorldNs(member, date);
      if (options.pose && options.pose !== 'dated') {
        const walking = options.pose === 'walk', revolutionS = Math.PI * 2 * radius / genome.walkSpeed;
        candidate.activity = { ...candidate.activity,
          pose: { ...candidate.activity.pose, gait: walking ? 'walk' : 'idle' },
          travel: walking ? ((time / revolutionS) % 1 + 1) % 1 : 0,
          revolutionS: walking ? revolutionS : Infinity, stateS: walking ? time + 1 : member.gaitPeriodS / 2 };
        candidate.behaviour = options.pose === 'feed' ? 'feed' : 'alert';
      }
      candidate.rigSeconds = faunaRigSecondsAt(date);
      pool.update([candidate]);
      const pose = pool.poseOf(id)!;
      const c = Math.cos(pose.root.yaw), s = Math.sin(pose.root.yaw);
      return { time, gait: pose.state, root: [0, 0, 0], jointCount: mesh.skeleton.bones.length,
        maxPenetration: pose.maxPenetration, maxReachError: pose.maxReachError,
        feet: pose.feet.map(f => {
          const dx = f.contact[0] - pose.root.x, dz = f.contact[2] - pose.root.z;
          return { id: f.id, position: [...f.toe], stance: f.stance,
            target: [dx * c + dz * s, f.contact[1] - pose.root.h, dx * s - dz * c] };
        }) };
    },
    setSkeletonVisible(value) { helper.visible = value; },
    setNeutral(value) {
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.vertexColors = !value;
      material.color.set(value ? '#a7a7a7' : '#ffffff');
      material.needsUpdate = true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      helper.geometry.dispose(); helperMaterial.dispose(); helper.removeFromParent(); pool.dispose();
    },
  };
}
