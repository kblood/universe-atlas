# Mountains cost plan T4: sparse `terrainSampler` consumers — evidence, 2026-10-06

Task: T4 of `docs/mountains-opus-decisions-2026-10-05.md` (task table row T4). Branch `mountains/t4-sparse`
(worktree `universe-atlas-wt/t4-sparse`), on top of main `85d1e44` (T3 merged staged). The mountains stay
**staged** (`TERRAIN_MOUNTAINS_WIRED = false`): every change here is output-neutral on main. The "wired" numbers
below come from a scratch copy with the constant flipped, or from the test-only load hook
`tests/helpers/wire-mountains.mjs`. That is the same flip T6 makes.

**Summary.**

- **(1) Block solves: MET.** Three sparse-global callers now sample lod-ladder-2 **level 0**, the S0 reduction:
  the orbit bake (`planetSurface`), the ocean hypsometry and the surface survey. With the mountains wired they
  solve **0** M3 blocks on all four worlds. Before this change they solved 4,075 blocks for one Maithea orbit
  bake (642 s), 57-99 for the hypsometry (9-15 s) and 17-36 for the survey (2.7-6.5 s). Some callers keep the
  truth by design, and their counts are documented below:
  - the golden capture solves 17 + 17 blocks, because it pins the truth;
  - `placeAt` solves 1 block on first touch of a massif, because contract §8 keeps place queries on the truth;
  - `main.ts`'s global landing and habitat searches solve 5-20 blocks (section 2a). Astra found these in review,
    together with a landing summit-cutoff shift that is OPEN for T6.
- **(2) Orbit bake <= main +5%: NOT MET when wired; met as shipped.** On the branch as it merges (staged), the
  orbit bake is byte-identical to main and costs the same (A/A -1.3..+3.0%). With the mountains wired, at level 0
  and with 0 block solves, the bake costs **+19..+27%** against main on all four worlds. The excess is the
  per-sample cost of M1 + M2 inside the core `sample`. It is the unresolved V8 codegen problem that T3 carried
  OPEN into T6 (addendum 2026-10-06 (3)). It is not M3, and it is not in a caller. T4 owns only the callers'
  level argument, and the callers' level argument has already removed all M3 work. See section 4 for the bounded
  attempt.
- **(3) Default `npm test` wall time, wired vs off: listed.** 21 of 205 files more than double when wired, each listed
  with its cause in section 5. In 12 of them the cause is M3 block solves from truth (or carved-level) samplers at many directions (up
  to 4,672 blocks, 18 min). One, `terrain-relief-hypsometry`, exceeds the 40 min cap. The suite total grows from
  666 s to 5,859 s. Fixing this is OPEN for T6 (the tests pin the truth; T4 owns callers only).
- **T5 is not triggered.** On 96 cold massif tiles at L(cut)..L(cut)+2, the worst cold build is 1,354 ms
  (Raiva L5, 8 blocks), under the 2 s bound of (C3). See section 6.
- **Versions:** none move. `SURVEY_VERSION` stays, because no survey value moves while unwired. It moves at T6
  with the wiring, as the T4 row expects.

## 1. Caller classification

The listed `terrainSampler` callers outside `terrain.ts`, plus the in-file orbit bake:

