# Tree authoring v5 review assessment — 2026-09-28

The genuine [Opus 5.5 source review](opus-5.5-tree-author-v5-review-2026-09-28.md)
found rendering problems despite the candidate passing its geometry/export
tests. The [review metadata](opus-5.5-tree-author-v5-review-2026-09-28.metadata.json)
records actual model identity and input hashes. The review used supplied source
only. It preceded the Blender import workaround and tightened bark tests.

## Changes required before runtime integration

- **Bark wrapping:** v5's circumferential UVs correctly measure metres, but the
  circumference rarely contains a whole texture repeat. This creates a seam;
  different spans at consecutive rings also fan the texture. The next version
  needs a fixed span per tube and a compatible horizontal texture period. Its
  contract must describe approximate circumferential texel density and exact
  longitudinal scale rather than promise both exact density and seamless wrap.
- **LOD1 connectivity:** retaining foliage preserves crown data, but omitting
  all secondary wood leaves visible gaps in support. Restore simplified
  secondary limbs within a revised, explicit construction budget. Twig removal
  still needs a measured distance/visual gate. No GPU saving is established by
  triangle counts; alpha overdraw is unchanged in v5.
- **Wind:** the current per-vertex height weight would shear cards if directly
  used for displacement. A future wind contract needs a shared card weight and
  attachment pivot. `_LEAF_CENTER` currently supports physical crown scaling;
  it is not a wind attachment pivot. Runtime wind is not installed.
- **Crown structure:** allocating the secondary budget in height order biases
  upper branches when the cap binds. Allocate counts before assigning branches.
  Coupled height/azimuth ordering also creates the observed tiered silhouette.
  A revised branch arrangement needs visual review and measured coverage,
  including the visibly hollow center in the top view.
- **Material detail:** band-limit the finest bark/leaf features and calibrate
  lighting before accepting colour or normal strength. Pale leaves remain
  visible in the review renders.

## Evidence and qualifications

The rigid-card measurements, exact LOD foliage data, reference height, root,
triangle ceilings and repeated export bytes are useful technical results. They
do not approve appearance, connections, wind deformation or LOD transitions.
The bark audit measures the implemented UV convention; it is not a seam test.

Absolute artifact paths identify retained local runs and are not canonical
content hashes. They should become portable relative references when packaging.
Record exporter/build and NumPy identities in the next authoring manifest, and
measure the audit fields currently fixed by construction. Validate paths before
expensive generation, including briefs under additional approved roots.

The explicit Luna run exercised the separate cross-LOD audit. The follow-up smoke now invokes that raw audit directly for its exact newly generated candidate, with an explicit expected authoring version; unattended smoke runs cannot silently omit it or use an older retained candidate.
The prospective LOD revision cannot use a blanket wood-subset assertion if its
secondary tubes are deliberately simplified; separately validate retained wood
and approximation error.

## Importer failure found during rendering

Blender 5.1.1 builds custom-attribute buffers in encounter order but later indexes
them using an unordered set in its glTF importer. A scalar wind attribute and a
vector leaf-center attribute can be swapped, causing intermittent import failure.
The named review operation now temporarily uses ordered keys for that importer's
attribute collection. It restores the module afterward and does not alter the
installation, input assets or exported attributes. Review manifests record this
workaround and sorted Float32 attribute hashes for independent preservation checks.
Hash-seed import repeats and rendered comparisons are recorded with the candidate.

V5 remains a preserved technical candidate. It must not replace the game trees
until these findings and the remaining asset/runtime acceptance gates are met.
