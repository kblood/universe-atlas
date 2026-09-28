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

## V7 generator change and browser results

The author-6 procedural colour constants did not declare whether they were
linear reflectance or display RGB. V7 now defines them as linear Rec.709 RGB and
encodes only those colour channels into 8-bit sRGB images. Alpha and normal-map
bytes are preserved. Fresh export, repeat, raw accessor/image checks and
embedded-PNG parity pass; see the [v7 record](tree-authoring-v7-2026-09-28.md)
and [primary validation receipt](../test-results/tree-authoring-v7/smoke/validation.json).

This is a versioned interpretation of the prior colour recipe, not proof of
its intended meaning or an artistic approval of the new values. The fixed
RTX 5090 browser comparison reads clearer and greener than v6, but back-facing
foliage remains strongly dark even when cast shadows are disabled. See the
[v6/v7 comparison](../test-results/tree-asset-lab-v7-color-a/color-comparison-v6-v7.json)
and [fixed-lighting report](../test-results/tree-asset-lighting-v7-color-a/report.json).
This controlled studio comparison does not establish realistic leaf
transmission, final forest appearance or midrange performance. V6 assets and
the currently deployed game are unchanged.
