# EZ-Tree family adapter: Opus review assessment

The local Claude CLI returned a successful source review under
`modelUsage.claude-opus-5-5`, provider `firstParty`. This was a source review,
not an executed test or visual approval. The original prompt, input hashes and
[raw response](../test-results/opus-tree-reference-family-review/response.json)
are retained. The prompt included candidate D; candidate F supersedes D and E.

## Changes made after review

- Replaced the projected-edge tangent fallback with a triangle UV-gradient
  tangent and independently derived handedness. Counts describe unwelded
  triangle corners, with a hard maximum of zero for LOD0 and one for LOD1.
  This detects cancelled Mikk output, not all poorly conditioned tangents.
- Regenerated candidate F with current adapter hashes. Recorded actual
  glTF-Transform core/functions/extensions versions and the Mikk module hash.
- Loaded the tangent and simplification tools before creating output. Brief
  writes now participate in failure reporting. Success requires a complete
  `family-manifest.json`.
- Verified source ring centroids against skeleton origins, leaf winding and
  source UV order, and leaf base edges against attachment pivots. Asserted
  repeating bark samplers. Documented bark UV compression at tapered tips.
- Recorded the simplifier's achieved ratio and weighted error. Checked vertex
  capacity after welding and exported 16-bit indices.

## Recommendations assessed separately

Luna's independent handedness check prompted a follow-up convention audit.
glTF-Transform negates raw Mikk handedness for glTF, as does Three's default
`computeMikkTSpaceTangents`. Candidate E pre-negated the fallback sign, causing
a double conversion at its single affected corner. Candidate F returns the
raw UV-frame sign and applies the library conversion once. The near mesh is
byte-identical to E; the middle mesh changes that tangent sign. See the
[Three implementation](https://github.com/mrdoob/three.js/blob/r181/examples/jsm/utils/BufferGeometryUtils.js)
and the [Khronos convention discussion](https://github.com/KhronosGroup/glTF-Sample-Models/issues/174).

Failed candidates remain preserved with a failure record, as required by the
repository's asset-production instructions. Deleting partial artifacts would
discard diagnostic evidence; consumers must require the success manifest.

The affected thin triangle has nonzero geometry area and UV determinant.
Removing triangles merely for being thin can open holes. The adapter rejects
singular UVs or an undefined tangent frame and caps the observed cancellation
case instead. Broader tangent conditioning and visual shading remain review
items. No claim is made that a single fallback count measures every shading
problem.

The source leaf base already coincides with its pivot. The 0.048 m offset
registers the drawn sprig stem by shifting the card behind that pivot; it does
not reduce an existing base-to-pivot distance. Tests should verify this
direction and texture orientation, rather than the review's suggested
distance-decrease condition.

Simplifier weights are unchanged pending measured visual evidence. Its error
includes weighted normal and UV attributes and is not a metre-only position
error. Half-texel atlas inset only protects the base mip; distant alpha fringes,
canopy loss and detail transitions still require browser inspection.

See the [family implementation record](tree-ez-family-2026-09-28.md) for
independent tests and the candidate's remaining acceptance work. Neither this
review nor a technically valid GLB constitutes game or realism acceptance.
