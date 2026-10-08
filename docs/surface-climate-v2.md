# surface-climate-2 (BIOME2-CLIMATE, milestone M1)

Package R5-ATLAS-CLIMATE-M1, branch `climate/m1`. Plan: `docs/biome-climate-increment-2-plan-v2-2026-10-04.json`
(P1, M1 steps 1-7; v1 formulas). Versions: `CLIMATE_VERSION` `surface-climate-1.1-geo-g` -> `surface-climate-2`;
`TREE_HABITAT_VERSION` `tree-habitat-2-climate` -> `tree-habitat-3-heat` (expression unchanged; the heat cap moves the
`forestSuitability01` it reads). `TERRAIN_VERSION` is not touched here (coordinator).

**Status.** The first pass (tip d134a87) hit two STOP conditions:

1. **SITE_A (step 8).** The harness site failed the complete SITE_RULE after M1, and the existing deterministic search
   found no replacement in its 100 km disc (section 6).
2. **LOD ceiling (lod-consistency).** PDD snow (step 1) pushed the frozen L6 ceilings over their limits (section 6b).

Steps 1-7 were implemented and passed their own acceptance; nothing was retuned to keep the site or the ceilings.
The package was then resumed under the six decisions in section 2a (climate-m1-decision, 2026-10-08), which settle
both STOPs without changing the physics. Resume state: steps 1-6 done (SITE_A moved, section 6; Earth forest 46.8 %,
section 4); step 7 first STOPPED: lod-consistency fails 20 rows at L6, L8 and L10 (snow, forest, name and colour),
not only the L6 colour rows decision 2 allowed re-pinning (section 6b). That STOP was decided in climate-m1-decision-2
(section 2b): SITE_A accepted as found; bisect per climate step, then re-pin with a ledger. Both are done (sections 6
and 6b); the package continued from step 8 and **STOPPED at step 8** (section 6c): moving SITE_A breaks
`life-continuity-scenario:117`, which is not on any grant. climate-m1-decision-3 allowed a longer recede
(ruling 1) and registered the Earth test (ruling 2, done); ruling 1 then **STOPPED** on its own gate (section 6d). climate-m1-decision-4 shipped the 360-frame change with
the deviation recorded, and logged the old-site in-exit drop as FAUNA-NEAR-DROP with a `todo` reproducer (section 6d).

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
- **P_REF_MM 1000 -> 650 (new, step 6).** Round 1 scanned 7776 candidates with P_REF fixed at 1000. None met the
  plan's Earth targets. Mid-latitude effM sits near 0.8, and the required 1.2x P(45-60)/P(15-35) ratio rules out a
  mid-latitude dip. P_REF is the one number that sets P against PET, so round 2 calibrated it together with the band:

  - The coarse grid (15840 candidates) varied P_REF from 400 to 1000. None passed; the best margin was 0.006.
  - The fine grid varied P_REF from 600 to 800 and found 240 passing candidates.

  These finite grids do not prove that no band works at 1000 mm. They show only that none of the scanned bands did.

## 2a. Resume decisions (climate-m1-decision, 2026-10-08)

Each of the six is **Opus-decided on Kasper's instruction, overrulable**. They answer the two STOPs and the review of
d134a87.

1. **SITE_A: whole-planet nearest-first search; no relaxation, no site outside {4,5,6}.** A new stage in
   `tests/helpers/harness-site-search.mjs` walks 65,536 Fibonacci directions over Maithea in great-circle order from
   `SITE_A_LEGACY` (ties by index) and stops at the first that passes: (1) the full SITE_RULE, unchanged; (2) centre and
   the 0.5/1/2 km rings in {4,5,6} at the live values and with the seasonal half-range shifted by +-1 K (Tc and Tw move
   in opposite directions, Ta fixed); (3) the 5 km and 10 km rings (64 points each) in {4,5,6}; (4) `groundLookOf` all
   zeros at the centre. If none passes: STOP with the 10 nearest near-misses. Reason: the 100 km disc has no forest at
   all, and 0-8 deg is class 7. Result: section 6.
2. **lod-consistency L6: re-measure after riser-lod merged, then re-pin within limits; no visual snow-blend widening.**
   Only the L6 RGB p99 rows of Maithea and Lethuris may be re-pinned, at the measured value rounded up to 0.1, with a
   ledger line "surface-climate-2 PDD snowline", and only if the L8-and-finer rows pass unchanged, the snow, forest
   and name disagreement rows pass their existing limits, and the new values are at most 5 % above 43.01 / 58.06.
   `LOD_TOLERANCES.coarseKeeps.snowL6` (98 %) is a plan tolerance and is not changed; the test gets a Maithea
   retention ceiling at the measured value rounded down to 0.1, with 98 % kept as the tracked target. Granted lines:
   exactly these, plus `lod-carving-reduction:69,79` and `terrain-mountains-assembly:38` (moved pins with a ledger).
   Reason: the failure is a sharper, more physical snowline, not a LOD defect; "snow kept" reads the snow label, so a
   visual blend cannot fix it, and a blend would break colour == classifier snow and pre-empt the open A4. Result:
   section 6b.
