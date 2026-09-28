# Foliage coverage under minification

_Static coverage research and temporal browser check, 2026-09-28. No game change or visual acceptance._

## Current signal

A recent low-resolution probe reports horizon-view weighted tree coverage of
38 for the native tree mesh at 32 px, versus 264.25 for a 4×-supersampled mesh
reference and 291 for the impostor. At 8 px, even the 4× reference has not
converged. These values identify a useful failure case; they do not establish
that the impostor is correct or that 4× is ground truth. Higher-resolution
reference renders at 256, 512 and 1024 px have now been measured at three
directions. Coverage changes only 0.20–0.30% between the two finest renders.
Against the downsampled 1024 px reference, the horizon 32 px mesh retains 38
weighted pixels out of 279.28, while the proxy covers 291. These are whole-tree
silhouette measurements, including wood, rather than isolated leaf counts.
See the [convergence record](../test-results/three-ez-impostor-reference/native-map-fix/yaw-continuity.json).
Keep alpha coverage separate from colour, lighting and full-tree visual acceptance.

## Temporal browser check

A separate RTX 5090 / Chromium check compared family F's existing `mask` and
`hash` settings at population 192 for both LODs. It confirms the dated leaf
wind returns to the same captured image at date 0, +7 s and −7 s, and on a
repeated date-0 capture. Date 1.75 s changes pixels in both modes. This is
fixed-camera date replay, not a measurement of moving-camera hash noise or
temporal antialiasing.

| Coverage mode | LOD | CPU tree/ground p95 | GPU tree/ground pass p95 |
| --- | ---: | ---: | ---: |
| MASK | 0 | 1.0 ms | 2.651 ms |
| MASK | 1 | 0.7 ms | 0.806 ms |
| HASH | 0 | 0.9 ms | 3.394 ms |
| HASH | 1 | 0.9 ms | 1.171 ms |

Each profile used 120 warm-up and 180 sampled frames with shadows on. These
serial scene-lab samples are descriptive, not whole-game performance results
or a comparison proving either mode faster. Both modes were checked at three
trees in front/back views and both LODs. The foliage coverage mode propagated
to its depth and distance shadow materials; bark remained unmasked and
unhashed. The check does not demonstrate shadow-quality acceptance.

The camera-yaw captures compare whole 1200 × 900 frames, including camera and
background movement, so their changed-pixel counts do not isolate hash noise.
The separate zero-footprint render-target probe is a failed harness attempt;
its zero-coverage measurements are invalid, not evidence. The full methods and
captures are in the [temporal browser record](../test-results/tree-foliage-temporal/README.md).

## Reuse the current material and texture paths

The native foliage GLB uses an alpha-masked `MAT_AtlasFoliage` texture with a
positive cutoff (currently 0.5). `loadTreeAssetFamily()` already exposes
`foliageCoverage: 'mask' | 'hash'`: the default preserves alpha testing; the
existing `hash` option sets `alphaTest = 0` and enables Three.js `alphaHash` on
the foliage material. The instanced batch copies the alpha-test/hash settings
to its custom depth and distance materials. Compare these two modes first on
the same family-F GLB, without changing geometry or the authored alpha image.

The initial [hash diagnostic](../test-results/three-ez-impostor-reference/native-map-fix/alpha-hash-followup.json)
now tests that existing option on a cloned material at three views. At the
front 32 px output, hashed foliage gives 300 weighted tree pixels against
280.02 in its high-resolution reference; the ordinary mask gave 38. The two
high-resolution representations differ by only 0.28–0.31% mean absolute alpha
across the tested views. This is a static coverage result. Moving-camera noise,
date-driven wind, shadows and temporal antialiasing remain untested for this
diagnostic, so the option is not enabled in the game.

Add two isolated material/texture trials to that comparison:

1. **Alpha-to-coverage:** keep the 0.5 alpha test and set
   `material.alphaToCoverage = true` for the colour draw. Three.js enables
   `SAMPLE_ALPHA_TO_COVERAGE` for that material and smooths the cutout edge
   with `fwidth`; its docs require an MSAA-enabled WebGL context (renderer
   created with `antialias: true`). The current main and tree labs request
   antialiasing, but record the actual context's antialias attribute and
   effective sample state for every run. Do not assume a requested context
   gives a useful sample count on every device. For an offscreen render target,
   canvas antialiasing is insufficient: the target itself needs a verified
   positive sample count and a multisample resolve. The current comparison's
   native probe targets have zero samples, and the cloud scene target has its
   own AA setting. Alpha-to-coverage smooths
   fractional edge coverage; it does not restore alpha coverage already lost
   while making smaller mip levels. Keep the alpha test and existing depth
   behavior, and inspect colour/depth/shadow edges together. `createBatch()`
   currently copies alpha-test/hash settings, but not `alphaToCoverage`, to
   its custom depth and distance materials; treat this first as a colour-pass
   experiment and record the resulting shadow edge instead of implying matched
   multisample shadows.
