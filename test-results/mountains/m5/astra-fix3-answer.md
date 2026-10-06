Round 3 is implemented and remains staged, but **M5 is not acceptance-ready**. HARD 1–7, the actual R2/R5 values, the authorized M3 smoke, cost and runtime meet their checks. R1d, R3, R4 and R6 fail. The depth×4 and speckle spectrum negatives do not fail as required. No gate-driven retuning occurred.

The six-argument API now computes the forward gradient from carved centre/X/Y heights. Nine hashed, downhill-oriented quartic kernels replace isotropic ribs; slope limits their depth. The round-2 implementation exists only as a negative-control source string in the test. The element-only fixture, digest helper, evidence scripts and unapplied wiring patch use the new API. No existing production wiring, version or golden was changed.

Final frozen constants:

- SLOPE_ZERO_TAN = 0.17632698070846498: Required tan(10°) exclusion.
- SLOPE_FULL_TAN = 0.5773502691896257: Required tan(30°) full weight.
- SLOPE_STEP_M = 125: Fixed forward-gradient step, independent of LOD.
- MAX_DEPTH_M = 120: Absolute incision cap in metres.
- CAP_FRACTION = 0.5: Preserves nonnegative relief and the upper envelope.
- GULLY_CELL_M = 250: Nine centres on the 250 m jittered lattice.
- GULLY_HALF_LENGTH_M = 275: Downhill half-length; shortened to preserve the finite-search continuity proof.
- GULLY_HALF_WIDTH_M = 65: Cross-slope half-width; aspect ratio 4.23.
- A_MIN = 0.5: Kernel amplitudes span 0.5–1.
- KAPPA = 0.32: Slope-dependent depth limit.
- PROFILE_MAX_SLOPE = 1.539600717839002: Exact maximum magnitude of the quartic profile derivative.
- STRATA_PERIOD_M = 160: Vertical period in metres.
- STRATA_WEIGHT = 0.04: Reduced mean contribution from strata.
- RIB_WEIGHT = 0.96: Complementary weight of the sparse gullies.
- JITTER_M = 30: Seed-only phase offset, with zero spatial gradient.
- SEED_SALT = 1757159915: Retained decorrelation salt.

Version remains mountain-rock-detail-1. Bands remain 1000/500/250/125 m; frozen reduction is {longestWavelengthM: 1000, latticeSegments: 32}, maximum edge 8000 m. Declared bands do not establish the failed R4 limit.

For P(z)=(1−z²)², B=8/(3√3)=1.539600717839002. Strata's positive derivative is at most 1/0.3849001794597505=2.598076211353316. With spatially constant J, its gradient term is zero. HARD 6 asserts:

0.32 × 1.539600717839002 × 0.96 + 0.04 × 120 / (0.3849001794597505 × 160) = **0.472965 + 0.077942 = 0.550908 ≤ 0.6**.

This is an affine-face bound with inactive height cap. Changes in orientation, slope and weight contribute additional derivatives; an active height cap adds CAP_FRACTION × shape. It is not a global drainage proof. Strata's monotonicity budget is 4.8 ≤ 61.584029 m. Kernel support radius 282.577423 m is below 1.15 × 250 = 287.5 m, so omitted centres contribute zero and changing the 3×3 neighbourhood creates no discontinuity. The suggested 400 m half-length would not satisfy that condition at 250 m cell size.

Mean gully on the 35° plane, 131,072 samples per pool: tuning **0.213568**, gate **0.215015**, both below the 0.25 target. Background and analytic base are unchanged from round 2; its recorded background calibration is 1.999673 m RMS, not remeasured here.

Gate seeds are 730801–730808. Only tuning 730501–730508 and the authorized 730201/site-1 smoke informed selection. Constants were recorded in frozen-round3.json before the single registered gate run. rows-all-pools subsequently performed the required identical cross-check; no constants changed. A later comment correction clarified the height-cap derivative without changing arithmetic.

| Gate HARD test | Result |
| --- | --- |
| 1 | PASS: 945 exact +0 exclusions, including nonfinite offset heights. |
| 2 | PASS: 32,768 gate + 32,768 tuning samples; zero violations; negative on all 16,844 / 16,835 steep samples. |
| 3 | PASS: 10,001 weight points and endpoint checks. |
| 4 | PASS: 4,096 tuples, forward/reverse/child equality; digest below. |
| 5 | PASS: arithmetic audit and 20 rejected forbidden-code controls. |
| 6 | PASS: frozen exports, bounds, strata budget, support radius and 0.550908 inequality. |
| 7 | PASS: 6,000 straddles per pool, 1,248 actual phase-wrap roots, 432 weight-threshold roots; three shared-edge lines, zero mismatches. |

