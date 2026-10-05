# Mountains: the single assembled check, run on current main (2026-10-05)

Plan: `docs/mountains-design-2026-10-04.md`, section 3 ("The single assembled check") and section 6
(Luna calibration). Main under test: `cffc5ff` (`TERRAIN_VERSION` `terrain-1.8.0-relief`,
`LOD_LADDER_VERSION` `lod-ladder-1`). Reference: `b8d38d3`, the main the plan was written against.

## What this is, and what it is not

**MTN-6, the assembly, was not done.** Its dependencies are not met:

| Element | Card | State on main |
|---|---|---|
| harness | MTN-0 | merged (`34f04ed`, registered `43707a2`) |
| M0 coarse footprint | MTN-1 | **BLOCKED**, branch `mountains/m0` (`61124f9`): Maithea L6 RGB p99 ratio 0.922 against the required <= 0.9 (19.378 -> 17.860); Lethuris passes (0.597) |
| M1 orogen layout | MTN-2 | merged (`3a164f6`), unwired |
| M2 massif envelope | MTN-3 | merged (`cffc5ff`), unwired |
| M3 ridge-valley carving | MTN-4 | **BLOCKED**, branch `mountains/m3` (`984ca3f`): best candidate A2 fails coherence 0.133 against >= 0.35; B fails slope p50, fill and pits |
| M4 summits | MTN-5 | **BLOCKED**, not started (needs M3) |
| M5 steep-rock detail | (after MTN-6) | **BLOCKED**, not started (needs MTN-6) |
| assembly | MTN-6 | **not started** (needs MTN-1..5 and the owner answers on A3, Q3, Q4) |

`src/mountain-layout.ts` and `src/mountain-envelope.ts` are imported by no `src/` file. So this check
measures main exactly as it is. It records that nothing regressed, and it gives the baseline that
a future MTN-6 has to beat. It does **not** show the mountain design working: the design is not in
the terrain yet. No version moved, no pin, golden or threshold was changed, and nothing was
re-pinned.

Evidence (gitignored): `test-results/mountains/assembly/` (logs, JSON, the sheet) and
`test-results/mountains/luna-calibration/` (control builder, 12 control renders, labels, votes,
calibration result).

## Results, item by item (section 3 numbering)

**0. Outside-belt identity (HARD): 0 differences.** `terrainSampler` (`elevationM`,
`groundHeightM`, `ocean`, `color`) on a 4096-direction Fibonacci set per world, current main
against a read-only `b8d38d3` worktree, belts from `orogenLayout`:

| World | belt > 0 | outside | diffs outside | diffs inside |
|---|---|---|---|---|
| Maithea | 227 | 3869 | 0 | 0 |
| Selawyn | 161 | 3935 | 0 | 0 |
| Raiva | 216 | 3880 | 0 | 0 |
| Lethuris | 157 | 3939 | 0 | 0 |

Inside belts is identical too, because nothing is wired. The built app is also byte-identical:
all 34 files of `dist/assets` have the same SHA-256 as the round 2 FINAL GATE build of `b8d38d3`.

**1. `mountain-metrics` on the field (CONTRACT for MTN-6): main fails, as the design measured.**
There is no composed sampler, so this runs on main's own field with the prototype's site rule
(8 highest well-separated land samples). The output equals the design's "main" column exactly.
Against the M3 rows (`judgeM3`): Maithea 0/8, Selawyn 0/8, Raiva 1/8 (coherence 0.679 only),
Lethuris 0/8. Example, Maithea: slope p50 11.3 (>= 20), area above 30 deg 2.2% (>= 25), crest flank
6.5 deg (>= 12), relief8 1466 m (>= 1500), beta 3.36 (2.0-2.6), fill 0.142 (<= 0.05), pits 378
(<= 50), coherence 0.298 (>= 0.35). M4 peak density: 0.3-1.2 peaks of prominence >= 300 m per
1000 km² (M4 needs >= 8 in the belt core). M1 and M2 pass their own element thresholds on main
(see their element docs), but they are not in the field.

**2. Hypsometry and coast (HARD): pass.** `tests/terrain-relief-hypsometry.test.mjs` passed
inside `test:full` with the owner bands unchanged.

**3. lod-consistency (CONTRACT): every cell passes.** Measured with the test's own functions on
its 12 stratified tiles per world (`lod-cells.mjs`): 90 cross-level cells, of which 17 are
`SHIPPED_CEILINGS` pins, plus 6 retention rows. 0 fail. The 17 pins and their headroom:

