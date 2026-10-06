# Mountains cost plan T6: the mountains wired — record, 2026-10-06

Task: T6 of `docs/mountains-opus-decisions-2026-10-05.md` (task table, Q6 item 2, addendum items 2 and 3, addendum (4)
decisions 2 and 3, addendum (6) Q-B). Branch `mountains/t6-wiring` (worktree `universe-atlas-wt/t6`) from main
`9dcb1cf` (route A baked coarse field merged staged). Evidence (git-ignored, on disk):
`test-results/mountains/t6-wiring/`.

@@SUMMARY@@

## 1. The wiring (one step)

- `src/terrain.ts`: `TERRAIN_MOUNTAINS_WIRED = true`; `TERRAIN_VERSION` `terrain-1.8.1-grain` →
  **`terrain-1.9.0-mountains`**. Relief water worlds' `terrainSampler` composes M1 (`orogen-layout-4`), M2
  (`massif-envelope-4`), M3 (`mountain-carving-2`) and M5 (`mountain-rock-detail-1`) into the ridge term inside the
  48 km massifs; below the carving cut a tile level reads the route A baked coarse field. `{mountains: false}` still
  gives the pre-mountains field, bit-identical to `terrain-1.8.1-grain`.
- M5 patch (`test-results/mountains/m5/m5-wiring.patch`) applied as part of the same step: `LOD_LADDER_VERSION`
  `lod-ladder-2` → **`lod-ladder-3`** (`rockDetailFromLevel`, the M5 declared reduction),
  `MOUNTAIN_ASSEMBLY_VERSION` `mountain-assembly-2` → **`mountain-assembly-3`** (`mountainRidgeTermM(..., carve,
  rock)`), and its expected test updates (`tests/lod-carving-reduction.test.mjs`, `tests/lod-consistency.test.mjs`,
  `tests/acceptance/version-compat.test.mjs`, `tests/terrain-mountains-assembly.test.mjs`).
- `mountainCarvingState` has four values: `null` (no mountains), `false` (below the cut: baked coarse field),
  `true` (cut .. rock − 1: exact M3, no rock), `'rock'` (the truth, and levels from `rockDetailFromLevel`). Rock
  starts at L10 / L11 / L9 / L11 (Maithea / Selawyn / Raiva / Lethuris), the first point-sampled level on every
  world (contract §3, M5 amendment).
- The source-identity HARD test of the two cores (`tests/helpers/mountain-coarse-field.mjs`) keeps its meaning: its
  needle now matches the wired call `mountainRidgeTermM(ridgeTermM, o, a0, landFactor, tau, beltCarvingSeeds, carve,
  rock)` and replaces it with `..., false, false)`.
- Version-string pins moved (old → new written beside each): `tests/acceptance/version-compat.test.mjs`,
  `tests/inland-rivers-disabled.test.mjs`, `tests/river-terrain.test.mjs` (`geologyVersion`),
  `tests/terrain-relief-hypsometry.test.mjs`, `tests/terrain-climate-colour.test.mjs`. `BUILD_VERSION` is unchanged.
- `SURVEY_VERSION` is **unchanged**: measured, no survey site moves (main vs wired, 4 water worlds + 6 golden
  bodies, 0 of 10 bodies change; `survey-diff.json`). The survey reads level 0 (T4); 17-36 of the 1,536 candidates
  per water world rise by up to 4.1 km, but none overtakes a chosen site.
- **Carving re-pin (T3 test):** `COST_SAMPLER_IDENTITY[2]` added per world for the rock class (the truth moved):
  Maithea `9fd0dcf1…49ef2`, Selawyn `f0d4b21f…f7cd90`, Raiva `ae4c6a53…c5b90f`, Lethuris `2783f372…52f1d1`.
  `[0]`, `[1]` and `COST_IDENTITY` are unchanged (`repin-carving.json`).

## 2. Q-B implemented (U1 exact, U2 UP_ROOM)

`tests/lod-coarse-frame.test.mjs` replaces its `todo` with three HARD tests, and contract §3.1 says, in those words,
"carving frame exact; peak correction excepted, bounded by UP_ROOM":

