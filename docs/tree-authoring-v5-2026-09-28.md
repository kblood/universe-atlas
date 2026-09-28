# Tree authoring v5 — 2026-09-28

**Status: technical checks pass; visual/runtime acceptance remains open.** This authoring candidate is not
packaged, species-bound or installed in the game. The published game continues
to use its existing forest geometry.

## Changes

The original seeded branch graph now uses sixteen primary limbs with bounded,
unequal angular gaps. A maximum of 96 secondary branches bounds geometry cost.
The sixteen foliage atlas patterns have five to seven staggered leaf pairs.
Individual leaves retain their physical dimensions; crown density is not
increased by enlarging them.

The emitter builds two representations from the same calibrated skeleton:

| Representation | Geometry | Triangle ceiling |
| --- | --- | --- |
| LOD0 | Full wood graph and all foliage | 18,000 |
| LOD1 | Exact trunk, primary limbs and all foliage; secondary/twig tubes omitted | 5,000 |

The maximum construction budget for LOD1 is 4,748 triangles. Both levels use
the same 16 m calibration and the same physical 1 × 1.2 m foliage cards. LOD1
does not receive a separate height fit. Retaining all leaves preserves their
positions, but removing fine wood can still cause a visible transition. Bounds
agreement alone does not establish a matching visible silhouette.

Each foliage vertex exports `_LEAF_CENTER` in runtime Y-up coordinates. Every
corner of a card has the same physical center. This gives the eventual runtime
deformation a way to change crown proportions while preserving leaf dimensions.
It is an exported contract; no runtime deformation is connected yet.

Bark uses 1024 × 1024 colour and normal maps. Tube-wall UVs measure metres
along the branch arc and around each ring, providing a consistent physical
repeat. Flat end caps retain disc UVs. The periodic normal field is derived
from the same relief field that controls bark colour. Foliage remains a
2048 × 2048 atlas with sixteen patterns.

## Validation and provenance

The named `assetctl blender tree-family` operation preserves fresh source,
LOD0, LOD1, texture and brief artifacts. The manifest records a geometry hash,
exported Y-up bounds and triangle count for each level, plus material/texture
hashes and hashes of all five authoring modules. The exact brief must name
`atlas-branching-author-5`. Earlier candidates remain preserved.

Luna's executed checks cover fresh-run repeatability, raw exported geometry,
physical leaf sizes, center coordinates, normals/tangents and exact cross-LOD
foliage data. Render comparisons and genuine Opus 5.5 source review are complete. The review
found bark wrapping, LOD support and future wind problems; see the
[assessment](tree-authoring-v5-review-assessment-2026-09-28.md).

## Measured candidate

Seed `729281` produces LOD0 at **14,012 triangles** and LOD1 at **4,380**.
Both have identical exported bounds, a root at Y=0 and a height of 16.000515 m.
All 1,544 cards (6,294 exported foliage vertex records) match across detail
levels for position, UV, center and wind. Both GLBs and all four PNG textures
are byte-identical in the initial recorded pair. A later repeat exposed a
one-component tangent difference in the parallel Blender export; see below. Khronos validation has zero warnings or
errors. The physical bark audit checks fourteen trunk rings and thirteen
longitudinal intervals; it does not test the visible wrap seam.

See [technical test evidence](../test-results/tree-author-v5/atlas-tree-smoke-1790568688082/test-evidence.json),
[export validation](../test-results/tree-author-v5/atlas-tree-smoke-1790568688082/validation.json),
[candidate manifest](../test-results/tree-author-v5/atlas-tree-smoke-1790568688082/authoring-manifest.json)
and [repeat manifest](../test-results/tree-author-v5/atlas-tree-smoke-1790568688082-repeat/authoring-manifest.json).

The [source BLEND sheet](../test-results/tree-author-v5/atlas-tree-smoke-1790568688082-v5-blend-review/render-sheet.png),
[LOD0 sheet](../test-results/tree-author-v5/atlas-tree-smoke-1790568688082-v5-lod0-ordered-review/render-sheet.png)
and [LOD1 sheet](../test-results/tree-author-v5/atlas-tree-smoke-1790568688082-v5-lod1-ordered-review/render-sheet.png)
preserve the comparison. Source and LOD0 shaded views match pixel-for-pixel;
wire overlays differ slightly. Overall LOD silhouettes remain close, while
fine wood disappears. The [render receipt](../test-results/tree-author-v5/atlas-tree-smoke-1790568688082/v5-render-review-receipt.json) records image metrics, identical hash-seed rerenders and imported wind/center hashes matched independently against raw GLB accessors. This is not an accepted transition-distance measurement.
The crown still looks tiered and has a bare radial center in the top view;
leaves remain pale. The next revision must address these observations.

## Repeatability follow-up

A later unrestricted-thread pair differed in one LOD0 tangent component by
approximately 0.0001, crossing the exporter's four-decimal rounding threshold.
Geometry source, material hashes, textures and LOD1 were unchanged. The
[failing log](../test-results/tree-author-v5/smoke-tangent-repeat-failure.log)
is retained. The launcher now limits the named tree-authoring operation to one
Blender thread, and the manifest records thread count and Blender build hash.
The exact-byte repeat gate remains in place. Four serial outputs have independently matching GLB/PNG bytes in the [repeat audit](../test-results/tree-author-v5/serial-repeat-audit.json). Serial repeat evidence is recorded
in the [integrated smoke log](../test-results/tree-author-v5/smoke-integrated-audit.log).

That smoke now invokes both raw geometry and cross-LOD tests against its exact
fresh outputs, with an explicit expected operation version. The reviewed images
above belong to the earlier preserved candidate; they are not relabeled as a
new serial export.

## Remaining work

LOD2, collision, shared-atlas structural variants, resource budgets, calibrated
material response, leaf transmission, alpha-preserving mipmaps, runtime wind,
species binding and canopy integration remain open. The license declaration
remains `NOASSERTION`. The two GLBs each embed textures; loading both without
resource sharing is not the intended runtime texture-cache design.

See the [desktop realism plan](desktop-realism-implementation-plan-2026-09-27.md)
and the [previous v4 evidence](tree-authoring-v4-2026-09-28.md).
