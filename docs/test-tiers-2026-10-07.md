# Test tiers: smoke and work (MVP, 2026-10-07)

Branch `tests/tiered-mvp`. Design: `docs/handoff-2026-10-06/tiered-testing-mvp.md` (section 1, plus the smallest
slice of section 2). Audit: `docs/handoff-2026-10-06/test-time-audit.md`. Policy: `docs/test-policy.md`, section
"Tiers".

**Updates (2026-10-07, review `docs/fable-test-review-2026-10-07.md`).** O4: the three renderer simulations
(`terrain-budget-starvation`, `terrain-leaf-loop-digest`, `terrain-water-refresh`) left smoke and run at the work
tier only; smoke fell from 110.2 s to 64.3 s. O7: `terrain-structural-spectrum` is registered and in smoke and work
(shard `^INFO: real`), with smoke 24 tiles / 4 seeds, work = default 24 tiles / 8 seeds, gate 36 tiles. O2: tier
`all` (`test:all`, `test:full`) runs the whole registry on this runner (`docs/tier-all-2026-10-07.md`). O1: the shared
slot is on, so smoke/work take 16 shared tokens instead of the whole machine (`docs/shared-test-slot-2026-10-07.md`).
Sections 2 and 5 below keep the MVP measurements; the update notes say what changed.

**Rule.** A tier changes the sample COUNT and the sample SET of a tier-aware test. It never changes a pin, a
threshold or a test title. Unset = `default` = today's `npm test`, by construction: every tier-aware literal is the
`default` entry of a `pick({...})`.

## 1. What exists

| Piece | File | What it does |
|---|---|---|
| Tier helper | `tests/helpers/tier.mjs` | `ATLAS_TEST_TIER=smoke\|work\|default\|gate` (`ATLAS_TEST_FULL=1` implies gate). `pick({smoke, work, default, gate})` falls back to the next DEEPER tier given; gate falls back to default. `onlyFrom(t, why)`, `gateOnly(why)` (skip reason `tier <t>+ only (now <tier>): <why>`), `coverage()`, `subset()`, `tierBodies()`, `samples(world, kinds)`, `tierNote()`. |
| Incremental reporter | `tests/helpers/tier-reporter.mjs` | node:test reporter: one fsynced JSON line per finished top-level test in `$ATLAS_TIER_RESULTS`: `{t, file, step, test, class, status, skipReason, coverage, ms, known, attempt, diag[<=3]}`. Class from the title prefix (unprefixed = HARD). `known` uses `classify` from `known-failures.mjs`, so a CONTRACT failure needs a CONTRACT entry with a decision. A killed run keeps every finished line (tested). |
| Tier runner | `tests/helpers/tier-runner.mjs` (mode `tier` of `test-runner.mjs`) | Validates `tests/known-failures.json` first (fail closed, as test:full). Takes the test slot ONCE (smoke/work/default/`all`: 16 shared tokens and `--jobs 16` since O1; `all --full` = test:full: exclusive). Runs every step as its own `node --test --test-isolation=none` child, longest first (estimates: latest local run, else `tests/tier-estimates.json`), up to the job limit at a time. Bail: the first NEW HARD/CONTRACT line kills every child (in `all`, any NEW failure). Writes the run directory (below). Escalation, resume, shards: see section 3. |
| Lists | `tests/tiers.json` | smoke = 27 files in 52 steps (23 terrain/mountain/LOD files incl. `mountain-riser-lod` (riser-lod merge), the spectrum test and the tier tests `tier`, `tier-all`, `tier-sets`); work = smoke + the 3 renderer simulations (O4) + `terrain-morph-continuity` and `shadow-window-edge-fade` (terrain-morph merge, 2026-10-08) + the platform doc tests `platform-getting-started` and `readme-versions` (place-query-2 merge, 2026-10-08) = 34 files in 59 steps (counts recounted from `tests/tiers.json` with `expandSteps`); `all` names only the 14 files that run as shards in tier `all` (47 steps), the rest of the registry runs one process per file. Every file must be registered in `npm test`. |
| Frozen sets | `tests/tier-sets.json`, `scripts/tier-sets/generate.mjs` | Smoke set, 12 entries per water world (axis x2, flank, belt-end x2, face-edge at L(cut-1) and L(cut), switch, rock, coast, ocean, outside). Built from M1 and the level-0 field only. The generator asserts 0 M3 block solves. Records the generator sha256, the input versions and a `history` ledger (date, commit, sha, reason). Version `tier-sets-1`, sha `90bb43c065f3...`. |
| Set test | `tests/tier-sets.test.mjs` (default suite, 0.3 s) | Regenerates in process and deepEquals the file (minus history). On mismatch: "tier sets stale: npm run tier-sets:generate -- --reason <text>". |
| Helper tests | `tests/tier.test.mjs` (default suite, 2.7 s) | Env parse, pick fallback, onlyFrom/gateOnly/tierBodies in fresh processes, reporter kill test, summary rules. |
| npm scripts | `package.json` | `test:smoke` (tier smoke), `test:work` (tier work), `test:fast` (the OLD `test:smoke`, unchanged), `test:fast:generate` (was `test:smoke:generate`), `tier-sets:generate`. |

