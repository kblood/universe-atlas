import type {PopulationCell} from './planet-population.ts';

export const FOREST_PATCH_BROADPHASE_VERSION='forest-patch-broadphase-1';
export const FOREST_PATCH_BROADPHASE_DISTANCE_M=650;
/** Small distance guard for floating-point origin conversion at planet scale. */
export const FOREST_PATCH_BROADPHASE_MARGIN_M=.1;

export type ForestPatchRoot={groundHeightM:number;water:number};
export type ForestPatchBounds={min:[number,number,number];max:[number,number,number];center:[number,number,number];radiusM:number};
type Member={id:string;direction:readonly [number,number,number];root:ForestPatchRoot|null};
type Group={key:string;members:Member[];byId:Map<string,Member>;currentCount:number;bounds:ForestPatchBounds|null;boundsDirty:boolean};
export type ForestPatchBroadphaseStats={groups:number;readyGroups:number;invalidatedGroups:number;skippedGroups:number;skippedCells:number};

/** Pure grouped broadphase for PlanetForest's existing canonical cell loop.
 * The caller still iterates its original `PopulationCell[]` in order and skips
 * cells only when their patch key is in the returned set. */
export class ForestPatchBroadphase {
  private radiusM:number;
  private keyForCell:(id:string)=>string;
  private groups=new Map<string,Group>();
  private byId=new Map<string,Group>();
  private water=NaN;
  private lastStats:ForestPatchBroadphaseStats={groups:0,readyGroups:0,invalidatedGroups:0,skippedGroups:0,skippedCells:0};

  constructor(radiusM:number,keyForCell:(id:string)=>string){
    if(!Number.isFinite(radiusM)||radiusM<=0)throw new Error('Broadphase radius must be finite and positive');
    if(typeof keyForCell!=='function')throw new Error('Broadphase requires the canonical forest patch-key function');
    this.radiusM=radiusM;this.keyForCell=keyForCell;
  }

  /** Replace selection atomically. Resolve only habitat records already proven
   * current by the caller; null/missing residents keep the affected patch on
   * the unchanged per-cell fallback path. */
  setSelection(cells:readonly PopulationCell[],water:number,resolve:(cell:PopulationCell)=>ForestPatchRoot|null|undefined){
    if(!Number.isFinite(water))throw new Error('Broadphase water must be finite');
    if(!Array.isArray(cells)||typeof resolve!=='function')throw new Error('Invalid broadphase selection');
    const groups=new Map<string,Group>(),byId=new Map<string,Group>();
    for(const cell of cells){
      if(!cell||typeof cell.id!=='string'||!Array.isArray(cell.direction)||cell.direction.length!==3||
        !cell.direction.every(Number.isFinite)||Math.abs(Math.hypot(...cell.direction)-1)>1e-6)throw new Error('Invalid population cell in broadphase selection');
      if(byId.has(cell.id))throw new Error('Duplicate population cell in broadphase selection');
      const key=this.keyForCell(cell.id);if(typeof key!=='string'||!key)throw new Error('Invalid census patch key');
      let group=groups.get(key);
      if(!group){group={key,members:[],byId:new Map(),currentCount:0,bounds:null,boundsDirty:false};groups.set(key,group);}
      const resolved=resolve(cell)??null;
      if(resolved&&(!Number.isFinite(resolved.groundHeightM)||!Number.isFinite(resolved.water)))throw new Error('Invalid resolved forest root');
      const root=resolved&&resolved.water===water?{groundHeightM:resolved.groundHeightM,water:resolved.water}:null;
      const member:Member={id:cell.id,direction:cell.direction,root};
      group.members.push(member);group.byId.set(cell.id,member);byId.set(cell.id,group);
      if(root){group.currentCount++;this.extendBounds(group,member);}
    }
    this.groups=groups;this.byId=byId;this.water=water;
    for(const group of groups.values())if(group.currentCount!==group.members.length)group.boundsDirty=true;
    this.lastStats={groups:groups.size,readyGroups:0,invalidatedGroups:groups.size,skippedGroups:0,skippedCells:0};
  }

