/** Bounded operational evidence only. No definitions, graphs or skins are retained. */
export const COMPOSER_WORKER_DIAGNOSTICS_VERSION = 'composer-worker-phases-1';
export const COMPOSER_WORKER_DIAGNOSTIC_LIMITS = Object.freeze({jobs: 32, stages: 16, keyCharacters: 512, errorCharacters: 512});
export type ComposerWorkerPhase = 'retry'|'startup'|'source'|'lod'|'built'|'worker-receipt'|'verified'|'main-receive'|'main-receipt'|'complete'|'failure'|'cancelled';
export interface ComposerWorkerProgress {
  key: string; jobId: number; phase: ComposerWorkerPhase;
  /** Main-provider clock since this job began, including startup and receipt verification. */
  elapsedMs: number;
  /** Separate worker clock since it received the job; never subtract across clock origins. */
  workerElapsedMs?: number;
  failedPhase?: ComposerWorkerPhase; error?: string;
  retry?: {failedFrame: number; currentFrame: number};
}
type Stage = Omit<ComposerWorkerProgress, 'key'|'jobId'|'error'|'retry'>;
type Job = {jobId: number; key: string; keyCharacters: number; keyTruncated: boolean; error?: string;
  retry?: {failedFrame: number; currentFrame: number}; stages: Stage[]; droppedStages: number};
const limits = COMPOSER_WORKER_DIAGNOSTIC_LIMITS;
// UTF-16 text plus conservative fixed object/number allowances. This is an
// allocation reservation, not a JS-engine heap measurement. Reserve it up front.
export const COMPOSER_WORKER_DIAGNOSTIC_RESERVE_BYTES = 256 + limits.jobs *
  (512 + (limits.keyCharacters + limits.errorCharacters) * 2 + limits.stages * 128);
function clipped(text: string, limit: number): string {
  if (text.length <= limit) return text;
  // Copy code units: sliced/concatenated strings may otherwise keep the entire
  // original (possibly definition-sized) source key alive in the JS engine.
  const codes = new Uint16Array(limit), half = limit / 2;
  for (let i = 0; i < half; i++) codes[i] = text.charCodeAt(i);
  codes[half] = 0x2026;
  for (let i = half + 1; i < limit; i++) codes[i] = text.charCodeAt(text.length - limit + i);
  return String.fromCharCode(...codes);
}
export class ComposerWorkerDiagnostics {
  private readonly jobs: Job[] = [];
  private disposed = false;
  private droppedJobs = 0;
  readonly record = (event: ComposerWorkerProgress): void => {
    if (this.disposed) return;
    let job = this.jobs.find(row => row.jobId === event.jobId);
    if (!job) {
      if (this.jobs.length === limits.jobs) {this.jobs.shift(); this.droppedJobs++;}
      job = {jobId: event.jobId, key: clipped(event.key, limits.keyCharacters), keyCharacters: event.key.length,
        keyTruncated: event.key.length > limits.keyCharacters, stages: [], droppedStages: 0};
      this.jobs.push(job);
    }
    if (event.error !== undefined) job.error = clipped(event.error, limits.errorCharacters);
    if (event.retry) job.retry = {...event.retry};
    const {key: _key, jobId: _id, error: _error, retry: _retry, ...stage} = event;
    if (job.stages.length === limits.stages) {
      job.droppedStages++;
      // Keep the initial phase and the latest/terminal observation on overflow.
      job.stages.splice(1, 1);
    }
    job.stages.push(stage);
  };
  get reservedBytes(): number {return this.disposed ? 0 : COMPOSER_WORKER_DIAGNOSTIC_RESERVE_BYTES;}
  snapshot() {
    const textBytes = this.jobs.reduce((n, j) => n + (j.key.length + (j.error?.length ?? 0)) * 2, 0);
    const stages = this.jobs.reduce((n, j) => n + j.stages.length, 0);
    return {version: COMPOSER_WORKER_DIAGNOSTICS_VERSION, limits, reservedBytes: this.reservedBytes,
      retainedTextBytes: textBytes, retainedJobs: this.jobs.length, retainedStages: stages,
      retainedFieldEstimateBytes: this.disposed ? 0 : 256 + textBytes + this.jobs.length * 512 + stages * 128,
      accounting: 'UTF-16 text and conservative record allowances; not measured JS heap', droppedJobs: this.droppedJobs,
      jobs: this.jobs.map(j => ({...j, retry: j.retry ? {...j.retry} : undefined, stages: j.stages.map(s => ({...s}))}))};
  }
  dispose(): void {this.jobs.length = 0; this.disposed = true;}
}
