Round 2 is implemented but **M5 is not acceptance-ready: R1d fails**. Cost and registered-test runtime meet their targets in these unofficial measurements. No wiring or existing tracked source was changed; no git write command ran.

The module, element test, fixture and digest helpers are in src/mountain-rock-detail.ts, tests/mountain-rock-detail.test.mjs and tests/helpers/mountain-rock-detail-{fixture,digest}.mjs. Evidence scripts import the moved helpers; the old ignored helper copies were deleted. Fixture layers are cached across variants, and the fixture imports no M1–M4 module.

Final constants (frozen before the first gate measurement):

- SLOPE_ZERO_TAN = 0.17632698070846498: Required tan(10°); exact zero below this slope.
- SLOPE_FULL_TAN = 0.5773502691896257: Required tan(30°); full weight above this slope.
- SLOPE_STEP_M = 125: Fixed 125 m slope step preserves shared-vertex identity.
- MAX_DEPTH_M = 120: 120 m retains enough amplitude for the speckle control while meeting R2/R5.
- CAP_FRACTION = 0.5: Half-height cap preserves nonnegative carved relief and the upper envelope.
- CELL_M = 250: 250 m coarse cell; second cell is 125 m.
- OCTAVES = 2: Reduced from four to two; removes the 62.5/31.25 m cells and their cost.
- GAIN = 0.5: 0.5 retains the coarse/fine amplitude balance.
- RIB_NOISE_SCALE = 0.8: New 0.8 replaces literal 2; tuning beta 2.231 is near the requested centre.
- STRATA_PERIOD_M = 160: 160 vertical metres preserves the monotonicity budget.
- STRATA_WEIGHT = 0.2: 0.2 gives 24 m maximum strata amplitude, below 61.584 m.
- RIB_WEIGHT = 0.8: 0.8 complements the strata weight.
- JITTER_M = 30: 30 m phase jitter now reuses signed coarse noise; no separate noise lookup.
- SEED_SALT = 1757159915: Unchanged fixed salt decorrelates the rock seed.

Version remains mountain-rock-detail-1. Declared spectral bands remain 1000/500/250/125 m; reduction remains longest wavelength 1000 m, 32 segments, maximum edge 8000 m. These are spectral labels, not four noise evaluations or strict cutoffs. The corner hash drops one avalanche multiply, retaining integer coordinate mixing, Math.imul and the arithmetic audit. Early zero exits still precede noise. Background amplitude alone changed from 20 to 35: bandPowers measured **1.999673 m RMS** at 250–500 m on tuning transects. The analytic base is unchanged.

Only 730501–730508 were used to tune. Sweeps tried depth, gain and rib sharpness; the selected scale prioritises the requested spectral centre and speckle-control separation, but does not solve R1d. The gate constants were never changed after evaluation. Burnt 730601–730608 is evidence only.

Gate HARD results:

| Test | Measured result |
|---|---|
| HARD 1 | PASS: 810 exact +0 exclusions |
| HARD 2 | PASS: 32,768 gate and 32,768 tuning samples; zero violations; negative detail on all 16,831 / 16,835 steep samples |
| HARD 3 | PASS: 10,001 weight points and boundary checks |
| HARD 4 | PASS: 4,096 tuples, forward/reverse/child; digest below |
| HARD 5 | PASS: arithmetic audit; all 20 forbidden-code controls rejected |
| HARD 6 | PASS: frozen constants, bands, reduction, cap and monotone-strata budget |
| HARD 7 | PASS: 6,000 straddle pairs per pool plus 1,248 height-wrap and 432 threshold roots; three shared-edge lines, zero mismatches |

ROCK_DETAIL_DIGEST = 37e35b6b478a8d5d29ce7755b9ceead8ed3d7e496043c533ae24202dceb9b050.

