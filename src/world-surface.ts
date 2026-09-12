import {type Body, type V3} from './catalog.ts';
import {terrainSampler, TERRAIN_VERSION} from './terrain.ts';
export const SURFACE_VERSION='atlas-surface-1';
export type WaterKey = {dateNs:bigint; levelM:number};
export function waterLevelAt(keys: readonly WaterKey[], date:bigint): number {
  if (!keys.length) return 0;
  for(let i=1;i<keys.length;i++) if(keys[i].dateNs<=keys[i-1].dateNs) throw new Error('Water keys must be strictly ordered');
  if(date<=keys[0].dateNs) return keys[0].levelM;
  for(let i=1;i<keys.length;i++) if(date<keys[i].dateNs) {
    const a=keys[i-1],b=keys[i];
    return a.levelM+(b.levelM-a.levelM)*Number(date-a.dateNs)/Number(b.dateNs-a.dateNs);
  }
  return keys[keys.length-1].levelM;
}
/** The baseline water parameter is immutable geology input. Changing the water
 * surface never changes this rock field. Future geology sits behind this query. */
export function surfaceQuery(body:Body, keys:readonly WaterKey[]=[]) {
  const rock=terrainSampler({...body});
  return (direction:V3,date=0n)=>{
    const sample=rock(direction), levelM=waterLevelAt(keys,date);
    const solid=body.kind!=='star'&&body.type!=='Gas giant';
    const water=!!body.water&&sample.elevationM<levelM;
    return {...sample,solid,rockHeightM:sample.elevationM,waterLevelM:body.water?levelM:null,
      visibleHeightM:body.water?Math.max(sample.elevationM,levelM):sample.elevationM,
      ocean:water,walkable:solid&&!water,version:SURFACE_VERSION,geologyVersion:TERRAIN_VERSION};
  };
}
