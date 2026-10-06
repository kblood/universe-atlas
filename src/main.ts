import * as THREE from "three";
import {RenderProfile,systemTimer} from './render-profile.ts';
import {staticQualitySettings} from './quality-settings.ts';
import {levelForward} from './view-heading.ts';
import {SurfaceLighting} from './surface-lighting.ts';
import {ShadowMapCache} from './shadow-map-cache.ts';
import {ShadowProgramWarmup} from './shadow-program-warmup.ts';
import {RENDER_QUALITY,AdaptiveRenderQuality,renderQualityMode,type RenderQualityMode,type RenderQualityName} from './render-quality.ts';
import {ForestAssetSource} from './forest-asset-source.ts';
import {ForestAssetAttachment} from './forest-asset-attachment.ts';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { AtlasVR, type VRMenu } from "./vr.ts";
import {
  LY_PER_MPC,
  systemBoundary,
  automaticSpeed,
  nearestBody,
  surfaceClearance,
  sweptTerrainStep, FLIGHT_EYE_CLEARANCE_M,
  sweptStarStep,
  GALAXY_ENTRY_RADII, GALAXY_EXIT_RADII, SYSTEM_PREPARE_LY,
} from "./travel.ts";
import { displayLuminosity, starPointDiameter, STAR_FRAGMENT } from './star-appearance.ts';
import { PlanetRenderer, landPercentileM } from './planet-renderer.ts';
import {landingHeightAllowed,landingCandidate,pickLandingSite,resolveGroundBookmark,LANDING_SUMMIT_PERCENTILE,NO_LANDING_SITE_MESSAGE} from './landing-site.ts';
import { NavigationMarkers } from './navigation-markers.ts';
import { freeLook, orbitStep, atmosphereHeightM, alignPlanetaryDown, planetaryRenderUnit, LOCAL_RENDER_EXIT_M, LOCAL_ORIGIN_RADIUS_M } from './planet-flight.ts';
import {parseDate,dateRecord,dateYears,yearsToDate,advanceDate,CATALOGUE_EPOCH_NS,UNIVERSE_END_NS,YEAR_NS,type Ns} from './world-time.ts';
import {identityRecord,stellarHistory} from './world-history.ts';
import {type surfaceQuery,biosphereStateAt,biosphereHistoryFor,clearBiosphereHistoryCache,planetAgeMyr,planetSnapshotAt,type BiosphereQueryStage} from './world-surface.ts';
import type {LifeGateContext} from './planet-renderer.ts';
import {PLANET_DETAIL} from './planet-detail.ts';
import type {FloraKind,FloraStage} from './flora-field.ts';
import type {CreatureArchetype} from './creature-model.ts';
import {profileFromPhysicalProperties,type Species} from './biosphere-model.ts';
import {galaxyLifecycle,galaxyStateAt,type GalaxyLifecycle} from './galaxy-history.ts';
import {
  starLifecycle,starStateAt,planetLifecycle,planetStateAt,spinStateFor,rotationAngleAt,
  type StarLifecycle,type PlanetLifecycle,type SpinState,type ParentPlanetContext,
} from './stellar-evolution.ts';
import {parseAddress,type BodyAddress,type GalaxyAddress} from './address.ts';
import {ERA_CHECKPOINTS,scaleFactorAt} from './cosmology.ts';
import {cosmicBackgroundAt,RECOMBINATION_NS,FIRST_STARS_NS} from './cosmic-background.ts';
import {primordialStars,primordialStarsAt,primordialEnrichmentProxyAt,type PrimordialStar} from './primordial-population.ts';
import {illustrativeCmbGradient} from './cmb-field.ts';
import {galaxyLineageAt,galaxyHostAt,historicalStarsForGalaxy} from './stellar-cohorts.ts';
import {futureStageAt,galaxyLightProxyAt,ALTERNATE_FUTURE_SCENARIOS,type FutureStage,type AlternateFutureScenario} from './future-scenario.ts';
import {observedGalaxyAt} from './observed-sky.ts';
import {
  CURRENT_VERSIONS,PLAYBACK_TIERS,type TierId,
  advancePlayback,eraIndexAt,eraCheckpoint,nextEraCheckpoint,prevEraCheckpoint,eraTrackFraction,
  fineRangeForEra,fineFractionToT,tToFineFraction,
  resolveTimeFromUrl,writeTimeToUrl,groundedSeekFallback,type GroundedSeekContext,
  compatibilityNoticeFromUrl,
  safeScaleFactorAt,canonicalDigest,
} from './time-nav.ts';
import {type SurfaceSite,SURVEY_VERSION} from './surface-survey.ts';
import {INLAND_RIVERS_UNAVAILABLE} from './inland-rivers.ts';
import {type GroundWalker} from './ground-walker.ts';
import { GalaxySpace } from "./galaxy-space.ts";
import { ViewBlend } from "./view-transition.ts";
import { systemLayout, type SystemScale } from "./system-layout.ts";
import { TERRAIN_VERSION, terrainSampler, type planetSurface } from "./terrain.ts";
import {biomeClassifier} from './surface-biomes.ts';
import {
  galaxies,
  overview,
  system,
  refByAddress,
  bodyPosition,
  orbitPosition,
  VERSION,
  LY,
  AU,
  type Galaxy,
  type V3,
  type SystemRef,
  type StarSystem,
  type Body,
} from "./catalog.ts";
import "./style.css";

const $ = (id: string) => document.getElementById(id)!;
const esc = (s: unknown) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const fmt = (v: number, d = 1) =>
  v.toLocaleString("en-US", { maximumFractionDigits: d });
/** Human scale for cosmic dates; exact integer years remain in the edit field and URL. */
function readableYears(t:Ns):string {
  const years=t/YEAR_NS;
  if(years<1_000n)return `${years} years`;
  if(years>=1_000_000_000_000_000_000n){
    const digits=years.toString();
    return `${digits[0]}.${digits.slice(1,3).padEnd(2,'0')} × 10^${digits.length-1} years`;
  }
  const units:[bigint,string][]=[[1_000_000_000_000_000n,'Qa'],[1_000_000_000_000n,'Tr'],[1_000_000_000n,'B'],[1_000_000n,'M'],[1_000n,'T']];
  const [unit,suffix]=units.find(([value])=>years>=value)!;
  const tenths=(years*10n+unit/2n)/unit;
  return `${tenths/10n}${tenths%10n===0n?'':'.'+String(tenths%10n)} ${suffix} years`;
}
const readableLifetime=(birth:Ns,death:Ns)=>readableYears(death-birth);
const vec = (p: V3) => new THREE.Vector3(...p);
const facts = (entries: [string, string][]) =>
  `<dl class="facts">${entries.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join("")}</dl>`;
const distance = (m: number) =>
  m >= AU * 0.1 ? fmt(m / AU, 3) + " AU" : fmt(m / 1000, 0) + " km";
const item = (
  id: string,
  title: string,
  detail: string,
  color = "#90cfd0",
  active = false,
) =>
  `<button class="item ${active ? "active" : ""}" data-select="${esc(id)}"><span class="dot" style="--dot:${color}"></span><span><strong>${esc(title)}</strong><small>${esc(detail)}</small></span><span class="arrow">↗</span></button>`;
type Level = "universe" | "galaxy" | "sector" | "system" | "body";
type State = {
  level: Level;
  galaxy?: Galaxy;
  coords?: V3;
  ref?: SystemRef;
  sys?: StarSystem;
  body?: Body;
};
let seed =
  new URLSearchParams(location.search).get("seed") ||
  readStored("atlas-seed") ||
  "LETHRA-001";
seed = seed.slice(0, 80);
let followedPlanetId:string|null=new URLSearchParams(location.search).get('follow');
let viewMode:'state'|'observed'=new URLSearchParams(location.search).get('observe')==='1'?'observed':'state';
type FutureScenarioId='constant-dark-energy'|AlternateFutureScenario['id'];
const savedFate=new URLSearchParams(location.search).get('fate');
let futureScenario:FutureScenarioId=savedFate==='big-crunch'||savedFate==='big-rip'?savedFate:'constant-dark-energy';
function alternateFuture(){return futureScenario==='constant-dark-energy'?null:ALTERNATE_FUTURE_SCENARIOS[futureScenario];}
if(futureScenario!=='constant-dark-energy')viewMode='state';
let catalogue = galaxies(seed),
  state: State = { level: "universe" },
  selected: string | null = null,
  region: V3 | null = null;
let sectorData: {
  refs: SystemRef[];
  total: number;
  coords: V3;
  aggregated: boolean;
} | null = null;
let epoch = CATALOGUE_EPOCH_NS,
  playing = false,
  tier: TierId = 'orbital',
  loadId = 0,
  frameCount = 0,
  drawCount = 0,
  frameTimes: number[] = [];
try {epoch=resolveTimeFromUrl(new URLSearchParams(location.search));}catch{}
if(alternateFuture()&&epoch>alternateFuture()!.endDateNs)epoch=alternateFuture()!.endDateNs;
// Per-galaxy/body lifecycle caches (contract §2.2/§2.3): built once per
// catalogue/system and reused for existence gating every frame, instead of
// recomputing a deterministic-but-not-free lifecycle draw every tick.
// Cleared whenever the objects they key on are torn down (clearView for the
// per-system map, seed regeneration for the per-galaxy map).
const galaxyLifecycles = new Map<string, GalaxyLifecycle>();
type BodyLifecycleEntry =
  | { kind: 'star'; lc: StarLifecycle }
  | { kind: 'planet' | 'moon'; lc: PlanetLifecycle; starLc: StarLifecycle };
let bodyLifecycles = new Map<string, BodyLifecycleEntry>();
// `spinStateFor` re-draws its RNG on every call; it's t-independent (pure
// function of the body alone) so — unlike the existence-gating stage lookups
// above, which are cheap and must re-run every frame as `epoch` changes —
// caching it once per body avoids doing fresh hash64 draws every rendered
// frame for every body in view (this fed a real per-frame cost spike before
// caching was added here).
const bodySpins = new Map<string, SpinState>();
function spinFor(body: Body): SpinState {
  let spin = bodySpins.get(body.id);
  if (!spin) { spin = spinStateFor(body); bodySpins.set(body.id, spin); }
  return spin;
}
function galaxyAddressFor(g: Galaxy): GalaxyAddress {
  const parsed=parseAddress(g.id);
  if(parsed&&'galaxyOrdinal' in parsed)return parsed;
  const root=/^G(\d{3})$/.exec(g.id);
  if(root)return {clusterCell:[0n,0n,0n],groupCell:[0n,0n,0n],galaxyOrdinal:Number(root[1])-1};
  throw new Error(`Cannot resolve galaxy address: ${g.id}`);
}
function galaxyLifecycleFor(g: Galaxy): GalaxyLifecycle {
  let lc = galaxyLifecycles.get(g.id);
  if (!lc) { lc = galaxyLifecycle(seed, galaxyAddressFor(g)); galaxyLifecycles.set(g.id, lc); }
  return lc;
}
function bodyAddressFor(sys: StarSystem, body: Body): BodyAddress {
  const sysAddress = parseAddress(sys.ref.id) as BodyAddress;
  return { ...sysAddress, slot: body.id.slice(sys.ref.id.length + 1) };
}
/** Builds (or returns the cached) lifecycle entry for a body in the resident
 * system. Moons resolve their parent planet's lifecycle first (§2.3
 * requires it — a moon can't be lifecycle-queried standalone) and inherit
 * its formation/engulfment bounds through `ParentPlanetContext`. */
function lifecycleFor(sys: StarSystem, body: Body): BodyLifecycleEntry {
  const cached = bodyLifecycles.get(body.id);
  if (cached) return cached;
  if (body.kind === 'star') {
    const entry: BodyLifecycleEntry = { kind: 'star', lc: starLifecycle(seed, bodyAddressFor(sys, body), body) };
    bodyLifecycles.set(body.id, entry);
    return entry;
  }
  const star = sys.stars[0];
  const starEntry = lifecycleFor(sys, star);
  const starLc = starEntry.kind === 'star' ? starEntry.lc : starLifecycle(seed, bodyAddressFor(sys, star), star);
  let parentPlanet: ParentPlanetContext | undefined;
  if (body.kind === 'moon') {
    const parent = sys.planets.find((p) => p.id === body.parentId)!;
    const parentEntry = lifecycleFor(sys, parent);
    const parentLc = parentEntry.kind !== 'star' ? parentEntry.lc : planetLifecycle(seed, bodyAddressFor(sys, parent), parent, starLc);
    parentPlanet = { starOrbitAu: (parent.orbit ? parent.orbit.a / AU : 0), lifecycle: parentLc };
  }
  const lc = planetLifecycle(seed, bodyAddressFor(sys, body), body, starLc, parentPlanet);
  const entry: BodyLifecycleEntry = { kind: body.kind === 'moon' ? 'moon' : 'planet', lc, starLc };
  bodyLifecycles.set(body.id, entry);
  return entry;
}
// world-surface.ts's `BiosphereQueryResult.stage` has 8 values (including
// 'accreting'/'molten'/'extinct', which have no flora/fauna analogue);
// flora-field.ts's `FloraStage`/fauna-runtime.ts's `FaunaStage` both use the
// same narrower 5-value set. The 3 extra values all collapse to 'unformed'
// (zero density in both modules' own STAGE_DENSITY_MULTIPLIER tables), so
// this is a safe, lossless-for-gating-purposes narrowing, not an approximation.
const planetSnapshots=new WeakMap<Body,{seed:string;date:Ns;hydrology:Body['hydrology'];canonical:Body['canonicalRivers'];snapshot:ReturnType<typeof planetSnapshotAt>}>();
function planetSnapshotFor(sys:StarSystem,body:Body,t:Ns){
  const cached=planetSnapshots.get(body);
  if(cached?.seed===seed&&cached.date===t&&cached.hydrology===body.hydrology&&cached.canonical===body.canonicalRivers)return cached.snapshot;
  const entry=lifecycleFor(sys,body);
  if(entry.kind==='star')throw new Error('A star has no planet snapshot');
  const snapshot=planetSnapshotAt(seed,body.id,body,entry.lc,entry.starLc,t,CURRENT_VERSIONS,
    body.kind==='moon'?sys.planets.find(p=>p.id===body.parentId):undefined);
  planetSnapshots.set(body,{seed,date:t,hydrology:body.hydrology,canonical:body.canonicalRivers,snapshot});
  return snapshot;
}
function toLifeStage(stage: BiosphereQueryStage): FloraStage {
  switch (stage) {
    case 'forming': case 'sterile': case 'microbial': case 'complex': return stage;
    default: return 'unformed';
  }
}
// flora-field.ts's own doc for `FloraBiosphereGate.availableKinds`: map
// `species.kind` for tree/shrub/grass entries. biosphere-model.ts's
// `SpeciesKind` has no 'flower' analogue (flowers are ambient ground cover
// with no dedicated lineage/extinction tracking in this biosphere model), so
// 'flower' is included whenever ANY plant species is alive; an empty result
// (no living plant species at all) is passed through as an explicit `[]`
// ("extinct vegetation"), never `undefined` ("allow all" — wrong once we
// know for a fact there are zero plant species).
function floraKindsFromSpecies(species: readonly Species[]): readonly FloraKind[] {
  const kinds = new Set<FloraKind>();
  for (const s of species) if (s.kind === 'tree' || s.kind === 'shrub' || s.kind === 'grass') kinds.add(s.kind);
  if (kinds.size > 0) kinds.add('flower');
  return [...kinds];
}
// fauna-runtime.ts's own doc for `FaunaBiosphereGate.availableArchetypes`:
// map `creature.archetype` for species entries with `.creature` set (the
// four procedural quadruped clades).
function faunaArchetypesFromSpecies(species: readonly Species[]): readonly CreatureArchetype[] {
  const archetypes = new Set<CreatureArchetype>();
  for (const s of species) if (s.creature) archetypes.add(s.creature.archetype);
  return [...archetypes];
}
// Single-slot memo: `updatePlanetTiles` calls this once per rendered frame,
// and the (body, epoch) pair is unchanged far more often than not (paused
// playback, orbit/flight with the clock stopped, repeated frames while
// walking). `biosphereStateAt` composes a full species timeline lookup, so
// this avoids repeating that work every single frame for no change in input.
let lifeGateCache: { key: string; value: LifeGateContext | null } | null = null;
/** The last computed context and its sources. In realtime the date (so the
 * memo key) changes every frame while the living world does not: the dated
 * species list holds the same Species records until a whole-Myr boundary or
 * a stage change. When every source matches, the previous context object is
 * returned unchanged, so its derived arrays are not rebuilt and consumers can
 * short-circuit on identity (PlanetRenderer.updateLife's life signature). */
let lifeGateSources: { seed: string; body: Body; lc: unknown; solid: boolean; stage: FloraStage; tMyr: number; species: readonly Species[]; rocks: unknown; value: LifeGateContext } | null = null;
function sameRefs<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
/** The `LifeGateContext` `PlanetRenderer.update()`'s 9th argument needs,
 * computed from world-surface.ts's SAFE `biosphereStateAt` query (never the
 * raw `biosphereAt` — see this task's report for why) and `planetAgeMyr`
 * (the only correct provenance for flora's clamped `tMyr` — never hand-rolled
 * Ns-to-Myr arithmetic; see flora-field.ts's `toMyr` PROVENANCE RULE). `null`
 * for stars, gas giants and any stage before 'molten'/'solid' — the exact
 * same existence gate the `existenceDigest` diagnostic above already uses. */
function lifeGateContext(sys: StarSystem, body: Body, t: Ns): LifeGateContext | null {
  const key = seed + '/' + body.id + '/' + t.toString();
  if (lifeGateCache && lifeGateCache.key === key) return lifeGateCache.value;
  const entry = lifecycleFor(sys, body);
  let value: LifeGateContext | null = null;
  if (entry.kind !== 'star') {
    const st = planetSnapshotFor(sys,body,t).state;
    if (st.stage === 'molten' || st.stage === 'solid') {
      const bio = planetSnapshotFor(sys,body,t).biosphere();
      const stage = toLifeStage(bio.stage), tMyr = planetAgeMyr(entry.lc, t), solid = st.stage === 'solid';
      const rocks = solid ? biosphereHistoryFor(seed, body.id, body, entry.lc).rocks : null;
      const prev = lifeGateSources;
      if (prev && prev.seed === seed && prev.body === body && prev.lc === entry.lc && prev.solid === solid && prev.stage === stage
        && Object.is(prev.tMyr, tMyr) && prev.rocks === rocks && sameRefs(prev.species, bio.species)) {
        lifeGateCache = { key, value: prev.value };
        return prev.value;
      }
      value = {
        tMyr,
        floraStage: stage, floraAvailableKinds: floraKindsFromSpecies(bio.species),
        treeSpecies: bio.species.filter(s=>s.kind==='tree'),
        faunaStage: stage, faunaAvailableArchetypes: faunaArchetypesFromSpecies(bio.species),
        faunaSpecies: bio.species.filter((s): s is Species & { creature: NonNullable<Species['creature']> } => !!s.creature)
          .map(s => ({ id: s.id, creature: s.creature })),
        // Rocks follow the solid surface, not life: the same body-keyed
        // history supplies RockFamily records on barren and living worlds.
        rocks: rocks
          ? { surfaceSolid: true, families: rocks }
          : { surfaceSolid: false, families: [] },
      };
      lifeGateSources = { seed, body, lc: entry.lc, solid, stage, tMyr, species: bio.species, rocks, value };
    }
  }
  lifeGateCache = { key, value };
  return value;
}
/** The same dated sea level feeds the tile renderer, flight, landing, and walking. */
const waterLevelCache=new WeakMap<Body,{date:bigint;state:ReturnType<typeof planetSnapshotAt>['ocean']}>();
function oceanStateFor(body: Body, sys: StarSystem = state.sys!) {
  const cached=waterLevelCache.get(body);
  if(cached?.date===epoch)return cached.state;
  const entry=lifecycleFor(sys,body);
  const ocean=entry.kind==='star'
    ? {globalOceanAvailable:false,waterLevelM:0,renderWaterLevelM:-1_000_000}
    : planetSnapshotFor(sys,body,epoch).ocean;
  waterLevelCache.set(body,{date:epoch,state:ocean});
  return ocean;
}
function waterLevelFor(body: Body, sys: StarSystem = state.sys!): number {
  return oceanStateFor(body,sys).renderWaterLevelM;
}
const snappedWaterLevelFor=(body:Body,sys:StarSystem=state.sys!)=>Math.round(waterLevelFor(body,sys)/25)*25;
const nearestAtDate=(sys:StarSystem,p:V3)=>nearestBody(sys,p,epoch,body=>snappedWaterLevelFor(body,sys));
function surfaceFor(body: Body, sys: StarSystem = state.sys!, t: Ns = epoch) {
  if (body.kind === 'star') return (_direction: V3, _date: Ns = t) => null;
  return (direction: V3, date: Ns = t) => planetSnapshotFor(sys, body, date).surface(direction);
}
/** Landing candidates (decisions addendum 4, decision 2): the level-0 rock field, the representation of the level-0
 * summit cutoff; no mountain block solves on the main thread. Landing and walking keep surfaceFor (the truth). */
function landingSurfaceFor(body: Body, sys: StarSystem = state.sys!, t: Ns = epoch) {
  if (body.kind === 'star') return (_direction: V3, _date: Ns = t) => null;
  return (direction: V3, date: Ns = t) => planetSnapshotFor(sys, body, date).landingSurface(direction);
}
function surfaceSample(body: Body, direction: V3, sys: StarSystem = state.sys!, t: Ns = epoch) {
  return body.kind === 'star' ? null : planetSnapshotFor(sys, body, t).surface(direction);
}
/** §3.3 grounded-seek policy inputs for the body currently under the player's
 * feet (or hovered above), at a candidate target time `t`. */
function groundedSeekContextFor(galaxy: Galaxy, sys: StarSystem, body: Body, t: Ns): GroundedSeekContext {
  const galaxyExists = galaxyStateAt(galaxyLifecycleFor(galaxy), t).stage === 'active';
  const star = sys.stars[0];
  const starLc = lifecycleFor(sys, star).kind === 'star' ? (lifecycleFor(sys, star) as { kind: 'star'; lc: StarLifecycle }).lc : starLifecycle(seed, bodyAddressFor(sys, star), star);
  const starExists = starStateAt(starLc, t).stage !== 'unformed';
  const entry = lifecycleFor(sys, body);
  let planetExists = true, planetWalkable = true, engulfed = false;
  if (entry.kind !== 'star') {
    const st = planetStateAt(entry.lc, entry.starLc, t);
    engulfed = st.stage === 'engulfed';
    planetExists = st.stage === 'molten' || st.stage === 'solid';
    planetWalkable = st.stage === 'solid';
  }
  return { galaxyExists, starExists, planetExists, planetWalkable, engulfed };
}
let ready = false,
  frameMs = 16,
  lastStats = 0;
