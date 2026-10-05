# Mountains: decisions on the blocked steps (2026-10-05)

**Decided by Opus 5.5 on Kasper's instruction of 2026-10-05, not by Kasper; he can overrule any of
it.** Kasper's instruction routes coordinator questions to Opus. His standing bans stay in force here:
no push, deploy or previews; no downloads or licence acceptance; no CONTRACT pin, budget or golden
loosened without a documented ledger; no invented measurements. Where a number below is a projection,
it says so and gives the arithmetic. Everything else is quoted from the evidence.

Evidence read (main `90fdf1c`):

- `docs/mountains-design-2026-10-04.md` (owner decisions (a)-(g), verbatim);
- `docs/mountains-grain-step-g-2026-10-05.md`;
- `docs/lod-ladder-contract-v1.md`;
- `docs/mountain-carving-f-v1.md`;
- `docs/mountain-summits-v1.md`;
- `docs/mountain-layout-v1.md`;
- `docs/mountains-assembly-2026-10-05.md`, which covers branch `mountains/assembly-2`: `2744237` M1+M2
  wired, `92afaa3` +M3, `ed3607c` unwired, merged;
- `docs/mountains-assembled-check-2026-10-05.md`;
- branch `mountains/m0c` `f62be0e`, `test-results/mountains/M0-v3/results.txt`.

## Q1. M0 (MTN-1): close as NOT MET, superseded for its purpose by step G; not a dependency of MTN-6

**Decision.** MTN-1 is closed with the status **NOT MET**. Metric 2 stays as written and is recorded
as failed. No comparator is changed, and the result is not relabelled as a pass. MTN-6 no longer
waits on M0. No M0 footprint code merges, and `LOD_LADDER_VERSION` does not move for M0. M0 reopens
as a class/coast-edge element only if the reopen trigger below fires.

**Reasons, measured:**

- Metric 2 compares a reduction with the point value on the same field. On the step G field, the best
  estimator within the build budget reaches 0.924 of point on Maithea L6->7 (midpoint box K=2:
  10.462 / 11.323). The near-exact footprint mean reaches 0.925 (box K=8: 10.478). The bound is <= 0.9
  (10.190). Only the LS reduction passes (8.746 = 0.772). It costs 4x the colour samples and makes
  L5->6 worse by 37% (by 15% with LS at L5 too). The Lethuris L6->7 row passes with any L6+L7 filter
  (corner 0.782), but the corner filter makes L7->8 or L8->9 worse.
- Scoring step G against the old terrain would change the comparator from "same field" to "old
  field". That is a different metric, chosen after seeing the result. I reject it.
- The purpose behind M0 was to stop steeper mountains from breaking the L6 colour pins, and step G
  serves that purpose without any estimator cost:
  - L6 RGB p99 went from 19.378 to 11.323 on Maithea and from 34.916 to 17.152 on Lethuris (the
    M0-v3 crossPair numbers), and every pair improved;
  - on the test's own cells: Maithea L6 26.257 -> 15.183 (pin 26.3), Lethuris L6 39.170 -> 20.540
    (pin 39.2), Lethuris L8 11.051 -> 5.244 (pin 11.1).
- What remains is the tail of class and coast edges at the 996 m colour texel (attribution: the
  snowline, coast and range tiles). A footprint mean barely reduces it (box8 removes 0.85 RGB).
  Building a new element for it is only justified if mountain tiles show it.

**Reopen trigger.** MTN-1 reopens as a class/coast-edge element under these conditions:

- a cell of the massif-tile LOD set from Q6/T6 has a colour or class value above the ceiling of the
  same row in `SHIPPED_CEILINGS`, or above the §5 strict target where no ceiling exists; or
- Kasper decides A3.

**Recorded as never measured:** M0 metric 3 (per-octave height retention).

## Q2. Assembly cost: carve only where the lattice can hold it, and reject M1 cheaply; keep the +8% warm budget