### Tier-aware test files (default unchanged)

| File | smoke | work | default |
|---|---|---|---|
| `mountain-coarse-field` prefilter identity | every Fibonacci direction the prefilter SKIPS (cheap), the first 8 it CALLS, 1 axis raster, the tier-set directions; all 4 worlds | 64 called, 4 rasters; Maithea + Lethuris | 6,000 Fibonacci + 4 x 41^2 rasters, 4 worlds |
| `lod-coarse-frame` (helper `frameConfig`) | 1 axis site; net K 1 x N 2048, REFINE 8192 | 2 sites; net 4 x 2048, REFINE 8192 | 2 sites; net 4 x 16384, REFINE 1024 |
| `lod-carving-reduction` sampler identity | levels truth, cut-1, cut, rock-1, rock | + L0, L22 | truth + L0..22 |
| `lod-consistency` cross-level contract | pairs L6, L14 (all 12 tiles each) | L6, L10, L14 | L6..L14 (5 pairs) |
| `terrain-structural-spectrum` (O7, INFO measure-only) | 24 real tiles, 4 synthetic seeds, 1 alpine chart | 24 tiles, 8 seeds | 24 tiles, 8 seeds, 2 charts; **gate** (test:full): 36 tiles (+ face-edge, coast) |

The coarse-frame invariant `N x REFINE = 16384 x 1024` (refined sub-interval ~0.5 m) is asserted in the selection
test, so the 10 m step control cannot go blind on the coarse net. Count floors written for 2 sites
(`pairs >= 4 * FRAME_SITES`, `>= 4` massif sibling edges) use the tier's site count. Every per-level digest
(carving-reduction) and every per-pair check (consistency) stays exact on its subset. A subset pass is recorded as
coverage `subset`: "not yet failed", never "certified".

All other files in the smoke list run at default depth (marked "(default depth)" in the run log).

## 2. Measured (this machine, 16 cores / 32 threads, Node 24.7.0)

| Run | Tests | Result | Wall |
|---|---|---|---|
| Baseline: same 25 files, default tier, all concurrent (before any change) | 229 | green (218 pass, 11 skip) | 127.1 s |
| `npm run test:smoke` (final, commit e502590) | 235 | green (224 pass, 11 skip; 68 subset-coverage results) | **94.7 s** (earlier runs 90.7-93.5 s) |
| `npm run test:work` (after the green smoke) | 235 | green | 105.6 s |
| `test:work` without a green smoke for the tree | - | refused, exit 3 | <1 s |
| Fault: `MOUNTAIN_CARVING.K` 33 -> 36, smoke with bail | - | RED, **bailed at 11.8 s** (mountain-carving-pin), all other steps killed | 12.2 s |
| Same fault, `--no-bail` | 235 | RED, 14 NEW failures (incl. all 8 tier-aware carving-reduction digests at smoke levels) | 93.1 s |
| Default tier of the 4 tier-aware files vs baseline | 63 | identical titles, statuses and diagnostics (0 differences) | 84.6 s |

