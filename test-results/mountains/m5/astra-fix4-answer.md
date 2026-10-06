Round 4 is implemented and remains staged. **All 17 enabled gate tests passed; one optional cost test was skipped.** The fresh gate meets HARD 1–7 and R1e/R2/R3′/R4/R5/R6, including every required negative control. The authorized real-M3 smoke meets all eight M3 rows and its R1e/R2/R3′ checks. Unofficial cost and test duration meet their limits. This is element and smoke evidence, not full integration or approval to wire M5.

The final mix is 98.5% height benches and 1.5% downhill gullies. Larger gully weights reintroduced fine pits in tuning; the small secondary term preserves the texture while benches supply the contrast. The 280 m period also avoids the weak R2 depth-control response seen near 220 m. The bench is continuous and piecewise linear, with corners, a fast return, zero over 42% of each cycle, and mean 0.29. The base fixture and background are unchanged. The six-argument API, exclusions, exports and version stay intact; no production wiring was edited.

Constants were saved in frozen-round4.json before the single fresh gate run. Only 730501–730508 and the authorized 730201/site-1 smoke informed selection. No gate-driven tuning occurred.

- SLOPE_ZERO_TAN = 0.17632698070846498: Exact tan(10°) exclusion.
- SLOPE_FULL_TAN = 0.5773502691896257: Exact tan(30°) full weight.
- SLOPE_STEP_M = 125: Fixed forward-gradient step, independent of LOD.
- MAX_DEPTH_M = 55: 55 m absolute incision cap.
- CAP_FRACTION = 0.5: Preserves the nonnegative relief and upper envelope.
- GULLY_CELL_M = 250: Near-regular 250 m lattice; nine centres searched.
- GULLY_HALF_LENGTH_M = 200: 200 m downhill half-length, safely within the finite search.
- GULLY_HALF_WIDTH_M = 65: 65 m cross-slope half-width.
- GULLY_JITTER = 0.15: Centres span 0.35–0.65 cell; constant unit amplitude, no A_MIN.
- KAPPA = 0.6: Slope-depth limit; depth ≤120 times slopeTan.
- PROFILE_MAX_SLOPE = 1.539600717839002: Exact quartic-kernel derivative maximum.
- STRATA_PERIOD_M = 280: 280 vertical metres; approximately 280–600 m horizontally on 25–45° faces.
- BENCH_RISE = 0.5: Linear tread over half the phase.
- BENCH_FALL = 0.08: Fast linear return over 8% of the phase.
- STRATA_WEIGHT = 0.985: Benches supply 98.5% of the shape.
- RIB_WEIGHT = 0.015: Secondary gullies supply 1.5%.
- JITTER_M = 30: Seed-constant height offset; spatial gradient exactly zero.
- SEED_SALT = 1757159915: Retained decorrelation salt.

Version: mountain-rock-detail-1. Frozen bands: 1000/500/250/125 m. Reduction: longest wavelength 1000 m, 32 segments; maximum edge 8000 m.

With σ′ ≤1/0.5 on the rising tread and B=8/(3√3)=1.539600717839002, HARD 6 verifies:

**55×0.985/(280×0.5) + 0.6×1.539600717839002×0.015 = 0.386964286 + 0.013856406 = 0.400820692 ≤0.6.**

The bench-only height map has derivative ≥1−0.386964286=0.613035714. Even adding the conservative active-height-cap contribution 0.5 gives a climb bound 0.900820692<1 when weight and forward gradient are fixed. On a general surface, slope, weight and orientation vary spatially; this is **not a global pit-free proof for the complete weighted module**. In particular, ∇w=w′∇s remains a path to toe pits. The measured R6 row tests that failure mode. Seed-constant J contributes no gradient.

For HARD 7, |∇base|≤1.03 gives gradient Lipschitz G=2√2×1.03/125, direction Lipschitz G/tan10, and kernel bound B(1/200+1/65)(1+ρG/tan10), where ρ=210.297408 m. Omitted centres are at least (1.5−0.15)×250=337.5 m away, so the finite search has no seams. The product-rule bound includes cap 0.515, slope-depth 0.6×200×G, weight derivative 1.5/(tan30−tan10), bench absolute derivative max(1/0.5,1/0.08)/280, and the weighted kernel bound: **L_MAX=11.343070**, tolerance 0.113431 m per 0.01 m straddle.

