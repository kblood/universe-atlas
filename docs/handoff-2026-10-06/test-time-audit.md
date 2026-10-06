# Mountains test-time audit (read-only), 2026-10-06

Scope: universe-atlas `main` (9dcb1cf) and the worktree `universe-atlas-wt/t6` (42be27e, `mountains/t6-wiring`).
Nothing was run except `ls`, `git log`, `wc`, `grep`/`awk` over existing logs. Every number below comes from an
existing log or JSON. Wall-clock figures are as logged. **Estimates are marked as estimates.**

Paths used as evidence (abbreviated in the text):
- QA = `universe-atlas/test-results/mountains/qa-protocol/` (the one complete fair-protocol run, 11:18 to 12:25, pre-registered)
- T6 = `universe-atlas-wt/t6/test-results/mountains/t6-wiring/`
- CF = `scripts/cost-fair/` (main and t6 are identical for these files)

---

## 0. Where the wall-clock time goes (measured)

| Item | Wall time | Evidence |
|---|---|---|
| Fair protocol, one full run (480 processes) | **67.3 min** of pure run time (11:18:05 to 12:25:20) | QA/exits.log, 481 lines |
| - C1 A/B (120 proc) | 1821 s, **15.3 s/proc** | per-line deltas of QA/exits.log |
| - C1 A/A (120 proc) | 921 s, 7.7 s/proc | same |
| - orbit A/B (120 proc) | 644 s, 5.4 s/proc | same |
| - orbit A/A (120 proc) | 649 s, 5.4 s/proc | same |
| T6 fair run (in progress) | idle **94 min** (15:36:38 to 17:10:55) and 9 min (17:11:18 to 17:20:22) waiting for the slot, between processes | T6/fair/exits.log lines 11-15 |
| `npm run test:full` (T6) | **1707 s = 28.5 min** wall. The 9 full-only truth tests sum to 3526 s of CPU time | T6/astra-fix-full.log |
| Default `npm test`, summed per-file time | 780 s (main), 935 s (T6 wired). Run with 4 jobs, 209 files | T6/suite-walltime-3.json `offTotalMs`/`wiredTotalMs` |
| Longest single default test file | `tests/mountain-coarse-field.test.mjs`: **106.9 s main, 113.4 s wired** | suite-walltime-3.json |
| Of which one test | "HARD: the truth core's inline voxel prefilter changes no value": **78-105 s** (8 logged runs) | grep over t6 and main logs |
| Luna sheet, T6 arm (4 bodies x mountainV3 + noclouds) | 15:11:19 to 15:19:47 = **8.5 min**. About 95 s per body, of which the shot itself takes about 15-20 s | T6/luna-capture-t6.log |
| Slot-wait lines (1 line = about 1 s of waiting) | golden-update **6215**, luna-build-refmain 2879, astra-fix-default 2475, l0-prebuilt 1647 | `grep -c "waiting for test slot"` |
| Failed after waiting | golden-update: waited about 1.7 h, then **port 5293 in use**, so rerun (golden-update2). luna refmain capture: **port 5294 in use**. First luna attempt: build exit 127 | T6/golden-update.log tail, T6/luna-capture-refmain.log, T6/luna-exits.log |

Machine: `NUMBER_OF_PROCESSORS=32`, so `node --test` runs about 31 files concurrently. With 780 s of summed CPU time
the default suite's wall time is bound by its **longest file**, not by its total. Earlier full `npm test` runs logged
40-46 s (t3/opt-tests*.log, fix-tests.log). The current critical path is the 107-113 s coarse-field file.

---

## 1. Findings ranked by saving

### F1. C1 spends about 90 % of its time on the part that carries almost none of the verdict's variance (saving: about 30-40 min per protocol run; with F2, up to about 50 min)

**Evidence**
- `CF/c1-ab.mjs:28-32`: each arm does 1 cold and 5 warm passes over the **region** set (8 sites x 385² = 1,185,800 samples,
  QA/points-Maithea.json) and 5 passes over the **outside** set (19,545 samples).
