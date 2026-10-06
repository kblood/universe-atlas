import {
  hash64,
  macroHeightCode,
  noise,
  type Body,
  type V3,
} from "./catalog.ts";
import { sampleRiverRegion } from './river-sample.ts';
import {regionalLandformHeight,REGIONAL_LANDFORM_VERSION} from './regional-landform.ts';
import type {RiverRegion} from './river-types.ts';
import {activeRiverRegions} from './inland-rivers.ts';
import {craterField, craterAgeGate, craterHeightDeltaAt, type CraterField, type CraterParams} from './planet-craters.ts';
import {planetLandforms,LANDFORM_SHAPE_VERSION} from './planet-landforms.ts';
import {planetGeophysics} from './planet-geophysics.ts';
import {climateDatumM} from './surface-biomes.ts';
import {DRY_SURFACE_ROUGHNESS,WET_SURFACE_ROUGHNESS} from './surface-roughness.ts';
import {climateForcingFor,createClimateSample,surfaceClimate,CLIMATE_CALIBRATION,CLIMATE_VERSION,type ClimateSample} from './surface-climate.ts';
import {orogenLayout,type OrogenSample} from './mountain-layout.ts';
import {mountainRidgeTermM,massifBeltSample} from './mountain-assembly.ts';
import {carvingAtLevel} from './lod-ladder.ts';

// Bumped from terrain-1.3.0: `terrainSampler` gained the ABILITY to sum
// procedural impact craters (planet-craters.ts) into `elevationM` for any
// non-star, non-gas-giant body, gated by a caller-supplied `surfaceAgeMyr`
// (see `terrainSampler`'s own doc comment and the PROVENANCE RULE below)
// instead of a hardcoded age.
//
// Bumped again, terrain-1.4.0 -> terrain-1.4.1: `terrainSampler`'s own
// `includeCraters` parameter DEFAULTS TO FALSE, not true. This was flipped
// after terrain-1.4.0 first shipped with the default on, once two real,
// independently-measured problems surfaced from every caller in this
// codebase that samples `terrainSampler(body)` with no explicit override:
//  1. PERFORMANCE (measured): `planet-craters.ts`'s `craterHeightDeltaAt`
//     costs ~500-800us/query (dominated by `catalog.ts`'s BigInt-based
//     `hash64`, out of this file's ownership to fix at the source).
//     `planet-renderer.ts`'s own real-time walking/contact tile-selection
//     quadtree (`this.sample(...)` inside its `projected` closure, run over
//     every LOD candidate tile on camera/pose changes) and
//     `planet-tiles.ts`'s `buildTile` (measured ~180-235ms/tile at the fine
//     LOD levels (around level 22) walking's own contact system requests)
//     both call `terrainSampler(body)` with no override, so both inherited
//     the full per-query crater cost with craters on by default - confirmed
//     directly responsible for `ATLAS_URL=... npm run test:walking` never
//     reaching a grounded state within its 240s budget (the walker's own
//     contact tiles never finished building fast enough), a genuinely
//     broken interactive feature, not merely a slow one.
//  2. CORRECTNESS (measured): `drainage.ts` (DO-NOT-TOUCH for this task)
//     calls `terrainSampler({...body,hydrology:undefined})` at line ~106
//     with no `surfaceAgeMyr`/`includeCraters` override either - meaning
//     with craters on by default, procedural craters WERE silently
//     perturbing `buildDrainage`'s steepest-descent catchment-ranking flood
//     fill (the exact "must not destabilize this DO-NOT-TOUCH package"
//     hazard this task was told to avoid from the start), contradicting an
//     earlier, now-corrected version of this file's own doc comments, which
//     incorrectly claimed drainage.ts only ever used the crater-free
//     `baseTerrainSampler`.
// Both are fixed by the same change: flipping this default to `false`
// restores every one of these existing, unmodified call sites (this task
// edited none of them) to the pre-crater-wiring baseline they were built
// and tested against, with zero code changes required in planet-renderer.ts's
// hot path, planet-tiles.ts, or drainage.ts. Craters remain fully wired,
// pure, deterministic and exercised by this package's own tests and
// `planetSurface`'s explicit `applyCraters` opt-in - they are simply OFF
// BY DEFAULT everywhere, pending a real fix to planet-craters.ts/
// catalog.ts's per-query cost (out of this file's ownership; see this
// task's report for the exact measurements and a recommended acceleration
// structure). This is a genuine output change for every existing default
// caller (a cratered body's terrain digest moves back toward its pre-
// crater value), so the four-engine golden gate is the thing that must
// certify agreement, not this version string alone
// (docs/time-and-coordinates-contract.md §6.2 rule 4). `baseTerrainSampler`
// itself remains UNCHANGED and never gains a crater contribution regardless
// of this default - see its own doc comment for why.
// Bumped 1.4.1 -> 1.4.2: `baseTerrainSampler`/`terrainSampler` gained an
// additive `waterLevelM: number = 0` parameter (contract §2.5/§2.6) so the
// ocean/land boundary can be driven by a caller's resolved, time-varying sea
// level instead of the hardcoded `0` literal every caller depended on
// before. Every existing call site omits the new argument and keeps
// receiving that exact `0` default, so this is a statement of algorithm
// intent per §6.2's rule, not a claim the golden digest moved - the
// four-engine gate is what certifies that (see this task's report).
// 1.5.0 adds physical regional ridges in every surface consumer. Canonical
// drainage remains on the unchanged continental baseline; terrain golden
// samples deliberately change and are checked across all four JS engines.
// 1.6.0 withdraws inland rivers and their regional lakes (inland-rivers.ts):
// the default region set is empty, so no channel, lake bowl, wet bed or bank
// tint is applied even when a Body still carries hydrology. Baseline rock,
// landforms, craters and the dated ocean threshold are unchanged.
// 1.7.0-climate-colour (docs/biome-climate-increment-1-plan-2026-10-02.json,
// W1-B): water-world LAND colour in `terrainSampler` (orbit texture and tile
// colour maps) now comes from the shared annual climate (surface-climate.ts,
// per-planet gravity lapse rate) at the post-landform, pre-crater height:
// `waterWorldLandColour`. It replaces the additive latitude snow rule, the fixed
// (elev-1500)/4300 grey and the 0.18-0.52 arid push, and lets forest
// suitability green the forested belts. Elevation, groundHeight and ocean are
// bit-identical (tests/terrain-elevation-identity.test.mjs), and
// `baseTerrainSampler` (drainage/river inputs) keeps its legacy output exactly.
// Ocean, sea-ice, Ice-world, Volcanic, barren and gas-giant colours are
// unchanged. Only the terrain and combined golden digests move.
// 1.8.0-relief (relief round 2026-10-03, package P4-RELIEF, docs/terrain-relief-v1.md):
// `terrainSampler` (orbit texture, tiles, collision, classifier inputs) runs
// the R-CAL-1 relief mode of the core: the continental coordinate is reshaped
// (land floor, seabed with detail at every depth, dry-world scaling) with the
// per-planet tectonicRelief (planet-geophysics-1), the local window keeps its
// geography and scales with an upland factor of the new floor, and colour/
// coast gates are measured from the CURRENT sea level. The sea-level-0
// coastline is exactly invariant. `baseTerrainSampler` stays bit-identical
// (BASE_ELEVATION_SHA256, the archived drainage/river field); a future river
// revival must rebuild drainage on the relief field with a DRAINAGE_VERSION
// bump. The orbit relief texture is encoded over reliefTextureRange(body).
// 1.8.1-grain (mountains step G, 2026-10-05, owner decision (b);
// docs/mountains-grain-step-g-2026-10-05.md): the 800 m local colour grain of
// the water-world LAND (climate) colour is reduced from +-12% to +-4.8%
// (TERRAIN_LOCAL_GRAIN) so it no longer dominates the coarse LOD colour error.
// Heights, the ocean flag, classes, dry worlds, ocean colours,
// baseTerrainSampler and the legacy grain are unchanged; no mountain belt is
// wired (that is the later terrain-1.9.0 assembly).
export const TERRAIN_VERSION = "terrain-1.8.1-grain";
/**
 * terrain-1.8.1: the 800 m local colour grain of water-world LAND colour (the
 * climate colour path of terrainSampler): localGrain = BASE + n(d, R/CELL_M, 74) x
 * AMPLITUDE, mean 1 (n has mean .5). terrain-1.8.0 used .88 + n x .24 (+-12%);
 * that grain sits at the colour Nyquist of the coarse levels and was about half
 * of the L6/L8 cross-level RGB p99 (lod-consistency gate: Maithea L6 26.26 ->
 * 13.22 with no grain). AMPLITUDE = k x .24 with k = .4, the largest of the
 * measured sweep (k = 0, .25, .4, .5, .75, 1) at which the grain's quadrature
 * share stays at or below the grain-free error on every pinned RGB row (Maithea
 * L6, Lethuris L6 and L8); BASE = 1 - AMPLITUDE/2. The cell size is unchanged,
 * so the fine-level pattern keeps its scale. Every other palette keeps the
 * legacy .88/.24 grain.
 */
export const TERRAIN_LOCAL_GRAIN = Object.freeze({CELL_M: 800, BASE: .952, AMPLITUDE: .096});
export {LANDFORM_SHAPE_VERSION};
/** The climate model whose fields the water-world land colour reads. */
export const TERRAIN_CLIMATE_VERSION = CLIMATE_VERSION;
export {REGIONAL_LANDFORM_VERSION};
/** @deprecated terrain-1.8.0: the orbit relief texture is encoded over the
 * per-body `reliefTextureRange(body)` (returned by planetSurface as
 * reliefMinM/reliefMaxM). Kept only until the renderer decode (main.ts, P5)
 * reads the per-body range. */