| Cell | measured | pin | headroom |
|---|---|---|---|
| Maithea L6 RGB p99 | 26.257 | 26.3 | 0.043 |
| Maithea L6 snow / name / carriedName | 1.249 / 3.160 / 3.491 | 1.3 / 3.2 / 3.5 | 0.051 / 0.040 / 0.009 |
| Maithea L8 name / carriedName | 0.764 / 1.167 | 0.8 / 1.2 | 0.036 / 0.033 |
| Lethuris L6 RGB p99 | 39.170 | 39.2 | 0.030 |
| Lethuris L6 snow / forest / name / carriedName | 2.125 / 1.764 / 6.988 / 8.151 | 2.2 / 1.8 / 7.0 / 8.2 | 0.075 / 0.036 / 0.012 / 0.049 |
| Lethuris L8 RGB p99 / snow / forest / name / carriedName | 11.051 / 0.958 / 2.167 / 1.847 / 1.653 | 11.1 / 1.0 / 2.2 / 1.9 / 1.7 | 0.049 / 0.042 / 0.033 / 0.053 / 0.047 |
| Lethuris L10 forest | 0.639 | 0.7 | 0.061 |

The 12 checks that the held RELIEF-PRESENT design 3 broke all pass on main: Maithea L6 RGB 26.257
(<= 26.3), L6 forest 0.42 (<= 0.5), L8 RGB 3.547 (<= 4), L8 snow 0.306 (<= 0.5), L8 name 0.764
(<= 0.8), L8 carriedName 1.167 (<= 1.2), L10 carriedName 0.194 (<= 0.5); Lethuris L6 RGB 39.17
(<= 39.2), L6 snow 2.125 (<= 2.2), L6 forest 1.764 (<= 1.8), L8 RGB 11.051 (<= 11.1); Maithea L6
peak area kept 89.56% (>= 85). Other retention rows: L8 peak kept 97.52% (>= 95), L6 summit loss
3.9 / 293 m (<= 120 / 400), snow kept 99.29%, forest kept 99.11%. The headroom is still 0.009-0.075
(the A3 problem is unchanged). M0's per-octave retention check is not on main (M0 is blocked).

**4. SITE_A rule (HARD): pass, no move.** `tests/harness-sites.test.mjs` 4/4: centre 280.2 m above
sea (>= 250), moisture 0.750 (>= 0.6), ring forest share 1.00 (>= 0.8), ring minimum 255.4 m
(>= 250); the search reproduces the literal. The separate TODO "SITE_A 60 km ring of 64 points is
all legacy-behaviour classes" is still **OPEN** (`{6:25, 7:18, 11:6, ocean:15}`).

**5. Render bounds and landing (HARD): pass.** `tests/render-bounds.test.mjs` and the landing tests
passed inside `test:full`. The owner decisions A6/A7 on the landing cap and hover stay **OPEN**.

**Other gates.**

- `npm run test:full` (once, test slot): exit 0. 1407 tests, 1400 pass, 0 fail, 5 skipped, 2 todo.
  0 known failures matched, 0 NEW failures, 0 stale entries. The two TODOs (SITE_A 60 km ring,
  rocky Spearman 0.990) remain OPEN.
- Golden: Node matches `tests/golden/golden.json` (unchanged since `b8d38d3`). Cross-engine:
  chromium MATCH, firefox MATCH, webkit MATCH except the known `faunaKnownUnstable` finding.
  Gate result "PASS WITH KNOWN MISMATCH", exit 0. The four engines are not all equal, as before.
- `npm run build` (tsc + vite): exit 0.

**6. The sheet (VISUAL-ADVISORY).** One capture under the GPU lock, Vite preview on 5299: the
round 2 standard-sheet script (verbatim, label changed), view `mountainV3` with and without clouds,
4 worlds = 8 frames. The plan's 12-frame set (orbit, range from lowland, flight) was not taken; this
is the same sheet as the pre-change "0/24" comparison, so the two can be compared directly.
Against the `b8d38d3` frames: the no-cloud frames are pixel-identical in the terrain area for
Lethuris, Raiva and Selawyn (max difference 1/255) and 0.5% of pixels differ on Maithea (one small
feature, not terrain). The cloud frames differ by 4-6/255 on average (cloud motion).

## Luna (VISUAL-ADVISORY, UNCALIBRATED: not counted)

`scripts/luna-vote.mjs`, 3 asks per image, each in a fresh context, plus diagnosis. The element
list for diagnosis maps onto the plan: range layout/continuity (M1), massif height/silhouette (M2),
ridges and valleys/drainage (M3), summits/peaks (M4), steep rock detail (M5), colour/texture at
distance (M0), snow line (A4), haze/clouds (A8), camera pose (A5).

**Calibration (section 6, CPU render path): UNCALIBRATED.** Prompt sha256
`89f0115c233c0195ae82269c4657f07df4b7482969b7afe1af60a8cf725600cf`, Luna `gpt-6-luna`.
The 12 controls were built for this check (none existed): 6 positives from the eroded alpine control
(the 4 sites of the M3 branch plus 2 extra sites in place of the real-DEM slots, which need a
download the owner has not authorised), 2 dome, 2 main field (Maithea, Lethuris site 0), 1 flat
plain and the hard negative (the un-eroded alpine control). They were rendered by one CPU
perspective renderer, with the app's v3 pose rule, one slope-only colour and no snow. File names
are neutral and the order is shuffled.

