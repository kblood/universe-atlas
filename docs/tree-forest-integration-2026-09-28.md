# Local detailed-tree forest integration

**Later checkpoint:** [compact family integration](compact-tree-families-2026-09-28.md)
replaces the shared detailed slots described below with compact per-family
batches and supports branching/spire loading together. The original evidence
below remains historical; it does not validate the newer renderer or Pine.

_Development-worktree status, 2026-09-28. The opt-in integration passes focused CPU/loader and one RTX 5090 browser fixture; it is not the published forest default or visual/performance acceptance._

## What the local path does

The forest can asynchronously load a supplied two-LOD tree asset family into
its near and middle instance batches. The browser fixture enabled optional
leaf transmission at 0.35. The path keeps canonical population cells,
habitat decisions, positions, and 10–22 m population-height range as the source
of truth. The family loader checks for forest coverage and conservative bounds;
the previous representation remains available if a load fails or becomes
obsolete.

Tree eligibility comes from the dated species catalogue already passed from
the biosphere. The catalogue binds stable cell identities to species and
derives deterministic per-instance appearance. The detailed path currently
accepts branching recipes; spire and unbound cells continue to use the legacy
forest representation. Each supported cell gets one supplied geometry per
LOD, with separate bark and foliage brightness tints, the family wind phase,
dated wind updates, and foliage coverage carried to the depth/distance
materials. The existing population height scales the supplied model; this
does not yet provide species-specific physical dimensions or multiple
structural variants.

The entry point is the development-only `window.__atlas.loadForestTreeAssets`
hook after visiting a planet. The loader can attach the same local
aerial-perspective inputs used by terrain, using the retained forest frame;
when requested, this is installed before the optional leaf-transmission hook.
Obsolete asynchronous results are discarded after the loader finishes;
texture or decoder work is not aborted. Immersive rendering continues to use
the legacy path. No new family asset is loaded by default in the published
application.

## Limits and current status

This integration covers only detailed near/middle trees. The distant canonical
canopy still uses the legacy faceted shape, so its silhouette can disagree
with the supplied tree family. Mixed batches still submit legacy geometry for
cells drawn by detailed geometry. Shadow behavior, off-camera casters, and the
resulting vertex cost need measurement. There is one structural geometry
choice per LOD; per-species dimensions, a richer palette, bounded structural
variants, and an asset resource cache are not yet connected. This work does
not demonstrate complete-canopy visual continuity, accepted realistic species
assets, XR readiness, or a general performance improvement.

The focused suite records 58 passes and no skips. One RTX 5090 / D3D11 game
fixture loaded the family with 0.35 leaf transmission, moved 316.87 m, crossed
origin versions 13 to 15, and returned to a dated state with all 8 sampled
species IDs, recipe fingerprints, canonical heights, and wind phases matching.
Detailed batch counts changed from [0 near, 206 middle] to [10 near,
159 middle]. The shared aerial hook reported 24 of 24 meshes attached, with no
WebGL error or browser error. This fixture did not reproduce the earlier
concern that legacy aerial perspective was missing. These are fixture checks,
not frame-rate or general performance evidence.

The initial Opus source review examined a pre-fix snapshot and found an
out-of-order slot initialization risk and unguarded malformed-catalogue risk.
Ordered slot seeding and guarded catalogue resolution were added. The genuine
follow-up Opus review found the aerial composition and slot lifecycle correct;
it also corrected its earlier concern about thousands of GPU submissions:
the shared update-range helper caps each attribute at eight ranges. The
follow-up still flags first-use shader compilation, vertex work for hidden
mixed-batch slots, incomplete asset-upload byte diagnostics, and asset-error
containment. Clear/swap restores legacy coverage on the next update, and the
active game loop updates before rendering; frozen or out-of-band renders in
that interval were not checked. Off-camera shadows also remain untested. No
such fault occurred in the fixture. The follow-up did not establish these
remaining cases as accepted.

Screenshot review found the detailed candidate crowns visibly thinner than
the faceted legacy trees, with much larger legacy fallback crowns still in the
same view. The imagery is evidence of integration, not visual acceptance. See
the [focused test log](../test-results/tree-forest-integration/cpu.log),
[RTX 5090 report](../test-results/tree-forest-integration/hardware-family-f-verified/report.json),
[initial frame](../test-results/tree-forest-integration/hardware-family-f-verified/detailed-forest-initial.png),
[date shift](../test-results/tree-forest-integration/hardware-family-f-verified/detailed-forest-date-shift.png),
[date return](../test-results/tree-forest-integration/hardware-family-f-verified/detailed-forest-date-return.png),
[movement frame](../test-results/tree-forest-integration/hardware-family-f-verified/detailed-forest-after-movement.png),
[initial Opus response](../test-results/tree-forest-integration/opus/response.json),
[initial review inputs](../test-results/tree-forest-integration/opus/inputs.json),
[follow-up Opus response](../test-results/tree-forest-integration/opus-followup/response.json),
and [follow-up review inputs](../test-results/tree-forest-integration/opus-followup/inputs.json).

Related records: the [family-F asset adapter](tree-ez-family-2026-09-28.md),
[species and asset contract](tree-species-asset-contract-2026-09-28.md),
[flora recipe cache](flora-recipe-cache-2026-09-28.md), and
[canopy runtime integration](canopy-runtime-integration-2026-09-28.md).
