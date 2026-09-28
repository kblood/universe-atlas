# Near/far tree family review

Two read-only reviews by Claude Opus 5.5 first-party support a small extension
of Atlas's existing analytic far-tree renderer. They do not approve the tree
families or the far crowns visually.

## Decision evidence

The initial review traced the dated tree catalogue through detailed rendering
and the far census proxy. Near trees resolve family and appearance from the
already dated catalogue; the current detailed path still ignores most recipe
structure and species color fields. The far analytic proxy uses a fixed legacy
lobe profile and roll tint. Its free `parameters.z` channel can hold bounded
family presentation data without adding another per-instance buffer.

The follow-up inspected the same-pose/date 390 m default-vs-offline-mip pair.
Offline mips restore foliage on some, but not all, LOD1 middle trees. They do
not alter the far ring, whose legacy crowns remain visibly brighter and bulkier
than the dark, open family crowns. This identifies two different needs:
improve foliage coverage for the family, and bring the far analytic appearance
into line with that family. The pair has matching pose/date and population
counts, but not identical sample IDs, so it does not prove per-tree handoff
continuity.

## Minimal implementation direction

- Resolve far presentation through the same `ForestTreeCatalogue` instance
  used for near trees. Do not add a second date check, species binding, or
  catalogue. Reuse family and appearance values for each canonical ID.
- Derive small family data once when loading a GLB: separate visible crown
  profile statistics, foliage and bark color summaries, and a genuinely
  conservative bound. Use LOD1 foliage data for the middle-distance profile,
  or prove the two LOD envelopes agree.
- Add a bounded presentation code/tint to the existing analytic proxy's unused
  instance parameter, retaining its single draw and static instance data.
  Retag installed slots in bounded slices when the dated catalogue or family
  library changes. Suppress handoff while the installed far patch has an old
  presentation version. Do not parse GLBs per frame or create per-tree
  geometry.
- Keep legacy presentation for unsupported bindings/assets. A new far family
  presentation should only be enabled when its near partner is actually using
  the loaded family and foliage sidecar.
- Treat a high-percentile crown radius as a *shape statistic*, not a guaranteed
  conservative bound. It omits outliers by definition. Keep a separate bound
  derived from maximum transformed geometry, card extent, and maximum wind
  displacement; size drawn lobes/cones against LOD1 projected coverage so a
  wide culling envelope does not become a bulky drawn crown.
- Keep the pure profile API small and explicit: return separate visual profiles
  for LOD0 and LOD1, plus one union culling bound across every loaded LOD. Do
  not calculate one percentile by concatenating both levels because LOD1
  repeats vertices retained from LOD0 and would bias the profile. Use a
  `TreeCanopyMetadata`/`TreeCanopyProfile` value for geometry statistics and a
  separate albedo summary for bark and foliage; keep color samples in linear
  RGB and keep foliage coverage/cutoff as distinct fields. The existing helper
  names `deriveTreeCanopyMetadata` and `alphaWeightedLinearRgbMean` express
  those roles clearly.
- Preserve the existing `canHandoff` ground-height pairing: its stored height
  is terrain/root height, not tree height. For the new presentation, additionally
  compare the shared resolver's family/version (and canonical tree-height
  identity if presentation consumes it); do not describe the existing ground
  check alone as a current root-pair defect.

Pine is the difficult case: the source report records about 4.6% base foliage
coverage versus Oak's 19.0%. A solid cone or dense lobe set is likely to look
too full. The proxy remains an approximation of silhouette, color, and
porosity, even after the extension.

## Evidence limits

The paired report records RTX 5090 texture-storage/readback, sidecar setup,
date/pose, and GL status. It reports equal submitted counts but different
sample IDs and does not pin every renderer source hash. The original acceptance
images also predate the worklist changes in the reviewed source snapshot.
Neither report establishes matching near/far trees, realistic Oak/Pine proxy
silhouettes, all-biome appearance, or whole-game performance.

## Preserved reviews

- [Initial review](../test-results/opus-near-far-family-review/review.md),
  [prompt and input hashes](../test-results/opus-near-far-family-review/inputs.json),
  and [raw model response](../test-results/opus-near-far-family-review/response.json).
- [Paired 390 m follow-up](../test-results/opus-near-far-family-review/paired-390m-followup/review.md),
  [follow-up input hashes](../test-results/opus-near-far-family-review/paired-390m-followup/inputs.json),
  and [raw model response](../test-results/opus-near-far-family-review/paired-390m-followup/response.json).

Both runs use `claude-opus-5-5` with provider `firstParty`. Their records preserve
the exact prompts, source or evidence hashes, screenshots, reports, and CLI
runner arguments. No runtime source was modified for this review.
