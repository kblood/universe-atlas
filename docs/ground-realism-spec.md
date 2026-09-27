# Walking-height realism correction

## Current direction — 2026-09-27

The [desktop realism plan](desktop-realism-implementation-plan-2026-09-27.md) now owns implementation order and desktop-first quality targets. This specification remains supporting design context for terrain, materials and movement; its proposed features are not automatically implemented.

2026-09-13. This iteration responds to the user's Oraeva riverbank screenshot:
black trees, coarse triangular shorelines, a bright ribbon of water, uniform
ground and isolated identical tree groups. The acceptance target is visibly
better ground-level rendering, with the same saved geology and working travel.

## Design and ownership

1. Terrain (Terra): correct walking LOD allocation so nearby visible banks get
   refinement alongside required foot-contact patches. Keep 768 resident tiles,
   512 maximum walking draws and the 256 MiB accounted terrain budget. Diagnose
   blue shoreline triangles separately from stitching: the coarse terrain water
   proxy must not form a second, elevated water surface over the real water.
   Use the regional wet field in tile alpha to suppress that proxy only within
   the guaranteed nearby physical-water coverage. Preserve baseline oceans,
   orbital water, dry-bank geometry and collision. No broad terrain-version change.
2. Water (Terra): replace the cross-channel blue stripe with metre-scale ripple
   normals, view-dependent Fresnel sky reflection, sun highlights and restrained
   shallow/deep absorption. River and lake use the same shading basis. Bake
   authoritative wet/depth values into local geometry as appropriate; avoid a
   new per-frame terrain sampler. Keep locally anchored precision, opaque depth
   handling, complete water coverage and <=64 draws /16 MiB. Fix overlaps where
   a river crosses a lake without changing the deterministic model.
3. Environment (Terra): correct near-zero instanced normal lighting at planetary
   scales, then make plausible tapered trunks, branching crowns, smaller leaf
   sprays and denser ground cover. Lighting receives planet-frame sun/eye with
   sky fill and night falloff; avoid multiplying dark texture and material
   colours. Use deterministic, decorrelated placement with clearings and size
   variation. Version placement changes explicitly. Keep <=12 draws /12 MiB,
   bounded cells and per-frame generation, no downloaded assets. Geometry and
   instance normals must remain stable across rotation and metre/orbit rescaling.
4. Root: integrate the shared sunlight interface, improve ground shading and
   scale cues, reproduce the supplied place when its URL is available, review
   numerical and rendered evidence, document sources, deploy and commit.

## Acceptance

- Side-by-side ground-level river/lake captures; no daytime black tree silhouettes,
  no broad cartoon water stripe, and materially improved shoreline geometry.
- Visible trunks/branches and non-grid distribution; believable grass and stone
  sizes at eye height. Improved material variation without extreme noisy bumps.
- Preserve river model/export hash, saved-location restore, dry-bank contact,
  water refusal and deterministic geometry across viewing order.
- Browser shader compilation, walking/contact tests, resource disposal and
  memory/draw diagnostics must pass. Record actual adapter/frame timings.
- Exact user location plus the existing Maithea river fixture when available.
  Acknowledge any remaining visual limitations from the final captures.

This is a rendering and environment pass. Animals, settlements, inhabitants,
underwater exploration and universal evolution are outside this change.

## Finding during visual validation

Lake-edge artefacts also came from the authoritative bank selector, rather than
only rendering. Correct its interpolation under an explicit `river-surface-2`
query revision while retaining the legacy sampler for constructing existing
`river-region-1` records. Test continuity at both lake and adjacent river edges.
The existing model hash remains stable; corrected runtime bank heights are
reported separately and used by navigation, terrain and collision together.
