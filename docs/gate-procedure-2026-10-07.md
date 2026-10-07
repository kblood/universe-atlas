# Merge gate procedure (2026-10-07, review O8)

Standing procedure for the L0 merge gate. Supersedes the gate order in `docs/parallel-development-plan-2026-10-07.md`
(lane L0, "First 3 steps" step 2) and the order recorded in `docs/gate-2026-10-07.md` (that file stays the record of the
2026-10-07 runs). Decided by Fable 5.1 on Kasper's instruction (`docs/fable-test-review-2026-10-07.md`, O8).

## Order

Pin CAND to one recorded sha first (critic correction 3). Run each gate once, in this order, and stop at the first NEW
failure. The runners take the slot and the GPU lock themselves: never pre-take or nest them.

| Gate | Command | Slot / lock | Notes |
|---|---|---|---|
| GATE-2 | `npm run test:full` | exclusive test slot (`RUN_CLASSES.full`) | Tier `all --full`: the whole `npm test` registry with `ATLAS_TEST_FULL=1`, one process per file or shard, longest first, **bail on** (the first NEW failure of any class kills the run). About 10 min (588 s measured, `docs/tier-all-2026-10-07.md`). Read the verdict from `test-results/tiers/<treeKey12>-full-<start>/summary.json` (`classification` matched / fresh / stale). `-- --no-bail` only to list every failure after a red run. |
| GATE-3 | `npm run test:golden` | GPU lock (taken by `run-cross-engine.mjs`) | `--update` is never part of the gate. |
| GATE-4 | `npm run build` | none | `tsc --noEmit && vite build`. |
| quiet window | GATE-1 (fair protocol, `scripts/cost-fair/run.sh` from main's harness), GATE-6 (`npm run test:perf`), GATE-5 (Luna capture only, no vote: O6) | exclusive slot; GATE-5 slot -> GPU | Lock order merge -> slot -> GPU. Timing gates stay exclusive with the shared slot on. |

## GATE-7 is dropped

GATE-7 was one plain `npm test` before test:full. It is no longer run, because test:full now covers it and fails as fast:

- **Same tests.** test:full runs every file of `scripts.test` (`registeredTests()`), the same titles as plain `npm test`
  (1594 = 1594 in the measured runs, `docs/tier-all-2026-10-07.md` section 2). The only difference is that the 11
  `fullOnly` carved-truth tests run instead of being skipped.
- **Same samples or a superset.** `ATLAS_TEST_FULL=1` implies tier `gate`, and `pick()` falls back from `gate` to
  `default`. One registered test has a `gate` value today: `terrain-structural-spectrum` (O7) measures 36 tiles at gate
  instead of the default 24. Its gate kinds are a superset of the default kinds (adds face-edge and coast; same 8
  seeds), and those tests are INFO, measure-only (asserts: tile count in 10..50, finite values). Every other
  default-tier literal is the same under test:full.
- **Fail-fast.** With bail, a broken constant ends test:full at the first NEW failure, as GATE-7 did, without the
  4 min of GATE-7 in front of every green gate.

**Re-add GATE-7** (as `npm run test:all`, which is the same registry at default depth) if any of these becomes true:
a registered test gets a `gate` value in `pick()` that is not a superset of its `default` (or that a HARD/CONTRACT
assertion could pass on while failing on the default set, e.g. a mean or a median), a test behaves differently when
`ATLAS_TEST_FULL=1` other than through `fullOnly`/`gateOnly`, or test:full stops running the whole registry.

## Record

For each gate: command, exit code, wall time, CAND sha, run directory, and for GATE-2 the counts (tests, pass, fail,
skip, todo) and the classification lists. Known failures are rewritten only by the merger, after review
(`docs/test-policy.md` "Known failures").