3. **Calibration: P_REF_MM 650 and the chosen band (margin 0.021) are ratified; the 0.05 candidate is not taken.**
   The 0.05 candidate sits on the scanned grid's edge (a1 = 2 and w3 = 16 are the grid maxima), is drier (effM 0.595
   at 45-60 deg against 0.627), and M2 changes moisture again. Widening the search was "report and continue", not a
   STOP. The missing piece was a pre-registered choice rule, now recorded in section 3.
4. **Fell-zone test: the synthesised substrate colour is rejected.** Instead: a positive PDD invariant (every land
   column with Tw < T_TREE - 2 x ramp = 271 K has snowFraction > 0), and the fell colour assertion marked `todo` with
   the finding "under PDD snow no snow-free fell band exists; the climate rock band in `waterWorldLandColour` is
   unreachable." Follow-up for the coordinator: retire the rock band, or redefine it on PDD in a later terrain-colour
   version. Reason: a warmest month below -2 C is permanent snow (Koppen EF); a colour check on a state that is never
   rendered proves nothing.
5. **Forest loss: acceptable as M1 physics after one Earth check; Kasper sees it before merge.** New pre-registered
   test in `tests/climate-earth-reference.test.mjs`: on the Earth reference (h = 0, 60k directions) the share of
   directions with forestSuitability01 > 0.5 lies in 25-55 % (band: Opus's judgement; Earth's present forest is about
   31 % of land, from memory). Outside the band: STOP, no tuning. The merge waits for Kasper's look until the end of
   the round; without an answer by then it merges on this decision (nothing is deployed; it is revertible). Result:
   section 4.
6. **Other merge gates.** Blocking: `scripts/climate-calibration-report.mjs` is fixed in this package (granted); the
   `version-compat:335` pin and the `TERRAIN_VERSION` bump are the coordinator's; the real `npm run test:affected` and
   then `test:full`, including the golden sections climate, biomes, census, placeQuery and terrain (golden re-pins are
   the coordinator's); `surface-climate.bench` in a quiet window (<= 150 ns per sample, zero allocation, A/B ratio,
   cold build) blocks the merge because this is on the hot path of every land sample. Not blocking:
   `planet-geophysics:162` (pre-existing, unrelated), the weaker obliquity assertion (accepted), `eco-identity-site:54`
   (stays `todo`).

## 2b. Second resume decisions (climate-m1-decision-2, 2026-10-08)

Both are **Opus-decided on Kasper's instruction, overrulable**.

- **(a) SITE_A accepted as found** (the equatorial highland, section 6). No constraint is added to the search after
  seeing the result. Gates: `life-cpu-digest` (including its "output changes on most frames" assertion),
  `terrain-leaf-loop-digest`, `terrain-elevation-identity` and `terrain-relief-hypsometry` pass unmodified at the new
  site; the SITE_A browser tests go on the coordinator's merge ledger. Result: section 6.
- **(b) The 20 LOD rows:** bisect per climate step with `lod-measure.mjs` (gates G1: heights and ocean identical to
  main at every level; G2: step 0 equals main and every failing row starts at a named step; G3: no failure at L12 or
  L14; G4: the tip within 5 % of the e3c3358 table), then re-pin every failing row in `SHIPPED_CEILINGS` at the
  measured value rounded up to 0.1 with a per-row ledger naming the step, a Maithea L6 snow-kept retention limit of
  95.2 %, no `LOD_TOLERANCES` change, dated A3 lines, the `terrain-mountains-assembly` heights+ocean / colour split,
  and a follow-up item for the LOD owner and A4. The climate code is not changed to reduce the disagreement. Result:
  section 6b.

### Open M2 physics question (decision 5)

On worlds whose ITCZ sits at a pole, the polar-desert term (centre dI = 88 deg) lands on the geographic equator. This
is the main reason Raiva's tropics are dry (effM 0.34-0.44 at 0-15 deg). The Earth targets cannot constrain that term,
because on Earth dI = 88 deg is the pole. M2 must decide whether the polar-desert term should key on distance from the
ITCZ (as now) or on cold-air subsidence (temperature), before re-running the calibration.

## 3. Calibration (step 6)

The calibration uses only the Earth reference: 288 K, 23.44 deg, water 0.7, g 9.81, all directions, h = 0, noise
included. It reads no catalogue planet, no SITE_A value and no corpus value.

