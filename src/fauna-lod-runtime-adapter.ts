/** Local research provider. Worker lifetime is one cold job; packed arrays are
 * copied once into atlas-owned slots, then the transferable payload is dropped. */
import * as THREE from 'three';
import {FaunaRuntimeProfile} from './fauna-runtime-profile.ts';
import receipt from '../vendor/creature-kit/PACKAGE.json' with {type:'json'};
import {FaunaPlanetCrispBatch} from './fauna-planet-crisp-batch.ts';
import {FAUNA_PLANET_CRISP_RAW_VERSION} from './fauna-planet-crisp.ts';
import {FAUNA_PLANET_CRISP_RAW_PACKED_VERSION} from './fauna-planet-crisp-packed.ts';
import {FaunaBonePaletteWriter,faunaSkinnedGeometryKey} from './fauna-skinned-batch.ts';
import {quadrupedPoseAt,createQuadrupedPoseWorkspace,quadrupedPoseAtInto,type QuadrupedPoseWorkspace,type QuadrupedPlan,type FaunaPathMember} from '#creature-kit/planet';
import type {FaunaPackedRenderPayload} from './fauna-packed-worker-adapter.ts';
import type {FaunaLodRuntimeAdapter,FaunaLodBuildJob,FaunaLodBuildResult,FaunaLodCandidate,FaunaLodTier} from './fauna-lod-controller.ts';
type Payload=FaunaPackedRenderPayload&{sourceDigest?:string|null};
type Binding={id:string;key:string;geometryKey:string;tier:FaunaLodTier;plan:QuadrupedPlan;sourceDigest:string|null;
  palette:Float32Array;lastTime:number;lastActivity:unknown;lastGround:unknown;lastGroundRevision:number;lastBehaviour:unknown;poseBuilds:number;maxPenetration:number;maxReachError:number};
