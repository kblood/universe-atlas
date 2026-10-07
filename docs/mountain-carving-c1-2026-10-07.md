# mountain-carving-3 / mountain-assembly-4: C1 carving height, C2 rock driver (terrain-1.9.1-carving-c1)

Branch `mountains/carving-c1`, staged. NOT for merge on its own: it rides the next `TERRAIN_VERSION` bump.

- Decisions: docs/fable-decision-carving-lattice-2026-10-07.md section 2 (first attempt) and section 2b, the addendum
  written after the pin failed. Both were decided by Fable 5.1 on Kasper's instruction and can be overruled.
- Cost-fair protocol (coordinator's quiet window, 2026-10-07): **run once, STOP.** Raiva orbit median 5.02 % > 5 %
  (every C1 cell MET). The cross-engine golden check and the GPU probe pair were **not run**, because step 2 runs only
  after the protocol passes. See section 5.

## 0. History: the design changed after the pin failed

1. **First attempt (7fb4850): Catmull-Rom for everything.**
   - The carving height C was a 4x4 Catmull-Rom of the stored cut fraction, and M5 rock read the same C.
   - Result: the HARD 200 m lattice pin **failed on the truth** at 9.34 / 8.22 / 1.36 / 0.57 dB (lattice x / y / d / d2,
     against a 4.7 dB limit).
   - Carving alone was fixed (rock off: 2.28 / -0.79 / 0.58 / 0.12).
   - M5 rock put the lattice back. It reads the slope of a C1 field, and that slope's magnitude kinks on every lattice
     line (rock alone: 10.29 dB).
   - Work stopped and was reported. Nothing was tuned.
2. **Addendum 2b: split fields.**
   - The carving height stays the vertex-exact Catmull-Rom.
   - M5 rock reads **all three** of its inputs from the C2 cubic B-spline of the same 16 stored taps: `U + Cb`,
     `U + Cbx`, `U + Cby`. C is never mixed into rock's finite difference.
   - **Unchanged:** the 4.7 dB pin, its midpoint rule and the negative control. The control was rewritten so that both
     kernels are triangle, which is main's semantics.
   - **New pre-registration** (stated before measuring): rock-off must equal 2.28 / -0.79 / 0.58 / 0.12 (the CR row);
     rock-alone must equal 2.43 / 1.82 / 1.07 / -0.32 (the bc diag row).
   - **Stop condition:** pooled truth > 4.7 dB.
3. **Point memo.**
   - The first attempt halved it to 2 x 2048 cells. That re-solved 266 blocks on pass 2 of the placeAt perf set.
   - It is now one clock (second-chance) table: 4096 slots, at most 3072 live cells, backward-shift deletion, same
     bytes.

## 1. Acceptance rows

### Step A: spectrum pin (smoke tier)

20 frozen massif tiles, truth, fine 256 x 50 m rasters aligned with the belt, pooled whitened spectrum. Values are
peakDb for lattice x / y / d / d2.

| row | main (triangle) | 7fb4850 (CR everywhere) | **this branch (split fields)** | limit / identity |
|---|---|---|---|---|
| truth, pooled (HARD) | 7.84 / 8.20 / 8.83 / 8.88 | 9.34 / 8.22 / 1.36 / 0.57 FAIL | **1.90 / -0.15 / 0.76 / -0.21 PASS** | max <= 4.7 |
| negative control: triangle height AND triangle rock driver (HARD) | | | **7.84 / 8.20 / 8.83 / 8.88 PASS** (max 8.88) | > 4.7 |
| 250 m gully cell, pooled (HARD) | 1.22 / 0.47 | 0.92 / 0.84 | **1.24 / 1.05 PASS** | < 4.7 |
| rock off (INFO) | 8.35 / 9.32 / 9.73 / 9.62 | 2.28 / -0.79 / 0.58 / 0.12 | **2.28 / -0.79 / 0.58 / 0.12** | = 2.28 / -0.79 / 0.58 / 0.12: **met exactly** (2.276823 / -0.785011 / 0.584037 / 0.116485 in both runs) |
| rock alone = truth - rock off (INFO) | 9.81 / 9.14 / 6.46 / 4.40 | 10.29 / 9.30 / 1.58 / 1.04 | **2.44 / 1.82 / 1.07 / -0.31** | = 2.43 / 1.82 / 1.07 / -0.32: within 0.012 dB, not exact (see below) |
| off-belt control (Part 2 INFO) | max 1.58 | | max 1.58 (unchanged) | |

**Why the rock-alone identity is close but not exact.**
- Full precision, branch: 2.44077 / 1.81582 / 1.06633 / -0.31132.
- Full precision, bc diag: 2.42890 / 1.81728 / 1.07127 / -0.31647.
- The rock term itself gets identical inputs in both runs (U + Cb and the two offsets).
- But "rock alone" is measured as truth minus rock-off **after** terrain.ts composes the floor. There,
  `upland = ss(HM0, HM1, floorM)` scales the detail term (src/terrain.ts:843-845), so the difference contains
  `detail x (upland(F + R) - upland(F))`, whose base F is U + C here and U + Cb in the diag.
- The 0.01 dB rounding flips (2.43 -> 2.44, -0.32 -> -0.31) come from that, not from the rock driver. The rock-off row,
  which has no such base change, matches bit for bit.

**Rock RMS** (median over the 20 tiles of the RMS of truth - rock off):
- main 16.70 m;
- CR-driven rock 18.43 m;
- **split fields 13.02 m**: -22 % vs main and -29 % vs the CR-driven rock. The addendum estimated -24 %, from 20.0 to 15.3 m.
- Max per tile: 29.03 -> 26.27 m.
- Reproduce: `test-results/mountains/carving-c1/diag.mjs`, with `diag-tri.json`, `diag-cr.json` (7fb4850) and
  `diag-split.json`.

### Step A: element tests (tests/mountain-carving.test.mjs, tests/mountain-carving-memo.test.mjs)

All 20 pass.

| test | result |
|---|---|
| CARVING_F_DIGEST (cold / warm / reverse / child process) | 1c94b28f... |
| CARVING_S_DIGEST (new, the same fixture through `carvingSmoothFM`) | 194bc671... (cold, reverse, child process) |
| exact +0 where no stencil tap is cut | 4000 uncut queries return +0 for both kernels; imported synthetic blocks, 0 builds |
| C1 straddle of the carving height (1246 lattice lines incl. block seams, h = 1 mm, limit 0.01) | Catmull-Rom 0 kinks (max 8.94e-5); triangle 1012/1246 (max 4) |
| **C2 straddle of the rock driver** (curvature jump x cell, same lines) | B-spline 0 jumps (max 3.55e-3); Catmull-Rom control 1140/1246 (max 6.58) |
| `Cb <= 0` and `U + Cb >= 0` on the ramp, +0 at exclusions | 0 violations |
| smooth point-memo bit identity | cold, warm, interleaved (point, block and CR-then-smooth), aged (SLOTS 16 / FILL 12: 15,479 evictions, 29 hits) |

### Step B: point memo

- **Memory:** one table, 4096 x 85 B = 348,160 B. Blocks: 32 x 252,044 = 8,065,408 B. Total **8,413,568 B** <= 8.5e6.
- **Perf set** (`test-results/mountains/carving-c1/cells.mjs`, 40,000 placeAt points):
  - pass 1: 935 builds, 2146 stores, 0 evictions, 141 s;
  - **pass 2: 0 builds**, 7518 hits, 0.1 s.
  - The halved first attempt re-solved 266 blocks on pass 2.
- **Rows:** in tests/perf/place-query.perf.test.mjs, inside `npm run test:perf`.

  | row | result | limit |
  |---|---|---|
  | W | 0 main-thread solves, first-pass p50 16.3 µs | <= 60 µs |
  | F | 157.4 ms per solve | <= 250 ms |
  | best-of-3 x 40,000 | 1.84 µs (2.79 µs in a standalone run) | strict 3 µs |

### Step C1: version bump, re-pins, identity

- **Identity vs main** (`test-results/mountains/carving-c1/belt-identity.mjs`):
  - The test compared the whole sample (height, ocean, colour, roughness) on 4 worlds x 15,120 directions (the T3 set).
  - belt = 0: **0 mismatches**. Maithea 3870, Selawyn 3935, Raiva 3880, Lethuris 3939 directions.
  - Outside the massif: 0 mismatches.
  - In the massif, every direction moved (10,838-10,896 per world; max |dh| 151-189 m).
- **The other pins (`test:full` pass):**
  - level-0 identity outside the belts;
  - the truth identity outside the belts;
  - ocean-flag identity at level 0;
  - outsideBelt/outsideMassif identity vs main in terrain-mountains-assembly.
- **tsc:** clean.

### Step C2: `test:pkg` for the mountain-* files, lod-carving-reduction, lod-coarse-frame and terrain-mountains-assembly

160 tests: 158 pass, 2 skipped (test:full only), 0 fail. That count is after the M4 reduced-fixture digest was re-pinned:
the first run failed only that digest, while that test's judge rows passed.

### Step C3: M3 eight rows, both pools, no re-tuning (`test-results/mountains/carving-c1/m3-rows.mjs`)

This is the T6 script, changed only so that rock reads U + Cb, U + Cbx, U + Cby.
- **training** = seeds 730201-08;
- **held-out** = seeds 730301-08.

Rows are given as no rock / with rock:

| row | limit | training, T6 | **training, C1** | held-out, T6 | **held-out, C1** |
|---|---|---|---|---|---|
| slope125Over30 % | | 69.74 / 67.94 | **69.75 / 67.75** | 69.58 / 67.65 | **69.59 / 67.44** |
| slope125P50 deg | | 37.81 / 37.78 | **37.82 / 37.43** | 37.66 / 37.63 | **37.66 / 37.30** |
| flank500mP50 | | 20.7 / 20.7 | **20.7 / 20.7** | 20.5 / 20.6 | **20.5 / 20.6** |
| relief8kmP50 m | | 1574 / 1561 | **1574 / 1563** | 1573 / 1561 | **1573 / 1564** |
| beta500mTo8km | | 2.29 / 2.25 | **2.21 / 2.17** | 2.30 / 2.25 | **2.21 / 2.18** |
| fill10ShareP50 | | 0.004 / 0.005 | **0.004 / 0.007** | 0.004 / 0.005 | **0.004 / 0.007** |
| pits025Per1000km2P50 | | 3.9 / 3.5 | **3.9 / 4.3** | 4.3 / 5.6 | **4.3 / 6.0** |
| axisCoherence40kmP50 | | 0.224 / 0.223 | **0.223 / 0.224** | 0.237 / 0.238 | **0.237 / 0.238** |

**All eight rows pass on both pools, with and without rock.**

**M4, Raiva whole-core R1 (hard reject at < 8)**, from `test-results/mountains/t6-wiring/m4-summits.mjs`, PART2=0:

| run | T6 | **C1** |
|---|---|---|
| training, no rock | | **9.38** |
| training, rock | 8.75 | **9.28** |
| held-out, no rock | 7.72 FAIL | **8.19** |
| held-out, rock | 7.66 FAIL | **8.22** |

- The M4 gate rows pass 20/20 in all four runs (T6's held-out runs: 19/20).
- Whole-core R1 of the other worlds (training, rock): Maithea 44.00, Selawyn 24.59, Lethuris 42.41.
- The element contract (Raiva tau, 8 seeds) gives 9.375.

**M5 real-M3 margins (INFO, as the decision classes them).** Training / held-out:

| margin | T6 | **C1** | limit |
|---|---|---|---|
| R2 slope p90 | 48.25 / 48.16 | **48.72 / 48.62** | 48.4: **crossed on both pools** |
| R2 slope125 p50 drop, no rock -> rock | -0.16 / -0.12 | **-0.74 / -0.62** | <= 0.5°: **crossed on both pools** (under-reported in the first version of this doc) |
| R3' beta | 3.280 / 3.252 | **3.3675 / 3.3368** | 3.3666 / 3.3637: **crossed on training by 0.0009**; held-out passes |
| R1e ratio | 3.07 / 3.03 | **3.07 / 3.02** | |
| R2 pits025 | 4.94 / 17.3 | **4.94 / 19.8** | |
| R1 steep RMS | 45.5 / 45.6 | **49.5 / 49.8** | |

- The R3' limit is derived from each pool's no-rock beta, which itself rose from 3.668 to 3.741 with the Catmull-Rom
  height.
- These are the thin M5 margins the decision flagged (section 2: "slope p90 48.25 vs 48.4, R3' 3.28 vs 3.32"). Both were
  already close in T6. On real M3 they now sit just past their INFO limits.
- They are reported, not tuned.

**Attribution (verified from the `fine` blocks of `m3-rows.json`, T6 = the 2026-09-13 review copy, identical to
`test-results/mountains/t6-wiring/m3-rows.json`):**

| quantity, training / held-out | T6 | C1 |
|---|---|---|
| R2 p50, no rock | 41.3800 / 40.8925 | 41.3800 / 40.8925 (identical to four decimals) |
| R2 p90, no rock | 46.9945 / 46.9266 | 46.9945 / 46.9266 (identical to four decimals) |
| R2 p50, rock | 41.2194 / 40.7711 | 40.6378 / 40.2768 |
| R2 p90, rock (rock's own increment) | 48.2506 / 48.1566 (+1.26 / +1.23) | 48.7212 / 48.6223 (**+1.73 / +1.70**) |
| R3' closure of the no-rock -> alpine gap (rule: >= one third) | 36.9 % / 38.7 % | **33.25 % / 35.7 %** |

- No-rock R2 is unchanged by the Catmull-Rom height, so the whole R2 move is the C2 rock driver.
- The rock-off R3 beta did move (3.668 -> 3.741 training), which raised the R3' bar. The training closure, 33.25 %
  against the one-third rule, is a miss by 0.0009 in beta.

**INFO attribution control: the rock driver switched back to Catmull-Rom.**
- Script: `test-results/mountains/carving-c1/m3-rows-crdriver.mjs`, output `m3-rows-crdriver.json` and `.log`. It was run
  under the test slot and took 154 s for both pools.
- It is identical to `m3-rows.mjs` except that rock reads U+C, U+Cx and U+Cy from `carvingFM` (7fb4850 semantics)
  instead of `carvingSmoothFM`. The carving height is Catmull-Rom in all three columns below; only the driver differs.

| training / held-out | T6 (triangle height and driver) | CR driver (control) | C2 driver (this branch) |
|---|---|---|---|
| R2 p50 drop | -0.16 / -0.12 | **-0.16 / -0.12** | -0.74 / -0.62 |
| R2 p90, rock (increment) | 48.2506 / 48.1566 (+1.26 / +1.23) | **48.2506 / 48.1566 (+1.26 / +1.23)** | 48.7212 / 48.6223 (+1.73 / +1.70) |
| R3' beta / limit | 3.2798 / 3.3175, 3.2520 / 3.3074 | **3.2980 / 3.3666, 3.2750 / 3.3637 (pass, pass)** | 3.3675 / 3.3666, 3.3368 / 3.3637 |
| R3' closure | 36.9 % / 38.7 % | **39.4 % / 41.3 %** | 33.25 % / 35.7 % |

- **The rows are not unchanged under the CR driver, so the stop condition is not met.**
- Switching the driver back to Catmull-Rom restores R2 and R3' fully. The R2 move, and the R3' miss, therefore belong
  to the C2 driver, which confirms the attribution.
- **Caveat:** the CR-driver R2 equals T6's triangle values to about 5e-6°. The coarse R2 raster evidently samples at
  (or next to) carving lattice vertices. Every interpolating kernel reproduces the stored value there, so R2 cannot
  tell Catmull-Rom from triangle.
- The B-spline is approximating. At a vertex it returns the [1, 4, 1] / 6 smoothed value, so R2 sees the driver's
  smoothing directly. This is consistent with, and sharper than, the "spatially coherent benches" reading. The visual
  check is still the probe pair.
- R1 steep RMS is 49.6 / 49.8 under the CR driver against 49.5 / 49.8 under C2. Its rise from T6's 45.5 / 45.6
  therefore comes from the Catmull-Rom height, not the driver.

**Decision (Fable 5.1, section 2c(1), on Kasper's instruction, overrulable):**
- These rows stay **INFO**. They are not blocking and not re-registered. The HARD M5 gate is the synthetic pool, which
  this branch cannot move.
- The signature (median flattening, tail steepening, unchanged steep-band detail, rock RMS -22 %) points to the M5
  benches becoming spatially coherent under the C2 driver.
- The real check is visual and is routed to the GPU probe pair's after-frame. That frame looks for bench or contour
  striping, or blocky steps, that are visibly stronger than in the before-frame.

### Step C4: cost

**In-massif warm bench** (`test-results/mountains/carving-c1/inmassif-bench.mjs`):
- method: `mountainRidgeTermM`, carve = true, Raiva tau, 4096 cached inputs, 9 x 1e6 calls;
- main and the branch alternated, 3 runs each;
- results are the median ns per in-massif sample.

| | main (carving-2 / assembly-3) | **branch (carving-3 / assembly-4)** | delta |
|---|---|---|---|
| carving, no rock | 57.0 / 56.7 / 57.4 | **55.6 / 55.8 / 55.1** | -1.5 ns (-3 %) |
| carving + rock | 189.8 / 190.6 / 189.7 | **239.0 / 225.9 / 228.0** | **+38..49 ns (+20..26 %)** |

The extra cost at rock levels comes from one more carving evaluation, the smoothed value at the sample. The two offsets
were already evaluated before, now through the B-spline. The addendum estimated +10..15 ns: **measured higher, report
only**. Levels below `rockDetailFromLevel` (rock = false) and the orbit bake are unchanged in cost. The cost-fair
protocol, which measures the real tile cost, is the coordinator's: see section 5 (STOP on Raiva orbit 5.02 %).

**M5 micro-bench** (`ATLAS_M5_BENCH=1`, tests/mountain-rock-detail.test.mjs, synthetic, no carving involved):
- rock: main 50.4 / 50.4 ns, branch 49.7 / 50.7 ns;
- add-on: main 130.0 / 131.6 ns, branch 129.8 / 130.8 ns (limit 214);
- unchanged, as expected.

**`npm run test:perf`:** 12 pass, 0 fail, 1 skipped (the eco-class quiet-host acceptance, which is OPEN on main).

### Step C5: suites

- `test:affected --base main`: 48 changed files, 89 selected. 725 tests: 712 pass, 0 fail, 11 skipped. Two known
  OPEN/NOT MET todo rows (SITE_A ring, rocky corpus Spearman), the same as main.
- `test:full`: see section 3.

## 2. Ledger (old -> new)

| item | old (main ada9dae) | new |
|---|---|---|
| `MOUNTAIN_CARVING_VERSION` | mountain-carving-2 | mountain-carving-3 (`MOUNTAIN_CARVING.INTERPOLANT: 'catmull-rom'` added; other constants unchanged) |
| `MOUNTAIN_ASSEMBLY_VERSION` | mountain-assembly-3 | mountain-assembly-4 (rock = false bit-identical to -3) |
| `TERRAIN_VERSION` | terrain-1.9.0-mountains | terrain-1.9.1-carving-c1 |
| `MOUNTAIN_ROCK_DETAIL_VERSION`, `LOD_LADDER_VERSION`, `SURVEY_VERSION`, `MASSIF_ENVELOPE_VERSION`, `OROGEN_LAYOUT_VERSION` | | unchanged |
| block storage | `r` Float32 retained, 481 x 129 = 248,196 B | `cut` Float32 cut fraction, 481 x 131 (block-local columns -1..129) = 252,044 B |
| point memo | 2 generations x 4096 slots x 37 B (4 corners) = 303,104 B | 1 clock table, 4096 slots x 85 B (16 taps), FILL 3072 = 348,160 B |
| memo total | 32 x 248,196 + 303,104 = 8,245,376 B | 32 x 252,044 + 348,160 = 8,413,568 B (bound 8.5e6 unchanged) |
| `CARVING_F_DIGEST` | 1321803fcd6ba5b03fa009035154a025aefff6a2a5bf1442e9e4cf902443cfee | 1c94b28fde21ee4a55894303b28c19a50ded833f6135d58563b81f412bb3c2bd |
| `CARVING_S_DIGEST` | (new) | 194bc67183744abda59192967c929ae35d0a54428674b7a02cc2bd7c4a2c570c |
| 129-square metric pin | slope 79.8, P50 42.2, flank 24.2, relief 1908, beta 2.41, fill 0.007, pits 0, coherence 0.192 | flank **24.3**, beta **2.33**, coherence **0.186**; the other five unchanged |
| M4 reduced fixture raster digest | 4e470f04b8ce224b32852d6a99b6ef15ef6faf360bc5758e1ecf62803d315386 | 3e9d3367610ecabddcc8210742237f728d60e91149787dda4fd374ef80b3ba52 (judge rows pass: density 45.93, placement 1) |
| `MOUNTAINS_TRUTH_SHA256` (test:full) | 7de7c8f7d73fe535435522f2d158bccc654f833eee81c1e9b6acb286f79fb3cd | 46ecb662891719725b26eb98a1e600f769efd99f71a41ed08f3227028832a5cd |
| `MOUNTAINS_LEVEL0_SHA256`, `KEPT_PALETTE_COLOUR_SHA256` | | unchanged |
| `COST_IDENTITY[0]` (L(cut-1), uncarved), `COST_SAMPLER_IDENTITY[0]` | | unchanged |
| `COST_IDENTITY[1]` Maithea | 00446f5a... | 026b284a69284619fbd031dea0ee77ea3e64af5763e972fc0f4b04a8f395a342 |
| `COST_IDENTITY[1]` Selawyn | fa4de7c2... | acda960fecf57667d934cb54e9f93a8dfa8fa8578156a16eb9d0867e8defe32d |
| `COST_IDENTITY[1]` Raiva | 134db519... | 5a947b9d9e2855db1eee89416604c31501c2109ae87fff7908fff3c8b0f7fe34 |
| `COST_IDENTITY[1]` Lethuris | c3574bed... | 2c4088746ba0d5d054f922c2e5aa3ba441cdc2641401b71f128e8e1f6dba03c5 |
| `COST_SAMPLER_IDENTITY[1]` (carved, no rock) | Maithea a49cc5e1..., Selawyn efba81af..., Raiva 3c9b85ba..., Lethuris 72ca784c... | 8fc436b6..., 667a16d6..., 84c0f1e0..., cb266bda... |
| `COST_SAMPLER_IDENTITY[2]` (truth and rock levels) | Maithea 9fd0dcf1..., Selawyn f0d4b21f..., Raiva ae4c6a53..., Lethuris 2783f372... | 0bd5ce54..., 63392837..., 86503962..., 16773c77... |
| golden `biomes` | 5bbf5a1c6c5d0ec2277eec1c365795e11a3454c45d0768217889c6d443e1961a | f60bb445d88b84550ac9fba5c3737dd6556079c2831f7f4f444b7e280063fb6d |
| golden `placeQuery` | a5d9e5cc7287266cf85ecba029715a786d72d20e2dddbfa11a2d1c8e3144a569 | 52ad8f99ebbc8fb1dd0c00069cd386ed24dc9e6e5456b672fc299a053715d456 |
| golden `census` | d63ad49733eaa56debcc4fadb05d1baaf793d6e2a6cadfecbfa65d7951a91627 | 060898a2699af91770d2b668b45a14275ac92984920e4102da4bde38db45ef35 |
| golden `rocks` | f0697d6854d51876c6353ca63c9d86395b1776249373bb1395dc9fd2cfcb4477 | fa0621596e359811f862e33e6e80765f9a50467255b6d1d23d3c5e65209c237c |
| golden `terrain` and every other section | | unchanged |
| tests/tier-sets.json | inputs.TERRAIN_VERSION terrain-1.9.0-mountains | terrain-1.9.1-carving-c1; history entry added; **same tiles** (sha 90bb43c0 unchanged) |
| tests/tiers.json | spectrum shards `^INFO: real` | smoke and work: `^INFO: real`, `^HARD: real` (authorised by the coordinator); `all` unchanged |
| version-string pins | version-compat, inland-rivers-disabled, river-terrain (geologyVersion), terrain-climate-colour, terrain-relief-hypsometry, lod-carving-reduction, terrain-mountains-assembly (version tuple) | moved |

- **Golden:** re-pinned from `node tests/golden/node-run.mjs` (Node only). **The cross-engine check
  (`run-cross-engine.mjs`) is pending**: it needs headless browsers under the GPU lock, which this agent does not run.
- **SURVEY_VERSION:** no survey pin failed in test:affected or test:full, so it stays put.

## 3. test:full

**GREEN.** 214 files in 247 steps, 247/247 steps exited 0.

| result | count |
|---|---|
| tests | 1610 |
| pass | 1603 |
| fail | 0 |
| skip | 5 |
| todo | 2 |

- Known failures matched: 0. New failures: 0. Stale known entries: 0.
- Wall 592.1 s; peak step RSS 1235 MiB.
- Log: test-results/tiers/4df66f0a676b-full-2026-10-07T10-18-04-717Z.

## 4. Pending, and not this agent's

- Cost-fair protocol: **run, STOP** (section 5).
- GPU probe pair (Maithea massif, L11-L13, low sun) and the golden cross-engine run: **not run**, because the protocol
  STOPped first.
- **Decided (section 2c):** the crossed M5 margins stay INFO. The cost protocol runs as is, with REF = `9dcb1cf`
  (GATE-1 REF), REF2 an identical export, and CAND = the branch tip. Merge follows only after these, in order: the
  protocol passes, the cross-engine golden check shows 0 mismatches, and the probe pair shows no visual STOP.

### Backlog (not implemented): fused carving lookups

- **What:** one gate pass and one cell/offset computation, shared by C and Cb at the base point. Cbx and Cby are
  computed in the same call. This replaces the four independent `ridgeValleyCarving*M` calls on the rock path.
- **Acceptance:**
  - every digest unchanged: `CARVING_F_DIGEST`, `CARVING_S_DIGEST`, `COST_IDENTITY`, golden and `MOUNTAINS_TRUTH_SHA256`;
  - `inmassif-bench.mjs` carving + rock <= main + 15 ns.
- **Expected gain:** about 15-25 ns recoverable of the measured +38..49 ns.
- **When:** with the next terrain change. Per section 2c(2), it becomes mandatory, and is followed by a new counted run,
  if the cost-fair protocol STOPs. It moves to the top of the backlog if Maithea lands in (7, 8] %.

## 5. Cost-fair protocol, quiet window 2026-10-07 (coordinator; counted once): STOP on Raiva orbit

- **Authority.** Fable 5.1, section 2c(2) and 2c(3), decided on Kasper's instruction and overrulable. The protocol is
  addendum (6) Q-A and the harness is addendum (7), both unchanged.
- **Pre-registration.** Committed before the first counted process, as `fc5975f`
  (`docs/quiet-window-2026-10-07/gate-c1/prereg.txt`). Expected C1: Maithea ~5.98, Selawyn ~2.94, Raiva ~4.77, Lethuris
  ~5.23 %. Orbit expected unchanged. STOP rule: any C1 median > 8 % or any orbit median > 5 % means no rerun.
- **Arms.** All three are `git archive` exports with one `node_modules` junction to main's:
  - REF = `9dcb1cf`, terrain-1.8.1-grain. This is the **unwired** build, because the budgets are cumulative against it.
  - REF2 = a second export of `9dcb1cf`, identical (`diff -rq` empty).
  - CAND = `b84bcf9`, terrain-1.9.1-carving-c1, wired.
- **Harness.** Main's checkout `581a484`, whose `scripts/cost-fair` is identical to the branch's.
  - Command: `REF_SHA=9dcb1cf… OUT=test-results/gate-c1/fair N=30 sh scripts/cost-fair/run.sh`. It took the exclusive slot
    once.
  - Then `node scripts/cost-fair/analyze.mjs test-results/gate-c1/fair`.
- **Run.**
  - Wall: 10:45:25Z to 12:24:19Z.
  - Exits: 480/480 exit 0, `failed=0`, `orbit.err` empty.
  - Point sets: the eight `.f64` sha256 equal GATE-1's.
  - The records confirm the arms. A/B is 1.8.1/unwired against 1.9.1-carving-c1/wired; A/A is 1.8.1 against 1.8.1.
  - Orbit bakes: every A/A pair is byte-identical, every A/B pair differs, and there are 0 block solves in the timed bakes.

| World | C1 A/B [CI] | A/A [CI] | C1 judged (<= 8) | Orbit A/B [CI] | A/A [CI] | Orbit judged (<= 5) |
|---|---|---|---:|---|---|---:|
| Maithea | 6.89 [3.76, 8.55] | -0.08 [-1.62, 1.02] | **6.89 MET** | 4.68 [1.89, 5.50] | 0.89 [-1.95, 1.44] | **4.68 MET** |
| Selawyn | 1.75 [-0.33, 3.04] | -0.65 [-3.09, 1.02] | **1.75 MET** | 2.83 [1.75, 5.11] | -0.50 [-1.96, 1.06] | **2.83 MET** |
| Raiva | 6.08 [3.98, 6.82] | -0.49 [-2.05, 0.44] | **6.08 MET** | 5.02 [3.30, 5.46] | -0.51 [-2.40, 0.30] | **5.02 NOT MET** |
| Lethuris | 4.35 [3.67, 6.10] | 0.57 [-0.51, 2.31] | **4.35 MET** | 2.63 [0.65, 4.26] | -0.35 [-1.61, 0.77] | **2.63 MET** |

**Verdict.**
- No cell shows a demonstrated A/A bias, so each judged value is the A/B median. **ALL MET: false.**
- **STOP:** Raiva orbit 5.02 % > 5 %. There is no rerun, and the cross-engine golden check and the GPU probe pair were not
  run.
- The section 2c(3) remedy (the fused-lookup refactor, then a new counted run) targets C1. The cell that failed is orbit,
  which the decision expected to be untouched. The next step therefore needs a decision; this agent did not take one.

**INFO only (none of this changes the verdict).**
- **Raiva orbit, per process.** The sorted A/B values run from -2.59 to 8.88. The two middle values are 5.00 and 5.04,
  so the median 5.02 lies 0.02 points over the budget. The value also falls inside GATE-1's own Raiva CI
  [2.94, 5.49].
- **The orbit bake output did not change since GATE-1.**
  - CAND's orbit digests equal GATE-1's CAND (`772cad3`) on all four worlds.
  - `git diff 772cad3 b84bcf9 -- src` touches only `mountain-carving.ts`, `mountain-assembly.ts` (the rock inputs),
    `place-query.ts` and `terrain.ts` (an import and the version string).
  - Orbit medians nevertheless rose against GATE-1, from 3.08 / 2.50 / 4.36 / 1.64 to 4.68 / 2.83 / 5.02 / 2.63.
  - Whether that is run-to-run noise (the documented per-run spread is -9..+10 %) or a real cost is **not established**.
- **C1 against expectation.** Measured 6.89 / 1.75 / 6.08 / 4.35, expected 5.98 / 2.94 / 4.77 / 5.23. Maithea's CI upper
  bound, 8.55 %, is above 8 %.
  - Outside massifs, A/B: +3.26 / -0.14 / +3.32 / +2.71 %.
  - In-massif, A/B: +161 / +139 / +137 / +176 %.
- **Pre-check.**
  - 33 of 480 processes were flagged (20 C1, 13 orbit).
  - All of them were short host-idle waits; no contender counted.
  - Waits totalled 1,455 s, and the minimum idle was 85 %.
  - Excluding the flagged processes: C1 6.89 / 1.50 / 6.12 / 4.20, orbit 4.68 / 3.60 / 5.06 / 2.66.
- **Evidence.** `docs/quiet-window-2026-10-07/gate-c1/` holds:
  - `prereg.txt` and `verdict.txt`;
  - the analysis (`analysis.txt`, `analysis.json`);
  - the records (`c1.jsonl`, `orbit.jsonl`), the logs (`exits.log`, `c1.log`, `orbit.err`) and `protocol.txt`;
  - `precheck.jsonl` and `baseline.json`;
  - the point-set metadata (`points-*.json`, `points-f64.sha256`, `points-source.jsonl`);
  - `sensitivity-info.txt` and `started.txt`.
  - The per-record files are in the git-ignored `test-results/gate-c1/fair/rec/` in main's checkout.
- **Cleanup.** The arms were removed, the junction first with `cmd /c rmdir`; main's `node_modules` is intact. No slot,
  shared holder or GPU lock is held.
