/** Historical short-lived stellar population sampled for a galaxy view.
 * These are stable, non-navigable population points, kept separate from the
 * surviving reference catalogue. They provide a dated enrichment proxy; the
 * model is procedural rather than a measured star-formation history. */
import { rng, type Galaxy, type V3 } from './catalog.ts';
import { galaxyLifecycle, resolveMergeTarget } from './galaxy-history.ts';
import { CATALOGUE_EPOCH_NS, YEAR_NS, type Ns } from './world-time.ts';
import {primordialStars} from './primordial-population.ts';
import type { GalaxyAddress } from './address.ts';

export const STELLAR_COHORT_VERSION='atlas-stellar-cohorts-5-address-lineage';
export type HistoricalStar={id:string;hostGalaxyId:string;ancestryStarId:string;birthNs:Ns;deathNs:Ns;positionLy:V3;color:string;/** Bounded, dimensionless birth-metallicity proxy; not an abundance measurement. */ chemicalEnrichment?:number};
const historicalCache=new Map<string,readonly HistoricalStar[]>();
const futureCache=new Map<string,readonly HistoricalStar[]>();
function cacheKey(seed:string,g:Galaxy,a:GalaxyAddress):string{return JSON.stringify([STELLAR_COHORT_VERSION,seed,a.clusterCell.map(String),a.groupCell.map(String),a.galaxyOrdinal,g.id,g.radiusLy]);}
function remember(cache:Map<string,readonly HistoricalStar[]>,key:string,stars:readonly HistoricalStar[]){
  if(cache.size>=64)cache.delete(cache.keys().next().value!);
  cache.set(key,stars);
  return stars;
}

function addressForGalaxy(g:Galaxy,address?:GalaxyAddress):GalaxyAddress {
  if(address)return address;
  const match=/^G(\d{3})$/.exec(g.id);
  const ordinal=match?Number(match[1])-1:-1;
  if(!Number.isInteger(ordinal)||ordinal<0)throw new Error(`stellar cohort lineage requires a canonical galaxy ID (got ${g.id})`);
  return {clusterCell:[0n,0n,0n],groupCell:[0n,0n,0n],galaxyOrdinal:ordinal};
}
function addressKey(a:GalaxyAddress):string{return `${a.clusterCell.join(',')}/${a.groupCell.join(',')}/${a.galaxyOrdinal}`;}
function isRoot(a:GalaxyAddress):boolean{return a.clusterCell.every(v=>v===0n)&&a.groupCell.every(v=>v===0n);}
function galaxyIdForAddress(address:GalaxyAddress):string {
  return `G${String(address.galaxyOrdinal+1).padStart(3,'0')}`;
}
function primordialChemicalEnrichmentAt(seed:string,g:Galaxy,t:Ns,address:GalaxyAddress):number {
  let metalFreeGas=1;
  for(const s of primordialStars(seed,address).filter(s=>!isRoot(address)||s.descendantGalaxyId===g.id))if(s.deathNs<=t)
    metalFreeGas*=1-(.002+.018*rng(`${s.id}/metal-yield`)());
  return 1-metalFreeGas;
}

/** Resolve the physical host after any scheduled merge. Catalogue IDs and
 * stellar IDs remain attached to their original source; this is a display /
 * query redirect only. The current generator has at most one merge hop. */
export function galaxyHostAt(seed:string,g:Galaxy,t:Ns,address?:GalaxyAddress):{sourceGalaxyId:string;hostGalaxyId:string;sourceAddress:GalaxyAddress;hostAddress:GalaxyAddress;transferred:boolean;transferNs:Ns|null} {
  const lc=galaxyLifecycle(seed,addressForGalaxy(g,address));
  const host=resolveMergeTarget(a=>galaxyLifecycle(seed,a),lc.address,t);
  return {sourceGalaxyId:g.id,hostGalaxyId:galaxyIdForAddress(host.address),sourceAddress:lc.address,hostAddress:host.address,
    transferred:addressKey(host.address)!==addressKey(lc.address),
    transferNs:lc.mergeNs!==null&&t>=lc.mergeNs?lc.mergeNs:null};
}

