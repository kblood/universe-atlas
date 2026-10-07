# mountain-carving-3 (C1 Catmull-Rom carving query): STOPPED at the spectrum pin

Branch `mountains/carving-c1` (from main 32f5de3). Staged; NOT for merge. It implements
docs/fable-decision-carving-lattice-2026-10-07.md, and the implementation is complete as specified. But the decision's
pre-registered HARD spectrum pin (pooled massif 200 m lattice <= 4.7 dB on the **truth** sampler) **fails**:
9.34 dB. Per the brief, a failing acceptance row is a reject. I stopped there and did not tune, so the downstream rows
did not run (re-pins, M3/M4/M5 rows, golden, bench, test:full). A second problem, point-memo capacity, is open (section 4).

## 1. What is implemented (committed on the branch)

| item | change |
|---|---|
| storage | `S = CORE + 3` stored columns (block-local -1 .. CORE+1). The stored value is the **cut fraction** `cut = c>0 ? 1 - min(v/c, 1) : 0` (Float32), replacing `r`. The normaliser window is extended by one column per side; core values are unchanged. |
| query | 4x4 tensor Catmull-Rom of `cut`. Rows are clamped to [0, ROWS]; the result is clamped to [0, 1]; `carvingFM = cut===0 ? 0 : -envelope*cut`. The hashed diagonal is no longer read at query time. |
| point memo | 16 Float32 taps per cell. SLOTS 4096 -> 2048 and FILL 3072 -> 1536 keep the memo bound: 32 x 252,044 + 2 x 2048 x 85 = 8,413,568 B <= 8.5e6. |
| export/import API | `cut` replaces `r`. Validation checks the length `NR*S`, that every value is in [0, 1], and that capped/positive are <= `NR*(CORE+1)`. Byte length is 252,044. `placeBlockTransferables` returns `cut.buffer`. |
| version | `MOUNTAIN_CARVING_VERSION` `mountain-carving-2` -> `mountain-carving-3`. `MOUNTAIN_CARVING.INTERPOLANT = 'catmull-rom'`. |
| digest | `CARVING_F_DIGEST` `1321803fcd6ba5b03fa009035154a025aefff6a2a5bf1442e9e4cf902443cfee` -> `1c94b28fde21ee4a55894303b28c19a50ded833f6135d58563b81f412bb3c2bd` |
| triangle reference | `tests/helpers/mountain-carving-triangle.mjs` rewrites the source (two needles, each must occur exactly once) and is used test-side only. `tests/helpers/spectrum-triangle-worker.mjs` runs the whole terrain stack in a worker with `module.registerHooks`. |
| tests | Three new HARD tests: exact +0, vertex reproduction, and the C1 straddle with the triangle negative control. The memo tests are adapted. `terrain-structural-spectrum` gets Part 3, the HARD lattice pin (with the triangle control and an INFO row with rock off). |

Not moved, because the run stopped first: `TERRAIN_VERSION`, the 129-square metric pin, `COST_SAMPLER_IDENTITY`, the
elevation-identity digests, golden, `docs/place-query-v1.md`.

## 2. Rows run

| row | result |
|---|---|
| mountain-carving + memo tests (`test:pkg`) | 19 pass, 0 fail |
| C1 straddle (1246 lines incl. seams, h = 1 mm, jump limit 0.01) | Catmull-Rom 0 kinks (max jump 8.94e-5); triangle 1012/1246 kinks (max 4) |
| seam stored-column identity | 0 / 4329 diffs (3 seams incl. w = 48 km) |
| point memo == block path | bit-identical |
| imported-only blocks | 0 builds |
| **spectrum pin, truth (HARD <= 4.7 dB)** | **FAIL: 9.34 dB** (lattice-x) |
| spectrum negative control (triangle > 4.7) | pass: 8.88 dB |
| 250 m gully cell (< 4.7) | pass: 0.92 dB |

Spectrum, smoke tier: 20 frozen massif tiles, fine rasters of 256 x 50 m aligned with the belt axis, pooled whitened. Values
are peakDb for lattice-x / lattice-y / lattice-d / lattice-d2.

