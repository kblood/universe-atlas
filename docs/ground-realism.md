# Ground rendering realism

## Current direction — 2026-09-27

Follow the [desktop realism plan](desktop-realism-implementation-plan-2026-09-27.md) for the next rendering and content stages. The implementation described below is an earlier baseline; realistic authored/procedural tree assets, shared lighting and aggregate canopy are not completed by that baseline.

2026-09-13. Design: [walking-height correction specification](ground-realism-spec.md).
This pass responds to the supplied Oraeva riverbank screenshot. It changes
rendering and local vegetation, and fixes runtime lake-bank interpolation while
preserving the generated `river-region-1` records.

## Corrections

- Walking terrain previously froze visual refinement after 90 leaves while
  continuing to refine contact patches. Visible surrounding banks can now use
  the remaining walking budget. Contact priority and fixed resource caps remain.
- Inland wet texels have a separate tile alpha mask. Nearby physical water
  replaces the coarse terrain-water proxy at full relief within 12 km; distant
  and orbital views retain the proxy. Baseline ocean and all dry texels retain
  opaque alpha. This prevents interpolated bank triangles from displaying blue
  water above its actual surface. Masking is conditional on installed water.
  Wet-mask alpha is sampled explicitly at mip level zero while RGB retains
  normal mip filtering. Only the fully wet alpha core (`< .001`) is discarded,
  retaining a conservative terrain fringe beneath physical water. This reduces
  coverage loss; it does not eliminate every mesh/mask shoreline seam.
- River and lake shading uses local metre coordinates, small ripple normals,
  depth absorption, view-angle Fresnel sky reflection and restrained sun glints.
  Water views are computed relative to each chunk anchor, including elevation.
  River fragments inside a lake are discarded at its analytic ellipse; river
  triangles outside it remain intact. Dropping entire crossing quads would
  create uncovered channel gaps and was rejected during review.
- Local vegetation has a separately versioned placement distribution, smaller
  leaf sprays, tapered trunks and denser stands with clearings. Its lighting
  uses the planet frame, including sky fill and daytime/nighttime response.
  Rendering does not change tree positions when the camera frame is rebased.
- Ground materials add metre-scale colour patches and pebble variation, with
  filtered fine normals and a bounded perturbation at grazing angles. Material
  phases agree at tile boundaries; material detail does not change physical height.
- The main terrain light is updated from the current star/planet direction,
  including date changes and VR model rotation.
- Explicitly leaving a focused body through the System breadcrumb stops manual
  flight, preventing automatic body focus from immediately undoing the exit.
  Continuous flight between bodies retains its automatic focus behaviour.

## Performance and compatibility

Terrain retains 768 maximum walking tiles, 512 walking draws and a 256 MiB
accounting budget. Water retains 64 draws and 16 MiB. Vegetation retains bounded
cells, at most one forest cell and one grass cell generated per update, and a
12 MiB accounting budget. These are
resource limits, not measured headset-performance claims. This pass adds no
external art assets, models, fluid simulation or reflection render targets.

Existing river exports and saved addresses refer to the same physical model.
Lake-bank interpolation has a separate `river-surface-2` query revision: the
previous selector abruptly switched to a neighbouring river bank just outside
the lake ellipse. This correction changes local bank heights, pinning them to
the lake surface before blending back to surrounding terrain. Existing walking
positions are resolved against that corrected surface. The original sampler is
retained for constructing `river-region-1` records, preserving their profile,
site records, reference statistics and export hash. These reference site heights
are distinct from corrected runtime query heights; navigation queries the
current surface. Surface diagnostics and catalogue exports expose the query
revision separately. This is an interpolation bug fix, not a dated geology event.
The vegetation rendering revision is explicit; it is not a simulated ecological
event. Underwater access, tree collision, animals, settlements and inhabitants
remain outside this change. Walking still checks the shared dry/wet surface.

## References and provenance

The root agent wrote the specification and reviewed the integration. At the
user's request, `gpt-5.6-terra` subagents implemented terrain/water and vegetation
changes. Root implemented ground shading and light-frame integration and owns
the screenshot, browser and release checks. All visual templates are authored
in source; no checkpoints or third-party art were downloaded.

Primary references checked 2026-09-13:

- [Finch, GPU Gems: Effective Water Simulation from Physical Models](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models)
  motivates metre-scale waves, fine normal detail and angle-dependent reflection.
  Our small analytic shader is an approximation, not a reproduction or fluid solver.
- [Three.js MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html)
  documents material and texture behaviour. Shader hooks were checked against
  the pinned local Three.js shader chunks; current website documentation is
  background, not the runtime version contract.