export const ELEVATION_RANGE_M = 60000;
/**
 * Fallback surface age (Myr) for a `terrainSampler` caller that has not yet
 * been wired to the real, time-varying age. This is the *only* place in this
 * module a numeric age is invented; every call site this package owns
 * documents why it still needs this fallback (see `terrainSampler`'s own
 * comment) rather than the real value.
 *
 * ⚠ PROVENANCE RULE (mirrors flora-field.ts's identical `toMyr` rule for the
 * exact same underlying hazard): a REAL caller must never invent this number.
 * It must come from `world-surface.ts`'s `planetAgeMyr(planet, t)` - the
 * planet's actual age since `PlanetLifecycle.formationNs`, clamped into
 * biosphere-model.ts's `[MIN_DATE_MYR, MAX_DATE_MYR]` range for the same
 * "a legal far-future seek must not throw or silently misbehave" reason
 * `planetAgeMyr`'s own comment gives. `planetAgeMyr` needs a resolved
 * `PlanetLifecycle`, which needs the body's host `StarLifecycle` - neither is
 * reachable from `Body` alone, so no file this package owns (terrain.ts,
 * planet-renderer.ts) can compute a real value today; every call site above
 * this fallback still needs that plumbing threaded down from where the host
 * star is actually resolved (main.ts / hydrology-registry.ts / a future
 * planet-tiles.ts change - see this task's report for the exact call sites).
 * Picked as a plausible "typical mid-life rocky crust" age (in the same
 * register as the SIZE_BANDS calibration comment in planet-craters.ts) so an
 * unwired caller still renders a plausible cratered surface instead of either
 * zero craters (silently hiding the feature) or an implausible one - it is
 * NOT derived from any body's real lifecycle and must never be read as such.
 */
export const DEFAULT_SURFACE_AGE_MYR = 3500;
/** Physical ground and a separately-owned water surface. `visibleHeightM` is
 * retained solely as the legacy presentation/navigation compatibility value. */
export type SurfaceSample = {
  elevationM:number; ocean:boolean; color:number[]; roughness:number;
  groundHeightM:number; waterHeightM:number|null; waterDepthM:number;
  /** @deprecated Compatibility aliases for pre-shore callers. */
  rockHeightM:number; waterLevelM:number|null; visibleHeightM:number;
  wet:boolean; waterKind:'river'|'lake'|null; bank:number; channelId:string|null;
  flow:[number,number]; influence:number;
  /** R0 (relief round, additive; set only by terrainFloorSampler, never by
   * the plain terrainSampler): the smooth regional FLOOR, i.e. the base
   * field after the [-16,18] km clamp and radius scale, before the metre-based
   * hills/gullies/rocks and landforms. */
  floorM?:number;
  /** R0: the bounded local WINDOW above the floor, uncrateredHeight - floorM
   * (hills/gullies/rocks + landforms; pre-crater, pre-river), always within
   * [0, terrainWindowMaxM(body)]. */
  windowM?:number;
  /** R0: the continental coordinate A*scale before the clamp (water worlds:
   * (coast-sea)*47000*scale, whose sign is the sea-level-0 coastline). */
  continentalM?:number;
};
/** Max of hills*620 + gullies*130 + rocks*22 (baseTerrainCore; metre-based). */
export const TERRAIN_DETAIL_WINDOW_M = 620 + 130 + 22;
/** Max of the planetLandforms unit sum 1650 + 230 + 28 before the radius scale. */
export const TERRAIN_LANDFORM_WINDOW_M = 1650 + 230 + 28;
/** R0: largest possible WINDOW (m) above the floor for this body, by
 * construction: hills/gullies/rocks 772 m (metre-based, NOT radius-scaled)
 * plus landforms 1908 m x min(1, R/2e6). For R >= 2e6 m this is the audit's
 * 2680 m. 0 for stars and gas giants (flat field). */
export function terrainUnitWindowMaxM(body: Pick<Body,'kind'|'type'|'radiusM'>): number {
  if (body.kind === 'star' || body.type === 'Gas giant') return 0;
  return TERRAIN_DETAIL_WINDOW_M + TERRAIN_LANDFORM_WINDOW_M * Math.min(1, body.radiusM / 2e6);
}
/**
 * terrain-1.8.0-relief: largest possible WINDOW (m) above `floorM`. The relief
 * window is tectonicRelief x (D x upland + L x upland) <= tau x the unit window
 * (772 + 1908 x min(1, R/2e6)), so this is `tau * terrainUnitWindowMaxM(body)`.
 * tau comes from planetGeophysics(body) when the body carries its seed; a
 * shape-only object (no seed) gets relief scale 1, i.e. the unit window (the
 * R0 value). Stars keep the legacy (unit) window; gas giants 0.
 */
export function terrainWindowMaxM(body: Pick<Body,'kind'|'type'|'radiusM'> & Partial<Pick<Body,'seed'|'temperatureK'|'water'>>): number {
  const unit = terrainUnitWindowMaxM(body);
  if (unit === 0 || body.kind === 'star' || typeof body.seed !== 'string') return unit;
  return tectonicReliefOf(body as Body) * unit;
}

/**
 * R-CAL-1 (relief round 2026-10-03, plan floorShapingSpec). Every value feeds a
 * height, so tests/terrain-relief-hypsometry.test.mjs pins
 * sha256(JSON.stringify(RELIEF_CALIBRATION)); changing one is a TERRAIN_VERSION
 * bump. Names follow the plan: HC land compression, HUP/HHI upland and high
 * plateau steps over B1..B2 / B3..B4 of the raw continental metres, KB the
 * ridge-belt gain (belt mask BT0..BT1 on ridges^5), HM0..HM1 the upland factor
 * of the new floor and WLOW the plains share of the detail window; HS shelf
 * compression, HAB abyssal step (A1..A2), HTR trench step (A3..A4); SEABED_*
 * the seabed detail (amplitude SHELF on the shelf rising to DEEP over RAMP of
 * depth, wavelengths in metres); KD_* the dry-world floor scale clamp(KD_PER_TAU
 * x tau, KD_MIN, KD_MAX).
 */
export const RELIEF_CALIBRATION = Object.freeze({
  name: 'R-CAL-1',
  HC: 220, HUP: 500, B1: 4000, B2: 11000, HHI: 1000, B3: 10000, B4: 16000,
  KB: 1.3, BT0: 0.35, BT1: 0.8,
  HM0: 250, HM1: 2500, WLOW: 0.25,
  HS: 180, HAB: 3900, A1: 500, A2: 3200, HTR: 7000, A3: 8500, A4: 15000,
  SEABED_DETAIL_SHELF_M: 40, SEABED_DETAIL_DEEP_M: 250, SEABED_DETAIL_RAMP_M: 1500,
  SEABED_HILL_WAVELENGTH_M: 4000, SEABED_GULLY_WAVELENGTH_M: 900,
  KD_PER_TAU: 0.3, KD_MIN: 0.2, KD_MAX: 0.8,
});
const RC = RELIEF_CALIBRATION;
/** Largest |fine| term of the core ((n-0.5)*380 + (n-0.5)*95 with n in [0,1]). */
const FINE_MAX_M = 0.5 * 380 + 0.5 * 95;
/** The seabed detail shape (see seabedDetail) lies in [SEABED_SHAPE_MIN, SEABED_SHAPE_MAX]. */
const SEABED_SHAPE_MIN = -0.35 * 2.0 - 0.5 * 1.4;
const SEABED_SHAPE_MAX = 0.65 * 2.0 + 0.5 * 1.4;
/** Arithmetic smoothstep (no platform transcendental). */
const ss = (lo: number, hi: number, v: number) => {
  const t = (v - lo) / (hi - lo);
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
};

/** The relief scale tau of a body (planet-geophysics-1 tectonicRelief). */
export function tectonicReliefOf(body: Body): number {
  return planetGeophysics(body).tectonicRelief;
}
/** Whether terrainSampler runs this body in relief mode (every non-star; gas giants stay flat). */
function reliefModeFor(body: Pick<Body,'kind'|'type'>): boolean {
  return body.kind !== 'star' && body.type !== 'Gas giant';
}
/** Dry-world floor scale KD = clamp(0.3 tau, 0.2, 0.8). */
function dryFloorScale(tau: number): number {
  const k = RC.KD_PER_TAU * tau;
  return k < RC.KD_MIN ? RC.KD_MIN : k > RC.KD_MAX ? RC.KD_MAX : k;
}

/**
 * Analytic bounds (m) of every height `terrainSampler(body)` can return
 * (crater-free, no river regions): `minM <= groundHeightM <= maxM` for every
 * direction and every sea level. Built from the R-CAL-1 constants only:
 * water worlds max = (HC + tau (HUP + HHI + KB 2800) + fine max) x sc + window,
 * min = -(HS + HAB + HTR) x sc - the largest seabed detail; dry worlds use the
 * clamp(-16000, 18000) x sc x KD floor + window. Stars use the legacy field.
 *
 * CRATER-FREE: impact craters (`terrainSampler(..., includeCraters=true)`,
 * `planetSurface(..., applyCraters=true)`) add a bowl of up to `depthM` below
 * and a rim of 0.18 x depthM above the local ground on dry/airless land, and
 * are NOT in this bound. No runtime path enables craters today (tiles, the
 * renderer, the orbit worker and the contact/walk queries all use the default
 * false); a caller that enables them must widen `minM`/`maxM` by the crater
 * field's depth and rim, e.g. for render bounds or culling (P5).
 */