HARD 7 analytic bound: base gradient ≤ 1.03; fixed-step slope Lipschitz ≤ 2√2·1.03/125; weight derivative ≤ 1.5/(tan30−tan10). Noise gradient ≤ 7.43/cell, rib derivative ≤ 2·0.8, and strata derivative ≤ 2/(0.3849001794597505·160). Coarse-noise jitter contributes 30·7.43/250. Combining the weighted 250/125 m rib terms, cap derivative 0.515 and product bounds gives **L_MAX = 18.560441**, hence a 0.01 m tolerance of 0.185604 m. Maximum straddle change: gate 0.044176 m, tuning 0.046843 m. Speckle changes 92.396912 / 95.275789 m correctly fail. Level-dependent slope gives 31 mismatches and correctly fails. Midpoint deviations are INFO only: gate module 44.698507 m, tuning module 41.396734 m, gate speckle 82.536554 m. The vacuous interpolation assertion was removed.

Gate rows (degrees, metres, fractions, and pits per 1,000 km² as applicable):

| Row | Gate measurement | Result |
|---|---|---|
| Base classes | flat 0.177776, steep 0.771300 | PASS |
| Base drainage | fill 0; qualifying pits 0 | PASS |
| Surface R1 | steep 20.130965, flat 17.039850, ratio 1.181405 | INFO |
| R1d | steep 13.035585, flat 17.456797, ratio 0.746734 | **FAIL ≥ 2** |
| R2 | p50 37.906680, p90 45.492039; no-rock 38.146240 / 44.305997 | PASS |
| R3 | beta 2.239503; no-rock 3.553737 | PASS, closer to 2.14 |
| R4 | long-wave share 0.150663 | PASS ≤ .20 |
| R5 | fill 0.019343, qualifying pits 0 | PASS |
| R5 all pits | 1143.165773 | INFO |

Gate controls use 730701–730704, except the no-rock baseline uses all eight:

| Control | Value | Required failure demonstrated? |
|---|---|---|
| No rock R1d | 1.006168; surface R1 0.809742 INFO | Yes |
| Forced weight R1d | 1.068394; surface R1 0.860643 INFO | Yes |
| Depth ×4 R2 | p50 40.493008, p90 55.481174 | Yes, p90 > 48.4 |
| No rock R3 | 3.553737 | Yes, outside [2, 2.6] |
| 31.25 m speckle R3 | 1.911341 | Yes, below 2 |
| Equal gains R3 | 2.234793 | INFO: the row cannot tell gain .5 from gain 1 |
| Extra 4 km octave R4 | 0.581649 | Yes, above .20 |
| Forced weight R5 | fill 0.011748, qualifying pits 54.318892 | Yes, pits > 50 |
| Reversed strata R5 | fill 0.007753, qualifying pits 0 | INFO: does not fail |

Separate tuning/burnt evidence from rows-all-pools.json; neither pool gates:

| Measurement | Tuning | Burnt |
|---|---|---|
| R1 INFO steep / flat RMS / ratio | 20.114218 / 16.867064 / 1.192514 | 19.927672 / 17.040745 / 1.169413 |
| R1d steep / flat RMS / ratio | 12.989875 / 17.453907 / 0.744239 | 12.899920 / 17.242616 / 0.748142 |
| R2 p50 / p90 | 37.902572 / 45.509013 | 37.897020 / 45.523153 |
| R2 no-rock p50 / p90 | 38.146815 / 44.299761 | 38.131197 / 44.315234 |
| R3 beta / no-rock beta | 2.231115 / 3.552675 | 2.232274 / 3.565179 |
| R4 long share | 0.168336 | 0.173952 |
| R5 fill / qualifying pits / all pits INFO | 0.019501 / 0.000000 / 1170.325219 | 0.019896 / 0.000000 / 1143.165773 |
| No-rock R1 INFO / R1d | 0.801638 / 0.983943 | 0.804353 / 1.012990 |
| Forced weight R1 INFO / R1d | 0.865704 / 1.060609 | 0.857772 / 1.043871 |
| Depth ×4 R2 p50 / p90 | 40.639479 / 55.616767 | 40.618344 / 55.492068 |
| Speckle R3 / equal gains INFO | 1.908165 / 2.200783 | 1.947510 / 2.206461 |
| Extra 4 km R4 | 0.618245 | 0.604726 |
| Forced weight R5 fill / qualifying pits | 0.010245 / 22.221365 | 0.009849 / 12.345203 |
| Reversed strata INFO fill / qualifying pits | 0.008307 / 0.000000 | 0.007832 / 0.000000 |