Fault reverted (`git checkout src/mountain-carving.ts`); the commit contains no src change.

**The four tier-aware files, one step at a time (`--jobs 1`, no load; sum of step walls):**

| File | default | smoke |
|---|---|---|
| mountain-coarse-field (5 steps) | 94.6 s | 32.1 s (prefilter 102.7 s loaded -> ~8 s alone) |
| lod-coarse-frame | 15.3 s | 9.5 s |
| lod-consistency (4 steps) | 21.8 s | 16.8 s |
| lod-carving-reduction (5 steps) | 26.5 s | 26.0 s |
| **total** | **158.8 s** | **84.6 s** |

carving-reduction barely moves: the level subset only shortens the 4 sampler-identity tests (~2.4 s each); the
switch and "below the cut" tests, which dominate, run unchanged at every tier.

**What bounds the smoke wall.** Not the tier-aware files. The critical path is three renderer simulations at default
depth: `terrain-budget-starvation` (one stateful test, ~50 s alone, ~90-95 s under the smoke load),
`terrain-leaf-loop-digest` (~30 s alone, ~65-80 s loaded) and `terrain-water-refresh` (~47 s loaded). Each is a
single scenario whose assertions ARE the scenario (settle until quiet for 60 frames, stale peak > 200, a pinned
digest over a fixed pose sequence), so they cannot be subsampled without changing what they check. Lowering the
priority of the other steps (implemented) and halving the job count (`--jobs 16`, tried) did not move them: the
slowdown comes from CPU frequency and SMT sharing under load, not from scheduling.

**Update (O4, 2026-10-07).** The three renderer simulations moved to the work list, unchanged. Smoke then measured
**64.3 s** (GREEN, 249 tests, 50 steps; run `a04ea85bc710-smoke-...08-36-04`), bound by the spectrum shard
`^INFO: real` (~64 s), no longer by the renderer simulations. The simulations still run (and still bound the wall)
at work, at default (`npm test`, `test:all`) and at test:full.

**Fail-fast is where the time goes away.** A broken carving constant is reported in 12 s, instead of at the end
of a full `npm test` or of the ~28 min `test:full`.

## 3. How to use

```sh
npm run test:smoke                       # tier 0, fail-fast, ~65 s since O4; prints the log dir
npm run test:work                        # refused unless a green smoke exists for this exact tree
npm run test:work -- --force             # override (recorded in run.json as forced)
npm run test:smoke -- --resume test-results/tiers/<dir>   # same tree only; reruns the non-green steps
npm run test:smoke -- --no-bail          # run everything, list every failure
npm run test:smoke -- --only tests/lod-coarse-frame.test.mjs   # one file (all its shards)
node tests/helpers/test-runner.mjs tier default --only <file>  # the same list/runner at default depth
npm run tier-sets:generate -- --reason "<why the set moved>"   # only when tier-sets.test.mjs says stale
npm run test:all                         # tier all: the whole npm test registry, one process per file/shard (O2)
npm run test:full                        # tier all --full: the merge gate (exclusive slot, bail on)
```

Run directory `test-results/tiers/<treeKey12>-<tier>-<start>/`:
- `run.json`: runId, tier, treeKey, commit, dirty, node, tier-set version and sha, steps, argv, forced, bail, wall.
- `results.jsonl`: one line per finished test (written as it finishes; survives a kill).
- `steps.jsonl`: one line per finished step (pass, fail, killed; exit; ms; attempt).
- `summary.json`: green, counts, NEW failures with their first diagnostic, known failures, bad steps, missing steps,
  duplicate titles, per-step seconds.
- `files/<n>-<attempt>.spec.txt`: the spec output of each step.