**Source of the targets.** They come from plan v1, `plan.workPackages[0].changes`, M1 step 6, of the BIOME2 increment
plan. That file is not tracked in this repo (it lives in the coordinator's scratchpad as `biome2-plan.json`); plan v2
(`docs/biome-climate-increment-2-plan-v2-2026-10-04.json`) says "v1 formulas" but does not repeat them. The step-6
text, word for word:

> 6) ITCZ zonal band (replaces the BELT_* constants at :54 and their use at :272/:285-287).
>    - itczSinLat is the argmax row of the forcing's existing 65-row qMean table: the equator below about 54 deg obliquity, the poles above. Store it and hadleyEdgeDeg = 30 on the forcing.
>    - dItcz = angular distance (deg) from the ITCZ.
>    - Z = 1 + a1\*detExp(-(dItcz/w1)^2) + a2\*detExp(-((dItcz-50)/w2)^2) - a3\*detExp(-((dItcz-28)/w3)^2) - a4\*detExp(-((dItcz-88)/w4)^2). Squares are written as products.
>    - Start from a = (0.9, 0.6, 0.55, 0.4) and w = (10, 12, 9, 12), then CALIBRATE: the prototype's subtropics were not dry.
>    - Targets on the Earth reference (288 K, 23.44 deg, water 0.7, g 9.81), as land zonal means of P relative to the ITCZ band: 15-35 deg <= 0.55x, 45-60 deg >= 1.2x the 15-35 deg band, poleward of 75 deg < 0.35x.
>    - Effective-moisture targets: >= 0.6 at 0-10 deg, <= 0.40 at 18-32 deg, 0.45-0.65 at 45-60 deg.
>    - Keep dryBelt01 as a diagnostic (the subsidence term).

As implemented (the "ITCZ band" is read as 0-10 deg), each needing a margin of at least 0.02:

- P(15-35) <= 0.55 P(0-10)
- P(45-60) >= 1.2 P(15-35)
- P(>75) < 0.35 P(0-10)
- effM(0-10) >= 0.6
- effM(18-32) <= 0.40
- effM(45-60) in 0.45-0.65

**Choice rule (implementer-set, ratified by decision 3).** Among the passing candidates, take the one closest to the
plan's starting band; a candidate passes only with a minimum margin of at least 0.02. Neither the rule nor the 0.02
floor was written down before the round-1 scan; both were set by the implementer and ratified afterwards.

**Pre-registered for M2 (decision 3), fixed before any M2 scan.** Among candidates with minimum margin >= 0.02, choose
the one closest to the shipped M1 constants (a = 1.6, 0, 0.75, 0.4; w = 10, 12, 12, 12; PET_MIN 120; P_REF 650),
P_REF included.

**Earth values: source flags (as plan v1 step 7 asks).**

| Value | Used for | Flag |
|---|---|---|
| ELA 45 deg 2984 m, 60 deg 1528 m, 70 deg 673 m, 78 deg 349 m; equator >= 4450 m | ELA acceptance bands | from memory (plan v1 thesis); not verified in this package |
| Zonal P ratios and effM bands above | calibration targets | from memory (plan v1 step 6; coarse literature ratios); not verified |
| Holdridge PET = 58.93 x biotemperature (Holdridge 1947) | step 5 | from memory (plan v1 step 5) |
| Earth forest about 31 % of land | decision 5 band 25-55 % | from memory (decision 5); the band itself is a judgement |
| Earth reference body 288 K, 23.44 deg, water 0.7, g 9.81 | all of the above | 23.44 deg and 9.81 m/s^2 are standard values; 288 K and water 0.7 are model conventions |

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
closest candidate, not the most robust one. Decision 3 keeps this choice: the 0.05 candidate lies on the grid edge and is drier.

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
| Earth reference forest > 0.5 (h = 0, 60k directions; decision 5, pre-registered in c05ec06) | 25-55 % | - | 46.8 % | pass |
| SITE_A, original SITE_RULE (moisture, height, forest, rings) | pass | pass (effM 0.750) | old site fails (effM 0.380, no forest); **new site passes** (effM 0.644, ring forest 1.0) | pass after move (section 6) |
| SITE_A, decision-1 clauses: {4,5,6} live and at +-1 K, 5/10 km rings, ground look 0 | pass | fail (class 6, margin 0.549 K) | old fails (class 5, 0.497 K); **new passes** (class 4, margin 6.64 K) | pass after move (section 6) |
| lod-consistency rows (all levels; decision-2 conditions) | within | pass (every row) | 20 rows fail (L6, L8, L10); snow kept 95.26 % | STOP, then decided by decision-2 (b): bisect G1-G4 pass, 20 rows re-pinned, retention 95.2 % (section 6b) |

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

## 6. SITE_A (step 8): first-pass STOP, resolved by decision 1

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

Options listed for the owner at d134a87: widen or move the search; accept a site outside {4,5,6}; retune the band
(rejected). Decision 1 chose a whole-planet nearest-first search with the extra eco-class clauses (section 2a).

### Resolution (resume step 4)

`tests/helpers/harness-site-search.mjs` `searchSitePlanet` visits the 65,536 Fibonacci directions of Maithea in
great-circle order from `SITE_A_LEGACY` (ties by index) and returns the first that passes SITE_RULE (unchanged) and
`SITE_CLASS_RULE` (clauses 2-4 of decision 1). Script and output: `test-results/climate-m1/resume/site-planet.mjs`,
`site-planet.json`. It found a site at visiting rank 708 (Fibonacci index 35760) after rejecting 337 land points;
the run takes 2.6 s.

