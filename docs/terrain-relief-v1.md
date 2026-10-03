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

1. **Fine-term guard (`fineT >= -comp/2`).** The plan's `F` could go below 0 just inland of the coast wherever
   the fine noise is negative. That flips coast cells and breaks the coastline invariant. The guard keeps 0 flips.
2. **Climate datum guard (`climateDatumM`).** With "no sea", the renderer passes -1e6. Without the guard, the
   climate would be sampled about 1000 km up.
3. **Seabed detail shape weights (2.0 / 1.4) and the two-octave form.** A third 200 m octave cost +9-14% in the
   sampler (budget +8%) for about 1% of the variance, so it was dropped.
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
- Every metric improves except Lethuris L6 biome-name disagreement, which goes from 6.87% to 6.99%. That is above
  `lod-consistency.test.mjs`'s shipped ceiling of 6.9.
- The strict class (0.5%) and colour tolerances are still exceeded at L6 and L8, as they were on shipped
  terrain.
- Proposed `SHIPPED_CEILINGS` re-pin (the test file belongs to P3/P6):
  - Maithea: L6 `{rgbP99 26.3, snow 1.3, name 3.2, carriedName 3.5}`; L8 `{name 0.8, carriedName 1.2}`; L10 none.
  - Lethuris: L6 `{rgbP99 39.2, snow 2.2, forest 1.8, name 7.0, carriedName 8.2}`; L8 `{rgbP99 11.1, snow 1.0,
    forest 2.2, name 1.9, carriedName 1.7}`; L10 `{forest 0.7}`.

## 9. Known visual issue (not fixed here)

The ridge belt term reuses the shipped isotropic ridged noise `n(d,30,7)`. Seen from orbit, its crest network
reads as a maze, not as linear mountain belts. On cold, high-g worlds such as Lethuris, the geophysics lapse puts
every crest above the snowline, so a white maze covers the continent. This pattern was also present on
terrain-1.7, but hidden under a near-total snow sheet. A visual reviewer (GPT Luna) named it as the clearest
remaining artefact. The suggested follow-up is R-CAL-2: gate `ridges` with a low-frequency orogen/belt mask so that
crests form ranges. That changes every relief digest, so it is a separate version bump.

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
  `reliefMinM/reliefMaxM`.
