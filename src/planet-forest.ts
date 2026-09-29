import * as THREE from 'three';
import {forestMaterial,forestDepthMaterial} from './forest-material.ts';
import {createLegacyTreeGeometry as treeGeometry,treeQuaternion} from './tree-shape.ts';
import {PlanetCanopy,forestCellPatchKey} from './planet-canopy.ts';
import {quantizeForestCoverage} from './forest-coverage.ts';
import {systemTimer} from './render-profile.ts';
import {type Body,type V3} from './catalog.ts';
import {terrainSampler} from './terrain.ts';
import {biomeClassifier} from './surface-biomes.ts';
import {forestPopulationCells,FAR_CROWN_PROBABILITY,type PopulationCell} from './planet-population.ts';
import {forestHabitat,TREE_HABITAT_VERSION} from './forest-habitat.ts';
import type {ForestSelectionCache} from './forest-selection-cache.ts';
import {unpackForestSelection} from './forest-selection-transfer.ts';
import {PLANET_DETAIL as B} from './planet-detail.ts';
import {InstanceUpdateRanges as DirtyRange} from './instance-update-ranges.ts';
import type {Species} from './biosphere-model.ts';
import type {TreeAssetFamily,TreeAssetOptions} from './tree-asset.ts';
import {forestTreeCatalogue,type ForestTreeBinding} from './forest-tree-catalogue.ts';
import {ForestTreeFamilyLibrary,type ForestTreeFamilyInput,type ForestTreeFamilyEntry} from './forest-tree-family-library.ts';
import {ForestPatchBroadphase} from './forest-patch-broadphase.ts';
import {ForestOrderedWorkIndex} from './forest-ordered-work.ts';
import {forestPresentationFamily,packForestPresentation,FOREST_PRESENTATION_VERSION} from './forest-presentation.ts';
import {FOREST_VARIANT_VERSION,FOREST_VARIANT_COUNT} from './tree-structural-variant.ts';
import type {ForestFamilyPresentation} from './forest-impostor.ts';
import type {ForestTreeKind} from './forest-tree-family-library.ts';
import {ForestFarAtlas,FOREST_FAR_ATLAS_VERSION,FOREST_FAR_ATLAS_VIEWS} from './forest-far-atlas.ts';
import {forestMemoryFootprint,forestMeshBufferFootprint,forestTextureFootprint} from './forest-resource-accounting.ts';
import {forestFamilyBoundRadius,forestTreeDimensions,legacyTreeBoundSphere,unpackTreeAllometryRatios,TREE_ALLOMETRY_IDENTITY_CODE,TREE_ALLOMETRY_VERSION,
  TREE_ALLOMETRY_CARD,TREE_FAMILY_ALLOMETRY_ENVELOPE,TREE_LEGACY_ALLOMETRY_ENVELOPE,type ForestTreeDimensions,type TreeAllometryReason} from './tree-allometry.ts';

type Resident={cell:PopulationCell;height:number;present:boolean;water:number;patchKey?:string};
type TreeLoader=(a:ArrayBuffer,b:ArrayBuffer,options:TreeAssetOptions)=>Promise<TreeAssetFamily>;
type AssetSlot={resident:Resident;originVersion:number;catalogueVersion:number;dimensions:ForestTreeDimensions};
const loadTreeFamily:TreeLoader=async(a,b,options)=>(await import('./tree-asset.ts')).loadTreeAssetFamily(a,b,options);

type BatchUpdates={residents:Resident[];originVersions:number[];dimensions:ForestTreeDimensions[];slots:Map<string,number>;wanted:Resident[];wantedCoverage:number[];wantedIds:Set<string>;matrix:DirtyRange;color:DirtyRange;coverage:DirtyRange;seed:DirtyRange;allometry:DirtyRange};
const batchUpdates=():BatchUpdates=>({residents:[],originVersions:[],dimensions:[],slots:new Map(),wanted:[],wantedCoverage:[],wantedIds:new Set(),matrix:new DirtyRange(),color:new DirtyRange(),coverage:new DirtyRange(),seed:new DirtyRange(),allometry:new DirtyRange()});
type AllometryTally={representation:{family:number;legacy:number};reasons:Partial<Record<TreeAllometryReason,number>>;renderedHeightRangeM:[number,number]|null};
const allometryTally=():AllometryTally=>({representation:{family:0,legacy:0},reasons:{},renderedHeightRangeM:null});
function tallyAllometry(tally:AllometryTally,dimensions:ForestTreeDimensions){
  tally.representation[dimensions.representation]++;
  for(const reason of dimensions.reasons)tally.reasons[reason]=(tally.reasons[reason]??0)+1;
  const range=tally.renderedHeightRangeM;
  tally.renderedHeightRangeM=range?[Math.min(range[0],dimensions.heightM),Math.max(range[1],dimensions.heightM)]:[dimensions.heightM,dimensions.heightM];
}
/** Views baked per rendered frame (two small scratch renders plus mip copies
 * each); 81 views per family complete in 27 frames per family. Families are
 * baked one after another. */
export const FOREST_FAR_ATLAS_VIEWS_PER_FRAME=3;
/** One structural choice per canonical individual: the dated binding's bounded
 * variant, applied only when the adopted family carries that pool member. */