type PoseBinding=Binding&{workspace:QuadrupedPoseWorkspace|null;memberPath:FaunaPathMember|null};
export interface FaunaLodRuntimeOptions {presentation?:'legacy-v4'|'sculpted-v1';basisStorage?:'float32'|'packed-snorm16';workerFactory?:()=>Worker;workerReserveBytes?:number;poseMode?:'into'|'canonical';profile?:boolean;paletteUploadMode?:'full'|'adaptive-rows'}
function samePath(a:FaunaPathMember,b:FaunaPathMember){return a.id===b.id&&Object.is(a.anchorOffsetX,b.anchorOffsetX)&&Object.is(a.anchorOffsetZ,b.anchorOffsetZ)&&Object.is(a.orbitRadiusM,b.orbitRadiusM)&&Object.is(a.orbitAngularSpeed,b.orbitAngularSpeed)&&Object.is(a.orbitPhase,b.orbitPhase)&&Object.is(a.gaitPeriodS,b.gaitPeriodS);}
export function createFaunaLodRuntimePrototype(options:FaunaLodRuntimeOptions={}){
  const storage=options.basisStorage??'float32',poseMode=options.poseMode??'into',appearanceVersion=storage==='float32'?FAUNA_PLANET_CRISP_RAW_VERSION:FAUNA_PLANET_CRISP_RAW_PACKED_VERSION;
  const presentation=options.presentation??'legacy-v4';
  if(presentation!=='legacy-v4'&&presentation!=='sculpted-v1')throw new Error('Unsupported LOD animal presentation');
  const bodyTag=presentation==='sculpted-v1'?'quadruped-body-sculpted-1':'quadruped-body4';
  const planVersion=presentation==='sculpted-v1'?'quadruped-body-sculpted-1':'quadruped-body-4';
  const sourceVersion=`creature-kit/${receipt.kit.version}/${receipt.kit.commit}/${bodyTag}/joint-qem2`;
  const profile=new FaunaRuntimeProfile(options.profile);
  let controllerStart=0;
  const poolOptions={paletteUploadMode:options.paletteUploadMode??'full'} as const;
  const pools={close:new FaunaPlanetCrispBatch({...poolOptions,capacity:17,maxVerticesPerAnimal:900,maxIndicesPerAnimal:4500,cacheMode:'atlas-owned',basisStorage:storage,maxBufferBytes:16*1024*1024}),
    middle:new FaunaPlanetCrispBatch({...poolOptions,capacity:113,maxVerticesPerAnimal:500,maxIndicesPerAnimal:2250,cacheMode:'atlas-owned',basisStorage:storage,maxBufferBytes:16*1024*1024})};
  const group=new THREE.Group();group.name='Opt-in actual-genome LOD';group.add(pools.close.group,pools.middle.group);
  const localZero=new THREE.Vector3();
  const bindings=new Map<string,PoseBinding>(),jobs=new Map<string,{tier:FaunaLodTier;genome:string}>(),writer=new FaunaBonePaletteWriter(),rows:{id:string;tier:string;genomeKey:string;sourceDigest:string|null;low:number;high:number;poseBuilds:number;maxPenetration:number;maxReachError:number}[]=[];
  let disposed=false,activeWorker:Worker|null=null,activeReject:((reason:unknown)=>void)|null=null,activeCleanup:(()=>void)|null=null;
  const workerFactory=options.workerFactory??(()=>new Worker(new URL('./fauna-lod-worker.ts',import.meta.url),{type:'module'}));
  const releaseBinding=(binding:Binding)=>{const pool=pools[binding.tier];pool.releaseAnimal(binding.id);pool.releaseGeometry(binding.geometryKey);};
  const profiledGround=new WeakMap<FaunaLodCandidate['ground'],FaunaLodCandidate['ground']>();
  function groundFor(ground:FaunaLodCandidate['ground']){
    if(!profile.enabled)return ground;let wrapped=profiledGround.get(ground);if(!wrapped){wrapped=(x,z)=>{const start=profile.start();try{return ground(x,z);}finally{profile.end('ground',start);}};profiledGround.set(ground,wrapped);}return wrapped;
  }
  const adapter:FaunaLodRuntimeAdapter&{trace():typeof rows;diagnostics():unknown}={group,
    ...(profile.enabled?{beginControllerProfile(){controllerStart=profile.start();},endControllerProfile(){profile.end('controller',controllerStart);}}:{}),
    get ownedBytes(){const start=profile.start();let n=pools.close.ownedBytes+pools.middle.ownedBytes;
      for(const entry of bindings.values())n+=entry.palette.byteLength+(entry.workspace?.resources.outputTypedBytes??0);profile.end('ownership',start);return n;},
    transientBytes:0,workerReserveBytes:options.workerReserveBytes??32*1024*1024,
    build(job:FaunaLodBuildJob,signal:AbortSignal):Promise<FaunaLodBuildResult>{
      if(disposed||activeWorker)return Promise.reject(new Error('Fauna worker unavailable or already active'));
      if(job.loadedSource&&job.loadedSource.plan.version!==planVersion)return Promise.reject(new Error('Loaded animal body presentation does not match the LOD provider'));
      jobs.set(job.key,{tier:job.tier,genome:JSON.stringify(job.genome)});
      return new Promise((resolve,reject)=>{
        let worker:Worker;try{worker=workerFactory();}catch(error){jobs.delete(job.key);reject(error);return;}activeWorker=worker;activeReject=reject;
        const finish=()=>{worker.terminate();if(activeWorker===worker){activeWorker=null;activeReject=null;activeCleanup=null;}signal.removeEventListener('abort',abort);};activeCleanup=finish;
        const abort=()=>{finish();jobs.delete(job.key);reject(new Error('Fauna worker cancelled'));};signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return;}
        worker.onmessage=({data})=>{if(data?.key!==job.key){finish();jobs.delete(job.key);reject(new Error('Fauna worker returned wrong job key'));return;}finish();if(data.error){jobs.delete(job.key);reject(new Error(data.error));return;}
          const result=data.result;if(result?.payload)result.payload.sourceDigest=result.sourceDigest??null;if(!result?.accepted)jobs.delete(job.key);resolve(result);};
        worker.onerror=event=>{event.preventDefault();finish();jobs.delete(job.key);reject(new Error(event.message||'Fauna worker failed'));};
        worker.onmessageerror=()=>{finish();jobs.delete(job.key);reject(new Error('Fauna worker result decode failed'));};
        const buffers=job.loadedSource?[...new Set([job.loadedSource.positions,job.loadedSource.normals,job.loadedSource.colors,job.loadedSource.skinIndex,job.loadedSource.skinWeight,job.loadedSource.index].map(a=>a.buffer))] as ArrayBuffer[]:[];
        const dispatchStart=profile.start();try{worker.postMessage({job,basisStorage:storage,presentation,providerVersion:sourceVersion},buffers);}catch(error){finish();jobs.delete(job.key);reject(error);}finally{profile.end('workerDispatch',dispatchStart);}
      });
    },
    adopt(id,key,result){
      const payload=result.payload as Payload,job=jobs.get(key);if(disposed||!payload||!job||payload.individualId!==id||payload.key!==key||payload.providerVersion!==sourceVersion||payload.sourcePlan.version!==planVersion||JSON.stringify(payload.sourcePlan.genome)!==job.genome)return false;
      const tier=job.tier,pool=pools[tier],previous=bindings.get(id);
      const geometryKey=JSON.stringify([payload.context.planetId,payload.context.lifeSignature,id,faunaSkinnedGeometryKey(payload.sourcePlan.genome,sourceVersion+'/'+appearanceVersion,tier==='close'?1500:750)]);
      const palette=new Float32Array(22*16);
      if(!pool.registerGeometry(geometryKey,payload))return false;
      if(!pool.prepareAnimal(id,geometryKey)){pool.releaseGeometry(geometryKey);return false;}
      const entry:PoseBinding={id,key,geometryKey,tier,plan:payload.sourcePlan,sourceDigest:payload.sourceDigest??null,palette,workspace:null,memberPath:null,lastTime:NaN,lastActivity:null,lastGround:null,lastGroundRevision:-1,lastBehaviour:null,poseBuilds:0,maxPenetration:0,maxReachError:0};
      bindings.set(id,entry);jobs.delete(key);if(previous&&previous.tier!==tier)releaseBinding(previous);else if(previous)pool.releaseGeometry(previous.geometryKey);return true;
    },
    release(id,key){const entry=bindings.get(id);if(entry?.key!==key)return;releaseBinding(entry);bindings.delete(id);},
    canAdopt(tier,id){return bindings.get(id)?.tier===tier||pools[tier].preparedCount<(tier==='close'?17:113);},
    discard(result){const payload=result?.payload as Payload|null;if(payload?.key)jobs.delete(payload.key);},
    // PlanetRenderer nests this group under faunaRenderer.group, which owns
    // lifeOrigin already. Actor matrices subtract that origin exactly once.
    beginFrame(_origin){profile.frame();rows.length=0;pools.close.beginFrame(localZero);pools.middle.beginFrame(localZero);},
    submit(candidate:FaunaLodCandidate,coverage,coverageStart){
      const entry=bindings.get(candidate.id);if(!entry)return false;
      if(!entry.memberPath||!samePath(entry.memberPath,candidate.member)){const m=candidate.member;
        const member=Object.freeze({id:m.id,anchorOffsetX:m.anchorOffsetX,anchorOffsetZ:m.anchorOffsetZ,orbitRadiusM:m.orbitRadiusM,orbitAngularSpeed:m.orbitAngularSpeed,orbitPhase:m.orbitPhase,gaitPeriodS:m.gaitPeriodS});
        entry.memberPath=member;if(poseMode==='into')entry.workspace=createQuadrupedPoseWorkspace(entry.plan,member);entry.lastTime=NaN;}
      if(!Object.is(entry.lastTime,candidate.rigSeconds)||entry.lastActivity!==candidate.activity||entry.lastGround!==candidate.ground||entry.lastGroundRevision!==candidate.groundRevision||entry.lastBehaviour!==candidate.behaviour){
        const poseStart=profile.start(),ground=groundFor(candidate.ground);
        const pose=entry.workspace?quadrupedPoseAtInto(entry.workspace,candidate.activity,ground,candidate.rigSeconds,{behaviour:candidate.behaviour}):quadrupedPoseAt(entry.plan,candidate.member,candidate.activity,ground,candidate.rigSeconds,{behaviour:candidate.behaviour});profile.end('pose',poseStart);const paletteStart=profile.start();writer.write(entry.plan,pose,entry.palette);profile.end('palette',paletteStart);
        entry.lastTime=candidate.rigSeconds;entry.lastActivity=candidate.activity;entry.lastGround=candidate.ground;entry.lastGroundRevision=candidate.groundRevision;entry.lastBehaviour=candidate.behaviour;entry.poseBuilds++;entry.maxPenetration=pose.maxPenetration;entry.maxReachError=pose.maxReachError;
      }
      const submitStart=profile.start();const submitted=pools[entry.tier].submit(candidate.id,candidate.matrix,entry.palette,{roughness:candidate.genome.appearance?.roughness??.86,coverage,coverageStart});profile.end('submit',submitStart);
      if(submitted)rows.push({id:candidate.id,tier:entry.tier==='close'?'lod1500':'lod750',genomeKey:entry.geometryKey,sourceDigest:entry.sourceDigest,low:Math.fround(coverageStart),high:Math.fround(Math.min(1,coverageStart+coverage)),poseBuilds:entry.poseBuilds,maxPenetration:entry.maxPenetration,maxReachError:entry.maxReachError});return submitted;
    },
    endFrame(){const start=profile.start();pools.close.endFrame();pools.middle.endFrame();profile.end('stream',start);},
    reset(){for(const entry of bindings.values())releaseBinding(entry);bindings.clear();jobs.clear();rows.length=0;group.visible=true;},
    dispose(){if(disposed)return;disposed=true;const reject=activeReject;activeCleanup?.();activeWorker=null;activeReject=null;reject?.(new Error('Fauna runtime disposed'));pools.close.dispose();pools.middle.dispose();bindings.clear();jobs.clear();rows.length=0;group.removeFromParent();},
    trace:()=>rows,
    diagnostics:()=>({profile:profile.snapshot(),disposed,workerActive:!!activeWorker,bindings:bindings.size,pendingJobs:jobs.size,basisStorage:storage,sourceVersion,appearanceVersion,nearHandoff:'hard-authoritative',poseVersion:poseMode==='into'?'canonical-quadrupedPoseAtInto':'canonical-quadrupedPoseAt',workerLifetime:'one-job-then-terminate',workerHeapBytes:null,
      close:pools.close.diagnostics(),middle:pools.middle.diagnostics(),paletteCacheCpuBytes:[...bindings.values()].reduce((n,b)=>n+b.palette.byteLength,0),
      poseWorkspaceTypedBytes:[...bindings.values()].reduce((n,b)=>n+(b.workspace?.resources.outputTypedBytes??0),0),poseWorkspaceJsObjects:[...bindings.values()].reduce((n,b)=>n+(b.workspace?b.workspace.resources.vector3Objects+b.workspace.resources.quaternionObjects+b.workspace.resources.eulerObjects+b.workspace.resources.footRecords+b.workspace.resources.footTupleArrays:0),0),sourceArraysRetained:false})};
  return {adapter,sourceVersion,appearanceVersion};
}
