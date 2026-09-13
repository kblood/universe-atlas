# Planet realism iteration goal

Started 2026-09-13, after stable-shore release `4275e43`.

## Outcome

Make standing on a planet visibly more convincing: readable mountains and
cliffs, connected valleys and exposed rivers, water with depth and reflected
light, and layered vegetation, grass, plants and stones at human scale. Preserve
the continuous universe, deterministic addresses, walking/flight controls and
bounded resource use. The goal remains active through implementation and visual
review; adding code or passing unit tests alone does not complete it.

Initial milestone reviewed 2026-09-14. The broader realism programme continues
through the explicitly scoped follow-up iterations below; this release does
not claim completed mountain generation or a finished planet-wide ecosystem.

## Current implementation (2026-09-14)

The shared river surface is now integrated into terrain queries and water
rendering. `river-physical-surface-1` owns the final water triangles, interpolated
levels/depths and indexed wetness; `river-surface-3` adds dry banks queried against
that same mesh. Shared node cross-sections and conforming confluence edges avoid
internal segment caps and overlapping surfaces. A compact spatial index handles
wet queries; a bounded nearest-triangle BVH handles dry-bank distance. A region
cache shares these arrays on the main thread, and one resident terrain worker
keeps its own copy. Both copies are included in the water reservation.

The Maithea region has 2,068 final river triangles with zero independent
centroid/query mismatches, deterministic regeneration and no non-manifold edges
in the audit. Comparing two sampling distances across joins estimates a water
discontinuity below 0.000001 m and a depth discontinuity below 0.00001 m. The
largest depth change over a 2 mm interval is a steep continuous bed gradient;
these measurements do not imply a hydraulic simulation. Catalogue addresses,
region profile exports and their recorded hash remain unchanged. Physical bank
geometry has a new version, and saved positions resample the current ground.

Water uses a shared filtered normal atlas, depth colour and Fresnel reflection.
Nearby lakes additionally reflect the actual scene through one lazy 256-square
capture capped at 10 Hz; rivers, oceans and XR use the procedural sky fallback.
The landscape adds bounded regional valley-wall relief and a smooth coarse-bed
apron. Ground cover uses instanced curved grass, small fern fronds, irregular
stones, branched crowns and a shared periodic bark atlas. The environment keeps
seven draws and a 12 MiB cap. These are procedural approximations, not scanned
vegetation, full erosion, planet-wide forests or photorealistic finished art.

The first integrated bank review (`test-results/realism-integrated-bank`) passes
strict frozen-shore stability and coverage, and a long walk through a floating
origin rebase. It lands in 53.3 seconds and records 105.8 m of walking with no
page errors. Water uses 15 resident chunks and 2,324,932 accounted bytes;
environment uses 2,422,816 bytes. The recorded combined reservation is
240,672,952 bytes, below 256 MiB. The integrated lake review also passes the
strict frozen-shore coverage checks, with no changed pixels in the measured
region and no page errors. Cold landing takes 53.2 seconds. These limited
stationary checks do not establish artifact-free rendering at every location.

The final ordinary river regression (`test-results/realism-final-rivers`) passes
bank arrival and walking, lake arrival, cold saved-location restoration, time
seeking and departure. The region/export hash remains
`a6a1eb52d152bfc59c18d356a2e6a5088d10a1a11915273adae8cbaae25d9fd5`.
Its 120 settled bank frames have a 16.7 ms median and 19.1 ms p95; terrain updates
measure 2.2/2.8 ms. The actual adapter is NVIDIA RTX 5090 through ANGLE D3D11.
This is one high-end desktop sample, not a Quest or general 60 Hz guarantee.
The measured bank reservation is 247,954,414 bytes, below 256 MiB. The lake
reflection target adds 524,288 bytes, with 108 draws in its last recorded capture.