| Caller | Use | Class | Sampler after T4 |
|---|---|---|---|
| `terrain.ts` `planetSurface` (orbit bake, main.ts / worker.ts `surface` job) | 1024 x 192 grid, ~32 km texel at the equator | **sparse-global** | level 0 |
| `ocean-volume.ts` `oceanHypsometry` | 4096 Fibonacci directions, ~290 km apart | **sparse-global** | level 0 |
| `surface-survey.ts` `surfaceSurvey` | 1536 candidates over the sphere, picked from orbit | **sparse-global** | level 0 |
| `planet-tiles.ts` `buildTile` (child + parent sampler) | tile vertices | dense-local, per tile level | `lodLevel = tile.level` (T3) |
| `planet-tiles.ts` `surfaceNormal` (default sampler) | survey normals (the survey passes its own level-0 sampler) | follows its caller | caller's |
| `planet-renderer.ts` (804, 1203) | eye ground, rock probe, life near the viewer | dense-local | truth |
| `planet-forest.ts` (242, 684) | tree placement around the viewer | dense-local | truth |
| `forest-census.ts` | forest patches at `FOREST_CELL_M`, near the viewer | dense-local | truth |
| `travel.ts` `surfaceClearance` | collision clearance | dense-local, contract §8 | truth |
| `world-surface.ts` `surfaceQuery` | collision / walking ground | dense-local, contract §8 | truth |
| `place-query.ts` `placeAt` (through `surfaceQuery`) | point query | dense-local, contract §8 | truth (1 block per first massif touch) |
| `main.ts` `exploreTerrain` → `pickLandingSite` (through `surfaceFor` → `surfaceQuery`) | 384 global landing candidates | **sparse-global, kept on the truth** (landing eligibility is judged on the ground actually landed on); not a T4-owned file | truth: **5-9 blocks** (0.8-1.5 s), section 2a |
| `main.ts` `exploreTerrain(preferLife)` habitat search (same sampler) | 1024 global candidates | **sparse-global, kept on the truth**; not a T4-owned file | truth: **15-20 blocks** (2.6-3.8 s), section 2a |
| `planet-renderer.ts` `landPercentileM` (landing summit cutoff p99, reference p90) | reads the ocean hypsometry | follows `oceanHypsometry` | level 0 (upper envelope), section 2a |
| `tests/golden/generator.ts` | pins the truth (terrain, ocean, place, census, rock) | pin | truth (17 + 17 blocks, documented) |

**Why level 0 is exact where it matters.** The carving acts only on land (a0 >= 0, where every height is >= 0 at
sea level 0). The hypsometry therefore has the same heights below 0 on both samplers, and with them V(L) for
every L <= 0, `fullVolume`, `levelForLoss` and `lossForLevel`. Only land heights inside massifs differ: they are
the upper envelope. This is measured, not assumed (`test-results/mountains/t4/hypsometry-identity.json`, mountains
wired, truth vs level 0, 4096 directions per world):

| World | Truth block solves (ms) | Heights < 0 differing | Sign flips | Land heights differing (max delta) | fullVolume, belowZero, min, levels at 5 losses |
|---|---|---|---|---|---|
| Maithea | 99 (19.4 s) | 0 | 0 | 99 (1,282 m) | identical |
| Selawyn | 57 (11.3 s) | 0 | 0 | 57 (991 m) | identical |
| Raiva | 71 (13.7 s) | 0 | 0 | 71 (950 m) | identical |
| Lethuris | 57 (11.6 s) | 0 | 0 | 57 (1,135 m) | identical |

The survey uses its samples to pick candidate sites, ranked by biome, elevation and slope. In a carved massif a
site's listed elevation and slope are therefore the uncarved values. Landing and walking use the truth.

## 2. Block-solve audit (target 1)

`test-results/mountains/t4/audit.mjs`, one caller, one world, one fresh process each. Counter:
`carvingBuildStats.count`. BEFORE = the wired tree with the callers as on main (truth). AFTER = the wired tree
with T4's level-0 callers.

| Caller | Maithea | Selawyn | Raiva | Lethuris |
|---|---|---|---|---|
| Orbit bake, before | **4,075 (642.5 s)** | not run (capped, see below) | not run | not run |
| Orbit bake, after | **0** (420 ms) | **0** (390 ms) | **0** (410 ms) | **0** (404 ms) |
| Ocean hypsometry, before | 99 (15.0 s) | 57 (9.0 s) | 71 (14.0 s) | 57 (12.5 s) |
| Ocean hypsometry, after | **0** (69 ms) | **0** (71 ms) | **0** (50 ms) | **0** (82 ms) |
| Survey, before | 36 (6.5 s) | 17 (2.7 s) | 25 (4.2 s) | 17 (2.7 s) |
| Survey, after (sites) | **0** (5) | **0** (4) | **0** (4) | **0** (5) |
| `placeAt` warm-up (dated resolution), before | 100 (19.5 s) | 57 (9.5 s) | 71 (11.6 s) | 57 (9.1 s) |
| `placeAt` warm-up, after | 1 (227 ms) | 0 (78 ms) | 0 (57 ms) | 0 (81 ms) |
| `placeAt` golden directions (24, measured slope), after | 0 | 1 (144 ms) | 1 (149 ms) | 0 |
| `placeAt` massif axis site: first touch / repeat, after | 1 / 0 | 1 / 0 | 1 / 0 | 1 / 0 |