- Ref warm region costs about 470 ns/sample, so 0.56 s per pass. Cand warm costs 1045 ns and cand cold 3752 ns
  (QA/c1.jsonl line 1, `cold`, `refRegionNs`, `candRegionNs`). Together that is about 14 s of an A/B process (logged:
  15.3 s). The outside passes total about 2 x 6 x 10 ms = 0.1 s.
- The statistic is `weighted = (s·Bin + (1−s)·Bout)/(s·Ain + (1−s)·Aout) − 1` with s = 1.1-2.3 %. Per process,
  `weighted` equals `outsideOverhead` to within about 0.1 pp. Raiva A/A, for example: weighted -0.6 -2.9 1.1 -5.3 …
  against outsideOverhead -0.6 -2.9 1.1 -5.2 … (QA/c1.jsonl). The in-massif term moves A/B by about s x 100 % = 1-2.5 pp,
  with a per-process spread of about ±10 % x s = ±0.2 pp.
- The per-process spread of the verdict (A/A range −9.5..+9.2 %, A/B −16.5..+17.2 %; QA/analysis.txt) therefore comes
  from **five 10 ms outside timing windows**, which is timer and scheduler noise.

**Change.** This needs a new pre-registration, because the counted protocol changes.
- Outside: 200 rounds per arm in alternating order. That is about 2 s of timing per arm instead of 50 ms.
- Region: 1 cold and 2 warm rounds instead of 1 and 5. Optionally use 4 sites instead of 8 (593k samples), because
  the in-massif ratio has a tight spread.
- Expected process time: A/B about 7 s instead of 15.3 s, A/A about 4.5 s instead of 7.7 s. **Estimate:** C1 time drops
  from 45.7 min to about 23 min per run. If the outside noise really is window noise, the per-process SD of `weighted`
  should shrink several-fold, which makes n = 10-15 sufficient (see F2).

**Validity risk.** Low to moderate. The quantity is unchanged (same points, same weights). Only the rounds allocation
changes. Risk: the 2 s of outside loops could change JIT tiering against the region loop. Run one A/A under the new
allocation before adopting it, and keep the pre-registration rule that every run counts.

**Cannot determine without running:** how much of the spread is within-process window noise and how much is
between-process state (code placement, ASLR). Only the second part survives the change.

### F2. A pre-registered sequential stopping rule would have stopped C1 at n = 10-20 on every world (saving: about 20-25 min per run on its own; overlaps with F1)

Retrospective check on QA data. Looks at n = 10, 20, 30, two-sided α = 0.05/3 per look (Bonferroni over 3 looks),
distribution-free order-statistic CI: ranks (1,10) at n = 10, (5,16) at n = 20, (9,22) at n = 30.

| World | C1 A/B CI@10 | @20 | A/A CI@10 / @20 | Orbit A/B CI@10 | @20 | @30 |
|---|---|---|---|---|---|---|
| Maithea | [−3.3, **7.1**] | [2.2, 6.3] | contains 0 | [0.2, 9.4] | [1.5, **4.2**] | [2.7, 4.2] |
| Selawyn | [−5.7, 10.8] | [−1.0, **7.7**] | contains 0 | [1.6, 8.3] | [2.2, 6.1] | [2.8, 5.8] |
| Raiva | [−16.5, **5.7**] | [0.4, 4.4] | contains 0 | [−0.9, 7.3] | [1.3, 5.7] | [1.4, 4.3] |
| Lethuris | [−0.5, **5.7**] | [2.0, 5.4] | contains 0 at 10; [−2.9, −0.4] at 20 (bias) | [−9.0, 9.6] | [0.9, 5.0] | [1.2, 4.4] |

(Budgets: C1 8 %, orbit 5 %. Bold marks the first look where the upper bound clears the budget.)

**Proposed pre-registered rule.**
- Each world and metric is looked at after iterations 10, 20 and 30, with α = 0.0167 per look.
- Stop as MET when the A/B upper bound plus `max(0, −lower(A/A))` is at or below the budget. This conservatively
  covers a negative A/A bias that might be demonstrated later.
- Stop as NOT MET when the A/B lower bound minus `max(0, upper(A/A))` exceeds the budget.
- Otherwise continue. A stopped world drops all four of its kinds, and the interleaving of the remaining worlds is
  kept. Record the look at which each world stopped.
