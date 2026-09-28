# EZ-Tree reference comparison — 2026-09-28

**Status: completed bounded browser comparison; candidate geometry only.** It
is not an accepted Atlas asset, packaged GLB, or game integration. The final
timings apply to this RTX 5090 fixture and do not establish a general speedup.

## Source and repeatability contract

The named `tree-reference` assetctl operation runs a byte-pinned copy of
[EZ-Tree](https://github.com/dgreenheck/ez-tree/tree/dcf309bd86bd521083d9c70f01f2de45fdc7c457)
at revision `dcf309bd86bd521083d9c70f01f2de45fdc7c457` (MIT). The operation is
bounded by the validated brief at `IWSDK/examples/asset-briefs/atlas-ez-tree-reference.json`;
its candidate outputs are kept in `IWSDK/Assets/_assetctl/ez-tree-oak-reference-a`.
The experiment uses oak-medium, seed `35729`, and a 16 m target. It preserves
the upstream notice and hashes in the manifest. The output status is
`geometry-comparison-not-packaged`.
The [retained reference manifest](../test-results/tree-reference-ez-oak/reference-manifest.json)
is an exact copy of the early host output; its SHA-256 is
`b219c25c26f5e7f72bafbfd1fe207660adb781ff1e546f6de7b529db963cc8cc`.
The current source adds explicit source-unscaled skeleton coordinates and
declares both upstream LOD deliverables; geometry in this retained manifest
matches the current Oak fixture. Its `generationMs` value measures a complete
cold adapter call—skeleton generation, all four mesh passes, copying, scaling
and audits—not isolated EZ-Tree generator speed.

The generated source skeleton feeds four compared geometry choices:

| Variant | Triangles | Leaf handling |
| --- | ---: | --- |
| Full | 13,806 | Full leaf geometry retained (10,640 triangles across crossed card planes) |
| Wood-reduced | 12,014 | Same leaf geometry as full; wood sections and segments reduced |
| Upstream LOD1 | 6,694 | Half the leaf triangles retained; survivors enlarged 1.25× |
| Upstream LOD2 | 3,782 | Half the leaf triangles retained; survivors enlarged 1.3×; one billboard plane rather than crossed planes |

The two reduced upstream LODs therefore trade fewer leaf cards for larger
survivors. Their triangle totals alone do not show whether that trade keeps
canopy coverage or a smooth transition. LOD2 still uses the shared double-sided
leaf material; “single” describes its one billboard plane. The wood-reduced
variant is a separate control: it lowers branch geometry while retaining the
full leaf mesh. No current LOD reaches the planned 5,000/900 far-tree budgets
while retaining all full-detail foliage; the upstream reductions lower leaf
counts, so the geometry totals alone do not establish a usable transition.

## Physical scale and source-normal caveats

Full-detail EZ-Tree leaf clusters use two crossed 1.2 m square card planes. The
Atlas authored-tree comparison uses 1.0 × 1.2 m cards. Both use the same Atlas
texture images through different UV and tangent paths, so this is an explicit
comparison condition, not an identical material/geometry result. The browser
fixture has corrected tile orientation; tile bleeding still needs review.
Branch and attachment coordinates are scaled to the requested skeleton height
while local card offsets are retained.

EZ-Tree double-crosses its full-detail leaf clusters. The 5,320 triangles on
the second plane have unrotated normals and test orthogonal to that plane; the
first plane's normals are correct. The manifest measures and preserves this
source behavior; a browser correction toggle tests a comparison-only
adjustment. Do not describe the upstream reference as having corrected
normals. The wood-reduced mesh also exposes some source branch-normal defects,
recorded in the manifest.

The assetctl repeatability and 10 m / 22 m physical-card checks pass in the
CPU record; these scale checks do not establish canopy coverage. A separate
Ash run has 20,000 full-detail triangles and 14,006 wood-reduced triangles;
the latter retains all foliage and is below the 18,000 near-tree target. The
full Ash tree exceeds that near budget as generated. Neither Ash output is the
Oak browser fixture.

The [Opus 5.5 source review](opus-5.5-tree-reference-review-2026-09-28.md)
identified adapter robustness and manifest/brief consistency fixes that were
applied to the current operation. It was a static source review, not visual or
performance acceptance. Its proposed material/culling checks do not map
directly to the primary 16 m comparison: Atlas's current hook changes vertex
position and normal/tangent orientation, with zero wind phase and identity
height scale at that size; both comparison LODs have culling disabled. There
are no fragment or PBR lighting changes. The final browser report remains
the source for rendered comparisons.

Selected adapter, metadata and test fixes from the review have been applied;
the assessment records the remaining evidence and qualified findings. Browser
results require separate visual judgement. The [review metadata](opus-5.5-tree-reference-review-2026-09-28.metadata.json)
preserves the returned model and source hashes.

## Browser comparison

The final Luna fixture used an RTX 5090 D3D11 adapter, WebGL, a 1440 × 1000
canvas at pixel ratio 1, and six 60-frame samples: Atlas family and EZ-Tree
reference at populations 3, 64 and 192. Every sample used two instanced draw
calls. The reported GPU timer-query median and p95 were:

| Population | Atlas GPU p50 / p95 (ms) | EZ-Tree GPU p50 / p95 (ms) | Submitted triangles, Atlas / EZ-Tree |
| ---: | ---: | ---: | ---: |
| 3 | 0.0125 / 0.0340 | 0.0494 / 0.0556 | 32,136 / 41,418 |
| 64 | 0.1682 / 0.1846 | 0.2085 / 0.2284 | 685,568 / 883,584 |
| 192 | 0.7244 / 0.8129 | 0.5828 / 0.6045 | 2,056,704 / 2,650,752 |

These are measurements of this fixture, not a performance win: the trees have
different geometry and canopy coverage, the EZ-Tree submits more triangles,
and the check does not represent the complete game. It provides a comparable
single-browser workload only; do not present it as a general speedup. All six
samples reported two draws and no WebGL errors. The loader rollback and
measurement guards also passed. Renderer counters did not increase on failed
replacement; successful replacement reduced uploaded geometries from ten to
two because hidden details upload lazily. These counters do not prove buffer
deletion. After supplemental views the counters were four geometries and five
textures. See the [browser report](../test-results/tree-reference-ez-oak/browser-report.json)
and [two passing CPU checks](../test-results/tree-reference-ez-oak/cpu-tests.log).

The matched 16 m image shows a fuller connected EZ-Tree crown with less
conspicuous horizontal branching than Atlas's current authored-family
candidate. Both trees remain visibly card-based and their foliage remains dark;
the comparison is not final realism acceptance. The geometric-normal toggle
makes the second crossed plane respond more consistently, but it is an adapter
view, not an upstream asset correction. Tile orientation is corrected; texture
bleeding, physical-card UV fit, wind/pivot attributes, export budgets and LOD
transitions remain open. The evidence supports EZ-Tree as the next geometry
source candidate to adapt, subject to those follow-up checks, rather than as a
ready-to-ship asset. Oak full detail fits the 18,000-triangle near budget, but
its upstream 6,694-triangle LOD1 exceeds the 5,000 target and 3,782-triangle
LOD2 exceeds the 900 target. Both lower levels reduce leaf geometry. The Ash
full tree is 20,000 triangles; wood-reduced Ash is 14,006 while retaining all
foliage.

| Comparison | Evidence |
| --- | --- |
| 16 m Oak | [Matched comparison](../test-results/tree-reference-ez-oak/comparison.png) |
| 10 m Oak | [Matched comparison](../test-results/tree-reference-ez-oak/comparison-oak10m.png) |
| 22 m Oak | [Matched comparison](../test-results/tree-reference-ez-oak/comparison-oak22m.png) |
| 16 m Ash | [Matched comparison](../test-results/tree-reference-ez-oak/comparison-ash16m.png) |
| Source / corrected normals | [Source normals](../test-results/tree-reference-ez-oak/ez-full-source-normals-close.png), [geometric normals](../test-results/tree-reference-ez-oak/ez-full-geometric-normals-close.png) |
| Wood-reduced and upstream LOD controls | [Wood-reduced](../test-results/tree-reference-ez-oak/ez-wood-reduced-close.png), [LOD1](../test-results/tree-reference-ez-oak/ez-upstream-lod1-close.png), [LOD2](../test-results/tree-reference-ez-oak/ez-upstream-lod2-close.png) |

The browser report's `src/tree-reference-lab.ts` hash matches the current lab
source. Supplemental 10 m and 22 m views check physical card dimensions at
other tree heights; they do not establish equal canopy coverage.

## Limits and follow-up

The tree is geometry-only: no external bark or leaf artwork, production
materials, animation, Atlas wind attributes, collision, packaged GLB, species
binding, or planetary integration. The comparison lab is not a game feature.
No generated variant is accepted for Atlas from triangle counts or a single
seed alone.

The [earlier methods review](tree-existing-methods-2026-09-28.md) remains a
source-only snapshot made before this operation ran; its statement that it
benchmarked no candidate is historically accurate. This record is its measured
follow-up. The [desktop realism plan](desktop-realism-implementation-plan-2026-09-27.md)
continues to require visual acceptance, appropriate LOD budgets, packaging and
target-device validation before any authored species can enter the forest. The
later [Atlas GLB adapter candidate F](tree-ez-family-2026-09-28.md) reuses this
Oak source with the existing Atlas material graph; it remains a development
candidate, not an accepted asset.