| Gate HARD | Measured result — all PASS |
| --- | --- |
| 1 | 945 literal +0 exclusions. |
| 2 | 32,768 gate + 32,768 tuning samples; zero violations; negative on 13971/16839 gate steep samples and 13976/16835 tuning steep samples. |
| 3 | 10,001 weight samples plus endpoint checks. |
| 4 | 4,096 tuples; pinned forward/reverse/child digest agrees. |
| 5 | Arithmetic-only/no-import audit; 20 forbidden-code controls rejected. |
| 6 | Frozen exports, cap, support and numerical inequalities above. |
| 7 | 6,000 straddles per pool; 2208 bench corner/wrap roots; 432 weight roots; three shared-edge lines, zero mismatches. |

Digest: c1cd74f8f82d1b2fb8699337b4736a50bf2770515590eb987045dc4e55b34577.

Gate/tuning straddle maxima: 0.026310 / 0.026743 m. Speckle maxima: 54.768258 / 54.586055 m, both fail the continuity bound as required. Level-dependent slope has 4 shared-vertex mismatches, failing as required. Midpoint deviations are INFO: gate 15.574463 m, tuning 17.381678 m, speckle gate 45.792167 m.

| Gate row | Measurement | Outcome |
| --- | --- | --- |
| Fixture | 0.177699 / 0.771295 flat/steep share; base fill and qualifying pits 0 | PASS |
| R1e | 16.463025 / 4.490849 / 3.665904 m steep / background-flat / ratio | PASS ≥2 |
| R2 | 38.124735 / 45.230745°; without 38.134185 / 44.300835° | PASS p50 drop ≤0.5°, p90 ≤48.4° |
| R3′ | 2.493019; without 3.551271; ceiling 3.239848 | PASS ≥2 and closes ≥⅓ of gap |
| R4, fall line +x | 0.000097 | PASS ≤0.20 |
| R5 | 0.000989 / 0.000000 fill / qualifying pits per 1000 km² | PASS ≤0.05 / ≤50 |
| R6 | 0 new pits / 508.007813 km² = 0.000000/km²; base 0 | PASS ≤1 |

R3′ uses the fixed literal 2.617, with provenance in the test: harness syntheticSampler(R=5194907,'alpine'), four sites, 125 m–2 km octaves. It was not remeasured this round.

Controls use gate seeds 730901–730904, except no-rock and round-2 R6/R7, which use all eight:

| Control | Gate value | Did it fail as required? |
| --- | --- | --- |
| No rock R1e | 0.980262 | Yes, <2 |
| Depth ×0.1 R1e | 1.057325 | Yes, <2 |
| MAX_DEPTH_M ×4 and KAPPA ×4 R2 | 38.443457 / 52.113081 | Yes, p90 >48.4 |
| No rock R3′ | 3.551271 > 3.239848 | Yes |
| White speckle at depth ×4 R3′ | 1.329557 | Yes, <2 |
| Extra 4 km octave R4 | 0.671747 | Yes, >0.20 |
| Round-2 isotropic R6 | 2501 pits; 4.923153/km² | Yes, >1 |
| Forced weight R5 | 0.001068 / 0.000000 | No; reported control, failure no longer required |
| Reversed bench R5 | 0.002334 / 0.000000 | No; INFO |
| Equal gains, round-2 R3 | 2.204664 | INFO |
| Forced weight R1 / R1d / R1e | 1.361597 / 2.702410 / 3.714215 | INFO |
| No rock surface R1 | 0.806268 | INFO |

White speckle replaces the whole shape by a per-31.25 m cell hash; the spectrum control scales its output depth by four. HARD 7 uses the unscaled speckle. The long-wave control mixes the bench with a 4 km gradient-noise term. Reversed benches multiply the rising derivative to three before the existing shape clamp.

Gate INFO: surface R1 steep/flat/ratio **20.999563 / 15.463224 / 1.358033**; R1d **16.463025 / 6.097864 / 2.699802**. R4 with fall line +y: **0.004802**. R5 all strict pits: **498.746190/1000 km²**. Mean gully: **0.220906**, measured at 131,072 plane samples (tuning 0.221037).

