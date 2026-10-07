# placeAt regression (GATE-6, 2026-10-07): cause and value-preserving fix

- Branch `perf/placeat-carving` from main `d034b20` (worktree `universe-atlas-wt/placeat`). One Opus agent, the only agent.
- Input: `docs/quiet-window-2026-10-07.md` GATE-6. `placeAt` at full level measured **3,433 µs** on the wired tree,
  against a relaxed limit of 30 µs. The REF tree `9dcb1cf` measured 1.43 µs.
- Result: **1.60 µs** in `ECO_PERF_STRICT=1 npm run test:perf` (11/11 pass). **1.67 µs** for the test alone under
  the slot. Every height is bit-identical, and neither golden nor any version moved.
- Not changed: the perf limit and test protocol, any pin or budget, `known-failures.json`, golden, `TERRAIN_VERSION`,
  `MOUNTAIN_CARVING_VERSION` and `PLACE_QUERY_VERSION`. No Opus decision was needed (see "Options not taken").

## Diagnosis

**Why one point query solves a whole block.** On a massif point, truth `placeAt` reaches `mountainRidgeTermM` →
`ridgeValleyCarvingM` → `retainedAt`. This happens three times (C, Cx and Cy, because the M5 rock detail is on in
the truth), and the same three calls repeat through `terrainFloorSampler`. `retainedAt` interpolates one lattice
triangle of a memo block (128 core columns × 481 rows, 25.6 km × 96 km at the fixed w = 48 km).

A block's values exist only as the output of `solve()` over its full haloed domain (513 × 481 = 246,753 nodes):
- a priority flood from the margin rows;
- steepest-descent receivers;
- upstream area over whole catchments;
- the stream-power integral to the outlet;
- a Dijkstra hillslope limit from every channel;
- a dilate-and-blur normaliser.

Every stage is non-local. The flood's ε increments and the Dijkstra relaxations are also order-dependent in
floating point.

**Can a point use a cheaper exact local evaluation? No.** No sub-domain computation reproduces these values
bit-for-bit. The halo study itself shows that a narrower domain changes values (1 of 280 seams at HALO 160), so a
local evaluation would change heights.

Stage profile per solve (`docs/placeat-regression-2026-10-07/stages.mjs`, 10 solves, w = 48 km):

| Stage | Time per solve |
|---|---|
| noise | 27.7 ms |
| flood | 39.4 ms |
| receivers | 11.6 ms |
| area | 1.8 ms |
| integral | 3.5 ms |
| hillslope Dijkstra | 73.2 ms |
| normaliser | 9.4 ms |
| **total** | **166.6 ms** |

Even a 3× faster solve leaves about 2.2 % × 55 ms ≈ 1,200 µs per call on a cold scattered set. Solve speed alone
cannot reach 30 µs.

**Why nothing was retained.** The block memo is an LRU of `CACHE` = 32 blocks (7.94 MB, pinned at ≤ 8.5 MB by
`tests/mountain-carving-memo.test.mjs`). The test's 40,000 Fibonacci points are about 106 km apart, so each
in-massif point lands in its own block.

Measured on the perf set (`capture-after-perf-2pass.log`):
- One pass makes **935 block solves**.
- Each pass cycles through those blocks, so the 32-slot LRU evicts every block before it is needed again, and
  every round rebuilds every block (the quiet-window diagnostic saw the same 88 rebuilt on 4,000 points).
- Retaining whole blocks for this set would need 935 × 248,196 B = **232 MB**, about 29× the pinned 8.5 MB
  budget. A larger block LRU keyed by block id (plus version) is therefore not a value-preserving option within
  the budgets.

**What the perf test measures.** It reports the best of 3 rounds over the same 40,000 points, so its intent is
steady state with warm JIT and repeat queries. On the wired tree no state survived between rounds, so all 3 rounds
were first-touch rounds. The 3,433 µs is the first-touch cost: 2.2 % of points × about 150 ms per solve.

