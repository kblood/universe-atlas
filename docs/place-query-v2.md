# place-query-2: coast, altitude pressure and the rung answer

Status: backlog task 16 (PLACE-QUERY-2), branch `platform/place-query-2`. Module
`src/place-query.ts`, version key `PLACE_QUERY_VERSION = 'place-query-2'`. Tests:
`tests/place-query.test.mjs`. Design decisions in this file are Opus-decided on
Kasper's instruction, overrulable.

place-query-2 is **additive** over [place-query-1](place-query-v1.md). The rules
there (nothing is void, derived data not rules, deterministic and streamable,
version-stamped) and the game-layer boundary are unchanged. A guide for game
authors is in [platform-getting-started.md](platform-getting-started.md).

## What changes and what does not

- **Every place-query-1 field keeps its value.** For every direction, date,
  level and option, every field that place-query-1 returned is `Object.is`-equal
  to the place-query-1 answer, with exactly three intended exceptions, all
  version keys:
  - `version` and `versions.placeQuery`: `'place-query-1'` -> `'place-query-2'`;
  - `versions.lodLadder`: `null` -> `LOD_LADDER_VERSION`, imported from
    `src/lod-ladder.ts` (not pinned here; it is `lod-ladder-3` at the time of
    writing and moves with the ladder contract).
  The v1 fields are still computed by the same code path; `level` is still only
  echoed and `resolution` is still `'full'`. Tested against the place-query-1
  source of `main` 7419733 on a fixed corpus (`tests/place-query.test.mjs`).
- The warm-up / residency-transfer functions (`exportPlaceBlocks`,
  `importPlaceBlocks`, `placeBlockTransferables`) are unchanged and stay
  bit-identical: `exportPlaceBlocks(...).result` is exactly `placeAt(...)`,
  including the new fields.
- New: `coastAt`, two air-pressure fields on `placeAt`, the opt-in `rung`
  answer, and the pure helpers `airScaleHeightM` / `airPressureAtHeightPa`.

## API additions

```ts
coastAt(ctx: {sys, body, t}, direction: V3): CoastResult
placeAt(ctx, direction, level?, options?: {upDot?, measureSlope?, rung?: boolean}): PlaceResult
airScaleHeightM(geo: PlanetGeophysics, temperatureK: number): number | null
airPressureAtHeightPa(geo: PlanetGeophysics, temperatureK: number, heightM: number): number
```

### coastAt: which side of the dated shoreline

`coastAt` answers whether a direction is sea or land at date `t`, as the sign of
the ground height above the **dated** global sea level (ocean-volume-1, the
25 m snapped level the renderer draws). It reads the same dated surface sampler
as `placeAt`, so it always agrees with it: `coastAt(...).ocean === placeAt(...).ocean`
and the ground heights are `Object.is`-equal. It skips the biome classifier, the
floor split and the climate, so it is the cheap call for maps and spawn logic.

| Field | Unit | Provenance | Meaning |
|---|---|---|---|
| `version` | - | - | `'place-query-2'` |
| `exists` | bool | model | the body has a surface at `t` (same lifecycle gate as `placeAt`) |
| `stage` | - | model | as `placeAt.stage` |
| `groundHeightM` | m | model | as `placeAt.groundHeightM` |
| `seaLevelM` | m | model | as `placeAt.seaLevelM`; `null` when no global ocean exists at `t` |
| `heightAboveSeaM` | m | model | `groundHeightM - seaLevelM`; `null` when `seaLevelM` is `null` |
| `seaSign` | -1 / +1 | model | `-1` under the dated sea, `+1` on land (and everywhere when there is no sea) |
| `ocean` | bool | model | `seaSign === -1`; equals `placeAt(...).ocean` |
| `versions` | object | - | the same version block as `placeAt` |

The sea test is strict: `ocean` is true exactly when `heightAboveSeaM < 0`
(ground exactly at sea level is land), the rule `terrain.ts` and
`world-surface.ts` already apply. Absent places return
`{version, exists: false, stage, versions}` like `placeAt`.

### Altitude-corrected air pressure

place-query-1's `surfacePressurePa` is the pressure at the 0 m datum, with no
altitude correction. place-query-2 adds the barometric (hypsometric) pressure at
the place, from planet-geophysics-1 data only (read-only use of
`src/planet-geophysics.ts`: `surfacePressurePa`, `surfaceGravityMS2`,
`BOLTZMANN_J_PER_K`, `N2_MOLECULE_KG`) and the catalogue temperature
`body.temperatureK`, the same temperature planet-geophysics reads for air
retention:

```
H    = k_B * T / (m_N2 * g0)                 scale height (m)
P(h) = P0 * exp(-h / H)                      isothermal hypsometric equation
```

- `P0` = `surfacePressurePa` (planet-geophysics-1, at the 0 m datum), `g0` =
  `surfaceGravityMS2`, `T` = `body.temperatureK`, `k_B` = 1.380649e-23 J/K,
  `m_N2` = 4.65e-26 kg (the N2 molecule, the gas the air model retains).
- `h` is the height of the surface the air touches: the ground on land, the
  dated sea surface (`seaLevelM`) on the ocean. On a dry basin below the datum
  `h < 0` and the pressure is above `P0`.
- `exp` is `detExp` from `src/det-math.ts` (+ - * / and floor only), so the
  value is identical on every engine, like every other place field.
