# Physical river pilot specification

Design frozen before Terra implementation, 2026-09-13.

## Deliverable

One bounded, deterministic coastal river region attached to a selected existing
`drainage-1` catchment. It contains a main river reaching the ocean, tributaries,
a connected lake, shaped beds/banks and named dry bank destinations. It is a
regional pilot, not a claim to reproduce the entire continental catchment.
The UI enables it explicitly, shares its versioned address and restores it on
cold load. Existing links without a river address retain terrain-1.1.0.

## Canonical model and ownership

`river-types.ts` is the shared contract. A region uses a pole-safe tangent frame
at the parent catchment outlet and metre coordinates projected onto the sphere.
Its ID is parentCatchmentId + `/river-region-1`. No camera, tile LOD, request
order or wall-clock values participate in generation. Names inherit the parent
identity. The reference geology is date-independent; future histories must add
explicit epochs instead of reinterpreting this dataset silently.

A single disposable worker builds the region from the baseline terrain and the
canonical coarse catchment. Use a bounded regional search (target <= 257 squared
samples, <= 100 km domain) to find a feasible coastal route. Refine route samples
to <= 100 m near the implemented channel. Profiles are downhill toward the ocean;
tributaries meet the main river at the exact same water elevation. The lake has
one constant water level and a matching outlet. Limit extreme terrain correction;
reject an unsuitable region explicitly rather than silently draw floating water.
A failure has a retry path and cannot install after leaving the body.

`Body.hydrology` is an optional immutable serialized region, sent with worker
requests. It is reference data, not a mutation of catalogue seed or baseline.
`terrainSampler` wraps a preserved `baseTerrainSampler`; `river-sample.ts` applies
the same local bed/bank field everywhere. Coarse drainage continues to analyse
baseline terrain. Sampling uses a bounded spatial index, not a full route scan
for every terrain texel. No terrain or collision generator may invent its own
river path, shoreline or water level.

## Terrain, water and walking contract

Rock height and water surface are separate. Samples expose rock elevation,
water level, wetness and visible surface height. Ocean stays at sea level;
inland water follows the shared channel profile or flat lake level. Terrain
preview colour and coarse visible height show the same geography from orbit.
Nearby water adds animated flow and shoreline shading above that surface.
Banks blend continuously into original terrain. Outside the region's influence,
old samples are bit-identical. Surface normals remain direction-based, with the
existing fixed metre finite difference, including cube seams and poles.

Contact patches mirror the settled terrain tiles. Wet cells remain inaccessible
on foot, including rivers and lakes; no invisible walking bridge over inland
water. Walking checks the actual resolved displacement as well as intended
movement so sliding cannot bypass the boundary. Underwater exploration is not
part of this increment. Terrain and contact caches must be rebuilt together
when enabling a geology version, from an observation pose rather than under a
standing capsule. Flight clearance uses the visible water/ground surface.

## Rendering and lifecycle

Use ordinary Three.js indexed geometry, stable local anchors and a lightweight
animated material; no full fluid simulation, reflection render targets or new
textures/dependencies. Chunk nearby water geometry, cull by position/horizon,
and cap draws at 64 and resident water geometry at 16 MiB. The graph/region target
is <= 2 MiB serialized. The terrain keeps its established 256/768 tile caps and
256 MiB estimate; report combined usage. Water follows planet transforms,
floating-origin rebases, relief and the existing stationary VR model. Dispose
all meshes/materials/jobs on departure. No per-frame geometry regeneration.

## UI and navigation

Add Build river region beneath the selected catchment, then show named river
bank, lake shore and mouth destinations, inspect-region and export controls.
The analysis overlay hides when inspecting physical water. Fly-to helper arrival
must tighten to metre-scale angular tolerance for these small destinations and
finish stationary over the named dry bank, so the existing 600 m moving cruise
does not immediately overshoot a narrow bank. Landing remains explicit.
Bookmarks include `river=<parentCatchmentId>` and regenerate before restoring a
walking pose. Changing date retains reference hydrology. Restrict the initial
pilot to existing ocean-bearing solid planets, with explicit limits in the UI.

## Acceptance

- Same seed/owner gives byte-identical region after unrelated requests and cold
  browser reload; unique IDs and finite positions.
- All channels connect, downstream profiles never rise, lake level is constant,
  tributary junctions agree, mouth joins ocean, and wet bed is below water.
- Shared bank samples, tile vertices and contact triangles agree; outside-region
  samples are unchanged. Pole-safe projection and cube-edge sampling fixtures.
- A real browser builds from UI, inspects river/lake, flies to and lands on a dry
  bank, walks along it, refuses entry into water, returns to flight, cold-restores
  its address, changes date, leaves during generation and verifies disposal.
- Inspect screenshots from orbit, low flight and eye height. Report geometry,
  worker timing, representative frame times and hardware; no inferred Quest claim.
- Run numerical suites, build, relevant flight/walking regressions and emulated
  VR inspection. Deploy, update index/docs, verify live assets and commit/push.

## Division of implementation

Terra A owns regional generation, spatial sampling and numerical hydrology tests.
Terra B owns water geometry/material/LOD and rendering-oriented unit checks.
Terra C owns shared terrain/surface/flight-clearance/walking integration and its
numerical regression checks. Root owns this contract, worker lifecycle, UI,
restore/navigation, renderer wiring, browser acceptance, review and release.

## Primary references

- https://perso.liris.cnrs.fr/egalin/Articles/2013-river-networks.pdf — motivates
  constructing terrain from connected river constraints; this pilot is our own
  bounded implementation, not a reproduction of that method.
- https://arxiv.org/abs/1511.04463 — deterministic depression routing background
  for the existing coarse atlas; no claim that conditioning alone makes lakes.
- https://threejs.org/docs/pages/BufferGeometry.html — indexed geometry ownership.

References checked 2026-09-13. Implementation evidence and final deviations will
be recorded in a separate release document. No generated/imported art is used.

## Walking-height detail addendum (user steering)

The user clarified that convincing eye-height planetary detail is the goal.
This pilot therefore also includes bounded local forest/ground dressing, checked
from the riverbank, rather than judging quality only from orbit. Later animals,
people and cities consume the same stable geology/water/placement contracts;
they are not included in this release.

A separate `RiverEnvironment` consumes body + immutable river region, with
`group`, `update(observerInPlanetRadii, dt)`, `diagnostics()` and `dispose()`.
Generate deterministic per-cell placements in the existing pole-safe regional
frame. Use metre spacing, slope and wetness rejection, source seed/version and
stable cell/instance IDs. Vegetation is for suitable solid wet worlds only;
rock/debris can appear on other dry bank cells. No underwater or steep-slope
placements. Heights and transforms use the authoritative shared surface query.

Render a local stand of trees with distinct trunks, branches and layered canopy,
plus scattered stones and near-eye ground cover. Use instancing, several seeded
variations, spatial cells and distance detail limits. Geometry is authored in
code, without external assets or a model-generation run. Keep canopy natural in
silhouette and vary density; avoid evenly spaced tree grids. Retain persistent
world positions as nearby cells load/unload. Cap active cells and instance counts,
target <=12 MiB accounted instance/geometry buffers and <=12 draw calls. Gate
nearby dressing by altitude/distance; no planet-wide vegetation allocation.
Budget CPU placement work across frames. Record actual frame times and images.
These initial trees do not have individual physics colliders yet; movement is
still terrain/contact constrained. Future tree obstacles and fauna navigation
need explicit shared occupancy, never inferred from visual-only instance state.
