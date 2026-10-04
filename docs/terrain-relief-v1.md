# terrain-1.8.0-relief (R-CAL-1)

Relief round 2026-10-03, package P4-RELIEF. Modules: `src/terrain.ts`, `src/planet-landforms.ts`,
`src/surface-biomes.ts`, `src/surface-climate.ts`. New test: `tests/terrain-relief-hypsometry.test.mjs`.
Evidence: `test-results/relief-round-2026-10-03/P4-RELIEF/` (main checkout; not committed).

## 1. What changed and why

On the shipped field (terrain-1.7.0), water-world land had a median height of 6.5 km on Maithea. Only 2.9% of
the land was below 500 m, 68.5% was snow, and the sea floor averaged 4.8 km deep. The land was a high snowy
plateau. This package reshapes the height field so that water worlds have:

- Earth-like hypsometry: low coasts, broad lowland, uplands and ranges, and snow only where it is high or cold.
- An Earth-like seabed: shelf, slope, abyssal plain, trenches, and seabed detail at every depth.
- Relief scaled per planet by `tectonicRelief` (tau) from `planet-geophysics-1`.

The geography stays the same: the coastline at sea level 0 is unchanged (0 flips), and so are every continent,
the ridge seeds and the landform seeds.

`baseTerrainSampler` is unchanged bit for bit. `BASE_ELEVATION_SHA256 = 322f0eb2…fb5f7` is pinned forever. It
is the archived drainage/river field. Rivers stay withdrawn. **A future river revival must rebuild drainage on
the relief field (`terrainSampler`) and bump `DRAINAGE_VERSION`**. Drainage built on `baseTerrainSampler` no
longer matches the visible ground.

## 2. Model

`baseTerrainCore` has a relief mode, used by `terrainSampler` for every non-star, non-gas-giant body. Every
term feeds a height or the ocean flag, so it uses only `+ - * /` and an arithmetic smoothstep `ss(lo,hi,v)`:
no `**`, no transcendentals. Notation:

- `a0 = (coast - sea) * 47000`, the raw continental metres.
- `sc = min(1, R/2e6)`.
- `tau = planetGeophysics(body).tectonicRelief`.

**Water-world land (`a0 >= 0`).**
```
comp = a0 / (1 + a0/HC)
fineT = max(fine * landFactor, -comp/2)
F = comp + tau (HUP ss(B1,B2,a0) + HHI ss(B3,B4,a0)) + tau KB 2800 ridges ss(BT0,BT1,ridges) landFactor + fineT
floorM = clamp(F, -16000, 18000) sc
h = floorM + tau D (WLOW + (1-WLOW) ss(HM0,HM1,floorM))
```
- `D` is the shipped hills, gullies and rocks detail (>= 0).
- The landform layer is scaled by `tau * ss(HM0,HM1,floorM)`.
- Every term is >= 0 except `fineT`, which is bounded below by `-comp/2`. So `F >= 0` wherever `a0 >= 0`, and
  the coastline at sea level 0 is invariant by construction.

**Seabed (`a0 < 0`, `m0 = -a0`).**
```
F = -(m0/(1+m0/HS) + HAB ss(A1,A2,m0) + HTR ss(A3,A4,m0))
floorM = clamp(F) sc + S
```
`S` is the seabed detail:

- Amplitude: 40 m on the shelf, rising to 250 m over the first 1500 m of depth.
- Shape: `(hb^2 - 0.35)*2 + (gully - 0.5)*1.4`, with 4 km ridged hills on channel 75 and 900 m gullies on
  channel 76.
- It is clamped so that `|S| <= depth/2`, so the seabed never reaches sea level.
- The seabed has no window: its detail is part of the floor.

**Dry worlds.** `floorM = shipped floor * KD`, where `KD = clamp(0.3 tau, 0.2, 0.8)`. Then `h = floorM + tau D`.

**Exports.**
- `terrainWindowMaxM(body) = tau * terrainUnitWindowMaxM(body)`.
- `bodyHeightBoundM(body)` gives `{minM,maxM}` analytically from the constants.
- `reliefTextureRange(body)` is the range the orbit relief texture is now encoded over: Maithea
  -11580..6628 m, a step of 71 m (it was 235 m over 60000 m).
- `ELEVATION_RANGE_M` remains as a deprecated alias until P5 switches the `main.ts` decode to
  `planetSurface().reliefMinM/reliefMaxM`.

**Other modules.**
- `planet-landforms.ts`: `LANDFORM_SHAPE_VERSION 'planet-landforms-shape-2'`. The seed stays
  `planet-landforms-1`. The land gate reads the raw base height, and the ceiling is
  `bodyHeightBoundM(body).maxM - base`.
