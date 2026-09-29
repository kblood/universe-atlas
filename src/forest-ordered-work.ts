/** Retained canonical-order work indices for patch-level forest culling.
 * A skipped patch removes all its members from the frame loop; active patch
 * members are retained as a compact mask in original selection order, so
 * capacity and hysteresis decisions keep the same deterministic order. */
export class ForestOrderedWorkIndex {
  private groups=new Map<string,number[]>();
  private cells:readonly {id:string}[]=[];
  private keys:string[]=[];
  private skipped=new Set<string>();
  private indices:number[]=[];
  private rebuildCount=0;
  private incrementalUpdateCount=0;
  private lastNewlySkipped:string[]=[];
  private keyForCell:(id:string)=>string;

  constructor(keyForCell:(id:string)=>string){
    if(typeof keyForCell!=='function')throw new Error('Forest work index requires a patch-key function');
    this.keyForCell=keyForCell;
  }

  /** `patchKeys`, when given, is keyForCell(cells[i].id) for every cell. */
  setSelection(cells:readonly {id:string}[],patchKeys?:readonly string[]){
    if(!Array.isArray(cells)||cells.some(cell=>!cell||typeof cell.id!=='string'))throw new Error('Invalid forest work selection');
    if(patchKeys!==undefined&&(!Array.isArray(patchKeys)||patchKeys.length!==cells.length))throw new Error('Invalid forest work patch keys');
    const groups=new Map<string,number[]>(),keys:string[]=[],indices:number[]=[];
    // Neighbouring cells usually share a patch: reuse the last group's list.
    let lastKey='',lastMembers:number[]|undefined;
    for(let index=0;index<cells.length;index++){
      const key=patchKeys?patchKeys[index]:this.keyForCell(cells[index].id);if(typeof key!=='string'||!key)throw new Error('Invalid forest work patch key');
      keys.push(key);indices.push(index);
      if(key===lastKey){lastMembers!.push(index);continue;}
      const members=groups.get(key);if(members)members.push(index);else groups.set(key,[index]);
      lastKey=key;lastMembers=members??groups.get(key);
    }
    this.cells=cells;this.keys=keys;this.groups=groups;this.skipped.clear();this.lastNewlySkipped=[];
    this.indices=indices;this.rebuildCount++;
  }

  /** Update only when census/habitat readiness changes which patches can be
   * skipped. Returned IDs are the just-skipped cells whose retention state
   * must be cleared exactly as the former per-cell far gate did. */
  updateSkipped(next:ReadonlySet<string>){
    let changed=next.size!==this.skipped.size;
    if(!changed)for(const key of next)if(!this.skipped.has(key)){changed=true;break;}
    if(!changed){this.lastNewlySkipped=[];return this.indices;}

    const newlySkipped:string[]=[];
    for(const key of next)if(!this.skipped.has(key)){
      const members=this.groups.get(key);if(members)for(const index of members)newlySkipped.push(this.cells[index].id);
    }
    this.skipped=new Set(next);this.lastNewlySkipped=newlySkipped;
    this.indices=this.rebuildActiveIndices();this.rebuildCount++;
    return this.indices;
  }

  /** Apply changed patch membership without rescanning the entire selection.
   * The maintained array remains in canonical cell order. */
  updateSkippedPatches(changes:ReadonlyMap<string,boolean>){
    const newlySkipped:string[]=[];let changed=false;
    for(const [key,skip] of changes){
      const previous=this.skipped.has(key);if(previous===skip)continue;
      const members=this.groups.get(key);if(!members)continue;
      changed=true;
      if(skip){
        this.skipped.add(key);
        for(const index of members){
          const position=this.lowerBound(this.indices,index);
          if(this.indices[position]===index)this.indices.splice(position,1);
          newlySkipped.push(this.cells[index].id);
        }
      }else{
        this.skipped.delete(key);
        for(const index of members){
          const position=this.lowerBound(this.indices,index);
          if(this.indices[position]!==index)this.indices.splice(position,0,index);
        }
      }
    }
    this.lastNewlySkipped=newlySkipped;
    if(changed)this.incrementalUpdateCount++;
    return this.indices;
  }

  newlySkippedIds(){return this.lastNewlySkipped;}
  currentIndices(){return this.indices;}
  diagnostics(){return {selectionCells:this.cells.length,groups:this.groups.size,skippedGroups:this.skipped.size,
    skippedCells:this.cells.length-this.indices.length,activeCells:this.indices.length,rebuilds:this.rebuildCount,incrementalUpdates:this.incrementalUpdateCount};}

  private lowerBound(values:readonly number[],target:number){
    let low=0,high=values.length;while(low<high){const middle=(low+high)>>>1;if(values[middle]<target)low=middle+1;else high=middle;}return low;
  }

  private rebuildActiveIndices(){
    const ordered:number[]=[];
    for(let index=0;index<this.keys.length;index++)if(!this.skipped.has(this.keys[index]))ordered.push(index);
    return ordered;
  }
}
