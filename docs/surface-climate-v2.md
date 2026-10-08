# surface-climate-2 (BIOME2-CLIMATE, milestone M1)

Package R5-ATLAS-CLIMATE-M1, branch `climate/m1`. Plan: `docs/biome-climate-increment-2-plan-v2-2026-10-04.json`
(P1, M1 steps 1-7; v1 formulas). Versions: `CLIMATE_VERSION` `surface-climate-1.1-geo-g` -> `surface-climate-2`;
`TREE_HABITAT_VERSION` `tree-habitat-2-climate` -> `tree-habitat-3-heat` (expression unchanged; the heat cap moves the
`forestSuitability01` it reads). `TERRAIN_VERSION` is not touched here (coordinator).

**Status: STOP at step 8.** The harness site SITE_A fails the complete SITE_RULE after M1, and the existing
deterministic search finds no replacement in its 100 km disc (section 6). Steps 1-7 are implemented and pass their
own acceptance. Nothing was retuned to keep the site.

## 1. Model (all per sample, no per-sample transcendental)

| Step | Change | Formula |
|---|---|---|
| 1 | PDD snow | Sinusoidal year, `PDD(T0) = 365.25 * half * H((annual - T0)/half)`, `H(v) = (sqrt(1-v^2) + v acos(-v))/pi`; `snowFraction = clamp01((250 - PDD0)/100)`. H and G (`acos(-v)/pi`, the fraction of the year above a threshold) are tabulated on 513 nodes at module init with `detAcos` and read by linear interpolation. The label 'Alpine / polar snow' (snowFraction > 0.6) means PDD0 < 190 C d; ELA tests use the label. |
| 2 | Warm-column lapse | `lapse * clamp(1 - 0.005 (T_datum - 288), 0.8, 1.1)`. Mandatory: without it the Earth equator label ELA is 4302 m (< 4450). |
| 3 | Warmest-month ceiling | `Tw' = 320 + e/(1 + e/40)` for the excess e above 320 K; the half-range is rebuilt symmetrically from Tw' and floored at 0, the annual mean is unchanged. |
| 4 | Heat cap | `forest *= 1 - smooth(Tw', 305, 316)`; forest is 0 at annual >= 320 K. |
| 5 | PET effective moisture | `PET = max(120, 58.93 * biotemp)` (Holdridge), `biotemp = (PDD0 - PDD30)/365.25`; `P = P_REF * clamp(water/0.7, 0.2, 1.2) * max(0.2, 1 + 0.025 (annual - 288)) * Z * (0.4 + 1.2 noise)`; `effM = AI/(AI + 0.6)`, `AI = P/PET`. The 0.6 half-point keeps the classifier thresholds at their aridity-index meaning. |
| 6 | ITCZ zonal band | `Z(dI) = 1 + 1.6 g(dI,10) + 0 g(dI-50,12) - 0.75 g(dI-28,12) - 0.4 g(dI-88,12)`, `g(x,w) = exp(-(x/w)^2)`, `dI = abs(lat - ITCZ)`. ITCZ = argmax row of the annual insolation table (equator below ~54 deg obliquity, a pole above). Z and the subsidence term are built per forcing as 513-row tables over x = sin abs(lat) with `detExp`; a sample does one interpolation. `dryBelt01` is now the subsidence term. Hadley edge fixed at 30 deg (Q4). |

New `ClimateSample` fields: `pdd` (C d above 0 C), `precipMm`, `petMm`. Removed calibration: `T_SNOW_K`, `SNOW_RAMP_K`,
`BELT_LO/HI/EDGE`, `BELT_MOISTURE`. New forcing fields: `itczSinLat`, `itczLatDeg`, `hadleyEdgeDeg`, `zonal`, `subsidence`.

## 2. Decisions

All are Opus-decided on Kasper's instruction and can be overruled.

- **Q2 -> (a).** Move the harness site using the existing deterministic search after M1. Add "centre and rings in
  {4,5,6} with >= 1 K Tc margin" to SITE_RULE. REFERENCE e6a0b39 stays unchanged. Result: STOP (section 6).
- **Q4.** The wind belts stay at 30 deg from the ITCZ (`hadleyEdgeDeg` 30). The subsidence centre is 28 deg.
- **Q6.** The heat cap ships as physics. Consequence, stated plainly: **Selawyn and Raiva lose almost all of their good
  forest.** Selawyn falls from 48.7 % of land to 2.0 %, and Raiva from 47.8 % to 0.2 %. Across the corpus, the median
  share of land with forest > 0.5 falls from 42.1 % to 4.7 %.
