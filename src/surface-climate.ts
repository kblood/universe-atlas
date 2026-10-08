/**
 * surface-climate-1: one shared, deterministic ANNUAL climate field per body.
 *
 * This is a heuristic-v1 climate atlas (docs/research-planet-biome-generation-
 * 2026-09-14.md "Planet and climate priors"), not a circulation model. It turns
 * catalogue facts (temperatureK, water, type, mass, radius, axial tilt) into a
 * per-direction annual-mean temperature, seasonal half-range, snow, treeline,
 * aridity and forest suitability, so the classifier, tile colour, ground shader,
 * forest presence and tree-species binding (Wave 1/2 of
 * docs/biome-climate-increment-1-plan-2026-10-02.json) all read ONE field
 * instead of three unsynchronised copies of an ad-hoc rule. Model, calibration
 * table and owner amendments: docs/surface-climate-v1.md.
 *
 * Import rules (enforced by tests/surface-climate.test.mjs): only catalog.ts,
 * stellar-evolution.ts, det-math.ts and planet-geophysics.ts (itself catalog.ts
 * only), so rock modules may import this later.
 *
 * surface-climate-1.1-geo-g (relief round 2026-10-03, P4-RELIEF E, owner
 * decision 3): the gravity that sets a catalogue body's lapse rate is
 * planetGeophysics(body).surfaceGravityMS2 (provenance 'geophysics') instead of
 * G*massKg/R^2. CLIMATE_CALIBRATION is unchanged (its sha is unchanged).
 *
 * Determinism: the per-body tables are built only from + - * /, sqrt, min, max,
 * floor, abs and the det-math sine/detAcos (docs/time-and-coordinates-contract.md
 * §1.2 rule 3), so they are bit-identical on every conformant engine. The
 * per-sample path does no allocation and no hash64.
 */
import {G,hash64,noise,type Body,type V3} from './catalog.ts';
import {spinStateFor} from './stellar-evolution.ts';
import {detAcos,sine} from './det-math.ts';
import {planetGeophysics} from './planet-geophysics.ts';

export const CLIMATE_VERSION='surface-climate-2';

/**
 * Heuristic-v1 constants. A test pins sha256(JSON.stringify(CLIMATE_CALIBRATION)),
 * so changing any value forces a CLIMATE_VERSION bump.
 *
 * Owner amendment 1 (2026-10-02): there is NO single global lapse rate. The plan's
 * LAPSE_K_PER_M is replaced by a per-planet value from surface gravity,
 *   Gamma = LAPSE_MOIST_FACTOR * g / CP_J_PER_KG_K,
 * i.e. the dry adiabatic lapse rate g/cp scaled by a constant moist factor chosen
 * so that Earth (g = 9.81 m/s^2) gets 0.6652*9.81/1004 = 6.4996 K/km, the ICAO
 * standard-atmosphere 6.5 K/km. The result is clamped to
 * [LAPSE_MIN_K_PER_M, LAPSE_MAX_K_PER_M] (1 .. 9.8 K/km; 9.8 K/km is Earth's dry
 * adiabat).
 *
 * Gravity source. surface-climate-1 used g = G*massKg/radiusM^2 from the
 * catalogue (fixed 4800 kg/m^3, so g was proportional to radius: 2.7 .. 12.1
 * m/s^2, Gamma 1.8 .. 8.0 K/km, never clamped). Since surface-climate-1.1-geo-g
 * g = planetGeophysics(body).surfaceGravityMS2 (planet-geophysics-1: per-kind
 * density, so g is no longer monotone in radius). Over the 7622 rocky planets
 * of the first 2000 G001 systems: 2.10 .. 21.3 m/s^2, Gamma 1.39 K/km .. the
 * 9.8 K/km clamp, which 1001 of them (13.1%) reach.
 *
 * OBLIQUITY_QUANTUM_RAD (2^-30 rad, about 1e-9 rad) snaps the folded obliquity to
 * a power-of-two grid so tilt t and its retrograde twin pi-t produce bit-identical
 * tables even though pi-(pi-t) is not always t in floating point.
 */