## Fix: a point-query cell memo (value-preserving)

- **`src/mountain-carving.ts`** gets `enterCarvingPointQuery()` and `exitCarvingPointQuery()`. Between the two
  calls, `retainedAt` delegates to `retainedAtPoint`.
  - That function looks up the lattice cell by its exact key (normalised seed, half-width, global column, row).
  - A hit returns the cell's four Float32 corners r[a], r[a+1], r[a+S] and r[a+S+1].
  - On a miss it takes them from the block (the LRU, or a solve) and stores them.
  - The triangle interpolation and clamp are the original expressions, with r[...] replaced by the same Float32
    values, so a memo hit is bit-identical.
- **Storage.** Two generations of 4,096 open-addressed slots in fixed typed arrays. The young generation ages
  after 3,072 entries (load 0.75), and a hit in the old generation is copied back (approximate LRU). It holds
  3,072 to 6,144 recent cells.
- **Memory.** 2 × 4,096 × 37 B = **303,104 B**, fixed. Block memo plus point memo = 7,942,272 + 303,104 =
  **8,245,376 B ≤ 8.5 MB**. The existing memory test now counts both against the same unchanged 8.5 MB bound.
- **Key.** No terrain-version key is needed. Like the block memo, it is an in-process module memo, and the
  arithmetic cannot change within one module instance. A persisted or shared cache would need the version in its
  key.
- **Dense callers.** Tiles, bakes, C1 and every caller that does not open a point query keep the old code path.
  The only cost they see is one branch on a module integer in `retainedAt`. C1 and orbit costs are therefore
  not expected to move, but they were not re-measured: GATE-1 is a two-hour protocol.
- **`src/place-query.ts`.** `placeAt` opens and closes a point query around its body (try/finally). This also
  covers `depthAndPressureAt`.
- **`tests/mountain-carving-memo.test.mjs`** gets a new HARD test. The pinned digest `1321803f…` must be
  reproduced through the point memo in these modes:
  - cold;
  - warm and reversed (over 1,000 memo hits are required);
  - interleaved with block-path calls;
  - aged, using a 16-slot variant that ages every 12 stores.
  
  A width-blind key mutation must be caught. The memory test adds the point memo to the 8.5 MB bound.
- **Limitation, stated plainly.** A first touch of a massif cell whose block is not resident still costs one solve
  (about 150 ms, up to about 0.3 s when two blocks are hit). The memo makes repeat queries cheap only while their
  cells are among the last 3,072 to 6,144 stored. A sweep that cycles through more distinct massif cells than that
  gets no repeat benefit. It is never slower, though: the 56,000-point capture's second pass made 4,994 solves,
  the same as its first.

## Measurements (host DESKTOP-N09QOSU, Node v24.7.0)

| Run | Tree | placeAt (best of 3 × 40,000) | Test wall |
|---|---|---|---|
| Quiet window GATE-6 | main `39d1f0e` (src = `772cad3`) | 3,433.13 µs, FAIL | 414 s |
| This run, test alone under `test-slot.mjs` (exclusive, one level) | main `d034b20` | **4,845.28 µs, FAIL** | 582 s |
| This run, test alone under `test-slot.mjs` | this branch | **1.67 µs, PASS** | 157 s |
| `ECO_PERF_STRICT=1 npm run test:perf` (CPU gate 2/3/4 %, it takes the slot itself) | this branch | **1.60 µs, PASS (11/11)** | 140 s (suite 2 m 36 s) |
| REF arm (quiet window) | `9dcb1cf` | 1.43 µs | — |

- The main re-run was not CPU-gated. Its 4,845 µs against 3,433 µs reflects the first-touch cost on a less quiet
  host. Either way it is a FAIL by about 100×.
- The branch measures below even the strict 3 µs (`OCEAN_PERF_STRICT=1`), but that limit was not run with the
  strict flag and is not claimed.
