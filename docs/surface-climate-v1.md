# surface-climate-1 and habitat-suitability-1

Status: Wave 0 of `docs/biome-climate-increment-1-plan-2026-10-02.json`
(package W0-CLIMATE). Both modules are new files, and nothing consumes them
until Wave 1. Branch `biome-round/W0-CLIMATE`.

| Item | Value |
|---|---|
| `CLIMATE_VERSION` | `surface-climate-1` |
| `HABITAT_SUITABILITY_VERSION` | `habitat-suitability-1` |
| Calibration sha256 (pinned in `tests/surface-climate.test.mjs`) | `7d18c56d825d5a5e9c77403dd029214c6caeeeba60e4eafe462592907d1634c1` |
| Model class | `heuristic-v1` annual climate atlas, not a circulation model |
| Files | `src/surface-climate.ts`, `src/habitat-suitability.ts`, `tests/surface-climate.test.mjs`, `tests/habitat-suitability.test.mjs`, `tests/surface-climate.bench.mjs` (not in `npm test`) |
| Scratch evidence | `test-results/biome-climate-2026-10/W0-CLIMATE/` (in the main checkout; gitignored): `calibration-report.mjs`, `report.json`, `report.txt`, 16 equirect PNGs, `contact-sheet.png` |

The owner amended the plan on 2026-10-02. Where the amendments and the plan
conflict, the amendments win:

1. There is no single global lapse rate. Each planet's lapse rate comes from its
   surface gravity, and snow share emerges per planet.
2. The drawn axial tilt is honoured for any value from 0 to 180 degrees.
   Annual-mean insolation is correct for any obliquity, and the seasonal
   half-range is exposed.
3. The follow-up increments are recorded at the end of this document and are
   not implemented here.

## 1. Model

### 1.1 Forcing (per body, cached)

`climateForcingFor(body, opts?)` returns a frozen `ClimateForcing`. It is
cached in a 64-entry FIFO keyed by `seed|anchorTempK[|lapse override]`, and
eviction never changes values.

| Field | Source | Provenance |
|---|---|---|
| `anchorTempK` | `body.temperatureK`, or `opts.anchorTempK` | `catalogue` / `override` |
| `obliquityRad` | `spinStateFor(body).axialTiltRad`, folded and quantised (section 1.3) | `catalogue` |
| `surfaceGravityMS2` | `G*massKg/radiusM^2` | `catalogue-derived` |
| `lapseKPerM` | `lapseRateForGravity(g)` (section 1.2), or `opts.lapseKPerM` for calibration studies | `derived-heuristic` / `override` |
| `water`, `frozen` (Ice world), `habitat` | catalogue | |
| `moistureSeed` | `hash64(seed+'/macro-v1') & 0xffffffff`, the same seed as the legacy classifier | |
| `qMean[65]`, `qAmp[65]` | insolation tables (section 1.3) | `derived-heuristic` |

`climateForcingFromParams` builds the same object from explicit numbers, for
reference worlds such as the Earth check.

### 1.2 Per-planet lapse rate (owner amendment 1)

```
g      = G * massKg / radiusM^2
Gamma  = LAPSE_MOIST_FACTOR * g / CP          CP = 1004 J/(kg K)
       clamped to [1.0, 9.8] K/km
LAPSE_MOIST_FACTOR = 0.6652
```

This is the dry adiabatic lapse rate g/cp scaled by one constant moist factor.
The factor is chosen so that Earth (g = 9.81 m/s^2) gets 0.6652 × 9.81 / 1004 =
6.4996 K/km, the ICAO standard atmosphere. The clamp is only a guard: 9.8 K/km
is Earth's dry adiabat. Catalogue rocky planets have a fixed bulk density of
4800 kg/m^3 (`catalog.ts`), so g is proportional to radius. Over the corpus, g
runs from 2.69 to 12.07 m/s^2 and Gamma from 1.78 to 8.00 K/km, so no catalogue
planet is clamped. Maithea has g = 6.97 m/s^2 and Gamma = 4.62 K/km.

### 1.3 Insolation tables and obliquity (owner amendment 2)

**Folding.** The drawn tilt t lies in [0, pi], including retrograde spin. The
insolation-relevant obliquity is `eps = min(t, pi - t)`, which lies in
[0, 90°]. It is snapped to a 2^-30 rad grid, so that t and pi - t give
bit-identical tables even though `pi - (pi - t)` is not always t in floating
point.

