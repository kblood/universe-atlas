import type {PopulationCell} from './planet-population.ts';

export const FOREST_PATCH_BROADPHASE_VERSION='forest-patch-broadphase-1';
export const FOREST_PATCH_BROADPHASE_DISTANCE_M=650;
/** Small distance guard for floating-point origin conversion at planet scale. */
export const FOREST_PATCH_BROADPHASE_MARGIN_M=.1;

export type ForestPatchRoot={groundHeightM:number;water:number};
export type ForestPatchBounds={min:[number,number,number];max:[number,number,number];center:[number,number,number];radiusM:number};
type Member={id:string;direction:readonly [number,number,number];root:ForestPatchRoot|null;group:Group};
// `open`: min/max extended since center/radius were last derived from them.
type Bounds=ForestPatchBounds&{open:boolean};
type Group={key:string;members:Member[];currentCount:number;bounds:Bounds|null;boundsDirty:boolean};
export type ForestPatchBroadphaseStats={groups:number;readyGroups:number;invalidatedGroups:number;skippedGroups:number;skippedCells:number};

/** Pure grouped broadphase for PlanetForest's existing canonical cell loop.
 * The caller still iterates its original `PopulationCell[]` in order and skips
 * cells only when their patch key is in the returned set. */
export class ForestPatchBroadphase {
  private radiusM:number;
  private keyForCell:(id:string)=>string;
  private groups=new Map<string,Group>();
  private byId=new Map<string,Member>();
  private dirtyPatchKeys=new Set<string>();
  private water=NaN;
  private lastStats:ForestPatchBroadphaseStats={groups:0,readyGroups:0,invalidatedGroups:0,skippedGroups:0,skippedCells:0};
  private lastVisitedGroups=0;private totalVisitedGroups=0;private fullScans=0;private incrementalScans=0;

  constructor(radiusM:number,keyForCell:(id:string)=>string){
    if(!Number.isFinite(radiusM)||radiusM<=0)throw new Error('Broadphase radius must be finite and positive');
    if(typeof keyForCell!=='function')throw new Error('Broadphase requires the canonical forest patch-key function');
    this.radiusM=radiusM;this.keyForCell=keyForCell;
  }

  /** Replace selection atomically. Resolve only habitat records already proven
   * current by the caller; null/missing residents keep the affected patch on
   * the unchanged per-cell fallback path. */
  setSelection(cells:readonly PopulationCell[],water:number,resolve:(cell:PopulationCell,index:number)=>ForestPatchRoot|null|undefined,
    /** Optional keyForCell(cells[i].id) for every cell, computed once by the caller. */
    keys?:readonly string[]){
    if(!Number.isFinite(water))throw new Error('Broadphase water must be finite');
    if(!Array.isArray(cells)||typeof resolve!=='function'||keys!==undefined&&(!Array.isArray(keys)||keys.length!==cells.length))throw new Error('Invalid broadphase selection');
    const groups=new Map<string,Group>(),byId=new Map<string,Member>();
    let last:Group|undefined;
    for(let index=0;index<cells.length;index++){
      const cell=cells[index],d=cell?.direction;
      if(!cell||typeof cell.id!=='string'||!Array.isArray(d)||d.length!==3||
        !Number.isFinite(d[0])||!Number.isFinite(d[1])||!Number.isFinite(d[2])||Math.abs(Math.hypot(d[0],d[1],d[2])-1)>1e-6)throw new Error('Invalid population cell in broadphase selection');
      if(byId.has(cell.id))throw new Error('Duplicate population cell in broadphase selection');
      const key=keys?keys[index]:this.keyForCell(cell.id);if(typeof key!=='string'||!key)throw new Error('Invalid census patch key');
      // Neighbouring cells usually share a patch.
      let group=last!==undefined&&last.key===key?last:groups.get(key);
      if(!group){group={key,members:[],currentCount:0,bounds:null,boundsDirty:false};groups.set(key,group);}
      last=group;
      const resolved=resolve(cell,index)??null;
      if(resolved&&(!Number.isFinite(resolved.groundHeightM)||!Number.isFinite(resolved.water)))throw new Error('Invalid resolved forest root');
      const root=resolved&&resolved.water===water?{groundHeightM:resolved.groundHeightM,water:resolved.water}:null;
      const member:Member={id:cell.id,direction:cell.direction,root,group};
      group.members.push(member);byId.set(cell.id,member);
      if(root){group.currentCount++;this.extendBounds(group,member);}
    }
    this.groups=groups;this.byId=byId;this.water=water;this.dirtyPatchKeys.clear();
    for(const group of groups.values())if(group.currentCount!==group.members.length)group.boundsDirty=true;
    this.lastStats={groups:groups.size,readyGroups:0,invalidatedGroups:groups.size,skippedGroups:0,skippedCells:0};
  }

