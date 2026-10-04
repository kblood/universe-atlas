# Test policy

Run commands from the repository root, Node 24. No dependency installation is
needed. Do not run full suites during implementation or repeat a reported check
without a new change, failure, or stated reason to distrust it.

| Tier | Commands and responsibility |
| --- | --- |
| Working | Minimal pinned test: `npm run test:pkg -- tests/<area>.test.mjs`. Then `npm run test:affected -- --base main` (inspect first with `--dry-run`). `npx tsc --noEmit` once per batch. No full suite, digest or browser ladder. |
| Hand-off | `npx tsc --noEmit`; `npm run test:affected -- --base main` for all direct/transitive importers; `npm run test:life-guard -- --base main` and the relevant area contract/digest if touched; one relevant AFTER capture set. |
| Merge | Coordinator alone: `npm run test:full`, `npm run test:perf`, relevant digests, `npm run test:golden`, `npm run test:browser` and the applicable VR/browser gates, one at a time. Rewrite known failures after reviewing the merged result. |

## Result classes (owner decision 2026-10-04)

Every check reports into exactly one class. A report names the class next to
each result.

| Class | What | Effect on merge | Who may change it |
| --- | --- | --- | --- |
| HARD | Deterministic tests, `npx tsc --noEmit`, digests, goldens | NEW failure blocks the merge | Implementer fixes the cause; only the merger rewrites `known-failures.json` / repins goldens, with the reason |
| CONTRACT | Pinned numeric targets: LOD / lod-consistency thresholds, acceptance budgets, site rules | Blocks the merge | Only the owner changes a pin. A task that cannot meet a pin stops and files an owner decision; it never edits the pin |
| VISUAL-ADVISORY | Luna (gpt-6-luna) appearance verdicts | **Never blocks a gate by itself** | Recorded and routed; not a test failure |

VISUAL-ADVISORY rules:

- **Vote, never a single ask.** `node scripts/luna-vote.mjs` asks each image
  N >= 3 times and reports `PASS` / `FAIL` / `UNSTABLE` with the counts
  (`pass/fail/unclear of N`). PASS or FAIL needs a strict majority of the
  answered asks; anything else is UNSTABLE. Exit 0 for every advisory result.
  Exit 2 means Luna was unavailable (fewer than 3 answered asks): write
  "visual check NOT done", never a verdict. `scripts/luna-eyes.mjs` stays the
  single-ask primitive underneath and is unchanged.
- **Diagnosis on every FAIL/UNSTABLE.** After the vote, `luna-vote` asks once
  more per non-passing image (`--diagnose-asks N` for more): the single most
  important reason, the ELEMENT it belongs to (from `--elements` or the
  manifest; default silhouette/slope/ridge, snow line, haze/clouds, camera
  pose, texture/colour, seabed detail, shoreline), the expected look, the
  confidence (low/medium/high), and what was ambiguous if the image should
  pass. The `--json` output keeps every answer (`reason`, `element`,
  `expected`, `confidence`, `ambiguity`) and an aggregate: most common
  element, per-element counts and flags (element disagreement, no single
  most common element, question possibly ambiguous, unparsed answer). The
  coordinator routes a failure to the owner task of its most common element;
  ambiguity or disagreement flags mean "reword the question" before anyone
  touches code.
- **Calibrate the judge.** A question may be cited as a failure only when it
  is CALIBRATED: run it against positive and negative control images first.
  `node scripts/luna-vote.mjs --controls tests/visual-controls/<feature>.json
  --json <result.json>` reports per question:
  `CALIBRATED` (every good control PASS, every bad control FAIL),
  `UNCALIBRATED` (a known-good control was not passed, or the manifest lacks a
  good or a bad control: its FAILs **cannot be cited**), or `INSENSITIVE` (a
  known-bad control was not failed: its PASSes cannot be cited). Failed
  controls are diagnosed too, so a judge that is right for the wrong element
  shows up (`elementMatch` when a bad control names its `element`). Then
  `luna-vote --calibration <result.json> --question <id> ...` stamps each
  result with `calibration` and `citable`. Without it the result is
  `NOT-CHECKED` and not citable.
