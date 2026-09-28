# Leaf diffuse transmission — 2026-09-28

## Current prototype status

`src/tree-leaf-transmission.ts` now contains an opt-in thin-leaf lighting
prototype. The module type-checks and has received a genuine
[Opus 5.5 source review](opus-leaf-transmission-review-2026-09-28.md).
Five independent CPU tests and TypeScript checking pass. A final-source
RTX 5090 browser calibration completed 70 probes with no page, console,
request or WebGL errors. Source hashes are retained with the results.
The tree-family loader now accepts an optional `leafTransmission` setting,
and the tree lab exposes off, zero, 0.35, 0.5 and one on load. It defaults to off
and is not connected to the planetary game. It does not parse or implement the complete
`KHR_materials_diffuse_transmission` extension.

The helper patches the pinned Three physical-light shader for a two-sided leaf
material. Its bounded model moves a factor of the base-colour diffuse response
to the opposite hemisphere, multiplied by a linear RGB tint. It covers direct
lights, rectangle-area lights, ambient/probe/hemisphere contributions, and the
cube-UV diffuse environment term present in this shader. The host's specular,
Fresnel, clearcoat, and sheen expressions remain unchanged. This is not a claim
of a fully energy-conserving BRDF or extension conformance; indirect-light
approximations and the supported renderer configuration still need validation.

The factor defaults to zero. At zero the shader runs the original diffuse
expressions and avoids opposite-hemisphere environment sampling. Nonzero values
are shared uniforms, so changing the setting does not create per-tree or
per-instance materials. The helper composes with the material's existing
`onBeforeCompile` and program-cache key; it must be installed after the tree
wind/deformation hook. Shader anchors must match exactly once or installation
fails closed. It does not change the custom depth or distance materials, alpha
mask, shadow silhouette, or wind deformation.

Transmission now uses `nonPerturbedNormal`: the view-facing surface normal
after vertex/wind deformation, before normal-map perturbation. Reflection keeps
its existing normal mapping. This avoids classifying light as passing through
a planar leaf just because its normal-map bumps tilt past a grazing light.
The opposite normal is assigned before the direct-light loop and is also used
for transmitted hemisphere/probe/environment and rectangle-light contributions.
The normal/light chunk order is checked. This is an intentional change from
the initial source sent to Opus, which used the perturbed shading normal.

The supported-material guard requires a two-sided dielectric and rejects
metalness maps, light maps, AO maps, and glass-style physical transmission.
An assertion detects later replacement of the composed shader or cache-key
hook. A guard failure during compilation throws; it does not silently fall back.
The calibration fixture is `leaf-transmission-lab.html`: float linear output,
direct/area/ambient/probe/hemisphere/environment light, both face orientations,
normal maps, black-base specular isolation, and casting/non-casting leaves with
optional blockers. The actual-tree comparison remains separate from this
calibration; these results do not establish a realistic forest or a frame budget.

## Calibrated results

See the [final 70-probe report](../test-results/tree-leaf-transmission/browser-final/report.json)
and [browser harness](../test-results/tree-leaf-transmission/browser-check.mjs).
The fixture reads a 256 × 256 float target in linear light without tone mapping.
It ran on ANGLE/RTX 5090 Direct3D11. The original exact-zero assertion was
replaced with a declared maximum absolute tolerance of `1e-7` after measuring
compiler rounding across the separately compiled shaders.

| Check | Observed result |
| --- | --- |
| Original shader versus transmission factor zero, eight light types | Maximum absolute difference `7.45e-9`; six paths exactly equal, hemisphere and light-probe paths differ slightly |
| Directional front/back and face flip | Factor one transmits opposite-side light and gives zero same-side diffuse in the neutral fixture |
| White tint under symmetric ambient | Factor one equals the original output exactly |
| Black base colour, nonzero specular, direct and environment light | Transmission changes no pixels |
| Normal map on/off at full transmission | Tested transmitted-light pixels are identical, confirming the unperturbed-normal choice |
| Directional, point and spot blockers | Shadowed central samples become zero; unblocked samples remain lit |
| Casting versus non-casting flat leaf, zero normal bias | Pixel-identical in this fixture |
| Casting flat leaf with authored-normal bias `0.035` | Reproduces the backlit self-shadow failure; maximum absolute difference `0.0872` from the unbiased result |

