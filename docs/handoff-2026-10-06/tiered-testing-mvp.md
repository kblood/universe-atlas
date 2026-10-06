# Tiered testing MVP: fail fast on terrain prototypes (design, 2026-10-06)

Owner request (Kasper, 2026-10-06), narrowed by his scope change the same day: **terrain first**. This is a design
only; nothing was run. Inputs: `scratchpad/test-time-audit.md` (the audit, F1-F8, §2), `docs/test-policy.md`,
`tests/helpers/test-slot.mjs`, `tests/helpers/test-runner.mjs`, `scripts/cost-fair/*`, the three named tests and their
helpers on main `9dcb1cf`, `tests/helpers/{statistic-level,mountain-tile-set}.mjs` on `mountains/t6-wiring`
(`42be27e`/`40bddd7`), and decisions addenda (4)-(6). Implement **after T6 merges** (section 7).

| Tier | Purpose | Samples | Bodies | Wall budget | Verdicts it may give |
|---|---|---|---|---|---|
| 0 SMOKE | Every terrain test type runs once, tiny | 10-50 relevance-picked directions/tiles per body (frozen) | all 4 (breadth) | whole run < ~2 min | HARD fail/pass on the subset; CONTRACT **fail only**; cost = disaster eyeball, no verdict |
| 1 WORKING | Depth on a fixed sample | the audit's frozen 10-12 tiles per body (§2.1) | Maithea + Lethuris | minutes per file | same as smoke; cost = direction signal only |
| 2 GATE | Merge evidence | today's full nets, all levels | all 4 (+60-body catalogue) | as today (28.5 min `test:full`, ~67 min fair protocol) | every verdict |

`default` (plain `npm test`, `ATLAS_TEST_TIER` unset) keeps **exactly** today's numbers; it ranks between WORKING and
GATE. The tier changes N and the sample set, never a pin, a threshold or a test title.

## 1. The MVP mechanism

**Env and helper.** `ATLAS_TEST_TIER=smoke|work|default|gate`; `ATLAS_TEST_FULL=1` (set by `test:full`) implies
`gate`. One tiny helper, `tests/helpers/tier.mjs`:

```js
import {readFileSync} from 'node:fs';
const ORDER = ['smoke', 'work', 'default', 'gate'];
const raw = process.env.ATLAS_TEST_FULL === '1' ? 'gate' : process.env.ATLAS_TEST_TIER || 'default';
if (!ORDER.includes(raw)) throw new Error(`ATLAS_TEST_TIER=${raw}: expected ${ORDER.join('|')}`);
export const TIER = raw, atLeast = t => ORDER.indexOf(TIER) >= ORDER.indexOf(t);
/** Per-tier value; a tier that is not given falls back to the next DEEPER one given (never shallower). */
export const pick = v => {for (const t of ORDER.slice(ORDER.indexOf(TIER))) if (t in v) return v[t]; throw new Error('pick: no default');};
export const onlyFrom = (t, why) => atLeast(t) ? {} : {skip: `tier ${t}+ only (now ${TIER}): ${why}`};
export const gateOnly = why => onlyFrom('gate', why);          // statistic-level.mjs fullOnly becomes this alias
const SETS = JSON.parse(readFileSync(new URL('../tier-sets.json', import.meta.url), 'utf8'));
export const TIER_SETS = {version: SETS.version, sha: SETS.sha256};
export const tierBodies = all => pick({smoke: all, work: ['Maithea', 'Lethuris'], default: all});
/** Frozen sample entries for this tier ({kind, d, levels?, tile?}); only called at smoke/work. */
export const samples = (world, kinds) => (TIER === 'smoke' ? SETS.smoke : SETS.work)[world].filter(s => !kinds || kinds.includes(s.kind));
/** Subset results of a maximum/pin: a violation is real, a pass is "not yet failed". Tagged in the log. */
export const coverage = () => atLeast('default') ? 'full' : 'subset';
```