- **Half-range floor.** After the ceiling, the rebuilt half-range is floored at 0.
- **P_REF_MM 1000 -> 650 (new, step 6).** With P_REF 1000, none of the 7776 round-1 candidates and none of the 15840
  round-2 coarse candidates met the plan's Earth targets. The cause is that mid-latitude effM sits near 0.8, and the
  required 1.2x P(45-60)/P(15-35) ratio rules out a mid-latitude dip. P_REF is the one number that sets P against PET,
  so it was calibrated together with the band.

## 3. Calibration (step 6)

The calibration uses only the Earth reference: 288 K, 23.44 deg, water 0.7, g 9.81, all directions, h = 0, noise
included. It reads no catalogue planet, no SITE_A value and no corpus value.

Targets (plan v1 P1 step 6), each needing a margin of at least 0.02:

- P(15-35) <= 0.55 P(0-10)
- P(45-60) >= 1.2 P(15-35)
- P(>75) < 0.35 P(0-10)
- effM(0-10) >= 0.6
- effM(18-32) <= 0.40
- effM(45-60) in 0.45-0.65

Choice rule: among the passing candidates, take the one closest to the plan's starting band.

The scans are in `test-results/climate-m1/calibrate-zonal*.mjs` and `*.out.jsonl`:

| Round | Candidates scanned | Passing |
|---|---|---|
| Round 1 | 7776 | 0 |
| Round 2, coarse | 15840 | 0 (best margin 0.006) |
| Round 2, fine | 12960 | 240 |

The chosen candidate is [a 1.6, 0, 0.75, 0.4; w 10, 12, 12, 12; PET_MIN 120; P_REF 650], with distance 2.5 and
minimum margin 0.021. Its live values on the Earth reference:

| Quantity | Value | Target |
|---|---|---|
| P(15-35)/P(0-10) | 0.199 | <= 0.55 |
| P(45-60)/P(15-35) | 1.221 | >= 1.2 |
| P(>75)/P(0-10) | 0.072 | < 0.35 |
| effM(0-10) | 0.627 | >= 0.6 |
| effM(18-32) | 0.264 | <= 0.40 |
| effM(45-60) | 0.627 | 0.45-0.65 |

The binding constraint is P(45-60)/P(15-35) (margin 0.021). More robust candidates exist, such as
[2, 0, 0.85, 0.4; 12, 12, 16, 12; 120; 625] with margin 0.05. They were not chosen because the choice rule picks the
closest candidate, not the most robust one.

## 4. Acceptance (after M1, `test-results/climate-m1/after/measure-all.json`)

| Gate | Band | Before (shipped) | After M1 | |
|---|---|---|---|---|
| Earth ELA equator (label) | >= 4450 m | 5674 | 4608 | pass |
| Earth ELA 45 deg | 2700-3100 | 2726 | 3003 | pass |
| Earth ELA 60 deg | 1200-1700 | 810 | 1505 | pass |
| Earth ELA 70 deg | 550-1000 | 0 | 719 | pass |
| Earth ELA 78 deg | 250-650 | 0 | 426 | pass |
| Polar ITCZ (311 selected, 213 judged) | all pass | 120 pass / 93 fail | 213 / 0 | pass |
| Selawyn max Tw' | <= 350 K | 388.8 | 345.3 | pass |
| Land with Tw' >= 316 and forest > 0 (4 worlds; corpus) | 0 | 25678; 637949 | 0; 0 | pass |
| Selawyn forest > 0.5 | <= 10 % | 48.7 | 2.0 | pass |
| Raiva forest > 0.5 | <= 15 % | 47.8 | 0.2 | pass |
| Maithea land snow (label) | 15-40 % | 19.7 | 20.5 | pass |
| Selawyn / Raiva land snow | 0 % | 0 / 0 | 0 / 0 | pass |
| SITE_A, complete SITE_RULE plus {4,5,6} with >= 1 K Tc margin | pass | pass (class 6, Tc margin 0.549 K) | **fail** | **STOP** |

Negative tests, each kept in the suite:

- The shipped annual-mean snow rule gives a 60 deg label ELA of 810 m, which fails the 1200-1700 m band
  (`tests/climate-earth-reference.test.mjs`).
- The shipped fixed dry belt fails the polar-ITCZ test on 93 of the 213 judged planets
  (`tests/acceptance/climate-agreement.test.mjs`).
