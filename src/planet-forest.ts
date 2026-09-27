import * as THREE from 'three';
import {type Body,type V3} from './catalog.ts';
import {terrainSampler} from './terrain.ts';
import {biomeClassifier} from './surface-biomes.ts';
import {forestPopulationCells,type PopulationCell} from './planet-population.ts';
import {PLANET_DETAIL as B} from './planet-detail.ts';

type Resident={cell:PopulationCell;height:number;present:boolean};

/** Component ranges, not byte ranges. Preserve pending updates if a batch was
 * culled or hidden before Three uploaded it. Driver upload bytes are separate. */
class DirtyRange {
  private first=Infinity;
  private end=0;
  include(index:number,components:number){
    this.first=Math.min(this.first,index*components);
    this.end=Math.max(this.end,(index+1)*components);
  }
  flush(attribute:THREE.BufferAttribute){
    if(this.first===Infinity)return 0;
    let first=this.first,end=this.end;
    for(const range of attribute.updateRanges){first=Math.min(first,range.start);end=Math.max(end,range.start+range.count);}
    attribute.clearUpdateRanges();attribute.addUpdateRange(first,end-first);
    attribute.needsUpdate=true;this.first=Infinity;this.end=0;
    return (end-first)*attribute.array.BYTES_PER_ELEMENT;
  }
}
type BatchUpdates={residents:(Resident|undefined)[];originVersions:number[];matrix:DirtyRange;color:DirtyRange;coverage:DirtyRange};
const batchUpdates=():BatchUpdates=>({residents:[],originVersions:[],matrix:new DirtyRange(),color:new DirtyRange(),coverage:new DirtyRange()});

/** Matched metre-normalized silhouettes for near branches and distant crowns.
 * All geometry is authored here; no textures or external generated assets. */
