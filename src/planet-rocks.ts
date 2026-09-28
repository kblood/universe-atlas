/** Ordinary-game surface rocks: bounded streaming of the canonical rock field
 * (rock-field.ts) into shared, instanced procedural meshes (rock-geometry.ts).
 *
 * - Canonical cells are resolved nearest-first under a per-frame cell, sample
 *   and time budget; results never depend on that budget or on visit order.
 * - One InstancedMesh per (family, shape variant, LOD) shares geometry and a
 *   material; instance matrices are cached per rock and origin version, and a
 *   frame only copies survivors into the batches when its view changed.
 * - Matrices are relative to a rebased origin (like the forest) so Float32
 *   instance data keeps millimetre precision.
 * - Materials reuse the terrain's already-licensed shared rock PBR maps via
 *   the renderer's existing lease (no new textures are loaded or owned).
 * - Visual only: there is no collision; walkers and animals pass through. */
import * as THREE from 'three';
import type {V3} from './catalog.ts';
import type {RockFamily} from './biosphere-model.ts';
import {
  ROCK_FIELD_VERSION,ROCK_TIERS,ROCK_VARIANTS,ROCK_MAX_ALTITUDE_M,canonicalRockFamilies,rockFamiliesSignature,
  rockCellsNear,rocksForCell,rockLod,rockCensusDigest,
  type RockGate,type RockInstance,type RockSampler,type RockClassifier,
} from './rock-field.ts';
import {buildRockMesh,rockMeshBytes,ROCK_GEOMETRY_VERSION,ROCK_LOD_COUNT,ROCK_MAX_TRIANGLES,type RockLod} from './rock-geometry.ts';
import {GROUND_PBR_REPEAT_M} from './ground-material.ts';
import type {SurfaceCell} from './surface-cell.ts';

export const ROCK_MATERIAL_VERSION='atlas-rock-material-1';
/** Submitted instances per LOD band, all families together. */
export const ROCK_LOD_CAPS=Object.freeze([512,1536,2048] as const);
/** Per-batch capacity: an even share of a band across variants plus margin.
 * Families may dominate locally, variants are uniform per family. */
export const ROCK_BATCH_CAPACITY=Object.freeze(ROCK_LOD_CAPS.map(cap=>Math.ceil(cap*1.25/ROCK_VARIANTS)));
export const ROCK_ORIGIN_REBASE_M=256;
export const ROCK_CELLS_PER_FRAME=96;
export const ROCK_SAMPLES_PER_FRAME=320;
export const ROCK_WORK_BUDGET_MS=1.5;
/** Estimated JS heap for one resident rock (object, id string, cached matrix)
 * and one resident cell record. Used for bounded, conservative accounting. */
export const ROCK_RECORD_BYTES=640;
export const ROCK_CELL_RECORD_BYTES=160;
const INSTANCE_STRIDE_BYTES=(16+3+2)*4;
const FAMILIES_PER_BODY=3;
/** Worst-case owned bytes: GPU+CPU copies of every batch plus the theoretical
 * maximum of resident records (every slot of every capped cell occupied). */
export const ROCK_WORST_CASE_BYTES=(()=>{
  const slots=ROCK_BATCH_CAPACITY.reduce((a,c)=>a+c,0)*FAMILIES_PER_BODY*ROCK_VARIANTS;
  // Rounded/angular LOD0 is the largest mesh: 320 triangles, 36 B per vertex.
  const geometry=FAMILIES_PER_BODY*ROCK_VARIANTS*ROCK_MAX_TRIANGLES.reduce((a,t)=>a+t*3*36,0);
  const cells=ROCK_TIERS.reduce((a,t)=>a+t.residentCap,0),rocks=ROCK_TIERS.reduce((a,t)=>a+t.residentCap*t.slots,0);
  return 2*(slots*INSTANCE_STRIDE_BYTES+geometry)+cells*ROCK_CELL_RECORD_BYTES+rocks*ROCK_RECORD_BYTES;
})();
/** Declared ceiling for ROCK_WORST_CASE_BYTES (about 13.4 MB, dominated by
 * the estimated heap of fully occupied resident rock records). */
export const ROCK_BUDGET_BYTES=16*1024*1024;
export const ROCK_COLLISION_NOTE='none: rocks are visual only; walker, landing and fauna do not collide with them';