function familyVariant(binding:ForestTreeBinding,presentation:{structuralVariants?:readonly unknown[]}){
  const variant=binding.appearance.variant;
  return variant<(presentation.structuralVariants?.length??0)?variant+1:0;
}
function packFamilyPresentation(kind:ForestTreeKind,binding:ForestTreeBinding,presentation:ForestFamilyPresentation){
  // Far code carries pool index; code index 0 with an empty pool is authored structure.
  const variant=familyVariant(binding,presentation);
  return packForestPresentation(kind,binding.appearance.barkBrightness,binding.appearance.foliageBrightness,Math.max(0,variant-1));
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
  private patchBroadphase:ForestPatchBroadphase;
  private workIndex:ForestOrderedWorkIndex;
  private broadphaseSelectionReady=false;
  private workStateVersion=0;
  private workBuiltStateVersion=-1;
  // Diagnostic-only revisions distinguish why the retained far-work list is rebuilt.
  private workSelectionRevision=0;
  private workHabitatRevision=0;
  private workGlobalHabitatRevision=0;
  private workBuiltSelectionRevision=-1;
  private workBuiltHabitatRevision=-1;
  private workBuiltGlobalHabitatRevision=-1;
  private workBuiltCanopyEpoch=-2;
  private workRefreshReasons={initial:0,selection:0,habitat:0,canopy:0,movement:0,selectionMismatch:0,incrementalPatch:0};
  private workCanopyRevision=-2;
  private workReferenceEye=new THREE.Vector3();
  private workReferenceEyeReady=false;
  private workListRefreshes=0;
  private immersiveMaterial=false;
  private origin=new THREE.Vector3();
  private originReady=false;
  private originVersion=0;
  private updates:BatchUpdates[]=[batchUpdates(),batchUpdates(),batchUpdates()];
  private sample:ReturnType<typeof terrainSampler>;
  private classify:ReturnType<typeof biomeClassifier>;
  private habitat:ReturnType<typeof forestHabitat>;
  private water=NaN;
  private sampledRivers:Body['canonicalRivers'];private sampledHydrology:Body['hydrology'];
  private matrix=new THREE.Matrix4();
  private position=new THREE.Vector3();
  private scale=new THREE.Vector3();
  private quaternion=new THREE.Quaternion();
  private yaw=new THREE.Quaternion();
  private direction=new THREE.Vector3();
  private color=new THREE.Color();
  private bounds=new THREE.Sphere();
  private disposed=false;
  private catalogueError='';
  private assets:ForestTreeFamilyLibrary<Resident,AssetSlot>;
  private assetCounts=[0,0];
  private catalogue=forestTreeCatalogue([]);
  private catalogueInput:readonly Species[]|undefined;
  private catalogueVersion=0;
  private canopyPresentationKey='';
  private presentedFamilies=new Map<ForestTreeKind,ForestFamilyPresentation>();
  private bindings=new WeakMap<Resident,ForestTreeBinding|null>();
  // One rendered-dimension decision per resident for the current presentation key.
  private dimensionCache=new WeakMap<Resident,ForestTreeDimensions>();
  private nearAllometry=allometryTally();
  private farAllometry=allometryTally();
  private assetDraw=false;
  private farAtlases=new Map<ForestTreeKind,ForestFarAtlas>();
  private farAtlasRevision=-1;
  private farAtlasError='';
  private worldDate=0n;
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
    this.setWorkSelection(cells);
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
  private farWorkDiagnostics:Record<string,unknown>={selectionCells:0,groups:0,skippedGroups:0,skippedCells:0,activeCells:0,rebuilds:0};
  private originRebased=false;
  constructor(private body:Body,private treeLoader:TreeLoader=loadTreeFamily){
    this.patchBroadphase=new ForestPatchBroadphase(body.radiusM,forestCellPatchKey);
    this.workIndex=new ForestOrderedWorkIndex(forestCellPatchKey);
    this.assets=new ForestTreeFamilyLibrary(this.group,(a,b,options)=>this.treeLoader(a,b,options),resident=>resident.cell.id,[B.forestNearCapacity,B.forestCapacity]);
    this.sample=terrainSampler(body);this.classify=biomeClassifier(body);
    this.habitat=forestHabitat(this.sample,this.classify,body.radiusM);
    this.meshes=[B.forestNearCapacity,B.forestCapacity].map((capacity,i)=>{
      const mesh=new THREE.InstancedMesh(treeGeometry(i===0?1:0),
        forestMaterial(true),capacity);
      const coverage=new THREE.InstancedBufferAttribute(new Float32Array(capacity),1);coverage.setUsage(THREE.DynamicDrawUsage);mesh.geometry.setAttribute('instanceCoverage',coverage);this.coverage.push(coverage);
      mesh.geometry.setAttribute('instanceForestSeed',new THREE.InstancedBufferAttribute(new Uint16Array(capacity),1).setUsage(THREE.DynamicDrawUsage));
      mesh.geometry.setAttribute('instanceTreeAllometry',new THREE.InstancedBufferAttribute(new Float32Array(capacity),1).setUsage(THREE.DynamicDrawUsage));
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3).fill(1),3).setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled=false;mesh.count=0;
      mesh.castShadow=true;mesh.receiveShadow=true;mesh.customDepthMaterial=forestDepthMaterial();
      this.group.add(mesh);return mesh;
    });
    this.canopy=new THREE.InstancedMesh(treeGeometry(0),forestMaterial(true),B.canopyCapacity);
    this.canopyCoverage=new THREE.InstancedBufferAttribute(new Float32Array(B.canopyCapacity),1);this.canopyCoverage.setUsage(THREE.DynamicDrawUsage);this.canopy.geometry.setAttribute('instanceCoverage',this.canopyCoverage);
    this.canopy.geometry.setAttribute('instanceForestSeed',new THREE.InstancedBufferAttribute(new Uint16Array(B.canopyCapacity),1).setUsage(THREE.DynamicDrawUsage));
    this.canopy.geometry.setAttribute('instanceTreeAllometry',new THREE.InstancedBufferAttribute(new Float32Array(B.canopyCapacity),1).setUsage(THREE.DynamicDrawUsage));
    this.canopy.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.canopy.frustumCulled=false;this.canopy.count=0;
    this.canopy.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(B.canopyCapacity*3).fill(1),3).setUsage(THREE.DynamicDrawUsage);
    // Initial bufferData uploads the complete allocation. Drop its consumed
    // ranges as well as later partial uploads, so a first sparse edit does not
    // resend initialization ranges. Hidden batches retain pending work.
    for(const mesh of [...this.meshes,this.canopy])for(const attribute of [
      mesh.instanceMatrix,mesh.instanceColor!,
      mesh.geometry.getAttribute('instanceCoverage') as THREE.InstancedBufferAttribute,
      mesh.geometry.getAttribute('instanceForestSeed') as THREE.InstancedBufferAttribute,
      mesh.geometry.getAttribute('instanceTreeAllometry') as THREE.InstancedBufferAttribute,
    ])attribute.onUpload(()=>attribute.clearUpdateRanges());
    this.group.add(this.canopy);this.group.name='Continuous planetary forest';
    if(typeof Worker!=='undefined'){this.fullCanopy=new PlanetCanopy(body);this.group.add(this.fullCanopy.group);this.startWorker();}
  }
  private setWorkSelection(cells:readonly PopulationCell[]){
    this.workIndex.setSelection(cells);
    this.workStateVersion++;
    this.workSelectionRevision++;
    this.broadphaseSelectionReady=Number.isFinite(this.water);
    if(!this.broadphaseSelectionReady)return;
    this.patchBroadphase.setSelection(cells,this.water,cell=>{
      const resident=this.cache.get(cell.id);
      return resident&&resident.water===this.water?{groundHeightM:resident.height,water:resident.water}:null;
    });
  }
  /** Explicit local integration seam. Loading never changes canonical cells.
   * The previous renderer remains active until both new batches are ready. */
  async loadTreeAssets(a:ArrayBuffer,b:ArrayBuffer,options:TreeAssetOptions={}){
    return this.loadTreeFamilies([{kind:'branching',lod0:a,lod1:b}],options);
  }
  loadTreeFamilies(inputs:readonly ForestTreeFamilyInput[],options:TreeAssetOptions={}){
    return this.assets.replace(inputs,options);
  }
  clearTreeAssets(){
    this.assets.clear();
    this.assetCounts=[0,0];
  }
  /** Create one far-atlas bake per adopted family. The atlas is an attachment
   * of its library entry, so replace/clear/dispose release it (and detach it
   * from the far renderer) before the family geometry it was captured from. */
  private syncFarAtlases(){
    if(!this.fullCanopy||this.farAtlasRevision===this.assets.revision)return;
    this.farAtlasRevision=this.assets.revision;
    for(const [kind,entry] of this.assets.entries){
      const presentation=entry.family.canopyPresentation;
      if(!presentation?.enabled||this.farAtlases.has(kind))continue;
      let atlas:ForestFarAtlas;
      try{
        atlas=new ForestFarAtlas({kind,geometries:entry.family.lods[1].map(mesh=>mesh.geometry),
          variants:presentation.structuralVariants??[],cardScale:entry.family.lod1CardScale??1,
          createCaptureBatch:(lod,count)=>entry.family.createCaptureBatch(lod,count)});
      }catch(error){this.farAtlasError=String(error);continue;}
      const canopy=this.fullCanopy;
      this.farAtlases.set(kind,atlas);
      entry.attachments.push({dispose:()=>{
        if(canopy.renderer.familyAtlas(kind)===atlas)canopy.renderer.setFamilyAtlas(kind,null);
        if(this.farAtlases.get(kind)===atlas)this.farAtlases.delete(kind);
        atlas.dispose();
      }});
    }
  }
  /** Pre-render hook: bakes a bounded number of far-atlas views outside XR and
   * adopts each family's atlas once complete. Families draw the analytic
   * band fallback until then, and permanently if their bake fails. */
  renderFarAtlases(renderer:THREE.WebGLRenderer,xr=false){
    if(this.disposed||!this.fullCanopy)return;
    this.syncFarAtlases();
    if(xr)return;
    for(const [kind,atlas] of this.farAtlases){
      if(atlas.state!=='baking')continue;
      if(atlas.step(renderer,FOREST_FAR_ATLAS_VIEWS_PER_FRAME))this.fullCanopy.renderer.setFamilyAtlas(kind,atlas);
      else if(atlas.error)this.farAtlasError=`${kind}: ${atlas.error}`;
      break;
    }
  }
  /** What the far canopy actually draws for the presented families. */
  private farRepresentation(){
    const presented=[...this.presentedFamilies.keys()];
    if(!presented.length)return 'legacy-lobes';
    const adopted=presented.filter(kind=>this.adoptedFarAtlas(kind)).length;
    return adopted===presented.length?'captured-hemi-octahedral-atlas':adopted?'partial-atlas-with-band-fallback':'analytic-band-fallback';
  }
  // Diagnostics tolerate canopy hosts without a draw renderer, like the other optional host hooks.
  private adoptedFarAtlas(kind:ForestTreeKind){return !!this.fullCanopy?.renderer?.familyAtlas(kind);}
  private detailedSamples(){
    const samples=[];
    for(const entry of this.assets.entries.values())for(let batch=0;batch<2;batch++){
      if(!this.group.visible||!entry.batches[batch].group.visible)continue;
      let count=0;
      // Diagnostics are read by the live HUD. Bound both scans and output,
      // rather than allocating/filtering every resident on every read.
      const slots=entry.pools[batch].states;
      for(let index=0;index<Math.min(slots.length,64)&&count<8;index++){
        const slot=slots[index],binding=this.binding(slot.resident);if(!binding)continue;
        const d=slot.dimensions;
        samples.push({batch,family:entry.kind,id:slot.resident.cell.id,speciesId:binding.recipe.speciesId,
          recipe:binding.recipe.sourceFingerprint,canonicalHeightM:slot.resident.cell.heightM,heightM:d.heightM,
          crownWidthM:d.crownWidthM,trunkDiameterM:d.trunkDiameterM,crownRatio:d.crownRatio,trunkRatio:d.trunkRatio,cardScale:d.cardScale,ratioCode:d.ratioCode,
          allometryReasons:[...d.reasons],...binding.appearance,
          structuralVariant:familyVariant(binding,entry.family.canopyPresentation??{})-1});count++;
      }
    }
    return samples;
  }
  /** Whole-population acceptance census; an explicit call, never read by the
   * HUD. Every retained detailed slot per family and LOD contributes a record
   * of its canonical presentation to an order-independent digest, so a replay
   * can assert that the same trees reappear exactly, not just a bounded sample. */
  presentationCensus(){
    const hash=(text:string,seed:number)=>{let h=seed>>>0;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),0x01000193)>>>0;return h.toString(16).padStart(8,'0');};
    let eligible=0;for(const resident of this.cache.values())if(resident.present)eligible++;
    return {dateNs:this.worldDate.toString(),catalogueVersion:this.catalogueVersion,selected:this.wanted.length,eligible,
      farOwned:this.farOwnedSkipped,legacySubmitted:this.meshes.map(mesh=>mesh.visible?mesh.count:0),
      families:[...this.assets.entries.values()].map(entry=>({kind:entry.kind,lods:entry.pools.map((pool,lod)=>{
        const records:string[]=[],variants:Record<string,number>={};let unbound=0;
        for(const resident of pool.items){
          const binding=this.binding(resident);if(!binding){unbound++;continue;}
          const variant=familyVariant(binding,entry.family.canopyPresentation??{})-1,a=binding.appearance,d=this.dimensions(resident);
          records.push([resident.cell.id,binding.recipe.speciesId,binding.recipe.sourceFingerprint,resident.cell.heightM,variant,a.variant,a.windPhase01,a.barkBrightness,a.foliageBrightness,
            TREE_ALLOMETRY_VERSION,d.heightM,d.crownRatio,d.trunkRatio].join('|'));
          variants[variant]=(variants[variant]??0)+1;
        }
        const text=records.sort().join('\n');
        return {owned:pool.items.length,submitted:this.group.visible&&entry.batches[lod].group.visible?pool.items.length:0,unbound,
          variantHistogram:variants,digest:hash(text,0x811c9dc5)+hash(text,0x9747b28c)};
      })}))};
  }
  /** Bounded HUD scan: the first 512 retained slots per LOD. Index -1 is authored structure. */
  private variantHistogram(entry:ForestTreeFamilyEntry<Resident,AssetSlot>){
    const counts:Record<string,number>={};
    for(const pool of entry.pools)for(let index=0;index<Math.min(pool.items.length,512);index++){
      const binding=this.binding(pool.items[index]);if(!binding)continue;
      const key=String(familyVariant(binding,entry.family.canopyPresentation??{})-1);counts[key]=(counts[key]??0)+1;
    }
    return counts;
  }
  private setCatalogue(species:readonly Species[]|undefined){
    if(species===this.catalogueInput)return;
    this.catalogueInput=species;
    let next:ReturnType<typeof forestTreeCatalogue>;
    try{next=forestTreeCatalogue(species??[]);this.catalogueError='';}
    catch(error){
      // Reject malformed presentation data without interrupting the canonical
      // forest or retrying the same immutable dated snapshot every frame.
      this.catalogueError=String(error);next=forestTreeCatalogue([]);
    }
    if(next.signature===this.catalogue.signature)return;
    this.catalogue=next;this.catalogueVersion++;this.bindings=new WeakMap();this.dimensionCache=new WeakMap();
  }
  private binding(resident:Resident){
    if(!this.bindings.has(resident))this.bindings.set(resident,this.catalogue.resolve(resident.cell.id));
    return this.bindings.get(resident)??null;
  }
  private syncCanopyPresentation(){
    const key=`${FOREST_PRESENTATION_VERSION}/${FOREST_VARIANT_VERSION}/${TREE_ALLOMETRY_VERSION}/${this.catalogueVersion}/${this.assets.revision}/${Number(this.assetDraw)}`;
    if(key===this.canopyPresentationKey)return;
    const families=new Map<ForestTreeKind,ForestFamilyPresentation>();
    if(this.assetDraw)for(const [kind,entry] of this.assets.entries){
      const presentation=entry.family.canopyPresentation;
      if(presentation?.enabled)families.set(kind,presentation);
    }
    const catalogue=this.catalogue,far=allometryTally(),memo=new Map<string,ForestTreeDimensions>();
    this.fullCanopy?.setPresentation?.(key,(id,canonicalHeightM)=>{
      // Same decision as the near path: dated binding, then family reference.
      const binding=catalogue.resolve(id);
      const memoKey=binding?`${binding.recipe.speciesId}|${binding.recipe.sourceFingerprint}|${binding.appearance.variant}`:null;
      let d=memoKey?memo.get(memoKey):undefined;
      if(!d){d=forestTreeDimensions(binding,canonicalHeightM,families);if(memoKey)memo.set(memoKey,d);}
      tallyAllometry(far,d);
      const kind=forestPresentationFamily(d,families);
      return {code:kind&&binding?packFamilyPresentation(kind,binding,families.get(kind)!):0,heightM:d.heightM,ratioCode:d.ratioCode};
    },families);
    this.presentedFamilies=families;this.dimensionCache=new WeakMap();this.farAllometry=far;
    this.canopyPresentationKey=key;
  }
  /** Rendered dimensions of one canonical individual under the current key. */
  private dimensions(resident:Resident){
    let d=this.dimensionCache.get(resident);
    if(!d){d=forestTreeDimensions(this.binding(resident),resident.cell.heightM,this.presentedFamilies);this.dimensionCache.set(resident,d);}
    return d;
  }
  private expectedCanopyPresentation(resident:Resident){
    const binding=this.binding(resident),d=this.dimensions(resident),kind=forestPresentationFamily(d,this.presentedFamilies);
    return {code:kind&&binding?packFamilyPresentation(kind,binding,this.presentedFamilies.get(kind)!):0,heightM:d.heightM,ratioCode:d.ratioCode};
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
    const changed=updates.residents[index]!==resident,dimensions=this.dimensions(resident);
    if(changed||updates.originVersions[index]!==this.originVersion||updates.dimensions[index]!==dimensions){
      const {cell,height}=resident,r=this.body.radiusM;
      this.direction.set(...cell.direction);
      this.position.copy(this.direction).multiplyScalar(1+height/r).sub(this.origin);
      treeQuaternion(this.direction,cell.yaw,this.quaternion,this.yaw);
      // Uniform scale is the rendered height; the ratio attribute supplies the
      // primitive's crown and trunk proportions for the same physical widths.
      this.scale.setScalar(dimensions.heightM/r);
      this.matrix.compose(this.position,this.quaternion,this.scale);mesh.setMatrixAt(index,this.matrix);
      updates.matrix.include(index,16);updates.originVersions[index]=this.originVersion;this.matrixWrites++;
      if(updates.dimensions[index]!==dimensions){
        const allometry=mesh.geometry.getAttribute('instanceTreeAllometry') as THREE.InstancedBufferAttribute,value=dimensions.legacyRatioCode-TREE_ALLOMETRY_IDENTITY_CODE;
        if(allometry.getX(index)!==value){allometry.setX(index,value);updates.allometry.include(index,1);}
        updates.dimensions[index]=dimensions;
      }
    }
    if(changed){
      const roll=resident.cell.roll;
      this.color.setRGB(.8+roll*.2,.85+roll*.15,.75+roll*.25);mesh.setColorAt(index,this.color);
      updates.color.include(index,3);updates.residents[index]=resident;this.colorWrites++;
      const seed=mesh.geometry.getAttribute('instanceForestSeed') as THREE.InstancedBufferAttribute;seed.setX(index,Math.min(255,Math.floor(roll*256)));updates.seed.include(index,1);
    }
    const detailed=batch<2&&!!this.detailEntry(resident);
    const attribute=batch===2?this.canopyCoverage:this.coverage[batch],value=Math.fround(detailed?0:coverage);
    if(attribute.getX(index)!==value){attribute.setX(index,value);updates.coverage.include(index,1);this.coverageWrites++;}
  }
  private detailEntry(resident:Resident){
    if(!this.assetDraw)return undefined;
    const kind=forestPresentationFamily(this.dimensions(resident),this.presentedFamilies);
    return kind?this.assets.entries.get(kind):undefined;
  }
  private writeDetailed(entry:ForestTreeFamilyEntry<Resident,AssetSlot>,lod:number,index:number,resident:Resident,previous:AssetSlot|undefined):AssetSlot{
    const asset=entry.batches[lod],binding=this.binding(resident)!,cell=resident.cell,dimensions=this.dimensions(resident);
    let state=previous;
    if(!previous||previous.resident!==resident||previous.originVersion!==this.originVersion||previous.catalogueVersion!==this.catalogueVersion||previous.dimensions!==dimensions){
      this.direction.set(...cell.direction);this.position.copy(this.direction).multiplyScalar(1+resident.height/this.body.radiusM).sub(this.origin);
      treeQuaternion(this.direction,cell.yaw,this.quaternion,this.yaw);
      this.scale.setScalar(1/this.body.radiusM);this.matrix.compose(this.position,this.quaternion,this.scale);
      asset.setInstance(index,this.matrix,dimensions.heightM,binding.appearance.windPhase01*2*Math.PI,familyVariant(binding,entry.family.canopyPresentation??{}),
        {crownRatio:dimensions.crownRatio,trunkRatio:dimensions.trunkRatio});
      const bark=binding.appearance.barkBrightness,leaf=binding.appearance.foliageBrightness;
      asset.setAppearance(index,[bark,bark,bark],[leaf,leaf,leaf]);
      state={resident,originVersion:this.originVersion,catalogueVersion:this.catalogueVersion,dimensions};
    }
    asset.setCoverage(index,entry.coverage[lod].get(cell.id)!,Math.min(255,Math.floor(cell.roll*256)));
    return state!;
  }
  private wantInstance(batch:number,resident:Resident,coverage:number){
    coverage=quantizeForestCoverage(coverage)/256;
    const updates=this.updates[batch];updates.wanted.push(resident);updates.wantedCoverage.push(coverage);updates.wantedIds.add(resident.cell.id);
    tallyAllometry(this.nearAllometry,this.dimensions(resident));
    this.fullCanopy?.own(resident.cell.id,coverage);
  }
  private reconcileBatch(batch:number){
    const updates=this.updates[batch],mesh=batch===2?this.canopy:this.meshes[batch];
    const coverage=batch===2?this.canopyCoverage:this.coverage[batch];
    if(batch<2){
      for(const entry of this.assets.entries.values()){entry.wanted[batch].length=0;entry.coverage[batch].clear();}
      for(let i=0;i<updates.wanted.length;i++){
        const resident=updates.wanted[i],entry=this.detailEntry(resident);if(!entry)continue;
        entry.wanted[batch].push(resident);entry.coverage[batch].set(resident.cell.id,updates.wantedCoverage[i]);
      }
      for(const entry of this.assets.entries.values()){
        const count=entry.pools[batch].reconcile(entry.wanted[batch],(index,resident,previous)=>this.writeDetailed(entry,batch,index,resident,previous));
        entry.batches[batch].setCount(count);entry.batches[batch].group.visible=count>0;
        this.assetCounts[batch]+=count;
      }
    }
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
      updates.residents.pop();updates.originVersions.pop();updates.dimensions.pop();
    }
    for(let i=0;i<updates.wanted.length;i++){
      const resident=updates.wanted[i];let index=updates.slots.get(resident.cell.id);
      if(index===undefined){index=updates.residents.length;updates.slots.set(resident.cell.id,index);}
      this.writeInstance(batch,index,resident,updates.wantedCoverage[i]);
    }
    mesh.count=updates.residents.length;
    if(batch<2&&this.assetCounts[batch]===mesh.count)mesh.visible=false;
    this.scheduledUploadBytes+=updates.matrix.flush(mesh.instanceMatrix);
    if(mesh.instanceColor)this.scheduledUploadBytes+=updates.color.flush(mesh.instanceColor);
    this.scheduledUploadBytes+=updates.coverage.flush(coverage);
    this.scheduledUploadBytes+=updates.seed.flush(mesh.geometry.getAttribute('instanceForestSeed') as THREE.BufferAttribute);
    this.scheduledUploadBytes+=updates.allometry.flush(mesh.geometry.getAttribute('instanceTreeAllometry') as THREE.BufferAttribute);
  }
  update(eye:THREE.Vector3,groundDirection:V3,altitudeM:number,enabled:boolean,water:number,immersive:boolean,frusta:THREE.Frustum[]=[],worldNs=0n,treeSpecies?:readonly Species[],shadowFrustum:THREE.Frustum|null=null){
    if(!Number.isFinite(water))throw new Error('Forest water level must be finite');
    // Species dimensions apply to every representation, including the legacy
    // forest when no family asset is loaded.
    this.setCatalogue(treeSpecies);
    this.worldDate=worldNs;this.assets.setDate(worldNs);
    this.assetDraw=this.assets.entries.size>0&&!immersive;this.assetCounts=[0,0];
    this.syncCanopyPresentation();
    for(const entry of this.assets.entries.values())for(const batch of entry.batches)batch.group.visible=false;
    const updateStarted=performance.now();
    this.group.visible=enabled&&altitudeM<B.forestStreamAltitudeM;
    this.visibleTrees=0;this.nearTrees=0;this.placementMs=0;this.selectionMs=0;
    this.matrixWrites=0;this.colorWrites=0;this.coverageWrites=0;this.scheduledUploadBytes=0;this.originRebased=false;this.updateMs=0;this.farOwnedSkipped=0;
    this.nearAllometry=allometryTally();
    if(!this.group.visible){if(this.fullCanopy)this.fullCanopy.group.visible=false;return;}
    const draw=altitudeM<B.forestPrepareAltitudeM;
    for(const mesh of this.meshes)mesh.visible=draw;this.canopy.visible=draw;
    if(!draw){
      const canopyStarted=systemTimer.start();this.fullCanopy?.prepare(eye,groundDirection,altitudeM,water,enabled,immersive,this.origin);
      this.fullCanopy?.finish();systemTimer.stop('canopy',canopyStarted);this.updateMs=performance.now()-updateStarted;return;
    }
    if(immersive!==this.immersiveMaterial){
      this.immersiveMaterial=immersive;
      for(const mesh of [...this.meshes,this.canopy]){const material=mesh.material as THREE.MeshLambertMaterial;material.alphaHash=immersive;material.needsUpdate=true;}
    }
    const hydrologyChanged=this.sampledRivers!==this.body.canonicalRivers||this.sampledHydrology!==this.body.hydrology;
    if(water!==this.water||hydrologyChanged){
      this.sampledRivers=this.body.canonicalRivers;this.sampledHydrology=this.body.hydrology;
      if(hydrologyChanged)for(const resident of this.cache.values())resident.water=NaN;
      this.patchBroadphase.setWater(water);if(hydrologyChanged)this.patchBroadphase.invalidate();
      this.workStateVersion++;
      this.workHabitatRevision++;
      this.workGlobalHabitatRevision++;
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
      this.patchBroadphase.updateResident(cell.id,{groundHeightM:habitat.groundHeightM,water});
      this.workStateVersion++;
      this.workHabitatRevision++;
    }
    this.placementMs=performance.now()-started;
    // Retain the anchor across ordinary movement so static tree matrices need
    // no rewrite. Rebase before Float32 conversion to preserve local precision.
    if(!this.originReady||this.origin.distanceTo(eye)*r>=B.forestOriginRebaseM){
      this.origin.copy(eye);this.group.position.copy(this.origin);this.originReady=true;
      this.originVersion++;this.originRebased=true;
    }
    const canopyStarted=systemTimer.start();this.fullCanopy?.prepare(eye,groundDirection,altitudeM,water,enabled,immersive,this.origin);systemTimer.stop('canopy',canopyStarted);
    const selectionMismatch=!this.broadphaseSelectionReady||this.workIndex.diagnostics().selectionCells!==this.wanted.length;
    if(selectionMismatch){
      this.patchBroadphase.setWater(water);this.setWorkSelection(this.wanted);
    }
    const eyeMeters=this.position.set(eye.x*r,eye.y*r,eye.z*r);
    const legacyCanopyRevision=this.fullCanopy?(this.fullCanopy.currentPatchRevision?.()??NaN):-1;
    const canopyChanges=this.fullCanopy?.currentPatchChanges?.()??{globalRevision:legacyCanopyRevision,revision:legacyCanopyRevision,keys:[] as [string,number][]};
    const moved=this.workReferenceEyeReady&&eyeMeters.distanceToSquared(this.workReferenceEye)>20*20;
    const initial=!this.workReferenceEyeReady;
    const selectionChanged=this.workSelectionRevision!==this.workBuiltSelectionRevision;
    const habitatChanged=this.workGlobalHabitatRevision!==this.workBuiltGlobalHabitatRevision;
    const canopyChanged=canopyChanges.globalRevision!==this.workBuiltCanopyEpoch;
    const fullRefresh=initial||selectionMismatch||selectionChanged||habitatChanged||canopyChanged||moved;
    let workIndices=this.workIndex.currentIndices();
    const canopyDirtyKeys=canopyChanges.keys.map(([key])=>key);
    const habitatDirtyKeys=this.patchBroadphase.dirtyGroups();
    if(fullRefresh){
      if(initial)this.workRefreshReasons.initial++;
      if(selectionChanged)this.workRefreshReasons.selection++;
      if(habitatChanged)this.workRefreshReasons.habitat++;
      if(canopyChanged)this.workRefreshReasons.canopy++;
      if(moved)this.workRefreshReasons.movement++;
      if(selectionMismatch)this.workRefreshReasons.selectionMismatch++;
      const skippedPatches=this.fullCanopy?.group.visible?this.patchBroadphase.skipPatchKeys(
        [eyeMeters.x,eyeMeters.y,eyeMeters.z],water,key=>this.fullCanopy?.currentPatch(key)??false,B.forestFootprintM+20):new Set<string>();
      workIndices=this.workIndex.updateSkipped(skippedPatches);
      for(const id of this.workIndex.newlySkippedIds()){this.retainedNear.delete(id);this.retainedMiddle.delete(id);}
      this.workReferenceEye.copy(eyeMeters);this.workReferenceEyeReady=true;
      this.workCanopyRevision=canopyChanges.revision;this.workBuiltCanopyEpoch=canopyChanges.globalRevision;
      this.workListRefreshes++;
      this.workBuiltSelectionRevision=this.workSelectionRevision;this.workBuiltHabitatRevision=this.workHabitatRevision;
      this.workBuiltGlobalHabitatRevision=this.workGlobalHabitatRevision;this.workBuiltStateVersion=this.workStateVersion;
      this.patchBroadphase.acknowledgeDirtyGroups(habitatDirtyKeys);
      this.fullCanopy?.acknowledgeCurrentPatchChanges?.(canopyChanges);
    }else{
      const dirtyKeys=[...new Set([...canopyDirtyKeys,...habitatDirtyKeys])];
      if(dirtyKeys.length){
        const states=this.patchBroadphase.skipStatesFor(dirtyKeys,
          [this.workReferenceEye.x,this.workReferenceEye.y,this.workReferenceEye.z],water,
          key=>this.fullCanopy?.currentPatch(key)??false,B.forestFootprintM+20);
        workIndices=this.workIndex.updateSkippedPatches(states);
        for(const id of this.workIndex.newlySkippedIds()){this.retainedNear.delete(id);this.retainedMiddle.delete(id);}
        this.workRefreshReasons.incrementalPatch++;
        this.workCanopyRevision=canopyChanges.revision;
        this.workBuiltStateVersion=this.workStateVersion;
        this.workBuiltHabitatRevision=this.workHabitatRevision;
        this.patchBroadphase.acknowledgeDirtyGroups(habitatDirtyKeys);
        this.fullCanopy?.acknowledgeCurrentPatchChanges?.(canopyChanges);
      }
    }
    const workStats=this.workIndex.diagnostics(),patchStats=this.patchBroadphase.diagnostics();
    this.farWorkDiagnostics={...workStats,patchGroups:patchStats.groups,patchLastFullScan:patchStats.lastFullScan,
      patchVisitedGroups:patchStats.lastVisitedGroups,patchVisitedGroupsTotal:patchStats.totalVisitedGroups,
      patchFullScans:patchStats.fullScans,patchIncrementalScans:patchStats.incrementalScans,
      skippedCells:workStats.skippedCells,activeCells:workStats.activeCells,refreshes:this.workListRefreshes,
      refreshReasons:this.workRefreshReasons,selectionRevision:this.workSelectionRevision,habitatRevision:this.workHabitatRevision,
      builtSelectionRevision:this.workBuiltSelectionRevision,builtHabitatRevision:this.workBuiltHabitatRevision,
      globalHabitatRevision:this.workGlobalHabitatRevision,builtGlobalHabitatRevision:this.workBuiltGlobalHabitatRevision,
      canopyRevision:this.fullCanopy?.currentPatchRevision?.()??-1,canopyEpoch:canopyChanges.globalRevision,workStateRevision:this.workStateVersion,builtWorkStateRevision:this.workBuiltStateVersion};
    this.farOwnedSkipped=workStats.skippedCells;
    const counts=[0,0],capacities=immersive?[64,1024]:[B.forestNearCapacity,B.forestCapacity];let canopyCount=0;
    for(const updates of this.updates){updates.wanted.length=0;updates.wantedCoverage.length=0;updates.wantedIds.clear();}
    const altitudeFade=1-THREE.MathUtils.smoothstep(altitudeM,B.forestPrepareAltitudeM-500,B.forestPrepareAltitudeM);
    for(const index of workIndices){
      const cell=this.wanted[index];if(!cell)continue;
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
      // View and shadow culling use the individual's rendered dimensions:
      // family skeleton with variant, lean, wind and card growth, or the legacy primitive.
      const dimensions=this.dimensions(resident),reference=dimensions.kind?this.presentedFamilies.get(dimensions.kind)?.allometry:null;
      if(dimensions.representation==='family'&&reference){
        // Root-centred; also encloses the legacy stand-in of the same widths.
        const legacy=legacyTreeBoundSphere({heightM:dimensions.heightM,...unpackTreeAllometryRatios(dimensions.legacyRatioCode)});
        this.bounds.center.copy(this.position);this.bounds.radius=Math.max(forestFamilyBoundRadius(reference,dimensions),legacy.centerHeightM+legacy.radiusM)/r;
      }else{
        const sphere=legacyTreeBoundSphere(dimensions);
        this.bounds.center.copy(this.position).addScaledVector(this.direction,sphere.centerHeightM/r);this.bounds.radius=sphere.radiusM/r;
      }
      if(frusta.length&&!frusta.some(f=>f.intersectsSphere(this.bounds))&&!shadowFrustum?.intersectsSphere(this.bounds))continue;
      const distance=this.position.distanceTo(eye)*r;
      const horizontal=Math.hypot(this.direction.x-groundDirection[0],this.direction.y-groundDirection[1],this.direction.z-groundDirection[2])*r;
      // Detailed and distant draws refer to one canonical tree. A retained
      // band prevents oscillation between equal-silhouette batches.
      const wasNear=this.retainedNear.has(cell.id),nearLimit=wasNear?B.forestNearM+12:B.forestNearM-12;
      let lod=distance<nearLimit?0:1;
      if(lod===0)this.retainedNear.add(cell.id);else this.retainedNear.delete(cell.id);
      if(distance>=B.forestRadiusM)continue;
      const edgeCoverage=altitudeFade*(1-THREE.MathUtils.smoothstep(distance,B.forestRadiusM-300,B.forestRadiusM));
      const expected=this.expectedCanopyPresentation(resident);
      const paired=this.fullCanopy?.canHandoff(cell.id,resident.height,resident.patchKey,expected.heightM,expected.code,expected.ratioCode)??false;
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
    const canopyFinish=systemTimer.start();this.fullCanopy?.finish();systemTimer.stop('canopy',canopyFinish);
    this.nearTrees=counts[0];this.visibleTrees=counts[0]+counts[1]+canopyCount;
    this.updateMs=performance.now()-updateStarted;
  }
  diagnostics(){
    const ownedEntries=this.assets.ownedEntries;
    const farMesh=this.fullCanopy?.renderer?.mesh,legacyMeshes=[...this.meshes,this.canopy,...(farMesh?[farMesh]:[])];
    const legacyBuffers=forestMeshBufferFootprint(legacyMeshes);
    const familyGeometries=ownedEntries.flatMap(entry=>(entry.family.lods??[]).flatMap(lod=>lod.map(mesh=>mesh.geometry)));
    const familyMeshes=ownedEntries.flatMap(entry=>entry.batches.flatMap(batch=>batch.meshes??[]));
    const familyBufferUsage=forestMeshBufferFootprint(familyMeshes,familyGeometries);
    const textures=forestTextureFootprint(ownedEntries.flatMap(entry=>[...(entry.family.textures??[])]));
    const atlasReports=[...this.farAtlases.values()].map(atlas=>atlas.diagnostics());
    const farAtlasResidentGpuBytes=atlasReports.reduce((n,atlas)=>n+atlas.bytes,0);
    const farAtlasScratchGpuBytes=atlasReports.reduce((n,atlas)=>n+atlas.scratchBytes,0);
    const farAtlasCaptureCpuBytes=atlasReports.reduce((n,atlas)=>n+atlas.captureBatchCpuBytes,0);
    const farAtlasCaptureGpuEstimateBytes=atlasReports.reduce((n,atlas)=>n+atlas.captureBatchGpuEstimateBytes,0);
    const farAtlasBuildScratchPeakGpuBytes=atlasReports.reduce((n,atlas)=>n+atlas.buildScratchPeakGpuBytes,0);
    const embeddedImageFileBytes=ownedEntries.reduce((n,entry)=>n+(entry.family.embeddedTextureBytes??0),0);
    const baseMemory=forestMemoryFootprint({legacyMeshes,familyGeometries,familyMeshes,
      familyTextures:ownedEntries.flatMap(entry=>[...(entry.family.textures??[])]),embeddedImageFileBytes,farAtlasResidentBytes:farAtlasResidentGpuBytes});
    const canopyMemory=this.fullCanopy?.memoryUsage?.()??{hostPersistentCpuBytes:0,hostScratchCpuBytes:0,hostScratchPeakCpuBytes:0};
    const baseCpuBytes=baseMemory.retainedCpuBytes+canopyMemory.hostPersistentCpuBytes+canopyMemory.hostScratchCpuBytes;
    const baseGpuEstimateBytes=baseMemory.estimatedGpuBytes;
    const estimatedGpuBytes=baseGpuEstimateBytes+farAtlasScratchGpuBytes+farAtlasCaptureGpuEstimateBytes;
    const retainedCpuBytes=baseCpuBytes+farAtlasCaptureCpuBytes;
    const estimatedPeakGpuBytes=baseGpuEstimateBytes+farAtlasBuildScratchPeakGpuBytes;
    const estimatedPeakCpuBytes=baseMemory.retainedCpuBytes+canopyMemory.hostPersistentCpuBytes+
      Math.max(canopyMemory.hostScratchCpuBytes,canopyMemory.hostScratchPeakCpuBytes)+farAtlasCaptureCpuBytes;
    const memoryAccounting={version:'forest-resource-estimate-1',basis:'CPU typed-array/image byte lengths plus estimated WebGL buffer/texture storage; excludes driver padding, shader/program state and allocator overhead',
      legacyBufferCpuBytes:legacyBuffers.totalBytes,legacyBufferGpuEstimateBytes:legacyBuffers.geometryGpuEstimateBytes+legacyBuffers.instanceGpuEstimateBytes,
      familyBufferCpuBytes:familyBufferUsage.totalBytes,familyBufferGpuEstimateBytes:familyBufferUsage.geometryGpuEstimateBytes+familyBufferUsage.instanceGpuEstimateBytes,
      geometryCount:baseMemory.geometryCount,familyGeometryCount:familyBufferUsage.geometryCount,
      familyTextureCount:textures.textureCount,decodedImageSourceCount:textures.imageSourceCount,
      familyDecodedTextureCpuBytes:textures.decodedCpuBytes,familyGpuTextureEstimateBytes:textures.gpuEstimateBytes,embeddedImageFileBytes,
      canopyHostPersistentCpuBytes:canopyMemory.hostPersistentCpuBytes,canopyCurrentScratchCpuBytes:canopyMemory.hostScratchCpuBytes,
      canopyScratchPeakCpuBytes:canopyMemory.hostScratchPeakCpuBytes,
      allocationCaps:{maximumFamilies:2,legacyInstanceSlots:[...this.meshes,this.canopy].map(mesh=>mesh.instanceMatrix.count),
        familyInstanceSlots:ownedEntries.map(entry=>({kind:entry.kind,lods:entry.batches.map(batch=>batch.meshes?.[0]?.instanceMatrix.count??null)})),
        farAtlasCount:2,farAtlasViewsPerFamily:FOREST_FAR_ATLAS_VIEWS,farAtlasMembersPerFamily:FOREST_VARIANT_COUNT},
      farAtlasResidentGpuBytes,farAtlasScratchGpuBytes,farAtlasCaptureBufferCpuBytes:farAtlasCaptureCpuBytes,
      farAtlasCaptureBufferGpuEstimateBytes:farAtlasCaptureGpuEstimateBytes,farAtlasBuildScratchPeakGpuBytes,
      retainedCpuBytes,estimatedGpuBytes,estimatedPeakCpuBytes,estimatedPeakGpuBytes,
      currentCombinedEstimateBytes:retainedCpuBytes+estimatedGpuBytes,peakCombinedEstimateBytes:estimatedPeakCpuBytes+estimatedPeakGpuBytes,
      pendingFamilyReplacements:Math.max(0,ownedEntries.length-this.assets.entries.size)};
    return {visible:this.visibleTrees,near:this.nearTrees,cached:this.cache.size,pending:this.queue.length,
    detailedTrees:{ready:this.assets.entries.size>0,loading:this.assets.loading,error:this.assets.error||this.catalogueError,visible:[...this.assetCounts],species:this.catalogue.count,dateNs:this.worldDate.toString(),catalogueVersion:this.catalogueVersion,
      heightPolicy:'species-allometry',
      allometry:{version:TREE_ALLOMETRY_VERSION,familyEnvelope:TREE_FAMILY_ALLOMETRY_ENVELOPE,cardScale:TREE_ALLOMETRY_CARD,legacyHeightRangeM:TREE_LEGACY_ALLOMETRY_ENVELOPE.heightM,
        near:this.nearAllometry,far:{...this.farAllometry,scope:'retagged since presentation key change'},
        familyBoundRadiusM:Object.fromEntries([...this.presentedFamilies].map(([kind,p])=>[kind,p.conservativeBounds.radiusM])),
        // Instance channels carrying rendered dimensions (already inside memoryAccounting).
        // Far ratios share the existing parameter float; family atlases stay one per family.
        channelBytes:{legacyRatios:[...this.meshes,this.canopy].reduce((n,mesh)=>n+(mesh.geometry.getAttribute('instanceTreeAllometry')?.array.byteLength??0),0),
          detailedTreeParameters:Object.fromEntries(ownedEntries.map(entry=>[entry.kind,entry.batches.reduce((n,batch)=>
            n+((batch.meshes?.[0]?.geometry.getAttribute('instanceTree')?.array as ArrayBufferView|undefined)?.byteLength??0),0)])),
          farPacked:0,canopyCanonicalHeights:this.fullCanopy?.canonicalHeightBytes?.()??0}},
      geometryVariants:this.assets.entries.size,farRepresentation:this.farRepresentation(),
      farAtlas:{version:FOREST_FAR_ATLAS_VERSION,error:this.farAtlasError,viewsPerFrame:FOREST_FAR_ATLAS_VIEWS_PER_FRAME,
        adopted:(['branching','spire'] as const).filter(kind=>this.adoptedFarAtlas(kind)),
        families:[...this.farAtlases.values()].map(atlas=>atlas.diagnostics())},presentationKey:this.canopyPresentationKey,instanceSlots:'compact-per-family',
      structuralVariantVersion:FOREST_VARIANT_VERSION,
      families:[...this.assets.entries.values()].map(entry=>({kind:entry.kind,
        submitted:entry.pools.map((pool,lod)=>this.group.visible&&entry.batches[lod].group.visible?pool.items.length:0),
        retainedSlots:entry.pools.map(pool=>pool.items.length),capacities:entry.pools.map(pool=>pool.capacity),foliageMipmaps:entry.family.foliageMipmaps??null,
        structuralVariants:entry.family.structuralVariantCount??0,lod1CardScale:entry.family.lod1CardScale??1,lodCoverage:entry.family.lodCoverage??null,cardCompensation:entry.family.cardCompensation??null,
        variantHistogram:this.variantHistogram(entry)})),
      foliageMipmaps:this.assets.entries.get('branching')?.family.foliageMipmaps??null,samples:this.detailedSamples(),
      handoffSamples:this.detailedSamples().map(sample=>({id:sample.id,far:this.fullCanopy?.presentationSample?.(sample.id)??null}))},
    candidateCells:this.wanted.length,canopyStands:0,farCanonicalTrees:this.group.visible?this.canopy.count:0,farSamplingFraction:FAR_CROWN_PROBABILITY,habitatVersion:TREE_HABITAT_VERSION,placementMs:this.placementMs,selectionMs:this.selectionMs,selectionPending:this.selecting,selectionWorker:!!this.worker,
    representation:'canonical-tree-field',densityFocus:'observer-ground',instanceUpdates:'stable-slots-retained-origin-dirty-ranges',
    selectionJobsInFlight:this.selecting?1:0,waterBucket:this.water,selectionApplyMs:this.selectionApplyMs,selectionCache:this.selectionCacheStats,selectionTransfer:this.selectionTransfer,fullCanopy:this.fullCanopy?.diagnostics()??null,
    workerRestarts:this.workerRestarts,workerFailures:this.workerFailures,selectionMode:this.worker?'worker':'synchronous-fallback',
    updateMs:this.updateMs,farOwnedSkipped:this.farOwnedSkipped,farWork:this.farWorkDiagnostics,matrixWrites:this.matrixWrites,colorWrites:this.colorWrites,coverageWrites:this.coverageWrites,
    scheduledUploadBytes:this.scheduledUploadBytes,originRebased:this.originRebased,originVersion:this.originVersion,originRebaseM:B.forestOriginRebaseM,
    radiusM:B.forestRadiusM,canonicalHeightRangeM:[10,22],renderedHeightRangeM:this.nearAllometry.renderedHeightRangeM,cellSizeM:B.forestCellM,
      allocatedBytes:memoryAccounting.currentCombinedEstimateBytes,memoryAccounting};
  }
  /** Debug-only GPU attribution: objects of one presentation tier (see PlanetRenderer.profilingObjects). */
  profilingObjects(tier:'forestNear'|'forestMiddle'|'forestFar'):THREE.Object3D[]{
    const lod=tier==='forestNear'?0:tier==='forestMiddle'?1:-1;
    if(lod<0)return [this.canopy,...(this.fullCanopy?[this.fullCanopy.group]:[])];
    return [this.meshes[lod],...[...this.assets.entries.values()].flatMap(entry=>entry.batches[lod]?[entry.batches[lod].group]:[])];
  }
  backlog(){return {forestPending:this.queue.length,forestSelectionPending:this.selecting,forestVisible:this.visibleTrees,forestNear:this.nearTrees,
    forestFarTrees:!this.group.visible?0:(this.canopy.visible?this.canopy.count:0)+(this.fullCanopy?.group.visible?this.fullCanopy.diagnostics().trees:0),forestOriginVersion:this.originVersion,
    forestMatrixWrites:this.matrixWrites,forestColorWrites:this.colorWrites,forestCoverageWrites:this.coverageWrites,forestSelectionApplyMs:this.selectionApplyMs,forestUpdateMs:this.updateMs};}
  dispose(){if(this.disposed)return;this.disposed=true;this.assets.dispose();this.worker?.terminate();this.worker=null;this.fullCanopy?.dispose();this.fullCanopy=null;for(const mesh of [...this.meshes,this.canopy]){mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();mesh.customDepthMaterial?.dispose();}this.cache.clear();this.group.removeFromParent();}
}