export const CLIMATE_CALIBRATION=Object.freeze({
  K_LAT_K:60,
  LAPSE_MOIST_FACTOR:0.6652, CP_J_PER_KG_K:1004, LAPSE_MIN_K_PER_M:0.001, LAPSE_MAX_K_PER_M:0.0098,
  DATUM_M:0,
  PDD_CRIT:250, PDD_RAMP:100, YEAR_D:365.25,
  T_TREE_WARMEST_K:283, TREE_RAMP_K:6,
  SEASON_K:40, MARITIME:0.5,
  BELT_LO:0.18, BELT_HI:0.52, BELT_EDGE:0.03, BELT_MOISTURE:0.0425,
  FOREST_MOIST_LO:0.44, FOREST_MOIST_RAMP:0.08,
  GROW_K:278,
  OBLIQUITY_QUANTUM_RAD:1/1073741824,
});
const C=CLIMATE_CALIBRATION;

/** Latitude rows (x = sin latitude, k/TABLE_ROWS) and orbit samples per table. */
export const TABLE_ROWS=64, ORBIT_SAMPLES=256;

export type ClimateProvenance=Readonly<{
  anchorTempK:'catalogue'|'override'; obliquityRad:'catalogue'|'override';
  surfaceGravityMS2:'catalogue-derived'|'geophysics'|'override'; lapseKPerM:'derived-heuristic'|'override';
  table:'derived-heuristic';
}>;
export type ClimateForcing=Readonly<{
  version:typeof CLIMATE_VERSION;
  anchorTempK:number;
  /** Effective obliquity folded to [0, pi/2] and quantised (see OBLIQUITY_QUANTUM_RAD). */
  obliquityRad:number;
  water:number; frozen:boolean; habitat:boolean; moistureSeed:number;
  surfaceGravityMS2:number; lapseKPerM:number;
  /** Annual-mean daily insolation per row, normalised so its area mean is 1. Do not mutate. */
  qMean:Float64Array;
  /** Seasonal half-range (max-min)/2 of daily insolation per row, same normalisation. Do not mutate. */
  qAmp:Float64Array;
  provenance:ClimateProvenance;
}>;

export type ClimateSample={
  /** Annual-mean daily insolation relative to the planet's area mean (1 = global mean). */
  insolation01:number;
  /** Seasonal half-range of daily insolation, same units as insolation01. */
  insolationHalfRange:number;
  annualMeanTempK:number;
  seasonalHalfRangeK:number;
  warmestMonthK:number;
  coldestMonthK:number;
  legacyMoisture:number;
  dryBelt01:number;
  effectiveMoisture:number;
  aridity01:number;
  /** Positive degree-days above 0 C (C*d per year) of the sinusoidal year (surface-climate-2). */
  pdd:number;
  snowFraction:number;
  treeline01:number;
  growingSeason01:number;
  forestSuitability01:number;
  climateCode:number;
};
export function createClimateSample():ClimateSample {
  return {insolation01:0,insolationHalfRange:0,annualMeanTempK:0,seasonalHalfRangeK:0,warmestMonthK:0,coldestMonthK:0,
    legacyMoisture:0,dryBelt01:0,effectiveMoisture:0,aridity01:0,pdd:0,snowFraction:0,treeline01:0,growingSeason01:0,
    forestSuitability01:0,climateCode:0};
}

const clamp01=(v:number)=>v<0?0:v>1?1:v;
/** Arithmetic smoothstep (no platform transcendental). */
const smooth=(x:number,lo:number,hi:number)=>{const t=clamp01((x-lo)/(hi-lo));return t*t*(3-2*t);};

/**
 * surface-climate-2 positive-degree-day kernel. The year is the sinusoid
 * T(t) = mu + A cos(2 pi t) (mu = annual mean, A = seasonal half-range). With
 * v = (mu - thr)/A, the time-mean of max(0, T - thr) is A*H(v) and the
 * fraction of the year with T > thr is G(v), where
 *   H(v) = (sqrt(1-v^2) + v*acos(-v))/pi,   G(v) = acos(-v)/pi,
 * H(v) = 0 and G(v) = 0 for v <= -1, H(v) = v and G(v) = 1 for v >= 1 (both
 * continuous at +-1). Both are tabulated ONCE at module init on 513 nodes over
 * v in [-1,1] (detAcos only here) and read with linear interpolation, so the
 * per-sample path has no transcendental at all.
 */
