# Shared/exclusive test slot, lock order, test:affected package.json diff, step RSS (2026-10-07)

Lane L1 (test infra), branch `infra/shared-slot` from main 2250d1e. Items from
`docs/parallel-development-plan-2026-10-07.md`: I2 (shared/exclusive slot), the
lock-order correction from part 2, I5 (semantic `package.json` diff) and the I3
RSS column. **The flag is OFF by default. Do not turn it on until the I3 proof
below has passed.**

## Hand-off header

- Verdict: implemented and unit-tested in sandbox dirs; flag off by default.
- Checks run: `node --test tests/test-slot.test.mjs tests/gpu-lock.test.mjs tests/test-selection.test.mjs tests/test-runner.test.mjs tests/tier.test.mjs`
  = 37 tests, 37 pass, 0 fail, about 3.3 s wall. `npx tsc --noEmit` = exit 0.
  `tests/test-slot.test.mjs` alone was run 6 times in a row, 12/12 each time.
- Mutation check: with the capacity test in `acquireShared` removed, the two
  capacity tests fail (2 of 12), so they have teeth.
- NOT run: `npm test`, `test:full`, `test:perf`, smoke/work tiers, browsers,
  golden, and anything that touches the live slot `C:/LLM/IWSDK/.atlas-test-slot`
  or the GPU lock. Every slot and GPU test uses a sandbox `ATLAS_TEST_SLOT_DIR`,
  an explicit `dir` or `ATLAS_GPU_LOCK_DIR`. The I3 load proof has not been run.
- needs: see "needs: lines for the merger" below.

## I2: how the shared slot works

Files: `tests/helpers/test-slot.mjs` (protocol), `tests/helpers/test-runner.mjs`
and `tests/helpers/tier-runner.mjs` (run classes).

- **Exclusive gate (unchanged).** `mkdir <slot>` plus `owner.txt` (name, pid,
  host, time, token), the heartbeat and the dead-local-pid takeover are as
  before. Every caller that does not ask for the shared class is exclusive: old
  callers, stale worktree copies, the CLI without `--shared K`, `test:perf`,
  `test:full` and `scripts/cost-fair/run.sh`.
- **Shared holders.** `<slot>.shared/<token>.json` with
  `{name, pid, host, time, token, class: "shared", tokens}`. The file is written
  as `.<token>.tmp` and renamed into place, so readers never see half a file.
- **Admission (shared).** If the exclusive dir exists, wait. Otherwise publish
  the holder file, **then** check the exclusive dir again (back off if one
  appeared: writers get priority), **then** sum the tokens of all live holder
  files including our own. Proceed only if the sum is at most the capacity;
  otherwise delete our file and retry with jitter. Publish-then-look means that
  of any two callers the one that looks last sees the other, so the admitted
  total never exceeds the capacity. The concurrent-caller test checks this
  (12 callers x 10 tokens).
- **Exclusive drain.** An exclusive caller takes the mkdir gate first, which
  stops new shared holders from entering. It then waits until no live holder
  file is left. On timeout it gives the gate back. With no holders this is one
  empty `readdir`, so the flag-off behaviour is unchanged.
- **Liveness.** A holder file whose host is this machine and whose pid is
  verifiably dead is reaped (logged `REAPED`). Holder names are fresh uuids that
  are never reused, so reaping cannot remove a live holder. Foreign-host holders
  are never broken. An unreadable holder file is never broken and counts as the
  whole capacity (fail closed).
- **Capacity:** `SLOT_CAPACITY = 28` tokens (16C/32T, leaving 4 threads for tsc,
  Vite, codex and the coordinator). This is not measured; see I3.
- **Run classes** (`RUN_CLASSES` in test-slot.mjs; `slotClass(name)` returns
  exclusive for all of them while the flag is off):

  | Run | Class with flag on | Tokens = explicit concurrency |
  |---|---|---|
  | `test:pkg` | shared | 4 (`--test-concurrency=4`) |
  | `test:affected` | shared | 8 |
  | `test:fast` | shared | 8 |
  | `test:smoke`, `test:work`, tier `default` | shared | 16 (`--jobs`, default 16; at most 28) |
  | `npm test` (CLI `--shared 16`) | shared | 16, but only after the package.json change below |
  | `test:full` | **exclusive** | node default. It stays exclusive until I3 has also run on the test:full shards (I7), per critic correction. |
  | `test:perf`, cost-fair, desktop-perf | exclusive | as today |

  In shared runs the `node --test` child gets `--test-concurrency=k`, inserted
  after `--test`. A caller that passes a larger value is refused
  (`boundTestConcurrency`).