export type RockTextureLease={ready:{value:number};rockColor:THREE.Texture|null;rockNormal:THREE.Texture|null};
export type PlanetRocksOptions={
  body:{seed:string;id:string;water:number;radiusM:number};
  sample:()=>RockSampler;classify:()=>RockClassifier;
  textures?:RockTextureLease|null;
  /** Called once for every mesh created (local aerial perspective hook). */
  attach?:(mesh:THREE.Mesh)=>void;
};
export type RockUpdate={
  eye:THREE.Vector3;focus:THREE.Vector3;altitudeM:number;gate:RockGate|null|undefined;relief:number;
  waterLevelM:number;
  /** Camera frusta in planet-local unit coordinates (one per XR eye). */
  frusta:readonly THREE.Frustum[];shadowFrustum?:THREE.Frustum|null;
};

type RuntimeRock=RockInstance&{family:number;batchBase:number;cx:number;cy:number;cz:number;px:number;py:number;pz:number;boundRadius:number;
  color:[number,number,number];detailSeed:number;matrix:Float32Array;originVersion:number};
type CellRecord={tier:number;cell:SurfaceCell;rocks:RuntimeRock[]};
type TierState={center:THREE.Vector3;valid:boolean;wanted:SurfaceCell[];queue:SurfaceCell[];queueIndex:number;truncated:number;residents:Map<string,CellRecord>};
type Batch={mesh:THREE.InstancedMesh;material:THREE.MeshStandardMaterial;detail:THREE.InstancedBufferAttribute;lod:RockLod;capacity:number;triangles:number;geometryBytes:number;count:number};
type Shape={height:number;boundCenterY:number;boundRadius:number};

const rockFragmentHeader=`
uniform sampler2D rockColorMap,rockNormalMap; uniform float rockPbrReady;
varying vec3 vRockPos,vRockNormal,vRockN0,vRockN1,vRockN2;
vec4 rockTri(sampler2D t,vec3 p,vec3 w){return texture2D(t,p.yz)*w.x+texture2D(t,p.zx)*w.y+texture2D(t,p.xy)*w.z;}
vec3 rockAxisX(vec3 c,float s){vec3 n=normalize(c*2.0-1.0);return normalize(vec3(s*n.z,n.x,n.y));}
vec3 rockAxisY(vec3 c,float s){vec3 n=normalize(c*2.0-1.0);return normalize(vec3(n.y,s*n.z,n.x));}
vec3 rockAxisZ(vec3 c,float s){vec3 n=normalize(c*2.0-1.0);return normalize(vec3(n.x,n.y,s*n.z));}
vec3 rockTriNormal(sampler2D t,vec3 p,vec3 w,vec3 n){
  vec3 x=rockAxisX(texture2D(t,p.yz).rgb,n.x<0.0?-1.0:1.0);
  vec3 y=rockAxisY(texture2D(t,p.zx).rgb,n.y<0.0?-1.0:1.0);
  vec3 z=rockAxisZ(texture2D(t,p.xy).rgb,n.z<0.0?-1.0:1.0);
  return normalize(x*w.x+y*w.y+z*w.z);
}
`;

/** Shared material shape per batch. LOD 2 skips texture sampling; far mips
 * converge to the mean anyway, so detail ratio -> 1 continuously. */