Digest: 92954e7d0ecbc44639a66aa5fe64ac97eee64c4761e9641feec90c2d2a4e551f.

HARD 7 uses base gradient ≤1.03, forward-gradient Lipschitz 2√2×1.03/125, orientation Lipschitz divided by tan10, the kernel lever arm, and weight/cap/strata product bounds. L_MAX=142.565159, giving a 0.01 m tolerance of 1.425652 m. Gate/tuning maximum changes are 0.017869 / 0.018851 m. Speckle changes 78.180956 / 76.243013 m fail continuity as required. The level-dependent-slope control has 161 shared-vertex mismatches. Midpoint deviations are INFO: gate 55.383086 m, tuning 69.680781 m, gate speckle 79.181483 m.

| Gate row | Measurement | Outcome |
| --- | --- | --- |
| Base fixture | 0.178080 / 0.771503 flat/steep; fill and qualifying pits 0 | PASS |
| Surface R1 | 16.603827 / 15.968299 m; ratio 1.039799 | INFO |
| R1d | 9.821663 / 5.323876 m; ratio 1.844833 | FAIL ≥2 |
| R2 | 37.937413 / 44.914490°; without 38.114286 / 44.308752° | Actual values PASS; control fails |
| R3 | 3.459048; without 3.554205 | FAIL [2,2.6]; closer to 2.14 |
| R4 | 0.606670 | FAIL ≤0.20 |
| R5 | 0.004707 fill; 2.469041 qualifying pits/1000 km² | PASS |
| R5 all pits | 795.031056/1000 km² | INFO |
| R6 | 848 new pits / 508.007813 km² = 1.669266/km²; base 0 | FAIL ≤1.0 |
| R7 | 0.008651 / 0.753849 / 2.976171 p50/p99/max | INFO |
| R7 round 2 | 0.039785 / 4.574453 / 9.512423 | INFO |

R7 uses 20,000 positive-weight points and the full chain at ±0.5 m along the centre's downhill vector. Gate has 282 ratios >0.6 (round 2: 3,365). The gradient-lag diagnostic classified 281 as kink-affected and one as low-lag. Checking that remaining sample's analytic stencil locates a ridge crossing: seed 730803, fixture (x,y)=(-95898,-6182) m, ratio 1.051858; phase changes 0.500728 → 0.499950 at the Y offset. All eight low-lag examples across the four pools have a kink in their full derivative stencil; even the tuning example with no centre-stencil crossing crosses at a ±0.5 m endpoint. Saved coordinates/phases are in saved-evidence-check.json. Round-2 exceedances are widespread on smooth faces too. The evidence supports the expected kink/forward-gradient-lag mechanism, not a general proof for real M3.

Controls use the first four gate seeds except no-rock and round-2 R6/R7, which use all eight:

| Control | Gate value | Required failure? |
| --- | --- | --- |
| No rock R1d | 1.001415 | Yes |
| Forced weight R1d | 1.835115 | Yes |
| Depth ×4 R2 | 37.937616 / 44.926449 | NO: slope-depth cap still binds |
| No rock R3 | 3.554205 | Yes |
| Speckle R3 | 2.363961 | NO: not below 2 |
| Equal gains R3 | 2.202954 | INFO: frozen round-2 variant; new module has no octave gain |
| Extra 4 km R4 | 0.918054 | Yes |
| Forced weight R5 | 0.005498 / 0.000000 | NO: fill/pits remain within limits |
| Reversed strata R5 | 0.006131 / 0.000000 | INFO: does not fail |
| Round-2 R6 | 2541 pits; 5.001892/km² | Yes |
| Surface R1 no-rock / forced | 0.813386 / 1.034223 | INFO |

R4 and R6 negative assertions follow failing actual-row assertions in the test, so those particular assertions were not reached there. check-saved-evidence.mjs separately asserted their failures from the saved measurements, along with the no-rock and forced-weight R1d controls, without resampling.

Separate evidence from rows-all-pools.json (T=730501–508, B1=730601–608, B2=730701–708, G=730801–808):