R1d fails in both evidence pools. No-rock/forced-weight R1d, depth ×4 R2, no-rock/speckle R3 and extra-octave R4 controls fail as required in both. Forced-weight R5 does **not** fail in tuning or burnt. Reversed strata does not fail. All exact RMS arrays, sample counts and controls are retained in rows-all-pools.json; the gate cross-check is identical to the registered record.

Pre-registered sizes were used: R1/R1d 257² at 31.25 m, one ±9 km-centred window per seed by parity; R2/R5 161² at 125 m; R3 two 1024-point transects at y = ±6000; R4 four 1024-point transects on the first four seeds. The registered file evaluates ROWS only on the gate pool.

Unofficial final cost: M3 alone **43.492900 ns**, combined **196.037100 ns**, paired add-on median **151.049200 ns**, versus 214 ns; 15 interleaved rounds of one million calls, two warm builds and zero extra builds. An earlier two-octave run measured 44.2486 / 198.6293 / 153.5615 ns. Rock-plus-slope was not separately timed. The shared-slot attempt failed with EPERM creating C:/LLM/IWSDK/.atlas-test-slot; direct measurements do not claim official CPU isolation.

Commands and exits:

- node --test tests/mountain-rock-detail.test.mjs > test-results/mountains/m5/element.log 2>&1 — test exit 1, **duration_ms 1251.2254**; 15 passed, one failed (R1d), one skipped (opt-in COST). The enclosing PowerShell read-log command returned 0 after Get-Content; it does not change the failing test result. HARD 1–7 durations: 0.7341 / 17.3473 / 0.7939 / 63.9419 / 2.5248 / 0.4816 / 26.0716 ms; row measurement 1054.9506 ms, remaining row assertions each < 0.3 ms.
- npx --no-install tsc --noEmit — exit 0.
- node test-results/mountains/m5/rows-all-pools.mjs — initial exit 1 from comparing in-memory NaN with JSON null for no-rock R4 (zero variance); corrected JSON-normalised comparison, exit 0. This caused one additional evidence cross-check measurement; no constants, seeds or thresholds changed.
- node tests/helpers/test-slot.mjs -- node test-results/mountains/m5/cost-bench.mjs — exit 1, lock-directory EPERM.
- node test-results/mountains/m5/cost-bench.mjs — exit 0, both direct runs; final output in cost-bench.json and cost-bench.log.
- node --check test-results/mountains/m5/integration-m3.mjs — exit 0.
- PowerShell: $env:M5_INTEGRATION_SMOKE='1'; node test-results/mountains/m5/integration-m3.mjs > test-results/mountains/m5/integration-smoke.log 2>&1 — exit 0, one seed/site, per-site start/completion progress.
- node test-results/mountains/m5/render.mjs — exit 0; regenerated without.png, with.png, rock-depth.png using burnt seed 730601.
- git apply --check C:/LLM/IWSDK/universe-atlas-wt/m5-rock/test-results/mountains/m5/m5-wiring.patch — exit 0 in C:/Users/Caldor/AppData/Local/Temp/atlas-m5-main-m9y12_yx, the round-1 scratch copy of main 9971c3f. API names did not change; patch was not regenerated or applied.
- node test-results/mountains/m5/report.mjs — exit 0; generates this report from saved measurements.

The integration smoke exits on execution errors, not metric failures. Its with-M5 M3 qualifying-pit row is **54 > 50** (without: 2.6); the other seven M3 rows pass at that one site. Fine rows with M5: R1 INFO 0.748244, R1d 0.444904, p50/p90 40.997404/48.665232, beta 2.821008. These are not integration acceptance. U follows the analytic envelope at both slope offsets; the staged wiring patch holds U at the centre, as previously specified.

Not run: full integration, official isolated benchmark, opt-in synthetic COST, full npm test, test:full, browser, GPU, network/downloads, or patched integration/type-check/goldens. No acceptance claim is made for those. Remaining uncertainty is whether a different permitted shape can satisfy R1d while retaining the spectrum and drainage guards. Box-filter leakage across slope-class boundaries is a plausible contributor; this run does not establish impossibility. No gate-driven retuning was performed.