2. **Coverage-preserving mip chain:** make a test-only mip chain from the exact
   embedded foliage PNG. Downsample alpha, then for every level find the alpha
   remap that preserves the base level's fraction of texels above the GLB's
   0.5 cutoff. Filter RGB in linear light with alpha weighting to avoid dark
   RGB leaking from transparent texels, then encode it back to sRGB. The
   current Three.js `Texture.mipmaps` upload path accepts an explicit level
   array, including the base image, when `generateMipmaps` is false; use a
   lab-only texture copy so the source GLB and shipped default stay unchanged.
   Compare coverage-preserving mips alone first; test it combined with
   alpha-to-coverage only if the individual results justify the extra mode.

For Atlas's leaf atlas, also measure coverage within each leaf cell. Preserving
only the whole texture's average could conceal losses in a sparse cell while
increasing coverage in a denser one. This is a test requirement for the adapter,
not a claim that the current textures have such a mip chain.

`alphaHash` trades hard cutout edges for a stochastic threshold and may show
grain at a still camera view; Three.js notes that temporal antialiasing can
reduce that noise. Atlas does not use a general TAA resolve in this tree path,
so inspect moving camera and tree-wind frames as well as still images.

The offline method is established: Ignacio Castaño's original alpha-mipmap
method solves for a per-level remap that preserves coverage at a chosen alpha
reference. Current DirectXTex `texconv` still exposes `--keep-coverage <ref>`.
However, Atlas's tree authoring operation validates embedded 8-bit PNGs, and
the local `assetctl texture` KTX2 command generates ordinary mips with
`toktx --genmipmap`; it has no coverage-preservation option. A DirectXTex DDS
chain is therefore a useful offline reference, not a drop-in tree artifact.
The smallest initial test is to feed precomputed levels to the lab's Three.js
texture copy. Changing the tree exporter/GLB texture contract is a separate
decision after the visual comparison.

## Keep impostor atlas bleed as a separate issue

The Three.ez baseline packs 16 × 16 capture views into one texture atlas and
lets the renderer generate mips for the whole atlas. Ordinary whole-image
downsampling mixes adjacent view cells at coarse levels; bilinear samples can
also cross a cell edge without guard texels. This can cause repeating colour
and alpha coverage from neighbouring views. It is separate from foliage alpha
coverage loss on the native mesh.

If the native-resolution Three.ez comparison still justifies that renderer,
test per-cell mip generation with edge dilation/gutters and cell-clamped UVs
as an atlas-specific follow-up. Do not use its larger 32 px weighted area as
evidence that the native mesh's alpha mip chain is fixed.

## Small comparison matrix

Use the same hash-verified family-F near GLB, material, light, exposure, camera
direction and date for four modes: default mask; existing hash; mask plus
alpha-to-coverage; and mask plus the explicit coverage-preserving mip chain.
The high-resolution reference uses the same mesh, not a different impostor.
Measure the requested 256/512/1024 reference convergence before using it as a
comparison baseline. Then probe 128, 64, 32, 16 and 8 px at the horizon and
ground-observer elevations. Record:

- alpha-weighted coverage and binary coverage at the authored 0.5 threshold;
- silhouette overlap and color error separately, with 4×/higher-reference
  mesh downsampling noise reported beside each result;
- coverage stability across small yaw/elevation changes, moving views and
  deterministic wind poses;
- the antialias context/sample state and any visible hash noise, edge halos or
  shadow/depth mismatch.

Use close views as a regression gate: each option must retain the authored
leaf scale and avoid growing the canopy to compensate for distant thinning.
The experiment can recommend a material or mip policy only. It does not
approve a tree asset, an impostor transition, a new generator, or game
integration.

## Sources and local implementation references

- [Castaño, “Computing Alpha Mipmaps”](https://www.ludicon.com/castano/blog/articles/computing-alpha-mipmaps/) — original per-mip alpha remapping approach and coverage definition.
- [Castaño, “Runtime Mipmap Generation”](https://www.ludicon.com/castano/blog/2026/02/runtime-mipmap-generation/) — alpha-weighted colour filtering and why coverage correction is distinct from filtering.
- [Microsoft DirectXTex `texconv` source](https://github.com/microsoft/DirectXTex/blob/main/Texconv/texconv.cpp) and [current command reference](https://github.com/microsoft/DirectXTex/wiki/Texconv) — `--keep-coverage` support.
- Three.js [Material alphaHash and alphaToCoverage reference](https://threejs.org/docs/pages/Material.html) — stochastic cutout behavior and the MSAA requirement.
- Local `src/tree-asset.ts` and `tests/tree-impostor-rendering.test.mjs` — current mask/hash options and depth/distance material propagation.
- Local `tools/assetctl/blender/tree_family.py` and `tools/assetctl/texture.mjs` in the tooling repository — PNG-in-GLB authoring constraint and ordinary KTX2 mip generation path.
- [Three.ez comparison record](tree-three-ez-impostor-2026-09-28.md) — atlas baseline and its separate view-cell minification limitation.
