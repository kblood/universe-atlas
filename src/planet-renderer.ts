import * as THREE from 'three';
import { AU, type Body, type V3 } from './catalog.ts';
import { children, tileDirection, closestTileDirection, tileKey, directionTile, tileNeighbour, PATCH_SEGMENTS, type Tile, type buildTile } from './planet-tiles.ts';
import {terrainSampler, DEFAULT_SURFACE_AGE_MYR} from './terrain.ts';
import { PlanetAtmosphere } from './planet-atmosphere.ts';
import {RiverWater} from './river-water.ts';
import {LakeReflection} from './lake-reflection.ts';
import {createOceanWaterMaterial,setOceanWaterPatchFrame,type OceanWaterMaterial} from './ocean-water-material.ts';
import {hashSeedString,oceanPhaseSeconds} from './ocean-gerstner.ts';
import {oceanPatchCullProof} from './ocean-patch-culling.ts';
import {SHARED_WATER_NORMAL_ATLAS_BYTES} from './water-normal-atlas.ts';
import {RiverEnvironment} from './river-environment.ts';
import {contactGeometry,type ContactPatch} from './terrain-contact.ts';
import {hydrologyReady} from './hydrology-registry.ts';
import type {RiverRegion} from './river-types.ts';
import {riverFeatureAt} from './river-sample.ts';
import {detailTexture,detailOrigin,MATERIAL_VERSION,groundVertexHeader,groundVertex,groundFragmentHeader,groundColor,groundNormalCode} from './ground-material.ts';
import {createCloudShell, type CloudShell} from './planet-clouds.ts';
import {ringSystemFor, ringActiveAt, createRingMesh, type RingSystem} from './planet-rings.ts';
import {spinStateFor} from './stellar-evolution.ts';
import {CATALOGUE_EPOCH_NS} from './world-time.ts';
import {floraAt, toMyr, buildFloraGeometryData, floraGeometryToBufferGeometry, FLORA_KIND_NAMES, type FloraKind, type FloraBiosphereGate, type FloraBiomeSample, type FloraStage} from './flora-field.ts';
import {FloraFieldRenderer, FloraCandidateBuffer, FloraLodBucket, packCullPlane, pickFloraLodBand, DEFAULT_FRUSTUM_PLANE_COUNT} from './flora-culling.ts';
import {faunaHerdAt, faunaMemberPoseAtWorldNs, faunaRigSecondsAt, faunaMemberGenome, faunaGroundedTransform, createFaunaSkinnedRig, buildFaunaProxyGeometryData, buildFaunaImpostorGeometryData, faunaGeometryToBufferGeometry, pickFaunaLodBand, FAUNA_LOD0_MAX_CONCURRENT_RIGS, toSeconds, type FaunaHerd, type FaunaHerdMember, type FaunaBiosphereGate, type FaunaStage, type CreatureRig, type CreatureArchetype, type CreatureGenome} from './fauna-runtime.ts';
import {surfaceCellAt} from './surface-cell.ts';
import {generateCreatureGenome} from './creature-model.ts';
import {biomeClassifier} from './surface-biomes.ts';
import {PlanetForest} from './planet-forest.ts';
import {PLANET_DETAIL} from './planet-detail.ts';

// Low-flight and walking life share dated habitat gates. A separate bounded
// forest stream owns trees; this nearby lattice owns ground cover and herds.
// Culling uses radius-normalized local coordinates, while LOD uses metres.
const LIFE_OUTER_GRID_N = 15, LIFE_OUTER_HALF_SPAN_M = 168;
const LIFE_INNER_GRID_N = 25, LIFE_INNER_HALF_SPAN_M = 24;
const LIFE_OUTER_SLOTS = (LIFE_OUTER_GRID_N - 2) ** 2;
const LIFE_INNER_SLOTS = (LIFE_INNER_GRID_N - 2) ** 2;
const LIFE_SLOT_CAPACITY = LIFE_OUTER_SLOTS + LIFE_INNER_SLOTS;
const LIFE_HEIGHT_SCRATCH_CAPACITY = LIFE_INNER_GRID_N * LIFE_INNER_GRID_N;
const LIFE_RESCATTER_THRESHOLD_M = 20;
const FLORA_KIND_CULL_RADIUS_M: Record<FloraKind, number> = { tree: 6, shrub: 2.5, grass: 1, flower: .6 };
const FAUNA_PROXY_ARCHETYPES: readonly CreatureArchetype[] = ['browser', 'runner', 'low-slung', 'long-neck'];
const LIFE_UP_Y = new THREE.Vector3(0, 1, 0);
const LIFE_AXIS_Z = new THREE.Vector3(0, 0, 1);

/** Context this file needs from main.ts to gate/date flora and fauna -- the
 * caller (main.ts, which owns world-surface.ts's `biosphereStateAt` and
 * `planetAgeMyr`) computes this once per (body, epoch) and passes it as the
 * 9th `update()` argument. `tMyr` MUST be `planetAgeMyr(planetLifecycle,
 * t)`'s own return value (already clamped) -- see flora-field.ts's `toMyr`
 * PROVENANCE RULE; `null` means "no biosphere context available" (e.g. a
 * star, a gas giant, or the body doesn't exist yet at the current t) and
 * yields no flora/fauna. */
export interface LifeGateContext {
  tMyr: number;
  floraStage: FloraStage;
  floraAvailableKinds?: readonly FloraKind[];
  faunaStage: FaunaStage;
  faunaAvailableArchetypes?: readonly CreatureArchetype[];
  faunaSpecies?: readonly { id: string; creature: CreatureGenome }[];
}

type Patch ={ tile: Tile; mesh: THREE.Mesh; ocean:THREE.Mesh<THREE.BufferGeometry,OceanWaterMaterial>|null; localEye:{value:THREE.Vector3}; map: THREE.DataTexture; material: THREE.MeshStandardMaterial; morph: {value: number}; detail:{value:number}; edge:{value:THREE.Vector4}; data:ReturnType<typeof buildTile>; bytes:number; touched: number; waterBucket: number };
const ROOTS: Tile[] = Array.from({length: 6}, (_,face) => ({face, level: 0, x: 0, y: 0}));
export const TILE_CACHE_LIMIT = 256;
export const TILE_DRAW_LIMIT = 150;
// A tile's baked sea level is quantized to this many metres so scrubbing the
// date cannot thrash the streaming queue: within one bucket every tile
// (fresh or resident) is built at the exact same snapped `waterLevelM`
// (bit-identical, not merely "close"), so two tiles sharing a bucket can
// never disagree at their shared edge — the seam hazard this task's brief
// calls out is eliminated by construction, not by tolerance. Justification
// for 25 m specifically (measured 2026-09-18, see the task report for the
// full numbers): for a representative ocean-bearing body (median of 830
// sampled oceanNs->giantNs intervals in the LETHRA-001 corpus) water moves
// only ~0.6 m/s of real time at the 'historical' playback tier (the tier
// actually meant for watching shoreline change) -- ~40 real seconds between
// bucket crossings there, so normal playback never thrashes. At the far
// faster 'geological' tier it moves ~627 m/s (~1 bucket every ~40 ms, a few
// per frame at 60 fps); that repeatedly re-marks the current leaf set stale,
// but the existing per-frame worker-admission cap below (independent of this
// bucket size) already bounds how many tiles can start in any one frame, so
// a fast crossing cannot stall a frame -- it just keeps the async queue
// continuously busy while the user is deliberately watching fast-forward
// geological change, which is the correct behaviour. Across the full 8,000 m
// authored range (`stellar-evolution.ts`'s `waterKeysFor`) this gives 320
// distinguishable steps, far finer than the ~24 percentage-point ocean-area
// swing already measured between t=0 and CATALOGUE_EPOCH_NS, so ordinary
// navigation reads as continuous, not steppy.
const WATER_LEVEL_BUCKET_M = 25;
const waterLevelBucket = (waterLevelM: number) => Math.round(waterLevelM / WATER_LEVEL_BUCKET_M);
const TOTAL_BUDGET_BYTES=256*1024*1024;
// RiverWater has its own 16 MiB cap and the retained environment allocation is
// reserved here, so terrain admission cannot consume their headroom.
const WATER_ENVIRONMENT_RESERVE_BYTES=28*1024*1024;
const LIFE_RESERVE_BYTES=8*1024*1024;
const GROUND_ATLAS_BYTES=Math.ceil(256*256*4*(1+4/3));
const TERRAIN_BUDGET_BYTES=TOTAL_BUDGET_BYTES-WATER_ENVIRONMENT_RESERVE_BYTES-LIFE_RESERVE_BYTES-GROUND_ATLAS_BYTES;
// n=32: 108336 bytes of geometry, doubled for CPU/GPU, plus a 130x130 RGBA
// map with the existing conservative 7/3 mip allocation.
const PENDING_TILE_BYTES=108336*2+Math.ceil(67600*7/3);
export type ShoreDebug={freezeSelection?:boolean;freezeMorph?:boolean;freezeWater?:boolean};
// Cloud windows/cells evolve on an hours timescale (planet-clouds.ts's own
// DEFAULT_WINDOW_NS is 6h) and resampling its 256x128 DataTexture touches
// every texel, so re-deriving it every animation frame would be pure waste.
// A couple of real seconds between resamples is already far finer than the
// field's own turnover cadence -- coarse cadence per the task brief, never
// per frame.
const CLOUD_UPDATE_INTERVAL_S = 2;

// A software rasteriser (SwiftShader/llvmpipe, the default for headless
// Playwright/CI runs) does its rendering work on the same main thread that
// must also upload/compile every completed tile, so it is already CPU-bound
// per frame; widening the worker pool there only bursts more upload/compile
// work into that same thread and measurably *hurts* landing time. Detect it
// once via the standard WEBGL_debug_renderer_info string and keep the
// original single-worker throughput there; real GPUs get the wider pool.
let softwareRendererCache: boolean | null = null;
function isSoftwareRenderer(): boolean {
  if (softwareRendererCache !== null) return softwareRendererCache;
  try {
    const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(gl!.getParameter(info.UNMASKED_RENDERER_WEBGL)) : String(gl?.getParameter(gl.RENDERER) ?? '');
    softwareRendererCache = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
  } catch { softwareRendererCache = false; }
  return softwareRendererCache;
}

/**
 * A conservative bounding THREE.Sphere (unit-sphere, chord-distance units --
 * NOT metres, see `needsFineContact`'s own doc) around a RiverRegion's 4
 * corners plus its centre, in the same local-tangent-plane construction the
 * constructor already used inline for `body.hydrology` alone. Shared here so
 * `waterRegion` (the single legacy hydrology region) and every
 * `body.canonicalRivers` entry (the multi-region registry, gating
 * `needsFineContact` below) are built by one identical implementation.
 */
function riverRegionSphere(r: RiverRegion): THREE.Sphere {
  const b=[r.boundsM[0],r.boundsM[1],r.boundsM[2],r.boundsM[3]],points:[[number,number],[number,number],[number,number],[number,number],[number,number]]=[[b[0],b[1]],[b[0],b[3]],[b[2],b[1]],[b[2],b[3]],[(b[0]+b[2])/2,(b[1]+b[3])/2]],direction=([x,z]:[number,number])=>new THREE.Vector3(...r.origin).addScaledVector(new THREE.Vector3(...r.east),x/r.radiusM).addScaledVector(new THREE.Vector3(...r.north),z/r.radiusM).normalize();
  const directions=points.map(direction),center=directions.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).normalize(),radius=Math.max(...directions.map(p=>p.distanceTo(center)));
  return new THREE.Sphere(center,radius);
}