| Rule | Result |
|---|---|
| positives PASS (>= 5 of 6) | **3 of 6** |
| negatives FAIL (>= 5 of 6) | 6 of 6 |
| hard negative FAILs | yes (0/3 PASS) |
| unanimous images (>= 10 of 12) | **7 of 12** |

Luna now separates the hard negative and the main field from the positives better than the prior
evidence (POS 0/6), but it still FAILs half of the eroded positives. The positive control is also
weak by construction: on the M3 branch it fails 4 of the M3 shape rows itself (slope p50 18.6, flank
11.2, relief8 997 m, beta 1.62). **The app capture path is not calibrated at all**: the app cannot
load a synthetic heightfield, so the 12 controls could not be rendered through it. The owner has not
signed the label sheet (`labels.json`).

**The sheet: 0 PASS.**

| Prompt | Asks | PASS | FAIL | unclear |
|---|---|---|---|---|
| pre-change mountain prompt, verbatim (`b8d38d3` sheet: 0/24) | 24 | 0 | 24 | 0 |
| calibration prompt (above) | 24 | 0 | 22 | 2 |

The pre-change prompt was asked one image at a time through luna-vote (with its verdict line),
not in groups of four as before. Diagnoses (most common element per frame, 3 answers each for the
calibration prompt, 1 for the old prompt, all "high" confidence):

| Frame | calibration prompt | pre-change prompt |
|---|---|---|
| Maithea, clouds | massif height/silhouette (3/3) | massif height/silhouette |
| Maithea, no clouds | summits/peaks (2), ridges and valleys (1) | massif height/silhouette |
| Lethuris, clouds | massif height/silhouette (2), haze/clouds (1) | haze/clouds |
| Lethuris, no clouds | massif height/silhouette (3/3) | massif height/silhouette |
| Raiva, clouds | haze/clouds (2), massif height/silhouette (1) | haze/clouds |
| Raiva, no clouds | massif height/silhouette (3/3) | massif height/silhouette |
| Selawyn, clouds | massif height/silhouette (3/3) | haze/clouds |
| Selawyn, no clouds | massif height/silhouette (3/3) | massif height/silhouette |

Typical reasons: "broad, gently undulating surface with no distinct mountain forms", "soft,
rounded swells without distinct peaks or sharp ridges", and for the cloud frames "obscured by a
large, smooth cloud or haze".

## What is still failing, per element (plain statement)

Same frames, same verdict as before the mountain work: **0 of 24 PASS**. Expected, because the
terrain is byte-identical.

- **M2, massif height/silhouette** is the most common diagnosis (23 of 32 diagnosis answers; haze/clouds 6, summits/peaks 2,
  ridges and valleys 1). M2 is
  merged but not wired, so the field still has main's 173 km value-noise ridges with flanks of a few
  degrees. Wiring needs MTN-6.
- **M4, summits/peaks** and **M3, ridges and valleys** are named 3 times together, all on Maithea's no-cloud frame. Both are
  blocked: M3 on coherence, M4 on M3. Main's own numbers: 0.3-1.2 peaks per 1000 km² against
  >= 8; flank 2.8-6.5 deg against >= 12; beta 3.36-3.49 against 2.0-2.6.
- **Haze/clouds (A8, A4)** is named on 3 of 4 cloud frames by at least one answer, and the
  no-cloud frames still fail on silhouette. Clouds are not the only cause, as before.
- **M0 (colour at distance), M1 (layout) and M5 (rock detail)** were not named by Luna. M0 and M5
  are blocked; M1 is merged but unwired.
- None of these Luna verdicts count: the question is UNCALIBRATED on the CPU path and not calibrated
  on the app path.

## Owner items (all still OPEN)

- M0: the 0.9 reduction threshold is missed (0.922 at about +5% build cost, 0.902 at +207%).
  Accept a relaxed threshold, raise the build budget or redefine M0. A3 is undecided; nothing applied.
- M3: the coherence row (0.35) on a synthetic straight ramp, and the shape rows that the eroded
  control itself fails. Recalibrate them or fund more design rounds.
- Q3 (peak retention reference) and Q4 (keep the old ridges outside belts; the default kept here).
- MTN-7: sign the control label sheet; authorise (or not) the 2 real-DEM controls; decide whether a
  question UNCALIBRATED at 3/6 positives may be re-tried with stronger positives (the M3 eroded
  control fails 4 shape rows).
- Per-octave retention bound, the 410 000-direction set, the M1 PNG look, the M2 width gate (from
  the element reports).
- A6/A7 landing decisions; the SITE_A 60 km ring TODO; the rocky Spearman TODO.

## Not run

- MTN-6 wiring, its `TERRAIN_VERSION` bump, golden re-pin and SITE_A search: not applicable
  (blocked).
- The plan's 12-frame AFTER set (orbit / range from lowland / flight): only the 8-frame mountain
  sheet was taken, to compare with the pre-change sheet.
- The app-path Luna calibration (36 asks): not possible without loading synthetic terrain in the app.
- The paired A/B Luna format: there is no candidate pair on main.
- M0 per-octave retention on main and a CPU-quiet benchmark.
