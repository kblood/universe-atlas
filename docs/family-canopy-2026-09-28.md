# Matching detailed trees and the distant canopy

Status: local implementation; visual acceptance and deployment pending.

The normal Oak/Pine package now supplies the same family information to nearby
mesh instances and the complete distant census. This follows the genuine Opus
[near/far review](opus-near-far-family-assessment-2026-09-28.md); it does not introduce another tree generator or species model.

## Loaded family data

Each loaded LOD produces its own four-band crown profile from its actual leaf
attachment pivots. The distant draw uses LOD1. Bands retain vertical extent,
horizontal visual radius and a separate metric leaf-card margin. Empty bands
do not draw. A separate conservative sphere includes both LOD vertex sets,
supported 10–22 m skeleton heights, leaf wind and the proposed band envelopes.
The visual percentile radius is never used alone as a culling bound.

Base-color images are sampled once at family load. Alpha-weighted sRGB samples
are converted to linear RGB and multiplied by the imported material factor.
This provides separate bark and foliage colors. Atlas alpha occupancy remains
texture metadata; it is not multiplied into the entire crown's opacity.

Family presentation is enabled for a validated offline foliage sidecar. Basic
trees and experimental families without the sidecar keep the legacy distant
representation. The existing normal Trees control remains opt-in.

## Shared dated selection

`PlanetForest` supplies its existing dated catalogue to `PlanetCanopy`.
Canonical cell ID, tree height, position, yaw and habitat membership do not
change. The shared eligibility helper selects only a loaded family supporting
the canonical height. Per-instance bark and foliage brightness use the same
recipe binding as the detailed instances.

Family and both brightness values occupy the previously unused third float
in the far parameter buffer. The packed integer is exact in Float32; brightness
quantization error is at most 0.2/255. Code zero selects the legacy shape and
color. There is no added per-tree GPU attribute.

## Shader and handoff

The existing one-quad-per-tree analytic renderer draws broadleaf ellipsoids or
stacked conifer cones from the loaded middle LOD profile. Skeleton coordinates
scale with canonical height; leaf-card margins remain metres. Derived colors
replace the unrelated legacy green and roll tint for supported families.
The existing actual-hit depth, normals, ownership and local atmosphere remain
in use. Family quads and close-fallback detection use conservative bounds.

A catalogue change or adopted asset-library revision starts a bounded parameter
retag: at most 2,048 retained slots and 2 ms per prepare call. Nearby handoffs
refresh their own tags immediately before pairing. Pairing requires the current
presentation version, matching packed appearance, canonical tree height and
existing ground/root agreement. Retagging preserves transforms and ownership.
The CPU version array uses four bytes per allocated far slot (917,504 bytes at
229,376 slots). Diagnostics report pending retags, processed slots and slice time.

## Evidence and remaining limits

The focused integration run currently passes 67 checks across the far renderer,
canopy lifecycle, detailed family attachment and retained forest work list.
It covers bounded parameter writes, untouched roots/rotations, dated retagging,
height and appearance mismatch rejection, and shared catalogue/library choice.
Shader-source composition checks are not proof of browser GPU compilation.
The metadata and runtime changes also pass the TypeScript check. Detailed-tree
diagnostics include separate handoff samples so browser checks can compare the
near canonical ID against its far slot's height, appearance code and ownership.

This is an analytic approximation. The trunk still uses the legacy trunk shape
with the family's bark color. Solid band envelopes can overfill a sparse Pine;
profile shape and linear albedo alone cannot reproduce leaf-card holes, normal
maps, transmission or shadows. No realism acceptance or performance improvement
is claimed from these CPU checks. Next: actual-game close/middle/far captures,
per-ID handoff checks, GPU compile/error inspection, measured timing and Opus
review of the resulting scene. Structural species variants, species dimensions,
ground cover, terrain and fauna remain part of the full implementation plan.

## First actual-family browser check

The isolated browser load exposed an interleaved-attribute bug in the profile
helper: GLTFLoader's attribute arrays need their individual stride and offset.
The helper now uses attribute accessors, with an interleaved/separate-array
equivalence regression. A subsequent GPU compile exposed an integer plane
constant in the new cone shader; the generator now emits explicit GLSL floats.
Both failures are preserved under `test-results/family-canopy/`.

After these fixes, the actual packaged Oak and Pine loaded and their analytic
proxies rendered on RTX 5090 / ANGLE D3D11 with GL error zero and no browser
errors. Nine focused regression checks and TypeScript pass. This is an isolated
compile/render check, not the normal-control game acceptance. The close-up proxy
image visibly contains smooth stacked broadleaf bands and solid conifer cones;
it does not establish realistic foliage or a seamless distance transition.