**Commands** (`package.json`, `tests/helpers/test-runner.mjs`). `npm run test:smoke` runs the tier-0 file list from
`tests/tiers.json` (`{smoke: [...], work: [...]}`, hand-edited; the runner rejects a file that is not registered or
does not import `tier.mjs`) with `ATLAS_TEST_TIER=smoke`, then the cost eyeball, then (advisory) the capture sanity.
`npm run test:work` is the same at tier 1. `npm run test:gate` = escalation check + the gate steps (section 3).
**Name collision:** today's `test:smoke` (fastest-101-files subset, `tests/smoke.json`) is renamed `test:fast`
(`test:fast:generate`); `docs/test-policy.md` is updated in the same task.

**Incremental, resumable log.** `tests/helpers/tier-reporter.mjs` (a node:test reporter next to
`failure-reporter.mjs`) appends one JSON line per finished top-level test, `fsync`ed, so a kill loses at most the test
in flight. Directory `test-results/tiers/<treeKey12>-<tier>-<startISO>/`:

- `run.json`: `{runId, tier, treeKey, commit, dirty, node, tierSets: {version, sha}, argv, started}`; `treeKey` =
  sha256 of `HEAD` + `git diff HEAD --binary` + sorted untracked-file hashes (cheap; detects unversioned edits).
- `results.jsonl`: `{t, file, test, class: HARD|CONTRACT|VISUAL-ADVISORY|INFO, status: pass|fail|skip|todo,
  skipReason, coverage: subset|full, ms, known: true|false, diag: [first 3 diagnostics]}`. Class comes from the title
  prefix (`HARD:`/`CONTRACT:`); unprefixed deterministic tests count as HARD, as the policy says.
- `steps.jsonl`: one line per step (a test file finished, one cost process, the capture) `{step, status, exit, ms}`.
- `summary.json`: rewritten at the end and on every resume.

`--resume <dir>` refuses a different `treeKey`, skips steps whose `steps.jsonl` line is green, reruns the rest.
`--bail` (default **on** at smoke/work, off at gate) kills the `node --test` child on the first NEW HARD/CONTRACT
failure; the slot is released in `finally` as today.

**First files with tier support (terrain only).** Today's literals become the `default` entries, so plain
`npm test` is unchanged by construction.

1. `tests/mountain-coarse-field.test.mjs` + `helpers/mountain-coarse-field.mjs` (identity, upper bound/floor, ocean
   flags, field determinism). `directions(body, total, {sites, half})` gains options (defaults = today's 50,000, 4
   rasters, 41²). Prefilter identity: `pick({smoke: 200, work: 1000, default: 6000})` Fibonacci directions + 1 raster
   (smoke 11², work 41²) + the smoke/work set directions. Statistics: `pick({smoke: 256, work: 2000, default: 50000})`.
   **At subset tiers only `max <= 100` is asserted; `p99 <= 50` is logged as INFO** (a subset max is a lower bound of
   the true max, a subset p99 is not a bound of anything). `measureError(body, 8, {cells})`: smoke = ramp cells
   (|u/U| > .9) on the set's belts + every 200th interior cell; work = ramp + every 20th; the bins check is a max, so
   it stays valid on a subset. The zero-margin and no-end-ramp negative controls stay, restricted to ramp cells.
2. `tests/lod-coarse-frame.test.mjs` + helper (frame ROOM, upper sides, edge match, coarse continuity, block-solve
   counters). Worker data becomes `{world, tier}`. `FRAME_SITES = pick({smoke: 1, default: 2})`. Net:
   `pick({smoke: {K: 1, N: 2048}, work: {K: 4, N: 2048}, default: {K: 4, N: 16384}})`, and **`REFINE` scales so
   `N × REFINE` stays 16384 × 1024** (sub-interval ~0.5 m; at N 2048 with REFINE 1024 a 10 m step would sit under
   `SLOPE_BOUND × 36 m` and the step control would go blind). At smoke the net lines are the lines through the set's
   belt-edge pairs and face-edge tiles. Count assertions written for 4 worlds × 2 sites (`pairs >= 4 * FRAME_SITES`,
   `>= 4` massif sibling edges) become `bodies.length * FRAME_SITES` and `pick({smoke: 1, default: 4})`. ROOM pins are
   maxima: unchanged, valid as fail-early on the subset.