function treeGeometry(detail:number){
  const positions:number[]=[],normals:number[]=[],colors:number[]=[];
  const add=(g:THREE.BufferGeometry,scale:V3,position:V3,color:V3)=>{
    g.scale(...scale);g.translate(...position);
    const flat=g.index?g.toNonIndexed():g;
    positions.push(...flat.attributes.position.array);normals.push(...flat.attributes.normal.array);
    for(let i=0;i<flat.attributes.position.count;i++)colors.push(...color);
    flat.dispose();if(flat!==g)g.dispose();
  };
  add(new THREE.CylinderGeometry(.018,.031,.64,detail?7:4),[1,1,1],[0,.32,0],[.25,.17,.10]);
  if(detail)for(const side of [-1,1]){
    const branch=new THREE.CylinderGeometry(.005,.012,.30,6);branch.rotateZ(side*.7);
    add(branch,[1,1,1],[side*.075,.55,.02],[.25,.17,.10]);
  }
  for(const [x,y,z,s] of [[-.13,.65,.02,.23],[.13,.72,.03,.24],[0,.81,-.10,.23],[.015,.89,.035,.16]]){
    add(new THREE.IcosahedronGeometry(1,detail),[s,s*.85,s],[x,y,z],[.16+y*.06,.29+y*.04,.08]);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeBoundingSphere();return geometry;
}

/** Screen-door coverage changes visibility without shrinking a physical tree.
 * alphaHash preserves opaque depth testing and avoids sorted transparent forests. */
function forestMaterial(vertexColors:boolean){
  const material=new THREE.MeshLambertMaterial({vertexColors,color:vertexColors?0xffffff:0x456c28,alphaHash:true});
  material.onBeforeCompile=shader=>{
    shader.vertexShader='attribute float instanceCoverage;\nvarying float vForestCoverage;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvForestCoverage=instanceCoverage;');
    shader.fragmentShader='varying float vForestCoverage;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <alphahash_fragment>','diffuseColor.a *= vForestCoverage;\n#include <alphahash_fragment>');
  };
  material.customProgramCacheKey=()=>`forest-coverage-1/${vertexColors}`;return material;
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
  private origin=new THREE.Vector3();
  private originReady=false;
  private originVersion=0;
  private updates:BatchUpdates[]=[batchUpdates(),batchUpdates(),batchUpdates()];
  private sample:ReturnType<typeof terrainSampler>;
  private classify:ReturnType<typeof biomeClassifier>;
  private water=NaN;
  private matrix=new THREE.Matrix4();
  private position=new THREE.Vector3();
  private scale=new THREE.Vector3();
  private quaternion=new THREE.Quaternion();
  private yaw=new THREE.Quaternion();
  private up=new THREE.Vector3(0,1,0);
  private direction=new THREE.Vector3();
  private color=new THREE.Color();
  private bounds=new THREE.Sphere();
  private worker:Worker|null=null;
  private selecting=false;
  private selectionRequest=0;
  private applySelection(direction:V3,cells:PopulationCell[],selectionMs:number){
    this.center.set(...direction);this.wanted=cells;
    const incoming=new Set(cells.map(c=>c.id));for(const id of this.retainedNear)if(!incoming.has(id))this.retainedNear.delete(id);
    this.queue=this.wanted.filter(cell=>!this.cache.has(cell.id));
    if(this.cache.size+this.queue.length>B.populationCacheLimit){
      const keep=new Set(this.wanted.map(c=>c.id));
      for(const id of this.cache.keys())if(!keep.has(id))this.cache.delete(id);
    }
    this.selectionMs=selectionMs;this.selecting=false;
  }
  visibleTrees=0;nearTrees=0;placementMs=0;selectionMs=0;
  private matrixWrites=0;
  private colorWrites=0;
  private coverageWrites=0;
  private scheduledUploadBytes=0;
  private updateMs=0;
  private originRebased=false;
  constructor(private body:Body){
    this.sample=terrainSampler(body);this.classify=biomeClassifier(body);
    this.meshes=[B.forestNearCapacity,B.forestCapacity].map((capacity,i)=>{
      const mesh=new THREE.InstancedMesh(treeGeometry(i===0?1:0),
        forestMaterial(true),capacity);
      const coverage=new THREE.InstancedBufferAttribute(new Float32Array(capacity),1);coverage.setUsage(THREE.DynamicDrawUsage);mesh.geometry.setAttribute('instanceCoverage',coverage);this.coverage.push(coverage);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;
      this.group.add(mesh);return mesh;
    });
    this.canopy=new THREE.InstancedMesh(treeGeometry(0),forestMaterial(true),B.canopyCapacity);
    this.canopyCoverage=new THREE.InstancedBufferAttribute(new Float32Array(B.canopyCapacity),1);this.canopyCoverage.setUsage(THREE.DynamicDrawUsage);this.canopy.geometry.setAttribute('instanceCoverage',this.canopyCoverage);
    this.canopy.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.canopy.frustumCulled=false;this.canopy.count=0;
    this.group.add(this.canopy);this.group.name='Continuous planetary forest';
    if(typeof Worker!=='undefined'){
      this.worker=new Worker(new URL('./planet-population-worker.ts',import.meta.url),{type:'module'});
      this.worker.onmessage=({data})=>{
        if(data.requestId===this.selectionRequest)this.applySelection(data.direction,data.cells,data.selectionMs);
      };
      this.worker.onerror=()=>{this.worker?.terminate();this.worker=null;this.selecting=false;};
    }
  }
  /** Stable slot contents survive stationary views. Compact visible ordering
   * still changes at frustum/LOD boundaries; spatial chunks are a later stage. */
  private writeInstance(batch:number,index:number,resident:Resident,coverage:number){
    const mesh=batch===2?this.canopy:this.meshes[batch],updates=this.updates[batch];
    const changed=updates.residents[index]!==resident;
    if(changed||updates.originVersions[index]!==this.originVersion){
      const {cell,height}=resident,r=this.body.radiusM;
      this.direction.set(...cell.direction);
      this.position.copy(this.direction).multiplyScalar(1+height/r).sub(this.origin);
      this.quaternion.setFromUnitVectors(this.up,this.direction);
      this.yaw.setFromAxisAngle(this.direction,cell.yaw);this.quaternion.premultiply(this.yaw);
      this.scale.setScalar(cell.heightM/r);
      this.matrix.compose(this.position,this.quaternion,this.scale);mesh.setMatrixAt(index,this.matrix);
      updates.matrix.include(index,16);updates.originVersions[index]=this.originVersion;this.matrixWrites++;
    }
    if(changed){
      const roll=resident.cell.roll;
      this.color.setRGB(.8+roll*.2,.85+roll*.15,.75+roll*.25);mesh.setColorAt(index,this.color);
      updates.color.include(index,3);updates.residents[index]=resident;this.colorWrites++;
    }
    const attribute=batch===2?this.canopyCoverage:this.coverage[batch],value=Math.fround(coverage);
    if(attribute.getX(index)!==value){attribute.setX(index,value);updates.coverage.include(index,1);this.coverageWrites++;}
  }
  update(eye:THREE.Vector3,groundDirection:V3,altitudeM:number,enabled:boolean,water:number,immersive:boolean,frusta:THREE.Frustum[]=[]){
    const updateStarted=performance.now();
    this.group.visible=enabled&&altitudeM<B.forestPrepareAltitudeM;
    this.visibleTrees=0;this.nearTrees=0;this.placementMs=0;this.selectionMs=0;
    this.matrixWrites=0;this.colorWrites=0;this.coverageWrites=0;this.scheduledUploadBytes=0;this.originRebased=false;this.updateMs=0;
    if(!this.group.visible)return;
    if(water!==this.water){
      this.water=water;this.sample=terrainSampler(this.body,undefined,undefined,undefined,water);
      this.classify=biomeClassifier(this.body,water);this.cache.clear();this.center.setScalar(Infinity);
      // Ignore pending selections from a previous water/date context.
      this.selectionRequest++;this.selecting=false;this.wanted=[];this.queue=[];this.retainedNear.clear();
    }
    const r=this.body.radiusM,ground=this.direction.set(...groundDirection);
    if(ground.distanceTo(this.center)*r>40&&!this.selecting){
      if(this.worker){
        this.selecting=true;this.worker.postMessage({requestId:++this.selectionRequest,seed:this.body.seed,direction:groundDirection,radiusM:r});
      }else{
      const started=performance.now();
      const cells=forestPopulationCells(this.body.seed,groundDirection,r,B.forestFootprintM+100,B.canopyFootprintM,B.forestCellM);
      this.applySelection(groundDirection,cells,performance.now()-started);
      }
    }
    const started=performance.now();
    for(let count=0;this.queue.length&&count<B.placementSamplesPerFrame&&performance.now()-started<B.placementBudgetMs;count++){
      const cell=this.queue.shift()!,s=this.sample(cell.direction);
      const biome=this.classify(cell.direction,s.groundHeightM);
      let present=!s.wet&&biome.forestPotential&&cell.roll<.76;
      if(present){
        const d=new THREE.Vector3(...cell.direction),right=new THREE.Vector3().crossVectors(Math.abs(d.y)>.9?new THREE.Vector3(1,0,0):this.up,d).normalize();
        const a=d.clone().addScaledVector(right,5/r).normalize(),b=d.clone().addScaledVector(right,-5/r).normalize();
        const slope=Math.abs(this.sample(a.toArray() as V3).groundHeightM-this.sample(b.toArray() as V3).groundHeightM)/10;
        present=slope<.55;
      }
      this.cache.set(cell.id,{cell,height:s.groundHeightM,present});
    }
    this.placementMs=performance.now()-started;
    // Retain the anchor across ordinary movement so static tree matrices need
    // no rewrite. Rebase before Float32 conversion to preserve local precision.
    if(!this.originReady||this.origin.distanceTo(eye)*r>=B.forestOriginRebaseM){
      this.origin.copy(eye);this.group.position.copy(this.origin);this.originReady=true;
      this.originVersion++;this.originRebased=true;
    }
    const counts=[0,0],capacities=immersive?[64,1024]:[B.forestNearCapacity,B.forestCapacity];let canopyCount=0;
    const altitudeFade=1-THREE.MathUtils.smoothstep(altitudeM,B.forestPrepareAltitudeM-500,B.forestPrepareAltitudeM);
    for(const cell of this.wanted){
      const resident=this.cache.get(cell.id);if(!resident?.present)continue;
      this.direction.set(...cell.direction);
      this.position.copy(this.direction).multiplyScalar(1+resident.height/r);
      this.bounds.center.copy(this.position);this.bounds.radius=cell.heightM/r;
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
      if(cell.canopyRepresentative&&horizontal>B.forestFootprintM-100){
        if(canopyCount>=(immersive?2048:B.canopyCapacity))continue;
        this.writeInstance(2,canopyCount++,resident,edgeCoverage);continue;
      }
      if(counts[lod]>=capacities[lod]){if(lod===0)lod=1;else continue;}
      if(counts[lod]>=capacities[lod])continue;
      const fade=edgeCoverage*(cell.canopyRepresentative?1:1-THREE.MathUtils.smoothstep(horizontal,B.forestFootprintM-130,B.forestFootprintM));
      if(fade<=0)continue;
      this.writeInstance(lod,counts[lod]++,resident,fade);
    }
    for(let i=0;i<2;i++){
      this.meshes[i].count=counts[i];
    }
    this.canopy.count=canopyCount;
    for(let i=0;i<3;i++){
      const mesh=i===2?this.canopy:this.meshes[i],updates=this.updates[i];
      this.scheduledUploadBytes+=updates.matrix.flush(mesh.instanceMatrix);
      if(mesh.instanceColor)this.scheduledUploadBytes+=updates.color.flush(mesh.instanceColor);
      this.scheduledUploadBytes+=updates.coverage.flush(i===2?this.canopyCoverage:this.coverage[i]);
    }
    this.nearTrees=counts[0];this.visibleTrees=counts[0]+counts[1]+canopyCount;
    this.updateMs=performance.now()-updateStarted;
  }
  diagnostics(){return {visible:this.visibleTrees,near:this.nearTrees,cached:this.cache.size,pending:this.queue.length,
    candidateCells:this.wanted.length,canopyStands:0,farCanonicalTrees:this.group.visible?this.canopy.count:0,farSamplingFraction:.065,placementMs:this.placementMs,selectionMs:this.selectionMs,selectionPending:this.selecting,selectionWorker:!!this.worker,
    representation:'canonical-tree-field',densityFocus:'observer-ground',instanceUpdates:'retained-origin-dirty-ranges',
    updateMs:this.updateMs,matrixWrites:this.matrixWrites,colorWrites:this.colorWrites,coverageWrites:this.coverageWrites,
    scheduledUploadBytes:this.scheduledUploadBytes,originRebased:this.originRebased,originVersion:this.originVersion,originRebaseM:B.forestOriginRebaseM,
    radiusM:B.forestRadiusM,heightRangeM:[10,22],cellSizeM:B.forestCellM,
    allocatedBytes:[...this.meshes,this.canopy].reduce((s,m)=>s+m.instanceMatrix.array.byteLength+(m.instanceColor?.array.byteLength??0)+
      Object.values(m.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0),0)*2};}
  dispose(){this.worker?.terminate();for(const mesh of [...this.meshes,this.canopy]){mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}this.cache.clear();this.group.removeFromParent();}
}
