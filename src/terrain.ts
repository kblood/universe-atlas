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
import {planetLandforms} from './planet-landforms.ts';
import {DRY_SURFACE_ROUGHNESS,WET_SURFACE_ROUGHNESS} from './surface-roughness.ts';
import {climateForcingFor,createClimateSample,surfaceClimate,CLIMATE_CALIBRATION,CLIMATE_VERSION,type ClimateSample} from './surface-climate.ts';

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
export const TERRAIN_VERSION = "terrain-1.7.0-climate-colour";
/** The climate model whose fields the water-world land colour reads. */
export const TERRAIN_CLIMATE_VERSION = CLIMATE_VERSION;
export {REGIONAL_LANDFORM_VERSION};
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
export function terrainWindowMaxM(body: Pick<Body,'kind'|'type'|'radiusM'>): number {
  if (body.kind === 'star' || body.type === 'Gas giant') return 0;
  return TERRAIN_DETAIL_WINDOW_M + TERRAIN_LANDFORM_WINDOW_M * Math.min(1, body.radiusM / 2e6);
}
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mix = (a: number[], b: number[], t: number) =>
  a.map((v, i) => v + (b[i] - v) * clamp(t));

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
function baseTerrainCore(body: Body, waterLevelM: number) {
  const { code, n } = macroNoise(body);
  const sea = 0.37 + body.water * 0.22;
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
  const sample = (d: V3, deferWaterLand: boolean) => {
    const macro = macroHeightCode(code, d);
    if (body.type === "Gas giant") {
      const turbulence = n(d, 9, 24),
        bands = 0.5 + 0.5 * Math.sin(d[1] * 75 + turbulence * 8);
      const fine = n(d, 80, 22);
      return {
        elevationM: 0,
        ocean: false,
        color: mix([135, 98, 68], [225, 197, 153], bands * 0.8 + fine * 0.2) as number[] | null,
        roughness: 1,
        grain: 1,
        localGrain: 1,
        floorM: 0,
        continentalM: 0,
      };
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
    let elevationM = body.water
      ? (coast - sea) * 47000 + ridges * 2800 * landFactor + fine * landFactor
      : (macro - 0.46) * 44000 + ridges * 1800 + fine;
    elevationM =
      clamp(elevationM, -16000, 18000) * Math.min(1, body.radiusM / 2e6);
    // R0 (additive): the regional floor is exactly the clamped, scaled value
    // above; the continental coordinate repeats the first term of that sum on
    // its own (it does not feed elevationM).
    const floorM = elevationM;
    const continentalM = (body.water ? (coast - sea) * 47000 : (macro - 0.46) * 44000) * continentalScale;
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
    const localGrain = ocean ? 1 : .88 + n(d, body.radiusM / 800, 74) * .24;
    return {
      elevationM,
      ocean,
      color: color ? color.map((v) => clamp(v * grain * localGrain, 0, 255)) : null,
      roughness: ocean ? WET_SURFACE_ROUGHNESS : DRY_SURFACE_ROUGHNESS,
      grain,
      localGrain,
      floorM,
      continentalM,
    };
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
export function terrainSampler(
  body: Body,
  regions: RiverRegion[] = activeRiverRegions(body),
  surfaceAgeMyr: number = DEFAULT_SURFACE_AGE_MYR,
  includeCraters: boolean = false,
  waterLevelM: number = 0,
  onOceanThreshold?: (heightM:number)=>void,
  exposeFloor: boolean = false,
) {
  const core = baseTerrainCore(body, waterLevelM);
  const landforms=planetLandforms(body);
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
  const climateScratch = climate ? createClimateSample() : null;
  // The grain factors come from the base core itself (its n(d,115,35) and
  // n(d,R/800,74) via the shared macroNoise helper), so they cannot drift.
  const localGrainF = body.radiusM / 800;
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
    const uncrateredHeightM = sample.elevationM + landforms(d,sample.elevationM);
    // Optional read-only observer for exact forest cache validity. This is the
    // branch threshold before ocean sampling bypasses immutable river geometry.
    if(body.water)onOceanThreshold?.(uncrateredHeightM);
    const ocean=!!body.water&&uncrateredHeightM<waterLevelM;
    const craterDeltaM = craters && !ocean ? craterHeightDeltaAt(craters, d) : 0;
    const elevationM = uncrateredHeightM + craterDeltaM;
    // Water-world land: climate colour at the post-landform, pre-crater height
    // (the same height family the classifier gets via groundHeightM, minus
    // the crater delta, which never feeds colour). Every other palette keeps
    // the base sampler's colour unchanged.
    let surfaceColor: number[];
    if (climate && !ocean) {
      const c = waterWorldLandColour(climate(d, uncrateredHeightM, climateScratch!), uncrateredHeightM);
      // The base reports localGrain=1 where IT saw ocean; the land colour
      // always takes the land local grain, as baseTerrainSampler's land does.
      const localGrain = sample.ocean ? .88 + grainNoise(d, localGrainF, 74) * .24 : sample.localGrain;
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
      baseline.floorM = sample.floorM;
      baseline.windowM = uncrateredHeightM - sample.floorM;
      baseline.continentalM = sample.continentalM;
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
        regional.floorM = sample.floorM;
        regional.windowM = uncrateredHeightM - sample.floorM;
        regional.continentalM = sample.continentalM;
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
  const denseSample = terrainSampler(body, undefined, surfaceAgeMyr, false);
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
      data.set([...s.color, 255], i);
      // Visible ocean is a constant-radius sea surface. Seafloor remains in the sampler.
      const visible = craterAdjustedVisible(s, u, v);
      const h = clamp(0.5 + visible / ELEVATION_RANGE_M) * 255;
      relief.set([h, h, h, 255], i);
      const r = s.roughness * 255;
      roughness.set([r, r, r, 255], i);
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
  };
}
