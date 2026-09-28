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
  ROCK_LOD_RATIOS,rockCellsNear,rocksForCell,rockLod,rockCensusDigest,
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
/** Canonical cell (process) work per frame: cells, terrain samples, and a
 * configured time guard. The guard is a design setting, not a measured or
 * accepted frame budget. */
export const ROCK_CELLS_PER_FRAME=96;
export const ROCK_SAMPLES_PER_FRAME=320;
export const ROCK_WORK_BUDGET_MS=1.5;
/** Draw/cull work per frame, in deterministic units: one per resident cell
 * visited, one per rock tested individually, and one per instance copied when
 * a job publishes. A walk may overshoot by at most one cell's slots. A publish
 * that does not fit the rest of a frame waits for the next frame, where it
 * runs first; it copies at most ROCK_PUBLISH_MAX instances. A job that needs
 * more units spans frames, and the previously published set stays on screen
 * until the job publishes. This is a unit bound, not a time bound; Node
 * fixture timings are in docs/ordinary-rocks-2026-09-28.md. */
export const ROCK_DRAW_UNITS_PER_FRAME=4096;
/** Rocks within this distance of the job's eye are submitted whatever the
 * camera frusta and LOD caps (batch capacity still applies), so turning or
 * saturated caps during a job cannot hide close rocks. */
export const ROCK_NEAR_UNCULLED_M=8;
/** Estimated heap per structure. Each is calibrated against Node/V8
 * `heapUsed + arrayBuffers` deltas after forced GC on the saturated fixture
 * (tests/rock-draw-measure.mjs), plus a margin; browsers remain unmeasured.
 * - rock (runtime object, canonical arrays, id string, cached matrix,
 *   packed cull entry): measured 533–543 B
 * - cell record (record, bounds, rock array, Map entry, records slot):
 *   measured 152–164 B
 * - SurfaceCell (object, id string, direction, list slot): measured 184–185 B.
 *   A SurfaceCell is counted once per wanted cell and again per resident cell,
 *   since after a rescatter the two may be distinct objects. */
export const ROCK_RECORD_BYTES=640;
export const ROCK_CELL_RECORD_BYTES=224;
export const ROCK_SURFACE_CELL_BYTES=224;
/** One staged or published rock reference slot (pointer-size estimate). */
export const ROCK_REF_BYTES=8;
/** Draw job snapshot: plane arrays and counters, plus one reference slot per
 * capped cell for the tier record lists it may still hold after a rescatter
 * replaced them (evicted entries are dropped; see retargetJob). */
export const ROCK_DRAW_JOB_BYTES=4096+ROCK_TIERS.reduce((a,t)=>a+t.residentCap,0)*ROCK_REF_BYTES;
const INSTANCE_STRIDE_BYTES=(16+3+2)*4;
const FAMILIES_PER_BODY=3;
/** Upper bound on rocks within ROCK_NEAR_UNCULLED_M of any eye: every slot of
 * every cell that can hold such a rock. Those cells have centres within
 * radius + one cell, so they lie inside radius + two cells; divide by the
 * smallest canonical cell area, cell²/3^1.5 (a cube corner). */
export const ROCK_NEAR_MAX=ROCK_TIERS.reduce((a,t)=>a+t.slots*Math.ceil(Math.PI*(ROCK_NEAR_UNCULLED_M+2*t.cellSizeM)**2*3**1.5/t.cellSizeM**2),0);
/** Instances one job can stage and publish: the LOD caps plus near rocks,
 * which bypass them. */
export const ROCK_PUBLISH_MAX=ROCK_LOD_CAPS.reduce((a,c)=>a+c,0)+ROCK_NEAR_MAX;
const MAX_MESH_VERTICES=ROCK_MAX_TRIANGLES[0]*3;
/** Scratch that may coexist with the finished batches while one mesh is being
 * built. It covers the JS number arrays for position, normal and colour of the
 * largest mesh, with 2x growth slack and 2x for clipping polygons. Old batches
 * are disposed before any new mesh is built (see rebuildBatches), so old and
 * new geometry are never both reachable. */
export const ROCK_BUILD_TRANSIENT_BYTES=4*MAX_MESH_VERTICES*9*8;
/** Upper bound on the candidate cells one rescatter enumerates before it
 * truncates to the resident cap. The disc of radius range+margin (+1 cell of
 * rim) is divided by the smallest canonical cell area, cell²/3^1.5, which
 * occurs at a cube corner. */
export const ROCK_MAX_RESCATTER_CANDIDATES=Math.max(...ROCK_TIERS.map(t=>Math.ceil(Math.PI*(t.rangeM+t.marginM+t.cellSizeM)**2*3**1.5/t.cellSizeM**2)));
/** Per candidate while it is alive during a rescatter: the SurfaceCell, the
 * sort wrapper, three list slots, and a wanted-id Set entry. */
export const ROCK_RESCATTER_CANDIDATE_BYTES=320;
/** Transients that can overlap live rock memory within one update: one
 * rescatter enumeration and one mesh construction. Both are unreachable by the
 * end of the update. */
export const ROCK_TRANSIENT_BYTES=ROCK_MAX_RESCATTER_CANDIDATES*ROCK_RESCATTER_CANDIDATE_BYTES+ROCK_BUILD_TRANSIENT_BYTES;
/** Worst-case rock-owned bytes, all live at once:
 * - CPU and GPU copies of every batch's geometry and instance buffers
 * - staged and published reference slots for every batch
 * - one draw job
 * - every capped cell both wanted and separately resident (residents never
 *   exceed the cap; see rescatter)
 * - every slot of every capped cell occupied
 * - evicted rocks still referenced by a full staged and a full published set
 * - the per-update transients.
 * Shared PBR textures are excluded; they belong to the terrain lease. */
