import {type Body, type V3, AU} from './catalog.ts';
import {terrainSampler, TERRAIN_VERSION,REGIONAL_LANDFORM_VERSION} from './terrain.ts';
import {RIVER_SURFACE_VERSION} from './river-types.ts';
import {RIVER_PHYSICAL_SURFACE_VERSION} from './river-physical-field.ts';
import {activeRenderedRiverRegion} from './inland-rivers.ts';
import {YEAR_NS, type Ns} from './world-time.ts';
import type {BranchId, BodyAddress, WorldVersions} from './address.ts';
import {
  starLifecycle, starStateAt, planetLifecycle, planetStateAt, waterKeysFor,
  type StarLifecycle, type PlanetLifecycle, type ParentPlanetContext,
} from './stellar-evolution.ts';
import {
  MIN_DATE_MYR, MAX_DATE_MYR, generateBiosphere, biosphereAt, profileFromPhysicalProperties,
  type Species, type BiosphereWorld, BIOSPHERE_VERSION,
} from './biosphere-model.ts';
// The dated ocean flag is shared by the surface query and renderer. Surface 7
// withdraws inland rivers and their regional lakes (inland-rivers.ts): the
// only water a query reports is the dated global ocean.
export const SURFACE_VERSION='atlas-surface-7-no-inland-rivers';
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
export function surfaceQuery(body:Body, keys:readonly WaterKey[]=[], options:{globalOceanAvailable?:boolean}={}) {
  const rock=terrainSampler(body);
  return (direction:V3,date=0n)=>{
    const sample=rock(direction), levelM=waterLevelAt(keys,date);
    const solid=body.kind!=='star'&&body.type!=='Gas giant';
    // Historical keys still control the global ocean. Inland water comes from
    // the immutable regional profile and must never be flattened to sea level.
    // `ocean` retains its historical query meaning: it identifies the present
    // global sea condition, while `wet` additionally includes regional water.
    const inland=sample.wet&&!sample.ocean;
    const globalOceanAvailable=options.globalOceanAvailable!==false;
    const globalWet=globalOceanAvailable&&!!body.water&&sample.rockHeightM<levelM;
    const ocean=globalWet;
    const waterLevelM=inland
      ? globalWet ? Math.max(levelM,sample.waterLevelM!) : sample.waterLevelM
      : body.water&&globalOceanAvailable ? levelM : null;
    const wet=globalWet||inland;
    const groundHeightM=sample.groundHeightM;
    const waterHeightM=waterLevelM;
    const visibleHeightM=wet&&waterHeightM!==null
      ? Math.max(groundHeightM,waterHeightM) : groundHeightM;
    const regional=activeRenderedRiverRegion(body);
    return {...sample,solid,groundHeightM,waterHeightM,
      waterDepthM:waterHeightM===null?0:Math.max(0,waterHeightM-groundHeightM),
      rockHeightM:groundHeightM,waterLevelM:waterHeightM,
      visibleHeightM,ocean,wet,walkable:solid&&!wet,version:SURFACE_VERSION,
      geologyVersion:TERRAIN_VERSION,regionalGeologyVersion:regional?.version||null,
      regionalSurfaceVersion:regional?RIVER_SURFACE_VERSION:null,
      regionalPhysicalSurfaceVersion:regional?RIVER_PHYSICAL_SURFACE_VERSION:null,
      regionalLandformVersion:regional?REGIONAL_LANDFORM_VERSION:null};
  };
}

// --- contract §1.1/§2.5/§2.6: `surfaceAt`, the WorldQuery-shaped, t-gated entry point ---

/** The one dated ocean decision shared by the query layer and main renderer.
 * The renderer still accepts a numeric sea level, so its adapter uses a low
 * level before ocean formation; logical wetness uses the explicit boolean. */
