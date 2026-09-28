# Tree authoring v4 smoke and repeat — 2026-09-28

**Status: technical smoke, independent repeat, and BLEND-to-GLB render
comparison pass.** The candidate's visual design still needs calibration and
asset acceptance; it is not packaged, species-bound or integrated into the
runtime forest.

## Technical candidate

The `atlas-branching-author-4` output uses seed `729281`, Blender 5.1.1, the
original source declaration and no external inputs. The GLB audit reports
18,472 vertices, 12,020 triangles (9,396 wood and 2,624 foliage), two materials
and 1,312 physical 1 × 1.2 m leaf cards. The root is at Y=0, the measured height
is 15.999341 m and stem height is 12.651978 m. Normals, tangents, UVs, wind data
and finite geometry pass the recorded validation; there are no degenerate
indexed triangles or Khronos validator warnings/errors.

A fresh repeat output has matching canonical geometry and material-content
hashes. The GLB and all four PNG textures were independently confirmed
byte-identical between the two output folders. The editable `.blend` files are
run artifacts and do not match byte-for-byte. Unsupported version and
source-type requests are rejected before creating outputs.

The physical audit records 18,472 vertices, 12,020 triangles, 1,312 leaf cards,
13.434 × 12.139 × 15.999 m bounds, zero degenerate triangles and zero Khronos
warnings or errors. A second pair of fresh directories passed the 2-test smoke
and rejection suite; all five GLB/PNG files and both content hashes match the
rendered candidate.

Manifests and technical validation are preserved in separate subdirectories to
match their original output paths: [rendered candidate manifest](../test-results/tree-author-v4/atlas-tree-smoke-1790566779960/authoring-manifest.json),
[candidate validation](../test-results/tree-author-v4/atlas-tree-smoke-1790566779960/validation.json),
[repeat manifest](../test-results/tree-author-v4/atlas-tree-smoke-1790566779960-repeat/authoring-manifest.json),
[latest smoke manifest](../test-results/tree-author-v4/atlas-tree-smoke-1790567076137/authoring-manifest.json), and
[latest repeat manifest](../test-results/tree-author-v4/atlas-tree-smoke-1790567076137-repeat/authoring-manifest.json).
The [test log](../test-results/tree-author-v4/smoke-repeat.log),
[physical audit](../test-results/tree-author-v4/physical-audit.log),
[receipt](../test-results/tree-author-v4/authoring-receipt.json) and
[independent repeat audit](../test-results/tree-author-v4/repeat-audit.json)
preserve the results. The code-level fixes and their review context are
recorded in the [authoring review assessment](tree-authoring-review-assessment-2026-09-28.md).

## Visual review and remaining gates

Luna's render roundtrip compares the authored `.blend` with its exported GLB.
The 512 × 512 hero renders differ in one green-channel pixel by one level;
both have the same 22,134-pixel foreground bounds. Across the 1536 × 1024
six-view sheets, 7,554 of 1,572,864 RGB pixels differ slightly. The comparison
concludes there is no material-colour or visibility loss in export. This checks
BLEND-to-GLB fidelity; it does not approve the tree's appearance.

The [authored BLEND sheet](../test-results/tree-author-v4/atlas-tree-smoke-1790566779960-v4-blend-review/render-sheet.png)
and [exported GLB sheet](../test-results/tree-author-v4/atlas-tree-smoke-1790566779960-v4-glb-review/render-sheet.png)
are both retained.

The current sheet retains the v3 silhouette concern: a sparse, asymmetric,
tiered crown and pale leaves. Calibrated lighting/material response and crown
design remain open.

The eight-variant species family with shared atlas, tree-specific LOD1/2,
collision, neutral-grey material calibration, runtime wind, species/canonical
cell binding, package validation, KTX2/UASTC conversion and target-runtime
acceptance remain open. The recorded license is `NOASSERTION`. The candidate
does not replace the current legacy faceted runtime trees.

## Provenance and evidence locations

Original outputs are retained under:

- `Assets/_assetctl/atlas-tree-smoke-1790566779960/`
- `Assets/_assetctl/atlas-tree-smoke-1790566779960-repeat/`

The copy of the validation and manifests retains those two folder names under
`test-results/tree-author-v4/` so their output provenance remains clear. The
additional smoke pair is nested under its own exact candidate/repeat names.
Full asset hashes remain in each original and copied manifest. Luna's
[BLEND/GLB roundtrip metrics](../test-results/tree-author-v4/render-roundtrip.json)
are preserved with the render sheets. No target-runtime profile or integration
was performed by this report.

See the [v3 visual and CLI review record](tree-authoring-v3-2026-09-28.md),
[next-increment proposal](tree-authoring-next-increment-2026-09-28.md), and
[desktop realism plan](desktop-realism-implementation-plan-2026-09-27.md).
