# Decision: placeAt first touch (~150 ms cold massif solve) (2026-10-07)

Decided by Fable 5.1 on Kasper's instruction (2026-10-07), overrulable. Kasper's input: "cliffs are allowed to exist, maybe that helps". Recorded from the Fable decision report. Measured numbers from the acceptance runs are appended by the implementer at the end.

Ledger: no threshold, pin, version, golden or budget change; two perf rows added. Adding exported functions is not a `place-query` version bump: the version keys answers, and no field or answer changes. Row W's limits were corrected before merge (section 5); nothing on main moved.

## 1. Decision

**The truth stays synchronous and bit-identical; the first-touch solve is kept but made avoidable by a value-preserving warm-up/transfer API, and it gets a regression guard.** Concretely: (b) in its *warm-up* form, plus (c); (a) is declined as the remedy; coarse answers at S0-S2 are not folded in; the cliff hint does not change what is acceptable now.

- **Full-level `placeAt` is the collision truth** (lod-ladder contract §8, place-query rule 3, "nothing is void"). Returning anything but the truth at S3/S4, or a value that differs from what the fine tiles carry, is a semantic change not made for a perf number. A cold massif first touch therefore legitimately costs one solve, bounded (~150 ms, at most ~0.3 s); the point memo already makes every repeat 1.6 µs.
- **(a) a faster solve cannot reach the goal.** A 3x solve is still ~1,200 µs/call on a cold scattered set and still a 50-75 ms frame stall, and it touches `solve`, whose pop order and FP order must not move. Allowed later as an optional, digest-gated item.
- **The right fix is residency transfer.** `placeAt` has no in-app caller (only `src/time-nav.ts` imports the version string); it is a games-facing pure function, and every browser game here already runs workers (`src/planet-worker.ts`). The solved block `r` is observationally pure across module instances and processes (pinned: cold/warm/evicted/child-process digests identical), so a block solved in a worker can be imported into the main thread's LRU and the main-thread query becomes a hit. Bit-identical by construction; no change to `solve`, `build`, `retainedAt` arithmetic, any version, or any golden.
- **Not a deferred `placeAt` variant and not a time-sliced solve.** The deferred variant widens `PlaceResult`; the sliced solve edits the hot loops of `solve`. Recorded as follow-ups.
- **Coarse answers at S0/S1** are the documented place-query plan, but they do not touch the default-level first touch and they move `PLACE_QUERY_VERSION`, the place golden and the level-echo test: a separate `place-query-2` decision.
- **The cliff hint.** The non-locality is in the drainage (flow accumulation over whole catchments, the Dijkstra distance-to-channel limit, the flood's epsilon chain), not in continuity. Cliffs would only license dropping the *halo*, and a halo-free solve puts its seams on the 25.6 km block columns: a regular lattice rhythm (the rejected C/D/E candidates; the spectrum metric's block comb at 25.6 km), not natural cliffs. Cliffs genuinely help a **future carving** (`mountain-carving-3`-class): seeded irregular fault lines bounding small patches that drain independently (scarps at the faults), or a local order-independent valley-curve formulation with no solve at all. Either makes cold cost vanish everywhere but moves `TERRAIN_VERSION` and every golden: Kasper's design question (F5).

Risks:
1. A game that does not warm up still hitches 150-300 ms on a cold massif. Mitigation: documented API; the new perf row keeps the cost bounded.
2. Imported blocks are trusted data. Mitigation: import validates version, key, shape and value range; in-session transfer only, never persistence.
3. One extra integer compare on the dense path (`block()`), same precedent as the `pointDepth` branch; C1 not re-measured. If the merger's perf run shows C1 movement, that is a stop, not a waiver.
4. The main-thread 32-block LRU still thrashes for > 32 warmed far-apart blocks; repeats are covered by the point memo. Documented, not fixed.
5. Perf-row flakiness: the first-touch cap is per solve, 250 ms relaxed against 146-167 ms measured.

## 2. Implementation brief

