import * as THREE from 'three';
import {floraShadowOrder,compareFaunaVisibility} from './life-shadow-priority.ts';
import {patchMorphHeader,patchMorphVertex,terrainDepthMaterial,boundMorphedTerrain} from './terrain-shadow.ts';
import type {RenderProfile} from './render-profile.ts';
import {attachLocalAerial,localAerialGLSL,LOCAL_AERIAL_VERSION} from './local-aerial-perspective.ts';
import { AU, type Body, type V3 } from './catalog.ts';
import { children, tileDirection, closestTileDirection, tileKey, directionTile, directionCoordinates, tileNeighbour, PATCH_SEGMENTS, type Tile, type buildTile } from './planet-tiles.ts';
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
import {detailTexture,detailOrigin,MATERIAL_VERSION,GROUND_ATLAS_BYTES,GROUND_RESOURCE_BYTES,GROUND_PBR_TEXTURE_BYTES,acquireGroundPbrTextures,groundVertexHeader,groundVertex,groundFragmentHeader,groundColor,groundRoughnessCode,groundNormalCode} from './ground-material.ts';
import {inlandRiversEnabled,activeRenderedRiverRegion} from './inland-rivers.ts';
import {VolumetricClouds,CLOUD_TARGET_BUDGET_BYTES} from './volumetric-clouds.ts';
import {ringSystemFor, ringActiveAt, createRingMesh, type RingSystem} from './planet-rings.ts';
import {spinStateFor} from './stellar-evolution.ts';
import {CATALOGUE_EPOCH_NS} from './world-time.ts';
import {prepareFlora, floraFromRecipe, toMyr, buildFloraGeometryData, floraGeometryToBufferGeometry, FLORA_KIND_NAMES, type FloraRecipe, type FloraKind, type FloraBiosphereGate, type FloraBiomeSample, type FloraStage} from './flora-field.ts';
import {FloraFieldRenderer, FloraCandidateBuffer, packCullPlane, pickFloraLodBand, DEFAULT_FRUSTUM_PLANE_COUNT} from './flora-culling.ts';
import {faunaHerdAt, faunaMemberActivityAtWorldNs, faunaRigSecondsAt, faunaMemberGenome, faunaGroundedTransform, toSeconds, type FaunaHerd, type FaunaHerdMember, type FaunaMemberActivity, type FaunaBiosphereGate, type FaunaStage, type CreatureArchetype, type CreatureGenome} from './fauna-runtime.ts';
import {FaunaFieldRenderer,FAUNA_FIELD_CAPACITY,FAUNA_FIELD_VISIBLE_M} from './fauna-field-renderer.ts';
import {FaunaNearRigs,FAUNA_NEAR_RIG_EXIT_M,type FaunaNearCandidate} from './fauna-near-rig.ts';
import {faunaGroundHeight,FAUNA_GROUND_N,FAUNA_GROUND_HALF_M,FAUNA_GROUND_STEP_M} from './fauna-ground.ts';
import {surfaceCellsWithin,type SurfaceCell} from './surface-cell.ts';
import {biomeClassifier} from './surface-biomes.ts';
import {PlanetForest} from './planet-forest.ts';
import {PlanetRocks} from './planet-rocks.ts';
import {TOTAL_BUDGET_BYTES,LIFE_RESERVE_BYTES,ROCK_RESERVE_BYTES,TERRAIN_BUDGET_BYTES,PENDING_TILE_BYTES,rendererMemoryAccounting} from './renderer-memory.ts';
import type {RockGate} from './rock-field.ts';
import {PLANET_DETAIL} from './planet-detail.ts';
import type {Species} from './biosphere-model.ts';
import type {TreeAssetOptions} from './tree-asset.ts';

// Canonical surface cells own organisms. Demand extends past visible range;
// bounded habitat work retains old cells while new neighbours load.
const LIFE_SLOT_CAPACITY = 6000;
const LIFE_RESCATTER_THRESHOLD_M = 16;
const LIFE_LOAD_MARGIN_M = 48;
const FLORA_KIND_CULL_RADIUS_M: Record<FloraKind, number> = { tree: 6, shrub: 2.5, grass: 1, flower: .6 };
const LIFE_UP_Y = new THREE.Vector3(0, 1, 0);
type LifeCell=SurfaceCell & {layer:'flora'|'fauna';cellSizeM:number};
type LifeResident={cell:LifeCell;height:number;biome:FloraBiomeSample;herd:FaunaHerd|null;ground:Float64Array|null;groundCursor:number;floraRecipe?:FloraRecipe};

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
  treeSpecies?: readonly Species[];
  faunaStage: FaunaStage;
  faunaAvailableArchetypes?: readonly CreatureArchetype[];
  faunaSpecies?: readonly { id: string; creature: CreatureGenome }[];
  /** Geology, not life: the solid-surface stage and the body's canonical
   * RockFamily records. Present on barren bodies too. */
  rocks?: RockGate;
}

type Patch ={ tile: Tile; mesh: THREE.Mesh; ocean:THREE.Mesh<THREE.BufferGeometry,OceanWaterMaterial>|null; localEye:{value:THREE.Vector3}; map: THREE.DataTexture; material: THREE.MeshStandardMaterial; morph: {value: number}; detail:{value:number}; pbrDetail:{value:number}; edge:{value:THREE.Vector4}; data:ReturnType<typeof buildTile>; bytes:number; touched: number; waterBucket: number };
/** Selection estimates use the already resident lattice. Calling the complete
 * procedural geology twice for every leaf and parent stalled contact frames.
 * Collision continues to use the actual settled mesh and authoritative field. */