- **(U1)** child POINT sample (child level sampler, before its own peak correction) ≤ parent stored + 0.05 m at
  every shared vertex of every pair, `pairs >= 4 x 9`. Measured wired: **max 0.000 m on every pair of every world.**
  Negative control: parent[144] = child point − 1 m gives exactly 1 violation.
- **(U2)** child stored − parent stored ≤ UP_ROOM at every peak-corrected pair; UP_ROOM = measured max × 1.25,
  rounded up to 50 m (the ROOM rule). 37 pins (9 / 10 / 8 / 10 pairs); table with p50/p99/max in contract §3.1.
  Negative control: child[144] raised to parent + UP_ROOM + 1 m is caught.
- **ROOM (lower side) unchanged and met wired:** switch pairs Maithea L5→6 1222 / 1550, Selawyn L6→7 1584 / 2000,
  Raiva L4→5 634 / 800, Lethuris L6→7 1877 / 2350; tightest pair Lethuris L10→11 246 / 250 m. No ROOM pin moved.
- No version moves for Q-B. (`lod-ladder-3` is taken by M5, so the cap option of Q-B, if Kasper chooses it, would
  now take `lod-ladder-4`.)

## 3. Decision 3: statistic-style tests (every move)

Mechanism: `tests/helpers/statistic-level.mjs` — `statisticSampler(body, {waterLevelM, exposeFloor, ...})` is
`terrainSampler(..., {lodLevel: 0})` (no M3 carving, no M5 rock: an upper envelope of the truth inside the massifs,
identical outside); `fullOnly(reason)` skips a test unless `ATLAS_TEST_FULL=1`, which `tests/helpers/test-runner.mjs
full` (`npm run test:full`) now sets. No threshold, band or pin changed in any moved test.

| File | Test | Old sampler | New | Reason |
|---|---|---|---|---|
| `tests/terrain-climate-colour.test.mjs` | colour identity, snow in the colour, climate zones | truth | level 0 | global colour/climate statistic |
| same | non-water colour | truth | truth (kept) | no mountains on dry worlds (identical) |
| `tests/acceptance/climate-agreement.test.mjs` | orbit/tile colour and classifier agreement (20k × 4) | truth | level 0 | global agreement statistic |
| same | orbit bake stores `terrainSampler` colour per pixel | truth | level 0 | the bake IS level 0 since T4 |
| `tests/terrain-floor-window.test.mjs` | window invariant (6 × 20k), `continentalM` vs land, `floorM` | truth (floor sampler) | level 0 (`exposeFloor`) | global window statistic |
| same | window invariant on the **truth** | — | truth, **test:full** (new) | the carving lowers ground inside massifs; kept on the truth |
| same | shape test (512 directions) | truth | truth (kept) | |
| `tests/terrain-relief-hypsometry.test.mjs` | coastline flips, Maithea hypsometry, dry worlds, corpus snow, window, height bound | truth | level 0 | global relief statistics |
| same | seabed relief layers | `reliefLayersSampler(body)` | `reliefLayersSampler(body, {lodLevel: 0})` | seabed statistic (identical below sea level) |
| `tests/helpers/render-bounds-suite.mjs` | site selection (4096 directions); four landing tests | truth | level 0 | landing decision 2: candidates and cutoff in one field |
| same | tile builds, containment, false-cull poses, seabed, descent | truth / tile level | unchanged | |
| `tests/forest-water-validity.test.mjs` | fixture patch search (65,536 directions) | truth | level 0 search, **truth confirm** | selection only; the found patch must hold on the truth |
| `tests/terrain-mountains-assembly.test.mjs` | ocean flag everywhere = main digest `48f643c5…` | truth | level 0 default + truth **test:full** | ocean flag identical by construction; truth copy kept |
| `tests/terrain-elevation-identity.test.mjs` | outside-belt identity, mountains digest, kept palette | truth | level 0 default (`81b7bdd5…`) + truth **test:full** (`7de7c8f7…`) | identity at level 0 uses a reach of 1.3 H (coarse margin END_H 0.2 → 1 + 1.5 × 0.2); truth uses 1 H |
| `tests/tile-metadata.test.mjs` | recompute/peak check | truth | **the tile's own level** | correctness fix: a tile is built at its level |
| same | fixture selection | truth | level 0 | selection only |
| `tests/place-query.test.mjs` | deepest-place search (4096 directions) | truth | level 0 | selection only (seabed: identical); `placeAt` and `depthAndPressureAt` stay on the truth |

