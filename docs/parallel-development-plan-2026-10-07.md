# Parallel development plan (2026-10-07)

Produced by an ultracode workflow (4 read-only scouts, 3 lens plans: throughput/risk/MVP, judge synthesis, completeness critic). Status: PLAN. The critic corrections in part 2 OVERRIDE part 1 where they conflict. Scout reports: docs/parallel-development-2026-10-07-scouts.md.

State at writing: tiers MVP merged (27ce1bf), test fixes merged (b09a235), T6 merged unverified (aa3a2c7). Slot and GPU lock free.

# Part 1: synthesised plan

## Synthesised parallel-development plan: universe-atlas and civ-lab

## Scores (1–10, higher is better; for effort, higher means cheaper)

| Plan | Safety (determinism, golden, cost evidence, GPU) | Real wall-time gain | Effort | Fit to Kasper's wishes (broad fail-fast tests, terrain first, small samples in dev) | Total |
|---|---|---|---|---|---|
| Throughput | 6: golden off the GPU lock without a staged proof; iGPU lane in scope; registry and policy changes bundled in | 9: widest lanes, test:full sharding, golden split, merge queue | 3: about 8 infra projects at once | 6: terrain lane is fine; few fail-fast checks per change | 24 |
| **Risk** | **9: every change has a check that fails closed; sharing sits behind a flag; P2 shows contamination; ff-only merge queue** | 7 | 6 | **8: a check per step; terrain holds until GATE-1; unwired gully filter** | **30** |
| MVP | 8: the slot design is backward compatible, but stale worktrees can bypass the shared drain | 7 | 8: about 1.5 Opus-days, sized per step | 7: terrain is design-only; the cheap test:affected fix is included | 30 |

**Winner: Risk** (it wins the tie on safety and fit). From MVP I take the concrete slot design that keeps old callers working, the cheap `test:affected` fix and the effort sizing. From Throughput I take the scheduled exclusive window, test:full sharding and later golden-section and registry splits.

## Recommended plan

### Infrastructure changes, in order. Each turns on only after its check passes.

| # | Change | Files | Fail-fast check | Effort |
|---|---|---|---|---|
| I0 | Docs and config. Drop `test:full` from the hand-off tier. Add a fixed hand-off header: verdict, sha, exit codes, a NOT-run list, and a `needs:` line for the merger. Every `codex exec` passes `-m gpt-6-astra` and records the model in its answer file. Turn on rerere. | `docs/github/WORKFLOW.md:105`, `docs/test-policy.md`, `git config rerere.enabled true` | none | Sonnet, 15 min |
| I1 | Merge the tiers MVP. It is already in flight. | tiers branch | Agent verification: smoke under 2 min, default tier unchanged | Coordinator, 30 min |
| I2 | Shared/exclusive slot, using MVP's design (details below). Flag `ATLAS_SLOT_SHARED=0` until I3 passes. | `tests/helpers/test-slot.mjs`, `test-runner.mjs`, `tier-runner.mjs`, `tests/test-runner.test.mjs` | Unit tests in a sandbox `ATLAS_TEST_SLOT_DIR`, never the live slot | Opus, about 4 h |
| I3 | Load-insensitivity proof. Run the default suite alone, then with 100% synthetic load on the other CCD. Any test that newly fails moves to `tests/perf` with its threshold unchanged. Log peak RSS (`maxRSS`) per step. | `tier-runner.mjs` (RSS column in steps.jsonl) | Zero new failures, then the flag turns on | One run, about 5 min |
| I4 | Fair protocol: one exclusive batch hold that child processes inherit, resumable per (kind, world, i). Each process logs its CPU-idle delta and the `perf-host.mjs` contender list. Flag noisy processes, never drop them. Before each counted process, assert the shared holder directory is empty. | `scripts/cost-fair/{run.sh,c1-ab.mjs,orbit-ab.mjs,analyze.mjs}` | Quiet A/A shows no flags. Opus records a pre-registration addendum saying the counted protocol is unchanged. | 1–2 h |
| I5 | `test:affected`: a `package.json` change selects the full suite only when something other than `scripts.test` changed. | `tests/helpers/test-selection.mjs:53` | Unit test on both diff shapes | 1 h |
| I6 | Machine-wide slot for civ-lab. `perf` and `perf:panel` take the exclusive class; civ-lab `npm test` takes shared tokens. | new `C:/LLM/IWSDK/tools/machine-slot.mjs` (re-exports test-slot), `civilization-lab/package.json` | civ-lab `npm test` is green, and a perf run blocks while Atlas holds the exclusive slot | 30 min |
| I7 | Shard test:full. Split `bodyHeightBound` into 6 body chunks, then colour (696 s) and window (433 s). Route test:full through the tier-runner, longest first. | `tests/terrain-relief-hypsometry.test.mjs:171,189`, `package.json`, tier config | Assert the chunks together cover exactly the same 60 body ids. Measure wall time before and after. | M |
| I8 | GPU lock. FIFO tickets with `fs.watch`. Do the build, preview server start and posesFor before taking the lock. Never hold the CPU slot while waiting for the GPU lock. Add free-port to the capture script. | `tests/helpers/gpu-lock.mjs`, the capture script | One capture's image hash is unchanged | M |
| I9 (later, after decisions) | Test registry into `tests/registry/<lane>.txt`; split `golden.json` into per-section files; changelog fragments; glob-based doc publishing in vite.config. | as Throughput §7 | Registry contents equal the old parsed set, fail closed | M |