export function createRockMaterial(family:RockFamily,lod:RockLod,textures:RockTextureLease|null|undefined){
  const pbr=lod<2&&!!textures?.rockColor&&!!textures?.rockNormal;
  const material=new THREE.MeshStandardMaterial({vertexColors:true,metalness:0,roughness:.78+.14*Math.max(0,Math.min(1,family.roughness))});
  material.name=`Rock ${family.form} LOD${lod}`;
  material.onBeforeCompile=shader=>{
    shader.vertexShader='attribute vec2 rockDetail;\nvarying vec3 vRockPos,vRockNormal,vRockN0,vRockN1,vRockN2;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vRockPos=position*rockDetail.x+vec3(rockDetail.y*37.0,rockDetail.y*11.0,rockDetail.y*23.0);
      vRockNormal=normal;
      #ifdef USE_INSTANCING
        mat3 rockIm=mat3(instanceMatrix);
        vRockN0=normalMatrix*(rockIm[0]/dot(rockIm[0],rockIm[0]));
        vRockN1=normalMatrix*(rockIm[1]/dot(rockIm[1],rockIm[1]));
        vRockN2=normalMatrix*(rockIm[2]/dot(rockIm[2],rockIm[2]));
      #else
        vRockN0=normalMatrix[0];vRockN1=normalMatrix[1];vRockN2=normalMatrix[2];
      #endif`);
    if(!pbr)return;
    shader.uniforms.rockColorMap={value:textures!.rockColor};
    shader.uniforms.rockNormalMap={value:textures!.rockNormal};
    shader.uniforms.rockPbrReady=textures!.ready;
    shader.fragmentShader=rockFragmentHeader+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 rockAxis=pow(abs(normalize(vRockNormal)),vec3(4.0));rockAxis/=dot(rockAxis,vec3(1.0));
      vec3 rockP=vRockPos/${GROUND_PBR_REPEAT_M.toFixed(1)};
      vec4 rockTex=vec4(1.0),rockMean=vec4(1.0);float rockPbr=0.0;vec3 rockObjN=normalize(vRockNormal);
      if(rockPbrReady>.5){
        rockTex=rockTri(rockColorMap,rockP,rockAxis);
        rockMean=textureLod(rockColorMap,vec2(.5),16.0);
        rockObjN=rockTriNormal(rockNormalMap,rockP,rockAxis,rockObjN);
        rockPbr=1.0;
      }
      // Family colour stays authoritative; the photograph adds only relative detail.
      diffuseColor.rgb*=mix(vec3(1.0),clamp(rockTex.rgb/max(rockMean.rgb,vec3(.03)),vec3(.45),vec3(1.7)),rockPbr);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      roughnessFactor=clamp(roughnessFactor*mix(1.0,rockTex.a/max(rockMean.a,.05),.6*rockPbr),.35,1.0);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      if(rockPbr>0.0){vec3 rockViewN=normalize(vRockN0*rockObjN.x+vRockN1*rockObjN.y+vRockN2*rockObjN.z);normal=normalize(mix(normal,rockViewN,.7));}`);
  };
  material.customProgramCacheKey=()=>`${ROCK_MATERIAL_VERSION}/${pbr?'pbr':'plain'}`;
  return material;
}

export class PlanetRocks {
  readonly group=new THREE.Group();
  private readonly body:PlanetRocksOptions['body'];
  private readonly options:PlanetRocksOptions;
  private families:RockFamily[]=[];
  private familiesInput:readonly RockFamily[]|null=null;
  private familiesSignature='';
  private signature='';
  private waterLevelM=0;
  private shapes:Shape[]=[];
  private batches:Batch[]=[];
  private tiers:TierState[]=ROCK_TIERS.map(()=>({center:new THREE.Vector3(Infinity,Infinity,Infinity),valid:false,wanted:[],queue:[],queueIndex:0,truncated:0,residents:new Map()}));
  private readonly origin=new THREE.Vector3();
  private originReady=false;
  private originVersion=0;
  private originRebased=false;
  private residentsVersion=0;
  private drawKey='';
  private disposed=false;
  private reason='no-context';
  private readonly scratch={position:new THREE.Vector3(),quaternion:new THREE.Quaternion(),yaw:new THREE.Quaternion(),scale:new THREE.Vector3(),up:new THREE.Vector3(),matrix:new THREE.Matrix4(),sphere:new THREE.Sphere(),color:new THREE.Color()};
  private stats={cells:0,samples:0,rescatters:0,cameraCulled:0,shadowOnly:0,budgetDrops:0,drawn:[0,0,0],draws:0,triangles:0,rebuilds:0,updateMs:0,processMs:0,drawMs:0,rescatterMs:0};
  constructor(options:PlanetRocksOptions){
    this.options=options;this.body=options.body;
    this.group.name='Surface rocks';this.group.visible=false;
  }
  /** Canonical families for a gate; identical inputs keep all state. */
  private setFamilies(families:readonly RockFamily[]){
    if(families===this.familiesInput)return;
    this.familiesInput=families;
    const signature=rockFamiliesSignature(families);
    if(signature===this.familiesSignature)return;
    this.familiesSignature=signature;this.families=canonicalRockFamilies(families);
    this.clearResidents();this.rebuildBatches();
  }
  private rebuildBatches(){
    this.disposeBatches();this.shapes=[];
    this.families.forEach((family,f)=>{
      for(let v=0;v<ROCK_VARIANTS;v++)for(let lod=0 as RockLod;lod<ROCK_LOD_COUNT;lod=(lod+1) as RockLod){
        const data=buildRockMesh(family,v,lod);
        if(lod===0)this.shapes[f*ROCK_VARIANTS+v]={height:data.height,boundCenterY:data.boundCenterY,boundRadius:data.boundRadius};
        const geometry=new THREE.BufferGeometry();
        geometry.setAttribute('position',new THREE.BufferAttribute(data.positions,3));
        geometry.setAttribute('normal',new THREE.BufferAttribute(data.normals,3));
        geometry.setAttribute('color',new THREE.BufferAttribute(data.colors,3));
        const capacity=ROCK_BATCH_CAPACITY[lod]!;
        const detail=new THREE.InstancedBufferAttribute(new Float32Array(capacity*2),2).setUsage(THREE.DynamicDrawUsage);
        geometry.setAttribute('rockDetail',detail);
        geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,data.boundCenterY,0),data.boundRadius);
        const material=createRockMaterial(family,lod,this.options.textures);
        const mesh=new THREE.InstancedMesh(geometry,material,capacity);
        mesh.name=`Surface rocks ${family.form} v${v} LOD${lod}`;
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3).fill(1),3).setUsage(THREE.DynamicDrawUsage);
        for(const attribute of [mesh.instanceMatrix,mesh.instanceColor,detail])attribute.onUpload(()=>attribute.clearUpdateRanges());
        mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;
        mesh.castShadow=lod<2;mesh.receiveShadow=true;
        this.group.add(mesh);this.options.attach?.(mesh);
        this.batches.push({mesh,material,detail,lod,capacity,triangles:data.triangles,geometryBytes:rockMeshBytes(data),count:0});
      }
    });
    this.drawKey='';
  }
  private batchIndex(family:number,variant:number,lod:number){return (family*ROCK_VARIANTS+variant)*ROCK_LOD_COUNT+lod;}
  private disposeBatches(){
    for(const b of this.batches){this.group.remove(b.mesh);b.mesh.geometry.dispose();b.material.dispose();b.mesh.dispose();}
    this.batches=[];
  }
  private clearResidents(){
    for(const t of this.tiers){t.residents.clear();t.wanted=[];t.queue=[];t.queueIndex=0;t.valid=false;t.truncated=0;}
    this.residentsVersion++;this.drawKey='';
  }
  private hide(){
    for(const b of this.batches){b.count=0;b.mesh.count=0;b.mesh.visible=false;}
    this.group.visible=false;this.stats.drawn=[0,0,0];this.stats.draws=0;this.stats.triangles=0;this.drawKey='';
  }
  update(input:RockUpdate){
    if(this.disposed)return;
    const started=performance.now();
    this.originRebased=false;this.stats.cells=0;this.stats.samples=0;this.stats.processMs=0;this.stats.drawMs=0;this.stats.rescatterMs=0;
    const gate=input.gate;
    if(!gate){this.reason='no-context';this.clearAll();return this.finish(started);}
    if(!gate.surfaceSolid){this.reason='surface-unavailable';this.clearAll();return this.finish(started);}
    this.setFamilies(gate.families);
    if(!this.families.length){this.reason='no-families';this.clearAll();return this.finish(started);}
    if(input.relief!==1){this.reason='relief';this.hide();return this.finish(started);}
    if(!(input.altitudeM<ROCK_MAX_ALTITUDE_M)){this.reason='altitude';this.hide();return this.finish(started);}
    // Only a wet body's rocks depend on the dated sea level.
    const signature=`${this.familiesSignature}|${this.body.water>0?input.waterLevelM:'dry'}`;
    if(signature!==this.signature){this.signature=signature;this.waterLevelM=input.waterLevelM;this.clearResidents();}
    this.reason='ok';
    const r=this.body.radiusM,eye=input.eye;
    if(!this.originReady||this.origin.distanceTo(eye)*r>=ROCK_ORIGIN_REBASE_M){
      this.origin.copy(eye);this.group.position.copy(this.origin);this.originReady=true;this.originVersion++;this.originRebased=true;this.drawKey='';
    }
    const focus=input.focus.clone().normalize();
    this.rescatter(focus,input.altitudeM);
    const p0=performance.now();this.process(focus);this.stats.processMs=performance.now()-p0;
    const d0=performance.now();
    if(input.frusta.length)this.draw(eye,input.frusta,input.shadowFrustum??null);else this.hide();
    this.stats.drawMs=performance.now()-d0;
    return this.finish(started);
  }
  private finish(started:number){this.stats.updateMs=performance.now()-started;}
  private clearAll(){if(this.tiers.some(t=>t.residents.size||t.wanted.length))this.clearResidents();this.hide();}
  /** At most one tier refreshes its canonical neighbourhood per frame. */
  private rescatter(focus:THREE.Vector3,altitudeM:number){
    const r=this.body.radiusM;let best=-1,bestScore=0;
    ROCK_TIERS.forEach((tier,i)=>{
      const state=this.tiers[i]!;if(!(altitudeM<tier.rangeM))return;
      const moved=state.valid?state.center.distanceTo(focus)*r/tier.rescatterM:Infinity;
      if(moved>=1&&moved>bestScore){best=i;bestScore=moved;}
    });
    if(best<0)return;
    const started=performance.now(),tier=ROCK_TIERS[best]!,state=this.tiers[best]!;
    const {cells,truncated}=rockCellsNear(focus.toArray() as V3,r,tier);
    state.center.copy(focus);state.valid=true;state.wanted=cells;state.truncated=truncated;
    state.queue=cells.filter(c=>!state.residents.has(c.id));state.queueIndex=0;
    const wanted=new Set(cells.map(c=>c.id)),keep=(tier.rangeM+2*tier.marginM)/r;
    let removed=false;
    for(const [id,record] of state.residents){
      if(wanted.has(id))continue;
      const d=record.cell.direction;
      if(state.residents.size>tier.residentCap||Math.hypot(d[0]-focus.x,d[1]-focus.y,d[2]-focus.z)>keep){state.residents.delete(id);removed=true;}
    }
    if(removed)this.residentsVersion++;
    this.stats.rescatters++;this.stats.rescatterMs=performance.now()-started;this.drawKey='';
  }
  /** Nearest-first across tiers by range-normalised distance. The budget
   * decides only when a cell resolves, never what it contains. */
  private process(focus:THREE.Vector3){
    const started=performance.now(),r=this.body.radiusM,sample=this.options.sample(),classify=this.options.classify();
    const ctx={body:this.body,radiusM:r,families:this.families,sample,classify,waterLevelM:this.waterLevelM};
    while(this.stats.cells<ROCK_CELLS_PER_FRAME&&this.stats.samples<ROCK_SAMPLES_PER_FRAME){
      if(this.stats.cells>0&&performance.now()-started>ROCK_WORK_BUDGET_MS)break;
      let pick=-1,score=Infinity;
      this.tiers.forEach((state,i)=>{
        while(state.queueIndex<state.queue.length&&state.residents.has(state.queue[state.queueIndex]!.id))state.queueIndex++;
        const cell=state.queue[state.queueIndex];if(!cell)return;
        const d=cell.direction,s=Math.hypot(d[0]-focus.x,d[1]-focus.y,d[2]-focus.z)*r/ROCK_TIERS[i]!.rangeM;
        if(s<score){score=s;pick=i;}
      });
      if(pick<0)break;
      const state=this.tiers[pick]!,cell=state.queue[state.queueIndex++]!,tier=ROCK_TIERS[pick]!;
      const result=rocksForCell(ctx,tier,cell.id);
      this.stats.cells++;this.stats.samples+=result.samples;
      state.residents.set(cell.id,{tier:pick,cell,rocks:result.rocks.map(rock=>this.runtimeRock(rock))});
      this.residentsVersion++;
    }
  }
  private runtimeRock(rock:RockInstance):RuntimeRock{
    const family=this.families.findIndex(f=>f.id===rock.familyId),shape=this.shapes[family*ROCK_VARIANTS+rock.variant]!,r=this.body.radiusM;
    const g=1+rock.groundHeightM/r,[dx,dy,dz]=rock.direction,[ux,uy,uz]=rock.up;
    const centreM=shape.boundCenterY*rock.diameterM*rock.aspect[1]-rock.sinkM;
    const color=this.scratch.color.set(this.families[family]!.color);
    return {...rock,family,batchBase:this.batchIndex(family,rock.variant,0),
      px:dx*g,py:dy*g,pz:dz*g,cx:dx*g+ux*centreM/r,cy:dy*g+uy*centreM/r,cz:dz*g+uz*centreM/r,
      boundRadius:shape.boundRadius*rock.diameterM*Math.max(rock.aspect[0],rock.aspect[1],rock.aspect[2]),
      color:[color.r*rock.tint[0],color.g*rock.tint[1],color.b*rock.tint[2]],
      detailSeed:(rock.yaw*97.13)%61,
      matrix:new Float32Array(16),originVersion:-1};
  }
  private writeMatrix(rock:RuntimeRock){
    const s=this.scratch,r=this.body.radiusM;
    s.up.set(...rock.up);
    s.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP,s.up);
    s.yaw.setFromAxisAngle(s.up,rock.yaw);s.quaternion.premultiply(s.yaw);
    s.position.set(rock.px,rock.py,rock.pz).addScaledVector(s.up,-rock.sinkM/r).sub(this.origin);
    s.scale.set(rock.diameterM*rock.aspect[0]/r,rock.diameterM*rock.aspect[1]/r,rock.diameterM*rock.aspect[2]/r);
    s.matrix.compose(s.position,s.quaternion,s.scale);
    rock.matrix.set(s.matrix.elements);rock.originVersion=this.originVersion;
  }
  private draw(eye:THREE.Vector3,frusta:readonly THREE.Frustum[],shadow:THREE.Frustum|null){
    const r=this.body.radiusM,q=(x:number)=>Math.round(x*r*20);
    const planes=(f:THREE.Frustum|null)=>f?f.planes.map(p=>`${p.normal.x.toFixed(4)},${p.normal.y.toFixed(4)},${p.normal.z.toFixed(4)},${(p.constant*r).toFixed(2)}`).join(';'):'';
    const key=`${this.residentsVersion}|${this.originVersion}|${q(eye.x)},${q(eye.y)},${q(eye.z)}|${frusta.map(planes).join('/')}|${planes(shadow)}`;
    this.group.visible=true;
    if(key===this.drawKey)return;
    this.drawKey=key;this.stats.rebuilds++;
    for(const b of this.batches)b.count=0;
    const drawn=[0,0,0];let culled=0,shadowOnly=0,drops=0;
    const sphere=this.scratch.sphere;
    for(let t=0;t<ROCK_TIERS.length;t++){
      const tier=ROCK_TIERS[t]!,state=this.tiers[t]!;
      for(const cell of state.wanted){
        const record=state.residents.get(cell.id);if(!record)continue;
        for(const rock of record.rocks){
          const distanceM=Math.hypot(rock.cx-eye.x,rock.cy-eye.y,rock.cz-eye.z)*r;
          const band=rockLod(distanceM,rock.diameterM,tier.rangeM);if(band<0)continue;
          const lod=band as RockLod;
          sphere.center.set(rock.cx,rock.cy,rock.cz);sphere.radius=rock.boundRadius/r;
          if(!frusta.some(f=>f.intersectsSphere(sphere))){
            if(lod===2||!shadow?.intersectsSphere(sphere)){culled++;continue;}
            shadowOnly++;
          }
          const batch=this.batches[rock.batchBase+lod]!;
          if(drawn[lod]!>=ROCK_LOD_CAPS[lod]!||batch.count>=batch.capacity){drops++;continue;}
          if(rock.originVersion!==this.originVersion)this.writeMatrix(rock);
          const i=batch.count++;
          (batch.mesh.instanceMatrix.array as Float32Array).set(rock.matrix,i*16);
          (batch.mesh.instanceColor!.array as Float32Array).set(rock.color,i*3);
          const detail=batch.detail.array as Float32Array;detail[i*2]=rock.diameterM;detail[i*2+1]=rock.detailSeed;
          drawn[lod]!++;
        }
      }
    }
    let draws=0,triangles=0;
    for(const b of this.batches){
      b.mesh.count=b.count;b.mesh.visible=b.count>0;
      if(!b.count)continue;
      draws++;triangles+=b.count*b.triangles;
      for(const [attribute,size] of [[b.mesh.instanceMatrix,16],[b.mesh.instanceColor!,3],[b.detail,2]] as const){
        attribute.clearUpdateRanges();attribute.addUpdateRange(0,b.count*size);attribute.needsUpdate=true;
      }
    }
    Object.assign(this.stats,{drawn,draws,triangles,cameraCulled:culled,shadowOnly,budgetDrops:drops});
  }
  /** Resident canonical rocks in the current wanted neighbourhood. */
  private *residentRocks(){for(const state of this.tiers)for(const cell of state.wanted){const record=state.residents.get(cell.id);if(record)yield* record.rocks;}}
  /** Explicit replay/seek census (not read by the HUD every frame). */
  census(){
    return {version:ROCK_FIELD_VERSION,geometryVersion:ROCK_GEOMETRY_VERSION,reason:this.reason,
      tiers:ROCK_TIERS.map((tier,i)=>{const state=this.tiers[i]!,rocks:RockInstance[]=[];let resolved=0;
        for(const cell of state.wanted){const record=state.residents.get(cell.id);if(!record)continue;resolved++;rocks.push(...record.rocks);}
        return {id:tier.id,wantedCells:state.wanted.length,resolvedCells:resolved,...rockCensusDigest(rocks)};}),
      total:rockCensusDigest(this.residentRocks())};
  }
  ownedBytes(){
    let geometry=0,instances=0,rocks=0,cells=0;
    for(const b of this.batches){geometry+=b.geometryBytes;instances+=b.capacity*INSTANCE_STRIDE_BYTES;}
    for(const state of this.tiers){cells+=state.residents.size;for(const record of state.residents.values())rocks+=record.rocks.length;}
    const records=cells*ROCK_CELL_RECORD_BYTES+rocks*ROCK_RECORD_BYTES;
    return {geometry:2*geometry,instances:2*instances,records,textures:0,total:2*(geometry+instances)+records,residentCells:cells,residentRocks:rocks};
  }
  diagnostics(){
    const bytes=this.ownedBytes();
    return {version:ROCK_FIELD_VERSION,geometryVersion:ROCK_GEOMETRY_VERSION,materialVersion:ROCK_MATERIAL_VERSION,
      enabled:this.reason==='ok',reason:this.reason,
      representation:'canonical-cell-rocks/shared-procedural-lod-instanced',
      families:this.families.map(f=>({id:f.id,form:f.form,scaleM:f.scaleM})),
      tiers:ROCK_TIERS.map((tier,i)=>{const s=this.tiers[i]!;let rocks=0;for(const rec of s.residents.values())rocks+=rec.rocks.length;
        return {id:tier.id,cellSizeM:tier.cellSizeM,rangeM:tier.rangeM,wanted:s.wanted.length,resident:s.residents.size,pending:Math.max(0,s.queue.length-s.queueIndex),truncated:s.truncated,rocks};}),
      drawn:{lod0:this.stats.drawn[0],lod1:this.stats.drawn[1],lod2:this.stats.drawn[2],total:this.stats.drawn[0]!+this.stats.drawn[1]!+this.stats.drawn[2]!},
      draws:this.stats.draws,batches:this.batches.length,triangles:this.stats.triangles,cameraCulled:this.stats.cameraCulled,shadowOnly:this.stats.shadowOnly,budgetDrops:this.stats.budgetDrops,
      caps:{lod:[...ROCK_LOD_CAPS],batchCapacity:[...ROCK_BATCH_CAPACITY],residentCells:ROCK_TIERS.map(t=>t.residentCap),cellsPerFrame:ROCK_CELLS_PER_FRAME,samplesPerFrame:ROCK_SAMPLES_PER_FRAME,workBudgetMs:ROCK_WORK_BUDGET_MS,maxAltitudeM:ROCK_MAX_ALTITUDE_M},
      bytes:{...bytes,budget:ROCK_BUDGET_BYTES,worstCase:ROCK_WORST_CASE_BYTES,texturesNote:'shared terrain rock PBR lease; accounted by terrain groundPbrTextureBytes',recordsNote:'estimated JS heap'},
      originVersion:this.originVersion,originRebased:this.originRebased,originRebaseM:ROCK_ORIGIN_REBASE_M,
      work:{cells:this.stats.cells,samples:this.stats.samples,rescatters:this.stats.rescatters,rebuilds:this.stats.rebuilds,updateMs:this.stats.updateMs,processMs:this.stats.processMs,drawMs:this.stats.drawMs,rescatterMs:this.stats.rescatterMs},
      collision:ROCK_COLLISION_NOTE};
  }
  dispose(){
    if(this.disposed)return;
    this.disposed=true;this.disposeBatches();
    for(const t of this.tiers)t.residents.clear();
    this.group.removeFromParent();
  }
}