| | surface-climate-1.1 SITE_A (old) | surface-climate-2 SITE_A (new) |
|---|---|---|
| Literal (body-frame m, direction x radius) | [4075043.7, -1510938.2, 2845723.8] | [4096333.3, -474418.9, 3159436.6] |
| Found by | SITE_SEARCH disc, index 55 | SITE_PLANET_SEARCH, index 35760, rank 708 |
| Distance from SITE_A_LEGACY | 11.64 km | 1083.1 km (1085.1 km from the old site) |
| Latitude, longitude | -16.91, 34.93 deg | -5.24, 37.64 deg |
| Ground (sea 0) / ring minimum | 280.2 m / 255.4 m | 3064.3 m / 2971.5 m |
| Biome / forestPotential | 'Dry upland' / no (under climate 2) | 'Temperate ground' / yes |
| effM centre / ring minimum | 0.380 / 0.379 (0.750 under climate 1.1) | 0.644 / 0.640 |
| forestSuitability01 / ring forest share | 0 / 0 | 0.731 / 1.0 |
| Eco class live, at -1 K, at +1 K half-range | 5, 8, 5 | 4, 4, 4 |
| Ta / Tc | - | 285.95 K / 284.51 K |
| Tc margin min(tropical, boreal) | 0.497 K | 6.643 K (to the tropical edge; 14.36 K to the boreal edge) |
| groundLookOf at the centre | [0, 0.217, 0, 0] | [0, 0, 0, 0] |

The new site is a **tropical-highland temperate forest**, not the 40-55 deg mid-latitude forest the decision
expected: the nearest passing direction lies 5 deg south of the equator at 3 km, where the height lapse puts the
coldest month 6.6 K below the tropical threshold and the seasonal range is small (Tw - Ta = 1.4 K). It is the
nearest direction that passes every clause; no latitude band was chosen by hand. Consequences to watch in M2: the
site's class depends on its height (the lapse), and its effM margin over the 0.6 rule is 0.044.

Gates (`tests/harness-sites.test.mjs`, `tests/eco-identity-site.test.mjs`, shared slot): harness-sites 6/6 pass
(including the literal reproduction, the new eco-class clause test, and a record that the climate-1.1 site and the
disc search no longer pass); eco-identity-site :32 (class 4, ground look all zeros) and :45-46 (all rings in
{4,5,6}) pass. :54 (60 km ring) stays `todo` (decision 6): the ring is now {2:5, 4:26, 6:4, 8:29}.

**Decision-2 (a) gates at the new site** (`test-results/climate-m1/resume/site-a-gates.log`, all four files
unmodified since main): `life-cpu-digest` 2/2 (the life output is identical to the reference for the fixed pose
sequence, and "output changes on most frames" holds), `terrain-leaf-loop-digest` pass, `terrain-elevation-identity`
4/4 (one test:full skip), `terrain-relief-hypsometry` 7/7 (three test:full skips): 15 pass, 0 fail, 4 skipped.

**Margins of the new site** (recorded for M2, which re-checks SITE_A):

| Clause | Value | Rule | Margin |
|---|---|---|---|
| effM centre / ring minimum | 0.644 / 0.640 | >= 0.6 | +0.044 / +0.040 (P can fall about 17 % before the centre fails) |
| Height above sea, centre / ring minimum | 3064.3 / 2971.5 m | >= 250 m | +2814 / +2722 m |
| Ring forest share | 1.0 | >= 0.8 | +0.2 |
| Tc (Ta 285.95 K) | 284.51 K | class 4: Tc < 291.15 K and >= 270.15 K | 6.64 K to the tropical edge, 14.36 K to the boreal edge |
| Distance / rank | 1083.1 km from SITE_A_LEGACY, 1085.1 km from the old site | nearest-first | rank 708 of 65,536 (index 35760) |

Users of SITE_A that move with it (they import the constant): `tests/life-scenario.mjs`,
`tests/forest-frame-fixture.mjs`, `tests/desktop-perf.browser.mjs`, `tests/rock-acceptance.browser.mjs`,
`scripts/render-probe.browser.mjs`, `scripts/climate-calibration-report.mjs`. The browser ones
(`desktop-perf.browser`, `rock-acceptance.browser`, `forest-frame-fixture` users, `render-probe.browser`) go on the
coordinator's merge ledger, to run at merge under the GPU lock.

## 6b. lod-consistency: STOP (LOD ceiling exceeded), and STOP again at resume step 7

`tests/lod-consistency.test.mjs` is owned by the mountains/riser-lod agent and was not edited. It passes on main
7419733 and fails on this branch (`test-results/climate-m1/after/lod-consistency.log`):

| Check | Ceiling | main | climate/m1 |
|---|---|---|---|
| Maithea L6->7 edge-tile RGB p99 | 26.3 | pass | 43.01 |
| Lethuris L6->7 edge-tile RGB p99 | 39.2 | pass | 58.06 |
| Maithea L6 coarse snow kept (`lod-ladder.ts` coarseKeeps.snowL6) | >= 98 % | pass | 95.3 % |

A bisect over the step commits, swapping in each step's `src/surface-climate.ts`, places the cause at **step 1 (PDD
snow)**:

| Commit | Step | Maithea RGB p99 | Lethuris RGB p99 | Snow kept |
|---|---|---|---|---|
| c506b41 | 1 | 43.00 | 56.52 | 95.4 % |
| 2f49abb, 0814edd, f87eba5 | 2-4 | 41.62 | 58.21 | 95.3 % |
| 730094c | 5 | 43.01 | 59.99 | 95.3 % |
| 7200557 | 6 | 43.01 | 58.06 | 95.3 % |

