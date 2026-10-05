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

## Addendum 2026-10-05: Astra review of open problems

**Decided by Opus 5.5 on Kasper's instruction 2026-10-05; he may overrule.** The items below are
**binding instructions for the remaining tasks** (T2-T6 and M5). Where they conflict with the task
table above, this addendum wins.

Source: a read-only Astra (Codex `gpt-6-astra`) review of main `1dbf2c2`. Astra can be wrong. Every
statement below was checked against the files on main `1dbf2c2` before it was written; the check is
named in each item.

### 1. T3 bug: the parent mesh must use the parent's level rule

**Defect, verified.** `buildTile` (`src/planet-tiles.ts`, line 131) creates one sampler,
`terrainSampler(body, ...)`. `parentPoint` (lines 245-254) reconstructs the parent triangles through
`vertexPoint`, which uses that same sampler. If T3 only passes `tile.level` into that one sampler, a
child tile at the cut level L(cut) builds its parent mesh with the child's carving. The parent
mesh then differs from the real L(cut-1) tile, which is uncarved, and the morph starts from a surface
that was never displayed.

**Binding for T3:**

- Build parent and child with the **same carving state per level pair**: child vertices sample at
  level L, parent vertices (`parentPoint` and its `vertexPoint` calls) sample at level L-1 under the
  L-1 rule. Use two samplers, or one sampler with a per-call level, with **separate cache identities**
  per level. A shared cache keyed without the level is a bug.