3. `tests/terrain-mountains-assembly.test.mjs` (identity digests, ocean digest). The `MAIN_DIGESTS`/ocean digest pins
   are over a fixed 4096-direction set and cannot be subsampled; they run unchanged at every tier (outside-massif, no
   block solves; **estimate** a few s). Added for smoke/work: Object.is identity, wired vs `{mountains: false}`, on the
   set's outside-control and coast directions, plus a visit-order determinism digest of the set (two sampler
   instances, reversed order). The R1 CONTRACT (8 × 513² rasters) gets `onlyFrom('default', 'density is an average')`.
4. `tests/lod-carving-reduction.test.mjs` (switch pair, per-level states, "below the cut no block solve"). Bodies
   `tierBodies`; levels `pick({smoke: [truth, cut-1, cut, rock-1, rock], work: [truth, 0, cut-1, cut, rock-1, rock, 22],
   default: truth + L0..22})`; switch cases: in-face and cross-face from the set.
5. `tests/lod-consistency.test.mjs` (cross-level contract, determinism). Tiles from `FROZEN_STRATIFIED`:
   `pick({smoke: [coast[0], snowline[0]], work: one per class, default: all 12})`; pairs `pick({smoke: [cut-pair, 14],
   work: [cut-pair, 14], default: PAIRS})`. `SHIPPED_CEILINGS` are maxima over 12 tiles: fail-early only at subset tiers.
6. New `tests/tier-sets.test.mjs` (default suite, < 10 s): the frozen sets are what the generator returns (section 2).

Cost sanity eyeball: `scripts/cost-fair/eyeball.mjs`, 3 processes per body, run **after** the tests inside the same
slot (never concurrent with them): C1 A/B with cand first, C1 A/B with ref first (region = the smoke set's axis
raster, 1 site × 65² at 125 m; outside = 2,000 Fibonacci; 1 cold + 2 warm rounds), orbit A/B 2 rounds. ref = cached
`git archive` of `merge-base HEAD main` under `test-results/tiers/ref/<sha>/` (node_modules junction, as `run.sh`
says). Output: medians only, labelled `EYEBALL (no verdict)`. `DISASTER` = C1 weighted > +25% or orbit > +15% (~3× the
budgets) on 2 of 3 processes; it blocks escalation to the gate's fair protocol, it is never MET/NOT MET. **Estimate**
2-3 s per process, ~30 s for 12.

Capture sanity (VISUAL-ADVISORY, never blocks): Maithea, `mountainV3` only, poses from the cached `--dry` path (audit
F6a/b), no Luna at smoke; checks: PNG decodes, not blank, sky and ground both present, mean luminance in range, zero
page errors. If the GPU lock is busy it reports `NOT RUN (gpu busy)` instead of waiting. At work tier one calibrated
Luna vote (N >= 3) may be added; still advisory.

**Smoke wall budget (estimates, measured in the tasks):** node test files in parallel, critical path <= 45 s (one
worker per body in lod-coarse-frame); cost eyeball ~30 s; capture ~30-40 s in parallel with the tests. Total ~80-100
s. The runner prints the wall time and warns (does not fail) above 120 s.

## 2. Frozen sample sets

**Selection reads M1 and the level-0 field only**, never the carved truth (0 block solves, asserted with
`carvingBuildStats`), so a carving bug cannot move the set that is meant to catch it. Per body, smoke (~18 entries,
hard cap 50):

