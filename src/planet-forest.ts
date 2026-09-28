import * as THREE from 'three';
import {createLegacyTreeGeometry as treeGeometry,treeQuaternion,LEGACY_TREE_BOUND} from './tree-shape.ts';
import {PlanetCanopy,forestCellPatchKey} from './planet-canopy.ts';
import {forestCoverageGLSL,quantizeForestCoverage} from './forest-coverage.ts';
import {type Body,type V3} from './catalog.ts';
import {terrainSampler} from './terrain.ts';
import {biomeClassifier} from './surface-biomes.ts';
import {forestPopulationCells,FAR_CROWN_PROBABILITY,type PopulationCell} from './planet-population.ts';
import {forestHabitat,TREE_HABITAT_VERSION} from './forest-habitat.ts';
import type {ForestSelectionCache} from './forest-selection-cache.ts';
import {unpackForestSelection} from './forest-selection-transfer.ts';
import {PLANET_DETAIL as B} from './planet-detail.ts';

type Resident={cell:PopulationCell;height:number;present:boolean;water:number;patchKey?:string};

/** Component ranges, not byte ranges. Preserve pending updates if a batch was
 * culled or hidden before Three uploaded it. Driver upload bytes are separate. */
class DirtyRange {
  private ranges:{start:number;end:number}[]=[];
  include(index:number,components:number){
    this.merge(index*components,(index+1)*components);
  }
  private merge(start:number,end:number){
    for(let i=this.ranges.length-1;i>=0;i--){
      const range=this.ranges[i];if(range.end<start||range.start>end)continue;
      start=Math.min(start,range.start);end=Math.max(end,range.end);this.ranges.splice(i,1);
    }
    this.ranges.push({start,end});this.ranges.sort((a,b)=>a.start-b.start);
    // Bound range submission overhead. Merge the closest gap, rather than
    // uploading the entire span between two unrelated changed tree slots.
    while(this.ranges.length>8){
      let closest=0;for(let i=1;i<this.ranges.length-1;i++)if(this.ranges[i+1].start-this.ranges[i].end<this.ranges[closest+1].start-this.ranges[closest].end)closest=i;
      this.ranges[closest].end=this.ranges[closest+1].end;this.ranges.splice(closest+1,1);
    }
  }
  flush(attribute:THREE.BufferAttribute){
    if(!this.ranges.length)return 0;
    for(const range of attribute.updateRanges)this.merge(range.start,range.start+range.count);
    attribute.clearUpdateRanges();let components=0;
    for(const range of this.ranges){attribute.addUpdateRange(range.start,range.end-range.start);components+=range.end-range.start;}
    attribute.needsUpdate=true;this.ranges.length=0;
    return components*attribute.array.BYTES_PER_ELEMENT;
  }
}
type BatchUpdates={residents:Resident[];originVersions:number[];slots:Map<string,number>;wanted:Resident[];wantedCoverage:number[];wantedIds:Set<string>;matrix:DirtyRange;color:DirtyRange;coverage:DirtyRange;seed:DirtyRange};
const batchUpdates=():BatchUpdates=>({residents:[],originVersions:[],slots:new Map(),wanted:[],wantedCoverage:[],wantedIds:new Set(),matrix:new DirtyRange(),color:new DirtyRange(),coverage:new DirtyRange(),seed:new DirtyRange()});
const crownBoundRadius=Math.hypot(...LEGACY_TREE_BOUND.extent)+Math.hypot(LEGACY_TREE_BOUND.center[0],LEGACY_TREE_BOUND.center[2]);

/** Screen-door coverage changes visibility without shrinking a physical tree.
 * alphaHash preserves opaque depth testing and avoids sorted transparent forests. */
function forestMaterial(vertexColors:boolean){
  const material=new THREE.MeshLambertMaterial({vertexColors,color:vertexColors?0xffffff:0x456c28});
  material.onBeforeCompile=shader=>{
    shader.vertexShader='attribute float instanceCoverage,instanceForestSeed;\nflat varying float vForestCoverage,vForestSeed;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvForestCoverage=instanceCoverage;vForestSeed=instanceForestSeed;');
    shader.fragmentShader='flat varying float vForestCoverage,vForestSeed;\n'+forestCoverageGLSL+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <alphahash_fragment>',`#ifdef USE_ALPHAHASH
      diffuseColor.a *= vForestCoverage;
      #include <alphahash_fragment>
      #else
      if(atlasForestHash(uint(vForestSeed+.5))>=atlasForestLevel(vForestCoverage))discard;
      #endif`);
  };
  material.customProgramCacheKey=()=>`forest-coverage-2/${vertexColors}`;return material;
}