The planet browser regression passes orbital approach, both polar crossings,
atmospheric descent, moon approach and disposal on departure. Its assisted-orbit
radius drift is 0.00017 m, with no camera flips or page errors. The IWER 2.4.0
Meta Quest 3 stereo regression also passes navigation and controller interaction
without page errors; this is emulation, not a physical headset performance test.
The dedicated terrain streaming regression passes walking contact, 2:1
neighbour constraints and allocation limits. Water refinement remains best
effort: distant underresolved leaves can remain under the fixed leaf budget.
The final unit suite passes all 111 tests, including surface topology, holes,
bank queries, deterministic placement, shared tile boundaries and memory
accounting. TypeScript checking and the production build also pass. The build
still reports the existing large JavaScript chunk advisory.

Visual review confirms more readable tree branches, small grass and fern shapes,
exposed river water and actual lakeside reflections. It also shows the next
limitations clearly: sparse ground cover, repetitive distant terrain, simple
river sky reflection and visibly low-resolution lake reflections. Cold landing
still takes about 53 seconds. This is an initial realism milestone, not the
finished planetary environment.

## Next realism iterations

1. **Landforms at regional and walking scales.** Add drainage-constrained ridges,
   eroded slopes, exposed rock faces and talus, with a mountain/cliff visual
   fixture. Maintain a versioned physical field shared by tiles and walking.
   Current valley-wall relief is only a bounded local addition.
2. **Streaming latency.** Profile and reduce the remaining cold landing delay
   before increasing terrain or vegetation budgets. Reuse regional field data,
   prioritize the arrival footprint and measure worker scheduling separately
   from GPU uploads. Preserve shoreline coverage and shared LOD boundaries.
3. **Water and banks.** Improve river reflection, flow detail, sediment and wet
   bank transitions. Compare reflection resolution and update frequency against
   desktop and headset budgets; preserve the canonical bed and water ownership.
4. **Ecosystem coverage.** Extend the regional pilot to deterministic biome cells
   across each suitable world, with plant variation and distance representations.
   Improve crown silhouettes and ground-material repetition before adding
   animals, settlements or civilization simulation.

Each increment requires matching-location captures, traversal checks, actual
allocation accounting and measured performance. Physical-headset validation
remains separate from the automated stereo emulator.

## Iteration 1 design

1. **Landforms and river coverage.** Audit the real generated river against its
   analytic bed and the terrain triangles actually rendered at different LODs.
   Distinguish insufficient valley sampling from river-ribbon triangulation,
   transitions and material problems. Correct the geometry contract before
   dressing it. Evaluate a drainage-constrained regional landform field with
   ridges, valley walls and smaller rock structure, keeping the original macro
   continent and river address inputs. Version any changed surface field.
2. **Water appearance.** Share a deterministic periodic normal atlas between
   river/lake and ocean materials. Use filtered, physically scaled detail,
   flow-oriented motion, Fresnel reflection, sunlight and depth absorption.
   Break uniform parallel stripes. Keep foam local and irregular. Keep physical
   water levels and shoreline ownership fixed; no arbitrary raised water or
   disappearing ground mask. This pass changes shading, not wave collision.
3. **Ground cover.** Improve tree crown/branch proportions, clustered bent grass,
   low plants and irregular partly buried rocks. Spend density near the observer,
   with bounded distant representations. Habitat, slope and water determine
   placement. Coordinate-keyed placement must survive cell eviction/reload.
   Frozen scenes stay deterministic; wind is a later isolated addition.

The root agent owns research, specifications, integration and visual acceptance.
Terra agents implement bounded changes with explicit file ownership. Browser and
GPU work is serialized. Runtime procedural code is sufficient for this first
iteration; imported or generated production assets would separately follow the
repository asset brief, provenance and review contract.

## Contracts and budgets

- Canonical ground, water height and water depth remain separate. Rendering,
  walking and environmental placement query the same versioned surface.
- Catalogue IDs, seeds and river profile exports remain stable unless a change
  is explicitly versioned and its saved-location migration documented.
