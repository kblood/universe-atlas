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

## Step 3: tests, re-pins and ledger: PASS (no lower-limit failure)

**Ledger (old -> new), every move samples a filtered level or names an edited line:**

| # | pin / file | old | new | why |
|---|---|---|---|---|
| 1 | `LOD_LADDER_VERSION` (version-compat, lod-consistency, lod-carving-reduction) | lod-ladder-3 | lod-ladder-4 | new declared reduction |
| 2 | tests/tier-sets.json `inputs.LOD_LADDER_VERSION` + history entry (regenerated; generator sha and every entry unchanged, 90bb43c0) | lod-ladder-3 | lod-ladder-4 | version input |
| 3 | `COST_SAMPLER_IDENTITY[2]` at filtered levels -> new `RISER_SAMPLER_IDENTITY` (lod-carving-reduction) | [2] for every level >= rock | Maithea L10 803ae421, L11 45541e1b, L12 7cd1996e, L13 5b1427cc; Selawyn L11 f18be3c3, L12 2321aaf0; Raiva L9 9f3d4fee, L10 5dce9009; Lethuris L11 c53de4e0, L12 90bfd244, L13 b0dbd52b | filtered levels; the test asserts each pinned level has a positive riser width |
| 4 | same test, levels whose digest did NOT move | | stay on [2]: Selawyn L13, L14; Raiva L11, L12; Lethuris L14 (no bench in those 259 directions at that width) | |
| 5 | `mountainCarvingState` at L(rock) (lod-carving-reduction) | 'rock' | 2 x edge / 32 (number); new: L13 = 2 x edge(13)/32, L14 and L20 = 'rock', `riserSharpFromLevel(Maithea) = 14` | state carries the width |
| 6 | lod-carving-reduction "from the rock level the truth": `deepEqual(L, truth)` at rockL and rockL + 3 | rockL, rockL+3 == truth | filtered levels rockL .. sharp-1: L >= truth and L-1 >= L and ocean equal (0 violations; points above the truth Maithea 41, Selawyn 30, Raiva 5, Lethuris 60 of 81 x levels); `deepEqual` truth moved to sharpL and sharpL + 3 | rockL+3 = sharp-1 is now filtered by design; the equality moves to the first sharp level |
| 7 | `SAMPLER_LEVELS` smoke / work lists | truth, cut-1, cut, rock-1, rock (+0, 22) | adds sharp-1 and sharp | the new class boundary is sampled in every tier |
| 8 | needles (semantics unchanged): mountain-rock-detail.test HARD 7 level variant (signature, call passes riser 0); fixture `reversed` control (`const strata = bench(t, ...)`); mountain-coarse-field helper exact-reference hook (`..., carve, rock, riserWidthM)` -> `false, false, 0`) | | | edited lines |
| 9 | mountain-coarse-field structural test (the two terrain cores identical outside their hunks) | | no test change: `baseTerrainCore`'s parameter type gained `riserWidthM?: number` (type only, no emitted code) | keeps the cores textually identical |

Unchanged (verified by the runs below): `TERRAIN_VERSION`, `MOUNTAIN_ROCK_DETAIL_VERSION` and `ROCK_DETAIL_DIGEST`
c1cd74f8, `MOUNTAIN_ASSEMBLY_VERSION`, truth / level-0 SHAs, golden.json (perturbation test), `COST_IDENTITY`,
`COST_SAMPLER_IDENTITY[0]`, `[1]` and `[2]` at the truth and every level >= L(sharp), tile-metadata, terrain-leaf-loop
digest, spectrum, M3 / M5 R-rows. No limit or tolerance changed.

**New test** `tests/mountain-riser-lod.test.mjs` (registered in `npm test` and tiers smoke / work), widths = the ladder's
Maithea L10..L13 widths 498.06 / 249.03 / 124.51 / 62.26 m and the stress width 996.11 m:
- F1: width 0 and every w <= 0.08 case equal v1 (TUNING 32,768 samples + 18,951 small-width cases, GATE the same):
  0 mismatches; `ROCK_DETAIL_DIGEST` unchanged.