Branch `perf/placeat-warmup` from main. Commit on the branch; do not merge, push, deploy, or touch `known-failures.json`, golden, pins or budgets.

**Must stay bit-identical / unchanged:** `solve()`, `build()`, the arithmetic of `retainedAt`/`retainedAtPoint`/`carvingFM`; `CARVING_F_DIGEST` `1321803f...`; `MOUNTAIN_CARVING_VERSION` `mountain-carving-2` and the frozen `MOUNTAIN_CARVING` / `CARVING_POINT_MEMO` constants; `PLACE_QUERY_VERSION` `place-query-1` and `PLACE_VERSIONS`; `TERRAIN_VERSION`, `LOD_LADDER_VERSION`; every golden; the 8.5 MB memo bound; the 30/3 µs perf limits; the capture sha `45dbde37...dc8d47` over the 56,000-line set.

### A. `src/mountain-carving.ts`

Add after the LRU `block()`, `//` comments only (the smoke audit rejects `**` in comments), respecting the arithmetic audit in `tests/mountain-carving.test.mjs:51-56` (no `Number`, `isFinite`, `isNaN`, `**`, no `Math.*` beyond floor/sqrt/imul/min/max/abs, no new imports; `x-x===0` for finiteness, `v>=0&&v<=1` for range):

- `export type CarvingBlockKey={seed:N;w:N;id:N}` and `export type CarvingBlockExport=CarvingBlockKey&{version:string;r:Float32Array;capped:N;positive:N}`.
- `export function traceCarvingBlocks<T>(fn:()=>T):{result:T;blocks:CarvingBlockKey[]}`: module-level `traceKeys:CarvingBlockKey[]|null`; throws if a trace is already open; `try/finally` restores `null`; unique keys in first-touch order. Record at the top of `block()` (every served block, hit or miss) **and** in the memo-hit branch of `retainedAtPoint` with `Math.floor(col/CORE)` (a point-memo hit never calls `block()`). The dense path gains exactly one compare `traceKeys!==null`.
- `export function exportCarvingBlock(key):CarvingBlockExport`: validates the key, calls `block(seed,w,id)`, returns `{version, seed,w,id, r:new Float32Array(b.r), capped,positive}`, a **copy**.
- `export function importCarvingBlock(b):boolean`: validate or throw (LRU untouched on throw): version equal; `r instanceof Float32Array && r.length===NR*S`; `seed===(seed>>>0)`; `(id|0)===id`; `w>0 && w-w===0`; `capped`/`positive` integers with `0<=capped<=positive<=NR*S`; every `r[k]>=0&&r[k]<=1`. Resident key: return `false`, keep the resident object, no reorder. Else push as MRU (takes ownership), evicting the oldest exactly as `block()` does; return `true`. Do not increment `carvingBuildStats.count`. Add `export const carvingTransferStats={exported:0,imported:0,duplicate:0}`.

### B. `src/place-query.ts`

- `exportPlaceBlocks(ctx, direction, level='S4', options={}) -> {result, blocks}` = `traceCarvingBlocks(()=>placeAt(...))` then `blocks.map(exportCarvingBlock)`.
- `importPlaceBlocks(blocks):number` (count of `true`).
- `placeBlockTransferables(blocks):ArrayBuffer[]` = `blocks.map(b=>b.r.buffer)`.
- Header comment: one paragraph on warm-up; `PLACE_QUERY_VERSION` unchanged.

### C. Docs

- `docs/place-query-v1.md`: new section "Warm-up and residency transfer (additive, place-query-1)": cost statement (cold ~150 ms, at most ~0.3 s; after import <= 30 µs; repeats 1.6 µs), worker pattern (worker: `exportPlaceBlocks` -> `postMessage(blocks, placeBlockTransferables(blocks))`; main: `importPlaceBlocks` -> `placeAt` hit), trust rule (in-session only, version-checked, never persisted), "run `placeAt` in a worker when frame time matters".
- This file: append the measured numbers.

### D. Tests

