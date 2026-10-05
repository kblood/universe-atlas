# M3 candidate E, version 1

**Not suitable for promotion.** E passes all eight pooled CONTRACT rows and coast safety. Relief passes by only 5 m (0.33%). Three seeds fail relief. The visual result is artificial. Seven bounded variants did not meet the complete goal. A2 remains the dispatcher.

## Method

E uses a 241 x 61 triangular mesh in each full-width block. Cross-row spacing is 250 m at a 30 km half-width. The mean block length is 15 km. Absolute block IDs determine boundaries and triangle diagonals. Boundary jitter and wiggle are .30 and .15 of the mean length. Their sum stays below .5, so boundaries cannot cross.

Only belt margins are flood outlets. Block sides are routing walls. An 800 m priority spur, scaled by the reference envelope, occupies the outer 20% of each block. It repels channels from the walls. The routing divide wanders by up to 2500 m with a 24 km wavelength. Six smoothstep noise octaves run from 8 km to 250 m, with gain .6. There is no final detail noise or rerouting.

An epsilon priority flood gives a total value/index order. Steepest descending triangle edges select receivers. Physical triangle areas accumulate downstream. Stream-power integration uses m=.375. Channel-seeded Dijkstra propagation limits hillslopes. The final cap is the original 3 km straight ramp. The queried carving is the interpolated retained fraction times the caller's envelope, with exact positive-zero exclusions.

Shared boundary heights are the minimum of the reference cap and adjacent interior heights plus the slope limit times physical edge length. Both neighbours use identical canonical inputs. Ownership and interpolation use the same piecewise-linear boundaries. Equality belongs to the right block. This is not a global cross-block discharge solution.

The certificate covers positive vertices on the construction mesh and its shared boundaries. It does not prove D8 raster drainage, chart-transition drainage, or drainage under an arbitrary supplied envelope. A raised-neighbour control creates a detected sink.

## Constants

```json
{
  "ROWS": 240,
  "COLS": 60,
  "CACHE": 32,
  "RAW_CACHE": 64,
  "TILT": 1.3,
  "NOISE_AMP": 400,
  "SC": 1.1,
  "FOOT": 1500,
  "AC": 300000,
  "M": 0.375,
  "K": 37.552365026127084,
  "BOUNDARY": 2,
  "WANDER": 2500,
  "SPUR": 800,
  "EPSILON": 1e-06,
  "REFERENCE_M": 3000
}
```

Version: `mountain-carving-e-1`. Exports: `carvingEM`, `MOUNTAIN_CARVING_E`, `CARVING_E_VERSION`. Neither `ridgeValleyCarvingM` nor `MOUNTAIN_CARVING.METHOD` changed.

## Builder diagnosis

The builder reuses module-level typed scratch arrays. It derives triangle neighbours from row, column and diagonal bits. It stores no neighbour or edge-length tables. Hot loops create no closures. The only production build allocations are the retained height and boundary arrays and their block object. Query completion copies the raw height array before setting shared boundaries.

A four-way heap uses parallel ID/key arrays. Priority flooding inserts each vertex once. Dijkstra retains indexed decrease-key operations to bound heap storage; a lazy duplicate heap would consume more of the 16 MB allowance. Noise hashes are reused across consecutive vertices in each octave cell. All scratch is overwritten before use. Builds are synchronous and complete before memo insertion.

The fast path reproduces both frozen C digests in HARD tests. A development comparison also found zero differing heights on a full C block. The requested 125 m speed target was **not achieved**: the first implicit builder took about 26 ms; the optimized C-reproduction path took about 23 ms, against the suggested 8 ms. Both measurements are exploratory. The implementation is still dominated by flood/Dijkstra work. The final E uses 250 m based on measured cost and geometry trade-offs.

The first factorial attempt used eight completed slots. It thrashed on the regional coherence workload and was stopped before producing a cell. The restarted diagnosis used 32 completed and 32 raw slots. At 125 m that exceeds the final retention budget, so those cells are diagnostic only. No threshold was changed.

C's existing child fixture embeds the entire source in a Windows command argument. Adding E initially exceeded that limit. Existing tests were left untouched. Source comments were removed and numeric annotations use a shared `N` alias to keep the argument small enough, including with CRLF endings. C's trunk and interpolation helpers gained optional arguments with their original defaults. A2/B arithmetic, all C constants and both C pins remain unchanged. The diagnostic loader holds the rejected cap experiments; they are absent from production E.

## Factorial diagnosis (INFO)