export function historicalStarsForGalaxy(seed:string,g:Galaxy,address?:GalaxyAddress):readonly HistoricalStar[] {
  const canonical=addressForGalaxy(g,address),keyForCache=cacheKey(seed,g,canonical);
  const cached=historicalCache.get(keyForCache);if(cached)return cached;
  const lifecycle=galaxyLifecycle(seed,canonical);
  // This is an extinct cohort by definition. Keep every death before the
  // reference catalogue so a point cannot masquerade as a surviving star.
  const latestBirthNs=CATALOGUE_EPOCH_NS-30_000_000n*YEAR_NS;
  const ancestors=primordialStars(seed,canonical).filter(s=>!isRoot(canonical)||s.descendantGalaxyId===g.id);
  const lineage=addressKey(canonical);
  const end=lifecycle.quenchNs===null?latestBirthNs:(lifecycle.quenchNs<latestBirthNs?lifecycle.quenchNs:latestBirthNs);
  const cutoff=lifecycle.mergeNs===null?end:(lifecycle.mergeNs<end?lifecycle.mergeNs:end);
  if(cutoff<=lifecycle.birthNs)return remember(historicalCache,keyForCache,[]);
  const result:HistoricalStar[]=[];
  for(let i=0;i<384;i++){
    const key=isRoot(canonical)?`${seed}/${g.id}/historical-star/${i}`:`${seed}/galaxy/${lineage}/${g.id}/historical-star/${i}`;
    const draw=rng(key);
    const ancestor=ancestors[i%ancestors.length];
    const fraction=BigInt(Math.floor(draw()*1_000_000_000));
    const earliestBirthNs=ancestor&&ancestor.deathNs>lifecycle.birthNs?ancestor.deathNs:lifecycle.birthNs;
    if(earliestBirthNs>=cutoff)continue;
    const span=cutoff-earliestBirthNs;
    const birthNs=earliestBirthNs+span*fraction/1_000_000_000n;
    const lifetimeYears=3_000_000+Math.floor(draw()*27_000_000);
    const deathNs=birthNs+BigInt(lifetimeYears)*YEAR_NS;
    const radius=g.radiusLy*Math.sqrt(draw())*.9;
    const angle=draw()*Math.PI*2;
    const height=(draw()-.5)*g.radiusLy*.08;
    result.push({id:`${key}/star`,hostGalaxyId:g.id,ancestryStarId:ancestor?.id??'unresolved',birthNs,deathNs,
      positionLy:[Math.cos(angle)*radius,height,Math.sin(angle)*radius],
      color:draw()<.72?'#bbd8ff':'#f6d3aa',chemicalEnrichment:primordialChemicalEnrichmentAt(seed,g,birthNs,canonical)});
  }
  return remember(historicalCache,keyForCache,result);
}

export function historicalStarsAt(stars:readonly HistoricalStar[],t:Ns):readonly HistoricalStar[] {
  return stars.filter(s=>s.birthNs<=t&&t<s.deathNs);
}

/** Coarse post-reference star formation, limited by the host galaxy's own
 * quench and merger schedule. The reference catalogue itself is unchanged. */