**Daily-mean insolation.** The tables use Berger (1978), *J. Atmos. Sci.*
35:2362; see also Hartmann, *Global Physical Climatology*, eq. 2.15:

```
Q = (S0/pi) (a/r)^2 [ h0 sin(phi) sin(delta) + cos(phi) cos(delta) sin(h0) ]
cos(h0) = -tan(phi) tan(delta), clamped to [-1, 1]   (h0 = 0 polar night, h0 = pi polar day)
sin(delta) = sin(eps) sin(lambda)
```

**Table construction.**
- There are 65 rows with x = sin(latitude) = k/64.
- Each row averages 256 mid-point true longitudes. With e = 0, these are
  equal-time samples.
- `qMean` is the annual mean of Q, and `qAmp` is (max - min)/2 of the daily
  values.
- Both are normalised by the area mean, which is a trapezoid in x because dA is
  proportional to d(sin lat). Analytically the area mean is S0/4.
- The pole and the case where the sun is overhead at the pole use
  `Q = max(0, x sin(delta))`.
- Only det-math `sine` and `detAcos` are used, together with + - * /, sqrt,
  min, max, floor and abs.

**Eccentricity is ignored.** In the annual mean, (a/r)^2 averages to a uniform
factor of 1/sqrt(1 - e^2), and the normalisation removes it. Eccentricity only
skews the seasons, which this annual model does not resolve.

The tables are verified against an independent platform-math reference (4096
longitudes) to within 2e-3. They are also checked against these analytic
anchors:
- annual polar mean = 4 sin(eps)/pi;
- equator at 0° = 4/pi;
- equator at 90° = 8/pi^2;
- polar half-range = 2 sin(eps).

The table below uses anchor 288 K and water 0.5. Each cell shows q / annual
mean at the datum / seasonal half-range.

| drawn tilt | effective | equator | 45° | pole |
|---|---|---|---|---|
| 0 | 0.0 | 1.274 / 304.5 K / ±0.0 | 0.901 / 282.1 K / ±0.0 | 0.000 / 228.0 K / ±0.0 |
| 23.4 | 23.4 | 1.221 / 301.3 K / ±1.6 | 0.902 / 282.1 K / ±16.8 | 0.506 / 258.3 K / ±23.8 |
| 45 | 45.0 | 1.095 / 293.7 K / ±5.6 | 0.930 / 283.8 K / ±30.0 | 0.900 / 282.0 K / ±42.4 |
| 54 | 54.0 | 1.028 / 289.7 K / ±7.9 | 0.976 / 286.6 K / ±34.3 | 1.030 / 289.8 K / ±48.5 |
| 60 | 60.0 | 0.982 / 286.9 K / ±9.5 | 1.008 / 288.5 K / ±36.7 | 1.103 / 294.2 K / ±52.0 |
| 90 | 90.0 | 0.811 / 276.6 K / ±18.9 | 1.095 / 293.7 K / ±42.4 | 1.273 / 304.4 K / ±60.0 |
| 120 | 60.0 | identical to 60 (bit-identical tables) | | |
| 180 | 0.0 | identical to 0 (bit-identical tables) | | |

Above about 54° the poles receive more annual insolation than the equator
(54.0°: pole 1.030 vs equator 1.028), and the tests pin this. The seasonal
half-range is exposed as `insolationHalfRange`, `seasonalHalfRangeK`,
`warmestMonthK` and `coldestMonthK`, so a later classifier can tell permanent
snow (`annualMean` cold) from seasonal snow (`coldestMonthK` cold,
`warmestMonthK` warm). Polar seasons become extreme at high tilt: ±60 K at 90°
with water 0.5.

### 1.4 Per-sample fields

`surfaceClimate(forcing)` returns `(d, heightM, out) => out`. It does not
allocate and does not call hash64. `x = |d[1]|`, and the tables are linearly
interpolated at x·64.