The PDD ramp (100 C d) is much narrower in height than the old 6 K ramp. At 60 deg it spans roughly 100 m, against
roughly 900 m before. The L6 height error between levels therefore produces a much larger snow-colour difference at
the snow line.

The fix belongs to the LOD owner, not to the climate physics. Options:

- re-measure and re-pin the L6 ceilings;
- carry the snow line across levels, as the coarse retention already does for peaks;
- widen only the visual snow blend.

### Resume step 7: decision-2 gate not met (STOP)

Decision 2 allowed re-pinning only the L6 RGB p99 rows of Maithea and Lethuris, and only if the L8-and-finer rows pass
unchanged and the snow, forest and name disagreement rows pass their existing limits. Measured with
`test-results/climate-m1/resume/lod-measure.mjs`, which evaluates every row the test asserts (the test itself stops
at the first failing assertion per body, which is why d134a87 reported only three numbers):

| Body, pair | Row | climate/m1 (resume tip) | Limit in the test | main 290472d (climate 1.1) |
|---|---|---|---|---|
| Maithea L6 | rgbP99 | 43.013 | 26.3 | 15.183 |
| Maithea L6 | snow % | 1.478 | 1.3 | 1.249 |
| Maithea L6 | forest % | 1.848 | 0.5 (plan) | 0.420 |
| Maithea L6 | name % | 3.988 | 3.2 | 3.160 |
| Maithea L6 | carriedName % | 4.383 | 3.5 | 3.491 |
| Maithea L8 | rgbP99 | 5.750 | 4 (plan) | 2.258 |
| Maithea L8 | forest % | 0.694 | 0.5 (plan) | 0.014 |
| Maithea L8 | name % | 1.264 | 0.8 | 0.764 |
| Maithea L8 | carriedName % | 1.333 | 1.2 | 1.167 |
| Lethuris L6 | rgbP99 | 58.058 | 39.2 | 20.540 |
| Lethuris L6 | forest % | 3.327 | 1.8 | 1.764 |
| Lethuris L8 | rgbP99 | 15.212 | 11.1 | 5.244 |
| Lethuris L8 | snow % | 1.042 | 1.0 | 0.958 |
| Lethuris L8 | forest % | 2.472 | 2.2 | 2.167 |
| Lethuris L8 | name % | 2.458 | 1.9 | 1.847 |
| Lethuris L8 | carriedName % | 2.958 | 1.7 | 1.653 |
| Lethuris L10 | rgbP99 | 1.276 | 1 (plan) | 0.433 |
| Lethuris L10 | forest % | 0.861 | 0.7 | 0.639 |
| Lethuris L10 | name % | 0.944 | 0.5 (plan) | 0.431 |
| Lethuris L10 | carriedName % | 0.917 | 0.5 (plan) | 0.250 |
| Maithea L6 retention | snow kept % | 95.261 | >= 98 | 99.037 |

Every other row passes (heights, ocean, L12 and L14, Maithea L10, forest retention 98.37 %, peak and summit rows).

- Main 290472d passes every row; the pre-merge tip d134a87 gives exactly the same failing rows and values as the
  resume tip, so the riser-lod merge changes none of them: all 20 rows are climate-caused.
- Against the decision-2 conditions: the RGB p99 values are within the 5 % allowance (43.01 / 58.06; would round
  up to 43.1 / 58.1), but 13 rows at L8 and L10 fail, and 5 snow, forest or name rows at L6 fail their existing
  limits. That is the decision's "Otherwise STOP". Nothing in `tests/lod-consistency.test.mjs` was re-pinned.
- The forest and name rows also move, so the change is not only the snowline: decision 2's premise ("only the L6
  RGB rows fail") does not hold. The likely cause is that surface-climate-2 also moves forest edges (heat cap, PET
  moisture, the calibrated dry band); this was not bisected per step in the resume.
- Because the gate failed, the granted moved-pin re-pins were not applied either:
  `lod-carving-reduction:83,99` (the 8 tile-buffer and sampler-output digests; the brief cited :69,79) and
  `terrain-mountains-assembly` HARD outsideBelt (granted) and HARD outsideMassif (not granted; fails too).
  Log: `test-results/climate-m1/resume/lod-step7-tests.log` (25 pass, 13 fail).

Evidence: `test-results/climate-m1/resume/lod-measure.json` (resume tip), `lod-measure-main-290472d.json`,
`lod-measure-d134a87.json`.

### Resolution (climate-m1-decision-2 (b))

**Bisect** (`test-results/climate-m1/resume/lod-bisect.mjs`, output `lod-bisect.json`; a scratch worktree at e3c3358
with each step commit's `src/surface-climate.ts`). Failing rows per variant: step 0 (main's climate) 0, step 1 (PDD
snow) 14, step 2 (warm-column lapse) 16, steps 3 and 4 (warmest-month ceiling, heat cap) 16, step 5 (PET moisture) 23,
step 6 (ITCZ band) 21, tip 21 (20 cross rows + retention). Steps 3, 4 and 6 add no failing row on these tiles.