Survey sites before and after are the same count (5/4/4/5).

The BEFORE orbit run was stopped after Maithea: one world took 10.7 minutes, and the count, thousands of blocks,
already makes the point.

The `placeAt` warm-up drops from 57-100 blocks to 0-1 because the dated resolution builds the ocean hypsometry,
which is now level 0. The `placeAt` queries themselves stay on the truth (contract §8): each first touch of a
massif solves one block (~150 ms), and a repeat solves 0 (the M3 memo).

Golden capture, AFTER, wired, all sections, truth by design:

| Section | Block solves | ms |
|---|---|---|
| `computeGolden()` (terrain, biome, ocean, place, census, rock) | 17 | 6,882 |
| `platformSectionLines('golden')` | 17 | 3,752 |

These are documented counts, as the T4 row allows ("unless documented with a count"). The golden pins the truth.
Moving it to level 0 would stop it pinning the carving.

**Regression test** (`tests/sparse-consumer-levels.test.mjs`, registered in `npm test`, ~3 s). A child process
loads `src/terrain.ts` with the constant flipped by a load hook, and runs the three callers unmodified on all
four worlds. It asserts:

- 0 block solves for each caller;
- the orbit elevation grid equals the level-0 sampler at every grid point;
- the bake still carries the massifs. It is raised against the mountains-off field at 565 / 173 / 295 / 215 grid
  points, so the check is not vacuous.

Two more checks guard the test itself:

- **Negative control:** the truth sampler at a massif axis site solves a block.
- **Rename guard:** a check that the hook still matches the real constant, so a rename cannot leave the child
  silently unwired.

A source check also pins which callers pass level 0 and which keep the truth.

## 2a. Landing searches and the summit cutoff (Astra review follow-up)

Astra's review found two consumers the first audit missed. Both live in `main.ts`, which is not a T4-owned file.

- **The global landing searches.** `exploreTerrain` samples 384 candidates (`pickLandingSite`), or 1024 for the
  habitat search, through `surfaceFor` → `world-surface.ts` `surfaceQuery` → `terrainSampler(body)`, which is the
  truth.
- **The landing summit cutoff.** `landPercentileM(body, .99, sea)` (`planet-renderer.ts`) reads the ocean
  hypsometry. Since T4 that hypsometry is level 0, so its land percentiles are the upper envelope.

`test-results/mountains/t4/landing-consumers.mjs`, raw data in `landing-consumers.json`. Method:

- mountains wired, one fresh process per world;
- percentiles over sea level 0, by `landPercentileM`'s rule;
- a flip is a candidate whose `landingHeightAllowed` result differs between the level-0 cutoff and the truth cutoff
  (truth candidate heights; the ceiling, 80% of the bound, lies above p99 on every fixture world).

| World | 384 landing candidates, truth: blocks (ms) | 1024 habitat candidates, truth: blocks (ms) | Summit p99, truth → level 0 | p90 reference, truth → level 0 | Eligibility flips (384 / 1024) |
|---|---|---|---|---|---|
| Maithea | 9 (1,539) | 20 (3,834) | 4,213.9 → 4,272.4 m | 2,857.8 → 2,909.6 m | 0 / 2 |
| Selawyn | 5 (875) | 15 (2,640) | 3,242.1 → 3,242.1 m | 1,812.8 → 1,886.2 m | 0 / 0 |
| Raiva | 5 (799) | 18 (3,065) | 2,492.9 → 2,525.4 m | 1,560.8 → 1,586.0 m | 1 / 0 |
| Lethuris | 7 (1,185) | 16 (3,388) | 4,006.3 → 4,067.0 m | 2,428.5 → 2,446.4 m | 1 / 1 |

What this means once the mountains are wired (nothing changes while staged):

- **The summit cutoff becomes permissive.** The level-0 hypsometry raises the p99 cutoff by 0-61 m. A truth-height
  candidate between the two cutoffs becomes eligible, so `landing-site-1`'s "never on a summit" admits 0-2
  candidates per world that the truth cutoff would reject. The existing landing test derives its reference from the
  same hypsometry, so it cannot see this.