```
annualMeanTempK     = anchor + K_LAT_K (q - 1) - Gamma * max(0, heightM - DATUM_M)
seasonalHalfRangeK  = SEASON_K * qa * (1 - MARITIME * water)
warmestMonthK       = annualMean + halfRange;  coldestMonthK = annualMean - halfRange
legacyMoisture      = noise(d0*5+13, d1*5+37, d2*5+19, moistureSeed+30)     (bit-identical to the classifier)
dryBelt01           = s(x; LO-EDGE..LO+EDGE) * (1 - s(x; HI-EDGE..HI+EDGE))  (arithmetic smoothstep)
effectiveMoisture   = legacyMoisture - BELT_MOISTURE * dryBelt01            (BELT_MOISTURE = 0.17/4: terrain.ts's +0.17 aridity)
aridity01           = clamp01((0.5 - effectiveMoisture) * 4)
snowFraction        = frozen ? 1 : water>0 ? clamp01((T_SNOW_K - annualMean)/SNOW_RAMP_K) : 0
treeline01          = clamp01((warmestMonth - T_TREE_WARMEST_K)/TREE_RAMP_K)
growingSeason01     = halfRange<=1e-9 ? (annualMean>GROW_K) : 1 - acos(clamp((annualMean-GROW_K)/halfRange))/pi
                      (the fraction of a sinusoidal year above GROW_K; uses detAcos)
forestSuitability01 = habitat ? treeline01 * clamp01((effM - FOREST_MOIST_LO)/FOREST_MOIST_RAMP) * clamp01(1 - snow/0.2) : 0
climateCode         = (tBin<<3)|mBin, with tBin = clamp(floor((annualMean - anchor + 32)/2), 0, 31)
                      and mBin = clamp(floor(effM*8), 0, 7)
```

`decodeClimateCode` returns the bin centres. `temperateHabitat(body)` is
byte-identical to the renderer gate at `planet-renderer.ts:830`; a test checks
the renderer source string and parity over every body in the first 2000
catalogue systems.

### 1.5 Calibration constants (heuristic-v1)

| Constant | Value | Meaning |
|---|---|---|
| K_LAT_K | 60 | K per unit of normalised insolation |
| LAPSE_MOIST_FACTOR, CP_J_PER_KG_K | 0.6652, 1004 | gravity lapse (section 1.2) |
| LAPSE_MIN/MAX_K_PER_M | 0.001 / 0.0098 | sanity clamp |
| DATUM_M | 0 | lapse datum (sea level) |
| T_SNOW_K, SNOW_RAMP_K | 268, 6 | snow from annual-mean temperature |
| T_TREE_WARMEST_K, TREE_RAMP_K | 283, 6 | 10 °C warmest-month treeline |
| SEASON_K, MARITIME | 40, 0.5 | seasonal half-range scale and ocean damping |
| BELT_LO/HI/EDGE, BELT_MOISTURE | 0.18 / 0.52 / 0.03, 0.0425 | subtropical dry belt (smoothed legacy belt) |
| FOREST_MOIST_LO, FOREST_MOIST_RAMP | 0.44, 0.08 | forest moisture ramp |
| GROW_K | 278 | growing-season threshold |
| OBLIQUITY_QUANTUM_RAD | 2^-30 | tilt folding grid |

**Earth reference.** The test uses anchor 288 K, obliquity 23.44°, water 0.7
and 6.5 K/km (also reproduced with g = 9.81 and no override). Results:
- equatorial snow onset 5120 m (acceptance band 4.3-5.5 km);
- 45° onset 2172 m (band 1.2-3.0 km);
- snow 0.88 at 70° and 1.0 at 80°;
- area-mean datum temperature equal to the anchor within ±0.5 K.

## 2. Calibration report (owner gate, open question 1)

The report is produced by
`test-results/biome-climate-2026-10/W0-CLIMATE/calibration-report.mjs` in about
11 s with no GPU. Land and height come from
`terrainSampler(body)(d).groundHeightM` (post-landform). "Snow" means
snowFraction > 0.6, "forest-suitable" means forestSuitability01 > 0.5, and
"legacy" means today's `biomeClassifier` (`weights[3] > 0.6` and
`forestPotential`).

### 2.1 Maithea (LETHRA-001 G001/C2128,0,1/0/planet/1)

Maithea: Oceanic world, 284 K, water 0.415, R = 5195 km, g = 6.97 m/s^2,
drawn tilt 13.5° (effective 13.5°). Of 60k samples, 32,982 are land, and the
median land height is 6533 m.