export const KERNEL_STEPS=512;
const H_TAB=new Float64Array(KERNEL_STEPS+1),G_TAB=new Float64Array(KERNEL_STEPS+1);
for(let k=0;k<=KERNEL_STEPS;k++){
  const v=-1+2*k/KERNEL_STEPS,a=detAcos(-v);
  H_TAB[k]=(Math.sqrt(Math.max(0,1-v*v))+v*a)/Math.PI;G_TAB[k]=a/Math.PI;
}
// Exact end nodes (H(-1) = G(-1) = 0, H(1) = G(1) = 1), whatever detAcos rounds to.
H_TAB[0]=0;G_TAB[0]=0;H_TAB[KERNEL_STEPS]=1;G_TAB[KERNEL_STEPS]=1;
/** Linear interpolation in a kernel table for v strictly inside (-1, 1). */
function kernelAt(tab:Float64Array,v:number):number {
  const f=(v+1)*(KERNEL_STEPS/2);
  let i=Math.floor(f);if(i<0)i=0;else if(i>KERNEL_STEPS-1)i=KERNEL_STEPS-1;
  return tab[i]!+(tab[i+1]!-tab[i]!)*(f-i);
}
/** The tabulated H(v) (mean positive excess per unit half-range). */
export function pddKernelH(v:number):number {return v<=-1?0:v>=1?v:kernelAt(H_TAB,v);}
/** The tabulated G(v) (fraction of the year above the threshold). */
export function pddKernelG(v:number):number {return v<=-1?0:v>=1?1:kernelAt(G_TAB,v);}
/**
 * Degree-days (C*d per year) above `thresholdC` of a sinusoidal year with annual
 * mean `annualK` (K) and half-range `halfK` (K). A < 1e-9 is a seasonless year.
 */
export function degreeDaysAbove(annualK:number,halfK:number,thresholdC:number):number {
  const excess=annualK-273.15-thresholdC;
  if(halfK<1e-9)return excess>0?excess*C.YEAR_D:0;
  return C.YEAR_D*halfK*pddKernelH(excess/halfK);
}

/**
 * Byte-identical to the renderer's habitat gate (planet-renderer.ts:830) and
 * equivalent to surface-biomes.ts's forestPotential body clause for every
 * non-Ice body (Ice worlds have snow=1, so their forest is false either way).
 */
export function temperateHabitat(body:Body):boolean {
  return body.water>0&&body.temperatureK>=250&&body.temperatureK<=325&&body.type!=='Ice world'&&body.type!=='Volcanic world';
}

/** Surface gravity from the catalogue body, g = G*M/R^2 (m/s^2). */
export function surfaceGravityMS2(body:Pick<Body,'massKg'|'radiusM'>):number {
  return G*body.massKg/(body.radiusM*body.radiusM);
}
/** Per-planet environmental lapse rate (K/m) from surface gravity; see CLIMATE_CALIBRATION. */
export function lapseRateForGravity(gMS2:number):number {
  const raw=C.LAPSE_MOIST_FACTOR*gMS2/C.CP_J_PER_KG_K;
  return raw<C.LAPSE_MIN_K_PER_M?C.LAPSE_MIN_K_PER_M:raw>C.LAPSE_MAX_K_PER_M?C.LAPSE_MAX_K_PER_M:raw;
}

/**
 * Fold a drawn axial tilt in [0, pi] (retrograde included, stellar-evolution.ts
 * spinStateFor) to the insolation-relevant obliquity in [0, pi/2]: a spin axis
 * tilted by t and one tilted by pi-t sweep the same declination cycle, only the
 * sense of rotation differs. Snapped to OBLIQUITY_QUANTUM_RAD.
 */
export function effectiveObliquityRad(axialTiltRad:number):number {
  const t=axialTiltRad<0?0:axialTiltRad>Math.PI?Math.PI:axialTiltRad;
  const folded=t<Math.PI-t?t:Math.PI-t;
  return Math.floor(folded/C.OBLIQUITY_QUANTUM_RAD+0.5)*C.OBLIQUITY_QUANTUM_RAD;
}

