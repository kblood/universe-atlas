/** Prototype worker-side retention only. Admission bounds retained typed output;
 * reducer working sets, caller-owned results and GPU pools are separate costs. */
import type {QuadrupedBodyData} from './fauna-body-plan.ts';
import {buildFaunaBodyLodCandidates,type FaunaLodCandidateOptions} from './fauna-body-lod-candidates.ts';
type Result=ReturnType<typeof buildFaunaBodyLodCandidates>;
type Entry={result:Result;key:string;arrays:object[];plan:object;genome:object;bytes:number};
const sourceArrays=(s:QuadrupedBodyData)=>[s.positions,s.normals,s.colors,s.skinIndex,s.skinWeight,s.index];
export class FaunaLodCandidateCache {
  private entries=new Map<QuadrupedBodyData,Entry>();
  readonly capacity:number;readonly maxDerivedBytes:number;
  constructor(capacity=4,maxDerivedBytes=8*1024*1024){
    if(!Number.isInteger(capacity)||capacity<1||capacity>8||!Number.isInteger(maxDerivedBytes)||maxDerivedBytes<1024||maxDerivedBytes>16*1024*1024)throw new Error('fauna lod candidate cache: capacity1..8 and retained byte budget1KiB..16MiB required');
    this.capacity=capacity;this.maxDerivedBytes=maxDerivedBytes;
  }
  get(source:QuadrupedBodyData,options:FaunaLodCandidateOptions={}):Result{
    const key=JSON.stringify({targets:options.targets??[1500,750,500],methods:options.methods??['joint-constrained-qem','skin-coat-adaptive-cluster']}),arrays=sourceArrays(source),entry=this.entries.get(source);
    if(entry&&entry.key===key&&entry.plan===source.plan&&entry.genome===source.plan.genome&&entry.arrays.every((a,i)=>a===arrays[i])){
      this.entries.delete(source);this.entries.set(source,entry);return entry.result;
    }
    // Never transfer borrowed source buffers. Source mutation is unsupported;
    // explicit invalidate is required for in-place edits, as in the base cache.
    const result=buildFaunaBodyLodCandidates(source,options),bytes=[result.baseline,...result.chains].reduce((n,chain)=>n+chain.levels.reduce((sum,l)=>sum+l.byteLength,0),0)+result.chains.reduce((sum,c)=>sum+c.anchorVertices.byteLength,0);
    if(bytes>this.maxDerivedBytes)throw new Error('fauna lod candidate cache: result exceeds retained byte budget');
    this.entries.delete(source);
    while(this.entries.size>=this.capacity||this.allocatedBytes+bytes>this.maxDerivedBytes)this.entries.delete(this.entries.keys().next().value!);
    this.entries.set(source,{result,key,arrays,plan:source.plan,genome:source.plan.genome,bytes});return result;
  }
  invalidate(source:QuadrupedBodyData):void{this.entries.delete(source);}
  clear():void{this.entries.clear();}
  get size():number{return this.entries.size;}
  get allocatedBytes():number{let n=0;for(const e of this.entries.values())n+=e.bytes;return n;}
  /** Borrowed buffers kept alive by this cache, not additional allocations.
   * Still charge their ownership if the original near-rig cache evicts them. */
  get retainedSourceBytes():number{
    const buffers=new Set<ArrayBufferLike>();for(const s of this.entries.keys())for(const a of sourceArrays(s))buffers.add(a.buffer);
    let n=0;for(const b of buffers)n+=b.byteLength;return n;
  }
}