| Measurement | T | B1 | B2 | G cross-check |
| --- | --- | --- | --- | --- |
| R1 steep / flat / ratio | 16.509545 / 15.940382 / 1.035706 | 16.468614 / 15.864589 / 1.038074 | 16.589039 / 15.886977 / 1.044191 | 16.603827 / 15.968299 / 1.039799 |
| R1d steep / flat / ratio | 9.799756 / 5.257029 / 1.864124 | 9.793129 / 5.141288 / 1.904801 | 9.815419 / 5.200717 / 1.887320 | 9.821663 / 5.323876 / 1.844833 |
| R2 p50 / p90 | 37.952422 / 44.913347 | 37.952790 / 44.906252 | 37.970169 / 44.919880 | 37.937413 / 44.914490 |
| R3 with / without | 3.461797 / 3.552675 | 3.469565 / 3.565179 | 3.455426 / 3.553737 | 3.459048 / 3.554205 |
| R4 | 0.582237 | 0.610580 | 0.562329 | 0.606670 |
| R5 fill / qualifying pits | 0.004747 / 0.000000 | 0.004668 / 0.000000 | 0.004786 / 0.000000 | 0.004707 / 2.469041 |
| R5 all pits INFO | 775.278732 | 772.809691 | 819.721461 | 795.031056 |
| R6 actual / round 2 | 1.657455 / 4.958585 | 1.633833 / 4.980238 | 1.665329 / 4.931027 | 1.669266 / 5.001892 |
| R7 p50 / p99 / max | 0.006816 / 0.603018 / 2.559579 | 0.005974 / 0.699396 / 2.805769 | 0.008439 / 0.736280 / 2.771528 | 0.008651 / 0.753849 / 2.976171 |
| Gully mean | 0.213568 | 0.212670 | 0.213042 | 0.215015 |
| No-rock / forced R1d | 0.983943 / 1.866090 | 1.012990 / 1.953774 | 1.006168 / 1.884338 | 1.001415 / 1.835115 |
| Depth ×4 p50 / p90 | 37.936924 / 44.911512 | 37.939034 / 44.934502 | 37.960628 / 44.903380 | 37.937616 / 44.926449 |
| Speckle / equal-gains R3 | 2.309704 / 2.200783 | 2.333196 / 2.206461 | 2.296546 / 2.234793 | 2.363961 / 2.202954 |
| Extra 4 km R4 | 0.905792 | 0.906424 | 0.911767 | 0.918054 |
| Forced R5 fill / pits | 0.005182 / 0.000000 | 0.005261 / 0.000000 | 0.005063 / 0.000000 | 0.005498 / 0.000000 |
| Reversed R5 fill / pits | 0.007041 / 0.000000 | 0.006527 / 0.000000 | 0.006092 / 0.000000 | 0.006131 / 0.000000 |

Gate cross-check is exact for actual rows, baseline, controls and control seeds. All pools have zero base fine minima. Complete RMS arrays, R7 round-2 values and coordinates remain in the JSON. Sizes: R1/R1d/R6 257² at 31.25 m; R2/R5 161² at 125 m; R3 two 1024-point transects per seed; R4 four 1024-point transects total on the first four seeds, fixed +X plane gradient. The initial tuning sweeps inherited 16 R4 transects; the final tuning and all gate/evidence measurements use the specified four.

Authorized integration smoke, seed 730201, site 1 only:

| Calibrated M3 row | Without M5 | With M5 | Threshold; outcome |
| --- | --- | --- | --- |
| slope125Over30 | 69.503416 | 70.059810 | >= 25; both PASS |
| slope125P50 | 37.683547 | 37.700852 | >= 20; both PASS |
| flank500mP50 | 20.700000 | 20.900000 | >= 12; both PASS |
| relief8kmP50 | 1592.000000 | 1613.000000 | >= 1500; both PASS |
| beta500mTo8km | 2.410000 | 2.360000 | between [2,2.6]; both PASS |
| fill10ShareP50 | 0.004000 | 0.024000 | <= 0.05; both PASS |
| pits025Per1000km2P50 | 2.600000 | 10.400000 | <= 50; both PASS |
| axisCoherence40kmP50 | 0.232000 | 0.232000 | between [0.14,0.64]; both PASS |

All strict M3 pits are still high: **134.7 → 1850.6 per 1000 km²** (INFO); preserving the calibrated rows does not mean eliminating small pits. Smoke fine rows use the same element metric paths and background:

| Fine row | Without M5 | With M5 |
| --- | --- | --- |
| R1 steep / flat / ratio | 43.169277 / 52.265606 / 0.825960 | 44.803814 / 52.497400 / 0.853448 |
| R1d steep / flat / ratio | 4.393956 / 4.523939 / 0.971268 | 12.175638 / 10.934273 / 1.113530 |
| R2 p50 / p90 | 40.858672 / 46.874950 | 40.645469 / 48.312387 |
| R3 beta | 3.714672 | 3.421580 |

R1d and R3 still fail on this smoke; fine R2 meets its bounds. U follows the analytic envelope at slope offsets in integration; the requested patch holds U at the centre and passes U+C, U+Cx, U+Cy. That difference remains unvalidated in wired terrain. Smoke exit 0 signifies completed measurement; row outcomes are reported separately.

