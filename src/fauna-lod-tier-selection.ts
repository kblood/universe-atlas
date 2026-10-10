/** Presentation-only slot hysteresis. Input remains in canonical camera order;
 * only representation choices change, with at most16 close/112 middle owners. */
import {faunaLodTierAt,type FaunaLodTier,type FaunaLodContext} from './fauna-lod-controller.ts';
export const FAUNA_LOD_CLOSE_SLOTS=16;
export const FAUNA_LOD_CLOSE_REPLACEMENT_RATIO=.8;
export class FaunaLodTierSelection {
  private context:FaunaLodContext|null=null;
  private preferred=new Map<string,FaunaLodTier>();
  private assigned=new Map<string,FaunaLodTier>();
  private nextAssigned=new Map<string,FaunaLodTier>();
  private reasons=new Map<string,'distance'|'rank'>();
  private close=new Set<string>();
  private nextClose=new Set<string>();
  private distances=new Map<string,number>();
  private candidates:{id:string;distanceM:number}[]=[];
  setContext(context:FaunaLodContext){const prior=this.context;
    if(!prior||prior.planetId!==context.planetId||prior.lifeSignature!==context.lifeSignature||prior.dateVersion!==context.dateVersion||prior.appearanceVersion!==context.appearanceVersion){this.clear();this.context={...context};}}
  select(rows:readonly {id:string;distanceM:number}[]){
    const candidates=this.candidates;candidates.length=0;
    for(const row of rows)if(candidates.length<128||this.close.has(row.id))candidates.push(row);
    this.distances.clear();this.nextClose.clear();
    for(const row of candidates){this.distances.set(row.id,row.distanceM);
      if(this.close.has(row.id)&&row.distanceM<=95)this.nextClose.add(row.id);}
    for(const row of candidates){
      const preferred=faunaLodTierAt(row.distanceM,this.preferred.get(row.id));
      if(preferred!=='close'||this.nextClose.has(row.id))continue;
      if(this.nextClose.size<FAUNA_LOD_CLOSE_SLOTS){this.nextClose.add(row.id);continue;}
      let farthest:string|null=null,farDistance=-Infinity;
      for(const id of this.nextClose){const d=this.distances.get(id)!;if(d>farDistance||(d===farDistance&&(farthest===null||id>farthest))){farthest=id;farDistance=d;}}
      if(row.distanceM<farDistance*FAUNA_LOD_CLOSE_REPLACEMENT_RATIO){this.nextClose.delete(farthest!);this.nextClose.add(row.id);}
    }
    const next=this.nextAssigned;next.clear();let middle=0;
    for(const row of candidates){
      const priorPreferred=this.preferred.get(row.id),preferred=faunaLodTierAt(row.distanceM,priorPreferred);
      const tier=this.nextClose.has(row.id)?'close':'middle';if(tier==='middle'&&middle++>=112)continue;
      next.set(row.id,tier);const prior=this.assigned.get(row.id);
      if(prior&&(prior!==tier||preferred!==priorPreferred))this.reasons.set(row.id,preferred!==priorPreferred?'distance':'rank');
      this.preferred.set(row.id,preferred);
    }
    for(const id of this.preferred.keys())if(!next.has(id))this.preferred.delete(id);
    for(const id of this.reasons.keys())if(!next.has(id))this.reasons.delete(id);
    this.nextAssigned=this.assigned;this.assigned=next;this.close.clear();for(const id of this.nextClose)if(next.get(id)==='close')this.close.add(id);
    return this.assigned;
  }
  reasonOf(id:string){return this.reasons.get(id);}
  isCloseOwner(id:string){return this.close.has(id);}
  clear(){this.context=null;this.candidates.length=0;this.preferred.clear();this.assigned.clear();this.nextAssigned.clear();this.reasons.clear();this.close.clear();this.nextClose.clear();this.distances.clear();}
}
