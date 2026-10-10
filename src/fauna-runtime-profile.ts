/** Opt-in attribution only. Ground timing adds timer overhead to each sample;
 * whole-frame comparisons must use a separate uninstrumented capture. */
export type FaunaRuntimePhase='controller'|'ground'|'pose'|'palette'|'submit'|'stream'|'ownership'|'workerDispatch';
export class FaunaRuntimeProfile {
  private totals:Record<FaunaRuntimePhase,{calls:number;ms:number}>=Object.fromEntries(
    ['controller','ground','pose','palette','submit','stream','ownership','workerDispatch'].map(key=>[key,{calls:0,ms:0}])) as Record<FaunaRuntimePhase,{calls:number;ms:number}>;
  private frames=0;
  readonly enabled:boolean;private clock:()=>number;
  constructor(enabled=false,clock=()=>performance.now()){this.enabled=enabled;this.clock=clock;}
  start(){return this.enabled?this.clock():0;}
  end(phase:FaunaRuntimePhase,start:number){if(this.enabled){const row=this.totals[phase];row.calls++;row.ms+=this.clock()-start;}}
  frame(){if(this.enabled)this.frames++;}
  snapshot(){return {enabled:this.enabled,frames:this.frames,phases:Object.fromEntries(Object.entries(this.totals).map(([key,row])=>[key,{...row}]))};}
}
