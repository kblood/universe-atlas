# Review: universe-atlas testing (2026-10-07)

Decided by Fable 5.1 on Kasper's instruction (2026-10-07), overrulable. Recorded from the Fable review report. Evidence: one `npm run test:smoke` on main `e0ada88` (GREEN, 237 tests, wall 110.2 s, log `test-results/tiers/fa56dcbc81d3-smoke-2026-10-07T06-23-55-448Z/`), a 3-file ordering probe under the slot, and two subagent reports on the heavy test files and the cost-fair scripts.

## 1. How it works, strengths, weaknesses

**Shape.** One flat registry (`package.json` `scripts.test`, 211 files, 1577 tests) run by plain `node --test` under a machine-wide exclusive mkdir slot. On top: `test:pkg`/`test:affected` (static import-graph selection, semantic package.json diff), `test:fast` (97 files, 5.6 s), the tier runner (`test:smoke`/`test:work`, 27 terrain files in 50 shards, one process per shard, bail on first NEW HARD/CONTRACT, fsynced jsonl, resume, treeKey escalation), `test:full` (adds the 11 `fullOnly` carved-truth tests, known-failures allowlist validated fail-closed), `test:perf` (quiet-CPU gate, serial), golden (node + 3 engines, 37 s), the fair cost protocol (480 processes, pre-registered), Luna votes (advisory). Shared/exclusive slot implemented behind `ATLAS_SLOT_SHARED` (off).

**Strengths.** Result classes and allowlist rules are fail-closed; pins/thresholds are never touched by tiers; the tier runner's bail gives a verdict in 12 s on a broken carving constant; fsynced incremental logs survive kills; the lock-order rule is enforced in code; the fair protocol has real pre-registration discipline; load-sensitive caps already moved to `tests/perf`.

**Weaknesses (measured).**
1. `node --test` sorts files alphabetically (probe: given `zz aa mm` it ran `aa, mm, zz`), so `npm test` starts the heaviest files late with 31 SMT-contended workers: 252 s when the longest file alone is about 107 s. Only a runner that spawns per-file processes (the tier runner) can schedule longest-first.
2. Every correctness run is exclusive: `test:pkg` on one file takes the whole 32-thread machine. Biggest cost to parallel development.
3. Smoke is bound by one test: `terrain-budget-starvation` 108 s, `terrain-leaf-loop-digest` 78 s, everything else done by about 45 s. These are renderer-scheduling scenarios, and `budget-starvation` and `water-refresh` read the real clock through the renderer's 1.5 ms/3 ms `performance.now()` limits (`src/planet-renderer.ts:1425,1455`), so their frame counts are load-dependent (latent flakiness at line 62 of budget-starvation).
4. `test:full` critical path is one serial 60-body loop (`bodyHeightBound`, 990 s) in a file that also starts late. Truth scans repeat each other (floor-window L102 and L120; hypsometry L171 vs floor-window L102; climate-colour L61 vs climate-agreement L89). 46 of the 60 heightBound bodies never carve. The carving LRU (32 blocks) is too small for 20k-direction scans, so nearly every massif sample is a cold ~150 ms block solve.
5. Fair protocol: 55 of 127 min was the precheck waiting on *present* contenders (idle python.exe MCP servers), not CPU-active ones; 480 separate slot acquisitions re-race a 1 s poller; no per-record resume.
6. Luna is uncalibrated (0/18 on refmain controls too): about 9 min of GPU/agent time per gate for an uncitable result.
7. Tier runner starts cold in every worktree: `test-results/` is git-ignored, so `previousSeconds()` is empty on a fresh checkout and there is no longest-first.
8. `test:work` is about smoke (work sample set not generated).
9. Small: spectrum test unregistered; `terrain-water-refresh` builds its own bundle/worker without the shared tile cache and carries pre-P6 literals; `terrain-floor-window` L141 solves carving blocks in plain `npm test`.

## 2. Ranked optimisations

