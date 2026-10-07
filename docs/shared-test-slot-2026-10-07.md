# Shared/exclusive test slot, lock order, test:affected package.json diff, step RSS (2026-10-07)

Lane L1 (test infra), branch `infra/shared-slot` from main 2250d1e. Items from
`docs/parallel-development-plan-2026-10-07.md`: I2 (shared/exclusive slot), the
lock-order correction from part 2, I5 (semantic `package.json` diff) and the I3
RSS column. **Update (O1, branch `tests/shared-slot-on`): the I3 proof passed
and the flag is now ON by default at the runner entry points. See "I3 result and
switch-on" below. `ATLAS_SLOT_SHARED=0` turns it off.**

## Hand-off header

- Verdict: implemented and unit-tested in sandbox dirs; flag off by default.
- Checks run: `node --test tests/test-slot.test.mjs tests/gpu-lock.test.mjs tests/test-selection.test.mjs tests/test-runner.test.mjs tests/tier.test.mjs`
  = 45 tests, 45 pass, 0 fail, about 8.3 s wall (after the review fixes; 37/37
  at 70b68fe). `npx tsc --noEmit` = exit 0. `tests/test-slot.test.mjs` alone was
  run 6 times in a row after the fixes, 19/19 each time.
- Review fixes: see "Review fixes" below. The 8 new tests all failed on 70b68fe.
- Mutation checks: with the capacity test in `acquireShared` removed, the two
  capacity tests fail; with the post-publication exclusive re-check removed,
  the forced-interleaving test (review 10) fails. Both have teeth.
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
  (`boundTestConcurrency`). Node uses the **last** `--test-concurrency`, so that
  is the one checked; an occurrence without a value is refused.
- **Never nest.** A holder exports its token to its children as
  `ATLAS_TEST_SLOT_TOKEN`. Today the token is injected by `runCommand` and the
  tier-runner's step env (`slotEnv`); the holder process's own env is never
  changed, so two acquisitions in one process never pass through each other.
  With the flag on, a process whose token matches a holder of the same slot dir
  **whose pid is alive on this host** runs through without a second level
  (`nested: true`, release is a no-op). A token whose holder is dead, on another
  host, or gone is ignored and the slot is acquired normally (the dead holder
  gets reaped). An exclusive request inside a shared holder is refused (`never
  nest`): take the exclusive slot at the top level. A nested shared request may
  ask for at most the tokens of its shared parent (at most the capacity inside an
  exclusive parent); a larger one is refused. With the flag off the token is ignored, so a
  nested acquisition waits exactly as before.
- **CLI:** `node tests/helpers/test-slot.mjs [--timeout-ms N] [--shared K] -- cmd ...`.
  `--shared K` is only a shared hold when `ATLAS_SLOT_SHARED=1`. Options are now
  parsed only before `--`, so a child's own `--timeout-ms` is no longer read as
  the slot's. An option without its value (`--timeout-ms -- node ...`) fails
  before acquiring, as the old parser's NaN check did; it never becomes an
  infinite wait. With the flag on, `--shared` requires a node command (`node`,
  `node.exe`, or any path whose basename is one of those), whose
  `--test-concurrency` is then bounded; any other command is refused.

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
6. `withTestSlot(options, work)` now calls `work(lock)`; before, it called
   `work()`. A callback that ignores its arguments is unaffected; one that
   inspects `arguments.length` sees 1 instead of 0. No in-repo caller does.