function readStored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function saveStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Browsing remains usable when storage is unavailable. */
  }
}
const input = $("seed") as HTMLInputElement;
input.value = seed;
const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});
let jobId = 0;
const pending = new Map<
  number,
  {
    resolve: (v: any) => void;
    reject: (e: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }
>();
worker.onmessage = ({ data }) => {
  const p = pending.get(data.id);
  if (!p) return;
  clearTimeout(p.timer);
  pending.delete(data.id);
  if (data.error) p.reject(new Error(data.error));
  else p.resolve(data.result);
};
worker.onerror = () => {
  for (const p of pending.values()) {
    clearTimeout(p.timer);
    p.reject(new Error("Generation worker failed. Reload to retry."));
  }
  pending.clear();
};
function job(kind: string, args: unknown): Promise<any> {
  return new Promise((resolve, reject) => {
    if (pending.size >= 40) {
      reject(new Error("Generation queue is busy. Try again in a moment."));
      return;
    }
    const id = ++jobId,
      timer = setTimeout(() => {
        pending.delete(id);
        reject(
          new Error(
            "Generation timed out; the current view is still available.",
          ),
        );
      }, 60000);
    pending.set(id, { resolve, reject, timer });
    worker.postMessage({ id, kind, args });
  });
}
const scene = new THREE.Scene();
scene.background = new THREE.Color("#070b12");
const camera = new THREE.PerspectiveCamera(
  48,
  innerWidth / innerHeight,
  0.02,
  1000,
);
let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true,
    powerPreference: "high-performance",
  });
} catch (e) {
  $("status").textContent = "This atlas needs a browser with WebGL2 enabled.";
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
camera.setViewOffset(
  innerWidth,
  innerHeight,
  innerWidth > 800 ? 130 : 60,
  0,
  innerWidth,
  innerHeight,
);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate=false;
const renderProfile=new RenderProfile(renderer.getContext() as WebGL2RenderingContext);
renderProfile.setEnabled(new URLSearchParams(location.search).get('profile')==='1');
// Shadow-map CPU share of scene submission (per-system CPU attribution). The
// wrapper is a timing no-op while profiling is disabled.
// The map is reused while its exact inputs (light camera, casters, their
// geometry/instances/material state and depth uniforms) are unchanged; see
// shadow-map-cache.ts. `?shadowCache=0` or `__atlas.setShadowCache(false)`
// restores a render every frame.
const shadowCache=new ShadowMapCache(material=>(renderer.properties.get(material) as {uniforms?:Record<string,{value:unknown}>}).uniforms);
shadowCache.enabled=new URLSearchParams(location.search).get('shadowCache')!=='0';
{
  const shadowMap=renderer.shadowMap,shadowRender=shadowMap.render.bind(shadowMap);
  shadowMap.render=(...args:Parameters<typeof shadowRender>)=>{
    const started=systemTimer.start();
    try{
      const [lights,target,view]=args;
      if(shadowMap.enabled&&(shadowMap.autoUpdate||shadowMap.needsUpdate)&&lights.length&&
        shadowCache.canSkip(lights,target,view,shadowMap.type)){shadowMap.needsUpdate=false;return;}
      return shadowRender(...args);
    }finally{systemTimer.stop('shadow',started);}
  };
  renderer.domElement.addEventListener('webglcontextrestored',()=>{shadowCache.invalidate();shadowWarmup.reset();});
}
/** Debug GPU attribution: systems hidden for one render at a frozen pose. */
const PROFILING_SYSTEMS=['terrain','sky','forestNear','forestMiddle','forestFar','flora','fauna','rocks','clouds','shadow'] as const;
const hiddenProfilingSystems=new Set<string>();
$("viewport").append(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.minDistance = 0.7;
controls.maxDistance = 160;
let root = new THREE.Group();
scene.add(root);
let contextRoot = new THREE.Group(),
  skyAnchor = new THREE.Group();
let contextVisible = true,
  locationMap = "";
let contextStats = {
  galaxies: 0,
  nearbySystems: 0,
  skyPoints: 0,
  sectorStars: 0,
};
type CloudData = ReturnType<typeof overview>;
type NamedCloud = CloudData & { id: string };
const backdrop = new THREE.BufferGeometry(),
  bgPos: number[] = [];
let bx = 1234;
const br = () => {
  bx = (Math.imul(bx, 1664525) + 1013904223) >>> 0;
  return bx / 4294967296;
};
for (let i = 0; i < 1700; i++) {
  const a = br() * Math.PI * 2,
    h = br() * 2 - 1,
    r = 180;
  bgPos.push(
    Math.sqrt(1 - h * h) * Math.cos(a) * r,
    h * r,
    Math.sqrt(1 - h * h) * Math.sin(a) * r,
  );
}
backdrop.setAttribute("position", new THREE.Float32BufferAttribute(bgPos, 3));
const genericBackdrop = new THREE.Points(
  backdrop,
  new THREE.PointsMaterial({
    size: 0.15,
    color: "#738ba6",
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  }),
);
scene.add(genericBackdrop);
const ambientLight=new THREE.AmbientLight("#91b3cc", 0.22);
scene.add(ambientLight);
// Shared with `positionSystem`'s self-normalising re-tint below -- keep a
// single source of truth for the light's base (pre-lifecycle) colour so the
// two spots can never drift out of sync.
const LIGHT_BASE_COLOR = "#ffecd0";
const light = new THREE.DirectionalLight(LIGHT_BASE_COLOR, 3);
light.position.set(-12, 5, 10);
scene.add(light);
scene.add(light.target);
const shadowWarmup=new ShadowProgramWarmup(renderer,light);
const surfaceLighting=new SurfaceLighting(light,ambientLight);
scene.add(surfaceLighting.sky);
const glowCanvas = document.createElement("canvas");
glowCanvas.width = glowCanvas.height = 64;
const ctx = glowCanvas.getContext("2d")!;
const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
gr.addColorStop(0, "rgba(255,255,255,1)");
gr.addColorStop(0.07, "rgba(255,255,255,0.9)");
gr.addColorStop(0.22, "rgba(255,255,255,0.22)");
gr.addColorStop(1, "rgba(255,255,255,0)");
ctx.fillStyle = gr;
ctx.fillRect(0, 0, 64, 64);
const glow = new THREE.CanvasTexture(glowCanvas);
type Pick = { object: THREE.Object3D; id: string; kind: string };
let picks: Pick[] = [];
let labels: { el: HTMLElement; object: THREE.Object3D }[] = [];
let animations: {
  obj: THREE.Object3D;
  body: Body;
  sys: StarSystem;
  scale: number;
  parent?: Body;
}[] = [];
const ray = new THREE.Raycaster();
ray.params.Points = { threshold: 0.15 };
const mouse = new THREE.Vector2();
let tween: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  targetFrom: THREE.Vector3;
  targetTo: THREE.Vector3;
  start: number;
  duration: number;
  logarithmic?: boolean;
} | null = null;
let homePos = new THREE.Vector3(15, 13, 22);
let homeTarget = new THREE.Vector3();
let systemOrigin = new THREE.Vector3(),
  systemUnit = 1 / AU;
let systemOrbits: THREE.Object3D[] = [];
let residentSystem: string | null = null;
let detailedBody: { mesh: THREE.Mesh; body: Body } | null = null;
let planetTiles: PlanetRenderer | null = null;
let systemMarkers: NavigationMarkers | null = null;
type GalaxyGlyph = {group: THREE.Group; visual: THREE.Group; pick: THREE.Mesh; radius: number;
  galaxy: Galaxy; preview?: GalaxySpace; pending?: boolean; failed?: boolean; detailWanted?: boolean; baseAlpha?: number};
let galaxyGlyphs: GalaxyGlyph[] = [];
const opticalStarPoints:{mesh:THREE.Mesh;point:THREE.Points<THREE.BufferGeometry,THREE.ShaderMaterial>;sourceColor:THREE.Color;luminosity:number}[]=[];
let flightAim: string | null = null;
let walker:GroundWalker|null=null;
let walkingModule:typeof import('./ground-walker.ts')|null=null;
let landing:{point:V3;launch?:boolean;contact?:boolean;heading?:THREE.Quaternion;clearanceM?:number}|null=null;
let landAfterCruise=false,walkGeneration=0;
function clearWalking(){walkGeneration++;walker?.dispose();walker=null;landing=null;landAfterCruise=false;planetTiles?.setContactFocus(null);}
let orbitAssist: {bodyId: string; axis: THREE.Vector3; clearanceM?: number} | null = null;
let surfaceJourney: {bodyId:string; direction:THREE.Vector3; up:THREE.Vector3} | null = null;
let startCruiseAfterLook = false;
let approachClearance = 3000;
let approachAltitude: number | null = null;
let planetLook: {from: THREE.Quaternion; to: THREE.Quaternion; elapsed: number} | null = null;
let bodyFocusToken = 0,
  flightThrottle = 1,
  flightDomain = "galaxy",
  flightClearance = 0;
type TravelPose = { position: V3; quaternion: THREE.Quaternion };
let crossing: {
  read: () => TravelPose;
  apply: (pose: TravelPose) => void;
} | null = null;
let crossings = 0;
const prepared = new Map<string, Promise<any>>();
function prepare(key: string, kind: string, args: any) {
  let result = prepared.get(key);
  if (!result) {
    result = job(kind, args);
    prepared.set(key, result);
    if (prepared.size > 3) prepared.delete(prepared.keys().next().value!);
    result.catch(() => prepared.delete(key));
  }
  return result;
}

let vr: AtlasVR | undefined;
let systemScale: SystemScale = "overview";
let displayLayout: ReturnType<typeof systemLayout> | null = null;
type Surface = ReturnType<typeof planetSurface>;
let surfaceMesh: THREE.Mesh<
  THREE.SphereGeometry,
  THREE.MeshStandardMaterial
> | null = null;
let surfaceInfo: Surface | null = null;
let surfaceDetail=new URLSearchParams(location.search).get('detail')!=='0';
let surfaceLightingEnabled=new URLSearchParams(location.search).get('lighting')!=='0';
/** Desktop render-quality profile (render-quality.ts); explicit, never automatic. */
let qualityMode:RenderQualityMode=renderQualityMode(new URLSearchParams(location.search).get('quality'));
const adaptiveQuality=new AdaptiveRenderQuality();
function effectiveQuality():RenderQualityName{return qualityMode==='auto'?adaptiveQuality.current:qualityMode;}
// Detailed Oak/Pine families (and the far atlas baked from them) are the
// ordinary desktop forest; `trees=0` opts out. Immersive sessions still skip
// them (see forestAssetAttachment.update) until a Quest profile is measured.
let detailedForestEnabled=new URLSearchParams(location.search).get('trees')!=='0';
const forestAssetSource=new ForestAssetSource(new URL('assets/forest/desktop-v1/forest-bundle-manifest.json',document.baseURI));
const forestAssetAttachment=new ForestAssetAttachment(forestAssetSource,()=>panel());
let horizonAssist=new URLSearchParams(location.search).get('horizon')!=='0';
let flightAlignment:({bodyId:string;altitudeM:number}&ReturnType<typeof alignPlanetaryDown>)|null=null;
const surveys=new Map<string,SurfaceSite[]>(),surveyPending=new Set<string>();
// Surveys sample the baseline terrain only; inland rivers are withdrawn.
const surveyKey=(body:Body)=>body.seed+'/'+TERRAIN_VERSION;
let surveyOpen=false;
async function surveySurface(){
  const body=state.body;if(!body||surveyPending.has(surveyKey(body)))return;
  const key=surveyKey(body);surveyOpen=true;surveyPending.add(key);panel();
  try{
    const sites=await job('surface-survey',{body}) as SurfaceSite[];
    surveys.set(key,sites);
    if(surveys.size>4)surveys.delete(surveys.keys().next().value!);
  }catch(error){announce('Surface survey failed: '+String(error));}
  finally{surveyPending.delete(key);if(state.body?.id===body.id)panel();}
}
let reliefScale = 1;
let refiningSurface = false;
let space: GalaxySpace | null = null;
let spaceSelection: { object: THREE.Object3D; el: HTMLElement } | null = null;
let flight = false,
  flightSpeed = 20;
let flightCruise=false;
// Exploration uses the dated universe clock at one physical second per second.
// Explicit pause and date seek remain paused until resumed by the user.
let explorationPaused=false;
let lastFlightSweep={distanceM:0,contact:false,samples:0};
function timeRunning(){return playing||(flight&&!explorationPaused);}
function toggleTime(){
  if(flight){explorationPaused=timeRunning();playing=false;}
  else {playing=!playing;explorationPaused=!playing;}
  panel();
}
const flightKeys = new Set<string>();
let touchForwardHeld = false;
let viewBlend: ViewBlend | null = null;
let journey = {
  active: false,
  phase: "idle",
  from: "universe",
  to: "universe",
  completed: 0,
};
function disposeView(group: THREE.Group) {
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    if (m.material) {
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
        const textured = mat as THREE.MeshStandardMaterial;
        for (const map of new Set([
          textured.map,
          textured.bumpMap,
          textured.roughnessMap,
        ]))
          if (map && map !== glow) map.dispose();
        mat.dispose();
      }
    }
  });
}
function clearView(retain = false) {
  clearWalking();
  surfaceJourney = null; startCruiseAfterLook = false;
  systemMarkers = null; for(const glyph of galaxyGlyphs)glyph.preview?.stop();
  galaxyGlyphs = []; primordialGlyphs.length=0; opticalStarPoints.length=0; flightAim = null;
  planetTiles?.dispose(); planetTiles = null;
  orbitAssist = null; approachAltitude = null;
  planetLook = null;
  residentSystem = null;
  detailedBody = null;
  systemOrigin.set(0, 0, 0);
  systemOrbits = [];
  bodyFocusToken++;
  space?.stop();
  space = null;
  spaceSelection = null;
  if (!crossing) {
    flight = false;
    flightKeys.clear();
  }
  controls.zoomToCursor = false;
  camera.near = 0.02;
  camera.updateProjectionMatrix();
  document.getElementById("flight-hud")?.remove();
  if (!retain) {
    scene.remove(root);
    disposeView(root);
  }
  root = new THREE.Group();
  scene.add(root);
  contextRoot = new THREE.Group();
  skyAnchor = new THREE.Group();
  contextRoot.add(skyAnchor);
  contextRoot.visible = contextVisible;
  root.add(contextRoot);
  contextStats = {
    galaxies: 0,
    nearbySystems: 0,
    skyPoints: 0,
    sectorStars: 0,
  };
  locationMap = "";
  genericBackdrop.visible =
    state.level !== "galaxy" &&
    state.level !== "sector" &&
    state.level !== "system";
  picks = [];
  displayLayout = null;
  surfaceMesh = null;
  surfaceInfo = null;
  refiningSurface = false;
  light.position.set(-12, 5, 10);
  controls.minDistance = 0.7;
  controls.maxDistance = 160;
  animations = [];
  bodyLifecycles = new Map();
  bodySpins.clear();
  if (!retain) for (const l of labels) l.el.remove();
  labels = [];
  $("hover").hidden = true;
}
function addLabel(object: THREE.Object3D, title: string, sub = "") {
  if (labels.length >= 60) return;
  const el = document.createElement("div");
  el.className = "space-label";
  el.innerHTML = esc(title) + (sub ? `<small>${esc(sub)}</small>` : "");
  $("labels").append(el);
  labels.push({ object, el });
}
function pointCloud(
  data: { positions: Float32Array; colors: Float32Array; sizes: Float32Array },
  scale: number,
  opacity = 1,
) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(data.positions.length);
  for (let i = 0; i < pos.length; i++) pos[i] = data.positions[i] * scale;
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(data.colors, 3));
  geo.setAttribute("pointSize", new THREE.BufferAttribute(data.sizes, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      alpha: { value: opacity },
      pixelRatio: { value: renderer.getPixelRatio() },
      maxPointSize: {value:13},
    },
    vertexShader: `attribute vec3 color; attribute float pointSize; varying vec3 vColor; uniform float pixelRatio,maxPointSize; void main(){vColor=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;float objectScale=length(modelMatrix[0].xyz);gl_PointSize=clamp(pointSize*pixelRatio*110.*objectScale/max(.05,-mv.z),1.,maxPointSize);}`,
    fragmentShader: `varying vec3 vColor;uniform float alpha;void main(){vec2 p=gl_PointCoord-.5;float d=dot(p,p);if(d>.25)discard;float a=exp(-d*24.)*.72;gl_FragColor=vec4(vColor,a*alpha);}`,
    transparent: true,
    depthWrite: false,
    vertexColors: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, material);
}
function sprite(color: string, size: number) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glow,
      color,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  s.scale.setScalar(size);
  return s;
}
function fit(
  pos: THREE.Vector3,
  instant = false,
  target = new THREE.Vector3(),
) {
  homePos = pos.clone();
  homeTarget = target.clone();
  if (renderer.xr.isPresenting) {
    tween = null;
    vr?.reset();
    return;
  }
  if (instant || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    camera.position.copy(pos);
    controls.target.copy(target);
    controls.update();
    tween = null;
  } else {
    camera.position.copy(pos.clone().multiplyScalar(1.24));
    controls.target.copy(target);
    tween = {
      from: camera.position.clone(),
      to: pos,
      targetFrom: target.clone(),
      targetTo: target.clone(),
      start: performance.now(),
      duration: 700,
    };
  }
}
function focusPoint(p: THREE.Vector3, dist: number) {
  const dir = camera.position.clone().sub(controls.target).normalize();
  tween = {
    from: camera.position.clone(),
    to: p.clone().addScaledVector(dir, dist),
    targetFrom: controls.target.clone(),
    targetTo: p,
    start: performance.now(),
    duration: 600,
  };
}
function caption(
  k: string,
  title: string,
  description: string,
  stats: [string, string][] = [],
) {
  $("view-kicker").textContent = k;
  $("view-title").textContent = title;
  $("view-description").textContent = description;
  $("view-stats").innerHTML = stats
    .map(([v, l]) => `<span>${esc(v)}<small>${esc(l)}</small></span>`)
    .join("");
}
function announce(s: string, busy = false) {
  $("status").innerHTML =
    (busy ? '<span class="loading-indicator"></span>' : "") + esc(s);
}
function breadcrumbs() {
  const parts: { label: string; level: Level }[] = [
    { label: "Universe", level: "universe" },
  ];
  if (state.galaxy) parts.push({ label: state.galaxy.name, level: "galaxy" });
  if (state.coords)
    parts.push({
      label: "Local stars",
      level: "sector",
    });
  if (state.sys) parts.push({ label: state.sys.name, level: "system" });
  if (state.body) parts.push({ label: state.body.name, level: "body" });
  $("breadcrumbs").innerHTML = parts
    .map((p) => `<button data-level="${p.level}">${esc(p.label)}</button>`)
    .join("<span>›</span>");
  $("back").toggleAttribute("disabled", state.level === "universe");
  for (const b of $("breadcrumbs").querySelectorAll<HTMLButtonElement>(
    "button",
  ))
    b.onclick = () => {
      void navigate(b.dataset.level as Level);
    };
}
function setRenderQuality(mode:RenderQualityMode){
  qualityMode=mode;adaptiveQuality.reset();planetTiles?.setRenderQuality(RENDER_QUALITY[effectiveQuality()]);persist();
}
function persist() {
  const q = new URLSearchParams({ seed });
  if(viewMode==='observed')q.set('observe','1');
  if(futureScenario!=='constant-dark-energy')q.set('fate',futureScenario);
  if(!surfaceDetail)q.set('detail','0');
  if(!surfaceLightingEnabled)q.set('lighting','0');
  if(qualityMode!=='high')q.set('quality',qualityMode);
  if(!detailedForestEnabled)q.set('trees','0');
  if(!horizonAssist)q.set('horizon','0');
  writeTimeToUrl(q,epoch);
  if(walker){q.set('walk',walker.position.toArray().join(','));q.set('heading',camera.quaternion.toArray().join(','));}
  if (state.galaxy) q.set("g", state.galaxy.id);
  if (state.coords) q.set("sector", state.coords.join(","));
  if (state.ref) q.set("system", state.ref.id);
  if (state.body) q.set("body", state.body.id);
  if(followedPlanetId)q.set('follow',followedPlanetId);
  if(firstStarFocus)q.set('firstStar',firstStarFocus);
  if(selected&&space?.findPopulation(selected,epoch))q.set('cohort',selected);
  history.replaceState(null, "", "?" + q);
  saveStored("atlas-seed", seed);
}
function seekDate(next:bigint){
  explorationPaused=true;
  const alternate=alternateFuture();
  if(alternate&&next>alternate.endDateNs){next=alternate.endDateNs;announce(`${alternate.name} reaches its illustrative timeline limit here.`);}
  if(next<0n)next=0n;
  tween=null;
  if(alternate&&state.level!=='universe'&&alternate.stateAt(next)!=='ordinary-expansion'){
    clearWalking();autopilot=null;orbitAssist=null;playing=false;
    epoch=next;void navigate('universe');updateDateUI();persist();
    announce('Showing the alternate fate as a universe-scale illustration.');
    return;
  }
  const body=state.body,oldCenter=body&&state.sys?vec(bodyPosition(body,state.sys,epoch)):null;
  const relative=oldCenter?vec(localPose()).sub(oldCenter):null;
  const grounded=!!walker||!!landing;
  const focusedEntry=body&&state.sys?lifecycleFor(state.sys,body):null;
  const priorStage=focusedEntry&&focusedEntry.kind!=='star'?planetStateAt(focusedEntry.lc,focusedEntry.starLc,epoch).stage:null;
  const nextStage=focusedEntry&&focusedEntry.kind!=='star'?planetStateAt(focusedEntry.lc,focusedEntry.starLc,next).stage:null;
  // Before star birth or after engulfment there is no body to focus. During
  // accretion and cooling the focused formation proxy remains inspectable.
  if(state.level==='body'&&body&&state.sys&&state.galaxy){
    const starStage=focusedEntry?.kind==='star'?starStateAt(focusedEntry.lc,next).stage:null;
    if(nextStage==='unformed'||nextStage==='engulfed'||starStage==='unformed'){
      clearWalking();autopilot=null;orbitAssist=null;playing=false;
      epoch=next;
      const galaxy=state.galaxy,ref=state.ref,sys=state.sys;
      void navigate('system',{galaxy,ref,sys});
      updateDateUI();persist();
      announce('Showing this world’s formation from the system view.');
      return;
    }
  }
  // §3.3 grounded-seek policy: seeking while standing on a surface must never
  // strand the camera over a body/star/galaxy that no longer exists at the
  // target date. Decide the fallback scope BEFORE mutating any state.
  if(grounded&&body&&state.sys&&state.galaxy){
    const fallback=groundedSeekFallback(groundedSeekContextFor(state.galaxy,state.sys,body,next));
    if(fallback.scope!=='body'){
      clearWalking();autopilot=null;orbitAssist=null;planetLook=null;surfaceJourney=null;playing=false;
      epoch=next;
      const galaxy=state.galaxy,ref=state.ref,sys=state.sys;
      if(fallback.scope==='universe')void navigate('universe');
      else if(fallback.scope==='galaxy')void navigate('galaxy',{galaxy});
      else void navigate('system',{galaxy,ref,sys});
      updateDateUI();persist();
      announce(fallback.announce);
      return;
    }
  }
  let groundedAnnounce='Date changed in observation hover. Land again when ready.';
  if(grounded&&body&&state.sys&&state.galaxy)groundedAnnounce=groundedSeekFallback(groundedSeekContextFor(state.galaxy,state.sys,body,next)).announce;
  clearWalking();autopilot=null;orbitAssist=null;planetLook=null;surfaceJourney=null;playing=false;
  epoch=next;positionSystem();
  if(state.level==='body'&&(nextStage==='accreting'||nextStage==='molten')){
    planetTiles?.dispose();planetTiles=null;
  }
  if(relative&&body&&state.sys&&!renderer.xr.isPresenting){
    const targetOffset=controls.target.clone().sub(camera.position);
    if(grounded){const d=relative.clone().normalize(),surface=surfaceSample(body,d.toArray() as V3,state.sys,next);if(surface)relative.setLength(body.radiusM+surface.visibleHeightM+160);}
    const newCenter=vec(bodyPosition(body,state.sys,epoch)),shift=newCenter.clone().sub(oldCenter!);
    const position=relative.add(newCenter);
    rebaseSystem(position);camera.position.set(0,0,0);
    controls.target.copy(targetOffset);
    homePos.addScaledVector(shift,systemUnit);homeTarget.addScaledVector(shift,systemUnit);
  }
  updateDateUI();persist();panel();
  if(state.level==='body'&&body&&nextStage==='solid'&&priorStage!=='solid')void focusBody(body,true);
  if(state.level==='system'&&followedPlanetId){
    const followed=followedPlanet();
    if(followed){
      selected=followed.id;
      const entry=lifecycleFor(state.sys!,followed);
      if(entry.kind!=='star'){
        const stage=planetStateAt(entry.lc,entry.starLc,next).stage;
        if(stage==='molten'||stage==='solid')void focusBody(followed);
        else {panel();persist();}
      }
    }
  }
  announce(grounded?groundedAnnounce:'Orbital date updated across all views.');
}
function updateDateUI(){
  const idx=eraIndexAt(epoch),era=eraCheckpoint(idx);
  $('date-label').textContent=epoch===CATALOGUE_EPOCH_NS?'catalogue reference ("now")':
    epoch<YEAR_NS ? epoch===0n?'explanatory origin':
      `${(Number(epoch)/1e9).toPrecision(4)} s after the hot Big Bang`:
      readableYears(epoch)+' since the Big Bang';
  if(document.activeElement!==$('date-years'))($('date-years') as HTMLInputElement).value=dateYears(epoch);
  const eraLabel=$('era-label');if(eraLabel){
    const fate=alternateFuture();
    eraLabel.textContent=fate&&fate.stateAt(epoch)!=='ordinary-expansion'?fate.name:era.label;
  }
  const expansion=$('expansion-readout');
  if(expansion){
    const alternate=alternateFuture();
    const bg=cosmicBackgroundAt(epoch),a=safeScaleFactorAt(epoch);
    expansion.textContent=alternate&&alternate.stateAt(epoch)!=='ordinary-expansion'
      ? `${alternate.name}: ${alternate.stateAt(epoch).replaceAll('-',' ')}. Its expansion curve is illustrative, not the baseline ΛCDM model.`
      : epoch===0n?'scale factor a(t) = 0 (the Big Bang)':
      `scale factor a(t) ≈ ${a>=1e6||a<1e-3?a.toExponential(3):fmt(a,6)} (log₁₀ a ≈ ${(bg.lnScaleFactor/Math.LN10).toFixed(2)})`+
      (bg.photonTemperatureK!==null&&epoch<RECOMBINATION_NS?` · photon background ≈ ${bg.photonTemperatureK.toExponential(2)} K`:'');
  }
  for(const btn of document.querySelectorAll<HTMLButtonElement>('#era-track button')){
    btn.classList.toggle('active',btn.dataset.era===era.id);
    const checkpoint=ERA_CHECKPOINTS.find(c=>c.id===btn.dataset.era);
    btn.disabled=!!(checkpoint&&alternateFuture()&&checkpoint.tNs>alternateFuture()!.endDateNs);
  }
  const tierSelect=$('tier-select') as HTMLSelectElement|null;
  if(tierSelect&&tierSelect.value!==tier)tierSelect.value=tier;
  const fineSlider=$('fine-slider') as HTMLInputElement|null;
  if(fineSlider&&document.activeElement!==fineSlider){
    const range=fineRangeForEra(idx);
    fineSlider.disabled=range.hi<=range.lo;
    fineSlider.value=String(Math.round(tToFineFraction(idx,epoch)*1000));
  }
  if(playing&&state.level==='universe')panel();
}
function childAnchor(
  parentState: State,
  childState: State,
): THREE.Vector3 | null {
  if (
    space &&
    (parentState.level === "galaxy" || parentState.level === "sector")
  ) {
    if (childState.ref) return space.world(childState.ref.position);
    if (childState.coords)
      return space.world(childState.coords.map((v) => v * 32 + 16) as V3);
  }
  if (parentState.level === "universe" && childState.galaxy)
    return vec(childState.galaxy.position).multiplyScalar(3);
  if (parentState.level === "galaxy" && childState.coords)
    return vec(childState.coords.map((v) => v * 32 + 16) as V3).multiplyScalar(
      10 / parentState.galaxy!.radiusLy,
    );
  if (parentState.level === "sector" && childState.ref)
    return vec(
      childState.ref.position.map(
        (v, i) => (v - (parentState.coords![i] * 32 + 16)) * 0.5,
      ) as V3,
    );
  if (parentState.level === "system" && childState.body) {
    const id =
      childState.body.kind === "moon"
        ? childState.body.parentId
        : childState.body.id;
    return (
      animations.find((a) => a.body.id === id)?.obj.position.clone() || null
    );
  }
  return null;
}
function depart(next: State, animate: boolean) {
  if (!animate || renderer.xr.isPresenting || next.level === state.level)
    return Promise.resolve();
  const destination = childAnchor(state, next);
  const direction = camera.position.clone().sub(controls.target).normalize();
  const distance = camera.position.distanceTo(controls.target);
  const target = destination || controls.target.clone();
  const end = target
    .clone()
    .addScaledVector(
      direction,
      destination
        ? Math.max(space ? space.scale * 0.4 : 0.65, distance * 0.11)
        : distance * 1.45,
    );
  tween = {
    from: camera.position.clone(),
    to: end,
    targetFrom: controls.target.clone(),
    targetTo: target,
    start: performance.now(),
    duration: 650,
  };
  journey.phase = "approach";
  return new Promise<void>((resolve) => setTimeout(resolve, 660));
}
/** Map the outgoing flight scene into the incoming scene's physical frame.
 * This keeps the approached galaxy/star at the same bearing during the fade. */
function flightBlendTransform(previous:State,next:State,oldSpace:{origin:THREE.Vector3;scale:number}|null,
  oldSystem:{origin:THREE.Vector3;unit:number}|null):THREE.Matrix4|null {
  const translation=(v:THREE.Vector3)=>new THREE.Matrix4().makeTranslation(v.x,v.y,v.z);
  const scaling=(s:number)=>new THREE.Matrix4().makeScale(s,s,s);
  if(previous.level==='universe'&&next.level==='galaxy'&&next.galaxy&&space){
    const g=next.galaxy;
    const inverse=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...g.rotation)).invert();
    return translation(space.origin.clone().multiplyScalar(-space.scale))
      .multiply(scaling(space.scale*LY_PER_MPC/3)).multiply(inverse)
      .multiply(translation(vec(g.position).multiplyScalar(-3)));
  }
  if((previous.level==='galaxy'||previous.level==='sector')&&next.level==='universe'&&previous.galaxy&&oldSpace){
    const g=previous.galaxy;
    const rotation=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...g.rotation));
    return translation(vec(g.position).multiplyScalar(3)).multiply(rotation)
      .multiply(scaling(3/(LY_PER_MPC*oldSpace.scale)))
      .multiply(translation(oldSpace.origin.clone().multiplyScalar(oldSpace.scale)));
  }
  if((previous.level==='galaxy'||previous.level==='sector')&&next.level==='system'&&next.ref&&oldSpace){
    const ratio=LY*systemUnit/oldSpace.scale;
    const offset=oldSpace.origin.clone().sub(vec(next.ref.position)).multiplyScalar(LY)
      .sub(systemOrigin).multiplyScalar(systemUnit);
    return translation(offset).multiply(scaling(ratio));
  }
  if((previous.level==='system'||previous.level==='body')&&
      (next.level==='galaxy'||next.level==='sector')&&previous.ref&&space&&oldSystem){
    const ratio=space.scale/(LY*oldSystem.unit);
    const offset=vec(previous.ref.position).sub(space.origin).add(oldSystem.origin.clone().divideScalar(LY))
      .multiplyScalar(space.scale);
    return translation(offset).multiply(scaling(ratio));
  }
  return null;
}
async function navigate(level: Level, options: Partial<State> = {}) {
  const projectedFate=alternateFuture();
  if(level!=='universe'&&projectedFate&&projectedFate.stateAt(epoch)!=='ordinary-expansion'){
    announce('This alternate fate is represented at universe scale only.');
    return;
  }
  if (!crossing && level === "body") {
    const body = options.body || state.body;
    if (!body) return;
    if (!residentSystem || residentSystem !== (options.sys || state.sys)?.id)
      await navigate("system", { ...options, ref: options.ref || state.ref });
    return focusBody(body);
  }
  if (
    !crossing &&
    level === "system" &&
    state.level === "body" &&
    residentSystem &&
    (!options.ref || options.ref.id === residentSystem)
  )
    return unfocusBody(false);

  if (
    !crossing &&
    space &&
    (level === "galaxy" || level === "sector") &&
    (!options.galaxy || options.galaxy.id === state.galaxy?.id)
  )
    return navigateSpace(level, options);
  const token = ++loadId;
  viewBlend?.finish();
  viewBlend = null;
  const previous = { ...state },
    next = { ...state, ...options, level };
  if (
    (level === "galaxy" && !next.galaxy) ||
    (level === "sector" && (!next.galaxy || !next.coords)) ||
    (level === "system" && !next.ref) ||
    (level === "body" && (!next.body || !next.sys))
  )
    return;
  const blend = frameCount > 0 && !renderer.xr.isPresenting &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const animate = !crossing && blend;
  ready = false;
  playing = false;
  controls.enabled = false;
  journey = {
    ...journey,
    active: true,
    phase: "preparing",
    from: previous.level,
    to: level,
  };
  const departure = depart(next, animate);
  announce(
    "Preparing " +
      (level === "body" ? "planetary preview" : level + " view") +
      "…",
    true,
  );
  try {
    let data: any = null;
    if (level === "universe")
      data = await job("universe-view", { galaxies: catalogue });
    if (level === "galaxy") {
      if (!next.galaxy) return;
      data = await prepare("galaxy:" + next.galaxy.seed, "galaxy-view", {
        galaxy: next.galaxy,
        galaxies: catalogue,
      });
    }
    if (level === "sector") {
      if (!next.galaxy || !next.coords) return;
      data = await job("sector-view", {
        galaxy: next.galaxy,
        coords: next.coords,
        galaxies: catalogue,
      });
    }
    if (level === "system") {
      if (!next.ref) return;
      next.sys = system(next.ref);
      data = await prepare("system:" + next.ref.seed, "system-surfaces", {
        bodies: [...next.sys.planets, ...next.sys.moons],
        galaxy: next.galaxy,
        coords: next.coords,
        ref: next.ref,
        galaxies: catalogue,
      });
    }
    if (level === "body") {
      if (!next.body || !next.sys) return;
      data =
        next.body.kind === "star"
          ? null
          : await job("surface", {
              body: next.body,
              width: 1024,
              segments: 192,
            });
    }
    await departure;
    if (token !== loadId) return;
    const transfer = crossing,
      pose = transfer?.read();
    camera.updateMatrixWorld();
    const oldCameraInverse = camera.matrixWorldInverse.clone(),
      oldRoot = root,
      oldLabels = labels.map((l) => l.el);
    const oldSpace=space?{origin:space.origin.clone(),scale:space.scale}:null;
    const oldSystem=residentSystem?{origin:systemOrigin.clone(),unit:systemUnit}:null;
    if (level === "universe") {
      state = { level };
      region = null;
    } else if (level === "galaxy") {
      state = { level, galaxy: next.galaxy };
      region = null;
    } else if (level === "sector") {
      state = { level, galaxy: next.galaxy, coords: next.coords };
      sectorData = data;
    } else if (level === "system") {
      state = {
        level,
        galaxy: next.galaxy,
        coords: next.coords,
        ref: next.ref,
        sys: next.sys,
      };
    } else state = next;
    if(!state.sys||!state.sys.planets.some(p=>p.id===followedPlanetId))followedPlanetId=null;
    selected = null;
    playing = false;
    clearView(blend);
    if (level === "universe") drawUniverse(data);
    if (level === "galaxy") drawGalaxy(data);
    if (level === "sector") drawSector(data);
    if (level === "system") drawSystem(data);

    if (animate && !renderer.xr.isPresenting) {
      const anchor = childAnchor(state, previous);
      if (anchor) {
        const to = homePos.clone(),
          direction = to.clone().normalize();
        camera.position.copy(
          anchor
            .clone()
            .addScaledVector(
              direction,
              Math.max(space ? space.scale * 4 : 1, to.length() * 0.16),
            ),
        );
        controls.target.copy(anchor);
        camera.lookAt(anchor);
        tween = {
          from: camera.position.clone(),
          to,
          targetFrom: anchor,
          targetTo: new THREE.Vector3(),
          start: performance.now(),
          duration: 700,
        };
      }
    }
    if (transfer && pose) {
      transfer.apply(pose);
      tween = null;
      flight = true;
      controls.enabled = false;
      crossings++;
    }
    breadcrumbs();
    panel();
    persist();
    if (blend) {
      journey.phase = "blend";
      const physicalBlend=transfer&&pose&&!renderer.xr.isPresenting
        ? flightBlendTransform(previous,state,oldSpace,oldSystem):null;
      viewBlend = new ViewBlend(
        scene,
        camera,
        oldRoot,
        root,
        oldCameraInverse,
        renderer.xr.isPresenting,
        oldLabels,
        labels.map((l) => l.el),
        () => disposeView(oldRoot),
        physicalBlend,
      );
    } else {
      ready = true;
      journey.active = false;
      journey.phase = "idle";
      controls.enabled = !renderer.xr.isPresenting && !flight;
    }
    announce(
      level === "universe"
        ? "Seeded catalogue · galaxy symbols enlarged; positions in Mpc"
        : level === "galaxy"
          ? "Galaxy overview · neighbouring galaxies shown in their catalogue directions"
          : level === "sector"
            ? `${fmt(data.total, 0)} actual systems${data.aggregated ? " · representative markers shown" : ""} · brighter stars inside the 32 ly boundary`
            : level === "system"
              ? systemScale === "overview"
                ? "Spaced orbital overview · distances and body sizes adjusted for readability"
                : "Physical scale · true relative distances and radii; use the catalogue to select small worlds"
              : "Shared spherical geography · orbital preview",
    );
  } catch (error) {
    if (token !== loadId) return;
    ready = true;
    journey.active = false;
    journey.phase = "idle";
    controls.enabled = !renderer.xr.isPresenting && !flight;
    fit(homePos.clone());
    announce(String(error));
    console.error(error);
  }
}
/** The main map is a simultaneous-date state view, not a past-light-cone sky.
 * Its catalogue positions are comoving, so a formed galaxy stays addressable
 * even when its light would be highly redshifted for a physical observer. */
function galaxyVisibleAt(g: Galaxy, t: Ns): boolean {
  return galaxyStateAt(galaxyLifecycleFor(g), t).stage === 'active';
}
type EarlySceneStage = 'origin'|'plasma'|'recombination'|'dark-ages'|'first-stars'|null;
function earlySceneStageAt(t:Ns):EarlySceneStage {
  if(t===0n)return 'origin';
  if(t<RECOMBINATION_NS)return 'plasma';
  if(t<1_000_000n*YEAR_NS)return 'recombination';
  if(t<FIRST_STARS_NS)return 'dark-ages';
  if(t<500_000_000n*YEAR_NS)return 'first-stars';
  return null;
}
let priorEraPresentation='';
let primordialSeed='',primordialCohort:readonly PrimordialStar[]=[];
let firstStarFocus:string|null=null;
const primordialGlyphs:{star:PrimordialStar;group:THREE.Group;light:THREE.Sprite}[]=[];
function ensurePrimordialCohort(){
  if(primordialSeed===seed)return;
  primordialSeed=seed;primordialCohort=primordialStars(seed);
}
function firstStarById(id:string|null){ensurePrimordialCohort();return primordialCohort.find(star=>star.id===id);}
function firstStarAtDate(id:string|null,t:Ns):PrimordialStar|undefined {
  const star=firstStarById(id);return star&&star.birthNs<=t&&t<star.deathNs?star:undefined;
}
function primordialPosition(star:PrimordialStar):V3 {
  // A stable comoving proxy near the eventual galaxy; no exact stellar orbit is claimed.
  const galaxy=catalogue.find(g=>g.id===star.descendantGalaxyId);
  const base=galaxy?.position||[0,0,0];
  let hash=2166136261;
  for(const char of star.id)hash=Math.imul(hash^char.charCodeAt(0),16777619);
  const component=(shift:number)=>(((hash>>>shift)&255)/255-.5)*.15;
  return [base[0]+component(0),base[1]+component(8),base[2]+component(16)];
}
function visitFirstStar(star:PrimordialStar){
  firstStarFocus=star.id;selected=star.id;
  if(state.level==='universe'){
    if(flight)toggleFlight();
    const target=vec(primordialPosition(star)).multiplyScalar(3);
    const to=target.clone().add(new THREE.Vector3(.22,.12,.35));
    tween={from:camera.position.clone(),to,targetFrom:controls.target.clone(),targetTo:target,start:performance.now(),duration:1300,logarithmic:false};
    homePos.copy(to);homeTarget.copy(target);
  }
  lastVisibilityEpoch=null;updateUniverseVisibility();panel();persist();
  announce(epoch<star.birthNs?'Following this star toward formation.':epoch>=star.deathNs?'Following an ended first star into its descendant lineage.':'Following this first star through its life.');
}
function leaveFirstStar(){firstStarFocus=null;lastVisibilityEpoch=null;updateUniverseVisibility();panel();persist();}
function updateEarlyUniverseView(){
  const view=$('early-cosmos');
  const field=view.querySelector<HTMLElement>('.early-cosmos-field')!;
  if(field.dataset.seed!==seed){field.style.backgroundImage=illustrativeCmbGradient(seed);field.dataset.seed=seed;}
  const stage=state.level==='universe'?earlySceneStageAt(epoch):null;
  const alternate=state.level==='universe'?alternateFuture():null;
  const fateState=alternate?.stateAt(epoch);
  const future=state.level==='universe'&&!alternate?futureStageAt(epoch):null;
  view.hidden=stage===null;
  view.setAttribute('aria-hidden',stage===null?'true':'false');
  if(stage)view.dataset.stage=stage;
  const presentation=stage?`early:${stage}`:alternate?`alternate:${alternate.id}:${fateState}`:future?`future:${future}`:'normal';
  if(presentation===priorEraPresentation)return;
  priorEraPresentation=presentation;
  if(state.level!=='universe')return;
  if(alternate&&fateState!=='ordinary-expansion'){
    caption('ALTERNATE FATE',alternate.name,
      `${fateState?.replaceAll('-',' ')}. ${alternate.validity}`,
      [[readableYears(epoch),'after Big Bang'],['illustrative','scenario']]);
  }else if(future){
    const descriptions:Record<NonNullable<FutureStage>,[string,string,string]>={
      'stellar-decline':['THE LONG FUTURE','Starlight fades','A continued-expansion scenario. The far-future population is a coarse model.'],
      degenerate:['THE DEGENERATE ERA','Cooling remnants','The individual stellar histories are dim; late populations are illustrative.'],
      'black-hole':['THE BLACK-HOLE ERA','A dilute universe','Black-hole outcomes depend on assumptions about matter stability and evaporation.'],
      ceiling:['HEAT-DEATH SCENARIO','A navigation ceiling','10^100 years is an Atlas limit, not a known final instant of the universe.'],
    };
    const [kicker,title,description]=descriptions[future];
    caption(kicker,title,description,[[readableYears(epoch),'after Big Bang'],['constant Λ','scenario']]);
  }else if(stage===null){
    caption('01 / THE COSMIC NEIGHBOURHOOD','A universe to discover.',
      'Thirty-two galaxies. One seed. Choose a distant glow and explore what lies within.',
      [['32','galaxies'],['4','morphologies'],['20 Mpc','region extent']]);
  }else{
    const descriptions:Record<NonNullable<EarlySceneStage>,[string,string,string]>={
      origin:['THE HOT BIG BANG','An explanatory origin','The model does not resolve a singularity or an explosion centre.'],
      plasma:['THE OPAQUE UNIVERSE','Hot, expanding plasma','Radiation and matter cool as space expands. No ordinary stars or planets exist yet.'],
      recombination:['FIRST LIGHT','The universe becomes transparent','Atoms form and the cosmic microwave background fills the sky. The field is illustrative.'],
      'dark-ages':['THE COSMIC DARK AGES','Before the first stars','Neutral gas fills the expanding universe; density fluctuations grow.'],
      'first-stars':['COSMIC DAWN','The first stars ignite','A procedural early population precedes the surviving reference catalogue.'],
    };
    const [kicker,title,description]=descriptions[stage];
    caption(kicker,title,description,[[readableYears(epoch),'after Big Bang'],['ΛCDM','scenario']]);
  }
  panel();
}
function updateUniverseVisibility() {
  const visibilityMode=`${viewMode}/${futureScenario}`;
  if(lastVisibilityEpoch===epoch&&lastVisibilitySeed===seed&&lastVisibilityMode===visibilityMode)return;
  lastVisibilityEpoch=epoch;lastVisibilitySeed=seed;lastVisibilityMode=visibilityMode;
  const alternate=alternateFuture();
  const illustratedFate=alternate&&alternate.stateAt(epoch)!=='ordinary-expansion';
  const baselineLight=galaxyLightProxyAt(epoch);
  for (let i = 0; i < galaxyGlyphs.length && i < catalogue.length; i++){
    const glyph=galaxyGlyphs[i];
    const g=catalogue[i];
    const observation=viewMode==='observed'
      ? observedGalaxyAt(galaxyLifecycleFor(g),vec(g.position).length(),epoch):null;
    const lightFactor=baselineLight*(observation?.relativeBrightness??1);
    glyph.group.visible = !illustratedFate&&(observation?observation.visible:galaxyVisibleAt(g,epoch));
    if(observation?.visible&&observation.emissionNs!==null){
      const emission=galaxyStateAt(galaxyLifecycleFor(g),observation.emissionNs);
      const a=scaleFactorAt(observation.emissionNs);
      glyph.group.position.set(...emission.properPosition).multiplyScalar(3/Math.max(a,Number.MIN_VALUE));
    }else glyph.group.position.copy(vec(g.position).multiplyScalar(3));
    const points=glyph.visual.children[0] as THREE.Points<THREE.BufferGeometry,THREE.ShaderMaterial>;
    glyph.baseAlpha=.8*Math.max(.12,lightFactor);
    points.material.uniforms.alpha.value=glyph.baseAlpha;
  }
  for(const glyph of primordialGlyphs){
    const {star,group,light}=glyph;
    const alive=star.birthNs<=epoch&&epoch<star.deathNs;
    const tracked=firstStarFocus===star.id;
    group.visible=!illustratedFate&&(alive||tracked);
    const material=light.material as THREE.SpriteMaterial;
    material.opacity=alive?Math.max(.55,star.brightness):.25;
    material.color.set(alive?'#dce7ff':epoch<star.birthNs?'#78a9d3':'#c58e73');
    light.scale.setScalar(tracked?.19:.11);
  }
}
let lastVisibilityEpoch:Ns|null=null,lastVisibilitySeed='',lastVisibilityMode='';
function drawUniverse(data: { galaxyClouds: NamedCloud[] }) {
  camera.near = 1e-7;
  camera.updateProjectionMatrix();
  controls.minDistance = 1e-6;
  for (const g of catalogue) {
    const group = new THREE.Group();
    group.position.copy(vec(g.position).multiplyScalar(3));
    group.rotation.set(...g.rotation);
    const size = (g.radiusLy / LY_PER_MPC) * 3;
    const visual = new THREE.Group();
    group.add(visual);
    visual.add(
      pointCloud(
        data.galaxyClouds.find((c) => c.id === g.id)!,
        size / g.radiusLy,
        0.8,
      ),
    );
    ((visual.children[0] as THREE.Points).material as THREE.ShaderMaterial).uniforms.maxPointSize.value=2.3;
    root.add(group);
    const pick = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(0.06, size), 8, 6),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    group.add(pick);
    galaxyGlyphs.push({group, visual, pick, radius:size, galaxy:g});
    picks.push({ object: pick, id: g.id, kind: "galaxy" });
    addLabel(group, g.name, g.type);
  }
  ensurePrimordialCohort();
  for(const star of primordialCohort){
    const group=new THREE.Group();group.position.copy(vec(primordialPosition(star)).multiplyScalar(3));
    const light=sprite('#dce7ff',.11);group.add(light);
    const pick=new THREE.Mesh(new THREE.SphereGeometry(.08,8,6),new THREE.MeshBasicMaterial({visible:false}));
    group.add(pick);root.add(group);
    primordialGlyphs.push({star,group,light});
    picks.push({object:pick,id:star.id,kind:'primordial-star'});
  }
  lastVisibilityEpoch=null;
  updateUniverseVisibility();
  fit(new THREE.Vector3(13, 13, 24), !ready);
  caption(
    "01 / THE COSMIC NEIGHBOURHOOD",
    "A universe to discover.",
    "Thirty-two galaxies. One seed. Choose a distant glow and explore what lies within.",
    [
      ["32", "galaxies"],
      ["4", "morphologies"],
      ["20 Mpc", "region extent"],
    ],
  );
}
function drawGalaxyNeighbours(
  g: Galaxy,
  clouds: NamedCloud[],
  observer: V3 = [0, 0, 0],
) {
  // The focused view uses the galaxy's local axes. Rotate universe directions
  // into that frame before drawing an effectively infinite-distance sky.
  const inverse = new THREE.Quaternion()
    .setFromEuler(new THREE.Euler(...g.rotation))
    .invert();
  const neighbours = catalogue
    .filter((n) => n.id !== g.id)
    .sort(
      (a, b) =>
        vec(a.position).distanceToSquared(vec(g.position)) -
        vec(b.position).distanceToSquared(vec(g.position)),
    );
  for (const [i, n] of neighbours.entries()) {
    const direction = vec(n.position)
      .sub(vec(g.position))
      .applyQuaternion(inverse)
      .sub(vec(observer).multiplyScalar(1 / 3261563.777));
    const distanceMpc = direction.length();
    const group = new THREE.Group();
    group.position.copy(direction.normalize().multiplyScalar(150));
    group.quaternion
      .copy(inverse)
      .multiply(
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...n.rotation)),
      );
    // Enlarge remote silhouettes for recognition; retain their true directions.
    const radius = THREE.MathUtils.clamp(
      (n.radiusLy / (distanceMpc * 3261563.777)) * 140 * 3,
      0.9,
      3.2,
    );
    const source = clouds.find((c) => c.id === n.id)!;
    const data = { ...source, sizes: source.sizes.map((s) => s * 3) };
    group.add(pointCloud(data, radius / n.radiusLy, 0.5));
    skyAnchor.add(group);
    if (i < 8) {
      group.userData.context = true;
      addLabel(group, n.name, fmt(distanceMpc, 2) + " Mpc away");
    }
  }
  contextStats.galaxies = neighbours.length;
}

