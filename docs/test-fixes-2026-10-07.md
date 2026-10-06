# Test fixes, 2026-10-07

Branch `fixes/test-problems` (worktree `C:/LLM/IWSDK/universe-atlas-wt/fixes`), based on
main 9438a74. This branch has not been merged or pushed. The evidence logs are in
`test-results/test-fixes/`, which git ignores.

Sources: the four problems listed in `docs/mountains-handoff-2026-10-06.md`,
`docs/handoff-2026-10-06/astra-problems/` and `docs/mountains-opus-decisions-2026-10-05.md`
(addendum 6). No pin, budget, tolerance or Luna scoring rule was loosened.

| # | Problem | Result | Commit |
|---|---|---|---|
| 1 | Canopy 2 ms slice test and eco-class timing guard were load-flaky | Fixed: injected clock; timing caps moved to the perf tier unchanged | b6879ff |
| 2 | U2 UP_ROOM pin and the upper-bound todo in lod-coarse-frame | Already done at T6 (8bed2e3); verified, no change | none |
| 3 | Golden and Luna runners failed on a busy port | Fixed for the golden and render-probe runners; a drop-in replacement is documented for the Luna script | 9e186c4 |
| 4 | known-failures.json could wave a CONTRACT failure through | Fixed: class and decision rules, fail closed, with tests | d0fdf4a |

## 1. Canopy and eco-class timing

**Problem.** In `tests/planet-canopy.test.mjs`, the test "a census arrival replaces a
cached miss..." depended on the production 2 ms work slice and wall time. Under load
it failed. The eco-class timing guard (`<= 100 ns`) also failed once in `test:full`.

**Cause.** At T6, `sliceMs` was turned into a hook, but every other time read in
`PlanetCanopy` still called `performance.now()` directly. That covers:

- the 10 s worker watchdogs;
- the 1 to 2 s retry back-offs;
- the progress stamps.

The tests therefore built their stale timestamps from the real clock (`performance.now()-10001`), and
one assertion was `performance.now()-progressAt<1000`. A slow or preempted run moved
those across thresholds. The eco-class guard measures ns per call in the registered
suite, while about 30 other files run concurrently.

**Fix.**
- `src/planet-canopy.ts` gets `clock:()=>number=()=>performance.now()`. All 26 time reads go
  through `this.clock()`, and production behaviour is unchanged.
- The canopy tests inject a manual clock (`host.clock=()=>clock.t`) and advance it
  explicitly. `sliceMs` stays at the production value of 2; the earlier test-only
  `sliceMs=Infinity` override is gone. The deadline test now advances the clock by
  0.01 ms per read, so it checks the slice logic and not the speed of the machine.
- The eco-class timing tests moved unchanged to `tests/perf/eco-class.perf.test.mjs`:
  the 100 ns guard, plus the 25 ns acceptance test gated on `ECO_PERF_STRICT`. That file
  is run by `test:perf`, which waits for a quiet CPU and runs one file at a time. The
  registered `tests/eco-class.test.mjs` keeps a deterministic no-allocation check:
  heap growth under 4 MiB over 5 x 400000 calls, with the same warmup, gc and 5-run
  window as before.
- `docs/test-policy.md` gets rows for both in its "Timing audit" table.

**Evidence.**
- Under a preload that makes each `performance.now()` read return 20 s later:
  - main fails 13 of 37 canopy tests (`canopy-slowclock-main.tap`);
  - this branch passes 37 of 37 (`canopy-slowclock-fix.tap`).
- On a normal run, canopy and eco-class pass 78 of 78 in 0.99 s (`item1-normal.tap`).
- The eco perf guard measured 21.9 ns per call, under the 100 ns guard
  (`eco-perf.tap`). The strict 25 ns test is still open until it is measured on a quiet host.

## 2. U2 UP_ROOM pin

**Result: already done at T6 (8bed2e3). No code change, no TERRAIN_VERSION or golden change, and
no Opus decision was needed.**

`tests/lod-coarse-frame.test.mjs` on this base passes 12 of 12 with 0 todo, in 12.9 s
(`frame-before.tap`). The tests that cover what the task asked for:

- `HARD: (U2) peak-correction excess: child stored - parent stored <= UP_ROOM at every
  corrected pair`. The pins come from the T6 wired tree for all 4 worlds and every
  corrected pair (37 pins).
- `HARD: FRAME upper side at peak-corrected child levels`, which uses the §5 tolerance.
- `HARD: (U1) carving frame exact`. The child point sample is never higher than the parent's stored value plus 0.05 m.
  The measured maximum is 0.000 m, and a negative control is included.

I recomputed every UP_ROOM pin by the contract method (the measured maximum plus 25 %,
rounded up to 50 m), using today's measured maxima. All 37 results equal the pinned values. Examples:

| Pair | Max child - parent (m) | UP_ROOM pin (m) |
|---|---|---|
| Maithea L1->2 | 3893.9 | 4900 |
| Maithea L5->6 | 85.2 | 150 |
| Selawyn L1->2 | 2720.6 | 3450 |

The lower side (ROOM) at each world's switch level:

| World | Switch pair | Max parent - child (m) | ROOM (m) |
|---|---|---|---|
| Maithea | L5->6 | 1221.7 | 1550 |
| Selawyn | L6->7 | 1583.8 | 2000 |
| Raiva | L4->5 | 633.6 | 800 |
| Lethuris | L6->7 | 1877.3 | 2350 |

## 3. Busy preview port (golden and Luna)

**Problem.**
- The golden `--update` job reported "golden harness server did not come up at
  http://127.0.0.1:5293/golden.html within 20000ms". It got there only after it had
  already rewritten `golden.json` from Node.
- The Luna capture failed with "Error: Port 5294 is already in use".

**Cause.** Both used fixed ports (5192/5293; 5299/5294) with `vite preview --strictPort`.
When another service held the port, the preview child exited at once. The runner did not
notice and kept polling until the timeout. The golden runner also ran its Node compute
and writes before it checked the server.

**Fix.** The new `tests/helpers/free-port.mjs`:

- **No `--port`:** the OS assigns an ephemeral port (listen on 0). If that port is
  taken between the check and the bind, the helper retries, up to 5 attempts.
- **Explicit `--port`:** it is checked before any work, and a busy explicit port fails at
  once with a clear message. The helper never quietly switches to a port the caller did not ask for.
- **Child exit:** if the server child exits (for example, losing the bind under strict
  port binding), the helper sees the exit at once and does not wait for the poll timeout.
- **Ownership check:** an answer from a server this runner did not start is never
  accepted. For the golden runner, the served `golden.html` must equal the bytes of the
  build. For dist previews, the served `build-info.json` `builtAt` must equal the dist's.

Wiring:

- `tests/golden/run-cross-engine.mjs` checks the port, builds, starts the preview, and only
  then computes in Node and writes for `--update`/`--write-node`. It stops the server in a
  `finally`. The vite child is spawned directly, with no shell and no taskkill.
  `--no-build` keeps its old behaviour (an external server, default 5192).
- `scripts/render-probe.browser.mjs` uses `startDistPreview`. Its default changed from
  5207 to an ephemeral port.
- Tests in `tests/gpu-lock.test.mjs`, which is already registered. They run in about 0.9 s
  and use no timing thresholds:
  - an ephemeral port can be bound, a held port is reported busy, and `--port` is parsed;
  - a busy explicit port fails fast and starts no child;
  - a child that exits is detected and the helper retries on a new port (2 attempts);
  - a foreign answer is rejected on the first poll, and an explicit port fails without
    switching.

**Evidence.**
- gpu-lock tests: 7 of 7 pass.
- Golden runner with `--update --port 5293` while another server holds 5293: it exits 1
  after 414 ms, before computing anything. `golden.json` is byte-identical and no
  `dist/` is created (`golden-busy-port.log`).
- Full golden cross-engine run while another service holds 5192, under the test slot (each engine took
  the machine GPU lock itself):
  - the preview came up on ephemeral port 54796 at attempt 1;
  - Node, chromium and firefox all MATCH;
  - webkit is MATCH-EXCEPT-KNOWN (`faunaKnownUnstable`, the existing open finding);
  - the gate result is "PASS WITH KNOWN MISMATCH" in 42.8 s (`golden-ephemeral.log`);
  - afterwards, no `vite preview` process was left running.

