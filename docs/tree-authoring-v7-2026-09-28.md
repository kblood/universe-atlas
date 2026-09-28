# Tree authoring v7 — colour contract

Version 7 addresses the dark base colour isolated in the
[browser lighting comparison](tree-lighting-diagnosis-2026-09-28.md). The
[fixed swatch calibration](tree-color-calibration-2026-09-28.md) established
the difference between assigning raw values to a byte image and encoding
linear RGB first. This is a versioned interpretation of the procedural colour
recipe, whose previous colour space was unspecified.

## Implementation

`tools/assetctl/blender/tree_family.py` now copies and validates each procedural
RGBA colour buffer, applies the piecewise linear-to-sRGB transfer to RGB only,
and assigns the result to an explicitly non-float image. Alpha is untouched.
Normal maps bypass this conversion. The buffer type and colour-space label
are checked before assignment.

Geometry, branch and leaf placement, UVs, wind data and material parameters are
unchanged by this source edit. The manifest declares the encoding contract and
records the hashes, PNG depth and standalone-byte comparison for every image
embedded in both GLBs. Exported texture pixels must still be checked
independently; a standalone PNG alone cannot prove what the browser receives.

## Opus review assessment

[Opus 5.5 reviewed the initial v7 source](opus-5.5-tree-author-v7-review-2026-09-28.md).
The [metadata](opus-5.5-tree-author-v7-review-2026-09-28.metadata.json) identifies
the source snapshot and actual returned model. Explicit buffer gates,
embedded-image metadata and the packed-image limitation were added afterwards.

Its transfer/aliasing/alpha findings support the implementation. Its numerical
padding example is inaccurate: the independently measured 8-bit RGB is
`(93,134,53)`, not `(94,136,53)`. Its suggested general leaf-reflectance range
was unsourced and is not adopted as an acceptance threshold. The concern
about unnormalized normal-map pixels also does not establish a renderer bug:
the installed Three tangent-space path normalizes the transformed sampled
normal. Normals remain unchanged in this revision.

Brighter albedo can still be artistically wrong. The fixed-exposure RTX 5090
browser comparison now shows clearer, greener foliage than v6, but the
back-facing canopy remains strongly dark even with cast shadows disabled.
Normal-map toggling does not remove the directional contrast. This is a
controlled studio fixture, not final appearance acceptance. Thin-leaf
transmission, alpha mip coverage and crown variation remain separate work.
See the [v6/v7 color comparison](../test-results/tree-asset-lab-v7-color-a/color-comparison-v6-v7.json),
[browser profile report](../test-results/tree-asset-lab-v7-color-a/report.json),
[fixed-lighting report](../test-results/tree-asset-lighting-v7-color-a/report.json),
[front-lit view](../test-results/tree-asset-lighting-v7-color-a/center-16m-front-shadows-on.png)
and [back-lit view without shadows](../test-results/tree-asset-lighting-v7-color-a/center-16m-back-shadows-off.png).

## Validation status

The version-7 brief passes schema validation. The fresh export and repeat pass;
LOD0/LOD1 geometry accessors are unchanged from v6, as are alpha masks and
normal maps. All 31,457,280 checked base-colour RGB channel samples are within
the exact sRGB transfer range implied by their prior 8-bit values; alpha has
zero mismatches. Normal-map bytes are identical. Embedded PNG streams match
their standalone files byte-for-byte, and material/geometry outputs repeat
deterministically. This verifies the encoding transform and preservation
contract, not whether the resulting albedo is artistically right.

The [authoring run log](../test-results/tree-authoring-v7/tree-family-v7-run.log),
[primary validation](../test-results/tree-authoring-v7/smoke/validation.json),
[primary manifest](../test-results/tree-authoring-v7/smoke/authoring-manifest.json)
and [repeat manifest](../test-results/tree-authoring-v7/repeat/authoring-manifest.json)
are copied into this repository. Original candidate outputs remain under
`Assets/_assetctl/atlas-tree-v7-color-a/` and
`Assets/_assetctl/atlas-tree-smoke-1790573482187/`; earlier assets remain
preserved. The v7 browser checks pass on an RTX 5090 through D3D11 at 2560 ×
1440 with no browser errors. They cover both LODs at 3, 64 and 192 instances,
plus fixed front/back lighting comparisons. This remains a development-only
prototype; no new tree asset is installed in the planetary renderer.