| Gate | Result |
|---|---|
| G1 heights, height max, ocean and shared-ocean rows identical to main 290472d, every level, both worlds, every variant | **pass** (0 differences) |
| G2 step 0 passes every row and equals main's table; every failing row starts at a named step | **pass** (step 0 table identical to main; 0 unattributed rows) |
| G3 no failing row at L12 or L14 | **pass** |
| G4 tip no more than 5 % worse than the e3c3358 table | **pass** (identical) |

**Re-pins in `tests/lod-consistency.test.mjs`** (rounded up to 0.1; cause = the step from which the row fails at
every later step, the first failing step in brackets where earlier):

| Row | Old limit | Measured | New ceiling | Cause |
|---|---|---|---|---|
| Maithea L6 rgbP99 | 26.3 | 43.013 | 43.1 | step 1 PDD snow |
| Maithea L6 snow | 1.3 | 1.478 | 1.5 | step 1 PDD snow |
| Maithea L6 forest | plan 0.5 | 1.848 | 1.9 | step 5 PET moisture |
| Maithea L6 name | 3.2 | 3.988 | 4.0 | step 5 PET (step 1) |
| Maithea L6 carriedName | 3.5 | 4.383 | 4.4 | step 5 PET (step 1) |
| Maithea L8 rgbP99 | plan 4 | 5.750 | 5.8 | step 1 PDD snow |
| Maithea L8 forest | plan 0.5 | 0.694 | 0.7 | step 5 PET moisture |
| Maithea L8 name | 0.8 | 1.264 | 1.3 | step 2 warm-column lapse |
| Maithea L8 carriedName | 1.2 | 1.333 | 1.4 | step 5 PET moisture |
| Lethuris L6 rgbP99 | 39.2 | 58.058 | 58.1 | step 1 PDD snow |
| Lethuris L6 forest | 1.8 | 3.327 | 3.4 | step 1 PDD snow |
| Lethuris L8 rgbP99 | 11.1 | 15.212 | 15.3 | step 2 warm-column lapse |
| Lethuris L8 snow | 1.0 | 1.042 | 1.1 | step 2 warm-column lapse |
| Lethuris L8 forest | 2.2 | 2.472 | 2.5 | step 2 warm-column lapse |
| Lethuris L8 name | 1.9 | 2.458 | 2.5 | step 1 PDD snow |
| Lethuris L8 carriedName | 1.7 | 2.958 | 3.0 | step 1 PDD snow |
| Lethuris L10 rgbP99 | plan 1 | 1.276 | 1.3 | step 1 PDD snow |
| Lethuris L10 forest | 0.7 | 0.861 | 0.9 | step 2 warm-column lapse |
| Lethuris L10 name | plan 0.5 | 0.944 | 1.0 | step 1 PDD snow |
| Lethuris L10 carriedName | plan 0.5 | 0.917 | 1.0 | step 1 PDD snow |
| Maithea L6 snow kept (retention) | >= 98 % | 95.261 % | >= 95.2 % (new `SHIPPED_RETENTION`; 98 % stays the target) | step 1 PDD snow |

`LOD_TOLERANCES` (`src/lod-ladder.ts`) is unchanged. Rows now above a plan tolerance are dated lines on owner sheet A3
(`docs/owner-decisions-2026-10-04.md`).

**`tests/terrain-mountains-assembly.test.mjs`.** Each HARD outsideBelt / outsideMassif test is split into a HARD
heights+ocean test (literals unchanged; main 290472d computes them, `resume/assembly-main-290472d.log`; the branch
equals them, so the gate holds) and a colour PIN that moves only with the climate version. Colour digests:
outsideBelt e04aa67d... -> d6ed2564..., outsideMassif 35a334d2... -> a87f2664... (full values in the test).

**`tests/lod-carving-reduction.test.mjs`.** 31 literals re-pinned (COST_IDENTITY, COST_SAMPLER_IDENTITY,
RISER_SAMPLER_IDENTITY). Per-field digests show only the climate-driven fields moved: tile `color`, `materials`, `meta`
and sampler `color`. Every geometry, height, ocean and water field is bit-identical to main's climate, and main's
climate reproduces every old literal (`resume/carving-digests-*.json`, `carving-repin.json`).

After the re-pins: the three files give 40 pass, 0 fail, 1 skipped (test:full only), `resume/lod-step7-repinned.log`.

**Follow-up (LOD owner + A4 renderer), no code in M1.** Under PDD snow and height-dependent moisture, the snow and
forest edges follow height closely, so coarse and fine tiles disagree more where they meet (Maithea L6->7 RGB p99
15.2 -> 43.0, snow kept 99.0 -> 95.3 %, forest 0.42 -> 1.85 %; Lethuris L6->7 RGB p99 20.5 -> 58.1, L8->9 5.2 -> 15.2).
Options: carry the snow and forest edges across levels, or blend colour across levels. Recorded on the owner sheet
under A4.

## 6c. Step 8: STOP (test:affected, a SITE_A consumer outside the ledger)