**How the I2 slot works:**
- The existing mkdir directory stays the exclusive gate, so old callers still act as exclusive.
- Shared holders write `.atlas-test-slot.shared/<uuid>.json` containing pid and token count.
- A shared caller writes its file, re-checks the exclusive directory, and backs off if one appeared, so writers always get priority. Exclusive callers wait until shared holders drain. Dead local pids are reaped; foreign owners are never broken.
- Capacity is C = 28 tokens. Each run passes an explicit `--test-concurrency=k`:
  - k = 4–8 for pkg and affected;
  - k = 16 for npm test, smoke, work and gate test:full.
- Exclusive class: perf, cost-fair, desktop-perf.
- The never-nest rule stays, through `ATLAS_TEST_SLOT_TOKEN`.
- At most 3 heavy shared holders until RSS has been measured.

**Deferred on purpose:**
- golden with `--disable-gpu` off the GPU lock;
- the iGPU second lane;
- A/A caching;
- F1/F2 shortenings;
- pinning cost runs to one CCD.

**Small samples while developing (Kasper's wish), without loosening any gate:**
- Writers use the tier-runner `test:smoke` / `test:work` and element tests with small seed sets.
- Add T8 `scripts/cost-fair/eyeball.mjs` as a small-sample cost check during development. It is uncitable.
- The full 60-body nets, the fair protocol and the golden run happen only at the merge gate.

### Lanes (about 9 agents; GPU width 1, timing width 1, one merger)

| Lane | Items | Resources | Agent mix | Can start now |
|---|---|---|---|---|
| **L0 Gate / merger (terrain first)** | Tiers merge → GATE-2 → GATE-3/4 (GATE-7 dropped 2026-10-07, review O8: test:full runs the whole registry on tier `all` with bail; procedure in `docs/gate-procedure-2026-10-07.md`). Then a quiet window: GATE-1 (fair protocol), GATE-6 (perf), GATE-5 (massif Luna sheet). Then cleanup, junction first: `cmd /c rmdir` before removing any worktree. | Merge lock, exclusive slot, GPU queue | 1 Opus coordinator | **Y**, once tiers merges |
| **L1 Test infra** (sole owner of test-slot, test-runner, test-selection and cost-fair harness) | I2 → I3 → I4 → I5 → I6 → I7 → I8; then tiers T2, T8–T11 | Sandbox slot dir; live slot only for I3 and the I7 measurement | Opus writes; Astra reviews a frozen sha | **Y** in sandbox. Merges after tiers. |
| **L2 Terrain** (one identity-changing branch per round) | Gully filter steps 1–2: a new, unwired `src/mountain-gully-filter.ts` with H1–H4 registered first and a **fresh seed pool** (not 731001–008). F-carving (a) parameter sweep in the existing harness. Landing-stall worker design. | Only the new files. `terrain.ts` group and version strings are read-only until GATE-1 passes and Kasper answers. | Opus; Astra adversarial review | **Y**, element tests only |
| **L3 Fauna** | WebKit midline-eye fix → #17 COAT-CRISP → #18 DEER-PARITY | Single writer on `fauna-composer*`; GPU only through tickets; golden is a node-run compare only | Astra implements pure modules; Opus runs checks and commits | **Y** |
| **L4 Atlas work that moves no digests** | #7 TRANSITION-AUDIT (read-only), #22 STAR-LUMINOSITY-DESIGN, #16 PLACE-QUERY-2 plus platform docs | No locks (`place-query.ts` only) | Astra for the audit; Sonnet for docs | **Y** |
| **L5 civ-lab** | Determinism hygiene (`planet.mjs:572`, lint for `**`, remove the fixed.mjs exemption) → M5 round 1 → perf and calibration later | Own repo. Ensembles and perf pause during L0 quiet windows; enforced once I6 lands. | Astra workspace-write; Opus runs checks and commits; Astra reviews | **Y** |
| **L6 Docs / owner** | One-page owner sheet (about 30 questions); M0-v3 evidence commit so m0c can be deleted; decision ledger and evidence index; `tests/visual-controls` manifest design | Merge lock only for the evidence commit | Sonnet | **Y** |
| **L7 Remote research** | Structural terrain metrics (geomorphons, slope–area, directional spectrum); DEM comparison design without downloads | none | Cloud Sonnet | **Y** |

**Two checks before L3/L5 start Astra workspace-write work in an Atlas worktree:**
- Verify that Astra cannot write through the `node_modules` junction into main's `node_modules`.
- Confirm `-m gpt-6-astra` is passed, because the codex config defaults to Luna.

## Merge protocol
1. **Branches never edit merger-owned files.** These are:
   - `TERRAIN_VERSION`, the other `*_VERSION` strings and `BUILD_VERSION`;
   - `golden.json`, `known-failures.json`, `tier-sets.json`, `tiers.json` and `smoke.json` membership;
   - `SHIPPED_CEILINGS`;
   - the README changelog;
   - test registration in `package.json` (until I9).

   A branch that needs one of these writes `needs: <item>, reason` in its hand-off header instead.
2. **On branches, golden is a read-only compare:** `tests/golden/node-run.mjs`, about 7 s, no GPU.
3. **Astra reviews a frozen snapshot** (`base..sha`, from git archive), so the writer keeps working during the review.
4. **Merge queue.**
   - Build candidate `mergeq/<n>` in `universe-atlas-wt/_mergeq` without the lock, recording the base sha.
   - Run the merge tier there: test:full under the shared class, test:perf exclusive, golden through the GPU queue.
   - Take `.main-merge-lock` only for `git merge --ff-only`, and only if main still equals the base.
   - If main moved, re-merge and re-gate. The tree that lands is always the tree that passed.
5. **Two or three batch windows a day.** If a batch fails, drop tasks to find the cause.
6. **Round-close commit series:**
   - at most one terrain bump;
   - tier-sets refresh;
   - version-compat;
   - one cross-engine golden re-pin;
   - registry, README and known-failures updates.
7. **Retire worktrees right after their merge.** Run `cmd /c rmdir <wt>\node_modules` first and never use `--force` with a live junction. Keep `m0c` until the M0-v3 evidence is on main; keep `r2-relief-present` and `W2-C-FOREST-C2-held`.

## Must stay serial
- **WebGL browser jobs: width 1.** The RTX 5090 rebooted with TDR and DPC-watchdog crashes when 3 or more ran at once, and a crash kills every agent.
- **Timing runs: one at a time, on a quiet machine.** This covers the fair protocol, test:perf and civ-lab perf. Their verdicts are timing ratios.
- **GATE-1 before any further terrain-identity merge.** A later terrain change voids it.
- **One identity-changing terrain branch per round.** A bump moves 79 tests, 6 cache keys, tier-sets and 5 golden sections. Value-preserving work is unlimited.
- **One writer per round on the hotspots:** the `terrain.ts` group, `planet-renderer.ts`, `main.ts`, `fauna-composer*`, and the test-infra files.
- **Fast-forwards of main and golden re-pins:** one merger.

## Kasper decisions needed
1. **Keep or revert T6 (aa3a2c7) if GATE-1 fails.** Lethuris orbit has the least headroom: CI upper bound 4.98% against a 5% budget.
2. **Mountains scope:**
   - A3: should the massif colour and class cells block?
   - Reopen M0, which would mean lod-ladder-4?
   - Raiva R1: accept 7.72 < 8, or require an M2/M3 change?
   - Crest-wander, the 48 km cap, and parallel ranges across wide belts.

   These gate wiring the L2 terrain work.
3. **F4:** move the 78–105 s inline-prefilter test to fullOnly. This changes plain `npm test`.
4. **F1/F2:** a new signed pre-registration if he wants a shorter fair protocol.
5. **A13 (licence) and A14 (GitHub migration).** These unblock cloud code lanes and the creature-kit split.
6. **Optional:** trial an iGPU second browser lane; moving the test registry out of `package.json` (this can go to Opus, recorded as "Opus-decided on Kasper's instruction").
7. **Owner-only items** from the A1–A18 sheet that L6 batches: A4, A5 and A8 gate the visual lanes; A15–A17 gate BIOME2.

## First 3 steps to start today
1. **Launch the lanes that use no locks, now and in parallel:**
   - L5 civ-lab determinism hygiene (Astra with `-m gpt-6-astra`);
   - L6 owner sheet and M0-v3 evidence (Sonnet);
   - L4 TRANSITION-AUDIT (Astra, read-only);
   - L2 gully-filter H1–H4 pre-registration with a fresh seed pool (Opus);
   - L1 I2 slot work in a sandbox `ATLAS_TEST_SLOT_DIR` (Opus).

   Also apply I0 (docs plus rerere).
2. **Coordinator merges the tiers branch** once its verification finishes. The slot holder is now pid 48828 `test:default` (seen 23:04Z, alive), so that run is live, not stale. Then run GATE-7 → GATE-2 → GATE-3/4 on main. (Superseded 2026-10-07 by O8: GATE-7 is dropped; the gate order is GATE-2 → GATE-3 → GATE-4, see `docs/gate-procedure-2026-10-07.md`.)
3. **Tonight's quiet window, terrain first.** Pause all local writer runs and civ-lab ensembles; reviews, research and docs keep going. Run GATE-1 (about 67 min) → GATE-6 → GATE-5. If I4's single batch hold is not merged by then, it can wait, because nothing else contends for the slot in the window. Record the GATE-1 verdict before any terrain branch is wired or bumped.

# Part 2: critic corrections (binding)

- **The plan's "today" state is out of date.** The tiers MVP has already landed on main as 27ce1bf ("Merge tests/tiered-mvp…", smoke 94.7 s), and `universe-atlas-wt/tiers` no longer exists. `.atlas-test-slot` and `.gpu-browser-lock` are both free right now, so the pid 48352/48828 discussion no longer applies. `tests/helpers/test-slot.mjs` was not changed by that merge (last touched 6c7b0f88): no ticket queue, no batch token. On main, `test:pkg`, `test:affected` and `test:fast` now always take the exclusive slot (`test-runner.mjs:13`, `slot = true`).
  - **Fix:** drop step 2 "merge tiers". The warning in M1a is already in force, so promote I2 (shared/exclusive slot) to the first L1 item, ahead of I0's docs work. Start GATE-7 → GATE-2 → GATE-3/4 now while the slot is free.

- **Old copies of `test-slot.mjs` can get around I2's shared drain.** `scripts/cost-fair/run.sh:9` uses `SLOT=$(pwd)/tests/helpers/test-slot.mjs`, which is the copy in whatever checkout it runs from. The handoff §10 resume commands and the 7 live worktrees (asm1, baked, m0b, m0c, r2-relief-present, t6, t6-refmain) all have the old version. That version only does `mkdir` and never waits for shared holders, so a fair run started from t6 would overlap shared runs without anyone noticing.
  - **Fix:** run GATE-1 only from main's harness, after I2/I4 land or with the flag off.
  - Make the assert "shared holder dir empty before each counted process" part of the fair-protocol procedure, not optional.
  - Don't set `ATLAS_SLOT_SHARED=1` until every live worktree is either retired or rebased onto main.

- **GATE-1's CAND is "main", but main keeps moving.** L1, L3, L4 and L6 merges will land between GATE-2 and the evening quiet window. Then GATE-1 measures a different tree from the one GATE-2/3/4 passed, and its own instructions say to re-run it after any change that affects terrain or the harness.
  - **Fix:** pin CAND to one recorded sha (the tree that passed GATE-2/3/4) as a `git archive` arm, and record that sha in the pre-registration addendum.
  - Freeze `scripts/cost-fair/*` and `tests/helpers/test-slot.mjs` merges until GATE-1 has finished. I4 changes the harness itself and must not land partway through the gate.

- **The quiet window is a rule that nothing checks.**
  - Astra in workspace-write runs `codex exec` (L5 civ-lab, L3 fauna), and codex decides on its own to run `npm test`/`tsc`. "Pause writers" does not stop an autonomous codex session already running.
  - Other IWSDK projects (deadtown, heroquest, Character Studio) and GPU generators (ComfyUI, Pixal3D/TRELLIS, Blender) don't take the Atlas slot. Pixal3D VRAM exhaustion is a recorded cause of TDR reboots.
  - **Fix:** before the window, stop (do not just pause) all codex exec runs. Make the start of each counted process check the `perf-host.mjs` contender list and record any contender (I4 already logs this, so make it a hard pre-check for the window). The owner sheet should tell Kasper not to start GPU or asset jobs during the window.

- **The GPU lane is shared with all of IWSDK, and nothing sets priority in the queue.** `.gpu-browser-lock` is machine-wide (memory: every IWSDK agent takes it). The plan's GPU users:
  - GATE-3 golden and GATE-5 Luna;
  - L3 WebKit/COAT-CRISP captures;
  - L4 #7 TRANSITION-AUDIT's "one GPU before-render batch";
  - visual-controls control renders;
  - civ-lab Luna SVG review.

  None of these is ordered.
  - **Fix:** set an explicit order: gates (GATE-3, GATE-5) first, then L3, then the rest. Until I8's FIFO exists, lanes do their GPU work only between merge windows.

- **No global lock order, so I8 opens a deadlock risk.** GATE-5 capture today holds the slot and then waits for the GPU lock. `run-cross-engine.mjs:215` takes the GPU lock per engine. I8 changes some callers to "GPU without slot". If any caller ends up holding the GPU lock and then waits for the slot, it deadlocks against a slot→GPU caller. The 38-min nested-slot deadlock already happened once.
  - **Fix:** write a rule into `docs/test-policy.md`: lock order is merge → slot → GPU, never GPU → slot, and never take any lock while waiting for the GPU. Add an assert: `gpu-lock.mjs` throws if `ATLAS_TEST_SLOT_TOKEN` is in the environment and the caller is a capture path.

- **Removing the t6 worktree would destroy GATE-5's tooling and the fair evidence.** `git status --ignored` in `universe-atlas-wt/t6` shows `test-results/mountains/t6-wiring/**` as ignored (`!!`), including `fair/c1.jsonl`, the Astra logs and the capture scripts (`capture-sheet.browser.mjs`, `luna-capture.sh`). `git worktree remove` deletes ignored files without warning. `baked`'s `t6-margin` evidence has the same problem.
  - **Fix:** before the CLEANUP step, copy the capture scripts into a tracked path on main (e.g. `scripts/luna-capture/`), and archive or hash the ignored evidence into a dated `docs/` evidence commit (same pattern as M0-v3). Do it under the merge lock and before GATE-5 depends on those files.

- **Some junction traps are missing from the plan.**
  - (a) The new `_mergeq` worktree, the git-archive CAND/REF arms and any frozen-review snapshot that gets a junction all need the `cmd /c rmdir` rule. List them in the cleanup checklist.
  - (b) Astra workspace-write in an Atlas worktree could run `npm install`/`npm ci` and write through the junction into main's `node_modules`. Add "no npm install/ci/update" to the brief, not just the write check.
  - (c) Vite writes into `node_modules` (`node_modules/.vite-temp/` exists on main; `vite.config.ts` has no `cacheDir`), so builds and previews in several worktrees share one cache through the junction. Set `cacheDir` per worktree (e.g. `.vite-cache` under the worktree root) before builds run in parallel. Mid-run corruption of that shared cache is plausible but unverified.
  - (d) Avoid `git clean -x` in worktrees. Whether Git for Windows follows junctions there is unverified.

- **package.json and test registration ownership contradict each other.** I7 (shard bodyHeightBound, route test:full through tier-runner) edits `package.json` and adds test files, but the merge protocol makes `package.json` registration merger-owned until I9. L1 also owns `test-selection.mjs` (I5, I9) and `tiers.json` membership, which the protocol also lists as merger-owned.
  - **Fix:** say explicitly that L1 hands package.json, `tiers.json` and `tier-sets.json` edits to the merger as `needs:` lines. Or name L1 the single test-infra owner for those files this round, with the merger's agreement. Pick one.
  - Note: a new unregistered test file is still picked up by `test:affected` (`selectTests` adds changed `*.test.mjs` files to the candidates), so branch fail-fast still works before registration. No fix needed there.

- **I5 is under-specified.** It needs a semantic diff of `package.json`, not a check of whether the file changed. If `scripts.test` changes only by appended paths, the full suite should be selected only if an entry was *removed* or the wrapper command changed. Otherwise a broken runner prefix (for example `--test-concurrency` added for I2) would escape the full run.
  - **Fix:** give I5 the test: "scripts.test token set ⊇ base and prefix identical → no full run. Anything else → full."

- **I3's evidence is too thin, and its cost is understated.**
  - One run is not proof that the default suite is load-insensitive.
  - The default suite does not cover `fullOnly` truth tests or tier shards, but I2 lets test:full run as shared.
  - "About 5 min" ignores that I3 needs the live exclusive slot for both arms.
  - **Fix:** use N ≥ 3 loaded runs. Run the I3 check on the test:full shards (I7) too before test:full may run shared. Book it as about 15–20 min of exclusive slot inside a merge window.

- **I6 has a home and dependency problem.** `C:/LLM/IWSDK/tools/` is tracked in the outer IWSDK repo (allowlisted at `.gitignore:22`), but "re-exports test-slot" would make civ-lab import from `universe-atlas/tests/helpers`. That breaks civ-lab's self-containment (separate repo, zero deps) and ties it to Atlas branch state.
  - **Fix:** make `tools/machine-slot.mjs` the canonical implementation, committed in the IWSDK repo. Have Atlas `test-slot.mjs` re-export it, not the other way round. Also commit the 6 untracked IWSDK-root docs from gitStatus (L6) in the same pass.

- **Several backlog items have no lane.** Assign or explicitly park each:
  - **Terrain lane:** BIOME2 chain #9/#13/#14/#15/#19. #9 is CPU-only but edits `surface-climate.ts`, which is inside the terrain group, so it conflicts with L2. Name it "next round's terrain-identity branch, after GATE-1 and A16/A17", or park it.
  - **Terrain lane, after GATE-1:** MTN-FOLLOW landing main-thread stall and the perf/quality findings (V8 codegen, Maithea cold coarse-field build, CARVING_BANDS dead metadata, mean-height step).
  - **L3 or L4, still unowned:** round-2 leftovers (1-ULP centipede flip, canopy rebuild on sea-level step, climate-grid cold build). Climate-grid needs the quiet window to claim.
  - **L1:** the `terrain-budget-starvation` critical-path investigation; F5b; F6b/c/d.
  - **Owner-gated, park with a reason:** #11, #12, #20, #23, #24, #25; CREATURE-SPLIT phases 2–3; TIME-GROUND/DEEP; MIGRATION.
  - **L5:** civ-lab perf misses, the four-seed Kremer skip, and calibration bands. The research-attribution fix goes to the L6 Sonnet.
  - **Needs authorisation, or say it is blocked:** the civ-lab Node 22 vs 24 digest check (needs a Node 22 install).
  - **Not planned anywhere:** the CIV-ATLAS-ADAPTER prerequisite (#16 in L4) is never sequenced against L5 M5. Put L4 #16 before any adapter work.

- **civ-lab hygiene needs a fail-fast check.** Replacing `2**(count-1)` at `planet.mjs:572` and removing the fixed.mjs lint exemption must leave all digests and signatures byte-identical.
  - **Fix:** the check is "civ-lab signature/digest outputs equal before and after, run at concurrency 1". It must not overlap an Atlas exclusive window.

- **Two contradictions between L2 and L3 and the merge protocol.**
  - L2 "F-carving (a) parameter sweep in the existing harness": the existing M3 harness lives in `mountain-carving.ts` plus the pin digests. Keep the sweep in an untracked or new script that reads M3 without editing `mountain-carving.ts`, or it becomes a second terrain-identity branch.
  - L3 "WebKit midline-eye fix" cannot be verified on a branch: the mismatch only shows in WebKit cross-engine, and the protocol limits branches to `node-run.mjs`. Allow one GPU-queued cross-engine compare (without `--update`) on the branch, or accept that the verdict arrives only at merge.

- **Claims the plan states without evidence.**
  - "golden … GPU lock plus test slot": `run-cross-engine.mjs` takes only the GPU lock (line 215), and `test:golden` is not wrapped in the slot.
  - "At most 3 heavy shared holders": RSS has not been measured.
  - "Astra reviews unbounded": the rate limit has not been measured.
  - I8's "one capture's image hash is unchanged": render settle is timing-dependent, so a byte-identical hash may be flaky.
  - **Fix:** correct the golden resource row. Mark the other three as unmeasured caps. Use a perceptual-diff tolerance or a pose/digest check for the I8 capture instead of a raw image hash.

- **rerere (I0):** enable `rerere.enabled` only, with `rerere.autoUpdate` off. On the single-line `package.json` `test` script, a recorded resolution that gets reapplied can silently drop newly appended paths. Have the merger check the `registeredTests()` count after every rerere-assisted merge.