- Assumptions (heuristic): isothermal column at the catalogue temperature, a
  pure N2 molecular mass, constant `g0` over the column (g falls by 0.3% over
  10 km on an Earth-size world). For an Earth analogue (T 278 K, g 9.81) H is
  about 8.4 km; at 5.5 km this gives about 0.52 P0 (measured air: 0.50) and at
  8.85 km about 0.35 P0 (measured: 0.33). Only planet-geophysics data is used;
  the local climate temperature is deliberately not mixed in.
- Airless bodies (`surfacePressurePa` 0) answer 0 Pa at every height and a
  `null` scale height. A non-positive temperature has no scale height either
  (`null`); the pressure is then `P0` at or below the datum and 0 above it.

| Field | Unit | Provenance | Meaning |
|---|---|---|---|
| `airPressurePa` | Pa | physical (hypsometric law) on heuristic inputs | `P(h)` at the surface the air touches: ground on land, the dated sea surface on the ocean |
| `airScaleHeightM` | m | physical on heuristic inputs | `H`; `null` when there is no air or no positive temperature |

The ocean column keeps place-query-1's datum convention: `pressureAtSeabedPa`
and `depthAndPressureAt(...).pressurePa` start from `surfacePressurePa` and are
unchanged. A game that wants the altitude-corrected column uses
`airPressurePa + fluidDensityKgM3 * gravityMS2 * depthM` (the inputs are all
returned). The pure helpers expose the same law at any height (for example a
flight altitude): `airPressureAtHeightPa(geo, T, h)` and `airScaleHeightM(geo, T)`.

### The rung answer: what the renderer's sampler says at a tile level

`placeAt(ctx, direction, level, {rung: true})` adds a `rung` block. Without the
option there is no `rung` key and the answer is exactly the place-query-1 shape
plus the two pressure fields. The v1 fields remain the full-detail truth in both
cases (lod-ladder contract section 8: collision and physical queries ignore the
rung).

- `rung.lodLevel`: a numeric `level` is used as the tile level (an integer
  0..30, otherwise `RangeError`). A ladder id `'S0'..'S4'` resolves to the
  **finest** tile level of that rung on this body (`ladderFor(body.radiusM)`
  from `src/lod-ladder.ts`, the declared rung ranges; Maithea S0 -> L4,
  S1 -> L9, S2 -> L14), i.e. the most detailed answer that rung shows.
- The sampler is the renderer's own tile sampler,
  `terrainSampler(body, undefined, undefined, undefined, waterLevelM, undefined, false, {lodLevel})`
  (`src/planet-tiles.ts` `buildTile`), with `waterLevelM` = the dated render
  water level (`datedOceanState(...).renderWaterLevelM`, the value the renderer
  hands its tile workers). Below `carvingFromLevel(R)` it is the baked,
  uncarved band field (an upper envelope of the truth); from the cut the M3
  carving is exact; from `rockDetailFromLevel(R)` the M5 rock is on, and the
  answer equals the truth.
- **The drawn surface is not the sample at an arbitrary direction.** A tile
  stores this sampler at its 33 x 33 lattice points and the GPU draws flat
  triangles between them, so a point between lattice points is drawn at the
  linear interpolation of the three surrounding lattice heights (plus the morph
  toward the parent while a tile fades in). At coarse levels (up to
  `peakCorrectionMaxLevel(R)`, the last S1 level) each stored lattice height also
  carries the bounded non-negative peak correction (lod-ladder contract
  section 3). `rung` returns the sampler at the given direction: it equals the
  drawn height exactly at a lattice point of a level above the peak-correction
  levels (relief 1, while inland rivers are withdrawn and no river-bed envelope
  is applied), and is otherwise the field the drawn triangle interpolates.

| Field | Unit | Provenance | Meaning |
|---|---|---|---|
| `rung` | object | model | present only with `options.rung: true` |
| `rung.lodLevel` | - | - | tile level the answer is for |
| `rung.ladder` | - | - | `'S0'..'S4'`, the rung that serves `lodLevel` (`ladderIdForLevel`) |
| `rung.groundHeightM` | m | model | the renderer sampler's `groundHeightM` at `lodLevel` |
| `rung.ocean` | bool | model | the renderer sampler's ocean flag at the dated render water level |

## Versioning

`PLACE_QUERY_VERSION` moves to `place-query-2` because the answer gains fields
and `versions.lodLadder` changes (place-query rule 4: a consumer that stores or
hashes place data must store the version block with it). `MODEL_MANIFEST_ID`
(`src/time-nav.ts`) folds `PLACE_QUERY_VERSION` in, so bookmarks made before
this version show the one-time "predates the current combined model" notice.
No other version key moves: terrain, surface, ocean-volume, geophysics, biome,
climate and the ladder are read, never changed.

Golden: only the `placeQuery` section of `tests/golden/golden.json` moves (its
version line and the new fields in each record); the coordinator re-pins it in
the post-round four-engine run.

## Decisions (Opus-decided on Kasper's instruction, overrulable)

1. The rung is an opt-in option on `placeAt`, not a change of what `level`
   means: `level` stays an echo, so every v1 field and the level-echo test hold.
2. A ladder id maps to the finest tile level of its rung (not the coarsest):
   the strategy-map use wants the most detailed surface that rung shows.
3. Pressure uses planet-geophysics data and the catalogue temperature only
   (isothermal), not the local climate temperature, so pressure stays a
   function of the body and the height and does not move with
   `CLIMATE_VERSION`.
4. The ocean column (`pressureAtSeabedPa`, `depthAndPressureAt`) keeps the
   datum convention; changing it would change a v1 value.
5. `coastAt` takes no level: it is the truth. The rung coast is `rung.ocean`.
