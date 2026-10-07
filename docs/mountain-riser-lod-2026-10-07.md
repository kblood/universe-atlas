# Mountain riser LOD (riser smoothing by mesh spacing): pre-registration, evidence and ledger

Branch `mountains/riser-lod` from main 7419733. Owner decision 2026-10-07 (docs/owner-decisions-2026-10-04.md, "Strata
notch rows"): Kasper chose option 1 of the step-8 notch diagnosis, "smooth the bench riser according to render-mesh
spacing", as a standalone fix on main's CURRENT rock detail (`mountain-rock-detail-1`). Strata stage 1 stays parked.

**Section 1-5 are REGISTERED before any src edit** (this commit touches no src). Steps 2-6 append below. One attempt
per held gate; no tuning after a held result; any STOP goes to the coordinator.

## 0. Why (from the diagnosis, read-only, step-8 evidence of strata stage 1)

The v1 bench rises over phase t in [0, 0.5] and drops back over [0.5, 0.58] of the 280 m carved-height period. Its
riser is 0.08 x 280 / slopeTan of horizontal width: p10/p50/p90 = 36/46/56 m on Maithea's rock. Lattice spacing near
the Maithea axis station is 233.7 / 116.9 / 58.4 / 29.2 / 14.6 m at L10-L14 (PATCH_SEGMENTS 32). From L10 to L13 the
riser is narrower than one or two cells, so the mesh point-samples a step: the riser line crosses the lattice as a
staircase, and along a contour that staircase repeats with a lattice period (2:1 direction: 138 m, about 23 px in
the c4200 still). That is the "row of 8-12 evenly spaced near-identical notches". v1 shows it too (main at L12:
periodic peak 0.406 in the notch band, vs 0.171 at L11 and 0.000 rock-off); the step-8 A/B was confounded by LOD
(branch at L12, main at L11, through the split/merge hysteresis at planet-renderer.ts ~1438/1460).

## 1. Design (exact)

**Rule.** At a tile level L whose lattice cannot draw the v1 riser, the riser is widened to at least two lattice
cells. The drop STARTS EARLIER and its END stays at t = 0.58; the tread keeps its v1 slope (t / 0.5). The cut is
therefore never deeper than v1 at the same point, coarse heights stay >= the truth, and the bench becomes a lower
peak with a longer, gentler riser. Where the period cannot hold a two-cell riser at all, the bench is off.

**Riser width per level** (src/lod-ladder.ts, new; integer loops, no transcendental call):

- `RISER_SHARP_MAX_SPACING_M = BENCH_FALL * STRATA_PERIOD_M / (2 * SLOPE_FULL_TAN) = 0.08 * 280 / (2 * 0.5773502691896257)
  = 19.39896904477143 m`: the spacing at which two cells equal the v1 riser at the full-rock slope (30 deg).
- `riserSharpFromLevel(R) = firstLevelAtOrBelowEdge(R, 32 * RISER_SHARP_MAX_SPACING_M)` (edge <= 620.767 m).
- `rockRiserWidthM(R, L) = 2 * tileEdgeM(R, L) / ROCK_DETAIL_REDUCTION.latticeSegments` for
  `rockDetailFromLevel(R) <= L < riserSharpFromLevel(R)`, else **0** (the truth, levels below the rock level, and
  levels from the sharp level on). The width uses the nominal tile spacing (edge / 32), a function of the level only, so
  every tile of a level, on every face, gets the same width (shared edges stay identical within a level).

**Levels that change** (nominal spacing; width = 2 x spacing):

| world | R (m) | rock from | filtered levels (spacing m) | sharp from (spacing m) |
|---|---|---|---|---|
| Maithea | 5,194,907 | L10 | L10 249.0, L11 124.5, L12 62.3, L13 31.1 | **L14** (15.6) |
| Selawyn | 8,552,056 | L11 | L11 205.0, L12 102.5, L13 51.2, L14 25.6 | L15 (12.8) |
| Raiva | 2,002,004 | L9 | L9 191.9, L10 96.0, L11 48.0, L12 24.0 | L13 (12.0) |
| Lethuris | 8,997,494 | L11 | L11 215.7, L12 107.8, L13 53.9, L14 27.0 | L15 (13.5) |

On Maithea (the station world) L14 and finer are unchanged and sharp, as briefed. **Deviation to note:** on Selawyn
and Lethuris L14 spacing is 25.6 / 27.0 m, above the 19.4 m rule, so L14 is filtered there and their first sharp level
is L15 (Raiva's is L13). The rule is physical (spacing), not a fixed level number; a fixed "L14" would leave Selawyn and
Lethuris L14 with sub-two-cell risers. If the coordinator wants the literal L14 everywhere, it is a one-line floor
(`max(14, ...)`) and is not taken here.

**Bench** (src/mountain-rock-detail.ts; only arithmetic and Math.min, which the HARD 5 audit allows):

```
w    = riserWidthM * slopeTan / STRATA_PERIOD_M      // riser phase width that spans riserWidthM horizontally
bench(t, w):
  if !(w > BENCH_FALL)  -> v1 bench(t)                // the v1 code path itself: bit-identical
  end = BENCH_RISE + BENCH_FALL                       // 0.58, fixed
  if !(w < end)         -> 0                          // no two-cell riser fits in the period: bench off
  tp  = end - w                                       // the drop starts earlier
  v   = t < tp ? t / BENCH_RISE : t < end ? (tp / BENCH_RISE) * (end - t) / w : 0
  return min(v1 bench(t), v)                          // never deeper than v1, also in floating point
```

`slopeTan` is the existing 125 m fixed-step slope (unchanged; never the lattice spacing). The riser then spans
`w * P / slopeTan = riserWidthM` horizontally (two cells). With `riserWidthM = 0`, `w = 0` and the v1 branch runs, so the
truth and every non-filtered level are bit-identical by construction. Continuity: at w -> 0.08+ the profile tends to
v1 (tp -> 0.5); at w -> 0.58- the peak tp/0.5 tends to 0; so the field is continuous in t and in w (hence in slope).

**Expected amplitude** (analytic prior, stated now): the peak is (0.58 - w) / 0.5. On Maithea at the median rock
slope (tan 0.77): L13 0.82, L12 0.47, L11 off (w 0.68), L10 off. At L11 the bench is off on slopes steeper than
tan 0.695 (35 deg); at L12 above tan 1.39 (54 deg); at L10 above tan 0.35, i.e. practically everywhere. The gully ribs
(weight 0.015) are untouched. So distant ledges at L10-L11 are deliberately gone, and at L12 about half their relief.
That is the cost of option 1 under "never deeper than now"; ledge readability at distance is judged blind in step 5.

**Proofs on paper** (checked by the rows of section 4):
- `v1 <= filtered <= 0` (rock term): for t < tp both are t/0.5; for tp <= t < 0.5, v <= tp/0.5 <= t/0.5; for
  0.5 <= t < 0.58, v = (tp/0.5)(0.58 - t)/w <= (0.58 - t)/0.08 because tp * 0.08 <= 0.5 * w. The min() makes it exact.
- Level monotonicity: for w1 > w2, bench(t, w1) <= bench(t, w2) everywhere (same case split; tp/w decreases in w).
  Widths halve level by level, so `rock term(L-1) >= rock term(L) >= truth`, and with the floor/elevation mapping
  monotone (dElevation/dFloor >= 1) the full heights are ordered the same way: no-rock(L(rock)-1) >= L(rock) >= ... >=
  L(sharp) = truth at every point.
- Climb (no-uphill-reversal) budget: the tread slope is v1's, so the frozen budget .400820692174837 < .6 is unchanged;
  the new term is the w-gradient (slope curvature): on the riser |dv/dw| <= 1.16 / w, so the extra climb fraction is
  <= weight x depth x 0.985 x 1.16 x |grad slopeTan| / slopeTan^2, independent of the level. Checked empirically
  (section 4, row F4), not assumed.

## 2. How the level reaches rockDetailM

`terrainSampler(..., {lodLevel: L})` -> `mountainCarvingState(body, options)` returns, as today, null / false / true /
'rock', **plus a positive number = the riser width (m)** for the filtered levels (`rockRiserWidthM(R, L)`; 'rock'
keeps meaning width 0: the truth and the sharp levels). -> `mountainTerrainCore(..., {carve: true, rock: true,
riserWidthM})` -> `mountainRidgeTermM(..., carve, rock, riserWidthM = 0)` -> `rockDetailM(..., seed, riserWidthM = 0)`.

- Two samplers with equal states still return identical fields, so tile caches stay correct.
- planet-tiles' split-parent rule (`mountainCarvingState(child) !== mountainCarvingState(parent)`, strict equality)
  now gives every filtered level and the first sharp level its own parent sampler, exactly as at the carving and rock
  switches: the parent mesh (morph start) is the parent level's own field, so morphs run between the two levels'
  actual fields. **Cost consequence:** tiles at L(rock)+1 .. L(sharp) now also sample their parent lattice with the
  parent sampler (about +30% samples per tile at those levels; today only L(rock) does). Tile-build cost row is
  PENDING for the coordinator's quiet window (section 6).
- No new import in mountain-rock-detail.ts or mountain-assembly.ts (both have import pins); lod-ladder.ts already
  imports the rock constants.

## 3. Versions, pins and digests (expected ledger; filled in at step 3)

**Move, with reason:**
1. `LOD_LADDER_VERSION` lod-ladder-3 -> **lod-ladder-4** (a new declared reduction; tiles at filtered levels change).
   Pins: version-compat, lod-consistency, lod-carving-reduction tests; tier-sets.json inputs (history entry, same
   tiles, as the strata branch did for its version input).
2. `COST_SAMPLER_IDENTITY[2]` (lod-carving-reduction test): class [2] keeps the truth and levels >= L(sharp); each
   filtered level whose 259-direction digest moves gets its own pinned digest (at most 4 levels x 4 worlds). A filtered
   level whose digest does not move stays on [2].
3. `mountainCarvingState` assertions at L(rock) ('rock' -> the width number) plus new ones at L(sharp) ('rock').
4. Source-edit needles that name the edited lines (semantics unchanged): mountain-rock-detail.test.mjs HARD 7
   level-variant (signature text) and mountain-rock-detail-fixture.mjs `reversed` control (`const strata = bench(t);`).
5. Any other pin that samples a filtered level (rockDetailFromLevel <= L < riserSharpFromLevel) inside a massif may
   move (e.g. tile-metadata or coarse-field tile digests at L10-L13), each listed with old -> new.

**Must NOT move** (a move is a STOP): `TERRAIN_VERSION` (truth and L0 unchanged; every consumer keyed on it reads the
truth or L0), `MOUNTAIN_ROCK_DETAIL_VERSION` (truth function unchanged; `ROCK_DETAIL_DIGEST` c1cd74f8 unchanged),
`MOUNTAIN_ASSEMBLY_VERSION`, `MOUNTAINS_TRUTH_SHA256`, `MOUNTAINS_LEVEL0_SHA256`, golden.json, `COST_IDENTITY`,
`COST_SAMPLER_IDENTITY[0]`/`[1]`, spectrum rows (truth; rock-off at L(rock)-1), M3 / M4 / M5 R-rows (truth fixture), any
pin at the truth, at L < L(rock) or at L >= L(sharp). Nothing is loosened: no limit, tolerance or threshold changes.

## 4. Metrics and thresholds (calibrated on controls only)

Tools (this branch, `test-results/mountains/riser-lod/`): `frame.mjs` (CPU perspective renderer of one FORCED lattice
level, so every comparison is same-LOD; validated in the diagnosis at NCC 0.96-0.97 against the GPU stills),
`metric.mjs` (window scan), `heights.mjs` (height rows). Arms: **v1** = main 7419733 exported to the scratchpad,
**off** = main at lodLevel L(rock)-1 (exact carving, no rock) on the level-L lattice, **branch** = this worktree.

### 4a. Notch-row periodicity, HARD (image)

- Windows 300 x 30 px at stride 150 x 15 in 1920 x 1080 frames, fully covered in all arms; ROCK windows: mean
  |v1 - off| >= 2 grey levels (control-defined, same set for every arm). Per window: the diagnosis metric (per-row
  +-12 px high-pass, row-normalised autocorrelation, largest local maximum over lags 12-40 px). **Frame score P99** =
  99th percentile (nearest rank) of the window peaks. (90th percentile, mean, hit share and edge energy EE = mean
  window hpRMS are INFO; the 90th percentile did not separate the controls, see the table.)
- A frame has TEETH when P99(v1) - P99(off) >= 0.10 with >= 100 rock windows.
- **Calibration (controls only; tuning station = Maithea axis, FROZEN_MASSIF_TILE_SET.Maithea[0], step-8 poses and
  sun, pitch 35 deg)**, `calibration/metric-tuning-controls.json`:

  | frame | rock windows | P99 v1 | P99 off | teeth | EE v1 / off (INFO) |
  |---|---|---|---|---|---|
  | c4200 L10 | 635 | 0.183 | 0.169 | no | 4.93 / 4.76 |
  | c4200 L11 | 632 | 0.322 | 0.265 | no | 7.66 / 7.00 |
  | c4200 L12 | 635 | **0.550** | **0.338** | yes | 9.75 / 8.64 |
  | c4200 L13 | 629 | 0.377 | 0.294 | no | 10.63 / 9.75 |
  | c3000 L10 | 537 | 0.215 | 0.205 | no | 3.30 / 3.17 |
  | c3000 L11 | 526 | 0.292 | 0.272 | no | 5.31 / 4.73 |
  | c3000 L12 | 519 | **0.744** | **0.377** | yes | 7.02 / 5.91 |
  | c3000 L13 | 510 | **0.723** | **0.203** | yes | 7.67 / 6.63 |

  Pooled over the teeth frames: v1 0.6724, off 0.3061. **Threshold T_P = 0.4892** (midpoint).
  Reading: v1's notch rows live at L12-L13 on Maithea (L10-L11 have no teeth), consistent with the diagnosis.
- **Held-out pass rule (step 4, single attempt):** pooled mean P99(branch) over the held-out teeth frames <= 0.4892,
  AND on every held-out teeth frame P99(branch) <= P99(v1). Fewer than 3 held-out teeth frames = no teeth = STOP for a
  decision (not a pass). Tuning frames are re-scored for the branch as INFO.
- **Held-out stations (named now, never rendered before this commit):** Maithea FROZEN_MASSIF_TILE_SET[1] (axis),
  Selawyn [0] (axis), Lethuris [0] (axis). Synthetic sun: elevation 10 deg, azimuth = the tangent at the station toward
  world +Y (+X when the station is within 25 deg of the Y axis); the step-8 pose rule (view = sun azimuth + 90 deg,
  pitch 35 deg). Clearances 4200 and 3000 m. Levels: Maithea L11, L12, L13; Selawyn and Lethuris L12, L13, L14
  (the filtered levels except the coarsest). 18 frames x 3 arms.

### 4b. Ledge retention vs rock-off, HARD at the finest filtered level, INFO above (height domain)

The image edge energy cannot carry this row: in the diagnosis notch band v1's hpRMS (8.36) is mostly the notch
artefact itself (rock-off 4.06; v1 drawn on the sharp L14 lattice 5.81 vs its rock-off 5.61). So "edge energy vs
rock-off" is measured on the heights:
- `heights.mjs`, 8 km x 8 km window around the station, level-L lattice: r = h_L - h_off at each vertex;
  ideal = 4 x 4 box mean of (h_truth - h_off) over the cell around the vertex (the ideal antialiased value);
  hp = minus the (2m+1)^2-vertex box mean, m = ceil(500 m / spacing); rock vertices: truth rock term < -1 m.
  **LR = RMS(hp r) / RMS(hp ideal).** Controls: rock-off LR = 0 (by construction), ideal LR = 1; v1 (point samples)
  measured 1.55 / 1.19 / 1.06 / 1.02 / 1.00 at L10-L14 on the tuning station (INFO).
- **Threshold 0.5** (midpoint of the controls). **HARD at the finest filtered level** of each held-out world
  (Maithea L13, Selawyn L14, Lethuris L14) and of the tuning station (Maithea L13); **INFO at coarser filtered
  levels**, where section 1 already predicts LR well below 0.5 (L12 about 0.45-0.5, L11 and L10 near 0). That loss is
  the declared design; whether it costs readable ledges at distance is the step-5 blind judgement.

### 4c. Height invariants, HARD (no tolerance unless stated)

On the 4 km x 4 km level-L(sharp) lattice window of the tuning station and every held-out station (all levels'
samplers at the same directions), branch arm:
- **H1 truth and sharp levels bit-identical**: the branch truth equals v1's truth at every point (Object.is), and
  every level >= L(sharp) equals v1 at that level. Plus step 2's wider sample (section 5).
- **H2 coarse >= truth**: h_L >= h_truth at every point for every L (0 violations), and h_L <= h_off (rock never adds).
- **H3 monotone across levels**: h_(L-1) - h_L >= -1e-9 m at every point for L = L(rock) .. L(sharp)+1 (0 violations;
  floating-point ulp cases below 1e-9 are counted and reported).
- **H4 LOD-switch continuity (no visible pop)**: at every switch L-1 -> L the field change at a point is bounded by
  main's own rock switch at that point: |h_L - h_(L-1)| <= |h_truth - h_off| + 1e-9 (0 violations), and the largest
  branch switch is <= main's largest. Why this bound: main already morphs the whole rock term in one switch
  (L9 -> L10 on Maithea: max 65.2 m, p99 53.2 m on the tuning window); by the monotone chain the branch splits that
  same total into up to five smaller morphs, so no branch switch can exceed it. The morph mechanism itself
  (planet-tiles parent sampler per state) is unchanged.

On the M5 element fixture (`tests/helpers/mountain-rock-detail-fixture.mjs`), rockDetailM directly, widths 2 x the
four Maithea filtered spacings and 2 x 2 x the coarsest (stress):
- **F1** width 0 and every width with w <= 0.08 reproduce v1 exactly (Object.is) on the 65,536 HARD-2 samples
  (TUNING and GATE seeds); `ROCK_DETAIL_DIGEST` unchanged.
- **F2** v1 <= filtered <= 0 exactly on the same samples; **F3** filtered(w_coarse) >= filtered(w_fine) exactly.
- **F4 uphill reversal no worse than the truth**: fall-line runs (`calibration/reversal2.mjs`; 1 m steps up the carved
  gradient from 64 quasi-random starts per seed, steps counted where the carved slope >= SLOPE_ZERO_TAN and the step
  climbs >= 0.9 of its gradient), carved + rock, no background. HARD on the GATE seeds 730901-08: reversal count at
  every filtered width <= the count at width 0 (the truth). Disclosed: run on the TUNING seeds while drafting with the
  exact registered formula (`calibration/proto.mjs`), reversals in 350,275 counted steps: truth (width 0) 1,684;
  width 2 x 15.56 m (an L14-like width, not used: L14 is sharp) 1,684; Maithea L13 width 1,539; L12 1,083; L11 535;
  L10 0. The truth's own reversals sit near the fixture's ridge apex where the 125 m forward slope lags; they are v1
  behaviour, not this change.
- **F5 continuity**: the HARD-7 straddle (6,000 0.01 m pairs, TUNING and GATE) at every filtered width stays <=
  L_MAX x 0.01.

## 5. Steps and their gates

1. This document (no src). 
2. Implement; `tsc --noEmit` clean; F1 and H1 on a sample of 4 worlds x 3 FROZEN axis sites x 65 x 65 lattice points
   at L(sharp), L(sharp)+1, L(sharp)+2 and the truth: every value Object.is-equal to main 7419733's export.
3. Tests and re-pins with the ledger; `test:affected --base main`; the existing mountain gates (R-rows, M3, M4,
   spectrum) at unchanged limits; F2-F5 and H2-H4 on the tuning station. Any lower-limit failure = STOP.
4. Held-out check, single attempt: 4a on the 18 held-out frames, 4b HARD rows, H2-H4 on the three held-out stations.
5. GPU (only under C:/LLM/IWSDK/.gpu-browser-lock): blind same-LOD comparison main vs branch at the Maithea axis
   station, c3000 / c4200 and the descent. Equal LOD is forced or verified per still (station targetLevel recorded in
   both arms; a still whose arms differ in level is re-captured at the same pose after re-settling, or excluded and
   listed). Judged blind on notch rows and on ledge readability at distance. STOP on new regular structure or
   clearly worse ledges.
6. `test:full` once (shared slot; it takes exclusive when needed).

## 6. Pending for the coordinator's quiet window (not run here: CPU loaded by the WSL Chromium build)

- In-massif warm bench (carving + rock path; the branch adds one multiply and one branch per rock sample).
- `test:perf` and the cost rows (`ATLAS_M5_BENCH=1` M5 cost row).
- New cost row to consider: tile build at L(rock)+1 .. L(sharp) (the extra parent sampler, section 2).

## 7. Open risks (stated before implementation)

- Ledges at L10-L11 vanish and at L12 lose about half their relief (section 1). Step 5's blind judgement decides
  whether that reads as "clearly worse ledges at distance".
- The rock term now depends on the tile level at L(rock)..L(sharp)-1. Collision, physics and place queries use the
  truth (unchanged); anything that samples a filtered level for a gameplay decision would now see the shallower
  bench (none found: L0 consumers only, besides tiles).
- Selawyn / Lethuris L14 filtered (deviation in section 1).

---

## Step 2: implemented (src), tsc clean, identity PASS

- `src/mountain-rock-detail.ts`: `rockDetailM(..., seed, riserWidthM = 0)`, `bench(t, w)` exactly as section 1 (the v1
  branch is the old code, reached whenever `!(w > BENCH_FALL)`). `src/lod-ladder.ts`: `LOD_LADDER_VERSION`
  lod-ladder-4, `RISER_REDUCTION {widthCells: 2, sharpMaxSpacingM: 19.39896904477143}`, `riserSharpFromLevel`,
  `rockRiserWidthM`. `src/mountain-assembly.ts`: `mountainRidgeTermM(..., rock, riserWidthM = 0)`. `src/terrain.ts`:
  `mountainCarvingState` returns the width at filtered levels; the core threads it. No new import in the rock or
  assembly modules. `docs/lod-ladder-contract-v1.md` amended (section 3, "M5 riser reduction").
- `tsc --noEmit`: exit 0.
- **Identity** (`test-results/mountains/riser-lod/identity.mjs`, `identity.json`; branch vs main 7419733 export, every
  sample field Object.is): 4 worlds x 3 FROZEN axis sites x 65 x 65 lattice points x {truth, L(sharp), L(sharp)+1,
  L(sharp)+2} = **202,800 comparisons, 0 mismatches**.
- **F1** on the M5 fixture (TUNING and GATE, 32,768 samples each): width 0 (explicit and default) 0 mismatches;
  105,990 / 105,982 small-width cases (w <= 0.08) 0 mismatches.
- INFO, non-vacuity at L(sharp)-1 (33 x 33 per site): Maithea L13 165 / 3,267 points moved, Selawyn L14 239,
  Lethuris L14 170, Raiva L12 0 (Raiva's rock is weak at these sites, as in step 8).