**Luna capture script: not edited.**
`universe-atlas-wt/t6/test-results/mountains/t6-wiring/capture-sheet.browser.mjs` is
untracked evidence in another worktree, so I left it alone. Drop-in replacement for its
preview block:

```js
import {startDistPreview, parsePortOption, stopServer} from '<repo>/tests/helpers/free-port.mjs';
const server = await startDistPreview({root: ROOT, dist, port: parsePortOption(args.port)});
const base = server.base; process.on('exit', () => stopServer(server.child));
```

`startDistPreview` keeps the script's existing ownership rule (`builtAt`). Do not pass a
fixed port; leave the default (ephemeral). Separately, the first `build t6 exit=127` in
`luna-capture.sh` was a command-not-found from the shell. It is not a port problem and
is not addressed here. Luna scoring was not touched.

## 4. known-failures.json hardening

**Problem.** `classify()` matched a failure to an allowlist entry by `title` and `file`
only. So an entry for a `CONTRACT:` test (a pinned target that only the owner may change)
looked exactly like an entry for a flaky test, and `test:full` would report the run as
accepted.

**Fix** (`tests/helpers/known-failures.mjs`, called from `test-runner.mjs full`):

- **Required fields:** every `failures` entry needs `title`, `file`, `reason`, `owner`
  and `class`, where `class` is `HARD` or `CONTRACT`.
  - VISUAL-ADVISORY never fails a test, so it never needs an entry.
  - `file` must be a non-perf `tests/**/*.test.mjs` file, so timing failures are never
    allowlisted.
- **Title prefix:** if a title starts with `HARD:` or `CONTRACT:`, the entry's `class`
  must match it.
- **CONTRACT decision record:** a `CONTRACT` entry must have a `decision` field. It must
  point to a `docs/*.md` file (an `#anchor` is allowed) that exists under `docs/` and
  contains the test title word for word.
- **Duplicates:** duplicate entries make the file invalid.
- **Fail closed:** `test:full` validates the file before running anything. If it is
  invalid, the run exits 1 without taking the test slot.
- **Second check in `classify`:** a failure whose title starts with `CONTRACT` is matched
  only by a `CONTRACT` entry that has a decision, even if validation were bypassed.
- The rules are documented in `docs/test-policy.md`.

**Evidence.**
- The current `tests/known-failures.json` (whose `failures` list is empty) validates with
  no problems.
- `tests/test-runner.test.mjs` passes 5 of 5:
  - valid entries pass;
  - 16 negative controls are rejected: no class, unknown class, no reason, no owner, a
    perf file, a non-test file, the title's class and the entry's class disagreeing
    (both ways), CONTRACT without a decision or with an empty one, a decision outside
    `docs/`, a decision path that escapes `docs/`, a missing record, a record that does
    not name the title, a non-object entry, and a duplicate;
  - a bare entry with just title and file does not match a CONTRACT failure;
  - an end-to-end run of `test-runner.mjs full` on an invalid allowlist exits 1 with a
    "Rejected" message, never creates the slot directory, and writes no report.
- `npx tsc --noEmit` passes.

## What remains

- These gates were **not run** on this branch: `npm run test:full` (about 28 min) and
  `npm run test:perf`, including `ECO_PERF_STRICT=1` on a quiet host. The coordinator's
  final gate should run them.
- `package.json` and `tests/helpers/tier.mjs` were deliberately left alone, because another
  agent owns them. No new test file needed registering: the new tests went into
  `gpu-lock.test.mjs`, `test-runner.test.mjs`, `eco-class.test.mjs` and
  `planet-canopy.test.mjs`, which are all already registered. The new perf file is found
  automatically by `test:perf`.
- **Possible merge conflict:** the tiers worktree also edits `tests/helpers/test-runner.mjs`, in
  its smoke/tier modes. This branch changes the `classify` import and the start of
  `full()`. The two sets of hunks are separate, but whoever merges second should
  re-run `tests/test-runner.test.mjs`.
- To apply the port fix to the Luna capture script, use the drop-in replacement in item 3.
- Golden: webkit `faunaKnownUnstable` is still an open known mismatch. That is unchanged
  and was not caused by this work.
