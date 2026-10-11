import * as THREE from 'three';
import {planetComposerWorldDefinition,planetComposerSourceIdentity, posePlanetComposer, type PlanetComposerDefinition} from '#creature-kit/planet';
import {FaunaComposerRenderer, type FaunaComposerCandidate} from './fauna-composer-renderer.ts';
import receipt from '../vendor/creature-kit/PACKAGE.json' with {type:'json'};
import {createFaunaComposerWorkerProvider} from './fauna-composer-worker-provider.ts';
import type {CreatureGenome, FaunaHerdMember, FaunaMemberActivity} from './fauna-runtime.ts';
import type {FaunaGround} from './fauna-locomotion.ts';
import {FAUNA_PLANET_COMPOSER_POLICY} from './fauna-planet-composer-policy.ts';
export {FAUNA_PLANET_COMPOSER_VERSION,FAUNA_PLANET_COMPOSER_POLICY} from './fauna-planet-composer-policy.ts';
export interface FaunaPlanetComposerCandidate extends FaunaComposerCandidate<PlanetComposerDefinition> {
 member:FaunaHerdMember; activity:FaunaMemberActivity; ground:FaunaGround; groundRevision:number;
}
export type FaunaPlanetComposerRenderer=FaunaComposerRenderer<PlanetComposerDefinition,FaunaPlanetComposerCandidate>;
export function faunaPlanetComposerDefinition(genome:CreatureGenome,member:FaunaHerdMember){
 if(!member.speciesId)throw new Error('Planet Composer requires the original species ID');
 const definition=planetComposerWorldDefinition(genome,{individualId:member.id,speciesId:member.speciesId});
 const identity=planetComposerSourceIdentity(definition,{presentation:'realism-1',codePin:receipt.kit.commit});
 return {definition,key:identity.key,canonical:identity.canonical};
}
export function createFaunaPlanetComposerRenderer(options:{onReady:()=>void;onMeshAdopted:(mesh:THREE.Mesh)=>void;renderer?:THREE.WebGLRenderer}):FaunaPlanetComposerRenderer {
 const p=FAUNA_PLANET_COMPOSER_POLICY;
 const provider=createFaunaComposerWorkerProvider<PlanetComposerDefinition>(()=>new Worker(new URL('./fauna-planet-composer.worker.ts',import.meta.url),{type:'module'}));
 const renderer=new FaunaComposerRenderer<PlanetComposerDefinition,FaunaPlanetComposerCandidate>({provider,
  pose:(graph,c)=>posePlanetComposer(graph,c.member,c.activity,c.ground,c.rigSeconds),
  onReady:options.onReady,onMeshAdopted:options.onMeshAdopted,capacity:p.capacity,maxBones:p.maxBones,maxSources:p.capacity,
  maxBytes:p.residentBytes,maxResultBytes:p.resultBytes,workerReserveBytes:p.workerReserveBytes,fullSourceCache:p.nearSources,
  coldJobsBeforeNearUpgrade:8,
  middleSourceCache:p.middleSources,
  nearM:p.nearM,middleM:p.middleM,maxDistanceM:p.visibleM,
  mergedTiers:{middle:{maxVertices:p.middleVertices,maxIndices:p.middleIndices,maxBytes:5*1024*1024,storage:'packed-1'},far:{maxVertices:p.farVertices,maxIndices:p.farIndices,maxBytes:35*1024*1024,storage:'packed-1'}},
 });
 if(options.renderer)renderer.assertCapabilities(options.renderer);
 return renderer;
}