- `surface-biomes.ts`: all gates are relative to the current sea level.
  - Sand: `1-(h-sea)/160`.
  - Coastal sand: `h-sea < 120`.
  - Forest: `h-sea > 160`.
  - Climate datum: `climateDatumM(sea)`. This is the shoreline, or 0 m when the sea is gone (`sea <= -16000`;
    the renderer passes -1e6). Without it, a dried-out world would sample its climate 1000 km up.
- `terrain.ts waterWorldLandColour`: uses the same datum, so the tile colour and the classifier agree.
- `surface-climate.ts`: the lapse-rate gravity comes from `planetGeophysics(body).surfaceGravityMS2`, with
  provenance `'geophysics'` (owner decision 3). `CLIMATE_CALIBRATION` and its sha are unchanged.

## 3. Constants (`RELIEF_CALIBRATION`, frozen)

```
name 'R-CAL-1'
HC 220  HUP 500  B1 4000  B2 11000  HHI 1000  B3 10000  B4 16000
KB 1.3  BT0 0.35  BT1 0.8
HM0 250  HM1 2500  WLOW 0.25
HS 180  HAB 3900  A1 500  A2 3200  HTR 7000  A3 8500  A4 15000
SEABED_DETAIL_SHELF_M 40  SEABED_DETAIL_DEEP_M 250  SEABED_DETAIL_RAMP_M 1500
SEABED_HILL_WAVELENGTH_M 4000  SEABED_GULLY_WAVELENGTH_M 900
KD_PER_TAU 0.3  KD_MIN 0.2  KD_MAX 0.8
```
sha256(JSON.stringify) = `ec15e0e409caa3a0c94291789982f067f6f4257e437b90ac4f11231fd28e1ea3`. This value is
pinned in `terrain-relief-hypsometry.test.mjs`. Changing any constant requires a TERRAIN_VERSION bump.

## 4. Measured results (Node, 20000 Fibonacci directions per world unless noted)

### Maithea land hypsometry (tau 0.789, geophysics g 6.82)

| | p10 | p50 | p90 | p99 | max | > 4 km | < 500 m |
|---|---|---|---|---|---|---|---|
| shipped terrain-1.7.0 | 1919 | 6514 | 12393 | 16649 | 19500 | 71.8% | 2.9% |
| **terrain-1.8.0-relief** | **206** | **426** | **2690** | **4358** | **5910** | **2.2%** | **55.7%** |
| acceptance | 150-300 | 350-650 | 1.8-3.3 km | 3.5-6 km | <= 7.94 km | 1-6% | >= 45% |

Earth, for reference (rounded textbook values, not measured here): mean land height about 840 m, maximum
8.85 km, and about 1-2% of land above 4 km (Tibet and the Andes). Maithea's mean land height is 888 m
(20000 directions), with a median of 426 m.

### Snow and coast (the shipped classifier: 'Alpine / polar snow' = snowFraction > 0.6)

| World (T, g, tau) | snow before | snow after | other measures (after) |
|---|---|---|---|
| Maithea (284 K, 6.82, 0.79) | 68.5% | **19.6%** | 28.7% of land above 3 km at \|lat\| < 60 is snow; 3.3% of land below 1.5 km; Coastal sand 1.4% (before 0.5%); lowland (Temperate ground or Dry upland below 500 m) 39.2% (before 1.6%); forestPotential 38.0% (before 7.6%) |
| Lethuris (275 K, 17.66, 0.77) | 90.2% | 20.4% | 100% of land above 3 km is snow; 8.2% of land below 1.5 km |
| Selawyn (320 K, 18.56, 0.60) | 37.8% | 0.0% | hot world; land max 4.4 km |
| Raiva (300 K, 2.55, 0.46) | 0.0% | 0.0% | |

Owner decision 1 accepts Maithea snow in the 15-40% band.

**Corpus of 132 habitable water planets.**

- Snow share: median 10.7%, with 16 planets above 90%. Shipped: 70% and 45.
- Medians by anchor-temperature bin, cold to warm: 88 / 46 / 16 / 8 / 0%. These are monotone.

### Seabed (owner decisions 2 and 5)

| World | mean depth | deepest 0.1% | shelf (> -200 m) | points >= 0 m |
|---|---|---|---|---|
| Maithea | 3305 m (shipped 4775) | -9914 m | 9.5% | 0 |
| Selawyn | 3793 m (shipped 5578) | -11209 m | 7.5% | 0 |
| Raiva | 3687 m (shipped 5353) | -11249 m | 8.4% | 0 |
| Lethuris | 4011 m (shipped 5928) | -11248 m | 5.7% | 0 |

- Earth reference: mean depth 3.7 km; Challenger Deep 10.9 km.
- Seabed detail standard deviation (seabed minus smooth floor, 16384 directions) by depth band
  0-200 / 200-2000 / 2000-6000 / > 6000 m: about 24 / 107-113 / 148-152 / 148-160 m on the four worlds. The
  required minimum is 20 m in every band.