| # | Change | Saving | Risk | Semantics | Effort | Files |
|---|---|---|---|---|---|---|
| O1 | Turn the shared slot on: I3 load proof (default suite alone + N>=3 under synthetic load, one sha), retire/rebase the 7 stale worktrees (archive ignored evidence first, junction rule), `scripts.test` prefix `--shared 16 -- node --test --test-concurrency=16`, `tests/desktop-perf.browser.mjs` takes the exclusive slot before the GPU lock, `ATLAS_SLOT_SHARED=1` in runner envs. RSS precondition met for smoke/work (peak step 968 MiB). | Hours/day of agent idle | Low | None | proof ~20 min; ~1 h chores | `package.json`, `tests/desktop-perf.browser.mjs`, worktrees |
| O2 | `tier all` runner mode: whole registry, longest-first by a committed seed `tests/tier-estimates.json`, optional shards (`all` key in `tiers.json`), bail optional. `test:full` = `tier all` with `ATLAS_TEST_FULL=1`, replacing `failure-reporter.mjs` after one run proves identical NEW/known/stale output. Keep `npm test` as-is. | `npm test`-equivalent 252 -> ~110-130 s; `test:full` -~700 s | Low | None | M (~3 h) | `tier-runner.mjs`, `test-runner.mjs`, `tiers.json`, new `tier-estimates.json`, `package.json`, `docs/test-policy.md` |
| O3 | Chunk serial `test:full` scans with `worker_threads` (pattern of `tests/helpers/lod-coarse-frame.mjs:12`): `bodyHeightBound` 60 bodies -> 6 workers (assert chunk union == the 60 ids); climate-colour/agreement per water world; floor-window and hypsometry per body. Titles unchanged. | critical path 990 -> ~175 s; with O2 `test:full` about 6-8 min | None (keep chunk-cover assertion) | None | M (~4 h) | `terrain-relief-hypsometry`, `terrain-climate-colour`, `acceptance/climate-agreement`, `terrain-floor-window`, new `tests/helpers/body-chunks.mjs` |
| O4 | Move `terrain-budget-starvation`, `terrain-leaf-loop-digest`, `terrain-water-refresh` from smoke to work only. | Smoke 110 -> ~45 s | Low | Tier membership only (decided: yes) | S | `tests/tiers.json`, `docs/test-tiers-2026-10-07.md` |
| O5 | Fair-protocol harness (counted protocol unchanged): `run.sh` takes the exclusive slot once; per-(kind, world, i) resume; `scripts/cost-fair/precheck.mjs` where a contender counts only if >5 % CPU over a 500 ms sample (keep host-idle and shared-holder asserts); point sets cached by REF sha. | ~45-55 min per gate | Low | None (one-line pre-registration addendum) | S-M | `scripts/cost-fair/*`, decisions addendum |
| O6 | Luna at the gate: capture only, no vote, until a question is calibrated on `tests/visual-controls/<feature>.json` with >=2 good and >=2 bad controls. | ~5-6 min per gate | None | None | S | `docs/test-policy.md`, `scripts/luna-capture/luna-capture-massif.sh` |
| O7 | Register the spectrum test with shards `^INFO: real` / `#rest`; smoke 24 tiles/4 seeds, work = default 24 tiles/8 seeds, gate 36 tiles. | keeps it off the `npm test` critical path | None | Yes, decided: default 24 tiles | S | the spectrum test, `package.json`, `tiers.json` |
| O8 | Drop GATE-7 once `test:full` runs through `tier all` with bail. | 4 min per gate | None | None | docs | plan doc, gate procedure |
| O9 | Generate the work sample set (audit §2.1). | Real middle tier | Low | Sample set (decided: counts as owner re-pin) | M | later |
| O10 | Dedup truth scans with a 5 % fresh-recompute subset. | ~10-15 min CPU | Moderate | Yes, deferred until O3 lands | M | later |
| O11 | Profile budget-starvation (byte-identical overhead cuts only); frozen-clock variant later. | 0-40 s | Frozen clock = scenario change | later | M | later |
| O12 | `terrain-water-refresh`: shared tile cache, cached hydrology build, P6 literal repin. | 36 -> ~20 s | Low | None | S | `tests/terrain-water-refresh.test.mjs` |
| O13 | F2 sequential stopping, F1 rounds reallocation | 20-45 min per gate | High if ad hoc | Protocol change: needs Kasper's signed pre-registration | M | drafted only |
| O14 | Ticket-queue FIFO slot; `eyeball.mjs` small-sample cost check | | Low | None | M | later |
| O15 | M3 block / truth-sample disk cache | 15-20 min CPU | Moderate-high | None if subset re-verified | L | later |

Rejected: reordering `package.json` (node sorts); smaller renderer scenarios with new pins at smoke; A/A caching across runs; lowering `--jobs`; moving the `fullOnly` prefilter identity (F4), superseded by O2.

## 3. Decisions

Implement now, four parallel agents on disjoint files, each on its own branch:
- **A, runner:** O2 + O7's `tiers.json`/`package.json` lines + O4. Verify `tier all --only` on 3 files and one full `tier all` gate run compared to the last `test:full` report.
- **B, truth-scan chunking:** O3. Verify per file under `ATLAS_TEST_FULL=1`, before/after wall.
- **C, cost-fair harness:** O5 + pre-registration addendum draft; O13 drafted separately for Kasper's signature, not implemented. Verify with a 2-iteration dry run.
- **D, spectrum + water-refresh + Luna docs:** O7 (file side), O12, O6. Registration lines go to A as `needs:`.

Then serial by the coordinator: merge (A first) -> O1 (I3 proof, worktree retirement, prefix, flag on) -> O8.

Later: O9, O10, O11, O13 (Kasper's signature), O14, O15.

## 4. For Kasper

The test system is sound on evidence, but slow for two mechanical reasons: `node --test` sorts files alphabetically so the heavy terrain files start last, and every test run, even one file, locks the whole 32-thread machine. The plan schedules longest-first through the tier runner, splits the four serial truth scans across worker threads (same tests, titles, pins), moves three renderer simulations from smoke to work, fixes the fair protocol's idle waits, and turns the shared slot on after the load proof: expected smoke 110 -> ~45 s, `npm test` 252 -> ~120 s, `test:full` 30 -> ~7 min, the gate ~2.9 h -> ~1.5 h. Only the shorter fair protocol (sequential stopping / round reallocation) needs Kasper's signature.
