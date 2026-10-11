import {buildFaunaComposerLevels, composerRenderSkin, type FaunaComposerBuildJob, type FaunaComposerBuildResult, type FaunaComposerSource, type FaunaComposerSourceProvider} from './fauna-composer-render-source.ts';

/** Provider bridge. The integrator's worker imports buildPlanetComposerSource
 * from the pinned Kit package and calls installFaunaComposerSourceWorker below.
 * At most one worker exists; completion, failure, abort and disposal terminate it. */
export function createFaunaComposerWorkerProvider<D>(factory: () => Worker, timeoutMs = 30000): FaunaComposerSourceProvider<D> {
  let active: {worker: Worker; cancel: () => void} | null = null, disposed = false;
  return {
    build(job, signal) {
      if (disposed || active) return Promise.reject(new Error('Composer worker unavailable or busy'));
      return new Promise((resolve, reject) => {
        const worker = factory();
        const finish = () => {clearTimeout(timer); signal.removeEventListener('abort', abort); worker.terminate(); if (active?.worker === worker) active = null;};
        const abort = () => {finish(); reject(new Error('Composer worker cancelled'));};
        const timer = setTimeout(() => {finish(); reject(new Error('Composer worker exceeded build deadline'));}, timeoutMs);
        active = {worker, cancel: abort}; signal.addEventListener('abort', abort, {once: true});
        if (signal.aborted) {abort(); return;}
        worker.onmessage = ({data}) => {finish(); if (data?.key !== job.key || data.error || !data.result) reject(new Error(data?.error ?? 'Composer worker returned wrong source')); else resolve(data.result);};
        worker.onerror = event => {event.preventDefault(); finish(); reject(new Error(event.message || 'Composer worker failed'));};
        worker.onmessageerror = () => {finish(); reject(new Error('Composer worker result decode failed'));};
        // Structured clone preserves the resident original. It is never passed as a transferable.
        try {worker.postMessage({job});} catch (error) {finish(); reject(error);}
      });
    },
    dispose() {disposed = true; active?.cancel();},
  };
}
/** Standard Kit source construction is injected, never another body generator.
 * This entire function runs in a worker; the synchronous reducer cannot block rendering. */
export function installFaunaComposerSourceWorker<D>(scope: Pick<DedicatedWorkerGlobalScope, 'onmessage'|'postMessage'>,
  buildSource: (definition: D) => FaunaComposerSource, targets: readonly [number, number] = [4500, 1500]): void {
  scope.onmessage = ({data}: MessageEvent<{job: FaunaComposerBuildJob<D>}>) => {
    const job = data.job, started = performance.now();
    try {
      const source = job.loadedSource ?? buildSource(job.definition);
      const levels = job.tiers.every(t => t === 'near') ? {near: composerRenderSkin(source.skin)} : buildFaunaComposerLevels(source, targets);
      const result: FaunaComposerBuildResult = {key: job.key, source, levels, buildMs: performance.now() - started};
      const buffers = new Set<ArrayBuffer>(), seen = new Set<object>();
      const visit = (v: unknown) => {if (!v || typeof v !== 'object' || seen.has(v)) return; seen.add(v);
        if (ArrayBuffer.isView(v)) {buffers.add(v.buffer as ArrayBuffer); return;} for (const child of Object.values(v)) visit(child);};
      visit(result); scope.postMessage({key: job.key, result}, [...buffers]);
    } catch (error) {scope.postMessage({key: job.key, error: error instanceof Error ? error.message : String(error)});}
  };
}
