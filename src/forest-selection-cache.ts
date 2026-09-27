import type {V3} from './catalog.ts';
import {cubeDirection} from './planet-tiles.ts';
import {forestRepresentative,type PopulationCell} from './planet-population.ts';
import {forestPatch,FOREST_PATCH_SIDE as SIDE} from './forest-patch.ts';

type PackedPatch={values:Float64Array;offsets:Uint8Array;representatives:Uint8Array;bytes:number};
/** Worker-owned, bounded cache of immutable population arithmetic. Habitat,
 * water and dates are intentionally absent: they do not choose cell addresses.
 * Packed doubles preserve the original jitter/height and selection boundaries. */
export class ForestSelectionCache {
  private entries=new Map<string,PackedPatch>();
  private bytes=0;
  private n:number;
  private seed:string;private radiusM:number;private maxBytes:number;private maxEntries:number;
  private hits=0;private misses=0;private evictions=0;private visited=0;
  constructor(seed:string,radiusM:number,cellM:number,maxBytes=32*1024*1024,maxEntries=30000){
    this.seed=seed;this.radiusM=radiusM;this.maxBytes=maxBytes;this.maxEntries=maxEntries;
    this.n=Math.ceil(2*radiusM/cellM);
    if(!Number.isFinite(radiusM)||radiusM<=0||!Number.isFinite(cellM)||cellM<=0||
      !Number.isSafeInteger(this.n)||!Number.isSafeInteger(maxBytes)||maxBytes<0||
      !Number.isSafeInteger(maxEntries)||maxEntries<0)throw new Error('Invalid forest selection cache limits');
  }
  private patch(face:number,x:number,y:number){
    const key=`${face}/${x}/${y}`,cached=this.entries.get(key);
    if(cached){this.hits++;this.entries.delete(key);this.entries.set(key,cached);return cached;}
    this.misses++;
    const cells=forestPatch(this.seed,{face,n:this.n,x,y}).cells;
    // Nine doubles: cell-centre direction, jittered direction, roll, height, yaw.
    const values=new Float64Array(cells.length*9),offsets=new Uint8Array(cells.length),representatives=new Uint8Array(cells.length);
    for(let i=0;i<cells.length;i++){
      const c=cells[i],parts=c.id.split('/'),ix=Number(parts[2]),iy=Number(parts[3]);
      const centre=cubeDirection(face,(ix+.5)*2/this.n-1,(iy+.5)*2/this.n-1);
      values.set([...centre,...c.direction,c.roll,c.heightM,c.yaw],i*9);
      offsets[i]=(iy-y*SIDE)*SIDE+ix-x*SIDE;representatives[i]=Number(forestRepresentative(this.seed,c.id));
    }
    // Include a conservative entry/key allowance; this is not driver/JS heap accounting.
    const bytes=values.byteLength+offsets.byteLength+representatives.byteLength+256+key.length*2;
    const entry={values,offsets,representatives,bytes};
    if(bytes<=this.maxBytes&&this.maxEntries>0){
      while(this.entries.size&&(this.bytes+bytes>this.maxBytes||this.entries.size>=this.maxEntries)){
        const oldest=this.entries.keys().next().value!;this.bytes-=this.entries.get(oldest)!.bytes;this.entries.delete(oldest);this.evictions++;
      }
      this.entries.set(key,entry);this.bytes+=bytes;
    }
    return entry;
  }
  select(center:V3,nearRangeM:number,farRangeM:number):PopulationCell[]{
    if(!center.every(Number.isFinite)||Math.abs(Math.hypot(...center)-1)>1e-10||
      !Number.isFinite(nearRangeM)||nearRangeM<0||!Number.isFinite(farRangeM)||farRangeM<=0||nearRangeM>farRangeM)throw new Error('Invalid forest selection query');
    this.hits=0;this.misses=0;this.visited=0;
    const n=this.n,angular=farRangeM/this.radiusM,limit=angular*angular,nearLimit=(nearRangeM/this.radiusM)**2;
    const [cx,cy,cz]=center,components=[cx,-cx,cy,-cy,cz,-cz],result:PopulationCell[]=[];
    for(let face=0;face<6;face++){
      const axis=components[face];if(axis<.5-angular*2)continue;
      const [u,v]=[[-cz/axis,cy/axis],[cz/axis,cy/axis],[cx/axis,-cz/axis],[cx/axis,cz/axis],[cx/axis,cy/axis],[-cx/axis,cy/axis]][face];
      const span=angular*3,loX=Math.max(0,Math.floor((u-span+1)*n/2)),hiX=Math.min(n-1,Math.ceil((u+span+1)*n/2));
      const loY=Math.max(0,Math.floor((v-span+1)*n/2)),hiY=Math.min(n-1,Math.ceil((v+span+1)*n/2));
      for(let by=Math.floor(loY/SIDE);by<=Math.floor(hiY/SIDE);by++)for(let bx=Math.floor(loX/SIDE);bx<=Math.floor(hiX/SIDE);bx++){
        const x0=bx*SIDE,y0=by*SIDE,x1=Math.min(n,x0+SIDE),y1=Math.min(n,y0+SIDE);
        const mid=cubeDirection(face,(x0+x1)/n-1,(y0+y1)/n-1);
        // Normalizing a cube face is 1-Lipschitz. This conservative chord bound
        // rejects whole patches outside the disc without dropping edge cells.
        const bound=Math.hypot((x1-x0)/n,(y1-y0)/n);
        if(Math.hypot(mid[0]-cx,mid[1]-cy,mid[2]-cz)>angular+bound+1e-14)continue;
        const p=this.patch(face,bx,by),a=p.values;this.visited++;
        for(let i=0;i<p.offsets.length;i++){
          const offset=p.offsets[i],ix=x0+offset%SIDE,iy=y0+Math.floor(offset/SIDE);
          if(ix<loX||ix>hiX||iy<loY||iy>hiY)continue;
          const k=i*9,d2=(a[k]-cx)**2+(a[k+1]-cy)**2+(a[k+2]-cz)**2;
          if(d2>limit||(!p.representatives[i]&&d2>nearLimit))continue;
          result.push({id:`${face}/${n}/${ix}/${iy}`,direction:[a[k+3],a[k+4],a[k+5]],roll:a[k+6],heightM:a[k+7],yaw:a[k+8],distanceM:Math.sqrt(d2)*this.radiusM,canopyRepresentative:!!p.representatives[i]});
        }
      }
    }
    return result.sort((a,b)=>a.distanceM-b.distanceM||a.id.localeCompare(b.id));
  }
  diagnostics(){return {patches:this.entries.size,estimatedBytes:this.bytes,maxBytes:this.maxBytes,maxEntries:this.maxEntries,hits:this.hits,misses:this.misses,visited:this.visited,evictionsTotal:this.evictions};}
}