`treeKey` = sha256(HEAD + `git diff HEAD --binary` + every untracked file's hash): any edit, committed or not, is a
new tree, so escalation and resume never certify a tree that was not tested.

Green = 0 NEW HARD/CONTRACT failures, every step exited 0 (or failed only on known failures), no step missing, no
title reported twice.

**Shards** (`tests/tiers.json`: `{file, shards: [regex, ...]}`): one step per anchored title pattern
(`--test-name-pattern`) plus a `#rest` step (`--test-skip-pattern` of the union), so each test runs exactly once;
a duplicate title fails the run. Shards change scheduling only. Do not shard a file whose tests share expensive
in-process state you want to reuse (each shard rebuilds it: coarse-field's per-world shards cost more CPU in total
but cut the wall). Do not shard files with subtests.

**Adding a file to a tier**: register it in `npm test`, add it to `tests/tiers.json`. To make it tier-aware, import
`./helpers/tier.mjs` in the test file itself (the runner detects that import) and move literals into
`pick({smoke: ..., default: <today's literal>})`. Then run `tier default --only <file>` and compare titles,
statuses and diagnostics with a run from before the change.

## 4. Audit items done on this branch (no pin or threshold touched)

- **F8 slot coverage.** `test:pkg`, `test:affected` and `test:fast` now always take the test slot (`runTests`
  defaults to `slot: true`; `test:perf` already holds it and passes `slot: false`, so there is still one level).
- **F6a.** `capture-sheet.browser.mjs` `posesFor` computes only the requested `--views`. Checked with `--dry` on
  the T6 report, Maithea, `--views mountainV3,beach`: picks byte-identical, 173.8 s -> 166.0 s. The saving is small
  because the 40,000-sample scan and the mountainV3 search dominate, and both still run.
- **F3d.** `evidence-run.sh` `step()` uses `local name start code`, so it no longer clobbers the c3 loop's `name`.

## 5. What is left

1. **Renderer simulations at smoke.** budget-starvation, leaf-loop-digest and water-refresh set the smoke wall
   (~90 s). A real cut needs smaller scenarios with their own pins (an owner decision; out of scope for "never change
   a pin"). Until then smoke is ~90 s, not the design's 45 s critical path. **Resolved for smoke by O4** (they run
   at work only; smoke 64.3 s). Smaller scenarios with their own pins remain an owner decision (O11, later).
2. **The working set** (audit section 2.1, about 10-12 tiles per body) is not generated. `samples()` at work falls
   back to the smoke set, and `test:work` is mostly default depth for non-aware files, so work currently adds little
   over smoke. Next: generate `work` in `tier-sets.json` and use it in coarse-frame (net lines through the set's
   belt-edge pairs and face-edge tiles), lod-consistency (one tile per class) and carving-reduction (switch cases).
3. **Design items not done:** coarse-field `statistics()` at a smaller N with p99 as INFO at subset tiers, and
   `measureError` restricted to ramp cells (`{cells}`); both cost < 2 s per world, so they were not worth a
   subset-only assertion change. terrain-mountains-assembly smoke additions (set identity, visit-order digest) and
   `onlyFrom('default')` for its R1 CONTRACT. The cost eyeball and the capture sanity check (design section 1,
   "Cost sanity", "Capture sanity"). `statistic-level.mjs` `fullOnly` still reads `ATLAS_TEST_FULL` directly (same
   behaviour as `gateOnly`, older skip text).
4. **Gate tier.** `gate` exists in the helper (ATLAS_TEST_FULL=1). Since O7 one file has a `gate` value:
   `terrain-structural-spectrum` measures 36 tiles at gate (a superset of the default 24 kinds; INFO, measure-only).
   It equals default everywhere else. The gate procedure relies on this (`docs/gate-procedure-2026-10-07.md`: GATE-7
   dropped because test:full covers plain `npm test`); a `gate` value that narrows a HARD/CONTRACT sample set would
   bring GATE-7 back.
5. **Other audit items** (F1/F2 C1 protocol, F3a ticket queue, F3b/c preflight and lock order, F4/F5 carved-truth
   sharing, F6b-d capture caches, F7) are untouched.