export function futureStarsForGalaxy(seed:string,g:Galaxy,address?:GalaxyAddress):readonly HistoricalStar[] {
  const canonical=addressForGalaxy(g,address),keyForCache=cacheKey(seed,g,canonical);
  const cached=futureCache.get(keyForCache);if(cached)return cached;
  const lifecycle=galaxyLifecycle(seed,canonical);
  const ancestors=historicalStarsForGalaxy(seed,g,canonical);
  const precursors=primordialStars(seed,canonical).filter(s=>!isRoot(canonical)||s.descendantGalaxyId===g.id),lineage=addressKey(canonical);
  const result:HistoricalStar[]=[];
  for(let i=0;i<128;i++){
    const key=isRoot(canonical)?`${seed}/${g.id}/future-star/${i}`:`${seed}/galaxy/${lineage}/${g.id}/future-star/${i}`;
    const draw=rng(key);
    const birthYears=1_000_000+Math.floor(draw()*20_000_000_000);
    const birthNs=CATALOGUE_EPOCH_NS+BigInt(birthYears)*YEAR_NS;
    if((lifecycle.quenchNs!==null&&birthNs>=lifecycle.quenchNs)||
      (lifecycle.mergeNs!==null&&birthNs>=lifecycle.mergeNs))continue;
    // Birth composition is evaluated at the cohort's own date; it modestly
    // shifts this toy lifetime/color mix while preserving the fixed address
    // draw sequence and leaving catalogue stars untouched.
    const birthEnrichment=galaxyChemicalEnrichmentAt(seed,g,birthNs,canonical);
    const lifetimeYears=Math.floor((100_000_000+draw()*draw()*10_000_000_000_000)*(1+birthEnrichment*.12));
    const radius=g.radiusLy*Math.sqrt(draw())*.9;
    const angle=draw()*Math.PI*2;
    result.push({id:`${key}/star`,hostGalaxyId:g.id,
      ancestryStarId:(ancestors.length?ancestors[i%ancestors.length]:precursors[i%precursors.length]).id,
      birthNs,deathNs:birthNs+BigInt(lifetimeYears)*YEAR_NS,
      positionLy:[Math.cos(angle)*radius,(draw()-.5)*g.radiusLy*.08,Math.sin(angle)*radius],
      color:draw()<Math.max(.12,.62-birthEnrichment*.25)?'#bcd9ff':'#f5cc9d',chemicalEnrichment:birthEnrichment});
  }
  return remember(futureCache,keyForCache,result);
}

export function galaxyEnrichmentProxyAt(stars:readonly HistoricalStar[],t:Ns):number {
  // Bounded closed-form yield proxy: each completed short-lived star adds a
  // small seeded yield, saturating as a leaky-box abundance approaches 1.
  // This intentionally ignores gas flows, IMF, yields by mass, and spatial
  // mixing; it is explanatory only and does not replay a time series.
  let metalFreeGas=1;
  for(const s of stars)if(s.deathNs<=t){
    const y=.002+.018*rng(`${s.id}/metal-yield`)();
    metalFreeGas*=1-y;
  }
  return 1-metalFreeGas;
}

/** Causal bounded enrichment proxy from the fixed primordial and historical
 * cohorts. Work is O(cohort count), independent of elapsed simulated time. */
export function galaxyChemicalEnrichmentAt(seed:string,g:Galaxy,t:Ns,address?:GalaxyAddress):number {
  const canonical=addressForGalaxy(g,address);
  const history=historicalStarsForGalaxy(seed,g,canonical);
  let metalFreeGas=1-primordialChemicalEnrichmentAt(seed,g,t,canonical);
  for(const s of history)if(s.deathNs<=t)metalFreeGas*=1-(.002+.018*rng(`${s.id}/metal-yield`)());
  return 1-metalFreeGas;
}

/** A visible lineage summary, not an absolute chemical abundance. */
export function galaxyLineageAt(seed:string,g:Galaxy,t:Ns,address?:GalaxyAddress){
  const canonical=addressForGalaxy(g,address);
  const ancestors=primordialStars(seed,canonical).filter(s=>!isRoot(canonical)||s.descendantGalaxyId===g.id);
  const history=historicalStarsForGalaxy(seed,g,canonical);
  const primordialEnded=ancestors.filter(star=>star.deathNs<=t).length;
  const historicalAlive=history.filter(star=>star.birthNs<=t&&t<star.deathNs).length;
  const historicalEnded=history.filter(star=>star.deathNs<=t).length;
  const futureAlive=futureStarsForGalaxy(seed,g,canonical).filter(star=>star.birthNs<=t&&t<star.deathNs).length;
  const host=galaxyHostAt(seed,g,t,canonical);
  return {primordialEnded,historicalAlive,historicalEnded,futureAlive,
    hostGalaxyId:host.hostGalaxyId,sourceAddress:host.sourceAddress,hostAddress:host.hostAddress,transferred:host.transferred,transferNs:host.transferNs,
    enrichmentProxy:galaxyChemicalEnrichmentAt(seed,g,t,canonical)};
}
