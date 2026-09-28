# Authored tree capture lab — 2026-09-28

**Status: experimental capture and preview only. No captured tree is accepted
or connected to the planetary renderer.** This is a follow-on to the v7 tree
authoring check and the [distance representation design](authored-tree-distance-design-2026-09-28.md).

## Current implementation

The first capture-lab app checkpoint is historical (`96891a0`); current v2 is
app capture commit `3d1daa0` and preview commit `a7841af`, with root-tool
checkpoint `6c8f929` (capture implementation `28d88d7`). The captured preview
path remains a development experiment separate from the planetary forest
renderer.

The v2 capture tool and development lab use `tools/assetctl/tree-impostor.mjs`,
`src/tree-impostor-capture.ts`, `src/tree-captured-impostor.ts`,
`src/tree-impostor-lab.ts` and `tree-impostor-lab.html`. V2 stores normal XYZ
and depth separately from a leaf-class channel. It also adds shader patch
sentinels, material cache-key composition, liveness checks and source hashing.
These changes respond to the [Opus 5.5 source-only review](opus-5.5-tree-capture-review-2026-09-28.md);
that review itself did not run code or inspect capture artifacts.

The full-sphere 9 × 9 capture uses 128-pixel view interiors and 4× source
supersampling. Its 16 m capture and repeat match across all 2,592 output
artifacts on the recorded RTX 5090 adapter. The independent Luna audit passes
3/3 capture checks, and the capture/filter/view-basis CPU suite passes 21/21.
Smaller 10 m and 22 m checks use a 3 × 3 grid (nine 32-pixel views) at 2× supersampling. The
10 m case contains leaf-class coverage; the 22 m case has zero leaf-class
coverage in every view and mip, leaving bark-only coverage. The 22 m setting
therefore fails this capture check and neither variant is an accepted asset.
See the [audit receipt](../test-results/tree-impostor-v7-color-a/capture-v2-audit.json)
and [CPU test log](../test-results/tree-impostor-capture-v2/combined-cpu-test.log).
The separate [portable root-tool check](../test-results/tree-impostor-v7-color-a/capture-v2-portability-audit.json)
passes four tests with the retained capture inputs configured; without those
inputs, three tests pass and the artifact audit reports one expected skip. This verifies
portability guards, not cross-GPU render equivalence.

V2 uses **28,311,120 uncompressed GPU bytes per height class** for 81 views,
including full mip chains: RGBA8 sRGB colour/coverage, RGBA16F normal/depth,
and RGBA8 classification stored in R. This is a lab allocation estimate, not
a production memory budget. Compression, multiple species and variants are
not included.

## Coverage comparison and limitations

At native 128-pixel capture resolution, the mesh and reconstructed view differ
by as much as 38% in silhouette coverage. In a matched-source experiment, a
512-pixel source render reduced to 128 pixels gives IoU above 0.9993 on the
four captured axes. An arbitrary `[1, 0.3, 1]` direction reaches only 0.7203
IoU. This is sampling evidence for selected views, not general coverage
acceptance. Current evidence points to mip reduction of native alpha-MASK leaf
cards as a major mismatch source. The reconstruction review identifies
premultiplied filtering and bounded depth marching as possible follow-up work;
these are not part of the current accepted result. No general silhouette fix
has been established.

The 21 CPU checks include two for an isolated coverage-weighted GPU packing
helper. That helper is not yet used by the reconstruction shader. The optional
mesh coverage experiment uses Three's built-in hashed alpha testing; it does
not change the historical MASK capture contract. See the
[Three material documentation](https://threejs.org/docs/pages/Material.html) and
[Wyman and McGuire's method](https://research.nvidia.com/sites/default/files/pubs/2017-02_Hashed-Alpha-Testing/Wyman2017Hashed.pdf).

The development lab displays one exact-height tree. It does not instance a
forest, support wind, cast impostor shadows or perform a mesh/impostor handoff.
The 22 m / 32-pixel capture fails leaf classification; the 10 m result is only
a technical capture check. There is no LOD transition, species/planet binding,
packaged asset, midrange profile or game integration. Two triangles in the lab
do not establish a frame-time gain or realistic canopy.

The RTX 5090 browser smoke reaches all 81 capture directions with finite
outputs, no WebGL errors and successful probe-state restoration and failed-load
rollback. Matched 128-pixel views reach 0.99937–0.99964 coverage IoU on capture
axes, but an intermediate direction is 0.7203 with the source MASK and 0.7324
with optional hashed coverage. That small change does not resolve the mismatch.
The lab's large proxy view is a stress view, not an ordinary-distance quality
claim. See the [browser report](../test-results/tree-impostor-render-v2-hardware/browser-report.json)
and [combined CPU log](../test-results/tree-impostor-capture-v2/combined-cpu-test.log).

The [Opus 5.5 capture review](opus-5.5-tree-capture-review-2026-09-28.md) is
source-only and did not inspect artifacts. A separate
[reconstruction review](opus-5.5-tree-reconstruction-review-2026-09-28.md)
discussed supplied diagnostic reports without independently generating or
accepting them. Its proposals are not all implemented. Both archives preserve
the returned response, scope, model identity and input hashes. The raw
comparison experiments remain in `test-results/tree-impostor-render-v2/`,
`test-results/tree-impostor-render-v2-matched/` and
`test-results/tree-alpha-experiment/`; they are diagnostics, not acceptance
evidence.
