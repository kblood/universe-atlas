# Proposed next tree-authoring increment — 2026-09-28

**Status: v3 partially implemented; visual signoff and Opus review fixes pending.**
The sections below preserve the original proposal and rationale. The authoring modules
`tree_family.py`, `tree_skeleton.py` and `tree_foliage.py` have since been
revised, and a v3 smoke candidate has passed technical GLB checks. It remains an
authoring experiment, not an accepted or shipped species asset.

The v3 smoke candidate is 15.999997 m tall with a 12.652519 m stem, sixteen
staggered foliage sprays on fixed 1 × 1.2 m cards, a 2048 × 2048 foliage atlas,
12,020 triangles and two materials. Root pivot, finite positions/UVs and the
technical wind data validate. Its manifest and validation output are preserved
in [v3 smoke evidence](../test-results/tree-author-v3/authoring-manifest.json)
and [validation](../test-results/tree-author-v3/validation.json). Luna reviewed
the corrected bounded-wire sheet: branching is less regular, but the crown is
still sparse, asymmetric and tiered, and the leaves look pale. The prior wire
panel was invalid due to the review modifier and is only a diagnostic. The
[corrected sheet](../test-results/tree-author-v3/atlas-tree-smoke-1790566084092-render-sheet-bounded-wire/render-sheet.png)
and [hero view](../test-results/tree-author-v3/atlas-tree-smoke-1790566084092-render-sheet-bounded-wire/hero.png)
show the current state. Opus 5.5 completed a source-only review and reported
geometry, determinism and authoring/provenance blockers. Authoring v4 fixes are
underway, but no v4 candidate has been produced or validated. See the [review
report](opus-5.5-tree-author-v3-review-2026-09-28.md) and [v3 status](tree-authoring-v3-2026-09-28.md).

An eight-variant batch, tree-specific LOD1/2, collision, calibrated grey
reference colour review, runtime wind binding, species/cell binding, packaging
and license resolution remain open. The candidate license is `NOASSERTION`;
none of the new authoring changes is integrated into the forest renderer.

The prior candidate at seed `729281` had 11,100 triangles and measured
13.819 m against the brief's 16 m reference. Its review sheet showed a fuller
but regular crown, repeated fan-shaped sprays and pale foliage. Existing source
and candidate folders remain preserved; see the dated candidate record.

## 1. Reach the reference height without enlarging leaves — implemented in v3 smoke

In the pre-v3 `tools/assetctl/blender/tree_family.py`, `author_tree` fixed the
trunk path at 10 m (`trunk = ... i * 10 / 14`), places 14 primary branches on
the trunk, and emits leaf cards as it goes. The maximum exported vertex is
13.819 m for the reviewed seed. A first estimate for the missing height is
`16 / 13.819 = 1.1576`.

V3 constructs a deterministic branch skeleton before emitting geometry,
applies vertical scaling to the skeleton, and regenerates tubes and foliage.
The smoke manifest records a 12.652519 m stem and 15.999997 m total height; the
root pivot is `(0, 0, 0)`. Card dimensions remain 1.0 × 1.2 m and leaf lengths
remain 0.20–0.32 m. This verifies the 16 m envelope without uniformly enlarging
the cards. Target-render review is still needed before treating its scale or
shape as accepted.

The current `_WIND` weight uses `p.z / 16` in `add_vertex`. A 16 m final
envelope makes this denominator meaningful. Keep the weight clamped to `[0,1]`
and recompute it after the final skeleton transform. Export validation should
check maximum height, root contact, leaf card dimensions and wind bounds.

## 2. Distribute branches irregularly and keep taper continuous — authoring code updated; visual review pending

The pre-v3 `author_tree` used `angle = primary * 2.3999632297` with ±0.18 rad
jitter, and repeated branch start heights with `start_i = 5 + primary % 9`.
Secondary branches and twigs also use fixed loop counts and repeated anchors.
That combination produces visible spokes and ring-like groupings from above.

V3 moves structure generation into `tree_skeleton.py` and revises seeded
skeleton placement. The detailed targets below remain review criteria where
not explicitly verified by the smoke manifest or render review. Technical
validation does not establish visual approval. Luna's first corrected sheet
confirms a less regular arrangement but also shows a sparse, asymmetric,
tiered crown; improve the silhouette before proposing the family as accepted.