/** Bounded placement queue + retained habitat cache. Flight and walking call
 * the same update. Work begins above visible range; no landing flag exists. */
export class PlanetForest {
  readonly group=new THREE.Group();
  private meshes:THREE.InstancedMesh[];
  private canopy:THREE.InstancedMesh;
  private cache=new Map<string,Resident>();
  private wanted:PopulationCell[]=[];
  private queue:PopulationCell[]=[];
  private center=new THREE.Vector3(Infinity,Infinity,Infinity);
  private coverage:THREE.InstancedBufferAttribute[]=[];
  private canopyCoverage!:THREE.InstancedBufferAttribute;
  private retainedNear=new Set<string>();
  private retainedMiddle=new Set<string>();
  private fullCanopy:PlanetCanopy|null=null;
  private immersiveMaterial=false;
  private origin=new THREE.Vector3();
  private originReady=false;
  private originVersion=0;
  private updates:BatchUpdates[]=[batchUpdates(),batchUpdates(),batchUpdates()];
  private sample:ReturnType<typeof terrainSampler>;
  private classify:ReturnType<typeof biomeClassifier>;
  private habitat:ReturnType<typeof forestHabitat>;
  private water=NaN;
  private matrix=new THREE.Matrix4();
  private position=new THREE.Vector3();
  private scale=new THREE.Vector3();
  private quaternion=new THREE.Quaternion();
  private yaw=new THREE.Quaternion();
  private direction=new THREE.Vector3();
  private color=new THREE.Color();
  private bounds=new THREE.Sphere();
  private worker:Worker|null=null;
  private selecting=false;
  private selectionRequest=0;
  private selectionDirection:V3|null=null;
  private workerRestarts=0;
  private workerFailures=0;
  private selectionApplyMs=0;
  private selectionTransfer:{bytes:number;cells:number;packMs:number;decodeMs:number}|null=null;
  private selectionCacheStats:ReturnType<ForestSelectionCache['diagnostics']>|null=null;
  private applySelection(direction:V3,cells:PopulationCell[],selectionMs:number){
    const started=performance.now();
    this.center.set(...direction);this.wanted=cells;
    const incoming=new Set(cells.map(c=>c.id));for(const id of this.retainedNear)if(!incoming.has(id))this.retainedNear.delete(id);
    for(const id of this.retainedMiddle)if(!incoming.has(id))this.retainedMiddle.delete(id);
    this.queue=this.wanted.filter(cell=>this.cache.get(cell.id)?.water!==this.water);
    if(this.cache.size+this.queue.length>B.populationCacheLimit){
      const keep=new Set(this.wanted.map(c=>c.id));
      for(const id of this.cache.keys())if(!keep.has(id))this.cache.delete(id);
    }
    this.selectionMs=selectionMs;this.selecting=false;this.selectionDirection=null;
    this.selectionApplyMs=performance.now()-started;
  }
  visibleTrees=0;nearTrees=0;placementMs=0;selectionMs=0;
  private matrixWrites=0;
  private colorWrites=0;
  private coverageWrites=0;
  private scheduledUploadBytes=0;
  private updateMs=0;
  private farOwnedSkipped=0;
  private originRebased=false;
  constructor(private body:Body){
    this.sample=terrainSampler(body);this.classify=biomeClassifier(body);
    this.habitat=forestHabitat(this.sample,this.classify,body.radiusM);
    this.meshes=[B.forestNearCapacity,B.forestCapacity].map((capacity,i)=>{
      const mesh=new THREE.InstancedMesh(treeGeometry(i===0?1:0),
        forestMaterial(true),capacity);
      const coverage=new THREE.InstancedBufferAttribute(new Float32Array(capacity),1);coverage.setUsage(THREE.DynamicDrawUsage);mesh.geometry.setAttribute('instanceCoverage',coverage);this.coverage.push(coverage);
      mesh.geometry.setAttribute('instanceForestSeed',new THREE.InstancedBufferAttribute(new Uint16Array(capacity),1).setUsage(THREE.DynamicDrawUsage));
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3).fill(1),3).setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled=false;mesh.count=0;
      this.group.add(mesh);return mesh;
    });
    this.canopy=new THREE.InstancedMesh(treeGeometry(0),forestMaterial(true),B.canopyCapacity);
    this.canopyCoverage=new THREE.InstancedBufferAttribute(new Float32Array(B.canopyCapacity),1);this.canopyCoverage.setUsage(THREE.DynamicDrawUsage);this.canopy.geometry.setAttribute('instanceCoverage',this.canopyCoverage);
    this.canopy.geometry.setAttribute('instanceForestSeed',new THREE.InstancedBufferAttribute(new Uint16Array(B.canopyCapacity),1).setUsage(THREE.DynamicDrawUsage));
    this.canopy.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.canopy.frustumCulled=false;this.canopy.count=0;
    this.canopy.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(B.canopyCapacity*3).fill(1),3).setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.canopy);this.group.name='Continuous planetary forest';
    if(typeof Worker!=='undefined'){this.fullCanopy=new PlanetCanopy(body);this.group.add(this.fullCanopy.group);this.startWorker();}
  }
  private startWorker(){
    try{
      const worker=new Worker(new URL('./planet-population-worker.ts',import.meta.url),{type:'module'});this.worker=worker;
      worker.onmessage=({data})=>{
        if(this.worker!==worker||!this.selecting)return;
        if(!data||!Number.isSafeInteger(data.requestId)){this.failWorker(worker);return;}
        if(data.requestId===this.selectionRequest){
          const started=performance.now();let cells:PopulationCell[];
          try{
            if(!this.selectionDirection||!Number.isFinite(data.selectionMs)||data.selectionMs<0||
              !Number.isFinite(data.packMs)||data.packMs<0)throw new Error('Invalid forest response metadata');
            cells=unpackForestSelection(data.packed);
          }catch{this.failWorker(worker);return;}
          this.selectionTransfer={bytes:data.packed.buffer.byteLength,cells:cells.length,packMs:data.packMs,decodeMs:performance.now()-started};
          // The main thread owns the requested centre; response metadata
          // cannot move it, and duplicate completed replies are ignored.
          // Application errors must surface as main-thread bugs, not use up
          // a worker restart or be silently converted into a fallback.
          this.selectionCacheStats=data.cache??null;this.applySelection(this.selectionDirection!,cells,data.selectionMs);
        }
      };
      worker.onerror=event=>{event.preventDefault();this.failWorker(worker);};
      worker.onmessageerror=()=>this.failWorker(worker);
    }catch{this.worker=null;this.selecting=false;this.workerFailures++;}
  }
  private failWorker(worker:Worker){
    if(this.worker!==worker)return;
    worker.terminate();this.worker=null;this.selectionCacheStats=null;this.selectionTransfer=null;this.selectionDirection=null;this.selecting=false;this.workerFailures++;this.selectionRequest++;
    if(this.workerRestarts<1){this.workerRestarts++;this.startWorker();}
  }
  /** Slots belong to resident IDs, not their current visibility/sort ordinal. */
  private writeInstance(batch:number,index:number,resident:Resident,coverage:number){
    const mesh=batch===2?this.canopy:this.meshes[batch],updates=this.updates[batch];
    const changed=updates.residents[index]!==resident;
    if(changed||updates.originVersions[index]!==this.originVersion){
      const {cell,height}=resident,r=this.body.radiusM;
      this.direction.set(...cell.direction);
      this.position.copy(this.direction).multiplyScalar(1+height/r).sub(this.origin);
      treeQuaternion(this.direction,cell.yaw,this.quaternion,this.yaw);
      this.scale.setScalar(cell.heightM/r);
      this.matrix.compose(this.position,this.quaternion,this.scale);mesh.setMatrixAt(index,this.matrix);
      updates.matrix.include(index,16);updates.originVersions[index]=this.originVersion;this.matrixWrites++;
    }
    if(changed){
      const roll=resident.cell.roll;
      this.color.setRGB(.8+roll*.2,.85+roll*.15,.75+roll*.25);mesh.setColorAt(index,this.color);
      updates.color.include(index,3);updates.residents[index]=resident;this.colorWrites++;
      const seed=mesh.geometry.getAttribute('instanceForestSeed') as THREE.InstancedBufferAttribute;seed.setX(index,Math.min(255,Math.floor(roll*256)));updates.seed.include(index,1);
    }
    const attribute=batch===2?this.canopyCoverage:this.coverage[batch],value=Math.fround(coverage);
    if(attribute.getX(index)!==value){attribute.setX(index,value);updates.coverage.include(index,1);this.coverageWrites++;}
  }
  private wantInstance(batch:number,resident:Resident,coverage:number){
    coverage=quantizeForestCoverage(coverage)/256;
    const updates=this.updates[batch];updates.wanted.push(resident);updates.wantedCoverage.push(coverage);updates.wantedIds.add(resident.cell.id);
    this.fullCanopy?.own(resident.cell.id,coverage);
  }
  private reconcileBatch(batch:number){
    const updates=this.updates[batch],mesh=batch===2?this.canopy:this.meshes[batch];
    const coverage=batch===2?this.canopyCoverage:this.coverage[batch];
    // A departure moves only the final resident into the hole. Reverse traversal
    // ensures that moved residents have already been checked for retention.
    for(let index=updates.residents.length-1;index>=0;index--){
      const resident=updates.residents[index];if(updates.wantedIds.has(resident.cell.id))continue;
      updates.slots.delete(resident.cell.id);
      const last=updates.residents.length-1;
      if(index!==last){
        const moved=updates.residents[last];this.writeInstance(batch,index,moved,coverage.getX(last));
        updates.slots.set(moved.cell.id,index);
      }
      updates.residents.pop();updates.originVersions.pop();
    }
    for(let i=0;i<updates.wanted.length;i++){
      const resident=updates.wanted[i];let index=updates.slots.get(resident.cell.id);
      if(index===undefined){index=updates.residents.length;updates.slots.set(resident.cell.id,index);}
      this.writeInstance(batch,index,resident,updates.wantedCoverage[i]);
    }
    mesh.count=updates.residents.length;
    this.scheduledUploadBytes+=updates.matrix.flush(mesh.instanceMatrix);
    if(mesh.instanceColor)this.scheduledUploadBytes+=updates.color.flush(mesh.instanceColor);
    this.scheduledUploadBytes+=updates.coverage.flush(coverage);
    this.scheduledUploadBytes+=updates.seed.flush(mesh.geometry.getAttribute('instanceForestSeed') as THREE.BufferAttribute);
  }
  update(eye:THREE.Vector3,groundDirection:V3,altitudeM:number,enabled:boolean,water:number,immersive:boolean,frusta:THREE.Frustum[]=[]){
    if(!Number.isFinite(water))throw new Error('Forest water level must be finite');
    const updateStarted=performance.now();
    this.group.visible=enabled&&altitudeM<B.forestStreamAltitudeM;
    this.visibleTrees=0;this.nearTrees=0;this.placementMs=0;this.selectionMs=0;
    this.matrixWrites=0;this.colorWrites=0;this.coverageWrites=0;this.scheduledUploadBytes=0;this.originRebased=false;this.updateMs=0;this.farOwnedSkipped=0;
    if(!this.group.visible){if(this.fullCanopy)this.fullCanopy.group.visible=false;return;}
    const draw=altitudeM<B.forestPrepareAltitudeM;
    for(const mesh of this.meshes)mesh.visible=draw;this.canopy.visible=draw;
    if(!draw){
      this.fullCanopy?.prepare(eye,groundDirection,altitudeM,water,enabled,immersive,this.origin);
      this.fullCanopy?.finish();this.updateMs=performance.now()-updateStarted;return;
    }
    if(immersive!==this.immersiveMaterial){
      this.immersiveMaterial=immersive;
      for(const mesh of [...this.meshes,this.canopy]){const material=mesh.material as THREE.MeshLambertMaterial;material.alphaHash=immersive;material.needsUpdate=true;}
    }
    if(water!==this.water){
      this.water=water;this.sample=terrainSampler(this.body,undefined,undefined,undefined,water);
      this.classify=biomeClassifier(this.body,water);
      this.habitat=forestHabitat(this.sample,this.classify,this.body.radiusM);
      // Selection depends only on identity/location, not water. Keep the single
      // in-flight job and resident trees while bounded habitat refresh replaces
      // them. Never queue another expensive selection on each playback bucket.
      this.queue=this.wanted.filter(cell=>this.cache.get(cell.id)?.water!==water);
    }
    const r=this.body.radiusM,ground=this.direction.set(...groundDirection);
    if(ground.distanceTo(this.center)*r>40&&!this.selecting){
      if(this.worker){
        const worker=this.worker;this.selecting=true;this.selectionDirection=[...groundDirection];
        try{worker.postMessage({requestId:++this.selectionRequest,seed:this.body.seed,direction:groundDirection,radiusM:r});}
        catch{this.failWorker(worker);}
      }else{
      const started=performance.now();
      const cells=forestPopulationCells(this.body.seed,groundDirection,r,B.forestFootprintM+100,B.canopyFootprintM,B.forestCellM);
      this.applySelection(groundDirection,cells,performance.now()-started);
      }
    }
    const started=performance.now();
    for(let count=0;this.queue.length&&count<B.placementSamplesPerFrame&&performance.now()-started<B.placementBudgetMs;count++){
      const cell=this.queue.shift()!,habitat=this.habitat(cell);
      this.cache.set(cell.id,{cell,height:habitat.groundHeightM,present:habitat.present,water});
    }
    this.placementMs=performance.now()-started;
    // Retain the anchor across ordinary movement so static tree matrices need
    // no rewrite. Rebase before Float32 conversion to preserve local precision.
    if(!this.originReady||this.origin.distanceTo(eye)*r>=B.forestOriginRebaseM){
      this.origin.copy(eye);this.group.position.copy(this.origin);this.originReady=true;
      this.originVersion++;this.originRebased=true;
    }
    this.fullCanopy?.prepare(eye,groundDirection,altitudeM,water,enabled,immersive,this.origin);
    const counts=[0,0],capacities=immersive?[64,1024]:[B.forestNearCapacity,B.forestCapacity];let canopyCount=0;
    for(const updates of this.updates){updates.wanted.length=0;updates.wantedCoverage.length=0;updates.wantedIds.clear();}
    const altitudeFade=1-THREE.MathUtils.smoothstep(altitudeM,B.forestPrepareAltitudeM-500,B.forestPrepareAltitudeM);
    for(const cell of this.wanted){
      const dx=cell.direction[0]-groundDirection[0],dy=cell.direction[1]-groundDirection[1],dz=cell.direction[2]-groundDirection[2];
      if((dx*dx+dy*dy+dz*dz)*r*r<100*100)this.fullCanopy?.observeClose(cell.id,eye);
      const resident=this.cache.get(cell.id);if(!resident)continue;
      resident.patchKey??=forestCellPatchKey(cell.id);
      if(resident.water===water&&this.fullCanopy?.currentPatch(resident.patchKey)){
        const scale=1+resident.height/r,x=cell.direction[0]*scale-eye.x,y=cell.direction[1]*scale-eye.y,z=cell.direction[2]*scale-eye.z;
        if((x*x+y*y+z*z)*r*r>=650*650){
          // Complete current patches own this entire distant band. Keep stale
          // water and missing patches on the full fallback/absence path below.
          this.retainedNear.delete(cell.id);this.retainedMiddle.delete(cell.id);this.farOwnedSkipped++;continue;
        }
      }
      this.fullCanopy?.noteNear(cell.id,resident.patchKey,resident.present,resident.water);
      if(!resident.present)continue;
      // Hide newly submerged old residents immediately while other habitat
      // properties are refreshed. The current bucket sampler remains authority.
      if(resident.water!==water&&this.body.water>0&&resident.height<=water){this.fullCanopy?.own(cell.id,1);continue;}
      this.direction.set(...cell.direction);
      this.position.copy(this.direction).multiplyScalar(1+resident.height/r);
      this.bounds.center.copy(this.position).addScaledVector(this.direction,LEGACY_TREE_BOUND.center[1]*cell.heightM/r);this.bounds.radius=crownBoundRadius*cell.heightM/r;
      if(frusta.length&&!frusta.some(f=>f.intersectsSphere(this.bounds)))continue;
      const distance=this.position.distanceTo(eye)*r;
      const horizontal=Math.hypot(this.direction.x-groundDirection[0],this.direction.y-groundDirection[1],this.direction.z-groundDirection[2])*r;
      // Detailed and distant draws refer to one canonical tree. A retained
      // band prevents oscillation between equal-silhouette batches.
      const wasNear=this.retainedNear.has(cell.id),nearLimit=wasNear?B.forestNearM+12:B.forestNearM-12;
      let lod=distance<nearLimit?0:1;
      if(lod===0)this.retainedNear.add(cell.id);else this.retainedNear.delete(cell.id);
      if(distance>=B.forestRadiusM)continue;
      const edgeCoverage=altitudeFade*(1-THREE.MathUtils.smoothstep(distance,B.forestRadiusM-300,B.forestRadiusM));
      const paired=this.fullCanopy?.canHandoff(cell.id,resident.height)??false;
      if(paired){
        const middleLimit=this.retainedMiddle.has(cell.id)?600:550;
        if(distance>=middleLimit){this.retainedMiddle.delete(cell.id);continue;}
        this.retainedMiddle.add(cell.id);
      }
      if(cell.canopyRepresentative&&horizontal>B.forestFootprintM-100){
        if(canopyCount>=(immersive?2048:B.canopyCapacity))continue;
        this.wantInstance(2,resident,edgeCoverage);canopyCount++;continue;
      }
      if(counts[lod]>=capacities[lod]){if(lod===0)lod=1;else continue;}
      if(counts[lod]>=capacities[lod])continue;
      const fade=edgeCoverage*(paired||cell.canopyRepresentative?1:1-THREE.MathUtils.smoothstep(horizontal,B.forestFootprintM-130,B.forestFootprintM));
      if(fade<=0)continue;
      this.wantInstance(lod,resident,fade);counts[lod]++;
    }
    for(let i=0;i<3;i++)this.reconcileBatch(i);
    this.fullCanopy?.finish();
    this.nearTrees=counts[0];this.visibleTrees=counts[0]+counts[1]+canopyCount;
    this.updateMs=performance.now()-updateStarted;
  }
  diagnostics(){return {visible:this.visibleTrees,near:this.nearTrees,cached:this.cache.size,pending:this.queue.length,
    candidateCells:this.wanted.length,canopyStands:0,farCanonicalTrees:this.group.visible?this.canopy.count:0,farSamplingFraction:FAR_CROWN_PROBABILITY,habitatVersion:TREE_HABITAT_VERSION,placementMs:this.placementMs,selectionMs:this.selectionMs,selectionPending:this.selecting,selectionWorker:!!this.worker,
    representation:'canonical-tree-field',densityFocus:'observer-ground',instanceUpdates:'stable-slots-retained-origin-dirty-ranges',
    selectionJobsInFlight:this.selecting?1:0,waterBucket:this.water,selectionApplyMs:this.selectionApplyMs,selectionCache:this.selectionCacheStats,selectionTransfer:this.selectionTransfer,fullCanopy:this.fullCanopy?.diagnostics()??null,
    workerRestarts:this.workerRestarts,workerFailures:this.workerFailures,selectionMode:this.worker?'worker':'synchronous-fallback',
    updateMs:this.updateMs,farOwnedSkipped:this.farOwnedSkipped,matrixWrites:this.matrixWrites,colorWrites:this.colorWrites,coverageWrites:this.coverageWrites,
    scheduledUploadBytes:this.scheduledUploadBytes,originRebased:this.originRebased,originVersion:this.originVersion,originRebaseM:B.forestOriginRebaseM,
    radiusM:B.forestRadiusM,heightRangeM:[10,22],cellSizeM:B.forestCellM,
    allocatedBytes:[...this.meshes,this.canopy].reduce((s,m)=>s+m.instanceMatrix.array.byteLength+(m.instanceColor?.array.byteLength??0)+
      Object.values(m.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0),0)*2};}
  dispose(){this.worker?.terminate();this.worker=null;this.fullCanopy?.dispose();this.fullCanopy=null;for(const mesh of [...this.meshes,this.canopy]){mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}this.cache.clear();this.group.removeFromParent();}
}