// sin(lambda) of the 256 mid-point true longitudes, shared by every table.
const SIN_LAMBDA=new Float64Array(ORBIT_SAMPLES);
for(let j=0;j<ORBIT_SAMPLES;j++)SIN_LAMBDA[j]=sine((j+.5)*2*Math.PI/ORBIT_SAMPLES);

/**
 * Annual-mean and seasonal half-range of DAILY-MEAN top-of-atmosphere insolation
 * versus x = sin(latitude), for one obliquity, in units of the area mean.
 *
 * Daily mean (Berger 1978, "Long-term variations of daily insolation and
 * Quaternary climatic changes", J. Atmos. Sci. 35:2362, eq. for W_d; also
 * Hartmann, Global Physical Climatology, eq. 2.15):
 *   Q = (S0/pi) (a/r)^2 [h0 sin(phi) sin(delta) + cos(phi) cos(delta) sin(h0)],
 *   cos(h0) = -tan(phi) tan(delta), clamped to [-1,1] (h0 = 0 polar night,
 *   h0 = pi polar day), and sin(delta) = sin(eps) sin(lambda) for true longitude
 *   lambda. Eccentricity is ignored: (a/r)^2 averages to a uniform factor
 *   1/sqrt(1-e^2) in the annual mean, which the area normalisation removes; it
 *   only skews seasons, which this annual model does not resolve. With e = 0,
 *   lambda advances uniformly in time, so the 256 mid-point samples are an
 *   equal-time annual average.
 * Northern and southern rows are identical with e = 0 (the cycle is only shifted
 * by half a year), so one table over |x| serves both hemispheres. The result is
 * correct for any obliquity: above ~54 deg the poles receive more annual
 * insolation than the equator (annual polar mean is S0 sin(eps)/pi).
 */
export function insolationTables(obliquityRad:number):{qMean:Float64Array;qAmp:Float64Array} {
  const qMean=new Float64Array(TABLE_ROWS+1),qAmp=new Float64Array(TABLE_ROWS+1);
  const sinEps=sine(obliquityRad);
  for(let k=0;k<=TABLE_ROWS;k++){
    const x=k/TABLE_ROWS,cosPhi=Math.sqrt(Math.max(0,1-x*x));
    let sum=0,max=-1,min=2;
    for(let j=0;j<ORBIT_SAMPLES;j++){
      const sinDelta=sinEps*SIN_LAMBDA[j]!,cosDelta=Math.sqrt(Math.max(0,1-sinDelta*sinDelta));
      const denom=cosPhi*cosDelta;
      let q:number;
      // Pole (cosPhi=0) or sun overhead at the pole (cosDelta=0): the sun's
      // elevation is constant over the day, so Q = max(0, sin(phi) sin(delta)).
      if(denom<1e-12)q=Math.max(0,x*sinDelta);
      else{
        const c=-(x*sinDelta)/denom;
        // Polar night (c>=1, h0=0) and polar day (c<=-1, h0=pi) short-cut the
        // same formula exactly: detAcos(1)=0 and detAcos(-1)=pi bit-for-bit.
        if(c>=1)q=0;
        else if(c<=-1)q=x*sinDelta;
        else{
          const h0=detAcos(c);
          q=(h0*x*sinDelta+denom*Math.sqrt(1-c*c))/Math.PI;
        }
      }
      sum+=q;if(q>max)max=q;if(q<min)min=q;
    }
    qMean[k]=sum/ORBIT_SAMPLES;qAmp[k]=(max-min)/2;
  }
  // dA is proportional to d(sin lat), so the area mean over a hemisphere is a
  // trapezoid in x. Analytically this is 1/4 (global mean = S0/4).
  let area=0;
  for(let k=0;k<TABLE_ROWS;k++)area+=(qMean[k]!+qMean[k+1]!)/2;
  area/=TABLE_ROWS;
  for(let k=0;k<=TABLE_ROWS;k++){qMean[k]=qMean[k]!/area;qAmp[k]=qAmp[k]!/area;}
  return {qMean,qAmp};
}

export type ClimateForcingParams={
  anchorTempK:number; obliquityRad:number; water:number;
  frozen?:boolean; habitat?:boolean; moistureSeed?:number;
  surfaceGravityMS2?:number; lapseKPerM?:number;
  provenance?:Partial<ClimateProvenance>;
};
/**
 * Build a forcing from explicit parameters (synthetic/reference worlds, e.g. the
 * Earth reference check). obliquityRad is folded and quantised exactly like a
 * catalogue tilt. Without lapseKPerM the lapse rate comes from surfaceGravityMS2
 * (default Earth 9.81).
 */