Replace it with a seeded stratified placement over the middle 56% of the stem:
for `N` primary roots, place one root in each interval of
`[0.28H, 0.84H]`, add bounded jitter, sort by height, and enforce a small
minimum vertical gap. For azimuth, draw positive gaps such as
`g_i = max(0.25, -log(U_i))`, normalize their sum to `2π`, and add a seeded
phase plus a small height-dependent twist. This produces uneven spacing
without letting branches collapse into one sector. Replace the straight
radial interpolation with a curved branch path, for example:

```text
t = segmentIndex / segmentCount
r(t) = reach * (0.22*t + 0.78*t^1.35)
z(t) = rootZ + rise * (0.25*t + 0.75*t^0.75)
azimuth(t) = rootAngle + twist*t + bend*sin(π*t)
```

Place secondary roots at seeded, nonuniform parameters along each parent;
choose child directions relative to their parent's tangent. Derive each child
base radius from the parent radius at its attachment (initial proposal: 0.45
of parent radius for primary limbs, 0.55 for secondary limbs and 0.5 for
twigs), then taper monotonically to a small tip radius. This avoids the
current fixed branch base radii becoming wider than the upper trunk. Preserve
branch intersections as connected visual forms and inspect close views for
gaps after changing the taper.

## 3. Make foliage sprays less repetitive and calibrate colour — atlas implemented; colour review pending

Before v3, `tools/assetctl/blender/tree_foliage.py::foliage_atlas` emitted a
1024 × 1024 atlas with four 512 px tiles. Each tile had six mirrored leaf pairs
and a tip leaf. The earlier `tree_family.py::leaf_spray` picked from those four
tiles, while its twig loop placed three cards at fixed fractions along each twig.

V3 emits a 2048 × 2048 foliage atlas with sixteen original staggered
alpha-mask sprays on fixed 1 × 1.2 m cards. The smoke manifest records this
atlas and GLB validation confirms the masked foliage material. Grey-reference
and target-scene colour calibration remain pending; Luna's review still finds
the foliage pale. The detailed proposals
below remain to be reviewed:

For the next version, use a 2048 × 2048 atlas with sixteen 512 px tiles, within
the brief's 2048 px maximum. Build each tile with a curved central shoot, 3–5
staggered pairs, independent offsets and angles per side, varied leaf lengths,
and occasional gaps or short leaves. Update the tile UV selection in
`leaf_spray` to a 4 × 4 grid. Place two sprays per terminal twig at seeded,
nonuniform locations and orientations instead of three repeated positions.
If more branch tips are needed to restore coverage, increase terminal twig
count while keeping the LOD0 total below the brief's 18,000 triangle ceiling.
Do not resize the entire card to create leaf-size variation.

The isolated base-colour atlas is dark green, while the reviewed render appears
washed out. Calibrate the review and runtime response before making a large
albedo change. `assetctl`'s render sheet scales area-light energy and size
with the measured asset radius; add a neutral grey reference patch and hold
exposure and colour transform fixed for candidate comparisons. Then compare
the foliage in the target renderer under midday, grazing and overcast
lighting. Starting material adjustments to test are foliage roughness `0.84`
(currently `0.76`) and Principled Specular IOR Level `0.22` (rather than the
default), with leaf brightness tint narrowed from `[0.85, 1.12]` to
`[0.75, 0.98]`. If calibrated target renders still read too pale, test atlas
green `0.22` in place of `0.27` and red `0.10` in place of `0.12`. These are
review parameters, not approved final values. Keep base colour free of baked
directional lighting; preserve separate bark and foliage masks.

## 4. Generate a bounded family and tree-specific LODs — proposed, not implemented

The current `tree-family` named operation accepts one brief seed and emits one
candidate. The brief already validates and its `experiments.seeds` field is
the schema-approved place to list candidate seeds. A later version of the
named operation may accept exactly eight explicit, unique uint32 seeds from
that field and emit eight structurally distinct but related trees. Derive
branch layouts deterministically from those seeds. Keep the physical envelope,
species leaf dimensions, root pivot, shared material contract and wind bounds
within each species recipe; do not use camera position or selection order to
choose a variant.