- Under the conservative rule:
  - **C1:** Maithea and Raiva would not stop at 10 (the A/A lower bound is −4.6 / −8.2), and are likely to stop at 20.
  - **Orbit:** only Maithea stops at 20. The orbit budget margin is thin (Selawyn's 95 % upper bound is 5.51 %).
  - **Saving:** about 25-35 % of the run, roughly 17-23 min.
  - **Stacked with F1:** the A/A lower bounds narrow and stops come earlier.

**Validity risk.** Low if pre-registered (the multiplicity is paid through α/3). The risk is **high** if the looks
are chosen ad hoc after seeing the data. Also needed: change `CF/analyze.mjs:12-14` (`ciRanks`) to take α, and make
`run.sh` read per-world stop flags.

### F3. The CPU slot is a FIFO-less 1 s poll; jobs that fail cheaply wait hours before they fail; the slot is held while waiting on the GPU lock (saving: hours of wall time on multi-job days; about 1.7 h plus one rerun lost on T6 alone)

**Evidence**
- `tests/helpers/test-slot.mjs:21-48`: `mkdir` race plus `sleep(retryMs = 1000)`. No queue. `run.sh` releases and
  re-acquires within milliseconds for each of its 480 processes, so a 1 s poller **loses most races**. The luna log
  shows the waiter's counter resetting 5 s to 1 s as new fair PIDs take the slot (T6/luna-capture-t6.log first
  lines). Conversely, the fair run sat 94 min behind bench, l0, astra and golden jobs.
- golden-update waited about 6215 s and then died in about 20 s on "Port 5293 is already in use"
  (T6/golden-update.log tail). luna refmain died on port 5294 (T6/luna-capture-refmain.log). Neither port is checked
  before the slot is taken.
- `T6/luna-capture.sh:10` runs `node $SLOT -- node capture-sheet…`. The capture then takes the **GPU lock inside the
  CPU slot** with `retryMs: 30000` (`capture-sheet.browser.mjs:127`). It also runs the Node-side `posesFor` (carved
  truth sampler, 40,000 Fibonacci samples plus summit refinement and line-of-sight checks, lines 37-110) while holding
  the GPU lock. Both locks are held longer than the critical section.
- `T6/evidence-run.sh:7` `step()` assigns the global `name`, which the c3 loop also uses. Result: 16 c3 steps
  "exit=1 0 s" (T6/evidence-exits.log), rerun through c3-run.sh. The cost is small, but it is the same class of
  failure.

**Changes**
- (a) Ticket queue in test-slot: append a ticket file and serve the lowest ticket. Add a `--batch <id>` option so that
  a protocol's 480 processes count as one holder and do not re-race. Better still, run the protocol under **one**
  slot acquisition that hands each child an inherited token (keeping the "never nest" rule).
- (b) Preflight before acquiring the slot: port free (or `--port 0`/strictPort with a random port), dist exists,
  `vite` path resolvable. Fail in seconds, not after the wait.
- (c) Capture: acquire the GPU lock outside the CPU slot. Compute poses before acquiring the GPU lock (see F6).
- (d) Use `local name` in evidence-run's `step()`.

**Saving:** none on CPU, a lot on wall time. On 2026-10-06 the golden wait alone was about 1.7 h of a job that had
no chance of succeeding.

**Validity risk.** None for (b) and (d). For (a) and (c), timing validity is unchanged as long as **every** CPU-heavy
job (builds, captures, `npm test`) still holds the slot while it runs.

### F4. The default `npm test` critical path is one carved-truth test (saving: about 55-65 s per `npm test`, about 55 % of its wall time)

**Evidence**
- `tests/mountain-coarse-field.test.mjs:26-41` runs `sampler(body,{mountains:true})`, the **carved truth** with M3
  block solves, against an `unskippedTerrain` copy (`helpers/mountain-coarse-field.mjs:23`). It covers 6,000
  directions plus **four 41² rasters on massif axes** per world, for 4 worlds, and takes 78-105 s.
- This is exactly the category that T6 decision 3 moved to `fullOnly` (`tests/helpers/statistic-level.mjs` header),
  yet it sits in the default list on main and t6 (`package.json` "test").
