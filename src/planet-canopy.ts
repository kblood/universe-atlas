import * as THREE from 'three';
import type {Body,V3} from './catalog.ts';
import {ForestImpostors} from './forest-impostor.ts';
import {ForestSlotAllocator,type ForestSlotRange} from './forest-slot-allocator.ts';
import {type ForestCensusPatch,FOREST_CENSUS_STRIDE} from './forest-census.ts';
import {type ForestPatchAddress,validateForestPatchAddress} from './forest-patch.ts';
import {treeQuaternion} from './tree-shape.ts';
import {quantizeForestCoverage} from './forest-coverage.ts';

const patchKey=(a:ForestPatchAddress)=>`${a.face}/${a.n}/${a.x}/${a.y}`;
export function forestCellPatchKey(id:string){const [face,n,x,y]=id.split('/').map(Number);return `${face}/${n}/${Math.floor(x/8)}/${Math.floor(y/8)}`;}
type Installed={address:ForestPatchAddress;range:ForestSlotRange;ids:string[];water:number};
type Request={id:number;keys:Set<string>};

/** Bounded host for complete census patches. prepare -> near ownership ->
 * finish is one render-frame transaction. Message callbacks only queue work. */
export class PlanetCanopy {
  readonly group=new THREE.Group();readonly renderer:ForestImpostors;
  private allocator:ForestSlotAllocator;
  private installed=new Map<string,Installed>();private slots=new Map<string,number>();
  private desired=new Map<string,ForestPatchAddress>();private order:string[]=[];
  private pending:ForestCensusPatch[]=[];private evictions:string[]=[];
  private retries=new Map<string,{attempts:number;after:number}>();
  private requestCursor=0;private retryWakeAt=Infinity;private selectionRetryAt=0;
  private worker:Worker|null=null;private ready=false;private disposed=false;
  private generation=0;private serial=0;private request:Request|null=null;
  private selection:{id:number;center:V3}|null=null;private context='';
  private water=NaN;private center=new THREE.Vector3(Infinity,Infinity,Infinity);
  private origin=new THREE.Vector3();private originReady=false;
  private bodyPositions:Float64Array;private heights:Float64Array;private waters:Float64Array;
  private rebase:{origin:THREE.Vector3;positions:Float32Array;cursor:number}|null=null;
  private seen=new Set<string>();private previous=new Set<string>();
  private position=new THREE.Vector3();private direction=new THREE.Vector3();
  private rotation=new THREE.Quaternion();private yaw=new THREE.Quaternion();
  private workerRestarts=0;private failures=0;private installedThisFrame=0;private installMs=0;private uploadBytes=0;
  private selectionMs=0;private selectionApplyMs=0;private capacityMisses=0;
  private nearPresentNotInCensus=0;private nearAbsentInCensus=0;
  private body:Body;
  constructor(body:Body,capacity=229376){
    this.body=body;this.allocator=new ForestSlotAllocator(capacity);this.renderer=new ForestImpostors(capacity);
    this.bodyPositions=new Float64Array(capacity*3);this.heights=new Float64Array(capacity);this.waters=new Float64Array(capacity);
    this.renderer.mesh.scale.setScalar(1/body.radiusM);this.group.add(this.renderer.mesh);this.group.name='Complete canonical canopy';this.group.visible=false;
  }
  private start(){
    if(this.disposed||typeof Worker==='undefined')return;
    try{
      const worker=new Worker(new URL('./forest-census-worker.ts',import.meta.url),{type:'module'});this.worker=worker;
      worker.onmessage=({data})=>{if(this.worker===worker){try{this.receive(data);}catch{this.failWorker(worker);}}};
      worker.onerror=e=>{e.preventDefault();this.failWorker(worker);};worker.onmessageerror=()=>this.failWorker(worker);
      this.configure();
    }catch{this.worker=null;this.failures++;}
  }
  private configure(){
    this.generation++;this.ready=false;this.context='';this.request=null;this.selection=null;this.pending=[];this.retries.clear();this.center.set(Infinity,Infinity,Infinity);
    this.requestCursor=0;this.retryWakeAt=Infinity;this.selectionRetryAt=0;
    this.worker?.postMessage({type:'configure',generation:this.generation,body:this.body,waterLevelM:this.water});
  }
  private failWorker(worker:Worker){
    if(this.worker!==worker)return;worker.terminate();this.worker=null;this.ready=false;this.request=null;this.selection=null;this.pending=[];this.failures++;
    if(this.workerRestarts<1){this.workerRestarts++;this.start();}
  }
  private receive(data:any){
    if(!data||!Number.isSafeInteger(data.generation))throw new Error('Invalid census response');
    if(data.generation!==this.generation)return;
    if(data.type==='ready'){
      if(typeof data.context!=='string'||data.context.length!==64||data.n!==Math.ceil(2*this.body.radiusM/18))throw new Error('Invalid census ready');
      this.ready=true;this.context=data.context;return;
    }
    if(data.type==='error'){
      if(data.phase==='configure'){if(this.worker)this.failWorker(this.worker);return;}
      if(data.phase==='selection'&&data.requestId===this.selection?.id){this.selection=null;this.selectionRetryAt=performance.now()+2000;this.failures++;return;}
      if(this.request&&data.requestId===this.request.id){
        // Completed replies have already left this set and remain installable.
        for(const key of this.request.keys){const attempts=(this.retries.get(key)?.attempts??0)+1,after=attempts>=3?Infinity:performance.now()+1000*2**attempts;
          this.retries.set(key,{attempts,after});this.retryWakeAt=Math.min(this.retryWakeAt,after);}
        this.request=null;this.failures++;
      }
      return;
    }
    if(data.context!==this.context)return;
    if(data.type==='selection'){
      const selection=this.selection;if(!selection||data.requestId!==selection.id)return;
      if(!(data.packed instanceof Float64Array)||data.packed.length%4||data.packed.length>32768*4)throw new Error('Invalid census selection');
      const started=performance.now(),desired=new Map<string,ForestPatchAddress>(),order:string[]=[];
      for(let i=0;i<data.packed.length;i+=4){
        const [face,n,x,y]=data.packed.subarray(i,i+4),address={face,n,x,y};validateForestPatchAddress(address);
        if(n!==Math.ceil(2*this.body.radiusM/18))throw new Error('Census selection grid mismatch');
        const key=patchKey(address);if(desired.has(key))throw new Error('Duplicate census patch');desired.set(key,address);order.push(key);
      }
      this.desired=desired;this.order=order;this.requestCursor=0;this.evictions=[...this.installed.keys()].filter(key=>!desired.has(key));
      for(const key of this.retries.keys())if(!desired.has(key))this.retries.delete(key);
      this.center.set(...selection.center);this.selection=null;this.selectionMs=data.selectionMs;this.selectionApplyMs=performance.now()-started;return;
    }
    const request=this.request;if(data.type!=='patches'||!request||data.requestId!==request.id)return;
    if(!Array.isArray(data.patches)||data.patches.length>8||this.pending.length+data.patches.length>64)throw new Error('Census queue limit');
    for(const p of data.patches as ForestCensusPatch[]){
      validateForestPatchAddress(p.address);const key=patchKey(p.address);
      const tested=Math.min(8,p.address.n-p.address.x*8)*Math.min(8,p.address.n-p.address.y*8);
      if(!request.keys.delete(key)||p.context!==this.context||!(p.records instanceof Float64Array)||p.records.length!==p.present*FOREST_CENSUS_STRIDE||
        !Number.isInteger(p.present)||p.present<0||p.present>64||p.testedCells!==tested||
        !Number.isInteger(p.candidates)||p.candidates<p.present||p.candidates>tested||!Number.isInteger(p.representatives)||p.representatives<0||p.representatives>p.present)throw new Error('Invalid census patch');
      const offsets=new Set<number>();let representatives=0;
      for(let i=0;i<p.records.length;i+=FOREST_CENSUS_STRIDE){
        const r=p.records.subarray(i,i+FOREST_CENSUS_STRIDE),offset=r[0];
        if(!Array.from(r).every(v=>Number.isFinite(Math.fround(v)))||!Number.isInteger(offset)||offset<0||offset>63||offsets.has(offset)||
          p.address.x*8+offset%8>=p.address.n||p.address.y*8+Math.floor(offset/8)>=p.address.n||
          Math.abs(Math.hypot(r[1],r[2],r[3])-1)>1e-6||r[4]<0||r[4]>=1||r[5]<10||r[5]>22||r[6]<0||r[6]>=Math.PI*2||![0,1].includes(r[8]))throw new Error('Invalid census record');
        offsets.add(offset);representatives+=r[8];
      }
      if(representatives!==p.representatives)throw new Error('Invalid census representative count');
      this.pending.push(p);
    }
    if(data.done){if(request.keys.size)throw new Error('Incomplete census batch');this.request=null;}
  }
  private remove(key:string){
    const patch=this.installed.get(key);if(!patch)return 0;
    for(let i=0;i<patch.ids.length;i++){
      const index=patch.range.start+i;this.slots.delete(patch.ids[i]);
      this.renderer.write(index,this.position.set(0,0,0),0,this.rotation.identity(),0,0);
      if(this.rebase)this.rebase.positions.fill(0,index*4,index*4+4);
    }
    this.allocator.free(patch.range);this.installed.delete(key);return patch.ids.length;
  }
  private install(patch:ForestCensusPatch){
    const key=patchKey(patch.address);if(!this.desired.has(key))return;
    const range=this.allocator.allocate(patch.present);
    if(!range){const after=performance.now()+1000;this.capacityMisses++;this.retries.set(key,{attempts:1,after});this.retryWakeAt=Math.min(this.retryWakeAt,after);return;}
    this.remove(key);const ids:string[]=[];
    for(let i=0;i<patch.present;i++){
      const r=patch.records.subarray(i*FOREST_CENSUS_STRIDE,(i+1)*FOREST_CENSUS_STRIDE),index=range.start+i,offset=r[0],a=patch.address;
      const id=`${a.face}/${a.n}/${a.x*8+offset%8}/${a.y*8+Math.floor(offset/8)}`;ids.push(id);this.slots.set(id,index);
      this.direction.set(r[1],r[2],r[3]);this.position.copy(this.direction).multiplyScalar(this.body.radiusM+r[7]);
      this.position.toArray(this.bodyPositions,index*3);this.heights[index]=r[7];this.waters[index]=this.water;
      if(this.rebase)this.rebase.positions.set([this.position.x-this.rebase.origin.x,this.position.y-this.rebase.origin.y,this.position.z-this.rebase.origin.z,r[5]],index*4);
      this.position.sub(this.origin);treeQuaternion(this.direction,r[6],this.rotation,this.yaw);
      this.renderer.write(index,this.position,r[5],this.rotation,r[4],r[7]);
    }
    this.installed.set(key,{address:patch.address,range,ids,water:this.water});this.retries.delete(key);this.installedThisFrame+=patch.present;
  }
  /** Call after the near render origin is chosen, before the near draw loop. */
  prepare(eye:THREE.Vector3,ground:V3,altitudeM:number,water:number,enabled:boolean,immersive:boolean,nearOrigin:THREE.Vector3){
    this.group.visible=enabled&&!immersive&&altitudeM<3500;this.installedThisFrame=0;this.installMs=0;this.uploadBytes=0;this.seen.clear();
    this.nearPresentNotInCensus=0;this.nearAbsentInCensus=0;
    if(!this.group.visible)return false;
    this.renderer.uniforms.treeRuntime.value=1;
    this.renderer.uniforms.treeAltitudeCoverage.value=1-THREE.MathUtils.smoothstep(altitudeM,3000,3500);
    this.renderer.uniforms.treeWater.value=water;this.renderer.uniforms.treeHasWater.value=Number(this.body.water>0);
    if(!this.originReady){this.origin.set(...ground).multiplyScalar(this.body.radiusM);this.originReady=true;}
    if(water!==this.water){this.water=water;if(this.worker){try{this.configure();}catch{this.failWorker(this.worker);}}}
    if(!this.worker&&this.failures===0)this.start();
    if(this.ready&&this.worker&&!this.selection&&performance.now()>=this.selectionRetryAt&&this.direction.set(...ground).distanceTo(this.center)*this.body.radiusM>150){
      this.selection={id:++this.serial,center:[...ground]};
      try{this.worker.postMessage({type:'select',generation:this.generation,requestId:this.selection.id,center:ground,rangeM:4500});}catch{this.failWorker(this.worker);}
    }
    const started=performance.now();let work=0;
    while(this.evictions.length&&work<512&&performance.now()-started<2){
      const key=this.evictions[this.evictions.length-1],count=this.installed.get(key)?.ids.length??0;if(count>512-work)break;
      this.evictions.pop();if(!this.desired.has(key))work+=Math.max(1,this.remove(key));
    }
    while(this.pending.length&&work<512&&performance.now()-started<2){
      const patch=this.pending[0],cost=Math.max(1,patch.present+(this.installed.get(patchKey(patch.address))?.ids.length??0));if(cost>512-work)break;
      this.pending.shift();this.install(patch);work+=cost;
    }
    this.installMs=performance.now()-started;
    if(!this.rebase&&this.position.copy(eye).multiplyScalar(this.body.radiusM).distanceTo(this.origin)>8000){
      this.rebase={origin:this.position.clone(),positions:new Float32Array(this.renderer.positions.array.length),cursor:0};
    }
    if(this.rebase){
      const r=this.rebase,started=performance.now();let count=0;
      while(r.cursor<this.renderer.mesh.geometry.instanceCount&&count++<2048&&performance.now()-started<2){
        const index=r.cursor++,height=this.renderer.positions.getW(index);
        if(height>0)r.positions.set([this.bodyPositions[index*3]-r.origin.x,this.bodyPositions[index*3+1]-r.origin.y,this.bodyPositions[index*3+2]-r.origin.z,height],index*4);
      }
      if(r.cursor>=this.renderer.mesh.geometry.instanceCount){this.origin.copy(r.origin);this.uploadBytes+=this.renderer.replacePositions(r.positions);this.rebase=null;}
    }
    this.group.position.copy(this.origin).multiplyScalar(1/this.body.radiusM).sub(nearOrigin);
    if(this.ready&&this.worker&&!this.request&&!this.pending.length&&!this.selection){
      const now=performance.now(),addresses:ForestPatchAddress[]=[];
      if(now>=this.retryWakeAt){this.requestCursor=0;this.retryWakeAt=Infinity;}
      while(this.requestCursor<this.order.length&&addresses.length<64){
        const key=this.order[this.requestCursor++];if(this.installed.get(key)?.water===water)continue;
        const after=this.retries.get(key)?.after??0;if(after>now){this.retryWakeAt=Math.min(this.retryWakeAt,after);continue;}
        addresses.push(this.desired.get(key)!);
      }
      if(addresses.length){this.request={id:++this.serial,keys:new Set(addresses.map(patchKey))};
        try{this.worker.postMessage({type:'patches',generation:this.generation,requestId:this.request.id,addresses});}catch{this.failWorker(this.worker);}}
    }
    return true;
  }
  currentPatch(key:string){return this.group.visible&&this.installed.get(key)?.water===this.water;}
  canHandoff(id:string,height:number){const index=this.slots.get(id);return this.group.visible&&index!==undefined&&this.waters[index]===this.water&&Math.abs(this.heights[index]-height)<1e-6;}
  noteNear(id:string,key:string,present:boolean,water:number){
    if(!this.group.visible)return;
    if(water===this.water&&this.currentPatch(key)){
      if(present&&!this.slots.has(id))this.nearPresentNotInCensus++;
      if(!present&&this.slots.has(id))this.nearAbsentInCensus++;
    }
    if(!present&&water===this.water)this.own(id,1);
  }
  own(id:string,coverage:number){
    if(!this.group.visible)return;const index=this.slots.get(id);if(index===undefined)return;
    this.renderer.setOwnership(index,quantizeForestCoverage(coverage));this.seen.add(id);
  }
  finish(){
    if(!this.group.visible)return;
    for(const id of this.previous)if(!this.seen.has(id)){const index=this.slots.get(id);if(index!==undefined)this.renderer.setOwnership(index,0);}
    const old=this.previous;this.previous=this.seen;this.seen=old;this.uploadBytes+=this.renderer.commit();
  }
  diagnostics(){return {enabled:this.group.visible,ready:this.ready,context:this.context,generation:this.generation,patches:this.installed.size,trees:this.slots.size,
    selectedPatches:this.order.length,queuedPatches:this.pending.length,jobsInFlight:Number(!!this.request),selectionPending:!!this.selection,
    installedThisFrame:this.installedThisFrame,installMs:this.installMs,selectionMs:this.selectionMs,selectionApplyMs:this.selectionApplyMs,uploadBytes:this.uploadBytes,
    failures:this.failures,workerRestarts:this.workerRestarts,capacityMisses:this.capacityMisses,slots:this.allocator.diagnostics(),rebasePending:!!this.rebase,
    nearPresentNotInCensus:this.nearPresentNotInCensus,nearAbsentInCensus:this.nearAbsentInCensus};}
  dispose(){this.disposed=true;this.worker?.terminate();this.worker=null;this.renderer.dispose();this.installed.clear();this.slots.clear();this.pending=[];this.group.removeFromParent();}
}
