import type {Body,V3} from './catalog.ts';
import type {RiverRegion} from './river-types.ts';
/** One cancellable worker owner; a departed view cannot accept a late result. */
export class RiverPreparation {
 readonly result:Promise<{region:RiverRegion;buildMs:number}>;
 private worker:Worker|null=null;
 private timer:ReturnType<typeof setTimeout>|undefined;
 private settled=false;
 private reject!:(error:Error)=>void;
 constructor(body:Body,parentId:string,preferredSun?:V3){
  this.result=new Promise((resolve,reject)=>{
   this.reject=reject;
   try{
    this.worker=new Worker(new URL('./river-worker.ts',import.meta.url),{type:'module'});
    this.worker.onmessage=({data})=>{
     if(this.settled)return;
     if(data.error){this.finish(new Error(data.error));return;}
     if(data.result?.bodyId!==body.id||data.result?.bodySeed!==body.seed||(parentId!=='auto'&&data.result?.parentCatchmentId!==parentId)){this.finish(new Error('River worker returned a different address.'));return;}
     this.settled=true;this.cleanup();resolve({region:data.result,buildMs:data.buildMs});
    };
    this.worker.onerror=event=>{event.preventDefault();this.finish(new Error(event.message||'River worker failed.'));};
    this.timer=setTimeout(()=>this.finish(new Error('River generation timed out. You can retry.')),60000);
    this.worker.postMessage({body:{...body,hydrology:undefined},parentId,preferredSun});
   }catch(error){this.finish(error instanceof Error?error:new Error(String(error)));}
  });
 }
 private cleanup(){if(this.timer)clearTimeout(this.timer);this.worker?.terminate();this.worker=null;}
 private finish(error:Error){if(this.settled)return;this.settled=true;this.cleanup();this.reject(error);}
 cancel(){this.finish(new Error('River preparation cancelled after leaving this view.'));}
}
