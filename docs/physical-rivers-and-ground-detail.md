# Physical rivers and walking-height environment

Implementation record, 2026-09-13. See the prior
[drainage foundation](drainage-and-atmospheric-flight.md) and the
[specification written before implementation](physical-river-pilot-spec.md).

## What this increment provides

On an ocean-bearing solid planet, choose **Find rivers and a lake**. The helper
tries the existing major catchments, favouring a currently lit, non-polar coast,
and installs the first feasible physical region. Its inspection panel contains
named river-bank, lake-shore and mouth destinations. **Fly to dry bank** travels
to that direction and holds 180 m above it; **Land and walk** prepares the local
contact terrain. Walking stops at river/lake water. **Export river region** saves
the complete canonical model. You can also request a specific catchment from the
Drainage atlas; an unsuitable request reports a failure and can be retried or
replaced by automatic discovery.

This is a bounded coastal pilot, not all waterways on a planet. A model has a
main channel, one tributary, one connected lake and surrounding shaped banks.
Initial local forest stands, stones and ground cover make scale inspectable
from eye height. Their geometry and materials remain an early procedural pass;
this is not a completed realistic biome, vegetation or ecosystem implementation.
Animals, cities, people, independent ponds and underwater exploration are not
included. Tree/stone instances currently have no individual colliders.

## Determinism and compatibility

The catalogue and baseline `terrain-1.1.0` are preserved. The optional model ID
is `<parent-catchment-id>/river-region-1`, stored as immutable `Body.hydrology`.
The URL includes `river=<parent-catchment-id>`; cold restoration generates that
same owner before restoring a walking position. Links without this parameter
continue to show the baseline terrain. Discovery's sunlight preference only
chooses an address; it does not change the geometry produced for that address.

The reference date can be changed without regenerating geology or vegetation.
Water ripple animation is cosmetic; no precipitation, discharge, erosion,
seasonal growth or civilisation history is simulated by this release. Future
history records must explicitly own these changes and retain the old baseline.
`surfaceQuery` reports regional geology separately from the baseline version.
Its global water-level fixture can overtop and subsequently reveal the fixed
inland water surface without changing rock height.

## Generation and shared surface

Terra implemented a deterministic bounded candidate search in a tangent frame
centred at the existing coarse outlet. It examines a 49-by-49 set of candidate
headwater directions within approximately 32 km, rejects unsuitable profiles,
and refines the chosen channel to approximately 80 m samples. A nearby actual
baseline ocean sample extends the dry coarse outlet into the sea. A branching
tributary meets a shared main-channel point; the main-channel reach crossing the
lake is flattened to the lake level. The model records the actual height-query
count and sampled maximum cut/fill. Corrections are limited to 750 m. This is a
procedural construction of a local valley, not a measured natural erosion model
or a refinement of the whole continental watershed.

`baseTerrainSampler` preserves the old geology. `terrainSampler` applies the
region through `sampleRiverRegion`; all previews, tile positions, colour,
finite-difference normals, flight clearance and walking queries consume this
same surface. The regional index expands segments by their maximum bank reach;
a query examines only its containing cell and compares squared distances before
computing the winning distance. The terrain worker reuses the immutable region
object between jobs, retaining its index rather than rebuilding it per tile.