`src/tree-species-recipe.ts` already bounds `TREE_VARIANT_COUNT` at eight,
keeps leaf dimensions independent of height variation, and keys cached
geometry by recipe version, asset version, species fingerprint, variant and
LOD. Preserve that contract. Update recipe/asset version identifiers whenever
the generated structure changes. A species with a different physical height
or leaf size needs geometry generated from those explicit recipe parameters;
do not scale the finished GLB uniformly, since that would scale its leaves.
At runtime, choose a variant deterministically from species and canonical cell
identity, with a byte-counted cache whose eviction preserves cell assignment
and has an explicit fallback LOD.

The eight structural variants must share one foliage atlas per species; do not
duplicate the current 2048 × 2048 textures for each variant, which would
multiply texture memory. The brief's LOD ceilings are LOD0 ≤18,000, LOD1 ≤5,000 and LOD2 ≤900
triangles, with root and silhouette agreement within 0.02 m. Current
`tools/assetctl/lod.mjs` uses generic 50% and 25% targets, so an 11,100-triangle
source would target about 5,550 and 2,775 and miss both lower-level ceilings.
Generate tree LODs from the same branch graph instead of relying on generic
decimation alone:

- **LOD0:** full branching and leaf cards, with an 18,000-triangle hard gate.
- **LOD1:** retain trunk and primary limbs; deterministically prune the least
  visible terminal twig groups; use fewer tube segments/sides while retaining
  the physical leaf cards. Aim near 4,500 triangles for margin under 5,000.
- **LOD2:** use a 10–12 segment six-sided trunk, around ten major limbs with
  only a few segments, and a small set of leaf-cluster cards. Aim for 700–800
  triangles, preserving root contact and the crown's measured outer envelope.

For all three, check alpha coverage/overdraw, wind weights, normals, UVs,
triangle counts and actual exported bounds. Keep generic `assetctl lod` as a
comparison and validator input, not the acceptance authority for foliage.

## 5. Provenance and acceptance safeguards for remaining work

The validated brief is
`assets/briefs/temperate-branching-tree-v1.json`. The current candidate remains
an original procedural proposal with license `NOASSERTION`; it is unshipped
and not production accepted. Preserve the historical manifest that copied the
outdated “no generated output exists yet” wording. Do not rewrite old candidate
manifests or artifacts to make the new record look cleaner.

The v3 smoke output is retained in
`Assets/_assetctl/atlas-tree-smoke-1790566084092/`. For subsequent candidates,
use a new output directory under `Assets/_assetctl/` and the named data-only
`assetctl blender tree-family` operation. Keep the exact brief
byte snapshot, master seed and all eight variant seeds, authoring version,
Blender version, tree-family and foliage-source hashes, and hashes for every
`.blend`, GLB, texture and render sheet in the manifest. Keep the license at
`NOASSERTION` unless the declaration is actually resolved. Validate the brief,
GLB, root/height, triangle caps, LOD silhouette, alpha-mask behavior, render
sheet, package manifest and target-scene performance before describing any
variant as accepted. The v3 smoke remains technically validated but awaits visual signoff, fixes
for the Opus review findings, and the outstanding asset, runtime and license
gates. Authoring v4 code changes are underway, but no v4 candidate exists yet.

## Source records

- [V3 smoke status and review](tree-authoring-v3-2026-09-28.md)
- [Reviewed candidate and visual findings](tree-asset-candidate-2026-09-28.md)
- [Tree species and asset contract](tree-species-asset-contract-2026-09-28.md)
- [Candidate brief](../assets/briefs/temperate-branching-tree-v1.json)
- `tools/assetctl/blender/tree_family.py`: `author_tree`, `tube`, `leaf_spray`
- `tools/assetctl/blender/tree_skeleton.py`: deterministic branch skeleton
- `tools/assetctl/blender/tree_foliage.py`: `foliage_atlas`
- `tools/assetctl/blender/asset_blender.py`: `op_render_sheet`
- `tools/assetctl/lod.mjs`: generic LOD target ratios
- `src/tree-species-recipe.ts`: bounded variants and geometry cache key
