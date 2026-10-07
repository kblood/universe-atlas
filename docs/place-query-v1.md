# place-query-1: the platform's place query

Status: relief round 2026-10, package P2-OCEAN-QUERY. Module `src/place-query.ts`,
version key `PLACE_QUERY_VERSION = 'place-query-1'`. Tests:
`tests/place-query.test.mjs`, `tests/ocean-volume.test.mjs`.

The universe is a foundation other games build on (space, strategy,
planet-builder, god games). This module is the documented surface those games
read. It answers **what is here, at this date** as plain derived data. It never
answers a game question.

## Rules

1. **Nothing is void.** The seabed is the same deterministic ground function as
   dry land. Under any depth of water `seabedHeightM` is a real, solid,
   collidable height, and `depthAndPressureAt` answers at every depth down to
   it. There is no cut-off depth. Detail *rendering* of a deep seabed may be
   coarser by distance (a renderer policy), never missing.
2. **Derived data, not rules.** Depth, pressure, gravity, air, biome, climate and
   time are queryable data. Survivability, damage, diving limits, breathability
   and building permissions are game-layer rules (see "Game layer").
3. **Deterministic and streamable.** Every answer is a pure function of
   (body seed, date `t`, direction, level) and the version keys in `versions`.
   Caches only memoise pure results; no answer depends on visit order (tested
   forward vs shuffled across bodies and dates).
4. **Version-stamped.** Every result carries `versions`. A consumer that stores
   or hashes place data must store the version block with it.

## API

```ts
placeAt(ctx: {sys, body, t}, direction: V3, level?: PlaceLevel, options?: {upDot?, measureSlope?}): PlaceResult
depthAndPressureAt(ctx: {sys, body, t}, direction: V3, depthBelowSurfaceM: number): DepthPressure
```

`direction` is a unit body-frame direction (spin axis +Y, as everywhere in the
surface code). `t` is BigInt nanoseconds on the world-time axis. Lifecycles are
resolved like `main.ts` (`sys.stars[0]` hosts every planet; a moon inherits its
parent planet's star distance).

`level` is the detail-ladder rung: `'S0'` space/orbit, `'S1'` atmosphere/horizon,
`'S2'` far ground, `'S3'` near ground, `'S4'` fine (default), or a numeric
quadtree tile level 0..22. place-query-1 answers every rung at FULL resolution
and echoes the requested `level` (`resolution: 'full'`). When `lod-ladder.ts`
(P3-LOD-CONTRACT) lands, S0/S1 will answer from the same coarse reduction the
renderer draws, so a strategy map and the orbit view agree; the ladder version
then appears in `versions.lodLadder`.

## Warm-up and residency transfer (additive, place-query-1)

```ts
exportPlaceBlocks(ctx, direction, level?, options?): {result: PlaceResult, blocks: CarvingBlockExport[]}
importPlaceBlocks(blocks: CarvingBlockExport[]): number      // count newly made resident
placeBlockTransferables(blocks: CarvingBlockExport[]): ArrayBuffer[]
```

Decision: `docs/placeat-first-touch-decision-2026-10-07.md`. These functions are
additive: no field or answer changes, so `PLACE_QUERY_VERSION` stays
`place-query-1`.

**Cost.** Full-level `placeAt` is the collision truth. On a massif, a *cold*
first touch solves one M3 carving block (the drainage solve of
`src/mountain-carving.ts`): about **150 ms**, at most about **0.3 s** when a
query touches two blocks. That is a frame stall on the main thread. After the
query's blocks have been imported, the same query costs **<= 30 µs** (17-26 µs measured; perf row
W in `tests/perf/place-query.perf.test.mjs`); a repeat of a query is a
point-memo hit (**~1.6 µs**). The cold cost is pinned as a regression guard
(row F, <= 250 ms per solve), not hidden.

**Worker pattern.** Run `placeAt` in a worker when frame time matters:

```ts
// worker
const {result, blocks} = exportPlaceBlocks(ctx, direction);
postMessage({result, blocks}, placeBlockTransferables(blocks));
// main thread
importPlaceBlocks(msg.blocks);
placeAt(ctx, direction);   // memo hit, bit-identical to msg.result
```

`exportPlaceBlocks` runs `placeAt` under a block trace (every carving block the
query touched, including point-memo hits) and returns copies of those blocks, so
transferring them never detaches the worker's own memo. The solved block is a
pure function of (seed, half-width, block id) in every module instance, thread
and process, so the imported block yields exactly the answer the worker
computed (`tests/place-query.test.mjs`, `tests/mountain-carving-memo.test.mjs`).
The main-thread memo is a 32-block LRU: import close to use, since more than 32
far-apart warmed blocks evict each other (repeats are still served by the point
memo).