**Owner decision 5 (2026-10-03).**

- The seabed always exists. It is solid and collidable at its true depth, up to 16 km, and comes from this
  same deterministic function.
- Seabed detail is driven by distance to the seabed, not by water thickness: `SEABED_DETAIL_POLICY
  seabed-by-distance-1` in `lod-ladder.ts`.
- From the surface, the view is sea, air and sea life, and the seabed is far terrain.
- A diver who approaches the bottom gets full detail.
- Collision, physics and place queries always sample full detail.
- There is no depth cut-off in the terrain function.

**Pressure link (place-query-1).** `placeAt` reports `seabedHeightM = groundHeightM` and
`waterDepthM = sea - ground`. `pressureAtSeabedPa = P_surface + rho_fluid g_geo depth` (planet-geophysics),
and `depthAndPressureAt` answers at any depth down to this seabed. On Maithea (g 6.82, P_surface 70.5 kPa):

- At the mean depth of 3305 m: 23.2 MPa.
- At the deepest 0.1%, 9914 m: 69.4 MPa.

Because the seabed is shallower than shipped, every seabed pressure is lower than on the terrain-1.7 field.

**Ocean volume (P2 `ocean-volume-1`).** The dated sea levels for 5/25/50/90% volume loss on the new Maithea
seabed are -172/-946/-1992/-3863 m, against the planned -171/-945/-1989/-3837 m. 67.8% loss gives -2782 m.

### Dry worlds (60 bodies, 10 per type)

- p1..p99 span: p10/p50/p90 of 5.1 / 6.3 / 10.7 km. Shipped: 23.5 / 24.8 / 26.8 km, identical for every g.
- Spearman correlation of span with tau: 0.967.
- Earth-g, low-vigour bodies span 5.2-6.5 km.
- No scanned body has tau >= 2. The maximum is 1.96 among 859,781 scanned, and that body spans 15.3 km. So
  the planned check "tau >= 2 spans >= 14 km" has no subject; the closest body passes it.

### Invariants

- **Coastline:** 0 ocean-flag flips against `baseTerrainSampler` at sea level 0 (6 bodies x 20000 directions).
- **Window:** `0 <= h - floorM <= terrainWindowMaxM(body)` with 0 violations.
- **Height bound:** `bodyHeightBoundM` contains every sample (60 bodies x 20000 directions).

## 5. Versions and digests (old -> new)

| What | old | new |
|---|---|---|
| TERRAIN_VERSION | terrain-1.7.0-climate-colour | terrain-1.8.0-relief |
| BIOME_VERSION | surface-biomes-2-climate | surface-biomes-2.1-sea-datum |
| SURVEY_VERSION | surface-survey-2 | surface-survey-2.1-relief |
| CLIMATE_VERSION | surface-climate-1 | surface-climate-1.1-geo-g |
| LANDFORM_SHAPE_VERSION | (none) | planet-landforms-shape-2 (LANDFORM_VERSION seed unchanged: planet-landforms-1) |
| BASE_ELEVATION_SHA256 | 322f0eb2bcf8414b74da6fe63fcfb3017c5496e69187c9134f3049d0ca7fb5f7 | unchanged |
| ELEVATION_IDENTITY (relief) | 4f6021aafa19091ee059b94a6119867d953881d17fe624da758f1764bd7e89f8 | 27036fc2a5924d3c54f5dec62b92e5be78c69ebe035b85767801d7f15e4e179e |
| KEPT_PALETTE | 06d335ce6a1fbf309a65f5b195098a8a0e1324979de27fdb448b173f73ff84ac | 5cf3db02c9f62fc79d85ac46c028353a97e3acdc76c6f3a748601f4d928f3bba |
| classifier golden (surface-biomes-climate) | 0d2c1c03ae63407ce5295a1b55f485df92ae4ed1a8909285eb3242b766ec809e | 66f515e63093c8d87ee5d36b2859e3ab66031f9757a2a6432d2fea18fe8ada41 |
| golden.json terrain | b992f75557f735e9b457b84eaa8f6cf18dfef16c093823c55d4cfac12606580c | b3818c33be40ca9947dc68e26d19ef0f6fbd4fde4e6b22c2eedeb511879578e2 |
| golden.json combined | 7642ed533cea1d8cc640d60a59f820a39c4f99f978de20efd9f763ca09071a12 | ec37f25ccbedbdf16cbd18c4bae9dc33c24cab6e8fed1163d39d6ee5369fed92 |
| RELIEF_CALIBRATION sha | (new) | ec15e0e409caa3a0c94291789982f067f6f4257e437b90ac4f11231fd28e1ea3 |