R7 p50/p99/max: **0.009268 / 1.203723 / 4.710111**; round-2 control **0.040861 / 4.622549 / 8.538804**. Of 20,000 gate points, 355 exceed 0.6: 353 have gradient lag >0.01, and both low-lag exceptions cross an analytic kink in the full derivative stencil: seed 730905 at (−51892,18072), ratio 0.709288; seed 730904 at (−140539,17349), ratio 1.314356. All 14 saved low-lag exceptions across the five pools cross a kink. Round 2 has 3277 exceedances, including 2347 low-lag cases. This diagnostic supports the kink mechanism; it does not prove global drainage.

Separate rows-all-pools.json evidence: T=730501–508, B1=730601–608, B2=730701–708, B3=730801–808, G=730901–908. Burnt pools never gate. G is the required exact cross-check of saved gate measurements.

| Measurement | T | B1 | B2 | B3 | G cross-check |
| --- | --- | --- | --- | --- | --- |
| R1 steep/flat/ratio | 21.042948 / 15.546777 / 1.353525 | 21.009655 / 15.464635 / 1.358561 | 20.997398 / 15.564306 / 1.349074 | 21.138610 / 15.563550 / 1.358213 | 20.999563 / 15.463224 / 1.358033 |
| R1d steep/flat/ratio | 16.492006 / 6.034498 / 2.732954 | 16.492366 / 5.896981 / 2.796747 | 16.442301 / 6.012755 / 2.734570 | 16.519272 / 6.155827 / 2.683518 | 16.463025 / 6.097864 / 2.699802 |
| R1e steep/bg-flat/ratio | 16.492006 / 4.457588 / 3.699760 | 16.492366 / 4.347478 / 3.793548 | 16.442301 / 4.391759 / 3.743899 | 16.519272 / 4.454554 / 3.708401 | 16.463025 / 4.490849 / 3.665904 |
| R2 p50/p90 | 38.114913 / 45.254021 | 38.112597 / 45.239889 | 38.112015 / 45.232531 | 38.138217 / 45.250958 | 38.124735 / 45.230745 |
| R3′ beta / baseline | 2.481541 / 3.552675 | 2.461550 / 3.565179 | 2.513779 / 3.553737 | 2.449609 / 3.554205 | 2.493019 / 3.551271 |
| R3′ ceiling | 3.240783 | 3.249120 | 3.241492 | 3.241803 | 3.239848 |
| R4 +x / +y INFO | 0.000094 / 0.005764 | 0.000103 / 0.005834 | 0.000091 / 0.005072 | 0.000101 / 0.006898 | 0.000097 / 0.004802 |
| R5 fill / qualifying pits | 0.001147 / 0.000000 | 0.000870 / 0.000000 | 0.001266 / 0.000000 | 0.001068 / 0.000000 | 0.000989 / 0.000000 |
| R5 all pits INFO | 496.277150 | 486.400988 | 516.029474 | 488.870028 | 498.746190 |
| R6 actual / round 2 | 0.013779 / 4.958585 | 0.005905 / 4.980238 | 0.003937 / 4.931027 | 0.003937 / 5.001892 | 0.000000 / 4.923153 |
| R7 p50/p99/max | 0.008424 / 0.796450 / 4.519389 | 0.008464 / 0.944714 / 4.370057 | 0.008752 / 1.120194 / 4.621707 | 0.008484 / 1.191313 / 4.347554 | 0.009268 / 1.203723 / 4.710111 |
| Gully mean | 0.221037 | 0.220715 | 0.220707 | 0.221593 | 0.220906 |
| No-rock / shallow R1e | 0.983943 / 1.045507 | 1.012990 / 1.098796 | 1.006168 / 1.064872 | 1.001415 / 1.048929 | 0.980262 / 1.057325 |
| Depth/KAPPA ×4 p50/p90 | 38.349951 / 52.162504 | 38.365561 / 52.149665 | 38.403351 / 52.125738 | 38.461880 / 52.157194 | 38.443457 / 52.113081 |
| Speckle / equal-gains beta | 1.307059 / 2.200783 | 1.358415 / 2.206461 | 1.329249 / 2.234793 | 1.396548 / 2.202954 | 1.329557 / 2.204664 |
| Extra 4 km R4 | 0.674601 | 0.713097 | 0.693962 | 0.728468 | 0.671747 |
| Forced R5 fill/pits | 0.000989 / 0.000000 | 0.000870 / 0.000000 | 0.001147 / 0.000000 | 0.001147 / 0.000000 | 0.001068 / 0.000000 |
| Reversed R5 fill/pits | 0.002057 / 0.000000 | 0.001859 / 0.000000 | 0.002650 / 0.000000 | 0.002413 / 0.000000 | 0.002334 / 0.000000 |

