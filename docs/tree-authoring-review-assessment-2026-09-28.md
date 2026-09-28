# Tree authoring review follow-up — 2026-09-28

The genuine [Opus 5.5 source review](opus-5.5-tree-author-v3-review-2026-09-28.md)
examined authoring v3. Its [metadata](opus-5.5-tree-author-v3-review-2026-09-28.metadata.json)
records the supplied source hashes and returned model identity. The reviewer
did not execute Blender or inspect rendered images. Luna and the parent agent
separately reviewed the retained v3 exports and render sheet.

## Accepted findings and v4 changes

- Tube ring frames now use parallel transport after the first ring, avoiding
  reference-axis switches between consecutive rings.
- Caps have independent vertices and flat normals. Smooth tube sides retain
  their own normals. Caps are retained for this proposal; reducing their cost
  remains an LOD decision.
- Recipe geometry and exported material/texture content have separate hashes.
  Output PNG ordering is sorted. The brief path is relative to the workspace;
  Blender and Python versions are recorded. Blender 5.1 is the supported
  exporter family. A repeated fresh run checks geometry/material hashes and
  exported GLB/PNG bytes; editable `.blend` files remain individual run artifacts.
- Authoring requires matching generator version/provider and original
  provenance without parent assets. A failed generation writes a failure
  manifest only into the directory that invocation created. Earlier candidates
  and source inputs are preserved.
- Leaf outlines are evaluated in physical card coordinates, correcting the
  1:1.2 atlas aspect distortion. Leaf lengths remain in the 0.20–0.32 m range.
- Height fitting uses 14 iterations instead of 22, retaining the final 0.02 m
  acceptance gate. Dead leaf-texture code was removed.
- Candidate limitations explicitly include missing variants, compression,
  licensing, calibrated materials and runtime acceptance.

These fixes change appearance, so the authoring version is now
`atlas-branching-author-4`. The v3 candidate and review remain historical
evidence. Fresh v4 smoke, repeat-generation, physical GLB checks and source/export
render comparison pass; see the [v4 record](tree-authoring-v4-2026-09-28.md)
and [independent content audit](../test-results/tree-author-v4/repeat-audit.json).
Visual acceptance and runtime integration remain open.

## Qualifications and remaining work

The brief's note about earlier authoring and review is historically true; it
does not claim that the new candidate is accepted. Absolute artifact paths and
`.blend` hashes identify preserved runs; they are not the deterministic recipe
identity. The new content hashes serve that separate purpose.

Positive random angular gaps guarantee ordering, not a fixed six-degree
minimum; their normalized size depends on the complete set. No minimum-angle
guarantee is used by the generator.

The sparse, tiered crown and pale foliage were observed in v3 by both reviewers.
Bark texel density, low bark texture resolution and relief/albedo frequency,
foliage transmission, neutral-grey lighting calibration, crown normals,
coverage-preserving mipmaps, slope contact and hierarchical wind remain open.
LOD generation must reuse the accepted full-detail skeleton scale rather than
fit each LOD independently. A species family must share atlas resources across
its structural variants. No authoring candidate has replaced the runtime trees.