  /** Call for each newly computed/replaced resident. Unknown/out-of-selection
   * IDs are harmless and return false. A changed root invalidates the bound;
   * the group cannot skip again until all members resolve and it is rebuilt. */
  updateResident(id:string,root:ForestPatchRoot|null|undefined){
    const member=this.byId.get(id),group=member?.group;if(!group||!member)return false;
    if(root&&(!Number.isFinite(root.groundHeightM)||!Number.isFinite(root.water)))throw new Error('Invalid resolved forest root');
    const next=root&&root.water===this.water?{groundHeightM:root.groundHeightM,water:root.water}:null;
    const previous=member.root;
    const changed=!!previous!==!!next||!!previous&&!!next&&
      (previous.groundHeightM!==next.groundHeightM||previous.water!==next.water);
    if(!changed)return true;
    if(previous&&previous.water===this.water)group.currentCount--;
    if(previous&&next&&(previous.groundHeightM!==next.groundHeightM||previous.water!==next.water))group.boundsDirty=true;
    member.root=next;
    if(next){group.currentCount++;if(!group.boundsDirty)this.extendBounds(group,member);}
    this.dirtyPatchKeys.add(group.key);
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

  /** Pending local root changes. Callers acknowledge only after applying the
   * corresponding incremental skip states; selection/water resets are global. */
  dirtyGroups(){return [...this.dirtyPatchKeys];}
  acknowledgeDirtyGroups(keys:readonly string[]){for(const key of keys)this.dirtyPatchKeys.delete(key);}

  /** Re-evaluate only the supplied patch keys and report their new skip state.
   * A missing/incomplete group is explicitly non-skippable. */
  skipStatesFor(keys:readonly string[],eyeMeters:readonly [number,number,number],water:number,
    currentPatch:(patchKey:string)=>boolean,minimumDistanceM=FOREST_PATCH_BROADPHASE_DISTANCE_M){
    if(!eyeMeters||eyeMeters.length!==3||!eyeMeters.every(Number.isFinite)||!Number.isFinite(water)||
      !Number.isFinite(minimumDistanceM)||minimumDistanceM<0||typeof currentPatch!=='function')throw new Error('Invalid broadphase query');
    const states=new Map<string,boolean>();
    this.lastVisitedGroups=keys.length;this.totalVisitedGroups+=keys.length;this.incrementalScans++;
    if(water!==this.water){for(const key of keys)states.set(key,false);return states;}
    const [x,y,z]=eyeMeters;
    for(const key of keys){
      const group=this.groups.get(key);
      if(!group||group.currentCount!==group.members.length){states.set(key,false);continue;}
      if(group.boundsDirty)this.rebuildBounds(group);
      const bounds=this.closedBounds(group);
      if(!bounds||!currentPatch(key)){states.set(key,false);continue;}
      const near=Math.hypot(x-bounds.center[0],y-bounds.center[1],z-bounds.center[2])-bounds.radiusM;
      states.set(key,near>=minimumDistanceM+FOREST_PATCH_BROADPHASE_MARGIN_M);
    }
    return states;
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
    this.lastVisitedGroups=water===this.water?this.groups.size:0;this.totalVisitedGroups+=this.lastVisitedGroups;this.fullScans++;
    if(water!==this.water){this.lastStats={groups:this.groups.size,readyGroups:0,invalidatedGroups:this.groups.size,skippedGroups:0,skippedCells:0};return skipped;}
    for(const group of this.groups.values()){
      if(group.currentCount!==group.members.length){invalidatedGroups++;continue;}
      if(group.boundsDirty)this.rebuildBounds(group);
      const bounds=this.closedBounds(group);if(!bounds){invalidatedGroups++;continue;}readyGroups++;
      if(!currentPatch(group.key))continue;
      const [x,y,z]=eyeMeters,near=Math.hypot(x-bounds.center[0],y-bounds.center[1],z-bounds.center[2])-bounds.radiusM;
      if(near>=minimumDistanceM+FOREST_PATCH_BROADPHASE_MARGIN_M){skipped.add(group.key);skippedCells+=group.members.length;}
    }
    this.lastStats={groups:this.groups.size,readyGroups,invalidatedGroups,skippedGroups:skipped.size,skippedCells};
    return skipped;
  }

  patchKeyForCell(id:string){return this.byId.get(id)?.group.key;}
  diagnostics(){return {groups:this.groups.size,water:this.water,lastFullScan:{...this.lastStats},lastVisitedGroups:this.lastVisitedGroups,
    totalVisitedGroups:this.totalVisitedGroups,fullScans:this.fullScans,incrementalScans:this.incrementalScans};}

  private extendBounds(group:Group,member:Member){
    if(!member.root)throw new Error('Cannot bound an unresolved forest root');
    const radial=this.radiusM+member.root.groundHeightM,d=member.direction,x=d[0]*radial,y=d[1]*radial,z=d[2]*radial,old=group.bounds;
    if(!old){group.bounds={min:[x,y,z],max:[x,y,z],center:[x,y,z],radiusM:0,open:false};return;}
    old.min[0]=Math.min(old.min[0],x);old.max[0]=Math.max(old.max[0],x);
    old.min[1]=Math.min(old.min[1],y);old.max[1]=Math.max(old.max[1],y);
    old.min[2]=Math.min(old.min[2],z);old.max[2]=Math.max(old.max[2],z);
    // Center and radius are functions of the final min/max: derive them once, when read.
    old.open=true;
  }
  private closedBounds(group:Group){
    const bounds=group.bounds;if(bounds?.open){this.finishBounds(bounds);bounds.open=false;}
    return bounds;
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
