export type ForestWaterInterval=readonly [number,number];

/** Every recorded predicate has the form threshold < water. Keeping all of
 * them unchanged preserves the evaluated habitat path and its ground samples.
 * The lower bound is exclusive; the upper bound includes equality. */
export class ForestWaterValidity {
  private lower=-Infinity;private upper=Infinity;readonly water:number;
  constructor(water:number){if(!Number.isFinite(water))throw new Error('Invalid forest water level');this.water=water;}
  reset(){this.lower=-Infinity;this.upper=Infinity;}
  observe=(threshold:number)=>{
    if(!Number.isFinite(threshold))throw new Error('Non-finite forest water threshold');
    if(threshold<this.water)this.lower=Math.max(this.lower,threshold);
    else this.upper=Math.min(this.upper,threshold);
  };
  interval():ForestWaterInterval{return [this.lower,this.upper];}
}
export function validForestWaterInterval(value:unknown):value is ForestWaterInterval{
  return Array.isArray(value)&&value.length===2&&value.every(v=>typeof v==='number'&&!Number.isNaN(v))&&value[0]<value[1];
}
export function forestWaterIntervalContains(interval:ForestWaterInterval|undefined,water:number){
  return !!interval&&Number.isFinite(water)&&water>interval[0]&&water<=interval[1];
}
