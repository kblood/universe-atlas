/**
 * habitat-suitability-1: evaluate the existing biosphere niches against the
 * shared annual climate (src/surface-climate.ts), for flora presence/species and
 * the fauna round's ecology-weighted species choice.
 *
 * Evaluation only: no niche, species or BIOSPHERE_VERSION change. The niche
 * arithmetic replicates biosphere-model.ts's baseMembership/habitatMembership
 * operation by operation, so suitability is bit-identical (tests pin ===).
 * The only runtime coupling is a type-only import (no creature-model at runtime).
 *
 * Temperature rebasing: biosphere niches are authored around a profile's nominal
 * temperature (biosphere-model.ts profiles), not the planet's catalogue
 * temperature, so a 252 K "cold" world and a 278 K "cold" world share niches.
 * Local climate temperatures are therefore shifted by (nominal - anchor) before
 * evaluation: the planet's anchor maps onto the profile's nominal, and the
 * climate field's latitude/altitude/season structure is kept.
 *
 * Determinism: only + - * /, Math.round/floor/abs/min/max and code-unit string
 * comparison; no hash64, no platform transcendentals, no locale collation.
 */
import type {Species} from './biosphere-model.ts';

export const HABITAT_SUITABILITY_VERSION='habitat-suitability-1';

export type NicheProfile='temperate'|'arid'|'cold';
/** Duplicated from biosphere-model.ts:52-56 (`profiles[*].temp`), which this round
 * must not edit; a parity test checks it against generated niche centres. */
export const PROFILE_NOMINAL_TEMP_K:Readonly<Record<NicheProfile,number>>=Object.freeze({temperate:286,arid:299,cold:268});

export type Niche=Species['niche'];
export type NicheLocal={temperatureK:number;moisture:number;slope01:number;reachable?:boolean};
/** Fauna-facing habitat sample (plan.faunaInterface (3)); types only. */
export type FaunaHabitatSample={
  annualMeanTempK:number; rebasedTempK:number; effectiveMoisture:number; snowFraction:number;
  forestSuitability01:number; slopeDeg:number; ocean:boolean; reachable:boolean;
};

const clamp01=(v:number)=>v<0?0:v>1?1:v;
/** biosphere-model.ts clamp(value,0,1): Math.max(low, Math.min(high, value)). */
const clampBio=(v:number)=>Math.max(0,Math.min(1,v));
/** biosphere-model.ts round(value,3); tenToThe(3) is exactly 1000. */
const round3=(v:number)=>Math.round(v*1000)/1000;

/**
 * Slope in degrees -> the 0..1 slope used by biosphere niches (maxSlope ~0.3-0.95).
 * The biosphere lab never states its slope unit; deg/45 is INFERRED (45 deg is the
 * angle at which the classifier's rock weight saturates, surface-biomes.ts
 * rock=(slope-18)/27). Documented in docs/surface-climate-v1.md.
 */
export function slopeDegToNiche01(deg:number):number {return clamp01(deg/45);}

/** Shift a local climate temperature into the profile's niche frame. */
export function rebaseTemperatureK(localT:number,anchorTempK:number,profile:NicheProfile):number {
  return localT+(PROFILE_NOMINAL_TEMP_K[profile]-anchorTempK);
}

/**
 * baseMembership (biosphere-model.ts:282-293) on an already-rebased temperature:
 * 0.45 temperature tent + 0.40 moisture tent + 0.15 slope term, hard zero outside
 * any range, occupancy (for a reachable producer) at >= 0.28.
 */