| Lapse | land snow > 0.6 | forest-suitable | forest by 15° band (0/15/30/45/60/75) | snow onset at 0° / 45° / 70° |
|---|---|---|---|---|
| legacy rule | **34.9 %** | 4.5 % (forestPotential) | 6.0 / 7.2 / 4.3 / 2.5 / 0 / 0 | about 20.8 km at the equator |
| **gravity, 4.62 K/km (shipped default)** | **68.8 %** | 4.9 % | 9.4 / 8.1 / 3.3 / 0.1 / 0 / 0 | 6786 / 2171 / below datum |
| 4.0 K/km | 63.0 % | 6.0 % | 11.7 / 9.5 / 3.9 / 0.1 / 0 / 0 | 7836 / 2507 / below datum |
| 5.0 K/km | 71.5 % | 4.5 % | 8.5 / 7.5 / 3.0 / 0.1 / 0 / 0 | 6269 / 2006 / below datum |
| 6.5 K/km | **78.9 %** | 3.2 % | 5.8 / 5.3 / 2.4 / 0 / 0 / 0 | 4822 / 1543 / below datum |

**Correction to the plan's figures.** The plan quoted 35 % (legacy) → 58 %
(4.0 K/km) → 79 % (6.5 K/km).
- The legacy 34.9 % and the 6.5 K/km 78.9 % are reproduced.
- The **4.0 K/km figure is 63.0 %, not 58 %**. Re-running the planning probe
  itself (`test-results/biome-plan-2026-10-02/climate-proto-probe-cfg.mjs`,
  CFG `[60,0.004,268,283]`) gives 20786/32982 = 63.0 %, the same as this
  module.
- The owner's per-planet rule puts Maithea at 68.8 %.

### 2.2 Snow share across the catalogue (owner amendment 1)

The corpus is every `temperateHabitat` body (water > 0, 250-325 K, not Ice or
Volcanic) in the first 2000 systems of galaxy G001. That is 721 rocky water
worlds, all with land. Each body uses 8000 Fibonacci samples, and the median
land share is 52 %.

| Rule | min | p10 | median | p90 | max | mean | histogram, 10 % bins (0-10 … 90-100) |
|---|---|---|---|---|---|---|---|
| legacy | 15.0 | 25.4 | 32.8 | 39.4 | 49.3 | 32.5 | 0 7 223 433 58 0 0 0 0 0 |
| **gravity (shipped)** | **0.0** | **9.4** | **61.0** | **99.4** | **100** | **57.9** | **74 56 48 66 58 52 66 52 55 194** |
| 4.0 K/km | 0.5 | 8.2 | 46.9 | 99.4 | 100 | 51.9 | 87 99 74 64 53 40 37 45 42 180 |
| 5.0 K/km | 3.8 | 18.6 | 58.5 | 99.5 | 100 | 59.6 | 16 69 82 80 64 59 50 46 62 193 |
| 6.5 K/km | 13.5 | 34.8 | 69.9 | 99.6 | 100 | 68.8 | 0 6 32 82 80 84 78 72 69 218 |

Snow now **emerges per planet**. The legacy rule gives every world about a third
snow (15-49 %), whatever its temperature. The new field spreads the corpus from
0 % to 100 %.

The table below breaks down land snow share (gravity rule) by catalogue anchor
temperature:

| anchor | n | min | median | max | median at 6.5 K/km | legacy median | median forest-suitable |
|---|---|---|---|---|---|---|---|
| 250-264 K | 151 | 74.8 | 99.3 | 100 | 99.6 | 32.8 | 0 |
| 265-279 K | 108 | 42.9 | 89.0 | 98.9 | 91.3 | 32.4 | 1.4 |
| 280-294 K | 125 | 5.1 | 67.0 | 90.2 | 74.4 | 32.1 | 10.7 |
| 295-309 K | 166 | 0 | 40.4 | 75.1 | 55.2 | 33.0 | 24.5 |
| 310-325 K | 171 | 0 | 23.5 | 61.1 | 36.3 | 33.7 | 33.1 |

Gravity drives the result. Median snow by gravity tercile:

| g tercile | gravity rule | fixed 6.5 K/km |
|---|---|---|
| 2.69-5.87 m/s^2 | 33.0 % | 70.4 % |
| 5.91-9.24 m/s^2 | 58.2 % | 71.0 % |
| 9.25-12.07 m/s^2 | 70.7 % | 67.7 % |

Under a fixed lapse rate the terciles would be flat. Obliquity classes (0-30°,
30-54.7° and >54.7°) have similar medians (59.8 / 62.0 / 61.9 %). Tilt moves
snow between latitudes; it does not change the total much.