- The file is 107-113 s; the next longest default files are about 50 s on main (lod-carving-reduction,
  fauna-composer-eyes) and 75 s wired (terrain-budget-starvation). Before this test landed (commits
  8ffda6a/a1165e0/9c71ad7, all 2026-10-06), full runs logged 40-46 s.

**Changes (any one)**
- (a) Mark it `fullOnly` and keep a default-tier version that compares the two cores at `lodLevel: 0` or with
  `carve` false in both. The prefilter only decides whether `massifBeltSample` runs, which is upstream of carving.
  Add a 1-raster, 1-world truth check.
- (b) Split it into 4 per-world tests in separate files, or use the worker-per-world pattern that
  `tests/helpers/lod-coarse-frame.mjs` already uses, to get about 25-30 s.

**Saving:** with (a), default wall time on main goes from about 110 s to about 50 s. On the wired tree it goes to
about 75 s, where terrain-budget-starvation becomes the next critical path (34 s on main, 75.5 s wired; worth a look).
`npm test` holds the slot, so every second saved is also slot time returned to timing runs.

**Validity risk.** None for the timing protocols. Correctness coverage is preserved if (a) keeps the full version in
test:full.

### F5. test:full repeats the carved-truth M3 block solves for the same directions in 9 tests across 5 processes, and one 990 s test is the critical path (saving: about 15-20 min per test:full)

**Evidence** (T6/astra-fix-full.log)
- colour/classifier agreement 588 s (`acceptance/climate-agreement.test.mjs:89`)
- water-world colour identity 696 s (`terrain-climate-colour.test.mjs:61`)
- window 433 s and coastline 285 s
- **bodyHeightBound 60 bodies x 20,000: 990 s** (`terrain-relief-hypsometry.test.mjs:171,189`)
- floor-window three times: 215/216/82 s
- Total 3526 s of CPU, 1707 s of wall.

All of these sample `fib(i,20000)` (or a superset of it) on the same water worlds, and each file's process re-solves
the same M3 blocks from cold.

**Changes**
- (a) Split the 60-body test into 4-6 body chunks, as separate test files or worker threads. On 32 cores the critical
  path falls to about the largest other test (696 s), and further if those are split by world too. **Estimate:**
  wall time drops from 28.5 min to about 8-12 min.
- (b) Optional, larger: a content-addressed on-disk M3 block cache (or a truth-sample cache) keyed by sha256 of every
  source in `terrain.ts`'s import graph (`tests/helpers/test-selection.mjs importGraph`), the body seed, and the block
  id. Fill it once in parallel; all tests then read it.

**Validity risk**
- (a) None.
- (b) Moderate. A cache masks visit-order or memo-state bugs, so `acceptance/visit-order-independence` and the digest
  tests must keep running uncached, and a random 5 % subset in each consumer must be recomputed fresh and compared
  with `Object.is`. **Never key on TERRAIN_VERSION alone**, because unversioned edits happen on branches.

### F6. Luna capture: about 80 % of each body's 95 s is outside the shot; the refmain arm is rebuilt and recaptured every round (saving: about 5-8 min per Luna round, plus less GPU-lock hold)

**Evidence** (T6/luna-capture-t6.log)
- Body N's shot to body N+1's "views" line takes about 76-96 s. The shot itself takes 14-20 s.
- That gap holds `page.goto` plus `__atlas.ready`, a fixed 4 s, and `posesFor` over **all 8 views** on the carved
  truth, although only `mountainV3` is captured (`capture-sheet.browser.mjs:139-146`).
- Fixed sleeps per shot: 6 s + 3 s + 2 s for noclouds (lines 150-156), in addition to the settle wait.
- refmain (main 9dcb1cf) is rebuilt with `vite build` (5.4 s, but it waited about 2879 slot-poll seconds) and
  recaptured, although main has not moved.

**Changes**
- (a) Compute only the requested views in `posesFor`.
- (b) Cache `sunDir` and poses by (body, DATE, sha of the source tree that served the page). The existing `--dry`
  path (line 114) already reproduces poses from a recorded `sunDir`. Compute them before the GPU lock, and assert the
  live `sunDir` within 1e-9.
- (c) Cache the refmain **images** by (served `build-info.commit`, clean-tree flag, capture-script sha, views,
  Chrome version, GPU driver version). Recapture only when a key changes.
