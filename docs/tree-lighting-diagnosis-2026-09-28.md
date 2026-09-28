# Tree foliage lighting diagnosis — 2026-09-28

Luna tested the retained author-6 GLBs in browser runtime `c7dee40` on the RTX
5090/D3D11 at 2560 × 1440. All captures use date zero, ACES exposure 1.2 and the
same camera facing the 16 m specimen. The two directional light positions are
`(0,25,30)` and `(0,25,-30)`. Each was tested with shadows on and off; follow-ups
disabled the foliage normal map and replaced its colour map with neutral grey.
There were no shader, page or request errors.

The [receipt](../test-results/tree-asset-lighting-v6/report.json) records material
and renderer settings. The source base-colour texture is tagged sRGB and its
opaque pixels average approximately `(25.8,57.3,8.1)` on the 0–255 scale. Tint
is white; roughness is 0.84; alpha cutoff is 0.5; normal strength is 0.55. The
normal map uses a linear colour space.

Visual comparisons:

- [Front, shadows on](../test-results/tree-asset-lighting-v6/center-16m-front-shadows-on.png)
  and [off](../test-results/tree-asset-lighting-v6/center-16m-front-shadows-off.png):
  disabling shadows only modestly brightens the foliage.
- [Back, shadows on](../test-results/tree-asset-lighting-v6/center-16m-back-shadows-on.png)
  and [off](../test-results/tree-asset-lighting-v6/center-16m-back-shadows-off.png):
  the crown remains dark without shadow-map occlusion.
- Removing the normal map likewise leaves dark foliage. The neutral colour
  comparison responds visibly to the same light, but removing the colour map
  also removes its alpha cutout, so that comparison cannot measure silhouette
  coverage or isolated foliage brightness.

These observations point to low texture albedo as the main cause of the dark
leaves. They do not establish whether the source numbers were intended as
linear reflectance or sRGB values. The next step is an explicit colour-space
calibration across generated pixel values, saved PNG, Blender and browser,
using known reference values. Do not increase scene exposure to hide an asset
encoding error. Leaf transmission, environment lighting and crown variation
remain separate visual work after that calibration.

The diagnostic harness is `tests/tree-asset-lighting.browser.mjs`. It leaves
the source assets and production materials unchanged; transient test material
changes are restored. This record preserves a local diagnostic, not a game
release or final visual acceptance.