export function climateForcingFromParams(p:ClimateForcingParams):ClimateForcing {
  const obliquityRad=effectiveObliquityRad(p.obliquityRad);
  const g=p.surfaceGravityMS2??9.81;
  const lapseKPerM=p.lapseKPerM??lapseRateForGravity(g);
  const {qMean,qAmp}=insolationTables(obliquityRad);
  return Object.freeze({version:CLIMATE_VERSION,anchorTempK:p.anchorTempK,obliquityRad,water:p.water,
    frozen:!!p.frozen,habitat:p.habitat??true,moistureSeed:p.moistureSeed??0,surfaceGravityMS2:g,lapseKPerM,qMean,qAmp,
    provenance:Object.freeze({anchorTempK:'override',obliquityRad:'override',surfaceGravityMS2:'override',
      lapseKPerM:p.lapseKPerM===undefined?'derived-heuristic':'override',table:'derived-heuristic',...p.provenance}) as ClimateProvenance});
}

const FORCING_CACHE_CAP=64;
const forcingCache=new Map<string,ClimateForcing>();

/**
 * The climate forcing of a catalogue body, cached (FIFO, at most 64 bodies;
 * eviction never changes values because the forcing is a pure function of the
 * key, which holds every body field the forcing reads). opts.anchorTempK replaces body.temperatureK (e.g. a dated or
 * luminosity-corrected temperature later); opts.lapseKPerM overrides the
 * gravity-derived lapse rate for calibration studies only.
 */
export function climateForcingFor(body:Body,opts?:{anchorTempK?:number;lapseKPerM?:number}):ClimateForcing {
  const anchorTempK=opts?.anchorTempK??body.temperatureK;
  // Every body field the forcing reads is in the key (water/type feed frozen and
  // habitat, mass/radius feed gravity), so a derived body that shares a seed and
  // temperature with a catalogue body never reads that body's forcing.
  const key=[body.seed,body.kind,anchorTempK,body.water,body.type,body.massKg,body.radiusM].join('|')+(opts?.lapseKPerM===undefined?'':'|lapse='+opts.lapseKPerM);
  const hit=forcingCache.get(key);
  if(hit)return hit;
  // surface-climate-1.1-geo-g: surface physics gravity (planet-geophysics-1),
  // never the catalogue orbital mass (owner decisions 3 and 4).
  const g=planetGeophysics(body).surfaceGravityMS2;
  const forcing=climateForcingFromParams({
    anchorTempK,obliquityRad:spinStateFor(body).axialTiltRad,water:body.water,
    frozen:body.type==='Ice world',habitat:temperateHabitat(body),
    moistureSeed:Number(hash64(body.seed+'/macro-v1')&0xffffffffn),
    surfaceGravityMS2:g,lapseKPerM:opts?.lapseKPerM,
    provenance:{anchorTempK:opts?.anchorTempK===undefined?'catalogue':'override',obliquityRad:'catalogue',
      surfaceGravityMS2:'geophysics',lapseKPerM:opts?.lapseKPerM===undefined?'derived-heuristic':'override'},
  });
  if(forcingCache.size>=FORCING_CACHE_CAP){const oldest=forcingCache.keys().next().value;if(oldest!==undefined)forcingCache.delete(oldest);}
  forcingCache.set(key,forcing);
  return forcing;
}
/** Test hook: drop every cached forcing (values never depend on cache state). */
export function clearClimateForcingCache():void {forcingCache.clear();}
export function climateForcingCacheSize():number {return forcingCache.size;}

/**
 * Per-direction annual climate sampler. `d` is the unit body-frame direction
 * (spin axis = +Y, as everywhere in the surface code); heightM is the
 * post-landform ground height above the datum. Writes into and returns `out`;
 * no allocation, no hash64 per call.
 */