- Round 1 of the test is still first touch (about 140 s of the 157 s wall).
- Perf set, pass 2 in one process: **0 solves**, all memo hits (`capture-after-perf-2pass.log`).

## Bit-identity proof

`docs/placeat-regression-2026-10-07/capture.mjs` writes one line per query: the direction, the options, and the
whole `placeAt` result. Every number is written as its float64 bit pattern, so line equality is bit equality,
-0 and NaN included.

**Point set: 56,000 queries.**
- The perf test's 40,000 Fibonacci directions on its world (`WORLDS[0]`).
- 4,000 fresh points on each of the test's 4 worlds:
  - 3,000 seeded-random uniform points;
  - 500 rejection-sampled massif points (M1 massif band);
  - 500 clustered massif points (jitter ≤ 6 km around 50 of them), half with `measureSlope: true`.

**Arms.**
- **before** = main checkout `d034b20`.
- **after**, run three ways:
  - forward order;
  - reverse order;
  - two passes in one process, writing pass 2. That pass ran after aging and had 30,673 memo hits inside calls.
- **perf set only, two passes.** Pass 2 is served entirely from the memo, with 0 solves.

**Result: exact equality** (`capture-sha256.txt`):

| Comparison | sha256 | Result |
|---|---|---|
| before, after-fwd, after-rev, after-2pass (all 56,000 lines) | `45dbde37…dc8d47` | **identical** |
| before rows 1–40,000 and after-perf-2pass | `7f0d44c7…a10` | **identical** |

The 70 MB TSVs stay in the session scratchpad. Only their hashes and the logs are kept here.

## Other tests

- `npm run test:smoke`: **GREEN**, 237 tests (226 pass, 0 fail, 11 skip), 50/50 steps.
  - The first attempt bailed on `mountain-carving.test.mjs` "arithmetic audit", because a `/**` doc comment in the
    new code contains `**`.
  - It was fixed by changing the comment to `//`, a comment-only change made after the captures and perf runs.
- Mountain element and consumer tests at full depth, under the slot, 17 files: **148 pass, 0 fail, 3 skipped**
  (opt-in benchmark guards such as `ATLAS_M5_BENCH`). The files are `mountain-*` (carving, memo, pin, envelope,
  layout, layout-grid, rock-detail, summits, metrics, coarse-field, tile-set), `terrain-mountains-assembly`,
  `place-query`, `sparse-consumer-levels`, `landing-site`, `terrain-elevation-identity` and `golden/perturbation`.
- `tsc --noEmit` is clean.

## Options not taken, and recommendations for Kasper

Nothing here changes semantics, so the "Opus decides" branch of the brief did not arise. The following remain open
and would need Kasper, because they change semantics or cost:

1. **First-touch latency is unchanged.** A cold `placeAt` on a massif costs one solve, about 150 ms to 0.3 s. The
   best-of-3 test cannot see this. Possible directions:
   - **(a)** A bit-identical solve speedup. Targets are the Dijkstra (73 ms), the flood (39 ms) and the noise
     (28 ms), at an estimated 2–3× at most. Value-preserving, but it needs the same pop order and the same
     floating-point operation order.
   - **(b)** An async or warm-up API, or coarse answers for the S0–S2 rungs. This changes semantics or the API,
     so it is Kasper's call.
   - **(c)** A first-touch perf criterion, for example the p99 of a cold scattered massif query. That would be a
     new test protocol, so it is a recommendation only.
2. `placeAt` solves still enter the 32-block LRU, so in-game they can evict renderer-resident blocks. This is
   pre-existing. It can be reduced by having point queries skip the LRU insert, which is value-preserving but
   untested here.

Evidence: `docs/placeat-regression-2026-10-07/`:
- `capture.mjs`;
- `stages.mjs`;
- `diag.mjs` (the quiet-window diagnostic with 3 rounds and memo stats);
- the capture logs;
- `capture-sha256.txt`.
