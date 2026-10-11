import {installFaunaComposerSourceWorker} from '../src/fauna-composer-worker-provider.ts';
const kitUrl = new URL(self.location.href).searchParams.get('kit');
if (!kitUrl) throw new Error('Cold probe requires the actual pinned Kit module URL');
const queued: MessageEvent[] = [];
self.onmessage = event => {queued.push(event);};
const kit = await import(/* @vite-ignore */ kitUrl);
installFaunaComposerSourceWorker(self as unknown as DedicatedWorkerGlobalScope, kit.buildPlanetComposerSource);
for (const event of queued) self.dispatchEvent(event);