function drawGalacticSky(data: ReturnType<typeof overview>, center: V3) {
  const positions: number[] = [],
    colors: number[] = [],
    sizes: number[] = [];
  for (let i = 0; i < data.sizes.length; i++) {
    const offset = new THREE.Vector3(
      data.positions[i * 3] - center[0],
      data.positions[i * 3 + 1] - center[1],
      data.positions[i * 3 + 2] - center[2],
    );
    if (offset.lengthSq() < 128 * 128) continue;
    positions.push(...offset.normalize().multiplyScalar(145).toArray());
    colors.push(
      data.colors[i * 3],
      data.colors[i * 3 + 1],
      data.colors[i * 3 + 2],
    );
    sizes.push(data.sizes[i] * 7);
  }
  const sky = pointCloud(
    {
      positions: new Float32Array(positions),
      colors: new Float32Array(colors),
      sizes: new Float32Array(sizes),
    },
    1,
    0.16,
  );
  skyAnchor.add(sky);
  contextStats.skyPoints = sizes.length;
  const core = new THREE.Object3D();
  core.position.copy(vec(center).negate().normalize().multiplyScalar(140));
  core.userData.context = true;
  skyAnchor.add(core);
  addLabel(
    core,
    state.galaxy!.name + " core",
    fmt(Math.hypot(...center), 0) + " ly away",
  );
}

function makeLocationMap(data?: ReturnType<typeof overview>) {
  const g = state.galaxy!;
  let dots = "",
    x: number,
    y: number,
    subtitle: string;
  if (state.level === "galaxy") {
    // Same physical X/Z positions as the universe catalogue, viewed from above.
    const extent =
      Math.max(
        ...catalogue.flatMap((n) => [
          Math.abs(n.position[0]),
          Math.abs(n.position[2]),
        ]),
      ) * 1.12;
    for (const n of catalogue)
      dots += `<circle cx="${120 + (n.position[0] / extent) * 106}" cy="${74 + (n.position[2] / extent) * 60}" r="2" fill="#728aab"/>`;
    x = 120 + (g.position[0] / extent) * 106;
    y = 74 + (g.position[2] / extent) * 60;
    subtitle = "Your galaxy in the universe · X/Z projection";
  } else {
    const overviewData = data!;
    const extent = Math.max(
      g.radiusLy * 1.3,
      Math.abs(state.coords![0] * 32 + 16),
      Math.abs(state.coords![2] * 32 + 16),
    );
    for (let i = 0; i < overviewData.sizes.length; i += 24)
      dots += `<circle cx="${120 + (overviewData.positions[i * 3] / extent) * 103}" cy="${74 + (overviewData.positions[i * 3 + 2] / extent) * 61}" r="0.7" fill="#8298b3" opacity="0.5"/>`;
    x = 120 + ((state.coords![0] * 32 + 16) / extent) * 103;
    y = 74 + ((state.coords![2] * 32 + 16) / extent) * 61;
    subtitle = "Your sector in " + g.name + " · X/Z projection";
  }
  return `<div class="location-map"><svg viewBox="0 0 240 148" role="img" aria-label="${esc(subtitle)}"><path d="M120 8V140M10 74H230" stroke="#1c3344" stroke-width="0.6"/>${dots}<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="#8fe3df"/><circle cx="${x}" cy="${y}" r="2.6" fill="#c5ffed"/><path d="M${x + 9} ${y}h12" stroke="#8fe3df"/><text x="12" y="17" fill="#98bdc9" font-size="9">YOU ARE HERE</text></svg><p class="subtle">${esc(subtitle)}</p></div>`;
}

function makeSectorLocationMap(refs: SystemRef[], current: SystemRef) {
  const coords = state.coords!,
    stride = Math.max(1, Math.ceil(refs.length / 180));
  const project = (p: V3) => [
    16 + ((p[0] - coords[0] * 32) / 32) * 208,
    14 + ((p[2] - coords[2] * 32) / 32) * 116,
  ];
  let dots = "";
  for (let i = 0; i < refs.length; i += stride) {
    const [x, y] = project(refs[i].position);
    dots += `<circle cx="${x}" cy="${y}" r="1.3" fill="${esc(refs[i].color)}" opacity=".55"/>`;
  }
  const [x, y] = project(current.position),
    title = current.name + " within " + nameSector(coords) + " · X/Z";
  return `<div class="location-map"><svg viewBox="0 0 240 148" role="img" aria-label="${esc(title)}"><path d="M16 14H224V130H16Z" fill="none" stroke="#385e6f"/>${dots}<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="#9affe4"/><circle cx="${x}" cy="${y}" r="2.5" fill="#caffec"/></svg><p class="subtle">${esc(title)}</p></div>`;
}
function contextPanel() {
  return (
    locationMap +
    `<button id="toggle-context" class="context-toggle" aria-pressed="${contextVisible}">${contextVisible ? "Hide" : "Show"} surroundings</button><p class="subtle">${state.level === "galaxy" ? "Every mapped point is an addressable star. The galaxy stays in place as you approach. Remote galaxy silhouettes are enlarged." : state.level === "system" ? `${contextStats.sectorStars} nearby catalogue stars in this sector, plus neighbouring sectors, the parent galaxy and 31 distant galaxies. Sky directions follow this system’s physical position.` : "These stars occupy the same physical galaxy you saw from outside. Nearby stars stream around you as you move; distant mapped stars stay in place."}</p>`
  );
}

function setupSpace(data: any) {
  const g = state.galaxy!;
  const current = new GalaxySpace(
    g,
    data.starMap,
    (c) => job("space-chunk", { galaxy: g, coords: c }),
    (chunk) => {
      if (space !== current || journey.active) return;
      if (
        flight ||
        camera.position.distanceTo(controls.target) < current.scale * 256
      ) {
        const changed =
          state.level !== "sector" ||
          state.coords?.join(",") !== chunk.coords.join(",");
        if (changed) {
          state = { level: "sector", galaxy: g, coords: chunk.coords };
          sectorData = chunk;
          locationMap = makeLocationMap(data.focus || data.sky);
          localCaption();
          breadcrumbs();
          panel();
          persist();
        }
      }
    },
    announce,
    seed,
  );
  space = current;
  root.add(current.group);
  const marker = new THREE.Object3D();
  marker.visible = false;
  root.add(marker);
  addLabel(marker, "");
  spaceSelection = labels[labels.length - 1];
  picks.push(
    { object: current.anchors, id: "map-stars", kind: "catalogue-star" },
    { object: current.nearby, id: "nearby-stars", kind: "catalogue-star" },
  );
  drawGalaxyNeighbours(g, data.galaxyClouds);
  camera.near = current.scale * 0.02;
  camera.updateProjectionMatrix();
  controls.minDistance = current.scale * 0.3;
  controls.maxDistance = 160;
  controls.zoomToCursor = true;
  root.userData.space = true;
  const hud = document.createElement("div");
  hud.id = "flight-hud";
  document.body.append(hud);
}
function drawGalaxy(data: any) {
  setupSpace(data);
  locationMap = makeLocationMap();
  fit(new THREE.Vector3(3, 16, 20));
  caption(
    "02 / " + state.galaxy!.type.toUpperCase() + " GALAXY",
    state.galaxy!.name,
    "Every visible star has a catalogue address. Select one and approach it, or fly through the galaxy.",
    [
      [fmt(state.galaxy!.radiusLy * 2, 0) + " ly", "diameter"],
      [fmt(space!.refs.length, 0), "mapped systems"],
    ],
  );
}
function drawSector(data: any) {
  setupSpace(data);
  sectorData = data;
  space!.seed(data);
  const center = state.coords!.map((v) => v * 32 + 16) as V3;
  space!.rebase(center);
  locationMap = makeLocationMap(data.sky);
  root.userData.viewRadius = space!.scale * 32;
  fit(new THREE.Vector3(0, 8, 24).multiplyScalar(space!.scale));
  localCaption();
}
function localCaption() {
  caption(
    "03 / " + state.galaxy!.name.toUpperCase(),
    "Among the stars",
    "Move through the galaxy. Nearby systems appear at their physical positions as you travel.",
    [
      [fmt(sectorData?.total || 0, 0), "systems in this region"],
      ["W A S D", "fly · Q / E descend / ascend"],
    ],
  );
}
async function navigateSpace(
  level: "galaxy" | "sector",
  options: Partial<State>,
) {
  const current = space!,
    token = ++loadId,
    from = state.level;
  viewBlend?.finish();
  viewBlend = null;
  flight = false;
  flightKeys.clear();
  tween = null;
  ready = false;
  controls.enabled = false;
  journey = { ...journey, active: true, phase: "flight", from, to: level };
  const coords = options.coords || state.coords;
  const physical: V3 =
    level === "galaxy"
      ? [0, 0, 0]
      : options.ref?.position || (coords!.map((v) => v * 32 + 16) as V3);
  const target = current.world(physical),
    to = target
      .clone()
      .add(
        level === "galaxy"
          ? new THREE.Vector3(3, 16, 20)
          : new THREE.Vector3(0, 8, 24).multiplyScalar(current.scale),
      );
  const animate =
    !matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !renderer.xr.isPresenting;
  const duration = animate ? 2400 : 0;
  tween = duration
    ? {
        from: camera.position.clone(),
        to,
        targetFrom: controls.target.clone(),
        targetTo: target,
        start: performance.now(),
        duration,
        logarithmic: true,
      }
    : null;
  const travel = new Promise<void>((r) => setTimeout(r, duration));
  try {
    const chunk =
      level === "sector"
        ? await job("space-chunk", { galaxy: state.galaxy, coords })
        : null;
    if (token !== loadId || space !== current) return;
    if (chunk) current.seed(chunk);
    await travel;
    if (token !== loadId || space !== current) return;
    if (!renderer.xr.isPresenting) {
      camera.position.copy(to);
      controls.target.copy(target);
      camera.lookAt(target);
    }
    tween = null;
    const delta = current.rebase(physical);
    homeTarget.set(0, 0, 0);
    if (!renderer.xr.isPresenting) {
      camera.position.sub(delta);
      controls.target.sub(delta);
      homePos = camera.position.clone();
    } else {
      controls.target.set(0, 0, 0);
      homePos = to.clone().sub(target);
    }
    state =
      level === "galaxy"
        ? { level, galaxy: state.galaxy }
        : { level, galaxy: state.galaxy, coords };
    followedPlanetId=null;
    if (chunk) sectorData = chunk;
    selected = options.ref?.id || null;
    root.userData.viewRadius = level === "galaxy" ? 16 : current.scale * 32;
    if (renderer.xr.isPresenting) vr?.reset();
    locationMap =
      level === "galaxy"
        ? makeLocationMap()
        : makeLocationMap({
            positions: new Float32Array(
              current.refs.flatMap((r) => r.position),
            ),
            colors: new Float32Array(),
            sizes: new Float32Array(current.refs.length),
          });
    if (level === "sector") localCaption();
    else
      caption(
        "02 / GALAXY",
        state.galaxy!.name,
        "Zoom toward any mapped star or fly freely through the galaxy.",
        [],
      );
    breadcrumbs();
    panel();
    persist();
    journey.active = false;
    journey.phase = "idle";
    if (duration) journey.completed++;
    ready = true;
    controls.enabled = !renderer.xr.isPresenting && !flight;
    announce("One continuous galaxy · select a star or use Fly");
  } catch (e) {
    if (token === loadId) {
      tween = null;
      ready = true;
      journey.active = false;
      journey.phase = "idle";
      controls.enabled = !renderer.xr.isPresenting && !flight;
      announce(String(e));
    }
  }
}
let autopilot: {
  kind: "galaxy" | "primordial" | "star" | "body" | "exit";
  id: string;
} | null = null;
function flightUnit() {
  return space ? space.scale : residentSystem ? systemUnit : 3;
}
function localPose(): V3 {
  return space
    ? space.physical(camera.position)
    : residentSystem
      ? (camera.position
          .clone()
          .divideScalar(systemUnit)
          .add(systemOrigin)
          .toArray() as V3)
      : (camera.position.clone().divideScalar(3).toArray() as V3);
}
function finishTravel() {
  crossing = null;
}
async function crossScale(
  level: Level,
  options: Partial<State>,
  read: () => TravelPose,
  apply: (pose: TravelPose) => void,
) {
  if (crossing) return;
  crossing = { read, apply };
  try {
    await navigate(level, options);
  } finally {
    finishTravel();
  }
}
function applyPose(pose: TravelPose) {
  if (space) {
    space.rebase(pose.position.map((v) => Math.floor(v / 32) * 32) as V3);
    camera.position.copy(space.world(pose.position));
  } else if (residentSystem) {
    systemOrigin.set(...pose.position);
    positionSystem();
    camera.position.set(0, 0, 0);
  } else camera.position.copy(vec(pose.position).multiplyScalar(3));
  camera.quaternion.copy(pose.quaternion);
  controls.target
    .copy(camera.position)
    .add(
      camera
        .getWorldDirection(new THREE.Vector3())
        .multiplyScalar(flightUnit()),
    );
}
function toggleFlight() {
  clearWalking();
  surfaceJourney = null; startCruiseAfterLook = false;
  if (renderer.xr.isPresenting) return;
  flight = !flight;
  flightCruise=false;
  updateCameraViewport();
  flightAim = null;
  tween = null;
  flightKeys.clear();
  autopilot = null;
  orbitAssist = null; approachAltitude = null;
  planetLook = null;
  if (flight) {
    if (reliefScale !== 1 && state.body && surfaceMesh && surfaceInfo) {
      reliefScale = 1;
      restartPlanetTiles();
    }
    if (residentSystem) physicalSystem();
    playing = false;
    controls.target
      .copy(camera.position)
      .add(
        camera
          .getWorldDirection(new THREE.Vector3())
          .multiplyScalar(flightUnit()),
      );
  }
  // Free look targets a point one local unit ahead. Keep OrbitControls from
  // pushing the camera backwards to a planet-sized minimum when flight stops.
  if (!flight)
    controls.minDistance = Math.min(controls.minDistance, flightUnit() * 0.1);
  if (!flight) camera.up.set(0,1,0).applyQuaternion(camera.quaternion);
  controls.enabled = !flight;
  panel();
}
function beginTargetFlight() {
  flightCruise=false;
  clearWalking();
  surfaceJourney = null; startCruiseAfterLook = false;
  planetLook = null;
  if (!selected) return;
  const kind = state.level === "universe" ? firstStarById(selected)?"primordial":"galaxy" : space ? "star" : "body";
  if (!flight) toggleFlight();
  orbitAssist = null; approachAltitude = null;
  autopilot = { kind, id: selected };
  if(kind==='galaxy')prewarmGalaxy(selected);
}
function visitDatedStar(id:string){
  const star=space?.findPopulation(id,epoch);
  if(!star||!space)return;
  if(flight)toggleFlight();
  selected=id;space.focusPopulation(id,epoch);
  const target=space.world(star.positionLy);
  const to=target.clone().add(new THREE.Vector3(0,2.5,8).multiplyScalar(space.scale));
  camera.near=Math.max(1e-8,space.scale*.002);camera.updateProjectionMatrix();
  controls.minDistance=space.scale*.05;
  tween={from:camera.position.clone(),to,targetFrom:controls.target.clone(),targetTo:target,
    start:performance.now(),duration:1500,logarithmic:true};
  homePos.copy(to);homeTarget.copy(target);
  panel();persist();
  announce('Visiting a dated stellar population point. No planetary system is resolved for this star.');
}
function flyOutward() {
  clearWalking();
  surfaceJourney = null; startCruiseAfterLook = false;
  planetLook = null;
  if (!flight) toggleFlight();
  orbitAssist = null; approachAltitude = null;
  const domain = space ? "galaxy" : residentSystem ? "system" : "universe";
  const direction = vec(localPose()).normalize();
  if (residentSystem) {
    const p = localPose(),
      near = nearestAtDate(state.sys!, p);
    direction.set(0, p[1] >= near.center[1] ? 1 : -1, 0);
  }
  if (direction.lengthSq() < 0.1) direction.set(0, 1, 0);
  camera.lookAt(camera.position.clone().add(direction));
  controls.target
    .copy(camera.position)
    .addScaledVector(direction, flightUnit());
  autopilot = { kind: "exit", id: domain };
}
function aimedDistance(
  points: { position: V3 }[],
  p: V3,
  direction: THREE.Vector3,
  limit: number,
) {
  let best = limit;
  for (const n of points) {
    const x = n.position[0] - p[0],
      y = n.position[1] - p[1],
      z = n.position[2] - p[2],
      d = Math.hypot(x, y, z),
      along = x * direction.x + y * direction.y + z * direction.z;
    if (d < 0.05) best = Math.min(best, d);
    else if (
      along > 0 &&
      d * d - along * along < Math.max(0.01, d * 0.035) ** 2
    )
      best = Math.min(best, d);
  }
  return best;
}
/** Keep one dated physical clock for wildlife, weather and terrain. A local
 * observer follows the body's orbital translation, as a grounded observer
 * already does, while retaining their exact body-relative pose and heading. */
function updateExplorationClock(dt:number){
  if(!ready||!flight||explorationPaused||playing||renderer.xr.isPresenting)return;
  const body=state.body,sys=state.sys;
  const oldCenter=body&&sys?vec(bodyPosition(body,sys,epoch)):null;
  // A focused world defines the navigation reference frame through orbit,
  // clouds and landing; no orbital-velocity jump at an altitude threshold.
  const attached=!!oldCenter&&!!body&&!!residentSystem;
  const end=alternateFuture()?.endDateNs??UNIVERSE_END_NS;
  const next=advanceDate(epoch,dt);
  const targetDate=next<end?next:end;
  if(body&&sys){
    const entry=lifecycleFor(sys,body);
    if(entry.kind!=='star'&&planetStateAt(entry.lc,entry.starLc,epoch).stage!==planetStateAt(entry.lc,entry.starLc,targetDate).stage){
      // A normal physical tick can also cross a dated existence boundary.
      // Reuse the same explicit hover/fallback rules as timeline seeking.
      seekDate(targetDate);return;
    }
  }
  epoch=targetDate;
  if(epoch===end)explorationPaused=true;
  if(attached&&body&&sys&&oldCenter){
    systemOrigin.add(vec(bodyPosition(body,sys,epoch)).sub(oldCenter));
    positionSystem();
  }
}
function updateFlight(dt: number) {
  flightAlignment=null;
  if (!flight || (!ready&&journey.phase!=='blend') || renderer.xr.isPresenting) return;
  if(residentSystem&&state.body){
    const relative=vec(localPose()).sub(vec(bodyPosition(state.body,state.sys!,epoch))).toArray() as V3;
    const clearance=surfaceClearance(state.body,relative,snappedWaterLevelFor(state.body)).terrainClearance;
    const desired=planetaryRenderUnit(clearance,systemUnit);
    if(desired!==systemUnit){rescaleSystem(desired);rebaseSystem(vec(localPose()));}
    if(systemUnit===1&&camera.position.length()>LOCAL_ORIGIN_RADIUS_M)rebaseSystem(vec(localPose()));
    // Orbit rings are a system-scale visualization baked at construction time;
    // as systemUnit rescales toward true scale for close terrain flight, a
    // ring's near arc can sweep across the view as a stray line over the
    // ground. Hide the rings once terrain-following, matching the same
    // clearance band used for the true-scale rescale above.
    const showOrbits=clearance>=LOCAL_RENDER_EXIT_M;
    for(const orbit of systemOrbits) if(orbit.visible!==showOrbits) orbit.visible=showOrbits;
  }
  if(walker||landing){updateWalking(dt);return;}
  if (surfaceJourney && residentSystem) {
    const body=bodyById(surfaceJourney.bodyId)!, center=vec(bodyPosition(body,state.sys!,epoch));
    const relative=vec(localPose()).sub(center), radius=relative.length(), radial=relative.clone().normalize();
    const angle=radial.angleTo(surfaceJourney.direction);
    const safeHeight=Math.max(80000,body.radiusM*.04);
    const nextRadius=radius+(body.radiusM+safeHeight-radius)*Math.min(1,dt*2);
    if(radius>body.radiusM+30000 && angle>.002) {
      const rotation=new THREE.Quaternion().setFromUnitVectors(radial,surfaceJourney.direction);
      rotation.slerp(new THREE.Quaternion(),1-Math.min(1,dt*.35/angle));
      radial.applyQuaternion(rotation);
      surfaceJourney.up.applyQuaternion(rotation);
    }
    const next=radial.multiplyScalar(nextRadius).add(center);
    flightSpeed=next.distanceTo(vec(localPose()))/Math.max(dt,.001); flightDomain='system';
    camera.position.copy(next.sub(systemOrigin).multiplyScalar(systemUnit));
    camera.up.copy(surfaceJourney.up);
    camera.lookAt(center.clone().sub(systemOrigin).multiplyScalar(systemUnit));
    controls.target.copy(center.clone().sub(systemOrigin).multiplyScalar(systemUnit));
    if(angle<.002 && radius>body.radiusM+30000) {
      surfaceJourney=null; approachAltitude=0; approachClearance=480;
      startCruiseAfterLook=true; autopilot={kind:'body',id:body.id};
    }
    return;
  }
  if (planetLook) {
    planetLook.elapsed += dt;
    const t = Math.min(1, planetLook.elapsed / 1.1), s = t * t * (3 - 2 * t);
    camera.quaternion.slerpQuaternions(planetLook.from, planetLook.to, s);
    controls.target.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(flightUnit()));
    if (t === 1) {
      planetLook = null;
      if (startCruiseAfterLook) {startCruiseAfterLook=false; startTerrainCruise();}
    }
  }
  if (orbitAssist && residentSystem) {
    const body = bodyById(orbitAssist.bodyId)!;
    const center = vec(bodyPosition(body, state.sys!, epoch));
    const relative = vec(localPose()).sub(center);
    const angle = orbitAssist.clearanceM ? dt * 250 * flightThrottle / relative.length() : dt * .045 * flightThrottle;
    orbitStep(relative, camera.quaternion, orbitAssist.axis, angle);
    if (orbitAssist.clearanceM) {
      const ground=surfaceClearance(body,relative.toArray() as V3,snappedWaterLevelFor(body)).terrainElevation;
      relative.setLength(body.radiusM+ground+orbitAssist.clearanceM);
    }
    camera.position.copy(relative.clone().add(center).sub(systemOrigin).multiplyScalar(systemUnit));
    controls.target.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(flightUnit()));
    flightDomain = 'system';
    flightSpeed = angle / Math.max(dt, .00001) * relative.length();
    flightClearance = nearestAtDate(state.sys!, localPose()).clearance;
    return;
  }
  const domain = space ? "galaxy" : residentSystem ? "system" : "universe";
  flightDomain = domain;
  if (autopilot?.kind === "exit" && autopilot.id !== domain) autopilot = null;
  const p = localPose(),
    quaternion = camera.quaternion.clone();
  if (space && !autopilot && flightKeys.has('w')) {
    const heading = camera.getWorldDirection(new THREE.Vector3());
    const ref = space.find(flightAim || selected || '');
    if (ref) {
      const toward = vec(ref.position).sub(vec(p)).normalize();
      if (heading.dot(toward) > Math.cos(.035)) {
        flightAim = ref.id;
        const desired = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(),toward,camera.up));
        camera.quaternion.rotateTowards(desired, dt * .8);
      } else flightAim = null;
    }
  } else flightAim = null;
  let target: V3 | undefined;
  if (autopilot?.kind === "galaxy") {
    if (space && state.galaxy?.id === autopilot.id) {autopilot = null;flightCruise=true;}
    else target = catalogue.find((g) => g.id === autopilot!.id)?.position;
  } else if (autopilot?.kind === "primordial") {
    const star=firstStarById(autopilot.id);
    if(star){target=primordialPosition(star);if(vec(target).distanceTo(vec(p))<.04){autopilot=null;target=undefined;}}
    else autopilot=null;
  } else if (autopilot?.kind === "star") {
    if (residentSystem === autopilot.id) {autopilot = null;flightCruise=true;}
    else target = space?.find(autopilot.id)?.position||space?.findPopulation(autopilot.id,epoch)?.positionLy;
  } else if (autopilot?.kind === "body") {
    const body = bodyById(autopilot.id);
    if (body) {
      target = bodyPosition(body, state.sys!, epoch);
      const relative = p.map((v,i) => v - target![i]) as V3;
      const stopDistance = approachAltitude === null ? body.radiusM * 4.2
        : Math.max(body.radiusM + approachAltitude, surfaceClearance(body, relative, snappedWaterLevelFor(body)).minimum + approachClearance);
      if (Math.hypot(...relative) < stopDistance + 200) {
        if (approachAltitude !== null) {
          const up = vec(relative).normalize();
          const forward = new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion).projectOnPlane(up).normalize().multiplyScalar(.99).addScaledVector(up,-.14).normalize();
          const to = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(), forward, up));
          planetLook = {from: camera.quaternion.clone(), to, elapsed: 0};
        }
        autopilot = null;
        approachAltitude = null;
        if (state.body?.id !== body.id) void focusBody(body, true);
        target = undefined;
      }
    }
  }
  if (target) {
    const delta = vec(target).sub(vec(p));
    camera.lookAt(camera.position.clone().add(delta.normalize()));
    controls.target
      .copy(camera.position)
      .add(
        camera
          .getWorldDirection(new THREE.Vector3())
          .multiplyScalar(flightUnit()),
      );
  }
  const motion = new THREE.Vector3(
    +flightKeys.has("d") - +flightKeys.has("a"),
    +flightKeys.has("e") - +flightKeys.has("q"),
    +flightKeys.has("s") - +(flightKeys.has("w") || !!autopilot || flightCruise),
  );
  const direction = motion.lengthSq()
    ? motion.clone().normalize().applyQuaternion(camera.quaternion)
    : camera.getWorldDirection(new THREE.Vector3());
  let clearance = 1,
    nearest: any = null;
  if (domain === "universe") {
    nearest = catalogue.filter(g=>galaxyVisibleAt(g,epoch))
      .map((g) => ({ g, d: vec(g.position).distanceTo(vec(p)) }))
      .sort((a, b) => a.d - b.d)[0];
    clearance = nearest?.d??1;
    const g = nearest?.g as Galaxy|undefined;
    if (g&&nearest.d < (g.radiusLy / LY_PER_MPC) * 64)
      void prepare("galaxy:" + g.seed, "galaxy-view", {
        galaxy: g,
        galaxies: catalogue,
      }).catch(() => {});
    if (g&&nearest.d < (g.radiusLy / LY_PER_MPC) * GALAXY_ENTRY_RADII) {
      const inverse = new THREE.Quaternion()
        .setFromEuler(new THREE.Euler(...g.rotation))
        .invert();
      void crossScale(
        "galaxy",
        { galaxy: g },
        () => ({
          position: vec(localPose())
            .sub(vec(g.position))
            .applyQuaternion(inverse)
            .multiplyScalar(LY_PER_MPC)
            .toArray() as V3,
          quaternion: inverse.clone().multiply(camera.quaternion),
        }),
        applyPose,
      );
      return;
    }
  } else if (space) {
    const g = state.galaxy!;
    clearance = target
      ? vec(target).distanceTo(vec(p))
      : aimedDistance(
          [...space.refs, ...space.nearbyRefs],
          p,
          direction,
          g.radiusLy * 0.5,
        );
    let closest: any = null;
    for (const ref of [...space.refs, ...space.nearbyRefs]) {
      const d = vec(ref.position).distanceTo(vec(p));
      if (!closest || d < closest.d) closest = { ref, d };
    }
    if (closest) {
      // The old fixed 0.02 ly near plane erased stars before the 300 AU entry
      // boundary. Keep the point visible all the way into its system.
      camera.near = space.scale * Math.max(1e-9, Math.min(.02, closest.d * .015));
      camera.updateProjectionMatrix();
      // Always bound a step by the nearest physical destination, including
      // outside the narrow aiming cone. Boost can no longer skip a system.
      if (closest.d < SYSTEM_PREPARE_LY) clearance = Math.min(clearance, Math.max(closest.d, 1e-9));
    }
    if (closest && closest.d < SYSTEM_PREPARE_LY) {
      const ref = closest.ref as SystemRef,
        sys = system(ref),
        coords = ref.cell.map((v) => Math.floor(v / 8)) as V3;
      void prepare("system:" + ref.seed, "system-surfaces", {
        bodies: [...sys.planets, ...sys.moons],
        galaxy: g,
        coords,
        ref,
        galaxies: catalogue,
      }).catch(() => {});
      if (closest.d < systemBoundary(sys) / LY) {
        systemScale = "physical";
        void crossScale(
          "system",
          { ref, coords },
          () => ({
            position: vec(localPose())
              .sub(vec(ref.position))
              .multiplyScalar(LY)
              .toArray() as V3,
            quaternion: camera.quaternion.clone(),
          }),
          applyPose,
        );
        return;
      }
    }
    if (vec(p).length() > g.radiusLy * GALAXY_EXIT_RADII) {
      const rotation = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(...g.rotation),
      );
      void crossScale(
        "universe",
        {},
        () => ({
          position: vec(localPose())
            .divideScalar(LY_PER_MPC)
            .applyQuaternion(rotation)
            .add(vec(g.position))
            .toArray() as V3,
          quaternion: rotation.clone().multiply(camera.quaternion),
        }),
        applyPose,
      );
      return;
    }
  } else if (residentSystem) {
    const sys = state.sys!;
    nearest = nearestAtDate(sys, p);
    clearance = nearest.clearance;
    // Prepare ground contact while still flying. Descending onto solid dry
    // ground hands off to the existing walker; hovering never forces landing.
    if(!autopilot&&!orbitAssist&&state.body?.id===nearest.body.id&&planetTiles&&
      nearest.body.kind!=='star'&&nearest.body.type!=='Gas giant'){
      const relative=vec(p).sub(vec(nearest.center)),radial=relative.clone().normalize();
      const surface=surfaceSample(nearest.body,radial.toArray() as V3);
      const descending=motion.lengthSq()>0&&direction.dot(radial)<-.15;
      if(surface?.walkable&&nearest.terrainClearance<PLANET_DETAIL.touchdownPrepareM){
        planetTiles.setContactFocus(radial.multiplyScalar(nearest.body.radiusM+surface.rockHeightM+.92).toArray() as V3);
        if(descending&&nearest.terrainClearance<FLIGHT_EYE_CLEARANCE_M+.12){
          flightCruise=false;void prepareLanding(undefined,true);return;
        }
      }else planetTiles.setContactFocus(null);
    }
    if (approachAltitude !== null && target) {
      const body = bodyById(autopilot!.id)!;
      const stop = Math.max(body.radiusM + approachAltitude,
        surfaceClearance(body, p.map((v,i) => v - target![i]) as V3, snappedWaterLevelFor(body)).minimum + approachClearance);
      clearance = Math.min(clearance, Math.max(0, vec(p).distanceTo(vec(target)) - stop));
    }
    if (vec(p).length() > systemBoundary(sys) * 2) {
      const ref = sys.ref;
      void crossScale(
        "galaxy",
        { galaxy: state.galaxy },
        () => ({
          position: vec(localPose())
            .divideScalar(LY)
            .add(vec(ref.position))
            .toArray() as V3,
          quaternion: camera.quaternion.clone(),
        }),
        applyPose,
      );
      return;
    }
    if ((state.level !== "body" || state.body?.id !== nearest.body.id) && nearest.distance < nearest.body.radiusM * 12)
      void focusBody(nearest.body, true);
    else if (
      state.level === "body" &&
      vec(p).distanceTo(vec(bodyPosition(state.body!, sys, epoch))) >
        state.body!.radiusM * 30
    )
      unfocusBody(true);
  }
  flightClearance = clearance;
  flightSpeed =
    automaticSpeed(domain, clearance) *
    flightThrottle *
    (flightKeys.has("shift") ? 8 : 1);
  // Boost remains controllable in metre-scale low flight.
  if(domain==='system'&&nearest?.body.kind!=='star'&&nearest?.body.type!=='Gas giant')
    flightSpeed=Math.min(flightSpeed,Math.max(2,clearance*2));
  if (motion.lengthSq()) {
    let step = Math.min(
      flightSpeed * dt,
      Math.max(clearance, domain === "system" ? 1000 : 0.0000001) * 0.24,
    );
    if (space) {
      // Swept proximity check: a fast frame must not tunnel past a system
      // before the next frame can prepare it and change coordinate scale.
      for (const ref of [...space.refs,...space.nearbyRefs]) {
        const delta=vec(ref.position).sub(vec(p)), along=delta.dot(direction);
        step=sweptStarStep(step,along,delta.lengthSq()-along*along);
      }
    }
    if(residentSystem&&nearest&&nearest.body.kind!=='star'&&nearest.body.type!=='Gas giant'&&nearest.terrainClearance<100000){
      const body=nearest.body as Body;
      lastFlightSweep=sweptTerrainStep(vec(p).sub(vec(nearest.center)).toArray() as V3,
        direction.toArray() as V3,step,nearest.terrainClearance,body.radiusM,
        d=>surfaceSample(body,d)?.visibleHeightM??surfaceClearance(body,vec(d).multiplyScalar(body.radiusM).toArray() as V3,snappedWaterLevelFor(body)).terrainElevation);
      step=lastFlightSweep.distanceM;
      flightSpeed=step/Math.max(dt,1e-6);
    }
    motion
      .normalize()
      .applyQuaternion(camera.quaternion)
      .multiplyScalar(step * flightUnit());
    camera.position.add(motion);
    controls.target.add(motion);
    if (residentSystem) {
      const near = nearestAtDate(state.sys!, localPose()),
        minimum = near.minimum;
      if (near.distance < minimum) {
        const safe = vec(localPose()).sub(vec(near.center));
        if (safe.lengthSq() < 1) safe.set(0, 1, 0);
        safe.normalize().multiplyScalar(minimum).add(vec(near.center));
        const corrected = safe.sub(systemOrigin).multiplyScalar(systemUnit);
        controls.target.add(corrected.clone().sub(camera.position));
        camera.position.copy(corrected);
      }
      if (
        camera.position.length() >
        (systemUnit===1?LOCAL_ORIGIN_RADIUS_M:Math.max(focusRadius() * 100, systemUnit * 1e8))
      ) {
        const center = vec(localPose());
        rebaseSystem(center);
      }
    }
  }
  if(horizonAssist&&residentSystem&&!autopilot&&!planetLook){
    const near=nearestAtDate(state.sys!,localPose()),depth=atmosphereHeightM(near.body);
    const altitude=near.distance-near.body.radiusM;
    if(depth>0&&altitude<depth){
      const radial=vec(localPose()).sub(vec(near.center)).normalize();
      flightAlignment={bodyId:near.body.id,altitudeM:altitude,...alignPlanetaryDown(camera.quaternion,radial,altitude,depth,dt)};
      controls.target.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(flightUnit()));
    }
  }
}
function updateFlightHud() {
  let hud = document.getElementById("flight-hud");
  if (!hud) {
    hud = document.createElement("div");
    hud.id = "flight-hud";
    document.body.append(hud);
  }
  const unit =
    flightDomain === "universe"
      ? "Mpc/s"
      : flightDomain === "galaxy"
        ? "ly/s"
        : flightSpeed > AU * 0.01
          ? "AU/s"
          : flightSpeed < 1000 ? 'm/s' : "km/s";
  const rate =
    flightDomain === "system"
      ? flightSpeed / (unit === "AU/s" ? AU : unit==='m/s'?1:1000)
      : flightSpeed;
  hud.textContent = flight
    ? `${flightDomain.toUpperCase()} · ${fmt(rate, 3)} ${unit} · auto speed ×${fmt(flightThrottle, 2)}${autopilot ? " · travelling to selection" : ""}`
    : "Fly at any scale · select a destination or use WASD";
  let reticle = document.getElementById('flight-reticle');
  if (!reticle) {reticle=document.createElement('div');reticle.id='flight-reticle';reticle.textContent='+';document.body.append(reticle);}
  reticle.hidden = !flight || renderer.xr.isPresenting;
  if (flightAim) hud.textContent += ' · selected star aligned';
  if (residentSystem && state.body) {
    const body = state.body, center = bodyPosition(body, state.sys!, epoch);
    const relative = localPose().map((v,i) => v - center[i]) as V3;
    const info = surfaceClearance(body, relative, snappedWaterLevelFor(body));
    const latitude = Math.asin(THREE.MathUtils.clamp(relative[1] / Math.hypot(...relative), -1, 1)) * 180 / Math.PI;
    hud.textContent += ` · altitude ${fmt(info.altitude / 1000, 1)} km · clearance ${fmt(info.terrainClearance / 1000, 1)} km · latitude ${fmt(latitude, 1)}°${orbitAssist?.clearanceM ? ' · terrain following' : orbitAssist ? ' · orbit assist' : ''}`;
    if(flight && body.kind!=='star' && body.type!=='Gas giant') {
      const low=info.terrainClearance<PlanetRenderer.lowFlightClearanceM(body), label=walker?'06 / ON FOOT':landing?'06 / LANDING':low?'05 / TERRAIN FLIGHT':'05 / PLANETARY ORBIT';
      if($('view-kicker').textContent!==label){$('view-kicker').textContent=label;$('view-description').textContent=low?'Flying over this world. Drag to look, use WASD to steer, and the wheel to adjust speed.':'Your planet, moons and star system remain connected. Fly toward a destination or choose a terrain site.';}
    }
  }
  document.body.classList.toggle('walking',!!walker||!!landing);
  if(walker){hud.textContent=`ON FOOT · ${fmt(walker.speed,1)} m/s · ${walker.waiting?'preparing nearby ground':walker.grounded?'grounded':'airborne'} · WASD move · Shift run · Space jump`;$('view-description').textContent='Walk across this world. Drag to look, hold Shift to run, and press Space to jump.';}
  else if(landing)hud.textContent=landing.launch?'TAKING OFF · returning to free flight':'LANDING · refining nearby ground and preparing collision';
}