export function planetEnvironmentAt(body:Body,planet:PlanetLifecycle,star:StarLifecycle,t:Ns) {
  const starState=starStateAt(star,t);
  const estimatedTemperatureK=starState.luminosityRel>0
    ? body.temperatureK*Math.pow(starState.luminosityRel,.25):null;
  // This is a deliberately broad procedural liquid-water band, not a
  // calibrated climate model. body.temperatureK is the catalogue's reference
  // equilibrium estimate; stellar luminosity supplies dated forcing.
  const temperatureSuitable=estimatedTemperatureK!==null&&estimatedTemperatureK>=235&&estimatedTemperatureK<=330;
  const planetStage=planetStateAt(planet,star,t).stage;
  const hostSuitable=starState.stage==='main-sequence';
  const bodySuitable=body.kind!=='star'&&body.type!=='Gas giant';
  const oceanAvailable=bodySuitable&&!!body.water&&planet.oceanNs!==null&&t>=planet.oceanNs&&
    hostSuitable&&planetStage==='solid'&&temperatureSuitable;
  // The catalogue water inventory is immutable. `body.hydrology` is attached
  // after asynchronous regional loading, so it must never decide whether
  // species exist. Inland water remains independently sampled on the surface.
  const waterAvailable=bodySuitable&&body.water>0;
  const biosphereSuitable=bodySuitable&&planetStage==='solid'&&hostSuitable&&temperatureSuitable&&waterAvailable;
  return {starStage:starState.stage,planetStage,estimatedTemperatureK,temperatureSuitable,
    bodySuitable,
    oceanAvailable,waterAvailable,biosphereSuitable,
    fidelity:'procedural scenario' as const};
}
export function datedOceanState(body:Body, planet:PlanetLifecycle, star:StarLifecycle, t:Ns) {
  const environment=planetEnvironmentAt(body,planet,star,t);
  const globalOceanAvailable=environment.oceanAvailable;
  const waterLevelM=globalOceanAvailable
    ? Math.round(waterLevelAt(waterKeysFor(planet,star),t)/25)*25 : 0;
  return {globalOceanAvailable,waterLevelM,renderWaterLevelM:globalOceanAvailable?waterLevelM:-1_000_000};
}

// Time advances each exploration frame, but rock and the snapped ocean plane
// normally do not. Keep only the most recent immutable geometry query per body;
// lifecycle, ecology and the exact requested date are still resolved separately.
const datedGeometryQueries=new WeakMap<Body,{
  seed:string;hydrology:Body['hydrology'];canonical:Body['canonicalRivers'];
  levelM:number;available:boolean;query:ReturnType<typeof surfaceQuery>;
}>();
export function datedSurfaceSampler(body:Body, planet:PlanetLifecycle, star:StarLifecycle, t:Ns) {
  const ocean=datedOceanState(body,planet,star,t);
  let query:ReturnType<typeof surfaceQuery>|undefined;
  return {ocean, sample:(direction:V3)=>{
    if(!query){
      const cached=datedGeometryQueries.get(body);
      if(cached&&cached.seed===body.seed&&cached.hydrology===body.hydrology&&cached.canonical===body.canonicalRivers&&
        cached.levelM===ocean.waterLevelM&&cached.available===ocean.globalOceanAvailable)query=cached.query;
      else {
        query=surfaceQuery(body,[{dateNs:0n,levelM:ocean.waterLevelM}],
          {globalOceanAvailable:ocean.globalOceanAvailable});
        datedGeometryQueries.set(body,{seed:body.seed,hydrology:body.hydrology,canonical:body.canonicalRivers,
          levelM:ocean.waterLevelM,available:ocean.globalOceanAvailable,query});
      }
    }
    return query(direction,t);
  }};
}

/** Lifecycle gate and dated hydrology shared by every planet surface entry point. */
function lifecycleDatedSurfaceSampler(body:Body, planet:PlanetLifecycle, star:StarLifecycle, t:Ns) {
  const state=planetStateAt(planet,star,t);
  const dated=datedSurfaceSampler(body,planet,star,t);
  return {state,ocean:dated.ocean,sample:(direction:V3)=>{
    if(state.stage!=='molten'&&state.stage!=='solid')return null;
    const sample=dated.sample(direction);
    return state.stage==='solid'?sample:{...sample,solid:false,walkable:false};
  }};
}