- **Manifest format** (`tests/visual-controls/<feature>.json`, image paths
  relative to the manifest; only generated review renders, never private
  assets):

  ```json
  {
    "id": "relief-snow",
    "elements": ["silhouette/slope/ridge", "snow line", "haze/clouds", "camera pose"],
    "asks": 3,
    "questions": [{"id": "q-snowline", "prompt": "Do the high peaks carry a snow line?"}],
    "controls": [
      {"image": "relief-snow/good-alps.png", "expect": "PASS"},
      {"image": "relief-snow/bad-bare.png", "expect": "FAIL", "element": "snow line"}
    ]
  }
  ```

- The vote logic is pinned by `tests/luna-vote.test.mjs` with a fake judge;
  no registered test calls Luna.

## Element-first rule

Every visual feature is split into named ELEMENTS (for relief: silhouette/
slope/ridge, snow line, haze/clouds, camera pose, texture/colour; for ocean:
seabed detail, shoreline, ...) before it is assembled.

1. Each element gets a **deterministic metric test** (HARD or CONTRACT class)
   on its own pure module or data: slope histogram, snow altitude, haze
   density at a distance, camera pose numbers.
2. Each element gets a **single-element render check**: a render or lab view
   that isolates that element; Luna questions, if any, are per element and
   calibrated.
3. Only after all elements pass on their own is **one assembled sheet** made.
   At most ONE assembled Luna sheet per hand-off, voted once (N >= 3 asks).
   A failing assembled sheet is diagnosed and routed back to the element it
   names; it does not trigger more assembled sheets.

Agents do not stack tests: do not re-run a reported check without a change,
and do not add assembled visual checks to compensate for a missing element
test.

`npm run test:smoke` is an optional broad, fast check; it does not replace the
affected selection or the merge gate. `npm run test:smoke:generate` regenerates
`tests/smoke.json` from the supplied baseline. Its per-file seconds are sums of
observed test durations under parallel load, not isolated file wall times.
Unknown/unmapped titles, digests, perf files and files at or above 2 seconds
are excluded; the fastest up to 101 are retained. Actual smoke wall time is
printed on every run, including failures.

Measured on this machine for this change: 97 files, 613 passing tests,
5.595 seconds around `npm run test:smoke` (5.303 seconds inside the runner).
Evidence: `test-results/test-infra/smoke.log`.

## Slot and exit codes

The machine-wide slot defaults to `C:/LLM/IWSDK/.atlas-test-slot`.
`ATLAS_TEST_SLOT_DIR` overrides it for sandbox experiments; separate overrides
do **not** coordinate with other worktrees. This task uses the workspace-local
`test-results/test-infra/slot`, since the default is outside its writable root.

`npm test` has a wrapper **prefix**, followed by the existing `node --test` and
its explicit ordered file list. New tests are still registered by appending
paths to that list. All selectors/runners parse test-path tokens out of that
script, tolerating wrappers; there is no second full-suite registry. A prefix
holds the slot until the child closes and releases it in `finally` even on
failure. Unlike `posttest`, cleanup does not depend on success. The wrapper
preserves the child's numeric exit code; signals map to 130/143.

`npm run test:pkg -- <files...>` uses no slot for at most 40 files, unless they
are the entire registered list. Affected and smoke runs above 40 files take it.
Full and perf runs always take it. Manual command:

```powershell
node tests/helpers/test-slot.mjs --timeout-ms 120000 -- node --test tests/address.test.mjs
```

Atomic mkdir records name, PID, host, acquisition time and a unique token in
owner.txt; its mtime is heartbeated. Release verifies ownership. A live,
foreign-host, unreadable or unverifiable owner is never broken, regardless of
age. A verifiably dead local PID permits logged rename-then-remove takeover.
Concurrent reapers serialize inside the dead directory. If a reaper itself
dies mid-takeover, stop and inspect its guard rather than guessing ownership.