/** One resident planet, a bounded cache, and one dedicated CPU worker. */
// Tile generation is CPU-bound, stateless per request (planet-worker.ts keeps
// only a small immutable-body cache) and was previously pinned to a single
// worker with at most 2 in-flight requests -- a hard throughput ceiling that
// made a cold landing (which must densify many tiles at once) serialize
// almost entirely. Spread requests across a small pool instead so multiple
// CPU cores build tiles concurrently -- but only on a real GPU; see
// isSoftwareRenderer above for why software rendering keeps the original
// single-worker throughput.
const TILE_WORKER_COUNT = isSoftwareRenderer() ? 1 : Math.max(1, Math.min(2, (typeof navigator!=='undefined'&&navigator.hardwareConcurrency||4)-1));
export class PlanetRenderer {
  readonly group = new THREE.Group();
  private workers:{worker:Worker;generation:number;restarts:number}[]=[];
  private nextWorker=0;
  private retryAfter=new Map<string,number>();
  private patches = new Map<string, Patch>();
  private pending = new Set<string>();
  private inbox: {key: string; result?: ReturnType<typeof buildTile>; error?: string; waterBucket?: number}[] = [];
  private frame = 0;
  private disposed = false;
  private active = new Set<string>();
  private rootsReady = false;
  private failures = new Set<string>();
  private previous = new Set<string>();
  private originalMaterial: THREE.Material | THREE.Material[];
  private atmosphere: PlanetAtmosphere | null = null;
  private clouds: CloudShell | null = null;
  private cloudAccumS = CLOUD_UPDATE_INTERVAL_S;
  private ring: THREE.Mesh | null = null;
  private ringSystem: RingSystem | null = null;
  private river:RiverWater|null=null;
  private lakeReflection:LakeReflection|null=null;
  private reflectionRevision=0;
  private environment:RiverEnvironment|null=null;
  private forest:PlanetForest;
  private lowFlightDetail=false;
  private surfaceReady=false;
  private eyeHeightUniform = {value:0};
  private debug:ShoreDebug={};
  setShoreDebug(options:ShoreDebug){Object.assign(this.debug,options);if(options.freezeSelection===false)this.selectionEye.setScalar(Infinity);}
  private sunUniform = {value:new THREE.Vector3(1,0,0)};
  private contactFocus:V3|null=null;
  private sample:ReturnType<typeof terrainSampler>;
  private leafIndex=new Map<string,Tile>();
  private retries=new Map<string,number>();
  private failuresTotal=0;
  private contactGeometryCache=new Map<string,ContactPatch>();
  private contactOrigin='';
  private selectionEye=new THREE.Vector3(Infinity,Infinity,Infinity);
  private selectionContact=false;
  private selectionFrustum:number[]=[];
  private selectionPixels=0;
  private selectionDirty=false;
  private updateMs=0;
  private lifeMs=0;
  private rescatterMs=0;
  private drawFloraMs=0;
  private drawFaunaMs=0;
  private floraPresentCount=0;
  private floraSurvivorCount=0;
  private floraSubmittedCount=0;
  private groundAtlas:THREE.DataTexture;
  private residentBytes=0;
  private groundEnabled={value:1};
  setSurfaceDetail(enabled:boolean){this.groundEnabled.value=enabled?1:0;}
  readonly contactLevel:number;
  readonly fineContactLevel:number;
  // Single source of truth for "does this body have hydrology worth fine
  // contact precision for". Broadened beyond `body.hydrology` (the resolved
  // single-region legacy field) to also cover `body.canonicalRivers` (the
  // multi-region registry) -- see `contactPatches()`'s own comment on why an
  // unresolved canonical set must still gate contact. Every site that used to
  // test `body.hydrology` alone for this purpose must read this getter
  // instead, so demand (`contactPatches`) and supply (`finePriority`, the
  // quadtree split target, `diagnostics()`) can never drift apart again.
  private get hasHydrology():boolean{return (this.body.canonicalRivers?.length??0)>0||!!this.body.hydrology;}
  readonly minimumWaterLevel:number|null;
  private waterRegion:THREE.Sphere|null=null;
  private waterRegionActive=false;
  private underresolvedWaterTiles=0;
  // --- Fine-contact proximity gate -----------------------------------------
  // `hasHydrology` above gates on "this body has a river/lake SOMEWHERE" --
  // starving fine-tile demand/supply across the entire fineContactLevel grid
  // (up to L24, sub-metre) the instant any LOD churn happens, even tens of
  // kilometres from the nearest water (measured: a 33 m walk sampled 0/945
  // points within 3 m of water yet paid full sub-metre precision the whole
  // time). `needsFineContact` narrows that to "AND the walker is actually
  // near one of those regions" -- see its own doc below for the radius/
  // hysteresis numbers and the exact single-cache-per-frame contract that
  // keeps demand (`contactPatches`) and supply (`finePriority`/split target/
  // `diagnostics()`) from ever gating on different booleans.
  //
  // Distance measure: `riverFeatureAt` (river-sample.ts), evaluated directly
  // against `body.hydrology` plus every `body.canonicalRivers` entry -- NOT
  // the old bounding-sphere-per-region approximation. Measured: those
  // spheres were ~20,021-20,435 m in radius against a 200/260 m threshold,
  // so the gate engaged 100% of the time (115/115 samples out to 6000 m
  // travelled) -- behaviourally identical to the pre-existing body-wide
  // gate it was meant to replace. `riverFeatureAt` instead queries a
  // per-region spatial grid (3 km cell influence, one cell scanned) and
  // returns the true nearest wet feature's outward (wet-edge, not
  // centreline) distance in metres directly -- no chord/radius conversion
  // needed. `null` means "beyond boundsM +/- 3000 m", i.e. far outside the
  // 200/260 m thresholds, so it is treated as FAR without special-casing.
  // No caching of a region list is needed here (unlike the old
  // `waterRegions`/`syncWaterRegions` machinery this replaces): the regions
  // themselves (`body.hydrology`, `body.canonicalRivers`) are stable
  // references and `riverFeatureAt` is already called per terrain sample
  // elsewhere (regional-landform.ts), so its cost is negligible evaluated
  // once per `FINE_CONTACT_CACHE_MOVE_M` of movement. `waterRegion` (the
  // single legacy sphere) itself (and every site that already reads it --
  // `intersectsWaterRegion`, the `:660` `waterRegionActive` visibility ramp,
  // `waterPriority`, `underresolvedWaterTiles`) is left untouched: those are
  // a separate, pre-existing "regional floor" concern this task does not
  // change.
  // Fine-tile acquisition was measured up to 19.7 s (SwiftShader,
  // TILE_WORKER_COUNT=1 -- see this file's own isSoftwareRenderer comment;
  // real GPU acquisition is faster, so this is the conservative bound to
  // design against). At the walker's sprint speed (8 m/s, ground-walker.ts),
  // that is up to 157.6 m covered before acquisition can finish, so engaging
  // the gate only within a few metres of the shore would freeze the walker
  // AT the shoreline. ENGAGE at 200 m gives ~27% margin over that worst-case
  // straight-line approach. DISENGAGE at 260 m (a 60 m hysteresis gap, >400x
  // a single 1/60 s walking step at 8 m/s, and still generous against a
  // multi-second frame hitch) stops the gate flapping as the walker's
  // position dithers across the boundary once engaged.
  private static readonly FINE_CONTACT_ENGAGE_M = 200;
  private static readonly FINE_CONTACT_DISENGAGE_M = 260;
  // "recompute only when the contact point has moved more than a few
  // metres" per this task's own required design.
  private static readonly FINE_CONTACT_CACHE_MOVE_M = 5;
  private fineContactActive = false;
  private fineContactCacheValid = false;
  private readonly fineContactCachePoint = new THREE.Vector3(Infinity, Infinity, Infinity);
  /**
   * Single source of truth for "is fine (sub-metre) contact precision
   * warranted right now" -- true iff `hasHydrology` AND the current contact
   * point (`this.contactFocus`, kept in lockstep with the exact point
   * `contactPatches()` is called with by both the walking and landing flows
   * in main.ts -- setContactFocus is always called with that same value
   * immediately before/around it) is within `FINE_CONTACT_ENGAGE_M` (outward,
   * wet-edge metres -- see `riverFeatureAt`'s own doc) of any hydrology
   * region (or, once engaged, stays true out to `FINE_CONTACT_DISENGAGE_M`
   * -- the hysteresis band above). Cached and recomputed only when the
   * point has moved more than `FINE_CONTACT_CACHE_MOVE_M`, so every call
   * site within the same frame (`finePriority`, the quadtree split target,
   * `contactPatches`'s level/offsets, `diagnostics()`) reads the exact same
   * boolean -- demand and supply can never drift apart the way
   * `hasHydrology` alone would let them (see the module-header comment on
   * `hasHydrology` above).
   *
   * Distance per region comes from `riverFeatureAt` (river-sample.ts),
   * already in metres in the region's own tangent plane -- no chord/radius
   * conversion needed. Use the OUTWARD (wet-edge) distance,
   * `Math.max(0, feature.distanceM - feature.wetRadiusM)`, matching
   * regional-landform.ts's own idiom: the raw `distanceM` is centreline
   * distance and would misjudge wide channels. `riverFeatureAt` returning
   * `null` means "beyond boundsM +/- 3000 m" for that region, so it is
   * simply excluded from the minimum (never lowers `nearestM`) rather than
   * treated as near.
   */
  private get needsFineContact(): boolean {
    if (!this.hasHydrology) { this.fineContactActive = false; this.fineContactCacheValid = false; return false; }
    if (!this.contactFocus) return this.fineContactActive;
    const point = new THREE.Vector3(...this.contactFocus);
    if (this.fineContactCacheValid && point.distanceTo(this.fineContactCachePoint) < PlanetRenderer.FINE_CONTACT_CACHE_MOVE_M) return this.fineContactActive;
    this.fineContactCachePoint.copy(point);
    this.fineContactCacheValid = true;
    const dir = point.clone().normalize();
    const d: V3 = [dir.x, dir.y, dir.z];
    let nearestM = Infinity;
    if (this.body.hydrology) {
      const feature = riverFeatureAt(this.body.hydrology, d);
      if (feature) nearestM = Math.min(nearestM, Math.max(0, feature.distanceM - feature.wetRadiusM));
    }
    for (const region of this.body.canonicalRivers ?? []) {
      const feature = riverFeatureAt(region, d);
      if (feature) nearestM = Math.min(nearestM, Math.max(0, feature.distanceM - feature.wetRadiusM));
    }
    const threshold = this.fineContactActive ? PlanetRenderer.FINE_CONTACT_DISENGAGE_M : PlanetRenderer.FINE_CONTACT_ENGAGE_M;
    this.fineContactActive = nearestM <= threshold;
    return this.fineContactActive;
  }
  // --- Flora/fauna life layer state (see the module-header comment above
  // `LifeGateContext` for the overall design). ------------------------------
  private lifeContext: LifeGateContext | null = null;
  private lifeSignature = '';
  private floraRenderer!: FloraFieldRenderer;
  private classify!: ReturnType<typeof biomeClassifier>;
  private faunaProxyBuckets!: Map<CreatureArchetype, readonly [FloraLodBucket, FloraLodBucket]>;
  private readonly faunaRigPool = new Map<string, CreatureRig>();
  private readonly faunaActiveThisFrame = new Set<string>();
  private readonly floraCandidates = new FloraCandidateBuffer(LIFE_SLOT_CAPACITY);
  private readonly floraCullPlanes = new Float32Array(DEFAULT_FRUSTUM_PLANE_COUNT * 4);
  private readonly lifeScatterCenter = new THREE.Vector3(Infinity, Infinity, Infinity);
  private lifeScatterValid = false;
  private readonly lifeBasisUp = new THREE.Vector3();
  private readonly lifeBasisRight = new THREE.Vector3();
  private readonly lifeBasisForward = new THREE.Vector3();
  private readonly lifeWorldUpScratch = new THREE.Vector3();
  private readonly lifeHeightScratch = new Float32Array(LIFE_HEIGHT_SCRATCH_CAPACITY);
  private readonly lifeDirScratch = new Float64Array(LIFE_HEIGHT_SCRATCH_CAPACITY * 3);
  private readonly lifeDirTuple: [number, number, number] = [0, 0, 0];
  private floraSlotCount = 0;
  private faunaAnchorCount = 0;
  private faunaHerdCount = 0;
  private faunaVisibleCount = 0;
  private readonly floraSlotDir = new Float64Array(LIFE_SLOT_CAPACITY * 3);
  private readonly floraSlotHeightM = new Float32Array(LIFE_SLOT_CAPACITY);
  private readonly floraSlotWeights = new Float32Array(LIFE_SLOT_CAPACITY * 4);
  private readonly floraSlotForest = new Uint8Array(LIFE_SLOT_CAPACITY);
  private readonly floraSlotMoisture = new Float32Array(LIFE_SLOT_CAPACITY);
  private readonly floraSlotSlopeDeg = new Float32Array(LIFE_SLOT_CAPACITY);
  private readonly floraSlotOcean = new Uint8Array(LIFE_SLOT_CAPACITY);
  private readonly faunaHerds: (FaunaHerd | null)[] = new Array(LIFE_OUTER_SLOTS).fill(null);
  private readonly faunaAnchorDirections=new Float32Array(LIFE_OUTER_SLOTS*3);
  private readonly floraBiomeScratch = { weights: [0, 0, 0, 0] as [number, number, number, number], forestPotential: false, moisture: 0, slopeDeg: 0, ocean: false };
  private readonly faunaBiomeScratch = { weights: [0, 0, 0, 0] as [number, number, number, number], forestPotential: false, moisture: 0, slopeDeg: 0, ocean: false };
  private readonly floraGateScratch: FloraBiosphereGate = { stage: 'unformed' };
  private readonly faunaGateScratch: FaunaBiosphereGate = { stage: 'unformed' };
  private readonly floraScratchPos = new THREE.Vector3();
  private readonly floraScratchDirVec = new THREE.Vector3();
  private readonly floraScratchScale = new THREE.Vector3();
  private readonly floraScratchAlignQuat = new THREE.Quaternion();
  private readonly floraScratchYawQuat = new THREE.Quaternion();
  private readonly floraScratchFinalQuat = new THREE.Quaternion();
  private readonly floraScratchMatrix = new THREE.Matrix4();
  private readonly faunaAnchorPos = new THREE.Vector3();
  private readonly faunaTangentRight = new THREE.Vector3();
  private readonly faunaTangentForward = new THREE.Vector3();
  private readonly faunaTangentUp = new THREE.Vector3();
  private readonly faunaGroundDirScratch = new THREE.Vector3();
  private readonly faunaLookScratch = new THREE.Vector3();
  private readonly faunaBillboardQuat = new THREE.Quaternion();
  private readonly faunaProxyMatrix = new THREE.Matrix4();
  private readonly faunaProxyScale = new THREE.Vector3();
  /** Stable per-instance closure (created ONCE here, not per frame/call) so
   * `faunaGroundedTransform`'s `groundHeightAt` callback parameter never
   * allocates a fresh closure in the per-frame path. Reuses `lifeDirTuple`
   * (safe: everything that touches it runs synchronously, never overlapping
   * -- see the module-header comment). */
  private readonly faunaGroundHeightAt = (positionLocal: THREE.Vector3): number => {
    this.faunaGroundDirScratch.copy(positionLocal).normalize();
    this.lifeDirTuple[0] = this.faunaGroundDirScratch.x; this.lifeDirTuple[1] = this.faunaGroundDirScratch.y; this.lifeDirTuple[2] = this.faunaGroundDirScratch.z;
    return this.sample(this.lifeDirTuple).groundHeightM * this.relief;
  };
  setContactFocus(point:V3|null) { this.contactFocus=point; }
  // `surfaceAgeMyr`: the body's real crater-bearing surface age, per
  // terrain.ts's `terrainSampler` doc comment and its `DEFAULT_SURFACE_AGE_MYR`
  // PROVENANCE RULE - this constructor has no host `StarLifecycle` to compute
  // a real `planetAgeMyr(planet, t)` from (`main.ts`, this package's one
  // caller of `new PlanetRenderer(...)`, is not a file this task may edit; see
  // this task's own report for the exact resolveParentPlanetContext-style
  // wiring `main.ts` would need to add there and pass through here). Optional
  // and appended last so the existing 5-arg call site
  // (`main.ts`'s `new PlanetRenderer(state.body, surfaceMesh, focusRadius(),
  // reliefScale, anisotropy)`) keeps compiling.
  //
  // `this.sample` deliberately does NOT pass `terrainSampler`'s 4th
  // (`includeCraters`) argument, so it inherits that function's own default
  // - which is now `false` (terrain.ts's terrain-1.4.1 version-bump comment)
  // precisely BECAUSE this field is called from `update()`'s `projected`
  // closure below (see its own comment), inside the real-time walking/
  // contact tile-selection quadtree run on every camera/pose change: with
  // craters on, that measured ~500-800us/query (planet-craters.ts, out of
  // this file's ownership) across every LOD candidate tile, and was directly
  // responsible for `test:walking` never reaching a grounded state within
  // its budget. Leave this un-overridden; do not pass `true` here without
  // re-measuring that regression first.
  // `waterBucket` (new): the quantized (`waterLevelBucket`) sea level
  // `this.sample`/`this.classify` were last (re)built at -- see `update()`'s
  // own doc for why these two, unlike `buildTile`'s per-tile bake, are
  // refreshed in place on a bucket change instead of being reconstructed
  // once per patch.
  private waterBucket = 0;
  constructor(readonly body: Body, private host: THREE.Mesh, radius: number, readonly relief = 1,readonly anisotropy=1, private surfaceAgeMyr = DEFAULT_SURFACE_AGE_MYR) {
    this.groundAtlas=detailTexture(anisotropy);
    this.sample=terrainSampler(body, undefined, surfaceAgeMyr);
    this.contactLevel=Math.max(14,Math.min(20,Math.ceil(Math.log2(2*body.radiusM/(PATCH_SEGMENTS*1.4)))));
    // Hydrology beds need sub-decimetre samples near the capsule. This is a
    // contact-only target; ordinary terrain keeps the established base level.
    // Keyed on the full canonical set (any known canonical river, not just
    // whichever one body.hydrology currently selects for rich rendering) so
    // contact precision near an unvisited canonical river is exact too, not
    // only near the one basin picked for water-mesh/vegetation detail.
    const hasHydrology=(body.canonicalRivers?.length??0)>0||!!body.hydrology;
    this.fineContactLevel=hasHydrology?Math.max(this.contactLevel,Math.min(24,Math.ceil(Math.log2(2*body.radiusM/(PATCH_SEGMENTS*.09))))):this.contactLevel;
    this.minimumWaterLevel=hasHydrology?Math.max(0,Math.ceil(Math.log2(4*Math.SQRT2*body.radiusM/(PATCH_SEGMENTS*2800)))+1):null;
    if(body.hydrology){
      this.waterRegion=riverRegionSphere(body.hydrology);
    }
    this.group.name = 'Planet terrain patches';
    this.group.scale.setScalar(radius);
    this.group.visible = false;
    host.add(this.group);
    if(body.hydrology){this.river=new RiverWater(body,body.hydrology);this.group.add(this.river.group);if(body.hydrology.lakes.length)this.lakeReflection=new LakeReflection(body,body.hydrology,frame=>this.river?.setLakeReflection(frame),this.river.group,{canAllocate:bytes=>this.river?.canAllocateLakeReflection(bytes)??false,setBytes:bytes=>this.river?.setLakeReflectionBytes(bytes)});}
    if(body.hydrology){this.environment=new RiverEnvironment(body,body.hydrology);this.group.add(this.environment.group);}
    this.originalMaterial = host.material;
    if (body.kind === 'planet' && body.water > 0) {
      this.atmosphere = new PlanetAtmosphere(body);
      this.group.add(this.atmosphere.mesh);
    }
    const gasGiant = body.type === 'Gas giant';
    const hasOceanBody = body.kind === 'planet' && body.water > 0;
    // Body carries no independent "thin atmosphere" signal yet, so treat
    // "has an atmosphere" as true exactly where this renderer already gives
    // the body one (ocean worlds, via PlanetAtmosphere above) or where it is
    // physically inevitable (gas giants, which never get a PlanetAtmosphere
    // LUT shell but always have a thick permanent cloud deck). Kept as its
    // own boolean and checked explicitly alongside `hasOceanBody || gasGiant`
    // below -- matching planet-clouds.ts's documented
    // `hasAtmosphere && (hasOcean || gasGiant)` gate literally -- so a future
    // richer atmosphere signal only needs to change this one line.
    const hasAtmosphereBody = hasOceanBody || gasGiant;
    if (hasAtmosphereBody && (hasOceanBody || gasGiant)) {
      this.clouds = createCloudShell({
        hasAtmosphere: hasAtmosphereBody,
        hasOcean: hasOceanBody,
        gasGiant,
        temperatureK: body.temperatureK,
        radiusM: body.radiusM,
        spinPeriodS: spinStateFor(body).spinPeriodS,
      });
      // THREE.DataTexture defaults BOTH filters to NearestFilter (unlike a
      // regular Texture's LinearFilter default), and createCloudShell never
      // overrides that. Left alone, the 256x128 coverage/alpha texture would
      // read back as hard per-texel blocks over the 48x24-segment shell.
      // Fixed here, not in planet-clouds.ts (not this package's file to
      // edit): the module exposes `texture` on the returned CloudShell
      // precisely so a caller can configure it without that module needing a
      // WebGL-specific opinion of its own. (Verified via screenshot A/B and a
      // res-doubling probe that this is a real, if minor, quality fix -- the
      // scattered bright points visible on a cloudy ocean world in orbit
      // screenshots are NOT a cloud artifact; they are
      // ocean-water-material.ts's existing sun-glint specular term, whose
      // exact pattern varies run-to-run with the live camera/sun state and is
      // unaffected by this texture-filter change or by the cloud shell being
      // present at all -- confirmed by re-screenshotting the same body twice
      // in a row with identical code and seeing the glint pattern change both
      // times.)
      this.clouds.texture.magFilter = THREE.LinearFilter;
      this.clouds.texture.minFilter = THREE.LinearFilter;
      this.clouds.texture.needsUpdate = true;
      // Same 1+depth unit-sphere shell pattern PlanetAtmosphere/sky-atmosphere.ts
      // uses (createCloudShell already builds its own SphereGeometry(1+depth,...)
      // internally); adding it as a sibling of atmosphere.mesh under this.group
      // (which is scaled by the body's radius) sizes it correctly for free.
      this.group.add(this.clouds.mesh);
    }
    const ringParams = {
      massKg: body.massKg,
      radiusM: body.radiusM,
      hasRingFlag: body.rings,
      // Roche-limit/transience math wants the planet's own star distance;
      // an orbitless body (e.g. a free body outside any system) falls back
      // to a large distance so the tidal-disruption term stays negligible
      // rather than undefined.
      starDistanceAu: body.orbit ? body.orbit.a / AU : 1000,
      temperatureK: body.temperatureK,
      axialTiltRad: spinStateFor(body).axialTiltRad,
    };
    this.ringSystem = ringSystemFor(body.seed, body.id, ringParams);
    if (this.ringSystem) {
      this.ring = createRingMesh(this.ringSystem);
      // Same THREE.DataTexture NearestFilter default as the cloud shell above
      // -- the radial band/gap alpha profile in `ring.bands`/`ring.gaps` is
      // itself piecewise-continuous, so a hard per-texel step reads as
      // spurious extra "gaps" that were never generated. Smoothed here for
      // the same reason (createRingMesh only returns the finished mesh, not
      // an object to configure via a caller-facing field), not in
      // planet-rings.ts.
      const ringMap = (this.ring.material as THREE.MeshStandardMaterial).map;
      if (ringMap) { ringMap.magFilter = THREE.LinearFilter; ringMap.minFilter = THREE.LinearFilter; ringMap.needsUpdate = true; }
      this.group.add(this.ring);
    }
    for(let i=0;i<TILE_WORKER_COUNT;i++)this.startWorker(i);
    // --- Flora/fauna life layer construction --------------------------------
    // All geometry/materials/buckets are built ONCE here; the per-frame path
    // in `update()`/`drawFlora`/`drawFauna` only mutates preallocated state.
    this.classify = biomeClassifier(body);
    this.forest=new PlanetForest(body);this.group.add(this.forest.group);
    const floraSeedFor = (kind: FloraKind) => hashSeedString(body.seed + '/flora/' + kind);
    this.floraRenderer = new FloraFieldRenderer(
      (kind, lod) => floraGeometryToBufferGeometry(buildFloraGeometryData(kind, lod, floraSeedFor(kind))),
      () => new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.FrontSide }),
    );
    for (const mesh of this.floraRenderer.meshes) { mesh.name = 'Flora field'; mesh.frustumCulled = false; this.group.add(mesh); }
    this.faunaProxyBuckets = new Map();
    for (const archetype of FAUNA_PROXY_ARCHETYPES) {
      // One representative genome PER ARCHETYPE (not per herd member) drives
      // the L1/L2 instanced proxy/impostor geometry -- individual per-member
      // genome variation only renders at LOD0 (pooled real CreatureRigs,
      // below). A deliberate simplification for instancing-compatibility;
      // see this task's report.
      const proxyGenome = generateCreatureGenome(`atlas-fauna-lod-proxy/${archetype}`, archetype);
      const proxyGeometry = faunaGeometryToBufferGeometry(buildFaunaProxyGeometryData(proxyGenome));
      const impostorGeometry = faunaGeometryToBufferGeometry(buildFaunaImpostorGeometryData(proxyGenome));
      const proxyMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.FrontSide });
      const impostorMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
      const lod1 = new FloraLodBucket(proxyGeometry, proxyMaterial, 24);
      const lod2 = new FloraLodBucket(impostorGeometry, impostorMaterial, 48);
      lod1.mesh.name = `Fauna proxy: ${archetype}`; lod1.mesh.frustumCulled = false;
      lod2.mesh.name = `Fauna impostor: ${archetype}`; lod2.mesh.frustumCulled = false;
      this.group.add(lod1.mesh, lod2.mesh);
      this.faunaProxyBuckets.set(archetype, [lod1, lod2]);
    }
  }
  /** Called by main.ts once per frame (before `update()`, or at any point
   * before it) with the biosphere gate/date computed from
   * `world-surface.ts`'s `biosphereStateAt`/`planetAgeMyr` -- see
   * `LifeGateContext`'s own doc comment. */
  setLifeContext(context: LifeGateContext | null): void { this.lifeContext = context; }
  private startWorker(index:number){
    const generation=(this.workers[index]?.generation??0)+1,restarts=this.workers[index]?.restarts??0;
    const worker=new Worker(new URL('./planet-worker.ts',import.meta.url),{type:'module'});
    const slot={worker,generation,restarts};
    this.workers[index]=slot;
    worker.onmessage=({data})=>{if(!this.disposed&&this.workers[index]===slot)this.inbox.push(data);};
    worker.onerror=(event)=>{
      event.preventDefault();if(this.disposed||this.workers[index]!==slot)return;
      worker.terminate();
      // A single worker's crash cannot be attributed to specific in-flight
      // keys from here; conservatively fail everything pending across the
      // whole pool (the existing retry/backoff below handles the resend).
      for(const key of this.pending)this.failed(key);this.pending.clear();this.inbox=[];
      if(slot.restarts++<3)this.startWorker(index);
      else if(this.workers.every((w,i)=>i===index||w.restarts>=3))for(const t of ROOTS)this.failures.add(tileKey(t));
    };
  }
  private failed(key:string) {
    this.failuresTotal++;
    const attempt=(this.retries.get(key)||0)+1;this.retries.set(key,attempt);
    this.retryAfter.set(key,this.frame+30*2**attempt);
    if(attempt>=3)this.failures.add(key);
  }
  private materialVisible(visible: boolean) {
    for (const m of Array.isArray(this.originalMaterial) ? this.originalMaterial : [this.originalMaterial]) m.visible = visible;
  }
  renderLakeReflection(renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.PerspectiveCamera,xr=false){
    if(!this.lakeReflection)return;
    if(!this.rootsReady||this.relief!==1||xr){this.lakeReflection.disable();return;}
    this.group.updateMatrixWorld(true);camera.updateMatrixWorld();
    const morphEpoch=[...this.active].some(key=>(this.patches.get(key)?.morph.value??1)<1)?this.frame:0,
      env=this.environment?.diagnostics(),sun=this.sunUniform.value,
      reflectionRevision=[this.reflectionRevision,morphEpoch,env?.generatedCells??0,env?.grassCells??0,env?.instances??0,Math.round(sun.x*500),Math.round(sun.y*500),Math.round(sun.z*500),Math.round(camera.fov*100),Math.round(camera.aspect*10000)].join('/');
    // Ocean visibility is touched only for a real offscreen render, never for
    // cadence-gated or cached frames.
    this.lakeReflection.update(renderer,scene,camera,this.group,false,!!this.debug.freezeWater,reflectionRevision,render=>{
      const oceans=[...this.patches.values()].flatMap(p=>p.ocean?[p.ocean]:[]),oceanVisible=oceans.map(mesh=>mesh.visible),terrain=[...this.patches.values()].map(p=>p.mesh),terrainCulling=terrain.map(mesh=>mesh.frustumCulled);
      // Normal rendering uses explicit tile visibility, hence disabled Three
      // culling. During the reflected camera pass the installed tile geometry
      // has an exact BufferGeometry sphere, so Three can cheaply reject tiles
      // outside that camera without changing the normal-frame contract.
      try{oceans.forEach(mesh=>mesh.visible=false);terrain.forEach(mesh=>mesh.frustumCulled=true);render();}finally{terrain.forEach((mesh,i)=>mesh.frustumCulled=terrainCulling[i]);oceans.forEach((mesh,i)=>mesh.visible=oceanVisible[i]);}
    });
  }
  private intersectsWaterRegion(t:Tile){
    if(!this.waterRegion)return false;
    const span=2/2**t.level,bound=Math.min(1.8,span*1.42),center=new THREE.Vector3(...tileDirection(t,.5,.5));
    return center.distanceTo(this.waterRegion.center)<=bound+this.waterRegion.radius;
  }
  // `waterBucket`: the quantized sea level `d` was actually built at (echoed
  // back by planet-worker.ts from the job payload's `waterBucket`, not
  // recomputed here -- a single source of truth). A stale patch can already
  // be resident at this same `key` (the request gate above now sends a
  // rebuild for a bucket mismatch while the old patch keeps rendering); if
  // so it MUST be released here before being overwritten, or its mesh/ocean
  // stay attached to `this.group` forever (a leaked, doubled-up render) and
  // its `bytes` are never subtracted from `this.residentBytes` (a permanent
  // budget leak) -- `this.patches.set(key, ...)` below only ever replaces the
  // Map entry, it does not on its own dispose anything the old entry owned.
  private install(key: string, d: ReturnType<typeof buildTile>, waterBucket: number) {
    this.reflectionRevision++;
    this.retries.delete(key);this.retryAfter.delete(key);
    const stale=this.patches.get(key);
    if(stale)this.release(stale);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(d.positions, 3));
    geometry.setAttribute('parentPosition', new THREE.BufferAttribute(d.parents, 3));
    geometry.setAttribute('surfaceHeight',new THREE.BufferAttribute(d.surfaceHeight,1));
    geometry.setAttribute('parentHeight',new THREE.BufferAttribute(d.parentHeight,1));
    geometry.setAttribute('normal', new THREE.BufferAttribute(d.normals, 3));
    geometry.setAttribute('groundWeights',new THREE.BufferAttribute(d.materials,4,true));
    geometry.setAttribute('uv', new THREE.BufferAttribute(d.uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(d.indices, 1));
    geometry.computeBoundingSphere();
    const map = new THREE.DataTexture(d.color, d.width, d.width);
    map.colorSpace = THREE.SRGBColorSpace;
    map.minFilter = THREE.LinearMipmapLinearFilter;map.magFilter = THREE.LinearFilter;
    map.generateMipmaps = true;
    // This texture is the actual coastline/terrain colour map: with no
    // anisotropic filtering it undersampled at the oblique viewing angles an
    // orbital or low-altitude view sees, aliasing into jagged coastlines and
    // (up close, where the same texels stretch over sharp view angles at the
    // horizon) visibly blurry ground detail. Matches this.groundAtlas.
    map.anisotropy = this.anisotropy;
    map.needsUpdate = true;
    const material = new THREE.MeshStandardMaterial({map, roughness: this.body.water ? .72 : .95});
    const morph = {value: 0};
    const detail={value:0};
    const edge={value:new THREE.Vector4()};
    const localEye={value:new THREE.Vector3()};
    material.onBeforeCompile = shader => {
      shader.uniforms.patchMorph = morph;
      shader.uniforms.patchEdges=edge;
      shader.uniforms.patchTexels={value:d.width-2};
      shader.uniforms.tileAnchor={value:new THREE.Vector3(...d.anchor)};
      shader.uniforms.atlasLocalEyeM=localEye;shader.uniforms.atlasEyeHeightM=this.eyeHeightUniform;shader.uniforms.atlasSun=this.sunUniform;
      shader.uniforms.atlasRadius={value:this.body.radiusM};
      shader.uniforms.atlasAir={value:this.atmosphere?1:0};
      shader.uniforms.groundHabitat={value:this.body.water>0&&this.body.temperatureK>=250&&this.body.temperatureK<=325&&this.body.type!=='Ice world'&&this.body.type!=='Volcanic world'?1:0};
      shader.uniforms.atlasRelief={value:this.relief};
      shader.uniforms.groundAtlas={value:this.groundAtlas};
      shader.uniforms.groundEnabled=this.groundEnabled;
      shader.uniforms.groundPatch=detail;
      shader.uniforms.groundOrigin={value:new THREE.Vector3(...detailOrigin(d.anchor,this.body.radiusM))};
      shader.vertexShader = 'attribute vec3 parentPosition; attribute float surfaceHeight,parentHeight; uniform float patchMorph,patchTexels; uniform vec4 patchEdges; uniform vec3 tileAnchor; varying vec3 atlasSurface,atlasLocalM; varying float atlasHeightM;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `vec2 gridUV=(uv*(patchTexels+2.0)-1.0)/patchTexels;
        float lockEdge=max(max((1.0-step(.00001,gridUV.x))*patchEdges.x,step(.99999,gridUV.x)*patchEdges.y),max((1.0-step(.00001,gridUV.y))*patchEdges.z,step(.99999,gridUV.y)*patchEdges.w));
        float patchBlend=patchMorph*(1.0-lockEdge);
        vec3 transformed = mix(parentPosition, position, patchBlend); atlasSurface=transformed+tileAnchor;
        atlasLocalM=transformed*atlasRadius; atlasHeightM=mix(parentHeight,surfaceHeight,patchBlend); ${groundVertex}`);
      shader.vertexShader=groundVertexHeader+'\n'+shader.vertexShader;
      shader.fragmentShader='uniform vec3 atlasLocalEyeM,atlasSun;uniform float atlasRadius,atlasAir,atlasRelief,atlasEyeHeightM;varying vec3 atlasSurface,atlasLocalM;varying float atlasHeightM;\n'+shader.fragmentShader;
      shader.fragmentShader=groundFragmentHeader+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        ${groundColor}`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,dot(groundW,vec4(.96,.92,.84,.73)),groundFade);');
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n'+groundNormalCode);
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>', `
        float airHeight=max(0.0,(atlasEyeHeightM+atlasHeightM)*.5);
        float airDistance=length(atlasLocalEyeM-atlasLocalM);
        // Capped below 1.0 (was .97) and with a dim night-side floor above pure
        // black: terrain-following flight over the night hemisphere previously
        // washed to a near-unreadable black screen at any real viewing distance.
        // A faint starlight/skyglow floor keeps distant terrain legible without
        // changing the lit daytime result (day mix target is unchanged).
        float airFog=atlasAir*min(.92,1.0-exp(-airDistance/65000.0*exp(-airHeight/14000.0)));
        float daylight=smoothstep(-.15,.15,dot(normalize(atlasSurface),atlasSun));
        outgoingLight=mix(outgoingLight,mix(vec3(.020,.032,.055),vec3(.23,.43,.64),daylight),airFog);
        // Gate the night floor by the same fog/distance term used above.
        // An unconditional max() here silently overwrote close-range,
        // un-fogged ground pixels with a constant, erasing the
        // surfaceDetail albedo/roughness/normal signal (ground-material.ts)
        // -- this is what zeroed tests/surface.mjs's ground-detail delta.
        outgoingLight=mix(outgoingLight,max(outgoingLight,vec3(.007,.011,.018)),airFog);
        #include <opaque_fragment>`);
    };
    material.customProgramCacheKey = () => 'planet-patch-ground-bed-v7';
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...d.anchor);
    mesh.visible = false;
    mesh.userData.planetTile = key;
    // CPU culling below uses a conservative bound covering both morph endpoints.
    mesh.frustumCulled = false;
    this.group.add(mesh);
    let ocean:Patch['ocean']=null;
    if(d.oceanPositions&&d.oceanParents&&!oceanPatchCullProof({positions:d.positions,parents:d.parents,oceanPositions:d.oceanPositions,oceanParents:d.oceanParents,baseVertices:(PATCH_SEGMENTS+1)**2,anchorDir:d.anchor,radiusM:this.body.radiusM}).canCull){
      const waterGeometry=new THREE.BufferGeometry();
      waterGeometry.setAttribute('position',new THREE.BufferAttribute(d.oceanPositions,3));
      waterGeometry.setAttribute('parentPosition',new THREE.BufferAttribute(d.oceanParents,3));
      waterGeometry.setAttribute('uv',geometry.getAttribute('uv'));
      waterGeometry.setIndex(geometry.index);waterGeometry.setDrawRange(0,PATCH_SEGMENTS*PATCH_SEGMENTS*6);
      const normalAnchorDir=new THREE.Vector3(...d.anchor).normalize().toArray() as V3;
      const waterMaterial=createOceanWaterMaterial({radiusM:this.body.radiusM,normalAnchorDir,phaseOriginM:detailOrigin(d.anchor,this.body.radiusM),patchMorph:morph,patchEdges:edge,patchTexels:{value:d.width-2},waveSeed:hashSeedString(this.body.seed+'/'+this.body.id)});
      ocean=new THREE.Mesh(waterGeometry,waterMaterial);ocean.position.copy(mesh.position);ocean.visible=false;ocean.frustumCulled=false;
      this.group.add(ocean);
    }
    const bufferBytes=d.positions.byteLength+d.parents.byteLength+d.normals.byteLength+d.materials.byteLength+d.uvs.byteLength+d.indices.byteLength+d.surfaceHeight.byteLength+d.parentHeight.byteLength+(d.oceanPositions?.byteLength||0)+(d.oceanParents?.byteLength||0);
    const bytes=bufferBytes*2+Math.ceil(d.color.byteLength*(1+4/3));
    this.patches.set(key, {tile: d.tile, mesh, ocean,localEye,map, material, morph, detail,edge,data:d,bytes,touched: this.frame,waterBucket});
    this.residentBytes+=bytes;
  }
  // `worldNs`: elapsed Ns since the Big Bang (world-time.ts's absolute axis).
  // ALREADY WIRED: main.ts:2431 passes its own `epoch` variable as this 8th
  // argument (`planetTiles.update(local, innerHeight, camera.fov, dt,
  // renderer.xr.isPresenting, sun, frusta, epoch, lifeGateContext(...))`), so
  // cloud advection, ring birth/death and (as of this change) the ocean/river
  // wave phase all track the app's actual travel date. Optional and appended
  // last only so any hypothetical caller that predates this wiring keeps
  // compiling. Defaulting to CATALOGUE_EPOCH_NS (the documented
  // "oldEpoch === 0" reference date, i.e. today) is deliberate: it is the
  // same zero point main.ts itself starts from before any date scrubbing, so
  // an unwired caller would show the same "present day" sky a wired one
  // shows at app launch. (Earlier revisions of this comment described this
  // as an unwired "Package D hook" -- that was true when written but is
  // stale; corrected 2026-09-17 alongside the ocean/river wall-clock fix.)
  // `waterLevelM` (new, appended last, default `0` -- today's behaviour):
  // main.ts's `updatePlanetTiles` resolves this via `waterLevelAt(waterKeysFor(
  // bodyEntry.lc, bodyEntry.starLc), epoch)` (0 for a star) and passes it here
  // alongside `worldNs`/`life`, mirroring that argument's own existing
  // precedent -- this file deliberately does NOT import `stellar-evolution.ts`
  // to resolve it itself. Quantized immediately (`waterLevelBucket`, see that
  // constant's own doc) into `waterBucket`/`snappedWaterLevelM`: every tile
  // job dispatched this frame, and `this.sample`/`this.classify` whenever the
  // bucket changes, use the SAME snapped value, so any two tiles that share a
  // bucket are bit-identical at their shared edge by construction.
  update(observer: V3, height: number, fov: number, dt: number, immersive = false, sun: V3 = [1,0,0], frusta: THREE.Frustum[] = [], worldNs: bigint = CATALOGUE_EPOCH_NS, life: LifeGateContext | null = this.lifeContext, waterLevelM: number = 0) {
    if (this.disposed) return;
    this.lifeContext = life;
    const started=performance.now();
    this.frame++;
    const waterBucket=waterLevelBucket(waterLevelM), snappedWaterLevelM=waterBucket*WATER_LEVEL_BUCKET_M;
    // `this.sample`/`this.classify` are long-lived closures (built once in the
    // constructor), unlike `buildTile`'s per-tile bake below -- refresh them
    // in place only when the bucket actually moves, so `projected()`'s
    // approximate distance estimate and the life layer's biome/ocean gate
    // (`updateLife`'s `this.classify` call) stay consistent with whatever sea
    // level newly-built tiles are now using, without reallocating every frame.
    if(waterBucket!==this.waterBucket){
      this.waterBucket=waterBucket;
      this.sample=terrainSampler(this.body,undefined,this.surfaceAgeMyr,undefined,snappedWaterLevelM);
      this.classify=biomeClassifier(this.body,snappedWaterLevelM);
    }
    // At most two completions become GPU resources per animation frame.
    const completions=this.debug.freezeSelection?[]:this.inbox.splice(0,2);
    for (const message of completions) {
      this.pending.delete(message.key);
      if (message.result) this.install(message.key, message.result, message.waterBucket??0);
      else this.failed(message.key);
    }
    const wanted: Tile[] = [], protectedKeys = new Set<string>();
    const request = (t: Tile) => {
      const key = tileKey(t);
      protectedKeys.add(key);
      // A resident patch built at a different sea-level bucket is treated as
      // "not resident" here -- exactly like a missing tile, it is handed to
      // the same async streaming queue below (never rebuilt synchronously).
      // It keeps rendering (still internally coherent, see the module-level
      // `WATER_LEVEL_BUCKET_M` doc) until the rebuild lands and `install`
      // replaces it in place.
      const resident=this.patches.get(key), fresh=!!resident&&resident.waterBucket===waterBucket;
      if (!fresh && !this.pending.has(key) && !this.failures.has(key)&&(this.retryAfter.get(key)||0)<=this.frame) wanted.push(t);
    };
    for (const t of ROOTS) request(t);
    this.rootsReady = ROOTS.every(t => this.patches.has(tileKey(t)));
    const eye = new THREE.Vector3(...observer), distance = eye.length();
    const contact=this.contactFocus?new THREE.Vector3(...this.contactFocus).divideScalar(this.body.radiusM):null;
    const groundDirection=eye.clone().normalize().toArray() as V3;
    const groundHeight=this.sample(groundDirection).visibleHeightM;
    const altitudeM=(distance-1)*this.body.radiusM-groundHeight;
    this.lowFlightDetail=!immersive&&altitudeM<PLANET_DETAIL.flightDetailAltitudeM;
    // 390 active walking leaves plus their protected ancestors fit beneath the
    // terrain reserve while leaving admission headroom for newly requested
    // contact chunks. A 512-leaf full quadtree can consume that headroom.
    const cacheLimit=contact||this.lowFlightDetail?768:TILE_CACHE_LIMIT,drawLimit=contact?450:this.lowFlightDetail?390:(immersive?102:TILE_DRAW_LIMIT);
    this.eyeHeightUniform.value=(distance-1)*this.body.radiusM;this.sunUniform.value.set(...sun);
    this.atmosphere?.update(eye, new THREE.Vector3(...sun));
    if(this.clouds){
      this.cloudAccumS+=dt;
      if(this.cloudAccumS>=CLOUD_UPDATE_INTERVAL_S){
        this.cloudAccumS=0;
        this.clouds.update(this.body.seed,this.body.id,worldNs);
      }
    }
    // Ring existence toggle only -- geometry/texture are baked once at
    // construction (ringSystemFor/createRingMesh are pure functions of the
    // body, not of time), so this is a cheap per-frame boolean, not a rebuild.
    // See the constructor's ringParams comment and this method's `worldNs`
    // doc for why the current absolute Ns is used here as a stand-in for
    // "elapsed since the body's own formation" (this module's real birthNs/
    // deathNs zero point) rather than the true value.
    if(this.ring)this.ring.visible=ringActiveAt(this.ringSystem!,worldNs);
    // Ocean/river wave phase: a pure function of simulated worldNs (contract
    // §2.6, "the animator is now NAMED"), never of wall-clock dt. Computed
    // once here and passed unchanged to both consumers below so the sea and
    // its rivers agree bit-for-bit on the same instant. The `freezeWater`
    // debug flag is deliberately NOT consulted here -- both downstream
    // consumers already implement their own frozen-snapshot logic
    // (ocean-water-material.ts's setFrame/setDebug, river-water.ts's
    // setDebug/update), so external freeze behaviour is unchanged.
    const oceanPhaseS=oceanPhaseSeconds(worldNs);
    this.river?.update(observer,sun,oceanPhaseS,this.relief);
    if(this.environment){this.environment.group.visible=this.relief===1;if(this.relief===1)this.environment.update(observer,dt,sun);}
    // Flora/fauna: shared by low flight and walking. The historical contact
    // focus) exactly like `this.environment` above, so orbit/flight incur
    // zero cost from this layer. `frusta[0]` is reused directly (already
    // composed with this.group.matrixWorld by main.ts -- see this method's
    // own `worldNs` doc comment for the equivalent existing precedent) rather
    // than calling flora-culling.ts's `frustumPlanesFromCamera` again.
    const lifeFocus=contact??eye.clone().normalize().multiplyScalar(1+groundHeight/this.body.radiusM);
    const forestEnabled=this.relief===1&&this.lifeContext?.floraStage==='complex'&&
      !!this.lifeContext.floraAvailableKinds?.includes('tree');
    const forestFocus=lifeFocus.clone().normalize();
    if(!contact&&frusta[0]&&altitudeM>40){
      // At 600 m altitude an underfoot patch is below the screen. Prepare
      // the visible ground ahead during descent, retaining fixed cell IDs.
      const heading=frusta[0].planes[5].normal.clone().projectOnPlane(forestFocus).normalize();
      forestFocus.addScaledVector(heading,Math.min(2500,altitudeM*1.6)/this.body.radiusM).normalize();
    }
    this.forest.update(eye,forestFocus.toArray() as V3,altitudeM,forestEnabled,snappedWaterLevelM,immersive,frusta);
    if (this.relief === 1 && (contact||altitudeM<PLANET_DETAIL.groundLifeAltitudeM) && this.lifeContext) { const lifeStarted=performance.now(); this.updateLife(eye, lifeFocus, frusta[0] ?? null, worldNs); this.lifeMs=performance.now()-lifeStarted; }
    else { this.hideLife(); this.lifeMs=0; }
    const direction = eye.clone().normalize();
    const pixels = height / (2 * Math.tan(fov * Math.PI / 360));
    if(this.waterRegion){const near=Math.max(1e-9,eye.distanceTo(this.waterRegion.center)-this.waterRegion.radius);this.waterRegionActive=this.waterRegion.radius*pixels/near>=8;}else this.waterRegionActive=false;
    const projectionCache=new Map<string,{visible:boolean;score:number;contactNear:number;waterPriority:boolean;finePriority:boolean}>();
    const viewNormals=frusta.flatMap(f=>f.planes.flatMap(p=>p.normal.toArray()));
    const rotated=viewNormals.length!==this.selectionFrustum.length||viewNormals.some((v,i)=>Math.abs(v-this.selectionFrustum[i])>.001);
    const retryDue=[...this.retryAfter].some(([key,frame])=>this.frame>=frame&&!this.failures.has(key)&&!this.pending.has(key)&&!this.patches.has(key));
    // Rebuilding a full walking quadtree every 15 idle frames caused periodic
    // CPU stalls. Refine for real pose/projection changes or arriving tiles;
    // conservative visibility culling still runs on every frame below.
    const changed=!this.debug.freezeSelection&&(this.selectionDirty||completions.length>0||retryDue||!this.leafIndex.size||this.selectionContact!==!!contact||rotated||Math.abs(pixels-this.selectionPixels)>.5||eye.distanceTo(this.selectionEye)*this.body.radiusM>(contact?.distanceTo(eye)||0)*this.body.radiusM*.02+.5);
    const projected = (t: Tile) => {
      const key=tileKey(t),cached=projectionCache.get(key);if(cached)return cached;
      const center = new THREE.Vector3(...tileDirection(t, .5, .5));
      const span = 2 / 2 ** t.level, bound = Math.min(1.8, span * 1.42);
      // Conservative horizon test, expanded for the highest possible terrain.
      const margin = 20000 * this.relief / this.body.radiusM;
      const core=1-16000/this.body.radiusM;
      const eyeCos=Math.min(1,Math.max(0,core/distance)),peakCos=Math.min(1,Math.max(0,core/(1+margin)));
      const horizonCos=eyeCos*peakCos-Math.sqrt(1-eyeCos*eyeCos)*Math.sqrt(1-peakCos*peakCos);
      const horizon = direction.dot(center) + bound >= horizonCos;
      const sphere = new THREE.Sphere(center, bound + margin);
      const resident=this.patches.get(key);
      if(resident?.mesh.geometry.boundingSphere){
        sphere.copy(resident.mesh.geometry.boundingSphere);sphere.center.add(resident.mesh.position);
      }
      const visible = horizon && (!frusta.length || frusta.some(f => f.intersectsSphere(sphere)));
      if(!changed)return {visible,score:0,contactNear:Infinity,waterPriority:false,finePriority:false};
      const nearest = closestTileDirection(t,observer);
      const elevation=this.sample(nearest).visibleHeightM;
      const ground=new THREE.Vector3(...nearest).multiplyScalar(1+Math.max(this.body.water?0:-Infinity,elevation)*this.relief/this.body.radiusM);
      const near = Math.max(1e-9, eye.distanceTo(ground));
      let contactNear=Infinity;
      if(contact){const d=closestTileDirection(t,contact.toArray() as V3),h=this.sample(d).visibleHeightM;contactNear=contact.distanceTo(new THREE.Vector3(...d).multiplyScalar(1+Math.max(this.body.water?0:-Infinity,h)/this.body.radiusM))*this.body.radiusM;}
      // Projected patch span also budgets texture resolution. It deliberately
      // overestimates error instead of claiming a measured terrain error bound.
      const contactPriority=contactNear<28&&t.level<this.contactLevel;
      const finePriority=this.needsFineContact&&contactNear<3&&t.level<this.fineContactLevel;
      // Best-effort regional floor: deliberately below fine capsule and broad
      // contact work, so it cannot consume their balanced support budget.
      const waterPriority=!!this.minimumWaterLevel&&this.waterRegionActive&&t.level<this.minimumWaterLevel&&this.intersectsWaterRegion(t);
      // The tiny fine-support band must arrive before the wider 28 m base
      // ring; otherwise the walking leaf cap can fill with L18 candidates
      // before the capsule has its L19–22 descendants.
      const result={visible,contactNear,waterPriority,finePriority,score:finePriority?1e12/((t.level+1)*(1+contactNear)):contactPriority?1e10/(t.level+1):waterPriority?1e7/(t.level+1):visible ? span * pixels / near : 0};
      projectionCache.set(key,result);return result;
    };
    // Contact re-ranks the full balanced frontier so distant visual leaves
    // cannot starve the capsule's mandatory support ring.
    const leaves = contact&&changed?[...ROOTS]:this.leafIndex.size?[...this.leafIndex.values()]:[...ROOTS];
    if (this.rootsReady&&changed) {
      this.selectionEye.copy(eye);this.selectionContact=!!contact;this.selectionFrustum=viewNormals;this.selectionPixels=pixels;
      this.selectionDirty=false;
      const selectionStarted=performance.now();
      // Retain the prior frontier. Collapse distant sibling sets once, then
      // refine incrementally; rebuilding all 450 leaves from six roots on
      // every flight frame was a dominant source of main-thread stalls.
      const initial=new Map(leaves.map(t=>[tileKey(t),t])),parents=new Map<string,Tile>(),deepest=new Map<string,number>();
      const urgent=Math.max(...leaves.map(t=>t.level<(contact?(this.needsFineContact?this.fineContactLevel:this.contactLevel):this.contactLevel)?projected(t).score:0));
      for(const leaf of leaves){let t=leaf;while(t.level>0){t={face:t.face,level:t.level-1,x:Math.floor(t.x/2),y:Math.floor(t.y/2)};
        const key=tileKey(t);deepest.set(key,Math.max(deepest.get(key)??0,leaf.level));
        if(t.level===leaf.level-1)parents.set(key,t);}}
      for(const [key,parent] of parents){
        const kids=children(parent);if(!kids.every(k=>initial.has(tileKey(k))))continue;
        const score=projected(parent).score;
        const pressure=leaves.length>drawLimit-60||this.residentBytes>TERRAIN_BUDGET_BYTES*.94;
        if(score>(immersive?210:160)&&!(pressure&&score<urgent/4))continue;
        if([0,1,2,3].some(e=>(deepest.get(tileKey(tileNeighbour(parent,e)))??0)>parent.level+1))continue;
        if(!this.patches.has(key))continue;
        for(const child of kids){const index=leaves.findIndex(t=>tileKey(t)===tileKey(child));if(index>=0)leaves.splice(index,1);}
        leaves.push(parent);this.selectionDirty=true;
      }
      const iterations=contact?256:24;
      for (let iteration = 0; iteration < iterations; iteration++) {
        if(!contact&&iteration>0&&performance.now()-selectionStarted>3){this.selectionDirty=true;break;}
        const index=new Map(leaves.map(t=>[tileKey(t),t]));
        const neighbour=(t:Tile,e:number)=>{let n=tileNeighbour(t,e);while(n.level>0&&!index.has(tileKey(n)))n={face:n.face,level:n.level-1,x:Math.floor(n.x/2),y:Math.floor(n.y/2)};return index.get(tileKey(n));};
        const candidates = leaves.map(t => ({t, ...projected(t)})).filter(p => {
          const target=contact?(this.needsFineContact?this.fineContactLevel:this.contactLevel):this.lowFlightDetail?this.contactLevel:16;
          if(p.t.level>=target||p.score<=(immersive?360:260))return false;
          // Above the regular contact level, only the 3 m hydrology contact
          // band may refine. This prevents ordinary visible terrain from
          // consuming the fine-band leaf budget.
          return !contact||p.t.level<this.contactLevel||p.contactNear<3||p.score>1e8;
        });
        candidates.sort((a, b) => b.score - a.score);
        const contactPending=!!contact&&candidates.some(c=>c.score>1e8);
        let split = false;
        for (const candidate of candidates) {
          // Request balanced capsule support first. Protecting every distant
          // candidate's children can otherwise pin the entire byte budget
          // while the last mandatory contact tiles still need admission.
          if(contactPending&&candidate.score<1e8)continue;
          // Foot-contact candidates sort first, but do not freeze all visible
          // non-contact terrain after an arbitrary 90 leaves.  The fixed
          // draw/cache limits below remain the allocation boundary, allowing
          // a visible river or lake shore to refine beside the contact ring.
          let t=candidate.t;
          // Every contact split preserves the established 2:1 closure. Edge
          // locks only support one level of difference; bypassing this creates
          // unsupported multi-level seams and skirt walls.
          if(contact){for(let pass=0;pass<20;pass++){const lower=[0,1,2,3].map(e=>neighbour(t,e)).find(n=>n&&n.level<t.level);if(!lower)break;t=lower;}}
          if (leaves.length + 3 > drawLimit) break;
          const kids = children(t);
          kids.forEach(request);
          if (leaves.length + 3 <= drawLimit && kids.every(k => this.patches.has(tileKey(k)))) {
            leaves.splice(leaves.indexOf(t), 1, ...kids);
            split = true;
            if(iteration===iterations-1)this.selectionDirty=true;
            break;
          }
        }
        if (!split) break;
      }
    }
    this.active.clear();
    this.leafIndex=new Map(leaves.map(t=>[tileKey(t),t]));
    this.underresolvedWaterTiles=this.waterRegionActive&&this.minimumWaterLevel!==null?leaves.filter(t=>t.level<this.minimumWaterLevel!&&this.intersectsWaterRegion(t)).length:0;
    for (const p of this.patches.values()){p.mesh.visible = false;if(p.ocean)p.ocean.visible=false;}
    for (const t of leaves) {
      const key = tileKey(t), p = this.patches.get(key);
      protectedKeys.add(key);
      let ancestor=t;while(ancestor.level>0){ancestor={face:ancestor.face,level:ancestor.level-1,x:Math.floor(ancestor.x/2),y:Math.floor(ancestor.y/2)};protectedKeys.add(tileKey(ancestor));}
      if (!p) continue;
      p.touched = this.frame;
      p.mesh.visible = projected(t).visible && this.rootsReady;
      if (p.mesh.visible) this.active.add(key);
      if (!this.previous.has(key)) p.morph.value = t.level ? 0 : 1;
      if(!this.debug.freezeMorph)p.morph.value = Math.min(1, p.morph.value + dt / .22);
      p.localEye.value.copy(eye).sub(p.mesh.position).multiplyScalar(this.body.radiusM);
      if(p.ocean){p.ocean.visible=p.mesh.visible;setOceanWaterPatchFrame(p.ocean.material,{localEyeM:p.localEye.value,sunDirection:this.sunUniform.value,oceanPhaseS});}
      const neighbours=[0,1,2,3].map(e=>tileNeighbour(t,e));
      const parent=(n:Tile)=>({face:n.face,level:n.level-1,x:Math.floor(n.x/2),y:Math.floor(n.y/2)});
      const edges=neighbours.map(n=>this.leafIndex.has(tileKey(parent(n)))?1:0);
      p.edge.value.set(edges[0],edges[1],edges[2],edges[3]);
      // Skirts are a streaming fallback. Once neighbouring edges are settled
      // and at most one level apart, edge locks already close the surface.
      // Keeping skirts there lets nearly coplanar vertical faces leak through
      // the log-depth buffer and creates textured fences at ground level.
      const settled=(n:Tile)=>this.previous.has(tileKey(n))&&this.leafIndex.has(tileKey(n))&&this.patches.get(tileKey(n))?.morph.value===1;
      const stitched=p.morph.value===1&&neighbours.every(n=>settled(n)||(n.level>0&&settled(parent(n)))||children(n).every(settled));
      p.mesh.geometry.setDrawRange(0,stitched?PATCH_SEGMENTS*PATCH_SEGMENTS*6:p.data.indices.length);
      const sphere=p.mesh.geometry.boundingSphere!;
      const near=eye.distanceTo(sphere.center.clone().add(p.mesh.position))-sphere.radius;
      p.detail.value=(distance-1)*this.body.radiusM<20000*this.relief+6000&&near*this.body.radiusM<6000?1:0;
      // Contact hand-off is enabled only after fine coverage has finished morphing.
    }
    this.previous = new Set(leaves.map(tileKey));
    // Keep the orbital preview until the focused replacement tree has
    // reached useful resolution. Six coarse root maps caused a blur on focus.
    if(!this.surfaceReady&&this.rootsReady&&
      [...this.active].some(key=>this.patches.get(key)!.tile.level>=3))this.surfaceReady=true;
    this.group.visible=this.surfaceReady;
    this.materialVisible(!this.surfaceReady);
    // Retain ancestor fallback meshes; evict unused children first. Bound also
    // includes pending work, so late completions cannot grow the cache forever.
    // Reserve one worst-case worker result before admitting it. This maintains
    // the combined cap even when a worker completion arrives after selection.
    const bytePressure=()=>this.residentBytes+(this.pending.size+1)*PENDING_TILE_BYTES>TERRAIN_BUDGET_BYTES;
    for (const p of [...this.patches.values()].sort((a,b) => a.touched - b.touched)) {
      if (this.patches.size + this.pending.size < cacheLimit - 2&&!bytePressure()) break;
      const key = tileKey(p.tile);
      if (!protectedKeys.has(key)) { this.release(p); this.patches.delete(key); }
    }
    const unique = new Map(wanted.map(t => [tileKey(t), t]));
    for (const [key, tile] of unique) {
      if(this.debug.freezeSelection)break;
      // Was a flat cap of 2 in-flight requests even though a single worker
      // could only ever process one at a time; now scaled modestly to the
      // pool (one extra slot per worker) so every worker can have work
      // queued without letting too many completions land in the same frame
      // and burst the main-thread upload/compile work that follows each one.
      if (this.pending.size >= this.workers.length*2 || this.patches.size + this.pending.size >= cacheLimit||this.residentBytes+(this.pending.size+1)*PENDING_TILE_BYTES>TERRAIN_BUDGET_BYTES) break;
      this.pending.add(key);
      this.workers[this.nextWorker=(this.nextWorker+1)%this.workers.length].worker.postMessage({key, tile, body: this.body, relief: this.relief, waterLevelM: snappedWaterLevelM, waterBucket});
    }
    this.updateMs=performance.now()-started;
  }
  private hideLife(): void {
    this.faunaVisibleCount = 0;
    this.floraRenderer.beginFrame(); this.floraRenderer.endFrame();
    for (const [lod1, lod2] of this.faunaProxyBuckets.values()) { lod1.beginFrame(); lod1.endFrame(); lod2.beginFrame(); lod2.endFrame(); }
    for (const rig of this.faunaRigPool.values()) rig.group.visible = false;
  }
  private updateLife(eye: THREE.Vector3, contact: THREE.Vector3, frustum: THREE.Frustum | null, worldNs: bigint): void {
    const life = this.lifeContext;
    if (!life) { this.hideLife(); return; }
    const signature = `${this.waterBucket}|${life.floraStage}|${life.faunaStage}|${life.faunaSpecies?.map(s=>s.id).join(',') ?? ''}`;
    if (signature !== this.lifeSignature) {
      this.lifeSignature = signature;
      this.lifeScatterValid = false;
    }
    const thresholdLocal = LIFE_RESCATTER_THRESHOLD_M / this.body.radiusM;
    // Scatter anchor is the verified ground-CONTACT point (`this.contactFocus`,
    // the same value `contactPatches`'s physics collision already trusts --
    // contactMismatchM there confirms it tracks true terrain to sub-millimetre
    // precision), never the generic camera `eye`. A FINDING from this task:
    // `eye` (main.ts's `observer`, i.e. `camera.position` transformed into
    // this group's local space) was measured to diverge from the walker's own
    // ground position by up to ~137 degrees of arc on this body during normal
    // on-foot play (a pre-existing main.ts/camera-tracking characteristic,
    // not something this task's wiring caused) -- using it as the flora/fauna
    // lattice anchor silently scattered every candidate around a location the
    // player was nowhere near, so `floraAt`/`faunaHerdAt` legitimately saw
    // ocean/rock there and correctly placed nothing. `eye` is still the right
    // choice for the distance-based LOD/cull math below (drawFlora/drawFauna
    // want the true camera distance for what's on screen), just not for where
    // the lattice itself is centred.
    if (!this.lifeScatterValid || contact.distanceTo(this.lifeScatterCenter) > thresholdLocal) {
      const t0=performance.now();
      this.rescatterLife(contact);
      this.rescatterMs=performance.now()-t0;
      this.lifeScatterCenter.copy(contact);
      this.lifeScatterValid = true;
    } else this.rescatterMs=0;
    if (!frustum) { this.hideLife(); return; }
    const t1=performance.now();
    this.drawFlora(life, eye, frustum);
    this.drawFloraMs=performance.now()-t1;
    const t2=performance.now();
    this.drawFauna(eye, worldNs);
    this.drawFaunaMs=performance.now()-t2;
  }
  /** Rare (movement-threshold-gated) full lattice resample: builds a tangent
   * basis at `eyeLocal`, samples ground height on an OUTER coarse grid
   * (tree/shrub/fauna-anchor scale) and an INNER fine grid (grass/flower
   * scale), estimates slope from grid-neighbor heights already sampled here
   * (instead of `planet-tiles.ts`'s `surfaceNormal`, which costs 6 EXTRA
   * `sample()` calls per point), classifies biome via `surface-biomes.ts`'s
   * `biomeClassifier`, and (for outer/anchor slots only) composes fauna
   * herds via `faunaHerdAt`. This is the only place per-frame flora/fauna
   * code calls `this.sample`/`this.classify` -- everything in `drawFlora`/
   * `drawFauna` re-evaluates against this cache instead. */
  private rescatterLife(eyeLocal: THREE.Vector3): void {
    const up = this.lifeBasisUp.copy(eyeLocal).normalize();
    const worldUpRef = Math.abs(up.y) > .92 ? this.lifeWorldUpScratch.set(1, 0, 0) : this.lifeWorldUpScratch.set(0, 1, 0);
    const right = this.lifeBasisRight.crossVectors(worldUpRef, up).normalize();
    const forward = this.lifeBasisForward.crossVectors(up, right).normalize();
    let slot = this.scatterGrid(up, right, forward, LIFE_OUTER_GRID_N, LIFE_OUTER_HALF_SPAN_M, 0);
    this.faunaAnchorCount = slot;
    slot = this.scatterGrid(up, right, forward, LIFE_INNER_GRID_N, LIFE_INNER_HALF_SPAN_M, slot);
    this.floraSlotCount = slot;
    const life = this.lifeContext;
    const gate = this.faunaGateScratch;
    gate.stage = life ? life.faunaStage : 'unformed';
    gate.availableArchetypes = life?.faunaAvailableArchetypes;
    gate.species = life?.faunaSpecies;
    this.faunaHerdCount = 0;
    const seenCells=new Set<string>();
    for (let i = 0; i < this.faunaAnchorCount; i++) {
      if (!life || life.faunaStage !== 'complex') { this.faunaHerds[i] = null; continue; }
      const sb = i * 3;
      this.lifeDirTuple[0] = this.floraSlotDir[sb]!; this.lifeDirTuple[1] = this.floraSlotDir[sb + 1]!; this.lifeDirTuple[2] = this.floraSlotDir[sb + 2]!;
      const cell=surfaceCellAt(this.lifeDirTuple,this.body.radiusM);
      if(seenCells.has(cell.id)){this.faunaHerds[i]=null;continue;}
      seenCells.add(cell.id);
      this.faunaAnchorDirections.set(cell.direction,sb);
      this.faunaAnchorPos.set(...cell.direction);
      const ref=Math.abs(this.faunaAnchorPos.y)>.92?this.lifeWorldUpScratch.set(1,0,0):this.lifeWorldUpScratch.set(0,1,0);
      this.faunaTangentRight.crossVectors(ref,this.faunaAnchorPos).normalize();
      this.faunaTangentForward.crossVectors(this.faunaAnchorPos,this.faunaTangentRight).normalize();
      const height=this.sample(cell.direction).groundHeightM;
      const offsetHeight=(x:number,z:number)=>{
        this.faunaGroundDirScratch.copy(this.faunaAnchorPos)
          .addScaledVector(this.faunaTangentRight,x/this.body.radiusM)
          .addScaledVector(this.faunaTangentForward,z/this.body.radiusM).normalize();
        this.lifeDirTuple[0]=this.faunaGroundDirScratch.x;
        this.lifeDirTuple[1]=this.faunaGroundDirScratch.y;
        this.lifeDirTuple[2]=this.faunaGroundDirScratch.z;
        return this.sample(this.lifeDirTuple).groundHeightM;
      };
      const gradX=(offsetHeight(4,0)-offsetHeight(-4,0))/8;
      const gradZ=(offsetHeight(0,4)-offsetHeight(0,-4))/8;
      const upDot=1/Math.sqrt(1+gradX*gradX+gradZ*gradZ);
      const sampleBiome=this.classify(cell.direction,height,upDot);
      const b=this.faunaBiomeScratch;
      b.weights[0]=sampleBiome.weights[0]!;b.weights[1]=sampleBiome.weights[1]!;
      b.weights[2]=sampleBiome.weights[2]!;b.weights[3]=sampleBiome.weights[3]!;
      b.forestPotential=sampleBiome.forestPotential;b.moisture=sampleBiome.moisture;
      b.slopeDeg=sampleBiome.slopeDeg;b.ocean=sampleBiome.ocean;
      this.faunaHerds[i] = faunaHerdAt(this.body.seed, this.body.id, cell.direction, b, gate,toSeconds(0),cell.id);
      if(this.faunaHerds[i]?.present)this.faunaHerdCount++;
    }
  }
  /** Fills lattice slots `[startSlot, startSlot+(gridN-2)**2)` and returns the
   * new slot cursor. `up`/`right`/`forward` form the tangent basis built by
   * `rescatterLife`; `halfSpanM`/`gridN` size one square grid of that basis
   * in real meters (converted to this renderer's radius-normalized local
   * space via `/this.body.radiusM`, the same convention `buildTile`/the
   * hydrology tangent-plane offsets in this file's own constructor use). */
  private scatterGrid(up: THREE.Vector3, right: THREE.Vector3, forward: THREE.Vector3, gridN: number, halfSpanM: number, startSlot: number): number {
    const radiusM = this.body.radiusM, spacing = (2 * halfSpanM) / (gridN - 1), dirScratch = this.lifeDirScratch;
    let cursor = 0;
    for (let j = 0; j < gridN; j++) {
      const z = -halfSpanM + j * spacing;
      for (let i = 0; i < gridN; i++) {
        const x = -halfSpanM + i * spacing;
        this.floraScratchDirVec.copy(up).addScaledVector(right, x / radiusM).addScaledVector(forward, z / radiusM).normalize();
        // Snap candidates to planetary cells. Observer motion changes the
        // working set, never the identity/position of a retained plant.
        const stable=surfaceCellAt(this.floraScratchDirVec.toArray() as V3,radiusM,spacing);
        this.floraScratchDirVec.set(...stable.direction);
        const base = cursor * 3;
        dirScratch[base] = this.floraScratchDirVec.x; dirScratch[base + 1] = this.floraScratchDirVec.y; dirScratch[base + 2] = this.floraScratchDirVec.z;
        this.lifeDirTuple[0] = this.floraScratchDirVec.x; this.lifeDirTuple[1] = this.floraScratchDirVec.y; this.lifeDirTuple[2] = this.floraScratchDirVec.z;
        this.lifeHeightScratch[cursor] = this.sample(this.lifeDirTuple).groundHeightM;
        cursor++;
      }
    }
    let slot = startSlot;
    for (let j = 1; j < gridN - 1; j++) {
      for (let i = 1; i < gridN - 1; i++) {
        const idx = j * gridN + i;
        const gradX = (this.lifeHeightScratch[idx + 1]! - this.lifeHeightScratch[idx - 1]!) / (2 * spacing);
        const gradZ = (this.lifeHeightScratch[idx + gridN]! - this.lifeHeightScratch[idx - gridN]!) / (2 * spacing);
        const upDot = 1 / Math.sqrt(1 + gradX * gradX + gradZ * gradZ);
        const height = this.lifeHeightScratch[idx]!, dbase = idx * 3;
        this.lifeDirTuple[0] = dirScratch[dbase]!; this.lifeDirTuple[1] = dirScratch[dbase + 1]!; this.lifeDirTuple[2] = dirScratch[dbase + 2]!;
        const b = this.classify(this.lifeDirTuple, height, upDot);
        const sb = slot * 3, wb = slot * 4;
        this.floraSlotDir[sb] = this.lifeDirTuple[0]; this.floraSlotDir[sb + 1] = this.lifeDirTuple[1]; this.floraSlotDir[sb + 2] = this.lifeDirTuple[2];
        this.floraSlotHeightM[slot] = height;
        this.floraSlotWeights[wb] = b.weights[0]!; this.floraSlotWeights[wb + 1] = b.weights[1]!; this.floraSlotWeights[wb + 2] = b.weights[2]!; this.floraSlotWeights[wb + 3] = b.weights[3]!;
        this.floraSlotForest[slot] = b.forestPotential ? 1 : 0;
        this.floraSlotMoisture[slot] = b.moisture;
        this.floraSlotSlopeDeg[slot] = b.slopeDeg;
        this.floraSlotOcean[slot] = b.ocean ? 1 : 0;
        slot++;
      }
    }
    return slot;
  }
  /** Per-frame flora cull+draw. See the module-header UNIT-MISMATCH FINDING
   * comment above `LifeGateContext` for why this does NOT call
   * flora-culling.ts's `drawFloraCandidates` convenience wrapper directly. */
  private drawFlora(life: LifeGateContext, eye: THREE.Vector3, frustum: THREE.Frustum): void {
    for (let i = 0; i < DEFAULT_FRUSTUM_PLANE_COUNT; i++) {
      const p = frustum.planes[i]!;
      packCullPlane(this.floraCullPlanes, i, p.normal.x, p.normal.y, p.normal.z, p.constant);
    }
    this.floraCandidates.clear();
    const gate = this.floraGateScratch;
    gate.stage = life.floraStage; gate.availableKinds = life.floraAvailableKinds;
    const tMyr = toMyr(life.tMyr);
    const radiusM = this.body.radiusM, relief = this.relief, b = this.floraBiomeScratch;
    this.floraPresentCount = 0;
    for (let i = 0; i < this.floraSlotCount; i++) {
      const wb = i * 4;
      b.weights[0] = this.floraSlotWeights[wb]!; b.weights[1] = this.floraSlotWeights[wb + 1]!; b.weights[2] = this.floraSlotWeights[wb + 2]!; b.weights[3] = this.floraSlotWeights[wb + 3]!;
      b.forestPotential = !!this.floraSlotForest[i]; b.moisture = this.floraSlotMoisture[i]!; b.slopeDeg = this.floraSlotSlopeDeg[i]!; b.ocean = !!this.floraSlotOcean[i];
      const sb = i * 3;
      this.lifeDirTuple[0] = this.floraSlotDir[sb]!; this.lifeDirTuple[1] = this.floraSlotDir[sb + 1]!; this.lifeDirTuple[2] = this.floraSlotDir[sb + 2]!;
      const instance = floraAt(this.body.seed, this.body.id, this.lifeDirTuple, b, gate, tMyr);
      if (!instance.present) continue;
      if(instance.kind==='tree')continue; // The continuous forest owns trees at every altitude.
      this.floraPresentCount++;
      const dx = this.lifeDirTuple[0], dy = this.lifeDirTuple[1], dz = this.lifeDirTuple[2];
      const heightM = this.floraSlotHeightM[i]!, r = 1 + heightM * relief / radiusM;
      this.floraScratchPos.set(dx * r, dy * r, dz * r);
      this.floraScratchDirVec.set(dx, dy, dz);
      this.floraScratchAlignQuat.setFromUnitVectors(LIFE_UP_Y, this.floraScratchDirVec);
      this.floraScratchYawQuat.setFromAxisAngle(this.floraScratchDirVec, instance.rotationY);
      this.floraScratchFinalQuat.multiplyQuaternions(this.floraScratchYawQuat, this.floraScratchAlignQuat);
      const localScale = instance.scale / radiusM;
      this.floraScratchScale.setScalar(localScale);
      this.floraScratchMatrix.compose(this.floraScratchPos, this.floraScratchFinalQuat, this.floraScratchScale);
      const cullRadiusLocal = (FLORA_KIND_CULL_RADIUS_M[instance.kind] * instance.scale) / radiusM;
      this.floraCandidates.push(instance.kind, this.floraScratchPos.x, this.floraScratchPos.y, this.floraScratchPos.z, cullRadiusLocal, this.floraScratchMatrix.elements);
    }
    // Inlined `drawFloraCandidates` (see the UNIT-MISMATCH FINDING above):
    // `cull()` stays in the local (radius-normalized) frame the frustum
    // planes are expressed in; LOD banding converts to real meters first.
    this.floraRenderer.beginFrame();
    const survivorCount = this.floraCandidates.cull(this.floraCullPlanes, DEFAULT_FRUSTUM_PLANE_COUNT);
    this.floraSurvivorCount = survivorCount;
    this.floraSubmittedCount = 0;
    for (let slot = 0; slot < survivorCount; slot++) {
      const idx = this.floraCandidates.survivorIndex(slot);
      const cdx = this.floraCandidates.centerX[idx]! - eye.x, cdy = this.floraCandidates.centerY[idx]! - eye.y, cdz = this.floraCandidates.centerZ[idx]! - eye.z;
      const distanceM = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz) * radiusM;
      const lod = pickFloraLodBand(distanceM);
      if (lod === -1) continue;
      const kind = FLORA_KIND_NAMES[this.floraCandidates.kindIndex[idx]!]!;
      this.floraRenderer.submit(kind, lod, this.floraCandidates.matrices, idx * 16);
      this.floraSubmittedCount++;
    }
    this.floraRenderer.endFrame();
  }
  /** Per-frame fauna pose/pool/bucket update. No dedicated fauna culling
   * module exists (fauna herds are sparse -- at most `LIFE_OUTER_SLOTS`
   * anchors, each a handful of members), so this uses a plain
   * distance-from-`eye` LOD test rather than `flora-culling.ts`'s SoA
   * sphere cull. `faunaGroundedTransform` (fauna-runtime.ts, not ownable
   * here) allocates a `Vector3`/`Quaternion` per call internally -- bounded
   * by the small per-frame active-fauna count, unlike the strictly
   * zero-alloc flora path above; see this task's report. */
  private drawFauna(eye: THREE.Vector3, worldNs: bigint): void {
    const radiusM = this.body.radiusM;
    for (const [lod1, lod2] of this.faunaProxyBuckets.values()) { lod1.beginFrame(); lod2.beginFrame(); }
    this.faunaActiveThisFrame.clear();
    this.faunaVisibleCount = 0;
    const rigTimeS = faunaRigSecondsAt(worldNs);
    for (let a = 0; a < this.faunaAnchorCount; a++) {
      const herd = this.faunaHerds[a];
      if (!herd || !herd.present) continue;
      // FIX (this task -- fauna investigation): anchor at the base unit-
      // sphere direction (r=1), NOT `1 + heightM*relief/radiusM`. Baking the
      // anchor's own cached terrain height in here AND letting
      // `faunaGroundedTransform` add real elevation again via its
      // `groundHeightAt` callback (`this.faunaGroundHeightAt`, just below)
      // double-applied elevation: every herd member's grounded position
      // ended up displaced outward by roughly the local terrain height A
      // SECOND time (verified empirically -- a herd forced at the player's
      // own contact point, height ~1500m, put every member at
      // `distanceM`~1499m from `eye`, i.e. `pickFaunaLodBand` always saw
      // -1/culled). `faunaGroundedTransform`'s own doc comment confirms
      // `groundHeightAt` is the ONE place elevation is meant to be applied
      // (per-member, at its own offset position, not the anchor's cached
      // one) -- this is why no fauna rig had ever been observed.
      const sb = a * 3;
      this.faunaAnchorPos.set(this.faunaAnchorDirections[sb]!, this.faunaAnchorDirections[sb + 1]!, this.faunaAnchorDirections[sb + 2]!);
      const ref=Math.abs(this.faunaAnchorPos.y)>.92?this.lifeWorldUpScratch.set(1,0,0):this.lifeWorldUpScratch.set(0,1,0);
      this.faunaTangentRight.crossVectors(ref,this.faunaAnchorPos).normalize().multiplyScalar(1/radiusM);
      this.faunaTangentForward.crossVectors(this.faunaAnchorPos,this.faunaTangentRight).normalize().multiplyScalar(1/radiusM);
      this.faunaTangentUp.copy(this.faunaAnchorPos).multiplyScalar(1/radiusM);
      for (let m = 0; m < herd.members.length; m++) {
        const member = herd.members[m]!;
        const pose = faunaMemberPoseAtWorldNs(member, worldNs);
        const grounded = faunaGroundedTransform(this.faunaAnchorPos, this.faunaTangentRight, this.faunaTangentForward, this.faunaTangentUp, pose, this.faunaGroundHeightAt);
        const distanceM = eye.distanceTo(grounded.position) * radiusM;
        const band = pickFaunaLodBand(distanceM);
        if (band === -1) continue;
        this.faunaVisibleCount++;
        let rendered = false;
        if (band === 0) {
          this.faunaActiveThisFrame.add(member.id);
          const rig = this.faunaRigPool.get(member.id) ?? this.acquireFaunaRig(member);
          if (rig) {
            rig.group.visible = true;
            rig.group.position.copy(grounded.position);
            rig.group.quaternion.copy(grounded.quaternion);
            rig.group.scale.setScalar(1 / radiusM);
            rig.update(rigTimeS, pose.gait, 'flat');
            rendered = true;
          }
          // Pool full and no member could be evicted this frame -- fall
          // through to the LOD1 proxy so the herd member still renders
          // rather than popping out of existence.
        }
        if (!rendered) {
          const buckets = this.faunaProxyBuckets.get(member.archetype);
          if (!buckets) continue;
          this.faunaProxyScale.setScalar(1 / radiusM);
          if (band <= 1) {
            this.faunaProxyMatrix.compose(grounded.position, grounded.quaternion, this.faunaProxyScale);
            buckets[0].tryAdd(this.faunaProxyMatrix.elements);
          } else {
            this.faunaLookScratch.copy(eye).sub(grounded.position).normalize();
            this.faunaBillboardQuat.setFromUnitVectors(LIFE_AXIS_Z, this.faunaLookScratch);
            this.faunaProxyMatrix.compose(grounded.position, this.faunaBillboardQuat, this.faunaProxyScale);
            buckets[1].tryAdd(this.faunaProxyMatrix.elements);
          }
        }
      }
    }
    for (const [lod1, lod2] of this.faunaProxyBuckets.values()) { lod1.endFrame(); lod2.endFrame(); }
    for (const [id, rig] of this.faunaRigPool) if (!this.faunaActiveThisFrame.has(id)) rig.group.visible = false;
  }
  /** Acquires (creating or evicting-and-reusing a pool slot for) a real
   * skinned `CreatureRig` for `member`. Returns null when the pool is full
   * AND every current occupant is active this frame (herd member falls back
   * to the LOD1 proxy bucket instead -- see `drawFauna`). */
  private acquireFaunaRig(member: FaunaHerdMember): CreatureRig | null {
    if (this.faunaRigPool.size >= FAUNA_LOD0_MAX_CONCURRENT_RIGS) {
      let evictId: string | null = null;
      for (const id of this.faunaRigPool.keys()) { if (!this.faunaActiveThisFrame.has(id)) { evictId = id; break; } }
      if (!evictId) return null;
      const evictRig = this.faunaRigPool.get(evictId)!;
      this.group.remove(evictRig.group);
      evictRig.dispose();
      this.faunaRigPool.delete(evictId);
    }
    const genome = faunaMemberGenome(member);
    const rig = createFaunaSkinnedRig(genome);
    this.group.add(rig.group);
    this.faunaRigPool.set(member.id, rig);
    return rig;
  }
  contactPatches(point:V3,origin:V3):ContactPatch[]|null {
    // Close-range/contact-precision terrain must never be sampled before this
    // body's canonical hydrology set is known — the same "waiting" gate
    // landing and physics already use for unloaded tiles (below) now also
    // covers an unbuilt canonical river, so a settled capsule can never rest
    // on terrain that is about to change shape once the registry resolves.
    if(!hydrologyReady(this.body))return null;
    const originKey=origin.join(',');if(originKey!==this.contactOrigin){this.contactGeometryCache.clear();this.contactOrigin=originKey;}
    const radial=new THREE.Vector3(...point).normalize(),up=new THREE.Vector3(0,1,0);
    if(Math.abs(radial.dot(up))>.9)up.set(1,0,0);
    const east=new THREE.Vector3().crossVectors(up,radial).normalize(),north=new THREE.Vector3().crossVectors(radial,east).normalize();
    const selected=new Map<string,Patch>(),level=this.needsFineContact?this.fineContactLevel:this.contactLevel;
    const offsets=this.needsFineContact?(()=>{const step=Math.min(.5,(2*this.body.radiusM/2**level)/4),values:number[]=[];for(let value=-1;value<=1+1e-9;value+=step)values.push(Math.min(1,value));return [...new Set(values.map(value=>Number(value.toFixed(9))))];})():[-12,0,12];
    for(const x of offsets)for(const y of offsets){
      const d=new THREE.Vector3(...point).addScaledVector(east,x).addScaledVector(north,y).toArray() as V3;
      const key=tileKey(directionTile(d,level)),p=this.patches.get(key);
      if(!this.leafIndex.has(key)||!p||p.morph.value<1)return null;
      selected.set(key,p);
    }
    return [...selected].map(([key,p])=>{
      const mask=p.edge.value.toArray();
      const signature=key+'/'+mask.join(''),cached=this.contactGeometryCache.get(signature);if(cached)return cached;
      const result=contactGeometry(p.data,mask,this.body.radiusM,origin,signature);
      this.contactGeometryCache.set(signature,result);
      if(this.contactGeometryCache.size>32)this.contactGeometryCache.delete(this.contactGeometryCache.keys().next().value!);
      return result;
    });
  }
  diagnostics() {
    // The shared texture belongs to the existing water reservation. Inland
    // diagnostics count it when present; ocean-only worlds count it here.
    const oceanNormalBytes=this.river?.diagnostics().resident?0:[...this.patches.values()].some(p=>p.ocean)?SHARED_WATER_NORMAL_ATLAS_BYTES:0;
    return {projection: 'cube-sphere', forest:this.forest.diagnostics(), lowFlightDetail:this.lowFlightDetail, surfaceReady:this.surfaceReady, river:this.river?.diagnostics()||null, reflection:this.lakeReflection?.diagnostics()||null, environment:this.environment?.diagnostics()||null, ready: this.rootsReady, resident: this.patches.size, pending: this.pending.size, visible: this.active.size,
      // Moving-sea-level verification/observability (this task): the
      // quantized bucket `this.sample`/`this.classify` and newly-dispatched
      // tile jobs are currently using, plus how many of the currently VISIBLE
      // leaves still carry an older bucket's bake -- i.e. are mid-rebuild
      // through the async streaming queue rather than yet reflecting the
      // current sea level. Should read 0 once streaming has caught up after a
      // date seek; a sustained nonzero value with `pending===0` would indicate
      // a stuck rebuild.
      waterLevelM: this.waterBucket*WATER_LEVEL_BUCKET_M, waterBucket: this.waterBucket,
      staleWaterPatches:[...this.active].filter(k=>this.patches.get(k)!.waterBucket!==this.waterBucket).length,
      maxLevel: Math.max(0, ...[...this.active].map(k => this.patches.get(k)!.tile.level)), cacheLimit: this.contactFocus||this.lowFlightDetail?768:TILE_CACHE_LIMIT,
      contactLevel:this.contactFocus?(this.needsFineContact?this.fineContactLevel:this.contactLevel):null,baseContactLevel:this.contactFocus?this.contactLevel:null,minimumWaterLevel:this.minimumWaterLevel,underresolvedWaterTiles:this.underresolvedWaterTiles,waterRegionActive:this.waterRegionActive,accountedBytes:this.residentBytes+GROUND_ATLAS_BYTES+oceanNormalBytes,lifeReserveBytes:LIFE_RESERVE_BYTES,reservedCombinedBytes:this.residentBytes+GROUND_ATLAS_BYTES+WATER_ENVIRONMENT_RESERVE_BYTES+LIFE_RESERVE_BYTES+this.pending.size*PENDING_TILE_BYTES,terrainResidentBytes:this.residentBytes,groundAtlasBytes:GROUND_ATLAS_BYTES,oceanNormalBytes,pendingReserveBytes:this.pending.size*PENDING_TILE_BYTES,materialVersion:MATERIAL_VERSION,surfaceDetail:!!this.groundEnabled.value,budgetBytes:TOTAL_BUDGET_BYTES,failuresTotal:this.failuresTotal,updateMs:this.updateMs,lifeMs:this.lifeMs,rescatterMs:this.rescatterMs,drawFloraMs:this.drawFloraMs,drawFaunaMs:this.drawFaunaMs,faunaRigCount:this.faunaRigPool.size,floraSlotCount:this.floraSlotCount,floraPresentCount:this.floraPresentCount,floraSurvivorCount:this.floraSurvivorCount,floraSubmittedCount:this.floraSubmittedCount,faunaAnchorCount:this.faunaAnchorCount,
      faunaHerdCount:this.faunaHerdCount,faunaVisibleCount:this.faunaVisibleCount,
      failures: this.failures.size, faces: [...new Set([...this.active].map(k => Number(k.split('/')[0])))],
      detailPatches:[...this.active].filter(k=>this.groundEnabled.value&&this.patches.get(k)!.detail.value).length,
      oceanDraws:[...this.active].filter(k=>this.patches.get(k)!.ocean?.visible).length,
      maxVisibleSkirtDepthM:Math.max(0,...[...this.active].map(k=>this.patches.get(k)!.data.skirtDepthM)),
      debug:{...this.debug,activeTileIds:[...this.active],pendingTileIds:[...this.pending],eyeHeightM:this.eyeHeightUniform.value},
      skirtPatches:[...this.active].filter(k=>this.patches.get(k)!.mesh.geometry.drawRange.count>PATCH_SEGMENTS*PATCH_SEGMENTS*6).length,
      vertices: [...this.active].reduce((n,k) => n + this.patches.get(k)!.mesh.geometry.attributes.position.count, 0)};
  }
  private release(p: Patch) { this.reflectionRevision++;this.residentBytes=Math.max(0,this.residentBytes-p.bytes);this.group.remove(p.mesh);if(p.ocean){this.group.remove(p.ocean);p.ocean.geometry.dispose();p.ocean.material.dispose();} p.mesh.geometry.dispose(); p.map.dispose(); p.material.dispose(); }
  dispose() {
    this.disposed = true;
    for(const slot of this.workers)slot.worker.terminate();
    this.groundAtlas.dispose();
    this.atmosphere?.dispose();
    if(this.clouds){this.group.remove(this.clouds.mesh);this.clouds.dispose();this.clouds=null;}
    if(this.ring){
      this.group.remove(this.ring);
      this.ring.geometry.dispose();
      const ringMaterial=this.ring.material as THREE.MeshStandardMaterial;
      // createRingMesh sets map and alphaMap to the SAME DataTexture and
      // returns only the mesh, so material.dispose() alone would leak it.
      ringMaterial.map?.dispose();
      ringMaterial.dispose();
      this.ring=null;
    }
    this.lakeReflection?.dispose();this.lakeReflection=null;this.river?.dispose();this.river=null;
    this.environment?.dispose();this.environment=null;
    this.forest.dispose();
    for (const mesh of this.floraRenderer.meshes) { this.group.remove(mesh); mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); }
    for (const [lod1, lod2] of this.faunaProxyBuckets.values()) for (const bucket of [lod1, lod2]) { this.group.remove(bucket.mesh); bucket.mesh.geometry.dispose(); (bucket.mesh.material as THREE.Material).dispose(); }
    for (const rig of this.faunaRigPool.values()) { this.group.remove(rig.group); rig.dispose(); }
    this.faunaRigPool.clear();
    this.materialVisible(true);
    for (const p of this.patches.values()) this.release(p);
    this.patches.clear(); this.pending.clear(); this.inbox = [];
    this.host.remove(this.group);
  }
}