- KEPT_PALETTE: only the water-world ocean colours change, because ocean colour follows depth. All 10 non-water
  bodies show 0 diff.
- golden.json is owned by the coordinator, who re-pins it.
- golden galaxies, sectors, systems, history and hierarchy are unchanged.
- The perturbation, life-cpu-digest, planet-forest-frame-digest and terrain-leaf-loop-digest tests pass.

## 6. Deviations from the plan, and why

1. **Fine-term guard (`fineT >= -comp/2`).** Near the coast the guard never binds: there
   `landFactor = clamp(a0 x 12/47000)`, so `fine x landFactor >= -237.5 x 12/47000 x a0 = -0.06 a0`, well above
   `-comp/2` while `comp ~ a0`. It binds in the INTERIOR, where `comp` saturates towards `HC = 220 m` (so
   `-comp/2 -> -110 m`) and the fine noise reaches -237.5 m. Without it, `F` there can fall below 0 and open
   interior lakes at sea level 0 (the plan's `F >= 0` on land would no longer hold). Measured on Maithea
   (40000 directions): the guard binds on 4.6% of land core samples, never where `a0 < 1943 m`; it clips the
   negative fine noise by 20 m at the median and 100 m at most, so those patches get flat-bottomed floor
   depressions at about `comp/2` below the compressed coordinate, under the detail window. It is the guard that
   keeps the interior dry at sea 0; the coast itself is safe without it.
2. **Climate datum guard (`climateDatumM`).** With "no sea", the renderer passes -1e6. Without the guard, the
   climate would be sampled about 1000 km up.
3. **Seabed detail shape weights (2.0 / 1.4) and the two-octave form.** A third 200 m octave cost +9-14% in the
   sampler (budget +8%) for about 1% of the variance, so it was dropped. Consequence: the seabed's finest
   wavelength is about 900 m, so at contact/collision scale the seabed is smooth below 900 m (no gullies or
   rocks). Owner decision 5 is still honoured (no depth cut-off; the same function everywhere). A cheap
   metre-scale seabed octave is a follow-up; it must live in the deterministic terrain function (seed +
   position), never in a camera-gated term.
4. **HTR raised to 7000 m.** This puts the deepest 0.1% in the -9.5..-11.5 km band.
5. **terrain-climate-colour fell zone.** The relief summits (Maithea max 5.9 km) no longer reach the snow-free
   cold band that the fell colour paints: there were 0 terrain samples at 60k, 240k and 600k directions. The test
   now also samples climate columns over land, from 800 m up to `bodyHeightBoundM.maxM`, which gives 266 samples.
   The thresholds are unchanged.
6. **Output-identical speed-ups that pay for the seabed noise:**
   - an explicit 3-channel `mix` that clamps once;
   - a channel-explicit grain map;
   - direct channel writes in the `planetSurface` loop.

   The output is byte-identical on `planetSurface` and on the sampler/base fields over 8 bodies.

7. **`src/surface-climate.ts` beyond "gravity source, version, import rule".** Two edits follow necessarily from
   the gravity-source change, because the geophysics g depends on `body.kind`: the forcing-cache key gains
   `body.kind`, and the `ClimateProvenance.surfaceGravityMS2` union gains `'geophysics'`. The calibration JSON
   (and its sha) is unchanged.
8. **Lapse range under geophysics g.** Over the 7622 rocky planets of the first 2000 G001 systems the lapse
   gravity moves from catalogue g 2.68..12.08 m/s^2 (lapse 1.78..8.00 K/km, never clamped, monotone in radius)
   to geophysics g 2.103..21.33 m/s^2 (lapse 1.393 K/km .. the 9.8 K/km dry-adiabat clamp, reached by 1001
   planets = 13.1%; no longer monotone in radius). Maithea: 4.6188 -> 4.5214 K/km.
9. **Forest census water validity (r2).** The sea datum (D) makes every land sample depend continuously on the
   water level (climate, coast/forest gates, land colour), but the forest census and canopy reused a completed
   patch anywhere inside its ocean-step interval. That returned stale trees after a sea-level change
   (path-dependent output). `terrainSampler`'s validity observer now also reports, for land samples, the pin
   pair `(previousDouble(w), w)`, so a patch with land is valid at exactly its own water level; all-ocean
   patches keep their step interval. Observer-only: no sample value changes. The cost: a sea-level change now
   re-runs the census of land patches instead of reusing them; a quantised climate datum could restore reuse
   later (its own version bump).

## 7. Performance (Node, interleaved A/B in one process, Maithea; 3 final runs on a shared machine)

| Metric | budget | run final | run final-2 | run final-3 |
|---|---|---|---|---|
| terrainSampler (200k) | <= +8% | paired median -5.2%, min-vs-min +5.3% | paired median +2.2%, min-vs-min +8.1% | paired median -23.0%, min-vs-min -4.4% |
| biomeClassifier (200k) | <= +5% | paired median +5.8%, min-vs-min +2.4% | paired median +10.0%, min-vs-min -0.2% | paired median -6.7%, min-vs-min -4.5% |
| orbit bake 1024x192 | <= +5% | -7.2% | -11.2% | -10.4% |
| buildTile per level | <= +5% | | L4 -3.9%, L6 -6.5% | L4..L18 -2.7% to -5.9% |

The machine was shared with other agents, and raw rounds vary by up to 40%. See
`bench-ab-final*.txt` for the raw rounds.

## 8. LOD consistency (P3 harness, 12 stratified edge tiles: BEFORE = 2c47cc9, AFTER = this package)

| pair | height p99/max (m) | rgbP99 | snow % | forest % | name % | carried % |
|---|---|---|---|---|---|---|
| Maithea L6->7 | 671/1239 -> 381/685 | 37.1 -> 26.3 | 1.63 -> 1.25 | 4.23 -> 0.42 | 6.15 -> 3.16 | 7.60 -> 3.49 |
| Maithea L8->9 | 164/358 -> 92/198 | 5.7 -> 3.6 | 0.82 -> 0.31 | 1.62 -> 0.01 | 3.52 -> 0.76 | 3.78 -> 1.17 |
| Maithea L10->11 | 38/94 -> 19/63 | 0.71 -> 0.47 | 0.35 -> 0.24 | 0.83 -> 0.15 | 0.24 -> 0.00 | 0.90 -> 0.19 |
| Lethuris L6->7 | 862/1325 -> 486/1017 | 56.6 -> 39.2 | 5.01 -> 2.12 | 4.97 -> 1.76 | **6.87 -> 6.99** | 8.88 -> 8.15 |
| Lethuris L8->9 | 231/475 -> 143/273 | 14.3 -> 11.1 | 1.41 -> 0.96 | 2.84 -> 2.17 | 3.71 -> 1.85 | 4.13 -> 1.65 |
| Lethuris L10->11 | 91/125 -> 71/108 | 1.79 -> 0.92 | 0.41 -> 0.15 | 1.01 -> 0.64 | 2.61 -> 0.43 | 2.67 -> 0.25 |

- Every height tolerance is met, and the ocean flag has 0 disagreement on shared vertices.
- Every metric improves except Lethuris L6 biome-name disagreement (the re-classified proxy), which goes from
  6.87% to 6.99%, above the shipped ceiling of 6.9. The carried name on the same tiles improves 8.88 -> 8.15%.
- **`tolerances_after_relief` is NOT met**: the strict class (0.5%) and colour (12 / 4 RGB) tolerances are still
  exceeded at L6 and L8, as on shipped terrain.
- `SHIPPED_CEILINGS` re-pinned in r2 (old and new in the test) as a documented LOD exception, not the plan
  tolerance:
  - Maithea: L6 `{rgbP99 26.3, snow 1.3, name 3.2, carriedName 3.5}`; L8 `{name 0.8, carriedName 1.2}`; L10 none
    (Maithea L10 now meets the plan tolerance in every row).
  - Lethuris: L6 `{rgbP99 39.2, snow 2.2, forest 1.8, name 7.0, carriedName 8.2}`; L8 `{rgbP99 11.1, snow 1.0,
    forest 2.2, name 1.9, carriedName 1.7}`; L10 `{forest 0.7}`.
  - Every cell tightens or is dropped except Lethuris L6 `name` 6.9 -> 7.0, the one loosened cell, which is
    **pending owner acceptance**.
  - The OLD map (shipped terrain-1.7.0 + P3, 2026-10-03), copied from `tests/lod-consistency.test.mjs`:
    - Maithea: L6 `{rgbP99 37.2, snow 1.7, forest 4.3, name 6.2, carriedName 7.6}`; L8 `{rgbP99 5.8, snow 0.9,
      forest 1.7, name 3.6, carriedName 3.8}`; L10 `{forest 0.9, carriedName 1.0}`.
    - Lethuris: L6 `{rgbP99 56.7, snow 5.1, forest 5.0, name 6.9, carriedName 8.9}`; L8 `{rgbP99 14.3, snow 1.5,
      forest 2.9, name 3.8, carriedName 4.2}`; L10 `{rgbP99 1.8, forest 1.1, name 2.7, carriedName 2.7}`.

## 9. Known visual issue (not fixed here)

The ridge belt term reuses the shipped isotropic ridged noise `n(d,30,7)`. Seen from orbit, its crest network
reads as a maze, not as linear mountain belts. On cold, high-g worlds such as Lethuris, the geophysics lapse puts
every crest above the snowline, so a white maze covers the continent. Both independent Luna runs also see it on
Maithea, along the limb ("a dense, branching worm-like network ... more like an unnatural pattern than elongated
mountain ranges"), so it is not limited to cold, high-g worlds. This pattern was also present on
terrain-1.7, but hidden under a near-total snow sheet. A visual reviewer (GPT Luna) named it as the clearest
remaining artefact. The suggested follow-up is R-CAL-2: gate `ridges` with a low-frequency orogen/belt mask so that
crests form ranges. That changes every relief digest, so it is a separate version bump.

A second defect Luna named on Maithea AFTER (not fixed here): "The large tan areas look like smooth patches with
abrupt, irregular edges ... more like blobs than natural deserts or dry uplands". The likely source is the
low-frequency moisture field reaching the 'Dry upland' colour (effectiveMoisture < 0.43), which the snow sheet
used to hide. Follow-up with R-CAL-2 or the climate colour (its own version bump).

## 10. Visual review

Captures are under `test-results/relief-round-2026-10-03/P4-RELIEF/views/`. The script
`capture-p4-views.browser.mjs` runs with its own vite preview under the GPU lock.

- **Poses.** Pose directions come from the AFTER terrain, and the eye heights come from each tree's own sampler.
  Summits are picked on the day side, from the page's sun direction.
- **Cloud layer hidden.** The `*-noclouds-*` frames hide the cloud layer for that frame only, using the debug
  `setSystemVisible('clouds', false)`. Without that, cloud and snow cannot be told apart from orbit.
- **Labelled pairs.** The labelled BEFORE|AFTER pairs and the reviewer's verbatim verdicts are in `luna/`
  (`verdict-1..5-*.txt`).
- **Orbit relief bump.** In the orbit views, the bump is exaggerated about 3.4x until P5 decodes
  `reliefMinM/reliefMaxM`. Merge P5 right after P4 and re-judge the orbit views once P5 is in.
- **Round 2 recapture** (`r2/views`, `r2/luna`, build 61c4135, same poses). Orbit frames match round 1 within
  RMSE 0.008% (heights unchanged by r2); ground frames differ by streaming state (tree population at capture
  time), not terrain. Luna's verdicts are unchanged in substance: "AFTER partly meets the target" for both the
  Maithea set and the other worlds. It names the Lethuris orbit maze ("an intricate branching white network"),
  flattened AFTER horizons on Maithea, Raiva and Selawyn, and less visible snow on the Maithea high range.
  Round 3 (section 13) investigates the last two: neither is fixed, both are explicit deferrals for the owner.

## 11. Height bound and craters

`bodyHeightBoundM` is crater-free. Craters (`includeCraters` / `applyCraters`) add a bowl of up to `depthM` and a
rim of 0.18 x depthM on dry/airless land and are not in the bound. No runtime path enables craters today (tiles,
renderer, orbit worker, contact all use the default false). A caller that enables them, e.g. render bounds or
culling in P5, must widen the bound by the crater depth and rim.

## 12. Round 2 (reviewer blockers): tests re-based on the relief field

Every change records old and new values in the test itself. No threshold was loosened except the one LOD cell
in section 8, which is flagged for owner acceptance.

| Test | Why it broke | Fix |
|---|---|---|
| surface-climate 'per-planet lapse' | pinned catalogue g, which (E) replaced | asserts geophysics g and provenance 'geophysics'; range and order from geophysics g; Maithea band 4.4-4.6 K/km (excludes the old 4.6188) |
| terrain-floor-window :63-68 | descriptive asserts assumed the unit window | tau-aware (bound = tau x unit; same 1500/2680 fraction) |
| river-terrain :47 | compared against base + landforms | archived base ignores hydrology; relief sampler with hydrology equals plain outside influence |
| river-terrain trench | 10 km synthetic body (tau 0.0051) sits at ~2 m, under the 15 m water | shore fixture lowers every water level by 100 m; assertions unchanged |
| planet-rocks rebasing | the 30% overlap threshold sits at the LOD-range geometry (main passed by 3 rocks) | target re-picked from 8 measured on both terrains (largest margin): `[.6,-.3,.74]` (overlap .303 -> .297) -> `[-.5,.2,.84]` (.337 -> .340); `tests/planet-rocks.test.mjs:99` |
| forest-habitat v1->v2 | the first 24 v1-or-v2 directions had no v2 forest | selection on v2 forestPotential |
| forest-water-validity x3 | a real cache-validity bug (section 6 item 9) plus a fixture under the new water | observer pin; fixture found by a deterministic search: face 4 (25214, 46241) -> face 5 (23790, 56593), fib i 17234 of 65536, lat 28.30 deg, ground 2301 m, 26 eligible / 4 rejected / 22 present; tests assert the pinned semantics (`tests/forest-water-validity.test.mjs:15`) |
| version-compat biome-climate | version pins | re-pinned, old values in the messages |
| lod-consistency Lethuris | ceiling 6.9 vs 6.99 | section 8 |


## 13. Round 3: weak range snow and flattened horizons (open, for the owner)

Owner decision 1 accepts the Maithea snow band only "as long as ranges have snow". Three independent Luna runs
read the round-2 AFTER `range` frame as weak snow ("Range has snow: weak"). Round 3 looked for the cause. Neither
defect is fixed in this package. Both are deferred explicitly below, and the owner should decide before merge.
Evidence is under `test-results/relief-round-2026-10-03/P4-RELIEF/r3/`: the capture script
`capture-p4-r3.browser.mjs`, `views/`, `views-snowexp/`, `luna/`, and `slope-snow.txt`.

**The data says the range is snow.**
- The r2 range pick: 3989 m, latitude 49 deg, classified 'Alpine / polar snow', snowFraction 1.000.
- Its tile colour is (213,224,222), 98.7% of the SNOW constant (216,228,226).
- In a 4 km disc around it, 100% of land has snowFraction > 0.8. In a 10 km disc, 90.7% does, with mean tile
  colour (209,221,218).
- Over land above 3 km at latitude 40-60 deg, 87.6% is snow, and 95.9% above 3.5 km (the reviewer's probe, re-run in round 3).
- The terrain colour and the classifier therefore agree. Nothing in the P4 colour path turns this range grey.

**What the render does with it** (pixel means of a 300x60 terrain crop at the same screen spot):

| Frame | Mean RGB |
|---|---|
| r1 BEFORE `range` | (138,150,152) |
| r2 AFTER `range` | (142,154,157) |
| r3 AFTER `rangeLit` | (202,205,201) |
| r3 BEFORE `rangeLit` | (205,207,201) |
| sky behind the r3 frames | about (173,192,212) |

BEFORE and AFTER render this snow identically, within 4 levels. P4 did not darken it. Three causes stack up:
1. **Pose (P4's capture, now corrected).** The r2 `range` pose looked 31 deg off the sun azimuth under a 27 deg
   sun. It therefore saw the shaded lee faces at 140-160. The r3 `rangeLit` pose is on the sun side of the same
   range: the highest point within 10 km is 5253 m, the eye is 14 km away with the sun behind it, and it renders
   at about 202.
2. **Presentation (renderer, not P4-owned).** ACES filmic tone mapping at exposure 1.2, plus haze, puts sunlit
   snow at about 200-213. That is barely brighter than the horizon sky, so the snow reads pale grey.
   - Inside 1.5-6 km, the ground-detail shader (`src/ground-material.ts`) applies the soil multiplier
     `mix(.72,.69,.61 .. 1.05,1.01,.88)` and the `x(.82 + signal*.32)` factor to snow too. Snow gets only a
     `(.96,.98,1.02)` cool tint, which leaves a beige cast in the foreground.
   - Ground-material, tone mapping and exposure are owned by no package in this round.
3. **No snow/rock contrast (terrain colour, deferred).** Snow follows the climate's snowFraction and ignores
   slope. In a 12 km disc around the 5253 m top, every slope bin is 100% snow. The steepest sample is 40.1 deg at
   a 200 m baseline, and only 119 of 3000 samples are steeper than 30 deg. The high ground is a broad glaciated
   plateau, with no exposed rock ribs that would make it read as a snow-capped range. That is physically
   plausible: on Earth, a 4-5 km plateau at 49 deg would also be ice-covered.

**Experiment (not committed).** A scratch build raised SNOW to (242,247,250), close to fresh-snow albedo, and
nothing else (`r3/dist-snowexp`, `views-snowexp/`). The source was restored immediately afterwards. The sunlit
crop rose only from 202 to 213, because ACES compresses it. Luna (`luna/verdict-r3-2.txt`, exit 0): "Brighter
albedo helps: slightly", with every frame still "partly". In its words: "the broad slopes are pale gray with a
slight beige cast, and their soft, low-contrast shading makes them look smooth and dusty rather than distinctly
snowy. I can't clearly see rock outcrops". The albedo constant is therefore not the lever, and this package
keeps SNOW unchanged, with no output change in round 3.

**Re-judge with sun-aware poses** (`luna/verdict-r3-1.txt`, exit 0). Images: r2 AFTER `range`, r3 AFTER
`rangeLit`, and r3 AFTER/BEFORE `horizonRange`. The last pose looks from snow-free lowland at 450 m, 45 km from a
4174 m snow-classified range, with the sun behind the camera. Luna's verdict:
- "Range snow (Image 2): partly", for the sunlit range;
- "Distant range (Image 3): weak";
- "Lowland (Image 3): snow-free";
- "Horizon (Image 3): plausible";
- AFTER is better than BEFORE for "ranges have snow, lowland/valleys do not", because in BEFORE "the lowland
  does not read as snow-free".

Luna is not self-consistent on the r2 frame. It gave "under roughly 5% white" in the reviewer's run and
"20-30% ... snow in shadow" in this run.

**The r2 'flattened horizon' is an arbitrary plateau, not a picked range.** The r2 `horizon` pose targets the
first sun-lit stratified range direction. That point is 4623 m at latitude -9.5 deg, classified 'Dry upland'.
- Heights: a median of 3775 m in a 15 km disc and 3449 m in a 45 km disc, with a range of 413-4980 m.
- Snow: 0.0% in both discs, which is correct for the tropical snowline.
- The eye sits 2.5 km above about 3.5 km of ground, so it looks across and down a high dry plateau. A "pale,
  fairly uniform plain" is what that terrain is. A picked snowy range from lowland (`horizonRange`) reads
  "plausible".

**A renderer observation, for P5 or the coordinator.** The r3 `rangeHighSun` pose shows a featureless smooth
surface with the sea beyond, at 46/53 draws, in BOTH BEFORE and AFTER. Its site is a 4387 m snow peak at latitude
-41 deg with a 60 deg sun. The data line from the eye to the peak runs from meadow at 3681 m to snow at 4387 m, so
the frame does not show the terrain the sampler describes. That frame is excluded from judgement. The same pose in
both trees means the cause is not P4.

**Deferred, for the owner** (decision 1's condition is not met visually):
- D1, range snow reads weak. The cause is presentation (tone mapping, exposure, and the ground-detail soil
  multiplier on snow), plus slope-blind snow colour. Proposed follow-ups, each with its own version bump:
  - a snow branch in `ground-material.ts` that skips the soil multiplier where `groundW.w` dominates;
  - a slope or exposure term in the terrain snow colour, which would also need a matching classifier rule so
    that colour and classification keep agreeing;
  - a tone-mapping or exposure review of sunlit snow against the sky.
  The data meets decision 1: the ranges are snow-classified, lowland is snow-free, and beaches exist.
- D2, horizons flattened. The r2 frame is a tropical dry plateau, explained by the data above. A picked snowy
  range from lowland reads "plausible" to Luna. Raiva, Selawyn and Lethuris horizon poses use the same arbitrary
  first-range rule and were not re-posed in round 3.

Round 3 test runs, at head dab16ac, with no source change in round 3 (log `r3/npm-test-head-dab16ac.log`):
- `npm test`: 1221 tests, 1211 pass, 5 fail. Four are the same failures main has.
- The fifth is `fauna-coat-fields` 'performance sanity': it measured a median of 8.06 us under suite load,
  against its 2 us check. It passes in isolation (20/20). No fauna file differs from main.
- `tsc --noEmit` exits 0.
- life-cpu-digest, planet-forest-frame-digest, terrain-relief-hypsometry and terrain-elevation-identity: 14/14.

## 14. Open items for the owner at integration (finish round 2026-10-04, branch relief-round/INT)

P4 was merged together with P5 (render-bounds-1) on `relief-round/INT`. These items are OPEN. None of them is
labelled passed, and each needs an owner decision:

1. **Lethuris L6 `name` ceiling 6.9 -> 7.0%** (section 8). The one loosened LOD-consistency cell. The measured
   value is 6.99%.
2. **Strict post-relief LOD class/colour targets are unmet** (section 8). The cells tighten, but the strict
   targets are not reached.
3. **Weak range snow** (section 13, D1). The data says snow; the render reads pale grey.
4. **Horizon presentation on the other worlds** (section 13, D2). Raiva, Selawyn and Lethuris horizon poses were
   never re-posed with a sun-aware, picked-range rule in P4.
5. **The fell-colour test uses synthetic columns** (section 6, item 5). Relief summits no longer reach the fell
   band, so the test feeds synthetic columns instead of terrain samples.

**Cheap improvement round (task step 6): not attempted, by rule.** The round was allowed only if range snow or
horizon presentation turned out to be a parameter or ordering issue inside P4-owned files (`terrain.ts`,
`planet-landforms.ts`, `surface-biomes.ts`, the surface-climate lapse). Round 3's measurements rule that out:
- The P4 colour path already gives the range 98.7% of the SNOW constant; a brighter SNOW constant moved the lit
  crop only 202 -> 213 under ACES and Luna called it "slightly" better. The remaining levers are the
  ground-detail soil multiplier in `ground-material.ts`, tone mapping/exposure (renderer, not P4-owned), and a
  slope term in snow colour, which needs a matching classifier rule (a model change, not a parameter).
- The flattened r2 horizon is the capture's pose rule (a tropical dry plateau), not a terrain parameter.
So no P4 file was changed in this round. Integration sheets with sun-aware poses on four worlds are under
`test-results/finish-round-2026-10-04/INT/sheets/`.