export function surfaceClimate(forcing:ClimateForcing):(d:V3|readonly [number,number,number],heightM:number,out:ClimateSample)=>ClimateSample {
  const {qMean,qAmp,anchorTempK:anchor,lapseKPerM:lapse,water,frozen,habitat,moistureSeed}=forcing;
  const seed=moistureSeed+30;
  const maritime=1-C.MARITIME*water;
  const beltLoA=C.BELT_LO-C.BELT_EDGE,beltLoB=C.BELT_LO+C.BELT_EDGE,beltHiA=C.BELT_HI-C.BELT_EDGE,beltHiB=C.BELT_HI+C.BELT_EDGE;
  return (d,heightM,out)=>{
    let x=d[1]<0?-d[1]:d[1];
    if(x>1)x=1;
    const f=x*TABLE_ROWS;
    let i=Math.floor(f);if(i>TABLE_ROWS-1)i=TABLE_ROWS-1;
    const t=f-i;
    const q=qMean[i]!+(qMean[i+1]!-qMean[i]!)*t;
    const qa=qAmp[i]!+(qAmp[i+1]!-qAmp[i]!)*t;
    const above=heightM-C.DATUM_M;
    const annual=anchor+C.K_LAT_K*(q-1)-lapse*(above>0?above:0);
    const half=C.SEASON_K*qa*maritime;
    // Exactly the legacy classifier's moisture expression (surface-biomes.ts).
    const moisture=noise(d[0]*5+13,d[1]*5+37,d[2]*5+19,seed);
    const belt=smooth(x,beltLoA,beltLoB)*(1-smooth(x,beltHiA,beltHiB));
    const eff=moisture-C.BELT_MOISTURE*belt;
    // surface-climate-2 step 1: snow from positive degree-days (melt), not the
    // annual mean. snowFraction > 0.6 (the 'Alpine / polar snow' label) is PDD < 190.
    const pdd0=degreeDaysAbove(annual,half,0);
    const snow=frozen?1:water>0?clamp01((C.PDD_CRIT-pdd0)/C.PDD_RAMP):0;
    const warmest=annual+half;
    const treeline=clamp01((warmest-C.T_TREE_WARMEST_K)/C.TREE_RAMP_K);
    // Fraction of the year above GROW_K: G((annual - GROW_K)/half), tabulated.
    const grow=half<=1e-9?(annual>C.GROW_K?1:0):pddKernelG((annual-C.GROW_K)/half);
    let tBin=Math.floor((annual-anchor+32)/2);if(tBin<0)tBin=0;else if(tBin>31)tBin=31;
    let mBin=Math.floor(eff*8);if(mBin<0)mBin=0;else if(mBin>7)mBin=7;
    out.insolation01=q;out.insolationHalfRange=qa;
    out.annualMeanTempK=annual;out.seasonalHalfRangeK=half;out.warmestMonthK=warmest;out.coldestMonthK=annual-half;
    out.legacyMoisture=moisture;out.dryBelt01=belt;out.effectiveMoisture=eff;
    out.aridity01=clamp01((0.5-eff)*4);
    out.pdd=pdd0;out.snowFraction=snow;out.treeline01=treeline;out.growingSeason01=grow;
    out.forestSuitability01=habitat?treeline*clamp01((eff-C.FOREST_MOIST_LO)/C.FOREST_MOIST_RAMP)*clamp01(1-snow/0.2):0;
    out.climateCode=(tBin<<3)|mBin;
    return out;
  };
}

/** Bin centres of a climate code: temperature relative to the anchor, and effective moisture. */
export function decodeClimateCode(code:number):{deltaTempK:number;moisture:number} {
  const tBin=(code>>3)&31,mBin=code&7;
  return {deltaTempK:tBin*2-32+1,moisture:(mBin+0.5)/8};
}

/**
 * Datum height (m) above which the annual-mean temperature at sin-latitude x is
 * below `thresholdK`. Negative means the datum is already colder. Pure helper for
 * reports and tests. Since surface-climate-2 snow is NOT an annual-mean isotherm
 * (it follows positive degree-days, see degreeDaysAbove).
 */
export function isothermHeightM(forcing:ClimateForcing,x:number,thresholdK:number):number {
  const out=createClimateSample();
  surfaceClimate(forcing)([0,x,0],C.DATUM_M,out);
  return C.DATUM_M+(out.annualMeanTempK-thresholdK)/forcing.lapseKPerM;
}
