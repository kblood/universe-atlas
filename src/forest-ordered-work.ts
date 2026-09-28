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
  private lastNewlySkipped:string[]=[];
  private keyForCell:(id:string)=>string;

  constructor(keyForCell:(id:string)=>string){
    if(typeof keyForCell!=='function')throw new Error('Forest work index requires a patch-key function');
    this.keyForCell=keyForCell;
  }

  setSelection(cells:readonly {id:string}[]){
    if(!Array.isArray(cells)||cells.some(cell=>!cell||typeof cell.id!=='string'))throw new Error('Invalid forest work selection');
    const groups=new Map<string,number[]>(),keys:string[]=[];
    for(let index=0;index<cells.length;index++){
      const key=this.keyForCell(cells[index].id);if(typeof key!=='string'||!key)throw new Error('Invalid forest work patch key');
      keys.push(key);
      const members=groups.get(key);if(members)members.push(index);else groups.set(key,[index]);
    }
    this.cells=cells;this.keys=keys;this.groups=groups;this.skipped.clear();this.lastNewlySkipped=[];
    this.indices=Array.from({length:cells.length},(_,index)=>index);this.rebuildCount++;
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

  newlySkippedIds(){return this.lastNewlySkipped;}
  currentIndices(){return this.indices;}
  diagnostics(){return {selectionCells:this.cells.length,groups:this.groups.size,skippedGroups:this.skipped.size,
    skippedCells:this.cells.length-this.indices.length,activeCells:this.indices.length,rebuilds:this.rebuildCount};}

  private rebuildActiveIndices(){
    const ordered:number[]=[];
    for(let index=0;index<this.keys.length;index++)if(!this.skipped.has(this.keys[index]))ordered.push(index);
    return ordered;
  }
}
