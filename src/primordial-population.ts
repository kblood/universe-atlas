/** Sparse, procedural first-star cohort for Atlas's local comoving map.
 * This is a reproducible explanatory population, not an N-body or calibrated
 * Population III mass function. Its remnants contribute an enrichment proxy. */
import { rng } from './catalog.ts';
import { YEAR_NS, type Ns } from './world-time.ts';
import type { GalaxyAddress } from './address.ts';

export const PRIMORDIAL_POPULATION_VERSION = 'atlas-primordial-2-address-lineage';
export type PrimordialStar = {
  id:string;
  protoRegionId:string;
  descendantGalaxyId:string;
  birthNs:Ns;
  deathNs:Ns;
  x:number;
  y:number;
  brightness:number;
};

function addressKey(address:GalaxyAddress):string {
  return `${address.clusterCell.join(',')}/${address.groupCell.join(',')}/${address.galaxyOrdinal}`;
}

/** Root catalogue compatibility is retained when no address is supplied.
 * An explicit address produces a small, deterministic first-star precursor
 * set scoped to that galaxy; local G### ordinals never imply root ancestry. */
export function primordialStars(seed:string,address?:GalaxyAddress):readonly PrimordialStar[] {
  const root=!address||address.clusterCell.every(v=>v===0n)&&address.groupCell.every(v=>v===0n);
  if(root) {
    const out:PrimordialStar[]=[];
    for(let i=0;i<96;i++){
      const key=`${seed}/primordial/${i}`;
      const draw=rng(key);
      const descendantGalaxyId=`G${String(i%32+1).padStart(3,'0')}`;
      const birthYears=i===0?100_000_000:100_000_000+Math.floor(draw()*350_000_000);
      const lifetimeYears=3_000_000+Math.floor(draw()*27_000_000);
      out.push({
        id:`${key}/star`,protoRegionId:`${seed}/proto-region/${descendantGalaxyId}`,
        descendantGalaxyId,
        birthNs:BigInt(birthYears)*YEAR_NS,
        deathNs:BigInt(birthYears+lifetimeYears)*YEAR_NS,
        x:5+draw()*90,y:5+draw()*90,brightness:.45+draw()*.55,
      });
    }
    return out;
  }
  const lineage=addressKey(address);
  const out:PrimordialStar[]=[];
  for(let i=0;i<3;i++){
    const key=`${seed}/primordial/${lineage}/${i}`;
    const draw=rng(key);
    const birthYears=100_000_000+Math.floor(draw()*350_000_000);
    const lifetimeYears=3_000_000+Math.floor(draw()*27_000_000);
    const descendantGalaxyId=`G${String(address.galaxyOrdinal+1).padStart(3,'0')}`;
    out.push({id:`${key}/star`,protoRegionId:`${seed}/proto-region/${lineage}`,
      descendantGalaxyId,birthNs:BigInt(birthYears)*YEAR_NS,
      deathNs:BigInt(birthYears+lifetimeYears)*YEAR_NS,
      x:5+draw()*90,y:5+draw()*90,brightness:.45+draw()*.55});
  }
  return out;
}

export function primordialStarsAt(stars:readonly PrimordialStar[],t:Ns):readonly PrimordialStar[] {
  return stars.filter(star=>star.birthNs<=t&&t<star.deathNs);
}

export function primordialEnrichmentProxyAt(stars:readonly PrimordialStar[],t:Ns):number {
  return stars.reduce((count,star)=>count+(star.deathNs<=t?1:0),0)/Math.max(1,stars.length);
}