- Without the warm-column factor, the equator label ELA is 4302 m.
- The uncalibrated starting band misses the Earth targets: effM(18-32) is 0.472 and effM(45-60) is 0.799.

## 5. Re-baseline against the prototype (plan v2 expectedOutcomes)

| Quantity | Shipped | Prototype M1 (uncalibrated) | After M1 (calibrated) |
|---|---|---|---|
| Maithea snow label | 19.7 % | about 20 % | 20.5 % |
| Maithea range snow (> 3 km, abs(lat) < 60) | 27.5 % | about 36 % | 34.4 % |
| Lethuris snow label | 20.9 % | about 11 % | 11.0 % |
| Selawyn max Tw' | 388.8 K | about 345 K | 345.3 K |
| Selawyn forest > 0.5 | 48.7 % | 2-4 % | 2.0 % |
| Raiva forest > 0.5 | 47.8 % | 6-10 % | 0.2 % |
| Corpus snow label median | 6.8 % | about 3 % | 3.5 % |
| Corpus forest > 0.5 median | 42.1 % | about 12 % | 4.7 % |
| Maithea effM p10 / p50 / p90 | .26 / .484 / .715 | .599 median | .196 / .488 / .672 |

Two numbers come out below the prototype: Raiva forest (0.2 % against 6-10 %) and corpus forest (4.7 % against about
12 %). The prototype's moisture was uncalibrated and wetter. The calibrated subtropics are now dry (Earth effM(18-32) =
0.26), so less forest survives the heat cap. Raiva's ITCZ is polar: its tropics lie 60-90 deg from the ITCZ and receive
the polar-desert term (effM 0.34-0.44 at 0-15 deg).

## 6. SITE_A (step 8): STOP

SITE_A (`tests/harness-sites.mjs`, 280 m, 16.9 deg) now sits on the flank of the subtropical subsidence band
(dryBelt01 0.47 at 15-20 deg). After M1 its centre reads:

- biome 'Dry upland', not forestPotential
- effM 0.380 (rule: >= 0.6)
- eco class 5
- Tc margin 0.497 K (rule: >= 1 K)

All 96 ring samples are class 5, with effM 0.379-0.381 and no forest. Shipped values were effM 0.750 and class 6.

`test-results/climate-m1/site-disc.mjs` scanned the 4096 SITE_SEARCH points in the 100 km disc. Output:
`after/site-disc.json`.

| Disc count | Value |
|---|---|
| Land points | 3288 |
| Points with effM >= 0.6 | 0 |
| Points with forestPotential | 0 |
| effM p10 / p50 / p90 / max | 0.363 / 0.384 / 0.402 / 0.413 |
| Points in classes {4,5,6} | 1861 (all class 5) |
| Points also with Tc margin >= 1 K | 4 |
| Points passing every centre clause | 0 |

The disc is no longer forest, and the existing search finds no site. This is the brief's STOP condition. The two tests
in `tests/harness-sites.test.mjs` that assert a passing site exist fail on this branch, deliberately (see section 7).

Options for the owner (not taken here):

- (a') Widen the search disc, or search a different latitude band such as the 45-60 deg storm track or 0-8 deg near the
  ITCZ. This changes the search, not just its result.
- (b) Accept a site outside {4,5,6}.
- (c) Retune the band. This is rejected: physics is never retuned for a test.

The life and forest digests that read SITE_A (`life-cpu-digest`, `terrain-leaf-loop-digest`) still pass unmodified.
They pin rendered life at fixed inputs, not the site rule.

## 7. Ledger: moved pins in files this package does not own

This ledger comes from the 88-file affected run (`after/test-affected.log`, list in `after/test-affected-files.txt`).
See the package report for the per-file list. Expected owners and movers:

- `tests/golden/golden.json` sections climate / biomes / census / placeQuery / terrain (coordinator)
- `tests/acceptance/version-compat.test.mjs` (climate version string)
- `tests/lod-consistency.test.mjs` (mountains/riser-lod owner; not touched)
- `tests/place-query.test.mjs`
- `tests/tile-metadata.test.mjs`
- `scripts/climate-calibration-report.mjs` reads the removed `T_SNOW_K` / `SNOW_RAMP_K` (needs an owner edit)

## 8. Deferred (no timing measured in this package)

- Per-sample cost <= 150 ns and zero allocation per sample
- Interleaved A/B cost ratios against surface-climate-1.1
- Cold build of `climateForcingFor` (now adds two 513-row `detExp` tables per forcing)

`surface-climate.bench.mjs` was not run.