- **Possible fixes, all outside T4's ownership, so left OPEN for T6:**
  - (a) judge landing eligibility in the same representation as the cutoff: level-0 candidate heights against the
    level-0 p99, the cheapest and self-consistent option;
  - (b) keep a separate truth summit cutoff: 57-99 blocks, 9-19 s, once per world;
  - (c) accept the shift, recorded.
- **The landing searches stall the main thread.** On the truth they cost 0.8-3.8 s of block solves on first use per
  region. They run on the main thread (`main.ts`), not in the tile worker, so (C3)'s worker bound does not cover
  them. Recorded for T6.

## 3. Orbit bake cost (target 2): measurements

`test-results/mountains/t4/orbit-bench.mjs`. Protocol:

- in-process A/B with separate module instances per checkout;
- one cold bake per arm, then 7 rounds alternating the order;
- a fresh process per world;
- each run under the CPU-quiet test slot (`tests/helpers/test-slot.mjs`).

`planetSurface(body, 1024, 192)`. Raw data: `test-results/mountains/t4/orbit-official.json`.

| World | A/A: main vs branch as merged (staged): mean / median / paired median | Bytes | Wired at level 0 vs main: mean / median / paired median | Block solves |
|---|---|---|---|---|
| Maithea | -0.7% / -0.5% / -1.0% | identical | **+26.5% / +26.9% / +27.0%** | 0 |
| Selawyn | +3.0% / +1.9% / +1.6% | identical | **+24.9% / +21.4% / +26.2%** | 0 |
| Raiva | -1.3% / +2.3% / -1.5% | identical | **+20.2% / +19.4% / +19.4%** | 0 |
| Lethuris | +1.8% / +1.0% / +0.1% | identical | **+20.6% / +21.6% / +22.1%** | 0 |

Main is 283-380 ms per bake. Wired at level 0 is 365-473 ms per bake. Wired at the truth (before T4) is 642,529 ms
for Maithea.

## 4. Where the wired excess comes from, and the bounded attempt

All diagnostics were run on Maithea, with scratch copies, never committed. Scripts are in
`test-results/mountains/t4/`.

- **Per class of sample** (`class-bench.mjs`, ns per sample, main -> wired level 0):

  | Class | Samples per bake | main (ns) | wired level 0 (ns) | Growth |
  |---|---|---|---|---|
  | Ocean | 225k | 344 | 346 | +0.5% |
  | Land outside belts | 267k | 522 | 732 | +40% |
  | Land in belts | 32k | 926 | 1,390 | +50% |

  Land outside every belt pays +40% while doing no mountain work: `massifBeltSample` returns belt 0 from the band
  grid.
- **M1's own work is small.** `massifBeltSample` in isolation costs ~36 ns per land call (`m1cost.mjs`), about 11 ms
  per bake. A steady-state profile (`orbit-steady-profile.mjs`) shows `bandTag`, `withinFlagged`, `transverse`,
  `massifBeltSample` and `valueInFrame` together at ~13 ms per bake. The rest of the +85-105 ms is spread over
  shared kernels:
  - `macroHeightCode`: 25 -> 62 ms;
  - `noise`: 121 -> 140 ms;
  - `sample`: 43 -> 57 ms.

  The call counts did not change: `noise` 7,476,051 vs 7,485,177 per bake, `macroHeightCode` 543,009 vs 543,009.
- **Making the mountain call dead** (`if (orogen && d[0] > 2)`, scratch only) removes most of the excess: land
  outside belts +9%, land in belts -1%. So the presence of the live call is what degrades the codegen of the core
  `sample`, not its work.
- **TurboFan inlining trace** (`--trace-turbo-inlining`):
  - Main inlines `macroHeightCode` and `n` into `sample`.
  - Wired, `sample` inlines `massifBeltSample`, `sampleWithinWithA0` and `reset`. `macroHeightCode` (183 B) and
    `n` (67 B) are rejected, because they already carry optimised code (`existing opt code's inlined bytecode
    size: 446`).
  - `--trace-opt` shows the order: in the wired build `macroHeightCode` and `n` reach TurboFan on their own before
    the larger `sample` does.
