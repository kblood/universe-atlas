import {hash64,noise,type Body,type V3} from './catalog.ts';
import {spinStateFor} from './stellar-evolution.ts';
import {CLIMATE_VERSION,climateForcingFor,climateForcingFromParams,createClimateSample,surfaceClimate,temperateHabitat,type ClimateForcing} from './surface-climate.ts';
import {planetGeophysics} from './planet-geophysics.ts';
/** surface-biomes-2-climate (docs/biome-climate-increment-1-plan-2026-10-02.json,
 * W1-A): snow, the forest window and the upland labels read the shared annual
 * climate field (src/surface-climate.ts, docs/surface-climate-v1.md) instead of
 * the fixed latitude/2600 m snow ramp and the 2300 m forest ceiling. */
export const BIOME_VERSION='surface-biomes-2.1-sea-datum';
/** surface-survey-2: survey candidates and categories are unchanged; sites move
 * because they are scored through classifier v2. Declared here (re-exported by
 * surface-survey.ts) so time-nav.ts can fold it into MODEL_MANIFEST_ID without
 * importing the survey's planet-tiles/terrain graph. */
export const SURVEY_VERSION='surface-survey-2.1-relief';
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
/** A sea level at or below this (m) means there is no sea at all (it lies below
 * the terrain's -16 km clamp, so below every possible seabed): the renderer and
 * place-query pass -1e6 for an ocean that has fully gone. */
export const NO_SEA_LEVEL_M=-16000;
/**
 * The climate datum (m) for a sea level: the current shoreline when a sea
 * exists, the catalogue datum 0 m when none does (a dried-out water world keeps
 * its 0 m lapse datum instead of being sampled a thousand kilometres up).
 * Shared with terrain.ts so the tile colour and the classifier agree.
 */
export function climateDatumM(waterLevelM:number):number {return waterLevelM>NO_SEA_LEVEL_M?waterLevelM:0;}

/** Fallback forcings for body objects whose climate inputs differ from the
 * catalogue body cached under the same seed (see forcingForBody). FIFO, cap 16;
 * values are a pure function of the key, so eviction never changes output. */
const variantForcings=new Map<string,ClimateForcing>();
/**
 * climateForcingFor caches by `seed|anchorTempK` only, so a derived body that
 * shares a catalogue seed and temperature but changes water, type, mass or
 * radius (test variants, stand-in stubs) would otherwise read whichever forcing
 * was cached first, making classifier output depend on visit order. The cached
 * forcing is used only when every body-derived input matches; otherwise the
 * forcing is rebuilt from the body's own fields with exactly the parameters
 * climateForcingFor would use on a cold cache.
 */
function forcingForBody(body:Body):ClimateForcing {
  const cached=climateForcingFor(body);
  // surface-climate-1.1-geo-g: the lapse gravity is the geophysics surface gravity.
  const g=planetGeophysics(body).surfaceGravityMS2,frozen=body.type==='Ice world',habitat=temperateHabitat(body);
  if(Object.is(cached.water,body.water)&&cached.frozen===frozen&&cached.habitat===habitat&&Object.is(cached.surfaceGravityMS2,g))return cached;
  const key=[body.seed,body.kind,body.temperatureK,body.water,body.type,body.massKg,body.radiusM].join('|');
  const hit=variantForcings.get(key);if(hit)return hit;
  const forcing=climateForcingFromParams({anchorTempK:body.temperatureK,obliquityRad:spinStateFor(body).axialTiltRad,water:body.water,
    frozen,habitat,moistureSeed:Number(hash64(body.seed+'/macro-v1')&0xffffffffn),surfaceGravityMS2:g,
    provenance:{anchorTempK:'catalogue',obliquityRad:'catalogue',surfaceGravityMS2:'geophysics'}});
  if(variantForcings.size>=16){const oldest=variantForcings.keys().next().value;if(oldest!==undefined)variantForcings.delete(oldest);}
  variantForcings.set(key,forcing);
  return forcing;
}

