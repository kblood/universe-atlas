import {buildPlanetComposerSource} from '#creature-kit/planet';
import {installFaunaComposerSourceWorker} from './fauna-composer-worker-provider.ts';
import {FAUNA_PLANET_COMPOSER_POLICY} from './fauna-planet-composer-policy.ts';
installFaunaComposerSourceWorker(self as unknown as DedicatedWorkerGlobalScope,buildPlanetComposerSource,[FAUNA_PLANET_COMPOSER_POLICY.middleTargetTriangles,FAUNA_PLANET_COMPOSER_POLICY.farTargetTriangles]);