Nonzero area, hemisphere, probe and environment paths were also exercised as
changed-response checks; they are not extension-conformance comparisons.
The fixture includes the source tree's roughness `0.84`, specular factor `0.44`
and normal scale `0.55` in an additional sample.

The tree lab now uses normal bias zero and depth bias `-0.0001` consistently
for original and transmission materials. That is an experimental shadow
setting for this metres-based lab, not a planetary shadow-bias policy. The
earlier MASK/HASH timing/date run used its saved original shadow settings;
its source snapshot and results remain unchanged.

## Actual tree integration check

The [family-F report](../test-results/tree-leaf-transmission/actual-tree/family-f-corrected/report.json)
uses the same hash-recorded EZ-Tree/Atlas GLBs, three physical-size specimens,
and a 2560 × 1440 RTX 5090 canvas. Both LODs rendered with transmission off and
`0.35`, retaining wind and custom shadow materials, with no recorded browser,
request or WebGL errors. The sun stays fixed while the camera changes between
front-lit and back-lit views.

At LOD0, installing the adapter at factor zero reproduced every RGBA byte of
the original front and back frames (`maxAbs = 0`). At factor `0.35`, the
rendered frame's FNV-1a 32-bit hash changed at 1.75 seconds and returned to the
date-zero hash at seven seconds. This is a frame-hash replay check; the earlier
temporal run separately measured pixel differences directly.

Inspect the page captures, including their visible lab controls:
[front off](../test-results/tree-leaf-transmission/actual-tree/family-f-corrected/lod0-front-off.png),
[front 0.35](../test-results/tree-leaf-transmission/actual-tree/family-f-corrected/lod0-front-on.png),
[back off](../test-results/tree-leaf-transmission/actual-tree/family-f-corrected/lod0-back-off.png),
[back 0.35](../test-results/tree-leaf-transmission/actual-tree/family-f-corrected/lod0-back-on.png).
The pixel comparisons read the WebGL buffer, excluding the controls.

The canopy remains dark in this backlit rig; transmitting some light does not
replace a complete outdoor lighting setup. These images are integration
evidence, not visual approval. Tree lighting cost under environment maps,
realistic LOD handoff, species variation and planetary adoption remain open.

## Earlier design rationale

This prototype follows the narrow proposal below: address dark back-lit leaves
in the foliage lighting path while keeping ordinary PBR, base colour, alpha,
normal maps, roughness, wind, shadows, and non-leaf materials intact. The glTF
extension describes thin-surface diffuse transmission, not refracted glass.
Three's `SubsurfaceScatteringShader` is a separate GDC 2011 approximate
Phong/additive effect, not the same PBR contract.

Before adoption, compare zero and increasing transmission values on a neutral
leaf fixture and a tree under fixed exposure, environment, sun, and camera.
Check front-lit, back-lit, grazing and shadowed leaves; direct-light shadows;
both face orientations; the +Y tangent-space normal convention; and wind poses.
Verify specular/Fresnel is unchanged and non-leaf materials match the zero
baseline. Browser and target-desktop shader-cost checks remain outstanding;
Quest extension is a later decision. Do not upgrade Three solely in
expectation of built-in support.

## Sources

- Khronos [`KHR_materials_diffuse_transmission`](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_diffuse_transmission/README.md) — thin-surface model and extension status.
- Three.js [`MeshPhysicalMaterial`](https://threejs.org/docs/pages/MeshPhysicalMaterial.html) — documented physical material features.
- Local [`tree-leaf-transmission.ts`](../src/tree-leaf-transmission.ts) — current experimental shader patch and material guards.
- Installed Three shader chunks `lights_physical_pars_fragment`, `lights_fragment_begin`, and `lights_fragment_maps` at pinned `super-three@0.181.0`; exact review inputs are retained with the Opus record.
- [`tree-asset.ts`](../src/tree-asset.ts) — optional foliage-only integration after the shared family wind/deformation hook.
- Three.js [`SubsurfaceScatteringShader`](https://github.com/mrdoob/three.js/blob/r181/examples/jsm/shaders/SubsurfaceScatteringShader.js) — separate approximate scattering example.
