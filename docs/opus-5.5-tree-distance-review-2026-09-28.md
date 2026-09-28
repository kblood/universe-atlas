# Opus 5.5 distance-tree design review

Source/design review only; no tests or visual acceptance were performed by the reviewer.

# Review: authored-tree distance representation

**Verdict:** The direction is sound, and the doc correctly refuses scaled screenshots, whole-atlas mips and cutoff tuning. Six algorithmic gaps would produce visible errors before any performance question matters. The leaf-scale issue is predictable now; it does not need measuring first.

## Blockers and repairs

**1. Leaf density vs height.** Leaf count and area stay fixed while crown area scales with sÂ². Projected leaf coverage therefore scales with (16/h)Â²: about 2.6Ã— denser at 10 m and 0.53Ã— at 22 m. A uniformly scaled 16 m bake will visibly change crown opacity at the handoff.
*Repair:* Bake height classes at 10, 16 and 22 m. The skeleton silhouettes align after normalising by height, so blending the two nearest classes is valid. As a cheap interim, treat captured Î± as transmittance and correct it: Î±â€² = 1 âˆ’ (1 âˆ’ Î±)^((16/h)Â²). Validate that correction against the class bakes.

**2. Sub-pixel leaves in capture.** At 128 px for a ~19 m sphere diameter, one texel is about 15 cm, so leaves are sub-texel. A single-sample MASK capture turns foliage into binary noise.
*Repair:* Capture at 4Ã— resolution and box-reduce. Store fractional coverage, and weight colour, normal and depth by coverage. Then dilate valid texels into the background before building mips. Use coverage-preserving mip alpha scaling; "test each mip" is a check, not a method.

**3. Three-view blend rule.** If weights are renormalised over only the valid samples, silhouettes inflate.
*Repair:*
- Î± = Î£wáµ¢Î±áµ¢, with background Î±áµ¢ = 0.
- Colour, normal, depth and class = Î£wáµ¢Î±áµ¢xáµ¢ / Î£wáµ¢Î±áµ¢.
- For each view, intersect the object-space ray with that view's plane, then do one depth-parallax refinement before sampling. With this approach the billboard's in-plane basis is irrelevant, which avoids the flip at `right` degeneracy that `forest-impostor.ts` handles with its axisZ fallback.

**4. Octahedral folds and poles.** With 8 intervals, the fold lines |u|+|v|=1 pass through grid vertices. A triangle split in a single fixed direction will straddle the fold in two quadrants.
*Repair:*
- Choose each cell's split diagonal by sign(u)Â·sign(v) so that it lies parallel to the fold.
- Seam duplicates must use identical view bases, not just identical directions.
- Give each view a deterministic basis with a pole fallback, and store it in the manifest.
- Note that the 9Ã—9 full-sphere grid has 22.5Â° spacing, which is coarse for foliage parallax. Compare it against 17Ã—17 at 64 px. Past the switch distance, trees are well under 128 px, so extra views are worth more than extra resolution.

**5. Depth precision and format.** 8-bit depth over about 25 m gives roughly 0.1 m steps, enough to float or sink roots on slopes. Packing depth across two 8-bit channels breaks filtering.
*Repair:* Use colour as SRGB8_ALPHA8 (coverage in alpha). Use a second RGBA16F data texture holding oct-encoded normal xy, view-axis depth in the declared [âˆ’R, R] interval, and a bark/leaf fraction. Cost per variant: 81 Ã— 128Â² Ã— 12 B Ã— 1.33 â‰ˆ 21 MiB, or about 19 MiB for 17Ã—17 at 64 px, per height class. Budget height classes explicitly.

**6. Handoff and shadows.** Alpha-to-coverage patterns are not complementary with discard-based dither, so the handoff will show holes or doubled pixels.
*Repair:*
- Transitioning instances use discard with the same screen-space noise and threshold t in both representations. Disable A2C for them.
- Add a per-instance wind fade: extend `instanceTree` to vec3 and multiply `_wind`. Current wind is only leaf flutter of Â±0.12 rad, so the wind bounds can be the rest bounds plus leaf radius, not a crown sway envelope.
- Shadows: set the switch distance at or beyond shadow range, and cast shadows from meshes only for v1. Per-light 3-view sampling across 150k trees is a later decision, not a v1 requirement.

## Costs

The switch should happen at or below about 0.75Ã— capture resolution to avoid magnified blending. At 1440p, a 16 m tree reaches 96 px at roughly 200 m. So meshes cover about 0â€“200 m (hundreds of LOD1 trees, around 2M triangles), and impostors cover nearly all 150k trees.

Three's logarithmic depth writes `gl_FragDepth`, so early-Z is already lost. Every impostor fragment costs about six fetches plus refinement. A common bounding sphere wastes roughly half of the side-view quad area. After v1 works, add a per-view 2D bound, or an 8-vertex hull, as the first overdraw reduction.

## Implementation order

1. **Baker:** A 16 m rest pose, 9Ã—9 and 17Ã—17 grids, 4Ã— supersampling, the blend and fold rules above, offline dilation and coverage-preserving mips, and a manifest recording bases, sphere and root offset.
2. **Lab diff:** One mesh vs one impostor at captured, intermediate, fold, seam and pole directions. Report coverage, depth and root error.
3. **Height classes:** 10 and 22 m, plus the Î±-exponent comparison.
4. **Integration:** Add a shading variant inside `ForestImpostors` that swaps the analytic intersection for atlas sampling. This reuses census ownership, dirty blocks, rebasing, water, draw range and the existing log-depth `gl_FragDepth` path unchanged. Add a new `customProgramCacheKey` and a feature flag.
5. **Mesh side:** Per-instance wind fade, dither handoff, then GPU/overdraw measurements at 192 trees and at full census.

Tints should read the classification channel so that bark and foliage tints match the mesh.

## Baker: Three via constrained assetctl browser operation

Recommend Three over Blender named capture plus a conversion audit:

- **Parity by construction.** The bake gets the same GLTFLoader, alphaTest semantics, double-sided normal flip (`gl_FrontFacing`), tangent-space normal convention and sRGB decode as the runtime.
- **Leaf-scale rule for free.** Rendering through the existing `deform()` with phase 0 and `instanceTree.x = h/16` produces the height classes directly. Blender would have to re-implement that rule, which creates a second source of truth to audit.
- **Channel outputs are simple.** Patch a clone of the runtime material at `#include <opaque_fragment>` so each pass writes base colour, perturbed normal (view to object space via the capture matrix), or depth.

Caveats:
- RGBA16F render targets need `EXT_color_buffer_float`. Fail the operation if it is absent.
- Bytes will vary across GPUs. Record adapter info and treat image hashes as provenance only. Compare against the mesh with tolerances, not byte identity.

Keep Blender as an independent cross-check render for a few views, not as the production path.
