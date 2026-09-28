# Opus 5.5 tree colour revision review

Source-only review of the initial author-7 snapshot. No execution or visual acceptance is implied. Explicit byte-buffer gates and embedded-image metadata were added after this review.

# Review: atlas-branching-author-7 colour encoding

Based only on the supplied source. I executed nothing, and none of this shows the tests passing.

## Correctness findings (actionable)

**1. The GLB-embedded images are unverified. This is the main risk.**
The PNGs written by `image.save()` match the calibrated path. The browser, however, loads images from inside the GLB, and `io_scene_gltf2` may re-encode them rather than copy the file bytes. It can do this when it builds a combined BaseColor+Alpha image for the `ROUND` alpha path, for example. If its temporary image is a float buffer tagged sRGB, your own calibration row 3 shows Blender encodes on save. That would give a second sRGB encode in the runtime asset while the standalone PNGs still look correct.

`materialContentSha256` hashes `output.glob('*.png')`, not the embedded `bufferView` bytes. So the manifest's `textureEncoding` contract currently describes files the runtime never loads.

Fix: extract each embedded image from the LOD0 and LOD1 GLB. Then either compare it byte-for-byte with the standalone PNG, or decode IDAT and check known samples. Record the embedded image hashes in the manifest.

**2. The calibration assumptions are not enforced in the generator.**
The encoding is only correct because `images.new(..., alpha=True)` defaults to a byte buffer. Add cheap gates in `texture()`:
- `assert not image.is_float` before assigning pixels.
- Assert that `colorspace_settings.name` actually took effect.
- Optionally, after `save()`, decode one known pixel and assert the expected encoded byte, e.g. foliage padding `.11,.24,.035` → approximately `(94,136,53)` plus or minus quantization.

Without these, a Blender default change or a future `float_buffer=True` edit silently double-encodes. The manifest would still claim `linear-rgb-to-srgb-byte-1`.

**3. The transfer function itself looks correct.**
- `values[:, :3]` is a view, but `np.where` evaluates fully before the assignment, so there is no aliasing bug.
- The piecewise sRGB OETF constants are correct.
- The range check runs before `np.power`, so there are no NaNs from negatives.
- Alpha is untouched, and the `.copy()` guards the shared `array('f')` and numpy sources.
- Normal maps take the `pixels if normal` branch with `Non-Color`, so they are unchanged.
- Rounding matches calibration: 0.18 → 0.4614·255 ≈ 117.7 → 118.

**4. The packed `.blend` holds encoded bytes.**
Anyone who later edits a texture in the `.blend`, or scripts `image.pixels` from it, gets display-encoded values, not the linear recipe. That is correct as-is, but add it to `limitations` so the source asset isn't treated as linear data.

## Remaining visual risks

- **Albedo scale.** Foliage peak linear green is about 0.27·0.96 + 0.05 ≈ 0.31, with red ≈ 0.12 and blue ≈ 0.04. That is on the bright, saturated side for broadleaf reflectance; typical measured values are closer to about 0.08–0.15 in green. v6 was too dark (effective linear ≈ 0.01–0.06), and v7 may overshoot toward the brief's "cartoon saturation" negative. Compare against reference albedo values under fixed exposure before accepting the look. The encoding is right; whether the recipe values are right is a separate question.
- **Bark gets much lighter.** Peak linear ≈ 0.28 now displays at about sRGB 145 instead of about 71. Bark/foliage balance and ridge contrast both change, so review them at midday, grazing sun and overcast, as the brief requires.
- **Backlit foliage.** Transmission is still absent (listed as pending). Brighter albedo fixes front lighting, but backlit and self-shadowed crown interiors may still read dark. Don't attribute that to encoding in the v7 browser comparison.
- **Future KTX2/UASTC conversion.** The conversion step must tag BaseColor as sRGB and normals as linear (e.g. the `--assign_oetf`/`--convert_oetf` equivalents). Otherwise the bug reappears one stage later. Put the encoding contract into the conversion step's inputs.
- **Mip filtering.** sRGB-tagged mips average correctly only if the runtime samples them as sRGB. Alpha-tested coverage is unchanged from v6, and the coloured padding preserved at α = 0 prevents dark fringes.
- **Unnormalized foliage normals.** Values like `(.5±…, .5±…, .985)` are passed through unchanged. That is fine for this change, but they aren't unit length, so mild shading inconsistency remains.

## Test coverage suggestions

Your planned alpha, normal, geometry and repeat comparisons against v6 are the right set. Add:
- Embedded-GLB image decode (finding 1).
- An assertion that v7 RGB equals `round(255·OETF(v6_raw/255))` within ±1 per channel, which proves exactly one encode was applied.
- A Blender-render vs. browser swatch comparison at fixed exposure, per the calibration doc's acceptance note.