function placeholderBodyAddress(body:Body):BodyAddress {
  // TODO(pkgB): src/address.ts's real BodyAddress parser/resolver (galaxy
  // cluster/group cell, sector/gen cell, system+body ordinal) has not landed
  // yet, so there is no way to build a real BodyAddress from a Body's own
  // id/seed strings today. starLifecycle/planetLifecycle accept a
  // BodyAddress purely for WorldQuery shape conformance and never read it —
  // they key entirely off `body.seed`, already a fully-qualified per-body
  // string (see stellar-evolution.ts's own comment on this). This
  // placeholder only exists to satisfy that parameter's type until Package
  // B's resolver lands; callers should pass a real BodyAddress once it does.
  return {clusterCell:[0n,0n,0n], groupCell:[0n,0n,0n], galaxyOrdinal:0,
    sectorCell:[0n,0n,0n], genCell:[0n,0n,0n], systemOrdinal:0, slot:body.id};
}

export type ExistenceStage =
  'unformed'|'accreting'|'molten'|'solid'|'engulfed'|'main-sequence'|'giant'|'remnant';
export type SurfaceAtResult = {
  version:string;
  entityExists:boolean;
  surfaceAvailable:boolean;
  /** Legacy alias for surfaceAvailable, retained for callers of v2. */
  exists:boolean;
  stage:ExistenceStage;
  /** `null` iff `!exists` — the documented not-exists state (contract §6.4
   * acceptance test 3): no rock/water fields are fabricated for a body that
   * has not yet formed, has died, or has been engulfed. */
  sample:ReturnType<ReturnType<typeof surfaceQuery>>|null;
};

/** Dated query for a resolved body. The lifecycle and dated ocean determine
 * whether a terrain sample is available. The legacy surfaceQuery remains for
 * callers that only need immutable geology. Planet and moon callers supply
 * their resolved host star; moons also supply their parent planet. */
/** §2.6's engulfment gate checks the ORBITING body's distance from its star.
 * For a planet, `body.orbit.a` already IS that distance. For a moon,
 * `body.orbit.a` is the moon-around-planet distance — stellar-evolution.ts's
 * `planetLifecycle` now takes the resolved parent planet's own
 * `ParentPlanetContext` (its star-orbit AU plus its own `PlanetLifecycle`,
 * for the formation/engulfment inheritance bounds) instead of the moon's own
 * orbit for that check (see `planetLifecycle`'s own header comment). This
 * resolves that context from a caller-supplied `parentPlanet` `Body`. */
function resolveParentPlanetContext(seed:string, hostStar:StarLifecycle, parentPlanet:Body):ParentPlanetContext {
  if (!parentPlanet.orbit) throw new Error('surfaceAt requires parentPlanet to have a resolved orbit (a star-orbiting planet Body)');
  const addr=placeholderBodyAddress(parentPlanet);
  return {starOrbitAu:parentPlanet.orbit.a/AU, lifecycle:planetLifecycle(seed,addr,parentPlanet,hostStar)};
}

export function surfaceAt(
  seed:string,
  bodyAddress:string,
  body:Body,
  direction:V3,
  t:Ns,
  branchId:BranchId,
  versions:WorldVersions,
  hostStar:StarLifecycle|null=null,
  parentPlanet?:Body,
):SurfaceAtResult {
  if (branchId!=='baseline') throw new Error(`Unsupported branch: ${String(branchId)}`);
  void seed; void bodyAddress; void versions;
  // `seed`/`bodyAddress` are accepted for WorldQuery shape conformance
  // (contract §1.1) but unused here, exactly as Package A's own
  // starLifecycle/planetLifecycle leave their own `_seed`/`_address`
  // parameters unused: `body.seed` is already a fully-qualified function of
  // the true (universe seed, address) pair one level up in catalog.ts, so it
  // alone is sufficient entropy. `versions` is accepted for the same shape
  // reason; per contract §1.2 rule 4 this function's output must depend only
  // on ITS OWN version (SURFACE_VERSION, baked into the returned `sample`)
  // and never on a sibling module's version, so nothing here branches on it.
  const addr=placeholderBodyAddress(body);
  if (body.kind==='star') {
    const star=starLifecycle(seed,addr,body);
    const state=starStateAt(star,t);
    if (state.stage==='unformed') return {version:SURFACE_VERSION, entityExists:false,surfaceAvailable:false,exists:false, stage:'unformed', sample:null};
    return {version:SURFACE_VERSION, entityExists:true,surfaceAvailable:true,exists:true, stage:state.stage, sample:surfaceQuery(body,[])(direction,t)};
  }
  if (!hostStar) throw new Error('surfaceAt requires hostStar for a planet or moon body');
  if (body.kind==='moon' && !parentPlanet) throw new Error('surfaceAt requires parentPlanet (the resolved planet Body) for a moon body, so the engulfment check can use the planet\'s own star-orbit distance instead of the moon\'s own moon-around-planet orbit');
  const parentPlanetContext = body.kind==='moon' ? resolveParentPlanetContext(seed,hostStar,parentPlanet!) : undefined;
  const planet=planetLifecycle(seed,addr,body,hostStar,parentPlanetContext);
  const dated=lifecycleDatedSurfaceSampler(body,planet,hostStar,t);
  const state=dated.state;
  if (state.stage!=='molten' && state.stage!=='solid') return {version:SURFACE_VERSION, entityExists:state.stage==='accreting',surfaceAvailable:false,exists:false, stage:state.stage, sample:null};
  // The same dated ocean decision feeds the main renderer and this query.
  // Its explicit availability flag prevents a sea before condensation while
  // preserving independently generated regional inland water.
  const sample=dated.sample(direction)!;
  return {version:SURFACE_VERSION, entityExists:true,surfaceAvailable:true,exists:true, stage:state.stage,
    sample};
}