- **Attempts, all value-preserving, none closes the gap** (Maithea ms per bake, steady rounds, main ~335-350):

  | Attempt | Wired ms per bake | Result |
  |---|---|---|
  | Baseline wired level 0 | 419-431 | — |
  | Voxel prefilter (`bandVoxels` bit test) before the M1 call, in the core | 421-674 (noisy run), mean +25%; land outside belts +29%, land in belts +46% | no gain |
  | M1 + M2 moved into a separate exported helper (`mountainTermX`) | 412-433 | no gain |
  | Same helper with `%NeverOptimizeFunction` (diagnostic) | 434-445 | worse |
  | Private copies of `noise` / `macroHeightCode` for `mountain-layout.ts`, so the layout build does not heat the shared kernels | 410-424 | no gain; `macroHeightCode` still tiers up before `sample` |
  | `--max-inlined-bytecode-size=1000` (diagnostic, an engine flag, not shippable) | 413-415 | no gain |
  | `--max-inlined-bytecode-size=1000 --max-inlined-bytecode-size-cumulative=3000` | 406-408 | no gain (main 358) |
  | `--no-turbo-inlining` (diagnostic) | ~720 vs main ~650 | the +75 ms remains with inlining off |

  The last row matters most. With inlining switched off in both arms, ~75 ms per bake remains. So the excess is
  not only an inlining-order effect. What the remainder is has not been isolated. Code layout and register
  pressure in a larger `sample` are hypotheses, not findings. T3's 11 restructurings also failed to remove it (`docs/mountains-t3-coarse-carving-2026-10-06.md` section 7).

**Scope.** T4's file ownership is "the listed caller files, level argument only". The callers' level argument
already removes all M3 work: 4,075 -> 0 block solves, 642 s -> 0.42 s. The remaining +19..+27% lives in the core
`sample` of `terrain.ts` and `mountain-*.ts`. That is the same open problem T3 carried into T6's gate, and fixing
it would be a core restructuring outside T4's ownership. No contract pin or budget was touched:
`orbitBakeGrowth` stays .05.

## 5. Default `npm test` wall time, wired vs off (target 3)

`test-results/mountains/t4/suite-walltime.mjs`, raw data in `suite-walltime.json`. Each default test file runs as
its own process, `node [--import tests/helpers/wire-mountains.mjs] <file>`, 4 at a time under the test slot: the
off pass first, then the wired pass. Wired failures are expected, because pins move with the wiring. Only wall
time is compared here.

Default `npm test`: 205 files. Total run time is 665.5 s off and 5,858.7 s wired (the summed per-file wall
times, 4 processes at a time). **21 files more than double.**

The "M3 block solves" column comes from a re-run of each of those files with the counter preloaded
(`count-blocks-preload.mjs`, `doubled-blocks.json`). A block solve can only come from a sampler that evaluates the
carving: the truth (no level) or a level >= L(cut). Level 0 never solves one.

