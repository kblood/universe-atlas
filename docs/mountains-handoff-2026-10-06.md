# Mountains handoff, 2026-10-06 (wrap-up before a shutdown)

Written at the end of 2026-10-06 because Kasper had to shut down and move the machine. The long runs (the T6 fair
cost protocol and the final gate) were **killed on purpose** and are NOT finished. Everything below is quoted from
committed docs or evidence files named beside each number. Nothing here is a new measurement except the coarse
finishing check in section 2, which was run during the wrap-up.

Labels used: **"Opus-decided"** = decided by Opus 5.5 on Kasper's instruction, not by Kasper; he can overrule any of
it. **"Owner decision"** = Kasper's own decision, recorded verbatim in the source doc.

## 0. T6 merged unverified (Kasper's decision, 2026-10-06)

Kasper decided at wrap-up: **merge T6 to main now and fix afterwards if needed** (local only, reversible, nothing
pushed). The coarse finishing check (section 2) was all green, so `mountains/t6-wiring` (`775a2e6`) was merged into
main with `--no-ff` under the merge lock as **`aa3a2c7`**; `npx tsc --noEmit` on main after the merge: exit 0 (3 s).
It was merged **WITHOUT the final gate and WITHOUT the fair cost protocol on the wired build.**

Revert (one command, restores main's staged state `2a7b28a`):

```sh
git revert -m 1 aa3a2c7
```

Known risks on main now:

- `TERRAIN_MOUNTAINS_WIRED = true` on main: the app shows the mountains; every terrain consumer sees them.
- `TERRAIN_VERSION = terrain-1.9.0-mountains` (and `lod-ladder-3`, `mountain-assembly-3`): caches and saved state keyed
  on the version move.
- Golden re-pinned once (biomes, oceanVolume, placeQuery, census, rocks); the cross-engine check ran only inside the
  `--update` run.
- The default `npm test` is slower: summed per-file wall 779.8 s → 935.1 s (+20 %); `test:full` now carries ~28 min of
  truth copies.
- Cost budgets (C1 ≤ 8 %, orbit ≤ 5 %) are **not re-confirmed on the wired build**; route A met them with the flag
  flipped in a scratch copy, before M5 and the T6 test moves. **Lethuris orbit had the least headroom** (4.20 %, CI
  upper 4.98 % against 5 %).
- Known open findings carried in: Raiva fresh-seed R1 7.72 < 8; Maithea 6 x L0 cold 1.28 x main (one-time field
  build); massif tile colour/class beyond the plan tolerance (M0 reopen trigger met).

What the final gate still has to prove (section 4): the fair protocol C1/orbit on the wired tree; `npm run test:full`
once; `npm run test:golden` cross-engine; `npm run build`; a massif-targeted Luna sheet against 0/24 and 0/48; and,
outside the plan, headset and quiet-host frame time. If any of these fails, fix forward or revert with the command
above.

## Read first on restart

1. This file, then `docs/mountains-opus-decisions-2026-10-05.md` (Q1-Q6 + addenda (1)-(6): the whole decision
   trail and every budget).
2. `docs/mountains-t6-wiring-2026-10-06.md` (on main since `aa3a2c7`): the T6 record, sections 1-13.
3. `docs/mountains-t6-baked-coarse-2026-10-06.md` (route A rounds 1-3), `docs/mountains-t3-coarse-carving-2026-10-06.md`,
   `docs/mountains-t4-sparse-consumers-2026-10-06.md`, `docs/mountains-t6-split-core-2026-10-06.md`.
4. `docs/mountains-design-2026-10-04.md` (owner decisions (a)-(g) verbatim; elements M0-M5; §2.5 = M5),
   `docs/lod-ladder-contract-v1.md` (§3, §3.1 frame, §5, §6 budgets), `docs/owner-decisions-2026-10-04.md` (A1-A18).
5. `docs/test-policy.md`; then the follow-up designs copied into `docs/handoff-2026-10-06/` (section 9).
6. Memory (Claude auto-memory, `C:/Users/Caldor/.claude/projects/C--LLM-IWSDK/memory/`): `project_universe_atlas.md`,
   `feedback_worktree_junction_remove.md` (junction-first rule), `feedback_ask_opus_not_user.md` (design questions go
   to Opus, recorded as Opus-decided), `feedback_commit_cadence.md`, `feedback_gpu_tdr_vram_crash.md` (GPU/browser
   lock).

## 1. What is on main now

Main before the T6 merge: `2a7b28a` (= `9dcb1cf` route A staged + the preview-stage deployment record
`docs/mountains-preview-20261006-01.md`, merged by the preview agent). Then `aa3a2c7` T6 merged unverified (section 0). First-parent history of the
mountains work (oldest first):

| Commit | What |
|---|---|
| `e8a9617` | design/mountains: element-first plan + metric prototypes |
| `34f04ed`, `43707a2` | MTN-0 harness (shared mountain-metrics helper) |
| `3a164f6` | MTN-2 / M1 orogen layout (belt mask, axis field) |
| `cffc5ff`, `a3c2a26` | MTN-3 / M2 massif envelope; assembled check record |
| `c8da14c` | MTN-4 / M3 carving candidate F (`mountain-carving-2`), seam-free haloed drainage carving, unwired |
| `e636b5a` | MTN-5 / M4 summits (prominence check), unwired |
| `39e2448` | step G: 800 m colour grain reduced alone, `terrain-1.8.1-grain` (owner decision (b)), golden re-pinned once |
| `90fdf1c` | MTN-6 step A: PARTIAL, wiring not merged (cost: warm +108-156%, cold 6 x L0 335-461 s) |
| `b2c976a`, `1dbf2c2`, `500c5a9` | Opus decisions Q1-Q6, README status, Astra addendum (1) |
| `66453b2` | T1: M1 massif-band rejection grid (value-preserving) |
| `914d86f` | T2: M1 `orogen-layout-2` in-massif foot-point solve |
| `85d1e44` | T3: `lod-ladder-2` coarse-level carving reduction, STAGED |
| `33b049a` | T4: sparse `terrainSampler` consumers at level 0, STAGED |
| `9971c3f` | T6 split-core cost attempt (evidence + addendum (4), docs only; code NOT merged) |
| `62d0dfd` | M5 steep-rock fine detail (`mountain-rock-detail-1`), STAGED, unwired |
| `cc0032f` | route A decision record (addendum (5), docs only) |
| `37baddf` | `tests/lod-coarse-frame.test.mjs` (contract §3.1 coarse-frame and edge-match element test) |
| `0c80da4` | fair cost protocol (`scripts/cost-fair/`) + frame upper-side decision (addendum (6), docs and scripts) |
| `9dcb1cf` | route A baked coarse band field (round 3, `orogen-layout-4`, `massif-envelope-4`), STAGED |

Versions on main `9dcb1cf` / `2a7b28a`, i.e. before the T6 merge (from the source): `TERRAIN_VERSION = terrain-1.8.1-grain`, `LOD_LADDER_VERSION =
lod-ladder-2`, `MOUNTAIN_ASSEMBLY_VERSION = mountain-assembly-2`, `MOUNTAIN_CARVING_VERSION = mountain-carving-2`,
`MASSIF_ENVELOPE_VERSION = massif-envelope-4`, `OROGEN_LAYOUT_VERSION = orogen-layout-4`,
`MOUNTAIN_ROCK_DETAIL_VERSION = mountain-rock-detail-1`, `TERRAIN_MOUNTAINS_WIRED = false` (staged: the app shows no
mountains; `{mountains: true}` opts a sampler in for tests). **After `aa3a2c7`:** `TERRAIN_VERSION =
terrain-1.9.0-mountains`, `LOD_LADDER_VERSION = lod-ladder-3`, `MOUNTAIN_ASSEMBLY_VERSION = mountain-assembly-3`,
`TERRAIN_MOUNTAINS_WIRED = true`; the others unchanged.

## 2. Branch `mountains/t6-wiring` (worktree `C:/LLM/IWSDK/universe-atlas-wt/t6`)

From main `9dcb1cf`. Commits: `8bed2e3` wiring (`TERRAIN_MOUNTAINS_WIRED = true`, `terrain-1.9.0-mountains`,
`lod-ladder-3`, `mountain-assembly-3`, M5 wired, Q-B U1/U2 tests, decision-3 test moves, landing decision 2);
`42be27e` Astra review MUST fixes (truth copies of pointwise invariants kept in test:full); `40bddd7` golden re-pin
(once); `775a2e6` wrap-up record (doc placeholders filled honestly + 103 small evidence files under
`test-results/mountains/t6-wiring/`, multi-MB traces, `.f64` point files and Luna PNGs stay on disk only).

Status: **wired, golden re-pinned, Astra reviewed (MERGE AFTER MUST FIXES; all three MUSTs fixed). Final gate NOT
run. Fair cost protocol on the wired build NOT finished** (killed at i=19 of 30 at ~18:04; raw lines in
`test-results/mountains/t6-wiring/fair/`, not analysed, not citable).

### Coarse finishing check at wrap-up (one test-slot level per command, on `40bddd7` + doc commit)

Run by a sub-agent from `C:/LLM/IWSDK/universe-atlas-wt/t6`, Node v24.7.0, HEAD 40bddd7 → 775a2e6 (doc commit
only) during the run. Every exit code is real.

| # | Command | Exit | Wall (s) | Result |
|---|---|---|---|---|
| 1 | `npx tsc --noEmit` | 0 | 3.2 | no errors |
| 2 | `node tests/helpers/test-slot.mjs -- node --test` on `mountain-layout`, `mountain-layout-grid`, `mountain-envelope`, `lod-coarse-frame`, `terrain-mountains-assembly`, `lod-carving-reduction`, `sparse-consumer-levels`, `mountain-rock-detail` (`.test.mjs`) | 0 | 41.9 | 96 tests: 94 pass, 0 fail, 2 skipped (built-in: the opt-in ROW COST bench; the carved-truth ocean-flag copy that runs only in test:full) |
| 3 | same slot, `node --test --test-skip-pattern="truth core" tests/mountain-coarse-field.test.mjs` | 0 | 23.9 | 20 / 20 pass; the 78-105 s test "HARD: the truth core's inline voxel prefilter changes no value" **NOT RUN** (skipped by name) |
| 4 | same slot, `node tests/golden/node-run.mjs`, compared read-only with `tests/golden/golden.json` | 0 | 7.1 | all 16 digests and `counts` match (Node half only; cross-engine **NOT RUN**) |

No new files, no locks and no processes left behind. On main after the merge: `npx tsc --noEmit` exit 0 (3 s).

## 3. Measured results worth keeping (numbers with sources)

### 3.1 Route A (baked coarse band field), merged staged in `9dcb1cf`

Source: `docs/mountains-t6-baked-coarse-2026-10-06.md` §9, evidence `test-results/mountains/t6-margin/` (git-ignored,
on disk in the baked worktree / main checkout).

- Bound: 0 violations, 0 ocean differences on 4 x 56,724 samples. Coarse minus exact uncarved floor p99 / max:
  Maithea 9.3 / 32.3 m, Selawyn 7.5 / 27.0, Raiva 5.7 / 28.7, Lethuris 9.4 / 63.2 m (before round 3: 756 / 2,347,
  769 / 1,836, 443 / 1,355, 740 / 2,086 m).
- Field build cold: 26.2 / 41.5 / 9.3 / 42.0 ms (budget 50 ms) -> **<= 42 ms**.
- Contract §6 per-level build vs main `0c80da4`: max +5.2 / +4.1 / +6.5 / +7.9 % -> **<= +7.9 %** (budget +10 %).
- Fair protocol (480/480 exit 0, `fair-analysis.txt`): C1 weighted judged **4.55 / 1.60 / 3.32 / 5.14 %** (budget 8;
  Maithea A/B 4.55 [2.27, 5.54], Lethuris 5.14 [3.86, 6.77]); orbit judged **2.92 / 3.01 / 2.78 / 4.20 %** (budget 5;
  **Lethuris CI upper 4.98 = least headroom**). C1 outside massifs +1.86 / +0.37 / +2.01 / +3.62 %. (The brief's
  "C1 <= 4.55 %" is Maithea's value; the max over worlds is Lethuris 5.14 %, addendum (6) "Lifted" line.)
- Coarse-frame switch pairs, parent − child max vs ROOM (unchanged pins): Maithea L5→6 **1,222 / 1,550**, Selawyn
  L6→7 **1,584 / 2,000**, Raiva L4→5 **634 / 800**, Lethuris L6→7 **1,877 / 2,350** m (within 1 % of main's 1,216 /
  1,575 / 632 / 1,869). Closest non-switch: Raiva L7→8 / L8→9 61 / 63 m vs 100; Maithea L4→5 783 vs 1,000 m.
- Route A round 1 (addendum (5)): §6 MET (max +8.9 %), orbit MET (+4.3 / +2.8 / +0.3 / +2.3), C1 NOT MET under the
  old harness (8.40 / 9.38 / 10.43 / 8.76 %), field build NOT MET (Selawyn 57.8, Lethuris 61.5 ms).
- Round 2 (§8): field build fixed (28.05 / 41.96 / 9.54 / 42.31 ms), §6 MET (max +6.7), old-harness C1 missed on
  Maithea 9.86 / Selawyn 12.10 %, orbit Lethuris +8.4 %. Superseded as the judging measurement by the fair protocol
  (addendum (6): round-2 code judged C1 5.50 / 1.75 / 3.74 / 5.48 %, orbit 3.33 / 3.95 / 3.27 / 0.94 %), but the
  merge was then blocked by the coarse-frame switch pins (trial merge maxima 2,874 / 2,172 / 1,767 / 2,610 m),
  lifted by round 3's along-axis margin.

### 3.2 T1-T4 and M5

- **T1** (`docs/mountain-layout-v1.md` "Band rejection grid", addendum (2)): outside-massif cost +3.8 / +3.8 / +5.4 /
  +4.6 % (planning target +3 % NOT MET, waived, Opus-decided); 0 identity mismatches, 0 unflagged band directions,
  flagged/massif area 1.33-1.49, cold build <= 48.7 ms.
- **T2** (`docs/mountain-layout-v1.md` T2 section): in-massif warm 1,170 ns Maithea / 1,161 ns Raiva (target <= 1,530);
  old-harness C1 median +6.58 / +3.44 / +6.23 / +5.13 % (Maithea pooled 24 runs +7.10 %, 10 of 24 single runs > 8 %).
- **T3** (`docs/mountains-t3-coarse-carving-2026-10-06.md`): 0 block solves on 75,768 coarse tiles; truth identity 0
  mismatches on 4 x 15,120; upper envelope 0 violations; switch seam test MET (8 cases); Maithea 6 x L0 branch/main
  median 1.051; per-level §6 NOT MET +8.0..+26.6 % at first; round 1 builder speedups (`49c8bc3`) max +5.5 % vs
  `914d86f`; mountains' own coarse cost +16.8..+32.6 %; fix round of eleven core restructurings discarded.
- **T4** (`docs/mountains-t4-sparse-consumers-2026-10-06.md`): orbit bake block solves 4,075 (642.5 s) -> 0 (390-420
  ms); worst cold massif tile 1,354 ms (Raiva L5, 8 blocks) < 2 s, so T5 not triggered.
- **M5** (`docs/mountains-design-2026-10-04.md` §2.5, `test-results/mountains/m5/`): gate pool 730901-908: R1e 3.67,
  R2 p50 38.12 / p90 45.23, R3' 2.49, R4 0.0001, R5 0.001 / 0, R6 0; add-on cost 149.5 ns vs 214 ns budget. On the
  T6 wired tree, new pool 731001-008 (`m5-pool.json`): R1e 3.71, R2 38.12 / 45.24, R3' 2.48, R4 0.0001, R5 0.001 /
  2.47, R6 0, all negative controls fail as required; rock depth p50/p90/max per world in the T6 record §6.4.

### 3.3 T6 wired (source: `docs/mountains-t6-wiring-2026-10-06.md`, evidence `test-results/mountains/t6-wiring/`)

- U1 child point <= parent stored + 0.05 m: max 0.000 m everywhere; U2: 37 UP_ROOM pins (max x 1.25, 50 m steps).
- 17/17 SHIPPED_CEILINGS pins, 96/96 LOD cells (`lod-cells-wired.json`) — **not mountain evidence** (no frozen tile
  touches a massif).
- Massif tile set (12/world, `massif-tile-set.json`): heights inside the plan tolerance; colour/class beyond it on
  Maithea/Lethuris (rgbP99 Maithea L5→6 175.6 vs 12, Lethuris L6→7 261.4 vs 12); retention keeps would fail in 5
  places; **M0 reopen trigger condition met** (not acted on).
- M3 rows old and fresh seeds 730301-308: all 8 rows + R3' pass. M4 R1 fresh seeds: **Raiva 7.72 / 7.66 < 8 FAIL**
  (old seeds 8.75); real-field density 45.01 / 36.27 / 20.24 / 29.20 per 1000 km². Opus-decided not a blocker.
- Contract §6 wired: max **+8.8 / +7.3 / +3.2 / +6.8 %** (`contract-bench.json`) MET.
- Maithea 6 x L0 cold: branch median 209.7 ms, branch/main 1.28 (relative +10 % NOT MET); with prebuilt field
  1.002-1.097 (`l0-prebuilt.json`); Opus-decided not a blocker (one-time field build).
- C3 cold carved tiles max 1,378 ms (Maithea L6) < 2 s (`c3-tile-set.json`).
- Default `npm test` summed wall 779.8 s main -> 935.1 s wired (+20 %), 209/209 exit 0 (`suite-walltime-3.json`).
- Truth hypsometry (`hyps-truth.json`): all bands met (Maithea p90 2730, p99 4346, max 5910 m, above 4 km 2.18 %).
- Survey: 0 of 10 bodies move (`survey-diff.json`), `SURVEY_VERSION` unchanged.
- Golden re-pin: biomes, oceanVolume, placeQuery, census, rocks moved; terrain and combined unchanged; chromium /
  firefox MATCH, webkit MATCH-EXCEPT-KNOWN (`golden-update2.log`, `golden-report.json`).
- Luna (UNCALIBRATED, advisory): T6 0 PASS / 8 images (0 / 24 / 0), main 0 / 8 (0 / 23 / 1); the sheet does not
  target a massif.
- The 9 test:full truth copies pass (`astra-fix-full.log`, 28 min wall).

## 4. What is MISSING before the plan can be called done

1. **The T6 fair cost protocol on the wired build** (C1 and orbit, `scripts/cost-fair/run.sh`, 30 iterations,
   ~67 min) — killed at i=19, must be rerun from scratch.
2. **A T6 Luna sheet that targets a massif** (an axis tile of the frozen set); the standard sheet ran (0 / 8).
3. ~~The merge of T6 to main~~: done unverified at wrap-up (`aa3a2c7`, section 0); the gate below still applies.
4. **The final gate, once:** `npm run test:full` (one run), `npm run test:golden` (cross-engine), `npm run build`,
   Luna compared against the earlier 0/24 and 0/48 sheets.
5. **Cleanup of worktrees and branches** (junction-first rule: `cmd /c rmdir <wt>\node_modules` BEFORE
   `git worktree remove <wt>`; never `--force` while the junction exists). Worktrees under
   `C:/LLM/IWSDK/universe-atlas-wt/`, all with a `node_modules` junction to the main checkout:
   - `t6` (`mountains/t6-wiring`, merged as `aa3a2c7`) — remove after the final gate passes;
   - `t6-refmain` (detached `9dcb1cf`, Luna reference build) — removable;
   - `baked` (`mountains/baked-coarse`, merged) — removable; keep `test-results/mountains/t6-margin` evidence first;
   - `asm1` (`mountains/assembly-1`, NOT merged; superseded by assembly-2 / step A) — evidence check, then removable;
   - `m0b`, `m0c` (`mountains/m0b`, `mountains/m0c`, NOT merged) — **keep `m0c`** until the M0-v3 evidence
     (`test-results/mountains/M0-v3/`) is copied or hashed on main (addendum (1) item 5);
   - `r2-relief-present` (`round2/relief-present`, NOT merged, held by owner decision 2026-10-04 in favour of the
     mountains design) — keep;
   - `_fair-t6/` is NOT a worktree: scratch `git archive` arms (`ref/`, `ref2/`, `cand/`) for the fair protocol with
     its own `node_modules` junction — `cmd /c rmdir _fair-t6\node_modules` first, then delete the folder.
   - Also a detached worktree `scratchpad/ec2-base` (`37e2663`, session scratch) — junction check, then remove.
   - Other unmerged branches: `mountains/m0` (M0 v1), `biome-round/W2-C-FOREST-C2-held` (not mountains; held).

## 5. Open owner items (only Kasper can answer)

1. **A3** — should the massif tile set's colour/class cells BLOCK (strict post-relief targets)? Today report-only;
   they exceed the plan tolerance on Maithea/Lethuris (3.3).
2. **M0 is CLOSED NOT MET** (Q1); its reopen trigger condition is now met by the massif tile set — reopen or not?
3. **Upper bound U1/U2 at T6** (Q-B): U1 exact, U2 by measured UP_ROOM pins; the cap option instead would take
   `lod-ladder-4`.
4. **Landing cutoff** (decision 2 of addendum (4), option (a) implemented at T6) and A6/A7 (landing cap and hover).
5. **Raiva R1 on fresh seeds** 7.72 < 8 (Opus-decided not a blocker) — accept or require an M2/M3 change?
6. **Maithea 6 x L0 cold relative** 1.28 vs main (one-time field build; Opus-decided not a blocker).
7. **Q3** retention reference, **Q4** old ridges outside belts (default keep), the 48 km cap / parallel ranges across
   wide belts (needs class pins to move), M3 straight main divide (crest-wander not adopted), MTN-7 labels and the
   real-DEM download (no download without authorisation).
8. **Quiet-host perf**: every cost number is Node on a busy 32-core dev host under the test slot; no quiet-host or
   in-browser frame-time measurement of the wired build exists.
9. **Headset**: nothing was checked on a Quest / in VR.
10. The addendum (3) baseline question (judge against main as it is, stricter reading kept) — moot now that route A
    meets every budget, unless Kasper wants to revisit.

## 6. Full chronological decision trail

Owner decisions (verbatim in `docs/mountains-design-2026-10-04.md` lines 9-40):

- 2026-10-04: mountains get their own design instead of the held `round2/relief-present`; Luna verdicts are advisory
  and do not block alone; testing is element-first.
- 2026-10-05 **(a)** M3 coherence and pit rows may be CALIBRATED against an eroded positive control (done,
  `docs/mountain-m3-calibration-v1.md`). **(b)** the 800 m colour grain changed in its own step with a
  `TERRAIN_VERSION` bump and one golden re-pin (done: step G, `terrain-1.8.1-grain`). **(c)** M3 cost judged on warm
  resident cost. **(d)** assembly in two steps. **(e)** the 8 failing LOD class pins handled by FREEZING the
  stratified tile selection AND changing the M2 envelope; NO pin loosened. **(f)** the convex blend lowering heights
  at belt edges (up to 3 km) accepted. **(g)** a FIXED M3 carving width tiled across wide belts so R1 >= 8 on all
  four worlds.
- 2026-10-06: **merge T6 to main now and fix afterwards if needed** (local only, reversible; see section 0).

Opus-decided (all in `docs/mountains-opus-decisions-2026-10-05.md`; "decided by Opus 5.5 on Kasper's instruction,
overrulable"):

| When | Item | Decision |
|---|---|---|
| 10-05 | Q1 | M0 (MTN-1) CLOSED NOT MET (metric 2 best 0.924 vs <= 0.9); MTN-6 no longer waits; reopen trigger defined |
| 10-05 | Q2 | keep +8 % warm (C1) and +10 % §6; plan T1-T6; reject persisted blocks (72-91 MB per belt) |
| 10-05 | Q3 | accept 48 km massif cap (deviation from (g) wording) |
| 10-05 | Q4 | R1 = whole-core 64 km raster binds; axis/flank rasters INFO |
| 10-05 | Q5 | freeze the 32 Maithea retention edge tiles |
| 10-05 | Q6 | README status; massif tile set at T6 (INFO); retention Q3 stays Kasper's |
| 10-05 | Addendum (1) | Astra review: T3 parent-mesh level rule; real mountain tiles in the set; fresh seeds 730301-308; scope narrowing stated; follow-ups (known-failures hardening, keep m0c, baked macrofield as fallback) |
| 10-05 | Addendum (2) | T1 merged at +3.8..+5.4 % outside (+3 % planning target waived); T2 target tightened to 1,530 ns |
| 10-06 | T3 record | staged wiring behind `TERRAIN_MOUNTAINS_WIRED = false` (scope change stated) |
| 10-06 | Addendum (3) | T3: one bounded attempt (builder speedups kept), then merge staged; coarse cost carried OPEN into T6 |
| 10-06 | Addendum (4) | T6 BLOCKED on cost after **17 attempts** (split core etc.); stricter baseline kept; landing option (a); statistic tests to level 0 |
| 10-06 | Addendum (5) | route A meets §6 and orbit, misses old-harness C1 and field build: not merged |
| 10-06 | Addendum (6) | fair cost protocol (Q-A); route A meets C1/orbit; merge BLOCKED by frame switch pins; Q-B upper side = U1 exact + U2 UP_ROOM; **lifted** after round 3 |
| 10-06 | T6 record §6.3 / §7.3 | Raiva fresh-seed R1 and Maithea L0 relative: not merge blockers |

## 7. Failed and blocked attempts, and what was learned

- **M0 v1-v3** (branches `mountains/m0`, `m0b`, `m0c`): no estimator within the build budget reaches <= 0.9 of point
  on Maithea L6→7 (best 0.924; only LS 0.772 at 4x colour samples, making L5→6 37 % worse). Closed NOT MET; step G
  served its purpose.
- **Step A wired** (`90fdf1c`, branch `mountains/assembly-2`; `assembly-1` earlier): all terrain rows pass but warm
  +108-156 %, cold 6 x L0 335-461 s. Led to the T1-T6 cost plan.
- **The V8 codegen problem / 17 attempts** (addenda (3)-(4)): the wired coarse cost was not the mountain work (+2..+5 %
  of tile time) but V8 compiling the plain terrain core worse once the mountain path exists. Eleven core
  restructurings (T3 fix round), the split core (`docs/mountains-t6-split-core-2026-10-06.md`, bit-identical, no
  measurable change), private kernels and other prototypes: no fix. Lesson: route around (route A) instead of
  fighting the JIT.
- **Route A round 1**: flat margin 0.16 H too loose (p99 overestimate ~750 m) — C1 and field build missed.
- **Route A round 2, lazy per-block build dropped**: cold build fell to 14 / 18 / 5 / 20 ms but the work moved into
  timed tile builds (+10.6..+12.0 % on three worlds); eager faster builder kept (`r2/fix-lazy-final.patch` kept).
- **Old C1 harness** (15 runs, fixed arm order, points picked by the measured arm): A/A medians −2.2 / −9.2 / +2.0 /
  −0.6 %, single runs −20.5..+8.7 % — it could not resolve the 1-3 points that decided merges. Replaced by the fair
  protocol (addendum (6)).
- **Route A round 3**: the two causes of the overestimate (flat margin; `best = main` in the candidate max) fixed
  together; either alone left 1.3-2.3 km.
- **T6**: Luna 0 PASS (uncalibrated, not a massif view); Raiva fresh-seed R1 fails (overfitting caveat confirmed).

## 8. Incidents and test-process lessons

- **node_modules emptied twice** (2026-10-06): `git worktree remove --force` on a worktree whose `node_modules` is a
  junction follows the junction and empties the main checkout's `node_modules`. Restored with
  `npm ci --offline --ignore-scripts` (84 packages from the local cache). Rule: `cmd /c rmdir <wt>\node_modules`
  first, never `--force` with a live junction (memory `feedback_worktree_junction_remove.md`).
- **Nested test-slot deadlock, 38 min**: a command that took the test slot ran a child that also asked for the slot;
  the child waited on its own parent. Rule: one test-slot level per command, never nested (the slot is a plain mkdir
  lock at `C:/LLM/IWSDK/.atlas-test-slot`; `tests/helpers/test-slot.mjs`).
- **Golden / Luna jobs failing on a busy port**: the golden update waited ~1.7 h for the slot (6,215 wait lines), then
  failed because port 5293 was held by another local service, after it had already rewritten `golden.json` from
  Node; rerun on 5297. Luna refmain capture hit port 5294 the same way; first Luna build exit 127. Rule: pick a free
  port with `--strictPort` before taking the slot.
- **Slot waiting dominates wall time**: the T6 fair run sat idle 94 min + 9 min waiting for the slot
  (`test-time-audit.md` §0).
- **Tiered tests / fail fast** (design only, not implemented): `docs/handoff-2026-10-06/tiered-testing-mvp.md` —
  `ATLAS_TEST_TIER=smoke|work|default|gate`, tier changes sample counts never pins; smoke < ~2 min on frozen
  relevance-picked samples, work = 10-12 frozen tiles on Maithea + Lethuris, gate = today's full nets.
- **Audit savings** (`docs/handoff-2026-10-06/test-time-audit.md`, estimates marked there): fair protocol one run
  67.3 min, of which C1 A/B 15.3 s/process spends ~90 % on the low-variance in-massif region (F1: ~30-40 min per run);
  a pre-registered sequential stopping rule would stop C1 at n = 10-20 (F2: ~20-25 min); default suite wall time is
  bound by its longest file `mountain-coarse-field` (107-113 s, of which one HARD test 78-105 s); test:full 28.5 min.
- **Targeted samples**: statistic-style tests moved to level 0 with truth copies in test:full (decision 3 + Astra
  MUSTs) cut the default suite from 2,136 s (4 killed, 8 failing) to 935 s.

## 9. Follow-up designs (copied into `docs/handoff-2026-10-06/` so they survive the scratchpad)

- `tiered-testing-mvp.md` — tiered testing MVP spec (implement after T6 merges).
- `test-time-audit.md` — the read-only test-time audit (F1-F8).
- `terrain-methods-survey.md` — terrain-methods survey.
- `astra-problems/` — the Astra reviews of open problems (2026-10-05; prompts 1-3, answers 1-3, summary). The raw
  0.5-1 MB `log*.txt` transcripts were not copied (still in the session scratchpad, which may be cleaned).

## 10. Resume commands (tomorrow)

```sh
cd C:/LLM/IWSDK/universe-atlas
git status --short; git log --oneline -5; git worktree list
ls C:/LLM/IWSDK/.atlas-test-slot C:/LLM/IWSDK/.gpu-browser-lock C:/LLM/IWSDK/universe-atlas-wt/.main-merge-lock  # expect none
npx tsc --noEmit
# 1. fair cost protocol on the wired build (~67 min; fresh arms):
#    REF  = git archive of main before T6 (9dcb1cf), REF2 = a second identical copy,
#    CAND = git archive of the wired tree (main after the T6 merge, or mountains/t6-wiring)
#    put a node_modules junction in their common parent (remove it later with cmd /c rmdir)
REF=<ref> REF2=<ref2> CAND=<cand> OUT=test-results/mountains/t6-fair N=30 sh scripts/cost-fair/run.sh
node scripts/cost-fair/analyze.mjs test-results/mountains/t6-fair
# 2. final gate, once each, ONE test-slot level per command (the runners take the slot themselves; do not wrap):
npm run test:full
npm run test:golden          # cross-engine; needs the GPU/browser lock and a free --strictPort port
npm run build
# 3. Luna massif-targeted sheet (GPU lock, local vite preview --strictPort), compare with 0/24 and 0/48
```

Check before running each: whether the script already takes the test slot (`grep acquireTestSlot`), so the slot is
never nested.

## 11. What was NOT verified (honest list)

- The fair cost protocol (C1, orbit) on the wired build — not finished; C1/orbit on the wired build are therefore
  **not re-confirmed** (route A's numbers were measured with the flag flipped in a scratch copy of `9c71ad7`, not on
  the T6 tree with M5 and the T6 test moves).
- `npm run test:full` on `40bddd7` or later (only the 9 truth copies ran, on `42be27e`'s pre-check).
- `npm run test:golden` as a separate gate after the re-pin (the `--update` run did the cross-engine check once).
- `npm run build` of the wired tree as a gate (only the Luna builds ran).
- A massif-targeted visual check; any headset / Quest check; any quiet-host or in-browser frame-time measurement.
- The full default `npm test` as one run after `40bddd7` (the per-file survey ran on `8bed2e3`-era code; the wrap-up
  coarse check covers only the element files in section 2).
- Single-run lines in `fair/c1.log` are not results.