**Decision.** Keep the warm budget at +8% (decision (c)) and the contract build budget at +10% per
level (`LOD_BUDGETS`, contract §6). Neither is loosened. The cost is fixed in three places:

1. **M1:** a value-preserving rejection grid, so that nearly every sample outside a massif skips the
   foot-point solve.
2. **M1:** a cheaper foot-point solve inside massifs.
3. **M3:** a declared coarse-level reduction, so that sparse or coarse sampling never solves a block.

**Rejected options:**

- **Persisted or precomputed blocks.** The arithmetic from measured numbers: at the fixed 48 km
  carving width, d = 200 m, so one block covers 128 x 200 m = 25.6 km along the belt and stores
  248,196 B. One Maithea major belt is 2 x (.72-.90) x 5195 km = 7,481-9,351 km long (M1 construction
  constants). That is 292-365 blocks: 72-91 MB and 41-51 s of solving at about 140 ms per block, for a
  single belt. This conflicts with "no new texture bytes" and with streaming budgets.
- **A larger LRU alone.** Astra found that it cannot make a first-touch miss cheap.
- **A different budget now.** Neither of the measured causes forces a looser budget:
  - the outside-massif branch costs +122% on Maithea (517 -> 1149 ns), which is avoidable work;
  - cold block solves come from sparse consumers sampling detail that their own lattice cannot hold.

**Why the M3 coarse rule is allowed by the contract:**

- Contract §1 lets a coarser level be a *declared reduction* of the finer one.
- `CARVING_BANDS` declares M3's longest wavelength as 16 km.
- A level whose lattice samples a 16 km wavelength with fewer than 4 vertices cannot hold the carving.
- Carving = -envelope x (1 - retained) <= 0. So the uncarved surface U is pointwise >= the carved
  truth, and the reduction is an upper envelope. That matches §3: heights are only raised, and the
  coarse surface is a conservative upper envelope.

**Rule.** Carving is evaluated at level L only if the lattice Nyquist 2 x edge(L)/32 is at most 8 km
(half of the 16 km band), which means edge(L) <= 128 km. At coarser levels the carving is exactly +0,
and so are the peak-correction cell-centre samples of those tiles. By arithmetic from the contract's
edge formula, carving starts at:

| World | Carving starts at | Edge at that level | Coarser levels |
|---|---|---|---|
| Maithea | L6 | 127.5 km | L0-5 uncarved |
| Selawyn | L7 | 104.9 km | |
| Raiva | L5 | 98.3 km | |
| Lethuris | L7 | 110.4 km | |

The truth sampler (no level given) is unchanged. Collision and place queries keep full detail
(contract §8).

**Projection for M1, arithmetic, not a measurement.** Use Astra's weighted formula with the measured
Maithea M1+M2+M3 values (s = 2.27%, region main 557 ns, outside main 517 ns, in-massif branch
3441 ns) and assume the grid brings the outside branch to +3%:

- the weighted overhead is still **+15.6%**;
- reaching +8% needs the in-massif branch at <= ~1,714 ns, against 3,441 ns now;
- Maithea is the binding world (Raiva's limit by the same arithmetic is ~2,376 ns).

T1 alone therefore cannot meet the budget. T2 is planned, not conditional.

### Ordered task list

Branch `mountains/assembly-3` from main. File ownership is disjoint inside each step. The wired state
of `92afaa3` is the starting point for terrain.ts.

| # | Task | Owner files | Measurable target (all measured, CPU-quiet lock taken, fresh process per world) | Versions / pins moved |
|---|---|---|---|---|
| T1 | **M1 massif-band rejection grid** (value-preserving). Per-body cube-map bitset (start at 6 x 512²; resolution chosen by measurement) of cells that may lie within `maxDistM` (= `MAX_HALF_WIDTH_M` 48 km) of any belt centreline. Built once in the layout memo by conservative stamping of dense centreline nodes, inflated by half the node spacing plus the cell diagonal. New entry point `sampleWithinWithA0(d, a0, maxDistM, out)`; `sample`/`sampleWithA0` keep their meaning. | `src/mountain-layout.ts`, `tests/mountain-layout.test.mjs`, new `tests/mountain-layout-grid.test.mjs`, `src/mountain-assembly.ts` (call site) | (1) Bit-identical to the ungridded path on 4 x 102,500 directions plus 20,000 per corpus body, including offset points near the 48 km edge. (2) Conservativeness: 0 directions with `|axisDistanceM| < maxDistM` in an unflagged cell. (3) Flagged area <= 1.5 x massif area per world. (4) Outside-massif branch <= +3% against main per world. (5) Grid build <= 50 ms per body. | None. `orogen-layout-1` stays. Output-neutral, with the 4096-sample M1 digest unchanged. |
| T2 | **M1 cheaper in-massif foot point.** Start Gauss-Newton from a per-grid-cell seed `u0` and use the analytic derivative instead of the central difference. Keep a fixed step count (no data-dependent exit), with the count chosen by measurement. | `src/mountain-layout.ts`, its tests, `docs/mountain-layout-v1.md` | (1) All four M1 plan gates, strict coherence and the coordinator's 1% distance gate on 4 worlds + 60 bodies, with thresholds unchanged. (2) Maithea in-massif warm branch <= 1,700 ns/sample. (3) Weighted warm resident (`scripts/mountain-assembly-cost.mjs`) <= +8% on all four worlds, with M1+M2+M3 wired. | `OROGEN_LAYOUT_VERSION` -> `orogen-layout-2`. The M1 element digest is re-pinned in its own test, with old and new values in the M1 doc (element ledger). The M4 whole-core R1 is re-run (Q4). |
| T3 | **M3 coarse-level rule** (declared reduction, above). `carvingFromLevel(R)` is an integer loop in the style of `contactLevelFor`. `terrainSampler(body, {lodLevel})` passes the level to `mountainRidgeTermM`, which returns the uncarved composition below the cut. `buildTile` passes `tile.level`, also for its peak-correction samples. | `src/lod-ladder.ts`, `src/mountain-assembly.ts`, `src/terrain.ts` (sampler option and wiring hunk only), `src/planet-tiles.ts` (level pass-through only), `docs/lod-ladder-contract-v1.md` §3 amendment, new `tests/lod-carving-reduction.test.mjs` | (1) 0 block solves (`carvingBuildStats`) while building every L0..cut-1 tile on all four worlds. (2) Maithea 6 x L0 cold <= main +10% (main 192 ms). The per-level build mean at L0..cut-1 is <= main +10% on all four worlds (contract §6). (3) Truth sampler (no level) digest equal to `92afaa3` on every tested direction. (4) Upper-envelope check: uncarved >= carved, 0 violations. (5) The L(cut-1)->L(cut) cross-level cells on the massif tile set are reported as INFO. | `LOD_LADDER_VERSION` -> `lod-ladder-2` (a new declared reduction; every §5 tolerance unchanged). `MOUNTAIN_ASSEMBLY_VERSION` -> `mountain-assembly-2`. The version-string pins in `tests/lod-consistency.test.mjs` and `tests/acceptance/version-compat.test.mjs` move, with an old/new ledger. No `SHIPPED_CEILINGS` value changes. |
| T4 | **Sparse-consumer audit.** Classify every `terrainSampler` caller outside terrain.ts: `planet-renderer` (3), `planet-tiles` (2), `planet-forest` (2), `ocean-volume` (2), `place-query`, `surface-survey`, `forest-census`, `travel`, `world-surface`. Each is either *dense-local* (truth is fine) or *sparse-global*. A sparse-global caller passes level 0 (the S0 reduction) or is documented with its measured block-solve count. | the listed caller files, level argument only | (1) Block solves = 0 during the orbit bake, ocean-volume, survey and golden capture, unless documented with a count. (2) Orbit bake <= main +5% (`orbitBakeGrowth`). (3) Every default `npm test` file whose wall time more than doubles is listed with its cause. | `SURVEY_VERSION` only if a survey value moves (expected with the wiring anyway). |
| T5 | *Conditional,* only if (C3) below fails. **M3 block geometry** (value-preserving): CORE 128 -> 256 or 512 columns with HALO 192 unchanged, and the LRU sized to one L(cut) tile frontier. | `src/mountain-carving.ts`, the memo tests | M3 pinned digest `1321803f...` unchanged; 0 differing seams; the memo bound test is updated in step. | None (value-preserving). |
| T6 | **Assembled check on the rewired branch** (design §3) and the merge. | coordinator | Every HARD and CONTRACT row of §3, re-run with M1+M2+M3 wired: identity pins, 17/17 pins and 96/96 cells, SITE_A, hypsometry, coast, render bounds, `test:affected`, then `test:full` once. In addition, the new massif-tile LOD set (Q6). Cost rows (C1) to (C3) below. | `TERRAIN_VERSION` -> `terrain-1.9.0-mountains`. The design §4.1 list confirmed by `test:affected`. One planned golden re-pin (terrain, combined, and placeQuery/census by version string) with old/new digests. SITE_A moves only through the documented search. |

**Cost acceptance for the merge:**

- **(C1) Warm:** weighted resident overhead <= +8% on all four worlds.
- **(C2) Coarse, cold:** contract §6 holds at L0..cut-1, and Maithea 6 x L0 <= 211 ms (main 192 ms
  +10%), against 335-461 s now.
- **(C3) Carved levels, cold:** first touch is non-blocking under decision (c). It is reported per
  level: the tiles that touch a massif, block solves per tile and ms per tile. One decision bound
  applies: **no single tile build above 2 s cold in Node**, because tiles build in
  `planet-worker.ts` and the bound limits a worker stall. T5 runs only if this bound fails.

**Escalation (the only one in Q2).** If (C1) still fails after T1 + T2, the budget question goes to
Kasper with the numbers. I do not loosen it.

**Not run:** the Luna sheet. It needs a local app preview, which Kasper's ban on previews excludes.
It is VISUAL-ADVISORY and UNCALIBRATED anyway, so it is recorded as NOT RUN.

## Q3. The 48 km massif cap: accept for this assembly

**Decision.** Accept `MAX_HALF_WIDTH_M = 48000` on every belt for terrain-1.9.0. It is recorded as a
deviation from the wording of (g), "tiled across wide belts".

**Reasons:**

- (e) forbids loosening or re-pinning. Maithea snowline tile 0 (frozen selection) lies 123 km from
  the axis of a 220 km belt, and its L7 child lies at least 58 km from the axis. Maithea L6
  `carriedName` has 0 spare cells (3.491 against 3.5). Any massif reaching 58 km breaks it; the v1
  envelope moved L8 name/carried from 0/0 to 32/42 cells.
- The goal (g) names, R1 >= 8 on the real parameters of all four worlds, is met with the cap (Q4:
  41.00 / 22.78 / 8.59 / 39.41).
- A strip layout tuned to avoid one frozen tile would game the pin.
- The consequence is accepted and stated plainly: Selawyn's outer 48-220 km keeps main's soft ridge
  term, so a wide belt reads as one 96 km range inside a soft upland.

**Owner-only item.** Parallel ranges across wide belts are not possible without moving class pins.
Only Kasper can authorise that, so the item is parked for him and is not a coordinator task.

## Q4. R1 method: whole core binds; axis and flank rasters become INFO

**Decision.** The binding R1 is the whole-core measurement: one 513 x 125 m raster (64 km) per seed,
covering |y| <= .65 x 48 = 31.2 km, 8 seeds, prominence >= 300 m, border-censored. The 48 km axis and
flank rasters are reported as INFO.

**Reasons:**

- This is MTN-5's pre-registered definition, not a new one. `docs/mountain-summits-v1.md` defines R1
  as summits whose cells have |y| <= .65w, divided by the core area.
- At the fixture's w = 32 km the 48 km raster (±24 km) contained that whole core (|y| <= 20.8 km). At
  w = 48 km it does not, so the 64 km raster restores the original definition.
- The flank raster samples mostly s = .4-.65, the weakest part of the envelope. It is a sub-sample,
  and the design never made it a row.

**Margin.** Raiva passes with 8.59 (275 summits over 31,998 km²), 7% above the bound. Two guards:

- keep the CONTRACT pin and the bare-envelope negative control in
  `tests/terrain-mountains-assembly.test.mjs`;
- re-run R1 after T2, because axis distances change in the last bits; T2 is not accepted if Raiva
  falls below 8.

## Q5. Freezing the Maithea retention edge selection: accept

**Decision.** Keep the 32 frozen retention edge tiles in `tests/helpers/lod-frozen-selection.mjs`.

**Reasons:**

- They have the same defect that (e) fixes for the stratified tiles: `edgeDirections(ts, cls, 32)`
  re-picks on the live field, so a mountain change could move the retention rows (85% L6, 95% L8)
  through selection alone.
- Freezing changes no threshold and no value on main.
- It reproduces main exactly, round-trip checked by the coordinator and by Astra.
- Provenance is asserted (`FROZEN_SELECTION_SOURCE`).

**Known cost, and how it is handled.** The frozen points may drift off live edges, and none of the
frozen tiles touches a 48 km massif. So the frozen set is complemented by the massif set in Q6
(INFO). It is not replaced.

## Q6. README and other consequences

1. **README.** The coordinator replaces the "Mountains: element round" section of README with this
   status:
   - M1, M2 (massif-envelope-2) and M3 (candidate F, mountain-carving-2) are merged and unwired;
   - M4 passes on the fixture and, whole-core, on real parameters (41.0 / 22.8 / 8.6 / 39.4);
   - M0 is CLOSED NOT MET (Q1);
   - MTN-6 step A is PARTIAL: all terrain rows pass when wired, and the wiring is not merged because
     of cost (warm +108-156%, cold L0 335-461 s);
   - the cost plan is T1-T6 of this document;
   - the sentence "terrain on main is byte-identical to `b8d38d3`" is false since step G and is
     removed.

   This document does not edit README, because README belongs to the coordinator.
2. **The frozen pins do not exercise mountain terrain.** The assembly doc says so: "No frozen pin
   tile touches a 48 km massif". Before the wiring merges (T6), the coordinator therefore freezes a
   *massif tile set*: 12 tiles per world on Maithea and Lethuris, picked once on the wired branch by
   a rule that reads only M1 (the axis at 8 well-separated stations), never heights.
   - Its cross-level and retention cells are measured and recorded as **INFO**.
   - No ceiling is set from it. That remains Kasper's A3/Q3 decision.
   - It is the trigger input for reopening M0 (Q1).
3. **Retention.** The synthetic M3 proxy kept 79.3% at L6 (point-sampled, no peak correction),
   against 85%, while the frozen tiles keep 89.62%. The massif set will show which applies to
   mountains. Q3 (the retention reference) stays Kasper's question.
4. **Versions.** The planned golden re-pin at T6 is the design's single MTN-6 re-pin and needs an
   old/new ledger. `lod-ladder-2` is taken by T3, so a reopened M0 would become `lod-ladder-3`.
5. **Unchanged and still open for Kasper:**
   - A3 (strict colour/class targets);
   - Q3 (retention reference) and Q4 (old ridges outside belts; the default "keep" stays);
   - MTN-7 label sign-off and the real-DEM download (no download without his authorisation);
   - A6/A7 landing;
   - the M3 straight main divide (the crest-wander option exists, not adopted);
   - the parallel-range item from Q3;
   - the budget escalation in Q2, only if it triggers.

## Ledger

**Nothing is loosened by these decisions:**

- no `SHIPPED_CEILINGS` value, contract tolerance, budget, M1-M4 threshold or golden changes here;
- M0 metric 2 stays and is recorded as failed;
- T3 adds a declared reduction with every tolerance kept and is documented as a contract amendment;
- T2 re-pins one element digest with old/new values.

The version moves this plan will cause are listed per task in the table above.