/** Contract §2.4: `planetAgeMyr = Number((t - planet.formationNs) / (1e6 *
 * YEAR_NS))`, computed here (Package C's BigInt-`Ns`-aware side) rather than
 * inside biosphere-model.ts, which stays independent of world-time.ts's
 * BigInt type exactly as it did before this contract. Clamped into
 * biosphere-model.ts's own `[MIN_DATE_MYR, MAX_DATE_MYR]` bound: some stars'
 * main-sequence lifetimes (down to ~1e13 years for the lowest-mass red
 * dwarfs — stellar-evolution.ts's own clamp) vastly exceed that +-20 Gyr
 * biosphere window, so an unclamped planet age could throw inside
 * biosphereAt's requireDate for a perfectly legal `t`. Every species already
 * alive at MAX_DATE_MYR with `deathMyr:null` stays alive forever in this
 * model (no scripted extinction beyond MAX_DATE_MYR), so clamping the query
 * point, not the model, is the sound fix: it returns exactly the same
 * "still alive" answer the uncapped math would have. */
export function planetAgeMyr(planet:PlanetLifecycle, t:Ns):number {
  const raw=Number((t-planet.formationNs)/(1_000_000n*YEAR_NS));
  return Math.max(MIN_DATE_MYR, Math.min(MAX_DATE_MYR, raw));
}

// --- unified biosphere query: adds the missing 'extinct' terminal state ---

// Composes SURFACE_VERSION (existence/engulfment gating, via stellar-evolution.ts)
// with biosphere-model.ts's own BIOSPHERE_VERSION (species timeline); bump
// this if biosphereStateAt's own composition/gating logic changes, independent
// of either input module's version (contract §1.2 rule 4).
// Query v2 uses the canonical body ID at every production call site. Previously
// main.ts used the parent system ID, causing visible species to disagree with
// the body's own formation inspector and sibling planets to share draws.
export const BIOSPHERE_QUERY_VERSION = 'atlas-biosphere-query-5-dated-suitability';

export type BiosphereQueryStage = 'unformed'|'accreting'|'molten'|'forming'|'sterile'|'microbial'|'complex'|'extinct'|'unresolved';
export type BiosphereQueryResult = {
  version:string;
  stage:BiosphereQueryStage;
  species:Species[];
  surfaceAvailable:boolean;
};
const biosphereHistoryCache=new Map<string,BiosphereWorld>();
export function clearBiosphereHistoryCache(){biosphereHistoryCache.clear();}
/** One body-keyed species history shared by inspectors and runtime life. */
export function biosphereHistoryFor(seed:string,bodyAddress:string,body:Body,planet:PlanetLifecycle):BiosphereWorld {
  const profile=profileFromPhysicalProperties(body,'main-sequence');
  const surfaceMyr=Math.max(1,Math.round(Number(planet.coolingNs-planet.formationNs)/Number(1_000_000n*YEAR_NS)));
  const key=JSON.stringify([seed,bodyAddress,profile,surfaceMyr,BIOSPHERE_VERSION]);
  const cached=biosphereHistoryCache.get(key);
  if(cached)return cached;
  const history=generateBiosphere(seed,profile,bodyAddress,{surfaceMyr});
  if(biosphereHistoryCache.size>=64)biosphereHistoryCache.delete(biosphereHistoryCache.keys().next().value!);
  biosphereHistoryCache.set(key,history);
  return history;
}