**Trust rule.** Imported blocks are in-session data only: posted between threads
of the same build, never persisted, cached on disk or taken from another
session. The import checks the carving version, the key, the shape and the value
range (every value in [0, 1]) and throws on any mismatch, leaving the memo
untouched; it does not re-solve the values.

## Fields of `placeAt` (exists: true)

Provenance: **physical** = a physical law applied to model inputs;
**model** = the deterministic procedural world model (terrain, lifecycle);
**heuristic** = a documented engineering estimate, not a calibrated model.

| Field | Unit | Provenance | Meaning |
|---|---|---|---|
| `version` | - | - | `'place-query-1'` |
| `exists` | bool | model | `true`: the body has a surface at `t` |
| `stage` | - | model | `'molten'` or `'solid'` (planet lifecycle) |
| `level` | - | - | the requested ladder rung, echoed |
| `resolution` | - | - | `'full'` in place-query-1 |
| `groundHeightM` | m | model | solid ground (rock, regolith or seabed) above the 0 m datum; bit-identical to `surfaceAt(...).sample.groundHeightM` |
| `floorM` | m | model | regional floor of the terrain (R0 split, P1 `terrainFloorSampler`, same rock field as `groundHeightM`) |
| `windowM` | m | model | `groundHeightM - floorM`, the bounded local window |
| `seaLevelM` | m | model | dated global sea level (ocean-volume-1, 25 m snapped, the level the renderer draws); `null` when no global ocean exists at `t` |
| `oceanLossFraction` | 0..1 | heuristic | fraction of the catalogue-epoch ocean VOLUME lost by `t` (0 = full ocean) |
| `ocean` | bool | model | under the dated global ocean; equals `surfaceAt(...).sample.ocean` |
| `waterDepthM` | m | model | water column above the seabed (0 on land) |
| `seabedHeightM` | m | model | the seabed (== `groundHeightM`) under the ocean, always solid; `null` on land |
| `pressureAtSeabedPa` | Pa | physical (+ heuristic surface pressure) | `surfacePressurePa + fluidDensity * g * waterDepthM`; `null` on land |
| `surfacePressurePa` | Pa | heuristic | mean air pressure at the 0 m datum from planet-geophysics-1 (`airClass` and g); no barometric altitude correction |
| `gravityMS2` | m/s^2 | physical (model density) | `g_surface * (R / (R + groundHeightM))^2`, g_surface from planet-geophysics-1 (core fraction, density); catalogue `massKg` is NOT used (it stays the orbital mass) |
| `solid` | bool | model | the ground can be stood on (false while molten, and on gas giants) |
| `hasAir` | bool | heuristic | Jeans-style N2 retention or water world (planet-geophysics-1) |
| `airClass` | - | heuristic | `'none' / 'thin' / 'earthlike' / 'thick'` |
| `biome` | object | heuristic | habitat/material classification of the place (surface-biomes) |
| `biome.name` | - | heuristic | one of the classifier's labels (e.g. `Ocean`, `Temperate ground`, `Alpine / polar snow`) |
| `biome.weights` | 0..1 x4 | heuristic | sand, turf, rock, snow material weights |
| `biome.forestPotential` | bool | heuristic | trees may grow here (climate, slope, coast gates) |
| `biome.slopeDeg` | deg | model | slope used by the classifier: from `options.upDot` (default flat, 0 deg) or measured with `measureSlope` (+-5 m central differences) |
| `climate` | object | heuristic | annual climate field (surface-climate) at `groundHeightM` |
| `climate.annualMeanTempK` | K | heuristic | annual mean temperature (insolation table, lapse rate) |
| `climate.warmestMonthK` | K | heuristic | warmest-month temperature |
| `climate.snowFraction` | 0..1 | heuristic | persistent snow share |
| `climate.treeline01` | 0..1 | heuristic | 0 above the treeline, 1 well below it |
| `climate.effectiveMoisture` | 0..1 | heuristic | moisture after the dry-belt reduction |
| `tectonicRelief` | - | heuristic | relief scale from g and tectonic vigour (planet-geophysics-1); 1 = median-vigour Earth twin. Not the UI `reliefScale` exaggeration |
| `versions` | object | - | every model version that produced the answer |
| `versions.placeQuery` | - | - | `place-query-1` |
| `versions.surface` | - | - | `SURFACE_VERSION` (`atlas-surface-8-ocean-volume`) |
| `versions.terrain` | - | - | `TERRAIN_VERSION` |
| `versions.oceanVolume` | - | - | `ocean-volume-1` |
| `versions.geophysics` | - | - | `planet-geophysics-1` |
| `versions.biome` | - | - | `BIOME_VERSION` |
| `versions.climate` | - | - | `CLIMATE_VERSION` |
| `versions.lodLadder` | - | - | `null` until lod-ladder.ts lands |

