# Physical ground and stable shores

2026-09-13. Implementation of the first slice in the
[terrain specification](terrain-v2-first-slice-spec.md), following the
[research and source audit](terrain-research-2026-09-13.md).

## Why the previous approach failed

The baseline `5088e7d` represented submerged terrain at the water surface. It
then discarded selected terrain fragments using a filtered texture mask while
an independently triangulated river/lake surface covered the opening. This
created two incompatible definitions of the shoreline. Raising water by 10 cm
and adjusting the mask threshold did not establish continuous coverage.

The untouched lake-shore recording and ground/water/skirt views are retained in
`test-results/shore-baseline/`. Ground-only views expose rectangular masked
holes, while skirt-only views show large vertical curtains crossing the lake.
The ordinary view shows the strip at the near bank and broken distant terrain.
The baseline stationary recording also changes during ongoing tile refinement;
that count must not be interpreted as a pure measurement of depth fighting.

## Surface and rendering contract

`groundHeightM` is the solid bed, `waterHeightM` is the independently owned
water level, and `waterDepthM` is their nonnegative difference. Terrain vertices,
normals and walking colliders now use the bed. The terrain colour texture is
opaque and never decides physical coverage. Legacy `visibleHeightM`,
`rockHeightM` and `waterLevelM` retain their prior meanings for navigation,
orbital previews and saved-location compatibility.

River and lake geometry owns inland water at its authored height, without an
artificial lift. The existing analytic river/lake ownership rule prevents a
river ribbon from drawing through a lake. Ocean water uses separate copies of
the active terrain grid at sea level; it shares parent interpolation, edge
locks and leaf selection with the ground. Ocean meshes have no skirts.
Ocean draws are skipped only when a separating-plane test proves that every
ground child/parent vertex lies above every ocean child/parent vertex along the
tile's outward axis. All morph and edge-lock combinations remain within those
bounds; overlapping bounds retain the draw. This keeps the test cheap and
conservative without guessing an unsampled coastline.
The terrain fallback globe is hidden once all six root tiles are available.

Precision-sensitive shading uses eye and fragment positions relative to the
patch anchor, in metres. Fragment fog heights interpolate explicit metre
attributes rather than reconstructing a planet-radius position and subtracting
one. Canonical coordinates and double precision remain authoritative on the CPU.

Skirts still cover temporary transitions. Their depth is the measured maximum
parent/child separation at the patch edge plus a 25 cm allowance. Settled,
stitched neighbours disable them. The previous level-only formula produced a
158.5 m skirt on the reported planet at level 18; the sampled replacement is
approximately 0.25 m. This changes fallback geometry, not the terrain field.

The motion audit also exposed a separate idle-camera defect: the grounded
kinematic capsule accumulated tiny snap-to-ground corrections without input.
It now rests after two small settled steps, waking on movement, jump, missing
terrain or changed collider topology. The physics origin remains local and
rebases during longer walks.

The bank-approach regression exposed a geometric sampling limit after replacing
the flattened water proxy with the bed. At a dry point next to the river, the
old level-18 triangle lay 26.4 cm below the analytic bank; level 20 still missed
by 5.0 cm. The level-22 triangle missed by 1.1 mm. Hydrology worlds therefore
retain the ordinary 1.4 m contact target around the player and add a finer
0.09 m target only within a three-metre contact band. Collision patches cover a
continuous one-metre support area, including across cube faces. Surrounding
ground retains the ordinary LOD. The bank sampler and river profiles are unchanged.

Fine contact refinement is ordered by distance to the capsule, before the broad
walking ring. Equal priorities could exhaust the leaf limit before completing
the last supporting tile, leaving a lake landing waiting indefinitely even with
no pending workers. The reproduced location now completes its support; a
standalone streaming regression exercises the real tile builder and selector.

Streaming now enforces a byte budget in addition to tile counts. It reserves
28 MiB for inland water/environment, accounts for the shared ground atlas,
and reserves 374,406 bytes for each pending worst-case tile before admission.
The walking tree permits 450 leaves, leaving space for their ancestors and new
contact tiles under the 256 MiB combined cap. Ocean arrays, metre heights,
CPU/GPU copies and texture mipmaps participate in the accounting. This is an
allocation budget, not a claim to measure total browser-process memory.

Dry terrain retains its existing colour. Wet bed material receives a substrate
colour. Fine materials retain derivative filtering; ocean ripple phases wrap
consistently across the same 4096 m canonical period as the ground material.
Tiny patches use smaller macro-colour textures: 64 pixels at level 19 and 32
at level 20 and above, with gutters. The shared ground material supplies surface
grain. Wet substrate classification avoids extra finite-difference terrain
samples per texel, keeping fine contact generation practical.

## Determinism and migration

Catalogue IDs, universe seeds, geology version, drainage topology and authored
river profiles are unchanged. Surface queries add explicit fields; applications
that hash an entire query object should distinguish this interface change from
changes to the generated world. Generated geometry buffers intentionally differ
because they now contain the bed and separate ocean surface.

Swimming remains disabled. A submerged bed is represented to make shore coverage
correct and to support later underwater work; this release does not add an ocean
exploration mode.

## Validation

The browser harness `tests/shore-stability.mjs` records WebM footage, isolated
surface views, a repeatable ten-metre bank walk and a pan. It compares 120
consecutive rendered frames with water and terrain selection/morph frozen,
excluding HTML UI. RGB channel differences of at most two are tolerated.
A magenta clear colour exposes background in the ground/water coverage view.
Readback synchronizes the GPU, so timings from this instrumented capture are
not normal rendering performance figures.

Run the strict shore check against an already built preview:

```powershell
$env:ATLAS_HARDWARE='1'
$env:ATLAS_SHORE_ASSERT='1'
$env:ATLAS_RESULTS='test-results/shore-validation'
node tests/shore-stability.mjs
```

Set `ATLAS_SHORE_KIND` to `river-bank` or `ocean` for the other fixtures. Set
`ATLAS_SHORE_LONG=1` to add the water-boundary approach and a 90 m run that must
cross the local physics origin. `npm run test:streaming` reproduces the formerly
stalled lake selection without a browser, using the actual generated tiles.

Numerical checks cover submerged beds, dry contact agreement, opaque coverage,
ocean topology, shared cube edges, parent endpoints, deterministic regeneration,
wet walking refusal and local water uniforms.

The first complete shore captures (`shore-final-lake`, `shore-final-river`,
`shore-final-ocean` under `test-results`) each recorded zero changed pixels over
the 120 frozen frames and zero exposed-background pixels in the 500×180 shore
region. They also recorded ten-metre walks and pans without browser errors.
The captures found the original near-bank strip removed. Distant bank faceting,
simple vegetation and broad, smooth hills remain visible; the scene is not yet
the requested final level of landscape realism. These captures preceded the
additional fine contact band and explicit memory admission guard, which are
covered by the subsequent movement regression and longer recording.

The integrated build passes all 72 numerical tests. Browser regressions pass
river-bank approach and walking, lake landing, cold saved-position restore,
date changes, departure during generation, walking with an injected worker
failure, moon-pole landing, planet traversal, and IWER Quest 3 stereo emulation.
This is desktop emulation; no physical-headset performance claim is made.

The deployment smoke check also exposed an existing approach-state defect:
automatic unfocusing beyond 30 body radii retained the flight target but erased
its requested altitude. Low-orbit approach could then stop at the default
4.2-radius viewing distance. Automatic transitions now retain the altitude;
deliberate breadcrumb exits still clear it. The navigation regression starts
outside that boundary and checks arrival at the requested altitude. The complete
browser run passes (`shore-navigation-accepted/browser-report.json`), including
deep-link reload, repeated universe navigation, transition cancellation and
mobile layout.

The final river run (`shore-rivers-accepted/report.json`) retains the baseline
region/export SHA-256
`a6a1eb52d152bfc59c18d356a2e6a5088d10a1a11915273adae8cbaae25d9fd5`.
Its measured combined allocation is 217,673,543 bytes (207.6 MiB), below the
256 MiB cap. On the local RTX 5090 through ANGLE/D3D11, 120 settled frames have
median 16.6 ms and p95 22.2 ms; terrain updates have median 2.5 ms and p95 4.4 ms.
The previous release's corresponding run measured 16.5/19.6 ms for frames and
2.7/4.0 ms for terrain updates, with approximately 169.8 MiB accounted. The new
representation costs more memory and draws; this is a correctness improvement,
not a demonstrated overall speedup. Walking's separate 180-frame sample measured
16.7/32.1 ms, including ongoing refinement. These are single-machine samples,
not portable frame-rate guarantees.

The final strict long lake recording (`shore-long-lake`) landed in 72.8 seconds,
then recorded zero changed pixels over the 120 frozen frames and zero exposed
background pixels in the shore region. It completed the bank walk, pan,
water-boundary approach and a further 90.7 m run, crossing a 64.4 m physics-origin
shift. Final contact mismatch was 0.0000026 m and the conservative combined
reservation was 258,551,712 bytes (246.6 MiB). No browser errors occurred.
The standalone streaming regression also passes. Its inline worker is a
correctness harness, not a browser latency benchmark. Cold landing still takes
tens of seconds, and active walking can wait for new contact tiles; reducing
generation latency remains a priority for the reusable-grid/height-page work.

Normal, isolated, boundary and post-rebase screenshots, frame-difference data,
and before/after WebM recordings are preserved under the ignored local
`test-results/shore-*` review directories. The far lake bank still has obvious
angular dark faces, and vegetation remains sparse and simple. Coverage views
distinguish these rendered faces from background holes; this release does not
claim to fix that landscape shape or complete the visual-realism goal.

## Next terrain work

This slice repairs the surface representation. The existing river pilot still
fits a bounded region into noise terrain; the distant hills and vegetation are
not the final realism target. The next experiment should generate a coherent
watershed with constrained outlets, ridges, valleys and erosion-informed detail,
then compare reusable GPU grids and cached height pages at equal resolution.
It should preserve the established ground/water and canonical-address contracts.

## Sources

- [CDLOD reference implementation](https://github.com/fstrugar/CDLOD): related
  terrain selection and morphing design. This slice retains the existing local
  quadtree rather than importing another renderer.
- [GPU Gems 2: geometry clipmaps](https://developer.nvidia.com/gpugems/gpugems2/part-i-geometric-complexity/chapter-2-terrain-rendering-using-gpu-based-geometry):
  reusable grids and bounded terrain data for the subsequent prototype.
- [NVIDIA: visualizing depth precision](https://developer.nvidia.com/blog/visualizing-depth-precision/):
  depth precision and the need to distinguish it from duplicate geometry.
- [Cesium relative-to-eye coordinates](https://cesium.com/downloads/cesiumjs/releases/b20/Documentation/czm_translateRelativeToEye.html):
  precedent for retaining small local differences in large worlds.
- [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html):
  renderer and depth configuration. This release retains the installed
  logarithmic-depth path rather than depending on a new device extension.
- [Multi-scale terrain erosion](https://h-schott.github.io/p/mserosion/):
  research direction for the following bounded watershed experiment, not an
  imported browser dependency.

The longer research document lists the hydrology, uplift, materials and
atmospheric-scattering references and explains their proposed roles.