After the merge of main c6526d0 (2afa95a; tsc 0), the test:affected selection (92 files, including the unregistered
`tests/climate-earth-reference.test.mjs`; list `test-results/climate-m1/step8/affected-list.txt`) was run through the
shared slot (`--shared 4`, `--test-concurrency=4`): 752 tests, 736 pass, **2 fail**, 11 skipped, 3 todo
(`step8/affected.log`).

- `tests/acceptance/version-compat.test.mjs:335` (climate version pin): in the ledger, coordinator.
- **`tests/life-continuity-scenario.test.mjs:117`** "receding exits fade past 95 m": `a rig keeps fading out past the
  95 m exit` is false. Not in the ledger and not in any grant: **STOP**.

Attribution (2x2 where it matters): main c6526d0 code at the old SITE_A passes; main c6526d0 code with only the new
SITE_A literal fails (`step8/life-receding-main-newsite.log`). So the SITE_A move alone causes it, not the climate.
Numbers from the test's own poses and probe (`step8/life-receding-diag.mjs`, 100 receding frames at 25 m/s from the
'walk' start):

| Quantity | main, old SITE_A | branch, new SITE_A |
|---|---|---|
| frames with a rig fading out past 95 m (test needs > 0) | 5 | **0** |
| frames with any rig fading out | 22 | 19 |
| max active near rigs | 6 | 6 |
| max visible fauna / within 110 m | 1036 / 65 | 843 / 36 |
| nearest fauna, first / last frame | 35.4 / 19.0 m | 6.9 / 37.6 m |
| hard drops (unlistedDrops) at the end | 0 | 0 |

No hard drop happens at the new site, so the feature is not broken; the fixed receding path simply never takes a rig
past 95 m while it is still fading there. Making the test pass needs a change to the scenario (a herd-relative start or
a longer recede), which is a test change no decision grants. Steps 8 (test:full), 10 (in-app captures) and 11 (Astra)
were not run after this STOP. The LOD-edge panels of step 10 (CPU, no GPU) were made before the STOP was known:
`test-results/climate-m1/captures/lod-edge/`.

## 6d. climate-m1-decision-3 (2026-10-08): ruling 1 STOP, ruling 2 done

All three rulings are **Opus-decided on Kasper's instruction, overrulable**.

**Ruling 2 (done, bb44841).** `tests/climate-earth-reference.test.mjs` (8 tests, 0.2 s) is registered in the npm
test registry (`package.json` scripts.test, which is the default tier and the base of tier all/full) and has 0.2 s
under `all` and `full` in `tests/tier-estimates.json`. `tests/tiers.json` lists only the smoke/work terrain files and
the all-tier shards, and `tests/tier-sets.json` holds checksummed sample sets, so neither lists this file and neither
was changed. Gate: `test:affected --dry-run` lists it as "newly registered in package.json scripts.test"; it passes
through the shared slot (8/8), and tier / tier-all / test-selection / test-runner pass (32/32).

