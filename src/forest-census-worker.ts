import {createForestCensus,type ForestCensus,type ForestCensusPatch} from './forest-census.ts';
import {validateForestPatchAddress,type ForestPatchAddress} from './forest-patch.ts';

const MAX_BATCH_PATCHES=64,RESULT_BATCH=8,SLICE_MS=4,SLICE_CANDIDATES=8;
let generation=0,requestId=0,census:ForestCensus|null=null;
// A local MessageChannel yields to incoming worker messages without the nested
// setTimeout minimum-delay clamp throttling thousands of short census slices.
const wakeup=new MessageChannel();let scheduled=false;
wakeup.port1.onmessage=()=>{scheduled=false;tick();};
let job:{addresses:ForestPatchAddress[];index:number;active:boolean;results:ForestCensusPatch[];started:number;slices:number;maxSliceMs:number}|null=null;
function cancel(){job=null;census?.cancelActive();}
function fail(error:unknown,phase='request',details:Record<string,unknown>={}){
  cancel();self.postMessage({type:'error',phase,generation,requestId,context:census?.context??null,error:String(error),...details});
}
function flush(running:NonNullable<typeof job>,source:ForestCensus,done:boolean){
  const patches=running.results;running.results=[];
  self.postMessage({type:'patches',generation,requestId,context:source.context,patches,done,
    elapsedMs:performance.now()-running.started,slices:running.slices,maxSliceMs:running.maxSliceMs,cache:source.diagnostics()},
    patches.map(patch=>patch.records.buffer));
}
function schedule(){if(!scheduled){scheduled=true;wakeup.port2.postMessage(null);}}
function tick(){
  const running=job,source=census;if(!running||!source)return;
  const started=performance.now();
  try{
    for(let steps=0;steps<64&&running.index<running.addresses.length;steps++){
      let result:ForestCensusPatch|null=null;
      if(!running.active){result=source.start(running.addresses[running.index]);running.active=!result;}
      if(!result)result=source.step(SLICE_CANDIDATES);
      if(result){running.results.push(result);running.index++;running.active=false;}
      if(running.results.length>=RESULT_BATCH||performance.now()-started>=SLICE_MS)break;
    }
    running.slices++;running.maxSliceMs=Math.max(running.maxSliceMs,performance.now()-started);
    const done=running.index===running.addresses.length;
    if(running.results.length>=RESULT_BATCH||done){
      flush(running,source,done);
    }
    if(done)job=null;else schedule();
  }catch(error){
    // Complete patches are still authoritative. Terminate this batch and name
    // its failed patch, so a host can retain successes and isolate the failure.
    if(running.results.length)flush(running,source,false);
    fail(error,'request',{address:running.addresses[running.index]??null,index:running.index});
  }
}
self.onmessage=async({data})=>{
  // Malformed envelopes never cancel or impersonate an unrelated valid job.
  try{
    if(!data||!Number.isSafeInteger(data.generation)||data.generation<1)throw new Error('Invalid census generation');
    if(!['configure','patches','cancel'].includes(data.type))throw new Error('Invalid census message type');
    if(data.type!=='configure'&&(!Number.isSafeInteger(data.requestId)||data.requestId<1))throw new Error('Invalid census request');
  }catch(error){
    self.postMessage({type:'error',phase:'protocol',generation,requestId:null,error:String(error)});return;
  }
  try{
    if(data.type==='configure'){
      if(data.generation<=generation)return;
      cancel();generation=data.generation;requestId=0;census=null;
      const ownGeneration=generation;let source:ForestCensus;
      try{source=await createForestCensus(data.body,data.waterLevelM);}
      catch(error){if(ownGeneration===generation)fail(error,'configure');return;}
      if(ownGeneration!==generation)return;
      census=source;self.postMessage({type:'ready',generation,context:source.context,n:source.n});return;
    }
    if(data.generation!==generation){
      if(data.generation>generation&&data.type==='patches')self.postMessage({type:'error',phase:'request',generation:data.generation,
        requestId:data.requestId,context:null,error:'Forest census is not configured for this generation'});
      return;
    }
    if(data.type==='cancel'){
      if(data.requestId!==requestId||!job)return;
      cancel();self.postMessage({type:'cancelled',generation,requestId,context:census?.context??null});return;
    }
    if(data.requestId<=requestId)return;
    // A newer valid envelope implicitly supersedes the previous request,
    // including when its batch content is subsequently rejected.
    cancel();
    requestId=data.requestId;
    if(!census)throw new Error('Forest census is not configured');
    if(!Array.isArray(data.addresses)||data.addresses.length>MAX_BATCH_PATCHES)throw new Error('Forest census batch limit exceeded');
    const addresses:ForestPatchAddress[]=data.addresses.map((address:ForestPatchAddress)=>{
      validateForestPatchAddress(address);if(address.n!==census!.n)throw new Error('Forest census grid mismatch');return {...address};
    });
    job={addresses,index:0,active:false,results:[],started:performance.now(),slices:0,maxSliceMs:0};schedule();
  }catch(error){fail(error);}
};
