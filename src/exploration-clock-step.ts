/** Test-only deterministic simulation input. Render/profiler clocks stay real.
 * Null restores the normal clock; finite ticks avoid extra rAF epoch drift. */
export class ExplorationClockStep {
  private step:bigint|null=null;private limit=180;private ticks=0;
  private start:bigint|null=null;private end:bigint|null=null;
  configure(stepNs:string|null,maxTicks=180){
    if(stepNs!==null&&(typeof stepNs!=='string'||!/^\d{1,10}$/.test(stepNs)||BigInt(stepNs)>1000000000n))throw new Error('Exploration step must be integer nanoseconds 0..1e9 or null');
    if(!Number.isSafeInteger(maxTicks)||maxTicks<1||maxTicks>10000)throw new Error('Exploration tick limit must be 1..10000');
    this.step=stepNs===null?null:BigInt(stepNs);this.limit=maxTicks;this.ticks=0;this.start=this.end=null;
    return this.snapshot();
  }
  get enabled(){return this.step!==null;}
  get held(){return this.enabled&&this.ticks>=this.limit;}
  next(epoch:bigint){if(this.step===null||this.held)throw new Error('Inactive exploration test tick');return epoch+this.step;}
  record(before:bigint,after:bigint){if(!this.enabled||this.held)return;if(this.start===null)this.start=before;this.end=after;this.ticks++;}
  snapshot(){return {stepNs:this.step?.toString()??null,ticks:this.ticks,maxTicks:this.limit,startEpochNs:this.start?.toString()??null,endEpochNs:this.end?.toString()??null,held:this.held};}
}