- The combined surface allocation cap remains 256 MiB, including pending terrain
  uploads, CPU/GPU buffers and mipmapped textures. Water has a 16 MiB reservation;
  environment has 12 MiB. Shared textures must be counted and disposed correctly.
- Environment target: at most ten draws, with density and range bounded. No
  per-instance physics bodies in this iteration.
- Keep detail generation away from the main animation loop where practical;
  measure any retained incremental CPU work. The previous cold landing takes
  tens of seconds and remains a known problem to improve, not an accepted final
  seamless-traversal result.
- Desktop target is 60 Hz; report actual adapter and p50/p95 timings. Physical
  headset acceptance is separate from desktop stereo emulation.

## Visual acceptance and iteration loop

Use the existing LETHRA-001 Maithea river bank, lake shore and ocean fixtures,
plus a valley overview and a dry mountain/cliff view. Preserve baseline captures
from the stable-shore release. Compare matching seed, position, heading, date
and lighting; inspect both still images and movement at eye height.

Require visible shape/material improvement, exposed river coverage where the
canonical channel is wet, no new stationary shimmer or background gaps, dry
walking contact, stable resource ownership and deterministic regeneration.
Record limitations and failed experiments. A new normal map alone cannot stand
in for a missing valley, and a pass from orbit cannot stand in for a ground view.

After each accepted iteration, document results and sources, deploy the tested
build and preserve the work in Git. The subsequent priorities are regional
watershed/erosion data, reusable terrain grids and height pages for faster
streaming, then broader biome/species variation and improved atmosphere/shadows.
Life, cities and universe-wide time evolution remain future systems; their
identities should use canonical addresses and dated events/checkpoints.

The lake-reflection experiment uses one bounded near-water planar reflection
pass shared by the visible local surface. Three's `Water` addon demonstrates the
technique, but its flat-plane assumption is unsuitable as a planet-wide drop-in.
It uses a local tangent plane, hides water during reflection, accounts for its
256-square RGBA/depth target (524,288 bytes), and retains a procedural-sky
fallback in XR. Captures run at most ten times per second and reuse a settled
static scene. The projective matrix is stored in planet-local coordinates so
floating-origin shifts do not corrupt the cached image. This reflects actual
terrain and vegetation into nearby lakes; river and ocean shaders still use the
procedural sky. It is a planar approximation, not curved planetary reflection.

## Earlier experiments and review record

The initial numerical audit uses Maithea, `LETHRA-001`,
`G001/C2128,0,1/0/planet/1`, drainage outlet `23165`. Of 62 sampled channel
segment midpoints, 57 were buried by level-8 terrain, with a worst error of
155.928 m above water. At level 12, 43 were buried (3.106 m worst); parent
interpolation could be 15.348 m above the water. This is mesh undersampling.
It is separate from the shoreline ownership defect fixed in the previous release.

The working terrain revision retains the legacy base sampler and region
construction, while `terrain-1.2.0` / `regional-landform-1` adds bounded regional
physical relief. The present residual adds valley-wall/rim height and rock-scale
variation; it is not an erosion simulation or a new planet-wide mountain model.
Existing saved latitudes/longitudes retain their meaning; landing resamples the
current ground height. Historical exact elevations are not preserved by this
surface revision. Region profile/export identity remains independent of it.

Coarse rendering takes a conservative bed envelope over nearby water primitives,
including all overlapping channels and the lake ellipse, then returns to exact
ground at fine levels. This can widen a distant valley and requires a minimum
detail level when the water region is visually significant. Child and parent
footprints use the same global level rule to preserve cube seams and morphing.
The envelope is a representation approximation; canonical water levels are fixed.

Per-tile lattice caches remove repeated parent-corner queries. In a named-fixture
CPU microbenchmark, median generation times changed from 374.14 to 162.86 ms at
L12, 349.95 to 174.54 ms at L18, and 126.04 to 83.50 ms at L22. The compared
geometry/material buffers were byte-identical. These measurements precede the
subsequent overlap-envelope refinement and are not whole-browser frame timings.