- (d) Keep the settle wait, but make the 6 s pre-wait conditional on the backlog not being empty.

**Validity risk**
- (c) Images are not timings, so this is safe if the key includes browser and driver. **`settledMs` is a timing and
  must not be reused from cache.**
- (b) A changed sampler on the candidate branch alters poses. The candidate arm's poses should be keyed on the
  candidate tree, which is how the code already works (`terrainSampler` is imported from ROOT).

**Cannot determine:** the split between page-ready and `posesFor`. Add timestamps around lines 140 and 144.

### F7. Caching the A/A control (saving: about 15-20 min per run, only when main has not moved; validity risk HIGH, do not adopt as-is)

**Evidence.** A/A is 1570 s of the 4035 s run (39 %). Its arms are both main, so it does not depend on the candidate.

**What is safe to cache, keyed by (main tree sha256, protocol-script sha256, Node version, CPU model plus power
plan, BIOS/microcode string):**
- the C1 point sets. These are already cached within one OUT dir (`CF/run.sh:11`), but the T6 run recomputed them
  for 9dcb1cf.
- the orbit digests.
- **one A/A run per main sha shared across candidates that are tested against the same main in the same session.**

**Unsafe to cache:**
- **any timing used in a ratio.** C1 and orbit are within-process paired ratios, so ref timings from another
  process or another day are meaningless.
- **an A/A from another machine state** (thermal, other agents' load, Windows power plan, driver or background
  update). The pre-registration says A/A is interleaved for exactly this reason.

**Compromise if adopted:** keep a concurrent A/A with n = 10 as a drift check, and fall back to the full concurrent
A/A when its median falls outside the cached A/A's 95 % CI.

### F8. Smaller items

**L0 protocol and contract bench.** `t3/l0-protocol.mjs` and `T6/l0-protocol-prebuilt.mjs` run 12 + 6 fresh
processes. Each warms 2-3 samplers over 20k directions (and the prebuilt variant builds the coarse fields) to time
**one** 160-225 ms L0 build. The ratio's spread is 1.14-1.41 (T6/l0-protocol.log). Durations are not logged (no
timestamps in bench-exits.log), so the saving cannot be quantified. Changes:
- Log `date +%T` per process.
- If the sequential rule is applied here too (the ratio is clearly above any +5 % budget after 6 runs), stop early.

**Slot coverage gap (validity, not time).** `test-runner.mjs:9` takes the slot only when there are more than 40
files, or for `test:full`. `test:pkg` and `test:affected` with 40 or fewer files run **without** it and can overlap a
timing run. Some T6 timing results may have shared the CPU with an agent's `test:pkg`. For example,
astra-fix-default ran 31 tests while waiting on the slot, so it probably did take it through `npm test`, but nothing
enforces that. Fix: any CPU-heavy command takes the slot. Cheap pure tests are already fast.

**Per-process import and type-strip.** Orbit processes are about 5.4 s against 16 bakes x about 0.33 s = 5.3 s, so
startup is under 0.3 s. **Not worth optimising.** `NODE_COMPILE_CACHE` would gain about 1 %.

---

## 2. Working tier vs gate tier (targeted sample sets)

Principle: select by **relevance**, using M1 only (the orogen layout, the T1 band grid `bandGrid(48000,32000)`, and
the belt query `sample`/`sampleWithA0`), never heights. The working tier is a fixed, frozen list, so results are
comparable across commits. Most of the selection rules already exist and only need subsetting:
- `tests/helpers/mountain-tile-set.mjs` `FROZEN_MASSIF_TILE_SET`: 12 directions per body (8 axis, 2 flank, 2 belt-end).
  Levels come from `tileSetLevels` = {cut−1, cut, 6, 8, 10, 12, 14}.
- `tests/helpers/lod-frozen-selection.mjs` `FROZEN_STRATIFIED`: 3 directions each for snowline, treeline, coast and
  range, per body.
- `tests/helpers/lod-coarse-frame.mjs`: chains through the T1 grid (`bandCellFlagged`), confirmed by `inMassif` on a
  65² net, plus `parentBoundaryEdges`.
- `lod-carving-reduction.test.mjs:159`: one in-face and one cross-face switch case per body.