export const ROCK_WORST_CASE_BYTES=(()=>{
  const slots=ROCK_BATCH_CAPACITY.reduce((a,c)=>a+c,0)*FAMILIES_PER_BODY*ROCK_VARIANTS;
  // Rounded/angular LOD0 is the largest mesh: 320 triangles, 36 B per vertex.
  const geometry=FAMILIES_PER_BODY*ROCK_VARIANTS*ROCK_MAX_TRIANGLES.reduce((a,t)=>a+t*3*36,0);
  const cells=ROCK_TIERS.reduce((a,t)=>a+t.residentCap,0),rocks=ROCK_TIERS.reduce((a,t)=>a+t.residentCap*t.slots,0);
  return 2*(slots*INSTANCE_STRIDE_BYTES+geometry)+2*slots*ROCK_REF_BYTES+ROCK_DRAW_JOB_BYTES
    +cells*(2*ROCK_SURFACE_CELL_BYTES+ROCK_CELL_RECORD_BYTES)+rocks*ROCK_RECORD_BYTES+2*ROCK_PUBLISH_MAX*ROCK_RECORD_BYTES+ROCK_TRANSIENT_BYTES;
})();
/** Declared ceiling for ROCK_WORST_CASE_BYTES (about 25.0 MiB, dominated by
 * the estimated heap of fully occupied resident records and cells). This
 * leaves at least 10% headroom. PlanetRenderer reserves exactly this inside
 * its combined core budget. */
export const ROCK_BUDGET_BYTES=28*1024*1024;
/** Farthest any wanted rock can be from the eye: tier range, cell margin, the
 * cell's own extent and the largest rock, with slack. A frustum plane whose
 * inside half-space contains the eye by more than this cannot reject any rock,
 * so it is left out of the draw key (see `draw`). */
export const ROCK_KEY_PLANE_REACH_M=Math.max(...ROCK_TIERS.map(t=>t.rangeM+t.marginM+2*t.cellSizeM+4*t.sizeMax))+64;
/** Percentile summary with the same nearest-rank rule as render-profile's
 * profileSummary (that module is not importable by Node's strip-only tests). */
function workPercentiles(values:readonly number[]){
  if(!values.length)return {samples:0,p50:null,p95:null,p99:null,max:null};
  const sorted=[...values].sort((a,b)=>a-b),at=(q:number)=>sorted[Math.min(sorted.length-1,Math.ceil(q*sorted.length)-1)]!;
  return {samples:sorted.length,p50:at(.5),p95:at(.95),p99:at(.99),max:sorted[sorted.length-1]!};
}
/** Per-update CPU work history kept for browser acceptance: the most recent
 * frames' update/process/draw ms and draw units, plus the frame span of each
 * published job. Fixed-size typed rings; recording never allocates. */
export const ROCK_WORK_HISTORY=600;
/** Draw-traversal target used to report per-frame over-target counts. It is
 * the configured process guard (ROCK_WORK_BUDGET_MS), not an accepted
 * frame budget. */
export const ROCK_DRAW_TARGET_MS=ROCK_WORK_BUDGET_MS;
class WorkRing{
  readonly values:Float64Array;private next=0;private size=0;
  constructor(capacity:number){this.values=new Float64Array(capacity);}
  push(value:number){this.values[this.next]=value;this.next=(this.next+1)%this.values.length;if(this.size<this.values.length)this.size++;}
  clear(){this.next=0;this.size=0;}
  list(){const out:number[]=[];for(let i=0;i<this.size;i++)out.push(this.values[(this.next-this.size+i+this.values.length)%this.values.length]!);return out;}
}
export const ROCK_COLLISION_NOTE='none: rocks are visual only; walker, landing and fauna do not collide with them';

export type RockTextureLease={ready:{value:number};rockColor:THREE.Texture|null;rockNormal:THREE.Texture|null};
export type PlanetRocksOptions={
  body:{seed:string;id:string;water:number;radiusM:number};
  sample:()=>RockSampler;classify:()=>RockClassifier;
  textures?:RockTextureLease|null;
  /** Called once for every mesh created (local aerial perspective hook). */
  attach?:(mesh:THREE.Mesh)=>void;
  /** Draw units per frame. Defaults to ROCK_DRAW_UNITS_PER_FRAME; tests vary it
   * to show that published outcomes do not depend on it. */
  drawUnitsPerFrame?:number;
};
export type RockUpdate={
  eye:THREE.Vector3;focus:THREE.Vector3;altitudeM:number;gate:RockGate|null|undefined;relief:number;
  waterLevelM:number;
  /** Camera frusta in planet-local unit coordinates (one per XR eye). */
  frusta:readonly THREE.Frustum[];shadowFrustum?:THREE.Frustum|null;
};

/** A resident rock keeps its canonical instance plus a cached matrix. Centre,
 * bounds and batch index live in the cell's packed `cull` array. Colour and
 * detail seed are derived when the rock is published. `evicted` marks a rock
 * whose cell left the residents while slots may still reference it; `mark`
 * de-duplicates such rocks when they are counted. */
type RuntimeRock=RockInstance&{matrix:Float32Array;originVersion:number;evicted:boolean;mark:number};
/** A resolved canonical cell. The bounds are in planet units and are slightly
 * inflated so that cell-level decisions are never more aggressive than the
 * per-rock tests they replace. */
type CellRecord={tier:number;cell:SurfaceCell;rocks:RuntimeRock[];
  /** Per rock: centre x/y/z, diameter (m), bound radius (planet units), LOD0 batch index. */
  cull:Float64Array;
  /** Sphere around the rock centres (LOD distance) and around their bounds (culling). */
  bx:number;by:number;bz:number;centreRadius:number;boundRadius:number;maxDiameterM:number};