**Ruling 1 (STOP).** The allowed change (`RECEDE_FRAMES=360` with the decision's comment, lines 118-122 only; kept as
`test-results/climate-m1/step8/recede-360.patch`, **not committed**) passes at the new SITE_A but **fails on main
c6526d0 code at the old SITE_A**: `no hard drop while receding`, actual 3, expected 0
(`step8/receding-360-main-oldsite-test.log`). That is the decision's first STOP condition. Four cells
(`step8/receding-2x2.json`, the test's own probe and poses, `step8/receding-2x2.mjs`):

| Site / arm | frames with a rig fading out past 95 m | hard drops at the end | on-screen drops (frame, distance) |
|---|---|---|---|
| new SITE_A / current | 56 (first at frame 217) | 0 | none |
| new SITE_A / former cut (negative) | 0 | 9 | all at 95.0-95.4 m |
| old SITE_A / current | 17 (first at frame 90) | **3** | **frames 150, 155, 156 at 89.6, 91.1, 86.6 m** |
| old SITE_A / former cut (negative) | 0 | 6 | 95.3 m at frame 90; the same three at 86.6-91.1 m; 95.0-95.1 m at frames 312-314 |

Gate 2 (new site, at least 3 frames fading past 95 m) would pass with 56. Gate 1 fails. The three old-site drops
happen **inside** the 95 m exit, on camera-visible rigs, at the same frames with and without the widened cut. So they
are a second drop path in the near-rig presentation that the 100-frame path never reached, not the 95 m cut this test
is about. This is a finding for the fauna/presentation owner. Passing at 360 frames on both sites would need a change
outside lines 118-122 (or a renderer fix), which ruling 1 does not allow. Order steps 2-7 (the real test:affected,
test:full, captures, Astra) were not run after this STOP. The timing bench stays with the coordinator.

### climate-m1-decision-4 (2026-10-08): ruling 1 shipped with a recorded deviation; FAUNA-NEAR-DROP

All three rulings are **Opus-decided on Kasper's instruction, overrulable**.

- **Ruling 1, shipped with a deviation.** `recede-360.patch` is committed unchanged (the test file differs from 9da8139
  only by that patch). **Deviation, recorded rather than waived:** ruling 1 of decision-3 asked for a pass at both
  sites; the change passes at the shipped (new) SITE_A (56 frames fading past 95 m, 0 hard drops; the former-cut
  negative hard-drops 9 at 95.0-95.4 m) and fails at the old site only through the pre-existing in-exit drops below.
  Decision-4 counts the gate as met in substance.
- **Ruling 2, FAUNA-NEAR-DROP** (backlog item for the coordinator; owner: life presentation, the author of the D1 step-5
  continuity test; priority medium). A camera-visible near rig is hard-dropped **inside** the 95 m exit: main c6526d0
  at the old SITE_A, 360-frame recede, frames 150/155/156 at 89.6/91.1/86.6 m, **identical with and without the widened
  cut** (so not the 95 m cut). Pre-existing on main and unrelated to the climate. Starting hypothesis (not
  established): eviction without a fade when the 6-rig active cap is full and a nearer candidate enters; the task's
  first step is to confirm or reject it before any code change. Reproducer: a `todo` test in
  `tests/life-continuity-scenario.test.mjs` with the frozen `SITE_A_PRE_M1_M` literal (not in `harness-sites.mjs`), the
  same 360-frame recede and `fadeProbe`, asserting no visible drop below `EXIT_M`. Two runs through the shared slot give
  the same 3 drops to 0.1 m (`step8/near-drop-repro.json`, deterministic). File duration with the reproducer: 33.8 s and
  31.5 s (tier-estimates: all 20.5 s, full 47.6 s; under 2.5x, not re-tiered).
- **Ruling 3:** not a merge blocker.

## 7. Ledger: moved pins in files this package does not own

First pass (d134a87): the 88-file affected set from `test-runner.mjs affected --dry-run`, run through the shared slot
with 4 tokens, gave 691 pass, 17 fail, 11 skipped (`after/test-affected.log`). The resume stopped at step 7, so the
real `npm run test:affected` and `test:full` (resume step 8) were **not** run; the rows below are updated from the
resume's targeted runs.

| File (owner) | Failure | Kind | Resume state |
|---|---|---|---|
| `tests/acceptance/version-compat.test.mjs:335` | climate version 'surface-climate-1.1-geo-g' pinned | moved pin (version string) | coordinator |
| `tests/eco-identity-site.test.mjs:32,45-46` | SITE_A class, ground look and rings | consequence of the SITE_A STOP | **passes** after the SITE_A move (section 6) |
| `tests/eco-identity-site.test.mjs:54` | 60 km ring classes | pre-existing OPEN item (BIOME2-REPLAN), `todo` | stays `todo` (decision 6); ring now {2:5, 4:26, 6:4, 8:29} |
| `tests/harness-sites.test.mjs` (owned) | no forest at SITE_A; search finds no site | first-pass STOP | **passes** (6/6) after the move |
| `tests/terrain-climate-colour.test.mjs` fell colour (owned) | no snow-free fell column | decision 4 | `todo` with the finding; PDD invariant added and passing |
| `tests/lod-carving-reduction.test.mjs:83,99` (mountains; first pass cited :69,79) | 31 tile-buffer and sampler-output digests, 4 worlds | moved pins (only `color`, `materials`, `meta` moved) | **re-pinned** with ledger (section 6b) |
| `tests/lod-consistency.test.mjs` (mountains) | 20 rows at L6, L8, L10 plus L6 snow retention | decision-2 (b) | **re-pinned** at measured values rounded up to 0.1; retention 95.2 % (section 6b) |
| `tests/terrain-mountains-assembly.test.mjs` HARD outsideBelt (:38) and HARD outsideMassif | bit-identity to main (heights, ocean, colour) | decision-2 (b): split | HARD heights+ocean unchanged and equal to main 290472d; colour split into a climate PIN, re-pinned |
| `tests/life-continuity-scenario.test.mjs:117` | a rig fades out past 95 m on the receding path from SITE_A | SITE_A move (section 6c); decision-3 ruling 1, decision-4 | **360 frames, shipped** (passes at the shipped site); old-site in-exit drops are FAUNA-NEAR-DROP, a `todo` reproducer (section 6d) |
| `tests/planet-geophysics.test.mjs:162` | Spearman(g, R) | pre-existing, marked NOT MET; unrelated | not blocking (decision 6) |

Not run in this package (test:full or coordinator-owned): the `tests/golden/golden.json` sections climate, biomes,
census, placeQuery and terrain. TERRAIN_VERSION bump: coordinator.

`scripts/climate-calibration-report.mjs` (granted by decision 6) is fixed in resume step 6: its snowlines are now found
on the live PDD snow field by bisection (onset snowFraction > 0, heavy > 0.6), not on the removed `T_SNOW_K` /
`SNOW_RAMP_K` isotherms.

## 8. Deferred (no timing measured in this package)

- Per-sample cost <= 150 ns and zero allocation per sample
- Interleaved A/B cost ratios against surface-climate-1.1
- Cold build of `climateForcingFor` (now adds two 513-row `detExp` tables per forcing)

`surface-climate.bench.mjs` was not run. Decision 6 makes this a blocking merge gate (hot path of every land sample);
the coordinator schedules it in a quiet window.
