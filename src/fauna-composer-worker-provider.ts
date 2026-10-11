import {buildFaunaComposerRequestedLevels, type FaunaComposerBuildJob, type FaunaComposerBuildResult, type FaunaComposerSource, type FaunaComposerSourceProvider} from './fauna-composer-render-source.ts';
import {createComposerBuildReceipt, verifyComposerBuildReceipt} from './fauna-composer-build-receipt.ts';

/** Provider bridge. The integrator's worker imports buildPlanetComposerSource
 * from the pinned Kit package and calls installFaunaComposerSourceWorker below.
 * At most one worker exists. Recycling bounds allocation accumulation without
 * relying on unavailable production forced-GC hooks. One job is the conservative
 * default; a measured platform policy may opt into a small bounded reuse count. */
export function createFaunaComposerWorkerProvider<D>(factory: () => Worker, timeoutMs = 30000,
  options: {maxJobsPerWorker?: number; onProgress?: (progress: {key: string; phase: string; elapsedMs: number}) => void} = {}): FaunaComposerSourceProvider<D> {
  const maxJobs = options.maxJobsPerWorker ?? 1;
  if (!Number.isSafeInteger(maxJobs) || maxJobs < 1 || maxJobs > 64) throw new Error('Composer worker reuse cap must be 1..64 jobs');
  let active: {cancel: () => void} | null = null, worker: Worker | null = null, disposed = false, workerJobs = 0;
  return {
    build(job, signal) {
      if (disposed || active) return Promise.reject(new Error('Composer worker unavailable or busy'));
      return new Promise((resolve, reject) => {
        worker ??= factory(); const current = worker; let finished = false;
        const finish = (terminate = false) => {if (finished) return; finished = true; clearTimeout(timer); signal.removeEventListener('abort', abort); current.onmessage = current.onerror = current.onmessageerror = null;
          if (terminate) {current.terminate(); if (worker === current) {worker = null; workerJobs = 0;}} active = null;};
        const abort = () => {finish(true); reject(new Error('Composer worker cancelled'));};
        const timer = setTimeout(() => {finish(true); reject(new Error('Composer worker exceeded build deadline'));}, timeoutMs);
        active = {cancel: abort}; signal.addEventListener('abort', abort, {once: true});
        if (signal.aborted) {abort(); return;}
        current.onmessage = async ({data}) => {
          if (data?.type === 'progress' && data.key === job.key) {options.onProgress?.(data); return;}
          if (data?.key !== job.key || data.error || !data.result) {finish(true); reject(new Error(data?.error ?? 'Composer worker returned wrong source')); return;}
          try {await verifyComposerBuildReceipt(job, data.result); if (finished || signal.aborted || disposed) return; workerJobs++; finish(workerJobs >= maxJobs); resolve(data.result);}
          catch (error) {if (!finished) {finish(true); reject(error);}}
        };
        current.onerror = event => {event.preventDefault(); finish(true); reject(new Error(event.message || 'Composer worker failed'));};
        current.onmessageerror = () => {finish(true); reject(new Error('Composer worker result decode failed'));};
        // Structured clone preserves the resident original. It is never passed as a transferable.
        try {current.postMessage({job});} catch (error) {if (!finished) {finish(true); reject(error);}}
      });
    },
    dispose() {disposed = true; active?.cancel(); worker?.terminate(); worker = null;},
  };
}
/** Standard Kit source construction is injected, never another body generator.
 * This entire function runs in a worker; the synchronous reducer cannot block rendering. */
export function installFaunaComposerSourceWorker<D>(scope: Pick<DedicatedWorkerGlobalScope, 'onmessage'|'postMessage'>,
  buildSource: (definition: D) => FaunaComposerSource, targets: readonly [number, number] = [4500, 1500]): void {
  scope.onmessage = async ({data}: MessageEvent<{job: FaunaComposerBuildJob<D>}>) => {
    const job = data.job, started = performance.now();
    try {
      const source = job.loadedSource ?? buildSource(job.definition);
      const levels = buildFaunaComposerRequestedLevels(source, job.tiers, targets);
      scope.postMessage({type: 'progress', key: job.key, phase: 'built', elapsedMs: performance.now() - started});
      const result: FaunaComposerBuildResult = {key: job.key, source, levels, buildMs: performance.now() - started};
      result.receipt = await createComposerBuildReceipt(job, result);
      scope.postMessage({type: 'progress', key: job.key, phase: 'verified', elapsedMs: performance.now() - started});
      const buffers = new Set<ArrayBuffer>(), seen = new Set<object>();
      const visit = (v: unknown) => {if (!v || typeof v !== 'object' || seen.has(v)) return; seen.add(v);
        if (ArrayBuffer.isView(v)) {buffers.add(v.buffer as ArrayBuffer); return;} for (const child of Object.values(v)) visit(child);};
      visit(result); scope.postMessage({key: job.key, result}, [...buffers]);
    } catch (error) {scope.postMessage({key: job.key, error: error instanceof Error ? error.message : String(error)});}
  };
}
