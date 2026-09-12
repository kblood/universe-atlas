import {hash64, type Body} from './catalog.ts';
import {YEAR_NS, dateRecord} from './world-time.ts';
export const HISTORY_VERSION='atlas-history-fixtures-1';
/** Sidecars preserve the atlas-1 catalogue digest. These are explicitly heuristic
 * data fixtures, not published stellar tracks or active visual evolution. */
export function identityRecord(body: Body) {
  return {id:body.id, parentId:body.parentId, predecessors:[] as string[],
    existence:{from:null,until:null}, reference:dateRecord(0n), version:HISTORY_VERSION};
}
export function stellarHistory(body: Body) {
  if(body.kind!=='star') throw new Error('Stellar history requires a star');
  const solarMass=Math.max(.08,body.massKg/1.98847e30);
  const mainYears=Math.round(Math.max(3e6,Math.min(1e13,1e10*solarMass**-2.5)));
  const ageFraction=.15+Number(hash64(body.seed+'/history-age')%5000n)/10000;
  const formation=-BigInt(Math.round(Math.min(mainYears,13.7e9)*ageFraction))*YEAR_NS;
  const giant=formation+BigInt(mainYears)*YEAR_NS;
  const remnantAt=giant+BigInt(Math.round(mainYears*.1))*YEAR_NS;
  const outcome=solarMass<8?'white-dwarf':solarMass<25?'neutron-star':'black-hole';
  return {...identityRecord(body), provenance:'heuristic-data-fixture',
    formationNs:formation.toString(), giantNs:giant.toString(), remnantNs:remnantAt.toString(), outcome,
    remnantId:body.id+'/remnant/0',
    orbitValidity:{fromNs:formation.toString(),untilNs:giant.toString()},
    visualEvolution:false};
}