| File | Off (ms) | Wired (ms) | Ratio | Wired exit | M3 block solves (re-run) | Cause |
|---|---|---|---|---|---|---|
| `tests/terrain-relief-hypsometry.test.mjs` | 6,431 | 2,400,097 | 373.21x | killed (timeout) | not counted (40 min timeout) | M3 block solves: `terrainSampler(body)` over 20,000 Fibonacci directions |
| `tests/terrain-climate-colour.test.mjs` | 1,443 | 1,071,439 | 742.51x | 0 | 4,672 | M3 block solves (~0.19 s each) at many directions |
| `tests/terrain-floor-window.test.mjs` | 5,193 | 655,605 | 126.25x | 0 | 2,834 | M3 block solves (~0.19 s each) at many directions |
| `tests/acceptance/climate-agreement.test.mjs` | 666 | 628,915 | 944.32x | 1 | 3,151 | M3 block solves (~0.19 s each) at many directions |
| `tests/render-bounds.test.mjs` | 5,061 | 174,280 | 34.44x | 0 | 814 | M3 block solves (~0.19 s each) at many directions |
| `tests/terrain-elevation-identity.test.mjs` | 4,866 | 101,905 | 20.94x | 1 | 516 | M3 block solves (~0.19 s each) at many directions |
| `tests/terrain-mountains-assembly.test.mjs` | 6,358 | 58,994 | 9.28x | 0 | 312 | M3 block solves (~0.19 s each) at many directions |
| `tests/tile-metadata.test.mjs` | 1,928 | 58,726 | 30.46x | 1 | 289 | M3 block solves (~0.19 s each) at many directions |
| `tests/forest-water-validity.test.mjs` | 778 | 44,252 | 56.88x | 0 | 215 | M3 block solves (~0.19 s each) at many directions |
| `tests/place-query.test.mjs` | 423 | 31,624 | 74.76x | 0 | 159 | M3 block solves (~0.19 s each) at many directions |
| `tests/landing-site.test.mjs` | 558 | 7,046 | 12.63x | 0 | 32 | M3 block solves (~0.19 s each) at many directions |
| `tests/forest-habitat.test.mjs` | 255 | 4,889 | 19.17x | 0 | 26 | M3 block solves (~0.19 s each) at many directions |
| `tests/acceptance/existence-gating.test.mjs` | 465 | 4,332 | 9.32x | 0 | 3 | a few M3 block solves plus the one-time M1 layout build |
| `tests/world-surface.test.mjs` | 926 | 3,858 | 4.17x | 0 | 1 | a few M3 block solves plus the one-time M1 layout build |
| `tests/planet.test.mjs` | 774 | 1,914 | 2.47x | 0 | 6 | a few M3 block solves plus the one-time M1 layout build |
| `tests/acceptance/climate-seek-independence.test.mjs` | 489 | 1,576 | 3.22x | 0 | 4 | a few M3 block solves plus the one-time M1 layout build |
| `tests/acceptance/visit-order-independence.test.mjs` | 649 | 1,500 | 2.31x | 0 | 0 | M1 layout build and M1+M2 per-sample cost (no block) |
| `tests/ocean-gerstner.test.mjs` | 263 | 1,208 | 4.59x | 0 | 5 | a few M3 block solves plus the one-time M1 layout build |
| `tests/planet-detail.test.mjs` | 182 | 585 | 3.21x | 0 | 2 | a few M3 block solves plus the one-time M1 layout build |
| `tests/forest-census.test.mjs` | 261 | 572 | 2.19x | 0 | 1 | a few M3 block solves plus the one-time M1 layout build |
| `tests/world.test.mjs` | 200 | 481 | 2.4x | 0 | 1 | a few M3 block solves plus the one-time M1 layout build |

Reading:

- **12 files are dominated by M3 block solves (26 to thousands).** Wired time is roughly 0.19 s x blocks: these tests sample the
  truth at hundreds to thousands of directions spread over the sphere. They are test-side sparse-global consumers.
  `terrain-relief-hypsometry` did not finish within the 40 min per-file cap.
- **The other 9 files are 0.5-4.3 s wired.** They pay the one-time M1 layout build and the M1 + M2 per-sample
  cost (section 4), plus 0-6 blocks.
- **Failures.** The wired failures, exit 1 (`terrain-elevation-identity`, `climate-agreement`, `tile-metadata`,
  `lod-consistency`, `lod-carving-reduction`), are expected: they pin the unwired field or the staged constant,
  and T6's planned re-pin covers them.
- **The test-suite cost is a T6 item, not a T4 change.** T4 owns the callers' level argument only, and the
  identities these tests pin are the truth. At the wiring, T6 must either:
  - move the statistic-style tests (climate colour and agreement, floor window, relief hypsometry, render bounds)
    to level 0 where they test a global statistic rather than the carving; or
  - move them to `test:full`.

  Doing neither would turn the default suite from about 11 minutes into well over 1.5 hours. Recorded as OPEN.

## 6. (C3) cold massif tiles and the T5 trigger

`test-results/mountains/t4/c3-cold-tiles.mjs`, raw data in `c3-cold-tiles.json`. Method:

- mountains on (`{mountains: true}`);
- one fresh process per (world, level), under the test slot;
- the tiles under 8 axis sites >= 300 km apart, so no two tiles share an M3 block and every build is cold;
- one non-massif warm-up tile per process.