const CULL_STRIDE=6;
const EMPTY_CULL=new Float64Array(0);
const EMPTY_RECORDS:(CellRecord|null)[]=[];
/** `records[i]` is the resident record of `wanted[i]` (or null), so draw jobs
 * never hash cell ids; `queue` holds indices into `wanted`. */
type TierState={center:THREE.Vector3;valid:boolean;wanted:SurfaceCell[];records:(CellRecord|null)[];queue:number[];queueIndex:number;truncated:number;residents:Map<string,CellRecord>};
/** `staged` fills during a draw job; `published` is what the instance buffers
 * currently hold. Both are fixed-size reference slots of `capacity`. */
type Batch={mesh:THREE.InstancedMesh;material:THREE.MeshStandardMaterial;detail:THREE.InstancedBufferAttribute;family:number;lod:RockLod;capacity:number;triangles:number;geometryBytes:number;
  count:number;staged:(RuntimeRock|null)[];stagedCount:number;published:(RuntimeRock|null)[]};
type Shape={height:number;boundCenterY:number;boundRadius:number};
/** One bounded, resumable draw/cull pass over a view snapshot. */
type DrawJob={key:string;ex:number;ey:number;ez:number;cameras:Float64Array[];shadow:Float64Array|null;
  origin:THREE.Vector3;originVersion:number;records:(CellRecord|null)[][];tier:number;index:number;frames:number;frame:number;startFrame:number;
  drawn:[number,number,number];culled:number;shadowOnly:number;near:number;drops:number;nearDrops:number};
const BOUND_EPSILON=1e-12;
function framePlanes(frustum:THREE.Frustum){
  const out=new Float64Array(24);
  frustum.planes.forEach((p,i)=>{out[i*4]=p.normal.x;out[i*4+1]=p.normal.y;out[i*4+2]=p.normal.z;out[i*4+3]=p.constant;});
  return out;
}
/** Sphere against one frustum, with the same arithmetic and strictness as
 * THREE.Frustum.intersectsSphere. Returns -1 outside, 0 crossing, 1 inside. */