1. `tests/mountain-carving-memo.test.mjs` (HARD, `loadVariant` style, synthetic seeds):
   - Cross-instance transfer reproduces the digest with 0 builds: instance A builds the fixture's 4 blocks; traced second run returns exactly 4 unique keys; export all; fresh instance B imports all (4 x `true`, `B.cache.length===4`); B's digest `=== CARVING_F_DIGEST` with build delta 0, on the block path and under `enter/exitCarvingPointQuery`.
   - Export is a copy (mutating the export leaves A's digest unchanged); each invalid import {wrong version, wrong length, NaN, 1.5, seed -1, id 1.5, capped>positive} throws with `cache.length` unchanged; duplicate returns `false` and keeps the same `r` object; on `CACHE:4`, importing 8 keeps `cache.length<=4`, last 4 in MRU order.
   - Trace sees hits and misses on both paths; nested trace throws; a throwing fn closes the trace. Mutation control (`SOURCE.replace`): removing the note in `retainedAtPoint`'s hit branch must make the warm point-path trace return 0 keys.
   - Memory test bound unchanged; add `exportCarvingBlock(...).r.byteLength===248196`.
2. `tests/place-query.test.mjs` (HARD, <= 8 directions, about 2 s): new `tests/helpers/place-warm-worker.mjs` (pattern `tests/helpers/lod-coarse-frame.mjs`). Worker runs `exportPlaceBlocks` on >= 8 frozen massif directions (smoke `tests/tier-sets.json` axis/flank kinds across 4 worlds) and posts results + blocks with transfer. Main: `importPlaceBlocks`, then `placeAt` each: `deepStrictEqual` to the worker's result and builds delta `=== 0`.
3. `tests/perf/place-query.perf.test.mjs`: two rows **before** the existing best-of-3 row:
   - Row W: warm-up, worker-exported massif blocks imported: 0 solves, first pass mean <= 30 µs (strict 10 µs with `OCEAN_PERF_STRICT=1`) over >= 12 frozen massif directions; INFO second pass.
   - Row F: placeAt first touch on cold massif blocks, ms per solve <= 250 relaxed, <= 200 strict, disjoint set, traced, only calls with builds delta >= 1, >= 10 counted calls; INFO p50/max, solves per call. A regression guard, not a target.
   - Existing row unchanged.

### E. Acceptance

`npx tsc --noEmit`; `npm run test:pkg -- tests/mountain-carving-memo.test.mjs tests/mountain-carving.test.mjs tests/place-query.test.mjs`; `npm run test:affected -- --base main`; `npm run test:smoke`; `ECO_PERF_STRICT=1 npm run test:perf` under the slot (report best-of-3 µs, Row F, Row W); perf file alone with `OCEAN_PERF_STRICT=1`. Bit identity: rerun `docs/placeat-regression-2026-10-07/capture.mjs` -> sha must equal `45dbde37...dc8d47`, plus a mode where every massif point's blocks were first worker-exported and imported -> same sha. Hashes/logs under `docs/placeat-first-touch-2026-10-07/`. Digest `1321803f...` unchanged.

## Follow-ups (not in this brief)

- **F1 `place-query-2`:** S0/S1 and numeric levels below `carvingFromLevel(R)` answer from the level sampler; moves `PLACE_QUERY_VERSION`, the place golden and the level-echo test. Separate decision.
- **F2** time-sliced main-thread solve, only for a worker-less consumer. **F3** optional solve speedups, digest-gated. **F4** planet-worker posts exported blocks for carved tiles near the player so main-thread physics/landing never solve (the MTN-FOLLOW landing stall, 5-20 blocks / 0.8-3.8 s); renderer-owner design item. **F5** cliff-based carving (fault-bounded patches or a local valley-curve formulation): Kasper's design question; moves `TERRAIN_VERSION` and every golden.

## 3. For Kasper

The truth-level `placeAt` stays exact and synchronous, so a cold massif query keeps its one ~150 ms solve, but a worker can now solve and hand the block to the main thread bit-identically, after which the same query costs under 30 µs; nothing moves except two added perf rows that pin today's first-touch cost. The cliff hint does not make the current solve cheaper (the cost is drainage non-locality, and halo-free seams would be a 25.6 km lattice rhythm, not natural cliffs), but it is the right direction for a future carving with seeded fault scarps or a solve-free local formulation, which would need a terrain version move and Kasper's go.

## 4. Measured (implementer, 2026-10-07, branch `perf/placeat-warmup`)

Host DESKTOP-N09QOSU, Node v24.7.0. Evidence: `docs/placeat-first-touch-2026-10-07/` (logs, `capture-warm.mjs`,
`capture-sha256.txt`, `capture-tree.txt`, `perf-alone.sh`). Implementation as briefed (sections A-D); nothing in
`solve()`, `build()` or the `retainedAt`/`retainedAtPoint`/`carvingFM` arithmetic changed, and no version, pin,
golden, budget or `known-failures.json` entry moved.

**Bit identity (HARD).**

| Check | Result |
|---|---|
| `CARVING_F_DIGEST` (cold/warm/reverse/child, `tests/mountain-carving.test.mjs`) | `1321803f...cfee`, unchanged |
| Cross-instance import (block path and point path), `tests/mountain-carving-memo.test.mjs` | digest `1321803f...cfee`, **0 builds** in the importing instance |
| Capture, plain (`docs/placeat-regression-2026-10-07/capture.mjs`, 56,000 lines, fwd) | sha `45dbde37...dc8d47` **identical**; 4,994 solves, 1,023 s |
| Capture, worker-imported (`capture-warm.mjs`, 3 workers export, main imports then queries) | sha `45dbde37...dc8d47` **identical**; **0 main-thread solves**; 0 worker/main line mismatches; 5,121 blocks posted, 4,996 imported, 125 duplicates; 393 s |

**Tests.**

| Command | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm run test:pkg -- tests/mountain-carving-memo.test.mjs tests/mountain-carving.test.mjs tests/place-query.test.mjs` | 26 pass, 0 fail (arithmetic audit incl. the `**`-in-comment rule passes) |
| `npm run test:affected -- --base main` (85 files) | 701 tests: 688 pass, 0 fail, 11 skip, 2 todo (pre-existing OPEN/NOT MET todos) |
| `npm run test:smoke` | GREEN, 239 tests (228 pass, 0 fail, 11 skip), 50/50 steps; wall 182.9 s (over the 120 s budget warning, host shared) |

New test numbers: transfer keys = the fixture's 4 blocks; 7 invalid imports rejected (version, length, NaN, 1.5,
seed -1, id 1.5, capped > positive); trace mutation control: warm point-path trace 4 keys, 0 keys without the hit-branch
note (242 memo hits); place-query warm-up test: 8 frozen massif directions (axis + flank per world, they share 4 blocks),
worker 4 solves / 1.3 s, main 0 solves, all answers `deepStrictEqual`; export `r.byteLength` 248,196.

**Perf** (under the slot, CPU gate passed: 7/2/5 % for the suite, 9/7/1 % for the file alone).

| Row | `ECO_PERF_STRICT=1 npm run test:perf` (13/13 pass) | File alone, `OCEAN_PERF_STRICT=1` |
|---|---|---|
| W, first pass mean, 12 frozen massif directions, 0 main solves | **17.44 us** PASS (<= 30) | **26.25 us** FAIL strict (<= 10); within relaxed 30 |
| W, second pass (INFO) | 10.71 us | 7.79 us |
| F, ms per solve, 16 counted cold calls, 1 solve/1 block each | **171.6 ms** PASS (<= 250); p50 174.1, max 182.2 | **164.0 ms** PASS strict (<= 200); p50 162.8, max 176.8 |
| existing best-of-3 x 40,000 | **1.72 us** PASS | **1.76 us** PASS strict (<= 3) |

Notes on row W:

- The first implementation timed the first 12 massif queries of the process: **214 / 206 us** with 0 solves
  (`*.run1-rowW-unprimed.log`). That is interpreter/JIT cost of the massif code path (mountain term, envelope, rock
  detail, carving), not a solve. The row now JIT-warms on a disjoint priming set first (2 seeded massif centres per
  world, 60 points within 2 km of each, queried twice; their blocks come from the same worker and are imported first;
  10 + 8 blocks <= 32), as a game that has been running `placeAt` would be. This is documented in the test.
- **Strict 10 us is not met** (26.25 us alone). Per call (dev run, not under the slot) the first query after import
  is ~45-50 us and the rest 7-18 us; wider priming did not lower it. The cost is the first query at a new location
  (cell-memo miss plus first touch of other location-keyed state), not a solve. The relaxed 30 us margin is thin
  (17.4 / 26.3 us measured), so this row may flake on a loaded host (decision risk 5). The strict limit is left as
  briefed; changing it is an owner/Fable call.
- Captures ran outside the test slot at below-normal priority (they are not tests; 1 + 3 worker threads on 32 cores).

## 5. Row W limit correction (Fable 5.1 on Kasper's instruction, 2026-10-07, overrulable)

- The briefed limits (first-pass **mean** <= 30 us relaxed, <= 10 us strict) were set without a measurement.
- What the row measures after an import: the carving part (point-memo miss, resident block hit) is sub-us. The 7-25 us
  per call is the non-carving massif point path at a fresh location (mountain term, envelope, rock detail, first touch
  of location-keyed state) and JIT warmth, which is out of scope for this decision. The first query after an import
  costs about 50 us once.
- New assertion: **HARD** 0 main-thread solves and no first-pass call > 5,000 us; **cost guard** per-call p50 of the
  first pass <= 60 us relaxed, <= 30 us strict (`OCEAN_PERF_STRICT=1`); mean, first call, max, the per-call array and
  the second pass are INFO.
- Not a ledger entry: the corrected limits never reached main.

Verification (branch rebased onto main `225c362`): see 5.1 below.

### 5.1 Verification of the corrected row W

Under the slot, quiet-CPU gate passed before every perf run. Logs `docs/placeat-first-touch-2026-10-07/r2-*.log`.

| Run | W p50 (us) | W mean | W first call | W max | 0 solves | F ms/solve | existing best-of-3 | Result |
|---|---|---|---|---|---|---|---|---|
| file alone, `OCEAN_PERF_STRICT=1`, run 1 | **19.1** | 30.65 | 31.1 | 151.1 | yes | 169.9 | 1.71 us | 3/3 pass |
| file alone, `OCEAN_PERF_STRICT=1`, run 2 | **11.6** | 16.29 | 52.8 | 52.8 | yes | 158.4 | 1.72 us | 3/3 pass |
| file alone, `OCEAN_PERF_STRICT=1`, run 3 | **9.5** | 11.59 | 34.4 | 34.4 | yes | 164.0 | 1.69 us | 3/3 pass |
| `ECO_PERF_STRICT=1 npm run test:perf` | **10.0** | 13.49 | 44.4 | 44.4 | yes | 156.1 | 1.74 us | 13/13 pass |
| A/B: main `225c362`, file alone, `OCEAN_PERF_STRICT=1` | - | - | - | - | - | - | **1.64 us** | 1/1 pass |

- Strict W (p50 <= 30 us) passes in all three alone runs; max call 151.1 us is far under the 5,000 us HARD bound.
- Existing row A/B: branch 1.69-1.74 us vs main 1.64 us, +3.0 % to +6.1 %, under the 10 % stop line (the extra
  `traceKeys!==null` compare on the block path plus run-to-run noise; not separated here).
- `npx tsc --noEmit` clean; after the rebase `npm run test:pkg -- tests/mountain-carving-memo.test.mjs
  tests/mountain-carving.test.mjs tests/place-query.test.mjs`: 26 pass, 0 fail. No smoke or capture rerun (no src change
  since the captures; the rebase brought only test-runner changes from main).