| field | truth (rock on) | rock off (INFO) | rock term alone (truth - rock off) |
|---|---|---|---|
| mountain-carving-2 triangle (main) | 7.84 / 8.20 / 8.83 / 8.88 | 8.35 / 9.32 / 9.73 / 9.62 | 9.81 / 9.14 / 6.46 / 4.40 |
| **mountain-carving-3 Catmull-Rom** | **9.34 / 8.22 / 1.36 / 0.57** | 2.28 / -0.79 / 0.58 / 0.12 | 10.29 / 9.30 / 1.58 / 1.04 |
| diag only: quadratic B-spline (the decision's fallback) | 5.27 / 4.39 / 0.41 / -0.50 | 0.44 / -0.87 / -0.48 / -0.25 | 6.48 / 6.28 / 0.64 / -0.60 |
| diag only: uniform cubic B-spline (C2) | 1.83 / 1.46 / 0.16 / -0.29 | 0.91 / 0.30 / -0.28 / -0.23 | 2.43 / 1.82 / 1.07 / -0.32 |

Off-belt control, unchanged: 1.58 dB max. Gully cell, Catmull-Rom truth: gully-x 0.92, gully-y 0.84.

## 3. Finding

C1 does what the decision intended for the **carving field itself**. With rock off, the lattice drops from 9.73 to 2.28 dB,
and the diagonal families disappear even with rock on (8.88 -> 0.57 dB).

The axis families come back through **M5 rock detail**:
- `rockDetailM` reads the carved field's slope (forward differences over 125 m) and its height (strata phase), and both
  feed nonlinear terms: the slope weight, the depth term `KAPPA x slope` and the bench phase.
- A C1 interpolant has a curvature that jumps on every lattice line. The slope magnitude therefore keeps a 200 m-periodic
  modulation along x and y, and rock turns that modulation into relief.
- The rock term alone has 10.29 dB at lattice-x under Catmull-Rom, which is higher than under the triangle (9.81).

The ordering over interpolants matches the smoothness class:
- Catmull-Rom (C1, interpolating, with overshoot-shaped curvature): 9.34 dB;
- quadratic B-spline (C1): 5.27 dB, which still fails;
- cubic B-spline (C2): 1.83 dB, which passes.

The decision's premise that "rock only shaves about 2 dB" was measured on the triangle field. On a C1 field, rock is the
dominant lattice source.

So **neither the specified C1 nor the named 9-tap fallback passes the pre-registered pin**. Two candidates did pass in the
scratch diagnostic, and both need a new decision (neither was adopted here):
- (a) a C2 query: the cubic B-spline. It is approximating, not interpolating: vertex values are smoothed, so the exact-vertex
  reproduction test and the M3/M4 margins (Raiva R1 8.59 vs >= 8) would need re-measuring.
- (b) the decision's other fallback: give M5 an analytic or C1-consistent gradient (changes M5 input semantics, own
  version).

Reproduce: `node test-results/mountains/carving-c1/diag.mjs <worktree> cr|tri|bq|bc` (about 9 s each; per-tile values in the
`diag-*.json` files).

## 4. Second open issue: the point memo under the perf set

The perf set of 40,000 placeAt points touches about 2147 distinct cells per pass. SLOTS 2048 / FILL 1536 cannot hold them:
- on the branch, the second pass re-solved **266 blocks** (pass 0: 935 builds, 2148 stores, 3492 hits, 170 s; pass 1:
  266 builds, 5029 hits, 74 s);
- on main the second pass re-solved 0 (0.4 s).

The `place-query.perf` best-of-3 row would fail. At 85 B per cell (16 taps), the memo bound leaves about 2552 slots at most.
Options:
- a load factor near 0.9;
- a compacted key;
- caching blocks rather than cells for warm sets.

This needs a decision too. Evidence: `test-results/mountains/carving-c1/cells.mjs`, `cells-c1.log`.

## 5. Not run (stopped at the failing HARD row)

- TERRAIN_VERSION bump and its pins;
- re-pins (129-square, sampler identity, elevation identity, golden);
- M3 eight rows on both pools;
- M4 Raiva R1;
- M5 INFO margins;
- belt = 0 identity on 4 x 15,120;
- lod-carving-reduction, lod-coarse-frame;
- M5 micro-bench (ATLAS_M5_BENCH=1);
- test:affected and test:full;
- the GPU probe pair (not this agent's: no browser).

needs: a `^HARD: real` shard for tests/terrain-structural-spectrum.test.mjs in tests/tiers.json, so the HARD pin does not
run inside the `#rest` step (the current shard is `^INFO: real`). Not edited, because another agent owns tiers.json and
package.json.