function sphereSide(p:Float64Array,x:number,y:number,z:number,radius:number){
  let side=1;
  for(let i=0;i<24;i+=4){const d=p[i]!*x+p[i+1]!*y+p[i+2]!*z+p[i+3]!;if(d< -radius)return -1;if(d<radius)side=0;}
  return side;
}
function camerasSide(cameras:readonly Float64Array[],x:number,y:number,z:number,radius:number){
  let side=-1;for(const p of cameras){const s=sphereSide(p,x,y,z,radius);if(s>side)side=s;if(side===1)break;}
  return side;
}

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
  private readonly drawUnitsPerFrame:number;
  private families:RockFamily[]=[];
  private familiesInput:readonly RockFamily[]|null=null;
  private familiesSignature='';
  private signature='';
  private waterLevelM=0;
  private shapes:Shape[]=[];
  /** Linear RGB of each canonical family's base colour. */
  private familyRgb=new Float64Array(0);
  private batches:Batch[]=[];
  private tiers:TierState[]=ROCK_TIERS.map(()=>({center:new THREE.Vector3(Infinity,Infinity,Infinity),valid:false,wanted:[],records:[],queue:[],queueIndex:0,truncated:0,residents:new Map()}));
  /** Origin for new draw jobs; the group sits at the published job's origin. */
  private readonly origin=new THREE.Vector3();
  private originReady=false;
  private originVersion=0;
  private originRebased=false;
  private residentsVersion=0;
  private job:DrawJob|null=null;
  private drawFrame=0;
  private pinEpoch=0;
  /** Draw frame whose view the published set was built from. */
  private publishedFrame=0;
  private publishedKey='';
  private disposed=false;
  private reason='no-context';
  private readonly scratch={position:new THREE.Vector3(),quaternion:new THREE.Quaternion(),yaw:new THREE.Quaternion(),scale:new THREE.Vector3(),up:new THREE.Vector3(),matrix:new THREE.Matrix4(),color:new THREE.Color()};
  private stats={cells:0,samples:0,rescatters:0,cameraCulled:0,shadowOnly:0,nearUnculled:0,budgetDrops:0,nearDrops:0,drawn:[0,0,0],draws:0,triangles:0,rebuilds:0,updateMs:0,processMs:0,drawMs:0,rescatterMs:0,
    drawUnits:0,drawCells:0,drawRocks:0,drawCellsSkipped:0,drawCellsCulled:0,jobsStarted:0,publishedThisFrame:0,publishInstances:0,publishDeferred:0,lastJobFrames:0,maxJobFrames:0,maxDrawUnits:0,stale:false};
  /** Per update (enabled or not): total, process and draw ms, draw units, and
   * whether the rock gate was open. Job frame spans are recorded at publish. */
  private history={update:new WorkRing(ROCK_WORK_HISTORY),process:new WorkRing(ROCK_WORK_HISTORY),draw:new WorkRing(ROCK_WORK_HISTORY),
    units:new WorkRing(ROCK_WORK_HISTORY),enabled:new WorkRing(ROCK_WORK_HISTORY),jobFrames:new WorkRing(ROCK_WORK_HISTORY)};
  constructor(options:PlanetRocksOptions){
    this.options=options;this.body=options.body;
    this.drawUnitsPerFrame=Math.max(1,Math.floor(options.drawUnitsPerFrame??ROCK_DRAW_UNITS_PER_FRAME));
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
  /** Old batches are released before the first new mesh is built, so only one
   * batch set and one mesh-construction transient are ever reachable. */
  private rebuildBatches(){
    this.disposeBatches();this.shapes=[];
    this.familyRgb=new Float64Array(this.families.length*3);
    this.families.forEach((family,f)=>{
      const rgb=this.scratch.color.set(family.color);this.familyRgb.set([rgb.r,rgb.g,rgb.b],f*3);
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
        this.batches.push({mesh,material,detail,family:f,lod,capacity,triangles:data.triangles,geometryBytes:rockMeshBytes(data),count:0,
          staged:new Array<RuntimeRock|null>(capacity).fill(null),stagedCount:0,published:new Array<RuntimeRock|null>(capacity).fill(null)});
      }
    });
    this.publishedKey='';
  }
  private batchIndex(family:number,variant:number,lod:number){return (family*ROCK_VARIANTS+variant)*ROCK_LOD_COUNT+lod;}
  private disposeBatches(){
    this.cancelJob();
    for(const b of this.batches){this.group.remove(b.mesh);b.mesh.geometry.dispose();b.material.dispose();b.mesh.dispose();}
    this.batches=[];
  }
  private clearResidents(){
    for(const t of this.tiers){t.residents.clear();t.wanted=[];t.records=[];t.queue=[];t.queueIndex=0;t.valid=false;t.truncated=0;}
    this.residentsVersion++;
    // Residents from another date, sea level or family set must not stay drawn.
    this.cancelJob();this.unpublish();
  }
  private cancelJob(){
    if(!this.job)return;
    this.job=null;
    for(const b of this.batches){b.staged.fill(null,0,b.stagedCount);b.stagedCount=0;}
  }
  private unpublish(){
    for(const b of this.batches){b.published.fill(null,0,b.count);b.count=0;b.mesh.count=0;b.mesh.visible=false;}
    const s=this.stats;
    s.drawn=[0,0,0];s.draws=0;s.triangles=0;s.cameraCulled=0;s.shadowOnly=0;s.nearUnculled=0;s.budgetDrops=0;s.nearDrops=0;
    this.publishedKey='';
  }
  private hide(){this.cancelJob();this.unpublish();this.group.visible=false;}
  update(input:RockUpdate){
    if(this.disposed)return;
    const started=performance.now(),s=this.stats;
    this.originRebased=false;s.cells=0;s.samples=0;s.processMs=0;s.drawMs=0;s.rescatterMs=0;
    s.drawUnits=0;s.drawCells=0;s.drawRocks=0;s.drawCellsSkipped=0;s.drawCellsCulled=0;s.jobsStarted=0;s.publishedThisFrame=0;s.publishInstances=0;
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
      this.origin.copy(eye);this.originReady=true;this.originVersion++;this.originRebased=true;
    }
    const focus=input.focus.clone().normalize();
    this.rescatter(focus,input.altitudeM);
    const p0=performance.now();this.process(focus);s.processMs=performance.now()-p0;
    const d0=performance.now();
    if(input.frusta.length)this.draw(eye,input.frusta,input.shadowFrustum??null);else this.hide();
    s.drawMs=performance.now()-d0;
    return this.finish(started);
  }
  private finish(started:number){
    const s=this.stats,h=this.history;s.updateMs=performance.now()-started;
    h.update.push(s.updateMs);h.process.push(s.processMs);h.draw.push(s.drawMs);h.units.push(s.drawUnits);h.enabled.push(this.reason==='ok'?1:0);
  }
  /** Clears the per-frame work history (a new measurement window). */
  resetWorkHistory(){for(const ring of Object.values(this.history))ring.clear();}
  /** Percentiles of the recorded per-update work. `enabledFrames` counts
   * updates with the gate open; `overTarget` counts updates whose draw
   * traversal (or total rock update) exceeded ROCK_DRAW_TARGET_MS. */
  workSummary(){
    const h=this.history,update=h.update.list(),draw=h.draw.list(),enabled=h.enabled.list();
    const over=(values:number[])=>values.reduce((a,v)=>a+(v>ROCK_DRAW_TARGET_MS?1:0),0);
    const enabledDraw=draw.filter((_,i)=>enabled[i]===1),enabledUpdate=update.filter((_,i)=>enabled[i]===1);
    return {historyLimit:ROCK_WORK_HISTORY,targetMs:ROCK_DRAW_TARGET_MS,
      targetNote:'configured rock work guard used as the per-frame traversal target; not an accepted frame budget',
      frames:update.length,enabledFrames:enabledDraw.length,
      updateMs:workPercentiles(enabledUpdate),processMs:workPercentiles(h.process.list().filter((_,i)=>enabled[i]===1)),drawMs:workPercentiles(enabledDraw),
      drawUnits:workPercentiles(h.units.list().filter((_,i)=>enabled[i]===1)),
      overTarget:{draw:over(enabledDraw),update:over(enabledUpdate)},
      jobFrames:workPercentiles(h.jobFrames.list())};
  }
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
    state.records=cells.map(c=>state.residents.get(c.id)??null);
    state.queue=[];state.records.forEach((record,i)=>{if(!record)state.queue.push(i);});state.queueIndex=0;
    const wanted=new Set(cells.map(c=>c.id)),keep=(tier.rangeM+2*tier.marginM)/r;
    // Retained (unwanted) cells are a cache: evict them until every queued
    // wanted cell can resolve without the tier exceeding its resident cap.
    for(const [id,record] of state.residents){
      if(wanted.has(id))continue;
      const d=record.cell.direction;
      if(state.residents.size+state.queue.length>tier.residentCap||Math.hypot(d[0]-focus.x,d[1]-focus.y,d[2]-focus.z)>keep){
        state.residents.delete(id);for(const rock of record.rocks)rock.evicted=true;
      }
    }
    this.retargetJob(best);
    // A new wanted list changes what a draw job walks, even without eviction.
    this.residentsVersion++;
    this.stats.rescatters++;this.stats.rescatterMs=performance.now()-started;
  }
  /** Keeps a running job from holding evicted records after a rescatter of
   * tier `t`. An unwalked tier switches to the new list; a walked tier has
   * already released its list; the tier being walked keeps its order but
   * loses walked and evicted entries. The job's outcome is then that of a
   * flat pass over the resident records at walk time. */
  private retargetJob(t:number){
    const job=this.job,state=this.tiers[t]!;if(!job||job.tier>t||job.records[t]===state.records)return;
    if(job.tier<t){job.records[t]=state.records;return;}
    const list=job.records[t]!;
    for(let i=0;i<list.length;i++){const rec=list[i];if(rec&&(i<job.index||state.residents.get(rec.cell.id)!==rec))list[i]=null;}
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
        while(state.queueIndex<state.queue.length&&state.records[state.queue[state.queueIndex]!])state.queueIndex++;
        const index=state.queue[state.queueIndex];if(index===undefined)return;
        const cell=state.wanted[index]!;
        const d=cell.direction,s=Math.hypot(d[0]-focus.x,d[1]-focus.y,d[2]-focus.z)*r/ROCK_TIERS[i]!.rangeM;
        if(s<score){score=s;pick=i;}
      });
      if(pick<0)break;
      const state=this.tiers[pick]!,index=state.queue[state.queueIndex++]!,cell=state.wanted[index]!,tier=ROCK_TIERS[pick]!;
      const result=rocksForCell(ctx,tier,cell.id);
      this.stats.cells++;this.stats.samples+=result.samples;
      this.adoptCell(pick,index,result.rocks);
    }
  }
  /** Stores one resolved canonical cell with its culling bounds. The saturated
   * CPU fixture also adopts synthetic canonical-shaped cells through here. */
  private adoptCell(tierIndex:number,index:number,rocks:readonly RockInstance[]){
    const state=this.tiers[tierIndex]!,cell=state.wanted[index]!,r=this.body.radiusM,n=rocks.length;
    const runtime:RuntimeRock[]=[],cull=n?new Float64Array(n*CULL_STRIDE):EMPTY_CULL;
    let bx=0,by=0,bz=0,centreRadius=0,boundRadius=0,maxDiameterM=0;
    rocks.forEach((rock,i)=>{
      const family=this.families.findIndex(f=>f.id===rock.familyId),shape=this.shapes[family*ROCK_VARIANTS+rock.variant]!;
      const g=1+rock.groundHeightM/r,[dx,dy,dz]=rock.direction,[ux,uy,uz]=rock.up,o=i*CULL_STRIDE;
      const centreM=shape.boundCenterY*rock.diameterM*rock.aspect[1]-rock.sinkM;
      cull[o]=dx*g+ux*centreM/r;cull[o+1]=dy*g+uy*centreM/r;cull[o+2]=dz*g+uz*centreM/r;cull[o+3]=rock.diameterM;
      cull[o+4]=shape.boundRadius*rock.diameterM*Math.max(rock.aspect[0],rock.aspect[1],rock.aspect[2])/r;
      cull[o+5]=this.batchIndex(family,rock.variant,0);
      bx+=cull[o]!;by+=cull[o+1]!;bz+=cull[o+2]!;maxDiameterM=Math.max(maxDiameterM,rock.diameterM);
      runtime.push({...rock,matrix:new Float32Array(16),originVersion:-1,evicted:false,mark:0});
    });
    if(n){
      bx/=n;by/=n;bz/=n;
      for(let o=0;o<cull.length;o+=CULL_STRIDE){
        const d=Math.sqrt((cull[o]!-bx)**2+(cull[o+1]!-by)**2+(cull[o+2]!-bz)**2);
        centreRadius=Math.max(centreRadius,d);boundRadius=Math.max(boundRadius,d+cull[o+4]!);
      }
    }
    const record:CellRecord={tier:tierIndex,cell,rocks:runtime,cull,bx,by,bz,
      centreRadius:centreRadius*(1+1e-9)+BOUND_EPSILON,boundRadius:boundRadius*(1+1e-9)+BOUND_EPSILON,maxDiameterM};
    state.residents.set(cell.id,record);state.records[index]=record;
    this.residentsVersion++;
    return record;
  }
  private writeMatrix(rock:RuntimeRock,origin:THREE.Vector3,originVersion:number){
    const s=this.scratch,r=this.body.radiusM;
    s.up.set(...rock.up);
    s.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP,s.up);
    s.yaw.setFromAxisAngle(s.up,rock.yaw);s.quaternion.premultiply(s.yaw);
    const g=1+rock.groundHeightM/r;
    s.position.set(rock.direction[0]*g,rock.direction[1]*g,rock.direction[2]*g).addScaledVector(s.up,-rock.sinkM/r).sub(origin);
    s.scale.set(rock.diameterM*rock.aspect[0]/r,rock.diameterM*rock.aspect[1]/r,rock.diameterM*rock.aspect[2]/r);
    s.matrix.compose(s.position,s.quaternion,s.scale);
    rock.matrix.set(s.matrix.elements);rock.originVersion=originVersion;
  }
  /** Bounded, incremental draw. A job snapshots the view and walks the wanted
   * cells in canonical order (tiers, then nearest-first). Each frame it
   * spends at most `drawUnitsPerFrame` units, plus at most one cell's slots.
   * A walked job is published atomically, one unit per copied instance, when
   * that fits the rest of the frame or is the frame's first work. Until then
   * the previous set stays drawn at its own origin. View or resident changes
   * never restart a running job, so continuous motion cannot starve it. */
  private draw(eye:THREE.Vector3,frusta:readonly THREE.Frustum[],shadow:THREE.Frustum|null){
    const r=this.body.radiusM,q=(x:number)=>Math.round(x*r*20);
    // Planes are keyed by their normal (1e-4) and their signed distance from
    // the eye in metres (1 cm), never by their constant about the planet
    // centre: that constant is -n.eye, so a 1e-6 rad drift of a plane through
    // the eye moves it by ~5 m on a 5,000 km body. A slowly settling camera
    // turn then restarted a full draw traversal every frame while the view
    // looked still. A plane that cannot reject any rock within reach of the
    // eye is keyed as '*': at astronomical far/near ratios the far plane's
    // extracted normal is floating-point noise that changes frame to frame
    // (both found on the living planet, 2026-09-29).
    const reach=ROCK_KEY_PLANE_REACH_M/r;
    // Integer steps (`||0` folds -0), so values near zero do not flip between
    // "-0.00" and "0.00" spellings.
    const step=(v:number,scale:number)=>Math.round(v*scale)||0;
    const planes=(f:THREE.Frustum|null)=>f?f.planes.map(p=>{
      const d=p.normal.dot(eye)+p.constant;
      return d>reach?'*':`${step(p.normal.x,1e4)},${step(p.normal.y,1e4)},${step(p.normal.z,1e4)},${step(d*r,100)}`;
    }).join(';'):'';
    const key=`${this.residentsVersion}|${this.originVersion}|${q(eye.x)},${q(eye.y)},${q(eye.z)}|${frusta.map(planes).join('/')}|${planes(shadow)}`;
    this.group.visible=true;
    const full=this.drawUnitsPerFrame,frame=++this.drawFrame;
    let budget=full;
    // At most two jobs touch a frame: one finishing, one starting on the latest view.
    for(let jobs=0;jobs<2;jobs++){
      if(!this.job){
        if(key===this.publishedKey||budget<=0)break;
        this.job=this.startJob(key,eye,frusta,shadow);
      }
      const job=this.job;
      if(job.frame!==frame){job.frame=frame;job.frames++;}
      if(job.tier<ROCK_TIERS.length){budget-=this.stepJob(job,budget);if(job.tier<ROCK_TIERS.length)break;}
      const copies=job.drawn[0]+job.drawn[1]+job.drawn[2];
      if(copies>budget&&budget<full){this.stats.publishDeferred++;break;}
      budget-=copies;this.stats.drawUnits+=copies;
      this.publish(job);
    }
    this.stats.maxDrawUnits=Math.max(this.stats.maxDrawUnits,this.stats.drawUnits);
    this.stats.stale=key!==this.publishedKey;
  }
  private startJob(key:string,eye:THREE.Vector3,frusta:readonly THREE.Frustum[],shadow:THREE.Frustum|null):DrawJob{
    this.stats.jobsStarted++;
    return {key,ex:eye.x,ey:eye.y,ez:eye.z,cameras:frusta.map(framePlanes),shadow:shadow?framePlanes(shadow):null,
      origin:this.origin.clone(),originVersion:this.originVersion,records:this.tiers.map(t=>t.records),tier:0,index:0,frames:0,frame:0,startFrame:this.drawFrame,
      drawn:[0,0,0],culled:0,shadowOnly:0,near:0,drops:0,nearDrops:0};
  }
  /** Returns units spent. Per-rock outcomes equal a flat per-rock pass. Cell
   * bounds only skip rocks that every per-rock test would reject, and only
   * accept rocks that every per-rock frustum test would accept. */
  private stepJob(job:DrawJob,budget:number){
    const r=this.body.radiusM,s=this.stats,ex=job.ex,ey=job.ey,ez=job.ez;
    let units=0;
    while(job.tier<ROCK_TIERS.length){
      const records=job.records[job.tier]!;
      // A walked tier's list is released so it cannot keep evicted records alive.
      if(job.index>=records.length){job.records[job.tier]=EMPTY_RECORDS;job.tier++;job.index=0;continue;}
      if(units>=budget)break;
      const tier=ROCK_TIERS[job.tier]!,record=records[job.index++];
      units++;s.drawCells++;
      if(!record||!record.rocks.length)continue;
      const cdx=record.bx-ex,cdy=record.by-ey,cdz=record.bz-ez,centre=Math.sqrt(cdx*cdx+cdy*cdy+cdz*cdz);
      const nearestM=(centre-record.centreRadius)*r;
      if(nearestM>tier.rangeM||nearestM/Math.max(1e-3,record.maxDiameterM)>=ROCK_LOD_RATIOS[2]){s.drawCellsSkipped++;continue;}
      const near=nearestM<=ROCK_NEAR_UNCULLED_M;
      const camera=camerasSide(job.cameras,record.bx,record.by,record.bz,record.boundRadius);
      const shadow=job.shadow?sphereSide(job.shadow,record.bx,record.by,record.bz,record.boundRadius):-1;
      if(camera<0&&shadow<0&&!near){s.drawCellsCulled++;job.culled+=record.rocks.length;continue;}
      const cull=record.cull,n=record.rocks.length;
      units+=n;s.drawRocks+=n;
      for(let k=0,o=0;k<n;k++,o+=CULL_STRIDE){
        const x=cull[o]!,y=cull[o+1]!,z=cull[o+2]!,dx=x-ex,dy=y-ey,dz=z-ez,distanceM=Math.sqrt(dx*dx+dy*dy+dz*dz)*r;
        const lod=rockLod(distanceM,cull[o+3]!,tier.rangeM);if(lod<0)continue;
        const band=lod as RockLod,radius=cull[o+4]!,close=distanceM<=ROCK_NEAR_UNCULLED_M;
        if(close)job.near++;
        else if(camera<1&&(camera<0||camerasSide(job.cameras,x,y,z,radius)<0)){
          if(band===2||shadow<0||(shadow===0&&sphereSide(job.shadow!,x,y,z,radius)<0)){job.culled++;continue;}
          job.shadowOnly++;
        }
        const batch=this.batches[cull[o+5]!+band]!;
        // Near rocks bypass the LOD caps; only a full batch can refuse them.
        if(batch.stagedCount>=batch.capacity||(!close&&job.drawn[band]>=ROCK_LOD_CAPS[band]!)){job.drops++;if(close)job.nearDrops++;continue;}
        const rock=record.rocks[k]!;
        if(rock.originVersion!==job.originVersion)this.writeMatrix(rock,job.origin,job.originVersion);
        batch.staged[batch.stagedCount++]=rock;job.drawn[band]++;
      }
    }
    s.drawUnits+=units;
    return units;
  }
  /** Copies staged rocks into the instance buffers and swaps the reference
   * slots: the LOD caps (4,096) plus near rocks, never above ROCK_PUBLISH_MAX. */
  private publish(job:DrawJob){
    let draws=0,triangles=0;
    for(const b of this.batches){
      const matrices=b.mesh.instanceMatrix.array as Float32Array,colors=b.mesh.instanceColor!.array as Float32Array,detail=b.detail.array as Float32Array;
      for(let i=0;i<b.stagedCount;i++){
        const rock=b.staged[i]!,t=rock.tint,f=b.family*3;
        matrices.set(rock.matrix,i*16);
        colors[i*3]=this.familyRgb[f]!*t[0];colors[i*3+1]=this.familyRgb[f+1]!*t[1];colors[i*3+2]=this.familyRgb[f+2]!*t[2];
        detail[i*2]=rock.diameterM;detail[i*2+1]=(rock.yaw*97.13)%61;
      }
      this.stats.publishInstances+=b.stagedCount;
      // The old published slots become the next staging area. They are cleared
      // so they cannot keep evicted records alive.
      b.published.fill(null,0,b.count);
      [b.published,b.staged]=[b.staged,b.published];
      b.count=b.stagedCount;b.stagedCount=0;
      b.mesh.count=b.count;b.mesh.visible=b.count>0;
      if(!b.count)continue;
      draws++;triangles+=b.count*b.triangles;
      for(const [attribute,size] of [[b.mesh.instanceMatrix,16],[b.mesh.instanceColor!,3],[b.detail,2]] as const){
        attribute.clearUpdateRanges();attribute.addUpdateRange(0,b.count*size);attribute.needsUpdate=true;
      }
    }
    this.group.position.copy(job.origin);
    const s=this.stats;
    Object.assign(s,{drawn:[...job.drawn],draws,triangles,cameraCulled:job.culled,shadowOnly:job.shadowOnly,nearUnculled:job.near,budgetDrops:job.drops,nearDrops:job.nearDrops});
    s.rebuilds++;s.publishedThisFrame++;s.lastJobFrames=job.frames;this.history.jobFrames.push(job.frames);s.maxJobFrames=Math.max(s.maxJobFrames,job.frames);
    this.publishedKey=job.key;this.publishedFrame=job.startFrame;this.job=null;
  }
  /** Remaining cells in the running draw job, and an upper bound on its
   * units including the publish copies (staged so far plus every rock left). */
  private drawBacklog(){
    const job=this.job;if(!job)return {cells:0,unitsMax:0,awaitingPublish:false};
    let cells=0,rocks=0;
    for(let t=job.tier;t<ROCK_TIERS.length;t++){const n=job.records[t]!.length-(t===job.tier?job.index:0);cells+=n;rocks+=n*ROCK_TIERS[t]!.slots;}
    const staged=job.drawn[0]+job.drawn[1]+job.drawn[2];
    return {cells,unitsMax:cells+rocks+Math.min(ROCK_PUBLISH_MAX,staged+rocks),awaitingPublish:job.tier>=ROCK_TIERS.length};
  }
  /** Published rocks as sorted `id@lod` strings (tests and replay; not per frame). */
  publishedRocks(){
    const out:string[]=[];
    for(const b of this.batches)for(let i=0;i<b.count;i++)out.push(`${b.published[i]!.id}@${b.lod}`);
    return out.sort();
  }
  /** The published (drawn) rocks nearest a planet-local unit point, with the
   * canonical data acceptance needs to check scale, embedding and gating.
   * Explicit diagnostic call; never read per frame. */
  publishedRockProbe(eye:THREE.Vector3,limit=64){
    const r=this.body.radiusM,out:{rock:RuntimeRock;lod:RockLod;distanceM:number;heightM:number}[]=[];
    for(const b of this.batches)for(let i=0;i<b.count;i++){
      const rock=b.published[i]!,g=1+rock.groundHeightM/r,d=rock.direction;
      const distanceM=Math.hypot(d[0]*g-eye.x,d[1]*g-eye.y,d[2]*g-eye.z)*r;
      const family=this.families.findIndex(f=>f.id===rock.familyId),shape=this.shapes[family*ROCK_VARIANTS+rock.variant];
      out.push({rock,lod:b.lod,distanceM,heightM:(shape?.height??0)*rock.diameterM*rock.aspect[1]});
    }
    out.sort((a,b)=>a.distanceM-b.distanceM||(a.rock.id<b.rock.id?-1:1));
    return out.slice(0,Math.max(0,limit)).map(({rock,lod,distanceM,heightM})=>({id:rock.id,tier:rock.tier,form:rock.form,familyId:rock.familyId,variant:rock.variant,lod,
      distanceM,diameterM:rock.diameterM,widthM:rock.diameterM*Math.max(rock.aspect[0],rock.aspect[2]),heightM,sinkM:rock.sinkM,groundHeightM:rock.groundHeightM,
      direction:[...rock.direction] as V3,up:[...rock.up] as V3,aspect:[...rock.aspect] as V3,yaw:rock.yaw}));
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
  /** Rock-owned bytes. Geometry and instance buffers count twice: CPU arrays
   * plus equal-sized GPU buffers. Reference slots, the draw job and records
   * are estimates of JS heap. Shared PBR textures are excluded
   * (`textures: 0`); the terrain lease accounts for them once. */
  ownedBytes(){
    let geometry=0,instances=0,slots=0,rocks=0,cells=0,wanted=0,pinned=0;
    const epoch=++this.pinEpoch,pin=(rock:RuntimeRock)=>{if(rock.evicted&&rock.mark!==epoch){rock.mark=epoch;pinned++;}};
    for(const b of this.batches){
      geometry+=b.geometryBytes;instances+=b.capacity*INSTANCE_STRIDE_BYTES;slots+=b.staged.length+b.published.length;
      for(let i=0;i<b.count;i++)pin(b.published[i]!);
      for(let i=0;i<b.stagedCount;i++)pin(b.staged[i]!);
    }
    for(const state of this.tiers){wanted+=state.wanted.length;cells+=state.residents.size;for(const record of state.residents.values())rocks+=record.rocks.length;}
    const records=cells*ROCK_CELL_RECORD_BYTES+rocks*ROCK_RECORD_BYTES,surfaceCells=(wanted+cells)*ROCK_SURFACE_CELL_BYTES,pinnedBytes=pinned*ROCK_RECORD_BYTES;
    const staging=slots*ROCK_REF_BYTES,job=this.job?ROCK_DRAW_JOB_BYTES:0,total=2*(geometry+instances)+staging+job+surfaceCells+records+pinnedBytes;
    // Transients exist only inside update(); they are reserved, never live here.
    const transient=this.disposed?0:ROCK_TRANSIENT_BYTES;
    return {geometry:2*geometry,instances:2*instances,staging,job,surfaceCells,records,pinned:pinnedBytes,textures:0,total,transient,peak:total+transient,
      wantedCells:wanted,residentCells:cells,residentRocks:rocks,pinnedRocks:pinned};
  }
  diagnostics(){
    const bytes=this.ownedBytes(),backlog=this.drawBacklog(),s=this.stats;
    return {version:ROCK_FIELD_VERSION,geometryVersion:ROCK_GEOMETRY_VERSION,materialVersion:ROCK_MATERIAL_VERSION,
      enabled:this.reason==='ok',reason:this.reason,
      representation:'canonical-cell-rocks/shared-procedural-lod-instanced',
      families:this.families.map(f=>({id:f.id,form:f.form,scaleM:f.scaleM})),
      tiers:ROCK_TIERS.map((tier,i)=>{const t=this.tiers[i]!;let rocks=0;for(const rec of t.residents.values())rocks+=rec.rocks.length;
        return {id:tier.id,cellSizeM:tier.cellSizeM,rangeM:tier.rangeM,wanted:t.wanted.length,resident:t.residents.size,pending:Math.max(0,t.queue.length-t.queueIndex),truncated:t.truncated,rocks};}),
      drawn:{lod0:s.drawn[0],lod1:s.drawn[1],lod2:s.drawn[2],total:s.drawn[0]!+s.drawn[1]!+s.drawn[2]!},
      draws:s.draws,batches:this.batches.length,triangles:s.triangles,cameraCulled:s.cameraCulled,shadowOnly:s.shadowOnly,nearUnculled:s.nearUnculled,budgetDrops:s.budgetDrops,nearDrops:s.nearDrops,
      caps:{lod:[...ROCK_LOD_CAPS],batchCapacity:[...ROCK_BATCH_CAPACITY],residentCells:ROCK_TIERS.map(t=>t.residentCap),cellsPerFrame:ROCK_CELLS_PER_FRAME,samplesPerFrame:ROCK_SAMPLES_PER_FRAME,
        workBudgetMs:ROCK_WORK_BUDGET_MS,workBudgetNote:'configured process time guard; not a measured or accepted frame budget',
        drawUnitsPerFrame:this.drawUnitsPerFrame,publishMax:ROCK_PUBLISH_MAX,nearUnculledM:ROCK_NEAR_UNCULLED_M,maxAltitudeM:ROCK_MAX_ALTITUDE_M},
      bytes:{...bytes,budget:ROCK_BUDGET_BYTES,worstCase:ROCK_WORST_CASE_BYTES,
        texturesNote:'shared terrain rock PBR lease; accounted once by terrain groundPbrTextureBytes',
        geometryNote:'CPU arrays + equal-sized GPU buffers, from array sizes',recordsNote:'estimated JS heap (V8-calibrated)',
        stagingNote:'estimated staged + published reference slots',pinnedNote:'estimated heap of evicted rocks still referenced by staged/published slots, each counted once',transientNote:'reserved rescatter + mesh-construction peak inside update(); not live between frames'},
      originVersion:this.originVersion,originRebased:this.originRebased,originRebaseM:ROCK_ORIGIN_REBASE_M,
      work:{updateMs:s.updateMs,rebuilds:s.rebuilds,
        process:{cells:s.cells,samples:s.samples,ms:s.processMs,pendingCells:this.tiers.reduce((a,t)=>a+Math.max(0,t.queue.length-t.queueIndex),0),rescatters:s.rescatters,rescatterMs:s.rescatterMs},
        draw:{units:s.drawUnits,maxUnits:s.maxDrawUnits,cells:s.drawCells,rocks:s.drawRocks,cellsSkipped:s.drawCellsSkipped,cellsCulled:s.drawCellsCulled,ms:s.drawMs,
          jobsStarted:s.jobsStarted,published:s.publishedThisFrame,publishInstances:s.publishInstances,publishes:s.rebuilds,publishDeferred:s.publishDeferred,
          pending:!!this.job,pendingCells:backlog.cells,pendingUnitsMax:backlog.unitsMax,awaitingPublish:backlog.awaitingPublish,jobFrames:this.job?.frames??0,publishedAgeFrames:this.publishedKey?this.drawFrame-this.publishedFrame:null,lastJobFrames:s.lastJobFrames,maxJobFrames:s.maxJobFrames,stale:s.stale}},
      collision:ROCK_COLLISION_NOTE};
  }
  dispose(){
    if(this.disposed)return;
    this.disposed=true;this.disposeBatches();
    // Wanted lists, records and queues go too, so nothing rock-owned stays reachable.
    this.clearResidents();
    this.group.removeFromParent();
  }
}