Unofficial cost, 15 interleaved million-call rounds: M3 median **65.353200 ns**, combined median **201.635000 ns**, paired add-on median **157.445300 ns ≤214**. Two warm builds, zero additional builds. Timing varied: M3 43.47–77.76 ns, combined 198.22–293.30 ns; no official quiet-slot claim. Rock alone was not timed separately.

Registered test: exit **1**, **duration_ms 1366.8986**; 11 passed, 6 failed, 1 skipped. Per-test milliseconds:

| Test | duration_ms |
| --- | --- |
| HARD 1: literal +0 exclusions and finite outputs | 0.8893 |
| HARD 2: bounds, upper envelope and non-vacuity on 65536 fixture samples | 20.1954 |
| HARD 3: smoothstep endpoints, monotonicity and continuity | 0.7465 |
| HARD 4: pinned forward, reverse and child determinism | 73.9244 |
| HARD 5: arithmetic audit and negative controls | 2.6794 |
| HARD 6: frozen constants, bands and monotone strata budget | 0.6462 |
| HARD 7: continuity, shared edges, speckle and level-dependent negatives | 24.6773 |
| ROW gate: measure all rows and controls | 1146.7638 |
| ROW gate: base fixture classes and drainage | 0.265 |
| ROW gate: R1d detail contrast (surface R1 INFO) | 0.2648 |
| ROW gate: R1d negative controls | 0.0744 |
| ROW gate: R2 slope band and depth control | 4.1675 |
| ROW gate: R3 fine spectrum and no-rock control | 0.0859 |
| ROW gate: R3 speckle negative (equal gains INFO) | 0.0478 |
| ROW gate: R4 band limit and long-octave control | 0.0416 |
| ROW gate: R6 new strict pits and round-2 negative | 0.0647 |
| ROW gate: R5 drainage (forced weight and reversed strata reported) | 0.0616 |
| ROW COST: warm synthetic add-on <= 214 ns (opt-in benchmark) | 0.0209 |

Verification commands and exits (worktree cwd unless specified):

- node --test --test-name-pattern='HARD [1356]' tests/mountain-rock-detail.test.mjs — 0.
- node --test --test-name-pattern='HARD' tests/mountain-rock-detail.test.mjs > test-results/mountains/m5/hard-pre-gate.log 2>&1 — 0, after freeze; no ROW evaluation.
- node --test tests/mountain-rock-detail.test.mjs > test-results/mountains/m5/element.log 2>&1 — 1; single registered gate run.
- npx --no-install tsc --noEmit — 0.
- node test-results/mountains/m5/tune-round3.mjs — 0; tuning seeds only.
- node test-results/mountains/m5/tune-depth-round3.mjs — 0; tuning only; two over-budget derivative configurations were discarded.
- node test-results/mountains/m5/rows-all-pools.mjs — 0; exact gate cross-check.
- node test-results/mountains/m5/cost-bench.mjs > test-results/mountains/m5/cost-bench.log 2>&1 — 0.
- node --check test-results/mountains/m5/integration-m3.mjs — 0.
- PowerShell: $env:M5_INTEGRATION_SMOKE='1'; node test-results/mountains/m5/integration-m3.mjs > test-results/mountains/m5/integration-smoke.log 2>&1; exit $LASTEXITCODE — 0; one smoke run.
- node test-results/mountains/m5/render.mjs — 0; CPU PNGs for burnt seed 730601.
- python test-results/mountains/m5/build-wiring-patch.py — 0; reads main 9971c3f with git show and writes scratch files only.
- git apply --check C:/LLM/IWSDK/universe-atlas-wt/m5-rock/test-results/mountains/m5/m5-wiring.patch — 0, cwd C:/Users/Caldor/AppData/Local/Temp/atlas-m5-main-hsj7rg4o.
- node test-results/mountains/m5/check-saved-evidence.mjs — 0, twice; saved control assertions and expanded analytic kink diagnostics, no ROW resampling.
- git diff --check and git diff --stat — 0; no tracked diff reported because task files are untracked/ignored; not validation of those new files.
- node test-results/mountains/m5/report.mjs — 0; report assembled from saved evidence.

An initial inline tuning measurement exited 1 from an index/indexOf typo in the helper; corrected before any gate run. Subsequent inline tuning measurements and digest pinning exited 0. A scratch-cwd attempt to read the relative cost JSON reported file-not-found; the following patch check exited 0, and cost JSON was read from the worktree afterwards.

Not run: full integration, any other integration seed/site, official isolated cost, opt-in synthetic COST, whole npm test, test:full, browser, GPU, network/downloads, patched typecheck or wired golden tests. No git-writing command ran. The unresolved issue is satisfying contrast, spectrum and fine drainage together within this design. These measurements establish a rejected candidate, not impossibility and not acceptance.