The registration is [registration.md](../test-results/mountains/M3-r5/E/registration.md). K=37.552365026127084 and SC=.9 remain fixed in these twelve cells. Cold timings are exploratory. They are not quiet-CPU budget decisions. Capped share counts completed blocks over all positive reference-envelope vertices, including reconciled boundaries. Each seed contributes one representative block.

| Mesh m | Boundary | Wander m | Core % | Slope | Flank | Relief8 | Beta | Fill | Pits025 | S | Capped % | Cold ns | Relief8 per seed |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 125 | trunks | 0 | 50.661 | 27.1 | 16 | 1565 | 2.28 | 0.008 | 0 | 0.406 | 14.077 | 844.7 | 1565/1557/1452/1580/1551/1475/1493/1570 |
| 125 | trunks | 2500 | 49.302 | 26.6 | 15.7 | 1550 | 2.18 | 0.007 | 0 | 0.292 | 16.216 | 884.4 | 1565/1541/1445/1578/1506/1542/1429/1506 |
| 125 | walls | 0 | 48.281 | 26.5 | 15.9 | 1480 | 2.13 | 0.01 | 0 | 0.323 | 16.765 | 1342.1 | 1497/1494/1472/1470/1480/1432/1441/1523 |
| 125 | walls | 2500 | 47.241 | 26.1 | 15.6 | 1490 | 2.07 | 0.01 | 0 | 0.147 | 18.859 | 1316.3 | 1498/1490/1448/1468/1510/1434/1436/1544 |
| 125 | spurs | 0 | 47.641 | 26.2 | 15.2 | 1543 | 2.28 | 0.009 | 0 | 0.477 | 19.378 | 1305.0 | 1549/1520/1533/1521/1561/1505/1539/1543 |
| 125 | spurs | 2500 | 47.157 | 26 | 15.2 | 1543 | 2.33 | 0.009 | 0 | 0.364 | 19.892 | 1367.4 | 1509/1513/1543/1546/1561/1531/1516/1576 |
| 250 | trunks | 0 | 39.448 | 24.1 | 14.6 | 1502 | 2.24 | 0.005 | 0 | 0.401 | 11.881 | 353.0 | 1527/1503/1370/1455/1492/1392/1461/1520 |
| 250 | trunks | 2500 | 38.813 | 23.7 | 14.3 | 1489 | 2.29 | 0.005 | 0 | 0.3 | 13.145 | 352.7 | 1489/1461/1396/1548/1485/1467/1499/1519 |
| 250 | walls | 0 | 37.596 | 23.6 | 14.5 | 1445 | 2.2 | 0.007 | 0 | 0.33 | 13.838 | 439.2 | 1445/1440/1437/1366/1461/1442/1436/1533 |
| 250 | walls | 2500 | 36.954 | 23.3 | 14.3 | 1456 | 2.23 | 0.006 | 0 | 0.161 | 15.162 | 447.0 | 1464/1468/1366/1377/1470/1450/1375/1527 |
| 250 | spurs | 0 | 34.759 | 23 | 13.7 | 1509 | 2.32 | 0.005 | 0 | 0.482 | 17.043 | 446.5 | 1512/1507/1507/1508/1487/1479/1498/1512 |
| 250 | spurs | 2500 | 34.115 | 22.8 | 13.5 | 1491 | 2.4 | 0.005 | 0 | 0.381 | 17.690 | 445.3 | 1493/1498/1469/1507/1483/1495/1431/1467 |


At 125 m, replacing trunks with walls costs about 85 m of pooled relief. Spurs recover most of it. Both 125 m spur cells pass relief on every seed. At 250 m, the wandering spur cell loses another 52 m of pooled relief. Resolution and side-boundary treatment both matter. Crest wander does not explain the whole loss.

## Bounded variants (INFO)

All seven were registered before measurement in [variants-registration.json](../test-results/mountains/M3-r5/E/variants-registration.json). Routing direction, pit bounds and coherence bounds were not swept.

- v1 raises SC to 1.1 to recover coarse-mesh relief. It retains the factorial K.
- v2 uses SC=1.2 and K=28. It tests deeper channels and less capping.
- v3 uses SC=1.4 and K=22. It tests a stronger version of that mechanism.
- v4 intersects the original cap with a shifted ramp of amplitude 2500 m, with K=40.
- v5 increases that shift to 5000 m, with K=44.
- v4b and v5b correct a cap defect in v4/v5: their reconciled boundaries also receive the shifted cap. The uncorrected variants exposed thin raised seams and are not valid promotion candidates.