Channel and lake beds use bowls that meet the water elevation at the wet edge.
Dry banks blend toward baseline height over a relief-dependent corridor of
100–3,000 m. The tangent frame is pole-safe and rejects the far side of the
sphere. The original field is retained outside the influence. The lake and
channel overlap share a water level. This analytic representation follows the
useful principle of constructing terrain from connected river constraints in
[Génevaux et al.](https://perso.liris.cnrs.fr/egalin/Articles/2013-river-networks.pdf),
but uses our own smaller candidate-search and blending implementation.

Visible water height and rock height remain separate. The coarse visible tile
surface includes water, as the existing ocean representation does. The nearby
water mesh adds animated surface shading; it is not the walking floor. The
capsule's intended and physics-resolved steps are both checked for wetness, so
terrain sliding cannot silently become walking across inland water. Ocean
seafloor detail remains unchanged and underwater access remains disabled.

## Water rendering and precision

`RiverWater` uses locally anchored indexed geometry. Widths are full water
widths; lake radii are ellipse semi-axes. The lake is tessellated through its
interior to avoid a single large fan sagging below the spherical water surface.
The lightweight shader uses downstream distance for flow phase, a constant lake
level, compatible log-depth handling and the renderer's colour pipeline.
Geometry stays in metre-aware local coordinates; the shader does not subtract
two planet-radius float32 positions.

Water allocation preflights complete channel/lake coverage and rejects an
impossible model rather than dropping its tail. Its caps are 64 draws and 16 MiB
of accounted CPU/GPU buffers, with distance and horizon visibility selection.
The small outward water bias is 0.10 m. No reflection render targets, fluid
simulation, external water textures or new dependencies are used.

Near the surface the connected system changes to metre render units, preserving
physical positions. It returns to the orbital representation above 10 km ground
clearance, with entry below 2 km to avoid scale oscillation. This addresses the
loss of logarithmic-depth precision caused by representing metre-scale water
and banks in million-metre render units. Headset model inspection retains its
existing scale owner. A direct-URL body is also resolved to the resident system
record so flight and rendering cannot read different geology objects.

## Walking-height dressing

`RiverEnvironment` generates stable cell/instance identities from body seed,
region ID and `river-environment-1`. Shared surface height, wetness, slope and
snow eligibility determine placement. Seeded variations change tree size,
branch azimuth, canopy, stone shape and ground-cover placement. All templates
are authored in code. The initial forest representation uses two layers of
irregular leaf-card clusters, alpha-cutout procedural textures, visible trunks
and branches, and small multi-blade grass clumps. Textures are locally generated
and disposed with the environment; no external art assets are used.

Cell generation is spread over updates. Instanced trees, branches, canopy,
stones and cover share six draw categories and a 12 MiB accounted buffer budget.
Selection prefers nearby placements with stable-ID tie breaking. Local anchors
include ground height, are copied rather than aliased to the moving observer,
and use positive-handed radial instance frames. Detail is culled by ground
clearance and regional range. Individual tree obstacles and fauna navigation
will need a shared occupancy layer; they cannot be inferred from whichever
visual instances happen to be resident.

The terrain retains its established 256/768 tile limits and 256 MiB estimated
budget. Acceptance reports combined terrain, water and dressing allocations.
Estimates exclude transient JS allocations and graphics-driver overhead; desktop
measurements must not be treated as a demonstrated Quest budget.

## Ownership and navigation

`RiverPreparation` owns one cancellable worker and a 60-second timeout. Errors
have an explicit retry UI. It checks the returned body and catchment identity.
Leaving a view cancels ownership; late results cannot attach to another planet.
The upgraded preview is prepared before installation; renderer/contact owners
are then recreated together from an observation pose. The surrounding system
remains resident throughout. Surface-survey and flight-sampler caches include
the regional identity, avoiding stale baseline queries after installation.

The precise bank helper has its own transfer/descent state and stops on arrival.
Manual flight controls cancel it. Existing terrain cruise, orbit inspection,
walking, atmospheric horizon assist and stationary VR retain their respective
controls. Time seeking from walking returns to observation hover before landing
again, preserving the reference geography.

## Validation and provenance

The numerical suites cover baseline preservation, repeatable regions, shared
water/rock fields, profile order, lake overlap, dry sites, polar projection,
shore/contact continuity, overtopping/draining, wet-step rejection, positive
instance transforms, metre-scale detail geometry, budgets and disposal.
`test:rivers` uses real UI controls for discovery, export, bank flight, landing,
walking, water refusal, cold restoration, time seeking, lake visiting and
cancellation. `ATLAS_RIVER_FAULT=1` additionally exercises an injected worker
failure and explicit retry. Screenshots and reports are under `test-results/`.
Final measured results and release verification are appended below.

The specification and integration review were written by the root Codex agent.
At the user's request, `gpt-5.6-terra` subagents implemented regional generation,
water/environment rendering, shared terrain/walking integration and acceptance
tests. Root reviewed their work, requested corrections, integrated navigation,
precision and ownership changes, and ran the browser/release checks. The source
history and specification retain the model boundaries and design rationale.
No model-generated art, checkpoint downloads, private uploads or new libraries
were used. The coarse drainage algorithm remains based on the approach described
by [Barnes, Lehman and Mulla](https://arxiv.org/abs/1511.04463). Geometry ownership
uses [Three.js BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html).
Primary references were checked on 2026-09-13; this document distinguishes their
principles from the app's implementation and measured limits.

## Visual review and remaining detail work

Review from the bank replaced spherical canopy placeholders with leaf clusters
and exposed trunks/branches. Seeded yaw applies to branches, stones and cover.
Leaf texture memory is included in the environment estimate. Inland bank colour
now blends between muted pebbly sand and soil/grass through the shared regional
field; changing material weights alone did not change the old coastal colour.
The blend fades continuously into baseline terrain, preserving cold and high
terrain palettes. Fine grain bump amplitudes were reduced after grazing-angle
shore captures showed excessive black/gold noise.

This establishes visitable water and first local dressing, not the final visual
quality target. Distant lake shores can still expose coarse terrain silhouettes;
forests are sparse and the tree templates need further art and LOD work. The
next ground-detail stages need biome-wide placement, physical small terrain
features, shared object occupancy/collision, and then navigation and persistent
population data. Animals, settlements and people must have stable world
identities independent of which rendering cells are loaded. Their later history
must derive from versioned events and the universal date, rather than frame
timing or the order in which the player visits places.

## Acceptance measurements — 2026-09-13

- `npm test`: **55 passed**. Production TypeScript/Vite build passed; Rapier's
  existing lazy walking bundle still produces a chunk-size warning.
- `test:atmosphere`: passed. A 25.84-degree deliberate bank settled to
  0.00051 degrees; no browser errors.
- `test:planet`: passed. Both poles, atmospheric descent, moon orbit and
  departure disposal were exercised; orbital radius drift was below 0.1 mm.
- `test:walking`: passed on baseline terrain, including movement, jumping,
  URL restoration, date seeking, moon-pole walking and takeoff. Recorded contact
  mismatch after walking was 0.000005 m. A 180-frame RTX 5090/D3D11 sample had
  median 16.2 ms and p95 25.2 ms; terrain update median 2.1 ms and p95 11.5 ms.
- `test:vr`: passed with IWER 2.4.0, Meta Quest 3 stereo emulation. Controller
  selection and inspection, exit and re-entry ran without browser errors.
  A physical headset has not been tested for this release.

The baseline regression reports are `test-results/atmosphere-rivers/`,
`planet-rivers/`, `walking-rivers/` and `vr-rivers/`. River-specific results below
use the release geometry and materials. Frame samples are short diagnostics,
not representative guarantees for long travel, lower-end devices or headsets.

`test:rivers` passed with `ATLAS_RIVER_FAULT=1` on the release materials. It
visited Orien Delta on Maithea (`LETHRA-001`, system `G001/C2128,0,1/0`, planet
1, catchment outlet 23165). The generated region contains 39.74 km of channel.
Export and cold restoration produced the same canonical SHA-256:
`a6a1eb52d152bfc59c18d356a2e6a5088d10a1a11915273adae8cbaae25d9fd5`.

Bank arrival had no measurable angular miss at the test's precision. Walking
stopped within 0.25 m of the sampled shore. Along-bank walking, time seeking,
reference-date reset, lake landing, worker failure/retry and departure during
generation all passed without browser errors. The final resource-only change
adds explicit `InstancedMesh.dispose()`; its exactly-once mesh/texture disposal
test and TypeScript check also pass.

The bank held 458 terrain tiles and 81 environment cells. Its 4,250 visual
instances comprised 384 trunks, 1,152 branches, 768 canopy clusters, 377 stones
and 1,569 ground-cover clumps. Water used 204,788 accounted bytes; environment
geometry, instances and leaf textures used 902,568 bytes. Combined with terrain,
the measured estimate was **117,595,778 bytes (112.1 MiB)**. The 120-frame
RTX 5090/D3D11 bank sample recorded **16.6 ms median / 27.8 ms p95** frame time
and **2.2 / 11.9 ms** terrain update time. No Quest performance claim follows
from these desktop results.

Inspect `test-results/rivers-release/report.json`, `02-bank-grounded.png`,
`03-bank-walk.png` and `04-lake-shore-grounded.png`. These captures also document
the current visual limits, including sparse stands, exaggerated-looking ground
grain in some shoreline views and coarse far-bank tessellation.

## Published verification

The app and IWSDK index were deployed on 2026-09-13. SHA-256 comparisons matched
the published app HTML, README, both new documents, all seven JavaScript/CSS
assets and the shared site index to their local release files. The full
`test:rivers` walkthrough then passed against
https://dionysus.dk/webxr/IWSDK/universe-atlas/, including live export,
cold walking restore, time seeking, lake landing and generation cancellation.
The canonical region/export hash remained identical to the local fixture and
there were no browser errors. The live bank sample measured 16.4 ms median and
25.4 ms p95 frame time, with 117,781,298 accounted bytes across terrain, water
and dressing. Reports: `test-results/river-live-hashes.json` and
`test-results/rivers-live/report.json`.