function approachPlanet(altitude: number) {
  clearWalking();
  surfaceJourney = null; startCruiseAfterLook = false; approachClearance=3000;
  planetLook = null;
  if (!state.body || renderer.xr.isPresenting) return;
  if (!flight) toggleFlight();
  orbitAssist = null;
  approachAltitude = altitude;
  autopilot = {kind: 'body', id: state.body.id};
}
/** Starts a surface journey; true only when one was started, so a caller may
 * arm landAfterCruise. False = no site (announced), nothing to land on. */
function exploreTerrain(preferred?:THREE.Vector3,preferLife=false):boolean {
  const body=state.body;
  if(!body || body.kind==='star' || body.type==='Gas giant' || renderer.xr.isPresenting) return false;
  clearWalking();
  if(!flight) toggleFlight();
  autopilot=null; orbitAssist=null; planetLook=null; startCruiseAfterLook=false;
  const center=vec(bodyPosition(body,state.sys!,epoch)), eye=vec(localPose()).sub(center).normalize();
  const sample=landingSurfaceFor(body), sun=vec(bodyPosition(state.sys!.stars[0],state.sys!,epoch)).sub(center).normalize();
  const lifeEntry=lifecycleFor(state.sys!,body);
  if(lifeEntry.kind!=='star')sun.set(...spinCompensatedSunDirection(sun.toArray() as V3,spinFor(body),lifeEntry.lc.formationNs,epoch));
  if(!sample([0,1,0],epoch)){announce('This world has no surface at this date.');return false;}
  const biome=preferLife?biomeClassifier(body,snappedWaterLevelFor(body)):null;
  // render-bounds-1 + landing-site-1: heights are judged over the dated sea,
  // against the body's own bound (80%, the kept ceiling), strictly below the
  // p99 land summit height (landing-site.ts: never on a summit) and with its
  // p90 land as the full elevation bonus. Candidate heights come from the
  // level-0 field (landingSurfaceFor), the representation of these percentiles.
  const landSea=body.water?snappedWaterLevelFor(body):0,landCeiling=PlanetRenderer.landingCeilingM(body),landRef=PlanetRenderer.landingReferenceM(body,landSea);
  const landSummit=landPercentileM(body,LANDING_SUMMIT_PERCENTILE,landSea);
  let destination=eye.clone(), best=-Infinity;
  if(preferred)destination.copy(preferred);
  else if(!preferLife){
    const site=pickLandingSite({height:d=>{const s=sample(d,epoch);return s&&s.walkable?s.groundHeightM:null;},eye:eye.toArray() as V3,sun:sun.toArray() as V3,seaLevelM:landSea,ceilingM:landCeiling,summitM:landSummit,referenceM:landRef});
    // landing-site-1: no eligible site (all wet / summit-capped) ends the
    // request here: no journey toward the unchecked eye direction.
    if(!site){announce(NO_LANDING_SITE_MESSAGE);panel();return false;}
    destination=new THREE.Vector3(...site.direction);
  }
  else for(let i=0;i<1024;i++) {
    const d=new THREE.Vector3(...landingCandidate(i,1024)), s=sample(d.toArray() as V3,epoch);
    if(!s || !s.walkable || !landingHeightAllowed(s.groundHeightM,landSea,landCeiling,landSummit))continue;
    const habitat=biome?.(d.toArray() as V3,s.groundHeightM,1);
    if(!habitat||habitat.weights[1]<.35||habitat.moisture<.2||d.dot(sun)<.25)continue;
    const score=habitat.weights[1]*3+habitat.moisture+(habitat.forestPotential?.5:0)+d.dot(eye)*.3+Math.max(-.5,d.dot(sun))*.2;
    if(score>best){best=score;destination=d;}
  }
  if(preferLife&&best===-Infinity){announce('No suitable living habitat was found on this world at this date.');return false;}
  const up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion).projectOnPlane(eye);
  if(up.lengthSq()<.0001)up.set(1,0,0).applyQuaternion(camera.quaternion).projectOnPlane(eye);
  surfaceJourney={bodyId:body.id,direction:destination,up:up.normalize()};
  announce(preferLife?'Approaching a living habitat. Vegetation and wildlife stream during low flight.':'Approaching a terrain site, then flying 600 m above the ground. Movement keys release assistance.');
  return true;
}
function startTerrainCruise() {
  const body=state.body!;
  const radial=vec(localPose()).sub(vec(bodyPosition(body,state.sys!,epoch))).normalize();
  const tangent=camera.getWorldDirection(new THREE.Vector3()).projectOnPlane(radial);
  if(tangent.lengthSq()<.0001)tangent.set(0,1,0).applyQuaternion(camera.quaternion).projectOnPlane(radial);
  orbitAssist={bodyId:body.id,axis:new THREE.Vector3().crossVectors(radial,tangent.normalize()).normalize(),clearanceM:600};
  if(landAfterCruise){landAfterCruise=false;void prepareLanding();}
  panel();
}
async function prepareLanding(savedPoint?:V3,contact=false,savedHeading?:THREE.Quaternion){
  const body=state.body;
  if(!body||body.kind==='star'||body.type==='Gas giant'||renderer.xr.isPresenting)return;
  // §2.6 existence gate: `walkable` above only reflects the immutable rock
  // field, not lifecycle stage, so without this a planet that is `engulfed`
  // by its star's giant phase -- or hasn't formed yet at this epoch -- could
  // still be landed on. Refuse before any state is torn down (toggleFlight/
  // clearWalking below), so a refused request (including a restored ?walk=
  // bookmark) is a clean no-op rather than leaving anything mid-teardown.
  const lcEntry=lifecycleFor(state.sys!,body);
  if(lcEntry.kind!=='star'){
    const stage=planetStateAt(lcEntry.lc,lcEntry.starLc,epoch).stage;
    if(stage!=='solid'){
      announce(stage==='engulfed'
        ?'This world has been engulfed by its star at this date — landing is not possible.'
        :'This world is not yet solid ground at this date — landing is not possible.');
      panel();
      return;
    }
  }
  if(!flight)toggleFlight();
  clearWalking();autopilot=null;orbitAssist=null;surfaceJourney=null;planetLook=null;playing=false;
  const relative=savedPoint?vec(savedPoint):vec(localPose()).sub(vec(bodyPosition(body,state.sys!,epoch)));
  const d=relative.normalize(),s=surfaceSample(body,d.toArray() as V3);
  if(!s){announce('This world has no surface at this date — landing is not possible.');panel();return;}
  if(!s.walkable&&savedPoint){
    // landing-site-1: a restored ground bookmark whose site is now under water
    // resolves by FLOODED_GROUND_BOOKMARK (OPEN owner item; default: keep the
    // saved place and hover above the water). Never the terrain search from
    // the orbit camera, which landed somewhere unrelated.
    const flooded=resolveGroundBookmark(d.toArray() as V3,q=>{const t=surfaceSample(body,q);return {walkable:!!t?.walkable,visibleHeightM:t?.visibleHeightM??s.visibleHeightM};},body.radiusM);
    if(flooded.kind==='shore'){void prepareLanding(vec(flooded.direction).multiplyScalar(body.radiusM).toArray() as V3,contact,savedHeading);return;}
    if(flooded.kind==='hover'){
      rebaseSystem(vec(flooded.direction).multiplyScalar(body.radiusM+flooded.eyeHeightM).add(vec(bodyPosition(body,state.sys!,epoch))));camera.position.set(0,0,0);
      if(savedHeading)camera.quaternion.copy(savedHeading);
      announce('This ground bookmark is now under water at this date. Hovering above the water at the saved place.');panel();return;
    }
  }
  if(!s.walkable){if(exploreTerrain())landAfterCruise=true;return;}
  const point=d.multiplyScalar(body.radiusM+s.rockHeightM+.92).toArray() as V3;
  if(savedPoint){
    // A restored surface address starts above that ground, not at the orbit
    // viewer's initial camera. Wait here for the same contact tiles as landing.
    const eye=vec(point).setLength(vec(point).length()+12).add(vec(bodyPosition(body,state.sys!,epoch)));
    rebaseSystem(eye);camera.position.set(0,0,0);
  }
  landing={point,contact,heading:savedHeading?.clone()};planetTiles?.setContactFocus(point);panel();
  const token=walkGeneration;
  announce('Preparing ground for landing. The scene stays visible while nearby terrain refines.');
  try{const mod=await import('./ground-walker.ts');await mod.initWalking();if(token===walkGeneration)walkingModule=mod;}
  catch(error){if(token===walkGeneration){clearWalking();announce('Walking could not start: '+String(error));panel();}}
}
function landOnWorld(){
  if(!state.body)return;
  const info=surfaceClearance(state.body,vec(localPose()).sub(vec(bodyPosition(state.body,state.sys!,epoch))).toArray() as V3,snappedWaterLevelFor(state.body));
  if(info.terrainClearance<PlanetRenderer.lowFlightClearanceM(state.body))void prepareLanding();
  else if(exploreTerrain())landAfterCruise=true;
}
function takeoffWalk(){
  if(!state.body)return;
  const relative=vec(localPose()).sub(vec(bodyPosition(state.body,state.sys!,epoch)));
  clearWalking();landing={point:relative.toArray() as V3,launch:true};panel();
}
function updateWalking(dt:number){
  if(!state.body||!planetTiles)return;
  const body=state.body,center=vec(bodyPosition(body,state.sys!,epoch));
  if(walker){
    planetTiles.setContactFocus(walker.position.toArray() as V3);
    walker.update(dt,camera.quaternion,flightKeys,(p,o)=>planetTiles!.contactPatches(p,o));
    const eye=vec(walker.eye()).add(center);
    if(eye.distanceTo(systemOrigin)>128)rebaseSystem(eye);
    camera.position.copy(eye.sub(systemOrigin).multiplyScalar(systemUnit));flightSpeed=walker.speed;
  }else if(landing){
    const point=vec(landing.point),d=point.clone().normalize(),current=vec(localPose()).sub(center);
    const patches=landing.launch?null:planetTiles.contactPatches(landing.point,landing.point);
    const launchSurface=landing.launch?surfaceSample(body,d.toArray() as V3):null;
    if(landing.launch&&!launchSurface){clearWalking();return;}
    const target=landing.launch?body.radiusM+launchSurface!.rockHeightM+(landing.clearanceM??160):point.length()+(patches&&walkingModule? .72:landing.contact?Math.max(.72,current.length()-point.length()):12);
    const gap=target-current.length(),step=Math.sign(gap)*Math.min(Math.abs(gap),Math.max(.5,Math.min(5000,Math.abs(gap)*2))*dt);
    const next=d.multiplyScalar(current.length()+step).add(center);
    if(next.distanceTo(systemOrigin)>128)rebaseSystem(next);
    camera.position.copy(next.sub(systemOrigin).multiplyScalar(systemUnit));flightSpeed=Math.abs(step)/Math.max(dt,.001);
    if(landing.launch&&Math.abs(gap)<.2){landing=null;planetTiles.setContactFocus(null);announce('Free flight · WASD to move, Q/E to descend or climb.');panel();}
    else if(!landing.launch&&patches&&walkingModule&&Math.abs(gap)<.1){
      const snapshot=planetSnapshotFor(state.sys!,body,epoch);
      if(snapshot.state.stage!=='solid'){clearWalking();return;}
      const walkerSurface=(direction:V3,date:Ns=epoch)=>{
        const result=planetSnapshotFor(state.sys!,body,date).surface(direction);
        if(!result)throw new Error('GroundWalker queried a surface outside the solid epoch');
        return result;
      };
      const preserveHeading=landing.contact,savedHeading=landing.heading;
      walker=new walkingModule.GroundWalker(body,landing.point,walkerSurface as ReturnType<typeof surfaceQuery>,epoch);landing=null;
      const up=walker.position.clone().normalize();
      camera.up.copy(up);
      // A restored ?walk=&heading= address reproduces the saved view exactly.
      if(savedHeading)camera.quaternion.copy(savedHeading);
      else if(!preserveHeading)camera.lookAt(camera.position.clone().add(levelForward(camera.quaternion,up)));
      announce('Walking · WASD move · Shift run · Space jump · Return to flight to take off.');panel();persist();
    }
  }
  camera.near=.03*systemUnit;camera.updateProjectionMatrix();
  controls.target.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(systemUnit));
  flightDomain='surface';
}
function holdPlanetOrbit() {
  if (!state.body || renderer.xr.isPresenting) return;
  if (orbitAssist) { orbitAssist = null; panel(); return; }
  if (!flight) toggleFlight();
  autopilot = null; approachAltitude = null;
  planetLook = null;
  const center = vec(bodyPosition(state.body, state.sys!, epoch));
  const relative = vec(localPose()).sub(center);
  // Keep the entire assisted circle above the body's height bound (render-bounds-1).
  const safeRadius = PlanetRenderer.safeOrbitRadiusM(state.body);
  if (relative.length() < safeRadius) {
    announce('Climb above the highest terrain before holding orbit.');
    return;
  }
  const radial = relative.clone().normalize();
  const tangent = new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion).projectOnPlane(radial);
  if (tangent.lengthSq() < .0001) tangent.set(1,0,0).applyQuaternion(camera.quaternion).projectOnPlane(radial);
  orbitAssist = {bodyId: state.body.id, axis: new THREE.Vector3().crossVectors(radial, tangent.normalize()).normalize()};
  panel();
}
function restartPlanetTiles() {
  planetTiles?.dispose(); planetTiles = null;
  if (!state.body || !surfaceMesh || state.body.type === 'Gas giant') return;
  const entry=lifecycleFor(state.sys!,state.body);
  if(entry.kind!=='star'&&planetStateAt(entry.lc,entry.starLc,epoch).stage!=='solid')return;
  // Anisotropic filtering was capped at 4x, well below what desktop/laptop
  // GPUs support (typically 16x): the ground colour map and detail atlas both
  // undersampled at grazing/orbital view angles, showing as jagged coastlines
  // from orbit and blurry ground texture up close. Raised to 8x, a
  // conservative step up in cost for a clear filtering improvement.
  planetTiles = new PlanetRenderer(state.body, surfaceMesh, focusRadius(), reliefScale,Math.min(8,renderer.capabilities.getMaxAnisotropy()));
  planetTiles.setSurfaceDetail(surfaceDetail);
  planetTiles.setRenderQuality(RENDER_QUALITY[effectiveQuality()]);
}
const SPIN_Y_AXIS = new THREE.Vector3(0, 1, 0), SPIN_X_AXIS = new THREE.Vector3(1, 0, 0);
/** Contract §4.4: the sun direction seen from a spinning body's surface must
 * follow its rotation. The terrain mesh and the ground-walker's frame are
 * never themselves rotated (that would risk desynchronising walker physics
 * and terrain sampling, which read this same mesh's untouched local frame),
 * so instead the incoming light direction is counter-rotated by the body's
 * current spin angle and axial tilt — mathematically equivalent to rotating
 * the body under a fixed sun, using the exact convention documented on
 * `dayNightAt` (unrotated polar axis +Y, spin about Y then tilt about X). */
function spinCompensatedSunDirection(rawSun: V3, spin: SpinState, formationNs: Ns, t: Ns): V3 {
  const angle = rotationAngleAt(spin, formationNs, t);
  const v = new THREE.Vector3(...rawSun);
  v.applyAxisAngle(SPIN_X_AXIS, -spin.axialTiltRad);
  v.applyAxisAngle(SPIN_Y_AXIS, -angle);
  return v.toArray() as V3;
}
function updatePlanetTiles(dt: number) {
  if (!planetTiles || !surfaceMesh) {surfaceLighting.disable();forestAssetAttachment.update(null,detailedForestEnabled&&!renderer.xr.isPresenting);return;}
  root.updateMatrixWorld(true);
  const eye = renderer.xr.isPresenting ? renderer.xr.getCamera().getWorldPosition(new THREE.Vector3()) : camera.position.clone();
  const local = planetTiles.group.worldToLocal(eye.clone()).toArray() as V3;
  const rawSun = vec(bodyPosition(state.sys!.stars[0], state.sys!, epoch))
    .sub(vec(bodyPosition(state.body!, state.sys!, epoch))).normalize().toArray() as V3;
  const bodyEntry = lifecycleFor(state.sys!, state.body!);
  const sun = bodyEntry.kind === 'star' ? rawSun
    : spinCompensatedSunDirection(rawSun, spinFor(state.body!), bodyEntry.lc.formationNs, epoch);
  // Keep terrain sunlight in the same frame as water and foliage, including
  // after date seeking, planetary rebasing and VR model rotation.
  const worldSun=vec(sun).transformDirection(planetTiles.group.matrixWorld);
  light.target.position.copy(eye);
  light.position.copy(eye).addScaledVector(worldSun,12);
  light.target.updateMatrixWorld();light.updateMatrixWorld();
  const center=bodyPosition(state.body!,state.sys!,epoch);
  const clearance=surfaceClearance(state.body!,localPose().map((v,i)=>v-center[i]) as V3,snappedWaterLevelFor(state.body!));
  // Prefetch before the near forest appears. Retain the adopted family while
  // climbing, and release its GPU resources when leaving this planet or opting out.
  const forestAttached=forestAssetAttachment.diagnostics();
  const forestTarget=clearance.terrainClearance<6000||forestAttached.ready||forestAttached.loading?planetTiles:null;
  forestAssetAttachment.update(forestTarget,detailedForestEnabled&&!renderer.xr.isPresenting);
  const shadowFrustum=surfaceLighting.update({planet:planetTiles.group,radiusM:state.body!.radiusM,
    eye,sun:worldSun,altitudeM:clearance.terrainClearance,atmosphere:state.body!.water>0,
    enabled:surfaceLightingEnabled&&reliefScale===1,immersive:renderer.xr.isPresenting});
  // Descending through ~700 m switches the sun's shadow on, which changes the
  // program of every lit material. Compile the shadowed variants of the
  // planet renderer's own lit materials in the 700-2500 m band beforehand.
  if(!light.castShadow&&!renderer.xr.isPresenting&&surfaceLightingEnabled&&reliefScale===1&&clearance.terrainClearance<2500)
    shadowWarmup.warm(planetTiles.shadowWarmupObjects(),camera,scene);
  const views = renderer.xr.isPresenting ? renderer.xr.getCamera().cameras : [camera];
  const frusta = views.map(view => {
    view.updateMatrixWorld();
    return new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(view.projectionMatrix, view.matrixWorldInverse).multiply(planetTiles!.group.matrixWorld));
  });
  // Global sea level (contract §2.5/§2.6): a star has no water key set, so it
  // stays pinned at 0 like every other body before its ocean forms; a
  // planet/moon resolves it from the SAME lifecycle pair `prepareLanding`
  // already uses (`bodyEntry.lc`/`bodyEntry.starLc`), never a fresh query.
  const waterLevelM = waterLevelFor(state.body!);
  planetTiles.update(local, innerHeight, camera.fov, dt, renderer.xr.isPresenting, sun, frusta, epoch, lifeGateContext(state.sys!, state.body!, epoch), waterLevelM,shadowFrustum);
  if (!renderer.xr.isPresenting && state.body) {
    // Keep metre-scale depth precision without clipping the distant system.
    const near = (walker||landing ? .03:Math.max(.03, Math.min(1000, clearance.terrainClearance * .005))) * systemUnit;
    if (Math.abs(camera.near - near) > near * .1) { camera.near = near; camera.updateProjectionMatrix(); }
  }
}
function updateSpace() {
  if (!space) return;
  const immersive = renderer.xr.isPresenting;
  const observer = immersive ? new THREE.Vector3() : camera.position.clone();
  if (
    !immersive &&
    !journey.active &&
    camera.position.length() > space.scale * 256 &&
    camera.position.distanceTo(controls.target) < space.scale * 256
  ) {
    const physical = space
      .physical(camera.position)
      .map((v) => Math.floor(v / 32) * 32) as V3;
    const delta = space.rebase(physical);
    camera.position.sub(delta);
    controls.target.sub(delta);
    homePos.sub(delta);
    homeTarget.sub(delta);
    observer.sub(delta);
  }
  space.update(
    observer,
    immersive,
    renderer.getPixelRatio(),
    Math.hypot(...space.physical(observer)) < space.galaxy.radiusLy * 1.4,
    epoch,
  );
  const stats = space.diagnostics();
  contextStats.nearbySystems = stats.nearbyStars;
  contextStats.skyPoints = stats.mapStars;
  if (spaceSelection) {
    const ref =
      space.find(selected || "") ||
      sectorData?.refs.find((r) => r.id === selected);
    spaceSelection.object.visible = !!ref;
    if (ref) {
      spaceSelection.object.position.copy(space.world(ref.position));
      spaceSelection.el.textContent = ref.name + " · selected";
    }
  }
}
function nameSector(c: V3) {
  return `Local stars · ${c.join(" · ")}`;
}
function orbitLine(b: Body, scale: number, sys: StarSystem, parent?: Body) {
  if (!b.orbit) return;
  const ps: THREE.Vector3[] = [];
  for (let i = 0; i <= 128; i++) {
    const p = orbitPosition(
      { ...b.orbit, anomaly: (i / 128) * Math.PI * 2 },
      0,
    );
    const origin = parent ? bodyPosition(parent, sys, 0) : [0, 0, 0];
    ps.push(
      new THREE.Vector3(...(p.map((v, j) => (v + origin[j]) * scale) as V3)),
    );
  }
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(ps),
    new THREE.LineBasicMaterial({
      color: b.kind === "moon" ? "#455d6b" : "#426071",
      transparent: true,
      opacity: 0.36,
    }),
  );
  line.userData.parent = parent;
  line.userData.body = b;
  root.add(line);
  systemOrbits.push(line);
}
// Module-level scratch: `blackbodyColor` mutates and returns this SAME
// THREE.Color every call rather than allocating a new one, so driving it from
// a per-frame call site (`applyExistence`/`positionSystem`) costs zero new
// allocations (Quest budget). Callers that need to retain a value must
// `.copy()` it (every call site here does, via `material.color.copy(...)`).
const _blackbodyScratch = new THREE.Color();
/** Planckian-locus RGB approximation for a temperature in kelvin (Tanner
 * Helland's widely-used polynomial fit to the blackbody locus,
 * https://tannerhelland.com/2012/09/18/convert-temperature-rgb-algorithm.html,
 * valid ~1000-40000K -- comfortably spans stellar-evolution.ts's
 * `starStateAt` range: main-sequence ~2600-7400K over the catalogue's
 * 0.08-1.63 solar-mass range, white-dwarf remnants at 12000K, neutron-star
 * remnants at 6e5K (clamped at the approximation's ceiling -- still reads as
 * the intended hot blue-white, just not spectroscopically exact that far out
 * of range). This is a presentation-only quantity (contract §1.2 rule 3: no
 * caller of `starStateAt` branches on colour), so native `Math.pow`/`Math.log`
 * are fine here, same as `starStateAt` itself already uses for radius/
 * temperature. `kelvin <= 0` (or NaN) -- the black-hole remnant's
 * `temperatureK` -- returns pure black rather than feeding a non-positive
 * value into `Math.log`/`Math.pow`. */