The first integrated lake capture (`test-results/realism-next-lake`) passed
stationary pixel stability, coverage and the long walk/rebase, but failed visual
acceptance: low plants appeared as angular fans and the water retained broad
regular bands. It has been sent through another implementation/review cycle.
The active goal is not complete, and this record does not certify that prototype
as the final realism result.

The second lake review (`test-results/realism-second-lake`) also passed the
stationary and long-walk checks: zero changed pixels in the frozen shoreline
ROI, no uncovered background there, and stable contact through an origin rebase.
Cold landing took 129.9 seconds and is a regression to address. The close-up
review still rejected sparse, pointed grass tufts and disconnected-looking fern
leaflets; another geometry pass distributes roots, lowers/droops blades and adds
continuous frond stems. These are review findings, not a realism certification.

Water-floor scheduling initially starved walking support. An attempted shortcut
that bypassed terrain neighbour balancing was rejected because it violated the
edge-stitching contract. The retained approach preserves 2:1 contact balancing
and gives water work lower priority than both contact bands. Its L10 target on
Maithea is **best effort**, with unresolved leaves exposed in diagnostics; whole
region exposure is not guaranteed by a finite walking budget. The strengthened
streaming regression passed with persistent support, balanced active neighbours
and the unchanged leaf/memory caps (76.9 seconds in its inline-worker fixture).

A separate 2 m-grid synthetic audit found water-shape mismatches even with exact
terrain: a bent ribbon missed 745 of 3,119 analytically wet samples; two parallel
unequal-width channels drew over 1,373 samples classified dry by the terrain;
a junction missed 150 of 3,010 wet samples. The legacy river selector uses nearest
**centreline**, whereas rendered water connects averaged-tangent cross-sections.
The new landform helper's wet-edge-distance query does not change that legacy
selector. A future common river-surface representation must resolve coverage,
joins and overlap ownership together; coarse bed widening does not solve this
near-field discrepancy. Preserve the region-generation/profile sampler while
versioning that physical-surface change separately.

The third visual review (`test-results/realism-third-lake`) showed coherent bank
reflections and fuller, shorter grass with connected fern fronds. Its frozen
shoreline remained stable. The first reflection implementation still submitted
over 400 extra draws per capture; the subsequent revision enables terrain
frustum culling during that pass and uses one Fresnel split rather than two
attenuated blends. Native performance of the final revision remains to be
measured; instrumented reflection timings are not a GPU benchmark.

Two paired Maithea tile experiments preserve geometry and water buffers:

- Cached lattice normals reduce repeated terrain queries and shade coarse
  carved walls from their actual shape. The lake fixture's L18 builds changed
  from 186–213 ms to 108–111 ms; L22 from 54–59 ms to 31–45 ms. L12 timings
  overlap, so no speed claim is made there. Coarse normals intentionally change;
  fine ones differ only near floating-point noise. Shared hydrology/cube-edge
  normals are covered by regression tests.
- L14–19 macro-colour maps now use 64 square texels instead of 128; finer
  material grain still comes from the ground atlas. L14 builds changed from
  113–165 ms to 48–52 ms and L18 from 104–125 ms to 43–45 ms in three cold
  samples. Map storage changes from 67,600 to 17,424 bytes. Geometry, water,
  normals, material weights and indices match byte-for-byte in this paired
  comparison; map pixels and their UV/gutter mapping intentionally change.

The standalone `river-surface.ts` prototype uses deterministic polygon ownership
and one triangle representation for wetness, height and depth. It has not been
connected to runtime terrain or water. Real-fixture testing caught degenerate
caps and mismatched triangle queries that the small fixtures missed; these were
corrected before integration. Memory compaction and join continuity remain
acceptance work. A successful synthetic test is not evidence that the live
river renderer has already been replaced.

