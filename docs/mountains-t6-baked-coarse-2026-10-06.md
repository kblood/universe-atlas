# Mountains T6 cost route A: baked coarse band field, 2026-10-06

Evidence for decisions addendum (5) in `docs/mountains-opus-decisions-2026-10-05.md`. Written by the coordinator
(Claude Opus 5.5, acting on Kasper's instruction). Astra (Codex `gpt-6-astra`) did the implement round and the one
fix round. After that the coordinator made value-preserving edits only.

The work is on branch `mountains/baked-coarse`, cut from main `9971c3f`. **Update 2026-10-06 (section 9): after the
along-axis margin of round 3 every gate is met and the branch is merged to main staged.** The text below records
the state before that. Two budgets were missed in round 1:

- the C1 sampler budget, by +0.4 to +2.4 points;
- the field build target, on two of four worlds.

Contract §6 and the orbit bake are met. All evidence is under `test-results/mountains/t6-baked/`. That folder is
git-ignored and stays on disk.

## 1. Problem and route

Addendum (4) blocked the wiring step. Wired, the coarse tile build cost +17..+33% per level against main (the
contract allows +10%), and the orbit bake cost +21..+31% (the budget is +5%). The cause was V8 code quality. The
plain core ran slowly in any process that had also run the exact mountain path (M1 foot-point solve, M2
composition, M3 carving).

Route A replaces the exact M1/M2 work at coarse levels with a lookup in a baked, per-body field. The fine levels
(L >= the carving cut) and the truth sampler keep the exact M1/M2/M3 path.

## 2. What was built

- **Field** (`src/mountain-layout.ts`, `coarseBandField(maxDistM, minHalfWidthM)`, memoised on the layout,
  `orogen-layout-3`):
  - Grid:
    - Nodes lie on the cube-face grid at half the T1 band-grid resolution (Nf = 512 / 1024 / 256 / 1024).
    - The field is stored in sparse 8x8-cell blocks. Each block holds a 9x9 Float32 array per candidate belt.
  - Active cells:
    - A cell is active when it covers a T1-flagged cell. The active set is then dilated by one field cell, across
      face edges too.
    - Only the corners of active cells are evaluated. Unread nodes are 0.
  - Node values:
    - Each node stores the signed foot-point distance divided by H = min(halfWidthM, 48 km).
    - The distance comes from the same `transverse` projection as M1, including its sign rule.
    - Node directions are canonical on face edges, so both faces store bit-identical values there (tested).
  - Per-belt scalars:
    - tangent, centre, uLimit, halfWidthM, and the margin delta = 0.16 H.
    - The margin is measured, not derived. The worst bilinear error was 0.0768 H, at belt endpoints with
      |u/U| ≈ 1. The margin is more than twice that, Float32 storage included.
- **Coarse composition** (`src/mountain-envelope.ts`, `massifCoarseRidgeTermM`, `massif-envelope-3`):
  - The composition is an upper bound on the exact uncarved ridge term (1−w)·main + U.
  - For each candidate it takes w_lo = g²·blend(v_lo)·fade(s_hi) and U_hi = E·p(s_lo)³·lf·blend(v_hi).
  - The bound is valid because of the lemma blend(vg) ≥ g²·blend(v).
  - A candidate is skipped when |sd| − delta ≥ 1. The result is the maximum over the candidates and main.
- **Terrain** (`src/terrain.ts`):
  - `baseTerrainCore` serves plain samplers and coarse samplers (state false). For coarse samplers it reads the
    field with an inline lookup. No direction array is passed to a layout function.
  - `mountainTerrainCore` is a separate function literal. It serves the truth and L >= cut.
  - A source test keeps the two cores textually identical outside the setup hunk and the ridge-term hunk.
  - `TERRAIN_MOUNTAINS_WIRED` stays false.
- **Continuity rule.** The dilation ring makes every boundary node of the active region lie at least one field
  cell outside the band. There the composition returns main exactly.
  - Test: every active-boundary tap equals the inactive neighbour, `Object.is` on every returned field.
  - Seams: face-edge nodes are compared Object.is from both faces. Switch tiles keep the T3 parent rule, so the
    parent of an L(cut) tile is coarse.
- **Tests:** `tests/mountain-coarse-field.test.mjs` (20 tests) and its helper `tests/helpers/mountain-coarse-field.mjs`.
  They cover:
  - the g² lemma;
  - conservativeness against the exact reference, plus a zero-margin mutant that must fail;
  - determinism across build orders;
  - signed-distance enclosure and face edges;
  - more than 50,000 directions plus axis rasters per world: upper bound, inactive identity, ocean flags;
  - plain/mountain core identity outside massifs;
  - the core-sync source test;
  - the private-kernel identity;
  - the voxel-prefilter identity (see section 5).

## 3. Accuracy (coarse minus exact uncarved floor, 56,724 samples per world)

| World | Field build, cold, slotted | Bytes | Active cells | Violations | Ocean diff | p99 | max |
|---|---:|---:|---:|---:|---:|---:|---:|
| Maithea | 35.6 ms | 822,144 | 74,826 | 0 | 0 | 756 m | 2,347 m |
| Selawyn | **57.8 ms** | 1,624,130 | 133,763 | 0 | 0 | 769 m | 1,836 m |
| Raiva | 13.7 ms | 145,206 | 13,112 | 0 | 0 | 443 m | 1,355 m |
| Lethuris | **61.5 ms** | 1,726,504 | 145,451 | 0 | 0 | 740 m | 2,086 m |

The p50 is 0 m: outside massifs the coarse floor equals the exact floor.

The coarse surface is an upper envelope of the uncarved surface, and therefore of the carved truth. The p99
overestimate of about 750 m sits near belt endpoints, where the margin is widest relative to the real error.

The field build target is **≤ 50 ms per body cold**. It is missed on Selawyn and Lethuris (`final-field-report.jsonl`).

Profile of the build:

- About 40 ms is the node phase: 183k / 199k node projections at about 250 ns each.
- A second build in the same process takes 44-47 ms (`diag/field-warm.log`). JIT warm-up is therefore not the main
  cost.
- The resolution was not lowered. No value was changed to meet the target.

## 4. Identity and pins

- **Staged** (flag false), against main `9971c3f`, SHA-256 ledger. What moved:
  - the `{mountains: true}` samplers at L0 and L(cut−1);
  - mountain tiles at L0, L3, L(cut−1) and L(cut). L(cut) moved in `parents`/`parentHeight` only.

  Unchanged: default, truth, ≥ cut, off, crater, base and cut+2 samplers and tiles (27 identical entries per world).
- **Wired** (flag true, scratch copy only). What also moved: the default-L0 samplers, default tiles at L ≤ cut, the
  orbit bake and the hypsometry.

  Unchanged: the survey and the truth.
- **Re-pins**, old → new, ledger in `digest-ledger.json`, all in `tests/lod-carving-reduction.test.mjs`:
  - `COST_IDENTITY[0]`:
    - Maithea `05a0aea7…84af` → `08521843…44e0`
    - Selawyn `565f77b3…321d` → `b787565e…8954`
    - Raiva `fc27a747…474e` → `498662db…f570`
    - Lethuris `26402011…0557` → `4f79a66f…80b7`
  - `COST_SAMPLER_IDENTITY[0]`:
    - Maithea `df801672…a3a6` → `0c2e6161…d454`
    - Selawyn `b335c740…2f9a` → `c25d73c6…d5ec`
    - Raiva `35996b0d…df48` → `733c1c25…8778`
    - Lethuris `f5218c6f…a42b` → `3fa308f5…c492`
  - `COST_IDENTITY[1]` (switch tile; only `parents`/`parentHeight` moved, which is the T3 parent rule):
    - Maithea `2e3759c5…4194` → `3e812d1d…cfdb`
    - Selawyn `59cac04c…f558` → `528260f7…7ecf`
    - Raiva `d1b2089d…2d55` → `92f44e5f…4c5c`
    - Lethuris `26e7faa3…89d9` → `2c689122…0986`
  - `COST_SAMPLER_IDENTITY[1]` is unchanged.
- **Versions:** `OROGEN_LAYOUT_VERSION` orogen-layout-2 → orogen-layout-3 and `MASSIF_ENVELOPE_VERSION`
  massif-envelope-2 → massif-envelope-3. The pins in four test files moved with them. `LOD_LADDER_VERSION` and
  `TERRAIN_VERSION` are unchanged. No golden re-pin: that happens once, at T6 wiring.
- **Coordinator edits are value-preserving.** `fix-identity.mjs` digests (173,120 sampler outputs and 8 tiles)
  are byte-equal before and after every edit. `fix-node-identity.mjs` shows every read node `Object.is`-identical
  (503,165 nodes).

## 5. Cost (official protocols, CPU-quiet test slot, against main `9971c3f`, fresh process per world)

The final state is the branch as committed. Each round of the protocol was re-run whenever the code changed.

**Contract §6** (`contract-build-bench`, 5 rounds, mean growth per level, budget ≤ +10%): **MET.**

| World | L0 | L1 | L2 | L3 | L4 | L5 | L6 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Maithea | +6.4 | +1.7 | +3.8 | +2.6 | +3.3 | +7.2 | |
| Selawyn | +0.9 | +3.9 | +0.5 | +1.1 | +8.9 | +5.4 | +5.5 |
| Raiva | +4.8 | +2.2 | +1.8 | +0.6 | +2.3 | | |
| Lethuris | +5.6 | +2.6 | +7.5 | +7.4 | +6.0 | +3.4 | −0.4 |

Before route A, the same table showed +17..+33% at every level.

**Orbit bake** (wired, 7 rounds, median growth, budget ≤ +5%): **MET**, 0 block solves.

| World | Median | Mean | Paired |
|---|---:|---:|---:|
| Maithea | +4.3 | +4.3 | +4.9 |
| Selawyn | +2.8 | +2.8 | +2.8 |
| Raiva | +0.3 | +4.1 | +4.2 |
| Lethuris | +2.3 | +5.0 | +5.1 |

Before route A: +21..+31%.

Noise note: the orbit bake executes only the coarse path, which is identical in all three code states measured.
Its medians ranged from −3.6% to +9.4% across repeated official-protocol runs of that identical path. One earlier
run (Maithea +5.8%, Selawyn +7.8%) would have missed. That run is reported in `fix1-freshcopy/` and was not
discarded.

**C1** (`scripts/mountain-assembly-cost.mjs --same-version`, 15 fresh processes per world, median weighted
resident overhead, budget ≤ +8%): **NOT MET.**

| World | Branch weighted | Branch outside | Main-wired control weighted | Main-wired control outside |
|---|---:|---:|---:|---:|
| Maithea | **8.40%** | +5.4% | 7.17% | +4.2% |
| Selawyn | **9.38%** | +7.9% | 2.53% | +1.2% |
| Raiva | **10.43%** | +8.5% | 3.95% | +2.0% |
| Lethuris | **8.76%** | +7.0% | 5.34% (n=5) | +3.6% |

The main-wired control is main `9971c3f` with only the flag flipped. It measures what the exact mountains cost
the truth path without route A. The per-run spread is wide: the branch runs range from −7.6% to +36.4%.

### C1 bisection (Maithea, coordinator, unofficial runs of 3-5 under the slot unless noted)

The truth sampler outside massifs became slower than main-wired. The hunks were bisected on top of main-wired.
The value columns are outside overhead / weighted overhead.

| Variant | Outside / weighted | Notes |
|---|---|---|
| Branch as after the fix round (official, 15 runs) | +21.8% / 24.1% | Private kernels everywhere, core-owned scratch copy of d |
| Main terrain + branch layout, private kernels only (V2a) | +20% / 22% | |
| Main terrain + branch layout, catalog kernels (V2b) | +3% / 6% | |
| Main terrain + scratch copy (Z2) | +11..21% | |
| Branch terrain without the copy, catalog kernels (Z3) | +3..8% | Contract +17..+25%: fails |
| Private construction kernels + scratch copy (X2) | +20..26% | Contract met |
| Private construction kernels + **fresh copy** `[d[0], d[1], d[2]]` (W3) | +4.5..7% | Contract met (one noisy Lethuris L0) |
| W3 official, 15 runs | +9.9% / 12.9% | |
| W3 + **inline T1 voxel prefilter** (final, official) | +5.4% / 8.4% | |

Conclusions:

- Two coordinator changes help C1 and keep contract and orbit met:
  1. The layout construction uses `constructionA0`, which runs on private kernel copies. The per-sample `sample`
     uses `continentalA0` on the catalog kernels again. Both are bit-identical, tested.
  2. The truth core copies d fresh instead of using a scratch array. It also reads the T1 voxel prefilter inline,
     so it skips `massifBeltSample` where that call returns the empty sample. A test compares this against the
     same core with the prefilter bypassed (Object.is on every field, four worlds), and a negative control (a
     shifted voxel index) fails it.
- The remaining gap to main-wired is +1..+6 points outside massifs. That is a V8 code-quality effect in the truth
  core. It is not more work: with the prefilter, the branch runs fewer operations per outside sample than
  main-wired.
- The profiles (`diag/prof-*.log`, `diag/prof2-*.log`) show only differences in inlining decisions, for example
  `detAcos` and `detAtan2` in the climate colour not being inlined.

## 6. Not done

- Route B (worker isolate) was not attempted. Route A met the coarse budgets it was meant to fix. The remaining
  misses are the truth-path C1 overhead and the field build, and an isolate for coarse tiles would not change C1.
- `test:full` was not run. Its one remaining use stays reserved for the T6 gate.
- No Luna vote and no full `npm test`.

## 7. Open items for the owner

1. **C1:** +0.4..+2.4 points over +8% on all four worlds. The main-wired control is 2.5..7.2%, so the branch adds
   about +1.2..+6.9 points in V8 effects.
2. **Field build:** Selawyn 57.8 ms and Lethuris 61.5 ms cold, against a 50 ms target. A lazy per-block build would
   meet it without changing values, but it adds a branch to the coarse hot path, which would need re-measuring.
3. **Accuracy follow-up:** a delta that depends on |u/U| would cut the about 750 m p99 overestimate. The error is
   concentrated at belt endpoints. This changes values and needs a version move.

## 8. Round 2 (2026-10-06): field build fixed; C1 and one orbit world still missed

The task was to finish route A in one Astra implement round plus one fix round, value-preserving, and to merge
STAGED only if C1, contract §6, the orbit bake and the field build were all met. **They are not all met, so the
branch is not merged.** The branch first took main `cc0032f` (M5 staged) in merge commit `6079ea9`.

### What was tried

- **Implement round (Astra): lazy per-block field.** Blocks were built on first read, behind a built-flag branch
  in the coarse hot path. The cold build fell to 14 / 18 / 5 / 20 ms, but the node work moved into timed tile
  builds. Unofficial contract runs (2 per world) reached +10.6..+12.0% on three worlds, so lazy was dropped.
- **Fix round (Astra): a faster builder, kept eager by the coordinator.** The changes are:
  - grouped active-cell extraction and row-wise bit dilation, keeping the canonical face-edge mapping;
  - per-belt distance evaluators with hoisted constants, the node direction inlined, and the division and
    operation order of `offset`/`transverse` preserved;
  - the left/below neighbour copy kept.

  Astra kept a lazy variant, because eager missed its own 40 ms target. The coordinator chose Astra's eager
  snapshot (`r2/fix-eager-layout.txt`) instead: it keeps the coarse hot path free of the branch and keeps the
  contract met. The lazy result is kept as `r2/fix-lazy-final.patch`.
- **C1 diagnosis (coordinator, unofficial, slotted, n = 6 per arm).** In the C1 harness, the branch's plain sampler
  (A/A, no mountain work) is already +0.2..+18% slower outside massifs than main's. The amount depends on the
  catalog-kernel JIT state.

  | Variant | C1 effect | Contract | Kept |
  |---|---|---|---|
  | Catalog kernels for the layout construction | Fixes C1 (outside −1..+4%) | +21..+36% | No |
  | Terrain-private kernel copies | Worse C1 | | No |
  | Private kernels for the per-sample layout sample | Worse C1 | | No |
  | Truth dispatch (voxel unset → plain core) | Mixed | | No |
  | Early voxel test | Did not help | | No |

  No value-preserving variant met C1 without breaking contract §6.

### Values

Values are unchanged, all exit 0 (`r2/eager-checks.log`):

- `fix-identity` digests are byte-equal to `r2/before.json` (173,120 sampler outputs and 8 tiles);
- all 503,165 read nodes are `Object.is`-identical, and the 311,209 unread nodes are 0;
- 101,792 truth samples are identical;
- `tsc` passes;
- 82/82 tests pass;
- `git diff --check` is clean.

No version or pin moved.

### Official protocols

All runs used the CPU-quiet test slot, against main `cc0032f`, with every process exit 0 (128 of 128). The
evidence is in `r2/official-eager/`.

| Budget | Maithea | Selawyn | Raiva | Lethuris | Verdict |
|---|---:|---:|---:|---:|---|
| Field build cold, ≤ 50 ms (median of 15) | 28.05 | 41.96 | 9.54 | 42.31 | **MET** |
| Contract §6, max mean growth per level, ≤ +10% | +6.0 | +6.7 | +3.6 | +6.4 | **MET** |
| Orbit bake, median growth, ≤ +5% (7 rounds) | +3.9 | +1.3 | +1.3 | **+8.4** | missed on Lethuris |
| C1 weighted warm, ≤ +8% (median of 15) | **9.86** | **12.10** | 6.26 | 7.69 | missed on 2 worlds |
| C1 outside massifs | +7.1 | +10.8 | +4.2 | +5.9 | |

Notes on the misses:

- **Orbit, Lethuris.** Paired median +7.3%, mean +6.6%. The orbit rounds run only the memoised coarse path, which
  is the same code as in the run in section 5 that was met (+2.3%). Section 5 also records that path's spread as
  −3.6..+9.4% across repeated runs. The miss is reported and was not re-run.
- **C1.** The per-run spread is −3.4..+26.8%.

## 9. Round 3 (2026-10-06): along-axis margin; the coarse-frame block is lifted

Decisions addendum (6), decision 3, blocked the merge: on main's `tests/lod-coarse-frame.test.mjs` the carving switch
pair left its §3.1 ROOM on all four worlds. This round is the follow-up recorded there ("lifting the block without
his answer"): a tighter, value-changing field margin, with the ROOM pins and every budget unchanged. One Astra
implement round; no fix round was needed (the coordinator replaced one import with a tested literal and corrected
two version notes). Branch commits: merge `27abfe3` (main `0c80da4` in), change `9c71ad7`. Evidence:
`test-results/mountains/t6-margin/` (git-ignored, kept on disk).

### Diagnosis (coordinator, measured)

The overestimate had two causes. Either fix alone leaves the maximum at 1.3-2.3 km; both together bring it to tens
of metres.

1. **The flat margin 0.16 H.** The bilinear signed-distance error, Float32 storage included, is tiny away from belt
   ends (`err-by-u-fine.jsonl`, `err-by-u-end32.jsonl`):
   - |u/U| < 0.9: max 0.00066 / 0.00023 / 0.00037 / 0.00028 H (M / S / R / L);
   - ≤ 0.0005 H up to |u/U| = 0.955, then rising: Maithea 0.0033 at 0.970, 0.0121 at 0.980, 0.0451 at 0.990,
     0.0847 H in [0.9975, 1) with 32x32 taps. The end kink converges slowly with tap density (4x4: 0.0768;
     8x8: 0.0803), so 0.16 H was only 1.89x the densest measurement.
2. **`best = main` in the candidate maximum.** Inside a massif the edge fade removes main's ridge term, so the exact
   composition (1−w)·main + U can be far below main (Maithea example: main 2,830 m, exact 506 m, old coarse
   2,726 m). The maximum then returned main.

### Change (`orogen-layout-4`, `massif-envelope-4`)

- `MASSIF_COARSE_MARGIN = {INTERIOR_H: 0.002, END_H: 0.2, RAMP_FROM: 0.94, RAMP_TO: 0.99}` (frozen) and
  `coarseMarginH(uf)`: 0.002 H up to |u/U| = 0.94, linear to 0.2 H at 0.99. The composition gets
  `coarseMarginH(u/U)` as its delta. The per-belt scalar [8] is the largest margin (0.2), used only for the skip
  test. The layout keeps it as a literal (the layout module imports nothing but catalog/det-math, a HARD test); a
  test asserts it equals `END_H`.
- The candidate maximum starts at −∞; the result is main only when every candidate is skipped. Validity: belt
  footprints are disjoint (construction separates the gradient-inflated tubes). At most one belt has value > 0
  anywhere; a candidate whose true value is 0 has |u/U| ≥ 1 (the term returns main) or s ≥ 1 (w = 0, term ≥ main),
  or it is skipped. A non-skipped candidate lies inside its own tube, so inside one massif every other candidate is
  skipped. Each term tends to main as lo → 1, so the result stays continuous. Only `baseTerrainCore` (coarse) changed;
  the truth core is untouched and the core-sync test passes.

### Tests (lean; existing files)

- Enclosure: per tap, error / `coarseMarginH(uf)` ≤ 0.5 on every world and in each of 400 bins of width 0.0025,
  with 32x32 taps in cells whose centre has 0.93 < |u/U| < 1.05 and 8x8 elsewhere. Ratios 0.42 / 0.33 / 0.26 / 0.34.
  Negative control: `INTERIOR_H` everywhere gives 42 / 33 / 26 / 34 (must exceed 0.5, it does).
- Premise: at most one belt has value > 0 at every one of the 56,724 directions per world, on a copied layout
  whose belts are asserted equal to production.
- The max-without-main rule is exercised: 1,212 / 1,441 / 813 / 110 directions return a floor below a mutant with
  `best = main`.
- Tightness pin: p99 ≤ 50 m, max ≤ 100 m (coarse minus exact uncarved floor). The zero-margin mutant still violates
  the bound; the boundary identity still holds.
- New margin unit test (frozen values, clamping, symmetry); the g² composition test gained u values on the ramp.

### Results (all exit 0)

| World | Violations | Ocean diff | p99 | max | before p99 / max | Field build, cold |
|---|---:|---:|---:|---:|---:|---:|
| Maithea | 0 | 0 | 9.3 m | 32.3 m | 756 / 2,347 m | 26.2 ms |
| Selawyn | 0 | 0 | 7.5 m | 27.0 m | 769 / 1,836 m | 41.5 ms |
| Raiva | 0 | 0 | 5.7 m | 28.7 m | 443 / 1,355 m | 9.3 ms |
| Lethuris | 0 | 0 | 9.4 m | 63.2 m | 740 / 2,086 m | 42.0 ms |

Coarse-frame test, ROOM pins unchanged (`r1-frame.tap`, 9 pass, 1 todo = the Q-B upper side):

| Switch pair, parent − child (m) | p50 / p99 / max | ROOM | trial merge before (max) |
|---|---|---:|---:|
| Maithea L5→6 | 36 / 849 / **1,222** | 1,550 | 2,874 |
| Selawyn L6→7 | 470 / 1,358 / **1,584** | 2,000 | 2,172 |
| Raiva L4→5 | 101 / 553 / **634** | 800 | 1,767 |
| Lethuris L6→7 | 164 / 1,375 / **1,877** | 2,350 | 2,610 |

These are within 1 % of main's own values (1,216 / 1,575 / 632 / 1,869 m). The closest non-switch pairs are Raiva
L7→8 and L8→9 (61 / 63 m against 100 m) and Maithea L4→5 (783 m against 1,000 m; it was 999 m in the trial merge).

Identity (`ledger-after-staged.json` against `ledger-before-staged.json`, SHA-256): what moved is exactly the
`{mountains: true}` samplers at L0 and L(cut−1) and the mountain tiles at L0, L3, L(cut−1) and L(cut) (L(cut) in
`parents`/`parentHeight` only, asserted by the re-pin script). Truth, default, ≥ cut, off, crater, base, orbit,
hypsometry and survey are byte-identical.

Re-pins in `tests/lod-carving-reduction.test.mjs` (old → new, `digest-ledger.json`):

- `COST_IDENTITY[0]`: Maithea `08521843…44e0` → `6c4bf804…4b1d`; Selawyn `b787565e…8954` → `c455f00a…728f`;
  Raiva `498662db…f570` → `b6c55c60…2ac6`; Lethuris `4f79a66f…80b7` → `acf6482b…1a48`.
- `COST_IDENTITY[1]` (switch tile, parents only): Maithea `3e812d1d…cfdb` → `00446f5a…9cfa`; Selawyn
  `528260f7…7ecf` → `fa4de7c2…d5fa`; Raiva `92f44e5f…4c5c` → `134db519…d2b6`; Lethuris `2c689122…0986` →
  `c3574bed…ffab`.
- `COST_SAMPLER_IDENTITY[0]`: Maithea `0c2e6161…d454` → `6da06688…225d`; Selawyn `c25d73c6…d5ec` →
  `5fdbe43b…b0b2`; Raiva `733c1c25…8778` → `0b215f06…2270`; Lethuris `3fa308f5…c492` → `1c5faaac…6878`.
- `COST_SAMPLER_IDENTITY[1]` (≥ cut) is unchanged.

Checks: `tsc --noEmit` exit 0; 83/83 tests in the six touched files exit 0; `lod-coarse-frame` exit 0.

### Cost (against main `0c80da4`, CPU-quiet slot)

**Contract §6** (`contract-build-bench`, 5 rounds, mean growth per level, ≤ +10%): **MET**, max +5.2 / +4.1 /
+6.5 / +7.9 % (`contract-build-bench.json`).

| World | L0 | L1 | L2 | L3 | L4 | L5 | L6 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Maithea | +5.2 | +3.8 | −0.7 | −0.1 | +3.2 | +3.0 | |
| Selawyn | +2.1 | −1.2 | +1.4 | +1.5 | +4.1 | +1.2 | +0.3 |
| Raiva | +0.8 | +0.1 | +1.1 | +5.0 | +6.5 | | |
| Lethuris | +7.9 | −1.4 | −4.3 | +4.7 | −0.6 | +0.1 | +2.5 |

**Fair protocol** (addendum 6 Q-A, `scripts/cost-fair`, 30 interleaved fresh processes per arm and world; ref and
A/A = two `git archive` copies of main `0c80da4`, cand = `9c71ad7` with only `TERRAIN_MOUNTAINS_WIRED` flipped to
true in a scratch copy; 480 of 480 processes exit 0; `fair/`, `fair-analysis.txt`): **ALL MET.**

| World | C1 weighted, A/B median [CI] | A/A median [CI] | Judged (≤ 8%) | Orbit A/B median [CI] | Judged (≤ 5%) |
|---|---|---|---:|---|---:|
| Maithea | 4.55 [2.27, 5.54] | 0.03 [−1.09, 2.63] | 4.55 | 2.92 [1.73, 3.62] | 2.92 |
| Selawyn | 1.60 [−1.69, 5.22] | −0.90 [−2.51, 0.37] | 1.60 | 3.01 [1.50, 3.53] | 3.01 |
| Raiva | 3.87 [2.44, 4.86] | 0.54 [0.05, 1.98] (bias shown) | 3.32 | 2.78 [1.84, 3.72] | 2.78 |
| Lethuris | 5.14 [3.86, 6.77] | 0.02 [−0.76, 1.03] | 5.14 | 4.20 [2.86, 4.98] | 4.20 |

C1 outside massifs A/B: +1.86 / +0.37 / +2.01 / +3.62 %. Lethuris orbit has the least headroom (4.20 %, CI upper
4.98 %).

### Outcome

Every gate is met with unchanged pins and budgets: the frame test with today's ROOM, 0 bound violations and 0 ocean
differences, field build ≤ 50 ms, contract §6, C1 and the orbit bake under the fair protocol. The branch is merged
to main STAGED (`TERRAIN_MOUNTAINS_WIRED = false`), which lifts decision 3 of addendum (6). Wiring (T6, with the Q-B
decisions U1/U2 and the one remaining `test:full` use) is not part of this step. Not run here: `test:full`, the full
`npm test`, a Luna vote, any preview.