/** Combines physical lifecycle gates with one stable, body-keyed species
 * history. Climate suitability is evaluated at the requested date; failure
 * suppresses the currently reported species but does not alter that history. */
export function biosphereStateAt(
  seed:string,
  bodyAddress:string,
  body:Body,
  t:Ns,
  branchId:BranchId,
  versions:WorldVersions,
  hostStar:StarLifecycle,
  parentPlanet?:Body,
):BiosphereQueryResult {
  if (branchId!=='baseline') throw new Error(`Unsupported branch: ${String(branchId)}`);
  void versions;
  const addr=placeholderBodyAddress(body);
  if (body.kind==='moon' && !parentPlanet) throw new Error('biosphereStateAt requires parentPlanet (the resolved planet Body) for a moon body, exactly as surfaceAt does — see its own comment');
  const parentPlanetContext = body.kind==='moon' ? resolveParentPlanetContext(seed,hostStar,parentPlanet!) : undefined;
  const planet=planetLifecycle(seed,addr,body,hostStar,parentPlanetContext);
  const state=planetStateAt(planet,hostStar,t);
  const environment=planetEnvironmentAt(body,planet,hostStar,t);
  if (state.stage==='engulfed' || environment.starStage==='giant' || environment.starStage==='remnant') {
    return {version:BIOSPHERE_QUERY_VERSION, stage:'extinct', species:[], surfaceAvailable:state.stage==='solid'};
  }
  if (state.stage!=='molten' && state.stage!=='solid') {
    return {version:BIOSPHERE_QUERY_VERSION, stage:state.stage, species:[], surfaceAvailable:false};
  }
  if (state.stage==='molten') return {version:BIOSPHERE_QUERY_VERSION,stage:'molten',species:[],surfaceAvailable:false};
  // The fixture has a defined 20 Gyr horizon. Beyond it this scenario treats
  // the modeled biosphere as terminally extinct instead of carrying the last
  // species indefinitely or returning an ambiguous unresolved state.
  if (t-planet.formationNs > BigInt(MAX_DATE_MYR)*1_000_000n*YEAR_NS) {
    return {version:BIOSPHERE_QUERY_VERSION,stage:'extinct',species:[],surfaceAvailable:state.stage==='solid'};
  }
  const world=biosphereHistoryFor(seed,bodyAddress,body,planet);
  const dated=biosphereAt(world,planetAgeMyr(planet,t));
  // A climate failure is dated and reversible; report no currently supported
  // life as sterile, while retaining extinction only from the species history.
  if (!environment.biosphereSuitable) {
    return {version:BIOSPHERE_QUERY_VERSION,
      stage:'sterile',species:[],surfaceAvailable:state.stage==='solid'};
  }
  return {version:BIOSPHERE_QUERY_VERSION, stage:dated.stage, species:dated.species, surfaceAvailable:dated.surfaceAvailable};
}

/** One dated body resolution for the inspector, renderer and local life. */
export function planetSnapshotAt(
  seed:string, bodyAddress:string, body:Body, planet:PlanetLifecycle,
  star:StarLifecycle, t:Ns, versions:WorldVersions, parentPlanet?:Body,
) {
  const environment=planetEnvironmentAt(body,planet,star,t);
  const dated=lifecycleDatedSurfaceSampler(body,planet,star,t);
  const state=dated.state;
  const ocean=dated.ocean;
  let biosphere:BiosphereQueryResult|undefined;
  return {
    address:bodyAddress, dateNs:t, state, environment, ocean,
    biosphere:()=>biosphere??(biosphere=biosphereStateAt(
      seed,bodyAddress,body,t,'baseline',versions,star,parentPlanet)),
    surface:(direction:V3)=>dated.sample(direction),
  };
}