/** Habitat/material classification of existing geology, not a climate simulation.
 * Never changes the authoritative rock field or assumes all worlds support life.
 *
 * v2 (surface-biomes-2-climate):
 * - snow = the climate field's snowFraction (annual-mean temperature from
 *   per-planet insolation, drawn axial tilt and the gravity-derived lapse rate);
 *   Ice worlds stay fully frozen and airless bodies stay snow-free.
 * - Above 'Coastal sand' the labels are: effectiveMoisture<.43 'Dry upland'
 *   (the subtropical dry belt lowers effective moisture), treeline01<.5
 *   'Mountain meadow', else 'Temperate ground'. The same 10 labels as v1.
 * - forestPotential keeps the v1 body clause, ocean, snow<.2, coast-strip
 *   (height>160) and slope<28 gates, and replaces `height<2300&&moisture>.48`
 *   with forestSuitability01>0 (warmest-month treeline and effective moisture).
 * - `moisture` is the v1 noise expression, bit-identical (fauna reads it).
 * - New flat fields (no nested object, per-call allocation unchanged):
 *   annualMeanTempK, warmestMonthK, effectiveMoisture, aridity01, snowFraction,
 *   treeline01, climateCode, forestSuitability01 (0 where forestPotential is
 *   false), climateVersion. Presence/kind consumers must read only these annual
 *   fields, never a season phase.
 * - Fauna contract: weights[1] (herd/turf) is already (1-sand)(1-snow)(1-rock),
 *   so it carries the (1-snowFraction) factor. A consumer must NOT multiply it
 *   by (1-snowFraction) again; snow/alpine-adapted species key off
 *   snowFraction and climateCode instead of weights[1].
 *
 * `waterLevelM` (additive, default `0` - the literal this already
 * hardcoded): docs/time-and-coordinates-contract.md §2.5/§2.6 - this is one
 * of the four sites that must move together with `terrain.ts`'s sea level or
 * the classifier's `ocean` boolean (which feeds biome name/weights/
 * forestPotential) disagrees with the rock/colour sampler about where the
 * shoreline is, reproducing the exact "two paths disagree" bug one layer
 * down. Every existing call site keeps omitting this argument.
 *
 * surface-biomes-2.1-sea-datum (terrain-1.8.0-relief, P4-RELIEF D): every
 * height gate is measured from the CURRENT sea level `waterLevelM`, not from
 * 0 m: the sand ramp clamp(1-(h-sea)/160), 'Coastal sand' below sea+120 m, the
 * forest coast strip (h-sea) > 160 and the climate (sampled at max(0, h-sea):
 * the lapse runs from the current shoreline; with no sea at all, see
 * climateDatumM, from 0 m). At sea level 0 (the catalogue epoch since
 * ocean-volume-1) every value is unchanged by this datum. */
export function biomeClassifier(body:Body,waterLevelM:number=0){
  const seed=Number(hash64(body.seed+'/macro-v1')&0xffffffffn);
  // One climate closure and one scratch sample per classifier, never per call.
  const climate=surfaceClimate(forcingForBody(body)),s=createClimateSample();
  const frozen=body.type==='Ice world';
  const forestBody=!!body.water&&body.temperatureK>=250&&body.temperatureK<=325&&body.type!=='Volcanic world';
  const datum=climateDatumM(waterLevelM);
  return (direction:V3,height:number,upDot=1)=>{
    const moisture=noise(direction[0]*5+13,direction[1]*5+37,direction[2]*5+19,seed+30);
    const aboveSea=height-waterLevelM;
    climate(direction,height-datum,s);
    const slope=Math.acos(Math.max(-1,Math.min(1,upDot)))*180/Math.PI;
    const ocean=!!body.water&&height<waterLevelM;
    const snow=frozen?1:body.water?s.snowFraction:0;
    const rock=clamp((slope-18)/27);
    const sand=body.water?clamp(1-aboveSea/160)*clamp(1-slope/30):.3*(1-rock);
    const weights=[sand*(1-snow)*(1-rock),(1-sand)*(1-snow)*(1-rock),rock*(1-snow),snow];
    if(!body.water&&!frozen){weights[0]=.65*(1-rock);weights[1]=0;weights[2]=1-weights[0];weights[3]=0;}
    const name=ocean?'Ocean':frozen?'Ice field':body.type==='Volcanic world'?'Volcanic rock':!body.water?(slope>24?'Rock escarpment':'Regolith plain'):snow>.6?'Alpine / polar snow':slope>30?'Rock escarpment':aboveSea<120?'Coastal sand':s.effectiveMoisture<.43?'Dry upland':s.treeline01<.5?'Mountain meadow':'Temperate ground';
    const forestPotential=forestBody&&!ocean&&snow<.2&&aboveSea>160&&slope<28&&s.forestSuitability01>0;
    return {version:BIOME_VERSION,name,slopeDeg:slope,moisture,weights,ocean,forestPotential,
      annualMeanTempK:s.annualMeanTempK,warmestMonthK:s.warmestMonthK,effectiveMoisture:s.effectiveMoisture,
      aridity01:s.aridity01,snowFraction:snow,treeline01:s.treeline01,climateCode:s.climateCode,
      forestSuitability01:forestPotential?s.forestSuitability01:0,climateVersion:CLIMATE_VERSION};
  };
}
export function materialBytes(weights:number[]){
  const bytes=weights.map(x=>Math.floor(x*255));
  const largest=weights.indexOf(Math.max(...weights));
  bytes[largest]+=255-bytes.reduce((a,b)=>a+b,0);
  return bytes;
}