| World | Level (edge) | Max cold build (ms) | Max blocks per tile | Per-tile ms / blocks |
|---|---|---|---|---|
| Maithea | L6 (128 km) | **1,179** | 8 | 1032/7 885/6 1051/7 1051/7 927/6 883/6 795/5 1179/8 |
| Maithea | L7 (64 km) | 773 | 5 | 759/5 592/4 730/5 749/5 630/4 501/3 493/3 773/5 |
| Maithea | L8 (32 km) | 482 | 3 | 471/3 466/3 311/2 448/3 471/3 312/2 313/2 482/3 |
| Selawyn | L7 (105 km) | **1,201** | 8 | 911/6 1024/7 1201/8 1062/7 781/5 912/6 756/5 899/6 |
| Selawyn | L8 (52 km) | 704 | 4 | 472/3 655/4 666/4 677/4 545/3 704/4 532/3 703/4 |
| Selawyn | L9 (26 km) | 494 | 3 | 475/3 494/3 468/3 323/2 322/2 314/2 313/2 336/2 |
| Raiva | L5 (98 km) | **1,354** | 8 | 1094/7 1311/8 1354/8 1192/7 1219/7 924/5 854/5 723/4 |
| Raiva | L6 (49 km) | 863 | 5 | 635/4 840/5 833/5 863/5 709/4 543/3 544/3 532/3 |
| Raiva | L7 (25 km) | 465 | 3 | 335/2 464/3 465/3 448/3 324/2 319/2 320/2 324/2 |
| Lethuris | L7 (110 km) | **1,208** | 8 | 1208/8 1008/7 911/6 961/6 1091/7 1034/7 607/4 887/6 |
| Lethuris | L8 (55 km) | 632 | 4 | 632/4 612/4 451/3 592/4 628/4 627/4 467/3 474/3 |
| Lethuris | L9 (28 km) | 516 | 3 | 473/3 507/3 347/2 516/3 514/3 355/2 373/2 362/2 |

The worst cold tile is 1,354 ms, under (C3)'s 2 s bound, so **T5 does not run**. At ~150 ms per block, the bound
allows about 12 blocks per tile, and the most seen is 8.

Caveat: these are tiles under axis sites. A tile where two belts cross, or where the axis runs along the tile
diagonal, could touch more blocks. (C3) itself is a T6 row, and T6 re-measures it on the massif-tile LOD set (Q6).

## 7. Files

| File | Change |
|---|---|
| `src/terrain.ts` | `planetSurface`: the orbit bake's sampler passes `{lodLevel: 0}` (the other arguments are the defaults, written out). |
| `src/ocean-volume.ts` | `oceanHypsometry`: level 0, with the exactness note. |
| `src/surface-survey.ts` | `surfaceSurvey`: level 0. |
| `tests/sparse-consumer-levels.test.mjs` (new, registered) | 3 tests, section 2. |
| `tests/helpers/wire-mountains.mjs`, `wire-mountains-hook.mjs` (new) | Test-only load hook that flips `TERRAIN_MOUNTAINS_WIRED` in a child process (a no-op once the source is wired). |
| `tests/helpers/sparse-consumers-wired.mjs` (new) | The child script. |
| `test-results/mountains/t4/*` | Evidence scripts and raw JSON. |

## 8. Ledger

- No threshold, pin, tolerance, budget, golden or version changes. `orbitBakeGrowth` stays .05, contract §6
  stays as written, and `SURVEY_VERSION` is unchanged.
- **Carried OPEN into T6's gate:** orbit bake wired +19..+27% against main (target (2)), from the same
  M1 + M2 core-`sample` codegen cost as T3's open coarse-level residual.
- **OPEN for T6 (section 2a):**
  - The landing summit cutoff reads the level-0 hypsometry. Its p99 is the upper envelope, 0-61 m above the truth
    p99, and 0-2 candidates per world flip to eligible.
  - The global landing searches stay on the truth: 5-20 blocks, 0.8-3.8 s, on the main thread.
- **OPEN for T6 (section 5):** the default suite wired is 5,859 s against 666 s off, and 21 files more than double.
  Move the statistic-style tests to level 0 or to `test:full`.
- **Note for T6:** at the wiring, `SURVEY_VERSION` moves if a survey site moves (massif sites become upper-envelope
  values), and the ocean hypsometry's land percentiles move. Its sea levels do not (section 1).