| Variant | Core % | Slope | Flank | Relief8 | Beta | Fill | Pits025 | S | Capped % | Cold ns |
|---|---|---|---|---|---|---|---|---|---|---|
| v1 | 36.374 | 23.5 | 14.3 | 1505 | 2.3 | 0.007 | 0 | 0.366 | 21.052 | 389.1 |
| v2 | 26.793 | 21.1 | 13.2 | 1287 | 2.17 | 0.008 | 5.6 | 0.366 | 9.703 | 477.3 |
| v3 | 19.76 | 17.9 | 11.6 | 1120 | 2.06 | 0.01 | 22.9 | 0.361 | 5.025 | 439.6 |
| v4 | 32.744 | 20.8 | 13.4 | 1460 | 2.28 | 0.006 | 0 | 0.344 | 13.273 | 394.7 |
| v5 | 22.502 | 10.4 | 10.6 | 1221 | 2.16 | 0.005 | 0 | 0.278 | 16.475 | 461.4 |
| v4b | 31.94 | 20.3 | 13 | 1415 | 2.29 | 0.006 | 0 | 0.339 | 12.889 | 417.2 |
| v5b | 21.504 | 8.7 | 10.4 | 1162 | 2.21 | 0.005 | 0 | 0.272 | 16.252 | 630.9 |


v1 is retained. Lower K reduces the capped share but also removes relief and steep area. Shifted caps expose smooth clipped flanks and still lose relief. No variant removes the grid-like texture. This is the stop condition; no further parameter sweep was run.

## Final measurements

The gate uses `candidateMetrics`: core >30 share on |across| <=19.5 km, with the other rows from `measureSites` and `judgeM3`. Only the pooled table gates. Each per-seed table is measured independently. All metric definitions, controls, thresholds, pins and goldens are frozen and untouched.

Bounds in column order: >=25%; >=20 degrees; >=12 degrees; >=1500 m; 2.0-2.6; <=.05; <=50; .14-.64.

| Site | Core >30 % | Slope | Flank | Relief8 m | Beta | Fill | Pits025 | Axis S |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Pooled | 36.374 | 23.5 | 14.3 | 1505 | 2.3 | 0.007 | 0 | 0.366 |
| 730201 | 38.333 | 24.3 | 14.9 | 1501 | 2.12 | 0.009 | 0.9 | 0.36 |
| 730202 | 35.807 | 23.2 | 14.4 | 1515 | 2.23 | 0.007 | 0 | 0.332 |
| 730203 | 35.743 | 23.3 | 14.3 | 1483 | 2.35 | 0.007 | 0.4 | 0.437 |
| 730204 | 36.539 | 23.6 | 14.4 | 1510 | 2.16 | 0.007 | 0 | 0.385 |
| 730205 | 37.171 | 23.7 | 14.3 | 1481 | 2.38 | 0.006 | 0 | 0.387 |
| 730206 | 37.294 | 23.7 | 14.5 | 1516 | 2.45 | 0.008 | 1.3 | 0.358 |
| 730207 | 34.906 | 23.1 | 13.8 | 1469 | 2.26 | 0.006 | 0.4 | 0.333 |
| 730208 | 35.199 | 22.9 | 14.3 | 1505 | 2.38 | 0.007 | 0 | 0.36 |

Relief fails on 730203 (1483 m), 730205 (1481 m) and 730207 (1469 m). These seeds pass the other seven rows. The pooled relief margin is only 5 m; it is not robust success. Coherence (.366) and pits (0) are comfortably inside their calibrated bounds.

Coast safety: 297992 samples, including 111168 outside the belt. **0 violations, 0 positive carvings, 0 nonzero outside the belt.** The script calls the existing `coast()` function unchanged.

Mean capped share of completed representative blocks: **21.052%**. Per seed: 21.133%, 21.085%, 20.468%, 21.593%, 20.262%, 21.147%, 21.922%, 20.804%. The requested few-percent cap target was not achieved.

Retention is INFO, with the existing point-sampled proxy and no production peak correction: **L6 79.419%; L8 81.436%**.

## Memory and determinism

There are 32 completed slots and 64 raw slots. Every lookup compares exact seed, half-width and block ID, including tiny half-width differences. A collision rebuilds. Cached canonical boundaries also accelerate ownership queries without changing their arithmetic.