### 2.1 Working set per body (proposed; about 10-12 tiles per body)

Cut and rock levels from T6/c3-run.sh: Maithea cut 6 / rock 10, Selawyn 7/11, Raiva 5/9, Lethuris 7/11.

| Class | Per body | Selection rule (M1 only) | Why |
|---|---|---|---|
| Massif axis | 2 | `FROZEN_MASSIF_TILE_SET[body]` axis[0] (Fibonacci-first) and the axis station with the largest M1 belt value (the summit candidate) | carved relief, M3 solves |
| Flank | 1 | flank[0] | envelope blend, w(g) lemma region |
| Belt end | 2 | both belt-end entries | coarse-field margin is tightest at \|u/U\| ≥ 0.94 (`MASSIF_COARSE_MARGIN.RAMP_FROM`). The coarse-field `bins` show the ratio peaking there |
| Face edge / corner | 1-2 | the first massif-touching tile (T1 grid) whose parent-boundary edge lies on a cube-face edge. Add a corner tile only if a belt crosses one (`lod-coarse-frame` FRAME chains already find these) | edge match, cross-face continuity |
| Carving switch pair | 2 | L(cut−1)→L(cut): the in-face and cross-face case from lod-carving-reduction | switch-level frame, morph |
| Rock pair | 1 | L(rock−1)→L(rock) on axis[0] | M5 onset bit-identity |
| Coast | 1 | `FROZEN_STRATIFIED[body].coast[0]` | M0 colour tail, ocean flag |
| Snowline | 1 | `FROZEN_STRATIFIED[body].snowline[0]` (Maithea and Lethuris have snow; Selawyn and Raiva have none, so use treeline[0] there) | M0 colour/classifier tail |
| Outside control | 1 | first Fibonacci direction outside every massif (as in c1-points) | identity outside belts |

**Bodies while working:** **Maithea + Lethuris.**
- Maithea: cut 6, snow, the largest massif land share (2.275 %), carries most of the lod-consistency pins.
- Lethuris: max coarse error 51.5 m, the only body with a demonstrated A/A bias, cut 7.
- Optionally rotate a third body (Selawyn or Raiva) by a fixed schedule, e.g. by commit-count parity, so Raiva's
  cut 5 and Selawyn's no-snow tail are not blind for long.
- **All four bodies at the assembly and final gate.**

### 2.2 Per test or benchmark: today vs working tier