- F2 / F3: 0 / 0 violations on TUNING and GATE (65,536 samples x 5 widths); raised (non-vacuity) 15,452 / 15,430.
  Disclosed: the first run reported F3 violations because the test compared the widths in list order (L10 .. L13,
  then stress), which is not width order; the comparison was fixed to ascending width before any other change. The
  F2 count and every value were the same in both runs.
- F4 (GATE, HARD): truth 1,619 reversals in 354,465 steps (minRatio -3.234). Widths L13 62.26 m 1,503; L12 124.51 m
  1,113; L11 249.03 m 506; L10 498.06 m 0; stress 0. Every width <= the truth: **PASS**.
- F5: L_MAX x 0.01 = 0.1134 m (HARD 7's expression, checked textually). Max straddle at width 0 0.0267 (TUNING) /
  0.0263 (GATE); filtered widths 0.0003-0.0267: **PASS**.

**H rows on the tuning station** (`heights.mjs Maithea probe branch`, `heights-probe-branch.json`; 75,625 points on
the 4 km L14 lattice, 55,005 rock points):
- H1: branch truth vs v1 truth 0 mismatches (plus step 2's 202,800).
- H2: coarseBelowTruth 0 and aboveRockOff 0 at every level L9..L15.
- H3: monotone violations 0 and ulp cases 0 at every switch.
- H4: pointwise bound violations 0 at every switch. Largest switch per level: L9->10 1.14 m, L10->11 17.78, L11->12
  38.10, L12->13 37.19, L13->14 29.46 (p99 11.06), L14->15 0. Main's single rock switch: max 65.23 m, p99 53.21.
- LR (tuning station): L13 **0.944** (HARD at the finest filtered level, >= 0.5: PASS), L12 0.743, L11 0.345,
  L10 0.020 (INFO; the section-1 prior for L12 was 0.45-0.5; measured higher, cause not investigated).

**Suites:** `tsc --noEmit` exit 0. `npm run test:affected -- --base main`: 93 files selected (27 changed), 758 tests,
744 pass, **0 fail**, 12 skipped, 2 todo (the two pre-existing OPEN entries: SITE_A ring, rocky Spearman); exit 0
(`test-results/mountains/riser-lod/step3-affected.log`). The first two affected runs failed only on the needles of
ledger rows 8-9 (mountain-coarse-field import hook, then the cores-identical text); fixed as listed, nothing else.

## Step 4: held-out check (single attempt): **STOP, registered "fewer than 3 teeth frames" rule**

Run once: 54 held-out frames + 6 height rows + 8 tuning branch frames, all 68 jobs exit 0. Frames stay in the scratchpad
(sha256 in `test-results/mountains/riser-lod/heldout/frames-png.sha256`). Scores: `metric-heldout.json`,
`metric-tuning-branch.json`; heights: `heldout/heights-*.json`.

### 4a notch-row P99 (HARD rule, section 4a)

| frame | rock windows | P99 v1 | off | **branch** | teeth |
|---|---|---|---|---|---|
| Maithea[1] c4200 L11 / L12 / L13 | 58 / 80 / 91 | .189 / .187 / .231 | .173 / .232 / .233 | .178 / .187 / .231 | no (< 100 windows) |
| Maithea[1] c3000 L11 / L12 / L13 | 63 / 101 / 116 | .470 / .319 / .157 | .467 / .334 / .166 | .467 / .319 / .157 | no |
| Selawyn[0] c4200 L12 / L13 / L14 | 664 / 664 / 670 | .196 / .237 / .240 | .258 / .226 / .237 | .237 / .258 / .247 | no |
| Selawyn[0] c3000 L12 / L13 / L14 | 628 / 621 / 632 | .277 / .254 / .204 | .367 / .159 / .169 | .328 / .268 / .206 | no |
| Lethuris[0] c4200 L12 / L13 / L14 | 694 / 705 / 707 | .281 / .299 / .270 | .347 / .241 / .255 | .341 / .225 / .238 | no |
| Lethuris[0] c3000 L12 / L13 | 685 / 690 | .312 / .395 | .397 / .332 | .360 / .390 | no |
| Lethuris[0] c3000 L14 | 689 | **.388** | .265 | **.299** | **yes** |

Held-out teeth frames: **1** (Lethuris c3000 L14). On it the branch passes both sub-rules (.299 <= T_P .4892 and
<= v1 .388), but the registered rule says fewer than 3 teeth frames is not a pass: **STOP for a decision.** Nothing
was re-rendered, re-scored, or re-thresholded. Reading (not a verdict): v1 shows no measurable notch rows at the
held-out stations, mostly. Maithea[1] has little rock in view (58-116 windows), and at Selawyn/Lethuris L12-L13 v1
P99 is close to or below rock-off.

Tuning re-score (INFO, the calibration frames, branch arm added):

| frame | v1 | off | branch |
|---|---|---|---|
| c4200 L12 (teeth) | .550 | .338 | **.341** |
| c3000 L12 (teeth) | .744 | .377 | **.450** |
| c3000 L13 (teeth) | .723 | .203 | **.564** |
| non-teeth frames | | | within .03 of v1 or lower |

Pooled over the tuning teeth frames, branch is .4519 (v1 .6724, off .3061, T_P .4892). Every frame is <= v1. Note
that c3000 L13 stays above T_P: at L13 the two-cell riser (62 m) only partly removes the rows at 3 km clearance.

### 4b ledge retention LR (HARD at the finest filtered level): PASS

| station | finest filtered | LR | coarser filtered levels (INFO) | v1 (INFO) |
|---|---|---|---|---|
| Maithea[1] | L13 | **1.008** | L12 0.863, L11 0.708, L10 0.150 | L10-13 1.44 / 1.13 / 1.04 / 1.01 |
| Selawyn[0] | L14 | **0.953** | L13 0.754, L12 0.372, L11 0.035 | 1.36 / 1.11 / 1.03 / 1.01 |
| Lethuris[0] | L14 | **0.918** | L13 0.694, L12 0.323, L11 0.034 | 1.96 / 1.28 / 1.09 / 1.03 |

### 4c height rows: H1-H4 PASS at all three held-out stations

| station | points | rock | H1 truth mismatch | H2 below truth / above off | H3 monotone / ulp | H4 bound violations | largest branch switch | main's rock switch (max / p99) |
|---|---|---|---|---|---|---|---|---|
| Maithea[1] | 62,001 | 40,748 | 0 | 0 / 0 | 0 / 0 | 0 | 16.95 m (L10->11) | 20.80 / 13.01 m |
| Selawyn[0] | 172,225 | 141,906 | 0 | 0 / 0 | 0 / 0 | 0 | 46.58 m (L13->14) | 81.02 / 66.66 m |
| Lethuris[0] | 95,481 | 80,339 | 0 | 0 / 0 | 0 / 0 | 0 | 40.80 m (L14->15) | 64.83 / 56.20 m |

### Not run (held at this STOP)

- Step 5: GPU blind comparison. Prepared but not started: probe arms built (`_riser-probe-main` 7419733,
  `_riser-probe-branch` 2802fca, `_riser-probe-rockoff` 7419733 plus an uncommitted probe-only `return 0` edit, each with a
  node_modules junction). Tooling is in `test-results/mountains/riser-lod/gpu/`: `probe-riser.browser.mjs`, the step-8
  probe with equal-LOD matching (`--match`), plus `hold-gpu.mjs` and `cmds.json`. The GPU lock was never taken.
- Step 6: test:full.

## Step 4b: registration (before any frame), coordinator decision 2026-10-07

Decision on the step-4 STOP: "Opus-decided on Kasper's instruction, overrulable". Option (b), no src change.
This section is written and committed before any 4b frame is rendered.

**Stations.** Six new held-out stations, all FROZEN_MASSIF_TILE_SET axis stations that have never been rendered:

| world | indices |
|---|---|
| Maithea | 2, 3 |
| Selawyn | 1, 2 |
| Lethuris | 1, 2 |

**Reserve, kept untouched:** Maithea [4-7], Selawyn [3-7], Lethuris [3-7].

**Frames.**
- Rule: the registered sun / view / pitch rule (section 4a).
- Clearances: 4200 and 3000 m.
- Levels: Maithea L11, L12, L13; Selawyn and Lethuris L12, L13, L14.
- Total: 6 stations x 2 clearances x 3 levels = 36 frames.

**Pass 1 (v1 and rock-off only; no branch render).**
- A frame has notch rows when P99(v1) - P99(off) >= 0.10 with >= 100 rock windows.
- The frozen frame list is committed before the first branch render.

**Pass 2 (branch once, frozen frames only).** Behaviour depends on the frozen list.
- **>= 3 frames:** the unchanged rule applies.
  - Pooled mean P99(branch) <= 0.4892, AND every frame P99(branch) <= P99(v1).
  - E = (v1 - branch) / (v1 - off) per frame is INFO.
  - Rule fails: STOP. The fallback is the 3-cell design, registered separately.
- **< 3 frames:** no further hunt. Record that notch rows are rare outside the tuning station, and go to step 5. This is pre-declared, not a STOP.

**Branch-arm HARD checks on the six new stations (both cases):**
- LR >= 0.5 at the finest filtered level (Maithea L13; Selawyn and Lethuris L14).
- H2-H4 as in section 4c, with 0 violations.

**INFO note on section 1.** The amplitude prior assumed a median rock slope of tan 0.77. That does not match the
measured p50 riser width of 46 m: 0.08 x 280 / 46 implies tan 0.49. With tan 0.49 the per-level riser phase widths are
smaller, so the coarse-level amplitude priors in section 1 are pessimistic. This explains why LR at L12 measured above
the prior; it is INFO only.

### Step 4b pass 1 (v1 + rock-off, 72 renders, all exit 0): frozen frame list = **0 frames**

`metric-4b-pass1.json`, `frozen-4b.json`. All 36 frames have >= 100 rock windows; 307-689 per frame.

| | min | max |
|---|---|---|
| P99(v1) - P99(off) | -0.109 (Lethuris[2] c3000 L13) | +0.073 (Maithea[3] c3000 L13) |
| Frames with v1 below rock-off | 17 of 36 | |

No frame reaches the registered 0.10. With fewer than 3 frames, the pre-declared outcome applies: notch rows are rare
outside the tuning station. Over 9 held-out stations (54 frames) only 1 frame (Lethuris[0] c3000 L14) showed them in
v1. The check goes to step 5; there is no further station hunt and no branch render in pass 2 (the frozen list is
empty). The six branch height rows (HARD LR and H2-H4) follow below.

### Step 4b branch HARD rows on the six new stations: PASS

| station | points | rock | H1 truth mismatch | H2 below truth / above off | H3 mono / ulp | H4 bound viol. | largest branch switch | main's rock switch | LR finest filtered (HARD >= 0.5) | LR all filtered levels (INFO) |
|---|---|---|---|---|---|---|---|---|---|---|
| Maithea[2] | 93,025 | 79,083 | 0 | 0 / 0 | 0 / 0 | 0 | 50.94 m | 70.25 m | L13 **0.854** | L10 .03, L11 .21, L12 .58 |
| Maithea[3] | 74,529 | 56,273 | 0 | 0 / 0 | 0 / 0 | 0 | 47.84 | 82.03 | L13 **0.956** | .02, .37, .77 |
| Selawyn[1] | 117,649 | 93,982 | 0 | 0 / 0 | 0 / 0 | 0 | 43.60 | 74.78 | L14 **0.961** | L11 .04, L12 .40, L13 .77 |
| Selawyn[2] | 68,121 | 56,298 | 0 | 0 / 0 | 0 / 0 | 0 | 51.32 | 87.02 | L14 **0.955** | .05, .39, .76 |
| Lethuris[1] | 108,241 | 80,139 | 0 | 0 / 0 | 0 / 0 | 0 | 37.30 | 64.85 | L14 **1.002** | .12, .62, .89 |
| Lethuris[2] | 139,129 | 113,082 | 0 | 0 / 0 | 0 / 0 | 0 | 60.26 | 103.03 | L14 **0.968** | .04, .42, .78 |

## Step 5: registration (coordinator instruction 2026-10-07, before any capture)

**Crash note (2026-10-07 ~23:35, bugcheck 0x154).** The machine crashed before any step-5 capture. Checked afterwards:
- no step-5 frame directory existed and the GPU lock was free, so no partial captures exist and none were discarded;
- the one uncommitted file was this probe script (the edits below);
- a dead re-approach block left by an edit was removed;
- all three arms were rebuilt (exit 0).

**Arms.**
- main = 7419733 (`_riser-probe-main`).
- branch = `_riser-probe-branch` at 2802fca. Its src is identical to the branch tip; later commits touch docs and
  test-results only.
- rock-off reference = 7419733 with a probe-only `return 0` in `rockDetailM` (uncommitted, never merged). It is a
  "carving only" reference for the judge and the rock-window mask for the INFO P99.

**Stations and poses.**
- Maithea[0]: stills at 4200 and 3000 m. Also stills at 2100 / 1500 / 1050 / 750 / 520 / 360 m (the step-8 descent
  poses), to find matched L12 / L13 station tiles.
- Maithea[0] descent: the step-8 descent plan (6000 -> 360 m in 3 s, 7 frames), main and branch only.
- Lethuris[0]: 3000 m.
- Rule `fixed`: the given index, whatever its sun elevation (recorded). Side light, pitch 35 deg, 1920 x 1080, clouds
  hidden.

**Equal LOD.**
- The station tile's targetLevel is recorded per still in both arms, plus the active-tile level histogram and a hash
  of the active set.
- If the branch or rock-off level differs from main's, the still is re-settled at the same pose once and re-captured.
  If it still differs, it is excluded and listed.
- Descent frames cannot be re-captured; mismatched ones are excluded and listed.
- If the runtime never shows L13 (or L12) at the station tile, that is written down.

**Blinding** (`gpu/make-pairs.py`).
- One pair per matched still or frame, full-resolution JPEGs. A/B and pair numbering come from `secrets` randomness.
- The key (`gpu/pairs-key.json`) is committed before the judge starts.
- A fresh-context Opus judge (Agent tool) sees only the pair images and the rock-off REF images.
- Per pair the judge answers:
  - notch rows: A / B / both / neither / "both but clearly weaker in X";
  - ledges at distance: A clearly worse / B clearly worse / no clear difference;
  - any new regular structure present in only one image.

**PASS requires all of the following:**
1. In every matched still where main has notch rows, the branch has none. "Weaker but visible" is a fail.
2. The branch never has notch rows where main has none.
3. No new regular structure in the branch.
4. No pose class (c4200, c3000) where the branch is judged clearly worse on ledges in the majority of its stills.

INFO: notch P99 per GPU still, with branch <= main. The metric is run on luminance, with the rock-off still as the off
arm.

**If step 5 fails on notch rows:** STOP. The pre-decided fallback is the 3-cell design, which the coordinator hands
over as a new registration.

## Step 5: results (key committed in ec63fe8 before the judge started)

**Captures.**
- All captures were taken in one GPU-lock hold (08:07-08:14 UTC, 2026-10-08). The lock was free; nobody waited.
- 6 probe runs, all exit 0, 0 page errors.

**Equal LOD.**

| Arm | Maithea[0] stills (all 8 clearances) | Maithea[0] descent frames | Lethuris[0] c3000 |
|---|---|---|---|
| main | station tile L12, maxLevel 12 | L12 in all 7 | L13, maxLevel 14 |
| branch | the same level and the **identical active tile set** (activeSetSha equal) at every still | L12 in all 7 | identical active set |
| rock-off | **L11** at every still, still L11 after the one re-settle (it is a reference arm, not judged, so no exclusion; disclosed to the judge as "possibly slightly coarser") | not captured | L13, identical set |

- **L13 never appeared at the Maithea[0] station tile.** It stayed L12 at every clearance 4200..360 m and in every
  descent frame, with maxLevel 12 everywhere. This is consistent with step 8, which saw L11 (L12 max). Matched
  Maithea stills are therefore L12 only. The only matched still at L13 is Lethuris[0] c3000; L13 is filtered on
  Lethuris (L11-14).
- **Descent, a disclosed post-capture rule.** The branch replay ran ahead of main's timing. Branch k=3..6 all sat at
  the 360 m floor, while main's k=0..5 were at 5469..549 m. A frame is paired only when both arms are within 5 % app
  clearance. This rule was added after seeing the levels, before sealing and judging. 6 frames were excluded for pose
  mismatch; only descent-06 (360 m in both arms, L12) is paired.
- Result: 10 matched pairs, 0 level-mismatch exclusions.

**Blind verdict and unblinding.** The judge was a fresh-context Opus that saw only the pair images; its verdict is in
`gpu/judge-verdict.json`.

| Pair | Pose | Notch rows (judge -> unblinded) | Ledges at distance | New regular structure |
|---|---|---|---|---|
| P06 | Maithea c4200 L12 | B -> **main only** | no clear difference | only in main |
| P08 | Maithea c3000 L12 | A -> **main only** | no clear difference | only in main |
| P07 | Maithea c2100 L12 | B -> **main only** | no clear difference | only in main |
| P02 | Maithea c1500 L12 | B -> **main only** | no clear difference | only in main |
| P05 | Maithea c1050 L12 | neither | no clear difference | none |
| P03 | Maithea c750 L12 | neither | no clear difference | none |
| P04 | Maithea c520 L12 | neither | no clear difference | none |
| P01 | Maithea c360 L12 | neither | no clear difference | none |
| P10 | Maithea descent-06 L12 | neither | no clear difference | none (a small object and a ridge kink in main, judged scene/LOD) |
| P09 | Lethuris c3000 L13 | neither (low-medium confidence) | no clear difference | 3-4-tooth zig-zag only in main (too short for a notch row) |

The judge noted that the notch side "changes between pairs". Unblinded, it is always main.

**PASS rule:**
1. Main has notch rows in 4 stills (c4200, c3000, c2100, c1500). The branch has none in all 4; it was judged clean,
   not weaker. **PASS.**
2. The branch has notch rows nowhere. **PASS.**
3. There is no new regular structure in the branch; every "only in one image" finding is on main. **PASS.**
4. Ledges show no clear difference in every pair, including the c4200 class (1 still) and the c3000 class (2 stills).
   **PASS.**

**Step 5: PASS.**

**INFO: notch P99 per GPU still** (`gpu/metric-gpu-info.json`). The metric is run on luminance and the off arm is the
rock-off still. For Maithea that still is at L11, so the rock-window mask is not level-matched; this is INFO only.

| Still | main | branch | rock-off |
|---|---|---|---|
| Maithea c4200 | .546 | .214 | .191 |
| c3000 | .676 | .370 | .271 |
| c2100 | .536 | .353 | .210 |
| c1500 | .188 | .170 | .176 |
| c1050 | .140 | .140 | .178 |
| c750 | .175 | .175 | .165 |
| c520 | .119 | .115 | .124 |
| c360 | .171 | .171 | .170 |
| Lethuris c3000 | .204 | .191 | .195 |

Branch <= main in 9/9 stills (3 are equal). The branch stays above rock-off at c3000 and c2100 (by .10 and .14),
where the judge saw no notch rows; the residual is periodic-texture energy that is not read as notches.

Pair sheet for Kasper (private artifact): https://claude.ai/artifact/VMbHHV3J33TjnFCWsMco8e, built from `gpu/pair-sheet.template.html` and `gpu/pair-sheet.rows.json`. The images are the pair JPEGs listed in `gpu/pairs.sha256`.

## Step 6: test:full (run once, 2026-10-08)

The suite is **GREEN** (`test-results/mountains/riser-lod/step6-test-full.log`):

| Measure | Result |
|---|---|
| Tests | 1682: pass 1674, fail 0, skip 6, todo 2 (pre-existing, OPEN) |
| Steps | 258/258 |
| Failures | 0 NEW, 0 KNOWN matched, 0 stale |
| Wall time | 695.1 s |
| Peak step RSS | 1370.8 MiB |

The run log is at `test-results/tiers/1a72107b0c2b-full-2026-10-08T08-23-38-514Z`.

**Pending for the coordinator's quiet window before merge (not run here, as instructed):**
- tile-build cost at the filtered levels (expect about +30 %);
- the in-massif warm bench;
- test:perf;
- cost rows.

## Pre-merge timing (coordinator quiet window, 2026-10-08)

**Setup.**
- All rows ran in ONE exclusive test-slot hold, 08:55:30-09:00:19Z, with no GPU or browser. The coordinator reported
  the machine quiet: R1-R6 done, the Chromium build stopped, no other agent testing.
- Driver: `test-results/mountains/riser-lod/timing/run-timing.sh`; logs are next to it (`driver.log`).
- main = git-archive export of 7419733 (src + tests); branch = this checkout (src identical to 2802fca).
- Gates:
  - the tile-build gate (+50 %) is the coordinator's;
  - the in-massif and M5 limits are the standing limits of those benches (in-massif 250 ns as used for the strata
    stage; M5 row 214 ns as asserted in `tests/mountain-rock-detail.test.mjs`);
  - they were stated before the run.
- Before the hold, one smoke run of the tile-bench script (Raiva, 1 round, shared slot) checked that it works. It is
  not counted.

**1. Tile-build cost at the newly split levels**: **PASS** (gate: branch mean / main mean - 1 <= +50 % on every row).
- Script: `timing/tile-build-ab.mjs`. Main and branch are interleaved in one process, order alternating per round,
  after a warm-up.
- 8 massif axis-site tiles per level, 7 rounds, so 56 builds per arm per row.
- Levels: L(rock) (split on both arms), the filtered levels above it, and the first sharp level. Default (wired)
  sampler options.

| World | L(rock) | filtered (newly split) | first sharp | max |
|---|---|---|---|---|
| Maithea | L10 +10.7 % | L11 +24.6, L12 +26.9, L13 +27.9 % | L14 +20.3 % | **+27.9 %** |
| Selawyn | L11 +11.9 % | L12 +20.1, L13 +16.4, L14 +16.2 % | L15 +19.5 % | +20.1 % |
| Raiva | L9 +6.5 % | L10 +19.1, L11 +19.3, L12 +15.0 % | L13 +14.4 % | +19.3 % |
| Lethuris | L11 +9.5 % | L12 +15.0, L13 +20.1, L14 +17.4 % | L15 +23.4 % | +23.4 % |

- Absolute means: about 27-28 ms -> 32-35 ms per tile at L10-L13, and 10-11 -> 12 ms at L14-L15.
- The L(rock) rows include cold cache fills; their medians are +15-20 %.
- The pre-registration estimate was about +30 %. Measured +14-28 % on the newly split levels.

**2. In-massif warm bench**: **PASS**, 193.1 ns against a limit of 250 ns.
- Script: `timing/inmassif-ab.mjs`. It runs C1's `inmassif-bench.mjs`, unchanged, on the truth rock path. Main and
  branch alternate, 3 runs each, one fresh process per run.

| Path | main | branch | delta |
|---|---|---|---|
| carving, no rock | 56.7 / 57.3 / 57.6 | 56.7 / 56.7 / 57.1 | 0 |
| carving + rock (truth, riser 0) | 185.0 / 186.8 / 183.5 (median 185.0) | **192.4 / 194.3 / 193.1 (median 193.1)** | **+8 ns (+4.4 %)** |
| INFO: rock with riser width, Raiva L9 (w = 383.9 m) | 181.3 x3 (v1 path; main ignores the width) | 191.4 / 193.1 / 191.1 | +10 ns |
| INFO: rock with riser width, Raiva L12 (w = 48.0 m) | 182.2 / 180.6 / 180.8 | 189.7 / 193.5 / 190.9 | +10 ns |

**3. Cost row M5** (`ATLAS_M5_BENCH=1`, "warm synthetic add-on <= 214 ns"): **PASS**, branch 156.3 ns against 214 ns.
- Main: 137.5 ns, so the branch is +18.8 ns (+13.7 %). The rock-alone term is 52.6 -> 66.5 ns (+14 ns).
- This is larger than "one multiply and one branch" suggests. The likely cause is the extra parameter and the
  `bench(t, 0)` self-call on the truth path costing V8 inlining; this was not investigated or tuned.

**4. `test:perf`**: **PASS**. 13 tests: 12 pass, 0 fail, 1 skipped.
