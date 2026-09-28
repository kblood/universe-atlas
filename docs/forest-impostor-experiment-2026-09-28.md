# Exact individual distant-tree experiment

Status: isolated renderer experiment, not integrated or deployed. These are
the existing faceted prototype trees. This stage establishes population and
representation continuity; it does not deliver the planned realistic assets.

## Representation

`tree-shape.ts` shares the existing geometry and up-align/world-yaw rotation.
Byte hashes verify that extracting it changed no position, normal or colour
attribute in either shipped tree mesh. Each far tree retains its own canonical
root, height, yaw and appearance roll.

`ForestImpostors` draws two triangles per individual with three four-float
attributes (48 bytes): local root/height, quaternion, and appearance/ground
metadata. It uses a plain mesh with instanced geometry, not an instance matrix.
Coordinates remain doubles until subtraction of the local origin. The shader
intersects the original four convex icosahedron crowns and four-sided trunk,
then writes the hit depth and normal. Perspective and logarithmic depth are
handled explicitly. Crown geometry is exact; trunk lighting uses face normals
instead of the mesh's interpolated cylinder normals.

The initial smooth-ellipsoid experiment was rejected: mean fitted coverage was
close, but its worst view still differed by 3.28%. The unscaled enclosing
ellipsoids were substantially larger. The accepted point-sampled prototype
uses planes derived from the actual mesh geometry.

## Checks and measured limits

- [Single-tree report](../test-results/forest-impostor/report.json): 64
  orthographic directions; maximum projected-area error below 0.01% against
  the mesh. All mask disagreements touch a one-pixel boundary. Doubling the
  quad bounds produces no interior mismatch. Perspective views and opaque
  occlusion are checked at 24, 64, 650 and 4,000 m, including both poles.
- Edge coverage uses the convex ray interval and screen derivatives with
  alpha-to-coverage when the active target is multisampled. Without MSAA it
  uses binary coverage. The 64-view oracle intentionally disables this filter
  to compare physical silhouettes. Separate 0/2/4-sample target checks keep
  projected coverage within 0.3% across those views (1% test gate). Tiny distant
  subpixel crowns and temporal shimmer still need quantitative acceptance.
- The lab creates an explicitly opaque WebGL context. This installed
  `super-three` version requests an alpha canvas regardless of its `alpha`
  constructor flag. Compositing partially covered alpha over page white
  produced bright borders in an early lab run. That run is not acceptance
  evidence; the game postprocess path still needs its own check.
- [Full field report](../test-results/forest-impostor-field/report.json):
  149,479 canonical trees, 6,684 conservative patches, original habitat and
  three canonical river regions, 4.5 km root radius. This clips jittered roots;
  Luna's independent 149,478 count clips production cell centres. Both retain
  canonical existence. Neither difference changes population generation.
- RTX 5090, 1440×900, 40 GPU timer samples per case: one recorded run measured
  GPU p50 approximately 2.51/3.52 ms for the full mesh reference at 120/1,200 m
  altitude, versus 2.57/2.59 ms for the proxy. These include coarse terrain and
  are not game frame times or a general speedup claim. Triangle counts were
  14,382,752 versus 331,726; both used two draw calls. Proxy instance attributes
  occupied 7,174,992 bytes, excluding other CPU/GPU allocations.

Inspect [mesh reference](../test-results/forest-impostor-field/reference-120m.png)
and [proxy](../test-results/forest-impostor-field/impostor-120m.png), plus
[reference above the canopy](../test-results/forest-impostor-field/reference-1200m.png)
and [proxy above the canopy](../test-results/forest-impostor-field/impostor-1200m.png).
There are no shadows, wind, aerial perspective, authored trees, or live
streaming in this lab. Ground is a coarse sampler-derived surface.

## Residency foundation

`forestPatchAddresses` visits 8×8 address patches without hashing hundreds of
thousands of cells on the main thread. It shares the production face windows
and conservatively expands the radius by each patch's UV half-diagonal. Tests
cover all face centres, seams, corners, a smaller sphere, and the real fixture,
checking every production-selected cell is included. Priority depends on
distance; identities and habitat do not. Local ranges above 0.1 planet radius
are rejected. Residency is capped at 32,768 addresses; this is separate from
the worker's 16,000-entry completed-result cache and is not a heap measurement.

## Still required before enabling in the game

1. Bound host requests, queued replies, resident slots and installation work.
   Preserve completed results through movement and expose missing/failed state.
2. Retain a stable local origin and prove submillimetre placement agreement with
   near trees, including rebases and cube seams.
3. Gate near/far replacement on actual readiness and capacity. Use complementary
   screen coverage; current object-space alpha hashing cannot pair two proxies.
4. Apply dated life/water eligibility, shared aerial perspective at the ray hit,
   outer distance/altitude fades, and runtime disposal/error fallback.
5. Measure cold/warm flight, turns and approaches in the complete game; review
   MSAA 0/2/4, temporal edges, shadows and a declared desktop hardware floor.
6. Replace primitive silhouettes with the planned bounded, authored species
   variants and asset-derived distant representations.

Opus recommended evaluating exact individuals over aggregate clumps in the
[design review](opus-5.5-census-design-review-2026-09-28.md). That recommendation
is not a review or approval of this shader implementation.