**Main caveat for the owner.** Every catalogue water world has the same, very
high relief. Median land height across the corpus is 6.4 km (range 4.4-9.3 km),
because `terrain.ts:208` gives every rocky planet the same relief. Most of the
snow is therefore altitude snow. The GEOPHYSICS follow-up (section 5a) is the
physical fix; a lower lapse rate is not.

### 2.3 Sites on Maithea (gravity lapse)

| Site | lat | h (m) | legacy | T annual (K) | ±season | warmest | snow | effM | forest |
|---|---|---|---|---|---|---|---|---|---|
| equatorLowland | 10.2 | 303 | Temperate ground, forest | 296.8 | 2.6 | 299.4 | 0 | 0.759 | 1.00 |
| midLatForest | 35.6 | 1556 | Temperate ground, forest | 278.5 | 8.6 | 287.1 | 0 | 0.676 | 0.69 |
| dryUpland | 23.6 | 259 | Dry upland | 292.0 | 5.9 | 298.0 | 0 | 0.374 | 0 |
| highMountain (18 km equatorial summit) | 1.7 | 18066 | Dry upland (brown soil) | 215.9 | 0.8 | 216.7 | **1.00** | 0.429 | 0 |
| midLatSnowMountain | 53.9 | 3975 | Mountain meadow | 251.3 | 12.0 | 263.2 | 1.00 | 0.592 | 0 |
| polar | 68.1 | 688 | Alpine / polar snow | 251.5 | 13.7 | 265.2 | 1.00 | 0.686 | 0 |
| coast | 14.6 | 93 | Coastal sand | 296.6 | 3.7 | 300.3 | 0 | 0.745 | 1.00 |
| forest-census fixture (`livingPatch` search) | 32.8 | 1971 | Temperate ground, forest | 278.6 | 8.0 | 286.6 | 0 | 0.849 | 0.60 |
| life SITE_A [4068880.8,-1511750.9,2855601.0] | 16.9 | 825 | Temperate ground, forest | 292.4 | 4.3 | 296.7 | 0 | 0.753 | 1.00 |

The 18 km equatorial summit becomes snow, which fixes the bug in the plan
thesis. Every legacy forest site stays forest-suitable.

### 2.4 Equirect maps

There are 512×256 maps for each world. Columns: annualMeanTempK (ocean
darkened), snowFraction, effectiveMoisture and forestSuitability01. Rows:
- Maithea;
- Selawyn: effective obliquity 89.8°, 320 K, g 11.5. The ocean shows warm poles
  and a cooler equator.
- Raiva: g 2.69, 300 K, 1.8 K/km. It has almost no snow and a lot of forest.
- Lethuris: g 12.07, 275 K, 8.0 K/km. It is almost all snow.

The maps are in `test-results/biome-climate-2026-10/W0-CLIMATE/*.png`, with
`contact-sheet.png` as a 4×4 overview.

## 3. habitat-suitability-1

- **`nicheSuitability`** replicates `baseMembership` operation by operation,
  including the 0.45/0.40/0.15 weights, `round(…,3)` (×1000) and the clamp. Its
  result is `===` to `habitatMembership(...).suitability` over 5 lab habitats ×
  3 profiles × 24 species.
- **`compileNicheEvaluator(datedSpecies, profile, anchorTempK)`** returns
  `plants(local,out)` and `animals(local,out)`. Each output entry is the
  suitability where `habitatMembership` would mark the species occupied, and 0
  elsewhere. Animals also apply the producer rule: browsers need an occupied
  tree or shrub, grazers an occupied grass. Producer eligibility is computed
  once per call, so the cost is O(S). Occupancy matches exactly on 3000 random
  habitats, and both producer branches are exercised.
- **Rebasing.** The shift is `T + (PROFILE_NOMINAL_TEMP_K[profile] - anchor)`,
  with nominal values temperate 286, arid 299 and cold 268 K. A parity test
  checks these against the generated niche centres. The plan wrote
  `localT - anchor + nominal`, which is mathematically the same; the
  bracketing is chosen so that anchor = nominal is an exact identity. Planets
  at 235/252/278/279/295/321/330 K all have occupied plants on a latitude ×
  height sweep.
- **`slopeDegToNiche01(deg) = clamp01(deg/45)`** is **inferred**. The biosphere
  lab never states a slope unit, and 45° is where the classifier's rock weight
  saturates.
- **`familyClimateAffinity`** follows the plan formulas: spires favour cold, and
  branching trees favour warm, moist ground. It corrects the inversion where
  spire niches sit about 5 K warmer than branching ones.
