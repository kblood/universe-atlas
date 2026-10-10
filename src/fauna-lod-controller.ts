/** Debug-only runtime seam. This controller chooses representations of existing
 * members; it never generates genomes, changes schedules or filters population.
 * The adapter owns worker construction, packed buffers and presentation shaders. */
import type {Object3D,Vector3,Matrix4} from 'three';
import type {CreatureGenome} from './creature-model.ts';
import type {QuadrupedBodyData} from './fauna-body-plan.ts';
import type {FaunaHerdMember,FaunaMemberActivity} from './fauna-runtime.ts';
import type {FaunaGround,FaunaPoseOptions} from './fauna-locomotion.ts';
import {faunaCoverageEnd} from './fauna-coverage.ts';
export const FAUNA_LOD_CONTROLLER_VERSION='fauna-lod-controller-prototype-1';
export type FaunaLodTier='close'|'middle';
export const FAUNA_LOD_TIER_TARGETS=Object.freeze({close:1500,middle:750});
/** Distance hysteresis for the prototype; screen-size policy may supersede it
 * after measured silhouette thresholds. Full near skins remain separate. */
export function faunaLodTierAt(distanceM:number,previous?:FaunaLodTier):FaunaLodTier{
  return previous==='close'?(distanceM>95?'middle':'close'):previous==='middle'?(distanceM<65?'close':'middle'):distanceM<=75?'close':'middle';
}
export interface FaunaLodContext {planetId:string;lifeSignature:string;dateVersion:string;appearanceVersion:string}
export interface FaunaLodCandidate {
  id:string;genome:CreatureGenome;member:FaunaHerdMember;activity:FaunaMemberActivity;
  cameraVisible:boolean;distanceM:number;matrix:Matrix4;rigSeconds:number;nearCoverage:number;
  tier?:FaunaLodTier;
  tierReason?:'distance'|'rank';
  ground:FaunaGround;groundRevision:number;behaviour?:FaunaPoseOptions['behaviour'];
  /** Borrowed source. Only cloned job buffers may be transferred to a worker. */
  loadedSource?:Readonly<QuadrupedBodyData>|null;
}
export interface FaunaLodBuildJob {
  key:string;context:FaunaLodContext;individualId:string;genome:CreatureGenome;
  tier:FaunaLodTier;targetTriangles:number;
  loadedSource:QuadrupedBodyData|null;
}
export interface FaunaLodBuildResult {accepted:boolean;byteLength:number;appearanceVersion:string;payload:unknown}
export interface FaunaLodPresentationRow {id:string;tier:string;genomeKey:string;sourceDigest:string|null;low:number;high:number}
export interface FaunaLodRuntimeAdapter {
  readonly group:Object3D;
  /** CPU typed-array + estimated GPU ownership, including prepared caches. */
  readonly ownedBytes:number;
  /** Extra adapter staging only. Excludes its cold-job reserve and excludes the
   * returned result, whose ownership passes to this controller on resolution. */
  readonly transientBytes:number;
  /** Maximum cold-job ownership: caller clone + worker inputs/build scratch.
   * Include both copies if input buffers are copied rather than transferred. */
  readonly workerReserveBytes:number;
  /** Optional live worker instrumentation. Missing values are unknown, not0. */
  readonly workerTypedBytes?:number;readonly workerJsEstimateBytes?:number;
  /** Exactly one invocation at a time. Implement in a worker; cancellation must
   * terminate/settle that job. Never transfer the original loaded source. */
  build(job:FaunaLodBuildJob,signal:AbortSignal):Promise<FaunaLodBuildResult>;
  /** Bounded, atomic copy/register/prepare. False must retain the previously
   * bound key for this ID; replacement never releases the old draw first. */
  adopt(id:string,key:string,result:FaunaLodBuildResult,budgetMs:number):boolean;
  /** Release that key only; a successful replacement may already bind a newer
   * key for the same ID and must remain drawable. */
  release(id:string,key:string):void;
  canAdopt?(tier:FaunaLodTier,id:string):boolean;
  discard(result:FaunaLodBuildResult):void;
  beginFrame(origin:Vector3):void;submit(candidate:FaunaLodCandidate,coverage:number,coverageStart:number):boolean;endFrame():void;
  reset():void;dispose():void;
  trace?():readonly FaunaLodPresentationRow[];diagnostics?():unknown;
  beginControllerProfile?():void;endControllerProfile?():void;
}
export interface FaunaLodControllerOptions {
  maxActors?:number;maxDistanceM?:number;maxResultBytes?:number;maxTotalBytes?:number;
  /** Separate cold-job typed transport/build ceiling; resident pool/result
   * budget remains maxTotalBytes. These scopes must be reported together. */
  maxWorkerBytes?:number;
  adoptionBudgetMs?:number;fadeSeconds?:number;now?:()=>number;onReady?:()=>void;
}
type Entry={id:string;key:string;genome:CreatureGenome;tier:FaunaLodTier;seen:number;adoptedMs:number};
type Running={key:string;id:string;genome:CreatureGenome;tier:FaunaLodTier;epoch:number;abort:AbortController};
type Pending={running:Running;result:FaunaLodBuildResult};
const smooth=(t:number)=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x);};
const bytes=(n:number)=>Number.isSafeInteger(n)&&n>=0;
export class FaunaLodController {
  readonly group:Object3D;
  private context:FaunaLodContext|null=null;private contextKey='';private epoch=0;private sequence=0;private frame=0;
  private readonly cache=new Map<string,Entry>();private readonly desired=new Map<string,FaunaLodCandidate>();
  private readonly fallback=new Map<string,number>();private readonly submitted=new Set<string>();
  private readonly failed=new Map<string,number>();private running:Running|null=null;private pending:Pending|null=null;
  private readonly priorContextIds=new Set<string>();private readonly recentJobIds=new Set<string>();
  private readonly coldJobCauses={newId:0,context:0,distanceTier:0,rankTier:0,cacheRebuild:0};
  private disposed=false;private fading=false;private readyRevision=0;private adoptionMs=0;private rejected=0;private cancelled=0;
  private admissionBlocked:string|null=null;private cloneBudgetBytes=0;private cloneObjectEstimateBytes=0;
  private readonly maxActors:number;private readonly maxDistanceM:number;private readonly maxResultBytes:number;private readonly maxTotalBytes:number;
  private readonly maxWorkerBytes:number;
  private readonly adoptionBudgetMs:number;private readonly fadeSeconds:number;private readonly now:()=>number;private readonly onReady:()=>void;
  private readonly adapter:FaunaLodRuntimeAdapter;
  constructor(adapter:FaunaLodRuntimeAdapter,options:FaunaLodControllerOptions={}){
    this.adapter=adapter;
    this.group=adapter.group;this.maxActors=options.maxActors??128;this.maxDistanceM=options.maxDistanceM??200;
    this.maxResultBytes=options.maxResultBytes??2*1024*1024;this.maxTotalBytes=options.maxTotalBytes??16*1024*1024;
    this.maxWorkerBytes=options.maxWorkerBytes??32*1024*1024;
    this.adoptionBudgetMs=options.adoptionBudgetMs??2;this.fadeSeconds=options.fadeSeconds??.25;
    this.now=options.now??(()=>performance.now());this.onReady=options.onReady??(()=>{});
    if(!Number.isSafeInteger(this.maxActors)||this.maxActors<1||this.maxActors>128||!Number.isFinite(this.maxDistanceM)||this.maxDistanceM<150||this.maxDistanceM>200||
      !bytes(this.maxResultBytes)||this.maxResultBytes<1||!bytes(this.maxTotalBytes)||this.maxTotalBytes<this.maxResultBytes||
      !bytes(this.maxWorkerBytes)||this.maxWorkerBytes<1||
      !Number.isFinite(this.adoptionBudgetMs)||this.adoptionBudgetMs<=0||!Number.isFinite(this.fadeSeconds)||this.fadeSeconds<0||
      !bytes(adapter.ownedBytes)||!bytes(adapter.transientBytes)||!bytes(adapter.workerReserveBytes)||adapter.ownedBytes+adapter.transientBytes>this.maxTotalBytes)throw new Error('Invalid bounded fauna LOD controller budget');
    if(adapter.workerReserveBytes>this.maxWorkerBytes)throw new Error('Fauna LOD worker reserve exceeds its separate cold-job ceiling');
  }
  /** Only presentation/source-version context belongs here. Ordinary changing
   * worldNs poses do not invalidate an immutable member's body construction. */
  setContext(context:FaunaLodContext):void{
    const key=JSON.stringify([context.planetId,context.lifeSignature,context.dateVersion,context.appearanceVersion]);
    if(key===this.contextKey)return;
    this.priorContextIds.clear();for(const id of this.cache.keys())this.priorContextIds.add(id);this.recentJobIds.clear();
    this.epoch++;this.contextKey=key;this.context={...context};this.desired.clear();this.fallback.clear();this.submitted.clear();this.failed.clear();
    if(this.running&&!this.running.abort.signal.aborted){this.running.abort.abort();this.cancelled++;}
    if(this.pending){this.adapter.discard(this.pending.result);this.pending=null;}
    this.cache.clear();this.adapter.reset();this.fading=false;this.readyRevision++;
  }
  /** Caller order is the canonical camera-first, distance/id-stable order. */
  update(candidates:readonly FaunaLodCandidate[],origin:Vector3):ReadonlySet<string>{
    if(this.disposed)return this.submitted;
    if(!this.context)throw new Error('Fauna LOD context is required');
    this.frame++;this.desired.clear();this.fallback.clear();this.submitted.clear();this.fading=false;
    for(const candidate of candidates){
      if(!candidate.cameraVisible||candidate.distanceM>this.maxDistanceM||candidate.nearCoverage>=1)continue;
      if(this.desired.size>=this.maxActors)break;
      if(!candidate.id||!Number.isFinite(candidate.distanceM)||candidate.distanceM<0||!Number.isFinite(candidate.nearCoverage)||candidate.nearCoverage<0||candidate.nearCoverage>1)continue;
      if(!this.desired.has(candidate.id))this.desired.set(candidate.id,candidate);
    }
    this.adapter.beginControllerProfile?.();
    const now=this.now();this.adoptionMs=0;
    // A ready message only wakes the paused frame. Adoption remains a bounded
    // frame operation, and malformed/oversized/stale results keep the fallback.
    if(this.pending){
      const {running,result}=this.pending;this.pending=null;const candidate=this.desired.get(running.id);
      const valid=running.epoch===this.epoch&&candidate?.genome===running.genome&&(candidate.tier??'middle')===running.tier&&!!result&&result.accepted&&bytes(result.byteLength)&&result.byteLength<=this.maxResultBytes&&
        result.appearanceVersion===this.context.appearanceVersion&&this.adapter.ownedBytes+this.adapter.transientBytes+result.byteLength<=this.maxTotalBytes;
      if(valid){
        const prior=this.cache.get(running.id);
        this.evictTier(running.tier);
        if(!prior&&this.cache.size>=this.maxActors)this.evict();
        const start=this.now();let adopted=false;
        try{adopted=(!!prior||this.cache.size<this.maxActors)&&this.adapter.adopt(running.id,running.key,result,this.adoptionBudgetMs);}catch{adopted=false;}
        this.adoptionMs=Math.max(0,this.now()-start);
        if(adopted){if(prior)this.adapter.release(prior.id,prior.key);this.cache.set(running.id,{id:running.id,key:running.key,genome:running.genome,tier:running.tier,seen:this.frame,adoptedMs:prior?.adoptedMs??now});}
        else{this.adapter.discard(result);this.failed.set(running.id,now);this.rejected++;}
      }else{this.adapter.discard(result);this.rejected++;if(candidate)this.failed.set(candidate.id,now);}
    }
    this.adapter.beginFrame(origin);
    for(const candidate of this.desired.values()){
      const entry=this.cache.get(candidate.id);if(!entry||entry.genome!==candidate.genome)continue;
      entry.seen=this.frame;
      const age=this.fadeSeconds===0?1:smooth((now-entry.adoptedMs)/(this.fadeSeconds*1000));
      const range=1-smooth((candidate.distanceM-(this.maxDistanceM-25))/25),coverage=(1-candidate.nearCoverage)*age*range;
      if(age<1)this.fading=true;
      let drawn=false;try{drawn=coverage>0&&this.adapter.submit(candidate,coverage,candidate.nearCoverage);}catch{drawn=false;}
      if(drawn){this.submitted.add(candidate.id);this.fallback.set(candidate.id,1-faunaCoverageEnd(candidate.nearCoverage,coverage));}
    }
    this.adapter.endFrame();
    this.startNext(now);this.adapter.endControllerProfile?.();return this.submitted;
  }
  private evict(){
    let victim:Entry|undefined;
    for(const entry of this.cache.values())if(!this.desired.has(entry.id)&&(!victim||entry.seen<victim.seen||(entry.seen===victim.seen&&entry.id<victim.id)))victim=entry;
    if(victim){this.adapter.release(victim.id,victim.key);this.cache.delete(victim.id);}
  }
  private evictTier(tier:FaunaLodTier){
    const cap=tier==='close'?16:112;let count=0;for(const entry of this.cache.values())if(entry.tier===tier)count++;
    while(count>=cap){let victim:Entry|undefined;for(const entry of this.cache.values())if(entry.tier===tier&&!this.desired.has(entry.id)&&(!victim||entry.seen<victim.seen||(entry.seen===victim.seen&&entry.id<victim.id)))victim=entry;
      if(!victim)break;this.adapter.release(victim.id,victim.key);this.cache.delete(victim.id);count--;}
  }
  private startNext(now:number){
    if(this.running||this.pending||!this.context||this.adoptionMs>this.adoptionBudgetMs)return;
    this.admissionBlocked=null;
    if(this.adapter.ownedBytes+this.adapter.transientBytes>this.maxTotalBytes){this.admissionBlocked='resident-staging-exceeds-resident-budget';return;}
    if(this.adapter.workerReserveBytes>this.maxWorkerBytes){this.admissionBlocked='worker-reserve-exceeds-cold-job-budget';return;}
    for(const candidate of this.desired.values()){
      const entry=this.cache.get(candidate.id),tier=candidate.tier??'middle';
      if(entry?.genome===candidate.genome&&entry.tier===tier||(this.failed.get(candidate.id)??-Infinity)+2000>now)continue;
      this.evictTier(tier);
      if(this.adapter.canAdopt&&!this.adapter.canAdopt(tier,candidate.id)){this.admissionBlocked='tier-staging-full-waiting-for-migration';continue;}
      const loaded=candidate.loadedSource??null;
      if(loaded&&(loaded.plan.genome!==candidate.genome||loaded.vertexCount>40000||loaded.triangleCount>60000)){this.failed.set(candidate.id,now);this.rejected++;continue;}
      const stores=new Set<ArrayBufferLike>();if(loaded)for(const array of [loaded.positions,loaded.normals,loaded.colors,loaded.skinIndex,loaded.skinWeight,loaded.index])stores.add(array.buffer);
      // Typed buffers are exact. Ordinary object/string clone overhead is a
      // conservative serialized-size reserve, rather than a claimed heap size.
      this.cloneBudgetBytes=[...stores].reduce((n,b)=>n+b.byteLength,0);
      this.cloneObjectEstimateBytes=new TextEncoder().encode(JSON.stringify({genome:candidate.genome,plan:loaded?.plan})).byteLength*4;
      if(this.cloneBudgetBytes>this.adapter.workerReserveBytes){this.admissionBlocked='worker-reserve-smaller-than-cloned-input';return;}
      // Clone only the one admitted cold job; source/near cache buffers remain
      // borrowed and untouched, including when a worker transfers its clone.
      const key=`${this.epoch}/${++this.sequence}/${tier}/${candidate.id}`,running:Running={key,id:candidate.id,genome:candidate.genome,tier,epoch:this.epoch,abort:new AbortController()};
      const cloned=structuredClone({genome:candidate.genome,loadedSource:loaded});
      const job:FaunaLodBuildJob={key,context:{...this.context},individualId:candidate.id,tier,targetTriangles:FAUNA_LOD_TIER_TARGETS[tier],genome:cloned.genome,loadedSource:cloned.loadedSource};
      this.running=running;
      const cause=entry?.genome===candidate.genome&&entry.tier!==tier?(candidate.tierReason==='rank'?'rankTier':'distanceTier'):this.priorContextIds.has(candidate.id)?'context':this.recentJobIds.has(candidate.id)?'cacheRebuild':'newId';
      Promise.resolve().then(()=>{if(running.abort.signal.aborted)throw new Error('Cancelled fauna LOD job');this.coldJobCauses[cause]++;
        this.priorContextIds.delete(running.id);this.recentJobIds.delete(running.id);this.recentJobIds.add(running.id);if(this.recentJobIds.size>128)this.recentJobIds.delete(this.recentJobIds.values().next().value!);
        return this.adapter.build(job,running.abort.signal);}).then(result=>{
        if(this.disposed||running.abort.signal.aborted||running.epoch!==this.epoch){this.adapter.discard(result);return;}
        if(!result||!result.accepted||!bytes(result.byteLength)||result.byteLength>this.maxResultBytes||result.appearanceVersion!==this.context?.appearanceVersion){this.adapter.discard(result);this.rejected++;this.failed.set(running.id,this.now());return;}
        this.pending={running,result};
      },()=>{if(!this.disposed&&running.epoch===this.epoch)this.failed.set(running.id,this.now());}).finally(()=>{
        if(this.running===running)this.running=null;
        if(!this.disposed){this.readyRevision++;this.onReady();}
      });
      break;
    }
    // Failure metadata remains bounded to the current requested population.
    for(const id of this.failed.keys())if(!this.desired.has(id))this.failed.delete(id);
  }
  fallbackCoverage(id:string,nearCoverage=0):number{return this.fallback.get(id)??Math.max(0,1-nearCoverage);}
  presentationTrace(){return this.adapter.trace?.()??[];}
  get idle(){return !this.pending&&!this.fading;}
  diagnostics(){return {version:FAUNA_LOD_CONTROLLER_VERSION,adapter:this.adapter.diagnostics?.(),context:this.context,desired:this.desired.size,prepared:this.cache.size,submitted:this.submitted.size,
    coldJobCauses:{...this.coldJobCauses},coldReasonHistoryIds:this.recentJobIds.size,priorContextHistoryIds:this.priorContextIds.size,
    coldJobs:this.running?1:0,pendingResults:this.pending?1:0,pendingResultBytes:this.pending?.result.byteLength??0,readyRevision:this.readyRevision,rejected:this.rejected,cancelled:this.cancelled,
    adapterOwnedBytes:this.adapter.ownedBytes,adapterTransientBytes:this.adapter.transientBytes,workerReservedBytes:this.running?this.adapter.workerReserveBytes:0,
    currentCombinedEstimateBytes:this.adapter.ownedBytes+this.adapter.transientBytes+(this.pending?.result.byteLength??0)+(this.running?(this.adapter.workerTypedBytes??0):0),
    reservedCombinedEstimateBytes:this.adapter.ownedBytes+this.adapter.transientBytes+(this.pending?.result.byteLength??0)+(this.running?this.adapter.workerReserveBytes:0),
    cloneTypedBytes:this.cloneBudgetBytes,cloneObjectEstimateBytes:this.cloneObjectEstimateBytes,admissionBlocked:this.admissionBlocked,
    workerCurrentTypedBytes:this.running?(this.adapter.workerTypedBytes??null):0,workerOwnershipUnknown:!!this.running&&this.adapter.workerTypedBytes===undefined,workerJsEstimateBytes:this.adapter.workerJsEstimateBytes??null,
    maxResidentBytes:this.maxTotalBytes,maxWorkerBytes:this.maxWorkerBytes,maxIncrementalTypedBytes:this.maxTotalBytes+this.maxWorkerBytes,
    maxActors:this.maxActors,maxDistanceM:this.maxDistanceM,maxTotalBytes:this.maxTotalBytes,adoptionMs:this.adoptionMs,adoptionBudgetMs:this.adoptionBudgetMs,adoptionOverBudget:this.adoptionMs>this.adoptionBudgetMs};}
  dispose(){if(this.disposed)return;this.disposed=true;this.epoch++;this.running?.abort.abort();if(this.pending)this.adapter.discard(this.pending.result);this.pending=null;
    this.cache.clear();this.desired.clear();this.fallback.clear();this.submitted.clear();this.failed.clear();this.recentJobIds.clear();this.priorContextIds.clear();this.adapter.dispose();}
}