  /** Call for each newly computed/replaced resident. Unknown/out-of-selection
   * IDs are harmless and return false. A changed root invalidates the bound;
   * the group cannot skip again until all members resolve and it is rebuilt. */
  updateResident(id:string,root:ForestPatchRoot|null|undefined){
    const group=this.byId.get(id),member=group?.byId.get(id);if(!group||!member)return false;
    if(root&&(!Number.isFinite(root.groundHeightM)||!Number.isFinite(root.water)))throw new Error('Invalid resolved forest root');
    const next=root&&root.water===this.water?{groundHeightM:root.groundHeightM,water:root.water}:null;
    const previous=member.root;
    if(previous&&previous.water===this.water)group.currentCount--;
    if(previous&&next&&(previous.groundHeightM!==next.groundHeightM||previous.water!==next.water))group.boundsDirty=true;
    member.root=next;
    if(next){group.currentCount++;if(!group.boundsDirty)this.extendBounds(group,member);}
    return true;
  }

  /** A water or habitat/hydrology revision invalidates every root bound. The
   * caller repopulates records through updateResident as its bounded work runs. */
  invalidate(){
    for(const group of this.groups.values()){
      group.currentCount=0;group.boundsDirty=true;
      for(const member of group.members)member.root=null;
    }
  }

  setWater(water:number){
    if(!Number.isFinite(water))throw new Error('Broadphase water must be finite');
    if(water===this.water)return;
    this.water=water;this.invalidate();
  }

  /** Returns canonical patch keys that are safe to omit from the existing
   * ordered per-cell loop. The callback must report a complete current-family,
   * current-water census patch. A conservative AABB-derived sphere encloses
   * every resolved resident root in the selected group. */
  skipPatchKeys(eyeMeters:readonly [number,number,number],water:number,
    currentPatch:(patchKey:string)=>boolean,minimumDistanceM=FOREST_PATCH_BROADPHASE_DISTANCE_M){
    if(!eyeMeters||eyeMeters.length!==3||!eyeMeters.every(Number.isFinite)||!Number.isFinite(water)||
      !Number.isFinite(minimumDistanceM)||minimumDistanceM<0||typeof currentPatch!=='function')throw new Error('Invalid broadphase query');
    const skipped=new Set<string>();let readyGroups=0,invalidatedGroups=0,skippedCells=0;
    if(water!==this.water){this.lastStats={groups:this.groups.size,readyGroups:0,invalidatedGroups:this.groups.size,skippedGroups:0,skippedCells:0};return skipped;}
    for(const group of this.groups.values()){
      if(group.currentCount!==group.members.length){invalidatedGroups++;continue;}
      if(group.boundsDirty)this.rebuildBounds(group);
      const bounds=group.bounds;if(!bounds){invalidatedGroups++;continue;}readyGroups++;
      if(!currentPatch(group.key))continue;
      const [x,y,z]=eyeMeters,near=Math.hypot(x-bounds.center[0],y-bounds.center[1],z-bounds.center[2])-bounds.radiusM;
      if(near>=minimumDistanceM+FOREST_PATCH_BROADPHASE_MARGIN_M){skipped.add(group.key);skippedCells+=group.members.length;}
    }
    this.lastStats={groups:this.groups.size,readyGroups,invalidatedGroups,skippedGroups:skipped.size,skippedCells};
    return skipped;
  }

  patchKeyForCell(id:string){return this.byId.get(id)?.key;}
  diagnostics(){return {...this.lastStats,water:this.water};}

  private rootPosition(member:Member):[number,number,number]{
    if(!member.root)throw new Error('Cannot bound an unresolved forest root');
    const radial=this.radiusM+member.root.groundHeightM,d=member.direction;
    return [d[0]*radial,d[1]*radial,d[2]*radial];
  }
  private extendBounds(group:Group,member:Member){
    const p=this.rootPosition(member),old=group.bounds;
    if(!old){group.bounds={min:[...p],max:[...p],center:[...p],radiusM:0};return;}
    for(let axis=0;axis<3;axis++){old.min[axis]=Math.min(old.min[axis],p[axis]);old.max[axis]=Math.max(old.max[axis],p[axis]);}
    this.finishBounds(old);
  }
  private rebuildBounds(group:Group){
    group.bounds=null;
    for(const member of group.members)if(member.root)this.extendBounds(group,member);
    group.boundsDirty=false;
  }
  private finishBounds(bounds:ForestPatchBounds){
    for(let axis=0;axis<3;axis++)bounds.center[axis]=(bounds.min[axis]+bounds.max[axis])*.5;
    bounds.radiusM=Math.hypot(bounds.max[0]-bounds.min[0],bounds.max[1]-bounds.min[1],bounds.max[2]-bounds.min[2])*.5;
  }
}