function blackbodyColor(kelvin: number): THREE.Color {
  if (!(kelvin > 0)) return _blackbodyScratch.setRGB(0, 0, 0);
  const temp = THREE.MathUtils.clamp(kelvin, 1000, 40000) / 100;
  const r = temp <= 66 ? 255 : 329.698727446 * Math.pow(temp - 60, -0.1332047592);
  const g =
    temp <= 66
      ? 99.4708025861 * Math.log(temp) - 161.1195681661
      : 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
  const b =
    temp >= 66 ? 255 : temp <= 19 ? 0 : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  return _blackbodyScratch.setRGB(
    THREE.MathUtils.clamp(r, 0, 255) / 255,
    THREE.MathUtils.clamp(g, 0, 255) / 255,
    THREE.MathUtils.clamp(b, 0, 255) / 255,
    THREE.SRGBColorSpace,
  );
}
const _blackbodyCurScratch = new THREE.Color();
const _tintScratch = new THREE.Color();
/**
 * Self-normalising per-channel tint: `blackbodyColor(kelvin) /
 * blackbodyColor(referenceKelvin)`, meant to be *multiplied* into an
 * existing static colour (catalogue `b.color`, or the light's hardcoded
 * `LIGHT_BASE_COLOR`) rather than replacing it outright. At
 * `kelvin === referenceKelvin` every channel ratio is exactly 1, so the
 * tinted colour is bit-identical to the untinted static colour -- the same
 * self-normalising trick `applyExistence` already uses for
 * `st.radiusM / body.radiusM`.
 *
 * `referenceKelvin` MUST come from `starStateAt` evaluated at an instant
 * known to be main-sequence for the star in question (its own
 * `lifecycle.formationNs` -- `starStateAt` returns the constant
 * `baseTemperatureK` for the entire main-sequence stage, so any such instant
 * works), NOT catalog.ts's `Body.temperatureK`. That field is *rounded*
 * (`Math.round(5772 * Math.sqrt(solarMass))`) while `starStateAt`'s
 * `baseTemperatureK` is not (`5772 * Math.pow(solarMass, 0.5)`), so at the
 * catalogue epoch the two would differ by a fraction of a kelvin and the
 * ratio would only be ~1.0000, not exactly 1 -- verified to reintroduce
 * exactly the `test:surface` regression this function exists to fix. Two
 * `starStateAt` calls at the same main-sequence instant return the literal
 * same double for `temperatureK`, so this reference is exact by
 * construction, not just close.
 *
 * Per-channel epsilon guards a reference channel that is legitimately 0
 * (`blackbodyColor`'s polynomial fit clamps blue to 0 below ~1900K, and the
 * coolest main-sequence stars in this catalogue's mass range sit close to
 * that) -- without it, a star whose reference channel is ~0 evolving to a
 * temperature where that channel is nonzero would divide by ~0 and blow up
 * to Infinity. It also covers `kelvin <= 0` (the black-hole remnant, for
 * which `blackbodyColor` already returns pure black) for free: 0 over
 * anything (plus the epsilon) stays finite and small, never NaN.
 */
function blackbodyTint(kelvin: number, referenceKelvin: number): THREE.Color {
  const cur = _blackbodyCurScratch.copy(blackbodyColor(kelvin));
  const ref = blackbodyColor(referenceKelvin); // blackbodyColor's shared scratch; `cur` above is already an independent copy
  const eps = 1e-3;
  return _tintScratch.setRGB(
    (cur.r + eps) / (ref.r + eps),
    (cur.g + eps) / (ref.g + eps),
    (cur.b + eps) / (ref.b + eps),
  );
}
function sphere(b: Body, size: number) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(size, 40, 24),
    b.kind === "star"
      ? new THREE.MeshBasicMaterial({ color: b.color })
      : new THREE.MeshStandardMaterial({
          color: b.color,
          roughness: 0.83,
          metalness: 0,
        }),
  );
}
function attachFormationRing(mesh: THREE.Mesh, body: Body, size: number) {
  if (body.kind !== 'planet') return;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(size * 1.3, size * 2.7, 48),
    new THREE.MeshBasicMaterial({ color: '#d77d42', transparent: true, opacity: .56, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  mesh.add(ring);
  mesh.userData.formationRing = ring;
}
function surfaceMap(bytes: Uint8Array, data: Surface, color = false) {
  const texture = new THREE.DataTexture(
    bytes,
    data.width,
    data.height,
    THREE.RGBAFormat,
  );
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.flipY = true;
  texture.needsUpdate = true;
  return texture;
}
function applyRelief(
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>,
  body: Body,
  radius: number,
  data: Surface,
  multiplier: number,
) {
  const pos = mesh.geometry.attributes.position;
  let directions = mesh.geometry.userData.directions as
    | Float32Array
    | undefined;
  if (!directions) {
    directions = new Float32Array(pos.count * 3);
    for (let i = 0; i < directions.length; i++)
      directions[i] = (pos.array[i] as number) / radius;
    mesh.geometry.userData.directions = directions;
  }
  for (let i = 0; i < pos.count; i++) {
    const r = radius * (1 + (data.elevations[i] / body.radiusM) * multiplier);
    pos.setXYZ(
      i,
      directions[i * 3] * r,
      directions[i * 3 + 1] * r,
      directions[i * 3 + 2] * r,
    );
  }
  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
  mesh.geometry.computeBoundingSphere();
  // The relief texture is encoded over the body's own range (terrain.ts
  // reliefTextureRange; legacy 60 km): decode it over that span.
  mesh.material.bumpScale =
    ((radius * PlanetRenderer.reliefTextureSpanM(body)) / body.radiusM) * multiplier;
  if (mesh === surfaceMesh)
    controls.minDistance = mesh.geometry.boundingSphere!.radius * 1.025;
}
function terrainMesh(
  body: Body,
  radius: number,
  data: Surface,
  multiplier: number,
) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, data.segments, data.segments / 2),
    new THREE.MeshStandardMaterial({
      map: surfaceMap(data.data, data, true),
      bumpMap: surfaceMap(data.relief, data),
      roughnessMap: surfaceMap(data.roughness, data),
      roughness: 1,
      metalness: 0,
      color: "#ffffff",
    }),
  );
  applyRelief(mesh, body, radius, data, multiplier);
  return mesh;
}
async function refineSurface() {
  if (
    planetTiles ||
    journey.active ||
    refiningSurface ||
    !surfaceInfo ||
    surfaceInfo.width >= 2048 ||
    state.level !== "body"
  )
    return;
  const token = loadId,
    detailToken = bodyFocusToken,
    body = state.body!;
  refiningSurface = true;
  try {
    const data: Surface = await job("surface", {
      body,
      width: 2048,
      segments: 256,
    });
    if (
      token !== loadId ||
      detailToken !== bodyFocusToken ||
      state.body?.id !== body.id ||
      !surfaceMesh
    )
      return;
    const old = surfaceMesh;
    replaceTerrain(old, body, data, reliefScale);
    const next = old;
    surfaceMesh = next;
    surfaceInfo = data;
    controls.minDistance = next.geometry.boundingSphere!.radius * 1.025;
  } catch (error) {
    if (token === loadId)
      announce(
        "Orbital preview retained; higher detail could not be generated.",
      );
  } finally {
    if (token === loadId && detailToken === bodyFocusToken)
      refiningSurface = false;
  }
}

function drawSystem(data: {
  surfaces: (Surface & { id: string })[];
  sky: CloudData;
  galaxyClouds: NamedCloud[];
  localSky: CloudData & { localCount: number };
  sectorRefs: SystemRef[];
}) {
  const sys = state.sys!;
  residentSystem = sys.id;
  systemOrigin.set(0, 0, 0);
  systemUnit = systemLayout(sys, "physical").records[sys.stars[0].id]
    .orbitScale;
  camera.far = Math.max(1000, systemBoundary(sys)*systemUnit*4);
  camera.updateProjectionMatrix();
  drawGalacticSky(data.sky, sys.ref.position);
  drawGalaxyNeighbours(state.galaxy!, data.galaxyClouds, sys.ref.position);
  skyAnchor.add(pointCloud(data.localSky, 1, 0.65));
  contextStats.nearbySystems = data.localSky.sizes.length;
  contextStats.sectorStars = data.localSky.localCount;
  locationMap =
    makeLocationMap(data.sky) + makeSectorLocationMap(data.sectorRefs, sys.ref);
  displayLayout = systemLayout(sys, systemScale);
  for (const b of [...sys.stars, ...sys.planets, ...sys.moons]) {
    if (b.kind === "moon" && systemScale !== "physical") continue;
    const size =
      b.kind === "moon"
        ? b.radiusM * systemUnit
        : displayLayout.records[b.id].radius;
    const scale =
      b.kind === "moon" ? systemUnit : displayLayout.records[b.id].orbitScale;
    const surface = data.surfaces.find((s) => s.id === b.id);
    const mesh = surface ? terrainMesh(b, size, surface, 1) : sphere(b, size);
    mesh.position.copy(vec(bodyPosition(b, sys)).multiplyScalar(scale));
    mesh.userData.radius = size;
    mesh.userData.preview = surface;
    // The non-stellar-lifecycle part of this mesh's scale (render-unit
    // rescale via `rescaleSystem`, overview<->physical toggle via
    // `physicalSystem`) -- see `applyExistence`'s star branch, which composes
    // `baseScale * (stellar lifecycle radius ratio)` into the actual
    // `mesh.scale` every frame. Only meaningful for stars; harmless (unread)
    // on every other body.
    mesh.userData.baseScale = 1;
    attachFormationRing(mesh, b, size);
    root.add(mesh);
    picks.push({ object: mesh, id: b.id, kind: "body" });
    animations.push({ obj: mesh, body: b, sys, scale });
    applyExistence(animations[animations.length - 1]);
    orbitLine(
      b,
      scale,
      sys,
      b.kind === "moon"
        ? sys.planets.find((p) => p.id === b.parentId)
        : undefined,
    );
    if (b.kind === "star") {
      const halo = sprite(b.color, size * 4);
      mesh.userData.halo = halo; // O(1) lookup for applyExistence's colour propagation, instead of scanning children
      mesh.add(halo);
      const sourceColor=new THREE.Color(b.id===sys.stars[0].id?sys.ref.color:b.color);
      const point=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',
        new THREE.Float32BufferAttribute([0,0,0],3)),new THREE.ShaderMaterial({
        uniforms:{alpha:{value:1},pointSize:{value:1},sourceColor:{value:sourceColor.clone()},visibility:{value:1}},
        vertexShader:`uniform float pointSize,visibility;uniform vec3 sourceColor;varying vec3 tint;varying float visibilityOut;
          void main(){tint=sourceColor;visibilityOut=visibility;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=pointSize;}`,
        fragmentShader:STAR_FRAGMENT.replaceAll('visibility','visibilityOut'),
        transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      }));
      point.frustumCulled=false;
      root.add(point);opticalStarPoints.push({mesh,point,sourceColor,luminosity:displayLuminosity(sys.ref)});
    }
    addLabel(
      mesh,
      b.name,
      b.kind === "star"
        ? "STAR"
        : `${sys.moons.filter((m) => m.parentId === b.id).length} moons`,
    );
    if (b.rings) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(size * 1.5, size * 2.3, 48),
        new THREE.MeshBasicMaterial({
          color: "#b8a284",
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      mesh.add(ring);
      mesh.userData.catalogueRing = ring;
    }
  }
  for (const belt of sys.belts) {
    const mapRadius = (radius: number) => {
      const planets = sys.planets;
      const i = Math.max(
        1,
        planets.findIndex((p) => p.orbit!.a >= radius),
      );
      const a = planets[i - 1],
        b = planets[i];
      const t = (radius - a.orbit!.a) / (b.orbit!.a - a.orbit!.a);
      const low = a.orbit!.a * displayLayout!.records[a.id].orbitScale;
      const high = b.orbit!.a * displayLayout!.records[b.id].orbitScale;
      return low + (high - low) * t;
    };
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(
        mapRadius(belt.innerM),
        mapRadius(belt.outerM),
        128,
      ),
      new THREE.MeshBasicMaterial({
        color: "#6c7c87",
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    root.add(mesh);
    systemOrbits.push(mesh);
  }
  if (systemScale === "physical") {
    camera.near =
      Math.min(
        ...[...sys.stars, ...sys.planets, ...sys.moons].map((b) => b.radiusM * systemUnit),
      ) * 0.001;
    camera.updateProjectionMatrix();
    controls.minDistance = camera.near * 10;
  }
  const radius = displayLayout.radius;
  root.userData.viewRadius = radius;
  controls.maxDistance = Math.max(160, radius * 5);
  const outward = vec(sys.ref.position);
  outward.y = 0;
  if (outward.lengthSq() < 1) outward.set(1, 0, 0);
  outward.normalize();
  fit(
    outward
      .clone()
      .multiplyScalar(radius * 2.1)
      .add(
        new THREE.Vector3(-outward.z, 0, outward.x).multiplyScalar(
          radius * 0.6,
        ),
      )
      .add(new THREE.Vector3(0, radius * 0.65, 0)),
  );
  caption(
    "04 / STELLAR SYSTEM",
    sys.name,
    systemScale === "overview"
      ? "A spaced map of the system. Orbital phases are preserved; select a planet to approach its world."
      : "True relative distances and body radii. Use the catalogue to approach a small world.",
    [
      [String(sys.stars.length), "stars"],
      [String(sys.planets.length), "planets"],
      [String(sys.moons.length), "major moons"],
    ],
  );
  createSystemMarkers();
}
function createSystemMarkers() {
  if (systemMarkers) {
    root.remove(systemMarkers.points);
    systemMarkers.points.geometry.dispose();
    (systemMarkers.points.material as THREE.Material).dispose();
  }
  const starScreen = new THREE.Vector3(), bodyScreen = new THREE.Vector3();
  systemMarkers = new NavigationMarkers(animations.map(a => ({object:a.obj,
    radius:()=>a.obj.userData.radius * a.obj.scale.x,
    color:a.body.kind==='star'?a.body.color:a.body.kind==='moon'?'#bdcfdf':'#92d9ec',
    pixels:a.body.kind==='star'?18:a.body.kind==='moon'?7:10,
    visibility:()=>{
      if(systemScale==='overview'||renderer.xr.isPresenting)return 1;
      // The optical point already represents the star. Planet beacons must
      // separate on screen before appearing, rather than stack into a glow.
      if(a.body.kind==='star')return 0;
      const parent=animations.find(p=>p.body.id===a.body.parentId)||animations[0];
      starScreen.copy(parent.obj.position).project(camera);
      bodyScreen.copy(a.obj.position).project(camera);
      const separation=Math.hypot((bodyScreen.x-starScreen.x)*innerWidth*.5,
        (bodyScreen.y-starScreen.y)*innerHeight*.5);
      return THREE.MathUtils.smoothstep(separation,12,30);
    }})));
  root.add(systemMarkers.points);
}
/** Prepare the actual catalogue points before crossing into the galaxy. Only
 * one exterior galaxy gets this extra detail; no separate fog field is used. */
function prepareGalaxyPreview(glyph: GalaxyGlyph) {
  if(glyph.preview||glyph.pending||glyph.failed)return;
  glyph.pending=true;
  const g=glyph.galaxy;
  void prepare('galaxy:'+g.seed,'galaxy-view',{galaxy:g,galaxies:catalogue}).then(data=>{
    if(!galaxyGlyphs.includes(glyph)||!glyph.detailWanted)return;
    const preview=new GalaxySpace(g,data.starMap,async()=>{throw new Error('Exterior preview cannot stream');},()=>{},()=>{},seed);
    preview.group.scale.setScalar(glyph.radius/10);
    glyph.visual.add(preview.group);
    glyph.preview=preview;
  }).catch(error=>{glyph.failed=true;console.warn('Galaxy approach preview unavailable',error);}).finally(()=>{glyph.pending=false;});
}
function prewarmGalaxy(id: string) {
  const galaxy=catalogue.find(g=>g.id===id);
  if(galaxy)void prepare('galaxy:'+galaxy.seed,'galaxy-view',{galaxy,galaxies:catalogue})
    .catch(error=>console.warn('Galaxy preparation unavailable',error));
}
function updateNavigationVisibility() {
  systemMarkers?.update(innerHeight,renderer.getPixelRatio());
  if (state.level === 'universe' && !renderer.xr.isPresenting) {
    const focal=innerHeight/(2*Math.tan(camera.fov*Math.PI/360));
    const detailed=viewMode==='state'?galaxyGlyphs.filter(g=>g.group.visible).reduce<GalaxyGlyph|null>((best,g)=>
      !best||g.group.position.distanceTo(camera.position)/g.radius<best.group.position.distanceTo(camera.position)/best.radius?g:best,null):null;
    for (const g of galaxyGlyphs) {
      const distance=g.group.position.distanceTo(camera.position);
      const visibleRadius=Math.max(g.radius,distance*22/focal);
      g.visual.scale.setScalar(visibleRadius/g.radius);
      g.pick.scale.setScalar(visibleRadius/(g.pick.geometry as THREE.SphereGeometry).parameters.radius);
      const radii=distance/g.radius;
      g.detailWanted=g===detailed&&radii<64;
      if(g.detailWanted)prepareGalaxyPreview(g);
      else if(g.preview){g.preview.stop();g.visual.remove(g.preview.group);disposeView(g.preview.group);g.preview=undefined;}
      if(g.preview){
        // By eight radii the exact incoming catalogue field is fully visible;
        // the scene boundary is farther in, at six radii.
        const mix=1-THREE.MathUtils.smoothstep(radii,8,20);
        const local=camera.position.clone().sub(g.group.position)
          .applyQuaternion(g.group.quaternion.clone().invert()).multiplyScalar(10/g.radius);
        g.preview.update(local,false,renderer.getPixelRatio(),false,epoch);
        (g.preview.anchors.material as THREE.ShaderMaterial).uniforms.alpha.value=mix;
        (g.preview.historical.material as THREE.PointsMaterial).opacity=.55*mix;
        (g.visual.children[0] as THREE.Points<THREE.BufferGeometry,THREE.ShaderMaterial>).material.uniforms.alpha.value=
          (g.baseAlpha??.8)*(1-mix);
      }else{
        (g.visual.children[0] as THREE.Points<THREE.BufferGeometry,THREE.ShaderMaterial>).material.uniforms.alpha.value=
          g.baseAlpha??.8;
      }
    }
  }
}
function physicalSystem() {
  if (!residentSystem || systemScale === "physical") return;
  const before = camera.position.clone(),
    sys = state.sys!;
  systemScale = "physical";
  displayLayout = systemLayout(sys, "physical");
  for (const a of animations) {
    const mesh = a.obj as THREE.Mesh;
    const r = a.body.radiusM * systemUnit;
    const displayScale = r / mesh.userData.radius;
    // For a star, `applyExistence` (called via `positionSystem()` below, in
    // this same function) is the sole writer of `mesh.scale` -- it composes
    // this display-mode ratio with the stellar-lifecycle radius ratio.
    // Writing `mesh.scale` directly here would just be clobbered by that call
    // a few lines down, so stash it in `userData.baseScale` instead.
    mesh.userData.baseScale = displayScale;
    if (a.body.kind !== "star") mesh.scale.setScalar(displayScale);
    a.scale = systemUnit;
  }
  for (const orbit of systemOrbits) {
    root.remove(orbit);
    (orbit as THREE.Line).geometry?.dispose();
    ((orbit as THREE.Line).material as THREE.Material)?.dispose();
  }
  systemOrbits = [];
  for (const a of animations) orbitLine(a.body, systemUnit, sys);
  for (const moon of sys.moons) {
    if (animations.some((a) => a.body.id === moon.id)) continue;
    const r = moon.radiusM * systemUnit,
      mesh = sphere(moon, r);
    mesh.userData.radius = r;
    mesh.userData.baseScale = 1;
    root.add(mesh);
    picks.push({ object: mesh, id: moon.id, kind: "body" });
    animations.push({ obj: mesh, body: moon, sys, scale: systemUnit });
    applyExistence(animations[animations.length - 1]);
    addLabel(mesh, moon.name, "MOON");
    orbitLine(
      moon,
      systemUnit,
      sys,
      sys.planets.find((p) => p.id === moon.parentId),
    );
  }
  for (const belt of sys.belts) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(
        belt.innerM * systemUnit,
        belt.outerM * systemUnit,
        128,
      ),
      new THREE.MeshBasicMaterial({
        color: "#6c7c87",
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    root.add(mesh);
    systemOrbits.push(mesh);
  }
  positionSystem();
  camera.position.copy(before);
  camera.near =
    Math.min(...[...sys.stars,...sys.planets].map((b) => b.radiusM * systemUnit)) * 0.001;
  camera.far = Math.max(1000,(systemBoundary(sys)+systemOrigin.length())*systemUnit*4);
  camera.updateProjectionMatrix();
  createSystemMarkers();
}
/** Contract §2.2/§2.3 existence gating, applied to a live system render
 * object every frame: nothing renders before formation or after
 * engulfment/merger — the headline bug this package fixes (a star's planets
 * must not render before the star itself has formed). Also applies the
 * body's spin (§4.4) as a cosmetic rotation, skipped for whichever body is
 * currently the focused/walked surface (that body's day/night instead
 * rotates the light direction in `updatePlanetTiles`, so its terrain mesh
 * and the ground-walker's frame are never themselves rotated). */
function bodyExists(sys: StarSystem, body: Body, t: Ns): boolean {
  const entry = lifecycleFor(sys, body);
  if (entry.kind === 'star') return starStateAt(entry.lc, t).stage !== 'unformed';
  const st = planetStateAt(entry.lc, entry.starLc, t);
  return st.stage === 'molten' || st.stage === 'solid';
}
function applyPlanetFormationAppearance(mesh: THREE.Mesh, stage: ReturnType<typeof planetStateAt>['stage']) {
  const material = mesh.material as THREE.MeshStandardMaterial;
  if (mesh.userData.formationMaterial !== material) {
    mesh.userData.formationMaterial = material;
    mesh.userData.formationMap = material.map;
    mesh.userData.formationColor = material.color.clone();
    mesh.userData.formationEmissive = material.emissive.clone();
    mesh.userData.formationEmissiveIntensity = material.emissiveIntensity;
  }
  const forming = stage === 'accreting', molten = stage === 'molten';
  const map = forming || molten ? null : mesh.userData.formationMap;
  if (material.map !== map) { material.map = map; material.needsUpdate = true; }
  if (forming || molten) {
    material.color.set(forming ? '#a46a43' : '#f48748');
    material.emissive.set(forming ? '#7e391b' : '#c53d19');
    material.emissiveIntensity = forming ? .45 : .7;
  } else {
    material.color.copy(mesh.userData.formationColor);
    material.emissive.copy(mesh.userData.formationEmissive);
    material.emissiveIntensity = mesh.userData.formationEmissiveIntensity;
  }
  mesh.scale.setScalar((mesh.userData.baseScale ?? 1) * (forming ? .4 : 1));
  const ring = mesh.userData.formationRing as THREE.Mesh | undefined;
  if (ring) ring.visible = forming;
  const catalogueRing = mesh.userData.catalogueRing as THREE.Mesh | undefined;
  if (catalogueRing) catalogueRing.visible = stage === 'solid';
}
function applyExistence(a: { obj: THREE.Object3D; body: Body; sys: StarSystem }) {
  const exists = bodyExists(a.sys, a.body, epoch);
  const entry = lifecycleFor(a.sys, a.body);
  const planetStage = entry.kind === 'star' ? null : planetStateAt(entry.lc, entry.starLc, epoch).stage;
  a.obj.visible = exists || planetStage === 'accreting';
  if (planetStage) applyPlanetFormationAppearance(a.obj as THREE.Mesh, planetStage);
  if (exists && a.obj !== surfaceMesh) {
    const spin = spinFor(a.body);
    const angle = rotationAngleAt(spin, entry.lc.formationNs, epoch);
    a.obj.rotation.set(spin.axialTiltRad, angle, 0);
    // Stellar visual evolution (this task): `starStateAt`'s radius/
    // temperature/luminosity were computed every frame already (via
    // `bodyExists` above) but only `.stage` was ever read -- swelling into a
    // giant or collapsing to a remnant had zero visible effect. Drive it from
    // the exact same lifecycle lookup used for spin, immediately above, no
    // new per-frame allocation: `mesh.scale`/`material.color`/the halo's
    // `material.color` are mutated in place every call.
    if (a.body.kind === "star" && entry.kind === "star") {
      const st = starStateAt(entry.lc, epoch);
      const mesh = a.obj as THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
      // Self-normalising: `body.radiusM` (catalog.ts) and `starStateAt`'s
      // main-sequence `baseRadiusM` are the exact same formula
      // (`6.957e8 * solarMass^0.8`), so this ratio is exactly 1.0 at the
      // catalogue epoch -- nothing shifts from today's rendering there, only
      // once the star actually evolves away from main sequence.
      mesh.scale.setScalar((mesh.userData.baseScale ?? 1) * (st.radiusM / a.body.radiusM));
      // Self-normalising, exactly like the radius ratio above: tint the
      // catalogue's own static `a.body.color` by the ratio against this
      // star's main-sequence reference temperature, instead of replacing it
      // with an absolute blackbody colour -- see `blackbodyTint`'s doc
      // comment for why the reference must come from `starStateAt`, not
      // catalog.ts's rounded `Body.temperatureK`.
      const refTemperatureK = starStateAt(entry.lc, entry.lc.formationNs).temperatureK;
      const tint = blackbodyTint(st.temperatureK, refTemperatureK);
      mesh.material.color.set(a.body.color).multiply(tint);
      const halo = mesh.userData.halo as THREE.Sprite | undefined;
      if (halo) (halo.material as THREE.SpriteMaterial).color.set(a.body.color).multiply(tint);
    }
  } else if (a.obj === surfaceMesh && (a.obj.rotation.x !== 0 || a.obj.rotation.y !== 0 || a.obj.rotation.z !== 0)) {
    // A body keeps whatever spin rotation it last had (set above, while it
    // was still a plain orbiting body) the instant it becomes the focused/
    // walked surface -- the branch above stops touching it, but nothing
    // else ever zeroed it. GroundWalker/contactPatches/PlanetRenderer all
    // assume this mesh's own transform carries NO rotation (per this
    // function's own doc comment above): they read `camera.position`
    // through `surfaceMesh`'s (and its PlanetRenderer group child's)
    // worldToLocal and treat the result as already being in the body's
    // unrotated local frame, the same frame `walker.position`/
    // `contactFocus` live in. A leftover non-identity rotation here silently
    // rotates every local-space reading (candidate culling, life-lattice
    // anchoring, tile selection) by that stale angle while leaving the
    // walker's own physics (which never goes through this transform) still
    // correct -- producing exactly the large, stable divergence between
    // `camera`-derived local coordinates and the walker's true position that
    // this task found (flora scattered/culled around the wrong point, and
    // the root cause of ground-walker tile-selection starving too). Fix: pin
    // it to identity for as long as it remains the walked body.
    a.obj.rotation.set(0, 0, 0);
  }
}
function positionSystem() {
  for (const a of animations) {
    a.obj.position.copy(
      vec(bodyPosition(a.body, a.sys, epoch))
        .sub(systemOrigin)
        .multiplyScalar(a.scale),
    );
    applyExistence(a);
  }
  for (const orbit of systemOrbits) {
    const parent = orbit.userData.parent as Body | undefined;
    orbit.position
      .copy(
        parent
          ? vec(bodyPosition(parent, state.sys!, epoch)).sub(
              vec(bodyPosition(parent, state.sys!, 0)),
            )
          : new THREE.Vector3(),
      )
      .sub(systemOrigin)
      .multiplyScalar(systemUnit);
    const owner = orbit.userData.body as Body | undefined;
    if (owner && state.sys) orbit.visible = bodyExists(state.sys, owner, epoch);
  }
  // Drive the scene's single DirectionalLight (main.ts's own construction
  // comment: colour/intensity were set once and never touched again) from
  // the resident system's primary star's lifecycle state -- the other half
  // of this task's fix, so a giant's brightening/reddening and a remnant's
  // dimming actually reach the lighting, not just the star's own mesh.
  // Intensity is compressed (sqrt, not linear) so the ~400x luminosityRel at
  // giant-phase peak doesn't blow out the whole scene; a `luminosityRel` of
  // 0 (unformed, or a black-hole remnant) drives it to exactly 0, and
  // `blackbodyColor` itself guards `temperatureK === 0` against NaN.
  const sys = state.sys;
  const primaryStar = sys?.stars[0];
  if (sys && primaryStar) {
    const entry = lifecycleFor(sys, primaryStar);
    if (entry.kind === "star") {
      const st = starStateAt(entry.lc, epoch);
      // Self-normalising, same reasoning as the star mesh/halo above: tint
      // `LIGHT_BASE_COLOR` rather than replacing it outright, so the light is
      // bit-identical to the pre-this-feature build while the primary star is
      // on the main sequence.
      const refTemperatureK = starStateAt(entry.lc, entry.lc.formationNs).temperatureK;
      light.color.set(LIGHT_BASE_COLOR).multiply(blackbodyTint(st.temperatureK, refTemperatureK));
      // `3 * Math.sqrt(luminosityRel)` is already self-normalising:
      // `luminosityRel` is exactly 1 on the main sequence, so this is exactly
      // the original hardcoded intensity (3) at the catalogue epoch.
      light.intensity = st.luminosityRel > 0 ? 3 * Math.sqrt(st.luminosityRel) : 0;
    }
  }
}
function rebaseSystem(origin: THREE.Vector3) {
  const delta = origin.clone().sub(systemOrigin).multiplyScalar(systemUnit);
  viewBlend?.shiftOrigin(delta);
  systemOrigin.copy(origin);
  camera.position.sub(delta);
  controls.target.sub(delta);
  homePos.sub(delta);
  homeTarget.sub(delta);
  positionSystem();
}
function rescaleSystem(unit: number) {
  // Use metre units through regional flight and walking, preserving physical
  // poses and dimensions. Tile/batch local anchors are still necessary before
  // Float32 upload; changing scene scale alone cannot restore lost precision.
  const ratio = unit / systemUnit;
  if (Math.abs(ratio - 1) < 1e-10) return;
  systemUnit = unit;
  for (const a of animations) {
    // See physicalSystem()'s matching comment: a star's `mesh.scale` is owned
    // by `applyExistence` (composing this render-unit ratio with the stellar-
    // lifecycle radius ratio), so the ratio is folded into `userData.baseScale`
    // instead of the mesh's own scale, which `positionSystem()` below recomputes.
    a.obj.userData.baseScale = (a.obj.userData.baseScale ?? 1) * ratio;
    if (a.body.kind !== "star") a.obj.scale.multiplyScalar(ratio);
    a.scale = unit;
  }
  for (const orbit of systemOrbits) orbit.scale.multiplyScalar(ratio);
  for (const p of [camera.position, controls.target, homePos, homeTarget]) p.multiplyScalar(ratio);
  controls.minDistance *= ratio; controls.maxDistance *= ratio;
  camera.near *= ratio;
  camera.far = Math.max(1000, (systemBoundary(state.sys!) + systemOrigin.length()) * unit * 4);
  camera.updateProjectionMatrix();
  if (displayLayout) {
    displayLayout.radius *= ratio;
    for (const r of Object.values(displayLayout.records)) { r.radius *= ratio; r.extent *= ratio; r.orbitScale *= ratio; }
  }
  positionSystem();
}
function focusRadius() {
  return state.body ? state.body.radiusM * systemUnit : 1;
}
function replaceTerrain(
  mesh: THREE.Mesh,
  body: Body,
  data: Surface,
  multiplier = 1,
) {
  const radius = body.radiusM * systemUnit,
    next = terrainMesh(body, radius, data, multiplier);
  const old = mesh.material as THREE.MeshStandardMaterial;
  for (const t of [old.map, old.bumpMap, old.roughnessMap]) t?.dispose();
  old.dispose();
  mesh.geometry.dispose();
  const ratio = radius / mesh.userData.radius;
  for (const child of mesh.children) child.scale.multiplyScalar(ratio);
  mesh.geometry = next.geometry;
  mesh.material = next.material;
  mesh.scale.setScalar(1);
  mesh.userData.baseScale = 1;
  mesh.userData.radius = radius;
}
/** A stellar photosphere is subpixel through most of a system approach.
 * Keep its point-source image visible until the resolved disk takes over. */
function updateOpticalStarPoints(){
  if(!residentSystem)return;
  if(renderer.xr.isPresenting){for(const {point} of opticalStarPoints)point.visible=false;return;}
  const viewportHeight=renderer.domElement.clientHeight||window.innerHeight;
  const focal=viewportHeight/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2));
  root.updateMatrixWorld(true);
  for(const {mesh,point,sourceColor,luminosity} of opticalStarPoints){
    point.visible=mesh.visible&&systemScale==='physical';
    if(!point.visible)continue;
    const position=mesh.getWorldPosition(new THREE.Vector3());
    point.position.copy(position);
    const distance=Math.max(1e-9,camera.position.distanceTo(position));
    const radius=(mesh.geometry.boundingSphere?.radius||mesh.userData.radius||0)*mesh.scale.x;
    const diskPixels=radius/distance*focal;
    const fade=1-THREE.MathUtils.smoothstep(diskPixels,1.5,5);
    const material=point.material;
    material.uniforms.visibility.value=fade;
    const resolved=(mesh.userData.halo as THREE.Sprite|undefined)?.material as THREE.SpriteMaterial|undefined;
    material.uniforms.sourceColor.value.copy(sourceColor).lerp(resolved?.color||sourceColor,THREE.MathUtils.smoothstep(diskPixels,.25,3));
    point.visible=fade>.01;
    material.uniforms.pointSize.value=starPointDiameter(distance/systemUnit/LY,luminosity)*renderer.getPixelRatio();
  }
}
async function focusBody(body: Body, keepPose = false) {
  // A direct URL can supply a body from a separately generated system record.
  // Use the resident catalogue object so flight, render and geology share it.
  body=bodyById(body.id)||body;
  const focusEntry=lifecycleFor(state.sys!,body);
  const solidAtFocus=focusEntry.kind==='star'||planetStateAt(focusEntry.lc,focusEntry.starLc,epoch).stage==='solid';
  // Inland rivers are withdrawn (inland-rivers.ts): focusing a body never
  // builds canonical hydrology or selects a river region.
  clearWalking();
  surfaceJourney=null;startCruiseAfterLook=false;
  planetTiles?.dispose(); planetTiles = null;
  orbitAssist = null;
  const token = ++bodyFocusToken,
    sys = state.sys!;
  if (!residentSystem) return;
  const started = performance.now(),
    focusDuration =
      renderer.xr.isPresenting ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 1800;
  if (!keepPose) {
    ready = false;
    journey = {
      ...journey,
      active: true,
      phase: "focus",
      from: state.level,
      to: "body",
    };
  }
  if (detailedBody && detailedBody.body.id !== body.id) {
    const old = detailedBody;
    if (old.mesh.userData.preview)
      replaceTerrain(old.mesh, old.body, old.mesh.userData.preview);
    else {
      const m = old.mesh.material as THREE.MeshStandardMaterial;
      [m.map, m.bumpMap, m.roughnessMap].forEach((t) => t?.dispose());
      m.dispose();
      old.mesh.geometry.dispose();
      old.mesh.geometry = new THREE.SphereGeometry(
        old.body.radiusM * systemUnit,
        40,
        20,
      );
      old.mesh.material = new THREE.MeshStandardMaterial({
        color: old.body.color,
      });
    }
  }
  physicalSystem();
  rescaleSystem(1 / 1e6);
  playing = false;
  // Retain every body, orbit and surrounding star in the same scene.
  rebaseSystem(vec(bodyPosition(body, sys, epoch)));
  state = { ...state, level: "body", body };
  selected = body.id;
  reliefScale = 1;
  const mesh = animations.find((a) => a.body.id === body.id)!.obj as THREE.Mesh;
  surfaceMesh = body.kind === "star" ? null : (mesh as typeof surfaceMesh);
  surfaceInfo = null;
  refiningSurface = false;
  const radius = focusRadius();
  controls.minDistance = radius * 1.025;
  controls.maxDistance = Math.max(160, systemBoundary(sys) * systemUnit * 3);
  root.userData.viewRadius = radius * 5;
  root.userData.focusRadius = radius;
  root.userData.space = true;
  light.position.copy(
    vec(bodyPosition(sys.stars[0], sys, epoch))
      .sub(systemOrigin)
      .normalize()
      .multiplyScalar(12),
  );
  light.target.position.set(0, 0, 0);
  if (!keepPose) {
    camera.up.set(0,1,0);
    const direction = light.position
      .clone()
      .normalize()
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.5)
      .add(new THREE.Vector3(0, 0.15, 0))
      .normalize();
    const to = direction.multiplyScalar(radius * 3.9);
    if (renderer.xr.isPresenting) {
      homePos.copy(to);
      homeTarget.set(0, 0, 0);
      vr?.reset();
    } else if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      camera.position.copy(to);
      controls.target.set(0, 0, 0);
      camera.lookAt(controls.target);
    } else
      tween = {
        from: camera.position.clone(),
        to,
        targetFrom: controls.target.clone(),
        targetTo: new THREE.Vector3(),
        start: performance.now(),
        duration: 1800,
        logarithmic: true,
      };
    homePos.copy(to);
    homeTarget.set(0, 0, 0);
  }
  caption(
    "05 / PLANETARY ORBIT",
    body.name,
    "Camera focused on this world. Its star system remains around you; fly away to continue your journey.",
    [
      [fmt(body.radiusM / 1000, 0) + " km", "radius"],
      [sys.name, "parent system"],
    ],
  );
  announce('Physical scale · continuous planetary terrain and system flight');
  breadcrumbs();
  panel();
  persist();
  if (body.kind !== "star" && solidAtFocus)
    try {
      const data = await job("surface", { body, width: 1024, segments: 192 });
      if (
        token !== bodyFocusToken ||
        state.body?.id !== body.id ||
        !residentSystem
      )
        return;
      replaceTerrain(mesh, body, data);
      surfaceInfo = data;
      surfaceMesh = mesh as typeof surfaceMesh;
      detailedBody = { mesh, body };
      restartPlanetTiles();
    } catch (e) {
      announce(
        "The system remains available; terrain detail could not be prepared.",
      );
    }
  if (!keepPose) {
    await new Promise((r) =>
      setTimeout(r, Math.max(0, focusDuration - (performance.now() - started))),
    );
    if (token === bodyFocusToken) {
      ready = true;
      journey.active = false;
      journey.phase = "idle";
      journey.completed++;
      controls.enabled = !flight && !renderer.xr.isPresenting;
    }
  }
}
function unfocusBody(keepPose: boolean) {
  surfaceJourney=null;startCruiseAfterLook=false;
  planetLook = null;
  planetTiles?.dispose(); planetTiles = null;
  orbitAssist = null;
  // Automatic distance unfocus keeps a running low-orbit approach continuous.
  // Breadcrumb exits intentionally discard that target.
  if (!keepPose) approachAltitude = null;
  bodyFocusToken++;
  const sys = state.sys!;
  rescaleSystem(systemLayout(sys, 'physical').records[sys.stars[0].id].orbitScale);
  state = {
    level: "system",
    galaxy: state.galaxy,
    coords: state.coords,
    ref: state.ref,
    sys,
  };
  surfaceInfo = null;
  surfaceMesh = null;
  refiningSurface = false;
  selected = followedPlanetId&&sys.planets.some(p=>p.id===followedPlanetId)?followedPlanetId:null;
  delete root.userData.focusRadius;
  controls.minDistance = systemUnit * 1000;
  root.userData.viewRadius = 15;
  if (!keepPose) {
    // A breadcrumb exit is deliberate: do not re-focus the nearby body next frame.
    flight = false; autopilot = null; flightAim = null;
    controls.enabled = !renderer.xr.isPresenting;
    rebaseSystem(new THREE.Vector3());
    const to = new THREE.Vector3(15, 12, 25);
    homePos.copy(to);
    homeTarget.set(0, 0, 0);
    if (renderer.xr.isPresenting) vr?.reset();
    else
      tween = {
        from: camera.position.clone(),
        to,
        targetFrom: controls.target.clone(),
        targetTo: new THREE.Vector3(),
        start: performance.now(),
        duration: 1800,
        logarithmic: true,
      };
  }
  caption(
    "04 / STELLAR SYSTEM",
    sys.name,
    "Fly between worlds or focus a planet while keeping the surrounding system.",
    [],
  );
  breadcrumbs();
  panel();
  persist();
}

