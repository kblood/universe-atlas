# Tree authoring v6 — 2026-09-28

This increment addresses the bark, branch-support and leaf-deformation problems
found in [v5](tree-authoring-v5-2026-09-28.md). It remains an authored proposal;
the game still uses its existing forest geometry. The full desktop realism
goal includes runtime integration, LOD2, species variants, terrain and fauna.

## Representation and physical scale

The same seeded branch graph supplies both detail levels. Golden-angle branch
placement replaces the single-turn spiral; upper branches have shorter reach,
bringing foliage into the previously hollow center. The 84 secondary branches
are allocated before construction, avoiding accidental exhaustion at the top.
The reference envelope is 16 m tall, with a root-contact pivot at zero.

| Detail | Wood | Foliage |
| --- | --- | --- |
| LOD0 | Full branch graph; buried base caps and tiny tip caps removed | Complete physical card set |
| LOD1 | Same trunk/primary limbs; straight four-sided secondary tubes; up to 32 thickest twigs within the 5,000-triangle ceiling | Identical card positions, UVs and attributes |

Retained twig selection is deterministic. The manifest reports the greatest
omitted twig diameter and its one-pixel projected distance at 1440 vertical
pixels and 60° vertical field of view. This is a useful lower bound on switch
distance, not visual transition acceptance. It does not establish a GPU gain:
both levels still rasterize the same foliage cards.

Each 1 × 1.2 m card exports a center and its actual shoot attachment pivot in
runtime Y-up coordinates. Every corner shares one pivot-height wind weight.
These support rigid-card deformation; runtime wind and coordinated branch motion
still need implementation. `_BRANCH_LEVEL` identifies trunk, primary, secondary,
twig and foliage vertices for independent checks and future deformation.

## Bark and review lighting

Bark UVs wrap by an integral number of 1/8-m texture periods per tube. That span
stays constant along the taper; vertical coordinates follow physical branch arc
length, with a seeded phase per tube. This closes the seam without pretending
texel density can remain exact around every narrowing ring. Both 1024² bark
maps repeat an exact 128-pixel tile, and normal relief derives from the same
periodic field as colour. Larger-scale bark variation remains future work.

The named review tool now has a calibrated option: fixed AgX settings and an
18% linear diffuse grey cube beside the asset. The cube itself appears bright
under the current studio lights; bright foliage in these sheets alone is not
evidence that its base colour should be darkened. Game lighting still needs a
material comparison. Review geometry is never saved into the source tree.

## Review and verification

The genuine [Opus 5.5 review](opus-5.5-tree-author-v6-review-2026-09-28.md)
and [model/source metadata](opus-5.5-tree-author-v6-review-2026-09-28.metadata.json)
cover the initial v6 implementation. Subsequent changes enforce single-threaded
authoring, add per-tube bark phase, remove hidden caps, retain a square secondary
cross section, spend available LOD1 budget on thick twigs, and record the
projected-size limit. All six exported bound components are now checked between
LODs. Bounds agreement is still weaker than silhouette/transition agreement.

The review's claim that tiny caps were degenerate was not supported by the
validator: the earlier candidate had zero degenerate indexed triangles. Their
removal reduces geometry and unnecessary tangent work. The reported possible
apex overdraw and repetitive bark require scene measurements and art review;
they are not proven performance defects from source inspection.

Source manifests now use paths relative to their own directory and preserve the
brief snapshot. They record Blender build/exporter/NumPy versions, source hashes,
per-level geometry and material hashes, branch counts, triangle splits and measured
audit fields. Failed outputs have the same manifest schema version as successful
ones. The triangulation modifier remains intentionally editable in the `.blend`.

### Final candidate checks

Tool checkpoint `4e17e72` produces **10,712 triangles at LOD0** and **4,820 at
LOD1**, with 1,356 physical foliage cards. Both bounds are identical; measured
height is 16.000029 m. LOD1 retains 32 twigs and omits 646. Its largest omitted
diameter is 0.016169 m, reaching one projected pixel at about 20.16 m under the
recorded 1440p/60° reference. This does not authorize a 20 m game switch.

Luna's two smoke tests and two raw GLB audits pass. Checks cover 127 bark rings,
110 longitudinal intervals, the exact 128-pixel bark repeat, card dimensions,
shared pivots/weights, rigid rotation, 971 identical trunk/primary vertex
records and 5,497 identical foliage records across LODs. All 3,398,612 transparent
foliage pixels retain green RGB padding; alpha-preserving mipmaps remain untested.
Both GLBs have zero validator warnings/errors, degenerate triangles or nonfinite
accessors. The [technical evidence](../test-results/tree-author-v6/atlas-tree-smoke-1790570381707/test-evidence.json),
[validation](../test-results/tree-author-v6/atlas-tree-smoke-1790570381707/validation.json),
[manifest](../test-results/tree-author-v6/atlas-tree-smoke-1790570381707/authoring-manifest.json)
and [independent repeat audit](../test-results/tree-author-v6/repeat-audit.json)
retain the results. Both GLBs and four textures match byte-for-byte in the pair.

The [source sheet](../test-results/tree-author-v6/atlas-tree-smoke-1790570381707-v6final-blend-calibrated/render-sheet.png),
[LOD0 sheet](../test-results/tree-author-v6/atlas-tree-smoke-1790570381707-v6final-lod0-calibrated/render-sheet.png)
and [LOD1 sheet](../test-results/tree-author-v6/atlas-tree-smoke-1790570381707-v6final-lod1-calibrated/render-sheet.png)
show the fuller center and retained supports. Their
[render receipt](../test-results/tree-author-v6/atlas-tree-smoke-1790570381707/v6final-calibrated-render-review-receipt.json)
compares raw GLB attributes with imported Blender values for all four custom
attributes, and records source/export image agreement. Six-view foreground IoU
between LODs ranges from about 0.9928 to 0.9990 at 512 px. Static sheets do not
establish an in-game LOD transition or wind/lighting acceptance.

## Remaining integration work

The next implementation stage is a browser prototype with shared resources, physical instance scaling, LOD2 and measured alpha overdraw under the game lighting.

LOD2 and its transition, shared textures across structural variants, compression,
resource budgets, wind/depth/shadow agreement, species/canonical-cell binding and
full-game profiling remain open. The current license declaration is `NOASSERTION`;
the packaging filenames in the brief are targets, not claims that a package has
been produced. No authored tree candidate has replaced the game's trees yet.

See the [desktop realism plan](desktop-realism-implementation-plan-2026-09-27.md).
