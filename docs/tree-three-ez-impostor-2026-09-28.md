# Existing distant-tree renderer: Three.ez comparison

Date: 2026-09-28. Development experiment; no game adoption or visual acceptance.

## What is reused

Atlas now has a comparison lab using Andrea Gargaro's MIT-licensed
[Three.ez octahedral impostor](https://github.com/agargaro/octahedral-impostor/tree/ca0046a49fef8f8c75745a6e49e52752ef3cf8e3),
pinned at `ca0046a49fef8f8c75745a6e49e52752ef3cf8e3`. An impostor renders
multiple views of a tree into textures, then blends nearby views on a small
camera-facing mesh. This is an established distant-object technique. The
comparison tests this implementation against the actual Atlas-material
[EZ-Tree family F](tree-ez-family-2026-09-28.md), not a different sample tree.

The named assetctl operation validates a brief, verifies all 17 vendored files,
and bundles a fixed entry point with `three` external. The resulting 27,267-byte
bundle has SHA-256
`3d29cb7e45f265c434b0090d62a093639a71d0f1fe415d6f00e24bd7ac573180`.
The browser checks that source hash against the manifest. The generator source
and bundle remain unmodified; the lab records its optional adapter separately.
The [CPU checks](../test-results/three-ez-impostor-reference/cpu-tests.log)
include repeatability and building from a different working directory.
The [validated reference brief](../assets/briefs/atlas-three-ez-impostor-reference.json)
records the target, source revision and limits of this experiment.

## Unmodified baseline

The [initial report](../test-results/three-ez-impostor-reference/report.json)
and [methods](../test-results/three-ez-impostor-reference/README.md) preserve
the original run on Chromium 149 / ANGLE D3D11 / RTX 5090. It captures a static
16 m tree with 13,806 source triangles into a 16×16 upper-hemisphere grid on
two 2048² RGBA8 atlases. Each view is 128² pixels. The two-triangle proxy retains
one capture render target; the two textures with full mip chains account for
about 44.7 MB before other resource costs.

At a 128 px footprint with **both sides supersampled 2×**, mean silhouette IoU
was approximately 0.93–0.96 for the supported views. Those scores do not test
native distant mip behavior. More decisively, the lit images contain a visible
repeating atlas grid, so plausible silhouettes did not establish usable colour.
The [original mesh](../test-results/three-ez-impostor-reference/front-mesh.png)
and [original proxy](../test-results/three-ez-impostor-reference/front-impostor.png)
make that distinction inspectable.

The initial matched single-tree GPU p50/p95 measurements were about
0.066/0.070 ms for the mesh and 0.032/0.035 ms for the proxy. These are isolated
pass measurements, not forest or whole-game performance. The reported capture
construction time measures CPU submission and cleanup, without a GPU fence.

## Minimal adapter and revised comparison

An upstream string replacement matches a **commented** map include before the
live include. Atlas's optional adapter repairs that one live include and
records shader audits before and after it. It does not change the capture or
reconstruction algorithm. The [Opus assessment](opus-three-ez-impostor-review-2026-09-28.md)
explains the defect, review scope and subsequent fixture corrections.
Three independent [shader adapter tests](../test-results/three-ez-impostor-reference/shader-tests.log)
pass against the actual pinned GLSL and installed Three.js shader. They check
the comment-first failure, repair location, declaration counts and changed-hook
guards. Root tooling fixes are committed as `5310fa6`; app fixture and adapter
code are committed as `4a47e99`.

The revised fixture includes native 8/16/32/64/128 px probes, a supersampled
full-mesh reference, native mesh sampling error, the actual middle-detail mesh,
negative elevations and a fine yaw sweep. The lab verifies source and asset
hashes, shader hooks, errors and resource metadata. Browser results are recorded
separately from the unmodified baseline.

The [repaired browser report](../test-results/three-ez-impostor-reference/native-map-fix/report.json)
contains 49 direction comparisons, 40 native-size comparisons and separate
near/middle/proxy profiles, without reported JavaScript, request or WebGL errors.
The raw and repaired native runs have identical coverage metrics at matching
probes, as expected from a colour-only repair. The
[repaired front view](../test-results/three-ez-impostor-reference/native-map-fix/front-impostor.png)
no longer maps tiny atlas trees across the silhouette, but remains visibly
coarse when enlarged beyond its 128 px capture resolution. The
[full mesh](../test-results/three-ez-impostor-reference/native-map-fix/front-mesh.png)
and [middle mesh](../test-results/three-ez-impostor-reference/native-map-fix/front-mid.png)
also show that canopy density differs between the actual detail levels.

The native comparison exposes a source-mesh problem too: at the front 32 px
probe, the mesh covers 38 weighted pixels against 264.25 in its 4× reference,
while the proxy covers 291. This is evidence of severe minification loss in
the current alpha-masked leaves. At 8 px, even the 4× mesh reference is only a
32 px raster and loses foliage, so it must **not** be treated as converged
ground truth. Higher-resolution convergence measurements are necessary before
using these very small-footprint ratios to judge the proxy.

### Higher-resolution reference and continuity

The [follow-up report](../test-results/three-ez-impostor-reference/native-map-fix/yaw-continuity.json)
checks the front horizon, a diagonal view at 15° elevation, and the top.
Rendering the source at 256, 512 and 1024 pixels before downsampling produces
an approximately stable reference: weighted coverage changes only 0.20–0.30%
between 512 and 1024. This is a measured convergence check for those three
views, not a claim of exact ground truth for every viewpoint.

Average native coverage divided by that finest reference:

| Framed output | Alpha-masked mesh | Repaired proxy |
| --- | ---: | ---: |
| 8 px | 0.15 | 1.00 |
| 16 px | 0.13 | 1.05 |
| 32 px | 0.13 | 1.03 |
| 64 px | 0.61 | 1.00 |
| 128 px | 0.95 | 0.99 |

The existing impostor technique preserves distant coverage substantially better
than the current alpha-masked leaf cards. At the front 8 px output, the mesh
keeps 2 weighted pixels against 17.46 in the reference and 17 in the proxy.
This reverses the misleading impression from the unconverged 4× reference at
that footprint. Native probes use single-sample render targets; the canvas
screenshots use the lab's antialiased drawing buffer.

The follow-up also compares per-pixel alpha changes through two 0.5° yaw
sweeps, resetting the previous image between segments. It supersedes the
initial report's area-only sequence, which includes a 55°→80° gap. At 64 px,
proxy changes are smaller in this fixture; at 128 px its maximum mean absolute
alpha change is 0.00983, compared with 0.00525 for the native mesh. This remains
an appearance tradeoff, not seamless transition acceptance. The native mesh
itself is an imperfect noise reference because of its alpha minification loss.

A bounded [alpha-hash diagnostic](../test-results/three-ez-impostor-reference/native-map-fix/alpha-hash-followup.json)
changes only the cloned foliage material to Three.js's existing `alphaHash`
path. At the front 32 px view it covers 300 weighted pixels against 280.02 in
its finest reference, instead of the ordinary mask's 38. The close reference
changes by only about 0.28–0.31% mean absolute alpha across the three views.
This supports testing the existing material option further. The diagnostic
does not evaluate moving-camera noise, wind, shadows or temporal antialiasing.
The [combined methods and limits](../test-results/three-ez-impostor-reference/native-map-fix/README.md)
link the original run and both follow-ups.

The [next bounded experiment](tree-foliage-minification-2026-09-28.md) addresses
leaf alpha coverage with established filtering methods and Three.js material
options. The renderer comparison has
identified a concrete material/distance problem; generating more tree shapes
alone would leave it in place.

## What this does not solve

- The pinned reconstruction supports the upper hemisphere. Walking observers
  are often below the tree centre; negative elevations require evaluation.
- Its full-sphere branch is unfinished, captured depth is not a validated
  per-pixel depth/shadow solution, and neighbouring normals use different
  capture frames.
- A single proxy roughness differs from the bark and leaf materials. No claim
  of matching leaf transmission, normal mapping or specular response is made.
- Mip coverage, transition stability and real forest costs require separate
  acceptance. The current middle mesh visibly thins the canopy.
- This static 16 m capture omits wind and height deformation. Scaling it would
  scale the leaves too; physical height classes need their own captures.
- Species binding, instanced forest integration, shadows, complete-game timing
  and target-device acceptance remain open. The published game still uses its
  existing tree shapes.

The reuse direction is therefore concrete: seeded EZ-Tree geometry is already
converted and tested with Atlas data, and an existing impostor renderer is now
measured against it. These experiments do not justify replacing working game
rendering until appearance and continuity meet the intended views.