Perf holds the same slot through CPU quietness and `node --test
--test-concurrency=1 tests/perf/*.perf.test.mjs` (the runner expands the files).
It polls Windows Win32_Processor LoadPercentage through PowerShell and requires
three samples below 25%. If CIM is denied, it explicitly reports that and uses
one-second `node:os` CPU-time deltas instead. Missing measurements never count
as quiet. `ATLAS_TEST_CPU_MAX` and `ATLAS_TEST_CPU_WAIT_MS` configure the threshold
and maximum wait (defaults 25%, 180000 ms). Timeout fails without running perf.
Existing `FAUNA_PERF_STRICT`, `SEASON_PERF_STRICT` and `OCEAN_PERF_STRICT` budgets
are preserved, with their original relaxed defaults. Example strict run:

```powershell
$env:FAUNA_PERF_STRICT='1'; $env:SEASON_PERF_STRICT='1'; $env:OCEAN_PERF_STRICT='1'
npm run test:perf
```

## Selection and life guard

The selector unions `git diff --name-only <base>...HEAD`, staged, unstaged and
untracked paths. Base defaults to main, with `merge-base HEAD origin/main` as
fallback if main is unavailable; explicit invalid refs fail. It scans static
imports/re-exports, side-effect imports, literal dynamic imports, literal
`new URL(..., import.meta.url)` and literal repo/relative source paths, including
LIFE_FILES and Vite `/src/...` reads. Relative .ts/.mjs/.js and index resolution
are supported. Every selected test prints its dependency chain or path reason.
Changed/new test files are selected even before registration and flagged
UNREGISTERED. Perf files stay out of normal selections.

Package.json or tsconfig changes select the whole registered suite. Paths with
no registered consumer (including unimported helpers and Vite configuration)
are reported for manual review. This conservative static scan can over-select;
computed imports or constructed paths require manual review. Directory source
audits select for all changed paths beneath that directory.

`npm run test:life-guard -- --base main` uses `git diff --quiet main --
<LIFE_FILES>` and an untracked check. Untouched means no life CPU digest is
needed (exit 0). Touched means exit 1 with the paths and the exact digest
command. `npm run test:life-guard -- --base main --run` runs that digest under
the slot. LIFE_FILES is dependency-free and re-exported by life-scenario.mjs.

## Known failures

`npm test` always returns raw Node status. `npm run test:full` streams spec output
and uses a built-in-only custom reporter to collect failing title + file pairs
(no line numbers), excluding TODOs and aggregate parent failures. It prints the
raw Node exit code, every matched KNOWN failure, every NEW failure, and known
entries that did not fail (stale entries). Exit 0 means zero NEW failures and
a valid completed report, **not** that raw Node was green. Reporter/launch errors
fail closed. A same-title failure in a different file is NEW.

The initial normal allowlist contains only the two baseline SURFACE_VERSION
pins, owned by `relief-round P2 follow-up / merger`. The two old fauna timing
failures are recorded separately under `perf` and are never allowed by the
normal runner. Perf returns raw status. The Spearman TODO remains OPEN, not
passed. The merger reviews each new failure, fixes causes, removes stale entries,
and rewrites `tests/known-failures.json` with title, file, reason, owner and
classification. Implementers do not bless new failures to make a run green.

## Browser/GPU queue

Use `tests/helpers/gpu-lock.mjs`: one browser machine-wide, shared by all
worktrees. The coordinator captures one shared BEFORE set per round at a pinned
main commit. Use `--only` for affected specimens/views, keep each hold below
30 seconds, release between batches, and queue captures without overlapping
workflows. One AFTER set at hand-off; golden/browser gates only at merge.
This infrastructure task does not launch browsers or touch the shared GPU lock.
Capture command example (capture script acquires the GPU lock):
`node tests/fauna-face-closeups.browser.mjs --label after --only <specimen-name>`.