function patchHeightAt(patch:Patch,d:V3){
  const t=patch.tile,[x,y,z]=d,a=Math.max(1e-12,Math.abs(d[Math.floor(t.face/2)]));
  const [u,v]=[[-z/a,y/a],[z/a,y/a],[x/a,-z/a],[x/a,z/a],[x/a,y/a],[-x/a,y/a]][t.face];
  const n=2**t.level,stride=PATCH_SEGMENTS+1;
  const px=Math.max(0,Math.min(PATCH_SEGMENTS,((u+1)*.5*n-t.x)*PATCH_SEGMENTS));
  const py=Math.max(0,Math.min(PATCH_SEGMENTS,((v+1)*.5*n-t.y)*PATCH_SEGMENTS));
  const ix=Math.min(PATCH_SEGMENTS-1,Math.floor(px)),iy=Math.min(PATCH_SEGMENTS-1,Math.floor(py)),fx=px-ix,fy=py-iy,h=patch.data.surfaceHeight;
  return (h[iy*stride+ix]*(1-fx)+h[iy*stride+ix+1]*fx)*(1-fy)
    +(h[(iy+1)*stride+ix]*(1-fx)+h[(iy+1)*stride+ix+1]*fx)*fy;
}
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
export type ShoreDebug={freezeSelection?:boolean;freezeMorph?:boolean;freezeWater?:boolean};

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
  // Desktop keeps its established terrain/contact working set plus a bounded
  // cloud target allocation. High-resolution clouds cannot consume collision
  // admission space or force the captured ground to become blurry on descent.
  private immersiveBudget=false;
  private get terrainBudgetBytes(){return TERRAIN_BUDGET_BYTES-(this.immersiveBudget?(this.clouds?.allocatedBytes??0):0);}
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
  private clouds: VolumetricClouds | null = null;
  private ring: THREE.Mesh | null = null;
  private ringSystem: RingSystem | null = null;
  private river:RiverWater|null=null;
  private lakeReflection:LakeReflection|null=null;
  private reflectionRevision=0;
  private environment:RiverEnvironment|null=null;
  private forest:PlanetForest;
  private rocks:PlanetRocks;
  private readonly lastEye=new THREE.Vector3();
  private lowFlightDetail=false;
  private surfaceReady=false;
  private eyeHeightUniform = {value:0};
  private localAirUniform={value:0};
  private debug:ShoreDebug={};
  setShoreDebug(options:ShoreDebug){Object.assign(this.debug,options);if(options.freezeSelection===false)this.selectionEye.setScalar(Infinity);}
  private sunUniform = {value:new THREE.Vector3(1,0,0)};
  private contactFocus:V3|null=null;
  /** Contact tessellation is selected around this position, independently of
   * camera position. Retaining it lets focus movement invalidate the leaf
   * frontier even when both the old and new focus are non-null. */
  private readonly selectionContactPoint=new THREE.Vector3(Infinity,Infinity,Infinity);
  private lastContactReadiness:{reason:string;requested:number;missingLeaf:number;missingResident:number;unmorphed:number;sampleKey?:string}|null=null;
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
  private mergeCursor=0;
  private mergeRemaining=0;
  private updateMs=0;
  private lifeMs=0;
  private rescatterMs=0;
  private drawFloraMs=0;
  private drawFaunaMs=0;
  private floraPresentCount=0;
  private floraSurvivorCount=0;
  private floraSubmittedCount=0;
  private groundAtlas:THREE.DataTexture;
  private readonly groundPbrTextures:ReturnType<typeof acquireGroundPbrTextures>;
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
  // Always false while inland rivers are withdrawn (inland-rivers.ts), so
  // ordinary dry-ground contact never enters the hydrology fine-contact mode.
  private get hasHydrology():boolean{return inlandRiversEnabled()&&((this.body.canonicalRivers?.length??0)>0||!!this.body.hydrology);}
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
  private readonly faunaRenderer=new FaunaFieldRenderer();
  /** Bounded skinned bodies for the nearest animals; a child of the field
   * renderer's origin-relative group, with the instanced batch as fallback. */
  private readonly faunaNear=new FaunaNearRigs();
  private readonly lifeOrigin=new THREE.Vector3();
  private readonly floraGroup=new THREE.Group();
  private readonly lifeResidents=new Map<string,LifeResident>();
  private lifeWanted:LifeCell[]=[];
  private lifeQueue:LifeCell[]=[];
  private lifeQueueIndex=0;
  private lifePackingDirty=true;
  private lifePackBuilds=0;
  private faunaGroundQueue:LifeResident[]=[];
  private faunaGroundValue=0;
  private readonly faunaGenomes=new Map<string,CreatureGenome>();
  private faunaCulledCount=0;
  private faunaBudgetDrops=0;
  private faunaDrawn: {id:string;cell:string|undefined;position:V3;genome:CreatureGenome}[]=[];
  private readonly faunaBounds=new THREE.Sphere();
  private readonly floraCandidates = new FloraCandidateBuffer(LIFE_SLOT_CAPACITY);
  private readonly floraDrawOrder=new Uint32Array(LIFE_SLOT_CAPACITY);
  private readonly floraCameraVisible=new Uint8Array(LIFE_SLOT_CAPACITY);
  private readonly floraCullPlanes = new Float32Array(DEFAULT_FRUSTUM_PLANE_COUNT * 4);
  private readonly lifeScatterCenter = new THREE.Vector3(Infinity, Infinity, Infinity);
  private lifeScatterValid = false;
  private readonly lifeBasisUp = new THREE.Vector3();
  private readonly lifeBasisRight = new THREE.Vector3();
  private readonly lifeBasisForward = new THREE.Vector3();
  private readonly lifeWorldUpScratch = new THREE.Vector3();
  private readonly lifeDirTuple: [number, number, number] = [0, 0, 0];
  private floraSlotCount = 0;
  private faunaAnchorCount = 0;
  private faunaHerdCount = 0;
  private faunaVisibleCount = 0;
  private readonly floraSlotDir = new Float64Array(LIFE_SLOT_CAPACITY * 3);
  private readonly floraSlotResidents:LifeResident[]=[];
  private floraRecipeBuilds=0;
  private readonly floraSlotHeightM = new Float32Array(LIFE_SLOT_CAPACITY);
  private readonly floraSlotWeights = new Float32Array(LIFE_SLOT_CAPACITY * 4);
  private readonly floraSlotForest = new Uint8Array(LIFE_SLOT_CAPACITY);
  private readonly floraSlotMoisture = new Float32Array(LIFE_SLOT_CAPACITY);
  private readonly floraSlotSlopeDeg = new Float32Array(LIFE_SLOT_CAPACITY);
  private readonly floraSlotOcean = new Uint8Array(LIFE_SLOT_CAPACITY);
  private readonly faunaHerds: (FaunaHerd | null)[] = [];
  private readonly faunaSurfaces: LifeResident[] = [];
  private readonly faunaAnchorDirections=new Float64Array(LIFE_SLOT_CAPACITY*3);
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
  private readonly faunaTraceEye=new THREE.Vector3();
  private faunaTraceNs:bigint|null=null;
  private readonly faunaTraceFrustum=new THREE.Frustum();
  private readonly faunaTraceShadow=new THREE.Frustum();
  private faunaTraceShadowValid=false;
  private faunaCameraVisibleCount=0;
  private readonly faunaTangentRight = new THREE.Vector3();
  private readonly faunaTangentForward = new THREE.Vector3();
  private readonly faunaTangentUp = new THREE.Vector3();
  private readonly faunaGroundDirScratch = new THREE.Vector3();
  private readonly faunaProxyMatrix = new THREE.Matrix4();
  private readonly faunaProxyScale = new THREE.Vector3();
  private readonly faunaGroundHeightAt=()=>this.faunaGroundValue;
  setContactFocus(point:V3|null) {
    const previous=this.contactFocus;
    this.contactFocus=point;
    if(!point){if(previous!==null)this.selectionDirty=true;return;}
    // Compare against the last selection anchor rather than the previous
    // setter value so small per-frame walker steps accumulate. A one-metre
    // deadband filters capsule settling noise while keeping collision support
    // ahead of ordinary walking movement.
    if(this.selectionContactPoint.distanceTo(new THREE.Vector3(...point))>1)this.selectionDirty=true;
  }
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
    this.groundPbrTextures=acquireGroundPbrTextures(anisotropy);
    this.sample=terrainSampler(body, undefined, surfaceAgeMyr);
    this.contactLevel=Math.max(14,Math.min(20,Math.ceil(Math.log2(2*body.radiusM/(PATCH_SEGMENTS*1.4)))));
    // Hydrology beds need sub-decimetre samples near the capsule. This is a
    // contact-only target; ordinary terrain keeps the established base level.
    // Keyed on the full canonical set (any known canonical river, not just
    // whichever one body.hydrology currently selects for rich rendering) so
    // contact precision near an unvisited canonical river is exact too, not
    // only near the one basin picked for water-mesh/vegetation detail.
    const hasHydrology=this.hasHydrology;
    this.fineContactLevel=hasHydrology?Math.max(this.contactLevel,Math.min(24,Math.ceil(Math.log2(2*body.radiusM/(PATCH_SEGMENTS*.09))))):this.contactLevel;
    this.minimumWaterLevel=hasHydrology?Math.max(0,Math.ceil(Math.log2(4*Math.SQRT2*body.radiusM/(PATCH_SEGMENTS*2800)))+1):null;
    // No river/lake water, reflection or bank dressing while inland rivers
    // are withdrawn; ocean water remains owned by the terrain patches.
    const riverRegion=activeRenderedRiverRegion(body);
    if(riverRegion){
      this.waterRegion=riverRegionSphere(riverRegion);
    }
    this.group.name = 'Planet terrain patches';
    this.group.scale.setScalar(radius);
    this.group.visible = false;
    host.add(this.group);
    if(riverRegion){this.river=new RiverWater(body,riverRegion);this.group.add(this.river.group);if(riverRegion.lakes.length)this.lakeReflection=new LakeReflection(body,riverRegion,frame=>this.river?.setLakeReflection(frame),this.river.group,{canAllocate:bytes=>this.river?.canAllocateLakeReflection(bytes)??false,setBytes:bytes=>this.river?.setLakeReflectionBytes(bytes)});}
    if(riverRegion){this.environment=new RiverEnvironment(body,riverRegion);this.group.add(this.environment.group);}
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
      this.clouds = new VolumetricClouds({
        hasAtmosphere: hasAtmosphereBody,
        hasOcean: hasOceanBody,
        gasGiant,
        temperatureK: body.temperatureK,
        radiusM: body.radiusM,
        spinPeriodS: spinStateFor(body).spinPeriodS,
      },this.group);
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
    // Canonical surface rocks share the terrain's rock PBR lease (not owned).
    this.rocks=new PlanetRocks({body,sample:()=>this.sample,classify:()=>this.classify,textures:this.groundPbrTextures,
      attach:mesh=>attachLocalAerial(mesh,this.group,body.radiusM,this.sunUniform,this.localAirUniform,this.eyeHeightUniform)});
    this.group.add(this.rocks.group);
    const floraSeedFor = (kind: FloraKind) => hashSeedString(body.seed + '/flora/' + kind);
    this.floraRenderer = new FloraFieldRenderer(
      (kind, lod) => floraGeometryToBufferGeometry(buildFloraGeometryData(kind, lod, floraSeedFor(kind))),
      () => new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.FrontSide }),
    );
    for (const mesh of this.floraRenderer.meshes) { mesh.name = 'Flora field'; mesh.frustumCulled = false; mesh.castShadow=true;mesh.receiveShadow=true; this.floraGroup.add(mesh); }
    this.faunaRenderer.group.add(this.faunaNear.group);
    this.group.add(this.floraGroup,this.faunaRenderer.group);
    this.localAirUniform.value=this.atmosphere?1:0;
    for(const group of [this.forest.group,this.floraGroup,this.faunaRenderer.group])group.traverse(object=>{
      if(object instanceof THREE.Mesh)attachLocalAerial(object,this.group,body.radiusM,this.sunUniform,this.localAirUniform,this.eyeHeightUniform,object.userData.localAerialSurfaceHit);
    });
  }

  /** Called by main.ts once per frame (before `update()`, or at any point
   * before it) with the biosphere gate/date computed from
   * `world-surface.ts`'s `biosphereStateAt`/`planetAgeMyr` -- see
   * `LifeGateContext`'s own doc comment. */
  setLifeContext(context: LifeGateContext | null): void { this.lifeContext = context; }
  loadForestTreeAssets(lod0:ArrayBuffer,lod1:ArrayBuffer,options:TreeAssetOptions={}){
    return this.loadForestTreeFamilies([{kind:'branching',lod0,lod1}],options);
  }
  loadForestTreeFamilies(inputs:readonly import('./forest-tree-family-library.ts').ForestTreeFamilyInput[],options:TreeAssetOptions={}){
    return this.forest.loadTreeFamilies(inputs,{...options,localAerial:{
      planet:this.group,frame:this.forest.group,radiusM:this.body.radiusM,
      sun:this.sunUniform,enabled:this.localAirUniform,eyeHeight:this.eyeHeightUniform,
    }});
  }
  clearForestTreeAssets(){this.forest.clearTreeAssets();}
  /** Acceptance probe: forest hand-off override / colour isolation (planet-forest.ts). */
  forestDebug(options:Parameters<PlanetForest['setDebug']>[0]){return this.forest.setDebug(options);}
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
  /** Offscreen far-forest atlas bake: a bounded number of views per frame
   * before the visible scene, never during XR. */
  renderForestAtlases(renderer:THREE.WebGLRenderer,xr=false){this.forest.renderFarAtlases(renderer,xr);}
  forestPresentationCensus(){return this.forest.presentationCensus();}
  rockCensus(){return this.rocks.census();}
  /** Sorted `id@lod` of the drawn rocks (replay comparisons; explicit call). */
  publishedRocks(){return this.rocks.publishedRocks();}
  rockWork(){return this.rocks.workSummary();}
  resetRockWork(){this.rocks.resetWorkHistory();}
  /** Height (m) of the terrain surface as drawn this frame along a planet
   * direction: the finest visible patch containing it, the same triangle
   * split and morph/edge-lock blend as the patch vertex shader, intersected
   * with the radial ray. Null where no visible patch covers the direction.
   * Diagnostic only; reads resident geometry, changes nothing. */
  renderedGroundHeightM(direction:V3){
    const l=Math.hypot(...direction),d:V3=[direction[0]/l,direction[1]/l,direction[2]/l];
    let patch:Patch|undefined;
    for(let level=30;level>=0&&!patch;level--){const key=tileKey(directionTile(d,level));if(this.active.has(key))patch=this.patches.get(key);}
    if(!patch)return null;
    const t=patch.tile,n=PATCH_SEGMENTS,stride=n+1,{u,v}=directionCoordinates(d),cells=2**t.level;
    const gx=Math.max(0,Math.min(n,((u+1)*.5*cells-t.x)*n)),gy=Math.max(0,Math.min(n,((v+1)*.5*cells-t.y)*n));
    const ix=Math.min(n-1,Math.floor(gx)),iy=Math.min(n-1,Math.floor(gy)),a=gx-ix,b=gy-iy;
    const pos=patch.data.positions,par=patch.data.parents,anchor=patch.data.anchor,edge=patch.edge.value,morph=patch.morph.value;
    const vertex=(x:number,y:number):V3=>{
      const lock=(x===0&&edge.x>0)||(x===n&&edge.y>0)||(y===0&&edge.z>0)||(y===n&&edge.w>0),blend=lock?0:morph,i=(y*stride+x)*3;
      return [anchor[0]+par[i]!+(pos[i]!-par[i]!)*blend,anchor[1]+par[i+1]!+(pos[i+1]!-par[i+1]!)*blend,anchor[2]+par[i+2]!+(pos[i+2]!-par[i+2]!)*blend];
    };
    // Index order per cell: (a, a+1, a+stride+1) and (a, a+stride+1, a+stride).
    const p0=vertex(ix,iy),p1=a>=b?vertex(ix+1,iy):vertex(ix+1,iy+1),p2=a>=b?vertex(ix+1,iy+1):vertex(ix,iy+1);
    const e1=[p1[0]-p0[0],p1[1]-p0[1],p1[2]-p0[2]],e2=[p2[0]-p0[0],p2[1]-p0[1],p2[2]-p0[2]];
    const nx=e1[1]!*e2[2]!-e1[2]!*e2[1]!,ny=e1[2]!*e2[0]!-e1[0]!*e2[2]!,nz=e1[0]!*e2[1]!-e1[1]!*e2[0]!;
    const denom=nx*d[0]+ny*d[1]+nz*d[2];if(Math.abs(denom)<1e-300)return null;
    const k=(nx*p0[0]+ny*p0[1]+nz*p0[2])/denom;
    return {heightM:(k-1)*this.body.radiusM,level:t.level,morph,tile:tileKey(t)};
  }
  /** Drawn rocks nearest the last update's eye, each checked against the
   * drawn terrain (centre and four base points at 30% of the footprint) and
   * the canonical sampler/sea level. Explicit acceptance diagnostic. */
  rockProbe(limit=64){
    const r=this.body.radiusM,eye=this.lastEye,water=this.waterBucket*WATER_LEVEL_BUCKET_M;
    const rocks=this.rocks.publishedRockProbe(eye,limit).map(rock=>{
      const d=rock.direction,up=rock.up,g=1+rock.groundHeightM/r;
      const ref=Math.abs(up[1])>.92?[1,0,0]:[0,1,0];
      let ex=ref[1]!*up[2]-ref[2]!*up[1],ey=ref[2]!*up[0]-ref[0]!*up[2],ez=ref[0]!*up[1]-ref[1]!*up[0];const el=Math.hypot(ex,ey,ez);ex/=el;ey/=el;ez/=el;
      const nx=up[1]*ez-up[2]*ey,ny=up[2]*ex-up[0]*ez,nz=up[0]*ey-up[1]*ex;
      // Base centre: the mesh base (y=0) is moved sinkM along up into the ground.
      const bx=d[0]*g-up[0]*rock.sinkM/r,by=d[1]*g-up[1]*rock.sinkM/r,bz=d[2]*g-up[2]*rock.sinkM/r,off=.3*rock.widthM/r;
      const points=[[0,0],[1,0],[-1,0],[0,1],[0,-1]].map(([x,z])=>{
        const px=bx+(ex*x+nx*z)*off,py=by+(ey*x+ny*z)*off,pz=bz+(ez*x+nz*z)*off,len=Math.hypot(px,py,pz);
        const baseHeightM=(len-1)*r,dir:V3=[px/len,py/len,pz/len],drawn=this.renderedGroundHeightM(dir),canonical=this.sample(dir);
        return {baseHeightM,renderedGroundM:drawn?.heightM??null,canonicalGroundM:canonical.groundHeightM,
          gapM:drawn?baseHeightM-drawn.heightM:null,level:drawn?.level??null,morph:drawn?.morph??null};
      });
      const centre=this.sample(d);
      return {...rock,renderedGroundM:points[0]!.renderedGroundM,tileLevel:points[0]!.level,morph:points[0]!.morph,
        canonicalDeltaM:points[0]!.renderedGroundM===null?null:points[0]!.renderedGroundM-rock.groundHeightM,
        // Positive gap: the base point is above the drawn ground (air under the rock there).
        maxBaseGapM:Math.max(...points.map(p=>p.gapM??-Infinity)),minTopClearanceM:points[0]!.renderedGroundM===null?null:rock.groundHeightM-rock.sinkM+rock.heightM-points[0]!.renderedGroundM,
        ocean:!!centre.ocean,wet:!!centre.wet,aboveWaterM:rock.groundHeightM-water,points};
    });
    return {eye:eye.toArray(),waterLevelM:water,bodyWater:this.body.water,rocks};
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
    geometry.setAttribute('groundSurfaceRoughness',new THREE.BufferAttribute(d.surfaceRoughness,1,false));
    geometry.setAttribute('uv', new THREE.BufferAttribute(d.uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(d.indices, 1));
    boundMorphedTerrain(geometry);
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
    const pbrDetail={value:0};
    const edge={value:new THREE.Vector4()};
    const localEye={value:new THREE.Vector3()};
    material.onBeforeCompile = shader => {
      shader.uniforms.patchMorph = morph;
      shader.uniforms.patchEdges=edge;
      shader.uniforms.patchTexels={value:d.width-2};
      shader.uniforms.tileAnchor={value:new THREE.Vector3(...d.anchor)};
      shader.uniforms.atlasLocalEyeM=localEye;shader.uniforms.atlasEyeHeightM=this.eyeHeightUniform;shader.uniforms.atlasSun=this.sunUniform;
      shader.uniforms.atlasRadius={value:this.body.radiusM};
      shader.uniforms.atlasAir=this.localAirUniform;
      shader.uniforms.groundHabitat={value:this.body.water>0&&this.body.temperatureK>=250&&this.body.temperatureK<=325&&this.body.type!=='Ice world'&&this.body.type!=='Volcanic world'?1:0};
      shader.uniforms.atlasRelief={value:this.relief};
      shader.uniforms.groundAtlas={value:this.groundAtlas};
      shader.uniforms.groundEnabled=this.groundEnabled;
      shader.uniforms.groundPatch=detail;
      shader.uniforms.groundSoilColorRoughness={value:this.groundPbrTextures.soilColor};
      shader.uniforms.groundSoilNormal={value:this.groundPbrTextures.soilNormal};
      shader.uniforms.groundRockColorRoughness={value:this.groundPbrTextures.rockColor};
      shader.uniforms.groundRockNormal={value:this.groundPbrTextures.rockNormal};
      shader.uniforms.groundPbrReady=this.groundPbrTextures.ready;
      shader.uniforms.groundPbrPatch=pbrDetail;
      shader.uniforms.groundOrigin={value:new THREE.Vector3(...detailOrigin(d.anchor,this.body.radiusM))};
      shader.vertexShader = patchMorphHeader+'attribute float surfaceHeight,parentHeight; uniform vec3 tileAnchor; varying vec3 atlasSurface,atlasLocalM; varying float atlasHeightM;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `${patchMorphVertex} atlasSurface=transformed+tileAnchor;
        atlasLocalM=transformed*atlasRadius; atlasHeightM=mix(parentHeight,surfaceHeight,patchBlend); ${groundVertex}`);
      shader.vertexShader=groundVertexHeader+'\n'+shader.vertexShader;
      shader.fragmentShader='uniform vec3 atlasLocalEyeM,atlasSun;uniform float atlasRadius,atlasAir,atlasRelief,atlasEyeHeightM;varying vec3 atlasSurface,atlasLocalM;varying float atlasHeightM;\n'+shader.fragmentShader;
      shader.fragmentShader=groundFragmentHeader+shader.fragmentShader;
      shader.fragmentShader=localAerialGLSL+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        ${groundColor}`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n'+groundRoughnessCode);
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n'+groundNormalCode);
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>', `
        outgoingLight=atlasApplyLocalAir(outgoingLight,length(atlasLocalEyeM-atlasLocalM),
          atlasEyeHeightM,atlasHeightM,dot(normalize(atlasSurface),atlasSun),atlasAir);
        #include <opaque_fragment>`);
    };
    material.customProgramCacheKey = () => 'planet-patch-ground-bed-v10/'+LOCAL_AERIAL_VERSION+'/ground-pbr-v1';
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow=true;mesh.castShadow=true;material.shadowSide=THREE.DoubleSide;
    mesh.customDepthMaterial=terrainDepthMaterial(morph,edge,d.width-2);
    mesh.position.set(...d.anchor);
    mesh.visible = false;
    mesh.userData.planetTile = key;
    // Retained off-camera shadow casters are culled separately by each camera.
    mesh.frustumCulled = true;
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
    const bufferBytes=d.positions.byteLength+d.parents.byteLength+d.normals.byteLength+d.materials.byteLength+d.surfaceRoughness.byteLength+d.uvs.byteLength+d.indices.byteLength+d.surfaceHeight.byteLength+d.parentHeight.byteLength+(d.oceanPositions?.byteLength||0)+(d.oceanParents?.byteLength||0);
    const bytes=bufferBytes*2+Math.ceil(d.color.byteLength*(1+4/3));
    this.patches.set(key, {tile: d.tile, mesh, ocean,localEye,map, material, morph, detail,pbrDetail,edge,data:d,bytes,touched: this.frame,waterBucket});
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
  update(observer: V3, height: number, fov: number, dt: number, immersive = false, sun: V3 = [1,0,0], frusta: THREE.Frustum[] = [], worldNs: bigint = CATALOGUE_EPOCH_NS, life: LifeGateContext | null = this.lifeContext, waterLevelM: number = 0,shadowFrustum:THREE.Frustum|null=null) {
    if (this.disposed) return;
    this.immersiveBudget=immersive;
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
    const contactDirection=contact?.clone().normalize();
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
    this.clouds?.update(this.body.seed,this.body.id,worldNs,this.sunUniform.value);
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
    // Visible forest density is centred on the observer's ground position.
    // View direction may inform future prefetch, never population coverage:
    // moving this focus ahead made turning in place replace dense forest.
    this.forest.update(eye,forestFocus.toArray() as V3,altitudeM,forestEnabled,snappedWaterLevelM,immersive,frusta,worldNs,this.lifeContext?.treeSpecies,shadowFrustum);
    this.lastEye.copy(eye);
    this.rocks.update({eye,focus:lifeFocus,altitudeM,gate:this.lifeContext?.rocks,relief:this.relief,waterLevelM:snappedWaterLevelM,frusta,shadowFrustum});
    if (this.relief === 1 && (contact||altitudeM<PLANET_DETAIL.groundLifeAltitudeM) && this.lifeContext) { const lifeStarted=performance.now(); this.updateLife(eye, lifeFocus, frusta[0] ?? null, worldNs,shadowFrustum); this.lifeMs=performance.now()-lifeStarted; }
    else { this.hideLife(); this.lifeMs=0; }
    const direction = eye.clone().normalize();
    const pixels = height / (2 * Math.tan(fov * Math.PI / 360));
    if(this.waterRegion){const near=Math.max(1e-9,eye.distanceTo(this.waterRegion.center)-this.waterRegion.radius);this.waterRegionActive=this.waterRegion.radius*pixels/near>=8;}else this.waterRegionActive=false;
    const projectionCache=new Map<string,{visible:boolean;score:number;contactNear:number;waterPriority:boolean;finePriority:boolean}>();
    const retainedFrusta=shadowFrustum?[...frusta,shadowFrustum]:frusta;
    const viewNormals=retainedFrusta.flatMap(f=>f.planes.flatMap(p=>p.normal.toArray()));
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
      const visible = horizon && (!frusta.length || retainedFrusta.some(f => f.intersectsSphere(sphere)));
      if(!changed)return {visible,score:0,contactNear:Infinity,waterPriority:false,finePriority:false};
      const nearest = closestTileDirection(t,observer);
      const elevation=resident?patchHeightAt(resident,nearest):groundHeight*this.relief;
      const ground=new THREE.Vector3(...nearest).multiplyScalar(1+Math.max(this.body.water?snappedWaterLevelM*this.relief:-Infinity,elevation)/this.body.radiusM);
      const near = Math.max(1e-9, eye.distanceTo(ground));
      let contactNear=Infinity;
      if(contact&&contactDirection){const d=closestTileDirection(t,contact.toArray() as V3);contactNear=contactDirection.distanceTo(new THREE.Vector3(...d))*this.body.radiusM;}
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
    const leaves = this.leafIndex.size?[...this.leafIndex.values()]:[...ROOTS];
    if (this.rootsReady&&changed) {
      this.selectionEye.copy(eye);this.selectionContact=!!contact;this.selectionFrustum=viewNormals;this.selectionPixels=pixels;
      if(contact)this.selectionContactPoint.copy(this.contactFocus?new THREE.Vector3(...this.contactFocus):eye);
      else this.selectionContactPoint.set(Infinity,Infinity,Infinity);
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
      const mergeCandidates=[...parents.entries()],mergeStarted=performance.now();
      if(this.mergeRemaining<=0)this.mergeRemaining=mergeCandidates.length;
      else this.mergeRemaining=Math.min(this.mergeRemaining,mergeCandidates.length);
      let scanned=0;
      const mergeStart=this.mergeCursor%Math.max(1,mergeCandidates.length);
      const mergeLimit=Math.min(this.mergeRemaining,mergeCandidates.length,64);
      for(;scanned<mergeLimit;){
        if(scanned>0&&performance.now()-mergeStarted>1.5)break;
        const [key,parent]=mergeCandidates[(mergeStart+scanned++)%mergeCandidates.length];
        const kids=children(parent);if(!kids.every(k=>initial.has(tileKey(k))))continue;
        const projection=projected(parent),score=projection.score;
        // Mandatory support must not be merged simply because a still-finer
        // capsule tile has a larger priority. That caused collapse/refine
        // oscillation at L21 while the capsule waited forever for L22.
        if(contact&&((projection.contactNear<28&&parent.level<this.contactLevel)||
          (this.needsFineContact&&projection.contactNear<3&&parent.level<this.fineContactLevel)))continue;
        const pressure=leaves.length>drawLimit-60||this.residentBytes>this.terrainBudgetBytes*.94;
        if(score>(immersive?210:160)&&!(pressure&&score<urgent/4))continue;
        if([0,1,2,3].some(e=>(deepest.get(tileKey(tileNeighbour(parent,e)))??0)>parent.level+1))continue;
        if(!this.patches.has(key))continue;
        for(const child of kids){const index=leaves.findIndex(t=>tileKey(t)===tileKey(child));if(index>=0)leaves.splice(index,1);}
        leaves.push(parent);this.selectionDirty=true;
      }
      this.mergeCursor=(mergeStart+scanned)%Math.max(1,mergeCandidates.length);
      this.mergeRemaining=Math.max(0,this.mergeRemaining-scanned);
      if(this.mergeRemaining>0)this.selectionDirty=true;
      const iterations=contact?256:24;
      for (let iteration = 0; iteration < iterations; iteration++) {
        if(iteration>0&&performance.now()-selectionStarted>3){this.selectionDirty=true;break;}
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
      // A retained frontier can stop refining while its baked water bucket is
      // stale. Request freshness independently of camera/LOD selection changes.
      // The previous complete tile stays visible until its replacement lands.
      request(t);
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
      p.pbrDetail.value=p.detail.value&&near*this.body.radiusM<1800?1:0;
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
    const bytePressure=()=>this.residentBytes+(this.pending.size+1)*PENDING_TILE_BYTES>this.terrainBudgetBytes;
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
      if (this.pending.size >= this.workers.length*2 || this.patches.size + this.pending.size >= cacheLimit||this.residentBytes+(this.pending.size+1)*PENDING_TILE_BYTES>this.terrainBudgetBytes) break;
      this.pending.add(key);
      this.workers[this.nextWorker=(this.nextWorker+1)%this.workers.length].worker.postMessage({key, tile, body: this.body, relief: this.relief, waterLevelM: snappedWaterLevelM, waterBucket});
    }
    this.updateMs=performance.now()-started;
  }
  private hideLife(): void {
    this.floraRecipeBuilds=0;
    this.faunaVisibleCount=0;this.faunaCulledCount=0;this.faunaBudgetDrops=0;this.faunaDrawn=[];
    this.floraRenderer.beginFrame();this.floraRenderer.endFrame();
    this.faunaRenderer.beginFrame(this.lifeOrigin);this.faunaRenderer.endFrame();this.faunaNear.hide();
  }
  private updateLife(eye: THREE.Vector3, contact: THREE.Vector3, frustum: THREE.Frustum | null, worldNs: bigint,shadowFrustum:THREE.Frustum|null): void {
    const life=this.lifeContext;if(!life){this.hideLife();return;}
    const signature=`${this.waterBucket}|${life.floraStage}|${life.faunaStage}|${life.floraAvailableKinds?.join(',')}|${life.faunaAvailableArchetypes?.join(',')}|${life.faunaSpecies?.map(s=>s.id).join(',')??''}`;
    if(signature!==this.lifeSignature){this.lifeSignature=signature;this.lifeScatterValid=false;this.lifeResidents.clear();this.faunaGenomes.clear();this.faunaNear.clear();this.faunaGroundQueue=[];}
    const t0=performance.now();
    if(!this.lifeScatterValid||contact.distanceTo(this.lifeScatterCenter)*this.body.radiusM>LIFE_RESCATTER_THRESHOLD_M){
      this.rescatterLife(contact);this.lifeScatterCenter.copy(contact);this.lifeScatterValid=true;
    }
    this.processLifeQueue();this.rescatterMs=performance.now()-t0;
    if(!frustum){this.hideLife();return;}
    this.lifeOrigin.copy(eye);this.floraGroup.position.copy(eye);
    const t1=performance.now();this.drawFlora(life,eye,frustum,shadowFrustum);this.drawFloraMs=performance.now()-t1;
    const t2=performance.now();this.drawFauna(eye,worldNs,frustum,shadowFrustum);this.drawFaunaMs=performance.now()-t2;
  }
  private rescatterLife(point:THREE.Vector3):void {
    this.lifePackingDirty=true;
    const d=point.clone().normalize().toArray() as V3,r=this.body.radiusM;
    const cells:LifeCell[]=[];
    const add=(range:number,size:number,layer:'flora'|'fauna')=>{
      for(const c of surfaceCellsWithin(d,r,range,size))cells.push({...c,id:`${layer}/${size}/${c.id}`,cellSizeM:size,layer});
    };
    // Fine grass remains a bounded neighbourhood; shrubs have the full 120 m
    // draw range. Herd anchors cover visibility + motion + streaming margins.
    add(34,2,'flora');add(120+LIFE_LOAD_MARGIN_M,24,'flora');add(FAUNA_FIELD_VISIBLE_M+LIFE_LOAD_MARGIN_M+16,32,'fauna');
    cells.sort((a,b)=>Math.hypot(a.direction[0]-d[0],a.direction[1]-d[1],a.direction[2]-d[2])-Math.hypot(b.direction[0]-d[0],b.direction[1]-d[1],b.direction[2]-d[2])||a.id.localeCompare(b.id));
    this.lifeWanted=cells;this.lifeQueue=cells.filter(c=>!this.lifeResidents.has(c.id));this.lifeQueueIndex=0;
    // Habitat for visible herds must not wait behind thousands of grass cells.
    this.lifeQueue.sort((a,b)=>(a.layer==='fauna'?0:1)-(b.layer==='fauna'?0:1));
    const wanted=new Set(cells.map(c=>c.id));
    // Retain an extra band to absorb boundary oscillation, without growing a
    // journey-sized cache. Canonical keys survive removal and re-generation.
    for(const [id,record] of this.lifeResidents){
      const range=record.cell.layer==='fauna'?FAUNA_FIELD_VISIBLE_M+140:record.cell.cellSizeM===2?70:210;
      if(!wanted.has(id)&&Math.hypot(record.cell.direction[0]-d[0],record.cell.direction[1]-d[1],record.cell.direction[2]-d[2])*r>range)this.lifeResidents.delete(id);
    }
  }
  private processLifeQueue():void {
    const life=this.lifeContext!,start=performance.now(),r=this.body.radiusM;
    const gate=this.faunaGateScratch;gate.stage=life.faunaStage;gate.availableArchetypes=life.faunaAvailableArchetypes;gate.species=life.faunaSpecies;
    for(let count=0;this.lifeQueueIndex<this.lifeQueue.length&&count<32&&performance.now()-start<2;count++){
      const cell=this.lifeQueue[this.lifeQueueIndex++],d=cell.direction;
      const sample=this.sample(d),up=this.lifeBasisUp.set(...d);
      const ref=Math.abs(up.y)>.92?this.lifeWorldUpScratch.set(1,0,0):this.lifeWorldUpScratch.set(0,1,0);
      const right=this.lifeBasisRight.crossVectors(ref,up).normalize(),forward=this.lifeBasisForward.crossVectors(up,right).normalize();
      const offset=(basis:THREE.Vector3,metres:number)=>{
        this.floraScratchDirVec.copy(up).addScaledVector(basis,metres/r).normalize();
        return this.sample(this.floraScratchDirVec.toArray() as V3).groundHeightM;
      };
      const step=cell.cellSizeM===2?1:4,gx=(offset(right,step)-offset(right,-step))/(2*step),gz=(offset(forward,step)-offset(forward,-step))/(2*step);
      const classified=this.classify(d,sample.groundHeightM,1/Math.sqrt(1+gx*gx+gz*gz));
      const biome:FloraBiomeSample={...classified,weights:classified.weights as [number,number,number,number]};
      // Preserve the original canonical fauna key, independent of queue/grid.
      const canonicalId=cell.id.split('/').slice(2).join('/');
      const herd=cell.layer==='fauna'?faunaHerdAt(this.body.seed,this.body.id,d,biome,gate,toSeconds(0),canonicalId):null;
      const resident:LifeResident={cell,height:sample.groundHeightM,biome,herd,ground:herd?.present?new Float64Array(FAUNA_GROUND_N**2):null,groundCursor:0};
      this.lifeResidents.set(cell.id,resident);this.lifePackingDirty=true;if(resident.ground)this.faunaGroundQueue.push(resident);
    }
    // Finish immutable herd terrain stencils incrementally; a herd is only
    // published once its entire stencil exists, avoiding elevation changes.
    for(let count=0;this.faunaGroundQueue.length&&count<32&&performance.now()-start<3;count++){
      const record=this.faunaGroundQueue[0];
      if(!this.lifeResidents.has(record.cell.id)){this.faunaGroundQueue.shift();continue;}
      const up=this.lifeBasisUp.set(...record.cell.direction),ref=Math.abs(up.y)>.92?this.lifeWorldUpScratch.set(1,0,0):this.lifeWorldUpScratch.set(0,1,0);
      const right=this.lifeBasisRight.crossVectors(ref,up).normalize(),forward=this.lifeBasisForward.crossVectors(up,right).normalize();
      const index=record.groundCursor++,x=(index%FAUNA_GROUND_N)*FAUNA_GROUND_STEP_M-FAUNA_GROUND_HALF_M,z=Math.floor(index/FAUNA_GROUND_N)*FAUNA_GROUND_STEP_M-FAUNA_GROUND_HALF_M;
      this.faunaGroundDirScratch.copy(up).addScaledVector(right,x/r).addScaledVector(forward,z/r).normalize();
      record.ground![index]=this.sample(this.faunaGroundDirScratch.toArray() as V3).groundHeightM;
      if(record.groundCursor===FAUNA_GROUND_N**2){this.faunaGroundQueue.shift();this.lifePackingDirty=true;}
    }
    // The packed habitat and herd anchors are immutable between arrivals,
    // completed terrain stencils and changed demand. Poses still update below.
    if(!this.lifePackingDirty)return;
    this.lifePackingDirty=false;this.lifePackBuilds++;
    let flora=0,fauna=0,herds=0;
    for(const cell of this.lifeWanted){
      const record=this.lifeResidents.get(cell.id);if(!record)continue;
      if(cell.layer==='fauna'){
        if(!record.herd?.present||record.groundCursor<FAUNA_GROUND_N**2)continue;
        this.faunaAnchorDirections.set(cell.direction,fauna*3);this.faunaSurfaces[fauna]=record;this.faunaHerds[fauna++]=record.herd;herds++;continue;
      }
      if(flora>=LIFE_SLOT_CAPACITY)continue;
      this.floraSlotResidents[flora]=record;
      const b=record.biome;this.floraSlotDir.set(cell.direction,flora*3);this.floraSlotHeightM[flora]=record.height;
      this.floraSlotWeights.set(b.weights,flora*4);this.floraSlotForest[flora]=b.forestPotential?1:0;
      this.floraSlotMoisture[flora]=b.moisture;this.floraSlotSlopeDeg[flora]=b.slopeDeg;this.floraSlotOcean[flora]=b.ocean?1:0;flora++;
    }
    this.floraSlotResidents.length=flora;
    this.floraSlotCount=flora;this.faunaAnchorCount=fauna;this.faunaHerdCount=herds;this.faunaHerds.length=fauna;
    // Genome objects live with the retained herd working set, never forever.
    if(this.faunaGenomes.size>2048){const ids=new Set(this.faunaHerds.flatMap(h=>h?.members.map(m=>m.id)??[]));for(const id of this.faunaGenomes.keys())if(!ids.has(id))this.faunaGenomes.delete(id);}
  }
  /** Per-frame flora cull+draw. See the module-header UNIT-MISMATCH FINDING
   * comment above `LifeGateContext` for why this does NOT call
   * flora-culling.ts's `drawFloraCandidates` convenience wrapper directly. */
  private drawFlora(life: LifeGateContext, eye: THREE.Vector3, frustum: THREE.Frustum,shadowFrustum:THREE.Frustum|null): void {
    for (let i = 0; i < DEFAULT_FRUSTUM_PLANE_COUNT; i++) {
      const p = frustum.planes[i]!;
      packCullPlane(this.floraCullPlanes, i, p.normal.x, p.normal.y, p.normal.z, p.constant+p.normal.dot(this.lifeOrigin));
    }
    this.floraCandidates.clear();
    const gate = this.floraGateScratch;
    gate.stage = life.floraStage; gate.availableKinds = life.floraAvailableKinds;
    const tMyr = toMyr(life.tMyr);
    const radiusM = this.body.radiusM, relief = this.relief, b = this.floraBiomeScratch;
    this.floraPresentCount = 0;
    this.floraRecipeBuilds=0;
    for (let i = 0; i < this.floraSlotCount; i++) {
      const wb = i * 4;
      b.weights[0] = this.floraSlotWeights[wb]!; b.weights[1] = this.floraSlotWeights[wb + 1]!; b.weights[2] = this.floraSlotWeights[wb + 2]!; b.weights[3] = this.floraSlotWeights[wb + 3]!;
      b.forestPotential = !!this.floraSlotForest[i]; b.moisture = this.floraSlotMoisture[i]!; b.slopeDeg = this.floraSlotSlopeDeg[i]!; b.ocean = !!this.floraSlotOcean[i];
      const sb = i * 3;
      this.lifeDirTuple[0] = this.floraSlotDir[sb]!; this.lifeDirTuple[1] = this.floraSlotDir[sb + 1]!; this.lifeDirTuple[2] = this.floraSlotDir[sb + 2]!;
      const resident=this.floraSlotResidents[i];
      // Preserve the original Float32 habitat inputs above. Cache follows the
      // canonical resident, never the transient packed slot. Water/gate changes
      // already replace these residents; eviction releases their recipes.
      if(!resident.floraRecipe){resident.floraRecipe=prepareFlora(this.body.seed,this.body.id,this.lifeDirTuple,b,gate);this.floraRecipeBuilds++;}
      const instance = floraFromRecipe(resident.floraRecipe,tMyr);
      if (!instance.present) continue;
      if(instance.kind==='tree')continue; // The continuous forest owns trees at every altitude.
      this.floraPresentCount++;
      const dx = this.lifeDirTuple[0], dy = this.lifeDirTuple[1], dz = this.lifeDirTuple[2];
      const heightM = this.floraSlotHeightM[i]!, r = 1 + heightM * relief / radiusM;
      this.floraScratchPos.set(dx * r, dy * r, dz * r).sub(this.lifeOrigin);
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
    const cameraCount=this.floraCandidates.cull(this.floraCullPlanes,DEFAULT_FRUSTUM_PLANE_COUNT);
    const survivorCount=floraShadowOrder(this.floraCandidates,cameraCount,shadowFrustum,this.lifeOrigin,this.floraDrawOrder,this.floraCameraVisible,this.faunaBounds);
    this.floraSurvivorCount = cameraCount;
    this.floraSubmittedCount = 0;
    for (let slot = 0; slot < survivorCount; slot++) {
      const idx = this.floraDrawOrder[slot];
      const cdx = this.floraCandidates.centerX[idx]!, cdy = this.floraCandidates.centerY[idx]!, cdz = this.floraCandidates.centerZ[idx]!;
      const distanceM = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz) * radiusM;
      const lod = pickFloraLodBand(distanceM);
      if (lod === -1) continue;
      const kind = FLORA_KIND_NAMES[this.floraCandidates.kindIndex[idx]!]!;
      if(this.floraRenderer.submit(kind, lod, this.floraCandidates.matrices, idx * 16))this.floraSubmittedCount++;
    }
    this.floraRenderer.endFrame();
  }
  /** Tangent frame for packed herd `a`; false when the herd is beyond the
   * coarse visibility range. Shared by drawing and `faunaTrace`. */
  private faunaHerdFrame(a:number,eye:THREE.Vector3,ignoreRange=false):boolean {
    const radiusM=this.body.radiusM;
    this.faunaAnchorPos.fromArray(this.faunaAnchorDirections,a*3);
    this.faunaGroundDirScratch.copy(eye).normalize();
    const inRange=this.faunaGroundDirScratch.distanceTo(this.faunaAnchorPos)*radiusM<=FAUNA_FIELD_VISIBLE_M+20;
    if(!inRange&&!ignoreRange)return false;
    const ref=Math.abs(this.faunaAnchorPos.y)>.92?this.lifeWorldUpScratch.set(1,0,0):this.lifeWorldUpScratch.set(0,1,0);
    this.faunaTangentRight.crossVectors(ref,this.faunaAnchorPos).normalize().multiplyScalar(1/radiusM);
    this.faunaTangentForward.crossVectors(this.faunaAnchorPos,this.faunaTangentRight).normalize().multiplyScalar(1/radiusM);
    this.faunaTangentUp.copy(this.faunaAnchorPos).multiplyScalar(1/radiusM);
    return inRange;
  }
  private faunaPlace(a:number,pose:FaunaMemberActivity['pose']){
    this.faunaGroundValue=faunaGroundHeight(this.faunaSurfaces[a].ground!,pose.x,pose.z)*this.relief;
    return faunaGroundedTransform(this.faunaAnchorPos,this.faunaTangentRight,this.faunaTangentForward,this.faunaTangentUp,pose,this.faunaGroundHeightAt);
  }
  private faunaBoundsIntersect(position:THREE.Vector3,frustum:THREE.Frustum):boolean {
    const radiusM=this.body.radiusM;
    this.faunaBounds.center.copy(position).addScaledVector(this.faunaAnchorPos,3/radiusM);this.faunaBounds.radius=6/radiusM;
    return frustum.intersectsSphere(this.faunaBounds);
  }
  /** Diagnostics only: follow canonical individuals through every stage of
   * the last drawn fauna frame (census residency, terrain stencil, dated
   * position, range, camera/shadow visibility, budget, near rig, lighting).
   * Re-evaluates with the exact draw-path helpers and that frame's eye,
   * frusta and date; it never mutates population or presentation state. */
  faunaTrace(ids:readonly string[]){
    const radiusM=this.body.radiusM,eye=this.faunaTraceEye,worldNs=this.faunaTraceNs;
    if(worldNs===null)return {frame:null,individuals:ids.map(id=>({id,stage:'no-fauna-frame'}))};
    const drawnIndex=new Map(this.faunaDrawn.map((x,i)=>[x.id,i]));
    const sun=this.sunUniform.value;
    const individuals=ids.map(id=>{
      let resident:LifeResident|undefined,member:FaunaHerdMember|undefined;
      for(const record of this.lifeResidents.values()){const m=record.herd?.present?record.herd.members.find(x=>x.id===id):undefined;if(m){resident=record;member=m;break;}}
      if(!resident||!member)return {id,stage:'not-resident'};
      const cell=resident.cell,wanted=this.lifeWanted.some(c=>c.id===cell.id),groundReady=resident.groundCursor>=FAUNA_GROUND_N**2;
      const {speciesGenome:_genome,...record}=member;
      const census={cellId:cell.id,direction:[...cell.direction],wanted,groundReady,groundCursor:resident.groundCursor,memberIndex:(resident.herd!.members as readonly FaunaHerdMember[]).indexOf(member),member:record};
      const a=this.faunaSurfaces.indexOf(resident);
      if(!groundReady||a<0||a>=this.faunaAnchorCount)return {id,stage:groundReady?'not-packed':'terrain-pending',census};
      const activity=faunaMemberActivityAtWorldNs(member,worldNs);
      const inRange=this.faunaHerdFrame(a,eye,true),anchorUp=this.faunaAnchorPos.clone();
      const grounded=this.faunaPlace(a,activity.pose),distanceM=eye.distanceTo(grounded.position)*radiusM;
      const cameraVisible=this.faunaBoundsIntersect(grounded.position,this.faunaTraceFrustum);
      const shadowVisible=this.faunaTraceShadowValid&&this.faunaBoundsIntersect(grounded.position,this.faunaTraceShadow);
      const drawn=drawnIndex.get(id),rigged=this.faunaNear.poseOf(id)!==null;
      const toEye=eye.clone().sub(grounded.position).normalize();
      const stage=!inRange||distanceM>FAUNA_FIELD_VISIBLE_M?'out-of-range':!cameraVisible&&!shadowVisible?'culled':
        drawn===undefined?'budget-drop':rigged?'near-rig':cameraVisible?'instanced':'shadow-only-instanced';
      return {id,stage,census,
        pose:{x:activity.pose.x,z:activity.pose.z,yaw:activity.pose.yaw,gait:activity.pose.gait,travel:activity.travel,stateS:activity.stateS},
        position:grounded.position.toArray(),distanceM,cameraVisible,shadowVisible,drawnIndex:drawn??null,rigged,
        lighting:{sunElevation:anchorUp.dot(sun),viewFromSunSide:toEye.dot(sun)}};
    });
    return {frame:{worldNs:worldNs.toString(),eye:eye.toArray(),drawn:this.faunaDrawn.length,cameraVisible:this.faunaCameraVisibleCount,capacity:FAUNA_FIELD_CAPACITY,budgetDrops:this.faunaBudgetDrops,culled:this.faunaCulledCount,anchors:this.faunaAnchorCount,near:this.faunaNear.diagnostics().activeMembers.map(m=>m.id)},individuals};
  }
  /** Visible animals are sorted before the finite GPU budget is allocated.
   * All distances use the same individual genome and animated representation. */
  private drawFauna(eye:THREE.Vector3,worldNs:bigint,frustum:THREE.Frustum,shadowFrustum:THREE.Frustum|null):void {
    const radiusM=this.body.radiusM,rigTime=faunaRigSecondsAt(worldNs);
    this.faunaRenderer.beginFrame(this.lifeOrigin);this.faunaVisibleCount=0;this.faunaCulledCount=0;this.faunaBudgetDrops=0;this.faunaDrawn=[];
    const visible:{cameraVisible:boolean;member:FaunaHerdMember;position:THREE.Vector3;quaternion:THREE.Quaternion;distance:number;gait:FaunaMemberActivity['pose']['gait'];activity:FaunaMemberActivity;anchor:number}[]=[];
    this.faunaTraceEye.copy(eye);this.faunaTraceNs=worldNs;this.faunaTraceFrustum.copy(frustum);
    this.faunaTraceShadowValid=!!shadowFrustum;if(shadowFrustum)this.faunaTraceShadow.copy(shadowFrustum);
    for(let a=0;a<this.faunaAnchorCount;a++){
      const herd=this.faunaHerds[a];if(!herd?.present)continue;
      // One coarse check per herd; no allocations or terrain queries here.
      if(!this.faunaHerdFrame(a,eye))continue;
      for(const member of herd.members){
        const activity=faunaMemberActivityAtWorldNs(member,worldNs),pose=activity.pose;
        const grounded=this.faunaPlace(a,pose);
        const distance=eye.distanceTo(grounded.position)*radiusM;if(distance>FAUNA_FIELD_VISIBLE_M)continue;
        const cameraVisible=this.faunaBoundsIntersect(grounded.position,frustum);
        if(!cameraVisible&&!(shadowFrustum&&this.faunaBoundsIntersect(grounded.position,shadowFrustum))){this.faunaCulledCount++;continue;}
        visible.push({cameraVisible,member,...grounded,distance,gait:pose.gait,activity,anchor:a});
      }
    }
    visible.sort(compareFaunaVisibility);
    this.faunaCameraVisibleCount=0;for(const item of visible)if(item.cameraVisible)this.faunaCameraVisibleCount++;
    this.faunaProxyScale.setScalar(1/radiusM);
    const genomeOf=(member:FaunaHerdMember)=>{let genome=this.faunaGenomes.get(member.id);if(!genome){genome=faunaMemberGenome(member);this.faunaGenomes.set(member.id,genome);}return genome;};
    // The nearest camera-visible animals may draw as skinned bodies posed on
    // their herd's ground stencil, with the same outer transform as below.
    // Anything not rigged this frame keeps the instanced representation.
    const near:FaunaNearCandidate[]=[],relief=this.relief;
    for(const item of visible){
      if(!item.cameraVisible||item.distance>FAUNA_NEAR_RIG_EXIT_M||near.length>=this.faunaNear.capacity*2)break;
      const ground=this.faunaSurfaces[item.anchor].ground!;
      near.push({member:item.member,genome:genomeOf(item.member),distanceM:item.distance,activity:item.activity,rigSeconds:rigTime,
        matrix:new THREE.Matrix4().compose(item.position.clone().sub(this.lifeOrigin),item.quaternion,this.faunaProxyScale),
        ground:(x,z)=>faunaGroundHeight(ground,x,z)*relief});
    }
    const rigged=this.faunaNear.update(near);
    for(const item of visible){
      if(this.faunaVisibleCount>=FAUNA_FIELD_CAPACITY){this.faunaBudgetDrops++;continue;}
      const genome=genomeOf(item.member);
      this.faunaDrawn.push({id:item.member.id,cell:item.member.spatialCellId,position:item.position.toArray() as V3,genome});
      if(rigged.has(item.member.id)){this.faunaVisibleCount++;continue;}
      item.position.sub(this.lifeOrigin);this.faunaProxyMatrix.compose(item.position,item.quaternion,this.faunaProxyScale);
      if(this.faunaRenderer.submit(genome,this.faunaProxyMatrix,rigTime,item.gait,item.distance))this.faunaVisibleCount++;else this.faunaBudgetDrops++;
    }
    this.faunaRenderer.endFrame();
  }
  contactPatches(point:V3,origin:V3):ContactPatch[]|null {
    // Close-range/contact-precision terrain must never be sampled before this
    // body's canonical hydrology set is known — the same "waiting" gate
    // landing and physics already use for unloaded tiles (below) now also
    // covers an unbuilt canonical river, so a settled capsule can never rest
    // on terrain that is about to change shape once the registry resolves.
    // hydrologyReady is unconditionally true while inland rivers are withdrawn.
    if(!hydrologyReady(this.body)){
      this.lastContactReadiness={reason:'hydrology-not-ready',requested:0,missingLeaf:0,missingResident:0,unmorphed:0};
      return null;
    }
    const originKey=origin.join(',');if(originKey!==this.contactOrigin){this.contactGeometryCache.clear();this.contactOrigin=originKey;}
    const radial=new THREE.Vector3(...point).normalize(),up=new THREE.Vector3(0,1,0);
    if(Math.abs(radial.dot(up))>.9)up.set(1,0,0);
    const east=new THREE.Vector3().crossVectors(up,radial).normalize(),north=new THREE.Vector3().crossVectors(radial,east).normalize();
    const selected=new Map<string,Patch>(),level=this.needsFineContact?this.fineContactLevel:this.contactLevel;
    const offsets=this.needsFineContact?(()=>{const step=Math.min(.5,(2*this.body.radiusM/2**level)/4),values:number[]=[];for(let value=-1;value<=1+1e-9;value+=step)values.push(Math.min(1,value));return [...new Set(values.map(value=>Number(value.toFixed(9))))];})():[-12,0,12];
    let missingLeaf=0,missingResident=0,unmorphed=0,sampleKey:string|undefined;
    for(const x of offsets)for(const y of offsets){
      const d=new THREE.Vector3(...point).addScaledVector(east,x).addScaledVector(north,y).toArray() as V3;
      const key=tileKey(directionTile(d,level)),p=this.patches.get(key);
      if(!this.leafIndex.has(key)){sampleKey??=key;missingLeaf++;continue;}
      if(!p){sampleKey??=key;missingResident++;continue;}
      if(p.morph.value<1){sampleKey??=key;unmorphed++;continue;}
      selected.set(key,p);
    }
    const requested=offsets.length*offsets.length;
    const reason=missingLeaf?'missing-leaf':missingResident?'missing-resident':unmorphed?'morph-incomplete':'ready';
    this.lastContactReadiness={reason,requested,missingLeaf,missingResident,unmorphed,sampleKey};
    if(reason!=='ready')return null;
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
    const localAerial={meshes:0,attached:0,failures:[] as string[]};
    for(const group of [this.forest.group,this.floraGroup,this.faunaRenderer.group,this.rocks.group])group.traverse(object=>{
      if(!(object instanceof THREE.Mesh))return;
      localAerial.meshes++;
      const state=Array.isArray(object.material)?'material-array':object.material.userData.localAerialVersion;
      if(state===LOCAL_AERIAL_VERSION)localAerial.attached++;else localAerial.failures.push(`${object.name||object.type}:${state??'missing'}`);
    });
    // The shared texture belongs to the existing water reservation. Inland
    // diagnostics count it when present; ocean-only worlds count it here.
    const oceanNormalBytes=this.river?.diagnostics().resident?0:[...this.patches.values()].some(p=>p.ocean)?SHARED_WATER_NORMAL_ATLAS_BYTES:0;
    const rocks=this.rocks.diagnostics();
    const memory=rendererMemoryAccounting({residentBytes:this.residentBytes,oceanNormalBytes,rockOwnedBytes:rocks.bytes.total,cloudAllocatedBytes:this.clouds?.allocatedBytes??0,pendingTiles:this.pending.size});
    return {projection: 'cube-sphere',localAerial,rocks,lifePackBuilds:this.lifePackBuilds, floraRecipeBuilds:this.floraRecipeBuilds, clouds:this.clouds?.diagnostics()||null, forest:this.forest.diagnostics(), lowFlightDetail:this.lowFlightDetail, surfaceReady:this.surfaceReady, river:this.river?.diagnostics()||null, reflection:this.lakeReflection?.diagnostics()||null, environment:this.environment?.diagnostics()||null, ready: this.rootsReady, resident: this.patches.size, pending: this.pending.size, visible: this.active.size,frontierMaxLevel:Math.max(0,...[...this.leafIndex.values()].map(t=>t.level)),contactReadiness:this.lastContactReadiness,
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
      contactLevel:this.contactFocus?(this.needsFineContact?this.fineContactLevel:this.contactLevel):null,baseContactLevel:this.contactFocus?this.contactLevel:null,minimumWaterLevel:this.minimumWaterLevel,underresolvedWaterTiles:this.underresolvedWaterTiles,waterRegionActive:this.waterRegionActive,accountedBytes:memory.accountedBytes,lifeReserveBytes:LIFE_RESERVE_BYTES,rockOwnedBytes:rocks.bytes.total,rockPeakBytes:rocks.bytes.peak,rockReserveBytes:ROCK_RESERVE_BYTES,rockAccounting:'rock-owned (textures excluded) in accountedBytes; ROCK_RESERVE_BYTES in reservedCombinedBytes',cloudTargetBudgetBytes:CLOUD_TARGET_BUDGET_BYTES,cloudAllocatedBytes:this.clouds?.allocatedBytes??0,reservedCombinedBytes:memory.reservedCombinedBytes,terrainResidentBytes:this.residentBytes,groundAtlasBytes:GROUND_ATLAS_BYTES,groundPbrTextureBytes:GROUND_PBR_TEXTURE_BYTES,groundPbrAccounting:'conservative per-renderer reserve; shared textures are loaded once',oceanNormalBytes,pendingReserveBytes:this.pending.size*PENDING_TILE_BYTES,materialVersion:MATERIAL_VERSION,surfaceDetail:!!this.groundEnabled.value,budgetBytes:TOTAL_BUDGET_BYTES+(this.immersiveBudget?0:CLOUD_TARGET_BUDGET_BYTES),coreBudgetBytes:TOTAL_BUDGET_BYTES,failuresTotal:this.failuresTotal,updateMs:this.updateMs,lifeMs:this.lifeMs,rescatterMs:this.rescatterMs,drawFloraMs:this.drawFloraMs,drawFaunaMs:this.drawFaunaMs,faunaRigCount:this.faunaNear.diagnostics().active,faunaRepresentation:'individual-instanced-anatomy+near-skinned-body',faunaNear:this.faunaNear.diagnostics(),faunaCulledCount:this.faunaCulledCount,faunaBudgetDrops:this.faunaBudgetDrops,faunaDrawn:this.faunaDrawn,lifePending:this.lifeQueue.length-this.lifeQueueIndex,lifeResidentCells:this.lifeResidents.size,faunaAllocatedBytes:this.faunaRenderer.allocatedBytes+this.faunaNear.allocatedBytes,faunaTerrainPending:this.faunaGroundQueue.length,floraSlotCount:this.floraSlotCount,floraPresentCount:this.floraPresentCount,floraSurvivorCount:this.floraSurvivorCount,floraSubmittedCount:this.floraSubmittedCount,faunaAnchorCount:this.faunaAnchorCount,
      faunaHerdCount:this.faunaHerdCount,faunaVisibleCount:this.faunaVisibleCount,
      failures: this.failures.size, faces: [...new Set([...this.active].map(k => Number(k.split('/')[0])))],
        detailPatches:[...this.active].filter(k=>this.groundEnabled.value&&this.patches.get(k)!.detail.value).length,
        pbrDetailPatches:[...this.active].filter(k=>this.groundEnabled.value&&this.patches.get(k)!.pbrDetail.value).length,
        groundPbrReady:!!this.groundPbrTextures.ready.value,
      oceanDraws:[...this.active].filter(k=>this.patches.get(k)!.ocean?.visible).length,
      maxVisibleSkirtDepthM:Math.max(0,...[...this.active].map(k=>this.patches.get(k)!.data.skirtDepthM)),
      debug:{...this.debug,activeTileIds:[...this.active],pendingTileIds:[...this.pending],eyeHeightM:this.eyeHeightUniform.value},
      skirtPatches:[...this.active].filter(k=>this.patches.get(k)!.mesh.geometry.drawRange.count>PATCH_SEGMENTS*PATCH_SEGMENTS*6).length,
      vertices: [...this.active].reduce((n,k) => n + this.patches.get(k)!.mesh.geometry.attributes.position.count, 0)};
  }
  renderCloudScene(renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.PerspectiveCamera,profile?:RenderProfile){
    return this.clouds?.render(renderer,scene,camera,profile)??false;
  }
  /** Diagnostic experiment for the current body; deliberately not a saved quality setting. */
  setCloudSceneSamples(samples:0|2|4){if(this.clouds)this.clouds.sceneSamples=samples;}
  private release(p: Patch) { this.reflectionRevision++;this.residentBytes=Math.max(0,this.residentBytes-p.bytes);this.group.remove(p.mesh);if(p.ocean){this.group.remove(p.ocean);p.ocean.geometry.dispose();p.ocean.material.dispose();} p.mesh.customDepthMaterial?.dispose();p.mesh.geometry.dispose(); p.map.dispose(); p.material.dispose(); }
  dispose() {
    this.disposed = true;
    for(const slot of this.workers)slot.worker.terminate();
      this.groundAtlas.dispose();this.groundPbrTextures.release();
    this.atmosphere?.dispose();
    this.clouds?.dispose();this.clouds=null;
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
    this.rocks.dispose();
    this.forest.dispose();
    for (const mesh of this.floraRenderer.meshes) { this.group.remove(mesh); mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); }
    this.faunaNear.dispose();this.faunaRenderer.dispose();this.lifeResidents.clear();this.faunaGenomes.clear();
    this.materialVisible(true);
    for (const p of this.patches.values()) this.release(p);
    this.patches.clear(); this.pending.clear(); this.inbox = [];
    this.host.remove(this.group);
  }
}
