# Tree authoring v3 smoke — 2026-09-28

**Status: v3 smoke technically validated; visual signoff and Opus review fixes
remain open.** Luna reviewed the corrected sheet. Opus 5.5 completed a
source-only CLI review and reported blockers; it did not execute the authoring
tool or candidate. Authoring v4 code fixes are underway, but there is no v4
candidate yet. The v3 smoke is not packaged, species-bound, or integrated into
the runtime forest.

## What the smoke produced

The first v3 candidate uses revised deterministic skeleton, tree-family and
foliage authoring modules. Its manifest records 12,020 triangles (9,396 wood,
2,624 foliage), 18,145 vertices, two materials, and a 2.29 MB GLB. The exported
bounds are 13.434 × 12.139 × 16.000 m; the stem is 12.652519 m, and the foliage
extends from 5.517 m to the 16 m crown tip. Fixed leaf cards are 1 × 1.2 m, with
leaf lengths in the 0.20–0.32 m range. The root pivot is `(0, 0, 0)`.

The foliage uses sixteen original staggered alpha-mask sprays and a 2048 × 2048
atlas. The glTF has two materials, opaque bark and masked double-sided foliage.
The candidate passes the recorded GLB structure checks, with finite geometry,
UVs, tangents and wind data, and no degenerate indexed triangles or Khronos
validator errors. This is technical validation, not runtime or visual asset
acceptance.

Luna's corrected render sheet shows a less regular branch layout than the
earlier proposal, but the crown still reads sparse, asymmetric and tiered, and
the foliage still looks pale. The original wire panel used a faulty even-offset
review modifier and is retained only as a diagnostic. The corrected bounded
wire sheet is the review image linked below; it does not change the candidate
GLB.

Opus 5.5's source-only review reports blockers in tube-frame continuity, cap
normals, deterministic output and authoring/provenance gates. The authoring v4
fixes underway add parallel-transport tube frames, independent flat caps,
canonical geometry/material hashes, sorted outputs, relative brief paths,
version/provenance checks and a failure manifest. These fixes have not yet
produced a v4 candidate or received fresh validation. The review also identifies
visual risks around sparse foliage, leaf-card proportions and bark texture
mapping. Its concern about the brief's review note refers to historical
candidates; it does not amount to v3 acceptance. See the
[review report](opus-5.5-tree-author-v3-review-2026-09-28.md).

## Still required

- Improve crown density and balance, and calibrate foliage colour against a
  neutral grey reference. The corrected sheet has not been signed off.
- Resolve the Opus source-review blockers, then rerun determinism, provenance,
  geometry and export checks on a fresh candidate.
- Generate and validate a bounded eight-structure species family. Variants for
  one species must share its foliage atlas to avoid multiplying texture memory.
- Produce tree-specific LOD1 and LOD2, collision, runtime wind binding, and
  species/canonical-cell binding.
- Complete target-scene review, package validation, license resolution and
  target-runtime acceptance. The recorded license is still `NOASSERTION`.

The candidate remains under
`Assets/_assetctl/atlas-tree-smoke-1790566084092/`; its source assets and full
authoring manifest are preserved there. Rendering worktree copies of the
[manifest](../test-results/tree-author-v3/authoring-manifest.json) and
[technical validation](../test-results/tree-author-v3/validation.json) provide
stable review records. Luna's [corrected render sheet](../test-results/tree-author-v3/render-sheet-bounded-wire/render-sheet.png),
[hero view](../test-results/tree-author-v3/render-sheet-bounded-wire/hero.png)
and [bounded wire view](../test-results/tree-author-v3/render-sheet-bounded-wire/wire.png)
show the current visual state.

See the [authoring increment proposal and status](tree-authoring-next-increment-2026-09-28.md),
[candidate history](tree-asset-candidate-2026-09-28.md),
[species asset contract](tree-species-asset-contract-2026-09-28.md), and
[desktop realism plan](desktop-realism-implementation-plan-2026-09-27.md).