Kept findings of the move:

- The **truth hypsometry** (not a test any more; `hyps-truth.json`) meets every band: Maithea land p10 207 / p50 440
  / p90 2730 / p99 4346 / max 5910 m, above 4 km 2.18%, below 500 m 54.4%, snow 19.7%, sand 1.38%, lowland 38.3%,
  snow on ranges 28.5%, snow on low land 3.3% (level 0: p90 2813, p99 4378, above 4 km 2.42%; pre-mountains: p90
  2690, p99 4358, above 4 km 2.23%). The truth costs 77 s and 458 block solves for 20,000 directions.
- `reliefLayersSampler(body, options)` takes the sampler options (default = the truth, unchanged).

## 4. Landing (decision 2)

`planetSnapshotAt(...).landingSurface(direction)` is the same dated query on the level-0 rock field
(`lifecycleDatedSurfaceSampler(body, planet, star, t, 0)`); `main.ts` `exploreTerrain` reads its candidates from
`landingSurfaceFor(body)`, so candidate heights and the level-0 summit cutoff (`landPercentileM`) are one field and
the candidate search solves no M3 block. The landed and walked ground stays `surface` (the truth).
`tests/sparse-consumer-levels.test.mjs` pins that the only non-default `lifecycleDatedSurfaceSampler` call is the
level-0 landing one; `tests/landing-site.test.mjs` has a decision-2 test.

## 5. Checks outside the massifs (not mountain evidence)

These say "no regression outside the massifs" only. No frozen tile touches a 48 km massif.

- **17 SHIPPED_CEILINGS pins: 17/17; 96 LOD cells: 96/96** (`lod-cells-wired.json`). Against main the 90
  cross-level cells are identical; only the 6 retention cells move (L6 peakKept 89.56 → 89.75, L8 97.52 → 97.55,
  L6 summit p50 3.9 → 10.2 m, max 293 → 281 m, snow 99.29 → 99.05, forest 99.11 → 98.88).
- Outside-belt identity, level 0 (default test) and truth (test:full): see section 3; SITE_A: @@SITEA@@.

## 6. Mountain evidence

### 6.1 Massif tile set (Q6 item 2, addendum item 2; report-only, A3 OPEN)

Frozen in `tests/helpers/mountain-tile-set.mjs` (rule reads M1 only; `tests/mountain-tile-set.test.mjs` asserts the
rule still returns the set and every tile has a massif sample): 12 tiles per world (8 axis, 2 flank, 2 belt-end),
0 replaced, every tile has samples with |axis| < 48 km at every evaluated level. INFO cells (`massif-tile-set.json`;
plan tolerance in brackets):

| World | Pair | dh p99 / max (m) | rgbP99 | snow / forest / name / carried (%) |
|---|---|---|---|---|
| Maithea | L5→6 (switch) | 1487 / 2124 (7650 / 20400) | **175.6** (12) | 8.0 / 3.6 / 11.7 / 9.2 |
| Maithea | L6→7 | 809 / 1600 | **52.6** (12) | 3.3 / 1.6 / 4.2 / 4.8 |
| Maithea | L8→9 | 426 / 671 | **12.7** (4) | 2.7 / 0 / 3.1 / 3.9 |
| Lethuris | L6→7 (switch) | 1376 / 1930 | **261.4** (12) | 8.0 / 7.1 / 11.1 / 9.2 |
| Lethuris | L7→8 | 748 / 1323 | **90.0** (4) | 4.1 / 4.0 / 5.1 / 5.8 |
| Lethuris | L8→9 | 596 / 1100 | **50.5** (4) | 3.5 / 4.0 / 4.3 / 4.8 |
| Lethuris | L10→11 | 246 / 414 | **16.9** (1) | 0.3 / 1.3 / 0.5 / 0.6 |
| Selawyn | L6→7 (switch) | 1257 / 1604 | 6.7 (12) | 0 / 0.3 / 0 / 0.2 |
| Raiva | L4→5 (switch) | 883 / 1224 | 7.4 (12) | 0 / 2.1 / 0.2 / 1.4 |