The fourth lake review (`test-results/realism-fourth-lake`) completed its strict
stationary coverage checks and long walk through an origin rebase without page
errors. Cold landing took 60.5 seconds, compared with 132.6 seconds in the third
capture. These are individual instrumented runs, not a controlled frame-rate
benchmark. The close-up still shows overly spiky grass clumps and angular fern
leaflets. Distant carved banks have abrupt dark facets: the conservative bed
envelope currently stops abruptly at its outer limit. The next correction keeps
the full conservative core and adds a smooth outer apron; it must retain shared
cube-edge sampling and exact near-contact terrain.

Before shared river-surface integration, require independent triangle-centroid
query agreement, polygon-hole preservation, non-overlapping ownership, and a
water/depth continuity audit across final triangle edges. Count compact query
indices and a nearest-triangle bank BVH, both worker and main-thread copies,
render geometry, lakes, the normal atlas and reflection target. Source-local
vertex welding alone does not establish hydraulic continuity. These checks
remain acceptance gates rather than claims about the deployed renderer.

The fifth lake capture keeps the strict frozen-shore checks passing, with a
57.6-second landing. Its distant bank no longer has the earlier repeated teeth.
Ground-cover silhouettes still need work. The shared-surface experiment caught
an important construction error: capping every segment creates shallow internal
ends. Shared node cross-sections, with caps only at channel endpoints, reduce the
Maithea prototype from 29,465 to 2,061 triangles while preserving all 2,061
centroid/query matches and deterministic output. Accounted prototype storage
falls to 605,036 bytes. These values precede confluence correction.

A remaining tributary junction differs by 0.160 m in water level and 3.063 m in
depth across its ownership edge. The next experiment makes the partition
conforming: split edges at existing vertices, preserve those edge subdivisions,
and share vertex heights/depths across channels. A clipped tributary boundary
inherits the parent mesh's interpolated values. The rendered/query surface can
then meet continuously without changing the immutable river profile export.
This remains an experiment until its topology, continuity, shoreline traversal
and allocation checks pass. General constrained Delaunay triangulation was also
reviewed as an alternative; no new triangulation dependency has been adopted.

## Sources and interpretation

- [Terrain Amplification using Multi-Scale Erosion](https://h-schott.github.io/p/mserosion/)
  describes hydrologically consistent amplification using several erosion and
  deposition approximations. It motivates the regional terrain experiment;
  the current app does not implement that paper's full solver.
- [GPU Gems: Effective Water Simulation from Physical Models](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models)
  separates geometric waves from fine normal detail and relates wave parameters
  to physical scale. We use this as guidance for a bounded water shader, not as
  a claim of a fluid simulation.
- [GPU Gems 2: Toward Photorealism in Virtual Botany](https://developer.nvidia.com/gpugems/gpugems2/part-i-geometric-complexity/chapter-1-toward-photorealism-virtual-botany)
  informs plant structure and level-of-detail choices. Our allocation and draw
  budgets are project decisions, not benchmarks from the chapter.
- [Three.js Water](https://threejs.org/docs/pages/Water.html) documents a flat
  reflective surface and the cost/quality role of reflection texture size.
  The installed addon source informs the local-lake reflection experiment.
- [polygon-clipping](https://github.com/mfogel/polygon-clipping) provides polygon
  Boolean operations for the integrated shared river surface. Version 0.15.7
  is pinned, under its MIT license.
- [poly2tri.js](https://github.com/r3mi/poly2tri.js/) describes constrained
  triangulation with holes and interior points. It is a reviewed alternative,
  not an installed dependency or a claimed part of the implementation.
- [Practical Real-Time Hex-Tiling](https://jcgt.org/published/0011/03/05/)
  is a candidate for breaking ground-material repetition in a later measured
  comparison; it is not yet an imported dependency.
- [Earlier research](terrain-research-2026-09-13.md) and
  [stable-shore findings](stable-shores.md) retain the depth, precision,
  hydrology, streaming and migration rationale.

These are primary author/publication sources, consulted on 2026-09-13–14. Algorithm
selection and the staged implementation above are our engineering assessment.
