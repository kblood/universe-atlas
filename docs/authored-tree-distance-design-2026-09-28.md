# Authored trees at a distance

Status: design under review; the game still renders its existing tree shapes.
This is the next implementation increment after the v7 colour correction.

## Why a separate representation

The authored pair has 10,712 and 4,820 triangles per tree. Rendering either
through the existing four-kilometre forest would exceed a useful geometry
budget. The current analytic proxy exactly represents the old faceted trees;
it cannot represent the new branches and leaf gaps. Reusing it would introduce
a conspicuous silhouette change during approach.

Epic's [Impostor Baker documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/impostor-baker-plugin-in-unreal-engine)
describes captures from multiple directions, blending three neighbouring views,
separate material/depth channels and optional parallax correction. It distinguishes
full-sphere and upper-hemisphere captures. Those techniques inform this proposal;
the following budgets and implementation choices are Atlas experiments.

## First experiment

1. Capture the exact authored GLB at rest through a constrained assetctl
   operation. Input must be an approved asset path; outputs go to a fresh
   review directory with source hash, capture version, settings and image hashes.
   Do not accept arbitrary capture scripts or overwrite inputs.
2. Use a full-sphere octahedral direction grid. Free flight, steep terrain and
   cameras below crown centres can require lower views. Start with a 9 by 9
   grid, including duplicate seam directions, and 128-pixel view interiors.
   Measure whether that density suffices before increasing it.
3. Capture unlit base colour plus alpha coverage, object-space normal, depth
   and bark/leaf classification. Data textures stay linear; base colour is
   explicitly sRGB. A sun-lit screenshot is not a reusable material. The
   capture must honour the source alpha cutoff and tangent-space normal map.
4. Keep camera axes, object bounds and root offset in the manifest. Use a
   common enclosing sphere for every view, including wind displacement bounds.
   Store depth in a declared physical interval. Background depth is invalid,
   never a surface at the interval endpoint.
5. Render one instanced camera-facing plane per tree. Choose the enclosing
   triangle of capture directions and blend its three views. Reproject from
   stored depth; reject off-tile/background samples. Reconstruct normals in
   the instance orientation and shade under the same sun/sky as close meshes.
   Derive fragment depth from the reconstructed surface, including the current
   logarithmic-depth contract. Shadow views require their own light direction.
6. Prevent atlas bleeding with per-view padding and explicit mip generation,
   or use WebGL2 texture arrays. Ordinary whole-atlas mipmaps mix unrelated
   views. Test alpha coverage at each supported mip; do not choose a cutoff
   simply to hide a failed silhouette comparison.

## Scale, wind and handoff

Near-tree leaves retain physical size while skeleton height changes from 10 to
22 metres. Uniformly scaling a captured 16-metre tree does not reproduce that
rule. First measure the discrepancy at each height and projected size. If it
exceeds the transition error budget, bake a bounded set of height classes or
delay the switch; do not silently rescale the canonical tree or its leaves.

Wind can settle towards the captured rest pose only while its projected
displacement falls below an explicit screen-space error. Close meshes and
impostors must use the same transition policy. The initial static lab is not
evidence of an acceptable animated game transition.

Use projected size, hysteresis and residency readiness for selection. Keep the
canonical individual, height, yaw, species, variant and tint unchanged.
Complementary coverage must give each pixel one representation during handoff;
avoid drawing both at full opacity. Existing census ownership and worker
residency remain responsible for which trees exist.

## Resource and acceptance gates

Start with one family and one structural variant. Account for mipmapped colour,
normal/depth/classification storage explicitly, including temporary capture
buffers. Do not multiply the present 53.3 MiB source textures by every instance
or variant. Colour tints must affect both distance representations consistently.

Before game integration, compare mesh and impostor at captured and intermediate
directions, octahedron folds, pole/seam crossings, ground/orbit views, tree
heights 10/16/22 m and several yaws. Report silhouette coverage, bounds, root
offset, depth error and light response at the proposed transition sizes. Measure
GPU cost and overdraw at 3/192 trees and at full census density. Include date
replay, load failure, cache eviction and shadow/depth passes. A two-triangle
primitive alone establishes neither speed nor acceptable visual continuity.

The existing asset brief's root/dimension constraint remains in force. Pixel
silhouette error needs a separately reported projected-size tolerance; it must
not be confused with a change to world-space root contact or identity.

## Opus review and implementation decisions

[Opus 5.5 reviewed this design](opus-5.5-tree-distance-review-2026-09-28.md);
[input hashes and returned model](opus-5.5-tree-distance-review-2026-09-28.metadata.json)
identify its source-only scope. Adopt the following for the first baker:

- Use the installed Three renderer through a named assetctl browser operation,
  preserving its alpha, normal-map and physical leaf-size behaviour. Require
  float render-target support, record adapter information, and compare rendered
  results with tolerances rather than promise identical bytes across GPUs.
- Capture at four times the destination width/height, then reduce coverage and
  material channels. Test a 9×9/128-pixel grid against 17×17/64-pixel views.
  Preserve zero coverage for absent views during blending; do not renormalize
  silhouette coverage over only valid views.
- Prototype a linear RGBA16F normal/depth/classification target, alongside
  sRGB colour/coverage. A 9×9×128² pair with full mips costs approximately
  21.3 MiB per height class before source maps and intermediate buffers.
  Three height classes and eight variants would exceed 500 MiB for these
  captures alone. Begin with one class/variant and enforce a cache budget
  before expanding either axis.
- Keep mesh shadow casters within a bounded local region for the first
  experiment. The distant shadow policy is still an acceptance decision.
  Use the same discard pattern on both sides of an ownership transition;
  mixed alpha-to-coverage and discard cannot guarantee complementary coverage.

Several review estimates are hypotheses, not accepted facts. Leaf coverage
does not exactly follow inverse squared height because projected overlap,
orientation and occlusion matter; the suggested alpha exponent cannot replace
height-class comparisons. Octahedral grid spacing is not uniformly 22.5 degrees.
Blending foreground/background depth can create a surface in empty space, so
depth-aware rejection and comparison against mesh depth remain necessary.
Neither the suggested switch distance nor a triangle count proves performance.

The first code increment, `src/tree-impostor-views.ts`, implements full-sphere
encoding/decoding, face-aligned triangle selection and explicit capture bases.
It deliberately stores a basis per view, including deterministic pole fallback;
bases are never interpolated. This is capture mathematics, not a rendered or
integrated distant-tree implementation.