At capacity: **11,660,544 block bytes + 4,306,970 persistent scratch bytes = 15,967,514 bytes**. This is a conservative typed-array total; shared boundary arrays are counted twice. Object/array headers and C's separate unchanged memo are excluded. Scratch is retained even when E is unused. HARD tests pin the payload below 16,000,000 bytes.

Both E digests agree cold, warm, in reverse order, after eviction and in a child process:

| Field | SHA-256 |
|---|---|
| E small | `a3525677192ee90c0cbd2596c3f2386ff517eb418aced2fabe4748825812706d` |
| E production | `0d30ef01047e9d07e4d69bd1de4897db329aebdd5619e55c692f1007569b1419` |
| C small, original and fast path | `e40c2a40fa6437176b8e58517ec811be1759ddba346afc06eb14f4a2ec5ddf06` |
| C production, original and fast path | `cc97b80ffec00b6f028bbddee57b4c0c196cb0cba575ed2722f4bb7cf3f85416` |

Final source SHA-256: `0c93ae8801a40ab85d658957f0d0ee42b78b884f8fc4288a58436e4cedd05467`.

## Cost (INFO)

The final benchmark ran once, after all other implementation workloads stopped. It uses the same method as `benchmarkC`: 8 sites x 385 x 385 samples at 125 m, empty memos, then a second pass and individually resident sites. The terrain reference is `terrainSampler(maithea())` on Fibonacci directions in the same process. The script did not acquire the machine-wide CPU-quiet lock. The coordinator must rerun it on a quiet CPU.

| Workload | ns/sample | Raw block builds |
|---|---:|---:|
| Empty cache | 365.448 | 51 |
| Second pass | 129.910 | 11 |
| Resident warm | 67.378 | 0 |
| Terrain reference | 477.997 | — |

Median block build: **6.3124 ms** across seven blocks. Cold build time totals **341.1827 ms**. There are **1,185,800** timed samples per workload. Timings include cold initialization; resident preloading is outside the timer and produces zero timed builds.

Weighted cold proxy: **7.645%**, below 8%. Weighted resident proxy: **1.410%**. These are proxies at 10% belt share, not assembled terrain slowdowns. The cold result has only 0.355 percentage points of headroom. The command exits 0 for an INFO report; the measured budget also passes. No second final benchmark was run.


## Visual self-review (VISUAL-ADVISORY)

I inspected the final [48 km hillshade](../test-results/mountains/M3-r5/E/E-hillshade.png), [flow map](../test-results/mountains/M3-r5/E/E-flow.png), and [192 km x 60 km strip](../test-results/mountains/M3-r5/E/E-strip-192km-hillshade.png). I also inspected v1, v2, v4 and v5 strips while diagnosing the variants.

**Artificial at first sight.** Branching valleys and confluences are visible. C's prescribed low trunk gutters are absent, but the new spur divides appear as conspicuous broad raised ribbons. They repeat with block spacing. The crest remains a straight horizontal line with capped stretches. Hillslopes contain obvious stair-step facets and comb-like tributaries. The flow map contains many grid-aligned segments. Broad smooth aprons alternate with sharply incised fans. Numeric continuity does not remove these patterns. No geomorphologist approval or independent visual vote is claimed.

## Verification and scope

| Command | Class | Exit |
|---|---|---:|
| `node --test tests/mountain-carving.test.mjs tests/mountain-metrics.test.mjs` | HARD / CONTRACT controls | 0 |
| `node node_modules/typescript/bin/tsc --noEmit` | HARD | 0 |
| `node scripts/mountain-render-carving.mjs --candidate E` | CONTRACT pooled + coast; retention INFO | 0 |
| `node scripts/mountain-render-carving.mjs --candidate E --bench` | INFO cost advisory | 0 |
| `git diff --check` | HARD | 0 |

The final combined test run passed **38/38 in 1817.7493 ms**. The carving file accounts for 18 tests and remains below the approximately 3 s allowance. Its existing test prefix is byte-for-byte unchanged after normalizing line endings. A read-only comparison confirms unchanged A2/B arithmetic and unchanged C helpers except the optional trunk/interpolation arguments. The frozen helper and metric-test diff is empty.

Development failures were repaired: an interpolation callback name collided with a local variable; literal-inferred options initially failed type checking; the old C child exceeded the Windows argument limit; a new seam test crossed a triangle corner at its largest probe distance. The seam test now uses smaller distances and checks convergence. The failed runs are retained in development logs. They are not claimed as passes.