function bodyById(id: string) {
  return state.sys
    ? [...state.sys.stars, ...state.sys.planets, ...state.sys.moons].find(
        (b) => b.id === id,
      )
    : undefined;
}
function followedPlanet():Body|undefined {
  return state.sys?.planets.find(body=>body.id===followedPlanetId);
}
function planetFollowEvents(sys:StarSystem,body:Body):[string,Ns][] {
  const entry=lifecycleFor(sys,body);
  if(entry.kind==='star')return [];
  const events:[string,Ns][]=[['Formation begins',entry.lc.formationNs],['Solid ground',entry.lc.coolingNs]];
  if(entry.lc.oceanNs!==null)events.push(['Ocean begins',entry.lc.oceanNs]);
  const history=biosphereHistoryFor(seed,body.id,body,entry.lc);
  const atAge=(myr:number)=>entry.lc.formationNs+BigInt(myr)*1_000_000n*YEAR_NS;
  if(history.microbialMyr!==null)events.push(['First microbes',atAge(history.microbialMyr)]);
  for(const [label,kind] of [['First plants','plant'],['First animals','animal']] as const){
    const first=Math.min(...history.species.filter(s=>kind==='animal'?s.kind==='animal':s.kind!=='animal').map(s=>s.birthMyr));
    if(Number.isFinite(first))events.push([label,atAge(first)]);
  }
  events.push(['Host becomes giant',entry.starLc.giantNs],['Host becomes remnant',entry.starLc.remnantNs]);
  if(entry.lc.engulfedNs!==null)events.push(['Planet engulfed',entry.lc.engulfedNs]);
  return events.filter(([,t])=>entry.lc.engulfedNs===null||t<=entry.lc.engulfedNs)
    .sort((a,b)=>a[1]<b[1]?-1:a[1]>b[1]?1:0);
}
function followPlanetFromFormation(body:Body){
  if(body.kind!=='planet'||!state.sys)return;
  const entry=lifecycleFor(state.sys,body);
  if(entry.kind==='star')return;
  followedPlanetId=body.id;selected=body.id;
  seekDate(entry.lc.formationNs);
  if(state.sys&&state.level==='system')void focusBody(body);
  tier='historical';updateDateUI();panel();persist();
  announce(`Following ${body.name} from formation. Use Play or Next milestone to move through its history.`);
}
function nextPlanetMilestone(){
  const body=followedPlanet();if(!body||!state.sys)return;
  const event=planetFollowEvents(state.sys,body).find(([,t])=>t>epoch);
  if(!event){announce('This model specifies no later milestone or destruction for this planet.');return;}
  seekDate(event[1]);
  announce(`${body.name}: ${event[0]} at ${readableYears(event[1])} after the Big Bang.`);
}
function stopPlanetFollow(){followedPlanetId=null;panel();persist();announce('Planet follow ended.');}
function worldHistoryPanel(sys: StarSystem, body: Body): string {
  const entry=lifecycleFor(sys,body);
  if(entry.kind==='star')return '';
  const snapshot=planetSnapshotFor(sys,body,epoch);
  const stage=snapshot.state.stage;
  const environment=snapshot.environment;
  const bio=stage==='molten'||stage==='solid'
    ? snapshot.biosphere()
    : null;
  const plants=bio?.species.filter(s=>s.kind!=='animal').length||0;
  const animals=bio?.species.filter(s=>s.kind==='animal').length||0;
  const events: [string,bigint][]=[
    ['Accretion disc',(entry.starLc.formationNs+entry.lc.formationNs)/2n],
    ['Molten world',entry.lc.formationNs],
    ['Solid ground',entry.lc.coolingNs],
  ];
  if(entry.lc.oceanNs!==null)events.push(['Ocean begins',entry.lc.oceanNs]);
  const profile=profileFromPhysicalProperties(body,'main-sequence');
  if(profile!=='airless'){
    const world=biosphereHistoryFor(seed,body.id,body,entry.lc);
    const atAge=(myr:number)=>entry.lc.formationNs+BigInt(myr)*1_000_000n*YEAR_NS;
    if(world.microbialMyr!==null)events.push(['First microbes',atAge(world.microbialMyr)]);
    const firstPlant=Math.min(...world.species.filter(s=>s.kind!=='animal').map(s=>s.birthMyr));
    const firstAnimal=Math.min(...world.species.filter(s=>s.kind==='animal').map(s=>s.birthMyr));
    if(Number.isFinite(firstPlant))events.push(['First plants',atAge(firstPlant)]);
    if(Number.isFinite(firstAnimal))events.push(['First animals',atAge(firstAnimal)]);
  }
  events.push(['Reference date',CATALOGUE_EPOCH_NS]);
  const following=followedPlanetId===body.id;
  const followEvents=body.kind==='planet'?planetFollowEvents(sys,body):[];
  const nextEvent=followEvents.find(([,t])=>t>epoch);
  return `<details class="world-history" open><summary>Formation & life</summary>
    <p class="subtle">At this date: <strong>${esc(stage.replace('-', ' '))}</strong> · biosphere: <strong>${esc(bio?.stage||'not yet present')}</strong><br>
    ${plants} living plant species · ${animals} living animal species.<br>
    Host star: ${esc(environment.starStage.replace('-', ' '))} · estimated temperature: ${environment.estimatedTemperatureK===null?'unresolved':`${Math.round(environment.estimatedTemperatureK)} K`} · global ocean: ${environment.oceanAvailable?'present':'absent'} · dated habitat: ${environment.biosphereSuitable?'suitable':'unsuitable'}. ${environment.biosphereSuitable?'Animals and plants appear near walkable ground where the local habitat supports them.':'The procedural climate or water gate excludes visible life at this date.'}</p>
    <div class="mini-buttons">${events.filter(([,t])=>entry.lc.engulfedNs===null||t<entry.lc.engulfedNs).map(([label,t])=>`<button type="button" data-history-date="${t}">${esc(label)}<small>${esc(readableYears(t))}</small></button>`).join('')}</div>
    ${body.kind==='planet'?`<div class="mini-buttons"><button id="follow-planet">Follow from formation</button>${following?`<button id="next-planet-event">Next milestone${nextEvent?`: ${esc(nextEvent[0])}`:''}</button><button id="stop-planet-follow">Stop following</button>`:''}</div><p class="subtle">${following?`Following this planet · ${esc(stage)} at ${esc(readableYears(epoch))}. `:''}${entry.lc.engulfedNs===null?'No destruction date is specified for this planet.':`Engulfment: ${esc(readableYears(entry.lc.engulfedNs))}.`}</p>`:''}
    <p class="subtle">These formation and biosphere dates are procedural scenarios, not a calibrated planetary history.</p></details>`;
}
function universeTravelPanel(){
  return `<div class="mini-buttons"><button id="toggle-flight">${flight?'Stop flight':'Fly freely'}</button><button id="fly-target" ${selected?'':'disabled'}>Fly to selection</button><button id="fly-outward">Fly outward</button><button id="play">${timeRunning()?'Pause time':flight?'Resume time (1×)':'Play time'}</button></div><p class="subtle">Drag to look · WASD travel · Q/E down/up · wheel adjusts speed · Shift boosts · Esc stops.</p><div class="mini-buttons"><button id="fly-forward">Hold: fly forward</button></div>`;
}
function bindUniverseTravel(){
  bind('toggle-flight',toggleFlight);bind('fly-target',beginTargetFlight);bind('fly-outward',flyOutward);
  bind('play',toggleTime);
  const forward=$('fly-forward');
  if(forward){forward.onpointerdown=()=>{if(!flight)toggleFlight();touchForwardHeld=true;flightKeys.add('w');};forward.onpointerup=forward.onpointercancel=()=>{touchForwardHeld=false;flightKeys.delete('w');};}
}
function starTrackerPanel(star:PrimordialStar|undefined){
  if(!star)return '';
  const status=epoch<star.birthNs?'not formed':epoch<star.deathNs?'alive':'ended';
  const descendant=catalogue.find(g=>g.id===star.descendantGalaxyId);
  const available=!!descendant&&galaxyVisibleAt(descendant,epoch);
  return `<h3>${firstStarFocus===star.id?'Following':'Selected'} first star</h3><div class="code">${esc(star.id)}</div>
    <p><strong>${status}</strong> at this date · lifespan ${readableLifetime(star.birthNs,star.deathNs)} · formed ${readableYears(star.birthNs)} after the Big Bang.</p>
    <p class="subtle">${status==='ended'?'The original star is gone. This trace follows its modeled material lineage, not a living star or a measured remnant.':'This is a procedural first star with no resolved planets.'} Descendant region: ${esc(star.descendantGalaxyId)}.</p>
    <details><summary>Stellar life and mergers</summary><p class="subtle">Gas cloud → protostar → hydrogen-burning star → giant or supergiant. Depending on mass, the end can leave a white dwarf, neutron star or black hole, or disperse material in an explosion. Massive first stars in this model live only a few to a few dozen million years, so none is still alive at the reference date. Stars can merge in close binaries or crowded clusters; individual stellar mergers and remnant outcomes are not yet resolved here.</p></details>
    <div class="mini-buttons">${firstStarFocus===star.id?'<button id="stop-first-star-follow">Stop following</button>':'<button id="follow-first-star">Follow star</button>'}<button id="star-birth">Formation</button><button id="star-death">End of life</button><button id="star-now">Reference now</button>${available?'<button id="star-descendant">Visit descendant galaxy</button>':''}</div>`;
}
function bindStarTracker(){
  const star=firstStarById(firstStarFocus||selected);if(!star)return;
  bind('follow-first-star',()=>visitFirstStar(star));bind('stop-first-star-follow',leaveFirstStar);
  bind('star-birth',()=>seekDate(star.birthNs));bind('star-death',()=>seekDate(star.deathNs));
  bind('star-now',()=>seekDate(CATALOGUE_EPOCH_NS));
  bind('star-descendant',()=>{const galaxy=catalogue.find(g=>g.id===star.descendantGalaxyId);if(galaxy&&galaxyVisibleAt(galaxy,epoch))void navigate('galaxy',{galaxy});});
}
function panel() {
  const content = $("panel-content");
  $("panel-kicker").textContent =
    state.level === "body" ? "WORLD INSPECTOR" : "EXPLORER";
  let html = "";
  if (state.level === "universe") {
    const early=earlySceneStageAt(epoch);
    if(early){
      ensurePrimordialCohort();
      const bg=cosmicBackgroundAt(epoch);
      const alive=early==='first-stars'?primordialStarsAt(primordialCohort,epoch):[];
      const focused=firstStarById(firstStarFocus);
      const chosen=firstStarById(selected);
      html=`<span class="kicker">COSMIC HISTORY</span><h2>${esc(early.replaceAll('-',' '))}</h2>
        ${universeTravelPanel()}
        <p>The view shows a simultaneous model date. The earliest plasma and first-light fields are illustrative; there is no central explosion.</p>
        ${facts([['Scale factor',epoch===0n?'undefined at origin':Math.exp(Math.max(-700,bg.lnScaleFactor)).toExponential(3)],
          ['Opacity',bg.opacity],['Model',bg.fidelity],
          ['First stars',early==='first-stars'?String(alive.length):'not yet'],
          ['Enrichment proxy',`${Math.round(primordialEnrichmentProxyAt(primordialCohort,epoch)*100)}%`]])}
        ${starTrackerPanel(focused||chosen)}
        ${alive.length?`<h3>First stars · ${alive.length}</h3>${alive.slice(0,24).map(star=>item(star.id,`First star ${star.id.split('/').at(-2)}`,`Lifespan ${readableLifetime(star.birthNs,star.deathNs)}`,'#d4dfff',star.id===selected)).join('')}${alive.length>24?'<p class="subtle">First 24 listed. More stars appear in the spatial view.</p>':''}`:'<p class="subtle">No first star is alive at this exact date. Move the fine time control forward.</p>'}
        <p class="subtle">First-star positions are stable comoving proxies near later galaxies. They do not represent measured orbits or resolved planetary systems. T = thousand, M = million, B = billion, Tr = trillion years.</p>`;
      content.innerHTML=html;
      for(const btn of content.querySelectorAll<HTMLButtonElement>('[data-select]')){
        btn.onclick=()=>select(btn.dataset.select!);
        btn.ondblclick=()=>{select(btn.dataset.select!);void explore();};
      }
      bindUniverseTravel();bindStarTracker();
      bind('explore',()=>void explore());
      return;
    }
    const alternate=alternateFuture();
    if(alternate){
      const status=alternate.stateAt(epoch);
      content.innerHTML=`<span class="kicker">ILLUSTRATIVE FUTURE</span><h2>${esc(alternate.name)}</h2>
        ${universeTravelPanel()}${starTrackerPanel(firstStarById(firstStarFocus))}
        <p>At this date: <strong>${esc(status.replaceAll('-',' '))}</strong>. The scenario ends at ${esc(readableYears(alternate.endDateNs))} after the Big Bang.</p>
        ${facts([['Transition',readableYears(BigInt(alternate.parameters.transitionYears)*YEAR_NS)],['Scenario limit',readableYears(BigInt(alternate.parameters.scenarioEndYears)*YEAR_NS)]])}
        <p class="subtle">${esc(alternate.validity)} ${esc(alternate.uncertainty)}</p>
        <p class="subtle">This branch is an explanatory projection. Galaxy and local-system physics remain the baseline model before the transition; the projected fate has no calibrated structure simulation.</p>`;
      bindUniverseTravel();bindStarTracker();return;
    }
    const future=futureStageAt(epoch);
    if(future){
      const meaning:Record<NonNullable<FutureStage>,string>={
        'stellar-decline':'Ordinary starlight has become scarce in this constant-dark-energy scenario.',
        degenerate:'Cooling stellar remnants dominate this illustrative era. Individual late populations are coarse.',
        'black-hole':'Black-hole and dilute-remnant outcomes depend on proton stability and evaporation assumptions.',
        ceiling:'The 10^100-year limit is an Atlas navigation ceiling, not a predicted end of time.',
      };
      const surviving=catalogue.filter(g=>galaxyVisibleAt(g,epoch));
      content.innerHTML=`<span class="kicker">FUTURE SCENARIO</span><h2>${esc(future.replaceAll('-',' '))}</h2>
        ${universeTravelPanel()}${starTrackerPanel(firstStarById(firstStarFocus))}
        <p>${esc(meaning[future])}</p><p class="subtle">Scenario: continued expansion with constant dark energy. Local stars and planets still follow their own lifecycle queries.</p>`;
      content.innerHTML+=`<h3>Surviving galaxies · ${surviving.length}</h3>${surviving.map(g=>item(g.id,g.name,g.type,'#91adc3',g.id===selected)).join('')}`;
      for(const btn of content.querySelectorAll<HTMLButtonElement>('[data-select]')){
        btn.onclick=()=>select(btn.dataset.select!);
        btn.ondblclick=()=>{select(btn.dataset.select!);void explore();};
      }
      const selectedGalaxy=surviving.find(g=>g.id===selected);
      if(selectedGalaxy){content.insertAdjacentHTML('afterbegin',`<button id="explore" class="explore">Explore ${esc(selectedGalaxy.name)} ↗</button>`);bind('explore',()=>void explore());}
      bindUniverseTravel();bindStarTracker();return;
    }
    const existingGalaxies=catalogue.filter(g=>viewMode==='observed'
      ? observedGalaxyAt(galaxyLifecycleFor(g),vec(g.position).length(),epoch).visible
      : galaxyVisibleAt(g,epoch));
    const g = existingGalaxies.find((g) => g.id === selected);
    html = g
      ? `<span class="kicker">${g.type.toUpperCase()}</span><h2>${esc(g.name)}</h2><div class="code">${g.id}</div>${facts(
          [
            ["Diameter", fmt(g.radiusLy * 2, 0) + " ly"],
            ["Centre X", fmt(g.position[0], 3) + " Mpc"],
            ["Centre Y", fmt(g.position[1], 3) + " Mpc"],
            ["Centre Z", fmt(g.position[2], 3) + " Mpc"],
          ],
        )}${galaxyVisibleAt(g,epoch)
          ? '<button class="explore" id="explore">Explore galaxy ↗</button>'
          : '<p class="subtle">This light was emitted before the galaxy merged. Seek to its emission era to explore its former state.</p>'}`
      : `<h2>The neighbourhood</h2><p>${viewMode==='observed'?'Approximate observed sky: galaxy light is shown from its emission date, with redshift dimming.':'State at the selected cosmic date: formed galaxies are shown in comoving map positions.'}</p>`;
    html += starTrackerPanel(firstStarById(firstStarFocus));
    html +=
      `<h3>Galaxies · ${existingGalaxies.length}</h3>` +
      existingGalaxies
        .map((g) => item(g.id, g.name, g.type, "#b4d5ef", g.id === selected))
        .join("");
    if(!existingGalaxies.length){
      const nextGalaxy=catalogue.map(g=>({g,birth:galaxyLifecycleFor(g).birthNs}))
        .filter(entry=>entry.birth>epoch).sort((a,b)=>a.birth<b.birth?-1:1)[0];
      if(nextGalaxy)html+=`<p class="subtle">No catalogue galaxy has formed at this date.</p><button id="next-galaxy">Go to first galaxy formation · ${esc(readableYears(nextGalaxy.birth))}</button>`;
    }
  }
  if (state.level === "galaxy") {
    const g = state.galaxy!;
    const lineage=galaxyLineageAt(seed,g,epoch,galaxyAddressFor(g));
    html = `<span class="kicker">${g.type.toUpperCase()}</span><h2>${esc(g.name)}</h2><p>Select a named star and approach it. Scroll over a star to zoom toward it, or switch to flight.</p>`;
    if(lineage.transferred)html+=`<p class="subtle">This galaxy merged at ${esc(readableYears(lineage.transferNs!))}. Its surviving population IDs now belong to host ${esc(lineage.hostGalaxyId)}.</p>`;
    if(firstStarFocus&&firstStarById(firstStarFocus)?.descendantGalaxyId===g.id){
      html+=starTrackerPanel(firstStarById(firstStarFocus));
      const descendants=historicalStarsForGalaxy(seed,g,galaxyAddressFor(g)).filter(star=>star.ancestryStarId===firstStarFocus);
      const activeDescendants=descendants.filter(star=>star.birthNs<=epoch&&epoch<star.deathNs);
      html+=`<p class="subtle">Modeled material lineage: ${descendants.length} later stellar population points in this galaxy; ${activeDescendants.length} alive at this date. These are distinct stars, not the first star surviving.</p>`;
    }
    if (region) {
      html += `<div class="code">S(${region.join(", ")})</div>${facts([
        ["Sector width", "32 light-years"],
        ["X centre", fmt(region[0] * 32 + 16, 0) + " ly"],
        ["Y centre", fmt(region[1] * 32 + 16, 0) + " ly"],
        ["Z centre", fmt(region[2] * 32 + 16, 0) + " ly"],
      ])}<div class="layer-control"><button id="layer-down">−</button><span>Vertical layer ${region[1]}</span><button id="layer-up">+</button></div><button id="explore" class="explore">Approach this region ↗</button>`;
    } else
      html +=
        '<button class="explore" id="suggest-sector">Approach a populated region ↗</button>';
    html += contextPanel();
    html +=
      "<h3>Physical structure</h3>" +
      facts([
        ["Diameter", fmt(g.radiusLy * 2, 0) + " ly"],
        ["Structure", g.type],
        [
          "Arms",
          g.type.includes("spiral") || g.type === "Spiral"
            ? String(g.arms)
            : "—",
        ],
      ]) +
      `<p class="subtle">This procedural lineage has ${lineage.primordialEnded} ended first-star precursors, ${lineage.historicalAlive} active older stars and ${lineage.futureAlive} active post-reference stars at this date. Its enrichment proxy is ${Math.round(lineage.enrichmentProxy*100)}%.</p>`;
    const population=space?.populationAt(epoch)||[];
    const nextPopulation=population.length?undefined:space?.nextPopulationBirthAfter(epoch);
    const chosenPopulation=space?.findPopulation(selected||'',epoch);
    if(chosenPopulation)html+=`<h3>Selected dated star</h3><div class="code">${esc(chosenPopulation.id)}</div><p>Lifespan ${esc(readableLifetime(chosenPopulation.birthNs,chosenPopulation.deathNs))}</p><button id="explore" class="explore">Visit this star ↗</button><p class="subtle">This population point has a dated location and lineage. Its planetary system is unresolved.</p>`;
    html+=`<h3>Stars alive at this date · ${population.length}</h3>${population.slice(0,32).map(star=>item(star.id,`Dated star ${star.id.split('/').at(-2)}`,`Lifespan ${readableLifetime(star.birthNs,star.deathNs)}`,star.color,star.id===selected)).join('')}${population.length>32?'<p class="subtle">First 32 listed. Select other stars in the spatial view.</p>':''}${nextPopulation?`<button id="next-dated-star">Go to next stellar birth · ${esc(readableYears(nextPopulation.birthNs))}</button>`:''}`;
  }
  if (state.level === "sector") {
    const ref =
      space?.find(selected || "") ||
      sectorData?.refs.find((r) => r.id === selected);
    html = `<span class="kicker">${esc(state.galaxy!.name)}</span><h2>Nearby star systems</h2><p>Fly freely through this part of the galaxy. Nearby stars are streamed around your position.</p>`;
    if (ref) {
      const s = system(ref);
      html += `<h2>${esc(ref.name)}</h2><div class="code">${esc(ref.id)}</div><div class="count-grid"><div>${s.stars.length}<small>stars</small></div><div>${s.planets.length}<small>planets</small></div><div>${s.moons.length}<small>moons</small></div></div><button class="explore" id="explore">Explore system ↗</button>`;
    }
    html +=
      contextPanel() +
      "<h3>Systems · " +
      fmt(sectorData!.refs.length, 0) +
      " resolved</h3>";
    if (!sectorData!.refs.length)
      html +=
        '<p class="empty">No catalogued stars in this immediate region. Keep flying or zoom out to find a denser part of the galaxy.</p>';
    html += sectorData!.refs
      .slice(0, 120)
      .map((r) =>
        item(r.id, r.name, "Stellar system", r.color, r.id === selected),
      )
      .join("");
    const population=space?.populationAt(epoch)||[];
    const nextPopulation=population.length?undefined:space?.nextPopulationBirthAfter(epoch);
    const chosenPopulation=space?.findPopulation(selected||'',epoch);
    if(chosenPopulation)html+=`<h3>Selected dated star</h3><div class="code">${esc(chosenPopulation.id)}</div><p>Lifespan ${esc(readableLifetime(chosenPopulation.birthNs,chosenPopulation.deathNs))}</p><button id="explore" class="explore">Visit this star ↗</button><p class="subtle">This population point has no resolved planetary system.</p>`;
    if(population.length)html+=`<h3>Other dated stars · ${population.length}</h3>${population.slice(0,16).map(star=>item(star.id,`Dated star ${star.id.split('/').at(-2)}`,`Lifespan ${readableLifetime(star.birthNs,star.deathNs)}`,star.color,star.id===selected)).join('')}`;
    else if(nextPopulation)html+=`<button id="next-dated-star">Go to next stellar birth · ${esc(readableYears(nextPopulation.birthNs))}</button>`;
    if (sectorData!.refs.length > 120)
      html +=
        '<p class="subtle">First 120 listed. Select other systems directly in the spatial view.</p>';
  }
  if (state.level === "system") {
    const sys = state.sys!,
      b = selected ? bodyById(selected) : null;
    html = `<span class="kicker">STELLAR SYSTEM</span><h2>${esc(sys.name)}</h2><div class="code">${esc(sys.id)}</div><div class="count-grid"><div>${sys.stars.length}<small>stars</small></div><div>${sys.planets.length}<small>planets</small></div><div>${sys.moons.length}<small>moons</small></div></div>`;
    if (b) {
      html += `<h2>${esc(b.name)}</h2><p>${esc(b.type)} · ${distance(b.radiusM)} radius</p><button class="explore" id="explore">View from orbit ↗</button>`;
      html += worldHistoryPanel(sys,b);
    }
    html +=
      `<div class="mini-buttons"><button id="system-scale">${systemScale === "overview" ? "Physical scale" : "Spaced overview"}</button><button id="play">${timeRunning() ? "Ⅱ Pause time" : flight ? "▷ Resume time (1×)" : "▷ Orbit playback"}</button><button id="epoch">Reset epoch</button><button id="bookmark">☆ Bookmark</button><button id="export">↓ Export</button></div>` +
      contextPanel() +
      "<h3>Stars</h3>" +
      sys.stars
        .map((b) => item(b.id, b.name, b.type, b.color, b.id === selected))
        .join("") +
      "<h3>Planets & moons</h3>" +
      sys.planets
        .map(
          (p) =>
            item(
              p.id,
              p.name,
              p.type + " · " + distance(p.orbit!.a),
              p.color,
              p.id === selected,
            ) +
            sys.moons
              .filter((m) => m.parentId === p.id)
              .map(
                (m) =>
                  `<div style="padding-left:14px">${item(m.id, m.name, "Moon of " + p.name, m.color, m.id === selected)}</div>`,
              )
              .join(""),
        )
        .join("");
    if (sys.belts.length)
      html +=
        "<h3>Belts</h3>" +
        sys.belts
          .map(
            (b) =>
              `<p>${esc(b.name)}<br><span class="subtle">${distance(b.innerM)} – ${distance(b.outerM)}</span></p>`,
          )
          .join("");
    html +=
      '<p class="subtle">The spaced overview separates orbital envelopes, including rings. Physical scale restores true relative positions and radii. Playback: 30 simulated days per second.</p>';
  }
  if (state.level === "body") {
    const b = state.body!,
      sys = state.sys!,
      parent = bodyById(b.parentId);
    const bodyEntry=lifecycleFor(sys,b);
    const bodySolid=bodyEntry.kind!=='star'&&planetStateAt(bodyEntry.lc,bodyEntry.starLc,epoch).stage==='solid';
    html = `<span class="kicker">${b.kind.toUpperCase()}</span><h2>${esc(b.name)}</h2><p>${esc(b.type)}</p><div class="code">${esc(b.id)}</div>${facts(
      [
        ["Radius", distance(b.radiusM)],
        ["Mass", b.massKg.toExponential(3) + " kg"],
        ["Parent", parent?.name || sys.name],
        ["Orbit semi-major axis", b.orbit ? distance(b.orbit.a) : "Barycentre"],
        ["Eccentricity", b.orbit ? fmt(b.orbit.e, 3) : "—"],
      ],
    )}<div class="mini-buttons"><button id="export">↓ Export</button><button id="bookmark">☆ Bookmark</button></div>`;
    html += worldHistoryPanel(sys,b);
    const moons = sys.moons.filter((m) => m.parentId === b.id);
    if (moons.length)
      html +=
        "<h3>Moons · " +
        moons.length +
        "</h3>" +
        moons.map((m) => item(m.id, m.name, "View moon", m.color)).join("");
    if (b.rings) html += `<p>${esc(b.name)}'s Pale Ring · ring system</p>`;
    if(bodySolid)html +=
      '<p class="subtle">Terrain flight approaches land and follows the ground at 600 m. Drag to look around; WASD or Q/E releases assistance. Free flight permits approach to 120 m over the terrain.</p>';
    if (bodySolid && b.type !== "Gas giant")
      html += `<div class="mini-buttons"><button id="approach">Approach low orbit</button><button id="descend">Descend to 10 km</button><button id="hold-orbit">${orbitAssist ? 'Release orbit' : 'Hold orbit'}</button><button id="relief">Terrain relief ×${reliefScale}</button></div><p class="subtle">The wheel adjusts flight speed. Low orbit and terrain flight retain the surrounding system. VR retains stationary model controls.</p>`;
  }
  {
    const mapped = space?.find(selected || "");
    const datedStar=space?.findPopulation(selected || "",epoch);
    const activeBodyEntry=state.level==='body'?lifecycleFor(state.sys!,state.body!):null;
    const activeBodySolid=activeBodyEntry?.kind!=='star'&&activeBodyEntry!==null&&planetStateAt(activeBodyEntry.lc,activeBodyEntry.starLc,epoch).stage==='solid';
    let surfaceNav = activeBodySolid && state.body!.type!=='Gas giant' ? `<button id="walk-surface" class="explore">${walker?'Return to flight':landing?'Cancel landing':'Land and walk'}</button><button id="terrain-flight" class="explore">Fly over terrain</button>` : '';
    if(surfaceNav){
      const life=lifeGateContext(state.sys!,state.body!,epoch);
      if(life?.floraStage==='complex'&&life.floraAvailableKinds?.length)surfaceNav+='<button id="find-life" class="explore">Find living habitat</button>';
      const sites=surveys.get(surveyKey(state.body!));
      if(atmosphereHeightM(state.body!)>0)surfaceNav+=`<button id="horizon-assist">Atmospheric horizon assist: ${horizonAssist?'on':'off'}</button>`;
      surfaceNav+=`<button id="surface-detail">Ground detail: ${surfaceDetail?'on':'off'}</button><button id="surface-lighting">Surface lighting: ${surfaceLightingEnabled?'detailed':'basic'}</button><button id="render-quality" title="Presentation only: cloud and scene resolution">Render quality: ${qualityMode==='auto'?`Auto (${RENDER_QUALITY[effectiveQuality()].label})`:RENDER_QUALITY[qualityMode].label}</button><button id="forest-detail">Trees: ${detailedForestEnabled?(forestAssetAttachment.diagnostics().loading?'loading…':'detailed'):'basic'}</button>${detailedForestEnabled&&forestAssetAttachment.diagnostics().error?'<p class="subtle">Detailed trees could not load. Basic trees remain available.</p><button id="forest-retry">Retry detailed trees</button>':''}<details id="surface-survey" ${surveyOpen?'open':''}><summary>Surface destinations</summary><p class="subtle">Find named sites on this world's existing terrain. Fly to a site, then choose Land and walk.</p>${sites?sites.map(s=>`<button data-surface-site="${esc(s.id)}" class="surface-site"><strong>${esc(s.name)}</strong><span>${esc(s.category)} · ${esc(s.biome)}<br>${fmt(s.elevationM,0)} m · slope ${fmt(s.slopeDeg,1)}°</span></button>`).join(''):`<button id="survey-surface" ${surveyPending.has(surveyKey(state.body!))?'disabled':''}>${surveyPending.has(surveyKey(state.body!))?'Surveying terrain…':'Survey surface'}</button>`}<p class="subtle">Ground materials show sand, soil, rock and snow. ${INLAND_RIVERS_UNAVAILABLE}</p></details>`;
    }
    const nav = `<div class="mini-buttons"><button id="fly-target" ${selected ? "" : "disabled"}>Fly to selection</button><button id="fly-outward">Fly outward</button><button id="toggle-flight">${flight ? "Stop flight" : "Fly freely"}</button>${mapped ? '<button id="approach-star">Approach selected star</button>' : ""}${datedStar?'<button id="visit-dated-star">Visit dated star</button>':''}</div><p class="subtle">Flight: drag to look · WASD move · Q/E down/up · wheel adjusts speed · Shift boosts · Esc stops. Touch: hold Fly forward below.</p><div class="mini-buttons"><button id="fly-forward">Hold: fly forward</button></div>`;
    if (state.level === "galaxy" && mapped)
      html =
        `<h2>${esc(mapped.name)}</h2><div class="code">${esc(mapped.id)}</div><button id="explore" class="explore">Visit this system ↗</button>` +
        html;
    html = surfaceNav + nav + html;
  }
  html +=
    '<details><summary>Seed & catalogue tools</summary><p class="code">' +
    esc(seed) +
    "<br>" +
    VERSION +
    '</p><div class="mini-buttons"><button id="verify">Verify seed</button><button id="copy">Copy view link</button></div><input id="address" placeholder="System address: G001/C…/0" aria-label="System catalogue address" style="width:100%"><button id="find-address" style="width:100%;margin-top:7px">Go to address</button><div id="bookmarks"></div></details>';
  content.innerHTML = html;
  for(const button of content.querySelectorAll<HTMLButtonElement>('[data-history-date]'))button.onclick=()=>seekDate(BigInt(button.dataset.historyDate!));
  bind('follow-planet',()=>{const body=state.body?.kind==='planet'?state.body:selected?bodyById(selected):undefined;if(body)followPlanetFromFormation(body);});
  bind('next-planet-event',nextPlanetMilestone);
  bind('stop-planet-follow',stopPlanetFollow);
  bind('leave-primordial',leaveFirstStar);
  bindStarTracker();
  const surveyElement=$('surface-survey') as HTMLDetailsElement|null;
  if(surveyElement)surveyElement.ontoggle=()=>{if(surveyElement.isConnected)surveyOpen=surveyElement.open;};
  for(const button of content.querySelectorAll<HTMLButtonElement>('[data-surface-site]'))button.onclick=()=>{
    const site=surveys.get(surveyKey(state.body!))?.find(s=>s.id===button.dataset.surfaceSite);
    if(site){exploreTerrain(vec(site.direction));announce('Flying to '+site.name+' · '+site.biome+'. Choose Land and walk on arrival.');}
  };
  content.scrollTop = 0;
  for (const btn of content.querySelectorAll<HTMLButtonElement>(
    "[data-select]",
  )) {
    btn.onclick = () => select(btn.dataset.select!);
    btn.ondblclick = () => {
      select(btn.dataset.select!);
      void explore();
    };
  }
  bind("explore", () => void explore());
  bind("toggle-flight", toggleFlight);
  bind("fly-target", beginTargetFlight);
  bind("fly-outward", flyOutward);
  bind("approach-star", () => {
    const ref =
      space?.find(selected || "") ||
      sectorData?.refs.find((r) => r.id === selected);
    if (ref)
      void navigateSpace("sector", {
        ref,
        coords: ref.cell.map((v) => Math.floor(v / 8)) as V3,
      });
  });
  bind('visit-dated-star',()=>{if(selected)visitDatedStar(selected);});
  bind('next-dated-star',()=>{const star=space?.nextPopulationBirthAfter(epoch);if(star){seekDate(star.birthNs);select(star.id);}});
  const forward = document.getElementById("fly-forward");
  if (forward) {
    forward.onpointerdown = (e) => {
      if (!flight) toggleFlight();
      touchForwardHeld = true;
      flightKeys.add("w");
    };
    forward.onpointerup = () => flightKeys.delete("w");
    forward.onpointercancel = () => flightKeys.delete("w");
  }

  bind("toggle-context", () => {
    contextVisible = !contextVisible;
    contextRoot.visible = contextVisible;
    panel();
  });
  bind("suggest-sector", () => {
    region = [Math.floor((state.galaxy!.radiusLy * 0.16) / 32), 0, 0];
    panel();
  });
  bind('next-galaxy',()=>{
    const next=catalogue.map(g=>galaxyLifecycleFor(g).birthNs).filter(t=>t>epoch).sort((a,b)=>a<b?-1:1)[0];
    if(next!==undefined)seekDate(next);
  });
  bind("layer-down", () => {
    region![1]--;
    panel();
  });
  bind("layer-up", () => {
    region![1]++;
    panel();
  });
  bind("play", toggleTime);
  bind("system-scale", () => {
    systemScale = systemScale === "overview" ? "physical" : "overview";
    void navigate("system");
  });
  bind("approach", () => {
    if (renderer.xr.isPresenting) root.scale.multiplyScalar(1.35);
    else approachPlanet(Math.max(30000, Math.min(100000, state.body!.radiusM * .03)));
  });
  bind('descend', () => approachPlanet(10000));
  bind('terrain-flight', ()=>exploreTerrain());
  bind('find-life',()=>exploreTerrain(undefined,true));
  bind('survey-surface',()=>void surveySurface());
  bind('surface-detail',()=>{surfaceDetail=!surfaceDetail;planetTiles?.setSurfaceDetail(surfaceDetail);persist();panel();});
  bind('surface-lighting',()=>{surfaceLightingEnabled=!surfaceLightingEnabled;persist();panel();});
  bind('render-quality',()=>{setRenderQuality(qualityMode==='high'?'floor':qualityMode==='floor'?'auto':'high');panel();});
  bind('forest-detail',()=>{detailedForestEnabled=!detailedForestEnabled;persist();panel();});
  bind('forest-retry',()=>forestAssetAttachment.retry());
  bind('horizon-assist',()=>{horizonAssist=!horizonAssist;persist();panel();});
  bind('walk-surface',()=>{if(walker||landing)takeoffWalk();else landOnWorld();});
  bind('hold-orbit', holdPlanetOrbit);
  bind("relief", () => {
    if (flight) toggleFlight();
    reliefScale = reliefScale === 1 ? 12 : 1;
    if (surfaceMesh && surfaceInfo) {
      applyRelief(
        surfaceMesh,
        state.body!,
        focusRadius(),
        surfaceInfo,
        reliefScale,
      );
      restartPlanetTiles();
      panel();
    }
  });
  bind("epoch", () => {
    playing = false;
    seekDate(CATALOGUE_EPOCH_NS);
    panel();
  });
  bind("export", exportData);
  bind("bookmark", bookmark);
  bind("copy", () => {
    navigator.clipboard
      ?.writeText(location.href)
      .then(() => announce("View link copied."))
      .catch(() => announce("Copy the current address from your browser."));
  });
  bind("verify", () => void verify());
  bind("find-address", () => void findAddress());
  showBookmarks();
}
function bind(id: string, f: () => void) {
  const el = document.getElementById(id);
  if (el) el.onclick = f;
}
function select(id: string) {
  selected = id;
  if(space)space.focusPopulation(null,epoch);
  panel();
  if (state.level === "universe") {
    const g = catalogue.find((x) => x.id === id);
    if(g)prewarmGalaxy(id);
    if (g) announce(g.name + " selected · double-click or press F to explore");
    else if(firstStarAtDate(id,epoch))announce('First star selected · double-click or press F to visit');
  } else
    announce(
      (space?.findPopulation(id,epoch)?'Dated star':bodyById(id)?.name ||
        sectorData?.refs.find((r) => r.id === id)?.name ||
        id) + " selected · press F to explore",
    );
}
async function explore() {
  const projectedFate=alternateFuture();
  if(projectedFate&&projectedFate.stateAt(epoch)!=='ordinary-expansion')return;
  const mapped = space?.find(selected || "");
  const datedStar=space?.findPopulation(selected || "",epoch);
  if(datedStar){visitDatedStar(datedStar.id);return;}
  if (mapped) {
    await navigate("system", {
      ref: mapped,
      coords: mapped.cell.map((v) => Math.floor(v / 8)) as V3,
    });
    return;
  }

  if (state.level === "universe") {
    const first=firstStarAtDate(selected,epoch);
    if(first){visitFirstStar(first);return;}
    const galaxy = catalogue.find((g) => g.id === selected);
    if (galaxy&&galaxyVisibleAt(galaxy,epoch)) await navigate("galaxy", { galaxy });
  } else if (state.level === "galaxy" && region)
    await navigate("sector", { coords: [...region] });
  else if (state.level === "sector") {
    const ref =
      space?.find(selected || "") ||
      sectorData?.refs.find((r) => r.id === selected);
    if (ref) await navigate("system", { ref });
  } else {
    const body = selected ? bodyById(selected) : null;
    if (body) await navigate("body", { body });
  }
}
function parent() {
  if (state.level === "body") void navigate("system");
  else if (state.level === "system") void navigate("sector");
  else if (state.level === "sector") void navigate("galaxy");
  else if (state.level === "galaxy") void navigate("universe");
}
function exportData() {
  const data = {
    seed,
    version: VERSION,
    epochSeconds: Number(epoch)/1e9,
    date:dateRecord(epoch),
    surfaceSurvey:state.body?{version:SURVEY_VERSION,sites:surveys.get(surveyKey(state.body))||[]}:null,
    identities:state.sys?[...state.sys.stars,...state.sys.planets,...state.sys.moons].map(identityRecord):[],
    stellarHistories:state.sys?.stars.map(stellarHistory),
    galaxy: state.galaxy || null,
    sector: state.coords || null,
    system: state.sys || null,
    body: state.body || null,
    galaxies: state.level === "universe" ? catalogue : undefined,
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download =
    "universe-atlas-" +
    (state.body?.name || state.sys?.name || state.galaxy?.name || "catalogue") +
    ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function bookmark() {
  let bs: any[] = [];
  try {
    bs = JSON.parse(readStored("atlas-bookmarks") || "[]");
  } catch {}
  const url = location.search;
  const title =
    state.body?.name || state.sys?.name || state.galaxy?.name || "Universe";
  bs = bs.filter((b) => b.url !== url);
  bs.unshift({ title, url });
  saveStored("atlas-bookmarks", JSON.stringify(bs.slice(0, 20)));
  showBookmarks();
  announce(title + " bookmarked.");
}
function showBookmarks() {
  const el = document.getElementById("bookmarks");
  if (!el) return;
  try {
    const bs = JSON.parse(readStored("atlas-bookmarks") || "[]");
    el.innerHTML = bs.length
      ? "<h3>Bookmarks</h3>" +
        bs
          .filter(
            (b: any) => typeof b.url === "string" && b.url.startsWith("?seed="),
          )
          .map(
            (b: any) =>
              `<p><a style="color:#9fdcd8" href="${esc(b.url)}">${esc(b.title)}</a></p>`,
          )
          .join("")
      : "";
  } catch {
    el.textContent = "";
  }
}
async function verify() {
  announce("Verifying regenerated catalogue and worker output…", true);
  try {
    const a = JSON.stringify(galaxies(seed)),
      b = JSON.stringify(galaxies(seed));
    if (a !== b) throw Error("Galaxy mismatch");
    const g = state.galaxy || catalogue[0],
      coords = state.coords || [Math.floor((g.radiusLy * 0.16) / 32), 0, 0];
    const s1 = await job("sector", { galaxy: g, coords }),
      s2 = await job("sector", { galaxy: g, coords });
    if (JSON.stringify(s1) !== JSON.stringify(s2))
      throw Error("Sector mismatch");
    if (
      s1.refs[0] &&
      JSON.stringify(system(s1.refs[0])) !== JSON.stringify(system(s2.refs[0]))
    )
      throw Error("System mismatch");
    const bytes = new TextEncoder().encode(a + JSON.stringify(s1));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hex = Array.from(new Uint8Array(digest))
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
    announce(
      "Verified · same seed, positions, names and bodies · SHA-256 " +
        hex.slice(0, 16),
    );
    return hex;
  } catch (e) {
    announce("Verification failed: " + String(e));
    throw e;
  }
}
async function findAddress() {
  const value = (
    document.getElementById("address") as HTMLInputElement
  ).value.trim();
  const g = catalogue.find((x) => value.startsWith(x.id + "/"));
  const ref = g ? refByAddress(g, value) : null;
  if (!ref) {
    announce("No system at that address in this universe seed.");
    return;
  }
  await navigate("system", {
    galaxy: g,
    coords: ref.cell.map((v) => Math.floor(v / 8)) as V3,
    ref,
  });
}
function hitTest(x: number, y: number) {
  mouse.set((x / innerWidth) * 2 - 1, (-y / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  ray.params.Points!.threshold = state.level === "galaxy" ? 0.17 : 0.18;
  return pickRay(ray);
}
function pickRay(picker: THREE.Raycaster) {
  if (residentSystem && !renderer.xr.isPresenting) {
    let best: {object:THREE.Object3D;id:string;kind:string;title:string;score:number}|null=null;
    for (const a of animations) {
      const delta=a.obj.getWorldPosition(new THREE.Vector3()).sub(picker.ray.origin);
      const d=delta.length(), along=delta.dot(picker.ray.direction);
      if (along<=0) continue;
      const angle=delta.normalize().angleTo(picker.ray.direction);
      const tolerance=Math.max(a.obj.userData.radius*a.obj.scale.x/d, .014);
      if (angle<tolerance && (!best || angle<best.score)) best={object:a.obj,id:a.body.id,kind:'body',title:a.body.name,score:angle};
    }
    if (best) return best;
  }
  if (space) {
    root.updateMatrixWorld(true);
    let best: any = null,
      score = 0.007;
    const physical = space.diagnostics().positionLy;
    const point = new THREE.Vector3(),
      delta = new THREE.Vector3();
    for (const object of [space.anchors, space.nearby]) {
      const positions = object.geometry.attributes.position,
        refs = object.userData.refs as SystemRef[];
      for (let i = 0; i < positions.count; i++) {
        if (
          object === space.nearby &&
          Math.hypot(...refs[i].position.map((v, a) => v - physical[a])) > 31
        )
          continue;
        point
          .fromBufferAttribute(positions, i)
          .applyMatrix4(object.matrixWorld);
        delta.copy(point).sub(picker.ray.origin);
        const distance = delta.length(),
          forward = delta.dot(picker.ray.direction);
        if (forward <= 0) continue;
        const angle =
          delta.addScaledVector(picker.ray.direction, -forward).length() /
          distance;
        if (angle < score) {
          score = angle;
          best = {
            object,
            id: refs[i].id,
            kind: "catalogue-star",
            title: refs[i].name,
          };
        }
      }
    }
    const cohortPositions=space.historical.geometry.getAttribute('position');
    for(let i=0;i<cohortPositions.count;i++){
      const star=space.populationAtIndex(i,epoch);
      if(!star)continue;
      point.fromBufferAttribute(cohortPositions,i).applyMatrix4(space.historical.matrixWorld);
      delta.copy(point).sub(picker.ray.origin);
      const distance=delta.length(),forward=delta.dot(picker.ray.direction);
      if(forward<=0)continue;
      const angle=delta.addScaledVector(picker.ray.direction,-forward).length()/distance;
      if(angle<score){score=angle;best={object:space.historical,id:star.id,kind:'dated-star',title:'Dated star · '+star.id};}
    }
    return best;
  }
  const hits = picker.intersectObjects(
    picks.filter(p=>p.object.visible&&p.object.parent?.visible!==false).map((p) => p.object),
    false,
  );
  if (!hits.length) return null;
  const h = hits[0],
    p = picks.find((p) => p.object === h.object)!;
  if (p.kind === "catalogue-star") {
    const ref = (h.object.userData.refs as SystemRef[])[h.index!];
    return { ...p, id: ref.id, title: ref.name };
  }
  if (p.kind === "region") {
    const v = h.object.userData.physical as Float32Array;
    const i = h.index! * 3;
    return {
      ...p,
      coords: [
        Math.floor(v[i] / 32),
        Math.floor(v[i + 1] / 32),
        Math.floor(v[i + 2] / 32),
      ] as V3,
      title: "Explore this 32 ly sector",
    };
  }
  if (p.kind === "systems") {
    const ref = sectorData!.refs[h.index!];
    return { ...p, id: ref.id, title: ref.name };
  }
  return {
    ...p,
    title:
      catalogue.find((g) => g.id === p.id)?.name ||
      bodyById(p.id)?.name ||
      p.id,
  };
}
let down = { x: 0, y: 0 },
  hoverTime = 0;
let lookDragged = false;
renderer.domElement.addEventListener("pointerdown", (e) => {
  lookDragged = false;
  down = { x: e.clientX, y: e.clientY };
  tween = null;
});
renderer.domElement.addEventListener("pointermove", (e) => {
  if (!flight || !e.buttons) return;
  lookDragged = true;
  autopilot = null;
  planetLook = null;
  freeLook(camera.quaternion, e.movementX * .003, e.movementY * .003);
  controls.target
    .copy(camera.position)
    .add(
      camera
        .getWorldDirection(new THREE.Vector3())
        .multiplyScalar(flightUnit()),
    );
});
renderer.domElement.addEventListener(
  "wheel",
  (e) => {
    if (!flight) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    flightThrottle = THREE.MathUtils.clamp(
      flightThrottle * Math.exp(-e.deltaY * 0.003),
      0.1,
      64,
    );
  },
  { capture: true, passive: false },
);
window.addEventListener("keydown", (e) => {
  if (
    !flight ||
    (e.target as HTMLElement).matches("input,textarea") ||
    ($("help-dialog") as HTMLDialogElement).open
  )
    return;
  if (e.key === "Escape") {
    if(walker){flightKeys.clear();announce('Walking paused. Drag to look or use WASD to continue.');return;}
    toggleFlight();
    return;
  }
  if (["w", "a", "s", "d", "q", "e", "shift", " "].includes(e.key.toLowerCase())) {
    e.preventDefault();
    if(e.key===' '&&!e.repeat)walker?.requestJump();
    autopilot = null;
    flightCruise=false;
    orbitAssist = null; approachAltitude = null;
    surfaceJourney=null;startCruiseAfterLook=false;
    planetLook = null;
    flightKeys.add(e.key.toLowerCase());
  }
});
window.addEventListener("keyup", (e) => flightKeys.delete(e.key.toLowerCase()));
window.addEventListener("pointerup", () => {if(touchForwardHeld){flightKeys.delete('w');touchForwardHeld=false;}});
window.addEventListener("blur", () => flightKeys.clear());
renderer.domElement.addEventListener("click", (e) => {
  if (flight && lookDragged) return;
  if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
  const h = hitTest(e.clientX, e.clientY);
  if (!h) return;
  if (h.kind === "region") {
    region = (h as any).coords;
    selected = null;
    panel();
    announce("Sector selected · double-click or Explore to resolve systems");
  } else select(h.id);
});
renderer.domElement.addEventListener("dblclick", (e) => {
  const h = hitTest(e.clientX, e.clientY);
  if (!h) return;
  if (h.kind === "region") region = (h as any).coords;
  else selected = h.id;
  void explore();
});
renderer.domElement.addEventListener("pointermove", (e) => {
  if (e.buttons || performance.now() - hoverTime < 100) return;
  hoverTime = performance.now();
  const h = hitTest(e.clientX, e.clientY);
  const el = $("hover");
  el.hidden = !h;
  if (h) {
    el.textContent = h.title;
    el.style.left = Math.min(e.clientX + 15, innerWidth - 220) + "px";
    el.style.top = e.clientY + 15 + "px";
    renderer.domElement.style.cursor = "pointer";
  } else renderer.domElement.style.cursor = "grab";
});
renderer.domElement.addEventListener("pointerleave", () => {
  $("hover").hidden = true;
});
$("generate").onclick = () => {
  const value = input.value.trim();
  if (!value) {
    announce("Enter a universe seed first.");
    return;
  }
  seed = value;
  firstStarFocus=null;primordialSeed='';
  catalogue = galaxies(seed);
  galaxyLifecycles.clear();
  lifeGateCache = null;
  clearBiosphereHistoryCache();
  void navigate("universe");
};
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("generate").click();
});
$("back").onclick = parent;
$("reset").onclick = () => {
  if (flight) toggleFlight();
  fit(homePos.clone(), false, homeTarget.clone());
};
$("collapse").onclick = () => $("panel").classList.toggle("collapsed");
$("help").onclick = () => ($("help-dialog") as HTMLDialogElement).showModal();
$("close-help").onclick = () => ($("help-dialog") as HTMLDialogElement).close();
$('time-apply').onclick=()=>{try{seekDate(yearsToDate(($('date-years') as HTMLInputElement).value));}catch(error){announce(String(error));}};
$('time-reset').onclick=()=>seekDate(CATALOGUE_EPOCH_NS);
$('time-day-back').onclick=()=>seekDate(epoch>86400_000_000_000n?epoch-86400_000_000_000n:0n);
// Contract §2.1: the navigable range is CLOSED, [0n, UNIVERSE_END_NS] — clamp
// rather than ever stepping strictly past the heat-death ceiling (the era
// track's own "Heat death proxy" checkpoint sits exactly at that ceiling, so
// a user standing on it who clicks "+1 day" must stay there, not overshoot
// into undefined territory beyond the declared range).
$('time-day-forward').onclick=()=>seekDate(epoch+86400_000_000_000n>UNIVERSE_END_NS?UNIVERSE_END_NS:epoch+86400_000_000_000n);
{
  const track=$('era-track');
  track.innerHTML=ERA_CHECKPOINTS.map((c)=>`<button type="button" data-era="${esc(c.id)}" title="${esc(c.representation)}">${esc(c.label)}</button>`).join('');
  for(const btn of track.querySelectorAll<HTMLButtonElement>('button'))
    btn.onclick=()=>{const c=ERA_CHECKPOINTS.find((e)=>e.id===btn.dataset.era)!;seekDate(c.tNs);};
  const tierSelect=$('tier-select') as HTMLSelectElement;
  tierSelect.innerHTML=PLAYBACK_TIERS.map((t)=>`<option value="${t.id}">${esc(t.label)} — ${esc(t.hint)}</option>`).join('');
  tierSelect.value=tier;
  tierSelect.onchange=()=>{tier=tierSelect.value as TierId;};
  const viewSelect=$('view-mode') as HTMLSelectElement;
  viewSelect.value=viewMode;
  viewSelect.disabled=futureScenario!=='constant-dark-energy';
  viewSelect.onchange=()=>{viewMode=viewSelect.value==='observed'?'observed':'state';
    lastVisibilityEpoch=null;updateUniverseVisibility();panel();persist();};
  const fateSelect=$('future-scenario') as HTMLSelectElement;
  fateSelect.value=futureScenario;
  fateSelect.onchange=()=>{
    futureScenario=fateSelect.value==='big-crunch'||fateSelect.value==='big-rip'
      ? fateSelect.value:'constant-dark-energy';
    viewMode='state';viewSelect.value=viewMode;
    viewSelect.disabled=futureScenario!=='constant-dark-energy';
    const fate=alternateFuture();
    if(fate&&epoch>fate.endDateNs)seekDate(fate.endDateNs);
    if(state.level!=='universe')void navigate('universe');
    priorEraPresentation='';lastVisibilityEpoch=null;
    updateDateUI();updateUniverseVisibility();updateEarlyUniverseView();panel();persist();
  };
  const fineSlider=$('fine-slider') as HTMLInputElement;
  fineSlider.oninput=()=>{
    const idx=eraIndexAt(epoch);
    seekDate(fineFractionToT(idx,Number(fineSlider.value)/1000));
  };
}
window.addEventListener("keydown", (e) => {
  if (
    (e.target as HTMLElement).matches("input,textarea") ||
    ($("help-dialog") as HTMLDialogElement).open
  )
    return;
  if (e.key === "Backspace") {
    e.preventDefault();
    parent();
  }
  if (e.key.toLowerCase() === "f") void explore();
  if (e.key === "Home") {
    e.preventDefault();
    if (flight) toggleFlight();
    fit(homePos.clone(), false, homeTarget.clone());
  }
});
addEventListener("resize", () => {
  if (renderer.xr.isPresenting) return;
  camera.aspect = innerWidth / innerHeight;
  updateCameraViewport();
  renderer.setSize(innerWidth, innerHeight);
});
function updateCameraViewport() {
  if (flight) camera.clearViewOffset();
  else camera.setViewOffset(
    innerWidth,
    innerHeight,
    innerWidth > 800 ? 130 : 60,
    0,
    innerWidth,
    innerHeight,
  );
  camera.updateProjectionMatrix();
}
renderer.domElement.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  ready = false;
  announce("Graphics context lost. Reload to restore the atlas.");
});
/** Perf-harness scripted motion (debug API only): constant-rate yaw about the
 * local vertical and constant ground speed along the level heading, holding a
 * terrain clearance or descending toward it. Driven by frame dt, so rates are
 * wall-clock constant regardless of frame pacing. */
