import * as planet from '#creature-kit/planet';
import {createFaunaPackedWorkerAdapter,faunaPackedPayloadTransfers} from './fauna-packed-worker-adapter.ts';
import type {FaunaLodBuildJob} from './fauna-lod-controller.ts';
const worker=self as unknown as DedicatedWorkerGlobalScope;
worker.onmessage=async({data}:{data:{job:FaunaLodBuildJob;basisStorage:'float32'|'packed-snorm16';providerVersion:string}})=>{
  let source=data.job.loadedSource;
  try{
    const provider={version:data.providerVersion,
      quadrupedBodyBuildSteps:planet.quadrupedBodyBuildSteps,
      createQuadrupedBodyPatternSampler(body:Parameters<typeof planet.createQuadrupedBodyPatternSampler>[0],options:{rawLayers:true}){source=body as typeof source;return planet.createQuadrupedBodyPatternSampler(body,options);}};
    const adapter=createFaunaPackedWorkerAdapter(provider,{basisStorage:data.basisStorage});
    const result=await adapter.build(data.job,new AbortController().signal);
    let sourceDigest:string|null=null;
    if(source){
      const arrays=[source.positions,source.normals,source.colors,source.skinIndex,source.skinWeight,source.index],buffer=new Uint8Array(arrays.reduce((n,a)=>n+a.byteLength,0));let offset=0;
      for(const array of arrays){buffer.set(new Uint8Array(array.buffer,array.byteOffset,array.byteLength),offset);offset+=array.byteLength;}
      sourceDigest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),b=>b.toString(16).padStart(2,'0')).join('');
    }
    const enriched={...result,sourceDigest};worker.postMessage({key:data.job.key,result:enriched},result.payload?faunaPackedPayloadTransfers(result.payload):[]);
  }catch(error){worker.postMessage({key:data.job.key,error:String(error)});}
};