export function bodyHeightBoundM(body: Body): {minM: number; maxM: number} {
  if (body.type === 'Gas giant') return {minM: 0, maxM: 0};
  const sc = Math.min(1, body.radiusM / 2e6);
  // Stars keep the legacy field: clamped floor plus the 772 m detail layer (no landforms).
  if (!reliefModeFor(body)) return {minM: -16000 * sc, maxM: 18000 * sc + TERRAIN_DETAIL_WINDOW_M};
  const tau = tectonicReliefOf(body);
  const window = tau * terrainUnitWindowMaxM(body);
  if (body.water) {
    const landMax = Math.min(18000, RC.HC + tau * (RC.HUP + RC.HHI + RC.KB * 2800) + FINE_MAX_M) * sc;
    const seabedMin = -Math.min(16000, RC.HS + RC.HAB + RC.HTR) * sc - RC.SEABED_DETAIL_DEEP_M * Math.max(-SEABED_SHAPE_MIN, SEABED_SHAPE_MAX);
    return {minM: seabedMin, maxM: landMax + window};
  }
  const kd = dryFloorScale(tau);
  return {minM: -16000 * sc * kd, maxM: 18000 * sc * kd + window};
}
/** The range the orbit relief texture (planetSurface().relief) is encoded over:
 * byte = clamp((visibleHeightM - minM) / (maxM - minM)) * 255. */
export function reliefTextureRange(body: Body): {minM: number; maxM: number} {
  const b = bodyHeightBoundM(body);
  return b.maxM > b.minM ? b : {minM: -1, maxM: 1};
}
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
/** RGB lerp: per channel v + (b - v) * clamp(t), the same expression (and so
 * the same bits) as the former a.map form, without the closure (terrain-1.8.0
 * perf: the relief seabed detail's cost is paid back here and in the bake). */
const mix = (a: number[], b: number[], t: number) => {
  const c = clamp(t);
  return [a[0] + (b[0] - a[0]) * c, a[1] + (b[1] - a[1]) * c, a[2] + (b[2] - a[2]) * c];
};

/** The macro-continent seed and its seeded direction-noise helper. One
 * definition shared by `baseTerrainSampler` and `terrainSampler`'s climate
 * colour path, so the grain noises n(d,115,35) and n(d,R/800,74) can never
 * drift to a different seed derivation in one of them. */
function macroNoise(body: Body) {
  const code = Number(hash64(body.seed + "/macro-v1") & 0xffffffffn);
  const n = (d: V3, f: number, seed: number) =>
    noise(d[0] * f + 13, d[1] * f + 37, d[2] * f + 19, code + seed);
  return { code, n };
}

/**
 * Water-world land colour v2 (terrain-1.7.0-climate-colour), 0..255 per channel
 * BEFORE the grain factor. Pure function of one annual `ClimateSample`
 * (surface-climate.ts, sampled at the same post-landform height) and that
 * height. Zones, low to high (or warm to cold):
 *  - aridity: humid green to dry tan (legacy endpoints);
 *  - forest suitability: darker green, so forested belts read green from orbit;
 *  - above the climatic treeline (treeline01 -> 0, warmest month below
 *    T_TREE_WARMEST_K): ALPINE MEADOW / TUNDRA, olive when humid and grey-tan
 *    steppe when dry. This is the zone the classifier names 'Mountain meadow'
 *    (treeline01 < .5), so the macro colour stays herbaceous there instead of
 *    reading as bare rock;
 *  - a further TREE_RAMP_K colder (warmest month T_TREE-2*ramp .. T_TREE-ramp,
 *    the fell-field just below the snowline): bare rock/scree grey, ramped in
 *    over 160-760 m so cold polar lowland stays tundra rather than rock. This
 *    replaces the fixed (elev-1500)/4300 grey;
 *  - below 120 m: the legacy coastal sand strip;
 *  - snow: `climate.snowFraction` exactly, the same value the classifier reads,
 *    so the orbit/tile colour and the ground classification agree by
 *    construction.
 * Deviation from the plan's single grey term, which painted every treeless
 * zone (meadow included) bare-rock grey: see this package's report.
 */
export function waterWorldLandColour(climate: ClimateSample, heightM: number, out: number[] = [0, 0, 0]): number[] {
  // Scalar form of the mix() chain (v + (b - v) * clamp(t) per channel): the
  // per-land-sample budget (+0.2 us) does not allow eight array allocations.
  const arid = clamp(climate.aridity01);
  const forest = clamp(0.35 * climate.forestSuitability01);
  const treeless = clamp(1 - climate.treeline01);
  const fell = clamp((ALPINE_ROCK_WARMEST_K - climate.warmestMonthK) / TREE_RAMP_K) * clamp((heightM - 160) / 600);
  const coast = heightM < 120 ? clamp(heightM / 120) : -1;
  const snow = clamp(climate.snowFraction);
  for (let i = 0; i < 3; i++) {
    let v = HUMID[i] + (ARID[i] - HUMID[i]) * arid;
    v += (FOREST[i] - v) * forest;
    const meadow = MEADOW_HUMID[i] + (MEADOW_DRY[i] - MEADOW_HUMID[i]) * arid;
    v += (meadow - v) * treeless;
    v += (ROCK[i] - v) * fell;
    if (coast >= 0) v = SAND[i] + (v - SAND[i]) * coast;
    out[i] = v + (SNOW[i] - v) * snow;
  }
  return out;
}
const HUMID = [40, 89, 48], ARID = [173, 145, 89], FOREST = [34, 70, 38];
const MEADOW_HUMID = [92, 106, 66], MEADOW_DRY = [146, 136, 104];
const ROCK = [134, 124, 107], SAND = [185, 175, 128], SNOW = [216, 228, 226];
const TREE_RAMP_K = CLIMATE_CALIBRATION.TREE_RAMP_K;
/** Warmest-month temperature below which the alpine meadow gives way to rock. */
const ALPINE_ROCK_WARMEST_K = CLIMATE_CALIBRATION.T_TREE_WARMEST_K - TREE_RAMP_K;

/** Shared dry-bank tint for orbit pixels and terrain-tile colour maps. The
 * sampler's normalized bank/influence field owns both the shoreline falloff
 * and its regional extent; no renderer-local shoreline is invented here. */
function regionalBankColor(body:Body,d:V3,elevationM:number,color:number[],river:{wet:boolean;bank:number;influence:number}){
  const temperate=body.water>0&&body.temperatureK>=250&&body.temperatureK<=325&&body.type!=='Ice world'&&body.type!=='Volcanic world';
  const snow=clamp((Math.abs(d[1])-.79)*7+Math.max(0,elevationM-2600)/3300);
  // Terrain samples have no normal here; retain elevated mountain colouring
  // rather than replacing it with a river-bank biome.
  if(!temperate||river.wet||river.influence<=0||snow>.2||elevationM>1800)return color;
  const shore=clamp(river.bank)**4;
  const regional=mix([65,86,44],[115,111,85],shore);
  return mix(color,regional,river.influence);
}

/** One continuous direction-space field for orbital geometry, colour and detail.
 * Keeps the catalogue's macro-continent seed; no longitude or LOD-dependent noise. */
/** The unmodified terrain-1.1.0 field. Keep this separate from physical
 * hydrology: drainage analysis and old addresses must retain this exact field.
 *
 * Deliberately does NOT gain a crater contribution (unlike `terrainSampler`
 * below, which adds `craterHeightDeltaAt` to its own returned `elevationM`):
 * two DO-NOT-TOUCH-for-this-task callers depend on this function's exact
 * pre-crater numeric output for a discrete, branch-affecting decision -
 * `river-generation.ts`'s `carveRiver`-style code calls
 * `baseTerrainSampler(body)` directly as the elevation baseline it carves
 * channels into, and `drainage.ts`'s `buildDrainage` feeds this function's
 * `elevationM` straight into `routeDrainage`'s steepest-descent/catchment-
 * ranking flood fill. Adding crater bumps here would silently perturb which
 * catchments rank in the canonical top-12 (drainage.ts's `RIVER_CANDIDATE_COUNT`
 * selection) and where `river-generation.ts` carves banks - a determinism
 * change in a package this task must not touch or destabilize. Craters are
 * therefore summed one layer up, in `terrainSampler`, and only for the
 * dry/non-region path (see its own comment) - never inside this function.
 *
 * `waterLevelM` (new, additive, default `0` - the literal this file already
 * hardcoded everywhere before this change): docs/time-and-coordinates-
 * contract.md §2.5/§2.6 - the sea level that decides `ocean` below MUST be a
 * function of simulated `t` (via `world-surface.ts`'s `waterLevelAt`/
 * `waterKeysFor`), not a hardcoded `0`, or the shoreline never visibly moves
 * even though the data layer already models the ocean condensing/boiling
 * away. This is a narrow, deliberate exception to this function's own
 * DO-NOT-TOUCH header above: it is safe BY CODE ORDER, not by rewriting the
 * rule - `elevationM` (the value `river-generation.ts`/`drainage.ts` depend
 * on bit-for-bit) is fully computed, unmodified, several lines above; this
 * parameter is read strictly AFTER that point, only to decide the boolean
 * `ocean` flag returned alongside it, and every existing call site
 * (`river-generation.ts`'s `baseTerrainSampler(body)`, `drainage.ts`'s
 * `terrainSampler({...body,hydrology:undefined})`) passes no override, so it
 * defaults to the exact `0` literal both already depend on - byte-identical
 * output, nothing upstream of `elevationM` touched. */
