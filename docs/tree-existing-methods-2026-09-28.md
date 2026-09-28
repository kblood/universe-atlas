# Existing tree-generation and impostor methods

Research snapshot: 2026-09-28. This is a read-only source/documentation review;
none of the candidates was installed, executed, rendered, or benchmarked here.
It compares the specified implementations with Atlas's constraints: seeded
repeatability, 10–22 m skeleton heights with fixed physical leaf dimensions,
exported pivot/wind attributes, measured LOD budgets, and octahedral normal/depth
capture quality.

This is a source-only research snapshot; its statement below that no candidate
was run refers to that review. The subsequent pinned EZ-Tree geometry
comparison is documented in the [follow-up record](tree-ez-reference-2026-09-28.md).
Its operation and fixture received a separate [Opus source review](opus-5.5-tree-reference-review-2026-09-28.md); that review did not render or accept the tree.

## Findings

| Candidate | Reusable work | Atlas gaps and maturity | Best next comparison |
| --- | --- | --- | --- |
| [EZ-Tree](https://github.com/dgreenheck/ez-tree/tree/dcf309bd86bd521083d9c70f01f2de45fdc7c457) | Three.js-native procedural generator; exposes seeded options, separate branch/leaf geometries, presets, custom geometry detail, and built-in LOD generation. Its LODs derive from one generated skeleton, which is a useful starting point for an alternative tree source. MIT license. | LOD detail can stride leaves and enlarge survivors (`leafStride`/`leafScale`). Compare the configurable settings against Atlas canopy coverage and apparent leaf size; this is an adaptation to measure, not a reason to reject the generator. The inspected geometry builder exports standard position/normal/UV/index data; Atlas-specific pivot, wind, branch-level and canonical identity attributes are not part of the documented contract. Its built-in shader wind is elapsed-time based, not tied to Atlas's BigInt date. No Atlas height-class, exact-triangle-budget, glTF attribute or impostor validation was found in the inspected docs. | Strongest candidate for a bounded geometry-source comparison: produce the same preset/seed at 10, 16 and 22 m, inspect exported mesh/material shape, and measure what work is needed to retain physical leaves and attach Atlas attributes. Reuse the generator only if that conversion is smaller and visually better than the current authoring path. |
| [Sapling Tree Gen](https://extensions.blender.org/add-ons/sapling-tree-gen/) | Established parametric Blender generator with species presets, explicit seed, branch and leaf controls, curve output, optional branch mesh conversion, leaf mesh/UV generation and optional armature animation. It is a useful independent authoring control for branch/canopy shape. | Current extension is offered “as is” with community maintenance and limited support. The current manifest says Blender 4.4 minimum and GPL-3.0-or-later; the inspected Python source header says GPL-2.0-or-later, different license-version declarations to retain in the provenance record. No built-in LOD or Atlas-specific attributes, physical-leaf-height rules, fixed triangle budgets, or capture pipeline were found in the reviewed files. Recent extension-page reviews report Blender 5.0/5.1 problems; those are user reports, not independently reproduced failures. | Use a pinned Sapling preset and seed as a visual/control tree only after checking the installed Blender version and recording the source license. Compare silhouettes and canopy distribution; do not plan direct runtime reuse without a separate export/attribute/LOD pass. |
| [Three.ez Octahedral Impostor](https://github.com/agargaro/octahedral-impostor/tree/ca0046a49fef8f8c75745a6e49e52752ef3cf8e3) | Directly relevant capture structure: it renders a target through a full-sphere or hemi-octahedral direction grid into an albedo atlas and a normal/depth attachment, then samples neighboring views in a Three.js material. MIT license. The direction mapping, atlas tiling, and reconstruction path are the most reusable concepts. | The repository describes itself as “wip.” Its material source has TODOs for top-view normals, using the nonstandard normal-map path, and avoiding unnecessary parallax work; parallax controls are commented out. The inspected capture helper defaults to 16×16 views in a 2048 atlas and stores the normal/depth target as packed unsigned-byte data. That is a 256-view 2D atlas design, unlike Atlas's 9×9 independently mipmapped texture arrays and linear normal/depth channels. No verified Atlas GLB material/deformation, height-class, shadow-pass, foliage coverage, or GPU cost results were found. | Benchmark its published reconstruction against the Atlas capture at the same asset, camera directions and pixel footprint before extending custom reconstruction. Treat it as a prototype/reference, not a production-ready drop-in. |

## Recommendation

There is no need to invent a tree generator before testing an existing one.
For geometry, EZ-Tree is the cleanest next candidate to compare because it is
Three.js-native, MIT-licensed, and explicitly exposes a seeded generator,
geometry-detail API and LOD builder. Keep the comparison narrow: check the
resulting source shape, export effort, seed repeatability, exact leaf size at
10/16/22 m, and whether its LOD settings preserve canopy appearance within the
geometry budget. Sapling provides a useful independent shape baseline. Its
Blender/export adapter adds another conversion step, and the compatibility
reports need reproduction before they influence a reuse decision.

For distant rendering, Three.ez is close enough to warrant a matched-fixture
comparison, but its own WIP status and normal/parallax TODOs make its current
implementation evidence a starting point. Atlas should keep its current
capture work experimental until same-asset axis/fold/intermediate-angle
coverage, depth/normal behavior, mip isolation, lighting, and resource costs
have been compared against it. No candidate was benchmarked in this review,
so these are test priorities rather than measured winners.

## Sources inspected

Exact repository revisions were read where the host exposed them:

- EZ-Tree `dcf309bd86bd521083d9c70f01f2de45fdc7c457`: [README](https://github.com/dgreenheck/ez-tree/blob/dcf309bd86bd521083d9c70f01f2de45fdc7c457/README.md), [`src/lib/tree.js`](https://github.com/dgreenheck/ez-tree/blob/dcf309bd86bd521083d9c70f01f2de45fdc7c457/src/lib/tree.js), [`src/lib/branch.js`](https://github.com/dgreenheck/ez-tree/blob/dcf309bd86bd521083d9c70f01f2de45fdc7c457/src/lib/branch.js), [`src/lib/rng.js`](https://github.com/dgreenheck/ez-tree/blob/dcf309bd86bd521083d9c70f01f2de45fdc7c457/src/lib/rng.js), [`package.json`](https://github.com/dgreenheck/ez-tree/blob/dcf309bd86bd521083d9c70f01f2de45fdc7c457/package.json). The README documents a `seed`, `generateLODs()`, shared skeleton, leaf stride/scale controls, and `createGeometry(detail)`; source initializes an RNG from the configured seed.
- Sapling Tree Gen `df5f512fde5ab75d87288177f6cc23ec9b2b7f27` (extension v0.3.7): [official extension entry](https://extensions.blender.org/add-ons/sapling-tree-gen/), [official source repository](https://projects.blender.org/extensions/add_curve_sapling), [`source/__init__.py`](https://projects.blender.org/extensions/add_curve_sapling/src/branch/main/source/__init__.py), [`source/utils.py`](https://projects.blender.org/extensions/add_curve_sapling/src/branch/main/source/utils.py), [`source/blender_manifest.toml`](https://projects.blender.org/extensions/add_curve_sapling/src/branch/main/source/blender_manifest.toml), and [Blender's Sapling manual](https://docs.blender.org/manual/en/2.90/addons/add_curve/sapling.html). The manifest reports v0.3.7 and Blender 4.4 minimum; the source includes a seed field, curve/tree generation, leaf mesh/UV construction, optional branch mesh and armature paths.
- Three.ez Octahedral Impostor `ca0046a49fef8f8c75745a6e49e52752ef3cf8e3`: [README](https://github.com/agargaro/octahedral-impostor/blob/ca0046a49fef8f8c75745a6e49e52752ef3cf8e3/README.md), [`octahedralImpostorMaterial.ts`](https://github.com/agargaro/octahedral-impostor/blob/ca0046a49fef8f8c75745a6e49e52752ef3cf8e3/src/core/octahedralImpostorMaterial.ts), [`createTextureAtlas.ts`](https://github.com/agargaro/octahedral-impostor/blob/ca0046a49fef8f8c75745a6e49e52752ef3cf8e3/src/utils/createTextureAtlas.ts), and [`octahedronUtils.ts`](https://github.com/agargaro/octahedral-impostor/blob/ca0046a49fef8f8c75745a6e49e52752ef3cf8e3/src/utils/octahedronUtils.ts). The project README identifies it as WIP; source contains the stated material TODOs and two-attachment atlas capture.