export function nicheSuitability(niche:Niche,local:NicheLocal):{suitability:number;occupiedPlant:boolean} {
  const n=niche,T=local.temperatureK,M=local.moisture,S=local.slope01;
  const temp=T<n.minTempK||T>n.maxTempK?0:1-Math.abs(T-(n.minTempK+n.maxTempK)/2)/((n.maxTempK-n.minTempK)/2||1);
  const moist=M<n.minMoisture||M>n.maxMoisture?0:1-Math.abs(M-(n.minMoisture+n.maxMoisture)/2)/((n.maxMoisture-n.minMoisture)/2||1);
  const slope=S>n.maxSlope?0:1-S/n.maxSlope*.35;
  const suitability=round3(clampBio(.45*temp+.4*moist+.15*slope));
  const inRange=!!temp&&!!moist&&!!slope;
  return {suitability,occupiedPlant:inRange&&suitability>0&&suitability>=.28&&local.reachable!==false};
}
export type NicheEvaluator=Readonly<{
  plantIds:readonly string[]; animalIds:readonly string[];
  /** out[i] = suitability of plantIds[i] if habitatMembership would mark it occupied, else 0. */
  plants(local:NicheLocal,out:Float32Array):Float32Array;
  /** Same for animals, including the producer rule (browsers need an occupied
   * tree or shrub, grazers an occupied grass, at the same location). */
  animals(local:NicheLocal,out:Float32Array):Float32Array;
}>;

/**
 * Compile the dated species list (biosphereAt(world,date).species) for one
 * planet. `local.temperatureK` is the LOCAL climate temperature (e.g.
 * ClimateSample.annualMeanTempK); it is rebased internally. O(S) per call.
 *
 * Allocation (PERF-ALLOC-AUDIT, docs/alloc-audit-2-2026-10-08.md): the per-niche
 * test is written out by hand in each loop below. It used to be a helper
 * returning a double, which TurboFan did not inline, so every niche test boxed
 * its result (126-174 B per plants()+animals() pair on Maithea's 24 species,
 * counted from GC events). Each inlined copy is nicheSuitability's arithmetic
 * (biosphere-model.ts baseMembership) with the same operations in the same order:
 * temperature, moisture and slope tents; 0 unless all three are non-zero; then
 * round3(clampBio(.45*temp+.4*moist+.15*slope)), kept when > 0 and >= .28.
 * Keep the three copies identical (tests/habitat-suitability.test.mjs pins them
 * against habitatMembership).
 */
