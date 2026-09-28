import * as THREE from 'three';
import type {Body,V3} from './catalog.ts';
import {ForestImpostors,type ForestFamilyPresentation} from './forest-impostor.ts';
import type {ForestTreeKind} from './forest-tree-family-library.ts';
import {ForestSlotAllocator,type ForestSlotRange} from './forest-slot-allocator.ts';
import {type ForestCensusPatch,FOREST_CENSUS_STRIDE} from './forest-census.ts';
import {type ForestPatchAddress,validateForestPatchAddress} from './forest-patch.ts';
import {treeQuaternion} from './tree-shape.ts';
import {quantizeForestCoverage} from './forest-coverage.ts';
import {LEGACY_TREE_BOUND} from './tree-shape.ts';
import {PLANET_DETAIL} from './planet-detail.ts';
import {forestWaterIntervalContains,validForestWaterInterval,type ForestWaterInterval} from './forest-water-validity.ts';

const patchKey=(a:ForestPatchAddress)=>`${a.face}/${a.n}/${a.x}/${a.y}`;
export function forestCellPatchKey(id:string){const [face,n,x,y]=id.split('/').map(Number);return `${face}/${n}/${Math.floor(x/8)}/${Math.floor(y/8)}`;}
type Installed={address:ForestPatchAddress;range:ForestSlotRange;ids:string[];water:number;family:string|null;waterInterval?:ForestWaterInterval};
type Request={id:number;keys:Set<string>;progressAt:number};
type SelectionApply={packed:Float64Array;offset:number;desired:Map<string,ForestPatchAddress>;order:string[];
  phase:'addresses'|'evictions'|'retries';iterator:MapIterator<string>|null;evictions:string[];workMs:number;workerMs:number};

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
  private selection:{id:number;center:V3;started:number}|null=null;private context='';
  private selectionApply:SelectionApply|null=null;private selectionApplySliceMs=0;
  private family:string|null=null;private reuse:MapIterator<Installed>|null=null;private reusedPatches=0;
  private configuredAt=0;private terminalFailure=false;private timeouts=0;
  private streaming=false;
  private water=NaN;private configuredWater=NaN;
  private configuredRivers:Body['canonicalRivers'];private configuredHydrology:Body['hydrology'];
  private center=new THREE.Vector3(Infinity,Infinity,Infinity);
  private origin=new THREE.Vector3();private originReady=false;
  private bodyPositions:Float64Array;private heights:Float64Array;
  private presentationVersions:Uint32Array;
  private presentationKey='';private presentationVersion=0;
  private presentationResolve:(id:string,heightM:number)=>number=()=>0;
  private presentationRetag:MapIterator<[string,number]>|null=null;
  private presentationRetagged=0;private presentationSliceMs=0;
  private rebase:{origin:THREE.Vector3;positions:Float32Array;cursor:number}|null=null;
  private seen=new Set<string>();private previous=new Set<string>();
  private position=new THREE.Vector3();private direction=new THREE.Vector3();
  private rotation=new THREE.Quaternion();private yaw=new THREE.Quaternion();
  private workerRestarts=0;private failures=0;private installedThisFrame=0;private installMs=0;private uploadBytes=0;
  private selectionMs=0;private selectionApplyMs=0;private capacityMisses=0;
  private nearPresentNotInCensus=0;private nearAbsentInCensus=0;
  private closeCandidates:string[]=[];private farForcedClose=0;
  // currentPatch is queried once in the near ownership gate and again inside
  // noteNear. Many canonical trees share each census patch, so keep this
  // read-only answer for the current prepare -> finish transaction.
  private frameCurrentPatches=new Map<string,boolean>();
  private patchLookupCacheHits=0;private patchLookupCacheMisses=0;
  private currentPatchVersion=0;
  private body:Body;
  private invalidateCurrentPatchAnswers(){this.currentPatchVersion++;}
  constructor(body:Body,capacity=229376){
    this.body=body;this.allocator=new ForestSlotAllocator(capacity);this.renderer=new ForestImpostors(capacity);
    this.bodyPositions=new Float64Array(capacity*3);this.heights=new Float64Array(capacity);
    this.presentationVersions=new Uint32Array(capacity);
    this.renderer.mesh.scale.setScalar(1/body.radiusM);this.group.add(this.renderer.mesh);this.group.name='Complete canonical canopy';this.group.visible=false;
  }
  /** The near owner supplies its existing dated catalogue and adopted library.
   * Replacement touches bounded parameter slices, never population identity. */
  setPresentation(key:string,resolve:(id:string,heightM:number)=>number,families:ReadonlyMap<ForestTreeKind,ForestFamilyPresentation>){
    if(key===this.presentationKey)return;
    this.presentationKey=key;this.presentationResolve=resolve;
    this.presentationVersion++;
    if(this.presentationVersion>0xffffffff){this.presentationVersions.fill(0);this.presentationVersion=1;}
    this.renderer.setFamilyPresentation('branching',families.get('branching')??null);
    this.renderer.setFamilyPresentation('spire',families.get('spire')??null);
    this.presentationRetag=this.slots.entries();this.presentationRetagged=0;
  }
  private tagPresentation(id:string,index:number){
    if(this.presentationVersions[index]===this.presentationVersion)return;
    this.renderer.setPresentation(index,this.presentationResolve(id,this.renderer.positions.getW(index)));
    this.presentationVersions[index]=this.presentationVersion;this.presentationRetagged++;
  }
  private start(){
    if(this.disposed||typeof Worker==='undefined')return;
    try{
      const worker=new Worker(new URL('./forest-census-worker.ts',import.meta.url),{type:'module'});this.worker=worker;
      worker.onmessage=({data})=>{if(this.worker===worker){try{this.receive(data);}catch{this.failWorker(worker);}}};
      worker.onerror=e=>{e.preventDefault();this.failWorker(worker);};worker.onmessageerror=()=>this.failWorker(worker);
      this.configure(true);
    }catch{this.worker=null;this.failures++;this.terminalFailure=true;this.streaming=false;this.group.visible=false;this.invalidateCurrentPatchAnswers();}
  }
  private configure(forceBody=false){
    const sameBody=this.configuredRivers===this.body.canonicalRivers&&this.configuredHydrology===this.body.hydrology;
    const family=!forceBody&&sameBody?this.family:null;
    this.configuredWater=this.water;this.configuredRivers=this.body.canonicalRivers;this.configuredHydrology=this.body.hydrology;
    this.generation++;this.configuredAt=performance.now();this.ready=false;this.context='';this.request=null;this.selection=null;this.selectionApply=null;this.pending=[];this.retries.clear();this.reuse=null;this.reusedPatches=0;this.invalidateCurrentPatchAnswers();
    // Patch addresses depend on position, not water. Keep the existing window.
    if(!this.order.length)this.center.set(Infinity,Infinity,Infinity);
    this.requestCursor=0;this.retryWakeAt=Infinity;this.selectionRetryAt=0;
    this.worker?.postMessage({type:'configure',generation:this.generation,...(family?{family}:{body:this.body}),waterLevelM:this.configuredWater});
  }
  private failWorker(worker:Worker){
    if(this.worker!==worker)return;worker.terminate();this.worker=null;this.ready=false;this.request=null;this.selection=null;this.selectionApply=null;this.pending=[];this.reuse=null;this.failures++;this.invalidateCurrentPatchAnswers();
    if(this.workerRestarts<1){this.workerRestarts++;this.start();}
    else{this.terminalFailure=true;this.streaming=false;this.group.visible=false;}
  }
  private receive(data:any){
    if(!data||!Number.isSafeInteger(data.generation))throw new Error('Invalid census response');
    if(data.generation!==this.generation)return;
    if(data.type==='ready'){
      if(typeof data.context!=='string'||data.context.length!==64||data.n!==Math.ceil(2*this.body.radiusM/18))throw new Error('Invalid census ready');
      if(data.family!==undefined&&(typeof data.family!=='string'||!/^[a-f0-9]{64}$/.test(data.family)))throw new Error('Invalid census family');
      this.ready=true;this.context=data.context;this.family=data.family??null;this.invalidateCurrentPatchAnswers();
      this.reuse=this.family?this.installed.values():null;return;
    }
    if(data.type==='error'){
      if(data.phase==='configure'){if(this.worker)this.failWorker(this.worker);return;}
      if(data.phase==='selection'&&data.requestId===this.selection?.id){this.selection=null;this.selectionApply=null;this.selectionRetryAt=performance.now()+2000;this.failures++;return;}
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
      if(!(data.packed instanceof Float64Array)||data.packed.length%4||data.packed.length>32768*4||!Number.isFinite(data.selectionMs)||data.selectionMs<0)throw new Error('Invalid census selection');
      if(!this.selectionApply)this.selectionApply={packed:data.packed,offset:0,desired:new Map(),order:[],phase:'addresses',iterator:null,evictions:[],workMs:0,workerMs:data.selectionMs};
      selection.started=performance.now();return;
    }
    const request=this.request;if(data.type!=='patches'||!request||data.requestId!==request.id)return;
    request.progressAt=performance.now();
    if(!Array.isArray(data.patches)||data.patches.length>8||this.pending.length+data.patches.length>64)throw new Error('Census queue limit');
    for(const p of data.patches as ForestCensusPatch[]){
      validateForestPatchAddress(p.address);const key=patchKey(p.address);
      const tested=Math.min(8,p.address.n-p.address.x*8)*Math.min(8,p.address.n-p.address.y*8);
      if(!request.keys.delete(key)||p.context!==this.context||!(p.records instanceof Float64Array)||p.records.length!==p.present*FOREST_CENSUS_STRIDE||
        !Number.isInteger(p.present)||p.present<0||p.present>64||p.testedCells!==tested||
        !Number.isInteger(p.candidates)||p.candidates<p.present||p.candidates>tested||!Number.isInteger(p.representatives)||p.representatives<0||p.representatives>p.present)throw new Error('Invalid census patch');
      if(p.waterInterval!==undefined&&(!validForestWaterInterval(p.waterInterval)||!forestWaterIntervalContains(p.waterInterval,this.configuredWater)))throw new Error('Invalid census water interval');
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
  private applySelectionSlice(started:number){
    const apply=this.selectionApply,selection=this.selection;if(!apply||!selection)return;
    const sliceStart=performance.now();let steps=0;
    while(steps++<512&&performance.now()-started<2){
      if(apply.phase==='addresses'){
        if(apply.offset<apply.packed.length){
          const i=apply.offset,a=apply.packed,address={face:a[i],n:a[i+1],x:a[i+2],y:a[i+3]};validateForestPatchAddress(address);
          if(address.n!==Math.ceil(2*this.body.radiusM/18))throw new Error('Census selection grid mismatch');
          const key=patchKey(address);if(apply.desired.has(key))throw new Error('Duplicate census patch');
          apply.desired.set(key,address);apply.order.push(key);apply.offset+=4;continue;
        }
        apply.phase='evictions';apply.iterator=this.installed.keys();
      }
      if(apply.phase==='evictions'){
        const next=apply.iterator!.next();if(!next.done){if(!apply.desired.has(next.value))apply.evictions.push(next.value);continue;}
        apply.phase='retries';apply.iterator=this.retries.keys();
      }
      const next=apply.iterator!.next();if(!next.done){if(!apply.desired.has(next.value))this.retries.delete(next.value);continue;}
      this.desired=apply.desired;this.order=apply.order;this.evictions=apply.evictions;this.requestCursor=0;
      this.center.set(...selection.center);this.selectionMs=apply.workerMs;this.selection=null;this.selectionApply=null;break;
    }
    this.selectionApplySliceMs=performance.now()-sliceStart;apply.workMs+=this.selectionApplySliceMs;
    this.selectionApplyMs=apply.workMs;selection.started=performance.now();
  }
  private remove(key:string){
    const patch=this.installed.get(key);if(!patch)return 0;
    for(let i=0;i<patch.ids.length;i++){
      const index=patch.range.start+i;this.slots.delete(patch.ids[i]);
      this.renderer.retire(index);
      this.presentationVersions[index]=0;
      if(this.rebase)this.rebase.positions.fill(0,index*4,index*4+4);
    }
    this.allocator.free(patch.range);this.installed.delete(key);this.invalidateCurrentPatchAnswers();return patch.ids.length;
  }
  private install(patch:ForestCensusPatch){
    const key=patchKey(patch.address);if(!this.desired.has(key))return;
    if(this.selectionApply&&this.selectionApply.phase!=='addresses'&&!this.selectionApply.desired.has(key))return;
    let range=this.allocator.allocate(patch.present);
    // A full cache must not pin stale water patches forever. Retire and retry
    // within this same frame transaction; if it still cannot fit, that entire
    // patch becomes missing and the existing near/legacy path remains owner.
    if(!range&&this.installed.has(key)){
      this.remove(key);range=this.allocator.allocate(patch.present);
    }
    if(!range){const after=performance.now()+1000;this.capacityMisses++;this.retries.set(key,{attempts:1,after});this.retryWakeAt=Math.min(this.retryWakeAt,after);return;}
    this.remove(key);const ids:string[]=[];
    for(let i=0;i<patch.present;i++){
      const r=patch.records.subarray(i*FOREST_CENSUS_STRIDE,(i+1)*FOREST_CENSUS_STRIDE),index=range.start+i,offset=r[0],a=patch.address;
      const id=`${a.face}/${a.n}/${a.x*8+offset%8}/${a.y*8+Math.floor(offset/8)}`;ids.push(id);this.slots.set(id,index);
      this.direction.set(r[1],r[2],r[3]);this.position.copy(this.direction).multiplyScalar(this.body.radiusM+r[7]);
      this.position.toArray(this.bodyPositions,index*3);this.heights[index]=r[7];
      if(this.rebase)this.rebase.positions.set([this.position.x-this.rebase.origin.x,this.position.y-this.rebase.origin.y,this.position.z-this.rebase.origin.z,r[5]],index*4);
      this.position.sub(this.origin);treeQuaternion(this.direction,r[6],this.rotation,this.yaw);
      this.renderer.write(index,this.position,r[5],this.rotation,r[4],r[7]);
      this.presentationVersions[index]=0;this.tagPresentation(id,index);
    }
    this.installed.set(key,{address:patch.address,range,ids,water:this.configuredWater,family:this.family,waterInterval:patch.waterInterval});this.invalidateCurrentPatchAnswers();this.retries.delete(key);this.installedThisFrame+=patch.present;
  }
  /** Call after the near render origin is chosen, before the near draw loop. */
  prepare(eye:THREE.Vector3,ground:V3,altitudeM:number,water:number,enabled:boolean,immersive:boolean,nearOrigin:THREE.Vector3){
    if(!Number.isFinite(water))throw new Error('Canopy water level must be finite');
    this.frameCurrentPatches.clear();this.patchLookupCacheHits=0;this.patchLookupCacheMisses=0;
    const now=performance.now();
    if(this.worker&&(!this.ready&&now-this.configuredAt>10000||this.request&&now-this.request.progressAt>10000||this.selection&&!this.selectionApply&&now-this.selection.started>10000)){
      this.timeouts++;this.failWorker(this.worker);
    }
    const previousVisible=this.group.visible,previousWater=this.water;
    this.streaming=enabled&&!immersive&&!this.terminalFailure&&altitudeM<PLANET_DETAIL.forestStreamAltitudeM;
    this.group.visible=this.streaming&&altitudeM<PLANET_DETAIL.forestPrepareAltitudeM;
    if(previousVisible!==this.group.visible)this.invalidateCurrentPatchAnswers();
    this.installedThisFrame=0;this.installMs=0;this.uploadBytes=0;this.seen.clear();
    this.nearPresentNotInCensus=0;this.nearAbsentInCensus=0;this.closeCandidates.length=0;this.farForcedClose=0;
    if(!this.streaming)return false;
    this.renderer.uniforms.treeRuntime.value=1;
    this.renderer.uniforms.treeAltitudeCoverage.value=1-THREE.MathUtils.smoothstep(altitudeM,3000,3500);
    this.renderer.uniforms.treeWater.value=water;this.renderer.uniforms.treeHasWater.value=Number(this.body.water>0);
    if(!this.originReady){this.origin.set(...ground).multiplyScalar(this.body.radiusM);this.originReady=true;}
    this.water=water;if(previousWater!==water)this.invalidateCurrentPatchAnswers();
    const bodyChanged=this.configuredRivers!==this.body.canonicalRivers||this.configuredHydrology!==this.body.hydrology;
    // One configuration in flight. Target water still updates the shader every
    // frame; replies are validated against their configured water snapshot.
    if(this.worker&&this.ready&&(water!==this.configuredWater||bodyChanged)){try{this.configure();}catch{this.failWorker(this.worker);}}
    if(bodyChanged&&this.family!==null){this.family=null;this.invalidateCurrentPatchAnswers();}
    if(!this.worker&&this.failures===0)this.start();
    if(this.ready&&this.worker&&!this.selection&&performance.now()>=this.selectionRetryAt&&this.direction.set(...ground).distanceTo(this.center)*this.body.radiusM>150){
      this.selection={id:++this.serial,center:[...ground],started:performance.now()};
      try{this.worker.postMessage({type:'select',generation:this.generation,requestId:this.selection.id,center:ground,rangeM:4500});}catch{this.failWorker(this.worker);}
    }
    const started=performance.now();let work=0;this.selectionApplySliceMs=0;
    try{this.applySelectionSlice(started);}catch{if(this.worker)this.failWorker(this.worker);}
    // Retag only after the worker confirms the immutable body/version family.
    // Bound metadata work too; no tree transform/ownership writes are needed.
    while(this.reuse&&work<512&&performance.now()-started<2){
      const next=this.reuse.next();if(next.done){this.reuse=null;break;}work++;
      const patch=next.value;
      if(patch.water!==water&&patch.family===this.family&&forestWaterIntervalContains(patch.waterInterval,water)){
        patch.water=water;this.reusedPatches++;this.invalidateCurrentPatchAnswers();
      }
    }
    while(this.evictions.length&&work<512&&performance.now()-started<2){
      const key=this.evictions[this.evictions.length-1],count=this.installed.get(key)?.ids.length??0;if(count>512-work)break;
      this.evictions.pop();if(!this.desired.has(key))work+=Math.max(1,this.remove(key));
    }
    while(this.pending.length&&work<512&&performance.now()-started<2){
      const patch=this.pending[0],cost=Math.max(1,patch.present+(this.installed.get(patchKey(patch.address))?.ids.length??0));if(cost>512-work)break;
      this.pending.shift();this.install(patch);work+=cost;
    }
    this.installMs=performance.now()-started;
    // Nearby handoffs are updated on demand below. Other retained trees use a
    // bounded slice, so a dated catalogue/library change cannot block a frame.
    const presentationStarted=performance.now();let presentationCount=0;
    while(this.presentationRetag&&presentationCount++<2048&&performance.now()-presentationStarted<2){
      const next=this.presentationRetag.next();if(next.done){this.presentationRetag=null;break;}
      this.tagPresentation(next.value[0],next.value[1]);
    }
    this.presentationSliceMs=performance.now()-presentationStarted;
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
    if(this.ready&&this.worker&&!this.request&&!this.pending.length&&!this.selection&&!this.reuse){
      const now=performance.now(),addresses:ForestPatchAddress[]=[];
      if(now>=this.retryWakeAt){this.requestCursor=0;this.retryWakeAt=Infinity;}
      let inspected=0;
      while(this.requestCursor<this.order.length&&addresses.length<64&&inspected++<512&&performance.now()-started<2){
        const key=this.order[this.requestCursor++],installed=this.installed.get(key);if(installed?.water===water&&installed.family===this.family)continue;
        const after=this.retries.get(key)?.after??0;if(after>now){this.retryWakeAt=Math.min(this.retryWakeAt,after);continue;}
        addresses.push(this.desired.get(key)!);
      }
      if(addresses.length){this.request={id:++this.serial,keys:new Set(addresses.map(patchKey)),progressAt:performance.now()};
        try{this.worker.postMessage({type:'patches',generation:this.generation,requestId:this.request.id,addresses});}catch{this.failWorker(this.worker);}}
    }
    return this.group.visible;
  }
  currentPatch(key:string){
    const cached=this.frameCurrentPatches.get(key);
    if(cached!==undefined){this.patchLookupCacheHits++;return cached;}
    this.patchLookupCacheMisses++;
    const patch=this.installed.get(key),current=this.group.visible&&this.ready&&patch?.water===this.water&&patch.family===this.family;
    this.frameCurrentPatches.set(key,current);return current;
  }
  currentPatchRevision(){return this.currentPatchVersion;}
  presentationSample(id:string){
    const index=this.slots.get(id);if(index===undefined)return null;
    return {id,heightM:this.renderer.positions.getW(index),groundHeightM:this.heights[index],code:this.renderer.parameters.getZ(index),
      current:this.presentationVersions[index]===this.presentationVersion,ownership:this.renderer.ownership.getX(index)};
  }
  canHandoff(id:string,height:number,key=forestCellPatchKey(id),treeHeightM?:number,presentationCode=0){
    const index=this.slots.get(id);
    // Canonical shape is independent of water. Matching roots may keep pairing
    // while current near absence/submersion suppresses obsolete far presence.
    if(!this.group.visible||index===undefined||this.installed.get(key)?.family!==this.family||Math.abs(this.heights[index]-height)>=1e-6)return false;
    this.tagPresentation(id,index);
    return (treeHeightM===undefined||Math.abs(this.renderer.positions.getW(index)-treeHeightM)<1e-5)&&
      this.presentationVersions[index]===this.presentationVersion&&this.renderer.parameters.getZ(index)===presentationCode;
  }
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
  /** Called for nearby canonical candidates, including unresolved near samples.
   * Only this bounded neighbourhood needs the exact rotated-bound check. */
  observeClose(id:string,eye:THREE.Vector3){
    if(!this.group.visible)return;const index=this.slots.get(id);if(index===undefined)return;
    const height=this.renderer.positions.getW(index);if(height<=0||this.body.water>0&&this.heights[index]<=this.water)return;
    this.rotation.fromArray(this.renderer.rotations.array,index*4);
    const familyRadius=this.renderer.familyBoundRadius(index);
    if(familyRadius>0)this.position.set(0,0,0);
    else this.position.fromArray(LEGACY_TREE_BOUND.center).multiplyScalar(height).applyQuaternion(this.rotation);
    this.position.x+=this.bodyPositions[index*3]-eye.x*this.body.radiusM;
    this.position.y+=this.bodyPositions[index*3+1]-eye.y*this.body.radiusM;
    this.position.z+=this.bodyPositions[index*3+2]-eye.z*this.body.radiusM;
    const radius=familyRadius>0?Math.sqrt(3)*familyRadius:Math.hypot(...LEGACY_TREE_BOUND.extent)*height;
    if(this.position.length()<=radius*1.1)this.closeCandidates.push(id);
  }
  finish(){
    if(!this.streaming)return;
    for(const id of this.previous)if(!this.seen.has(id)){const index=this.slots.get(id);if(index!==undefined)this.renderer.setOwnership(index,0);}
    const old=this.previous;this.previous=this.seen;this.seen=old;this.uploadBytes+=this.renderer.commit();
    const edge=quantizeForestCoverage(this.renderer.uniforms.treeAltitudeCoverage.value);
    for(const id of this.closeCandidates){const index=this.slots.get(id);if(index!==undefined&&this.renderer.ownership.array[index]<edge)this.farForcedClose++;}
  }
  diagnostics(){return {enabled:this.group.visible,streaming:this.streaming,ready:this.ready,water:this.water,configuredWater:this.configuredWater,context:this.context,family:this.family,reusedPatches:this.reusedPatches,reusePending:!!this.reuse,generation:this.generation,patches:this.installed.size,trees:this.slots.size,
    selectedPatches:this.order.length,queuedPatches:this.pending.length,jobsInFlight:Number(!!this.request),selectionPending:!!this.selection,
    installedThisFrame:this.installedThisFrame,installMs:this.installMs,selectionMs:this.selectionMs,selectionApplyMs:this.selectionApplyMs,selectionApplySliceMs:this.selectionApplySliceMs,selectionApplyPending:!!this.selectionApply,uploadBytes:this.uploadBytes,
    failures:this.failures,workerRestarts:this.workerRestarts,terminalFailure:this.terminalFailure,timeouts:this.timeouts,capacityMisses:this.capacityMisses,slots:this.allocator.diagnostics(),rebasePending:!!this.rebase,currentPatchRevision:this.currentPatchVersion,
    nearPresentNotInCensus:this.nearPresentNotInCensus,nearAbsentInCensus:this.nearAbsentInCensus,
    farForcedClose:this.farForcedClose,closeCandidateScope:'current near selection',
    presentation:{key:this.presentationKey,version:this.presentationVersion,pending:!!this.presentationRetag,retagged:this.presentationRetagged,sliceMs:this.presentationSliceMs,versionBytes:this.presentationVersions.byteLength},
    patchLookupCache:{hits:this.patchLookupCacheHits,misses:this.patchLookupCacheMisses,keys:this.frameCurrentPatches.size},
    attributeBytes:this.renderer.positions.array.byteLength+this.renderer.rotations.array.byteLength+this.renderer.parameters.array.byteLength+this.renderer.ownership.array.byteLength,
    retainedCoordinateBytes:this.bodyPositions.byteLength+this.heights.byteLength,
    rebaseBufferBytes:this.rebase?.positions.byteLength??0};}
  dispose(){this.disposed=true;this.invalidateCurrentPatchAnswers();this.group.visible=false;this.worker?.terminate();this.worker=null;this.renderer.dispose();this.installed.clear();this.slots.clear();this.pending=[];this.group.removeFromParent();}
}