All five pools have zero base fine minima. Saved-evidence assertions confirm every required row control fails in all five pools. Full arrays, counts and diagnostic coordinates remain in the JSON. Registered sizes remain 257² at 31.25 m for R1/R6, 161² at 125 m for R2/R5, two 1024-point transects per seed for R3, and four 1024-point transects for R4. Background calibration remains the prior 1.999673 m octave RMS; it was not remeasured.

Real-M3 smoke, seed 730201, site 1 only, final candidate:

| M3 row | Without M5 | With M5 | Outcome |
| --- | --- | --- | --- |
| slope125Over30 | 69.503416 | 67.835067 | Both PASS (>= 25) |
| slope125P50 | 37.683547 | 37.558851 | Both PASS (>= 20) |
| flank500mP50 | 20.700000 | 20.800000 | Both PASS (>= 12) |
| relief8kmP50 | 1592.000000 | 1592.000000 | Both PASS (>= 1500) |
| beta500mTo8km | 2.410000 | 2.370000 | Both PASS (between [2,2.6]) |
| fill10ShareP50 | 0.004000 | 0.005000 | Both PASS (<= 0.05) |
| pits025Per1000km2P50 | 2.600000 | 2.600000 | Both PASS (<= 50) |
| axisCoherence40kmP50 | 0.232000 | 0.231000 | Both PASS (between [0.14,0.64]) |

All-pits INFO: **134.7 → 250.9 per 1000 km²**. Fine smoke rows add the synthetic background through the same element metric paths:

| Fine smoke row | Without M5 | With M5 |
| --- | --- | --- |
| R1 steep/flat/ratio | 43.169277 / 52.265606 / 0.825960 | 45.319787 / 52.549303 / 0.862424 |
| R1d steep/flat/ratio | 4.393956 / 4.523939 / 0.971268 | 13.862117 / 9.303933 / 1.489920 |
| R1e steep/flat/ratio | 4.393956 / 4.523939 / 0.971268 | 13.862117 / 4.523939 / 3.064170 |
| R2 p50/p90 | 40.858672 / 46.874950 | 40.701403 / 48.087175 |
| R3′ beta | 3.714672 | 3.301232 |

Smoke R1e passes ≥2; R2 passes its 0.5° median-drop and 48.4° p90 guards; R3′ passes [2, 3.348781]. R1 and R1d are INFO. U follows the envelope at slope offsets in integration; the proposed wiring patch holds U at the centre. That difference remains unvalidated in wired terrain.

Unofficial cost: 15 interleaved million-call rounds; M3 median **42.557000 ns**, combined **191.032700 ns**, paired add-on **147.920800 ns ≤214**. Two warm builds, zero extra builds. No CPU-quiet slot or separate rock-only timing was run.

Registered test: exit **0**, **duration_ms 1384.0743**; 17 passed, 0 failed, 1 skipped. Per-test duration_ms:

| Test | duration_ms |
| --- | --- |
| HARD 1: literal +0 exclusions and finite outputs | 0.8952 |
| HARD 2: bounds, upper envelope and non-vacuity on 65536 fixture samples | 20.2819 |
| HARD 3: smoothstep endpoints, monotonicity and continuity | 0.9661 |
| HARD 4: pinned forward, reverse and child determinism | 69.4184 |
| HARD 5: arithmetic audit and negative controls | 2.612 |
| HARD 6: frozen constants, bands and monotone strata budget | 0.5903 |
| HARD 7: continuity, shared edges, speckle and level-dependent negatives | 29.7004 |
| ROW gate: measure all rows and controls | 1162.04 |
| ROW gate: base fixture classes and drainage | 0.271 |
| ROW gate: R1e contrast (R1 and R1d INFO) | 0.1399 |
| ROW gate: R1e negative controls | 0.0653 |
| ROW gate: R2 slope band and depth/KAPPA x4 control | 0.0497 |
| ROW gate: R3' fine spectrum and no-rock control | 0.0931 |
| ROW gate: R3 speckle x4 negative (equal gains INFO) | 0.0302 |
| ROW gate: R4 band limit and long-octave control | 0.0259 |
| ROW gate: R6 new strict pits and round-2 negative | 0.0283 |
| ROW gate: R5 drainage (forced weight and reversed strata reported) | 0.0701 |
| ROW COST: warm synthetic add-on <= 214 ns (opt-in benchmark) | 0.0215 |

Verification commands, worktree cwd unless stated; each exited **0**:

- `node test-results/mountains/m5/tune-round4.mjs > test-results/mountains/m5/tune-round4.log 2>&1`
- `node test-results/mountains/m5/tune-refine-round4.mjs > test-results/mountains/m5/tune-refine-round4.log 2>&1`
- `node test-results/mountains/m5/tune-controls-round4.mjs > test-results/mountains/m5/tune-controls-round4.log 2>&1`
- `node --test --test-name-pattern='HARD' tests/mountain-rock-detail.test.mjs > test-results/mountains/m5/hard-pre-gate.log 2>&1`
- `node --test tests/mountain-rock-detail.test.mjs > test-results/mountains/m5/element.log 2>&1` — single registered gate run.
- `node test-results/mountains/m5/rows-all-pools.mjs` — exact gate cross-check.
- `npx --no-install tsc --noEmit`
- `node test-results/mountains/m5/cost-bench.mjs > test-results/mountains/m5/cost-bench.log 2>&1`
- `node --check test-results/mountains/m5/integration-m3.mjs` — twice.
- PowerShell: `$env:M5_INTEGRATION_SMOKE='1'; node test-results/mountains/m5/integration-m3.mjs > test-results/mountains/m5/integration-smoke.log 2>&1; exit $LASTEXITCODE` — twice, first 220 m candidate, then final 280 m candidate.
- `node test-results/mountains/m5/render.mjs` — final gate seed 730901; CPU hillshades and depth map, black 0 m / white 55 m.
- `python test-results/mountains/m5/build-wiring-patch.py` — git show reads main 9971c3f; writes temporary source copies and the unapplied patch.
- `git apply --check C:/LLM/IWSDK/universe-atlas-wt/m5-rock/test-results/mountains/m5/m5-wiring.patch` — cwd C:/Users/Caldor/AppData/Local/Temp/atlas-m5-main-jv34vtfg.
- `node test-results/mountains/m5/check-saved-evidence.mjs > test-results/mountains/m5/saved-evidence-check.log 2>&1` — saved evidence only; no resampling.
- `git diff --check` — tracked diff only; task files are untracked/ignored, so this is not validation of their contents.
- `node test-results/mountains/m5/report.mjs` — generates this report from saved results.

Two inline Node measurePool(TUNING) probes and the inline digest/freeze writer also exited 0. They used no gate rows before freeze. Exploratory measurements contain rejected candidates, including beta <2 and failed depth controls; they are not claimed as passes. Initial read-only discovery of absent ancestor AGENTS.md paths exited 1; C:/LLM/IWSDK/AGENTS.md was found and read. No verification command failed.

Not run: full integration, any other integration seed/site, official isolated benchmark, optional synthetic COST, whole npm test, test:full, browser, GPU, network/downloads, patched typecheck or wired golden tests. No git-writing command ran. The patch remains unapplied.

Uncertainties: one smoke cannot establish real-world drainage; all strict smoke pits still increase despite the qualifying-pit row staying unchanged. Forward-gradient weight/depth variation can create toe pits, and R7 exceeds the affine bound at kinks. The CPU image shows strong contour benches, but visual naturalness and LOD behaviour are unvalidated. The full integration, official cost slot and eventual wiring checks remain coordinator work.