export function compileNicheEvaluator(datedSpecies:readonly Species[],profile:NicheProfile,anchorTempK:number):NicheEvaluator {
  const offset=PROFILE_NOMINAL_TEMP_K[profile]-anchorTempK;
  const plants=datedSpecies.filter(s=>s.kind!=='animal'),animals=datedSpecies.filter(s=>s.kind==='animal');
  // Producer classes exactly as habitatMembership filters world.species.
  const treeOrShrub=Uint8Array.from(plants,s=>s.diet==='producer'&&(s.kind==='tree'||s.kind==='shrub')?1:0);
  const grass=Uint8Array.from(plants,s=>s.diet==='producer'&&s.kind==='grass'?1:0);
  const needsTree=Uint8Array.from(animals,s=>s.diet==='browser'?1:0);
  const plantNiches=plants.map(s=>s.niche),animalNiches=animals.map(s=>s.niche);
  return Object.freeze({
    plantIds:Object.freeze(plants.map(s=>s.id)),animalIds:Object.freeze(animals.map(s=>s.id)),
    plants(local:NicheLocal,out:Float32Array){
      const T=local.temperatureK+offset,M=local.moisture,S=local.slope01,reachable=local.reachable!==false;
      for(let i=0;i<plantNiches.length;i++){
        let v=0;
        if(reachable){
          const n=plantNiches[i]!;
          const temp=T<n.minTempK||T>n.maxTempK?0:1-Math.abs(T-(n.minTempK+n.maxTempK)/2)/((n.maxTempK-n.minTempK)/2||1);
          const moist=M<n.minMoisture||M>n.maxMoisture?0:1-Math.abs(M-(n.minMoisture+n.maxMoisture)/2)/((n.maxMoisture-n.minMoisture)/2||1);
          const slope=S>n.maxSlope?0:1-S/n.maxSlope*.35;
          if(temp&&moist&&slope){
            const suitability=Math.round(Math.max(0,Math.min(1,.45*temp+.4*moist+.15*slope))*1000)/1000;
            if(suitability>0&&suitability>=.28)v=suitability;
          }
        }
        out[i]=v;
      }
      return out;
    },
    animals(local:NicheLocal,out:Float32Array){
      const T=local.temperatureK+offset,M=local.moisture,S=local.slope01;
      if(local.reachable===false){out.fill(0,0,animalNiches.length);return out;}
      // Producer eligibility uses baseMembership only (no reachability), once per call.
      let anyTree=false,anyGrass=false;
      for(let i=0;i<plantNiches.length&&!(anyTree&&anyGrass);i++){
        if(!treeOrShrub[i]&&!grass[i])continue;
        if(treeOrShrub[i]?anyTree:anyGrass)continue;
        const n=plantNiches[i]!;
        const temp=T<n.minTempK||T>n.maxTempK?0:1-Math.abs(T-(n.minTempK+n.maxTempK)/2)/((n.maxTempK-n.minTempK)/2||1);
        const moist=M<n.minMoisture||M>n.maxMoisture?0:1-Math.abs(M-(n.minMoisture+n.maxMoisture)/2)/((n.maxMoisture-n.minMoisture)/2||1);
        const slope=S>n.maxSlope?0:1-S/n.maxSlope*.35;
        if(!temp||!moist||!slope)continue;
        const suitability=Math.round(Math.max(0,Math.min(1,.45*temp+.4*moist+.15*slope))*1000)/1000;
        if(!(suitability>0&&suitability>=.28))continue;
        if(treeOrShrub[i])anyTree=true;else anyGrass=true;
      }
      for(let i=0;i<animalNiches.length;i++){
        let v=0;
        if(needsTree[i]?anyTree:anyGrass){
          const n=animalNiches[i]!;
          const temp=T<n.minTempK||T>n.maxTempK?0:1-Math.abs(T-(n.minTempK+n.maxTempK)/2)/((n.maxTempK-n.minTempK)/2||1);
          const moist=M<n.minMoisture||M>n.maxMoisture?0:1-Math.abs(M-(n.minMoisture+n.maxMoisture)/2)/((n.maxMoisture-n.minMoisture)/2||1);
          const slope=S>n.maxSlope?0:1-S/n.maxSlope*.35;
          if(temp&&moist&&slope){
            const suitability=Math.round(Math.max(0,Math.min(1,.45*temp+.4*moist+.15*slope))*1000)/1000;
            if(suitability>0&&suitability>=.28)v=suitability;
          }
        }
        out[i]=v;
      }
      return out;
    },
  });
}

/**
 * Climate preference by tree family, layered on top of the niche tents. It
 * corrects the verified inversion where spire niches sit ~5 K warmer than
 * branching ones (lab-ecology-niche-probe): spires favour cold, branching trees
 * favour warm and moist ground. Other families are neutral (1).
 */
export function familyClimateAffinity(family:Species['family'],rebasedT:number,moisture:number,profile:NicheProfile):number {
  const nominal=PROFILE_NOMINAL_TEMP_K[profile];
  if(family==='spire')return 0.25+0.75*clamp01((nominal+6-rebasedT)/14);
  if(family==='branching')return 0.25+0.75*clamp01((rebasedT-nominal+8)/14)*(0.5+0.5*clamp01((moisture-0.45)/0.25));
  return 1;
}

const isBindableTree=(s:Species)=>s.kind==='tree'&&(s.family==='branching'||s.family==='spire');
const WEIGHT_CACHE_CAP=256;
const weightCache=new Map<string,Uint8Array>();