export function baseTerrainSampler(body: Body, waterLevelM: number = 0) {
  const core = baseTerrainCore(body, waterLevelM);
  // Public shape is the historical four fields; the core's extra grain fields
  // and its deferred water-land colour are internal to terrainSampler.
  return (d: V3) => {
    const s = core.sample(d, false);
    return { elevationM: s.elevationM, ocean: s.ocean, color: s.color!, roughness: s.roughness };
  };
}

/** Internal: the terrain-1.1.0 field shared by `baseTerrainSampler` and
 * `terrainSampler`. `deferWaterLand` (terrainSampler's climate path only)
 * skips the legacy water-world land colour, which that path replaces, and
 * returns `color: null` there; `legacyWaterLandColour` recomputes it exactly
 * for the rare direction the base calls land but the post-landform surface
 * calls ocean (which keeps the base colour). With `deferWaterLand=false` every
 * returned value is computed by the same expressions, in the same order, as
 * terrain-1.6.0's baseTerrainSampler (pinned by
 * tests/terrain-elevation-identity.test.mjs). */
type CoreSample = {
  elevationM: number; ocean: boolean; color: number[] | null; roughness: number;
  grain: number; localGrain: number;
  /** The raw 800 m grain noise n(d, R/800, 74) behind `localGrain` (0 where the
   * core saw ocean, which has no local grain); terrain-1.8.1's climate colour
   * reapplies it with TERRAIN_LOCAL_GRAIN without a second noise call. */
  localGrainNoise: number;
  /** R0, only when the core is built with exposeFloor. */
  floorM?: number; continentalM?: number;
  /** Relief diagnostics (exposeFloor only): the floor WITHOUT the seabed detail
   * (equal to floorM on land and on dry worlds). */
  smoothFloorM?: number;
  /** Relief mode: the factor terrainSampler applies to planetLandforms (tau x
   * upland on water worlds, tau on dry worlds, 0 on the seabed; 1 legacy). */
  landformScale: number;
  /** The height planetLandforms' water-world land gate reads: the RAW
   * (terrain-1.7 base) height, so the landform geography is unchanged. */
  landformGateM: number;
};
// The memoised layout identity includes the body seed and geography. Hash strip-0 seeds once per
// layout rather than once per tile sampler; weak keys do not extend a layout's lifetime.
const mountainSeedMemo = new WeakMap<ReturnType<typeof orogenLayout>, Uint32Array>();
function mountainSeeds(body: Body, layout: ReturnType<typeof orogenLayout>): Uint32Array {
  let seeds = mountainSeedMemo.get(layout);
  if (!seeds) {
    seeds = Uint32Array.from(layout.belts, (_b, i) => Number(hash64(`${body.seed}/mountain-carving/${i}`) & 0xffffffffn));
    mountainSeedMemo.set(layout, seeds);
  }
  return seeds;
}
function baseTerrainCore(body: Body, waterLevelM: number, exposeFloor: boolean = false, relief: boolean = false,
  mountains: {carve: boolean} | null = null) {
  const { code, n } = macroNoise(body);
  const sea = 0.37 + body.water * 0.22;
  // terrain-1.8.0 relief mode (terrainSampler only; baseTerrainSampler never).
  const reliefOn = relief && reliefModeFor(body);
  const tau = reliefOn ? tectonicReliefOf(body) : 1;
  // Mountains assembly (STAGED, off unless the sampler opts in; see TERRAIN_MOUNTAINS_WIRED): the M1 orogen
  // layout of a relief water world (memoised by mountain-layout.ts), one scratch sample per core, one 32-bit
  // M3 carving seed per belt (strip 0; mountain-assembly.ts derives the other strips), and whether this
  // sampler's level evaluates the M3 carving (lod-ladder-2 carvingFromLevel; the truth always does).
  const orogen = mountains && reliefOn && body.water ? orogenLayout(body) : null;
  const orogenScratch: OrogenSample = {belt: 0, axis: [0, 0, 0], axisDistanceM: 0, halfWidthM: 0, beltIndex: -1, alongM: 0};
  const beltCarvingSeeds = orogen
    ? mountainSeeds(body, orogen)
    : new Uint32Array(0);
  const carve = mountains ? mountains.carve : true;
  const kd = dryFloorScale(tau);
  const seabedHillF = body.radiusM / RC.SEABED_HILL_WAVELENGTH_M;
  const seabedGullyF = body.radiusM / RC.SEABED_GULLY_WAVELENGTH_M;
  /** Seabed detail (abyssal hills, gullies, fine) at every depth, metres,
   * bounded to |S| <= depth/2 so the seabed never reaches sea level 0. Part of
   * the same deterministic field at every depth; there is no depth cut-off.
   * Two octaves (4 km ridged hills, 900 m gullies): a third 200 m octave cost
   * +9-14% per terrainSampler sample against the plan's +8% budget while adding
   * ~1% of the detail variance, so it was dropped (docs/terrain-relief-v1.md). */
  const seabedDetail = (d: V3, floorM: number): number => {
    const depth = -floorM;
    const amp = RC.SEABED_DETAIL_SHELF_M + (RC.SEABED_DETAIL_DEEP_M - RC.SEABED_DETAIL_SHELF_M) * ss(0, RC.SEABED_DETAIL_RAMP_M, depth);
    const hb = 1 - Math.abs(n(d, seabedHillF, 75) * 2 - 1);
    const shape = (hb * hb - 0.35) * 2.0 + (n(d, seabedGullyF, 76) - 0.5) * 1.4;
    const S = amp * shape, half = depth * 0.5;
    return S > half ? half : S < -half ? -half : S;
  };
  // R0: the radius scale of the continental coordinate (same value the
  // elevation clamp line multiplies by), hoisted out of the per-sample path.
  const continentalScale = Math.min(1, body.radiusM / 2e6);
  // Legacy water-world land colour (pre-grain), terrain-1.6.0 expressions.
  const legacyWaterLandColour = (d: V3, elevationM: number): number[] => {
    const latitude = Math.abs(d[1]);
    const snow = clamp(
      (latitude - 0.79) * 7 + Math.max(0, elevationM - 2600) / 3300,
    );
    const moisture = n(d, 5, 30);
    const aridity = clamp(
      (0.5 - moisture) * 4 + (latitude > 0.18 && latitude < 0.52 ? 0.17 : 0),
    );
    let color = mix([40, 89, 48], [173, 145, 89], aridity);
    color = mix(color, [134, 124, 107], clamp((elevationM - 1500) / 4300));
    if (elevationM < 120)
      color = mix([185, 175, 128], color, elevationM / 120);
    return mix(color, [216, 228, 226], snow);
  };
  const sample = (d: V3, deferWaterLand: boolean): CoreSample => {
    const macro = macroHeightCode(code, d);
    if (body.type === "Gas giant") {
      const turbulence = n(d, 9, 24),
        bands = 0.5 + 0.5 * Math.sin(d[1] * 75 + turbulence * 8);
      const fine = n(d, 80, 22);
      const gas: CoreSample = {
        elevationM: 0,
        ocean: false,
        color: mix([135, 98, 68], [225, 197, 153], bands * 0.8 + fine * 0.2) as number[] | null,
        roughness: 1,
        grain: 1,
        localGrain: 1,
        localGrainNoise: 0,
        landformScale: 1,
        landformGateM: 0,
      };
      if (exposeFloor) { gas.floorM = 0; gas.continentalM = 0; gas.smoothFloorM = 0; }
      return gas;
    }
    const coast =
      macro + (n(d, 42, 5) - 0.5) * 0.012 + (n(d, 90, 6) - 0.5) * 0.003;
    // Explicit multiplication instead of `**` (Math.pow): elevationM feeds
    // the ocean/land decision below, and `**` is not guaranteed bit-identical
    // across engines (measured ~49.6% of x**5 results differ).
    const ridgesBase = 1 - Math.abs(n(d, 30, 7) * 2 - 1);
    const ridges = ridgesBase * ridgesBase * ridgesBase * ridgesBase * ridgesBase;
    const fine = (n(d, 80, 8) - 0.5) * 380 + (n(d, 155, 9) - 0.5) * 95;
    const landFactor = clamp((coast - sea) * 12);
    const legacyElevationSum = body.water
      ? (coast - sea) * 47000 + ridges * 2800 * landFactor + fine * landFactor
      : (macro - 0.46) * 44000 + ridges * 1800 + fine;
    let elevationM =
      clamp(legacyElevationSum, -16000, 18000) * Math.min(1, body.radiusM / 2e6);
    // R0 (additive): the regional floor is exactly the clamped, scaled value
    // above (the continental coordinate is derived below, opt-in only).
    let floorM = elevationM;
    // Metre-based wavelengths, shared by collision, orbit previews and tiles.
    // Positive land detail fades to zero at sea level, preserving every coast.
    const landDetail = body.water ? clamp(elevationM / 700) : 1;
    if (landDetail > 0) {
      // Explicit multiplication instead of `**` (Math.pow); see the ridges
      // comment above.
      const hillsBase = 1 - Math.abs(n(d, body.radiusM / 6500, 71) * 2 - 1);
      const hills = hillsBase * hillsBase * hillsBase;
      const gullies = n(d, body.radiusM / 1400, 72);
      const rocks = n(d, body.radiusM / 260, 73);
      elevationM += (hills * 620 + gullies * 130 + rocks * 22) * landDetail;
    }
    // The terrain-1.7 base height: the legacy return value, and in relief
    // mode the height the landform land gate reads (geography unchanged).
    const rawBaseM = elevationM;
    let landformScale = 1;
    let smoothFloorOutM = floorM;
    if (reliefOn) {
      // R-CAL-1 (plan floorShapingSpec). Only + - * / and arithmetic
      // smoothstep: every term feeds a height and the ocean flag.
      const detailM = rawBaseM - floorM; // D = (hills/gullies/rocks) x landDetail, >= 0
      if (body.water) {
        const a0 = (coast - sea) * 47000;
        if (a0 >= 0) {
          // Land: every term is >= 0 except the fine term, which is bounded
          // below by half the compressed coordinate, so F >= 0 wherever
          // a0 >= 0: the sea-level-0 coastline is invariant by construction.
          const comp = a0 / (1 + a0 / RC.HC);
          let fineT = fine * landFactor;
          if (fineT < -0.5 * comp) fineT = -0.5 * comp;
          let ridgeTermM = tau * RC.KB * 2800 * ridges * ss(RC.BT0, RC.BT1, ridges) * landFactor;
          if (orogen) {
            const o = massifBeltSample(orogen, d, a0, orogenScratch);
            if (o.belt !== 0)
              ridgeTermM = mountainRidgeTermM(ridgeTermM, o, a0, landFactor, tau, beltCarvingSeeds, carve);
          }
          const F = comp + tau * (RC.HUP * ss(RC.B1, RC.B2, a0) + RC.HHI * ss(RC.B3, RC.B4, a0))
            + ridgeTermM + fineT;
          floorM = clamp(F, -16000, 18000) * Math.min(1, body.radiusM / 2e6);
          const upland = ss(RC.HM0, RC.HM1, floorM);
          elevationM = floorM + tau * detailM * (RC.WLOW + (1 - RC.WLOW) * upland);
          landformScale = tau * upland;
          smoothFloorOutM = floorM;
        } else {
          const m0 = -a0;
          const F = -(m0 / (1 + m0 / RC.HS) + RC.HAB * ss(RC.A1, RC.A2, m0) + RC.HTR * ss(RC.A3, RC.A4, m0));
          const smoothFloorM = clamp(F, -16000, 18000) * Math.min(1, body.radiusM / 2e6);
          // The seabed has no window: its detail is part of the floor.
          floorM = smoothFloorM + seabedDetail(d, smoothFloorM);
          smoothFloorOutM = smoothFloorM;
          elevationM = floorM;
          landformScale = 0;
        }
      } else {
        floorM = floorM * kd;
        smoothFloorOutM = floorM;
        elevationM = floorM + tau * detailM;
        landformScale = tau;
      }
    }
    const ocean = !!body.water && elevationM < waterLevelM;
    const latitude = Math.abs(d[1]);
    let color: number[] | null;
    if (ocean) {
      color = mix(
        [26, 114, 139],
        [5, 25, 58],
        Math.sqrt(clamp(-elevationM / 5500)),
      );
      if (latitude > 0.94)
        color = mix(color, [202, 225, 234], clamp((latitude - 0.94) * 25));
    } else if (body.water) {
      color = deferWaterLand ? null : legacyWaterLandColour(d, elevationM);
    } else if (body.type === "Ice world") {
      color = mix([119, 156, 178], [218, 232, 239], macro * 0.8 + ridges * 0.2);
    } else if (body.type === "Volcanic world") {
      color = mix([49, 42, 42], [131, 85, 62], macro);
    } else {
      color = mix([55, 51, 49], [168, 154, 135], macro);
    }
    const grain = 0.91 + n(d, 115, 35) * 0.18;
    // The legacy grain (.88 + n x .24; same expression and bits as before); the
    // noise value is kept for terrain-1.8.1's water-land colour (TERRAIN_LOCAL_GRAIN).
    const localGrainNoise = ocean ? 0 : n(d, body.radiusM / 800, 74);
    const localGrain = ocean ? 1 : .88 + localGrainNoise * .24;
    const out: CoreSample = {
      elevationM,
      ocean,
      color: color ? [clamp(color[0] * grain * localGrain, 0, 255), clamp(color[1] * grain * localGrain, 0, 255), clamp(color[2] * grain * localGrain, 0, 255)] : null,
      roughness: ocean ? WET_SURFACE_ROUGHNESS : DRY_SURFACE_ROUGHNESS,
      grain,
      localGrain,
      localGrainNoise,
      landformScale,
      landformGateM: rawBaseM,
    };
    if (exposeFloor) {
      // R0: the continental coordinate repeats the first term of the
      // elevation sum on its own (it never feeds elevationM).
      out.floorM = floorM;
      out.smoothFloorM = smoothFloorOutM;
      out.continentalM = (body.water ? (coast - sea) * 47000 : (macro - 0.46) * 44000) * continentalScale;
    }
    return out;
  };
  return { sample, legacyWaterLandColour };
}