7. CLI: options are read only before `--`, and an option without its value
   fails (see CLI above).

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
  - both sides parse as one `node --test` argument list (`testArgumentList`):
    exactly one `<node> --test`, the `--flags` right after it, then a
    contiguous run of test paths, with **no test path anywhere else** in the
    script (a path behind `&&` or `;` is not run by node --test). Unsupported
    scripts fail closed, even when unchanged;
  - the text before the list (wrapper prefix and flags) and after it is
    identical;
  - the path set of the head side is a superset of the base set.

  The newly registered paths are then selected ("newly registered in
  package.json scripts.test") and package.json is not listed for manual review.
- **Full suite** for anything else: another key, a removed path, a changed
  prefix (for example adding `--shared 16` / `--test-concurrency=16`), a flag
  inserted between paths, a suffix, a path moved out of the list (for example
  `&& echo tests/b.test.mjs`), no paths (also when unchanged, e.g. `vitest`), or
  unparsable or missing JSON on either side.
- `selectTests(..., {pkg})` without a verdict keeps the old fail-closed
  behaviour (a package.json change selects the full suite). A tsconfig change
  still forces the full suite.
- Unit tests cover both shapes (`tests/test-selection.test.mjs`, "I5: ...").
  Checked against the real 211-path script: append gives no full run with the
  path added; a changed prefix gives full; removing one path gives full; moving
  one behind `&&` gives full; the unchanged script parses to the same 211 paths
  as `registeredTests`.

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

## I3 result and switch-on (O1, 2026-10-07)

Implements O1 from `docs/fable-test-review-2026-10-07.md`.

**Proof (arms item above): passed.**

- Sha: one frozen detached checkout of main `225c362`.
- Suite: the registered default suite, 213 files and 1594 tests. Each arm ran
  `node --test --test-concurrency=16` with `failure-reporter.mjs`. Each arm held
  the live slot in exclusive mode, so nothing else was counted alongside it.
- Load: one process pinned to CPUs 16-31 with affinity mask `0xFFFF0000` (the
  mask was checked after it was set) and 16 spinning worker threads. The load
  started inside the slot hold and stopped before the hold was released.
- Busy CCD0/CCD1 is the mean CPU busy share over the run.

| arm | slot taken (UTC) | exit | wall s | pass | fail | skip | todo | busy CCD0 / CCD1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| alone | 08:54:02 | 0 | 239.1 | 1576 | 0 | 16 | 2 | 58.1% / 58.6% |
| load1 | 09:00:55 | 0 | 244.5 | 1576 | 0 | 16 | 2 | 78.7% / 100% |
| load2 | 09:05:02 | 0 | 237.4 | 1576 | 0 | 16 | 2 | 81.1% / 100% |
| load3 | 09:09:02 | 0 | 240.2 | 1576 | 0 | 16 | 2 | 79.7% / 100% |

Zero new failures, so no test moves to `tests/perf`. Under load, wall time
changed by -0.7% to +2.3%.

**What changed (switch-on):**

- `defaultSharedSlotOn()` in `tests/helpers/test-slot.mjs` sets
  `ATLAS_SLOT_SHARED=1` only when it is unset. Both entry points call it:
  - the `test-slot.mjs` CLI, which is the `npm test` prefix;
  - the `test-runner.mjs` main, which covers test:pkg, test:affected and the
    tier runner.

  Every child inherits the flag. An explicit `0` (or an empty value) keeps the
  flag off. Anything else still throws.
- `npm test` now takes `--shared 16`, the same token count as smoke/work.
- `RUN_CLASSES` is unchanged, so timing and gate runs stay **exclusive**:
  - test:full: until the arms above have run on its I7 shards;
  - test:perf;
  - cost-fair;
  - desktop-perf.
- `tests/desktop-perf.browser.mjs` now takes the exclusive slot **before** the
  GPU lock (merge -> slot -> GPU). A GPU-lock failure releases the slot, and the
  run record carries `slot.mode` and `slot.waitedMs`.
- Turn-on condition 1 (retire the stale worktrees): done. asm1, baked, m0b, m0c,
  r2-relief-present, t6 and t6-refmain are removed, along with the `_fair-t6`
  arms. Their branches are kept. Ignored evidence that was not on main went to
  `universe-atlas-wt/_archive/<name>/`, each with an `ARCHIVE-MANIFEST.tsv`.
  - **A checkout from before this branch still does not drain shared holders.**
    Run nothing from an old checkout while shared holders may be live. That
    includes a scratch detached worktree, and every branch cut before `41afb47`.

**Not done (still open):**

- The RSS check under overlap (the RSS item above).
- The cross-process stress run.
- The arms on the test:full shards.

## Known limits

- Shared waiters have no queue. A 16-token waiter can be overtaken by a stream
  of small holders. Only exclusive callers have priority. The ticket queue
  (tiers MVP section 6a, T1) is the follow-up if that is seen in practice.
- An exclusive caller waits for foreign-host holders without limit (or until
  its `timeoutMs`). They are never broken.
- Liveness is pid-based, as before: a reused pid makes a dead holder look live
  until that pid exits.
- **Pending slot wait vs GPU (Astra 3, open, follow-up I8).** The lock-order
  assert runs when `acquireTestSlot` starts. A process that is already waiting
  for the slot and then, from another async path, takes the GPU lock can
  deadlock against a slot holder that waits for the GPU. Slot waiting is not
  published to `gpu-lock.mjs`, so `acquireGpuLock` cannot refuse it. Today no
  runner starts both concurrently in one process; I8 should publish pending slot
  waits and make `acquireGpuLock` refuse while one is outstanding.
- **Nested holders are not tracked.** A pass-through child is protected only
  while its parent holder is alive: if the parent dies while the child keeps
  running, the parent is reaped and the child runs without a slot. The token
  cap is per request: two concurrent nested siblings of a 4-token parent may
  each run 4. Both need a descendant registry (follow-up with the ticket queue).
- The interleaving tests use an in-process hook (`slotTestHooks`, null in
  production). The cross-process stress run in the I3 section is still not
  done, and filesystem-error injection covers only the post-publication throw.

## Review fixes (Astra review of 2250d1e..70b68fe)

Each fix has a test named `review N: ...` (N = Astra's finding number) in
`tests/test-slot.test.mjs` or `tests/test-selection.test.mjs`. All 8 new tests
failed on 70b68fe and pass now.

| Astra | Fix | Test |
|---|---|---|
| 1 | `inheritedSlot` requires the holder pid alive on this host before `nested: true` | review 1 (dead exclusive parent, dead shared parent, foreign-host parent) |
| 2 | nested shared request capped at the tokens of the shared parent | review 2 (8 and 28 refused under 4; 4 passes) |
| 5 | the last `--test-concurrency` is checked; the CLI recognises node.exe and absolute node paths, and refuses other commands under `--shared` | review 5 |
| 4, 8 | structural `node --test` argument-list parse; a path outside it, or an unchanged pathless script, gives full | review 4/8 |
| 9 | a CLI option without its value fails before acquiring | review 9 (flag off and on) |
| 7 | every shared retry, including a failed takeover, checks the deadline and sleeps | review 7 (dead owner dir pinned by a child cwd: EBUSY rename) |
| 6 | publish-to-admission in try/finally; own holder and `.tmp` removed (transient Windows errors retried) on any throw or back-off | review 6 (throw injected after publish) |
| 10 | forced interleaving via `slotTestHooks.beforePublish`: the exclusive caller takes the gate and drains empty between the shared caller's check and its publish | review 10; **mutation**: removing the post-publication `existsSync(dir)` re-check fails it (1 of 19) |
| 11 | `work(lock)` documented in the flag-off list (item 6) | doc only |
| 3 | documented in Known limits (open, I8) | none |

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

## Tickets, pending waits and the descendant registry (T5, 2026-10-07)

Branch `infra/slot-tickets` from main 5450d9d. Task T5 (Fable 5.1 on Kasper's
instruction). It closes the first three "Known limits" above: shared waiters
without a queue, the pending slot wait vs GPU deadlock (Astra 3), and untracked
nested holders. Files: `tests/helpers/test-slot.mjs`, `tests/helpers/gpu-lock.mjs`,
`tests/test-slot.test.mjs`, `tests/gpu-lock.test.mjs`.

### Hand-off header

- Verdict: implemented and tested in sandbox dirs only. Every scenario has a
  negative case. Mutation checks: each of the six mechanisms, disabled one at a
  time, fails at least one test (table below).
- Checks: `npm run test:pkg -- tests/test-slot.test.mjs tests/gpu-lock.test.mjs`
  (shared slot, 4 tokens) = 37 tests, 37 pass, 0 fail, exit 0. Before this
  branch: 29. New: 7 in test-slot.test.mjs, 1 in gpu-lock.test.mjs.
  `npm run test:affected -- --base main`: see the report for the counts.
  `npx tsc --noEmit` = exit 0 (tsconfig covers `src/` only; no lint script).
- NOT run: the **live-slot stress run** (about 8 processes contending on the real
  `C:/LLM/IWSDK/.atlas-test-slot`), `npm test`, `test:full`, browsers and GPU.
  Nothing touched the live slot or the live GPU lock except the runner's own
  shared 4-token hold. The 3-child cross-process smoke ran on a sandbox dir only.
- fs.watch on this volume (NTFS, `C:/LLM/IWSDK`): a probe saw 40 of 40
  create/rename/delete operations, latency at most 1 ms. Watching only speeds up
  wake-ups; the retry timer is still the fallback. `ATLAS_SLOT_WATCH=0` turns
  watching off.
- needs: see "needs: lines (T5)" below.

### Design

**1. Pending waits are published (Astra 3).**

- From the moment `acquireTestSlot` starts waiting until it holds, times out or
  is aborted, the waiter has a ticket file in `<slot>.pending/` and an in-process
  count on `globalThis[Symbol.for('atlas.test-slot.pending')]`, read through
  `pendingSlotWaits()`.
- The ticket is removed on acquire, on timeout, on abort (the new `signal`
  option takes an AbortSignal) and at process exit. The ticket of a killed
  process is reaped as soon as its pid is verifiably dead on this host.
- `acquireGpuLock` calls `assertNoPendingSlotWait` first. While a slot wait is
  pending, it throws:
  `lock order violation: "<owner>" asks for the GPU lock while this process is
  still waiting for the test slot (<slot owner>); release the pending slot wait
  first (await the slot or abort it with its AbortSignal), then take the GPU lock
  inside the slot ...`
- A nested pass-through that has to wait for its siblings counts as a pending
  wait too. It also runs `assertSlotLockOrder` before it waits.
- `withTestSlot` and `withGpuLock` now document the order: slot first, GPU
  inside it.

**2. FIFO tickets for shared waiters.**

- Ticket name: `<µs since epoch, 17 digits>-<per-process seq, 6 digits>-<uuid>.json`.
  Lexical order is arrival order: the µs clock orders processes, the sequence
  orders tickets within one process, and the uuid breaks exact ties.
- The ticket is written as `.<uuid>.tmp` and then renamed. Its mtime is
  refreshed every `heartbeatMs`.
- A shared waiter tries admission only when no live exclusive ticket exists
  (writer priority) and no live shared ticket is earlier than its own. The
  admission itself is unchanged: publish the holder file, then look, then check
  capacity. Tickets only order the waiters; the holder files still bound the
  tokens.
- Tickets that never block:
  - a dead local ticket (it is reaped);
  - an unreadable ticket;
  - a stale ticket (no heartbeat for `ticketStaleMs`, default 120 s; it is
    kept);
  - a ticket from another process that already holds this slot (`holds > 0`).
    That process may be waiting on itself, so other processes do not queue
    behind it.
- Exclusive callers do not wait for the queue. They keep the mkdir gate and the
  drain as before.
- Before it publishes, a waiter checks capacity read-only. A head-of-queue
  waiter whose tokens visibly do not fit does not publish and retract a holder
  file on every retry, so watchers are not woken for nothing.
- Wake-ups: fs.watch on the slot's parent dir, `<slot>.shared` and
  `<slot>.pending`, debounced 10-40 ms, with the jittered `retryMs` timer as the
  fallback. The exclusive dir itself is never watched, because an open handle
  could make an old holder's `rm` fail.

**3. Descendant registry.**

- A pass-through child (flag on, its `ATLAS_TEST_SLOT_TOKEN` names a live holder)
  writes `<slot>.nested/<id>.json`. The fields are listed under "File formats"
  below.
- Its immediate parent is the registry entry named by the new env var
  `ATLAS_TEST_SLOT_NESTED`. If the env lost that variable, it is the entry whose
  pid is `process.ppid`. Otherwise it is the root holder.
- `slotEnv()` hands the variable down at spawn time, and the variable is also
  set in `process.env` while the entry is held, so raw spawns inherit it. A
  grandchild is therefore counted against its own parent and never as a
  sibling of it. Counting it as a sibling would make a child wait for its own
  parent: the nested-slot deadlock.
- Sum cap: the live siblings under one parent together hold at most the parent's
  tokens. The budget is the shared parent's tokens, 28 under an exclusive root,
  or a nested parent's own tokens. Admission is publish-then-sum, as for
  holders. A sibling over the cap waits until its `timeoutMs`. A request larger
  than the parent alone is still refused at once ("never nest").
- In-process, the second acquisition for the same root reuses the process's
  entry (refcounted), so an in-process re-entry can never wait on itself.
- Re-homing: a holder record (shared json or exclusive `owner.txt`) whose pid
  is verifiably dead, or whose holder releases while a registered descendant in
  another process still runs, is rewritten in place. It keeps the same token
  and gets the descendant's pid and
  `rehomed: {from, to, at, why}`. The write is atomic (tmp + rename), and only
  if the record still has the text that was judged.
- Re-homing is done by:
  - any new-code reaper (`sharedHolders`, `inspectExclusive`, the latter under
    its `reaping` mkdir);
  - the holder's own release;
  - each nested child's heartbeat.
- When the descendant that holds the re-homed record releases, it hands the
  record to another live descendant, or removes it if it was the last one. If
  it is killed, the next scan finds no live descendant and reaps the record as
  before.

### File formats (new; old ones unchanged)

| Path | Written by | Content |
|---|---|---|
| `<slot>/owner.txt` | exclusive holder (unchanged) | `{name, pid, host, time, token}`; after a re-home also `rehomed` |
| `<slot>.shared/<token>.json` | shared holder (unchanged) | `{name, pid, host, time, token, class: "shared", tokens}`; after a re-home also `rehomed` |
| `<slot>.pending/<µs17>-<seq6>-<uuid>.json` | every waiter, new code | `{name, pid, host, time, since, ticket, class: "ticket", mode, tokens?, holds}` |
| `<slot>.nested/<id>.json` | pass-through child, new code | `{name, pid, host, time, token: id, root, parent, class: "nested", mode, tokens}` |
| env `ATLAS_TEST_SLOT_NESTED` | nested holder for its children | registry id of the immediate parent |

### Compatibility matrix (old = main before this branch, carving-c1, any older checkout)

| Holder \ caller | Old caller | New caller |
|---|---|---|
| Old exclusive dir | as before | blocks shared and exclusive; reaped only if its pid is dead (pre-token owners have no token, so no re-home) |
| Old shared json | as before | counted with its tokens; never deleted while its pid lives; dead: reaped (no registry entries point at it) |
| New exclusive dir | blocks (mkdir gate unchanged) | as designed |
| New shared json | counted as before | as designed |
| Re-homed record | sees a live pid, so it keeps it and counts it | kept until the last descendant exits |
| New tickets / registry | never read (separate directories) | as designed |

Known gaps in the mixed state (none of them is new harm to an old holder):

- Old callers ignore tickets. An old shared caller can still overtake a queued
  new-code waiter, as before this branch. FIFO holds between new-code callers.
- An old-code reaper does not know the registry. It reaps a dead parent that
  has a live descendant, as it does today, unless a new-code process has
  re-homed the record first. The window is at most one `heartbeatMs` (10 s) of
  the nested child's heartbeat.
- Old code never takes tickets. An old exclusive caller still races new shared
  waiters at the mkdir gate, as before.

### Tests (all sandbox dirs under test-results; each with a negative case)

| Test | Proves | Negative case |
|---|---|---|
| FIFO tickets: 16-token waiter behind 4-token stream | 7 x 4 tokens held; the 16-token waiter gets in after exactly 4 releases; the 4 late callers queue behind it and then enter in arrival order | with `slotTestHooks.ignoreQueue` it is still out after 12 releases, and all 12 late callers overtook it |
| FIFO tickets: concurrent callers never exceed capacity | 12 x 10 tokens with the queue on, peak <= 28 | same with the queue off (keeps the publish-then-look race exercised) |
| pending waits | ticket fields; removed on abort, timeout and acquire; a dead front ticket is reaped; stale and slot-holding tickets do not block and are kept | a fresh live earlier shared ticket, and a fresh live exclusive ticket, keep a shared caller out |
| legacy coexistence | pre-token and token exclusive owners, and an old 20-token shared json, block new callers with the right messages; files are byte-identical afterwards; an old-style reader of `.shared` still sees exactly the holders | when the pid dies, the old shared holder is reaped and the old exclusive owner is taken over |
| descendant registry: re-home | parent killed: holder re-homed to the child (same token, child pid, `rehomed.from`), exclusive caller drains it; parent releases normally: re-homed too; exclusive parent re-homed the same way | the child exits, so the record goes with it; the child is killed, so the record is reaped |
| descendant registry: sum cap | 2 + 2 siblings fit under a 4-token parent; a grandchild is counted against its own parent | a 2-token sibling next to a 4-token one waits and times out; a second grandchild over its parent's 2 times out; a grandchild of 4 under 2 is refused |
| cross-process smoke | children A (16), B (20), C (12) on a sandbox dir. C would fit next to A but stays queued behind B; B gets in after A; C after B | waiter D is killed while queued, and its ticket is reaped instead of blocking B. The sandbox ends empty: non-recursive `rmdir` of the protocol dirs succeeds |
| gpu-lock: lock order (I8) | a pending slot wait refuses the GPU lock, with the fix in the message; the GPU lock dir is never created | after `abort()` the GPU lock is allowed; a wait that resolves into a held slot allows slot -> GPU |

Mutation checks (each mechanism disabled in place, the two files run through
`test:pkg`, then restored with git):

| Mutation | Result |
|---|---|
| M1 FIFO queue check off | exit 1; 34 pass, 3 fail: FIFO starvation, pending waits (earlier ticket must block), cross-process smoke |
| M2 GPU pending-wait refusal off | exit 1; 36 pass, 1 fail: gpu-lock lock order (I8) |
| M3 re-home of a dead shared holder off | exit 1; 36 pass, 1 fail: descendant registry re-home |
| M4 nested sibling sum off | exit 1; 36 pass, 0 fail, 1 cancelled by its 60 s timeout: descendant registry sum cap (the over-cap sibling got in and held) |
| M5 dead-ticket reaping off | exit 1; 35 pass, 2 fail: pending waits (dead ticket reaped), cross-process smoke (killed waiter D) |
| M6 re-home on holder release off | exit 1; 36 pass, 1 fail: descendant registry re-home (parent releases normally) |

The first M3/M4 attempt hung: a failing assertion left a child process waiting
on stdin, so the test file never exited. The new tests now have a 60 s timeout,
every spawned process is killed in `afterEach`, and the FIFO waiters are
aborted in `finally`. A regression now fails within seconds; it no longer hangs
the runner.

### Behaviour changes worth knowing

- **Nested siblings can now wait.** Before, any number of concurrent
  pass-through children ran at once. Now the siblings under one parent share
  its tokens. Under an exclusive root, a nested exclusive request takes all 28,
  so two concurrent nested exclusive children run one after the other. No
  in-repo caller does this today. `cost-fair/run.sh` children run one at a time.
- A child spawned with an env snapshot taken before its parent's nested
  acquisition, and without `slotEnv()`, loses `ATLAS_TEST_SLOT_NESTED`. If its
  real parent is not its direct `ppid`, it is counted as a sibling of its parent
  and can wait on it. The wait log names both entries. Spawn through
  `runCommand`/`slotEnv`.
- Every acquisition, even an immediate one, writes and removes one ticket file.
  That is a few file operations per acquisition.
- `acquireTestSlot` accepts `signal` and `ticketStaleMs`.
- `slotTestHooks.ignoreQueue` is test-only and false in production.

### Still not done

- The live-slot stress run: about 8 processes contending on the real slot,
  booked in a merge window. The sandbox smoke used 3 + 1 processes.
- The RSS check under overlap (I3 RSS item above).
- The I3 arms on the test:full shards (test:full stays exclusive).
- FIFO tickets for the GPU lock itself (plan I8 first clause). The GPU lock still
  polls every 60 s by default. This branch only adds the pending-wait refusal.
- Cross-process pending detection: `acquireGpuLock` sees only this process's
  pending waits. It cannot see an ancestor that waits for the slot while a child
  takes the GPU lock.
- Old-code reapers can still reap a dead parent with live descendants (window
  above) until every checkout has this branch.

### needs: lines (T5)

- needs: `docs/test-policy.md` "Lock order" / "Enforced in code": add that
  `acquireGpuLock` refuses while this process has a pending slot wait
  (`assertNoPendingSlotWait`), and that pass-through children are registered and
  share their parent's tokens. Reason: the policy is binding text outside T5's
  files.
- needs: none for `package.json`, `tests/tiers.json`, golden, known-failures. No
  new test file was added (both files are already registered).