/**
 * Integer rendezvous weights 0..8 for eligible tree species in one climate cell
 * (ClimateSample.climateCode): w = s>0 ? 1+floor(7*s*a) : 0, where s is the
 * nicheSuitability at the code's decoded rebased temperature and moisture and
 * slope01 0.2, counted only where the species would be OCCUPIED (inside every
 * niche range and >= 0.28; the raw weighted sum is > 0 even outside the
 * temperature range, which would let a species grow far outside its niche),
 * and a the family affinity. Entries that bindTreeSpecies would
 * skip (non-trees) get 0. If every tree weight is 0, every tree gets 1 (legacy
 * uniform fallback). Memoised (FIFO, 256 entries) by catalogue signature + code;
 * returns a fresh copy so callers cannot corrupt the memo.
 */
export function treeSpeciesWeights(eligibleTrees:readonly Species[],climateCode:number,profile:NicheProfile):Uint8Array {
  let signature=profile;
  for(const s of eligibleTrees)signature+='\u0001'+s.id;
  const key=signature+'|'+climateCode;
  const hit=weightCache.get(key);
  if(hit)return hit.slice();
  const tBin=(climateCode>>3)&31,mBin=climateCode&7;
  const rebasedT=PROFILE_NOMINAL_TEMP_K[profile]+(tBin*2-32+1),moisture=(mBin+0.5)/8;
  const local:NicheLocal={temperatureK:rebasedT,moisture,slope01:0.2};
  const w=new Uint8Array(eligibleTrees.length);
  let any=false;
  for(let i=0;i<eligibleTrees.length;i++){
    const s=eligibleTrees[i]!;
    if(!isBindableTree(s))continue;
    const r=nicheSuitability(s.niche,local),suit=r.occupiedPlant?r.suitability:0;
    if(suit>0){w[i]=1+Math.floor(7*suit*familyClimateAffinity(s.family,rebasedT,moisture,profile));any=true;}
  }
  if(!any)for(let i=0;i<eligibleTrees.length;i++)if(isBindableTree(eligibleTrees[i]!))w[i]=1;
  if(weightCache.size>=WEIGHT_CACHE_CAP){const oldest=weightCache.keys().next().value;if(oldest!==undefined)weightCache.delete(oldest);}
  weightCache.set(key,w);
  return w.slice();
}
export function clearTreeSpeciesWeightCache():void {weightCache.clear();}

/**
 * Integer-weighted rendezvous (highest-random-weight) choice. Candidate i takes
 * draws k = 0..weights[i]-1; the overall maximum score wins; ties go to the
 * smaller tieKey by code-unit order. With i.i.d. uniform scores, candidate i wins
 * with probability weights[i]/sum(weights) (the max of w uniforms is Beta(w,1)),
 * and the result is independent of enumeration order. score(i,0) must be the
 * legacy key, so all-ones weights reproduce bindTreeSpecies exactly. Returns -1
 * when every weight is 0.
 */
export function pickWeightedMax(count:number,weights:ArrayLike<number>,score:(i:number,k:number)=>number,tieKey:(i:number)=>string):number {
  let best=-1,bestScore=0,bestKey:string|null=null;
  for(let i=0;i<count;i++){
    const w=weights[i]??0;
    for(let k=0;k<w;k++){
      const s=score(i,k);
      if(best<0||s>bestScore){best=i;bestScore=s;bestKey=null;continue;}
      if(s===bestScore&&i!==best){
        if(bestKey===null)bestKey=tieKey(best);
        const key=tieKey(i);
        if(key<bestKey){best=i;bestKey=key;}
      }
    }
  }
  return best;
}

/** Fauna species weights 0..8 from an evaluator output (suitability, 0 = absent). */
export function faunaSpeciesWeights(suitabilityF32:ArrayLike<number>):Uint8Array {
  const w=new Uint8Array(suitabilityF32.length);
  for(let i=0;i<w.length;i++){const s=suitabilityF32[i]!;w[i]=s>0?Math.min(8,1+Math.floor(7*(s>1?1:s))):0;}
  return w;
}