| Kind | n | Rule |
|---|---|---|
| axis | 2 | `FROZEN_MASSIF_TILE_SET[w]` axis[0]; the axis station with the largest M1 belt value (summit candidate) |
| flank / belt-end | 1 / 2 | flank[0]; both belt-end entries (coarse margin tightest at \|u/U\| >= .94) |
| belt-edge pair | 2 | from axis[0], march across the axis to the last in-belt and first out-of-belt direction (step control) |
| face edge | 2 | `crossFaceTile(body, L)` at L = cut-1 and cut (first face/edge/position with >= 3 massif edge nodes) |
| cube corner | 1 | of the 8 cube corners, the L(cut) corner tile with most massif samples (65² net); corner 0 if none |
| switch pair | 2 | L(cut-1) → L(cut): axis[0] in-face, and the cross-face tile above |
| rock pair | 1 | L(rock-1) → L(rock) on axis[0] |
| coast / snowline | 1 / 1 | `FROZEN_STRATIFIED` coast[0]/snowline[0] (Maithea, Lethuris); Selawyn/Raiva: first `fib(i, 4096)` whose level-0 sample is land within 25 m of the datum with an ocean neighbour 2 km east; treeline rule for the no-snow worlds |
| ocean / outside | 1 / 1 | first `fib(i, 4096)` that is level-0 ocean; first outside every belt |

Working set: the audit's §2.1 table (10-12 per body, Maithea + Lethuris), as indices into `FROZEN_MASSIF_TILE_SET`
and `FROZEN_STRATIFIED` plus the new edge/corner/switch entries, never copies of them.