- Add to `tests/lod-carving-reduction.test.mjs` an **edge/seam test across the switch level** on
  massif tiles of every world (L(cut-1) -> L(cut)):
  1. the child's parent-mesh endpoints equal the vertices of the actually built L(cut-1) tile
     (exact, or within the contract's existing tolerance; no new tolerance);
  2. shared edge vertices between a neighbouring L(cut-1) tile and L(cut) tile agree under the
     contract's existing seam rule;
  3. a mutation control: the same test with the parent sampled at the child's level must fail.
- Report the mean-height step at the cut on massif tiles as INFO. If it is visible, the agreed
  mitigation is a cheap coarse mean-carve term, not a change of rule.

### 2. The mountain tile set must contain real mountain tiles

**Verified.** `docs/mountains-assembly-2026-10-05.md` line 180: "No frozen pin tile touches a 48 km
massif". So the "17/17 pins, 96/96 cells" results say nothing about mountain LOD.

**Binding for T6:**

- The Q6 massif tile set must be shown to be mountain terrain: for every tile, record its M1 axis
  distance and at least one sample with `|axisDistanceM| < MAX_HALF_WIDTH_M`. A tile that fails this
  is replaced by the selection rule, never kept. Include flank and belt-end tiles, not only axis
  tiles.
- Its cross-level, colour, class and retention cells are **report-only** limits for now. No ceiling
  is set from them and no merge is blocked by them.
- Whether those limits should **block** (A3) is **OPEN for Kasper**. It is flagged in
  `docs/owner-decisions-2026-10-04.md` under A3.
- **The 96/96 cells result (and the 17/17 pins) must not be cited as mountain evidence** in any
  report, README line or merge message. Cite it only as "no regression outside the massifs".

### 3. Overfitting caveat and a calibration doc correction

**Verified.** F's parameter search (`docs/mountain-carving-f-v1.md`, lines 111-127) selected
settings against the same 8 seeds (730201-730208) and the same thresholds that F reports as passing
(line 75). The R1 measurements in `docs/mountain-summits-v1.md` and in the assembly doc use the same
seeds. Those results are training evidence, not held-out evidence.

**Binding for T6:** evaluate the M3 rows and R1 on **8 fresh seeds that were never used before**,
for example 730301-730308 (a `git grep` on `1dbf2c2` finds no use of them as seeds). Fix the seeds
before measuring, say so in the report, and report the old seeds and the fresh seeds as separate
columns. Do not tune anything on the fresh seeds. If a row fails on the fresh seeds only, report it
as a failure; do not re-pick seeds.

**Correction, verified and fixed in this commit.** `docs/mountain-m3-calibration-v1.md` line 105
said that six resampled steady-state positive controls exceed fill 0.05. The table on lines 64-75
shows **8 of 12** (0.057, 0.059, 0.057, 0.059, 0.058, 0.058, 0.058, 0.051). The text now says
eight. The fill row stays INFO and unchanged.

### 4. Decision-record completeness: scope changes not stated before

The ledger above says "Nothing is loosened". That is true for thresholds, but these decisions also
**narrowed scope**, and the ledger must say so:

- **M0 no longer blocks** MTN-6 (Q1). MTN-1 is closed NOT MET instead of being a prerequisite.
- **Massifs are capped at a 48 km half-width** (Q3). Wide belts read as one 96 km range inside a
  soft upland; this deviates from the wording of decision (g).
- **Two summit counts became report-only** (Q4): the 48 km axis raster and the flank raster are
  INFO; only the whole-core R1 binds.

### 5. Follow-up tasks (not for this chain)

These are recorded here so they are not lost. The T2-T6/M5 workflow does not do them.

- **Harden `tests/known-failures.json`.** Verified: `classify` in `tests/helpers/test-runner.mjs`
  (lines 13-16) accepts any entry in `failures` by `title` and `file` only. A CONTRACT failure can
  therefore be allowlisted exactly like a timing flake. Add a required class field, and reject a
  CONTRACT-class entry that has no decision-record reference.
- **Keep branch `mountains/m0c`** (`f62be0e`, not merged into main) until the M0-v3 evidence it
  tracks (`test-results/mountains/M0-v3/`, 0 files on main) is copied into the repo docs or
  recorded by hash on main. The worktree-cleanup rule must not delete it before then.
- **Baked coarse macrofield** (a regenerable, seed-and-version cache of broad belt/uplift structure)
  is kept as the **fallback** if T2 misses its targets (in-massif branch <= 1,700 ns, weighted warm
  <= +8%). It is not a parallel study now. It changes terrain values if interpolated, so it needs a
  version move, and it does not remove M3's cold solves (T3 does). The Q2 escalation to Kasper still
  applies if (C1) fails.

## Addendum 2026-10-05 (2): T1 accepted at +3.8 to +5.4% outside massifs

**Decided by Opus 5.5 on Kasper's instruction 2026-10-05; he may overrule.**

**Decision.** T1 (`mountains/t1-grid`, `d783b70`) merges with its outside-massif cost at **+3.8% /
+3.8% / +5.4% / +4.6%** (Maithea / Selawyn / Raiva / Lethuris; median of 15 fresh processes against
main, CPU-quiet lock, `docs/mountain-layout-v1.md` "Band rejection grid"). Target (4) of T1 (+3%) is
recorded as **NOT MET and waived**. Every other T1 target passed: 0 identity mismatches, 0 unflagged
band directions, flagged/massif area 1.33-1.49 (<= 1.5), cold build <= 48.7 ms (<= 50), the 4096-sample
M1 digest unchanged and `orogen-layout-1` unchanged.

**Reasons:**

- The +3% was a planning number in the Q2 projection, not a pin or a contract budget. The binding
  constraint is (C1): weighted warm resident overhead <= +8% on all four worlds, judged after T2 with
  `scripts/mountain-assembly-cost.mjs`. That budget is **not** loosened.
- The measured breakdown shows +3% is out of reach for any per-sample scheme: the call, output reset
  and `a0 <= 0` check alone cost about +1.7%, and any table lookup on land samples adds +2-3%
  whichever layout was tried (octahedral, cube face branchy and branch-free, voxels). The harness
  without the band call reads 0.0 / -0.1 / +1.0 / +1.5%, so process noise is of the same order as
  the remaining gap.
- Without the grid the same call costs +83-137%; T1 removes about 96% of the outside-massif cost.
- T1 is output-neutral (no version move), so accepting it closes no option: a cheaper rejection can
  replace it later without touching any pin.

**Consequence for T2 (binding; it supersedes T2 target (2) in the task table).** With the measured T1
outside overheads, the in-massif warm branch Bin that keeps (C1) at +8% is, by the Q2 formula
`(s Bin + (1-s) Bout) / (s Min + (1-s) Mout) - 1 <= .08` with the M1+M2+M3 values of
`docs/mountains-assembly-2026-10-05.md` §5 (arithmetic, not a measurement):

| World | s | Min / Mout (ns) | T1 outside | Bin limit at +3% outside | **Bin limit at T1's measured outside** |
|---|---:|---|---:|---:|---:|
| Maithea | 2.27% | 557 / 517 | +3.8% | 1,714 ns | **~1,537 ns** |
| Selawyn | 1.11% | 602 / 457 | +3.8% | | **~2,360 ns** |
| Raiva | 1.72% | 602 / 604 | +5.4% | 2,376 ns | **~1,547 ns** |
| Lethuris | 1.16% | 541 / 444 | +4.6% | | **~1,871 ns** |

- T2's in-massif target becomes **<= 1,530 ns on Maithea and Raiva** (was 1,700 ns on Maithea), i.e.
  about -55% against 3,441 / 3,409 ns now. Raiva is now as binding as Maithea.
- (C1) itself is the acceptance row; the table only says where T2 must aim. The outside branch is
  re-measured by the cost script on the T2 branch, not taken from this table.
- If T2's foot-point work cannot reach this, T2 may in addition take Astra's idea (b), **amortised
  rejection per tile or batch** (one grid decision per tile or sample block instead of per sample),
  to win back the outside cost. It must be value-preserving and keep T1's identity and conservativeness
  tests. It is optional, used only if needed.
- The Q2 escalation is unchanged: if (C1) fails after T2, the budget question goes to Kasper with the
  numbers, stated as "weighted warm resident overhead X% on world W against +8%", and nothing is
  loosened by the coordinator.

**Ledger.** No threshold, pin, version or golden moves. One planning target (T1 (4), +3%) is waived;
one planning target (T2 (2)) is tightened from 1,700 to 1,530 ns. The 96/96 cells and 17/17 pins are
not cited here as mountain evidence (addendum item 2).

## T3 implementation record 2026-10-06 (not a decision; stated per addendum item 4)

Written by the T3 implementer (Claude Opus 5.5 with Astra review), not by the decision maker. Evidence:
`docs/mountains-t3-coarse-carving-2026-10-06.md`. Branch `mountains/t3-coarse`, **not merged**.

**Scope changes in T3 against the task table:**

- **Staged wiring.** The table put T3 on the wired branch. T3 instead carries the wiring hunk in
  `src/terrain.ts` behind `TERRAIN_MOUNTAINS_WIRED = false` plus a per-sampler `{mountains: true}` opt-in,
  so that it could merge into main with `TERRAIN_VERSION` and every golden unchanged. T6 wires by flipping
  the constant.
- **Truth-identity baseline.** Target (3) said "digest equal to `92afaa3`". After T2 (`orogen-layout-2`)
  that cannot hold for any T3, so the truth was compared bit for bit with main `914d86f` + the `92afaa3`
  wiring hunk (0 mismatches on 4 x 15,120 directions). The difference from `92afaa3` itself (max 7.0 mm) is
  reported as INFO.
- **Switch-level parent sampler** (addendum item 1) is in `src/planet-tiles.ts`, which is more than "level
  pass-through only".

**Targets:** (1) 0 block solves at L0..cut-1, MET (75,768 tiles). (3) MET against the baseline above.
(4) upper envelope, MET. Addendum item 1 seam test, MET on 8 cases (one cross-face case per world).
(2) Maithea 6 x L0: branch/main median 1.051, max 1.093 (12 runs), within +10% of main; the absolute
211 ms is exceeded in 9 of 12 runs because main measured 197-252 ms today. **(2) per-level build mean
<= main +10% (contract §6): NOT MET, +8.0% to +26.6%** under the contract's benchmark protocol on all four
worlds. Diagnosis: the residual is M1 + M2 per-sample cost on tile lattices (T1's rejection on every land
sample, M1/M2 inside belts), not T3 code (A/A control within +-3.6%).

**OPEN for the decision maker:** whether T3 may merge staged with target (2)'s per-level part open, and
what removes the M1 + M2 residual at coarse levels (for example a per-block or batch M1 rejection, Astra's
idea (b) in addendum (2)), or whether the per-level budget question goes to Kasper together with (C1).
Nothing was loosened. *(Answered by addendum (3) below.)*

## Addendum 2026-10-06 (3): T3 cost — bounded attempt, then merge staged with the mountains' coarse cost OPEN

**Decided by Opus 5.5 on Kasper's instruction 2026-10-06; he may overrule.** Evidence:
`docs/mountains-t3-coarse-carving-2026-10-06.md` sections 4 and 7, `test-results/mountains/t3/`.

**Question decided.** T3 (`mountains/t3-coarse`) met every target except contract §6's per-level build mean at
L0..cut-1 (+8.0..+26.6% against +10%, all four worlds). Choice: (a) merge staged with that target open, or (b) first
try a value-preserving reduction. **Decision: (b) then (a), in sequence, bounded to one Astra implement round and one
fix round.** The +10% (§6) and the +8% warm budget (C1) are not touched.

**What (b) produced (official, CPU-quiet slot, unchanged contract protocol, fresh process per world):**

- Diagnosis: the T1 per-sample rejection is only ~1.5% of the tile time, so a per-block batch M1 rejection (Astra
  idea (b)) cannot by itself recover 10+ points. Most of the excess is V8 compiling the terrain core worse when it
  only ever runs the mountain path (with a mountains-off arm in the same module the on/main growth fell to
  -8..+10%, outputs identical).
- Round 1 (`49c8bc3`, kept): value-preserving tile-builder and sampler-construction speedups. Against shipped main
  `914d86f`: **max growth +5.5% (Maithea L0), +2.2% (Selawyn), -1.0% (Raiva), -0.1% (Lethuris)**. Bit identity:
  pre-change tile and sampler SHA-256 guards unchanged, truth 4 x 15,120 directions 0 mismatches.
- But the mountains' own coarse-level cost is unchanged: mountains on vs this branch's own builder with the
  mountains off, same protocol: **+16.8..+32.6% per level on all four worlds** (Maithea +19.5..+31.9, Selawyn
  +19.7..+32.6, Raiva +20.0..+26.5, Lethuris +16.8..+27.2).
- Fix round (discarded): eleven core restructurings; best unofficial residual still +26.5..+30.7% max per world and
  a worse against-main margin (+8.6%). No reliable win, so no source change kept.

**Decision on the merge.** T3 merges **staged** (`TERRAIN_MOUNTAINS_WIRED = false`, output-neutral, `TERRAIN_VERSION`
and every golden unchanged; `LOD_LADDER_VERSION` -> `lod-ladder-2` and `MOUNTAIN_ASSEMBLY_VERSION` ->
`mountain-assembly-2` with the ledger in the T3 doc). Reasons:

- The §6 row as written, "build mean <= shipped +10%", holds against the shipped main `914d86f` (max +5.5%). I do not
  claim more than that: it holds **because** the builder speedups pay for the mountains.
- Staged, T3 changes no shipped value, closes no option, and removes the cold coarse cost (335-461 s -> ~210 ms for
  Maithea 6 x L0, 0 block solves on 75,768 coarse tiles). Holding it back gains nothing.
- **Carried OPEN into T6's gate, explicitly:** after this merge "shipped" includes the speedups, so the T6 wiring
  will be judged against the faster builder and will see the +17..+33% mountains residual. T6 does not pass §6 by
  pointing at this addendum. Either the residual is removed at T6 (the open V8 codegen problem: core `sample`
  1,535 ms on vs 641 ms off with relief split out, cause unresolved), or Kasper answers the question below.

**Question for Kasper (the only one here):** "Contract §6 says per-level build mean <= shipped +10%: at T6, is the
mountains wiring judged against main as it then is (with T3's value-preserving builder speedups; the mountains are
+17..+33% per coarse level against it) or against the pre-mountains build `914d86f` (wired is at most +5.5%
against it)?" Until he answers, the coordinator uses the stricter reading (main as it then is).

**Ledger.** No threshold, pin, tolerance, budget or golden changes. Version moves are T3's own (`lod-ladder-2`,
`mountain-assembly-2`). Scope stated per addendum item 4: T3's merge criterion (2) per-level part is recorded as met
only against `914d86f`, with the mountains' own coarse cost open. The 96/96 cells and 17/17 pins are not cited as
mountain evidence.
