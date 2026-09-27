# First authored tree candidate — 2026-09-28

A named `assetctl blender tree-family` operation now authors an editable
Blender tree from the validated branching-family brief. It accepts data only,
preserves inputs, rejects existing output directories, and emits a manifest
with source/brief hashes, seed, Blender version and artifact hashes.

The first candidate is an original procedural mesh and four original
256×256 bark/leaf colour/normal textures. No external mesh, photograph or
learned generator was used. Seed: `729281`; Blender: `5.1.1`.

## Technical review

- LOD0: 16,076 triangles, two materials, explicit UVs, normals, tangents and
  a custom `_WIND` attribute in GLB.
- Root pivot and contact plane agree at runtime Y=0.
- Assetctl/Khronos validation: zero errors, zero warnings, zero nonfinite
  accessors and zero degenerate indexed triangles.
- The integration smoke also verifies that attempting to reuse the output
  directory fails without changing the source `.blend`.
- Source and GLB are retained alongside the six-view review and manifest at
  `Assets/_assetctl/atlas-tree-smoke-1790550289158/` in the IWSDK workspace.

## Visual review and remaining work

The first sparse candidate was revised to move more geometry into leaves and
improve branch hierarchy. Review lighting was corrected to scale with asset
size; the previous constant light energy severely underexposed a 16 m tree.
Wire review thickness was also reduced so it does not overwhelm small leaves.

That crown is still too sparse and the branch arrangement too regular
for the planned temperate forest. Bark, leaf shading, crown coverage, close
views and mature silhouette need another art pass. No realism acceptance is
claimed. LOD1/2, collision, variant generation, runtime wind, canopy integration,
packaging/provenance approval and target-scene acceptance remain unfinished.
The prototype GLB is not shipped in the game.

## Second art increment

Root toolchain commit `122f2d4` introduces authoring recipe
`atlas-branching-author-2`. Four original 13-leaf sprays share a 1024×1024
colour/normal atlas. One metre by 1.2 metre cards keep the represented leaves
around 20–32 cm long. The branch layout has staggered crown heights and wider
lower limbs. Bark remains a separate 256×256 texture set.

The new candidate has 11,100 triangles and two materials. Export validation
again reports zero errors/warnings, finite geometry, UV/tangent/wind data and
root Y=0. The smoke additionally checks double-sided foliage, glTF `MASK`
alpha with cutoff 0.5, and the original foliage recipe hash. The exported GLB
was reimported for a six-view render sheet at
`Assets/_assetctl/atlas-tree-smoke-1790551659729/review/`; a repeat smoke at
`atlas-tree-smoke-1790551715913` also passes.

The reviewed silhouette is fuller and less regular, but leaf shading remains
too pale under the review lights and close materials still need work. Cutout
cards trade geometry for alpha overdraw: fewer triangles do not establish a
runtime speedup. This remains an unshipped proposal with the same LOD,
collision, wind, packaging and in-game acceptance work outstanding.

This is a reviewed proposal under the
[tree contract](tree-species-asset-contract-2026-09-28.md), not a finished asset.