Changed files: `src/mountain-carving.ts`, appended tests in `tests/mountain-carving.test.mjs`, `scripts/mountain-render-carving.mjs`, and this document. Generated evidence is under `test-results/mountains/M3-r5/E/` and is gitignored. The factorial and variant tables are copied here so their findings remain reviewable in the tracked diff.

Not done: commit, .git writes, dispatcher switch, assembly, downloads, installs, browser, GPU, full suite, push or deployment. No skill, sub-agent or external service was used. The coordinator must review the diff and rerun the cost on a quiet CPU.

## Coordinator findings (2026-10-05): M3 stays BLOCKED

Decision: no candidate is promoted. A2 stays the dispatcher. Nothing is merged to main. No row,
threshold, control, pin or golden was changed beyond the owner-authorised calibration of rows 7/8
(commit `c4c813d`, `docs/mountain-m3-calibration-v1.md`).

The calibration worked as intended. Under the calibrated rows, three candidates pass all eight
pooled rows: A2, C and E. Each one fails something else that this element must also pass:

| Candidate | Eight pooled rows | Per-seed relief8 | Cold cost proxy (8% budget) | Hillshade |
|---|---|---|---|---|
| A2 (pointwise cones) | pass (S .225, pits025 6.5) | not measured | about 57% (2628 ns/sample) | snowflake cones, artificial |
| C (125 m blocks, trunks) | pass (relief8 1565, S .406, pits025 0) | 3 of 8 seeds fail (1452-1493) | 13.3% | evenly spaced trunk gutters, flat straight crest |
| D (250 m, walls) | relief8 1448 fails | 7 of 8 fail | 8.5% | boundary notches, capped crest bands |
| E (250 m, spurs) | pass, relief8 1505 by 5 m | 3 of 8 fail (1469-1483) | 7.65% (Astra run, not quiet CPU) | raised spur ribbons at block spacing, straight crest, stair steps |

Coordinator visual inspection (E 48 km hillshade and 192 km strip): artificial at first sight. Each
15 km block reads as a separate lobe with smooth raised ribbons between lobes. The crest is a
straight capped line. Stair-step facets are visible. I agree with Astra's verdict.

Luna (VISUAL-ADVISORY): question `q-natural-eroded`, manifest
`test-results/mountains/M3-r5/luna/m3-carving.json`, 3 asks per image. Controls: the eroded control
PASS 3/0/0; all four bad controls (A2, B, C strip, D strip) FAIL; but both steady-state stream-power
strips FAIL as "repeated pattern". The question is therefore **UNCALIBRATED**: its FAILs cannot be
cited. E 48 km hillshade FAIL 0/3/0 and E strip FAIL 0/3/0, both "repeated pattern", recorded only.

What five rounds show (A0-A2/B, C, D, E):
- The drainage-network-first family is the only one that produces the calibrated rows with real
  dendritic structure. The whole-strip probe without blocks (`M3-r4/probe/sw6`) looks best.
- Every tile-independent version solves drainage per along-axis block. The block solve leaves a
  visible rhythm at block spacing: gutters (C), notches (D) or ribbons (E).
- Removing the rhythm needs either a seam-free solve (haloed blocks whose overlaps agree) or much
  larger blocks. Both multiply build work. The optimised builder still costs about 23 ms per 125 m
  block (it reproduces C bit for bit, so it is correct, but heap work dominates). The cold cost
  proxy only fits at 250 m, and 250 m shows stair steps and loses relief.
- The straight capped crest comes from capping at the straight synthetic ramp. Lowering K reduces
  the capped share but loses relief and steep area (E v2/v3).

Owner items (not decided here):
1. Whether the cost advisory may be judged on the resident cost per region (C 1.5%, E 1.4%)
   instead of the cold first-touch proxy, given "precompute/cache per region".
2. Whether a haloed, seam-free 125 m block solve with that cost is acceptable; that is the next
   structural step, not another parameter sweep.

Source caveat for any next round: to fit the C child-process test under the Windows command-line
limit, Astra removed comments and type annotations from the existing A2/B/C source on this branch
(arithmetic and pins unchanged). Restore them from `c4c813d` and pass the source to the child via a
file or stdin instead.

Coordinator checks on this branch: `node --test tests/mountain-carving.test.mjs
tests/mountain-metrics.test.mjs` 38/38 exit 0; `tsc --noEmit` exit 0; `git diff --check` exit 0.
Not run by the coordinator: the E acceptance and cost benchmark again (Astra ran each once, exit 0;
the cost was not re-measured on a quiet CPU because E is not promoted), `test:affected`, `test:full`.