## Timing audit

Locations below refer to the input baseline d403279 so moved lines stay
traceable. Every assertion remains either in its original file or in perf.

| Baseline file:line | Decision | Reason |
| --- | --- | --- |
| tests/fauna-appearance-v2.test.mjs:172–188 | Move to perf/fauna-appearance-v2.perf.test.mjs | 512-genome burst wall-clock cap; thresholds unchanged. |
| tests/fauna-appearance-v2.test.mjs:264–301 | Split | Coat CPU and longest-step caps move; 96-body channel error, feature checks, yields, triangles and grid stay registered. |
| tests/season.test.mjs:424–466 | Split | seasonBasis/seasonAt timing caps move; retained-heap assertion and workload stay registered. |
| tests/ocean-volume.test.mjs:154–169 | Move to perf/ocean-volume.perf.test.mjs | Hypsometry build and lookup wall-clock caps. |
| tests/place-query.test.mjs:169–180 | Move to perf/place-query.perf.test.mjs | placeAt microsecond budget. |
| tests/fauna-body-plan.test.mjs:31,113–117 | Split | Build duration is diagnostic only; longest-step cap moves, deterministic geometry and yield assertions stay. |
| tests/fauna-corpus.test.mjs:32 | Keep | Build milliseconds appear only in the report; geometry/count budgets are deterministic. |
| tests/fauna-coat-fields.test.mjs:368–378 | Move to perf/fauna-coat-fields.perf.test.mjs | process.hrtime.bigint median sample budget; the eye mutation run exposed a load failure. |
| tests/shadow-map-cache.test.mjs:96–104 | Split | <2 ms signature cap moves; cache-hit assertion stays. |
| tests/surface.test.mjs:108–122 | Split | <3000 ms job cap moves; craters and elevation equivalence stay. |
| tests/planet-canopy.test.mjs:188,438,502–535 | Keep with fixed clock for recency | Injected stale timestamps and refreshed progress timestamp; mock performance.now for the <1000 ms assertion so it verifies the protocol without a wall-clock gate. |
| tests/gpu-lock.test.mjs:25 | Keep | Clock sets a stale-owner fixture; no CPU performance assertion. |
| tests/helpers/test-slot.mjs and tests/test-slot.test.mjs | Keep lock protocol timing | Wait/timeout/heartbeat establish mutual exclusion, not application speed. |
| tests/planet-canopy.test.mjs:150 | Keep | Injected clock crosses a deterministic work-slice deadline. |
| tests/forest-retention.test.mjs:215 | Keep | Worker message has injected selectionMs/packMs, no speed assertion. |
| tests/render-profile.test.mjs:35–103 | Keep | Synthetic timings, history counts, aggregation and nonnegative diagnostics. |
| tests/sky-atmosphere.test.mjs:69,99 | Keep | Build-time diagnostics are finite/nonnegative; no upper bound. |
| tests/river-water.test.mjs:79 | Keep | Injected clock checks deterministic capture cadence. |
| tests/river-environment.test.mjs:10 | Keep | Excludes updateMs from deterministic comparisons; count/memory budgets stay. |
| tests/planet-rocks-draw.test.mjs:498–502 | Keep | Configured target and diagnostic sample counts, no elapsed-time cap. |

The season heap gate retains its 256 KiB cap and 100000 measured calls. It drains
prior test reporting before the first GC, and removes the GC observer and await
from the measured interval, so asynchronous reporter allocations are not charged
to retained season state (a 266024-byte failure exposed this contamination).

Audit method: scan every registered test for performance.now, Date.now, hrtime,
PERF_STRICT, elapsed-time comparisons and millisecond/microsecond budgets.
Deterministic work counters, injected frame deltas and diagnostic measurements
stay in normal tests. Browser-only timing suites are outside the registered list.