- **`treeSpeciesWeights(eligibleTrees, code, profile)`** follows the plan
  formula, with one deliberate deviation. The plan defines s as raw
  nicheSuitability, but the raw weighted sum is > 0 even outside a species'
  temperature range, which would let spires grow at 255 K. Here **s counts only
  where the species would be occupied**: inside every range and at or above
  0.28. If every weight is 0, every tree gets weight 1 (the legacy fallback).
  Non-tree entries get 0. The function is memoised in a 256-entry FIFO keyed by
  profile + species ids + code, and returns a fresh copy.
- **`pickWeightedMax`** is integer-weighted rendezvous. With all weights 1 and
  `score(i,0)` = the legacy hash, it reproduces `bindTreeSpecies` on 10k cells ×
  3 catalogues. Over 100k cells with weights {1,3,4} it gives chi² < 9.21
  (p > 0.01). The result does not depend on enumeration order, ties go to the
  smaller key by code-unit order, and all-zero weights return -1.
- **Fauna interface.** The module exports the `FaunaHabitatSample` type,
  `faunaSpeciesWeights` (0..8) and `pickWeightedMax`.

## 4. Determinism and cost

Determinism is enforced by tests:
- **Allowed math only.** A source-grep test forbids `Math.pow`, `**`,
  `Math.sin/cos/asin/acos/exp/log` and `localeCompare` in both modules
  (comments are stripped).
- **Import boundaries.** surface-climate imports only `catalog.ts`,
  `stellar-evolution.ts` and `det-math.ts`, so the rock-module import ban stays
  satisfiable. habitat-suitability has only a type import from
  `biosphere-model.ts`.
- **Identical digests.** sha256 over 50k samples (10 bodies × 5k × 15 fields)
  is identical across two cold Node processes, an in-process cold cache, a warm
  cache, and an evicted cache with shuffled body order.
- **Continuity.** |Δ| ≤ 1e-3 for directions 1e-6 rad apart at cube edges, at
  the poles and at all six belt edges, including the legacy hard step at
  sin-lat 0.18/0.52, which is gone.

Cost was measured with `node --expose-gc tests/surface-climate.bench.mjs`
(Node 24.7, best of 15 passes of 200k samples). The machine was shared with
other agents at about 76 % CPU load.

| Budget | Limit | Measured |
|---|---|---|
| surfaceClimate per sample | ≤ 0.15 µs, zero allocation | 0.092-0.094 µs best (0.095-0.097 median); heap growth < 1 byte/call during 3M calls, < 5 KB after GC |
| climateForcingFor table build | ≤ 5 ms/body | 0.69-0.84 ms/body |
| niche evaluator, 24 species (plants and animals) | ≤ 1 µs/sample | 0.18-0.19 µs |

## 5. Follow-up increments (not implemented here)

**(a) GEOPHYSICS.**
- Derive bulk density from core mass fraction, and gravity from bulk density.
  Today, density is fixed at 4800 kg/m^3, so g is proportional to R. This
  module's lapse rate already reads g, so it will follow automatically.
- Scale relief amplitude by about 1/g and by tectonic activity that declines
  with planet age. Relief then changes over time, which makes it a 4D
  quantity. Today `terrain.ts:208` gives every rocky planet the same relief,
  which is why the corpus median land height is 6.4 km.
- Add a per-planet atmosphere parameter: surface pressure and greenhouse
  forcing (shifting the anchor and the moist factor), and a magnetic field
  derived from the core.

**(b) BIOME FAUNA.** On every planet with air, every biome (snow, desert,
alpine, forest, grassland and so on) should host adapted animals. Fauna habitat
should come from habitat-suitability (`compileNicheEvaluator(...).animals`,
`faunaSpeciesWeights`, `pickWeightedMax`). This waits until the fauna round
frees `src/fauna-*.ts`.

**(c) STAR LUMINOSITY AND BRIGHTENING.** The planet anchor temperature should
follow stellar luminosity, and stars should brighten over billions of years.
The owner wants this later. Plan open question 4 notes that about 83 % of
forest-eligible water worlds would leave the 250-325 K band.

## 6. Reproduce

```
node --test tests/surface-climate.test.mjs tests/habitat-suitability.test.mjs
node --expose-gc tests/surface-climate.bench.mjs
node C:/LLM/IWSDK/universe-atlas/test-results/biome-climate-2026-10/W0-CLIMATE/calibration-report.mjs
```