- [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html)
  documents instance transforms and explicit disposal. Geometry, instance and
  texture allocations remain separately owned and accounted.

The walking quadtree no longer rebuilds on a fixed 15-frame idle timer. Camera
position, view direction, projection, completed tiles and due retries trigger
selection; conservative visibility culling still runs every frame. This avoids
periodic idle stalls without dropping worker recovery or look-around refinement.

## Validation

The numerical suite passes 60 tests. In the Maithea / Orien Delta fixture,
96 shoreline-normal samples, one centimetre either side of the lake boundary,
found a maximum height step of 148.996829 m in the previous sampler. The corrected
surface measures 0.002719 m. Scans across every main-channel and tributary
wet/dry station measure at most 0.018309 m over the same two-centimetre span.
The lake collar also loses its weight at competing river edges, so smoothing
the lake does not create a new step beside its inflow/outflow channels.

The final integrated river browser walkthrough passes generation/export,
bank arrival, walking along the bank, water refusal, collision agreement,
cold saved-location restoration, shared-date seeking/reset, lake-shore landing,
and cancellation/disposal on departure. There are no browser errors. Its region
and export SHA-256 remain
`a6a1eb52d152bfc59c18d356a2e6a5088d10a1a11915273adae8cbaae25d9fd5`.
The walk stops 0.25 m from the queried wet boundary.

On an RTX 5090 through ANGLE/D3D11, 120 settled-bank frames measure 16.5 ms
median and 19.6 ms p95; terrain updates measure 2.7 ms median and 4.0 ms p95.
The first integrated iteration, before the idle selection correction, measured
16.4/33.9 ms frame median/p95 and 2.2/18.3 ms terrain median/p95. These small
desktop samples are indicative, not a cross-device benchmark. Combined terrain,
water and vegetation accounting is 178,003,577 bytes (169.8 MiB); water is
1,658,864 bytes and vegetation 1,431,555 bytes. Cold terrain/contact preparation
can still take minutes at the expanded walking allocation; the two-job worker
limit bounds installation bursts but needs further scheduling work.

Inspect the local review captures under `test-results/realism-final/`:
`02-bank-grounded.png`, `03-bank-walk.png`, and `04-lake-shore-grounded.png`.
They show denser stands with smaller leaves, daylight shading, finer water
ripples and substantially smoother lake banks. They also show remaining
distant bank faceting, occasional near-shore seams and sparse low vegetation.
The trees remain procedural card geometry with a limited branching silhouette;
there are no tree/terrain reflections in the water and no vegetation shadows.
This is a correction release, not a photorealistic environment or completed biome
system. The supplied Oraeva image did not include a reproducible address; the
controlled visual review uses Maithea / Orien Delta rather than claiming an
exact before/after at Oraeva.

The IWER Quest 3 stereo/controller regression also passes on the first integrated
build with no browser errors. It validates interaction, not physical-headset
performance or the final regional foliage appearance in a headset.

The planetary regression passes orbital approach, north/south polar travel,
descent, an airless moon, resource limits and disposal on returning to the
universe. Maximum measured orbital-radius drift is 0.000107 m.
The broader walking fixture has a higher streaming cost than the settled river
sample: 180 frames measure 26.1 ms median / 36.4 ms p95, with terrain work at
17.8 / 25.6 ms. Higher visual detail therefore still needs CPU scheduling work;
the river sample must not be read as a universal 60 fps claim.

The final walking run with an injected terrain-worker failure passes recovery,
landing, walking/jumping, saved-pose restoration, shared-date changes, moon-pole
walking, takeoff, and explicit System/Galaxy/Universe breadcrumb exits. The
original run exposed an active-flight reentry race on explicit System exit;
the final run verifies the fix. Recorded contact mismatch while walking is
0.000005 m and browser errors are empty. Reports are in
`test-results/realism-walking-final/` and `test-results/realism-planet/`.

Final shader review uses `test-results/realism-shore-review/` (bank and lake)
and `test-results/realism-mask-conservative/` (the final lake mask). Both land
on the corrected dry surface without shader errors. The conservative mask
reduces the exposed background gap, but a narrow near-shore strip and far-bank
faceting remain visible. Fine terrain skirts are also still deep relative to
their tile width; changing their coverage safely needs a dedicated mesh-edge
review rather than claiming the mask alone fixes all seams.

## Release

Published to [Universe Atlas](https://dionysus.dk/webxr/IWSDK/universe-atlas/)
with the repository release script; the shared IWSDK index card is updated.
HTTP verification matches SHA-256 for all 24 checked application HTML, JavaScript,
CSS, README and documentation files against the local build. The shared index
also matches byte-for-byte. The verification record is
`test-results/realism-live-hashes.json`; review screenshots remain local files.
