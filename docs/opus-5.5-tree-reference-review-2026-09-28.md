# Opus 5.5 review: existing tree generator comparison

Date: 2026-09-28. The local Claude CLI returned model `claude-opus-5-5`
from provider `firstParty`. This was a source-only review of the fixed
assetctl operation, pinned EZ-Tree source, initial tests and browser fixture.
It did not execute the code or accept the visuals. The exact inputs and raw
response are linked in the [metadata](opus-5.5-tree-reference-review-2026-09-28.metadata.json).

## Findings applied

- Restore source normals into the existing GPU attribute. Replacing the
  attribute on each toggle could leave the old WebGL buffer orphaned.
- Block overlapping measurements, loads and fixture mutations during timing;
  suspend camera controls; always end a started GPU query if rendering throws.
  Include canvas dimensions and pixel ratio in measurements.
- Assert the two imported material roles and cross-check triangle metadata
  against the actual loaded index arrays.
- Reverse V inside the reference foliage tile: EZ-Tree's attachment edge has
  v=0, while the unflipped glTF image stores each sprig stem at the bottom of
  its tile. The initial mapping put the sprig tip at the branch attachment.
- Explicitly label exported skeleton coordinates `source-unscaled`; the
  manifest's `skeletonScale` converts origins and radii into the metre-space
  geometry. The source skeleton is retained for reproducibility.
- Add both upstream LOD files to the brief's declared deliverables. The
  required `comparison.png` is produced by the browser review step, not the
  geometry-only command.
- Extend CPU checks to generate the Ash preset, inspect per-primitive Uint16
  capacity, reject prototype property names, and check all card areas and
  local vertex offsets at 10/16/22 m.

The review confirmed that the upstream leaf ordering matches the adapter's
pivot mapping, and that scaling attachment positions while retaining local
offsets preserves card dimensions. It also confirmed the crossed-card normal
defect recorded by the audit. Upstream files remain unmodified; the browser
offers a separate geometric-normal control.

## Findings that require qualification

The review suspected different lighting and culling paths between Atlas and
the reference. Inspection of `tree-asset.ts` shows the Atlas hook changes only
vertex position, normal and tangent for physical scale/wind. At the primary
16 m comparison, date zero and phase zero make that deformation the identity.
Both modes use the same PBR fragment path, fixed detail and disabled frustum
culling. They submit different triangle counts because the generators make
different trees; equal triangle counts are not required to compare the cost
of those outputs. Submitted counts must accompany timing results.

Materials are not identical in every respect: Atlas uses its full foliage
atlas and imported tangents, while EZ-Tree uses one tile, square cards and
derivative tangents. Bark UV layouts also differ. The fixture discloses these
differences; it cannot isolate every material contribution to perceived shape.

`generationMs` measures the entire cold adapter call: skeleton generation,
four mesh passes, copying, physical scaling and audits. It is not isolated
generator speed and is not a speed comparison with Blender.

## Remaining evidence and decisions

The 16 m oak is the primary visual control. Passing fixed-card-size tests at
10/22 m does not prove equal canopy coverage: larger skeletons with the same
card count become more sparse. Different seeds, species, close views, atlas
tile bleeding, silhouette and foliage coverage need review before
production adoption. The oak fits the 18,000-triangle near budget; the tested
ash has 20,000 triangles and exceeds it. Neither currently meets the planned
5,000/900 lower tiers while preserving the full foliage.

This review supports continuing a measured reuse experiment. It does not
approve a packaged asset, game integration, final realism or whole-game
performance. See the [benchmark record](tree-ez-reference-2026-09-28.md) for
the independent browser evidence and its limits.
