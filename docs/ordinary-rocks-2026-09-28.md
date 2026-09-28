# Ordinary-game surface rocks and boulders — 2026-09-28

**Status: local, unaccepted candidate on branch `opus/ordinary-rocks-20260928`.
Not merged, not published, not deployed.** No browser or GPU was launched and
no timings were taken. Visual, device, performance and collision acceptance are
all open (see the end of this doc).

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
- Bytes:
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

## Open gates (not claimed)

- **Visual realism.** Not inspected in a browser. Form readability, scale,
  PBR detail strength, colour against terrain, and LOD transitions (hard switch,
  no dithering) are all unreviewed.
- **Device / Quest / performance.** Not measured. The caps are design bounds,
  not measured frame costs. Main-thread cell resolution cost on device is
  unknown.
- **Collision.** None. Rocks are visual only: the walker, landing and fauna
  pass through them. No collision behaviour was added.
- **Other.** Rocks may overlap trees and fauna, since there is no
  cross-population exclusion. Rocks are hidden above 960 m altitude and when
  relief ≠ 1. The record-byte figure is an estimate, not a heap measurement.