/**
 * Builds this body's (seed, id)-keyed crater field once, gated to exactly its
 * own `surfaceAgeMyr` upper bound, or `null` for a body that cannot carry
 * impact craters. `null` for:
 *  - stars (`body.kind === 'star'`) - no solid cratered surface;
 *  - gas giants - `baseTerrainSampler` already returns a fixed `elevationM:0`
 *    for these (no rock to crater), so a field would only ever be summed
 *    against a flat 0 baseline for no visual effect at real cost.
 *
 * `hasAtmosphere`/`hasOcean`/`hasActiveBiosphere` (erosion/resurfacing
 * inputs `planet-craters.ts` uses to reduce the surviving crater count):
 *  - `hasOcean: body.water > 0` - a real, always-available per-body signal,
 *    kind-agnostic to match this module's own established `body.water` use
 *    (baseTerrainSampler treats a watered moon exactly like a watered planet).
 *  - `hasAtmosphere`: `Body` carries no independent atmosphere signal (same
 *    gap `planet-renderer.ts`'s own `hasAtmosphereBody` comment documents).
 *    Reuses that renderer's exact heuristic - `hasOceanBody || gasGiant` -
 *    which, since gas giants never reach this function (see above), reduces
 *    to the same `body.water > 0` test as `hasOcean`. This is the best
 *    available derived signal, not an invented constant; a body with a real
 *    thin/non-ocean atmosphere (e.g. a cold, dry world with a CO2 shroud)
 *    will under-erode its craters until a real atmosphere flag exists on
 *    `Body`.
 *  - `hasActiveBiosphere: false` (documented gap, not a silent default): a
 *    real value needs `world-surface.ts`'s `biosphereStateAt`, which needs
 *    the same resolved `StarLifecycle`/`PlanetLifecycle`/address plumbing
 *    `surfaceAgeMyr`'s own PROVENANCE RULE documents as unreachable from
 *    `Body` alone at every call site this package owns. Always `false` is a
 *    ONE-SIDED, conservative bias - it can only make MORE craters survive
 *    than a live biosphere really would, never erase a real one, so it can
 *    never hide a crater that should be visible.
 */
function buildCraterField(body: Body, surfaceAgeMyr: number): CraterField | null {
  if (body.kind === 'star' || body.type === 'Gas giant') return null;
  const hasOcean = body.water > 0;
  const params: CraterParams = { surfaceAgeMyr, hasAtmosphere: hasOcean, hasOcean, hasActiveBiosphere: false };
  const field = craterField(body.seed, body.id, body.radiusM, params);
  return craterAgeGate(field, field.surfaceAgeNs);
}