- **Never nest.** A holder exports its token to its children as
  `ATLAS_TEST_SLOT_TOKEN`. Today the token is injected by `runCommand` and the
  tier-runner's step env (`slotEnv`); the holder process's own env is never
  changed, so two acquisitions in one process never pass through each other.
  With the flag on, a process whose token matches a live holder of the same slot
  dir runs through without a second level (`nested: true`, release is a no-op).
  An exclusive request inside a shared holder is refused (`never nest`): take
  the exclusive slot at the top level. A stale or foreign token is ignored and
  the slot is acquired normally. With the flag off the token is ignored, so a
  nested acquisition waits exactly as before.
- **CLI:** `node tests/helpers/test-slot.mjs [--timeout-ms N] [--shared K] -- cmd ...`.
  `--shared K` is only a shared hold when `ATLAS_SLOT_SHARED=1`. Options are now
  parsed only before `--`, so a child's own `--timeout-ms` is no longer read as
  the slot's.

### What changes with the flag OFF (default)

The slot semantics are the same as today. These small things are new even with
the flag off:

1. An exclusive holder does one `readdir` of `<slot>.shared` before it runs. The
   directory does not exist, so nothing waits.
2. Children of a slot holder get `ATLAS_TEST_SLOT_TOKEN` in their env. Nothing
   reads it unless the flag is on or a caller passes `capture: true`.
3. The lock-order assert (below) throws where a GPU-holding process would
   otherwise wait for the slot.
4. Tier steps get an RSS preload (below).
5. `test:affected` uses the semantic package.json diff (I5).

## Lock order (part 2 correction, binding)

The rule is in `docs/test-policy.md` "Lock order": merge -> slot -> GPU, never
GPU -> slot, and never take a lock while holding or waiting for the GPU lock.

- `gpu-lock.mjs` keeps `{waiting, held}` on a `globalThis` symbol. While held it
  also sets `ATLAS_GPU_LOCK_HELD` (the owner text) so children inherit it.
  Release restores the value the process inherited.
- `acquireTestSlot` calls `assertSlotLockOrder` first and throws `lock order
  violation` while the GPU lock is held (in-process or inherited) or awaited.
  An inherited slot pass-through is allowed, because it never waits.
- `acquireGpuLock({capture: true})` throws while the caller holds the test slot,
  in-process or through `ATLAS_TEST_SLOT_TOKEN`. This is the critic's "capture
  path" assert. It is opt-in, so today's GATE-5 capture (slot -> GPU, which is
  allowed) keeps working. I8 adopters pass it.

## I5: semantic package.json diff for test:affected

`packageJsonChange(baseText, headText)` in `tests/helpers/test-selection.mjs`.
The affected runner compares the **merge base** of `--base` and HEAD (the same
side `changedFiles` diffs against) with the working-tree `package.json`.