type PerfMotion={yawRadPerS:number;speedMps:number;clearanceM:number|null;descentPerS:number;minDescentMps:number};
let perfMotion:PerfMotion|null=null;
function perfBodyRelative(){
  const center=vec(bodyPosition(state.body!,state.sys!,epoch));
  return {center,relative:vec(localPose()).sub(center)};
}
function placePerfCamera(center:THREE.Vector3,relative:THREE.Vector3){
  const next=relative.clone().add(center);
  if(next.distanceTo(systemOrigin)>128)rebaseSystem(next);
  camera.position.copy(next.sub(systemOrigin).multiplyScalar(systemUnit));
  controls.target.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(systemUnit));
}
function applyPerfMotion(dt:number){
  if(!perfMotion||!state.body||!state.sys||!flight||walker||landing||renderer.xr.isPresenting)return;
  const {center,relative}=perfBodyRelative(),up=relative.clone().normalize();
  if(perfMotion.yawRadPerS)camera.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(up,-perfMotion.yawRadPerS*dt)).normalize();
  if(perfMotion.speedMps){
    const forward=levelForward(camera.quaternion,up);
    relative.addScaledVector(forward,perfMotion.speedMps*dt);
    // Keep the view's pitch relative to the new local vertical.
    camera.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(up,relative.clone().normalize())).normalize();
  }
  if(perfMotion.clearanceM!==null){
    const info=surfaceClearance(state.body,relative.toArray() as V3,snappedWaterLevelFor(state.body));
    let clearance=perfMotion.clearanceM;
    if(perfMotion.descentPerS>0){
      const current=info.terrainClearance,rate=Math.max(perfMotion.minDescentMps,current*perfMotion.descentPerS);
      clearance=Math.max(perfMotion.clearanceM,current-rate*dt);
    }
    relative.setLength(state.body.radiusM+info.terrainElevation+clearance);
  }
  camera.up.copy(relative.clone().normalize());
  flightSpeed=Math.abs(perfMotion.speedMps);
  placePerfCamera(center,relative);
}
let last = performance.now();
let lastDateSave=0;
const projected = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  const now = performance.now(),
    elapsedSeconds = Math.max(0,(now - last) / 1000),
    dt = Math.min(elapsedSeconds, 0.1);
  frameMs = now - last;
  renderProfile.beginFrame(frameMs);
  last = now;
  if(qualityMode==='auto'&&!renderer.xr.isPresenting){
    const before=adaptiveQuality.current;
    if(adaptiveQuality.sample(frameMs,now)!==before){planetTiles?.setRenderQuality(RENDER_QUALITY[adaptiveQuality.current]);panel();}
  }
  if (ready) {
    frameCount++;
    frameTimes.push(frameMs);
    if (frameTimes.length > 600) frameTimes.shift();
  }
  if (tween && !renderer.xr.isPresenting) {
    const t = Math.min(1, (now - tween.start) / tween.duration),
      s = t * t * (3 - 2 * t);
    controls.target.lerpVectors(tween.targetFrom, tween.targetTo, s);
    if (tween.logarithmic) {
      const a = tween.from.clone().sub(tween.targetFrom),
        b = tween.to.clone().sub(tween.targetTo);
      const d = Math.exp(
        THREE.MathUtils.lerp(Math.log(a.length()), Math.log(b.length()), s),
      );
      camera.position
        .copy(controls.target)
        .add(
          a.normalize().lerp(b.normalize(), s).normalize().multiplyScalar(d),
        );
    } else camera.position.lerpVectors(tween.from, tween.to, s);
    if (t === 1) tween = null;
  }
  if (!renderer.xr.isPresenting && !flight) controls.update();
  updateExplorationClock(elapsedSeconds);
  updateFlight(dt);
  applyPerfMotion(dt);
  if (!renderer.xr.isPresenting && (flight ? camera.view?.enabled : !camera.view?.enabled)) updateCameraViewport();
  vr?.update(dt);
  renderProfile.cpu('planetUpdate',()=>updatePlanetTiles(dt));
  updateSpace();
  updateNavigationVisibility();
  updateFlightHud();
  if (renderer.xr.isPresenting) {
    if (residentSystem) {
      const far = Math.max(
        1000,
        (systemBoundary(state.sys!) + systemOrigin.length()) *
          systemUnit *
          root.scale.x *
          2,
      );
      if (camera.far !== far) {
        camera.far = far;
        camera.updateProjectionMatrix();
      }
    }
    light.position.set(-8, 12, 14);
  } else if (
    state.level === "body" &&
    surfaceInfo &&
    camera.position.distanceTo(controls.target) < focusRadius() * 2.85
  )
    void refineSurface();
  if (renderer.xr.isPresenting) {
    skyAnchor.scale.setScalar(1 / root.scale.x);
    root.updateMatrixWorld(true);
    skyAnchor.position.copy(
      root.worldToLocal(
        renderer.xr.getCamera().getWorldPosition(new THREE.Vector3()),
      ),
    );
  } else {
    skyAnchor.scale.setScalar(1);
    skyAnchor.position.copy(camera.position);
  }
  root.updateMatrixWorld(true);
  if (viewBlend?.update(now)) {
    viewBlend = null;
    ready = true;
    journey.active = false;
    journey.phase = "idle";
    journey.completed++;
    controls.enabled = !renderer.xr.isPresenting && !flight;
  }
  if (playing){
    epoch=advancePlayback(epoch,dt,tier);
    const fate=alternateFuture();
    if(fate&&epoch>=fate.endDateNs){epoch=fate.endDateNs;playing=false;}
    if(fate&&state.level!=='universe'&&fate.stateAt(epoch)!=='ordinary-expansion'){
      playing=false;clearWalking();void navigate('universe');
    }
    const followed=followedPlanet();
    if(playing&&followed&&state.sys){
      const entry=lifecycleFor(state.sys,followed);
      if(entry.kind!=='star'){
        const stage=planetStateAt(entry.lc,entry.starLc,epoch).stage;
        if(state.level==='system'&&(stage==='molten'||stage==='solid')){
          playing=false;void focusBody(followed);
          announce(`${followed.name} has formed. Continue playback to follow its later history.`);
        }else if(state.level==='body'&&(stage==='unformed'||stage==='engulfed')){
          playing=false;unfocusBody(false);
          announce(stage==='engulfed'?`${followed.name} was engulfed. Its history remains selected in the system view.`:`${followed.name} has not formed yet.`);
        }else if(state.level==='body'&&stage==='solid'&&!surfaceInfo){
          playing=false;void focusBody(followed,true);
          announce(`${followed.name} has solid ground. Continue playback to follow its later history.`);
        }
      }
    }
  }
  if(now-lastDateSave>1000){updateDateUI();if(playing&&(followedPlanetId||state.level==='universe'||firstStarFocus))panel();if(timeRunning()||walker)persist();lastDateSave=now;}
  positionSystem();
  updateOpticalStarPoints();
  if (state.level === 'universe') updateUniverseVisibility();
  updateEarlyUniverseView();
  const occluder = surfaceMesh?.getWorldPosition(new THREE.Vector3());
  const cameraRadial = occluder ? camera.position.clone().sub(occluder) : null;
  const localTerrainRadius = walker ? walker.position.length() * systemUnit : 0;
  const cameraUp = cameraRadial?.normalize();
  const occupiedLabels: {x:number;y:number}[]=[];
  for (const l of labels) {
    l.object.getWorldPosition(projected);
    let occluded = l.object === surfaceMesh;
    if (occluder && l.object !== surfaceMesh) {
      const toLabel = projected.clone().sub(camera.position), length = toLabel.length();
      const toPlanet = occluder.clone().sub(camera.position), along = toPlanet.dot(toLabel.normalize());
      const radius = Math.max(focusRadius(),localTerrainRadius);
      occluded = along > 0 && along < length && toPlanet.lengthSq() - along * along < radius * radius;
      // A walker is close enough to terrain that a label just below the local
      // horizon may miss the analytic tangent by floating-point noise.  Apply
      // it to the camera-to-label ray: context proxies do not retain a useful
      // planet-centred distance, while labels above the local horizon remain.
      if (!occluded && walker && cameraUp) {
        occluded = toLabel.dot(cameraUp) < -.001;
      }
    }
    projected.project(camera);
    const x = (projected.x * 0.5 + 0.5) * innerWidth,
      y = (-projected.y * 0.5 + 0.5) * innerHeight;
    let visible =
      !renderer.xr.isPresenting &&
      !occluded &&
      l.object.visible &&
      !(l.object.userData.context && !contextVisible) &&
      projected.z < 1 &&
      projected.z > -1 &&
      x > 12 &&
      x < innerWidth - 320 &&
      y > 132 &&
      y < innerHeight - 210;
    if(visible && occupiedLabels.some(p=>Math.abs(p.x-x)<125&&Math.abs(p.y-y)<32))visible=false;
    if(visible)occupiedLabels.push({x,y});
    l.el.style.display = visible ? "block" : "none";
    if (visible) l.el.style.transform = `translate(${x + 9}px,${y - 6}px)`;
  }
  // Lake-only planar reflection renders before the visible frame and reuses
  // existing terrain/environment; XR deliberately retains procedural sky.
  const infoAutoReset=renderer.info.autoReset;
  if(renderProfile.enabled){renderer.info.reset();renderer.info.autoReset=false;}
  // Debug-only: hide attributed systems for this render, restored below.
  const hiddenObjects:[THREE.Object3D,boolean][]=[];
  if(hiddenProfilingSystems.size&&planetTiles)for(const name of hiddenProfilingSystems)
    for(const object of planetTiles.profilingObjects(name)){hiddenObjects.push([object,object.visible]);object.visible=false;}
  try{
    // Reflections reuse the last map. Only the main scene refreshes it, once
    // per frame, including when clouds capture that scene into their target.
    renderer.shadowMap.needsUpdate=false;
    renderProfile.pass('forestAtlas',()=>planetTiles?.renderForestAtlases(renderer,renderer.xr.isPresenting));
    renderProfile.pass('lakeReflection',()=>planetTiles?.renderLakeReflection(renderer,scene,camera,renderer.xr.isPresenting));
    renderer.shadowMap.needsUpdate=light.castShadow&&!hiddenProfilingSystems.has('shadow');
    if(hiddenProfilingSystems.has('clouds')||!planetTiles?.renderCloudScene(renderer,scene,camera,renderProfile))renderProfile.pass('scene',()=>renderer.render(scene,camera));
  }finally{
    renderer.info.autoReset=infoAutoReset;
    for(let i=hiddenObjects.length-1;i>=0;i--)hiddenObjects[i][0].visible=hiddenObjects[i][1];
  }
  drawCount = renderer.info.render.calls;
  if (now - lastStats > 900) {
    lastStats = now;
    const sorted = [...frameTimes].sort((a, b) => a - b),
      p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    $("performance").textContent =
      `${state.level.toUpperCase()} · ${drawCount} draws · p95 ${p95.toFixed(0)} ms`;
  }
  let systems:Parameters<RenderProfile['endFrame']>[2];
  if(renderProfile.enabled){
    // Non-overlapping per-system CPU attribution for this frame.
    const t=systemTimer.take(),cpu=(name:string)=>renderProfile.frameCpuMs(name),v=(name:string)=>t[name]??0;
    const renderCpu=cpu('forestAtlas')+cpu('lakeReflection')+cpu('scene')+cpu('sceneCapture');
    const planetParts=v('sky')+v('clouds')+v('forestTotal')+v('rocks')+v('lifeScatter')+v('flora')+v('fauna');
    systems={terrainTiles:Math.max(0,v('planetUpdate')-planetParts),sky:v('sky'),forest:Math.max(0,v('forestTotal')-v('canopy')),canopy:v('canopy'),
      flora:v('flora'),lifeScatter:v('lifeScatter'),fauna:v('fauna'),rocks:v('rocks'),
      clouds:v('clouds')+cpu('cloudIntegration')+cpu('cloudResolve'),submission:Math.max(0,renderCpu-v('shadow')),shadow:v('shadow')};
  }
  renderProfile.endFrame(drawCount,renderer.info.render.triangles,systems);
});
async function boot() {
  const q = new URLSearchParams(location.search);
  const requestedFollow=q.get('follow');
  const compatibilityNotice=compatibilityNoticeFromUrl(q);
  const notice=$('compat-notice');
  notice.hidden=!compatibilityNotice;
  if(compatibilityNotice)notice.textContent=compatibilityNotice;
  const g = catalogue.find((x) => x.id === q.get("g"));
  await navigate("universe");
  const firstStarId=q.get('firstStar');
  if(firstStarId){const first=firstStarById(firstStarId);if(first)visitFirstStar(first);}
  if(alternateFuture()?.stateAt(epoch)!=='ordinary-expansion'&&alternateFuture())return;
  if (!g) return;
  const sc = q.get("sector")?.split(",").map(Number);
  const coords =
    sc?.length === 3 &&
    sc.every(
      (v) => Number.isSafeInteger(v) && Math.abs(v) * 32 < g.radiusLy * 1.5,
    )
      ? (sc as V3)
      : undefined;
  const ref = q.get("system") ? refByAddress(g, q.get("system")!) : null;
  if (ref) {
    const sys = system(ref),
      b = [...sys.stars, ...sys.planets, ...sys.moons].find(
        (b) => b.id === q.get("body"),
      );
    // A legacy ?river= address is deliberately ignored: inland rivers are
    // withdrawn, so it opens the ordinary body view. compatibilityNoticeFromUrl
    // (above) tells the visitor why; persist() then drops the parameter.
    await navigate(b ? "body" : "system", {
      galaxy: g,
      coords: coords || (ref.cell.map((v) => Math.floor(v / 8)) as V3),
      ref,
      sys,
      body: b,
    });
    const saved=q.get('walk')?.split(',').map(Number),heading=q.get('heading')?.split(',').map(Number);
    if(b&&saved?.length===3&&saved.every(Number.isFinite)&&Math.abs(Math.hypot(...saved)-b.radiusM)<30000){
      const savedHeading=heading?.length===4&&heading.every(Number.isFinite)?new THREE.Quaternion().fromArray(heading).normalize():undefined;
      if(savedHeading)camera.quaternion.copy(savedHeading);
      void prepareLanding(saved as V3,false,savedHeading);
    }
  } else if (coords) await navigate("sector", { galaxy: g, coords });
  else await navigate("galaxy", { galaxy: g });
  if(requestedFollow&&state.sys?.planets.some(body=>body.id===requestedFollow)){
    followedPlanetId=requestedFollow;
    if(state.level==='system')selected=requestedFollow;
    panel();persist();
  }
  const cohortId=q.get('cohort');
  if(cohortId&&space?.findPopulation(cohortId,epoch))visitDatedStar(cohortId);
}
// Diagnostics and an explicit rendering freeze used by browser acceptance tests.
Object.defineProperty(window, "__atlas", {
  value: {
    async loadForestTreeAssets(lod0:ArrayBuffer,lod1:ArrayBuffer,options:import('./tree-asset.ts').TreeAssetOptions={}){
      if(!import.meta.env.DEV)throw new Error('Experimental forest assets require a development build');
      if(!planetTiles)throw new Error('Visit a planet before loading forest assets');
      return planetTiles.loadForestTreeAssets(lod0,lod1,options);
    },
    clearForestTreeAssets(){planetTiles?.clearForestTreeAssets();},
    // Acceptance probes: LOD1 -> far-atlas hand-off override and forest colour
    // isolation (presentation only), and a vertical launch from the walker to
    // an exact terrain clearance (the "Return to flight" path, default 160 m).
    forestDebug(options:{middleHandoffM?:number|null;hideColour?:boolean}){return planetTiles?.forestDebug(options)??null;},
    // First terrain hit (m) of body-local rays; null beyond maxM. Acceptance
    // image banding only (renders nothing, changes nothing).
    surfaceRays(origin:V3,directions:V3[],maxM=4000){
      const body=state.body;if(!body||body.kind==='star')return null;
      const height=(p:THREE.Vector3)=>p.length()-body.radiusM-(surfaceSample(body,p.clone().normalize().toArray() as V3)?.rockHeightM??0);
      return directions.map(d=>{
        const o=vec(origin),dir=vec(d).normalize(),p=new THREE.Vector3();let t=0,step=2;
        while(t<maxM){
          const next=t+step;p.copy(o).addScaledVector(dir,next);
          if(height(p)<=0){let lo=t,hi=next;for(let i=0;i<14;i++){const mid=(lo+hi)/2;p.copy(o).addScaledVector(dir,mid);if(height(p)<=0)hi=mid;else lo=mid;}return hi;}
          t=next;step=Math.max(2,t*.02);
        }
        return null;
      });
    },
    launchTo(clearanceM:number){
      if(!walker||!state.body||!(Number.isFinite(clearanceM)&&clearanceM>=2&&clearanceM<=5000))throw new Error('launchTo needs a grounded walker and 2-5000 m');
      const relative=vec(localPose()).sub(vec(bodyPosition(state.body,state.sys!,epoch)));
      clearWalking();landing={point:relative.toArray() as V3,launch:true,clearanceM};panel();
    },
    // Whole-population forest census for acceptance replays (explicit call).
    forestPresentationCensus(){return planetTiles?.forestPresentationCensus()??null;},
    // Canonical surface-rock census around the current ground focus.
    rockCensus(){return planetTiles?.rockCensus()??null;},
    // Stage-by-stage trace of canonical fauna individuals in the last frame.
    faunaTrace(ids:string[]){return planetTiles?.faunaTrace(ids)??null;},
    // Drawn rocks (sorted id@lod), drawn-rock ground/water probe, and the
    // per-frame rock CPU work history. Explicit acceptance calls only.
    rockPublished(){return planetTiles?.publishedRocks()??null;},
    rockProbe(limit=64){return planetTiles?.rockProbe(limit)??null;},
    rockWork(){return planetTiles?.rockWork()??null;},
    resetRockWork(){planetTiles?.resetRockWork();},
    async loadForestTreeFamilies(inputs:readonly import('./forest-tree-family-library.ts').ForestTreeFamilyInput[],options:import('./tree-asset.ts').TreeAssetOptions={}){
      if(!import.meta.env.DEV)throw new Error('Experimental forest assets require a development build');
      if(!planetTiles)throw new Error('Visit a planet before loading forest assets');
      return planetTiles.loadForestTreeFamilies(inputs,options);
    },
    setProfiling(enabled:boolean){renderProfile.setEnabled(enabled);},
    resetProfile(){renderProfile.clear();},
    /** Desktop render-quality profile: 'high' (default), 'floor' or opt-in 'auto'. */
    setRenderQuality(mode:RenderQualityMode){
      if(mode!=='auto'&&!(mode in RENDER_QUALITY))throw new Error(`Unknown render quality ${mode}; expected ${[...Object.keys(RENDER_QUALITY),'auto'].join(', ')}`);
      setRenderQuality(mode);return {mode,...RENDER_QUALITY[effectiveQuality()]};
    },
    setCloudSceneSamples(samples:0|2|4){
      if(![0,2,4].includes(samples))throw new Error('Scene samples must be 0, 2 or 4');
      planetTiles?.setCloudSceneSamples(samples);
    },
    get renderProfile(){return renderProfile.diagnostics();},
    // Desktop perf harness (docs/desktop-perf-harness-2026-09-29.md).
    setProfileHistory(limit:number){renderProfile.setHistoryLimit(limit);},
    renderProfileSamples(names:string[]){return renderProfile.samples(names);},
    get profilingSystems(){return [...PROFILING_SYSTEMS];},
    /** Debug GPU attribution: hide one system for rendering only (frozen pose). */
    setSystemVisible(name:string,visible:boolean){
      if(!(PROFILING_SYSTEMS as readonly string[]).includes(name))throw new Error(`Unknown profiling system ${name}; expected ${PROFILING_SYSTEMS.join(', ')}`);
      if(visible)hiddenProfilingSystems.delete(name);else hiddenProfilingSystems.add(name);
      return [...hiddenProfilingSystems];
    },
    get hiddenSystems(){return [...hiddenProfilingSystems];},
    /** Exact free-flight pose (perf harness): body-relative metres + camera quaternion. */
    /** Frozen perf pose: body-relative metres + camera quaternion. With
     * `clearanceM` the position is snapped radially to the app's own terrain
     * (so harness poses do not depend on a Node-side terrain replica). */
    setPose(position:V3,heading:[number,number,number,number],clearanceM?:number){
      if(!state.body||!state.sys||state.level!=='body')throw new Error('setPose needs a focused body');
      if(position?.length!==3||!position.every(Number.isFinite)||heading?.length!==4||!heading.every(Number.isFinite))throw new Error('setPose(position[3], heading[4])');
      if(renderer.xr.isPresenting)throw new Error('setPose is desktop-only');
      clearWalking();
      if(!flight)toggleFlight();
      autopilot=null;orbitAssist=null;surfaceJourney=null;planetLook=null;approachAltitude=null;tween=null;flightCruise=false;
      startCruiseAfterLook=false;landAfterCruise=false;flightKeys.clear();
      const center=vec(bodyPosition(state.body,state.sys,epoch)),relative=vec(position);
      if(typeof clearanceM==='number'&&Number.isFinite(clearanceM))
        relative.setLength(state.body.radiusM+surfaceClearance(state.body,relative.toArray() as V3,snappedWaterLevelFor(state.body)).terrainElevation+clearanceM);
      rebaseSystem(relative.clone().add(center));camera.position.set(0,0,0);
      camera.quaternion.fromArray(heading).normalize();camera.up.copy(relative.clone().normalize());
      placePerfCamera(center,relative);
      return {position:localPose().map((v,i)=>v-center.toArray()[i]),heading:camera.quaternion.toArray()};
    },
    /** Scripted constant-rate motion; null stops it. Degrees and metres. */
    setPerfMotion(motion:{yawDegPerS?:number;speedMps?:number;clearanceM?:number|null;descentPerS?:number;minDescentMps?:number}|null){
      if(!motion){perfMotion=null;return null;}
      const finite=(v:unknown,fallback:number)=>typeof v==='number'&&Number.isFinite(v)?v:fallback;
      perfMotion={yawRadPerS:finite(motion.yawDegPerS,0)*Math.PI/180,speedMps:finite(motion.speedMps,0),
        clearanceM:motion.clearanceM===undefined||motion.clearanceM===null?null:finite(motion.clearanceM,0),
        descentPerS:finite(motion.descentPerS,0),minDescentMps:finite(motion.minDescentMps,0)};
      return {...perfMotion};
    },
    /** Every active quality setting that shapes desktop frame cost. */
    qualitySettings(){
      const gl=renderer.getContext(),attributes=gl.getContextAttributes(),tiles=planetTiles?.diagnostics();
      return {
        url:{trees:detailedForestEnabled,detail:surfaceDetail,lighting:surfaceLightingEnabled,horizon:horizonAssist,observed:viewMode==='observed',reliefScale},
        renderer:{pixelRatio:renderer.getPixelRatio(),devicePixelRatio,pixelRatioCap:1.7,cssViewport:[innerWidth,innerHeight],
          drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],antialias:attributes?.antialias??null,logarithmicDepthBuffer:true,
          toneMapping:renderer.toneMapping,toneMappingExposure:renderer.toneMappingExposure,shadowMapEnabled:renderer.shadowMap.enabled,
          shadowMapType:renderer.shadowMap.type,shadowCasterLight:light.castShadow,anisotropy:Math.min(8,renderer.capabilities.getMaxAnisotropy()),
          maxAnisotropy:renderer.capabilities.getMaxAnisotropy(),xr:renderer.xr.isPresenting},
        renderQuality:{mode:qualityMode,...RENDER_QUALITY[effectiveQuality()],clouds:{...RENDER_QUALITY[effectiveQuality()].clouds},adaptive:qualityMode==='auto'?adaptiveQuality.diagnostics():null},
        clouds:tiles?.clouds??null,
        forestAssets:forestAssetAttachment.diagnostics(),
        surfaceLighting:{enabled:surfaceLightingEnabled,...surfaceLighting.diagnostics()},
        shadowCache:shadowCache.diagnostics(),
        shadowWarmup:{...shadowWarmup.stats},
        hiddenSystems:[...hiddenProfilingSystems],
        ...staticQualitySettings(),
      };
    },
    /** Cheap sample for perf time series: backlog, heap, pose. */
    perfSample(){
      const memory=(performance as unknown as {memory?:{usedJSHeapSize:number;totalJSHeapSize:number;jsHeapSizeLimit:number}}).memory;
      return {t:performance.now(),frame:frameCount,backlog:planetTiles?.backlog()??null,
        heap:memory?{used:memory.usedJSHeapSize,total:memory.totalJSHeapSize,limit:memory.jsHeapSizeLimit}:null,
        position:localPose(),heading:camera.quaternion.toArray(),walking:!!walker,flight,
        clearanceM:state.body&&state.sys?surfaceClearance(state.body,perfBodyRelative().relative.toArray() as V3,snappedWaterLevelFor(state.body)).terrainClearance:null};
    },
    shoreDebug(options:import('./planet-renderer.ts').ShoreDebug){planetTiles?.setShoreDebug(options);},
    get date(){return dateRecord(epoch);},
    // Package D diagnostics (contract §6.4): a pure function of the current
    // `t` and the resident system's real catalogue bodies, shared with
    // tests/time-nav.test.mjs and tests/time-integration.test.mjs's
    // `canonicalDigest` so the browser-shipped app and the Node tests use the
    // exact same digest — used to assert t-seek independence (direct seek vs
    // reaching the same t via playback stepping) at the app level.
    get existenceDigest(){
      if(!state.sys)return null;
      const sys=state.sys;
      return canonicalDigest(Object.fromEntries([...sys.stars,...sys.planets,...sys.moons].map((b)=>{
        const entry=lifecycleFor(sys,b);
        if(entry.kind==='star')return [b.id,starStateAt(entry.lc,epoch).stage];
        const st=planetStateAt(entry.lc,entry.starLc,epoch);
        let bio:string|null=null;
        if(st.stage==='molten'||st.stage==='solid')
          bio=biosphereStateAt(seed,b.id,b,epoch,'baseline',CURRENT_VERSIONS,entry.starLc,
            b.kind==='moon'?sys.planets.find((p)=>p.id===b.parentId):undefined).stage;
        return [b.id,{stage:st.stage,biosphere:bio}];
      })));
    },
    // Flora/fauna wiring diagnostic (this task): exposes the exact
    // `LifeGateContext` `updatePlanetTiles` is passing into `PlanetRenderer.
    // update()`'s 9th argument for the currently-loaded body, so a test/probe
    // can confirm whether a given world/time is expected to render any life
    // at all (`null`/empty `floraAvailableKinds` = correctly nothing drawn)
    // without duplicating `lifeGateContext`'s own `biosphereStateAt` call.
    get lifeGate(){
      if(!state.sys||!state.body)return null;
      return lifeGateContext(state.sys,state.body,epoch);
    },
    // Stellar visual evolution diagnostic (this task): the resident system's
    // primary star's actually-rendered visual state, so a test can seek to
    // two different lifecycle stages and assert the mesh/light genuinely
    // changed -- not just that `starStateAt(...).stage` changed internally.
    get starVisual(){
      if(!state.sys)return null;
      const star=state.sys.stars[0];
      const entry=animations.find((a)=>a.body.id===star.id);
      if(!entry)return null;
      const mesh=entry.obj as THREE.Mesh<THREE.SphereGeometry,THREE.MeshBasicMaterial>;
      return {
        radiusScale:mesh.scale.x,
        colorHex:mesh.material.color.getHexString(),
        lightIntensity:light.intensity,
        lightColorHex:light.color.getHexString(),
      };
    },
    get surfaceLighting(){return {enabled:surfaceLightingEnabled,...surfaceLighting.diagnostics()};},
    get shadowCache(){return shadowCache.diagnostics();},
    /** Debug-only handles for render-cost experiments (probe scripts). */
    renderDebug(){return {renderer,scene,camera,light,planet:planetTiles};},
    /** Debug: false re-renders the shadow map every frame (the pre-cache behaviour). */
    setShadowCache(enabled:boolean){shadowCache.enabled=!!enabled;shadowCache.invalidate();return shadowCache.diagnostics();},
    get forestAssets(){return {...forestAssetAttachment.diagnostics(),source:forestAssetSource.diagnostics()};},
    get era(){
      const idx=eraIndexAt(epoch);
      return {id:eraCheckpoint(idx).id,label:eraCheckpoint(idx).label,tNs:eraCheckpoint(idx).tNs.toString(),
        next:nextEraCheckpoint(epoch).id,prev:prevEraCheckpoint(epoch).id,trackFraction:eraTrackFraction(epoch)};
    },
    get tier(){return tier;},
    set tier(value:string){if(PLAYBACK_TIERS.some((t)=>t.id===value))tier=value as TierId;},
    get versions(){return CURRENT_VERSIONS;},
    seek:(t:string)=>{
      const parsed=parseDate(t);
      if(parsed<0n||parsed>UNIVERSE_END_NS) throw new Error(`seek: t out of range [0, UNIVERSE_END_NS]: ${t}`);
      seekDate(parsed);
    },
    setPlaying:(value:boolean)=>{playing=value;explorationPaused=!value;},
    setExplorationPaused:(value:boolean)=>{explorationPaused=value;playing=false;},
    get surfaceSurvey(){return state.body?surveys.get(surveyKey(state.body))||null:null;},
    get drainage(){return null;},
    // Inland rivers are withdrawn (inland-rivers.ts): never report a region.
    get river(){return null;},
    get state() {
      return state;
    },
    get seed() {
      return seed;
    },
    get ready() {
      return ready;
    },
    get transition() {
      return {
        ...journey,
        progress: viewBlend?.progress || 0,
        retainedViews: viewBlend ? 1 : 0,
      };
    },
    get travel() {
      return {
        walking:walker?.diagnostics()||null,
        landing:!!landing,
        active: flight,
        domain: flightDomain,
        speed: flightSpeed,
        throttle: flightThrottle,
        clearance: flightClearance,
        position: localPose(),
        cameraNear: camera.near,
        cameraFar: camera.far,
        systemUnit,
        renderOriginM:systemOrigin.toArray(),
        cameraOffsetM:camera.position.length()/systemUnit,
        explorationClock:{paused:explorationPaused,running:flight&&!explorationPaused&&!playing,rate:1},
        terrainSweep:lastFlightSweep,
        focusRadiusM: state.level === 'body' ? focusRadius() : null,
        heading: camera.quaternion.toArray(),
        crossings,
        crossing: !!crossing,
        autopilot,
        cruise:flightCruise,
        orbitAssist: orbitAssist ? {bodyId: orbitAssist.bodyId, axis: orbitAssist.axis.toArray()} : null,
        terrainCruise: orbitAssist?.clearanceM || null,
        horizonAssist,alignment:flightAlignment,
        surfaceJourney: !!surfaceJourney,
        approachAltitude,
        flightAim,
        surface: state.body ? surfaceClearance(state.body, localPose().map((v,i)=>v-bodyPosition(state.body!,state.sys!,epoch)[i]) as V3, snappedWaterLevelFor(state.body)) : null,
        sceneId: root.uuid,
        residentSystem,
        bodies: animations.map((a) => ({
          id: a.body.id,
          objectId: a.obj.uuid,
          positionM: bodyPosition(a.body, a.sys, epoch),
        })),
      };
    },
    get space() {
      return space
        ? { ...space.diagnostics(), flight, speedLyPerSecond: flightSpeed }
        : null;
    },
    get mapTargets() {
      if (!space) return [];
      return space.refs
        .slice(0, 500)
        .map((ref) => {
          const p = space!
            .world(ref.position)
            .applyMatrix4(root.matrixWorld)
            .project(camera);
          return {
            id: ref.id,
            name: ref.name,
            position: ref.position,
            x: (p.x * 0.5 + 0.5) * innerWidth,
            y: (0.5 - p.y * 0.5) * innerHeight,
            z: p.z,
          };
        })
        .filter(
          (p) =>
            p.z > 0 &&
            p.z < 1 &&
            p.x > 200 &&
            p.x < innerWidth - 350 &&
            p.y > 180 &&
            p.y < innerHeight - 280,
        );
    },
    get navigationTargets() {
      const list = state.level==='universe'
        ? galaxyGlyphs.map((g,i)=>({id:catalogue[i].id,kind:'galaxy',object:g.group,pixels:44}))
        : animations.map(a=>({id:a.body.id,kind:a.body.kind,object:a.obj,pixels:a.body.kind==='star'?18:a.body.kind==='moon'?7:10}));
      return list
        .filter(t=>t.object.visible)
        .map(t=>{const p=t.object.getWorldPosition(new THREE.Vector3()).project(camera);return {id:t.id,kind:t.kind,pixels:t.pixels,x:(p.x*.5+.5)*innerWidth,y:(.5-p.y*.5)*innerHeight,z:p.z};});
    },
    get selected() {
      return selected;
    },
    // Read-only visual acceptance data; pixel tests still inspect screenshots.
    get appearance() {
      const ref=space?.find(selected||'');
      const primary=opticalStarPoints[0];
      const position=ref?space!.world(ref.position).applyMatrix4(root.matrixWorld)
        :primary?.mesh.getWorldPosition(new THREE.Vector3());
      const distanceLy=ref?vec(ref.position).distanceTo(vec(localPose()))
        :position?position.distanceTo(camera.position)/systemUnit/LY:null;
      const projected=position?.clone().project(camera);
      return {
        target:projected&&distanceLy!==null?{id:ref?.id||state.sys?.id,distanceLy,
          x:(projected.x*.5+.5)*innerWidth,y:(.5-projected.y*.5)*innerHeight,
          pointDiameter:ref?starPointDiameter(distanceLy,displayLuminosity(ref))
            :primary!.point.material.uniforms.pointSize.value/renderer.getPixelRatio()}:null,
        galaxyPreview:galaxyGlyphs.filter(g=>g.preview).map(g=>({id:g.galaxy.id,
          radii:g.group.position.distanceTo(camera.position)/g.radius,
          mix:(g.preview!.anchors.material as THREE.ShaderMaterial).uniforms.alpha.value,
          stars:g.preview!.refs.length})),
        markerVisibility:systemMarkers?Array.from(systemMarkers.points.geometry.getAttribute('visibility').array):[],
      };
    },
    get frameCount() {
      return frameCount;
    },
    get stats() {
      return {
        draws: drawCount,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        pending: pending.size,
        frameTimes: [...frameTimes],
      };
    },
    get context() {
      return {
        ...contextStats,
        visible: contextRoot.visible,
        skyPosition: skyAnchor.position.toArray(),
      };
    },
    get vr() {
      return vr?.diagnostics();
    },
    get systemView() {
      return displayLayout
        ? {
            mode: systemScale,
            epoch:Number(epoch)/1e9,
            bodies: animations.map((a) => ({
              position: a.obj.position.toArray(),
              ...displayLayout!.records[a.body.id],
            })),
          }
        : null;
    },
    get terrain() {
      return surfaceInfo
        ? {
            version: surfaceInfo.version,
            width: surfaceInfo.width,
            segments: surfaceInfo.segments,
            reliefScale,
            landFraction: surfaceInfo.landFraction,
            vertices: surfaceMesh?.geometry.attributes.position.count,
            refining: refiningSurface,
            tiles: planetTiles?.diagnostics() || null,
          }
        : null;
    },
    get camera() {
      return {
        animating:!!tween,
        fov: camera.fov,
        near: camera.near,
        far: camera.far,
        viewOffset: camera.view?.enabled ? camera.view.offsetX : 0,
        position: camera.position.toArray(),
        target: controls.target.toArray(),
      };
    },
    verify,
  },
  writable: false,
});
function vrMenu(): VRMenu {
  const title = $("view-title").textContent || "Universe Atlas";
  const detail = selected
    ? (space?.find(selected)?.name ||
        bodyById(selected)?.name ||
        sectorData?.refs.find((r) => r.id === selected)?.name ||
        catalogue.find((g) => g.id === selected)?.name ||
        "") + " selected"
    : state.level.toUpperCase() + " · " + seed;
  let rows: VRMenu["rows"] = [];
  if (state.level === "universe")
    rows = catalogue.map((g) => ({
      title: g.name,
      detail: g.type,
      action: () => select(g.id),
    }));
  if (state.level === "galaxy")
    rows = [
      {
        title: region ? nameSector(region) : "Approach a populated region",
        detail: "Or select a named star below or in the model",
        action: () => {
          region ||= [Math.floor((state.galaxy!.radiusLy * 0.16) / 32), 0, 0];
          selected = null;
          void explore();
        },
      },
      ...(space?.refs.slice(0, 120) || []).map((ref) => ({
        title: ref.name,
        detail: ref.id,
        action: () => select(ref.id),
      })),
    ];
  if (state.level === "sector")
    rows = (sectorData?.refs || []).slice(0, 120).map((r) => ({
      title: r.name,
      detail: r.id,
      action: () => select(r.id),
    }));
  if (state.level === "system")
    rows = [
      ...state.sys!.stars,
      ...state.sys!.planets,
      ...state.sys!.moons,
    ].map((b) => ({
      title: b.name,
      detail: b.type,
      action: () => select(b.id),
    }));
  if (state.level === "body")
    rows = [
      {
        title: state.body!.name,
        detail:
          state.body!.type + " · " + distance(state.body!.radiusM) + " radius",
        action: () => vr?.reset(),
      },
      ...state
        .sys!.moons.filter((m) => m.parentId === state.body!.id)
        .map((m) => ({
          title: m.name,
          detail: "Explore moon",
          action: () => void navigate("body", { body: m }),
        })),
    ];
  if (state.level === "system") {
    const activeTier = PLAYBACK_TIERS.find((t) => t.id === tier) ?? PLAYBACK_TIERS[1];
    rows.push(
      {
        title:
          systemScale === "overview"
            ? "Switch to physical scale"
            : "Switch to spaced overview",
        detail: "Change distance and radius presentation",
        action: () => document.getElementById("system-scale")?.click(),
      },
      {
        title: playing ? "Pause" : "Play",
        detail: activeTier.label + " — " + activeTier.hint,
        action: () => document.getElementById("play")?.click(),
      },
    );
  }
  if (
    state.level === "body" &&
    state.body!.kind !== "star" &&
    state.body!.type !== "Gas giant"
  )
    rows.unshift(
      {
        title: "Approach orbit",
        detail: "Bring the planet closer for terrain inspection",
        action: () => document.getElementById("approach")?.click(),
      },
      {
        title: "Terrain relief ×" + reliefScale,
        detail: "Toggle physical / exaggerated elevation",
        action: () => document.getElementById("relief")?.click(),
      },
    );
  return {
    key:
      state.level +
      ":" +
      (state.body?.id ||
        state.sys?.id ||
        state.coords?.join(",") ||
        state.galaxy?.id ||
        seed),
    title,
    detail,
    rows,
    actions: [
      { title: "← Back", action: parent },
      { title: "Fit model", action: () => vr?.reset() },
      { title: "Explore selection", action: () => void explore() },
      { title: "Exit VR", action: () => void renderer.xr.getSession()?.end() },
    ],
  };
}
vr = new AtlasVR(renderer, scene, camera, {
  root: () => root,
  menu: vrMenu,
  start: () => {
    clearWalking();
    flight = false;
    orbitAssist = null; approachAltitude = null; planetLook = null; autopilot = null;
    surfaceJourney=null;startCruiseAfterLook=false;
    flightKeys.clear();
    camera.near = 0.02;
    camera.updateProjectionMatrix();
    if (viewBlend) {
      viewBlend.finish();
      viewBlend = null;
      ready = true;
      journey.active = false;
      journey.phase = "idle";
    }
    tween = null;
    controls.enabled = false;
    playing = false;
    announce("VR · use the in-world panel and controller triggers");
  },
  end: () => {
    camera.far = residentSystem
      ? Math.max(1000, (systemBoundary(state.sys!) + systemOrigin.length()) * systemUnit * 4)
      : 1000;
    camera.near = residentSystem
      ? focusRadius() * 0.0001
      : space
        ? space.scale * 0.02
        : 0.02;
    camera.updateProjectionMatrix();
    if (viewBlend) {
      viewBlend.finish();
      viewBlend = null;
      ready = true;
      journey.active = false;
      journey.phase = "idle";
    }
    controls.enabled = ready;
    fit(homePos.clone(), true, homeTarget.clone());
    if (state.level === "body" && state.body!.kind !== "star")
      light.position.copy(
        vec(bodyPosition(state.sys!.stars[0], state.sys!))
          .sub(vec(bodyPosition(state.body!, state.sys!)))
          .normalize()
          .multiplyScalar(12),
      );
    else light.position.set(-12, 5, 10);
    announce("Returned to desktop view");
  },
  status: announce,
  pick: (picker, activate) => {
    const h = pickRay(picker);
    if (!h) return "";
    if (activate) {
      if (h.kind === "region") {
        region = (h as any).coords;
        panel();
      } else if (selected === h.id) void explore();
      else select(h.id);
    }
    return h.title;
  },
});
void boot();