/**
 * Terrain plus zero or more immutable physical-water regions. Capturing them
 * in this closure is deliberate: an existing renderer or flight query cannot
 * observe a later body-model replacement halfway through a frame.
 *
 * INLAND RIVERS ARE WITHDRAWN (terrain-1.6.0): `regions` defaults to
 * `activeRiverRegions(body)`, which is empty in the application regardless of
 * any attached `body.hydrology`/`body.canonicalRivers`. Only the archived river
 * algorithm tests pass regions explicitly or opt back in; the description
 * below documents that archived behaviour.
 *
 * `regions` formerly defaulted to `body.canonicalRivers` — the full, order-independent
 * hydrology EXISTENCE set for this body address, built proactively by
 * hydrology-registry.ts's ensureCanonicalHydrology (a worker job triggered
 * when the body becomes the focus/approach target, never by a UI "find" or
 * "build" action) and attached in place onto the resident Body object, so
 * every caller of terrainSampler(body) — planet-tiles' buildTile (via
 * structured clone into planet-worker.ts), world-surface's surfaceQuery
 * (GroundWalker's physics collider sampling), surface-survey, travel's
 * cruise-altitude sampling — picks it up with no call-site change. A body's
 * canonical rivers are addressed by basin id and are a pure function of
 * (seed, address) — see drainage.ts's RIVER_CANDIDATE_COUNT — never of which
 * request happened to build/attach a region first, and never of
 * body.hydrology, which remains a *separate*, purely cosmetic "which single
 * region currently gets the rich water-mesh/vegetation render" selector
 * (see main.ts's selectRiverDestination) that terrain must never read. When
 * canonicalRivers is absent (a synthetic test Body, or a body whose registry
 * build has not resolved yet) this falls back to body.hydrology's single
 * element, preserving every existing caller/test that never set
 * canonicalRivers.
 *
 * When more than one region is supplied, this checks them in a fixed
 * id-sorted order, never call/array order: the sampled result at a fixed
 * direction depends only on WHICH canonical regions are present in the set,
 * never on the order they were built or passed in. Two canonical regions on
 * the same body do not geographically overlap (each owns its own bounded
 * coastal footprint), so in practice at most one ever claims a given
 * direction; the id sort is a deterministic tiebreak, not load-bearing.
 *
 * TRADEOFF: close-range/contact-precision terrain queries are gated on the
 * registry being ready (planet-renderer.ts's contactPatches — the same gate
 * physics/landing already waits on) so physics and walking never sample a
 * body before its canonical set is known; ordinary far-LOD tile rendering is
 * not gated (a canonical carve may render un-carved for the ~350ms a fresh
 * body's build takes, matching the spec's allowance that far LODs where the
 * carve is sub-pixel may render before it is ready).
 *
 * `surfaceAgeMyr` (new): threads the body's real, clamped planet age into
 * `planet-craters.ts`'s procedural impact-crater field, which this function
 * sums into the returned `elevationM`/`rockHeightM`/`groundHeightM`/
 * `visibleHeightM` for any non-star, non-gas-giant body (never into
 * `baseTerrainSampler`'s own output - see that function's comment for why).
 * Defaults to `DEFAULT_SURFACE_AGE_MYR`, a fixed fallback for the several
 * call sites not yet threading the real value (see that constant's own
 * PROVENANCE RULE comment) - passing a real age keeps this function a pure,
 * t-seek-independent query (contract §1.2 rule 2): the same `(body, regions,
 * surfaceAgeMyr)` always produces the same terrain, with no accumulated
 * "craters seen so far" state carried between calls. Craters apply only to
 * the exposed dry-land/rocky path (`!ocean`, resolved from the PRE-crater
 * `sample.ocean`, exactly as before): this function does not also recompute
 * the ocean/land boundary or biome colour from the crater-adjusted elevation
 * (out of scope for this change - a documented simplification, not a bug),
 * and craters are never summed under a river/lake region's own landform
 * height, so the physical-hydrology carve this function's river branch
 * consumes is completely unaffected by cratering. The crater field itself is
 * built ONCE per `terrainSampler(...)` call (below, outside the returned
 * per-direction closure) from `body.seed`/`body.id` - never per sample point -
 * then explicitly gated with `craterAgeGate` to its own `surfaceAgeNs` upper
 * bound, so "craters that have not formed yet at this surface age do not
 * appear" is an explicit statement in this code, not an implicit default.
 */
const pinF64 = new Float64Array(1), pinI64 = new BigInt64Array(pinF64.buffer);
/** The largest double strictly below a finite `x` (bit arithmetic only, exact). */
export function previousDouble(x: number): number {
  if (!Number.isFinite(x)) return x;
  if (x === 0) return -Number.MIN_VALUE;
  pinF64[0] = x;
  pinI64[0] += x > 0 ? -1n : 1n;
  return pinF64[0];
}
/**
 * `waterLevelM` (new, additive, default `0` - the literal every existing
 * caller already depended on, matching `includeCraters`'s own precedent):
 * docs/time-and-coordinates-contract.md §2.5/§2.6/§6.2. Threaded straight
 * into `baseTerrainSampler` (see its own comment) so the ocean/land boundary
 * this returns is driven by the caller's resolved sea level instead of a
 * hardcoded `0`. Every existing call site in this codebase (`drainage.ts`,
 * `main.ts`, `planet-renderer.ts`, `surface-survey.ts`, `travel.ts`,
 * `world-surface.ts`'s `surfaceQuery`) omits this argument and keeps getting
 * the pre-existing `0` behaviour untouched; only this package's own
 * `planet-tiles.ts` threads a real value through.
 */
/**
 * Mountains assembly wiring (MTN-6; docs/mountains-opus-decisions-2026-10-05.md). STAGED: false on main until
 * the assembled check (cost plan T6) wires it, moves TERRAIN_VERSION and re-pins the goldens in one step. While
 * false, a sampler evaluates the M1+M2+M3 belts only when it opts in with `{mountains: true}` (evidence and
 * the T3 tests), and `lodLevel` changes nothing: the default field is bit-identical to terrain-1.8.1-grain.
 */
export const TERRAIN_MOUNTAINS_WIRED = false;
/**
 * `lodLevel`: the tile level this sampler serves (lod-ladder-2, cost plan T3). Below
 * `carvingFromLevel(radiusM)` the M3 carving is the declared reduction +0 (an upper envelope); omitted, the
 * sampler is the truth (full carving), as collision, physics and place queries require (contract section 8).
 * `mountains`: whether the M1+M2+M3 belts are evaluated (default TERRAIN_MOUNTAINS_WIRED).
 */
export type TerrainSamplerOptions = {lodLevel?: number; mountains?: boolean};
/** The mountain carving state a sampler with `options` evaluates on `body`: null when no mountain belt is
 * evaluated (not wired, or not a relief water world: the level then changes nothing), else whether the M3
 * carving is on. Two samplers with equal states return identical fields; tile caches key on it. */