Absent places return `{version, exists: false, stage, level, versions}` with
`stage` one of `'star'`, `'unformed'`, `'accreting'`, `'engulfed'`. No rock or
water field is fabricated for a body that has no surface at `t`.

## Fields of `depthAndPressureAt`

| Field | Unit | Provenance | Meaning |
|---|---|---|---|
| `depthM` | m | model | requested depth below the water surface, clamped to `[0, seabedDepthM]` |
| `pressurePa` | Pa | physical | `surfacePressurePa + fluidDensityKgM3 * gravityMS2 * depthM` (incompressible column) |
| `seabedDepthM` | m | model | water column at this place (0 on land) |
| `clamped` | bool | - | the request lay below the seabed or above the surface |
| `fluidDensityKgM3` | kg/m^3 | physical | 1025 (sea water) on water worlds, 0 on dry bodies |
| `gravityMS2` | m/s^2 | physical (model density) | surface g used for the column |

Checks (tests/place-query.test.mjs): an Earth analogue (R 6371 km, core
fraction 0.32, g 9.78) gives +1.005e5 Pa per 10 m (+-1%) and 1.10e8 Pa (~1085
atm) at 10.9 km, the Challenger Deep depth (+-2%; the measured value is about
1.086e8 Pa, the small excess is water compressibility, ignored here). Pressure
is monotone in depth and answers at every depth to the seabed (Maithea's
deepest sampled seabed, about 13.6 km on the shipped terrain, is tested over
64 steps); below the seabed the depth clamps to it.

## Ocean volume model (ocean-volume-1)

The dated sea level is a VOLUME model (`src/ocean-volume.ts`):

- `stellar-evolution.ts` `waterKeysFor` authors at most 16 keys
  `{dateNs, lossFraction}` from `oceanNs` to `giantNs`. lossFraction is 0 for
  every date up to the catalogue epoch (the catalogue epoch always shows the
  full ocean), then `smoothstep(0, 1, (L(t)/L(epoch) - 1) / 0.35)`, reaching 1
  no later than `giantNs`. L(t) is the star-stage luminosity times a
  main-sequence brightening law, L/L_ZAMS = 1.4/(1.4 - 0.875 x) on the
  fractional main-sequence age x (Gough 1981 form, **from memory**). For the Sun
  this puts full loss about 3 Gyr from now; the moist-greenhouse literature puts
  the ONSET of ocean loss about 1-1.5 Gyr from now (**from memory**).
- `oceanHypsometry(body)` samples ground height over 4096 equal-area Fibonacci
  directions (det-math trig), sorted, cached per (seed, terrain version).
- `levelForLoss(body, f)` solves `V(L) = (1 - f) V(0)`, `V(L) = sum max(0, L - h_i)`,
  by 60-step bisection on `[min h, 0]`: exactly 0 m at f = 0, monotone, volume
  conserved to 1e-6 (measured ~1e-16).
- `world-surface.ts` `datedOceanState` = 25 m snap of `levelForLoss(waterLossAt(keys, t))`.

It replaces the linear 0 -> -8000 m metre ramp, which put Maithea at about
-4500 m (67.8% of its ocean volume already lost) at the catalogue epoch. The
solver reproduces that: 67.8% loss on the shipped terrain gives -4501 m.

## Game layer

Everything below is deliberately NOT in this module and belongs to the game
built on the platform:

- whether a place is survivable (pressure, temperature, air) and for how long;
- damage, crush depth, decompression, diving and flight limits;
- breathability (the platform says `hasAir` and `airClass`, not "breathable");
- what may be built, mined, terraformed or owned;
- difficulty, rewards and any balancing.

A game reads `placeAt` / `depthAndPressureAt` and applies its own rules. If a
game needs a quantity that is physically derivable and not here, it is added
to this module (with a version bump), not computed ad hoc in the game.
