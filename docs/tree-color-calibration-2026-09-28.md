# Tree colour calibration — 2026-09-28

The [browser lighting diagnosis](tree-lighting-diagnosis-2026-09-28.md) found
dark foliage even with shadows and normal mapping disabled. A new constrained
assetctl `blender color-calibration` operation tests fixed, explicitly linear
swatches before changing the tree generator. It saves three image-buffer
variants, packed Blender source, assigned/reloaded pixel values and PNG hashes.
Earlier candidates are preserved; the diagnostic requires a fresh output path.

## Measured Blender 5.1.1 result

The independent test decodes PNG IDAT samples directly, including 8/16-bit
unfiltering. Sharp's converted output and Blender's reloaded pixel values are
recorded separately; neither is substituted for the actual stored samples.

| Input path for linear grey 0.18 | PNG depth | Stored RGB sample | Meaning |
| --- | --- | --- | --- |
| Byte image, raw assignment | 8 | 46 / 255 | Raw 0.18 was quantized into an sRGB-tagged image |
| Byte image, explicit RGB transfer | 8 | 118 / 255 | Linear 0.18 was encoded before byte storage |
| Float image, raw assignment | 16 | 30235 / 65535 | Blender encoded the float buffer during PNG output |

All three PNGs contain sRGB/gamma metadata. The transparent coloured swatch
preserves nonzero RGB: the explicitly encoded byte image stores `(93,134,53,0)`;
the float output stores `(23957,34544,13499,0)`. Alpha remains linear. A float
image's reloaded `pixels` values can be linear even when the PNG stores encoded
samples, so inspecting that API array alone is insufficient to diagnose PNG
encoding.

[Calibration manifest](../test-results/tree-color-calibration-v1/validated/color-calibration.json)
and [independent decoded-sample receipt](../test-results/tree-color-calibration-v1/validated/calibration-test-summary.json)
preserve these observations. Two fresh runs have identical PNG bytes. The test
also rejects overwriting the output, writing outside approved roots, and
supplying an input file to this fixed diagnostic.

The final Luna smoke passes 1/1. Two earlier harness setup errors (a stale hash
helper and a missing filesystem import) are preserved in the
[failure log](../test-results/tree-color-calibration-v1/validated/initial-test-harness-failures.log);
they were corrected before the passing run and were not generator failures.

## Next generator change

The author-6 procedural colour constants did not declare whether they were
linear reflectance or display RGB. Treating them as linear is an explicit
versioned authoring decision, not proof that the old authors intended that
meaning. The next candidate should declare linear RGB for bark and foliage,
encode only those RGB channels into 8-bit sRGB images, and preserve alpha and
normal-map data unchanged. Explicit byte encoding keeps the runtime texture
format bounded and preserves coloured transparent padding.

Require unchanged geometry and alpha/normal data, deterministic output,
Blender/GLB appearance agreement and new browser lighting comparisons before
acceptance. Scene exposure must stay fixed during comparison. This diagnostic
does not establish correct artistic albedo, realistic leaf transmission or
final forest appearance. Author-6 assets and the currently deployed game are
unchanged by the diagnostic.
