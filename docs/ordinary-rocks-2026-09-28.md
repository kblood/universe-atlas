# Ordinary-game surface rocks and boulders — 2026-09-28

**Status: local, unaccepted candidate on branch `opus/ordinary-rocks-20260928`.
Not merged, not published, not deployed.** No browser or GPU was launched and
no timings were taken. Visual, device, performance and collision acceptance are
all open (see the end of this doc).

**Follow-up (same day, branch `opus/rock-budget-accounting-20260928`, based on
`4c392e6`):** bounded draw/cull traversal and combined memory accounting. See
[Follow-up: bounded draw traversal and combined accounting](#follow-up-bounded-draw-traversal-and-combined-accounting).
It supersedes the byte figures, draw description and "accounted separately"
statement in the original sections below; they are kept as the record of
`4c392e6`.

## Architecture and versions

| Layer | File | Version |
|---|---|---|
| Canonical placement (pure) | `src/rock-field.ts` | `ROCK_FIELD_VERSION='atlas-rock-field-1'` |
| Procedural meshes (pure) | `src/rock-geometry.ts` | `ROCK_GEOMETRY_VERSION='atlas-rock-geometry-1'` |
| Streaming, instancing, material | `src/planet-rocks.ts` | `ROCK_MATERIAL_VERSION='atlas-rock-material-1'` |

- **Catalogue.** Rocks use only the existing `RockFamily` records from
  `biosphere-model.ts` (form `angular | layered | rounded`, colour, `scaleM`,
  elongation, layers, roughness). They are read-only, canonicalised by id, and
  unknown forms are ignored. Plant, fauna and tree selection is untouched, and
  the rock modules import no flora, fauna, forest or tree code.
- **Identity.** A rock is a pure function of body (seed, id, water), tier, and
  a `surface-cell.ts` cubemap cell id and slot. Its channel is keyed by
  `ROCK_FIELD_VERSION`, which is independent of flora, fauna and tree identities.
  Camera pose, visit order and frame budget decide only *when* a cell resolves,
  never *what* it contains. Cell sampling is area-compensated (`1/q^1.5`), so
  density is uniform across cube faces, edges and corners.
- **Tiers.** Sizes are in physical metres, as multiples of `family.scaleM`.

  | tier | cell | slots | range (+margin) | size × scaleM | resident cap |
  |---|---|---|---|---|---|
  | scatter | 6 m | 3 | 64 (+12) m | 0.12–0.48 | 3000 cells |
  | boulder | 16 m | 1 | 280 (+32) m | 0.55–1.5 | 2600 cells |
  | outcrop | 64 m | 1 | 960 (+128) m | 1.6–3.4 | 2000 cells |
- **Gates.**
  - Rocks are geology, not life. `main.ts` passes
    `rocks: {surfaceSolid: stage==='solid', families: biosphereHistoryFor(...).rocks}`
    through `LifeGateContext`, so barren bodies with no species get rocks.
  - The rock gate clears residents when the surface is unavailable, the context
    is missing, or there are no families. Relief ≠ 1 or altitude ≥ 960 m only
    hides rocks; residents are kept.
  - Suitability comes from the biome classifier: a barren floor, less on soil
    and vegetation, a slope falloff from 35° to a hard cut at 58°, and zero on
    ocean or wet ground.
  - On wet bodies, rocks sit at least 0.3 m above the dated sea level. The
    rivers-off policy and ocean behaviour are unchanged.
- **Conformance.** Each rock's up vector blends the radial and terrain normals
  (by form), with tilt jitter. Rocks are partially embedded:
  `sinkM = sinkFrac·height + slope gap` and is always less than 75% of height.
  Yaw, aspect (`sqrt(elongation)`) and tint vary per instance, stable per rock.
- **Meshes.** There are 3 variants × 3 LODs per family, all non-indexed.
  - angular: exact convex half-space clipping gives crisp flat facets; LOD0
    adds chips.
  - rounded: a lobed icosphere with smooth normals and a flat buried base.
  - layered: one bevelled, sheared slab per stratum; strata are merged at LOD1,
    and LOD2 is a single slab.

  Triangle caps are LOD0 320, LOD1 80, LOD2 40. AO is baked into vertex colours.
- **Rendering.**
  - There is one `InstancedMesh` per (family, variant, LOD), giving 27 batches
    for 3 families. Each batch uses a `MeshStandardMaterial`.
  - Near LODs (0/1) sample the terrain's shared, licensed rock PBR lease
    triplanarly: colour detail is normalised by the texture mean, with roughness
    and normal blending. LOD2 is plain. No texture is loaded or owned.
  - Local aerial perspective comes from `attachLocalAerial`.
  - LOD0/1 cast shadows; every LOD receives shadows.
  - LOD thresholds use distance/diameter ratios of 40, 150 and 560, clipped to
    the tier range.
  - Matrices are relative to an origin that rebases every 256 m, and are cached
    per rock and origin version. Instances are copied only when the draw key
    (residents, origin, eye, frusta) changes.

## Budgets and diagnostics

- Per frame: at most one tier rescatters; ≤ 96 cells, ≤ 320 terrain samples
  (plus at most one cell's worth), ≤ 1.5 ms of process work. All work is on the
  main thread; there are no workers.
- Draw caps are instances per LOD band (512 / 1536 / 2048). Batch capacity is
  214 / 640 / 854 instances. The worst case is 27 draw calls.
- Bytes *(as of `4c392e6`; superseded by the follow-up)*:
  - `ROCK_WORST_CASE_BYTES` ≈ 13.4 MB, covering CPU and GPU copies of every
    batch plus every resident cell and slot filled. It is dominated by the
    *estimated* JS heap of the rock records (640 B each).
  - The declared `ROCK_BUDGET_BYTES` is 16 MiB.
  - Rocks are accounted separately; they are not inside the terrain 256 MiB
    core budget or `LIFE_RESERVE_BYTES`. PBR texture bytes stay with the
    terrain's `groundPbrTextureBytes`.
- `PlanetRenderer.diagnostics().rocks` reports:
  - versions, enabled/reason, and families
  - per-tier wanted, resident, pending and truncated counts, and rocks
  - drawn per LOD, draws, batches, triangles, cameraCulled, shadowOnly and
    budgetDrops
  - all caps, and bytes (geometry, instances, records, total, budget,
    worstCase)
  - origin version and whether a rebase happened
  - per-frame work counts and ms
  - `collision: 'none: rocks are visual only; …'`
- `__atlas.rockCensus()` returns a per-tier and total order-independent digest
  for replay and date-seek checks.

## Tests

Added `tests/rock-field.test.mjs` (12), `tests/rock-geometry.test.mjs` (4) and
`tests/planet-rocks.test.mjs` (10), and registered them in `npm test`. Coverage:

- canonical cell set and order
- in-cell placement at seams and corners
- purity across order, focus and sampler instance
- read-only, order-independent families
- biosphere digest unchanged, plus an import-isolation check
- barren moon with more than 200 rocks in all three forms
- ocean, wet and shore exclusion, including a drowned world with zero rocks
- suitability and form weights
- size, embedding and orientation bounds
- uniform density across the cube
- LOD bands
- census digest
- mesh determinism, budgets, bounds, outward winding and distinct forms
- streamed census independent of approach path, view and budget
- date-seek clear and exact restore
- altitude and relief hide
- rebase preserving absolute positions
- LOD caps, batch capacity, culling, shadow-only casters, and no rebuild on an
  unchanged view
- per-frame cell and sample bounds
- owned bytes ≤ worst case ≤ budget
- dispose releasing every geometry and material
- PBR lease reuse
- `main.ts` and renderer wiring

Commands run and their results (Windows, Node 24):

- `node --test tests/rock-field.test.mjs tests/rock-geometry.test.mjs tests/planet-rocks.test.mjs`
  → 26/26 pass.
- The same three files plus `life-packing`, `inland-rivers-disabled`,
  `terrain-water-refresh`, `ground-pbr-material`, `surface`,
  `local-aerial-perspective` and `biosphere-model` → 67/68 pass.
  - The failure is `terrain-water-refresh` (`document is not defined` in
    `acquireGroundPbrTextures`). It fails identically at baseline `c9ba64f` in
    a clean worktree.
- `npx tsc --noEmit -p .` → exit 0.
- `npm run build` → exit 0 (only the existing chunk-size warning).
- `npm test` → 747/753 pass, 3 fail, none in rock code.
  - `terrain-water-refresh`: as above.
  - `flora-cache-ownership`: its source regex predates the baseline's
    `faunaNear.clear()`. That line is unchanged by this work.
  - `acceptance/version-compat`: expects `atlas-surface-6`, but the baseline
    constant is `atlas-surface-7-no-inland-rivers`.
  - One `planet-canopy` test failed once under full-suite load. It passes 35/35
    in isolation three times.

## Follow-up: bounded draw traversal and combined accounting

Scope: CPU implementation and Node-only verification. No browser, GPU, device,
visual or material change. Density, tiers, LOD thresholds, caps and placement
are unchanged. `src/main.ts` and tree/flora/allometry files are untouched.

### Baseline measurement (commit `4c392e6`)

Receipt: `docs/rock-draw-baseline-4c392e6-2026-09-28.md`, from
`tests/rock-draw-measure-baseline.mjs` run in a clean `git archive` extract of
`4c392e6`.

- The dataset is the deterministic saturated fixture
  `tests/rock-saturated-fixture.mjs`: **7,600 cells and 13,600 rocks**, i.e.
  every tier at `residentCap` with every slot filled, near a cube corner on the
  barren `LETHRA-001` moon.
- Environment: Node v24.7.0, win32/x64, Ryzen 9 9950X. There were 3 runs of
  4 scenarios, each 200 measured frames after 40 of warm-up.
- The baseline rebuilds the whole draw key on every view change. Its `drawMs`
  ranged from min 1.18 ms, through median **1.86–4.21 ms** and p95
  **3.46–9.00 ms**, to max **6.8–17.3 ms**. The configured
  `ROCK_WORK_BUDGET_MS = 1.5` gated only cell processing, never this traversal.

### Implementation (`src/planet-rocks.ts`)

- **Resumable draw jobs.**
  - A view or resident change snapshots the view: planes, eye, origin, and the
    tiers' record lists by reference.
  - The job walks cells in canonical order (tiers, then nearest-first) and
    spends at most `ROCK_DRAW_UNITS_PER_FRAME = 4096` deterministic units per
    frame. One unit is one cell visited, one rock tested, or one instance
    copied at publish. A walk may overshoot by at most one cell's slots (3).
  - A finished job publishes atomically. Double-buffered reference slots are
    copied into the instance buffers. A publish that does not fit the rest of
    the frame waits and runs first in the next frame. A lone publish copies at
    most `ROCK_PUBLISH_MAX = 4,819` instances (LOD caps 4,096 + near bound 723).
  - Until publication, the previous set stays drawn, at its own origin.
  - View changes never restart a running job, so motion cannot starve it. At
    most two jobs touch a frame: one finishing, one starting on the latest view.
- **Culling.**
  - Each resident cell keeps a packed `Float64Array` of rock centre, diameter,
    bound radius and batch, plus cell bounding spheres.
  - Cell bounds only skip rocks that every per-rock test would reject, or
    accept rocks every per-rock frustum test would accept.
  - Plane tests reproduce `THREE.Frustum.intersectsSphere` arithmetic. Published
    outcomes (ids, LOD, shadow-only, cap drops) equal a flat per-rock pass for
    every tested view and budget.
- **Near rocks.**
  - Rocks within `ROCK_NEAR_UNCULLED_M = 8 m` of the job's eye are submitted
    regardless of camera frusta, and bypass the LOD caps. Only a full batch
    buffer could refuse one; `nearDrops` counts that and is 0 in every test.
  - The bound: while a job is pending, every rock within 8 m minus the distance
    moved since the published view's eye is drawn.
    `work.draw.publishedAgeFrames` reports that view's age.
  - In the saturated fixture a job spans at most 7 frames, so the published view
    is at most about 14 frames old. At 5 cm/frame that leaves ≥ 7.3 m.
  - Faster motion shrinks the guaranteed radius proportionally. Beyond it,
    newly approached rocks can appear up to one job late (latency, not
    omission).
- **Gates.**
  - Date or sea-level changes on wet bodies, surface loss, missing
    context/families, a family change, relief, altitude and empty frusta all
    cancel the running job. Resident clears also unpublish in the same frame.
  - Barren bodies keep their dry signature, so sea level never clears them.
- **Resident bound.**
  - Rescatter now evicts retained (unwanted) cells until
    `residents + queued wanted ≤ residentCap`. Previously a tier could exceed its
    cap by the retained annulus once queued cells resolved.
  - Eviction only drops the non-drawn cache. Wanted cells and canonical content
    are unchanged.
- **Snapshot lifetime.**
  - A rescatter during a job switches unwalked tiers to the new list. The tier
    being walked drops walked and evicted entries, and walked tiers release
    their list.
  - The job therefore never holds evicted records (tested every frame while
    walking off the fixture).
- **Counters.** They are separate, under `diagnostics().work`:
  - `process` (canonical cells): cells, samples, ms, pendingCells, rescatters.
  - `draw`: units, cells, rocks, cells skipped/culled, ms, jobs started,
    published, publishInstances, publishDeferred, pending, pendingCells,
    pendingUnitsMax, awaitingPublish, jobFrames, publishedAgeFrames,
    lastJobFrames, maxJobFrames, stale.
  - `caps.workBudgetNote` states that 1.5 ms is a configured process guard, not
    a measured or accepted frame budget.

### Follow-up measurement (same fixture and window)

Receipt: `docs/rock-draw-followup-measure-2026-09-28.md`
(`node --expose-gc tests/rock-draw-measure.mjs`, 3 runs, same machine and Node).

| scenario (default 4,096 units) | median ms | p95 ms | max ms | job frames |
|---|---|---|---|---|
| all-in-frustum, jitter, shadow all | 0.142–0.155 | 0.503–0.851 | 1.61–4.12 | 6–7 |
| perspective 90°, shadow all | 0.172–0.234 | 0.476–1.003 | 1.43–2.23 | 7 |
| perspective 90°, no shadow | 0.212–0.258 | 0.565–0.705 | 0.89–1.24 | 5 |
| stereo XR, shadow all | 0.165–0.187 | 0.469–0.572 | 0.92–1.46 | 7 |

- The same traversal with no frame split (one ~14k–21.5k-unit job per frame)
  had a median of 0.56–0.94 ms and a max of up to 8.5 ms.
- Real moon pipeline, one job: 4,185 units at a face centre (≈2 frames) and
  8,261 near a cube corner (≈3 frames, from units/4,096).
- Heap after forced GC measured 543–544 B per rock and 150 B per cell (record
  + SurfaceCell + Map entry). The estimates are 640 B per rock, and 224 B per
  cell record plus 224 B per SurfaceCell.
- **Not accepted as a time budget.** The unit bound is deterministic; its
  duration is not. On this desktop CPU, isolated frames (max column) still
  exceeded 1.5 ms. These Node figures say nothing about browser, Quest or GPU
  frame time.

### Combined memory accounting

- **Rock-owned bytes** (`rocks.bytes`, `PlanetRocks.ownedBytes()`). Shared PBR
  textures are always `textures: 0`.
  - Measured from array sizes: geometry and instance buffers ×2 (CPU arrays +
    equal-sized GPU buffers).
  - Estimated heap:
    - staged and published reference slots (8 B each)
    - the draw job snapshot (4 KiB + 8 B per capped cell), only while pending
    - SurfaceCells (224 B per wanted and per resident cell)
    - records (224 B per cell record, 640 B per rock)
    - `pinned`: evicted rocks still referenced by staged/published slots,
      counted once each
  - `peak = total + transient`. The transient (2.47 MB) is one rescatter
    enumeration plus one mesh construction, which can overlap live state inside
    `update()`. It is released by the end of the update.
  - Family rebuilds dispose every old geometry and material before building the
    first new mesh (tested by event order). `dispose()` drops everything to 0.
- **Worst case.**
  - `ROCK_WORST_CASE_BYTES` = 26,200,224 B (≈ 25.0 MiB). It counts:
    - every batch, both slot sets and one job
    - every capped cell both wanted and resident, with every slot filled
    - a full staged set and a full published set of pinned rocks
    - the transient.
  - `ROCK_BUDGET_BYTES` rises from 16 MiB to **28 MiB**, so the worst case is
    89.2% of it, leaving 10.8% headroom (a test enforces ≤ 90%).
  - The saturated fixture's live total is 17.13 MB (peak 19.60 MB).
- **Renderer** (`src/renderer-memory.ts`, used by `PlanetRenderer`).
  - `accountedBytes` = terrain resident + `GROUND_RESOURCE_BYTES` (atlas + the
    shared PBR set, **once**) + ocean normal + `rocks.bytes.total`.
  - `reservedCombinedBytes` adds `ROCK_RESERVE_BYTES = ROCK_BUDGET_BYTES` to the
    existing fixed reserves.
  - `TERRAIN_BUDGET_BYTES` subtracts the rock reserve. **Terrain admission
    budget falls from 206.08 MiB to 178.08 MiB.** This behaviour change has not
    been validated in a browser.
  - New diagnostics: `rockOwnedBytes`, `rockPeakBytes`, `rockReserveBytes`,
    `rockAccounting`. The separate rock subtotal stays in `rocks.bytes`.

### Tests

- New `tests/planet-rocks-draw.test.mjs` (15 tests), registered in `npm test`,
  covers:
  - saturated populations at the caps
  - the per-frame unit and publish bounds, and backlog reporting
  - flat-pass parity for 5 views × 4 budgets (97, 1,000, 4,096, ∞)
  - the old set held still at its own origin across a rebase while pending
  - near rocks kept through fast turns
  - near rocks kept while moving (the radius-minus-movement bound)
  - moving on real terrain: census, published set and parity equal between
    budgets 350 and ∞, with residents ≤ cap
  - barren sea-level independence, and wet sea-level clears (job and published
    set in the same frame) with parity afterwards
  - gates cancelling pending jobs
  - family-rebuild dispose order, and dispose mid-job
  - exact byte composition with and without a PBR lease
  - rescatter during pending jobs: residents capped, no evicted record in the
    job, pinned rocks counted exactly once, peak ≤ worst case
  - the near-bound check at a cube corner
  - combined accounting adding rock bytes once and the PBR set once, with
    admission headroom.
- `tests/planet-rocks.test.mjs`, `tests/ground-pbr-material.test.mjs`: updated
  for the split counters and the renderer-memory module.

Commands (Windows, Node v24.7.0):

- `node --test tests/rock-field.test.mjs tests/rock-geometry.test.mjs tests/planet-rocks.test.mjs tests/planet-rocks-draw.test.mjs tests/ground-pbr-material.test.mjs`
  → 46/46 pass.
- The same set plus `life-packing`, `inland-rivers-disabled`,
  `terrain-water-refresh`, `surface`, `local-aerial-perspective` and
  `biosphere-model` → 82/83 pass.
  - The failure is `terrain-water-refresh` (`ReferenceError: document is not
    defined`). It fails identically in the clean `4c392e6` extract.
- `npx tsc --noEmit -p .` → exit 0. `npm run build` → exit 0 (only the
  existing chunk-size warning).
- The full `npm test` was not run for this follow-up.

## Open gates (not claimed)

- **Visual realism.** Not inspected in a browser. Form readability, scale,
  PBR detail strength, colour against terrain, and LOD transitions (hard switch,
  no dithering) are all unreviewed.
- **Device / Quest / performance.** Not measured. The caps are design bounds,
  not measured frame costs. Main-thread cell resolution cost on device is
  unknown. Follow-up: the draw traversal is now unit-bounded, and its Node
  fixture timings are recorded. Neither is a browser, Quest or GPU frame time.
  The 1.5 ms process guard and the 4,096-unit draw budget are configured
  values, not accepted frame budgets.
- **Follow-up limits.**
  - Pending-job latency is up to 7 frames at saturation (an estimated 2–3,
    from units/4,096, on the real moon). During that time, far or newly
    visible rocks keep the previous published set.
  - The near guarantee shrinks with speed (8 m minus movement since the
    published view).
  - Cap drops at saturation (`budgetDrops`, as in `4c392e6`) remain for
    non-near rocks.
  - The 28 MiB reservation lowers the terrain admission budget by 28 MiB. Its
    effect on terrain residency has not been browser-tested.
  - Record, SurfaceCell, slot and job bytes are V8-calibrated estimates, not
    browser measurements.
- **Collision.** None. Rocks are visual only: the walker, landing and fauna
  pass through them. No collision behaviour was added.
- **Other.** Rocks may overlap trees and fauna, since there is no
  cross-population exclusion. Rocks are hidden above 960 m altitude and when
  relief ≠ 1. The record-byte figure is an estimate, not a heap measurement.
