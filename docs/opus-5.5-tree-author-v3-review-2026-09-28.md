# Review: Atlas branching author-3 (LOD0 proposal)

This review is based only on reading the supplied source. I did not run anything, so every finding here is inferred from the code, not observed in output.

## Blockers

**1. Tube frames twist at the trunk junction** (`tree_family.py`, `tube`)
Each ring picks its reference axis independently: `(0,0,1)` when `|dir.z| < .92`, otherwise `(1,0,0)`. When consecutive rings fall on different sides of that threshold, the ring rotates roughly 90Â° about the axis and the segment pinches.

This will happen on upper primaries. At a root height near 8.4 m with `riseâ‰ˆ4.2` and `reachâ‰ˆ2.8`, rings 0â€“1 have `dzâ‰ˆ.93â€“.96` and ring 2 has `â‰ˆ.85`. That puts a twisted segment right where the limb leaves the trunk. It also makes `h(scale)` discontinuous for the bisection.

Fix: use parallel transport (rotation-minimising frames), seeding the first ring's frame from a fixed reference.

**2. Smooth-shaded caps share rim vertices with the walls**
Caps are material 0, so they get `use_smooth=True`. Rim normals then average axial and radial directions, about 45Â° off. The whole first trunk segment (0.7 m, right at eye level) will shade with a gradient toward the ground, and every tip rim is skewed the same way.

Fix: drop the caps nobody can see. The root cap is at ground level, and the base caps of primaries, secondaries and twigs sit inside their parent. That covers roughly 1.4k triangles of the ~1.5k spent on caps. Make the remaining caps flat on separate vertices.

The same change removes the 0.2 mm twig-tip caps, which are the likeliest source of unstable MikkTSpace tangents.

**3. Determinism is not demonstrated and cannot be hashed canonically**
- `.blend` bytes are not reproducible between runs, so its `artifacts` hash identifies a run, not a recipe.
- `output.glob('*.png')` order is filesystem-dependent. Sort it.
- `brief.path` is an absolute machine path. Record it repo-relative.
- There is no content hash of vertex/index/UV/material data, which the brief's "mesh/material hashes" requires.
- The Blender version is recorded but not gated. MASK detection from `ROUND(alpha)` depends on the â‰¥4.2 exporter, so older builds silently export OPAQUE foliage. Assert an explicit supported version and record `sys.version`.
- The test never runs twice. Add a second fresh-directory run and compare the GLB and PNG bytes (or accessor hashes).

**4. Provenance overclaims and has missing gates**
- The brief's `notes` says the output was "authored through the named operation and reviewed". No run or review has been asserted, so this should read as pending.
- `author_tree` does not check `provenance.generator.version == VERSION`, so an author-2 brief would silently produce author-3 output.
- `sourceType: 'original'` and `externalInputs: []` are hard-coded rather than validated against the brief's `sourceType` and `parents`.
- The manifest `limitations` list omits items you describe as recorded elsewhere: the 8-variant batch, license resolution, KTX2/UASTC conversion, render sheet, and foliage transmission (which the brief's art direction asks for). The candidate should describe itself completely.

## Should fix before visual acceptance

- **Failed runs leave orphan candidates.** The output directory and brief snapshot are created before authoring. Any later exception leaves PNGs with no manifest. Author into a staging sibling and rename on success, or write a `status: failed` manifest.
- **Leaf shape stretches with orientation.** A square 512Â² tile is mapped onto a 1 Ã— 1.2 m card, so leaves along the shoot render 1.2Ã— longer than lateral leaves. `leafLengthM` is hard-coded, not measured. Either author the tile at 1:1.2 or pre-compress the foliage generator's y axis.
- **Triangle budget is inverted.** Estimated per-run counts:

  | Part | Triangles | Share |
  |---|---|---|
  | 3-sided twigs (â‰ˆ3 mm base, sub-pixel beyond ~10 m) | â‰ˆ5.4k | ~44% |
  | Leaf cards | â‰ˆ2.7k | ~22% |
  | Total | â‰ˆ12â€“15k | |

  Estimated leaf area is ~200 mÂ², against roughly 400â€“550 mÂ² for a 16 m open-grown broadleaf. Expect a sparse, see-through crown. Rebalance toward more, smaller cards.
- **Bark UVs are not in metres around the tube.** `u = j/sides` wraps once per circumference, so texel density differs about 100Ã— between the trunk and twigs. The trunk is also stretched about 1.9:1.
  - The 256Â² bark texture is too low for close desktop views.
  - The bark normal uses `cos(wave)` while the albedo furrows use `|sin(wave)|`, so relief runs at half the frequency of the colour furrows.

## Verified by reading (not by execution)

- **Attachment is consistent under Z scaling.** Anchors come from `sample` on the parent polyline, and lerp commutes with the linear Z scale. Child base radii (0.45, 0.55, 0.5 Ã— the local parent radius) keep base rings inside the parent.
- **Angular gaps are positive.** Gaps are floored at 0.25 before normalisation, a minimum of about 6Â°. `root_t*.4` adds only about 0.016 rad per step, and twist/bend are zero at t=0.
- **Heights are stratified.** `.28 + .56*(i+u)/14`.
- **Winding is correct.** Tube quads face outward, the root cap points down, and the tip cap points out.
- **Root contact.** The only z=0 ring is the trunk base, and the min-Z gate catches anything below it.
- **Atlas V orientation.** Blender's bottom-up pixels, UV v=0 at the card base, and the exporter's V flip all agree.
- **Alpha fringe.** The alpha-0 background uses the leaf RGB, which avoids dark fringes.
- **Budget.** Worst case is about 15.3k triangles, under 18k.

## Fitting approach

- The bisection makes 25 full emissions (2 bracket + 22 + 1). 22 iterations resolve scale to about 5e-7, while a 0.02 m tolerance at ~15 m per unit scale needs about 1e-3. Around 11 iterations would do, or secant on a height-only function that builds no vertex lists.
- **The real cost is `foliage_atlas`.** Each leaf scans a Â±`extent` box (~140k pixels) and does a per-pixel slice assignment, for roughly 20M Python iterations. Vectorise with numpy (bundled with Blender) or bound each leaf by its oriented extent.
- **Z-only scaling is only harmless here** because scale â‰ˆ 1. For other species heights it steepens branch angles, stretches twig and secondary lengths, and changes leaf posture (the direction is Z-scaled before the card is built). Longer term, make height a skeleton parameter.
- **LOD1/2 must reuse LOD0's `skeleton_scale`,** not refit, or they won't meet the 0.02 m silhouette/root agreement.

## Later increments (not blockers)

- **Alpha coverage.** Coverage-preserving mips or alpha-to-coverage at the KTX2 step. With a 3 px shoot and binary alpha, the crown will thin visibly by 50 m.
- **Foliage normals.** Card normals are flat, so crowns will read as planes under grazing sun. Blend normals toward a crown-centred direction.
- **Foliage material.** Transmission/translucency is missing, and leaves may be too matte (roughness 0.84 with specular 0.22). Check this under a grazing sun.
- **Wind.** `_WIND = (z/16)Â²` is height-only, which rules out hierarchical branch sway or leaf flutter. Add per-branch level and phase attributes, plus explicit animation bounds.
- **Slopes.** There is no buried root skirt, so trees on slopes will show the flat base on the downhill side.
- **Cleanup.** The leaf path inside `texture()` is dead code, since `range(0)` skips it. Remove it to avoid misleading provenance.
- **Test gaps.** Also assert bark `doubleSided=false`/opaque, foliage texture size â‰¤ 2048, and leaf UVs within each tile's inset.
