import type { CreatureGenome } from './creature-model.ts';
import type { CreatureRig } from './creature-rig.ts';
import {createPlanetAnimalInspector} from '#creature-kit/planet';
import {createFaunaMaterial} from './fauna-material.ts';
import { faunaMemberActivityAtWorldNs, faunaRigSecondsAt, type FaunaHerdMember } from './fauna-runtime.ts';
import { CATALOGUE_EPOCH_NS } from './world-time.ts';

/** A single production rig on a flat inspection floor. The specimen stays
 * centred while its actual dated body pose is evaluated on a demo orbit.
 * The orbit is a lab fixture; it never creates a planetary member or species. */
export type FaunaInspectionPose = 'dated' | 'idle' | 'walk' | 'feed';
export function createFaunaSkinInspector(genome: CreatureGenome, id: string, options: { pose?: FaunaInspectionPose } = {}): CreatureRig {
  const radius = Math.max(6, genome.torsoLength * 3);
  const member: FaunaHerdMember = { id, archetype: genome.archetype, genomeSeed: id, variant: 0, stage: 'adult',
    anchorOffsetX: 0, anchorOffsetZ: 0, orbitRadiusM: radius, orbitAngularSpeed: genome.walkSpeed / radius,
    orbitPhase: 0, gaitPeriodS: 6 };
  // World/date interpretation stays in Atlas. Body, skeleton, inspection and
  // deformation are the same shared Kit implementation its standalone Lab uses.
  return createPlanetAnimalInspector(genome,{member,material:createFaunaMaterial(true),ownsMaterial:true,
    sample(time){
      const date = CATALOGUE_EPOCH_NS + BigInt(Math.round(time * 1e9));
      let activity = faunaMemberActivityAtWorldNs(member, date);
      let behaviour:'feed'|'alert'|undefined;
      if (options.pose && options.pose !== 'dated') {
        const walking = options.pose === 'walk', revolutionS = Math.PI * 2 * radius / genome.walkSpeed;
        activity = { ...activity,
          pose: { ...activity.pose, gait: walking ? 'walk' : 'idle' },
          travel: walking ? ((time / revolutionS) % 1 + 1) % 1 : 0,
          revolutionS: walking ? revolutionS : Infinity, stateS: walking ? time + 1 : member.gaitPeriodS / 2 };
        behaviour = options.pose === 'feed' ? 'feed' : 'alert';
      }
      return {activity,rigSeconds:faunaRigSecondsAt(date),behaviour};
    }});
}
