export type ForestSlotRange=Readonly<{start:number;count:number;generation:number}>;

/** Whole-patch contiguous allocations. Tokens prevent a late free from
 * releasing another patch that has since reused the same numeric slots. */
export class ForestSlotAllocator {
  private freeRanges:{start:number;count:number}[];
  private allocated=new Map<number,ForestSlotRange>();
  private generation=0;private used=0;private failures=0;
  readonly capacity:number;
  constructor(capacity:number){
    if(!Number.isInteger(capacity)||capacity<1||capacity>229376)throw new Error('Invalid forest slot capacity');
    this.capacity=capacity;this.freeRanges=[{start:0,count:capacity}];
  }
  allocate(count:number):ForestSlotRange|null {
    if(!Number.isInteger(count)||count<0||count>64)throw new Error('Invalid forest patch slot count');
    if(count===0)return Object.freeze({start:0,count:0,generation:++this.generation});
    const index=this.freeRanges.findIndex(r=>r.count>=count);
    if(index<0){this.failures++;return null;}
    const free=this.freeRanges[index],range=Object.freeze({start:free.start,count,generation:++this.generation});
    free.start+=count;free.count-=count;if(!free.count)this.freeRanges.splice(index,1);
    this.allocated.set(range.start,range);this.used+=count;return range;
  }
  free(range:ForestSlotRange){
    if(range.count===0)return;
    if(this.allocated.get(range.start)!==range)throw new Error('Stale forest slot allocation');
    this.allocated.delete(range.start);this.used-=range.count;
    let index=this.freeRanges.findIndex(r=>r.start>range.start);if(index<0)index=this.freeRanges.length;
    this.freeRanges.splice(index,0,{start:range.start,count:range.count});
    if(index>0&&this.freeRanges[index-1].start+this.freeRanges[index-1].count===this.freeRanges[index].start){
      this.freeRanges[index-1].count+=this.freeRanges[index].count;this.freeRanges.splice(index,1);index--;
    }
    if(index+1<this.freeRanges.length&&this.freeRanges[index].start+this.freeRanges[index].count===this.freeRanges[index+1].start){
      this.freeRanges[index].count+=this.freeRanges[index+1].count;this.freeRanges.splice(index+1,1);
    }
  }
  diagnostics(){return {capacity:this.capacity,used:this.used,free:this.capacity-this.used,allocations:this.allocated.size,
    freeExtents:this.freeRanges.length,largestFree:this.freeRanges.reduce((n,r)=>Math.max(n,r.count),0),failures:this.failures};}
}