| Row | Today | Working tier | Bodies (work/gate) | Coverage lost (gate-only) |
|---|---|---|---|---|
| coarse-field prefilter identity (F4) | 6,000 dirs + 4×41² rasters ×4 bodies, truth; 78-105 s | 1 raster (41²) on axis[0] plus 1,000 dirs; carved truth only on the raster. About 3 % of samples, **estimate** 3-6 s | 2/4 | prefilter branches at other belts; Selawyn/Raiva layouts |
| coarse-field statistics (`statistics`) | ≥ 56,724 dirs ×4 (50k fib + 4×41²) | the belt-end and axis rasters (2×41²) + 2,000 fib = about 5.4k (about 10 %) | 2/4 | p99/max pins (≤ 50 m / ≤ 100 m) are **maxima**, so only the gate can certify them |
| coarse-field `measureError` | every active cell, 8-32² taps | cells with centre \|u/U\| > 0.9 (the ramp) + every 20th interior cell. **Estimate** 15-25 % | 2/4 | the interior max (far from bound: interiorMax ≪ INTERIOR_H) |
| lod-carving-reduction full outputs | truth + L0..22 (24 levels) ×4 | truth, 0, cut−1, cut, rock−1, rock, 22 (7 levels) | 2/4 | silent drift at an intermediate level that none of the 7 touch |
| lod-carving-reduction switch | 2 cases ×4 | 2 cases ×2 | 2/4 | Raiva cut 5 / Selawyn cross-face geometry |
| lod-coarse-frame | 2 frame sites/body, net K=4,N=16384, 4 workers | 1 site + the edge tile; net N=2048 (8× fewer) | 2/4 | sub-net slope spikes (SLOPE_BOUND margin is ≥ 3.9×, so the risk is low) |
| lod-consistency | 12 stratified edge tiles × 5 pairs (L6→7..L14→15) ×4; Maithea alone about 56 s | 4 tiles (one per class) × 2 pairs (cut and 14→15) | 1-2/4 | **SHIPPED_CEILINGS are maxima over 12 tiles**, so the pins are gate-only |
| massif-tile-set / c3-tile-set evidence | 12 dirs × 7 levels; c3 = 20 processes (4 bodies × 5 levels) | the 10-12-tile working set at cut and rock; c3 = 4 processes (2 bodies × 2 levels) | 2/4 | INFO cells for A3 at other levels |
| test:full truth scans (F5) | 20k fib × 4 water worlds per test; 60 bodies × 20k | working: the working set + 2,000 fib on 2 bodies. **Not** a substitute: test:full stays the gate | 2/4 (60 at gate) | catalogue-wide height bound (60 bodies), coast/window statistics |
| C1 fair protocol | 4 bodies × (30 AB + 30 AA) = 240 processes, 45.7 min | Maithea + Selawyn (the widest C1 CI), n = 10 AB + 5 AA = 30 processes; **estimate** about 6 min. Direction signal only, never a verdict | 2/4 | the verdict (MET/NOT MET); Lethuris A/A bias |
| Orbit fair protocol | 4 × 60 = 240 processes, 21.6 min | Selawyn (closest to the 5 % budget), n = 10 AB + 5 AA; **estimate** 1.4 min | 1/4 | the verdict; A/A bias per body |
| contract-build-bench (§6) | 12 tiles × L0..cut−1 × 5 rounds × 4 bodies | 4 tiles (axis, belt-end, edge, outside) × the same levels × 3 rounds, Maithea | 1/4 | the §6 contract numbers (gate) |
| L0 protocol | 12 (+6) processes, Maithea | 4 processes | 1/1 | the CI |
| Luna sheet | 2 arms × 4 bodies × (shot + noclouds) | the candidate arm only, Maithea + Lethuris mountainV3; refmain from cache (F6c) | 2/4 | visual verdict per body; Luna votes remain gate-only |
| golden cross-engine | 3 engines | Chromium only while working; all 3 at the gate | n/a | WebKit/Firefox divergence (the known WebKit fauna mismatch) |

### 2.3 What only the gate catches (explicitly)

1. **Every timing verdict.** Working-tier timings are a direction signal with no CI-backed claim, and they must not
   be recorded as MET.
2. **Maxima and pins:**
   - coarse-field p99/max
   - SHIPPED_CEILINGS
   - UP_ROOM/ROOM measured "per pair"
   - window/height bounds over the 60-body catalogue.
   A subset can only fail these early, never pass them.
3. Layout-specific geometry on the two bodies that are not in the working pair (Raiva's cut 5, Selawyn's no-snow tail).
4. Rare-event placement: anything between the frozen tiles (e.g. a belt crossing a cube corner that the working set
   does not contain).
5. Cross-engine determinism (Firefox/WebKit) and the Luna visual vote.

**Rule of use:** the working tier must be **frozen**, like FROZEN_STRATIFIED, with commit and TERRAIN_VERSION
recorded. Re-pick it only with an owner-approved re-pin, so a working-tier pass means the same thing on every commit.
Tests should take a single `ATLAS_TEST_TIER=work|gate` switch (alongside the existing `ATLAS_TEST_FULL`), defaulting
to `gate` in `npm test` until the owner decides otherwise. This keeps the existing default suite's semantics intact.

---

## 3. What I could NOT determine without running anything

- The actual current `npm test` wall time. I inferred it from per-file times and 32 cores; the run logs only cover
  test:pkg subsets.
- How much of C1's per-process variance is window noise and how much is between-process state, i.e. the real n
  needed after F1.
- How Luna's per-body gap splits between page-ready and `posesFor`.
- The durations of contract-build-bench and the L0 runs (no timestamps logged).
- How often each suite runs per day, so daily savings are per-run figures multiplied by an unknown count.
- The real hit rate and speed-up of an M3 block or truth-sample disk cache.
- Whether terrain-budget-starvation (34 s main, 75 s wired) has a similar single-test hotspot. No per-test durations
  were found for it.