- **No forced full run** only when all of these hold:
  - nothing but `scripts.test` changed (key order and formatting are ignored);
  - its test-path token set is a superset of the base set;
  - the text around the paths is identical: the prefix before the first path,
    and anything between or after the paths.

  The newly registered paths are then selected ("newly registered in
  package.json scripts.test") and package.json is not listed for manual review.
- **Full suite** for anything else: another key, a removed path, a changed
  prefix (for example adding `--shared 16` / `--test-concurrency=16`), a flag
  inserted between paths, a suffix, no paths, or unparsable or missing JSON on
  either side.
- `selectTests(..., {pkg})` without a verdict keeps the old fail-closed
  behaviour (a package.json change selects the full suite). A tsconfig change
  still forces the full suite.
- Unit tests cover both shapes (`tests/test-selection.test.mjs`, "I5: ...").
  Checked against the real 211-path script: append gives no full run with the
  path added; a changed prefix gives full; removing one path gives full.

## I3 column: peak RSS per tier step

Each step process is started with a preloaded `data:` module that writes
`process.resourceUsage().maxRSS` (KiB) at exit to `files/<n>-<attempt>.rss`.
That value goes into `steps.jsonl` as `maxRSS` (null when the step was killed).
`summary.json` gets `peakStepRSSMiB`, and the console shows MiB per step. Tested
with a 96 MiB allocation, and with a killed step that records null.

## How to turn it on

Set `ATLAS_SLOT_SHARED=1` in the environment of **every** Atlas test runner on
the machine: agents, the coordinator and Kasper's shells. A mix is safe in one
direction only: a flag-off process is always exclusive and (with this code)
drains shared holders. **A stale `test-slot.mjs` (any checkout before this
branch) does not drain.** Before the flag goes on, all of these must hold:

1. This branch is merged and every live worktree (asm1, baked, m0b, m0c,
   r2-relief-present, t6, t6-refmain and any newer one) is retired or rebased
   onto it. `scripts/cost-fair/run.sh` uses the `test-slot.mjs` of the checkout
   it runs from, so GATE-1 runs only from main's harness.
2. The I3 load-insensitivity proof below has passed.
3. GATE-1 is not running: the plan freezes `tests/helpers/test-slot.mjs` merges
   until GATE-1 has finished.
4. The fair protocol (I4) checks that `<slot>.shared` holds no live holder before
   every counted process. This is a hard pre-check, not an option.

To turn it off, unset the variable or set it to `0`. Holders that are already
admitted finish normally, and the next exclusive caller drains them.

## What I3 must still show before the flag goes on

- **Arms:** the default suite (`npm test` list) alone, then **N >= 3** runs
  under a synthetic 100% load on the other CCD, all on one recorded sha. Zero
  NEW failures across all loaded runs. Any test that fails only under load is a
  hidden timing test and moves to `tests/perf` with its threshold unchanged.
- **test:full:** run the same check on the test:full shards (I7) before
  `RUN_CLASSES.full` changes from exclusive to shared. Until then test:full stays
  exclusive.
- **RSS:** run smoke/work through the tier-runner and read `maxRSS` and
  `peakStepRSSMiB`. Confirm that the worst plausible overlap (one 16-token tier
  run plus 8 + 4 shared tokens) fits in RAM (93.3 GB) with margin before any cap
  is raised. The plan's "at most 3 heavy shared holders" is **not implemented**:
  with C = 28 and k = 16 only one 16-token holder fits anyway. Revisit if C or k
  change after the RSS numbers.
- **Booking:** this takes about 15-20 min of the **live exclusive** slot inside a
  merge window. It is L1's I3 item, not part of this branch.
- **Cross-process stress (recommended):** the in-process race test interleaves
  at await points. One run with about 8 separate processes contending on a
  sandbox dir would confirm the same bound across processes on NTFS. Not run
  here.

## Known limits

- Shared waiters have no queue. A 16-token waiter can be overtaken by a stream
  of small holders. Only exclusive callers have priority. The ticket queue
  (tiers MVP section 6a, T1) is the follow-up if that is seen in practice.
- An exclusive caller waits for foreign-host holders without limit (or until
  its `timeoutMs`). They are never broken.
- Liveness is pid-based, as before: a reused pid makes a dead holder look live
  until that pid exits.

## needs: lines for the merger

- needs: `package.json` `scripts.test` prefix change to
  `node tests/helpers/test-slot.mjs --shared 16 -- node --test --test-concurrency=16 ...`.
  Reason: `npm test` takes 16 shared tokens once the flag is on. It is inert
  while the flag is off (the CLI ignores `--shared`, and the explicit 16 caps
  node's default of 31). Land it only together with turning the flag on, or
  accept the `--test-concurrency=16` change on its own. Under I5 this edit
  correctly selects the full suite.
- needs: `tests/desktop-perf.browser.mjs` (and any other timing harness that
  takes only the GPU lock) to take the **exclusive** test slot before the GPU
  lock (slot -> GPU order). Reason: with shared holders allowed, a timing run
  without the slot would overlap them. These files are outside L1's files this
  round.
- needs: none for `tiers.json`, `tier-sets.json`, golden or known-failures.