Heights stay inside the plan tolerance on every pair; ocean ≤ 0.09%, shared-ocean mismatch 0. Colour and class
exceed the plan tolerance on the snowy worlds (Maithea, Lethuris) at and after the switch: the carving and the rock
appear, and with them snow and rock colour. Retention (dense truth reference, 12 tiles):

| World | L6 peakKept | L8 peakKept | L6 summit p50 / max (m) | L6 snow / forest kept |
|---|---|---|---|---|
| Maithea | 85.91 | 89.76 | 122 / 333 | 98.4 / 96.1 |
| Lethuris | 98.96 | 81.26 | −95 / 370 | 99.8 / 91.7 |
| Selawyn | 99.17 | 82.90 | −70 / 267 | — / 99.9 |
| Raiva | 79.41 | 97.49 | 49 / 146 | — / 99.8 |

Against the frozen-tile keeps (L6 ≥ 85, L8 ≥ 95, summit p50 ≤ 120 m) these would fail in 5 places; they are
report-only (Q3, the retention reference, is Kasper's). **M0 reopen trigger (Q1):** massif-tile colour/class cells
exceed the §5 strict target, so the trigger condition for reopening M0 is met. Reopening is not done here.

### 6.2 M3 rows, old and FRESH seeds (addendum item 3)

Fresh seeds **730301-730308**, fixed before measuring, never used before; nothing tuned (`m3-rows.json`):

| Row | Threshold | Old 730201-208 | Old + rock | **Fresh** | **Fresh + rock** |
|---|---|---|---|---|---|
| slope125Over30 | ≥ 25 | 69.74 | 67.94 | 69.58 | 67.65 |
| slope125P50 | ≥ 20 | 37.81 | 37.78 | 37.66 | 37.63 |
| flank500mP50 | ≥ 12 | 20.7 | 20.7 | 20.5 | 20.6 |
| relief8kmP50 | ≥ 1500 | 1574 | 1561 | 1573 | 1561 |
| beta500mTo8km | 2-2.6 | 2.29 | 2.25 | 2.30 | 2.25 |
| fill10ShareP50 | ≤ 0.05 | 0.004 | 0.005 | 0.004 | 0.005 |
| pits025Per1000km2P50 | ≤ 50 | 3.9 | 3.5 | 4.3 | 5.6 |
| axisCoherence40kmP50 | 0.14-0.64 | 0.224 | 0.223 | 0.237 | 0.238 |
| R3′ (rock β ≤ limit) | | 3.280 ≤ 3.318 | | | 3.252 ≤ 3.307 |

All eight M3 rows and R3′ pass on both seed sets.

### 6.3 M4 R1 (whole core binds, Q4), old and FRESH seeds

`m4-summits.mjs` (real parameters, 8 seeds, whole-core 64 km raster; summits per 1000 km², bound ≥ 8):

| World | Old 730201-208 + rock | **Fresh 730301-308** | **Fresh + rock** |
|---|---|---|---|
| Maithea | 40.72 | 39.94 | 40.03 |
| Selawyn | 22.34 | 21.28 | 21.06 |
| Raiva | 8.75 | **7.72 FAIL** | **7.66 FAIL** |
| Lethuris | 39.25 | 38.31 | 37.81 |

**Raiva R1 FAILS on the fresh seeds** (7.72 without rock, 7.66 with rock, bound 8; old seeds 8.59 at Q4, 8.75 here).
Per addendum item 3 this is reported as a failure and the seeds were not re-picked. It is not caused by T6: the
fresh no-rock column is M1-M4 alone. It confirms the overfitting caveat: Raiva's 7% margin (Q4) is inside the seed
spread. The axis and flank rasters stay INFO (Q4); fresh flank y = 0.4: Raiva 6.61 / 6.33 (old 7.12).
**Coordinator call, recorded (Opus 5.5 on Kasper's instruction; he may overrule):** this does not block the merge.
Reasons: (1) design §3 check 1 runs the metrics on the real field's belt sites, and there Raiva has 20.24 summits
per 1000 km² (below); (2) addendum item 3 prescribes reporting a fresh-seed failure, and the binding R1 pin in
`tests/terrain-mountains-assembly.test.mjs` (old seeds) still passes; (3) the cause is M2/M3 amplitude at low tau
(τ 0.456), an element question that the wiring cannot change. OPEN for Kasper (section 13).

The assembled density on the real field (8 real axis sites per world, the wired `terrainSampler`; not seed
dependent): Maithea 45.01, Selawyn 36.27, Raiva 20.24, Lethuris 29.20 per 1000 km² (main 0.00 / 0.54 / 0.00 /
0.00).

### 6.4 M5 on a new pool (731001-731008)

`m5-pool.json`: every row of the M5 "ROW gate" passes with the same pass rules (R1e 3.71 ≥ 2; R2 p50 38.12 / p90
45.24 ≤ 48.4; R3′ β 2.48 ≤ 3.25; R4 0.0001 ≤ 0.2; R5 fill 0.001 / pits 2.47; R6 0 new pits/km²), each negative
control fails as required. Wired, at 4 real axis sites per world (33 × 33 at 125 m): the truth is the carved
no-rock level minus the rock term, never above it (0 positive rock terms), rock depth p50 / p90 / max 0.7 / 39 / 81
(Maithea), 4.5 / 51 / 84 (Selawyn), 0.1 / 22 / 72 (Raiva), 1.7 / 44 / 97 m (Lethuris).

## 7. Cost

@@COST@@

## 8. Default `npm test` run time

Every default file as its own process, 4 at a time, main `9dcb1cf` then wired, under one test slot
(`suite-walltime-3.json`): **209 files, all exit 0 wired; summed wall time 779.8 s main → 935.1 s wired (+20%)**.
Before the decision-3 moves the same survey read 2,136 s with 4 files killed at the cap and 8 failing
(`suite-walltime-1.json`). 16 files more than double; M3 block solves per file from a counter preload
(`doubled-blocks.json`, in-process only):

| File | Main → wired (s) | Blocks | Cause |
|---|---|---|---|
| `terrain-budget-starvation` | 34.3 → 75.5 | 0 | the saturated renderer test builds many massif-touching tiles near [1,0,0]; M1/M2 per-sample and tile-level carving in worker-free builds (not attributed further) |
| `golden/perturbation` | 8.6 → 17.5 | 0 | golden generator on the wired truth (terrain/placeQuery sections), run twice |
| `terrain-relief-hypsometry` | 6.2 → 16.9 | 0 | level 0 over 410k + 20k directions: M1/M2 per-sample cost in the massifs |
| `render-bounds` | 5.0 → 16.4 | 55 | tile builds at their own level and truth seabed/descent poses |
| `terrain-floor-window` | 5.0 → 15.4 | 45 | the 512-direction shape test stays on the truth |
| `place-query` | 0.4 → 11.5 | 59 | `placeAt` stays on the truth (contract §8); identity over massif directions |
| `forest-habitat` | 0.2 → 5.1 | 26 | habitat sampling on the truth at massif patches |
| `acceptance/existence-gating` | 0.5 → 4.7 | 3 | truth surface at massif directions |
| `world-surface` | 1.0 → 4.6 | 1 | truth surface queries; layout build |
| `mountain-tile-set` (new) | — → 3.5 | 0 | M1 selection rule over 4 worlds |
| `landing-site` | 0.5 → 3.0 | 10 | landing on the truth after level-0 candidates |
| `acceptance/visit-order-independence` | 0.7 → 2.0 | 0 | layout and coarse field build |
| `planet` | 0.8 → 1.9 | 6 | truth samples at massif directions |
| `acceptance/climate-seek-independence` | 0.5 → 1.7 | 4 | as above |
| `ocean-gerstner` | 0.3 → 1.2 | 5 | as above |
| `planet-detail` | 0.2 → 0.6 | 2 | as above |

The largest file, `mountain-coarse-field`, is 106.9 → 113.4 s. `lod-carving-reduction` 49.6 → 47.9 s.

## 9. Golden (one re-pin)

@@GOLDEN@@

## 10. Luna (VISUAL-ADVISORY, UNCALIBRATED)

@@LUNA@@

## 11. Astra review

@@ASTRA@@

## 12. Gates run and not run

@@GATES@@

## 13. Open for Kasper

@@OPEN@@
