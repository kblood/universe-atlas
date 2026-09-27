# Surface population implementation

## Desktop realism continuation — 2026-09-28

The [desktop realism implementation plan](desktop-realism-implementation-plan-2026-09-27.md)
owns the next visual stages. The first local source increment removes the
heading-based forest focus offset: the dense footprint is now selected around
the observer's ground location. Rotating the view can change frustum visibility,
but no longer shifts that footprint up to 2.5 km ahead.

Forest instance transforms now retain a local origin until 256 m movement.
Per-batch slots remember their resident tree and origin version; matrices are
recomposed on slot replacement or rebase, colours on replacement, and coverage
only when its Float32 value changes. Dirty component ranges are merged with any
pending upload before submission. A hidden slot returning after a rebase gets
its transform refreshed. Worker replies carry request IDs so old water-context
selections cannot overwrite current demand.

Diagnostics now expose `densityFocus`, `instanceUpdates`, `updateMs`,
`matrixWrites`, `colorWrites`, `coverageWrites`, `scheduledUploadBytes` and
origin/rebase state. Scheduled bytes describe pending attribute ranges, not
measured driver transfers; initial GPU buffer allocation can upload full arrays.

This increment preserves tree IDs, placement, dimensions, palette, habitat
rules and existing draw ranges. It still scans resident candidates and compacts
visible batches; camera movement/frustum changes can rewrite many slots. Spatial
chunking, detailed procedural assets, PBR forest lighting and aggregate canopy
remain planned. TypeScript checking and the production Vite build pass for this
increment. Unit suites and browser acceptance were not run in this increment.

This implements the continuity repairs identified in
`population-continuity-review-2026-09-27.md`. Runtime and browser validation
are recorded separately by the validation agent; this document describes
the implementation, not a claim of headset acceptance.

## Canonical cells and bounded work

`surfaceCellsWithin` enumerates every canonical cell centre in a spherical
neighbourhood, including cube seams and corners. It preserves the existing
`surfaceCellAt` addresses. Plant cells are keyed by their spacing and herd
cells retain their 32 m canonical addresses. The observer only selects cells;
it no longer creates a sparse tangent grid that can omit nearby herds.

Herd demand extends to 664 m for a 600 m visible range. Demand refreshes after
16 m movement. A wider retention band absorbs boundary oscillation. Habitat
queries are queued with a 32-record/2 ms budget, and herd terrain stencils
share a 3 ms total placement budget. One expensive query can exceed that
target; this is cooperative budgeting, not a hard real-time guarantee.

Each herd receives a fixed 7 by 7 terrain stencil at 8 m spacing. It becomes
drawable after the stencil is complete. Animal body elevation then uses a
deterministic bilinear lookup, eliminating per-animal terrain noise queries
on every animation frame. This approximation is not terrain-aware foot IK
and does not implement obstacle avoidance.

## Coordinates and animation

Plant instance transforms and culling centres are relative to an observer
origin before conversion to Float32. Culling planes are translated into the
same frame. Fauna anchors retain Float64 directions; animal instance transforms
also subtract the local origin before GPU upload. The scene graph carries
the origin in JavaScript double precision.

Fauna movement remains an exact-date function. Its periodic idle/walk schedule
is integrated analytically. Each individual has a deterministic phase offset,
so the population does not enter idle together at the reference date. Animals
stand still while idle and move at
0.45–0.9 m/s during walking on bounded 2.5–7.5 m paths around their individual
anchors. No wall-clock accumulator replaces universe time. Body orientation
aligns local +Y with planetary up and local +X with the direction of movement.

## One animal representation

The planetary renderer uses each individual's actual genome to construct
instanced torso, neck, head, limbs, feet, tail, ears, horns and armour.
Four geometry batches render up to 128 nearby visible animals, with nearest
visible animals allocated first. Every distance uses the same anatomical
representation and animation, eliminating the prior generic middle models
and coloured billboard quads. The separate creature lab retains its richer
rigs. Coat pattern textures and terrain-aware joint solving are not provided
by the planetary batch renderer.

Diagnostics report submitted animals, frustum exclusions and budget drops
separately. `faunaDrawn` exposes IDs, canonical cells, normalized double
positions and genomes for continuity checks. `lifePending` and
`faunaTerrainPending` expose initial streaming rather than conflating it
with an empty ecosystem.

## Forests

Distant crowns are selected from the same canonical 18 m tree population as
near trees. The fixed far mask retains 6.5% of candidates, independently of
the habitat/presence roll. A distant visible tree keeps its identity, position,
height, yaw, colour and middle-detail geometry during approach. This replaces
the unrelated 140 m stand population and its arbitrary arrangement of crowns.

The full near working set extends beyond the visible 650 m footprint; the far
working set extends to 4.5 km. Terrain and habitat results are retained by
tree ID. Detail selection has a 24 m hysteresis band around 110 m. Coverage
fades use alpha hashing, so trees do not physically grow or shrink as the
observer moves. Desktop far crowns have an 8,192-instance cap; immersive
mode caps them at 2,048. The habitat cache is bounded at 24,000 records.

**Limitation:** distant crowns are a sparse approximation of forest coverage,
not an exhaustive forest or a density-conserving volumetric canopy. Full
nearby forest density is introduced by coverage fading. Matching distant
optical density is a future rendering refinement; it must preserve the
common canonical population implemented here.

## Terrain selection

Contact rendering retains its balanced tile frontier and applies the same
3 ms cooperative refinement cutoff as flight. It no longer restarts contact
selection from all six roots on every movement. Pending refinement continues
on later frames while existing terrain remains available.