export function mountainCarvingState(body: Body, options: TerrainSamplerOptions = {}): boolean | null {
  if (!(options.mountains ?? TERRAIN_MOUNTAINS_WIRED) || !reliefModeFor(body) || !body.water) return null;
  return carvingAtLevel(body.radiusM, options.lodLevel);
}
export function terrainSampler(
  body: Body,
  regions: RiverRegion[] = activeRiverRegions(body),
  surfaceAgeMyr: number = DEFAULT_SURFACE_AGE_MYR,
  includeCraters: boolean = false,
  waterLevelM: number = 0,
  onOceanThreshold?: (heightM:number)=>void,
  exposeFloor: boolean = false,
  options: TerrainSamplerOptions = {},
) {
  const carving = mountainCarvingState(body, options);
  const core = baseTerrainCore(body, waterLevelM, exposeFloor, true, carving === null ? null : {carve: carving});
  const landforms=planetLandforms(body);
  // The landform ceiling (terrain-1.8.0): the body's analytic height bound.
  const landformCeilingM = reliefModeFor(body) ? bodyHeightBoundM(body).maxM : undefined;
  const candidates = regions.length > 1 ? [...regions].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : regions;
  // `includeCraters=false` skips building a CraterField at all (not merely
  // "zero craters" via surfaceAgeMyr<=0): planet-craters.ts's per-voxel
  // `cellCache` is a plain, never-evicted Map that records an entry (even an
  // EMPTY one) for every distinct voxel any query touches, regardless of
  // whether that voxel's Poisson lambda is zero - so surfaceAgeMyr alone
  // cannot bound the cache, only *not querying it* can. This escape hatch
  // exists solely for `planetSurface`'s dense per-pixel texture bake below,
  // which must not call `craterHeightDeltaAt` at raw pixel density (see that
  // function's own comment for the measured crash this avoids). Every other
  // caller in this package always leaves this at its default `true`.
  const craters = includeCraters ? buildCraterField(body, surfaceAgeMyr) : null;
  // Climate colour v2 (terrain-1.7.0-climate-colour): water worlds only. Built
  // once per sampler; the forcing is cached per body in surface-climate.ts.
  // The per-sample path reuses one scratch sample (no allocation in the
  // climate call) and the identical seeded grain helper `baseTerrainSampler`
  // uses, so colour = waterWorldLandColour(climate, h) x grain x localGrain.
  const climate = body.water ? surfaceClimate(climateForcingFor(body)) : null;
  // Climate datum: the current shoreline, or 0 m when the sea has fully gone.
  const seaDatumM = climateDatumM(waterLevelM);
  // The pin partner for the validity observer below (only read when one is given).
  const belowWaterM = onOceanThreshold ? previousDouble(waterLevelM) : waterLevelM;
  const climateScratch = climate ? createClimateSample() : null;
  // The grain factors come from the base core itself (its n(d,115,35) and
  // n(d,R/800,74) via the shared macroNoise helper), so they cannot drift.
  // terrain-1.8.1: the water-land colour takes the reduced TERRAIN_LOCAL_GRAIN on
  // the same 800 m noise (the base core's own value where it saw land).
  const localGrainF = body.radiusM / TERRAIN_LOCAL_GRAIN.CELL_M;
  const LG_BASE = TERRAIN_LOCAL_GRAIN.BASE, LG_AMP = TERRAIN_LOCAL_GRAIN.AMPLITUDE;
  const { n: grainNoise } = macroNoise(body);
  const applyGrain = (c: number[], grain: number, localGrain: number) => {
    // In place on a fresh array; the same clamp(v * grain * localGrain)
    // expression, in the same order, that baseTerrainSampler applies.
    for (let i = 0; i < 3; i++) c[i] = clamp(c[i] * grain * localGrain, 0, 255);
    return c;
  };
  return (d: V3) => {
    const sample = core.sample(d, climate !== null);
    // Craters never touch the seafloor shape in this pass (see this
    // function's own doc comment): only the exposed dry/rocky elevation
    // gains a crater delta, and `ocean` itself keeps deciding land/sea from
    // the PRE-crater elevation, so this cannot flip the coastline.
    const uncrateredHeightM = sample.landformScale > 0
      ? sample.elevationM + sample.landformScale * landforms(d, sample.elevationM, sample.landformGateM, landformCeilingM)
      : sample.elevationM;
    // Optional read-only observer for exact forest cache validity. This is the
    // branch threshold before ocean sampling bypasses immutable river geometry.
    // terrain-1.8.0-relief (P4-RELIEF r2): a LAND sample's output (its climate
    // colour here, and the classifier gates and climate that share the sea
    // datum, surface-biomes-2.1-sea-datum) depends CONTINUOUSLY on the water
    // level, not only through this step threshold. The observer therefore also
    // receives the pin pair (largest double below the water level, the water
    // level), which narrows an exact `threshold < water` validity interval
    // (lower exclusive, upper inclusive; forest-water-validity.ts) to exactly
    // this water level. Ocean samples keep the single step threshold.
    if(body.water&&onOceanThreshold){
      onOceanThreshold(uncrateredHeightM);
      if(uncrateredHeightM>=waterLevelM){onOceanThreshold(belowWaterM);onOceanThreshold(waterLevelM);}
    }
    const ocean=!!body.water&&uncrateredHeightM<waterLevelM;
    const craterDeltaM = craters && !ocean ? craterHeightDeltaAt(craters, d) : 0;
    const elevationM = uncrateredHeightM + craterDeltaM;
    // Water-world land: climate colour at the post-landform, pre-crater height
    // ABOVE THE CURRENT SEA LEVEL (terrain-1.8.0 sea datum: the lapse and the
    // coast/fell gates are measured from the dated shoreline; at sea level 0
    // the datum is unchanged). Every other palette keeps the base colour.
    let surfaceColor: number[];
    if (climate && !ocean) {
      const aboveSeaM = uncrateredHeightM - waterLevelM;
      const c = waterWorldLandColour(climate(d, uncrateredHeightM - seaDatumM, climateScratch!), aboveSeaM);
      // The base reports localGrain=1 where IT saw ocean; the land colour
      // always takes the land local grain on the same 800 m noise (terrain-1.8.1:
      // the reduced TERRAIN_LOCAL_GRAIN; baseTerrainSampler keeps .88/.24).
      const localGrain = LG_BASE + (sample.ocean ? grainNoise(d, localGrainF, 74) : sample.localGrainNoise) * LG_AMP;
      surfaceColor = applyGrain(c, sample.grain, localGrain);
    } else if (sample.color) surfaceColor = sample.color;
    else surfaceColor = applyGrain(core.legacyWaterLandColour(d, sample.elevationM), sample.grain, sample.localGrain);
    const baseline:SurfaceSample = {
      // Keep the common no-region path to one result allocation. Do not spread
      // a sampler result for every tile vertex: this is the hot terrain loop.
      elevationM,
      ocean,
      color: surfaceColor,
      roughness: sample.roughness,
      rockHeightM: elevationM,
      waterLevelM: ocean ? 0 : null,
      visibleHeightM: ocean ? 0 : elevationM,
      groundHeightM: elevationM,
      waterHeightM: ocean ? 0 : null,
      waterDepthM: ocean ? Math.max(0,-elevationM) : 0,
      wet: ocean,
      waterKind: null as 'river'|'lake'|null,
      bank: 0,
      channelId: null as string|null,
      flow: [0, 0] as [number, number],
      influence: 0,
    };
    // R0 (opt-in, terrainFloorSampler): the default sample keeps its
    // historical field set exactly (tests deep-compare it).
    if (exposeFloor) {
      baseline.floorM = sample.floorM!;
      baseline.windowM = uncrateredHeightM - sample.floorM!;
      baseline.continentalM = sample.continentalM!;
    }
    if (ocean || !candidates.length) return baseline;
    // This versioned physical surface drives tiles and collision. River
    // construction still uses baseTerrainSampler + sampleLegacyRiverRegion,
    // preserving exports and canonical drainage inputs.
    for (const region of candidates) {
      const landform=regionalLandformHeight(region,d,elevationM);
      const river = sampleRiverRegion(region, d, landform);
      if (!river.influence) continue;
      const rockHeightM = river.rockHeightM;
      const wet = river.wet;
      const waterLevelM = river.waterLevelM;
      // Inland water shares the water palette used by orbit previews. River
      // material selection is carried in bank/waterKind for nearby terrain.
      const color = wet ? [24, 105, 132] : regionalBankColor(body,d,landform,surfaceColor,river);
      const waterHeightM=waterLevelM;
      const regional: SurfaceSample = {
        elevationM: rockHeightM,
        ocean,
        color,
        roughness: wet ? WET_SURFACE_ROUGHNESS : sample.roughness,
        rockHeightM,
        waterLevelM,
        visibleHeightM: wet && waterLevelM !== null ? Math.max(rockHeightM, waterLevelM) : rockHeightM,
        groundHeightM:rockHeightM,
        waterHeightM,
        waterDepthM:waterHeightM===null?0:Math.max(0,waterHeightM-rockHeightM),
        wet,
        waterKind: river.waterKind,
        bank: river.bank,
        channelId: river.channelId,
        flow: river.flow,
        influence: river.influence,
      };
      if (exposeFloor) {
        regional.floorM = sample.floorM!;
        regional.windowM = uncrateredHeightM - sample.floorM!;
        regional.continentalM = sample.continentalM!;
      }
      return regional;
    }
    return baseline;
  };
}

/**
 * R0 (relief round 2026-10-03, additive): `terrainSampler` with the terrain
 * floor/window split exposed on every sample - `floorM`, `windowM` and
 * `continentalM` (see SurfaceSample). Same arguments and the same values for
 * every other field; the plain `terrainSampler` keeps its historical field
 * set so existing shape-comparing callers and tests are untouched.
 */
export function terrainFloorSampler(
  body: Body,
  regions: RiverRegion[] = activeRiverRegions(body),
  surfaceAgeMyr: number = DEFAULT_SURFACE_AGE_MYR,
  includeCraters: boolean = false,
  waterLevelM: number = 0,
) {
  return terrainSampler(body, regions, surfaceAgeMyr, includeCraters, waterLevelM, undefined, true) as (d: V3) => SurfaceSample & {floorM: number; windowM: number; continentalM: number};
}

/**
 * Diagnostic layer view of the relief field (tests, reports; not a hot path):
 * per direction the terrainSampler ground height (crater-free, sea level 0)
 * with the relief core's floorM (seabed detail included), smoothFloorM (seabed
 * detail excluded), continentalM, the raw terrain-1.7 base height and the
 * landform scale.
 */
export function reliefLayersSampler(body: Body) {
  const core = baseTerrainCore(body, 0, true, true);
  const surface = terrainSampler(body);
  return (d: V3) => {
    const c = core.sample(d, true), s = surface(d);
    return {groundHeightM: s.groundHeightM, ocean: s.ocean, floorM: c.floorM!, smoothFloorM: c.smoothFloorM!,
      continentalM: c.continentalM!, rawBaseM: c.landformGateM, landformScale: c.landformScale};
  };
}

// Fixed, bounded resolution for the coarse crater-delta grid `planetSurface`
// pre-samples once below - independent of `width`/`segments` so a caller
// requesting a large texture (the default 1024x192 call sites in main.ts)
// can never grow it, and shared by BOTH the diffuse/relief texture bake and
// the (coarser) elevation grid below - see `planetSurface`'s own comment for
// why reusing one fixed grid for both is exact-safe, not just "close
// enough". 129x65 keeps every band's voxel neighbourhood search bounded to a
// low, constant number of distinct cells - nowhere near planet-craters.ts's
// per-field `cellCache` Map ever approaching V8's ~16.7M-entry ceiling (see
// `planetSurface`'s comment), and keeps the grid itself cheap to build:
// planet-craters.ts's per-query cost is dominated by catalog.ts's `rng`
// (BigInt-arithmetic FNV-1a hashing, paid on nearly every neighbour lookup
// since the grid's ~310km-plus point spacing exceeds most crater bands' own
// cell size, so the voxel cache gets little reuse) - measured directly at
// ~0.6-0.8ms/query, so this grid's point count is deliberately kept in the
// low thousands rather than the tens of thousands a 256x128 grid used
// during development required (that size alone took ~27s to build; this one
// measures under 4s for the same Earth-radius test body - see this task's
// report for the full measurement and the blocking finding this points at
// in planet-craters.ts itself, which this file cannot fix).
const CRATER_GRID_COLS = 128, CRATER_GRID_ROWS = 64;

/** Bilinear sample of a `(CRATER_GRID_COLS+1) x (CRATER_GRID_ROWS+1)` grid
 * built over the same (theta,phi) parametrisation `planetSurface` uses,
 * wrapping `theta` at the seam and clamping `phi` at the poles. */
function bilinearGrid(grid: Float32Array, cols: number, rows: number, u: number, v: number): number {
  const fx = u * cols, fy = clamp(v) * rows;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const x0w = ((x0 % cols) + cols) % cols, x1w = ((x0 + 1) % cols + cols) % cols;
  const y0c = y0 < 0 ? 0 : y0 > rows ? rows : y0, y1c = y0 + 1 < 0 ? 0 : y0 + 1 > rows ? rows : y0 + 1;
  const g = (x: number, y: number) => grid[y * (cols + 1) + x];
  const top = g(x0w, y0c) * (1 - tx) + g(x1w, y0c) * tx;
  const bottom = g(x0w, y1c) * (1 - tx) + g(x1w, y1c) * tx;
  return top * (1 - ty) + bottom * ty;
}