**Frozen and regenerated.** `scripts/tier-sets/generate.mjs` writes `tests/tier-sets.json`: `version`
(`tier-sets-1`), `sha256` of the generator source, the inputs it read (`OROGEN_LAYOUT_VERSION`,
`MASSIF_ENVELOPE_VERSION`, `LOD_LADDER_VERSION`, `TERRAIN_VERSION`, commit), full-precision direction literals,
levels and tile keys, and a `history` ledger. Deterministic: body seeds via `waterWorlds()`, Fibonacci order, no
randomness, no wall clock; two runs are byte-identical. `tests/tier-sets.test.mjs` regenerates in-process and
`deepEqual`s the file. When a recorded version moved, it fails with "tier sets stale: `npm run tier-sets:generate --
--reason <text>`". The **smoke** set may be regenerated by the implementer of that version move (ledger line). The
**working** set is re-picked only with an owner-approved re-pin (audit rule), so a working pass means the same thing
on every commit.

## 3. Gate only, and why

- **Every timing verdict:** C1 and the orbit bake (fair protocol), contract §6 build bench, L0 protocol, field-build
  ms, `test:perf`. Subset timings have no CI; a smoke/work number is never written as MET.
- **Maxima and pins as a pass:** coarse-field p99/max, `FRAME_ROOM_M` and UP_ROOM per pair, `SHIPPED_CEILINGS`,
  the 60-body `bodyHeightBound`, window/hypsometry/coast statistics, R1 density. A subset can fail them, never pass them.
- **Fixed-set digests** that are not cheap (golden cross-engine, Chromium/Firefox/WebKit) and the Luna vote that cites
  a visual verdict.
- **Layout-specific geometry between frozen samples** (a belt crossing a cube corner not in the set), and Raiva/Selawyn
  at working depth.

Gate order, cheapest first, stop at the first NEW failure between steps, each step one `steps.jsonl` line, resumable
per step: `test:full` → contract bench → fair protocol → golden → Luna sheet/vote. The fair protocol gets the audit
F2 sequential rule (looks at n = 10/20/30, α = .0167 per look) **only after a new written pre-registration**; `run.sh`
becomes resumable per process: a completed `(kind, world, i)` record is never re-run, an interrupted one (no record) is
re-run at its position; that sentence goes into the pre-registration. **Escalation:** `test:work` refuses unless the
latest smoke log for the same `treeKey` is green; `test:gate` the same for work (`--force` allowed, logged in
`run.json`). Green = 0 NEW HARD/CONTRACT failures and no cost `DISASTER`; capture `NOT RUN`/advisory never blocks.

## 4. Negative controls for the smoke tier itself

`scripts/tier-faults/run.mjs <fault>`: `git archive HEAD` into `test-results/tier-faults/<fault>/`, apply one anchored
text replacement (anchor must occur exactly once, else abort), run `npm run test:smoke` there, require a non-zero exit
**and** the expected failing test, and the fault's wall time < 120 s. A clean copy must pass (positive control).

| Fault | Injection (anchor in source) | Must be caught by |
|---|---|---|
| Parent too high at switch | switch-level parent sampler (`src/planet-tiles.ts`): +3,000 m in-massif at L(cut-1) (above every switch ROOM, max 2,350 m) | lod-coarse-frame FRAME lower side; lod-carving-reduction switch test |
| 1 m edge shift | tile build: `surfaceHeight` +1 m on edge 0 of every tile at L >= cut-1 | lod-coarse-frame EDGE MATCH on the face-edge set tiles |
| Step at belt edge | coarse composition: +10 m where belt > 0 | lod-coarse-frame COARSE-ONLY continuity on the belt-edge lines |
| Upper bound / floor (added) | `coarseMarginH(uf)` → 0 (the existing mutation hook) | coarse-field upper floor (`violations == 0`) on ramp cells |
| Identity (added) | +1e-6 m outside massifs (one belt-free branch) | assembly identity digests and the set's Object.is identity |

Runs when `tier.mjs`, `tier-sets.json`, a tier-aware file or the fault anchors change, never on every smoke run (~5 ×
2 min). Results go into `tier-sets.json` `controlsVerified: {commit, treeKey, perFault: {caughtBy, wallS}}`. A fault
that becomes uncatchable is a smoke-set defect, fixed by adding a relevance rule, never by loosening a check.

## 5. Classes and known failures

- HARD: exact properties (Object.is identity, determinism, 0 block solves, edge Object.is) pass or fail at every tier;
  a subset pass is logged `coverage: subset`.
- CONTRACT: at smoke/work a violation **blocks escalation** (it is a real violation); a pass is "not yet failed",
  never cited. Pins are changed only by the owner, as today.
- VISUAL-ADVISORY: capture sanity and any Luna vote never block any tier; Luna unavailable = "visual check NOT done".
- `tests/known-failures.json`: smoke/work runners reuse `classify()` (same title + file). Because tiers never change
  titles, a gate known failure matches at smoke too and does not block. **Stale entries are reported only at gate**
  (smoke skips tests). Tier-skipped tests are `skip`, never pass. Only the merger rewrites the file, as today.

## 6. Prerequisites: slot fixes (audit F3)

- **(a) Ticket queue** in `tests/helpers/test-slot.mjs`: waiters write `<slot>.queue/<ms13>-<uuid>.json` (name, pid,
  host, class `short|long`) and try `mkdir` only when theirs is the lowest live ticket; dead local-pid tickets are
  pruned, foreign ones kept (same rules as the owner file); `fs.watch` with the 1 s poll as fallback. **Batch token:**
  the holder exports `ATLAS_TEST_SLOT_TOKEN`; a descendant `test-slot.mjs` whose token equals `owner.txt`'s runs
  through without a second level (never nest), so `run.sh` takes one slot for all its processes. **Yield points:** a
  batch may call `slot.yield()` between iterations; it releases to waiting `short` tickets only, then re-queues at the
  front. A smoke run then waits at most one fair iteration (~2-3 min), not 94 min.
- **(b) Preflight:** `--port <n>` (listen-probe on 127.0.0.1 before taking a ticket and again right after acquiring)
  and `--requires <path>`; fail with exit 75 in seconds. Adopted by `tests/golden/run-cross-engine.mjs` and the
  capture script (port 5293/5294 failures after 1.7 h).
- Also: every CPU-heavy runner mode takes the slot (smoke and work always; `test:pkg` keeps its <= 40-file rule).
  Not prerequisites: GPU lock outside the CPU slot (F3c), `local name` in evidence-run (F3d).

## 7. Tasks (after T6 merges; one agent each; nothing commits outside its own task branch)

| # | Task | Owner files | Verify | Budget |
|---|---|---|---|---|
| 1 | Ticket queue, batch token, yield points | `tests/helpers/test-slot.mjs`, `tests/test-slot.test.mjs` | sandbox `ATLAS_TEST_SLOT_DIR`: 5 waiters served FIFO; dead ticket pruned; token pass-through; release on failure and signal | 2 h; tests < 15 s |
| 2 | Preflight `--port`/`--requires` + adopters | test-slot.mjs, `tests/golden/run-cross-engine.mjs`, capture script | occupied port fails < 2 s without queueing; recheck after acquire | 1 h |
| 3 | `tier.mjs`, `tier-reporter.mjs`, runner modes, `tests/tiers.json`, rename `test:smoke` → `test:fast`, policy text | `tests/helpers/{tier,tier-reporter,test-runner}.mjs`, `package.json`, `docs/test-policy.md`, new `tests/tier.test.mjs` | pure tests: env parse, `pick` fallback, `gateOnly`; reporter: kill mid-run leaves complete lines; `--resume` skips green steps, refuses other treeKey | 2 h; tests < 10 s |
| 4 | Generator + `tests/tier-sets.json` + `tier-sets.test.mjs` | `scripts/tier-sets/generate.mjs`, the two test files, `package.json` registration | two runs byte-identical; 0 block solves; <= 50/body; every kind present per body | 2 h; < 10 s |
| 5 | coarse-field tiers | file 1 + helper | at default: diff shows only literals moved into `pick`; smoke file < 30 s; zero-margin control still caught | 1.5 h |
| 6 | coarse-frame tiers | file 2 + helper | `N × REFINE` invariant asserted; step and 1 m edge controls caught at smoke; smoke < 40 s | 2 h |
| 7 | assembly, carving-reduction, lod-consistency tiers | files 3-5 | default unchanged; smoke each < 20 s | 2 h |
| 8 | Cost eyeball + ref cache | `scripts/cost-fair/eyeball.mjs` (reuses `c1-ab.mjs`/`orbit-ab.mjs` with a rounds argument) | 12 processes < 45 s; a synthetic 2× slowdown in a scratch cand copy shows `DISASTER` | 1.5 h |
| 9 | Fault harness + 5 faults + clean control | `scripts/tier-faults/*`, `tier-sets.json` `controlsVerified` | each fault caught < 120 s by the named test; clean copy green | 2 h; ~12 min run |
| 10 | Gate runner + escalation + resumable `run.sh` + sequential-rule pre-registration draft (owner signs before first counted run) | `test-runner.mjs`, `scripts/cost-fair/{run.sh,analyze.mjs}` (α argument) | dry run with a fake step list: stop at first red, resume skips green; `analyze` reproduces today's QA analysis at α .05, n 30 | 2 h |
| 11 | Capture sanity (advisory) | capture script `--only mountainV3 --sanity`, runner hook | blank-canvas fixture fails the sanity; GPU-busy gives `NOT RUN` without waiting | 1.5 h |

Order: 1, 2 (prerequisites) → 3 → 4 → 5, 6, 7 in parallel (disjoint files; only tasks 3 and 4 touch `package.json`) →
8, 9 → 10 → 11. Each implementer runs only its own file at the tier it touches (`test:pkg`), no full suite.

## 8. NOT in the MVP

- **Add after terrain is settled: the downstream consumers.** Canopy/trees (needs: tree ground height = truth on
  massif tiles + a "trees on the level-0 field" fault), fauna placement (needs: `placeAt` S4 ground = truth on massif
  sites), survey sites and orbit/ocean consumers (needs: the block-solve counters of
  `sparse-consumer-levels.test.mjs` per tier), landing (needs: `EYES` 256 → smoke 64 / work 128 and the level-0
  cutoff check on massif candidates).
- Changing plain `npm test` semantics, including the audit F4 move of the 78-105 s prefilter test (owner decision).
- Splitting/caching `test:full` (F5a/b, M3 block cache), A/A caching (F7), C1 rounds reallocation (F1, needs its own
  pre-registration), Luna refmain image cache (F6c), GPU lock outside the CPU slot (F3c).
- A rotating third working body, cross-engine golden at smoke/work, tiering non-terrain areas (fauna appearance,
  forest, clouds), automatic tier choice from changed files, any CI.
- Any pin, threshold, ROOM/UP_ROOM, budget or version change.
