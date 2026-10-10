/** Pure worker bridge. Kit factory injection keeps the provider/version
 * explicit and allows the accepted package update to select the real core. */
import type {QuadrupedBodyData,QuadrupedPlan} from './fauna-body-plan.ts';
import {buildFaunaBodyLodCandidates} from './fauna-body-lod-candidates.ts';
import {buildFaunaPlanetCrispData,type FaunaPlanetPatternOracle} from './fauna-planet-crisp.ts';
import {packFaunaPlanetCrispData,type FaunaPlanetCrispPackedData,FAUNA_PLANET_CRISP_RAW_PACKED_VERSION} from './fauna-planet-crisp-packed.ts';
export interface FaunaPackedBuildJob {
  key:string;individualId:string;tier?:'close'|'middle';targetTriangles?:number;genome:QuadrupedPlan['genome'];loadedSource:QuadrupedBodyData|null;
  context:{planetId:string;lifeSignature:string;dateVersion:string;appearanceVersion:string};
}
export interface FaunaPackedKitProvider {
  version:string;
  quadrupedBodyBuildSteps(genome:QuadrupedPlan['genome']):Generator<void,QuadrupedBodyData,void>;
  createQuadrupedBodyPatternSampler(source:Readonly<QuadrupedBodyData>,options:{rawLayers:true}):FaunaPlanetPatternOracle;
}
/** Lean transferable result: no original dense source buffers, temporary float
 * layers or source-to-LOD correspondence arrays remain referenced. */
export type FaunaPackedRenderPayload=Omit<FaunaPlanetCrispPackedData,'source'> & {
  sourcePlan:QuadrupedPlan;individualId:string;key:string;context:FaunaPackedBuildJob['context'];providerVersion:string;
};
const arraysOf=(body:QuadrupedBodyData)=>[body.positions,body.normals,body.colors,body.skinIndex,body.skinWeight,body.index];
function buffersOf(payload:FaunaPackedRenderPayload):ArrayBuffer[]{
  return [...new Set([...arraysOf(payload.sourceGeometry),payload.c0,payload.c1,payload.c2,payload.sample,payload.clip].map(a=>a.buffer))] as ArrayBuffer[];
}
export function faunaPackedPayloadBytes(payload:FaunaPackedRenderPayload):number{return buffersOf(payload).reduce((sum,b)=>sum+b.byteLength,0);}
export function faunaPackedPayloadTransfers(payload:FaunaPackedRenderPayload):ArrayBuffer[]{return buffersOf(payload);}
export function createFaunaPackedWorkerAdapter(provider:FaunaPackedKitProvider,options:{targetTriangles?:number;maxVertices?:number;maxResultBytes?:number;yieldWork?:()=>Promise<void>}={}){
  const defaultTarget=options.targetTriangles??750,maxVertices=options.maxVertices??500,maxResultBytes=options.maxResultBytes??512*1024;
  if(![500,750,1500].includes(defaultTarget)||!Number.isInteger(maxVertices)||maxVertices<1||maxVertices>1500||!Number.isInteger(maxResultBytes)||maxResultBytes<1024||maxResultBytes>2*1024*1024)throw new Error('packed fauna worker: bounded target/vertex/result limits required');
  if(!provider.version)throw new Error('packed fauna worker: provider version required');
  const yieldWork=options.yieldWork??(()=>new Promise<void>(resolve=>setTimeout(resolve,0)));
  return {appearanceVersion:FAUNA_PLANET_CRISP_RAW_PACKED_VERSION,async build(job:FaunaPackedBuildJob,signal:AbortSignal){
    const check=()=>{if(signal.aborted)throw new Error('packed fauna worker: cancelled');};check();
    if(!job?.key||!job.individualId||!job.context?.planetId||!job.context.lifeSignature||!job.context.dateVersion||job.context.appearanceVersion!==FAUNA_PLANET_CRISP_RAW_PACKED_VERSION)throw new Error('packed fauna worker: exact identity/context required');
    const target=job.targetTriangles??defaultTarget;if(![500,750,1500].includes(target))throw new Error('packed fauna worker: unsupported job target');const vertexLimit=job.tier==='close'?900:maxVertices;
    let source=job.loadedSource;
    if(source&&JSON.stringify(source.plan.genome)!==JSON.stringify(job.genome))throw new Error('packed fauna worker: loaded source genome differs from requested individual');
    if(!source){const steps=provider.quadrupedBodyBuildSteps(job.genome);for(;;){check();const next=steps.next();if(next.done){source=next.value;break;}await yieldWork();}}
    check();if(!source||source.vertexCount>40000||source.triangleCount>60000)throw new Error('packed fauna worker: source exceeds reducer input bounds');
    const sourceTypedBytes=[...new Set(arraysOf(source).map(a=>a.buffer))].reduce((sum,b)=>sum+b.byteLength,0);
    const control=buildFaunaBodyLodCandidates(source,{targets:[target],methods:['joint-constrained-qem']}),level=control.chains[0]!.levels[0]!;check();
    if(!level.withinBudget||level.vertexCount>vertexLimit)return {accepted:false,byteLength:0,appearanceVersion:FAUNA_PLANET_CRISP_RAW_PACKED_VERSION,payload:null,reason:'geometry exceeds admitted target/vertex capacity',sourceTypedBytes};
    // Allow queued cancellation after the bounded synchronous reducer phase.
    await yieldWork();check();
    const oracle=provider.createQuadrupedBodyPatternSampler(source,{rawLayers:true});if(oracle.version!=='quadruped-body-pattern-sampler-raw-1')throw new Error('packed fauna worker: exact raw planetary API required');
    const float=buildFaunaPlanetCrispData(source,level,oracle),packed=packFaunaPlanetCrispData(float);check();
    const geometry:QuadrupedBodyData={plan:level.plan,positions:level.positions,normals:level.normals,colors:level.colors,skinIndex:level.skinIndex,skinWeight:level.skinWeight,index:level.index,
      vertexCount:level.vertexCount,triangleCount:level.triangleCount,bodyVertexCount:level.bodyVertexCount,bodyTriangleCount:level.bodyTriangleCount,structuralVertexCount:level.structuralVertexCount,structuralTriangleCount:level.structuralTriangleCount,faceFeatures:level.faceFeatures,cellM:level.cellM,grid:level.grid};
    const {source:discardedSource,...lean}=packed;
    const payload:FaunaPackedRenderPayload={...lean,sourceGeometry:geometry,sourcePlan:source.plan,individualId:job.individualId,key:job.key,context:{...job.context},providerVersion:provider.version};
    const borrowed=new Set(arraysOf(source).map(a=>a.buffer));if(faunaPackedPayloadTransfers(payload).some(b=>borrowed.has(b)))throw new Error('packed fauna worker: borrowed source buffer in transfer payload');
    const byteLength=faunaPackedPayloadBytes(payload);
    if(byteLength>maxResultBytes)return {accepted:false,byteLength:0,appearanceVersion:FAUNA_PLANET_CRISP_RAW_PACKED_VERSION,payload:null,reason:'result exceeds pending byte capacity',sourceTypedBytes};
    return {accepted:true,byteLength,appearanceVersion:FAUNA_PLANET_CRISP_RAW_PACKED_VERSION,payload,sourceTypedBytes,
      workingSet:{sourceTypedBytes,floatBasisBytes:float.resources.extraCpuBytes,returnedTypedBytes:byteLength,note:'excludes reducer JS, caller clone, worker message clone, plan metadata and GPU/renderer allocations'}};
  }};
}