export function planetSurface(body: Body, width = 1024, segments = 192, surfaceAgeMyr: number = DEFAULT_SURFACE_AGE_MYR, applyCraters: boolean = false) {
  const height = width / 2;
  // Both the per-pixel diffuse/relief/roughness texture AND the coarser
  // `elevations` mesh grid below sample far too densely to call
  // `craterHeightDeltaAt` directly per point (at this function's default
  // 1024x192 call sites - main.ts, worker.ts's `job('surface',...)` - the
  // texture loop alone samples width*height = 1024*512 = 524,288
  // directions, almost all landing in DISTINCT crater voxels since
  // planet-craters.ts's smallest bands use a ~5.2km-18.2km cell size, finer
  // than this loop's ~39km-at-the-equator pixel spacing, so its per-field
  // `cellCache` gets essentially no reuse). Measured directly
  // (`planetSurface(earthLikeBody, 1024, 192)` in isolation, before this
  // mitigation existed): the texture loop alone overflowed
  // `CraterField.cellCache` (a plain, never-evicted `Map`) past V8's
  // internal ~16.7M-entry ceiling and threw `RangeError: Map maximum size
  // exceeded` for an ordinary Earth-radius body - this is exactly the
  // "Generation timed out" failure the ATLAS_URL browser suite hit on this
  // task's very first `job('surface',...)` call, well before any
  // moon/crater-specific flow; and even the much smaller `elevations` grid
  // (<=~18.7k points) measured ~11s on its own once bounded, dominated by
  // catalog.ts's `rng` (BigInt-arithmetic FNV-1a hashing, paid on nearly
  // every neighbour-voxel lookup). Both are a planet-craters.ts/catalog.ts
  // performance characteristic (unbounded per-voxel cache, ~0.6-0.8ms/query
  // dominated by hashing - out of this file's ownership to fix at the
  // source, see this task's report for the full measurement), not something
  // introduced by sampling at this density in general (the pre-crater
  // `baseTerrainSampler`/`terrainSampler` handled both call sites fine
  // before craters existed).
  //
  // `applyCraters` DEFAULTS TO FALSE, gating the coarse-grid bake below off
  // entirely for every EXISTING call site (main.ts's `job('surface',...)` at
  // width=1024/segments=192, and worker.ts's `job('system-surfaces',...)`
  // which calls this once per body in a system - up to several dozen bodies
  // computed serially inside ONE 60s-budgeted job, see main.ts's `job()`
  // wrapper). This is a deliberate, reported regression fix, not a silent
  // downgrade: even after the fixed CRATER_GRID_COLS x CRATER_GRID_ROWS
  // mitigation below capped any SINGLE call's cost (measured ~5-12s per body
  // for an aged, non-ocean body - down from crash/50s+), that per-body cost
  // is PAID REGARDLESS of the caller's requested `width`/`segments` (the
  // grid is fixed-size, see its own comment), so a `system-surfaces` job
  // computing e.g. 37 bodies at that per-body cost measured 261.2s total in
  // isolated Node timing (`Isowyn`, seed `LETHRA-001`/G001/[266,0,0]: 11
  // planets averaging ~11s, 26 moons averaging ~6-11s each) - over 4x the
  // job's hard 60s timeout (main.ts, not owned by this file, has no retry),
  // permanently stranding the UI on the sector view. With `applyCraters`
  // defaulted off, this function's cost returns to its pre-crater baseline
  // (the same `denseSample`/`elevations` loops below run with
  // `includeCraters=false`, so no `CraterField` is ever built or queried at
  // all on this path) - see this task's report for the exact before/after
  // per-body numbers. A caller may still opt in explicitly by passing
  // `applyCraters=true`; `terrainSampler`'s own default (craters ON) is
  // UNCHANGED, since that pure per-direction API is not the thing that blew
  // the job budget - only this function's dense whole-sphere bake was.
  //
  // Mitigation kept entirely in this file, for the `applyCraters=true` path:
  // `denseSample` below leaves craters OUT (`includeCraters=false`), and ONE
  // fixed-size `CRATER_GRID_COLS x CRATER_GRID_ROWS` grid (bounded
  // regardless of `width`/`segments`) is pre-sampled once and bilinearly
  // interpolated onto BOTH the texture and the elevation grid's height
  // channel. Reusing the SAME fixed grid for both is exact-safe, not merely
  // "close enough": the grid is a pure function of (theta,phi) independent
  // of `segments`, so two `planetSurface` calls at different `segments`
  // querying the identical physical direction get bit-identical
  // interpolated crater deltas - satisfying catalog.test.mjs's "LOD shares
  // exactly the same height field" cross-resolution check and this file's
  // own seam continuity (the grid's own theta=0/theta=2*PI columns are
  // computed from the identical direction vector, so seam values are
  // exactly equal, not merely interpolated-close). This is a deliberate,
  // documented precision reduction for BOTH channels (a whole-sphere
  // 1024x512 texture and an <=192-segment coarse mesh grid already cannot
  // resolve craters below their own tens-of-km footprint, so this loses
  // nothing either channel could usefully show), not a scope cut:
  // color/roughness/ocean/landFraction are untouched (craters never
  // affected those fields even in the exact per-pixel path - see
  // `terrainSampler`'s own doc comment). No test asserts exact per-direction
  // crater precision in either `planetSurface(...).relief` or `.elevations`
  // (only cross-LOD/seam consistency, preserved as above); planet-tiles.ts's
  // own close-range tile mesh (unrelated to this function) still calls the
  // full exact `terrainSampler` per vertex.
  // Sparse-global consumer (mountains cost plan T4): the orbit bake is the S0 representation (a ~32 km texel at the
  // equator cannot hold the 16 km M3 band), so it samples at level 0, the declared lod-ladder-2 reduction (carving +0,
  // an upper envelope; docs/lod-ladder-contract-v1.md section 3). It solves no M3 block. While the mountains are not
  // wired the level changes nothing.
  const denseSample = terrainSampler(body, undefined, surfaceAgeMyr, false, 0, undefined, false, {lodLevel: 0});
  const craters = applyCraters ? buildCraterField(body, surfaceAgeMyr) : null;
  const craterGrid = craters
    ? (() => {
        const grid = new Float32Array((CRATER_GRID_COLS + 1) * (CRATER_GRID_ROWS + 1));
        for (let y = 0; y <= CRATER_GRID_ROWS; y++)
          for (let x = 0; x <= CRATER_GRID_COLS; x++) {
            const theta = (x / CRATER_GRID_COLS) * Math.PI * 2,
              phi = (y / CRATER_GRID_ROWS) * Math.PI;
            const d: V3 = [
              -Math.cos(theta) * Math.sin(phi),
              Math.cos(phi),
              Math.sin(theta) * Math.sin(phi),
            ];
            grid[y * (CRATER_GRID_COLS + 1) + x] = craterHeightDeltaAt(craters, d);
          }
        return grid;
      })()
    : null;
  // Craters apply only where `terrainSampler` itself would apply them:
  // never on ocean, and never where a river/lake region has already claimed
  // this direction (`s.influence>0` - matches `terrainSampler`'s own
  // "region loop returns before craters would matter" branch, see its doc
  // comment).
  const craterAdjustedVisible = (s: SurfaceSample, u: number, v: number): number => {
    const craterDeltaM = craterGrid && !s.ocean && s.influence <= 0 ? bilinearGrid(craterGrid, CRATER_GRID_COLS, CRATER_GRID_ROWS, u, v) : 0;
    return s.visibleHeightM + craterDeltaM;
  };
  // terrain-1.8.0: relief bytes span the body's own height range (about 68 m
  // per step on Maithea instead of 235 m over the old fixed 60 km). The decode
  // must use the returned reliefMinM/reliefMaxM (ELEVATION_RANGE_M is deprecated).
  const reliefRange = reliefTextureRange(body);
  const reliefMinM = reliefRange.minM, reliefSpanM = reliefRange.maxM - reliefRange.minM;
  const data = new Uint8Array(width * height * 4),
    relief = new Uint8Array(width * height * 4),
    roughness = new Uint8Array(width * height * 4);
  let landPixels = 0,
    totalWeight = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const u = (x + 0.5) / width, v = (y + 0.5) / height;
      const theta = u * Math.PI * 2,
        phi = v * Math.PI;
      const d: V3 = [
        -Math.cos(theta) * Math.sin(phi),
        Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
      ];
      const s = denseSample(d),
        i = (y * width + x) * 4;
      // Direct Uint8Array stores apply the same ToUint8 conversion as the
      // former .set([...]) calls (byte-identical), without per-pixel arrays.
      const c = s.color;
      data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255;
      // Visible ocean is a constant-radius sea surface. Seafloor remains in the sampler.
      const visible = craterAdjustedVisible(s, u, v);
      const h = clamp((visible - reliefMinM) / reliefSpanM) * 255;
      relief[i] = h; relief[i + 1] = h; relief[i + 2] = h; relief[i + 3] = 255;
      const r = s.roughness * 255;
      roughness[i] = r; roughness[i + 1] = r; roughness[i + 2] = r; roughness[i + 3] = 255;
      const weight = Math.sin(phi);
      totalWeight += weight;
      if (!s.ocean) landPixels += weight;
    }
  const rows = segments / 2;
  const elevations = new Float32Array((segments + 1) * (rows + 1));
  for (let y = 0; y <= rows; y++)
    for (let x = 0; x <= segments; x++) {
      const u = x / segments, v = y / rows;
      const theta = u * Math.PI * 2,
        phi = v * Math.PI;
      const s = denseSample([
        -Math.cos(theta) * Math.sin(phi),
        Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
      ]);
      elevations[y * (segments + 1) + x] = craterAdjustedVisible(s, u, v);
    }
  return {
    data,
    relief,
    roughness,
    width,
    height,
    elevations,
    segments,
    version: TERRAIN_VERSION,
    landFraction: landPixels / totalWeight,
    /** The relief texture encoding: byte/255 * (reliefMaxM - reliefMinM) + reliefMinM. */
    reliefMinM: reliefRange.minM,
    reliefMaxM: reliefRange.maxM,
  };
}
